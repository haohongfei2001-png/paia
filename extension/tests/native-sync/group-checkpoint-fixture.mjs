import {nativeFilterIntentFixture} from './filter-intent-fixture.mjs';
export function nativeGroupCheckpointFixture(source){
 const remove=["import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';","import {LibraryFoundationStore} from '../core/thought-store.js';","import {local,capture} from './harness/thought-m1.mjs';","import {inputEdit} from './harness/thought-m1.mjs';","globalThis.IDBKeyRange=IDBKeyRange;"];
 for(const text of remove){if(source.split(text).length!==2)throw Error('GROUP_FIXTURE_IMPORT_CHANGED');source=source.replace(text,'');}
 const before="async function fresh(device){const s=new LibraryFoundationStore(local(),{indexedDB:new IDBFactory()});await s.consent(true);await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic_source_bootstrap',deviceId:device});return {s,core};}";
 if(source.split(before).length!==2)throw Error('GROUP_FIXTURE_FRESH_CHANGED');source=source.replace(before,"async function fresh(device){const s=store('bns-group-native-'+(++sequence));await s.consent(true);await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic_source_bootstrap',deviceId:device});return {s,core};}");
 source+="\nimport {setup} from './harness/thought-m1.mjs';\nimport {inputEdit,capture} from './harness/thought-m1.mjs';";
 let fixture=nativeFilterIntentFixture(source).replace("command==='filter-intent-matrix'","command==='group-checkpoint-matrix'");
 return fixture+`
const groupPrevious=globalThis.__bnsNative;
globalThis.__bnsNative={...groupPrevious,async run(command,args={}){
 if(command==='group-checkpoint-profile')return groupMeasurements;
 if(command==='group-checkpoint-stage'){
  const a=await portfolio(),objects=new Map(),transport={async putImmutable(ref,data){objects.set(ref.id,data.slice());},async get(ref){return objects.get(ref.id).slice();}},cp=await buildCheckpoint(a.core,transport,{grouped:{store:a.s}});
  const s=store('bns-group-durable');await s.consent(true);await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:a.core.datasetId,deviceId:'synthetic_group_receiver'}),r=new StagedSyncRestore(core,{grouped:{store:s},checkpoint:async(name,n)=>{if(name==='staged-item'&&n===3)throw Error('SYNTHETIC staged restart');}});
  await assert.rejects(r.stageCheckpoint(cp.ref,x=>transport.get(x)),e=>e.message==='SYNTHETIC staged restart');assert.equal((await s.snapshot()).records.length,0);
  return {restoreId:r.restoreId,ref:cp.ref,objects:[...objects].map(([id,raw])=>[id,Array.from(raw)]),expected:await a.s.snapshot(),before:await canonical(s)};
 }
 if(command==='group-checkpoint-activate'){
  const s=store('bns-group-durable');await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic_source_bootstrap',deviceId:'synthetic_group_receiver'}),r=new StagedSyncRestore(core,{restoreId:args.restoreId,grouped:{store:s}}),objects=new Map(args.objects.map(([id,raw])=>[id,new Uint8Array(raw)]));
  assert.deepEqual(await canonical(s),args.before);await r.stageCheckpoint(args.ref,ref=>objects.get(ref.id).slice());assert.equal((await s.snapshot()).records.length,0);await r.activate();const after=await s.snapshot();assert.deepEqual(after.records,args.expected.records);assert.deepEqual(after.library.blocks,args.expected.library.blocks);assert.deepEqual(await all(core),[]);return {restoreId:args.restoreId,canonical:await canonical(s),active:await core.namespace()};
 }
 if(command==='group-checkpoint-ack'){
  const s=store('bns-group-durable');await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic_source_bootstrap',deviceId:'synthetic_group_receiver'}),r=new StagedSyncRestore(core,{restoreId:args.restoreId,grouped:{store:s}});
  assert.deepEqual(await canonical(s),args.canonical);assert.equal((await r.activate()).namespace,args.active);assert.deepEqual(await canonical(s),args.canonical);assert.deepEqual(await all(core),[]);return {atomic:true,duplicate:true,noEcho:true,active:args.active};
 }
 return groupPrevious.run(command,args);
}};
`;
}
