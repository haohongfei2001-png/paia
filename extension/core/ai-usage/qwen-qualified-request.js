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
import {installedQwenManifestCapability,inspectInstalledQwenSourceProfile,installedQwenSourceRetirementSignal,compileInstalledQwenRequest,prepareInstalledQwenControls,finishInstalledQwenInputBound,isInstalledQwenMeasurement} from './qwen-source-profile.js';
import {boundedSchema,exact,failureReason,freeze,integer,snapshot,stop,token} from './qwen-request-data.js';

const foundationProviders=new WeakMap(),foundationResponses=new WeakMap(),reservationDenials=new WeakMap();
export const qwenReservationDenial=value=>reservationDenials.get(value)??null;
export const qwenFoundationProviderData=provider=>foundationProviders.get(provider)??null;
export const qwenFoundationResponse=(provider,response)=>{const r=foundationResponses.get(response);return r?.provider===provider?r:null;};

const CHILD=['logicalJobId','childOperationId','type','contractVersion','routeVersion','automaticRetries'];
const NUMERIC=['childIndex','childCount','inputTokens','outputCap','maxCompletionTokens'];
const LIMITS=Object.freeze({profiles:16,operations:128,inFlight:8,wireBytes:262144,validityMs:86400000});
const encoder=new TextEncoder(),same=(a,b)=>canonical(a)===canonical(b);
const nativeSignalAborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get,nativeAddListener=EventTarget.prototype.addEventListener,nativeRemoveListener=EventTarget.prototype.removeEventListener;
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
 let clock,resolveProfile,authorizePayload,tokenize,readReservation,readCurrentBinding,preparedContent=null;
 try{
  const keys=['clock','resolveProfile','authorizePayload','tokenize','readReservation','readCurrentBinding'];
  if(!options||![Object.prototype,null].includes(Object.getPrototypeOf(options))||![keys.length,keys.length+1].includes(Reflect.ownKeys(options).length))stop('OWNER_UNAVAILABLE');
  const callbacks=keys.map(k=>{const d=Object.getOwnPropertyDescriptor(options,k);if(!d||!Object.hasOwn(d,'value')||typeof d.value!=='function')stop('OWNER_UNAVAILABLE');return d.value;});
  [clock,resolveProfile,authorizePayload,tokenize,readReservation,readCurrentBinding]=callbacks;
  if(Reflect.ownKeys(options).length===keys.length+1){
   const d=Object.getOwnPropertyDescriptor(options,'preparedContent'),names=['assertMaterialCurrent','isCurrent','chargeRetainedBytes'];
   if(!d||!Object.hasOwn(d,'value')||!d.value||![Object.prototype,null].includes(Object.getPrototypeOf(d.value))||Reflect.ownKeys(d.value).length!==names.length)stop('OWNER_UNAVAILABLE');
   preparedContent=Object.fromEntries(names.map(k=>{const value=Object.getOwnPropertyDescriptor(d.value,k);if(!value||!Object.hasOwn(value,'value')||typeof value.value!=='function')stop('OWNER_UNAVAILABLE');return [k,value.value];}));
  }
  options=null;
 }catch{return Object.freeze({prepareWireControls:async()=>unavailable('OWNER_UNAVAILABLE'),capturePreparedWire:()=>unavailable('OWNER_UNAVAILABLE'),finishPreparedMeasurement:async()=>unavailable('OWNER_UNAVAILABLE'),declarePrepared:async()=>unavailable('OWNER_UNAVAILABLE'),bindPrepared:async()=>unavailable('OWNER_UNAVAILABLE'),bind:async()=>unavailable('OWNER_UNAVAILABLE'),revalidate:async()=>unavailable('OWNER_UNAVAILABLE'),prepareDeclaration:async()=>unavailable('OWNER_UNAVAILABLE'),publishDeclaration:async()=>unavailable('OWNER_UNAVAILABLE'),revokeDeclaration:async()=>unavailable('OWNER_UNAVAILABLE'),reserveDeclaration:async()=>unavailable('OWNER_UNAVAILABLE'),foundationProvider:()=>null,revoke:()=>false,dispose(){}});}
 const profiles=new Map(),operations=new Map(),handles=new WeakMap(),declarations=new WeakMap(),declarationOperations=new Map(),providerRetirements=new Set(),preparedHandles=new WeakMap(),preparedStages=new Set(),preparedOperations=new Set();let disposed=false,lastNow=0,inFlight=0;
 function now(){if(disposed)stop('OWNER_DISPOSED');const n=clock();if(!integer(n)||n<lastNow)stop('CLOCK_UNAVAILABLE');lastNow=n;return n;}
 function active(entry){const n=now();if(entry.revoked||entry.sourceCapability&&!inspectInstalledQwenSourceProfile(entry.sourceCapability))stop('PROFILE_REVOKED');validity(entry.manifest.profile.validity,n);return n;}
 async function profile(c,r,stream,prepareOnly=false){
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
  let compiled,compiler=null;
  if(prepareOnly){
   if(sourceCapability)compiled=prepareInstalledQwenControls(sourceCapability,{childIdentity:c,outputCap:r.outputCap,stream});
   else{compiler=createQwenRequestProfileCompiler({profile:p,known:m.known});compiled=compiler.prepareControls({childIdentity:c,outputCap:r.outputCap,stream,now:now()});}
  }
  else if(sourceCapability)compiled=compileInstalledQwenRequest(sourceCapability,{childIdentity:c,inputTokens:r.inputTokens,outputCap:r.outputCap,stream});
  else{const compiler=createQwenRequestProfileCompiler({profile:p,known:m.known});compiled=compiler.compile({childIdentity:c,inputTokens:r.inputTokens,outputCap:r.outputCap,stream,now:now()});compiler.dispose();}
  if(compiled.status!==(prepareOnly?'CONTROLS_PREPARED':'COMPILED_PARTIAL')){compiler?.dispose();stop('PROFILE_UNAVAILABLE');}
  if(!prepareOnly&&(compiled.billableOutputCap!==r.outputCap||compiled.requestControls.max_completion_tokens!==r.maxCompletionTokens))stop('RESERVATION_BINDING_MISMATCH');
  const signature=canonical(m);let entry=profiles.get(p.id);
  if(entry){if(entry.revoked)stop('PROFILE_REVOKED');if(entry.signature!==signature||entry.sourceCapability!==sourceCapability)stop('PROFILE_REBOUND');}
  else{if(profiles.size>=LIMITS.profiles)stop('PROFILE_CAPACITY');entry={manifest:freeze(m),signature,sourceCapability,revoked:false};profiles.set(p.id,entry);}
  active(entry);return {entry,compiled,compiler};
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
 // Prepared content is a one-way, privately branded cell. All promises and
 // handles settle to metadata; only capture and the two admitted body users
 // (tokenizer and provider parse) can obtain its wire string.
 function retirePrepared(s){
  if(!s)return;s.retired=true;s.phase='RETIRED';s.cell.body=null;
  if(s.timer!==null){clearTimeout(s.timer);s.timer=null;}
  for(const signal of s.signals)nativeRemoveListener.call(signal,'abort',s.onAbort);
  s.signals=[];s.compiler?.dispose();s.compiler=null;preparedStages.delete(s);
 }
 function armPreparedExpiry(s){if(s.timer!==null)clearTimeout(s.timer);s.timer=setTimeout(()=>retirePrepared(s),Math.max(0,s.expiresAt-now()));s.timer.unref?.();}
 function signalAborted(signal){
  try{return nativeSignalAborted.call(signal);}
  catch{stop('LIFECYCLE_UNAVAILABLE');}
 }
 function preparedCurrent(s){
  try{
   if(!s||s.retired)stop('CONTENT_RETIRED');
   const at=active(s.entry);
   if(at>=s.expiresAt||s.signals.some(signalAborted)||!preparedContent||preparedContent.isCurrent()!==true)stop('CONTENT_RETIRED');
   return at;
  }catch(e){retirePrepared(s);throw e;}
 }
 async function refreshPreparedProfile(s){
  const raw=await resolveProfile(freeze({childIdentity:clone(s.c)}));preparedCurrent(s);
  const cap=installedQwenManifestCapability(raw),m=snapshot(raw);
  if(m.profile?.id===s.entry.manifest.profile.id&&m.profile.validity?.revoked===true){s.entry.revoked=true;stop('PROFILE_REVOKED');}
  // The initial schema/controls were validated once. This refresh proves exact
  // immutable metadata/source correspondence without hashing or compiling body.
  if(cap!==s.entry.sourceCapability||!same(m,s.entry.manifest))stop('PROFILE_REBOUND');
  return s.entry;
 }
 async function authorizePrepared(s,r){
  const proof=snapshot(await authorizePayload(freeze({childIdentity:clone(s.c),reservationRequest:clone(r),payloadDigest:s.payloadDigest})));
  authorization(proof,s.c,r,s.payloadDigest,preparedCurrent(s));return freeze(proof);
 }
 function preparedMetadata(s,status){return freeze({status,reason:'NONE',...authority,childIdentity:clone(s.c),profileId:s.entry.manifest.profile.id,inputTokens:s.measurement?.inputTokens??null,outputCap:s.controls.billableOutputCap,maxCompletionTokens:s.controls.requestControls.max_completion_tokens,payloadDigest:s.payloadDigest??null,requestDigest:s.requestDigest??null,expiresAt:s.expiresAt});}
 // Encode immediately; neither this non-async helper nor its digest-only
 // continuation retains a text argument while the crypto operation is pending.
 function digestHex(bytes){return Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');}
 function startTextDigest(text){try{return crypto.subtle.digest('SHA-256',encoder.encode(text)).then(digestHex);}catch(e){return Promise.reject(e);}}
 function settlePreparedDigests(s,pending){
  // This activation receives only a cell/metadata record and digest promise,
  // never capture's payload, text, envelope or wire-local lexical environment.
  return pending.then(([payloadDigest,requestDigest])=>{
   preparedCurrent(s);s.payloadDigest=payloadDigest;s.requestDigest=requestDigest;return preparedMetadata(s,'CAPTURED');
  }).catch(e=>{retirePrepared(s);return unavailable(failureReason(e));});
 }
 function measurePrepared(s){
  return (async()=>{
   try{
    const digests=await s.digestPromise;if(digests.status==='UNAVAILABLE')stop(digests.reason);preparedCurrent(s);
    await preparedContent.assertMaterialCurrent();preparedCurrent(s);
    const m=s.entry.manifest;
    // No envelope local survives this await. The original tokenizer owns its
    // bounded in-flight argument; retirement permanently clears our sole cell.
    const raw=await tokenize(freeze({profileId:m.profile.id,tokenizerProfileId:m.tokenizer.profileId,qualificationRef:m.tokenizer.qualificationRef,requestDigest:s.requestDigest,envelope:{method:'POST',endpoint:{scheme:'https',host:m.profile.endpoint.host,path:m.profile.endpoint.path},headers:{'Content-Type':'application/json'},body:s.cell.body}}));
    preparedCurrent(s);
    if(s.entry.sourceCapability&&!isInstalledQwenMeasurement(raw,s.entry.sourceCapability))stop('TOKENIZER_SOURCE_UNAVAILABLE');
    const measurement=snapshot(raw),at=preparedCurrent(s);
    if(!exact(measurement,['profileId','tokenizerProfileId','qualificationRef','requestDigest','contentTokens','protocolOverheadTokens','inputTokens','expiresAt'])||measurement.profileId!==m.profile.id||measurement.tokenizerProfileId!==m.tokenizer.profileId||measurement.qualificationRef!==m.tokenizer.qualificationRef||measurement.requestDigest!==s.requestDigest||!['contentTokens','protocolOverheadTokens','inputTokens','expiresAt'].every(k=>integer(measurement[k]))||measurement.protocolOverheadTokens!==m.tokenizer.protocolOverheadTokens||measurement.inputTokens!==measurement.contentTokens+measurement.protocolOverheadTokens||measurement.expiresAt<=at||measurement.expiresAt>m.profile.validity.expiresAt)stop('TOKENIZER_BINDING_MISMATCH');
    const compiled=s.entry.sourceCapability?finishInstalledQwenInputBound(s.entry.sourceCapability,s.controls,{inputTokens:measurement.inputTokens}):s.compiler.finishInputBound(s.controls,{inputTokens:measurement.inputTokens,now:at});
    s.compiler?.dispose();s.compiler=null;
    if(compiled.status!=='COMPILED_PARTIAL')stop('REQUEST_BOUND');
    preparedCurrent(s);s.measurement=freeze(measurement);s.compiled=compiled;s.expiresAt=Math.min(s.expiresAt,measurement.expiresAt);armPreparedExpiry(s);s.phase='MEASURED';return preparedMetadata(s,'MEASURED');
   }catch(e){retirePrepared(s);return unavailable(failureReason(e));}
  })();
 }
 function preparedFoundationProvider(bound,transport,h,d,reserved){
  const s=h.prepared;preparedCurrent(s);if(s.phase!=='BOUND'||s.cell.body===null)stop('PREPARED_UNAVAILABLE');
  const payloadDigest=bound.identity.payloadDigest,requestDigest=bound.identity.requestDigest;
  let started=false,executionSignal=null,provider;s.phase='PROVIDER';
  const lifecycleCurrent=()=>{preparedCurrent(s);if(executionSignal&&signalAborted(executionSignal)){retirePrepared(s);stop('CONTENT_RETIRED');}};
  const contentCurrent=()=>{lifecycleCurrent();finalFence(h.entry,h.c,h.r,h.auth,h.measurement,null,payloadDigest,requestDigest);return true;};
  const current=()=>{lifecycleCurrent();finalFence(h.entry,h.c,h.r,h.auth,h.measurement,h.financial,payloadDigest,requestDigest);return true;};
  const retireContent=()=>{retirePrepared(s);d.retired=true;};
  const retire=()=>{retireContent();transport=null;d.proofs=null;d.transport=null;d.reservationTransport=null;d.serviceReservation=null;d.foundationProvider=null;d.providerTransport=null;d.retireContent=null;d.assertPreparedCurrent=null;providerRetirements.delete(retire);};
  const metadata=freeze({request:clone(h.r),origin:reserved.origin,payloadDigest,current,contentCurrent,retireContent,retire});
  const consume=async()=>{
   try{
    await preparedContent.assertMaterialCurrent();current();
    if(s.cell.body===null)stop('CONTENT_RETIRED');
    // The original transport takes its own bounded snapshot synchronously. The
    // Qwen cell is cleared before awaiting transport, never cached in a result.
    const sentTransport=transport,sent=sentTransport.execute({bundle:{request:h.r,...d.proofs},declaration:d.declaration,childIdentity:h.c,payload:snapshot(JSON.parse(JSON.parse(s.cell.body).messages[1].content)),stream:h.stream});
    s.cell.body=null;s.phase='SENT';
    return sent.then(response=>{
     const observed=observedClientProviderResponse(response,sentTransport);
     if(!observed||!same(observed.request,h.r)){retireContent();return freeze({accepted:false});}
     let live=true;try{contentCurrent();}catch{live=false;}
     const accepted=live&&response.decision==='response_received',financial=observed.financialSettlement;
     const result=freeze({accepted,operationReceiptId:financial.receiptId,...(accepted?{value:response.value}:{})});
     foundationResponses.set(result,freeze({provider,request:clone(h.r),origin:observed.origin,financialSettlement:clone(financial),localOutcome:accepted?'RESPONSE_RECORDED':financial.outcome==='FAILED'?'REJECTED':'EXPIRED_UNCOMMITTED'}));
     // Content is already gone. Keep metadata currentness available for the
     // original Foundation publication fence and late financial settlement.
     if(!accepted)retireContent();else s.phase='RESPONSE';return result;
    },()=>{retireContent();return freeze({accepted:false});});
   }catch{retireContent();return freeze({accepted:false});}
  };
  provider=Object.freeze({
   describe:()=>({providerId:'qwen-service',version:'1',executionKind:'server-backed'}),
   execute(request,execution){
    try{
     if(started||s.retired)return Promise.resolve(freeze({accepted:false}));started=true;s.phase='CONSUMING';
     if(execution!==undefined){
      if(!execution||![Object.prototype,null].includes(Object.getPrototypeOf(execution))||Reflect.ownKeys(execution).length!==1)stop('LIFECYCLE_UNAVAILABLE');
      const descriptor=Object.getOwnPropertyDescriptor(execution,'signal');if(!descriptor||!Object.hasOwn(descriptor,'value'))stop('LIFECYCLE_UNAVAILABLE');executionSignal=descriptor.value;
      if(signalAborted(executionSignal))stop('CONTENT_RETIRED');
      if(!s.signals.includes(executionSignal)){s.signals.push(executionSignal);nativeAddListener.call(executionSignal,'abort',s.onAbort,{once:true});}
     }
     const q=snapshot(request),c=Object.fromEntries(CHILD.map(k=>[k,q[k]]));if(!same(c,h.c))stop('CHILD_BINDING_MISMATCH');
     current();return consume();
    }catch{retireContent();return Promise.resolve(freeze({accepted:false}));}
   },
   async cancelReservation(){
    if(started||!d.proofs||!d.reservationTransport)return null;
    const receipt=await d.reservationTransport.cancel({request:h.r,...d.proofs}),observed=observedClientReservation(receipt,d.reservationTransport);
    if(!observed||observed.action!=='cancel'||!same(observed.request,h.r))return null;return receipt;
   },
   cancellation(receipt){const r=observedClientReservation(receipt,d.reservationTransport);return r?.action==='cancel'&&same(r.request,h.r)?freeze({request:clone(h.r),origin:r.origin,state:'CANCELLED_BEFORE_DISPATCH'}):null;}
  });
  foundationProviders.set(provider,metadata);providerRetirements.add(retire);d.retireContent=retireContent;d.foundationProvider=provider;d.providerTransport=transport;return provider;
 }
 const owner={
  async prepareWireControls(value){
   let entered=false,s=null,compiler=null;
   try{
    now();if(!preparedContent)stop('CONTENT_OWNER_UNAVAILABLE');if(inFlight>=LIMITS.inFlight||preparedStages.size>=ENVELOPES.AI_ORGANIZE.children)stop('OWNER_BUSY');inFlight++;entered=true;
    const o=snapshot(value);if(!exact(o,['childIdentity','outputCap','stream'])||o.childIdentity?.type!=='AI_ORGANIZE'||typeof o.stream!=='boolean')stop('REQUEST_UNAVAILABLE');
    const ready=await profile(o.childIdentity,{outputCap:o.outputCap},o.stream,true);compiler=ready.compiler;
    if(disposed||!preparedContent||preparedContent.isCurrent()!==true)stop('CONTENT_RETIRED');
    if(preparedStages.size>=ENVELOPES.AI_ORGANIZE.children)stop('OWNER_BUSY');
    if(preparedOperations.has(o.childIdentity.childOperationId))stop('OPERATION_REBOUND');if(preparedOperations.size>=LIMITS.operations)stop('OPERATION_CAPACITY');
    const controls=ready.compiled,handle=freeze({...controls,outputCap:controls.billableOutputCap,maxCompletionTokens:controls.requestControls.max_completion_tokens});
    s={c:freeze(o.childIdentity),entry:ready.entry,controls,compiler,stream:o.stream,phase:'CONTROLS',cell:{body:null},retired:false,expiresAt:ready.entry.manifest.profile.validity.expiresAt,signals:[],onAbort:null,timer:null,digestPromise:null,measurementPromise:null};
    s.onAbort=()=>retirePrepared(s);
    // Subscribe to the original installed source before publishing a controls
    // handle. Retirement must clear a captured cell even while all callers are
    // suspended in digest/current/tokenizer work. This signal only denies use.
    if(s.entry.sourceCapability){
     const signal=installedQwenSourceRetirementSignal(s.entry.sourceCapability);if(!signal||signalAborted(signal))stop('PROFILE_REVOKED');
     s.signals.push(signal);nativeAddListener.call(signal,'abort',s.onAbort,{once:true});preparedCurrent(s);
    }
    preparedHandles.set(handle,s);preparedStages.add(s);preparedOperations.add(s.c.childOperationId);return handle;
   }catch(e){compiler?.dispose();retirePrepared(s);return unavailable(failureReason(e));}finally{if(entered)inFlight--;}
  },
  capturePreparedWire(handle,payload,lifecycle){
   const s=preparedHandles.get(handle);
   try{
    if(!s||s.phase!=='CONTROLS')stop('PREPARED_UNAVAILABLE');s.phase='CAPTURING';preparedCurrent(s);
    if(!lifecycle||![Object.prototype,null].includes(Object.getPrototypeOf(lifecycle)))stop('LIFECYCLE_UNAVAILABLE');
    const names=Reflect.ownKeys(lifecycle);if(!['signal','expiresAt'].every(k=>names.includes(k))||names.some(k=>!['signal','expiresAt','sessionSignal'].includes(k)))stop('LIFECYCLE_UNAVAILABLE');
    const meta=Object.fromEntries(names.map(k=>{const d=Object.getOwnPropertyDescriptor(lifecycle,k);if(!d||!Object.hasOwn(d,'value'))stop('LIFECYCLE_UNAVAILABLE');return [k,d.value];}));
    if(!integer(meta.expiresAt)||meta.expiresAt<=preparedCurrent(s))stop('CONTENT_RETIRED');
    const signals=[meta.signal,...(Object.hasOwn(meta,'sessionSignal')?[meta.sessionSignal]:[])];if(signals.some(signalAborted))stop('CONTENT_RETIRED');
    s.expiresAt=Math.min(s.expiresAt,meta.expiresAt);
    // Preserve the already subscribed installed-source lifetime. Action and
    // optional session signals restrict the same cell; none replaces another.
    for(const signal of signals)if(!s.signals.includes(signal)){s.signals.push(signal);nativeAddListener.call(signal,'abort',s.onAbort,{once:true});}
    const p=snapshot(payload);if(!p||Array.isArray(p)||typeof p!=='object')stop('REQUEST_UNAVAILABLE');
    const text=canonical(p);if(encoder.encode(text).length>49152)stop('WIRE_BOUND');
    const m=s.entry.manifest,body=canonical({model:m.profile.model.requested,messages:[{role:'system',content:m.wire.instructions},{role:'user',content:text}],response_format:m.wire.responseFormat,...s.controls.requestControls,...m.wire.thinkingControls,n:1}),bytes=encoder.encode(body).length;
    if(bytes>m.tokenizer.maxWireBytes)stop('WIRE_BOUND');
    const charged=preparedContent.chargeRetainedBytes(bytes);if(charged!==undefined&&charged!==true)stop('CONTENT_BOUND');
    preparedCurrent(s);if(s.phase!=='CAPTURING')stop('PREPARED_UNAVAILABLE');
    s.cell.body=body;s.phase='CAPTURED';armPreparedExpiry(s);
    s.digestPromise=settlePreparedDigests(s,Promise.all([startTextDigest(text),startTextDigest(canonical({method:'POST',endpoint:{scheme:'https',host:m.profile.endpoint.host,path:m.profile.endpoint.path},headers:{'Content-Type':'application/json'},body}))]));
    return preparedMetadata(s,'CAPTURED');
   }catch(e){retirePrepared(s);return unavailable(failureReason(e));}
  },
  async finishPreparedMeasurement(handle){
   const s=preparedHandles.get(handle);
   try{
    if(!s)stop('PREPARED_UNAVAILABLE');preparedCurrent(s);
    if(s.measurementPromise)return await s.measurementPromise;
    if(s.phase!=='CAPTURED')stop('PREPARED_UNAVAILABLE');s.phase='MEASURING';s.measurementPromise=measurePrepared(s);return await s.measurementPromise;
   }catch(e){retirePrepared(s);return unavailable(failureReason(e));}
  },
  async declarePrepared(handle,reservationRequest){
   const s=preparedHandles.get(handle);let entered=false;
   try{
    if(!s||s.phase!=='MEASURED')stop('PREPARED_UNAVAILABLE');preparedCurrent(s);if(inFlight>=LIMITS.inFlight)stop('OWNER_BUSY');inFlight++;entered=true;s.phase='DECLARING';
    const r=snapshot(reservationRequest);identities(s.c,r);
    if(r.inputTokens!==s.measurement.inputTokens||r.outputCap!==s.compiled.billableOutputCap||r.maxCompletionTokens!==s.compiled.requestControls.max_completion_tokens)stop('RESERVATION_BINDING_MISMATCH');
    s.r=freeze(r);const auth=await authorizePrepared(s,r);s.auth=auth;
    await refreshPreparedProfile(s);const again=await authorizePrepared(s,r);if(!same(again,auth))stop('PAYLOAD_AUTHORITY_CHANGED');
    const requestHash=await hashText(canonical(r));preparedCurrent(s);
    const scopeDigest=await hashText(canonical({childIdentity:s.c,reservationRequest:r,authorizationId:auth.authorizationId}));preparedCurrent(s);
    s.expiresAt=Math.min(s.expiresAt,auth.expiresAt);armPreparedExpiry(s);
    const declaration=clientDeclarationData({version:1,requestHash,payloadDigest:s.payloadDigest,scopeDigest,contentGeneration:s.payloadDigest,consentEpoch:r.consentEpoch,authorizationId:auth.authorizationId,expiresAt:s.expiresAt});
    const declarationDigest=await hashText(clientDeclarationCanonical(declaration));preparedCurrent(s);
    const old=declarationOperations.get(r.operationId);if(old)stop(old.revoked?'DECLARATION_REVOKED':'OPERATION_REBOUND');if(declarationOperations.size>=LIMITS.operations)stop('OPERATION_CAPACITY');
    const checkedAt=finalFence(s.entry,s.c,r,auth,s.measurement,null,s.payloadDigest,s.requestDigest);
    const result=freeze(declarationResult('DECLARED_LOCAL','NONE',{request:clone(r),declaration,declarationDigest,checkedAt}));
    const state={c:s.c,r:s.r,entry:s.entry,auth,measurement:s.measurement,payloadDigest:s.payloadDigest,requestDigest:s.requestDigest,declaration,declarationDigest,revoked:false,publication:null,transport:null,proofs:null,revokePromise:null,prepared:true,assertPreparedCurrent:()=>preparedCurrent(s),retireContent:()=>retirePrepared(s)};
    declarations.set(result,state);declarationOperations.set(r.operationId,state);s.phase='DECLARED';return result;
   }catch(e){retirePrepared(s);return declarationResult('UNAVAILABLE',failureReason(e));}finally{if(entered)inFlight--;}
  },
  async bindPrepared(handle){
   const s=preparedHandles.get(handle);let entered=false;
   try{
    if(!s||s.phase!=='DECLARED')stop('PREPARED_UNAVAILABLE');preparedCurrent(s);if(inFlight>=LIMITS.inFlight)stop('OWNER_BUSY');inFlight++;entered=true;s.phase='BINDING';
    const {c,r,entry,auth,measurement,payloadDigest,requestDigest}=s,m=entry.manifest,d=declarationOperations.get(r.operationId);
    if(!d||d.revoked||d.payloadDigest!==payloadDigest)stop(d?.revoked?'DECLARATION_REVOKED':'OPERATION_REBOUND');
    const financial=await reservation(r,entry);preparedCurrent(s);
    await refreshPreparedProfile(s);const finalAuth=await authorizePrepared(s,r);if(!same(auth,finalAuth))stop('PAYLOAD_AUTHORITY_CHANGED');
    const finalFinancial=await reservation(r,entry);if(!same(financial,finalFinancial))stop('RESERVATION_CHANGED');preparedCurrent(s);
    const identity=freeze({childIdentity:clone(c),profileId:m.profile.id,payloadDigest,requestDigest,authorizationId:auth.authorizationId,authorizationExpiresAt:auth.expiresAt,tokenizer:measurement,reservation:financial.proof});
    const identityDigest=await hashText(canonical(identity));preparedCurrent(s);
    const checkedAt=finalFence(entry,c,r,auth,measurement,financial,payloadDigest,requestDigest);
    const old=operations.get(r.operationId);if(old&&old!==identityDigest)stop('OPERATION_REBOUND');if(!old&&operations.size>=LIMITS.operations)stop('OPERATION_CAPACITY');operations.set(r.operationId,identityDigest);
    const result=freeze({status:'BOUND_LOCAL',reason:'NONE',checkedAt,wireComplete:true,localBindingComplete:true,...authority,identity,identityDigest,expiresAt:s.expiresAt,usageBinding:s.compiled.binding});
    handles.set(result,{entry,c,r,auth,measurement,financial,stream:s.stream,identityDigest,prepared:s});s.phase='BOUND';return result;
   }catch(e){retirePrepared(s);return unavailable(failureReason(e));}finally{if(entered)inFlight--;}
  },

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
    h.assertPreparedCurrent?.();finalFence(h.entry,h.c,h.r,h.auth,h.measurement,null,h.payloadDigest,h.requestDigest);
    if(h.publication)return await h.publication;
    h.transport=transport;h.proofs=freeze(p);
    // Fixed transport invokes fetch synchronously, before the first await.
    let settle;h.publication=new Promise(resolve=>{settle=resolve;});
    const pending=transport.publish({request:h.r,...p},h.declaration);
    Promise.resolve(pending).then(receipt=>{
     try{if(h.revoked)stop('DECLARATION_REVOKED');h.assertPreparedCurrent?.();finalFence(h.entry,h.c,h.r,h.auth,h.measurement,null,h.payloadDigest,h.requestDigest);}
     catch{invalidateDeclaration(h);return declarationResult('UNAVAILABLE','DECLARATION_REVOKED');}
     if(receipt.decision==='published'&&receipt.generation===h.declarationDigest&&receipt.requestHash===h.declaration.requestHash){h.published=true;return declarationResult('PUBLISHED_CLIENT_DECLARATION','NONE',{declarationDigest:h.declarationDigest,expiresAt:receipt.expiresAt});}
     if(h.prepared)h.retireContent?.();
     if(receipt.decision==='outcome_unknown')return declarationResult('PUBLICATION_UNKNOWN','COMMIT_OUTCOME_UNKNOWN');
     return declarationResult('UNAVAILABLE','PUBLICATION_DENIED');
    },()=>{if(h.prepared)h.retireContent?.();return declarationResult('PUBLICATION_UNKNOWN','TRANSPORT_OUTCOME_UNKNOWN');}).then(settle);
    return await h.publication;
   }catch(e){invalidateDeclaration(h);return declarationResult('UNAVAILABLE',failureReason(e));}
  },
  async reserveDeclaration(handle,transport){
   const h=declarations.get(handle);
   try{
    if(!h||!h.published||!h.proofs||clientReservationTransportOrigin(transport)!==clientDeclarationTransportOrigin(h.transport))stop('RESERVATION_UNAVAILABLE');
    h.assertPreparedCurrent?.();finalFence(h.entry,h.c,h.r,h.auth,h.measurement,null,h.payloadDigest,h.requestDigest);
    if(h.reservationPromise){if(h.reservationTransport!==transport)stop('OPERATION_REBOUND');return await h.reservationPromise;}
    h.reservationTransport=transport;
    // Unknown reserve ACK retains the same operation; never automatic replay.
    let settle;h.reservationPromise=new Promise(resolve=>{settle=resolve;});
    transport.reserve({request:h.r,...h.proofs}).then(receipt=>{
     const denial=observedClientReservationDenial(receipt,transport);if(denial&&same(denial.request,h.r)&&h.r.jobType==='AI_MAINTENANCE'){const answer=declarationResult('MAINTENANCE_CADENCE','MAINTENANCE_CADENCE',{nextEligibilityAt:denial.nextEligibilityAt,observedAt:denial.observedAt});reservationDenials.set(answer,freeze({origin:denial.origin,request:clone(h.r),observedAt:denial.observedAt,nextEligibilityAt:denial.nextEligibilityAt}));return answer;}
     const observed=observedClientReservation(receipt,transport);
     if(!observed||observed.action!=='reserve'||!same(observed.request,h.r)){if(h.prepared)h.retireContent?.();return declarationResult('RESERVATION_UNKNOWN','COMMIT_OUTCOME_UNKNOWN');}
     h.serviceReservation=receipt;return declarationResult('RESERVED_SERVICE');
    },()=>{if(h.prepared)h.retireContent?.();return declarationResult('RESERVATION_UNKNOWN','TRANSPORT_OUTCOME_UNKNOWN');}).then(settle);
    return await h.reservationPromise;
   }catch(e){if(h?.prepared)h.retireContent?.();return declarationResult('UNAVAILABLE',failureReason(e));}
  },
  foundationProvider(bound,transport){
   const h=handles.get(bound),d=h&&declarationOperations.get(h.r.operationId);
   try{
    if(!h||d?.retired||!d?.published||!d.serviceReservation||!d.proofs||clientProviderTransportOrigin(transport)!==clientDeclarationTransportOrigin(d.transport))stop('PROVIDER_UNAVAILABLE');
    const reserved=observedClientReservation(d.serviceReservation,d.reservationTransport);
    if(!reserved||!same(reserved.request,h.r)||reserved.reservationMicros!==h.financial.row.reservationMicros)stop('RESERVATION_UNAVAILABLE');
    finalFence(h.entry,h.c,h.r,h.auth,h.measurement,h.financial,bound.identity.payloadDigest,bound.identity.requestDigest);
    if(d.foundationProvider)return d.providerTransport===transport?d.foundationProvider:null;
    if(h.prepared)return preparedFoundationProvider(bound,transport,h,d,reserved);
    // Own the body in a clearable cell, never in an immutable captured handle or
    // a cached fulfilled Promise. Durable identity/fences remain metadata only.
    const payloadDigest=bound.identity.payloadDigest,requestDigest=bound.identity.requestDigest;
    let body=bound.envelope.body,started=false,retired=false,provider;
    bound=null;
    const contentCurrent=()=>{if(retired)stop('OWNER_DISPOSED');finalFence(h.entry,h.c,h.r,h.auth,h.measurement,null,payloadDigest,requestDigest);return true;};
    const current=()=>{if(retired)stop('OWNER_DISPOSED');finalFence(h.entry,h.c,h.r,h.auth,h.measurement,h.financial,payloadDigest,requestDigest);return true;};
    const retireContent=()=>{retired=true;body=null;d.retired=true;};
    const retire=()=>{retireContent();transport=null;d.proofs=null;d.transport=null;d.reservationTransport=null;d.serviceReservation=null;d.foundationProvider=null;d.providerTransport=null;d.retireContent=null;providerRetirements.delete(retire);};
    const metadata=freeze({request:clone(h.r),origin:reserved.origin,payloadDigest,current,contentCurrent,retireContent,retire});
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
   }catch{if(h?.prepared)retirePrepared(h.prepared);return null;}
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
    if(h.prepared){
     const s=h.prepared;preparedCurrent(s);await refreshPreparedProfile(s);
     const row=await reservation(h.r,h.entry);preparedCurrent(s);if(!same(row.proof,result.identity.reservation)||operations.get(h.r.operationId)!==h.identityDigest)stop('RESERVATION_CHANGED');
     const proof=await authorizePrepared(s,h.r);if(!same(proof,h.auth))stop('PAYLOAD_AUTHORITY_CHANGED');preparedCurrent(s);
     const checkedAt=finalFence(h.entry,h.c,h.r,h.auth,h.measurement,h.financial,result.identity.payloadDigest,result.identity.requestDigest);
     return freeze({status:'CURRENT_LOCAL',reason:'NONE',checkedAt,wireComplete:true,...authority,identityDigest:h.identityDigest});
    }
    const checked=await profile(h.c,h.r,h.stream);if(checked.entry!==h.entry)stop('PROFILE_REBOUND');
    const row=await reservation(h.r,h.entry);if(!same(row.proof,result.identity.reservation)||operations.get(h.r.operationId)!==h.identityDigest)stop('RESERVATION_CHANGED');
    const payload=snapshot(JSON.parse(JSON.parse(result.envelope.body).messages[1].content));
    const proof=await authorize(h.c,h.r,payload,result.identity.payloadDigest,h.entry);
    if(proof.authorizationId!==result.identity.authorizationId||proof.expiresAt!==result.identity.authorizationExpiresAt)stop('PAYLOAD_AUTHORITY_CHANGED');
    if(active(h.entry)>=result.expiresAt)stop('BINDING_EXPIRED');
    const checkedAt=finalFence(h.entry,h.c,h.r,h.auth,h.measurement,h.financial,result.identity.payloadDigest,result.identity.requestDigest);
    // Fresh content/financial metadata validity, never a dispatch capability.
    return freeze({status:'CURRENT_LOCAL',reason:'NONE',checkedAt,wireComplete:true,...authority,identityDigest:h.identityDigest});
   }catch(e){retirePrepared(handles.get(result)?.prepared);return unavailable(failureReason(e));}finally{if(entered)inFlight--;}
  },
  revoke(id){
   if(disposed||!token(id))return false;const entry=profiles.get(id);
   if(entry){entry.revoked=true;for(const s of preparedStages)if(s.entry===entry)retirePrepared(s);for(const h of declarationOperations.values())if(h.entry===entry)invalidateDeclaration(h);return true;}
   if(profiles.size>=LIMITS.profiles)return false;profiles.set(id,{revoked:true});return true;
  },
  dispose(){
   disposed=true;
   for(const s of preparedStages)retirePrepared(s);
   for(const h of declarationOperations.values()){invalidateDeclaration(h);h.proofs=null;}
   for(const retire of providerRetirements)retire();
   profiles.clear();operations.clear();declarationOperations.clear();
   // Drop constructor capabilities too: their host closures can own private data.
   clock=resolveProfile=authorizePayload=tokenize=readReservation=readCurrentBinding=preparedContent=null;
  }
 };
 return Object.freeze(owner);
}
