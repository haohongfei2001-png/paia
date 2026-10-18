import test from 'node:test';
import assert from 'node:assert/strict';
import {BudgetWindowReservation} from '../core/ai-usage/budget-window-reservation.js';
import {ROUTE_FIELDS} from '../core/ai-usage/ratebook.js';
const DAY=86400000,KEY='aiu:budget-reservations:v1';
const request=(id='one',patch={})=>({operationId:id,jobId:'job-'+id,principalId:'principal',libraryId:'library',scopeFingerprint:'scope',contractVersion:'contract',routeVersion:'route',consentEpoch:'consent',jobType:'AI_ORGANIZE',childIndex:0,childCount:1,inputTokens:1000,outputCap:6000,maxCompletionTokens:5990,...patch});
// Original owner with a serializable synthetic adapter; no service/domain proof.
function fixture(){
 let data=new Map(),tail=Promise.resolve(),now=Date.UTC(2026,0,1),abort=false,lost=false;
 const route=Object.fromEntries(ROUTE_FIELDS.map(k=>[k,'SYNTHETIC_'+k]));route.currency='USD';
 const controls={authorized:true,verifiedServiceFacts:true,tier:'free',timeZone:'UTC',routeQualified:true,thinkingBoundQualified:true,inputBoundQualified:true,global:{dayLimitMicros:1000000,monthLimitMicros:1000000}};
 const service={clock:()=>now,transact(fn){const run=tail.then(async()=>{const pending=structuredClone(data),answer=await fn({get:async k=>structuredClone(pending.get(k)),put:async(k,v)=>pending.set(k,structuredClone(v))});if(abort){abort=false;throw Error('SYNTHETIC_ROLLBACK');}data=pending;if(lost){lost=false;throw Error('SYNTHETIC_COMMIT_UNKNOWN');}return answer;});tail=run.catch(()=>{});return run;},verifyRequest:async(request,time)=>({...structuredClone(controls),request,route,book:{route,rates:{standardInput:1000000,cachedReadInput:1000000,cacheCreateInput:1000000,completion:1000000},effectiveAt:0,verifiedAt:time,expiresAt:time+1000,source:'SYNTHETIC tariff',verified:true,inputBand:{minInclusive:0,maxInclusive:16000}}}),verifySettlement:async(request,evidence)=>({verifiedSettlementFacts:true,request,evidence}),verifyResult:async(request,evidence)=>({verifiedResultFacts:true,request,evidence})};
 return {service,controls,make:()=>new BudgetWindowReservation({service}),advance:n=>now+=n,setNow:n=>now=n,now:()=>now,rows:()=>structuredClone(data.get(KEY)?.rows??[]),mutate:fn=>fn(data.get(KEY)),abort:()=>abort=true,loseAck:()=>lost=true};
}
const spend=(r,outcome='VALIDATED')=>({receiptId:'usage-'+r.operationId,operationId:r.operationId,outcome,usage:{inputTokens:1000,completionTokens:1000,totalTokens:2000,reasoningTokens:0,cachedReadTokens:0,cacheCreateTokens:0},pricingVersion:'SYNTHETIC_pricingVersion',fxVersion:null,nativeCurrency:'USD',nativeMicros:2000,usdMicros:2000,committedChildren:[]});
async function paid(f,r,outcome='VALIDATED'){await f.make().reserve(r);await f.make().record(r,'DISPATCHED');await f.make().settle(r,spend(r,outcome));}
const result=(r,outcome='COMMITTED',children=[{operationId:r.operationId,receiptId:'usage-'+r.operationId}])=>({receiptId:'result-'+r.jobId,jobId:r.jobId,outcome,children});

test('actual domain result can finalize already settled spend without rewriting its receipt',async()=>{
 const f=fixture(),r=request();await paid(f,r);const before=f.rows()[0];f.advance(2*DAY);
 const out=await f.make().finalizeResult(r,result(r));assert.equal(out.effectiveResults,1);assert.equal(out.state,'SETTLED');assert.equal(out.financialAuthority,false);assert.equal(out.dispatchAllowed,false);
 const after=f.rows()[0];assert.deepEqual(after.settlement,before.settlement);assert.deepEqual(after.pricing,before.pricing);assert.equal(after.settledAt,before.settledAt);assert.equal(after.resultCommittedAt,f.now());
});
test('genuine failed domain result releases provisional result slots without refunding spend',async()=>{
 const f=fixture();for(let i=0;i<3;i++)await paid(f,request('p'+i));await assert.rejects(f.make().reserve(request('blocked')),/BUDGET_OR_QUOTA/);
 await f.make().finalizeResult(request('p0'),result(request('p0'),'FAILED'));await f.make().reserve(request('next'));
 assert.equal(f.rows()[0].settlement.usdMicros,2000);assert.equal(f.rows()[0].settlement.outcome,'VALIDATED');assert.notEqual(f.rows()[0].resultCommitted,true);
});

test('schema success and a missing, false or substituted domain verifier cannot finalize',async()=>{
 for(const verifyResult of [undefined,async()=>({verifiedResultFacts:false}),async(request,evidence)=>({verifiedResultFacts:true,request:{...request,libraryId:'other'},evidence}),async(request,evidence)=>({verifiedResultFacts:true,request,evidence:{...evidence,outcome:'FAILED'}})]){
  const f=fixture(),r=request();await paid(f,r);f.service.verifyResult=verifyResult;const before=f.rows();await assert.rejects(f.make().finalizeResult(r,result(r)),/UNQUALIFIED_RESULT/);assert.deepEqual(f.rows(),before);
 }
});
test('current request authority and monotonic time still constrain result finalization',async()=>{
 for(const setup of [f=>f.controls.authorized=false,f=>f.controls.verifiedServiceFacts=false,f=>f.setNow(f.now()-1)]){
  const f=fixture(),r=request();await paid(f,r);const before=f.rows();setup(f);await assert.rejects(f.make().finalizeResult(r,result(r)));assert.deepEqual(f.rows(),before);
 }
});
test('concurrent instances and reconstructed owner finalize once without refreshing completion time',async()=>{
 const f=fixture(),r=request();await paid(f,r);const e=result(r);const [a,b]=await Promise.all([f.make().finalizeResult(r,e),f.make().finalizeResult(r,e)]);assert.deepEqual(a,b);const before=f.rows();f.advance(DAY);assert.deepEqual(await f.make().finalizeResult(r,e),a);assert.deepEqual(f.rows(),before);
 await assert.rejects(f.make().finalizeResult(r,{...e,outcome:'FAILED'}),/RESULT_CONFLICT/);await assert.rejects(f.make().finalizeResult(r,{...e,receiptId:'new'}),/RESULT_CONFLICT/);
});
test('rollback and lost commit ACK never mutate paid usage or mint a new result',async()=>{
 const f=fixture(),r=request();await paid(f,r);const before=f.rows();f.abort();await assert.rejects(f.make().finalizeResult(r,result(r)),/SYNTHETIC_ROLLBACK/);assert.deepEqual(f.rows(),before);
 f.loseAck();await assert.rejects(f.make().finalizeResult(r,result(r)),/SYNTHETIC_COMMIT_UNKNOWN/);const after=f.rows();assert.equal(after[0].resultCommitted,true);assert.deepEqual(after[0].settlement,before[0].settlement);await f.make().finalizeResult(r,result(r));assert.deepEqual(f.rows(),after);
});
test('two children require exact paid receipt set and finalize only one logical result',async()=>{
 const f=fixture(),a=request('a',{childCount:2}),b={...a,operationId:'b',childIndex:1};await paid(f,a);await paid(f,b);const children=[{operationId:'a',receiptId:'usage-a'},{operationId:'b',receiptId:'usage-b'}];
 for(const c of [children.slice(0,1),[...children,{operationId:'alien',receiptId:'usage-alien'}],[children[0],children[0]],[children[0],{...children[1],receiptId:'other'}]])await assert.rejects(f.make().finalizeResult(a,result(a,'COMMITTED',c)));
 await assert.rejects(f.make().finalizeResult(b,result(b,'COMMITTED',children)),/RESULT_SCOPE_INCOMPLETE/);
 const before=f.rows().map(row=>row.settlement);await f.make().finalizeResult(a,result(a,'COMMITTED',children.reverse()));assert.equal(f.rows().filter(row=>row.resultCommitted).length,1);assert.deepEqual(f.rows().map(row=>row.settlement),before);
});
for(const state of ['missing','RESERVED','DISPATCHED','OUTCOME_UNKNOWN','FAILED','CANCELLED_BEFORE_DISPATCH'])test('COMMITTED refuses incomplete child '+state,async()=>{
 const f=fixture(),a=request('a',{childCount:2}),b={...a,operationId:'b',childIndex:1};await paid(f,a);
 if(state!=='missing'){await f.make().reserve(b);if(state==='CANCELLED_BEFORE_DISPATCH')await f.make().record(b,state);else if(state!=='RESERVED'){await f.make().record(b,'DISPATCHED');if(state==='OUTCOME_UNKNOWN')await f.make().record(b,state);if(state==='FAILED')await f.make().settle(b,spend(b,'FAILED'));}}
 const before=f.rows();await assert.rejects(f.make().finalizeResult(a,result(a,'COMMITTED',[{operationId:'a',receiptId:'usage-a'},{operationId:'b',receiptId:state==='CANCELLED_BEFORE_DISPATCH'?null:'usage-b'}])),/RESULT_SCOPE_INCOMPLETE/);assert.deepEqual(f.rows(),before);
});
test('terminal FAILED can close unused children but prevents later sibling reservation',async()=>{
 const f=fixture(),a=request('a',{childCount:2}),b={...a,operationId:'b',childIndex:1};await paid(f,a);await f.make().finalizeResult(a,result(a,'FAILED'));const before=f.rows();await assert.rejects(f.make().reserve(b),/RESULT_TERMINAL/);assert.deepEqual(f.rows(),before);assert.equal((await f.make().reserve(a)).state,'SETTLED');
});
test('FAILED accepts an exact cancelled sibling but never abandons an unknown spend',async()=>{
 const f=fixture(),a=request('a',{childCount:2}),b={...a,operationId:'b',childIndex:1};await paid(f,a);await f.make().reserve(b);const children=[{operationId:'a',receiptId:'usage-a'},{operationId:'b',receiptId:null}];
 await assert.rejects(f.make().finalizeResult(a,result(a,'FAILED',children)),/RESULT_SCOPE_INCOMPLETE/);await f.make().record(b,'CANCELLED_BEFORE_DISPATCH');assert.equal((await f.make().finalizeResult(a,result(a,'FAILED',children))).effectiveResults,0);
});
test('result receipts cannot alias any usage or result receipt, and later usage cannot alias a result',async()=>{
 const f=fixture(),a=request('a'),b=request('b');await paid(f,a);await paid(f,b);await assert.rejects(f.make().finalizeResult(a,{...result(a),receiptId:'usage-a'}),/RECEIPT_REBOUND/);await f.make().finalizeResult(a,result(a));await assert.rejects(f.make().finalizeResult(b,{...result(b),receiptId:result(a).receiptId}),/RECEIPT_REBOUND/);
 const c=request('c');await f.make().reserve(c);await f.make().record(c,'DISPATCHED');await assert.rejects(f.make().settle(c,{...spend(c),receiptId:result(a).receiptId}),/RECEIPT_REBOUND/);assert.equal(f.rows()[2].state,'DISPATCHED');
});
test('delayed completion uses actual result day and preserves rolling-day limit across timezone change',async()=>{
 const f=fixture();for(let i=0;i<3;i++)await paid(f,request('p'+i));f.advance(31*DAY);for(let i=0;i<3;i++)await f.make().finalizeResult(request('p'+i),result(request('p'+i)));
 for(const zone of ['UTC','Pacific/Kiritimati','America/Los_Angeles']){f.controls.timeZone=zone;await assert.rejects(f.make().reserve(request('blocked-'+zone)),/BUDGET_OR_QUOTA/);}
 f.advance(DAY-1);await assert.rejects(f.make().reserve(request('early')),/BUDGET_OR_QUOTA/);f.advance(1);await f.make().reserve(request('later'));
});
test('new result metadata rejects body fields, duplicate children and rebound identity',async()=>{
 const f=fixture(),r=request();await paid(f,r);const before=f.rows();for(const e of [{...result(r),body:'SYNTHETIC'},{...result(r),jobId:'different'},{...result(r),children:[{...result(r).children[0],body:'SYNTHETIC'}]},{...result(r),children:[]}])await assert.rejects(f.make().finalizeResult(r,e));
 for(const patch of [{principalId:'other'},{libraryId:'other'},{consentEpoch:'other'},{childCount:2}])await assert.rejects(f.make().finalizeResult({...r,...patch},result(r)),/OPERATION_REBOUND/);assert.deepEqual(f.rows(),before);
});
test('caller mutation during held proof cannot change immutable captured result',async()=>{
 const f=fixture(),r=request();await paid(f,r);let enter,release;const entered=new Promise(r=>enter=r);f.service.verifyResult=async(request,evidence)=>{enter();await new Promise(r=>release=r);return {verifiedResultFacts:true,request,evidence};};const e=result(r),pending=f.make().finalizeResult(r,e);await entered;e.outcome='FAILED';e.children[0].receiptId='other';release();assert.equal((await pending).resultOutcome,'COMMITTED');
});
for(const mutate of [row=>row.resultResolution.outcome='FAILED',row=>row.resultResolution.children[0].receiptId='other',row=>row.resultResolution.extra='x',row=>row.resultResolvedAt--,row=>row.resultCommittedAt++,row=>delete row.resultCommitted])test('persisted malformed resolution cannot change quota interpretation '+mutate.toString(),async()=>{
 const f=fixture(),r=request();await paid(f,r);await f.make().finalizeResult(r,result(r));f.mutate(state=>mutate(state.rows[0]));await assert.rejects(f.make().reserve(request('next')));
});

test('old immutable financial receipt cannot be promoted or repriced by result finalization',async()=>{
 const f=fixture(),r=request();await paid(f,r);const before=f.rows()[0].settlement;
 await assert.rejects(f.make().settle(r,{...spend(r),outcome:'COMMITTED',committedChildren:[{operationId:r.operationId,receiptId:'usage-'+r.operationId}]}),/SETTLEMENT_CONFLICT/);
 await f.make().finalizeResult(r,result(r));assert.deepEqual(f.rows()[0].settlement,before);await f.make().settle(r,spend(r));
 await assert.rejects(f.make().settle(r,{...spend(r),usdMicros:0}),/SETTLEMENT_CONFLICT/);
});
test('legacy already-COMMITTED whole job remains charged and refuses a second result identity',async()=>{
 const f=fixture(),r=request();await f.make().reserve(r);await f.make().record(r,'DISPATCHED');await f.make().settle(r,{...spend(r,'COMMITTED'),committedChildren:[{operationId:r.operationId,receiptId:'usage-'+r.operationId}]});const before=f.rows();await assert.rejects(f.make().finalizeResult(r,result(r)),/RESULT_SCOPE_INCOMPLETE/);assert.deepEqual(f.rows(),before);await f.make().reserve(request('next'));
});
test('same job with a failed paid child can finalize only FAILED and keeps every charged amount',async()=>{
 const f=fixture(),a=request('a',{childCount:2}),b={...a,operationId:'b',childIndex:1};await paid(f,a);await paid(f,b,'FAILED');const children=[{operationId:'a',receiptId:'usage-a'},{operationId:'b',receiptId:'usage-b'}],before=f.rows().map(row=>row.settlement);
 await assert.rejects(f.make().finalizeResult(a,result(a,'COMMITTED',children)));await f.make().finalizeResult(a,result(a,'FAILED',children));assert.deepEqual(f.rows().map(row=>row.settlement),before);assert.equal(f.rows()[0].resultResolution.outcome,'FAILED');
});
test('FAILED resolution cannot refund actual billed spend or reserved attempts',async()=>{
 const f=fixture(),r=request();await paid(f,r);await f.make().finalizeResult(r,result(r,'FAILED'));f.controls.global={dayLimitMicros:8999,monthLimitMicros:1000000};await assert.rejects(f.make().reserve(request('too-much')),/BUDGET_OR_QUOTA/);assert.equal(f.rows()[0].settlement.usdMicros,2000);
});
test('failed result may close entirely cancelled children without inventing paid usage',async()=>{
 const f=fixture(),a=request('a',{childCount:2}),b={...a,operationId:'b',childIndex:1};for(const r of [a,b]){await f.make().reserve(r);await f.make().record(r,'CANCELLED_BEFORE_DISPATCH');}
 await f.make().finalizeResult(a,result(a,'FAILED',[{operationId:'a',receiptId:null},{operationId:'b',receiptId:null}]));assert.ok(f.rows().every(row=>row.settlement===undefined));await f.make().reserve(request('next'));
});
test('forged second anchor, chronology or child history is rejected before any new reservation',async()=>{
 for(const change of [rows=>rows[1].resultResolution=structuredClone(rows[0].resultResolution),rows=>rows[0].resultResolvedAt=Number.MAX_SAFE_INTEGER,rows=>rows[1].request.principalId='different',rows=>rows[1].request.childIndex=0,rows=>rows[1].state='DISPATCHED']){
  const f=fixture(),a=request('a',{childCount:2}),b={...a,operationId:'b',childIndex:1};await paid(f,a);await paid(f,b);await f.make().finalizeResult(a,result(a,'COMMITTED',[{operationId:'a',receiptId:'usage-a'},{operationId:'b',receiptId:'usage-b'}]));f.mutate(state=>change(state.rows));await assert.rejects(f.make().reserve(request('next')));
 }
});

test('out-of-range stored sibling index is not proof of every planned child',async()=>{
 const f=fixture(),a=request('a',{childCount:2}),b={...a,operationId:'b',childIndex:1};await paid(f,a);await paid(f,b);f.mutate(state=>state.rows[1].request.childIndex=2);await assert.rejects(f.make().finalizeResult(a,result(a,'COMMITTED',[{operationId:'a',receiptId:'usage-a'},{operationId:'b',receiptId:'usage-b'}])),/RESULT_SCOPE_INCOMPLETE/);
});

for(const field of ['resultResolution','resultResolvedAt'])for(const outcome of ['COMMITTED','FAILED'])test('orphan persisted '+field+' after '+outcome+' cannot reopen a terminal job',async()=>{
 const f=fixture(),r=request('a',{childCount:outcome==='FAILED'?2:1});await paid(f,r);await f.make().finalizeResult(r,result(r,outcome));f.mutate(state=>delete state.rows[0][field]);const before=f.rows();await assert.rejects(f.make().reserve(outcome==='FAILED'?{...r,operationId:'b',childIndex:1}:request('next')),/RESULT_HISTORY_INVALID/);assert.deepEqual(f.rows(),before);
});
