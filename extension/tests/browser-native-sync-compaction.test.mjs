import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {ArchiveRepository} from '../core/idb-repository.js';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {buildCheckpoint,StagedSyncRestore} from '../core/browser-native-sync/checkpoints.js';
import {packOperations,publishObjects,readSegmentDescriptor} from '../core/browser-native-sync/segments.js';
import {planCompaction} from '../core/browser-native-sync/compaction.js';
globalThis.IDBKeyRange=IDBKeyRange;
const datasetId='dataset_compaction_01',prompt=text=>({id:'prompt-reuse:v1',version:1,pins:[],overrides:[{id:'manual:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',text,hidden:false}],splits:[]});
async function device(deviceId){const repository=new ArchiveRepository({}, {indexedDB:new IDBFactory(),name:'synthetic-compaction',thoughtLibrary:true,ia:true,smartFilter:true});await repository.open();return new BrowserNativeSyncCore(repository,{datasetId,deviceId});}
async function local(core,text){const p=await core.prepare([{type:'promptPreferences',value:prompt(text)}]);await core.commit(p);return p.operations[0];}
function cloud(){const objects=new Map();return {objects,async putImmutable(ref,value){objects.set(ref.id,value.slice());},async get(ref){const value=objects.get(ref.id);if(!value)throw Error('missing synthetic object');return value.slice();}};}
async function staged(cp,transport){const target=await device('device_restore_1'),r=new StagedSyncRestore(target);await r.stageCheckpoint(cp.ref,ref=>transport.get(ref));return r;}
test('BNS compaction requires two complete comparable generations and retains uncovered tails/pins',async()=>{
 const a=await device('device_alpha_01'),transport=cloud(),first=await local(a,'first'),cp1=await buildCheckpoint(a,transport),second=await local(a,'second'),cp2=await buildCheckpoint(a,transport,{parents:[cp1.ref.id]});
 const covered=await publishObjects(packOperations([first,second],{datasetId,producer:a.deviceId}),transport),third=await local(a,'uncovered tail'),tail=await publishObjects(packOperations([third],{datasetId,producer:a.deviceId}),transport),older=await staged(cp1,transport),newer=await staged(cp2,transport);
 const plan=await planCompaction({older,newer,descriptors:[...covered,...tail],get:ref=>transport.get(ref)});assert.equal(plan.performedDeletion,false);assert.ok(plan.eligible.some(ref=>ref.id===covered[0].id));assert.ok(!plan.eligible.some(ref=>ref.id===tail[0].id));assert.equal(plan.retained[0].reason,'uncovered_tail');
 const pinned=await planCompaction({older,newer,descriptors:covered,get:ref=>transport.get(ref),pinned:[covered[0].id]});assert.deepEqual(pinned.eligible,[]);assert.equal(pinned.retained[0].reason,'active_restore_pin');
 await assert.rejects(planCompaction({older,newer:older,descriptors:covered,get:ref=>transport.get(ref)}),{code:'BNS_COMPACTION_REDUNDANCY'});
 for(const ref of plan.eligible)transport.objects.delete(ref.id);const restored=await staged(cp2,transport);assert.deepEqual(await restored.stage.state(),await newer.stage.state());
});
test('BNS compaction refuses retaining a pre-purge body and stale device operations stay fenced',async()=>{
 const a=await device('device_alpha_01'),transport=cloud(),body=await local(a,'must disappear'),pre=await buildCheckpoint(a,transport),descriptors=await publishObjects(packOperations([body],{datasetId,producer:a.deviceId}),transport);
 const deletion=await a.prepare([{type:'promptPreferences',entityId:'prompt-reuse:v1',kind:'purge'}]);await a.commit(deletion);const first=await buildCheckpoint(a,transport,{parents:[pre.ref.id]}),before=await staged(pre,transport),after=await staged(first,transport);
 await assert.rejects(planCompaction({older:before,newer:after,descriptors,get:ref=>transport.get(ref)}),{code:'BNS_COMPACTION_PURGE_RETENTION'});
 const second=await buildCheckpoint(a,transport,{parents:[first.ref.id]}),latest=await staged(second,transport),plan=await planCompaction({older:after,newer:latest,descriptors,get:ref=>transport.get(ref)});assert.ok(plan.eligible.length);
 for(const ref of plan.eligible)transport.objects.delete(ref.id);const restored=await staged(second,transport);await restored.stage.receive(body);assert.equal((await restored.stage.state())[0].purged,true);assert.deepEqual((await restored.stage.state())[0].versions,[]);
});
test('BNS compaction cannot borrow later tail receipts from an older checkpoint manifest',async()=>{
 const a=await device('device_alpha_01'),transport=cloud();await local(a,'first');const cp1=await buildCheckpoint(a,transport);await local(a,'second');const cp2=await buildCheckpoint(a,transport,{parents:[cp1.ref.id]});const tail=await local(a,'tail not in retained checkpoint'),descriptors=await publishObjects(packOperations([tail],{datasetId,producer:a.deviceId}),transport);
 const older=await staged(cp1,transport),withTail=await staged(cp2,transport);await withTail.reconcileTail([tail]);
 await assert.rejects(planCompaction({older,newer:withTail,descriptors,get:ref=>transport.get(ref)}),{code:'BNS_COMPACTION_UNVERIFIED'});assert.ok(transport.objects.has(descriptors[0].id));
 const cp3=await buildCheckpoint(a,transport,{parents:[cp2.ref.id]}),cleanPrevious=await staged(cp2,transport),completeNext=await staged(cp3,transport),plan=await planCompaction({older:cleanPrevious,newer:completeNext,descriptors,get:ref=>transport.get(ref)});assert.ok(plan.eligible.some(ref=>ref.id===descriptors[0].id));
});
test('BNS concurrent tail generation change invalidates in-progress compaction proof',async()=>{
 const a=await device('device_alpha_01'),transport=cloud(),root=await local(a,'first'),cp1=await buildCheckpoint(a,transport);await local(a,'second');const cp2=await buildCheckpoint(a,transport,{parents:[cp1.ref.id]}),tail=await local(a,'late tail'),descriptors=await publishObjects(packOperations([root],{datasetId,producer:a.deviceId}),transport),older=await staged(cp1,transport),newer=await staged(cp2,transport);let changed=false;
 await assert.rejects(planCompaction({older,newer,descriptors,get:async ref=>{if(!changed){changed=true;await newer.reconcileTail([tail]);}return transport.get(ref);}}),{code:'BNS_COMPACTION_UNVERIFIED'});assert.ok(transport.objects.has(descriptors[0].id));
});
for(const reason of ['uncovered','pinned'])test('BNS shared chunks required by '+reason+' descriptors survive global compaction planning',async()=>{
 const a=await device('device_alpha_01'),transport=cloud(),first=await local(a,'a'.repeat(190000)),cp1=await buildCheckpoint(a,transport);let cp2;
 if(reason==='uncovered')cp2=await buildCheckpoint(a,transport,{parents:[cp1.ref.id]});const second=await local(a,'a'.repeat(190000));if(reason==='pinned')cp2=await buildCheckpoint(a,transport,{parents:[cp1.ref.id]});
 const covered=await publishObjects(packOperations([first],{datasetId,producer:a.deviceId,target:64*1024}),transport),tail=await publishObjects(packOperations([second],{datasetId,producer:a.deviceId,target:64*1024}),transport),older=await staged(cp1,transport),newer=await staged(cp2,transport);
 const plan=await planCompaction({older,newer,descriptors:[...covered,...tail],get:ref=>transport.get(ref),pinned:reason==='pinned'?[tail[0].id]:[]});assert.ok(plan.retained.some(row=>row.descriptor===tail[0].id));
 for(const ref of plan.eligible)transport.objects.delete(ref.id);assert.deepEqual(await readSegmentDescriptor(tail[0],ref=>transport.get(ref),{datasetId}),[second]);
});
test('BNS a pinned checkpoint root still traverses and protects its complete descendant graph',async()=>{
 const a=await device('device_alpha_01'),transport=cloud(),first=await local(a,'中'.repeat(190000)),cp1=await buildCheckpoint(a,transport),cp2=await buildCheckpoint(a,transport,{parents:[cp1.ref.id]}),descriptors=await publishObjects(packOperations([first],{datasetId,producer:a.deviceId}),transport),older=await staged(cp1,transport),newer=await staged(cp2,transport);
 const plan=await planCompaction({older,newer,descriptors,get:ref=>transport.get(ref),pinned:[cp1.manifest.root.id]});for(const ref of plan.eligible)transport.objects.delete(ref.id);const survived=await staged(cp2,transport);assert.deepEqual(await survived.stage.state(),await newer.stage.state());
 await assert.rejects(planCompaction({older,newer,descriptors:[],get:ref=>transport.get(ref),pinned:['a'.repeat(64)]}),{code:'BNS_COMPACTION_PIN_UNKNOWN'});
});
for(const corrupt of [false,true])test('BNS missing or corrupt retained manifest refuses compaction '+corrupt,async()=>{
 const a=await device('device_alpha_01'),transport=cloud(),first=await local(a,'first'),cp1=await buildCheckpoint(a,transport),cp2=await buildCheckpoint(a,transport,{parents:[cp1.ref.id]}),descriptors=await publishObjects(packOperations([first],{datasetId,producer:a.deviceId}),transport),older=await staged(cp1,transport),newer=await staged(cp2,transport);
 if(corrupt){const bytes=transport.objects.get(cp2.ref.id);bytes[0]^=1;}else{transport.objects.delete(cp1.ref.id);transport.objects.delete(cp2.ref.id);}
 await assert.rejects(planCompaction({older,newer,descriptors,get:ref=>transport.get(ref)}));assert.ok(transport.objects.has(descriptors[0].id));
});
test('BNS caller mutation cannot substitute an uncovered descriptor after covered validation',async()=>{
 const a=await device('device_alpha_01'),transport=cloud(),first=await local(a,'covered'),cp1=await buildCheckpoint(a,transport),cp2=await buildCheckpoint(a,transport,{parents:[cp1.ref.id]}),covered=await publishObjects(packOperations([first],{datasetId,producer:a.deviceId}),transport),second=await local(a,'uncovered tail'),tail=await publishObjects(packOperations([second],{datasetId,producer:a.deviceId}),transport),older=await staged(cp1,transport),newer=await staged(cp2,transport),mutable=structuredClone(covered[0]);let changed=false;
 const plan=await planCompaction({older,newer,descriptors:[mutable],get:async ref=>{if(!changed&&ref.id===covered[0].id){changed=true;Object.assign(mutable,tail[0]);}return transport.get(ref);}});
 assert.equal(changed,true);assert.ok(plan.eligible.some(ref=>ref.id===covered[0].id));assert.ok(!plan.eligible.some(ref=>ref.id===tail[0].id));for(const ref of plan.eligible)transport.objects.delete(ref.id);assert.deepEqual(await readSegmentDescriptor(tail[0],ref=>transport.get(ref),{datasetId}),[second]);
});
test('BNS entire descriptor inventory and pins are captured before the first await',async()=>{
 const a=await device('device_alpha_01'),transport=cloud(),first=await local(a,'first'),cp1=await buildCheckpoint(a,transport),second=await local(a,'second'),cp2=await buildCheckpoint(a,transport,{parents:[cp1.ref.id]}),one=await publishObjects(packOperations([first],{datasetId,producer:a.deviceId}),transport),two=await publishObjects(packOperations([second],{datasetId,producer:a.deviceId}),transport),older=await staged(cp1,transport),newer=await staged(cp2,transport),descriptors=[structuredClone(one[0])],pinned=[one[0].id];let changed=false;
 const plan=await planCompaction({older,newer,descriptors,pinned,get:async ref=>{if(!changed){changed=true;descriptors.push(two[0]);pinned.length=0;}return transport.get(ref);}});
 assert.equal(changed,true);assert.deepEqual(plan.eligible,[]);assert.deepEqual(plan.retained,[{descriptor:one[0].id,reason:'active_restore_pin'}]);
});
