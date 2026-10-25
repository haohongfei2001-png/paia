import {SyncError} from '../core/browser-native-sync/value.js';
import {ArchiveError} from '../core/constants.js';
import {validPromptSelectionRef} from '../core/prompt-selection.js';
import {PROMPT_REUSE_ROW,own,quickPromptEligible} from '../core/prompt-reuse-preferences.js';
const fail=(code='STALE_BASE')=>{throw new ArchiveError(code);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)))),x=>x.toString(16).padStart(2,'0')).join('');
export class PromptReuseCommands{
 #receipts;#receiptCap;#receiptEpoch=null;
 #birth;#tasks=new Set();#selectionHold=null;#admission=0;#disposed=false;#outcomeUnknown=false;
 #track(task){const promise=Promise.resolve(task);this.#tasks.add(promise);const done=()=>this.#tasks.delete(promise);void promise.then(done,done);return promise;}
 #identity(){const service=this.service,store=service?.s,repository=store?.repository;return {service,store,repository,database:repository?.db,databaseId:store?.databaseId,api:this.api,journal:service?.syncJournal};}
 #sameIdentity(source){const current=this.#identity();return Object.keys(current).every(key=>current[key]===source[key]);}
 #original(){const current=this.#identity();return Object.entries(this.#birth).every(([key,value])=>current[key]===value);}
 #admit(){if(this.#disposed||this.#selectionHold)fail();return {generation:this.#admission,receiptEpoch:this.#receipts?.admissionEpoch(this.#receiptCap)??null,...this.#identity()};}
 #assertAdmission(admission){if(this.#disposed||this.#selectionHold||admission.generation!==this.#admission||!this.#sameIdentity(admission)||this.#receipts&&admission.receiptEpoch!==this.#receipts.admissionEpoch(this.#receiptCap))fail();}
 constructor(service,api,{insertionReceipts=null}={}){this.service=service;this.api=api;this.attempts=new Map();const {service:owner,store,repository,database,databaseId}=this.#identity();this.#birth={service:owner,store,repository,database,databaseId,api};this.#receipts=insertionReceipts;this.#receiptCap=insertionReceipts?.registerProducer('manual',this)??null;}
 insertionReceiptSourceIs(receipts,store){return this.#receipts===receipts&&this.#birth.store===store&&!this.#disposed&&this.#original();}
 async handle(request,sender){
  const api=this.api;
  if(sender.id!==api.runtime.id||!['ui/prompt-reuse-test.html','ui/archive.html','ui/popup.html'].some(path=>sender.url===api.runtime.getURL(path)))throw new ArchiveError('FORBIDDEN');
  if(this.#receipts&&['PAIA_PROMPT_INSERT_PREPARE','PAIA_PROMPT_INSERT','PAIA_PROMPT_SELECTION_INSERT'].includes(request?.type)&&(sender.tab?.incognito||typeof sender.documentId!=='string'||!sender.documentId||sender.documentLifecycle&&sender.documentLifecycle!=='active'))throw new ArchiveError('FORBIDDEN');
  const targetIdentity={kind:'extension-page',url:sender.url,documentId:sender.documentId??null,frameId:sender.frameId??null,tabId:sender.tab?.id??null};
  return this.dispatch(request,{targetIdentity});
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
  if(request.type==='PAIA_PROMPT_SELECTION_READ'&&own(request,['type','ref','range','prepareInsertion'])){const selected=await this.service.resolveSelection(request.ref,request.range);this.#assertAdmission(admission);if(request.prepareInsertion===undefined)return selected;if(request.prepareInsertion!==true||!targetIdentity||typeof assertTarget!=='function')fail();return {...selected,...(this.#receipts?{insertionAction:await this.#prepareInsertion(selected,targetIdentity,assertTarget,admission)}:{})};}
  if(request.type==='PAIA_PROMPT_CONFLICT_RESOLVE'&&own(request,['type','resolution']))return this.service.resolveManualConflict(request.resolution);
  if(request.type==='PAIA_PROMPT_CHANGE'&&own(request,['type','change']))return this.service.change(request.change);
  if(request.type==='PAIA_PROMPT_TARGETS'&&own(request,['type']))return (await api.tabs.query({url:'https://chatgpt.com/*'})).filter(t=>!t.incognito).map(t=>({id:t.id,url:t.url}));
  if(request.type==='PAIA_PROMPT_INSERT_PREPARE'){
   if(!own(request,['type','id','text','tabId','url'])||!Number.isSafeInteger(request.tabId)||request.tabId<0||!/^https:\/\/chatgpt\.com\//.test(request.url)||!targetIdentity)throw new ArchiveError('INVALID_REQUEST');
   const selected=await this.service.resolve(request),tab=await api.tabs.get(request.tabId);this.#assertAdmission(admission);if(tab.incognito||tab.discarded||tab.url!==request.url)fail();
   return {text:selected.text,...(this.#receipts?{insertionAction:await this.#prepareInsertion(selected,targetIdentity,assertTarget,admission,{tabId:tab.id,url:tab.url})}:{})};
  }
  const typed=request.type==='PAIA_PROMPT_SELECTION_INSERT';
  if(!(typed?own(request,['type','ref','range','tabId','url','operationId','activationKey','insertionAction'])&&validPromptSelectionRef(request.ref):request.type==='PAIA_PROMPT_INSERT'&&own(request,['type','id','text','tabId','url','operationId','insertionAction']))||!Number.isSafeInteger(request.tabId)||request.tabId<0||!/^https:\/\/chatgpt\.com\//.test(request.url)||typeof request.operationId!=='string'||!/^[a-f0-9-]{36}$/.test(request.operationId))throw new ArchiveError('INVALID_REQUEST');
  if(Object.hasOwn(request,'activationKey')&&!['Enter',' '].includes(request.activationKey))throw new ArchiveError('INVALID_REQUEST');
  if(this.#receipts){const epoch=this.#receipts.admissionEpoch(this.#receiptCap);if(this.#receiptEpoch!==epoch){this.attempts.clear();this.#receiptEpoch=epoch;}if(!request.insertionAction||request.operationId!==request.insertionAction.operationId||request.insertionAction.receiptEpoch!==epoch)fail();}
  const binding=JSON.stringify([typed?[request.ref,request.range,request.tabId,request.url,request.activationKey??null]:[request.id,request.text,request.tabId,request.url],targetIdentity,request.insertionAction??null]);
  const previous=this.attempts.get(request.operationId);if(previous){
   if(previous.binding!==binding)throw new ArchiveError('INVALID_REQUEST');const result=await previous.promise;
   // A cached positive belongs only to the completed original operation. It
   // cannot publish fresh UI success, including after a newer worker wins.
   if(this.#receipts&&result?.status==='inserted')return {status:'uncertain',reason:'readback_unconfirmed'};
   return result;
  }
  if(!this.#receipts&&this.attempts.size>=500)return {status:'failed',reason:'session_limit'};
  const promise=this.#trackInsertion(this.#insert(request,assertTarget,admission,targetIdentity),admission.receiptEpoch);this.attempts.set(request.operationId,{binding,promise});return promise;
 }
 async #insertionBinding(selected,targetIdentity,receiver){
  const authorization=await this.service.s.status();if(!authorization.consented)throw new ArchiveError('CONSENT_REQUIRED');
  return {receiver,sourceDigest:await digest([selected.ref??null,selected.range??null,selected.id??selected.familyId??null,selected.text,selected.generation]),authorizationDigest:await digest(['manual',authorization.epoch]),initiatorDigest:await digest(targetIdentity)};
 }
 async #prepareInsertion(selected,targetIdentity,assertTarget,admission,target=targetIdentity){
  if(assertTarget)await assertTarget();this.#assertAdmission(admission);if(selected.ref)await this.service.assertSelectionCurrent(selected);else await this.service.assertCurrent(selected.generation);this.#assertAdmission(admission);
  const receiver=await this.#receipts.resolveReceiver(target.tabId,target.url);
  const binding=await this.#insertionBinding(selected,targetIdentity,receiver);if(assertTarget)await assertTarget();if(selected.ref)await this.service.assertSelectionCurrent(selected);else await this.service.assertCurrent(selected.generation);this.#assertAdmission(admission);
  const action=await this.#receipts.issueAction(this.#receiptCap,{...binding,receiptEpoch:admission.receiptEpoch});
  if(assertTarget)await assertTarget();if(selected.ref)await this.service.assertSelectionCurrent(selected);else await this.service.assertCurrent(selected.generation);const authorization=await this.service.s.status();if(!authorization.consented||await digest(['manual',authorization.epoch])!==binding.authorizationDigest)fail();this.#assertAdmission(admission);return action;
 }
 async activeTypedTarget(request){
  const tab=await this.api.tabs.get(request.tabId);
  if(tab.incognito||tab.discarded||tab.active!==true||tab.url!==request.url)throw new ArchiveError('FORBIDDEN');
  if(typeof this.api.windows?.get!=='function')throw new ArchiveError('UNAVAILABLE');
  const window=await this.api.windows.get(tab.windowId);
  if(window.focused!==true||window.incognito===true)throw new ArchiveError('FORBIDDEN');
  return tab;
 }
 async insert(request,assertTarget=null){const admission=this.#admit();return this.#trackInsertion(this.#insert(request,assertTarget,admission),admission.receiptEpoch);}
 #trackInsertion(task,epoch){const promise=this.#track(task);this.#receipts?.trackContinuation(this.#receiptCap,promise,epoch);return promise;}
 async #insert(request,assertTarget,admission,targetIdentity=null){
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
  let timer,proved=false,uiOpen=true;
  try{
   // The original physical transport outlives the bounded UI response. A late
   // ACK is observed only for settlement, never replayed or newly published.
   const message={type:'PAIA_PROMPT_INSERT_SELECTED',text:selected.text,operationId:request.operationId,url:tab.url,...(request.activationKey?{activationKey:request.activationKey}:{})};
   let original;
   if(this.#receipts){
    if(!targetIdentity||!request.insertionAction||request.operationId!==request.insertionAction.operationId)fail();
    const eventContext=this.#receipts.beginInsertion(this.#receiptCap,request.insertionAction);
    const receiver=await this.#receipts.resolveReceiver(tab.id,tab.url,null,eventContext),binding=await this.#insertionBinding(selected,targetIdentity,receiver);
    const current=async()=>{if(!uiOpen)fail();this.#assertAdmission(admission);const authorization=await this.service.s.status();if(!authorization.consented||await digest(['manual',authorization.epoch])!==binding.authorizationDigest)throw new ArchiveError('CONSENT_REQUIRED');if(typed){await this.service.assertSelectionCurrent(selected);await this.activeTypedTarget(request);}else{await this.service.assertCurrent(selected.generation);const current=await this.api.tabs.get(tab.id);if(current.incognito||current.discarded||current.url!==request.url)fail();}if(assertTarget)await assertTarget();this.#assertAdmission(admission);};
    original=this.#receipts.dispatch(this.#receiptCap,{...binding,action:request.insertionAction,message},current);
   }else original=this.api.tabs.sendMessage(tab.id,message,{frameId:0});
   // Revalidation shares the unchanged UI deadline; an already-started read
   // remains drainable, but a late ACK starts no new source publication.
   const sent=this.#track(original);
   const response=await Promise.race([
    sent,
    new Promise(resolve=>{timer=setTimeout(()=>{uiOpen=false;resolve({status:'uncertain',reason:'acknowledgement_timeout'});},2000);})
   ]);
   proved=response?.status==='failed'||response?.status==='inserted'&&response.verified===true;
   if(response?.status==='inserted'&&response.verified===true){
    if(!response.replayed&&(!typed||selected.familyId)){
     // Keep the original preferences + Sync-journal promise, not its ignored
     // UI notification. A hold may drain it but cannot redirect it to a new DB.
     const publication=this.#trackInsertion(Promise.resolve().then(()=>{if(!this.#sameIdentity(admission))fail();return admission.service.noteVerifiedReuse(typed?selected.familyId:selected.id,selected.generation);}),admission.receiptEpoch);
     void this.#trackInsertion(publication.then(()=>admission.api.runtime?.sendMessage?.({type:'PAIA_PROMPT_CHANGED'}),()=>{this.#outcomeUnknown=true;}),admission.receiptEpoch).catch(()=>{});
    }
    return {status:'inserted',verified:true};
   }
   if(response?.status==='failed')return {status:'failed',reason:['composition_active','composer_unavailable','unsupported_composer','draft_changed','insertion_rejected','insertion_unavailable','busy','draft_too_large','reload_required','page_refresh_required'].includes(response.reason)?response.reason:'insertion_unavailable'};
   return {status:'uncertain',reason:'readback_unconfirmed'};
  }catch(error){if(error instanceof ArchiveError&&error.code==='PROMPT_PAGE_REFRESH_REQUIRED'){proved=true;return {status:'failed',reason:'page_refresh_required'};}return {status:'uncertain',reason:'acknowledgement_unavailable'};}finally{uiOpen=false;clearTimeout(timer);if(!proved)this.#outcomeUnknown=true;}
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
