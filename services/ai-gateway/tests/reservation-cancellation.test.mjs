import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,protocol} from './service-fixtures.mjs';
import {request} from './postgres-fixtures.mjs';

const denied=result=>{assert.equal(result.decision,'deny');assert.equal(result.dispatchAllowed,false);assert.equal(result.financialAuthority,false);assert.equal(result.retryAllowed,false);};
test('an original unsent reservation can be cancelled after its content grant is revoked, expired or absent',async()=>{
 for(const mutate of [(f,p,r)=>{p.grants.get(r.operationId).authorized=false;},(f,p,r)=>{p.grants.get(r.operationId).expires_at_ms=String(f.now);},(f,p)=>p.grants.clear()]){
  const f=fixture(),p=protocol(f),r=request('revoked-content'),b=p.admit(r),s=p.service();assert.equal((await s.reserve(b)).state,'RESERVED');
  const original=structuredClone(p.saved().rows[0]);mutate(f,p,r);const start=p.calls.length,result=await s.cancel(b);
  assert.equal(result.decision,'cancelled');assert.equal(result.state,'CANCELLED_BEFORE_DISPATCH');assert.equal(result.reservationMicros,original.reservationMicros);
  assert.deepEqual(p.saved().rows,[{...original,state:'CANCELLED_BEFORE_DISPATCH'}]);
  assert.equal(p.calls.slice(start).some(c=>/FROM paia_ai_private\.(route_authority|request_authority)/.test(c.sql)),false,'cancellation must not resurrect content or route authority');
 }
});
test('cancel does not require a new route, current tariff or fresh spending allowance',async()=>{
 for(const mutate of [(f)=>{f.routeRow=null;},(f)=>{f.routeRow.expires_at_ms=String(f.now);},(f)=>{f.routeRow.facts.book.expiresAt=f.now;},(f)=>{f.control.enabled=false;},(f)=>{f.control.day_limit_micros='0';f.control.month_limit_micros='0';},(f)=>{f.control.expires_at_ms=String(f.now);}]){
  const f=fixture(),p=protocol(f),r=request('historical-cancel'),b=p.admit(r),s=p.service();await s.reserve(b);const before=structuredClone(p.saved().rows[0]);mutate(f);
  assert.equal((await s.cancel(b)).decision,'cancelled');assert.deepEqual(p.saved().rows,[{...before,state:'CANCELLED_BEFORE_DISPATCH'}]);
 }
});
test('cancellation still verifies both exact signed proofs and current principal security',async()=>{
 for(const mutate of [(p,b)=>{b.principalToken='forged';},(p,b)=>{b.entitlementToken='forged';},(p,b)=>{b.request.libraryId+='other';},(p)=>{p.principals.values().next().value.security.principalActive=false;},(p)=>{p.principals.values().next().value.security.entitlementGeneration='revoked';}]){
  const p=protocol(),b=p.admit(request('identity-cancel')),s=p.service();await s.reserve(b);const before=structuredClone(p.saved());p.grants.clear();mutate(p,b);denied(await s.cancel(b));assert.deepEqual(p.saved(),before);
 }
});
test('cancellation cannot create a missing reservation or rebind an existing operation',async()=>{
 const p=protocol(),r=request('exact-cancel'),b=p.admit(r),s=p.service();denied(await s.cancel(b));assert.equal(p.saved(),null);
 await s.reserve(b);const before=structuredClone(p.saved()),rebound=p.admit({...r,inputTokens:r.inputTokens+1});denied(await s.cancel(rebound));assert.deepEqual(p.saved(),before);
});
test('provider evidence or an original dispatched row retains the hold after content revocation',async()=>{
 for(const recorded of [false,true]){
  const p=protocol(),r=request('pending-cancel'),b=p.admit(r),s=p.service();await s.reserve(b);p.event(r,'original-dispatch','DISPATCHED');if(recorded)await s.record(b,'original-dispatch');
  p.grants.clear();const before=structuredClone(p.saved());assert.equal((await s.cancel(b)).reason,'OUTCOME_OR_ATTEMPT_PENDING');assert.deepEqual(p.saved(),before);
 }
});
test('a lost cancellation commit acknowledgement stays unknown and never replays automatically',async()=>{
 for(const applied of [false,true]){
  let phase=false;const p=protocol(fixture(),{hook:({sql,save})=>{if(phase&&sql==='COMMIT'){if(applied)save();throw Error('SYNTHETIC lost cancellation acknowledgement');}}}),b=p.admit(request('cancel-ack')),s=p.service();await s.reserve(b);p.grants.clear();const connections=p.connected();phase=true;
  const answer=await s.cancel(b);assert.equal(answer.decision,'outcome_unknown');assert.equal(answer.retryAllowed,false);assert.equal(p.connected(),connections+1);assert.equal(p.saved().rows[0].state,applied?'CANCELLED_BEFORE_DISPATCH':'RESERVED');
  phase=false;assert.equal((await s.cancel(b)).state,'CANCELLED_BEFORE_DISPATCH');assert.equal(p.saved().rows.length,1);
 }
});
test('cancel final publication still refuses rollback and identity expiry with real original transaction rollback',async()=>{
 for(const advance of [-1,60000]){
  const f=fixture();let phase=false,reads=0;const p=protocol(f,{hook:({sql,setClock})=>{if(phase&&sql.startsWith('SELECT floor')&&++reads===2)setClock(f.now+advance);}}),b=p.admit(request('cancel-time')),s=p.service();await s.reserve(b);p.grants.clear();const before=structuredClone(p.saved());phase=true;
  denied(await s.cancel(b));assert.deepEqual(p.saved(),before);assert.equal(p.calls.at(-1).sql,'ROLLBACK');
 }
});
test('cancel keeps service profile, current identity configuration and least-privilege controls',async()=>{
 for(const mutate of [(f)=>{f.control=null;},(f)=>{f.control.profile_id='other';},(f)=>{f.control.identity_config_hash='0'.repeat(64);}]){
  const f=fixture(),p=protocol(f),b=p.admit(request('cancel-control')),s=p.service();await s.reserve(b);const before=structuredClone(p.saved());mutate(f);denied(await s.cancel(b));assert.deepEqual(p.saved(),before);
 }
 let unsafe=false;const p=protocol(fixture(),{hook:({sql,args})=>unsafe&&sql.includes('SELECT c.relname')?{rows:args[0].map(relname=>({relname,relrowsecurity:true,relforcerowsecurity:true,rolsuper:false,rolbypassrls:false,is_owner:false,can_mutate:true}))}:undefined}),b=p.admit(request('cancel-role')),s=p.service();await s.reserve(b);const before=structuredClone(p.saved());unsafe=true;denied(await s.cancel(b));assert.deepEqual(p.saved(),before);
});
test('relaxed cancellation never relaxes new reservation authority',async()=>{
 const p=protocol(),r=request('still-reserve'),b=p.admit(r),s=p.service();await s.reserve(b);p.grants.get(r.operationId).authorized=false;denied(await s.reserve(b));assert.equal(p.saved().rows[0].state,'RESERVED');
});
