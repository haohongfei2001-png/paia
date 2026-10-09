import {AIUsageFoundation} from './foundation.js';
import {exact,equal,canonical,fail,localProviderDescriptor} from './contracts.js';
import {KNOWN_PREFIX} from './delta.js';
import {readContextCards} from '../context-cards.js';
import {ASSIST_LIMITS,assembleAssistPayload,assertAssistPayload,validateAssistResponse} from './assist-response.js';
// No production instance exists. Constructor capabilities are trusted host
// dependencies, never worker DTOs. Reply/result bytes never enter storage.
export class LocalAssistSession {
 #lease;#provider;#selector;#states=new Map();#handles=new WeakMap();#disposed=false;#generation=0;#clock;#last=0;#unsubscribe;
 constructor(store,{lease,provider=null,resolveAuthority=null,contextSelector=()=>[],contractVersion='assist-local-v1',routeVersion='unavailable',clock=()=>performance.now()}={}){
  this.#lease=lease;this.#unsubscribe=lease.onInvalidate(()=>this.#invalidate());this.#provider=provider;this.#selector=contextSelector;this.#clock=clock;this.contractVersion=contractVersion;this.routeVersion=routeVersion;
  this.foundation=new AIUsageFoundation(store,{resolveAuthority,resolveAssistIntent:(t,r)=>this.#resolve(t,r),assistResult:(t,r)=>this.#commit(t,r)});
 }
 #now(){const n=this.#clock();if(!Number.isFinite(n)||n<0||n<this.#last){this.dispose();fail('UNAVAILABLE');}this.#last=n;return n;}
 #invalidate(){this.#generation++;for(const s of this.#states.values()){s.published=null;s.validated=null;s.snapshot=null;s.payload=null;}this.#states.clear();this.#handles=new WeakMap();}
 #valid(s){return !!s&&!this.#disposed&&s.generation===this.#generation&&this.#states.get(s.key)===s&&this.#now()-s.created<ASSIST_LIMITS.ttl&&this.#lease.isCurrent(s.lease)===true;}
 #get(handle){const s=this.#handles.get(handle);if(!this.#valid(s))fail('STALE_BASE');return s;}
 // Retire only unusable, idle private memory; durable jobs/attempts remain the
 // no-redispatch authority. A planning or running operation owns its slot.
 async #retireInvalid(){
  const idle=[...this.#states.values()].filter(s=>!s.planning&&!s.running);if(!idle.length)return;
  const retired=await this.foundation.read(async t=>{const out=[];for(const s of idle){
   if(s.planning||s.running||this.#states.get(s.key)!==s)continue;
   if(!this.#valid(s)){out.push(s);continue;}
   const row=await t.get('organizerJobs',s.job.id);if(!row){out.push(s);continue;}
   try{await this.foundation.current(t,await this.foundation.job(t,s.job.id));}
   catch(error){if(!['STALE_BASE','UNAVAILABLE','CANCELLED'].includes(error.code))throw error;out.push(s);}
  }return out;});
  for(const s of retired){if(s.planning||s.running||this.#states.get(s.key)!==s)continue;this.#states.delete(s.key);this.#handles.delete(s.handle);s.published=null;s.validated=null;s.snapshot=null;s.payload=null;s.context=null;}
 }

 async #context(t,ids){
  const cards=await readContextCards(t);if(!Array.isArray(ids)||ids.length>100||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'))fail();
  const items=[],context=[],permissions={global:cards.access.global,cards:{}};
  for(const id of [...ids].sort()){const item=cards.items.find(x=>x.id===id);if(!item||item.lifecycle!=='active'||item.origin!=='manual'||cards.access.global.enabled!==true||cards.access[item.card].enabled!==true)fail('UNAVAILABLE');
   const key=JSON.stringify(['context_item',id]),known=await t.get('meta',KNOWN_PREFIX+key);if(!known||known.descriptor.removed||known.descriptor.revision!==item.revision)fail('STALE_BASE');items.push({key,signature:known.signature,descriptor:known.descriptor});context.push(item.body);permissions.cards[item.card]=cards.access[item.card];}
  return {items,context,permissions};
 }
 async #resolve(t,{binding,scope}){
  const s=[...this.#states.values()].find(x=>equal(x.binding,binding)&&equal(x.obligation,scope.replyObligation));
  if(!this.#valid(s))fail('STALE_BASE');
  if(!equal(scope,{evidenceKeys:s.items.map(i=>i.key).sort(),coverage:s.coverage,replyObligation:s.obligation}))fail('STALE_BASE');
  const current=await this.#context(t,s.contextIds);if(!equal(current,s.context)||!this.#valid(s))fail('STALE_BASE');
  return {allowed:true,remoteProcessing:true,binding:structuredClone(binding),scope:structuredClone(scope)};
 }
 async prepare({lease}={}){
  if(this.#disposed)fail('UNAVAILABLE');await this.#retireInvalid();if(this.#states.size>=8&&![...this.#states.values()].some(s=>s.lease===lease&&this.#valid(s)))fail('RESOURCE_LIMIT');
  const generation=this.#generation,meta=this.#lease.metadata(lease),snapshot=await this.#lease.snapshot(lease);
  const selected=await this.foundation.read(async t=>{const ids=structuredClone(await this.#selector(t,{replyBinding:meta.replyBinding}));return {ids,context:await this.#context(t,ids)};});
  const payload=assembleAssistPayload(snapshot,selected.context.context),key=await this.#lease.evaluationKey(lease,{items:selected.context.items.map(x=>({key:x.key,signature:x.signature})),permissions:selected.context.permissions},this.contractVersion,this.routeVersion);
  if(this.#disposed||generation!==this.#generation||!this.#lease.isCurrent(lease))fail('STALE_BASE');
  const old=this.#states.get(key);if(old){await old.ready;if(!this.#valid(old))fail('STALE_BASE');return old.handle;}
  await this.#retireInvalid();if(this.#disposed||generation!==this.#generation||!this.#lease.isCurrent(lease))fail('STALE_BASE');
  // A same-key preparation may have published while retirement awaited IDB.
  const concurrent=this.#states.get(key);if(concurrent){await concurrent.ready;if(!this.#valid(concurrent))fail('STALE_BASE');return concurrent.handle;}
  if(this.#states.size>=8)fail('RESOURCE_LIMIT');
  const handle=Object.freeze({}),items=selected.context.items,obligation={version:1,evaluationKey:key},coverage=items.map(i=>({key:i.key,facet:'assist',scope:key}));
  const s={key,handle,lease,binding:meta.binding,replyBinding:meta.replyBinding,generation,created:this.#now(),contextIds:selected.ids,context:selected.context,items,coverage,obligation,payload,snapshot,planning:true,job:null,validated:null,published:null,running:null};
  this.#states.set(key,s);this.#handles.set(handle,s);
  try{s.ready=this.foundation.plan({type:'AI_ASSIST',intent:'explicit',items,coverage,replyObligation:obligation,assistIntent:s.binding,contractVersion:this.contractVersion,routeVersion:this.routeVersion}).then(job=>{s.job=job;});await s.ready;if(!this.#valid(s))fail('STALE_BASE');return handle;}catch(e){if(this.#states.get(key)===s)this.#states.delete(key);this.#handles.delete(handle);throw e;}finally{s.planning=false;}
 }
 async #qualified(s){
  if(!this.#valid(s))fail('STALE_BASE');const snapshot=await this.#lease.snapshot(s.lease);if(!equal(snapshot,s.snapshot)||!this.#valid(s))fail('STALE_BASE');
  await this.foundation.read(async t=>{const job=await this.foundation.job(t,s.job.id);await this.foundation.current(t,job);});if(!this.#valid(s))fail('STALE_BASE');
 }
 async #commit(t,r){
  const s=[...this.#states.values()].find(x=>x.job?.id===r.logicalJobId);if(!this.#valid(s)||!s.validated||s.validated.childId!==r.childOperationId||s.validated.receipt!==r.operationReceiptId||!equal(s.obligation,r.replyObligation))fail('STALE_BASE');
  const current=await this.#context(t,s.contextIds);if(!equal(current,s.context)||!this.#valid(s))fail('STALE_BASE');
  return {committed:true,outcome:s.validated.value.kind,isCurrent:()=>this.#valid(s)&&!!s.validated};
 }
 run(handle){const s=this.#get(handle);if(s.running)return s.running;const task=this.#run(s);s.running=task;return task.finally(()=>{if(s.running===task)s.running=null;});}
 async #run(s){
  await this.#qualified(s);if(s.published)return structuredClone(s.published);
  const status=await this.foundation.status(s.job.id);if(status.state==='COMMITTED'&&!s.validated)fail('UNAVAILABLE');
  if(status.state!=='COMMITTED'){
   const descriptor=localProviderDescriptor(this.#provider);await this.foundation.reserve(s.job.id,{reservationId:'private-assist:'+s.key,executionKind:descriptor.executionKind});
   const childId=s.job.childIds[0];await this.foundation.dispatch(s.job.id,childId,{describe:()=>descriptor,execute:async usage=>{
    await this.#qualified(s);const payload={...s.payload,usage};assertAssistPayload(payload);if(!this.#valid(s))fail('STALE_BASE');
    const raw=await this.#provider.execute(structuredClone(payload));if(!this.#valid(s))fail('STALE_BASE');const value=validateAssistResponse(raw);s.validated={childId,receipt:'assist:'+childId,value};return {accepted:true,operationReceiptId:s.validated.receipt};
   }});
   if(!this.#valid(s))fail('STALE_BASE');if(!s.validated)fail('OUTCOME_UNKNOWN');await this.#qualified(s);await this.foundation.commitAssistResult(s.job.id);
  }
  const current=await this.foundation.status(s.job.id);await this.#qualified(s);if(current.state!=='COMMITTED'||current.attempts.length!==1||current.attempts[0].state!=='COMMITTED'||!this.#valid(s)||!s.validated)fail('STALE_BASE');
  s.published=Object.freeze({...s.validated.value});return structuredClone(s.published);
 }
 async result(handle){const s=this.#get(handle);await this.#qualified(s);if(!s.published)fail('UNAVAILABLE');return structuredClone(s.published);}
 async insert(handle,{controller,operationId,conditionPresented=false}={}){const s=this.#get(handle),value=await this.result(handle);if(value.kind!=='SUGGESTION')fail('UNAVAILABLE');if(typeof operationId!=='string'||!operationId||operationId.length>200)fail();return controller.insert({binding:s.replyBinding,text:value.text,condition:value.condition,operationId,conditionPresented,isCurrent:()=>this.#valid(s)&&s.published?.text===value.text});}
 dismiss(handle){const s=this.#handles.get(handle);if(s){s.published=null;s.validated=null;s.snapshot=null;s.payload=null;this.#states.delete(s.key);this.#handles.delete(handle);}}
 dispose(){this.#disposed=true;this.#unsubscribe?.();this.#invalidate();}
}
