import {ArchiveError} from '../core/constants.js';
import {own} from '../core/prompt-reuse-preferences.js';
const KEY='promptSurfaceV1',site=url=>{try{return new URL(url).origin==='https://chatgpt.com';}catch{return false;}};
export const validSurface=v=>own(v,['version','open','position'])&&v.version===1&&typeof v.open==='boolean'&&(v.position===null||own(v.position,['x','y'])&&['x','y'].every(k=>Number.isFinite(v.position[k])&&v.position[k]>=0&&v.position[k]<=1));
export class PromptSurfaceCommands{
 constructor(commands,api){this.commands=commands;this.api=api;}
 async handle(r,sender){
  const api=this.api,fail=()=>{throw new ArchiveError('FORBIDDEN');};
  if(r.type==='PAIA_PROMPT_SURFACE_DIAGNOSTIC')return this.diagnostic(r,sender);
  if(sender.id!==api.runtime.id||!sender.tab||sender.tab.incognito)fail();
  const tab=await api.tabs.get(sender.tab.id);if(tab.incognito||!site(tab.url))fail();
  if(!(await this.commands.service.s.status()).consented)throw new ArchiveError('CONSENT_REQUIRED');
  if(r.type==='PAIA_PROMPT_SURFACE_HOST'){
   if(sender.frameId!==0||!site(sender.url)||!own(r,['type','state']))fail();
   if(sender.url!==tab.url){
    // Chrome can retain the document's initial sender URL after history.pushState.
    // Bind this geometry-only request to that exact still-live top document.
    if(typeof sender.documentId!=='string'||!sender.documentId||sender.documentLifecycle&&sender.documentLifecycle!=='active')fail();
    const live=await api.tabs.sendMessage(tab.id,{type:'PAIA_PROMPT_SURFACE_PROBE'},{documentId:sender.documentId});
    const current=await api.tabs.get(tab.id);
    if(live?.url!==tab.url||current.url!==tab.url||current.incognito)fail();
    if(!(await this.commands.service.s.status()).consented)throw new ArchiveError('CONSENT_REQUIRED');
   }
   if(r.state!==undefined){if(!validSurface(r.state))throw new ArchiveError('INVALID_REQUEST');await api.storage.local.set({[KEY]:r.state});}
   const saved=(await api.storage.local.get(KEY))[KEY];return validSurface(saved)?saved:{version:1,open:false,position:null};
  }
  if(r.type!=='PAIA_PROMPT_SURFACE_RPC'||!own(r,['type','nonce','command'])||typeof r.nonce!=='string'||!/^[a-f0-9-]{36}$/.test(r.nonce)||(!Number.isInteger(sender.frameId)||sender.frameId<=0)||sender.url!==api.runtime.getURL('ui/prompt-surface.html')+'#'+r.nonce)fail();
  // No worker-lifetime capability cache: bind every call to the actual live host.
  const host=await api.tabs.sendMessage(tab.id,{type:'PAIA_PROMPT_SURFACE_PROBE'},{frameId:0});
  if(!host?.open||host.nonce!==r.nonce||host.url!==tab.url)fail();
  const c=r.command;if(!c||typeof c.type!=='string')fail();
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
