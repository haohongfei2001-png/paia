import {savedFinancialCancellation} from './domain-result-receipt.js';
import {clientDeclarationRequestData} from './client-declaration.js';
import {canonical,equal,fail} from './contracts.js';
import {snapshot,freeze,exact,integer,token} from './qwen-request-data.js';
import {hashText} from '../dedupe.js';
import {ENVELOPES} from './admission-policy.js';
import {createQwenManifestCompiler,readQwenProfileManifest,readQwenTokenMeasurement} from './qwen-profile-source-adapter.js';
import {createQwenQualifiedRequestOwner,qwenFoundationProviderData} from './qwen-qualified-request.js';
import {createClientDeclarationTransport} from './client-declaration-transport.js';
import {createClientReservationTransport} from './client-reservation-transport.js';
import {createClientProviderTransport} from './client-provider-transport.js';
import {createClientResultTransport} from './client-result-transport.js';
import {createClientOperationStatusTransport,observedClientOperationStatus} from './client-operation-status-transport.js';
const clients=new WeakSet(),recoveries=new WeakMap(),FLIGHT='aiu:historical-service-preflight:v1';
export const requireHistoricalServiceClient=value=>{if(!clients.has(value))fail('UNAVAILABLE');return value;};
const clone=structuredClone;
const callbacks=['clock','resolveAuthority','resolveIntent','isCurrentIntent','onInvalidate','readProfile','currentProfile','tokenize','isCurrentTokenizer','readProofs'];
const terminal=new Set(['COMMITTED','REJECTED','EXPIRED_UNCOMMITTED','CANCELLED_BEFORE_DISPATCH']);
// All capabilities originate in the packaged configuration. No runtime message
// supplies a URL, credentials, profile, authorization callback or pricing fact.
export function createHistoricalServiceClient(configuration){
 let c;
 try{
  if(!configuration||![Object.prototype,null].includes(Object.getPrototypeOf(configuration)))return null;
  const ds=Object.getOwnPropertyDescriptors(configuration),keys=Reflect.ownKeys(ds),required=['origin','contractVersion','routeVersion',...callbacks];
  if(!keys.every(k=>[...required,'fetch'].includes(k))||!required.every(k=>keys.includes(k))||keys.some(k=>!Object.hasOwn(ds[k],'value')))return null;
  c=Object.fromEntries(keys.map(k=>[k,ds[k].value]));if(Object.hasOwn(c,'fetch')&&typeof c.fetch!=='function')return null;if(!callbacks.every(k=>typeof c[k]==='function')||!token(c.contractVersion)||!token(c.routeVersion))return null;
  const url=new URL(c.origin);if(url.origin!==c.origin||url.protocol!=='https:'||url.port||url.username||url.password)return null;
 }catch{return null;}
 const transport=(factory,path)=>factory({endpoint:c.origin+path,...(c.fetch?{fetch:c.fetch}:{})});
 const declarations=transport(createClientDeclarationTransport,'/api/declarations'),reservations=transport(createClientReservationTransport,'/api/reservations'),results=transport(createClientResultTransport,'/api/results'),status=transport(createClientOperationStatusTransport,'/api/operation-status');
 if([declarations,reservations,results,status].some(x=>!x))return null;
 const active=new Set();let disposed=false;
 function current(){if(disposed)fail('UNAVAILABLE');}
 async function preflight(t,key){
  const previous=await t.get('meta',FLIGHT);if(!previous)return;
  const job=await t.get('organizerJobs',previous.jobId);
  if(!job)fail('OUTCOME_UNKNOWN');
  if(terminal.has(job.state)&&job.domainResultReceipt){
   // A local cancellation is not proof that a remote hold was released. Only
   // original settled evidence or a branded cancel ACK closes this old flight.
   const receipt=await t.get('organizerUsage','aiu:attempt:'+previous.childId);
   if(receipt?.executionKind==='server-backed'&&(receipt.financialSettlement?.state==='SETTLED'||savedFinancialCancellation(receipt)))return;
  }
  if(previous.evaluationKey!==key)fail('REQUEST_ALREADY_IN_FLIGHT');
 }
 const client={
  sessionOptions:Object.freeze(Object.fromEntries(['resolveAuthority','resolveIntent','isCurrentIntent','onInvalidate','contractVersion','routeVersion'].map(k=>[k,c[k]]))),
  available:()=>!disposed,
  recover(foundation,{isCurrent,retainJob}){
   current();if(typeof isCurrent!=='function'||typeof retainJob!=='function')fail('UNAVAILABLE');
   const pending=recoveries.get(foundation.s);if(pending){if(pending.origin!==c.origin)fail('RESULT_ORIGIN_MISMATCH');return pending.task;}
   const task=(async()=>{
    const handle=await foundation.historicalRecovery(c.origin);current();if(!handle)return;
    if(active.size||retainJob(handle.jobId))return;
    const live=()=>!disposed&&isCurrent()===true&&!retainJob(handle.jobId);if(!live())fail('CANCELLED');
    if(handle.closed){if(handle.state==='COMMITTED')return;try{await client.report(foundation,{id:handle.jobId});}catch{/* Original metadata remains pending. */}return;}
    const proofs=freeze(snapshot(await c.readProofs(clone(handle.request)),{maxBytes:24576,maxKeys:2,maxDepth:1,maxString:8192}));
    if(!exact(proofs,['principalToken','entitlementToken'])||!Object.values(proofs).every(x=>typeof x==='string'&&x.length>0&&x.length<=8192))fail('UNAVAILABLE');
    const observation=await foundation.queryHistoricalRecovery(handle,proofs,status,live);current();
    if(!observedClientOperationStatus(observation,status))fail('OUTCOME_UNKNOWN');
    let cancellation=null;
    if(['RESERVED','CANCELLED_BEFORE_DISPATCH'].includes(observation.state))cancellation=await foundation.cancelHistoricalRecovery(handle,proofs,observation,status,reservations,live);
    await foundation.reconcileHistoricalRecovery(handle,observation,status,{cancellation,reservations,isCurrent:live});
    try{await client.report(foundation,{id:handle.jobId});}catch{/* No body or provider retry; keep the original metadata event. */}
   })();
   const flight={origin:c.origin,task};recoveries.set(foundation.s,flight);task.finally(()=>{if(recoveries.get(foundation.s)===flight)recoveries.delete(foundation.s);}).catch(()=>{});return task;
  },
  async assertCanPlan(foundation,key){current();await foundation.read(t=>preflight(t,key));},
  async prepare(foundation,job,payload,{evaluationKey,assertCurrent,assertBeforeSend,isCurrent}){
   current();await assertCurrent();
   const old=await foundation.status(job.id);if(old.state!=='PLANNED'||old.attempts.length)fail('OUTCOME_UNKNOWN');
   const childIdentity={logicalJobId:job.id,childOperationId:job.childIds[0],type:'AI_ASSIST',contractVersion:c.contractVersion,routeVersion:c.routeVersion,automaticRetries:0};
   const manifest=readQwenProfileManifest(await c.readProfile({childIdentity:clone(childIdentity)}));await assertCurrent();
   const compiler=createQwenManifestCompiler(manifest);
   const outputCap=Math.min(ENVELOPES.AI_ASSIST.output,manifest.profile.qualifiedLimits.billableOutputCap),compiled=compiler.compile({childIdentity,inputTokens:0,outputCap,stream:false,now:c.clock()});compiler.dispose();
   if(compiled.status!=='COMPILED_PARTIAL')fail('UNAVAILABLE');
   // Premeasure the exact original Qwen wire. Its owner independently rebuilds
   // and compares the digest/count before declaration and again before binding.
   const body=canonical({model:manifest.profile.model.requested,messages:[{role:'system',content:manifest.wire.instructions},{role:'user',content:canonical(payload)}],response_format:manifest.wire.responseFormat,...compiled.requestControls,...manifest.wire.thinkingControls,n:1});
   const envelope={method:'POST',endpoint:{scheme:'https',host:manifest.profile.endpoint.host,path:manifest.profile.endpoint.path},headers:{'Content-Type':'application/json'},body};
   const requestDigest=await hashText(canonical(envelope)),measurement=readQwenTokenMeasurement(manifest,await c.tokenize({profileId:manifest.profile.id,tokenizerProfileId:manifest.tokenizer.profileId,qualificationRef:manifest.tokenizer.qualificationRef,requestDigest,envelope:clone(envelope)}));await assertCurrent();
   if(!integer(measurement.inputTokens)||c.isCurrentTokenizer(measurement)!==true)fail('UNAVAILABLE');
   const request=await foundation.serverRequest(job.id,job.childIds[0],{inputTokens:measurement.inputTokens,outputCap,maxCompletionTokens:compiled.requestControls.max_completion_tokens});
   const proofs=snapshot(await c.readProofs(clone(request)),{maxBytes:24576,maxKeys:2,maxDepth:1,maxString:8192});
   if(!exact(proofs,['principalToken','entitlementToken'])||!Object.values(proofs).every(x=>typeof x==='string'&&x.length>0&&x.length<=8192))fail('UNAVAILABLE');
   const payloadDigest=await hashText(canonical(payload)),expiresAt=Math.min(manifest.profile.validity.expiresAt,measurement.expiresAt),authorization=freeze({authorizationId:'history:'+job.childIds[0],childIdentity:clone(childIdentity),reservationRequest:clone(request),payloadDigest,expiresAt});
   let reservation=null,retired=false,registered=false;
   const live=()=>!retired&&!disposed&&isCurrent()===true&&c.isCurrentTokenizer(measurement)===true;
   const owner=createQwenQualifiedRequestOwner({clock:c.clock,
    resolveProfile:async q=>{await assertCurrent();return c.readProfile(q);},
    authorizePayload:async q=>{await assertCurrent();if(!live()||!equal(q.childIdentity,childIdentity)||!equal(q.reservationRequest,request)||q.payloadDigest!==payloadDigest)fail('STALE_BASE');return clone(authorization);},
    tokenize:async q=>{await assertCurrent();const value=await c.tokenize(q);if(!equal(value,measurement))fail('STALE_BASE');return value;},
    readReservation:async r=>{await assertCurrent();if(!equal(r,request))fail('STALE_BASE');const observation=await status.query({request,...proofs});await assertCurrent();if(!observedClientOperationStatus(observation,status)||!observation.reservation)fail('OUTCOME_UNKNOWN');reservation=observation.reservation;return clone(reservation);},
    readCurrentBinding:()=>({now:c.clock(),profile:c.currentProfile(),authorization:live()?authorization:null,tokenizer:live()?measurement:null,reservation})
   });
   const operation={dispose(){retired=true;owner.dispose();active.delete(operation);}};active.add(operation);
   try{
    const input={childIdentity,reservationRequest:request,payload:clone(payload),stream:false},declaration=await owner.prepareDeclaration(input);if(declaration.status!=='DECLARED_LOCAL')fail('UNAVAILABLE');await assertCurrent();
    // The original dispatch marker cannot be used before reserveServer: doing
    // so would reject the first legitimate dispatch. This one body-free marker
    // closes only the earlier publish/reserve ACK-loss window across restarts.
    await foundation.write(async t=>{await preflight(t,evaluationKey);const prior=await t.get('meta',FLIGHT);if(prior?.jobId===job.id)fail('OUTCOME_UNKNOWN');await foundation.current(t,await foundation.job(t,job.id));await t.put('meta',{id:FLIGHT,version:1,jobId:job.id,childId:job.childIds[0],evaluationKey,origin:c.origin,financialRequest:clone(clientDeclarationRequestData(request))});});
    await assertCurrent();if((await owner.publishDeclaration(declaration,proofs,declarations)).status!=='PUBLISHED_CLIENT_DECLARATION')fail('OUTCOME_UNKNOWN');
    await assertCurrent();if((await owner.reserveDeclaration(declaration,reservations)).status!=='RESERVED_SERVICE')fail('OUTCOME_UNKNOWN');
    await assertCurrent();const bound=await owner.bind(input);if(bound.status!=='BOUND_LOCAL')fail('OUTCOME_UNKNOWN');
    await assertCurrent();let provider;
    // Keep the original branded Qwen provider AND fixed transport. The original
    // dispatch write yields; recheck its content/Source owner at the actual
    // fetch boundary, then its synchronous binding without another await.
    const send=c.fetch??globalThis.fetch,providers=createClientProviderTransport({endpoint:c.origin+'/api/provider',fetch:async request=>{
     const requireLocalCurrent=await assertBeforeSend();if(request.signal.aborted||typeof requireLocalCurrent!=='function')fail('CANCELLED');
     const binding=qwenFoundationProviderData(provider);if(!binding)fail('UNAVAILABLE');binding.current();requireLocalCurrent();
     return send(request);
    }});
    provider=owner.foundationProvider(bound,providers);if(!provider)fail('UNAVAILABLE');
    await foundation.reserveServer(job.id,[provider]);registered=true;await assertCurrent();return {provider,dispose:operation.dispose};
   }catch(error){if(registered)try{await foundation.cancelServer(job.id);}catch{/* Unknown cancellation retains the original hold. */}operation.dispose();throw error;}
  },
  async report(foundation,job){
   current();const s=await foundation.status(job.id),request=s.attempts[0]?.financialRequest;if(!terminal.has(s.state)||!request)fail('RESULT_PENDING');
   const proofs=await c.readProofs(clone(request));current();return foundation.reportResult(job.id,proofs,results);
  },
  dispose(){disposed=true;for(const operation of active)operation.dispose();}
 };
 clients.add(client);return Object.freeze(client);
}
