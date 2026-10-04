import {ArchiveError} from '../core/constants.js';
import {own} from '../core/prompt-reuse-preferences.js';
const KEY='promptSurfaceV1',site=url=>{try{return new URL(url).origin==='https://chatgpt.com';}catch{return false;}};
export const validSurface=v=>own(v,['version','open','position'])&&v.version===1&&typeof v.open==='boolean'&&(v.position===null||own(v.position,['x','y'])&&['x','y'].every(k=>Number.isFinite(v.position[k])&&v.position[k]>=0&&v.position[k]<=1));
export class PromptSurfaceCommands{
 constructor(commands,api){this.commands=commands;this.api=api;}
 async handle(r,sender){
  const api=this.api,fail=()=>{throw new ArchiveError('FORBIDDEN');};
  if(sender.id!==api.runtime.id||!sender.tab||sender.tab.incognito)fail();
  const tab=await api.tabs.get(sender.tab.id);if(tab.incognito||!site(tab.url))fail();
  if(!(await this.commands.service.s.status()).consented)throw new ArchiveError('CONSENT_REQUIRED');
  if(r.type==='PAIA_PROMPT_SURFACE_HOST'){
   if(sender.frameId!==0||sender.url!==tab.url||!own(r,['type','state']))fail();
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
}
