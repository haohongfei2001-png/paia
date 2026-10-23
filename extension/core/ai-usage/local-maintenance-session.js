import {assertPlacementTopicAssessment,assertPlacementTopicResult,placementTopicFacts} from './placement-topic-reconciliation.js';
import {evaluateAuthoredTopicReconciliation} from '../topic-authored-reconciliation.js';
const authoredTopicEligible=new WeakSet();
import {needsMaintenanceProcessingSelection,needsMaintenanceProcessingContext} from './maintenance-processing-source-denial.js';
import {createMaintenanceProcessingDenyCell,retireMaintenanceProcessingDenyCell,assertMaintenanceProcessingDenyCellFacts} from './maintenance-processing-denial.js';
import {assertTopicFormationMembers} from '../topic-formation-terminal.js';
import {requireRepositoryTransactionScope,registerRepositoryFinalReadFence} from '../idb-repository.js';
import {qualifiedCoverageId} from './assist-intent-binding.js';
import {TopicProcessingAuthority} from '../topic-processing-authority.js';
import {MaintenanceSectionPromotionTasks,findMaintenanceSectionPromotionOffer,resultMaintenanceSectionPromotion,resumeMaintenanceSectionPromotion,releaseMaintenanceSectionPromotionOffer,readMaintenanceSectionPromotionOwnerState,disposeMaintenanceSectionPromotionOwner,assertMaintenanceSectionPromotionTaskFacts} from './maintenance-section-promotion-session.js';
import {planMaintenanceSectionPromotion,maintenanceSectionPromotionQualification,releaseMaintenanceSectionPromotion} from './maintenance-section-promotion.js';
import {createMaintenanceSectionPromotionPermission,releaseMaintenanceSectionPromotionPermission} from './maintenance-section-promotion-permission.js';
import {captureMaintenanceProcessingReceipt,assertMaintenanceProcessingReceipt} from './maintenance-processing-receipt.js';
import {selectMaintenanceTopicCandidates,maintenanceTopicCandidateScope,maintenanceTopicCandidateSummary,maintenanceTopicCandidateQualificationRequest,captureMaintenanceTopicCandidates,maintenanceTopicCandidateMaterial,maintenanceTopicCandidateOperation,readMaintenanceTopicCandidateOperation,assertMaintenanceTopicCandidateSelection,releaseMaintenanceTopicCandidates} from './maintenance-topic-candidates.js';
import {rootReadAuthority} from '../organizer/root-read.js';
import {readAIMaintenanceFilterVisibility} from './ai-filter-owner.js';
import {prepareMaintenanceQualificationRequest,withMaintenanceQualification,createMaintenanceQualification,createMaintenanceTopicExactReuseQualification,maintenanceQualificationReader,maintenanceQualificationReceipt,maintenanceQualificationWorkBudget,assertMaintenanceQualification,releaseMaintenanceQualification} from './maintenance-qualification.js';
import {selectMaintenanceExistingContext,maintenanceExistingContextScope,maintenanceExistingContextQualification,captureMaintenanceExistingContext,maintenanceExistingContextPayload,maintenanceExistingContextMetadata,maintenanceExistingContextSummary,assertMaintenanceExistingContext,releaseMaintenanceExistingContext} from './maintenance-existing-context.js';
import {observeRepositoryWriteFence,requireRepositoryWriteFence} from '../idb-repository.js';
import {readMaintenanceResponseDefer} from './maintenance-service-response.js';
import {requireMaintenanceServiceClient} from './maintenance-service-client.js';
import * as maintenanceClientSource from './maintenance-service-client.js';
import {readSectionPromotionRecoveryLocator} from './section-promotion-checkpoint.js';
import {readSectionPromotionRecoveryAuthority,assertSectionPromotionRecoveryAuthorityFacts,takeSectionPromotionRecoveryRetirementOutcome} from './section-promotion-recovery-authority.js';
import {assertStructuralTopicAssessment,assertStructuralTopicResult} from './structural-topic-reconciliation.js';
import {qualifyContextProtectionCorrections,assertContextProtectionCorrections,readContextEditMapping,contextEditScope,contextEditEvidence,captureContextEditMaterial,assertContextEditMaterial,releaseContextEditMaterial} from './context-correction.js';
import {inputProjection} from '../thought-evidence.js';
import {readStructuralContext,structuralContextAllowsTopic,structuralContextGroups,structuralContextProperty,structuralContextMaterial,structuralContextEvidence} from './structural-context-mapping.js';
import {readBoundEntryContext,boundContextEvidenceMatches,boundSelectedText} from '../context-bound-entry.js';
import {readAuthoredEntryContext,authoredContextEvidenceMatches,authoredSelectedFields,authoredSelectedText} from '../context-authored-entry.js';
import {hashText} from '../dedupe.js';
import {createContextScopeWorkBudget,forkContextScopeWorkBudget,contextScopeTransactionReader,assertContextScopeWorkBudgetFacts,CONTEXT_TOPIC_SCOPE_LIMITS,assertContextScopeTransactionIdentity} from '../context-topic-scope.js';
import {AIUsageFoundation} from './foundation.js';
import {readMaintenanceBatch,unsupportedMaintenanceCoverage} from './maintenance-batch.js';
import {createMaintenancePayload} from './maintenance-payload.js';
import {canonical,digest,equal,exact,fail,opaque,unitKey,validateCoverage,localProviderDescriptor} from './contracts.js';
import {TopicFormationService,readTopicFormationPublication} from '../topic-formation.js';
import {ContextMaintenanceService,readContextMaintenancePublication,structuralContextRequestWithinBudget,validateContextMaintenanceChange,validateContextMaintenanceNoChange,validateContextMaintenanceInvalidation} from '../context-maintenance.js';

const processingSelections=new WeakMap(),processingPermits=new WeakMap();
const processingAborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get;
const processingAbort=AbortController.prototype.abort;
const processingWall=Date.now.bind(Date),processingMono=performance.now.bind(performance);
const processingReaderParent=Object.getPrototypeOf;
function processingScope(store,transaction){assertContextScopeTransactionIdentity(transaction,store);let t=transaction;for(let depth=0;t&&depth<16;depth++,t=processingReaderParent(t)){try{requireRepositoryTransactionScope(store.repository,t);return t;}catch{}}fail('UNAVAILABLE');}
function retireProcessingSelection(token){const r=processingSelections.get(token);if(!r||r.closed)return;r.closed=true;r.retired=true;retireMaintenanceProcessingDenyCell(r.denial);processingAbort.call(r.controller);r.batch=null;}
function processingSelection(token,store){const r=processingSelections.get(token);if(!r||r.store!==store||r.retired)fail('UNAVAILABLE');try{assertMaintenanceProcessingDenyCellFacts(r.denial);maintenanceClientSource.assertMaintenanceServiceLifecycleFacts(r.lifecycleCap,r.client,store);if(!r.current())fail('UNAVAILABLE');return r;}catch(error){r.retired=true;retireMaintenanceProcessingDenyCell(r.denial);throw error;}}
export function readMaintenanceProcessingSelection(token,store,transaction){const r=processingSelection(token,store);processingScope(store,transaction);return Object.freeze({token,batch:r.batch,budget:r.budget,caller:r.caller,client:r.client,lifecycleCap:r.lifecycleCap,denial:r.denial,signal:r.controller.signal,firstDeadline:r.firstDeadline,monoDeadline:r.monoDeadline,plan:r.plan});}
export function readMaintenanceProcessingRequestPermit(token,store,transaction,processing){
 const r=processingPermits.get(token);if(!r)return null;
 const selection=processingSelection(r.selection,store);
 if(r.store!==store||r.transaction!==processingScope(store,transaction)||selection.plan.resolve!==processing?.resolve||selection.plan.isCurrent!==processing?.isCurrent||canonical({items:r.view.request.items,coverage:r.view.request.coverage})!==r.requestData||canonical(r.view.selectionSpec)!==r.selectionData||canonical(r.view.binding)!==r.bindingData)fail('UNAVAILABLE');
 return r.view;
}
const promotionSessions=new WeakMap(),promotionHandoffs=new WeakMap(),promotionDeliveries=new WeakMap();
const deliveryData=(object,key)=>{const d=Object.getOwnPropertyDescriptor(object,key);if(!d||!Object.hasOwn(d,'value'))fail('UNAVAILABLE');return d.value;};
function promotionSession(session,store){const r=promotionSessions.get(session);if(!r||r.store!==store||r.repository!==store.repository||r.database!==null&&r.database!==store.repository.db)fail('UNAVAILABLE');return r;}
export function getMaintenanceSectionPromotion(session,store,request){return promotionSession(session,store).get(request);}
export function maintenanceSectionPromotionResult(session,store,operationId,options){return promotionSession(session,store).result(operationId,options);}
export function maintenanceSectionPromotionResume(session,store,operationId,options){return promotionSession(session,store).resume(operationId,options);}
export function assertMaintenanceSectionPromotionRecoveryAuthority(session,store,sourceAuthority){return promotionSession(session,store).assertAuthority(sourceAuthority);}
export function maintenanceSectionPromotionCheckpointResult(session,store,checkpoint){return promotionSession(session,store).checkpointResult(checkpoint);}
export function maintenanceSectionPromotionCheckpointResume(session,store,checkpoint){return promotionSession(session,store).checkpointResume(checkpoint);}
// Deny-only lifetime witness for an already-starting original operation. It
// cannot open a locator, read work, confirm, recover or provide processing rights.
export function captureMaintenanceSectionPromotionDelivery(session,store){const r=promotionSessions.get(session);if(!r||r.store!==store)fail('UNAVAILABLE');return r.captureDelivery();}
export function assertMaintenanceSectionPromotionDeliveryFacts(cap,session,store){
 const r=promotionDeliveries.get(cap);if(!r||r.session!==session||r.store!==store)fail('UNAVAILABLE');
 try{if(!r.active||promotionSessions.get(session)!==r.registration||deliveryData(store,'repository')!==r.repository||deliveryData(r.repository,'db')!==r.database||r.registration.database!==r.database||r.registration.repository!==r.repository||r.sameGeneration()!==true)fail('UNAVAILABLE');
  const check=maintenanceClientSource.assertMaintenanceServiceLifecycleFacts;if(typeof check!=='function'||check(r.sourceCap,r.source,store)!==true)fail('UNAVAILABLE');return true;
 }catch(error){r.active=false;throw error;}
}
export function readMaintenanceSectionPromotionHandoff(token,store){const r=promotionHandoffs.get(token);if(!r||r.store!==store||r.repository!==store.repository||r.database!==store.repository.db)fail('UNAVAILABLE');promotionHandoffs.delete(token);r.current();return r.value;}
const TYPE='AI_MAINTENANCE';
const recoveryAborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get;
function recoveryAwait(promise,signal){return new Promise((resolve,reject)=>{const stop=()=>{clean();reject(Object.assign(new Error('UNAVAILABLE'),{code:'UNAVAILABLE'}));},clean=()=>EventTarget.prototype.removeEventListener.call(signal,'abort',stop);EventTarget.prototype.addEventListener.call(signal,'abort',stop,{once:true});Promise.resolve(promise).then(value=>{clean();if(recoveryAborted.call(signal))stop();else resolve(value);},error=>{clean();reject(error);});if(recoveryAborted.call(signal))stop();});}
const outcome=(state,extra={})=>({state,dispatchAllowed:false,financialAuthority:false,...extra});
const reasons=new Set(['UNAVAILABLE','BUDGET_EXCEEDED','CANCELLED','STALE_BASE','OUTCOME_UNKNOWN','INVALID_REQUEST','CONTEXT_INVALIDATED','CONTEXT_LIMIT','STORAGE_FAILED','STORAGE_FULL','CONSENT_REQUIRED','REQUEST_ALREADY_IN_FLIGHT','DOMAIN_REPLAY_UNACKNOWLEDGED','MAINTENANCE_CADENCE']);
const safeError=e=>reasons.has(e?.code)?e.code:'UNAVAILABLE';
const frozen=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))frozen(child);Object.freeze(value);}return value;};
const boundMaterialKey=m=>canonical([m.entryId,m.topicId]);
const deferReason=Object.freeze({topic:'TOPIC_MAPPING_UNAVAILABLE',context:'CONTEXT_MAPPING_UNAVAILABLE',filter:'FILTER_OWNER_UNAVAILABLE'});
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

// Original bounded orchestration. Configured service entry uses the same domain
// owners; all missing processing/service capabilities still default to denied.
// The host's window owner supplies/consumes an opportunity; the device clock
// never computes Free/Pro windows, entitlement, refill or financial settlement.
export class LocalMaintenanceSession {
 #store;#foundation;#provider;#service;#window;#topic;#context;#processing;#sourceSelection=false;#remote;#independentFilter=false;#unsubscribe=null;
 #contextGroupBindings=new WeakMap();
 #localCorrection=null;#materialOwner=null;#promotionOwners=new Set();#promotionRecovery=null;#promotionRecoveryControllers=new Set();#promotionAuthorityPending=new Set();
 #handles=new WeakMap();#passive=new WeakMap();#jobs=new Map();#preparing=null;#active=null;#running=null;#generation=0;
 constructor(store,{provider=null,service=null,window=null,authority=null,processing=null,remote=null}={}){
  this.#remote=remote===null?null:requireMaintenanceServiceClient(remote);if(this.#remote&&provider!==null)fail('UNAVAILABLE');
  this.#sourceSelection=needsMaintenanceProcessingSelection(processing)||needsMaintenanceProcessingContext(service?.context);this.#store=store;this.#provider=provider;this.#service=service===null?null:{...service,topic:{...service.topic},context:{...service.context},...(service.filter?{filter:{...service.filter}}:{}),responseAdapter:service.responseAdapter===null?null:{...service.responseAdapter}};this.#window=window;this.#processing=processing===null?null:Object.freeze({...processing});if(processing!==null){exact(processing,['resolve','isCurrent']);if(typeof processing.resolve!=='function'||typeof processing.isCurrent!=='function')fail();}
  // Early decode is safe only for this branded client's exact, frozen source
  // adapter methods. A genuine remote cannot endorse a substituted callback.
  this.#independentFilter=!!this.#remote&&['topic','context','filter','topicCandidate'].every(facet=>this.#service?.responseAdapter?.[facet]===this.#remote.sessionOptions.service.responseAdapter[facet]);
  this.#foundation=new AIUsageFoundation(store,{maintenanceSourceContext:this.#sourceSelection?service?.context:null,resolveAuthority:authority,qualifyMaintenanceEntries:async(t,request)=>{const entries=await this.#entryMapping(request,t),authored=await this.#authoredMapping(request,t),bound=await this.#boundMapping(request,t);return request.coverage.filter(u=>request.items.find(i=>i.key===u.key)?.descriptor.kind==='library_entry'&&(['topic','context'].includes(u.facet)&&entries.has(u.key)||u.facet==='context'&&(authored.has(u.key)||bound.has(u.key))||u.facet==='topic'&&this.#authoredTopicCapable(authored.get(u.key))));},qualifyMaintenancePlacements:async(t,request)=>{const placements=await this.#placementMapping(request,t),bound=await this.#boundMapping(request,t);return request.coverage.filter(u=>request.items.find(i=>i.key===u.key)?.descriptor.kind==='placement'&&(u.facet==='context'&&(placements.has(u.key)||bound.has(u.key))||u.facet==='topic'&&this.#service?.topic.reconcileHumanPlacements===true&&placements.has(u.key)));},qualifyMaintenanceStructures:async(t,request)=>{const mapping=await this.#structuralMapping(request,t);return request.coverage.filter(u=>mapping.has(u.key)&&(u.facet==='context'||u.facet==='topic'&&this.#structuralTopicCapable(mapping.get(u.key))));},qualifyMaintenanceContextEdits:async(t,request)=>{const mapping=await this.#contextMapping(request,t);return request.coverage.filter(u=>u.facet==='context'&&mapping.has(u.key));},committers:{topic:(t,r)=>this.#commit(t,r,'topic'),context:(t,r)=>this.#commit(t,r,'context'),filter:(t,r)=>this.#commit(t,r,'filter')}});
  if(service!==null){
   exact(service,['version','topic','context','responseAdapter','filter'],['version','topic','context','responseAdapter']);if(service.filter!==undefined){exact(service.filter,['enabled','selectScope'],['enabled']);if(service.filter.enabled!==true||service.filter.selectScope!==undefined&&typeof service.filter.selectScope!=='function')fail();}if(service.version!==1)fail();
   // A declared adapter route capability, not a provider field or a grant.
   // Legacy Context-only routes leave human Topic facets pending.
   exact(service.topic,['resolveProcessing','decisionVersion','parameters','reconcileHumanNames','reconcileHumanSections','reconcileAuthoredEntries','reconcileHumanPlacements'],['resolveProcessing','decisionVersion','parameters']);for(const capability of ['reconcileHumanNames','reconcileHumanSections','reconcileAuthoredEntries','reconcileHumanPlacements'])if(service.topic[capability]!==undefined&&typeof service.topic[capability]!=='boolean')fail();exact(service.context,['processingVerifier','caller']);
   const adapter=service.responseAdapter;if(adapter!==null){exact(adapter,['topic','context','filter','topicCandidate','sectionPromotion'],['topic','context']);if(adapter.sectionPromotion!==undefined&&typeof adapter.sectionPromotion!=='function')fail();if(adapter.topicCandidate!==undefined&&typeof adapter.topicCandidate!=='function')fail();if(adapter.filter!==undefined&&typeof adapter.filter!=='function')fail();if(typeof adapter.topic!=='function'||typeof adapter.context!=='function')fail();}
   // The trusted Topic issuer shares the original qualified operation budget.
   // This carries no field/processing grant; its independent issuer and the
   // original terminal budget-identity check remain mandatory.
   this.#topic=new TopicFormationService(store,{resolveQualification:()=>this.#ownerQualification('topic'),resolveExactReuse:(selection,base)=>this.#qualifyExactReuse(selection,base),resolveProcessing:(t,request)=>service.topic.resolveProcessing(t,request,Object.freeze({workBudget:maintenanceQualificationWorkBudget(this.#ownerQualification('topic'),store)})),parameters:service.topic.parameters,decision:adapter===null?null:{version:service.topic.decisionVersion,assess:async view=>{
    const a=this.#active;this.#current(a?.state);if(a?.facet!=='topic')fail('UNAVAILABLE');
    let assessed;try{assessed=await this.#decode(a,'topic',view);}catch(error){if(this.#adapterDefer(a,'topic',error))a.adapterDeferred=error;throw error;}this.#current(a.state);
    // Schema/citations still belong to the original formation owner. This adds
    // the exact Input closure necessary before ACKing every selected delta unit.
    if(view.authoredTopic){evaluateAuthoredTopicReconciliation(assessed,view.authoredTopic);return assessed;}
    const cited=new Set(assessed?.evidence?.map(c=>c.inputId));
    if(!equal([...cited].sort(),view.inputs.map(i=>i.id).sort()))fail('STALE_BASE');
    const selectedEntries=this.#entries(a.state,a.units);
    if(selectedEntries.some(e=>!view.entries.some(v=>v.id===e.entryId&&v.revision===e.revision)))fail('STALE_BASE');
    const selected=selectedEntries.map(e=>e.entryId).sort(),accounted=assessed?.entries?.filter(e=>e.entryId!==undefined).map(e=>e.entryId).sort();
    if(selected.length&&!equal(selected,accounted))fail('STALE_BASE');
    const structures=this.#structures(a.state,a.units);if(structures.length){if(a.units.length!==1||structures.length!==1)fail('STALE_BASE');assertStructuralTopicAssessment(assessed,view,structures[0],a.state.structuralMaterial.get(structures[0].recordId));}const placements=this.#placementTopics(a.state,a.units);if(placements.length){if(placements.length!==1||a.units.length!==1)fail('STALE_BASE');assertPlacementTopicAssessment(assessed,view,placements[0]);}return assessed;
   }},writeTransaction:(fn,finalFence,publication)=>this.#writeDomain(fn,'topic',finalFence,null,publication)});
   this.#context=new ContextMaintenanceService(store,{resolveQualification:()=>this.#ownerQualification(),processingVerifier:service.context.processingVerifier,writeTransaction:(fn,finalFence,expectedTarget,publication)=>this.#writeDomain(fn,'context',finalFence,expectedTarget,publication)});
  }
  if(this.#remote)this.#unsubscribe=this.#remote.onInvalidate(()=>this.dispose());
  if(this.#remote)promotionSessions.set(this,{store,repository:store.repository,database:null,captureDelivery:()=>this.#capturePromotionDelivery(),assertAuthority:a=>this.#promotionRecoveryAuthority(a),checkpointResult:c=>this.#promotionRecoveryCheckpoint('result',c),checkpointResume:c=>this.#promotionRecoveryCheckpoint('resume',c),get:r=>this.#promotionOffer(r),result:(id,o)=>this.#promotionRecoveryOperation('result',id,o),resume:(id,o)=>this.#promotionRecoveryOperation('resume',id,o)});
 }
 available(){return this.#remote?.available()===true;}
 async opportunity(){if(!this.available())return outcome('UNAVAILABLE');const retained=this.#jobs.values().next().value;if(retained)return this.run(retained.handle);const handle=await this.prepare(this.#remote.options);return this.run(handle);}
 #current(state,{abort=true}={}){
  try{if(!state||state.generation!==this.#generation||this.#jobs.get(state.job.id)!==state||state.controller.signal.aborted||state.grant.revocationSignal.aborted)fail('UNAVAILABLE');
  if(Object.entries(state.grantBinding).some(([key,value])=>state.grant[key]!==value))fail('UNAVAILABLE');syncTrue(this.#window.isCurrent(state.grant));
  for(const token of [...state.qualifications.values(),...state.postTopicQualifications.values(),...state.candidateQualifications.values()])assertMaintenanceQualification(token,this.#store);
  for(const receipt of state.processing.values())try{this.#assertProcessing(receipt);}catch(error){if(abort)state.controller.abort();state.outputs.clear();this.#remote?.releaseResponseJob(state.job.id);state.topicResults.clear();state.prepared.clear();state.groups.clear();state.contextDeferred.clear();state.deferredUnits.clear();state.authoredMaterial.clear();state.boundMaterial.clear();state.structuralMaterial.clear();state.placementMaterial.clear();state.structuralInputs.clear();state.prepared.clear();state.groups.clear();state.contextDeferred.clear();this.#releaseContextEdits(state);this.#releaseExistingContext(state);this.#releaseTopicCandidates(state);throw error;}
  }catch(error){if(state){if(abort)state.controller.abort();for(const map of [state.qualifications,state.postTopicQualifications]){for(const token of map.values())releaseMaintenanceQualification(token);map.clear();}for(const map of [state.outputs,state.topicResults,state.prepared,state.groups,state.contextDeferred,state.authoredMaterial,state.boundMaterial,state.structuralMaterial,state.placementMaterial,state.structuralInputs])map.clear();this.#releaseContextEdits(state);this.#releaseExistingContext(state);this.#releaseTopicCandidates(state);}this.#remote?.releaseResponseJob(state?.job?.id);this.#releaseFilters(state);throw error;}
 }
 #correlation(a){return {logicalJobId:a.state.job.id,childOperationId:a.childId,operationReceiptId:a.receipt.operationReceiptId};}
 #replaceProcessingSelection(batch,options){
  const pending=this.#preparing;if(!this.#remote||!pending||!this.#sourceSelection)return;
  retireProcessingSelection(pending.selection);pending.selection=null;
  if(batch.status!=='CANDIDATE_ONLY')return;
  const plan=maintenanceClientSource.readMaintenanceServiceProcessingPlan(this.#remote,this.#store);
  if(plan.scope!==options.scope||plan.contractVersion!==options.contractVersion||plan.routeVersion!==options.routeVersion||plan.caller!==this.#service.context.caller||plan.resolve!==this.#processing.resolve||plan.isCurrent!==this.#processing.isCurrent)fail('UNAVAILABLE');
  const lifecycleCap=maintenanceClientSource.captureMaintenanceServiceLifecycle(this.#remote,this.#store),controller=new AbortController(),generation=this.#generation,timeout=this.#store.organizerBudget.limits.timeoutMs;
  if(!Number.isSafeInteger(timeout)||timeout<=0)fail('BUDGET_EXCEEDED');
  const firstDeadline=pending.wall+Math.min(timeout,30000),monoDeadline=pending.mono+Math.min(timeout,30000),token=Object.freeze({});
  const r={store:this.#store,client:this.#remote,caller:plan.caller,plan,lifecycleCap,controller,generation,budget:pending.workBudget,batch:frozen(structuredClone({items:batch.request.items,coverage:batch.request.coverage})),firstDeadline,monoDeadline,retired:false,state:null,current:null,denial:null};
  r.denial=createMaintenanceProcessingDenyCell({store:this.#store,repository:this.#store.repository,database:this.#store.repository.db,signals:[controller.signal,pending.controller.signal],wallDeadline:firstDeadline,monoDeadline});
  r.current=()=>generation===this.#generation&&!processingAborted.call(pending.controller.signal)&&(r.state?this.#jobs.get(r.state.job.id)===r.state&&!processingAborted.call(r.state.controller.signal)&&!processingAborted.call(r.state.grant.revocationSignal):this.#preparing===pending&&pending.selection===token);
  processingSelections.set(token,r);pending.selection=token;
 }
 #processingPermit(transaction,request,options,kind='qualification',state=null){
  if(!this.#remote||!this.#sourceSelection)return null;
  const selected=state?.processingSelection??(this.#active||this.#materialOwner)?.state.processingSelection??this.#preparing?.selection;
  if(!selected)return null;
  const r=processingSelection(selected,this.#store),scope=processingScope(this.#store,transaction),original=r.batch;
  if(!request.items.every(item=>original.items.some(x=>equal(x,item)))||!request.coverage.every(unit=>original.coverage.some(x=>equal(x,unit)))||request.coverage.some(unit=>!request.items.some(item=>item.key===unit.key)))fail('UNAVAILABLE');
  if(state){const child=options.binding?.childOperationId,index=state.job.childIds.indexOf(child);if(index<0||!equal(request.coverage,state.request.children[index]))fail('UNAVAILABLE');}
  const view=Object.freeze({kind,selection:selected,phase:options.phase,request,selectionSpec:options.selection,binding:options.binding,parent:options.parent??null,budget:options.workBudget,caller:r.caller,client:r.client,lifecycleCap:r.lifecycleCap,firstDeadline:r.firstDeadline,denial:r.denial,...(kind==='payload'?{scope:options.scope}:{})});
  if(view.budget!==r.budget)fail('UNAVAILABLE');
  const token=Object.freeze({});processingPermits.set(token,{store:this.#store,transaction:scope,selection:selected,view,requestData:canonical({items:request.items,coverage:request.coverage}),selectionData:canonical(options.selection),bindingData:canonical(options.binding)});return token;
 }
 #qualificationOptions(transaction,request,options,state=null){
  if(!this.#remote||!this.#sourceSelection)return options;
  const prepared={...options,selection:options.selection??{}};
  prepared.processingPermit=this.#processingPermit(transaction,request,prepared,'qualification',state);return prepared;
 }
 async #qualificationRead(request,transaction,fn){
  const generation=this.#generation,signal=this.#preparing?.controller.signal??null,active=this.#active||this.#materialOwner;
  const current=()=>generation===this.#generation&&!signal?.aborted&&(!active||(this.#active===active||this.#materialOwner===active)&&!active.state.controller.signal.aborted);
  const work=async t=>{const grant=await this.#foundation.authority(t,TYPE,{items:request.items,coverage:request.coverage});if(!current())fail('UNAVAILABLE');
   return withMaintenanceQualification(this.#store,t,request,this.#qualificationOptions(t,request,{processing:this.#processing,caller:this.#service?.context.caller,phase:active?'child-mapping':'prejob',binding:{principalId:grant.principalId,libraryId:grant.libraryId,consentEpoch:grant.consentEpoch,...(active?{logicalJobId:active.state.job.id,childOperationId:active.childId}:{generation})},isCurrent:current,signal,workBudget:active?.state.qualificationBudget??this.#preparing?.workBudget,requestIdentity:active?.state.qualificationRequest??this.#preparing?.requestIdentity}),fn);
  };return transaction?work(transaction):this.#foundation.read(work);
 }
 // Only restoration of a current Input-bound Entry is admitted for Topic and Context.
 // Canonical qualification can inspect body/journal fields, but never retains
 // material, hashes selected text, substitutes an Input or grants processing.
 async #entryMapping(request,transaction=null){
  const qualify=async t=>{
   const found=new Map();
   for(const {key,descriptor:d}of request.items){
    if(d.kind!=='library_entry'||d.independent)continue;
    const row=await t.get('thoughts',d.recordId||d.entityId),journal=await t.get('revisions',d.journalId);
    if(!row||row.id!==d.entityId||row.lifecycle!=='active'||row.revision!==d.revision||row.bodyBinding!=='input'||row.inputRefs?.length!==1||row.workingInputId!==row.inputRefs[0].inputBlockId||row.note||row.title||row.fieldRevisions?.note>0||row.fieldRevisions?.title>0)continue;
    if(journal?.actor!=='user'||journal.kind!=='library_entry'||journal.entityId!==row.id||journal.afterRevision!==row.revision||journal.reason!=='restore'||!equal(journal.fieldMask,['lifecycle']))continue;
    if(!equal([...(row.sourceRecordIds||[])].sort(),[...d.sourceRecordIds].sort()))continue;
    found.set(key,{entryId:row.id,revision:row.revision,inputIds:[row.workingInputId]});
   }return found;
  };return this.#qualificationRead(request,transaction,qualify);
 }
 // Original human placement proof; configured Topic interpretation preserves its exact membership.
 async #placementMapping(request,transaction=null){
  const qualify=async t=>{const found=new Map();
   for(const {key,descriptor:d}of request.items){
    if(d.kind!=='placement')continue;
    const row=await t.get('placements',d.recordId||d.entityId),journal=await t.get('revisions',d.journalId);
    if(!row||row.id!==d.entityId||row.id!==JSON.stringify([row.topicId,row.layoutGeneration,row.entryId])||row.revision!==d.revision||row.lifecycle!=='active'||row.excludedByUser||row.membershipAuthorship!=='user'||!row.sectionProtection||!row.orderProtection)continue;
    if(journal?.actor!=='user'||journal.kind!=='placement'||journal.entityId!==row.id||journal.documentId!==row.topicId||!['place','restore'].includes(journal.reason)||!equal(journal.fieldMask,['membership','section','order'])||!equal(journal.after,row))continue;
    const entry=await t.get('thoughts',row.entryId),topic=await t.get('topics',row.topicId),section=await t.get('sections',JSON.stringify([row.topicId,row.layoutGeneration,row.sectionId]));
    if(!entry||entry.lifecycle!=='active'||entry.bodyBinding!=='input'||entry.inputRefs?.length!==1||entry.workingInputId!==entry.inputRefs[0].inputBlockId||entry.title||entry.note||entry.fieldRevisions?.note>0||entry.fieldRevisions?.title>0)continue;
    const intent=entry.organizationIntents?.edges?.[row.topicId];
    if(intent?.actor!=='user'||intent.include!==true||intent.operationId!==journal.operationId||!entry.organizationIntents.included?.includes(row.topicId)||entry.organizationIntents.excluded?.includes(row.topicId))continue;
    if(!topic||topic.id!==row.topicId||topic.lifecycle!=='active'||topic.redirectTo||topic.layoutJobId||topic.activeLayoutGeneration!==row.layoutGeneration||!section||section.lifecycle!=='active'||section.redirectTo||section.topicId!==row.topicId||section.layoutGeneration!==row.layoutGeneration||section.sectionId!==row.sectionId||section.rank!==row.sectionRank)continue;
    if(!equal([...(entry.sourceRecordIds||[])].sort(),[...d.sourceRecordIds].sort())||!equal([...(journal.sourceRecordIds||[])].sort(),[...d.sourceRecordIds].sort()))continue;
    found.set(key,{placementId:row.id,revision:row.revision,entryId:entry.id,entryRevision:entry.revision,topicId:topic.id,topicRevision:topic.revision,topicOrganizationRevision:topic.organizationRevision,sectionId:section.sectionId,sectionRevision:section.revision,layoutGeneration:row.layoutGeneration,inputId:entry.workingInputId});
   }return found;
  };return this.#qualificationRead(request,transaction,qualify);
 }
 async #contextMapping(request,transaction=null){
  const qualify=async transaction=>{const t=contextScopeTransactionReader(this.#store,transaction,createContextScopeWorkBudget()),found=new Map();for(const {key,descriptor:d}of request.items){if(d.kind!=='context_item')continue;const m=await readContextEditMapping(this.#store,t,d);if(m)found.set(key,m);}return found;};return transaction?qualify(transaction):this.#foundation.read(qualify);
 }
 #contextEdits(state,units){return units.filter(u=>u.facet==='context'&&state.contextMapping?.has(u.key)).map(u=>state.contextMapping.get(u.key));}
 #releaseContextEdits(state){for(const held of state.contextMaterial?.values()||[])releaseContextEditMaterial(held);state.contextMaterial?.clear();}
 async #checkContextMapping(state,units,transaction){
  const t=contextScopeTransactionReader(this.#store,transaction,state.authoredBudget);
  for(const m of this.#contextEdits(state,units)){const d=state.request.items.find(i=>i.key===JSON.stringify(['context_item',m.itemId])).descriptor;if(!equal(await readContextEditMapping(this.#store,t,d),m))fail('STALE_BASE');const held=state.contextMaterial.get(m.itemId);if(held)await assertContextEditMaterial(this.#store,t,held);}
 }
 #releaseExistingContext(state,childId=null){
  for(const [id,handle]of state?.existingContext||[])if(childId===null||id===childId){releaseMaintenanceExistingContext(handle);state.existingContext.delete(id);state.existingSettled.delete(id);state.existingPublicationStart.delete(id);}
 }
 #releaseTopicCandidates(state,childId=null){this.#releasePromotions(state,childId);for(const [id,handle]of state?.topicCandidates||[])if(childId===null||id===childId){if(handle)releaseMaintenanceTopicCandidates(handle);releaseMaintenanceQualification(state.candidateQualifications.get(id));state.candidateQualifications.delete(id);state.topicCandidates.delete(id);state.topicCandidateSummaries.delete(id);state.candidatePublicationStart.delete(id);state.candidateOperations.delete(id);}}
 #promotionSourceCurrent(generation){const r=promotionSessions.get(this);if(!r||generation!==this.#generation||this.#remote?.available()!==true)return false;return promotionSessions.get(this)===r&&generation===this.#generation&&r.repository===this.#store.repository&&(r.database===null||r.database===this.#store.repository.db);}
 #bindPromotionScope(t){
  const r=promotionSessions.get(this);if(!r||!this.#promotionSourceCurrent(this.#generation))fail('UNAVAILABLE');const repository=this.#store.repository,identity=requireRepositoryTransactionScope(repository,t);if(!identity.database||identity.database!==repository.db||r.repository!==repository||r.database!==null&&r.database!==identity.database)fail('UNAVAILABLE');r.repository=repository;r.database=identity.database;
 }
 async #bindPromotionSession(){
  const r=promotionSessions.get(this),generation=this.#generation;if(!r||!this.#promotionSourceCurrent(generation))fail('UNAVAILABLE');if(r.database!==null)return;
  await this.#foundation.read(t=>{if(promotionSessions.get(this)!==r||!this.#promotionSourceCurrent(generation))fail('UNAVAILABLE');this.#bindPromotionScope(t);});
  if(!this.#promotionSourceCurrent(generation))fail('UNAVAILABLE');
 }
 async #capturePromotionDelivery(){
  const registration=promotionSessions.get(this),generation=this.#generation,source=this.#remote;
  if(!registration||registration.store!==this.#store||!source)fail('UNAVAILABLE');
  const repository=deliveryData(this.#store,'repository'),database=deliveryData(repository,'db'),capture=maintenanceClientSource.captureMaintenanceServiceLifecycle;
  if(registration.repository!==repository||!database||typeof capture!=='function')fail('UNAVAILABLE');
  // The source witness precedes the first await as well. A later generation
  // cannot be captured after binding and laundered into this original attempt.
  const sourceCap=capture(source,this.#store);
  await this.#bindPromotionSession();
  if(promotionSessions.get(this)!==registration||generation!==this.#generation||this.#remote!==source||deliveryData(this.#store,'repository')!==repository||deliveryData(repository,'db')!==database||registration.database!==database)fail('UNAVAILABLE');
  const cap=Object.freeze(Object.create(null));
  promotionDeliveries.set(cap,{active:true,session:this,store:this.#store,registration,generation,repository,database,source,sourceCap,sameGeneration:()=>generation===this.#generation&&this.#remote===source});
  assertMaintenanceSectionPromotionDeliveryFacts(cap,this,this.#store);return cap;
 }
 async #promotionRecoveryAuthority(sourceAuthority){
  const expected=responseSnapshot(sourceAuthority,2048);exact(expected,['principalId','libraryId','restoreEpoch']);if(!opaque(expected.principalId)||!opaque(expected.libraryId)||expected.restoreEpoch!==null&&!['string','number'].includes(typeof expected.restoreEpoch))fail('UNAVAILABLE');
  const generation=this.#generation,source=this.#remote?.sessionOptions.authority;if(typeof source!=='function'||this.#foundation.resolveAuthority!==source||!this.#promotionSourceCurrent(generation))fail('UNAVAILABLE');
  const timeoutMs=this.#store.organizerBudget.limits.timeoutMs;if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||this.#promotionAuthorityPending.size>=8)fail('UNAVAILABLE');
  const controller=new AbortController();this.#promotionRecoveryControllers.add(controller);this.#promotionAuthorityPending.add(controller);let issued=false;const timer=setTimeout(()=>controller.abort(),timeoutMs),check=()=>{if(recoveryAborted.call(controller.signal)||this.#foundation.resolveAuthority!==source||!this.#promotionSourceCurrent(generation))fail('UNAVAILABLE');};
  try{
   await recoveryAwait(this.#bindPromotionSession(),controller.signal);check();
   await recoveryAwait(this.#foundation.read(async t=>{check();this.#bindPromotionScope(t);check();issued=true;const pending=this.#foundation.authority(t,TYPE,{items:[],coverage:[]},controller.signal);Promise.resolve(pending).then(()=>this.#promotionAuthorityPending.delete(controller),()=>this.#promotionAuthorityPending.delete(controller));const authority=await recoveryAwait(pending,controller.signal);check();if(!equal({...expected,restoreEpoch:expected.restoreEpoch??'initial'},Object.fromEntries(['principalId','libraryId','restoreEpoch'].map(k=>[k,authority[k]]))))fail('UNAVAILABLE');check();}),controller.signal);
   check();return true;
  }finally{clearTimeout(timer);controller.abort();this.#promotionRecoveryControllers.delete(controller);if(!issued)this.#promotionAuthorityPending.delete(controller);}
 }
 async #promotionRecoveryCheckpoint(kind,locator){
  const generation=this.#generation,registered=promotionSession(this,this.#store),open=maintenanceClientSource.openMaintenanceSectionPromotionRecoveryAuthority,close=maintenanceClientSource.closeMaintenanceSectionPromotionRecoveryAuthority;
  if(typeof open!=='function'||typeof close!=='function'||!this.#promotionSourceCurrent(generation))fail('UNAVAILABLE');
  const source=this.#remote,sourceLifetime=maintenanceClientSource.captureMaintenanceServiceLifecycle(source,this.#store);
  const controller=new AbortController();this.#promotionRecoveryControllers.add(controller);let cap=null;
  const facts=()=>{maintenanceClientSource.assertMaintenanceServiceLifecycleFacts(sourceLifetime,source,this.#store);if(recoveryAborted.call(controller.signal)||generation!==this.#generation||promotionSessions.get(this)!==registered||registered.repository!==this.#store.repository||registered.database===null||registered.database!==this.#store.repository.db)fail('UNAVAILABLE');};
  try{
   await this.#bindPromotionSession();facts();const original=readSectionPromotionRecoveryLocator(locator,this.#store);
   cap=await open(this.#remote,this.#store,locator,{signal:controller.signal});facts();if(!cap)fail('UNAVAILABLE');
   if(!this.#promotionSourceCurrent(generation))fail('UNAVAILABLE');const proof=readSectionPromotionRecoveryAuthority(cap,this.#store,locator);facts();
   if(proof.operationId!==original.operationId||!equal(proof.sourceAuthority,original.sourceAuthority)||!equal(proof.paidBinding,original.paidBinding))fail('UNAVAILABLE');
   const owner=this.#promotionRecoveryOwner(),options={recoveryAuthority:cap,locator,signal:controller.signal};
   const result=await (kind==='result'?resultMaintenanceSectionPromotion(owner,this.#store,original.operationId,options):resumeMaintenanceSectionPromotion(owner,this.#store,original.operationId,options));
   if(!this.#promotionSourceCurrent(generation))fail('UNAVAILABLE');facts();
   // Only the original committed outcome can replace the retired live proof.
   // Closing it may synchronously invalidate this operation's source lifetime.
   const historical=takeSectionPromotionRecoveryRetirementOutcome(cap,this.#store,locator,result);
   if(historical!==null){facts();return historical;}
   readSectionPromotionRecoveryAuthority(cap,this.#store,locator);facts();assertSectionPromotionRecoveryAuthorityFacts(cap,this.#store,locator);facts();
   close(source,this.#store,cap);cap=null;facts();return result;
  }finally{try{if(cap)close(this.#remote,this.#store,cap);}finally{controller.abort();this.#promotionRecoveryControllers.delete(controller);}}
 }
 async #promotionRecoveryOperation(kind,id,options){await this.#bindPromotionSession();const owner=this.#promotionRecoveryOwner();return kind==='result'?resultMaintenanceSectionPromotion(owner,this.#store,id,options):resumeMaintenanceSectionPromotion(owner,this.#store,id,options);} 
 #promotionRecoveryOwner(){
  if(!this.#promotionSourceCurrent(this.#generation))fail('UNAVAILABLE');
  if(!this.#promotionRecovery){const generation=this.#generation;this.#promotionRecovery=new MaintenanceSectionPromotionTasks(this.#store,{resolveProcessing:()=>{fail('UNAVAILABLE');},parameters:this.#service.topic.parameters,decisionVersion:this.#service.topic.decisionVersion,isCurrent:()=>this.#promotionSourceCurrent(generation),confirmation:{caller:this.#service.context.caller,processing:this.#processing,identityProcessing:this.#processing}});}
  return this.#promotionRecovery;
 }
 #promotionOwnerCurrent(generation){return ()=>this.#promotionSourceCurrent(generation);}
 #createPromotionOwner(identity,generation){return new MaintenanceSectionPromotionTasks(this.#store,{resolveProcessing:(t,r)=>identity.authorize(t,r),parameters:this.#service.topic.parameters,decisionVersion:this.#service.topic.decisionVersion,isCurrent:this.#promotionOwnerCurrent(generation),confirmation:{caller:this.#service.context.caller,processing:this.#processing,identityProcessing:this.#processing}});}
 #prunePromotionOwners(){for(const owner of [...this.#promotionOwners])try{const status=readMaintenanceSectionPromotionOwnerState(owner,this.#store);if(!status.tasks&&!status.offers&&!status.confirming){disposeMaintenanceSectionPromotionOwner(owner,this.#store);this.#promotionOwners.delete(owner);}}catch{disposeMaintenanceSectionPromotionOwner(owner,this.#store);this.#promotionOwners.delete(owner);}}
 #promotionOffer(request){
  if(!this.#promotionSourceCurrent(this.#generation))fail('UNAVAILABLE');exact(request,['topicId','sectionId']);if(!opaque(request.topicId)||!opaque(request.sectionId))fail('UNAVAILABLE');if(promotionSessions.get(this).database===null)return null;
  this.#prunePromotionOwners();const found=[];for(const owner of [...this.#promotionOwners])try{const handle=findMaintenanceSectionPromotionOffer(owner,this.#store,request);if(handle)found.push(Object.freeze({owner,handle}));}catch{disposeMaintenanceSectionPromotionOwner(owner,this.#store);this.#promotionOwners.delete(owner);}return found.length===1?found[0]:null;
 }
 #releasePromotions(state,childId=null){for(const [id,held]of state?.promotions||[])if(childId===null||id===childId){if(held){if(held.task)releaseMaintenanceSectionPromotionOffer(held.owner,this.#store,held.task);releaseMaintenanceQualification(held.qualification);held.identity?.release();if(held.permission)releaseMaintenanceSectionPromotionPermission(held.permission);if(held.plan)releaseMaintenanceSectionPromotion(held.plan);if(!held.offer){disposeMaintenanceSectionPromotionOwner(held.owner,this.#store);this.#promotionOwners.delete(held.owner);}}state.promotions.delete(id);}if(![...(state?.promotions?.values()||[])].some(Boolean)&&state?.domainSettlements)state.domainSettlements.length=0;}
 async #preparePromotion(state,metadata,processing){
  const childId=metadata.childOperationId;if(state.promotions.has(childId))return state.promotions.get(childId);
  state.promotions.set(childId,null);this.#prunePromotionOwners();
  if(!this.#independentFilter||this.#service.responseAdapter.sectionPromotion!==this.#remote?.sessionOptions.service.responseAdapter.sectionPromotion||this.#remote.sectionPromotionAvailable?.()!==true||this.#promotionOwners.size>=8)return null;
  const selected=[...this.#entries(state,metadata.coverage).map(e=>e.entryId),...this.#authored(state,metadata.coverage).map(e=>e.entryId),...this.#bound(state,metadata.coverage).map(e=>e.entryId),...this.#placements(state,metadata.coverage).map(e=>e.entryId),...this.#structures(state,metadata.coverage).flatMap(m=>m.entries.map(e=>e.entryId))],entryIds=[...new Set(selected)],inputIds=this.#inputs(state,metadata.coverage);
  if(!entryIds.length||entryIds.length>16||!inputIds?.length||inputIds.length>20)return null;
  const generation=this.#generation,binding=Object.freeze({logicalJobId:state.job.id,childOperationId:childId,proposalOperationId:crypto.randomUUID(),sectionRef:'s0'}),current=()=>{this.#processingCurrent(state,processing);return true;};let plan,qualification,permission,identity,owner,task;
  try{
   plan=await this.#foundation.read(async tx=>{this.#bindPromotionScope(tx);const t=contextScopeTransactionReader(this.#store,tx,state.qualificationBudget),topics=new Set();for(const entryId of entryIds){const range=IDBKeyRange.bound([entryId],[entryId,[]],false,true),count=await t.count('placements','byEntry',range);if(count>8)fail('BUDGET_EXCEEDED');for(const row of await t.all('placements','byEntry',range))if(row.lifecycle==='active')topics.add(row.topicId);}if(!topics.size||topics.size>8)return null;return planMaintenanceSectionPromotion(this.#store,t,{topicIds:[...topics],entryIds,scope:inputIds.map(inputId=>({inputId,role:'primary',selectedFields:['body']}))},{workBudget:state.qualificationBudget});});current();
   if(!plan)return null;const selection=maintenanceSectionPromotionQualification(plan,this.#store);if(!selection){releaseMaintenanceSectionPromotion(plan);return null;}
   permission=await createMaintenanceSectionPromotionPermission(this.#store,plan,{processing:this.#processing,caller:this.#service.context.caller,parent:processing,binding,isCurrent:current,signal:state.controller.signal});current();
   qualification=await this.#foundation.read(t=>createMaintenanceQualification(this.#store,t,{items:[],coverage:[]},{processing:this.#processing,caller:this.#service.context.caller,parent:processing,binding,phase:'section-promotion',selection,workBudget:state.qualificationBudget,signal:state.controller.signal,isCurrent:current}));current();
   identity=new TopicProcessingAuthority(this.#store,{processing:this.#processing,caller:this.#service.context.caller,binding:{jobId:state.job.id,childId,proposalOperationId:binding.proposalOperationId},workBudget:state.qualificationBudget,signal:state.controller.signal});
   owner=this.#createPromotionOwner(identity,generation);this.#promotionOwners.add(owner);
   task=owner.begin(plan,binding,{qualification,signal:state.controller.signal,payloadPermission:permission});const payload=await owner.ready(task);current();const held={parent:processing,plan,qualification,permission,identity,owner,task,payload,binding,publicationStart:state.publications.length,result:null,resultBinding:null,offer:null,phase:'waiting'};state.promotions.set(childId,held);return held;
  }catch(error){if(task)releaseMaintenanceSectionPromotionOffer(owner,this.#store,task);if(owner)disposeMaintenanceSectionPromotionOwner(owner,this.#store);if(owner)this.#promotionOwners.delete(owner);identity?.release();releaseMaintenanceQualification(qualification);if(permission)releaseMaintenanceSectionPromotionPermission(permission);if(plan)releaseMaintenanceSectionPromotion(plan);this.#current(state);if(!['UNAVAILABLE','STALE_BASE','BUDGET_EXCEEDED','SECTION_PROMOTION_UNAVAILABLE'].includes(error?.code))throw error;return null;}
 }
 async #checkPromotion(state,childId){const held=state.promotions.get(childId);if(held?.phase==='waiting'){await held.owner.check(held.task);this.#current(state);}}
 async #settlePromotion(state,metadata,result,receipt){
  const held=state.promotions.get(metadata.childOperationId);if(!held)return;
  const binding=Object.freeze({logicalJobId:state.job.id,childOperationId:metadata.childOperationId,operationReceiptId:receipt.operationReceiptId}),cap=await this.#service.responseAdapter.sectionPromotion(result,binding);this.#current(state);
  const settled=await held.owner.settle(held.task,cap);this.#current(state);held.payload=null;held.permission=null;held.plan=null;
  if(settled.status==='DEFER'){this.#releasePromotions(state,metadata.childOperationId);return;}
  if(settled.status!=='PROPOSE')fail('STALE_BASE');held.result=cap;held.resultBinding=binding;held.phase='accepted';
 }
 async #finishPromotion(state,childId,coverage){
  const held=state.promotions.get(childId);if(!held||held.phase!=='accepted'||state.failedChildren.has(childId))return;
  try{
   await this.#foundation.read(async t=>{const job=await this.#foundation.job(t,state.job.id);await this.#foundation.current(t,job);const index=job.childIds.indexOf(childId),receipt=await t.get('organizerUsage','aiu:attempt:'+childId);if(index<0||!equal(job.childCoverage[index],coverage)||receipt?.operationReceiptId!==held.resultBinding.operationReceiptId||receipt.executionKind!=='server-backed'||receipt.financialSettlement?.state!=='SETTLED'||!['RESPONSE_RECORDED','VALIDATED','COMMITTED'].includes(receipt.state))fail('STALE_BASE');
    for(const unit of coverage){const settlement=state.domainSettlements.find(x=>x.childId===childId&&x.units.some(u=>equal(u,unit)));if(!settlement)fail('STALE_BASE');const committed=settlement.outcome!=='DEFER',row=await t.get('organizerWorkItems',committed?qualifiedCoverageId(unit,job):'aiu:defer:'+canonical([job.id,unitKey(unit)]));if(!row||row.jobId!==job.id||row.sequence!==index||!equal(row.unit,unit)||row.signature!==job.items.find(i=>i.key===unit.key)?.signature||row.state!==(committed?'ACKNOWLEDGED':'DEFERRED')||committed&&(!job.committedCoverage.includes(unitKey(unit))||row.outcome!==settlement.outcome))fail('STALE_BASE');}
   });this.#current(state);
   const publications=state.publications.slice(held.publicationStart);for(const token of publications)if(!state.domainSettlements.some(x=>x.publication===token&&x.outcome!=='DEFER'))fail('STALE_BASE');
   const handoff=Object.freeze(Object.create(null));promotionHandoffs.set(handoff,{store:this.#store,repository:this.#store.repository,database:this.#store.repository.db,current:()=>this.#current(state),value:Object.freeze({binding:held.resultBinding,publicationStart:held.publicationStart,publications:Object.freeze(publications),proposalResult:held.result})});
   try{held.offer=await held.owner.finish(held.task,handoff);this.#current(state);held.task=null;held.result=null;held.phase='offered';}finally{promotionHandoffs.delete(handoff);}
  }catch{this.#current(state);this.#releasePromotions(state,childId);}
 }
 async #checkTopicCandidates(state,childId,t,publication=null){const handle=state.topicCandidates.get(childId);if(handle)await assertMaintenanceTopicCandidateSelection(this.#store,t,handle,{publications:[...state.publications.slice(state.candidatePublicationStart.get(childId)),...(publication?[publication]:[])]});}
 async #candidateQualification(state,metadata){
  const handle=state.topicCandidates.get(metadata.childOperationId);if(!handle)return null;let token=state.candidateQualifications.get(metadata.childOperationId);
  if(!token){const processing=state.processing.get(metadata.childOperationId),request=maintenanceTopicCandidateQualificationRequest(handle);this.#processingCurrent(state,processing);token=await this.#foundation.read(t=>createMaintenanceQualification(this.#store,t,request.request,{...request,processing:this.#processing,caller:this.#service.context.caller,parent:processing,workBudget:state.qualificationBudget,signal:state.controller.signal,isCurrent:()=>{if(state.generation!==this.#generation||this.#jobs.get(state.job.id)!==state||state.controller.signal.aborted||state.grant.revocationSignal.aborted)return false;this.#assertProcessing(processing);return this.#window.isCurrent(state.grant)===true;}}));this.#current(state);state.candidateQualifications.set(metadata.childOperationId,token);}
  await captureMaintenanceTopicCandidates(this.#store,handle,{qualification:token,publications:state.publications.slice(state.candidatePublicationStart.get(metadata.childOperationId))});this.#current(state);return token;
 }
 async #checkExistingContext(state,childId,t,phase='settlement',expected=null,publication=null,topicPublication=null){
  const handle=state.existingContext.get(childId);if(!handle)return;
  const settled=new Map(state.existingSettled.get(childId)||[]);
  if(expected&&maintenanceExistingContextScope(handle).some(item=>item.itemId===expected.itemId))settled.set(expected.itemId,expected);
  await assertMaintenanceExistingContext(this.#store,t,handle,{phase,settledItems:[...settled.values()],publications:[...state.publications.slice(state.existingPublicationStart.get(childId)||0),...(publication?[publication]:[])],topicPublication});
 }
 #releaseConsumedChild(state,childId,{filterContinuation=false}={}){
  // A fully ACKed/DEFERred child can retain body-free job accounting, but no
  // provider output, prepared domain handle or selected content. Siblings keep
  // only the exact material still needed for their admitted local continuation.
  if(!filterContinuation)state.releasedChildren.add(childId);for(const map of [state.qualifications,state.postTopicQualifications]){releaseMaintenanceQualification(map.get(childId));map.delete(childId);}state.topicPublications.delete(childId);state.qualificationPublicationStart.delete(childId);if(!filterContinuation){this.#releaseFilters(state,childId);state.filterHandles.delete(childId);}
  state.outputs.delete(childId);this.#remote?.releaseResponseChild(childId);state.topicResults.delete(childId);this.#releaseExistingContext(state,childId);this.#releaseTopicCandidates(state,childId);
  for(const collection of [state.prepared,state.groups,state.contextDeferred])for(const key of collection.keys()){const [owner,facet]=JSON.parse(key);if(owner!==childId||filterContinuation&&facet==='filter-snapshot')continue;if(filterContinuation&&collection===state.prepared&&facet==='topic')try{this.#topic.cancel(collection.get(key));}catch{/* Original handle retirement is best effort; no retry is retained. */}collection.delete(key);}
  const remaining=state.request.children.flatMap((coverage,index)=>state.releasedChildren.has(state.job.childIds[index])||filterContinuation&&state.job.childIds[index]===childId?[]:coverage);
  const authored=new Set(this.#authored(state,remaining).map(m=>m.entryId)),bound=new Set(this.#bound(state,remaining).map(boundMaterialKey)),structures=this.#structures(state,remaining),records=new Set(structures.map(m=>m.recordId)),inputs=new Set(structures.flatMap(m=>m.entries.map(e=>e.inputId))),corrections=new Set(this.#contextEdits(state,remaining).map(m=>m.itemId));
  for(const key of state.authoredMaterial.keys())if(!authored.has(key))state.authoredMaterial.delete(key);
  for(const key of state.boundMaterial.keys())if(!bound.has(key))state.boundMaterial.delete(key);
  for(const key of state.structuralMaterial.keys())if(!records.has(key))state.structuralMaterial.delete(key);
  for(const key of state.structuralInputs.keys())if(!inputs.has(key))state.structuralInputs.delete(key);
  for(const [key,held]of state.contextMaterial)if(!corrections.has(key)){releaseContextEditMaterial(held);state.contextMaterial.delete(key);}
 }
 async #structuralMapping(request,transaction=null){
  const qualify=async transaction=>{const t=contextScopeTransactionReader(this.#store,transaction,createContextScopeWorkBudget()),found=new Map();for(const {key,descriptor:d}of request.items){if(!['section','topic'].includes(d.kind))continue;const mapping=await readStructuralContext(this.#store,t,d);if(mapping)found.set(key,mapping);}return found;};return this.#qualificationRead(request,transaction,qualify);
 }
 #structuralTopicCapable(mapping){return structuralContextAllowsTopic(mapping)&&(mapping.kind==='topic'?this.#service?.topic.reconcileHumanNames===true:this.#service?.topic.reconcileHumanSections===true);}
 #structures(state,units){return [...new Map(units.filter(u=>state.structuralMapping?.has(u.key)&&(u.facet==='context'||u.facet==='topic'&&this.#structuralTopicCapable(state.structuralMapping.get(u.key)))).map(u=>[u.key,state.structuralMapping.get(u.key)])).values()];}
 #checkStructuralBudget(state,units){
  const structures=this.#structures(state,units.filter(u=>u.facet==='context'));if(!structures.length)return;
  // Byte-only specimens carry no field authority and acquire/hash no text.
  // Check following children too before any sibling can physically dispatch.
  if(!structuralContextRequestWithinBudget(structures.map(m=>structuralContextEvidence(m,{[m.kind==='topic'?'name':'title']:'0'.repeat(64)})),{inputIds:this.#inputs(state,units.filter(u=>u.facet==='context')),authoredEntries:this.#authored(state,units),boundEntries:this.#bound(state,units)}))fail('BUDGET_EXCEEDED');
 }
 async #qualificationCheck(state,units,transaction,fn){
  const childId=(this.#active||this.#materialOwner)?.childId,coverage=state.request.children[state.job.childIds.indexOf(childId)]||[],withinChild=units.every(u=>coverage.some(v=>equal(u,v))),token=withinChild&&(state.postTopicQualifications.get(childId)||state.qualifications.get(childId));
  if(token){const result=await fn(maintenanceQualificationReader(token,this.#store,transaction));assertMaintenanceQualification(token,this.#store);return result;}
  const request={items:state.request.items.filter(i=>units.some(u=>u.key===i.key)),coverage:units};return this.#qualificationRead(request,transaction,fn);
 }
 async #checkStructuralMapping(state,units,transaction){
  return this.#qualificationCheck(state,units,transaction,async transaction=>{
  const t=contextScopeTransactionReader(this.#store,transaction,state.authoredBudget);for(const u of units)if(this.#structures(state,[u]).length){const d=state.request.items.find(i=>i.key===u.key).descriptor;const m=state.structuralMapping.get(u.key),current=await readStructuralContext(this.#store,t,d);if(!equal(current,m)||u.facet==='topic'&&!structuralContextAllowsTopic(current))fail('STALE_BASE');for(const e of m.entries)if(state.structuralInputs?.has(e.inputId)&&(await inputProjection(this.#store,t,e.inputId))?.body!==state.structuralInputs.get(e.inputId))fail('STALE_BASE');}
  });
 }
 async #authoredMapping(request,transaction=null){
  const qualify=async transaction=>{const t=contextScopeTransactionReader(this.#store,transaction,createContextScopeWorkBudget()),found=new Map();for(const {key,descriptor:d}of request.items){if(d.kind!=='library_entry')continue;const mapped=await readAuthoredEntryContext(this.#store,t,d.entityId,d);if(mapped){const topic=await t.get('topics',mapped.topicId);if(topic?.createdBy==='user'&&topic.identity?.origin==='user'&&!topic.sourceRecordIds?.length)authoredTopicEligible.add(mapped);found.set(key,mapped);}}return found;};
  return this.#qualificationRead(request,transaction,qualify);
 }
 async #boundMapping(request,transaction=null){
  const qualify=async transaction=>{const t=contextScopeTransactionReader(this.#store,transaction,createContextScopeWorkBudget()),found=new Map();
   for(const {key,descriptor:d}of request.items){if(!['library_entry','placement'].includes(d.kind))continue;const placement=d.kind==='placement'?await t.get('placements',d.recordId||d.entityId):null,entryId=placement?.entryId??(d.kind==='library_entry'?d.entityId:null);if(!entryId)continue;const mapped=await readBoundEntryContext(this.#store,t,entryId,d,placement?.topicId??null);if(mapped)found.set(key,mapped);}return found;};
  return this.#qualificationRead(request,transaction,qualify);
 }
 #bound(state,units){const unique=new Map();for(const u of units)if(u.facet==='context'&&state.boundMapping?.has(u.key)){const m=state.boundMapping.get(u.key),key=boundMaterialKey(m);if(unique.has(key)&&!equal(unique.get(key),m))fail('STALE_BASE');unique.set(key,m);}return [...unique.values()];}
 async #checkBoundMapping(state,units,transaction){
  return this.#qualificationCheck(state,units,transaction,async transaction=>{
  const t=contextScopeTransactionReader(this.#store,transaction,state.authoredBudget);
  for(const u of units)if(u.facet==='context'&&state.boundMapping?.has(u.key)){const m=state.boundMapping.get(u.key),d=state.request.items.find(i=>i.key===u.key).descriptor,now=await readBoundEntryContext(this.#store,t,m.entryId,d,d.kind==='placement'?m.topicId:null);if(!equal(now,m))fail('STALE_BASE');const held=state.boundMaterial?.get(boundMaterialKey(m));if(held&&!equal(boundSelectedText(await t.get('thoughts',m.entryId),m.selectedFields),held.fields))fail('STALE_BASE');}
  });
 }
 #authoredTopicCapable(m){return this.#service?.topic.reconcileAuthoredEntries===true&&!!m&&authoredTopicEligible.has(m);}
 #authoredTopic(state,units){return units.filter(u=>u.facet==='topic'&&this.#authoredTopicCapable(state.authoredMapping?.get(u.key))).map(u=>state.authoredMapping.get(u.key));}
 #authored(state,units){return [...new Map(units.filter(u=>u.facet==='context'&&state.authoredMapping?.has(u.key)||u.facet==='topic'&&this.#authoredTopicCapable(state.authoredMapping?.get(u.key))).map(u=>[u.key,state.authoredMapping.get(u.key)])).values()];}
 async #checkAuthoredMapping(state,units,transaction){
  return this.#qualificationCheck(state,units,transaction,async transaction=>{
  const t=contextScopeTransactionReader(this.#store,transaction,state.authoredBudget);
  for(const m of this.#authored(state,units)){const item=state.request.items.find(i=>i.descriptor.entityId===m.entryId&&i.descriptor.kind==='library_entry'),now=await readAuthoredEntryContext(this.#store,t,m.entryId,item.descriptor);if(!equal(now,m))fail('STALE_BASE');const held=state.authoredMaterial?.get(m.entryId);if(held&&!equal(authoredSelectedText(await t.get('thoughts',m.entryId),authoredSelectedFields(m)),held.fields||{body:held.body}))fail('STALE_BASE');}
  });
 }
 #placementTopics(state,units){return this.#service?.topic.reconcileHumanPlacements===true?units.filter(u=>u.facet==='topic'&&state.placementMapping?.has(u.key)).map(u=>state.placementMapping.get(u.key)):[];}
 #placements(state,units){const found=units.filter(u=>(u.facet==='context'||u.facet==='topic'&&this.#service?.topic.reconcileHumanPlacements===true)&&state.placementMapping?.has(u.key)).map(u=>state.placementMapping.get(u.key));for(const u of units)if(u.facet==='context'&&state.boundMapping?.has(u.key)&&state.request.items.find(i=>i.key===u.key)?.descriptor.kind==='placement'){const m=state.boundMapping.get(u.key);found.push({placementId:m.placementId,revision:m.placementRevision,entryId:m.entryId,entryRevision:m.entryRevision,topicId:m.topicId,topicRevision:m.topicRevision,topicOrganizationRevision:m.topicOrganizationRevision,sectionId:m.sectionId,sectionRevision:m.sectionRevision,layoutGeneration:m.layoutGeneration,inputId:m.inputId});}return [...new Map(found.map(p=>[p.placementId,p])).values()];}
 async #checkPlacementMapping(state,units,t){
  const request={items:state.request.items.filter(i=>units.some(u=>u.key===i.key)),coverage:units},current=await this.#placementMapping(request,t);for(const u of units)if(state.placementMapping?.has(u.key)&&!equal(current.get(u.key),state.placementMapping.get(u.key)))fail('STALE_BASE');
  for(const m of this.#placementTopics(state,units)){const held=state.placementMaterial?.get(m.placementId);if(held){const reader=contextScopeTransactionReader(this.#store,t,state.authoredBudget);for(const {table,key,expected}of held)if(!equal(placementTopicFacts(table,await reader.get(table,key)),expected))fail('STALE_BASE');}}
 }
 async #checkEntryMapping(state,units,t){
  const request={items:state.request.items.filter(i=>units.some(u=>u.key===i.key)),coverage:units},mapping=await this.#entryMapping(request,t);for(const u of units)if(state.entryMapping?.has(u.key)&&!equal(mapping.get(u.key),state.entryMapping.get(u.key)))fail('STALE_BASE');
  await this.#checkPlacementMapping(state,units,t);await this.#checkAuthoredMapping(state,units,t);await this.#checkBoundMapping(state,units,t);await this.#checkStructuralMapping(state,units,t);await this.#checkContextMapping(state,units,t);
 }
 #entries(state,units){
  const entries=units.filter(u=>['topic','context'].includes(u.facet)&&state.entryMapping?.has(u.key)).map(u=>state.entryMapping.get(u.key));
  for(const m of this.#bound(state,units))entries.push({entryId:m.entryId,revision:m.entryRevision,inputIds:[m.inputId]});
  for(const p of this.#placements(state,units))entries.push({entryId:p.entryId,revision:p.entryRevision,inputIds:[p.inputId]});
  for(const m of this.#structures(state,units))for(const e of m.entries)entries.push({entryId:e.entryId,revision:e.revision,inputIds:[e.inputId]});
  const unique=new Map();for(const e of entries){if(unique.has(e.entryId)&&!equal(unique.get(e.entryId),e))fail('STALE_BASE');unique.set(e.entryId,e);}return [...unique.values()].sort((a,b)=>a.entryId.localeCompare(b.entryId));
 }
 #inputs(state,units){
  const ids=new Set();for(const u of units){const item=state.request.items.find(i=>i.key===u.key),d=item?.descriptor;
   if(d?.kind==='input'&&d.inputIds.length===1&&d.inputIds[0]===d.entityId)ids.add(d.entityId);
   else if(d?.kind==='library_entry'&&['topic','context'].includes(u.facet)&&state.entryMapping?.has(u.key)){for(const id of state.entryMapping.get(u.key).inputIds)ids.add(id);}
   else if(u.facet==='context'&&state.boundMapping?.has(u.key))ids.add(state.boundMapping.get(u.key).inputId);
   else if(d?.kind==='library_entry'&&(u.facet==='context'||u.facet==='topic'&&this.#authoredTopicCapable(state.authoredMapping?.get(u.key)))&&state.authoredMapping?.has(u.key))continue;
   else if(d?.kind==='placement'&&(u.facet==='context'||u.facet==='topic'&&this.#service?.topic.reconcileHumanPlacements===true)&&state.placementMapping?.has(u.key))ids.add(state.placementMapping.get(u.key).inputId);
   else if(this.#structures(state,[u]).length)for(const e of state.structuralMapping.get(u.key).entries)ids.add(e.inputId);
   else if(d?.kind==='context_item'&&u.facet==='context'&&state.contextMapping?.has(u.key))for(const e of state.contextMapping.get(u.key).provenance.evidence)ids.add(e.inputId);
   else return null;
  }return [...ids].sort();
 }
 async prepare(options){
  const copied=structuredClone(options);exact(copied,['scope','contractVersion','routeVersion','cursor','limit'],['scope','contractVersion','routeVersion']);
  const key=canonical(copied);
  if(this.#preparing){if(this.#preparing.key!==key)fail('REQUEST_ALREADY_IN_FLIGHT');return this.#preparing.promise;}
  const pending={key,promise:null,controller:new AbortController(),selection:null,wall:processingWall(),mono:processingMono()};this.#preparing=pending;
  pending.promise=this.#prepare(copied,pending.controller.signal).finally(()=>{const selected=processingSelections.get(pending.selection);if(selected&&!selected.state)retireProcessingSelection(pending.selection);if(this.#preparing===pending)this.#preparing=null;});return pending.promise;
 }
 async #prepare(options,signal){
  this.#preparing.workBudget=createContextScopeWorkBudget({database:this.#store.repository.db});
  const generation=this.#generation;if(this.#remote){const recovered=await this.#remote.assertCanPlan(this.#foundation,id=>this.#jobs.has(id),()=>generation===this.#generation&&!signal.aborted);if(recovered)return this.#passiveHandle({status:'RECOVERED',complete:false},generation);}let batch=await readMaintenanceBatch(this.#foundation,options),deferredUnits=0;this.#replaceProcessingSelection(batch,options);
  if(generation!==this.#generation||signal.aborted)fail('UNAVAILABLE');
  // A configured local original-domain mapper resolves only its explicit old
  // retry condition. At most one mapper pass, distinct from obsolete cleanup.
  const mappingReady=this.#service?.responseAdapter&&(this.#provider||this.#remote)&&typeof this.#window?.acquire==='function'&&typeof this.#window?.isCurrent==='function';
  if(mappingReady&&(batch.blockedUnits>0||batch.reason==='DEFER_SCAN_BOUND')){
   if(!this.#remote)localProviderDescriptor(this.#provider);
   const cleanup=await this.#foundation.archiveObsoleteDeferred({limit:100,reconsiderEntryTopics:true,reconsiderEntryContexts:true,reconsiderPlacementContexts:true,reconsiderPlacementTopics:this.#service?.topic.reconcileHumanPlacements===true,reconsiderStructuralContexts:true,reconsiderContextEdits:true,reconsiderStructuralTopics:this.#service?.topic.reconcileHumanNames===true||this.#service?.topic.reconcileHumanSections===true,maintenanceRouteVersion:options.routeVersion},{signal,isCurrent:()=>generation===this.#generation&&!signal.aborted});
   if(generation!==this.#generation||signal.aborted)fail('UNAVAILABLE');
   if(cleanup.archived){batch=await readMaintenanceBatch(this.#foundation,options);this.#replaceProcessingSelection(batch,options);if(generation!==this.#generation||signal.aborted)fail('UNAVAILABLE');}
  }
  if(batch.status!=='CANDIDATE_ONLY')return this.#passiveHandle(batch,generation,deferredUnits);
  this.#preparing.requestIdentity=await prepareMaintenanceQualificationRequest(batch.request,{workBudget:this.#preparing.workBudget});
  if(generation!==this.#generation||signal.aborted)fail('UNAVAILABLE');
  const localCorrections=await qualifyContextProtectionCorrections(this.#foundation,batch.request.items);
  if(generation!==this.#generation||signal.aborted)fail('UNAVAILABLE');
  if(localCorrections.size){
   const coverage=batch.request.coverage.filter(u=>localCorrections.has(u.key)&&['topic','context'].includes(u.facet)),items=batch.request.items.filter(i=>coverage.some(u=>u.key===i.key)),children=[];
   for(let at=0;at<coverage.length;at+=50)children.push(coverage.slice(at,at+50));
   if(coverage.length){const request={...batch.request,items,coverage,children},job=await this.#foundation.plan(request);
    if(generation!==this.#generation||signal.aborted)fail('UNAVAILABLE');
    const owner={job,request,captured:localCorrections,generation,signal};this.#localCorrection=owner;
    try{if(job.id!==null)await this.#foundation.resolveLocalSubset(job.id,{units:coverage});}finally{if(this.#localCorrection===owner)this.#localCorrection=null;}
    if(generation!==this.#generation||signal.aborted)fail('UNAVAILABLE');
    const complete=coverage.length===batch.request.coverage.length&&batch.complete===true,remainingWork=!complete||(batch.blockedUnits??0)>0,progress={localResolvedUnits:coverage.length,remainingWork,blockedUnits:batch.blockedUnits??0,deferredUnits:0},state=remainingWork?'PARTIAL':'COMMITTED';
    const handle=Object.freeze(outcome(state,{jobId:job.id,nextCursor:coverage.length===batch.request.coverage.length?batch.nextCursor:options.cursor??null,complete,...progress}));this.#passive.set(handle,{generation,state,...progress});return handle;
   }
  }
  if(!this.#service?.responseAdapter||!this.#provider&&!this.#remote||typeof this.#window?.acquire!=='function'||typeof this.#window?.isCurrent!=='function')fail('UNAVAILABLE');
  const descriptor=this.#remote?null:localProviderDescriptor(this.#provider);
  let entryMapping=await this.#entryMapping(batch.request),placementMapping=await this.#placementMapping(batch.request),authoredMapping=await this.#authoredMapping(batch.request),boundMapping=await this.#boundMapping(batch.request),structuralMapping=await this.#structuralMapping(batch.request),contextMapping=await this.#contextMapping(batch.request);if(generation!==this.#generation||signal.aborted)fail('UNAVAILABLE');
  // One complete correction per opportunity. Its protected original Item
  // cannot borrow another unit's result, evidence, Topic ACK or processing grant.
  const isolateContext=()=>{const key=[...contextMapping.keys()].find(key=>batch.request.coverage.some(u=>u.key===key&&u.facet==='context'));if(key){const coverage=batch.request.coverage.filter(u=>u.key===key),omitted=coverage.length!==batch.request.coverage.length;
   batch={...batch,...(omitted?{nextCursor:options.cursor??null,complete:false,pendingBatchUnits:batch.request.coverage.length-coverage.length}:{}),request:{...batch.request,items:batch.request.items.filter(i=>i.key===key),coverage,children:[coverage]}};
  }};isolateContext();
  // The explicitly capable route checks one complete renamed structure per
  // opportunity. Other dirty work retains its original scan boundary.
  const isolateStructure=()=>{
   const selected=batch.request.coverage.find(u=>u.facet==='topic'&&this.#structuralTopicCapable(structuralMapping.get(u.key)));
   if(selected){const coverage=batch.request.coverage.filter(u=>u.key===selected.key),omitted=coverage.length!==batch.request.coverage.length;
    batch={...batch,...(omitted?{nextCursor:options.cursor??null,complete:false,pendingBatchUnits:batch.request.coverage.length-coverage.length}:{}),request:{...batch.request,items:batch.request.items.filter(i=>i.key===selected.key),coverage,children:[coverage]}};
   }
  };const isolateAuthored=()=>{const u=batch.request.coverage.find(u=>u.facet==='topic'&&this.#authoredTopicCapable(authoredMapping.get(u.key)));if(u){const coverage=batch.request.coverage.filter(x=>x.key===u.key),omitted=coverage.length!==batch.request.coverage.length;batch={...batch,...(omitted?{nextCursor:options.cursor??null,complete:false,pendingBatchUnits:batch.request.coverage.length-coverage.length}:{}),request:{...batch.request,items:batch.request.items.filter(i=>i.key===u.key),coverage,children:[coverage]}};}};isolateStructure();isolateAuthored();const isolatePlacement=()=>{const selected=this.#service?.topic.reconcileHumanPlacements===true?batch.request.coverage.find(u=>u.facet==='topic'&&placementMapping.has(u.key)):null;if(selected){const coverage=batch.request.coverage.filter(u=>u.key===selected.key),omitted=coverage.length!==batch.request.coverage.length;batch={...batch,...(omitted?{nextCursor:options.cursor??null,complete:false,pendingBatchUnits:batch.request.coverage.length-coverage.length}:{}),request:{...batch.request,items:batch.request.items.filter(i=>i.key===selected.key),coverage,children:[coverage]}};}};isolatePlacement();
  const unsupported=unsupportedMaintenanceCoverage(batch.request.items,batch.request.coverage,new Set(entryMapping.keys()),new Set(placementMapping.keys()),new Set(authoredMapping.keys()),new Set(boundMapping.keys()),new Set(structuralMapping.keys()),new Set([...structuralMapping].filter(([,m])=>this.#structuralTopicCapable(m)).map(([key])=>key)),new Set(contextMapping.keys()),new Set([...authoredMapping].filter(([,m])=>this.#authoredTopicCapable(m)).map(([key])=>key)),this.#service?.topic.reconcileHumanPlacements===true?new Set(placementMapping.keys()):new Set());
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
   batch=await readMaintenanceBatch(this.#foundation,options);this.#replaceProcessingSelection(batch,options);if(generation!==this.#generation||signal.aborted)fail('UNAVAILABLE');
   if(batch.status!=='CANDIDATE_ONLY')return this.#passiveHandle(batch,generation,deferredUnits);
   this.#preparing.requestIdentity=await prepareMaintenanceQualificationRequest(batch.request,{workBudget:this.#preparing.workBudget});if(generation!==this.#generation||signal.aborted)fail('UNAVAILABLE');
   entryMapping=await this.#entryMapping(batch.request);placementMapping=await this.#placementMapping(batch.request);authoredMapping=await this.#authoredMapping(batch.request);boundMapping=await this.#boundMapping(batch.request);structuralMapping=await this.#structuralMapping(batch.request);contextMapping=await this.#contextMapping(batch.request);if(generation!==this.#generation||signal.aborted)fail('UNAVAILABLE');
   isolateContext();isolateStructure();isolateAuthored();isolatePlacement();
   if(unsupportedMaintenanceCoverage(batch.request.items,batch.request.coverage,new Set(entryMapping.keys()),new Set(placementMapping.keys()),new Set(authoredMapping.keys()),new Set(boundMapping.keys()),new Set(structuralMapping.keys()),new Set([...structuralMapping].filter(([,m])=>this.#structuralTopicCapable(m)).map(([key])=>key)),new Set(contextMapping.keys()),new Set([...authoredMapping].filter(([,m])=>this.#authoredTopicCapable(m)).map(([key])=>key)),this.#service?.topic.reconcileHumanPlacements===true?new Set(placementMapping.keys()):new Set()).length)fail('UNAVAILABLE');
  }
  const request=batch.request;if(this.#remote)Object.assign(request,await this.#remote.planIdentity(this.#foundation,id=>this.#jobs.has(id)));
  // A mixed cycle reserves its original two-child envelope up front. Human
  // Placement/Authored Context gets its first processing/material snapshot only
  // after the Topic child commits. No sent snapshot or grant is refreshed.
  const followingKeys=new Set(request.coverage.some(u=>u.facet==='topic'&&!this.#structures({structuralMapping},[u]).length&&!this.#authoredTopic({authoredMapping},[u]).length&&!this.#placementTopics({placementMapping},[u]).length)?request.coverage.filter(u=>u.facet==='context'&&(placementMapping.has(u.key)||authoredMapping.has(u.key)||boundMapping.has(u.key)||structuralMapping.has(u.key))).map(u=>u.key):[]);
  const partitionCoverage=coverage=>{
   const partitions=[];let partition=null;
   for(const item of request.items){const units=coverage.filter(u=>u.key===item.key);if(!units.length)continue;const sources=[...new Set([...item.descriptor.sourceRecordIds,...(structuralMapping.get(item.key)?.sourceRecordIds||[]),...(contextMapping.get(item.key)?.sourceRecordIds||[])])];if(sources.length>20)fail('BUDGET_EXCEEDED');
    const combined=new Set([...(partition?.sources||[]),...sources]),inputIds=this.#inputs({request,entryMapping,placementMapping,authoredMapping,boundMapping,structuralMapping,contextMapping},units),combinedInputs=new Set([...(partition?.inputs||[]),...inputIds]);
    if(!partition||partition.units.length+units.length>50||combinedInputs.size+this.#authored({authoredMapping},[...(partition?.units||[]),...units]).length+this.#bound({boundMapping},[...(partition?.units||[]),...units]).length>Math.min(20,this.#store.organizerBudget.limits.maxInputs)||combined.size>20){partition={sources:new Set(),units:[],inputs:new Set()};partitions.push(partition);}
    for(const id of sources)partition.sources.add(id);partition.units.push(...units);for(const id of inputIds)partition.inputs.add(id);
   }return partitions;
  };
  let partitions=followingKeys.size?[...partitionCoverage(request.coverage.filter(u=>!followingKeys.has(u.key))),...partitionCoverage(request.coverage.filter(u=>followingKeys.has(u.key)))]:partitionCoverage(request.coverage),pendingPlacementUnits=0,pendingAuthoredUnits=0,pendingBoundUnits=0,pendingStructuralUnits=0;
  if(partitions.length>2&&followingKeys.size){
   // A saturated cycle leaves the real obligations pending. There is no third
   // call, fake DEFER/ACK or scan advancement past withheld human work.
   pendingPlacementUnits=request.coverage.filter(u=>followingKeys.has(u.key)&&placementMapping.has(u.key)).length;pendingAuthoredUnits=request.coverage.filter(u=>followingKeys.has(u.key)&&authoredMapping.has(u.key)).length;pendingBoundUnits=request.coverage.filter(u=>followingKeys.has(u.key)&&boundMapping.has(u.key)).length;pendingStructuralUnits=request.coverage.filter(u=>followingKeys.has(u.key)&&structuralMapping.has(u.key)).length;
   request.coverage=request.coverage.filter(u=>!followingKeys.has(u.key));request.items=request.items.filter(item=>request.coverage.some(u=>u.key===item.key));followingKeys.clear();partitions=partitionCoverage(request.coverage);batch={...batch,nextCursor:options.cursor??null,complete:false};
  }
  if(partitions.length>2)fail('BUDGET_EXCEEDED');request.children=partitions.map(p=>validateCoverage(p.units,TYPE));
  const progress={deferredUnits,blockedUnits:batch.blockedUnits??0,...(batch.pendingBatchUnits?{pendingBatchUnits:batch.pendingBatchUnits}:{}),...(pendingPlacementUnits?{pendingPlacementUnits}:{}),...(pendingAuthoredUnits?{pendingAuthoredUnits}:{}),...(pendingBoundUnits?{pendingBoundUnits}:{}),...(pendingStructuralUnits?{pendingStructuralUnits}:{}),remainingWork:pendingStructuralUnits>0||pendingBoundUnits>0||pendingAuthoredUnits>0||pendingPlacementUnits>0||deferredUnits>0||batch.complete!==true||(batch.blockedUnits??0)>0};
  const requestDigest=await digest(request);
  if(generation!==this.#generation)fail('UNAVAILABLE');
  // This receipt is only the private host opportunity seam, not a signed
  // commercial route/reservation proof. Remote providers remain refused.
  const grant=await this.#window.acquire(Object.freeze({jobType:TYPE,requestDigest}));
  if(this.#remote){exact(grant,['version','kind','requestDigest','revocationSignal']);if(grant.kind!=='service-opportunity')fail('UNAVAILABLE');}
  else{exact(grant,['version','kind','dayId','windowId','reservationId','tier','requestDigest','revocationSignal']);if(!['fixture','local'].includes(grant.kind)||grant.kind!==descriptor.executionKind||!['free','pro'].includes(grant.tier)||![grant.dayId,grant.windowId,grant.reservationId].every(opaque))fail('UNAVAILABLE');}
  if(grant.version!==1||grant.requestDigest!==requestDigest||!(grant.revocationSignal instanceof AbortSignal)||grant.revocationSignal.aborted||generation!==this.#generation)fail('UNAVAILABLE');
  syncTrue(this.#window.isCurrent(grant));
  const job=await this.#foundation.plan(request);
  if(generation!==this.#generation||grant.revocationSignal.aborted)fail('UNAVAILABLE');syncTrue(this.#window.isCurrent(grant));
  if(job.id===null||['NO_DELTA','COMMITTED'].includes(job.state)){const partial=(batch.pendingBatchUnits??0)>0||pendingPlacementUnits||pendingAuthoredUnits||pendingBoundUnits||pendingStructuralUnits,state=partial?'PARTIAL':job.state,processed=partial?{processedState:job.state}:{};const handle=Object.freeze(outcome(state,{jobId:job.id,nextCursor:batch.nextCursor,complete:batch.complete,...progress,...processed}));this.#passive.set(handle,{generation,state,...progress,...processed});return handle;}
  if(this.#jobs.has(job.id))return this.#jobs.get(job.id).handle;
  const handle=Object.freeze(outcome(job.state,{jobId:job.id,childCount:job.childIds.length,nextCursor:batch.nextCursor,complete:batch.complete,...progress}));
  const state={processingSelection:this.#preparing.selection,promotions:new Map(),domainSettlements:[],progress,request,entryMapping,placementMapping,authoredMapping,boundMapping,structuralMapping,contextMapping,contextMaterial:new Map(),topicCandidates:new Map(),topicCandidateSummaries:new Map(),candidateQualifications:new Map(),candidatePublicationStart:new Map(),candidateOperations:new Map(),existingContext:new Map(),existingSettled:new Map(),existingPublicationStart:new Map(),publications:[],topicPublications:new Map(),qualifications:new Map(),qualificationPublicationStart:new Map(),postTopicQualifications:new Map(),releasedChildren:new Set(),failedChildren:new Set(),failedFacets:new Set(),followingKeys,followingReady:request.coverage.filter(u=>u.facet==='topic').every(u=>job.committedCoverage.includes(unitKey(u))),authoredMaterial:new Map(),boundMaterial:new Map(),structuralMaterial:new Map(),placementMaterial:new Map(),structuralInputs:new Map(),qualificationBudget:this.#preparing.workBudget,qualificationRequest:this.#preparing.requestIdentity,authoredBudget:forkContextScopeWorkBudget(this.#preparing.workBudget,{signal}),job,handle,generation,grant,grantBinding:Object.freeze({...grant}),controller:new AbortController(),running:null,groups:new Map(),prepared:new Map(),filterHandles:new Map(),filterCommands:new Map(),filterRetryChildren:new Set(),filterQualifications:new Map(),filterPublications:new Map(),outputs:new Map(),topicResults:new Map(),contextDeferred:new Map(),deferredUnits:new Set(),processing:new Map(),processingCleanup:new Set(),completed:false};
  const revoked=()=>{this.#releaseFilters(state);state.controller.abort();state.outputs.clear();this.#remote?.releaseResponseJob(state.job.id);state.topicResults.clear();state.prepared.clear();state.groups.clear();state.contextDeferred.clear();state.deferredUnits.clear();state.authoredMaterial.clear();state.boundMaterial.clear();state.structuralMaterial.clear();state.placementMaterial.clear();state.structuralInputs.clear();state.prepared.clear();state.groups.clear();state.contextDeferred.clear();this.#releaseContextEdits(state);this.#releaseExistingContext(state);this.#releaseTopicCandidates(state);state.processing.clear();};grant.revocationSignal.addEventListener('abort',revoked,{once:true});state.removeRevocation=()=>grant.revocationSignal.removeEventListener('abort',revoked);
  this.#jobs.set(job.id,state);const selected=processingSelections.get(state.processingSelection);if(selected){selected.state=state;const stop=()=>retireProcessingSelection(state.processingSelection);state.controller.signal.addEventListener('abort',stop,{once:true});state.processingCleanup.add(()=>state.controller.signal.removeEventListener('abort',stop));}this.#handles.set(handle,state);return handle;
 }
 #passiveHandle(batch,generation,deferredUnits=0){
  const progress={deferredUnits,blockedUnits:batch.blockedUnits??0,remainingWork:deferredUnits>0||batch.complete!==true||batch.status==='DEFERRED'||batch.reason==='DEFER_SCAN_BOUND'||(batch.blockedUnits??0)>0};
  const handle=Object.freeze(outcome(batch.status,{jobId:null,nextCursor:batch.nextCursor??null,complete:batch.complete??false,...(batch.reason?{reason:batch.reason}:{}),...progress}));this.#passive.set(handle,{generation,state:batch.status,...progress});return handle;
 }
 #settled(state,facets=[]){
  // Job settlement and scan completion are separate: a committed page may
  // still have a continuation, while deferred facets remain a partial job.
  const partial=(state.progress.pendingBatchUnits??0)>0||state.progress.deferredUnits>0||state.progress.blockedUnits>0||(state.progress.pendingPlacementUnits??0)>0||(state.progress.pendingAuthoredUnits??0)>0||(state.progress.pendingBoundUnits??0)>0||(state.progress.pendingStructuralUnits??0)>0;
  return outcome(partial?'PARTIAL':'COMMITTED',{jobId:state.job.id,facets,...(state.scheduling||{}),nextCursor:state.handle.nextCursor,complete:state.handle.complete,...state.progress,...(partial?{processedState:'COMMITTED'}:{})});
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
   const adapted=structuredClone(await this.#service.responseAdapter[facet](structuredClone(saved.response),input,Object.freeze(correlation),facet==='context'?(a.state.postTopicQualifications.get(a.childId)||a.state.qualifications.get(a.childId)):null));
   this.#current(a.state);if(this.#response(a)!==saved)fail('STALE_BASE');
   exact(adapted,['binding','value']);if(!equal(adapted.binding,correlation))fail('STALE_BASE');return adapted.value;
  }catch(e){
   let deferred;try{deferred=this.#adapterDefer(a,facet,e);if(deferred&&this.#response(a)!==saved)fail('STALE_BASE');}
   catch(error){a.state.outputs.delete(a.childId);this.#remote?.releaseResponseChild(a.childId);a.state.topicResults.delete(a.childId);throw error;}
   if(!deferred){a.state.outputs.delete(a.childId);this.#remote?.releaseResponseChild(a.childId);a.state.topicResults.delete(a.childId);}throw e;
  }
 }
 #adapterDefer(a,facet,error){
  const deferred=readMaintenanceResponseDefer(error);if(deferred===null)return null;this.#current(a.state);
  exact(deferred,['binding','facet','units','retryCondition','groups']);
  if(deferred.facet!==facet||!equal(deferred.binding,this.#correlation(a))||deferred.retryCondition!==deferReason[facet]||!Array.isArray(deferred.groups))fail('STALE_BASE');
  const units=validateCoverage(deferred.units,TYPE);if(units.some(u=>u.facet!==facet||!a.units.some(v=>equal(u,v))))fail('STALE_BASE');
  if(facet!=='context'&&(deferred.groups.length||!equal(units.map(unitKey).sort(),a.units.map(unitKey).sort())))fail('STALE_BASE');
  return deferred;
 }
 #assertProcessing(receipt){
  assertMaintenanceProcessingReceipt(receipt,this.#processing,this.#store);
  if(!receipt||receipt.store!==this.#store||receipt.caller!==this.#service.context.caller||receipt.processing!==true||receipt.revocationSignal.aborted||receipt.expiresAt<=Date.now())fail('UNAVAILABLE');

 }
 #processingCurrent(state,receipt,options){this.#current(state,options);this.#assertProcessing(receipt);}
 async #processingReceipt(state,metadata){
  this.#current(state);if(!this.#processing)fail('UNAVAILABLE');
  const inputIds=this.#inputs(state,metadata.coverage),entries=this.#entries(state,metadata.coverage),authoredEntries=this.#authored(state,metadata.coverage),boundEntries=this.#bound(state,metadata.coverage);if(!inputIds||!inputIds.length&&!authoredEntries.length)fail('UNAVAILABLE');
  if(entries.length||authoredEntries.length){await this.#foundation.read(t=>this.#checkEntryMapping(state,metadata.coverage,t));this.#current(state);}
  const receipt=await this.#foundation.read(async t=>{
   const job=await this.#foundation.job(t,state.job.id);await this.#foundation.current(t,job);this.#current(state);
   const request={purpose:'ai-maintenance-payload',logicalJobId:job.id,childOperationId:metadata.childOperationId,principalId:job.authority.principalId,libraryId:job.authority.libraryId,consentEpoch:job.authority.consentEpoch,inputs:inputIds.map(inputId=>({inputId,selectedFields:['body']})),...(this.#authoredTopic(state,metadata.coverage).length?{authoredTopic:this.#authoredTopic(state,metadata.coverage).map(m=>({entryId:m.entryId,topicId:m.topicId,topicRevision:m.topicRevision,selectedFields:['name']}))}:{}),...(entries.length?{entries:entries.map(({entryId,revision})=>({entryId,revision,selectedFields:['body']}))}:{}),...(this.#placements(state,metadata.coverage).length?{placements:structuredClone(this.#placements(state,metadata.coverage))}:{}),...(authoredEntries.length?{authoredEntries:authoredEntries.map(m=>({...structuredClone(m),selectedFields:[...authoredSelectedFields(m)]}))}:{}),...(boundEntries.length?{boundEntries:structuredClone(boundEntries)}:{}),...structuralContextGroups(this.#structures(state,metadata.coverage)),...(this.#contextEdits(state,metadata.coverage).length?{contextItems:this.#contextEdits(state,metadata.coverage).map(contextEditScope)}:{}),facets:[...new Set(metadata.coverage.map(u=>u.facet))].sort(),coverage:structuredClone(metadata.coverage)};
   if(metadata.coverage.some(u=>u.facet==='context')&&!this.#contextEdits(state,metadata.coverage).length){
    if(!state.existingContext.has(metadata.childOperationId)){state.existingContext.set(metadata.childOperationId,await selectMaintenanceExistingContext(this.#store,t,request,{limits:this.#store.organizerBudget.limits}));state.existingPublicationStart.set(metadata.childOperationId,state.publications.length);}
    const selected=maintenanceExistingContextScope(state.existingContext.get(metadata.childOperationId));if(selected.length)request.existingContextItems=structuredClone(selected);
   }
   if(typeof this.#service.responseAdapter?.topicCandidate==='function'&&request.facets.includes('topic')&&!entries.length&&!authoredEntries.length&&!boundEntries.length&&!this.#structures(state,metadata.coverage).length){
    if(!state.topicCandidates.has(metadata.childOperationId)){const selected=await selectMaintenanceTopicCandidates(this.#store,t,{inputScope:inputIds.map(inputId=>({inputId,role:'primary',selectedFields:['body']})),binding:{logicalJobId:job.id,childOperationId:metadata.childOperationId,principalId:job.authority.principalId,libraryId:job.authority.libraryId,consentEpoch:job.authority.consentEpoch},workBudget:state.qualificationBudget,signal:state.controller.signal,isCurrent:()=>{this.#current(state);return true;},resolveProcessing:this.#service.topic.resolveProcessing});state.topicCandidateSummaries.set(metadata.childOperationId,maintenanceTopicCandidateSummary(selected));if(maintenanceTopicCandidateSummary(selected).selectedCandidates){state.topicCandidates.set(metadata.childOperationId,selected);state.candidatePublicationStart.set(metadata.childOperationId,state.publications.length);}else{releaseMaintenanceTopicCandidates(selected);state.topicCandidates.set(metadata.childOperationId,null);}}
    const selected=state.topicCandidates.get(metadata.childOperationId);if(selected){const scope=maintenanceTopicCandidateScope(selected);request.topicCandidates=scope.candidates;request.topicCandidateInputs=scope.inputs.filter(i=>!inputIds.includes(i.inputId)).map(i=>({inputId:i.inputId,revision:i.revision,role:i.evidence.role,selectedFields:i.evidence.selectedFields}));}
   }
   const scope=frozen(structuredClone(request)),selectedRequest={items:state.request.items.filter(item=>metadata.coverage.some(unit=>unit.key===item.key)),coverage:metadata.coverage},permit=this.#processingPermit(t,selectedRequest,{scope,phase:'payload',selection:{inputIds},binding:{logicalJobId:job.id,childOperationId:metadata.childOperationId,principalId:job.authority.principalId,libraryId:job.authority.libraryId,consentEpoch:job.authority.consentEpoch},parent:null,workBudget:state.qualificationBudget},'payload',state);
   const raw=await this.#processing.resolve(t,scope,permit);this.#current(state);
   exact(raw,['version','store','caller','scope','epoch','processing','expiresAt','revocationSignal']);
   if(Reflect.ownKeys(raw).some(k=>!Object.hasOwn(Object.getOwnPropertyDescriptor(raw,k),'value'))||raw.version!==1||raw.store!==this.#store||raw.caller!==this.#service.context.caller||!Object.isFrozen(raw.caller)||!opaque(raw.epoch)||raw.processing!==true||!Number.isSafeInteger(raw.expiresAt)||raw.expiresAt<=Date.now()||!(raw.revocationSignal instanceof AbortSignal)||raw.revocationSignal.aborted)fail('UNAVAILABLE');
   const responseScope=responseSnapshot(raw.scope,32768);if(!equal(responseScope,request))fail('UNAVAILABLE');
   return captureMaintenanceProcessingReceipt(raw,{processing:this.#processing,store:this.#store,caller:this.#service.context.caller,scope:request});
  });
  this.#processingCurrent(state,receipt);const prior=state.processing.get(metadata.childOperationId);
  if(prior)this.#assertProcessing(prior);
  if(prior&&(prior.epoch!==receipt.epoch||prior.expiresAt!==receipt.expiresAt||prior.revocationSignal!==receipt.revocationSignal||!equal(prior.scope,receipt.scope)))fail('UNAVAILABLE');
  if(!prior){
   const signal=receipt.revocationSignal,stopped=state.controller.signal,deadline=performance.now()+Math.max(0,receipt.expiresAt-Date.now());let timer=null,closed=false,removed=false;
   const stopTimer=()=>{closed=true;clearTimeout(timer);};
   const cleanup=()=>{stopTimer();if(removed)return;removed=true;try{signal.removeEventListener('abort',abort);}finally{stopped.removeEventListener('abort',stopTimer);state.processingCleanup.delete(cleanup);}};
   const abort=()=>{try{cleanup();}catch{/* Host listener cleanup cannot retain expired private material. */}this.#releaseFilters(state);state.controller.abort();state.outputs.clear();this.#remote?.releaseResponseJob(state.job.id);state.topicResults.clear();state.prepared.clear();state.groups.clear();state.contextDeferred.clear();state.deferredUnits.clear();state.authoredMaterial.clear();state.boundMaterial.clear();state.structuralMaterial.clear();state.placementMaterial.clear();state.structuralInputs.clear();this.#releaseContextEdits(state);this.#releaseExistingContext(state);this.#releaseTopicCandidates(state);for(const map of [state.qualifications,state.postTopicQualifications]){for(const token of map.values())releaseMaintenanceQualification(token);map.clear();}};
   // An idle storage rollback must not retain private material beyond the
   // original processing receipt. Clock rollback cannot extend its lifetime.
   // Keep the body-free job/attempt identity: expiry never admits a new call.
   const expire=()=>{if(closed)return;const remaining=Math.min(receipt.expiresAt-Date.now(),deadline-performance.now());if(remaining<=0)abort();else{timer=setTimeout(expire,Math.min(remaining,2147483647));timer?.unref?.();}};
   signal.addEventListener('abort',abort,{once:true});stopped.addEventListener('abort',stopTimer,{once:true});state.processingCleanup.add(cleanup);expire();
  }
  state.processing.set(metadata.childOperationId,receipt);return receipt;
 }
 async #qualifyExactReuse(selection,base){
  const a=this.#active;if(!a||a.facet!=='topic'||base!==this.#ownerQualification('topic'))fail('UNAVAILABLE');const processing=a.state.processing.get(a.childId);this.#processingCurrent(a.state,processing);
  const token=await this.#foundation.read(t=>createMaintenanceTopicExactReuseQualification(this.#store,t,selection,{base,processing:this.#processing,caller:this.#service.context.caller,parent:processing,signal:a.state.controller.signal,isCurrent:()=>{this.#processingCurrent(a.state,processing);return true;}}));
  try{this.#processingCurrent(a.state,processing);return token;}catch(error){releaseMaintenanceQualification(token);throw error;}
 }
 #ownerQualification(facet=null){const a=this.#active||this.#materialOwner;if(!a)fail('UNAVAILABLE');const token=(facet==='topic'?a.state.candidateQualifications.get(a.childId):null)||a.state.postTopicQualifications.get(a.childId)||a.state.qualifications.get(a.childId);assertMaintenanceQualification(token,this.#store);return token;}
 async #childQualification(state,metadata,{afterTopic=false}={}){
  const map=afterTopic?state.postTopicQualifications:state.qualifications,prior=map.get(metadata.childOperationId);if(prior){assertMaintenanceQualification(prior,this.#store);return prior;}
  const processing=state.processing.get(metadata.childOperationId);this.#processingCurrent(state,processing);
  const token=await this.#foundation.read(async t=>{
   if(afterTopic){let authority=maintenanceQualificationReceipt(state.qualifications.get(metadata.childOperationId),this.#store).scope.rootAuthority;for(const token of state.publications.slice(state.qualificationPublicationStart.get(metadata.childOperationId))){const publication=readTopicFormationPublication(token,this.#store)||readContextMaintenancePublication(token,this.#store);if(!publication||publication.beforeAuthority!==authority)fail('STALE_BASE');authority=publication.authority;}if(await rootReadAuthority(t)!==authority)fail('STALE_BASE');}
   const existing=state.existingContext.get(metadata.childOperationId),selected=existing?await maintenanceExistingContextQualification(this.#store,t,existing,{publications:state.publications.slice(state.existingPublicationStart.get(metadata.childOperationId)||0)}):{entryIds:[],structures:[]};
   const ids=new Set([...this.#entries(state,metadata.coverage).map(e=>e.entryId),...this.#authored(state,metadata.coverage).map(e=>e.entryId),...selected.entryIds]),inputIds=this.#inputs(state,metadata.coverage);
   const topicIds=new Set([...this.#authored(state,metadata.coverage).map(m=>m.topicId),...this.#bound(state,metadata.coverage).map(m=>m.topicId),...this.#placements(state,metadata.coverage).map(m=>m.topicId),...this.#structures(state,metadata.coverage).map(m=>m.topicId),...this.#contextEdits(state,metadata.coverage).flatMap(m=>m.provenance.evidence.map(e=>e.topicId))]);
   if(!afterTopic&&this.#following(state,metadata.coverage)){
    const selectedInputs=new Set(this.#inputs(state,state.request.coverage)),additional=new Set();
    for(const topicId of topicIds){const topic=await t.get('topics',topicId);if(!topic)fail('STALE_BASE');const range=IDBKeyRange.bound([topicId,topic.activeLayoutGeneration,0],[topicId,topic.activeLayoutGeneration,0,[]],false,true),count=await t.count('placements','byTopicOrder',range);if(!Number.isSafeInteger(count)||count>CONTEXT_TOPIC_SCOPE_LIMITS.refs)fail('BUDGET_EXCEEDED');for(const placement of await t.all('placements','byTopicOrder',range)){const row=await t.get('thoughts',placement.entryId);if(!row)fail('STALE_BASE');if(row.bodyBinding==='input'&&!inputIds.includes(row.workingInputId)){if(!selectedInputs.has(row.workingInputId))fail('UNAVAILABLE');additional.add(row.workingInputId);}}}
    // Only a genuine local qualification expansion needs the prior committed
    // Topic publication chain. A separately selected source-free human Topic
    // cannot be made stale by this job's unrelated successful Filter write.
    if(additional.size){const publications=state.publications.map(token=>readTopicFormationPublication(token,this.#store)||readContextMaintenancePublication(token,this.#store));
     if(!publications.length||!state.publications.some(token=>readTopicFormationPublication(token,this.#store)))fail('STALE_BASE');
     for(let i=0;i<publications.length;i++)if(!publications[i]||i&&publications[i].beforeAuthority!==publications[i-1].authority)fail('STALE_BASE');
     if(await rootReadAuthority(t)!==publications.at(-1).authority)fail('STALE_BASE');inputIds.push(...additional);
    }
    if(inputIds.length>20)fail('BUDGET_EXCEEDED');
   }
   if(afterTopic){const original=state.topicPublications.get(metadata.childOperationId),publication=readTopicFormationPublication(original,this.#store);if(!publication)fail('STALE_BASE');for(const write of publication.writes)if(write.store==='placements'&&write.value)topicIds.add(write.value.topicId);
    for(const [key,mapping]of state.structuralMapping)if(state.request.items.some(i=>i.key===key)&&mapping.entries.every(e=>inputIds.includes(e.inputId))){topicIds.add(mapping.topicId);for(const entry of mapping.entries)ids.add(entry.entryId);}
    for(const [key,mapping]of state.placementMapping)if(state.request.items.some(i=>i.key===key)&&inputIds.includes(mapping.inputId)){topicIds.add(mapping.topicId);ids.add(mapping.entryId);}
    // The original job already selected these human Entries for its following
    // child. This new local-only receipt permits original Context qualification
    // after Topic ACK; none of their prose becomes first-child model evidence.
    for(const [key,mapping]of state.authoredMapping)if(topicIds.has(mapping.topicId)){const row=await t.get('thoughts',mapping.entryId);if(!row||row.revision!==mapping.entryRevision||!state.request.items.some(i=>i.key===key&&i.descriptor.kind==='library_entry'&&i.descriptor.entityId===mapping.entryId))fail('STALE_BASE');ids.add(mapping.entryId);}
    for(const write of publication.writes.filter(w=>w.store==='thoughts'&&w.value)){const e=write.value;if(e.bodyBinding!=='input'||e.provenanceType!=='input_original'||!inputIds.includes(e.workingInputId))fail('UNAVAILABLE');
     const current=await t.get('thoughts',e.id),keys=Object.keys(e).filter(k=>!['thoughtText','title','note'].includes(k)),actual=Object.fromEntries(keys.map(k=>[k,current?.[k]])),expected=Object.fromEntries(keys.map(k=>[k,e[k]]));if(!equal(actual,expected))fail('STALE_BASE');
     const members=publication.members?.find(x=>x.entryId===e.id);if(!members)fail('STALE_BASE');await assertTopicFormationMembers(t,[members]);
     ids.add(e.id);
    }
   }
   if(afterTopic){const priorScope=maintenanceQualificationReceipt(state.qualifications.get(metadata.childOperationId),this.#store).scope;for(const entry of priorScope.entries)ids.add(entry.entryId);for(const closure of priorScope.localQualificationTopics||[])topicIds.add(closure.topic.id);}
   const request={items:state.request.items.filter(i=>metadata.coverage.some(u=>u.key===i.key)),coverage:metadata.coverage};
   return createMaintenanceQualification(this.#store,t,request,this.#qualificationOptions(t,request,{processing:this.#processing,caller:this.#service.context.caller,parent:processing,binding:{logicalJobId:state.job.id,childOperationId:metadata.childOperationId,principalId:processing.scope.principalId,libraryId:processing.scope.libraryId,consentEpoch:processing.scope.consentEpoch,...(afterTopic?{publicationOperationId:readTopicFormationPublication(state.topicPublications.get(metadata.childOperationId),this.#store).operationId}:{})},phase:afterTopic?'post-topic':'child',requestIdentity:state.qualificationRequest,workBudget:state.qualificationBudget,selection:{inputIds,inputMirrorInputs:afterTopic?[]:[...inputIds],entryIds:[...ids],historyEntryIds:[...this.#authored(state,metadata.coverage).map(m=>m.entryId),...this.#bound(state,metadata.coverage).map(m=>m.entryId)],structures:[...selected.structures,...this.#authoredTopic(state,metadata.coverage).map(m=>({store:'topics',recordId:m.topicId,selectedFields:['name']}))],topicIds:[...topicIds],localTopicSeeds:afterTopic?[]:this.#authored(state,metadata.coverage).map(m=>Object.fromEntries(['entryId','entryRevision','topicId','topicRevision','topicOrganizationRevision','layoutGeneration','placementId','placementRevision'].map(k=>[k,m[k]])))},signal:state.controller.signal,isCurrent:()=>{if(state.generation!==this.#generation||this.#jobs.get(state.job.id)!==state||state.controller.signal.aborted||state.grant.revocationSignal.aborted)return false;this.#assertProcessing(processing);return this.#window.isCurrent(state.grant)===true;}},state));
  });this.#current(state);map.set(metadata.childOperationId,token);if(!afterTopic)state.qualificationPublicationStart.set(metadata.childOperationId,state.publications.length);return token;
 }
 async #preparePayload(state,metadata){const prior=this.#materialOwner;this.#materialOwner={state,childId:metadata.childOperationId};try{return await this.#assemblePayload(state,metadata);}finally{this.#materialOwner=prior;}}
 async #assemblePayload(state,metadata){
  this.#current(state);const processing=await this.#processingReceipt(state,metadata),inputIds=this.#inputs(state,metadata.coverage),authored=this.#authored(state,metadata.coverage),bound=this.#bound(state,metadata.coverage);
  await this.#childQualification(state,metadata);await this.#candidateQualification(state,metadata);
  if(!inputIds||!inputIds.length&&!authored.length)fail('UNAVAILABLE');if(inputIds.length+authored.length+bound.length>Math.min(20,this.#store.organizerBudget.limits.maxInputs))fail('BUDGET_EXCEEDED');
  const candidateSummary=state.topicCandidateSummaries.get(metadata.childOperationId),candidate=state.topicCandidates.get(metadata.childOperationId),candidateMaterial=candidate?maintenanceTopicCandidateMaterial(candidate):null,topicScope=candidate?maintenanceTopicCandidateScope(candidate).inputs.map(i=>i.evidence):inputIds.map(inputId=>({inputId,role:'primary',selectedFields:['body']}));
  const authoredTopic=this.#authoredTopic(state,metadata.coverage);if(authoredTopic.length>1||authoredTopic.length&&inputIds.length)fail('UNAVAILABLE');const handle=authoredTopic.length?await this.#topic.prepareAuthoredMaterial({entryId:authoredTopic[0].entryId,descriptor:state.request.items.find(i=>i.descriptor.entityId===authoredTopic[0].entryId).descriptor},{signal:state.controller.signal}):inputIds.length?await this.#topic.prepareMaterial({scope:topicScope,entryIds:this.#entries(state,metadata.coverage).map(e=>e.entryId)},{signal:state.controller.signal}):null;
  try{this.#current(state);const fullMaterial=handle?await this.#topic.readMaterial(handle):{sourceCount:0,view:{inputs:[],entries:[],identities:[],sections:[],constraints:[]}},material=candidate?{...fullMaterial,view:{...fullMaterial.view,inputs:fullMaterial.view.inputs.filter(i=>inputIds.includes(i.id))}}:fullMaterial;this.#current(state);
   for(const mapping of authored)if(!state.authoredMaterial.has(mapping.entryId)){
    const selected=authoredSelectedFields(mapping),fields=await this.#foundation.read(async transaction=>{const t=contextScopeTransactionReader(this.#store,transaction,state.authoredBudget);await this.#checkAuthoredMapping(state,metadata.coverage,t);return authoredSelectedText(await t.get('thoughts',mapping.entryId),selected);});this.#current(state);
    const contentBytes=value=>Object.values(value).reduce((n,text)=>n+new TextEncoder().encode(text).length,0),retained=[...state.authoredMaterial.values(),...state.boundMaterial.values()].reduce((n,v)=>n+contentBytes(v.fields||{body:v.body}),0);
    if(state.authoredMaterial.size+state.boundMaterial.size>=Math.min(20,this.#store.organizerBudget.limits.maxInputs)||retained+contentBytes(fields)>this.#store.organizerBudget.limits.maxContentBytes)fail('BUDGET_EXCEEDED');
    const fieldDigests={};for(const field of selected){state.authoredBudget.hashBytes+=new TextEncoder().encode(fields[field]).length;state.authoredBudget.hashFields++;if(state.authoredBudget.hashBytes>CONTEXT_TOPIC_SCOPE_LIMITS.hashBytes||state.authoredBudget.hashFields>CONTEXT_TOPIC_SCOPE_LIMITS.hashFields)fail('BUDGET_EXCEEDED');fieldDigests[field]=await hashText(fields[field]);this.#current(state);}
    state.authoredMaterial.set(mapping.entryId,{...structuredClone(mapping),...(equal(selected,['body'])?{body:fields.body,bodyDigest:fieldDigests.body}:{fields,fieldDigests})});
   }
   for(const mapping of bound){const key=boundMaterialKey(mapping);if(state.boundMaterial.has(key))continue;
    const fields=await this.#foundation.read(async transaction=>{const t=contextScopeTransactionReader(this.#store,transaction,state.authoredBudget);await this.#checkBoundMapping(state,metadata.coverage,t);await this.#checkStructuralMapping(state,metadata.coverage,t);await this.#checkContextMapping(state,metadata.coverage,t);return boundSelectedText(await t.get('thoughts',mapping.entryId),mapping.selectedFields);});this.#current(state);
    const contentBytes=value=>Object.values(value).reduce((n,text)=>n+new TextEncoder().encode(text).length,0),retained=[...state.authoredMaterial.values(),...state.boundMaterial.values()].reduce((n,v)=>n+contentBytes(v.fields||{body:v.body}),0);
    if(state.authoredMaterial.size+state.boundMaterial.size>=Math.min(20,this.#store.organizerBudget.limits.maxInputs)||retained+contentBytes(fields)>this.#store.organizerBudget.limits.maxContentBytes)fail('BUDGET_EXCEEDED');
    const fieldDigests={};for(const field of mapping.selectedFields){state.authoredBudget.hashBytes+=new TextEncoder().encode(fields[field]).length;state.authoredBudget.hashFields++;if(state.authoredBudget.hashBytes>CONTEXT_TOPIC_SCOPE_LIMITS.hashBytes||state.authoredBudget.hashFields>CONTEXT_TOPIC_SCOPE_LIMITS.hashFields)fail('BUDGET_EXCEEDED');fieldDigests[field]=await hashText(fields[field]);this.#current(state);}state.boundMaterial.set(key,{...structuredClone(mapping),fields,fieldDigests});
   }
   await this.#foundation.read(async t=>{await this.#checkAuthoredMapping(state,metadata.coverage,t);await this.#checkBoundMapping(state,metadata.coverage,t);await this.#checkStructuralMapping(state,metadata.coverage,t);await this.#checkContextMapping(state,metadata.coverage,t);});this.#current(state);
   for(const m of this.#placementTopics(state,metadata.coverage))if(!state.placementMaterial.has(m.placementId)){const section=material.view.sections.find(s=>s.topicId===m.topicId&&s.sectionId===m.sectionId&&s.layoutGeneration===m.layoutGeneration);if(!section||section.revision!==m.sectionRevision)fail('STALE_BASE');const d=state.request.items.find(i=>i.key===JSON.stringify(['placement',m.placementId])).descriptor,held=await this.#foundation.read(async transaction=>{await this.#checkPlacementMapping(state,metadata.coverage,transaction);const reader=contextScopeTransactionReader(this.#store,transaction,state.authoredBudget),facts=[];for(const [table,key]of [['sections',section.id],['topics',m.topicId],['thoughts',m.entryId],['placements',m.placementId],['revisions',d.journalId]])facts.push({table,key,expected:placementTopicFacts(table,await reader.get(table,key))});const actual=facts[0].expected;if(!actual||Object.keys(section).some(k=>!equal(k==='isDefault'?!!actual[k]:actual[k],section[k])))fail('STALE_BASE');return facts;});const bytes=new TextEncoder().encode(JSON.stringify(held)).length;state.authoredBudget.hashBytes+=bytes;if(state.authoredBudget.hashBytes>CONTEXT_TOPIC_SCOPE_LIMITS.hashBytes)fail('BUDGET_EXCEEDED');state.placementMaterial.set(m.placementId,held);}
   for(const m of this.#structures(state,metadata.coverage))if(!state.structuralMaterial.has(m.recordId)){
    const materialSection=structuralContextMaterial(m,material.view);if(!materialSection)fail('STALE_BASE');for(const e of m.entries){const input=material.view.inputs.find(i=>i.id===e.inputId);if(!input)fail('STALE_BASE');state.structuralInputs.set(e.inputId,input.fields.body);}
    const field=m.kind==='topic'?'name':'title';state.authoredBudget.hashBytes+=new TextEncoder().encode(materialSection[field]).length;state.authoredBudget.hashFields++;if(state.authoredBudget.hashBytes>CONTEXT_TOPIC_SCOPE_LIMITS.hashBytes||state.authoredBudget.hashFields>CONTEXT_TOPIC_SCOPE_LIMITS.hashFields)fail('BUDGET_EXCEEDED');
    const selected=await hashText(materialSection[field]);this.#current(state);state.structuralMaterial.set(m.recordId,{...materialSection,fieldDigests:{[field]:selected}});
   }
   await this.#foundation.read(t=>this.#checkStructuralMapping(state,metadata.coverage,t));this.#current(state);
   this.#checkStructuralBudget(state,metadata.coverage);
   for(const m of this.#contextEdits(state,metadata.coverage))if(!state.contextMaterial.has(m.itemId)){
    const workBudget=forkContextScopeWorkBudget(maintenanceQualificationWorkBudget(this.#ownerQualification(),this.#store),{database:this.#store.repository.db,signal:state.controller.signal,qualification:this.#ownerQualification(),isCurrent:()=>{this.#processingCurrent(state,processing);return true;}}),held=await captureContextEditMaterial(this.#store,m,{signal:state.controller.signal,workBudget,read:fn=>this.#foundation.read(t=>fn(contextScopeTransactionReader(this.#store,t,workBudget)))});
    try{this.#processingCurrent(state,processing);for(const input of held.snapshot.inputs)if(!material.view.inputs.some(i=>i.id===input.inputId&&i.revision===input.contentRevision&&i.fields.body===input.body))fail('STALE_BASE');
     const bytes=Object.values(held.fields).reduce((n,text)=>n+new TextEncoder().encode(text).length,0);state.authoredBudget.hashBytes+=bytes;state.authoredBudget.hashFields+=2;if(bytes>this.#store.organizerBudget.limits.maxContentBytes||state.authoredBudget.hashBytes>CONTEXT_TOPIC_SCOPE_LIMITS.hashBytes||state.authoredBudget.hashFields>CONTEXT_TOPIC_SCOPE_LIMITS.hashFields)fail('BUDGET_EXCEEDED');state.contextMaterial.set(m.itemId,held);
    }catch(error){releaseContextEditMaterial(held);throw error;}
   }
   await this.#foundation.read(t=>this.#checkContextMapping(state,metadata.coverage,t));this.#current(state);
   const existing=state.existingContext.get(metadata.childOperationId),args=[metadata,material,this.#store.organizerBudget.limits,this.#placements(state,metadata.coverage),authored.map(m=>state.authoredMaterial.get(m.entryId)),bound.map(m=>state.boundMaterial.get(boundMaterialKey(m))),this.#structures(state,metadata.coverage).filter(m=>m.kind!=='topic').map(m=>state.structuralMaterial.get(m.recordId)),this.#structures(state,metadata.coverage).filter(m=>m.kind==='topic').map(m=>state.structuralMaterial.get(m.recordId)),this.#contextEdits(state,metadata.coverage).map(m=>{const held=state.contextMaterial.get(m.itemId);return {...contextEditScope(m),fields:held.fields,fieldDigests:held.fieldDigests};})],base=createMaintenancePayload(...args,[],null,candidateMaterial,candidateSummary),limits=this.#store.organizerBudget.limits;
   let summaryAllowed=true;
   if(existing){
    const summary=maintenanceExistingContextSummary(existing),reserveSummary={...summary,omittedItems:summary.omittedItems+summary.selectedItems,complete:false},measure=value=>new TextEncoder().encode(JSON.stringify(value)).length;
    // Existing Items consume only the remainder of the SAME original content
    // and physical request envelope; they do not acquire a second allowance.
    const envelope={...base.material,existingContextItems:[],...(summary.selectedItems||summary.omittedItems?{existingContextSummary:reserveSummary}:{})},requestEnvelope={...base,material:envelope};
    const remaining={...limits,maxContentBytes:Math.max(0,limits.maxContentBytes-measure(envelope)+2),maxRequestBytes:Math.max(0,limits.maxRequestBytes-measure(requestEnvelope)+2)};
    summaryAllowed=measure({...base.material,existingContextSummary:reserveSummary})<=limits.maxContentBytes&&measure({...base,material:{...base.material,existingContextSummary:reserveSummary}})<=limits.maxRequestBytes;
    if(!summaryAllowed)remaining.maxContentBytes=remaining.maxRequestBytes=0;
    await captureMaintenanceExistingContext(this.#store,existing,{qualification:state.qualifications.get(metadata.childOperationId),read:fn=>this.#foundation.read(fn),signal:state.controller.signal,assertProcessing:()=>{this.#processingCurrent(state,processing);return true;},scope:processing.scope,material:{inputs:material.view.inputs,authoredEntries:authored.map(m=>state.authoredMaterial.get(m.entryId)),boundEntries:bound.map(m=>state.boundMaterial.get(boundMaterialKey(m))),structuralTopics:this.#structures(state,metadata.coverage).filter(m=>m.kind==='topic').map(m=>state.structuralMaterial.get(m.recordId)),structuralSections:this.#structures(state,metadata.coverage).filter(m=>m.kind!=='topic').map(m=>state.structuralMaterial.get(m.recordId))},limits:remaining,publications:state.publications.slice(state.existingPublicationStart.get(metadata.childOperationId)||0),settledItems:[...(state.existingSettled.get(metadata.childOperationId)?.values()||[])]});
   }
   let payload=createMaintenancePayload(...args,existing?maintenanceExistingContextPayload(existing):[],existing&&summaryAllowed?maintenanceExistingContextSummary(existing):null,candidateMaterial,candidateSummary);
   const promotion=await this.#preparePromotion(state,metadata,processing);if(promotion){try{payload=createMaintenancePayload(...args,existing?maintenanceExistingContextPayload(existing):[],existing&&summaryAllowed?maintenanceExistingContextSummary(existing):null,candidateMaterial,candidateSummary,promotion.payload);}catch(error){this.#releasePromotions(state,metadata.childOperationId);state.promotions.set(metadata.childOperationId,null);if(error?.code!=='BUDGET_EXCEEDED')throw error;}}
   if(this.#filterEnabled(state)&&metadata.coverage.some(u=>u.facet==='filter')){const key=canonical([metadata.childOperationId,'filter-snapshot']);if(!state.prepared.has(key)){try{const snapshot=await this.#foundation.read(t=>this.#store.maintenanceFilterSnapshot(t,this.#inputs(state,metadata.coverage.filter(u=>u.facet==='filter'))));this.#current(state);state.prepared.set(key,snapshot);}catch(error){this.#current(state);if(!['STALE_BASE','UNAVAILABLE'].includes(error?.code))throw error;state.prepared.set(key,null);}}}
   return {handle,payload,processing:state.promotions.get(metadata.childOperationId)?.parent??processing};
  }catch(error){if(handle)this.#topic.releaseMaterial(handle);throw error;}
 }
 async #checkPayload(state,handle,metadata,processing){const prior=this.#materialOwner;this.#materialOwner={state,childId:metadata.childOperationId};try{return await this.#verifyPayload(state,handle,metadata,processing);}finally{this.#materialOwner=prior;}}
 async #verifyPayload(state,handle,metadata,processing){
  this.#processingCurrent(state,processing);await this.#processingReceipt(state,metadata);this.#processingCurrent(state,processing);if(handle)await this.#topic.checkMaterial(handle);this.#current(state);
  await this.#foundation.read(async t=>{const job=await this.#foundation.job(t,state.job.id);await this.#foundation.current(t,job);await this.#checkAuthoredMapping(state,metadata.coverage,t);await this.#checkBoundMapping(state,metadata.coverage,t);await this.#checkStructuralMapping(state,metadata.coverage,t);await this.#checkContextMapping(state,metadata.coverage,t);});this.#current(state);
  // Input and authored material share the original final Topic transaction,
  // after Input hashes. Pure authored work uses the same complete fence on its
  // own. Only synchronous host opportunity/abort checks follow this read.
  const finalRead=async t=>{const job=await this.#foundation.job(t,state.job.id);await this.#foundation.current(t,job);await this.#checkAuthoredMapping(state,metadata.coverage,t);await this.#checkBoundMapping(state,metadata.coverage,t);await this.#checkStructuralMapping(state,metadata.coverage,t);await this.#checkContextMapping(state,metadata.coverage,t);await this.#checkExistingContext(state,metadata.childOperationId,t,'prepared');await this.#checkTopicCandidates(state,metadata.childOperationId,t);};
  await this.#checkPromotion(state,metadata.childOperationId);if(handle)await this.#topic.checkMaterial(handle,finalRead);else await this.#foundation.read(finalRead);this.#processingCurrent(state,processing);
 }
 async #preflightPayloads(state){
  const status=await this.#foundation.status(state.job.id);this.#current(state);
  const requests=await this.#foundation.read(async t=>{const job=await this.#foundation.job(t,state.job.id);await this.#foundation.current(t,job);return job.childIds.map((_,i)=>this.#foundation.childRequest(job,i));});this.#current(state);
  for(const metadata of requests){if(!metadata.coverage.length||status.attempts.some(r=>r.childId===metadata.childOperationId&&r.attemptCount===1))continue;this.#checkStructuralBudget(state,metadata.coverage);if(this.#following(state,metadata.coverage))continue;
   const prepared=await this.#preparePayload(state,metadata);try{await this.#checkPayload(state,prepared.handle,metadata,prepared.processing);}finally{if(prepared.handle)this.#topic.releaseMaterial(prepared.handle);}
  }
 }
 async #executeBounded(state,provider,request,materialHandle,processing){
  this.#current(state);const timeoutMs=this.#store.organizerBudget.limits.timeoutMs;
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1)fail('UNAVAILABLE');
  const controller=new AbortController(),sources=[state.controller.signal,state.grant.revocationSignal,processing.revocationSignal],deadline=performance.now()+timeoutMs;let timer,rejectStop;
  const stopped=new Promise((_,reject)=>{rejectStop=()=>{controller.abort();reject(Object.assign(Error('MAINTENANCE_STOPPED'),{code:'OUTCOME_UNKNOWN'}));};});
  for(const source of sources){source.addEventListener('abort',rejectStop,{once:true});if(source.aborted)rejectStop();}
  timer=setTimeout(rejectStop,timeoutMs);
  const live=()=>{if(controller.signal.aborted||performance.now()>=deadline){rejectStop();fail('OUTCOME_UNKNOWN');}},check=()=>{live();this.#processingCurrent(state,processing);live();};
  try{
   // The original deadline starts before every optional filter hook and is
   // shared with material revalidation and the physical provider, never reset.
   const work=Promise.resolve().then(async()=>{check();await this.#preparePositiveFilter(state,request,request,processing,{check,stopped});check();await this.#checkPayload(state,materialHandle,request,processing);check();return provider.execute(request,Object.freeze({signal:controller.signal,timeoutMs}));});
   const value=await Promise.race([work,stopped]);check();return value;
  }finally{clearTimeout(timer);for(const source of sources)source.removeEventListener('abort',rejectStop);}
 }
 // Scope selection is body-free and cannot extend the already granted child.
 // The Store alone resolves Pro/opt-in/policy authority. No model field can
 // qualify a handle, and failed qualification is never retried after dispatch.
 async #preparePositiveFilter(state,metadata,payload,processing,{check,stopped,authorizeFilter=null}){
  if(!this.#filterEnabled(state)||typeof this.#service.filter.selectScope!=='function'||!metadata.coverage.some(u=>u.facet==='filter')||state.filterHandles.has(metadata.childOperationId))return;
  const childId=metadata.childOperationId;state.filterHandles.set(childId,null);let handle=null,qualification=null;const originalCheck=check;check=()=>{originalCheck();if(qualification)this.#assertProcessing(qualification);};
  const release=()=>{if(handle){const pending=handle;handle=null;this.#store.releaseAIMaintenanceFilter(pending);}};
  try{
   check();
   const candidateIds=this.#inputs(state,metadata.coverage.filter(u=>u.facet==='filter')),inputIds=payload.material.inputs.map(i=>i.inputId).sort();
   if(!candidateIds?.length||!state.prepared.get(canonical([childId,'filter-snapshot']))||!equal(inputIds,processing.scope.inputs.map(i=>i.inputId).sort()))return;
   const selected=await this.#service.filter.selectScope(frozen({candidateIds:[...candidateIds],inputIds:[...inputIds]}));check();const scope=responseSnapshot(selected,8192);check();
   exact(scope,['candidateIds','neighborIds']);
   if(!Array.isArray(scope.candidateIds)||!equal([...scope.candidateIds].sort(),candidateIds)||candidateIds.length>8||!Array.isArray(scope.neighborIds)||!scope.neighborIds.length||scope.neighborIds.length>2||new Set(scope.neighborIds).size!==scope.neighborIds.length||scope.neighborIds.some(id=>!inputIds.includes(id)||candidateIds.includes(id)))fail('INVALID_REQUEST');
   // Only the original authenticated child reservation can qualify remote
   // Pro filtering. The constructor's local/test tier is never a substitute.
   qualification=await this.#filterQualification(state,metadata,scope);check();
   if(this.#remote){if(typeof authorizeFilter!=='function')fail('UNAVAILABLE');syncTrue(authorizeFilter(frozen(structuredClone(scope)),qualification));check();}
   const prepared=await this.#foundation.read(async t=>{
    check();
    const guarded=method=>async(...args)=>{check();const result=await t[method](...args);check();return result;};
    // Race within the original read callback too: an uncooperative
    // authority must not hold the Store queue and prevent unknown settlement.
    const prepare=async()=>{try{handle=await this.#store.prepareAIMaintenanceFilter({get:guarded('get'),count:guarded('count')},scope);check();return handle;}catch(error){release();throw error;}};
    return Promise.race([prepare(),stopped]);
   });
   check();state.filterHandles.set(childId,{handle:prepared});handle=null;
  }catch(error){
   release();check();
   if(!['STALE_BASE','UNAVAILABLE','INVALID_REQUEST','BUDGET_EXCEEDED'].includes(error?.code))throw error;
  }
 }
 async #publishFilterVisibility(state,status){
  if(!this.#remote)return;
  for(const [childId,held]of state.filterPublications){
   if(!held.units.every(u=>status.committedCoverage.includes(unitKey(u))))continue;
   // The original token is unreadable until its own transaction completes.
   // Exact durable Foundation ACK coverage also handles a lost return ACK;
   // neither a callback return nor a provider DTO can publish visibility.
   if(readAIMaintenanceFilterVisibility(held.token,this.#store)){
    try{syncTrue(await this.#remote.publishFilterVisibility(childId,held.token,held.settlement));this.#current(state);}catch{/* Fail open visibly if the exact read-only lease has expired/revoked. */}
   }
   // Filter is terminal even when another facet needs validated local retry.
   // Retire only its write capability; the independently published read lease
   // and other domain continuations have separate lifetimes.
   this.#releaseFilters(state,childId);
  }
 }
 #releaseFilters(state,childId=null){
  if(!state?.filterHandles)return;
  if(childId===null){state.filterCommands.clear();state.filterRetryChildren.clear();}else{state.filterCommands.delete(childId);state.filterRetryChildren.delete(childId);}
  if(childId===null)state.filterPublications.clear();else state.filterPublications.delete(childId);
  for(const [id,qualification]of state.filterQualifications)if(childId===null||id===childId){qualification.remove();state.filterQualifications.delete(id);}
  for(const [id,prepared]of state.filterHandles)if(childId===null||id===childId){if(prepared)this.#store.releaseAIMaintenanceFilter(prepared.handle);state.filterHandles.set(id,null);}
  // A reservation capability may exist even if optional Filter preparation
  // never installed a handle. Response decode and Qwen disposal are earlier
  // boundaries and cannot retire authority needed for validated local retry.
  if(childId===null)this.#remote?.releaseFilterJob(state.job.id);else this.#remote?.releaseFilterChild(childId);
 }
 #transport(state){
  const original=this.#provider,descriptor=localProviderDescriptor(original);
  return {describe:()=>structuredClone(descriptor),execute:async request=>{
   this.#current(state);if(request.logicalJobId!==state.job.id||!state.job.childIds.includes(request.childOperationId))fail('STALE_BASE');
   let response;try{
    const assembled=await this.#preparePayload(state,request);try{response=responseSnapshot(await this.#executeBounded(state,original,assembled.payload,assembled.handle,assembled.processing),this.#store.organizerBudget.limits.maxOutputBytes);}finally{if(assembled.handle)this.#topic.releaseMaterial(assembled.handle);}this.#current(state);
    if(response?.accepted===true&&opaque(response.operationReceiptId))state.outputs.set(request.childOperationId,{jobId:state.job.id,childId:request.childOperationId,operationReceiptId:response.operationReceiptId,response});
    else {this.#releaseFilters(state,request.childOperationId);state.outputs.delete(request.childOperationId);this.#remote?.releaseResponseChild(request.childOperationId);state.topicResults.delete(request.childOperationId);state.authoredMaterial.clear();state.boundMaterial.clear();state.structuralMaterial.clear();state.placementMaterial.clear();state.structuralInputs.clear();state.prepared.clear();state.groups.clear();state.contextDeferred.clear();this.#releaseContextEdits(state);this.#releaseExistingContext(state);this.#releaseTopicCandidates(state);}
    // Only the existing neutral receipt fields cross the Foundation owner.
    return {accepted:response?.accepted===true,operationReceiptId:response?.operationReceiptId};
   }catch(e){this.#releaseFilters(state,request.childOperationId);state.outputs.delete(request.childOperationId);this.#remote?.releaseResponseChild(request.childOperationId);state.topicResults.delete(request.childOperationId);state.authoredMaterial.clear();state.boundMaterial.clear();state.structuralMaterial.clear();state.placementMaterial.clear();state.structuralInputs.clear();state.prepared.clear();state.groups.clear();state.contextDeferred.clear();this.#releaseContextEdits(state);this.#releaseExistingContext(state);this.#releaseTopicCandidates(state);throw e;}
  }};
 }
 async #dispatchService(state,metadata){
  const assembled=await this.#preparePayload(state,metadata),{handle,processing,payload}=assembled;
  const timeoutMs=this.#store.organizerBudget.limits.timeoutMs,controller=new AbortController(),sources=[state.controller.signal,state.grant.revocationSignal,processing.revocationSignal];let prepared,timer;
  const abort=()=>controller.abort();for(const signal of sources){signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();}
  timer=setTimeout(abort,timeoutMs);
  const check=(options)=>{if(controller.signal.aborted)fail('OUTCOME_UNKNOWN');this.#processingCurrent(state,processing,options);};
  const assertCurrent=async()=>{check();await this.#checkPayload(state,handle,metadata,processing);check();};
  try{
   const stopped=new Promise((_,reject)=>{const stop=()=>reject(Object.assign(Error('MAINTENANCE_STOPPED'),{code:'OUTCOME_UNKNOWN'}));controller.signal.addEventListener('abort',stop,{once:true});if(controller.signal.aborted)stop();});stopped.catch(()=>{});
   // A false post-response content check releases private material, but must
   // not win the original execution race over an already observed financial
   // settlement. Explicit revoke/timeout signals still cancel immediately.
   prepared=await this.#remote.prepareChild(this.#foundation,state.job,payload,{processing,promotionTask:state.promotions.get(metadata.childOperationId)?.task??null,signal:controller.signal,assertCurrent,isCurrent:()=>{try{check({abort:false});return true;}catch{return false;}},assertBeforeSend:async()=>{const repository=this.#store.repository,token=observeRepositoryWriteFence(repository);await assertCurrent();return ()=>{check();if(this.#store.repository!==repository)fail('STALE_BASE');requireRepositoryWriteFence(repository,token);const task=state.promotions.get(metadata.childOperationId)?.task;if(task)assertMaintenanceSectionPromotionTaskFacts(task,this.#store);};}});
   // Keep the exact already-tokenized payload and original deadline. Positive
   // Filter preparation follows real reservation, before any physical send.
   await this.#preparePositiveFilter(state,metadata,payload,processing,{check,stopped,authorizeFilter:prepared.authorizeFilter});
   state.scheduling=prepared.scheduling;await assertCurrent();const result=await this.#foundation.dispatch(state.job.id,metadata.childOperationId,prepared.provider,{signal:controller.signal,timeoutMs});
   await assertCurrent();if(result.state==='RESPONSE_RECORDED'){
    const status=await this.#foundation.status(state.job.id),receipt=status.attempts.find(r=>r.childId===metadata.childOperationId);check();
    if(!receipt||receipt.executionKind!=='server-backed'||!opaque(receipt.operationReceiptId)||receipt.financialSettlement?.state!=='SETTLED')fail('OUTCOME_UNKNOWN');
    const response=responseSnapshot({accepted:true,operationReceiptId:receipt.operationReceiptId,value:result.value},this.#store.organizerBudget.limits.maxOutputBytes);
    state.outputs.set(metadata.childOperationId,{jobId:state.job.id,childId:metadata.childOperationId,operationReceiptId:receipt.operationReceiptId,response});
    await this.#settlePromotion(state,metadata,result,receipt);
   }
   return result;
  }catch(error){this.#releaseFilters(state,metadata.childOperationId);this.#remote.releaseResponseChild(metadata.childOperationId);try{await this.#foundation.cancelServer(state.job.id);}catch{/* Unknown/cancellation ACK loss retains original holds. */}throw error;}
  finally{clearTimeout(timer);for(const signal of sources)signal.removeEventListener('abort',abort);prepared?.dispose();if(handle)this.#topic.releaseMaterial(handle);}
 }

 #following(state,units){return units.some(u=>state.followingKeys.has(u.key));}
 async #captureFollowing(state,t){
  const job=await this.#foundation.job(t,state.job.id);await this.#foundation.current(t,job);
  for(let i=0;i<job.childIds.length;i++)if(this.#following(state,job.childCoverage[i])){const receipt=await t.get('organizerUsage','aiu:attempt:'+job.childIds[i]);if(!receipt||receipt.attemptCount!==0||!(this.#remote?['PLANNED','RESERVED']:['RESERVED']).includes(receipt.state)||state.processing.has(job.childIds[i])||state.outputs.has(job.childIds[i]))fail('STALE_BASE');}
  const placements=await this.#placementMapping(state.request,t),authored=await this.#authoredMapping(state.request,t),bound=await this.#boundMapping(state.request,t),structures=await this.#structuralMapping(state.request,t),result={placements:new Map(),authored:new Map(),bound:new Map(),structures:new Map()};
  for(const key of state.followingKeys){const isAuthored=state.authoredMapping.has(key),isBound=state.boundMapping.has(key),isStructural=state.structuralMapping.has(key),before=(isAuthored?state.authoredMapping:isBound?state.boundMapping:isStructural?state.structuralMapping:state.placementMapping).get(key),after=(isAuthored?authored:isBound?bound:isStructural?structures:placements).get(key);
   if(!before||!after||after.topicRevision<before.topicRevision||after.topicOrganizationRevision<before.topicOrganizationRevision||!equal({...after,topicRevision:before.topicRevision,topicOrganizationRevision:before.topicOrganizationRevision},before))fail('STALE_BASE');
   (isAuthored?result.authored:isBound?result.bound:isStructural?result.structures:result.placements).set(key,after);
  }return result;
 }
 async #writeDomain(fn,facet,finalFence=null,expectedTarget=null,publication=null){
  const a=this.#active;this.#processingCurrent(a?.state,a?.state.processing.get(a.childId));if(!a||a.facet!==facet||a.callback!==null||typeof fn!=='function')fail('UNAVAILABLE');
  if(['topic','context'].includes(facet)&&typeof finalFence!=='function'||!['topic','context'].includes(facet)&&finalFence!==null||facet==='context'&&typeof expectedTarget!=='function'||facet!=='context'&&expectedTarget!==null)fail('UNAVAILABLE');a.finalFence=finalFence;a.expectedTarget=expectedTarget;if(['topic','context'].includes(facet)&&typeof publication!=='function')fail('UNAVAILABLE');a.publication=publication;
  a.callback=fn;
  await this.#foundation.commitFacet(a.state.job.id,a.childId,{facet,units:a.units,outcome:a.outcome});this.#current(a.state);
  if(!a.entered||a.result===null)fail('DOMAIN_REPLAY_UNACKNOWLEDGED');if(a.publication){const token=a.publication();if(!token)fail('STALE_BASE');a.state.publications.push(token);if(facet==='topic')a.state.topicPublications.set(a.childId,token);}
  if([...a.state.promotions.values()].some(Boolean))a.state.domainSettlements.push({childId:a.childId,facet,units:structuredClone(a.units),outcome:a.outcome,publication:a.publication?.()??null});
  if(facet==='topic')a.state.topicResults.set(a.childId,frozen({outcome:a.result.outcome,topicIds:[...a.result.topicIds]}));
  if(facet==='context'&&a.state.existingContext.has(a.childId)){const expected=a.expectedTarget?.();if(expected&&maintenanceExistingContextScope(a.state.existingContext.get(a.childId)).some(item=>item.itemId===expected.itemId)){const settled=a.state.existingSettled.get(a.childId)||new Map();settled.set(expected.itemId,frozen(expected));a.state.existingSettled.set(a.childId,settled);}}
  // Publish the unsent child's new metadata only after this original Topic
  // transaction and its exact ACK have both completed successfully.
  if(a.following){for(const [key,value]of a.following.placements)a.state.placementMapping.set(key,value);for(const [key,value]of a.following.authored)a.state.authoredMapping.set(key,value);for(const [key,value]of a.following.bound)a.state.boundMapping.set(key,value);for(const [key,value]of a.following.structures)a.state.structuralMapping.set(key,value);a.state.followingReady=true;}return a.result;
 }
 async #commit(t,r,facet){
  const local=this.#localCorrection;
  if(local){
   const current=()=>local.generation===this.#generation&&!local.signal.aborted;
   if(!current()||r.logicalJobId!==local.job.id||r.outcome!=='NO_CHANGE'||!['topic','context'].includes(facet)||r.units.some(u=>u.facet!==facet||!local.request.coverage.some(v=>equal(u,v))))fail('STALE_BASE');
   const abort=()=>{try{t.tx.abort();}catch{}};local.signal.addEventListener('abort',abort,{once:true});const cleanup=()=>local.signal.removeEventListener('abort',abort);t.tx.addEventListener('complete',cleanup,{once:true});t.tx.addEventListener('abort',cleanup,{once:true});
   await assertContextProtectionCorrections(this.#store,t,local.request.items,local.captured);
   return {committed:true,coverage:r.units,isCurrent:current,fenceAfterSettlement:async transaction=>{await this.#foundation.current(transaction,await this.#foundation.job(transaction,local.job.id));await assertContextProtectionCorrections(this.#store,transaction,local.request.items,local.captured);return current();}};
  }
  const a=this.#active;this.#processingCurrent(a?.state,a?.state.processing.get(a.childId));
  if(a?.facet!==facet||typeof a.callback!=='function'||a.entered||r.logicalJobId!==a.state.job.id||r.childOperationId!==a.childId||r.outcome!==a.outcome||!equal(r.units,a.units))fail('STALE_BASE');
  // Revalidate the mapped Entry inside the same original transaction as
  // Context publication and its exact ACK, including unjournaled row drift.
  if(facet==='context'||facet==='topic'&&(this.#structures(a.state,a.units).length||this.#authoredTopic(a.state,a.units).length||this.#placementTopics(a.state,a.units).length))await this.#checkEntryMapping(a.state,a.units,t);
  const following=facet==='topic'&&a.state.followingKeys.size?a.state.request.coverage.filter(u=>a.state.followingKeys.has(u.key)):[];if(following.length)await this.#checkEntryMapping(a.state,following,t);
  if(['topic','context'].includes(facet)){await this.#checkExistingContext(a.state,a.childId,t);await this.#checkTopicCandidates(a.state,a.childId,t);}
  a.entered=true;const abort=()=>{try{t.tx.abort();}catch{}},signals=[a.state.controller.signal,a.state.grant.revocationSignal,a.state.processing.get(a.childId).revocationSignal];
  for(const s of signals)s.addEventListener('abort',abort);
  const cleanup=()=>{for(const s of signals)s.removeEventListener('abort',abort);};t.tx.addEventListener('complete',cleanup,{once:true});t.tx.addEventListener('abort',cleanup,{once:true});
  const filterQualification=facet==='filter'?a.state.filterQualifications.get(a.childId)?.receipt:null;
  const check=()=>{this.#processingCurrent(a.state,a.state.processing.get(a.childId));if(filterQualification)this.#assertProcessing(filterQualification);if(a.ownerCurrent)syncTrue(a.ownerCurrent());};
  const put=t.put.bind(t);t.put=async(...args)=>{check();const value=await put(...args);check();return value;};
  if(facet==='filter'&&a.state.filterHandles.get(a.childId))for(const method of ['get','count']){const read=t[method].bind(t);t[method]=async(...args)=>{check();const value=await read(...args);check();return value;};}
  const result=await a.callback(t);this.#current(a.state);
  if(following.length)a.following=await this.#captureFollowing(a.state,t);
  if(facet==='context'||facet==='topic'&&(this.#structures(a.state,a.units).length||this.#authoredTopic(a.state,a.units).length||this.#placementTopics(a.state,a.units).length))await this.#checkEntryMapping(a.state,a.units,t);
  if(facet==='filter'?result?.ok!==true||result.disposition!==(a.outcome==='COMMITTED'?'committed':'no_change')||!equal(result.inputIds,this.#inputs(a.state,a.units)):facet==='context'?result?.ok!==true||result.conflict===true||a.outcome==='NO_CHANGE'&&result.disposition!==(this.#contextEdits(a.state,a.units).length?'protected':'no_change'):!['create','reuse','candidate','unassigned'].includes(result?.outcome))fail('STALE_BASE');
  if(facet==='topic'&&this.#structures(a.state,a.units).length)assertStructuralTopicResult(result,this.#structures(a.state,a.units)[0]);
  if(facet==='topic'&&this.#placementTopics(a.state,a.units).length)assertPlacementTopicResult(result,this.#placementTopics(a.state,a.units)[0]);
  if(a.expectedDisposition!==null&&result?.disposition!==a.expectedDisposition)fail('STALE_BASE');
  if(facet==='context'){if(a.contextChange&&result.itemId!==a.contextChange.itemId)fail('STALE_BASE');const expected=a.expectedTarget?.();if(!expected||expected.itemId!==result.itemId||expected.item.revision!==result.revision)fail('STALE_BASE');await this.#checkExistingContext(a.state,a.childId,t,'settlement',expected,a.publication?.());}
  if(facet==='filter'&&a.state.filterHandles.get(a.childId)){if(typeof result.isCurrent!=='function'||typeof result.fenceAfterSettlement!=='function'||!result.visibilityPublication)fail('STALE_BASE');a.ownerCurrent=result.isCurrent;a.finalFence=result.fenceAfterSettlement;a.state.filterPublications.set(a.childId,{token:result.visibilityPublication,units:structuredClone(r.units)});check();}
  a.result=result;return {committed:true,coverage:r.units,...(facet==='filter'&&result.visibilityPublication?{filterPublication:result.visibilityPublication,captureFilterSettlement:token=>{const held=a.state.filterPublications.get(a.childId);if(!held||held.token!==result.visibilityPublication)fail('STALE_BASE');held.settlement=token;return true;}}:{}),...(a.finalFence||['topic','context'].includes(facet)&&(this.#structures(a.state,a.units).length||this.#contextEdits(a.state,a.units).length||this.#placementTopics(a.state,a.units).length)?{fenceAfterSettlement:async transaction=>{
   if(transaction!==t)fail('STALE_BASE');
   // The same original transaction has now staged all publication, exact ACK,
   // usage, job and NO_CHANGE counter writes. Revalidate full structural scope
   // and current authority here, never on a guessed last table write.
   await this.#foundation.current(t,await this.#foundation.job(t,a.state.job.id));
   await this.#checkPlacementMapping(a.state,a.units,t);for(const m of this.#placementTopics(a.state,a.units)){const held=a.state.placementMaterial.get(m.placementId),budget=a.state.authoredBudget;if(!held)fail('STALE_BASE');registerRepositoryFinalReadFence(this.#store.repository,t,{isCurrent:()=>{check();return true;},compatibilityRecheck:async()=>{await this.#foundation.current(t,await this.#foundation.job(t,a.state.job.id));await this.#checkPlacementMapping(a.state,a.units,t);check();return true;},plan:function*(){check();for(const {table,key,expected}of held){if(++budget.reads>CONTEXT_TOPIC_SCOPE_LIMITS.reads)fail('BUDGET_EXCEEDED');const row=yield {method:'get',table,key};if(!equal(placementTopicFacts(table,row),expected))fail('STALE_BASE');check();}return true;}});}await this.#checkStructuralMapping(a.state,a.units,t);await this.#checkContextMapping(a.state,a.units,t);if(['topic','context'].includes(facet))await this.#checkExistingContext(a.state,a.childId,t,'settlement',a.expectedTarget?.(),a.publication?.(),facet==='topic'?a.publication?.():null);if(['topic','context'].includes(facet))await this.#checkTopicCandidates(a.state,a.childId,t,a.publication?.());if(a.finalFence&&await a.finalFence(t)!==true)fail('STALE_BASE');check();return true;
  }}:{}),isCurrent:()=>{try{check();return this.#active===a;}catch{return false;}}};
 }
 async #invoke(state,childId,receipt,facet,units,work,outcome='COMMITTED',expectedDisposition=null,contextChange=null){
  this.#current(state);if(this.#active)fail('REQUEST_ALREADY_IN_FLIGHT');
  const a={state,childId,receipt,facet,units,outcome,expectedDisposition,contextChange,callback:null,entered:false,result:null};this.#active=a;
  try{await work();this.#current(state);if(!a.entered)fail('DOMAIN_REPLAY_UNACKNOWLEDGED');return {facet,units:units.length,state:'COMMITTED',...(outcome==='NO_CHANGE'?{outcome}:{})};}
  finally{a.adapterDeferred=null;if(this.#active===a)this.#active=null;}
 }
 async #topicFacet(state,childId,receipt,units){
  const inputIds=this.#inputs(state,units);if(!inputIds)return this.#defer(state,childId,'topic',units,'TOPIC_MAPPING_UNAVAILABLE');
  const key=canonical([childId,'topic',units]);let prepared=state.prepared.get(key);
  const authored=this.#authoredTopic(state,units);if(authored.length){if(authored.length!==1||units.length!==1)fail('UNAVAILABLE');return this.#invoke(state,childId,receipt,'topic',units,async()=>{if(!prepared){prepared=await this.#topic.prepareAuthoredReconciliation({entryId:authored[0].entryId,descriptor:state.request.items.find(i=>i.key===units[0].key).descriptor,operationId:this.#store.uuid()},{signal:state.controller.signal});state.prepared.set(key,prepared);}await this.#topic.commit(prepared);},'NO_CHANGE');}
  return this.#invoke(state,childId,receipt,'topic',units,async()=>{
   if(!prepared){try{let operation=state.candidateOperations.get(childId),operationId=operation?.operationId??this.#store.uuid(),scope=inputIds.map(inputId=>({inputId,role:'primary',selectedFields:['body']}));const selected=state.topicCandidates.get(childId);if(selected){if(!operation){const a=this.#active,saved=this.#response(a),response=this.#service.responseAdapter.topicCandidate(structuredClone(saved.response),Object.freeze(this.#correlation(a)));if(response?.then)fail('UNAVAILABLE');this.#current(state);if(this.#response(a)!==saved)fail('STALE_BASE');const cap=maintenanceTopicCandidateOperation(selected,undefined,operationId,response,state.publications.slice(state.candidatePublicationStart.get(childId)));operation={operationId,cap};state.candidateOperations.set(childId,operation);}scope=readMaintenanceTopicCandidateOperation(operation.cap,this.#store,{operationId,qualification:state.candidateQualifications.get(childId)}).scope;}prepared=await this.#topic.prepare({scope,entryIds:this.#entries(state,units).map(e=>e.entryId),operationId},{signal:state.controller.signal,...(operation?{maintenanceCandidate:operation.cap}:{})});}catch(error){const a=this.#active;if(a?.adapterDeferred&&this.#adapterDefer(a,'topic',a.adapterDeferred)){this.#response(a);throw a.adapterDeferred;}throw error;}this.#current(state);state.prepared.set(key,prepared);}
   const placements=this.#placementTopics(state,units);if(placements.length&&(prepared.outcome!=='reuse'||prepared.reason!=='same_identity'))fail('STALE_BASE');const structural=this.#structures(state,units);if(structural.length&&(prepared.outcome!=='reuse'||prepared.reason!==(structural[0].kind==='topic'?'same_identity':'internal_aspect')))fail('STALE_BASE');
   await this.#topic.commit(prepared);
  },this.#structures(state,units).length||this.#placementTopics(state,units).length?'NO_CHANGE':'COMMITTED');
 }
 // Bind only the original fully decoded groups. The response body is released
 // independently; these original receipt scalars never refresh from live rows.
 #contextGroupFacts(record,state,groups){
  if(!record||record.state!==state||this.#contextGroupBindings.get(groups)!==record||state.groups.get(record.key)!==groups||state.contextDeferred.get(record.key)!==record.deferred||state.generation!==this.#generation||this.#jobs.get(record.jobId)!==state||state.controller.signal!==record.signal||recoveryAborted.call(record.signal)||recoveryAborted.call(record.grantSignal)||deliveryData(this.#store,'repository')!==record.repository||deliveryData(record.repository,'db')!==record.database)fail('STALE_BASE');
  assertContextScopeWorkBudgetFacts(record.budget,{database:record.database});return true;
 }
 #contextGroupRecord(state,childId,receipt,groups){
  const record=this.#contextGroupBindings.get(groups);this.#contextGroupFacts(record,state,groups);
  if(record.childId!==childId||record.jobId!==state.job.id||deliveryData(receipt,'jobId')!==record.jobId||deliveryData(receipt,'childId')!==record.childId||deliveryData(receipt,'operationReceiptId')!==record.receiptId)fail('STALE_BASE');return record;
 }
 #contextGroupReceiptMatches(record,row){
  if(!row||deliveryData(row,'kind')!=='ai_usage_v1'||deliveryData(row,'jobId')!==record.jobId||deliveryData(row,'childId')!==record.childId||deliveryData(row,'operationReceiptId')!==record.receiptId||!['RESPONSE_RECORDED','VALIDATED','COMMITTED'].includes(deliveryData(row,'state')))fail('STALE_BASE');return true;
 }
 async #checkContextGroupReceipt(t,state,childId,receipt,groups){
  const record=this.#contextGroupRecord(state,childId,receipt,groups),reader=contextScopeTransactionReader(this.#store,t,record.budget),row=await reader.get('organizerUsage',record.attemptKey);
  this.#contextGroupFacts(record,state,groups);this.#contextGroupReceiptMatches(record,row);return record;
 }
 #fenceContextGroupReceipt(t,record){
  const identity=requireRepositoryTransactionScope(record.repository,t);if(identity.database!==record.database||identity.mode!=='readwrite')fail('STALE_BASE');
  const facts=()=>this.#contextGroupFacts(record,record.state,record.groups),check=row=>this.#contextGroupReceiptMatches(record,row);
  // Original Repository performs this keyed metadata read after every domain,
  // ACK and settlement write. No issuer, clock or current baseline is sampled.
  registerRepositoryFinalReadFence(record.repository,t,{isCurrent:facts,plan:function*(){facts();if(record.budget.reads>=CONTEXT_TOPIC_SCOPE_LIMITS.reads)fail('BUDGET_EXCEEDED');record.budget.reads++;const row=yield {method:'get',table:'organizerUsage',key:record.attemptKey};facts();check(row);return true;}});
 }
 async #contextFacet(state,childId,receipt,units){
  if(state.topicPublications.has(childId))await this.#childQualification(state,{childOperationId:childId,coverage:state.request.children[state.job.childIds.indexOf(childId)]},{afterTopic:true});
  const inputIds=this.#inputs(state,units);if(!inputIds)return [await this.#defer(state,childId,'context',units,'CONTEXT_MAPPING_UNAVAILABLE')];
  const key=canonical([childId,'context']);let groups=state.groups.get(key),contextDeferred=state.contextDeferred.get(key)||[];
  if(!groups){
   const saved=this.#response({state,childId,receipt});
   await this.#foundation.read(t=>this.#checkExistingContext(state,childId,t));this.#current(state);
   try{groups=await this.#decode({state,childId,receipt,units},'context',Object.freeze({...(state.topicResults.has(childId)?{topicResult:state.topicResults.get(childId)}:{}),units:structuredClone(units),inputIds:[...inputIds],...(state.existingContext.has(childId)?{existingContextItems:maintenanceExistingContextMetadata(state.existingContext.get(childId))}:{}),...(this.#contextEdits(state,units).length?{contextItems:this.#contextEdits(state,units).map(m=>({...contextEditScope(m),associationIds:[...m.associationIds],evidence:contextEditEvidence(m),fieldDigests:structuredClone(state.contextMaterial.get(m.itemId)?.fieldDigests)}))}:{}),...(this.#entries(state,units).length?{entries:structuredClone(this.#entries(state,units))}:{}),...(this.#placements(state,units).length?{placements:structuredClone(this.#placements(state,units))}:{}),...(this.#authored(state,units).length?{authoredEntries:this.#authored(state,units).map(m=>({...structuredClone(m),...(m.selectedFields?{fieldDigests:structuredClone(state.authoredMaterial.get(m.entryId)?.fieldDigests)}:{bodyDigest:state.authoredMaterial.get(m.entryId)?.bodyDigest})}))}:{}),...structuralContextGroups(this.#structures(state,units),m=>structuralContextEvidence(m,state.structuralMaterial.get(m.recordId)?.fieldDigests)),...(this.#bound(state,units).length?{boundEntries:this.#bound(state,units).map(m=>({...structuredClone(m),fieldDigests:structuredClone(state.boundMaterial.get(boundMaterialKey(m))?.fieldDigests)}))}:{})}));}catch(error){const deferred=this.#adapterDefer({state,childId,receipt,units},'context',error);if(!deferred)throw error;groups=structuredClone(deferred.groups);contextDeferred=structuredClone(deferred.units);}this.#current(state);
   if(!Array.isArray(groups)||!groups.length&&!contextDeferred.length||groups.length+contextDeferred.length>units.length)fail('STALE_BASE');
   const all=[...contextDeferred];for(const group of groups){exact(group,['units','change','operation'],['units','change']);if(Object.hasOwn(group,'operation')&&!['ADD','UPDATE','REMOVE_CANDIDATE','NO_CHANGE'].includes(group.operation))fail('STALE_BASE');group.units=validateCoverage(group.units,TYPE);if(group.units.some(u=>u.facet!=='context'||!units.some(v=>unitKey(u)===unitKey(v))))fail('STALE_BASE');
    if(group.operation==='NO_CHANGE')validateContextMaintenanceNoChange(group.change);else if(group.operation==='REMOVE_CANDIDATE')validateContextMaintenanceInvalidation(group.change);else validateContextMaintenanceChange(group.change);
    // Explicit adapter intent must agree with the original owner's revision contract.
    if(group.operation==='ADD'&&group.change.expectedRevision!==0||group.operation==='UPDATE'&&group.change.expectedRevision===0)fail('STALE_BASE');const ids=this.#inputs(state,group.units);
    if(!ids||!equal(ids,[...new Set(group.change.evidence.filter(e=>!['humanEntry','boundEntry'].includes(e.kind)).map(e=>e.inputId))].sort()))fail('STALE_BASE');
    const corrections=this.#contextEdits(state,group.units);
    if(corrections.length){const m=corrections[0];if(corrections.length!==1||group.units.length!==1||group.operation!=='UPDATE'||group.change.itemId!==m.itemId||group.change.expectedRevision!==m.revision||group.change.card!==m.card||group.change.epoch!==m.proof.epoch||!equal(group.change.associationIds,m.associationIds)||!equal(group.change.evidence,contextEditEvidence(m)))fail('STALE_BASE');}
    if(!corrections.length&&group.change.expectedRevision>0){
     const handle=state.existingContext.get(childId),baseline=handle&&maintenanceExistingContextMetadata(handle).find(item=>item.itemId===group.change.itemId);
     if(!baseline||baseline.revision!==group.change.expectedRevision||baseline.card!==group.change.card||baseline.epoch!==group.change.epoch||!equal(baseline.associationIds,group.change.associationIds)||!group.change.evidence.every(e=>baseline.currentEvidence.some(current=>equal(e,current))))fail('STALE_BASE');
     if(group.operation!=='UPDATE'&&baseline.lifecycle!=='active')fail('STALE_BASE');
    }
    const authored=this.#authored(state,group.units),evidence=group.change.evidence.filter(e=>e.kind==='humanEntry');if(authored.length!==evidence.length||authored.some(m=>!evidence.some(e=>authoredContextEvidenceMatches(e,m)&&equal(e.fieldDigests,state.authoredMaterial.get(m.entryId)?.fieldDigests||{body:state.authoredMaterial.get(m.entryId)?.bodyDigest}))))fail('STALE_BASE');
    const bound=this.#bound(state,group.units),boundEvidence=group.change.evidence.filter(e=>e.kind==='boundEntry');if(bound.length!==boundEvidence.length||bound.some(m=>!boundEvidence.some(e=>boundContextEvidenceMatches(e,m)&&equal(e.fieldDigests,state.boundMaterial.get(boundMaterialKey(m))?.fieldDigests))))fail('STALE_BASE');
    for(const m of this.#structures(state,group.units))for(const e of m.entries)if(!group.change.evidence.some(x=>x.inputId===e.inputId&&x.topicId===m.topicId&&equal(x.selectedFields,['body'])&&equal(x[structuralContextProperty(m)],structuralContextEvidence(m,state.structuralMaterial.get(m.recordId)?.fieldDigests))))fail('STALE_BASE');
    for(const p of this.#placements(state,group.units))if(!group.change.evidence.some(e=>e.inputId===p.inputId&&e.topicId===p.topicId))fail('STALE_BASE');all.push(...group.units);
   }
   if(!equal(all.map(unitKey).sort(),units.map(unitKey).sort())||this.#response({state,childId,receipt})!==saved)fail('STALE_BASE');
   const repository=deliveryData(this.#store,'repository'),database=deliveryData(repository,'db');this.#contextGroupBindings.set(groups,Object.freeze({state,groups,deferred:contextDeferred,key,jobId:saved.jobId,childId:saved.childId,receiptId:saved.operationReceiptId,attemptKey:'aiu:attempt:'+saved.childId,repository,database,budget:state.qualificationBudget,signal:state.controller.signal,grantSignal:state.grantBinding.revocationSignal}));state.groups.set(key,groups);state.contextDeferred.set(key,contextDeferred);state.topicResults.delete(childId);if(!this.#filterEnabled(state)){state.outputs.delete(childId);this.#remote?.releaseResponseChild(childId);}
  }
  const results=[];for(const group of groups){
   const current=await this.#foundation.status(state.job.id);this.#current(state);const remaining=group.units.filter(u=>!current.committedCoverage.includes(unitKey(u)));
   if(!remaining.length)continue;if(remaining.length!==group.units.length)fail('STALE_BASE');
   try{results.push(await this.#invoke(state,childId,receipt,'context',group.units,()=>group.operation==='NO_CHANGE'?this.#context.noChange(this.#service.context.caller,group.change,{signal:state.controller.signal}):group.operation==='REMOVE_CANDIDATE'?this.#context.invalidate(this.#service.context.caller,group.change,{signal:state.controller.signal}):this.#context.maintain(this.#service.context.caller,group.change,{signal:state.controller.signal}),group.operation==='NO_CHANGE'||this.#contextEdits(state,group.units).length?'NO_CHANGE':'COMMITTED',this.#contextEdits(state,group.units).length?'protected':group.operation==='REMOVE_CANDIDATE'?'invalidated':group.operation==='NO_CHANGE'?'no_change':group.change.expectedRevision===0?'created':'updated',group.change));}
   catch(e){this.#current(state);if(!['STORAGE_FAILED','STORAGE_FULL'].includes(e?.code))state.failedChildren.add(childId);results.push({facet:'context',units:group.units.length,state:'FAILED',reason:safeError(e)});break;}
  }
  if(contextDeferred.length)results.push(await this.#deferContextGroups(state,childId,receipt,groups,contextDeferred,deferReason.context));
  return results;
 }
 async #filterQualification(state,metadata,scope){
  const inputIds=[...scope.candidateIds,...scope.neighborIds].sort(),base=state.processing.get(metadata.childOperationId);this.#processingCurrent(state,base);
  const request={purpose:'ai-maintenance-filter-qualification',logicalJobId:base.scope.logicalJobId,childOperationId:metadata.childOperationId,principalId:base.scope.principalId,libraryId:base.scope.libraryId,consentEpoch:base.scope.consentEpoch,candidateIds:[...scope.candidateIds].sort(),neighborIds:[...scope.neighborIds].sort(),inputs:inputIds.map(inputId=>({inputId,selectedFields:['body','note']})),facets:['filter'],coverage:structuredClone(metadata.coverage.filter(u=>u.facet==='filter'))};
  const receipt=await this.#foundation.read(async t=>{
   await this.#foundation.current(t,await this.#foundation.job(t,state.job.id));this.#processingCurrent(state,base);
   const raw=await this.#processing.resolve(t,frozen(structuredClone(request)));this.#processingCurrent(state,base);
   exact(raw,['version','store','caller','scope','epoch','processing','expiresAt','revocationSignal']);
   if(Reflect.ownKeys(raw).some(k=>!Object.hasOwn(Object.getOwnPropertyDescriptor(raw,k),'value'))||raw.version!==1||raw.store!==this.#store||raw.caller!==this.#service.context.caller||!Object.isFrozen(raw.caller)||!opaque(raw.epoch)||raw.processing!==true||!Number.isSafeInteger(raw.expiresAt)||raw.expiresAt<=Date.now()||!(raw.revocationSignal instanceof AbortSignal)||raw.revocationSignal.aborted||!equal(responseSnapshot(raw.scope,32768),request))fail('UNAVAILABLE');
   const qualified=captureMaintenanceProcessingReceipt(raw,{processing:this.#processing,store:this.#store,caller:this.#service.context.caller,scope:request});this.#assertProcessing(qualified);return qualified;
  });
  this.#processingCurrent(state,receipt);const signal=receipt.revocationSignal,abort=()=>this.#releaseFilters(state,metadata.childOperationId),remove=()=>signal.removeEventListener('abort',abort);signal.addEventListener('abort',abort,{once:true});state.filterQualifications.set(metadata.childOperationId,{receipt,remove});this.#assertProcessing(receipt);return receipt;
 }
 #filterEnabled(state){return (this.#remote!==null||state.grant.tier==='pro')&&this.#service.filter?.enabled===true&&typeof this.#service.responseAdapter?.filter==='function';}
 async #filterCommand(state,childId,receipt,units){
  const expected=state.prepared.get(canonical([childId,'filter-snapshot'])),positive=state.filterHandles.get(childId);
  if(!this.#filterEnabled(state)||!expected||typeof this.#service.filter.selectScope==='function'&&!positive)return null;
  const base=state.processing.get(childId),qualification=state.filterQualifications.get(childId)?.receipt??null,binding=this.#correlation({state,childId,receipt});
  this.#processingCurrent(state,base);if(qualification)this.#assertProcessing(qualification);
  let command=state.filterCommands.get(childId);
  if(command){if(command.expected!==expected||command.positive!==positive||command.base!==base||command.qualification!==qualification||!equal(command.binding,binding)||!equal(command.units,units)||!['RESPONSE_RECORDED','VALIDATED'].includes(receipt.state))fail('STALE_BASE');return command;}
  const inputIds=this.#inputs(state,units);if(!inputIds||!equal(inputIds,expected.items.map(i=>i.inputId)))fail('STALE_BASE');
  let decisions,deferred=null;
  try{decisions=await this.#decode({state,childId,receipt,units},'filter',Object.freeze({inputIds:[...inputIds],units:structuredClone(units)}));}
  catch(error){deferred=this.#adapterDefer({state,childId,receipt,units},'filter',error);if(!deferred)throw error;}
  this.#processingCurrent(state,base);if(qualification)this.#assertProcessing(qualification);
  if(!deferred){if(!Array.isArray(decisions)||decisions.length!==inputIds.length)fail('STALE_BASE');for(const d of decisions){exact(d,['inputId','decision']);if(!(positive?['FILTER','KEEP','INSUFFICIENT']:['KEEP','INSUFFICIENT']).includes(d.decision))fail('STALE_BASE');}if(!equal(decisions.map(d=>d.inputId).sort(),inputIds))fail('STALE_BASE');}
  // Only the original decoder's complete same-response/coverage validation can
  // create this private, body-free command. No raw response is retained here.
  command=Object.freeze({expected,positive,base,qualification,binding:frozen(binding),units:frozen(structuredClone(units)),decisions:deferred?null:frozen(decisions),deferred:deferred?frozen(structuredClone({units:deferred.units,retryCondition:deferred.retryCondition})):null});state.filterCommands.set(childId,command);return command;
 }
 async #filterFacet(state,childId,receipt,units){
  const command=await this.#filterCommand(state,childId,receipt,units);
  if(!command)return this.#defer(state,childId,'filter',units,'FILTER_OWNER_UNAVAILABLE');
  state.outputs.delete(childId);this.#remote?.releaseResponseChild(childId);state.topicResults.delete(childId);
  if(command.deferred)return this.#defer(state,childId,'filter',command.deferred.units,command.deferred.retryCondition);
  const {expected,positive,decisions}=command;
  if(positive)return this.#invoke(state,childId,receipt,'filter',units,()=>this.#writeDomain(t=>this.#store.commitAIMaintenanceFilter(t,positive.handle,decisions),'filter'),decisions.some(d=>d.decision==='FILTER')?'COMMITTED':'NO_CHANGE');
  return this.#invoke(state,childId,receipt,'filter',units,()=>this.#writeDomain(t=>this.#store.noChangeMaintenanceFilter(t,expected,decisions),'filter'),'NO_CHANGE');
 }
 async #deferContextGroups(state,childId,receipt,groups,units,retryCondition){
  this.#current(state);const record=this.#contextGroupRecord(state,childId,receipt,groups);if(units!==record.deferred)fail('STALE_BASE');
  const keys=units.map(u=>canonical([childId,unitKey(u)])),remaining=units.filter((_,i)=>!state.deferredUnits.has(keys[i]));
  if(remaining.length){
   await this.#foundation.write(async t=>{
    await this.#checkContextGroupReceipt(t,state,childId,receipt,groups);this.#fenceContextGroupReceipt(t,record);
    await this.#foundation.deferMaintenanceContextInTransaction(t,state.job.id,childId,{units:remaining,retryCondition});this.#contextGroupFacts(record,state,groups);
   });
   this.#current(state);if([...state.promotions.values()].some(Boolean))state.domainSettlements.push({childId,facet:'context',units:structuredClone(remaining),outcome:'DEFER',publication:null});for(const key of keys)state.deferredUnits.add(key);state.progress.deferredUnits+=remaining.length;state.progress.remainingWork=true;
  }
  return {facet:'context',units:units.length,state:'DEFERRED'};
 }
 async #defer(state,childId,facet,units,retryCondition){
  this.#current(state);const keys=units.map(u=>canonical([childId,unitKey(u)])),remaining=units.filter((_,i)=>!state.deferredUnits.has(keys[i]));
  if(remaining.length){await this.#foundation.commitFacet(state.job.id,childId,{facet,units:remaining,outcome:'DEFER',retryCondition});this.#current(state);if([...state.promotions.values()].some(Boolean))state.domainSettlements.push({childId,facet,units:structuredClone(remaining),outcome:'DEFER',publication:null});for(const key of keys)state.deferredUnits.add(key);state.progress.deferredUnits+=remaining.length;state.progress.remainingWork=true;}
  return {facet,units:units.length,state:'DEFERRED'};
 }
 run(handle){
  const passive=this.#passive.get(handle);if(passive)return Promise.resolve(passive.generation!==this.#generation?outcome('UNAVAILABLE'):outcome(passive.state,{jobId:passive.localResolvedUnits?handle.jobId:null,...(passive.localResolvedUnits?{localResolvedUnits:passive.localResolvedUnits}:{}),...(handle.reason?{reason:handle.reason}:{}),nextCursor:handle.nextCursor,complete:handle.complete,deferredUnits:passive.deferredUnits,blockedUnits:passive.blockedUnits,remainingWork:passive.remainingWork,...(passive.pendingBatchUnits?{pendingBatchUnits:passive.pendingBatchUnits}:{}),...(passive.pendingPlacementUnits?{pendingPlacementUnits:passive.pendingPlacementUnits}:{}),...(passive.pendingAuthoredUnits?{pendingAuthoredUnits:passive.pendingAuthoredUnits}:{}),...(passive.pendingBoundUnits?{pendingBoundUnits:passive.pendingBoundUnits}:{}),...(passive.pendingStructuralUnits?{pendingStructuralUnits:passive.pendingStructuralUnits}:{}),...(passive.processedState?{processedState:passive.processedState}:{})}));
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
   if(initial.state==='COMMITTED'){await this.#publishFilterVisibility(state,initial);this.#current(state);state.completed=true;this.#retire(state);return this.#settled(state);}
   if(initial.attempts.some(r=>['DISPATCHED','OUTCOME_UNKNOWN'].includes(r.state))){this.#releaseFilters(state);state.outputs.clear();this.#remote?.releaseResponseJob(state.job.id);state.topicResults.clear();state.authoredMaterial.clear();state.boundMaterial.clear();state.structuralMaterial.clear();state.placementMaterial.clear();state.structuralInputs.clear();state.prepared.clear();state.groups.clear();state.contextDeferred.clear();this.#releaseContextEdits(state);this.#releaseExistingContext(state);this.#releaseTopicCandidates(state);return outcome('OUTCOME_UNKNOWN',{jobId:state.job.id});}
   try{await this.#preflightPayloads(state);}catch(error){
    // An impossible unsent structural envelope must not hold the library flight
    // indefinitely. The original cancellation owner preserves every pending
    // unit and releases only unsent reservations; charged/partial jobs stay put.
    if(error?.code==='BUDGET_EXCEEDED'&&(state.structuralMapping.size||state.contextMapping.size)&&initial.attempts.every(r=>!r.attemptCount)){const cancelled=await this.#foundation.cancel(state.job.id,{beforeDispatchOnly:true});if(cancelled.state==='CANCELLED_BEFORE_DISPATCH')this.#retire(state);}
    throw error;
   }this.#current(state);
   if(this.#remote)await this.#foundation.prepareMaintenanceServer(state.job.id);else await this.#foundation.reserve(state.job.id,{reservationId:state.grant.reservationId,executionKind:state.grant.kind});this.#current(state);
   const children=[];let topicFailed=false,followingUnavailable=null;
   const ordered=await this.#foundation.read(async t=>{const job=await this.#foundation.job(t,state.job.id);await this.#foundation.current(t,job);return job.childIds.map((id,i)=>({id,following:this.#following(state,job.childCoverage[i])})).sort((a,b)=>Number(a.following)-Number(b.following)).map(x=>x.id);});this.#current(state);
   for(const childId of ordered){
    let status=await this.#foundation.status(state.job.id);this.#current(state);let receipt=status.attempts.find(r=>r.childId===childId);
    if(receipt?.state==='COMMITTED')continue;
    const metadata=await this.#foundation.read(async t=>{const job=await this.#foundation.job(t,state.job.id);await this.#foundation.current(t,job);return this.#foundation.childRequest(job,job.childIds.indexOf(childId));});this.#current(state);
    if(this.#following(state,metadata.coverage)){
     if(topicFailed||state.request.coverage.some(u=>u.facet==='topic'&&!status.committedCoverage.includes(unitKey(u))))continue;
     if(!state.followingReady)fail('STALE_BASE');
     if(receipt?.state==='RESERVED'||this.#remote&&receipt?.state==='PLANNED')try{const prepared=await this.#preparePayload(state,metadata);try{await this.#checkPayload(state,prepared.handle,metadata,prepared.processing);}finally{if(prepared.handle)this.#topic.releaseMaterial(prepared.handle);}}
     catch(error){
      if(!['UNAVAILABLE','BUDGET_EXCEEDED'].includes(error?.code))throw error;
      // An unsent child's local refusal cannot discard an already received,
      // still-authorized sibling response. Consume that sibling below, while
      // leaving this exact child reserved. Revocation or changed job authority
      // still escapes to the original strict cleanup; no grant is refreshed.
      this.#current(state);await this.#foundation.read(async t=>{const job=await this.#foundation.job(t,state.job.id);await this.#foundation.current(t,job);});this.#current(state);
      followingUnavailable=error.code;results.push({facet:'context',units:metadata.coverage.length,state:'FAILED',reason:error.code});break;
     }
    }
    if(receipt?.state==='RESERVED'||this.#remote&&receipt?.state==='PLANNED'){const dispatched=this.#remote?await this.#dispatchService(state,metadata):await this.#foundation.dispatch(state.job.id,childId,this.#transport(state));this.#current(state);if(dispatched.state!=='RESPONSE_RECORDED'){this.#releaseFilters(state,childId);state.outputs.delete(childId);this.#remote?.releaseResponseChild(childId);state.topicResults.delete(childId);state.authoredMaterial.clear();state.boundMaterial.clear();state.structuralMaterial.clear();state.placementMaterial.clear();state.structuralInputs.clear();state.prepared.clear();state.groups.clear();state.contextDeferred.clear();this.#releaseContextEdits(state);this.#releaseExistingContext(state);this.#releaseTopicCandidates(state);return outcome('OUTCOME_UNKNOWN',{jobId:state.job.id,facets:results});}}
    status=await this.#foundation.status(state.job.id);this.#current(state);receipt=status.attempts.find(r=>r.childId===childId);
    if(!receipt||!['RESPONSE_RECORDED','VALIDATED'].includes(receipt.state))return outcome('UNAVAILABLE',{jobId:state.job.id,facets:results});
    const job=await this.#foundation.read(t=>this.#foundation.job(t,state.job.id));this.#current(state);const coverage=job.childCoverage[job.childIds.indexOf(childId)];children.push({childId,receipt,coverage});
    const units=coverage.filter(u=>u.facet==='topic'&&!status.committedCoverage.includes(unitKey(u))&&!state.deferredUnits.has(canonical([childId,unitKey(u)])));
    if(units.length&&!state.releasedChildren.has(childId)){
     if(state.failedFacets.has(canonical([childId,'topic']))&&state.filterCommands.has(childId)){topicFailed=true;continue;}
     const filterUnits=coverage.filter(u=>u.facet==='filter'&&!status.committedCoverage.includes(unitKey(u))&&!state.deferredUnits.has(canonical([childId,unitKey(u)])));
     if(this.#independentFilter&&filterUnits.length)try{await this.#filterCommand(state,childId,receipt,filterUnits);}catch(error){this.#current(state);state.outputs.delete(childId);this.#remote?.releaseResponseChild(childId);state.topicResults.delete(childId);}
    }
    if(units.length&&!state.releasedChildren.has(childId))try{results.push(await this.#topicFacet(state,childId,receipt,units));}catch(e){this.#current(state);const deferred=this.#adapterDefer({state,childId,receipt,units},'topic',e);if(deferred){results.push(await this.#defer(state,childId,'topic',deferred.units,deferred.retryCondition));continue;}if(!['STORAGE_FAILED','STORAGE_FULL'].includes(e?.code)){state.failedChildren.add(childId);state.failedFacets.add(canonical([childId,'topic']));state.outputs.delete(childId);this.#remote?.releaseResponseChild(childId);state.topicResults.delete(childId);if(state.filterCommands.has(childId))this.#releaseConsumedChild(state,childId,{filterContinuation:true});}results.push({facet:'topic',units:units.length,state:'FAILED',reason:safeError(e)});topicFailed=true;}
   }
   // A later child's provider/Topic stage sees current existing identities.
   // Only after every Topic phase succeeds do Context operations capture final
   // memberships, so sibling writes cannot invalidate earlier Context binding.
   for(const facet of ['context','filter']){
    if(facet==='context'&&topicFailed)continue;
    for(const {childId,receipt,coverage}of children){
     if(state.releasedChildren.has(childId)||state.failedFacets.has(canonical([childId,facet])))continue;
     const latest=await this.#foundation.status(state.job.id);this.#current(state);const units=coverage.filter(u=>u.facet===facet&&!latest.committedCoverage.includes(unitKey(u))&&!state.deferredUnits.has(canonical([childId,unitKey(u)])));if(!units.length)continue;
     try{if(facet==='context')results.push(...await this.#contextFacet(state,childId,receipt,units));else{results.push(await this.#filterFacet(state,childId,receipt,units));state.filterRetryChildren.delete(childId);}}
     catch(e){this.#current(state);if(facet==='filter'&&['STORAGE_FAILED','STORAGE_FULL'].includes(e?.code)&&state.filterCommands.has(childId))state.filterRetryChildren.add(childId);const deferred=this.#adapterDefer({state,childId,receipt,units},facet,e);if(deferred){results.push(await this.#defer(state,childId,facet,deferred.units,deferred.retryCondition));continue;}if(facet==='filter'&&!['STORAGE_FAILED','STORAGE_FULL'].includes(e?.code)){state.failedChildren.add(childId);this.#releaseFilters(state,childId);}if(facet==='context'&&!['STORAGE_FAILED','STORAGE_FULL'].includes(e?.code)){state.failedChildren.add(childId);state.failedFacets.add(canonical([childId,facet]));state.outputs.delete(childId);this.#remote?.releaseResponseChild(childId);state.topicResults.delete(childId);if(state.filterCommands.has(childId))this.#releaseConsumedChild(state,childId,{filterContinuation:true});}results.push({facet,units:units.length,state:'FAILED',reason:safeError(e)});}
    }
   }
   const final=await this.#foundation.status(state.job.id);this.#current(state);await this.#publishFilterVisibility(state,final);this.#current(state);
   for(const {childId,coverage}of children)if(coverage.every(u=>final.committedCoverage.includes(unitKey(u))||state.deferredUnits.has(canonical([childId,unitKey(u)]))))await this.#finishPromotion(state,childId,coverage);
   for(const {childId,coverage}of children)if(state.failedChildren.has(childId)&&!state.filterRetryChildren.has(childId)||coverage.every(u=>final.committedCoverage.includes(unitKey(u))||state.deferredUnits.has(canonical([childId,unitKey(u)]))))this.#releaseConsumedChild(state,childId);
   if(this.#remote&&['COMMITTED','EXPIRED_UNCOMMITTED','REJECTED','CANCELLED_BEFORE_DISPATCH'].includes(final.state))try{await this.#remote.report(this.#foundation,state.job);}catch{/* Durable body-free result remains pending; no paid retry. */}
   this.#current(state);
   if(final.state==='COMMITTED'){state.completed=true;this.#retire(state);}
   if(followingUnavailable)return outcome(followingUnavailable,{jobId:state.job.id,facets:results,...(state.scheduling||{}),...state.progress,remainingWork:true});
   return final.state==='COMMITTED'?this.#settled(state,results):outcome('PARTIAL',{jobId:state.job.id,facets:results,...(state.scheduling||{}),...state.progress,remainingWork:true});
  }catch(e){if(!['STORAGE_FAILED','STORAGE_FULL'].includes(e?.code)){this.#releaseFilters(state);state.outputs.clear();this.#remote?.releaseResponseJob(state.job.id);state.topicResults.clear();state.authoredMaterial.clear();state.boundMaterial.clear();state.structuralMaterial.clear();state.placementMaterial.clear();state.structuralInputs.clear();state.prepared.clear();state.groups.clear();state.contextDeferred.clear();this.#releaseContextEdits(state);this.#releaseExistingContext(state);this.#releaseTopicCandidates(state);}else{const current=await this.#foundation.status(state.job.id).catch(()=>null);if(!current||current.attempts.some(r=>['DISPATCHED','OUTCOME_UNKNOWN'].includes(r.state))){this.#releaseFilters(state);state.outputs.clear();this.#remote?.releaseResponseJob(state.job.id);state.topicResults.clear();state.authoredMaterial.clear();state.boundMaterial.clear();state.structuralMaterial.clear();state.placementMaterial.clear();state.structuralInputs.clear();state.prepared.clear();state.groups.clear();state.contextDeferred.clear();this.#releaseContextEdits(state);this.#releaseExistingContext(state);this.#releaseTopicCandidates(state);}}if(e?.code==='MAINTENANCE_CADENCE')this.#retire(state);return outcome(safeError(e),{jobId:state.job.id,facets:results,...(e?.code==='MAINTENANCE_CADENCE'?{nextEligibilityAt:e.nextEligibilityAt,observedAt:e.observedAt}:{} )});}
 }
 // Listener cleanup cannot change an already durable domain outcome.
 #retire(state){
  retireProcessingSelection(state.processingSelection);const errors=[],cleanup=fn=>{try{fn();}catch(error){errors.push(error);}};
  cleanup(()=>this.#releaseFilters(state));cleanup(()=>this.#remote?.releaseResponseJob(state.job.id));state.filterHandles.clear();state.prepared.clear();state.groups.clear();state.contextDeferred.clear();state.deferredUnits.clear();state.authoredMaterial.clear();state.boundMaterial.clear();state.structuralMaterial.clear();state.placementMaterial.clear();state.structuralInputs.clear();state.prepared.clear();state.groups.clear();state.contextDeferred.clear();this.#releaseContextEdits(state);this.#releaseExistingContext(state);this.#releaseTopicCandidates(state);state.outputs.clear();state.topicResults.clear();state.processing.clear();for(const map of [state.qualifications,state.postTopicQualifications]){for(const token of map.values())releaseMaintenanceQualification(token);map.clear();}state.topicPublications.clear();state.publications.length=0;state.domainSettlements.length=0;
  cleanup(state.removeRevocation);for(const clean of state.processingCleanup)cleanup(clean);state.processingCleanup.clear();
  this.#jobs.delete(state.job.id);return errors;
 }
 dispose(){
  this.#generation++;for(const controller of this.#promotionRecoveryControllers)controller.abort();this.#promotionRecoveryControllers.clear();promotionSessions.delete(this);if(this.#promotionRecovery)disposeMaintenanceSectionPromotionOwner(this.#promotionRecovery,this.#store);this.#promotionRecovery=null;for(const owner of this.#promotionOwners)disposeMaintenanceSectionPromotionOwner(owner,this.#store);this.#promotionOwners.clear();this.#preparing?.controller.abort();const errors=[];
  for(const state of this.#jobs.values()){
   // Physical cancellation and private-data retirement must survive host cleanup errors.
   state.controller.abort();errors.push(...this.#retire(state));
  }
  this.#jobs.clear();try{this.#unsubscribe?.();}finally{this.#unsubscribe=null;this.#remote?.dispose();}if(errors.length)throw errors[0];
 }
}
