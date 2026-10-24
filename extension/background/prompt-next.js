import {quickPromptEligible} from '../core/prompt-reuse-preferences.js';
import {ArchiveError} from '../core/constants.js';
import {topicRootTarget} from '../core/topic-root-target.js';
import {own} from '../core/prompt-reuse-preferences.js';
import {matchNextFamily} from '../core/next-family-matcher.js';
import {detectNextAction} from '../core/next-action-detector.js';
export const NEXT_AUTH_KEY='promptNextAutomaticPreferenceV2';
const uuid=x=>typeof x==='string'&&/^[a-f0-9-]{36}$/.test(x);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const site=url=>{try{return new URL(url).origin==='https://chatgpt.com';}catch{return false;}};
const supported=url=>{try{const u=new URL(url);return u.origin==='https://chatgpt.com'&&/^\/(?:g\/[^/]+\/)?c\/[a-zA-Z0-9_-]+\/?$/.test(u.pathname);}catch{return false;}};
const validBinding=b=>own(b,['url','conversation','cycle','replyId','revision'])&&supported(b.url)&&b.conversation===new URL(b.url).pathname&&Number.isSafeInteger(b.cycle)&&b.cycle>0&&Number.isSafeInteger(b.revision)&&b.revision>=0&&typeof b.replyId==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(b.replyId);
const fail=(code='FORBIDDEN')=>{throw new ArchiveError(code);};
export class NextPromptCommands{
 #insertions=new WeakMap();
 #tasks=new Set();#admissions=new Set();#selectionHold=null;#admission=0;#authorizationEpoch=0;#disposed=false;#insertionUnknown=false;
 constructor(service,api,surface){this.service=service;this.api=api;this.surface=surface;this.instance=crypto.randomUUID();this.groups=new Map();this.serial=0;this.changing=false;this.tail=Promise.resolve();this.offers=new Map();}
 #track(task,admission=null){this.#tasks.add(task);const done=()=>{this.#tasks.delete(task);if(admission)this.#admissions.delete(admission);};void task.then(done,done);return task;}
 #admit(tabId=null){if(this.#disposed||this.#selectionHold)fail();const admission={generation:this.#admission,tabId,valid:true};if(Number.isInteger(tabId))this.#admissions.add(admission);return admission;}
 #assertAdmission(admission){if(this.#disposed||this.#selectionHold||!admission.valid||admission.generation!==this.#admission)fail();}
 #restrict(){this.#admission++;if(this.#selectionHold)this.#selectionHold.valid=false;}
 // Tab lifecycle events retire only that tab's original continuations. The
 // worker also sees unrelated browser tabs; they cannot revoke another tab's
 // current work or an already admitted global preference change.
 #retireTab(id){for(const admission of this.#admissions)if(admission.tabId===id)admission.valid=false;if(this.#selectionHold)this.#selectionHold.valid=false;}
 #changed(){try{void this.#track(this.api.runtime.sendMessage({type:'PAIA_PROMPT_NEXT_CHANGED'})).catch(()=>{});}catch{}}
 async authorization(){return this.#track(this.#authorization());}
 async #authorization(){
  const serial=this.serial,admission=this.#admission;
  const stored=this.api.storage.local?(await this.api.storage.local.get(NEXT_AUTH_KEY))[NEXT_AUTH_KEY]:undefined;
  const consented=(await this.service.s.status()).consented;
  return {enabled:!this.#disposed&&!this.#selectionHold&&admission===this.#admission&&!this.changing&&serial===this.serial&&consented&&stored?.version===2&&stored.enabled===true&&uuid(stored.generation),generation:(stored?.generation||'off')+':'+this.instance+':'+this.serial+':'+this.#authorizationEpoch};
 }
 async configure(enabled){
  if(enabled)this.#admit();this.#restrict();const admission={generation:this.#admission,valid:true};
  return this.#track(this.#configure(enabled,admission));
 }
 async #configure(enabled,admission){
  // Synchronous invalidation precedes IO, including concurrent enable/revoke.
  const ticket=++this.serial;this.changing=true;this.groups.clear();this.offers.clear();
  const write=async()=>{
   if(enabled){try{this.#assertAdmission(admission);}catch(error){if(ticket===this.serial)this.changing=false;throw error;}}
   if(!this.api.storage.local&&enabled)throw new ArchiveError('UNAVAILABLE');
   if(this.api.storage.local)await this.api.storage.local.set({[NEXT_AUTH_KEY]:{version:2,enabled,generation:crypto.randomUUID()}});
   if(ticket===this.serial)this.changing=false;
   const tabs=this.api.tabs?.query?await this.api.tabs.query({url:'https://chatgpt.com/*'}):[];
   await Promise.allSettled(tabs.filter(t=>!t.incognito).map(t=>this.api.tabs.sendMessage(t.id,{type:'PAIA_PROMPT_NEXT_AUTH_CHANGED'},{frameId:0})));
   this.#changed();
   return this.authorization();
  };
  const result=this.tail.then(write);this.tail=result.catch(()=>{});return result;
 }
 removeTab(id){this.#retireTab(id);this.groups.delete(id);this.offers.delete(id);}
 async top(sender){return this.#track(this.#top(sender));}
 async #top(sender){
  if(sender.id!==this.api.runtime.id||!sender.tab||sender.tab.incognito||sender.frameId!==0||typeof sender.documentId!=='string'||!sender.documentId||sender.documentLifecycle&&sender.documentLifecycle!=='active')fail();
  if(!site(sender.url))fail();
  const tab=await this.api.tabs.get(sender.tab.id);if(tab.incognito||!supported(tab.url))fail();return tab;
 }
 async probe(tab,documentId){const admission=this.#admit(tab.id);return this.#track(this.#probe(tab,documentId,admission),admission);}
 async #probe(tab,documentId,admission){const live=await this.api.tabs.sendMessage(tab.id,{type:'PAIA_PROMPT_NEXT_PROBE'},{documentId});this.#assertAdmission(admission);return live;}
 async assertCurrent(group,options={}){const admission=this.#admit(group.tabId);return this.#track(this.#assertCurrent(group,options,admission),admission);}
 async #assertCurrent(group,{requireFamily=true},admission){
  const auth=await this.authorization();if(!auth.enabled||auth.generation!==group.authorization||this.groups.get(group.tabId)!==group)fail();
  const tab=await this.api.tabs.get(group.tabId);if(tab.incognito||tab.url!==group.binding.url)fail();
  const live=await this.probe(tab,group.documentId);
  if(live?.authorization!==auth.generation||!same(live.binding,group.binding))fail();
  const final=await this.authorization();if(!final.enabled||final.generation!==auth.generation||this.groups.get(group.tabId)!==group)fail();
  if(requireFamily&&group.family)await this.service.assertCurrent(group.family.generation);
  this.#assertAdmission(admission);if(this.changing||this.groups.get(group.tabId)!==group||!group.authorization.endsWith(':'+this.instance+':'+this.serial+':'+this.#authorizationEpoch))fail();
  return {tab,live};
 }
 async resolveFamily(group){const admission=this.#admit(group.tabId);return this.#track(this.#resolveFamily(group,admission),admission);}
 async #resolveFamily(group,admission){
  if(group.family){const selected=await this.service.resolve({id:group.family.id,text:group.family.text});if(selected.generation!==group.family.generation)fail();}
  this.#assertAdmission(admission);return this.assertCurrent(group);
 }
 retireConsumed(group,status){
  if(!['inserted','uncertain'].includes(status))return;
  group.retired=true;
  if(this.groups.get(group.tabId)!==group)return;
  // This body-free notice can only retire the exact original host opportunity.
  // Keep the original attempt/outcome tombstone, including checked legacy copy.
  try{void this.#track(this.api.tabs.sendMessage(group.tabId,{type:'PAIA_PROMPT_NEXT_CONSUMED',id:group.id,binding:group.binding,authorization:group.authorization,status},{documentId:group.documentId})).catch(()=>{});}catch{};
  this.#changed();
 }
 async handle(r,sender){
  const restrictive=r?.type==='PAIA_PROMPT_NEXT_CONFIGURE'&&r.enabled===false||r?.type==='PAIA_PROMPT_NEXT_INVALIDATE';
  const admission=restrictive?{generation:this.#admission,valid:true}:this.#admit(['PAIA_PROMPT_NEXT_CONFIGURE','PAIA_PROMPT_NEXT_STATUS'].includes(r?.type)?null:sender.tab?.id);return this.#track(this.#handle(r,sender,admission),admission);
 }
 async #handle(r,sender,admission){
  const api=this.api,popup=sender.id===api.runtime.id&&(!sender.tab||sender.frameId===0&&!sender.tab.incognito)&&sender.url===api.runtime.getURL('ui/popup.html');
  const archiveURL=api.runtime.getURL('ui/archive.html');
  const settings=sender.id===api.runtime.id&&(sender.url===archiveURL||typeof sender.url==='string'&&sender.url.startsWith(archiveURL+'#')&&topicRootTarget(sender.url)!==null)&&!sender.tab?.incognito&&(sender.frameId===undefined||sender.frameId===0)&&(!sender.documentLifecycle||sender.documentLifecycle==='active');
  if(r.type==='PAIA_PROMPT_NEXT_CONFIGURE'){
   if(!popup&&!settings||!own(r,['type','enabled'])||typeof r.enabled!=='boolean')fail();
   if(r.enabled&&!(await this.service.s.status()).consented)throw new ArchiveError('CONSENT_REQUIRED');
   if(r.enabled)this.#assertAdmission(admission);return this.configure(r.enabled);
  }
  if(r.type==='PAIA_PROMPT_NEXT_STATUS'){
   if(!own(r,['type']))fail();if(!popup&&!settings)await this.top(sender);return this.authorization();
  }
  if(r.type==='PAIA_PROMPT_NEXT_INVALIDATE'){
   if(!own(r,['type','id'])||!uuid(r.id))fail();await this.top(sender);const g=this.groups.get(sender.tab.id);if(this.#selectionHold)this.#selectionHold.valid=false;if(g?.documentId===sender.documentId&&g.id===r.id){this.#retireTab(sender.tab.id);this.groups.delete(sender.tab.id);this.#changed();}return {};
  }
  if(r.type==='PAIA_PROMPT_NEXT_OFFER'){
   if(!own(r,['type','binding','authorization','snapshot'])||!validBinding(r.binding)||!own(r.snapshot,['completed','text','blocks','excluded']))fail();
   const tab=await this.top(sender),auth=await this.authorization();this.#assertAdmission(admission);
   const attempt=crypto.randomUUID();this.offers.set(tab.id,attempt);
   if(!auth.enabled||auth.generation!==r.authorization||tab.url!==r.binding.url)fail();
   const live=await this.probe(tab,sender.documentId);
   if(live?.authorization!==auth.generation||!same(live.binding,r.binding))fail();
   this.#assertAdmission(admission);let result=detectNextAction(r.snapshot); // snapshot is never assigned to a retained field.
   if(result.type==='DEFER'&&result.reason==='NO_EXPLICIT_NEXT_ACTION')result=matchNextFamily(r.snapshot,await this.service.nextFamilyView?.());
   const final=await this.authorization();if(!final.enabled||final.generation!==auth.generation||this.offers.get(tab.id)!==attempt)fail();
   const latest=await this.probe(tab,sender.documentId);if(!same(latest?.binding,r.binding)||latest?.authorization!==auth.generation||this.offers.get(tab.id)!==attempt)fail();
   this.#assertAdmission(admission);this.groups.delete(tab.id);
   if(result.type==='DEFER')return {available:false,reason:result.reason};
   if(result.condition)return {available:false,reason:'PREREQUISITE_UNPRESENTABLE'};
   if(result.choices.length!==1)return {available:false,reason:'AMBIGUOUS_QUICK_CHOICE'};
   if(result.choices.some(text=>!quickPromptEligible(text)))return {available:false,reason:'QUICK_EXPRESSION_TOO_LONG'};
   if(this.groups.size>=100)return {available:false,reason:'RESOURCE_LIMIT'};
   const group={id:crypto.randomUUID(),tabId:tab.id,documentId:sender.documentId,binding:r.binding,authorization:auth.generation,type:result.type,sourceType:result.sourceType,...(result.family?{family:result.family}:{}),condition:result.condition,evidence:result.evidence,choices:result.choices.map((text,i)=>({id:crypto.randomUUID(),text,label:result.labels?.[i]||text})),attempted:new Set(),outcomes:new Map()};
   this.groups.set(tab.id,group);
   try{await this.assertCurrent(group);this.#assertAdmission(admission);}catch(error){if(this.groups.get(tab.id)===group)this.groups.delete(tab.id);throw error;}
   this.#changed();
   return {available:true,id:group.id};
  }
  if(r.type==='PAIA_PROMPT_NEXT_INSERT_CURRENT'){
   if(!own(r,['type','id','operationId','choiceId'])||Object.keys(r).length!==4||!uuid(r.id)||!uuid(r.operationId)||!uuid(r.choiceId))fail();
   const tab=await this.top(sender);this.#assertAdmission(admission);const g=this.groups.get(tab.id),pending=g&&this.#insertions.get(g);
   const current=()=>!!pending&&this.groups.get(tab.id)===g&&!g.retired&&g.documentId===sender.documentId&&g.id===r.id&&this.#insertions.get(g)===pending&&pending.operationId===r.operationId&&pending.choiceId===r.choiceId&&g.attempted.has(pending.choiceId)&&!pending.checked;
   if(!current())fail();
   // This is the original accepted click, not a fresh display opportunity.
   // The busy original surface must not turn a legitimate Family click into
   // failure. Family, permission and exact live reply still requalify.
   await this.resolveFamily(g);this.#assertAdmission(admission);if(!current())fail();pending.checked=true;return {current:true};
  }
  if(r.type==='PAIA_PROMPT_NEXT_PRESENT'){
   if(!own(r,['type','id']))fail();const tab=await this.top(sender);this.#assertAdmission(admission);const g=this.groups.get(tab.id);if(g?.id!==r.id||g.documentId!==sender.documentId)fail();
   const {live}=await this.assertCurrent(g),safe=!g.retired&&live.idle===true&&await this.surface.isIdle(tab.id);
   // The idle probe yields; do not qualify a replaced/revoked Family or reply.
   await this.assertCurrent(g);this.#assertAdmission(admission);return {safe:safe&&!g.retired,sourceType:g.sourceType};
  }
  // Extension frame only: same resource, distinct nonce and independently bound host.
  if(r.type!=='PAIA_PROMPT_NEXT_RPC'||!own(r,['type','nonce','command'])||!uuid(r.nonce)||sender.id!==api.runtime.id||!sender.tab||sender.tab.incognito||!Number.isInteger(sender.frameId)||sender.frameId<=0||sender.url!==api.runtime.getURL('ui/prompt-surface.html')+'#next-'+r.nonce)fail();
  const g=this.groups.get(sender.tab.id);if(!g)fail();const c=r.command;
  // Dismissal removes only the bound capsule; a stale Family must not trap it.
  // Authorization, current reply, document and nonce checks remain mandatory.
  const dismiss=c?.type==='hide'&&own(c,['type']);
  const {tab,live}=await this.assertCurrent(g,{requireFamily:!dismiss});
  this.#assertAdmission(admission);if(live.nonce!==r.nonce)fail();
  if(c?.type==='get'&&own(c,['type'])){await this.resolveFamily(g);this.#assertAdmission(admission);return {id:g.id,type:g.type,sourceType:g.sourceType,condition:g.condition,choices:g.choices.map(x=>({...x,attempted:g.attempted.has(x.id)})),dark:live.dark};}
  if(c?.type==='hide'&&own(c,['type'])){await api.tabs.sendMessage(tab.id,{type:'PAIA_PROMPT_NEXT_HIDE',nonce:r.nonce},{documentId:g.documentId});return {};}
  if(c?.type==='resize'&&own(c,['type','height'])&&Number.isFinite(c.height)&&c.height>=44&&c.height<=400){await api.tabs.sendMessage(tab.id,{type:'PAIA_PROMPT_NEXT_RESIZE',nonce:r.nonce,height:c.height},{documentId:g.documentId});return {};}
  if(c?.type==='copy'&&own(c,['type','id'])){const choice=g.choices.find(x=>x.id===c.id);if(!choice||!['failed','uncertain'].includes(g.outcomes.get(choice.id)))fail();await this.resolveFamily(g);this.#assertAdmission(admission);return {text:choice.text};}
  if(c?.type!=='insert'||!own(c,['type','id','operationId'])||!uuid(c.operationId))fail();
  const choice=g.choices.find(x=>x.id===c.id);if(!choice||g.attempted.has(choice.id)||!quickPromptEligible(choice.text))fail();
  g.attempted.add(choice.id);
  const pending={operationId:c.operationId,choiceId:choice.id,checked:false};this.#insertions.set(g,pending);
  let result;
  try{
   await this.resolveFamily(g);
   result=await this.#dispatchInsertion(tab,g,choice,c.operationId,admission);
  }catch{result={status:'uncertain'};}finally{if(this.#insertions.get(g)===pending)this.#insertions.delete(g);}
  const status=result?.status==='inserted'&&result.verified===true?'inserted':result?.status==='failed'?'failed':'uncertain';g.outcomes.set(choice.id,status);this.retireConsumed(g,status);return {status,verified:status==='inserted'};
 }
 async card(command,tab,options={}){const admission=this.#admit(tab.id);return this.#track(this.#card(command,tab,options,admission),admission);}
 async #card(command,tab,{assertCurrent:originalCurrent=async()=>{}},admission){
  const assertCurrent=async()=>{this.#assertAdmission(admission);await originalCurrent();this.#assertAdmission(admission);};
  if(['next_current','next_result','next_insert'].includes(command?.type)){
   const keys=command.type==='next_current'?['type']:command.type==='next_result'?['type','id']:['type','id','operationId','conditionPresented'];if(!own(command,keys)||Object.keys(command).length!==keys.length)fail();
   await assertCurrent();const g=this.groups.get(tab.id);if(!g||g.retired){if(command.type==='next_current')return {result:null};fail();}await this.resolveFamily(g);await assertCurrent();
   const choice=command.type==='next_current'?g.choices.find(x=>!g.attempted.has(x.id)&&quickPromptEligible(x.text)):g.choices.find(x=>x.id===command.id);
   if(!choice||g.condition||!quickPromptEligible(choice.text)){if(command.type==='next_current')return {result:null};fail();}
   const result={id:choice.id,kind:'SUGGESTION',text:choice.text,condition:''};if(command.type==='next_current')return {result};if(command.type==='next_result')return result;
   if(!uuid(command.operationId)||command.conditionPresented!==true||g.attempted.has(choice.id))fail();
   g.attempted.add(choice.id);const pending={operationId:command.operationId,choiceId:choice.id,checked:false};this.#insertions.set(g,pending);let response;try{await this.resolveFamily(g);await assertCurrent();response=await this.#dispatchInsertion(tab,g,choice,command.operationId,admission);}catch{response={status:'uncertain'};}finally{if(this.#insertions.get(g)===pending)this.#insertions.delete(g);}
   const status=response?.status==='inserted'&&response.verified===true?'inserted':response?.status==='failed'?'failed':'uncertain';g.outcomes.set(choice.id,status);this.retireConsumed(g,status);return {status,verified:status==='inserted'};
  }
  if(command?.type==='next_available'&&own(command,['type'])){
   const g=this.groups.get(tab.id);if(!g||g.retired)return {available:false};try{await this.assertCurrent(g);this.#assertAdmission(admission);return {available:true};}catch{if(this.groups.get(tab.id)===g)this.groups.delete(tab.id);return {available:false};}
  }
  if(command?.type==='next_reopen'&&own(command,['type'])){
   const g=this.groups.get(tab.id);if(!g||g.retired)fail();await this.assertCurrent(g);this.#assertAdmission(admission);
   if(!await this.surface.isIdle(tab.id))fail();
   // The idle probe yields: authorization or the current reply may change.
   this.#assertAdmission(admission);await this.resolveFamily(g);this.#assertAdmission(admission);
   return this.api.tabs.sendMessage(tab.id,{type:'PAIA_PROMPT_NEXT_REOPEN',id:g.id},{documentId:g.documentId});
  }
  fail();
 }

 // Both original insertion consumers share the same dispatch boundary. The
 // bounded UI response is not the original transport's settlement: retain that
 // promise independently, and never turn a late response into a replay or proof.
 async #dispatchInsertion(tab,g,choice,operationId,admission){
  this.#assertAdmission(admission);let timer,proved=false;
  try{
   const sent=this.#track(this.api.tabs.sendMessage(tab.id,{type:'PAIA_PROMPT_NEXT_INSERT',id:g.id,text:choice.text,sourceType:g.sourceType,operationId,choiceId:choice.id,binding:g.binding,authorization:g.authorization},{documentId:g.documentId}));
   const result=await Promise.race([sent,new Promise(resolve=>{timer=setTimeout(()=>resolve({status:'uncertain'}),2000);})]);
   proved=result?.status==='failed'||result?.status==='inserted'&&result.verified===true;return result;
  }finally{clearTimeout(timer);if(!proved)this.#insertionUnknown=true;}
 }
 // Instance-local source-task proof only. No cold insertion journal or host
 // freeze acknowledgement exists here; this token cannot authorize global
 // selection. Clearing groups, release, a later success, or a fresh instance
 // never supplies those separate facts. UNKNOWN is sticky and constant-space.
 #held(hold){const store=this.service?.s;return this.#selectionHold===hold&&hold.valid&&!this.#disposed&&hold.admission===this.#admission&&hold.service===this.service&&hold.store===store&&hold.repository===store.repository&&hold.database===store.repository?.db&&hold.databaseId===store.databaseId&&hold.api===this.api&&hold.surface===this.surface;}
 async #drain(hold){for(;;){if(!this.#held(hold))fail();const tasks=[...this.#tasks];if(!tasks.length)return;await Promise.allSettled(tasks);}}
 async #sourceSnapshot(){return this.#track(this.#readSourceSnapshot());}
 async #readSourceSnapshot(){
  const store=this.service.s;if(!store.repository?.db)fail();
  const preference=this.api.storage.local?(await this.api.storage.local.get(NEXT_AUTH_KEY))[NEXT_AUTH_KEY]??null:null;
  const source=await store.repository.transaction(false,async t=>({epoch:(await t.get('meta','recovery-restore-epoch'))??null,gate:(await t.get('meta','gate'))??null,generation:(await t.get('meta','backup-data-generation'))??null}),['meta']);
  return {preference,source,serial:this.serial,changing:this.changing};
 }
 async holdForApplicationSelection(){
  this.#admit();const store=this.service.s;if(!store.repository?.db)fail();
  const token=Object.freeze(Object.create(null)),hold={token,valid:true,admission:++this.#admission,service:this.service,store,repository:store.repository,database:store.repository.db,databaseId:store.databaseId,api:this.api,surface:this.surface,ready:false,snapshot:null};this.#selectionHold=hold;this.#authorizationEpoch++;this.groups.clear();this.offers.clear();let timer;
  const acquire=async()=>{await this.#drain(hold);if(this.#insertionUnknown)fail('OUTCOME_UNKNOWN');hold.snapshot=await this.#sourceSnapshot();if(!this.#held(hold)||this.#tasks.size||this.changing)fail();hold.ready=true;return token;};
  try{return await Promise.race([acquire(),new Promise((_,reject)=>{timer=setTimeout(()=>{hold.valid=false;reject(new ArchiveError('OUTCOME_UNKNOWN'));},30000);})]);}
  catch(error){hold.valid=false;if(this.#selectionHold===hold)this.#selectionHold=null;throw error;}finally{clearTimeout(timer);}
 }
 applicationSelectionHeld(token){const hold=this.#selectionHold;return !!hold&&hold.token===token&&hold.ready&&this.#held(hold)&&!this.#tasks.size&&!this.#insertionUnknown&&!this.changing;}
 async fenceApplicationSelection(token){if(!this.applicationSelectionHeld(token))fail();const hold=this.#selectionHold;try{if(!same(await this.#sourceSnapshot(),hold.snapshot)||!this.applicationSelectionHeld(token))fail();return true;}catch(error){hold.valid=false;throw error;}}
 releaseApplicationSelection(token){const hold=this.#selectionHold;if(hold?.token!==token)return false;hold.valid=false;this.#selectionHold=null;return true;}
 dispose(){this.#disposed=true;this.#restrict();this.groups.clear();this.offers.clear();}
}
