import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {admitPreGatePurgeBrowserFixture} from './harness/pre-gate-purge-browser-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
import {openArchiveWindow} from './harness/archive-navigator.mjs';

const rpc=async(page,type,fields={})=>{
 if(type==='PAIA_RECOVERY_DRAFT_LOAD'&&fields.draft.epoch===undefined)fields={...fields,draft:{...fields.draft,epoch:(await rpc(page,'GET_PAGE',{page:{view:'settings'}})).recoveryEpoch}};
 const reply=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});
 assert.equal(reply?.ok,true,JSON.stringify(reply));
 return reply.data;
};
const op=()=>crypto.randomUUID();

async function fixture({launchThroughPort=false,messages=[{id:'cpv1-save-message',text:'CPV1 original source text'}]}={}){
 const h=await FakeChatGPT.start({launchThroughPort,extensionPath}),page=h.archive;
 await page.locator('#consent-check').check();
 await page.locator('#enable-consent').click();
 await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true,'consumer recovery consent');
 await h.open({id:'cpv1-save-recovery',title:'CPV1 save recovery',base:1609459200,messages});
 await eventually(async()=>(await h.state()).records.length===messages.length,'consumer recovery source captured',30000);
 await page.bringToFront();
 await openArchiveWindow(page,{text:'CPV1 save recovery',label:'CPV1 recovery document opens'});
 const field=page.locator('.library-prose').first();
 await field.waitFor();
 const inputId=await field.getAttribute('data-edit-id');
 const before=await rpc(page,'GET_INPUT',{id:inputId});
 return {h,page,field,inputId,before};
}

async function reopenArchive(h,{beforeOpen=async()=>{}}={}){
 const page=await h.context.newPage();
 page.on('pageerror',error=>h.errors.push(error.message));
 await page.goto(`chrome-extension://${h.extensionId}/ui/archive.html`);
 h.archive=page;
 await page.locator('#collection-panel').waitFor();
 await beforeOpen(page);
 await openArchiveWindow(page,{text:'CPV1 save recovery',label:'CPV1 recovery document reopens'});
 return page;
}


async function observeRealRecovery(page){
 await page.evaluate(async()=>{
  const {DocumentEditor}=await import(chrome.runtime.getURL('ui/library.js')),apply=DocumentEditor.prototype.applyRecovery,send=chrome.runtime.sendMessage.bind(chrome.runtime);
  globalThis.__recoveryOwners=[];globalThis.__recoveryWrites=[];globalThis.__originalRecoveryCompare=document.getElementById('reload-document');
  DocumentEditor.prototype.applyRecovery=function(edit){globalThis.__recoveryOwners.push(this);return apply.call(this,edit);};
  chrome.runtime.sendMessage=message=>{if(message.type==='EDIT_DOCUMENT')globalThis.__recoveryWrites.push(structuredClone(message.edit));return send(message);};
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{globalThis.__recoveryCopied=text;}}});
 });
}
const sourceRoot=fileURLToPath(new URL('..',import.meta.url)),extensionPath=resolve(process.env.PAIA_RECOVERY_EXTENSION_PATH||sourceRoot);
const recoveryVariant=extensionPath===resolve(sourceRoot)?'source':'release';
async function recoveryRecord(h,name,checks){
 assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.deepEqual(h.errors,[]);
 const directory=process.env.PAIA_RECOVERY_EVIDENCE_DIR;if(!directory)return;
 const headSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();if(process.env.PAIA_TESTED_HEAD)assert.equal(headSha,process.env.PAIA_TESTED_HEAD);
 assert.equal(extensionPath,resolve(sourceRoot,recoveryVariant==='source'?'.':'work/current-release'),'the declared variant loads the actual source/current release');
 await mkdir(directory,{recursive:true});await writeFile(join(directory,name+'.json'),JSON.stringify({status:'PASS',headSha,variant:recoveryVariant,extensionPath:relative(resolve(sourceRoot,'..'),extensionPath),evidence:'SYNTHETIC_HOSTED_CHROME',noExternalRequests:true,checks},null,2));
}
const frame=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
async function recoveryCapture(page,name){
 const directory=process.env.PAIA_RECOVERY_EVIDENCE_DIR;if(!directory)return null;await mkdir(directory,{recursive:true});
 const png=await page.screenshot({path:join(directory,name+'.png'),fullPage:true,animations:'disabled'});
 return {file:name+'.png',width:png.readUInt32BE(16),height:png.readUInt32BE(20),sha256:createHash('sha256').update(png).digest('hex')};
}
async function recoveryControls(page){
 const observations=[];for(const selector of ['#input-recovery-copy','#reload-document']){
  const control=page.locator(selector);await control.focus();await control.scrollIntoViewIfNeeded();
  const hit=await control.evaluate(node=>{const r=node.getBoundingClientRect(),at=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {id:node.id,x:r.x+r.width/2,y:r.y+r.height/2,width:r.width,height:r.height,hit:at===node||node.contains(at),focus:document.activeElement===node};});
  assert.ok(hit.width>=44&&hit.height>=44&&hit.hit&&hit.focus,'recovery action remains >=44px, focusable and uncovered');observations.push(hit);
 }return observations;
}
async function captureRecovery(h,page){
 const rows=[];
 for(const [width,height,appearance]of [[1440,1000,'light'],[1440,1000,'dark'],[320,800,'dark']]){
  await page.setViewportSize({width,height});await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance}});
  await eventually(()=>page.evaluate(appearance=>document.documentElement.dataset.paiaTheme===appearance,appearance));
  await page.evaluate(()=>document.fonts.ready);await frame(page);await page.evaluate(()=>scrollTo(0,0));
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=0,'recovery has no horizontal overflow');
  rows.push({kind:'ordinary',width,height,appearance,overflow,capture:await recoveryCapture(page,`S02-${width}-${appearance}`)});
 }
 await page.setViewportSize({width:320,height:800});await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:'light'}});await eventually(()=>page.evaluate(()=>document.documentElement.dataset.paiaTheme==='light'));
 const textBefore=await page.locator('#input-recovery-fields').textContent();
 await page.evaluate(()=>{globalThis.__recoveryText200=[...document.querySelectorAll('#input-recovery-presentation h1,#input-recovery-presentation h2,#input-recovery-presentation h3,#input-recovery-presentation p,#input-recovery-presentation pre,#input-recovery-presentation button')].filter(node=>node.getClientRects().length).map(node=>({node,prior:node.style.getPropertyValue('font-size'),priority:node.style.getPropertyPriority('font-size'),fontSize:parseFloat(getComputedStyle(node).fontSize),lineHeight:parseFloat(getComputedStyle(node).lineHeight)}));for(const row of __recoveryText200)row.node.style.setProperty('font-size',row.fontSize*2+'px','important');});
 try{
  await frame(page);const actual=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,text:__recoveryText200.map(({node,fontSize,lineHeight})=>{const s=getComputedStyle(node),r=node.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(node);return {tag:node.tagName,fontScale:parseFloat(s.fontSize)/fontSize,lineScale:parseFloat(s.lineHeight)/lineHeight,unclipped:node.scrollHeight<=node.clientHeight+1&&node.scrollWidth<=node.clientWidth+1,glyphsContained:[...range.getClientRects()].every(g=>g.left>=r.left-2&&g.right<=r.right+2&&g.top>=r.top-2&&g.bottom<=r.bottom+2)};}),sections:[...document.querySelector('.input-recovery-column').children].map(node=>{const r=node.getBoundingClientRect();return {top:r.top,bottom:r.bottom};})}));
  assert.ok(actual.overflow<=0);assert.ok(actual.text.length>=8);for(const row of actual.text){assert.ok(Math.abs(row.fontScale-2)<0.01);assert.ok(Math.abs(row.lineScale-2)<0.01,'unitless leading must grow with 200% text');assert.ok(row.unclipped&&row.glyphsContained,'enlarged text is not clipped');}for(let i=1;i<actual.sections.length;i++)assert.ok(actual.sections[i].top>=actual.sections[i-1].bottom-1,'recovery sections do not overlap');
  const controls=await recoveryControls(page);await page.evaluate(()=>scrollTo(0,0));rows.push({kind:'text200',width:320,height:800,appearance:'light',...actual,controls,capture:await recoveryCapture(page,'S02-320-light-text200')});assert.equal(await page.locator('#input-recovery-fields').textContent(),textBefore);
 }finally{await page.evaluate(()=>{for(const {node,prior,priority}of __recoveryText200)node.style.setProperty('font-size',prior,priority);delete globalThis.__recoveryText200;});}
 await page.setViewportSize({width:1440,height:1000});const cdp=await h.context.newCDPSession(page);
 try{
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await frame(page);const coarse=await page.evaluate(()=>matchMedia('(pointer:coarse)').matches);assert.equal(coarse,true);
  const controls=await recoveryControls(page),capture=await recoveryCapture(page,'S02-1440-light-coarse'),point=controls.at(-1);
  await page.evaluate(()=>{globalThis.__recoveryTouch=[];document.getElementById('reload-document').addEventListener('pointerdown',event=>__recoveryTouch.push({pointerType:event.pointerType,trusted:event.isTrusted}),{once:true});});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.locator('dialog.reader-confirm').waitFor({state:'visible'});await page.keyboard.press('Escape');await page.locator('dialog.reader-confirm').waitFor({state:'detached'});
  const events=await page.evaluate(()=>__recoveryTouch);assert.deepEqual(events,[{pointerType:'touch',trusted:true}]);assert.equal(await page.evaluate(()=>document.activeElement===globalThis.__originalRecoveryCompare),true);assert.equal(await page.evaluate(()=>matchMedia('(pointer:coarse)').matches),true);rows.push({kind:'coarse',width:1440,height:1000,appearance:'light',coarse,controls,events,capture});
 }finally{await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();}
 await page.evaluate(()=>scrollTo(0,0));return rows;
}

test('CPV1-01.1 interrupted Input save survives page close and worker restart, then replays exactly once',{timeout:90000},async()=>{
 const {h,page,field,inputId,before}=await fixture();
 try{
  await page.evaluate(()=>{
   const send=chrome.runtime.sendMessage.bind(chrome.runtime);
   globalThis.__cpv1Send=send;globalThis.__cpv1EditCalls=0;
   chrome.runtime.sendMessage=message=>{
    if(message?.type==='EDIT_DOCUMENT'){
     globalThis.__cpv1EditCalls++;
     return Promise.resolve({ok:false,error:'MESSAGE_CHANNEL_INTERRUPTED'});
    }
    return send(message);
   };
  });
  await field.fill('CPV1 protected interrupted edit');
  await page.locator('#document-title').click();
  await eventually(()=>page.locator('#retry').isVisible(),'failed save is visible');
  assert.equal(await page.evaluate(()=>globalThis.__cpv1EditCalls),1);

  const draft=await rpc(page,'PAIA_RECOVERY_DRAFT_LOAD',{draft:{kind:'document',ownerId:before.documentId}});
  assert.equal(draft.operation.edit.blocks[0].libraryText,'CPV1 protected interrupted edit');
  assert.equal((await rpc(page,'GET_INPUT',{id:inputId})).libraryText,before.libraryText);

  await page.evaluate(()=>{chrome.runtime.sendMessage=globalThis.__cpv1Send;});
  await h.restartWorker();
  await page.close({runBeforeUnload:false});

  const reopened=await reopenArchive(h);
  await eventually(async()=>(await rpc(reopened,'GET_INPUT',{id:inputId})).libraryText==='CPV1 protected interrupted edit','recovery draft commits after reopen',15000);
  const after=await rpc(reopened,'GET_INPUT',{id:inputId});
  assert.equal(after.revision,before.revision+1,'recovery uses the original idempotent edit exactly once');
  assert.equal(await rpc(reopened,'PAIA_RECOVERY_DRAFT_LOAD',{draft:{kind:'document',ownerId:before.documentId}}),null);
  await reopened.getByText('已恢复上次未完成的修改。',{exact:true}).waitFor({timeout:5000});
  assert.equal(await reopened.locator('#input-recovery-presentation').isVisible(),false,'successful replay does not enter S02');
  assert.deepEqual(h.errors,[]);
  await recoveryRecord(h,'automatic-replay',{revisionDelta:after.revision-before.revision,draftCleared:true,surfaceVisible:await reopened.locator('#input-recovery-presentation').isVisible()});
 }finally{await h.close();}
});

test('CPV1-01.1 stale recovery draft restores visibly but never overwrites a newer committed Input',{timeout:60000},async()=>{
 const {h,page,field,inputId,before}=await fixture();
 try{
  const draftEdit={operationId:op(),documentId:before.documentId,blocks:[{id:inputId,expectedRevision:before.revision,libraryText:'CPV1 stale local recovery',note:before.note,excluded:before.excluded}]};
  await rpc(page,'PAIA_RECOVERY_DRAFT_SAVE',{draft:{epoch:before.recoveryEpoch,kind:'document',ownerId:before.documentId,token:draftEdit.operationId,operation:{type:'EDIT_DOCUMENT',edit:draftEdit},sourceRecordIds:before.sourceRecordId?[before.sourceRecordId]:[]}});
  await rpc(page,'EDIT_DOCUMENT',{edit:{operationId:op(),documentId:before.documentId,blocks:[{id:inputId,expectedRevision:before.revision,libraryText:'CPV1 newer committed text',note:before.note,excluded:before.excluded}]}});
  await page.close({runBeforeUnload:false});

  const reopened=await reopenArchive(h,{beforeOpen:observeRealRecovery});
  await eventually(async()=>await reopened.locator('.library-prose').first().textContent()==='CPV1 stale local recovery','stale recovery is shown instead of silently lost');
  assert.equal((await rpc(reopened,'GET_INPUT',{id:inputId})).libraryText,'CPV1 newer committed text','newer canonical text is never overwritten');
  assert.equal(await reopened.locator('#reload-document').isVisible(),true,'conflict recovery action is visible');
  assert.match(await reopened.locator('#save-status').textContent(),/草稿已恢复到页面|尚未保存/);
  const surface=reopened.locator('#input-recovery-presentation');await surface.waitFor({state:'visible'});await reopened.setViewportSize({width:1440,height:1000});const layouts=await captureRecovery(h,reopened);
  assert.equal(await reopened.locator('#input-recovery-title').textContent(),'恢复未完成的修改');assert.equal(await reopened.locator('#input-recovery-fields').textContent(),'正文CPV1 stale local recovery');
  assert.equal(await reopened.locator('#primary-nav [data-view="library"]').getAttribute('aria-current'),'page');assert.equal(await reopened.locator('.sidebar-bottom [data-view="settings"]').getAttribute('aria-current'),'false');
  await reopened.locator('#input-recovery-copy').click();assert.equal(await reopened.evaluate(()=>globalThis.__recoveryCopied),'CPV1 stale local recovery');
  await reopened.locator('.sidebar-bottom [data-view="settings"]').click();assert.equal(await surface.isVisible(),true,'the original conflict leave guard blocks navigation');await reopened.goBack();assert.equal(await surface.isVisible(),true);await reopened.goForward();assert.equal(await surface.isVisible(),true);
  for(const cancel of ['button','escape']){await reopened.locator('#reload-document').click();const dialog=reopened.locator('dialog.reader-confirm');await dialog.waitFor({state:'visible'});assert.match(await dialog.textContent(),/CPV1 stale local recovery/);assert.match(await dialog.textContent(),/CPV1 newer committed text/);if(cancel==='button')await dialog.getByRole('button',{name:'取消',exact:true}).click();else await reopened.keyboard.press('Escape');await dialog.waitFor({state:'detached'});assert.equal(await surface.isVisible(),true);assert.equal(await reopened.evaluate(()=>document.activeElement===globalThis.__originalRecoveryCompare),true,'Cancel/Escape restore focus to the same Compare button');}
  const beforeConfirmationWrites=await reopened.evaluate(()=>globalThis.__recoveryWrites.length);assert.equal(beforeConfirmationWrites,1,'only the original pre-presentation stale attempt ran');assert.equal((await rpc(reopened,'GET_INPUT',{id:inputId})).libraryText,'CPV1 newer committed text');
  assert.equal(await reopened.evaluate(()=>globalThis.__recoveryOwners.length===1&&globalThis.__recoveryOwners[0].root===document.getElementById('document-page')&&globalThis.__originalRecoveryCompare===document.getElementById('reload-document')),true);
  await reopened.locator('#reload-document').click();await reopened.locator('dialog.reader-confirm .primary').click();await surface.waitFor({state:'hidden'});assert.equal((await rpc(reopened,'GET_INPUT',{id:inputId})).libraryText,'CPV1 newer committed text','comparison itself does not save');
  await reopened.locator('#retry').click();await eventually(async()=>(await rpc(reopened,'GET_INPUT',{id:inputId})).libraryText==='CPV1 stale local recovery');await eventually(async()=>await rpc(reopened,'PAIA_RECOVERY_DRAFT_LOAD',{draft:{kind:'document',ownerId:before.documentId}})===null);
  const afterExplicitRetryWrites=await reopened.evaluate(()=>globalThis.__recoveryWrites.length);assert.equal(afterExplicitRetryWrites,2);const live=reopened.locator('.library-prose').first();assert.equal(await live.isVisible(),true);
  await live.dispatchEvent('compositionstart');await live.evaluate(el=>{el.textContent='SYNTHETIC ordinary later local edit';});const base=await rpc(reopened,'GET_INPUT',{id:inputId});await rpc(reopened,'EDIT_DOCUMENT',{edit:{operationId:op(),documentId:before.documentId,blocks:[{id:inputId,expectedRevision:base.revision,libraryText:'SYNTHETIC ordinary later canonical edit',note:base.note,excluded:base.excluded}]}});await live.dispatchEvent('compositionend');await reopened.locator('#reload-document').waitFor({state:'visible'});
  assert.equal(await surface.isVisible(),false,'ordinary later conflicts do not reuse an old recovery marker');assert.equal(await live.textContent(),'SYNTHETIC ordinary later local edit');assert.equal((await rpc(reopened,'GET_INPUT',{id:inputId})).libraryText,'SYNTHETIC ordinary later canonical edit');assert.equal(h.extensionNetworkRequests,0);assert.deepEqual(h.errors,[]);
  await recoveryRecord(h,'stale-recovery',{beforeConfirmationWrites,afterExplicitRetryWrites,copyMatches:true,sameEditorAndCompare:true,cancelEscapeFocus:true,leaveBackForwardProtected:true,comparisonDoesNotSave:true,ordinaryConflictSurfaceVisible:await surface.isVisible(),layouts});
 }finally{await h.close();}
});


test('VS-04 failed Archive removal remains visible until retry durably saves it',{timeout:60000},async()=>{
 const {h,page,field,inputId,before}=await fixture({launchThroughPort:true});
 try{
  const sources=(await h.state()).records;
  // Fail the actual canonical transaction, rather than fabricate a terminal
  // worker response for a message the worker never received (that is unknown).
  const worker=h.context.serviceWorkers().find(w=>w.url().endsWith('/background/service-worker.js'));
  assert.ok(worker);
  await worker.evaluate(()=>{
   const put=IDBObjectStore.prototype.put;
   globalThis.__restoreRemovalPut=()=>{IDBObjectStore.prototype.put=put;};
   IDBObjectStore.prototype.put=function(value,...args){
    if(this.name==='operationReceipts'&&value.namespace==='working-input')throw new DOMException('Synthetic canonical transaction failure','UnknownError');
    return put.call(this,value,...args);
   };
  });
  await field.evaluate(el=>el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:20,clientY:20})));
  await page.getByRole('menuitem',{name:/从档案移除|Remove from archive/}).click();
  await eventually(()=>page.locator('#retry').isVisible(),'failed removal offers a retry');
  assert.equal((await rpc(page,'GET_INPUT',{id:inputId})).excluded,before.excluded);
  assert.equal(await field.isVisible(),true,'a failed removal cannot visually hide the Input');
  assert.deepEqual((await h.state()).records,sources,'failure cannot change immutable Source');

  await worker.evaluate(()=>globalThis.__restoreRemovalPut());
  await page.locator('#retry').click();
  await eventually(async()=>(await rpc(page,'GET_INPUT',{id:inputId})).excluded===true,'retry persists removal');
  await eventually(async()=>!await field.isVisible(),'saved removal hides the Input');
  assert.deepEqual((await h.state()).records,sources);
  assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});


test('S02 Input recovery copies all actual bodies, title and notes and retains their original comparison review',{timeout:60000},async()=>{
 const messages=[{id:'recovery-first',text:'SYNTHETIC first Source'},{id:'recovery-second',text:'SYNTHETIC second Source'},{id:'recovery-unaffected',text:'SYNTHETIC unaffected Source'}],{h,page,before}=await fixture({messages});
 try{
  const state=await h.state(),blocks=state.library.blocks.filter(row=>row.documentId===before.documentId),doc=state.conversations.find(row=>row.id===before.documentId),bySource=text=>blocks.find(row=>state.records.find(source=>source.id===row.originalTextReference)?.originalText===text),first=bySource(messages[0].text),second=bySource(messages[1].text);
  const bodies=['SYNTHETIC recovered first\n\n末行完整','SYNTHETIC recovered second '+('完整长文。'.repeat(200))],draftEdit={operationId:op(),documentId:before.documentId,title:'SYNTHETIC recovered title',expectedTitleRevision:doc.titleRevision,blocks:[first,second].map((row,index)=>({id:row.id,expectedRevision:row.revision,libraryText:bodies[index],note:index===0?'SYNTHETIC recovered note':'',excluded:false}))};
  await rpc(page,'PAIA_RECOVERY_DRAFT_SAVE',{draft:{epoch:before.recoveryEpoch,kind:'document',ownerId:before.documentId,token:draftEdit.operationId,operation:{type:'EDIT_DOCUMENT',edit:draftEdit},sourceRecordIds:[first.sourceRecordId,second.sourceRecordId]}});
  await rpc(page,'EDIT_DOCUMENT',{edit:{operationId:op(),documentId:before.documentId,title:'CPV1 save recovery newer title',expectedTitleRevision:doc.titleRevision,blocks:[first,second].map(row=>({id:row.id,expectedRevision:row.revision,libraryText:'SYNTHETIC committed '+row.id,note:'SYNTHETIC committed note',excluded:false}))}});await page.close({runBeforeUnload:false});
  const reopened=await reopenArchive(h,{beforeOpen:observeRealRecovery});await reopened.locator('#input-recovery-presentation').waitFor({state:'visible'});const visible=await reopened.locator('#input-recovery-fields').textContent();for(const text of [...bodies,'SYNTHETIC recovered title','SYNTHETIC recovered note'])assert.ok(visible.includes(text));assert.equal(visible.includes(messages[2].text),false);
  await reopened.locator('#input-recovery-copy').click();const copied=await reopened.evaluate(()=>globalThis.__recoveryCopied);for(const text of [...bodies,'SYNTHETIC recovered title','SYNTHETIC recovered note'])assert.ok(copied.includes(text));assert.equal(copied.includes(messages[2].text),false);assert.match(copied,/标题|备注/);
  await reopened.locator('#reload-document').click();const dialog=reopened.locator('dialog.reader-confirm');await dialog.waitFor({state:'visible'});const comparison=await dialog.textContent();for(const text of [...bodies,'SYNTHETIC recovered note','SYNTHETIC committed note','CPV1 save recovery newer title'])assert.ok(comparison.includes(text));await dialog.getByRole('button',{name:'取消',exact:true}).click();assert.equal(await reopened.evaluate(()=>globalThis.__recoveryWrites.length),1);assert.equal((await rpc(reopened,'GET_INPUT',{id:first.id})).libraryText,'SYNTHETIC committed '+first.id);assert.equal(h.extensionNetworkRequests,0);assert.deepEqual(h.errors,[]);
  await recoveryRecord(h,'multi-field-copy',{bodies:bodies.length,title:true,note:true,unaffectedOmitted:true,fullCopy:true,fullComparison:true,writeCount:await reopened.evaluate(()=>globalThis.__recoveryWrites.length)});
 }finally{await h.close();}
});

test('S02 current B-02 refusal and historical purge clear projection, open comparison and late clipboard fallback',{timeout:60000},async()=>{
 const {h,page,before,inputId}=await fixture();
 try{
  await rpc(page,'SET_ENABLED',{enabled:false});const edit={operationId:op(),documentId:before.documentId,blocks:[{id:inputId,expectedRevision:before.revision,libraryText:'SYNTHETIC protected recovery before purge',note:before.note,excluded:before.excluded}]};
  await rpc(page,'PAIA_RECOVERY_DRAFT_SAVE',{draft:{epoch:before.recoveryEpoch,kind:'document',ownerId:before.documentId,token:edit.operationId,operation:{type:'EDIT_DOCUMENT',edit},sourceRecordIds:[before.sourceRecordId]}});await rpc(page,'EDIT_DOCUMENT',{edit:{operationId:op(),documentId:before.documentId,blocks:[{id:inputId,expectedRevision:before.revision,libraryText:before.libraryText,note:'SYNTHETIC newer committed note',excluded:before.excluded}]}});await page.close({runBeforeUnload:false});
  const reopened=await reopenArchive(h,{beforeOpen:observeRealRecovery});await reopened.locator('#input-recovery-presentation').waitFor({state:'visible'});await reopened.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>new Promise((_resolve,reject)=>globalThis.__denyRecoveryCopy=reject)}}));await reopened.locator('#input-recovery-copy').click();await eventually(()=>reopened.evaluate(()=>typeof globalThis.__denyRecoveryCopy==='function'));
  await reopened.locator('#reload-document').click();await reopened.locator('dialog.reader-confirm').waitFor({state:'visible'});const evidence=await admitPreGatePurgeBrowserFixture(reopened,before.sourceRecordId);assert.equal(evidence.evidenceClass,'CURRENT_B02_REFUSAL_PLUS_HISTORICAL_COMPATIBILITY');await eventually(async()=>(await reopened.locator('#input-recovery-fields').textContent())==='');await eventually(async()=>await reopened.locator('dialog.reader-confirm').count()===0);
  await reopened.evaluate(()=>globalThis.__denyRecoveryCopy(Error('SYNTHETIC delayed clipboard denial')));await reopened.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.equal(await reopened.locator('.reading-copy-dialog').count(),0);assert.equal((await h.state()).records.length,0);assert.equal(await reopened.evaluate(()=>globalThis.__recoveryWrites.length),1);assert.equal(h.extensionNetworkRequests,0);assert.deepEqual(h.errors,[]);
  await recoveryRecord(h,'purge-invalidation',{evidenceClass:evidence.evidenceClass,projectedCharacters:(await reopened.locator('#input-recovery-fields').textContent()).length,openComparisons:await reopened.locator('dialog.reader-confirm').count(),lateFallbacks:await reopened.locator('.reading-copy-dialog').count(),writeCount:await reopened.evaluate(()=>globalThis.__recoveryWrites.length)});
 }finally{await h.close();}
});
