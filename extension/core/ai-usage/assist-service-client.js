import {savedFinancialCancellation} from './domain-result-receipt.js';
import {clientDeclarationRequestData} from './client-declaration.js';
import {canonical,equal,fail} from './contracts.js';
import {snapshot,freeze,exact,integer,token} from './qwen-request-data.js';
import {hashText} from '../dedupe.js';
import {ENVELOPES} from './admission-policy.js';
import {validOrganizeCacheProfile} from '../organizer/organize-cache-qualification.js';
import {createQwenRequestProfileCompiler} from './qwen-request-profile.js';
import {createQwenQualifiedRequestOwner,qwenFoundationProviderData} from './qwen-qualified-request.js';
import {createClientDeclarationTransport} from './client-declaration-transport.js';
import {createClientReservationTransport} from './client-reservation-transport.js';
import {createClientProviderTransport} from './client-provider-transport.js';
import {createClientResultTransport} from './client-result-transport.js';
import {createClientOperationStatusTransport,observedClientOperationStatus} from './client-operation-status-transport.js';
const recoveries=new WeakMap(),clients=new WeakSet(),FLIGHT='aiu:assist-service-preflight:v1';
// This body-free reader-session fence is not a consumption or spend record.
const REPLY='aiu:assist-reply-session:v1:';
const terminal=new Set(['COMMITTED','REJECTED','EXPIRED_UNCOMMITTED','CANCELLED_BEFORE_DISPATCH']);
const callbacks=['clock','resolveAuthority','onInvalidate','readProfile','currentProfile','tokenize','isCurrentTokenizer','readProofs','contextSelector'];
export const requireAssistServiceClient=value=>{if(!clients.has(value))fail('UNAVAILABLE');return value;};
// This is a client composition of the original declaration, Qwen, financial and
// result owners. It cannot issue identities, qualify profiles or settle money.
export function createAssistServiceClient(configuration){
 let c;try{
  if(!configuration||![Object.prototype,null].includes(Object.getPrototypeOf(configuration)))return null;
  const ds=Object.getOwnPropertyDescriptors(configuration),keys=Reflect.ownKeys(ds),required=['origin','profile','routeVersion',...callbacks];
  if(!keys.every(k=>[...required,'fetch'].includes(k))||!required.every(k=>keys.includes(k))||keys.some(k=>!Object.hasOwn(ds[k],'value')))return null;
  c=Object.fromEntries(keys.map(k=>[k,ds[k].value]));if(Object.hasOwn(c,'fetch')&&typeof c.fetch!=='function'||!callbacks.every(k=>typeof c[k]==='function')||!validOrganizeCacheProfile(c.profile)||!token(c.routeVersion))return null;
  c.profile=freeze(snapshot(c.profile));const url=new URL(c.origin);if(url.origin!==c.origin||url.protocol!=='https:'||url.port||url.username||url.password)return null;
 }catch{return null;}
 const transport=(factory,path)=>factory({endpoint:c.origin+path,...(c.fetch?{fetch:c.fetch}:{})}),declarations=transport(createClientDeclarationTransport,'/api/declarations'),reservations=transport(createClientReservationTransport,'/api/reservations'),results=transport(createClientResultTransport,'/api/results'),status=transport(createClientOperationStatusTransport,'/api/operation-status');
 if([declarations,reservations,results,status].some(x=>!x))return null;
 let disposed=false;const active=new Set(),current=()=>{if(disposed)fail('UNAVAILABLE');};
 async function preflight(t,replyKey,sessionId){
  const seen=await t.get('meta',REPLY+replyKey);if(seen&&seen.sessionId!==sessionId)fail('STALE_BASE');
  const previous=await t.get('meta',FLIGHT);if(!previous)return;
  const job=await t.get('organizerJobs',previous.jobId);if(!job||!terminal.has(job.state)||!job.domainResultReceipt)fail('OUTCOME_UNKNOWN');
  const row=await t.get('organizerUsage','aiu:attempt:'+previous.childId);
  if(row?.executionKind!=='server-backed'||row.financialSettlement?.state!=='SETTLED'&&!savedFinancialCancellation(row))fail('OUTCOME_UNKNOWN');
 }
 const client={
  sessionOptions:Object.freeze({resolveAuthority:c.resolveAuthority,contextSelector:c.contextSelector,contractVersion:c.profile.contractVersion,routeVersion:c.routeVersion}),
  available:()=>!disposed,onInvalidate:fn=>c.onInvalidate(fn),
  async recover(foundation,{retainJob,isCurrent}){
   current();let pending=recoveries.get(foundation.s);if(pending){if(pending.origin!==c.origin)fail('RESULT_ORIGIN_MISMATCH');return pending.task;}
   const task=(async()=>{
    const handle=await foundation.assistRecovery(c.origin);current();if(!handle||retainJob(handle.jobId))return;
    const live=()=>!disposed&&isCurrent()===true&&!retainJob(handle.jobId);if(!live())fail('CANCELLED');
    if(!handle.closed){
     const proofs=await c.readProofs(structuredClone(handle.request)),observation=await foundation.queryAssistRecovery(handle,proofs,status,live);
     let cancellation=null;if(['RESERVED','CANCELLED_BEFORE_DISPATCH'].includes(observation.state))cancellation=await foundation.cancelAssistRecovery(handle,proofs,observation,status,reservations,live);
     await foundation.reconcileAssistRecovery(handle,observation,status,{cancellation,reservations,isCurrent:live});
    }
    try{await client.report(foundation,{id:handle.jobId});}catch{/* Original pending metadata only; never a body or provider retry. */}
   })();const flight={origin:c.origin,task};recoveries.set(foundation.s,flight);task.finally(()=>{if(recoveries.get(foundation.s)===flight)recoveries.delete(foundation.s);}).catch(()=>{});return task;
  },
  async assertCanPlan(foundation,replyKey,sessionId){current();await foundation.read(t=>preflight(t,replyKey,sessionId));},
  async prepare(foundation,job,children,{replyKey,sessionId,assertCurrent,assertBeforeSend,isCurrent}){
   current();await assertCurrent();const old=await foundation.status(job.id);
   if(old.state!=='PLANNED'||old.attempts.length||children.length!==1||job.childIds.length!==1)fail('OUTCOME_UNKNOWN');
   let registered=false,staged=null,publicationAttempted=false;const stages=[];
   const live=()=>!disposed&&isCurrent()===true;
   const operation={providers:[],dispose(){for(const s of stages)s.owner.dispose();active.delete(operation);}};active.add(operation);
   try{
    // Qualify the sole original Assist child before publishing or reserving.
    for(const [index,payload]of children.entries()){
     await assertCurrent();const metadata=await foundation.read(async t=>{const stored=await foundation.job(t,job.id);await foundation.current(t,stored);return foundation.childRequest(stored,index);});
     const childIdentity=Object.fromEntries(['logicalJobId','childOperationId','type','contractVersion','routeVersion','automaticRetries'].map(k=>[k,metadata[k]]));
     const manifest=snapshot(await c.readProfile({childIdentity:structuredClone(childIdentity)}));await assertCurrent();
     if(manifest.profile.contractVersion!==c.profile.contractVersion||manifest.profile.routeVersion!==c.routeVersion||manifest.profile.model.resolutionVersion!==c.profile.modelVersion||await hashText(canonical(manifest.wire))!==c.profile.promptVersion)fail('UNAVAILABLE');
     const compiler=createQwenRequestProfileCompiler({profile:manifest.profile,known:manifest.known});
     const outputCap=Math.min(ENVELOPES.AI_ASSIST.output,manifest.profile.qualifiedLimits.billableOutputCap),compiled=compiler.compile({childIdentity,inputTokens:0,outputCap,stream:false,now:c.clock()});compiler.dispose();
     if(compiled.status!=='COMPILED_PARTIAL')fail('UNAVAILABLE');
     const body=canonical({model:manifest.profile.model.requested,messages:[{role:'system',content:manifest.wire.instructions},{role:'user',content:canonical(payload)}],response_format:manifest.wire.responseFormat,...compiled.requestControls,...manifest.wire.thinkingControls,n:1});
     const envelope={method:'POST',endpoint:{scheme:'https',host:manifest.profile.endpoint.host,path:manifest.profile.endpoint.path},headers:{'Content-Type':'application/json'},body},requestDigest=await hashText(canonical(envelope));
     const measurement=snapshot(await c.tokenize({profileId:manifest.profile.id,tokenizerProfileId:manifest.tokenizer.profileId,qualificationRef:manifest.tokenizer.qualificationRef,requestDigest,envelope:structuredClone(envelope)}));await assertCurrent();
     if(!integer(measurement.inputTokens)||c.isCurrentTokenizer(measurement)!==true)fail('UNAVAILABLE');
     const request=await foundation.serverRequest(job.id,job.childIds[index],{inputTokens:measurement.inputTokens,outputCap,maxCompletionTokens:compiled.requestControls.max_completion_tokens});
     const proofs=freeze(snapshot(await c.readProofs(structuredClone(request)),{maxBytes:24576,maxKeys:2,maxDepth:1,maxString:8192}));if(!exact(proofs,['principalToken','entitlementToken'])||!Object.values(proofs).every(x=>typeof x==='string'&&x.length>0&&x.length<=8192))fail('UNAVAILABLE');
     const payloadDigest=await hashText(canonical(payload)),authorization=freeze({authorizationId:'assist:'+job.childIds[index],childIdentity:structuredClone(childIdentity),reservationRequest:structuredClone(request),payloadDigest,expiresAt:Math.min(manifest.profile.validity.expiresAt,measurement.expiresAt)});let reservation=null;
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
    staged=await foundation.write(async t=>{await preflight(t,replyKey,sessionId);const stored=await foundation.job(t,job.id);await foundation.current(t,stored);const previous=await t.get('meta',FLIGHT),replyPrevious=await t.get('meta',REPLY+replyKey),marker={id:FLIGHT,version:1,jobId:job.id,childId:job.childIds[0],origin:c.origin,evaluationKey:stored.replyObligation.evaluationKey,replyKey,financialRequest:structuredClone(clientDeclarationRequestData(stages[0].request))},replyMarker={id:REPLY+replyKey,version:1,sessionId};await t.put('meta',marker);await t.put('meta',replyMarker);return {previous,replyPrevious,marker,replyMarker};});
    for(const stage of stages){
     await assertCurrent();publicationAttempted=true;if((await stage.owner.publishDeclaration(stage.declaration,stage.proofs,declarations)).status!=='PUBLISHED_CLIENT_DECLARATION')fail('OUTCOME_UNKNOWN');
     await assertCurrent();if((await stage.owner.reserveDeclaration(stage.declaration,reservations)).status!=='RESERVED_SERVICE')fail('OUTCOME_UNKNOWN');
     await assertCurrent();const bound=await stage.owner.bind(stage.input);if(bound.status!=='BOUND_LOCAL')fail('OUTCOME_UNKNOWN');
     let provider;const send=c.fetch??globalThis.fetch,providers=createClientProviderTransport({endpoint:c.origin+'/api/provider',fetch:async request=>{
      const requireLocalCurrent=await assertBeforeSend();if(request.signal.aborted||typeof requireLocalCurrent!=='function')fail('CANCELLED');const binding=qwenFoundationProviderData(provider);if(!binding)fail('UNAVAILABLE');binding.current();requireLocalCurrent();return send(request);
     }});
     provider=stage.owner.foundationProvider(bound,providers);if(!provider)fail('UNAVAILABLE');operation.providers.push(provider);
    }
    await foundation.reserveServer(job.id,operation.providers);registered=true;await assertCurrent();return operation;
   }catch(error){
    // Only a proven never-started remote publication may roll back its own
    // preflight. Once publication was attempted, preserve all unknown holds.
    if(staged&&!publicationAttempted)try{await foundation.write(async t=>{
     if(!equal(await t.get('meta',FLIGHT),staged.marker)||!equal(await t.get('meta',REPLY+replyKey),staged.replyMarker)||await t.get('organizerUsage','aiu:attempt:'+job.childIds[0]))fail('RESULT_CONFLICT');
     if(staged.previous)await t.put('meta',staged.previous);else await t.delete('meta',FLIGHT);
     if(staged.replyPrevious)await t.put('meta',staged.replyPrevious);else await t.delete('meta',REPLY+replyKey);
    });}catch{/* A changed durable owner remains unknown, never cleared. */}
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
