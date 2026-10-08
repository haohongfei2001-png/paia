import {equal,exact,fail,integer,opaque} from './contracts.js';
import {evaluateAdmission,ENVELOPES} from './admission-policy.js';
import {quoteRequestBound,quoteUsage} from './ratebook.js';
import {normalizeUsage} from './usage-normalization.js';

// Fixture-backed trusted-service contract, NOT an extension financial authority.
// transact must serialize all principals against ONE durable budget snapshot and
// atomically commit or roll back get/put. No production adapter/dispatch is wired.
// The bounded snapshot is a test integration seam for existing usage ownership,
// not a new per-feature store. Rolling expiry is deliberately absent:
// every unresolved reservation counts in both windows, however old it becomes.
const KEY='aiu:budget-reservations:v1',LIMIT=10000;
const fields=['operationId','jobId','principalId','libraryId','scopeFingerprint','contractVersion','routeVersion','consentEpoch','jobType','childIndex','childCount','inputTokens','outputCap','maxCompletionTokens'];
const binding=r=>Object.fromEntries(['jobId','principalId','libraryId','scopeFingerprint','contractVersion','routeVersion','consentEpoch','jobType','childCount'].map(k=>[k,r[k]]));
const active=r=>r.state!=='CANCELLED_BEFORE_DISPATCH';
const sum=(rows,key)=>rows.reduce((n,r)=>{const next=n+r[key];if(!integer(next))fail('COST_OVERFLOW');return next;},0);
const occupied=r=>r.state==='SETTLED'?r.settlement.usdMicros:r.reservationMicros;
const quotaJob=rows=>rows.some(r=>r.resultCommitted)||rows.length<rows[0].request.childCount||rows.some(r=>!['SETTLED','CANCELLED_BEFORE_DISPATCH'].includes(r.state))||rows.some(r=>r.state==='SETTLED')&&!rows.some(r=>r.settlement?.outcome==='FAILED');
const result=r=>({operationId:r.request.operationId,state:r.state,reservationMicros:r.reservationMicros,dispatchAllowed:false});
function validateRequest(r){
 exact(r,fields);
 if(!fields.filter(k=>!['childIndex','childCount','inputTokens','outputCap','maxCompletionTokens'].includes(k)).every(k=>opaque(r[k]))||!Object.hasOwn(ENVELOPES,r.jobType)||!['childIndex','childCount','inputTokens','outputCap','maxCompletionTokens'].every(k=>integer(r[k]))||r.childCount<1||r.childIndex>=r.childCount)fail();
}
export class FixtureAtomicReservation {
 constructor({transact,verify,verifySettlement,clock}={}){this.transact=transact;this.verify=verify;this.verifySettlement=verifySettlement;this.clock=clock;}
 async transaction(request,action){
  validateRequest(request);const r=structuredClone(request);
  if(typeof this.transact!=='function'||typeof this.verify!=='function'||typeof this.clock!=='function')fail('UNAVAILABLE');
  return this.transact(async t=>{
   const now=this.clock();if(!integer(now))fail('UNTRUSTED_CLOCK');
   const state=await t.get(KEY)||{version:1,lastNow:0,rows:[]};
   if(state.version!==1||!integer(state.lastNow)||!Array.isArray(state.rows)||state.rows.length>LIMIT)fail('BUDGET_STATE_INVALID');
   if(now<state.lastNow)fail('CLOCK_ROLLBACK');
   // Verification is injected by the trusted service, never accepted from the
   // request. It must bind current authority to this exact immutable request.
   const facts=await this.verify(structuredClone(r),now);
   if(facts?.authorized!==true||facts.verifiedServiceFacts!==true||!equal(facts.request,r))fail('UNQUALIFIED_FACTS');
   const answer=await action(state,r,facts,now);state.lastNow=now;
   await t.put(KEY,state);return answer;
  });
 }
 async reserve(request){return this.transaction(request,async(state,r,facts,now)=>{
  const prior=state.rows.find(x=>x.request.operationId===r.operationId);
  if(prior){if(!equal(prior.request,r))fail('OPERATION_REBOUND');return result(prior);}
  const siblings=state.rows.filter(x=>x.request.jobId===r.jobId);
  if(siblings.some(x=>!equal(binding(x.request),binding(r))))fail('JOB_REBOUND');
  if(siblings.some(x=>x.request.childIndex===r.childIndex))fail('CHILD_ALREADY_RESERVED');
  if(siblings.some(x=>['DISPATCHED','OUTCOME_UNKNOWN'].includes(x.state)))fail('OUTCOME_OR_ATTEMPT_PENDING');
  if(state.rows.length>=LIMIT)fail('BUDGET_CAPACITY');
  const quote=quoteRequestBound({book:facts.book,route:facts.route,fx:facts.fx,now,inputTokens:r.inputTokens,billableOutputCap:r.outputCap});
  const rows=state.rows.filter(active),user=rows.filter(x=>x.request.principalId===r.principalId),feature=user.filter(x=>x.request.jobType===r.jobType);
  // Result terminality needs cancelled siblings too; financial/attempt usage
  // above excludes them because they never dispatched.
  const resultRows=state.rows.filter(x=>x.request.principalId===r.principalId&&x.request.jobType===r.jobType);
  const money=rs=>sum(rs.map(r=>({amount:occupied(r)})),'amount');
  const usage={results:[...new Set(resultRows.map(x=>x.request.jobId))].filter(id=>quotaJob(resultRows.filter(x=>x.request.jobId===id))).length,attempts:feature.length,inputTokens:feature.reduce((n,x)=>{const v=n+x.request.inputTokens;if(!integer(v))fail('COST_OVERFLOW');return v;},0),outputTokens:feature.reduce((n,x)=>{const v=n+x.request.outputCap;if(!integer(v))fail('COST_OVERFLOW');return v;},0),featureDayMicros:money(feature),featureMonthMicros:money(feature),userDayMicros:money(user),userMonthMicros:money(user)};
  const admission=evaluateAdmission({...facts,...r,intent:'remote',attemptState:'PLANNED',ownsResultReservation:siblings.some(active),reservationMicros:quote.usdReservationMicros,usage,global:{dayLimitMicros:facts.global?.dayLimitMicros,monthLimitMicros:facts.global?.monthLimitMicros,dayUsedMicros:money(rows),monthUsedMicros:money(rows)}});
  if(admission.decision!=='eligible_for_atomic_reservation')fail(admission.reason);
  const row={request:r,state:'RESERVED',reservedAt:now,reservationMicros:quote.usdReservationMicros,quote:structuredClone(quote),pricing:structuredClone({book:facts.book,route:facts.route,fx:facts.fx,now})};state.rows.push(row);return result(row);
 });}
 // Verified metadata only: no model response body, provider request or retry.
 async settle(request,evidence){
  exact(evidence,['receiptId','operationId','outcome','usage','pricingVersion','fxVersion','nativeCurrency','nativeMicros','usdMicros','committedChildren']);
  if(!opaque(evidence.receiptId)||!opaque(evidence.operationId)||!['UNKNOWN','FAILED','VALIDATED','COMMITTED'].includes(evidence.outcome)||!Array.isArray(evidence.committedChildren)||evidence.committedChildren.length>4)fail('SETTLEMENT_INVALID');
  const e=structuredClone(evidence);
  return this.transaction(request,async(state,r,_facts,now)=>{
   const row=state.rows.find(x=>x.request.operationId===r.operationId);
   if(!row||!equal(row.request,r)||e.operationId!==r.operationId)fail('OPERATION_REBOUND');
   if(typeof this.verifySettlement!=='function')fail('UNQUALIFIED_SETTLEMENT');
   const proof=await this.verifySettlement(structuredClone(r),structuredClone(e),now);
   if(proof?.verifiedSettlementFacts!==true||!equal(proof.request,r)||!equal(proof.evidence,e))fail('UNQUALIFIED_SETTLEMENT');
   if(state.rows.some(x=>x!==row&&[x.settlement?.receiptId,x.unknownReceipt?.receiptId].includes(e.receiptId)))fail('RECEIPT_REBOUND');
   if(row.state==='SETTLED'){if(!equal(row.settlement,e))fail('SETTLEMENT_CONFLICT');return {...result(row),settledSpendMicros:e.usdMicros,effectiveResults:row.resultCommitted?1:0};}
   if(!['DISPATCHED','OUTCOME_UNKNOWN'].includes(row.state))fail('SETTLEMENT_STATE');
   if(e.pricingVersion!==row.quote.pricingVersion||e.fxVersion!==row.quote.fxVersion||e.nativeCurrency!==row.quote.nativeCurrency)fail('SETTLEMENT_PRICING');
   if(e.outcome==='UNKNOWN'){
    if(e.usage!==null||e.nativeMicros!==null||e.usdMicros!==null||e.committedChildren.length)fail('SETTLEMENT_INVALID');
    if(row.unknownReceipt&&!equal(row.unknownReceipt,e))fail('SETTLEMENT_CONFLICT');
    row.unknownReceipt=e;row.state='OUTCOME_UNKNOWN';return result(row);
   }
   const normalized=normalizeUsage(e.usage);if(normalized.state!=='known')fail('USAGE_INVALID');
   if(e.usage.inputTokens>r.inputTokens||e.usage.completionTokens>r.outputCap)fail('SETTLEMENT_OVER_BOUND');
   if(!row.pricing)fail('SETTLEMENT_PRICING');
   const expected=quoteUsage({...row.pricing,usage:normalized.billable});
   if(!integer(e.nativeMicros)||!integer(e.usdMicros)||e.nativeMicros>row.quote.nativeMicros||e.usdMicros>row.reservationMicros)fail('SETTLEMENT_OVER_BOUND');
   // USD is exact tariff arithmetic. Non-USD actual billed conversion requires
   // verifier evidence and cannot exceed the original conservative FX quote.
   if(e.nativeMicros!==expected.nativeMicros||e.usdMicros>expected.usdReservationMicros||e.nativeCurrency==='USD'&&e.usdMicros!==e.nativeMicros)fail('SETTLEMENT_COST_MISMATCH');
   const siblings=state.rows.filter(x=>x.request.jobId===r.jobId);
   if(e.outcome==='COMMITTED'){
    const expectedChildren=siblings.map(x=>({operationId:x.request.operationId,receiptId:x===row?e.receiptId:x.settlement?.receiptId})).sort((a,b)=>a.operationId.localeCompare(b.operationId));
    for(const child of e.committedChildren){exact(child,['operationId','receiptId']);if(!opaque(child.operationId)||!opaque(child.receiptId))fail('RESULT_SCOPE_INCOMPLETE');}
    if(siblings.length!==r.childCount||siblings.some(x=>x!==row&&(x.state!=='SETTLED'||x.settlement.outcome!=='VALIDATED'))||!equal([...e.committedChildren].sort((a,b)=>a.operationId.localeCompare(b.operationId)),expectedChildren))fail('RESULT_SCOPE_INCOMPLETE');
    row.resultCommitted=true;
   }else if(e.committedChildren.length)fail('RESULT_SCOPE_INCOMPLETE');
   row.settlement=e;row.state='SETTLED';return {...result(row),settledSpendMicros:e.usdMicros,effectiveResults:row.resultCommitted?1:0};
  });
 }
 // Record only simulated lifecycle facts. This method does not send requests,
 // authorize a provider or expose a production command.
 async record(request,event){
  if(!['DISPATCHED','OUTCOME_UNKNOWN','CANCELLED_BEFORE_DISPATCH'].includes(event))fail();
  return this.transaction(request,async(state,r)=>{
   const row=state.rows.find(x=>x.request.operationId===r.operationId);
   if(!row||!equal(row.request,r))fail('OPERATION_REBOUND');
   if(row.state===event)return result(row);
   if(event==='DISPATCHED'&&state.rows.some(x=>x!==row&&x.request.jobId===r.jobId&&['DISPATCHED','OUTCOME_UNKNOWN'].includes(x.state)))fail('OUTCOME_OR_ATTEMPT_PENDING');
   const allowed=row.state==='RESERVED'?['DISPATCHED','CANCELLED_BEFORE_DISPATCH']:row.state==='DISPATCHED'?['OUTCOME_UNKNOWN']:[];
   if(!allowed.includes(event))fail('OUTCOME_OR_ATTEMPT_PENDING');
   row.state=event;return result(row);
  });
 }
}
