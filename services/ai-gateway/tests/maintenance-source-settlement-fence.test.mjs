import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceMaintenanceFixture} from './maintenance-source-response-fixture.mjs';
import {CONTEXT_CARDS_ROW} from '../../../extension/core/context-cards.js';
const rows=(s,n)=>s.repository.transaction(false,t=>t.all(n));
for(const stage of ['ack','usage','job'])test('independent source ADD refuses late same-transaction lineage at '+stage,async t=>{
 const f=await sourceMaintenanceFixture(t),tx=f.s.repository.transaction.bind(f.s.repository);let fired=false;
 f.s.repository.transaction=(write,fn,stores)=>tx(write,async t=>{if(write){const put=t.put.bind(t);t.put=async(name,row,...args)=>{const result=await put(name,row,...args);
 const hit=stage==='ack'?name==='organizerWorkItems'&&row.unit?.facet==='context'&&row.state==='ACKNOWLEDGED':stage==='usage'?name==='organizerUsage'&&row.state==='COMMITTED':name==='organizerJobs'&&row.state==='COMMITTED';
 if(!fired&&hit){const current=await t.get('meta',CONTEXT_CARDS_ROW);if(current?.items.length){fired=true;const old=structuredClone(current.items[0]);old.id=crypto.randomUUID();old.maintenance.associationIds=[crypto.randomUUID()];old.order=current.sequence++;old.protected=old.userEdited=true;old.lifecycle='removed';old.deletedBy=crypto.randomUUID();current.items.push(old);await put('meta',current);}}
 return result;};}return fn(t);},stores);
 const result=await f.run(),row=await f.s.repository.transaction(false,t=>t.get('meta',CONTEXT_CARDS_ROW));console.log(JSON.stringify({stage,fired,result,items:row?.items.length,ack:(await rows(f.s,'organizerWorkItems')).filter(x=>x.state==='ACKNOWLEDGED').map(x=>x.unit),physical:f.physical(),resultCommitted:f.server.saved()?.rows[0]?.resultCommitted}));
 assert.equal(fired,true);assert.notEqual(result.state,'COMMITTED');assert.equal(row?.items.length??0,0,'late unresolved lineage must roll back Item+receipt+ACK');
});

// The three independent RED probes above remain unchanged. Additional controls
// cover the same original settlement seam, exact own-result identity and retry.
for(const stage of ['ack','usage','job'])for(const drift of ['active-lineage','own-association','own-body','input','grant'])test('source final settlement fences '+drift+' after '+stage+' without publishing Context',async t=>{
 const f=await sourceMaintenanceFixture(t),tx=f.s.repository.transaction.bind(f.s.repository),{ContextMaintenanceService}=await import('../../../extension/core/context-maintenance.js'),maintain=ContextMaintenanceService.prototype.maintain,changes=[];let fired=false;
 t.mock.method(ContextMaintenanceService.prototype,'maintain',function(caller,change,options){changes.push(structuredClone(change));return maintain.call(this,caller,change,options);});
 f.s.repository.transaction=(write,fn,stores)=>tx(write,async tx=>{if(write){const put=tx.put.bind(tx);tx.put=async(name,row,...args)=>{const result=await put(name,row,...args),hit=stage==='ack'?name==='organizerWorkItems'&&row.unit?.facet==='context'&&row.state==='ACKNOWLEDGED':stage==='usage'?name==='organizerUsage'&&row.state==='COMMITTED':name==='organizerJobs'&&row.state==='COMMITTED';
  if(!fired&&hit){const current=await tx.get('meta',CONTEXT_CARDS_ROW);if(current?.items.length){fired=true;const own=current.items[0];
   if(drift==='grant')f.contextAbort.abort();
   else if(drift==='input'){const state=await tx.get('inputStates',own.maintenance.provenance.evidence[0].inputId);state.contentRevision++;await put('inputStates',state);}
   else{if(drift==='active-lineage'){const duplicate=structuredClone(own);duplicate.id=crypto.randomUUID();duplicate.maintenance.associationIds=[crypto.randomUUID()];duplicate.order=current.sequence++;current.items.push(duplicate);}else if(drift==='own-association')own.maintenance.associationIds=[crypto.randomUUID()];else own.body='SYNTHETIC substituted final Item';await put('meta',current);}
  }}return result;};}return fn(tx);},stores);
 const result=await f.run();assert.equal(fired,true);assert.notEqual(result.state,'COMMITTED');assert.equal((await f.s.repository.transaction(false,t=>t.get('meta',CONTEXT_CARDS_ROW)))?.items.length??0,0);
 const acknowledged=(await rows(f.s,'organizerWorkItems')).filter(x=>x.state==='ACKNOWLEDGED');assert.equal(acknowledged.length,1);assert.equal(acknowledged[0].unit.facet,'topic');assert.equal((await rows(f.s,'operationReceipts')).filter(r=>r.namespace==='context-maintenance').length,0);assert.equal(f.server.saved().rows[0].resultCommitted,undefined);assert.equal(f.physical(),1);
 f.s.repository.transaction=tx;
 if(drift!=='grant'){assert.equal((await f.run()).state,'COMMITTED');assert.equal(f.physical(),1);assert.equal(changes.length,2);assert.deepEqual(changes[1],changes[0]);assert.equal((await f.s.repository.transaction(false,t=>t.get('meta',CONTEXT_CARDS_ROW))).items.length,1);}
});
