// Dormant LOCAL binding mechanics, not a deployed qualification/trust root.
// Constructor callbacks are existing-owner integration seams; request booleans,
// profile names, digest equality and fixture callbacks establish no live trust.
// Explicit configured same-origin service transports are optional. They require
// original private handles and actual service ACKs; no default URL, credential
// issuer, qualified production registry or new Archive-reading grant exists.
import {canonical} from './contracts.js';
import {clientDeclarationData,clientDeclarationCanonical,CLIENT_DECLARATION_REQUEST_FIELDS as REQUEST} from './client-declaration.js';
import {clientDeclarationTransportOrigin,isClientDeclarationTransport} from './client-declaration-transport.js';
import {clientReservationTransportOrigin,observedClientReservation,observedClientReservationDenial} from './client-reservation-transport.js';
import {clientProviderTransportOrigin,observedClientProviderResponse} from './client-provider-transport.js';
import {hashText} from '../dedupe.js';
import {ENVELOPES} from './admission-policy.js';
import {ROUTE_FIELDS,quoteRequestBound} from './ratebook.js';
import {createQwenRequestProfileCompiler} from './qwen-request-profile.js';
import {installedQwenManifestCapability,inspectInstalledQwenSourceProfile,compileInstalledQwenRequest,isInstalledQwenMeasurement} from './qwen-source-profile.js';
import {boundedSchema,exact,failureReason,freeze,integer,snapshot,stop,token} from './qwen-request-data.js';

const foundationProviders=new WeakMap(),foundationResponses=new WeakMap(),reservationDenials=new WeakMap();
export const qwenReservationDenial=value=>reservationDenials.get(value)??null;
export const qwenFoundationProviderData=provider=>foundationProviders.get(provider)??null;
export const qwenFoundationResponse=(provider,response)=>{const r=foundationResponses.get(response);return r?.provider===provider?r:null;};

const CHILD=['logicalJobId','childOperationId','type','contractVersion','routeVersion','automaticRetries'];
const NUMERIC=['childIndex','childCount','inputTokens','outputCap','maxCompletionTokens'];
const LIMITS=Object.freeze({profiles:16,operations:128,inFlight:8,wireBytes:262144,validityMs:86400000});
const encoder=new TextEncoder(),same=(a,b)=>canonical(a)===canonical(b);
const authority=Object.freeze({sourceKind:'LOCAL_INJECTED_OWNERS',qualification:'NOT_ESTABLISHED',inputBoundQualified:false,financialAuthority:false,dispatchAllowed:false});
const unavailable=reason=>Object.freeze({status:'UNAVAILABLE',reason,wireComplete:false,...authority});
const clone=v=>structuredClone(v);
function identities(c,r){
 if(!exact(c,CHILD)||!CHILD.filter(k=>k!=='automaticRetries').every(k=>token(c[k]))||c.automaticRetries!==0||!Object.hasOwn(ENVELOPES,c.type))stop('CHILD_BINDING_MISMATCH');
 if(!exact(r,REQUEST)||!REQUEST.filter(k=>!NUMERIC.includes(k)).every(k=>token(r[k]))||!NUMERIC.every(k=>integer(r[k]))||r.childCount<1||r.childCount>ENVELOPES[c.type].children||r.childIndex>=r.childCount||r.operationId!==c.childOperationId||r.jobId!==c.logicalJobId||r.jobType!==c.type||r.contractVersion!==c.contractVersion||r.routeVersion!==c.routeVersion)stop('RESERVATION_BINDING_MISMATCH');
}
function validity(v,now){
 if(!exact(v,['verifiedAt','expiresAt','revoked'])||!integer(v.verifiedAt)||!integer(v.expiresAt)||v.expiresAt<=v.verifiedAt||v.expiresAt-v.verifiedAt>LIMITS.validityMs||v.revoked!==false||now<v.verifiedAt||now>=v.expiresAt)stop('PROFILE_UNAVAILABLE');
}
function authorization(a,c,r,payloadDigest,now){
 if(!exact(a,['authorizationId','childIdentity','reservationRequest','payloadDigest','expiresAt'])||!token(a.authorizationId)||!same(a.childIdentity,c)||!same(a.reservationRequest,r)||a.payloadDigest!==payloadDigest||!integer(a.expiresAt)||a.expiresAt<=now||a.expiresAt-now>LIMITS.validityMs)stop('PAYLOAD_AUTHORITY_UNAVAILABLE');
}

export function createQwenQualifiedRequestOwner(options){
 // Do not access constructor getters. Injected functions are capability seams,
 // separate from untrusted request data; their authentication is NOT implemented.
 let clock,resolveProfile,authorizePayload,tokenize,readReservation,readCurrentBinding;
 try{
  const keys=['clock','resolveProfile','authorizePayload','tokenize','readReservation','readCurrentBinding'];
  if(!options||![Object.prototype,null].includes(Object.getPrototypeOf(options))||Reflect.ownKeys(options).length!==keys.length)stop('OWNER_UNAVAILABLE');
  const callbacks=keys.map(k=>{const d=Object.getOwnPropertyDescriptor(options,k);if(!d||!Object.hasOwn(d,'value')||typeof d.value!=='function')stop('OWNER_UNAVAILABLE');return d.value;});
  [clock,resolveProfile,authorizePayload,tokenize,readReservation,readCurrentBinding]=callbacks;options=null;
 }catch{return Object.freeze({bind:async()=>unavailable('OWNER_UNAVAILABLE'),revalidate:async()=>unavailable('OWNER_UNAVAILABLE'),prepareDeclaration:async()=>unavailable('OWNER_UNAVAILABLE'),publishDeclaration:async()=>unavailable('OWNER_UNAVAILABLE'),revokeDeclaration:async()=>unavailable('OWNER_UNAVAILABLE'),reserveDeclaration:async()=>unavailable('OWNER_UNAVAILABLE'),foundationProvider:()=>null,revoke:()=>false,dispose(){}});}
 const profiles=new Map(),operations=new Map(),handles=new WeakMap(),declarations=new WeakMap(),declarationOperations=new Map(),providerRetirements=new Set();let disposed=false,lastNow=0,inFlight=0;
 function now(){if(disposed)stop('OWNER_DISPOSED');const n=clock();if(!integer(n)||n<lastNow)stop('CLOCK_UNAVAILABLE');lastNow=n;return n;}
 function active(entry){const n=now();if(entry.revoked||entry.sourceCapability&&!inspectInstalledQwenSourceProfile(entry.sourceCapability))stop('PROFILE_REVOKED');validity(entry.manifest.profile.validity,n);return n;}
 async function profile(c,r,stream){
  const raw=await resolveProfile(freeze({childIdentity:clone(c)}));now();
  const sourceCapability=installedQwenManifestCapability(raw),m=snapshot(raw),p=m.profile;
  if(!exact(m,['version','profile','known','route','wire','tokenizer'])||m.version!==1||!p||!token(p.id))stop('PROFILE_UNAVAILABLE');
  if(p.validity?.revoked===true){
   const prior=profiles.get(p.id);if(prior)prior.revoked=true;else if(profiles.size<LIMITS.profiles)profiles.set(p.id,{revoked:true});
   stop('PROFILE_REVOKED');
  }
  validity(p.validity,now());
  if(!exact(m.route,ROUTE_FIELDS)||!ROUTE_FIELDS.every(k=>token(m.route[k]))||m.route.provider!=='qwen'||m.route.model!==p.model?.requested||m.route.resolutionVersion!==p.model?.resolutionVersion||m.route.region!==p.endpoint?.region||m.route.deployment!==p.endpoint?.deployment||m.route.profile!==p.apiProfileId||m.route.tokenizer!==p.tokenizerProfileId||m.route.api!=='chat-completions')stop('ROUTE_BINDING_MISMATCH');
  const w=m.wire,t=m.tokenizer;
  if(!exact(w,['instructions','responseFormat','thinkingControls'])||typeof w.instructions!=='string'||!w.instructions.length||w.instructions.length>8192||!exact(w.responseFormat,['type','json_schema'])||w.responseFormat.type!=='json_schema'||!exact(w.responseFormat.json_schema,['name','strict','schema'])||!token(w.responseFormat.json_schema.name)||w.responseFormat.json_schema.strict!==true)stop('WIRE_PROFILE_UNAVAILABLE');
  boundedSchema(w.responseFormat.json_schema.schema);
  if(await hashText(canonical(w.responseFormat.json_schema.schema))!==p.responseSchemaDigest)stop('SCHEMA_BINDING_MISMATCH');now();
  const tc=w.thinkingControls;
  if(p.thinking?.enabled?(!exact(tc,['enable_thinking','thinking_budget'])||tc.enable_thinking!==true||tc.thinking_budget!==p.thinking.thinkingBudget||p.jobType!=='AI_ORGANIZE'):(!exact(tc,['enable_thinking'])||tc.enable_thinking!==false))stop('THINKING_UNAVAILABLE');
  if(!exact(t,['profileId','qualificationRef','protocolOverheadTokens','maxWireBytes'])||t.profileId!==p.tokenizerProfileId||!token(t.qualificationRef)||!integer(t.protocolOverheadTokens)||t.protocolOverheadTokens<1||!integer(t.maxWireBytes)||t.maxWireBytes<1||t.maxWireBytes>LIMITS.wireBytes)stop('TOKENIZER_UNAVAILABLE');
  let compiled;
  if(sourceCapability)compiled=compileInstalledQwenRequest(sourceCapability,{childIdentity:c,inputTokens:r.inputTokens,outputCap:r.outputCap,stream});
  else{const compiler=createQwenRequestProfileCompiler({profile:p,known:m.known});compiled=compiler.compile({childIdentity:c,inputTokens:r.inputTokens,outputCap:r.outputCap,stream,now:now()});compiler.dispose();}
  if(compiled.status!=='COMPILED_PARTIAL')stop('PROFILE_UNAVAILABLE');
  if(compiled.billableOutputCap!==r.outputCap||compiled.requestControls.max_completion_tokens!==r.maxCompletionTokens)stop('RESERVATION_BINDING_MISMATCH');
  const signature=canonical(m);let entry=profiles.get(p.id);
  if(entry){if(entry.revoked)stop('PROFILE_REVOKED');if(entry.signature!==signature||entry.sourceCapability!==sourceCapability)stop('PROFILE_REBOUND');}
  else{if(profiles.size>=LIMITS.profiles)stop('PROFILE_CAPACITY');entry={manifest:freeze(m),signature,sourceCapability,revoked:false};profiles.set(p.id,entry);}
  active(entry);return {entry,compiled};
 }
 function checkReservation(row,r,entry,at){
  if(!exact(row,['request','state','reservedAt','window','reservationMicros','quote','pricing'],['request','state','reservedAt','reservationMicros','quote','pricing'])||!same(row.request,r)||row.state!=='RESERVED'||!integer(row.reservedAt)||row.reservedAt>at||!integer(row.reservationMicros)||!exact(row.pricing,['book','route','fx','now'])||row.pricing.now!==row.reservedAt||!same(row.pricing.route,entry.manifest.route))stop('RESERVATION_UNAVAILABLE');
  let quote;try{quote=quoteRequestBound({book:row.pricing.book,route:row.pricing.route,fx:row.pricing.fx,now:at,inputTokens:r.inputTokens,billableOutputCap:r.outputCap});}catch{stop('RESERVATION_UNAVAILABLE');}
  if(!same(quote,row.quote)||quote.usdReservationMicros!==row.reservationMicros)stop('RESERVATION_UNAVAILABLE');
  return quote;
 }
 async function reservation(r,entry){
  const row=snapshot(await readReservation(freeze(clone(r))),{allowUndefined:true}),quote=checkReservation(row,r,entry,active(entry));
  const reservationDigest=await hashText(canonical(row));active(entry);
  return freeze({row,proof:{request:clone(r),reservedAt:row.reservedAt,reservationMicros:row.reservationMicros,quote:clone(quote),route:clone(row.pricing.route),reservationDigest}});
 }
 async function authorize(c,r,payload,payloadDigest,entry){
  const proof=snapshot(await authorizePayload(freeze({childIdentity:clone(c),reservationRequest:clone(r),payload:clone(payload),payloadDigest})));
  authorization(proof,c,r,payloadDigest,active(entry));return freeze(proof);
 }
 // A mandatory constructor capability supplies ONE synchronous coherent view
 // of all four current owners. No Promise, boolean or echoed request is proof.
 // Implementations must read owner-backed state in one serialization domain;
 // a real cross-process service needs its own transaction/fence qualification.
 // This comparison and subsequent publication contain no await or callbacks.
 function finalFence(entry,c,r,auth,measurement,financial,payloadDigest,requestDigest){
  active(entry);
  const current=snapshot(readCurrentBinding(freeze({childIdentity:clone(c),reservationRequest:clone(r),profileId:entry.manifest.profile.id,payloadDigest,requestDigest})),{allowUndefined:true});
  if(!exact(current,['now','profile','authorization','tokenizer','reservation']))stop('CURRENTNESS_UNAVAILABLE');
  if(disposed)stop('OWNER_DISPOSED');
  const declared=declarationOperations.get(r.operationId);
  if(declared?.revoked)stop('DECLARATION_REVOKED');
  if(declared&&(!same(declared.r,r)||declared.payloadDigest!==payloadDigest||!same(declared.auth,auth)))stop('OPERATION_REBOUND');
  const at=current.now;
  if(!integer(at)||at<lastNow)stop('CLOCK_UNAVAILABLE');lastNow=at;
  if(entry.revoked)stop('PROFILE_REVOKED');validity(entry.manifest.profile.validity,at);
  if(current.profile?.profile?.id===entry.manifest.profile.id&&current.profile.profile.validity?.revoked===true){entry.revoked=true;stop('PROFILE_REVOKED');}
  if(!same(current.profile,entry.manifest))stop('PROFILE_AUTHORITY_CHANGED');
  if(!same(current.authorization,auth))stop('PAYLOAD_AUTHORITY_CHANGED');
  if(!same(current.tokenizer,measurement))stop('TOKENIZER_AUTHORITY_CHANGED');
  if(financial&&!same(current.reservation,financial.row))stop('RESERVATION_CHANGED');
  authorization(auth,c,r,payloadDigest,at);
  if(at>=measurement.expiresAt)stop('BINDING_EXPIRED');
  if(financial)checkReservation(current.reservation,r,entry,at);return at;
 }
 async function prepareMaterial(o){
    const c=o.childIdentity,r=o.reservationRequest;identities(c,r);
    const {entry,compiled}=await profile(c,r,o.stream),m=entry.manifest;
    const payloadDigest=await hashText(canonical(o.payload));active(entry);
    const auth=await authorize(c,r,o.payload,payloadDigest,entry);
    const body=canonical({model:m.profile.model.requested,messages:[{role:'system',content:m.wire.instructions},{role:'user',content:canonical(o.payload)}],response_format:m.wire.responseFormat,...compiled.requestControls,...m.wire.thinkingControls,n:1});
    if(encoder.encode(body).length>m.tokenizer.maxWireBytes)stop('WIRE_BOUND');
    // Keep endpoint components as data: constructing a transport URL belongs
    // to the separately qualified service, never this extension-local owner.
    const envelope=freeze({method:'POST',endpoint:{scheme:'https',host:m.profile.endpoint.host,path:m.profile.endpoint.path},headers:{'Content-Type':'application/json'},body});
    const requestDigest=await hashText(canonical(envelope));active(entry);
    const rawMeasurement=await tokenize(freeze({profileId:m.profile.id,tokenizerProfileId:m.tokenizer.profileId,qualificationRef:m.tokenizer.qualificationRef,requestDigest,envelope:clone(envelope)}));
    if(entry.sourceCapability&&!isInstalledQwenMeasurement(rawMeasurement,entry.sourceCapability))stop('TOKENIZER_SOURCE_UNAVAILABLE');
    const measurement=snapshot(rawMeasurement);
    const at=active(entry);
    if(!exact(measurement,['profileId','tokenizerProfileId','qualificationRef','requestDigest','contentTokens','protocolOverheadTokens','inputTokens','expiresAt'])||measurement.profileId!==m.profile.id||measurement.tokenizerProfileId!==m.tokenizer.profileId||measurement.qualificationRef!==m.tokenizer.qualificationRef||measurement.requestDigest!==requestDigest||!['contentTokens','protocolOverheadTokens','inputTokens','expiresAt'].every(k=>integer(measurement[k]))||measurement.protocolOverheadTokens!==m.tokenizer.protocolOverheadTokens||measurement.inputTokens!==measurement.contentTokens+measurement.protocolOverheadTokens||measurement.inputTokens!==r.inputTokens||measurement.expiresAt<=at||measurement.expiresAt>m.profile.validity.expiresAt)stop('TOKENIZER_BINDING_MISMATCH');
  return {c,r,entry,compiled,payloadDigest,auth,envelope,requestDigest,measurement};
 }
 function declarationResult(status,reason='NONE',extra={}){return freeze({status,reason,...authority,...extra});}
 function invalidateDeclaration(h){
  if(!h)return;h.revoked=true;
  if(h.transport&&h.proofs&&!h.revokePromise){
   // This is the same exact declaration/operation. Never remint or retry a send.
   h.revokePromise=h.transport.revoke({request:h.r,...h.proofs},h.declaration).catch(()=>({decision:'outcome_unknown'}));
  }
  h.retireContent?.();
 }
 const owner={
  async bind(value){
   let entered=false;
   try{
    now();if(inFlight>=LIMITS.inFlight)stop('OWNER_BUSY');inFlight++;entered=true;const o=snapshot(value);
    if(!exact(o,['childIdentity','reservationRequest','payload','stream'])||typeof o.stream!=='boolean'||!o.payload||Array.isArray(o.payload)||typeof o.payload!=='object')stop('REQUEST_UNAVAILABLE');
    const {c,r,entry,compiled,payloadDigest,auth,envelope,requestDigest,measurement}=await prepareMaterial(o),m=entry.manifest;
    const declared=declarationOperations.get(r.operationId);if(declared&&(declared.revoked||declared.payloadDigest!==payloadDigest))stop(declared.revoked?'DECLARATION_REVOKED':'OPERATION_REBOUND');
    const financial=await reservation(r,entry);
    // Re-read the owning authorities after asynchronous token/financial work.
    // These are read-only seams; no attempt or financial reservation is minted.
    const checked=await profile(c,r,o.stream);if(checked.entry!==entry)stop('PROFILE_REBOUND');
    const finalAuth=await authorize(c,r,o.payload,payloadDigest,entry);if(!same(auth,finalAuth))stop('PAYLOAD_AUTHORITY_CHANGED');
    const finalFinancial=await reservation(r,entry);if(!same(financial,finalFinancial))stop('RESERVATION_CHANGED');
    const finalNow=active(entry);if(finalNow>=auth.expiresAt||finalNow>=measurement.expiresAt)stop('BINDING_EXPIRED');
    const identity=freeze({childIdentity:clone(c),profileId:m.profile.id,payloadDigest,requestDigest,authorizationId:auth.authorizationId,authorizationExpiresAt:auth.expiresAt,tokenizer:measurement,reservation:financial.proof});
    const identityDigest=await hashText(canonical(identity));const ready=active(entry);
    if(ready>=auth.expiresAt||ready>=measurement.expiresAt)stop('BINDING_EXPIRED');
    const checkedAt=finalFence(entry,c,r,auth,measurement,financial,payloadDigest,requestDigest);
    const old=operations.get(r.operationId);if(old&&old!==identityDigest)stop('OPERATION_REBOUND');
    if(!old&&operations.size>=LIMITS.operations)stop('OPERATION_CAPACITY');operations.set(r.operationId,identityDigest);
    const result=freeze({status:'BOUND_LOCAL',reason:'NONE',checkedAt,wireComplete:true,localBindingComplete:true,...authority,envelope,identity,identityDigest,expiresAt:Math.min(auth.expiresAt,measurement.expiresAt,m.profile.validity.expiresAt),usageBinding:compiled.binding});
    // Weak identity association stores metadata only, never a private payload.
    handles.set(result,{entry,c,r,auth,measurement,financial,stream:o.stream,identityDigest});return result;
   }catch(e){return unavailable(failureReason(e));}finally{if(entered)inFlight--;}
  },
  async prepareDeclaration(value){
   let entered=false;
   try{
    now();if(inFlight>=LIMITS.inFlight)stop('OWNER_BUSY');inFlight++;entered=true;const o=snapshot(value);
    if(!exact(o,['childIdentity','reservationRequest','payload','stream'])||typeof o.stream!=='boolean'||!o.payload||Array.isArray(o.payload)||typeof o.payload!=='object')stop('REQUEST_UNAVAILABLE');
    const h=await prepareMaterial(o),{c,r,entry,auth,measurement,payloadDigest,requestDigest}=h;
    const checked=await profile(c,r,o.stream);if(checked.entry!==entry)stop('PROFILE_REBOUND');
    const again=await authorize(c,r,o.payload,payloadDigest,entry);if(!same(again,auth))stop('PAYLOAD_AUTHORITY_CHANGED');
    const requestHash=await hashText(canonical(r));
    // Job fingerprint stays job-level. Child scope/payload are separately bound.
    const scopeDigest=await hashText(canonical({childIdentity:c,reservationRequest:r,authorizationId:auth.authorizationId}));
    const declaration=clientDeclarationData({version:1,requestHash,payloadDigest,scopeDigest,contentGeneration:payloadDigest,consentEpoch:r.consentEpoch,authorizationId:auth.authorizationId,expiresAt:Math.min(auth.expiresAt,measurement.expiresAt,entry.manifest.profile.validity.expiresAt)});
    const declarationDigest=await hashText(clientDeclarationCanonical(declaration));
    const old=declarationOperations.get(r.operationId);if(old&&(old.declarationDigest!==declarationDigest||old.revoked))stop(old.revoked?'DECLARATION_REVOKED':'OPERATION_REBOUND');
    if(!old&&declarationOperations.size>=LIMITS.operations)stop('OPERATION_CAPACITY');
    // Reuse the same coherent source fence; this stage claims NO reservation.
    const checkedAt=finalFence(entry,c,r,auth,measurement,null,payloadDigest,requestDigest);
    const handle=freeze(declarationResult('DECLARED_LOCAL','NONE',{request:clone(r),declaration,declarationDigest,checkedAt}));
    const state=old??{c,r,entry,auth,measurement,payloadDigest,requestDigest,declaration,declarationDigest,revoked:false,publication:null,transport:null,proofs:null,revokePromise:null};
    declarations.set(handle,state);declarationOperations.set(r.operationId,state);return handle;
   }catch(e){return declarationResult('UNAVAILABLE',failureReason(e));}finally{if(entered)inFlight--;}
  },
  async publishDeclaration(handle,proofs,transport){
   const h=declarations.get(handle);
   try{
    if(!h)stop('DECLARATION_UNAVAILABLE');if(h.revoked)stop('DECLARATION_REVOKED');
    const p=snapshot(proofs,{maxBytes:32768,maxKeys:2,maxDepth:1,maxString:8192});
    if(!exact(p,['principalToken','entitlementToken'])||!Object.values(p).every(v=>typeof v==='string'&&v.length>0&&v.length<=8192)||!isClientDeclarationTransport(transport))stop('TRANSPORT_UNAVAILABLE');
    if(h.publication&& (h.transport!==transport||!same(h.proofs,p)))stop('OPERATION_REBOUND');
    // All token/transport parsing precedes the original synchronous owner fence.
    finalFence(h.entry,h.c,h.r,h.auth,h.measurement,null,h.payloadDigest,h.requestDigest);
    if(h.publication)return await h.publication;
    h.transport=transport;h.proofs=freeze(p);
    // Fixed transport invokes fetch synchronously, before the first await.
    let settle;h.publication=new Promise(resolve=>{settle=resolve;});
    const pending=transport.publish({request:h.r,...p},h.declaration);
    Promise.resolve(pending).then(receipt=>{
     try{if(h.revoked)stop('DECLARATION_REVOKED');finalFence(h.entry,h.c,h.r,h.auth,h.measurement,null,h.payloadDigest,h.requestDigest);}
     catch{invalidateDeclaration(h);return declarationResult('UNAVAILABLE','DECLARATION_REVOKED');}
     if(receipt.decision==='published'&&receipt.generation===h.declarationDigest&&receipt.requestHash===h.declaration.requestHash){h.published=true;return declarationResult('PUBLISHED_CLIENT_DECLARATION','NONE',{declarationDigest:h.declarationDigest,expiresAt:receipt.expiresAt});}
     if(receipt.decision==='outcome_unknown')return declarationResult('PUBLICATION_UNKNOWN','COMMIT_OUTCOME_UNKNOWN');
     return declarationResult('UNAVAILABLE','PUBLICATION_DENIED');
    },()=>declarationResult('PUBLICATION_UNKNOWN','TRANSPORT_OUTCOME_UNKNOWN')).then(settle);
    return await h.publication;
   }catch(e){invalidateDeclaration(h);return declarationResult('UNAVAILABLE',failureReason(e));}
  },
  async reserveDeclaration(handle,transport){
   const h=declarations.get(handle);
   try{
    if(!h||!h.published||!h.proofs||clientReservationTransportOrigin(transport)!==clientDeclarationTransportOrigin(h.transport))stop('RESERVATION_UNAVAILABLE');
    finalFence(h.entry,h.c,h.r,h.auth,h.measurement,null,h.payloadDigest,h.requestDigest);
    if(h.reservationPromise){if(h.reservationTransport!==transport)stop('OPERATION_REBOUND');return await h.reservationPromise;}
    h.reservationTransport=transport;
    // Unknown reserve ACK retains the same operation; never automatic replay.
    let settle;h.reservationPromise=new Promise(resolve=>{settle=resolve;});
    transport.reserve({request:h.r,...h.proofs}).then(receipt=>{
     const denial=observedClientReservationDenial(receipt,transport);if(denial&&same(denial.request,h.r)&&h.r.jobType==='AI_MAINTENANCE'){const answer=declarationResult('MAINTENANCE_CADENCE','MAINTENANCE_CADENCE',{nextEligibilityAt:denial.nextEligibilityAt,observedAt:denial.observedAt});reservationDenials.set(answer,freeze({origin:denial.origin,request:clone(h.r),observedAt:denial.observedAt,nextEligibilityAt:denial.nextEligibilityAt}));return answer;}
     const observed=observedClientReservation(receipt,transport);
     if(!observed||observed.action!=='reserve'||!same(observed.request,h.r))return declarationResult('RESERVATION_UNKNOWN','COMMIT_OUTCOME_UNKNOWN');
     h.serviceReservation=receipt;return declarationResult('RESERVED_SERVICE');
    },()=>declarationResult('RESERVATION_UNKNOWN','TRANSPORT_OUTCOME_UNKNOWN')).then(settle);
    return await h.reservationPromise;
   }catch(e){return declarationResult('UNAVAILABLE',failureReason(e));}
  },
  foundationProvider(bound,transport){
   const h=handles.get(bound),d=h&&declarationOperations.get(h.r.operationId);
   try{
    if(!h||d?.retired||!d?.published||!d.serviceReservation||!d.proofs||clientProviderTransportOrigin(transport)!==clientDeclarationTransportOrigin(d.transport))stop('PROVIDER_UNAVAILABLE');
    const reserved=observedClientReservation(d.serviceReservation,d.reservationTransport);
    if(!reserved||!same(reserved.request,h.r)||reserved.reservationMicros!==h.financial.row.reservationMicros)stop('RESERVATION_UNAVAILABLE');
    finalFence(h.entry,h.c,h.r,h.auth,h.measurement,h.financial,bound.identity.payloadDigest,bound.identity.requestDigest);
    if(d.foundationProvider)return d.providerTransport===transport?d.foundationProvider:null;
    // Own the body in a clearable cell, never in an immutable captured handle or
    // a cached fulfilled Promise. Durable identity/fences remain metadata only.
    const payloadDigest=bound.identity.payloadDigest,requestDigest=bound.identity.requestDigest;
    let body=bound.envelope.body,started=false,retired=false,provider;
    bound=null;
    const contentCurrent=()=>{if(retired)stop('OWNER_DISPOSED');finalFence(h.entry,h.c,h.r,h.auth,h.measurement,null,payloadDigest,requestDigest);return true;};
    const current=()=>{if(retired)stop('OWNER_DISPOSED');finalFence(h.entry,h.c,h.r,h.auth,h.measurement,h.financial,payloadDigest,requestDigest);return true;};
    const retireContent=()=>{retired=true;body=null;d.retired=true;};
    const retire=()=>{retireContent();transport=null;d.proofs=null;d.transport=null;d.reservationTransport=null;d.serviceReservation=null;d.foundationProvider=null;d.providerTransport=null;d.retireContent=null;providerRetirements.delete(retire);};
    const metadata=freeze({request:clone(h.r),origin:reserved.origin,current,contentCurrent,retireContent,retire});
    provider=Object.freeze({
     describe:()=>({providerId:'qwen-service',version:'1',executionKind:'server-backed'}),
     execute(request){
      try{
       if(started||retired)return Promise.resolve(freeze({accepted:false}));
       const q=snapshot(request),c=Object.fromEntries(CHILD.map(k=>[k,q[k]]));if(!same(c,h.c))stop('CHILD_BINDING_MISMATCH');
       const input={bundle:{request:h.r,...d.proofs},declaration:d.declaration,childIdentity:h.c,payload:snapshot(JSON.parse(JSON.parse(body).messages[1].content)),stream:h.stream};
       current();started=true;
       // Exactly one physical client send, immediately after the original fence.
       const sentTransport=transport,sent=sentTransport.execute(input);body=null;
       return sent.then(response=>{
        const observed=observedClientProviderResponse(response,sentTransport);
        if(!observed||!same(observed.request,h.r))return freeze({accepted:false});
        let live=true;try{contentCurrent();}catch{live=false;}
        const accepted=live&&response.decision==='response_received',financial=observed.financialSettlement;
        const result=freeze({accepted,operationReceiptId:financial.receiptId,...(accepted?{value:response.value}:{})});
        foundationResponses.set(result,freeze({provider,request:clone(h.r),origin:observed.origin,financialSettlement:clone(financial),localOutcome:accepted?'RESPONSE_RECORDED':financial.outcome==='FAILED'?'REJECTED':'EXPIRED_UNCOMMITTED'}));return result;
       },()=>freeze({accepted:false}));
      }catch{return Promise.resolve(freeze({accepted:false}));}
     },
     async cancelReservation(){
      if(started||!d.proofs||!d.reservationTransport)return null;
      const receipt=await d.reservationTransport.cancel({request:h.r,...d.proofs}),observed=observedClientReservation(receipt,d.reservationTransport);
      if(!observed||observed.action!=='cancel'||!same(observed.request,h.r))return null;
      return receipt;
     },
     cancellation(receipt){const r=observedClientReservation(receipt,d.reservationTransport);return r?.action==='cancel'&&same(r.request,h.r)?freeze({request:clone(h.r),origin:r.origin,state:'CANCELLED_BEFORE_DISPATCH'}):null;}
    });
    foundationProviders.set(provider,metadata);providerRetirements.add(retire);d.retireContent=retireContent;d.foundationProvider=provider;d.providerTransport=transport;return provider;
   }catch{return null;}
  },
  async revokeDeclaration(handle){
   const h=declarations.get(handle);if(!h)return declarationResult('UNAVAILABLE','DECLARATION_UNAVAILABLE');
   invalidateDeclaration(h);if(!h.revokePromise)return declarationResult('REVOKED_LOCAL');
   const receipt=await h.revokePromise;
   return receipt.decision==='revoked'&&receipt.generation===h.declarationDigest&&receipt.requestHash===h.declaration.requestHash?declarationResult('REVOKED_CLIENT_DECLARATION'):declarationResult('REVOCATION_UNKNOWN');
  },
  async revalidate(result){
   let entered=false;
   try{
    now();if(inFlight>=LIMITS.inFlight)stop('OWNER_BUSY');inFlight++;entered=true;
    const h=handles.get(result);if(!h)stop('BINDING_UNAVAILABLE');const declared=declarationOperations.get(h.r.operationId);if(declared?.revoked)stop('DECLARATION_REVOKED');const at=active(h.entry);if(at>=result.expiresAt)stop('BINDING_EXPIRED');
    const checked=await profile(h.c,h.r,h.stream);if(checked.entry!==h.entry)stop('PROFILE_REBOUND');
    const row=await reservation(h.r,h.entry);if(!same(row.proof,result.identity.reservation)||operations.get(h.r.operationId)!==h.identityDigest)stop('RESERVATION_CHANGED');
    const payload=snapshot(JSON.parse(JSON.parse(result.envelope.body).messages[1].content));
    const proof=await authorize(h.c,h.r,payload,result.identity.payloadDigest,h.entry);
    if(proof.authorizationId!==result.identity.authorizationId||proof.expiresAt!==result.identity.authorizationExpiresAt)stop('PAYLOAD_AUTHORITY_CHANGED');
    if(active(h.entry)>=result.expiresAt)stop('BINDING_EXPIRED');
    const checkedAt=finalFence(h.entry,h.c,h.r,h.auth,h.measurement,h.financial,result.identity.payloadDigest,result.identity.requestDigest);
    // Fresh content/financial metadata validity, never a dispatch capability.
    return freeze({status:'CURRENT_LOCAL',reason:'NONE',checkedAt,wireComplete:true,...authority,identityDigest:h.identityDigest});
   }catch(e){return unavailable(failureReason(e));}finally{if(entered)inFlight--;}
  },
  revoke(id){
   if(disposed||!token(id))return false;const entry=profiles.get(id);
   if(entry){entry.revoked=true;for(const h of declarationOperations.values())if(h.entry===entry)invalidateDeclaration(h);return true;}
   if(profiles.size>=LIMITS.profiles)return false;profiles.set(id,{revoked:true});return true;
  },
  dispose(){
   disposed=true;
   for(const h of declarationOperations.values()){invalidateDeclaration(h);h.proofs=null;}
   for(const retire of providerRetirements)retire();
   profiles.clear();operations.clear();declarationOperations.clear();
   // Drop constructor capabilities too: their host closures can own private data.
   clock=resolveProfile=authorizePayload=tokenize=readReservation=readCurrentBinding=null;
  }
 };
 return Object.freeze(owner);
}
