import {planMaintenanceExistingContext,maintenanceExistingContextScope,captureMaintenanceExistingContext,readMaintenanceExistingContext,assertMaintenanceExistingContext,assertMaintenanceExistingContextTopicStage,bindMaintenanceExistingContextTopicOperation,settleMaintenanceExistingContextTopic,bindMaintenanceExistingContextContextOperation,assertMaintenanceExistingContextContextStage,settleMaintenanceExistingContextContext,maintenanceExistingContextReadyForSibling,releaseMaintenanceExistingContext} from './maintenance-existing-context.js';
import {observeRepositoryWriteFence,requireRepositoryWriteFence} from '../idb-repository.js';
import {requireMaintenanceServiceClient} from './maintenance-service-client.js';
import {assertStructuralTopicAssessment,assertStructuralTopicResult} from './structural-topic-reconciliation.js';
import {qualifyContextProtectionCorrections,assertContextProtectionCorrections,readContextEditMapping,contextEditScope,contextEditEvidence,captureContextEditMaterial,assertContextEditMaterial,releaseContextEditMaterial} from './context-correction.js';
import {inputProjection} from '../thought-evidence.js';
import {readStructuralContext,structuralContextGroups,structuralContextProperty,structuralContextMaterial,structuralContextEvidence} from './structural-context-mapping.js';
import {readBoundEntryContext,boundContextEvidenceMatches,boundSelectedText} from '../context-bound-entry.js';
import {readAuthoredEntryContext,authoredContextEvidenceMatches,authoredSelectedFields,authoredSelectedText} from '../context-authored-entry.js';
import {hashText} from '../dedupe.js';
import {createContextScopeWorkBudget,contextScopeTransactionReader,CONTEXT_TOPIC_SCOPE_LIMITS} from '../context-topic-scope.js';
import {AIUsageFoundation} from './foundation.js';
import {readMaintenanceBatch,unsupportedMaintenanceCoverage} from './maintenance-batch.js';
import {createMaintenancePayload} from './maintenance-payload.js';
import {canonical,digest,equal,exact,fail,opaque,unitKey,validateCoverage,localProviderDescriptor} from './contracts.js';
import {TopicFormationService,topicFormationMaintenanceReceipt} from '../topic-formation.js';
import {ContextMaintenanceService,contextMaintenanceSettlementFence,structuralContextRequestWithinBudget,validateContextMaintenanceChange,validateContextMaintenanceNoChange,validateContextMaintenanceInvalidation} from '../context-maintenance.js';
import {maintenanceResponseContextPolicy,bindMaintenanceResponseExistingContext,bindMaintenanceResponseEmptyExistingContext} from './maintenance-service-response.js';

const TYPE='AI_MAINTENANCE';
const outcome=(state,extra={})=>({state,dispatchAllowed:false,financialAuthority:false,...extra});
const reasons=new Set(['UNAVAILABLE','BUDGET_EXCEEDED','CANCELLED','STALE_BASE','OUTCOME_UNKNOWN','INVALID_REQUEST','CONTEXT_INVALIDATED','CONTEXT_LIMIT','STORAGE_FAILED','STORAGE_FULL','CONSENT_REQUIRED','REQUEST_ALREADY_IN_FLIGHT','DOMAIN_REPLAY_UNACKNOWLEDGED','MAINTENANCE_CADENCE']);
const safeError=e=>reasons.has(e?.code)?e.code:'UNAVAILABLE';
const frozen=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))frozen(child);Object.freeze(value);}return value;};
const boundMaterialKey=m=>canonical([m.entryId,m.topicId]);
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
 #store;#foundation;#provider;#service;#window;#topic;#context;#processing;#remote;#unsubscribe=null;
 #localCorrection=null;
 #handles=new WeakMap();#passive=new WeakMap();#jobs=new Map();#preparing=null;#active=null;#running=null;#generation=0;
 constructor(store,{provider=null,service=null,window=null,authority=null,processing=null,remote=null}={}){
  this.#remote=remote===null?null:requireMaintenanceServiceClient(remote);if(this.#remote&&provider!==null)fail('UNAVAILABLE');
  this.#store=store;this.#provider=provider;this.#service=service===null?null:{...service,topic:{...service.topic},context:{...service.context},...(service.filter?{filter:{...service.filter}}:{}),responseAdapter:service.responseAdapter===null?null:{...service.responseAdapter}};this.#window=window;this.#processing=processing===null?null:Object.freeze({...processing});if(processing!==null){exact(processing,['resolve','isCurrent']);if(typeof processing.resolve!=='function'||typeof processing.isCurrent!=='function')fail();}
  this.#foundation=new AIUsageFoundation(store,{resolveAuthority:authority,qualifyMaintenanceEntries:async(t,request)=>{const entries=await this.#entryMapping(request,t),authored=await this.#authoredMapping(request,t),bound=await this.#boundMapping(request,t);return request.coverage.filter(u=>request.items.find(i=>i.key===u.key)?.descriptor.kind==='library_entry'&&(['topic','context'].includes(u.facet)&&entries.has(u.key)||u.facet==='context'&&(authored.has(u.key)||bound.has(u.key))));},qualifyMaintenancePlacements:async(t,request)=>{const placements=await this.#placementMapping(request,t),bound=await this.#boundMapping(request,t);return request.coverage.filter(u=>request.items.find(i=>i.key===u.key)?.descriptor.kind==='placement'&&u.facet==='context'&&(placements.has(u.key)||bound.has(u.key)));},qualifyMaintenanceStructures:async(t,request)=>{const mapping=await this.#structuralMapping(request,t);return request.coverage.filter(u=>mapping.has(u.key)&&(u.facet==='context'||u.facet==='topic'&&this.#service?.topic.reconcileHumanNames===true));},qualifyMaintenanceContextEdits:async(t,request)=>{const mapping=await this.#contextMapping(request,t);return request.coverage.filter(u=>u.facet==='context'&&mapping.has(u.key));},committers:{topic:(t,r)=>this.#commit(t,r,'topic'),context:(t,r)=>this.#commit(t,r,'context'),filter:(t,r)=>this.#commit(t,r,'filter')}});
  if(service!==null){
   exact(service,['version','topic','context','responseAdapter','filter'],['version','topic','context','responseAdapter']);if(service.filter!==undefined){exact(service.filter,['enabled','selectScope'],['enabled']);if(service.filter.enabled!==true||service.filter.selectScope!==undefined&&typeof service.filter.selectScope!=='function')fail();}if(service.version!==1)fail();
   // A declared adapter route capability, not a provider field or a grant.
   // Legacy Context-only routes leave human Topic facets pending.
   exact(service.topic,['resolveProcessing','decisionVersion','parameters','reconcileHumanNames'],['resolveProcessing','decisionVersion','parameters']);if(service.topic.reconcileHumanNames!==undefined&&typeof service.topic.reconcileHumanNames!=='boolean')fail();exact(service.context,['processingVerifier','caller']);
   const adapter=service.responseAdapter;if(adapter!==null){exact(adapter,['topic','context','filter'],['topic','context']);if(adapter.filter!==undefined&&typeof adapter.filter!=='function')fail();if(typeof adapter.topic!=='function'||typeof adapter.context!=='function')fail();}
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
    if(selected.length&&!equal(selected,accounted))fail('STALE_BASE');
    const structures=this.#structures(a.state,a.units);if(structures.length){if(a.units.length!==1||structures.length!==1)fail('STALE_BASE');assertStructuralTopicAssessment(assessed,view,structures[0],a.state.structuralMaterial.get(structures[0].recordId));}return assessed;
   }},writeTransaction:fn=>this.#writeDomain(fn,'topic')});
   this.#context=new ContextMaintenanceService(store,{processingVerifier:service.context.processingVerifier,freshInputPolicy:maintenanceResponseContextPolicy(adapter),writeTransaction:fn=>this.#writeDomain(fn,'context')});
  }
  if(this.#remote)this.#unsubscribe=this.#remote.onInvalidate(()=>this.dispose());
 }
 available(){return this.#remote?.available()===true;}
 async opportunity(){if(!this.available())return outcome('UNAVAILABLE');const retained=this.#jobs.values().next().value;if(retained)return this.run(retained.handle);const handle=await this.prepare(this.#remote.options);return this.run(handle);}
 #current(state){
  try{if(!state||state.generation!==this.#generation||this.#jobs.get(state.job.id)!==state||state.controller.signal.aborted||state.grant.revocationSignal.aborted)fail('UNAVAILABLE');
  if(Object.entries(state.grantBinding).some(([key,value])=>state.grant[key]!==value))fail('UNAVAILABLE');syncTrue(this.#window.isCurrent(state.grant));
  for(const receipt of state.processing.values())try{this.#assertProcessing(receipt);}catch(error){state.controller.abort();state.outputs.clear();state.prepared.clear();state.groups.clear();state.authoredMaterial.clear();state.boundMaterial.clear();state.structuralMaterial.clear();state.structuralTopicNames.clear();state.structuralInputs.clear();this.#releaseContextEdits(state);throw error;}
  }catch(error){this.#releaseFilters(state);throw error;}
 }
 #correlation(a){return {logicalJobId:a.state.job.id,childOperationId:a.childId,operationReceiptId:a.receipt.operationReceiptId};}
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
  };return transaction?qualify(transaction):this.#foundation.read(qualify);
 }
 // Human placement is interpreted only for Context, never rerouted by Topic AI.
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
  };return transaction?qualify(transaction):this.#foundation.read(qualify);
 }
 async #contextMapping(request,transaction=null){
  const qualify=async transaction=>{const t=contextScopeTransactionReader(this.#store,transaction,createContextScopeWorkBudget()),found=new Map();for(const {key,descriptor:d}of request.items){if(d.kind!=='context_item')continue;const m=await readContextEditMapping(this.#store,t,d);if(m)found.set(key,m);}return found;};return transaction?qualify(transaction):this.#foundation.read(qualify);
 }
 #contextEdits(state,units){return units.filter(u=>u.facet==='context'&&state.contextMapping?.has(u.key)).map(u=>state.contextMapping.get(u.key));}
 #releaseContextEdits(state){for(const held of state.existingContext?.values()||[])releaseMaintenanceExistingContext(held);for(const plan of state.existingPlans?.values()||[])releaseMaintenanceExistingContext(plan);state.existingContext?.clear();state.existingPlans?.clear();for(const held of state.contextMaterial?.values()||[])releaseContextEditMaterial(held);state.contextMaterial?.clear();}
 async #checkContextMapping(state,units,transaction){
  const t=contextScopeTransactionReader(this.#store,transaction,state.authoredBudget);
  for(const m of this.#contextEdits(state,units)){const d=state.request.items.find(i=>i.key===JSON.stringify(['context_item',m.itemId])).descriptor;if(!equal(await readContextEditMapping(this.#store,t,d),m))fail('STALE_BASE');const held=state.contextMaterial.get(m.itemId);if(held)await assertContextEditMaterial(this.#store,t,held);}
 }
 async #structuralMapping(request,transaction=null){
  const qualify=async transaction=>{const t=contextScopeTransactionReader(this.#store,transaction,createContextScopeWorkBudget()),found=new Map();for(const {key,descriptor:d}of request.items){if(!['section','topic'].includes(d.kind))continue;const mapping=await readStructuralContext(this.#store,t,d);if(mapping)found.set(key,mapping);}return found;};return transaction?qualify(transaction):this.#foundation.read(qualify);
 }
 #structures(state,units){return [...new Map(units.filter(u=>state.structuralMapping?.has(u.key)&&(u.facet==='context'||u.facet==='topic'&&this.#service?.topic.reconcileHumanNames===true)).map(u=>[u.key,state.structuralMapping.get(u.key)])).values()];}
 #checkStructuralBudget(state,units){
  const structures=this.#structures(state,units.filter(u=>u.facet==='context'));if(!structures.length)return;
  // Byte-only specimens carry no field authority and acquire/hash no text.
  // Check following children too before any sibling can physically dispatch.
  if(!structuralContextRequestWithinBudget(structures.map(m=>structuralContextEvidence(m,{[m.kind==='topic'?'name':'title']:'0'.repeat(64)})),{inputIds:this.#inputs(state,units.filter(u=>u.facet==='context')),authoredEntries:this.#authored(state,units),boundEntries:this.#bound(state,units)}))fail('BUDGET_EXCEEDED');
 }
 async #checkStructuralMapping(state,units,transaction){
  const base=contextScopeTransactionReader(this.#store,transaction,state.authoredBudget),t=Object.create(base);
  // The assessment also depends on the containing Topic's sent name. Check it
  // on the mapper's existing read, in the original final transaction, without
  // adding a later read/hash window or exposing another payload/proof field.
  t.get=async(name,id)=>{const row=await base.get(name,id);if(name==='topics'&&state.structuralTopicNames.has(id)&&row?.name!==state.structuralTopicNames.get(id))fail('STALE_BASE');return row;};
  for(const u of units)if(this.#structures(state,[u]).length){const d=state.request.items.find(i=>i.key===u.key).descriptor;const m=state.structuralMapping.get(u.key);if(!equal(await readStructuralContext(this.#store,t,d),m))fail('STALE_BASE');for(const e of m.entries)if(state.structuralInputs?.has(e.inputId)&&(await inputProjection(this.#store,t,e.inputId))?.body!==state.structuralInputs.get(e.inputId))fail('STALE_BASE');}
 }
 async #authoredMapping(request,transaction=null){
  const qualify=async transaction=>{const t=contextScopeTransactionReader(this.#store,transaction,createContextScopeWorkBudget()),found=new Map();for(const {key,descriptor:d}of request.items){if(d.kind!=='library_entry')continue;const mapped=await readAuthoredEntryContext(this.#store,t,d.entityId,d);if(mapped)found.set(key,mapped);}return found;};
  return transaction?qualify(transaction):this.#foundation.read(qualify);
 }
 async #boundMapping(request,transaction=null){
  const qualify=async transaction=>{const t=contextScopeTransactionReader(this.#store,transaction,createContextScopeWorkBudget()),found=new Map();
   for(const {key,descriptor:d}of request.items){if(!['library_entry','placement'].includes(d.kind))continue;const placement=d.kind==='placement'?await t.get('placements',d.recordId||d.entityId):null,entryId=placement?.entryId??(d.kind==='library_entry'?d.entityId:null);if(!entryId)continue;const mapped=await readBoundEntryContext(this.#store,t,entryId,d,placement?.topicId??null);if(mapped)found.set(key,mapped);}return found;};
  return transaction?qualify(transaction):this.#foundation.read(qualify);
 }
 #bound(state,units){const unique=new Map();for(const u of units)if(u.facet==='context'&&state.boundMapping?.has(u.key)){const m=state.boundMapping.get(u.key),key=boundMaterialKey(m);if(unique.has(key)&&!equal(unique.get(key),m))fail('STALE_BASE');unique.set(key,m);}return [...unique.values()];}
 async #checkBoundMapping(state,units,transaction){
  const t=contextScopeTransactionReader(this.#store,transaction,state.authoredBudget);
  for(const u of units)if(u.facet==='context'&&state.boundMapping?.has(u.key)){const m=state.boundMapping.get(u.key),d=state.request.items.find(i=>i.key===u.key).descriptor,now=await readBoundEntryContext(this.#store,t,m.entryId,d,d.kind==='placement'?m.topicId:null);if(!equal(now,m))fail('STALE_BASE');const held=state.boundMaterial?.get(boundMaterialKey(m));if(held&&!equal(boundSelectedText(await t.get('thoughts',m.entryId),m.selectedFields),held.fields))fail('STALE_BASE');}
 }
 #authored(state,units){return units.filter(u=>u.facet==='context'&&state.authoredMapping?.has(u.key)).map(u=>state.authoredMapping.get(u.key));}
 async #checkAuthoredMapping(state,units,transaction){
  const t=contextScopeTransactionReader(this.#store,transaction,state.authoredBudget);
  for(const m of this.#authored(state,units)){const item=state.request.items.find(i=>i.descriptor.entityId===m.entryId&&i.descriptor.kind==='library_entry'),now=await readAuthoredEntryContext(this.#store,t,m.entryId,item.descriptor);if(!equal(now,m))fail('STALE_BASE');const held=state.authoredMaterial?.get(m.entryId);if(held&&!equal(authoredSelectedText(await t.get('thoughts',m.entryId),authoredSelectedFields(m)),held.fields||{body:held.body}))fail('STALE_BASE');}
 }
 #placements(state,units){const found=units.filter(u=>u.facet==='context'&&state.placementMapping?.has(u.key)).map(u=>state.placementMapping.get(u.key));for(const u of units)if(u.facet==='context'&&state.boundMapping?.has(u.key)&&state.request.items.find(i=>i.key===u.key)?.descriptor.kind==='placement'){const m=state.boundMapping.get(u.key);found.push({placementId:m.placementId,revision:m.placementRevision,entryId:m.entryId,entryRevision:m.entryRevision,topicId:m.topicId,topicRevision:m.topicRevision,topicOrganizationRevision:m.topicOrganizationRevision,sectionId:m.sectionId,sectionRevision:m.sectionRevision,layoutGeneration:m.layoutGeneration,inputId:m.inputId});}return found;}
 async #checkPlacementMapping(state,units,t){
  const current=await this.#placementMapping(state.request,t);for(const u of units)if(state.placementMapping?.has(u.key)&&!equal(current.get(u.key),state.placementMapping.get(u.key)))fail('STALE_BASE');
 }
 async #checkEntryMapping(state,units,t){
  const mapping=await this.#entryMapping(state.request,t);for(const u of units)if(state.entryMapping?.has(u.key)&&!equal(mapping.get(u.key),state.entryMapping.get(u.key)))fail('STALE_BASE');
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
   else if(d?.kind==='library_entry'&&u.facet==='context'&&state.authoredMapping?.has(u.key))continue;
   else if(d?.kind==='placement'&&u.facet==='context'&&state.placementMapping?.has(u.key))ids.add(state.placementMapping.get(u.key).inputId);
   else if(this.#structures(state,[u]).length)for(const e of state.structuralMapping.get(u.key).entries)ids.add(e.inputId);
   else if(d?.kind==='context_item'&&u.facet==='context'&&state.contextMapping?.has(u.key))for(const e of state.contextMapping.get(u.key).provenance.evidence)ids.add(e.inputId);
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
  const generation=this.#generation;if(this.#remote){const recovered=await this.#remote.assertCanPlan(this.#foundation,id=>this.#jobs.has(id),()=>generation===this.#generation&&!signal.aborted);if(recovered)return this.#passiveHandle({status:'RECOVERED',complete:false},generation);}let batch=await readMaintenanceBatch(this.#foundation,options),deferredUnits=0;
  if(generation!==this.#generation||signal.aborted)fail('UNAVAILABLE');
  // A configured local original-domain mapper resolves only its explicit old
  // retry condition. At most one mapper pass, distinct from obsolete cleanup.
  const mappingReady=this.#service?.responseAdapter&&(this.#provider||this.#remote)&&typeof this.#window?.acquire==='function'&&typeof this.#window?.isCurrent==='function';
  if(mappingReady&&(batch.blockedUnits>0||batch.reason==='DEFER_SCAN_BOUND')){
   if(!this.#remote)localProviderDescriptor(this.#provider);
   const cleanup=await this.#foundation.archiveObsoleteDeferred({limit:100,reconsiderEntryTopics:true,reconsiderEntryContexts:true,reconsiderPlacementContexts:true,reconsiderStructuralContexts:true,reconsiderContextEdits:true,reconsiderStructuralTopics:this.#service?.topic.reconcileHumanNames===true,maintenanceRouteVersion:options.routeVersion},{signal,isCurrent:()=>generation===this.#generation&&!signal.aborted});
   if(generation!==this.#generation||signal.aborted)fail('UNAVAILABLE');
   if(cleanup.archived){batch=await readMaintenanceBatch(this.#foundation,options);if(generation!==this.#generation||signal.aborted)fail('UNAVAILABLE');}
  }
  if(batch.status!=='CANDIDATE_ONLY')return this.#passiveHandle(batch,generation,deferredUnits);
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
  // The explicitly capable route checks one complete renamed Topic or Section per
  // opportunity. Other dirty work retains its original scan boundary.
  if(this.#service.topic.reconcileHumanNames===true){
   const selected=batch.request.coverage.find(u=>u.facet==='topic'&&structuralMapping.has(u.key));
   if(selected){const coverage=batch.request.coverage.filter(u=>u.key===selected.key),omitted=coverage.length!==batch.request.coverage.length;
    batch={...batch,...(omitted?{nextCursor:options.cursor??null,complete:false,pendingBatchUnits:batch.request.coverage.length-coverage.length}:{}),request:{...batch.request,items:batch.request.items.filter(i=>i.key===selected.key),coverage,children:[coverage]}};
   }
  }
  const unsupported=unsupportedMaintenanceCoverage(batch.request.items,batch.request.coverage,new Set(entryMapping.keys()),new Set(placementMapping.keys()),new Set(authoredMapping.keys()),new Set(boundMapping.keys()),new Set(structuralMapping.keys()),new Set(this.#service.topic.reconcileHumanNames===true?[...structuralMapping.keys()]:[]),new Set(contextMapping.keys()));
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
   entryMapping=await this.#entryMapping(batch.request);placementMapping=await this.#placementMapping(batch.request);authoredMapping=await this.#authoredMapping(batch.request);boundMapping=await this.#boundMapping(batch.request);structuralMapping=await this.#structuralMapping(batch.request);contextMapping=await this.#contextMapping(batch.request);if(generation!==this.#generation||signal.aborted)fail('UNAVAILABLE');
   isolateContext();
   if(unsupportedMaintenanceCoverage(batch.request.items,batch.request.coverage,new Set(entryMapping.keys()),new Set(placementMapping.keys()),new Set(authoredMapping.keys()),new Set(boundMapping.keys()),new Set(structuralMapping.keys()),new Set(this.#service.topic.reconcileHumanNames===true?[...structuralMapping.keys()]:[]),new Set(contextMapping.keys())).length)fail('UNAVAILABLE');
  }
  const request=batch.request;if(this.#remote)Object.assign(request,await this.#remote.planIdentity(this.#foundation,id=>this.#jobs.has(id)));
  // A mixed cycle reserves its original two-child envelope up front. Human
  // Placement/Authored Context gets its first processing/material snapshot only
  // after the Topic child commits. No sent snapshot or grant is refreshed.
  const followingKeys=new Set(request.coverage.some(u=>u.facet==='topic'&&!this.#structures({structuralMapping},[u]).length)?request.coverage.filter(u=>u.facet==='context'&&(placementMapping.has(u.key)||authoredMapping.has(u.key)||boundMapping.has(u.key)||structuralMapping.has(u.key))).map(u=>u.key):[]);
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
  const state={progress,request,entryMapping,placementMapping,authoredMapping,boundMapping,structuralMapping,contextMapping,contextMaterial:new Map(),existingPlans:new Map(),existingContext:new Map(),existingEnabled:new Map(),followingKeys,followingReady:request.coverage.filter(u=>u.facet==='topic').every(u=>job.committedCoverage.includes(unitKey(u))),authoredMaterial:new Map(),boundMaterial:new Map(),structuralMaterial:new Map(),structuralTopicNames:new Map(),structuralInputs:new Map(),authoredBudget:createContextScopeWorkBudget({signal}),job,handle,generation,grant,grantBinding:Object.freeze({...grant}),controller:new AbortController(),running:null,groups:new Map(),prepared:new Map(),filterHandles:new Map(),outputs:new Map(),processing:new Map(),processingCleanup:new Set(),completed:false};
  const revoked=()=>{this.#releaseFilters(state);state.controller.abort();state.outputs.clear();state.prepared.clear();state.groups.clear();state.authoredMaterial.clear();state.boundMaterial.clear();state.structuralMaterial.clear();state.structuralTopicNames.clear();state.structuralInputs.clear();this.#releaseContextEdits(state);state.processing.clear();};grant.revocationSignal.addEventListener('abort',revoked,{once:true});state.removeRevocation=()=>grant.revocationSignal.removeEventListener('abort',revoked);
  this.#jobs.set(job.id,state);this.#handles.set(handle,state);return handle;
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
  const inputIds=this.#inputs(state,metadata.coverage),entries=this.#entries(state,metadata.coverage),authoredEntries=this.#authored(state,metadata.coverage),boundEntries=this.#bound(state,metadata.coverage);if(!inputIds||!inputIds.length&&!authoredEntries.length)fail('UNAVAILABLE');
  if(entries.length||authoredEntries.length){await this.#foundation.read(t=>this.#checkEntryMapping(state,metadata.coverage,t));this.#current(state);}
  const receipt=await this.#foundation.read(async t=>{
   const job=await this.#foundation.job(t,state.job.id);await this.#foundation.current(t,job);this.#current(state);
   const request={purpose:'ai-maintenance-payload',logicalJobId:job.id,childOperationId:metadata.childOperationId,principalId:job.authority.principalId,libraryId:job.authority.libraryId,consentEpoch:job.authority.consentEpoch,inputs:inputIds.map(inputId=>({inputId,selectedFields:['body']})),...(entries.length?{entries:entries.map(({entryId,revision})=>({entryId,revision,selectedFields:['body']}))}:{}),...(this.#placements(state,metadata.coverage).length?{placements:structuredClone(this.#placements(state,metadata.coverage))}:{}),...(authoredEntries.length?{authoredEntries:authoredEntries.map(m=>({...structuredClone(m),selectedFields:[...authoredSelectedFields(m)]}))}:{}),...(boundEntries.length?{boundEntries:structuredClone(boundEntries)}:{}),...structuralContextGroups(this.#structures(state,metadata.coverage)),...(this.#contextEdits(state,metadata.coverage).length?{contextItems:this.#contextEdits(state,metadata.coverage).map(contextEditScope)}:{}),facets:[...new Set(metadata.coverage.map(u=>u.facet))].sort(),coverage:structuredClone(metadata.coverage)};
   if(state.existingEnabled.get(metadata.childOperationId)){
    let plan=state.existingPlans.get(metadata.childOperationId);
    if(!plan){plan=await planMaintenanceExistingContext(this.#store,t,{epoch:(await t.get('meta','recovery-restore-epoch'))?.value||'initial',inputIds});state.existingPlans.set(metadata.childOperationId,plan);}
    request.existingContextItems=maintenanceExistingContextScope(plan);
   }
   const raw=await this.#processing.resolve(t,frozen(structuredClone(request)));this.#current(state);
   exact(raw,['version','store','caller','scope','epoch','processing','expiresAt','revocationSignal']);
   if(Reflect.ownKeys(raw).some(k=>!Object.hasOwn(Object.getOwnPropertyDescriptor(raw,k),'value'))||raw.version!==1||raw.store!==this.#store||raw.caller!==this.#service.context.caller||!Object.isFrozen(raw.caller)||!opaque(raw.epoch)||raw.processing!==true||!Number.isSafeInteger(raw.expiresAt)||raw.expiresAt<=Date.now()||!(raw.revocationSignal instanceof AbortSignal)||raw.revocationSignal.aborted)fail('UNAVAILABLE');
   const scope=responseSnapshot(raw.scope,32768);if(!equal(scope,request))fail('UNAVAILABLE');
   return Object.freeze({...raw,scope:frozen(structuredClone(request))});
  });
  this.#processingCurrent(state,receipt);const prior=state.processing.get(metadata.childOperationId);
  if(prior&&(prior.epoch!==receipt.epoch||prior.expiresAt!==receipt.expiresAt||prior.revocationSignal!==receipt.revocationSignal||!equal(prior.scope,receipt.scope)))fail('UNAVAILABLE');
  if(!prior){const abort=()=>{this.#releaseFilters(state);state.controller.abort();state.outputs.clear();state.prepared.clear();state.groups.clear();state.authoredMaterial.clear();state.boundMaterial.clear();state.structuralMaterial.clear();state.structuralTopicNames.clear();state.structuralInputs.clear();this.#releaseContextEdits(state);};receipt.revocationSignal.addEventListener('abort',abort,{once:true});state.processingCleanup.add(()=>receipt.revocationSignal.removeEventListener('abort',abort));}
  state.processing.set(metadata.childOperationId,receipt);return receipt;
 }
 async #preparePayload(state,metadata){
  this.#current(state);
  const existing=!!(this.#remote&&await this.#remote.usesExistingContext(metadata));this.#current(state);
  if(state.existingEnabled.has(metadata.childOperationId)&&state.existingEnabled.get(metadata.childOperationId)!==existing)fail('STALE_BASE');state.existingEnabled.set(metadata.childOperationId,existing);
  const processing=await this.#processingReceipt(state,metadata),inputIds=this.#inputs(state,metadata.coverage),authored=this.#authored(state,metadata.coverage),bound=this.#bound(state,metadata.coverage);
  if(!inputIds||!inputIds.length&&!authored.length)fail('UNAVAILABLE');if(inputIds.length+authored.length+bound.length>Math.min(20,this.#store.organizerBudget.limits.maxInputs))fail('BUDGET_EXCEEDED');
  const handle=inputIds.length?await this.#topic.prepareMaterial({scope:inputIds.map(inputId=>({inputId,role:'primary',selectedFields:['body']})),entryIds:this.#entries(state,metadata.coverage).map(e=>e.entryId)},{signal:state.controller.signal}):null;
  try{this.#current(state);const material=handle?await this.#topic.readMaterial(handle):{sourceCount:0,view:{inputs:[],entries:[],identities:[],sections:[],constraints:[]}};this.#current(state);
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
   for(const m of this.#structures(state,metadata.coverage))if(!state.structuralMaterial.has(m.recordId)){
    const materialSection=structuralContextMaterial(m,material.view),topic=material.view.identities.find(t=>t.id===m.topicId&&t.canonicalId===m.topicId&&t.revision===m.topicRevision&&t.available&&t.canonicalLifecycle==='active');
    if(!materialSection||typeof topic?.name!=='string'||state.structuralTopicNames.has(m.topicId)&&state.structuralTopicNames.get(m.topicId)!==topic.name)fail('STALE_BASE');state.structuralTopicNames.set(m.topicId,topic.name);
    for(const e of m.entries){const input=material.view.inputs.find(i=>i.id===e.inputId);if(!input)fail('STALE_BASE');state.structuralInputs.set(e.inputId,input.fields.body);}
    const field=m.kind==='topic'?'name':'title';state.authoredBudget.hashBytes+=new TextEncoder().encode(materialSection[field]).length;state.authoredBudget.hashFields++;if(state.authoredBudget.hashBytes>CONTEXT_TOPIC_SCOPE_LIMITS.hashBytes||state.authoredBudget.hashFields>CONTEXT_TOPIC_SCOPE_LIMITS.hashFields)fail('BUDGET_EXCEEDED');
    const selected=await hashText(materialSection[field]);this.#current(state);state.structuralMaterial.set(m.recordId,{...materialSection,fieldDigests:{[field]:selected}});
   }
   await this.#foundation.read(t=>this.#checkStructuralMapping(state,metadata.coverage,t));this.#current(state);
   this.#checkStructuralBudget(state,metadata.coverage);
   for(const m of this.#contextEdits(state,metadata.coverage))if(!state.contextMaterial.has(m.itemId)){
    const held=await captureContextEditMaterial(this.#store,m,{signal:state.controller.signal,read:fn=>this.#foundation.read(t=>fn(contextScopeTransactionReader(this.#store,t,state.authoredBudget)))});
    try{this.#processingCurrent(state,processing);for(const input of held.snapshot.inputs)if(!material.view.inputs.some(i=>i.id===input.inputId&&i.revision===input.contentRevision&&i.fields.body===input.body))fail('STALE_BASE');
     const bytes=Object.values(held.fields).reduce((n,text)=>n+new TextEncoder().encode(text).length,0);state.authoredBudget.hashBytes+=bytes;state.authoredBudget.hashFields+=2;if(bytes>this.#store.organizerBudget.limits.maxContentBytes||state.authoredBudget.hashBytes>CONTEXT_TOPIC_SCOPE_LIMITS.hashBytes||state.authoredBudget.hashFields>CONTEXT_TOPIC_SCOPE_LIMITS.hashFields)fail('BUDGET_EXCEEDED');state.contextMaterial.set(m.itemId,held);
    }catch(error){releaseContextEditMaterial(held);throw error;}
   }
   await this.#foundation.read(t=>this.#checkContextMapping(state,metadata.coverage,t));this.#current(state);
   const payload=createMaintenancePayload(metadata,material,this.#store.organizerBudget.limits,this.#placements(state,metadata.coverage),authored.map(m=>state.authoredMaterial.get(m.entryId)),bound.map(m=>state.boundMaterial.get(boundMaterialKey(m))),this.#structures(state,metadata.coverage).filter(m=>m.kind!=='topic').map(m=>state.structuralMaterial.get(m.recordId)),this.#structures(state,metadata.coverage).filter(m=>m.kind==='topic').map(m=>state.structuralMaterial.get(m.recordId)),this.#contextEdits(state,metadata.coverage).map(m=>{const held=state.contextMaterial.get(m.itemId);return {...contextEditScope(m),fields:held.fields,fieldDigests:held.fieldDigests};}));
   if(existing){
    const plan=state.existingPlans.get(metadata.childOperationId),empty=maintenanceExistingContextScope(plan).length===0&&bindMaintenanceResponseEmptyExistingContext(this.#service.responseAdapter,metadata.childOperationId,plan);
    if(empty)payload.material.existingContextItems=[];
    else{let held=state.existingContext.get(metadata.childOperationId);
    if(!held){held=await captureMaintenanceExistingContext(this.#store,state.existingPlans.get(metadata.childOperationId),{processingReceipt:processing,assertProcessing:r=>{this.#processingCurrent(state,r);return true;},read:fn=>this.#foundation.read(fn),limits:this.#store.organizerBudget.limits,signal:state.controller.signal});state.existingContext.set(metadata.childOperationId,held);}
    payload.material.existingContextItems=readMaintenanceExistingContext(held);
    bindMaintenanceResponseExistingContext(this.#service.responseAdapter,metadata.childOperationId,held);}
    const bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
    if(bytes(payload.material)>this.#store.organizerBudget.limits.maxContentBytes||bytes(payload)>this.#store.organizerBudget.limits.maxRequestBytes)fail('BUDGET_EXCEEDED');
   }
   if(this.#filterEnabled(state)&&metadata.coverage.some(u=>u.facet==='filter')){const key=canonical([metadata.childOperationId,'filter-snapshot']);if(!state.prepared.has(key)){try{const snapshot=await this.#foundation.read(t=>this.#store.maintenanceFilterSnapshot(t,this.#inputs(state,metadata.coverage.filter(u=>u.facet==='filter'))));this.#current(state);state.prepared.set(key,snapshot);}catch(error){this.#current(state);if(!['STALE_BASE','UNAVAILABLE'].includes(error?.code))throw error;state.prepared.set(key,null);}}}
   return {handle,payload,processing};
  }catch(error){if(handle)this.#topic.releaseMaterial(handle);throw error;}
 }
 async #checkPayload(state,handle,metadata,processing){
  this.#processingCurrent(state,processing);await this.#processingReceipt(state,metadata);this.#processingCurrent(state,processing);if(handle)await this.#topic.checkMaterial(handle);this.#current(state);
  await this.#foundation.read(async t=>{const job=await this.#foundation.job(t,state.job.id);await this.#foundation.current(t,job);await this.#checkAuthoredMapping(state,metadata.coverage,t);await this.#checkBoundMapping(state,metadata.coverage,t);await this.#checkStructuralMapping(state,metadata.coverage,t);await this.#checkContextMapping(state,metadata.coverage,t);});this.#current(state);
  // Input and authored material share the original final Topic transaction,
  // after Input hashes. Pure authored work uses the same complete fence on its
  // own. Only synchronous host opportunity/abort checks follow this read.
  const finalRead=async t=>{const held=state.existingContext.get(metadata.childOperationId);if(held)await assertMaintenanceExistingContext(this.#store,t,held);const job=await this.#foundation.job(t,state.job.id);await this.#foundation.current(t,job);await this.#checkAuthoredMapping(state,metadata.coverage,t);await this.#checkBoundMapping(state,metadata.coverage,t);await this.#checkStructuralMapping(state,metadata.coverage,t);await this.#checkContextMapping(state,metadata.coverage,t);};
  if(handle)await this.#topic.checkMaterial(handle,finalRead);else await this.#foundation.read(finalRead);this.#processingCurrent(state,processing);
 }
 async #preflightPayloads(state){
  const status=await this.#foundation.status(state.job.id);this.#current(state);
  const requests=await this.#foundation.read(async t=>{const job=await this.#foundation.job(t,state.job.id);await this.#foundation.current(t,job);return job.childIds.map((_,i)=>this.#foundation.childRequest(job,i));});this.#current(state);
  const lateExisting=!!this.#remote?.usesExistingContext();
  for(const [index,metadata]of requests.entries()){if(lateExisting&&index>0)continue;if(!metadata.coverage.length||status.attempts.some(r=>r.childId===metadata.childOperationId&&r.attemptCount===1))continue;this.#checkStructuralBudget(state,metadata.coverage);if(this.#following(state,metadata.coverage))continue;
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
  const live=()=>{if(controller.signal.aborted||performance.now()>=deadline){rejectStop();fail('OUTCOME_UNKNOWN');}},check=()=>{live();this.#processingCurrent(state,processing);this.#filterCurrent(state,request.childOperationId,request);live();};
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
 async #preparePositiveFilter(state,metadata,payload,processing,{check,stopped}){
  if(!this.#filterEnabled(state)||typeof this.#service.filter.selectScope!=='function'||!metadata.coverage.some(u=>u.facet==='filter'))return;
  const append=(scope,handle)=>{
   check();syncTrue(this.#store.assertAIMaintenanceFilterCurrent(handle));
   // Body-free original owner selection, inside the already authorized packet.
   // Reapply the same payload ceilings after adding this optional descriptor.
   const material={...payload.material,filter:{candidateIds:[...scope.candidateIds].sort(),neighborIds:[...scope.neighborIds].sort()}},bytes=x=>new TextEncoder().encode(JSON.stringify(x)).length,limits=this.#store.organizerBudget.limits;
   if(bytes(material)>limits.maxContentBytes||bytes({...payload,material})>limits.maxRequestBytes)fail('BUDGET_EXCEEDED');
   payload.material=material;
  };
  const childId=metadata.childOperationId;
  if(state.filterHandles.has(childId)){const saved=state.filterHandles.get(childId);if(saved)append(saved.scope,saved.handle);return;}
  state.filterHandles.set(childId,null);let handle=null,qualified=false;
  const release=()=>{if(handle){const pending=handle;handle=null;this.#store.releaseAIMaintenanceFilter(pending);}};
  try{
   check();
   const candidateIds=this.#inputs(state,metadata.coverage.filter(u=>u.facet==='filter')),inputIds=payload.material.inputs.map(i=>i.inputId).sort();
   if(!candidateIds?.length||!state.prepared.get(canonical([childId,'filter-snapshot']))||!equal(inputIds,processing.scope.inputs.map(i=>i.inputId).sort()))return;
   const selected=await this.#service.filter.selectScope(frozen({candidateIds:[...candidateIds],inputIds:[...inputIds]}));check();const scope=responseSnapshot(selected,8192);check();
   exact(scope,['candidateIds','neighborIds']);
   if(!Array.isArray(scope.candidateIds)||!equal([...scope.candidateIds].sort(),candidateIds)||candidateIds.length>8||!Array.isArray(scope.neighborIds)||!scope.neighborIds.length||scope.neighborIds.length>2||new Set(scope.neighborIds).size!==scope.neighborIds.length||scope.neighborIds.some(id=>!inputIds.includes(id)||candidateIds.includes(id)))fail('INVALID_REQUEST');
   const prepared=await this.#foundation.read(async t=>{
    check();
    const guarded=method=>async(...args)=>{check();const result=await t[method](...args);check();return result;};
    // Race within the original read callback too: an uncooperative
    // authority must not hold the Store queue and prevent unknown settlement.
    const prepare=async()=>{try{handle=await this.#store.prepareAIMaintenanceFilter({get:guarded('get'),count:guarded('count')},scope);check();return handle;}catch(error){release();throw error;}};
    return Promise.race([prepare(),stopped]);
   });
   qualified=true;check();append(scope,prepared);state.filterHandles.set(childId,{handle:prepared,scope});handle=null;
  }catch(error){
   release();check();
   // Once an original handle exists, its failed currentness is not optional.
   // Never downgrade that revoked packet into an apparently permitted send.
   if(qualified&&error?.code!=='BUDGET_EXCEEDED'||!['STALE_BASE','UNAVAILABLE','INVALID_REQUEST','BUDGET_EXCEEDED'].includes(error?.code))throw error;
  }
 }
 // The selected packet remains bound to the same original private grant.
 // This synchronous check also runs in the final-send callback after all awaits.
 #filterCurrent(state,childId,payload){
  if(payload.material.filter===undefined)return;
  const saved=state.filterHandles.get(childId);if(!saved)fail('STALE_BASE');
  syncTrue(this.#store.assertAIMaintenanceFilterCurrent(saved.handle));
 }
 #releaseFilters(state,childId=null){
  if(!state?.filterHandles)return;
  for(const [id,prepared]of state.filterHandles)if(childId===null||id===childId){if(prepared)this.#store.releaseAIMaintenanceFilter(prepared.handle);state.filterHandles.set(id,null);}
 }
 #transport(state){
  const original=this.#provider,descriptor=localProviderDescriptor(original);
  return {describe:()=>structuredClone(descriptor),execute:async request=>{
   this.#current(state);if(request.logicalJobId!==state.job.id||!state.job.childIds.includes(request.childOperationId))fail('STALE_BASE');
   let response;try{
    const assembled=await this.#preparePayload(state,request);try{response=responseSnapshot(await this.#executeBounded(state,original,assembled.payload,assembled.handle,assembled.processing),this.#store.organizerBudget.limits.maxOutputBytes);}finally{if(assembled.handle)this.#topic.releaseMaterial(assembled.handle);}this.#current(state);
    if(response?.accepted===true&&opaque(response.operationReceiptId))state.outputs.set(request.childOperationId,{jobId:state.job.id,childId:request.childOperationId,operationReceiptId:response.operationReceiptId,response});
    else {this.#releaseFilters(state,request.childOperationId);state.outputs.delete(request.childOperationId);state.authoredMaterial.clear();state.boundMaterial.clear();state.structuralMaterial.clear();state.structuralTopicNames.clear();state.structuralInputs.clear();this.#releaseContextEdits(state);}
    // Only the existing neutral receipt fields cross the Foundation owner.
    return {accepted:response?.accepted===true,operationReceiptId:response?.operationReceiptId};
   }catch(e){this.#releaseFilters(state,request.childOperationId);state.outputs.delete(request.childOperationId);state.authoredMaterial.clear();state.boundMaterial.clear();state.structuralMaterial.clear();state.structuralTopicNames.clear();state.structuralInputs.clear();this.#releaseContextEdits(state);throw e;}
  }};
 }
 async #dispatchService(state,metadata){
  const assembled=await this.#preparePayload(state,metadata),{handle,processing,payload}=assembled;
  const timeoutMs=this.#store.organizerBudget.limits.timeoutMs,controller=new AbortController(),sources=[state.controller.signal,state.grant.revocationSignal,processing.revocationSignal];let prepared,timer;
  const abort=()=>controller.abort();for(const signal of sources){signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();}
  timer=setTimeout(abort,timeoutMs);
  const check=()=>{if(controller.signal.aborted)fail('OUTCOME_UNKNOWN');this.#processingCurrent(state,processing);this.#filterCurrent(state,metadata.childOperationId,payload);};
  const assertCurrent=async()=>{check();await this.#checkPayload(state,handle,metadata,processing);check();};
  try{
   const stopped=new Promise((_,reject)=>{const stop=()=>reject(Object.assign(Error('MAINTENANCE_STOPPED'),{code:'OUTCOME_UNKNOWN'}));controller.signal.addEventListener('abort',stop,{once:true});if(controller.signal.aborted)stop();});stopped.catch(()=>{});
   await this.#preparePositiveFilter(state,metadata,payload,processing,{check,stopped});
   prepared=await this.#remote.prepareChild(this.#foundation,state.job,payload,{signal:controller.signal,workBudget:state.authoredBudget,assertCurrent,isCurrent:()=>{try{check();return true;}catch{return false;}},assertBeforeSend:async()=>{const repository=this.#store.repository,token=observeRepositoryWriteFence(repository);await assertCurrent();return ()=>{check();if(this.#store.repository!==repository)fail('STALE_BASE');requireRepositoryWriteFence(repository,token);};}});
   state.scheduling=prepared.scheduling;await assertCurrent();const result=await this.#foundation.dispatch(state.job.id,metadata.childOperationId,prepared.provider,{signal:controller.signal,timeoutMs});
   await assertCurrent();if(result.state==='RESPONSE_RECORDED'){
    const status=await this.#foundation.status(state.job.id),receipt=status.attempts.find(r=>r.childId===metadata.childOperationId);check();
    if(!receipt||receipt.executionKind!=='server-backed'||!opaque(receipt.operationReceiptId)||receipt.financialSettlement?.state!=='SETTLED')fail('OUTCOME_UNKNOWN');
    const response=responseSnapshot({accepted:true,operationReceiptId:receipt.operationReceiptId,value:result.value},this.#store.organizerBudget.limits.maxOutputBytes);
    state.outputs.set(metadata.childOperationId,{jobId:state.job.id,childId:metadata.childOperationId,operationReceiptId:receipt.operationReceiptId,response});
   }
   return result;
  }catch(error){try{await this.#foundation.cancelServer(state.job.id);}catch{/* Unknown/cancellation ACK loss retains original holds. */}throw error;}
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
 async #writeDomain(fn,facet){
  const a=this.#active;this.#processingCurrent(a?.state,a?.state.processing.get(a.childId));if(!a||a.facet!==facet||a.callback!==null||typeof fn!=='function')fail('UNAVAILABLE');
  a.callback=fn;
  await this.#foundation.commitFacet(a.state.job.id,a.childId,{facet,units:a.units,outcome:a.outcome});this.#current(a.state);
  if(!a.entered||a.result===null)fail('DOMAIN_REPLAY_UNACKNOWLEDGED');
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
  if(facet==='context'||facet==='topic'&&this.#structures(a.state,a.units).length)await this.#checkEntryMapping(a.state,a.units,t);
  const following=facet==='topic'&&a.state.followingKeys.size?a.state.request.coverage.filter(u=>a.state.followingKeys.has(u.key)):[];if(following.length)await this.#checkEntryMapping(a.state,following,t);
  a.entered=true;const abort=()=>{try{t.tx.abort();}catch{}},signals=[a.state.controller.signal,a.state.grant.revocationSignal,a.state.processing.get(a.childId).revocationSignal];
  for(const s of signals)s.addEventListener('abort',abort);
  const cleanup=()=>{for(const s of signals)s.removeEventListener('abort',abort);};t.tx.addEventListener('complete',cleanup,{once:true});t.tx.addEventListener('abort',cleanup,{once:true});
  const check=()=>{this.#processingCurrent(a.state,a.state.processing.get(a.childId));if(a.ownerCurrent)syncTrue(a.ownerCurrent());};
  const put=t.put.bind(t);t.put=async(...args)=>{check();const value=await put(...args);check();return value;};
  if(facet==='filter'&&a.state.filterHandles.get(a.childId))for(const method of ['get','count']){const read=t[method].bind(t);t[method]=async(...args)=>{check();const value=await read(...args);check();return value;};}
  const existing=['context','topic'].includes(facet)?a.state.existingContext.get(a.childId):null;if(existing)await assertMaintenanceExistingContext(this.#store,t,existing);
  const result=await a.callback(t);this.#current(a.state);
  if(following.length)a.following=await this.#captureFollowing(a.state,t);
  if(facet==='context'||facet==='topic'&&this.#structures(a.state,a.units).length)await this.#checkEntryMapping(a.state,a.units,t);
  if(facet==='filter'?result?.ok!==true||result.disposition!==(a.outcome==='COMMITTED'?'committed':'no_change')||!equal(result.inputIds,this.#inputs(a.state,a.units)):facet==='context'?result?.ok!==true||result.conflict===true||a.outcome==='NO_CHANGE'&&result.disposition!==(this.#contextEdits(a.state,a.units).length?'protected':'no_change'):!['create','reuse','candidate','unassigned'].includes(result?.outcome))fail('STALE_BASE');
  if(facet==='topic'&&this.#structures(a.state,a.units).length)assertStructuralTopicResult(result,this.#structures(a.state,a.units)[0]);
  if(a.expectedDisposition!==null&&result?.disposition!==a.expectedDisposition)fail('STALE_BASE');
  if(facet==='filter'&&a.state.filterHandles.get(a.childId)){if(typeof result.isCurrent!=='function')fail('STALE_BASE');a.ownerCurrent=result.isCurrent;check();}
  const contextFence=facet==='context'?contextMaintenanceSettlementFence(result):null;
  if(facet==='context'&&result.disposition==='created'&&maintenanceResponseContextPolicy(this.#service.responseAdapter)&&!contextFence)fail('STALE_BASE');
  a.result=result;return {committed:true,coverage:r.units,...(contextFence||existing||['topic','context'].includes(facet)&&(this.#structures(a.state,a.units).length||this.#contextEdits(a.state,a.units).length)?{fenceAfterSettlement:async transaction=>{
   if(transaction!==t)fail('STALE_BASE');
   // The same original transaction has now staged all publication, exact ACK,
   // usage, job and NO_CHANGE counter writes. Revalidate full structural scope
   // and current authority here, never on a guessed last table write.
   await this.#foundation.current(t,await this.#foundation.job(t,a.state.job.id));
   await this.#checkStructuralMapping(a.state,a.units,t);await this.#checkContextMapping(a.state,a.units,t);
   if(contextFence)await contextFence(t);if(existing){if(facet==='context'){await assertMaintenanceExistingContext(this.#store,t,existing,result);await assertMaintenanceExistingContextContextStage(this.#store,t,existing,result);}else if(topicFormationMaintenanceReceipt(result,this.#store,t))await assertMaintenanceExistingContextTopicStage(this.#store,t,existing,result);}check();return true;
  }}:{}),isCurrent:()=>{try{check();return this.#active===a;}catch{return false;}}};
 }
 async #invoke(state,childId,receipt,facet,units,work,outcome='COMMITTED',expectedDisposition=null){
  this.#current(state);if(this.#active)fail('REQUEST_ALREADY_IN_FLIGHT');
  const a={state,childId,receipt,facet,units,outcome,expectedDisposition,callback:null,entered:false,result:null};this.#active=a;
  try{await work();this.#current(state);if(!a.entered)fail('DOMAIN_REPLAY_UNACKNOWLEDGED');return {facet,units:units.length,state:'COMMITTED',...(outcome==='NO_CHANGE'?{outcome}:{})};}
  finally{if(this.#active===a)this.#active=null;}
 }
 async #topicFacet(state,childId,receipt,units){
  const inputIds=this.#inputs(state,units);if(!inputIds)return this.#defer(state,childId,'topic',units,'TOPIC_MAPPING_UNAVAILABLE');
  const key=canonical([childId,'topic',units]);let prepared=state.prepared.get(key);
  let original;
  const committed=await this.#invoke(state,childId,receipt,'topic',units,async()=>{
   if(!prepared){const operationId=this.#store.uuid(),existing=state.existingContext.get(childId);if(existing)bindMaintenanceExistingContextTopicOperation(this.#store,existing,childId,operationId);prepared=await this.#topic.prepare({scope:inputIds.map(inputId=>({inputId,role:'primary',selectedFields:['body']})),entryIds:this.#entries(state,units).map(e=>e.entryId),operationId},{signal:state.controller.signal});this.#current(state);state.prepared.set(key,prepared);}
   const structural=this.#structures(state,units);if(structural.length&&(prepared.outcome!=='reuse'||prepared.reason!=='same_identity'))fail('STALE_BASE');
   original=await this.#topic.commit(prepared);
  },this.#structures(state,units).length?'NO_CHANGE':'COMMITTED');
  const existing=state.existingContext.get(childId);
  if(existing&&topicFormationMaintenanceReceipt(original,this.#store))try{await settleMaintenanceExistingContextTopic(this.#store,existing,original,{read:fn=>this.#foundation.read(fn)});}catch{this.#current(state);/* Original Topic is committed; unchanged Context witness remains pending. */}
  return committed;
 }
 async #contextFacet(state,childId,receipt,units){
  const inputIds=this.#inputs(state,units);if(!inputIds)return [await this.#defer(state,childId,'context',units,'CONTEXT_MAPPING_UNAVAILABLE')];
  const key=canonical([childId,'context']);let groups=state.groups.get(key);
  if(!groups){
   groups=await this.#decode({state,childId,receipt},'context',Object.freeze({units:structuredClone(units),inputIds:[...inputIds],...(this.#contextEdits(state,units).length?{contextItems:this.#contextEdits(state,units).map(m=>({...contextEditScope(m),associationIds:[...m.associationIds],evidence:contextEditEvidence(m),fieldDigests:structuredClone(state.contextMaterial.get(m.itemId)?.fieldDigests)}))}:{}),...(this.#entries(state,units).length?{entries:structuredClone(this.#entries(state,units))}:{}),...(this.#placements(state,units).length?{placements:structuredClone(this.#placements(state,units))}:{}),...(this.#authored(state,units).length?{authoredEntries:this.#authored(state,units).map(m=>({...structuredClone(m),...(m.selectedFields?{fieldDigests:structuredClone(state.authoredMaterial.get(m.entryId)?.fieldDigests)}:{bodyDigest:state.authoredMaterial.get(m.entryId)?.bodyDigest})}))}:{}),...structuralContextGroups(this.#structures(state,units),m=>structuralContextEvidence(m,state.structuralMaterial.get(m.recordId)?.fieldDigests)),...(this.#bound(state,units).length?{boundEntries:this.#bound(state,units).map(m=>({...structuredClone(m),fieldDigests:structuredClone(state.boundMaterial.get(boundMaterialKey(m))?.fieldDigests)}))}:{})}));this.#current(state);
   if(!Array.isArray(groups)||!groups.length||groups.length>units.length)fail('STALE_BASE');
   const all=[];for(const group of groups){exact(group,['units','change','operation'],['units','change']);if(Object.hasOwn(group,'operation')&&!['ADD','UPDATE','REMOVE_CANDIDATE','NO_CHANGE'].includes(group.operation))fail('STALE_BASE');group.units=validateCoverage(group.units,TYPE);if(group.units.some(u=>u.facet!=='context'||!units.some(v=>unitKey(u)===unitKey(v))))fail('STALE_BASE');
    if(group.operation==='NO_CHANGE')validateContextMaintenanceNoChange(group.change);else if(group.operation==='REMOVE_CANDIDATE')validateContextMaintenanceInvalidation(group.change);else validateContextMaintenanceChange(group.change);
    // Explicit adapter intent must agree with the original owner's revision contract.
    if(group.operation==='ADD'&&group.change.expectedRevision!==0||group.operation==='UPDATE'&&group.change.expectedRevision===0)fail('STALE_BASE');const ids=this.#inputs(state,group.units);
    if(!ids||!equal(ids,[...new Set(group.change.evidence.filter(e=>!['humanEntry','boundEntry'].includes(e.kind)).map(e=>e.inputId))].sort()))fail('STALE_BASE');
    const corrections=this.#contextEdits(state,group.units);
    if(corrections.length){const m=corrections[0];if(corrections.length!==1||group.units.length!==1||group.operation!=='UPDATE'||group.change.itemId!==m.itemId||group.change.expectedRevision!==m.revision||group.change.card!==m.card||group.change.epoch!==m.proof.epoch||!equal(group.change.associationIds,m.associationIds)||!equal(group.change.evidence,contextEditEvidence(m)))fail('STALE_BASE');}
    const authored=this.#authored(state,group.units),evidence=group.change.evidence.filter(e=>e.kind==='humanEntry');if(authored.length!==evidence.length||authored.some(m=>!evidence.some(e=>authoredContextEvidenceMatches(e,m)&&equal(e.fieldDigests,state.authoredMaterial.get(m.entryId)?.fieldDigests||{body:state.authoredMaterial.get(m.entryId)?.bodyDigest}))))fail('STALE_BASE');
    const bound=this.#bound(state,group.units),boundEvidence=group.change.evidence.filter(e=>e.kind==='boundEntry');if(bound.length!==boundEvidence.length||bound.some(m=>!boundEvidence.some(e=>boundContextEvidenceMatches(e,m)&&equal(e.fieldDigests,state.boundMaterial.get(boundMaterialKey(m))?.fieldDigests))))fail('STALE_BASE');
    for(const m of this.#structures(state,group.units))for(const e of m.entries)if(!group.change.evidence.some(x=>x.inputId===e.inputId&&x.topicId===m.topicId&&equal(x.selectedFields,['body'])&&equal(x[structuralContextProperty(m)],structuralContextEvidence(m,state.structuralMaterial.get(m.recordId)?.fieldDigests))))fail('STALE_BASE');
    for(const p of this.#placements(state,group.units))if(!group.change.evidence.some(e=>e.inputId===p.inputId&&e.topicId===p.topicId))fail('STALE_BASE');all.push(...group.units);
   }
   if(!equal(all.map(unitKey).sort(),units.map(unitKey).sort()))fail('STALE_BASE');state.groups.set(key,groups);if(!this.#filterEnabled(state))state.outputs.delete(childId);
  }
  const results=[];for(const group of groups){
   const current=await this.#foundation.status(state.job.id);this.#current(state);const remaining=group.units.filter(u=>!current.committedCoverage.includes(unitKey(u)));
   if(!remaining.length)continue;if(remaining.length!==group.units.length)fail('STALE_BASE');
   let committed=false;try{
    const existing=state.existingContext.get(childId);if(existing)bindMaintenanceExistingContextContextOperation(this.#store,existing,childId,group.change.operationId,group.change.itemId);let original;
    results.push(await this.#invoke(state,childId,receipt,'context',group.units,async()=>{original=await (group.operation==='NO_CHANGE'?this.#context.noChange(this.#service.context.caller,group.change,{signal:state.controller.signal}):group.operation==='REMOVE_CANDIDATE'?this.#context.invalidate(this.#service.context.caller,group.change,{signal:state.controller.signal}):this.#context.maintain(this.#service.context.caller,group.change,{signal:state.controller.signal}));},group.operation==='NO_CHANGE'||this.#contextEdits(state,group.units).length?'NO_CHANGE':'COMMITTED',this.#contextEdits(state,group.units).length?'protected':group.operation==='REMOVE_CANDIDATE'?'invalidated':null));committed=true;
    if(existing)await settleMaintenanceExistingContextContext(this.#store,existing,original,{read:fn=>this.#foundation.read(fn)});
   }
   catch(e){this.#current(state);if(!committed)results.push({facet:'context',units:group.units.length,state:'FAILED',reason:safeError(e)});break;}
  }return results;
 }
 #filterEnabled(state){return (this.#remote!==null||state.grant.tier==='pro')&&this.#service.filter?.enabled===true&&typeof this.#service.responseAdapter?.filter==='function';}
 async #filterFacet(state,childId,receipt,units){
  const expected=state.prepared.get(canonical([childId,'filter-snapshot'])),positive=state.filterHandles.get(childId);
  if(!this.#filterEnabled(state)||!expected||typeof this.#service.filter.selectScope==='function'&&!positive)return this.#defer(state,childId,'filter',units,'FILTER_OWNER_UNAVAILABLE');
  const inputIds=this.#inputs(state,units);if(!inputIds||!equal(inputIds,expected.items.map(i=>i.inputId)))fail('STALE_BASE');
  const key=canonical([childId,'filter']);let decisions=state.groups.get(key);
  if(!decisions){decisions=await this.#decode({state,childId,receipt},'filter',Object.freeze({inputIds:[...inputIds],units:structuredClone(units),snapshot:structuredClone(expected)}));this.#current(state);
   if(!Array.isArray(decisions)||decisions.length!==inputIds.length)fail('STALE_BASE');
   for(const d of decisions){exact(d,['inputId','decision']);if(!(positive?['FILTER','KEEP','INSUFFICIENT']:['KEEP','INSUFFICIENT']).includes(d.decision))fail('STALE_BASE');}
   if(!equal(decisions.map(d=>d.inputId).sort(),inputIds))fail('STALE_BASE');state.groups.set(key,frozen(decisions));
  }
  if(positive)return this.#invoke(state,childId,receipt,'filter',units,()=>this.#writeDomain(t=>this.#store.commitAIMaintenanceFilter(t,positive.handle,decisions),'filter'),decisions.some(d=>d.decision==='FILTER')?'COMMITTED':'NO_CHANGE');
  return this.#invoke(state,childId,receipt,'filter',units,()=>this.#writeDomain(t=>this.#store.noChangeMaintenanceFilter(t,expected,decisions),'filter'),'NO_CHANGE');
 }
 async #defer(state,childId,facet,units,retryCondition){await this.#foundation.commitFacet(state.job.id,childId,{facet,units,outcome:'DEFER',retryCondition});this.#current(state);return {facet,units:units.length,state:'DEFERRED'};}
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
   if(initial.state==='COMMITTED'){state.completed=true;this.#retire(state);return this.#settled(state);}
   if(initial.attempts.some(r=>['DISPATCHED','OUTCOME_UNKNOWN'].includes(r.state))){this.#releaseFilters(state);state.outputs.clear();state.authoredMaterial.clear();state.boundMaterial.clear();state.structuralMaterial.clear();state.structuralTopicNames.clear();state.structuralInputs.clear();this.#releaseContextEdits(state);return outcome('OUTCOME_UNKNOWN',{jobId:state.job.id});}
   try{await this.#preflightPayloads(state);}catch(error){
    // An impossible unsent structural envelope must not hold the library flight
    // indefinitely. The original cancellation owner preserves every pending
    // unit and releases only unsent reservations; charged/partial jobs stay put.
    if(error?.code==='BUDGET_EXCEEDED'&&(state.structuralMapping.size||state.contextMapping.size)&&initial.attempts.every(r=>!r.attemptCount)){const cancelled=await this.#foundation.cancel(state.job.id,{beforeDispatchOnly:true});if(cancelled.state==='CANCELLED_BEFORE_DISPATCH')this.#retire(state);}
    throw error;
   }this.#current(state);
   if(this.#remote)await this.#foundation.prepareMaintenanceServer(state.job.id);else await this.#foundation.reserve(state.job.id,{reservationId:state.grant.reservationId,executionKind:state.grant.kind});this.#current(state);
   const children=[],earlyContexts=new Set();let topicFailed=false,followingUnavailable=null;
   const ordered=await this.#foundation.read(async t=>{const job=await this.#foundation.job(t,state.job.id);await this.#foundation.current(t,job);return job.childIds.map((id,i)=>({id,following:this.#following(state,job.childCoverage[i])})).sort((a,b)=>Number(a.following)-Number(b.following)).map(x=>x.id);});this.#current(state);
   for(const childId of ordered){
    let status=await this.#foundation.status(state.job.id);this.#current(state);let receipt=status.attempts.find(r=>r.childId===childId);
    if(receipt?.state==='COMMITTED'){const existing=state.existingContext.get(childId);if(state.existingEnabled.get(childId)&&(!existing||!maintenanceExistingContextReadyForSibling(this.#store,existing)))break;continue;}
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
    if(receipt?.state==='RESERVED'||this.#remote&&receipt?.state==='PLANNED'){const dispatched=this.#remote?await this.#dispatchService(state,metadata):await this.#foundation.dispatch(state.job.id,childId,this.#transport(state));this.#current(state);if(dispatched.state!=='RESPONSE_RECORDED'){this.#releaseFilters(state,childId);state.outputs.delete(childId);state.authoredMaterial.clear();state.boundMaterial.clear();state.structuralMaterial.clear();state.structuralTopicNames.clear();state.structuralInputs.clear();this.#releaseContextEdits(state);return outcome('OUTCOME_UNKNOWN',{jobId:state.job.id,facets:results});}}
    status=await this.#foundation.status(state.job.id);this.#current(state);receipt=status.attempts.find(r=>r.childId===childId);
    if(!receipt||!['RESPONSE_RECORDED','VALIDATED'].includes(receipt.state))return outcome('UNAVAILABLE',{jobId:state.job.id,facets:results});
    const job=await this.#foundation.read(t=>this.#foundation.job(t,state.job.id));this.#current(state);const coverage=job.childCoverage[job.childIds.indexOf(childId)];children.push({childId,receipt,coverage});
    const units=coverage.filter(u=>u.facet==='topic'&&!status.committedCoverage.includes(unitKey(u)));
    if(units.length)try{results.push(await this.#topicFacet(state,childId,receipt,units));}catch(e){this.#current(state);if(!['STORAGE_FAILED','STORAGE_FULL'].includes(e?.code))state.outputs.delete(childId);results.push({facet:'topic',units:units.length,state:'FAILED',reason:safeError(e)});topicFailed=true;}
    // This closed profile admits only exact receipt-only Topic transitions.
    // Finish its already-sent Context before a sibling's first qualification;
    // no sibling result may refresh or stand in for this child's private proof.
    if(state.existingContext.has(childId)){
     if(topicFailed)break;earlyContexts.add(childId);const latest=await this.#foundation.status(state.job.id);this.#current(state);const contextUnits=coverage.filter(u=>u.facet==='context'&&!latest.committedCoverage.includes(unitKey(u)));
     if(contextUnits.length)try{results.push(...await this.#contextFacet(state,childId,receipt,contextUnits));}catch(e){this.#current(state);results.push({facet:'context',units:contextUnits.length,state:'FAILED',reason:safeError(e)});}
     const settled=await this.#foundation.status(state.job.id);this.#current(state);if(coverage.some(u=>u.facet==='context'&&!settled.committedCoverage.includes(unitKey(u)))||!maintenanceExistingContextReadyForSibling(this.#store,state.existingContext.get(childId)))break;
    }
   }
   // A later child's provider/Topic stage sees current existing identities.
   // Only after every Topic phase succeeds do Context operations capture final
   // memberships, so sibling writes cannot invalidate earlier Context binding.
   for(const facet of ['context','filter']){
    if(facet==='context'&&topicFailed)continue;
    for(const {childId,receipt,coverage}of children){
     if(facet==='context'&&earlyContexts.has(childId))continue;const latest=await this.#foundation.status(state.job.id);this.#current(state);const units=coverage.filter(u=>u.facet===facet&&!latest.committedCoverage.includes(unitKey(u)));if(!units.length)continue;
     try{if(facet==='context')results.push(...await this.#contextFacet(state,childId,receipt,units));else results.push(await this.#filterFacet(state,childId,receipt,units));}
     catch(e){this.#current(state);if(facet==='filter'&&!['STORAGE_FAILED','STORAGE_FULL'].includes(e?.code))this.#releaseFilters(state,childId);if(facet==='context'&&!['STORAGE_FAILED','STORAGE_FULL'].includes(e?.code))state.outputs.delete(childId);results.push({facet,units:units.length,state:'FAILED',reason:safeError(e)});}
    }
   }
   const final=await this.#foundation.status(state.job.id);this.#current(state);
   if(this.#remote&&['COMMITTED','EXPIRED_UNCOMMITTED','REJECTED','CANCELLED_BEFORE_DISPATCH'].includes(final.state))try{await this.#remote.report(this.#foundation,state.job);}catch{/* Durable body-free result remains pending; no paid retry. */}
   this.#current(state);
   if(final.state==='COMMITTED'){state.completed=true;this.#retire(state);}
   if(followingUnavailable)return outcome(followingUnavailable,{jobId:state.job.id,facets:results,...(state.scheduling||{}),...state.progress,remainingWork:true});
   return final.state==='COMMITTED'?this.#settled(state,results):outcome('PARTIAL',{jobId:state.job.id,facets:results,...(state.scheduling||{}),...state.progress,remainingWork:true});
  }catch(e){if(!['STORAGE_FAILED','STORAGE_FULL'].includes(e?.code)){this.#releaseFilters(state);state.outputs.clear();state.authoredMaterial.clear();state.boundMaterial.clear();state.structuralMaterial.clear();state.structuralTopicNames.clear();state.structuralInputs.clear();this.#releaseContextEdits(state);}else{const current=await this.#foundation.status(state.job.id).catch(()=>null);if(!current||current.attempts.some(r=>['DISPATCHED','OUTCOME_UNKNOWN'].includes(r.state))){this.#releaseFilters(state);state.outputs.clear();state.authoredMaterial.clear();state.boundMaterial.clear();state.structuralMaterial.clear();state.structuralTopicNames.clear();state.structuralInputs.clear();this.#releaseContextEdits(state);}}if(e?.code==='MAINTENANCE_CADENCE')this.#retire(state);return outcome(safeError(e),{jobId:state.job.id,facets:results,...(e?.code==='MAINTENANCE_CADENCE'?{nextEligibilityAt:e.nextEligibilityAt,observedAt:e.observedAt}:{} )});}
 }
 // Listener cleanup cannot change an already durable domain outcome.
 #retire(state){
  const errors=[],cleanup=fn=>{try{fn();}catch(error){errors.push(error);}};
  cleanup(()=>this.#releaseFilters(state));state.filterHandles.clear();state.prepared.clear();state.groups.clear();state.authoredMaterial.clear();state.boundMaterial.clear();state.structuralMaterial.clear();state.structuralTopicNames.clear();state.structuralInputs.clear();this.#releaseContextEdits(state);state.outputs.clear();state.processing.clear();
  cleanup(state.removeRevocation);for(const clean of state.processingCleanup)cleanup(clean);state.processingCleanup.clear();
  this.#jobs.delete(state.job.id);return errors;
 }
 dispose(){
  this.#generation++;this.#preparing?.controller.abort();const errors=[];
  for(const state of this.#jobs.values()){
   // Physical cancellation and private-data retirement must survive host cleanup errors.
   state.controller.abort();errors.push(...this.#retire(state));
  }
  this.#jobs.clear();try{this.#unsubscribe?.();}finally{this.#unsubscribe=null;this.#remote?.dispose();}if(errors.length)throw errors[0];
 }
}
