import test from 'node:test';import assert from 'node:assert/strict';
import {FixtureAtomicReservation} from '../core/ai-usage/atomic-reservation.js';
import {ROUTE_FIELDS} from '../core/ai-usage/ratebook.js';
import {evaluateAdmission} from '../core/ai-usage/admission-policy.js';
// Synthetic shared transactional service; no real signed entitlement or billing.
function fixture(){let data=new Map(),queue=Promise.resolve(),abort=false,now=100000;
 const transact=fn=>{const run=queue.then(async()=>{const pending=structuredClone(data),value=await fn({get:async k=>structuredClone(pending.get(k)),put:async(k,v)=>pending.set(k,structuredClone(v))});if(abort){abort=false;throw Error('SYNTHETIC_ABORT');}data=pending;return value;});queue=run.catch(()=>{});return run;};
 const route=Object.fromEntries(ROUTE_FIELDS.map(k=>[k,'SYNTHETIC_'+k]));route.currency='USD';
 const controls={authorized:true,verifiedServiceFacts:true,tier:'free',routeQualified:true,thinkingBoundQualified:true,inputBoundQualified:true,global:{dayLimitMicros:15000,monthLimitMicros:15000}};
 const verify=async(request,time)=>({...controls,request,route,book:{route,rates:{standardInput:1000000,cachedReadInput:1000000,cacheCreateInput:1000000,completion:1000000},effectiveAt:0,verifiedAt:time,expiresAt:time+1000,source:'SYNTHETIC tariff',verified:true,inputBand:{minInclusive:0,maxInclusive:16000}}});
 const attest=async(request,evidence)=>({verifiedSettlementFacts:true,request,evidence});const make=(verifySettlement=attest)=>new FixtureAtomicReservation({transact,verify,verifySettlement,clock:()=>now});return {make,controls,transact,verify,clock:()=>now,setNow:v=>now=v,abort:()=>abort=true,rows:()=>structuredClone([...data.values()].flatMap(x=>x.rows))};}
const request=(id='one',patch={})=>({operationId:id,jobId:'job-'+id,principalId:'principal',libraryId:'library',scopeFingerprint:'opaque-scope',contractVersion:'contract1',routeVersion:'route1',consentEpoch:'epoch1',jobType:'AI_ORGANIZE',childIndex:0,childCount:1,inputTokens:1000,outputCap:6000,maxCompletionTokens:5990,...patch});

const usage={inputTokens:1000,completionTokens:2000,totalTokens:3000,reasoningTokens:500,cachedReadTokens:0,cacheCreateTokens:0};
const evidence=(r,patch={})=>({receiptId:'receipt-'+r.operationId,operationId:r.operationId,outcome:'FAILED',usage:structuredClone(usage),pricingVersion:'SYNTHETIC_pricingVersion',fxVersion:null,nativeCurrency:'USD',nativeMicros:3000,usdMicros:3000,committedChildren:[],...patch});
const sent=async(f,r)=>{await f.make().reserve(r);await f.make().record(r,'DISPATCHED');};
test('verified billed failure settles spend without effective-result charge or attempt refund',async()=>{const f=fixture(),r=request();await sent(f,r);const v=await f.make().settle(r,evidence(r));assert.equal(v.state,'SETTLED');assert.equal(v.dispatchAllowed,false);assert.equal(v.settledSpendMicros,3000);assert.equal(v.effectiveResults,0);assert.equal(f.rows()[0].settlement.usage.totalTokens,3000);});
test('missing settlement verifier and rebound proof fail closed',async()=>{const f=fixture(),r=request();await sent(f,r);const before=f.rows();for(const verify of [null,async(request,evidence)=>({verifiedSettlementFacts:true,request:{...request,operationId:'other'},evidence})])await assert.rejects(f.make(verify).settle(r,evidence(r)));assert.deepEqual(f.rows(),before);});
test('partial usage, mismatched cost and above-bound spend cannot refund reservation',async()=>{for(const patch of [{usage:{inputTokens:1000}},{usdMicros:2999},{nativeMicros:7001,usdMicros:7001},{usage:null}]){const f=fixture(),r=request();await sent(f,r);const before=f.rows();await assert.rejects(f.make().settle(r,evidence(r,patch)));assert.deepEqual(f.rows(),before);}});
test('UNKNOWN retains occupation across windows and later verified final evidence can settle',async()=>{const f=fixture(),r=request();await sent(f,r);const u=evidence(r,{outcome:'UNKNOWN',usage:null,nativeMicros:null,usdMicros:null});const out=await f.make().settle(r,u);assert.equal(out.state,'OUTCOME_UNKNOWN');assert.equal(out.reservationMicros,7000);f.setNow(100000+31*86400000);assert.equal((await f.make().settle(r,u)).state,'OUTCOME_UNKNOWN');assert.equal((await f.make().settle(r,evidence(r,{receiptId:'final'}))).settledSpendMicros,3000);});
test('identical concurrent/restarted settlement is idempotent; conflicting receipt is refused',async()=>{const f=fixture(),r=request();await sent(f,r);const e=evidence(r);const [a,b]=await Promise.all([f.make().settle(r,e),f.make().settle(r,e)]);assert.deepEqual(a,b);assert.deepEqual(await f.make().settle(r,e),a);await assert.rejects(f.make().settle(r,evidence(r,{receiptId:'different'})));assert.equal(f.rows().length,1);});
test('receipt cannot be reused across operations; metadata rejects body fields',async()=>{const f=fixture(),a=request('a'),b=request('b');await sent(f,a);await sent(f,b);await f.make().settle(a,evidence(a));await assert.rejects(f.make().settle(b,evidence(b,{receiptId:'receipt-a'})));await assert.rejects(f.make().settle(b,{...evidence(b),body:'private'}));});
test('settlement rollback preserves previous occupancy and clock',async()=>{const f=fixture(),r=request();await sent(f,r);const before=f.rows();f.setNow(100001);f.abort();await assert.rejects(f.make().settle(r,evidence(r)),/SYNTHETIC_ABORT/);assert.deepEqual(f.rows(),before);f.setNow(100000);await f.make().settle(r,evidence(r));});
test('full result evidence binds every planned child and receipt; partial output cannot charge result',async()=>{const f=fixture();f.controls.global={dayLimitMicros:100000,monthLimitMicros:100000};const a=request('a',{childCount:2}),b={...a,operationId:'b',childIndex:1};await sent(f,a);await f.make().settle(a,evidence(a,{outcome:'VALIDATED'}));await sent(f,b);const bound=[{operationId:'a',receiptId:'receipt-a'},{operationId:'b',receiptId:'receipt-b'}];for(const children of [[],bound.slice(1),[...bound,{operationId:'alien',receiptId:'alien'}]])await assert.rejects(f.make().settle(b,evidence(b,{outcome:'COMMITTED',committedChildren:children})));const out=await f.make().settle(b,evidence(b,{outcome:'COMMITTED',committedChildren:bound}));assert.equal(out.effectiveResults,1);assert.equal((await f.make().settle(b,evidence(b,{outcome:'COMMITTED',committedChildren:bound}))).effectiveResults,1);});
test('a failed child cannot become a whole committed result and settlement before dispatch is refused',async()=>{const f=fixture(),r=request();await f.make().reserve(r);await assert.rejects(f.make().settle(r,evidence(r)));await f.make().record(r,'CANCELLED_BEFORE_DISPATCH');await assert.rejects(f.make().settle(r,evidence(r)));});
test('failure frees only effective-result slot while billed spend still blocks a new reservation',async()=>{const f=fixture();f.controls.global={dayLimitMicros:100000,monthLimitMicros:100000};for(let i=0;i<4;i++){const r=request('failed'+i);await sent(f,r);await f.make().settle(r,evidence(r));}assert.equal(f.rows().length,4);f.controls.global={dayLimitMicros:18000,monthLimitMicros:18000};await assert.rejects(f.make().reserve(request('blocked')),/BUDGET_OR_QUOTA/);});
test('complete committed results remain charged after reconstruction and reject conflicting settled receipt pricing',async()=>{const f=fixture();f.controls.global={dayLimitMicros:100000,monthLimitMicros:100000};for(let i=0;i<3;i++){const r=request('done'+i);await sent(f,r);const e=evidence(r,{outcome:'COMMITTED',committedChildren:[{operationId:r.operationId,receiptId:'receipt-'+r.operationId}]});await f.make().settle(r,e);}await assert.rejects(f.make().reserve(request('four')),/BUDGET_OR_QUOTA/);const r=request('done0');await assert.rejects(f.make().settle(r,evidence(r,{pricingVersion:'different'})),/SETTLEMENT_CONFLICT/);});
test('failed sibling cannot be hidden behind a claimed complete result',async()=>{const f=fixture();f.controls.global={dayLimitMicros:100000,monthLimitMicros:100000};const a=request('a',{childCount:2}),b={...a,operationId:'b',childIndex:1};await sent(f,a);await f.make().settle(a,evidence(a));await sent(f,b);await assert.rejects(f.make().settle(b,evidence(b,{outcome:'COMMITTED',committedChildren:[{operationId:'a',receiptId:'receipt-a'},{operationId:'b',receiptId:'receipt-b'}]})),/RESULT_SCOPE_INCOMPLETE/);assert.equal(f.rows()[1].state,'DISPATCHED');});
test('caller mutation during asynchronous settlement attestation cannot change the receipt',async()=>{const f=fixture(),r=request();await sent(f,r);let release,enter;const entered=new Promise(resolve=>enter=resolve);const owner=f.make(async(request,evidence)=>{enter();await new Promise(resolve=>release=resolve);return {verifiedSettlementFacts:true,request,evidence};});const e=evidence(r),pending=owner.settle(r,e);await entered;e.usdMicros=0;e.usage.inputTokens=0;release();assert.equal((await pending).settledSpendMicros,3000);});
test('a billed failed child plus pre-dispatch cancelled sibling releases only result occupation',async()=>{
 const f=fixture();f.controls.global={dayLimitMicros:1000000,monthLimitMicros:1000000};
 for(let job=0;job<3;job++){
  const a=request('failed-'+job,{childCount:2}),b={...a,operationId:'cancel-'+job,childIndex:1};
  await f.make().reserve(a);await f.make().reserve(b);await f.make().record(b,'CANCELLED_BEFORE_DISPATCH');
  await f.make().record(a,'DISPATCHED');await f.make().settle(a,evidence(a));
 }
 // Three failed jobs must not exhaust the Free three-effective-result quota.
 const next=await f.make().reserve(request('next'));assert.equal(next.state,'RESERVED');
 assert.equal(f.rows().filter(r=>r.state==='CANCELLED_BEFORE_DISPATCH').length,3);
 // Retain 3 x 3000 billed spend plus next's 7000; cancelled siblings cost zero.
 f.controls.global={dayLimitMicros:22999,monthLimitMicros:22999};
 await assert.rejects(f.make().reserve(request('over-budget')),/BUDGET_OR_QUOTA/);
});
test('unknown with cancelled sibling and validated-only jobs retain provisional slots without effective results',async()=>{
 for(const outcome of ['UNKNOWN','VALIDATED']){
  const f=fixture();f.controls.global={dayLimitMicros:1000000,monthLimitMicros:1000000};
  for(let job=0;job<3;job++){
   const a=request(outcome+job,{childCount:outcome==='UNKNOWN'?2:1});
   await f.make().reserve(a);
   if(outcome==='UNKNOWN'){const b={...a,operationId:'cancel'+job,childIndex:1};await f.make().reserve(b);await f.make().record(b,'CANCELLED_BEFORE_DISPATCH');}
   await f.make().record(a,'DISPATCHED');
   const answer=await f.make().settle(a,evidence(a,outcome==='UNKNOWN'?{outcome,usage:null,nativeMicros:null,usdMicros:null}:{outcome}));
   assert.equal(answer.effectiveResults??0,0);assert.equal(answer.dispatchAllowed,false);
  }
  await assert.rejects(f.make().reserve(request('fourth')),/BUDGET_OR_QUOTA/);
 }
});
// Mutable service facts exercise first settlement after authority's current
// tariff changes; admission and settlement still use the actual service class.
function pricingService(f,current){return new FixtureAtomicReservation({transact:f.transact,clock:f.clock,verify:async(request,now)=>{
 const facts=await f.verify(request,now),route={...facts.route,currency:current.currency,pricingVersion:current.version};
 return {...facts,route,book:{...facts.book,route,rates:Object.fromEntries(Object.keys(facts.book.rates).map(k=>[k,current.rate])),...(current.expired?{expiresAt:now-1}:{})},fx:current.fx};
},verifySettlement:async(request,evidence)=>({verifiedSettlementFacts:true,request,evidence})});}
for(const expired of [false,true])test('first CNY settlement uses reserved tariff and FX after current facts change'+(expired?' and expire':''),async()=>{
 const f=fixture(),r=request(),current={currency:'CNY',version:'cny-original',rate:1000000,fx:{version:'fx-original',verified:true,observedAt:100000,expiresAt:101000,source:'SYNTHETIC FX',cnyMicrosPerUsd:7000000,reservationCnyMicrosPerUsd:6000000}};
 const owner=pricingService(f,current);assert.equal((await owner.reserve(r)).reservationMicros,1167);await owner.record(r,'DISPATCHED');
 f.setNow(102000);current.version='cny-new';current.rate=9000000;current.expired=expired;current.fx={...current.fx,version:'fx-new',observedAt:102000,expiresAt:expired?101999:103000,cnyMicrosPerUsd:9000000,reservationCnyMicrosPerUsd:8000000};
 const before=f.rows();assert.equal(before[0].pricing.book.expiresAt,101000);
 const receipt=evidence(r,{pricingVersion:'cny-original',fxVersion:'fx-original',nativeCurrency:'CNY',usdMicros:429});
 for(const patch of [{fxVersion:'fx-new'},{usdMicros:1168},{usdMicros:501}]){await assert.rejects(owner.settle(r,{...receipt,...patch}));assert.deepEqual(f.rows(),before,'rejected FX/over-bound evidence preserves the dispatched hold');}
 const result=await owner.settle(r,receipt);assert.equal(result.settledSpendMicros,429);assert.equal(result.dispatchAllowed,false);assert.equal(f.rows()[0].settlement.nativeMicros,3000);assert.equal(f.rows()[0].settlement.fxVersion,'fx-original');
});
test('USD settlement never applies an available CNY FX conversion',async()=>{
 const f=fixture(),r=request(),current={currency:'USD',version:'usd-original',rate:1000000,fx:{version:'irrelevant',verified:true,observedAt:100000,expiresAt:101000,source:'SYNTHETIC FX',cnyMicrosPerUsd:7000000,reservationCnyMicrosPerUsd:6000000}};
 const owner=pricingService(f,current);assert.equal((await owner.reserve(r)).reservationMicros,7000);await owner.record(r,'DISPATCHED');const before=f.rows();
 await assert.rejects(owner.settle(r,evidence(r,{pricingVersion:'usd-original',usdMicros:429})),/SETTLEMENT_COST_MISMATCH/);assert.deepEqual(f.rows(),before);
 assert.equal((await owner.settle(r,evidence(r,{pricingVersion:'usd-original'}))).settledSpendMicros,3000);assert.equal(f.rows()[0].settlement.fxVersion,null);
});
test('settlement verifier cannot substitute different evidence even when request binding matches',async()=>{
 const f=fixture(),r=request();await sent(f,r);const before=f.rows();
 const owner=f.make(async(request,evidence)=>({verifiedSettlementFacts:true,request,evidence:{...evidence,receiptId:'substituted'}}));
 await assert.rejects(owner.settle(r,evidence(r)),/UNQUALIFIED_SETTLEMENT/);assert.deepEqual(f.rows(),before);
});
