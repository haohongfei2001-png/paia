import {ArchiveError} from '../core/constants.js';
import {own} from '../core/prompt-reuse-preferences.js';
export class PromptReuseCommands{
 constructor(service,api){this.service=service;this.api=api;this.attempts=new Map();}
 async handle(request,sender){
  const api=this.api;
  if(sender.id!==api.runtime.id||!['ui/prompt-reuse-test.html','ui/archive.html','ui/popup.html'].some(path=>sender.url===api.runtime.getURL(path)))throw new ArchiveError('FORBIDDEN');
  if(!(await this.service.s.status()).consented)throw new ArchiveError('CONSENT_REQUIRED');
  if(request.type==='PAIA_PROMPT_QUERY'&&own(request,['type','includeHidden']))return this.service.query({includeHidden:request.includeHidden});
  if(request.type==='PAIA_PROMPT_CHANGE'&&own(request,['type','change']))return this.service.change(request.change);
  if(request.type==='PAIA_PROMPT_TARGETS'&&own(request,['type']))return (await api.tabs.query({url:'https://chatgpt.com/*'})).filter(t=>!t.incognito).map(t=>({id:t.id,url:t.url}));
  if(request.type!=='PAIA_PROMPT_INSERT'||!own(request,['type','id','text','tabId','url','operationId'])||!Number.isSafeInteger(request.tabId)||request.tabId<0||!/^https:\/\/chatgpt\.com\//.test(request.url)||typeof request.operationId!=='string'||!/^[a-f0-9-]{36}$/.test(request.operationId))throw new ArchiveError('INVALID_REQUEST');
  const binding=JSON.stringify([request.id,request.text,request.tabId,request.url]);
  const previous=this.attempts.get(request.operationId);if(previous){if(previous.binding!==binding)throw new ArchiveError('INVALID_REQUEST');return previous.promise;}
  if(this.attempts.size>=500)return {status:'failed',reason:'session_limit'};
  const promise=this.insert(request);this.attempts.set(request.operationId,{binding,promise});return promise;
 }
 async insert(request){
  const selected=await this.service.resolve(request),tab=await this.api.tabs.get(request.tabId);
  if(tab.incognito||tab.url!==request.url)return {status:'failed',reason:'page_changed'};
  if(!(await this.service.s.status()).consented)throw new ArchiveError('CONSENT_REQUIRED');
  let timer;
  try{
   const response=await Promise.race([
    this.api.tabs.sendMessage(tab.id,{type:'PAIA_PROMPT_INSERT_SELECTED',text:selected.text,operationId:request.operationId,url:tab.url},{frameId:0}),
    new Promise(resolve=>{timer=setTimeout(()=>resolve({status:'uncertain',reason:'acknowledgement_timeout'}),2000);})
   ]);
   if(response?.status==='inserted'&&response.verified===true){await this.service.noteVerifiedReuse(selected.id).catch(()=>{});return {status:'inserted',verified:true};}
   if(response?.status==='failed')return {status:'failed',reason:['composition_active','composer_unavailable','unsupported_composer','draft_changed','insertion_rejected','insertion_unavailable','busy','draft_too_large','reload_required'].includes(response.reason)?response.reason:'insertion_unavailable'};
   return {status:'uncertain',reason:'readback_unconfirmed'};
  }catch{return {status:'uncertain',reason:'acknowledgement_unavailable'};}finally{clearTimeout(timer);}
 }
}
