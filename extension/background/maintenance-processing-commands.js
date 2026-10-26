import {createTopicIdentityProcessingGrant,disposeTopicIdentityProcessingGrant} from '../core/ai-usage/topic-identity-processing-grant.js';
import {createTopicIdentitySourceProcessing,disposeTopicIdentitySourceProcessing,settleTopicIdentitySourceWork,holdTopicIdentitySourceWork,releaseTopicIdentitySourceWork} from '../core/ai-usage/topic-identity-source-processing.js';
import {requireMaintenanceProcessingContext} from '../core/ai-usage/maintenance-processing-source-denial.js';
import {createMaintenanceSourceProcessing,disposeMaintenanceSourceProcessing} from '../core/ai-usage/maintenance-source-processing.js';
import {ArchiveError} from '../core/constants.js';
import {topicRootTarget} from '../core/topic-root-target.js';
import {MaintenanceProcessingConsent,maintenanceProcessingConsentStatus,configureMaintenanceProcessingConsent,cancelMaintenanceProcessingConsentChange,assertMaintenanceProcessingConsentStatusFacts,beginMaintenanceProcessingDisable,cancelMaintenanceProcessingDisable} from './maintenance-processing-consent.js';
const commandOwners=new WeakMap(),identityConfigurations=new WeakMap();
const READ='PAIA_MAINTENANCE_PROCESSING_STATUS',WRITE='PAIA_MAINTENANCE_PROCESSING_CONFIGURE';
const fail=code=>{throw new ArchiveError(code);};
const data=(v,k)=>{const d=v&&Object.getOwnPropertyDescriptor(v,k);if(!d||!Object.hasOwn(d,'value'))fail('INVALID_REQUEST');return d.value;};
function fields(v,keys){if(!v||Object.getPrototypeOf(v)!==Object.prototype||Reflect.ownKeys(v).length!==keys.length||Reflect.ownKeys(v).some(k=>!keys.includes(k)))fail('INVALID_REQUEST');const d=Object.getOwnPropertyDescriptors(v);if(keys.some(k=>!Object.hasOwn(d[k],'value')))fail('INVALID_REQUEST');}
// Sole worker route for a real top-level Archive document. A prior successful
// response registers only a bounded deny-before-await path for that document;
// it never skips current document authentication or supplies write authority.
export class MaintenanceProcessingCommands {
 #owner;#store;#api;#pending=new Set();#documents=new Map();
 constructor(store,api){this.#store=store;this.#api=api;this.#owner=new MaintenanceProcessingConsent(store);commandOwners.set(this,{store,owner:this.#owner,configuration:null,result:null,processing:null});const cancel=id=>{for(const [key,d] of this.#documents)if(d.tabId===id)this.#documents.delete(key);for(const p of this.#pending)if(p.sender.tab.id===id){p.cancelled=true;if(p.writing)cancelMaintenanceProcessingConsentChange(this.#owner,this.#store);}};api.tabs?.onRemoved?.addListener(cancel);api.tabs?.onUpdated?.addListener((id,change)=>{if(change.url||change.status==='loading')cancel(id);});}
 #source(sender){const base=this.#api.runtime.getURL('ui/archive.html');if(sender?.id!==this.#api.runtime.id||sender.frameId!==0||sender.documentLifecycle&&sender.documentLifecycle!=='active'||typeof sender.documentId!=='string'||!sender.documentId||sender.documentId.length>200||!Number.isSafeInteger(sender.tab?.id)||sender.tab.id<0||!Number.isSafeInteger(sender.tab?.windowId)||sender.tab.windowId<0||sender.tab.incognito!==false||!(sender.url===base||typeof sender.url==='string'&&sender.url.startsWith(base+'#')&&topicRootTarget(sender.url)!==null))fail('FORBIDDEN');}
 #registered(sender,generation){const d=this.#documents.get(sender.documentId);return d&&d.generation===generation&&d.tabId===sender.tab.id&&d.windowId===sender.tab.windowId&&d.url===sender.url;}
 #remember(sender,result){this.#documents.delete(sender.documentId);if(this.#documents.size>=8)this.#documents.delete(this.#documents.keys().next().value);this.#documents.set(sender.documentId,Object.freeze({generation:result.generation,tabId:sender.tab.id,windowId:sender.tab.windowId,url:sender.url}));}
 async #document(sender){
  this.#source(sender);const tab=await this.#api.tabs.get(sender.tab.id);this.#source(sender);if(tab?.id!==sender.tab.id||tab.windowId!==sender.tab.windowId||tab.incognito!==false||tab.url!==sender.url||tab.pendingUrl)fail('FORBIDDEN');
  if(typeof this.#api.runtime.getContexts!=='function')fail('UNAVAILABLE');const contexts=await this.#api.runtime.getContexts({contextTypes:['TAB'],tabIds:[sender.tab.id]});this.#source(sender);
  if(!Array.isArray(contexts)||contexts.length>64)fail('FORBIDDEN');let match=false;for(let i=0;i<contexts.length;i++){const c=data(contexts,String(i));if(!c||![Object.prototype,null].includes(Object.getPrototypeOf(c)))fail('FORBIDDEN');const values=Object.fromEntries(['contextType','tabId','windowId','frameId','documentId','documentUrl','incognito'].map(k=>[k,data(c,k)]));if(values.contextType==='TAB'&&values.tabId===sender.tab.id&&values.windowId===sender.tab.windowId&&values.frameId===0&&values.documentId===sender.documentId&&values.documentUrl===sender.url&&values.incognito===false)match=true;}if(!match)fail('FORBIDDEN');
 }
 async handle(request,sender){
  const type=data(request,'type');if(type===READ)fields(request,['type']);else if(type===WRITE){fields(request,['type','enabled','expectedGeneration','consentVersion','confirmed']);if(typeof request.enabled!=='boolean'||typeof request.expectedGeneration!=='string'||request.consentVersion!==1||request.confirmed!==true)fail('INVALID_REQUEST');}else fail('INVALID_REQUEST');
  this.#source(sender);
  let disableIntent=null;
  if(type===WRITE&&!request.enabled&&this.#registered(sender,request.expectedGeneration))disableIntent=beginMaintenanceProcessingDisable(this.#owner,this.#store,request.expectedGeneration);
  if(this.#pending.size>=8){if(disableIntent)cancelMaintenanceProcessingDisable(disableIntent,this.#owner,this.#store);fail('RESOURCE_LIMIT');}
  const source=commandOwners.get(this),identityStops=[];let identityStopped=false;
  const stopIdentityWork=()=>{if(identityStopped)return;identityStopped=true;source.identityStopDepth=(source.identityStopDepth||0)+1;for(const processing of [...(source.retiredIdentityProcessing||[]),source.identityProcessing].filter(Boolean))identityStops.push([processing,holdTopicIdentitySourceWork(processing,this.#store)]);};
  const pending={sender,cancelled:false,writing:disableIntent!==null};this.#pending.add(pending);const current=()=>{if(pending.cancelled)fail('FORBIDDEN');};
  try{
   if(disableIntent)stopIdentityWork();
   await this.#document(sender);current();if(type===WRITE&&!request.enabled&&!disableIntent){disableIntent=beginMaintenanceProcessingDisable(this.#owner,this.#store,request.expectedGeneration);pending.writing=true;stopIdentityWork();}if(disableIntent){for(const [processing]of identityStops)await settleTopicIdentitySourceWork(processing,this.#store);source.retiredIdentityProcessing?.clear();current();}if(!(await this.#store.status()).consented)fail('CONSENT_REQUIRED');current();await this.#document(sender);current();pending.writing=type===WRITE;
   const result=type===READ?await maintenanceProcessingConsentStatus(this.#owner,this.#store):await configureMaintenanceProcessingConsent(this.#owner,this.#store,{enabled:request.enabled,expectedGeneration:request.expectedGeneration,consentVersion:request.consentVersion,confirmed:request.confirmed},{disableIntent});
   current();await this.#document(sender);current();assertMaintenanceProcessingConsentStatusFacts(result,this.#owner,this.#store);
   if(type===WRITE)try{const notify=this.#api.runtime.sendMessage?.({type:'PAIA_MAINTENANCE_PROCESSING_CHANGED'});notify?.catch?.(()=>{});}catch{}
   current();assertMaintenanceProcessingConsentStatusFacts(result,this.#owner,this.#store);this.#remember(sender,result);return result;
  }finally{for(const [processing,token]of identityStops)releaseTopicIdentitySourceWork(processing,this.#store,token);if(identityStopped)source.identityStopDepth--;if(disableIntent)cancelMaintenanceProcessingDisable(disableIntent,this.#owner,this.#store);this.#pending.delete(pending);}
 }
}

// Sole static worker installation route. A DTO cannot supply a purpose owner;
// the actual Settings Commands instance and its same Store own that capture.
export function configureMaintenanceProcessingSource(commands,store,configuration){
 if(configuration===null)return null;
 const r=commandOwners.get(commands);if(!r||r.store!==store||r.identityStopDepth>0)fail('UNAVAILABLE');
 if(!configuration||![Object.prototype,null].includes(Object.getPrototypeOf(configuration)))fail('INVALID_REQUEST');
 const descriptors=Object.getOwnPropertyDescriptors(configuration);if(Reflect.ownKeys(descriptors).some(k=>typeof k!=='string'||!Object.hasOwn(descriptors[k],'value')))fail('INVALID_REQUEST');
 // Existing independently supplied issuers keep their original object identity.
 if(descriptors.processing?.value!==null)return configuration;
 if(r.configuration===configuration)return r.result;
 if((r.retiredIdentityProcessing?.size||0)>=8)fail('RESOURCE_LIMIT');
 const service=descriptors.service?.value,context=data(service,'context'),caller=data(context,'caller');
 if(!caller||!Object.isFrozen(caller))fail('UNAVAILABLE');
 requireMaintenanceProcessingContext(context);
 const processing=createMaintenanceSourceProcessing({store,consentOwner:r.owner,caller,context});
 const grantOwner=createTopicIdentityProcessingGrant({store,consentOwner:r.owner,caller,context,processing}),topicIdentityProcessing=createTopicIdentitySourceProcessing({store,caller,grantOwner});
 const result=Object.freeze({...Object.fromEntries(Reflect.ownKeys(descriptors).map(key=>[key,descriptors[key].value])),processing});
 identityConfigurations.set(result,{store,processing,topicIdentityProcessing});
 if(r.identityProcessing){const previous=r.identityProcessing;(r.retiredIdentityProcessing??=new Set()).add(previous);disposeTopicIdentitySourceProcessing(previous,store);settleTopicIdentitySourceWork(previous,store).then(()=>r.retiredIdentityProcessing.delete(previous),()=>{});}
 if(r.identityGrant)disposeTopicIdentityProcessingGrant(r.identityGrant,store);
 r.identityProcessing=topicIdentityProcessing;r.identityGrant=grantOwner;
 if(r.processing)disposeMaintenanceSourceProcessing(r.processing,store);
 r.configuration=configuration;r.result=result;r.processing=processing;return result;
}

// Exact static assembly only. Configuration copies cannot install identity
// authority; absence keeps the old independently supplied route unchanged.
export function configuredMaintenanceTopicIdentityProcessing(configuration,store){const held=identityConfigurations.get(configuration);if(!held)return null;if(held.store!==store||configuration.processing!==held.processing)fail('UNAVAILABLE');return held.topicIdentityProcessing;}
