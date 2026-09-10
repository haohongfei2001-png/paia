import test from 'node:test';
import assert from 'node:assert/strict';
import {ArchiveStore,initialState} from '../core/store.js';
import {ADAPTER_VERSION,STORAGE_KEY} from '../core/constants.js';
import {exportJSON,exportMarkdown} from '../core/export.js';
const stamp=1600000000, captured='2026-09-05T10:00:00.000Z';
function fixture(saved) {
 let disk=saved?structuredClone(saved):{},fail=false,writes=0,n=0;
 const storage={async get(){return structuredClone(disk);},async set(value){if(fail)throw Error('fake failure');disk=structuredClone(value);writes++;},async getBytesInUse(){return 0;}};
 const store=new ArchiveStore(storage,{clock:()=>captured,uuid:()=>`fake-record-${++n}`});
 return {store,storage,disk:()=>structuredClone(disk),fail:v=>fail=v,writes:()=>writes};
}
const evidence=(createTime=stamp,updateTime=stamp+1)=>({state:'valid',createTime,updateTime});
function batch(epoch,sourceTime,text='虚构多行\n第二行',id='fake-source-message') {
 return {epoch,adapterVersion:ADAPTER_VERSION,chat:{id:'fake-source-chat',url:'https://chatgpt.com/c/fake-source-chat',title:'虚构聊天'},messages:[{sourceMessageId:id,pageOrder:1,originalText:text,...(sourceTime?{sourceTime}:{})}]};
}
async function setup() {const f=fixture();await f.store.consent(true);f.epoch=(await f.store.status()).epoch;return f;}
test('time storage: DOM first saves explicit unknown, late metadata enriches without changing first capture or original',async()=>{
 const f=await setup();await f.store.capture(batch(f.epoch));const before=(await f.store.snapshot()).records[0];
 assert.equal(before.sourceSentAt,null);assert.equal(before.timeSource,'unknown');assert.equal(before.timeConfidence,'unknown');
 await f.store.capture(batch(f.epoch,evidence()));const after=(await f.store.snapshot()).records[0];
 assert.equal(after.sourceSentAt,new Date(stamp*1000).toISOString());assert.equal(after.timeSource,'chatgpt_response_create_time');assert.equal(after.timeConfidence,'high');assert.equal(after.conversationOrder,1);
 for(const key of ['id','originalText','capturedAt','contentHash'])assert.equal(after[key],before[key]);
});
test('time storage: metadata first, duplicate scans/responses, same-body distinct IDs and edited snapshot',async()=>{
 const f=await setup();await f.store.capture(batch(f.epoch,evidence()));const first=(await f.store.snapshot()).records[0];const writes=f.writes();
 await f.store.capture(batch(f.epoch,evidence()));assert.equal(f.writes(),writes);
 await f.store.capture(batch(f.epoch,evidence(),'虚构多行\n第二行','fake-distinct-message'));
 await f.store.capture(batch(f.epoch,evidence(),'虚构编辑后的新快照'));
 const records=(await f.store.snapshot()).records;assert.equal(records.length,3);assert.deepEqual(records[0],first);assert.equal(records[2].previousVersionId,first.id);
});
test('time storage: conflicting evidence preserves existing high and blocks new snapshots across worker reconstruction',async()=>{
 const f=await setup();await f.store.capture(batch(f.epoch,evidence()));await f.store.capture(batch(f.epoch,evidence(),'虚构新快照'));
 await f.store.capture(batch(f.epoch,evidence(stamp+0.5,stamp+1)));
 let records=(await f.store.snapshot()).records;assert.ok(records.every(r=>r.sourceSentAt===new Date(stamp*1000).toISOString()&&r.timeConfidence==='high'&&r.capturedAt===captured));
 const resumed=new ArchiveStore(f.storage,{clock:()=>captured});await resumed.capture(batch(f.epoch,evidence()));
 assert.deepEqual((await resumed.snapshot()).records,records);
 await resumed.capture(batch(f.epoch,evidence(),'虚构冲突后的新快照'));
 assert.equal((await resumed.snapshot()).records.at(-1).sourceSentAt,null);
});
test('time storage: malformed, future, create greater than update and explicit order block cannot pollute sent time',async()=>{
 for(const e of [evidence('SECRET'),evidence(Date.parse(captured)/1000+1),evidence(stamp,stamp-1),{state:'blocked',reason:'ORDER'},evidence(stamp,'SECRET')]) {
  const f=await setup();await f.store.capture(batch(f.epoch,e));const r=(await f.store.snapshot()).records[0];assert.equal(r.sourceSentAt,null);assert.equal(r.timeConfidence,'unknown');
  assert.equal(JSON.stringify(f.disk()).includes('SECRET'),false);
 }
});
test('time storage: enrichment failure is atomic and retry succeeds; pause and stale epochs reject updates',async()=>{
 const f=await setup();await f.store.capture(batch(f.epoch));const before=f.disk();f.fail(true);
 await assert.rejects(f.store.capture(batch(f.epoch,evidence())));assert.deepEqual(f.disk(),before);
 f.fail(false);await f.store.capture(batch(f.epoch,evidence()));assert.equal((await f.store.snapshot()).records[0].timeConfidence,'high');
 await f.store.setEnabled(false);await assert.rejects(f.store.capture(batch(f.epoch,evidence())),{code:'PAUSED'});
 await f.store.setEnabled(true);await assert.rejects(f.store.capture(batch(f.epoch,evidence())),{code:'STALE_CAPTURE'});
});
test('time storage: source fields cannot be edited; recycle/restore preserve time; purge removes evidence but keeps tombstone',async()=>{
 const f=await setup();await f.store.capture(batch(f.epoch,evidence()));const record=(await f.store.snapshot()).records[0];
 for(const key of ['sourceSentAt','capturedAt','timeSource','timeConfidence','conversationOrder','originalText'])await assert.rejects(f.store.update(record.id,{[key]:'SECRET'}));
 await f.store.trash(record.id);await f.store.restore(record.id);assert.equal((await f.store.snapshot()).records[0].sourceSentAt,record.sourceSentAt);
 await f.store.trash(record.id);await f.store.purge(record.id);assert.deepEqual(f.disk()[STORAGE_KEY].sourceTimes,{});await f.store.capture(batch(f.epoch,evidence()));assert.equal((await f.store.snapshot()).records.length,0);
});
test('time storage: old schema migrates unknown without changing capturedAt, text or notes and export distinguishes dates',async()=>{
 const f=await setup();await f.store.capture(batch(f.epoch));const saved=f.disk();saved[STORAGE_KEY].schemaVersion=1;delete saved[STORAGE_KEY].sourceTimes;
 const old=saved[STORAGE_KEY].records[0];for(const key of ['sourceSentAt','timeSource','timeConfidence','conversationOrder'])delete old[key];old.note='虚构旧备注';
 const migrated=fixture(saved);const r=(await migrated.store.snapshot()).records[0];assert.equal(r.sourceSentAt,null);assert.equal(r.capturedAt,captured);assert.equal(r.note,old.note);assert.equal(migrated.writes(),1);
 assert.equal(JSON.parse(exportJSON([r])).schemaVersion,2);assert.match(exportMarkdown([r]),/发送时间未知/);
 await migrated.store.capture(batch(f.epoch,evidence()));assert.match(exportMarkdown((await migrated.store.snapshot()).records),/chatgpt_response_create_time/);
});
test('time storage: backend independently rejects reversed time evidence within a canonical batch',async()=>{
 const f=await setup();const request=batch(f.epoch,evidence(stamp+10,stamp+11));
 request.messages.push({sourceMessageId:'fake-later-message',pageOrder:2,originalText:'虚构后续文字',sourceTime:evidence(stamp,stamp+1)});
 await f.store.capture(request);assert.ok((await f.store.snapshot()).records.every(r=>r.sourceSentAt===null));
});
test('time storage: malformed schema-2 time ledger must fail closed on every load retry',async()=>{
 const saved=initialState();saved.sourceTimes=null;const f=fixture({[STORAGE_KEY]:saved});
 await assert.rejects(f.store.status(),{code:'STORAGE_FAILED'});await assert.rejects(f.store.status(),{code:'STORAGE_FAILED'});
});
