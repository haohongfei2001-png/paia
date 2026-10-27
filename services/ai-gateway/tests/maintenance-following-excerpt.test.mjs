import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceServiceFixture} from './maintenance-client-fixture.mjs';
import {rows} from '../../../extension/tests/harness/original-complete.mjs';
import {CONTEXT_CARDS_ROW} from '../../../extension/core/context-cards.js';
import {DIRTY_PREFIX} from '../../../extension/core/ai-usage/delta.js';
import {TopicFormationService} from '../../../extension/core/topic-formation.js';
const read=(s,n,id)=>s.repository.transaction(false,t=>t.get(n,id));
const work=async(f,id,state)=>(await rows(f.s,'organizerWorkItems')).filter(r=>r.jobId===id&&r.state===state);
async function fixture(t){
 let topicId,inputId,excerpt;const payloads=[];
 const f=await maintenanceServiceFixture(t,{configure:async({local,configuration})=>{
  const topic=await local.s.createTopic({operationId:crypto.randomUUID(),name:'Synthetic nonempty excerpt following Topic'});topicId=topic.id;
  const block=(await local.s.snapshot()).library.blocks[0],input=await local.s.input(block.id);
  await local.s.addToTopics({operationId:crypto.randomUUID(),kind:'input',id:input.id,expectedRevision:input.revision,topicIds:[topic.id]});
  assert.equal((await read(local.s,'meta',CONTEXT_CARDS_ROW))?.items.length??0,0);
  const resolve=configuration.processing.resolve;configuration.processing={...configuration.processing,resolve:async(...args)=>{if(args[1].purpose==='ai-maintenance-payload')payloads.push(structuredClone(args[1]));return resolve(...args);}};
 },transformResponse:({value,payload})=>{
  assert.equal(payload.material.existingContextItems?.length??0,0);const relation=value.topic.relations.find(r=>r.topicId===topicId);assert.ok(relation);relation.relation='same';
  const input=payload.material.inputs[0];inputId=input.inputId;excerpt=input.body.slice(0,16);assert.ok(excerpt.length<input.body.length);
  const span=value.citations.length;value.citations.push({inputId,field:'body',start:0,end:excerpt.length});value.topic.entries=[{span,type:'idea',entryId:''}];value.topic.additional=[];
 }});return {f,payloads,details:()=>({topicId,inputId,excerpt})};
}
test('nonempty Topic excerpt defers unsent following Context with unchanged receipt and idempotent repeat',async t=>{
 const {f,payloads,details}=await fixture(t),before=(await rows(f.s,'thoughts')).map(e=>e.id),commit=TopicFormationService.prototype.commit;let original,originalDirty;
 t.mock.method(TopicFormationService.prototype,'commit',async function(...args){const result=await commit.apply(this,args);if(this.store===f.s){original=(await rows(f.s,'organizerUsage')).find(r=>r.executionKind==='service-planned');originalDirty=(await rows(f.s,'meta')).filter(r=>r.id.startsWith(DIRTY_PREFIX));}return result;});
 const result=await f.run();assert.equal(result.state,'PARTIAL',JSON.stringify(result));assert.ok(result.facets.some(x=>x.facet==='topic'&&x.state==='COMMITTED'),JSON.stringify(result));assert.equal(result.facets.filter(x=>x.facet==='context'&&x.state==='DEFERRED').length,2,JSON.stringify(result));
 const ack=await work(f,result.jobId,'ACKNOWLEDGED'),deferred=await work(f,result.jobId,'DEFERRED');assert.equal(ack.length,1);assert.equal(ack[0].unit.facet,'topic');assert.equal(deferred.length,2);for(const row of deferred){assert.equal(row.unit.facet,'context');assert.equal(row.retryCondition,'CONTEXT_MAPPING_UNAVAILABLE');const dirty=await read(f.s,'meta',DIRTY_PREFIX+row.unit.key);assert.ok(dirty.pendingFacets.includes('context'));assert.deepEqual(dirty,originalDirty.find(r=>r.id===dirty.id));}
 const created=(await rows(f.s,'thoughts')).filter(e=>!before.includes(e.id));assert.equal(created.length,1);assert.equal(created[0].thoughtText,details().excerpt);assert.equal(created[0].bodyBinding,'thought');assert.equal((await read(f.s,'meta',CONTEXT_CARDS_ROW))?.items.length??0,0);
 assert.ok(original);assert.equal(original.version,1);assert.equal(original.state,'PLANNED');assert.equal(original.attemptCount,0);assert.equal(original.spendState,'NOT_RESERVED');assert.deepEqual(await read(f.s,'organizerUsage',original.id),original);assert.equal(await read(f.s,'meta','aiu:dispatched:'+original.childId),undefined);assert.equal(payloads.filter(x=>x.childOperationId===original.childId).length,0);
 const job=await read(f.s,'organizerJobs',result.jobId);assert.equal(job.state,'VALIDATED');assert.equal(job.committedCoverage.length,1);const received=(await rows(f.s,'organizerUsage')).find(r=>r.jobId===result.jobId&&r.childId!==original.childId);assert.equal(received.state,'VALIDATED');assert.equal(received.attemptCount,1);assert.ok(received.operationReceiptId);
 const saved=await rows(f.s,'organizerWorkItems'),receipts=await rows(f.s,'organizerUsage');await f.run();assert.equal(f.physical(),1);assert.deepEqual(await rows(f.s,'organizerWorkItems'),saved);assert.deepEqual(await rows(f.s,'organizerUsage'),receipts);assert.equal(payloads.filter(x=>x.childOperationId===original.childId).length,0);
});
test('nonempty excerpt Topic ACK Source failure never defers its unsent following child',async t=>{
 const {f}=await fixture(t),before=await rows(f.s,'thoughts'),transaction=f.s.repository.transaction.bind(f.s.repository);let reached=false;
 f.s.repository.transaction=(write,fn,...rest)=>transaction(write,async tx=>{if(write){const put=tx.put.bind(tx);tx.put=async(name,row,...more)=>{const value=await put(name,row,...more);if(!reached&&name==='organizerWorkItems'&&row.state==='ACKNOWLEDGED'&&row.unit?.facet==='topic'){reached=true;const source=(await tx.all('records'))[0];source.value.originalText+=' SYNTHETIC Source drift';await put('records',source);}return value;};}return fn(tx);},...rest);
 try{const result=await f.run();assert.equal(reached,true);assert.ok(result.facets.some(x=>x.facet==='topic'&&x.state==='FAILED'),JSON.stringify(result));assert.equal((await work(f,result.jobId,'ACKNOWLEDGED')).length,0);assert.equal((await work(f,result.jobId,'DEFERRED')).length,0);assert.deepEqual(await rows(f.s,'thoughts'),before);assert.equal(f.physical(),1);}finally{f.s.repository.transaction=transaction;}
});
test('nonempty excerpt graph drift during following DEFER rolls back that disposition and retains Topic ACK',async t=>{
 const {f,payloads}=await fixture(t),before=new Set((await rows(f.s,'thoughts')).map(e=>e.id)),transaction=f.s.repository.transaction.bind(f.s.repository);let reached=false,placement;
 f.s.repository.transaction=(write,fn,...rest)=>transaction(write,async tx=>{if(write){const put=tx.put.bind(tx);tx.put=async(name,row,...more)=>{const value=await put(name,row,...more);if(!reached&&name==='organizerWorkItems'&&row.state==='DEFERRED'&&row.unit?.facet==='context'&&row.unit.key.startsWith('["placement",')){reached=true;placement=(await tx.all('placements')).find(p=>!before.has(p.entryId));assert.ok(placement);await put('placements',{...placement,excludedByUser:true});}return value;};}return fn(tx);},...rest);
 try{const result=await f.run();assert.equal(reached,true,JSON.stringify(result));assert.equal(result.state,'INVALID_REQUEST',JSON.stringify(result));const ack=await work(f,result.jobId,'ACKNOWLEDGED');assert.equal(ack.length,1);assert.equal(ack[0].unit.facet,'topic');assert.equal((await work(f,result.jobId,'DEFERRED')).length,0);assert.deepEqual(await read(f.s,'placements',placement.id),placement);const following=(await rows(f.s,'organizerUsage')).find(r=>r.executionKind==='service-planned');assert.equal(following.state,'PLANNED');assert.equal(following.attemptCount,0);assert.equal(payloads.filter(x=>x.childOperationId===following.childId).length,0);const saved=await rows(f.s,'organizerWorkItems');await f.run();assert.equal(f.physical(),1);assert.deepEqual(await rows(f.s,'organizerWorkItems'),saved);}finally{f.s.repository.transaction=transaction;}
});
