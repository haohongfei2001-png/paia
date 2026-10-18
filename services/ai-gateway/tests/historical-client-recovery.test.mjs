import test from 'node:test';
import assert from 'node:assert/strict';
import {historicalServiceFixture} from './historical-client-fixture.mjs';
import {createClientOperationStatusTransport} from '../../../extension/core/ai-usage/client-operation-status-transport.js';
import {createClientReservationTransport} from '../../../extension/core/ai-usage/client-reservation-transport.js';
import {rows} from '../../../extension/tests/harness/original-complete.mjs';
const FLIGHT='aiu:historical-service-preflight:v1';
const preflight=s=>s.run(()=>s.repository.transaction(false,t=>t.get('meta',FLIGHT)));
const remote=f=>f.calls.filter(c=>['/api/declarations','/api/provider'].includes(c.path)||c.path==='/api/reservations'&&c.data.action==='reserve');

test('cold reserve ACK loss preserves exact original request and cancels only that operation',async t=>{
 const f=await historicalServiceFixture(t,{loseReservation:true});await assert.rejects(f.service.refreshHistoricalCandidates('SYNTHETIC garden'),{code:'OUTCOME_UNKNOWN'});
 const marker=await preflight(f.s);assert.deepEqual(marker.financialRequest,f.server.saved().rows[0].request);
 const cold=await f.restart(),before=remote(f).length;
 await assert.rejects(cold.service.refreshHistoricalCandidates('SYNTHETIC garden'));
 const queries=f.calls.filter(c=>c.path==='/api/operation-status');assert.equal(queries.length,1);assert.deepEqual(queries[0].data.request,marker.financialRequest);
 assert.equal(remote(f).length,before);assert.equal(f.server.saved().rows[0].state,'CANCELLED_BEFORE_DISPATCH');
 const [attempt]=await rows(cold.s,'organizerUsage');assert.equal(attempt.financialCancellation,true);assert.equal(attempt.childId,marker.childId);assert.equal(attempt.attemptCount,0);
 const [job]=await rows(cold.s,'organizerJobs');assert.equal(job.domainResultReceipt.outcome,'FAILED');assert.equal(f.calls.find(c=>c.path==='/api/results').data.result.outcome,'FAILED');
 assert.doesNotMatch(JSON.stringify({marker,job,attempt}),/garden|observation|principalToken|entitlementToken/);
});

test('cold provider ACK loss recovers exact settled money, FAILED metadata and no private result',async t=>{
 const f=await historicalServiceFixture(t,{loseProvider:true});await assert.rejects(f.service.refreshHistoricalCandidates('SYNTHETIC garden'),{code:'OUTCOME_UNKNOWN'});
 const original=f.server.saved().rows[0],cold=await f.restart(),before=remote(f).length,queries=f.calls.filter(c=>c.path==='/api/operation-status').length;
 await assert.rejects(cold.service.refreshHistoricalCandidates('SYNTHETIC garden'));
 assert.equal(f.calls.filter(c=>c.path==='/api/operation-status').length,queries+1);assert.equal(remote(f).length,before);assert.equal(f.physical(),1);
 const [attempt]=await rows(cold.s,'organizerUsage'),[job]=await rows(cold.s,'organizerJobs');assert.equal(attempt.state,'EXPIRED_UNCOMMITTED');assert.equal(attempt.attemptCount,1);assert.equal(attempt.financialSettlement.settledSpendMicros,original.settlement.usdMicros);assert.deepEqual(attempt.financialSettlementEvidence,original.settlement);
 assert.equal(job.domainResultReceipt.outcome,'FAILED');assert.equal(job.resultCommitted,false);assert.equal((await rows(cold.s,'organizerWorkItems')).length,0);assert.equal(f.calls.find(c=>c.path==='/api/results').data.result.outcome,'FAILED');assert.equal(f.server.saved().rows[0].resultCommitted,undefined);
 assert.deepEqual(await cold.service.adoptHistoricalCandidates(null),await cold.service.query());
});

for(const mode of ['legacy','NOT_FOUND','lost-query'])test(`cold ${mode} never releases unknown or sends another declaration/reserve/provider`,async t=>{
 const f=await historicalServiceFixture(t,{loseReservation:true});await assert.rejects(f.service.refreshHistoricalCandidates('SYNTHETIC garden'));
 if(mode==='legacy')await f.s.foundationWrite(async tx=>{const row=await tx.get('meta',FLIGHT);delete row.financialRequest;await tx.put('meta',row);});
 const send=f.configuration.fetch;let queries=0;
 f.configuration.fetch=async request=>{if(new URL(request.url).pathname!=='/api/operation-status')return send(request);queries++;if(mode==='lost-query')throw Error('SYNTHETIC lost status ACK');const {request:r}=await request.json();return Response.json({decision:'queried',operationId:r.operationId,jobId:r.jobId,state:'NOT_FOUND',financialOutcome:'UNKNOWN',providerEvidenceRecorded:null,observedAt:f.server.now,reservation:null,financialAuthority:false,dispatchAllowed:false,retryAllowed:false});};
 const cold=await f.restart(),before=remote(f).length;await assert.rejects(cold.service.refreshHistoricalCandidates('SYNTHETIC'));
 assert.equal(queries,mode==='legacy'?0:1);assert.equal(remote(f).length,before);assert.equal(f.physical(),0);assert.equal(f.server.saved().rows[0].state,'RESERVED');assert.equal((await rows(cold.s,'organizerUsage')).length,0);
});

test('a terminal original recovery permits only a genuinely different explicit intent',async t=>{
 const f=await historicalServiceFixture(t,{loseReservation:true,dropRevocation:true});await assert.rejects(f.service.refreshHistoricalCandidates('SYNTHETIC garden'));
 const original=f.server.saved().rows[0].request,cold=await f.restart();f.restoreAcks();
 await assert.rejects(cold.service.refreshHistoricalCandidates('SYNTHETIC garden'));
 const handle=await cold.service.refreshHistoricalCandidates('SYNTHETIC');assert.equal((await cold.service.adoptHistoricalCandidates(handle)).candidateSource,'ai');
 const attempts=await rows(cold.s,'organizerUsage');assert.equal(attempts.length,2);assert.equal(attempts.find(r=>r.childId===original.operationId).financialCancellation,true);assert.equal(f.physical(),1);
 const reserves=f.calls.filter(c=>c.path==='/api/reservations'&&c.data.action==='reserve');assert.equal(reserves.length,2);assert.notEqual(reserves[1].data.request.operationId,original.operationId);
});

test('an original local cancellation keeps its immutable FAILED event while authentic finance is appended',async t=>{
 const f=await historicalServiceFixture(t,{loseReservation:true,dropRevocation:true});await assert.rejects(f.service.refreshHistoricalCandidates('SYNTHETIC garden'));
 const [before]=await rows(f.s,'organizerJobs');await f.session.foundation.cancel(before.id);const [cancelled]=await rows(f.s,'organizerJobs');assert.equal(cancelled.domainResultReceipt.children[0].executionKind,null);
 const cold=await f.restart();await assert.rejects(cold.service.refreshHistoricalCandidates('SYNTHETIC garden'));
 const [job]=await rows(cold.s,'organizerJobs'),[attempt]=await rows(cold.s,'organizerUsage');assert.deepEqual(job.domainResultReceipt,cancelled.domainResultReceipt);assert.equal(attempt.financialCancellation,true);assert.equal(attempt.attemptCount,0);assert.equal(f.server.saved().rows[0].state,'CANCELLED_BEFORE_DISPATCH');assert.equal(f.calls.find(c=>c.path==='/api/results').data.result.outcome,'FAILED');
});

test('original local dispatch UNKNOWN plus real RESERVED cancellation preserves its attempt count',async t=>{
 const f=await historicalServiceFixture(t,{dropRevocation:true}),dispatch=f.session.foundation.dispatch.bind(f.session.foundation);
 f.session.foundation.dispatch=(id,child,provider,execution)=>dispatch(id,child,provider,{...execution,signal:AbortSignal.abort()});
 await assert.rejects(f.service.refreshHistoricalCandidates('SYNTHETIC garden'));const [before]=await rows(f.s,'organizerUsage');assert.equal(before.attemptCount,1);assert.equal(before.state,'OUTCOME_UNKNOWN');assert.equal(f.physical(),0);
 const cold=await f.restart();await assert.rejects(cold.service.refreshHistoricalCandidates('SYNTHETIC garden'));
 const [attempt]=await rows(cold.s,'organizerUsage'),[job]=await rows(cold.s,'organizerJobs');assert.equal(attempt.attemptCount,1);assert.equal(attempt.financialCancellation,true);assert.equal(attempt.childId,before.childId);assert.equal(job.domainResultReceipt.outcome,'FAILED');assert.equal(f.physical(),0);
 const handle=await cold.service.refreshHistoricalCandidates('SYNTHETIC');assert.equal((await cold.service.adoptHistoricalCandidates(handle)).candidateSource,'ai');assert.equal(f.physical(),1);
});

test('cold known settlement after rolled-back local CAS becomes FAILED without a body replay',async t=>{
 const f=await historicalServiceFixture(t),write=f.session.foundation.write.bind(f.session.foundation);let fail=true;
 f.session.foundation.write=fn=>write(async tx=>{const put=tx.put.bind(tx);tx.put=(table,row)=>{if(fail&&table==='organizerJobs'&&row.state==='COMMITTED'){fail=false;throw Error('SYNTHETIC local CAS rollback');}return put(table,row);};return fn(tx);});
 await assert.rejects(f.service.refreshHistoricalCandidates('SYNTHETIC garden'));assert.equal((await rows(f.s,'organizerUsage'))[0].state,'RESPONSE_RECORDED');
 const cold=await f.restart();await assert.rejects(cold.service.refreshHistoricalCandidates('SYNTHETIC garden'));
 const [attempt]=await rows(cold.s,'organizerUsage');assert.equal(attempt.state,'EXPIRED_UNCOMMITTED');assert.equal(attempt.financialSettlement.settledSpendMicros,120);assert.equal((await rows(cold.s,'organizerWorkItems')).length,0);assert.equal(f.physical(),1);assert.equal(f.calls.find(c=>c.path==='/api/results').data.result.outcome,'FAILED');
});

test('concurrent explicit cold refreshes share one metadata query and no original paid replay',async t=>{
 const f=await historicalServiceFixture(t,{loseProvider:true});await assert.rejects(f.service.refreshHistoricalCandidates('SYNTHETIC garden'));
 const send=f.configuration.fetch;let release,entered;const hold=new Promise(r=>release=r),started=new Promise(r=>entered=r);let queries=0;
 f.configuration.fetch=async request=>{if(new URL(request.url).pathname==='/api/operation-status'){queries++;entered();await hold;}return send(request);};
 const cold=await f.restart(),a=cold.service.refreshHistoricalCandidates('SYNTHETIC garden'),b=cold.service.refreshHistoricalCandidates('SYNTHETIC garden');const outcomes=Promise.allSettled([a,b]);
 try{await started;assert.equal(queries,1);release();const results=await outcomes;assert.ok(results.every(r=>r.status==='rejected'));assert.equal(queries,1);assert.equal(f.physical(),1);assert.equal(f.calls.filter(c=>c.path==='/api/results').length,1);}finally{release();await outcomes;}
});


async function recoveryParts(f){
 const ai=f.session.foundation,handle=await ai.historicalRecovery(f.configuration.origin),proofs=await f.configuration.readProofs(handle.request);
 const status=createClientOperationStatusTransport({endpoint:f.configuration.origin+'/api/operation-status',fetch:f.configuration.fetch}),reservations=createClientReservationTransport({endpoint:f.configuration.origin+'/api/reservations',fetch:f.configuration.fetch});
 const observation=await ai.queryHistoricalRecovery(handle,proofs,status,()=>true);return {ai,handle,proofs,status,reservations,observation};
}

test('forged or cloned handles, status, cancellation flags and ACKs cannot mint financial recovery',async t=>{
 const f=await historicalServiceFixture(t,{loseReservation:true,dropRevocation:true});await assert.rejects(f.service.refreshHistoricalCandidates('SYNTHETIC garden'));
 const p=await recoveryParts(f),{ai,handle,proofs,status,reservations,observation}=p,other=createClientOperationStatusTransport({endpoint:'https://other.invalid/api/operation-status',fetch:f.configuration.fetch});
 await assert.rejects(ai.queryHistoricalRecovery(structuredClone(handle),proofs,status,()=>true),{code:'UNAVAILABLE'});
 await assert.rejects(ai.queryHistoricalRecovery(handle,{...proofs,request:{...handle.request,operationId:'forged'}},status,()=>true));
 for(const [value,transport] of [[structuredClone(observation),status],[observation,other],[{...observation,financialCancellation:true},status]])await assert.rejects(ai.reconcileHistoricalRecovery(handle,value,transport,{isCurrent:()=>true}));
 const foreign=await other.query({request:handle.request,...proofs});await assert.rejects(ai.reconcileHistoricalRecovery(handle,foreign,other,{isCurrent:()=>true}),{code:'RESULT_BINDING_MISMATCH'});
 const fake={decision:'cancelled',operationId:handle.request.operationId,state:'CANCELLED_BEFORE_DISPATCH',reservationMicros:observation.reservationMicros,financialCancellation:true,financialAuthority:false,dispatchAllowed:false,retryAllowed:false};
 await assert.rejects(ai.reconcileHistoricalRecovery(handle,observation,status,{cancellation:fake,reservations,isCurrent:()=>true}),{code:'OUTCOME_UNKNOWN'});
 const cancellation=await ai.cancelHistoricalRecovery(handle,proofs,observation,status,reservations,()=>true);
 await assert.rejects(ai.reconcileHistoricalRecovery(handle,observation,status,{cancellation:structuredClone(cancellation),reservations,isCurrent:()=>true}),{code:'OUTCOME_UNKNOWN'});
 assert.equal((await rows(f.s,'organizerUsage')).length,0);
 await ai.reconcileHistoricalRecovery(handle,observation,status,{cancellation,reservations,isCurrent:()=>true});assert.equal((await rows(f.s,'organizerUsage'))[0].financialCancellation,true);
});

test('a genuine observation for a different original operation cannot be rebound',async t=>{
 const f=await historicalServiceFixture(t,{loseReservation:true,dropRevocation:true});await assert.rejects(f.service.refreshHistoricalCandidates('SYNTHETIC garden'));
 const {ai,handle,status}=await recoveryParts(f),request={...handle.request,operationId:'SYNTHETIC-different-operation'},proofs=await f.configuration.readProofs(request),other=await status.query({request,...proofs});
 assert.equal(other.state,'NOT_FOUND');await assert.rejects(ai.reconcileHistoricalRecovery(handle,other,status,{isCurrent:()=>true}),{code:'RESULT_BINDING_MISMATCH'});assert.equal((await rows(f.s,'organizerUsage')).length,0);
});

for(const boundary of ['proofs-meta','query-job','cancel-meta'])test(`recovery refuses original ${boundary} changes across an await`,async t=>{
 const f=await historicalServiceFixture(t,{loseReservation:true,dropRevocation:true});await assert.rejects(f.service.refreshHistoricalCandidates('SYNTHETIC garden'));
 const read=f.configuration.readProofs,send=f.configuration.fetch;let entered,release;const started=new Promise(r=>entered=r),hold=new Promise(r=>release=r);
 const wait=async()=>{entered();await hold;};
 if(boundary==='proofs-meta')f.configuration.readProofs=async request=>{const result=await read(request);await wait();return result;};
 else f.configuration.fetch=async request=>{const data=await request.clone().json(),path=new URL(request.url).pathname,result=await send(request);if(boundary==='query-job'&&path==='/api/operation-status'||boundary==='cancel-meta'&&path==='/api/reservations'&&data.action==='cancel')await wait();return result;};
 const cold=await f.restart(),queries=f.calls.filter(c=>c.path==='/api/operation-status').length,cancels=f.calls.filter(c=>c.path==='/api/reservations'&&c.data.action==='cancel').length,pending=cold.service.refreshHistoricalCandidates('SYNTHETIC garden'),outcome=pending.catch(e=>e);
 try{
  await started;
  if(boundary==='query-job'){const [job]=await rows(cold.s,'organizerJobs');await cold.session.foundation.cancel(job.id);}
  else await cold.s.foundationWrite(async tx=>{const marker=await tx.get('meta',FLIGHT);marker.evaluationKey='changed-after-await';await tx.put('meta',marker);});
  release();const error=await outcome;assert.ok(error instanceof Error);assert.equal(error.code,'RESULT_CONFLICT');assert.equal((await rows(cold.s,'organizerUsage')).length,0);assert.equal(f.physical(),0);
  if(boundary==='proofs-meta')assert.equal(f.calls.filter(c=>c.path==='/api/operation-status').length,queries);
  if(boundary!=='cancel-meta')assert.equal(f.calls.filter(c=>c.path==='/api/reservations'&&c.data.action==='cancel').length,cancels);
 }finally{release();await outcome;}
});

test('a cancelled-looking durable boolean alone neither closes the preflight nor authorizes a new paid intent',async t=>{
 const f=await historicalServiceFixture(t,{dropRevocation:true}),reserve=f.session.foundation.reserveServer.bind(f.session.foundation);
 f.session.foundation.reserveServer=async(...args)=>{const result=await reserve(...args);throw Error('SYNTHETIC crash after original local reservation');};
 await assert.rejects(f.service.refreshHistoricalCandidates('SYNTHETIC garden'));const [job]=await rows(f.s,'organizerJobs');await f.session.foundation.cancel(job.id);
 await f.s.foundationWrite(async tx=>{const row=await tx.get('organizerUsage','aiu:attempt:'+job.childIds[0]);row.financialCancellation=true;await tx.put('organizerUsage',row);});
 const send=f.configuration.fetch;f.configuration.fetch=async request=>{if(new URL(request.url).pathname==='/api/operation-status')throw Error('SYNTHETIC no remote evidence');return send(request);};
 const cold=await f.restart(),before=remote(f).length;await assert.rejects(cold.service.refreshHistoricalCandidates('SYNTHETIC'),{code:'OUTCOME_UNKNOWN'});assert.equal(remote(f).length,before);assert.equal(f.physical(),0);assert.equal(f.server.saved().rows[0].state,'RESERVED');
});

test('a malformed cancellation amount cannot replace the exact observed reservation',async t=>{
 const f=await historicalServiceFixture(t,{loseReservation:true,dropRevocation:true});await assert.rejects(f.service.refreshHistoricalCandidates('SYNTHETIC garden'));
 const send=f.configuration.fetch;f.configuration.fetch=async request=>{const data=await request.clone().json(),response=await send(request);if(new URL(request.url).pathname==='/api/reservations'&&data.action==='cancel'){const value=await response.json();return Response.json({...value,reservationMicros:value.reservationMicros+1});}return response;};
 const cold=await f.restart();await assert.rejects(cold.service.refreshHistoricalCandidates('SYNTHETIC'),{code:'OUTCOME_UNKNOWN'});assert.equal((await rows(cold.s,'organizerUsage')).length,0);assert.equal(f.physical(),0);
});

test('purging original sources before cold settlement recovery never reconstructs or reauthorizes their bodies',async t=>{
 const f=await historicalServiceFixture(t,{loseProvider:true});await assert.rejects(f.service.refreshHistoricalCandidates('SYNTHETIC garden'));
 const [before]=await rows(f.s,'organizerJobs');for(const id of before.sourceRecordIds)await f.s.purge(id,true);
 const cold=await f.restart(),paid=remote(f).length;await assert.rejects(cold.service.refreshHistoricalCandidates('SYNTHETIC garden'));
 assert.equal(remote(f).length,paid);assert.equal(f.physical(),1);assert.equal((await rows(cold.s,'organizerWorkItems')).filter(r=>r.id.startsWith('aiu:historical-result:')).length,0);assert.deepEqual(await cold.service.adoptHistoricalCandidates(null),await cold.service.query());
 const attempts=(await rows(cold.s,'organizerUsage')).filter(r=>r.childId===before.childIds[0]);if(attempts.length)assert.equal(attempts[0].financialSettlement?.settledSpendMicros,120);assert.equal(f.server.saved().rows[0].settlement.usdMicros,120);
});

test('actual provider UNKNOWN evidence retains the original reservation after explicit cold query',async t=>{
 const f=await historicalServiceFixture(t,{beforeResponse:()=>{throw Error('SYNTHETIC uncertain provider completion');}});await assert.rejects(f.service.refreshHistoricalCandidates('SYNTHETIC garden'));
 assert.equal(f.server.saved().rows[0].state,'OUTCOME_UNKNOWN');const cold=await f.restart(),before=remote(f).length,queries=f.calls.filter(c=>c.path==='/api/operation-status').length;
 await assert.rejects(cold.service.refreshHistoricalCandidates('SYNTHETIC'),{code:'OUTCOME_UNKNOWN'});assert.equal(remote(f).length,before);assert.equal(f.calls.filter(c=>c.path==='/api/operation-status').length,queries+1);assert.equal(f.calls.filter(c=>c.path==='/api/results').length,0);assert.equal(f.server.saved().rows[0].state,'OUTCOME_UNKNOWN');assert.equal((await rows(cold.s,'organizerUsage'))[0].spendState,'RESERVATION_RETAINED');
});

test('lost cancellation ACK remains unknown until a later explicit original ACK is actually observed',async t=>{
 const f=await historicalServiceFixture(t,{loseReservation:true,dropRevocation:true});await assert.rejects(f.service.refreshHistoricalCandidates('SYNTHETIC garden'));
 const send=f.configuration.fetch;let lost=true;
 f.configuration.fetch=async request=>{const data=await request.clone().json(),result=await send(request);if(lost&&new URL(request.url).pathname==='/api/reservations'&&data.action==='cancel'){lost=false;throw Error('SYNTHETIC lost cancellation ACK');}return result;};
 const cold=await f.restart(),before=remote(f).length;await assert.rejects(cold.service.refreshHistoricalCandidates('SYNTHETIC garden'),{code:'OUTCOME_UNKNOWN'});assert.equal((await rows(cold.s,'organizerUsage')).length,0);assert.equal(f.server.saved().rows[0].state,'CANCELLED_BEFORE_DISPATCH');
 await assert.rejects(cold.service.refreshHistoricalCandidates('SYNTHETIC garden'));assert.equal((await rows(cold.s,'organizerUsage'))[0].financialCancellation,true);assert.equal(remote(f).length,before);assert.equal(f.calls.filter(c=>c.path==='/api/operation-status').length,2);assert.equal(f.calls.filter(c=>c.path==='/api/reservations'&&c.data.action==='cancel').length,2);
});

test('recovered FAILED reporting retries only identical original metadata after a lost result ACK',async t=>{
 const f=await historicalServiceFixture(t,{loseProvider:true,loseResult:true});await assert.rejects(f.service.refreshHistoricalCandidates('SYNTHETIC garden'));
 const cold=await f.restart();await assert.rejects(cold.service.refreshHistoricalCandidates('SYNTHETIC garden'));const queries=f.calls.filter(c=>c.path==='/api/operation-status').length;
 await assert.rejects(cold.service.refreshHistoricalCandidates('SYNTHETIC garden'));const reports=f.calls.filter(c=>c.path==='/api/results');assert.equal(reports.length,2);assert.deepEqual(reports[0].data,reports[1].data);assert.equal(reports[1].data.result.outcome,'FAILED');assert.equal(f.calls.filter(c=>c.path==='/api/operation-status').length,queries);assert.equal(f.physical(),1);
});

for(const changed of ['meta','job'])test(`last recovery write detects changed original ${changed} and rolls back financial publication`,async t=>{
 const f=await historicalServiceFixture(t,{loseProvider:true});await assert.rejects(f.service.refreshHistoricalCandidates('SYNTHETIC garden'));
 const cold=await f.restart(),write=cold.session.foundation.write.bind(cold.session.foundation);let mutated=false;
 cold.session.foundation.write=fn=>write(async tx=>{const put=tx.put.bind(tx);tx.put=async(table,row)=>{await put(table,row);if(!mutated&&table==='organizerJobs'&&row.domainResultReceipt?.outcome==='FAILED'){mutated=true;if(changed==='meta'){const marker=await tx.get('meta',FLIGHT);await put('meta',{...marker,evaluationKey:'SYNTHETIC-last-write-change'});}else await put('organizerJobs',{...row,cancelEpoch:row.cancelEpoch+1});}};return fn(tx);});
 await assert.rejects(cold.service.refreshHistoricalCandidates('SYNTHETIC garden'));assert.equal(mutated,true);const [row]=await rows(cold.s,'organizerUsage');assert.equal(row.state,'OUTCOME_UNKNOWN');assert.equal(row.financialSettlement,undefined);assert.equal(f.calls.filter(c=>c.path==='/api/results').length,0);assert.equal(f.physical(),1);
});

test('expired original content declaration can cancel its exact RESERVED operation without reauthorization',async t=>{
 const f=await historicalServiceFixture(t,{loseReservation:true});await assert.rejects(f.service.refreshHistoricalCandidates('SYNTHETIC garden'));
 const original=f.server.saved().rows[0].request;f.server.setClock(f.server.now+55000);const cold=await f.restart(),before=remote(f).length;
 await assert.rejects(cold.service.refreshHistoricalCandidates('SYNTHETIC garden'),{code:'CANCELLED'});const [attempt]=await rows(cold.s,'organizerUsage');assert.equal(attempt.financialCancellation,true);assert.deepEqual(attempt.financialRequest,original);assert.equal(remote(f).length,before);assert.equal(f.physical(),0);assert.equal(f.server.saved().rows[0].state,'CANCELLED_BEFORE_DISPATCH');assert.equal(f.server.grants.get(original.operationId).authorized,false);
});

for(const invalid of ['signature','revoked-principal','expired-principal'])test(`cold recovery refuses ${invalid} signed identity without reentering paid work`,async t=>{
 const f=await historicalServiceFixture(t,{loseReservation:true});await assert.rejects(f.service.refreshHistoricalCandidates('SYNTHETIC garden'));
 const read=f.configuration.readProofs;
 f.configuration.readProofs=async request=>{const proof=await read(request);if(invalid==='signature')return {...proof,principalToken:'SYNTHETIC-forged-proof'};const row=f.server.principals.get([request.principalId,request.libraryId].join('/'));if(invalid==='revoked-principal')row.security.principalActive=false;else row.security.expiresAt=f.server.now/1000;return proof;};
 const cold=await f.restart(),before=remote(f).length;await assert.rejects(cold.service.refreshHistoricalCandidates('SYNTHETIC'),{code:'OUTCOME_UNKNOWN'});assert.equal(remote(f).length,before);assert.equal(f.calls.filter(c=>c.path==='/api/reservations'&&c.data.action==='cancel').length,0);assert.equal((await rows(cold.s,'organizerUsage')).length,0);assert.equal(f.server.saved().rows[0].state,'RESERVED');
});

test('original PromptSurface RPC recovers a cold original then admits a distinct explicit request',async t=>{
 const {PromptReuseCommands}=await import('../../../extension/background/prompt-reuse-commands.js'),{PromptSurfaceCommands}=await import('../../../extension/background/prompt-surface.js');
 const f=await historicalServiceFixture(t,{loseReservation:true});await assert.rejects(f.service.refreshHistoricalCandidates('SYNTHETIC garden'));const original=f.server.saved().rows[0].request,cold=await f.restart();f.restoreAcks();
 const url='https://chatgpt.com/c/synthetic',nonce=crypto.randomUUID(),documentId='SYNTHETIC-recovery-surface';
 const api={runtime:{id:'ext',getURL:p=>'chrome-extension://ext/'+p,getContexts:async()=>[{documentId,tabId:7,windowId:4,frameId:9,documentUrl:'chrome-extension://ext/ui/prompt-surface.html#'+nonce}]},windows:{get:async()=>({id:4,focused:true})},tabs:{get:async()=>({id:7,url,windowId:4,active:true}),sendMessage:async()=>({open:true,nonce,url})}};
 const gateway=new PromptSurfaceCommands(new PromptReuseCommands(cold.service,api),api),sender={id:'ext',tab:{id:7},frameId:9,url:api.runtime.getURL('ui/prompt-surface.html')+'#'+nonce,documentId,documentLifecycle:'active'},rpc=command=>gateway.handle({type:'PAIA_PROMPT_SURFACE_RPC',nonce,command},sender);
 await assert.rejects(rpc({type:'history_candidates_refresh',query:'SYNTHETIC garden'}),{code:'CANCELLED'});assert.equal(f.physical(),0);assert.equal(f.server.saved().rows[0].state,'CANCELLED_BEFORE_DISPATCH');
 assert.deepEqual(await rpc({type:'history_candidates_refresh',query:'SYNTHETIC'}),{ready:true});assert.equal((await rpc({type:'history_candidates_adopt'})).candidateSource,'ai');assert.equal(f.physical(),1);
 const attempts=await rows(cold.s,'organizerUsage');assert.equal(attempts.find(r=>r.childId===original.operationId).attemptCount,0);const provider=f.calls.find(c=>c.path==='/api/provider');assert.notEqual(provider.data.bundle.request.operationId,original.operationId);assert.equal(f.calls.filter(c=>c.path==='/api/declarations'&&c.data.action==='publish'&&c.data.request.operationId===original.operationId).length,1);
});

test('cold financial recovery requires neither old profile nor tokenizer nor private request body',async t=>{
 const f=await historicalServiceFixture(t,{loseProvider:true});await assert.rejects(f.service.refreshHistoricalCandidates('SYNTHETIC garden'));let bodyReads=0;
 for(const key of ['readProfile','tokenize'])f.configuration[key]=async()=>{bodyReads++;throw Error('SYNTHETIC old request body capabilities are gone');};
 const cold=await f.restart(),before=f.calls.length;await assert.rejects(cold.service.refreshHistoricalCandidates('SYNTHETIC garden'),{code:'CANCELLED'});assert.equal(bodyReads,0);assert.deepEqual(f.calls.slice(before).map(c=>c.path),['/api/operation-status','/api/results']);
 assert.doesNotMatch(JSON.stringify(f.calls.slice(before)),/garden|observation|payload|messages|instructions/);assert.equal((await rows(cold.s,'organizerUsage'))[0].financialSettlement.settledSpendMicros,120);assert.equal(f.physical(),1);
});

test('a different configured origin cannot piggyback a same-store recovery already in flight',async t=>{
 const {PromptReuseService}=await import('../../../extension/core/prompt-reuse-service.js'),{createConfiguredHistoricalCandidateSession}=await import('../../../extension/core/ai-usage/configured-historical-session.js');
 const f=await historicalServiceFixture(t,{loseProvider:true});await assert.rejects(f.service.refreshHistoricalCandidates('SYNTHETIC garden'));
 const send=f.configuration.fetch;let release,entered;const hold=new Promise(r=>release=r),started=new Promise(r=>entered=r);let queries=0;
 f.configuration.fetch=async request=>{if(new URL(request.url).pathname==='/api/operation-status'){queries++;entered();await hold;}return send(request);};
 const cold=await f.restart(),pending=cold.service.refreshHistoricalCandidates('SYNTHETIC garden').catch(e=>e);
 try{await started;const other=new PromptReuseService(cold.s,{historyCandidates:createConfiguredHistoricalCandidateSession(cold.s,{...f.configuration,origin:'https://other.invalid'})});await assert.rejects(other.refreshHistoricalCandidates('SYNTHETIC'),{code:'RESULT_ORIGIN_MISMATCH'});assert.equal(queries,1);release();assert.ok(await pending instanceof Error);assert.equal(f.physical(),1);}finally{release();await pending;}
});
