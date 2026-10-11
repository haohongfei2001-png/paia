import {ArchiveError} from '../core/constants.js';
import {topicRootTarget} from '../core/topic-root-target.js';

const id=value=>Number.isInteger(value)&&value>=0;
const identityType='PAIA_TOOLBAR_IDENTITY';
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));
const nonce=value=>typeof value==='string'&&/^[a-f0-9-]{36}$/.test(value);
const ownArchive=(api,value)=>{const entry=api.runtime.getURL('ui/archive.html');return value===entry||typeof value==='string'&&value.startsWith(entry+'#')&&topicRootTarget(value)!==null;};
const ownClient=(api,c)=>c&&typeof c.id==='string'&&c.id.length>0&&c.type==='window'&&c.frameType==='top-level'&&ownArchive(api,c.url);

// Page-side response carries only Chrome's tab identity. It never reads or
// changes the app route, body, storage, consent, editor or publication state.
export function installToolbarClient(api,scope=globalThis){
 const listener=event=>{
  if(event.data?.type!==identityType)return;
  if(event.isTrusted!==true||event.source?.scriptURL!==api.runtime.getURL('background/service-worker.js')||scope.top!==scope.self||!ownArchive(api,scope.location?.href)||event.ports?.length!==1||!exact(event.data,['type','version','nonce'])||event.data.type!==identityType||event.data.version!==1||!nonce(event.data.nonce)){for(const port of event.ports??[])port.close();return;}
  const port=event.ports[0],token=event.data.nonce;
  void api.tabs.getCurrent().then(tab=>{
   if(!tab||!id(tab.id)||!id(tab.windowId)||typeof tab.incognito!=='boolean'||!ownArchive(api,scope.location?.href))throw new ArchiveError('UNAVAILABLE');
   port.postMessage({type:identityType,nonce:token,tabId:tab.id,windowId:tab.windowId,incognito:tab.incognito});
  }).catch(()=>{try{port.postMessage({type:identityType,nonce:token,error:'UNAVAILABLE'});}catch{}}).finally(()=>port.close());
 };
 scope.navigator.serviceWorker.addEventListener('message',listener);
 return ()=>scope.navigator.serviceWorker.removeEventListener('message',listener);
}
// The action event supplies a trusted window, not a query/body/navigation intent.
// Enumerate only this extension's contexts; no browsing-history permission or
// host-page lookup is needed to find the already open application.
export class ToolbarEntry {
 #api;
 #opening=new Map();
 #created=new Map();
 #clients;
 constructor(api,{clients=globalThis.clients}={}){this.#api=api;this.#clients=clients;}
 removeTab(tabId){for(const [windowId,id] of this.#created)if(id===tabId)this.#created.delete(windowId);}
 async #clientIdentity(client){
  const api=this.#api,channel=new MessageChannel(),token=crypto.randomUUID();
  try{return await new Promise((resolve,reject)=>{
   // The ordinary extension message boundary is finite. Timeout is unknown,
   // never an absence proof and never permission to create another app.
   const timeout=setTimeout(()=>reject(new ArchiveError('UNAVAILABLE')),30000);
   const finish=(fn,value)=>{clearTimeout(timeout);fn(value);};
   channel.port1.onmessage=event=>{
    const r=event.data;
    if(!exact(r,['type','nonce','tabId','windowId','incognito'])||r.type!==identityType||r.nonce!==token||!id(r.tabId)||!id(r.windowId)||typeof r.incognito!=='boolean')return finish(reject,new ArchiveError('UNAVAILABLE'));
    finish(resolve,{contextType:'TAB',tabId:r.tabId,windowId:r.windowId,frameId:0,documentUrl:client.url,incognito:r.incognito,clientId:client.id});
   };
   channel.port1.onmessageerror=()=>finish(reject,new ArchiveError('UNAVAILABLE'));
   try{client.postMessage({type:identityType,version:1,nonce:token},[channel.port2]);}catch{finish(reject,new ArchiveError('UNAVAILABLE'));}
  });}finally{channel.port1.onmessage=null;channel.port1.onmessageerror=null;channel.port1.close();channel.port2.close();}
 }
 async #contexts(windowId){
  const api=this.#api;
  if(typeof api.runtime.getContexts==='function')return api.runtime.getContexts({contextTypes:['TAB'],windowIds:[windowId]});
  if(typeof this.#clients?.matchAll!=='function'||typeof this.#clients?.get!=='function')throw new ArchiveError('UNAVAILABLE');
  const clients=await this.#clients.matchAll({type:'window',includeUncontrolled:true});
  if(!Array.isArray(clients)||clients.some(c=>!c||typeof c.url!=='string'))throw new ArchiveError('UNAVAILABLE');
  const result=[];
  for(const c of clients){
   if(!ownArchive(api,c.url))continue;
   if(!ownClient(api,c))throw new ArchiveError('UNAVAILABLE');
   const r=await this.#clientIdentity(c),current=await this.#clients.get(c.id);
   if(!ownClient(api,current)||current.url!==c.url)throw new ArchiveError('FORBIDDEN');
   result.push(r);
  }
  return result;
 }
 async #sameClient(target){
  if(!target.clientId)return;
  const c=await this.#clients.get(target.clientId);
  if(!ownClient(this.#api,c)||c.url!==target.documentUrl)throw new ArchiveError('FORBIDDEN');
 }
 archiveURL(value){
  return ownArchive(this.#api,value);
 }
 open(tab){
  if(!tab||!id(tab.windowId)||tab.incognito===true)return Promise.reject(new ArchiveError('FORBIDDEN'));
  const windowId=tab.windowId,existing=this.#opening.get(windowId);
  if(existing)return existing;
  const opening=this.#open(windowId).finally(()=>{if(this.#opening.get(windowId)===opening)this.#opening.delete(windowId);});
  this.#opening.set(windowId,opening);return opening;
 }
 async #open(windowId){
  const api=this.#api;
  const contexts=await this.#contexts(windowId);
  if(!Array.isArray(contexts)||contexts.some(c=>!c||c.contextType!=='TAB'||typeof c.documentUrl!=='string'||!id(c.windowId)||!Number.isInteger(c.frameId)))throw new ArchiveError('UNAVAILABLE');
  if(contexts.some(c=>c.windowId===windowId&&c.frameId===0&&this.archiveURL(c.documentUrl)&&(!id(c.tabId)||typeof c.incognito!=='boolean')))throw new ArchiveError('UNAVAILABLE');
  // Active documents omit discarded tabs. Query the trusted current window
  // without a URL filter (that filter requires browsing permissions), and keep
  // only Chrome's exact own-app URLs. Never retain unrelated tab URLs.
  const tabs=await api.tabs.query({windowId});
  if(!Array.isArray(tabs)||tabs.some(t=>!t||!id(t.id)||t.windowId!==windowId||typeof t.incognito!=='boolean'||t.url!==undefined&&typeof t.url!=='string'))throw new ArchiveError('UNAVAILABLE');
  const ids=[...new Set([...contexts.filter(c=>c.contextType==='TAB'&&c.windowId===windowId&&c.frameId===0&&c.incognito!==true&&id(c.tabId)&&this.archiveURL(c.documentUrl)).map(c=>c.tabId),...tabs.filter(t=>t.incognito===false&&this.archiveURL(t.url)).map(t=>t.id)])].sort((a,b)=>a-b);
  const created=this.#created.get(windowId);
  if(created!==undefined){if(ids.includes(created))this.#created.delete(windowId);else ids.push(created);}
  const targets=[];
  for(const tabId of ids){
   // A closed/moved/navigating application is not permission to redirect it.
   let tab;try{tab=await api.tabs.get(tabId);}catch{throw new ArchiveError('UNAVAILABLE');}
   const context=contexts.find(c=>c.tabId===tabId&&c.windowId===windowId&&c.frameId===0),clientIdentity=context?.clientId;
   if(!tab||tab.id!==tabId||!id(tab.windowId)||typeof tab.incognito!=='boolean'||!clientIdentity&&typeof tab.url!=='string')throw new ArchiveError('UNAVAILABLE');
   if(tabId===created&&tab.pendingUrl===api.runtime.getURL('ui/archive.html')&&(tab.url===undefined||tab.url==='about:blank'))throw new ArchiveError('UNAVAILABLE');
   if(clientIdentity&&(tab.windowId!==context.windowId||tab.incognito!==context.incognito||tab.url!==undefined&&tab.url!==context.documentUrl))throw new ArchiveError('FORBIDDEN');
   if(tab.windowId!==windowId||tab.incognito!==false||tab.url!==undefined&&!this.archiveURL(tab.url)||tab.pendingUrl&&!this.archiveURL(tab.pendingUrl)){
    if(tabId===created){this.#created.delete(windowId);throw new ArchiveError('FORBIDDEN');}
    continue;
   }
   if(clientIdentity)await this.#sameClient(context);
   targets.push({...tab,...(clientIdentity?{clientId:clientIdentity,documentUrl:context.documentUrl}:{})});
  }
  targets.sort((a,b)=>Number(b.active===true)-Number(a.active===true)||(a.index??0)-(b.index??0)||a.id-b.id);
  if(targets.length){
   const target=targets[0];
   // Recheck the exact existing URL after the other asynchronous tab reads.
   await this.#sameClient(target);
   const current=await api.tabs.get(target.id);
   if(!current||current.id!==target.id||current.windowId!==windowId||current.incognito!==false||current.url!==target.url||current.pendingUrl&&current.pendingUrl!==current.url)throw new ArchiveError('FORBIDDEN');
   await this.#sameClient(target);
   const updated=await api.tabs.update(target.id,{active:true});
   if(!updated||updated.id!==target.id||updated.windowId!==windowId||updated.incognito!==false||updated.url!==target.url||updated.active!==true||updated.pendingUrl&&updated.pendingUrl!==updated.url)throw new ArchiveError('FORBIDDEN');
   await this.#sameClient(target);
   return {status:'focused',tabId:target.id};
  }
  const opened=await api.tabs.create({windowId,url:api.runtime.getURL('ui/archive.html'),active:true});
  if(!id(opened?.id)||opened.windowId!==windowId||opened.incognito!==false)throw new ArchiveError('UNAVAILABLE');
  this.#created.set(windowId,opened.id);
  return {status:'opened',tabId:opened.id};
 }
}

// No runtime-message command is exposed. With the legacy default_popup present,
// Chrome keeps the existing popup and does not deliver this action event.
export function installToolbarEntry(api,options){
 const owner=new ToolbarEntry(api,options);
 api.tabs.onRemoved?.addListener(id=>owner.removeTab(id));
 const listener=tab=>{void owner.open(tab).then(()=>api.action.setTitle({title:'Personal AI Input Archive'}),()=>api.action.setTitle({title:'PAIA could not open. Click again to retry.'})).catch(()=>{});};
 api.action.onClicked.addListener(listener);
 return owner;
}
