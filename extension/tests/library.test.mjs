import test from 'node:test';
import assert from 'node:assert/strict';
import {ArchiveStore, initialState} from '../core/store.js';
import {STORAGE_KEY} from '../core/constants.js';
import {libraryText, documentBlocks, memoryContext} from '../core/library.js';
function fixture(initial) {
 let saved=initial?{[STORAGE_KEY]:structuredClone(initial)}:{},fail=false,n=0;
 const storage={get:async()=>structuredClone(saved),set:async v=>{if(fail)throw Error('QUOTA_BYTES');saved=structuredClone(v);},getBytesInUse:async()=>0};
 const store=new ArchiveStore(storage,{uuid:()=>`fake-record-${++n}`,clock:()=> '2026-09-01T00:00:00.000Z'});
 return {store,storage,saved:()=>saved[STORAGE_KEY],fail:v=>fail=v};
}
const batch=(epoch,text='虚构相同正文',chat='fake-chat-001',id='fake-message-001')=>({epoch,adapterVersion:'0.3.0',chat:{id:chat,url:`https://chatgpt.com/c/${chat}`,title:'虚构原始标题'},messages:[{sourceMessageId:id,pageOrder:1,originalText:text}]});
async function seeded(){const f=fixture();await f.store.consent(true);f.epoch=(await f.store.status()).epoch;await f.store.capture(batch(f.epoch));return f;}
test('schema migration preserves facts, references, notes, hidden/trash and is durable/idempotent',async()=>{
 const f=await seeded(),old=structuredClone(f.saved());old.schemaVersion=2;delete old.library;delete old.memoryAccessPolicy;
 old.records[0].editedText='虚构旧整理';old.records[0].note='虚构旧备注';
 old.records.push({...old.records[0],id:'hidden',hidden:true},{...old.records[0],id:'trash',deletedAt:'2026-01-01T00:00:00Z'});
 const m=fixture(old),s=await m.store.snapshot();assert.equal(s.schemaVersion,5);assert.deepEqual(s.records,old.records);
 assert.equal(s.library.blocks.length,3);const b=s.library.blocks[0];assert.equal(b.libraryText,'虚构旧整理');assert.equal(b.note,'虚构旧备注');assert.equal(b.sourceRecordId,old.records[0].id);assert.ok(b.editedAt);
 assert.deepEqual(s.library.blocks.map(b=>b.excluded),[false,true,true]);assert.equal(m.saved().schemaVersion,5);
 assert.deepEqual((await new ArchiveStore(m.storage).snapshot()).library,s.library);assert.deepEqual(memoryContext(s),{status:'disabled',blocks:[]});
});
test('schema1 migration supplies unknown time and failed migration publishes nothing',async()=>{
 const f=await seeded(),old=structuredClone(f.saved());old.schemaVersion=1;delete old.library;delete old.memoryAccessPolicy;delete old.records[0].sourceSentAt;
 const m=fixture(old);m.fail(true);await assert.rejects(m.store.snapshot());assert.equal(m.store.state,null);assert.deepEqual(m.saved(),old);m.fail(false);
 const s=await m.store.snapshot();assert.equal(s.schemaVersion,5);assert.equal(s.records[0].sourceSentAt,null);
});
test('raw to direct block; Library edit and title never change original text/time/title',async()=>{
 const f=await seeded(),before=await f.store.snapshot(),b=before.library.blocks[0],d=before.library.documents[0];
 assert.equal(b.libraryText,null);assert.equal(libraryText(b,before.records),before.records[0].originalText);assert.equal(b.originalTextReference,b.sourceRecordId);
 await f.store.updateLibrary(b.id,{libraryText:'虚构新整理',note:'虚构注解'});await f.store.updateDocument(d.id,{userTitle:'虚构自定标题'});
 const s=await f.store.snapshot();assert.deepEqual(s.records,before.records);assert.equal(s.library.blocks[0].libraryText,'虚构新整理');assert.ok(s.library.blocks[0].editedAt);assert.equal(s.library.documents[0].originalConversationTitle,'虚构原始标题');assert.equal(s.library.documents[0].userTitle,'虚构自定标题');
 for(const changes of [{originalText:'bad'},{sourceRecordId:'bad'},{provenance:[]},{libraryText:12}])await assert.rejects(f.store.updateLibrary(b.id,changes));
 await assert.rejects(f.store.updateDocument(d.id,{originalConversationTitle:'bad'}));
});
test('Library exclusion survives repeated capture and worker reload; explicit restore works',async()=>{
 const f=await seeded(),b=(await f.store.snapshot()).library.blocks[0];await f.store.excludeLibrary(b.id,true);
 await f.store.capture(batch(f.epoch));const restart=new ArchiveStore(f.storage);await restart.capture(batch(f.epoch));let s=await restart.snapshot();
 assert.equal(s.records.length,1);assert.equal(s.library.blocks.length,1);assert.equal(s.library.blocks[0].status,'excluded_by_user');assert.equal(s.library.blocks[0].excluded,true);
 await restart.excludeLibrary(b.id,false);s=await restart.snapshot();assert.equal(s.library.blocks[0].excluded,false);
});
test('permanent source tombstone purges private data and direct blocks; changed text cannot resurrect; same text elsewhere survives',async()=>{
 const f=await seeded(),r=(await f.store.snapshot()).records[0];
 await f.store.capture(batch(f.epoch,'虚构相同正文','fake-chat-002'));await f.store.capture(batch(f.epoch,'虚构变化正文'));
 await f.store.trash(r.id);await f.store.purge(r.id);let s=await f.store.snapshot();assert.equal(s.records.length,1);assert.equal(s.records[0].chatId,'fake-chat-002');assert.equal(s.library.blocks.length,1);
 const tomb=f.saved().tombstones.find(t=>t.sourceIdentityHash===r.sourceKey);assert.deepEqual(Object.keys(tomb).sort(),['deletedAt','sourceIdentityHash','status']);assert.equal(tomb.status,'permanently_ignored');assert.equal(f.saved().sourceTimes[r.sourceKey],undefined);
 assert.ok(!JSON.stringify(f.saved()).includes('虚构变化正文'));const restart=new ArchiveStore(f.storage);assert.equal((await restart.capture(batch(f.epoch,'另一个虚构版本'))).added,0);assert.equal((await restart.capture(batch(f.epoch))).added,0);
});
test('edited source deletion retains user work but detaches every raw reference',async()=>{
 const f=await seeded(),s=await f.store.snapshot(),r=s.records[0],b=s.library.blocks[0];await f.store.updateLibrary(b.id,{libraryText:'虚构用户整理',note:'虚构用户备注'});await f.store.trash(r.id);await f.store.purge(r.id);
 const next=await f.store.snapshot(),kept=next.library.blocks[0];assert.equal(next.records.length,0);assert.equal(kept.libraryText,'虚构用户整理');assert.equal(kept.note,'虚构用户备注');assert.equal(kept.sourceRecordId,null);assert.equal(kept.originalTextReference,null);assert.deepEqual(kept.provenance,[]);assert.deepEqual(kept.mergedSourceIds,[]);assert.ok(!JSON.stringify(f.saved()).includes('虚构相同正文'));
});
test('future merged block deletion detaches only deleted sources and keeps authored text',async()=>{
 const f=await seeded();await f.store.capture(batch(f.epoch,'虚构第二来源','fake-chat-001','fake-message-002'));
 const old=structuredClone(f.saved()),[a,b]=old.records;old.library.blocks[0].libraryText='虚构合并整理';old.library.blocks[0].mergedSourceIds=[a.id,b.id];old.library.blocks[0].provenance=[{sourceRecordId:a.id},{sourceRecordId:b.id}];
 const m=fixture(old);await m.store.trash(a.id);await m.store.purge(a.id);const kept=(await m.store.snapshot()).library.blocks.find(x=>x.id===old.library.blocks[0].id);
 assert.equal(kept.libraryText,'虚构合并整理');assert.deepEqual(kept.mergedSourceIds,[b.id]);assert.deepEqual(kept.provenance,[{sourceRecordId:b.id}]);assert.equal(kept.originalTextReference,null);
});
test('documents group by platform/conversation, preserve original title, order dates then conversationOrder, unknown ignores capturedAt',async()=>{
 const f=await seeded();await f.store.capture(batch(f.epoch,'虚构二','fake-chat-001','fake-message-002'));await f.store.capture(batch(f.epoch,'虚构三','fake-chat-001','fake-message-003'));await f.store.capture(batch(f.epoch,'虚构四','fake-chat-002','fake-message-004'));
 const old=structuredClone(f.saved());Object.assign(old.records[0],{sourceSentAt:null,conversationOrder:1,capturedAt:'1990-01-01'});Object.assign(old.records[1],{sourceSentAt:'2026-01-01T00:00:00Z',conversationOrder:2});Object.assign(old.records[2],{sourceSentAt:'2026-01-01T00:00:00Z',conversationOrder:1});
 const m=fixture(old),s=await m.store.snapshot();assert.equal(s.library.documents.length,2);const d=s.library.documents.find(d=>d.sourceConversationId==='fake-chat-001');const rows=documentBlocks(s,d.id);assert.deepEqual(rows.map(x=>x.sourceRecordId),[old.records[2].id,old.records[1].id,old.records[0].id]);assert.equal(rows.at(-1).sourceSentAt,null);assert.equal(d.firstSourceSentAt,'2026-01-01T00:00:00Z');assert.equal(d.sourceRecordIds.length,3);
});
test('exclusion/edit writes are atomic, concurrent capture is serialized, trash migration persists',async()=>{
 const f=await seeded(),before=structuredClone(f.saved()),b=before.library.blocks[0];f.fail(true);await assert.rejects(f.store.excludeLibrary(b.id,true));assert.deepEqual(f.saved(),before);f.fail(false);
 await Promise.all([f.store.excludeLibrary(b.id,true),f.store.capture(batch(f.epoch,'虚构新来源','fake-chat-002'))]);const s=await new ArchiveStore(f.storage).snapshot();assert.equal(s.library.blocks[0].excluded,true);assert.equal(s.records.length,2);
});


test('legacy dedupe tombstone migration keeps existing prevention without guessing source identity',async()=>{
 const f=await seeded(),old=structuredClone(f.saved()),r=old.records[0];old.schemaVersion=2;old.records=[];old.tombstones=[r.dedupeKey];delete old.library;
 const m=fixture(old);assert.equal((await m.store.capture(batch(f.epoch))).added,0);assert.deepEqual(m.saved().tombstones,[r.dedupeKey]);
});
test('late reliable timestamps refresh document bounds without modifying edited Library or excluded state',async()=>{
 const f=await seeded(),s=await f.store.snapshot(),b=s.library.blocks[0];await f.store.updateLibrary(b.id,{libraryText:'虚构整理'});await f.store.excludeLibrary(b.id,true);
 const request=batch(f.epoch);request.messages[0].domTime={source:'chatgpt_dom',sentAt:'2021-01-01T00:00:00.000Z'};
 // Use persisted resolver output here; full natural enrichment is covered by existing resolver E2E.
 const next=structuredClone(f.saved());next.records[0].sourceSentAt='2021-01-01T00:00:00.000Z';const m=fixture(next),after=await m.store.snapshot();
 assert.equal(after.library.documents[0].firstSourceSentAt,'2021-01-01T00:00:00.000Z');assert.equal(after.library.blocks[0].excluded,true);assert.equal(after.library.blocks[0].libraryText,'虚构整理');
});


test('document chronology uses sent dates before order, and unknown ties never use capturedAt',async()=>{
 const f=await seeded();for(let i=2;i<=5;i++)await f.store.capture(batch(f.epoch,'虚构顺序 '+i,'fake-chat-001','fake-message-00'+i));
 const saved=structuredClone(f.saved());const [a,b,c,d,e]=saved.records;
 Object.assign(a,{sourceSentAt:'2026-01-02T00:00:00.000Z',conversationOrder:1});
 Object.assign(b,{sourceSentAt:'2026-01-01T23:59:00.000Z',conversationOrder:5});
 Object.assign(c,{sourceSentAt:'2026-01-01T23:59:00.000Z',conversationOrder:2});
 Object.assign(d,{sourceSentAt:null,conversationOrder:1,capturedAt:'2100-01-01'});
 Object.assign(e,{sourceSentAt:null,conversationOrder:2,capturedAt:'1900-01-01'});
 const s=await fixture(saved).store.snapshot();assert.deepEqual(documentBlocks(s,s.library.documents[0].id).map(b=>b.sourceRecordId),[c.id,b.id,a.id,d.id,e.id]);
});
