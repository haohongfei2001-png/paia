import {SyncError} from '../core/browser-native-sync/value.js';
import {ArchiveError} from '../core/constants.js';
import {validPromptSelectionRef} from '../core/prompt-selection.js';
import {PROMPT_REUSE_ROW,own,quickPromptEligible} from '../core/prompt-reuse-preferences.js';
const fail=(code='STALE_BASE')=>{throw new ArchiveError(code);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export class PromptReuseCommands{
 #birth;#tasks=new Set();#selectionHold=null;#admission=0;#disposed=false;#outcomeUnknown=false;
 #track(task){const promise=Promise.resolve(task);this.#tasks.add(promise);const done=()=>this.#tasks.delete(promise);void promise.then(done,done);return promise;}
 #identity(){const service=this.service,store=service?.s,repository=store?.repository;return {service,store,repository,database:repository?.db,databaseId:store?.databaseId,api:this.api,journal:service?.syncJournal};}
 #sameIdentity(source){const current=this.#identity();return Object.keys(current).every(key=>current[key]===source[key]);}
 #original(){const current=this.#identity();return Object.entries(this.#birth).every(([key,value])=>current[key]===value);}
 #admit(){if(this.#disposed||this.#selectionHold)fail();return {generation:this.#admission,...this.#identity()};}
 #assertAdmission(admission){if(this.#disposed||this.#selectionHold||admission.generation!==this.#admission||!this.#sameIdentity(admission))fail();}
 constructor(service,api){this.service=service;this.api=api;this.attempts=new Map();const {service:owner,store,repository,database,databaseId}=this.#identity();this.#birth={service:owner,store,repository,database,databaseId,api};}
 async handle(request,sender){
  const api=this.api;
  if(sender.id!==api.runtime.id||!['ui/prompt-reuse-test.html','ui/archive.html','ui/popup.html'].some(path=>sender.url===api.runtime.getURL(path)))throw new ArchiveError('FORBIDDEN');
  return this.dispatch(request);
 }
 async dispatch(request,options={}){
  const admission=this.#admit();try{return await this.#track(this.#dispatch(request,options,admission));}catch(error){
   // Preserve the original refusal. A changed original journal owner is a
   // stale reviewed view, not evidence that a storage write failed.
   if(error instanceof SyncError&&error.code==='BNS_OWNER_CHANGED')throw new ArchiveError('MEMORY_STALE');
   throw error;
  }
 }
 async #dispatch(request,{assertTarget=null,targetIdentity=null}={},admission){
  const api=this.api;
  if(!(await this.service.s.status()).consented)throw new ArchiveError('CONSENT_REQUIRED');this.#assertAdmission(admission);
  if(request.type==='PAIA_PROMPT_QUERY'&&own(request,['type','includeHidden']))return this.service.query({includeHidden:request.includeHidden});
  if(request.type==='PAIA_PROMPT_COPY_TEXT'&&own(request,['type','id','text'])){const selected=await this.service.resolve(request);this.#assertAdmission(admission);return {text:selected.text};}
  if(request.type==='PAIA_PROMPT_HISTORY_QUERY'&&own(request,['type','query','cursor','searchSnapshot']))return this.service.queryHistory({query:request.query,cursor:request.cursor,searchSnapshot:request.searchSnapshot});
  if(request.type==='PAIA_PROMPT_HISTORY_SAVE'&&own(request,['type','ref','text','revision']))return this.service.createFromHistory(request.ref,request.text,request.revision);
  if(request.type==='PAIA_PROMPT_SELECTION_READ'&&own(request,['type','ref','range']))return this.service.resolveSelection(request.ref,request.range);
  if(request.type==='PAIA_PROMPT_CONFLICT_RESOLVE'&&own(request,['type','resolution']))return this.service.resolveManualConflict(request.resolution);
  if(request.type==='PAIA_PROMPT_CHANGE'&&own(request,['type','change']))return this.service.change(request.change);
  if(request.type==='PAIA_PROMPT_TARGETS'&&own(request,['type']))return (await api.tabs.query({url:'https://chatgpt.com/*'})).filter(t=>!t.incognito).map(t=>({id:t.id,url:t.url}));
  const typed=request.type==='PAIA_PROMPT_SELECTION_INSERT';
  if(!(typed?own(request,['type','ref','range','tabId','url','operationId','activationKey'])&&validPromptSelectionRef(request.ref):request.type==='PAIA_PROMPT_INSERT'&&own(request,['type','id','text','tabId','url','operationId']))||!Number.isSafeInteger(request.tabId)||request.tabId<0||!/^https:\/\/chatgpt\.com\//.test(request.url)||typeof request.operationId!=='string'||!/^[a-f0-9-]{36}$/.test(request.operationId))throw new ArchiveError('INVALID_REQUEST');
  if(Object.hasOwn(request,'activationKey')&&!['Enter',' '].includes(request.activationKey))throw new ArchiveError('INVALID_REQUEST');
  const binding=JSON.stringify(typed?[request.ref,request.range,request.tabId,request.url,request.activationKey??null,targetIdentity?['tabId','windowId','frameId','nonce','documentId','url'].map(key=>targetIdentity[key]):null]:[request.id,request.text,request.tabId,request.url]);
  const previous=this.attempts.get(request.operationId);if(previous){if(previous.binding!==binding)throw new ArchiveError('INVALID_REQUEST');return previous.promise;}
  if(this.attempts.size>=500)return {status:'failed',reason:'session_limit'};
  const promise=this.#insert(request,assertTarget,admission);this.attempts.set(request.operationId,{binding,promise});return promise;
 }
 async activeTypedTarget(request){
  const tab=await this.api.tabs.get(request.tabId);
  if(tab.incognito||tab.discarded||tab.active!==true||tab.url!==request.url)throw new ArchiveError('FORBIDDEN');
  if(typeof this.api.windows?.get!=='function')throw new ArchiveError('UNAVAILABLE');
  const window=await this.api.windows.get(tab.windowId);
  if(window.focused!==true||window.incognito===true)throw new ArchiveError('FORBIDDEN');
  return tab;
 }
 async insert(request,assertTarget=null){const admission=this.#admit();return this.#track(this.#insert(request,assertTarget,admission));}
 async #insert(request,assertTarget,admission){
  const typed=request.type==='PAIA_PROMPT_SELECTION_INSERT';
  // Typed board use belongs to the already active document. Never reactivate a
  // background tab/window to repair an old selection or rebind its effect.
  if(typed&&assertTarget)await assertTarget();this.#assertAdmission(admission);
  let tab=typed?await this.activeTypedTarget(request):null;this.#assertAdmission(admission);
  const selected=typed?await this.service.resolveSelection(request.ref,request.range):await this.service.resolve(request);this.#assertAdmission(admission);
  tab??=await this.api.tabs.get(request.tabId);this.#assertAdmission(admission);
  if(tab.incognito||tab.url!==request.url)return {status:'failed',reason:'page_changed'};
  if(!(await this.service.s.status()).consented)throw new ArchiveError('CONSENT_REQUIRED');this.#assertAdmission(admission);
  if(!typed)await this.api.tabs.update(tab.id,{active:true});this.#assertAdmission(admission);
  if(typed)await this.service.assertSelectionCurrent(selected);else await this.service.assertCurrent(selected.generation);this.#assertAdmission(admission);
  if(typed)tab=await this.activeTypedTarget(request);this.#assertAdmission(admission);
  // A private board callback adds its actual iframe/nonce fence without adding
  // wire authority or another one-shot insertion owner.
  if(assertTarget)await assertTarget();this.#assertAdmission(admission);
  if(!quickPromptEligible(selected.text))throw new ArchiveError('PROMPT_TOO_LONG');
  if(selected.text.includes('\r'))return {status:'failed',reason:'unsupported_line_endings'};
  let timer,proved=false;
  try{
   // The original physical transport outlives the bounded UI response. A late
   // ACK is observed only for settlement, never replayed or newly published.
   const sent=this.#track(this.api.tabs.sendMessage(tab.id,{type:'PAIA_PROMPT_INSERT_SELECTED',text:selected.text,operationId:request.operationId,url:tab.url,...(request.activationKey?{activationKey:request.activationKey}:{})},{frameId:0}));
   const response=await Promise.race([
    sent,
    new Promise(resolve=>{timer=setTimeout(()=>resolve({status:'uncertain',reason:'acknowledgement_timeout'}),2000);})
   ]);
   proved=response?.status==='failed'||response?.status==='inserted'&&response.verified===true;
   if(response?.status==='inserted'&&response.verified===true){
    if(!response.replayed&&(!typed||selected.familyId)){
     // Keep the original preferences + Sync-journal promise, not its ignored
     // UI notification. A hold may drain it but cannot redirect it to a new DB.
     const publication=this.#track(Promise.resolve().then(()=>{if(!this.#sameIdentity(admission))fail();return admission.service.noteVerifiedReuse(typed?selected.familyId:selected.id,selected.generation);}));
     void this.#track(publication.then(()=>admission.api.runtime?.sendMessage?.({type:'PAIA_PROMPT_CHANGED'}),()=>{this.#outcomeUnknown=true;})).catch(()=>{});
    }
    return {status:'inserted',verified:true};
   }
   if(response?.status==='failed')return {status:'failed',reason:['composition_active','composer_unavailable','unsupported_composer','draft_changed','insertion_rejected','insertion_unavailable','busy','draft_too_large','reload_required'].includes(response.reason)?response.reason:'insertion_unavailable'};
   return {status:'uncertain',reason:'readback_unconfirmed'};
  }catch{return {status:'uncertain',reason:'acknowledgement_unavailable'};}finally{clearTimeout(timer);if(!proved)this.#outcomeUnknown=true;}
 }
 // These are instance-local source-task receipts, not host freeze, cold
 // insertion recovery or global selection authority. Unknown is sticky and
 // constant-space; clearing attempts or a later success cannot manufacture ACK.
 #held(hold){return this.#selectionHold===hold&&hold.valid&&!this.#disposed&&hold.admission===this.#admission&&this.#original()&&this.#sameIdentity(hold);}
 async #drain(hold){for(;;){if(!this.#held(hold))fail();const tasks=[...this.#tasks];if(!tasks.length)return;await Promise.allSettled(tasks);}}
 #sourceSnapshot(){return this.#track(this.service.s.repository.transaction(false,async t=>({epoch:(await t.get('meta','recovery-restore-epoch'))??null,gate:(await t.get('meta','gate'))??null,generation:(await t.get('meta','backup-data-generation'))??null,preferencesRevision:(await t.get('meta',PROMPT_REUSE_ROW))?.revision??null}),['meta']));}
 async holdForApplicationSelection(){
  this.#admit();if(!this.#original()||!this.service.s.repository?.db)fail();
  const token=Object.freeze(Object.create(null)),hold={token,valid:true,admission:++this.#admission,...this.#identity(),ready:false,snapshot:null};this.#selectionHold=hold;let timer;
  const acquire=async()=>{await this.#drain(hold);if(this.#outcomeUnknown)fail('OUTCOME_UNKNOWN');hold.snapshot=await this.#sourceSnapshot();if(!this.#held(hold)||this.#tasks.size)fail();hold.ready=true;return token;};
  try{return await Promise.race([acquire(),new Promise((_,reject)=>{timer=setTimeout(()=>{hold.valid=false;reject(new ArchiveError('OUTCOME_UNKNOWN'));},30000);})]);}
  catch(error){hold.valid=false;if(this.#selectionHold===hold)this.#selectionHold=null;throw error;}finally{clearTimeout(timer);}
 }
 applicationSelectionHeld(token){const hold=this.#selectionHold;return !!hold&&hold.token===token&&hold.ready&&this.#held(hold)&&!this.#tasks.size&&!this.#outcomeUnknown;}
 async fenceApplicationSelection(token){if(!this.applicationSelectionHeld(token))fail();const hold=this.#selectionHold;try{if(!same(await this.#sourceSnapshot(),hold.snapshot)||!this.applicationSelectionHeld(token))fail();return true;}catch(error){hold.valid=false;throw error;}}
 releaseApplicationSelection(token){const hold=this.#selectionHold;if(hold?.token!==token)return false;hold.valid=false;this.#selectionHold=null;return true;}
 dispose(){this.#disposed=true;this.#admission++;if(this.#selectionHold)this.#selectionHold.valid=false;}

}
