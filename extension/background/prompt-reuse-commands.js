import {ArchiveError} from '../core/constants.js';
import {validPromptSelectionRef} from '../core/prompt-selection.js';
import {own,quickPromptEligible} from '../core/prompt-reuse-preferences.js';
export class PromptReuseCommands{
 constructor(service,api){this.service=service;this.api=api;this.attempts=new Map();}
 async handle(request,sender){
  const api=this.api;
  if(sender.id!==api.runtime.id||!['ui/prompt-reuse-test.html','ui/archive.html','ui/popup.html'].some(path=>sender.url===api.runtime.getURL(path)))throw new ArchiveError('FORBIDDEN');
  return this.dispatch(request);
 }
 async dispatch(request,{assertTarget=null,targetIdentity=null}={}){
  const api=this.api;
  if(!(await this.service.s.status()).consented)throw new ArchiveError('CONSENT_REQUIRED');
  if(request.type==='PAIA_PROMPT_QUERY'&&own(request,['type','includeHidden']))return this.service.query({includeHidden:request.includeHidden});
  if(request.type==='PAIA_PROMPT_COPY_TEXT'&&own(request,['type','id','text'])){const selected=await this.service.resolve(request);return {text:selected.text};}
  if(request.type==='PAIA_PROMPT_HISTORY_QUERY'&&own(request,['type','query','cursor','searchSnapshot']))return this.service.queryHistory({query:request.query,cursor:request.cursor,searchSnapshot:request.searchSnapshot});
  if(request.type==='PAIA_PROMPT_HISTORY_SAVE'&&own(request,['type','ref','text','revision']))return this.service.createFromHistory(request.ref,request.text,request.revision);
  if(request.type==='PAIA_PROMPT_SELECTION_READ'&&own(request,['type','ref','range']))return this.service.resolveSelection(request.ref,request.range);
  if(request.type==='PAIA_PROMPT_CHANGE'&&own(request,['type','change']))return this.service.change(request.change);
  if(request.type==='PAIA_PROMPT_TARGETS'&&own(request,['type']))return (await api.tabs.query({url:'https://chatgpt.com/*'})).filter(t=>!t.incognito).map(t=>({id:t.id,url:t.url}));
  const typed=request.type==='PAIA_PROMPT_SELECTION_INSERT';
  if(!(typed?own(request,['type','ref','range','tabId','url','operationId','activationKey'])&&validPromptSelectionRef(request.ref):request.type==='PAIA_PROMPT_INSERT'&&own(request,['type','id','text','tabId','url','operationId']))||!Number.isSafeInteger(request.tabId)||request.tabId<0||!/^https:\/\/chatgpt\.com\//.test(request.url)||typeof request.operationId!=='string'||!/^[a-f0-9-]{36}$/.test(request.operationId))throw new ArchiveError('INVALID_REQUEST');
  if(Object.hasOwn(request,'activationKey')&&!['Enter',' '].includes(request.activationKey))throw new ArchiveError('INVALID_REQUEST');
  const binding=JSON.stringify(typed?[request.ref,request.range,request.tabId,request.url,request.activationKey??null,targetIdentity?['tabId','windowId','frameId','nonce','documentId','url'].map(key=>targetIdentity[key]):null]:[request.id,request.text,request.tabId,request.url]);
  const previous=this.attempts.get(request.operationId);if(previous){if(previous.binding!==binding)throw new ArchiveError('INVALID_REQUEST');return previous.promise;}
  if(this.attempts.size>=500)return {status:'failed',reason:'session_limit'};
  const promise=this.insert(request,assertTarget);this.attempts.set(request.operationId,{binding,promise});return promise;
 }
 async activeTypedTarget(request){
  const tab=await this.api.tabs.get(request.tabId);
  if(tab.incognito||tab.discarded||tab.active!==true||tab.url!==request.url)throw new ArchiveError('FORBIDDEN');
  if(typeof this.api.windows?.get!=='function')throw new ArchiveError('UNAVAILABLE');
  const window=await this.api.windows.get(tab.windowId);
  if(window.focused!==true||window.incognito===true)throw new ArchiveError('FORBIDDEN');
  return tab;
 }
 async insert(request,assertTarget=null){
  const typed=request.type==='PAIA_PROMPT_SELECTION_INSERT';
  // Typed board use belongs to the already active document. Never reactivate a
  // background tab/window to repair an old selection or rebind its effect.
  if(typed&&assertTarget)await assertTarget();
  let tab=typed?await this.activeTypedTarget(request):null;
  const selected=typed?await this.service.resolveSelection(request.ref,request.range):await this.service.resolve(request);
  tab??=await this.api.tabs.get(request.tabId);
  if(tab.incognito||tab.url!==request.url)return {status:'failed',reason:'page_changed'};
  if(!(await this.service.s.status()).consented)throw new ArchiveError('CONSENT_REQUIRED');
  if(!typed)await this.api.tabs.update(tab.id,{active:true});
  if(typed)await this.service.assertSelectionCurrent(selected);else await this.service.assertCurrent(selected.generation);
  if(typed)tab=await this.activeTypedTarget(request);
  // A private board callback adds its actual iframe/nonce fence without adding
  // wire authority or another one-shot insertion owner.
  if(assertTarget)await assertTarget();
  if(!quickPromptEligible(selected.text))throw new ArchiveError('PROMPT_TOO_LONG');
  if(selected.text.includes('\r'))return {status:'failed',reason:'unsupported_line_endings'};
  let timer;
  try{
   const response=await Promise.race([
    this.api.tabs.sendMessage(tab.id,{type:'PAIA_PROMPT_INSERT_SELECTED',text:selected.text,operationId:request.operationId,url:tab.url,...(request.activationKey?{activationKey:request.activationKey}:{})},{frameId:0}),
    new Promise(resolve=>{timer=setTimeout(()=>resolve({status:'uncertain',reason:'acknowledgement_timeout'}),2000);})
   ]);
   if(response?.status==='inserted'&&response.verified===true){if(!response.replayed&&(!typed||selected.familyId))void Promise.resolve().then(()=>this.service.noteVerifiedReuse(typed?selected.familyId:selected.id,selected.generation)).then(()=>this.api.runtime?.sendMessage?.({type:'PAIA_PROMPT_CHANGED'})).catch(()=>{});return {status:'inserted',verified:true};}
   if(response?.status==='failed')return {status:'failed',reason:['composition_active','composer_unavailable','unsupported_composer','draft_changed','insertion_rejected','insertion_unavailable','busy','draft_too_large','reload_required'].includes(response.reason)?response.reason:'insertion_unavailable'};
   return {status:'uncertain',reason:'readback_unconfirmed'};
  }catch{return {status:'uncertain',reason:'acknowledgement_unavailable'};}finally{clearTimeout(timer);}
 }
}
