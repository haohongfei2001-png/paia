import test from 'node:test';import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {local} from './harness/thought-m1.mjs';
import {journal} from '../core/thought-journal.js';
globalThis.IDBKeyRange=IDBKeyRange;
test('real journal preserves coalesced identity, sixty-second boundary and ordered clock UUID allocation',async()=>{
 const trace=[];let at='2026-10-09T00:00:00.000Z',counter=0;
 const s=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory(),clock:()=>{trace.push('clock');return at;},uuid:()=>{trace.push('uuid');return 'synthetic-journal-'+(++counter);}});await s.consent(true);await s.finishFoundation();
 const data={kind:'library_entry',entityId:'synthetic-entry',before:{body:'A'},after:{body:'B'},fieldMask:['body'],actor:'user',reason:'edit',important:false,operationId:'synthetic-operation-1',baseRevision:0,afterRevision:1,sourceRecordIds:[]};
 trace.length=0;const first=await s.foundationWrite(t=>journal(s,t,data));assert.equal(trace[0],'clock');assert.equal(trace[1],'uuid');const original=await s.repository.transaction(false,t=>t.get('revisions',first));
 at='2026-10-09T00:00:59.999Z';trace.length=0;const second=await s.foundationWrite(t=>journal(s,t,{...data,before:data.after,after:{body:'C'},operationId:'synthetic-operation-2',baseRevision:1,afterRevision:2}));assert.equal(second,first);assert.deepEqual(trace,['clock']);const updated=await s.repository.transaction(false,t=>t.get('revisions',first));assert.equal(updated.sequence,original.sequence);assert.equal(updated.windowStartedAt,original.windowStartedAt);assert.deepEqual(updated.before,original.before);assert.deepEqual(updated.after,{body:'C'});
 at='2026-10-09T00:01:00.000Z';trace.length=0;const third=await s.foundationWrite(t=>journal(s,t,{...data,before:{body:'C'},after:{body:'D'},operationId:'synthetic-operation-3',baseRevision:2,afterRevision:3}));assert.notEqual(third,first);assert.equal(trace[0],'clock');assert.equal(trace[1],'uuid');assert.equal((await s.repository.transaction(false,t=>t.get('revisions',third))).sequence,original.sequence+1);
});
import {planJournalRevision} from '../core/thought-journal.js';
test('important history never coalesces in either pure domain plan or real journal',async()=>{
 const before={body:'A'},middle={body:'B'},after={body:'C'},data={kind:'library_entry',entityId:'synthetic-important',before:middle,after,fieldMask:['body'],actor:'user',reason:'edit',important:true,operationId:'synthetic-important-op',sourceRecordIds:[]};
 const previous={...data,id:'synthetic-old-history',important:false,before,after:middle,windowStartedAt:'2026-10-09T00:00:00.000Z'};
 assert.equal(planJournalRevision(data,previous,'2026-10-09T00:00:01.000Z').coalesced,false);
 const s=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory(),clock:()=> '2026-10-09T00:00:01.000Z'});await s.consent(true);await s.finishFoundation();
 const id=await s.foundationWrite(t=>journal(s,t,{...data,important:false,before,after:middle}));const next=await s.foundationWrite(t=>journal(s,t,data));assert.notEqual(id,next);assert.equal((await s.repository.transaction(false,t=>t.get('revisions',next))).important,true);
});
test('actual move composes both placement intentions atomically and stale target leaves the source intact',async()=>{
 const s=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory()});await s.consent(true);await s.finishFoundation();
 const a=await s.createTopic({name:'SYNTHETIC source',operationId:crypto.randomUUID()}),b=await s.createTopic({name:'SYNTHETIC target',operationId:crypto.randomUUID()}),entry=await s.createEntry({actor:'user',operationId:crypto.randomUUID(),body:'SYNTHETIC human body',type:'idea',formation:'explicit',evidence:[]});
 const put=await s.placeEntry({entryId:entry.id,topicId:a.id,expectedEntryRevision:entry.revision,expectedTopicRevision:0,operationId:crypto.randomUUID()});
 const req={entryId:entry.id,sourceTopicId:a.id,targetTopicId:b.id,expectedEntryRevision:put.revision,expectedSourceRevision:put.topicRevision,expectedTargetRevision:0,operationId:crypto.randomUUID()};
 const snap=()=>s.repository.transaction(false,async t=>({thoughts:await t.all('thoughts'),topics:await t.all('topics'),placements:await t.all('placements'),history:await t.all('revisions')})),before=await snap();
 assert.equal((await s.moveMembership({...req,expectedTargetRevision:1})).conflict,true);assert.deepEqual(await snap(),before);
 const result=await s.moveMembership(req);assert.equal(result.revision,put.revision+2);const after=await snap(),e=after.thoughts.find(x=>x.id===entry.id);assert.deepEqual(e.organizationIntents.included,[b.id]);assert.deepEqual(e.organizationIntents.excluded,[a.id]);assert.equal(after.placements.find(x=>x.topicId===a.id).lifecycle,'removed');assert.equal(after.placements.find(x=>x.topicId===b.id).lifecycle,'active');assert.equal(after.history.filter(x=>x.operationId===req.operationId&&x.kind==='placement').length,2);
 assert.deepEqual(await s.moveMembership(req),result);assert.deepEqual(await snap(),after);
});
