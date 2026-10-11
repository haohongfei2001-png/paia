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
 #prepared=new Map();#preparing=0;#running=new Map();#challenges=new Map();
 constructor(store,api,{clients=globalThis.clients}={}){this.store=store;this.api=api;this.clients=clients;this.service=new ManualSectionPromotionService(store);}
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
   if(expired&&!this.#running.has(p.operationId)){if(!p.confirmationStarted)this.service.cancel(p.handle);this.#prepared.delete(token);}
  }
 }
 forget(operationId){for(const [token,p]of this.#prepared)if(p.operationId===operationId)this.#prepared.delete(token);}
 supported(){if(this.store.humanLibraryJournal)reject('BNS_GROUP_OWNER_UNSUPPORTED');}
 async handle(r,sender){
  if(!r||r.type!==TYPE||typeof r.command!=='string')reject('INVALID_REQUEST');
  if(r.command==='identify')return this.identify(r,sender);
  const keys={prepare:['type','command','request'],confirm:['type','command','token','confirmed'],cancel:['type','command','token'],resume:['type','command','operationId'],result:['type','command','operationId'],restore:['type','command','request']}[r.command];
  if(!keys||!shape(r,keys))reject('INVALID_REQUEST');await this.current(sender);if(!['cancel','result'].includes(r.command))this.supported();
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
   if(r.command==='cancel'){if(p.confirmationStarted||this.#running.has(p.operationId))reject('REQUEST_ALREADY_IN_FLIGHT');this.service.cancel(p.handle);this.#prepared.delete(r.token);return {state:'cancelled'};}
   if(r.confirmed!==true)reject('INVALID_REQUEST');
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
 async once(operationId,run){if(this.#running.has(operationId))reject('REQUEST_ALREADY_IN_FLIGHT');const promise=Promise.resolve().then(run);this.#running.set(operationId,promise);try{return await promise;}finally{this.#running.delete(operationId);}}
 async finish(workId,sender){
  let progress;do{await this.current(sender);this.supported();progress=await this.service.stage(workId,{limit:100});}while(progress.state!=='ready');
  await this.current(sender);this.supported();const result=await this.service.activate(workId);await this.current(sender);
  this.forget(result.operationId);
  return publicResult(result);
 }
}
