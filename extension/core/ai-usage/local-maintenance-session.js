import {AIUsageFoundation} from './foundation.js';
import {readMaintenanceBatch} from './maintenance-batch.js';
import {canonical,digest,equal,exact,fail,opaque,unitKey,validateCoverage,localProviderDescriptor} from './contracts.js';
import {TopicFormationService} from '../topic-formation.js';
import {ContextMaintenanceService,validateContextMaintenanceChange} from '../context-maintenance.js';

const TYPE='AI_MAINTENANCE';
const outcome=(state,extra={})=>({state,dispatchAllowed:false,financialAuthority:false,...extra});
const reasons=new Set(['UNAVAILABLE','BUDGET_EXCEEDED','CANCELLED','STALE_BASE','OUTCOME_UNKNOWN','INVALID_REQUEST','CONTEXT_INVALIDATED','CONTEXT_LIMIT','STORAGE_FAILED','STORAGE_FULL','CONSENT_REQUIRED','REQUEST_ALREADY_IN_FLIGHT','DOMAIN_REPLAY_UNACKNOWLEDGED']);
const safeError=e=>reasons.has(e?.code)?e.code:'UNAVAILABLE';
const syncTrue=value=>{if(value===true)return;Promise.resolve(value).catch(()=>{});fail('UNAVAILABLE');};

// Bounded own-data response capture at the actual provider return. No getters,
// SharedArrayBuffer, functions, prototypes or mutable caller aliases survive.
function responseSnapshot(value,maxBytes){
 let size=0,keys=0;const encoder=new TextEncoder(),seen=new WeakSet();
 const charge=n=>{size+=n;if(size>maxBytes)fail('INVALID_REQUEST');};
 const string=x=>{if(x.length>maxBytes)fail('INVALID_REQUEST');charge(encoder.encode(JSON.stringify(x)).length);return x;};
 const visit=(x,depth)=>{
  if(depth>16)fail('INVALID_REQUEST');
  if(x===null||typeof x==='boolean'){charge(5);return x;}if(typeof x==='string')return string(x);
  if(typeof x==='number'&&Number.isFinite(x)){charge(24);return x;}
  if(!x||typeof x!=='object'||seen.has(x))fail('INVALID_REQUEST');seen.add(x);
  const array=Array.isArray(x);if(!array&&![Object.prototype,null].includes(Object.getPrototypeOf(x)))fail('INVALID_REQUEST');
  const names=Reflect.ownKeys(x);if(names.length>1024-keys||names.some(k=>typeof k!=='string'))fail('INVALID_REQUEST');keys+=names.length;charge(2+names.length);
  let length;if(array){const d=Object.getOwnPropertyDescriptor(x,'length');if(!d||!Object.hasOwn(d,'value')||!Number.isSafeInteger(d.value)||d.value<0||d.value>1024||names.length!==d.value+1||names.some(k=>k!=='length'&&!/^(0|[1-9][0-9]*)$/.test(k)))fail('INVALID_REQUEST');length=d.value;}
  const out=array?[]:Object.create(null);for(const k of names){if(array&&k==='length')continue;const d=Object.getOwnPropertyDescriptor(x,k);if(!d||!d.enumerable||!Object.hasOwn(d,'value')||array&&Number(k)>=length)fail('INVALID_REQUEST');if(!array)string(k);out[k]=visit(d.value,depth+1);}return out;
 };return visit(value,0);
}

// Constructor-private local orchestration; no worker command, scheduler or live
// service is installed. All four missing host capabilities default to denied.
// The host's window owner supplies/consumes an opportunity; the device clock
// never computes Free/Pro windows, entitlement, refill or financial settlement.
export class LocalMaintenanceSession {
 #store;#foundation;#provider;#service;#window;#topic;#context;
 #handles=new WeakMap();#passive=new WeakMap();#jobs=new Map();#preparing=null;#active=null;#running=null;#generation=0;
 constructor(store,{provider=null,service=null,window=null,authority=null}={}){
  this.#store=store;this.#provider=provider;this.#service=service===null?null:{...service,topic:{...service.topic},context:{...service.context},responseAdapter:service.responseAdapter===null?null:{...service.responseAdapter}};this.#window=window;
  this.#foundation=new AIUsageFoundation(store,{resolveAuthority:authority,committers:{topic:(t,r)=>this.#commit(t,r,'topic'),context:(t,r)=>this.#commit(t,r,'context')}});
  if(service!==null){
   exact(service,['version','topic','context','responseAdapter']);if(service.version!==1)fail();
   exact(service.topic,['resolveProcessing','decisionVersion','parameters']);exact(service.context,['processingVerifier','caller']);
   const adapter=service.responseAdapter;if(adapter!==null){exact(adapter,['topic','context']);if(typeof adapter.topic!=='function'||typeof adapter.context!=='function')fail();}
   this.#topic=new TopicFormationService(store,{resolveProcessing:service.topic.resolveProcessing,parameters:service.topic.parameters,decision:adapter===null?null:{version:service.topic.decisionVersion,assess:async view=>{
    const a=this.#active;this.#current(a?.state);if(a?.facet!=='topic')fail('UNAVAILABLE');
    const assessed=await this.#decode(a,'topic',view);this.#current(a.state);
    // Schema/citations still belong to the original formation owner. This adds
    // the exact Input closure necessary before ACKing every selected delta unit.
    const cited=new Set(assessed?.evidence?.map(c=>c.inputId));
    if(!equal([...cited].sort(),view.inputs.map(i=>i.id).sort()))fail('STALE_BASE');return assessed;
   }},writeTransaction:fn=>this.#writeDomain(fn,'topic')});
   this.#context=new ContextMaintenanceService(store,{processingVerifier:service.context.processingVerifier,writeTransaction:fn=>this.#writeDomain(fn,'context')});
  }
 }
 #current(state){
  if(!state||state.generation!==this.#generation||this.#jobs.get(state.job.id)!==state||state.controller.signal.aborted||state.grant.revocationSignal.aborted)fail('UNAVAILABLE');
  if(Object.entries(state.grantBinding).some(([key,value])=>state.grant[key]!==value))fail('UNAVAILABLE');syncTrue(this.#window.isCurrent(state.grant));
 }
 #correlation(a){return {logicalJobId:a.state.job.id,childOperationId:a.childId,operationReceiptId:a.receipt.operationReceiptId};}
 #inputs(state,units){
  const ids=new Set();for(const u of units){const item=state.request.items.find(i=>i.key===u.key);
   // Existing non-Input/human deltas need their own exact domain mapper. Never
   // turn absent canonical lineage into a synthetic Source or successful ACK.
   if(item?.descriptor.kind!=='input'||item.descriptor.inputIds.length!==1||item.descriptor.inputIds[0]!==item.descriptor.entityId)return null;
   ids.add(item.descriptor.entityId);
  }return [...ids].sort();
 }
 async prepare(options){
  const copied=structuredClone(options);exact(copied,['scope','contractVersion','routeVersion','cursor','limit'],['scope','contractVersion','routeVersion']);
  const key=canonical(copied);
  if(this.#preparing){if(this.#preparing.key!==key)fail('REQUEST_ALREADY_IN_FLIGHT');return this.#preparing.promise;}
  const pending={key,promise:null};this.#preparing=pending;
  pending.promise=this.#prepare(copied).finally(()=>{if(this.#preparing===pending)this.#preparing=null;});return pending.promise;
 }
 async #prepare(options){
  const generation=this.#generation,batch=await readMaintenanceBatch(this.#foundation,options);
  if(generation!==this.#generation)fail('UNAVAILABLE');
  if(batch.status!=='CANDIDATE_ONLY'){const handle=Object.freeze(outcome(batch.status,{jobId:null,nextCursor:batch.nextCursor??null,complete:batch.complete??false}));this.#passive.set(handle,{generation,state:batch.status});return handle;}
  if(!this.#service?.responseAdapter||!this.#provider||typeof this.#window?.acquire!=='function'||typeof this.#window?.isCurrent!=='function')fail('UNAVAILABLE');
  const descriptor=localProviderDescriptor(this.#provider),request=batch.request;
  // Reuse the current Topic identity owner's 20-distinct-Source admission
  // boundary. Keep all remaining facets of each Input in the same child.
  // More than two required partitions is unavailable, never lost coverage.
  const partitions=[];let partition=null;
  for(const item of request.items){const units=request.coverage.filter(u=>u.key===item.key),sources=item.descriptor.sourceRecordIds;
   if(sources.length>20)fail('BUDGET_EXCEEDED');
   const combined=new Set([...(partition?.sources||[]),...sources]);
   if(!partition||partition.units.length+units.length>50||combined.size>20){partition={sources:new Set(),units:[]};partitions.push(partition);}
   for(const id of sources)partition.sources.add(id);partition.units.push(...units);
  }
  if(partitions.length>2)fail('BUDGET_EXCEEDED');request.children=partitions.map(p=>validateCoverage(p.units,TYPE));
  const requestDigest=await digest(request);
  if(generation!==this.#generation)fail('UNAVAILABLE');
  // This receipt is only the private host opportunity seam, not a signed
  // commercial route/reservation proof. Remote providers remain refused.
  const grant=await this.#window.acquire(Object.freeze({jobType:TYPE,requestDigest}));
  exact(grant,['version','kind','dayId','windowId','reservationId','tier','requestDigest','revocationSignal']);
  if(grant.version!==1||!['fixture','local'].includes(grant.kind)||grant.kind!==descriptor.executionKind||!['free','pro'].includes(grant.tier)||![grant.dayId,grant.windowId,grant.reservationId].every(opaque)||grant.requestDigest!==requestDigest||!(grant.revocationSignal instanceof AbortSignal)||grant.revocationSignal.aborted||generation!==this.#generation)fail('UNAVAILABLE');
  syncTrue(this.#window.isCurrent(grant));
  const job=await this.#foundation.plan(request);
  if(generation!==this.#generation||grant.revocationSignal.aborted)fail('UNAVAILABLE');syncTrue(this.#window.isCurrent(grant));
  if(job.id===null||['NO_DELTA','COMMITTED'].includes(job.state)){const handle=Object.freeze(outcome(job.state,{jobId:job.id,nextCursor:batch.nextCursor,complete:batch.complete}));this.#passive.set(handle,{generation,state:job.state});return handle;}
  if(this.#jobs.has(job.id))return this.#jobs.get(job.id).handle;
  const handle=Object.freeze(outcome(job.state,{jobId:job.id,childCount:job.childIds.length,nextCursor:batch.nextCursor,complete:batch.complete}));
  const state={request,job,handle,generation,grant,grantBinding:Object.freeze({...grant}),controller:new AbortController(),running:null,groups:new Map(),prepared:new Map(),outputs:new Map(),completed:false};
  const revoked=()=>{state.controller.abort();state.outputs.clear();state.prepared.clear();state.groups.clear();};grant.revocationSignal.addEventListener('abort',revoked,{once:true});state.removeRevocation=()=>grant.revocationSignal.removeEventListener('abort',revoked);
  this.#jobs.set(job.id,state);this.#handles.set(handle,state);return handle;
 }
 #response(a){
  this.#current(a.state);const saved=a.state.outputs.get(a.childId);
  if(!saved||saved.childId!==a.childId||saved.jobId!==a.state.job.id||saved.operationReceiptId!==a.receipt.operationReceiptId||!['RESPONSE_RECORDED','VALIDATED'].includes(a.receipt.state))fail('UNAVAILABLE');return saved;
 }
 async #decode(a,facet,input){
  const saved=this.#response(a),correlation=this.#correlation(a);
  try{
   // The private adapter consumes the *actual* same-child provider snapshot. It
   // returns existing domain DTOs, not a new provider wire/product schema.
   const adapted=structuredClone(await this.#service.responseAdapter[facet](structuredClone(saved.response),input,Object.freeze(correlation)));
   this.#current(a.state);if(this.#response(a)!==saved)fail('STALE_BASE');
   exact(adapted,['binding','value']);if(!equal(adapted.binding,correlation))fail('STALE_BASE');return adapted.value;
  }catch(e){a.state.outputs.delete(a.childId);throw e;}
 }
 async #executeBounded(state,provider,request){
  this.#current(state);const timeoutMs=this.#store.organizerBudget.limits.timeoutMs;
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1)fail('UNAVAILABLE');
  const controller=new AbortController(),sources=[state.controller.signal,state.grant.revocationSignal];let timer,rejectStop;
  const stopped=new Promise((_,reject)=>{rejectStop=()=>{controller.abort();reject(Object.assign(Error('MAINTENANCE_STOPPED'),{code:'OUTCOME_UNKNOWN'}));};});
  for(const source of sources){source.addEventListener('abort',rejectStop,{once:true});if(source.aborted)rejectStop();}
  timer=setTimeout(rejectStop,timeoutMs);
  try{
   const work=Promise.resolve().then(()=>{this.#current(state);return provider.execute(request,Object.freeze({signal:controller.signal,timeoutMs}));});
   const value=await Promise.race([work,stopped]);this.#current(state);return value;
  }finally{clearTimeout(timer);for(const source of sources)source.removeEventListener('abort',rejectStop);}
 }
 #transport(state){
  const original=this.#provider,descriptor=localProviderDescriptor(original);
  return {describe:()=>structuredClone(descriptor),execute:async request=>{
   this.#current(state);if(request.logicalJobId!==state.job.id||!state.job.childIds.includes(request.childOperationId))fail('STALE_BASE');
   let response;try{
    response=responseSnapshot(await this.#executeBounded(state,original,request),this.#store.organizerBudget.limits.maxOutputBytes);this.#current(state);
    if(response?.accepted===true&&opaque(response.operationReceiptId))state.outputs.set(request.childOperationId,{jobId:state.job.id,childId:request.childOperationId,operationReceiptId:response.operationReceiptId,response});
    else state.outputs.delete(request.childOperationId);
    // Only the existing neutral receipt fields cross the Foundation owner.
    return {accepted:response?.accepted===true,operationReceiptId:response?.operationReceiptId};
   }catch(e){state.outputs.delete(request.childOperationId);throw e;}
  }};
 }
 async #writeDomain(fn,facet){
  const a=this.#active;this.#current(a?.state);if(!a||a.facet!==facet||a.callback!==null||typeof fn!=='function')fail('UNAVAILABLE');
  a.callback=fn;
  await this.#foundation.commitFacet(a.state.job.id,a.childId,{facet,units:a.units});this.#current(a.state);
  if(!a.entered||a.result===null)fail('DOMAIN_REPLAY_UNACKNOWLEDGED');return a.result;
 }
 async #commit(t,r,facet){
  const a=this.#active;this.#current(a?.state);
  if(a?.facet!==facet||typeof a.callback!=='function'||a.entered||r.logicalJobId!==a.state.job.id||r.childOperationId!==a.childId||!equal(r.units,a.units))fail('STALE_BASE');
  a.entered=true;const abort=()=>{try{t.tx.abort();}catch{}},signals=[a.state.controller.signal,a.state.grant.revocationSignal];
  for(const s of signals)s.addEventListener('abort',abort);
  const cleanup=()=>{for(const s of signals)s.removeEventListener('abort',abort);};t.tx.addEventListener('complete',cleanup,{once:true});t.tx.addEventListener('abort',cleanup,{once:true});
  const put=t.put.bind(t);t.put=async(...args)=>{this.#current(a.state);const value=await put(...args);this.#current(a.state);return value;};
  const result=await a.callback(t);this.#current(a.state);
  if(facet==='context'?result?.ok!==true||result.conflict===true:!['create','reuse','candidate','unassigned'].includes(result?.outcome))fail('STALE_BASE');
  a.result=result;return {committed:true,coverage:r.units,isCurrent:()=>{try{this.#current(a.state);return this.#active===a;}catch{return false;}}};
 }
 async #invoke(state,childId,receipt,facet,units,work){
  this.#current(state);if(this.#active)fail('REQUEST_ALREADY_IN_FLIGHT');
  const a={state,childId,receipt,facet,units,callback:null,entered:false,result:null};this.#active=a;
  try{await work();this.#current(state);if(!a.entered)fail('DOMAIN_REPLAY_UNACKNOWLEDGED');return {facet,units:units.length,state:'COMMITTED'};}
  finally{if(this.#active===a)this.#active=null;}
 }
 async #topicFacet(state,childId,receipt,units){
  const inputIds=this.#inputs(state,units);if(!inputIds)return this.#defer(state,childId,'topic',units,'TOPIC_MAPPING_UNAVAILABLE');
  const key=canonical([childId,'topic',units]);let prepared=state.prepared.get(key);
  return this.#invoke(state,childId,receipt,'topic',units,async()=>{
   if(!prepared){prepared=await this.#topic.prepare({scope:inputIds.map(inputId=>({inputId,role:'primary',selectedFields:['body']})),operationId:this.#store.uuid()},{signal:state.controller.signal});this.#current(state);state.prepared.set(key,prepared);}
   await this.#topic.commit(prepared);
  });
 }
 async #contextFacet(state,childId,receipt,units){
  const inputIds=this.#inputs(state,units);if(!inputIds)return [await this.#defer(state,childId,'context',units,'CONTEXT_MAPPING_UNAVAILABLE')];
  const key=canonical([childId,'context']);let groups=state.groups.get(key);
  if(!groups){
   groups=await this.#decode({state,childId,receipt},'context',Object.freeze({units:structuredClone(units),inputIds:[...inputIds]}));this.#current(state);
   if(!Array.isArray(groups)||!groups.length||groups.length>units.length)fail('STALE_BASE');
   const all=[];for(const group of groups){exact(group,['units','change']);group.units=validateCoverage(group.units,TYPE);if(group.units.some(u=>u.facet!=='context'||!units.some(v=>unitKey(u)===unitKey(v))))fail('STALE_BASE');
    validateContextMaintenanceChange(group.change);const ids=this.#inputs(state,group.units);
    if(!ids||!equal(ids,[...new Set(group.change.evidence.map(e=>e.inputId))].sort()))fail('STALE_BASE');all.push(...group.units);
   }
   if(!equal(all.map(unitKey).sort(),units.map(unitKey).sort()))fail('STALE_BASE');state.groups.set(key,groups);state.outputs.delete(childId);
  }
  const results=[];for(const group of groups){
   const current=await this.#foundation.status(state.job.id);this.#current(state);const remaining=group.units.filter(u=>!current.committedCoverage.includes(unitKey(u)));
   if(!remaining.length)continue;if(remaining.length!==group.units.length)fail('STALE_BASE');
   try{results.push(await this.#invoke(state,childId,receipt,'context',group.units,()=>this.#context.maintain(this.#service.context.caller,group.change,{signal:state.controller.signal})));}
   catch(e){this.#current(state);results.push({facet:'context',units:group.units.length,state:'FAILED',reason:safeError(e)});break;}
  }return results;
 }
 async #defer(state,childId,facet,units,retryCondition){await this.#foundation.commitFacet(state.job.id,childId,{facet,units,outcome:'DEFER',retryCondition});this.#current(state);return {facet,units:units.length,state:'DEFERRED'};}
 run(handle){
  const passive=this.#passive.get(handle);if(passive)return Promise.resolve(outcome(passive.generation===this.#generation?passive.state:'UNAVAILABLE',{jobId:null}));
  const state=this.#handles.get(handle);if(!state)return Promise.resolve(outcome('UNAVAILABLE'));
  if(state.completed)return Promise.resolve(outcome(state.generation===this.#generation?'COMMITTED':'UNAVAILABLE',{jobId:state.job.id,facets:[]}));
  try{this.#current(state);}catch(e){return Promise.resolve(outcome(safeError(e)));}
  if(state.running)return state.running;if(this.#running&&this.#running!==state)return Promise.resolve(outcome('REQUEST_ALREADY_IN_FLIGHT'));
  this.#running=state;state.running=this.#run(state).finally(()=>{state.running=null;if(this.#running===state)this.#running=null;});return state.running;
 }
 async #run(state){
  const results=[];
  try{
   const initial=await this.#foundation.status(state.job.id);this.#current(state);
   if(initial.state==='COMMITTED')return outcome('COMMITTED',{jobId:state.job.id,facets:[]});
   if(initial.attempts.some(r=>['DISPATCHED','OUTCOME_UNKNOWN'].includes(r.state)))return outcome('OUTCOME_UNKNOWN',{jobId:state.job.id});
   await this.#foundation.reserve(state.job.id,{reservationId:state.grant.reservationId,executionKind:state.grant.kind});this.#current(state);
   const children=[];let topicFailed=false;
   for(const childId of state.job.childIds){
    let status=await this.#foundation.status(state.job.id);this.#current(state);let receipt=status.attempts.find(r=>r.childId===childId);
    if(receipt?.state==='COMMITTED')continue;
    if(receipt?.state==='RESERVED'){const dispatched=await this.#foundation.dispatch(state.job.id,childId,this.#transport(state));this.#current(state);if(dispatched.state!=='RESPONSE_RECORDED'){state.outputs.delete(childId);return outcome('OUTCOME_UNKNOWN',{jobId:state.job.id,facets:results});}}
    status=await this.#foundation.status(state.job.id);this.#current(state);receipt=status.attempts.find(r=>r.childId===childId);
    if(!receipt||!['RESPONSE_RECORDED','VALIDATED'].includes(receipt.state))return outcome('UNAVAILABLE',{jobId:state.job.id,facets:results});
    const job=await this.#foundation.read(t=>this.#foundation.job(t,state.job.id));this.#current(state);const coverage=job.childCoverage[job.childIds.indexOf(childId)];children.push({childId,receipt,coverage});
    const units=coverage.filter(u=>u.facet==='topic'&&!status.committedCoverage.includes(unitKey(u)));
    if(units.length)try{results.push(await this.#topicFacet(state,childId,receipt,units));}catch(e){this.#current(state);if(!['STORAGE_FAILED','STORAGE_FULL'].includes(e?.code))state.outputs.delete(childId);results.push({facet:'topic',units:units.length,state:'FAILED',reason:safeError(e)});topicFailed=true;}
   }
   // A later child's provider/Topic stage sees current existing identities.
   // Only after every Topic phase succeeds do Context operations capture final
   // memberships, so sibling writes cannot invalidate earlier Context binding.
   for(const facet of ['context','filter']){
    if(facet==='context'&&topicFailed)continue;
    for(const {childId,receipt,coverage}of children){
     const latest=await this.#foundation.status(state.job.id);this.#current(state);const units=coverage.filter(u=>u.facet===facet&&!latest.committedCoverage.includes(unitKey(u)));if(!units.length)continue;
     try{if(facet==='context')results.push(...await this.#contextFacet(state,childId,receipt,units));else results.push(await this.#defer(state,childId,facet,units,'FILTER_OWNER_UNAVAILABLE'));}
     catch(e){this.#current(state);if(facet==='context')state.outputs.delete(childId);results.push({facet,units:units.length,state:'FAILED',reason:safeError(e)});}
    }
   }
   const final=await this.#foundation.status(state.job.id);this.#current(state);
   if(final.state==='COMMITTED'){state.completed=true;state.removeRevocation();state.prepared.clear();state.groups.clear();state.outputs.clear();this.#jobs.delete(state.job.id);}
   return outcome(final.state==='COMMITTED'?'COMMITTED':'PARTIAL',{jobId:state.job.id,facets:results});
  }catch(e){state.outputs.clear();return outcome(safeError(e),{jobId:state.job.id,facets:results});}
 }
 dispose(){this.#generation++;for(const state of this.#jobs.values()){state.removeRevocation();state.controller.abort();state.prepared.clear();state.groups.clear();state.outputs.clear();}this.#jobs.clear();}
}
