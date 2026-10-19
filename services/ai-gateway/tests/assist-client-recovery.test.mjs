import test from 'node:test';
import assert from 'node:assert/strict';
import {assistServiceFixture} from './assist-client-fixture.mjs';
const rows=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async n=>[n,await t.all(n)]))));
test('cold restart cannot rebill or recover the body of an old reply, even with lost provider acknowledgement',async t=>{
 const f=await assistServiceFixture(t,{loseProvider:true});await assert.rejects(f.run());assert.equal(f.physical(),1);f.restoreAcks();await f.restart();await assert.rejects(f.run());assert.equal(f.physical(),1);
 await f.commands.session.recover();const after=await rows(f.s);assert.equal(after.organizerJobs[0].state,'EXPIRED_UNCOMMITTED');assert.equal(after.organizerUsage[0].spendState,'SETTLED_SERVICE');assert.equal(after.organizerWorkItems.length,0);assert.equal(after.organizerJobs[0].resultReport.evidence.result.outcome,'FAILED');
 assert.equal(JSON.stringify(after).includes(f.snapshot.text),false);f.ready(true);await assert.rejects(f.run());assert.equal(f.physical(),1,'even a synthetic ready assertion cannot reauthorize the old reader session');
});
test('lost reservation acknowledgement cancels only the original provably unsent hold; no new paid replay',async t=>{
 const f=await assistServiceFixture(t,{loseReservation:true});await assert.rejects(f.run());assert.equal(f.physical(),0);f.restoreAcks();await f.restart();await f.commands.session.recover();const after=await rows(f.s);assert.equal(after.organizerUsage[0].financialCancellation,true);assert.equal(after.organizerUsage[0].spendState,'RELEASED_SERVICE_BEFORE_DISPATCH');assert.equal(after.organizerJobs[0].resultReport.evidence.result.outcome,'FAILED');assert.equal(f.physical(),0);
 f.ready(true);await assert.rejects(f.run());assert.equal(f.physical(),0);
});

test('UNKNOWN original financial outcome retains its hold through cold recovery and never admits a fresh paid retry',async t=>{
 const f=await assistServiceFixture(t,{unknownUsage:true});await assert.rejects(f.run());assert.equal(f.physical(),1);const original=f.server.saved().rows[0];assert.equal(original.state,'OUTCOME_UNKNOWN');
 await f.restart();for(let i=0;i<2;i++)await assert.rejects(f.commands.session.recover(),{code:'OUTCOME_UNKNOWN'});assert.equal(f.physical(),1);assert.deepEqual(f.server.saved().rows[0],original);assert.equal((await rows(f.s)).organizerWorkItems.length,0);
 f.ready(true);await assert.rejects(f.run());assert.equal(f.physical(),1);assert.equal(f.calls.filter(c=>c.path==='/api/reservations'&&c.data.action==='reserve').length,1);
});

import {createClientOperationStatusTransport} from '../../../extension/core/ai-usage/client-operation-status-transport.js';
import {createClientReservationTransport} from '../../../extension/core/ai-usage/client-reservation-transport.js';
const FLIGHT='aiu:assist-service-preflight:v1';
async function recoveryParts(f){
 const ai=f.commands.session.foundation,handle=await ai.assistRecovery(f.configuration.origin),proofs=await f.configuration.readProofs(handle.request);
 const status=createClientOperationStatusTransport({endpoint:f.configuration.origin+'/api/operation-status',fetch:f.configuration.fetch}),reservations=createClientReservationTransport({endpoint:f.configuration.origin+'/api/reservations',fetch:f.configuration.fetch});
 const observation=await ai.queryAssistRecovery(handle,proofs,status,()=>true);return {ai,handle,proofs,status,reservations,observation};
}
test('only the original private Assist recovery handle and observed original status/cancellation can release a hold',async t=>{
 const f=await assistServiceFixture(t,{loseReservation:true});await assert.rejects(f.run());await f.restart();const {ai,handle,proofs,status,reservations,observation}=await recoveryParts(f),before=await rows(f.s);
 await assert.rejects(ai.queryAssistRecovery(structuredClone(handle),proofs,status,()=>true),{code:'UNAVAILABLE'});
 assert.equal(await ai.historicalRecovery(f.configuration.origin),null);
 const foreign=createClientOperationStatusTransport({endpoint:'https://other.invalid/api/operation-status',fetch:f.configuration.fetch});
 for(const [value,transport]of [[structuredClone(observation),status],[observation,foreign],[{...observation,financialCancellation:true},status]])await assert.rejects(ai.reconcileAssistRecovery(handle,value,transport,{isCurrent:()=>true}));
 const fake={decision:'cancelled',operationId:handle.request.operationId,state:'CANCELLED_BEFORE_DISPATCH',reservationMicros:observation.reservationMicros,financialCancellation:true,financialAuthority:false,dispatchAllowed:false,retryAllowed:false};
 await assert.rejects(ai.reconcileAssistRecovery(handle,observation,status,{cancellation:fake,reservations,isCurrent:()=>true}),{code:'OUTCOME_UNKNOWN'});
 assert.deepEqual(await rows(f.s),before);
 const second=await ai.assistRecovery(f.configuration.origin),cancellation=await ai.cancelAssistRecovery(handle,proofs,observation,status,reservations,()=>true);
 await assert.rejects(ai.reconcileAssistRecovery(handle,observation,status,{cancellation:structuredClone(cancellation),reservations,isCurrent:()=>true}),{code:'OUTCOME_UNKNOWN'});
 await ai.reconcileAssistRecovery(handle,observation,status,{cancellation,reservations,isCurrent:()=>true});
 await assert.rejects(ai.reconcileAssistRecovery(handle,observation,status,{cancellation,reservations,isCurrent:()=>true}),{code:'UNAVAILABLE'});
 await assert.rejects(ai.reconcileAssistRecovery(second,observation,status,{cancellation,reservations,isCurrent:()=>true}),{code:'RESULT_CONFLICT'});assert.equal(f.physical(),0);
});
for(const changed of ['marker','job','attempt','reply-fence','flight','dispatch','authority'])test(`Assist final recovery transaction rolls back a changed original ${changed}`,async t=>{
 const f=await assistServiceFixture(t,{loseProvider:true});await assert.rejects(f.run());await f.restart();const {ai,handle,status,observation}=await recoveryParts(f),before=await rows(f.s),write=ai.write.bind(ai);let mutated=false;
 ai.write=fn=>write(async tx=>{const put=tx.put.bind(tx);tx.put=async(table,row)=>{await put(table,row);if(!mutated&&table==='organizerJobs'&&row.domainResultReceipt?.outcome==='FAILED'){
  mutated=true;const marker=await tx.get('meta',FLIGHT);
  if(changed==='marker')await put('meta',{...marker,evaluationKey:'changed'});
  if(changed==='job')await put('organizerJobs',{...row,cancelEpoch:row.cancelEpoch+1});
  if(changed==='attempt'){const attempt=await tx.get('organizerUsage','aiu:attempt:'+marker.childId);await put('organizerUsage',{...attempt,effectiveResultCount:1});}
  if(changed==='reply-fence'){const fence=await tx.get('meta','aiu:assist-reply-session:v1:'+marker.replyKey);await put('meta',{...fence,sessionId:'changed'});}
  if(changed==='flight'){const flight=await tx.get('meta',row.flightId);await put('meta',{...flight,jobId:'changed'});}
  if(changed==='dispatch'){const dispatch=before.meta.find(v=>v.childId===marker.childId&&v.id!==FLIGHT);assert.ok(dispatch);await put('meta',{...dispatch,jobId:'changed'});}
  if(changed==='authority')f.revoke(false);
 }};return fn(tx);});
 await assert.rejects(ai.reconcileAssistRecovery(handle,observation,status,{isCurrent:()=>true}));assert.equal(mutated,true);assert.deepEqual(await rows(f.s),before);assert.equal(f.physical(),1);assert.equal(f.calls.filter(c=>c.path==='/api/results').length,0);
});
test('Assist recovery transport and final write both reject revoked current authority without admitting another paid operation',async t=>{
 const f=await assistServiceFixture(t,{loseProvider:true});await assert.rejects(f.run());await f.restart();const {ai,handle,proofs,status,observation}=await recoveryParts(f),before=await rows(f.s),calls=f.calls.length;
 await assert.rejects(ai.queryAssistRecovery(handle,proofs,status,()=>false),{code:'CANCELLED'});assert.equal(f.calls.length,calls);
 await assert.rejects(ai.reconcileAssistRecovery(handle,observation,status,{isCurrent:()=>false}),{code:'CANCELLED'});assert.deepEqual(await rows(f.s),before);assert.equal(f.physical(),1);
});
test('Assist cold recovery retries only an identical original FAILED result after losing the remote result ACK',async t=>{
 const f=await assistServiceFixture(t,{loseProvider:true,loseResult:true});await assert.rejects(f.run());await f.restart();await f.commands.session.recover();const queries=f.calls.filter(c=>c.path==='/api/operation-status').length;
 await f.commands.session.recover();const reports=f.calls.filter(c=>c.path==='/api/results');assert.equal(reports.length,2);assert.deepEqual(reports[0].data,reports[1].data);assert.equal(reports[0].data.result.outcome,'FAILED');assert.equal(f.calls.filter(c=>c.path==='/api/operation-status').length,queries);assert.equal(f.physical(),1);
 f.restoreAcks();await f.commands.session.recover();assert.equal((await rows(f.s)).organizerJobs[0].resultReport.state,'ACKNOWLEDGED');assert.equal(f.physical(),1);
});
