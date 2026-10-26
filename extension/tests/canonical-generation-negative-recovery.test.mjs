import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {SourcePurgeJournal} from '../core/browser-native-sync/source-purge-journal.js';
import {SourceBootstrapReceiver} from '../core/browser-native-sync/source-bootstrap-receive.js';
import {ArchiveRepository} from '../core/idb-repository.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {local,capture,inputEdit} from './harness/thought-m1.mjs';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {FilterIntentSyncJournal} from '../core/browser-native-sync/filter-intent-journal.js';
import {InputWorkingSyncJournal} from '../core/browser-native-sync/input-working-journal.js';
import {buildGroupedCheckpoint,GroupedCheckpointRestore} from '../core/browser-native-sync/group-checkpoint.js';
import {buildCheckpoint,StagedSyncRestore} from '../core/browser-native-sync/checkpoints.js';
import {CanonicalGenerationPublication,CANONICAL_GENERATION_REGISTRY as ROOT} from '../core/browser-native-sync/canonical-generation-publication.js';
import {CanonicalGenerationCheckpointStage} from '../core/browser-native-sync/canonical-generation-checkpoint-stage.js';
globalThis.IDBKeyRange=IDBKeyRange;
const DATASET='synthetic_negative_selection',REGISTRY='SYNTHETIC-negative-selection-registry';
function journals(store,deviceId){const core=new BrowserNativeSyncCore(store.repository,{datasetId:DATASET,deviceId});store.sourceBootstrapJournal=new SourceBootstrapJournal(core);store.sourcePurgeJournal=new SourcePurgeJournal(core);return core;}
async function raw(repository,fn){await repository.open();await new Promise((resolve,reject)=>{const tx=repository.db.transaction(['meta'],'readwrite');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);fn(tx.objectStore('meta'));});}
const snapshot=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(s.repository.stores.map(async name=>[name,await t.all(name)]))));
async function fixture(t){
 const factory=new IDBFactory(),storage=local(),registry=new ArchiveRepository(local(),{indexedDB:factory,name:REGISTRY}),publication=new CanonicalGenerationPublication(registry),a=new LibraryDocumentsStore(local(),{indexedDB:factory,name:'SYNTHETIC-negative-selection-A'}),b=new LibraryDocumentsStore(storage,{indexedDB:factory,name:'SYNTHETIC-negative-selection-B'});
 const repositories=[registry,a.repository,b.repository];t.after(()=>repositories.forEach(r=>r.db?.close()));
 await a.consent(true);await a.finishFoundation();const coreA=journals(a,'synthetic_A');
 for(let n=0;n<2;n++){const q=capture((await a.status()).epoch,'synthetic-source-'+n,'SYNTHETIC original '+n);q.chat={id:'synthetic-negative-chat-'+n,url:'https://chatgpt.com/c/synthetic-negative-chat-'+n,title:'SYNTHETIC independent '+n};await a.capture(q);}
 const blocks=(await a.snapshot()).library.blocks;
 const handle=await publication.attach(b.repository,{generationId:'synthetic_generation',databaseId:'synthetic_database'});await b.consent(true);await b.finishFoundation();const coreB=journals(b,'synthetic_B');
 const objects=new Map(),transport={async putImmutable(ref,bytes){objects.set(ref.id,bytes.slice());},async get(ref){return objects.get(ref.id)?.slice();}},cut=await buildGroupedCheckpoint(coreA,transport,{store:a}),stage=new CanonicalGenerationCheckpointStage(publication,handle,{store:b,core:coreB,protectRepository:true});await stage.stageCheckpoint(cut.ref,r=>transport.get(r));const proof=await stage.validate(),restore=new GroupedCheckpointRestore(coreB,{store:b,restoreId:'synthetic_initial_restore'});await restore.stageCanonicalGeneration(proof);await restore.activate();await restore.prepareCanonicalGenerationPublication(proof);const seal=await publication.sealOriginalCheckpoint(handle,restore,proof);await publication.reserve(seal,'synthetic_local_publication');await publication.recover();
 while((await publication.retireCheckpointCopies(handle)).state!=='retired'){}
 await publication.bindOriginalActiveStore(handle,b);while(!(await restore.cleanup({limit:100})).complete){}
 async function cold(){const r=new ArchiveRepository(local(),{indexedDB:factory,name:REGISTRY}),p=new CanonicalGenerationPublication(r);repositories.push(r);const store=await p.openOriginalActiveStore(storage);repositories.push(store.repository);return {store,publication:p,registry:r,core:journals(store,'synthetic_B')};}
 return {factory,storage,registry,publication,a,b,coreA,coreB,transport,blocks,handle,cold};
}
async function groups(core){const operations=[];for await(const row of core.rows('revision'))operations.push(row.operation);return operations.filter(op=>op.type==='sourceBootstrapCommit').map(commit=>[...commit.value.members.map(ref=>operations.find(op=>op.revisionId===ref.revisionId)),commit]);}
const outbox=async core=>{const rows=[];for await(const row of core.outbox())rows.push(row);return rows;};
test('cold selected library permanently ignores old Source, receives independent Source, edits and reopens',async t=>{
 const f=await fixture(t),cold=await f.cold(),old=await groups(f.coreA),selected=(await cold.store.snapshot()).records[0],other=(await cold.store.snapshot()).records[1];
 await cold.store.purge(selected.id,true);await cold.store.drainPurgeCleanup();
 const denied=await snapshot(cold.store),queued=await outbox(cold.core),denyId=cold.core.prefix+'sourcePurgeDeny:'+selected.sourceKey;
 assert.equal(queued.length,8);assert.equal(denied.records.length,1);assert.ok(denied.meta.find(row=>row.id===denyId));assert.equal(denied.tombstones.find(row=>row.id==='source:'+selected.sourceKey).value.status,'permanently_ignored');
 await assert.rejects(new SourceBootstrapReceiver(cold.store,cold.core).receive(old.find(group=>group.at(-1).value.sourceId===selected.id)));assert.deepEqual(await snapshot(cold.store),denied);
 const q=capture((await f.a.status()).epoch,'synthetic-next-source','SYNTHETIC next source');q.chat={id:'synthetic-next-chat',url:'https://chatgpt.com/c/synthetic-next-chat',title:'SYNTHETIC independent next'};await f.a.capture(q);
 const next=(await groups(f.coreA)).find(group=>!old.some(previous=>previous.at(-1).revisionId===group.at(-1).revisionId));assert.ok(next);
 await new SourceBootstrapReceiver(cold.store,cold.core).receive(next);const after=await snapshot(cold.store);assert.equal(after.records.length,2);assert.equal(after.records.some(row=>row.id===selected.id),false);assert.deepEqual(await outbox(cold.core),queued);assert.deepEqual(after.meta.find(row=>row.id===denyId),denied.meta.find(row=>row.id===denyId));assert.deepEqual(after.tombstones,denied.tombstones);
 cold.store.filterIntentJournal=new FilterIntentSyncJournal(cold.core);cold.store.inputWorkingJournal=new InputWorkingSyncJournal(cold.core,{filterJournal:cold.store.filterIntentJournal,logicalCommits:true});await inputEdit(cold.store,'block:'+other.id,{note:'SYNTHETIC retained human note'});const again=await f.cold();assert.equal((await again.store.input('block:'+other.id)).note,'SYNTHETIC retained human note');assert.equal((await again.store.snapshot()).records.length,2);assert.deepEqual((await snapshot(again.store)).tombstones,denied.tombstones);
 const stable=await snapshot(again.store);await assert.rejects(new SourceBootstrapReceiver(again.store,again.core).receive(old.find(group=>group.at(-1).value.sourceId===selected.id)));assert.deepEqual(await snapshot(again.store),stable);
});
for(const defect of ['unbound','completed','control','resident-copy','unknown-namespace','post-restore-source'])test('selected Source purge refuses '+defect+' and preserves every table',async t=>{
 const f=await fixture(t);let cold=await f.cold(),selected=(await cold.store.snapshot()).records[0];
 if(defect==='unbound'){const store=new LibraryDocumentsStore(f.storage,{indexedDB:f.factory,name:f.b.repository.name});t.after(()=>store.repository.db?.close());cold={store,core:journals(store,'synthetic_B')};}
 else if(defect==='post-restore-source'){const q=capture((await cold.store.status()).epoch,'synthetic-unqualified-source','SYNTHETIC new local Source');q.chat={id:'synthetic-unqualified-chat',url:'https://chatgpt.com/c/synthetic-unqualified-chat',title:'SYNTHETIC local'};await cold.store.capture(q);}
 else await raw(cold.store.repository,s=>{if(defect==='resident-copy')s.put({id:'canonical-generation:checkpoint:synthetic-extra',body:'SYNTHETIC resident copy'});else if(defect==='unknown-namespace')s.put({id:cold.core.prefix+'generation:synthetic-other:groupItem:0000',body:'SYNTHETIC staged copy'});else{const req=s.get(defect==='control'?'canonical-generation:qualified-graph:v1':cold.core.prefix+'generation:synthetic_initial_restore:restore:');req.onsuccess=()=>s.put({...req.result,synthetic:true});}});
 const before=await snapshot(cold.store);await assert.rejects(cold.store.purge(selected.id,true));assert.deepEqual(await snapshot(cold.store),before);
});
test('cold selected Source purges through its original Filter owner and keeps permanent denial across reopen',async t=>{
 const f=await fixture(t),cold=await f.cold(),records=(await cold.store.snapshot()).records,selected=records[0],other=records[1],before=await snapshot(cold.store),filter=new FilterIntentSyncJournal(cold.core);
 cold.store.filterIntentJournal=filter;await cold.store.purge(selected.id,true);await cold.store.drainPurgeCleanup();
 const after=await snapshot(cold.store),queued=await outbox(cold.core),denyId=cold.core.prefix+'sourcePurgeDeny:'+selected.sourceKey;
 assert.equal(cold.store.filterIntentJournal,filter);assert.deepEqual(after.records,before.records.filter(row=>row.id===other.id));assert.deepEqual(after.blocks,before.blocks.filter(row=>row.id==='block:'+other.id));assert.deepEqual(after.filterInputs,before.filterInputs.filter(row=>row.id==='block:'+other.id));assert.deepEqual(after.filterIntents,before.filterIntents);
 assert.equal(JSON.stringify(after).includes(selected.originalText),false);assert.equal(queued.length,8);assert.ok(after.meta.find(row=>row.id===denyId));assert.equal(after.tombstones.find(row=>row.id==='source:'+selected.sourceKey).value.status,'permanently_ignored');
 const again=await f.cold();again.store.filterIntentJournal=new FilterIntentSyncJournal(again.core);assert.deepEqual(await snapshot(again.store),after);
 const old=(await groups(f.coreA)).find(group=>group.at(-1).value.sourceId===selected.id);assert.ok(old);await assert.rejects(new SourceBootstrapReceiver(again.store,again.core).receive(old));assert.deepEqual(await snapshot(again.store),after);assert.deepEqual(await outbox(again.core),queued);
});
for(const defect of ['forged','rebound'])test('selected Source purge refuses '+defect+' Filter owner and preserves every table',async t=>{
 const f=await fixture(t),cold=await f.cold(),selected=(await cold.store.snapshot()).records[0],original=new FilterIntentSyncJournal(cold.core);
 if(defect==='forged')cold.store.filterIntentJournal=Object.create(Object.getPrototypeOf(original),Object.getOwnPropertyDescriptors(original));
 else{cold.store.filterIntentJournal=original;original.core=new BrowserNativeSyncCore(cold.store.repository,{datasetId:cold.core.datasetId,deviceId:cold.core.deviceId});}
 const before=await snapshot(cold.store);await assert.rejects(cold.store.purge(selected.id,true),{code:'BNS_FILTER_WRITER_UNSUPPORTED'});assert.deepEqual(await snapshot(cold.store),before);
});
for(const defect of ['other-source','new-meta','gate','outbox','completed'])test('late '+defect+' change inside original purge rolls back the full selected library',async t=>{
 const f=await fixture(t),cold=await f.cold(),records=(await cold.store.snapshot()).records,selected=records[0],other=records[1],before=await snapshot(cold.store),original=cold.store.beforeSourcePurge.bind(cold.store);let injected=false;
 cold.store.beforeSourcePurge=async(tx,...args)=>{await original(tx,...args);injected=true;if(defect==='other-source'){const row=await tx.get('records',other.id);await tx.put('records',{...row,value:{...row.value,originalText:'SYNTHETIC corrupted'}});}else if(defect==='new-meta')await tx.put('meta',{id:'synthetic-unplanned',value:'SYNTHETIC unplanned'});else if(defect==='gate'){const row=await tx.get('meta','canonical-generation:gate:v1');await tx.put('meta',{...row,writeRevision:row.writeRevision+1});}else if(defect==='completed'){const id=cold.core.prefix+'generation:synthetic_initial_restore:restore:',row=await tx.get('meta',id);await tx.put('meta',{...row,synthetic:true});}else{const rows=await tx.primaryRangePage('meta',{prefix:cold.core.prefix+'generation:'+await cold.core.bind(tx)+':outbox:',limit:16});assert.ok(rows.rows.length);await tx.delete('meta',rows.rows[0].key);}};
 await assert.rejects(cold.store.purge(selected.id,true));assert.ok(injected);assert.deepEqual(await snapshot(cold.store),before);
});
test('real permanent-ignore keeps the grouped-checkpoint reconciliation gate closed before remote read',async t=>{
 const f=await fixture(t),cold=await f.cold(),selected=(await cold.store.snapshot()).records[0];await cold.store.purge(selected.id,true);const cut=await buildCheckpoint(f.coreA,f.transport,{grouped:{store:f.a}}),before=await snapshot(cold.store),restore=new StagedSyncRestore(cold.core,{grouped:{store:cold.store}});let reads=0;
 await assert.rejects(restore.stageCheckpoint(cut.ref,ref=>{reads++;return f.transport.get(ref);}),{code:'BNS_SOURCE_PURGE_RECONCILIATION_REQUIRED'});assert.equal(reads,0);assert.deepEqual(await snapshot(cold.store),before);
});
