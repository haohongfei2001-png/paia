import {mkdtemp,rm} from 'node:fs/promises';
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
 await eventually(()=>p.locator('#onboarding-skip').isVisible());await p.locator('#onboarding-skip').click();
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
  await page.addScriptTag({content:(await readFile(root+'/ui/capture-time-view.js','utf8')).replace('export function','function')});
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
