import {AIUsageFoundation} from './foundation.js';
import {canonical,digest,equal,exact,fail,validateCoverage,localProviderDescriptor} from './contracts.js';
import {KNOWN_PREFIX} from './delta.js';
import {queryPromptHistory,readPromptHistoryInTransaction} from '../prompt-selection.js';
import {findInputPage} from '../../ui/input-search.js';
import {readPromptPreferences} from '../prompt-reuse-preferences.js';
import {requireConsumerPublicationSettled} from '../browser-native-sync/consumer-publication-state.js';
import {HISTORICAL_LIMITS,historicalCandidateSafe,assembleHistoricalPayload,validateHistoricalResponse} from './historical-candidate-contract.js';
const owned=new WeakMap();
export const requireHistoricalCandidateSession=(session,store)=>{if(owned.get(session)!==store)fail();return session;};
// Constructor-only capabilities. Default production has no provider, authority
// or processing permission. Neither query nor a local tier flag is authority.
export class HistoricalCandidateSession{
 #provider;#permission;#live;#unsubscribe;#manual=null;#states=new Map();#handles=new WeakMap();#deliveries=new WeakMap();#serial=0;#disposed=false;#running=null;#physical=null;#clock;#last=0;
 constructor(store,{provider=null,resolveIntent=null,isCurrentIntent=null,onInvalidate=null,resolveAuthority=null,clock=()=>performance.now(),contractVersion='history-candidates-v1',routeVersion='unavailable'}={}){
  owned.set(this,store);this.#provider=provider;this.#permission=resolveIntent;this.#live=isCurrentIntent;this.#unsubscribe=typeof onInvalidate==='function'?onInvalidate(()=>this.invalidate()):null;this.#clock=clock;this.contractVersion=contractVersion;this.routeVersion=routeVersion;
  this.foundation=new AIUsageFoundation(store,{resolveAuthority,resolveHistoricalIntent:(t,r)=>this.#resolve(t,r),candidateResult:(t,r)=>this.#commit(t,r)});
 }
 bindPromptOwner(read){if(this.#manual||typeof read!=='function')fail();this.#manual=read;}
 available(){return !this.#disposed&&this.#provider!==null&&typeof this.#permission==='function'&&typeof this.#live==='function'&&typeof this.foundation.resolveAuthority==='function'&&this.#manual!==null;}
 #now(){const n=this.#clock();if(!Number.isFinite(n)||n<0||n<this.#last){this.dispose();fail('UNAVAILABLE');}this.#last=n;return n;}
 #valid(s){return !!s&&!this.#disposed&&this.#states.get(s.key)===s&&s.serial===this.#serial&&this.#live(s.permissionScope,s.binding)===true&&this.#now()-s.created<HISTORICAL_LIMITS.ttl;}
 #get(handle){const s=this.#handles.get(handle);if(!this.#valid(s))fail('STALE_BASE');return s;}
 #handle(s,identity,assertCurrent){const existing=s.deliveryHandles.get(identity);if(existing)return existing;let total=0;for(const state of this.#states.values())total+=state.deliveryHandles.size;if(total>=HISTORICAL_LIMITS.capacity)fail('RESOURCE_LIMIT');const handle=Object.freeze({});s.deliveryHandles.set(identity,handle);this.#handles.set(handle,s);this.#deliveries.set(handle,assertCurrent);return handle;}
 async #permit(t,scope){
  if(!this.available())fail('UNAVAILABLE');const out=await this.#permission(t,structuredClone(scope));
  exact(out,['allowed','remoteProcessing','entitlement','serviceAvailable','consentEpoch','permissionEpoch','scope']);
  if(out.allowed!==true||out.remoteProcessing!==true||out.entitlement!=='pro'||out.serviceAvailable!==true||!equal(out.scope,scope)||!['consentEpoch','permissionEpoch'].every(k=>typeof out[k]==='string'&&/^[a-zA-Z0-9:_-]{1,128}$/.test(out[k])))fail('UNAVAILABLE');return out;
 }
 async #current(t,s){
  if(!this.#valid(s))fail('STALE_BASE');await requireConsumerPublicationSettled(t);
  if(!equal(await readPromptPreferences(t),s.preferences)||((await t.get('meta','backup-data-generation'))?.value??0)!==s.generation)fail('STALE_BASE');
  const permit=await this.#permit(t,s.permissionScope);if(permit.consentEpoch!==s.binding.consentEpoch||permit.permissionEpoch!==s.binding.permissionEpoch)fail('STALE_BASE');
  for(const selected of s.selected){const input=await readPromptHistoryInTransaction(this.foundation.s,t,selected.ref);if(input.body!==selected.text)fail('STALE_BASE');}
  if(!this.#valid(s))fail('STALE_BASE');
 }
 async #resolve(t,{binding,scope}){
  const s=this.#states.get(binding.evaluationKey);if(!s||!equal(binding,s.binding)||!equal(scope,{evidenceKeys:s.items.map(x=>x.key).sort(),coverage:s.coverage,candidateObligation:s.obligation}))fail('STALE_BASE');
  await this.#current(t,s);return {allowed:true,remoteProcessing:true,binding:structuredClone(binding),scope:structuredClone(scope)};
 }
 async #retire(){
  const idle=[...this.#states.values()].filter(s=>!s.planning&&!s.running&&this.#physical!==s);
  for(const s of idle){for(const [identity,handle]of s.deliveryHandles){const guard=this.#deliveries.get(handle);if(!guard)continue;try{if(await guard()===false)fail('FORBIDDEN');}catch(error){if(!['FORBIDDEN','CONSENT_REQUIRED','UNAVAILABLE','STALE_BASE'].includes(error.code))throw error;s.deliveryHandles.delete(identity);this.#handles.delete(handle);this.#deliveries.delete(handle);}}let stale=!s.deliveryHandles.size||!this.#valid(s);if(!stale)try{await this.foundation.read(t=>this.#current(t,s));}catch(e){if(!['STALE_BASE','MEMORY_STALE','UNAVAILABLE','CANCELLED'].includes(e.code))throw e;stale=true;}
   if(stale&&!s.planning&&!s.running&&this.#states.get(s.key)===s){this.#states.delete(s.key);for(const handle of s.deliveryHandles.values()){this.#handles.delete(handle);this.#deliveries.delete(handle);}s.deliveryHandles.clear();s.payload=null;s.selected=null;s.validated=null;s.published=null;}
  }
 }
 async prepare({query}={}, {identity=null,assertCurrent=null}={}){
  if(!this.available())fail('UNAVAILABLE');if(!(await this.foundation.s.status()).consented)fail('UNAVAILABLE');if(typeof query!=='string'||!query.trim()||query.length>1000)fail();
  if(identity!==null&&(typeof identity!=='string'||identity.length>1000)||assertCurrent!==null&&typeof assertCurrent!=='function')fail();
  if(assertCurrent&&await assertCurrent()===false)fail('FORBIDDEN');const serial=this.#serial;await this.#retire();
  const manual=await this.#manual(),page=await findInputPage({query,cursor:null,ranked:true,qualified:true,read:({query,cursor,searchSnapshot})=>queryPromptHistory(this.foundation.s,{query,cursor,searchSnapshot})});if(page.changed||page.restarted||page.restartRequired)fail('STALE_BASE');
  const blocked=new Set(manual.families.filter(x=>x.hidden||x.edited||x.pinned||x.retained).flatMap(x=>x.members));
  const eligible=new Map(manual.inputs.map(x=>[x.id,x.text]));
  const selected=page.items.filter(x=>eligible.get(x.id)===x.text&&!blocked.has(x.id)&&historicalCandidateSafe(x.text)).slice(0,HISTORICAL_LIMITS.candidates).map(x=>({ref:structuredClone(x.ref),text:x.text}));
  if(!selected.length)fail('UNAVAILABLE');if(manual.generation!==page.searchSnapshot.generation)fail('STALE_BASE');
  const payload=assembleHistoricalPayload(query,selected),intentDigest=await digest({query,refs:selected.map(x=>x.ref),preferences:manual.preferences,contractVersion:this.contractVersion,routeVersion:this.routeVersion});
  const items=await this.foundation.read(async t=>{const out=[];for(const x of selected){const input=await readPromptHistoryInTransaction(this.foundation.s,t,x.ref),key=JSON.stringify(['input',x.ref.id]),known=await t.get('meta',KNOWN_PREFIX+key);if(input.body!==x.text||!known||known.descriptor.removed||known.descriptor.revision!==x.ref.contentRevision)fail('STALE_BASE');out.push({key,signature:known.signature,descriptor:known.descriptor});}return out;});
  const permissionScope={purpose:'historical-candidates',intentDigest,evidenceKeys:items.map(x=>x.key).sort()},permit=await this.foundation.read(t=>this.#permit(t,permissionScope));
  const key=await digest({intentDigest,items:items.map(x=>({key:x.key,signature:x.signature})),consentEpoch:permit.consentEpoch,permissionEpoch:permit.permissionEpoch});
  if(serial!==this.#serial||this.#disposed)fail('STALE_BASE');const old=this.#states.get(key);if(old){await old.ready;await this.#qualified(old,assertCurrent);return this.#handle(old,identity,assertCurrent);}
  await this.#retire();if(serial!==this.#serial||this.#disposed)fail('STALE_BASE');const concurrent=this.#states.get(key);if(concurrent){await concurrent.ready;await this.#qualified(concurrent,assertCurrent);return this.#handle(concurrent,identity,assertCurrent);}if(this.#states.size>=HISTORICAL_LIMITS.capacity)fail('RESOURCE_LIMIT');
  const binding={version:1,evaluationKey:key,consentEpoch:permit.consentEpoch,permissionEpoch:permit.permissionEpoch},obligation={version:1,evaluationKey:key},coverage=validateCoverage(items.map(x=>({key:x.key,facet:'assist',scope:key})),'AI_ASSIST');
  const s={key,deliveryHandles:new Map(),binding,obligation,coverage,items,preferences:structuredClone(manual.preferences),generation:manual.generation,permissionScope,payload,selected,serial,created:this.#now(),planning:true,running:null,job:null,validated:null,published:null};this.#states.set(key,s);let handle;
  try{handle=this.#handle(s,identity,assertCurrent);s.ready=this.foundation.plan({type:'AI_ASSIST',intent:'explicit',items,coverage,historicalIntent:binding,candidateObligation:obligation,contractVersion:this.contractVersion,routeVersion:this.routeVersion}).then(job=>{s.job=job;});await s.ready;await this.#qualified(s,assertCurrent);return handle;}catch(e){this.#states.delete(key);for(const h of s.deliveryHandles.values()){this.#handles.delete(h);this.#deliveries.delete(h);}throw e;}finally{s.planning=false;}
 }
 async #qualified(s,assertCurrent=null){const current=t=>this.#current(t,s).then(async()=>{if(s.job)await this.foundation.current(t,await this.foundation.job(t,s.job.id));});if(assertCurrent&&await assertCurrent()===false)fail('FORBIDDEN');await this.foundation.read(current);if(assertCurrent){if(await assertCurrent()===false)fail('FORBIDDEN');await this.foundation.read(current);}}
 async #commit(t,r){
  const s=[...this.#states.values()].find(s=>s.job?.id===r.logicalJobId);if(!s?.validated||s.validated.childId!==r.childOperationId||s.validated.receipt!==r.operationReceiptId||!equal(s.obligation,r.candidateObligation))fail('STALE_BASE');await this.#current(t,s);
  return {committed:true,outcome:s.validated.value.kind,isCurrent:()=>this.#valid(s)&&!!s.validated};
 }
 run(handle){const s=this.#get(handle);if(s.running)return s.running.then(()=>this.read(handle));if(this.#physical===s)fail('OUTCOME_UNKNOWN');if(this.#running||this.#physical)fail('REQUEST_ALREADY_IN_FLIGHT');const task=this.#run(s,handle,this.#deliveries.get(handle));s.running=task;this.#running=s;return task.finally(()=>{if(s.running===task)s.running=null;if(this.#running===s)this.#running=null;});}
 async #run(s,handle,assertCurrent){
  await this.#qualified(s,assertCurrent);if(s.published)return this.read(handle);const status=await this.foundation.status(s.job.id);if(status.state==='COMMITTED'&&!s.validated)fail('UNAVAILABLE');
  if(status.state!=='COMMITTED'){
   const descriptor=localProviderDescriptor(this.#provider);await this.foundation.reserve(s.job.id,{reservationId:'private-history:'+s.key,executionKind:descriptor.executionKind});const childId=s.job.childIds[0];
   s.controller=new AbortController();await this.foundation.dispatch(s.job.id,childId,{describe:()=>descriptor,execute:async(usage,{signal})=>{await this.#qualified(s,assertCurrent);if(signal.aborted)fail('CANCELLED');this.#physical=s;try{const raw=await this.#provider.execute({...structuredClone(s.payload),usage},{signal});if(signal.aborted||!this.#valid(s))fail('STALE_BASE');const value=validateHistoricalResponse(raw,new Set(s.selected.map(x=>x.ref.id)));s.validated={childId,receipt:'history:'+childId,value};return {accepted:true,operationReceiptId:s.validated.receipt};}finally{if(this.#physical===s)this.#physical=null;}}},{signal:s.controller.signal,timeoutMs:this.foundation.s.organizerBudget.limits.timeoutMs});
   if(!s.validated)fail('OUTCOME_UNKNOWN');await this.#qualified(s,assertCurrent);await this.foundation.commitHistoricalCandidates(s.job.id);
  }
  const current=await this.foundation.status(s.job.id);await this.#qualified(s,assertCurrent);if(current.state!=='COMMITTED'||current.attempts.length!==1||current.attempts[0].state!=='COMMITTED'||current.attempts[0].attemptCount!==1||!s.validated)fail('STALE_BASE');s.published=s.validated.value;return this.read(handle);
 }
 async read(handle){const s=this.#get(handle);await this.#qualified(s,this.#deliveries.get(handle));if(!s.published)fail('UNAVAILABLE');return s.published.kind==='DEFER'?structuredClone(s.published):{version:1,kind:'CANDIDATES',refs:s.published.ids.map(id=>structuredClone(s.selected.find(x=>x.ref.id===id).ref))};}
 invalidate(){this.#serial++;for(const s of this.#states.values()){s.controller?.abort();s.published=null;s.validated=null;s.payload=null;}this.#handles=new WeakMap();this.#deliveries=new WeakMap();}
 dispose(){this.#disposed=true;this.#unsubscribe?.();this.invalidate();}
}
