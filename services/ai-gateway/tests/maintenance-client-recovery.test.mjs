import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceServiceFixture} from './maintenance-client-fixture.mjs';
import {rows} from '../../../extension/tests/harness/original-complete.mjs';
import {createConfiguredMaintenanceSession} from '../../../extension/core/ai-usage/configured-maintenance-session.js';

// Cold recovery must settle only original body-free financial identities. It
// cannot recover a lost response body or silently replay a paid operation.
for (const loss of ['reservation', 'provider']) {
 test(`cold Maintenance reconciles confirmed ${loss} ACK loss before any later opportunity`, async t => {
  let drop = true;
  const f = await maintenanceServiceFixture(t, {configure: ({configuration}) => {
   const send = configuration.fetch;
   configuration.fetch = async request => {
    const response = await send(request), path = new URL(request.url).pathname;
    if (drop && path === (loss === 'reservation' ? '/api/reservations' : '/api/provider')) throw Error('SYNTHETIC lost original ACK');
    return response;
   };
  }});
  const original = await f.run();
  assert.equal(original.state, 'OUTCOME_UNKNOWN');
  const [before] = await rows(f.s, 'organizerJobs'), physical = f.physical();
  assert.equal(physical, loss === 'provider' ? 1 : 0);
  assert.equal(f.server.saved().rows[0].state, loss === 'provider' ? 'SETTLED' : 'RESERVED');
  drop = false;
  const cold = createConfiguredMaintenanceSession(f.s, f.configuration);
  let result, error;
  try { result = await cold.opportunity(); } catch (e) { error = e; }
  assert.equal(error, undefined, `known original financial outcome remains blocked: ${error?.code}`);
  const originalAfter = (await rows(f.s, 'organizerJobs')).find(row => row.id === before.id);
  assert.equal(originalAfter.state, loss === 'reservation' ? 'CANCELLED_BEFORE_DISPATCH' : 'EXPIRED_UNCOMMITTED');
  if (loss === 'reservation') assert.deepEqual(originalAfter.domainResultReceipt, before.domainResultReceipt, 'original cancelled domain event is immutable');
  assert.equal(originalAfter.domainResultReceipt.outcome, 'FAILED');
  assert.equal(f.physical(), physical, 'recovery does not replay or start another paid provider');
  assert.equal((await rows(f.s, 'organizerWorkItems')).filter(row => row.state === 'ACKNOWLEDGED').length, 0);
  assert.ok(result && typeof result.state === 'string');
  const [usage] = (await rows(f.s, 'organizerUsage')).filter(row => row.jobId === before.id);
  if (loss === 'provider') assert.equal(usage.financialSettlement.settledSpendMicros, 120);
  else assert.equal(usage.financialCancellation, true);
 });
}

import {maintenanceRecoveryFixture,markerId,usageRows} from './maintenance-recovery-fixture.mjs';
import {AIUsageFoundation} from '../../../extension/core/ai-usage/foundation.js';
import {createClientOperationStatusTransport} from '../../../extension/core/ai-usage/client-operation-status-transport.js';
import {savedDomainResultReceipt} from '../../../extension/core/ai-usage/domain-result-receipt.js';
import {readMaintenanceBatch} from '../../../extension/core/ai-usage/maintenance-batch.js';

const meta=async f=>f.s.repository.transaction(false,t=>t.get('meta',markerId));
const job=async(f,id=f.original?.jobId)=>(await rows(f.s,'organizerJobs')).find(j=>j.id===id);
const acknowledgements=async(f,id)=>(await rows(f.s,'organizerWorkItems')).filter(r=>r.jobId===id&&r.state==='ACKNOWLEDGED');

test('original undeclared following child stays zero-cost and the full fixed set closes atomically',async t=>{
 const f=await maintenanceRecoveryFixture(t,{mixed:true}),before=await job(f),m=await meta(f);assert.equal(m.requests.length,2);assert.equal(m.requests[1],null);
 const {commit}=await f.capture();assert.equal((await commit()).state,'EXPIRED_UNCOMMITTED');const after=await job(f),usage=await usageRows(f.s,before.id);
 assert.deepEqual(after.childIds,before.childIds);assert.deepEqual(after.committedCoverage,before.committedCoverage);assert.equal(usage[0].financialSettlement.settledSpendMicros,120);assert.equal(usage[1].executionKind,'service-planned');assert.equal(usage[1].attemptCount,0);assert.equal(usage[1].spendState,'NOT_RESERVED');assert.equal(usage[1].financialRequest,undefined);assert.equal(usage[1].state,'CANCELLED_BEFORE_DISPATCH');
 const cold=createConfiguredMaintenanceSession(f.s,f.configuration);assert.equal((await cold.opportunity()).state,'RECOVERED');const report=f.calls.filter(c=>c.path==='/api/results').at(-1).data.result;assert.equal(report.outcome,'FAILED');assert.equal(report.children.length,1);assert.equal(f.physical(),1);assert.equal((await job(f)).resultReport.state,'ACKNOWLEDGED');
});

test('partial domain Topic ACKs survive cold sibling recovery without recovered bodies',async t=>{
 const f=await maintenanceRecoveryFixture(t,{mixed:true,lossIndex:1}),before=await job(f),acks=await acknowledgements(f,before.id),topics=await rows(f.s,'topics');assert.ok(acks.length>0);assert.equal(f.physical(),2);
 const r=await f.capture();assert.equal((await r.commit()).state,'EXPIRED_UNCOMMITTED');assert.deepEqual((await job(f)).committedCoverage,before.committedCoverage);assert.deepEqual(await acknowledgements(f,before.id),acks);assert.deepEqual(await rows(f.s,'topics'),topics);assert.ok((await usageRows(f.s,before.id)).every(r=>r.financialSettlement.settledSpendMicros===120));assert.equal((await job(f)).domainResultReceipt.outcome,'FAILED');assert.equal(f.physical(),2);
});

test('cloned and foreign handles, cloned observations, swapped siblings and foreign transports cannot recover',async t=>{
 const f=await maintenanceRecoveryFixture(t,{mixed:true,lossIndex:1}),r=await f.capture(),before=await usageRows(f.s,f.original.jobId),opts={cancellations:r.cancellations,reservations:f.reservations,isCurrent:()=>true};
 await assert.rejects(f.foundation.reconcileMaintenanceRecovery({...r.handle},r.observations,f.status,opts),{code:'UNAVAILABLE'});
 const other=new AIUsageFoundation(f.s,{resolveAuthority:f.configuration.resolveAuthority});await assert.rejects(other.reconcileMaintenanceRecovery(r.handle,r.observations,f.status,opts),{code:'UNAVAILABLE'});
 await assert.rejects(f.foundation.reconcileMaintenanceRecovery(r.handle,r.observations.map(o=>structuredClone(o)),f.status,opts),{code:'RESULT_BINDING_MISMATCH'});
 await assert.rejects(f.foundation.reconcileMaintenanceRecovery(r.handle,[...r.observations].reverse(),f.status,opts),{code:'RESULT_BINDING_MISMATCH'});
 const foreign=createClientOperationStatusTransport({endpoint:f.configuration.origin+'/api/operation-status',fetch:f.configuration.fetch});await assert.rejects(f.foundation.reconcileMaintenanceRecovery(r.handle,r.observations,foreign,opts),{code:'RESULT_BINDING_MISMATCH'});
 assert.deepEqual(await usageRows(f.s,f.original.jobId),before);await r.commit();await assert.rejects(r.commit(),{code:'UNAVAILABLE'});
});

test('cloned cancellation never becomes zero-spend evidence; immutable cancelled domain event stays exact',async t=>{
 const f=await maintenanceRecoveryFixture(t,{loss:'reservation'}),r=await f.capture(),before=await job(f),usage=await usageRows(f.s,before.id);
 await assert.rejects(f.foundation.reconcileMaintenanceRecovery(r.handle,r.observations,f.status,{cancellations:r.cancellations.map(c=>structuredClone(c)),reservations:f.reservations,isCurrent:()=>true}),{code:'OUTCOME_UNKNOWN'});assert.deepEqual(await usageRows(f.s,before.id),usage);
 await r.commit();assert.deepEqual((await job(f)).domainResultReceipt,before.domainResultReceipt);assert.equal((await usageRows(f.s,before.id))[0].financialCancellation,true);
});

for(const change of ['preflight','job','receipt','dispatch','ack','principal','library','consent','repository','current'])test(`final ${change} race rolls back all Maintenance recovery writes`,async t=>{
 const f=await maintenanceRecoveryFixture(t,{mixed:true,lossIndex:1}),r=await f.capture(),before=await usageRows(f.s,f.original.jobId),beforeJob=await job(f),originalAcks=await acknowledgements(f,f.original.jobId),repository=f.s.repository,write=f.s.foundationWrite.bind(f.s);let injected=false,live=true;
 const authority=f.foundation.resolveAuthority;
 f.s.foundationWrite=fn=>write(async tx=>{const put=tx.put.bind(tx);tx.put=async(table,row)=>{await put(table,row);if(!injected&&table==='organizerUsage'){
  injected=true;
  if(change==='preflight'){const m=await tx.get('meta',markerId);await put('meta',{...m,origin:'https://other.invalid'});}
  else if(change==='job')await put('organizerJobs',{...beforeJob,cancelEpoch:beforeJob.cancelEpoch+1});
  else if(change==='receipt')await put(table,{...row,attemptCount:99});
  else if(change==='dispatch')await put('meta',{id:'aiu:dispatched:'+row.childId,version:1,jobId:row.jobId,childId:'different'});
  else if(change==='ack'){const a=originalAcks[0];await put('organizerWorkItems',{...a,outcome:'NO_CHANGE'});}
  else if(['principal','library','consent'].includes(change))f.foundation.resolveAuthority=async(...args)=>({...await authority(...args),[change==='consent'?'consentEpoch':change+'Id']:'SYNTHETIC-changed'});
  else if(change==='repository')f.s.repository=Object.create(f.s.repository);
  else live=false;
 }};return fn(tx);});
 await assert.rejects(f.foundation.reconcileMaintenanceRecovery(r.handle,r.observations,f.status,{cancellations:r.cancellations,reservations:f.reservations,isCurrent:()=>live}));f.s.repository=repository;assert.equal(injected,true);assert.deepEqual(await usageRows(f.s,f.original.jobId),before);assert.deepEqual(await job(f),beforeJob);
});

test('a genuinely missing declared reservation stays unknown and cannot be interpreted as an unsent null child',async t=>{
 const f=await maintenanceServiceFixture(t,{configure:({configuration})=>{const send=configuration.fetch;configuration.fetch=async r=>{if(new URL(r.url).pathname==='/api/reservations'&&(await r.clone().json()).action==='reserve')throw Error('SYNTHETIC no reservation ACK');return send(r);};}});assert.equal((await f.run()).state,'OUTCOME_UNKNOWN');const before=await rows(f.s,'organizerUsage'),cold=createConfiguredMaintenanceSession(f.s,f.configuration);
 for(let i=0;i<2;i++)await assert.rejects(cold.opportunity(),{code:'OUTCOME_UNKNOWN'});assert.deepEqual(await rows(f.s,'organizerUsage'),before);assert.equal(f.physical(),0);assert.equal(f.server.saved(),null);
});

test('real dispatched provider UNKNOWN retains its hold and blocks every replacement',async t=>{
 const f=await maintenanceServiceFixture(t,{beforeSend:async()=>{throw Error('SYNTHETIC provider connection failure');}});assert.equal((await f.run()).state,'OUTCOME_UNKNOWN');assert.equal(f.server.saved().rows[0].state,'OUTCOME_UNKNOWN');const before=await rows(f.s,'organizerUsage'),cold=createConfiguredMaintenanceSession(f.s,f.configuration),calls=f.calls.length;
 for(let i=0;i<2;i++)await assert.rejects(cold.opportunity(),{code:'OUTCOME_UNKNOWN'});assert.deepEqual(await rows(f.s,'organizerUsage'),before);assert.equal(f.physical(),1);assert.equal(f.calls.slice(calls).filter(c=>c.path==='/api/provider'||c.path==='/api/reservations').length,0);
});

for(const change of ['missing-row','attempt','financial-request','dispatch'])test(`null following marker cannot hide ${change} evidence`,async t=>{
 const f=await maintenanceRecoveryFixture(t,{mixed:true}),m=await meta(f),id=(await job(f)).childIds[1];assert.equal(m.requests[1],null);
 await f.s.foundationWrite(async tx=>{const row=await tx.get('organizerUsage','aiu:attempt:'+id);if(change==='missing-row')await tx.delete('organizerUsage',row.id);else if(change==='dispatch')await tx.put('meta',{id:'aiu:dispatched:'+id,version:1,jobId:row.jobId,childId:id});else await tx.put('organizerUsage',{...row,...(change==='attempt'?{attemptCount:1}:{financialRequest:m.requests[0]})});});
 await assert.rejects(f.foundation.maintenanceRecovery(f.configuration.origin));assert.equal(f.physical(),1);
});

test('recovery result ACK loss replays only the exact durable body-free event',async t=>{
 let drop=true;const f=await maintenanceRecoveryFixture(t,{configure:({configuration})=>{const send=configuration.fetch;configuration.fetch=async r=>{const response=await send(r);if(drop&&new URL(r.url).pathname==='/api/results')throw Error('SYNTHETIC result ACK loss');return response;};}}),cold=createConfiguredMaintenanceSession(f.s,f.configuration);
 await assert.rejects(cold.opportunity(),{code:'OUTCOME_UNKNOWN'});const before=await job(f),report=before.resultReport.evidence;assert.equal(before.resultReport.state,'PENDING');drop=false;
 assert.equal((await cold.opportunity()).state,'RECOVERED');assert.deepEqual((await job(f)).resultReport.evidence,report);assert.equal((await job(f)).resultReport.state,'ACKNOWLEDGED');const reports=f.calls.filter(c=>c.path==='/api/results');assert.equal(reports.length,2);assert.deepEqual(reports[0].data.result,reports[1].data.result);assert.doesNotMatch(JSON.stringify(reports.map(r=>r.data.result)),/PRIVATE|body|payload/);assert.equal(f.physical(),1);
});

test('a later genuine opportunity requalifies original work and receives actual service cadence denial',async t=>{
 const f=await maintenanceRecoveryFixture(t),cold=createConfiguredMaintenanceSession(f.s,f.configuration);assert.equal((await cold.opportunity()).state,'RECOVERED');const before=await job(f);const next=await cold.opportunity();assert.equal(next.state,'MAINTENANCE_CADENCE');assert.notEqual(next.jobId,before.id);const newer=await job(f,next.jobId);assert.match(newer.maintenanceRequestKey,/^aiu:recovery:[a-f0-9]{64}$/);assert.equal(f.physical(),1);assert.equal(f.server.saved().rows.length,1);assert.deepEqual((await job(f)).domainResultReceipt,before.domainResultReceipt);
});

test('invented or changed recovery lineage cannot authorize another Maintenance identity',async t=>{
 const f=await maintenanceRecoveryFixture(t),r=await f.capture();await r.commit();const batch=await readMaintenanceBatch(f.foundation,{scope:f.configuration.scope,contractVersion:f.configuration.contractVersion,routeVersion:f.configuration.routeVersion});
 await assert.rejects(f.foundation.plan({...batch.request,maintenanceRequestKey:'aiu:recovery:'+'a'.repeat(64)}),{code:'RESULT_BINDING_MISMATCH'});assert.equal(f.physical(),1);
});

for(const mutation of ['job-type','prior-attempt','missing-marker','missing-request','fake-cancel','changed-domain-child'])test(`saved cancelled Maintenance witness rejects ${mutation}`,async t=>{
 const f=await maintenanceRecoveryFixture(t,{loss:'reservation'}),r=await f.capture();await r.commit();const original=await job(f),before=await usageRows(f.s,original.id);
 await assert.rejects(f.s.foundationWrite(async tx=>{
  const j=structuredClone(original),row=structuredClone(before[0]);
  if(mutation==='job-type'){j.type='AI_ORGANIZE';j.domainResultReceipt.binding.jobType='AI_ORGANIZE';}
  else if(mutation==='prior-attempt')row.maintenanceRecoveryWitness.prior.attemptCount=1;
  else if(mutation==='missing-marker')delete row.maintenanceRecoveryWitness.marker;
  else if(mutation==='missing-request')row.maintenanceRecoveryWitness.marker.requests[0]=null;
  else if(mutation==='fake-cancel')row.financialCancellationEvidence.decision='reserved';
  else j.domainResultReceipt.children[0].operationReceiptId='SYNTHETIC-changed-receipt';
  await tx.put('organizerUsage',row);await savedDomainResultReceipt(tx,j);
 }),{code:'RESULT_CONFLICT'});assert.deepEqual(await usageRows(f.s,original.id),before);
});

test('real COMMITTED domain truth and its child remain byte-for-byte unchanged on cold opportunity',async t=>{
 const f=await maintenanceServiceFixture(t),result=await f.run();assert.equal(result.state,'COMMITTED');const before=await job(f,result.jobId),usage=await usageRows(f.s,result.jobId),acks=await acknowledgements(f,result.jobId),calls=f.calls.length;
 assert.equal((await createConfiguredMaintenanceSession(f.s,f.configuration).opportunity()).state,'NO_DELTA');assert.deepEqual(await job(f,result.jobId),before);assert.deepEqual(await usageRows(f.s,result.jobId),usage);assert.deepEqual(await acknowledgements(f,result.jobId),acks);assert.equal(f.calls.length,calls);assert.equal(f.physical(),1);
});

test('a real COMMITTED child survives a sibling Context failure and cold financial closure',async t=>{
 const f=await maintenanceServiceFixture(t,{inputs:21,transformResponse:({value,local})=>{if(local.calls.length===2)value.context.groups[0].topicId='SYNTHETIC-unknown-topic';}}),result=await f.run();assert.equal(result.state,'PARTIAL');const before=await job(f,result.jobId),usage=await usageRows(f.s,result.jobId),committed=usage.find(r=>r.state==='COMMITTED'),acks=await acknowledgements(f,result.jobId);assert.ok(committed,'actual first child domain commit');
 const cold=createConfiguredMaintenanceSession(f.s,f.configuration);assert.equal((await cold.opportunity()).state,'RECOVERED');assert.deepEqual((await usageRows(f.s,result.jobId)).find(r=>r.childId===committed.childId),committed);assert.deepEqual(await acknowledgements(f,result.jobId),acks);assert.deepEqual((await job(f,result.jobId)).committedCoverage,before.committedCoverage);assert.equal((await job(f,result.jobId)).domainResultReceipt.outcome,'FAILED');assert.equal(f.physical(),2);
});

test('lost original cancellation ACK keeps local rows unchanged until authentic idempotent cancellation replay',async t=>{
 let drop=true;const f=await maintenanceRecoveryFixture(t,{loss:'reservation',configure:({configuration})=>{const send=configuration.fetch;configuration.fetch=async r=>{const data=await r.clone().json(),response=await send(r);if(drop&&new URL(r.url).pathname==='/api/reservations'&&data.action==='cancel')throw Error('SYNTHETIC cancellation ACK loss');return response;};}}),before=await usageRows(f.s,f.original.jobId),cold=createConfiguredMaintenanceSession(f.s,f.configuration);
 await assert.rejects(cold.opportunity(),{code:'OUTCOME_UNKNOWN'});assert.deepEqual(await usageRows(f.s,f.original.jobId),before);assert.equal(f.server.saved().rows[0].state,'CANCELLED_BEFORE_DISPATCH');drop=false;assert.equal((await cold.opportunity()).state,'RECOVERED');assert.equal((await usageRows(f.s,f.original.jobId))[0].financialCancellation,true);assert.equal(f.physical(),0);
});

test('competing captures permit one atomic closure and reject stale second reconciliation',async t=>{
 const f=await maintenanceRecoveryFixture(t),r=await f.capture(),other=await f.foundation.maintenanceRecovery(f.configuration.origin);await r.commit();const before=await usageRows(f.s,f.original.jobId);
 await assert.rejects(f.foundation.reconcileMaintenanceRecovery(other,r.observations,f.status,{cancellations:r.cancellations,reservations:f.reservations,isCurrent:()=>true}),{code:'RESULT_CONFLICT'});assert.deepEqual(await usageRows(f.s,f.original.jobId),before);
});

import {laterMaintenanceService} from './maintenance-recovery-fixture.mjs';
test('next real service window admits one fresh bounded cycle after recovery, with old spend/history intact',async t=>{
 const f=await maintenanceRecoveryFixture(t),cold=createConfiguredMaintenanceSession(f.s,f.configuration);assert.equal((await cold.opportunity()).state,'RECOVERED');const original=await job(f),oldBill=f.server.saved().rows[0];
 const next=laterMaintenanceService(f,oldBill.window.nextEligibilityAt),session=createConfiguredMaintenanceSession(f.s,next.configuration),result=await session.opportunity();assert.equal(result.state,'COMMITTED',JSON.stringify(result));assert.notEqual(result.jobId,original.id);assert.match((await job(f,result.jobId)).maintenanceRequestKey,/^aiu:recovery:[a-f0-9]{64}$/);assert.equal(f.physical(),2);assert.equal(next.server.saved().rows.length,2);assert.deepEqual(next.server.saved().rows.find(r=>r.request.jobId===original.id),oldBill);assert.deepEqual(await job(f),original);
 assert.equal(next.calls.filter(c=>c.path==='/api/provider').length,1);assert.equal(next.calls.filter(c=>c.path==='/api/reservations'&&c.data.action==='reserve').length,1);assert.equal((await session.opportunity()).state,'NO_DELTA');assert.equal(f.physical(),2);
});

test('caller array mutation cannot swap an authenticated sibling after validation',async t=>{
 const f=await maintenanceRecoveryFixture(t,{mixed:true,lossIndex:1}),r=await f.capture(),expected=r.observations.map(o=>o.financialSettlement.receiptId),pending=r.commit();r.observations.reverse();r.cancellations[0]={state:'CANCELLED_BEFORE_DISPATCH'};await pending;
 assert.deepEqual((await usageRows(f.s,f.original.jobId)).map(u=>u.operationReceiptId),expected);assert.equal(f.physical(),2);
});

test('mixed cancelled service-planned event preserves both original children while enriching only declared finance',async t=>{
 const f=await maintenanceRecoveryFixture(t,{mixed:true,loss:'reservation'}),before=await job(f),cold=createConfiguredMaintenanceSession(f.s,f.configuration);assert.equal((await meta(f)).requests[1],null);
 assert.equal((await cold.opportunity()).state,'RECOVERED');const after=await job(f),usage=await usageRows(f.s,before.id);assert.deepEqual(after.domainResultReceipt,before.domainResultReceipt);assert.equal(usage[0].financialCancellation,true);assert.equal(usage[1].executionKind,'service-planned');assert.equal(usage[1].financialRequest,undefined);assert.equal(usage[1].attemptCount,0);assert.equal(f.server.saved().rows.length,1);assert.equal(f.physical(),0);
});

test('cold recovery has no profile, tokenizer, material processing or body-acquisition path',async t=>{
 const f=await maintenanceRecoveryFixture(t,{mixed:true}),start=f.calls.length,before={topic:f.state.topicAssessments,context:f.state.contextOperations};
 const forbidden=()=>{throw Error('SYNTHETIC forbidden content path');},configuration={...f.configuration,readProfile:forbidden,currentProfile:forbidden,tokenize:forbidden,isCurrentTokenizer:forbidden,processing:{resolve:forbidden,isCurrent:forbidden}};
 assert.equal((await createConfiguredMaintenanceSession(f.s,configuration).opportunity()).state,'RECOVERED');assert.deepEqual({topic:f.state.topicAssessments,context:f.state.contextOperations},before);assert.ok(f.calls.slice(start).every(c=>['/api/operation-status','/api/results'].includes(c.path)));assert.ok(f.calls.slice(start).every(c=>!Object.hasOwn(c.data,'payload')&&!Object.hasOwn(c.data,'envelope')));assert.equal(f.physical(),1);
});

test('two cold sessions coalesce recovery and neither starts a fresh cycle',async t=>{
 const f=await maintenanceRecoveryFixture(t),first=createConfiguredMaintenanceSession(f.s,f.configuration),second=createConfiguredMaintenanceSession(f.s,f.configuration),start=f.calls.length;
 assert.deepEqual((await Promise.all([first.opportunity(),second.opportunity()])).map(r=>r.state),['RECOVERED','RECOVERED']);assert.equal(f.calls.slice(start).filter(c=>c.path==='/api/operation-status').length,1);assert.equal(f.calls.slice(start).filter(c=>c.path==='/api/results').length,1);assert.equal(f.physical(),1);
});

test('cold restart between a genuine later plan and declaration resumes only that never-sent plan',async t=>{
 const f=await maintenanceRecoveryFixture(t),cold=createConfiguredMaintenanceSession(f.s,f.configuration);assert.equal((await cold.opportunity()).state,'RECOVERED');const original=await job(f),next=laterMaintenanceService(f,f.server.saved().rows[0].window.nextEligibilityAt),planning=createConfiguredMaintenanceSession(f.s,next.configuration);
 const handle=await planning.prepare({scope:next.configuration.scope,contractVersion:next.configuration.contractVersion,routeVersion:next.configuration.routeVersion});assert.notEqual(handle.jobId,original.id);assert.equal(next.calls.length,0);planning.dispose();
 const result=await createConfiguredMaintenanceSession(f.s,next.configuration).opportunity();assert.equal(result.state,'COMMITTED',JSON.stringify(result));assert.equal(result.jobId,handle.jobId);assert.equal(next.calls.filter(c=>c.path==='/api/provider').length,1);assert.equal(f.physical(),2);
});

test('unresolved Maintenance never follows a replacement library flight',async t=>{
 const f=await maintenanceRecoveryFixture(t),j=await job(f);await f.s.foundationWrite(tx=>tx.put('meta',{id:j.flightId,jobId:'SYNTHETIC-other-job'}));await assert.rejects(f.foundation.maintenanceRecovery(f.configuration.origin),{code:'RESULT_BINDING_MISMATCH'});assert.equal(f.physical(),1);
});

import {createClientResultTransport} from '../../../extension/core/ai-usage/client-result-transport.js';
test('old exact subset result acknowledgement remains readable after a genuine new cycle replaces its marker',async t=>{
 const f=await maintenanceRecoveryFixture(t,{mixed:true}),cold=createConfiguredMaintenanceSession(f.s,f.configuration);assert.equal((await cold.opportunity()).state,'RECOVERED');const original=await job(f),next=laterMaintenanceService(f,f.server.saved().rows[0].window.nextEligibilityAt),result=await createConfiguredMaintenanceSession(f.s,next.configuration).opportunity();assert.equal(result.processedState??result.state,'COMMITTED',JSON.stringify(result));assert.notEqual((await meta(f)).jobId,original.id);
 const request=original.maintenanceRecovery.requests[0],proofs=await f.configuration.readProofs(request),transport=createClientResultTransport({endpoint:f.configuration.origin+'/api/results',fetch:f.configuration.fetch}),calls=f.calls.length;
 assert.deepEqual(await f.foundation.reportResult(original.id,proofs,transport),original.resultReport.ack);assert.equal(f.calls.length,calls);assert.deepEqual(await job(f),original);
});
