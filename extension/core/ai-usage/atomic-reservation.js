import {equal,exact,fail,integer,opaque} from './contracts.js';
import {evaluateAdmission,ENVELOPES} from './admission-policy.js';
import {quoteRequestBound} from './ratebook.js';

// Fixture-backed trusted-service contract, NOT an extension financial authority.
// transact must serialize all principals against ONE durable budget snapshot and
// atomically commit or roll back get/put. No production adapter/dispatch is wired.
// The bounded snapshot is a test integration seam for existing usage ownership,
// not a new per-feature store. Settled spend/rolling expiry is deliberately absent:
// every unresolved reservation counts in both windows, however old it becomes.
const KEY='aiu:budget-reservations:v1',LIMIT=10000;
const fields=['operationId','jobId','principalId','libraryId','scopeFingerprint','contractVersion','routeVersion','consentEpoch','jobType','childIndex','childCount','inputTokens','outputCap','maxCompletionTokens'];
const binding=r=>Object.fromEntries(['jobId','principalId','libraryId','scopeFingerprint','contractVersion','routeVersion','consentEpoch','jobType','childCount'].map(k=>[k,r[k]]));
const active=r=>r.state!=='CANCELLED_BEFORE_DISPATCH';
const sum=(rows,key)=>rows.reduce((n,r)=>{const next=n+r[key];if(!integer(next))fail('COST_OVERFLOW');return next;},0);
const result=r=>({operationId:r.request.operationId,state:r.state,reservationMicros:r.reservationMicros,dispatchAllowed:false});
function validateRequest(r){
 exact(r,fields);
 if(!fields.filter(k=>!['childIndex','childCount','inputTokens','outputCap','maxCompletionTokens'].includes(k)).every(k=>opaque(r[k]))||!Object.hasOwn(ENVELOPES,r.jobType)||!['childIndex','childCount','inputTokens','outputCap','maxCompletionTokens'].every(k=>integer(r[k]))||r.childCount<1||r.childIndex>=r.childCount)fail();
}
export class FixtureAtomicReservation {
 constructor({transact,verify,clock}={}){this.transact=transact;this.verify=verify;this.clock=clock;}
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
  const money=rs=>sum(rs,'reservationMicros');
  const usage={results:new Set(feature.map(x=>x.request.jobId)).size,attempts:feature.length,inputTokens:feature.reduce((n,x)=>{const v=n+x.request.inputTokens;if(!integer(v))fail('COST_OVERFLOW');return v;},0),outputTokens:feature.reduce((n,x)=>{const v=n+x.request.outputCap;if(!integer(v))fail('COST_OVERFLOW');return v;},0),featureDayMicros:money(feature),featureMonthMicros:money(feature),userDayMicros:money(user),userMonthMicros:money(user)};
  const admission=evaluateAdmission({...facts,...r,intent:'remote',attemptState:'PLANNED',ownsResultReservation:siblings.some(active),reservationMicros:quote.usdReservationMicros,usage,global:{dayLimitMicros:facts.global?.dayLimitMicros,monthLimitMicros:facts.global?.monthLimitMicros,dayUsedMicros:money(rows),monthUsedMicros:money(rows)}});
  if(admission.decision!=='eligible_for_atomic_reservation')fail(admission.reason);
  const row={request:r,state:'RESERVED',reservedAt:now,reservationMicros:quote.usdReservationMicros,quote:structuredClone(quote)};state.rows.push(row);return result(row);
 });}
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
