import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,conversation,eventually} from './harness/fake-chatgpt.mjs';
import {olderHistory} from './fixtures/older-history.mjs';

async function watchBatches(page) {
 await page.evaluate(()=>{
  window.fakeAcceptedHistory=[];
  window.addEventListener('message',e=>{
   if(e.source===window&&e.data?.channel==='archive-response-metadata-v1'&&e.data.history)
    window.fakeAcceptedHistory.push(e.data.history.rows.length);
  });
 });
}

for(const arrival of ['metadata-first','identity-first'])test(`legacy browser: ${arrival} repairs an existing deduped record in the same page`,{timeout:45000},async()=>{
 const h=await FakeChatGPT.start();
 try {
  await h.archive.locator('#consent-check').check();await h.archive.locator('#enable-consent').click();await h.archive.locator('[data-view="settings"]').click();await h.archive.locator('[data-view="archive"]').click();
  const c=conversation('fake-legacy-browser-'+arrival);const seed=await h.open(c,{arrival:'manual'});
  await eventually(async()=>(await h.state()).records.length===3);await seed.close();
  const before=(await h.state()).records;
  // Seed synthetic old storage only, never read a user's real profile/archive.
  await h.archive.evaluate(async()=>{
   const {ArchiveRepository,recordIndex}=await import('../core/idb-repository.js');const repo=new ArchiveRepository(chrome.storage.local,{ia:true,smartFilter:true,thoughtLibrary:true});await repo.open();
   await repo.transaction(true,async t=>{for(const ix of await t.all('recordIndex')){const row=await t.get('records',ix.id);for(const field of ['sourceKey','sourceMessageId','sourceSentAt'])delete row.value[field];await t.put('records',row);await t.put('recordIndex',recordIndex(row.value,ix.sequence));}});await repo.close();
  });
  await h.restartWorker();
  const page=await h.open(c,{arrival:'empty'});await h.ready(page);await watchBatches(page);
  if(arrival==='metadata-first')await batch(h,page,c,h.response(c),1);
  await h.render(page,c);
  await eventually(async()=>(await h.state()).records.every(r=>r.sourceMessageId&&r.sourceKey));
  if(arrival==='identity-first'){
   assert.ok((await h.state()).records.every(r=>r.sourceSentAt==null));
   await batch(h,page,c,h.response(c),1);
  }
  await eventually(async()=>(await h.state()).records.every(r=>r.timeConfidence==='high'));
  const after=(await h.state()).records;assert.equal(after.length,3);
  for(let i=0;i<3;i++){
   assert.equal(after[i].sourceMessageId,c.messages[i].id);assert.equal(after[i].sourceSentAt,new Date((c.base+i*60)*1000).toISOString());
   for(const k of ['id','originalText','capturedAt','conversationOrder','contentHash','dedupeKey'])assert.equal(after[i][k],before[i][k]);
  }
  await h.restartWorker();assert.deepEqual((await h.state()).records,after);
  assert.equal(h.historyRequests,1);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});
async function batch(h,page,c,data,count) {
 await h.respond(page,c,data);
 await page.waitForFunction(count=>window.fakeAcceptedHistory.length===count,count);
}
function assertTwenty(records,c,before=[]) {
 const rows=records.filter(r=>r.chatId===c.id);assert.equal(rows.length,20);
 for(const m of c.messages){
  const r=rows.find(r=>r.sourceMessageId===m.id);assert.ok(r);
  assert.equal(r.sourceSentAt,new Date(m.sentAt*1000).toISOString());
  assert.equal(r.timeConfidence,'high');assert.equal(r.timeSource,'chatgpt_response_create_time');
  assert.equal(r.originalText,m.text);assert.notEqual(r.capturedAt,r.sourceSentAt);
  const old=before.find(old=>old.id===r.id);
  if(old)for(const k of ['id','originalText','capturedAt','contentHash','sourceKey','conversationOrder'])assert.equal(r[k],old[k]);
 }
}

test('older 5+15: persisted 20 unknown records enrich in two batches across worker suspend/wake', {timeout:45000},async()=>{
 const h=await FakeChatGPT.start();
 try {
  await h.archive.locator('#consent-check').check();await h.archive.locator('#enable-consent').click();await h.archive.locator('[data-view="settings"]').click();await h.archive.locator('[data-view="archive"]').click();
  const {c,first,second}=olderHistory();const page=await h.open(c,{arrival:'manual'});await h.ready(page);await watchBatches(page);
  await eventually(async()=>(await h.state()).records.length===20);
  const before=(await h.state()).records;assert.ok(before.every(r=>r.sourceSentAt===null&&r.timeConfidence==='unknown'));
  await batch(h,page,c,first,1);
  await eventually(async()=>(await h.state()).records.filter(r=>r.timeConfidence==='high').length===5);
  const midway=(await h.state()).records;
  for(let i=0;i<20;i++)assert.equal(midway.find(r=>r.sourceMessageId===c.messages[i].id).sourceSentAt,i<15?null:new Date(c.messages[i].sentAt*1000).toISOString());
  // Late metadata must work from retained canonical proofs, without a fresh body capture.
  await page.evaluate(()=>document.getElementById('messages').replaceChildren());await h.restartWorker();
  await batch(h,page,c,second,2);
  await eventually(async()=>(await h.state()).records.filter(r=>r.timeConfidence==='high').length===20);
  const after=(await h.state()).records;assertTwenty(after,c,before);
  await batch(h,page,c,first,3);await batch(h,page,c,second,4);await h.restartWorker();
  assert.deepEqual((await h.state()).records,after);
  assert.deepEqual(await page.evaluate(()=>window.fakeAcceptedHistory),[5,15,5,15]);
  assert.equal(h.historyRequests,4);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('older 5+15: both metadata batches merge before any DOM and survive worker wake', {timeout:45000},async()=>{
 const h=await FakeChatGPT.start();
 try {
  await h.archive.locator('#consent-check').check();await h.archive.locator('#enable-consent').click();await h.archive.locator('[data-view="settings"]').click();await h.archive.locator('[data-view="archive"]').click();
  const {c,first,second}=olderHistory('fake-older-metadata-first');const page=await h.open(c,{arrival:'empty'});await h.ready(page);await watchBatches(page);
  await batch(h,page,c,first,1);await batch(h,page,c,second,2);
  assert.equal((await h.state()).records.length,0);await h.restartWorker();
  await h.render(page,c);
  await eventually(async()=>{const r=(await h.state()).records;return r.length===20&&r.every(r=>r.timeConfidence==='high');});
  assertTwenty((await h.state()).records,c);
  for(const r of (await h.state()).records)assert.equal(r.conversationOrder,c.messages.findIndex(m=>m.id===r.sourceMessageId)+1);
  assert.equal(h.historyRequests,2);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('older 5+15: lazy older DOM then late metadata, SPA isolation and return to the same conversation', {timeout:60000},async()=>{
 const h=await FakeChatGPT.start();
 try {
  await h.archive.locator('#consent-check').check();await h.archive.locator('#enable-consent').click();await h.archive.locator('[data-view="settings"]').click();await h.archive.locator('[data-view="archive"]').click();
  const {c,recent,first,second}=olderHistory('fake-older-lazy');const page=await h.open(recent,{arrival:'manual'});await h.ready(page);await watchBatches(page);
  await eventually(async()=>(await h.state()).records.length===5);await batch(h,page,c,first,1);
  await eventually(async()=>(await h.state()).records.every(r=>r.timeConfidence==='high'));
  const recentBefore=(await h.state()).records;
  await h.render(page,c);await eventually(async()=>(await h.state()).records.length===20);
  const before=(await h.state()).records;assert.equal(before.filter(r=>r.sourceSentAt===null).length,15);
  await batch(h,page,c,second,2);
  await eventually(async()=>(await h.state()).records.every(r=>r.timeConfidence==='high'));
  assertTwenty((await h.state()).records,c,before);
  for(const old of recentBefore)assert.deepEqual((await h.state()).records.find(r=>r.id===old.id),old);
  const completed=(await h.state()).records;
  const other=conversation('fake-older-spa-other',8640000);await h.spa(page,other);await h.ready(page);
  await eventually(async()=>(await h.state()).records.length===23);
  await batch(h,page,c,second,3); // Current document must reject metadata from the previous chat.
  await h.respond(page,other);await eventually(async()=>(await h.state()).records.filter(r=>r.chatId===other.id).every(r=>r.timeConfidence==='high'));
  assert.deepEqual((await h.state()).records.filter(r=>r.chatId===c.id),completed);
  await h.spa(page,c);await h.ready(page);await batch(h,page,c,first,5);await batch(h,page,c,second,6);await h.restartWorker();
  assert.deepEqual((await h.state()).records.filter(r=>r.chatId===c.id),completed);
  assert.equal((await h.state()).records.length,23);assert.equal(h.historyRequests,6);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

// Browser routes contain synthetic data only. This test does not open a real account.
test('backfill lifecycle: late metadata enriches persisted sources without rereading vanished DOM', {timeout:45000}, async()=>{
 const h=await FakeChatGPT.start();
 try {
  await h.archive.locator('#consent-check').check();await h.archive.locator('#enable-consent').click();await h.archive.locator('[data-view="settings"]').click();await h.archive.locator('[data-view="archive"]').click();
  const c=conversation('fake-backfill-vanished');const page=await h.open(c,{arrival:'manual'});
  await eventually(async()=>(await h.state()).records.length===3);
  const before=(await h.state()).records;assert.ok(before.every(r=>r.sourceSentAt===null));
  for(const r of before){assert.equal(r.chatId,c.id);assert.ok(r.sourceMessageId);assert.match(r.sourceKey,/^[a-f0-9]{64}$/);}
  await page.evaluate(()=>document.getElementById('messages').replaceChildren());
  await h.restartWorker();
  await h.respond(page,c);
  await eventually(async()=>(await h.state()).records.every(r=>r.timeConfidence==='high'),'saved records must enrich after their canonical DOM disappears');
  const after=(await h.state()).records;
  assert.equal(after.length,before.length);
  for(let i=0;i<after.length;i++){
   assert.equal(after[i].sourceSentAt,new Date((c.base+i*60)*1000).toISOString());
   for(const k of ['id','originalText','capturedAt','contentHash','sourceKey'])assert.equal(after[i][k],before[i][k]);
  }
  assert.equal(h.historyRequests,1);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);
 }finally{await h.close();}
});

test('backfill lifecycle: existing diagnostic-compatible wrapped messages enter the formal path', {timeout:30000},async()=>{
 const h=await FakeChatGPT.start();
 try {
  await h.archive.locator('#consent-check').check();await h.archive.locator('#enable-consent').click();await h.archive.locator('[data-view="settings"]').click();await h.archive.locator('[data-view="archive"]').click();
  const c=conversation('fake-backfill-wrapped');const page=await h.open(c,{arrival:'manual'});
  await eventually(async()=>(await h.state()).records.length===3);
  const before=(await h.state()).records;
  const data=h.response(c);data.messages=Object.values(data.mapping);delete data.mapping;
  await h.respond(page,c,data);
  await eventually(async()=>(await h.state()).records.every(r=>r.timeConfidence==='high'),'exact user metadata in a known wrapped collection must reach the archive');
  assert.deepEqual((await h.state()).records.map(r=>r.capturedAt),before.map(r=>r.capturedAt));
 }finally{await h.close();}
});

test('backfill lifecycle: metadata first survives worker wake and captures with the archive page closed', {timeout:35000},async()=>{
 const h=await FakeChatGPT.start();
 try {
  await h.archive.locator('#consent-check').check();await h.archive.locator('#enable-consent').click();await h.archive.locator('[data-view="settings"]').click();await h.archive.locator('[data-view="archive"]').click();
  const c=conversation('fake-backfill-no-ui');const page=await h.open(c,{arrival:'empty'});await h.ready(page);await h.respond(page,c);
  assert.equal((await h.state()).records.length,0);await h.restartWorker();await h.archive.close();
  const state=async()=>h.context.serviceWorkers().find(w=>w.url().includes(h.extensionId)).evaluate(async()=> {const db=await new Promise(resolve=>{const r=indexedDB.open('paia-archive');r.onsuccess=()=>resolve(r.result);});try{return await new Promise(resolve=>{const r=db.transaction('records').objectStore('records').getAll();r.onsuccess=()=>resolve({records:r.result.map(row=>row.value)});});}finally{db.close();}});
  await h.render(page,c);await eventually(async()=>{const r=(await state()).records;return r.length===3&&r.every(x=>x.timeConfidence==='high');},'metadata before DOM must survive worker wake without archive UI');
  const before=(await state()).records;await h.respond(page,c);
  for(const r of before){assert.equal(r.sourceSentAt,new Date((c.base+(r.pageOrder-1)*60)*1000).toISOString());assert.equal(r.conversationOrder,r.pageOrder);assert.equal(r.originalText,c.messages[r.pageOrder-1].text);}
  assert.deepEqual((await state()).records,before);assert.equal(h.historyRequests,2);assert.equal(h.extensionNetworkRequests,0);
 }finally{await h.close();}
});
