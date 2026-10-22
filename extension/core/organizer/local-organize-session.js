import {captureOriginalOrganizeControlContinuity,readOriginalOrganizeControlContinuity,assertOriginalOrganizeControlContinuityFacts} from '../indexed-store.js';
import {captureOriginalOrganizePlan} from './organize-plan-source.js';
import {requireOriginalOrganizeActionSource,assertOriginalOrganizeActionCurrent,assertOriginalOrganizeActionFacts,captureOriginalOrganizeFilterSelection,chargeOriginalOrganizeActionWork} from '../../background/organize-action-source.js';
import * as organizeScope from './organize-processing-scope.js';
import * as organizePolicy from '../../background/organize-processing-policy.js';
import {observeRepositoryWriteFence,requireRepositoryWriteFence} from '../idb-repository.js';
import {requireOrganizeServiceClient} from '../ai-usage/organize-service-client.js';
import {qwenFoundationProviderData} from '../ai-usage/qwen-qualified-request.js';
import {committedV3Generation,legacyV2Generation,mergeIncrementalV3} from './ai-incremental-v3.js';
import {isIncrementalV2} from './ai-incremental-v2.js';
import {validateIncrementalResponse,validateIncrementalChild,mergeIncrementalChildren} from './ai-incremental-v2.js';
import {AIUsageFoundation} from '../ai-usage/foundation.js';
import {localProviderDescriptor,canonical,digest,fail} from '../ai-usage/contracts.js';
import {KNOWN_PREFIX} from '../ai-usage/delta.js';
import {validOrganizeCacheProfile} from './organize-cache-qualification.js';
import {readLocalOrganizeCurrentInTransaction,readLocalOrganizeScopeInTransaction,commitLocalOrganizeCandidateInTransaction,confirmLocalOrganizeCacheProof,releaseLocalOrganizeCacheProof,localOrganizeProofFullyAdopted,confirmLocalOrganizeLifecycle,releaseLocalOrganizeLifecycle,assertLocalOrganizeCacheControls,localOrganizeCacheControlsCurrent} from './ai-presentation.js';
import {bytes} from './contracts.js';
import {AI_FIELDS,validateLocalOrganizeResponse} from './ai-contract.js';
// Immutable original job identity only; execution state and spend stay owned by Foundation.
const serviceJobBinding=job=>canonical(Object.fromEntries(['id','kind','version','type','commitMode','organizeRequestKey','organizeStyle','organizeSemanticKey','items','coverage','childCoverage','childIds','scopeFingerprint','contractVersion','routeVersion','authority','flightId','sourceRecordIds'].filter(k=>Object.hasOwn(job,k)).map(k=>[k,job[k]])));
// The configured original worker uses this same local adoption owner. Handles
// and response bodies never enter a new durable handoff store or public DTO.
export class LocalOrganizeSession {
 #source;#preparedControls=new WeakMap();#preparedReaderFacts=new WeakMap();#sourcePins=new Map();#readLeases=new WeakMap();#service;#store;#incrementalVersion;#foundation;#profile;#route;#handles=new WeakMap();#jobs=new Map();#cached=new Map();#generation=0;
 constructor(store,{resolveAuthority=null,profile=null,routeVersion=null,incrementalVersion=1,service=null,actionSource=null}={}){
  if(![1,2,3].includes(incrementalVersion))fail('INVALID_REQUEST');this.#incrementalVersion=incrementalVersion;
  this.#service=service===null?null:requireOrganizeServiceClient(service);
  this.#store=store;this.#source=actionSource;if(actionSource!==null&&!this.#service)fail('UNAVAILABLE');this.#profile=structuredClone(profile);this.#route=routeVersion;
  this.#foundation=new AIUsageFoundation(store,{resolveAuthority,organizeClosure:async(t,r)=>{
   const state=this.#jobs.get(r.logicalJobId);if(!state?.multi||!state.validated||canonical(r.childIds)!==canonical(state.job.childIds)||canonical(r.units)!==canonical(state.coverage)||state.outputs.size!==r.childIds.length)fail('STALE_BASE');
   await this.#assertProvenance(t,state);releaseLocalOrganizeCacheProof(store,state.cacheProof);const validated=state.validated,committed=await this.#commitMaterial(t,state,{prepared:state.prepared,result:validated,candidateId:r.logicalJobId,manifestDigest:state.manifestDigest,baseGeneration:state.baseGeneration,qualification:{variant:'atomic-v3',jobId:r.logicalJobId,childIds:r.childIds,childCoverage:r.children,coverage:r.units,items:state.items,children:r.childIds.map(id=>state.provenance.get(id)),profile:this.#profile,isCurrent:()=>this.#jobs.get(r.logicalJobId)===state&&state.validated===validated&&state.outputs.size===r.childIds.length}});state.cacheProof=committed.cacheProof;state.lifecycleToken=committed.lifecycleToken;state.lifecycleKey=committed.lifecycleKey;state.candidateCreated=committed.candidateCreated===true;state.currentPublication=committed.currentPublished!==undefined?{currentPublished:committed.currentPublished,changed:committed.changed,revision:committed.revision,jobId:committed.jobId}:null;
   if(this.#jobs.get(r.logicalJobId)!==state)fail('UNAVAILABLE');return {committed:true,coverage:r.units,...(state.currentPublication?{outcome:state.currentPublication.changed?'COMMITTED':'NO_CHANGE'}:{}),isCurrent:()=>this.#jobs.get(r.logicalJobId)===state&&state.outputs.size===r.childIds.length};
  },committers:{organize:async(t,r)=>{
   const state=this.#jobs.get(r.logicalJobId);if(!state?.validated||state.job.childIds[0]!==r.childOperationId||canonical(r.units)!==canonical(state.coverage))fail('STALE_BASE');
   await this.#assertProvenance(t,state);releaseLocalOrganizeCacheProof(store,state.cacheProof);const committed=await this.#commitMaterial(t,state,{prepared:state.prepared,result:state.validated,candidateId:r.childOperationId,manifestDigest:state.manifestDigest,baseGeneration:state.baseGeneration,qualification:{jobId:r.logicalJobId,childId:r.childOperationId,coverage:r.units,profile:this.#profile}});state.cacheProof=committed.cacheProof;state.lifecycleToken=committed.lifecycleToken;state.lifecycleKey=committed.lifecycleKey;state.candidateCreated=committed.candidateCreated===true;state.currentPublication=committed.currentPublished!==undefined?{currentPublished:committed.currentPublished,changed:committed.changed,revision:committed.revision,jobId:committed.jobId}:null;
   return {committed:true,coverage:r.units,...(state.currentPublication?{outcome:state.currentPublication.changed?'COMMITTED':'NO_CHANGE'}:{}),isCurrent:()=>this.#jobs.get(r.logicalJobId)===state&&!!state.validated};
  }}});
 }
 #assertAction(action){
  if(this.#source===null)return;
  requireOriginalOrganizeActionSource(this.#source,this.#store);assertOriginalOrganizeActionCurrent(this.#source,action,this.#store);assertOriginalOrganizeActionFacts(this.#source,action,this.#store);
 }
 #assertActionFacts(action){if(this.#source!==null)assertOriginalOrganizeActionFacts(this.#source,action,this.#store);}
 #controlsCurrent(prepared){
  if(this.#source===null)return localOrganizeCacheControlsCurrent(this.#store,prepared);
  try{assertOriginalOrganizeControlContinuityFacts(this.#store,this.#preparedControls.get(prepared));return true;}catch{return false;}
 }
 async #assertControls(t,prepared){
  if(this.#source===null)return assertLocalOrganizeCacheControls(this.#store,t,prepared);
  readOriginalOrganizeControlContinuity(this.#store,t,this.#preparedControls.get(prepared));
  assertOriginalOrganizeControlContinuityFacts(this.#store,this.#preparedControls.get(prepared));
 }
 async #prepareAction(action,topicId){
  if(this.#source===null){if(action!==null)fail('UNAVAILABLE');return;}
  this.#assertAction(action);if(this.#sourcePins.has(action))fail('UNAVAILABLE');const held={pin:null};this.#sourcePins.set(action,held);
  try{
   await this.#foundation.read(async t=>{
    this.#assertAction(action);const proof=await organizeScope.captureOriginalOrganizeScope(this.#store,t,topicId,this.#source,action);let grant;
    try{grant=organizePolicy.captureOrganizeProcessingGrant(this.#source,action,this.#store,t,proof);const value=await captureOriginalOrganizeFilterSelection(this.#source,action,this.#store,t,proof,grant);this.#assertAction(action);return value;}
    finally{if(grant)organizePolicy.releaseOrganizeProcessingGrant(grant);organizeScope.releaseOriginalOrganizeScope(proof);}
   });
   // Preserve the original charged metadata witness, but do not adopt the
   // absent historical Filter identity protocol. Deterministic filtering still
   // runs in the genuine main owner; the material reader refuses aiDecision.
   this.#assertAction(action);
  }catch(error){held.pin?.release?.();this.#sourcePins.delete(action);throw error;}
 }
 releaseAction(action){
  if(this.#source===null)return;
  const held=this.#sourcePins.get(action);this.#sourcePins.delete(action);
  try{held?.pin?.release?.();}finally{this.#source.release(action);}
 }
 async #materialRead(fn){
  const leases=[];try{return await this.#foundation.read(t=>{this.#readLeases.set(t,leases);return fn(t);});}
  finally{for(const release of leases)release();}
 }
 async #material(t,topicId,children,refreshStyle,action=null){
  if(this.#source===null)return readLocalOrganizeScopeInTransaction(this.#store,t,topicId,this.#profile,this.#incrementalVersion,children,refreshStyle);
  this.#assertAction(action);const leases=this.#readLeases.get(t);if(!leases)fail('UNAVAILABLE');
  const proof=await organizeScope.captureOriginalOrganizeScope(this.#store,t,topicId,this.#source,action);let grant;
  const release=()=>{if(grant)organizePolicy.releaseOrganizeProcessingGrant(grant);organizeScope.releaseOriginalOrganizeScope(proof);};leases.push(release);
  grant=organizePolicy.captureOrganizeProcessingGrant(this.#source,action,this.#store,t,proof);
  const cap=organizePolicy.captureOriginalOrganizeScopeReader(grant,this.#store,t),prepared=await readLocalOrganizeScopeInTransaction(this.#store,t,topicId,this.#profile,this.#incrementalVersion,children,refreshStyle,cap);
  this.#assertAction(action);const view=organizePolicy.readOriginalOrganizeScopeReader(cap,this.#store,t);this.#preparedControls.set(prepared,captureOriginalOrganizeControlContinuity(this.#store,t,view.controls));const {signal,expiresAt}=organizePolicy.readOrganizeProcessingGrant(grant,this.#store,t);this.#preparedReaderFacts.set(prepared,{cap,lifecycle:{signal,expiresAt}});organizePolicy.assertOriginalOrganizeScopeReaderFacts(cap,this.#store,t);return prepared;
 }
 async #currentMaterial(t,prepared,action){
  this.#assertAction(action);const leases=this.#readLeases.get(t);if(this.#source===null||!leases)fail('UNAVAILABLE');
  const proof=await organizeScope.captureOriginalOrganizeScope(this.#store,t,prepared.topic.id,this.#source,action);let grant;
  const release=()=>{if(grant)organizePolicy.releaseOrganizeProcessingGrant(grant);organizeScope.releaseOriginalOrganizeScope(proof);};leases.push(release);
  grant=organizePolicy.captureOrganizeProcessingGrant(this.#source,action,this.#store,t,proof);
  const cap=organizePolicy.captureOriginalOrganizeCurrentScopeReader(grant,this.#store,t),current=await readLocalOrganizeCurrentInTransaction(this.#store,t,prepared,cap);
  this.#assertAction(action);const view=organizePolicy.readOriginalOrganizeScopeReader(cap,this.#store,t);captureOriginalOrganizeControlContinuity(this.#store,t,view.controls);organizePolicy.assertOriginalOrganizeScopeReaderFacts(cap,this.#store,t);return current;
 }
 async #commitMaterial(t,state,options){
  if(this.#source===null)return commitLocalOrganizeCandidateInTransaction(this.#store,t,options);
  const action=state.adoptionAction??state.sourceAction;this.#assertAction(action);
  if(typeof organizeScope.captureOriginalOrganizeCommitScope!=='function'||typeof organizePolicy.captureOriginalOrganizeCommitScopeReader!=='function')fail('UNAVAILABLE');
  const proof=await organizeScope.captureOriginalOrganizeCommitScope(this.#store,t,state.prepared.topic.id,this.#source,action);let grant;
  const release=()=>{if(grant)organizePolicy.releaseOrganizeProcessingGrant(grant);organizeScope.releaseOriginalOrganizeScope(proof);};(state.commitLeases??=[]).push(release);
  grant=organizePolicy.captureOrganizeProcessingGrant(this.#source,action,this.#store,t,proof);
  const cap=organizePolicy.captureOriginalOrganizeCommitScopeReader(grant,this.#store,t);
  return commitLocalOrganizeCandidateInTransaction(this.#store,t,{...options,scopeReader:cap});
 }
 async #completed(state,result){if(result.state==='COMMITTED')state.completed=true;if(this.#jobs.get(state.job.id)!==state){releaseLocalOrganizeCacheProof(this.#store,state.cacheProof);releaseLocalOrganizeLifecycle(this.#store,state.lifecycleToken);}else if(result.state==='COMMITTED'){await confirmLocalOrganizeCacheProof(this.#store,state.cacheProof);await confirmLocalOrganizeLifecycle(this.#store,state.lifecycleToken,state.lifecycleKey);delete state.lifecycleKey;}return result;}
 #state(handle){const state=this.#handles.get(handle);if(!state)fail('UNAVAILABLE');return state;}
 async #retireAdopted(){
  const generation=this.#generation;
  for(const [id,state]of [...this.#jobs])if(!state.running&&(state.completed&&state.currentPublication||localOrganizeProofFullyAdopted(this.#store,state.lifecycleToken,id))){
   const job=await this.#foundation.status(id);if(generation!==this.#generation)fail('UNAVAILABLE');if(state.running||this.#jobs.get(id)!==state||job.state!=='COMMITTED')continue;
   this.#handles.set(state.handle,{retired:true,jobId:id,generation:this.#generation,completed:true,currentPublication:state.currentPublication});this.#jobs.delete(id);
   releaseLocalOrganizeCacheProof(this.#store,state.cacheProof);releaseLocalOrganizeLifecycle(this.#store,state.lifecycleToken);
  }
 }
 async scope({topicId}={}){
  if(this.#source!==null)fail('UNAVAILABLE');
  if(!this.#service||!validOrganizeCacheProfile(this.#profile))fail('AI_SERVICE_UNAVAILABLE');
  await this.#store.aiPresentationStatus({topicId});
  const prepared=await this.#foundation.read(t=>readLocalOrganizeScopeInTransaction(this.#store,t,topicId,this.#profile,this.#incrementalVersion,4,false));
  return {available:true,topicId,scopeBinding:await digest([prepared.proof,this.#profile,this.#route]),eligibleCount:prepared.inputs.length,maxRequests:4,complete:true,blockedReason:null};
 }
 async prepare({topicId,children=1,refreshStyle=false,scopeBinding=null,sourceAction=null}={}){
  const generation=this.#generation;this.#assertAction(sourceAction);
  if(this.#service)await this.#service.recover(this.#foundation,topicId,{retainJob:id=>{const state=this.#jobs.get(id);return !!state&&(state.running||!!state.validated&&!state.completed);},isCurrent:()=>this.#generation===generation});this.#assertAction(sourceAction);
  if(typeof refreshStyle!=='boolean'||refreshStyle&&this.#incrementalVersion!==3)fail('INVALID_REQUEST');
  if(this.#incrementalVersion===1&&children!==1)return {state:'DEFER',reason:'multiple_children_not_supported'};
  const automatic=children==='auto'&&!!this.#service;if(automatic)children=4;
  if(!Number.isInteger(children)||children<1||children>4)fail('INVALID_REQUEST');
  if(!validOrganizeCacheProfile(this.#profile)||typeof this.#route!=='string'||!this.#route.length||this.#route.length>200)fail('UNAVAILABLE');
  await this.#retireAdopted();if(generation!==this.#generation)fail('UNAVAILABLE');
  if(this.#jobs.size+this.#cached.size>=8&&!this.#cached.has(topicId))fail('UNAVAILABLE');
  if(this.#source===null)await this.#store.aiPresentationStatus({topicId}); // Preserve the legacy display/migration path.
  else await this.#store.finishFoundation(); // The source path must not read display bodies before its independent field grant.
  await this.#prepareAction(sourceAction,topicId);this.#assertAction(sourceAction);
  const data=await this.#materialRead(async t=>{
   const prepared=await this.#material(t,topicId,children,refreshStyle,sourceAction),items=[];
   const keys=new Set((prepared.cachePresentation?Object.keys(prepared.topic.inputVersions):prepared.incremental?prepared.inputs.flatMap(i=>JSON.parse(prepared.topic.versions[i.ref])[2].map(x=>x[0])):Object.keys(prepared.topic.inputVersions)).map(id=>JSON.stringify(['input',id])));
   for(const input of prepared.cachePresentation?prepared.topic.entries.map(e=>({ref:e.id})):prepared.inputs){const key=JSON.stringify(['library_entry',input.ref]),known=await t.get('meta',KNOWN_PREFIX+key);if(known)keys.add(key);else if(!JSON.parse(prepared.topic.versions[input.ref])[2]?.length)fail('STALE_BASE');}
   if(!keys.size&&prepared.incremental)return {prepared,items,coverage:[],cacheAuthority:null};if(!keys.size||keys.size>100)fail('BUDGET_EXCEEDED');
   for(const key of keys){const known=await t.get('meta',KNOWN_PREFIX+key);if(!known||known.descriptor.removed||known.descriptor.fenceOnly)fail('STALE_BASE');items.push({key:known.descriptor.key,signature:known.signature,descriptor:known.descriptor});}
   const coverage=items.map(i=>({key:i.key,facet:'organize',scope:topicId})).sort((a,b)=>canonical([a.key,a.facet,a.scope]).localeCompare(canonical([b.key,b.facet,b.scope])));
   let cacheAuthority=null;
   if(prepared.cachePresentation){cacheAuthority=await this.#foundation.authority(t,'AI_ORGANIZE',{items,coverage});await this.#foundation.current(t,{type:'AI_ORGANIZE',items,coverage,organizeStyle:prepared.style,authority:cacheAuthority,cancelEpoch:0});const current=await this.#material(t,topicId,prepared.physicalChildren,prepared.refreshStyle,sourceAction);if(current.proof!==prepared.proof||!current.cachePresentation)fail('STALE_BASE');if(canonical(await this.#foundation.authority(t,'AI_ORGANIZE',{items,coverage}))!==canonical(cacheAuthority))fail('CANCELLED');await this.#assertControls(t,prepared);}
   this.#assertAction(sourceAction);return {prepared,items,cacheAuthority,coverage,sourceAction};
  });
  if(this.#generation!==generation)fail('UNAVAILABLE');
  this.#assertAction(sourceAction);
  if(this.#source===null&&scopeBinding!==null&&scopeBinding!==await digest([data.prepared.proof,this.#profile,this.#route]))fail('STALE_BASE');
  const coverage=data.coverage;if(data.prepared.incremental&&!coverage.length)return Object.freeze({state:'NO_DELTA',jobId:null});
  if(data.cacheAuthority){if(!this.#controlsCurrent(data.prepared))fail('STALE_BASE');if(this.#jobs.size+this.#cached.size>=8&&!this.#cached.has(topicId))fail('UNAVAILABLE');const prior=this.#cached.get(topicId);if(prior)this.#handles.delete(prior.handle);const handle=Object.freeze({state:'CACHED',jobId:null}),state={...data,handle,cached:true,running:false};this.#handles.set(handle,state);this.#cached.set(topicId,state);return handle;}
  if(this.#service){
   // A fresh explicit click may retry only an already validated local CAS.
   // Match the original full proof; changed human state never borrows it.
   const retained=[...this.#jobs.values()].find(s=>s.validated&&!s.running&&!s.controller.signal.aborted&&s.prepared.proof===data.prepared.proof);
   if(retained){this.#assertAction(sourceAction);if(this.#source!==null)retained.adoptionAction=sourceAction;return retained.handle;}
   await this.#service.assertCanPlan(this.#foundation,topicId);this.#assertAction(sourceAction);
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
  this.#assertAction(sourceAction);const planRequest={...(partitions?{commitMode:'organize-atomic-v1',children:partitions.map(p=>structuredClone(p.coverage))}:{}),type:'AI_ORGANIZE',intent:'explicit',items:data.items,coverage,contractVersion:this.#profile.contractVersion,...(this.#service?{routeVersion:this.#route,organizeRequestKey}:{routeVersion:await digest(this.#incrementalVersion===3?[this.#route,this.#profile,data.prepared.proof]:this.#incrementalVersion>=2?[this.#route,this.#profile,data.prepared.evidenceVersion,data.prepared.topic.incrementalVersions]:[this.#route,this.#profile,data.prepared.evidenceVersion])}),organizeStyle:data.prepared.style};
  const planCap=this.#source===null?null:captureOriginalOrganizePlan(this.#source,sourceAction,this.#store,planRequest);
  const job=await this.#foundation.plan(planRequest,planCap);
  if(this.#generation!==generation)fail('UNAVAILABLE');this.#assertAction(sourceAction);
  const handle=Object.freeze({state:job.state,jobId:job.id});if(!job.id)return handle;
  if(this.#jobs.has(job.id))return this.#jobs.get(job.id).handle;
  if(this.#jobs.size+this.#cached.size>=8)fail('UNAVAILABLE');
  const stored=partitions||this.#service?await this.#foundation.read(t=>this.#foundation.job(t,job.id)):null;
  const ordered=partitions?stored.childCoverage.map(c=>partitions.find(p=>canonical(p.coverage)===canonical(c))):null;if(ordered?.some(p=>!p))fail('STALE_BASE');
  if(this.#generation!==generation)fail('UNAVAILABLE');this.#assertAction(sourceAction);
  if(this.#jobs.has(job.id))return this.#jobs.get(job.id).handle;
  if(this.#jobs.size+this.#cached.size>=8)fail('UNAVAILABLE');
  const state={...data,coverage,job,handle,organizeRequestKey,serviceBinding:this.#service?serviceJobBinding(stored):null,multi:!!partitions,partitions:ordered,outputs:new Map(),provenance:new Map(),validated:null,running:false,controller:new AbortController()};this.#handles.set(handle,state);this.#jobs.set(job.id,state);return handle;
 }
 #assertServiceBinding(job,state){if(this.#service&&(job.organizeRequestKey!==state.organizeRequestKey||job.routeVersion!==this.#route||job.contractVersion!==this.#profile.contractVersion||serviceJobBinding(job)!==state.serviceBinding))fail('RESULT_BINDING_MISMATCH');}
 async assemble(handle,childId=null){
  const state=this.#state(handle);if(state.cached||state.retired)fail('UNAVAILABLE');const payload=await this.#materialRead(async t=>{
   const job=await this.#foundation.job(t,state.job.id);this.#assertServiceBinding(job,state);await this.#foundation.current(t,job);
   const current=await this.#material(t,state.prepared.topic.id,state.prepared.physicalChildren,state.prepared.refreshStyle,state.sourceAction);if(current.proof!==state.prepared.proof)fail('STALE_BASE');
   if((!state.multi&&job.childIds.length!==1)||job.committedCoverage.length)fail('STALE_BASE');
   const index=state.multi?job.childIds.indexOf(childId):0;if(index<0)fail('INVALID_REQUEST');const inputs=state.multi?state.partitions[index].inputs:current.inputs;
   const request={topicId:current.topic.id,style:current.style,inputs,profile:this.#profile,...(current.incremental?{responseVersion:2}: {})};if(bytes(request)>this.#store.organizerBudget.limits.maxRequestBytes)fail('BUDGET_EXCEEDED');this.#assertAction(state.sourceAction);return structuredClone(request);
  });if(this.#source!==null){this.#assertAction(state.sourceAction);if(!this.#controlsCurrent(state.prepared))fail('CANCELLED');}return payload;
 }
 // Only this fixed original service owner may capture a wire. Public assemble
 // keeps its old DTO contract and cannot accept an arbitrary body-consuming
 // callback. Actual capture stays in the final synchronous segment of the
 // existing full material transaction and its independently granted fields.
 async #assembleSourceServiceChild(state,operation,index){
  if(this.#source===null||state.cached||state.retired)fail('UNAVAILABLE');
  const payload=await this.#materialRead(async t=>{
   const job=await this.#foundation.job(t,state.job.id);this.#assertServiceBinding(job,state);await this.#foundation.current(t,job);
   const current=await this.#material(t,state.prepared.topic.id,state.prepared.physicalChildren,state.prepared.refreshStyle,state.sourceAction);
   if(current.proof!==state.prepared.proof||(!state.multi&&job.childIds.length!==1)||job.committedCoverage.length||job.childIds[index]!==state.job.childIds[index])fail('STALE_BASE');
   const inputs=state.multi?state.partitions[index].inputs:current.inputs,usage=this.#foundation.childRequest(job,index);
   const request={topicId:current.topic.id,style:current.style,inputs,profile:this.#profile,...(current.incremental?{responseVersion:2}: {}),writableFields:AI_FIELDS.filter(field=>!state.prepared.topic.stored?.protections?.[field])};
   if(bytes(request)>this.#store.organizerBudget.limits.maxRequestBytes)fail('BUDGET_EXCEEDED');
   const payload=structuredClone({...request,usage});if(bytes(payload)>this.#store.organizerBudget.limits.maxRequestBytes)fail('BUDGET_EXCEEDED');
   const facts=this.#preparedReaderFacts.get(current);if(!facts||!this.#controlsCurrent(state.prepared))fail('STALE_BASE');
   this.#assertAction(state.sourceAction);organizePolicy.assertOriginalOrganizeScopeReaderFacts(facts.cap,this.#store,t);
   this.#service.captureSourceChild(operation,index,payload,{signal:facts.lifecycle.signal,expiresAt:facts.lifecycle.expiresAt,sessionSignal:state.controller.signal});
   organizePolicy.assertOriginalOrganizeScopeReaderFacts(facts.cap,this.#store,t);this.#assertActionFacts(state.sourceAction);return payload;
  });
  this.#assertAction(state.sourceAction);if(state.controller.signal.aborted||!this.#controlsCurrent(state.prepared))fail('CANCELLED');return payload;
 }
 async #readCached(state){
  return this.#materialRead(async t=>{
   const {items,coverage,cacheAuthority,prepared}=state;
   await this.#foundation.current(t,{type:'AI_ORGANIZE',items,coverage,organizeStyle:prepared.style,authority:cacheAuthority,cancelEpoch:0});
   const current=await this.#material(t,prepared.topic.id,prepared.physicalChildren,prepared.refreshStyle,state.sourceAction);
   if(current.proof!==prepared.proof||!current.cachePresentation)fail('STALE_BASE');
   if(canonical(await this.#foundation.authority(t,'AI_ORGANIZE',{items,coverage}))!==canonical(cacheAuthority))fail('CANCELLED');
   await this.#assertControls(t,prepared);
   if(!this.#controlsCurrent(prepared))fail('STALE_BASE');
   if(this.#handles.get(state.handle)!==state||this.#cached.get(prepared.topic.id)!==state)fail('UNAVAILABLE');
   this.#assertAction(state.sourceAction);return {state:'CACHED',jobId:null,presentation:structuredClone(current.cachePresentation)};
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
    this.#assertAction(state.sourceAction);
    if(!this.#controlsCurrent(state.prepared))fail('STALE_BASE');
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
  }finally{state.running=false;for(const release of state.commitLeases??[])release();state.commitLeases=[];}
 }
 async #assertServiceMaterialCurrent(state){
  if(state.cached||state.retired)fail('UNAVAILABLE');
  await this.#materialRead(async t=>{
   const job=await this.#foundation.job(t,state.job.id);this.#assertServiceBinding(job,state);await this.#foundation.current(t,job);
   const current=await this.#currentMaterial(t,state.prepared,state.sourceAction);
   if((!state.multi&&job.childIds.length!==1)||job.committedCoverage.length)fail('STALE_BASE');
   const index=state.multi?job.childIds.indexOf(state.job.childIds[0]):0;if(index<0)fail('INVALID_REQUEST');const inputs=state.multi?state.partitions[index].inputs:current.inputs;
   const request={topicId:current.topic.id,style:current.style,inputs,profile:this.#profile,...(current.incremental?{responseVersion:2}: {})};if(bytes(request)>this.#store.organizerBudget.limits.maxRequestBytes)fail('BUDGET_EXCEEDED');this.#assertAction(state.sourceAction);
  });this.#assertAction(state.sourceAction);if(!this.#controlsCurrent(state.prepared))fail('CANCELLED');
 }
 async #serviceCurrent(state){
  if(this.#jobs.get(state.job.id)!==state||state.controller.signal.aborted)fail('CANCELLED');
  if(this.#source===null)await this.assemble(state.handle,state.job.childIds[0]);else await this.#assertServiceMaterialCurrent(state);this.#assertAction(state.sourceAction);
  if(this.#jobs.get(state.job.id)!==state||state.controller.signal.aborted||!this.#controlsCurrent(state.prepared))fail('CANCELLED');
 }
 static #sourceBeforeSendFence(pair,repository,token){
  // This synchronous result never closes over the async material read's strong
  // owner/state locals. A collected original owner is refusal, not authority.
  return ()=>{const {owner,state}=pair();if(owner.#store.repository!==repository||state.controller.signal.aborted||!owner.#controlsCurrent(state.prepared))fail('STALE_BASE');requireRepositoryWriteFence(repository,token);owner.#assertActionFacts(state.sourceAction);};
 }
 static #sourceServiceHooks(ownerRef,stateRef){
  // The factory receives only weak references. Metadata-only service stages
  // cannot keep the session's source/validation bodies alive; the original
  // active session remains their sole long-lived owner. Missing owners deny.
  const pair=()=>{const owner=ownerRef.deref(),state=stateRef.deref();if(!owner||!state||owner.#jobs.get(state.job.id)!==state)fail('CANCELLED');return {owner,state};};
  return {assertCurrent:()=>{const {owner,state}=pair();return owner.#serviceCurrent(state);},isCurrent:()=>{try{const {owner,state}=pair();if(state.controller.signal.aborted||!owner.#controlsCurrent(state.prepared))return false;owner.#assertActionFacts(state.sourceAction);return true;}catch{return false;}},
   chargeRetainedBytes:n=>{const {owner,state}=pair();chargeOriginalOrganizeActionWork(owner.#source,state.sourceAction,owner.#store,0,n);},
   assertBeforeSend:async()=>{const {owner,state}=pair(),repository=owner.#store.repository,token=observeRepositoryWriteFence(repository);await owner.#serviceCurrent(state);return LocalOrganizeSession.#sourceBeforeSendFence(pair,repository,token);}
  };
 }
 #serviceHooks(state){
  if(this.#source!==null)return {topicId:state.prepared.topic.id,...LocalOrganizeSession.#sourceServiceHooks(new WeakRef(this),new WeakRef(state))};
  // Preserve the legacy path's existing currentness and cancellation behavior.
  return {topicId:state.prepared.topic.id,assertCurrent:()=>this.#serviceCurrent(state),isCurrent:()=>{if(this.#jobs.get(state.job.id)!==state||state.controller.signal.aborted)return false;try{this.#assertActionFacts(state.sourceAction);return true;}catch{return false;}},
   assertBeforeSend:async()=>{const repository=this.#store.repository,token=observeRepositoryWriteFence(repository);await this.#serviceCurrent(state);return ()=>{if(this.#store.repository!==repository||state.controller.signal.aborted||!this.#controlsCurrent(state.prepared))fail('STALE_BASE');requireRepositoryWriteFence(repository,token);this.#assertActionFacts(state.sourceAction);};}
  };
 }
 async #runService(state){
  let operation=null;
  const children=state.job.childIds.map((childId,i)=>({childId,units:state.multi?state.partitions[i].coverage:state.coverage}));
  const commit=()=>state.multi?this.#foundation.commitOrganizeClosure(state.job.id,{children}):this.#foundation.commitFacet(state.job.id,state.job.childIds[0],{facet:'organize',units:state.coverage});
  const report=async()=>{try{await this.#service.report(this.#foundation,state.job);}catch{/* Original metadata stays pending, never repeat provider work. */}};
  const serviceChildren=await this.#foundation.read(async t=>{const job=await this.#foundation.job(t,state.job.id);this.#assertServiceBinding(job,state);return this.#source===null?null:job.childIds.map((_,i)=>this.#foundation.childRequest(job,i));});
  const prior=await this.#foundation.status(state.job.id);
  if(prior.state==='COMMITTED'){await report();return this.#completed(state,prior);}
  if(state.validated){const result=await this.#completed(state,await commit());await report();return result;}
  if(prior.state!=='PLANNED'||prior.attempts.length)fail('OUTCOME_UNKNOWN');
  try{
   const payloads=[],hooks=this.#serviceHooks(state);
   if(this.#source!==null){
    operation=await this.#service.prepareSourceControls(this.#foundation,state.job,serviceChildren,hooks);
    for(const index of state.job.childIds.keys())payloads.push(await this.#assembleSourceServiceChild(state,operation,index));
    await this.#service.finishSourcePreparation(operation);
   }else{
    for(const [i,childId]of state.job.childIds.entries()){
     const request=await this.assemble(state.handle,childId),usage=await this.#foundation.read(async t=>{const j=await this.#foundation.job(t,state.job.id);await this.#foundation.current(t,j);return this.#foundation.childRequest(j,i);}),payload={...request,usage};
     if(bytes(payload)>this.#store.organizerBudget.limits.maxRequestBytes)fail('BUDGET_EXCEEDED');payloads.push(payload);
    }
    operation=await this.#service.prepare(this.#foundation,state.job,payloads,hooks);
   }
   for(const [i,childId]of state.job.childIds.entries()){
    // The prepared source provider admits its actual parse after Foundation
    // dispatch, and again immediately before fetch. Legacy remains unchanged.
    if(this.#source===null)await this.#serviceCurrent(state);
    const response=await this.#foundation.dispatch(state.job.id,childId,operation.providers[i],{signal:state.controller.signal,timeoutMs:this.#store.organizerBudget.limits.timeoutMs});
    if(response.state!=='RESPONSE_RECORDED'){await this.#foundation.cancelServer(state.job.id);await report();return await this.#foundation.status(state.job.id);}
    await this.#serviceCurrent(state);
    if(bytes(response.value)>this.#store.organizerBudget.limits.maxOutputBytes)fail('BUDGET_EXCEEDED');
    const blocks=validateIncrementalChild(response.value,payloads[i],state.prepared),status=await this.#foundation.status(state.job.id),receipt=status.attempts.find(r=>r.childId===childId);
    if(receipt?.state!=='RESPONSE_RECORDED'||receipt.executionKind!=='server-backed'||!receipt.operationReceiptId)fail('OUTCOME_UNKNOWN');
    let payloadDigest;
    if(this.#source!==null){const binding=qwenFoundationProviderData(operation.providers[i]);if(!binding||binding.request.operationId!==childId||binding.request.jobId!==state.job.id||canonical(binding.request)!==canonical(receipt.financialRequest)||typeof binding.payloadDigest!=='string'||!/^[a-f0-9]{64}$/.test(binding.payloadDigest))fail('RESULT_BINDING_MISMATCH');payloadDigest=binding.payloadDigest;}
    else payloadDigest=await digest(payloads[i]);
    state.outputs.set(childId,blocks);state.provenance.set(childId,{childId,operationReceiptId:receipt.operationReceiptId,payloadDigest,validatedOutputDigest:await digest(blocks)});
   }
   await this.#serviceCurrent(state);await this.#finishV3(state);
  }catch(error){try{await this.#foundation.cancelServer(state.job.id);}catch{/* Keep original UNKNOWN accounting. */}await report();throw error;}finally{operation?.dispose();}
  // Failed local CAS may retry only this retained validated result; do not
  // cancel/erase it or mint another physical child on a storage failure.
  const result=await this.#completed(state,await commit());await report();return result;
 }
 async stop(handle){const state=this.#state(handle);state.controller?.abort();if(state.job?.id)return this.#service?this.#foundation.cancelServer(state.job.id):this.#foundation.cancel(state.job.id);}
 async status(handle){const state=this.#state(handle),jobId=state.job?.id??state.jobId,result=jobId?await this.#foundation.status(jobId):{state:state.cached?'CACHED':'NO_DELTA',attempts:[]};return this.#source===null?result:{...result,candidateCreated:result.state==='COMMITTED'&&state.completed===true&&state.candidateCreated===true,...(result.state==='COMMITTED'&&state.completed===true&&state.currentPublication?state.currentPublication:{})};}
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
 dispose(){this.#generation++;if(this.#source!==null)this.#source.invalidate();for(const state of this.#jobs.values()){state.controller.abort();releaseLocalOrganizeCacheProof(this.#store,state.cacheProof);releaseLocalOrganizeLifecycle(this.#store,state.lifecycleToken);}this.#handles=new WeakMap();this.#jobs.clear();this.#cached.clear();}
}
