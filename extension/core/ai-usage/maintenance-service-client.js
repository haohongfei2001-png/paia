import {isSectionPromotionRecoveryAuthorityOwner,sectionPromotionRecoveryAuthorityMatches,openSectionPromotionRecoveryAuthority,closeSectionPromotionRecoveryAuthority,readSectionPromotionRecoveryAuthority,assertSectionPromotionRecoveryAuthorityFacts} from './section-promotion-recovery-authority.js';
import {readMaintenanceSectionPromotionTask,assertMaintenanceSectionPromotionTaskFacts} from './maintenance-section-promotion-session.js';
import {readMaintenanceSectionPromotionPermission,assertMaintenanceSectionPromotionPermissionFacts} from './maintenance-section-promotion-permission.js';
import {isAIFilterConsentSnapshotCurrent} from '../../background/ai-filter-consent.js';
import {assertMaintenanceProcessingReceipt,assertMaintenanceProcessingReceipts,assertMaintenanceProcessingReceiptFacts} from './maintenance-processing-receipt.js';
import {isMaintenanceIdentityCurrentness,maintenanceIdentityCurrentnessFacts,prepareMaintenanceIdentityConnection,claimMaintenanceIdentityChannel,disposeUnclaimedMaintenanceIdentityChannel} from './maintenance-identity-currentness.js';
import {createMaintenanceServiceResponseAdapter,maintenanceServiceResponseContract,MAINTENANCE_SECTION_PROMOTION_RESPONSE_SCHEMA,MAINTENANCE_SECTION_PROMOTION_RESPONSE_INSTRUCTIONS} from './maintenance-service-response.js';
import {savedFinancialCancellation} from './domain-result-receipt.js';
import {clientDeclarationRequestData} from './client-declaration.js';
import {canonical,equal,fail,digest,unitKey} from './contracts.js';
import {snapshot,freeze,exact,integer,token} from './qwen-request-data.js';
import {hashText} from '../dedupe.js';
import {ENVELOPES} from './admission-policy.js';
import {readQwenProfileManifest,createQwenManifestCompiler,readQwenTokenMeasurement} from './qwen-profile-source-adapter.js';
import {createQwenQualifiedRequestOwner,qwenFoundationProviderData} from './qwen-qualified-request.js';
import {createClientDeclarationTransport} from './client-declaration-transport.js';
import {createClientReservationTransport} from './client-reservation-transport.js';
import {createClientProviderTransport} from './client-provider-transport.js';
import {createClientResultTransport} from './client-result-transport.js';
import {createClientOperationStatusTransport,observedClientOperationStatus} from './client-operation-status-transport.js';
import {readMaintenanceFilterSettlement} from './foundation.js';
import {qualifiedCoverageId} from './assist-intent-binding.js';
import {readAIMaintenanceFilterVisibility} from './ai-filter-owner.js';
const filterCapabilities=new WeakMap();
const retiredFilterCurrent=()=>false;
const filterCurrentReader=state=>()=>state.current()===true;
// Only the exact private post-reservation object is accepted; copies have no authority.
export function readMaintenanceFilterCapability(value,store){const state=filterCapabilities.get(value);if(!state||state.store!==store||!state.current())return null;return state.view;}
// Deliberately outside prepareChild: a retained visibility check owns only
// body-free original receipts, never the completed payload/response/session.
function visibilityCurrentness({configuration:c,store,processing,qualification,qualificationScope,consent,identity,profile,expiresAt,available}){
 let lastNow=identity.observedAt,retired=false;const repository=store.repository,database=repository.db;
 return ()=>{try{assertMaintenanceProcessingReceipts([processing,qualification],c.processing,store);const now=c.clock();if(retired||store.repository!==repository||repository.db!==database||!available()||c.isCurrent()!==true||!integer(now)||now<lastNow||now>=expiresAt||c.filterIdentity.isCurrent(identity)!==true||!equal(c.currentProfile()?.profile,profile)||c.service.filter.isConsentCurrent(consent)!==true){retired=true;return false;}assertMaintenanceProcessingReceipts([processing,qualification],c.processing,store);const finalNow=c.clock();assertMaintenanceProcessingReceiptFacts(processing,store);assertMaintenanceProcessingReceiptFacts(qualification,store);if(!integer(finalNow)||finalNow<now||finalNow>=expiresAt||!equal(qualification.scope,qualificationScope)||retired||store.repository!==repository||repository.db!==database||!available()||!isAIFilterConsentSnapshotCurrent(consent)||!maintenanceIdentityCurrentnessFacts(c.filterIdentity,identity,finalNow)){retired=true;return false;}lastNow=finalNow;return true;}catch{retired=true;return false;}};
}
const recoveryRoutes=new WeakMap(),nativeAborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get,nativeAny=AbortSignal.any.bind(AbortSignal),nativeAdd=EventTarget.prototype.addEventListener,nativeRemove=EventTarget.prototype.removeEventListener;
export function openMaintenanceSectionPromotionRecoveryAuthority(client,store,locator,options={}){const route=recoveryRoutes.get(client);return route?route.open(store,locator,options):Promise.resolve(null);}
export function closeMaintenanceSectionPromotionRecoveryAuthority(client,store,cap){return recoveryRoutes.get(client)?.close(store,cap)??false;}
const lifecycleClients=new WeakMap(),lifecycleCaps=new WeakMap();
const lifecycleOwn=(value,key)=>{const descriptor=Object.getOwnPropertyDescriptor(value??{},key);if(!descriptor||!Object.hasOwn(descriptor,'value'))fail('UNAVAILABLE');return descriptor.value;};
function lifecycleFacts(cap,client,store){
 const held=lifecycleCaps.get(cap),state=lifecycleClients.get(client);
 if(!held||held.state!==state||held.client!==client||held.store!==store)fail('UNAVAILABLE');
 try{if(!held.active||state.disposed||state.generation!==held.generation||nativeAborted.call(state.signal)||lifecycleOwn(store,'repository')!==held.repository||lifecycleOwn(held.repository,'db')!==held.database)fail('UNAVAILABLE');return true;}catch(error){held.active=false;throw error;}
}
// A deny-only snapshot of this original client lifetime. It grants no identity,
// fields, ACK authority, or network access. Capture once before the operation;
// delivery must check the same opaque token rather than capturing a new one.
export function captureMaintenanceServiceLifecycle(client,store){const state=lifecycleClients.get(client);if(!state)fail('UNAVAILABLE');return state.capture(store);}
export function assertMaintenanceServiceLifecycleFacts(cap,client,store){return lifecycleFacts(cap,client,store);}
const recoveries=new WeakMap(),clients=new WeakSet(),FLIGHT='aiu:maintenance-service-preflight:v1';
const terminal=new Set(['COMMITTED','REJECTED','EXPIRED_UNCOMMITTED','CANCELLED_BEFORE_DISPATCH']);
const callbacks=['clock','resolveAuthority','isCurrent','onInvalidate','readProfile','currentProfile','tokenize','isCurrentTokenizer','readProofs'];
export const requireMaintenanceServiceClient=value=>{if(!clients.has(value))fail('UNAVAILABLE');return value;};
// The opportunity means only that this available runtime may check its backlog.
// It supplies NO day/window, tier, quota, allowance or financial reservation.
// Those facts belong exclusively to the authenticated original service ledger.
export function createMaintenanceServiceClient(configuration){
 let result=null;try{return result=createMaintenanceServiceClientOwned(configuration);}finally{
  if(!result){const d=configuration&&Object.getOwnPropertyDescriptor(configuration,'filterIdentity');if(d&&Object.hasOwn(d,'value'))disposeUnclaimedMaintenanceIdentityChannel(d.value);}
 }
}
function createMaintenanceServiceClientOwned(configuration){
 let c;try{
  if(!configuration||![Object.prototype,null].includes(Object.getPrototypeOf(configuration)))return null;
  const ds=Object.getOwnPropertyDescriptors(configuration),keys=Reflect.ownKeys(ds),required=['origin','scope','contractVersion','routeVersion','service','processing',...callbacks];
  if(!keys.every(k=>[...required,'fetch','filterIdentity','promotionRecoveryAuthority'].includes(k))||!required.every(k=>keys.includes(k))||keys.some(k=>!Object.hasOwn(ds[k],'value')))return null;
  c=Object.fromEntries(keys.map(k=>[k,ds[k].value]));if(Object.hasOwn(c,'promotionRecoveryAuthority')&&!sectionPromotionRecoveryAuthorityMatches(c.promotionRecoveryAuthority,c))return null;if(Object.hasOwn(c,'filterIdentity')&&!isMaintenanceIdentityCurrentness(c.filterIdentity))return null;if(Object.hasOwn(c,'fetch')&&typeof c.fetch!=='function'||!callbacks.every(k=>typeof c[k]==='function')||!['scope','contractVersion','routeVersion'].every(k=>token(c[k]))||!c.service||!c.processing)return null;
  const url=new URL(c.origin);if(url.origin!==c.origin||url.protocol!=='https:'||url.port||url.username||url.password)return null;
 }catch{return null;}
 const transport=(factory,path)=>factory({endpoint:c.origin+path,...(c.fetch?{fetch:c.fetch}:{})}),declarations=transport(createClientDeclarationTransport,'/api/declarations'),reservations=transport(createClientReservationTransport,'/api/reservations'),results=transport(createClientResultTransport,'/api/results'),status=transport(createClientOperationStatusTransport,'/api/operation-status');
 if([declarations,reservations,results,status].some(x=>!x))return null;
 let service;try{const ds=Object.getOwnPropertyDescriptors(c.service),keys=Reflect.ownKeys(ds);if(![Object.prototype,null].includes(Object.getPrototypeOf(c.service))||keys.some(k=>!['version','topic','context','filter'].includes(k)||!Object.hasOwn(ds[k],'value'))||!['version','topic','context'].every(k=>keys.includes(k)))return null;service=Object.fromEntries(keys.map(k=>[k,ds[k].value]));if(service.filter){const fd=Object.getOwnPropertyDescriptors(service.filter),fk=Reflect.ownKeys(fd),allowed=['enabled','selectScope','captureConsent','isConsentCurrent','authorizeReservation','releaseReservation','retainPublication','archivePublication'];if(![Object.prototype,null].includes(Object.getPrototypeOf(service.filter))||fk.some(k=>!allowed.includes(k)||!Object.hasOwn(fd[k],'value'))||fd.enabled?.value!==true||fk.some(k=>k!=='enabled'&&typeof fd[k].value!=='function'))return null;service.filter=Object.freeze(Object.fromEntries(fk.map(k=>[k,fd[k].value])));}}catch{return null;}
 const responses=createMaintenanceServiceResponseAdapter();
 let disposed=false,releaseIdentity=null;const filterChildren=new Map(),retireFilter=childId=>{const state=filterChildren.get(childId);if(state){state.active=false;filterChildren.delete(childId);filterCapabilities.delete(state.capability);try{service.filter?.releaseReservation?.(state.capability);}catch{/* All other private child leases must still be retired. */}finally{state.current=retiredFilterCurrent;state.view=null;state.foundation=null;state.store=null;state.qualification=null;state.qualificationScope=null;state.filterUnits=null;state.profile=null;}}},retireFilters=jobId=>{for(const [id,state]of filterChildren)if(jobId===undefined||state.jobId===jobId)retireFilter(id);};const active=new Set(),opportunities=new WeakSet(),controller=new AbortController(),current=()=>{if(disposed||nativeAborted.call(controller.signal)||c.isCurrent()!==true)fail('UNAVAILABLE');};
 const lifecycleState={generation:0,disposed:false,signal:controller.signal,capture:null},lifecycleListeners=new Set();let lifecycleSubscribed=false,lifecycleRemove=null,lifecycleDispatching=false;
 const recoveryPending=new Set(),recoveryCaps=new Map();
 const releaseRecovery=(store,cap)=>{const r=recoveryCaps.get(cap);if(!r||r.store!==store)return false;recoveryCaps.delete(cap);r.remove?.();r.controller.abort();return closeSectionPromotionRecoveryAuthority(c.promotionRecoveryAuthority,store,cap);};
 const retireRecoveries=()=>{for(const r of recoveryPending)r.controller.abort();for(const [cap,r]of [...recoveryCaps])releaseRecovery(r.store,cap);};
 const recoveryRoute=Object.freeze({
  async open(store,locator,{signal=null}={}){
   let operation;try{current();if(!isSectionPromotionRecoveryAuthorityOwner(c.promotionRecoveryAuthority)||recoveryPending.size+recoveryCaps.size>=8||signal!==null&&nativeAborted.call(signal))return null;
    const requestController=new AbortController(),combined=nativeAny([controller.signal,requestController.signal,...(signal===null?[]:[signal])]);operation={store,controller:requestController,cap:null,remove:null};recoveryPending.add(operation);
    const cap=await openSectionPromotionRecoveryAuthority(c.promotionRecoveryAuthority,store,locator,{signal:combined});if(!cap)return null;operation.cap=cap;current();
    const view=readSectionPromotionRecoveryAuthority(cap,store,locator);if(disposed||nativeAborted.call(controller.signal)||nativeAborted.call(combined))fail('UNAVAILABLE');assertSectionPromotionRecoveryAuthorityFacts(cap,store,locator);
    recoveryCaps.set(cap,operation);const closed=()=>releaseRecovery(store,cap);nativeAdd.call(view.revocationSignal,'abort',closed,{once:true});operation.remove=()=>nativeRemove.call(view.revocationSignal,'abort',closed);return cap;
   }catch{if(operation?.cap)closeSectionPromotionRecoveryAuthority(c.promotionRecoveryAuthority,store,operation.cap);return null;}finally{if(operation){recoveryPending.delete(operation);if(!operation.cap||!recoveryCaps.has(operation.cap))operation.controller.abort();}}
  },close:releaseRecovery
 });
 // One original source subscription is shared by lifecycle snapshots and the
 // existing session invalidation API. This preserves single-listener hosts and
 // never replaces the session listener when a delivery token is captured.
 const invalidateLifecycle=()=>{lifecycleState.generation++;controller.abort();retireRecoveries();releaseIdentity?.();responses.dispose();retireFilters();};
 const sourceInvalidated=()=>{if(disposed||lifecycleDispatching||nativeAborted.call(lifecycleState.signal))return;lifecycleDispatching=true;try{invalidateLifecycle();for(const listener of [...lifecycleListeners])if(lifecycleListeners.has(listener))try{listener.fn();}catch{/* Private invalidation must reach every subscriber. */}}finally{lifecycleDispatching=false;if(disposed)lifecycleListeners.clear();}};
 const subscribeLifecycle=()=>{if(lifecycleSubscribed)return;lifecycleSubscribed=true;try{const remove=c.onInvalidate(sourceInvalidated);if(typeof remove==='function'){if(disposed||nativeAborted.call(lifecycleState.signal))remove();else lifecycleRemove=remove;}}catch(error){invalidateLifecycle();throw error;}};
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
  sessionOptions:Object.freeze({authority:c.resolveAuthority,service:Object.freeze({...service,...(service.filter?{filter:Object.freeze({enabled:service.filter.enabled,...(service.filter.selectScope?{selectScope:service.filter.selectScope}:{})})}:{}),responseAdapter:responses.adapter}),processing:c.processing,window}),
  options:Object.freeze({scope:c.scope,contractVersion:c.contractVersion,routeVersion:c.routeVersion}),
  available:()=>{try{current();return true;}catch{return false;}},
  // Metadata-only selector hint. It grants no fields, task, request or paid
  // result: prepareChild still requires the original private task and the
  // original Qwen owner revalidates the complete profile/tokenizer binding.
  sectionPromotionAvailable:()=>{try{current();const manifest=readQwenProfileManifest(c.currentProfile()),p=manifest.profile,now=c.clock();current();return integer(now)&&p?.jobType==='AI_MAINTENANCE'&&p.contractVersion===c.contractVersion&&p.routeVersion===c.routeVersion&&p.thinking?.enabled===false&&p.validity?.revoked===false&&integer(p.validity.verifiedAt)&&integer(p.validity.expiresAt)&&p.validity.verifiedAt<=now&&now<p.validity.expiresAt&&p.responseSchemaDigest===manifest.known?.responseSchemaDigest&&equal(manifest.wire?.responseFormat?.json_schema?.schema,MAINTENANCE_SECTION_PROMOTION_RESPONSE_SCHEMA)&&manifest.wire.instructions===MAINTENANCE_SECTION_PROMOTION_RESPONSE_INSTRUCTIONS;}catch{return false;}},
  onInvalidate:fn=>{if(typeof fn!=='function')fail('UNAVAILABLE');if(disposed||nativeAborted.call(lifecycleState.signal)){fn();return ()=>{};}if(lifecycleListeners.size>=8)fail('UNAVAILABLE');const listener={fn};lifecycleListeners.add(listener);try{subscribeLifecycle();}catch(error){lifecycleListeners.delete(listener);throw error;}return ()=>lifecycleListeners.delete(listener);},
  releaseResponseJob:jobId=>responses.releaseJob(jobId),
  releaseResponseChild:childId=>responses.releaseChild(childId),
  releaseFilterChild:childId=>retireFilter(childId),
  releaseFilterJob:jobId=>retireFilters(jobId),
  async publishFilterVisibility(childId,publication,attestation){
   const state=filterChildren.get(childId);if(!state?.current())return false;
   const published=readAIMaintenanceFilterVisibility(publication,state.store),settled=readMaintenanceFilterSettlement(attestation,state.foundation,publication);if(!published||!settled||settled.jobId!==state.jobId||settled.childId!==childId||!equal(settled.units,state.filterUnits)||settled.outcome!==(published.filtered.length?'COMMITTED':'NO_CHANGE'))return false;
   try{const acknowledged=await state.foundation.read(async t=>{
    if(!state.current())return false;const job=await state.foundation.job(t,state.jobId);await state.foundation.current(t,job);if(!state.current())return false;
    const index=job.childIds.indexOf(childId),units=state.filterUnits;if(index<0||!units.length||!equal(job.childCoverage[index].filter(u=>u.facet==='filter'),units)||!units.every(u=>job.committedCoverage.includes(unitKey(u))))return false;
    const r=await t.get('organizerUsage','aiu:attempt:'+childId);if(!state.current()||!r||r.kind!=='ai_usage_v1'||r.version!==1||r.jobId!==job.id||r.childId!==childId||r.sequence!==index||r.executionKind!=='server-backed'||r.serviceOrigin!==state.view.origin||!equal(r.financialRequest,state.view.request)||!['VALIDATED','COMMITTED'].includes(r.state)||r.attemptCount!==1||r.financialSettlement?.state!=='SETTLED'||r.financialSettlement.outcome!=='VALIDATED'||r.operationReceiptId!==r.financialSettlement.receiptId)return false;
    for(const unit of units){const item=job.items.find(i=>i.key===unit.key),ack=await t.get('organizerWorkItems',qualifiedCoverageId(unit,job));if(!state.current()||!item||!ack||ack.kind!=='ai_usage_v1'||ack.jobId!==job.id||ack.state!=='ACKNOWLEDGED'||ack.stateKey!==1||ack.sequence!==index||!equal(ack.unit,unit)||ack.signature!==item.signature||!['COMMITTED','NO_CHANGE'].includes(ack.outcome)||!equal(ack.inputIds,item.descriptor.inputIds)||!equal(ack.sourceRecordIds,item.descriptor.sourceRecordIds))return false;}
    for(const filtered of published.filtered){const row=await t.get('filterInputs',filtered.inputId),decision={version:1,policy:published.policy,authority:published.epochs,scope:published.scope,proof:published.proof,sequence:filtered.sequence};if(!state.current()||row?.aiOperationId!==published.operationId||!equal(row.aiDecision,decision))return false;}
    return state.current();
   });if(!acknowledged||!state.current()||service.filter?.retainPublication?.(state.capability,publication)!==true)return false;try{service.filter?.archivePublication?.({foundation:state.foundation,publication,settlement:attestation,capability:state.capability});}catch{/* History retention failure cannot mint a read lease or replay a paid job. */}return true;}catch{return false;}
  },
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
  async prepareChild(foundation,job,payload,{signal,assertCurrent:assertOriginalCurrent,assertBeforeSend,isCurrent,processing,promotionTask=null}){
   current();
   // A local whole-Section task proves capture, not permission to transmit it.
   // Retain its original private permission identity only for this send phase;
   // the other facets outlive successful proposal consumption and detachment.
   const promotion=promotionTask===null?null:readMaintenanceSectionPromotionTask(promotionTask,foundation.s);let promotionReceipt=null;
   const promotionFacts=()=>{if(promotion){assertMaintenanceSectionPromotionPermissionFacts(promotion.permission,foundation.s,promotion.plan,promotion.binding);assertMaintenanceProcessingReceiptFacts(processing,foundation.s);assertMaintenanceProcessingReceiptFacts(promotionReceipt,foundation.s);assertMaintenanceSectionPromotionTaskFacts(promotionTask,foundation.s);if(disposed||controller.signal.aborted)fail('CANCELLED');}return true;};
   const checkPromotion=()=>{if(!promotion)return true;const granted=readMaintenanceSectionPromotionPermission(promotion.permission,foundation.s,promotion.plan,promotion.binding);if(granted.parent!==processing||promotionReceipt!==null&&promotionReceipt!==granted.receipt)fail('UNAVAILABLE');assertMaintenanceProcessingReceipts([processing,granted.receipt],c.processing,foundation.s);promotionReceipt??=granted.receipt;return promotionFacts();};
   const assertCurrent=async()=>{checkPromotion();await assertOriginalCurrent();promotionFacts();};
   const filterConsent=service.filter?.captureConsent?.()??null;payload=freeze(snapshot(payload));await assertCurrent();const responseContract=maintenanceServiceResponseContract(payload,foundation.s,promotionTask);const metadata=await foundation.read(async t=>{const stored=await foundation.job(t,job.id);await foundation.current(t,stored);const index=stored.childIds.indexOf(payload.childOperationId);if(index<0)fail('STALE_BASE');return foundation.childRequest(stored,index);});
   if(!equal(Object.fromEntries(Object.keys(metadata).map(k=>[k,payload[k]])),metadata))fail('STALE_BASE');
   const childIdentity=Object.fromEntries(['logicalJobId','childOperationId','type','contractVersion','routeVersion','automaticRetries'].map(k=>[k,metadata[k]]));
   const manifest=readQwenProfileManifest(await c.readProfile({childIdentity:structuredClone(childIdentity)}));await assertCurrent();
   if(manifest.profile.jobType!=='AI_MAINTENANCE'||manifest.profile.contractVersion!==c.contractVersion||manifest.profile.routeVersion!==c.routeVersion||manifest.profile.thinking.enabled!==false||!equal(manifest.wire?.responseFormat?.json_schema?.schema,responseContract.schema)||promotionTask!==null&&manifest.wire.instructions!==responseContract.instructions)fail('UNAVAILABLE');
   const compiler=createQwenManifestCompiler(manifest),outputCap=Math.min(ENVELOPES.AI_MAINTENANCE.output,manifest.profile.qualifiedLimits.billableOutputCap),compiled=compiler.compile({childIdentity,inputTokens:0,outputCap,stream:false,now:c.clock()});compiler.dispose();
   if(compiled.status!=='COMPILED_PARTIAL')fail('UNAVAILABLE');
   const body=canonical({model:manifest.profile.model.requested,messages:[{role:'system',content:manifest.wire.instructions},{role:'user',content:canonical(payload)}],response_format:manifest.wire.responseFormat,...compiled.requestControls,...manifest.wire.thinkingControls,n:1}),envelope={method:'POST',endpoint:{scheme:'https',host:manifest.profile.endpoint.host,path:manifest.profile.endpoint.path},headers:{'Content-Type':'application/json'},body},requestDigest=await hashText(canonical(envelope));
   const measurement=readQwenTokenMeasurement(manifest,await c.tokenize({profileId:manifest.profile.id,tokenizerProfileId:manifest.tokenizer.profileId,qualificationRef:manifest.tokenizer.qualificationRef,requestDigest,envelope:structuredClone(envelope)}));await assertCurrent();
   if(!integer(measurement.inputTokens)||c.isCurrentTokenizer(measurement)!==true)fail('UNAVAILABLE');
   const request=await foundation.serverRequest(job.id,metadata.childOperationId,{inputTokens:measurement.inputTokens,outputCap,maxCompletionTokens:compiled.requestControls.max_completion_tokens});
   const proofs=freeze(snapshot(await c.readProofs(structuredClone(request)),{maxBytes:24576,maxKeys:2,maxDepth:1,maxString:8192}));if(!exact(proofs,['principalToken','entitlementToken'])||!Object.values(proofs).every(x=>typeof x==='string'&&x.length>0&&x.length<=8192))fail('UNAVAILABLE');
   const payloadDigest=await hashText(canonical(payload)),authorization=freeze({authorizationId:'maintenance:'+metadata.childOperationId,childIdentity:structuredClone(childIdentity),reservationRequest:structuredClone(request),payloadDigest,expiresAt:Math.min(manifest.profile.validity.expiresAt,measurement.expiresAt)});let reservation=null,identityObservation=null,retired=false,registered=false,filterState=null;
   const live=()=>{try{checkPromotion();const accepted=!disposed&&!retired&&isCurrent()===true&&c.isCurrentTokenizer(measurement)===true;promotionFacts();return accepted&&!disposed&&!retired&&!controller.signal.aborted;}catch{return false;}};
   const owner=createQwenQualifiedRequestOwner({clock:c.clock,
    resolveProfile:async q=>{await assertCurrent();const profile=readQwenProfileManifest(await c.readProfile(q));const contract=maintenanceServiceResponseContract(payload,foundation.s,promotionTask);if(!equal(contract,responseContract)||!equal(profile.wire?.responseFormat?.json_schema?.schema,responseContract.schema)||promotionTask!==null&&profile.wire.instructions!==responseContract.instructions)fail('UNAVAILABLE');return profile;},
    authorizePayload:async q=>{await assertCurrent();if(!live()||!equal(q.childIdentity,childIdentity)||!equal(q.reservationRequest,request)||q.payloadDigest!==payloadDigest)fail('STALE_BASE');return structuredClone(authorization);},
    tokenize:async q=>{await assertCurrent();const v=await c.tokenize(q);if(!equal(v,measurement))fail('STALE_BASE');return v;},
    readReservation:async r=>{await assertCurrent();if(!equal(r,request))fail('STALE_BASE');if(filterConsent&&payload.coverage.some(u=>u.facet==='filter')){const connection=prepareMaintenanceIdentityConnection(c.filterIdentity,{request,...proofs});if(connection!==null)await connection;await assertCurrent();}const identityTicket=c.filterIdentity?.beginObservation(request)??null;let observation;try{observation=await status.query({request,...proofs},identityTicket);await assertCurrent();if(!observedClientOperationStatus(observation,status)||!observation.reservation)fail('OUTCOME_UNKNOWN');reservation=observation.reservation;identityObservation=observedClientOperationStatus(observation,status);c.filterIdentity?.observe(observation,status,identityTicket);}finally{c.filterIdentity?.releaseObservation(identityTicket);}
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
    let provider;const send=c.fetch??globalThis.fetch,providers=createClientProviderTransport({endpoint:c.origin+'/api/provider',fetch:async req=>{const requireLocalCurrent=await assertBeforeSend();if(req.signal.aborted||typeof requireLocalCurrent!=='function')fail('CANCELLED');const binding=qwenFoundationProviderData(provider);if(!binding)fail('UNAVAILABLE');checkPromotion();binding.current();requireLocalCurrent();promotionFacts();return send(new Request(req,{signal:AbortSignal.any([req.signal,signal])}));}});
    provider=owner.foundationProvider(bound,providers);if(!provider)fail('UNAVAILABLE');
    await foundation.reserveMaintenanceServerChild(job.id,provider);registered=true;await assertCurrent();const responseCurrent=()=>!disposed&&!controller.signal.aborted&&isCurrent()===true&&c.isCurrentTokenizer(measurement)===true&&c.clock()<authorization.expiresAt;if(promotionTask!==null){await responses.registerPromotionChild(foundation,payload,responseCurrent,signal,{task:promotionTask,provider});await assertCurrent();}else responses.registerChild(foundation,payload,responseCurrent,signal);
    const identity=identityObservation?.authenticatedIdentity;
    if(payload.coverage.some(u=>u.facet==='filter')&&identity?.tier==='pro'&&filterConsent&&processing&&isMaintenanceIdentityCurrentness(c.filterIdentity)&&typeof service.filter?.authorizeReservation==='function'){
     const inputIds=payload.material.inputs.map(i=>i.inputId).sort(),candidateIds=payload.coverage.filter(u=>u.facet==='filter').map(u=>{try{const key=JSON.parse(u.key);return key[0]==='input'?key[1]:null;}catch{return null;}}).sort();
     if(filterChildren.size>=4||filterChildren.has(metadata.childOperationId))fail('BUDGET_EXCEEDED');
     assertMaintenanceProcessingReceipt(processing,c.processing,foundation.s);
     if(!equal(identityObservation.request,request)||processing.store!==foundation.s||processing.scope?.logicalJobId!==job.id||processing.scope?.childOperationId!==metadata.childOperationId||!['principalId','libraryId','consentEpoch'].every(k=>processing.scope[k]===request[k])||!equal(processing.scope.inputs?.map(i=>i.inputId).sort(),inputIds)||candidateIds.some(id=>typeof id!=='string')||new Set(candidateIds).size!==candidateIds.length)fail('UNAVAILABLE');
     const profile=freeze(structuredClone(manifest.profile));let lastNow=identity.observedAt;const repository=foundation.s.repository,database=repository.db;const capability=Object.freeze(Object.create(null)),state={active:true,jobId:job.id,foundation,filterUnits:freeze(structuredClone(payload.coverage.filter(u=>u.facet==='filter'))),store:foundation.s,qualification:null,qualificationScope:null,profile,capability,current:()=>{try{const receipts=state.qualification?[processing,state.qualification]:[processing];assertMaintenanceProcessingReceipts(receipts,c.processing,foundation.s);const now=c.clock();if(!state.active||foundation.s.repository!==repository||repository.db!==database||disposed||controller.signal.aborted||signal.aborted||c.isCurrent()!==true||isCurrent()!==true||!integer(now)||now<lastNow||now>=Math.min(identity.verifiedUntil,authorization.expiresAt)||c.filterIdentity.isCurrent(identity)!==true||!equal(c.currentProfile()?.profile,profile)||c.isCurrentTokenizer(measurement)!==true||service.filter.isConsentCurrent(filterConsent)!==true){retireFilter(metadata.childOperationId);return false;}assertMaintenanceProcessingReceipts(receipts,c.processing,foundation.s);const finalNow=c.clock();for(const receipt of receipts)assertMaintenanceProcessingReceiptFacts(receipt,foundation.s);if(!integer(finalNow)||finalNow<now||finalNow>=Math.min(identity.verifiedUntil,authorization.expiresAt)||state.qualification&&!equal(state.qualification.scope,state.qualificationScope)||!state.active||filterChildren.get(metadata.childOperationId)!==state||filterCapabilities.get(capability)!==state||foundation.s.repository!==repository||repository.db!==database||disposed||controller.signal.aborted||signal.aborted||!isAIFilterConsentSnapshotCurrent(filterConsent)||!maintenanceIdentityCurrentnessFacts(c.filterIdentity,identity,finalNow)){retireFilter(metadata.childOperationId);return false;}lastNow=finalNow;return true;}catch{retireFilter(metadata.childOperationId);return false;}}};
     state.view=Object.freeze({identity,qualityReceiptRefs:Object.freeze([...profile.qualityReceiptRefs]),request:freeze(structuredClone(request)),origin:c.origin,inputIds:Object.freeze(inputIds),candidateIds:Object.freeze(candidateIds),consent:filterConsent,processingEpoch:processing.epoch,userReadEpoch:request.consentEpoch,isCurrent:filterCurrentReader(state),isVisibilityCurrent:()=>false});filterCapabilities.set(capability,state);filterChildren.set(metadata.childOperationId,state);filterState=state;
    }
    const authorizeFilter=(scope,qualification)=>{
     assertMaintenanceProcessingReceipt(qualification,c.processing,foundation.s);
     if(!filterState?.current())fail('UNAVAILABLE');const selected=freeze(snapshot(scope,{maxBytes:8192,maxKeys:32,maxDepth:2,maxString:200}));
     if(!exact(selected,['candidateIds','neighborIds'])||!Array.isArray(selected.candidateIds)||!equal([...selected.candidateIds].sort(),filterState.view.candidateIds)||selected.candidateIds.length>8||!Array.isArray(selected.neighborIds)||selected.neighborIds.length<1||selected.neighborIds.length>2||new Set(selected.neighborIds).size!==selected.neighborIds.length||selected.neighborIds.some(id=>!filterState.view.inputIds.includes(id)||selected.candidateIds.includes(id)))fail('UNAVAILABLE');
     const expected=freeze({purpose:'ai-maintenance-filter-qualification',logicalJobId:job.id,childOperationId:metadata.childOperationId,principalId:request.principalId,libraryId:request.libraryId,consentEpoch:request.consentEpoch,candidateIds:[...selected.candidateIds].sort(),neighborIds:[...selected.neighborIds].sort(),inputs:[...selected.candidateIds,...selected.neighborIds].sort().map(inputId=>({inputId,selectedFields:['body','note']})),facets:['filter'],coverage:structuredClone(filterState.filterUnits)});
     assertMaintenanceProcessingReceipts([processing,qualification],c.processing,foundation.s);
     if(!exact(qualification,['version','store','caller','scope','epoch','processing','expiresAt','revocationSignal'])||Reflect.ownKeys(qualification).some(k=>!Object.hasOwn(Object.getOwnPropertyDescriptor(qualification,k),'value'))||qualification.version!==1||qualification.store!==foundation.s||qualification.caller!==processing.caller||!token(qualification.epoch)||qualification.processing!==true||!integer(qualification.expiresAt)||qualification.expiresAt<=Date.now()||!(qualification.revocationSignal instanceof AbortSignal)||qualification.revocationSignal.aborted||!equal(snapshot(qualification.scope),expected)||assertMaintenanceProcessingReceipts([processing,qualification],c.processing,foundation.s)!==true||filterState.qualification&&filterState.qualification!==qualification)fail('UNAVAILABLE');
     if(!filterState.qualification){filterState.qualification=qualification;filterState.qualificationScope=expected;filterState.view=Object.freeze({...filterState.view,processingEpoch:qualification.epoch,isVisibilityCurrent:visibilityCurrentness({configuration:{...c,service},store:foundation.s,processing,qualification,qualificationScope:expected,consent:filterConsent,identity:filterState.view.identity,profile:filterState.profile,expiresAt:Math.min(filterState.view.identity.verifiedUntil,authorization.expiresAt),available:()=>!disposed&&!controller.signal.aborted})});}
     if(service.filter.authorizeReservation(filterState.capability,selected)!==true||!filterState.current())fail('UNAVAILABLE');return true;
    };
    return {provider,authorizeFilter,dispose:operation.dispose,scheduling:Object.freeze({nextEligibilityAt:reservation.window.nextEligibilityAt,observedAt:reservation.reservedAt})};
   }catch(error){if(registered)try{await foundation.cancelServer(job.id);}catch{/* Original hold remains unresolved. */}retireFilter(metadata.childOperationId);operation.dispose();throw error;}
  },
  async report(foundation,job){current();const s=await foundation.status(job.id),request=s.attempts.find(r=>r.financialRequest)?.financialRequest;if(!terminal.has(s.state)||!request)fail('RESULT_PENDING');const proofs=await c.readProofs(structuredClone(request));current();return foundation.reportResult(job.id,proofs,results);},
  dispose(){if(disposed)return;disposed=true;lifecycleState.disposed=true;invalidateLifecycle();const remove=lifecycleRemove;lifecycleRemove=null;try{remove?.();}finally{if(!lifecycleDispatching)lifecycleListeners.clear();}/* In-flight finally retains cancellation proofs until its original cleanup. */}
 };
 releaseIdentity=claimMaintenanceIdentityChannel(c.filterIdentity);if(releaseIdentity===false)return null;
 lifecycleState.capture=store=>{const repository=lifecycleOwn(store,'repository'),database=lifecycleOwn(repository,'db');if(!database)fail('UNAVAILABLE');subscribeLifecycle();current();const cap=Object.freeze(Object.create(null));lifecycleCaps.set(cap,{client,state:lifecycleState,store,repository,database,generation:lifecycleState.generation,active:true});lifecycleFacts(cap,client,store);return cap;};
 lifecycleClients.set(client,lifecycleState);
 recoveryRoutes.set(client,recoveryRoute);clients.add(client);return Object.freeze(client);
}
