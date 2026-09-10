import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,conversation,eventually,pause} from './harness/fake-chatgpt.mjs';
async function scenario(kind){
 const h=await FakeChatGPT.start();try{
  await h.archive.locator('#consent-check').check();await h.archive.locator('#enable-consent').click();await h.archive.locator('[data-view="settings"]').click();await h.archive.locator('[data-view="archive"]').click();
  const c=conversation('fake-large-history-chat');let data=h.response(c);
  // Artificial size only; no real response or private content is used here.
  data.mapping.assistant.message.content.parts=['SYNTHETIC_ASSISTANT_PADDING_'.repeat(kind==='over-limit'?90000:28000)];
  if(kind==='messages'){
   const messages=Object.values(data.mapping).map(n=>n.message).filter(Boolean);
   for(let i=0;i<70;i++)messages.unshift({id:'fake-padding-assistant-'+i,author:{role:'assistant'},create_time:c.base-60,content:{parts:['SYNTHETIC_ASSISTANT']}});
   data={conversation_id:c.id,messages};
  }
  const body=JSON.stringify(data);assert.ok(body.length>524288);
  const path=kind==='generic'?'/backend-api/fixture-large':`/backend-api/conversations/${kind==='wrong-chat'?'fake-different-chat':c.id}`;
  let requests=0;
  await h.context.route('https://chatgpt.com'+path,route=>{requests++;return route.fulfill({contentType:'application/json',body});});
  const page=await h.open(c,{arrival:'manual'});await h.ready(page);
  await eventually(async()=>(await h.state()).records.length===3);
  const before=(await h.state()).records;
  await page.evaluate(path=>fetch(path).then(r=>r.text()).then(()=>undefined),path);
  if(['exact','messages'].includes(kind)){
   await eventually(async()=>(await h.state()).records.every(r=>r.timeConfidence==='high'),'large exact history must enrich source time');
   const after=(await h.state()).records;
   for(const r of after){const old=before.find(x=>x.id===r.id);assert.equal(r.originalText,old.originalText);assert.equal(r.capturedAt,old.capturedAt);assert.equal(r.contentHash,old.contentHash);assert.equal(r.sourceSentAt,new Date((c.base+(r.pageOrder-1)*60)*1000).toISOString());}
   await page.evaluate(path=>fetch(path).then(r=>r.text()).then(()=>undefined),path);await pause(1000);assert.deepEqual((await h.state()).records,after);
   assert.equal(requests,2);
  }else{
   await pause(1200);assert.deepEqual((await h.state()).records,before);assert.ok(before.every(r=>r.sourceSentAt===null));assert.equal(requests,1);
  }
  assert.equal(h.extensionNetworkRequests,0);assert.equal(h.externalRequests,0);
 }finally{await h.close();}
}
test('exact plural conversation response above 512 KiB safely enriches existing records',{timeout:40000},()=>scenario('exact'));
for(const kind of ['generic','wrong-chat','over-limit'])test(`large response budget stays closed: ${kind}`,{timeout:25000},()=>scenario(kind));

test('large plural history messages array with more than 64 mixed entries reaches the formal store',{timeout:40000},()=>scenario('messages'));
