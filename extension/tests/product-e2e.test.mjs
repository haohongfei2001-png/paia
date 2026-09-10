import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT, conversation, eventually, pause} from './harness/fake-chatgpt.mjs';

test('Fake ChatGPT full product workflow in an isolated offline browser', {timeout:150000}, async t=>{
 const h=await FakeChatGPT.start();
 try {
  const a=conversation('fake-product-a');const page=await h.open(a,{arrival:'metadata-first'});
  let originals;
  await t.test('A privacy: default off, assistant, editor and unsent draft are never archived',async()=>{
   await pause(2300);assert.equal((await h.state()).records.length,0);assert.equal(h.historyRequests,0);
   await h.archive.locator('#consent-check').check();await h.archive.locator('#enable-consent').click();await h.archive.locator('[data-view="settings"]').click();await h.archive.locator('[data-view="archive"]').click();
   await eventually(async()=>{const r=(await h.state()).records;return r.length===3&&r.every(x=>x.timeConfidence==='high');});
   originals=(await h.state()).records;
   assert.equal(originals[0].originalText,a.messages[0].text);
   assert.equal(originals.filter(r=>r.originalText===a.messages[1].text).length,2);
   assert.ok(originals.every(r=>r.sourceSentAt.startsWith('2021-')&&r.capturedAt!==r.sourceSentAt));
   assert.equal(JSON.stringify(originals).includes('FAKE_ASSISTANT'),false);assert.equal(JSON.stringify(originals).includes('FAKE_DRAFT'),false);assert.equal(JSON.stringify(originals).includes('FAKE_EDITOR'),false);
  });
  await t.test('B dedupe: repeats, natural rescans and reload do not duplicate or replace first capturedAt',async()=>{
   await h.respond(page,a);await h.respond(page,a);await page.reload();await pause(4500);
   assert.deepEqual((await h.state()).records,originals);
  });
  await t.test('B versions: edit mode is excluded; a new source text version retains the previous immutable snapshot',async()=>{
   await h.edit(page,a.messages[0].id,'FAKE_EDITOR_NEW_TEXT',true);await pause(2300);assert.equal((await h.state()).records.length,3);
   await h.edit(page,a.messages[0].id,'虚构编辑后\n独立快照',false);
   await eventually(async()=>(await h.state()).records.length===4);
   const records=(await h.state()).records;assert.deepEqual(records.slice(0,3),originals);assert.equal(records[3].previousVersionId,originals[0].id);
  });
  const b=conversation('fake-product-b',86400);
  let pageB;
  await t.test('C/D historical DOM first: captures without scrolling, shows unknown, then enriches and isolates two live conversations',async()=>{
   pageB=await h.open(b,{arrival:'manual'});
   await eventually(async()=>(await h.state()).records.filter(r=>r.chatId===b.id).length===3);
   const before=(await h.state()).records.filter(r=>r.chatId===b.id);assert.ok(before.every(r=>r.sourceSentAt===null));
   await eventually(async()=>(await h.archive.locator('#document-list').textContent()).includes('发送时间待补全'));
   await h.respond(pageB,b);
   await eventually(async()=>(await h.state()).records.filter(r=>r.chatId===b.id).every(r=>r.timeConfidence==='high'));
   const after=(await h.state()).records.filter(r=>r.chatId===b.id);assert.deepEqual(after.map(r=>r.capturedAt),before.map(r=>r.capturedAt));
   assert.deepEqual((await h.state()).records.slice(0,3),originals);
  });
  await t.test('D metadata first: a response cannot create records before canonical DOM arrives',async()=>{
   const c=conversation('fake-product-c',172800);const p=await h.open(c,{arrival:'empty'});
   await h.ready(p);await h.respond(p,c);await pause(600);
   assert.equal((await h.state()).records.filter(r=>r.chatId===c.id).length,0);
   await h.render(p,c);await eventually(async()=>{const rows=(await h.state()).records.filter(r=>r.chatId===c.id);return rows.length===3&&rows.every(r=>r.timeConfidence==='high');});
   await p.close();
  });
  await t.test('C/E SPA route identity: foreign conversation metadata with exact current message IDs is rejected',async()=>{
   const c=conversation('fake-product-spa',259200);
   await h.spa(pageB,c);await h.ready(pageB);const wrong=h.response(c);wrong.conversation_id=b.id;await h.respond(pageB,c,wrong);
   await eventually(async()=>(await h.state()).records.filter(r=>r.chatId===c.id).length===3);
   assert.ok((await h.state()).records.filter(r=>r.chatId===c.id).every(r=>r.sourceSentAt===null));
   await h.respond(pageB,c);await eventually(async()=>(await h.state()).records.filter(r=>r.chatId===c.id).every(r=>r.timeConfidence==='high'));
  });
  await t.test('D service worker suspend/wake: stopped/running events and a fresh heap, archive identity and capturedAt persist',async()=>{
   const before=(await h.state()).records;await h.restartWorker();assert.deepEqual((await h.state()).records,before);
   await h.respond(page,a);await pause(2300);assert.deepEqual((await h.state()).records,before);
  });
  await t.test('E anomalies: invalid contracts fail closed; renamed structural collection retains exact history',async()=>{
   const cases=[
    ['missing',v=>delete v.mapping.first.message.create_time],['invalid',v=>v.mapping.first.message.create_time='FAKE_INVALID_TIME'],
    ['future',v=>v.mapping.first.message.create_time=4102444800],['order',v=>{v.mapping.first.message.create_time+=9999;v.mapping.first.message.update_time+=9999;}],
    ['update',v=>v.mapping.first.message.update_time=v.mapping.first.message.create_time-1],
    ['schema',v=>{v.changed_mapping=v.mapping;delete v.mapping;}],['malformed',()=>'{'],
    ['schema-no-identity',v=>{v.changed_mapping=v.mapping;delete v.mapping;delete v.conversation_id;}],
    ['conflict',v=>{v.mapping.duplicate={message:{...v.mapping.first.message,create_time:v.mapping.first.message.create_time+0.5}};}]
   ];
   const pages=await Promise.all(cases.map(async([name,mutate])=>{
    const c=conversation('fake-anomaly-'+name,345600);const p=await h.open(c,{arrival:'manual'});await h.ready(p);
    const value=h.response(c);const changed=mutate(value);await h.respond(p,c,typeof changed==='string'?changed:value);
    return {p,c};
   }));
   await eventually(async()=>{const rows=(await h.state()).records;return pages.every(({c})=>rows.filter(r=>r.chatId===c.id).length===3);});
   await pause(2400);
   const rows=(await h.state()).records;
   for(const {c} of pages){
    const records=rows.filter(r=>r.chatId===c.id);
    if(c.id==='fake-anomaly-schema')for(const r of records){assert.equal(r.sourceSentAt,new Date((c.base+(r.pageOrder-1)*60)*1000).toISOString());assert.equal(r.timeConfidence,'high');}
    else {const r=records.find(r=>r.sourceMessageId===c.messages[0].id);assert.equal(r.sourceSentAt,null,c.id);assert.equal(r.timeConfidence,'unknown');}
   }
   for(const {p} of pages)await p.close();
  });
  await t.test('E durable conflict: later conflict preserves earlier high and persists the block after worker wake',async()=>{
   const bad=h.response(a);bad.mapping.first.message.create_time+=0.125;await h.respond(page,a,bad);
   await eventually(async()=>h.state().then(s=>s.sourceTimes[originals[0].sourceKey]?.blocked===true));
   await h.restartWorker();await page.reload();await pause(4500);
   const records=(await h.state()).records;assert.ok(records.filter(r=>r.chatId===a.id&&r.sourceMessageId===a.messages[0].id).every(r=>r.sourceSentAt===originals[0].sourceSentAt&&r.timeConfidence==='high'));
   assert.equal(records.find(r=>r.id===originals[0].id).capturedAt,originals[0].capturedAt);
  });
  await t.test('F UI: conversation dates/search, immutable Library editing, notes and Original Archive exports',async()=>{
   const known=(await h.state()).records.find(r=>r.chatId===b.id);await h.archive.locator('[data-view="library"]').click();await h.archive.locator('#search').fill(b.title);await eventually(async()=>await h.archive.locator('.search-input').count()===3);await h.archive.locator('.search-input').first().click();const row=h.archive.locator(`[data-record-id="${known.id}"]`);await row.locator('.library-prose').fill('虚构整理版');await eventually(async()=>(await h.state()).library.blocks.find(x=>x.sourceRecordId===known.id).libraryText==='虚构整理版');assert.equal((await h.state()).records.find(r=>r.id===known.id).originalText,known.originalText);
   await row.locator('.library-prose').click({button:'right'});await h.archive.getByRole('menuitem',{name:'查看来源 / 记录信息…'}).click();await h.archive.getByRole('textbox',{name:'用户备注'}).fill('虚构备注检索词');await h.archive.locator('#close-info').click();await eventually(async()=>(await h.state()).library.blocks.find(x=>x.sourceRecordId===known.id).note==='虚构备注检索词');await h.archive.locator('#back').click();await h.archive.locator('#search').fill('虚构备注检索词');await eventually(async()=>await h.archive.locator('.conversation-document').count()===1);
   await h.archive.locator('[data-view="settings"]').click();await h.archive.locator('[data-view="archive"]').click();await h.archive.locator('#search').fill(b.title);const json=JSON.parse(await h.download('json'));assert.equal(json.records.length,3);assert.equal(json.records.find(r=>r.id===known.id).sourceSentAt,known.sourceSentAt);assert.equal(json.records.find(r=>r.id===known.id).capturedAt,known.capturedAt);const md=await h.download('markdown');assert.match(md,/chatgpt_response_create_time/);assert.match(md,/发送时间:/);assert.match(md,/捕获时间:/);
  });
  await t.test('G privacy: all requests are local fixtures, archive has no assistant/draft content, manifest scope unchanged',async()=>{
   const text=JSON.stringify((await h.state()).records);for(const sentinel of ['FAKE_ASSISTANT','FAKE_DRAFT','FAKE_EDITOR_NEW_TEXT','FAKE_INVALID_TIME'])assert.equal(text.includes(sentinel),false);
   assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.ok(h.historyRequests>0);assert.deepEqual(h.errors,[]);
   assert.deepEqual(h.manifest.permissions,['storage']);assert.deepEqual(h.manifest.host_permissions,['https://api.deepseek.com/*']);
  });
 }finally{await h.close();}
});
