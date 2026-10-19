import {hashText} from '../dedupe.js';
// Point-in-time, metadata-only financial observation. Never a dispatch lease,
// retry permission, inferred refund or replacement for the original ledger.
import {clientDeclarationRequestData} from './client-declaration.js';
import {snapshot,exact,freeze,integer} from './qwen-request-data.js';
import {fixedGatewayHttp} from './client-gateway-http.js';
import {canonical,equal,opaque} from './contracts.js';
import {budgetWindow} from './budget-window-policy.js';
import {quoteRequestBound} from './ratebook.js';
import {normalizeUsage} from './usage-normalization.js';
import {snapshotResultEvidence} from './result-finalization.js';
const transports=new WeakMap(),observations=new WeakMap();
const flags={financialAuthority:false,dispatchAllowed:false,retryAllowed:false};
const unknown=()=>freeze({decision:'outcome_unknown',reason:'TRANSPORT_OUTCOME_UNKNOWN',...flags});
const base=['decision','operationId','jobId','state','financialOutcome','providerEvidenceRecorded','observedAt','reservation',...Object.keys(flags)];
const existing=['reservedAt','reservationMicros','window','heldSpendMicros','settledSpendMicros','financialSettlement','unknownReceipt','resultResolution','effectiveResults'];
export const clientOperationStatusTransportOrigin=t=>transports.get(t)??null;
export const observedClientOperationStatus=(response,transport)=>{const r=observations.get(response);return r?.transport===transport?r:null;};
// Validate the original ledger projection, not provider response shorthand.
// Pure original pricing/window/usage validators check historical facts at the
// original reservedAt; an old snapshot is never promoted into current authority.
function receipt(value,request,unknown,reservationMicros){
 if(!exact(value,['receiptId','operationId','outcome','usage','pricingVersion','fxVersion','nativeCurrency','nativeMicros','usdMicros','committedChildren'])||!opaque(value.receiptId)||value.operationId!==request.operationId||!opaque(value.pricingVersion)||!['USD','CNY'].includes(value.nativeCurrency)||!(value.nativeCurrency==='USD'?value.fxVersion===null:opaque(value.fxVersion))||!Array.isArray(value.committedChildren)||value.committedChildren.length)return false;
 if(unknown)return value.outcome==='UNKNOWN'&&value.usage===null&&value.nativeMicros===null&&value.usdMicros===null;
 if(!['VALIDATED','FAILED'].includes(value.outcome)||!integer(value.nativeMicros)||!integer(value.usdMicros)||value.usdMicros>reservationMicros||value.nativeCurrency==='USD'&&value.nativeMicros!==value.usdMicros)return false;
 return normalizeUsage(value.usage).state==='known'&&value.usage.inputTokens<=request.inputTokens&&value.usage.completionTokens<=request.outputCap;
}
function projection(v,request){
 const settled=v.state==='SETTLED',cancelled=v.state==='CANCELLED_BEFORE_DISPATCH';
 if(!['RESERVED','DISPATCHED','OUTCOME_UNKNOWN','SETTLED','CANCELLED_BEFORE_DISPATCH'].includes(v.state)||typeof v.providerEvidenceRecorded!=='boolean'||!integer(v.reservedAt)||v.reservedAt>v.observedAt||!integer(v.reservationMicros)||v.heldSpendMicros!==(settled||cancelled?0:v.reservationMicros)||![0,1].includes(v.effectiveResults))return false;
 if(v.financialOutcome!==(settled?'KNOWN':cancelled?'CANCELLED_BEFORE_DISPATCH':'UNKNOWN'))return false;
 if(!exact(v.window,['version','timeZone','dayId','windowId','endsAt','nextEligibilityAt'])||typeof v.window.windowId!=='string'||!equal(v.window,budgetWindow({tier:v.window.windowId.split(':')[0],timeZone:v.window.timeZone},v.reservedAt)))return false;
 if(settled){
  if(!v.providerEvidenceRecorded||!receipt(v.financialSettlement,request,false,v.reservationMicros)||v.settledSpendMicros!==v.financialSettlement.usdMicros)return false;
 }else if(v.financialSettlement!==null||v.settledSpendMicros!==null)return false;
 if(cancelled&&v.providerEvidenceRecorded)return false;
 if(v.unknownReceipt!==null){
  if(!['OUTCOME_UNKNOWN','SETTLED'].includes(v.state)||!v.providerEvidenceRecorded||!receipt(v.unknownReceipt,request,true,v.reservationMicros))return false;
  if(settled&&!['pricingVersion','fxVersion','nativeCurrency'].every(k=>v.unknownReceipt[k]===v.financialSettlement[k]))return false;
 }
 if(v.resultResolution!==null){
  const result=snapshotResultEvidence(v.resultResolution),child=result.children.find(c=>c.operationId===request.operationId);
  if(!settled&&!cancelled||request.childIndex!==0||result.jobId!==request.jobId||result.children.length>request.childCount||!child||child.receiptId!==(settled?v.financialSettlement.receiptId:null)||[v.financialSettlement?.receiptId,v.unknownReceipt?.receiptId].includes(result.receiptId))return false;
  const receipts=result.children.map(c=>c.receiptId).filter(id=>id!==null);if(new Set(receipts).size!==receipts.length||receipts.includes(result.receiptId))return false;
  if(result.outcome==='COMMITTED'&&(!settled||v.financialSettlement.outcome!=='VALIDATED'||result.children.length!==request.childCount||result.children.some(c=>c.receiptId===null)))return false;
  if(v.effectiveResults!==(result.outcome==='COMMITTED'?1:0))return false;
 }else if(v.effectiveResults!==0)return false;
 if(v.state==='RESERVED'&&!v.providerEvidenceRecorded){
  const r=v.reservation;
  if(!exact(r,['request','state','reservedAt','window','reservationMicros','quote','pricing'])||!equal(r.request,request)||r.state!=='RESERVED'||r.reservedAt!==v.reservedAt||r.reservationMicros!==v.reservationMicros||!equal(r.window,v.window)||!exact(r.pricing,['book','route','fx','now'],['book','route','now'])||r.pricing.now!==v.reservedAt)return false;
  // USD's original optional undefined FX field is absent in JSON. A supplied
  // non-null FX object must still satisfy its own full original schema.
  const p=r.pricing,fx=p.fx;if(fx!==undefined&&fx!==null&&(!exact(fx,['version','verified','observedAt','expiresAt','source','cnyMicrosPerUsd','reservationCnyMicrosPerUsd'])||!opaque(fx.version)||fx.verified!==true||typeof fx.source!=='string'||!fx.source.length||!integer(fx.observedAt)||!integer(fx.expiresAt)||fx.observedAt>p.now||p.now-fx.observedAt>86400000||fx.expiresAt<=p.now||!integer(fx.cnyMicrosPerUsd)||!integer(fx.reservationCnyMicrosPerUsd)||fx.reservationCnyMicrosPerUsd<1||fx.reservationCnyMicrosPerUsd>fx.cnyMicrosPerUsd))return false;
  const quote=quoteRequestBound({...p,inputTokens:request.inputTokens,billableOutputCap:request.outputCap});
  if(!equal(quote,r.quote)||quote.usdReservationMicros!==v.reservationMicros)return false;
 }else if(v.reservation!==null)return false;
 return true;
}
export function createClientOperationStatusTransport(options){
 const http=fixedGatewayHttp(options,'/api/operation-status',{bytes:24576,millis:5000});if(!http)return null;let transport;
 async function query(bundle,witness=null){
  try{
   const b=snapshot(bundle,{maxBytes:24576,maxKeys:32,maxDepth:2,maxString:8192});
   if(!exact(b,['request','principalToken','entitlementToken'])||!['principalToken','entitlementToken'].every(k=>typeof b[k]==='string'&&b[k].length>0&&b[k].length<=8192))return unknown();
   b.request=clientDeclarationRequestData(b.request);freeze(b);
   const {status,value:v}=await http.send({action:'query',...b});
   if(status!==200||!exact(v,v.state==='NOT_FOUND'?base:[...base,...existing,...(Object.hasOwn(v,'authenticatedIdentity')?['authenticatedIdentity']:[])])||v.decision!=='queried'||v.operationId!==b.request.operationId||v.jobId!==b.request.jobId||!integer(v.observedAt)||!Object.keys(flags).every(k=>v[k]===false))return unknown();
   if(v.state==='NOT_FOUND'){if(v.financialOutcome!=='UNKNOWN'||v.providerEvidenceRecorded!==null||v.reservation!==null)return unknown();}
   else if(!projection(v,b.request))return unknown();
   if(Object.hasOwn(v,'authenticatedIdentity')&&v.authenticatedIdentity!==null){
    const i=v.authenticatedIdentity,keys=['version','principalId','libraryId','operationId','jobType','tier','principalGeneration','entitlementGeneration','authorityGeneration','observedAt','verifiedUntil','requestHash'];
    if(!exact(i,keys)||i.version!==1||!['principalId','libraryId','operationId','jobType'].every(k=>i[k]===b.request[k])||!['free','pro'].includes(i.tier)||!['principalGeneration','entitlementGeneration','authorityGeneration'].every(k=>opaque(i[k]))||i.observedAt!==v.observedAt||!integer(i.verifiedUntil)||i.verifiedUntil<=i.observedAt||i.verifiedUntil-i.observedAt>60000||v.state!=='RESERVED'||v.providerEvidenceRecorded!==false||!v.reservation||v.window.windowId.split(':')[0]!==i.tier||i.requestHash!==await hashText(canonical(b.request)))return unknown();
   }
   const response=freeze(v);observations.set(response,freeze({transport,origin:http.origin,request:b.request,witness,...(v.authenticatedIdentity?{authenticatedIdentity:v.authenticatedIdentity}:{})}));return response;
  }catch{return unknown();}
 }
 transport=Object.freeze({query});transports.set(transport,http.origin);return transport;
}
