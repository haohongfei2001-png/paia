import test from 'node:test';import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';import {local} from './harness/thought-m1.mjs';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';import {HumanLibrarySyncJournal} from '../core/browser-native-sync/human-library-journal.js';import {searchBatch} from '../core/library-search.js';
globalThis.IDBKeyRange=IDBKeyRange;
async function fixture(deviceId){let tick=0;const s=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory(),clock:()=>new Date(Date.UTC(2026,9,9)+tick++).toISOString()});await s.consent(true);await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic-indexed-journal',deviceId});s.humanLibraryJournal=new HumanLibrarySyncJournal(core);return {s,core};}
async function snapshot(s){return s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async key=>[key,await t.all(key)]))));}
async function completed(s){for(let i=0;i<30;i++)if(!(await searchBatch(s)).pending)return;assert.fail('original index did not finish');}
async function groups(core){const ops=[];for await(const row of core.rows('revision'))if(!row.redacted)ops.push(row.operation);return ops.filter(op=>op.type==='humanLibraryCommit').sort((a,b)=>a.sequence-b.sequence).map(d=>[...d.value.members.map(ref=>ops.find(op=>op.revisionId===ref.revisionId)),d]);}
async function topic(f){return f.s.createTopic({name:'Synthetic indexed Topic 汉字',operationId:crypto.randomUUID()});}
for(const receiverIndexed of [false,true])test('original indexed sender edit receives without transmitting completion; receiver indexed='+receiverIndexed,async()=>{
 const source=await fixture('synthetic-source'),q=await topic(source),target=await fixture('synthetic-target'),initial=await groups(source.core);assert.equal((await target.s.humanLibraryJournal.receive(target.s,initial[0])).state,'applied');
 await completed(source.s);if(receiverIndexed)await completed(target.s);const oldSender=await snapshot(source.s),oldReceiver=await snapshot(target.s);
 await source.s.editTopic({id:q.id,expectedRevision:0,changes:{summary:'Synthetic actual summary edit'},operationId:crypto.randomUUID()});const all=await groups(source.core),edit=all.at(-1);assert.equal(JSON.stringify(edit).includes('indexedSearchVersion'),false,'wire never carries local completion, even nested in Topic histories');
 assert.equal((await target.s.humanLibraryJournal.receive(target.s,edit)).state,'applied');assert.equal((await target.s.topic(q.id)).summary,'Synthetic actual summary edit');
 const sender=await snapshot(source.s),receiver=await snapshot(target.s),sr=sender.topics.find(r=>r.id===q.id),rr=receiver.topics.find(r=>r.id===q.id);assert.equal(sr.indexedSearchVersion,oldSender.topics.find(r=>r.id===q.id).indexedSearchVersion);
 if(receiverIndexed)assert.equal(rr.indexedSearchVersion,oldReceiver.topics.find(r=>r.id===q.id).indexedSearchVersion);else assert.equal(Object.hasOwn(rr,'indexedSearchVersion'),false,'unindexed receiver does not inherit sender completion');
 assert.deepEqual(receiver.revisions.filter(r=>r.kind==='topic'&&r.entityId===q.id).map(r=>[r.id,r.reason,r.baseRevision,r.afterRevision]),sender.revisions.filter(r=>r.kind==='topic'&&r.entityId===q.id).map(r=>[r.id,r.reason,r.baseRevision,r.afterRevision]));
 const before=await snapshot(target.s);assert.equal((await target.s.humanLibraryJournal.receive(target.s,edit)).state,'duplicate');assert.deepEqual(await snapshot(target.s),before);assert.equal(receiver.meta.filter(r=>r.id.includes(':outbox:')).length,0,'receiver emits no echo');
});
test('actual search-only race after prepare refuses the whole journal transaction without canonical/outbox changes',async()=>{
 const f=await fixture('synthetic-source'),q=await topic(f);await completed(f.s);const prepared=await f.s.humanLibraryJournal.prepare(f.s,'topic-edit',{id:q.id,expectedRevision:0,changes:{summary:'Synthetic refused race'},operationId:crypto.randomUUID()});
 await f.s.repository.transaction(true,async t=>{const row=(await t.all('librarySearchTerms'))[0];row.version='synthetic-intervening-search';await t.put('librarySearchTerms',row);});const before=await snapshot(f.s);
 await assert.rejects(f.s.write(t=>f.s.humanLibraryJournal.commit(t,prepared)),{code:'BNS_HUMAN_CHANGED'});assert.deepEqual(await snapshot(f.s),before);
});
