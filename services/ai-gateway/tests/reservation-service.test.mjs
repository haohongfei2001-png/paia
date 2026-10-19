import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,protocol} from './service-fixtures.mjs';
import {request} from './postgres-fixtures.mjs';
import {createGatewayHandler} from '../request-entry.mjs';
import {createPostgresReservationService} from '../reservation-service.mjs';
const denied=result=>{assert.equal(result.decision,'deny');assert.equal(result.dispatchAllowed,false);assert.equal(result.financialAuthority,false);};

test('service composes actual signatures, fixed PostgreSQL authorities and original ledger',async()=>{
 const f=fixture(),p=protocol(f),b=p.admit(request('one'));const result=await p.service().reserve(b);
 assert.equal(result.decision,'reserved');assert.equal(result.state,'RESERVED');assert.equal(result.reservationMicros,7000);assert.equal(result.dispatchAllowed,false);assert.equal(result.financialAuthority,false);
 assert.equal(p.saved().rows.length,1);assert.equal(p.saved().lastNow,f.now);
 assert.ok(p.calls.findIndex(c=>c.sql.includes('budget_snapshot')&&c.sql.includes('FOR UPDATE'))<p.calls.findIndex(c=>c.sql.includes('service_control')&&c.sql.includes('FOR SHARE')));
 assert.equal(p.calls.filter(c=>c.sql==='COMMIT').length,1);
 assert.ok(p.calls.find(c=>c.sql.startsWith('WITH publication')).sql.includes("jsonb_set($1::jsonb, '{lastNow}'"));
 assert.doesNotMatch(JSON.stringify(p.calls),/eyJhbGci/,'no tokens may enter DB parameters');
});
test('missing config, profile, authoritative row and nonzero budget all fail closed',async()=>{
 denied(await createPostgresReservationService().reserve({}));
 for(const mutate of [(f,p)=>{f.control=null;},(f,p)=>{f.control.identity_config_hash='0'.repeat(64);},(f,p)=>{f.control.profile_id='other';},(f,p)=>{f.control.enabled=false;},(f,p)=>{f.control.day_limit_micros='0';},(f,p)=>{p.grants.clear();},(f,p)=>{p.principals.clear();},(f,p)=>{f.routeRow=null;},(f,p)=>{f.routeRow.facts.routeQualified=false;}]){
  const f=fixture(),p=protocol(f),b=p.admit(request('missing'));mutate(f,p);denied(await p.service().reserve(b));assert.equal(p.saved(),null);
 }
});
test('all identity, consent, route and proof bindings are rechecked from fixed sources',async()=>{
 for(const [key,value] of Object.entries(request('bound'))){const f=fixture(),p=protocol(f),b=p.admit(request('bound'));const changed={...b,request:{...b.request,[key]:typeof value==='number'?value+1:value+'-other'}};denied(await p.service().reserve(changed));assert.equal(p.saved(),null);}
 const f=fixture(),p=protocol(f),b=p.admit(request('identity'));for(const patch of [{principalActive:false},{entitlementGeneration:'revoked'},{revokedPrincipalKeys:['principal']}]){Object.assign(p.principals.values().next().value.security,patch);denied(await p.service().reserve(b));}
 denied(await p.service().reserve({...b,verifyRequest:()=>true}));
});
test('original quota, same-operation idempotence and rebound survive service reconstruction',async()=>{
 const p=protocol(),r=request('same'),b=p.admit(r);await p.service().reserve(b);await p.service().reserve(b);assert.equal(p.saved().rows.length,1);
 const second=p.admit(request('second'));assert.equal((await p.service().reserve(second)).decision,'reserved');
 denied(await p.service().reserve(p.admit(request('third'))));assert.equal(p.saved().rows.length,2);
 const changed={...r,inputTokens:999};const rebound=p.admit(changed);assert.equal((await p.service().reserve(rebound)).reason,'OPERATION_REBOUND');
});
test('cancel only releases exact owner RESERVED row; client cannot assert dispatch or settlement',async()=>{
 const p=protocol(),r=request('cancel'),b=p.admit(r);const s=p.service();await s.reserve(b);assert.equal((await s.cancel(b)).state,'CANCELLED_BEFORE_DISPATCH');
 const other=request('dispatched'),proof=p.admit(other);await s.reserve(proof);denied(await s.record(proof,'missing-event'));p.event(other,'dispatch','DISPATCHED');assert.equal((await s.record(proof,'dispatch')).state,'DISPATCHED');denied(await s.cancel(proof));
 const handler=createGatewayHandler({service:s});for(const action of ['record','settle']){const response=await handler(new Request('https://service.invalid/api/reservations',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,...proof,event:'DISPATCHED',evidence:{}})}));assert.equal(response.status,400);}
 assert.equal(p.saved().rows.find(row=>row.request.operationId===other.operationId).state,'DISPATCHED');
});
test('server evidence binds lifecycle and settlement to exact original operation and receipt',async()=>{
 const p=protocol(),r=request('settle'),b=p.admit(r),s=p.service();await s.reserve(b);p.event(r,'dispatch','DISPATCHED');await s.record(b,'dispatch');
 p.event(r,'unknown','OUTCOME_UNKNOWN');assert.equal((await s.record(b,'unknown')).state,'OUTCOME_UNKNOWN');
 p.event(r,'receipt','SETTLEMENT');assert.equal((await s.settle(b,'receipt')).state,'SETTLED');assert.equal(p.saved().rows[0].settlement.usdMicros,2000);
 const other=request('other'),proof=p.admit(other);await s.reserve(proof);denied(await s.record(proof,'dispatch'));denied(await s.settle(proof,'receipt'));
});
test('time changes after async owner work recheck proof, grant, route and durable clock',async()=>{
 for(const advance of [60000,120000,-1]){const f=fixture();let reads=0;const p=protocol(f,{hook:({sql,setClock})=>{if(sql.startsWith('SELECT floor')&&++reads===2)setClock(f.now+advance);}});const b=p.admit(request('expire'));denied(await p.service().reserve(b));assert.equal(p.saved(),null);assert.ok(p.calls.some(c=>c.sql==='ROLLBACK'));}
});
test('database time predicate rejects expiry or rollback AFTER the final synchronous check',async()=>{
 for(const advance of [1000,-1]){const f=fixture();const p=protocol(f,{hook:({sql,args,setClock})=>{if(sql.startsWith('WITH publication'))setClock(args[3]+advance);}});denied(await p.service().reserve(p.admit(request('publication'))));assert.equal(p.saved(),null);}
});
test('unknown COMMIT never auto-replays, refunds, dispatches or emits request/token data',async()=>{
 for(const applied of [true,false]){let lost=true;const p=protocol(fixture(),{hook:({sql,save})=>{if(sql==='COMMIT'&&lost){if(applied)save();throw Error('SYNTHETIC PRIVATE CONNECTION SECRET');}}});const b=p.admit(request('unknown'));const result=await p.service().reserve(b);
  assert.equal(result.decision,'outcome_unknown');assert.equal(result.retryAllowed,false);assert.equal(result.dispatchAllowed,false);assert.equal(p.connected(),1);assert.deepEqual(p.released,[true]);assert.equal(p.calls.some(c=>c.sql==='ROLLBACK'),false);assert.equal(Boolean(p.saved()),applied);assert.doesNotMatch(JSON.stringify(result),/SECRET|principalToken|entitlementToken/);
  lost=false;if(applied){assert.equal((await p.service().reserve(b)).state,'RESERVED');assert.equal(p.saved().rows.length,1);}
 }
});
test('authority ownership/RLS and runtime mutation privileges are mandatory',async()=>{
 for(const patch of [{can_mutate:true},{is_owner:true},{relforcerowsecurity:false},{rolbypassrls:true}]){const p=protocol(fixture(),{hook:({sql,args})=>sql.includes('SELECT c.relname')?{rows:args[0].map(relname=>({relname,relrowsecurity:true,relforcerowsecurity:true,rolsuper:false,rolbypassrls:false,is_owner:false,can_mutate:false,...patch}))}:undefined});denied(await p.service().reserve(p.admit(request('unsafe'))));assert.equal(p.saved(),null);}
});
test('existing provider evidence stops premature cancel even before ledger record completed',async()=>{
 const p=protocol(),r=request('incomplete-record'),b=p.admit(r),s=p.service();await s.reserve(b);p.event(r,'dispatch-intent','DISPATCHED');
 assert.equal((await s.cancel(b)).reason,'OUTCOME_OR_ATTEMPT_PENDING');assert.equal(p.saved().rows[0].state,'RESERVED');assert.equal(p.saved().rows[0].reservationMicros,7000);
});
test('configured HTTP entry reaches original reservation/cancel without exposing authority APIs',async()=>{
 const p=protocol(),b=p.admit(request('http-signed')),handler=createGatewayHandler({service:p.service()});
 for(const [action,state] of [['reserve','RESERVED'],['cancel','CANCELLED_BEFORE_DISPATCH']]){
  const response=await handler(new Request('https://service.invalid/api/reservations',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,...b})}));assert.equal(response.status,200);assert.equal((await response.json()).state,state);
 }
 assert.equal(p.saved().rows.length,1);
});
test('COMMIT acknowledged after expiry still grants no dispatch and cannot pass subsequent authority check',async()=>{
 const f=fixture(),p=protocol(f,{hook:({sql,setClock})=>{if(sql==='COMMIT')setClock(f.now+120000);}}),b=p.admit(request('slow-commit'));
 const result=await p.service().reserve(b);assert.equal(result.state,'RESERVED');assert.equal(result.dispatchAllowed,false);assert.equal(result.financialAuthority,false);
 denied(await p.service().reserve(b));assert.equal(p.saved().rows.length,1);
});
test('factory captures fixed configuration and each call captures exact proof/request before yielding',async()=>{
 const f=fixture(),p=protocol(f),b=p.admit(request('captured')),s=p.service();
 f.identityConfig.principal.issuer='https://changed.invalid';
 const pending=s.reserve(b);b.request.inputTokens=999;b.principalToken='changed';
 const result=await pending;assert.equal(result.state,'RESERVED');assert.equal(p.saved().rows[0].request.inputTokens,1000);
});
test('cross-instance durable clock watermark denies rollback without a process-local clock cache',async()=>{
 const f=fixture(),p=protocol(f),b=p.admit(request('clock'));
 p.setSaved({version:1,windowPolicyVersion:1,lastNow:f.now+1,rows:[]});
 assert.equal((await p.service().reserve(b)).reason,'CLOCK_ROLLBACK');assert.equal(p.saved().rows.length,0);assert.equal(p.saved().lastNow,f.now+1);
});
