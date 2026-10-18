import {observeRepositoryWriteFence,requireRepositoryWriteFence} from '../idb-repository.js';
import {requireOrganizeServiceClient} from '../ai-usage/organize-service-client.js';
import {committedV3Generation,legacyV2Generation,mergeIncrementalV3} from './ai-incremental-v3.js';
import {isIncrementalV2} from './ai-incremental-v2.js';
import {validateIncrementalResponse,validateIncrementalChild,mergeIncrementalChildren} from './ai-incremental-v2.js';
import {AIUsageFoundation} from '../ai-usage/foundation.js';
import {localProviderDescriptor,canonical,digest,fail} from '../ai-usage/contracts.js';
import {KNOWN_PREFIX} from '../ai-usage/delta.js';
import {validOrganizeCacheProfile} from './organize-cache-qualification.js';
import {readLocalOrganizeScopeInTransaction,commitLocalOrganizeCandidateInTransaction,confirmLocalOrganizeCacheProof,releaseLocalOrganizeCacheProof,localOrganizeProofFullyAdopted,confirmLocalOrganizeLifecycle,releaseLocalOrganizeLifecycle,assertLocalOrganizeCacheControls,localOrganizeCacheControlsCurrent} from './ai-presentation.js';
import {bytes} from './contracts.js';
import {validateLocalOrganizeResponse} from './ai-contract.js';
// Immutable original job identity only; execution state and spend stay owned by Foundation.
const serviceJobBinding=job=>canonical(Object.fromEntries(['id','kind','version','type','commitMode','organizeRequestKey','organizeStyle','organizeSemanticKey','items','coverage','childCoverage','childIds','scopeFingerprint','contractVersion','routeVersion','authority','flightId','sourceRecordIds'].filter(k=>Object.hasOwn(job,k)).map(k=>[k,job[k]])));
// The configured original worker uses this same local adoption owner. Handles
// and response bodies never enter a new durable handoff store or public DTO.
export class LocalOrganizeSession {
 #service;#store;#incrementalVersion;#foundation;#profile;#route;#handles=new WeakMap();#jobs=new Map();#cached=new Map();#generation=0;
 constructor(store,{resolveAuthority=null,profile=null,routeVersion=null,incrementalVersion=1,service=null}={}){
  if(![1,2,3].includes(incrementalVersion))fail('INVALID_REQUEST');this.#incrementalVersion=incrementalVersion;
  this.#service=service===null?null:requireOrganizeServiceClient(service);
  this.#store=store;this.#profile=structuredClone(profile);this.#route=routeVersion;
  this.#foundation=new AIUsageFoundation(store,{resolveAuthority,organizeClosure:async(t,r)=>{
   const state=this.#jobs.get(r.logicalJobId);if(!state?.multi||!state.validated||canonical(r.childIds)!==canonical(state.job.childIds)||canonical(r.units)!==canonical(state.coverage)||state.outputs.size!==r.childIds.length)fail('STALE_BASE');
   await this.#assertProvenance(t,state);releaseLocalOrganizeCacheProof(store,state.cacheProof);const validated=state.validated,committed=await commitLocalOrganizeCandidateInTransaction(store,t,{prepared:state.prepared,result:validated,candidateId:r.logicalJobId,manifestDigest:state.manifestDigest,baseGeneration:state.baseGeneration,qualification:{variant:'atomic-v3',jobId:r.logicalJobId,childIds:r.childIds,childCoverage:r.children,coverage:r.units,items:state.items,children:r.childIds.map(id=>state.provenance.get(id)),profile:this.#profile,isCurrent:()=>this.#jobs.get(r.logicalJobId)===state&&state.validated===validated&&state.outputs.size===r.childIds.length}});state.cacheProof=committed.cacheProof;state.lifecycleToken=committed.lifecycleToken;state.lifecycleKey=committed.lifecycleKey;
   if(this.#jobs.get(r.logicalJobId)!==state)fail('UNAVAILABLE');return {committed:true,coverage:r.units,isCurrent:()=>this.#jobs.get(r.logicalJobId)===state&&state.outputs.size===r.childIds.length};
  },committers:{organize:async(t,r)=>{
   const state=this.#jobs.get(r.logicalJobId);if(!state?.validated||state.job.childIds[0]!==r.childOperationId||canonical(r.units)!==canonical(state.coverage))fail('STALE_BASE');
   await this.#assertProvenance(t,state);releaseLocalOrganizeCacheProof(store,state.cacheProof);const committed=await commitLocalOrganizeCandidateInTransaction(store,t,{prepared:state.prepared,result:state.validated,candidateId:r.childOperationId,manifestDigest:state.manifestDigest,baseGeneration:state.baseGeneration,qualification:{jobId:r.logicalJobId,childId:r.childOperationId,coverage:r.units,profile:this.#profile}});state.cacheProof=committed.cacheProof;state.lifecycleToken=committed.lifecycleToken;state.lifecycleKey=committed.lifecycleKey;
   return {committed:true,coverage:r.units,isCurrent:()=>this.#jobs.get(r.logicalJobId)===state&&!!state.validated};
  }}});
 }
 async #completed(state,result){if(result.state==='COMMITTED')state.completed=true;if(this.#jobs.get(state.job.id)!==state){releaseLocalOrganizeCacheProof(this.#store,state.cacheProof);releaseLocalOrganizeLifecycle(this.#store,state.lifecycleToken);}else if(result.state==='COMMITTED'){await confirmLocalOrganizeCacheProof(this.#store,state.cacheProof);await confirmLocalOrganizeLifecycle(this.#store,state.lifecycleToken,state.lifecycleKey);delete state.lifecycleKey;}return result;}
 #state(handle){const state=this.#handles.get(handle);if(!state)fail('UNAVAILABLE');return state;}
 async #retireAdopted(){
  const generation=this.#generation;
  for(const [id,state]of [...this.#jobs])if(!state.running&&localOrganizeProofFullyAdopted(this.#store,state.lifecycleToken,id)){
   const job=await this.#foundation.status(id);if(generation!==this.#generation)fail('UNAVAILABLE');if(state.running||this.#jobs.get(id)!==state||job.state!=='COMMITTED')continue;
   this.#handles.set(state.handle,{retired:true,jobId:id,generation:this.#generation});this.#jobs.delete(id);
   releaseLocalOrganizeCacheProof(this.#store,state.cacheProof);releaseLocalOrganizeLifecycle(this.#store,state.lifecycleToken);
  }
 }
 async scope({topicId}={}){
  if(!this.#service||!validOrganizeCacheProfile(this.#profile))fail('AI_SERVICE_UNAVAILABLE');
  await this.#store.aiPresentationStatus({topicId});
  const prepared=await this.#foundation.read(t=>readLocalOrganizeScopeInTransaction(this.#store,t,topicId,this.#profile,this.#incrementalVersion,4,false));
  return {available:true,topicId,scopeBinding:await digest([prepared.proof,this.#profile,this.#route]),eligibleCount:prepared.inputs.length,maxRequests:4,complete:true,blockedReason:null};
 }
 async prepare({topicId,children=1,refreshStyle=false,scopeBinding=null}={}){
  const generation=this.#generation;
  if(this.#service)await this.#service.recover(this.#foundation,topicId,{retainJob:id=>{const state=this.#jobs.get(id);return !!state&&(state.running||!!state.validated&&!state.completed);},isCurrent:()=>this.#generation===generation});
  if(typeof refreshStyle!=='boolean'||refreshStyle&&this.#incrementalVersion!==3)fail('INVALID_REQUEST');
  if(this.#incrementalVersion===1&&children!==1)return {state:'DEFER',reason:'multiple_children_not_supported'};
  const automatic=children==='auto'&&!!this.#service;if(automatic)children=4;
  if(!Number.isInteger(children)||children<1||children>4)fail('INVALID_REQUEST');
  if(!validOrganizeCacheProfile(this.#profile)||typeof this.#route!=='string'||!this.#route.length||this.#route.length>200)fail('UNAVAILABLE');
  await this.#retireAdopted();if(generation!==this.#generation)fail('UNAVAILABLE');
  if(this.#jobs.size+this.#cached.size>=8&&!this.#cached.has(topicId))fail('UNAVAILABLE');
  await this.#store.aiPresentationStatus({topicId}); // Existing migration/readability owner.
  const data=await this.#foundation.read(async t=>{
   const prepared=await readLocalOrganizeScopeInTransaction(this.#store,t,topicId,this.#profile,this.#incrementalVersion,children,refreshStyle),items=[];
   const keys=new Set((prepared.cachePresentation?Object.keys(prepared.topic.inputVersions):prepared.incremental?prepared.inputs.flatMap(i=>JSON.parse(prepared.topic.versions[i.ref])[2].map(x=>x[0])):Object.keys(prepared.topic.inputVersions)).map(id=>JSON.stringify(['input',id])));
   for(const input of prepared.cachePresentation?prepared.topic.entries.map(e=>({ref:e.id})):prepared.inputs){const key=JSON.stringify(['library_entry',input.ref]),known=await t.get('meta',KNOWN_PREFIX+key);if(known)keys.add(key);else if(!JSON.parse(prepared.topic.versions[input.ref])[2]?.length)fail('STALE_BASE');}
   if(!keys.size&&prepared.incremental)return {prepared,items,coverage:[],cacheAuthority:null};if(!keys.size||keys.size>100)fail('BUDGET_EXCEEDED');
   for(const key of keys){const known=await t.get('meta',KNOWN_PREFIX+key);if(!known||known.descriptor.removed||known.descriptor.fenceOnly)fail('STALE_BASE');items.push({key:known.descriptor.key,signature:known.signature,descriptor:known.descriptor});}
   const coverage=items.map(i=>({key:i.key,facet:'organize',scope:topicId})).sort((a,b)=>canonical([a.key,a.facet,a.scope]).localeCompare(canonical([b.key,b.facet,b.scope])));
   let cacheAuthority=null;
   if(prepared.cachePresentation){cacheAuthority=await this.#foundation.authority(t,'AI_ORGANIZE',{items,coverage});await this.#foundation.current(t,{type:'AI_ORGANIZE',items,coverage,organizeStyle:prepared.style,authority:cacheAuthority,cancelEpoch:0});const current=await readLocalOrganizeScopeInTransaction(this.#store,t,topicId,this.#profile,this.#incrementalVersion,prepared.physicalChildren,prepared.refreshStyle);if(current.proof!==prepared.proof||!current.cachePresentation)fail('STALE_BASE');if(canonical(await this.#foundation.authority(t,'AI_ORGANIZE',{items,coverage}))!==canonical(cacheAuthority))fail('CANCELLED');await assertLocalOrganizeCacheControls(this.#store,t,prepared);}
   return {prepared,items,cacheAuthority,coverage};
  });
  if(this.#generation!==generation)fail('UNAVAILABLE');
  if(scopeBinding!==null&&scopeBinding!==await digest([data.prepared.proof,this.#profile,this.#route]))fail('STALE_BASE');
  const coverage=data.coverage;if(data.prepared.incremental&&!coverage.length)return Object.freeze({state:'NO_DELTA',jobId:null});
  if(data.cacheAuthority){if(!localOrganizeCacheControlsCurrent(this.#store,data.prepared))fail('STALE_BASE');if(this.#jobs.size+this.#cached.size>=8&&!this.#cached.has(topicId))fail('UNAVAILABLE');const prior=this.#cached.get(topicId);if(prior)this.#handles.delete(prior.handle);const handle=Object.freeze({state:'CACHED',jobId:null}),state={...data,handle,cached:true,running:false};this.#handles.set(handle,state);this.#cached.set(topicId,state);return handle;}
  if(this.#service){
   // A fresh explicit click may retry only an already validated local CAS.
   // Match the original full proof; changed human state never borrows it.
   const retained=[...this.#jobs.values()].find(s=>s.validated&&!s.running&&!s.controller.signal.aborted&&s.prepared.proof===data.prepared.proof);
   if(retained)return retained.handle;
   await this.#service.assertCanPlan(this.#foundation,topicId);
  }
  let partitions=null;
  if(children>1&&(!automatic||data.prepared.inputs.length>this.#store.organizerBudget.limits.maxInputs||bytes(data.prepared.inputs.map(i=>i.text))>this.#store.organizerBudget.limits.maxContentBytes)){
   const groups=data.prepared.inputs.map(input=>{const keys=JSON.parse(data.prepared.topic.versions[input.ref])[2].map(x=>JSON.stringify(['input',x[0]]));const entry=JSON.stringify(['library_entry',input.ref]);if(data.items.some(i=>i.key===entry))keys.push(entry);return {inputs:[input],keys:new Set(keys)};});
   for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;)if([...groups[j].keys].some(k=>groups[i].keys.has(k))){groups[i].inputs.push(...groups[j].inputs);for(const k of groups[j].keys)groups[i].keys.add(k);groups.splice(j,1);j=i+1;}else j++;
   partitions=[];for(const group of groups){if(group.inputs.length>this.#store.organizerBudget.limits.maxInputs||bytes(group.inputs.map(i=>i.text))>this.#store.organizerBudget.limits.maxContentBytes)fail('BUDGET_EXCEEDED');let tail=partitions.at(-1);if(!tail||tail.inputs.length+group.inputs.length>this.#store.organizerBudget.limits.maxInputs||bytes([...tail.inputs,...group.inputs].map(i=>i.text))>this.#store.organizerBudget.limits.maxContentBytes){tail={inputs:[],keys:new Set()};partitions.push(tail);}tail.inputs.push(...group.inputs);for(const k of group.keys)tail.keys.add(k);}
   if(partitions.length<2||partitions.length>children)fail('BUDGET_EXCEEDED');
   for(const p of partitions)p.coverage=coverage.filter(u=>p.keys.has(u.key));
  }
  const organizeRequestKey=this.#service?await digest([this.#route,this.#profile,data.prepared.proof]):null;
  const job=await this.#foundation.plan({...(partitions?{commitMode:'organize-atomic-v1',children:partitions.map(p=>p.coverage)}:{}),type:'AI_ORGANIZE',intent:'explicit',items:data.items,coverage,contractVersion:this.#profile.contractVersion,...(this.#service?{routeVersion:this.#route,organizeRequestKey}:{routeVersion:await digest(this.#incrementalVersion===3?[this.#route,this.#profile,data.prepared.proof]:this.#incrementalVersion>=2?[this.#route,this.#profile,data.prepared.evidenceVersion,data.prepared.topic.incrementalVersions]:[this.#route,this.#profile,data.prepared.evidenceVersion])}),organizeStyle:data.prepared.style});
  if(this.#generation!==generation)fail('UNAVAILABLE');
  const handle=Object.freeze({state:job.state,jobId:job.id});if(!job.id)return handle;
  if(this.#jobs.has(job.id))return this.#jobs.get(job.id).handle;
  if(this.#jobs.size+this.#cached.size>=8)fail('UNAVAILABLE');
  const stored=partitions||this.#service?await this.#foundation.read(t=>this.#foundation.job(t,job.id)):null;
  const ordered=partitions?stored.childCoverage.map(c=>partitions.find(p=>canonical(p.coverage)===canonical(c))):null;if(ordered?.some(p=>!p))fail('STALE_BASE');
  if(this.#generation!==generation)fail('UNAVAILABLE');
  if(this.#jobs.has(job.id))return this.#jobs.get(job.id).handle;
  if(this.#jobs.size+this.#cached.size>=8)fail('UNAVAILABLE');
  const state={...data,coverage,job,handle,organizeRequestKey,serviceBinding:this.#service?serviceJobBinding(stored):null,multi:!!partitions,partitions:ordered,outputs:new Map(),provenance:new Map(),validated:null,running:false,controller:new AbortController()};this.#handles.set(handle,state);this.#jobs.set(job.id,state);return handle;
 }
 #assertServiceBinding(job,state){if(this.#service&&(job.organizeRequestKey!==state.organizeRequestKey||job.routeVersion!==this.#route||job.contractVersion!==this.#profile.contractVersion||serviceJobBinding(job)!==state.serviceBinding))fail('RESULT_BINDING_MISMATCH');}
 async assemble(handle,childId=null){
  const state=this.#state(handle);if(state.cached||state.retired)fail('UNAVAILABLE');return this.#foundation.read(async t=>{
   const job=await this.#foundation.job(t,state.job.id);this.#assertServiceBinding(job,state);await this.#foundation.current(t,job);
   const current=await readLocalOrganizeScopeInTransaction(this.#store,t,state.prepared.topic.id,this.#profile,this.#incrementalVersion,state.prepared.physicalChildren,state.prepared.refreshStyle);if(current.proof!==state.prepared.proof)fail('STALE_BASE');
   if((!state.multi&&job.childIds.length!==1)||job.committedCoverage.length)fail('STALE_BASE');
   const index=state.multi?job.childIds.indexOf(childId):0;if(index<0)fail('INVALID_REQUEST');const inputs=state.multi?state.partitions[index].inputs:current.inputs;
   const request={topicId:current.topic.id,style:current.style,inputs,profile:this.#profile,...(current.incremental?{responseVersion:2}: {})};if(bytes(request)>this.#store.organizerBudget.limits.maxRequestBytes)fail('BUDGET_EXCEEDED');return structuredClone(request);
  });
 }
 async #readCached(state){
  return this.#foundation.read(async t=>{
   const {items,coverage,cacheAuthority,prepared}=state;
   await this.#foundation.current(t,{type:'AI_ORGANIZE',items,coverage,organizeStyle:prepared.style,authority:cacheAuthority,cancelEpoch:0});
   const current=await readLocalOrganizeScopeInTransaction(this.#store,t,prepared.topic.id,this.#profile,prepared.incrementalVersion,prepared.physicalChildren,prepared.refreshStyle);
   if(current.proof!==prepared.proof||!current.cachePresentation)fail('STALE_BASE');
   if(canonical(await this.#foundation.authority(t,'AI_ORGANIZE',{items,coverage}))!==canonical(cacheAuthority))fail('CANCELLED');
   await assertLocalOrganizeCacheControls(this.#store,t,prepared);
   if(!localOrganizeCacheControlsCurrent(this.#store,prepared))fail('STALE_BASE');
   if(this.#handles.get(state.handle)!==state||this.#cached.get(prepared.topic.id)!==state)fail('UNAVAILABLE');
   return {state:'CACHED',jobId:null,presentation:structuredClone(current.cachePresentation)};
  });
 }
 async run(handle,provider){
  const state=this.#state(handle);
  if(state.retired){const result=await this.#foundation.read(async t=>{const job=await this.#foundation.job(t,state.jobId);await this.#foundation.current(t,job);if(job.state!=='COMMITTED')fail('STALE_BASE');return {state:'COMMITTED',jobId:state.jobId};});if(state.generation!==this.#generation||this.#handles.get(handle)!==state)fail('UNAVAILABLE');return result;}
  if(state.running)fail('REQUEST_ALREADY_IN_FLIGHT');state.running=true;
  try{
   if(state.cached){
    const result=await this.#readCached(state);
    // The transaction/read promise may settle after disposal or a local control
    // update. Fence the actual public return, not only its IDB callback.
    if(this.#handles.get(state.handle)!==state||this.#cached.get(state.prepared.topic.id)!==state)fail('UNAVAILABLE');
    if(!localOrganizeCacheControlsCurrent(this.#store,state.prepared))fail('STALE_BASE');
    return result;
   }
   if(this.#service)return await this.#runService(state);
   if(state.multi)return await this.#runMulti(state,provider);
   const status=await this.#foundation.status(state.job.id);if(status.state==='COMMITTED')return this.#completed(state,status);
   if(status.state==='RESPONSE_RECORDED'&&state.validated)return await this.#completed(state,await this.#foundation.commitFacet(state.job.id,state.job.childIds[0],{facet:'organize',units:state.coverage}));
   if(!['PLANNED','RESERVED'].includes(status.state))fail('OUTCOME_UNKNOWN');
   const descriptor=localProviderDescriptor(provider);await this.assemble(handle);
   await this.#foundation.reserve(state.job.id,{reservationId:'local-organize:'+state.job.childIds[0],executionKind:descriptor.executionKind});
   const dispatched=await this.#foundation.dispatch(state.job.id,state.job.childIds[0],{describe:()=>descriptor,execute:async metadata=>{
    if(canonical(metadata.coverage)!==canonical(state.coverage))fail('STALE_BASE');
    const request=await this.assemble(handle),payload={...request,usage:metadata};if(bytes(payload)>this.#store.organizerBudget.limits.maxRequestBytes)fail('BUDGET_EXCEEDED');
    const response=await this.#executeBounded(state,provider,payload);
    if(bytes(response)>this.#store.organizerBudget.limits.maxOutputBytes)fail('BUDGET_EXCEEDED');if(this.#incrementalVersion===3){const blocks=validateIncrementalChild(response,request,state.prepared);state.outputs.set(state.job.childIds[0],blocks);state.provenance.set(state.job.childIds[0],{childId:state.job.childIds[0],operationReceiptId:state.job.childIds[0],payloadDigest:await digest(payload),validatedOutputDigest:await digest(blocks)});await this.#finishV3(state);}else{state.validated=this.#incrementalVersion===2?validateIncrementalResponse(response,request,state.prepared):validateLocalOrganizeResponse(response,request);if(this.#incrementalVersion===2)state.manifestDigest=await digest(state.validated);}
    return {accepted:true,operationReceiptId:state.job.childIds[0]};
   }});
   if(dispatched.state!=='RESPONSE_RECORDED')return dispatched;
   return await this.#completed(state,await this.#foundation.commitFacet(state.job.id,state.job.childIds[0],{facet:'organize',units:state.coverage}));
  }finally{state.running=false;}
 }
 async #serviceCurrent(state){
  if(this.#jobs.get(state.job.id)!==state||state.controller.signal.aborted)fail('CANCELLED');
  await this.assemble(state.handle,state.job.childIds[0]);
  if(this.#jobs.get(state.job.id)!==state||state.controller.signal.aborted||!localOrganizeCacheControlsCurrent(this.#store,state.prepared))fail('CANCELLED');
 }
 async #runService(state){
  let operation=null;
  const children=state.job.childIds.map((childId,i)=>({childId,units:state.multi?state.partitions[i].coverage:state.coverage}));
  const commit=()=>state.multi?this.#foundation.commitOrganizeClosure(state.job.id,{children}):this.#foundation.commitFacet(state.job.id,state.job.childIds[0],{facet:'organize',units:state.coverage});
  const report=async()=>{try{await this.#service.report(this.#foundation,state.job);}catch{/* Original metadata stays pending, never repeat provider work. */}};
  await this.#foundation.read(async t=>this.#assertServiceBinding(await this.#foundation.job(t,state.job.id),state));
  const prior=await this.#foundation.status(state.job.id);
  if(prior.state==='COMMITTED'){await report();return this.#completed(state,prior);}
  if(state.validated){const result=await this.#completed(state,await commit());await report();return result;}
  if(prior.state!=='PLANNED'||prior.attempts.length)fail('OUTCOME_UNKNOWN');
  try{
   const payloads=[];
   for(const [i,childId]of state.job.childIds.entries()){
    const request=await this.assemble(state.handle,childId),usage=await this.#foundation.read(async t=>{const j=await this.#foundation.job(t,state.job.id);await this.#foundation.current(t,j);return this.#foundation.childRequest(j,i);}),payload={...request,usage};
    if(bytes(payload)>this.#store.organizerBudget.limits.maxRequestBytes)fail('BUDGET_EXCEEDED');payloads.push(payload);
   }
   operation=await this.#service.prepare(this.#foundation,state.job,payloads,{topicId:state.prepared.topic.id,assertCurrent:()=>this.#serviceCurrent(state),isCurrent:()=>this.#jobs.get(state.job.id)===state&&!state.controller.signal.aborted,
    assertBeforeSend:async()=>{const repository=this.#store.repository,token=observeRepositoryWriteFence(repository);await this.#serviceCurrent(state);return ()=>{if(this.#store.repository!==repository||state.controller.signal.aborted||!localOrganizeCacheControlsCurrent(this.#store,state.prepared))fail('STALE_BASE');requireRepositoryWriteFence(repository,token);};}
   });
   for(const [i,childId]of state.job.childIds.entries()){
    await this.#serviceCurrent(state);
    const response=await this.#foundation.dispatch(state.job.id,childId,operation.providers[i],{signal:state.controller.signal,timeoutMs:this.#store.organizerBudget.limits.timeoutMs});
    if(response.state!=='RESPONSE_RECORDED'){await this.#foundation.cancelServer(state.job.id);await report();return await this.#foundation.status(state.job.id);}
    await this.#serviceCurrent(state);
    if(bytes(response.value)>this.#store.organizerBudget.limits.maxOutputBytes)fail('BUDGET_EXCEEDED');
    const blocks=validateIncrementalChild(response.value,payloads[i],state.prepared),status=await this.#foundation.status(state.job.id),receipt=status.attempts.find(r=>r.childId===childId);
    if(receipt?.state!=='RESPONSE_RECORDED'||receipt.executionKind!=='server-backed'||!receipt.operationReceiptId)fail('OUTCOME_UNKNOWN');
    state.outputs.set(childId,blocks);state.provenance.set(childId,{childId,operationReceiptId:receipt.operationReceiptId,payloadDigest:await digest(payloads[i]),validatedOutputDigest:await digest(blocks)});
   }
   await this.#serviceCurrent(state);await this.#finishV3(state);
  }catch(error){try{await this.#foundation.cancelServer(state.job.id);}catch{/* Keep original UNKNOWN accounting. */}await report();throw error;}finally{operation?.dispose();}
  // Failed local CAS may retry only this retained validated result; do not
  // cancel/erase it or mint another physical child on a storage failure.
  const result=await this.#completed(state,await commit());await report();return result;
 }
 async stop(handle){const state=this.#state(handle);state.controller?.abort();if(state.job?.id)return this.#service?this.#foundation.cancelServer(state.job.id):this.#foundation.cancel(state.job.id);}
 async status(handle){const state=this.#state(handle);return state.job?.id?this.#foundation.status(state.job.id):{state:state.cached?'CACHED':'NO_DELTA',attempts:[]};}
 // Stop only the physical provider await; Foundation owns durable UNKNOWN
 // accounting. A late response has no path back into validation or adoption.
 async #executeBounded(state,provider,payload){
  if(this.#jobs.get(state.job.id)!==state||state.controller.signal.aborted)fail('UNAVAILABLE');
  const timeoutMs=this.#store.organizerBudget.limits.timeoutMs;
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1)fail('UNAVAILABLE');
  const controller=new AbortController();let timer,abort;
  const stopped=new Promise((_,reject)=>{abort=()=>{controller.abort();reject(Object.assign(Error('ORGANIZE_STOPPED'),{code:'OUTCOME_UNKNOWN'}));};});
  state.controller.signal.addEventListener('abort',abort,{once:true});
  if(state.controller.signal.aborted)abort();timer=setTimeout(abort,timeoutMs);
  try{
   const work=Promise.resolve().then(()=>{if(this.#jobs.get(state.job.id)!==state||state.controller.signal.aborted)fail('UNAVAILABLE');return provider.execute(Object.freeze(structuredClone(payload)),Object.freeze({signal:controller.signal,timeoutMs}));});
   const value=await Promise.race([work,stopped]);
   if(this.#jobs.get(state.job.id)!==state||state.controller.signal.aborted)fail('UNAVAILABLE');
   return value;
  }finally{clearTimeout(timer);state.controller.signal.removeEventListener('abort',abort);}
 }
 async #runMulti(state,provider){
  const status=await this.#foundation.status(state.job.id);
  const children=state.job.childIds.map((childId,i)=>({childId,units:state.partitions[i].coverage}));
  if(status.state==='COMMITTED')return this.#completed(state,await this.#foundation.commitOrganizeClosure(state.job.id,{children}));
  if(status.attempts.some(r=>r.attemptCount>0&&!state.outputs.has(r.childId)))fail('OUTCOME_UNKNOWN');
  const descriptor=localProviderDescriptor(provider);
  // Preflight every physical payload before the first dispatch; execute still
  // requalifies and checks the exact payload again after intervening awaits.
  for(const [i,id]of state.job.childIds.entries()){const request=await this.assemble(state.handle,id),usage=await this.#foundation.read(async t=>{const job=await this.#foundation.job(t,state.job.id);this.#assertServiceBinding(job,state);await this.#foundation.current(t,job);return this.#foundation.childRequest(job,i);});if(bytes({...request,usage})>this.#store.organizerBudget.limits.maxRequestBytes)fail('BUDGET_EXCEEDED');}
  if(['PLANNED','RESERVED'].includes(status.state))await this.#foundation.reserve(state.job.id,{reservationId:'local-organize:'+state.job.id,executionKind:descriptor.executionKind});
  for(const [i,childId]of state.job.childIds.entries()){
   if(state.outputs.has(childId))continue;
   if(this.#jobs.get(state.job.id)!==state)fail('UNAVAILABLE');
   const dispatched=await this.#foundation.dispatch(state.job.id,childId,{describe:()=>descriptor,execute:async metadata=>{
    if(canonical(metadata.coverage)!==canonical(state.partitions[i].coverage))fail('STALE_BASE');
    const request=await this.assemble(state.handle,childId),payload={...request,usage:metadata};if(bytes(payload)>this.#store.organizerBudget.limits.maxRequestBytes)fail('BUDGET_EXCEEDED');
    const response=await this.#executeBounded(state,provider,payload);if(bytes(response)>this.#store.organizerBudget.limits.maxOutputBytes)fail('BUDGET_EXCEEDED');
    const blocks=validateIncrementalChild(response,request,state.prepared);if(this.#jobs.get(state.job.id)!==state)fail('UNAVAILABLE');state.outputs.set(childId,blocks);if(this.#incrementalVersion===3)state.provenance.set(childId,{childId,operationReceiptId:childId,payloadDigest:await digest(payload),validatedOutputDigest:await digest(blocks)});
    return {accepted:true,operationReceiptId:childId};
   }});
   if(dispatched.state!=='RESPONSE_RECORDED')return dispatched;
  }
  if(!state.validated&&this.#incrementalVersion===3)await this.#finishV3(state);
  if(!state.validated){state.validated=mergeIncrementalChildren(state.job.childIds.flatMap(id=>state.outputs.get(id)),{topicId:state.prepared.topic.id,style:state.prepared.style,profile:this.#profile},state.prepared);state.manifestDigest=await digest(state.validated);}
  if(this.#jobs.get(state.job.id)!==state)fail('UNAVAILABLE');
  return this.#completed(state,await this.#foundation.commitOrganizeClosure(state.job.id,{children}));
 }
 async #finishV3(state){
  if(this.#jobs.get(state.job.id)!==state)fail('UNAVAILABLE');
  state.baseGeneration=isIncrementalV2(state.prepared.topic.stored)?await legacyV2Generation(state.prepared.topic.stored):null;
  const generation=await committedV3Generation({jobId:state.job.id,children:state.job.childIds.map(id=>state.provenance.get(id)),style:state.prepared.style.value,profile:this.#profile,control:state.prepared.incremental.control});
  state.validated=mergeIncrementalV3(state.job.childIds.flatMap(id=>state.outputs.get(id)),{topicId:state.prepared.topic.id,style:state.prepared.style,profile:this.#profile},state.prepared,generation,state.baseGeneration);state.manifestDigest=await digest(state.validated);
  if(this.#jobs.get(state.job.id)!==state)fail('UNAVAILABLE');
 }
 async #assertProvenance(t,state){
  if(this.#incrementalVersion!==3)return;
  const job=await this.#foundation.job(t,state.job.id);this.#assertServiceBinding(job,state);if(canonical(job.childIds)!==canonical(state.job.childIds)||canonical(job.coverage)!==canonical(state.coverage)||state.provenance.size!==job.childIds.length)fail('STALE_BASE');
  for(const id of job.childIds){const receipt=await t.get('organizerUsage','aiu:attempt:'+id),p=state.provenance.get(id);if(receipt?.jobId!==job.id||receipt.childId!==id||receipt.state!=='RESPONSE_RECORDED'||receipt.operationReceiptId!==p?.operationReceiptId)fail('STALE_BASE');}
  if(this.#jobs.get(state.job.id)!==state)fail('UNAVAILABLE');
 }
 dispose(){this.#generation++;for(const state of this.#jobs.values()){state.controller.abort();releaseLocalOrganizeCacheProof(this.#store,state.cacheProof);releaseLocalOrganizeLifecycle(this.#store,state.lifecycleToken);}this.#handles=new WeakMap();this.#jobs.clear();this.#cached.clear();}
}
