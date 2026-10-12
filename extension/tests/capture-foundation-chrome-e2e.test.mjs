import {mkdtemp,rm,mkdir,writeFile,readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chooseConsumerGroup} from './harness/settings-consumer-presentation.mjs';
import {thoughtPrimary} from './harness/current-thought-navigation.mjs';
import {routeComposer} from './harness/prompt-composer.mjs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {FakeChatGPT,conversation,eventually,pause} from './harness/fake-chatgpt.mjs';
import {openArchiveWindow} from './harness/archive-navigator.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const rpc=async(page,type,fields={})=>{const r=await page.evaluate(m=>chrome.runtime.sendMessage(m),{type,...fields});assert.equal(r.ok,true);return r.data;};
async function consent(h){
 const p=h.archive;await eventually(async()=>!await p.locator('#enable-consent').isDisabled());await p.locator('#enable-consent').click();
 await eventually(async()=>(await rpc(p,'GET_STATUS')).consented===true);
 assert.equal(await p.locator('#onboarding-history-step').isVisible(),false,'Archive root stays blank; optional history import belongs to Settings');
 await rpc(p,'FILTER_MODE',{mode:'off'});
}
async function journey(extensionPath){
 const profile=await mkdtemp(join(tmpdir(),'paia-capture-test-'));
 let h=await FakeChatGPT.start({extensionPath,headless:true,userDataDir:profile});
 try{
  await consent(h);
  const a=conversation('foundation-browser-a'),b=conversation('foundation-browser-b',86400);
  a.messages[0].text='  合成输入：中文 🙂 e\u0301\n\n```js\nconst x = 1;\n```\n尾部空格  \n';
  let p=await h.open(a,{arrival:'dom-first'});await h.ready(p);
  await eventually(async()=>(await h.state()).records.length===3,'three source messages persist');
  const before=(await h.state()).records;assert.ok(before.every(r=>r.sourceSentAt===null));
  assert.equal(before.find(r=>r.sourceMessageId===a.messages[0].id).originalText,a.messages[0].text);
  assert.equal(new Set(before.map(r=>r.sourceKey)).size,3,'same-text different source IDs stay distinct');
  assert.ok(before.every(r=>!r.originalText.includes('FAKE_')),'assistant and draft content never enter archive');
  await openArchiveWindow(h.archive,{label:'capture foundation Archive window is reachable'});await eventually(()=>h.archive.locator('#document-panel').isVisible());
  assert.match(await h.archive.locator('#document-body').textContent(),/时间未知/);
  // Metadata arrives after a canonical message has left the virtualized DOM.
  await p.evaluate(id=>document.querySelector(`[data-message-id="${id}"]`).remove(),a.messages[0].id);
  await h.respond(p,a);
  await eventually(async()=>(await h.state()).records.every(r=>r.sourceSentAt!==null),'late exact metadata enriches removed DOM source');
  await eventually(async()=>!((await h.archive.locator('#document-body').textContent()).includes('时间未知')),'open Reader refreshes after metadata-only update');
  const enriched=(await h.state()).records;
  for(const old of before){const next=enriched.find(r=>r.id===old.id);assert.equal(next.originalText,old.originalText);assert.equal(next.capturedAt,old.capturedAt);assert.equal(next.sourceSentAt,new Date((a.base+a.messages.findIndex(m=>m.id===next.sourceMessageId)*60)*1000).toISOString());}
  await h.render(p,a);await pause(2400);assert.equal((await h.state()).records.length,3,'DOM remount is idempotent');
  await p.evaluate(()=>{for(let i=0;i<30;i++)document.querySelector('#messages').setAttribute('data-test-mutation',String(i));});
  await p.reload();await h.ready(p);await h.respond(p,a);await pause(2400);assert.equal((await h.state()).records.length,3,'reload and repeated observer mutations are idempotent');
  await h.spa(p,b);await h.ready(p);await h.respond(p,b);await eventually(async()=>(await h.state()).records.length===6,'A to B');
  await h.spa(p,a);await h.ready(p);await h.respond(p,a);await pause(2400);assert.equal((await h.state()).records.length,6,'A to B to A');
  const added={id:a.id+'-message-004',text:a.messages[1].text};await h.send(p,added);
  await eventually(async()=>(await h.state()).records.length===7,'new same text with a new ID persists');
  const eventTime=a.base+1000;
  await h.context.route('https://chatgpt.com/backend-api/conversation',route=>route.fulfill({contentType:'text/event-stream',body:'data: '+JSON.stringify({conversation_id:a.id,message:{id:added.id,author:{role:'user'},create_time:eventTime,content:{parts:['SYNTHETIC_STREAM_BODY_NOT_ARCHIVED']}}})+'\n\ndata: [DONE]\n\n'}));
  await p.evaluate(()=>fetch('/backend-api/conversation').then(r=>r.text()).then(()=>undefined));
  await eventually(async()=>(await h.state()).records.find(r=>r.sourceMessageId===added.id)?.sourceSentAt===new Date(eventTime*1000).toISOString(),'formal sent-event metadata works in real Chrome');
  await h.edit(p,a.messages[0].id,'合成编辑版本：保留旧原文',false);
  await eventually(async()=>(await h.state()).records.length===8,'source edit appends one immutable content snapshot');
  let state=await h.state();assert.equal(new Set(state.records.map(r=>r.sourceKey)).size,7);assert.equal(state.records.filter(r=>r.sourceMessageId===a.messages[0].id).length,2);
  assert.equal(state.records.find(r=>r.id===before[0].id)?.originalText,before[0].originalText);
  await h.restartWorker();await pause(2400);assert.equal((await h.state()).records.length,8,'worker restart retains idempotent ingestion');
  // A fresh Chrome runtime reloads the same extension path and synthetic profile.
  // The profile was created by this test; no daily-use profile is ever opened.
  const originalExtensionId=h.extensionId,previousScan=(await h.state()).diagnostics.lastScanAt;
  const persistedRecords=(await h.state()).records;
  assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);
  await h.close();h=await FakeChatGPT.start({extensionPath,headless:true,userDataDir:profile,onboarding:true});
  assert.equal(h.extensionId,originalExtensionId,'same-path reload retains extension identity');
  assert.equal((await h.state()).records.length,8,'browser restart retains the archive');
  assert.deepEqual((await h.state()).records,persistedRecords,'browser restart preserves complete source records');
  p=await h.open(a,{arrival:'metadata-first'});await h.ready(p);
  await eventually(async()=>(await h.state()).diagnostics.lastScanAt>previousScan,'fresh content scripts run after restart');
  await pause(2400);assert.equal((await h.state()).records.length,8,'reload after browser restart is idempotent');
  await p.evaluate(()=>{document.querySelector('#messages').replaceChildren();const turn=document.createElement('article');turn.dataset.testid='conversation-turn-1';turn.textContent='SYNTHETIC_UNKNOWN_ROLE';document.querySelector('#messages').append(turn);document.querySelector('[contenteditable]')?.remove();});
  await eventually(async()=>(await h.state()).diagnostics.status==='ADAPTER_MISMATCH','role loss is explicitly degraded');
  state=await h.state();assert.equal(state.records.length,8);assert.ok(state.diagnostics.ingestion);assert.ok(state.diagnostics.captureHealth);
  assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();await rm(profile,{recursive:true,force:true});}
}
test('capture foundation: source extension browser journey preserves identity, original text, timestamps and failure visibility',{timeout:120000},()=>journey(root));
test('capture foundation: emitted release retains formal metadata, diagnostics and restart safety',{timeout:150000},async()=>{
 const output=root+'/work/capture-foundation-release';
 execFileSync('python3',['scripts/build_current_release.py',output],{cwd:root,stdio:'pipe'});
 await journey(output);
});

test('capture time repaint preserves dirty editable text, selection, node identity and page order',{timeout:30000},async()=>{
 const {readFile}=await import('node:fs/promises');
 const h=await FakeChatGPT.start({headless:true});
 try{
  const page=await h.context.newPage();
  await page.setContent('<div id="body"><div class="reader-page"><h3 class="document-day">unknown</h3><section class="library-block" data-block-id="one"><p class="block-time">unknown</p><div contenteditable="plaintext-only">SYNTHETIC UNSAVED LOCAL EDIT</div></section><section class="library-block" data-block-id="two"><p class="block-time">unknown</p><div contenteditable="plaintext-only">SECOND LOCAL EDIT</div></section></div></div>');
  await page.addScriptTag({content:(await readFile(root+'/ui/capture-time-view.js','utf8')).replaceAll('export function','function')});
  const result=await page.evaluate(()=>{
   const body=document.getElementById('body'),node=body.querySelector('[contenteditable]'),range=document.createRange();
   node.focus();range.setStart(node.firstChild,7);range.collapse(true);getSelection().removeAllRanges();getSelection().addRange(range);
   const format={day:value=>value.slice(0,10),time:value=>value.slice(11,16)};
   const rows=[{id:'one',sourceSentAt:'2021-01-01T08:00:00.000Z'},{id:'two',sourceSentAt:'2021-01-02T09:00:00.000Z'}];
   refreshCaptureTimes(body,rows,format);const separateDays=[...body.querySelectorAll('.document-day')].map(n=>n.textContent);
   rows[1].sourceSentAt='2021-01-01T09:00:00.000Z';refreshCaptureTimes(body,rows,format);
   return {same:node===body.querySelector('[contenteditable]'),text:node.textContent,selectionNode:getSelection().anchorNode===node.firstChild,selectionOffset:getSelection().anchorOffset,separateDays,mergedDays:body.querySelectorAll('.document-day').length,order:[...body.querySelectorAll('[data-block-id]')].map(n=>n.dataset.blockId)};
  });
  assert.deepEqual(result,{same:true,text:'SYNTHETIC UNSAVED LOCAL EDIT',selectionNode:true,selectionOffset:7,separateDays:['2021-01-01','2021-01-02'],mergedDays:1,order:['one','two']});
 }finally{await h.close();}
});


// One cross-owner release journey complements, rather than repeats, the existing
// failure matrices. All content writes use the original visible product controls.
test('local Chrome release: first-use Settings through capture, local work, exact reuse and cold persistence',{timeout:180000},async()=>{
 const extensionPath=join(root,'work/capture-foundation-release'),out=join(root,'work/local-chrome-journey');
 execFileSync('python3',['scripts/build_current_release.py',extensionPath],{cwd:root,stdio:'pipe'});
 await mkdir(out,{recursive:true});
 const vector=[];const walk=async(base,prefix='')=>{for(const entry of await readdir(base,{withFileTypes:true})){const name=prefix+entry.name,path=join(base,entry.name);if(entry.isDirectory())await walk(path,name+'/');else vector.push({path:name,sha256:createHash('sha256').update(await readFile(path)).digest('hex')});}};await walk(extensionPath);vector.sort((a,b)=>a.path.localeCompare(b.path));
 await writeFile(join(out,'release-vector.json'),JSON.stringify(vector,null,2)+'\n');
 const profile=await mkdtemp(join(tmpdir(),'paia-local-journey-')),steps=[];
 const original='LOCAL_JOURNEY 原始输入：请保留条件与否定，只有明确确认后才发布这份合成练习。',working='LOCAL_JOURNEY 手工修改：不要发布这份合成练习。\n请保留全部条件与换行。',thought='LOCAL_JOURNEY 独立思想，不改写原来的输入。',context='LOCAL_JOURNEY 我的本地信息，仅用于合成验收。',topic='LOCAL_JOURNEY 手工主题';
 let h,p,phase='launch',failure;
 const offline=()=>{assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);};
 const mark=async name=>{steps.push(name);await p.screenshot({path:join(out,name+'.png'),fullPage:true});};
 const archiveRead=async()=>{await thoughtPrimary(p,'library');await eventually(()=>p.locator('#scope-search').isEnabled());await p.locator('#scope-search').fill('LOCAL_JOURNEY');await eventually(()=>p.locator('.search-input').count().then(n=>n===1),'one captured Input is discoverable through original Archive search');await p.locator('.search-input').first().focus();await p.keyboard.press('Enter');await p.locator('#document-body [data-edit-id]').first().waitFor();return p.locator('#document-body [data-edit-id]').first();};
 const thoughtRead=async()=>{await thoughtPrimary(p,'thoughts');const link=p.locator('.personal-topic-link').filter({hasText:topic});await link.waitFor();await link.click();await eventually(()=>p.locator('[data-entry-field="body"]').allTextContents().then(values=>values.some(value=>value===thought)),'manual Thought is readable in its original Topic');};
 const contextRead=async()=>{await thoughtPrimary(p,'memory');await p.locator('.context-card[data-card="info"] .card-link').click();await p.locator('.item-text').first().waitFor();assert.equal(await p.locator('.item-text').first().innerText(),context);};
 try{
  h=await FakeChatGPT.start({extensionPath,headless:true,userDataDir:profile,onboarding:true});p=h.archive;await p.setViewportSize({width:1440,height:900});const extensionId=h.extensionId;
  phase='first-use-settings';assert.equal((await rpc(p,'GET_STATUS')).consented,false);await p.locator('.sidebar-bottom [data-view="settings"]').click();await chooseConsumerGroup(p,'reading');await p.locator('#ux-language').selectOption('zh-CN');await eventually(()=>p.locator('html').getAttribute('lang').then(v=>v==='zh-CN'));await chooseConsumerGroup(p,'content');await eventually(()=>p.locator('#toggle-capture').isEnabled());await p.locator('#toggle-capture').click();await p.locator('#settings-capture-consent').waitFor({state:'visible'});assert.equal((await rpc(p,'GET_STATUS')).consented,false);await p.locator('#settings-capture-confirm').click();await eventually(async()=>(await rpc(p,'GET_STATUS')).consented===true);await p.locator('#settings-capture-consent').waitFor({state:'hidden'});assert.equal((await rpc(p,'PAIA_PROMPT_NEXT_STATUS')).enabled,false);await mark('01-explicit-consent');
  phase='real-provider-capture';const capture=await h.open({id:'local-journey-source',title:'LOCAL_JOURNEY 合成来源',base:1609459200,messages:[{id:'local-journey-input',text:original}]},{arrival:'dom-first'});await eventually(async()=>(await h.state()).records.some(row=>row.sourceMessageId==='local-journey-input'),'actual adapter persists the visible submitted user Input');const record=(await h.state()).records.find(row=>row.sourceMessageId==='local-journey-input');assert.equal(record.originalText,original);const sourceRecordId=record.id;await capture.close();
  phase='archive-ui-edit';let field=await archiveRead();const inputId=await field.getAttribute('data-edit-id');assert.ok(inputId);const input=await rpc(p,'GET_INPUT',{id:inputId});assert.equal(input.id,inputId);assert.equal(input.originalTextReference,sourceRecordId);assert.equal(input.sourceRecordId,sourceRecordId);assert.equal(await field.innerText(),original);await field.fill(working);await field.press('Tab');await eventually(async()=>(await rpc(p,'GET_INPUT',{id:inputId})).libraryText===working,'original autosave acknowledges the human Working edit');assert.equal((await h.state()).records.find(row=>row.id===sourceRecordId).originalText,original);await mark('02-archive-working');
  phase='manual-thought';await thoughtPrimary(p,'thoughts');await p.locator('#thought-root-source').getByRole('button',{name:'接着写',exact:true}).click();const workspace=p.locator('#thought-writing-workspace');await workspace.locator('textarea').fill(thought);await workspace.locator('.thought-compose-more > summary').click();await workspace.getByText('选择主题（可不选）',{exact:true}).click();await workspace.getByRole('button',{name:'新建主题',exact:true}).click();await workspace.getByRole('textbox',{name:'新主题名称',exact:true}).fill(topic);await workspace.getByRole('button',{name:'创建主题',exact:true}).click();await eventually(()=>workspace.locator('.thought-compose-topic select').inputValue().then(Boolean),'real manual Topic is selected');await workspace.getByRole('button',{name:'保存想法',exact:true}).click();await workspace.waitFor({state:'hidden'});await thoughtRead();await mark('03-manual-thought');
  phase='manual-context';await thoughtPrimary(p,'memory');await eventually(()=>p.locator('.context-card').count().then(n=>n===4),'four local Context cards render');assert.equal(await p.locator('.context-card').count(),4);await p.locator('.context-card[data-card="info"] .card-link').click();await p.locator('.add-item').click();await p.locator('.item-text').first().fill(context);await p.locator('.item-text').first().press('Control+Enter');await eventually(async()=>(await rpc(p,'PAIA_CONTEXT_CARDS_SNAPSHOT')).items.some(item=>item.body===context),'real local Context item is durable');await mark('04-manual-context');
  phase='nib-exact-fill';await routeComposer(h.context,root);const host=await h.context.newPage();host.on('pageerror',error=>h.errors.push(error.message));await host.goto('https://chatgpt.com/c/prompt-insertion-fixture');await host.waitForFunction(()=>!!globalThis.fixture?.view);await host.addStyleTag({content:'body{margin:0;min-height:100vh}form{position:fixed;left:16px;right:16px;bottom:16px;padding:12px}#blur{position:fixed;top:4px}'});await host.locator('[data-fixture-composer]').click();await host.locator('[data-paia-prompt-surface]').click();let frame;await eventually(()=>{frame=host.frames().find(f=>f.url().includes('/ui/prompt-surface.html#'));return !!frame;});
  const settle=async()=>eventually(async()=>{const element=await frame.frameElement(),before=await element.boundingBox();for(let i=0;i<2;i++){await frame.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));await host.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));if(await frame.evaluate(()=>document.documentElement.hasAttribute('data-layout-pending')))return false;}const after=await element.boundingBox();return before&&after&&['x','y','width','height'].every(k=>before[k]===after[k]);},'original surface ACK and parent geometry settle before one trusted action');
  const click=async locator=>{await settle();if(await locator.evaluate(n=>!!n.closest('#surface-tools'))&&await frame.locator('#surface-tools').isHidden()){await frame.locator('#surface-more').click();await settle();}await locator.click();};
  await frame.evaluate(()=>{const original=chrome.runtime.sendMessage;globalThis.localJourneyInsertCommands=[];chrome.runtime.sendMessage=function(...args){const command=args[0]?.command;if(['PAIA_PROMPT_SELECTION_INSERT','PAIA_PROMPT_INSERT'].includes(command?.type))localJourneyInsertCommands.push(command.type);return Reflect.apply(original,this,args);};});
  await click(frame.locator('#open-search'));await frame.locator('#search-query').fill('LOCAL_JOURNEY');await eventually(()=>frame.locator('.row').count().then(n=>n===1),'NIB reads the same original qualified Archive Input');await click(frame.locator('.row .insert'));await frame.locator('.check-body').waitFor();assert.equal(await frame.locator('.check-body').textContent(),working);assert.equal(await host.evaluate(()=>fixture.text()),'');assert.deepEqual(await frame.evaluate(()=>localJourneyInsertCommands),[]);await click(frame.getByRole('button',{name:'填入整条',exact:true}));await eventually(()=>host.evaluate(expected=>fixture.text()===expected,working),'one explicit native Fill reaches the actual composer');assert.deepEqual(await frame.evaluate(()=>localJourneyInsertCommands),['PAIA_PROMPT_SELECTION_INSERT']);assert.equal(await host.evaluate(()=>fixture.send),0);assert.equal(await host.evaluate(()=>fixture.enter),0);await host.screenshot({path:join(out,'05-exact-fill.png'),fullPage:true});steps.push('05-exact-fill');await host.close();assert.deepEqual((await h.state()).records.map(row=>row.id),[sourceRecordId],'unsent reusable text, Thought and Context never become captured Source');offline();
  phase='cold-browser-restart';await h.close();h=null;h=await FakeChatGPT.start({extensionPath,headless:true,userDataDir:profile,onboarding:true});p=h.archive;await p.setViewportSize({width:1440,height:900});assert.equal(h.extensionId,extensionId);assert.equal((await rpc(p,'GET_STATUS')).consented,true);assert.equal((await rpc(p,'PAIA_PROMPT_NEXT_STATUS')).enabled,false);field=await archiveRead();assert.equal(await field.getAttribute('data-edit-id'),inputId);assert.equal((await rpc(p,'GET_INPUT',{id:inputId})).originalTextReference,sourceRecordId);assert.equal(await field.innerText(),working);assert.equal((await h.state()).records.find(row=>row.id===sourceRecordId).originalText,original);await thoughtRead();await contextRead();await mark('06-cold-persistence');offline();
  await writeFile(join(out,'result.json'),JSON.stringify({status:'PASS',syntheticOnly:true,version:JSON.parse(await readFile(join(extensionPath,'manifest.json'),'utf8')).version,releaseFiles:vector.length,steps,coldRestart:true,exactInsertions:1,send:0,protectedServiceRequests:0,extensionNetworkRequests:0,externalRequests:0},null,2)+'\n');
 }catch(error){failure=error;try{await writeFile(join(out,'failure.json'),JSON.stringify({status:'FAIL',phase,steps,error:String(error.message)},null,2)+'\n');}catch(evidenceError){console.error('Journey failure evidence write failed',evidenceError.message);}throw error;}
 finally{
  const cleanupErrors=[];try{await h?.close();}catch(error){cleanupErrors.push(error);}try{await rm(profile,{recursive:true,force:true});}catch(error){cleanupErrors.push(error);}
  if(cleanupErrors.length){const error=failure||cleanupErrors[0],report={status:'FAIL',phase:failure?phase:'cleanup',steps,error:String(error.message),cleanupErrors:cleanupErrors.map(item=>String(item.message))};for(const name of ['result.json','failure.json']){try{await writeFile(join(out,name),JSON.stringify(report,null,2)+'\n');}catch(evidenceError){console.error('Journey cleanup evidence write failed',evidenceError.message);if(name==='result.json'){try{await rm(join(out,name),{force:true});}catch(removeError){console.error('Stale journey result removal failed',removeError.message);}}}}for(const item of cleanupErrors)console.error('Owned journey cleanup failed',item.message);if(!failure)throw error;}
 }
});
