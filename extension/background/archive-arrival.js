import {ArchiveError} from '../core/constants.js';
import {topicRootTarget} from '../core/topic-root-target.js';

const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const refuse=()=>{throw new ArchiveError('FORBIDDEN');};
const unavailable=()=>{throw new ArchiveError('UNAVAILABLE');};
const clone=v=>structuredClone(v);
// Private, bounded, worker-lifetime navigation intents. Neither query nor body
// enters a URL, storage, a host message, or a recoverable background journal.
export class ArchiveArrival {
 constructor(service,api,{ttl=60000}={}){
  this.service=service;this.api=api;this.ttl=ttl;this.pending=new Map();this.queue=Promise.resolve();
 }
 archiveURL(url){const entry=this.api.runtime.getURL('ui/archive.html');return url===entry||typeof url==='string'&&url.startsWith(entry+'#')&&topicRootTarget(url)!==null;}
 async sourceCurrent(source){
  const tab=await this.api.tabs.get(source.tabId);
  if(tab.incognito||tab.windowId!==source.windowId||tab.url!==source.url||tab.discarded)refuse();
  if(typeof this.api.runtime.getContexts!=='function')unavailable();
  const contexts=await this.api.runtime.getContexts({documentIds:[source.documentId]});
  if(!contexts.some(c=>c.documentId===source.documentId&&c.tabId===source.tabId&&c.windowId===source.windowId&&c.frameId===source.frameId&&c.documentUrl===this.api.runtime.getURL('ui/prompt-surface.html')+'#'+source.nonce&&c.incognito!==true))refuse();
  const probe=await this.api.tabs.sendMessage(tab.id,{type:'PAIA_PROMPT_SURFACE_PROBE'},{frameId:0});
  if(!probe?.open||probe.nonce!==source.nonce||probe.url!==source.url)refuse();
  if(!(await this.service.s.status()).consented)throw new ArchiveError('CONSENT_REQUIRED');
 }
 finish(entry,status){
  if(this.pending.get(entry.targetId)!==entry)return;
  this.pending.delete(entry.targetId);clearTimeout(entry.timer);entry.resolve({status});
 }
 removeTab(id){for(const entry of this.pending.values())if(entry.targetId===id||entry.source.tabId===id)this.finish(entry,'cancelled');}
 async targetCurrent(entry){
  if(!entry.documentId)return;
  const contexts=await this.api.runtime.getContexts({documentIds:[entry.documentId]});
  if(!contexts.some(c=>c.documentId===entry.documentId&&c.tabId===entry.targetId&&c.windowId===entry.windowId&&c.frameId===0&&this.archiveURL(c.documentUrl)&&c.incognito!==true))refuse();
 }
 changedTab(id,change){
  for(const entry of this.pending.values()){
   if(entry.source.tabId===id&&change.url&&change.url!==entry.source.url)this.finish(entry,'cancelled');
   else if(entry.targetId===id&&change.url&&!this.archiveURL(change.url))this.finish(entry,'cancelled');
   // Chrome also emits loading/complete for same-document route commits.
   // The actual document identity, never status alone, revokes this intent.
   else if(change.status==='loading'&&(entry.source.tabId===id||entry.targetId===id)){
    const check=entry.source.tabId===id?this.sourceCurrent(entry.source):this.targetCurrent(entry);
    void check.catch(()=>this.finish(entry,'cancelled'));
   }
  }
 }

 async open(descriptor,source){
  if(!exact(source,['tabId','windowId','frameId','nonce','documentId','url'])||!Number.isInteger(source.tabId)||!Number.isInteger(source.windowId)||!Number.isInteger(source.frameId)||source.frameId<=0||typeof source.documentId!=='string'||!source.documentId||typeof source.nonce!=='string')refuse();
  const issue=async()=>{
   await this.sourceCurrent(source);
   const qualified=await this.service.qualifyArchiveArrival(descriptor);
   await this.sourceCurrent(source);
   // Extension-only context discovery needs no tabs/host permission expansion.
   // If the browser cannot identify its own app documents, do not guess a tab.
   if(typeof this.api.runtime.getContexts!=='function')unavailable();
   const contexts=await this.api.runtime.getContexts({contextTypes:['TAB']});
   const ids=[...new Set(contexts.filter(c=>c.windowId===source.windowId&&c.incognito!==true&&this.archiveURL(c.documentUrl)&&Number.isInteger(c.tabId)).map(c=>c.tabId))].sort((a,b)=>a-b);
   if(ids.length>1)unavailable(); // Do not select an arbitrary potentially dirty editor.
   if(this.pending.size>=8&&!ids.some(id=>this.pending.has(id)))unavailable();
   let target=ids.length?await this.api.tabs.get(ids[0]):await this.api.tabs.create({windowId:source.windowId,url:this.api.runtime.getURL('ui/archive.html'),active:false});
   if(target.incognito||target.windowId!==source.windowId||ids.length&&!this.archiveURL(target.url))refuse();
   await this.sourceCurrent(source);
   const old=this.pending.get(target.id);if(old)this.finish(old,'cancelled');
   const bodyFree={version:1,query:qualified.query,scope:clone(qualified.scope),searchSnapshot:clone(qualified.searchSnapshot),ref:clone(qualified.ref)};
   let resolve;const done=new Promise(r=>{resolve=r;});
   const entry={requestId:crypto.randomUUID(),source:clone(source),targetId:target.id,windowId:source.windowId,descriptor:bodyFree,documentId:null,qualified:false,resolve,done};
   entry.timer=setTimeout(()=>this.finish(entry,'unknown'),this.ttl);entry.timer.unref?.();this.pending.set(target.id,entry);
   try{
    await this.api.tabs.update(target.id,{active:true});
    if(this.pending.get(target.id)!==entry)return {done};
    // A cold receiver may have sent READY before tabs.create returned. This
    // identity-only wakeup closes that race; claim remains strictly single-use.
    void this.api.runtime.sendMessage({type:'PAIA_ARCHIVE_ARRIVAL_AVAILABLE',requestId:entry.requestId}).catch(()=>{});
   }catch{this.finish(entry,'unavailable');}
   return {done};
  };
  const issued=this.queue.then(issue);this.queue=issued.catch(()=>{});
  const {done}=await issued;return done;
 }
 async receiver(sender){
  if(sender.id!==this.api.runtime.id||!sender.tab||sender.tab.incognito||sender.frameId!==0||sender.documentLifecycle&&sender.documentLifecycle!=='active'||typeof sender.documentId!=='string'||!sender.documentId||!this.archiveURL(sender.url))refuse();
  const tab=await this.api.tabs.get(sender.tab.id);
  if(tab.incognito||tab.windowId!==sender.tab.windowId||!this.archiveURL(tab.url))refuse();
  return tab;
 }
 async handle(request,sender){
  const tab=await this.receiver(sender),entry=this.pending.get(tab.id);
  if(request.type==='PAIA_ARCHIVE_ARRIVAL_READY'){
   if(!exact(request,['type']))refuse();
   if(!entry||entry.documentId)return null;
   // Reserve before asynchronous checks: two READY messages cannot both claim.
   entry.documentId=sender.documentId;
   try{await this.sourceCurrent(entry.source);if(this.pending.get(tab.id)!==entry)return null;return {requestId:entry.requestId,...clone(entry.descriptor)};}
   catch(error){this.finish(entry,'unavailable');throw error;}
  }
  if(!entry||entry.requestId!==request.requestId||entry.documentId!==sender.documentId||entry.windowId!==tab.windowId)refuse();
  if(request.type==='PAIA_ARCHIVE_ARRIVAL_QUALIFY'){
   if(!exact(request,['type','requestId'])||entry.qualified)refuse();
   await this.sourceCurrent(entry.source);await this.service.qualifyArchiveArrival(entry.descriptor);await this.sourceCurrent(entry.source);await this.targetCurrent(entry);
   if(this.pending.get(tab.id)!==entry)refuse();entry.qualified=true;return {qualified:true};
  }
  if(request.type==='PAIA_ARCHIVE_ARRIVAL_RESULT'){
   if(!exact(request,['type','requestId','status'])||!['opened','cancelled','unavailable'].includes(request.status)||request.status==='opened'&&!entry.qualified)refuse();
   if(request.status==='opened'){
    try{await this.sourceCurrent(entry.source);await this.service.qualifyArchiveArrival(entry.descriptor);await this.sourceCurrent(entry.source);await this.targetCurrent(entry);if(this.pending.get(tab.id)!==entry)refuse();}
    catch(error){this.finish(entry,'unavailable');throw error;}
   }
   this.finish(entry,request.status);return {};
  }
  refuse();
 }
}
