import test from 'node:test';
import assert from 'node:assert/strict';
import {createClientOperationStatusTransport,observedClientOperationStatus} from '../core/ai-usage/client-operation-status-transport.js';
import {serviceFixture} from './harness/qwen-client-service-fixture.mjs';
const flags={financialAuthority:false,dispatchAllowed:false,retryAllowed:false};
async function fixture(change=value=>value){
 const f=await serviceFixture('AI_ASSIST'),request=f.input.reservationRequest,bundle={request,principalToken:'synthetic-principal',entitlementToken:'synthetic-entitlement'},calls=[];
 const response={decision:'queried',operationId:request.operationId,jobId:request.jobId,state:'NOT_FOUND',financialOutcome:'UNKNOWN',providerEvidenceRecorded:null,observedAt:150,reservation:null,...flags};
 const transport=createClientOperationStatusTransport({endpoint:'https://synthetic.invalid/api/operation-status',fetch:async req=>{calls.push(await req.json());return change instanceof Function?Response.json(change(structuredClone(response))):new Response(change,{headers:{'content-type':'application/json'}});}});
 return {transport,bundle,calls,response};
}
test('fixed metadata status query keeps NOT_FOUND unknown and observes only its actual transport object',async()=>{
 const f=await fixture(),r=await f.transport.query(f.bundle);assert.equal(r.state,'NOT_FOUND');assert.equal(r.financialOutcome,'UNKNOWN');assert.equal(r.reservation,null);assert.equal(r.retryAllowed,false);
 assert.deepEqual(f.calls,[{action:'query',...f.bundle}]);assert.ok(observedClientOperationStatus(r,f.transport));assert.equal(observedClientOperationStatus(structuredClone(r),f.transport),null);
 assert.equal(observedClientOperationStatus(r,(await fixture()).transport),null);assert.equal(Object.hasOwn(r,'settledSpendMicros'),false);
});
test('status route, credentials and caller authority fields cannot widen the fixed transport',async()=>{
 for(const endpoint of ['http://synthetic.invalid/api/operation-status','https://synthetic.invalid/api/provider','https://user:pass@synthetic.invalid/api/operation-status','https://synthetic.invalid:8443/api/operation-status','https://synthetic.invalid/api/operation-status?retry=true','https://synthetic.invalid/api/operation-status#x'])assert.equal(createClientOperationStatusTransport({endpoint}),null);
 let accessed=0;assert.equal(createClientOperationStatusTransport({get endpoint(){accessed++;return 'https://synthetic.invalid/api/operation-status';}}),null);assert.equal(accessed,0);
 const f=await fixture();for(const extra of [{action:'reserve'},{financialAuthority:true},{payload:{text:'private'}},{tier:'pro'}])assert.equal((await f.transport.query({...f.bundle,...extra})).decision,'outcome_unknown');assert.equal(f.calls.length,0);
});
test('malformed, rebound, duplicate, oversized and unknown financial replies fail closed without retry',async()=>{
 const changes=[r=>({...r,operationId:'other'}),r=>({...r,jobId:'other'}),r=>({...r,retryAllowed:true}),r=>({...r,financialOutcome:'KNOWN'}),r=>({...r,settledSpendMicros:0}),r=>({...r,reservation:{state:'RESERVED'}}),r=>({...r,observedAt:-1})];
 for(const change of changes){const f=await fixture(change);assert.equal((await f.transport.query(f.bundle)).decision,'outcome_unknown');assert.equal(f.calls.length,1);}
 for(const text of ['{"decision":"queried","decision":"queried"}','x'.repeat(24577)]){const f=await fixture(text);assert.equal((await f.transport.query(f.bundle)).decision,'outcome_unknown');assert.equal(f.calls.length,1);}
 let sends=0;const f=await fixture(),transport=createClientOperationStatusTransport({endpoint:'https://synthetic.invalid/api/operation-status',fetch:()=>{sends++;throw Error('lost ACK');}});assert.equal((await transport.query(f.bundle)).decision,'outcome_unknown');assert.equal(sends,1);
});

async function reserved(){
 const f=await serviceFixture('AI_ASSIST'),verify=f.ledger.verify;
 f.ledger.windowPolicy='bounded-v1';f.ledger.verify=async(...args)=>({...await verify(...args),timeZone:'UTC'});
 await f.ledger.reserve(f.input.reservationRequest);const row=JSON.parse(JSON.stringify(f.rows()[0])),request=row.request;
 return {request,reply:{decision:'queried',operationId:request.operationId,jobId:request.jobId,state:'RESERVED',financialOutcome:'UNKNOWN',providerEvidenceRecorded:false,observedAt:150,reservation:row,reservedAt:row.reservedAt,reservationMicros:row.reservationMicros,window:row.window,heldSpendMicros:row.reservationMicros,settledSpendMicros:null,financialSettlement:null,unknownReceipt:null,resultResolution:null,effectiveResults:0,...flags}};
}
async function observe(request,reply){
 let calls=0;const transport=createClientOperationStatusTransport({endpoint:'https://synthetic.invalid/api/operation-status',fetch:async()=>{calls++;return Response.json(reply);}}),result=await transport.query({request,principalToken:'synthetic',entitlementToken:'synthetic'});
 assert.equal(calls,1);return {result,branded:!!observedClientOperationStatus(result,transport)};
}
test('original RESERVED projection requires complete pricing, window and state-consistent financial fields before branding',async()=>{
 const {request,reply}=await reserved();assert.equal((await observe(request,reply)).branded,true);
 const changes=[
  r=>r.heldSpendMicros=0,r=>r.settledSpendMicros=0,r=>r.financialSettlement={arbitrary:'forged'},r=>r.unknownReceipt='invalid',r=>r.resultResolution=[],r=>r.effectiveResults=123,
  r=>r.effectiveResults=1,r=>r.financialOutcome='KNOWN',r=>r.providerEvidenceRecorded=true,r=>r.reservedAt=151,r=>r.observedAt=149,
  r=>r.reservation.quote.extra=true,r=>r.reservation.quote.nativeMicros++,r=>r.reservation.quote.fxVersion='forged',r=>r.reservation.reservationMicros++,r=>r.reservation.request.inputTokens++,
  r=>r.reservation.pricing.now++,r=>r.reservation.pricing.extra=true,r=>r.reservation.pricing.fx='forged',r=>r.reservation.pricing.fx={version:'unqualified'},
  r=>r.reservation.pricing.book.rates.extra=0,r=>r.reservation.pricing.book.rates.completion=-1,r=>r.reservation.pricing.book.inputBand.extra=1,r=>r.reservation.pricing.book.route.extra='x',r=>r.reservation.pricing.route.extra='x',r=>r.reservation.pricing.book.expiresAt=150,
  r=>r.window=null,r=>r.window.dayId='2026-01-01',r=>r.window.endsAt++,r=>r.window.nextEligibilityAt++,r=>r.window.timeZone='Invalid/Zone',r=>r.window.extra=true,
  r=>r.reservation.window={...r.window,nextEligibilityAt:r.window.nextEligibilityAt+1}
 ];
 for(const [index,change]of changes.entries()){const r=structuredClone(reply);change(r);const answer=await observe(request,r);assert.equal(answer.result.decision,'outcome_unknown',`mutation ${index}`);assert.equal(answer.branded,false,`mutation ${index}`);}
 const event=structuredClone(reply);event.providerEvidenceRecorded=true;event.reservation=null;assert.equal((await observe(request,event)).branded,true,'event-marked RESERVED is unknown with no binding view');
});

test('status settlement, unknown receipt and domain result are exact separate state-bound structures',async()=>{
 const {request,reply}=await reserved(),known={receiptId:'synthetic-settlement',operationId:request.operationId,outcome:'VALIDATED',usage:{inputTokens:100,completionTokens:20,totalTokens:120,reasoningTokens:0,cachedReadTokens:0,cacheCreateTokens:0},pricingVersion:'fixture-price',fxVersion:null,nativeCurrency:'USD',nativeMicros:120,usdMicros:120,committedChildren:[]};
 const unknown={...known,receiptId:'synthetic-unknown',outcome:'UNKNOWN',usage:null,nativeMicros:null,usdMicros:null},settled={...reply,state:'SETTLED',financialOutcome:'KNOWN',providerEvidenceRecorded:true,reservation:null,heldSpendMicros:0,settledSpendMicros:120,financialSettlement:known};
 assert.equal((await observe(request,settled)).branded,true);
 const result={receiptId:'synthetic-result',jobId:request.jobId,outcome:'COMMITTED',children:[{operationId:request.operationId,receiptId:known.receiptId}]},committed={...settled,resultResolution:result,effectiveResults:1};
 assert.equal((await observe(request,committed)).branded,true);assert.equal((await observe(request,{...settled,unknownReceipt:unknown})).branded,true);
 const changes=[r=>r.providerEvidenceRecorded=false,r=>r.heldSpendMicros=1,r=>r.settledSpendMicros++,r=>r.financialSettlement={},r=>r.financialSettlement.operationId='other',r=>r.financialSettlement.outcome='COMMITTED',r=>r.financialSettlement.outcome='UNKNOWN',r=>r.financialSettlement.extra=true,r=>r.financialSettlement.receiptId='',r=>r.financialSettlement.fxVersion='forged',r=>r.financialSettlement.usdMicros=-1,r=>r.financialSettlement.nativeMicros=0,r=>r.financialSettlement.usage.totalTokens++,r=>r.financialSettlement.usage.extra=true,r=>r.financialSettlement.usage=null,r=>r.financialSettlement.committedChildren=[{operationId:request.operationId,receiptId:'forged'}],r=>r.unknownReceipt='invalid',r=>r.resultResolution=[],r=>r.effectiveResults=1];
 for(const [index,change]of changes.entries()){const r=structuredClone(settled);change(r);assert.equal((await observe(request,r)).branded,false,`settlement mutation ${index}`);}
 for(const change of [r=>r.resultResolution.jobId='other',r=>r.resultResolution.children[0].receiptId='other',r=>r.resultResolution.children[0].extra=true,r=>r.resultResolution.children=[],r=>r.resultResolution.receiptId=known.receiptId,r=>r.financialSettlement.outcome='FAILED',r=>r.effectiveResults=0]){const r=structuredClone(committed);change(r);assert.equal((await observe(request,r)).branded,false);}
 for(const state of ['DISPATCHED','OUTCOME_UNKNOWN']){const r={...reply,state,providerEvidenceRecorded:true,reservation:null};assert.equal((await observe(request,r)).branded,true);assert.equal((await observe(request,{...r,unknownReceipt:unknown})).branded,state==='OUTCOME_UNKNOWN');}
 for(const change of [r=>r.unknownReceipt.outcome='VALIDATED',r=>r.unknownReceipt.usage=known.usage,r=>r.unknownReceipt.usdMicros=0,r=>r.unknownReceipt.operationId='other',r=>r.unknownReceipt.extra=true]){const r={...structuredClone(reply),state:'OUTCOME_UNKNOWN',providerEvidenceRecorded:true,reservation:null,unknownReceipt:structuredClone(unknown)};change(r);assert.equal((await observe(request,r)).branded,false);}
 const cancelled={...reply,state:'CANCELLED_BEFORE_DISPATCH',financialOutcome:'CANCELLED_BEFORE_DISPATCH',reservation:null,heldSpendMicros:0};assert.equal((await observe(request,cancelled)).branded,true);
 for(const change of [r=>r.providerEvidenceRecorded=true,r=>r.heldSpendMicros=1,r=>r.settledSpendMicros=0,r=>r.financialSettlement=known,r=>r.unknownReceipt=unknown,r=>r.effectiveResults=1]){const r=structuredClone(cancelled);change(r);assert.equal((await observe(request,r)).branded,false);}
});
