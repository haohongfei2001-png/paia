import {readSectionPromotionRecoveryLocator} from './section-promotion-checkpoint.js';
import {readMaintenanceSectionPromotionPermission,assertMaintenanceSectionPromotionPermissionFacts,releaseMaintenanceSectionPromotionPermission} from './maintenance-section-promotion-permission.js';
import {SectionPromotionConfirmations} from './section-promotion-confirmation.js';
import {fail,equal} from './contracts.js';
import {snapshot,freeze} from './qwen-request-data.js';
import {SectionPromotionService,assertDetachedSectionPromotionCurrent} from '../topic-promotion.js';
import {readTopicProcessingAuthority,topicProcessingAuthorityWorkBudget} from '../topic-processing-authority.js';
import {assertMaintenanceQualification,assertMaintenanceQualificationFacts,maintenanceQualificationReceipt,maintenanceQualificationWorkBudget,chargeMaintenanceQualificationHash} from './maintenance-qualification.js';
import {maintenanceSectionPromotionRequest,captureMaintenanceSectionPromotion,checkMaintenanceSectionPromotion,assertMaintenanceSectionPromotionFacts,maintenanceSectionPromotionPayload,settleMaintenanceSectionPromotion,acceptMaintenanceSectionPromotion,detachMaintenanceSectionPromotion,maintenanceDetachedSectionPromotion,freezeMaintenanceDetachedSectionPromotionPublications,releaseMaintenanceDetachedSectionPromotion,releaseMaintenanceSectionPromotion} from './maintenance-section-promotion.js';
import * as responseOwner from './maintenance-service-response.js';
import * as sessionOwner from './local-maintenance-session.js';

const need=(value,code='UNAVAILABLE')=>{if(!value)fail(code);};
const aborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get;
const signalOff=s=>s!==null&&aborted.call(s);
const pending=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});promise.catch(()=>{});return {promise,resolve,reject};};
const tasks=new WeakMap(),offers=new WeakMap(),owners=new WeakMap(),offeredOperations=new WeakMap();
// Fixed reader for the original source adapter. A ready DTO never selects an
// extended wire contract: it must retain this same active original task cap.
export function readMaintenanceSectionPromotionTask(handle,store){const r=tasks.get(handle);need(r&&r.store===store&&r.database===store.repository.db&&r.phase==='waiting','STALE_BASE');r.current();const payload=maintenanceSectionPromotionPayload(r.capture,store);r.current();return Object.freeze({binding:r.binding,payload,plan:r.plan,permission:r.payloadPermission});}

export function chargeMaintenanceSectionPromotionTaskHash(handle,store,text){const r=tasks.get(handle);need(r&&r.store===store&&r.database===store.repository.db&&r.phase==='waiting','STALE_BASE');r.current();chargeMaintenanceQualificationHash(r.qualification,store,text);r.current();return true;}
// Original child orchestration only. There is no provider, reservation, grant
// issuer, durable Inbox or fourth facet here. Missing source capabilities reject.
export class MaintenanceSectionPromotionTasks {
 #tasks=new Set();#offers=new Set();#recovering=0;#closed=false;#source;#store;#database;#repository;#abort;#confirmation;
 constructor(store,{resolveProcessing,parameters,decisionVersion,isCurrent,signal=null,confirmation=null}={}){
  need(store?.repository?.db&&typeof resolveProcessing==='function'&&typeof isCurrent==='function'&&typeof decisionVersion==='string'&&/^[-a-zA-Z0-9_.]{1,80}$/.test(decisionVersion)&&(!signal||signal instanceof AbortSignal));
  this.#store=store;this.#repository=store.repository;this.#database=store.repository.db;this.#source={resolveProcessing,parameters,decisionVersion,isCurrent,signal};this.#confirmation=new SectionPromotionConfirmations(store,{confirmation,parameters,decisionVersion,isCurrent:this.#confirmationCurrent()});this.#abort=this.#abortCallback();signal?.addEventListener('abort',this.#abort,{once:true});this.#current();owners.set(this,{store,repository:this.#repository,database:this.#database,signal,state:this.#stateCallback()});
 }
 #confirmationCurrent(){return ()=>this.#current();}
 #abortCallback(){return ()=>this.#dispose();}
 #stateCallback(){return ()=>this.#state();}
 #offerExpiry(offer,retained){return ()=>{if(offers.get(offer)===retained&&retained.phase==='offered')this.#release(offer);};}
 #current(){need(!this.#closed&&this.#store.repository===this.#repository&&this.#repository.db===this.#database&&!signalOff(this.#source.signal));let current;try{current=this.#source.isCurrent();}catch{this.#dispose();fail('UNAVAILABLE');}if(current!==true){if(current instanceof Promise)current.catch(()=>{});this.#dispose();fail('UNAVAILABLE');}need(!this.#closed&&this.#store.repository===this.#repository&&this.#repository.db===this.#database&&!signalOff(this.#source.signal));return true;}
 #task(handle){const r=tasks.get(handle);need(r&&r.owner===this&&this.#tasks.has(handle),'STALE_BASE');try{this.#current();need(!r.cancelled&&!signalOff(r.signal),'STALE_BASE');assertMaintenanceQualification(r.qualification,this.#store);if(r.payloadPermission!==null)readMaintenanceSectionPromotionPermission(r.payloadPermission,this.#store,r.plan,r.binding);assertMaintenanceQualificationFacts(r.qualification,this.#store);need(this.#tasks.has(handle)&&!r.cancelled&&!signalOff(r.signal)&&!signalOff(this.#source.signal),'STALE_BASE');return r;}catch(error){this.#release(handle);throw error;}}
 #offer(handle){const r=offers.get(handle);need(r&&r.owner===this&&this.#offers.has(handle)&&r.phase==='offered','STALE_BASE');try{this.#current();assertDetachedSectionPromotionCurrent(maintenanceDetachedSectionPromotion(r.detached,this.#store).ticket,this.#store);return r;}catch(error){this.#release(handle);throw error;}}
 begin(plan,binding,{qualification,signal=null,payloadPermission=null}={}){
  this.#current();need(typeof this.#source.resolveProcessing==='function'&&this.#tasks.size+this.#offers.size<8&&(!signal||signal instanceof AbortSignal)&&!signalOff(signal));assertMaintenanceQualification(qualification,this.#store);
  const payloadGrant=payloadPermission===null?null:readMaintenanceSectionPromotionPermission(payloadPermission,this.#store,plan,binding);assertMaintenanceQualificationFacts(qualification,this.#store);
  const request=maintenanceSectionPromotionRequest(plan,this.#store,binding),copied=freeze(snapshot(binding)),receipt=maintenanceQualificationReceipt(qualification,this.#store);need(receipt.scope.binding?.logicalJobId===copied.logicalJobId&&receipt.scope.binding?.childOperationId===copied.childOperationId,'STALE_BASE');const workBudget=maintenanceQualificationWorkBudget(qualification,this.#store),ready=pending(),response=pending(),handle=Object.freeze({});
  const r={owner:this,store:this.#store,database:this.#database,current:()=>this.#task(handle),plan,binding:copied,qualification,payloadPermission,workBudget,signal,ready,response,capture:null,detached:null,phase:'preparing',cancelled:false,result:null,resultBinding:null,service:null,task:null,abort:null,timer:null,fieldSignal:null,permissionSignals:[]};tasks.set(handle,r);this.#tasks.add(handle);
  const processing=async(t,scope)=>{this.#task(handle);const result=await this.#source.resolveProcessing(t,scope);this.#task(handle);const descriptor=Object.getOwnPropertyDescriptor(result||{},'authority');need(descriptor&&Object.hasOwn(descriptor,'value'));const current=readTopicProcessingAuthority(descriptor.value,this.#store,t,scope);need(current.epoch===result.epoch&&topicProcessingAuthorityWorkBudget(descriptor.value,this.#store,t,scope)===workBudget);return result;};
  r.service=new SectionPromotionService(this.#store,{resolveProcessing:processing,resolveQualification:()=>{this.#task(handle);return qualification;},parameters:this.#source.parameters,decision:{version:this.#source.decisionVersion,assess:async(_view,_reader,original)=>{this.#task(handle);r.capture=await captureMaintenanceSectionPromotion(this.#store,plan,original,copied);this.#task(handle);r.phase='waiting';ready.resolve(maintenanceSectionPromotionPayload(r.capture,this.#store));return response.promise;}}});
  r.abort=()=>this.#release(handle);signal?.addEventListener('abort',r.abort,{once:true});const expiry=Math.min(receipt.expiresAt,...(payloadGrant?[payloadGrant.receipt.expiresAt,payloadGrant.parent.expiresAt]:[]));r.permissionSignals=payloadGrant?[...new Set([payloadGrant.receipt.revocationSignal,payloadGrant.parent.revocationSignal])]:[];for(const signal of r.permissionSignals)signal.addEventListener('abort',r.abort,{once:true});r.fieldSignal=receipt.revocationSignal;r.fieldSignal.addEventListener('abort',r.abort,{once:true});r.timer=setTimeout(r.abort,Math.max(0,expiry-Date.now()));
  r.task=r.service.prepare(request,{signal}).then(preview=>{this.#task(handle);return preview;},error=>{ready.reject(error);this.#release(handle);throw error;});r.task.catch(()=>{});return handle;
 }
 async ready(handle){const r=this.#task(handle),payload=await r.ready.promise;this.#task(handle);need(r.phase==='waiting');await this.check(handle);return payload;}
 async check(handle){const r=this.#task(handle);try{need(r.phase==='waiting','STALE_BASE');await checkMaintenanceSectionPromotion(r.capture,this.#store);this.#task(handle);need(r.phase==='waiting','STALE_BASE');return assertMaintenanceSectionPromotionTaskFacts(handle,this.#store);}catch(error){this.#release(handle);throw error;}}
 async settle(handle,result){
  const r=this.#task(handle);
  try{
   need(r.phase==='waiting'&&typeof responseOwner.takeMaintenanceSectionPromotionResponse==='function','STALE_BASE');
   const source=responseOwner.takeMaintenanceSectionPromotionResponse(result,this.#store);this.#task(handle);need(source&&source.binding.logicalJobId===r.binding.logicalJobId&&source.binding.childOperationId===r.binding.childOperationId&&typeof source.binding.operationReceiptId==='string'&&source.binding.operationReceiptId.length>0,'STALE_BASE');
   r.result=result;r.resultBinding=freeze(snapshot(source.binding));r.sourceAuthority=source.sourceAuthority?freeze(snapshot(source.sourceAuthority,{maxBytes:2048,maxKeys:8,maxDepth:2,maxString:200})):null;r.financialBinding=source.financialBinding?freeze(snapshot(source.financialBinding,{maxBytes:2048,maxKeys:4,maxDepth:2,maxString:500})):null;const mapped=await settleMaintenanceSectionPromotion(r.capture,this.#store,source.proposal);this.#task(handle);
   if(mapped.status==='DEFER'){r.response.reject(Object.assign(Error('PROMOTION_DEFER'),{code:'PROMOTION_DEFER'}));await r.task.catch(()=>{});this.#release(handle);return {status:'DEFER',reason:mapped.reason};}
   r.phase='settling';r.response.resolve(mapped.assessment);const preview=await r.task;this.#task(handle);await acceptMaintenanceSectionPromotion(r.capture,this.#store,preview);this.#task(handle);r.detached=detachMaintenanceSectionPromotion(r.capture,this.#store);r.capture=null;if(r.payloadPermission!==null)releaseMaintenanceSectionPromotionPermission(r.payloadPermission);r.payloadPermission=null;r.phase='accepted';return {status:'PROPOSE'};
  }catch(error){this.#release(handle);throw error;}
 }
 async finish(handle,handoff){
  const r=this.#task(handle);
  try{
   need(r.phase==='accepted'&&typeof sessionOwner.readMaintenanceSectionPromotionHandoff==='function','STALE_BASE');
   const source=sessionOwner.readMaintenanceSectionPromotionHandoff(handoff,this.#store);this.#task(handle);need(source&&source.proposalResult===r.result&&equal(source.binding,r.resultBinding)&&Number.isSafeInteger(source.publicationStart)&&source.publicationStart>=0&&Array.isArray(source.publications),'STALE_BASE');
   const publications=Object.freeze([...source.publications]);await this.#store.run(()=>this.#repository.transaction(false,t=>freezeMaintenanceDetachedSectionPromotionPublications(this.#store,t,r.detached,{workBudget:r.workBudget,publications})));this.#task(handle);
   const original=maintenanceDetachedSectionPromotion(r.detached,this.#store),offer=Object.freeze({}),expiresAt=original.expiresAt,operationId=original.request.operationId,retained={owner:this,detached:r.detached,ticket:original.ticket,binding:r.resultBinding,sourceAuthority:r.sourceAuthority,financialBinding:r.financialBinding,phase:'offered',timer:null,operationId};let index=offeredOperations.get(this.#store);if(!index){index=new Map();offeredOperations.set(this.#store,index);}need(index.size<8&&!index.has(operationId),'UNAVAILABLE');index.set(operationId,{owner:this,handle:offer,store:this.#store,repository:this.#repository,database:this.#database,retained,topicId:original.request.topicId,sectionId:original.request.sectionId});offers.set(offer,retained);this.#offers.add(offer);retained.timer=setTimeout(this.#offerExpiry(offer,retained),Math.max(0,expiresAt-Date.now()));r.detached=null;this.#release(handle);return offer;
  }catch(error){this.#release(handle);throw error;}
 }
 proposal(handle){const r=this.#offer(handle);need(r.phase==='offered','STALE_BASE');return maintenanceDetachedSectionPromotion(r.detached,this.#store).preview;}
 descriptor(handle){const r=this.#offer(handle);need(r.phase==='offered','STALE_BASE');const value=maintenanceDetachedSectionPromotion(r.detached,this.#store);return Object.freeze({operationId:value.request.operationId,expiresAt:value.expiresAt,preview:value.preview,paidBinding:r.binding,...(r.financialBinding?{financialBinding:r.financialBinding}:{}),...(r.sourceAuthority?{sourceAuthority:r.sourceAuthority}:{})});}
 available({topicId,sectionId}){this.#current();const matching=[];for(const handle of [...this.#offers]){if(offers.get(handle)?.phase!=='offered')continue;let r;try{r=this.#offer(handle);}catch{continue;}if(r.phase!=='offered')continue;const value=maintenanceDetachedSectionPromotion(r.detached,this.#store);if(value.request.topicId===topicId&&value.request.sectionId===sectionId)matching.push(handle);}return matching.length===1?matching[0]:null;}
 async confirm(handle,{signal=null,isCurrent=()=>true,confirmationLocator=null}={}){const r=this.#offer(handle);need(r.phase==='offered','STALE_BASE');r.phase='confirming';clearTimeout(r.timer);try{return await this.#confirmation.confirm(r.detached,{signal,isCurrent,confirmationLocator});}finally{this.#release(handle);}}

 async result(operationId,options){this.#current();this.#recovering++;try{return await this.#confirmation.result(operationId,options);}finally{this.#recovering--;}}
 async resume(operationId,options){this.#current();this.#recovering++;try{return await this.#confirmation.resume(operationId,options);}finally{this.#recovering--;}}
 #state(){this.#current();for(const handle of [...this.#offers]){if(offers.get(handle)?.phase==='offered')try{this.#offer(handle);}catch{}}let offered=0,confirming=this.#recovering;for(const handle of this.#offers){if(offers.get(handle)?.phase==='offered')offered++;else if(offers.get(handle)?.phase==='confirming')confirming++;}return Object.freeze({tasks:this.#tasks.size,offers:offered,confirming});}
 release(handle){return this.#release(handle);}
 #release(handle){
  const r=tasks.get(handle);if(r?.owner===this){r.cancelled=true;clearTimeout(r.timer);r.signal?.removeEventListener('abort',r.abort);r.fieldSignal?.removeEventListener('abort',r.abort);for(const signal of r.permissionSignals)signal.removeEventListener('abort',r.abort);r.permissionSignals=[];const error=Object.assign(Error('PROMOTION_CANCELLED'),{code:'UNAVAILABLE'});r.ready.reject(error);r.response.reject(error);if(r.capture)releaseMaintenanceSectionPromotion(r.capture);if(r.detached)releaseMaintenanceDetachedSectionPromotion(r.detached);releaseMaintenanceSectionPromotion(r.plan);if(r.payloadPermission!==null)releaseMaintenanceSectionPromotionPermission(r.payloadPermission);r.payloadPermission=null;r.capture=null;r.detached=null;r.result=null;this.#tasks.delete(handle);tasks.delete(handle);if(!this.#tasks.size&&this.#offers.size)this.#source.resolveProcessing=null;return;}
  const offer=offers.get(handle);if(offer?.owner===this){const index=offeredOperations.get(this.#store);if(index?.get(offer.operationId)?.handle===handle)index.delete(offer.operationId);clearTimeout(offer.timer);releaseMaintenanceDetachedSectionPromotion(offer.detached);offers.delete(handle);this.#offers.delete(handle);}
 }
 dispose(){return this.#dispose();}
 #dispose(){if(this.#closed)return;this.#closed=true;this.#confirmation.dispose();this.#source.signal?.removeEventListener('abort',this.#abort);for(const handle of [...this.#tasks,...this.#offers])this.#release(handle);}
}

// Fixed source routes retain the original class implementation and private owner
// identity. Overridden public methods or an instanceof-shaped object cannot
// supply an offer, authorize confirmation, or replace durable recovery.
const sourceMethods=Object.freeze(Object.fromEntries(['available','descriptor','confirm','release','result','resume','dispose'].map(name=>[name,MaintenanceSectionPromotionTasks.prototype[name]])));
function sourceOwner(owner,store){const r=owners.get(owner);need(r&&r.store===store&&r.repository===store?.repository&&r.database===store.repository.db,'STALE_BASE');return owner;}
export function findMaintenanceSectionPromotionOffer(owner,store,request){return sourceMethods.available.call(sourceOwner(owner,store),request);}
export function readMaintenanceSectionPromotionOffer(owner,store,handle){return sourceMethods.descriptor.call(sourceOwner(owner,store),handle);}
// Deny-only facts for an allocation already bound to this original handle.
// Run after the caller's current callbacks; never consult a source issuer or
// refresh its descriptor, detached proposal, expiry or paid-result identity.
export function assertMaintenanceSectionPromotionOfferFacts(owner,store,handle){
 const record=owners.get(owner),r=offers.get(handle),own=(object,key)=>{const d=Object.getOwnPropertyDescriptor(object??{},key);need(d&&Object.hasOwn(d,'value'),'STALE_BASE');return d.value;};
 const check=()=>{need(record&&record.store===store&&own(store,'repository')===record.repository&&own(record.repository,'db')===record.database&&!signalOff(record.signal)&&r&&offers.get(handle)===r&&r.owner===owner&&r.phase==='offered'&&offeredOperations.get(store)?.get(r.operationId)?.retained===r,'STALE_BASE');};
 check();assertDetachedSectionPromotionCurrent(r.ticket,store);check();return true;
}
export function confirmMaintenanceSectionPromotionOffer(owner,store,handle,options){return sourceMethods.confirm.call(sourceOwner(owner,store),handle,options);}
export function releaseMaintenanceSectionPromotionOffer(owner,store,handle){sourceMethods.release.call(sourceOwner(owner,store),handle);return true;}
export function resultMaintenanceSectionPromotion(owner,store,operationId,options){return sourceMethods.result.call(sourceOwner(owner,store),operationId,options);}
export function resumeMaintenanceSectionPromotion(owner,store,operationId,options){return sourceMethods.resume.call(sourceOwner(owner,store),operationId,options);}

export function readMaintenanceSectionPromotionOwnerState(owner,store){sourceOwner(owner,store);return owners.get(owner).state();}

// Revocation/restore may already have replaced the live database. Cleanup only
// releases this original owner's resources; it grants no read or new operation.
export function disposeMaintenanceSectionPromotionOwner(owner,store){const r=owners.get(owner);need(r&&r.store===store,'STALE_BASE');sourceMethods.dispose.call(owner);return true;}

// All issuer callbacks must run first. This fixed final sweep invokes none and
// cannot grant a body read, a new transaction, or a replacement baseline.
export function assertMaintenanceSectionPromotionTaskFacts(handle,store){
 const r=tasks.get(handle);need(r&&r.store===store&&r.database===store.repository.db&&r.phase==='waiting'&&!r.cancelled&&!signalOff(r.signal),'STALE_BASE');if(r.payloadPermission!==null)assertMaintenanceSectionPromotionPermissionFacts(r.payloadPermission,store,r.plan,r.binding);assertMaintenanceQualificationFacts(r.qualification,store);return assertMaintenanceSectionPromotionFacts(r.capture,store);
}

// Only an authenticated original historical locator can retire the matching
// still-live paid proposal. The bounded index contains existing live offers
// only and is cleared by their original release/expiry path. No tombstone or
// processing authority is created here.
export function retireMaintenanceSectionPromotionHistoryOffer(store,locator){
 const history=readSectionPromotionRecoveryLocator(locator,store);need(history.phase==='unwritten','STALE_BASE');const held=offeredOperations.get(store)?.get(history.operationId);if(!held)return false;
 const r=held.retained;need(held.store===store&&held.repository===store.repository&&held.database===store.repository.db&&offers.get(held.handle)===r&&r.owner===held.owner&&held.topicId===history.sourceTopicId&&held.sectionId===history.sourceSectionId&&equal(r.binding,history.paidBinding)&&equal(r.sourceAuthority,history.sourceAuthority)&&r.financialBinding?.origin===history.serviceOrigin&&r.financialBinding?.requestHash===history.paidRequestHash,'STALE_BASE');
 sourceMethods.release.call(held.owner,held.handle);return true;
}
