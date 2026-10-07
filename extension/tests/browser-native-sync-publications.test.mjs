import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {ArchiveRepository} from '../core/idb-repository.js';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {PreparedPublicationJournal} from '../core/browser-native-sync/publications.js';
import {readSegmentDescriptor,SEGMENT_PROFILE} from '../core/browser-native-sync/segments.js';
import {buildCheckpoint,StagedSyncRestore} from '../core/browser-native-sync/checkpoints.js';
import {materializePrompt,restorePromptPreferences} from '../core/browser-native-sync/prompt-journal.js';
globalThis.IDBKeyRange=IDBKeyRange;
const datasetId='dataset_publication_01',prompt=text=>({id:'prompt-reuse:v1',version:1,pins:[],overrides:[{id:'manual:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',text,hidden:false}],splits:[]});
async function device(deviceId='device_alpha_01',materialize=materializePrompt){const repository=new ArchiveRepository({}, {indexedDB:new IDBFactory(),name:'synthetic-publication',thoughtLibrary:true,ia:true,smartFilter:true});await repository.open();return new BrowserNativeSyncCore(repository,{datasetId,deviceId,materialize});}
async function local(core,text,operationId){const p=await core.prepare([{type:'promptPreferences',value:prompt(text)}],operationId?{operationIds:[operationId]}:{});await core.commit(p);return p.operations[0];}
function cloud(){const objects=new Map(),puts=[],gets=[];return {objects,puts,gets,async putImmutable(ref,value){puts.push(ref.id);const prior=objects.get(ref.id);if(prior&&!Buffer.from(prior).equals(Buffer.from(value)))throw Object.assign(Error('synthetic digest collision'),{code:'BNS_OBJECT_INTEGRITY'});objects.set(ref.id,value.slice());},async get(ref){gets.push(ref.id);const value=objects.get(ref.id);if(!value)throw Object.assign(Error('synthetic missing object'),{code:'BNS_OBJECT_NOT_FOUND'});return value.slice();}};}
const queued=async core=>{const rows=[];for await(const row of core.outbox())rows.push(row);return rows;};
test('BNS publication cut, configuration and object IDs survive restart and exclude later edits',async()=>{
 const a=await device(),first=await local(a,'first committed cut'),journal=new PreparedPublicationJournal(a),prepared=await journal.prepare({target:64*1024}),before=await a.read('publication',prepared.publicationId);assert.ok(!JSON.stringify(before).includes('first committed cut'));
 const later=await local(a,'later edit stays queued'),transport=cloud(),resumed=new PreparedPublicationJournal(a),receipt=await resumed.run(prepared.publicationId,transport);
 assert.equal(receipt.state,'confirmed');assert.equal(receipt.operationCount,1);assert.deepEqual((await queued(a)).map(x=>x.operationId),[later.operationId]);assert.deepEqual((await a.read('publication',prepared.publicationId)).objectRefs,before.objectRefs);
 const decoded=[];for(const ref of receipt.descriptors)decoded.push(...await readSegmentDescriptor(ref,key=>transport.get(key),{datasetId}));assert.deepEqual(decoded,[first]);
 const count=transport.puts.length;assert.deepEqual(await resumed.run(prepared.publicationId,transport),receipt);assert.equal(transport.puts.length,count);assert.deepEqual((await resumed.pending()).items,[]);
});
for(const written of [true,false])test('BNS unknown upload outcome reconciles the same logical identity, written='+written,async()=>{
 const core=await device();await local(core,'unknown outcome body');const journal=new PreparedPublicationJournal(core),p=await journal.prepare(),transport=cloud(),put=transport.putImmutable.bind(transport);let once=true;
 transport.putImmutable=async(ref,data)=>{if(once){once=false;if(written)await put(ref,data);throw Error('secret transport details must not escape');}return put(ref,data);};
 await assert.rejects(journal.run(p.publicationId,transport),{code:'BNS_TRANSPORT_UNKNOWN'});assert.equal((await journal.state(p.publicationId)).state,'unknown');assert.equal((await queued(core)).length,1);
 const original=(await core.read('publication',p.publicationId)).objectRefs[0];transport.putImmutable=put;const resumed=new PreparedPublicationJournal(core);await resumed.run(p.publicationId,transport);assert.equal(transport.puts.filter(id=>id===original.id).length,1);assert.equal((await queued(core)).length,0);
 assert.ok(!JSON.stringify(await core.read('publication',p.publicationId)).includes('secret transport'));
});
test('BNS streamed progress may stop and resume without retaining a whole-dataset receipt list',async()=>{
 const core=await device();await local(core,'文'.repeat(60000));const journal=new PreparedPublicationJournal(core),p=await journal.prepare({target:64*1024}),transport=cloud(),stream=journal.publish(p.publicationId,transport),first=await stream.next();assert.equal(first.value.state,'object_verified');await stream.return();
 assert.equal((await journal.state(p.publicationId)).verifiedObjects,1);assert.equal((await queued(core)).length,1);await new PreparedPublicationJournal(core).run(p.publicationId,transport);assert.equal(transport.puts.filter(id=>id===first.value.ref.id).length,1);
});
test('BNS preparation failure rolls back reservations, identity and active index atomically',async()=>{
 const core=await device(),operation=await local(core,'saved before preparation'),publicationId=crypto.randomUUID(),journal=new PreparedPublicationJournal(core,{checkpoint:async stage=>{if(stage==='prepared-before-commit')throw Error('synthetic abort');}});
 await assert.rejects(journal.prepare({publicationId}));assert.equal(await core.read('publication',publicationId),undefined);assert.equal((await core.read('outbox',operation.operationId)).publicationId,undefined);assert.deepEqual((await journal.pending()).items,[]);
 assert.equal((await new PreparedPublicationJournal(core).prepare({publicationId})).state,'prepared');
});
test('BNS only one prepared publication can reserve the same cut and primitive ack cannot bypass it',async()=>{
 const core=await device(),operation=await local(core,'one cut'),a=new PreparedPublicationJournal(core),b=new PreparedPublicationJournal(core),results=await Promise.allSettled([a.prepare(),b.prepare()]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal(results.find(x=>x.status==='rejected').reason.code,'BNS_CUT_RESERVED');assert.equal((await a.pending()).items.length,1);
 await assert.rejects(core.acknowledge(operation.operationId,operation.revisionId),{code:'BNS_PUBLICATION_OWNS_ACK'});assert.equal((await queued(core)).length,1);
});
test('BNS local acknowledgement failure preserves queue and exact receipt retry',async()=>{
 const core=await device();await local(core,'saved queue');let broken=true;const journal=new PreparedPublicationJournal(core,{checkpoint:async stage=>{if(stage==='publication-after-ack'&&broken)throw Error('synthetic acknowledgement abort');}}),p=await journal.prepare(),transport=cloud();
 await assert.rejects(journal.run(p.publicationId,transport),{code:'BNS_TRANSPORT_UNKNOWN'});assert.equal((await queued(core)).length,1);assert.equal(await core.read('publicationReceipt',p.publicationId),undefined);assert.equal((await journal.pending()).items.length,1);const puts=transport.puts.length;
 broken=false;await journal.run(p.publicationId,transport);assert.equal(transport.puts.length,puts);assert.equal((await queued(core)).length,0);
});
test('BNS missing previously verified remote data is blocked before delayed local acknowledgement',async()=>{
 const core=await device();await local(core,'verified then missing');let broken=true;const journal=new PreparedPublicationJournal(core,{checkpoint:async stage=>{if(stage==='publication-before-ack'&&broken)throw Error('synthetic stop');}}),p=await journal.prepare(),transport=cloud();await assert.rejects(journal.run(p.publicationId,transport));const puts=transport.puts.length;transport.objects.clear();broken=false;
 await assert.rejects(journal.run(p.publicationId,transport),{code:'BNS_OBJECT_NOT_FOUND'});assert.equal((await journal.state(p.publicationId)).state,'blocked_remote_missing');assert.equal(transport.puts.length,puts);assert.equal((await queued(core)).length,1);
});
test('BNS corrupt same-ID object is quarantined without overwrite or false queue acknowledgement',async()=>{
 const core=await device();await local(core,'integrity');const journal=new PreparedPublicationJournal(core),p=await journal.prepare(),transport=cloud(),get=transport.get.bind(transport);transport.get=async ref=>{const value=await get(ref);value[0]^=1;return value;};
 await assert.rejects(journal.run(p.publicationId,transport),{code:'BNS_OBJECT_INTEGRITY'});assert.equal((await journal.state(p.publicationId)).state,'blocked_integrity');const count=transport.puts.length;await assert.rejects(journal.run(p.publicationId,transport),{code:'BNS_PUBLICATION_BLOCKED'});assert.equal(transport.puts.length,count);assert.equal((await queued(core)).length,1);
});
test('BNS partial remote dependency loss cannot be acknowledged as a complete descriptor',async()=>{
 const core=await device();await local(core,'a'.repeat(190000));const journal=new PreparedPublicationJournal(core),p=await journal.prepare({target:64*1024}),transport=cloud(),put=transport.putImmutable.bind(transport),row=await core.read('publication',p.publicationId),chunk=row.objectRefs.find(ref=>ref.kind==='chunk');
 transport.putImmutable=async(ref,data)=>{await put(ref,data);if(ref.kind==='descriptor')transport.objects.delete(chunk.id);};await assert.rejects(journal.run(p.publicationId,transport),{code:'BNS_OBJECT_NOT_FOUND'});assert.equal((await queued(core)).length,1);assert.equal(await core.read('publicationReceipt',p.publicationId),undefined);
});
test('BNS purge during upload marks the old body cut obsolete and never publishes its descriptor',async()=>{
 const core=await device('device_alpha_01',null),operation=await local(core,'a'.repeat(190000)),journal=new PreparedPublicationJournal(core),p=await journal.prepare({target:64*1024}),transport=cloud(),put=transport.putImmutable.bind(transport);let purged=false;
 transport.putImmutable=async(ref,data)=>{await put(ref,data);if(!purged){purged=true;const removal=await core.prepare([{type:'promptPreferences',entityId:'prompt-reuse:v1',kind:'purge'}]);await core.commit(removal);}};
 await assert.rejects(journal.run(p.publicationId,transport),{code:'BNS_PUBLICATION_OBSOLETE'});assert.equal((await journal.state(p.publicationId)).state,'obsolete');const row=await core.read('publication',p.publicationId);assert.ok(!row.objectRefs.filter(ref=>ref.kind==='descriptor').some(ref=>transport.objects.has(ref.id)));assert.equal((await core.read('revision',operation.revisionId)).operation.value,null);assert.equal((await queued(core))[0].kind,'purge');assert.ok((await journal.pending()).items.length,'orphan object identities stay tracked; no cleanup is claimed');
});
test('BNS active publication prevents restore namespace loss and confirmed ID cannot retarget later generation',async()=>{
 const core=await device();await local(core,'root');const transport=cloud(),cp=await buildCheckpoint(core,transport),journal=new PreparedPublicationJournal(core),p=await journal.prepare(),r=new StagedSyncRestore(core,{owners:{promptPreferences:restorePromptPreferences}});await r.stageCheckpoint(cp.ref,ref=>transport.get(ref));
 await assert.rejects(r.activate(),{code:'BNS_RESTORE_PUBLICATION_PENDING'});await journal.run(p.publicationId,transport);await r.activate();await assert.rejects(journal.prepare({publicationId:p.publicationId}),{code:'BNS_BINDING_CHANGED'});
});
test('BNS pending catalogue and reservation scan are bounded, with explicit continuation',async()=>{
 const core=await device();for(let i=1;i<=3;i++)await local(core,'value '+i,'operation_order_000'+i);const journal=new PreparedPublicationJournal(core),one=await journal.prepare({maxOperations:1}),skip=await journal.prepare({maxOperations:1});assert.equal(skip.state,'nothing_to_prepare');assert.ok(skip.nextCursor);const two=await journal.prepare({maxOperations:1,after:skip.nextCursor});assert.equal(two.operationCount,1);
 const page=await journal.pending({limit:1});assert.equal(page.items.length,1);assert.ok(page.nextCursor);const next=await journal.pending({limit:1,after:page.nextCursor});assert.equal(next.items.length,1);assert.notEqual(next.items[0].publicationId,page.items[0].publicationId);assert.equal(one.operationCount,1);
});
test('BNS duplicate publication ID with changed packing and modified durable blueprint fail closed',async()=>{
 const core=await device();await local(core,'fixed blueprint');const journal=new PreparedPublicationJournal(core),p=await journal.prepare({target:64*1024});await assert.rejects(journal.prepare({publicationId:p.publicationId,target:256*1024}),{code:'BNS_PUBLICATION_COLLISION'});
 await core.transaction(true,async t=>{const row=await core.get(t,'publication',p.publicationId);row.target=256*1024;await core.put(t,'publication',[p.publicationId],row);},['meta']);const transport=cloud();await assert.rejects(journal.run(p.publicationId,transport),{code:'BNS_PUBLICATION_CORRUPT'});assert.deepEqual(transport.puts,[]);assert.equal((await queued(core)).length,1);
});
test('BNS concurrent restart publishers deduplicate immutable objects and atomic confirmation',async()=>{
 const core=await device();await local(core,'same durable publication');const journal=new PreparedPublicationJournal(core),p=await journal.prepare(),transport=cloud();const results=await Promise.all([journal.run(p.publicationId,transport),new PreparedPublicationJournal(core).run(p.publicationId,transport)]);assert.deepEqual(results[0],results[1]);assert.equal((await queued(core)).length,0);assert.equal((await journal.state(p.publicationId)).state,'confirmed');
});
test('BNS an in-flight success cannot clear a concurrently recorded integrity block',async()=>{
 const core=await device();await local(core,'concurrent integrity');const journal=new PreparedPublicationJournal(core),p=await journal.prepare(),transport=cloud(),get=transport.get.bind(transport);let entered,release;const started=new Promise(resolve=>entered=resolve),gate=new Promise(resolve=>release=resolve);let paused=false;
 const good={putImmutable:transport.putImmutable.bind(transport),get:async ref=>{if(!paused){paused=true;entered();await gate;}return get(ref);}},bad={putImmutable:transport.putImmutable.bind(transport),get:async ref=>{const value=await get(ref);value[0]^=1;return value;}};
 const pending=journal.run(p.publicationId,good);pending.catch(()=>{});await started;await assert.rejects(new PreparedPublicationJournal(core).run(p.publicationId,bad),{code:'BNS_OBJECT_INTEGRITY'});release();await assert.rejects(pending,{code:'BNS_PUBLICATION_BLOCKED'});assert.equal((await journal.state(p.publicationId)).state,'blocked_integrity');assert.equal((await queued(core)).length,1);
});
test('BNS unqualified chunk profiles and malformed reservations are rejected before upload',async()=>{
 const core=await device(),operation=await local(core,'shape');assert.throws(()=>new PreparedPublicationJournal(core,{profile:{...SEGMENT_PROFILE,chunk:1}}),{code:'BNS_PROFILE_INVALID'});
 await core.transaction(true,async t=>{const row=await core.get(t,'outbox',operation.operationId);row.publicationId=null;await core.put(t,'outbox',[operation.operationId],row);},['meta']);await assert.rejects(new PreparedPublicationJournal(core).prepare(),{code:'BNS_PUBLICATION_CORRUPT'});
});
