import {readSectionPromotionRecoveryLocator,SectionPromotionCheckpoints} from '../core/ai-usage/section-promotion-checkpoint.js';
import * as maintenanceSession from '../core/ai-usage/local-maintenance-session.js';
import {MaintenanceSectionPromotionTasks,findMaintenanceSectionPromotionOffer,readMaintenanceSectionPromotionOffer,confirmMaintenanceSectionPromotionOffer,releaseMaintenanceSectionPromotionOffer,resultMaintenanceSectionPromotion,resumeMaintenanceSectionPromotion} from '../core/ai-usage/maintenance-section-promotion-session.js';
import {LocalMaintenanceSession,getMaintenanceSectionPromotion,maintenanceSectionPromotionResult,maintenanceSectionPromotionResume} from '../core/ai-usage/local-maintenance-session.js';
import {ArchiveError} from '../core/constants.js';
import {ManualSectionPromotionService,MANUAL_PROMOTION_PREFIX} from '../core/topic-promotion-manual.js';
import {restoreSectionPromotion} from '../core/topic-promotion-history.js';
import {PROMOTION_LIMITS} from '../core/topic-promotion-policy.js';
import {topicRootTarget} from '../core/topic-root-target.js';
const TYPE='PAIA_LIBRARY_SECTION_PROMOTION';
const reject=code=>{throw new ArchiveError(code);};
const shape=(v,keys)=>v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).length===keys.length&&keys.every(key=>Object.hasOwn(v,key));
const id=v=>typeof v==='string'&&v.length>=1&&v.length<=200;
const operation=v=>id(v)&&v.length>=8&&!v.includes(':');
const publicResult=r=>r?{state:'committed',id:r.id,operationId:r.operationId,historyOperationId:r.historyOperationId,sourceTopicId:r.sourceTopicId,sourceSectionId:r.sourceSectionId,entryIds:r.entryIds}:null;

// A single trusted Archive adapter for the original explicit-user owner. Wire
// tokens index private real prepare capabilities; they are never Core issuers.
export class TopicSectionPromotionCommands {
 #promotions;#promotionSession;#checkpoints=null;#recovery=new Map();#acks=new Map();#prepared=new Map();#preparing=0;#running=new Map();#challenges=new Map();#claimed=new Set();
 constructor(store,api,{clients=globalThis.clients,promotionTasks=null,promotionSession=null,checkpointStorage=null}={}){if(promotionTasks!==null&&!(promotionTasks instanceof MaintenanceSectionPromotionTasks)||promotionSession!==null&&!(promotionSession instanceof LocalMaintenanceSession)||promotionTasks!==null&&promotionSession!==null)reject('INVALID_REQUEST');this.#promotions=promotionTasks;this.#promotionSession=promotionSession;this.store=store;this.api=api;this.clients=clients;this.service=new ManualSectionPromotionService(store);if(checkpointStorage!==null)this.#checkpoints=new SectionPromotionCheckpoints(store,checkpointStorage);}
 ownURL(url){const base=this.api.runtime.getURL('ui/archive.html');return url===base||typeof url==='string'&&url.startsWith(base+'#')&&topicRootTarget(url)!==null;}
 source(sender){if(sender?.id!==this.api.runtime.id||sender.frameId!==0||!Number.isSafeInteger(sender.tab?.id)||sender.tab.id<0||!Number.isSafeInteger(sender.tab?.windowId)||sender.tab.windowId<0||sender.tab.incognito!==false||!id(sender.documentId)||!this.ownURL(sender.url)||sender.documentLifecycle&&sender.documentLifecycle!=='active')reject('FORBIDDEN');}
 async tab(sender){this.source(sender);const tab=await this.api.tabs.get(sender.tab.id);if(tab?.id!==sender.tab.id||tab.windowId!==sender.tab.windowId||tab.incognito!==false||tab.url!==sender.url||tab.pendingUrl)reject('FORBIDDEN');return tab;}
 ownClient(c){return c&&id(c.id)&&c.type==='window'&&c.frameType==='top-level'&&this.ownURL(c.url);}
 async sameClient(c){const current=await this.clients.get(c.id);if(!this.ownClient(current)||current.id!==c.id||current.url!==c.url)reject('FORBIDDEN');}
 async identify(r,sender){
  if(!shape(r,['type','command','nonce'])||typeof r.nonce!=='string')reject('INVALID_REQUEST');
  const c=this.#challenges.get(r.nonce);if(!c||c.consumed)reject('FORBIDDEN');c.consumed=true;
  this.source(sender);if(sender.documentId!==c.sender.documentId||sender.tab.id!==c.sender.tab.id||sender.tab.windowId!==c.sender.tab.windowId||sender.url!==c.sender.url)reject('FORBIDDEN');
  await this.tab(sender);await this.sameClient(c.client);if(this.#challenges.get(r.nonce)!==c)reject('FORBIDDEN');
  return {nonce:r.nonce,documentId:sender.documentId,tabId:sender.tab.id,windowId:sender.tab.windowId,incognito:false};
 }
 async probe(client,sender){
  if(this.#challenges.size>=8)reject('REQUEST_ALREADY_IN_FLIGHT');
  const nonce=crypto.randomUUID(),channel=new MessageChannel(),expected={client,sender:structuredClone(sender),consumed:false};this.#challenges.set(nonce,expected);
  try{
   const result=await new Promise((resolve,rejectPromise)=>{
    const timer=setTimeout(()=>rejectPromise(new ArchiveError('UNAVAILABLE')),30000);
    const finish=(fn,value)=>{clearTimeout(timer);fn(value);};
    channel.port1.onmessage=e=>{const r=e.data;if(!shape(r,['type','nonce','documentId','tabId','windowId','incognito'])||r.type!=='PAIA_SECTION_PROMOTION_IDENTITY'||r.nonce!==nonce||r.documentId!==sender.documentId||r.tabId!==sender.tab.id||r.windowId!==sender.tab.windowId||r.incognito!==false||!expected.consumed)return finish(rejectPromise,new ArchiveError('FORBIDDEN'));finish(resolve,r);};
    channel.port1.onmessageerror=()=>finish(rejectPromise,new ArchiveError('UNAVAILABLE'));
    try{client.postMessage({type:'PAIA_SECTION_PROMOTION_IDENTITY',version:1,nonce},[channel.port2]);}catch{finish(rejectPromise,new ArchiveError('UNAVAILABLE'));}
   });await this.sameClient(client);return result;
  }finally{this.#challenges.delete(nonce);channel.port1.onmessage=null;channel.port1.onmessageerror=null;channel.port1.close();channel.port2.close();}
 }
 async document(sender){
  await this.tab(sender);
  if(typeof this.api.runtime.getContexts==='function'){
   const contexts=await this.api.runtime.getContexts({contextTypes:['TAB'],tabIds:[sender.tab.id]});
   if(!Array.isArray(contexts)||contexts.some(c=>!c||c.contextType!=='TAB'||!Number.isInteger(c.tabId)||!Number.isInteger(c.windowId)||!Number.isInteger(c.frameId)||typeof c.documentId!=='string'||typeof c.documentUrl!=='string'||typeof c.incognito!=='boolean'))reject('UNAVAILABLE');
   if(!contexts.some(c=>c.tabId===sender.tab.id&&c.windowId===sender.tab.windowId&&c.frameId===0&&c.documentId===sender.documentId&&c.documentUrl===sender.url&&c.incognito===false))reject('FORBIDDEN');return {documentId:sender.documentId};
  }
  if(typeof this.clients?.matchAll!=='function'||typeof this.clients?.get!=='function')reject('UNAVAILABLE');
  const clients=await this.clients.matchAll({type:'window',includeUncontrolled:true});if(!Array.isArray(clients))reject('UNAVAILABLE');
  for(const client of clients){if(client?.url!==sender.url)continue;if(!this.ownClient(client))reject('UNAVAILABLE');try{await this.probe(client,sender);await this.tab(sender);await this.sameClient(client);return {clientId:client.id,url:client.url};}catch(error){if(error.code!=='FORBIDDEN')throw error;}}
  reject('FORBIDDEN');
 }
 async current(sender){this.source(sender);const status=await this.store.status();if(!status.consented)reject('CONSENT_REQUIRED');return this.document(sender);}
 async sweep(){
  for(const [token,p]of this.#prepared){
   if(this.#running.has(p.operationId))continue;let expired=Date.parse(this.store.clock())>=p.expiresAt;
   if(!expired&&p.witness?.clientId){const c=await this.clients.get(p.witness.clientId);expired=!c||!this.ownClient(c)||c.url!==p.witness.url;}
   else if(!expired&&typeof this.api.runtime.getContexts==='function'){
    const contexts=await this.api.runtime.getContexts({contextTypes:['TAB'],documentIds:[p.sender.documentId]});
    if(!Array.isArray(contexts)||contexts.some(c=>!c||typeof c.documentId!=='string'||typeof c.documentUrl!=='string'||!Number.isInteger(c.tabId)||!Number.isInteger(c.windowId)||!Number.isInteger(c.frameId)||typeof c.incognito!=='boolean'))reject('UNAVAILABLE');
    expired=!contexts.some(c=>c.documentId===p.sender.documentId&&c.documentUrl===p.sender.url&&c.tabId===p.sender.tab.id&&c.windowId===p.sender.tab.windowId&&c.frameId===0&&c.incognito===false);
   }
   if(expired&&!this.#running.has(p.operationId)){if(!p.confirmationStarted){if(p.kind==='ai')releaseMaintenanceSectionPromotionOffer(p.owner,this.store,p.handle);else this.service.cancel(p.handle);}this.#claimed.delete(p.handle);this.#prepared.delete(token);}
  }
 }
 forget(operationId){for(const [token,p]of this.#prepared)if(p.operationId===operationId){if(p.kind==='ai')releaseMaintenanceSectionPromotionOffer(p.owner,this.store,p.handle);this.#claimed.delete(p.handle);this.#prepared.delete(token);}}
 supported(){if(this.store.humanLibraryJournal)reject('BNS_GROUP_OWNER_UNSUPPORTED');}
 async handle(r,sender){
  if(!r||r.type!==TYPE||typeof r.command!=='string')reject('INVALID_REQUEST');this.#pruneRecovery();
  if(r.command==='identify')return this.identify(r,sender);
  const keys={acknowledge:['type','command','token'],proposal:['type','command','request'],proposal_result:['type','command','operationId'],proposal_resume:['type','command','operationId'],prepare:['type','command','request'],confirm:['type','command','token','confirmed'],cancel:['type','command','token'],resume:['type','command','operationId'],result:['type','command','operationId'],restore:['type','command','request']}[r.command];
  if(!keys||!shape(r,keys))reject('INVALID_REQUEST');await this.current(sender);if(!['cancel','result','proposal_result'].includes(r.command))this.supported();
  if(r.command==='acknowledge'){
   const accepted=this.#acks.get(r.token);if(!accepted||accepted.sender.documentId!==sender.documentId||accepted.sender.tab.id!==sender.tab.id||accepted.sender.tab.windowId!==sender.tab.windowId||accepted.sender.url!==sender.url)reject('INVALID_REQUEST');
   await this.#checkpoints.clear(accepted.cap,()=>{this.#deliveryFacts(accepted.delivery);return this.#acks.get(r.token)===accepted;});await this.current(sender);this.#acks.delete(r.token);this.#recovery.delete(accepted.operationId);return {state:'acknowledged'};
  }
  if(r.command==='proposal'){
   if(!shape(r.request,['topicId','sectionId'])||!id(r.request.topicId)||!id(r.request.sectionId))reject('INVALID_REQUEST');if(this.#checkpoints){const cap=await this.#checkpoints.lookup(r.request,sender,authority=>this.#recoveryAuthority(authority),()=>true);await this.current(sender);if(cap){const row=this.#checkpoints.read(cap);this.#recovery.set(row.operationId,cap);return {state:'pending',operationId:row.operationId};}}await this.sweep();if(!this.#promotions&&!this.#promotionSession)return {state:'none'};
   if(this.#prepared.size+this.#preparing>=8)reject('REQUEST_ALREADY_IN_FLIGHT');const selected=this.#lookupPromotion(r.request);if(!selected?.handle)return {state:'none'};const {owner,handle}=selected;if(this.#claimed.has(handle))reject('REQUEST_ALREADY_IN_FLIGHT');this.#claimed.add(handle);this.#preparing++;
   try{const descriptor=readMaintenanceSectionPromotionOffer(owner,this.store,handle),witness=await this.current(sender);this.supported();const current=readMaintenanceSectionPromotionOffer(owner,this.store,handle);if(current.operationId!==descriptor.operationId||current.expiresAt!==descriptor.expiresAt)reject('STALE_BASE');const token=crypto.randomUUID();this.#prepared.set(token,{kind:'ai',owner,handle,sender:structuredClone(sender),operationId:descriptor.operationId,witness,confirmationStarted:false,expiresAt:descriptor.expiresAt});return {state:'prepared',token,operationId:descriptor.operationId,preview:structuredClone(descriptor.preview)};}
   catch(error){this.#claimed.delete(handle);releaseMaintenanceSectionPromotionOffer(owner,this.store,handle);throw error;}finally{this.#preparing--;}
  }
  if(r.command==='proposal_result'||r.command==='proposal_resume'){
   if(!operation(r.operationId)||!this.#promotions&&!this.#promotionSession)reject('UNAVAILABLE');const cap=await this.#recoveryCheckpoint(r.operationId,sender),delivery=await this.#captureDelivery(),result=await this.#promotionResult(r.operationId,cap);await this.current(sender);if(result){this.forget(r.operationId);return this.#deliver(result,sender,cap,delivery);}if(r.command==='proposal_result')return {state:'unknown',operationId:r.operationId};
   return this.once(r.operationId,async()=>{await this.current(sender);this.supported();const delivery=await this.#captureDelivery(),result=await this.#promotionResume(r.operationId,cap);await this.current(sender);this.forget(r.operationId);return this.#deliver(result,sender,cap,delivery);});
  }
  if(r.command==='prepare'){
   await this.sweep();if(this.#prepared.size+this.#preparing>=8)reject('REQUEST_ALREADY_IN_FLIGHT');this.#preparing++;
   try{if(!shape(r.request,['topicId','sectionId','selection','name','operationId'])||r.request.selection!=='whole_section')reject('INVALID_REQUEST');
   const handle=await this.service.prepare(r.request);const witness=await this.current(sender);this.supported();
   const token=crypto.randomUUID();this.#prepared.set(token,{handle,sender:structuredClone(sender),operationId:r.request.operationId,witness,confirmationStarted:false,expiresAt:Date.parse(this.store.clock())+PROMOTION_LIMITS.lifetimeMs});
   return {token,operationId:r.request.operationId,preview:structuredClone(handle)};
   }finally{this.#preparing--;}
  }
  if(['confirm','cancel'].includes(r.command)){
   const p=this.#prepared.get(r.token);if(!p||p.sender.documentId!==sender.documentId||p.sender.tab.id!==sender.tab.id||p.sender.tab.windowId!==sender.tab.windowId||p.sender.url!==sender.url)reject('INVALID_REQUEST');
   if(r.command==='cancel'){if(p.confirmationStarted||this.#running.has(p.operationId))reject('REQUEST_ALREADY_IN_FLIGHT');if(p.kind==='ai')releaseMaintenanceSectionPromotionOffer(p.owner,this.store,p.handle);else this.service.cancel(p.handle);this.#claimed.delete(p.handle);this.#prepared.delete(r.token);return {state:'cancelled'};}
   if(r.confirmed!==true)reject('INVALID_REQUEST');
   if(p.kind==='ai')return this.once(p.operationId,async()=>{await this.current(sender);this.supported();const delivery=await this.#captureDelivery();if(p.confirmationStarted){const cap=p.checkpoint??null;const prior=cap?await this.#promotionResult(p.operationId,cap):await resultMaintenanceSectionPromotion(p.owner,this.store,p.operationId);await this.current(sender);if(prior){this.forget(p.operationId);return this.#deliver(prior,sender,cap,delivery);}const result=cap?await this.#promotionResume(p.operationId,cap):await resumeMaintenanceSectionPromotion(p.owner,this.store,p.operationId);await this.current(sender);this.forget(p.operationId);return this.#deliver(result,sender,cap,delivery);}p.confirmationStarted=true;
    let cap=null;try{if(this.#checkpoints){cap=await this.#checkpoints.accept(p.owner,p.handle,sender,()=>{this.#deliveryFacts(delivery);return this.#prepared.get(r.token)===p;});p.checkpoint=cap;this.#recovery.set(p.operationId,cap);}await this.current(sender);}catch(error){p.confirmationStarted=false;error.phase='promotion_checkpoint_pending';throw error;}
    let result;try{result=await confirmMaintenanceSectionPromotionOffer(p.owner,this.store,p.handle,{confirmationLocator:cap,isCurrent:()=>{this.#deliveryFacts(delivery);return this.#prepared.get(r.token)===p;}});}catch(error){if(error.promotionOperationId!==p.operationId){if(cap)try{await this.#checkpoints.clear(cap,()=>{this.#deliveryFacts(delivery);return this.#prepared.get(r.token)===p;});this.#recovery.delete(p.operationId);}catch{/* An uncertain locator deletion never erases its recovery obligation. */}this.forget(p.operationId);error.phase='promotion_not_confirmed';}throw error;}await this.current(sender);this.forget(p.operationId);return this.#deliver(result,sender,cap,delivery);
   });
   return this.once(p.operationId,async()=>{await this.current(sender);this.supported();if(p.confirmationStarted){const prior=await this.service.result(p.operationId);await this.current(sender);if(prior){this.forget(p.operationId);return publicResult(prior);}return this.finish(MANUAL_PROMOTION_PREFIX+p.operationId,sender);}const authority=await this.store.run(()=>this.store.repository.transaction(false,t=>this.service.authority(t)));p.confirmationStarted=true;
    let work;try{work=await this.service.confirm(p.handle,{confirmed:true});}catch(error){
     // Only a settled original confirm with no original receipt or owned work,
     // under the same real authority/generation, proves confirmation did not write.
     try{await this.current(sender);this.supported();const prior=await this.service.result(p.operationId);await this.current(sender);this.supported();
      const absent=!prior&&await this.store.run(()=>this.store.repository.transaction(false,async t=>JSON.stringify(await this.service.authority(t))===JSON.stringify(authority)&&!await t.get('operationReceipts',p.operationId)&&!await t.get('organizerWorkItems',MANUAL_PROMOTION_PREFIX+p.operationId)));
      if(absent){this.service.cancel(p.handle);this.#prepared.delete(r.token);error.phase='promotion_not_confirmed';}
     }catch{}throw error;
    }return this.finish(work.workId,sender);});
  }
  if(r.command==='restore'){
   if(!shape(r.request,['historyOperationId','side','operationId'])||!operation(r.request.operationId)||!id(r.request.historyOperationId)||!['before','after'].includes(r.request.side))reject('INVALID_REQUEST');
   return this.once(r.request.operationId,async()=>{await this.current(sender);this.supported();const result=await restoreSectionPromotion(this.store,r.request);await this.current(sender);return publicResult(result);});
  }
  if(!operation(r.operationId))reject('INVALID_REQUEST');
  const result=await this.service.result(r.operationId);await this.current(sender);if(r.command==='resume')this.supported();if(result){this.forget(r.operationId);return publicResult(result);}
  if(r.command==='result')return {state:'unknown',operationId:r.operationId};
  // A new worker may only resume the original signed work. It cannot recreate
  // a lost prepare/confirmation or silently mint a replacement operation.
  return this.once(r.operationId,()=>this.finish(MANUAL_PROMOTION_PREFIX+r.operationId,sender));
 }
 #lookupPromotion(request){try{return this.#promotionSession?getMaintenanceSectionPromotion(this.#promotionSession,this.store,request):{owner:this.#promotions,handle:findMaintenanceSectionPromotionOffer(this.#promotions,this.store,request)};}catch(error){if(!['UNAVAILABLE','STALE_BASE'].includes(error?.code))throw error;for(const [token,p]of this.#prepared)if(p.kind==='ai'&&!p.confirmationStarted&&!this.#running.has(p.operationId)){try{releaseMaintenanceSectionPromotionOffer(p.owner,this.store,p.handle);}catch{}this.#claimed.delete(p.handle);this.#prepared.delete(token);}return null;}}
 #promotionResult(operationId,checkpoint=null){if(checkpoint){if(typeof maintenanceSession.maintenanceSectionPromotionCheckpointResult!=='function')reject('UNAVAILABLE');return maintenanceSession.maintenanceSectionPromotionCheckpointResult(this.#promotionSession,this.store,checkpoint);}return this.#promotionSession?maintenanceSectionPromotionResult(this.#promotionSession,this.store,operationId):resultMaintenanceSectionPromotion(this.#promotions,this.store,operationId);}
 #promotionResume(operationId,checkpoint=null){if(checkpoint){if(typeof maintenanceSession.maintenanceSectionPromotionCheckpointResume!=='function')reject('UNAVAILABLE');return maintenanceSession.maintenanceSectionPromotionCheckpointResume(this.#promotionSession,this.store,checkpoint);}return this.#promotionSession?maintenanceSectionPromotionResume(this.#promotionSession,this.store,operationId):resumeMaintenanceSectionPromotion(this.#promotions,this.store,operationId);}
 async #recoveryAuthority(authority){if(!this.#promotionSession||typeof maintenanceSession.assertMaintenanceSectionPromotionRecoveryAuthority!=='function')reject('UNAVAILABLE');return maintenanceSession.assertMaintenanceSectionPromotionRecoveryAuthority(this.#promotionSession,this.store,authority);}
 async #recoveryCheckpoint(operationId,sender){if(!this.#checkpoints)return null;const cap=await this.#checkpoints.operation(operationId,sender,authority=>this.#recoveryAuthority(authority),()=>true);await this.current(sender);this.#recovery.set(operationId,cap);return cap;}
 #pruneRecovery(){if(!this.#checkpoints)return;for(const [token,value]of this.#acks)try{this.#checkpoints.read(value.cap);}catch{this.#acks.delete(token);}for(const [operationId,cap]of this.#recovery)try{this.#checkpoints.read(cap);}catch{this.#recovery.delete(operationId);}}
 #captureDelivery(){if(!this.#checkpoints)return Promise.resolve(null);if(!this.#promotionSession||typeof maintenanceSession.captureMaintenanceSectionPromotionDelivery!=='function')reject('UNAVAILABLE');return maintenanceSession.captureMaintenanceSectionPromotionDelivery(this.#promotionSession,this.store);}
 #deliveryFacts(cap){if(cap===null&&!this.#checkpoints)return true;if(typeof maintenanceSession.assertMaintenanceSectionPromotionDeliveryFacts!=='function')reject('UNAVAILABLE');return maintenanceSession.assertMaintenanceSectionPromotionDeliveryFacts(cap,this.#promotionSession,this.store);}
 #deliver(result,sender,cap,delivery){this.#deliveryFacts(delivery);this.#pruneRecovery();let value;if(result?.state==='unwritten'){cap=result.checkpoint;const held=readSectionPromotionRecoveryLocator(cap,this.store);if(held.phase!=='unwritten'||held.operationId!==result.operationId||held.sourceTopicId!==result.sourceTopicId||held.sourceSectionId!==result.sourceSectionId)reject('STALE_BASE');value={state:'unwritten',operationId:result.operationId,sourceTopicId:result.sourceTopicId,sourceSectionId:result.sourceSectionId};}else value=publicResult(result);if(!cap)return value;const row=this.#checkpoints.read(cap);if(row.operationId!==result.operationId||row.sourceTopicId!==result.sourceTopicId||row.sourceSectionId!==result.sourceSectionId)reject('STALE_BASE');for(const [token,old]of this.#acks)if(old.operationId===row.operationId)this.#acks.delete(token);if(this.#acks.size>=8)reject('REQUEST_ALREADY_IN_FLIGHT');const token=crypto.randomUUID();this.#acks.set(token,{cap,delivery,operationId:row.operationId,sender:structuredClone(sender)});return {...value,checkpointToken:token};}
 async once(operationId,run){if(this.#running.has(operationId))reject('REQUEST_ALREADY_IN_FLIGHT');const promise=Promise.resolve().then(run);this.#running.set(operationId,promise);try{return await promise;}finally{this.#running.delete(operationId);}}
 async finish(workId,sender){
  let progress;do{await this.current(sender);this.supported();progress=await this.service.stage(workId,{limit:100});}while(progress.state!=='ready');
  await this.current(sender);this.supported();const result=await this.service.activate(workId);await this.current(sender);
  this.forget(result.operationId);
  return publicResult(result);
 }
}
