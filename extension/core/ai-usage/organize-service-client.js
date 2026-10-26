import {savedFinancialCancellation} from './domain-result-receipt.js';
import {clientDeclarationRequestData} from './client-declaration.js';
import {canonical,equal,fail} from './contracts.js';
import {snapshot,freeze,exact,integer,token} from './qwen-request-data.js';
import {hashText} from '../dedupe.js';
import {ENVELOPES} from './admission-policy.js';
import {validOrganizeCacheProfile} from '../organizer/organize-cache-qualification.js';
import {createQwenManifestCompiler,readQwenProfileManifest,readQwenTokenMeasurement} from './qwen-profile-source-adapter.js';
import {createQwenQualifiedRequestOwner,qwenFoundationProviderData} from './qwen-qualified-request.js';
import {createClientDeclarationTransport} from './client-declaration-transport.js';
import {createClientReservationTransport} from './client-reservation-transport.js';
import {createClientProviderTransport} from './client-provider-transport.js';
import {createClientResultTransport} from './client-result-transport.js';
import {createClientOperationStatusTransport,observedClientOperationStatus} from './client-operation-status-transport.js';
const recoveries=new WeakMap(),clients=new WeakSet(),FLIGHT='aiu:organize-service-preflight:v1:';
const terminal=new Set(['COMMITTED','REJECTED','EXPIRED_UNCOMMITTED','CANCELLED_BEFORE_DISPATCH']);
const callbacks=['clock','resolveAuthority','onInvalidate','readProfile','currentProfile','tokenize','isCurrentTokenizer','readProofs'];
export const requireOrganizeServiceClient=value=>{if(!clients.has(value))fail('UNAVAILABLE');return value;};
// This is a client composition of the original declaration, Qwen, financial and
// result owners. It cannot issue identities, qualify profiles or settle money.
export function createOrganizeServiceClient(configuration){
 let c;try{
  if(!configuration||![Object.prototype,null].includes(Object.getPrototypeOf(configuration)))return null;
  const ds=Object.getOwnPropertyDescriptors(configuration),keys=Reflect.ownKeys(ds),required=['origin','profile','routeVersion',...callbacks];
  if(!keys.every(k=>[...required,'fetch'].includes(k))||!required.every(k=>keys.includes(k))||keys.some(k=>!Object.hasOwn(ds[k],'value')))return null;
  c=Object.fromEntries(keys.map(k=>[k,ds[k].value]));if(Object.hasOwn(c,'fetch')&&typeof c.fetch!=='function'||!callbacks.every(k=>typeof c[k]==='function')||!validOrganizeCacheProfile(c.profile)||!token(c.routeVersion))return null;
  c.profile=freeze(snapshot(c.profile));const url=new URL(c.origin);if(url.origin!==c.origin||url.protocol!=='https:'||url.port||url.username||url.password)return null;
 }catch{return null;}
 const transport=(factory,path)=>factory({endpoint:c.origin+path,...(c.fetch?{fetch:c.fetch}:{})}),declarations=transport(createClientDeclarationTransport,'/api/declarations'),reservations=transport(createClientReservationTransport,'/api/reservations'),results=transport(createClientResultTransport,'/api/results'),status=transport(createClientOperationStatusTransport,'/api/operation-status');
 if([declarations,reservations,results,status].some(x=>!x))return null;
 let disposed=false;const active=new Set(),sourceOperations=new WeakMap(),current=()=>{if(disposed)fail('UNAVAILABLE');};
 async function preflight(t,topicId){
  const previous=await t.get('meta',FLIGHT+topicId);if(!previous)return;
  const job=await t.get('organizerJobs',previous.jobId);if(!job||!terminal.has(job.state)||!job.domainResultReceipt)fail('OUTCOME_UNKNOWN');
  // A local cancellation never releases a service hold. All original child
  // settlements/cancel ACKs must exist before a different explicit operation.
  for(const childId of job.childIds){const r=await t.get('organizerUsage','aiu:attempt:'+childId);if(r?.executionKind!=='server-backed'||r.financialSettlement?.state!=='SETTLED'&&!savedFinancialCancellation(r))fail('OUTCOME_UNKNOWN');}
 }
 async function createSourceStage(childIdentity,{assertCurrent,chargeRetainedBytes,live,requireLive}){
  let manifest=null,measurement=null,request=null,proofs=null,authorization=null,reservation=null;
  const qualified=()=>live()&&measurement!==null&&c.isCurrentTokenizer(measurement)===true;
  const acceptMeasurement=value=>{requireLive();const measured=readQwenTokenMeasurement(manifest,value);if(!integer(measured.inputTokens)||c.isCurrentTokenizer(measured)!==true)fail('UNAVAILABLE');measurement=measured;return measured;};
  const owner=createQwenQualifiedRequestOwner({clock:c.clock,
   resolveProfile:async q=>{requireLive();const next=readQwenProfileManifest(await c.readProfile(q));requireLive();if(next.profile.contractVersion!==c.profile.contractVersion||next.profile.routeVersion!==c.routeVersion||next.profile.model.resolutionVersion!==c.profile.modelVersion||await hashText(canonical(next.wire))!==c.profile.promptVersion)fail('UNAVAILABLE');requireLive();manifest=next;return next;},
   authorizePayload:async q=>{requireLive();if(!qualified()||!authorization||!equal(q.childIdentity,childIdentity)||!equal(q.reservationRequest,request)||q.payloadDigest!==authorization.payloadDigest||Object.hasOwn(q,'payload'))fail('STALE_BASE');return structuredClone(authorization);},
   tokenize:q=>{requireLive();return Promise.resolve(c.tokenize(q)).then(acceptMeasurement);},
   readReservation:async r=>{requireLive();if(!equal(r,request))fail('STALE_BASE');const observation=await status.query({request,...proofs});requireLive();if(!observedClientOperationStatus(observation,status)||!observation.reservation)fail('OUTCOME_UNKNOWN');reservation=observation.reservation;return structuredClone(reservation);},
   readCurrentBinding:()=>({now:c.clock(),profile:c.currentProfile(),authorization:qualified()?authorization:null,tokenizer:qualified()?measurement:null,reservation}),
   preparedContent:{assertMaterialCurrent:assertCurrent,isCurrent:live,chargeRetainedBytes}
  });
  try{
   // Resolve profile in the original Qwen owner before protected body capture.
   const control=await owner.prepareWireControls({childIdentity,outputCap:ENVELOPES.AI_ORGANIZE.output,stream:false});requireLive();
   if(control.status!=='CONTROLS_PREPARED')fail(control.reason??'UNAVAILABLE');
   const stage={owner,control,childIdentity,captured:false,request:null,proofs:null,declaration:null,
    async authorize(next,measured){
     requireLive();if(request!==null||!measurement||measured.inputTokens!==measurement.inputTokens||!equal(measured.childIdentity,childIdentity))fail('STALE_BASE');
     request=freeze(snapshot(next));proofs=freeze(snapshot(await c.readProofs(structuredClone(request)),{maxBytes:24576,maxKeys:2,maxDepth:1,maxString:8192}));requireLive();
     if(!exact(proofs,['principalToken','entitlementToken'])||!Object.values(proofs).every(x=>typeof x==='string'&&x.length>0&&x.length<=8192))fail('UNAVAILABLE');
     authorization=freeze({authorizationId:'organize:'+childIdentity.childOperationId,childIdentity:structuredClone(childIdentity),reservationRequest:structuredClone(request),payloadDigest:measured.payloadDigest,expiresAt:Math.min(manifest.profile.validity.expiresAt,measurement.expiresAt)});
     stage.request=request;stage.proofs=proofs;
    }
   };return stage;
  }catch(error){owner.dispose();throw error;}
 }
 const client={
  sessionOptions:Object.freeze({resolveAuthority:c.resolveAuthority,profile:c.profile,routeVersion:c.routeVersion,incrementalVersion:3}),
  available:()=>!disposed,onInvalidate:fn=>c.onInvalidate(fn),
  async recover(foundation,topicId,{retainJob,isCurrent}){
   current();let map=recoveries.get(foundation.s);if(!map){map=new Map();recoveries.set(foundation.s,map);}const pending=map.get(topicId);if(pending){if(pending.origin!==c.origin)fail('RESULT_ORIGIN_MISMATCH');return pending.task;}
   const task=(async()=>{
    const handle=await foundation.organizeRecovery(c.origin,topicId);current();if(!handle||retainJob(handle.jobId))return;
    const live=()=>!disposed&&isCurrent()===true&&!retainJob(handle.jobId);if(!live())fail('CANCELLED');
    if(!handle.closed){
     const observations=[],cancellations=[];
     for(const [i,request]of handle.requests.entries()){
      const proofs=await c.readProofs(structuredClone(request)),observation=await foundation.queryOrganizeRecovery(handle,i,proofs,status,live);observations.push(observation);
      let cancellation=null;if(['RESERVED','CANCELLED_BEFORE_DISPATCH'].includes(observation.state))cancellation=await foundation.cancelOrganizeRecovery(handle,i,proofs,observation,status,reservations,live);cancellations.push(cancellation);
     }
     await foundation.reconcileOrganizeRecovery(handle,observations,status,{cancellations,reservations,isCurrent:live});
    }
    try{await client.report(foundation,{id:handle.jobId});}catch{/* Original event remains pending. No body/provider retry. */}
   })();const flight={origin:c.origin,task};map.set(topicId,flight);task.finally(()=>{if(map.get(topicId)===flight)map.delete(topicId);}).catch(()=>{});return task;
  },
  async assertCanPlan(foundation,topicId){current();await foundation.read(t=>preflight(t,topicId));},
  // This source-only preparation owns no Entry/Working payload. The original
  // session captures each child synchronously inside its existing independent
  // material grant; only the fixed branded Qwen owner receives that DTO.
  async prepareSourceControls(foundation,job,childMetadata,{topicId,assertCurrent,assertBeforeSend,isCurrent,chargeRetainedBytes}){
   current();const old=await foundation.status(job.id);
   if(old.state!=='PLANNED'||old.attempts.length||childMetadata.length!==job.childIds.length)fail('OUTCOME_UNKNOWN');
   const stages=[],live=()=>!disposed&&isCurrent()===true,requireLive=()=>{current();if(!live())fail('CANCELLED');};
   const operation={providers:[],dispose(){for(const stage of stages)stage.owner.dispose();active.delete(operation);sourceOperations.delete(operation);}};
   sourceOperations.set(operation,{foundation,job,topicId,stages,assertCurrent,assertBeforeSend,requireLive,registered:false});active.add(operation);
   try{
    for(const [index,metadata]of childMetadata.entries()){
     requireLive();
     const childIdentity=Object.fromEntries(['logicalJobId','childOperationId','type','contractVersion','routeVersion','automaticRetries'].map(k=>[k,metadata[k]]));
     if(childIdentity.logicalJobId!==job.id||childIdentity.childOperationId!==job.childIds[index])fail('RESULT_BINDING_MISMATCH');
     // Each stage is created in a separate metadata-only scope. No closure can
     // retain a validation payload, stage.input or an immutable wire envelope.
     const stage=await createSourceStage(childIdentity,{assertCurrent,chargeRetainedBytes,live,requireLive});
     stages.push(stage);
    }
    requireLive();return operation;
   }catch(error){operation.dispose();throw error;}
  },
  captureSourceChild(operation,index,payload,lifecycle){
   const state=sourceOperations.get(operation),stage=state?.stages[index];
   if(!state||!stage||stage.captured)fail('UNAVAILABLE');state.requireLive();
   const result=stage.owner.capturePreparedWire(stage.control,payload,lifecycle);
   if(result.status!=='CAPTURED')fail(result.reason??'UNAVAILABLE');stage.captured=true;state.requireLive();
  },
  async finishSourcePreparation(operation){
   const state=sourceOperations.get(operation);if(!state)fail('UNAVAILABLE');
   const {foundation,job,topicId,stages,assertCurrent,assertBeforeSend,requireLive}=state;
   try{
    for(const stage of stages){
     requireLive();if(!stage.captured)fail('UNAVAILABLE');
     const measured=await stage.owner.finishPreparedMeasurement(stage.control);requireLive();
     if(measured.status!=='MEASURED')fail(measured.reason??'UNAVAILABLE');
     const request=await foundation.serverRequest(job.id,stage.childIdentity.childOperationId,{inputTokens:measured.inputTokens,outputCap:measured.outputCap,maxCompletionTokens:measured.maxCompletionTokens});requireLive();
     await stage.authorize(request,measured);requireLive();
     stage.declaration=await stage.owner.declarePrepared(stage.control,request);requireLive();
     if(stage.declaration.status!=='DECLARED_LOCAL')fail(stage.declaration.reason??'UNAVAILABLE');
    }
    // Preserve original all-children-qualified-before-first-publish ordering,
    // preflight anti-remint, financial owners and durable metadata identities.
    await foundation.write(async t=>{await preflight(t,topicId);const stored=await foundation.job(t,job.id);await foundation.current(t,stored);requireLive();await t.put('meta',{id:FLIGHT+topicId,version:1,jobId:job.id,origin:c.origin,organizeRequestKey:stored.organizeRequestKey,requests:stages.map(s=>structuredClone(clientDeclarationRequestData(s.request)))});});requireLive();
    for(const stage of stages){
     await assertCurrent();requireLive();if((await stage.owner.publishDeclaration(stage.declaration,stage.proofs,declarations)).status!=='PUBLISHED_CLIENT_DECLARATION')fail('OUTCOME_UNKNOWN');requireLive();
     await assertCurrent();requireLive();if((await stage.owner.reserveDeclaration(stage.declaration,reservations)).status!=='RESERVED_SERVICE')fail('OUTCOME_UNKNOWN');requireLive();
     const bound=await stage.owner.bindPrepared(stage.control);requireLive();if(bound.status!=='BOUND_LOCAL')fail(bound.reason??'OUTCOME_UNKNOWN');
     let provider;const send=c.fetch??globalThis.fetch,providers=createClientProviderTransport({endpoint:c.origin+'/api/provider',fetch:async request=>{
      const requireLocalCurrent=await assertBeforeSend();if(request.signal.aborted||typeof requireLocalCurrent!=='function')fail('CANCELLED');const binding=qwenFoundationProviderData(provider);if(!binding)fail('UNAVAILABLE');binding.current();requireLocalCurrent();return send(request);
     }});
     provider=stage.owner.foundationProvider(bound,providers);if(!provider)fail('UNAVAILABLE');operation.providers.push(provider);
    }
    await foundation.reserveServer(job.id,operation.providers);state.registered=true;requireLive();return operation;
   }catch(error){
    if(state.registered)try{await foundation.cancelServer(job.id);}catch{/* Preserve original unknown financial holds. */}
    operation.dispose();throw error;
   }
  },
  async prepare(foundation,job,children,{topicId,assertCurrent,assertBeforeSend,isCurrent}){
   current();await assertCurrent();const old=await foundation.status(job.id);
   if(old.state!=='PLANNED'||old.attempts.length||children.length!==job.childIds.length)fail('OUTCOME_UNKNOWN');
   let registered=false;const stages=[];
   const live=()=>!disposed&&isCurrent()===true;
   const operation={providers:[],dispose(){for(const s of stages)s.owner.dispose();active.delete(operation);}};active.add(operation);
   try{
    // Qualify every original child before publishing or reserving any child.
    for(const [index,payload]of children.entries()){
     await assertCurrent();const metadata=await foundation.read(async t=>{const stored=await foundation.job(t,job.id);await foundation.current(t,stored);return foundation.childRequest(stored,index);});
     const childIdentity=Object.fromEntries(['logicalJobId','childOperationId','type','contractVersion','routeVersion','automaticRetries'].map(k=>[k,metadata[k]]));
     const manifest=readQwenProfileManifest(await c.readProfile({childIdentity:structuredClone(childIdentity)}));await assertCurrent();
     if(manifest.profile.contractVersion!==c.profile.contractVersion||manifest.profile.routeVersion!==c.routeVersion||manifest.profile.model.resolutionVersion!==c.profile.modelVersion||await hashText(canonical(manifest.wire))!==c.profile.promptVersion)fail('UNAVAILABLE');
     const compiler=createQwenManifestCompiler(manifest);
     const outputCap=Math.min(ENVELOPES.AI_ORGANIZE.output,manifest.profile.qualifiedLimits.billableOutputCap),compiled=compiler.compile({childIdentity,inputTokens:0,outputCap,stream:false,now:c.clock()});compiler.dispose();
     if(compiled.status!=='COMPILED_PARTIAL')fail('UNAVAILABLE');
     const body=canonical({model:manifest.profile.model.requested,messages:[{role:'system',content:manifest.wire.instructions},{role:'user',content:canonical(payload)}],response_format:manifest.wire.responseFormat,...compiled.requestControls,...manifest.wire.thinkingControls,n:1});
     const envelope={method:'POST',endpoint:{scheme:'https',host:manifest.profile.endpoint.host,path:manifest.profile.endpoint.path},headers:{'Content-Type':'application/json'},body},requestDigest=await hashText(canonical(envelope));
     const measurement=readQwenTokenMeasurement(manifest,await c.tokenize({profileId:manifest.profile.id,tokenizerProfileId:manifest.tokenizer.profileId,qualificationRef:manifest.tokenizer.qualificationRef,requestDigest,envelope:structuredClone(envelope)}));await assertCurrent();
     if(!integer(measurement.inputTokens)||c.isCurrentTokenizer(measurement)!==true)fail('UNAVAILABLE');
     const request=await foundation.serverRequest(job.id,job.childIds[index],{inputTokens:measurement.inputTokens,outputCap,maxCompletionTokens:compiled.requestControls.max_completion_tokens});
     const proofs=freeze(snapshot(await c.readProofs(structuredClone(request)),{maxBytes:24576,maxKeys:2,maxDepth:1,maxString:8192}));if(!exact(proofs,['principalToken','entitlementToken'])||!Object.values(proofs).every(x=>typeof x==='string'&&x.length>0&&x.length<=8192))fail('UNAVAILABLE');
     const payloadDigest=await hashText(canonical(payload)),authorization=freeze({authorizationId:'organize:'+job.childIds[index],childIdentity:structuredClone(childIdentity),reservationRequest:structuredClone(request),payloadDigest,expiresAt:Math.min(manifest.profile.validity.expiresAt,measurement.expiresAt)});let reservation=null;
     const qualified=()=>live()&&c.isCurrentTokenizer(measurement)===true;
     const owner=createQwenQualifiedRequestOwner({clock:c.clock,
      resolveProfile:async q=>{await assertCurrent();return c.readProfile(q);},
      authorizePayload:async q=>{await assertCurrent();if(!qualified()||!equal(q.childIdentity,childIdentity)||!equal(q.reservationRequest,request)||q.payloadDigest!==payloadDigest)fail('STALE_BASE');return structuredClone(authorization);},
      tokenize:async q=>{await assertCurrent();const value=await c.tokenize(q);if(!equal(value,measurement))fail('STALE_BASE');return value;},
      readReservation:async r=>{await assertCurrent();if(!equal(r,request))fail('STALE_BASE');const observation=await status.query({request,...proofs});await assertCurrent();if(!observedClientOperationStatus(observation,status)||!observation.reservation)fail('OUTCOME_UNKNOWN');reservation=observation.reservation;return structuredClone(reservation);},
      readCurrentBinding:()=>({now:c.clock(),profile:c.currentProfile(),authorization:qualified()?authorization:null,tokenizer:qualified()?measurement:null,reservation})
     });
     const stage={owner,input:{childIdentity,reservationRequest:request,payload:structuredClone(payload),stream:false},request,proofs};stages.push(stage);
     stage.declaration=await owner.prepareDeclaration(stage.input);if(stage.declaration.status!=='DECLARED_LOCAL')fail('UNAVAILABLE');
    }
    await foundation.write(async t=>{await preflight(t,topicId);const stored=await foundation.job(t,job.id);await foundation.current(t,stored);await t.put('meta',{id:FLIGHT+topicId,version:1,jobId:job.id,origin:c.origin,organizeRequestKey:stored.organizeRequestKey,requests:stages.map(s=>structuredClone(clientDeclarationRequestData(s.request)))});});
    for(const stage of stages){
     await assertCurrent();if((await stage.owner.publishDeclaration(stage.declaration,stage.proofs,declarations)).status!=='PUBLISHED_CLIENT_DECLARATION')fail('OUTCOME_UNKNOWN');
     await assertCurrent();if((await stage.owner.reserveDeclaration(stage.declaration,reservations)).status!=='RESERVED_SERVICE')fail('OUTCOME_UNKNOWN');
     await assertCurrent();const bound=await stage.owner.bind(stage.input);if(bound.status!=='BOUND_LOCAL')fail('OUTCOME_UNKNOWN');
     let provider;const send=c.fetch??globalThis.fetch,providers=createClientProviderTransport({endpoint:c.origin+'/api/provider',fetch:async request=>{
      const requireLocalCurrent=await assertBeforeSend();if(request.signal.aborted||typeof requireLocalCurrent!=='function')fail('CANCELLED');const binding=qwenFoundationProviderData(provider);if(!binding)fail('UNAVAILABLE');binding.current();requireLocalCurrent();return send(request);
     }});
     provider=stage.owner.foundationProvider(bound,providers);if(!provider)fail('UNAVAILABLE');operation.providers.push(provider);
    }
    await foundation.reserveServer(job.id,operation.providers);registered=true;await assertCurrent();return operation;
   }catch(error){
    if(registered)try{await foundation.cancelServer(job.id);}catch{/* Retain unknown original holds. */}
    // Before local registration the body-free preflight stays unresolved. A
    // later click/restart cannot mint replacement paid children from new text.
    operation.dispose();throw error;
   }
  },
  async report(foundation,job){current();const s=await foundation.status(job.id),request=s.attempts[0]?.financialRequest;if(!terminal.has(s.state)||!request)fail('RESULT_PENDING');const proofs=await c.readProofs(structuredClone(request));current();return foundation.reportResult(job.id,proofs,results);},
  dispose(){disposed=true;for(const operation of active)operation.dispose();}
 };
 clients.add(client);return Object.freeze(client);
}
