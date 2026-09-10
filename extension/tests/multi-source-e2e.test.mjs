import {openRecord,context} from './harness/workspace-ui.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,conversation,eventually} from './harness/fake-chatgpt.mjs';
for(const arrival of ['DOM first','response first'])test('multi-source browser: '+arrival+' to resolver, archive and safe summary',{timeout:45000},async()=>{
 const h=await FakeChatGPT.start();
 try{
  await h.archive.locator('#consent-check').check();await h.archive.locator('#enable-consent').click();await h.archive.locator('[data-view="settings"]').click();await h.archive.locator('[data-view="archive"]').click();
  const c=conversation('fake-multisource-'+arrival.replace(' ','-'));
  const offsets=[0,500,5000];const dates=c.messages.map((m,i)=>new Date((c.base+i*60)*1000+offsets[i]).toISOString());
  const page=await h.open(c,{arrival:'manual'});await h.ready(page);
  await eventually(async()=>(await h.state()).records.length===3);const before=(await h.state()).records;
  const addDOM=()=>page.evaluate(values=>{
   for(const [id,timestamp] of values)document.querySelector(`[data-message-id="${id}"]`).setAttribute('data-message-created-at',timestamp);
  },c.messages.map((m,i)=>[m.id,dates[i]]));
  if(arrival==='DOM first')await addDOM();else await h.respond(page,c);
  await eventually(async()=>(await h.state()).records.every(r=>r.timeConfidence==='high'));
  if(arrival==='DOM first')await h.respond(page,c);else await addDOM();
  await eventually(async()=>{const r=(await h.state()).records;return r[0].timeConfidence==='very_high'&&r[1].timeConfidence==='very_high'&&r[2].timeConfidence==='conflict';});
  const after=(await h.state()).records;assert.equal(after.length,3);
  for(let i=0;i<3;i++){
   assert.equal(after[i].sourceSentAt,i===2?null:new Date((c.base+i*60)*1000).toISOString());
   assert.equal(after[i].timeSource,i===2?'unknown':'dom+response');
   for(const k of ['id','originalText','capturedAt','contentHash'])assert.equal(after[i][k],before[i][k]);
  }
  await h.archive.reload();await h.archive.locator('[data-view="settings"]').click();await h.archive.locator('[data-view="archive"]').click();await h.archive.locator('.conversation-document').click();await eventually(async()=>await h.archive.locator('.archive-block').count()===3);
  const timeline=await h.archive.locator('.archive-block').evaluateAll(nodes=>nodes.map(n=>n.dataset.recordId));
  assert.ok(timeline.indexOf(after[0].id)<timeline.indexOf(after[1].id));
  await context(h.archive,h.archive.locator(`[data-record-id="${after[0].id}"] .original-prose`),'查看来源 / 记录信息…');
  let summary=await h.archive.locator('#source-time-summary').textContent();assert.match(summary,/DOM candidate: present/);assert.match(summary,/response candidate: present/);assert.match(summary,/agreement: agree/);assert.match(summary,/very_high/);
  for(const privateValue of [c.id,...c.messages.map(m=>m.id),...c.messages.map(m=>m.text),...dates])assert.equal(summary.includes(privateValue),false);
  await h.archive.locator('#close-info').click();await context(h.archive,h.archive.locator(`[data-record-id="${after[2].id}"] .original-prose`),'查看来源 / 记录信息…');summary=await h.archive.locator('#source-time-summary').textContent();assert.match(summary,/agreement: conflict/);assert.match(summary,/sourceSentAt: null/);
  await h.respond(page,c);await h.restartWorker();assert.deepEqual((await h.state()).records,after);
  assert.equal(h.historyRequests,2);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});
