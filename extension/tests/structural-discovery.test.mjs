import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,eventually,pause} from './harness/fake-chatgpt.mjs';
import {structuralHistory} from './fixtures/structural-history.mjs';
import '../adapter/json-fingerprint.js';
import '../adapter/history-contract.js';

test('structural discovery: old diagnostic counts and exact matches do not imply the old named contract',()=>{
 for(const kind of ['array','dictionary','messages']){
  const {c,data}=structuralHistory(kind),fp=globalThis.ChatGPTJSONFingerprint.inspect(data);
  assert.equal(fp.shape.rootType,'object');assert.equal(fp.shape.messagesLike,true);assert.equal(fp.shape.conversationIdentityField,true);
  assert.equal(fp.detail.candidate,true);assert.equal(fp.detail.messageCount,55);assert.equal(fp.detail.userRoleCount,5);assert.equal(fp.detail.parseableCount,5);assert.equal(fp.detail.userWithIDCount,5);assert.equal(fp.detail.userWithCreateTimeCount,5);
  assert.equal(fp.matches.filter(m=>m.chat===c.id&&c.messages.some(u=>u.id===m.id)).length,3);
  assert.equal(globalThis.ChatGPTHistoryContract.parseStructural?.(data,c.id)?.rows.length,5);
 }
});

for(const kind of ['array','dictionary','messages'])test(`structural browser clean install: ${kind} other fetch through archive UI`,{timeout:35000},async()=>{
 const h=await FakeChatGPT.start();
 try{
  assert.equal((await h.state()).records.length,0);
  await h.archive.locator('#consent-check').check();await h.archive.locator('#enable-consent').click();await h.archive.locator('[data-view="settings"]').click();await h.archive.locator('[data-view="archive"]').click();
  await h.context.addInitScript(()=>{
   window.fakeDiscovery={other:false,rejectedURL:false,projected:0};
   window.addEventListener('message',e=>{if(e.source!==window||e.data?.channel!=='archive-response-metadata-v1')return;
    if(e.data.trace){window.fakeDiscovery.other ||= e.data.trace.endpointClass==='other';window.fakeDiscovery.rejectedURL ||= e.data.trace.reason==='URL_SHAPE_NOT_ALLOWED';}
    if(e.data.history)window.fakeDiscovery.projected=e.data.history.rows.length;
   });
  });
  const {c,data,users}=structuralHistory(kind);
  // Only set the HTTP response. The page initiates and consumes its own fetch.
  h.pending.set(c.id,data);const started=Date.now();const page=await h.open(c,{arrival:'metadata-first'});
  await eventually(async()=>{const r=(await h.state()).records;return r.length===3&&r.every(x=>x.timeConfidence==='high');},'structural other response must produce three formal high records');
  const records=(await h.state()).records;
  assert.deepEqual(await page.evaluate(()=>window.fakeDiscovery),{other:true,rejectedURL:true,projected:5});
  for(const r of records){const m=users.find(m=>m.id===r.sourceMessageId);assert.ok(m);assert.equal(r.originalText,m.text);assert.equal(r.sourceSentAt,new Date(m.at*1000).toISOString());assert.equal(r.timeSource,'chatgpt_response_create_time');assert.ok(Date.parse(r.capturedAt)>=started&&Date.parse(r.capturedAt)<=Date.now());}
  await h.archive.reload();await h.archive.locator('[data-view="settings"]').click();await h.archive.locator('[data-view="archive"]').click();await h.archive.locator('.conversation-document').click();await eventually(async()=>await h.archive.locator('.archive-block').count()===3);
  const order=await h.archive.locator('.archive-block').evaluateAll(nodes=>nodes.map(n=>n.dataset.recordId));
  assert.deepEqual(order,records.slice().sort((a,b)=>a.sourceSentAt.localeCompare(b.sourceSentAt)).map(r=>r.id));
  assert.equal((await h.archive.locator('#document-body').textContent()).includes('发送时间未知'),false);
  await h.archive.locator('.original-prose').first().click({button:'right'});await h.archive.getByRole('menuitem',{name:'查看来源 / 记录信息…'}).click();assert.match(await h.archive.locator('#info-content').textContent(),/发送于.*2021[\s\S]*捕获于/);
  await h.respond(page,c,data);await pause(1100);assert.deepEqual((await h.state()).records,records);
  assert.equal(h.historyRequests,2);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('structural browser: invalid other responses never resolve formal time', {timeout:60000},async t=>{
 const cases={
  'wrong conversation':d=>d.conversation_id='fake-wrong-conversation',
  'missing create':d=>delete d.history_items.entry_54.create_time,
  'invalid ID':d=>d.history_items.entry_54.id='bad',
  'no exact canonical':d=>Object.values(d.history_items).forEach(m=>{if(m.author.role==='user')m.id+='-unmatched';}),
  'byte limit':d=>d.padding='x'.repeat(524289),
  'duplicate conflict':d=>d.history_items.extra={...d.history_items.entry_54,create_time:1609459201},
 };
 for(const [label,edit] of Object.entries(cases))await t.test(label,async()=>{
  const h=await FakeChatGPT.start();try{
   await h.archive.locator('#consent-check').check();await h.archive.locator('#enable-consent').click();await h.archive.locator('[data-view="settings"]').click();await h.archive.locator('[data-view="archive"]').click();
   const {c,data}=structuralHistory();edit(data);h.pending.set(c.id,data);await h.open(c,{arrival:'metadata-first'});
   await eventually(async()=>(await h.state()).records.length===3);await pause(1100);
   const rows=(await h.state()).records;assert.ok(rows.every(r=>r.sourceSentAt===null&&r.timeConfidence==='unknown'));
   assert.deepEqual((await h.state()).sourceTimes,{});
   assert.equal(h.historyRequests,1);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);
  }finally{await h.close();}
 });
});
