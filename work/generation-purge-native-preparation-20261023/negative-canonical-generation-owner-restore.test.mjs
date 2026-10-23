import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {ArchiveRepository} from '../core/idb-repository.js';
import {LibraryFoundationStore} from '../core/thought-store.js';
import {local,capture} from './harness/thought-m1.mjs';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {buildGroupedCheckpoint,GroupedCheckpointRestore} from '../core/browser-native-sync/group-checkpoint.js';
import {CanonicalGenerationPublication,CANONICAL_GENERATION_GATE as GATE} from '../core/browser-native-sync/canonical-generation-publication.js';
import {CanonicalGenerationCheckpointStage} from '../core/browser-native-sync/canonical-generation-checkpoint-stage.js';
import {protocolObject} from '../core/browser-native-sync/segments.js';
import {bytes} from '../core/browser-native-sync/value.js';
import {PromptSyncJournal} from '../core/browser-native-sync/prompt-journal.js';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {ConsumerPreferenceSyncJournal} from '../core/browser-native-sync/consumer-preference-journal.js';
import {STORAGE_KEY} from '../core/constants.js';
globalThis.IDBKeyRange=IDBKeyRange;
const snapshot=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async k=>[k,await t.all(k)]))));
async function fixture(t,options={}){
 const factory=new IDBFactory(),storage=local(),registry=new ArchiveRepository(local(),{indexedDB:factory,name:'SYNTHETIC-generation-registry'}),publication=new CanonicalGenerationPublication(registry);
 if(options.existingActive){
  const old=new ArchiveRepository(local(),{indexedDB:factory,name:'SYNTHETIC-existing-active'}),oldHandle=await publication.attach(old,{generationId:'generation_existing',databaseId:'database_existing'});
  t.after(()=>old.db?.close());
  // Metadata infrastructure only: this does not grant graph qualification.
  const oldSeal=await publication.seal(oldHandle,{sealId:'synthetic_old_seal',manifestId:'a'.repeat(64),graphDigest:'b'.repeat(64)});
  await publication.reserve(oldSeal,'synthetic_old_publication');await publication.recover();
 }
 const b=new LibraryFoundationStore(storage,{indexedDB:factory,name:'SYNTHETIC-shadow-target'}),handle=await publication.attach(b.repository,{generationId:'generation_target',databaseId:'database_target'});
 await b.consent(true);await b.finishFoundation();
 const a=new LibraryFoundationStore(local(),{indexedDB:new IDBFactory(),localPublicationTerminal:true});await a.consent(true);await a.finishFoundation();
 t.after(()=>{for(const r of [registry,a.repository,b.repository])r.db?.close();});
 const coreA=new BrowserNativeSyncCore(a.repository,{datasetId:'synthetic-generation-restore',deviceId:'synthetic_A'}),coreB=new BrowserNativeSyncCore(b.repository,{datasetId:'synthetic-generation-restore',deviceId:'synthetic_B'});
 a.sourceBootstrapJournal=new SourceBootstrapJournal(coreA);await a.capture(capture((await a.status()).epoch));
 if(options.consumerPreference){a.consumerPreferenceJournal=new ConsumerPreferenceSyncJournal(coreA);await a.updatePreferences({appearance:'dark'});}
 const objects=new Map(),transport={async putImmutable(ref,raw){objects.set(ref.id,raw.slice());},async get(ref){return objects.get(ref.id)?.slice();}},cut=await buildGroupedCheckpoint(coreA,transport,{store:a});
 const stage=new CanonicalGenerationCheckpointStage(publication,handle,{store:b,core:coreB});if(!options.deferStage)await stage.stageCheckpoint(cut.ref,ref=>transport.get(ref));const proof=options.deferStage?null:await stage.validate();
 const restore=new GroupedCheckpointRestore(coreB,{store:b,restoreId:'synthetic_owner_restore',...options});
 return {a,b,coreA,coreB,registry,publication,handle,stage,proof,restore,transport,cut,storage};
}
test('generation authenticated graph uses original Source owner and stays invisible until separate publication',async t=>{
 const f=await fixture(t);await f.restore.stageCanonicalGeneration(f.proof);assert.equal((await f.b.snapshot()).records.length,0);assert.deepEqual(await f.publication.active(),{state:'empty'});
 assert.equal((await f.restore.activate()).state,'activated');assert.deepEqual((await f.b.snapshot()).records,(await f.a.snapshot()).records);assert.deepEqual(await f.publication.active(),{state:'empty'});
 const before=await snapshot(f.b);assert.equal((await f.restore.activate()).state,'activated');assert.deepEqual(await snapshot(f.b),before);
 assert.equal((await f.restore.prepareCanonicalGenerationPublication(f.proof)).state,'publication-prepared');
 const seal=await f.publication.sealOriginalCheckpoint(f.handle,f.restore,f.proof);await f.publication.reserve(seal,'synthetic_original_publication');assert.equal((await f.publication.recover()).state,'committed');const active=await f.publication.active();assert.equal(active.identity.generationId,'generation_target');assert.equal(active.receipt.seal.manifestId,f.cut.ref.id);
});
test('generation cross-database consumer preference publication is refused without local writes',async t=>{
 const f=await fixture(t,{consumerPreference:true}),before=await snapshot(f.b),localBefore=await f.storage.get(STORAGE_KEY);await assert.rejects(f.restore.stageCanonicalGeneration(f.proof),{code:'BNS_GENERATION_CONSUMER_PUBLICATION_UNSUPPORTED'});assert.deepEqual(await snapshot(f.b),before);assert.deepEqual(await f.storage.get(STORAGE_KEY),localBefore);assert.deepEqual(await f.publication.active(),{state:'empty'});
});
test('generation ordinary activated receipt is not a prepared original graph seal',async t=>{
 const f=await fixture(t);await f.restore.stageCanonicalGeneration(f.proof);await f.restore.activate();const before=await snapshot(f.b);await assert.rejects(f.publication.sealOriginalCheckpoint(f.handle,f.restore,f.proof),{code:'BNS_GENERATION_PROOF_REQUIRED'});assert.deepEqual(await snapshot(f.b),before);
});
test('generation original seal reads the physical receipt even if stage.get is substituted',async t=>{
 const f=await fixture(t);await f.restore.stageCanonicalGeneration(f.proof);await f.restore.activate();await f.restore.prepareCanonicalGenerationPublication(f.proof);const receipt=await f.restore.stage.read('restore');
 await f.b.repository.transaction(true,tx=>tx.delete('meta',receipt.id));f.restore.stage.get=async()=>receipt;const before=await snapshot(f.b);await assert.rejects(f.publication.sealOriginalCheckpoint(f.handle,f.restore,f.proof),{code:'BNS_RESTORE_STAGE_CHANGED'});assert.deepEqual(await snapshot(f.b),before);assert.deepEqual(await f.publication.active(),{state:'empty'});
});
test('generation graph seal refuses late canonical mutation and rolls back the sealed gate',async t=>{
 const f=await fixture(t);await f.restore.stageCanonicalGeneration(f.proof);await f.restore.activate();await f.restore.prepareCanonicalGenerationPublication(f.proof);const before=await snapshot(f.b),original=f.b.repository.transaction.bind(f.b.repository);let injected=false;
 f.b.repository.transaction=(write,fn,stores)=>original(write,async tx=>{const result=await fn(tx);if(write&&!injected){injected=true;const row=(await tx.primaryRangePage('blocks',{limit:1})).rows[0].value;await tx.put('blocks',{...row,value:{...row.value,libraryText:'SYNTHETIC forbidden late replacement'}});}return result;},stores);
 await assert.rejects(f.publication.sealOriginalCheckpoint(f.handle,f.restore,f.proof));f.b.repository.transaction=original;assert.equal(injected,true);assert.deepEqual(await snapshot(f.b),before);assert.deepEqual(await f.publication.active(),{state:'empty'});
});
for(const phase of ['applied-group','before-activation','after-activation'])test('generation original owner '+phase+' failure rolls back canonical and activation receipt',async t=>{
 let inject=true;const f=await fixture(t,{checkpoint:async at=>{if(inject&&at===phase)throw Error('SYNTHETIC original-owner rollback');}});await f.restore.stageCanonicalGeneration(f.proof);const before=await snapshot(f.b);await assert.rejects(f.restore.activate());assert.deepEqual(await snapshot(f.b),before);assert.deepEqual(await f.publication.active(),{state:'empty'});inject=false;assert.equal((await f.restore.activate()).state,'activated');
});
test('generation restart must rebind genuine graph proof before original activation',async t=>{
 const f=await fixture(t);await f.restore.stageCanonicalGeneration(f.proof);const next=new GroupedCheckpointRestore(f.coreB,{store:f.b,restoreId:f.restore.restoreId}),before=await snapshot(f.b);await assert.rejects(next.activate(),{code:'BNS_GENERATION_PROOF_REQUIRED'});assert.deepEqual(await snapshot(f.b),before);
 const proof=await f.stage.validate();await next.stageCanonicalGeneration(proof);assert.equal((await next.activate()).state,'activated');await next.prepareCanonicalGenerationPublication(proof);
});
test('generation fake and foreign graph proofs cannot stage canonical content',async t=>{
 const f=await fixture(t),before=await snapshot(f.b);await assert.rejects(f.restore.stageCanonicalGeneration({}));assert.deepEqual(await snapshot(f.b),before);
 const foreign=new GroupedCheckpointRestore(f.coreA,{store:f.a,restoreId:'synthetic_foreign_restore'}),sourceBefore=await snapshot(f.a);await assert.rejects(foreign.stageCanonicalGeneration(f.proof));assert.deepEqual(await snapshot(f.a),sourceBefore);
});
for(const victim of ['gate','authenticated-item','activation','restore-receipt'])test('generation late '+victim+' drift aborts the complete original owner transaction',async t=>{
 const f=await fixture(t,{checkpoint:async(at,tx)=>{if(at!=='after-activation')return;
  const key=victim==='gate'?GATE:victim==='authenticated-item'?'canonical-generation:checkpoint:item:00000000':victim==='activation'?f.coreB.prefix+'active':await f.restore.stage.idIn(tx,'restore');
  const row=await tx.get('meta',key);assert.ok(row);await tx.put('meta',{...row,syntheticTamper:true});
 }});await f.restore.stageCanonicalGeneration(f.proof);const before=await snapshot(f.b);await assert.rejects(f.restore.activate());assert.deepEqual(await snapshot(f.b),before);assert.deepEqual(await f.publication.active(),{state:'empty'});
});
test('original grouped begin detaches the manifest identity before its first await',async t=>{
 const f=await fixture(t),ref=structuredClone(f.cut.ref),other=await protocolObject('checkpoint-manifest',bytes({...f.cut.manifest,parents:['a'.repeat(64)]}));
 await f.transport.putImmutable(other.ref,other.bytes);let changed=false;
 await f.restore.stageCheckpoint(ref,async wanted=>{const raw=await f.transport.get(wanted);if(!changed){changed=true;Object.assign(ref,other.ref);}return raw;});
 assert.equal(changed,true);const state=await f.restore.stage.read('restore');assert.deepEqual(state.manifestRef,f.cut.ref);assert.equal(state.manifestId,f.cut.ref.id);await f.restore.activate();assert.deepEqual((await f.b.snapshot()).records,(await f.a.snapshot()).records);
});
test('original grouped tail detaches the successor identity through held transport',async t=>{
 const f=await fixture(t);await f.restore.stageCheckpoint(f.cut.ref,r=>f.transport.get(r));
 const previous=new Set();for await(const row of f.coreA.rows('revision'))previous.add(row.operation.revisionId);
 await new PromptReuseService(f.a,{syncJournal:new PromptSyncJournal(f.coreA)}).change({action:'create',revision:0,text:'SYNTHETIC later prompt'});
 const next=await buildGroupedCheckpoint(f.coreA,f.transport,{store:f.a,parents:[f.cut.ref.id]}),delta=[];for await(const row of f.coreA.rows('revision'))if(!previous.has(row.operation.revisionId))delta.push(row.operation);
 const other=await protocolObject('checkpoint-manifest',bytes({...next.manifest,parents:[f.cut.ref.id,'b'.repeat(64)]}));await f.transport.putImmutable(other.ref,other.bytes);const ref=structuredClone(next.ref);let changed=false;
 await f.restore.reconcileTail(delta,{ref,get:async wanted=>{const raw=await f.transport.get(wanted);if(!changed){changed=true;Object.assign(ref,other.ref);}return raw;}});
 assert.equal(changed,true);const state=await f.restore.stage.read('restore');assert.deepEqual(state.manifestRef,next.ref);assert.equal(state.manifestId,next.ref.id);await f.restore.activate();
});

test('generation existing active source requires a real negative-ledger migration owner',async t=>{
 const f=await fixture(t,{existingActive:true}),active=await f.publication.active();
 await f.restore.stageCanonicalGeneration(f.proof);await f.restore.activate();await f.restore.prepareCanonicalGenerationPublication(f.proof);
 const before=await snapshot(f.b),registryBefore=await f.registry.transaction(false,tx=>tx.all('meta'),['meta']);
 await assert.rejects(f.publication.sealOriginalCheckpoint(f.handle,f.restore,f.proof),{code:'GENERATION_EXISTING_SOURCE_OWNER_REQUIRED'});
 assert.deepEqual(await snapshot(f.b),before);assert.deepEqual(await f.registry.transaction(false,tx=>tx.all('meta'),['meta']),registryBefore);assert.deepEqual(await f.publication.active(),active);
});

for(const consumer of ['authenticated-stage','original-group','canonical-owner'])test('known purge deny blocks '+consumer+' before storing old checkpoint content',async t=>{
 const f=await fixture(t,{deferStage:consumer!=='canonical-owner'});
 await f.b.repository.transaction(true,tx=>tx.put('meta',{id:f.coreB.prefix+'sourcePurgeDeny:synthetic',value:true}));const before=await snapshot(f.b);
 const action=consumer==='authenticated-stage'?()=>f.stage.stageCheckpoint(f.cut.ref,r=>f.transport.get(r)):consumer==='original-group'?()=>f.restore.stageCheckpoint(f.cut.ref,r=>f.transport.get(r)):()=>f.restore.stageCanonicalGeneration(f.proof);
 await assert.rejects(action());assert.deepEqual(await snapshot(f.b),before);
});
for(const consumer of ['authenticated-stage','original-group','canonical-owner'])test('late purge deny rolls back '+consumer+' writes at native completion',async t=>{
 const f=await fixture(t,{deferStage:consumer!=='canonical-owner'}),before=await snapshot(f.b),original=f.b.repository.transaction.bind(f.b.repository);let injected=false;
 f.b.repository.transaction=(write,fn,stores)=>original(write,async tx=>{const result=await fn(tx);if(write&&!injected){injected=true;await tx.put('meta',{id:f.coreB.prefix+'sourcePurgeDeny:synthetic',value:true});}return result;},stores);
 const action=consumer==='authenticated-stage'?()=>f.stage.stageCheckpoint(f.cut.ref,r=>f.transport.get(r)):consumer==='original-group'?()=>f.restore.stageCheckpoint(f.cut.ref,r=>f.transport.get(r)):()=>f.restore.stageCanonicalGeneration(f.proof);
 await assert.rejects(action());f.b.repository.transaction=original;assert.equal(injected,true);assert.deepEqual(await snapshot(f.b),before);
});
import {SourceBootstrapReceiver} from '../core/browser-native-sync/source-bootstrap-receive.js';
import {SourcePurgeJournal,SourcePurgeReceiver} from '../core/browser-native-sync/source-purge-journal.js';
test('original purge refuses a genuine authenticated checkpoint body still resident outside protocol namespace',async t=>{
 const f=await fixture(t),operations=[];for await(const op of f.coreA.outbox())operations.push(op);
 await new SourceBootstrapReceiver(f.b,f.coreB).receive(operations);f.b.sourcePurgeJournal=new SourcePurgeJournal(f.coreB);
 const id=(await f.b.snapshot()).records[0].id,before=await snapshot(f.b);
 await assert.rejects(f.b.purge(id,true),{code:'BNS_SOURCE_PURGE_UNSUPPORTED'});assert.deepEqual(await snapshot(f.b),before);
});
