import test from 'node:test';
import assert from 'node:assert/strict';
import {ArchiveStore,initialState} from '../core/store.js';
import {ADAPTER_VERSION,STORAGE_KEY} from '../core/constants.js';
import '../core/history-time.js';
import {olderHistory} from './fixtures/older-history.mjs';
const chat={id:'fake-enrichment-chat',url:'https://chatgpt.com/c/fake-enrichment-chat',title:'虚构回填聊天'};
const id='fake-enrichment-user',at='2026-09-05T01:02:03.000Z',time=1609459200;
const good={state:'valid',createTime:time,updateTime:null};
async function setup(saved) {
 let disk=saved?structuredClone(saved):{},fail=false;
 const storage={async get(){return structuredClone(disk);},async set(v){if(fail)throw Error('synthetic storage error');disk=structuredClone(v);},async getBytesInUse(){return 0;}};
 const store=new ArchiveStore(storage,{clock:()=>at,uuid:()=> 'fake-record-001'});
 if(!saved)await store.consent(true);const epoch=(await store.status()).epoch;
 const capture={epoch,adapterVersion:ADAPTER_VERSION,chat,messages:[{sourceMessageId:id,pageOrder:1,originalText:'虚构不可变原文'}]};
 const enrich={epoch,adapterVersion:ADAPTER_VERSION,chat:{id:chat.id,url:chat.url},messages:[{sourceMessageId:id,pageOrder:1,sourceTime:good}]};
 return {store,capture,enrich,storage,disk:()=>structuredClone(disk),fail:v=>fail=v};
}
test('enrichment: record first -> metadata later upgrades unknown without original body in the request',async()=>{
 const f=await setup();await f.store.capture(f.capture);const before=(await f.store.snapshot()).records[0];
 assert.equal(before.sourceSentAt,null);await f.store.enrich(f.enrich);const after=(await f.store.snapshot()).records[0];
 assert.equal(after.timeConfidence,'high');assert.equal(after.sourceSentAt,new Date(time*1000).toISOString());
 for(const k of ['originalText','capturedAt','contentHash','id'])assert.equal(after[k],before[k]);
});
test('enrichment: high time survives absent, invalid and lower-confidence metadata',async()=>{
 const f=await setup();f.capture.messages[0].sourceTime=good;await f.store.capture(f.capture);const before=(await f.store.snapshot()).records;
 for(const sourceTime of [null,{state:'unknown'},{state:'blocked',reason:'MISSING'},{state:'blocked',reason:'INVALID'},{state:'blocked',reason:'LIMIT'},{state:'valid',createTime:time,updateTime:'FAKE_INVALID_UPDATE'}]) {
  f.enrich.messages[0].sourceTime=sourceTime;await f.store.enrich(f.enrich);assert.deepEqual((await f.store.snapshot()).records,before);
 }
});
test('enrichment: unknown evidence can improve later; genuine conflicting evidence still revokes',async()=>{
 const m=new globalThis.HistoryTime.Model();m.reset(chat.id);
 const row=create=>({contract:'chatgpt-history-user-v1',rows:[{chat:chat.id,id,create,update:{state:'missing',value:null}}]});
 m.ingest(row({state:'missing',value:null}));m.ingest(row({state:'value',value:time}));assert.equal(m.match([id]).get(id).state,'valid');
 m.ingest(row({state:'invalid',value:null}));assert.equal(m.match([id]).get(id).state,'valid');
 m.ingest(row({state:'value',value:time+1}));assert.equal(m.match([id]).get(id).reason,'CONFLICT');
});
test('enrichment: unknown conversation order and missing identity fields recover only from exact retained keys',async()=>{
 const f=await setup();await f.store.capture(f.capture);const saved=f.disk();const r=saved[STORAGE_KEY].records[0];
 r.conversationOrder=null;delete r.sourceMessageId;delete r.chatId;
 const resumed=await setup(saved);await resumed.store.enrich(resumed.enrich);const after=(await resumed.store.snapshot()).records[0];
 assert.equal(after.conversationOrder,1);assert.equal(after.sourceMessageId,id);assert.equal(after.chatId,chat.id);assert.equal(after.capturedAt,at);assert.equal(after.originalText,r.originalText);
});
test('enrichment: mismatched chat or message identity never changes existing records or creates new ones',async()=>{
 const f=await setup();await f.store.capture(f.capture);const before=(await f.store.snapshot()).records;
 for(const request of [{...f.enrich,messages:[{...f.enrich.messages[0],sourceMessageId:'fake-other-user'}]},{...f.enrich,chat:{id:'fake-other-chat',url:'https://chatgpt.com/c/fake-other-chat'}}])await f.store.enrich(request);
 assert.deepEqual((await f.store.snapshot()).records,before);
});
test('enrichment: no identity can be invented from identical original text, title or captured time',async()=>{
 const f=await setup();await f.store.capture(f.capture);const saved=f.disk(),r=saved[STORAGE_KEY].records[0];delete r.sourceKey;delete r.sourceMessageId;delete r.dedupeKey;
 const resumed=await setup(saved);await resumed.store.enrich(resumed.enrich);assert.equal((await resumed.store.snapshot()).records[0].sourceSentAt,null);
});
test('enrichment: conflicting persisted identity must not be repaired by guessing',async()=>{
 const f=await setup();await f.store.capture(f.capture);const saved=f.disk();saved[STORAGE_KEY].records[0].sourceMessageId='fake-conflicting-id';
 const resumed=await setup(saved);await resumed.store.enrich(resumed.enrich);assert.equal((await resumed.store.snapshot()).records[0].sourceSentAt,null);
});
test('enrichment: rejects body, role, stale epoch and paused requests; failed commit is atomic and retriable',async()=>{
 const f=await setup();await f.store.capture(f.capture);
 for(const extra of [{originalText:'FAKE_OVERWRITE'},{role:'assistant'}])await assert.rejects(f.store.enrich({...f.enrich,messages:[{...f.enrich.messages[0],...extra}]}));
 const before=f.disk();f.fail(true);await assert.rejects(f.store.enrich(f.enrich));assert.deepEqual(f.disk(),before);
 f.fail(false);await f.store.enrich(f.enrich);assert.equal((await f.store.snapshot()).records[0].timeConfidence,'high');
 await f.store.setEnabled(false);await assert.rejects(f.store.enrich(f.enrich),{code:'PAUSED'});
 await f.store.setEnabled(true);await assert.rejects(f.store.enrich(f.enrich),{code:'STALE_CAPTURE'});
});
test('enrichment: worker reconstruction and concurrent duplicate backfills retain one immutable record',async()=>{
 const f=await setup();await f.store.capture(f.capture);const resumed=await setup(f.disk());
 await Promise.all([resumed.store.enrich(resumed.enrich),resumed.store.enrich(resumed.enrich)]);
 const records=(await resumed.store.snapshot()).records;assert.equal(records.length,1);assert.equal(records[0].timeConfidence,'high');assert.equal(records[0].capturedAt,at);
});
test('enrichment: deleted source tombstones cannot be resurrected by metadata',async()=>{
 const f=await setup();await f.store.capture(f.capture);const r=(await f.store.snapshot()).records[0];
 await f.store.trash(r.id);await f.store.purge(r.id);await f.store.enrich(f.enrich);
 assert.equal((await f.store.snapshot()).records.length,0);assert.deepEqual(f.disk()[STORAGE_KEY].sourceTimes,{});
});

test('enrichment 5+15: legacy exact identities recover in batches, absent or contradictory identities stay unknown',async()=>{
 const f=await setup(),{c}=olderHistory('fake-legacy-batches');
 const capture={...f.capture,chat:{id:c.id,url:'https://chatgpt.com/c/'+c.id,title:c.title},messages:c.messages.map((m,i)=>({sourceMessageId:m.id,pageOrder:i+1,originalText:m.text}))};
 let sequence=0;f.store.uuid=()=>`fake-legacy-record-${++sequence}`;await f.store.capture(capture);
 const saved=f.disk();saved[STORAGE_KEY].schemaVersion=1;
 for(const [i,r] of saved[STORAGE_KEY].records.entries()){
  delete r.conversationOrder;
  if(i%2===0){delete r.chatId;delete r.sourceMessageId;}else delete r.sourceKey;
 }
 // Two extra synthetic legacy records cannot be linked by matching body/title/time.
 const missing={...saved[STORAGE_KEY].records[0],id:'fake-no-exact-key'};delete missing.sourceKey;
 const conflicting={...saved[STORAGE_KEY].records[0],id:'fake-contradictory-key',sourceMessageId:'fake-wrong-message-id'};
 saved[STORAGE_KEY].records.push(missing,conflicting);
 const resumed=await setup(saved);const before=(await resumed.store.snapshot()).records;
 const request=(start,end)=>({...resumed.enrich,chat:{id:c.id,url:capture.chat.url},messages:c.messages.slice(start,end).map((m,i)=>({sourceMessageId:m.id,pageOrder:start+i+1,sourceTime:{state:'valid',createTime:m.sentAt,updateTime:null}}))});
 await resumed.store.enrich(request(15,20));assert.equal((await resumed.store.snapshot()).records.filter(r=>r.timeConfidence==='high').length,5);
 await resumed.store.enrich(request(0,15));const after=(await resumed.store.snapshot()).records;
 assert.equal(after.filter(r=>r.timeConfidence==='high').length,20);assert.equal(after.length,22);
 for(let i=0;i<20;i++){
  const r=after[i];assert.equal(r.chatId,c.id);assert.equal(r.sourceMessageId,c.messages[i].id);assert.match(r.sourceKey,/^[a-f0-9]{64}$/);
  assert.equal(r.sourceSentAt,new Date(c.messages[i].sentAt*1000).toISOString());assert.equal(r.conversationOrder,i+1);
 }
 for(let i=0;i<after.length;i++)for(const key of ['originalText','capturedAt','id','contentHash'])assert.equal(after[i][key],before[i][key]);
 assert.deepEqual(after.slice(20),before.slice(20));
 // A conflicting number with invalid update evidence is lower quality, not a valid contradiction.
 const low=request(0,20);for(const m of low.messages){m.sourceTime.createTime+=864000;m.sourceTime.updateTime='FAKE_INVALID';}
 await resumed.store.enrich(low);assert.deepEqual((await resumed.store.snapshot()).records,after);
 const awake=await setup(resumed.disk());await awake.store.enrich(request(15,20));await awake.store.enrich(request(0,15));
 assert.deepEqual((await awake.store.snapshot()).records,after);
});

test('history model 5+15: merge retains all exact timestamps before canonical matching',()=>{
 const {c,first,second}=olderHistory('fake-model-batches');const model=new globalThis.HistoryTime.Model();model.reset(c.id);
 const project=batch=>({contract:'chatgpt-history-user-v1',rows:batch.messages.map(m=>({chat:batch.conversation_id,id:m.id,create:{state:'value',value:m.create_time},update:{state:'value',value:m.update_time}}))});
 model.ingest(project(first));assert.equal(model.rows.size,5);model.ingest(project(second));assert.equal(model.rows.size,20);
 const matches=model.match(c.messages.map(m=>m.id));assert.equal(matches.size,20);
 for(const m of c.messages)assert.equal(matches.get(m.id).createTime,m.sentAt);
});

test('legacy A/B/E: dedupe repairs missing source identity and immediately applies cached exact time',async()=>{
 for(const field of ['sourceMessageId','sourceKey','both'])for(const shape of ['missing',null,'unknown']){
  const f=await setup();await f.store.capture(f.capture);const saved=f.disk(),old=saved[STORAGE_KEY].records[0];
  if(field==='both'){delete old.sourceKey;delete old.sourceMessageId;}else delete old[field];
  if(shape==='missing')delete old.sourceSentAt;else old.sourceSentAt=shape;
  const resumed=await setup(saved);resumed.capture.messages[0].sourceTime=good;
  const result=await resumed.store.capture(resumed.capture),rows=(await resumed.store.snapshot()).records;
  assert.equal(result.added,0);assert.equal(rows.length,1);assert.equal(rows[0].sourceMessageId,id);assert.match(rows[0].sourceKey,/^[a-f0-9]{64}$/);
  assert.equal(rows[0].sourceSentAt,new Date(time*1000).toISOString());assert.equal(rows[0].timeConfidence,'high');assert.equal(rows[0].timeSource,'chatgpt_response_create_time');
  for(const k of ['originalText','capturedAt','id','contentHash','dedupeKey','conversationOrder'])assert.equal(rows[0][k],old[k]);
 }
});
test('legacy D: retained source-bound dedupe proof repairs identity before metadata and later enriches without body',async()=>{
 const f=await setup();await f.store.capture(f.capture);const saved=f.disk(),old=saved[STORAGE_KEY].records[0];delete old.sourceKey;delete old.sourceMessageId;
 const resumed=await setup(saved);const noTime=structuredClone(resumed.enrich);delete noTime.messages[0].sourceTime;
 await resumed.store.enrich(noTime);let r=(await resumed.store.snapshot()).records[0];assert.equal(r.sourceMessageId,id);assert.equal(r.sourceSentAt,null);
 await resumed.store.enrich(resumed.enrich);r=(await resumed.store.snapshot()).records[0];assert.equal(r.timeConfidence,'high');assert.equal(r.originalText,old.originalText);assert.equal(r.capturedAt,old.capturedAt);
});
test('legacy C: order alone, even currently unique, and ambiguous order never prove historical identity',async()=>{
 for(const count of [1,2]){
  const f=await setup();await f.store.capture(f.capture);const saved=f.disk(),old=saved[STORAGE_KEY].records[0];
  delete old.sourceKey;delete old.sourceMessageId;delete old.dedupeKey;
  if(count===2)saved[STORAGE_KEY].records.push({...old,id:'fake-ambiguous-order'});
  const resumed=await setup(saved),before=(await resumed.store.snapshot()).records;await resumed.store.enrich(resumed.enrich);
  assert.deepEqual((await resumed.store.snapshot()).records,before);
 }
});
test('legacy proof: forged hash or contradictory identity cannot use dedupe as a repair bypass',async()=>{
 for(const change of [{contentHash:'a'.repeat(64)},{chatId:'fake-conflicting-chat'},{sourceMessageId:'fake-conflicting-user'}]){
  const f=await setup();await f.store.capture(f.capture);const saved=f.disk(),old=saved[STORAGE_KEY].records[0];delete old.sourceKey;delete old.sourceMessageId;Object.assign(old,change);
  const resumed=await setup(saved),before=(await resumed.store.snapshot()).records;await resumed.store.enrich(resumed.enrich);assert.deepEqual((await resumed.store.snapshot()).records,before);
 }
});
test('legacy F: high time survives later conflicting evidence and worker reconstruction without replacement',async()=>{
 const f=await setup();f.capture.messages[0].sourceTime=good;await f.store.capture(f.capture);const before=(await f.store.snapshot()).records;
 f.enrich.messages[0].sourceTime={state:'valid',createTime:time+1,updateTime:null};await f.store.enrich(f.enrich);
 assert.deepEqual((await f.store.snapshot()).records,before);
 const resumed=await setup(f.disk());resumed.capture.messages[0].sourceTime={state:'blocked',reason:'CONFLICT'};await resumed.store.capture(resumed.capture);assert.deepEqual((await resumed.store.snapshot()).records,before);
});
test('legacy F: high record without ledger cannot seed a conflicting date for a new snapshot',async()=>{
 const f=await setup();f.capture.messages[0].sourceTime=good;await f.store.capture(f.capture);const saved=f.disk();saved[STORAGE_KEY].sourceTimes={};
 const resumed=await setup(saved);resumed.enrich.messages[0].sourceTime={state:'valid',createTime:time+1,updateTime:null};await resumed.store.enrich(resumed.enrich);
 resumed.capture.messages[0].originalText='虚构独立新快照';resumed.capture.messages[0].sourceTime=resumed.enrich.messages[0].sourceTime;await resumed.store.capture(resumed.capture);
 const rows=(await resumed.store.snapshot()).records;assert.equal(rows[0].timeConfidence,'high');assert.equal(rows[1].sourceSentAt,null);
});
