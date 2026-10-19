import test from 'node:test';
import assert from 'node:assert/strict';
import {PromptReuseService} from '../../../extension/core/prompt-reuse-service.js';
import {createConfiguredHistoricalCandidateSession} from '../../../extension/core/ai-usage/configured-historical-session.js';
import {historicalServiceFixture} from './historical-client-fixture.mjs';
import {rows} from '../../../extension/tests/harness/original-complete.mjs';
import {inputEdit} from '../../../extension/tests/harness/thought-m1.mjs';
import {PromptReuseCommands} from '../../../extension/background/prompt-reuse-commands.js';
import {PromptSurfaceCommands} from '../../../extension/background/prompt-surface.js';
import {providerFixture} from './provider-fixtures.mjs';
import {createPostgresOperationStatusService} from '../operation-status-service.mjs';
import {createOperationStatusHandler} from '../operation-status-entry.mjs';
import {createClientOperationStatusTransport,observedClientOperationStatus} from '../../../extension/core/ai-usage/client-operation-status-transport.js';
test('original refresh/adopt -> signed real gateway owners -> existing-ID CAS -> metadata result',async t=>{
 const f=await historicalServiceFixture(t);await f.service.change({action:'create',revision:(await f.service.query()).revision,text:'SYNTHETIC retained manual choice'});assert.deepEqual(await f.service.historicalCandidateStatus(),{available:true});
 const handle=await f.service.refreshHistoricalCandidates('SYNTHETIC garden'),adopted=await f.service.adoptHistoricalCandidates(handle);
 assert.equal(adopted.candidateSource,'ai');assert.equal(f.physical(),1);assert.equal(adopted.items[0].text,'SYNTHETIC retained manual choice');assert.deepEqual(adopted.items.filter(x=>x.ref).map(x=>x.id),f.payload().candidates.map(x=>x.id).reverse());
 const jobs=await rows(f.s,'organizerJobs'),usage=await rows(f.s,'organizerUsage');assert.equal(jobs.length,1);assert.equal(jobs[0].state,'COMMITTED');assert.equal(usage[0].attemptCount,1);assert.equal(usage[0].spendState,'SETTLED_SERVICE');assert.equal(usage[0].financialSettlement.settledSpendMicros,120);
 assert.equal(f.server.saved().rows[0].settlement.outcome,'VALIDATED');assert.equal(f.server.saved().rows[0].resultCommitted,true);
 const sent=f.calls.filter(c=>c.path==='/api/results');assert.equal(sent.length,1);assert.equal(sent[0].data.result.outcome,'COMMITTED');assert.equal(sent[0].data.result.children[0].receiptId,usage[0].operationReceiptId);
 assert.doesNotMatch(JSON.stringify(sent),/garden|observation|payload|usage/);assert.doesNotMatch(JSON.stringify({jobs,usage}),/garden|observation|principalToken|entitlementToken/);
 await f.service.refreshHistoricalCandidates('SYNTHETIC garden');assert.equal(f.physical(),1);assert.equal(f.calls.filter(c=>c.path==='/api/reservations').length,1);
});

test('post-settlement revocation suppresses bodies and result report without erasing spend or resending',async t=>{
 const f=await historicalServiceFixture(t,{afterResponse:({revoke})=>revoke()});
 await assert.rejects(f.service.refreshHistoricalCandidates('SYNTHETIC garden'));
 const usage=await rows(f.s,'organizerUsage');assert.equal(usage[0].financialSettlement.settledSpendMicros,120);assert.equal(usage[0].state,'EXPIRED_UNCOMMITTED');
 assert.equal((await rows(f.s,'organizerWorkItems')).length,0);assert.equal(f.server.saved().rows[0].settlement.outcome,'VALIDATED');assert.equal(f.server.saved().rows[0].resultCommitted,undefined);
 assert.equal(f.calls.filter(c=>c.path==='/api/results').length,0);assert.equal(f.physical(),1);
 await assert.rejects(f.service.refreshHistoricalCandidates('SYNTHETIC garden'));assert.equal(f.physical(),1);assert.deepEqual(await f.service.adoptHistoricalCandidates(null),await f.service.query());
});

test('unknown reserve ACK and local-only cancellation recover only through original authenticated status and cancel',async t=>{
 const f=await historicalServiceFixture(t,{loseReservation:true});
 await assert.rejects(f.service.refreshHistoricalCandidates('SYNTHETIC garden'),{code:'OUTCOME_UNKNOWN'});assert.equal(f.physical(),0);assert.equal(f.server.saved().rows[0].state,'RESERVED');
 const [original]=await rows(f.s,'organizerJobs');await f.session.foundation.cancel(original.id);assert.equal(f.server.saved().rows[0].state,'RESERVED','local-only cancellation does not release remote money');
 const before=f.calls.length,cold=await f.restart();await assert.rejects(cold.service.refreshHistoricalCandidates('SYNTHETIC garden'),{code:'CANCELLED'});
 assert.deepEqual(f.calls.slice(before).map(c=>[c.path,c.data.action]),[['/api/operation-status','query'],['/api/reservations','cancel'],['/api/results','finalize']]);assert.equal(f.server.saved().rows[0].state,'CANCELLED_BEFORE_DISPATCH');
 const [usage]=await rows(cold.s,'organizerUsage');assert.equal(usage.childId,original.childIds[0]);assert.equal(usage.financialCancellation,true);assert.equal(usage.attemptCount,0);assert.equal(f.physical(),0);
 assert.deepEqual(await cold.service.adoptHistoricalCandidates(null),await cold.service.query());
});

test('lost provider ACK stays UNKNOWN until explicit cold query recovers exact settlement without replay',async t=>{
 const f=await historicalServiceFixture(t,{loseProvider:true});await assert.rejects(f.service.refreshHistoricalCandidates('SYNTHETIC garden'),{code:'OUTCOME_UNKNOWN'});
 assert.equal(f.server.saved().rows[0].state,'SETTLED');const usage=await rows(f.s,'organizerUsage');assert.equal(usage[0].state,'OUTCOME_UNKNOWN');assert.equal(usage[0].spendState,'RESERVATION_RETAINED');
 const cold=await f.restart(),before=f.calls.length;await assert.rejects(cold.service.refreshHistoricalCandidates('SYNTHETIC garden'),{code:'CANCELLED'});await assert.rejects(cold.service.refreshHistoricalCandidates('SYNTHETIC garden'),{code:'CANCELLED'});
 assert.equal(f.physical(),1);assert.deepEqual(f.calls.slice(before).map(c=>c.path),['/api/operation-status','/api/results']);assert.equal(f.calls.find(c=>c.path==='/api/results').data.result.outcome,'FAILED');const [recovered]=await rows(cold.s,'organizerUsage');assert.equal(recovered.financialSettlement.settledSpendMicros,120);assert.equal(recovered.state,'EXPIRED_UNCOMMITTED');assert.equal(recovered.attemptCount,1);
});

test('lost result ACK replays only the original committed metadata on explicit refresh, even after restart',async t=>{
 const f=await historicalServiceFixture(t,{loseResult:true});await f.service.refreshHistoricalCandidates('SYNTHETIC garden');
 assert.equal(f.server.saved().rows[0].resultCommitted,true);assert.equal((await rows(f.s,'organizerJobs'))[0].resultReport.state,'PENDING');
 const cold=await f.restart();await assert.rejects(cold.service.refreshHistoricalCandidates('SYNTHETIC garden'),{code:'UNAVAILABLE'});
 const reports=f.calls.filter(c=>c.path==='/api/results');assert.equal(reports.length,2);assert.deepEqual(reports[1].data,reports[0].data);assert.equal(f.physical(),1);assert.equal(f.calls.filter(c=>c.path==='/api/reservations').length,1);
});

test('only a real domain commit permits reporting; transaction rollback retries CAS without another provider',async t=>{
 const f=await historicalServiceFixture(t),original=f.session.foundation.write.bind(f.session.foundation);let once=true;
 f.session.foundation.write=fn=>original(async tx=>{const put=tx.put.bind(tx);tx.put=(table,row)=>{if(once&&table==='organizerJobs'&&row.domainResultReceipt?.outcome==='COMMITTED'){once=false;throw Error('SYNTHETIC domain rollback');}return put(table,row);};return fn(tx);});
 await assert.rejects(f.service.refreshHistoricalCandidates('SYNTHETIC garden'),{code:'STORAGE_FAILED'});assert.equal(f.calls.filter(c=>c.path==='/api/results').length,0);assert.equal((await rows(f.s,'organizerWorkItems')).length,0);
 f.session.foundation.write=original;const handle=await f.service.refreshHistoricalCandidates('SYNTHETIC garden');assert.equal((await f.service.adoptHistoricalCandidates(handle)).candidateSource,'ai');
 assert.equal(f.calls.filter(c=>c.path==='/api/results').length,1);assert.equal(f.physical(),1);
});

test('schema-valid but unknown candidate IDs fail the original domain validator with zero effective result',async t=>{
 const f=await historicalServiceFixture(t,{badIds:true});await assert.rejects(f.service.refreshHistoricalCandidates('SYNTHETIC garden'),{code:'INVALID_RESPONSE'});
 assert.equal(f.physical(),1);assert.equal(f.server.saved().rows[0].settlement.usdMicros,120);assert.equal(f.server.saved().rows[0].resultCommitted,undefined);assert.equal(f.calls.filter(c=>c.path==='/api/results').length,0);assert.equal((await rows(f.s,'organizerWorkItems')).length,0);
 await assert.rejects(f.service.refreshHistoricalCandidates('SYNTHETIC garden'));assert.equal(f.physical(),1);
});

test('unconfigured or incomplete module sets never admit a local Pro flag or arbitrary signed-proof strings',async t=>{
 const f=await historicalServiceFixture(t),before=f.calls.length;
 for(const key of ['readProfile','currentProfile','tokenize','isCurrentTokenizer','readProofs','resolveIntent','resolveAuthority']){
  const configuration={...f.configuration};delete configuration[key];const service=new PromptReuseService(f.s,{historyCandidates:createConfiguredHistoricalCandidateSession(f.s,configuration)});
  assert.deepEqual(await service.historicalCandidateStatus(),{available:false});await assert.rejects(service.refreshHistoricalCandidates('SYNTHETIC garden'),{code:'UNAVAILABLE'});
 }
 assert.equal(f.calls.length,before);assert.equal((await rows(f.s,'organizerJobs')).length,0);
 const service=new PromptReuseService(f.s,{historyCandidates:createConfiguredHistoricalCandidateSession(f.s,{...f.configuration,readProofs:async()=>({principalToken:'forged-local-Pro',entitlementToken:'forged-local-Pro'})})});
 await assert.rejects(service.refreshHistoricalCandidates('SYNTHETIC garden'));assert.equal(f.physical(),0);assert.equal(f.calls.filter(c=>c.path==='/api/reservations').length,0);assert.equal(f.server.saved(),null);
});

test('source closure before first physical dispatch uses only the original proven server cancellation',async t=>{
 const f=await historicalServiceFixture(t);let open=true;
 const reserve=f.session.foundation.reserveServer.bind(f.session.foundation);f.session.foundation.reserveServer=async(...args)=>{const out=await reserve(...args);open=false;return out;};
 const source={identity:'original-source-document',assertCurrent:async()=>{if(!open)throw Object.assign(Error('FORBIDDEN'),{code:'FORBIDDEN'});}};
 await assert.rejects(f.service.refreshHistoricalCandidates('SYNTHETIC garden',source),{code:'FORBIDDEN'});
 assert.equal(f.physical(),0);assert.equal(f.server.saved().rows[0].state,'CANCELLED_BEFORE_DISPATCH');const [usage]=await rows(f.s,'organizerUsage');assert.equal(usage.financialCancellation,true);assert.equal(usage.spendState,'RELEASED_SERVICE_BEFORE_DISPATCH');
 assert.equal(f.calls.filter(c=>c.path==='/api/reservations'&&c.data.action==='cancel').length,1);
 open=true;f.session.foundation.reserveServer=reserve;const handle=await f.service.refreshHistoricalCandidates('SYNTHETIC',source);assert.equal((await f.service.adoptHistoricalCandidates(handle)).candidateSource,'ai');assert.equal(f.physical(),1);
});

test('closing the original source after settlement suppresses private candidates while retaining the true spend',async t=>{
 let open=true;const f=await historicalServiceFixture(t,{afterResponse:()=>{open=false;}}),source={identity:'original-live-document',assertCurrent:async()=>{if(!open)throw Object.assign(Error('FORBIDDEN'),{code:'FORBIDDEN'});}};
 await assert.rejects(f.service.refreshHistoricalCandidates('SYNTHETIC garden',source),{code:'FORBIDDEN'});const [usage]=await rows(f.s,'organizerUsage');assert.equal(usage.state,'EXPIRED_UNCOMMITTED');assert.equal(usage.financialSettlement.settledSpendMicros,120);assert.equal((await rows(f.s,'organizerWorkItems')).length,0);assert.equal(f.calls.filter(c=>c.path==='/api/results').length,0);assert.equal(f.physical(),1);
});

test('original DEFER domain acknowledgement reports zero effective results and preserves local candidates',async t=>{
 const f=await historicalServiceFixture(t,{defer:true}),local=await f.service.query(),handle=await f.service.refreshHistoricalCandidates('SYNTHETIC garden');
 assert.deepEqual(await f.service.adoptHistoricalCandidates(handle),local);const [job]=await rows(f.s,'organizerJobs');assert.equal(job.state,'COMMITTED');assert.equal(job.resultOutcome,'DEFER');assert.equal(job.domainResultReceipt.outcome,'FAILED');
 assert.notEqual(f.server.saved().rows[0].resultCommitted,true);assert.equal(f.calls.find(c=>c.path==='/api/results').data.result.outcome,'FAILED');assert.equal(f.physical(),1);
});

test('permission withdrawal while physical work is pending releases the caller, preserves UNKNOWN and drops late private results',async t=>{
 let entered,release,returned;const started=new Promise(r=>entered=r),hold=new Promise(r=>release=r),finished=new Promise(r=>returned=r);
 const f=await historicalServiceFixture(t,{holdProvider:async()=>{entered();await hold;},afterResponse:()=>returned()});
 const pending=f.service.refreshHistoricalCandidates('SYNTHETIC garden'),settled=pending.catch(e=>e);
 try{
  await started;f.revoke();assert.ok(await settled instanceof Error);const [usage]=await rows(f.s,'organizerUsage');assert.equal(usage.state,'OUTCOME_UNKNOWN');assert.equal(usage.attemptCount,1);assert.equal(usage.spendState,'RESERVATION_RETAINED');
  const before=JSON.stringify(await rows(f.s,'organizerUsage'));release();await finished;await new Promise(r=>setImmediate(r));assert.equal(JSON.stringify(await rows(f.s,'organizerUsage')),before);assert.equal((await rows(f.s,'organizerWorkItems')).length,0);assert.equal(f.calls.filter(c=>c.path==='/api/results').length,0);
  f.restore();const cold=await f.restart(),calls=f.calls.length;await assert.rejects(cold.service.refreshHistoricalCandidates('SYNTHETIC garden'),{code:'CANCELLED'});assert.deepEqual(f.calls.slice(calls).map(c=>c.path),['/api/operation-status','/api/results']);assert.equal((await rows(cold.s,'organizerUsage'))[0].financialSettlement.settledSpendMicros,120);assert.equal(f.physical(),1);assert.deepEqual(await cold.service.adoptHistoricalCandidates(null),await cold.service.query());
 }finally{release();await settled;}
});

for(const boundary of ['dispatch-commit','last-read','last-source-await'])test(`original Source/send guard blocks ${boundary} changes without a provider send`,async t=>{
 const f=await historicalServiceFixture(t);let open=true,dispatched=false,reads=0,sourceChecks=0,entered,release;
 const waiting=new Promise(r=>entered=r),hold=new Promise(r=>release=r),write=f.session.foundation.write.bind(f.session.foundation),read=f.session.foundation.read.bind(f.session.foundation);
 f.session.foundation.write=async fn=>{let dispatch=false;const out=await write(async tx=>{const put=tx.put.bind(tx);tx.put=(table,row)=>{if(table==='organizerJobs'&&row.state==='DISPATCHED')dispatch=true;return put(table,row);};return fn(tx);});if(dispatch){dispatched=true;if(boundary==='dispatch-commit')open=false;}return out;};
 f.session.foundation.read=async fn=>{const out=await read(fn);if(dispatched&&++reads===2&&boundary==='last-read'){entered();await hold;}return out;};
 const source={identity:'original-source-send-fence',assertCurrent:async()=>{
  if(!open)throw Object.assign(Error('FORBIDDEN'),{code:'FORBIDDEN'});
  // The final Source assertion itself yields. A current original permission
  // notification must be rechecked synchronously after that await too.
  if(dispatched&&++sourceChecks===3&&boundary==='last-source-await'){entered();await hold;}
 }};
 const pending=f.service.refreshHistoricalCandidates('SYNTHETIC garden',source),settled=pending.catch(error=>error);
 try{
  if(boundary!=='dispatch-commit'){await waiting;assert.equal(f.physical(),0);if(boundary==='last-read')open=false;else f.revoke();release();}
  assert.ok(await settled instanceof Error);assert.equal(dispatched,true);assert.equal(f.physical(),0);assert.equal(f.calls.filter(c=>c.path==='/api/provider').length,0);assert.equal(f.calls.filter(c=>c.path==='/api/results').length,0);
  const [usage]=await rows(f.s,'organizerUsage');assert.equal(usage.state,'OUTCOME_UNKNOWN');assert.equal(usage.spendState,'RESERVATION_RETAINED');assert.equal(usage.attemptCount,1);assert.equal(f.server.saved().rows[0].state,'RESERVED');
  f.restore();open=true;const cold=await f.restart(),before=f.calls.length;
  await assert.rejects(cold.service.refreshHistoricalCandidates('SYNTHETIC garden'),{code:'CANCELLED'});assert.deepEqual(f.calls.slice(before).map(c=>c.path),['/api/operation-status','/api/reservations','/api/results']);const [recovered]=await rows(cold.s,'organizerUsage');assert.equal(recovered.attemptCount,1);assert.equal(recovered.financialCancellation,true);assert.equal(f.physical(),0);assert.deepEqual(await cold.service.adoptHistoricalCandidates(null),await cold.service.query());
 }finally{release();await settled;}
});


test('strict decoder accepts actual signed status API projections without substituting financial shorthand',async t=>{
 const f=providerFixture(),handler=createOperationStatusHandler({service:createPostgresOperationStatusService({pool:f.reservationPool,...f.config})}),transport=createClientOperationStatusTransport({endpoint:'https://service.invalid/api/operation-status',fetch:handler});
 const query=async state=>{const result=await transport.query(f.input.bundle);assert.equal(result.state,state);assert.ok(observedClientOperationStatus(result,transport));return result;};
 await query('NOT_FOUND');await f.reserve();assert.deepEqual(structuredClone((await query('RESERVED')).reservation),f.saved().rows[0]);await f.service.cancel(f.input.bundle);await query('CANCELLED_BEFORE_DISPATCH');
 const h=await historicalServiceFixture(t);await h.service.refreshHistoricalCandidates('SYNTHETIC garden');const request=h.server.saved().rows[0].request,bundle={request,...await h.configuration.readProofs(request)},client=createClientOperationStatusTransport({endpoint:'https://service.invalid/api/operation-status',fetch:h.configuration.fetch});
 const known=await client.query(bundle);assert.equal(known.state,'SETTLED');assert.deepEqual(structuredClone(known.financialSettlement),h.server.saved().rows[0].settlement);assert.deepEqual(structuredClone(known.resultResolution),h.server.saved().rows[0].resultResolution);assert.equal(known.effectiveResults,1);assert.ok(observedClientOperationStatus(known,client));assert.equal(h.physical(),1);
});


test('real PromptSurface refresh/adopt retains its original readonly Source consent checks before service send',async t=>{
 const f=await historicalServiceFixture(t),url='https://chatgpt.com/c/synthetic',nonce=crypto.randomUUID(),documentId='original-service-source';
 const api={runtime:{id:'ext',getURL:p=>'chrome-extension://ext/'+p,getContexts:async()=>[{documentId,tabId:7,windowId:4,frameId:9,documentUrl:'chrome-extension://ext/ui/prompt-surface.html#'+nonce}]},windows:{get:async()=>({id:4,focused:true})},tabs:{get:async()=>({id:7,url,windowId:4,active:true}),sendMessage:async()=>({open:true,nonce,url})}};
 const gateway=new PromptSurfaceCommands(new PromptReuseCommands(f.service,api),api),sender={id:'ext',tab:{id:7},frameId:9,url:api.runtime.getURL('ui/prompt-surface.html')+'#'+nonce,documentId,documentLifecycle:'active'},rpc=command=>gateway.handle({type:'PAIA_PROMPT_SURFACE_RPC',nonce,command},sender);
 assert.deepEqual(await rpc({type:'history_candidates_refresh',query:'SYNTHETIC garden'}),{ready:true});assert.equal((await rpc({type:'history_candidates_adopt'})).candidateSource,'ai');assert.equal(f.physical(),1);assert.equal(f.calls.filter(c=>c.path==='/api/results').length,1);
});

for(const changes of [{excluded:true},{libraryText:'SYNTHETIC revised human garden'}])test(`committed original Input ${Object.keys(changes)[0]} during last Source await suppresses service send`,async t=>{
 const f=await historicalServiceFixture(t);let dispatched=false,checks=0,entered,release;
 const waiting=new Promise(r=>entered=r),hold=new Promise(r=>release=r),write=f.session.foundation.write.bind(f.session.foundation);
 f.session.foundation.write=async fn=>{let marker=false;const out=await write(async tx=>{const put=tx.put.bind(tx);tx.put=(table,row)=>{if(table==='organizerJobs'&&row.state==='DISPATCHED')marker=true;return put(table,row);};return fn(tx);});if(marker)dispatched=true;return out;};
 const source={identity:'original-working-send-fence',assertCurrent:async()=>{if(dispatched&&++checks===3){entered();await hold;}}},settled=f.service.refreshHistoricalCandidates('SYNTHETIC garden',source).catch(error=>error);
 try{
  await waiting;const [before]=await rows(f.s,'organizerJobs');await inputEdit(f.s,before.items[0].descriptor.entityId,changes);const [changed]=await rows(f.s,'organizerJobs');assert.equal(changed.cancelEpoch,1);assert.equal(changed.state,'OUTCOME_UNKNOWN');assert.equal(f.physical(),0);
  release();assert.ok(await settled instanceof Error);assert.equal(f.physical(),0);assert.equal(f.calls.filter(c=>c.path==='/api/provider').length,0);assert.equal(f.calls.filter(c=>c.path==='/api/results').length,0);const [usage]=await rows(f.s,'organizerUsage');assert.equal(usage.state,'OUTCOME_UNKNOWN');assert.equal(usage.spendState,'RESERVATION_RETAINED');assert.equal(f.server.saved().rows[0].state,'RESERVED');
  const cold=await f.restart(),calls=f.calls.length,handle=await cold.service.refreshHistoricalCandidates('SYNTHETIC garden');assert.equal((await cold.service.adoptHistoricalCandidates(handle)).candidateSource,'ai');
  const sent=f.calls.slice(calls).filter(c=>c.path==='/api/provider');assert.equal(sent.length,1);assert.notEqual(sent[0].data.bundle.request.operationId,usage.childId);assert.equal(f.server.saved().rows.find(r=>r.request.operationId===usage.childId).state,'CANCELLED_BEFORE_DISPATCH');
  const original=(await rows(cold.s,'organizerUsage')).find(r=>r.childId===usage.childId);assert.equal(original.attemptCount,1);assert.equal(original.financialCancellation,true);assert.equal(f.physical(),1);
  const current=f.payload().candidates.find(c=>c.id===before.items[0].descriptor.entityId);assert.equal(current,undefined,'excluded or human-edited Input is not reauthorized by cancellation recovery');
 }finally{release();await settled;}
});
