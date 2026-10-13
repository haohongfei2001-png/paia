import {AIUsageFoundation} from './foundation.js';
import {readMaintenanceBatch,unsupportedMaintenanceCoverage} from './maintenance-batch.js';
import {createMaintenancePayload} from './maintenance-payload.js';
import {canonical,digest,equal,exact,fail,opaque,unitKey,validateCoverage,localProviderDescriptor} from './contracts.js';
import {TopicFormationService} from '../topic-formation.js';
import {ContextMaintenanceService,validateContextMaintenanceChange,validateContextMaintenanceNoChange} from '../context-maintenance.js';

const TYPE='AI_MAINTENANCE';
const outcome=(state,extra={})=>({state,dispatchAllowed:false,financialAuthority:false,...extra});
const reasons=new Set(['UNAVAILABLE','BUDGET_EXCEEDED','CANCELLED','STALE_BASE','OUTCOME_UNKNOWN','INVALID_REQUEST','CONTEXT_INVALIDATED','CONTEXT_LIMIT','STORAGE_FAILED','STORAGE_FULL','CONSENT_REQUIRED','REQUEST_ALREADY_IN_FLIGHT','DOMAIN_REPLAY_UNACKNOWLEDGED']);
const safeError=e=>reasons.has(e?.code)?e.code:'UNAVAILABLE';
const frozen=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))frozen(child);Object.freeze(value);}return value;};
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
 #store;#foundation;#provider;#service;#window;#topic;#context;#processing;
 #handles=new WeakMap();#passive=new WeakMap();#jobs=new Map();#preparing=null;#active=null;#running=null;#generation=0;
 constructor(store,{provider=null,service=null,window=null,authority=null,processing=null}={}){
  this.#store=store;this.#provider=provider;this.#service=service===null?null:{...service,topic:{...service.topic},context:{...service.context},responseAdapter:service.responseAdapter===null?null:{...service.responseAdapter}};this.#window=window;this.#processing=processing===null?null:Object.freeze({...processing});if(processing!==null){exact(processing,['resolve','isCurrent']);if(typeof processing.resolve!=='function'||typeof processing.isCurrent!=='function')fail();}
  this.#foundation=new AIUsageFoundation(store,{resolveAuthority:authority,qualifyMaintenanceEntries:async(t,request)=>{const entries=await this.#entryMapping(request,t);return request.coverage.filter(u=>u.facet==='topic'&&entries.has(u.key));},committers:{topic:(t,r)=>this.#commit(t,r,'topic'),context:(t,r)=>this.#commit(t,r,'context')}});
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
    if(!equal([...cited].sort(),view.inputs.map(i=>i.id).sort()))fail('STALE_BASE');
    const selectedEntries=this.#entries(a.state,a.units);
    if(selectedEntries.some(e=>!view.entries.some(v=>v.id===e.entryId&&v.revision===e.revision)))fail('STALE_BASE');
    const selected=selectedEntries.map(e=>e.entryId).sort(),accounted=assessed?.entries?.filter(e=>e.entryId!==undefined).map(e=>e.entryId).sort();
    if(selected.length&&!equal(selected,accounted))fail('STALE_BASE');return assessed;
   }},writeTransaction:fn=>this.#writeDomain(fn,'topic')});
   this.#context=new ContextMaintenanceService(store,{processingVerifier:service.context.processingVerifier,writeTransaction:fn=>this.#writeDomain(fn,'context')});
  }
 }
 #current(state){
  if(!state||state.generation!==this.#generation||this.#jobs.get(state.job.id)!==state||state.controller.signal.aborted||state.grant.revocationSignal.aborted)fail('UNAVAILABLE');
  if(Object.entries(state.grantBinding).some(([key,value])=>state.grant[key]!==value))fail('UNAVAILABLE');syncTrue(this.#window.isCurrent(state.grant));
  for(const receipt of state.processing.values())try{this.#assertProcessing(receipt);}catch(error){state.controller.abort();state.outputs.clear();state.prepared.clear();state.groups.clear();throw error;}
 }
 #correlation(a){return {logicalJobId:a.state.job.id,childOperationId:a.childId,operationReceiptId:a.receipt.operationReceiptId};}
 // Only restoration of a current Input-bound Entry is admitted in this slice.
 // Metadata qualification never substitutes authored text or manufactures lineage.
 async #entryMapping(request,transaction=null){
  const qualify=async t=>{
   const found=new Map();
   for(const {key,descriptor:d}of request.items){
    if(d.kind!=='library_entry'||d.independent)continue;
    const row=await t.get('thoughts',d.recordId||d.entityId),journal=await t.get('revisions',d.journalId);
    if(!row||row.id!==d.entityId||row.lifecycle!=='active'||row.revision!==d.revision||row.bodyBinding!=='input'||row.inputRefs?.length!==1||row.workingInputId!==row.inputRefs[0].inputBlockId||row.note||row.title)continue;
    if(journal?.actor!=='user'||journal.kind!=='library_entry'||journal.entityId!==row.id||journal.afterRevision!==row.revision||journal.reason!=='restore'||!equal(journal.fieldMask,['lifecycle']))continue;
    if(!equal([...(row.sourceRecordIds||[])].sort(),[...d.sourceRecordIds].sort()))continue;
    found.set(key,{entryId:row.id,revision:row.revision,inputIds:[row.workingInputId]});
   }return found;
  };return transaction?qualify(transaction):this.#foundation.read(qualify);
 }
 #entries(state,units){return units.filter(u=>u.facet==='topic'&&state.entryMapping?.has(u.key)).map(u=>state.entryMapping.get(u.key));}
 #inputs(state,units){
  const ids=new Set();for(const u of units){const item=state.request.items.find(i=>i.key===u.key),d=item?.descriptor;
   if(d?.kind==='input'&&d.inputIds.length===1&&d.inputIds[0]===d.entityId)ids.add(d.entityId);
   else if(d?.kind==='library_entry'&&u.facet==='topic'&&state.entryMapping?.has(u.key)){for(const id of state.entryMapping.get(u.key).inputIds)ids.add(id);}
   else return null;
  }return [...ids].sort();
 }
 async prepare(options){
  const copied=structuredClone(options);exact(copied,['scope','contractVersion','routeVersion','cursor','limit'],['scope','contractVersion','routeVersion']);
  const key=canonical(copied);
  if(this.#preparing){if(this.#preparing.key!==key)fail('REQUEST_ALREADY_IN_FLIGHT');return this.#preparing.promise;}
  const pending={key,promise:null,controller:new AbortController()};this.#preparing=pending;
  pending.promise=this.#prepare(copied,pending.controller.signal).finally(()=>{if(this.#preparing===pending)this.#preparing=null;});return pending.promise;
 }
 async #prepare(options,signal){
  const generation=this.#generation;let batch=await readMaintenanceBatch(this.#foundation,options),deferredUnits=0;
  if(generation!==this.#generation||signal.aborted)fail('UNAVAILABLE');
  // A configured local original-domain mapper resolves only its explicit old
  // retry condition. At most one mapper pass, distinct from obsolete cleanup.
  const mappingReady=this.#service?.responseAdapter&&this.#provider&&typeof this.#window?.acquire==='function'&&typeof this.#window?.isCurrent==='function';
  if(mappingReady&&(batch.blockedUnits>0||batch.reason==='DEFER_SCAN_BOUND')){
   localProviderDescriptor(this.#provider);
   const cleanup=await this.#foundation.archiveObsoleteDeferred({limit:100,reconsiderEntryTopics:true},{signal,isCurrent:()=>generation===this.#generation&&!signal.aborted});
   if(generation!==this.#generation||signal.aborted)fail('UNAVAILABLE');
   if(cleanup.archived){batch=await readMaintenanceBatch(this.#foundation,options);if(generation!==this.#generation||signal.aborted)fail('UNAVAILABLE');}
  }
  if(batch.status!=='CANDIDATE_ONLY')return this.#passiveHandle(batch,generation,deferredUnits);
  if(!this.#service?.responseAdapter||!this.#provider||typeof this.#window?.acquire!=='function'||typeof this.#window?.isCurrent!=='function')fail('UNAVAILABLE');
  const descriptor=localProviderDescriptor(this.#provider);
  let entryMapping=await this.#entryMapping(batch.request);if(generation!==this.#generation||signal.aborted)fail('UNAVAILABLE');
  const unsupported=unsupportedMaintenanceCoverage(batch.request.items,batch.request.coverage,new Set(entryMapping.keys()));
  if(unsupported.length){
   if(batch.activeDeferredUnits+unsupported.length>100)return this.#passiveHandle({...batch,status:'UNAVAILABLE',reason:'DEFER_SCAN_BOUND'},generation);
   const job=await this.#foundation.plan(batch.request);if(generation!==this.#generation||signal.aborted)fail('UNAVAILABLE');
   const groups=[];await this.#foundation.read(async t=>{const planned=await this.#foundation.job(t,job.id);await this.#foundation.current(t,planned);
    for(let i=0;i<planned.childIds.length;i++)for(const facet of ['topic','context','filter']){const units=unsupported.filter(u=>u.facet===facet&&planned.childCoverage[i].some(v=>equal(u,v)));if(units.length)groups.push({childId:planned.childIds[i],facet,units,retryCondition:{topic:'TOPIC_MAPPING_UNAVAILABLE',context:'CONTEXT_MAPPING_UNAVAILABLE',filter:'FILTER_OWNER_UNAVAILABLE'}[facet]});}
   });
   if(generation!==this.#generation||signal.aborted)fail('UNAVAILABLE');
   const result=await this.#foundation.deferMaintenanceBeforeDispatch(job.id,{groups},{signal,plan:job,isCurrent:()=>generation===this.#generation&&!signal.aborted});deferredUnits=result.deferredUnits;
   if(generation!==this.#generation||signal.aborted)fail('UNAVAILABLE');
   if(result.reason)return this.#passiveHandle({...batch,status:'UNAVAILABLE',reason:result.reason},generation);
   // One fresh original qualification; no loop or guessed retry condition.
   batch=await readMaintenanceBatch(this.#foundation,options);if(generation!==this.#generation||signal.aborted)fail('UNAVAILABLE');
   if(batch.status!=='CANDIDATE_ONLY')return this.#passiveHandle(batch,generation,deferredUnits);
   entryMapping=await this.#entryMapping(batch.request);if(generation!==this.#generation||signal.aborted)fail('UNAVAILABLE');
   if(unsupportedMaintenanceCoverage(batch.request.items,batch.request.coverage,new Set(entryMapping.keys())).length)fail('UNAVAILABLE');
  }
  const request=batch.request,progress={deferredUnits,blockedUnits:batch.blockedUnits??0,remainingWork:deferredUnits>0||batch.complete!==true||(batch.blockedUnits??0)>0};
  // Reuse the current Topic identity owner's 20-distinct-Source admission
  // boundary. Keep all remaining facets of each Input in the same child.
  // More than two required partitions is unavailable, never lost coverage.
  const partitions=[];let partition=null;
  for(const item of request.items){const units=request.coverage.filter(u=>u.key===item.key),sources=item.descriptor.sourceRecordIds;
   if(sources.length>20)fail('BUDGET_EXCEEDED');
   const combined=new Set([...(partition?.sources||[]),...sources]),inputIds=this.#inputs({request,entryMapping},units),combinedInputs=new Set([...(partition?.inputs||[]),...inputIds]);
   if(!partition||partition.units.length+units.length>50||combinedInputs.size>Math.min(20,this.#store.organizerBudget.limits.maxInputs)||combined.size>20){partition={sources:new Set(),units:[],inputs:new Set()};partitions.push(partition);}
   for(const id of sources)partition.sources.add(id);partition.units.push(...units);for(const id of inputIds)partition.inputs.add(id);
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
  if(job.id===null||['NO_DELTA','COMMITTED'].includes(job.state)){const handle=Object.freeze(outcome(job.state,{jobId:job.id,nextCursor:batch.nextCursor,complete:batch.complete,...progress}));this.#passive.set(handle,{generation,state:job.state,...progress});return handle;}
  if(this.#jobs.has(job.id))return this.#jobs.get(job.id).handle;
  const handle=Object.freeze(outcome(job.state,{jobId:job.id,childCount:job.childIds.length,nextCursor:batch.nextCursor,complete:batch.complete,...progress}));
  const state={progress,request,entryMapping,job,handle,generation,grant,grantBinding:Object.freeze({...grant}),controller:new AbortController(),running:null,groups:new Map(),prepared:new Map(),outputs:new Map(),processing:new Map(),processingCleanup:new Set(),completed:false};
  const revoked=()=>{state.controller.abort();state.outputs.clear();state.prepared.clear();state.groups.clear();state.processing.clear();};grant.revocationSignal.addEventListener('abort',revoked,{once:true});state.removeRevocation=()=>grant.revocationSignal.removeEventListener('abort',revoked);
  this.#jobs.set(job.id,state);this.#handles.set(handle,state);return handle;
 }
 #passiveHandle(batch,generation,deferredUnits=0){
  const progress={deferredUnits,blockedUnits:batch.blockedUnits??0,remainingWork:deferredUnits>0||batch.complete!==true||batch.status==='DEFERRED'||batch.reason==='DEFER_SCAN_BOUND'||(batch.blockedUnits??0)>0};
  const handle=Object.freeze(outcome(batch.status,{jobId:null,nextCursor:batch.nextCursor??null,complete:batch.complete??false,...(batch.reason?{reason:batch.reason}:{}),...progress}));this.#passive.set(handle,{generation,state:batch.status,...progress});return handle;
 }
 #settled(state,facets=[]){
  // Job settlement and scan completion are separate: a committed page may
  // still have a continuation, while deferred facets remain a partial job.
  const partial=state.progress.deferredUnits>0||state.progress.blockedUnits>0;
  return outcome(partial?'PARTIAL':'COMMITTED',{jobId:state.job.id,facets,nextCursor:state.handle.nextCursor,complete:state.handle.complete,...state.progress,...(partial?{processedState:'COMMITTED'}:{})});
 }
 #response(a){
  this.#processingCurrent(a.state,a.state.processing.get(a.childId));const saved=a.state.outputs.get(a.childId);
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
 #assertProcessing(receipt){
  if(!receipt||receipt.store!==this.#store||receipt.caller!==this.#service.context.caller||receipt.processing!==true||receipt.revocationSignal.aborted||receipt.expiresAt<=Date.now())fail('UNAVAILABLE');
  syncTrue(this.#processing?.isCurrent(receipt,this.#store));
 }
 #processingCurrent(state,receipt){this.#current(state);this.#assertProcessing(receipt);}
 async #processingReceipt(state,metadata){
  this.#current(state);if(!this.#processing)fail('UNAVAILABLE');
  const inputIds=this.#inputs(state,metadata.coverage),entries=this.#entries(state,metadata.coverage);if(!inputIds?.length)fail('UNAVAILABLE');
  if(entries.length){const currentEntries=await this.#entryMapping(state.request);this.#current(state);for(const entry of entries)if(!equal(currentEntries.get(state.request.items.find(i=>i.descriptor.entityId===entry.entryId).key),entry))fail('STALE_BASE');}
  const receipt=await this.#foundation.read(async t=>{
   const job=await this.#foundation.job(t,state.job.id);await this.#foundation.current(t,job);this.#current(state);
   const request={purpose:'ai-maintenance-payload',logicalJobId:job.id,childOperationId:metadata.childOperationId,principalId:job.authority.principalId,libraryId:job.authority.libraryId,consentEpoch:job.authority.consentEpoch,inputs:inputIds.map(inputId=>({inputId,selectedFields:['body']})),...(entries.length?{entries:entries.map(({entryId,revision})=>({entryId,revision,selectedFields:['body']}))}:{}),facets:[...new Set(metadata.coverage.map(u=>u.facet))].sort(),coverage:structuredClone(metadata.coverage)};
   const raw=await this.#processing.resolve(t,frozen(structuredClone(request)));this.#current(state);
   exact(raw,['version','store','caller','scope','epoch','processing','expiresAt','revocationSignal']);
   if(Reflect.ownKeys(raw).some(k=>!Object.hasOwn(Object.getOwnPropertyDescriptor(raw,k),'value'))||raw.version!==1||raw.store!==this.#store||raw.caller!==this.#service.context.caller||!Object.isFrozen(raw.caller)||!opaque(raw.epoch)||raw.processing!==true||!Number.isSafeInteger(raw.expiresAt)||raw.expiresAt<=Date.now()||!(raw.revocationSignal instanceof AbortSignal)||raw.revocationSignal.aborted)fail('UNAVAILABLE');
   const scope=responseSnapshot(raw.scope,32768);if(!equal(scope,request))fail('UNAVAILABLE');
   return Object.freeze({...raw,scope:frozen(structuredClone(request))});
  });
  this.#processingCurrent(state,receipt);const prior=state.processing.get(metadata.childOperationId);
  if(prior&&(prior.epoch!==receipt.epoch||prior.expiresAt!==receipt.expiresAt||prior.revocationSignal!==receipt.revocationSignal||!equal(prior.scope,receipt.scope)))fail('UNAVAILABLE');
  if(!prior){const abort=()=>{state.controller.abort();state.outputs.clear();state.prepared.clear();state.groups.clear();};receipt.revocationSignal.addEventListener('abort',abort,{once:true});state.processingCleanup.add(()=>receipt.revocationSignal.removeEventListener('abort',abort));}
  state.processing.set(metadata.childOperationId,receipt);return receipt;
 }
 async #preparePayload(state,metadata){
  this.#current(state);const processing=await this.#processingReceipt(state,metadata);const inputIds=this.#inputs(state,metadata.coverage);
  if(!inputIds?.length)fail('UNAVAILABLE');if(inputIds.length>Math.min(20,this.#store.organizerBudget.limits.maxInputs))fail('BUDGET_EXCEEDED');
  const handle=await this.#topic.prepareMaterial({scope:inputIds.map(inputId=>({inputId,role:'primary',selectedFields:['body']})),entryIds:this.#entries(state,metadata.coverage).map(e=>e.entryId)},{signal:state.controller.signal});
  try{this.#current(state);const material=await this.#topic.readMaterial(handle);this.#current(state);
   const payload=createMaintenancePayload(metadata,material,this.#store.organizerBudget.limits);
   return {handle,payload,processing};
  }catch(error){this.#topic.releaseMaterial(handle);throw error;}
 }
 async #checkPayload(state,handle,metadata,processing){
  this.#processingCurrent(state,processing);await this.#processingReceipt(state,metadata);this.#processingCurrent(state,processing);await this.#topic.checkMaterial(handle);this.#current(state);
  await this.#foundation.read(async t=>{const job=await this.#foundation.job(t,state.job.id);await this.#foundation.current(t,job);});this.#current(state);
  // The final material read follows the Foundation await, then the synchronous
  // host opportunity/abort fence immediately precedes physical invocation.
  await this.#topic.checkMaterial(handle);this.#processingCurrent(state,processing);
 }
 async #preflightPayloads(state){
  const status=await this.#foundation.status(state.job.id);this.#current(state);
  const requests=await this.#foundation.read(async t=>{const job=await this.#foundation.job(t,state.job.id);await this.#foundation.current(t,job);return job.childIds.map((_,i)=>this.#foundation.childRequest(job,i));});this.#current(state);
  for(const metadata of requests){if(!metadata.coverage.length||status.attempts.some(r=>r.childId===metadata.childOperationId&&r.attemptCount===1))continue;
   const prepared=await this.#preparePayload(state,metadata);try{await this.#checkPayload(state,prepared.handle,metadata,prepared.processing);}finally{this.#topic.releaseMaterial(prepared.handle);}
  }
 }
 async #executeBounded(state,provider,request,materialHandle,processing){
  this.#current(state);const timeoutMs=this.#store.organizerBudget.limits.timeoutMs;
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1)fail('UNAVAILABLE');
  const controller=new AbortController(),sources=[state.controller.signal,state.grant.revocationSignal,processing.revocationSignal];let timer,rejectStop;
  const stopped=new Promise((_,reject)=>{rejectStop=()=>{controller.abort();reject(Object.assign(Error('MAINTENANCE_STOPPED'),{code:'OUTCOME_UNKNOWN'}));};});
  for(const source of sources){source.addEventListener('abort',rejectStop,{once:true});if(source.aborted)rejectStop();}
  timer=setTimeout(rejectStop,timeoutMs);
  try{
   const work=Promise.resolve().then(async()=>{await this.#checkPayload(state,materialHandle,request,processing);this.#processingCurrent(state,processing);if(controller.signal.aborted)fail('OUTCOME_UNKNOWN');return provider.execute(request,Object.freeze({signal:controller.signal,timeoutMs}));});
   const value=await Promise.race([work,stopped]);this.#processingCurrent(state,processing);return value;
  }finally{clearTimeout(timer);for(const source of sources)source.removeEventListener('abort',rejectStop);}
 }
 #transport(state){
  const original=this.#provider,descriptor=localProviderDescriptor(original);
  return {describe:()=>structuredClone(descriptor),execute:async request=>{
   this.#current(state);if(request.logicalJobId!==state.job.id||!state.job.childIds.includes(request.childOperationId))fail('STALE_BASE');
   let response;try{
    const assembled=await this.#preparePayload(state,request);try{response=responseSnapshot(await this.#executeBounded(state,original,assembled.payload,assembled.handle,assembled.processing),this.#store.organizerBudget.limits.maxOutputBytes);}finally{this.#topic.releaseMaterial(assembled.handle);}this.#current(state);
    if(response?.accepted===true&&opaque(response.operationReceiptId))state.outputs.set(request.childOperationId,{jobId:state.job.id,childId:request.childOperationId,operationReceiptId:response.operationReceiptId,response});
    else state.outputs.delete(request.childOperationId);
    // Only the existing neutral receipt fields cross the Foundation owner.
    return {accepted:response?.accepted===true,operationReceiptId:response?.operationReceiptId};
   }catch(e){state.outputs.delete(request.childOperationId);throw e;}
  }};
 }
 async #writeDomain(fn,facet){
  const a=this.#active;this.#processingCurrent(a?.state,a?.state.processing.get(a.childId));if(!a||a.facet!==facet||a.callback!==null||typeof fn!=='function')fail('UNAVAILABLE');
  a.callback=fn;
  await this.#foundation.commitFacet(a.state.job.id,a.childId,{facet,units:a.units,outcome:a.outcome});this.#current(a.state);
  if(!a.entered||a.result===null)fail('DOMAIN_REPLAY_UNACKNOWLEDGED');return a.result;
 }
 async #commit(t,r,facet){
  const a=this.#active;this.#processingCurrent(a?.state,a?.state.processing.get(a.childId));
  if(a?.facet!==facet||typeof a.callback!=='function'||a.entered||r.logicalJobId!==a.state.job.id||r.childOperationId!==a.childId||r.outcome!==a.outcome||!equal(r.units,a.units))fail('STALE_BASE');
  a.entered=true;const abort=()=>{try{t.tx.abort();}catch{}},signals=[a.state.controller.signal,a.state.grant.revocationSignal,a.state.processing.get(a.childId).revocationSignal];
  for(const s of signals)s.addEventListener('abort',abort);
  const cleanup=()=>{for(const s of signals)s.removeEventListener('abort',abort);};t.tx.addEventListener('complete',cleanup,{once:true});t.tx.addEventListener('abort',cleanup,{once:true});
  const put=t.put.bind(t);t.put=async(...args)=>{this.#processingCurrent(a.state,a.state.processing.get(a.childId));const value=await put(...args);this.#processingCurrent(a.state,a.state.processing.get(a.childId));return value;};
  const result=await a.callback(t);this.#current(a.state);
  if(facet==='context'?result?.ok!==true||result.conflict===true||a.outcome==='NO_CHANGE'&&result.disposition!=='no_change':!['create','reuse','candidate','unassigned'].includes(result?.outcome))fail('STALE_BASE');
  a.result=result;return {committed:true,coverage:r.units,isCurrent:()=>{try{this.#processingCurrent(a.state,a.state.processing.get(a.childId));return this.#active===a;}catch{return false;}}};
 }
 async #invoke(state,childId,receipt,facet,units,work,outcome='COMMITTED'){
  this.#current(state);if(this.#active)fail('REQUEST_ALREADY_IN_FLIGHT');
  const a={state,childId,receipt,facet,units,outcome,callback:null,entered:false,result:null};this.#active=a;
  try{await work();this.#current(state);if(!a.entered)fail('DOMAIN_REPLAY_UNACKNOWLEDGED');return {facet,units:units.length,state:'COMMITTED',...(outcome==='NO_CHANGE'?{outcome}:{})};}
  finally{if(this.#active===a)this.#active=null;}
 }
 async #topicFacet(state,childId,receipt,units){
  const inputIds=this.#inputs(state,units);if(!inputIds)return this.#defer(state,childId,'topic',units,'TOPIC_MAPPING_UNAVAILABLE');
  const key=canonical([childId,'topic',units]);let prepared=state.prepared.get(key);
  return this.#invoke(state,childId,receipt,'topic',units,async()=>{
   if(!prepared){prepared=await this.#topic.prepare({scope:inputIds.map(inputId=>({inputId,role:'primary',selectedFields:['body']})),entryIds:this.#entries(state,units).map(e=>e.entryId),operationId:this.#store.uuid()},{signal:state.controller.signal});this.#current(state);state.prepared.set(key,prepared);}
   await this.#topic.commit(prepared);
  });
 }
 async #contextFacet(state,childId,receipt,units){
  const inputIds=this.#inputs(state,units);if(!inputIds)return [await this.#defer(state,childId,'context',units,'CONTEXT_MAPPING_UNAVAILABLE')];
  const key=canonical([childId,'context']);let groups=state.groups.get(key);
  if(!groups){
   groups=await this.#decode({state,childId,receipt},'context',Object.freeze({units:structuredClone(units),inputIds:[...inputIds]}));this.#current(state);
   if(!Array.isArray(groups)||!groups.length||groups.length>units.length)fail('STALE_BASE');
   const all=[];for(const group of groups){exact(group,['units','change','operation'],['units','change']);if(Object.hasOwn(group,'operation')&&!['ADD','UPDATE','NO_CHANGE'].includes(group.operation))fail('STALE_BASE');group.units=validateCoverage(group.units,TYPE);if(group.units.some(u=>u.facet!=='context'||!units.some(v=>unitKey(u)===unitKey(v))))fail('STALE_BASE');
    if(group.operation==='NO_CHANGE')validateContextMaintenanceNoChange(group.change);else validateContextMaintenanceChange(group.change);
    // Explicit adapter intent must agree with the original owner's revision contract.
    if(group.operation==='ADD'&&group.change.expectedRevision!==0||group.operation==='UPDATE'&&group.change.expectedRevision===0)fail('STALE_BASE');const ids=this.#inputs(state,group.units);
    if(!ids||!equal(ids,[...new Set(group.change.evidence.map(e=>e.inputId))].sort()))fail('STALE_BASE');all.push(...group.units);
   }
   if(!equal(all.map(unitKey).sort(),units.map(unitKey).sort()))fail('STALE_BASE');state.groups.set(key,groups);state.outputs.delete(childId);
  }
  const results=[];for(const group of groups){
   const current=await this.#foundation.status(state.job.id);this.#current(state);const remaining=group.units.filter(u=>!current.committedCoverage.includes(unitKey(u)));
   if(!remaining.length)continue;if(remaining.length!==group.units.length)fail('STALE_BASE');
   try{results.push(await this.#invoke(state,childId,receipt,'context',group.units,()=>group.operation==='NO_CHANGE'?this.#context.noChange(this.#service.context.caller,group.change,{signal:state.controller.signal}):this.#context.maintain(this.#service.context.caller,group.change,{signal:state.controller.signal}),group.operation==='NO_CHANGE'?'NO_CHANGE':'COMMITTED'));}
   catch(e){this.#current(state);results.push({facet:'context',units:group.units.length,state:'FAILED',reason:safeError(e)});break;}
  }return results;
 }
 async #defer(state,childId,facet,units,retryCondition){await this.#foundation.commitFacet(state.job.id,childId,{facet,units,outcome:'DEFER',retryCondition});this.#current(state);return {facet,units:units.length,state:'DEFERRED'};}
 run(handle){
  const passive=this.#passive.get(handle);if(passive)return Promise.resolve(passive.generation!==this.#generation?outcome('UNAVAILABLE'):outcome(passive.state,{jobId:null,...(handle.reason?{reason:handle.reason}:{}),nextCursor:handle.nextCursor,complete:handle.complete,deferredUnits:passive.deferredUnits,blockedUnits:passive.blockedUnits,remainingWork:passive.remainingWork}));
  const state=this.#handles.get(handle);if(!state)return Promise.resolve(outcome('UNAVAILABLE'));
  if(state.completed)return Promise.resolve(state.generation===this.#generation?this.#settled(state):outcome('UNAVAILABLE',{jobId:state.job.id,facets:[]}));
  try{this.#current(state);}catch(e){return Promise.resolve(outcome(safeError(e)));}
  if(state.running)return state.running;if(this.#running&&this.#running!==state)return Promise.resolve(outcome('REQUEST_ALREADY_IN_FLIGHT'));
  this.#running=state;state.running=this.#run(state).finally(()=>{state.running=null;if(this.#running===state)this.#running=null;});return state.running;
 }
 async #run(state){
  const results=[];
  try{
   const initial=await this.#foundation.status(state.job.id);this.#current(state);
   if(initial.state==='COMMITTED'){state.completed=true;this.#retire(state);return this.#settled(state);}
   if(initial.attempts.some(r=>['DISPATCHED','OUTCOME_UNKNOWN'].includes(r.state)))return outcome('OUTCOME_UNKNOWN',{jobId:state.job.id});
   await this.#preflightPayloads(state);this.#current(state);
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
   if(final.state==='COMMITTED'){state.completed=true;this.#retire(state);}
   return final.state==='COMMITTED'?this.#settled(state,results):outcome('PARTIAL',{jobId:state.job.id,facets:results,...state.progress,remainingWork:true});
  }catch(e){state.outputs.clear();return outcome(safeError(e),{jobId:state.job.id,facets:results});}
 }
 // Listener cleanup cannot change an already durable domain outcome.
 #retire(state){
  const errors=[],cleanup=fn=>{try{fn();}catch(error){errors.push(error);}};
  state.prepared.clear();state.groups.clear();state.outputs.clear();state.processing.clear();
  cleanup(state.removeRevocation);for(const clean of state.processingCleanup)cleanup(clean);state.processingCleanup.clear();
  this.#jobs.delete(state.job.id);return errors;
 }
 dispose(){
  this.#generation++;this.#preparing?.controller.abort();const errors=[];
  for(const state of this.#jobs.values()){
   // Physical cancellation and private-data retirement must survive host cleanup errors.
   state.controller.abort();errors.push(...this.#retire(state));
  }
  this.#jobs.clear();if(errors.length)throw errors[0];
 }
}
