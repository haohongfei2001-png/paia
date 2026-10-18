import {createMaintenanceServiceResponseAdapter,MAINTENANCE_SERVICE_RESPONSE_SCHEMA} from './maintenance-service-response.js';
import {savedFinancialCancellation} from './domain-result-receipt.js';
import {clientDeclarationRequestData} from './client-declaration.js';
import {canonical,equal,fail,digest} from './contracts.js';
import {snapshot,freeze,exact,integer,token} from './qwen-request-data.js';
import {hashText} from '../dedupe.js';
import {ENVELOPES} from './admission-policy.js';
import {createQwenRequestProfileCompiler} from './qwen-request-profile.js';
import {createQwenQualifiedRequestOwner,qwenFoundationProviderData} from './qwen-qualified-request.js';
import {createClientDeclarationTransport} from './client-declaration-transport.js';
import {createClientReservationTransport} from './client-reservation-transport.js';
import {createClientProviderTransport} from './client-provider-transport.js';
import {createClientResultTransport} from './client-result-transport.js';
import {createClientOperationStatusTransport,observedClientOperationStatus} from './client-operation-status-transport.js';
const recoveries=new WeakMap(),clients=new WeakSet(),FLIGHT='aiu:maintenance-service-preflight:v1';
const terminal=new Set(['COMMITTED','REJECTED','EXPIRED_UNCOMMITTED','CANCELLED_BEFORE_DISPATCH']);
const callbacks=['clock','resolveAuthority','isCurrent','onInvalidate','readProfile','currentProfile','tokenize','isCurrentTokenizer','readProofs'];
export const requireMaintenanceServiceClient=value=>{if(!clients.has(value))fail('UNAVAILABLE');return value;};
// The opportunity means only that this available runtime may check its backlog.
// It supplies NO day/window, tier, quota, allowance or financial reservation.
// Those facts belong exclusively to the authenticated original service ledger.
export function createMaintenanceServiceClient(configuration){
 let c;try{
  if(!configuration||![Object.prototype,null].includes(Object.getPrototypeOf(configuration)))return null;
  const ds=Object.getOwnPropertyDescriptors(configuration),keys=Reflect.ownKeys(ds),required=['origin','scope','contractVersion','routeVersion','service','processing',...callbacks];
  if(!keys.every(k=>[...required,'fetch'].includes(k))||!required.every(k=>keys.includes(k))||keys.some(k=>!Object.hasOwn(ds[k],'value')))return null;
  c=Object.fromEntries(keys.map(k=>[k,ds[k].value]));if(Object.hasOwn(c,'fetch')&&typeof c.fetch!=='function'||!callbacks.every(k=>typeof c[k]==='function')||!['scope','contractVersion','routeVersion'].every(k=>token(c[k]))||!c.service||!c.processing)return null;
  const url=new URL(c.origin);if(url.origin!==c.origin||url.protocol!=='https:'||url.port||url.username||url.password)return null;
 }catch{return null;}
 const transport=(factory,path)=>factory({endpoint:c.origin+path,...(c.fetch?{fetch:c.fetch}:{})}),declarations=transport(createClientDeclarationTransport,'/api/declarations'),reservations=transport(createClientReservationTransport,'/api/reservations'),results=transport(createClientResultTransport,'/api/results'),status=transport(createClientOperationStatusTransport,'/api/operation-status');
 if([declarations,reservations,results,status].some(x=>!x))return null;
 let service;try{const ds=Object.getOwnPropertyDescriptors(c.service),keys=Reflect.ownKeys(ds);if(![Object.prototype,null].includes(Object.getPrototypeOf(c.service))||keys.some(k=>!['version','topic','context','filter'].includes(k)||!Object.hasOwn(ds[k],'value'))||!['version','topic','context'].every(k=>keys.includes(k)))return null;service=Object.fromEntries(keys.map(k=>[k,ds[k].value]));}catch{return null;}
 const responses=createMaintenanceServiceResponseAdapter();
 let disposed=false;const active=new Set(),opportunities=new WeakSet(),controller=new AbortController(),current=()=>{if(disposed||controller.signal.aborted||c.isCurrent()!==true)fail('UNAVAILABLE');};
 const window=Object.freeze({acquire:async({jobType,requestDigest})=>{current();if(jobType!=='AI_MAINTENANCE'||!token(requestDigest))fail('UNAVAILABLE');const opportunity=Object.freeze({version:1,kind:'service-opportunity',requestDigest,revocationSignal:controller.signal});opportunities.add(opportunity);return opportunity;},isCurrent:grant=>{try{current();return opportunities.has(grant);}catch{return false;}}});
 async function preflight(t,jobId=null,retainJob=null){
  const previous=await t.get('meta',FLIGHT);if(!previous)return;
  if(previous.version!==1||previous.origin!==c.origin||!Array.isArray(previous.requests)||previous.requests.length<1||previous.requests.length>2)fail('OUTCOME_UNKNOWN');
  if(previous.jobId===jobId){const job=await t.get('organizerJobs',jobId);if(!job||job.type!=='AI_MAINTENANCE'||previous.requests.length!==job.childIds.length||previous.requests.some((r,i)=>r!==null&&(r.jobId!==jobId||r.operationId!==job.childIds[i]||r.childIndex!==i||r.childCount!==job.childIds.length)))fail('OUTCOME_UNKNOWN');return;}
  const job=await t.get('organizerJobs',previous.jobId);if(retainJob?.(previous.jobId)===true){if(!job||job.type!=='AI_MAINTENANCE'||previous.origin!==c.origin)fail('OUTCOME_UNKNOWN');return {retainedKey:job.maintenanceRequestKey??null};}if(!job||!terminal.has(job.state)||!job.domainResultReceipt)fail('OUTCOME_UNKNOWN');
  if(previous.cadenceDenial){
   const d=previous.cadenceDenial;if(job.state!=='CANCELLED_BEFORE_DISPATCH'||job.cancelEpoch<1||!equal(job.maintenanceCadenceDenial,d)||d.origin!==c.origin||!integer(d.observedAt)||!integer(d.nextEligibilityAt)||d.nextEligibilityAt<=d.observedAt||previous.requests.filter(Boolean).length!==1||!previous.requests.some(r=>equal(r,d.request)))fail('OUTCOME_UNKNOWN');
   for(const id of job.childIds){const r=await t.get('organizerUsage','aiu:attempt:'+id);if(!r||r.executionKind!=='service-planned'||r.state!=='CANCELLED_BEFORE_DISPATCH'||r.attemptCount!==0||r.financialRequest||await t.get('meta','aiu:dispatched:'+id))fail('OUTCOME_UNKNOWN');}return d;
  }
  for(const [i,childId]of job.childIds.entries()){const r=await t.get('organizerUsage','aiu:attempt:'+childId);if(previous.requests[i]===null){if(!previous.recovery||!equal(previous.recovery,job.maintenanceRecovery)||r?.executionKind!=='service-planned'||r.state!=='CANCELLED_BEFORE_DISPATCH'||r.attemptCount!==0||r.spendState!=='NOT_RESERVED'||r.financialRequest||await t.get('meta','aiu:dispatched:'+childId))fail('OUTCOME_UNKNOWN');}else if(r?.executionKind!=='server-backed'||!equal(r.financialRequest,previous.requests[i])||r.financialSettlement?.state!=='SETTLED'&&!savedFinancialCancellation(r))fail('OUTCOME_UNKNOWN');}
  if(job.resultReport?.state!=='ACKNOWLEDGED')fail('OUTCOME_UNKNOWN');
  if(previous.recovery){if(!equal(previous.recovery,job.maintenanceRecovery))fail('OUTCOME_UNKNOWN');return {recovery:previous.recovery};}
 }
 const client={
  sessionOptions:Object.freeze({authority:c.resolveAuthority,service:Object.freeze({...service,responseAdapter:responses.adapter}),processing:c.processing,window}),
  options:Object.freeze({scope:c.scope,contractVersion:c.contractVersion,routeVersion:c.routeVersion}),
  available:()=>{try{current();return true;}catch{return false;}},
  onInvalidate:fn=>c.onInvalidate(()=>{controller.abort();responses.dispose();fn();}),
  releaseResponseJob:jobId=>responses.releaseJob(jobId),
  releaseResponseChild:childId=>responses.releaseChild(childId),
  async assertCanPlan(foundation,retainJob,isCurrent=()=>true){
   current();const recovered=await client.recover(foundation,{retainJob,isCurrent});if(recovered)return recovered;
   current();const prior=await foundation.read(async t=>{const marker=await t.get('meta',FLIGHT);if(!marker||marker.origin!==c.origin||retainJob?.(marker.jobId))return null;const job=await t.get('organizerJobs',marker.jobId);return job&&terminal.has(job.state)&&job.domainResultReceipt&&!job.maintenanceCadenceDenial&&job.resultReport?.state!=='ACKNOWLEDGED'?{id:job.id}:null;});
   // Replay only the original durable, body-free domain event. No declaration,
   // reservation, body acquisition, provider request or new result is possible.
   if(prior)try{await client.report(foundation,prior);}catch{/* Keep the original marker pending. */}
   current();await foundation.read(t=>preflight(t,null,retainJob));return prior?{id:prior.id,state:'RECOVERED'}:null;
  },
  async planIdentity(foundation,retainJob){current();const denial=await foundation.read(t=>preflight(t,null,retainJob));if(denial&&Object.hasOwn(denial,'retainedKey'))return denial.retainedKey?{maintenanceRequestKey:denial.retainedKey}:{};return denial?{maintenanceRequestKey:denial.recovery?'aiu:recovery:'+await digest(denial.recovery):'aiu:cadence:'+await digest(denial)}:{};},
  async recover(foundation,{retainJob,isCurrent}){
   current();const pending=recoveries.get(foundation.s);if(pending){if(pending.origin!==c.origin)fail('RESULT_ORIGIN_MISMATCH');return pending.task;}
   const task=(async()=>{
    const handle=await foundation.maintenanceRecovery(c.origin);current();if(!handle||retainJob?.(handle.jobId)||handle.closed)return null;
    const live=()=>!disposed&&c.isCurrent()===true&&isCurrent()===true&&!retainJob?.(handle.jobId);if(!live())fail('CANCELLED');
    const observations=[],cancellations=[];
    for(const [i,request]of handle.requests.entries()){
     if(request===null){observations.push(null);cancellations.push(null);continue;}
     const proofs=await c.readProofs(structuredClone(request)),observation=await foundation.queryMaintenanceRecovery(handle,i,proofs,status,live);observations.push(observation);
     cancellations.push(['RESERVED','CANCELLED_BEFORE_DISPATCH'].includes(observation.state)?await foundation.cancelMaintenanceRecovery(handle,i,proofs,observation,status,reservations,live):null);
    }
    const recovered=await foundation.reconcileMaintenanceRecovery(handle,observations,status,{cancellations,reservations,isCurrent:live});
    try{await client.report(foundation,{id:handle.jobId});}catch{/* Exact original event stays pending. */}
    current();await foundation.read(t=>preflight(t,null,retainJob));return recovered;
   })();const flight={origin:c.origin,task};recoveries.set(foundation.s,flight);task.finally(()=>{if(recoveries.get(foundation.s)===flight)recoveries.delete(foundation.s);}).catch(()=>{});return task;
  },
  async prepareChild(foundation,job,payload,{signal,assertCurrent,assertBeforeSend,isCurrent}){
   current();payload=freeze(snapshot(payload));await assertCurrent();const metadata=await foundation.read(async t=>{const stored=await foundation.job(t,job.id);await foundation.current(t,stored);const index=stored.childIds.indexOf(payload.childOperationId);if(index<0)fail('STALE_BASE');return foundation.childRequest(stored,index);});
   if(!equal(Object.fromEntries(Object.keys(metadata).map(k=>[k,payload[k]])),metadata))fail('STALE_BASE');
   const childIdentity=Object.fromEntries(['logicalJobId','childOperationId','type','contractVersion','routeVersion','automaticRetries'].map(k=>[k,metadata[k]]));
   const manifest=snapshot(await c.readProfile({childIdentity:structuredClone(childIdentity)}));await assertCurrent();
   if(manifest.profile.jobType!=='AI_MAINTENANCE'||manifest.profile.contractVersion!==c.contractVersion||manifest.profile.routeVersion!==c.routeVersion||manifest.profile.thinking.enabled!==false||!equal(manifest.wire?.responseFormat?.json_schema?.schema,MAINTENANCE_SERVICE_RESPONSE_SCHEMA))fail('UNAVAILABLE');
   const compiler=createQwenRequestProfileCompiler({profile:manifest.profile,known:manifest.known}),outputCap=Math.min(ENVELOPES.AI_MAINTENANCE.output,manifest.profile.qualifiedLimits.billableOutputCap),compiled=compiler.compile({childIdentity,inputTokens:0,outputCap,stream:false,now:c.clock()});compiler.dispose();
   if(compiled.status!=='COMPILED_PARTIAL')fail('UNAVAILABLE');
   const body=canonical({model:manifest.profile.model.requested,messages:[{role:'system',content:manifest.wire.instructions},{role:'user',content:canonical(payload)}],response_format:manifest.wire.responseFormat,...compiled.requestControls,...manifest.wire.thinkingControls,n:1}),envelope={method:'POST',endpoint:{scheme:'https',host:manifest.profile.endpoint.host,path:manifest.profile.endpoint.path},headers:{'Content-Type':'application/json'},body},requestDigest=await hashText(canonical(envelope));
   const measurement=snapshot(await c.tokenize({profileId:manifest.profile.id,tokenizerProfileId:manifest.tokenizer.profileId,qualificationRef:manifest.tokenizer.qualificationRef,requestDigest,envelope:structuredClone(envelope)}));await assertCurrent();
   if(!integer(measurement.inputTokens)||c.isCurrentTokenizer(measurement)!==true)fail('UNAVAILABLE');
   const request=await foundation.serverRequest(job.id,metadata.childOperationId,{inputTokens:measurement.inputTokens,outputCap,maxCompletionTokens:compiled.requestControls.max_completion_tokens});
   const proofs=freeze(snapshot(await c.readProofs(structuredClone(request)),{maxBytes:24576,maxKeys:2,maxDepth:1,maxString:8192}));if(!exact(proofs,['principalToken','entitlementToken'])||!Object.values(proofs).every(x=>typeof x==='string'&&x.length>0&&x.length<=8192))fail('UNAVAILABLE');
   const payloadDigest=await hashText(canonical(payload)),authorization=freeze({authorizationId:'maintenance:'+metadata.childOperationId,childIdentity:structuredClone(childIdentity),reservationRequest:structuredClone(request),payloadDigest,expiresAt:Math.min(manifest.profile.validity.expiresAt,measurement.expiresAt)});let reservation=null,retired=false,registered=false;
   const live=()=>!disposed&&!retired&&isCurrent()===true&&c.isCurrentTokenizer(measurement)===true;
   const owner=createQwenQualifiedRequestOwner({clock:c.clock,
    resolveProfile:async q=>{await assertCurrent();const profile=snapshot(await c.readProfile(q));if(!equal(profile.wire?.responseFormat?.json_schema?.schema,MAINTENANCE_SERVICE_RESPONSE_SCHEMA))fail('UNAVAILABLE');return profile;},
    authorizePayload:async q=>{await assertCurrent();if(!live()||!equal(q.childIdentity,childIdentity)||!equal(q.reservationRequest,request)||q.payloadDigest!==payloadDigest)fail('STALE_BASE');return structuredClone(authorization);},
    tokenize:async q=>{await assertCurrent();const v=await c.tokenize(q);if(!equal(v,measurement))fail('STALE_BASE');return v;},
    readReservation:async r=>{await assertCurrent();if(!equal(r,request))fail('STALE_BASE');const observation=await status.query({request,...proofs});await assertCurrent();if(!observedClientOperationStatus(observation,status)||!observation.reservation)fail('OUTCOME_UNKNOWN');reservation=observation.reservation;
     // Local opt-in/processing can select a Filter facet, but ONLY the signed
     // server's actual reservation can establish its required Pro entitlement.
     if(payload.coverage.some(u=>u.facet==='filter')&&!reservation.window?.windowId?.startsWith('pro:'))fail('UNAVAILABLE');return structuredClone(reservation);},
    readCurrentBinding:()=>({now:c.clock(),profile:c.currentProfile(),authorization:live()?authorization:null,tokenizer:live()?measurement:null,reservation})
   });
   const operation={dispose(){retired=true;owner.dispose();active.delete(operation);}};active.add(operation);
   try{
    const input={childIdentity,reservationRequest:request,payload:structuredClone(payload),stream:false},declaration=await owner.prepareDeclaration(input);if(declaration.status!=='DECLARED_LOCAL')fail('UNAVAILABLE');
    // Body-free original identities survive ACK loss and worker restart. A
    // following child is published only once its post-Topic scope is current.
    await foundation.write(async t=>{await preflight(t,job.id);const stored=await foundation.job(t,job.id);await foundation.current(t,stored);const old=await t.get('meta',FLIGHT),requests=old?.jobId===job.id?[...old.requests]:job.childIds.map(()=>null);if(requests[request.childIndex]!==null)fail('OUTCOME_UNKNOWN');requests[request.childIndex]=structuredClone(clientDeclarationRequestData(request));await t.put('meta',{id:FLIGHT,version:1,jobId:job.id,origin:c.origin,requests});});
    await assertCurrent();if((await owner.publishDeclaration(declaration,proofs,declarations)).status!=='PUBLISHED_CLIENT_DECLARATION')fail('OUTCOME_UNKNOWN');
    await assertCurrent();const admission=await owner.reserveDeclaration(declaration,reservations);if(admission.status==='MAINTENANCE_CADENCE'){await foundation.recordMaintenanceCadenceDenial(job.id,admission);const error=Object.assign(Error('MAINTENANCE_CADENCE'),{code:'MAINTENANCE_CADENCE',nextEligibilityAt:admission.nextEligibilityAt,observedAt:admission.observedAt});throw error;}if(admission.status!=='RESERVED_SERVICE')fail('OUTCOME_UNKNOWN');
    await assertCurrent();const bound=await owner.bind(input);if(bound.status!=='BOUND_LOCAL')fail('OUTCOME_UNKNOWN');
    let provider;const send=c.fetch??globalThis.fetch,providers=createClientProviderTransport({endpoint:c.origin+'/api/provider',fetch:async req=>{const requireLocalCurrent=await assertBeforeSend();if(req.signal.aborted||typeof requireLocalCurrent!=='function')fail('CANCELLED');const binding=qwenFoundationProviderData(provider);if(!binding)fail('UNAVAILABLE');binding.current();requireLocalCurrent();return send(new Request(req,{signal:AbortSignal.any([req.signal,signal])}));}});
    provider=owner.foundationProvider(bound,providers);if(!provider)fail('UNAVAILABLE');
    await foundation.reserveMaintenanceServerChild(job.id,provider);registered=true;await assertCurrent();responses.registerChild(foundation,payload,()=>!disposed&&!controller.signal.aborted&&isCurrent()===true&&c.isCurrentTokenizer(measurement)===true&&c.clock()<authorization.expiresAt,signal);return {provider,dispose:operation.dispose,scheduling:Object.freeze({nextEligibilityAt:reservation.window.nextEligibilityAt,observedAt:reservation.reservedAt})};
   }catch(error){if(registered)try{await foundation.cancelServer(job.id);}catch{/* Original hold remains unresolved. */}operation.dispose();throw error;}
  },
  async report(foundation,job){current();const s=await foundation.status(job.id),request=s.attempts.find(r=>r.financialRequest)?.financialRequest;if(!terminal.has(s.state)||!request)fail('RESULT_PENDING');const proofs=await c.readProofs(structuredClone(request));current();return foundation.reportResult(job.id,proofs,results);},
  dispose(){disposed=true;controller.abort();responses.dispose();/* In-flight finally retains cancellation proofs until its original cleanup. */}
 };
 clients.add(client);return Object.freeze(client);
}
