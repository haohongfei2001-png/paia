import {committedV3Generation,legacyV2Generation,mergeIncrementalV3} from './ai-incremental-v3.js';
import {isIncrementalV2} from './ai-incremental-v2.js';
import {validateIncrementalResponse,validateIncrementalChild,mergeIncrementalChildren} from './ai-incremental-v2.js';
import {AIUsageFoundation} from '../ai-usage/foundation.js';
import {localProviderDescriptor,canonical,digest,fail} from '../ai-usage/contracts.js';
import {KNOWN_PREFIX} from '../ai-usage/delta.js';
import {validOrganizeCacheProfile} from './organize-cache-qualification.js';
import {readLocalOrganizeScopeInTransaction,commitLocalOrganizeCandidateInTransaction,confirmLocalOrganizeCacheProof,releaseLocalOrganizeCacheProof,assertLocalOrganizeCacheControls,localOrganizeCacheControlsCurrent} from './ai-presentation.js';
import {bytes} from './contracts.js';
import {validateLocalOrganizeResponse} from './ai-contract.js';
// No production worker creates this explicitly configured local owner. Handles
// and response bodies never enter a new durable handoff store or public DTO.
export class LocalOrganizeSession {
 #store;#incrementalVersion;#foundation;#profile;#route;#handles=new WeakMap();#jobs=new Map();#cached=new Map();#generation=0;
 constructor(store,{resolveAuthority=null,profile=null,routeVersion=null,incrementalVersion=1}={}){
  if(![1,2,3].includes(incrementalVersion))fail('INVALID_REQUEST');this.#incrementalVersion=incrementalVersion;
  this.#store=store;this.#profile=structuredClone(profile);this.#route=routeVersion;
  this.#foundation=new AIUsageFoundation(store,{resolveAuthority,organizeClosure:async(t,r)=>{
   const state=this.#jobs.get(r.logicalJobId);if(!state?.multi||!state.validated||canonical(r.childIds)!==canonical(state.job.childIds)||canonical(r.units)!==canonical(state.coverage)||state.outputs.size!==r.childIds.length)fail('STALE_BASE');
   await this.#assertProvenance(t,state);releaseLocalOrganizeCacheProof(store,state.cacheProof);const validated=state.validated,committed=await commitLocalOrganizeCandidateInTransaction(store,t,{prepared:state.prepared,result:validated,candidateId:r.logicalJobId,manifestDigest:state.manifestDigest,baseGeneration:state.baseGeneration,qualification:{variant:'atomic-v3',jobId:r.logicalJobId,childIds:r.childIds,childCoverage:r.children,coverage:r.units,items:state.items,children:r.childIds.map(id=>state.provenance.get(id)),profile:this.#profile,isCurrent:()=>this.#jobs.get(r.logicalJobId)===state&&state.validated===validated&&state.outputs.size===r.childIds.length}});state.cacheProof=committed.cacheProof;
   if(this.#jobs.get(r.logicalJobId)!==state)fail('UNAVAILABLE');return {committed:true,coverage:r.units,isCurrent:()=>this.#jobs.get(r.logicalJobId)===state&&state.outputs.size===r.childIds.length};
  },committers:{organize:async(t,r)=>{
   const state=this.#jobs.get(r.logicalJobId);if(!state?.validated||state.job.childIds[0]!==r.childOperationId||canonical(r.units)!==canonical(state.coverage))fail('STALE_BASE');
   await this.#assertProvenance(t,state);releaseLocalOrganizeCacheProof(store,state.cacheProof);const committed=await commitLocalOrganizeCandidateInTransaction(store,t,{prepared:state.prepared,result:state.validated,candidateId:r.childOperationId,manifestDigest:state.manifestDigest,baseGeneration:state.baseGeneration,qualification:{jobId:r.logicalJobId,childId:r.childOperationId,coverage:r.units,profile:this.#profile}});state.cacheProof=committed.cacheProof;
   return {committed:true,coverage:r.units,isCurrent:()=>this.#jobs.get(r.logicalJobId)===state&&!!state.validated};
  }}});
 }
 async #completed(state,result){if(this.#jobs.get(state.job.id)!==state)releaseLocalOrganizeCacheProof(this.#store,state.cacheProof);else if(result.state==='COMMITTED')await confirmLocalOrganizeCacheProof(this.#store,state.cacheProof);return result;}
 #state(handle){const state=this.#handles.get(handle);if(!state)fail('UNAVAILABLE');return state;}
 async prepare({topicId,children=1,refreshStyle=false}={}){
  const generation=this.#generation;if(typeof refreshStyle!=='boolean'||refreshStyle&&this.#incrementalVersion!==3)fail('INVALID_REQUEST');
  if(this.#incrementalVersion===1&&children!==1)return {state:'DEFER',reason:'multiple_children_not_supported'};
  if(!Number.isInteger(children)||children<1||children>4)fail('INVALID_REQUEST');
  if(!validOrganizeCacheProfile(this.#profile)||typeof this.#route!=='string'||!this.#route.length||this.#route.length>200)fail('UNAVAILABLE');
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
  const coverage=data.coverage;if(data.prepared.incremental&&!coverage.length)return Object.freeze({state:'NO_DELTA',jobId:null});
  if(data.cacheAuthority){if(!localOrganizeCacheControlsCurrent(this.#store,data.prepared))fail('STALE_BASE');if(this.#jobs.size+this.#cached.size>=8&&!this.#cached.has(topicId))fail('UNAVAILABLE');const prior=this.#cached.get(topicId);if(prior)this.#handles.delete(prior.handle);const handle=Object.freeze({state:'CACHED',jobId:null}),state={...data,handle,cached:true,running:false};this.#handles.set(handle,state);this.#cached.set(topicId,state);return handle;}
  let partitions=null;
  if(children>1){
   const groups=data.prepared.inputs.map(input=>{const keys=JSON.parse(data.prepared.topic.versions[input.ref])[2].map(x=>JSON.stringify(['input',x[0]]));const entry=JSON.stringify(['library_entry',input.ref]);if(data.items.some(i=>i.key===entry))keys.push(entry);return {inputs:[input],keys:new Set(keys)};});
   for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;)if([...groups[j].keys].some(k=>groups[i].keys.has(k))){groups[i].inputs.push(...groups[j].inputs);for(const k of groups[j].keys)groups[i].keys.add(k);groups.splice(j,1);j=i+1;}else j++;
   partitions=[];for(const group of groups){if(group.inputs.length>this.#store.organizerBudget.limits.maxInputs||bytes(group.inputs.map(i=>i.text))>this.#store.organizerBudget.limits.maxContentBytes)fail('BUDGET_EXCEEDED');let tail=partitions.at(-1);if(!tail||tail.inputs.length+group.inputs.length>this.#store.organizerBudget.limits.maxInputs||bytes([...tail.inputs,...group.inputs].map(i=>i.text))>this.#store.organizerBudget.limits.maxContentBytes){tail={inputs:[],keys:new Set()};partitions.push(tail);}tail.inputs.push(...group.inputs);for(const k of group.keys)tail.keys.add(k);}
   if(partitions.length<2||partitions.length>children)fail('BUDGET_EXCEEDED');
   for(const p of partitions)p.coverage=coverage.filter(u=>p.keys.has(u.key));
  }
  const job=await this.#foundation.plan({...(partitions?{commitMode:'organize-atomic-v1',children:partitions.map(p=>p.coverage)}:{}),type:'AI_ORGANIZE',intent:'explicit',items:data.items,coverage,contractVersion:this.#profile.contractVersion,routeVersion:await digest(this.#incrementalVersion===3?[this.#route,this.#profile,data.prepared.proof]:this.#incrementalVersion>=2?[this.#route,this.#profile,data.prepared.evidenceVersion,data.prepared.topic.incrementalVersions]:[this.#route,this.#profile,data.prepared.evidenceVersion]),organizeStyle:data.prepared.style});
  if(this.#generation!==generation)fail('UNAVAILABLE');
  const handle=Object.freeze({state:job.state,jobId:job.id});if(!job.id)return handle;
  if(this.#jobs.has(job.id))return this.#jobs.get(job.id).handle;
  if(this.#jobs.size+this.#cached.size>=8)fail('UNAVAILABLE');
  const stored=partitions?await this.#foundation.read(t=>this.#foundation.job(t,job.id)):null;
  const ordered=partitions?stored.childCoverage.map(c=>partitions.find(p=>canonical(p.coverage)===canonical(c))):null;if(ordered?.some(p=>!p))fail('STALE_BASE');
  if(this.#generation!==generation)fail('UNAVAILABLE');
  if(this.#jobs.has(job.id))return this.#jobs.get(job.id).handle;
  if(this.#jobs.size+this.#cached.size>=8)fail('UNAVAILABLE');
  const state={...data,coverage,job,handle,multi:!!partitions,partitions:ordered,outputs:new Map(),provenance:new Map(),validated:null,running:false};this.#handles.set(handle,state);this.#jobs.set(job.id,state);return handle;
 }
 async assemble(handle,childId=null){
  const state=this.#state(handle);if(state.cached)fail('UNAVAILABLE');return this.#foundation.read(async t=>{
   const job=await this.#foundation.job(t,state.job.id);await this.#foundation.current(t,job);
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
  const state=this.#state(handle);if(state.running)fail('REQUEST_ALREADY_IN_FLIGHT');state.running=true;
  try{
   if(state.cached){
    const result=await this.#readCached(state);
    // The transaction/read promise may settle after disposal or a local control
    // update. Fence the actual public return, not only its IDB callback.
    if(this.#handles.get(state.handle)!==state||this.#cached.get(state.prepared.topic.id)!==state)fail('UNAVAILABLE');
    if(!localOrganizeCacheControlsCurrent(this.#store,state.prepared))fail('STALE_BASE');
    return result;
   }
   if(state.multi)return await this.#runMulti(state,provider);
   const status=await this.#foundation.status(state.job.id);if(status.state==='COMMITTED')return this.#completed(state,status);
   if(status.state==='RESPONSE_RECORDED'&&state.validated)return await this.#completed(state,await this.#foundation.commitFacet(state.job.id,state.job.childIds[0],{facet:'organize',units:state.coverage}));
   if(!['PLANNED','RESERVED'].includes(status.state))fail('OUTCOME_UNKNOWN');
   const descriptor=localProviderDescriptor(provider);await this.assemble(handle);
   await this.#foundation.reserve(state.job.id,{reservationId:'local-organize:'+state.job.childIds[0],executionKind:descriptor.executionKind});
   const dispatched=await this.#foundation.dispatch(state.job.id,state.job.childIds[0],{describe:()=>descriptor,execute:async metadata=>{
    if(canonical(metadata.coverage)!==canonical(state.coverage))fail('STALE_BASE');
    const request=await this.assemble(handle),payload={...request,usage:metadata};if(bytes(payload)>this.#store.organizerBudget.limits.maxRequestBytes)fail('BUDGET_EXCEEDED');
    const response=await provider.execute(Object.freeze(structuredClone(payload)));
    if(bytes(response)>this.#store.organizerBudget.limits.maxOutputBytes)fail('BUDGET_EXCEEDED');if(this.#incrementalVersion===3){const blocks=validateIncrementalChild(response,request,state.prepared);state.outputs.set(state.job.childIds[0],blocks);state.provenance.set(state.job.childIds[0],{childId:state.job.childIds[0],operationReceiptId:state.job.childIds[0],payloadDigest:await digest(payload),validatedOutputDigest:await digest(blocks)});await this.#finishV3(state);}else{state.validated=this.#incrementalVersion===2?validateIncrementalResponse(response,request,state.prepared):validateLocalOrganizeResponse(response,request);if(this.#incrementalVersion===2)state.manifestDigest=await digest(state.validated);}
    return {accepted:true,operationReceiptId:state.job.childIds[0]};
   }});
   if(dispatched.state!=='RESPONSE_RECORDED')return dispatched;
   return await this.#completed(state,await this.#foundation.commitFacet(state.job.id,state.job.childIds[0],{facet:'organize',units:state.coverage}));
  }finally{state.running=false;}
 }
 async #runMulti(state,provider){
  const status=await this.#foundation.status(state.job.id);
  const children=state.job.childIds.map((childId,i)=>({childId,units:state.partitions[i].coverage}));
  if(status.state==='COMMITTED')return this.#completed(state,await this.#foundation.commitOrganizeClosure(state.job.id,{children}));
  if(status.attempts.some(r=>r.attemptCount>0&&!state.outputs.has(r.childId)))fail('OUTCOME_UNKNOWN');
  const descriptor=localProviderDescriptor(provider);
  // Preflight every physical payload before the first dispatch; execute still
  // requalifies and checks the exact payload again after intervening awaits.
  for(const [i,id]of state.job.childIds.entries()){const request=await this.assemble(state.handle,id),usage=await this.#foundation.read(async t=>{const job=await this.#foundation.job(t,state.job.id);await this.#foundation.current(t,job);return this.#foundation.childRequest(job,i);});if(bytes({...request,usage})>this.#store.organizerBudget.limits.maxRequestBytes)fail('BUDGET_EXCEEDED');}
  if(['PLANNED','RESERVED'].includes(status.state))await this.#foundation.reserve(state.job.id,{reservationId:'local-organize:'+state.job.id,executionKind:descriptor.executionKind});
  for(const [i,childId]of state.job.childIds.entries()){
   if(state.outputs.has(childId))continue;
   if(this.#jobs.get(state.job.id)!==state)fail('UNAVAILABLE');
   const dispatched=await this.#foundation.dispatch(state.job.id,childId,{describe:()=>descriptor,execute:async metadata=>{
    if(canonical(metadata.coverage)!==canonical(state.partitions[i].coverage))fail('STALE_BASE');
    const request=await this.assemble(state.handle,childId),payload={...request,usage:metadata};if(bytes(payload)>this.#store.organizerBudget.limits.maxRequestBytes)fail('BUDGET_EXCEEDED');
    const response=await provider.execute(Object.freeze(structuredClone(payload)));if(bytes(response)>this.#store.organizerBudget.limits.maxOutputBytes)fail('BUDGET_EXCEEDED');
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
  const job=await this.#foundation.job(t,state.job.id);if(canonical(job.childIds)!==canonical(state.job.childIds)||canonical(job.coverage)!==canonical(state.coverage)||state.provenance.size!==job.childIds.length)fail('STALE_BASE');
  for(const id of job.childIds){const receipt=await t.get('organizerUsage','aiu:attempt:'+id),p=state.provenance.get(id);if(receipt?.jobId!==job.id||receipt.childId!==id||receipt.state!=='RESPONSE_RECORDED'||receipt.operationReceiptId!==p?.operationReceiptId)fail('STALE_BASE');}
  if(this.#jobs.get(state.job.id)!==state)fail('UNAVAILABLE');
 }
 dispose(){this.#generation++;for(const state of this.#jobs.values())releaseLocalOrganizeCacheProof(this.#store,state.cacheProof);this.#handles=new WeakMap();this.#jobs.clear();this.#cached.clear();}
}
