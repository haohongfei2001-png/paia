import test from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import {providerFixture,completion} from './provider-fixtures.mjs';
import {createPostgresProviderSettlementService,providerSettlementId} from '../provider-settlement.mjs';
import {createPostgresProviderEvidencePublisher} from '../postgres-provider-evidence.mjs';
import {prepareProviderRequest,snapshotProviderInput} from '../provider-request.mjs';
import {readProviderResponse,observedProviderUsage} from '../provider-response.mjs';
const settlement=f=>createPostgresProviderSettlementService({...f.config,pool:f.reservationPool});
const settle=f=>settlement(f).settle(f.input.bundle.request,providerSettlementId(f.input.bundle.request));

function wire(t,{onResponse,body=completion()}={}){
 let sends=0;t.mock.method(https,'request',(options,callback)=>{
  sends++;const request=new EventEmitter();request.destroy=error=>{queueMicrotask(()=>{request.emit('error',error);request.emit('close');});return request;};
  request.end=()=>queueMicrotask(()=>{onResponse?.();const incoming=Readable.from([Buffer.from(JSON.stringify(body))]);incoming.statusCode=200;incoming.headers={'content-type':'application/json'};callback(incoming);incoming.once('close',()=>request.emit('close'));});
  options.signal.addEventListener('abort',()=>request.destroy(Error('SYNTHETIC abort')),{once:true});return request;
 });return ()=>sends;
}

test('known provider usage settles the original financial owner once without a result commit',async t=>{
 const f=providerFixture();await f.reserve();const sends=wire(t);
 const result=await f.runner().run(f.input);
 assert.equal(result.decision,'response_received');assert.equal(sends(),1);
 const row=f.saved().rows[0];assert.equal(row.state,'SETTLED');assert.equal(row.settlement.usdMicros,120);
 assert.equal(row.resultCommitted,undefined);assert.equal(row.settlement.committedChildren.length,0);
 assert.equal((await f.runner().run(f.input)).decision,'deny');assert.equal(sends(),1);
});

test('revocation after physical response suppresses derivative but cannot erase known expenditure',async t=>{
 const f=providerFixture();await f.reserve();const sends=wire(t,{onResponse:()=>{f.grants.get(f.input.bundle.request.operationId).authorized=false;}});
 const result=await f.runner().run(f.input);assert.notEqual(result.decision,'response_received');assert.equal(result.value,undefined);assert.equal(sends(),1);
 const row=f.saved().rows[0];assert.equal(row.state,'SETTLED');assert.equal(row.settlement.usdMicros,120);
 assert.equal(row.resultCommitted,undefined);assert.equal((await f.runner().run(f.input)).decision,'deny');assert.equal(sends(),1);
});

test('original immutable VALIDATED settlement currently blocks later legitimate single-child result closure',async t=>{
 const {BudgetWindowReservation}=await import('../../../extension/core/ai-usage/budget-window-reservation.js');
 const f=providerFixture();await f.reserve();wire(t);await f.runner().run(f.input);
 let state=f.saved();const r=f.input.bundle.request,row=state.rows[0];
 const owner=new BudgetWindowReservation({service:{clock:()=>f.now,transact:async fn=>{const copy=structuredClone(state);const value=await fn({get:async()=>copy,put:async(_key,next)=>{state=next;}});return value;},
  verifyRequest:request=>({authorized:true,verifiedServiceFacts:true,request,tier:'free',timeZone:row.window.timeZone}),verifySettlement:(request,evidence)=>({verifiedSettlementFacts:true,request,evidence})}});
 const committed={...row.settlement,outcome:'COMMITTED',committedChildren:[{operationId:r.operationId,receiptId:row.settlement.receiptId}]};
 // This assertion records an UNRESOLVED original-owner boundary, not a fix.
 await assert.rejects(owner.settle(r,committed),error=>error.code==='SETTLEMENT_CONFLICT');
 assert.equal(state.rows[0].resultCommitted,undefined);assert.equal(state.rows[0].settlement.outcome,'VALIDATED');
});

test('independent competing reconciliation workers settle the same immutable event idempotently',async t=>{
 let failOnce=true;const f=providerFixture({hook:({role,sql,args})=>{if(failOnce&&role==='ledger'&&sql.startsWith('WITH publication')&&JSON.parse(args[0]).rows[0].state==='SETTLED'){failOnce=false;throw Error('SYNTHETIC settlement unavailable');}}});
 await f.reserve();const sends=wire(t);const result=await f.runner().run(f.input);
 assert.equal(result.reason,'SETTLEMENT_FAILED');assert.equal(result.value,undefined);assert.equal(f.saved().rows[0].state,'DISPATCHED');assert.equal(f.events().size,2);
 const before=f.saved().rows[0].request;
 const outcomes=await Promise.all(Array.from({length:4},()=>settle(f)));
 assert.ok(outcomes.every(value=>value.state==='SETTLED'&&value.settledSpendMicros===120&&value.effectiveResults===0));
 const row=f.saved().rows[0];assert.equal(row.settlement.usdMicros,120);assert.equal(row.reservationMicros,700);assert.deepEqual(row.request,before);assert.equal(f.saved().rows.length,1);assert.equal(f.events().size,2);assert.equal(sends(),1);
 assert.equal((await f.runner().run(f.input)).decision,'deny');assert.equal(sends(),1);
});

test('missing malformed and overbound provider usage never publishes financial release evidence',async t=>{
 const c=completion();
 for(const usage of [null,{...c.usage,total_tokens:119},{...c.usage,prompt_tokens:101,total_tokens:121},{...c.usage,completion_tokens:601,total_tokens:701},{...c.usage,extra:0}]){
  const f=providerFixture();await f.reserve();const sends=wire(t,{body:completion({usage})});const result=await f.runner().run(f.input);
  assert.equal(result.decision,'outcome_unknown');assert.equal(result.value,undefined);assert.equal(f.saved().rows[0].settlement,undefined);assert.equal(f.saved().rows[0].reservationMicros,700);
  assert.ok([...f.events().values()].every(event=>event.event!=='SETTLEMENT'));assert.equal(sends(),1);assert.equal((await f.service.cancel(f.input.bundle)).decision,'deny');assert.equal((await f.runner().run(f.input)).decision,'deny');assert.equal(sends(),1);t.mock.restoreAll();
 }
});

test('known billed usage survives invalid derivative JSON and schema without counting a successful result',async t=>{
 for(const content of ['SYNTHETIC invalid JSON','{"action":"INVALID"}']){
  const f=providerFixture();await f.reserve();const c=completion();c.choices[0].message.content=content;const sends=wire(t,{body:c});
  const result=await f.runner().run(f.input),row=f.saved().rows[0];
  assert.equal(result.decision,'outcome_unknown');assert.equal(result.value,undefined);assert.equal(row.state,'SETTLED');assert.equal(row.settlement.usdMicros,120);assert.equal(row.settlement.outcome,'FAILED');assert.equal(row.resultCommitted,undefined);
  assert.equal(result.financialSettlement.effectiveResults,0);assert.equal(result.resultFinalization,'FAILED');assert.equal(result.reservation,'SETTLED');assert.equal(sends(),1);assert.ok(!JSON.stringify([...f.events()]).includes(content));t.mock.restoreAll();
 }
});

test('current content/entitlement/route revocation and expiry cannot reprice or discard already consumed spend',async t=>{
 const f=providerFixture();await f.reserve();const original=f.saved().rows[0].pricing;
 const sends=wire(t,{onResponse:()=>{
  f.grants.get(f.input.bundle.request.operationId).authorized=false;f.control.enabled=false;
  f.principals.get([f.input.bundle.request.principalId,f.input.bundle.request.libraryId].join('/')).security.principalActive=false;
  f.routeRow.facts.route.model='SYNTHETIC-NEW';f.routeRow.facts.book.rates.completion=9000000;f.setClock(f.now+61000);
 }});
 const result=await f.runner().run(f.input),row=f.saved().rows[0];assert.equal(result.value,undefined);assert.equal(result.decision,'outcome_unknown');assert.equal(row.state,'SETTLED');assert.equal(row.settlement.usdMicros,120);assert.deepEqual(row.pricing,original);assert.equal(result.financialSettlement.effectiveResults,0);assert.equal(sends(),1);
 assert.equal((await settle(f)).state,'SETTLED');assert.equal(sends(),1);
});

test('failed usage publication keeps the original hold and never fabricates a successful response',async t=>{
 const f=providerFixture({hook:({sql,args})=>{if(sql.includes('INSERT INTO paia_ai_private.operation_evidence')&&args[3]==='SETTLEMENT')throw Error('SYNTHETIC publication failure');}});
 await f.reserve();const sends=wire(t),result=await f.runner().run(f.input);assert.equal(result.reason,'USAGE_PUBLICATION_FAILED');assert.equal(result.value,undefined);assert.equal(result.reservation,'HELD_PENDING_INDEPENDENT_FINANCIAL_PROOF');
 assert.equal(f.events().size,1);assert.equal(f.saved().rows[0].state,'DISPATCHED');assert.equal(f.saved().rows[0].reservationMicros,700);assert.equal((await f.service.cancel(f.input.bundle)).decision,'deny');assert.equal((await f.runner().run(f.input)).decision,'deny');assert.equal(sends(),1);
});

test('lost usage publication ACK retains the hold; independent event reconciliation never resends',async t=>{
 let commits=0;const f=providerFixture({after:({role,sql})=>{if(role==='publisher'&&sql==='COMMIT'&&++commits===3)throw Error('SYNTHETIC lost usage ACK');}});
 await f.reserve();const sends=wire(t),result=await f.runner().run(f.input);assert.equal(result.reason,'USAGE_PUBLICATION_COMMIT_UNKNOWN');assert.equal(result.value,undefined);assert.equal(f.saved().rows[0].state,'DISPATCHED');assert.equal(f.saved().rows[0].reservationMicros,700);assert.equal(f.events().size,2);
 assert.equal(f.released.some(r=>r.role==='publisher'&&r.discard),true);f.grants.get(f.input.bundle.request.operationId).authorized=false;
 assert.equal((await settle(f)).settledSpendMicros,120);assert.equal((await f.runner().run(f.input)).decision,'deny');assert.equal(sends(),1);
});

test('unknown original settlement COMMIT ACK is never called known success or a proved refund',async t=>{
 for(const committed of [false,true]){
  let commits=0;
  const failure=({role,sql})=>{if(role==='ledger'&&sql==='COMMIT'&&++commits===3)throw Error('SYNTHETIC unknown settlement ACK');};
  const f=providerFixture(committed?{after:failure}:{hook:failure});await f.reserve();const sends=wire(t),result=await f.runner().run(f.input);
  assert.equal(result.reason,'SETTLEMENT_COMMIT_UNKNOWN');assert.equal(result.value,undefined);assert.equal(result.reservation,'ACKNOWLEDGEMENT_UNKNOWN');assert.equal(result.financialSettlement,undefined);
  assert.equal(f.saved().rows[0].state,committed?'SETTLED':'DISPATCHED');assert.equal(f.saved().rows[0].reservationMicros,700);assert.equal(f.released.some(r=>r.role==='ledger'&&r.discard),true);
  assert.equal((await f.runner().run(f.input)).decision,'deny');assert.equal((await settle(f)).settledSpendMicros,120);assert.equal(f.saved().rows[0].settlement.usdMicros,120);assert.equal(sends(),1);t.mock.restoreAll();
 }
});

test('a client clone or another request/profile material cannot become trusted usage evidence',async()=>{
 const f=providerFixture();await f.reserve();const input=snapshotProviderInput(f.input),publisher=createPostgresProviderEvidencePublisher({...f.config,pool:f.evidencePool});
 const claim=await publisher.claim(input.bundle,input.declaration,context=>prepareProviderRequest({input,manifest:f.manifest,tokenize:f.config.tokenize,...context}));assert.equal(claim.decision,'claimed');
 assert.equal((await f.service.record(input.bundle,claim.ticket.eventId)).state,'DISPATCHED');
 let sends=0;const makeResponse=()=>new Response(JSON.stringify(completion()),{headers:{'content-type':'application/json'}});
 const send=await publisher.sendOnce(claim.ticket,{isCurrent:()=>true,start:()=>{sends++;return makeResponse();}});assert.equal(send.decision,'started');
 const result=await readProviderResponse(await send.pending,claim.material);
 assert.equal((await publisher.publishUsage(claim.ticket,structuredClone(result))).reason,'PROVIDER_USAGE_UNQUALIFIED');
 const rebound=await readProviderResponse(makeResponse(),{...claim.material,identityDigest:'SYNTHETIC-OTHER'});
 assert.equal((await publisher.publishUsage(claim.ticket,rebound)).reason,'PROVIDER_USAGE_UNQUALIFIED');
 result.usage.neutral.inputTokens=0;const stolen=observedProviderUsage(result,claim.material);stolen.usage.inputTokens=0;
 const event=await publisher.publishUsage(claim.ticket,result);assert.equal(event.decision,'published');assert.equal(f.events().get(event.eventId).evidence.usage.inputTokens,100);
 assert.equal((await settle(f)).settledSpendMicros,120);assert.equal((await publisher.publishUsage(claim.ticket,result)).decision,'deny');assert.equal((await publisher.unknown(claim.ticket)).decision,'deny');assert.equal(sends,1);
});

test('financial reconciliation rejects malformed rebound overbound or result-committing event facts',async t=>{
 for(const change of [
  event=>{event.operation_id='SYNTHETIC-other';},event=>{event.request_hash='f'.repeat(64);},event=>{event.evidence.receiptId='SYNTHETIC-other';},
  event=>{event.evidence.usage.totalTokens=119;},event=>{event.evidence.usage.inputTokens=101;event.evidence.usage.totalTokens=121;},event=>{event.evidence.usdMicros=119;},
  event=>{event.evidence.outcome='COMMITTED';},event=>{event.evidence.committedChildren=[{operationId:event.operation_id,receiptId:event.evidence.receiptId}];},event=>{event.evidence.nativeCurrency='CNY';},
 ]){
  let block=true,alter=false;
  const f=providerFixture({hook:({role,sql,args})=>{
   if(block&&role==='ledger'&&sql.startsWith('WITH publication')&&JSON.parse(args[0]).rows[0].state==='SETTLED')throw Error('SYNTHETIC pause');
   if(alter&&sql.startsWith('SELECT operation_id, request_hash')&&args[0]===providerSettlementId(f.input.bundle.request)){const event=f.events().get(args[0]);change(event);return {rows:[event]};}
  }});
  await f.reserve();const sends=wire(t);await f.runner().run(f.input);const before=f.saved();block=false;alter=true;
  assert.equal((await settle(f)).decision,'deny');assert.deepEqual(f.saved(),before);assert.equal(sends(),1);t.mock.restoreAll();
 }
});

test('accounting reader with event mutation privileges cannot settle the financial ledger',async t=>{
 let unsafe=false;const f=providerFixture({hook:({role,sql,args})=>{
  if(unsafe&&role==='ledger'&&sql.includes('SELECT c.relname'))return {rows:args[0].map(relname=>({relname,relrowsecurity:true,relforcerowsecurity:true,rolsuper:false,rolbypassrls:false,is_owner:false,can_mutate:true}))};
 }});
 await f.reserve();wire(t);await f.runner().run(f.input);unsafe=true;const before=f.saved();assert.equal((await settle(f)).reason,'AUTHORITY_UNSAFE_ROLE_OR_SCHEMA');assert.deepEqual(f.saved(),before);
});

test('unsupported actual currency conversion is refused before any provider evidence or physical send',async t=>{
 const f=providerFixture(),facts=f.routeRow.facts;facts.route.currency='CNY';facts.book.route.currency='CNY';f.manifest.route.currency='CNY';
 facts.fx={version:'SYNTHETIC-fx',verified:true,observedAt:f.now,expiresAt:f.now+60000,source:'SYNTHETIC',cnyMicrosPerUsd:7000000,reservationCnyMicrosPerUsd:6000000};
 assert.equal((await f.reserve()).decision,'reserved');const sends=wire(t),result=await f.runner().run(f.input);
 assert.equal(result.reason,'PROVIDER_BILLING_CURRENCY_UNQUALIFIED');assert.equal(f.events().size,0);assert.equal(sends(),0);assert.equal(f.saved().rows[0].state,'RESERVED');
});

test('original reserved profile/pricing rebound rejects observed usage rather than repricing it',async t=>{
 let commits=0;const f=providerFixture({after:({role,sql})=>{if(role==='publisher'&&sql==='COMMIT'&&++commits===2){const state=f.saved();state.rows[0].pricing.book.rates.completion=9000000;f.setSaved(state);}}});
 await f.reserve();const sends=wire(t);
 const result=await f.runner().run(f.input);assert.equal(result.reason,'USAGE_PUBLICATION_FAILED');assert.equal(result.value,undefined);assert.equal(f.events().size,1);assert.equal(f.saved().rows[0].state,'DISPATCHED');assert.equal(f.saved().rows[0].reservationMicros,700);assert.equal(sends(),1);
});

test('even an authentic prior event never settles a RESERVED or cancelled original row',async t=>{
 const f=providerFixture();await f.reserve();wire(t);await f.runner().run(f.input);
 for(const stateName of ['RESERVED','CANCELLED_BEFORE_DISPATCH']){
  const state=f.saved(),row=state.rows[0];row.state=stateName;
  for(const key of ['settlement','settledAt','dispatchedAt','dispatchedDayId','dispatchedTimeZone'])delete row[key];f.setSaved(state);
  const before=f.saved();assert.equal((await settle(f)).reason,'PROVIDER_ACCOUNTING_BINDING');assert.deepEqual(f.saved(),before);
 }
});

test('disposal after complete usage observation suppresses output while financial accounting completes',async t=>{
 let commits=0,enter,release;const entered=new Promise(r=>enter=r),gate=new Promise(r=>release=r);
 const f=providerFixture({after:async({role,sql})=>{if(role==='publisher'&&sql==='COMMIT'&&++commits===3){enter();await gate;}}});
 await f.reserve();const sends=wire(t),owner=f.runner(),pending=owner.run(f.input);await entered;
 owner.dispose();release();const result=await pending;
 assert.equal(result.decision,'outcome_unknown');assert.equal(result.value,undefined);assert.equal(result.reservation,'SETTLED');assert.equal(result.financialSettlement.settledSpendMicros,120);assert.equal(f.saved().rows[0].state,'SETTLED');assert.equal((await owner.run(f.input)).reason,'PROVIDER_STOPPED');assert.equal(sends(),1);
});
