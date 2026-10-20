import test from 'node:test';
import assert from 'node:assert/strict';
import {CONTEXT_CARDS_ROW} from '../../../extension/core/context-cards.js';
import {maintenanceServiceFixture} from './maintenance-client-fixture.mjs';
const rows=(f,table)=>f.s.repository.transaction(false,t=>t.all(table));
const contextItems=f=>f.s.repository.transaction(false,async t=>(await t.get('meta',CONTEXT_CARDS_ROW))?.items??[]);
const key=u=>JSON.stringify([u.key,u.facet]);
for(const mode of ['valid KEEP','unselected Filter input','missing Filter input','duplicate Filter input','closed schema damage','child binding damage','shared processing revocation'])test('original paid mixed child preserves only qualified sibling outcomes: '+mode,async t=>{
 let coverage=null,wireBefore=null,wireAfter=null;const semantic=['unselected Filter input','missing Filter input','duplicate Filter input'].includes(mode);
 const f=await maintenanceServiceFixture(t,{filter:true,afterResponse:({local})=>{if(mode==='shared processing revocation')local.state.processing=false;},transformResponse:({value,payload,local})=>{
  coverage=structuredClone(payload.coverage);value.filter.decisions.forEach(d=>d.decision='KEEP');wireBefore=structuredClone(value);
  if(mode==='unselected Filter input'||mode==='shared processing revocation'){
   assert.ok(local.outside?.id);assert.equal(payload.material.inputs.some(i=>i.inputId===local.outside.id),false);assert.equal(payload.coverage.some(u=>JSON.parse(u.key)[1]===local.outside.id),false);
   value.filter.decisions[0].inputId=local.outside.id;
  }else if(mode==='missing Filter input')value.filter.decisions=[];
  else if(mode==='duplicate Filter input')value.filter.decisions.push(structuredClone(value.filter.decisions[0]));
  else if(mode==='closed schema damage')value.filter.extra='SYNTHETIC invalid whole-wire schema';
  else if(mode==='child binding damage')value.childOperationId='SYNTHETIC-foreign-child';
  wireAfter=structuredClone(value);
 }});t.after(()=>f.session.dispose());const result=await f.run();
 assert.equal(f.physical(),1);assert.equal(f.calls.filter(c=>c.path==='/api/provider').length,1);assert.equal(f.calls.filter(c=>c.path==='/api/reservations'&&c.data.action==='reserve').length,1);
 assert.ok(coverage.some(u=>u.facet==='topic')&&coverage.some(u=>u.facet==='context')&&coverage.some(u=>u.facet==='filter'));
 const acks=(await rows(f,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED'&&r.jobId===result.jobId);
 if(mode==='valid KEEP'){
  assert.equal(result.state,'COMMITTED',JSON.stringify(result));assert.deepEqual(acks.map(r=>key(r.unit)).sort(),coverage.map(key).sort());
 }else if(semantic){
  const restored=structuredClone(wireAfter);restored.filter.decisions=wireBefore.filter.decisions;assert.deepEqual(restored,wireBefore,'only Filter semantic input IDs changed');
  assert.equal(result.state,'PARTIAL',JSON.stringify(result));assert.ok(result.facets.some(r=>r.facet==='topic'&&r.state==='COMMITTED'),JSON.stringify(result));assert.ok(result.facets.some(r=>r.facet==='context'&&r.state==='COMMITTED'),JSON.stringify(result));assert.ok(result.facets.some(r=>r.facet==='filter'&&r.state==='DEFERRED'),JSON.stringify(result));
  assert.deepEqual(acks.map(r=>key(r.unit)).sort(),coverage.filter(u=>u.facet!=='filter').map(key).sort());assert.ok((await rows(f,'thoughts')).length>0);assert.ok((await contextItems(f)).length>0);
  assert.equal((await rows(f,'filterInputs')).find(r=>r.id===f.candidate.id)?.aiDecision,undefined);
  const deferred=(await rows(f,'organizerWorkItems')).filter(r=>r.state==='DEFERRED'&&r.jobId===result.jobId);assert.deepEqual(deferred.map(r=>key(r.unit)).sort(),coverage.filter(u=>u.facet==='filter').map(key).sort());
 }else{
  assert.notEqual(result.state,'COMMITTED');assert.equal(acks.length,0);assert.equal((await rows(f,'thoughts')).length,0);assert.equal((await contextItems(f)).length,0);
 }
 await f.run();assert.equal(f.physical(),1,'a failed facet never sends another paid request');
});

test('semantic Filter DEFER rollback retries only the original durable units after sibling ACKs',async t=>{
 let coverage;const f=await maintenanceServiceFixture(t,{filter:true,transformResponse:({value,payload,local})=>{coverage=structuredClone(payload.coverage);value.filter.decisions[0].inputId=local.outside.id;}});t.after(()=>f.session.dispose());
 const transaction=f.s.repository.transaction.bind(f.s.repository);let injected=false;const attempts=[];
 f.s.repository.transaction=(write,fn,...args)=>transaction(write,async tx=>{if(write){const put=tx.put.bind(tx);tx.put=async(table,row,...rest)=>{const result=await put(table,row,...rest);if(table==='organizerWorkItems'&&row.state==='DEFERRED'&&row.unit?.facet==='filter'){attempts.push(structuredClone(row));if(!injected){injected=true;throw Error('SYNTHETIC Filter DEFER storage rollback');}}return result;};}return fn(tx);},...args);
 const first=await f.run();assert.equal(first.state,'PARTIAL');assert.equal(injected,true);assert.equal(attempts.length,1);
 const acknowledged=(await rows(f,'organizerWorkItems')).filter(r=>r.state==='ACKNOWLEDGED'&&r.jobId===first.jobId);assert.deepEqual(acknowledged.map(r=>key(r.unit)).sort(),coverage.filter(u=>u.facet!=='filter').map(key).sort());assert.equal((await rows(f,'organizerWorkItems')).filter(r=>r.state==='DEFERRED'&&r.jobId===first.jobId).length,0);
 const second=await f.run();assert.equal(second.state,'PARTIAL');assert.ok(second.facets.some(r=>r.facet==='filter'&&r.state==='DEFERRED'),JSON.stringify(second));assert.equal(attempts.length,2);assert.equal(attempts[0].id,attempts[1].id);assert.deepEqual(attempts[0].unit,attempts[1].unit);assert.equal(attempts[0].signature,attempts[1].signature);assert.equal(attempts[0].jobId,attempts[1].jobId);
 const final=await rows(f,'organizerWorkItems');assert.deepEqual(final.filter(r=>r.state==='ACKNOWLEDGED'&&r.jobId===first.jobId),acknowledged);assert.deepEqual(final.filter(r=>r.state==='DEFERRED'&&r.jobId===first.jobId).map(r=>key(r.unit)),coverage.filter(u=>u.facet==='filter').map(key));assert.equal((await rows(f,'filterInputs')).find(r=>r.id===f.candidate.id)?.aiDecision,undefined);assert.equal(f.physical(),1);assert.equal(f.calls.filter(c=>c.path==='/api/provider').length,1);assert.equal(f.calls.filter(c=>c.path==='/api/reservations'&&c.data.action==='reserve').length,1);
});
