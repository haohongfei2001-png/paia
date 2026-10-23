import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
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
const DATASET='synthetic_local_selection',REGISTRY='SYNTHETIC-local-selection-registry';
function journals(store,deviceId){const core=new BrowserNativeSyncCore(store.repository,{datasetId:DATASET,deviceId});store.sourceBootstrapJournal=new SourceBootstrapJournal(core);store.filterIntentJournal=new FilterIntentSyncJournal(core);store.inputWorkingJournal=new InputWorkingSyncJournal(core,{filterJournal:store.filterIntentJournal,logicalCommits:true});return core;}
async function raw(repository,fn){await repository.open();await new Promise((resolve,reject)=>{const tx=repository.db.transaction(['meta'],'readwrite');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);fn(tx.objectStore('meta'));});}
const snapshot=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(s.repository.stores.map(async name=>[name,await t.all(name)]))));
async function fixture(t){
 const factory=new IDBFactory(),storage=local(),registry=new ArchiveRepository(local(),{indexedDB:factory,name:REGISTRY}),publication=new CanonicalGenerationPublication(registry),a=new LibraryDocumentsStore(local(),{indexedDB:factory,name:'SYNTHETIC-local-selection-A'}),b=new LibraryDocumentsStore(storage,{indexedDB:factory,name:'SYNTHETIC-local-selection-B'});
 const repositories=[registry,a.repository,b.repository];t.after(()=>repositories.forEach(r=>r.db?.close()));
 await a.consent(true);await a.finishFoundation();const coreA=journals(a,'synthetic_A');
 for(let n=0;n<2;n++){const q=capture((await a.status()).epoch,'synthetic-source-'+n,'SYNTHETIC original '+n);q.messages[0].pageOrder=n+1;await a.capture(q);}
 const blocks=(await a.snapshot()).library.blocks;for(const block of blocks)await inputEdit(a,block.id,{note:'SYNTHETIC initial note'});
 const handle=await publication.attach(b.repository,{generationId:'synthetic_generation',databaseId:'synthetic_database'});await b.consent(true);await b.finishFoundation();const coreB=journals(b,'synthetic_B');
 const objects=new Map(),transport={async putImmutable(ref,bytes){objects.set(ref.id,bytes.slice());},async get(ref){return objects.get(ref.id)?.slice();}},cut=await buildGroupedCheckpoint(coreA,transport,{store:a}),stage=new CanonicalGenerationCheckpointStage(publication,handle,{store:b,core:coreB,protectRepository:true});await stage.stageCheckpoint(cut.ref,r=>transport.get(r));const proof=await stage.validate(),restore=new GroupedCheckpointRestore(coreB,{store:b,restoreId:'synthetic_initial_restore'});await restore.stageCanonicalGeneration(proof);await restore.activate();await restore.prepareCanonicalGenerationPublication(proof);const seal=await publication.sealOriginalCheckpoint(handle,restore,proof);await publication.reserve(seal,'synthetic_local_publication');await publication.recover();
 while((await publication.retireCheckpointCopies(handle)).state!=='retired'){}
 async function cold(){const r=new ArchiveRepository(local(),{indexedDB:factory,name:REGISTRY}),p=new CanonicalGenerationPublication(r);repositories.push(r);const store=await p.openOriginalActiveStore(storage);repositories.push(store.repository);return {store,publication:p,registry:r,core:journals(store,'synthetic_B')};}
 return {factory,storage,registry,publication,a,b,coreA,coreB,transport,blocks,handle,cold};
}
test('durable registry selects original library after cold reopen and normal owner edits remain durable',async t=>{const f=await fixture(t),before=await snapshot(f.b);f.b.repository.db.close();f.b.repository.db=null;const cold=await f.cold();assert.equal(cold.store.repository.name,'SYNTHETIC-local-selection-B');assert.deepEqual(await snapshot(cold.store),before);await inputEdit(cold.store,f.blocks[1].id,{note:'SYNTHETIC local retained'});assert.equal((await cold.store.input(f.blocks[1].id)).note,'SYNTHETIC local retained');cold.store.repository.db.close();cold.store.repository.db=null;const again=await f.cold();assert.equal((await again.store.input(f.blocks[1].id)).note,'SYNTHETIC local retained');assert.equal((await again.store.snapshot()).records.length,2);});
test('existing selected library receives A successor while preserving independent B edit and outbox',async t=>{const f=await fixture(t),cold=await f.cold();await inputEdit(cold.store,f.blocks[1].id,{note:'SYNTHETIC B retained'});await inputEdit(f.a,f.blocks[0].id,{note:'SYNTHETIC A successor'});const outbox=[];for await(const row of cold.core.rows('outbox'))outbox.push(row);const cut=await buildCheckpoint(f.coreA,f.transport,{grouped:{store:f.a}}),receiver=new StagedSyncRestore(cold.core,{grouped:{store:cold.store}});await receiver.stageCheckpoint(cut.ref,r=>f.transport.get(r));await receiver.activate();assert.equal((await cold.store.input(f.blocks[0].id)).note,'SYNTHETIC A successor');assert.equal((await cold.store.input(f.blocks[1].id)).note,'SYNTHETIC B retained');const after=[];for await(const row of cold.core.rows('outbox'))after.push(row);assert.deepEqual(after,outbox);const again=await f.cold();await inputEdit(again.store,f.blocks[1].id,{note:'SYNTHETIC post-recovery edit'});assert.equal((await again.store.input(f.blocks[0].id)).note,'SYNTHETIC A successor');assert.equal((await again.store.input(f.blocks[1].id)).note,'SYNTHETIC post-recovery edit');});
