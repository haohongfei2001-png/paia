import test from 'node:test';
import assert from 'node:assert/strict';
import {resultFixture,http} from './result-fixtures.mjs';
import {createPostgresResultService} from '../result-service.mjs';
import {createResultHandler} from '../result-entry.mjs';
const flags=result=>{assert.equal(result.financialAuthority,false);assert.equal(result.dispatchAllowed,false);assert.equal(result.retryAllowed,false);};
const finish=f=>f.service.finalize(f.bundles[0],f.result);

test('authenticated actual handler finalizes original financial rows without modifying money or calling provider',async()=>{
 const f=await resultFixture({count:2}),before=f.p.saved(),handler=createResultHandler({service:f.service});
 const response=await handler(http(f)),answer=await response.json();assert.equal(response.status,200);
 assert.deepEqual(answer,{decision:'finalized',operationId:f.requests[0].operationId,jobId:f.result.jobId,receiptId:f.result.receiptId,resultOutcome:'COMMITTED',effectiveResults:1,financialAuthority:false,dispatchAllowed:false,retryAllowed:false});
 assert.deepEqual(f.p.saved().rows.map(row=>row.settlement),before.rows.map(row=>row.settlement));
 assert.deepEqual(f.p.saved().rows[0].resultResolution,f.result);assert.equal(f.p.saved().rows[1].resultResolution,undefined);
 assert.equal(response.headers.get('cache-control'),'no-store');
 for(const kind of ['principalToken','entitlementToken'])assert.ok(!JSON.stringify(f.p.calls).includes(f.bundles[0][kind]));
 assert.ok(f.p.calls.every(call=>!call.sql.includes('INSERT INTO')));
});

test('independent service instances replay the exact domain receipt idempotently and reject terminal conflict',async()=>{
 const f=await resultFixture();assert.equal((await finish(f)).decision,'finalized');const before=f.p.saved();
 assert.deepEqual(await f.create().finalize(f.bundles[0],f.result),await finish(f));
 for(const result of [{...f.result,outcome:'FAILED'},{...f.result,receiptId:'SYNTHETIC-other-result'}])assert.equal((await f.service.finalize(f.bundles[0],result)).reason,'RESULT_CONFLICT');
 assert.deepEqual(f.p.saved(),before);
});

test('true domain failure releases only provisional result and keeps known billed spend',async()=>{
 const f=await resultFixture({count:2,states:['VALIDATED','FAILED']});f.result.outcome='FAILED';
 const before=f.p.saved().rows.map(row=>row.settlement),answer=await finish(f);
 assert.equal(answer.resultOutcome,'FAILED');assert.equal(answer.effectiveResults,0);flags(answer);
 assert.deepEqual(f.p.saved().rows.map(row=>row.settlement),before);assert.equal(before.reduce((n,e)=>n+e.usdMicros,0),240);
});

test('known cancelled financial child accepts only null receipt and can never become COMMITTED',async()=>{
 const f=await resultFixture({count:2,states:['VALIDATED','CANCELLED']});assert.equal((await finish(f)).reason,'RESULT_SCOPE_INCOMPLETE');
 f.result.outcome='FAILED';assert.equal((await finish(f)).decision,'finalized');assert.equal(f.p.saved().rows[1].state,'CANCELLED_BEFORE_DISPATCH');
 const g=await resultFixture({states:['CANCELLED']});g.result.outcome='FAILED';g.result.children[0].receiptId='SYNTHETIC-forged';assert.equal((await finish(g)).reason,'RESULT_FINANCIAL_BINDING');
});

for(const state of ['RESERVED','DISPATCHED','UNKNOWN'])test(`a domain declaration cannot release ${state} money or attempt holds`,async()=>{
 const f=await resultFixture({states:[state]}),before=f.p.saved();f.result.outcome='FAILED';
 assert.equal((await finish(f)).reason,'RESULT_SCOPE_INCOMPLETE');assert.deepEqual(f.p.saved(),before);
});

test('missing extra duplicate wrong-job and wrong-usage child bindings cannot close a result',async()=>{
 const f=await resultFixture({count:2}),before=f.p.saved();
 for(const mutate of [r=>r.children.pop(),r=>r.children.push({...r.children[0]}),r=>r.children[1]={...r.children[0]},r=>r.jobId='SYNTHETIC-other',r=>r.children[0].receiptId='SYNTHETIC-wrong',r=>r.children[0].receiptId=null]){
  const result=structuredClone(f.result);mutate(result);assert.equal((await f.service.finalize(f.bundles[0],result)).decision,'deny');assert.deepEqual(f.p.saved(),before);
 }
 assert.equal((await f.service.finalize(f.bundles[1],f.result)).decision,'deny');
});

test('current identity cannot be forged or rebound across principal library and original request',async()=>{
 const f=await resultFixture(),before=f.p.saved();
 for(const bundle of [{...f.bundles[0],principalToken:'forged'}, {...f.bundles[0],entitlementToken:'forged'},
  ...['principalId','libraryId','scopeFingerprint','consentEpoch','outputCap'].map(key=>{const request={...f.requests[0],[key]:key==='outputCap'?1:'SYNTHETIC-rebound'};return f.f.bundle(request);})]){
  assert.equal((await f.service.finalize(bundle,f.result)).decision,'deny');assert.deepEqual(f.p.saved(),before);
 }
 f.p.principals.get([f.requests[0].principalId,f.requests[0].libraryId].join('/')).security.principalActive=false;
 assert.equal((await finish(f)).reason,'AUTHORIZATION');assert.deepEqual(f.p.saved(),before);
});

test('expired revoked content and route facts cannot erase genuine history or reprice financial receipts',async()=>{
 const f=await resultFixture(),before=f.p.saved().rows[0];
 f.p.grants.get(f.requests[0].operationId).authorized=false;f.p.grants.get(f.requests[0].operationId).expires_at_ms=String(f.f.now-1);
 f.f.routeRow.facts.book.rates.completion=9999999;f.f.routeRow.expires_at_ms='0';f.f.control.enabled=false;f.f.control.expires_at_ms='0';
 for(const event of f.p.events.values())event.expires_at_ms='0';
 assert.equal((await finish(f)).decision,'finalized');assert.deepEqual(f.p.saved().rows[0].settlement,before.settlement);assert.deepEqual(f.p.saved().rows[0].pricing,before.pricing);
});

test('immutable event absence or differing evidence never becomes client financial truth',async()=>{
 for(const mutate of [p=>p.events.delete('SYNTHETIC-usage-0'),p=>p.events.get('SYNTHETIC-usage-0').evidence.usdMicros=0,p=>p.events.get('SYNTHETIC-usage-0').request_hash='f'.repeat(64),p=>p.events.get('SYNTHETIC-usage-0').operation_id='SYNTHETIC-other']){
  const f=await resultFixture();mutate(f.p);const before=f.p.saved();assert.equal((await finish(f)).decision,'deny');assert.deepEqual(f.p.saved(),before);
 }
});

test('financial receipt cannot be reused as result receipt',async()=>{
 const f=await resultFixture();f.result.receiptId=f.result.children[0].receiptId;const before=f.p.saved();assert.equal((await finish(f)).reason,'RECEIPT_REBOUND');assert.deepEqual(f.p.saved(),before);
});

test('identity expiry during awaited receipt read and final SQL publication refuses with rollback',async()=>{
 for(const point of ['event','publication']){
  let active=false;const f=await resultFixture({hook:({sql,args,setClock})=>{
   if(active&&(point==='event'?sql.startsWith('SELECT operation_id, request_hash'):sql.startsWith('WITH publication')))setClock(point==='event'?f.f.now+61000:args[4]);
  }});active=true;const before=f.p.saved();assert.equal((await finish(f)).decision,'deny');assert.deepEqual(f.p.saved(),before);
 }
});

test('lost COMMIT ACK remains unknown and exact retry reads durable original outcome',async()=>{
 let active=false,once=true;const f=await resultFixture({hook:({sql,save})=>{if(active&&once&&sql==='COMMIT'){once=false;save();throw Error('SYNTHETIC lost ACK');}}});active=true;
 const result=await finish(f);assert.equal(result.decision,'outcome_unknown');assert.equal(result.reason,'COMMIT_OUTCOME_UNKNOWN');flags(result);
 assert.equal(f.p.saved().rows[0].resultResolution.outcome,'COMMITTED');assert.equal((await finish(f)).effectiveResults,1);
});

test('input snapshot cannot be changed while awaiting SQL and privileged fact writers are rejected',async()=>{
 let enter,release,active=false;const entered=new Promise(r=>enter=r),gate=new Promise(r=>release=r);
 const f=await resultFixture({hook:async({sql})=>{if(active&&sql.startsWith('SELECT schema_version')){enter();await gate;}}});active=true;
 const pending=finish(f);await entered;f.result.outcome='FAILED';f.result.children[0].receiptId='SYNTHETIC-other';release();
 assert.equal((await pending).resultOutcome,'COMMITTED');
 let unsafe=false;const g=await resultFixture({hook:({sql,args})=>{if(unsafe&&sql.includes('SELECT c.relname'))return {rows:args[0].map(relname=>({relname,relrowsecurity:true,relforcerowsecurity:true,rolsuper:false,rolbypassrls:false,is_owner:false,can_mutate:true}))};}});unsafe=true;
 const before=g.p.saved();assert.equal((await finish(g)).reason,'AUTHORITY_UNSAFE_ROLE_OR_SCHEMA');assert.deepEqual(g.p.saved(),before);
});

test('unconfigured result service does not accept an HTTP trusted boolean or arbitrary callable service',async()=>{
 const f=await resultFixture(),before=f.p.saved();assert.equal((await createPostgresResultService().finalize(f.bundles[0],f.result)).reason,'SERVICE_UNCONFIGURED');
 let called=false;const handler=createResultHandler({service:{finalize(){called=true;}}});assert.equal((await handler(http(f))).status,503);assert.equal(called,false);assert.deepEqual(f.p.saved(),before);
});

test('receipt locks follow the original singleton and current principal before final database-clock publication',async()=>{
 const f=await resultFixture();f.p.calls.length=0;assert.equal((await finish(f)).decision,'finalized');
 const sql=f.p.calls.map(c=>c.sql),index=fragment=>sql.findIndex(q=>q.includes(fragment));
 assert.ok(index('SELECT schema_version')<index('FROM paia_ai_private.service_control'));
 assert.ok(index('FROM paia_ai_private.service_control')<index('FROM paia_ai_private.principal_authority'));
 assert.ok(index('FROM paia_ai_private.principal_authority')<index('FROM paia_ai_private.operation_evidence'));
 assert.ok(index('FROM paia_ai_private.operation_evidence')<sql.findLastIndex(q=>q.startsWith('SELECT floor')));
 assert.ok(sql.findLastIndex(q=>q.startsWith('SELECT floor'))<index('WITH publication'));
 assert.equal(sql.at(-1),'COMMIT');
});
