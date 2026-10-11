import {topicRootTarget} from '../core/topic-root-target.js';
const TYPE='PAIA_SECTION_PROMOTION_IDENTITY';
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const uuid=v=>typeof v==='string'&&/^[a-f0-9-]{36}$/.test(v);
// Only a private original WindowClient probe may ask the worker to bind its
// Chrome MessageSender document. This listener carries no body or write intent.
export function installSectionPromotionClient(api,scope=globalThis){
 const listener=e=>{
  if(e.data?.type!==TYPE)return;
  const entry=api.runtime.getURL('ui/archive.html'),url=scope.location?.href;
  if(e.isTrusted!==true||e.source?.scriptURL!==api.runtime.getURL('background/service-worker.js')||scope.self!==scope.top||!(url===entry||typeof url==='string'&&url.startsWith(entry+'#')&&topicRootTarget(url)!==null)||e.ports?.length!==1||!exact(e.data,['type','version','nonce'])||e.data.version!==1||!uuid(e.data.nonce)){for(const p of e.ports??[])p.close();return;}
  const port=e.ports[0],nonce=e.data.nonce;
  void api.runtime.sendMessage({type:'PAIA_LIBRARY_SECTION_PROMOTION',command:'identify',nonce}).then(response=>{
   if(!response?.ok)throw Error('UNAVAILABLE');
   const r=response.data;if(!exact(r,['nonce','documentId','tabId','windowId','incognito'])||r.nonce!==nonce||typeof r.documentId!=='string'||!r.documentId||r.documentId.length>200||!Number.isSafeInteger(r.tabId)||r.tabId<0||!Number.isSafeInteger(r.windowId)||r.windowId<0||r.incognito!==false)throw Error('UNAVAILABLE');
   port.postMessage({type:TYPE,...r});
  }).catch(()=>{try{port.postMessage({type:TYPE,nonce,error:'UNAVAILABLE'});}catch{}}).finally(()=>port.close());
 };
 scope.navigator.serviceWorker.addEventListener('message',listener);
 return ()=>scope.navigator.serviceWorker.removeEventListener('message',listener);
}
