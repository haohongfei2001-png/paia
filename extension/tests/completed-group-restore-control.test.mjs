import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryFoundationStore} from '../core/thought-store.js';
import {local,capture} from './harness/thought-m1.mjs';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {buildCheckpoint,StagedSyncRestore} from '../core/browser-native-sync/checkpoints.js';
import {assertCompletedGroupedRestoreControl as check} from '../core/browser-native-sync/completed-group-restore-control.js';
import {assertGroupedCheckpointManifest} from '../core/browser-native-sync/group-checkpoint-manifest.js';
import {protocolObject} from '../core/browser-native-sync/segments.js';
import {bytes} from '../core/browser-native-sync/value.js';
import {protocolPhysicalId} from '../core/browser-native-sync/physical-key.js';
globalThis.IDBKeyRange=IDBKeyRange;
const frozen=value=>{if(value&&typeof value==='object'){for(const key of Reflect.ownKeys(value)){const d=Object.getOwnPropertyDescriptor(value,key);if(Object.hasOwn(d,'value'))frozen(d.value);}Object.freeze(value);}return value;};
async function fresh(device){const s=new LibraryFoundationStore(local(),{indexedDB:new IDBFactory()});await s.consent(true);await s.finishFoundation();return {s,core:new BrowserNativeSyncCore(s.repository,{datasetId:'SYNTHETIC_completed_group',deviceId:device})};}
const everything=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async name=>[name,await t.all(name)]))));
let fixture;
async function original(){
 if(!fixture)fixture=(async()=>{
  const source=await fresh('SYNTHETIC_source');source.s.sourceBootstrapJournal=new SourceBootstrapJournal(source.core);await source.s.capture(capture((await source.s.status()).epoch));
  const objects=new Map(),transport={async putImmutable(ref,value){objects.set(ref.id,value.slice());},async get(ref){return objects.get(ref.id)?.slice();}};
  const cp=await buildCheckpoint(source.core,transport,{grouped:{store:source.s}}),target=await fresh('SYNTHETIC_target'),restore=new StagedSyncRestore(target.core,{grouped:{store:target.s}});
  await restore.stageCheckpoint(cp.ref,ref=>transport.get(ref));await restore.activate();
  const id=protocolPhysicalId(target.core.prefix,restore.restoreId,'restore',[]),before=await target.core.transaction(false,t=>t.get('meta',id));
  let result;do{result=await restore.cleanup({limit:3});}while(!result.complete);
  const row=await target.core.transaction(false,t=>t.get('meta',id)),active=await target.core.transaction(false,t=>t.get('meta',target.core.prefix+'active'));
  return {source,target,restore,id,before,row,active,options:{prefix:target.core.prefix,datasetId:target.core.datasetId,active,namespace:active.namespace,epoch:null}};
 })();return fixture;
}
const attempt=async(row,options)=>check(frozen(row),frozen(options));
const refuses=(row,options,code='BNS_GROUP_CANONICAL_UNREPRESENTED')=>assert.rejects(attempt(row,options),{code});
test('actual original activated control refuses before cleanup and validates only after bounded cleanup without any write',async()=>{
 const f=await original(),before=await everything(f.target.s);await refuses(structuredClone(f.before),structuredClone(f.options));
 assert.equal(await attempt(structuredClone(f.row),structuredClone(f.options)),undefined);assert.deepEqual(await everything(f.target.s),before);
 await f.restore.activate();assert.deepEqual(await everything(f.target.s),before);assert.deepEqual(f.row.cleanup,{namespace:1,after:null,complete:true});
});
test('original historical counters can precede a later current plan, without becoming current-plan authority',async()=>{
 const f=await original(),row=structuredClone(f.row),options=structuredClone(f.options);row.base.generation=7;row.base.ownerGeneration=11;
 assert.equal(await attempt(row,options),undefined);assert.equal('plan'in options,false);
});
test('incomplete phases, cleanup cursors and partial namespaces remain denied',async()=>{
 const f=await original();for(const patch of [{phase:'staging'},{phase:'validated'},{phase:'abandoned'},{cleanup:{namespace:0,after:null,complete:true}},{cleanup:{namespace:1,after:'SYNTHETIC_cursor',complete:true}},{cleanup:{namespace:1,after:null,complete:false}},{cleanup:{namespace:2,after:null,complete:true}}])await refuses({...structuredClone(f.row),...patch},structuredClone(f.options));
});
test('stage key, replay, active manifest, graph and receipt counts must bind exactly',async()=>{
 const f=await original();for(const patch of [{id:f.row.id+'extra'},{id:protocolPhysicalId(f.options.prefix,f.active.namespace,'restore',[])},{replayId:'SYNTHETIC_other_replay'},{manifestId:'a'.repeat(64)},{graphDigest:'b'.repeat(64)},{received:f.row.received+1},{received:-1}])await refuses({...structuredClone(f.row),...patch},structuredClone(f.options));
 for(const patch of [{id:f.active.id+'extra'},{namespace:'SYNTHETIC_other_namespace'},{manifestId:'c'.repeat(64)},{graphDigest:'d'.repeat(64)}])await refuses(structuredClone(f.row),{...structuredClone(f.options),active:{...f.active,...patch}});
});
test('base namespace, original fence, consent and actual recovery epoch are checked independently',async()=>{
 const f=await original();for(const change of [b=>b.namespace=f.active.namespace,b=>b.generation=-1,b=>b.ownerGeneration=0.5,b=>b.fence.namespace='SYNTHETIC_other_base',b=>b.fence.epoch='SYNTHETIC_other_epoch',b=>b.fence.marker=1,b=>b.settings.enabled=false,b=>b.settings.consentVersion=0,b=>b.settings.epoch=-1,b=>b.settings.consentAt=null]){const row=structuredClone(f.row);change(row.base);await refuses(row,structuredClone(f.options));}
 const epoch='SYNTHETIC_new_epoch',row=structuredClone(f.row);row.base.fence.epoch=epoch;assert.equal(await attempt(row,{...structuredClone(f.options),epoch}),undefined);await refuses(structuredClone(f.row),{...structuredClone(f.options),epoch});
});
test('original immutable identity detects an altered valid manifest rather than trusting copied digest fields',async()=>{
 const f=await original(),row=structuredClone(f.row);row.manifest.parents=['f'.repeat(64)];await refuses(row,structuredClone(f.options),'BNS_OBJECT_INTEGRITY');
 const another=structuredClone(f.row);another.manifest.ownerScope.families[0].digest='e'.repeat(64);await refuses(another,structuredClone(f.options),'BNS_OBJECT_INTEGRITY');
 const length=structuredClone(f.row);length.manifestRef.decodedBytes++;await refuses(length,structuredClone(f.options),'BNS_OBJECT_INTEGRITY');
 const wrong=structuredClone(f.row);wrong.manifestRef.id='a'.repeat(64);await refuses(wrong,structuredClone(f.options),'BNS_OBJECT_REF_INVALID');
});
test('valid gzip reference is refused by this finite local control profile without reading a transport',async()=>{
 const f=await original(),row=structuredClone(f.row),object=await protocolObject('checkpoint-manifest',bytes(row.manifest),{codec:'gzip'});row.manifestRef=object.ref;row.manifestId=object.ref.id;
 await refuses(row,{...structuredClone(f.options),active:{...f.active,manifestId:object.ref.id}});
});
test('unknown fields and malformed original manifest/coverage remain denied',async()=>{
 const f=await original();for(const change of [r=>r.extra=true,r=>r.cleanup.extra=true,r=>r.base.fence.extra=true,r=>r.base.settings.extra=true]){const row=structuredClone(f.row);change(row);await refuses(row,structuredClone(f.options));}
 for(const [change,code]of [[r=>r.manifest.itemCount=385,'BNS_GROUP_CANONICAL_UNREPRESENTED'],[r=>r.manifest.ownerScope.profile='other','BNS_GROUP_SCOPE_INVALID'],[r=>r.manifest.coverage[0].version=999,'BNS_REQUIRED_CODEC_UNSUPPORTED'],[r=>r.manifest.root.kind='segment','BNS_GROUP_CANONICAL_UNREPRESENTED']]){const row=structuredClone(f.row);change(row);await refuses(row,structuredClone(f.options),code);}
});
test('accessors, hidden/symbol fields and sparse nested arrays are refused before getter execution',async()=>{
 const f=await original();let reads=0;for(const select of [r=>[r,'manifest'],r=>[r.base,'settings'],r=>[r.manifest,'ownerScope'],r=>[r.manifestRef,'digest'],r=>[r.manifest.ownerScope.families,'0']]){const row=structuredClone(f.row),[owner,key]=select(row);Object.defineProperty(owner,key,{enumerable:true,configurable:true,get(){reads++;throw Error('SYNTHETIC unpaid getter');}});await refuses(row,structuredClone(f.options));}
 for(const change of [r=>Object.defineProperty(r.cleanup,'hidden',{value:true}),r=>r.manifestRef[Symbol('extra')]=true,r=>delete r.manifest.coverage[0]]){const row=structuredClone(f.row);change(row);await refuses(row,structuredClone(f.options));}assert.equal(reads,0);
});
test('mutable or inherited data cannot cross the asynchronous original hash boundary',async()=>{
 const f=await original();await assert.rejects(check(structuredClone(f.row),frozen(structuredClone(f.options))),{code:'BNS_GROUP_CANONICAL_UNREPRESENTED'});
 const row=structuredClone(f.row);Object.setPrototypeOf(row.base,{settings:row.base.settings});await refuses(row,structuredClone(f.options));
});

test('original manifest refusal short-circuits before reading Core dataset identity',async()=>{
 const f=await original();let reads=0;const core={get datasetId(){reads++;throw Error('SYNTHETIC Core getter');}};
 for(const value of [null,{magic:'other'},{...structuredClone(f.row.manifest),magic:'other'},{...structuredClone(f.row.manifest),protocol:2}])assert.throws(()=>assertGroupedCheckpointManifest(value,{core}),{code:'BNS_CHECKPOINT_INVALID'});
 assert.equal(reads,0);assert.equal(assertGroupedCheckpointManifest(f.row.manifest,{core:f.target.core}),undefined);
});
