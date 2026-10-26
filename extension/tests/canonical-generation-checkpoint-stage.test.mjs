import {decodeCheckpointManifestStorage} from '../core/browser-native-sync/checkpoint-manifest-storage.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange,IDBObjectStore} from './vendor/fake-indexeddb/build/esm/index.js';
import {ArchiveRepository} from '../core/idb-repository.js';
import {LibraryFoundationStore} from '../core/thought-store.js';
import {local,capture} from './harness/thought-m1.mjs';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {buildCheckpoint} from '../core/browser-native-sync/checkpoints.js';
import {protocolObject} from '../core/browser-native-sync/segments.js';
import {bytes} from '../core/browser-native-sync/value.js';
import {CanonicalGenerationPublication,CANONICAL_GENERATION_GATE as GATE} from '../core/browser-native-sync/canonical-generation-publication.js';
import {CanonicalGenerationCheckpointStage,readCanonicalCheckpointProof,requireCanonicalCheckpointProof,requireCanonicalCheckpointProofForSeal,requireCanonicalCheckpointInputProof,CANONICAL_CHECKPOINT_STATE as STATE,CANONICAL_CHECKPOINT_PREFIX as PREFIX} from '../core/browser-native-sync/canonical-generation-checkpoint-stage.js';
globalThis.IDBKeyRange=IDBKeyRange;
const read=(r,id)=>r.transaction(false,t=>t.get('meta',id),['meta']);
const cloud=()=>{const rows=new Map();return {rows,async putImmutable(ref,raw){rows.set(ref.id,raw.slice());},async get(ref){return rows.get(ref.id)?.slice();}};};
async function fixture(t,{checkpoint}={}){
 const factory=new IDBFactory(),producer=new LibraryFoundationStore(local(),{indexedDB:factory,name:'SYNTHETIC-producer'});await producer.consent(true);await producer.finishFoundation();const sourceCore=new BrowserNativeSyncCore(producer.repository,{datasetId:'synthetic_generation_dataset',deviceId:'synthetic_producer'});producer.sourceBootstrapJournal=new SourceBootstrapJournal(sourceCore);await producer.capture(capture((await producer.status()).epoch));const transport=cloud(),cp=await buildCheckpoint(sourceCore,transport,{grouped:{store:producer}});
 const registry=new ArchiveRepository(local(),{indexedDB:factory,name:'SYNTHETIC-registry'}),publication=new CanonicalGenerationPublication(registry),store=new LibraryFoundationStore(local(),{indexedDB:factory,name:'SYNTHETIC-target'}),handle=await publication.attach(store.repository,{generationId:'synthetic_generation',databaseId:'synthetic_database'});await store.consent(true);await store.finishFoundation();const core=new BrowserNativeSyncCore(store.repository,{datasetId:sourceCore.datasetId,deviceId:'synthetic_receiver'}),stage=new CanonicalGenerationCheckpointStage(publication,handle,{store,core,checkpoint});
 t.after(()=>[producer.repository,registry,store.repository].forEach(r=>r.db?.close()));return {factory,producer,sourceCore,transport,cp,registry,publication,store,core,handle,stage};
}
test('generation checkpoint authenticates original Source graph and mints private input proof without canonical writes',async t=>{
 const f=await fixture(t);assert.equal((await f.stage.stageCheckpoint(f.cp.ref,r=>f.transport.get(r))).phase,'authenticated');const proof=await f.stage.validate(),packet=readCanonicalCheckpointProof(proof,f);assert.equal(packet.manifestRef.id,f.cp.ref.id);assert.equal(packet.items.length,f.cp.manifest.itemCount);assert.match(packet.graphDigest,/^[a-f0-9]{64}$/);assert.equal(packet.generationIdentity.generationId,'synthetic_generation');assert.equal((await f.store.snapshot()).records.length,0);assert.deepEqual(await f.publication.active(),{state:'empty'});await f.store.repository.transaction(true,t=>requireCanonicalCheckpointProof(proof,f,t));await assert.rejects(f.store.repository.transaction(true,t=>requireCanonicalCheckpointProof({},f,t)),{code:'GENERATION_CHECKPOINT_PROOF_REQUIRED'});
});
test('generation checkpoint resumes after committed final page and validates durable cursor/receipt',async t=>{
 let stopped=false;const f=await fixture(t,{checkpoint:async name=>{if(name==='committed-page'&&!stopped){stopped=true;throw Error('SYNTHETIC interrupted');}}});await assert.rejects(f.stage.stageCheckpoint(f.cp.ref,r=>f.transport.get(r)),/interrupted/);const prior=await read(f.store.repository,STATE);assert.equal(prior.phase,'staging');assert.equal(prior.received,f.cp.manifest.itemCount);assert.equal(prior.pages,1);const next=new CanonicalGenerationCheckpointStage(f.publication,f.handle,f);assert.equal((await next.stageCheckpoint(f.cp.ref,r=>f.transport.get(r))).phase,'authenticated');assert.equal(readCanonicalCheckpointProof(await next.validate(),f).items.length,prior.received);
});
test('generation checkpoint lost page response resumes exact cursor without duplicate items',async t=>{
 let once=true;const f=await fixture(t,{checkpoint:async phase=>{if(phase==='committed-page'&&once){once=false;throw Error('SYNTHETIC lost page ACK');}}});await f.stage.begin(f.cp.ref,r=>f.transport.get(r));await assert.rejects(f.stage.stageCheckpoint(f.cp.ref,r=>f.transport.get(r)),/lost page ACK/);await f.stage.stageCheckpoint(f.cp.ref,r=>f.transport.get(r));const state=await read(f.store.repository,STATE);assert.equal(state.received,f.cp.manifest.itemCount);assert.equal(state.pages,1);await f.stage.validate();
});
for(const defect of ['item','page','cursor','extra-item','gate'])test('generation checkpoint rejects durable '+defect+' drift before proof',async t=>{
 const f=await fixture(t);await f.stage.stageCheckpoint(f.cp.ref,r=>f.transport.get(r));await f.store.repository.transaction(true,async t=>{const id=defect==='item'?PREFIX+'item:00000000':defect==='page'?PREFIX+'page:00000000':defect==='gate'?GATE:STATE,row=await t.get('meta',id);if(defect==='item')row.item.synthetic=true;if(defect==='page')row.pageDigest='c'.repeat(64);if(defect==='cursor')row.received--;if(defect==='gate')row.phase='invalidated';if(defect==='extra-item')await t.put('meta',{id:PREFIX+'item:99999999',item:{synthetic:true}});else await t.put('meta',row);});await assert.rejects(f.stage.validate());assert.equal((await f.store.snapshot()).records.length,0);assert.deepEqual(await f.publication.active(),{state:'empty'});
});
for(const defect of ['item','page','extra-item','state','gate'])test('generation checkpoint original same-TX terminal rejects late '+defect+' and rolls back',async t=>{
 const f=await fixture(t);await f.stage.stageCheckpoint(f.cp.ref,r=>f.transport.get(r));const proof=await f.stage.validate();await assert.rejects(f.store.repository.transaction(true,async t=>{await requireCanonicalCheckpointProof(proof,f,t);await t.put('meta',{id:'synthetic-owner-write',value:true});if(defect==='extra-item')await t.put('meta',{id:PREFIX+'item:99999999',item:{synthetic:true}});else{const id=defect==='item'?PREFIX+'item:00000000':defect==='page'?PREFIX+'page:00000000':defect==='state'?STATE:GATE;await t.put('meta',{...await t.get('meta',id),synthetic:true});}}));assert.equal(await read(f.store.repository,'synthetic-owner-write'),undefined);await f.store.repository.transaction(true,t=>requireCanonicalCheckpointProof(proof,f,t));
});
test('generation checkpoint detaches manifest ref before held external get',async t=>{
 const f=await fixture(t),ref=structuredClone(f.cp.ref),original=structuredClone(ref);await f.stage.begin(ref,async r=>{const data=await f.transport.get(r);ref.id='c'.repeat(64);ref.digest=ref.id;return data;});assert.deepEqual((await read(f.store.repository,STATE)).manifestRef,original);await assert.rejects(f.stage.begin(ref,r=>f.transport.get(r)));
});
test('generation checkpoint refuses another target handle or foreign compiler binding',async t=>{
 const f=await fixture(t),foreign=new LibraryFoundationStore(local(),{indexedDB:f.factory,name:'SYNTHETIC-foreign'});t.after(()=>foreign.repository.db?.close());await assert.rejects(new CanonicalGenerationCheckpointStage(f.publication,f.handle,{store:foreign,core:new BrowserNativeSyncCore(foreign.repository,{datasetId:f.core.datasetId,deviceId:'synthetic_foreign'})}).begin(f.cp.ref,r=>f.transport.get(r)));assert.equal(await read(f.store.repository,STATE),undefined);await f.stage.stageCheckpoint(f.cp.ref,r=>f.transport.get(r));const proof=await f.stage.validate();assert.throws(()=>readCanonicalCheckpointProof(proof,{store:f.store,core:f.sourceCore}),{code:'GENERATION_CHECKPOINT_PROOF_REQUIRED'});
});
test('generation checkpoint rejects incomplete immutable chain before authenticated state',async t=>{
 const f=await fixture(t),manifest={...f.cp.manifest,chain:'c'.repeat(64)},object=await protocolObject('checkpoint-manifest',bytes(manifest));await f.transport.putImmutable(object.ref,object.bytes);await assert.rejects(f.stage.stageCheckpoint(object.ref,r=>f.transport.get(r)));assert.equal((await read(f.store.repository,STATE)).phase,'staging');await assert.rejects(f.stage.validate(),{code:'GENERATION_CHECKPOINT_NOT_READY'});
});
test('generation checkpoint held manifest get times out and late completion cannot create state',async t=>{
 const f=await fixture(t);t.mock.timers.enable({apis:['setTimeout']});let release,entered;const reached=new Promise(r=>entered=r),held=new Promise(r=>release=r),pending=f.stage.begin(f.cp.ref,async()=>{entered();return held;});await reached;t.mock.timers.tick(30001);await assert.rejects(pending,{code:'BNS_GROUP_RESOURCE_LIMIT'});release(await f.transport.get(f.cp.ref));await Promise.resolve();t.mock.timers.reset();assert.equal(await read(f.store.repository,STATE),undefined);
});
test('generation checkpoint authenticates multiple durable pages from actual original Source appends',async t=>{
 const f=await fixture(t);for(let n=1;n<=5;n++){const q=capture((await f.producer.status()).epoch);q.messages[0].sourceMessageId='synthetic-added-'+n;q.messages[0].originalText='SYNTHETIC appended material '+n;q.messages[0].pageOrder=n+1;await f.producer.capture(q);}const cp=await buildCheckpoint(f.sourceCore,f.transport,{grouped:{store:f.producer}});assert.ok(cp.manifest.itemCount>32);let stopped=false;const stage=new CanonicalGenerationCheckpointStage(f.publication,f.handle,{...f,checkpoint:async()=>{if(!stopped){stopped=true;throw Error('SYNTHETIC stop after first page');}}});await assert.rejects(stage.stageCheckpoint(cp.ref,r=>f.transport.get(r)),/stop after first page/);assert.equal((await read(f.store.repository,STATE)).received,32);const next=new CanonicalGenerationCheckpointStage(f.publication,f.handle,f);const state=await next.stageCheckpoint(cp.ref,r=>f.transport.get(r));assert.equal(state.pages,Math.ceil(cp.manifest.itemCount/32));const proof=await next.validate();assert.equal(readCanonicalCheckpointProof(proof,f).items.length,cp.manifest.itemCount);await f.store.repository.transaction(true,t=>requireCanonicalCheckpointProof(proof,f,t));assert.equal((await f.store.snapshot()).records.length,0);
});
test('generation checkpoint valid immutable hashes do not prove an incomplete original causal group',async t=>{
 const f=await fixture(t),{checkpointItems}=await import('../core/browser-native-sync/checkpoints.js'),{digest}=await import('../core/browser-native-sync/value.js'),items=[];for await(const item of checkpointItems(f.cp.manifest,r=>f.transport.get(r)))items.push(item);const index=items.findIndex(x=>x.kind==='revision'&&x.operation.type==='sourceBootstrapMember');assert.ok(index>=0);items.splice(index,1);let chain='';for(const item of items)chain=await digest(bytes(chain+'\n'+new TextDecoder().decode(bytes(item))));const shard=await protocolObject('checkpoint-shard',bytes({magic:'PAIA-BNS',protocol:1,datasetId:f.core.datasetId,level:0,entries:items.map(item=>({kind:'inline',item}))}));await f.transport.putImmutable(shard.ref,shard.bytes);const manifest={...f.cp.manifest,root:shard.ref,level:0,itemCount:items.length,chain},object=await protocolObject('checkpoint-manifest',bytes(manifest));await f.transport.putImmutable(object.ref,object.bytes);assert.equal((await f.stage.stageCheckpoint(object.ref,r=>f.transport.get(r))).phase,'authenticated');await assert.rejects(f.stage.validate(),{code:'BNS_GROUP_INCOMPLETE'});assert.equal((await read(f.store.repository,STATE)).phase,'authenticated');
});
test('generation checkpoint v1 charges declared decoded transport bytes before decompression or fetch',async t=>{
 const f=await fixture(t),large=await protocolObject('checkpoint-shard',bytes({magic:'PAIA-BNS',protocol:1,datasetId:f.core.datasetId,level:0,entries:[],syntheticPadding:'x'.repeat(2*1024*1024)}),{codec:'gzip'});await f.transport.putImmutable(large.ref,large.bytes);const object=await protocolObject('checkpoint-manifest',bytes({...f.cp.manifest,root:large.ref,level:0}));await f.transport.putImmutable(object.ref,object.bytes);let gets=0;await assert.rejects(f.stage.stageCheckpoint(object.ref,ref=>{gets++;return f.transport.get(ref);}),{code:'BNS_GROUP_RESOURCE_LIMIT'});assert.equal(gets,1);assert.equal((await read(f.store.repository,STATE)).received,0);
});
test('generation checkpoint source base is fixed before first manifest read and refuses subsequent publication',async t=>{
 const f=await fixture(t),other=new ArchiveRepository(local(),{indexedDB:f.factory,name:'SYNTHETIC-other-generation'});t.after(()=>other.db?.close());const h=await f.publication.attach(other,{generationId:'generation_other',databaseId:'database_other'}),seal=await f.publication.seal(h,{sealId:'synthetic_seal',manifestId:'a'.repeat(64),graphDigest:'b'.repeat(64)});let once=true;await assert.rejects(f.stage.begin(f.cp.ref,async ref=>{const raw=await f.transport.get(ref);if(once){once=false;await f.publication.reserve(seal,'publish_other');await f.publication.recover();}return raw;}),{code:'GENERATION_CHANGED'});assert.equal(await read(f.store.repository,STATE),undefined);
});
test('generation checkpoint restart never refreshes a stale durable begin source base',async t=>{
 const f=await fixture(t);await f.stage.stageCheckpoint(f.cp.ref,r=>f.transport.get(r));const other=new ArchiveRepository(local(),{indexedDB:f.factory,name:'SYNTHETIC-other-generation'});t.after(()=>other.db?.close());const h=await f.publication.attach(other,{generationId:'generation_other',databaseId:'database_other'}),seal=await f.publication.seal(h,{sealId:'synthetic_seal',manifestId:'a'.repeat(64),graphDigest:'b'.repeat(64)});await f.publication.reserve(seal,'publish_other');await f.publication.recover();const next=new CanonicalGenerationCheckpointStage(f.publication,f.handle,f);await assert.rejects(next.stageCheckpoint(f.cp.ref,r=>f.transport.get(r)),{code:'GENERATION_CHANGED'});await assert.rejects(next.validate(),{code:'GENERATION_CHANGED'});
});

test('generation checkpoint rejects rewritten durable manifest identity before private proof',async t=>{
 const f=await fixture(t);await f.stage.stageCheckpoint(f.cp.ref,r=>f.transport.get(r));await f.store.repository.transaction(true,async t=>{const state=await t.get('meta',STATE);state.manifestRef.id='c'.repeat(64);state.manifestRef.digest=state.manifestRef.id;await t.put('meta',state);});await assert.rejects(f.stage.validate(),{code:'BNS_OBJECT_INTEGRITY'});assert.equal((await read(f.store.repository,STATE)).phase,'authenticated');
});

for(const version of [1,2])test('generation checkpoint authenticates original gzip manifest bytes on durable v'+version+' validation',async t=>{
 const f=await fixture(t),object=await protocolObject('checkpoint-manifest',bytes(f.cp.manifest),{codec:'gzip'});await f.transport.putImmutable(object.ref,object.bytes);await f.stage.stageCheckpoint(object.ref,r=>f.transport.get(r));if(version===1)await f.store.repository.transaction(true,async t=>{const row=await t.get('meta',STATE);await t.put('meta',{...row,version:1,manifestEncoded:Array.from(decodeCheckpointManifestStorage(row.version,row.manifestEncoded,row.manifestRef.encodedBytes))});},['meta']);const next=new CanonicalGenerationCheckpointStage(f.publication,f.handle,f),proof=await next.validate();assert.equal((await read(f.store.repository,STATE)).version,version);assert.equal(readCanonicalCheckpointProof(proof,f).manifestRef.id,object.ref.id);await f.store.repository.transaction(true,t=>requireCanonicalCheckpointProof(proof,f,t));
});
for(const defect of ['bytes','manifest'])test('generation checkpoint rejects durable manifest '+defect+' mismatch',async t=>{
 const f=await fixture(t);await f.stage.stageCheckpoint(f.cp.ref,r=>f.transport.get(r));await f.store.repository.transaction(true,async t=>{const state=await t.get('meta',STATE);if(defect==='bytes')state.manifestEncoded=state.manifestEncoded[0]==='A'?'B'+state.manifestEncoded.slice(1):'A'+state.manifestEncoded.slice(1);else state.manifest.parents=['c'.repeat(64)];await t.put('meta',state);});await assert.rejects(f.stage.validate());assert.equal((await read(f.store.repository,STATE)).phase,'authenticated');
});

const checkpointRows=r=>r.transaction(false,async tx=>Object.fromEntries(await Promise.all(r.stores.map(async name=>[name,await tx.all(name)]))));
async function proofFixture(t){
 const f=await fixture(t);await f.stage.stageCheckpoint(f.cp.ref,r=>f.transport.get(r));
 return {...f,proof:await f.stage.validate()};
}
for(const [name,requireProof]of [['apply',requireCanonicalCheckpointProof],['seal',requireCanonicalCheckpointProofForSeal],['input',requireCanonicalCheckpointInputProof]])test('generation checkpoint '+name+' reads item/page bodies once before preserving every terminal point read',async t=>{
 const f=await proofFixture(t),state=await read(f.store.repository,STATE),gets=[],original=IDBObjectStore.prototype.get;let transaction;
 t.mock.method(IDBObjectStore.prototype,'get',function(key){
  if(this.transaction===transaction&&this.name==='meta'&&typeof key==='string'&&(key.startsWith(PREFIX+'item:')||key.startsWith(PREFIX+'page:')))gets.push(key);
  return original.call(this,key);
 });
 await f.store.repository.transaction(true,async tx=>{
  transaction=tx.tx;await requireProof(f.proof,f,tx);
  assert.deepEqual(gets,[],'the complete prefix read must not be preceded by duplicate body gets');
 });
 const expected=[...Array.from({length:state.received},(_,n)=>PREFIX+'item:'+String(n).padStart(8,'0')),...Array.from({length:state.pages},(_,n)=>PREFIX+'page:'+String(n).padStart(8,'0'))];
 assert.deepEqual(gets,expected,'the terminal fence still physically reads every original item and page exactly once');
});
for(const family of ['item','page'])for(const defect of ['missing','changed','same-count-replacement','extra'])test('generation checkpoint complete prefix rejects '+family+' '+defect+' before returning proof and rolls back all tables',async t=>{
 const f=await proofFixture(t),before=await checkpointRows(f.store.repository),id=PREFIX+family+':00000000',extra=PREFIX+family+':99999999';let returned=false;
 await assert.rejects(f.store.repository.transaction(true,async tx=>{
  const row=await tx.get('meta',id);await tx.put('meta',{id:'synthetic-owner-write',value:true});
  if(defect==='missing'||defect==='same-count-replacement')await tx.delete('meta',id);
  if(defect==='changed')await tx.put('meta',{...row,synthetic:true});
  if(defect==='extra'||defect==='same-count-replacement')await tx.put('meta',{...row,id:extra});
  await requireCanonicalCheckpointProof(f.proof,f,tx);returned=true;
 }));
 assert.equal(returned,false);assert.deepEqual(await checkpointRows(f.store.repository),before);
});
for(const family of ['item','page'])for(const defect of ['key-value-mismatch','read-error'])test('generation checkpoint consumed '+family+' cursor '+defect+' cannot return proof or commit',async t=>{
 const f=await proofFixture(t),before=await checkpointRows(f.store.repository),id=PREFIX+family+':00000000',original=IDBObjectStore.prototype.openCursor;let transaction,injected=false,returned=false;
 // A key-path store cannot persist mismatched primary keys. Corrupt only the
 // consumed fake-IDB cursor delivery, never the owner or private proof methods.
 t.mock.method(IDBObjectStore.prototype,'openCursor',function(...args){
  const request=original.apply(this,args);
  if(this.transaction===transaction&&this.name==='meta')request.addEventListener('success',()=>{
   const cursor=request.result;if(injected||cursor?.key!==id)return;injected=true;
   if(defect==='key-value-mismatch')cursor.value={...cursor.value,id:id+':wrong'};
   else Object.defineProperty(cursor,'value',{get(){throw new DOMException('SYNTHETIC cursor delivery failure','UnknownError');}});
  });
  return request;
 });
 await assert.rejects(f.store.repository.transaction(true,async tx=>{
  transaction=tx.tx;await tx.put('meta',{id:'synthetic-owner-write',value:true});await requireCanonicalCheckpointProof(f.proof,f,tx);returned=true;
 }));
 assert.equal(injected,true);assert.equal(returned,false);assert.deepEqual(await checkpointRows(f.store.repository),before);
});
for(const family of ['item','page'])test('generation checkpoint repeated proof observes intervening '+family+' writes in the same transaction',async t=>{
 const f=await proofFixture(t),before=await checkpointRows(f.store.repository),id=PREFIX+family+':00000000';let returned=0;
 await assert.rejects(f.store.repository.transaction(true,async tx=>{
  await requireCanonicalCheckpointProof(f.proof,f,tx);returned++;
  await tx.put('meta',{id:'synthetic-owner-write',value:true});await tx.put('meta',{...await tx.get('meta',id),synthetic:true});
  await requireCanonicalCheckpointProof(f.proof,f,tx);returned++;
 }));
 assert.equal(returned,1);assert.deepEqual(await checkpointRows(f.store.repository),before);
});
for(const family of ['item','page'])for(const defect of ['missing','same-count-replacement'])test('generation checkpoint terminal still rejects late '+family+' '+defect+' after complete prefix validation',async t=>{
 const f=await proofFixture(t),before=await checkpointRows(f.store.repository),id=PREFIX+family+':00000000';let validated=false;
 await assert.rejects(f.store.repository.transaction(true,async tx=>{
  await requireCanonicalCheckpointProof(f.proof,f,tx);validated=true;const row=await tx.get('meta',id);
  await tx.put('meta',{id:'synthetic-owner-write',value:true});await tx.delete('meta',id);
  if(defect==='same-count-replacement')await tx.put('meta',{...row,id:PREFIX+family+':99999999'});
 }));
 assert.equal(validated,true);assert.deepEqual(await checkpointRows(f.store.repository),before);
});
test('generation checkpoint complete prefix reads retain the ordinary twoMiB transaction byte ceiling',async t=>{
 const f=await proofFixture(t),before=await checkpointRows(f.store.repository),id=PREFIX+'item:00000000';
 await assert.rejects(f.store.repository.transaction(true,async tx=>{
  await tx.put('meta',{...await tx.get('meta',id),syntheticPadding:'x'.repeat(2*1024*1024)});
  await requireCanonicalCheckpointProof(f.proof,f,tx);
 }),{code:'BNS_GROUP_RESOURCE_LIMIT'});
 assert.deepEqual(await checkpointRows(f.store.repository),before);
});
