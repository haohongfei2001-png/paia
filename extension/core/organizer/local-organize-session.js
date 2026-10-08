import {validateIncrementalResponse} from './ai-incremental-v2.js';
import {AIUsageFoundation} from '../ai-usage/foundation.js';
import {localProviderDescriptor,canonical,digest,fail} from '../ai-usage/contracts.js';
import {KNOWN_PREFIX} from '../ai-usage/delta.js';
import {validOrganizeCacheProfile} from './organize-cache-qualification.js';
import {readLocalOrganizeScopeInTransaction,commitLocalOrganizeCandidateInTransaction,confirmLocalOrganizeCacheProof,releaseLocalOrganizeCacheProof,assertLocalOrganizeCacheControls} from './ai-presentation.js';
import {bytes} from './contracts.js';
import {validateLocalOrganizeResponse} from './ai-contract.js';
// No production worker creates this explicitly configured local owner. Handles
// and response bodies never enter a new durable handoff store or public DTO.
export class LocalOrganizeSession {
 #store;#incrementalVersion;#foundation;#profile;#route;#handles=new WeakMap();#jobs=new Map();#cached=new Map();#generation=0;
 constructor(store,{resolveAuthority=null,profile=null,routeVersion=null,incrementalVersion=1}={}){
  if(![1,2].includes(incrementalVersion))fail('INVALID_REQUEST');this.#incrementalVersion=incrementalVersion;
  this.#store=store;this.#profile=structuredClone(profile);this.#route=routeVersion;
  this.#foundation=new AIUsageFoundation(store,{resolveAuthority,committers:{organize:async(t,r)=>{
   const state=this.#jobs.get(r.logicalJobId);if(!state?.validated||state.job.childIds[0]!==r.childOperationId||canonical(r.units)!==canonical(state.coverage))fail('STALE_BASE');
   releaseLocalOrganizeCacheProof(store,state.cacheProof);const committed=await commitLocalOrganizeCandidateInTransaction(store,t,{prepared:state.prepared,result:state.validated,candidateId:r.childOperationId,manifestDigest:state.manifestDigest,qualification:{jobId:r.logicalJobId,childId:r.childOperationId,coverage:r.units,profile:this.#profile}});state.cacheProof=committed.cacheProof;
   return {committed:true,coverage:r.units};
  }}});
 }
 async #completed(state,result){if(this.#jobs.get(state.job.id)!==state)releaseLocalOrganizeCacheProof(this.#store,state.cacheProof);else if(result.state==='COMMITTED')await confirmLocalOrganizeCacheProof(this.#store,state.cacheProof);return result;}
 #state(handle){const state=this.#handles.get(handle);if(!state)fail('UNAVAILABLE');return state;}
 async prepare({topicId,children=1}={}){
  const generation=this.#generation;
  if(children!==1)return {state:'DEFER',reason:'multiple_children_not_supported'};
  if(!validOrganizeCacheProfile(this.#profile)||typeof this.#route!=='string'||!this.#route.length||this.#route.length>200)fail('UNAVAILABLE');
  if(this.#jobs.size+this.#cached.size>=8&&!this.#cached.has(topicId))fail('UNAVAILABLE');
  await this.#store.aiPresentationStatus({topicId}); // Existing migration/readability owner.
  const data=await this.#foundation.read(async t=>{
   const prepared=await readLocalOrganizeScopeInTransaction(this.#store,t,topicId,this.#profile,this.#incrementalVersion),items=[];
   const keys=new Set((prepared.incremental?prepared.inputs.flatMap(i=>JSON.parse(prepared.topic.versions[i.ref])[2].map(x=>x[0])):Object.keys(prepared.topic.inputVersions)).map(id=>JSON.stringify(['input',id])));
   for(const input of prepared.inputs){const key=JSON.stringify(['library_entry',input.ref]),known=await t.get('meta',KNOWN_PREFIX+key);if(known)keys.add(key);else if(!JSON.parse(prepared.topic.versions[input.ref])[2]?.length)fail('STALE_BASE');}
   if(!keys.size&&prepared.incremental)return {prepared,items,coverage:[],cacheAuthority:null};if(!keys.size||keys.size>100)fail('BUDGET_EXCEEDED');
   for(const key of keys){const known=await t.get('meta',KNOWN_PREFIX+key);if(!known||known.descriptor.removed||known.descriptor.fenceOnly)fail('STALE_BASE');items.push({key:known.descriptor.key,signature:known.signature,descriptor:known.descriptor});}
   const coverage=items.map(i=>({key:i.key,facet:'organize',scope:topicId})).sort((a,b)=>canonical([a.key,a.facet,a.scope]).localeCompare(canonical([b.key,b.facet,b.scope])));
   let cacheAuthority=null;
   if(prepared.cachePresentation){cacheAuthority=await this.#foundation.authority(t,'AI_ORGANIZE',{items,coverage});await this.#foundation.current(t,{type:'AI_ORGANIZE',items,coverage,organizeStyle:prepared.style,authority:cacheAuthority,cancelEpoch:0});const current=await readLocalOrganizeScopeInTransaction(this.#store,t,topicId,this.#profile,this.#incrementalVersion);if(current.proof!==prepared.proof||!current.cachePresentation)fail('STALE_BASE');if(canonical(await this.#foundation.authority(t,'AI_ORGANIZE',{items,coverage}))!==canonical(cacheAuthority))fail('CANCELLED');await assertLocalOrganizeCacheControls(this.#store,t,prepared);}
   return {prepared,items,cacheAuthority,coverage};
  });
  if(this.#generation!==generation)fail('UNAVAILABLE');
  const coverage=data.coverage;if(data.prepared.incremental&&!coverage.length)return Object.freeze({state:'NO_DELTA',jobId:null});
  if(data.cacheAuthority){if(this.#jobs.size+this.#cached.size>=8&&!this.#cached.has(topicId))fail('UNAVAILABLE');const prior=this.#cached.get(topicId);if(prior)this.#handles.delete(prior.handle);const handle=Object.freeze({state:'CACHED',jobId:null}),state={...data,handle,cached:true,running:false};this.#handles.set(handle,state);this.#cached.set(topicId,state);return handle;}
  const job=await this.#foundation.plan({type:'AI_ORGANIZE',intent:'explicit',items:data.items,coverage,contractVersion:this.#profile.contractVersion,routeVersion:await digest(this.#incrementalVersion===2?[this.#route,this.#profile,data.prepared.evidenceVersion,data.prepared.topic.incrementalVersions]:[this.#route,this.#profile,data.prepared.evidenceVersion]),organizeStyle:data.prepared.style});
  if(this.#generation!==generation)fail('UNAVAILABLE');
  const handle=Object.freeze({state:job.state,jobId:job.id});if(!job.id)return handle;
  if(this.#jobs.has(job.id))return this.#jobs.get(job.id).handle;
  if(this.#jobs.size+this.#cached.size>=8)fail('UNAVAILABLE');
  const state={...data,coverage,job,handle,validated:null,running:false};this.#handles.set(handle,state);this.#jobs.set(job.id,state);return handle;
 }
 async assemble(handle){
  const state=this.#state(handle);if(state.cached)fail('UNAVAILABLE');return this.#foundation.read(async t=>{
   const job=await this.#foundation.job(t,state.job.id);await this.#foundation.current(t,job);
   const current=await readLocalOrganizeScopeInTransaction(this.#store,t,state.prepared.topic.id,this.#profile,this.#incrementalVersion);if(current.proof!==state.prepared.proof)fail('STALE_BASE');
   if(job.childIds.length!==1||job.committedCoverage.length)fail('STALE_BASE');
   const request={topicId:current.topic.id,style:current.style,inputs:current.inputs,profile:this.#profile,...(current.incremental?{responseVersion:2}: {})};if(bytes(request)>this.#store.organizerBudget.limits.maxRequestBytes)fail('BUDGET_EXCEEDED');return structuredClone(request);
  });
 }
 async #readCached(state){
  return this.#foundation.read(async t=>{
   const {items,coverage,cacheAuthority,prepared}=state;
   await this.#foundation.current(t,{type:'AI_ORGANIZE',items,coverage,organizeStyle:prepared.style,authority:cacheAuthority,cancelEpoch:0});
   const current=await readLocalOrganizeScopeInTransaction(this.#store,t,prepared.topic.id,this.#profile);
   if(current.proof!==prepared.proof||!current.cachePresentation)fail('STALE_BASE');
   if(canonical(await this.#foundation.authority(t,'AI_ORGANIZE',{items,coverage}))!==canonical(cacheAuthority))fail('CANCELLED');
   await assertLocalOrganizeCacheControls(this.#store,t,prepared);
   if(this.#handles.get(state.handle)!==state||this.#cached.get(prepared.topic.id)!==state)fail('UNAVAILABLE');
   return {state:'CACHED',jobId:null,presentation:structuredClone(current.cachePresentation)};
  });
 }
 async run(handle,provider){
  const state=this.#state(handle);if(state.running)fail('REQUEST_ALREADY_IN_FLIGHT');state.running=true;
  try{
   if(state.cached)return await this.#readCached(state);
   const status=await this.#foundation.status(state.job.id);if(status.state==='COMMITTED')return this.#completed(state,status);
   if(status.state==='RESPONSE_RECORDED'&&state.validated)return await this.#completed(state,await this.#foundation.commitFacet(state.job.id,state.job.childIds[0],{facet:'organize',units:state.coverage}));
   if(!['PLANNED','RESERVED'].includes(status.state))fail('OUTCOME_UNKNOWN');
   const descriptor=localProviderDescriptor(provider);await this.assemble(handle);
   await this.#foundation.reserve(state.job.id,{reservationId:'local-organize:'+state.job.childIds[0],executionKind:descriptor.executionKind});
   const dispatched=await this.#foundation.dispatch(state.job.id,state.job.childIds[0],{describe:()=>descriptor,execute:async metadata=>{
    if(canonical(metadata.coverage)!==canonical(state.coverage))fail('STALE_BASE');
    const request=await this.assemble(handle),payload={...request,usage:metadata};if(bytes(payload)>this.#store.organizerBudget.limits.maxRequestBytes)fail('BUDGET_EXCEEDED');
    const response=await provider.execute(Object.freeze(structuredClone(payload)));
    if(bytes(response)>this.#store.organizerBudget.limits.maxOutputBytes)fail('BUDGET_EXCEEDED');state.validated=this.#incrementalVersion===2?validateIncrementalResponse(response,request,state.prepared):validateLocalOrganizeResponse(response,request);if(this.#incrementalVersion===2)state.manifestDigest=await digest(state.validated);
    return {accepted:true,operationReceiptId:state.job.childIds[0]};
   }});
   if(dispatched.state!=='RESPONSE_RECORDED')return dispatched;
   return await this.#completed(state,await this.#foundation.commitFacet(state.job.id,state.job.childIds[0],{facet:'organize',units:state.coverage}));
  }finally{state.running=false;}
 }
 dispose(){this.#generation++;for(const state of this.#jobs.values())releaseLocalOrganizeCacheProof(this.#store,state.cacheProof);this.#handles=new WeakMap();this.#jobs.clear();this.#cached.clear();}
}
