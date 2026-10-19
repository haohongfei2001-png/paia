import test from 'node:test';
import assert from 'node:assert/strict';
import {BudgetWindowReservation} from '../core/ai-usage/budget-window-reservation.js';
import {FixtureAtomicReservation} from '../core/ai-usage/atomic-reservation.js';
import {ROUTE_FIELDS} from '../core/ai-usage/ratebook.js';

const HOUR=3600000,DAY=24*HOUR;
const request=(id,patch={})=>({operationId:id,jobId:'job-'+id,principalId:'principal',libraryId:'library',scopeFingerprint:'scope',contractVersion:'contract',routeVersion:'route',consentEpoch:'consent',jobType:'AI_ORGANIZE',childIndex:0,childCount:1,inputTokens:1000,outputCap:6000,maxCompletionTokens:5990,...patch});
// Synthetic serializable adapter tests the actual accounting owner. It is not a
// durable service, identity signature, provider dispatch or commercial proof.
function fixture(){
 let data=new Map(),queue=Promise.resolve(),now=Date.UTC(2026,0,1),abort=false;
 const route=Object.fromEntries(ROUTE_FIELDS.map(k=>[k,'SYNTHETIC_'+k]));route.currency='USD';
 const controls={authorized:true,verifiedServiceFacts:true,tier:'free',timeZone:'UTC',routeQualified:true,thinkingBoundQualified:true,inputBoundQualified:true,global:{dayLimitMicros:1000000,monthLimitMicros:1000000}};
 const service={clock:()=>now,transact(fn){const run=queue.then(async()=>{const pending=structuredClone(data),value=await fn({get:async k=>structuredClone(pending.get(k)),put:async(k,v)=>pending.set(k,structuredClone(v))});if(abort){abort=false;throw Error('SYNTHETIC_ABORT');}data=pending;return value;});queue=run.catch(()=>{});return run;},verifyRequest:async(request,time)=>({...structuredClone(controls),request,route,book:{route,rates:{standardInput:1000000,cachedReadInput:1000000,cacheCreateInput:1000000,completion:1000000},effectiveAt:0,verifiedAt:time,expiresAt:time+1000,source:'SYNTHETIC tariff',verified:true,inputBand:{minInclusive:0,maxInclusive:16000}}}),verifySettlement:async(request,evidence)=>({verifiedSettlementFacts:true,request,evidence})};
 const make=()=>new BudgetWindowReservation({service});
 return {make,service,controls,setNow:n=>now=n,advance:n=>now+=n,now:()=>now,rows:()=>structuredClone([...data.values()].flatMap(x=>x.rows)),abort:()=>abort=true,mutate:fn=>fn(data)};
}
const evidence=(r,outcome='FAILED')=>({receiptId:'receipt-'+r.operationId,operationId:r.operationId,outcome,usage:outcome==='UNKNOWN'?null:{inputTokens:1000,completionTokens:1000,totalTokens:2000,reasoningTokens:0,cachedReadTokens:0,cacheCreateTokens:0},pricingVersion:'SYNTHETIC_pricingVersion',fxVersion:null,nativeCurrency:'USD',nativeMicros:outcome==='UNKNOWN'?null:2000,usdMicros:outcome==='UNKNOWN'?null:2000,committedChildren:outcome==='COMMITTED'?[{operationId:r.operationId,receiptId:'receipt-'+r.operationId}]:[]});
async function completed(f,r,outcome='COMMITTED'){await f.make().reserve(r);await f.make().record(r,'DISPATCHED');await f.make().settle(r,evidence(r,outcome));}

test('original reservation owner must release known daily occupation after a real rolling day',async()=>{
 const f=fixture();for(let i=0;i<3;i++)await completed(f,request('done'+i));
 await assert.rejects(f.make().reserve(request('before')),/BUDGET_OR_QUOTA/);
 f.advance(DAY);assert.equal((await f.make().reserve(request('after'))).state,'RESERVED');
});
test('original reservation owner must enforce actual maintenance cadence',async()=>{
 const f=fixture(),maintenance=id=>request(id,{jobType:'AI_MAINTENANCE',outputCap:2000,maxCompletionTokens:1990});
 await completed(f,maintenance('first'),'FAILED');
 await assert.rejects(f.make().reserve(maintenance('too-soon')),/MAINTENANCE_CADENCE/);
});

test('known money has distinct rolling 24h and 30d expiry with no tomorrow refill',async()=>{
 const f=fixture();f.controls.global={dayLimitMicros:1000000,monthLimitMicros:8000};
 await completed(f,request('billed'),'FAILED');f.advance(DAY);
 await assert.rejects(f.make().reserve(request('day-two')),/BUDGET_OR_QUOTA/);
 f.advance(29*DAY-1);await assert.rejects(f.make().reserve(request('month-before')),/BUDGET_OR_QUOTA/);
 f.advance(1);assert.equal((await f.make().reserve(request('month-after'))).state,'RESERVED');
 assert.equal(f.rows()[0].settlement.usdMicros,2000);
});
test('daily money expires at an exact rolling boundary and retains historical receipt',async()=>{
 const f=fixture();f.controls.global={dayLimitMicros:8000,monthLimitMicros:1000000};
 await completed(f,request('billed'),'FAILED');f.advance(DAY-1);
 await assert.rejects(f.make().reserve(request('early')),/BUDGET_OR_QUOTA/);
 f.advance(1);await f.make().reserve(request('on-time'));assert.equal(f.rows().length,2);
});
for(const state of ['RESERVED','DISPATCHED','OUTCOME_UNKNOWN'])test(state+' occupation never expires without evidence',async()=>{
 const f=fixture(),r=request('unresolved');f.controls.global={dayLimitMicros:8000,monthLimitMicros:8000};
 await f.make().reserve(r);if(state!=='RESERVED')await f.make().record(r,'DISPATCHED');if(state==='OUTCOME_UNKNOWN')await f.make().settle(r,evidence(r,'UNKNOWN'));
 f.advance(31*DAY);await assert.rejects(f.make().reserve(request('replacement')),/BUDGET_OR_QUOTA/);
 assert.equal(f.rows()[0].reservationMicros,7000);assert.equal((await f.make().reserve(r)).state,state);
 if(state!=='RESERVED'){await f.make().settle(r,evidence(r,'FAILED'));await f.make().reserve(request('after-proof'));}
});
test('failed attempts and reserved token bounds remain charged for their real day',async()=>{
 const f=fixture();for(let i=0;i<12;i++)await completed(f,request('failed'+i),'FAILED');
 await assert.rejects(f.make().reserve(request('thirteenth')),/BUDGET_OR_QUOTA/);
 f.advance(DAY);await f.make().reserve(request('next-day'));
});
test('known successful results refresh only after a rolling day, even after a timezone switch',async()=>{
 const f=fixture();f.setNow(Date.UTC(2026,0,1,23,59));for(let i=0;i<3;i++)await completed(f,request('r'+i));
 f.advance(2*60000);
 for(const timeZone of ['UTC','Pacific/Kiritimati','America/Los_Angeles','Asia/Tokyo','UTC']){f.controls.timeZone=timeZone;await assert.rejects(f.make().reserve(request('zone-'+timeZone)),/BUDGET_OR_QUOTA/);}
 f.advance(DAY-2*60000);await f.make().reserve(request('rolling-day'));
});
test('DST fall-back keeps the same declared day quota for all 25 hours',async()=>{
 const f=fixture();f.controls.timeZone='America/New_York';f.setNow(Date.UTC(2026,10,1,4));
 for(let i=0;i<3;i++)await completed(f,request('dst'+i));
 f.advance(DAY);await assert.rejects(f.make().reserve(request('still-sunday')),/BUDGET_OR_QUOTA/);
 f.advance(HOUR);await f.make().reserve(request('monday'));
});
test('DST spring-forward cannot replenish daily results after a 23-hour day',async()=>{
 const f=fixture();f.controls.timeZone='America/New_York';f.setNow(Date.UTC(2026,2,8,5));
 for(let i=0;i<3;i++)await completed(f,request('dst'+i));
 f.advance(23*HOUR);await assert.rejects(f.make().reserve(request('new-day-too-early')),/BUDGET_OR_QUOTA/);
 f.advance(HOUR);await f.make().reserve(request('rolling-day'));
});
const maintenance=(id,patch={})=>request(id,{jobType:'AI_MAINTENANCE',outputCap:2000,maxCompletionTokens:1990,...patch});
test('Free windows are stable, principal-wide, not banked across sleep, and return next eligibility',async()=>{
 const f=fixture(),start=f.now(),r=maintenance('first');const first=await f.make().reserve(r);
 assert.equal(first.window.nextEligibilityAt,start+8*HOUR);assert.equal(first.window.dayId,'2026-01-01');
 await f.make().record(r,'CANCELLED_BEFORE_DISPATCH');f.advance(8*HOUR-1);
 await assert.rejects(f.make().reserve(maintenance('other-library',{libraryId:'other'})),e=>e.code==='MAINTENANCE_CADENCE'&&e.nextEligibilityAt===start+8*HOUR);
 f.advance(1);await completed(f,maintenance('second'),'FAILED');
 f.advance(48*HOUR);await completed(f,maintenance('after-sleep'),'FAILED');
 await assert.rejects(f.make().reserve(maintenance('missed-window-replay')),/MAINTENANCE_CADENCE/);
});
test('Pro minimum interval remains one actual hour through time-zone changes and reconstruction',async()=>{
 const f=fixture();f.controls.tier='pro';await completed(f,maintenance('first'),'FAILED');
 f.controls.timeZone='Pacific/Kiritimati';f.advance(HOUR-1);await assert.rejects(f.make().reserve(maintenance('early')),/MAINTENANCE_CADENCE/);
 f.advance(1);await completed(f,maintenance('next'),'FAILED');
});
test('repeated DST hour has one Pro maintenance window rather than a duplicated cycle',async()=>{
 const f=fixture();f.controls.tier='pro';f.controls.timeZone='America/New_York';f.setNow(Date.UTC(2026,10,1,5,30));
 const first=await f.make().reserve(maintenance('first'));assert.equal(first.window.nextEligibilityAt,Date.UTC(2026,10,1,7));
 await f.make().record(maintenance('first'),'CANCELLED_BEFORE_DISPATCH');
 f.advance(HOUR);await assert.rejects(f.make().reserve(maintenance('repeated-one-thirty')),e=>e.code==='MAINTENANCE_CADENCE'&&e.nextEligibilityAt===Date.UTC(2026,10,1,7));
 f.advance(HOUR/2);await f.make().reserve(maintenance('two-am'));
});
test('Free DST windows are approximately eight hours but never bypass minimum cadence',async()=>{
 const f=fixture();f.controls.timeZone='America/New_York';f.setNow(Date.UTC(2026,2,8,5));
 const r=maintenance('spring');assert.equal((await f.make().reserve(r)).window.endsAt,Date.UTC(2026,2,8,12));
 await f.make().record(r,'CANCELLED_BEFORE_DISPATCH');f.advance(7*HOUR);await assert.rejects(f.make().reserve(maintenance('eight-local')),/MAINTENANCE_CADENCE/);
 f.advance(HOUR);await f.make().reserve(maintenance('eight-real-hours'));
});
test('logical children share one maintenance cycle across devices without a second reservation',async()=>{
 const f=fixture(),a=maintenance('a',{childCount:2}),b={...a,operationId:'b',childIndex:1};
 const duplicate=await Promise.all([f.make().reserve(a),f.make().reserve(a)]);assert.deepEqual(duplicate[0],duplicate[1]);
 await f.make().reserve(b);assert.equal(f.rows().length,2);
 await assert.rejects(f.make().reserve({...b,operationId:'different-device-child'}),/CHILD_ALREADY_RESERVED/);
 await assert.rejects(f.make().reserve({...a,operationId:'rebound',childIndex:1,principalId:'other'}),/JOB_REBOUND/);
 await f.make().record(a,'DISPATCHED');await f.make().record(a,'OUTCOME_UNKNOWN');
 await assert.rejects(f.make().record(b,'DISPATCHED'),/OUTCOME_OR_ATTEMPT_PENDING/);
});
test('all principals and service instances share one atomic financial allowance',async()=>{
 const f=fixture();f.controls.global={dayLimitMicros:15000,monthLimitMicros:15000};
 const results=await Promise.allSettled(['a','b','c'].map(id=>f.make().reserve(request(id,{principalId:id}))));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,2);assert.equal(f.rows().length,2);
 for(const result of results.filter(r=>r.status==='fulfilled')){assert.equal(result.value.dispatchAllowed,false);assert.equal(result.value.financialAuthority,false);}
});
test('rollback and failed atomic commits never create an extra cycle or erase a hold',async()=>{
 const f=fixture(),start=f.now();await f.make().reserve(request('first'));
 const before=f.rows();f.setNow(start-1);await assert.rejects(f.make().reserve(request('rollback')),/CLOCK_ROLLBACK/);assert.deepEqual(f.rows(),before);
 f.setNow(start+DAY);f.abort();await assert.rejects(f.make().reserve(maintenance('aborted')),/SYNTHETIC_ABORT/);assert.deepEqual(f.rows(),before);
 f.setNow(start+DAY-1);await f.make().reserve(maintenance('aborted'));assert.equal(f.rows().length,2);
});
test('settlement on a later day accounts effective results at commit time, not reservation time',async()=>{
 const f=fixture(),r=request('late');await f.make().reserve(r);await f.make().record(r,'DISPATCHED');f.advance(2*DAY);await f.make().settle(r,evidence(r,'COMMITTED'));
 await completed(f,request('now1'));await completed(f,request('now2'));await assert.rejects(f.make().reserve(request('now3')),/BUDGET_OR_QUOTA/);
 f.advance(DAY);await f.make().reserve(request('next'));
});
test('cancelled, failed and validated-only jobs retain distinct result and financial semantics',async()=>{
 const f=fixture();for(let i=0;i<3;i++)await completed(f,request('validated'+i),'VALIDATED');
 f.advance(31*DAY);await assert.rejects(f.make().reserve(request('fourth')),/BUDGET_OR_QUOTA/);
 assert.ok(f.rows().every(r=>r.resultCommitted!==true));
});
test('absence of an adapter, forged bindings, client clocks and unknown zones fail closed',async()=>{
 assert.throws(()=>new BudgetWindowReservation(),/UNAVAILABLE/);
 const f=fixture();for(const timeZone of [undefined,'','Mars/Olympus',3]){f.controls.timeZone=timeZone;await assert.rejects(f.make().reserve(request('bad-zone')));}
 f.controls.timeZone='UTC';f.controls.verifiedServiceFacts=false;await assert.rejects(f.make().reserve(request('forged')),/UNQUALIFIED_FACTS/);
 f.controls.verifiedServiceFacts=true;await assert.rejects(f.make().reserve({...request('client'),timeZone:'UTC',now:f.now()}));assert.equal(f.rows().length,0);
});
test('legacy and windowed owners cannot silently reinterpret the same durable history',async()=>{
 const f=fixture(),legacy=()=>new FixtureAtomicReservation({transact:f.service.transact,verify:f.service.verifyRequest,verifySettlement:f.service.verifySettlement,clock:f.service.clock});
 await f.make().reserve(request('bounded'));await assert.rejects(legacy().reserve(request('bypass')),/WINDOW_POLICY_REQUIRED/);
 const old=fixture();await new FixtureAtomicReservation({transact:old.service.transact,verify:old.service.verifyRequest,clock:old.service.clock}).reserve(request('old'));
 await assert.rejects(old.make().reserve(request('convert')),/WINDOW_HISTORY_UNQUALIFIED/);
});
test('unqualified persisted timing metadata cannot manufacture window credit',async()=>{
 for(const mutate of [row=>delete row.window,row=>row.reservedAt++,row=>row.window.dayId='2099-01-01',row=>row.window.nextEligibilityAt=1,row=>row.dispatchedAt=row.reservedAt-1]){
  const f=fixture(),r=request('valid');await f.make().reserve(r);await f.make().record(r,'DISPATCHED');f.mutate(data=>mutate([...data.values()][0].rows[0]));const before=f.rows();
  await assert.rejects(f.make().reserve(request('next')));assert.deepEqual(f.rows(),before);
 }
});
test('global allowance unset disables remote while authorized core/cache preflight stays available',async()=>{
 const {evaluateAdmission}=await import('../core/ai-usage/admission-policy.js');
 for(const global of [undefined,{dayLimitMicros:0,monthLimitMicros:10000},{dayLimitMicros:10000,monthLimitMicros:0}]){const f=fixture();f.controls.global=global;await assert.rejects(f.make().reserve(request('unset')),/ALLOWANCE_UNSET/);assert.equal(f.rows().length,0);}
 assert.equal(evaluateAdmission({authorized:true,intent:'local'}).decision,'local');assert.equal(evaluateAdmission({authorized:true,intent:'cache',exactCurrentCache:true}).decision,'cache_hit');
});

test('never-reserved children do not keep a failed or cancelled result slot forever',async()=>{
 for(const outcome of ['FAILED','CANCELLED_BEFORE_DISPATCH']){
  const f=fixture();for(let i=0;i<3;i++){
   const r=request('incomplete'+i,{childCount:2});await f.make().reserve(r);
   if(outcome==='FAILED'){await f.make().record(r,'DISPATCHED');await f.make().settle(r,evidence(r,'FAILED'));}
   else await f.make().record(r,outcome);
  }
  await f.make().reserve(request('fresh'));assert.equal(f.rows().length,4);
 }
});
test('a new sibling must reacquire a result slot after its failed job released that slot',async()=>{
 const f=fixture(),a=request('failed',{childCount:2});await completed(f,a,'FAILED');
 for(let i=0;i<3;i++)await f.make().reserve(request('held'+i));
 await assert.rejects(f.make().reserve({...a,operationId:'new-child',childIndex:1}),/BUDGET_OR_QUOTA/);
});
test('dispatch uses real attempt time while the old reservation was continuously held',async()=>{
 const f=fixture(),r=request('delayed');await f.make().reserve(r);f.advance(2*DAY);await f.make().record(r,'DISPATCHED');await f.make().settle(r,evidence(r,'FAILED'));
 f.controls.global={dayLimitMicros:8000,monthLimitMicros:1000000};await assert.rejects(f.make().reserve(request('blocked')),/BUDGET_OR_QUOTA/);
 f.advance(DAY);await f.make().reserve(request('day-after-dispatch'));
});

test('bounded history stops at capacity without forgetting old operation identities',async()=>{
 const f=fixture(),r=request('first');await completed(f,r,'FAILED');
 f.mutate(data=>{const state=[...data.values()][0],template=state.rows[0];state.rows=Array.from({length:10000},(_,i)=>({...structuredClone(template),request:request(i===0?'first':'historical'+i),settlement:{...structuredClone(template.settlement),receiptId:'historical-receipt'+i,operationId:i===0?'first':'historical'+i}}));});
 f.advance(31*DAY);assert.equal((await f.make().reserve(r)).state,'SETTLED');
 await assert.rejects(f.make().reserve(request('capacity')),/BUDGET_CAPACITY/);assert.equal(f.rows().length,10000);
});
test('admission facts and returned windows cannot be rebound by caller mutation',async()=>{
 const f=fixture(),r=request('immutable'),first=await f.make().reserve(r);r.principalId='mutated';first.window.timeZone='Mars';
 const again=await f.make().reserve(request('immutable'));assert.equal(again.window.timeZone,'UTC');assert.equal(f.rows()[0].request.principalId,'principal');
 const bad={...f.service,verifyRequest:async(request,time)=>({...await f.service.verifyRequest(request,time),request:{...request,principalId:'another'}})};
 await assert.rejects(new BudgetWindowReservation({service:bad}).reserve(request('forged-proof')),/UNQUALIFIED_FACTS/);
});

test('timezone switching cannot discard the remaining hour of a historical 25-hour quota day',async()=>{
 const f=fixture();f.controls.timeZone='America/New_York';f.setNow(Date.UTC(2026,10,1,4));
 for(let i=0;i<3;i++)await completed(f,request('long-day'+i));
 f.advance(DAY);
 for(const timeZone of ['America/New_York','UTC','Pacific/Kiritimati','Asia/Tokyo','America/New_York']){
  f.controls.timeZone=timeZone;await assert.rejects(f.make().reserve(request('switch-'+timeZone)),/BUDGET_OR_QUOTA/);
 }
 f.advance(HOUR);f.controls.timeZone='UTC';await f.make().reserve(request('historical-day-ended'));
});
test('validated and cancelled terminal siblings release impossible complete-result slots',async()=>{
 const f=fixture();for(let i=0;i<3;i++){
  const a=request('valid-'+i,{childCount:2}),b={...a,operationId:'cancel-'+i,childIndex:1};
  await f.make().reserve(a);await f.make().reserve(b);await f.make().record(a,'DISPATCHED');
  await f.make().settle(a,evidence(a,'VALIDATED'));await f.make().record(b,'CANCELLED_BEFORE_DISPATCH');
 }
 f.advance(31*DAY);await f.make().reserve(request('not-leaked'));
 assert.equal(f.rows().filter(r=>r.state==='SETTLED').reduce((sum,r)=>sum+r.settlement.usdMicros,0),6000);
});
test('timezone switching cannot shorten a consumed repeated-hour maintenance window',async()=>{
 const f=fixture();f.controls.tier='pro';f.controls.timeZone='America/New_York';f.setNow(Date.UTC(2026,10,1,5,30));
 const r=maintenance('repeated-hour');await f.make().reserve(r);await f.make().record(r,'CANCELLED_BEFORE_DISPATCH');f.advance(HOUR);
 for(const timeZone of ['America/New_York','UTC','Pacific/Kiritimati','America/New_York']){
  f.controls.timeZone=timeZone;await assert.rejects(f.make().reserve(maintenance('switch-'+timeZone)),e=>e.code==='MAINTENANCE_CADENCE'&&e.nextEligibilityAt===Date.UTC(2026,10,1,7));
 }
 f.advance(HOUR/2);f.controls.timeZone='UTC';await f.make().reserve(maintenance('ended'));
});
test('historical long-day attempt and token limits also survive timezone changes',async()=>{
 const f=fixture();f.controls.timeZone='America/New_York';f.setNow(Date.UTC(2026,10,1,4));
 for(let i=0;i<12;i++)await completed(f,request('long-attempt'+i),'FAILED');
 f.advance(DAY);f.controls.timeZone='UTC';await assert.rejects(f.make().reserve(request('zone-attempt')),/BUDGET_OR_QUOTA/);
 f.advance(HOUR);await f.make().reserve(request('finished-day-attempt'));
});
test('tier changes cannot retract a previously admitted maintenance deadline',async()=>{
 const f=fixture(),start=f.now(),r=maintenance('free-cycle');await f.make().reserve(r);await f.make().record(r,'CANCELLED_BEFORE_DISPATCH');
 f.controls.tier='pro';f.advance(HOUR);await assert.rejects(f.make().reserve(maintenance('upgrade-too-early')),e=>e.code==='MAINTENANCE_CADENCE'&&e.nextEligibilityAt===start+8*HOUR);
 f.advance(7*HOUR);await completed(f,maintenance('pro-cycle'),'FAILED');f.controls.tier='free';f.advance(HOUR);
 await assert.rejects(f.make().reserve(maintenance('downgrade-too-early')),e=>e.code==='MAINTENANCE_CADENCE'&&e.nextEligibilityAt===start+16*HOUR);
});
