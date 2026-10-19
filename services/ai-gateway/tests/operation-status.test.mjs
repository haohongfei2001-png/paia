import test from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import {providerFixture,completion} from './provider-fixtures.mjs';
import {createPostgresOperationStatusService} from '../operation-status-service.mjs';

function wire(t,body=completion()){
 let sends=0;t.mock.method(https,'request',(_options,callback)=>{
  sends++;const request=new EventEmitter();request.destroy=()=>request;
  request.end=()=>queueMicrotask(()=>{const incoming=Readable.from([Buffer.from(JSON.stringify(body))]);incoming.statusCode=200;incoming.headers={'content-type':'application/json'};callback(incoming);incoming.once('close',()=>request.emit('close'));});return request;
 });return ()=>sends;
}
const service=f=>createPostgresOperationStatusService({pool:f.reservationPool,...f.config});
const query=f=>service(f).query(f.input.bundle);
test('authenticated status recovers original immutable usage after lost settlement ACK and content revocation',async t=>{
 let block=true;const f=providerFixture({hook:({role,sql,args})=>{if(block&&role==='ledger'&&sql.startsWith('WITH publication')&&JSON.parse(args[0]).rows[0].state==='SETTLED')throw Error('SYNTHETIC settlement unavailable');}});
 await f.reserve();const sends=wire(t);assert.equal((await f.runner().run(f.input)).reason,'SETTLEMENT_FAILED');
 assert.equal(f.saved().rows[0].state,'DISPATCHED');assert.equal(f.events().size,2);block=false;
 f.grants.get(f.input.bundle.request.operationId).authorized=false;
 const answer=await query(f);assert.equal(answer.decision,'queried');assert.equal(answer.state,'SETTLED');assert.equal(answer.settledSpendMicros,120);assert.equal(sends(),1);
});

const flags=answer=>{for(const key of ['financialAuthority','dispatchAllowed','retryAllowed'])assert.equal(answer[key],false);};
async function pendingUsage(t,options={}){
 let blocked=true;
 const f=providerFixture({...options,hook:async context=>{
  if(blocked&&context.role==='ledger'&&context.sql.startsWith('WITH publication')&&JSON.parse(context.args[0]).rows[0].state==='SETTLED')throw Error('SYNTHETIC pause settlement');
  return options.hook?.(context);
 }});
 await f.reserve();const sends=wire(t);await f.runner().run(f.input);blocked=false;
 assert.equal(f.saved().rows[0].state,'DISPATCHED');return {f,sends};
}

test('no row is unknown and creates no reservation attempt child or window',async()=>{
 const f=providerFixture();const answer=await query(f);assert.equal(answer.state,'NOT_FOUND');assert.equal(answer.financialOutcome,'UNKNOWN');assert.equal(answer.providerEvidenceRecorded,null);
 assert.equal(answer.reservationMicros,undefined);assert.equal(answer.settledSpendMicros,undefined);assert.equal(f.saved(),null);assert.ok(f.calls.every(c=>!c.sql.startsWith('WITH publication')));flags(answer);
});

test('querying an undispatched reservation never changes its hold window or grants dispatch',async()=>{
 const f=providerFixture();await f.reserve();const before=f.saved();f.calls.length=0;f.setClock(f.now+1000);
 const answer=await query(f);assert.equal(answer.state,'RESERVED');assert.equal(answer.financialOutcome,'UNKNOWN');assert.equal(answer.heldSpendMicros,700);assert.equal(answer.settledSpendMicros,null);assert.equal(answer.providerEvidenceRecorded,false);
 assert.deepEqual(answer.window,before.rows[0].window);assert.deepEqual(f.saved(),before);assert.ok(f.calls.every(c=>!c.sql.startsWith('WITH publication')));flags(answer);
});

test('missing immutable usage keeps a dispatched operation unknown forever without provider replay',async t=>{
 const f=providerFixture();await f.reserve();const sends=wire(t,completion({usage:null}));await f.runner().run(f.input);const before=f.saved();f.calls.length=0;
 for(let i=0;i<3;i++){const answer=await query(f);assert.equal(answer.financialOutcome,'UNKNOWN');assert.equal(answer.heldSpendMicros,700);assert.equal(answer.financialSettlement,null);flags(answer);}
 assert.deepEqual(f.saved(),before);assert.equal(sends(),1);assert.ok(f.calls.every(c=>!c.sql.startsWith('WITH publication')));
});

test('a canonical immutable event cannot manufacture entry for a RESERVED or cancelled row',async t=>{
 const {f,sends}=await pendingUsage(t);
 for(const stateName of ['RESERVED','CANCELLED_BEFORE_DISPATCH']){
  const state=f.saved(),row=state.rows[0];row.state=stateName;for(const key of ['dispatchedAt','dispatchedDayId','dispatchedTimeZone'])delete row[key];f.setSaved(state);const before=f.saved();
  const answer=await query(f);assert.equal(answer.state??answer.reason,stateName==='RESERVED'?'RESERVED':'OPERATION_STATUS_BINDING');
  if(stateName==='RESERVED'){assert.equal(answer.heldSpendMicros,700);assert.equal(answer.financialOutcome,'UNKNOWN');assert.equal(answer.providerEvidenceRecorded,true);}
  assert.deepEqual(f.saved(),before);flags(answer);
 }assert.equal(sends(),1);
});

test('a real cancelled-before-dispatch row is returned unchanged without treating event absence as a refund',async()=>{
 const f=providerFixture();await f.reserve();await f.service.cancel(f.input.bundle);const before=f.saved();const answer=await query(f);
 assert.equal(answer.financialOutcome,'CANCELLED_BEFORE_DISPATCH');assert.equal(answer.heldSpendMicros,0);assert.equal(answer.financialSettlement,null);assert.deepEqual(f.saved(),before);flags(answer);
});

test('competing recovery queries settle original usage once and later queries are read-only',async t=>{
 const {f,sends}=await pendingUsage(t),original=f.saved().rows[0];f.calls.length=0;
 const answers=await Promise.all(Array.from({length:5},()=>query(f)));assert.ok(answers.every(a=>a.state==='SETTLED'&&a.settledSpendMicros===120&&a.effectiveResults===0));
 assert.ok(answers.every(a=>a.financialSettlement.outcome==='VALIDATED'&&a.resultResolution===null));
 assert.equal(f.calls.filter(c=>c.sql.startsWith('WITH publication')).length,1);assert.equal(f.saved().rows.length,1);assert.equal(f.events().size,2);assert.equal(sends(),1);
 assert.deepEqual(f.saved().rows[0].request,original.request);assert.deepEqual(f.saved().rows[0].window,original.window);assert.deepEqual(f.saved().rows[0].pricing,original.pricing);flags(answers[0]);
});

for(const persisted of [false,true])test(`lost recovery COMMIT acknowledgement (${persisted?'durable':'not durable'}) remains unknown until a new authenticated query`,async t=>{
 let armed=false,once=true;const failure=context=>{if(armed&&once&&context.role==='ledger'&&context.sql==='COMMIT'){once=false;throw Error('SYNTHETIC unknown ACK');}};
 const {f,sends}=await pendingUsage(t,persisted?{after:failure}:{hook:failure});armed=true;
 const answer=await query(f);assert.equal(answer.decision,'outcome_unknown');assert.equal(answer.reason,'COMMIT_OUTCOME_UNKNOWN');assert.equal(answer.settledSpendMicros,undefined);flags(answer);
 assert.equal(f.saved().rows[0].state,persisted?'SETTLED':'DISPATCHED');assert.equal(f.released.at(-1).discard,true);
 assert.equal((await query(f)).settledSpendMicros,120);assert.equal(f.saved().rows.length,1);assert.equal(sends(),1);
});

test('a lost read-only COMMIT ACK does not return supposedly current financial data',async t=>{
 let armed=false;const f=providerFixture({after:({role,sql})=>{if(armed&&role==='ledger'&&sql==='COMMIT')throw Error('SYNTHETIC read ACK unknown');}});
 await f.reserve();const before=f.saved();armed=true;const answer=await query(f);assert.equal(answer.decision,'outcome_unknown');assert.equal(answer.state,undefined);assert.deepEqual(f.saved(),before);
});

test('expired revoked content route and disabled spending preserve historical query while current identity remains mandatory',async t=>{
 const {f}=await pendingUsage(t);f.control.enabled=false;f.control.expires_at_ms='0';f.grants.get(f.input.bundle.request.operationId).authorized=false;f.grants.get(f.input.bundle.request.operationId).expires_at_ms='0';f.routeRow.expires_at_ms='0';f.routeRow.facts.book.rates.completion=9000000;
 assert.equal((await query(f)).settledSpendMicros,120);const before=f.saved();
 f.principals.get([f.input.bundle.request.principalId,f.input.bundle.request.libraryId].join('/')).security.principalActive=false;
 assert.equal((await query(f)).reason,'AUTHORIZATION');assert.deepEqual(f.saved(),before);
});

test('forged stale rebound cross-principal and cross-library signed requests cannot read or reconcile a row',async t=>{
 const {f}=await pendingUsage(t),before=f.saved(),r=f.input.bundle.request;
 for(const bundle of [{...f.input.bundle,principalToken:'x.y.z'},f.bundle(r,{entitlement:{generation:'wrong'}}),...['principalId','libraryId','scopeFingerprint','consentEpoch','routeVersion','inputTokens'].map(key=>{
  const changed={...r,[key]:typeof r[key]==='number'?r[key]+1:r[key]+'-OTHER'};f.principals.set([changed.principalId,changed.libraryId].join('/'),f.principal(changed));return f.bundle(changed);
 })]){assert.equal((await service(f).query(bundle)).decision,'deny');assert.deepEqual(f.saved(),before);}
});

test('final database-clock identity expiry and rollback reject read-only disclosure',async()=>{
 for(const mode of ['expired','rollback']){
  let armed=false,reads=0;const f=providerFixture({hook:({sql,setClock})=>{if(armed&&sql.startsWith('SELECT floor')&&++reads===2)setClock(mode==='expired'?f.now+60000:f.now-1);}});
  await f.reserve();const before=f.saved();armed=true;const answer=await query(f);assert.equal(answer.reason,mode==='expired'?'AUTHORIZATION':'CLOCK_ROLLBACK');assert.deepEqual(f.saved(),before);assert.equal(answer.state,undefined);
 }
});

test('identity expiry while recovery publishes rolls back original owner settlement',async t=>{
 let armed=false,reads=0;const {f}=await pendingUsage(t,{hook:({sql,setClock})=>{if(armed&&sql.startsWith('SELECT floor')&&++reads===4)setClock(f.now+60000);}});const before=f.saved();armed=true;
 const answer=await query(f);assert.equal(answer.reason,'AUTHORIZATION');assert.deepEqual(f.saved(),before);assert.equal(answer.state,undefined);
});

test('unsafe role authority mutation rights deny both query and recovery before ledger writes',async t=>{
 let armed=false;const {f}=await pendingUsage(t,{hook:({sql,args})=>{if(armed&&sql.includes('SELECT c.relname'))return {rows:args[0].map(relname=>({relname,relrowsecurity:true,relforcerowsecurity:true,rolsuper:false,rolbypassrls:false,is_owner:false,can_mutate:true}))};}});const before=f.saved();armed=true;
 assert.equal((await query(f)).reason,'AUTHORITY_UNSAFE_ROLE_OR_SCHEMA');assert.deepEqual(f.saved(),before);
});

test('wrong malformed monetary or COMMITTED immutable events cannot induce a query refund or result commit',async t=>{
 for(const mutate of [e=>e.request_hash='f'.repeat(64),e=>e.evidence.outcome='COMMITTED',e=>e.evidence.usdMicros=0,e=>e.evidence.usage.totalTokens=119,e=>e.evidence.committedChildren=[{operationId:e.operation_id,receiptId:e.evidence.receiptId}]]){
  let armed=false;const {f,sends}=await pendingUsage(t,{hook:({sql,args})=>{if(armed&&sql.startsWith('SELECT operation_id, request_hash')&&args[0].startsWith('provider-settlement:')){const event=f.events().get(args[0]);mutate(event);return {rows:[event]};}}});const before=f.saved();armed=true;
  assert.equal((await query(f)).decision,'deny');assert.deepEqual(f.saved(),before);assert.equal(sends(),1);t.mock.restoreAll();
 }
});

test('query result returns only original metadata and never credentials request body derivative or pricing source',async t=>{
 const {f}=await pendingUsage(t);const answer=await query(f),json=JSON.stringify(answer);assert.equal(answer.financialSettlement.outcome,'VALIDATED');assert.equal(answer.resultResolution,null);assert.equal(answer.effectiveResults,0);
 for(const forbidden of [f.input.payload.text,'SYNTHETIC instructions','SYNTHETIC tariff','{"action":"KEEP"}',f.input.bundle.principalToken,f.input.bundle.entitlementToken])assert.ok(!json.includes(forbidden));
 assert.ok(f.calls.every(c=>!JSON.stringify(c).includes(f.input.bundle.principalToken)));flags(answer);
});

test('original domain receipt is visible separately without rewriting known financial usage',async t=>{
 const {createPostgresResultService}=await import('../result-service.mjs');const {f}=await pendingUsage(t);await query(f);
 const r=f.input.bundle.request,settlement=f.saved().rows[0].settlement,result={receiptId:'SYNTHETIC-domain-result',jobId:r.jobId,outcome:'COMMITTED',children:[{operationId:r.operationId,receiptId:settlement.receiptId}]};
 assert.equal((await createPostgresResultService({pool:f.reservationPool,...f.config}).finalize(f.input.bundle,result)).decision,'finalized');const before=f.saved();
 const answer=await query(f);assert.deepEqual(answer.resultResolution,result);assert.equal(answer.effectiveResults,1);assert.deepEqual(answer.financialSettlement,settlement);assert.deepEqual(f.saved(),before);
});

test('original ledger control principal and event locks precede final DB clock and recovery publication',async t=>{
 const {f}=await pendingUsage(t);f.calls.length=0;await query(f);const sql=f.calls.map(c=>c.sql),at=s=>sql.findIndex(q=>q.includes(s));
 assert.ok(at('SELECT schema_version')<at('FROM paia_ai_private.service_control'));assert.ok(at('FROM paia_ai_private.service_control')<at('FROM paia_ai_private.principal_authority'));assert.ok(at('FROM paia_ai_private.principal_authority')<at('FROM paia_ai_private.operation_evidence'));
 assert.ok(sql.findLastIndex(q=>q.startsWith('SELECT floor'))<at('WITH publication'));assert.equal(sql.at(-1),'COMMIT');
});

test('reserved snapshot is the bounded exact original owner view and DB observation is not a lease',async()=>{
 const f=providerFixture();await f.reserve();const original=f.saved().rows[0];f.setClock(f.now+1000);const answer=await query(f);
 assert.deepEqual(answer.reservation,original);assert.equal(answer.observedAt,f.now+1000);assert.equal(answer.reservation.reservedAt,f.now);assert.deepEqual(answer.reservation.quote,original.quote);assert.deepEqual(answer.reservation.pricing,original.pricing);flags(answer);
 answer.reservation.pricing.book.rates.completion=0;answer.reservation.request.inputTokens=0;
 assert.deepEqual(f.saved().rows[0],original);assert.deepEqual((await query(f)).reservation,original);
});

test('a preexisting provider event suppresses RESERVED qualification view while retaining its original money hold',async t=>{
 const {f}=await pendingUsage(t),state=f.saved(),row=state.rows[0];row.state='RESERVED';for(const key of ['dispatchedAt','dispatchedDayId','dispatchedTimeZone'])delete row[key];f.setSaved(state);
 const answer=await query(f);assert.equal(answer.state,'RESERVED');assert.equal(answer.reservation,null);assert.equal(answer.financialOutcome,'UNKNOWN');assert.equal(answer.heldSpendMicros,700);flags(answer);
});

for(const boundary of ['accounting','accounting_to_read','publication'])test(`recovery refuses a DB clock rollback at ${boundary} after a later observation in the same transaction`,async t=>{
 let armed=false,reads=0;const {f}=await pendingUsage(t,{hook:({sql,setClock})=>{
  if(armed&&sql.startsWith('SELECT floor')){reads++;const high=boundary==='accounting'?1:boundary==='accounting_to_read'?2:3;if(reads===high)setClock(f.now+1000);if(reads===high+1)setClock(f.now+500);if(reads>high+1)setClock(f.now+1500);}
 }});const before=f.saved();armed=true;
 const answer=await query(f);assert.equal(answer.reason,'CLOCK_ROLLBACK');assert.equal(answer.state,undefined);assert.deepEqual(f.saved(),before);
});
