import {ArchiveError} from '../core/constants.js';
import {own} from '../core/prompt-reuse-preferences.js';
import {topicRootTarget} from '../core/topic-root-target.js';
const KEY='promptSurfaceV1',site=url=>{try{return new URL(url).origin==='https://chatgpt.com';}catch{return false;}};
// The sole optional v1 field fences device-local position resets. Absence is
// legacy generation zero; unknown fields/versions are never coerced or replaced.
const generation=v=>v.positionGeneration??0;
export const validSurface=v=>own(v,['version','open','position','positionGeneration'])&&v.version===1&&typeof v.open==='boolean'&&(v.positionGeneration===undefined||Number.isSafeInteger(v.positionGeneration)&&v.positionGeneration>=0)&&(v.position===null||own(v.position,['x','y'])&&['x','y'].every(k=>Number.isFinite(v.position[k])&&v.position[k]>=0&&v.position[k]<=1));
export class PromptSurfaceCommands{
 constructor(commands,api){this.commands=commands;this.api=api;this.frames=new Map();this.geometryQueue=Promise.resolve();}
 async isIdle(tabId){
  const host=await this.api.tabs.sendMessage(tabId,{type:'PAIA_PROMPT_SURFACE_PROBE'},{frameId:0});
  if(!host?.open)return host?.dragging!==true;
  const frame=this.frames.get(tabId);if(!frame||frame.nonce!==host.nonce||host.dragging)return false;
  try{const r=await this.api.tabs.sendMessage(tabId,{type:'PAIA_PROMPT_NEXT_ACTIVITY',nonce:frame.nonce},{frameId:frame.id});return r?.idle===true;}catch{return false;}
 }
 geometry(operation){const result=this.geometryQueue.then(operation);this.geometryQueue=result.catch(()=>{});return result;}
 async consent(){if(!(await this.commands.service.s.status()).consented)throw new ArchiveError('CONSENT_REQUIRED');}
 async readGeometry(){
  const saved=(await this.api.storage.local.get(KEY))[KEY];
  if(saved===undefined)return {version:1,open:false,position:null};
  if(!validSurface(saved))throw new ArchiveError('INVALID_REQUEST');
  return saved;
 }
 async hostGeometry(state){
  if(state!==undefined&&!validSurface(state))throw new ArchiveError('INVALID_REQUEST');
  return this.geometry(async()=>{
   await this.consent();const saved=await this.readGeometry();await this.consent();
   if(state===undefined)return saved;
   // No stale open/position write, including old content scripts after restart.
   if(generation(state)!==generation(saved))throw new ArchiveError('STALE_BASE');
   await this.api.storage.local.set({[KEY]:state});return state;
  });
 }
 async settings(r,sender){
  const api=this.api,archive=api.runtime.getURL('ui/archive.html');
  const trustedURL=sender.url===archive||typeof sender.url==='string'&&sender.url.startsWith(archive+'#')&&topicRootTarget(sender.url)!==null;
  if(sender.id!==api.runtime.id||!trustedURL||sender.tab?.incognito||(sender.frameId!==undefined&&sender.frameId!==0)||sender.documentLifecycle&&sender.documentLifecycle!=='active'||!own(r,['type']))throw new ArchiveError('FORBIDDEN');
  if(r.type==='PAIA_PROMPT_SURFACE_SETTINGS_STATUS')return this.geometry(async()=>{
   // Stored geometry availability only: no live-page, connected or AI claim.
   try{await this.consent();const saved=await this.readGeometry();await this.consent();return {status:'ready',position:saved.position===null?'default':'custom'};}
   catch(error){if(error.code==='CONSENT_REQUIRED')return {status:'consent_required'};if(error.code==='INVALID_REQUEST')return {status:'unavailable'};throw error;}
  });
  const result=await this.geometry(async()=>{
   await this.consent();const saved=await this.readGeometry();await this.consent();
   if(generation(saved)===Number.MAX_SAFE_INTEGER)throw new ArchiveError('INVALID_REQUEST');
   const next={...saved,position:null,positionGeneration:generation(saved)+1};
   // Even an already-default reset invalidates a drag not yet persisted.
   await api.storage.local.set({[KEY]:next});return {changed:saved.position!==null,positionGeneration:next.positionGeneration};
  });
  await this.notifyPositionReset(result.positionGeneration);
  return {status:'reset',changed:result.changed};
 }
 async notifyPositionReset(positionGeneration){
  // Enqueue best-effort geometry-only notifications; persistence is the receipt.
  // A discarded/unreachable host reads the durable generation on next activation.
  try{const tabs=await this.api.tabs.query({url:'https://chatgpt.com/*'});
   for(const tab of tabs.filter(t=>!t.incognito&&!t.discarded&&site(t.url)))void Promise.resolve().then(()=>this.api.tabs.sendMessage(tab.id,{type:'PAIA_PROMPT_SURFACE_POSITION_RESET',positionGeneration},{frameId:0})).catch(()=>{});
  }catch{}
 }
 async handle(r,sender){
  const api=this.api,fail=()=>{throw new ArchiveError('FORBIDDEN');};
  if(['PAIA_PROMPT_SURFACE_SETTINGS_STATUS','PAIA_PROMPT_SURFACE_RESET_POSITION'].includes(r.type))return this.settings(r,sender);
  if(r.type==='PAIA_PROMPT_SURFACE_DIAGNOSTIC')return this.diagnostic(r,sender);
  if(sender.id!==api.runtime.id||!sender.tab||sender.tab.incognito)fail();
  const tab=await api.tabs.get(sender.tab.id);if(tab.incognito||!site(tab.url))fail();
  if(!(await this.commands.service.s.status()).consented)throw new ArchiveError('CONSENT_REQUIRED');
  if(r.type==='PAIA_PROMPT_SURFACE_HOST'||r.type==='PAIA_PROMPT_SURFACE_REQUEST_CLOSE'){
   const closing=r.type==='PAIA_PROMPT_SURFACE_REQUEST_CLOSE';
   if(sender.frameId!==0||!site(sender.url)||!own(r,closing?['type','nonce']:['type','state']))fail();
   if(closing&&(typeof r.nonce!=='string'||!/^[a-f0-9-]{36}$/.test(r.nonce)))fail();
   if(closing||sender.url!==tab.url){
    // Chrome can retain the document's initial sender URL after history.pushState.
    // Bind this geometry-only request to that exact still-live top document.
    if(typeof sender.documentId!=='string'||!sender.documentId||sender.documentLifecycle&&sender.documentLifecycle!=='active')fail();
    const live=await api.tabs.sendMessage(tab.id,{type:'PAIA_PROMPT_SURFACE_PROBE'},{documentId:sender.documentId});
    const current=await api.tabs.get(tab.id);
    if(live?.url!==tab.url||current.url!==tab.url||current.incognito||closing&&(!live.open||live.nonce!==r.nonce))fail();
    if(!(await this.commands.service.s.status()).consented)throw new ArchiveError('CONSENT_REQUIRED');
   }
   // A nonce-only signal reaches extension documents, never the host page or another card.
   // The addressed card runs the same guard as its own Close and Escape controls.
   if(closing){await api.runtime.sendMessage({type:'PAIA_PROMPT_SURFACE_REQUEST_CLOSE',nonce:r.nonce});return {};}
   return this.hostGeometry(r.state);
  }
  if(r.type!=='PAIA_PROMPT_SURFACE_RPC'||!own(r,['type','nonce','command'])||typeof r.nonce!=='string'||!/^[a-f0-9-]{36}$/.test(r.nonce)||(!Number.isInteger(sender.frameId)||sender.frameId<=0)||sender.url!==api.runtime.getURL('ui/prompt-surface.html')+'#'+r.nonce)fail();
  // No worker-lifetime capability cache: bind every call to the actual live host.
  const host=await api.tabs.sendMessage(tab.id,{type:'PAIA_PROMPT_SURFACE_PROBE'},{frameId:0});
  if(!host?.open||host.nonce!==r.nonce||host.url!==tab.url)fail();
  this.frames.set(tab.id,{id:sender.frameId,nonce:r.nonce});
  const c=r.command;if(!c||typeof c.type!=='string')fail();
  if(['next_available','next_reopen'].includes(c.type))return this.next.card(c,tab);
  if(c.type==='close'&&own(c,['type'])){await api.tabs.sendMessage(tab.id,{type:'PAIA_PROMPT_SURFACE_CLOSE',nonce:r.nonce},{frameId:0});return {};}
  if(c.type==='members'&&own(c,['type','id']))return this.commands.service.members(c.id);
  if(!['PAIA_PROMPT_QUERY','PAIA_PROMPT_CHANGE','PAIA_PROMPT_COPY_TEXT','PAIA_PROMPT_INSERT'].includes(c.type))fail();
  if(c.type==='PAIA_PROMPT_INSERT'){
   if(!own(c,['type','id','text','operationId']))fail();
   return this.commands.dispatch({...c,tabId:tab.id,url:tab.url});
  }
  const result=await this.commands.dispatch(c);
  if(c.type==='PAIA_PROMPT_CHANGE')void api.runtime.sendMessage({type:'PAIA_PROMPT_CHANGED'}).catch(()=>{});
  return c.type==='PAIA_PROMPT_QUERY'?{...result,theme:host.dark?'dark':'light'}:result;
 }
 async diagnostic(r,sender){
  const api=this.api;
  if(sender.id!==api.runtime.id||sender.tab||sender.url!==api.runtime.getURL('ui/popup.html')||!own(r,['type']))throw new ArchiveError('FORBIDDEN');
  if(!(await this.commands.service.s.status()).consented)return {status:'consent_required'};
  const tabs=await api.tabs.query({active:true,lastFocusedWindow:true});
  if(tabs.length!==1||tabs[0].incognito||!site(tabs[0].url))return {status:'not_chatgpt'};
  const tab=tabs[0];let timer;
  try{
   const result=await Promise.race([api.tabs.sendMessage(tab.id,{type:'PAIA_PROMPT_SURFACE_DIAGNOSTIC_PROBE',url:tab.url},{frameId:0}),new Promise(resolve=>{timer=setTimeout(()=>resolve(null),1200);})]);
   const current=await api.tabs.get(tab.id);
   if(!current.active||current.incognito||current.url!==tab.url)return {status:'page_unavailable'};
   if(!(await this.commands.service.s.status()).consented)return {status:'consent_required'};
   return {status:['visible','composer_unrecognized','composer_ambiguous','layout_unavailable','surface_unavailable'].includes(result?.status)?result.status:'page_unavailable'};
  }catch{return {status:'page_unavailable'};}finally{clearTimeout(timer);}
 }

}
