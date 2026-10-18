import {AssistConsent,ASSIST_AUTH_KEY,ASSIST_CONSENT_VERSION} from './assist-consent.js';
import {ASSIST_LIMITS} from '../core/ai-usage/assist-response.js';
import {AssistReplyLease} from './assist-reply-lease.js';
import {createConfiguredAssistSession} from '../core/ai-usage/configured-assist-session.js';
import {ArchiveError} from '../core/constants.js';
import {topicRootTarget} from '../core/topic-root-target.js';
import {own,quickPromptEligible} from '../core/prompt-reuse-preferences.js';
const uuid=x=>typeof x==='string'&&/^[a-f0-9-]{36}$/.test(x);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const exact=(r,keys)=>own(r,keys)&&Object.keys(r).length===keys.length;
const fail=(code='FORBIDDEN')=>{throw new ArchiveError(code);};
const presented=(id,value)=>value.kind==='SUGGESTION'?{id,kind:value.kind,text:value.text,condition:value.condition}:{id,kind:value.kind,reason:value.reason};
const hostKey=host=>host.tabId+':'+host.documentId;
// A source-authenticated, prospective completed-reply opportunity owns generation.
// The private R3 surface consumes an already generated result; it never triggers AI.
export class AssistPromptCommands {
 constructor(store,api,{configuration,surface=null}={}){
  this.store=store;this.api=api;this.surface=surface;this.hosts=new Map();this.views=new Map();this.activations=new Map();
  this.consent=new AssistConsent(api,{consented:async()=> (await store.status()).consented===true});
  this.lease=new AssistReplyLease({runtimeId:api.runtime.id,tabs:api.tabs,
   probe:async(host,options)=>{const auth=await this.consent.status(),known=this.hosts.get(hostKey(host));if(!known||!this.consent.isCurrent(auth))fail('STALE_BASE');
    const live=await api.tabs.sendMessage(host.tabId,{type:'PAIA_PROMPT_ASSIST_PROBE',generation:auth.generation,...options},{documentId:host.documentId});
    if(!this.consent.isCurrent(auth)||this.hosts.get(hostKey(host))!==known||live?.generation!==auth.generation)fail('STALE_BASE');known.binding=live.binding??null;known.authorization=auth;return live;
   },current:(host,binding)=>{const known=this.hosts.get(hostKey(host));return !!known&&this.consent.isCurrent(known.authorization)&&equal(known.binding,binding);}
  });
  this.session=createConfiguredAssistSession(store,{lease:this.lease,...(configuration===undefined?{}:{configuration})});
  this.consent.onInvalidate(()=>{this.lease.invalidate();this.views.clear();this.clearActivations();for(const host of this.hosts.values()){host.binding=null;void this.api.tabs.sendMessage(host.sender.tab.id,{type:'PAIA_PROMPT_ASSIST_AUTH_CHANGED'},{documentId:host.sender.documentId}).catch(()=>{});}this.changed();});
  this.storage=(changes,area)=>{if(area==='local'&&changes[ASSIST_AUTH_KEY]){this.consent.invalidate();void this.notifyHosts();}};
  api.storage?.onChanged?.addListener(this.storage);
 }
 clearActivations(){for(const state of this.activations.values())clearTimeout(state.cleanupTimer);this.activations.clear();}
 changed(){void this.api.runtime.sendMessage({type:'PAIA_PROMPT_ASSIST_CHANGED'}).catch(()=>{});}
 // Invalidation only: registered top documents cannot self-assert Context
 // authority. A handled notification retires any in-flight qualification ACK;
 // a future action must still pass the original worker's current Context read.
 async contextChanged(){
  await Promise.allSettled([...this.hosts.values()].map(host=>this.api.tabs.sendMessage(host.sender.tab.id,{type:'PAIA_CONTEXT_CARDS_CHANGED'},{documentId:host.sender.documentId})));
  for(const [identity,state]of [...this.activations]){
   if(!state.handle)continue;
   if(!state.finished){try{await this.session.qualifyCurrentScope(state.handle);continue;}catch{/* A genuinely changed captured scope cancels through the original UNKNOWN boundary. */}state.stopped=true;await this.session?.stop(state.handle).catch(()=>{});if(state.resultId)this.views.delete(state.resultId);await this.announce(state,false);continue;}
   try{await this.session.qualify(state.handle);continue;}catch{/* Only a still-authorized result may be reconsidered for changed selected facts. */}
   if(!this.session.canReevaluateContext(state.handle)){await this.expire(state);continue;}
   if(this.activations.get(identity)!==state)continue;if(state.resultId)this.views.delete(state.resultId);await this.announce(state,false);if(this.activations.get(identity)!==state)continue;clearTimeout(state.cleanupTimer);this.activations.delete(identity);
   const auth=await this.status();if(this.consent.isCurrent(auth))void this.automatic(state.host,auth).catch(()=>{});
  }
  this.changed();
 }
 async notifyHosts(){const tabs=await this.api.tabs.query?.({url:'https://chatgpt.com/*'})??[];await Promise.allSettled(tabs.filter(t=>!t.incognito).map(t=>this.api.tabs.sendMessage(t.id,{type:'PAIA_PROMPT_ASSIST_AUTH_CHANGED'},{frameId:0})));this.changed();}
 async status(){const value=await this.consent.status();this.lease.configure({...value,automatic:true});return {...value,serviceAvailable:this.session?.available===true};}
 async configure(value){await this.consent.configure(value);const result=await this.status();await this.notifyHosts();return result;}
 removeTab(id){for(const [key,host]of this.hosts)if(host.sender.tab.id===id)this.hosts.delete(key);for(const [key,v]of this.views)if(v.host.sender.tab.id===id)this.views.delete(key);this.lease.invalidate();this.clearActivations();this.changed();}
 async top(sender){
  if(sender?.id!==this.api.runtime.id||!Number.isInteger(sender.tab?.id)||sender.tab.incognito||sender.frameId!==0||typeof sender.documentId!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(sender.documentId)||sender.documentLifecycle!=='active')fail();
  let u;try{u=new URL(sender.url);}catch{fail();}if(u.origin!=='https://chatgpt.com'||!/^\/c\/[a-zA-Z0-9_-]+$/.test(u.pathname)||u.search||u.hash)fail();
  const tab=await this.api.tabs.get(sender.tab.id);if(tab.incognito||tab.active!==true||tab.url!==sender.url||!Number.isInteger(tab.windowId)||typeof this.api.windows?.get!=='function')fail();const window=await this.api.windows.get(tab.windowId);if(window?.focused!==true||window.incognito===true)fail();return tab;
 }
 settings(sender){const url=this.api.runtime.getURL('ui/archive.html');return sender?.id===this.api.runtime.id&&!sender.tab?.incognito&&(sender.frameId===undefined||sender.frameId===0)&&(!sender.documentLifecycle||sender.documentLifecycle==='active')&&(sender.url===url||typeof sender.url==='string'&&sender.url.startsWith(url+'#')&&topicRootTarget(sender.url)!==null);}
 async handle(r,sender){
  if(r.type==='PAIA_PROMPT_ASSIST_CONFIGURE'){if(!this.settings(sender)||!exact(r,['type','replyAccess','remoteProcessing','expectedGeneration','consentVersion'])||r.consentVersion!==ASSIST_CONSENT_VERSION||typeof r.expectedGeneration!=='string')fail();await this.status();return this.configure({replyAccess:r.replyAccess,remoteProcessing:r.remoteProcessing,expectedGeneration:r.expectedGeneration});}
  if(r.type==='PAIA_PROMPT_ASSIST_STATUS'){
   if(!exact(r,['type']))fail();if(!this.settings(sender)){await this.top(sender);const key=hostKey({tabId:sender.tab.id,documentId:sender.documentId}),old=this.hosts.get(key);if(!old||old.sender.url!==sender.url){if(old)this.removeTab(sender.tab.id);for(const [other,value]of this.hosts)if(value.sender.tab.id===sender.tab.id)this.hosts.delete(other);if(this.hosts.size>=8)fail('RESOURCE_LIMIT');this.hosts.set(key,{sender:structuredClone(sender),binding:null,authorization:null});}}
   return this.status();
  }
  await this.top(sender);const host=this.hosts.get(hostKey({tabId:sender.tab.id,documentId:sender.documentId}));if(!host)fail();
  if(r.type==='PAIA_PROMPT_ASSIST_READY'){if(!exact(r,['type','generation']))fail();const auth=await this.status();if(!this.consent.isCurrent(auth)||r.generation!==auth.generation)fail('STALE_BASE');return this.automatic(host,auth);}
  if(r.type==='PAIA_PROMPT_ASSIST_INVALIDATE'){
   if(!exact(r,['type','generation']))fail();if(host.authorization?.generation===r.generation){host.binding=null;this.lease.invalidate();this.views.clear();this.clearActivations();this.changed();}return {};
  }
  if(r.type==='PAIA_PROMPT_ASSIST_QUALIFY'){
   if(!exact(r,['type','id','operationId','generation'])||!uuid(r.id)||!uuid(r.operationId))fail();const view=this.views.get(r.id),auth=await this.status();
   if(!view||view.host!==host||view.inserting!==r.operationId||r.generation!==auth.generation||!this.consent.isCurrent(auth))fail('STALE_BASE');
   await view.assertCurrent();await this.session.qualify(view.handle);if(!this.consent.isCurrent(auth)||this.views.get(r.id)!==view)fail('STALE_BASE');return {qualified:true,generation:auth.generation};
  }
  fail();
 }
 async announce(state,available){
  if(this.activations.get(state.identity)!==state)return;
  try{await this.api.tabs.sendMessage(state.host.sender.tab.id,{type:'PAIA_PROMPT_ASSIST_SUGGESTION_READY',generation:state.authorization,binding:state.replyBinding,available},{documentId:state.host.sender.documentId});}catch{/* A closed document cannot consume the retained result. */}this.changed();
 }
 async automatic(host,auth){
  if(!auth.serviceAvailable||!this.session)return {available:false};
  const cap=await this.lease.observe(host.sender),meta=this.lease.metadata(cap),identity=hostKey(meta.host),key=JSON.stringify([auth.generation,meta.replyBinding]);
  const prior=this.activations.get(identity);
  if(prior?.key===key){if(prior.task)return prior.task;if(prior.finished&&prior.handle){await this.session.run(prior.handle);return {available:!!prior.resultId&&this.views.has(prior.resultId)};}if(prior.handle&&this.session.canResumeRetained(prior.handle))return prior.execute();if(prior.error)throw prior.error;return {available:false};}
  if(prior){clearTimeout(prior.cleanupTimer);prior.stopped=true;if(prior.handle&&!prior.finished)await this.session.stop(prior.handle).catch(()=>{});if(prior.handle)this.session.dismiss(prior.handle);if(prior.resultId)this.views.delete(prior.resultId);}
  const state={key,host,identity,authorization:auth.generation,replyBinding:structuredClone(meta.replyBinding),handle:null,finished:false,stopped:false,resultId:null,task:null};this.activations.set(identity,state);
  // Idle cleanup is supplemental only. Every use retains the original synchronous
  // monotonic lease and selected-scope checks; this timer never grants or renews.
  state.cleanupTimer=setTimeout(()=>{void this.expire(state);},ASSIST_LIMITS.ttl);state.cleanupTimer.unref?.();
  const current=async()=>{await this.top(host.sender);if(state.stopped||this.activations.get(identity)!==state||!this.consent.isCurrent(auth)||!this.lease.isCurrent(cap))fail('STALE_BASE');};
  state.execute=()=>{state.task=(async()=>{try{
   await current();state.handle??=await this.session.prepare({lease:cap,assertCurrent:current});await current();
   const value=await this.session.run(state.handle);state.finished=true;await current();await this.session.qualify(state.handle);await current();
   for(const [id,v]of this.views)if(v.host===host)this.views.delete(id);if(this.views.size>=8)fail('RESOURCE_LIMIT');
   const id=crypto.randomUUID();state.resultId=id;this.views.set(id,{id,identity,host,state,handle:state.handle,assertCurrent:current,attempted:false,inserting:null});const available=value.kind==='SUGGESTION';await this.announce(state,available);return {available};
  }catch(error){state.error=error;await this.announce(state,false);throw error;}finally{state.task=null;}})();return state.task;};
  return state.execute();
 }
 async expire(state){
  if(this.activations.get(state.identity)!==state)return;
  state.stopped=true;state.error=new ArchiveError('STALE_BASE');clearTimeout(state.cleanupTimer);
  if(state.resultId)this.views.delete(state.resultId);await this.announce(state,false);
  if(state.handle&&!state.finished)await this.session.stop(state.handle).catch(()=>{});
  if(state.handle)this.session.dismiss(state.handle);state.handle=null;state.finished=false;
 }
 async cancelTab(tabId){for(const [identity,state]of this.activations)if(state.host?.sender.tab.id===tabId)await this.cancel(identity);for(const [id,view]of this.views)if(view.host.sender.tab.id===tabId)this.views.delete(id);}
 async cancel(identity){const state=this.activations.get(identity);if(state){state.stopped=true;if(state.handle&&!state.finished)try{await this.session.stop(state.handle);}catch{/* Original UNKNOWN is retained. */}}for(const [id,v]of this.views)if(v.identity===identity)this.views.delete(id);return {cancelled:true};}
 async card(command,tab,{identity,assertCurrent}){
  const c=command,fields={assist_status:['type'],assist_current:['type'],assist_activate:['type'],assist_cancel:['type'],assist_result:['type','id'],assist_insert:['type','id','operationId','conditionPresented'],assist_dismiss:['type','id']}[c?.type];
  if(!fields||!exact(c,fields)||fields.includes('id')&&!uuid(c.id))fail();await assertCurrent();const auth=await this.status();
  const host=[...this.hosts.values()].find(h=>h.sender.tab.id===tab.id&&h.sender.url===tab.url);
  if(c.type==='assist_status'){let ready=false;if(host&&this.consent.isCurrent(auth))try{await this.lease.observe(host.sender);ready=true;}catch{/* Metadata-only readiness remains unavailable. */}await assertCurrent();return {available:auth.serviceAvailable,enabled:auth.replyAccess&&auth.remoteProcessing,ready:ready&&this.consent.isCurrent(auth)};}
  if(c.type==='assist_cancel')return host?this.cancel(hostKey({tabId:host.sender.tab.id,documentId:host.sender.documentId})): {cancelled:true};
  if(c.type==='assist_dismiss'){const v=this.views.get(c.id);if(v&&v.host===host)this.views.delete(c.id);return {dismissed:true};}
  if(!auth.serviceAvailable)fail('AI_SERVICE_UNAVAILABLE');if(!this.consent.isCurrent(auth)||!host)fail('UNAVAILABLE');
  if(c.type==='assist_activate')fail('FORBIDDEN');
  if(c.type==='assist_current'){const view=[...this.views.values()].find(v=>v.host===host);if(!view)return {result:null};try{const value=await this.session.result(view.handle);await assertCurrent();return {result:presented(view.id,value)};}catch{this.views.delete(view.id);await this.announce(view.state,false);return {result:null};}}

  const view=this.views.get(c.id);if(!view||view.host!==host)fail('STALE_BASE');view.assertCurrent=assertCurrent;await assertCurrent();const result=await this.session.result(view.handle);
  if(c.type==='assist_result')return presented(view.id,result);
  if(!uuid(c.operationId)||typeof c.conditionPresented!=='boolean'||view.attempted||result.kind!=='SUGGESTION'||result.condition&&!c.conditionPresented)fail('STALE_BASE');
  view.attempted=true;view.inserting=c.operationId;let timer;
  try{
   const response=await this.session.insert(view.handle,{operationId:c.operationId,conditionPresented:c.conditionPresented,controller:{insert:async payload=>{
    await payload.qualify();await assertCurrent();if(!this.consent.isCurrent(auth)||this.views.get(c.id)!==view)fail('STALE_BASE');
    return Promise.race([this.api.tabs.sendMessage(tab.id,{type:'PAIA_PROMPT_ASSIST_INSERT',id:view.id,generation:auth.generation,binding:payload.binding,text:payload.text,condition:payload.condition,conditionPresented:c.conditionPresented,operationId:c.operationId},{documentId:host.sender.documentId}),new Promise(resolve=>{timer=setTimeout(()=>resolve({status:'uncertain'}),2000);})]);
   }}});
   const status=response?.status==='inserted'&&response.verified===true?'inserted':response?.status==='failed'?'failed':'uncertain';return {status,verified:status==='inserted'};
  }catch{return {status:'uncertain',verified:false};}finally{clearTimeout(timer);view.inserting=null;}
 }
 dispose(){this.api.storage?.onChanged?.removeListener(this.storage);this.consent.dispose();this.session?.dispose();this.lease.dispose();this.hosts.clear();this.views.clear();this.clearActivations();}
}
