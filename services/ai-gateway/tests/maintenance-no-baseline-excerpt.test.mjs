import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceServiceFixture} from './maintenance-client-fixture.mjs';
import {rows} from '../../../extension/tests/harness/original-complete.mjs';
import {CONTEXT_CARDS_ROW} from '../../../extension/core/context-cards.js';
import {DIRTY_PREFIX} from '../../../extension/core/ai-usage/delta.js';
import {TopicFormationService} from '../../../extension/core/topic-formation.js';
const read=(s,n,id)=>s.repository.transaction(false,t=>t.get(n,id));
const work=async(f,id,state)=>(await rows(f.s,'organizerWorkItems')).filter(r=>r.jobId===id&&r.state===state);
async function excerptFixture(t,existing=false){
 let topicId,inputId,excerpt;
 const f=await maintenanceServiceFixture(t,{configure:async({local})=>{
  if(existing){const topic=await local.s.createTopic({operationId:crypto.randomUUID(),name:'Synthetic existing identity without Context baseline'});topicId=topic.id;}
  assert.equal((await read(local.s,'meta',CONTEXT_CARDS_ROW))?.items.length??0,0);
 },transformResponse:({value,payload})=>{
  assert.equal(payload.material.existingContextItems?.length??0,0);
  if(existing){const relation=value.topic.relations.find(r=>r.topicId===topicId);assert.ok(relation);relation.relation='same';}
  const input=payload.material.inputs[0];inputId=input.inputId;excerpt=input.body.slice(0,16);assert.ok(excerpt.length<input.body.length);
  const span=value.citations.length;value.citations.push({inputId,field:'body',start:0,end:excerpt.length});value.topic.entries=[{span,type:'idea',entryId:''}];value.topic.additional=[];
 }});return {f,details:()=>({topicId,inputId,excerpt})};
}
for(const existing of [false,true])test('no-baseline '+(existing?'existing':'new')+' Topic excerpt commits Topic and records Context mapping DEFER',async t=>{
 const {f,details}=await excerptFixture(t,existing),before=new Set((await rows(f.s,'thoughts')).map(e=>e.id)),result=await f.run(),{inputId,excerpt}=details();
 assert.equal(result.state,'PARTIAL',JSON.stringify(result));assert.ok(result.facets.some(x=>x.facet==='topic'&&x.state==='COMMITTED'),JSON.stringify(result));
 const ack=await work(f,result.jobId,'ACKNOWLEDGED');assert.equal(ack.length,1);assert.equal(ack[0].unit.facet,'topic');const created=(await rows(f.s,'thoughts')).filter(e=>!before.has(e.id));assert.equal(created.length,1);assert.equal(created[0].bodyBinding,'thought');assert.equal(created[0].thoughtText,excerpt);
 assert.ok(result.facets.some(x=>x.facet==='context'&&x.state==='DEFERRED'),JSON.stringify(result));const pending=await work(f,result.jobId,'DEFERRED');assert.equal(pending.length,1);assert.equal(pending[0].unit.facet,'context');assert.equal(pending[0].retryCondition,'CONTEXT_MAPPING_UNAVAILABLE');assert.deepEqual((await read(f.s,'meta',DIRTY_PREFIX+JSON.stringify(['input',inputId]))).pendingFacets,['context']);assert.equal((await read(f.s,'meta',CONTEXT_CARDS_ROW))?.items.length??0,0);
 const job=await read(f.s,'organizerJobs',result.jobId);assert.equal(job.state,'VALIDATED');assert.equal(job.committedCoverage.length,1);const receipt=await read(f.s,'organizerUsage','aiu:attempt:'+job.childIds[0]);assert.equal(receipt.state,'VALIDATED');assert.equal(receipt.attemptCount,1);assert.equal(receipt.operationReceiptId.length>0,true);const saved=await rows(f.s,'organizerWorkItems');await f.run();assert.equal(f.physical(),1);assert.deepEqual(await rows(f.s,'organizerWorkItems'),saved);
});


test('no-baseline excerpt Topic ACK Source drift rolls back without any facet ACK',async t=>{
 const {f}=await excerptFixture(t),transaction=f.s.repository.transaction.bind(f.s.repository);let reached=false;
 f.s.repository.transaction=(write,fn,...rest)=>transaction(write,async tx=>{if(write){const put=tx.put.bind(tx);tx.put=async(name,row,...more)=>{const value=await put(name,row,...more);if(!reached&&name==='organizerWorkItems'&&row.state==='ACKNOWLEDGED'&&row.unit?.facet==='topic'){reached=true;const source=(await tx.all('records'))[0];source.value.originalText+=' SYNTHETIC late Source drift';await put('records',source);}return value;};}return fn(tx);},...rest);
 try{const result=await f.run();assert.equal(reached,true);assert.ok(result.facets.some(x=>x.facet==='topic'&&x.state==='FAILED'),JSON.stringify(result));assert.equal((await work(f,result.jobId,'ACKNOWLEDGED')).length,0);assert.equal((await work(f,result.jobId,'DEFERRED')).length,0);assert.equal((await rows(f.s,'topics')).length,0);assert.equal((await rows(f.s,'thoughts')).length,0);const job=await read(f.s,'organizerJobs',result.jobId);assert.equal(job.committedCoverage.length,0);await f.run();assert.equal(f.physical(),1);}finally{f.s.repository.transaction=transaction;}
});

test('no-baseline excerpt late graph drift preserves Topic ACK and refuses stale deferral or replay',async t=>{
 const {f}=await excerptFixture(t),commit=TopicFormationService.prototype.commit;let reached=false,changed;
 t.mock.method(TopicFormationService.prototype,'commit',async function(...args){const result=await commit.apply(this,args);if(this.store===f.s&&!reached){reached=true;await f.s.repository.transaction(true,async tx=>{const row=(await tx.all('placements'))[0];row.excludedByUser=true;changed=structuredClone(row);await tx.put('placements',row);});}return result;});
 const result=await f.run();assert.equal(reached,true);const ack=await work(f,result.jobId,'ACKNOWLEDGED');assert.equal(ack.length,1);assert.equal(ack[0].unit.facet,'topic');assert.equal((await work(f,result.jobId,'DEFERRED')).length,0);assert.ok(result.facets.some(x=>x.facet==='context'&&x.state==='FAILED'),JSON.stringify(result));assert.deepEqual(await read(f.s,'placements',changed.id),changed);const saved=await rows(f.s,'organizerWorkItems');await f.run();assert.equal(f.physical(),1);assert.deepEqual(await rows(f.s,'organizerWorkItems'),saved);
});
