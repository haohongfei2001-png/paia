import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,mkdir,readFile,writeFile,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {FakeChatGPT,eventually,conversation} from './harness/fake-chatgpt.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)),out=join(root,'work/nib-v4-toolbar');
const sha=b=>createHash('sha256').update(b).digest('hex');
const rpc=async(p,type,fields={})=>{const r=await p.evaluate(r=>chrome.runtime.sendMessage(r),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
async function vector(path){const result={};async function visit(dir,prefix=''){for(const e of await readdir(dir,{withFileTypes:true})){const name=prefix+e.name;if(e.isDirectory())await visit(join(dir,e.name),name+'/');else result[name]=sha(await readFile(join(dir,e.name)));}}await visit(path);return result;}
function toolbarHook(source,owner,importLine,installLine){
 const active=source.replace(/'(?:\\[\s\S]|[^'\\])*'|"(?:\\[\s\S]|[^"\\])*"|`(?:\\[\s\S]|[^`\\])*`|\/\*[\s\S]*?(?:\*\/|$)|\/\/[^\r\n]*/g,token=>token.startsWith('/*')||token.startsWith('//')||token.startsWith('`')?token.replace(/[^\r\n]/g,' '):token).split('\n');
 const normalized=line=>line.replace(/\s/g,'').replace(/"/g,"'");
 const mentions=active.filter(line=>line.includes(owner)||line.includes('toolbar-entry.js'));
 if(!mentions.length)return false;
 assert.equal(mentions.length,2,'production toolbar owner must have one import and one hook');
 assert.equal(mentions.filter(line=>normalized(line)===normalized(importLine)).length,1,'production toolbar import must name the exact original owner');
 assert.equal(mentions.filter(line=>normalized(line)===normalized(installLine)).length,1,'production toolbar hook must consume its exact original authority');
 return true;
}
async function mirror(source,replacement,compatibility){
 const path=await mkdtemp(join(tmpdir(),'paia-s4-toolbar-'));
 for(const name of ['adapter','background','content','core','ui','icons','manifest.json'])await cp(join(source,name),join(path,name),{recursive:true});
 const originalManifest=JSON.parse(await readFile(join(path,'manifest.json'),'utf8')),manifest=structuredClone(originalManifest),originalWorker=await readFile(join(path,'background/service-worker.js'),'utf8'),archive=join(path,'ui/archive.js'),originalArchive=await readFile(archive,'utf8');
 const workerImport="import {installToolbarEntry} from './toolbar-entry.js';",workerInstall='installToolbarEntry(chrome,{clients:globalThis.clients});',clientImport="import {installToolbarClient} from '../background/toolbar-entry.js';",clientInstall='installToolbarClient(chrome);';
 const workerWired=toolbarHook(originalWorker,'installToolbarEntry',workerImport,workerInstall),clientWired=toolbarHook(originalArchive,'installToolbarClient',clientImport,clientInstall);
 assert.equal(workerWired,clientWired,'production toolbar must wire both original owners together');
 assert.ok(manifest.action&&typeof manifest.action==='object');
 if(!Object.hasOwn(originalManifest.action,'default_popup'))assert.equal(workerWired,true,'cutover source must have actual production toolbar hooks; candidate injection cannot qualify it');
 if(Object.hasOwn(manifest.action,'default_popup'))assert.equal(manifest.action.default_popup,'ui/popup.html','legacy entry must be the original Popup');
 if(replacement){
  delete manifest.action.default_popup;
  // Unwired development candidates retain the explicit mirror-only seam.
  // Final production wiring is preserved, never imported/installed twice.
  let generated=workerWired?originalWorker:workerImport+'\n'+originalWorker+'\n'+workerInstall+'\n';
  const clientModule=clientWired?originalArchive:clientImport+'\n'+originalArchive+'\n'+clientInstall+'\n';
  if(compatibility){
   const lines=generated.split('\n'),matches=lines.filter(line=>line.replace(/\s/g,'')===workerInstall);
   assert.equal(matches.length,1);
   generated=lines.map(line=>line===matches[0]?'installToolbarEntry({...chrome,runtime:{...chrome.runtime,getContexts:undefined}},{clients:globalThis.clients});':line).join('\n');
  }
  execFileSync(process.execPath,['--input-type=module','--check'],{input:clientModule});
  execFileSync(process.execPath,['--input-type=module','--check'],{input:generated});
  await writeFile(archive,clientModule);await writeFile(join(path,'background/service-worker.js'),generated);
 }else{
  // Only this isolated legacy fixture restores the removed original field.
  // Chrome then consumes the real Popup and does not deliver onClicked.
  manifest.action.default_popup='ui/popup.html';
 }
 const checkedManifest=structuredClone(manifest);if(Object.hasOwn(originalManifest.action,'default_popup'))checkedManifest.action.default_popup=originalManifest.action.default_popup;else delete checkedManifest.action.default_popup;
 assert.deepEqual(checkedManifest,originalManifest,'entry mirror changes only action.default_popup');
 if(JSON.stringify(manifest)!==JSON.stringify(originalManifest))await writeFile(join(path,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 return {path,binding:{source,replacement,compatibility,productionWired:{worker:workerWired,archive:clientWired},candidateInjection:replacement&&!workerWired,isolatedLegacyPopup:!replacement&&!Object.hasOwn(originalManifest.action,'default_popup'),originalManifest,originalWorker:sha(originalWorker),originalArchive:sha(originalArchive),worker:sha(await readFile(join(path,'background/service-worker.js'))),archive:sha(await readFile(archive)),manifest,files:await vector(path)}};
}
async function trigger(h,page){
 await page.bringToFront();const cdp=await h.context.newCDPSession(page);
 try{
  const {windowId}=await cdp.send('Browser.getWindowForTarget');
  // Modern CDP page sessions expose a child `page` target. The action API
  // requires its actual native `tab` target; never synthesize an onClicked.
  const {targetInfos}=await h.cdp.send('Target.getTargets',{filter:[{type:'tab',exclude:false}]});
  const matches=[];
  for(const target of targetInfos){if(target.type!=='tab'||target.url!==page.url())continue;const owning=await h.cdp.send('Browser.getWindowForTarget',{targetId:target.targetId});if(owning.windowId===windowId)matches.push(target);}
  assert.equal(matches.length,1,'one exact own-window native tab target must identify the original page');
  h.s4ActionTargets??=[];h.s4ActionTargets.push({type:matches[0].type,url:matches[0].url,windowId});
  await h.cdp.send('Extensions.triggerAction',{id:h.extensionId,targetId:matches[0].targetId});
 }finally{await cdp.detach();}
}
const neutral=page=>page.goto('about:blank#s4-native-action-'+crypto.randomUUID());
async function active(h){const worker=h.context.serviceWorkers().find(w=>w.url().endsWith('/background/service-worker.js'));return worker.evaluate(()=>chrome.tabs.query({active:true,lastFocusedWindow:true}));}
let implicitRelease;
function toolbarReleaseSource(){
 if(process.env.NIB_TOOLBAR_RELEASE_PATH)return process.env.NIB_TOOLBAR_RELEASE_PATH;
 if(!implicitRelease){
  implicitRelease={path:join(root,'work/current-release')};
  try{execFileSync('python3',['scripts/build_current_release.py'],{cwd:root,maxBuffer:16*1024*1024});}
  catch(error){implicitRelease.error=error;}
 }
 if(implicitRelease.error)throw implicitRelease.error;
 return implicitRelease.path;
}
for(const variant of (process.env.NIB_TOOLBAR_VARIANTS||'source,release').split(','))for(const entryMode of ['legacy','current','clients'])test('NIB S4 actual native action '+variant+' '+entryMode,{timeout:180000},async t=>{
 const replacement=entryMode!=='legacy',compatibility=entryMode==='clients';
 assert.ok(['source','release'].includes(variant));const source=variant==='source'?root:toolbarReleaseSource();await mkdir(out,{recursive:true});
 const fixture=await mirror(source,replacement,compatibility),before=await vector(fixture.path);let h;const cases=[],failedCases=[];
 try{
  h=await FakeChatGPT.start({extensionPath:fixture.path,headless:true,launchThroughPort:true,nativeTabVisibility:true,onboarding:true});
  const desktop=await h.context.newCDPSession(h.archive);
  try{const {windowId}=await desktop.send('Browser.getWindowForTarget');await desktop.send('Browser.setWindowBounds',{windowId,bounds:{width:1280,height:900,windowState:'normal'}});const {bounds}=await desktop.send('Browser.getWindowBounds',{windowId});assert.equal(bounds.width,1280);assert.equal(bounds.height,900);}finally{await desktop.detach();}
  await h.archive.setViewportSize({width:1280,height:900});
  const plain='chrome-extension://'+h.extensionId+'/ui/archive.html';
  await eventually(async()=>await h.archive.locator('#consent-panel').isVisible()||await h.archive.locator('#onboarding-welcome').isVisible());
  const check=(name,fn)=>t.test(name,async()=>{try{await fn();cases.push(name);}catch(error){failedCases.push({name,code:error?.code||'TEST_FAILURE'});throw error;}});
  const statusBefore=await rpc(h.archive,'GET_STATUS');
  if(!replacement){
   await check('legacy action opens the actual popup and retains every old control',async()=>{
    await trigger(h,h.archive);await eventually(()=>h.archive.evaluate(()=>chrome.extension.getViews({type:'popup'}).some(w=>w.location.pathname==='/ui/popup.html'&&w.document.querySelector('#next-enabled'))));
    const controls=await h.archive.evaluate(()=>{const w=chrome.extension.getViews({type:'popup'})[0];return ['open-archive','toggle-capture','check-update','update-details','next-enabled','next-explanation','recovery-card'].map(id=>!!w.document.getElementById(id));});assert.deepEqual(controls,Array(7).fill(true));assert.equal((await rpc(h.archive,'GET_STATUS')).consented,statusBefore.consented);assert.equal((await rpc(h.archive,'PAIA_PROMPT_NEXT_STATUS')).enabled,false);await h.archive.evaluate(()=>chrome.extension.getViews({type:'popup'}).forEach(w=>w.close()));
   });
  }else{
   await check('replacement action focuses current-window app without refreshing or first-use consent',async()=>{
    await h.archive.evaluate(()=>{globalThis.s4DocumentIdentity=crypto.randomUUID();globalThis.s4BeforeIdentity=s4DocumentIdentity;});const foreign=await h.context.newPage();await neutral(foreign);const count=h.context.pages().length;await trigger(h,foreign);await eventually(async()=>(await active(h))[0]?.url===plain);assert.equal(h.context.pages().length,count);assert.equal(await h.archive.evaluate(()=>s4DocumentIdentity===s4BeforeIdentity),true);assert.equal((await rpc(h.archive,'GET_STATUS')).consented,false);assert.equal((await rpc(h.archive,'PAIA_PROMPT_NEXT_STATUS')).enabled,false);assert.equal(await h.archive.evaluate(()=>chrome.extension.getViews({type:'popup'}).length),0);await foreign.close();
   });
   await h.archive.bringToFront();await eventually(async()=>await h.archive.locator('#consent-panel').isVisible()||await h.archive.locator('#onboarding-welcome').isVisible());if(await h.archive.locator('#onboarding-welcome').isVisible())await h.archive.locator('#onboarding-start').click();await h.archive.locator('#consent-panel').waitFor({state:'visible'});await h.archive.locator('#consent-check').check();await h.archive.locator('#enable-consent').click();await rpc(h.archive,'FILTER_MODE',{mode:'off'});
   const c=conversation('s4-toolbar-synthetic');c.messages=[{id:'s4-toolbar-message-001',text:'S4_TOOLBAR_ORIGINAL Exact synthetic input'}];const capture=await h.open(c);await eventually(async()=>(await h.state()).records.some(r=>r.originalText===c.messages[0].text));await capture.close();
   await h.archive.locator('#scope-search').fill('S4_TOOLBAR_ORIGINAL');await h.archive.locator('.search-input').waitFor();await h.archive.locator('.search-input').click();const originalInput=h.archive.locator('.library-prose').filter({hasText:c.messages[0].text});await originalInput.waitFor();const inputId=await originalInput.getAttribute('data-edit-id');assert.ok(inputId,'original editable Input has its actual owner ID before manual text changes');const input=h.archive.locator('.library-prose[data-edit-id='+JSON.stringify(inputId)+']');assert.equal(await input.textContent(),c.messages[0].text);
   await check('real unsaved Input editor remains same node/body/selection while action only focuses',async()=>{
    await h.archive.evaluate(()=>{globalThis.s4OriginalSend=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.s4PendingWrites=[];globalThis.s4Calls=[];globalThis.s4HoldWrites=true;globalThis.s4InFlight=0;globalThis.s4EditNotice=false;globalThis.s4PostEditReads=0;globalThis.s4SaveTrace=[];globalThis.s4ObserveNotice=m=>{if(m.type==='ARCHIVE_CHANGED'&&m.cause==='EDIT_DOCUMENT'){s4EditNotice=true;if(s4SaveTrace.length<96)s4SaveTrace.push({event:'original-edit-broadcast'});}};chrome.runtime.onMessage.addListener(s4ObserveNotice);const dispatch=r=>{s4InFlight++;if(s4SaveTrace.length<96)s4SaveTrace.push({event:'request',type:r.type});return s4OriginalSend(r).then(reply=>{if(s4SaveTrace.length<96)s4SaveTrace.push({event:'reply',type:r.type,ok:reply.ok});if(r.type==='GET_PAGE'&&s4EditNotice&&reply.ok)s4PostEditReads++;return reply;}).finally(()=>s4InFlight--);};chrome.runtime.sendMessage=r=>{s4Calls.push(r.type);if(r.type==='EDIT_DOCUMENT'&&s4HoldWrites)return new Promise(resolve=>s4PendingWrites.push(()=>dispatch(r).then(resolve)));return dispatch(r);};});
    const draft='S4_UNSAVED exact manual draft 中文 👩‍💻';await input.fill(draft);await input.evaluate(n=>{globalThis.s4Editor=n;const r=document.createRange();r.setStart(n.firstChild,8);r.setEnd(n.firstChild,12);getSelection().removeAllRanges();getSelection().addRange(r);});await eventually(()=>h.archive.evaluate(()=>s4PendingWrites.length>0));
    const before=await h.archive.evaluate(()=>({identity:s4DocumentIdentity,selection:getSelection().toString(),text:s4Editor.textContent,route:JSON.stringify(history.state)}));const foreign=await h.context.newPage();await neutral(foreign);await h.archive.evaluate(()=>{s4Calls.length=0;});await trigger(h,foreign);await eventually(async()=>(await active(h))[0]?.url===plain);
    assert.deepEqual(await h.archive.evaluate(()=>({identity:s4DocumentIdentity,selection:getSelection().toString(),text:s4Editor.textContent,route:JSON.stringify(history.state)})),before);assert.equal(await input.evaluate(n=>n===s4Editor),true);assert.equal(await h.archive.evaluate(()=>s4Calls.includes('GET_PAGE')),false,'focus never asks app to navigate/refresh');await h.archive.evaluate(async()=>{s4HoldWrites=false;await Promise.all(s4PendingWrites.splice(0).map(release=>release()));});
    // Text was already locally changed before the held write was released.
    // Await the real saved status and its original broadcast/read completion,
    // rather than letting those reads enter the following outage test.
    await eventually(()=>h.archive.evaluate(()=>s4EditNotice&&s4PostEditReads>0&&s4InFlight===0&&document.getElementById('save-status').dataset.state==='saved'),'original acknowledged edit and ensuing app refresh complete');
    await h.archive.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.equal(await input.textContent(),draft);h.s4SavePreparation=await h.archive.evaluate(()=>({editNotice:s4EditNotice,postEditReads:s4PostEditReads,inFlight:s4InFlight,trace:s4SaveTrace}));await h.archive.evaluate(()=>{chrome.runtime.sendMessage=s4OriginalSend;chrome.runtime.onMessage.removeListener(s4ObserveNotice);});await foreign.close();
   });
   await check('app is still focusable when its original read RPC is unavailable',async()=>{
    await h.archive.evaluate(()=>{globalThis.s4Base=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.s4DeniedReads=0;chrome.runtime.sendMessage=r=>{if(r.type==='GET_PAGE'){s4DeniedReads++;return Promise.resolve({ok:false,error:'STORAGE_FAILED'});}return s4Base(r);};});
    const p=await h.context.newPage();await neutral(p);try{await trigger(h,p);await eventually(async()=>(await active(h))[0]?.url===plain);assert.equal(await h.archive.evaluate(()=>s4DeniedReads),0);assert.equal(await input.evaluate(n=>n===s4Editor),true);}finally{await h.archive.evaluate(()=>{chrome.runtime.sendMessage=s4Base;});await p.close();}
   });
   await check('real discarded saved app reuses its returned tab identity without a new app',async()=>{
    const worker=h.context.serviceWorkers().find(w=>w.url().endsWith('/background/service-worker.js')),identity=await h.archive.evaluate(()=>chrome.tabs.getCurrent().then(t=>({id:t.id,windowId:t.windowId})));const foreign=await h.context.newPage();await neutral(foreign);await foreign.bringToFront();
    const discarded=await worker.evaluate(id=>chrome.tabs.discard(id).then(t=>({id:t.id,windowId:t.windowId,discarded:t.discarded,url:t.url})),identity.id);assert.equal(discarded.discarded,true);assert.equal(discarded.windowId,identity.windowId);assert.equal(discarded.url,plain);
    const before=await worker.evaluate(async windowId=>{const tabs=await chrome.tabs.query({windowId});return {own:tabs.filter(t=>t.url===chrome.runtime.getURL('ui/archive.html')).map(t=>({id:t.id,discarded:t.discarded})),contexts:await chrome.runtime.getContexts({contextTypes:['TAB'],windowIds:[windowId]}),clients:(await self.clients.matchAll({type:'window',includeUncontrolled:true})).filter(c=>c.url===chrome.runtime.getURL('ui/archive.html')).map(c=>c.id)};},identity.windowId);
    assert.deepEqual(before.own,[{id:discarded.id,discarded:true}]);assert.equal(before.contexts.some(c=>c.tabId===discarded.id),false);assert.equal(before.clients.length,0);
    await trigger(h,foreign);await eventually(async()=>(await active(h))[0]?.id===discarded.id,'native action revives original discarded app instead of creating');
    await eventually(()=>h.context.pages().some(p=>!p.isClosed()&&p.url()===plain));h.archive=h.context.pages().find(p=>!p.isClosed()&&p.url()===plain);
    const after=await worker.evaluate(async windowId=>(await chrome.tabs.query({windowId})).filter(t=>t.url===chrome.runtime.getURL('ui/archive.html')).map(t=>({id:t.id,discarded:t.discarded})),identity.windowId);
    assert.deepEqual(after,[{id:discarded.id,discarded:false}]);h.s4DiscardedProof={before,discarded,after};await foreign.close();
   });
   await check('no existing app creates a plain app on unsupported page with unchanged policy',async()=>{
    const status=await rpc(h.archive,'GET_STATUS'),next=await rpc(h.archive,'PAIA_PROMPT_NEXT_STATUS');await h.archive.close();const p=await h.context.newPage();await neutral(p);await trigger(h,p);await eventually(()=>h.context.pages().some(p=>p.url()===plain));h.archive=h.context.pages().find(p=>p.url()===plain);assert.equal(h.archive.url(),plain);assert.equal((await rpc(h.archive,'GET_STATUS')).enabled,status.enabled);assert.equal((await rpc(h.archive,'PAIA_PROMPT_NEXT_STATUS')).enabled,next.enabled);await p.close();
   });
  }
  assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.deepEqual(h.errors,[]);assert.deepEqual(await vector(fixture.path),before);
  await writeFile(join(out,variant+'-'+entryMode+'.json'),JSON.stringify({status:failedCases.length?'FAIL':'PASS',failedCases,head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),binding:fixture.binding,compatibilityAPIPath:compatibility,realChrome114Device:false,actionTargets:h.s4ActionTargets,savePreparation:h.s4SavePreparation,discardedProof:h.s4DiscardedProof,cases,network:0,installed:false,fullS4:false},null,2)+'\n');
 }finally{if(h)await h.close();await rm(fixture.path,{recursive:true,force:true});}
});
