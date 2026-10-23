import test from 'node:test';
import assert from 'node:assert/strict';
import {roundTrip,device,read,snapshot,put,publish,shadow,activate,binding} from './harness/context-mutation-shadow.mjs';
import {capture} from './harness/thought-m1.mjs';
import {fakeGoogleCheckpointHTTP} from './harness/checkpoint-publication-http.mjs';
import {IDBObjectStore} from './vendor/fake-indexeddb/build/esm/index.js';
import {GroupedCheckpointRestore} from '../core/browser-native-sync/group-checkpoint.js';
test('NOW real adapter → closed A → protected shadow → publish → cold original Context move/reorder/undo/edit → fresh C',t=>roundTrip(t,false));
async function fixture(t){const a=await device(t);await a.s.capture(capture((await a.s.status()).epoch));const c=put();await a.service.change(c);const cloud=fakeGoogleCheckpointHTTP(binding);await publish(a,cloud);const b=await shadow(t,cloud);return {a,b,c};}
test('last typed protocol write failure rolls back canonical Context, Source, receipt and replay activation',async t=>{
 const {b}=await fixture(t),before=await snapshot(b),original=IDBObjectStore.prototype.put;let hit=false;
 IDBObjectStore.prototype.put=function(value,...rest){if(!hit&&this.transaction.db===b.s.repository.db&&this.name==='meta'&&value.operation?.type==='contextMutationCommit'){hit=true;throw Error('SYNTHETIC Context protocol write failure');}return original.call(this,value,...rest);};
 try{await assert.rejects(b.restore.activate());}finally{IDBObjectStore.prototype.put=original;}assert.equal(hit,true);assert.deepEqual(await snapshot(b),before);assert.deepEqual(await b.publication.active(),{state:'empty'});
});
test('a cold original grouped owner requires exact revalidation and restores the same command once',async t=>{
 const {b,c}=await fixture(t),cold=new GroupedCheckpointRestore(b.core,{store:b.s,restoreId:b.restore.restoreId}),before=await snapshot(b);await assert.rejects(cold.activate());assert.deepEqual(await snapshot(b),before);
 const proof=await b.stage.validate();await cold.stageCanonicalGeneration(proof);await cold.activate();const after=await snapshot(b);await cold.activate();assert.deepEqual(await snapshot(b),after);assert.equal(after.operationReceipts.filter(row=>row.id==='context:'+c.operationId).length,1);await cold.prepareCanonicalGenerationPublication(proof);await b.publication.sealOriginalCheckpoint(b.handle,cold,proof);
});
test('changed actual Context after publication qualification cannot activate its former sealed graph',async t=>{
 const {b}=await fixture(t);await b.restore.activate();await b.restore.prepareCanonicalGenerationPublication(b.proof);const row=await read(b),tx=b.s.repository.db.transaction(['meta'],'readwrite'),done=new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});tx.objectStore('meta').put({...row,items:row.items.map(item=>({...item,body:'SYNTHETIC unrepresented late body'}))});await done;const before=await snapshot(b);await assert.rejects(b.publication.sealOriginalCheckpoint(b.handle,b.restore,b.proof));assert.deepEqual(await snapshot(b),before);assert.deepEqual(await b.publication.active(),{state:'empty'});
});
import {buildGroupedCheckpoint} from '../core/browser-native-sync/group-checkpoint.js';
test('original native current Mixed remains unavailable in the non-native fixture without publishing objects',async t=>{
 const a=await device(t);await a.s.capture(capture((await a.s.status()).epoch));await a.service.change(put());const objects=new Map(),transport={putImmutable:async(ref,raw)=>objects.set(ref.id,raw.slice()),get:async ref=>objects.get(ref.id)?.slice()};
 await assert.rejects(buildGroupedCheckpoint(a.core,transport,{store:a.s,currentMixedProjection:true}),{code:'BNS_HUMAN_RETENTION_REQUIRED'});assert.equal(objects.size,0);
});
import {prepareGroupCheckpointPlan} from '../core/browser-native-sync/group-checkpoint-plan.js';
import {prepareGroupScope} from '../core/browser-native-sync/group-checkpoint-scope.js';
import {assertCurrentContextSnapshot} from '../core/browser-native-sync/manual-context-current-snapshot.js';
test('actual typed metadata and physical rows pass only the Context snapshot component and altered epoch proof refuses',async t=>{
 const a=await device(t),c=put();await a.service.change(c);await a.service.change({...c,operationId:crypto.randomUUID(),expectedRevision:1,body:'SYNTHETIC exact next body'});
 const operations=[];for await(const r of a.core.rows('revision'))operations.push(r.operation);const plan=await prepareGroupCheckpointPlan(a.core,operations),scope=await prepareGroupScope(plan,{store:a.s}),meta=await a.s.repository.transaction(false,t=>t.all('meta')),namespace=await a.core.transaction(false,t=>a.core.bind(t)),raw={namespace,groupMeta:meta,points:{'recovery-restore-epoch':null}};
 const rows=new Map(meta.map(r=>[r.id,r]));assert.doesNotThrow(()=>assertCurrentContextSnapshot(a.core,scope,plan,raw,rows));assert.equal(rows.has('context-cards:v1'),false);
 const automatic=new Map(meta.map(r=>[r.id,structuredClone(r)]));automatic.get('context-cards:v1').items[0].origin='automatic';assert.throws(()=>assertCurrentContextSnapshot(a.core,scope,plan,raw,automatic),{code:'BNS_CONTEXT_LINEAGE_UNAVAILABLE'});
 const changed=new Map(meta.map(r=>[r.id,structuredClone(r)])),mapping=await a.core.read('contextMutationEpoch',c.itemId);changed.set(mapping.id,{...mapping,epoch:'SYNTHETIC wrong epoch'});assert.throws(()=>assertCurrentContextSnapshot(a.core,scope,plan,raw,changed));assert.deepEqual(await a.s.repository.transaction(false,t=>t.all('meta')),meta);
});
import {captureCurrentContextLineage,measureCurrentContextLineage,fenceCurrentContextLineage} from '../core/browser-native-sync/context-current-lineage.js';
test('a forged native cut cannot qualify automatic Context or create retained lineage',async t=>{
 const a=await device(t),raw={groupMeta:[{id:'context-cards:v1',items:[{origin:'automatic'}]}],points:{}};
 await assert.rejects(captureCurrentContextLineage({},a.s,a.core,{}, {},raw),{code:'BNS_HUMAN_PROJECTION_REQUIRED'});
 assert.equal(measureCurrentContextLineage(raw),null);await assert.rejects(fenceCurrentContextLineage(a.core,a.s,{}, {},raw),{code:'BNS_CONTEXT_LINEAGE_UNAVAILABLE'});
});
