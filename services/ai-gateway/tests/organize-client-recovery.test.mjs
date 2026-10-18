import test from 'node:test';
import assert from 'node:assert/strict';
import {organizeServiceFixture} from './organize-client-fixture.mjs';
import {rows} from '../../../extension/tests/harness/original-complete.mjs';
const usageRows=async s=>(await rows(s,'organizerUsage')).sort((a,b)=>a.sequence-b.sequence);
import {AIUsageFoundation} from '../../../extension/core/ai-usage/foundation.js';
import {createClientOperationStatusTransport} from '../../../extension/core/ai-usage/client-operation-status-transport.js';
import {createClientReservationTransport} from '../../../extension/core/ai-usage/client-reservation-transport.js';
import {createConfiguredOrganizeRunner} from '../../../extension/core/organizer/configured-organize-runner.js';
async function recovery(t){
 const f=await organizeServiceFixture(t,{count:40,loseProvider:true});assert.equal((await f.run()).error,'OUTCOME_UNKNOWN');f.restoreAcks();
 const foundation=new AIUsageFoundation(f.s,{resolveAuthority:f.configuration.resolveAuthority}),status=createClientOperationStatusTransport({endpoint:f.configuration.origin+'/api/operation-status',fetch:f.configuration.fetch}),reservations=createClientReservationTransport({endpoint:f.configuration.origin+'/api/reservations',fetch:f.configuration.fetch});
 const handle=await foundation.organizeRecovery(f.configuration.origin,f.topic.id),observations=[],cancellations=[];
 for(const [i,request]of handle.requests.entries()){
  const proofs=await f.configuration.readProofs(request),observation=await foundation.queryOrganizeRecovery(handle,i,proofs,status,()=>true);observations.push(observation);cancellations.push(observation.state==='SETTLED'?null:await foundation.cancelOrganizeRecovery(handle,i,proofs,observation,status,reservations,()=>true));
 }
 return {...f,foundation,status,reservations,handle,observations,cancellations,commit:()=>foundation.reconcileOrganizeRecovery(handle,observations,status,{cancellations,reservations,isCurrent:()=>true})};
}

test('two original siblings reconcile atomically to FAILED, exact spend retained and no effective result',async t=>{
 const f=await recovery(t),before=await rows(f.s,'organizerJobs');assert.equal((await f.commit()).state,'EXPIRED_UNCOMMITTED');
 const [job]=await rows(f.s,'organizerJobs'),usage=await usageRows(f.s);assert.deepEqual(job.childIds,before[0].childIds);assert.equal(job.domainResultReceipt.outcome,'FAILED');assert.equal(usage[0].financialSettlement.settledSpendMicros,120);assert.equal(usage[0].attemptCount,1);assert.equal(usage[1].financialCancellation,true);assert.equal(usage[1].attemptCount,0);assert.equal(f.physical(),1);
 await assert.rejects(f.commit(),{code:'UNAVAILABLE'});
});

test('cloned/foreign recovery handles and swapped real sibling observations cannot write receipts',async t=>{
 const f=await recovery(t),before=await usageRows(f.s),opts={cancellations:f.cancellations,reservations:f.reservations,isCurrent:()=>true};
 await assert.rejects(f.foundation.reconcileOrganizeRecovery({...f.handle},f.observations,f.status,opts),{code:'UNAVAILABLE'});
 const other=new AIUsageFoundation(f.s,{resolveAuthority:f.configuration.resolveAuthority});await assert.rejects(other.reconcileOrganizeRecovery(f.handle,f.observations,f.status,opts),{code:'UNAVAILABLE'});
 await assert.rejects(f.foundation.reconcileOrganizeRecovery(f.handle,[...f.observations].reverse(),f.status,opts),{code:'RESULT_BINDING_MISMATCH'});
 await assert.rejects(f.foundation.reconcileOrganizeRecovery(f.handle,f.observations,f.status,{...opts,cancellations:f.cancellations.map(c=>c?structuredClone(c):c)}),{code:'OUTCOME_UNKNOWN'});
 assert.deepEqual(await usageRows(f.s),before);
});

test('two competing original recovery captures allow exactly one atomic reconciliation',async t=>{
 const f=await recovery(t),other=await f.foundation.organizeRecovery(f.configuration.origin,f.topic.id);
 assert.equal((await f.commit()).state,'EXPIRED_UNCOMMITTED');const before=await usageRows(f.s);
 await assert.rejects(f.foundation.reconcileOrganizeRecovery(other,f.observations,f.status,{cancellations:f.cancellations,reservations:f.reservations,isCurrent:()=>true}),{code:'RESULT_CONFLICT'});
 assert.deepEqual(await usageRows(f.s),before);assert.equal(f.physical(),1);
});

for(const change of ['preflight','receipt','permission'])test(`last original ${change} change rolls back both recovery siblings`,async t=>{
 const f=await recovery(t),write=f.s.foundationWrite.bind(f.s),before=await usageRows(f.s);let injected=false;
 f.s.foundationWrite=fn=>write(async tx=>{const put=tx.put.bind(tx);tx.put=async(table,row)=>{await put(table,row);if(!injected&&table==='organizerUsage'){injected=true;if(change==='preflight'){const meta=await tx.get('meta','aiu:organize-service-preflight:v1:'+f.topic.id);await put('meta',{...meta,organizeRequestKey:'f'.repeat(64)});}else if(change==='receipt')await put(table,{...row,attemptCount:99});else f.revoke(false);}};return fn(tx);});
 await assert.rejects(f.commit());assert.equal(injected,true);assert.deepEqual(await usageRows(f.s),before);assert.equal((await rows(f.s,'organizerJobs'))[0].state,'OUTCOME_UNKNOWN');
});

test('unknown missing sibling never admits a new paid operation even after cancelling the known hold',async t=>{
 const f=await organizeServiceFixture(t,{count:40,loseReservation:true});assert.ok((await f.run()).error);f.restoreAcks();const cold=createConfiguredOrganizeRunner(f.s,f.configuration),before=f.calls.length;
 for(let i=0;i<2;i++)assert.equal((await cold.handle({type:'UPDATE_AI_PRESENTATION',topicId:f.topic.id,userActionId:crypto.randomUUID(),scopeBinding:'a'.repeat(64)})).error,'OUTCOME_UNKNOWN');
 assert.equal(f.physical(),0);assert.equal(f.server.saved().rows.length,1);assert.equal(f.server.saved().rows[0].state,'CANCELLED_BEFORE_DISPATCH');assert.equal(f.calls.slice(before).filter(c=>c.path==='/api/provider'||c.path==='/api/reservations'&&c.data.action==='reserve').length,0);
});
