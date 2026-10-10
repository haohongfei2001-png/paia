import {requireOriginalLibraryDocumentsStore} from '../library-documents-owner.js';
import {requireSourceWorkingStoreBinding} from './source-working-binding.js';
import {measureSourceWorkingPhysicalTree,equalSourceWorkingPhysicalTree} from './source-working-physical.js';
import {sourceWorkingCurrentStores,sourceWorkingCurrentNonemptyStores} from './source-working-canonical.js';
import {sourceWorkingCurrentIndexSchema,sourceWorkingPhysicalIndexKey} from './source-working-index-schema.js';
import {mixedCurrentIndexSchema,mixedCurrentPhysicalIndexKey} from './mixed-current-index-schema.js';
import {assertSourceWorkingDefaultMeta,assertSourceWorkingRestoredDefaultMeta} from './source-working-default-meta.js';
import {prepareCurrentSourceWorkingGroupCheckpointPlan,requireSelectedCurrentSourceWorkingGroupPlan,prepareCurrentMixedGroupCheckpointPlan,requireOriginalCurrentMixedGroupPlan} from './group-checkpoint-plan.js';
import {sourceWorkingScopeScratch,sourceWorkingComparisonScratch} from './source-working-qualification-cost.js';
import * as currentGroupOwner from './group-checkpoint-scope.js';
import * as currentHumanOwner from './human-library-scope.js';
import * as currentSegmentOwner from './segments.js';
import * as currentCheckpointOwner from './checkpoints.js';
import {inspectHumanUnindexedSearch} from './human-library-search-proof.js';
import {planSearchQueueLocator} from '../library-search.js';
import {planHumanPlacementDescriptor} from '../organizer/topic-reading.js';
import {planIndependentExpressionTime,unknownExpressionTime} from '../organizer/expression-time.js';
import {planThoughtRootProjection,liveTopicKey,planThoughtTopicBuild,planThoughtTopicDescriptorRows,accumulateThoughtTopicDescriptor,completeThoughtTopicProjection} from '../thought-read-index.js';
import {beginHumanQualificationWork,resizeHumanQualificationLease,retainHumanQualificationLease,releaseHumanQualificationLease} from './human-qualification-budget.js';
import {requireRepositoryTransactionScope,beginRepositoryHumanRetentionRead,awaitRepositoryHumanRetentionRead,requireRepositoryHumanRetentionReadDrained,awaitRepositoryTransactionSettled,requireRepositoryCommittedIdentity,requireRepositoryTransactionDataMethods} from '../idb-repository.js';
import {validateHumanCommitGroup,CORE_LIMITS,requireHumanRetentionOwnerPhase,requireHumanRetentionEffectPreparation,requireHumanRetentionEffectFinalization,requireHumanRetentionClosingPhase,calculateHumanRetentionHeadVectors,acceptSequence,requireHumanProjectionReadPhase,requireHumanProjectionNativeDrainPhase,openHumanProjectionNativeRead} from './core.js';
import {physical,normalizePhysical} from './human-library-journal.js';
import {editSection,editSectionInTransaction,planHumanSectionEdit} from '../thought-organization.js';
import {planHumanFixedMembership,moveMembershipInTransaction,fixMembershipSetInTransaction} from '../topic-intent.js';
import {changeTopicContainer,changeTopicContainerInTransaction,planHumanTopicMembership,planHumanTopicMembershipEntry,planHumanTopicContainer} from '../topic-governance.js';
import {assertMemoryTopicTransitionAllowed} from '../memory/organization-guard.js';
import {assertMemoryPlacementChangeAllowed} from '../memory/organization-guard.js';
import {THOUGHT_TOPIC_INDEX_VERSION,planThoughtTopicInvalidation} from '../thought-read-index.js';
import {revisionShouldPrune,REVISION_POLICY} from '../ia-store.js';
import {ownerVersion} from '../library-search.js';
import {planHumanTopicCreation,planHumanPlacement,planHumanPlacementRow,humanPlacementRank,humanSectionRank,planHumanSectionCreation,planHumanEntryCreation,planHumanEntryRemoval,planHumanEntryRestoration,planHumanTopicTouch,planHumanEntryFields,finishHumanEntryFields} from '../thought-store.js';
import {planJournalRevision} from '../thought-journal.js';
import {prepareTopicName,prepareTopicIdentityName,prepareTopicNameFromBase,prepareTopicIdentityFromSnapshot,planTopicNameRegistration,planHumanTopicRename,planHumanTopicField,assertTopicIdentityBase,keepTopicIdentitiesSeparate,keepTopicIdentitiesSeparateInTransaction,planHumanKeepSeparate,topicPairKey} from '../topic-identity.js';
import {keys,idOK,revisionOK,normalizeRank,rankBetween,prefix,keyedHash,validateFields,entrySnapshot,ENTRY_FIELDS} from '../thought-model.js';
import {hashText} from '../dedupe.js';
import {CONSENT_VERSION,ArchiveError} from '../constants.js';
import {prepareHumanAllocation,beginHumanAllocation,finishHumanAllocation,releaseHumanAllocation,bindHumanReplayEntry} from './human-library-allocation.js';
import {LIBRARY_INDEXES} from '../thought-schema.js';
import {validateHumanLibraryCommit,portableHumanEntity} from './human-library-codec.js';
import {restoreHumanRequest} from './human-library-request.js';
import {clone,equal,fail,bytes,digest} from './value.js';
import {protocolPhysicalId} from './physical-key.js';
const plans=new WeakMap(),futureEntries=new WeakMap(),futureGraphs=new WeakMap();
async function base(store,core,t){
 const control=await store.control(t);if(!control.settings.enabled||control.settings.consentVersion!==CONSENT_VERSION)fail('BNS_HUMAN_PERMISSION');
 return {namespace:await core.bind(t),generation:(await core.get(t,'generation'))?.value||0,epoch:(await t.get('meta','recovery-restore-epoch'))?.value??null,secret:(await t.get('meta','thought-suppression-key'))?.value,settings:control.settings,revision:await t.get('meta','revision-sequence')??null,sequence:await t.get('meta','thought-sequence')??null,library:await t.get('meta','thought-library')};
}
export async function humanPlanEntry(store,core){
 await store.finishFoundation();if(core.repository!==store.repository)fail('BNS_HUMAN_BINDING');return store.run(()=>core.transaction(false,t=>base(store,core,t)));
}
// First named planner: actual Topic/default Section/both baseline histories and
// the existing Library touch/operation receipt. No callback or virtual store.
function computeHumanTopicState(request,before,nameIdentity,requestDigest,allocation){
 const id=allocation.uuid(),sectionId=allocation.uuid(),at=allocation.clock(),{topic,section}=planHumanTopicCreation(request,{id,sectionId,at});topic.identity.nameToken=nameIdentity.token;
 let revisionSequence=before.revision?.value||0,thoughtSequence=before.sequence?.value||0;
 const history=[];for(const data of [{kind:'topic',entityId:id,before:null,after:clone(topic),fieldMask:['name']},{kind:'section',entityId:sectionId,documentId:id,before:null,after:clone(section),fieldMask:['title','rank']}]){
  const p=planJournalRevision({...data,actor:'user',reason:'baseline',important:true,operationId:request.operationId,sourceRecordIds:[]},null,allocation.clock()),sequence=++revisionSequence,historyId=allocation.uuid();history.push({...p.row,id:historyId,sequence,listKey:[p.entityKey,sequence],documentList:[p.row.documentId,sequence]});allocation.clock(); // existing prune invocation, even an empty new entity history
 }
 topic.searchVersion=ownerVersion('topic',topic);Object.assign(topic,planHumanTopicTouch(topic,{at:allocation.clock(),sequence:++thoughtSequence}));section.searchVersion=ownerVersion('section',section);
 const result={id,sectionId,revision:0},operationReceipt={id:request.operationId,namespace:'thought-library',schemaVersion:1,ownerId:id,operationSequence:++thoughtSequence,createdAt:allocation.clock(),digest:requestDigest,result};
 return {topic,section,history,result,operationReceipt,revisionSequence,thoughtSequence};
}
export async function prepareHumanTopicPlan(store,core,request,entry){
 keys(request,['name','operationId'],['name','operationId']);if(typeof request.name!=='string'||!request.name.trim()||request.name.length>300||!idOK(request.operationId)||request.operationId.length<8)fail('BNS_HUMAN_REQUEST');
 if(!store.libraryDocumentMode||!entry)fail('BNS_HUMAN_UNSUPPORTED');
 const nameIdentity=await humanPlanName(store,entry,request.name),before=humanFutureRead(entry,store,core,'topic',request,nameIdentity)??await store.run(()=>core.transaction(false,async t=>{await assertTopicIdentityBase(t,nameIdentity);return {...await base(store,core,t),registry:await t.get('meta','personalTopicName:'+nameIdentity.token)??null,receipt:await t.get('operationReceipts',request.operationId)??null};}));
 const {registry,receipt,...cut}=before;if(!equal(cut,entry)||cut.library?.sealed)fail('BNS_HUMAN_CHANGED');
 const requestDigest=await hashText(JSON.stringify(request));if(receipt){if(receipt.digest!==requestDigest)fail('BNS_HUMAN_OPERATION_COLLISION');return {duplicate:true,result:clone(receipt.result)};}
 const allocation=prepareHumanAllocation(store,entry),computed=computeHumanTopicState(request,before,nameIdentity,requestDigest,allocation),{topic,section,history,result,operationReceipt,revisionSequence,thoughtSequence}=computed;
 const collision=humanFutureCollision(entry,topic,section,history)??await store.run(()=>core.transaction(false,async t=>({index:await t.get('meta','thought-read-index:v1:topic:'+topic.id),topic:await t.get('topics',topic.id),section:await t.get('sections',section.id),history:await Promise.all(history.map(r=>t.get('revisions',r.id)))})));
 if(collision.index||collision.topic||collision.section||collision.history.some(Boolean))fail('BNS_HUMAN_ID_COLLISION');
 const cap=Object.freeze({});plans.set(cap,{kind:'topic',store,core,entry:clone(entry),before,request:clone(request),nameIdentity,allocation:allocation.seal(),events:allocation.events(),topic,section,touchedIndices:[],history,result,operationReceipt,revisionSequence,thoughtSequence});return cap;
}
export function humanTopicPlan(cap){const p=plans.get(cap);if(p?.kind!=='topic')fail('BNS_HUMAN_PLAN_REQUIRED');return {topic:clone(p.topic),section:clone(p.section),history:clone(p.history),result:clone(p.result),operationReceipt:clone(p.operationReceipt),events:clone(p.events)};}
export async function requireHumanTopicPlan(t,cap,store,core){const p=plans.get(cap);if(p?.kind!=='topic'||p.store!==store||p.core!==core)fail('BNS_HUMAN_PLAN_REQUIRED');if(!equal(await base(store,core,t),p.entry))fail('BNS_HUMAN_CHANGED');await assertTopicIdentityBase(t,p.nameIdentity);if(!equal(await t.get('meta','personalTopicName:'+p.nameIdentity.token)??null,p.before.registry)||await t.get('operationReceipts',p.request.operationId)||await t.get('topics',p.topic.id)||await t.get('meta','thought-read-index:v1:topic:'+p.topic.id)||await t.get('sections',p.section.id))fail('BNS_HUMAN_CHANGED');for(const h of p.history)if(await t.get('revisions',h.id))fail('BNS_HUMAN_CHANGED');return p.allocation;}

function computeHumanEntryState(request,before,requestDigest,exactSignature,allocation){
 const id=allocation.uuid(),at=allocation.clock();let thoughtSequence=before.sequence?.value||0,revisionSequence=before.revision?.value||0;
 const row=planHumanEntryCreation(request,{id,at,sequence:++thoughtSequence,exactSignature,evidence:[],nonContext:[]});allocation.uuid(); // actual generation ID is allocated even with no provenance rows
 const snap=entrySnapshot(row),p=planJournalRevision({kind:'library_entry',entityId:id,before:snap,after:snap,fieldMask:ENTRY_FIELDS,actor:'user',reason:'baseline',important:true,operationId:request.operationId,baseRevision:0,afterRevision:0,sourceRecordIds:[]},null,allocation.clock()),sequence=++revisionSequence,historyId=allocation.uuid(),history=[{...p.row,id:historyId,sequence,listKey:[p.entityKey,sequence],documentList:[p.row.documentId,sequence]}];allocation.clock();
 row.searchVersion=ownerVersion('entry',row);const result={id,revision:row.revision},operationReceipt={id:request.operationId,namespace:'thought-library',schemaVersion:1,ownerId:id,operationSequence:++thoughtSequence,createdAt:allocation.clock(),digest:requestDigest,result};
 return {row,history,result,operationReceipt,revisionSequence,thoughtSequence};
}
export async function prepareHumanEntryPlan(store,core,request,entry){
 keys(request,['operationId','actor','title','body','note','type','formation','evidence'],['operationId','actor','body','type','formation','evidence']);
 validateFields({body:request.body,title:request.title??'',note:request.note??'',type:request.type,formation:request.formation});
 if(!idOK(request.operationId)||request.operationId.length<8)fail('BNS_HUMAN_REQUEST');
 if(request.actor!=='user'||request.formation!=='explicit'||!Array.isArray(request.evidence)||request.evidence.length||!store.libraryDocumentMode||!entry)fail('BNS_HUMAN_UNSUPPORTED');
 const before=humanFutureRead(entry,store,core,'entry',request)??await store.run(()=>core.transaction(false,async t=>({...await base(store,core,t),receipt:await t.get('operationReceipts',request.operationId)??null}))),{receipt,...cut}=before;
 if(!equal(cut,entry)||cut.library?.sealed)fail('BNS_HUMAN_CHANGED');const requestDigest=await hashText(JSON.stringify(request));if(receipt){if(receipt.digest!==requestDigest)fail('BNS_HUMAN_OPERATION_COLLISION');return {duplicate:true,result:clone(receipt.result)};}
 const exactSignature=await keyedHash(before.secret,['body',request.type,request.body]),allocation=prepareHumanAllocation(store,entry),{row,history,result,operationReceipt,revisionSequence,thoughtSequence}=computeHumanEntryState(request,before,requestDigest,exactSignature,allocation);
 const cap=Object.freeze({});plans.set(cap,{kind:'entry',store,core,entry:clone(entry),before,request:clone(request),allocation:allocation.seal(),events:allocation.events(),row,history,result,operationReceipt,revisionSequence,thoughtSequence});return cap;
}
export function humanEntryPlan(cap){const p=plans.get(cap);if(p?.kind!=='entry')fail('BNS_HUMAN_PLAN_REQUIRED');return {entry:clone(p.row),history:clone(p.history),result:clone(p.result),operationReceipt:clone(p.operationReceipt),events:clone(p.events)};}
export async function requireHumanEntryPlan(t,cap,store,core){const p=plans.get(cap);if(p?.kind!=='entry'||p.store!==store||p.core!==core)fail('BNS_HUMAN_PLAN_REQUIRED');if(!equal(await base(store,core,t),p.entry)||await t.get('operationReceipts',p.request.operationId)||await t.get('thoughts',p.row.id))fail('BNS_HUMAN_CHANGED');for(const h of p.history)if(await t.get('revisions',h.id))fail('BNS_HUMAN_CHANGED');return p.allocation;}

async function editReadSet(t,id){
 const history=await t.rangePage('revisions','byList',prefix(['library_entry:'+id]),null,129);if(history.next||history.rows.length>128)fail('BNS_HUMAN_HISTORY_LIMIT');
 const placementRows=await boundedRows(t,'placements','byEntry',prefix([id])),topics=[];for(const topicId of [...new Set(placementRows.map(p=>p.topicId))])topics.push({row:await t.get('topics',topicId)??null,index:await t.get('meta','thought-read-index:v1:topic:'+topicId)??null});
 return {row:await t.get('thoughts',id)??null,history:history.rows.map(x=>x.value),placements:placementRows.length,placementRows,topics,epoch:(await t.get('meta','thought-epoch'))?.value||0,provenance:await t.count('provenance','byOwner',prefix(['entry',id])),dependencies:await t.count('dependencies','byTarget',prefix(['entry',id]))};
}
// Original named-owner computation only; validated typed reads and allocation
// come from prepare. This function is not permission or a transaction capability.
export function computeHumanEntryEditState(request,before,entry,requestDigest,exactSignature,allocation){
 const old=before.read.row,at=allocation.clock(),fieldPlan=planHumanEntryFields(old,request,{at});let thoughtSequence=entry.sequence?.value||0,revisionSequence=entry.revision?.value||0,row=fieldPlan.row,history=clone(before.read.history);
 if(fieldPlan.fields.length){
  row=finishHumanEntryFields(row,fieldPlan.fields,{at,sequence:++thoughtSequence,exactSignature});const data={kind:'library_entry',entityId:row.id,before:entrySnapshot(old),after:entrySnapshot(row),fieldMask:fieldPlan.fields,actor:'user',reason:'edit',important:false,operationId:request.operationId,baseRevision:request.expectedRevision,afterRevision:row.revision,sourceRecordIds:[]},p=planJournalRevision(data,history.at(-1)??null,allocation.clock());
  if(p.coalesced)history[history.length-1]=p.row;else{const sequence=++revisionSequence,h={...p.row,id:allocation.uuid(),sequence,listKey:[p.entityKey,sequence],documentList:[p.row.documentId,sequence]};history.push(h);const cutoff=Date.parse(allocation.clock())-REVISION_POLICY.days*86400000;let important=0;for(const item of [...history].reverse()){if(item.important)important++;if(revisionShouldPrune(item,cutoff,important))fail('BNS_HUMAN_HISTORY_RETIREMENT_UNAVAILABLE');}}
 }
 row.searchVersion=ownerVersion('entry',row);const states=new Map(before.read.topics.map(x=>[x.row.id,{row:clone(x.row),index:clone(x.index)}])),touched=new Set();for(const edge of before.read.placementRows){const state=states.get(edge.topicId);if(state.row.activeLayoutGeneration===edge.layoutGeneration){Object.assign(state,reserveTouch(state.row,state.index,before.read.epoch,allocation,++thoughtSequence));touched.add(edge.topicId);}}const touchedTopics=[...touched].map(id=>states.get(id).row);const result={id:row.id,revision:row.revision},operationReceipt={id:request.operationId,namespace:'thought-library',schemaVersion:1,ownerId:row.id,operationSequence:++thoughtSequence,createdAt:allocation.clock(),digest:requestDigest,result};
 return {row,touchedTopics,touchedIndices:[...touched].map(id=>({id,index:clone(states.get(id).index)})),history,result,operationReceipt,revisionSequence,thoughtSequence};
}
export async function prepareHumanEntryEditPlan(store,core,request,entry){
 keys(request,['id','operationId','expectedRevision','changes','actor','expectedFieldRevisions'],['id','operationId','expectedRevision','changes']);if(!idOK(request.id)||!idOK(request.operationId)||request.operationId.length<8||!revisionOK(request.expectedRevision)||request.actor&&request.actor!=='user')fail('BNS_HUMAN_REQUEST');validateFields(request.changes);
 if(request.expectedFieldRevisions!==undefined){keys(request.expectedFieldRevisions,ENTRY_FIELDS);for(const f of Object.keys(request.changes))if(!revisionOK(request.expectedFieldRevisions[f]))fail('BNS_HUMAN_REQUEST');}
 const before=humanFutureRead(entry,store,core,'entry-edit',request)??await store.run(()=>core.transaction(false,async t=>({base:await base(store,core,t),read:await editReadSet(t,request.id),receipt:await t.get('operationReceipts',request.operationId)??null})));
 if(!entry||!equal(before.base,entry)||before.base.library?.sealed)fail('BNS_HUMAN_CHANGED');const requestDigest=await hashText(JSON.stringify(request));if(before.receipt){if(before.receipt.digest!==requestDigest)fail('BNS_HUMAN_OPERATION_COLLISION');return {duplicate:true,result:clone(before.receipt.result)};}
 const old=before.read.row;if(!old||old.storageSchema!==2||old.bodyBinding!=='thought'||old.provenanceType!=='user_created'||old.lifecycle!=='active'||old.sourceRecordIds?.length||before.read.provenance||before.read.dependencies||before.read.topics.some(x=>!x.row||x.row.createdBy!=='user'||x.row.sourceRecordIds?.length||x.row.redirectTo))fail('BNS_HUMAN_UNSUPPORTED');
 if(request.expectedFieldRevisions?Object.keys(request.changes).some(f=>old.fieldRevisions[f]!==request.expectedFieldRevisions[f]):old.revision!==request.expectedRevision)return {conflict:true};
 const exactSignature=await keyedHash(before.base.secret,['body',request.changes.type??old.type,request.changes.body??old.thoughtText]),allocation=prepareHumanAllocation(store,entry),computed=computeHumanEntryEditState(request,before,entry,requestDigest,exactSignature,allocation),{row,touchedTopics,touchedIndices,history,result,operationReceipt,revisionSequence,thoughtSequence}=computed;
 const cap=Object.freeze({});plans.set(cap,{kind:'entry-edit',store,core,entry:clone(entry),before,request:clone(request),allocation:allocation.seal(),events:allocation.events(),row,touchedTopics,touchedIndices,history,result,operationReceipt,revisionSequence,thoughtSequence});return cap;
}
export function humanEntryEditPlan(cap){const p=plans.get(cap);if(p?.kind!=='entry-edit')fail('BNS_HUMAN_PLAN_REQUIRED');return {entry:clone(p.row),topics:clone(p.touchedTopics),history:clone(p.history),result:clone(p.result),operationReceipt:clone(p.operationReceipt),events:clone(p.events)};}
export async function requireHumanEntryEditPlan(t,cap,store,core){const p=plans.get(cap);if(p?.kind!=='entry-edit'||p.store!==store||p.core!==core)fail('BNS_HUMAN_PLAN_REQUIRED');if(!equal(await base(store,core,t),p.entry)||!equal(await editReadSet(t,p.row.id),p.before.read)||await t.get('operationReceipts',p.request.operationId))fail('BNS_HUMAN_CHANGED');return p.allocation;}

// The only execution entry accepts the private, revalidated named plan. The
// ordinary public method and its original transaction/index hooks do the write;
// callers cannot supply a reducer, transaction or before/after callback.
const executions=new WeakMap(),completedPlans=new WeakSet();
export async function executeHumanPlan(cap){const p=plans.get(cap);if(!p)fail('BNS_HUMAN_PLAN_REQUIRED');if(completedPlans.has(cap))fail('BNS_HUMAN_CHANGED');const request=clone(p.request);executions.set(request,{cap,p,allocation:null});try{const result=await (p.kind==='topic'?p.store.createTopic(request):p.kind==='topic-edit'?(p.renameOnly?p.store.renameTopic(request):p.store.editTopic(request)):p.kind==='entry'?p.store.createEntry(request):p.kind==='entry-remove'?p.store.removeEntry(request):p.kind==='entry-restore'?p.store.restoreEntry(request):p.kind==='section'?p.store.createSection(request):p.kind==='section-edit'?editSection(p.store,request):p.kind==='placement'?p.store.placeEntry(request):p.kind==='keep'?keepTopicIdentitiesSeparate(p.store,request):p.kind==='fixed'?p.store.fixMembershipSet(request):p.kind==='move'?p.store.moveMembership(request):p.kind==='topic-lifecycle'?changeTopicContainer(p.store,request,p.restore):p.store.editEntry(request));completedPlans.add(cap);return result;}finally{executions.delete(request);}}
export async function beginHumanOperation(store,t,request){const x=executions.get(request);if(!x)return;const {p,cap}=x;if(p.store!==store)fail('BNS_HUMAN_PLAN_REQUIRED');const requirePlan=p.kind==='topic'?requireHumanTopicPlan:p.kind==='topic-edit'?requireHumanTopicEditPlan:p.kind==='entry'?requireHumanEntryPlan:p.kind==='entry-remove'||p.kind==='entry-restore'?requireHumanEntryLifecyclePlan:p.kind==='section'?requireHumanSectionPlan:p.kind==='section-edit'?requireHumanSectionEditPlan:p.kind==='placement'?requireHumanPlacementPlan:p.kind==='keep'?requireHumanKeepPlan:p.kind==='fixed'?requireHumanFixedPlan:p.kind==='move'?requireHumanMovePlan:p.kind==='topic-lifecycle'?requireHumanTopicLifecyclePlan:requireHumanEntryEditPlan;x.allocation=await requirePlan(t,cap,store,p.core);beginHumanAllocation(t,x.allocation);}
export async function finishHumanOperation(store,t,request,result){const x=executions.get(request);if(!x)return;const p=x.p;if(p.store!==store||!equal(result,p.result))fail('BNS_HUMAN_PLAN_CHANGED');if(p.kind==='keep'){if(!equal(await t.get('meta',p.pair.id)??null,p.pair)||!equal(await base(store,p.core,t),p.entry))fail('BNS_HUMAN_PLAN_CHANGED');finishHumanAllocation(t,x.allocation);return;}
 const row=await t.get(p.kind==='topic'||p.kind==='topic-edit'||p.kind==='section'||p.kind==='section-edit'||p.kind==='topic-lifecycle'?'topics':'thoughts',p.kind==='topic'||p.kind==='topic-edit'||p.kind==='section'||p.kind==='section-edit'||p.kind==='topic-lifecycle'?p.topic.id:p.row.id);if(!equal(row,p.kind==='topic'||p.kind==='topic-edit'||p.kind==='section'||p.kind==='section-edit'||p.kind==='topic-lifecycle'?p.topic:p.row))fail('BNS_HUMAN_PLAN_CHANGED');if((p.kind==='topic'||p.kind==='section'||p.kind==='section-edit')&&!equal(await t.get('sections',p.section.id),p.section))fail('BNS_HUMAN_PLAN_CHANGED');
 for(const topic of p.touchedTopics||[])if(!equal(await t.get('topics',topic.id),topic))fail('BNS_HUMAN_PLAN_CHANGED');if(p.placement&&!equal(await t.get('placements',p.placement.id),p.placement))fail('BNS_HUMAN_PLAN_CHANGED');
 for(const row of p.entries||[])if(!equal(await t.get('thoughts',row.id),row))fail('BNS_HUMAN_PLAN_CHANGED');
 for(const placement of p.placements||[])if(!equal(await t.get('placements',placement.id),placement))fail('BNS_HUMAN_PLAN_CHANGED');
 for(const suppression of p.suppressions||[])if(!equal(await t.get('thoughtSuppressions',suppression.id),suppression))fail('BNS_HUMAN_PLAN_CHANGED');
 for(const item of p.touchedIndices||[])if(!equal(await t.get('meta','thought-read-index:v1:topic:'+item.id)??null,item.index))fail('BNS_HUMAN_PLAN_CHANGED');
 for(const h of p.history)if(!equal(await t.get('revisions',h.id),h))fail('BNS_HUMAN_PLAN_CHANGED');if(!equal(await t.get('operationReceipts',request.operationId),p.operationReceipt))fail('BNS_HUMAN_PLAN_CHANGED');
 if(!equal(await base(store,p.core,t),{...p.entry,sequence:{id:'thought-sequence',value:p.thoughtSequence},revision:{id:'revision-sequence',value:p.revisionSequence}}))fail('BNS_HUMAN_CHANGED');finishHumanAllocation(t,x.allocation);
}
export function releaseHumanOperation(t,request){if(executions.has(request))releaseHumanAllocation(t);}

export function humanOperationError(request,error){return executions.has(request)&&error?.code?.startsWith('BNS_')?new ArchiveError(error.code):error;}

async function lifecycleReadSet(t,id){const read=await editReadSet(t,id),page=await t.rangePage('thoughtSuppressions','byEntry',id,null,129);if(page.next||page.rows.length>128)fail('BNS_HUMAN_HISTORY_LIMIT');return {...read,suppressions:page.rows.map(x=>x.value)};}
export async function prepareHumanEntryLifecyclePlan(store,core,request,entry,{restore=false}={}){
 keys(request,['id','operationId','expectedRevision'],['id','operationId','expectedRevision']);if(!idOK(request.id)||!idOK(request.operationId)||request.operationId.length<8||!revisionOK(request.expectedRevision))fail('BNS_HUMAN_REQUEST');
 const before=humanFutureRead(entry,store,core,'entry-remove',request)??await store.run(()=>core.transaction(false,async t=>({base:await base(store,core,t),read:await lifecycleReadSet(t,request.id),receipt:await t.get('operationReceipts',request.operationId)??null})));
 if(!entry||!equal(before.base,entry)||before.base.library?.sealed)fail('BNS_HUMAN_CHANGED');const requestDigest=await hashText(JSON.stringify(request));if(before.receipt){if(before.receipt.digest!==requestDigest)fail('BNS_HUMAN_OPERATION_COLLISION');return {duplicate:true,result:clone(before.receipt.result)};}
 const old=before.read.row;if(!old||old.storageSchema!==2||old.bodyBinding!=='thought'||old.provenanceType!=='user_created'||old.lifecycle!==(restore?'removed':'active')||old.sourceRecordIds?.length||before.read.provenance||before.read.dependencies||before.read.topics.some(x=>!x.row||x.row.createdBy!=='user'||x.row.sourceRecordIds?.length||x.row.redirectTo))fail('BNS_HUMAN_UNSUPPORTED');if(old.revision!==request.expectedRevision)return {conflict:true};
 const allocation=prepareHumanAllocation(store,entry);let row,suppressions;
 if(restore){row=planHumanEntryRestoration(old,request,ENTRY_FIELDS.map(()=>allocation.clock()));suppressions=before.read.suppressions.map(s=>({...clone(s),status:'restored'}));}else{const p=planHumanEntryRemoval(old,request,[],{suppressionId:allocation.uuid(),removedAt:allocation.clock()});row=p.entry;suppressions=[...clone(before.read.suppressions),p.suppression];}
 let thoughtSequence=entry.sequence?.value||0,revisionSequence=entry.revision?.value||0;const data={kind:'library_entry',entityId:row.id,before:entrySnapshot(old),after:entrySnapshot(row),fieldMask:['lifecycle'],actor:'user',reason:restore?'restore':'remove',important:true,operationId:request.operationId,baseRevision:request.expectedRevision,afterRevision:row.revision,sourceRecordIds:[]},p=planJournalRevision(data,null,allocation.clock()),sequence=++revisionSequence,h={...p.row,id:allocation.uuid(),sequence,listKey:[p.entityKey,sequence],documentList:[p.row.documentId,sequence]},history=[...clone(before.read.history),h],cutoff=Date.parse(allocation.clock())-REVISION_POLICY.days*86400000;let important=0;for(const item of [...history].reverse()){if(item.important)important++;if(revisionShouldPrune(item,cutoff,important))fail('BNS_HUMAN_HISTORY_RETIREMENT_UNAVAILABLE');}
 row.searchVersion=ownerVersion('entry',row);const states=new Map(before.read.topics.map(x=>[x.row.id,{row:clone(x.row),index:clone(x.index)}])),touched=new Set();for(const edge of before.read.placementRows){const state=states.get(edge.topicId);if(state.row.activeLayoutGeneration===edge.layoutGeneration){Object.assign(state,reserveTouch(state.row,state.index,before.read.epoch,allocation,++thoughtSequence));touched.add(edge.topicId);}}const touchedTopics=[...touched].map(id=>states.get(id).row);const result={id:row.id,revision:row.revision},operationReceipt={id:request.operationId,namespace:'thought-library',schemaVersion:1,ownerId:row.id,operationSequence:++thoughtSequence,createdAt:allocation.clock(),digest:requestDigest,result},cap=Object.freeze({});plans.set(cap,{kind:restore?'entry-restore':'entry-remove',store,core,entry:clone(entry),before,request:clone(request),allocation:allocation.seal(),events:allocation.events(),row,touchedTopics,touchedIndices:[...touched].map(id=>({id,index:clone(states.get(id).index)})),suppressions,history,result,operationReceipt,revisionSequence,thoughtSequence});return cap;
}
export function humanEntryLifecyclePlan(cap){const p=plans.get(cap);if(!['entry-remove','entry-restore'].includes(p?.kind))fail('BNS_HUMAN_PLAN_REQUIRED');return {entry:clone(p.row),topics:clone(p.touchedTopics),suppressions:clone(p.suppressions),history:clone(p.history),result:clone(p.result),operationReceipt:clone(p.operationReceipt),events:clone(p.events)};}
export async function requireHumanEntryLifecyclePlan(t,cap,store,core){const p=plans.get(cap);if(!['entry-remove','entry-restore'].includes(p?.kind)||p.store!==store||p.core!==core)fail('BNS_HUMAN_PLAN_REQUIRED');if(!equal(await base(store,core,t),p.entry)||!equal(await lifecycleReadSet(t,p.row.id),p.before.read)||await t.get('operationReceipts',p.request.operationId))fail('BNS_HUMAN_CHANGED');for(const s of p.suppressions)if(!p.before.read.suppressions.some(x=>x.id===s.id)&&await t.get('thoughtSuppressions',s.id))fail('BNS_HUMAN_CHANGED');for(const h of p.history)if(!p.before.read.history.some(x=>x.id===h.id)&&await t.get('revisions',h.id))fail('BNS_HUMAN_CHANGED');return p.allocation;}

function reserveTouch(topic,index,epoch,allocation,sequence){
 const row=planHumanTopicTouch(topic,{at:allocation.clock(),sequence}),slot=allocation.indexGenerationSlot();try{const planned=planThoughtTopicInvalidation(index,row,epoch,{allocateGeneration:()=>slot.allocate()});return {row,index:planned.meta};}finally{slot.close();}
}
async function sectionReadSet(t,topicId){const topic=await t.get('topics',topicId)??null;return {topic,defaultSection:topic?.defaultSectionId?await t.get('sections',JSON.stringify([topicId,topic.activeLayoutGeneration,topic.defaultSectionId]))??null:null,index:await t.get('meta','thought-read-index:v1:topic:'+topicId)??null,epoch:(await t.get('meta','thought-epoch'))?.value||0,last:topic?await t.edge('sections','byTopicOrder',prefix([topicId,topic.activeLayoutGeneration,0]),'prev')??null:null};}
export async function prepareHumanSectionPlan(store,core,request,entry){
 keys(request,['topicId','expectedTopicRevision','title','rank','operationId'],['topicId','expectedTopicRevision','title','operationId']);if(!idOK(request.topicId)||!idOK(request.operationId)||request.operationId.length<8||!revisionOK(request.expectedTopicRevision)||typeof request.title!=='string'||request.title.length>300)fail('BNS_HUMAN_REQUEST');const requestedRank=request.rank===undefined?null:normalizeRank(request.rank);
 const before=humanFutureRead(entry,store,core,'section',request)??await store.run(()=>core.transaction(false,async t=>({base:await base(store,core,t),read:await sectionReadSet(t,request.topicId),receipt:await t.get('operationReceipts',request.operationId)??null})));
 if(!entry||!equal(before.base,entry)||before.base.library?.sealed)fail('BNS_HUMAN_CHANGED');const requestDigest=await hashText(JSON.stringify(request));if(before.receipt){if(before.receipt.digest!==requestDigest)fail('BNS_HUMAN_OPERATION_COLLISION');return {duplicate:true,result:clone(before.receipt.result)};}
 let topic=clone(before.read.topic);if(!topic||topic.createdBy!=='user'||topic.lifecycle!=='active'||topic.redirectTo||topic.layoutJobId||topic.sourceRecordIds?.length||topic.identity?.version!==1||topic.identity?.legacy!==false||topic.identity?.origin!=='user'||topic.identity?.scope!==null||before.read.defaultSection?.isDefault!==true||before.read.defaultSection?.lifecycle!=='active'||before.read.defaultSection?.redirectTo||before.read.defaultSection?.sourceRecordIds?.length||before.read.defaultSection?.topicId!==topic.id||before.read.defaultSection?.layoutGeneration!==topic.activeLayoutGeneration||before.read.defaultSection?.sectionId!==topic.defaultSectionId)fail('BNS_HUMAN_UNSUPPORTED');if(topic.organizationRevision!==request.expectedTopicRevision)return {conflict:true};
 const allocation=prepareHumanAllocation(store,entry),rank=humanSectionRank(before.read.last,requestedRank),sectionId=allocation.uuid(),section=planHumanSectionCreation(request,topic,{sectionId,rank,at:allocation.clock()});topic.organizationRevision++;
 let thoughtSequence=entry.sequence?.value||0,revisionSequence=entry.revision?.value||0;const p=planJournalRevision({kind:'section',entityId:sectionId,documentId:topic.id,before:null,after:clone(section),fieldMask:['title','rank'],actor:'user',reason:'baseline',important:true,operationId:request.operationId,sourceRecordIds:[]},null,allocation.clock()),sequence=++revisionSequence,history=[{...p.row,id:allocation.uuid(),sequence,listKey:[p.entityKey,sequence],documentList:[p.row.documentId,sequence]}];allocation.clock();const touchedState=reserveTouch(topic,before.read.index,before.read.epoch,allocation,++thoughtSequence);topic=touchedState.row;section.searchVersion=ownerVersion('section',section);
 const result={id:section.id,sectionId,revision:0,topicRevision:topic.organizationRevision},operationReceipt={id:request.operationId,namespace:'thought-library',schemaVersion:1,ownerId:section.id,operationSequence:++thoughtSequence,createdAt:allocation.clock(),digest:requestDigest,result},cap=Object.freeze({});plans.set(cap,{kind:'section',store,core,entry:clone(entry),before,request:clone(request),allocation:allocation.seal(),events:allocation.events(),topic,section,touchedIndices:[{id:topic.id,index:clone(touchedState.index)}],history,result,operationReceipt,revisionSequence,thoughtSequence});return cap;
}
export function humanSectionPlan(cap){const p=plans.get(cap);if(p?.kind!=='section')fail('BNS_HUMAN_PLAN_REQUIRED');return {topic:clone(p.topic),section:clone(p.section),history:clone(p.history),result:clone(p.result),operationReceipt:clone(p.operationReceipt),events:clone(p.events)};}
export async function requireHumanSectionPlan(t,cap,store,core){const p=plans.get(cap);if(p?.kind!=='section'||p.store!==store||p.core!==core)fail('BNS_HUMAN_PLAN_REQUIRED');if(!equal(await base(store,core,t),p.entry)||!equal(await sectionReadSet(t,p.topic.id),p.before.read)||await t.get('operationReceipts',p.request.operationId)||await t.get('sections',p.section.id))fail('BNS_HUMAN_CHANGED');for(const h of p.history)if(await t.get('revisions',h.id))fail('BNS_HUMAN_CHANGED');return p.allocation;}

async function boundedRows(t,store,index,range){const page=await t.rangePage(store,index,range,null,129);if(page.next||page.rows.length>128)fail('BNS_HUMAN_GRAPH_LIMIT');return page.rows.map(x=>x.value);}
async function placementReadSet(t,r){
 const entry=await t.get('thoughts',r.entryId)??null,placements=await boundedRows(t,'placements','byEntry',prefix([r.entryId])),topics=[];
 for(const id of [...new Set([...placements.map(p=>p.topicId),r.topicId])])topics.push({row:await t.get('topics',id)??null,index:await t.get('meta','thought-read-index:v1:topic:'+id)??null});
 const topic=topics.find(x=>x.row?.id===r.topicId)?.row??null,old=topic?await t.get('placements',JSON.stringify([r.topicId,topic.activeLayoutGeneration,r.entryId]))??null:null,section=topic?await t.get('sections',JSON.stringify([topic.id,topic.activeLayoutGeneration,r.sectionId||topic.defaultSectionId]))??null:null;
 const last=topic&&section&&r.rank===undefined&&(!old||old.sectionId!==section.sectionId)?await t.edge('placements','bySectionOrder',prefix([topic.id,topic.activeLayoutGeneration,section.sectionId,0]),'prev')??null:null,id=topic?JSON.stringify([r.topicId,topic.activeLayoutGeneration,r.entryId]):null,history=id?await boundedRows(t,'revisions','byList',prefix(['placement:'+id])):[];
 const memory=[];for(const kind of ['topic','section']){let after=null,rows=[];do{const page=await t.primaryRangePage('meta',{prefix:'memory:'+kind+':',after,limit:Math.min(100,129-rows.length)});rows.push(...page.rows.map(x=>x.value));if(rows.length>128)fail('BNS_HUMAN_GRAPH_LIMIT');after=page.next;}while(after);memory.push(...rows);}
 return {entry,placements,topics,topic,old,section,last,history,memory,epoch:(await t.get('meta','thought-epoch'))?.value||0,provenance:await t.count('provenance','byOwner',prefix(['entry',r.entryId])),dependencies:await t.count('dependencies','byTarget',prefix(['entry',r.entryId])),saved:r.restoreRevisionId?await t.get('revisions',r.restoreRevisionId)??null:null};
}
export async function prepareHumanPlacementPlan(store,core,request,entry){
 keys(request,['entryId','topicId','sectionId','rank','operationId','expectedEntryRevision','expectedTopicRevision','expectedPlacementRevision','remove','restoreRevisionId'],['entryId','topicId','operationId','expectedEntryRevision','expectedTopicRevision']);if(!idOK(request.entryId)||!idOK(request.topicId)||!idOK(request.operationId)||request.operationId.length<8||!revisionOK(request.expectedEntryRevision)||!revisionOK(request.expectedTopicRevision)||request.remove!==undefined&&typeof request.remove!=='boolean')fail('BNS_HUMAN_REQUEST');
 const before=humanFutureRead(entry,store,core,'placement',request)??await store.run(()=>core.transaction(false,async t=>({base:await base(store,core,t),read:await placementReadSet(t,request),receipt:await t.get('operationReceipts',request.operationId)??null})));
 if(!entry||!equal(before.base,entry)||before.base.library?.sealed)fail('BNS_HUMAN_CHANGED');const requestDigest=await hashText(JSON.stringify(request));if(before.receipt){if(before.receipt.digest!==requestDigest)fail('BNS_HUMAN_OPERATION_COLLISION');return {duplicate:true,result:clone(before.receipt.result)};}
 const read=before.read,e=read.entry,topic=read.topic,old=read.old,section=read.section;
 if(!e||e.storageSchema!==2||e.bodyBinding!=='thought'||e.provenanceType!=='user_created'||e.lifecycle!=='active'||e.sourceRecordIds?.length||read.provenance||read.dependencies||!topic||topic.lifecycle!=='active'||topic.redirectTo||topic.layoutJobId||read.topics.some(x=>!x.row||x.row.createdBy!=='user'||x.row.sourceRecordIds?.length||x.row.redirectTo)||!section||section.lifecycle!=='active'||section.redirectTo||section.sourceRecordIds?.length)fail('BNS_HUMAN_UNSUPPORTED');
 if(e.revision!==request.expectedEntryRevision||topic.organizationRevision!==request.expectedTopicRevision||old&&old.revision!==request.expectedPlacementRevision&&!(old.lifecycle==='removed'&&request.expectedPlacementRevision===undefined))return {conflict:true};
 const id=JSON.stringify([topic.id,topic.activeLayoutGeneration,e.id]);if(request.restoreRevisionId&&(!read.saved||read.saved.entityId!==id||read.saved.kind!=='placement'||read.saved.sourceRecordIds?.length))fail('BNS_HUMAN_UNSUPPORTED');
 const rank=humanPlacementRank(read.last,old,request.rank),placement=planHumanPlacementRow(topic,e,old,section,rank,request.remove);
 if(!futureEntries.has(entry))await store.run(()=>core.transaction(false,t=>assertMemoryPlacementChangeAllowed(t,topic.id,old,placement)));
 const allocation=prepareHumanAllocation(store,entry),planned=planHumanPlacement({entry:e,topic,placement},request,allocation.clock());let row=planned.entry,thoughtSequence=entry.sequence?.value||0,revisionSequence=entry.revision?.value||0;
 const p=planJournalRevision({kind:'placement',entityId:id,documentId:topic.id,before:old||null,after:placement,fieldMask:['membership','section','order'],actor:'user',reason:request.restoreRevisionId?'restore':request.remove?'remove':'place',important:true,operationId:request.operationId,sourceRecordIds:[]},null,allocation.clock()),sequence=++revisionSequence,h={...p.row,id:allocation.uuid(),sequence,listKey:[p.entityKey,sequence],documentList:[p.row.documentId,sequence]},history=[...clone(read.history),h],cutoff=Date.parse(allocation.clock())-REVISION_POLICY.days*86400000;let important=0;for(const item of [...history].reverse()){if(item.important)important++;if(revisionShouldPrune(item,cutoff,important))fail('BNS_HUMAN_HISTORY_RETIREMENT_UNAVAILABLE');}
 row.searchVersion=ownerVersion('entry',row);const states=new Map(read.topics.map(x=>[x.row.id,{row:clone(x.row),index:clone(x.index)}]));states.get(topic.id).row=planned.topic;const nextPlacements=[...read.placements.filter(p=>p.id!==id),placement].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0),touched=new Set();
 for(const edge of nextPlacements){const state=states.get(edge.topicId);if(state.row.activeLayoutGeneration===edge.layoutGeneration){Object.assign(state,reserveTouch(state.row,state.index,read.epoch,allocation,++thoughtSequence));touched.add(edge.topicId);}}
 const target=states.get(topic.id);Object.assign(target,reserveTouch(target.row,target.index,read.epoch,allocation,++thoughtSequence));touched.add(topic.id);
 const result={id:e.id,revision:row.revision,placementRevision:placement.revision,topicRevision:planned.topic.organizationRevision},operationReceipt={id:request.operationId,namespace:'thought-library',schemaVersion:1,ownerId:e.id,operationSequence:++thoughtSequence,createdAt:allocation.clock(),digest:requestDigest,result},cap=Object.freeze({});plans.set(cap,{kind:'placement',store,core,entry:clone(entry),before,request:clone(request),allocation:allocation.seal(),events:allocation.events(),row,placement,touchedTopics:[...touched].map(id=>states.get(id).row),touchedIndices:[...touched].map(id=>({id,index:clone(states.get(id).index)})),history,result,operationReceipt,revisionSequence,thoughtSequence});return cap;
}
export function humanPlacementPlan(cap){const p=plans.get(cap);if(p?.kind!=='placement')fail('BNS_HUMAN_PLAN_REQUIRED');return {entry:clone(p.row),placement:clone(p.placement),topics:clone(p.touchedTopics),history:clone(p.history),result:clone(p.result),operationReceipt:clone(p.operationReceipt),events:clone(p.events)};}
export async function requireHumanPlacementPlan(t,cap,store,core){const p=plans.get(cap);if(p?.kind!=='placement'||p.store!==store||p.core!==core)fail('BNS_HUMAN_PLAN_REQUIRED');if(!equal(await base(store,core,t),p.entry)||!equal(await placementReadSet(t,p.request),p.before.read)||await t.get('operationReceipts',p.request.operationId))fail('BNS_HUMAN_CHANGED');for(const h of p.history)if(!p.before.read.history.some(x=>x.id===h.id)&&await t.get('revisions',h.id))fail('BNS_HUMAN_CHANGED');return p.allocation;}

// A move reserves the two original placement calls in their real execution
// order. Canonical writes remain in moveMembership/placeEntryInTransaction.
async function moveReadSet(t,r){const source=await placementReadSet(t,{entryId:r.entryId,topicId:r.sourceTopicId}),targetTopic=await t.get('topics',r.targetTopicId),old=targetTopic?await t.get('placements',JSON.stringify([targetTopic.id,targetTopic.activeLayoutGeneration,r.entryId])):null,target=await placementReadSet(t,{entryId:r.entryId,topicId:r.targetTopicId,...(old?{sectionId:old.sectionId,rank:old.rank}:{})});return {source,target};}
function qualifyMoveSide(read){const e=read.entry,q=read.topic,s=read.section;if(!e||e.storageSchema!==2||e.bodyBinding!=='thought'||e.provenanceType!=='user_created'||e.lifecycle!=='active'||e.sourceRecordIds?.length||read.provenance||read.dependencies||!q||q.createdBy!=='user'||q.lifecycle!=='active'||q.redirectTo||q.layoutJobId||q.sourceRecordIds?.length||!s||s.lifecycle!=='active'||s.redirectTo||s.sourceRecordIds?.length||read.topics.some(x=>!x.row||x.row.createdBy!=='user'||x.row.sourceRecordIds?.length||x.row.redirectTo))fail('BNS_HUMAN_UNSUPPORTED');}
function reserveMoveSide(read,request,entry,allocation,revisionSequence){
 const rank=humanPlacementRank(read.last,read.old,request.rank),placement=planHumanPlacementRow(read.topic,entry,read.old,read.section,rank,request.remove),planned=planHumanPlacement({entry,topic:read.topic,placement},request,allocation.clock());
 const p=planJournalRevision({kind:'placement',entityId:placement.id,documentId:read.topic.id,before:read.old||null,after:placement,fieldMask:['membership','section','order'],actor:'user',reason:request.remove?'remove':'place',important:true,operationId:request.operationId,sourceRecordIds:[]},null,allocation.clock()),sequence=revisionSequence+1,h={...p.row,id:allocation.uuid(),sequence,listKey:[p.entityKey,sequence],documentList:[p.row.documentId,sequence]},history=[...clone(read.history),h],cutoff=Date.parse(allocation.clock())-REVISION_POLICY.days*86400000;let important=0;for(const item of [...history].reverse()){if(item.important)important++;if(revisionShouldPrune(item,cutoff,important))fail('BNS_HUMAN_HISTORY_RETIREMENT_UNAVAILABLE');}
 return {...planned,placement,history,revisionSequence:sequence};
}
export async function prepareHumanMovePlan(store,core,request,entry){
 keys(request,['entryId','sourceTopicId','targetTopicId','expectedEntryRevision','expectedSourceRevision','expectedTargetRevision','operationId'],['entryId','sourceTopicId','targetTopicId','expectedEntryRevision','expectedSourceRevision','expectedTargetRevision','operationId']);if(![request.entryId,request.sourceTopicId,request.targetTopicId,request.operationId].every(idOK)||request.operationId.length<8||request.sourceTopicId===request.targetTopicId||![request.expectedEntryRevision,request.expectedSourceRevision,request.expectedTargetRevision].every(revisionOK))fail('BNS_HUMAN_REQUEST');
 const before=humanFutureRead(entry,store,core,'move',request)??await store.run(()=>core.transaction(false,async t=>({base:await base(store,core,t),read:await moveReadSet(t,request),receipt:await t.get('operationReceipts',request.operationId)??null})));if(!entry||!equal(before.base,entry)||before.base.library?.sealed)fail('BNS_HUMAN_CHANGED');const requestDigest=await hashText(JSON.stringify(request));if(before.receipt){if(before.receipt.digest!==requestDigest)fail('BNS_HUMAN_OPERATION_COLLISION');return {duplicate:true,result:clone(before.receipt.result)};}
 const {source,target}=before.read;qualifyMoveSide(source);qualifyMoveSide(target);if(source.entry.revision!==request.expectedEntryRevision||source.topic.organizationRevision!==request.expectedSourceRevision||target.topic.organizationRevision!==request.expectedTargetRevision)return {conflict:true};if(source.old?.lifecycle!=='active')fail('BNS_HUMAN_UNSUPPORTED');
 const sourceRequest={entryId:request.entryId,topicId:source.topic.id,remove:true,expectedEntryRevision:source.entry.revision,expectedTopicRevision:source.topic.organizationRevision,expectedPlacementRevision:source.old.revision,operationId:request.operationId},targetRequest={entryId:request.entryId,topicId:target.topic.id,...(target.old?{sectionId:target.old.sectionId,rank:target.old.rank,expectedPlacementRevision:target.old.revision}:{}),expectedEntryRevision:source.entry.revision+1,expectedTopicRevision:target.topic.organizationRevision,operationId:request.operationId};
 const allocation=prepareHumanAllocation(store,entry),a=reserveMoveSide(source,sourceRequest,source.entry,allocation,entry.revision?.value||0),b=reserveMoveSide(target,targetRequest,a.entry,allocation,a.revisionSequence);
 if(!futureEntries.has(entry))await store.run(()=>core.transaction(false,async t=>{await assertMemoryPlacementChangeAllowed(t,source.topic.id,source.old,a.placement);await assertMemoryPlacementChangeAllowed(t,target.topic.id,target.old,b.placement);}));
 let thoughtSequence=entry.sequence?.value||0;const row=b.entry;row.searchVersion=ownerVersion('entry',row);const states=new Map([...source.topics,...target.topics].map(x=>[x.row.id,{row:clone(x.row),index:clone(x.index)}]));states.get(a.topic.id).row=a.topic;states.get(b.topic.id).row=b.topic;
 const changed=[a.placement,b.placement],nextPlacements=[...source.placements.filter(p=>!changed.some(q=>q.id===p.id)),...changed].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0),touched=new Set();for(const edge of nextPlacements){const state=states.get(edge.topicId);if(state.row.activeLayoutGeneration===edge.layoutGeneration){Object.assign(state,reserveTouch(state.row,state.index,source.epoch,allocation,++thoughtSequence));touched.add(edge.topicId);}}
 const result={id:row.id,revision:row.revision,placementRevision:b.placement.revision,topicRevision:b.topic.organizationRevision},operationReceipt={id:request.operationId,namespace:'thought-library',schemaVersion:1,ownerId:row.id,operationSequence:++thoughtSequence,createdAt:allocation.clock(),digest:requestDigest,result},cap=Object.freeze({});plans.set(cap,{kind:'move',store,core,entry:clone(entry),before,request:clone(request),allocation:allocation.seal(),events:allocation.events(),row,placements:changed,touchedTopics:[...touched].map(id=>states.get(id).row),touchedIndices:[...touched].map(id=>({id,index:clone(states.get(id).index)})),history:[...a.history,...b.history],result,operationReceipt,revisionSequence:b.revisionSequence,thoughtSequence});return cap;
}
export function humanMovePlan(cap){const p=plans.get(cap);if(p?.kind!=='move')fail('BNS_HUMAN_PLAN_REQUIRED');return {entry:clone(p.row),placements:clone(p.placements),topics:clone(p.touchedTopics),history:clone(p.history),result:clone(p.result),operationReceipt:clone(p.operationReceipt),events:clone(p.events)};}
export async function requireHumanMovePlan(t,cap,store,core){const p=plans.get(cap);if(p?.kind!=='move'||p.store!==store||p.core!==core)fail('BNS_HUMAN_PLAN_REQUIRED');if(!equal(await base(store,core,t),p.entry)||!equal(await moveReadSet(t,p.request),p.before.read)||await t.get('operationReceipts',p.request.operationId))fail('BNS_HUMAN_CHANGED');const previous=[...p.before.read.source.history,...p.before.read.target.history];for(const h of p.history)if(!previous.some(x=>x.id===h.id)&&await t.get('revisions',h.id))fail('BNS_HUMAN_CHANGED');return p.allocation;}

async function topicLifecycleReadSet(t,id,token){const topic=await t.get('topics',id)??null,placements=topic?await boundedRows(t,'placements','byTopicOrder',prefix([id,topic.activeLayoutGeneration])):[],entries=[],histories=[];for(const p of placements){entries.push({id:p.entryId,row:await t.get('thoughts',p.entryId)??null,provenance:await t.count('provenance','byOwner',prefix(['entry',p.entryId])),dependencies:await t.count('dependencies','byTarget',prefix(['entry',p.entryId]))});histories.push({id:'placement:'+p.id,rows:await boundedRows(t,'revisions','byList',prefix(['placement:'+p.id]))});}histories.push({id:'topic:'+id,rows:await boundedRows(t,'revisions','byList',prefix(['topic:'+id]))});const memory=[];for(const kind of ['topic','section']){let after=null;do{const page=await t.primaryRangePage('meta',{prefix:'memory:'+kind+':',after,limit:100});memory.push(...page.rows.map(x=>x.value));if(memory.length>128)fail('BNS_HUMAN_GRAPH_LIMIT');after=page.next;}while(after);}return {topic,placements,entries,histories,memory,index:await t.get('meta','thought-read-index:v1:topic:'+id)??null,epoch:(await t.get('meta','thought-epoch'))?.value||0,registry:await t.get('meta','personalTopicName:'+token)??null};}
function reserveImportantHistory(data,previous,allocation,sequence){const p=planJournalRevision(data,null,allocation.clock()),row={...p.row,id:allocation.uuid(),sequence,listKey:[p.entityKey,sequence],documentList:[p.row.documentId,sequence]},rows=[...clone(previous),row],cutoff=Date.parse(allocation.clock())-REVISION_POLICY.days*86400000;let important=0;for(const h of [...rows].reverse()){if(h.important)important++;if(revisionShouldPrune(h,cutoff,important))fail('BNS_HUMAN_HISTORY_RETIREMENT_UNAVAILABLE');}return rows;}
export async function prepareHumanTopicLifecyclePlan(store,core,request,entry,{restore=false}={}){
 keys(request,['id','expectedRevision','operationId'],['id','expectedRevision','operationId']);if(!idOK(request.id)||!idOK(request.operationId)||request.operationId.length<8||!revisionOK(request.expectedRevision))fail('BNS_HUMAN_REQUEST');const nameIdentity=await humanPlanIdentity(store,entry,request.id),before=humanFutureRead(entry,store,core,'topic-lifecycle',request,nameIdentity)??await store.run(()=>core.transaction(false,async t=>{await assertTopicIdentityBase(t,nameIdentity);return {base:await base(store,core,t),read:await topicLifecycleReadSet(t,request.id,nameIdentity.oldToken),receipt:await t.get('operationReceipts',request.operationId)??null};}));if(!entry||!equal(before.base,entry)||entry.library?.sealed)fail('BNS_HUMAN_CHANGED');const digest=await hashText(JSON.stringify(request));if(before.receipt){if(before.receipt.digest!==digest)fail('BNS_HUMAN_OPERATION_COLLISION');return {duplicate:true,result:clone(before.receipt.result)};}
 const read=before.read,old=read.topic;if(!old||old.createdBy!=='user'||old.redirectTo||old.layoutJobId||old.sourceRecordIds?.length||old.lifecycle!==(restore?'removed':'active')||old.identity?.version!==1||old.identity?.legacy!==false||old.identity?.origin!=='user'||old.identity?.scope!==null||old.identity.nameToken!==nameIdentity.oldToken||read.entries.some(x=>!x.row||x.row.storageSchema!==2||x.row.bodyBinding!=='thought'||x.row.provenanceType!=='user_created'||x.row.sourceRecordIds?.length||x.provenance||x.dependencies))fail('BNS_HUMAN_UNSUPPORTED');if(old.revision!==request.expectedRevision||old.revision!==nameIdentity.beforeRevision||old.name!==nameIdentity.beforeName)return {conflict:true};if(!restore&&!futureEntries.has(entry))await store.run(()=>core.transaction(false,t=>assertMemoryTopicTransitionAllowed(t,old,{nextGeneration:null})));
 const allocation=prepareHumanAllocation(store,entry),placements=[],entries=[],history=[];let revisionSequence=entry.revision?.value||0,thoughtSequence=entry.sequence?.value||0;const reason=restore?'restore':'delete';
 for(const p of read.placements){if(restore?(p.lifecycle!=='removed'||p.removedWithTopicOperationId!==old.removalOperationId):p.lifecycle!=='active')continue;const e=read.entries.find(x=>x.id===p.entryId).row,next=planHumanTopicMembership(old,p,e,request,restore).placement;placements.push(next);entries.push(planHumanTopicMembershipEntry(e,old.id,request,restore,allocation.clock()));history.push(...reserveImportantHistory({kind:'placement',entityId:p.id,documentId:old.id,before:p,after:next,fieldMask:['membership'],actor:'user',reason,important:true,operationId:request.operationId,sourceRecordIds:[]},read.histories.find(x=>x.id==='placement:'+p.id).rows,allocation,++revisionSequence));}
 let topic=planHumanTopicContainer(old,request,restore,{lifecycleAt:allocation.clock(),removedAt:restore?null:allocation.clock(),protectionAt:allocation.clock()});topic.searchVersion=ownerVersion('topic',topic);history.push(...reserveImportantHistory({kind:'topic',entityId:old.id,before:old,after:clone(topic),fieldMask:['lifecycle','organization'],actor:'user',reason,important:true,operationId:request.operationId,baseRevision:old.revision,afterRevision:topic.revision,sourceRecordIds:[]},read.histories.find(x=>x.id==='topic:'+old.id).rows,allocation,++revisionSequence));const touchedState=reserveTouch(topic,read.index,read.epoch,allocation,++thoughtSequence);topic=touchedState.row;
 const result={id:topic.id,revision:topic.revision,removed:!restore,restored:restore},operationReceipt={id:request.operationId,namespace:'thought-library',schemaVersion:1,ownerId:topic.id,operationSequence:++thoughtSequence,createdAt:allocation.clock(),digest,result},cap=Object.freeze({});plans.set(cap,{kind:'topic-lifecycle',store,core,entry:clone(entry),before,nameIdentity,restore,request:clone(request),allocation:allocation.seal(),events:allocation.events(),topic,touchedIndices:[{id:topic.id,index:clone(touchedState.index)}],placements,entries,history,result,operationReceipt,revisionSequence,thoughtSequence});return cap;
}
export function humanTopicLifecyclePlan(cap){const p=plans.get(cap);if(p?.kind!=='topic-lifecycle')fail('BNS_HUMAN_PLAN_REQUIRED');return {topic:clone(p.topic),entries:clone(p.entries),placements:clone(p.placements),history:clone(p.history),result:clone(p.result),operationReceipt:clone(p.operationReceipt),events:clone(p.events)};}
export async function requireHumanTopicLifecyclePlan(t,cap,store,core){const p=plans.get(cap);if(p?.kind!=='topic-lifecycle'||p.store!==store||p.core!==core)fail('BNS_HUMAN_PLAN_REQUIRED');await assertTopicIdentityBase(t,p.nameIdentity);if(!equal(await base(store,core,t),p.entry)||!equal(await topicLifecycleReadSet(t,p.topic.id,p.nameIdentity.oldToken),p.before.read)||await t.get('operationReceipts',p.request.operationId))fail('BNS_HUMAN_CHANGED');const prior=p.before.read.histories.flatMap(x=>x.rows);for(const h of p.history)if(!prior.some(x=>x.id===h.id)&&await t.get('revisions',h.id))fail('BNS_HUMAN_CHANGED');return p.allocation;}

async function fixedReadSet(t,id){return {...await editReadSet(t,id),intentHistory:await boundedRows(t,'revisions','byList',prefix(['membership_intent:'+id]))};}
export async function prepareHumanFixedPlan(store,core,request,entry){
 keys(request,['entryId','expectedRevision','operationId'],['entryId','expectedRevision','operationId']);if(!idOK(request.entryId)||!idOK(request.operationId)||request.operationId.length<8||!revisionOK(request.expectedRevision))fail('BNS_HUMAN_REQUEST');const before=humanFutureRead(entry,store,core,'fixed',request)??await store.run(()=>core.transaction(false,async t=>({base:await base(store,core,t),read:await fixedReadSet(t,request.entryId),receipt:await t.get('operationReceipts',request.operationId)??null})));if(!entry||!equal(entry,before.base)||entry.library?.sealed)fail('BNS_HUMAN_CHANGED');const digest=await hashText(JSON.stringify(request));if(before.receipt){if(before.receipt.digest!==digest)fail('BNS_HUMAN_OPERATION_COLLISION');return {duplicate:true,result:clone(before.receipt.result)};}
 const read=before.read,old=read.row;if(!old||old.storageSchema!==2||old.bodyBinding!=='thought'||old.provenanceType!=='user_created'||old.lifecycle!=='active'||old.sourceRecordIds?.length||read.provenance||read.dependencies||read.topics.some(x=>!x.row||x.row.createdBy!=='user'||x.row.sourceRecordIds?.length||x.row.redirectTo))fail('BNS_HUMAN_UNSUPPORTED');if(old.revision!==request.expectedRevision)return {conflict:true};
 const allocation=prepareHumanAllocation(store,entry),ids=read.placementRows.filter(p=>{const q=read.topics.find(x=>x.row.id===p.topicId).row;return q.lifecycle==='active'&&q.activeLayoutGeneration===p.layoutGeneration&&p.lifecycle==='active';}).map(p=>p.topicId),row=planHumanFixedMembership(old,request,ids,{intentAt:allocation.clock(),protectionAt:allocation.clock()});let thoughtSequence=entry.sequence?.value||0,revisionSequence=(entry.revision?.value||0)+1;
 const history=reserveImportantHistory({kind:'membership_intent',entityId:old.id,before:clone(old.organizationIntents),after:clone(row.organizationIntents),fieldMask:['fixed'],actor:'user',reason:'fixed_membership',important:true,operationId:request.operationId,sourceRecordIds:[]},read.intentHistory,allocation,revisionSequence);row.searchVersion=ownerVersion('entry',row);const states=new Map(read.topics.map(x=>[x.row.id,{row:clone(x.row),index:clone(x.index)}])),touched=new Set();for(const edge of read.placementRows){const state=states.get(edge.topicId);if(state.row.activeLayoutGeneration===edge.layoutGeneration){Object.assign(state,reserveTouch(state.row,state.index,read.epoch,allocation,++thoughtSequence));touched.add(edge.topicId);}}
 const result={id:row.id,revision:row.revision},operationReceipt={id:request.operationId,namespace:'thought-library',schemaVersion:1,ownerId:row.id,operationSequence:++thoughtSequence,createdAt:allocation.clock(),digest,result},cap=Object.freeze({});plans.set(cap,{kind:'fixed',store,core,entry:clone(entry),before,request:clone(request),allocation:allocation.seal(),events:allocation.events(),row,touchedTopics:[...touched].map(id=>states.get(id).row),touchedIndices:[...touched].map(id=>({id,index:clone(states.get(id).index)})),history,result,operationReceipt,revisionSequence,thoughtSequence});return cap;
}
export function humanFixedPlan(cap){const p=plans.get(cap);if(p?.kind!=='fixed')fail('BNS_HUMAN_PLAN_REQUIRED');return {entry:clone(p.row),topics:clone(p.touchedTopics),history:clone(p.history),result:clone(p.result),events:clone(p.events)};}
export async function requireHumanFixedPlan(t,cap,store,core){const p=plans.get(cap);if(p?.kind!=='fixed'||p.store!==store||p.core!==core)fail('BNS_HUMAN_PLAN_REQUIRED');if(!equal(await base(store,core,t),p.entry)||!equal(await fixedReadSet(t,p.row.id),p.before.read)||await t.get('operationReceipts',p.request.operationId))fail('BNS_HUMAN_CHANGED');for(const h of p.history)if(!p.before.read.intentHistory.some(x=>x.id===h.id)&&await t.get('revisions',h.id))fail('BNS_HUMAN_CHANGED');return p.allocation;}

async function keepReadSet(t,r){return {source:await t.get('topics',r.sourceId)??null,target:await t.get('topics',r.targetId)??null,pair:await t.get('meta',topicPairKey(r.sourceId,r.targetId))??null};}
export async function prepareHumanKeepPlan(store,core,request,entry){
 keys(request,['sourceId','targetId'],['sourceId','targetId']);if(!idOK(request.sourceId)||!idOK(request.targetId)||request.sourceId===request.targetId)fail('BNS_HUMAN_UNSUPPORTED');const before=humanFutureRead(entry,store,core,'keep',request)??await store.run(()=>core.transaction(false,async t=>({base:await base(store,core,t),read:await keepReadSet(t,request)})));if(!entry||!equal(before.base,entry)||entry.library?.sealed)fail('BNS_HUMAN_CHANGED');for(const q of [before.read.source,before.read.target])if(!q||q.createdBy!=='user'||q.redirectTo||q.layoutJobId||q.sourceRecordIds?.length||q.identity?.version!==1||q.identity?.legacy!==false||q.identity?.origin!=='user'||q.identity?.scope!==null||!['active','removed','dormant'].includes(q.lifecycle))fail('BNS_HUMAN_UNSUPPORTED');
 const allocation=prepareHumanAllocation(store,entry),pair=before.read.pair?clone(before.read.pair):planHumanKeepSeparate(request.sourceId,request.targetId,allocation.clock());if(pair.id!==topicPairKey(request.sourceId,request.targetId)||![request.sourceId,request.targetId].includes(pair.sourceId)||![request.sourceId,request.targetId].includes(pair.targetId)||pair.sourceId===pair.targetId||pair.actor!=='user'||pair.revision!==1||pair.scope!=='identity')fail('BNS_HUMAN_UNSUPPORTED');const cap=Object.freeze({});plans.set(cap,{kind:'keep',store,core,entry:clone(entry),before,request:clone(request),allocation:allocation.seal(),events:allocation.events(),pair,result:{kept:true}});return cap;
}
export function humanKeepPlan(cap){const p=plans.get(cap);if(p?.kind!=='keep')fail('BNS_HUMAN_PLAN_REQUIRED');return {pair:clone(p.pair),result:clone(p.result),events:clone(p.events)};}
export async function requireHumanKeepPlan(t,cap,store,core){const p=plans.get(cap);if(p?.kind!=='keep'||p.store!==store||p.core!==core)fail('BNS_HUMAN_PLAN_REQUIRED');if(!equal(await base(store,core,t),p.entry)||!equal(await keepReadSet(t,p.request),p.before.read))fail('BNS_HUMAN_CHANGED');return p.allocation;}

// Private-plan-only same-transaction route for the original named owners.
// No caller-supplied reducer, nested foundationWrite or store override.
export async function executeHumanPlanInTransaction(t,cap){const p=plans.get(cap);if(!p||!['topic','topic-edit','section','section-edit','entry','entry-edit','entry-remove','entry-restore','placement','move','fixed','topic-lifecycle','keep'].includes(p.kind))fail('BNS_HUMAN_PLAN_REQUIRED');if(t?.tx?.db!==p.store.repository.db||t.tx.mode!=='readwrite')fail('BNS_HUMAN_TRANSACTION');if(completedPlans.has(cap))fail('BNS_HUMAN_CHANGED');const request=clone(p.request);executions.set(request,{cap,p,allocation:null});try{if(p.kind==='keep'){try{await beginHumanOperation(p.store,t,request);const result=await keepTopicIdentitiesSeparateInTransaction(p.store,t,request);await finishHumanOperation(p.store,t,request,result);return result;}finally{releaseHumanOperation(t,request);}}return await p.store.operationInTransaction(t,request,p.operationReceipt.digest,tx=>p.store.libraryOperationInTransaction(tx,request,inner=>namedHumanWriter(p,inner,request)));}finally{executions.delete(request);}}

function namedHumanWriter(p,t,r){switch(p.kind){case 'topic-edit':return p.renameOnly?p.store.renameTopicInTransaction(t,r,p.nameIdentity):p.store.editTopicInTransaction(t,r,p.nameIdentity);case 'section-edit':return editSectionInTransaction(p.store,t,r);case 'fixed':return fixMembershipSetInTransaction(p.store,t,r);case 'topic-lifecycle':return changeTopicContainerInTransaction(p.store,t,r,p.restore,p.nameIdentity);case 'topic':return p.store.createTopicInTransaction(t,r,p.nameIdentity);case 'section':return p.store.createSectionInTransaction(t,r,r.rank===undefined?null:normalizeRank(r.rank));case 'entry':return p.store.createEntryInTransaction(t,r,{evidence:[],nonContext:[],generator:null,exactSignature:p.row.exactSignature,hooks:{}});case 'entry-edit':return p.store.editEntryInTransaction(t,r,{signature:{row:p.before.read.row},exactSignature:p.row.exactSignature});case 'entry-remove':return p.store.removeEntryInTransaction(t,r);case 'entry-restore':return p.store.restoreEntryInTransaction(t,r);case 'placement':return p.store.placeEntryInTransaction(t,r);case 'move':return moveMembershipInTransaction(p.store,t,r);default:fail('BNS_HUMAN_PLAN_REQUIRED');}}

async function sectionEditReadSet(t,r){const topic=await t.get('topics',r.topicId)??null;return {topic,section:topic?await t.get('sections',JSON.stringify([topic.id,topic.activeLayoutGeneration,r.sectionId]))??null:null,index:await t.get('meta','thought-read-index:v1:topic:'+r.topicId)??null,epoch:(await t.get('meta','thought-epoch'))?.value||0,history:await boundedRows(t,'revisions','byList',prefix(['section:'+r.sectionId])),saved:r.restoreRevisionId?await t.get('revisions',r.restoreRevisionId)??null:null};}
export async function prepareHumanSectionEditPlan(store,core,request,entry){
 keys(request,['topicId','sectionId','expectedRevision','title','operationId','restoreRevisionId'],['topicId','sectionId','expectedRevision','title','operationId']);if(!idOK(request.topicId)||!idOK(request.sectionId)||!idOK(request.operationId)||request.operationId.length<8||!revisionOK(request.expectedRevision)||typeof request.title!=='string'||request.title.length>300)fail('BNS_HUMAN_REQUEST');
 const before=humanFutureRead(entry,store,core,'section-edit',request)??await store.run(()=>core.transaction(false,async t=>({base:await base(store,core,t),read:await sectionEditReadSet(t,request),receipt:await t.get('operationReceipts',request.operationId)??null})));if(!entry||!store.libraryDocumentMode||!equal(before.base,entry)||entry.library?.sealed)fail('BNS_HUMAN_CHANGED');const digest=await hashText(JSON.stringify(request));if(before.receipt){if(before.receipt.digest!==digest)fail('BNS_HUMAN_OPERATION_COLLISION');return {duplicate:true,result:clone(before.receipt.result)};}
 const read=before.read,old=read.section;let topic=clone(read.topic);if(!topic||topic.createdBy!=='user'||topic.lifecycle!=='active'||topic.redirectTo||topic.layoutJobId||topic.sourceRecordIds?.length||topic.identity?.version!==1||topic.identity?.legacy!==false||topic.identity?.origin!=='user'||topic.identity?.scope!==null||!old||old.lifecycle!=='active'||old.redirectTo||old.sourceRecordIds?.length||old.topicId!==topic.id||old.layoutGeneration!==topic.activeLayoutGeneration)fail('BNS_HUMAN_UNSUPPORTED');if(old.revision!==request.expectedRevision)return {conflict:true};if(request.restoreRevisionId&&(!read.saved||read.saved.kind!=='section'||read.saved.entityId!==request.sectionId||!Array.isArray(read.saved.sourceRecordIds)||read.saved.sourceRecordIds.length))fail('BNS_HUMAN_UNSUPPORTED');
 const allocation=prepareHumanAllocation(store,entry),section=planHumanSectionEdit(old,request,allocation.clock());topic.organizationRevision++;let thoughtSequence=entry.sequence?.value||0,revisionSequence=(entry.revision?.value||0)+1;const history=reserveImportantHistory({kind:'section',entityId:old.sectionId,documentId:topic.id,before:old,after:clone(section),fieldMask:['title'],actor:'user',reason:request.restoreRevisionId?'restore':'rename',important:true,operationId:request.operationId,baseRevision:request.expectedRevision,afterRevision:section.revision,sourceRecordIds:[]},read.history,allocation,revisionSequence);const touchedState=reserveTouch(topic,read.index,read.epoch,allocation,++thoughtSequence);topic=touchedState.row;section.searchVersion=ownerVersion('section',section);
 const result={id:section.sectionId,revision:section.revision},operationReceipt={id:request.operationId,namespace:'thought-library',schemaVersion:1,ownerId:section.sectionId,operationSequence:++thoughtSequence,createdAt:allocation.clock(),digest,result},cap=Object.freeze({});plans.set(cap,{kind:'section-edit',store,core,entry:clone(entry),before,request:clone(request),allocation:allocation.seal(),events:allocation.events(),topic,section,touchedIndices:[{id:topic.id,index:clone(touchedState.index)}],history,result,operationReceipt,revisionSequence,thoughtSequence});return cap;
}
export function humanSectionEditPlan(cap){const p=plans.get(cap);if(p?.kind!=='section-edit')fail('BNS_HUMAN_PLAN_REQUIRED');return {topic:clone(p.topic),section:clone(p.section),history:clone(p.history),result:clone(p.result),operationReceipt:clone(p.operationReceipt),events:clone(p.events)};}
export async function requireHumanSectionEditPlan(t,cap,store,core){const p=plans.get(cap);if(p?.kind!=='section-edit'||p.store!==store||p.core!==core)fail('BNS_HUMAN_PLAN_REQUIRED');if(!equal(await base(store,core,t),p.entry)||!equal(await sectionEditReadSet(t,p.request),p.before.read)||await t.get('operationReceipts',p.request.operationId))fail('BNS_HUMAN_CHANGED');for(const h of p.history)if(!p.before.read.history.some(x=>x.id===h.id)&&await t.get('revisions',h.id))fail('BNS_HUMAN_CHANGED');return p.allocation;}

async function topicEditReadSet(t,r,nameIdentity){const topic=await t.get('topics',r.id)??null,tokens=[...new Set([topic?.identity?.nameToken,nameIdentity?.oldToken,nameIdentity?.newToken].filter(Boolean))];return {topic,index:await t.get('meta','thought-read-index:v1:topic:'+r.id)??null,epoch:(await t.get('meta','thought-epoch'))?.value||0,history:await boundedRows(t,'revisions','byList',prefix(['topic:'+r.id])),saved:r.restoreRevisionId?await t.get('revisions',r.restoreRevisionId)??null:null,registry:await Promise.all(tokens.map(async token=>({token,row:await t.get('meta','personalTopicName:'+token)??null})))};}
export async function prepareHumanTopicEditPlan(store,core,request,entry,{renameOnly=false}={}){
 if(typeof renameOnly!=='boolean')fail('BNS_HUMAN_REQUEST');keys(request,renameOnly?['id','name','expectedRevision','operationId','restoreRevisionId']:['id','changes','expectedRevision','operationId','restoreRevisionId'],renameOnly?['id','name','expectedRevision','operationId']:['id','changes','expectedRevision','operationId']);const changes=renameOnly?{name:request.name}:request.changes;keys(changes,['name','summary','pinned']);if(Object.values(changes).some(value=>value===undefined)||renameOnly&&typeof request.name!=='string')fail('BNS_HUMAN_REQUEST');if(!idOK(request.id)||!idOK(request.operationId)||request.operationId.length<8||!revisionOK(request.expectedRevision)||!Object.keys(changes).length||changes.name!==undefined&&(typeof changes.name!=='string'||!changes.name.trim()||changes.name.length>300)||changes.summary!==undefined&&(typeof changes.summary!=='string'||new TextEncoder().encode(JSON.stringify(changes.summary)).length>16384)||changes.pinned!==undefined&&typeof changes.pinned!=='boolean')fail('BNS_HUMAN_REQUEST');
 const nameIdentity=changes.name!==undefined?await humanPlanIdentity(store,entry,request.id,changes.name):null,before=humanFutureRead(entry,store,core,'topic-edit',request,nameIdentity)??await store.run(()=>core.transaction(false,async t=>({base:await base(store,core,t),read:await topicEditReadSet(t,request,nameIdentity),receipt:await t.get('operationReceipts',request.operationId)??null})));if(!entry||!store.libraryDocumentMode||!equal(before.base,entry)||entry.library?.sealed)fail('BNS_HUMAN_CHANGED');const digest=await hashText(JSON.stringify(request));if(before.receipt){if(before.receipt.digest!==digest)fail('BNS_HUMAN_OPERATION_COLLISION');return {duplicate:true,result:clone(before.receipt.result)};}
 const read=before.read,old=read.topic;if(!old||old.createdBy!=='user'||old.lifecycle!=='active'||old.redirectTo||old.layoutJobId||old.sourceRecordIds?.length||old.identity?.version!==1||old.identity?.legacy!==false||old.identity?.origin!=='user'||old.identity?.scope!==null)fail('BNS_HUMAN_UNSUPPORTED');if(old.revision!==request.expectedRevision)return {conflict:true};if(request.restoreRevisionId&&(!read.saved||read.saved.kind!=='topic'||read.saved.entityId!==request.id||!Array.isArray(read.saved.sourceRecordIds)||read.saved.sourceRecordIds.length))fail('BNS_HUMAN_UNSUPPORTED');
 const allocation=prepareHumanAllocation(store,entry),fields=[];let topic=clone(old),thoughtSequence=entry.sequence?.value||0,revisionSequence=entry.revision?.value||0,history=clone(read.history);
 for(const [key,value]of Object.entries(changes)){const field=key==='pinned'?'pinKey':key,next=key==='pinned'?(value?0:1):value;if(!renameOnly&&topic[field]===next)continue;if(key==='name'){const rename=planHumanTopicRename(topic,nameIdentity,request.operationId,allocation.clock());topic.identity={...rename.identity,nameToken:nameIdentity.newToken};}topic=planHumanTopicField(topic,key,value,request.operationId,allocation.clock());fields.push(key);}
 if(fields.length){topic.nameKey=topic.name.toLocaleLowerCase();topic.revision++;history=reserveImportantHistory({kind:'topic',entityId:topic.id,before:old,after:clone(topic),fieldMask:fields,actor:'user',reason:request.restoreRevisionId?'restore':fields.includes('name')?'rename':'edit',important:true,operationId:request.operationId,baseRevision:request.expectedRevision,afterRevision:topic.revision,sourceRecordIds:[]},read.history,allocation,++revisionSequence);}
 topic.searchVersion=ownerVersion('topic',topic);const touchedState=reserveTouch(topic,read.index,read.epoch,allocation,++thoughtSequence);topic=touchedState.row;const result={id:topic.id,revision:topic.revision},operationReceipt={id:request.operationId,namespace:'thought-library',schemaVersion:1,ownerId:topic.id,operationSequence:++thoughtSequence,createdAt:allocation.clock(),digest,result},cap=Object.freeze({});plans.set(cap,{kind:'topic-edit',store,core,entry:clone(entry),before,request:clone(request),nameIdentity,renameOnly,allocation:allocation.seal(),events:allocation.events(),topic,touchedIndices:[{id:topic.id,index:clone(touchedState.index)}],history,result,operationReceipt,revisionSequence,thoughtSequence});return cap;
}
export function humanTopicEditPlan(cap){const p=plans.get(cap);if(p?.kind!=='topic-edit')fail('BNS_HUMAN_PLAN_REQUIRED');return {topic:clone(p.topic),history:clone(p.history),result:clone(p.result),operationReceipt:clone(p.operationReceipt),events:clone(p.events)};}
export async function requireHumanTopicEditPlan(t,cap,store,core){const p=plans.get(cap);if(p?.kind!=='topic-edit'||p.store!==store||p.core!==core)fail('BNS_HUMAN_PLAN_REQUIRED');if(p.nameIdentity)await assertTopicIdentityBase(t,p.nameIdentity);if(!equal(await base(store,core,t),p.entry)||!equal(await topicEditReadSet(t,p.request,p.nameIdentity),p.before.read)||await t.get('operationReceipts',p.request.operationId))fail('BNS_HUMAN_CHANGED');for(const h of p.history)if(!p.before.read.history.some(x=>x.id===h.id)&&await t.get('revisions',h.id))fail('BNS_HUMAN_CHANGED');return p.allocation;}

// Exact local plan output for the optional journal. This view carries no write
// capability; the journal must keep the opaque cap for same-txn execution.
export function humanPlanJournalRows(cap){
 const p=plans.get(cap);if(!p)fail('BNS_HUMAN_PLAN_REQUIRED');const read=p.before.read,reads=p.kind==='move'?[read.source,read.target]:[read].filter(Boolean),rows=new Map(),oldHistory=new Map();
 const add=(type,before,after)=>{if(!after)fail('BNS_HUMAN_PLAN_CHANGED');const id=type+':'+after.id,old=rows.get(id),value={type,before:clone(before??null),after:clone(after)};if(old&&!equal(old,value))fail('BNS_HUMAN_PLAN_CHANGED');rows.set(id,value);};
 const old=(list,id)=>list?.find(x=>x.id===id)??null;
 for(const snapshot of reads){for(const h of snapshot.history||[])oldHistory.set(h.id,h);for(const h of snapshot.intentHistory||[])oldHistory.set(h.id,h);for(const group of snapshot.histories||[])for(const h of group.rows)oldHistory.set(h.id,h);}
 if(p.kind==='topic')add('topic',null,p.topic);
 else if(['topic-edit','topic-lifecycle','section','section-edit'].includes(p.kind))add('topic',read.topic,p.topic);
 if(p.section)add('section',p.kind==='section-edit'?read.section:null,p.section);
 if(p.row)add('entry',read?.row??read?.entry??read?.source?.entry??null,p.row);
 for(const entry of p.entries||[])add('entry',read.entries.find(x=>x.id===entry.id)?.row??null,entry);
 for(const topic of p.touchedTopics||[])add('topic',reads.flatMap(x=>x.topics||[]).find(x=>x.row?.id===topic.id)?.row??null,topic);
 const placements=p.placements??(p.placement?[p.placement]:[]);for(const row of placements)add('placement',old(reads.flatMap(x=>x.placements??x.placementRows??[]),row.id),row);
 for(const row of p.suppressions||[])add('suppression',old(read.suppressions,row.id),row);
 if(p.pair){add('keepSeparate',read.pair,p.pair);add('topic',read.source,read.source);add('topic',read.target,read.target);}
 for(const h of p.history||[])add('history',oldHistory.get(h.id)??null,h);
 return {kind:p.kind,restore:p.restore??false,renameOnly:p.renameOnly??false,request:clone(p.request),events:clone(p.events),allocation:{domainCount:p.events.filter(e=>e.role==='domain').length,indexGenerationCount:p.events.filter(e=>e.role==='index-generation').length},rows:[...rows.values()],history:clone(p.history||[]),secret:clone(p.entry.secret),result:clone(p.result)};
}

// Typed actual inventory, not a repository façade. Each future view below
// names its original capture fields and original physical index ordering.
const humanTables=['thoughts','topics','sections','placements','thoughtSuppressions','revisions','operationReceipts'];
async function humanInventory(store,core,t){
 const result={base:await base(store,core,t),epoch:(await t.get('meta','thought-epoch'))?.value||0};
 for(const name of humanTables){if(await t.count(name)>128)fail('BNS_HUMAN_GRAPH_LIMIT');result[name]=await t.all(name);}
 for(const name of ['provenance','dependencies'])if(await t.count(name))fail('BNS_HUMAN_UNSUPPORTED');
 for(const [name,prefix]of [['names','personalTopicName:'],['pairs','topicKeepSeparate:'],['indices','thought-read-index:v1:topic:'],['memoryTopics','memory:topic:'],['memorySections','memory:section:']]){const rows=[];let after=null;do{const page=await t.primaryRangePage('meta',{prefix,after,limit:Math.min(100,129-rows.length)});rows.push(...page.rows.map(x=>x.value));if(rows.length>128)fail('BNS_HUMAN_GRAPH_LIMIT');after=page.next;}while(after);result[name]=rows;}
 if(result.memoryTopics.length||result.memorySections.length)fail('BNS_HUMAN_UNSUPPORTED');
 return result;
}
export async function captureHumanGraphReadSet(store,core){
 if(!store.libraryDocumentMode||store.repository!==core.repository)fail('BNS_HUMAN_BINDING_REQUIRED');await store.finishFoundation();const initial=await store.run(()=>core.transaction(false,t=>humanInventory(store,core,t)));if(initial.base.library?.sealed)fail('BNS_HUMAN_UNSUPPORTED');const cap=Object.freeze({});futureGraphs.set(cap,{store,core,initial:clone(initial),state:clone(initial),used:new WeakSet()});return cap;
}
export async function requireHumanGraphReadSet(t,cap){const g=futureGraphs.get(cap);if(!g||t?.tx?.db!==g.store.repository.db||t.tx.mode!=='readwrite')fail('BNS_HUMAN_PLAN_REQUIRED');if(!equal(await humanInventory(g.store,g.core,t),g.initial))fail('BNS_HUMAN_CHANGED');}
function humanFutureGraph(entry,store,core){const g=futureEntries.get(entry);if(!g)return null;if(g.store!==store||g.core!==core||!equal(g.state.base,entry))fail('BNS_HUMAN_CHANGED');return g;}
function rowById(rows,id){return rows.find(row=>row.id===id)??null;}
function humanOrdered(g,rows,paths){return [...rows].sort((a,b)=>g.store.repository.factory.cmp(paths.map(key=>a[key]),paths.map(key=>b[key])));}
function humanHistories(g,key){return humanOrdered(g,g.state.revisions.filter(row=>row.entityKey===key),['sequence']);}
function humanTopicIndex(g,id){return rowById(g.state.indices,'thought-read-index:v1:topic:'+id);}
function humanEntryFuture(g,id){const s=g.state,edges=humanOrdered(g,s.placements.filter(row=>row.entryId===id),LIBRARY_INDEXES.placements.byEntry),topics=[...new Set(edges.map(row=>row.topicId))].map(topicId=>({row:rowById(s.topics,topicId),index:humanTopicIndex(g,topicId)}));return {row:rowById(s.thoughts,id),history:humanHistories(g,'library_entry:'+id),placements:edges.length,placementRows:edges,topics,epoch:s.epoch,provenance:0,dependencies:0};}
function humanPlacementFuture(g,r){const s=g.state,entry=rowById(s.thoughts,r.entryId),placements=humanOrdered(g,s.placements.filter(row=>row.entryId===r.entryId),LIBRARY_INDEXES.placements.byEntry),topic=rowById(s.topics,r.topicId),old=topic?s.placements.find(row=>row.id===JSON.stringify([r.topicId,topic.activeLayoutGeneration,r.entryId]))??null:null,section=topic?rowById(s.sections,JSON.stringify([topic.id,topic.activeLayoutGeneration,r.sectionId||topic.defaultSectionId])):null,topics=[...new Set([...placements.map(row=>row.topicId),r.topicId])].map(id=>({row:rowById(s.topics,id),index:humanTopicIndex(g,id)})),last=topic&&section&&r.rank===undefined&&(!old||old.sectionId!==section.sectionId)?humanOrdered(g,s.placements.filter(row=>row.topicId===topic.id&&row.layoutGeneration===topic.activeLayoutGeneration&&row.sectionId===section.sectionId&&row.activeKey===0),LIBRARY_INDEXES.placements.bySectionOrder).at(-1)??null:null,id=topic?JSON.stringify([r.topicId,topic.activeLayoutGeneration,r.entryId]):null;return {entry,placements,topics,topic,old,section,last,history:id?humanHistories(g,'placement:'+id):[],memory:[],epoch:s.epoch,provenance:0,dependencies:0,saved:r.restoreRevisionId?rowById(s.revisions,r.restoreRevisionId):null};}
function humanFutureRead(entry,store,core,kind,r,nameIdentity){
 const g=humanFutureGraph(entry,store,core);if(!g)return null;const s=g.state,cut=clone(s.base),receipt=r.operationId?rowById(s.operationReceipts,r.operationId):null;let read;
 switch(kind){
 case 'topic':return clone({...cut,registry:rowById(s.names,'personalTopicName:'+nameIdentity.token),receipt});
 case 'entry':return clone({...cut,receipt});
 case 'entry-edit':read=humanEntryFuture(g,r.id);break;
 case 'entry-remove':read={...humanEntryFuture(g,r.id),suppressions:humanOrdered(g,s.thoughtSuppressions.filter(row=>row.deletedEntryId===r.id),['id'])};break;
 case 'fixed':read={...humanEntryFuture(g,r.entryId),intentHistory:humanHistories(g,'membership_intent:'+r.entryId)};break;
 case 'placement':read=humanPlacementFuture(g,r);break;
 case 'move':{const source=humanPlacementFuture(g,{entryId:r.entryId,topicId:r.sourceTopicId}),topic=rowById(s.topics,r.targetTopicId),old=topic?rowById(s.placements,JSON.stringify([topic.id,topic.activeLayoutGeneration,r.entryId])):null;read={source,target:humanPlacementFuture(g,{entryId:r.entryId,topicId:r.targetTopicId,...(old?{sectionId:old.sectionId,rank:old.rank}:{})})};break;}
 case 'section':{const topic=rowById(s.topics,r.topicId);read={topic,defaultSection:topic?.defaultSectionId?rowById(s.sections,JSON.stringify([r.topicId,topic.activeLayoutGeneration,topic.defaultSectionId])):null,index:humanTopicIndex(g,r.topicId),epoch:s.epoch,last:topic?humanOrdered(g,s.sections.filter(row=>row.topicId===topic.id&&row.layoutGeneration===topic.activeLayoutGeneration&&row.activeKey===0),LIBRARY_INDEXES.sections.byTopicOrder).at(-1)??null:null};break;}
 case 'section-edit':{const topic=rowById(s.topics,r.topicId);read={topic,section:topic?rowById(s.sections,JSON.stringify([topic.id,topic.activeLayoutGeneration,r.sectionId])):null,index:humanTopicIndex(g,r.topicId),epoch:s.epoch,history:humanHistories(g,'section:'+r.sectionId),saved:r.restoreRevisionId?rowById(s.revisions,r.restoreRevisionId):null};break;}
 case 'topic-edit':{const topic=rowById(s.topics,r.id),tokens=[...new Set([topic?.identity?.nameToken,nameIdentity?.oldToken,nameIdentity?.newToken].filter(Boolean))];read={topic,index:humanTopicIndex(g,r.id),epoch:s.epoch,history:humanHistories(g,'topic:'+r.id),saved:r.restoreRevisionId?rowById(s.revisions,r.restoreRevisionId):null,registry:tokens.map(token=>({token,row:rowById(s.names,'personalTopicName:'+token)}))};break;}
 case 'topic-lifecycle':{const topic=rowById(s.topics,r.id),placements=topic?humanOrdered(g,s.placements.filter(row=>row.topicId===r.id&&row.layoutGeneration===topic.activeLayoutGeneration),LIBRARY_INDEXES.placements.byTopicOrder):[];read={topic,placements,entries:placements.map(p=>({id:p.entryId,row:rowById(s.thoughts,p.entryId),provenance:0,dependencies:0})),histories:[...placements.map(p=>({id:'placement:'+p.id,rows:humanHistories(g,'placement:'+p.id)})),{id:'topic:'+r.id,rows:humanHistories(g,'topic:'+r.id)}],memory:[],index:humanTopicIndex(g,r.id),epoch:s.epoch,registry:rowById(s.names,'personalTopicName:'+nameIdentity.oldToken)};break;}
 case 'keep':return clone({base:cut,read:{source:rowById(s.topics,r.sourceId),target:rowById(s.topics,r.targetId),pair:rowById(s.pairs,topicPairKey(r.sourceId,r.targetId))}});
 default:fail('BNS_HUMAN_UNSUPPORTED');
 }return clone({base:cut,read,receipt});
}
async function humanPlanName(store,entry,name){const g=futureEntries.get(entry);return g?prepareTopicNameFromBase({secret:clone(entry.secret),restoreEpoch:entry.epoch},name):prepareTopicName(store,name);}
async function humanPlanIdentity(store,entry,id,newName){const g=futureEntries.get(entry);return g?prepareTopicIdentityFromSnapshot({before:clone(rowById(g.state.topics,id)),secret:clone(entry.secret),restoreEpoch:entry.epoch},newName):prepareTopicIdentityName(store,id,newName);}
function humanFutureCollision(entry,topic,section,history){const g=futureEntries.get(entry);if(!g)return null;return {index:humanTopicIndex(g,topic.id),topic:rowById(g.state.topics,topic.id),section:rowById(g.state.sections,section.id),history:history.map(row=>rowById(g.state.revisions,row.id))};}
const futurePreparers={topic:prepareHumanTopicPlan,'topic-edit':prepareHumanTopicEditPlan,section:prepareHumanSectionPlan,'section-edit':prepareHumanSectionEditPlan,entry:prepareHumanEntryPlan,'entry-edit':prepareHumanEntryEditPlan,'entry-remove':prepareHumanEntryLifecyclePlan,'entry-restore':prepareHumanEntryLifecyclePlan,placement:prepareHumanPlacementPlan,move:prepareHumanMovePlan,fixed:prepareHumanFixedPlan,'topic-lifecycle':prepareHumanTopicLifecyclePlan,keep:prepareHumanKeepPlan};
export async function prepareHumanGraphNamedPlan(cap,descriptor){const g=futureGraphs.get(cap);if(!g)fail('BNS_HUMAN_PLAN_REQUIRED');const d=clone(descriptor);validateHumanLibraryCommit(d);if(d.datasetId!==g.core.datasetId)fail('BNS_DATASET_MISMATCH');const request=await restoreHumanRequest(d);const entry=bindHumanReplayEntry(clone(g.state.base),d.events,d.allocation);futureEntries.set(entry,g);try{const plan=await futurePreparers[d.kind](g.store,g.core,request,entry,{...d.options,...(d.kind==='entry-restore'?{restore:true}:{})});if(plan.duplicate||plan.conflict)fail('BNS_HUMAN_CHANGED');const p=plans.get(plan);p.futureGraph=g;p.futureDescriptor=d;return plan;}finally{futureEntries.delete(entry);}}
function replaceHumanRow(g,rows,row){const n=rows.findIndex(item=>item.id===row.id);if(n<0)rows.push(clone(row));else rows[n]=clone(row);rows.sort((a,b)=>g.store.repository.factory.cmp(a.id,b.id));}
export function advanceHumanGraphReadSet(cap,plan){
 const g=futureGraphs.get(cap),p=plans.get(plan);if(!g||!p||p.store!==g.store||p.core!==g.core||g.used.has(plan)||p.futureGraph!==g||!equal(p.entry,g.state.base))fail('BNS_HUMAN_PLAN_REQUIRED');
 for(const row of humanPlanJournalRows(plan).rows){const name={entry:'thoughts',topic:'topics',section:'sections',placement:'placements',history:'revisions',suppression:'thoughtSuppressions',keepSeparate:'pairs'}[row.type];replaceHumanRow(g,g.state[name],row.after);}
 for(const index of p.touchedIndices||[])if(index.index)replaceHumanRow(g,g.state.indices,index.index);
 if(p.nameIdentity){const tokens=p.kind==='topic'?[p.nameIdentity.token]:p.kind==='topic-edit'&&p.nameIdentity.newToken?[...new Set([p.before.read.topic.identity.nameToken,p.nameIdentity.oldToken,p.nameIdentity.newToken].filter(Boolean))]:[p.nameIdentity.oldToken];for(const token of tokens){const row=planTopicNameRegistration(p.topic,token,rowById(g.state.names,'personalTopicName:'+token));replaceHumanRow(g,g.state.names,row.registry);}}
 if(p.operationReceipt)replaceHumanRow(g,g.state.operationReceipts,p.operationReceipt);
 if(p.thoughtSequence!==undefined)g.state.base.sequence={id:'thought-sequence',value:p.thoughtSequence};if(p.revisionSequence!==undefined)g.state.base.revision={id:'revision-sequence',value:p.revisionSequence};g.state.base.generation+=p.futureDescriptor.members.length+1;g.used.add(plan);
}
export function humanGraphReadSetProjection(cap){const g=futureGraphs.get(cap);if(!g)fail('BNS_HUMAN_PLAN_REQUIRED');return clone(g.state);}

// Exact original plan phases for the finite private search qualifier. This
// accessor exposes no write authority and cannot brand a caller DTO.
export function humanSearchPlanWitness(cap,store,core){
 const p=plans.get(cap);if(!p||p.store!==store||p.core!==core)fail('BNS_HUMAN_PLAN_REQUIRED');
 return humanPlanJournalRows(cap);
}

// Unused, readonly semantic witness. No write/journal entry point accepts it.
const branchWitnesses=new WeakMap(),branchStores=new WeakMap();
const BRANCH_BYTES=8*1024*1024,BRANCH_RAW_BYTES=BRANCH_BYTES/2,BRANCH_HANDLES=8;
const branchBodyOnly=r=>r?.changes&&Object.keys(r.changes).length===1&&Object.hasOwn(r.changes,'body');
// Budget only: count JSON/UTF-8 incrementally before allocating an encoded
// duplicate. Original validators/equality still decide every semantic value.
const branchOwn=Object.hasOwn,branchDescriptor=Object.getOwnPropertyDescriptor;
export function branchRawMeasure(value,limit=BRANCH_RAW_BYTES,stats=null,frozen=false){
 let size=0,nodes=0,slots=0,units=0;const add=n=>{size+=n;if(size>limit)fail('BNS_HUMAN_GRAPH_LIMIT');};
 const text=value=>{units+=value.length;add(2);for(let i=0;i<value.length;i++){const c=value.charCodeAt(i);if(c===34||c===92||c===8||c===9||c===10||c===12||c===13)add(2);else if(c<32)add(6);else if(c<128)add(1);else if(c<2048)add(2);else if(c>=0xd800&&c<=0xdbff){const next=value.charCodeAt(++i);if(!(next>=0xdc00&&next<=0xdfff))fail('BNS_TEXT_ENCODING');add(4);}else if(c>=0xdc00&&c<=0xdfff)fail('BNS_TEXT_ENCODING');else add(3);}};
 const visit=(v,depth)=>{
  if(++nodes>200000||depth>32)fail('BNS_HUMAN_GRAPH_LIMIT');
  if(v===null){add(4);return;}if(typeof v==='string'){text(v);return;}if(typeof v==='boolean'){add(v?4:5);return;}
  if(typeof v==='number'){if(!Number.isFinite(v)||Object.is(v,-0))fail('BNS_VALUE_INVALID');add(String(v).length);return;}
  if(!v||typeof v!=='object')fail('BNS_VALUE_INVALID');if(frozen===true&&!Object.isFrozen(v))fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');
  if(frozen==='native'&&!Array.isArray(v)&&![Object.prototype,null].includes(Object.getPrototypeOf(v)))fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');
  add(2);
  if(Array.isArray(v)){if(frozen==='native'){if(v.length>200000-nodes)fail('BNS_HUMAN_GRAPH_LIMIT');let own=0;for(const k in v)if(branchOwn(v,k)){if(++own>v.length||own>200000)fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');}if(own!==v.length)fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');}for(let i=0;i<v.length;i++){slots++;if(i)add(1);if(frozen){const d=branchDescriptor(v,String(i));if(!d||!('value'in d))fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');visit(d.value,depth+1);}else visit(v[i],depth+1);}return;}
  let first=true;const item=k=>{slots++;if(!first)add(1);first=false;text(k);add(1);if(frozen){const d=branchDescriptor(v,k);if(!d||!('value'in d))fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');visit(d.value,depth+1);}else visit(v[k],depth+1);};
  if(frozen){for(const k in v)if(branchOwn(v,k))item(k);}else{for(const k of Object.keys(v))item(k);}
 };
 visit(value,0);if(stats){stats.nodes=nodes;stats.slots=slots;stats.units=units;}return size;
}
function branchRawSize(value,limit=BRANCH_RAW_BYTES){return branchRawMeasure(value,limit);}

function branchState(store){let state=branchStores.get(store);if(!state){state={busy:false,handles:[],bytes:0,candidateBytes:0,effectReservation:null};branchStores.set(store,state);}return state;}
function branchTrim(state,limit,keep=null){while(state.bytes>limit){const cap=state.handles.find(x=>x!==keep);if(!cap)fail('BNS_HUMAN_GRAPH_LIMIT');branchForget(state,cap);}}
function branchForget(state,cap){
 const p=branchWitnesses.get(cap);if(p){
  branchWitnesses.delete(cap);const r=state.effectReservation?.owner===p?state.effectReservation:p.effectReservation;
  if(r&&state.effectReservation===r&&r.accounted){r.deferredCharge=p.size;if(p.effectReservation&&p.effectReservation!==r){p.effectReservation.accounted=false;p.effectReservation.phase='transferred';}p.size=0;r.phase='revoked';p.raw=null;p.protocol=null;p.effectPlan=null;p.nativeEffects=null;}
  else{state.bytes-=p.size;if(r){r.accounted=false;r.phase='released';}p.effectPlan=null;p.effectReservation=null;p.nativeEffects=null;p.nativeWork=null;}
 }
 const i=state.handles.indexOf(cap);if(i>=0)state.handles.splice(i,1);
}
function branchReady(store,core,binding=null){
 if(!store?.libraryDocumentMode||!['loaded','iaLoaded','filterLoaded','foundationLoaded','bindingsLoaded','documentsLoaded'].every(k=>store[k]===true)||store.foundationFailure||store.volatileError||!store.repository?.db||!store.controlCache||store.pendingControl||store.repository!==core?.repository||store.humanLibraryJournal?.core!==core)fail(binding?'BNS_HUMAN_CHANGED':'BNS_HUMAN_BRANCH_UNAVAILABLE');
 const now={store,core,repository:store.repository,database:store.repository.db,journal:store.humanLibraryJournal,datasetId:core.datasetId,deviceId:core.deviceId,prefix:core.prefix,fixedNamespace:core.fixedNamespace,databaseId:store.databaseId};
 if(binding&&Object.keys(now).some(k=>now[k]!==binding[k]))fail('BNS_HUMAN_CHANGED');return now;
}
async function branchBarrier(store,core,binding=null){const b=branchReady(store,core,binding),tail=store.tail,control=store.controlCache;branchRawSize(control);const controlValues=clone(control);await tail;branchReady(store,core,b);if(store.tail!==tail||store.controlCache!==control||store.pendingControl||!equal(store.controlCache,controlValues))fail('BNS_HUMAN_CHANGED');return {binding:b,tail,control,controlValues};}
function branchFence(store,core,fence){branchReady(store,core,fence.binding);if(store.tail!==fence.tail||store.controlCache!==fence.control||store.pendingControl||!equal(store.controlCache,fence.controlValues))fail('BNS_HUMAN_CHANGED');}
function branchNoIndex(value){if(!value||typeof value!=='object')return;for(const [key,item]of Object.entries(value)){if(key==='indexedSearchVersion')fail('BNS_HUMAN_BRANCH_UNAVAILABLE');branchNoIndex(item);}}
async function branchRaw(store,core,protocol,fence){
 branchFence(store,core,fence);
 const raw=await core.transaction(false,t=>branchRawInTransaction(store,core,protocol,fence,t));
 branchFence(store,core,fence);return raw;
}
async function branchRawInTransaction(store,core,protocol,fence,t){
  branchFence(store,core,fence);if(t.tx.db!==fence.binding.database)fail('BNS_HUMAN_CHANGED');
  const request=protocol.descriptor.value.request,id=request.id,records=new Map(),budgetRecords=[],budgetGroups=[],budget={input:protocol.operations,controlValues:fence.controlValues,records:budgetRecords,groups:budgetGroups};branchRawSize(budget);
  const get=async(kind,...parts)=>{const key=JSON.stringify([kind,...parts]);if(!records.has(key)){const row=await core.get(t,kind,...parts)??null;budgetRecords.push([key,row]);branchRawSize(budget);records.set(key,row);}return records.get(key);};
  const entry=clone(await base(store,core,t));budget.entry=entry;branchRawSize(budget);const read=await editReadSet(t,id);budget.read=read;branchRawSize(budget);const receipt=await t.get('operationReceipts',protocol.descriptor.value.domainOperationId)??null;
  if(entry.library?.sealed)fail('BNS_HUMAN_BRANCH_UNAVAILABLE');
  const head=await get('head','humanLibraryMember','entry:'+id);if(head?.purged||head?.revisions?.length!==1)fail('BNS_HUMAN_BRANCH_UNAVAILABLE');
  const current=await get('revision',head.revisions[0]);if(!current||current.redacted)fail('BNS_HUMAN_ANCESTRY_REQUIRED');
  const member=protocol.members.filter(m=>m.value.entityType==='entry');if(member.length!==1||member[0].parents.length!==1||member[0].value.after.id!==id||!equal(current.operation.parents,member[0].parents))fail('BNS_HUMAN_BRANCH_UNAVAILABLE');
  await core.requireHumanAncestry(t,[...protocol.operations,current.operation]);
  const operations=new Map(),groups=new Map(),queue=[...protocol.operations,current.operation];let size=0;
  while(queue.length){const op=queue.pop();if(operations.has(op.revisionId))continue;operations.set(op.revisionId,op);size+=bytes(op).length;if(operations.size>CORE_LIMITS.batch||size>CORE_LIMITS.batchBytes)fail('BNS_HUMAN_GRAPH_LIMIT');
   if(op.type==='humanLibraryMember'){
    if(!['entry','history'].includes(op.value.entityType))fail('BNS_HUMAN_BRANCH_UNAVAILABLE');
    const descriptorHead=await get('head','humanLibraryCommit',op.value.logicalCommitId);if(descriptorHead?.purged||descriptorHead?.revisions?.length!==1){if(op.value.logicalCommitId!==protocol.descriptor.value.id)fail('BNS_HUMAN_ANCESTRY_REQUIRED');}else{const row=await get('revision',descriptorHead.revisions[0]);if(!row||row.redacted)fail('BNS_HUMAN_ANCESTRY_REQUIRED');queue.push(row.operation);}
   }else if(op.type==='humanLibraryCommit'){
    if(op.value.kind!=='entry'&&!(op.value.kind==='entry-edit'&&branchBodyOnly(op.value.request)))fail('BNS_HUMAN_BRANCH_UNAVAILABLE');
    const group=[];for(const ref of op.value.members){let m=protocol.operations.find(x=>x.revisionId===ref.revisionId);if(!m){const row=await get('revision',ref.revisionId);if(!row||row.redacted)fail('BNS_HUMAN_ANCESTRY_REQUIRED');m=row.operation;}queue.push(m);group.push(m);}const complete=[...group,op];if(!groups.has(op.value.id)){budgetGroups.push([op.value.id,complete]);branchRawSize(budget);}groups.set(op.value.id,complete);
   }else fail('BNS_HUMAN_BRANCH_UNAVAILABLE');
   for(const parentId of op.parents){const row=await get('revision',parentId);if(!row||row.redacted)fail('BNS_HUMAN_ANCESTRY_REQUIRED');queue.push(row.operation);}
   if(!protocol.operations.some(x=>x.revisionId===op.revisionId)){const r=await get('receipt',op.operationId);if(r?.digest!==op.revisionId)fail('BNS_HUMAN_ANCESTRY_REQUIRED');}
  }
  for(const op of protocol.operations){if(await get('receipt',op.operationId)||await get('sequence',op.deviceId,String(op.sequence).padStart(16,'0')))fail('BNS_HUMAN_BRANCH_UNAVAILABLE');}
  const parent=operations.get(member[0].parents[0]);if(parent?.type!=='humanLibraryMember'||parent.entityId!==member[0].entityId||!equal(parent.value.after,member[0].value.before)||!equal(parent.value.after,current.operation.value.before))fail('BNS_HUMAN_BRANCH_UNAVAILABLE');
  const parentGroup=groups.get(parent.value.logicalCommitId);if(!parentGroup)fail('BNS_HUMAN_ANCESTRY_REQUIRED');
  const row=read.row;if(!row||row.lifecycle!=='active'||row.bodyBinding!=='thought'||row.provenanceType!=='user_created'||row.organizationRevision!==0||row.dependencyRevision!==0||row.sourceRecordIds.length||row.inputRefs.length||row.topics.length||read.placements||read.provenance||read.dependencies)fail('BNS_HUMAN_BRANCH_UNAVAILABLE');branchNoIndex(read);
  const mapping=await get('humanMapping','entry:'+id);if(!mapping||mapping.revisionId!==current.operation.revisionId||!equal(mapping.local,physical('entry',row))||!equal(mapping.wire,physical('entry',current.operation.value.after)))fail('BNS_HUMAN_BRANCH_UNAVAILABLE');
  const currentGroup=groups.get(current.operation.value.logicalCommitId);if(!currentGroup||currentGroup.at(-1).value.kind!=='entry-edit')fail('BNS_HUMAN_BRANCH_UNAVAILABLE');
  const currentHistory=[];for(const h of read.history){const hhead=await get('head','humanLibraryMember','history:'+h.id);if(hhead?.purged||hhead?.revisions?.length!==1)fail('BNS_HUMAN_BRANCH_UNAVAILABLE');const hrow=await get('revision',hhead.revisions[0]),hmap=await get('humanMapping','history:'+h.id);if(!hrow||hrow.redacted||!currentGroup.some(m=>m.revisionId===hrow.operation.revisionId)||hmap?.revisionId!==hrow.operation.revisionId||!equal(hmap.local,physical('history',h))||!equal(hmap.wire,physical('history',hrow.operation.value.after)))fail('BNS_HUMAN_BRANCH_UNAVAILABLE');currentHistory.push(hrow.operation);}
  if(currentGroup.filter(m=>m.value?.entityType==='history').length!==read.history.length)fail('BNS_HUMAN_BRANCH_UNAVAILABLE');
  const history=[],parentPhysicalHistory=[];budget.parentPhysicalHistory=parentPhysicalHistory;branchRawSize(budget);for(const m of parentGroup.filter(x=>x.value?.entityType==='history')){const h=m.value.after,map=await get('humanMapping','history:'+h.id),actual=await t.get('revisions',h.id);parentPhysicalHistory.push(actual??null);branchRawSize(budget);if(!map||!actual||h.kind!=='library_entry'||h.entityId!==id||!equal(map.local,physical('history',actual)))fail('BNS_HUMAN_BRANCH_UNAVAILABLE');history.push({...clone(h),...clone(map.local)});}
  if(!history.length)fail('BNS_HUMAN_BRANCH_UNAVAILABLE');history.sort((a,b)=>a.sequence-b.sequence);
  const parentReceipt=await t.get('operationReceipts',parentGroup.at(-1).value.domainOperationId)??null;if(parentReceipt?.namespace!=='thought-library'||parentReceipt.schemaVersion!==1||parentReceipt.id!==parentGroup.at(-1).value.domainOperationId||parentReceipt.ownerId!==id||parentReceipt.digest!==parentGroup.at(-1).value.ownerRequestDigest||parentReceipt.result?.id!==id||parentReceipt.result?.revision!==parent.value.after.revision||!Number.isSafeInteger(parentReceipt.operationSequence)||parentReceipt.operationSequence<2)fail('BNS_HUMAN_BRANCH_UNAVAILABLE');
  const result={input:protocol.operations,controlValues:fence.controlValues,entry,read,receipt,records:[...records].sort(([a],[b])=>a<b?-1:a>b?1:0),parentReceipt,parent:parent.value.after,history,parentPhysicalHistory,mapping,currentEntry:current.operation,currentHistory,groups:[...groups].sort(([a],[b])=>a<b?-1:a>b?1:0)};
  if(branchRawSize(result)>BRANCH_RAW_BYTES)fail('BNS_HUMAN_GRAPH_LIMIT');return result;
}
async function branchQualifyGroups(core,raw){
 for(const [,group]of raw.groups){await validateHumanCommitGroup(group,core.datasetId);await restoreHumanRequest(group.at(-1).value);}
}
async function branchQualifyPortable(raw){
 // The current original typed read must itself match its accepted canonical
 // closure, not merely occupy the same physical slots or revision numbers.
 if(!equal(normalizePhysical('entry',await portableHumanEntity('entry',raw.read.row,raw.read.history,raw.entry.secret)),normalizePhysical('entry',raw.currentEntry.value.after)))fail('BNS_HUMAN_BRANCH_UNAVAILABLE');
 for(const row of raw.read.history){const op=raw.currentHistory.find(m=>m.value.after.id===row.id);if(!op||!equal(normalizePhysical('history',await portableHumanEntity('history',row,raw.read.history,raw.entry.secret)),normalizePhysical('history',op.value.after)))fail('BNS_HUMAN_BRANCH_UNAVAILABLE');}
}
async function branchQualifyCurrent(store,core,raw,request,fence,retention=null){
 const currentEntry=clone(raw.entry),current={store,core,state:{base:clone(raw.entry),thoughts:[clone(raw.read.row)],revisions:clone(raw.read.history),placements:[],topics:[],indices:[],epoch:raw.read.epoch,operationReceipts:raw.receipt?[clone(raw.receipt)]:[]}};
 let guard;futureEntries.set(currentEntry,current);
 try{
  if(!equal(humanFutureRead(currentEntry,store,core,'entry-edit',request),{base:raw.entry,read:raw.read,receipt:raw.receipt}))fail('BNS_HUMAN_BRANCH_UNAVAILABLE');
  guard=await prepareHumanEntryEditPlan(store,core,request,currentEntry);
 }finally{futureEntries.delete(currentEntry);if(guard&&guard.conflict!==true)plans.delete(guard);}
 if(retention)nativeRetentionFence(retention);else branchFence(store,core,fence);
 if(guard.duplicate||guard.conflict!==true)fail('BNS_HUMAN_BRANCH_UNAVAILABLE');
}
async function branchQualifyReplay(store,core,protocol,raw,request){
 const row={...clone(raw.parent),...clone(raw.mapping.local)},entry=clone(raw.entry);row.exactSignature=await keyedHash(entry.secret,['body',row.type,row.thoughtText]);
 if(request.expectedRevision!==row.revision||request.expectedFieldRevisions&&request.expectedFieldRevisions.body!==row.fieldRevisions.body)fail('BNS_HUMAN_BRANCH_UNAVAILABLE');
 const replay=bindHumanReplayEntry(clone(entry),protocol.descriptor.value.events,protocol.descriptor.value.allocation),allocation=prepareHumanAllocation(store,replay),signature=await keyedHash(entry.secret,['body',row.type,request.changes.body]);
 const computed=computeHumanEntryEditState(request,{base:entry,read:{...clone(raw.read),row,history:clone(raw.history)},receipt:null},entry,protocol.descriptor.value.ownerRequestDigest,signature,allocation);allocation.seal();
 if(!equal(allocation.events(),protocol.descriptor.value.events)||computed.touchedTopics.length||computed.touchedIndices.length)fail('BNS_HUMAN_BRANCH_UNAVAILABLE');
 const planned=[{type:'entry',before:row,after:computed.row},...computed.history.map(h=>({type:'history',before:raw.history.find(x=>x.id===h.id)??null,after:h}))];if(planned.length!==protocol.members.length)fail('BNS_HUMAN_BRANCH_UNAVAILABLE');
 for(const item of planned){const member=protocol.members.find(m=>m.value.entityType===item.type&&m.value.after.id===item.after.id);if(!member)fail('BNS_HUMAN_BRANCH_UNAVAILABLE');for(const side of ['before','after'])if(!equal(normalizePhysical(item.type,await portableHumanEntity(item.type,item[side],computed.history,entry.secret)),normalizePhysical(item.type,member.value[side])))fail('BNS_HUMAN_BRANCH_UNAVAILABLE');}
}
async function branchQualify(store,core,protocol,raw,fence){
 await branchQualifyGroups(core,raw);await branchQualifyPortable(raw);
 const request=await restoreHumanRequest(protocol.descriptor.value);branchFence(store,core,fence);
 await branchQualifyCurrent(store,core,raw,request,fence);await branchQualifyReplay(store,core,protocol,raw,request);
 branchFence(store,core,fence);return fence;
}
export async function captureHumanBranchSemanticWitness(store,core,completeGroup){
 const state=branchState(store);if(state.busy)fail('BNS_HUMAN_BRANCH_BUSY');state.busy=true;try{
  // Reserve one half of the aggregate bound for this capture/read buffer.
  branchReady(store,core);branchRawSize(completeGroup);const pendingBytes=branchRawSize([completeGroup,completeGroup,store.controlCache],BRANCH_BYTES);branchTrim(state,Math.min(BRANCH_RAW_BYTES,BRANCH_BYTES-pendingBytes));
  let input=clone(completeGroup);const fence=await branchBarrier(store,core),protocol=await validateHumanCommitGroup(input,core.datasetId);input=null;if(protocol.descriptor.value.kind!=='entry-edit'||!branchBodyOnly(protocol.descriptor.value.request)||protocol.descriptor.value.allocation.indexGenerationCount!==0)fail('BNS_HUMAN_BRANCH_UNAVAILABLE');
  const raw=await branchRaw(store,core,protocol,fence),size=branchRawSize(raw);state.candidateBytes=size;
  // Candidate plus retained snapshots occupy at most one half; the final
  // independently captured reread may occupy the other half, even on a race.
  branchTrim(state,BRANCH_RAW_BYTES-size);while(state.handles.length>=BRANCH_HANDLES)branchForget(state,state.handles[0]);
  const finalFence=await branchQualify(store,core,protocol,raw,fence),fresh=await branchRaw(store,core,protocol,finalFence);if(!equal(raw,fresh))fail('BNS_HUMAN_CHANGED');branchFence(store,core,finalFence);
  const cap=Object.freeze({});branchWitnesses.set(cap,{kind:'semantic',store,core,raw,size,binding:finalFence.binding,control:finalFence.control,controlValues:raw.controlValues});state.handles.push(cap);state.bytes+=size;state.candidateBytes=0;return cap;
 }finally{state.candidateBytes=0;state.busy=false;}
}
export async function revalidateHumanBranchSemanticWitness(store,core,witness){
 const p=branchWitnesses.get(witness);if(!p||p.kind!=='semantic'||p.store!==store||p.core!==core)fail('BNS_HUMAN_BRANCH_WITNESS_REQUIRED');const state=branchState(store);if(state.busy)fail('BNS_HUMAN_BRANCH_BUSY');state.busy=true;try{
  const pendingBytes=branchRawSize([p.raw.input,p.raw.input,store.controlCache],BRANCH_BYTES);branchTrim(state,Math.min(BRANCH_RAW_BYTES,BRANCH_BYTES-pendingBytes),witness);
  const fence=await branchBarrier(store,core,p.binding);if(fence.control!==p.control||!equal(fence.controlValues,p.controlValues))fail('BNS_HUMAN_CHANGED');const protocol=await validateHumanCommitGroup(clone(p.raw.input),core.datasetId),fresh=await branchRaw(store,core,protocol,fence);if(!equal(p.raw,fresh))fail('BNS_HUMAN_CHANGED');branchFence(store,core,fence);
 }catch(error){branchForget(state,witness);throw error;}finally{state.busy=false;}
}

// Unused first-sibling retention. All three handle kinds share the original
// store registry, byte budget and in-flight slot; a witness is consumed once.
const retentionKind=p=>p&&(p.kind==='retention'||p.kind==='duplicate');
const immutable=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const item of Object.values(value))immutable(item);Object.freeze(value);}return value;};
function retainedProtocol(input){const descriptor=input.find(op=>op.type==='humanLibraryCommit');return {operations:input,descriptor,members:descriptor.value.members.map(ref=>input.find(op=>op.revisionId===ref.revisionId))};}
function retentionProtocolShape(protocol,core){
 const entries=protocol.members.filter(op=>op.value.entityType==='entry'),d=protocol.descriptor.value;
 if(d.kind!=='entry-edit'||!branchBodyOnly(d.request)||d.allocation.indexGenerationCount!==0||entries.length!==1||protocol.operations.some(op=>op.deviceId===core.deviceId)||protocol.members.some(op=>!['entry','history'].includes(op.value.entityType)))fail('BNS_HUMAN_BRANCH_UNAVAILABLE');
 for(const row of [entries[0].value.before,entries[0].value.after])if(!row||row.lifecycle!=='active'||row.bodyBinding!=='thought'||row.provenanceType!=='user_created'||row.organizationRevision!==0||row.dependencyRevision!==0||row.sourceRecordIds.length||row.inputRefs.length||row.topics.length)fail('BNS_HUMAN_BRANCH_UNAVAILABLE');
 for(const op of protocol.members.filter(op=>op.value.entityType==='history'))if(op.value.after.kind!=='library_entry'||op.value.after.entityId!==entries[0].value.after.id)fail('BNS_HUMAN_BRANCH_UNAVAILABLE');
}
function retentionRegister(state,p,previous=null){
 if(previous)branchForget(state,previous);branchTrim(state,BRANCH_RAW_BYTES-p.size);while(state.handles.length>=BRANCH_HANDLES)branchForget(state,state.handles[0]);
 const cap=Object.freeze({});branchWitnesses.set(cap,p);state.handles.push(cap);state.bytes+=p.size;return cap;
}
async function retentionProtocolRead(t,core,protocol,budget){
 const records=[],expected=[];budget.protocol={records,expected};branchRawSize(budget);
 const get=async(kind,...parts)=>{const row=await core.get(t,kind,...parts)??null;records.push([JSON.stringify([kind,...parts]),row]);branchRawSize(budget);return row;};
 await get('generation');for(const device of new Set(protocol.operations.map(op=>op.deviceId))){await get('frontier',device);await get('device',device);}
 let present=0;
 for(const op of protocol.operations){
  const receipt=await get('receipt',op.operationId),sequence=await get('sequence',op.deviceId,String(op.sequence).padStart(16,'0')),revision=await get('revision',op.revisionId),entityRevision=await get('entityRevision',op.type,op.entityId,op.revisionId),head=await get('head',op.type,op.entityId);
  const quarantine=await get('quarantine',op.operationId),pending=await get('pending',op.operationId),entityPending=await get('entityPending',op.type,op.entityId,op.operationId);
  if(quarantine||pending||entityPending||head?.purged)fail('BNS_HUMAN_BRANCH_UNAVAILABLE');
  if(receipt||sequence||revision||entityRevision){
   if(receipt?.digest!==op.revisionId||receipt.deviceId!==op.deviceId||receipt.sequence!==op.sequence||sequence?.operationId!==op.operationId||sequence.digest!==op.revisionId||revision?.redacted||!equal(revision?.operation??null,op)||entityRevision?.revisionId!==op.revisionId)fail('BNS_OPERATION_COLLISION');present++;
  }
  const heads=[];for(const id of head?.revisions||[]){let replaced=false;for(const parent of op.parents)if(await core.ancestor(t,id,parent)){replaced=true;break;}if(!replaced)heads.push(id);}
  expected.push({type:op.type,entityId:op.entityId,revisions:[...new Set([...heads,op.revisionId])].sort()});branchRawSize(budget);
 }
 if(present!==0&&present!==protocol.operations.length)fail('BNS_OPERATION_COLLISION');return {present,records,expected};
}
export async function prepareHumanBranchRetention(store,core,witness){
 const previous=branchWitnesses.get(witness),state=branchState(store);if(previous?.kind!=='semantic'||previous.store!==store||previous.core!==core||!state.handles.includes(witness))fail('BNS_HUMAN_BRANCH_WITNESS_REQUIRED');
 if(state.busy)fail('BNS_HUMAN_BRANCH_BUSY');state.busy=true;
 try{
  branchTrim(state,BRANCH_RAW_BYTES,witness);const fence=await branchBarrier(store,core,previous.binding);if(fence.control!==previous.control||!equal(fence.controlValues,previous.controlValues))fail('BNS_HUMAN_CHANGED');
  const protocol=retainedProtocol(previous.raw.input);retentionProtocolShape(protocol,core);
  const raw=await core.transaction(false,async t=>{const semantic=await branchRawInTransaction(store,core,protocol,fence,t);if(!equal(semantic,previous.raw))fail('BNS_HUMAN_CHANGED');const value={semantic};const cut=await retentionProtocolRead(t,core,protocol,value);if(cut.present)fail('BNS_HUMAN_CHANGED');return value;});branchFence(store,core,fence);
  const size=branchRawSize(raw),entryMember=protocol.members.find(op=>op.value.entityType==='entry'),entryHead=raw.protocol.expected.find(x=>x.type===entryMember.type&&x.entityId===entryMember.entityId);
  if(entryHead?.revisions.length!==2||raw.protocol.expected.some(head=>head.revisions.length>2))fail('BNS_HUMAN_BRANCH_UNAVAILABLE');
  immutable(raw);const group=immutable({descriptor:protocol.descriptor.revisionId,members:protocol.members.map(op=>op.revisionId)});
  return retentionRegister(state,{kind:'retention',store,core,raw,size,binding:fence.binding,control:fence.control,controlValues:fence.controlValues,fence,protocol,group,claimed:false},witness);
 }catch(error){branchForget(state,witness);throw error;}finally{state.busy=false;}
}
export async function prepareHumanBranchRetentionRetry(store,core,input){
 const state=branchState(store);if(state.busy)fail('BNS_HUMAN_BRANCH_BUSY');state.busy=true;
 try{
  branchReady(store,core);const pendingBytes=branchRawSize([input,input,store.controlCache],BRANCH_BYTES);branchTrim(state,Math.min(BRANCH_RAW_BYTES,BRANCH_BYTES-pendingBytes));
  const fence=await branchBarrier(store,core),protocol=await validateHumanCommitGroup(input,core.datasetId);
  retentionProtocolShape(protocol,core);
  const raw=await core.transaction(false,async t=>{branchFence(store,core,fence);const value={input:protocol.operations,controlValues:fence.controlValues,base:await base(store,core,t)};const cut=await retentionProtocolRead(t,core,protocol,value);return {raw:value,present:cut.present};});branchFence(store,core,fence);
  if(!raw.present)return null;const size=branchRawSize(raw.raw);immutable(raw.raw);const group=immutable({descriptor:protocol.descriptor.revisionId,members:protocol.members.map(op=>op.revisionId)});
  return retentionRegister(state,{kind:'duplicate',store,core,raw:raw.raw,size,binding:fence.binding,control:fence.control,controlValues:fence.controlValues,fence,protocol,group,claimed:false});
 }finally{state.busy=false;}
}
export function claimHumanBranchRetention(core,retention){
 const p=branchWitnesses.get(retention);if(!retentionKind(p)||p.core!==core||p.claimed)fail('BNS_HUMAN_RETENTION_REQUIRED');const state=branchState(p.store);if(!state.handles.includes(retention))fail('BNS_HUMAN_RETENTION_REQUIRED');if(state.busy)fail('BNS_HUMAN_BRANCH_BUSY');
 state.busy=true;p.claimed=true;try{branchFence(p.store,core,p.fence);p.claim=Object.freeze({repository:p.binding.repository,database:p.binding.database,namespace:p.kind==='retention'?p.raw.semantic.entry.namespace:p.raw.base.namespace,group:p.group});return p.claim;}catch(error){branchForget(state,retention);state.busy=false;throw error;}
}
export function assertHumanBranchRetentionCurrent(core,retention){const p=branchWitnesses.get(retention);if(!retentionKind(p)||!p.claimed||p.core!==core)fail('BNS_HUMAN_RETENTION_REQUIRED');if(p.nativeWork||p.finalControlCheck)nativeRetentionFence(p);else branchFence(p.store,core,p.fence);}
export async function requireHumanBranchRetentionInTransaction(t,core,retention){
 const p=branchWitnesses.get(retention);if(!retentionKind(p)||!p.claimed||p.core!==core)fail('BNS_HUMAN_RETENTION_REQUIRED');requireHumanRetentionOwnerPhase(core,t,retention,p.group);nativeRetentionFence(p);
 const r=nativeRetentionWorks.get(retention);if(!r||r!==p.nativeWork||r.phase!=='prepared'||p.nativeEffects?.validateEntered)fail('BNS_HUMAN_RETENTION_REQUIRED');p.nativeEffects.validateEntered=true;
 const scope=requireRepositoryTransactionScope(core.repository,t),property=branchDescriptor(t,'tx');if(!property||!('value'in property)||retentionNative.db.call(property.value)!==scope.database||scope.database!==p.binding.database)fail('BNS_HUMAN_RETENTION_REQUIRED');
 r.phase='validating';r.frames++;try{await nativeRetentionPump(r,property.value,false);nativeRetentionCurrent(r);
  if(p.kind==='retention'){const expected=calculateHumanRetentionHeadVectors(p.protocol.operations,r.certificate.heads,r.certificate.revisions);if(!expected.complete||!equal(expected.expected,p.raw.protocol.expected))fail('BNS_HUMAN_CHANGED');}
  p.nativeEffects.authenticated=true;r.phase='validated';nativeRetentionFence(p);
  return {protocol:p.protocol,expected:p.raw.protocol.expected,duplicate:p.kind==='duplicate'};
 }finally{r.frames--;}
}
export function finishHumanBranchRetention(core,retention,claim){const p=branchWitnesses.get(retention);if(!retentionKind(p)||p.core!==core||!p.claimed||p.claim!==claim)fail('BNS_HUMAN_RETENTION_REQUIRED');const state=branchState(p.store);branchForget(state,retention);if(!state.effectReservation)state.busy=false;}

// BEGIN private retention expected effects.
// Fixed private preparation calls this calculation; it authenticates no native cut.
const EFFECT_SCAN_BYTES=16384;
const effectCutFail=()=>fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');
function effectCurrent(r){if(r.phase!=='building'||!r.accounted||r.state.effectReservation!==r||r.owner.effectReservation!==r||branchWitnesses.get(r.cap)!==r.owner)fail('BNS_HUMAN_RETENTION_REQUIRED');}
function effectPreflight(p,r){
 const raw=p.raw,protocol=p.protocol;if(!raw||!protocol||!Array.isArray(protocol.operations)||!Array.isArray(protocol.members))effectCutFail();
 const n=protocol.operations.length,d=protocol.descriptor;if(n<2||n>CORE_LIMITS.batch||protocol.members.length!==n-1||!d||!protocol.operations.includes(d)||!Array.isArray(d.value?.members)||d.value.members.length!==n-1)effectCutFail();
 const dataset=d.datasetId,device=d.deviceId,base=p.kind==='retention'?raw.semantic?.entry:raw.base;
 if(!base||typeof base.namespace!=='string'||base.namespace.length>128||typeof dataset!=='string'||!/^[A-Za-z0-9_-]{8,128}$/.test(dataset)||!(base.namespace==='initial'||/^[A-Za-z0-9_-]{8,128}$/.test(base.namespace))||typeof device!=='string'||device===p.binding.deviceId||dataset!==p.binding.datasetId||!Array.isArray(raw.protocol?.records)||raw.protocol.records.length!==8*n+3)effectCutFail();
 if(!Array.isArray(raw.protocol.expected)||raw.protocol.expected.length!==n)effectCutFail();
 const stats=r.scanStats;branchRawMeasure(raw,BRANCH_RAW_BYTES,stats,true);
 let opBytes=0,w=0,v=0,B=0,b=0;
 const prefixLength=8+dataset.length; // exact 'bns:v1:' + dataset + ':'
 const addKey=(kind,...parts)=>{let chars=prefixLength+11+base.namespace.length+1+kind.length+1;for(let i=0;i<parts.length;i++){if(typeof parts[i]!=='string'||parts[i].length>512)effectCutFail();chars+=9*parts[i].length+(i?1:0);}B+=chars;b=Math.max(b,chars);};
 // This bounded preflight uses only existing strings/scalars; no key encoding.
 for(let i=0;i<n;i++){
  const op=protocol.operations[i];if(!op||op.datasetId!==dataset||op.deviceId!==device||op.kind!=='put'||op.actor!=='user'||!Number.isSafeInteger(op.sequence)||op.sequence<1||!Object.isFrozen(op))effectCutFail();
  for(let j=0;j<i;j++){const prior=protocol.operations[j];if(prior.operationId===op.operationId||prior.revisionId===op.revisionId||prior.sequence===op.sequence||prior.type===op.type&&prior.entityId===op.entityId)effectCutFail();}
  const size=branchRawMeasure(op,CORE_LIMITS.batchBytes,stats,true);opBytes+=size;w=Math.max(w,size);v=Math.max(v,stats.nodes+stats.slots+16);
  addKey('revision',op.revisionId);addKey('entityRevision',op.type,op.entityId,op.revisionId);addKey('head',op.type,op.entityId);addKey('receipt',op.operationId);addKey('sequence',op.deviceId,String(op.sequence).padStart(16,'0'));
  addKey('quarantine',op.operationId);addKey('pending',op.operationId);addKey('entityPending',op.type,op.entityId,op.operationId);
  let head=null;for(const h of raw.protocol.expected)if(h.type===op.type&&h.entityId===op.entityId){if(head)effectCutFail();head=h;}
  if(!head||!Array.isArray(head.revisions)||p.kind==='retention'&&head.revisions.length>2||!head.revisions.includes(op.revisionId)||head.revisions.some((value,index)=>typeof value!=='string'||!/^[a-f0-9]{64}$/.test(value)||head.revisions.indexOf(value)!==index))effectCutFail();
  const hs=branchRawMeasure(head,BRANCH_RAW_BYTES,stats,true);w=Math.max(w,hs);v=Math.max(v,stats.nodes+stats.slots+16);
 }
 if(opBytes>CORE_LIMITS.batchBytes)fail('BNS_HUMAN_GRAPH_LIMIT');
 for(let i=0;i<protocol.members.length;i++){const op=protocol.members[i],ref=d.value.members[i];if(!protocol.operations.includes(op)||ref.type!==op.type||ref.entityId!==op.entityId||ref.revisionId!==op.revisionId||ref.operationId!==op.operationId)effectCutFail();}
 addKey('generation');addKey('frontier',device);addKey('device',device);
 let frontier=null,frontierCount=0;const frontierSelector=JSON.stringify(['frontier',device]);
 // Selector length is a fixed <=128-character identity plus literals, covered F.
 for(const record of raw.protocol.records){if(!Array.isArray(record)||record.length!==2||typeof record[0]!=='string')effectCutFail();if(record[0]===frontierSelector){frontier=record[1];frontierCount++;}const size=branchRawMeasure(record[1],BRANCH_RAW_BYTES,stats,true);w=Math.max(w,size);v=Math.max(v,stats.nodes+stats.slots+16);}
 if(frontierCount!==1)effectCutFail();let f=0,frontierBytes=4;
 if(frontier!==null){if(!Number.isSafeInteger(frontier.frontier)||frontier.frontier<0||!Array.isArray(frontier.ranges)||frontier.ranges.length>CORE_LIMITS.gapRanges)effectCutFail();f=frontier.ranges.length;for(const pair of frontier.ranges)if(!Array.isArray(pair)||pair.length!==2||pair.some(x=>!Number.isSafeInteger(x)||x<0))effectCutFail();frontierBytes=branchRawMeasure(frontier,BRANCH_RAW_BYTES,stats,true);}
 const fresh=p.kind==='retention';let T=raw.protocol.records.length+1;
 if(fresh){const s=raw.semantic;if(!s||!Array.isArray(s.records)||!Array.isArray(s.history)||!Array.isArray(s.parentPhysicalHistory)||s.parentPhysicalHistory.length!==s.history.length||!s.read||!Array.isArray(s.read.history)||!Array.isArray(s.read.placementRows)||s.read.history.length>128)effectCutFail();T=raw.protocol.records.length+s.records.length+s.parentPhysicalHistory.length+10;for(const record of s.records){if(!Array.isArray(record)||record.length!==2||typeof record[0]!=='string')effectCutFail();B+=record[0].length;b=Math.max(b,record[0].length);}}
 const u=f+n,K=5*n+2;w=Math.max(w+b+256,b+256+40*u);v=Math.max(v,8*u+32);
 const M=384*K+192*T+8*(K+T)+2*B+32768+(fresh?128*u+256:0);
 const S=Math.max(EFFECT_SCAN_BYTES,12*b+128,3*w+128*v+4096,4*w+128*v+4096,...(fresh?[3*frontierBytes+768*u+16384]:[]));
 if(!Number.isSafeInteger(M+S))fail('BNS_HUMAN_GRAPH_LIMIT');
 return {n,K,T,M,S,prefix:'bns:v1:'+dataset+':',namespace:base.namespace,device,fresh};
}
async function effectBuild(p,r,m){
 let records=new Map(),positive=new Set(),rows=[],unchanged=[],absent=[];
 try{
  for(const [key,row]of p.raw.protocol.records){if(records.has(key))effectCutFail();records.set(key,row);}
  const get=(kind,...parts)=>{const key=JSON.stringify([kind,...parts]);if(!records.has(key))effectCutFail();return records.get(key);};
  let presence=0;const group=p.protocol,ops=group.operations;
  for(const op of ops){
   const receipt=get('receipt',op.operationId),seq=get('sequence',op.deviceId,String(op.sequence).padStart(16,'0')),rev=get('revision',op.revisionId),entity=get('entityRevision',op.type,op.entityId,op.revisionId);if(get('head',op.type,op.entityId)?.purged)effectCutFail();
   if(get('quarantine',op.operationId)||get('pending',op.operationId)||get('entityPending',op.type,op.entityId,op.operationId))effectCutFail();
   if(receipt!==null||seq!==null||rev!==null||entity!==null){if(receipt?.digest!==op.revisionId||receipt.deviceId!==op.deviceId||receipt.sequence!==op.sequence||seq?.operationId!==op.operationId||seq.digest!==op.revisionId||rev?.redacted||!equal(rev?.operation??null,op)||entity?.revisionId!==op.revisionId)effectCutFail();presence++;}
  }
  if(presence!==(m.fresh?0:m.n))effectCutFail();
  let generation=get('generation'),frontier=get('frontier',m.device);get('device',m.device);
  if(m.fresh){let value=generation?.value||0;for(let i=0;i<m.n;i++){value=value+1;if(!Number.isSafeInteger(value)||value<0)effectCutFail();}generation={value};for(let i=0;i<m.n;i++){const op=i===m.n-1?group.descriptor:group.members[i];frontier={...acceptSequence(frontier?{frontier:frontier.frontier,ranges:frontier.ranges}:null,op.sequence),deviceId:m.device};}}
  const add=async(kind,parts,payload)=>{
   effectCurrent(r);const selector=JSON.stringify([kind,...parts]),id=protocolPhysicalId(m.prefix,m.namespace,kind,parts);if(positive.has(selector))effectCutFail();positive.add(selector);
   const row=m.fresh?{...payload,id}:get(kind,...parts);
   if(!m.fresh&&row!==null&&row.id!==id)effectCutFail();
   if(m.fresh){if(kind==='frontier'){for(const pair of row.ranges)Object.freeze(pair);Object.freeze(row.ranges);}Object.freeze(row);}
   const hash=await digest(row);effectCurrent(r);rows.push(Object.freeze({id,kind,row,digest:hash}));
  };
  for(let i=0;i<m.n;i++){
   const op=i===m.n-1?group.descriptor:group.members[i];let head;for(const h of p.raw.protocol.expected)if(h.type===op.type&&h.entityId===op.entityId)head=h;
   await add('revision',[op.revisionId],{operation:op,redacted:false});await add('entityRevision',[op.type,op.entityId,op.revisionId],{revisionId:op.revisionId});await add('head',[op.type,op.entityId],{type:op.type,entityId:op.entityId,revisions:head.revisions,purged:false,fence:null});
   await add('receipt',[op.operationId],{digest:op.revisionId,deviceId:op.deviceId,sequence:op.sequence});await add('sequence',[op.deviceId,String(op.sequence).padStart(16,'0')],{operationId:op.operationId,digest:op.revisionId});
  }
  await add('frontier',[m.device],frontier);await add('generation',[],generation);
  const facts=list=>{for(const record of list){if(m.fresh&&positive.has(record[0]))continue;(record[1]===null?absent:unchanged).push(Object.freeze({selector:record[0],record}));}};facts(p.raw.protocol.records);
  if(m.fresh){
   const s=p.raw.semantic;facts(s.records);for(const h of s.parentPhysicalHistory)unchanged.push(Object.freeze({selector:'parent-history',value:h}));
   for(const [selector,value]of [['base-without-generation',s.entry],['entry',s.read.row],['history-range',s.read.history],['placement-range',s.read.placementRows],['provenance-count',s.read.provenance],['dependency-count',s.read.dependencies],['thought-epoch',s.read.epoch],['incoming-domain-receipt',s.receipt],['parent-domain-receipt',s.parentReceipt],['selected-history-closure',s.currentHistory]])unchanged.push(Object.freeze({selector,value,...(selector==='base-without-generation'?{excludeGeneration:true}:{})}));
  }else unchanged.push(Object.freeze({selector:'base',value:p.raw.base}));
  if(rows.length!==m.K||unchanged.length+absent.length>m.T)effectCutFail();
  return Object.freeze({mode:m.fresh?'fresh':'duplicate',rows:Object.freeze(rows),unchanged:Object.freeze(unchanged),absent:Object.freeze(absent),writes:m.fresh?7*m.n:0,retainedCharge:m.M});
 }finally{records=null;positive=null;rows=null;unchanged=null;absent=null;}
}
async function deriveRetentionExpectedEffects(core,cap){
 const p=branchWitnesses.get(cap);if(!retentionKind(p)||p.core!==core||!p.claimed||!p.claim||p.effectReservation||p.effectPlan)fail('BNS_HUMAN_RETENTION_REQUIRED');
 const state=branchState(p.store);if(!state.busy||!state.handles.includes(cap)||state.effectReservation)fail('BNS_HUMAN_BRANCH_BUSY');
 if(state.bytes+state.candidateBytes+EFFECT_SCAN_BYTES>BRANCH_BYTES)fail('BNS_HUMAN_GRAPH_LIMIT');p.size+=EFFECT_SCAN_BYTES;state.bytes+=EFFECT_SCAN_BYTES;
 let r;try{
  r={owner:p,cap,state,phase:'scan',charged:EFFECT_SCAN_BYTES,retained:0,scratch:EFFECT_SCAN_BYTES,accounted:true,scanStats:{nodes:0,slots:0}};p.effectReservation=r;state.effectReservation=r;
  const m=effectPreflight(p,r);if(state.bytes+state.candidateBytes+m.M+m.S-EFFECT_SCAN_BYTES>BRANCH_BYTES)fail('BNS_HUMAN_GRAPH_LIMIT');
  const delta=m.M+m.S-EFFECT_SCAN_BYTES;p.size+=delta;state.bytes+=delta;r.charged=m.M+m.S;r.retained=m.M;r.scratch=m.S;r.phase='building';
  const result=await effectBuild(p,r,m);effectCurrent(r);p.effectPlan=result;p.size-=m.S;state.bytes-=m.S;r.charged=m.M;r.phase='retained';state.effectReservation=null;return result;
 }finally{
  if(!r){p.size-=EFFECT_SCAN_BYTES;state.bytes-=EFFECT_SCAN_BYTES;}
  else if(r.phase==='revoked'){state.bytes-=r.deferredCharge;r.deferredCharge=0;r.accounted=false;r.phase='released';if(state.effectReservation===r)state.effectReservation=null;p.effectReservation=null;state.busy=false;}
  else if(r.phase!=='retained'){if(r.accounted){p.size-=r.charged;state.bytes-=r.charged;r.accounted=false;}p.effectReservation=null;p.effectPlan=null;if(state.effectReservation===r)state.effectReservation=null;r.phase='released';}
 }
}
// END private retention expected effects.

// Native-retention preparation stays in this original owner; only the original
// Core call opens its fixed preparation phase. No user entry is added here.
const NATIVE_RETENTION_FIXED=128*1024,nativeRetentionWorks=new WeakMap();
function nativeRetentionFailure(primary,secondary=[]){
 if(!secondary.length)return primary;if(primary!==null&&(typeof primary==='object'||typeof primary==='function'))try{const previous=Array.isArray(primary.retentionCleanupErrors)?primary.retentionCleanupErrors:[];Object.defineProperty(primary,'retentionCleanupErrors',{value:Object.freeze([...previous,...secondary]),configurable:true});return primary;}catch(error){return new AggregateError([primary,...secondary,error],'Retention primary and cleanup failures',{cause:primary});}
 return new AggregateError([primary,...secondary],'Retention primary and cleanup failures',{cause:primary});
}
function nativeRetentionCurrent(r){if(!r.accounted||r.phase==='revoked'||r.state.effectReservation!==r||r.owner.nativeWork!==r||branchWitnesses.get(r.cap)!==r.owner)fail('BNS_HUMAN_RETENTION_REQUIRED');}
function nativeRetentionMeasure(value){const stats={};const B=branchRawMeasure(value,BRANCH_RAW_BYTES,stats,true);return {B,T:stats.units,V:stats.nodes,E:stats.slots};}
function nativeRetentionSlot(kind,m){const copy=2*m.T+128*m.V+8*m.E+128,canonical=copy+16*m.E+2*m.B+128;return kind==='clone'?copy:kind==='canonical'?canonical:canonical+m.B+128;}
function nativeRetentionResize(r,bytes){
 nativeRetentionCurrent(r);const delta=bytes-r.charged;if(delta>0&&r.state.bytes+r.state.candidateBytes+delta>BRANCH_BYTES)fail('BNS_HUMAN_GRAPH_LIMIT');r.owner.size+=delta;r.state.bytes+=delta;r.charged=bytes;r.peak=Math.max(r.peak,bytes);
}
function nativeRetentionBegin(p,cap){
 const state=branchState(p.store);if(p.nativeWork||state.effectReservation||!state.busy||!state.handles.includes(cap))fail('BNS_HUMAN_RETENTION_REQUIRED');
 if(state.bytes+state.candidateBytes+NATIVE_RETENTION_FIXED>BRANCH_BYTES)fail('BNS_HUMAN_GRAPH_LIMIT');
 p.size+=NATIVE_RETENTION_FIXED;state.bytes+=NATIVE_RETENTION_FIXED;
 const r={owner:p,cap,state,phase:'preparing',accounted:true,charged:NATIVE_RETENTION_FIXED,retained:0,peak:NATIVE_RETENTION_FIXED,frames:0,certificate:null};p.nativeWork=r;state.effectReservation=r;nativeRetentionWorks.set(cap,r);return r;
}
async function nativeRetentionPhase(r,name,slots,run,extra=0){
 nativeRetentionCurrent(r);let price=extra;for(const [,count,kind,value]of slots)price+=count*nativeRetentionSlot(kind,nativeRetentionMeasure(value));
 nativeRetentionResize(r,NATIVE_RETENTION_FIXED+r.retained+price);r.frames++;r.currentPhase=name;
 let primary,failed=false;try{await run();nativeRetentionCurrent(r);}catch(error){primary=error;failed=true;}finally{r.frames--;r.currentPhase=null;}
 try{if(r.phase!=='revoked')nativeRetentionResize(r,NATIVE_RETENTION_FIXED+r.retained);}catch(error){if(failed){r.cleanupErrors??=[];r.cleanupErrors.push(error);}else{primary=error;failed=true;}}
 if(failed){primary=nativeRetentionFailure(primary,r.cleanupErrors);r.primaryFailure={value:primary};throw primary;}
}
function nativeRetentionKeep(r,bytes){nativeRetentionCurrent(r);if(!Number.isSafeInteger(bytes)||bytes<0||NATIVE_RETENTION_FIXED+r.retained+bytes>r.charged)fail('BNS_HUMAN_GRAPH_LIMIT');r.retained+=bytes;}

function nativeRetentionCausalSlots(p){
 // No vectors or key decoding before the phase debit. R bounds recorded/pure
 // maps and seen/required sets; E counts all queued parent occurrences, even
 // duplicates, so cycles/diamonds do not get an alias discount.
 const s=p.raw.semantic;let R=s.records.length,G=0,Q=s.groups.length,E=0,H=0;
 for(const [,group]of s.groups)G+=group.length;
 for(const [,row]of s.records)if(Array.isArray(row?.operation?.parents))E+=row.operation.parents.length;
 for(const [,row]of p.raw.protocol.records)if(Array.isArray(row?.revisions))H+=row.revisions.length;
 const O=p.protocol.operations.length;
 // Two revision maps + original record map, operations/group maps, required
 // and per-traversal seen sets, DFS queue capacity, head Set/sort/output slots.
 return 3*96*R+96*G+96*Q+2*64*R+16*(E+1)+128*O+32*(H+O)+16384+216*R+152*O;
}
function nativeRetentionCausalCertificate(p){
 const s=p.raw.semantic,protocol=p.protocol,records=new Map(),operations=new Map(),groups=new Map();
 const record=(kind,...parts)=>{const key=JSON.stringify([kind,...parts]);if(!records.has(key))fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');return records.get(key);};
 for(const [key,value]of s.records){if(records.has(key))fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');records.set(key,value);}
 for(const [id,group]of s.groups){const descriptor=group.at(-1);if(descriptor?.value.kind!=='entry'&&!(descriptor?.value.kind==='entry-edit'&&branchBodyOnly(descriptor.value.request)))fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');if(groups.has(id)||group.at(-1)?.value.id!==id)fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');groups.set(id,group);for(const op of group){if(operations.has(op.revisionId)&&!equal(operations.get(op.revisionId),op))fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');operations.set(op.revisionId,op);}}
 if(operations.size>CORE_LIMITS.batch||s.read.history.length>128)fail('BNS_HUMAN_GRAPH_LIMIT');
 if(!groups.has(protocol.descriptor.value.id))fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');
 for(const op of protocol.operations)if(!operations.has(op.revisionId)||!equal(operations.get(op.revisionId),op))fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');
 for(const op of operations.values()){
  if(!['humanLibraryMember','humanLibraryCommit'].includes(op.type))fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');
  if(op.type==='humanLibraryMember'){
   const group=groups.get(op.value.logicalCommitId);if(!group||!group.some(value=>value.revisionId===op.revisionId))fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');
   const head=record('head','humanLibraryCommit',op.value.logicalCommitId);
   if(head?.purged||head?.revisions?.length!==1){if(op.value.logicalCommitId!==protocol.descriptor.value.id)fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');}
   else{const row=record('revision',head.revisions[0]);if(!row||row.redacted||row.operation.revisionId!==group.at(-1).revisionId)fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');}
  }
  for(const id of op.parents){const row=record('revision',id);if(!row||row.redacted||!operations.has(id)||!equal(row.operation,operations.get(id))||row.operation.type!==op.type||row.operation.entityId!==op.entityId)fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');}
  if(!protocol.operations.some(value=>value.revisionId===op.revisionId)&&record('receipt',op.operationId)?.digest!==op.revisionId)fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');
 }
 const incoming=protocol.members.filter(op=>op.value.entityType==='entry');if(incoming.length!==1||incoming[0].parents.length!==1)fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');
 const id=incoming[0].value.after.id,head=record('head','humanLibraryMember','entry:'+id),current=head?.revisions?.length===1?record('revision',head.revisions[0]):null;
 if(head?.purged||!current||current.redacted||!equal(current.operation,s.currentEntry)||!equal(current.operation.parents,incoming[0].parents))fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');
 const parent=operations.get(incoming[0].parents[0]);if(!parent||parent.entityId!==incoming[0].entityId||!equal(parent.value.after,incoming[0].value.before)||!equal(parent.value.after,current.operation.value.before))fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');
 const owner=s.read.row;if(!owner||owner.lifecycle!=='active'||owner.bodyBinding!=='thought'||owner.provenanceType!=='user_created'||owner.organizationRevision!==0||owner.dependencyRevision!==0||owner.sourceRecordIds.length||owner.inputRefs.length||owner.topics.length||s.read.placements||s.read.placementRows.length||s.read.provenance||s.read.dependencies||s.read.topics.length||s.receipt!==null)fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');branchNoIndex(s.read);
 const mapping=record('humanMapping','entry:'+id);if(!mapping||!equal(mapping,s.mapping)||!equal(parent.value.after,s.parent)||mapping.revisionId!==current.operation.revisionId||!equal(mapping.local,physical('entry',s.read.row))||!equal(mapping.wire,physical('entry',current.operation.value.after)))fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');
 const currentGroup=groups.get(current.operation.value.logicalCommitId);if(!currentGroup||currentGroup.at(-1).value.kind!=='entry-edit')fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');
 for(const h of s.read.history){const head=record('head','humanLibraryMember','history:'+h.id),row=head?.revisions?.length===1?record('revision',head.revisions[0]):null,map=record('humanMapping','history:'+h.id);if(head?.purged||!row||row.redacted||!s.currentHistory.some(op=>equal(op,row.operation))||!currentGroup.some(op=>op.revisionId===row.operation.revisionId)||map?.revisionId!==row.operation.revisionId||!equal(map.local,physical('history',h))||!equal(map.wire,physical('history',row.operation.value.after)))fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');}
 if(currentGroup.filter(op=>op.value?.entityType==='history').length!==s.read.history.length||s.currentHistory.length!==s.read.history.length)fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');
 const parentGroup=groups.get(parent.value.logicalCommitId);if(!parentGroup)fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');let parentHistory=0;
 for(const op of parentGroup){if(op.value?.entityType!=='history')continue;parentHistory++;const h=s.history.find(row=>row.id===op.value.after.id),map=record('humanMapping','history:'+op.value.after.id);if(!h||!map||op.value.after.kind!=='library_entry'||op.value.after.entityId!==id||!equal(h,{...op.value.after,...map.local})||!equal(map.local,physical('history',h)))fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');}
 if(parentHistory===0||parentHistory!==s.history.length)fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');
 const receipt=s.parentReceipt;if(receipt?.namespace!=='thought-library'||receipt.schemaVersion!==1||receipt.id!==parentGroup.at(-1).value.domainOperationId||receipt.ownerId!==id||receipt.digest!==parentGroup.at(-1).value.ownerRequestDigest||receipt.result?.id!==id||receipt.result?.revision!==parent.value.after.revision||!Number.isSafeInteger(receipt.operationSequence)||receipt.operationSequence<2)fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');
 const revisions=[];for(const [key,row]of s.records){const parts=JSON.parse(key);if(parts[0]==='revision')revisions.push([parts[1],row]);}
 const heads=[];for(const op of protocol.operations){const key=JSON.stringify(['head',op.type,op.entityId]),value=p.raw.protocol.records.find(record=>record[0]===key);if(!value)fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');heads.push({type:op.type,entityId:op.entityId,head:value[1]});}
 const result=calculateHumanRetentionHeadVectors(protocol.operations,heads,revisions);if(!result.complete||!equal(result.expected,p.raw.protocol.expected))fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');
 return {heads,revisions,required:result.required};
}

export async function prepareHumanRetentionNativeEffects(core,retention){
 const p=branchWitnesses.get(retention);if(!retentionKind(p)||p.core!==core||!p.claimed||p.nativeWork)fail('BNS_HUMAN_RETENTION_REQUIRED');requireHumanRetentionEffectPreparation(core,retention,p.group);
 // The earlier pure helper owns/refunds its own active reservation. It creates
 // no native authority; native preparation starts only after that frame ends.
 await deriveRetentionExpectedEffects(core,retention);if(branchWitnesses.get(retention)!==p)fail('BNS_HUMAN_RETENTION_REQUIRED');
 const r=nativeRetentionBegin(p,retention),raw=p.raw,protocol=p.protocol;
 try{
  await nativeRetentionPhase(r,'incoming-group',[['validated group',1,'clone',protocol.operations],['validation canonical/UTF8',2,'digest',protocol.operations]],async()=>{await validateHumanCommitGroup(protocol.operations,p.binding.datasetId);await restoreHumanRequest(protocol.descriptor.value);});
  if(p.kind==='retention'){
   const s=raw.semantic;
   for(const [,group]of s.groups)await nativeRetentionPhase(r,'complete-group',[['validated operations',1,'clone',group],['validator and request serialization',2,'digest',group]],async()=>{await validateHumanCommitGroup(group,p.binding.datasetId);await restoreHumanRequest(group.at(-1).value);});
   await nativeRetentionPhase(r,'current-portable',[['portable and normalize copies',3,'clone',s.read],['portable HMAC and equal',2,'digest',s.read]],()=>branchQualifyPortable(s));
   await nativeRetentionPhase(r,'current-guard',[['base/current/future/plan copies',5,'clone',s.entry],['row/field/finish/snapshot copies',6,'clone',s.read.row],['incoming-body copies in non-conflict failure path',6,'clone',protocol.descriptor.value.request.changes.body],['incoming-body normalize/equal in non-conflict failure path',3,'digest',protocol.descriptor.value.request.changes.body],['state/projection/compute histories',3,'clone',s.read.history],['request/plan copies',2,'clone',protocol.descriptor.value.request],['optional receipt copies',2,'clone',s.receipt],['base equality',2,'canonical',s.entry],['read projection equality',2,'canonical',s.read],['request hash',1,'digest',protocol.descriptor.value.request]],async()=>{const request=await restoreHumanRequest(protocol.descriptor.value);await branchQualifyCurrent(p.store,core,s,request,p.fence,p);});
   await nativeRetentionPhase(r,'parent-replay',[['base/replay entries',2,'clone',s.entry],['parent/field/finish/snapshot copies',6,'clone',s.parent],['incoming-body portions of field/finish/snapshot/portable copies',6,'clone',protocol.descriptor.value.request.changes.body],['incoming-body portable/normalize/equal work',3,'digest',protocol.descriptor.value.request.changes.body],['mapping merge',1,'clone',s.mapping.local],['read projection',1,'clone',s.read],['history input/computation',2,'clone',s.history],['events/replay/allocation copies',4,'clone',protocol.descriptor.value.events],['request restoration',1,'clone',protocol.descriptor.value.request],['row portable/normalize/equal',3,'digest',s.parent],['history portable/normalize/equal',3,'digest',s.history],['request HMAC',1,'digest',protocol.descriptor.value.request]],async()=>{const request=await restoreHumanRequest(protocol.descriptor.value);await branchQualifyReplay(p.store,core,protocol,s,request);});
   await nativeRetentionPhase(r,'causal-certificate',[['decoded selector/row vectors',2,'clone',s.records],['head/member equality work',2,'canonical',s.groups]],async()=>{const certificate=nativeRetentionCausalCertificate(p);let retained=16384+80*certificate.revisions.length+152*certificate.heads.length+8*certificate.required.length;for(const [id]of certificate.revisions)retained+=2*id.length;nativeRetentionKeep(r,retained);r.certificate=certificate;},nativeRetentionCausalSlots(p));
  }
  nativeRetentionAvailable();const nativeBudget=nativeRetentionTaskBudget(p);nativeRetentionResize(r,NATIVE_RETENTION_FIXED+r.retained+nativeBudget.M+nativeBudget.S);nativeRetentionCompileTasks(p,r);nativeRetentionKeep(r,nativeBudget.M+nativeBudget.S);r.nativeBudget=nativeBudget;
  await nativeRetentionPhase(r,'final-control-fence',[['two control canonical workspaces',2,'canonical',p.controlValues]],async()=>{nativeRetentionFence(p);});r.phase='prepared';p.nativeEffects={work:r,causal:r.certificate,authenticated:false};
 }finally{r.preparationDone=true;}
}

export async function finalizeHumanRetentionNativeEffects(core,retention,claim){
 requireHumanRetentionEffectFinalization(core,retention,claim);
 const r=nativeRetentionWorks.get(retention),p=branchWitnesses.get(retention);
 if(r){
  // These are private drain promises created only by this owner. A failed
  // proof of drain retains the owner/index/charge; no force-clear path exists.
  let drainError,drainFailed=false;if(r.unobservedRead)fail('BNS_HUMAN_RETENTION_REQUIRED');if(r.drain){try{await r.drain;}catch(error){drainError=error;drainFailed=true;}requireRepositoryHumanRetentionReadDrained(r.owner.binding.repository,r.readScope,r.readTransaction,r.readObserver);}if(r.frames!==0)fail('BNS_HUMAN_RETENTION_REQUIRED');
  r.readScope=null;r.readTransaction=null;r.readObserver=null;r.drain=null;
  r.certificate=null;r.tasks=null;r.stores=null;r.certificateAfter=null;r.currentResult=null;r.owner.nativeEffects=null;
  if(r.phase==='revoked'){r.state.bytes-=r.deferredCharge;r.deferredCharge=0;r.owner.effectReservation=null;r.owner.nativeWork=null;r.state.busy=false;}
  else{const finalCharge=16384+2*nativeRetentionSlot('canonical',nativeRetentionMeasure(r.owner.controlValues));r.owner.finalControlCheck=true;r.owner.size-=r.charged-finalCharge;r.state.bytes-=r.charged-finalCharge;r.owner.nativeWork=null;}
  r.accounted=false;r.charged=0;r.phase='released';if(r.state.effectReservation===r)r.state.effectReservation=null;nativeRetentionWorks.delete(retention);
  if(drainFailed&&!r.primaryFailure)throw drainError;return branchWitnesses.get(retention)===r.owner;
 }
 if(p&&(p.core!==core||p.claim!==claim))fail('BNS_HUMAN_RETENTION_REQUIRED');return !!p;
}

// Fixed platform reads only. Captured writes are deliberately absent: all
// original write/finalizer hooks remain observable.
const retentionNative=(()=>{
 const method=(name,key)=>globalThis[name]?.prototype?.[key],get=(name,key)=>globalThis[name]&&Object.getOwnPropertyDescriptor(globalThis[name].prototype,key)?.get;
 return Object.freeze({transaction:method('IDBDatabase','transaction'),store:method('IDBTransaction','objectStore'),abort:method('IDBTransaction','abort'),db:get('IDBTransaction','db'),mode:get('IDBTransaction','mode'),storeNames:get('IDBTransaction','objectStoreNames'),databaseStoreNames:get('IDBDatabase','objectStoreNames'),listLength:get('DOMStringList','length'),listItem:method('DOMStringList','item'),txError:get('IDBTransaction','error'),storeGet:method('IDBObjectStore','get'),storeCount:method('IDBObjectStore','count'),index:method('IDBObjectStore','index'),storeCursor:method('IDBObjectStore','openCursor'),storeTransaction:get('IDBObjectStore','transaction'),storeName:get('IDBObjectStore','name'),storeKeyPath:get('IDBObjectStore','keyPath'),storeAutoIncrement:get('IDBObjectStore','autoIncrement'),storeIndexNames:get('IDBObjectStore','indexNames'),indexUnique:get('IDBIndex','unique'),indexMultiEntry:get('IDBIndex','multiEntry'),indexCount:method('IDBIndex','count'),indexCursor:method('IDBIndex','openCursor'),indexStore:get('IDBIndex','objectStore'),indexName:get('IDBIndex','name'),indexKeyPath:get('IDBIndex','keyPath'),result:get('IDBRequest','result'),error:get('IDBRequest','error'),ready:get('IDBRequest','readyState'),source:get('IDBRequest','source'),requestTransaction:get('IDBRequest','transaction'),cursorRequest:get('IDBCursor','request'),cursorSource:get('IDBCursor','source'),cursorKey:get('IDBCursor','key'),cursorPrimaryKey:get('IDBCursor','primaryKey'),cursorContinue:method('IDBCursor','continue'),cursorValue:get('IDBCursorWithValue','value'),bound:globalThis.IDBKeyRange?.bound?.bind(globalThis.IDBKeyRange),add:method('EventTarget','addEventListener'),remove:method('EventTarget','removeEventListener'),eventTarget:get('Event','target'),eventCurrent:get('Event','currentTarget')});
})();
function nativeRetentionAvailable(){for(const key in retentionNative)if(typeof retentionNative[key]!=='function')fail('BNS_HUMAN_RETENTION_REQUIRED');}
function nativeRetentionCausalReplaySlots(p){
 const certificate=p.nativeWork.certificate;let E=0,H=0;const R=certificate.revisions.length,O=certificate.heads.length;
 for(const [,row]of certificate.revisions)if(row)E+=row.operation.parents.length;
 for(const head of certificate.heads)H+=head.head?.revisions?.length||0;
 // Fresh second calculation allocates a NEW revision map, required/seen sets,
 // duplicate-edge DFS queue, expected/head Set/sort vectors and required array.
 // Already-retained certificate pairs/strings are not paid from this scratch.
 return 96*R+2*64*R+16*(E+1)+128*O+32*(H+O)+8*R+2*nativeRetentionSlot('canonical',nativeRetentionMeasure(p.raw.protocol.expected));
}
function nativeRetentionTaskBudget(p){
 const raw=p.raw,s=p.kind==='retention'?raw.semantic:null;let D=raw.protocol.records.length+8,Bkey=0,W=0,V=0,T=0;
 const value=row=>{const m=nativeRetentionMeasure(row);W=Math.max(W,m.B);V=Math.max(V,m.V+m.E);T=Math.max(T,m.T);};
 value(s?s.entry:raw.base);value(p.controlValues);
 for(const record of raw.protocol.records){Bkey+=9*record[0].length+512;value(record[1]);}
 for(const row of p.effectPlan.rows)value(row.row);
 if(s){D+=s.records.length+s.parentPhysicalHistory.length+7;for(const record of s.records){Bkey+=9*record[0].length+512;value(record[1]);}for(const row of s.read.history)value(row);for(const row of s.parentPhysicalHistory)value(row);value(s.parentReceipt);value(s.read.row);}
 // Fixed metadata keys, scalar wrappers and URI expansion are priced before
 // any concrete task/key/range vector is constructed.
 Bkey+=D*1024;W+=Math.min(Bkey,8192)+512;V+=64;T+=Math.min(Bkey,8192)+256;
 return {M:200*D+2*Bkey+32768,S:Math.max(NATIVE_RETENTION_FIXED,12*W+256*V+4*T+8192)+(s?nativeRetentionCausalReplaySlots(p):0),W,V,T};
}
function nativeRetentionCompileTasks(p,r){
 const b=p.kind==='retention'?p.raw.semantic.entry:p.raw.base,prefix='bns:v1:'+p.binding.datasetId+':',namespace=b.namespace,tasks=[],points=new Map(),after=new Map();
 for(const row of p.effectPlan.rows)after.set(row.id,row.row);
 const point=(store,key,before,view='row')=>{const identity=store+'\0'+key+'\0'+view;if(points.has(identity)){if(!equal(points.get(identity).before,before))fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');return;}const task={type:'point',store,key,before,after:store==='meta'&&view==='row'&&after.has(key)?after.get(key):before,view};points.set(identity,task);tasks.push(task);};
 const protocol=list=>{for(const [selector,row]of list){const [kind,...parts]=JSON.parse(selector);point('meta',protocolPhysicalId(prefix,namespace,kind,parts),row);}};
 protocol(p.raw.protocol.records);
 if(p.binding.fixedNamespace===null)point('meta',prefix+'active',namespace,'namespace');else if(p.binding.fixedNamespace!==namespace)fail('BNS_HUMAN_CHANGED');
 point('meta','recovery-restore-epoch',b.epoch,'value-null');point('meta','thought-suppression-key',b.secret,'value');point('meta','gate',b.settings,'gate');point('meta','revision-sequence',b.revision);point('meta','thought-sequence',b.sequence);point('meta','thought-library',b.library);
 if(p.kind==='retention'){
  const s=p.raw.semantic,id=p.protocol.descriptor.value.request.id;protocol(s.records);
  point('thoughts',id,s.read.row);point('meta','thought-epoch',s.read.epoch,'value-zero');point('operationReceipts',p.protocol.descriptor.value.domainOperationId,s.receipt);
  const parent=p.protocol.members.find(op=>op.value.entityType==='entry').parents[0],parentRow=r.certificate.revisions.find(([key])=>key===parent)?.[1],parentGroup=s.groups.find(([key])=>key===parentRow?.operation.value.logicalCommitId)?.[1];if(!parentGroup)fail('BNS_HUMAN_EFFECT_CUT_REQUIRED');
  point('operationReceipts',parentGroup.at(-1).value.domainOperationId,s.parentReceipt);
  for(const row of s.parentPhysicalHistory)point('revisions',row.id,row);
  tasks.push({type:'range',store:'revisions',index:'byList',indexPath:'listKey',prefix:['library_entry:'+id],rows:s.read.history});
  for(const [store,index,indexPath,range]of [['placements','byEntry',['entryId','topicId','layoutGeneration'],[id]],['provenance','byOwner',['ownerKind','ownerId','id'],['entry',id]],['dependencies','byTarget',['targetKind','targetId','id'],['entry',id]]])tasks.push({type:'count',store,index,indexPath,prefix:range,count:0});
 }
 for(const task of tasks){if(task.prefix)Object.freeze(task.prefix);Object.freeze(task);}r.tasks=Object.freeze(tasks);r.stores=Object.freeze([...new Set(tasks.map(task=>task.store))]);r.certificateAfter=after;
}
function nativeRetentionFence(p){
 const expected=nativeRetentionMeasure(p.controlValues),stats={},B=branchRawMeasure(p.store.controlCache,expected.B,stats,'native');
 if(B>expected.B||stats.nodes>expected.V||stats.slots>expected.E||stats.units>expected.T)fail('BNS_HUMAN_CHANGED');branchFence(p.store,p.core,p.fence);
}
function nativeRetentionDelivered(r,value){
 const stats={};const B=branchRawMeasure(value,r.nativeBudget.W,stats,'native');if(B>r.nativeBudget.W||stats.nodes+stats.slots>r.nativeBudget.V||stats.units>r.nativeBudget.T)fail('BNS_HUMAN_GRAPH_LIMIT');
}
// Existing returned values only; this neither reads storage nor grants a phase.
export function requireHumanRetentionDeliveredValue(core,retention,value){
 const p=branchWitnesses.get(retention),r=nativeRetentionWorks.get(retention);if(!retentionKind(p)||p.core!==core||!p.claimed||!r||r!==p.nativeWork||r.owner!==p||r.phase!=='validated'||!p.nativeEffects?.authenticated)fail('BNS_HUMAN_RETENTION_REQUIRED');nativeRetentionCurrent(r);nativeRetentionDelivered(r,value??null);
}
function nativeRetentionSource(transaction,task){
 const n=retentionNative,store=n.store.call(transaction,task.store);if(n.storeTransaction.call(store)!==transaction||n.storeName.call(store)!==task.store||n.storeKeyPath.call(store)!=='id')fail('BNS_HUMAN_RETENTION_REQUIRED');
 if(!task.index)return store;const index=n.index.call(store,task.index);const path=n.indexKeyPath.call(index),expected=task.indexPath;let same;if(Array.isArray(expected)){same=Array.isArray(path)&&path.length===expected.length;if(same)for(let i=0;i<expected.length;i++)if(path[i]!==expected[i]){same=false;break;}}else same=path===expected;if(n.indexStore.call(index)!==store||n.indexName.call(index)!==task.index||!same)fail('BNS_HUMAN_RETENTION_REQUIRED');return index;
}
function nativeRetentionPoint(r,task,row,after){
 const p=r.owner,expected=after?task.after:task.before;let actual=row;
 if(task.view==='namespace')actual=row?.namespace||'initial';
 else if(task.view==='value-null')actual=row?.value??null;
 else if(task.view==='value-zero')actual=row?.value||0;
 else if(task.view==='value')actual=row?.value;
 else if(task.view==='gate'){const settings=p.controlValues.settings;actual={...settings,enabled:row&&(row.epoch!==settings.epoch||row.enabled!==settings.enabled)?false:settings.enabled};}
 if(!equal(actual,expected))fail('BNS_HUMAN_CHANGED');
}
function nativeRetentionPump(r,transaction,after){
 const n=retentionNative;nativeRetentionCurrent(r);if(n.db.call(transaction)!==r.owner.binding.database||n.mode.call(transaction)!==(after?'readonly':'readwrite'))fail('BNS_HUMAN_RETENTION_REQUIRED');
 return new Promise((resolve,reject)=>{
  let position=0,ended=false,request=null,success=null,error=null;
  const clear=()=>{if(request){let first,failed=false;for(const [type,listener]of [['success',success],['error',error]])try{n.remove.call(request,type,listener);}catch(e){if(!failed){first=e;failed=true;}}request=null;success=null;error=null;if(failed)throw first;}};
  const failPump=e=>{if(ended)return;ended=true;try{clear();}catch(cleanup){r.cleanupErrors??=[];r.cleanupErrors.push(cleanup);}r.currentResult=null;reject(e);};
  const next=()=>{
   if(ended)return;
   try{
    nativeRetentionCurrent(r);if(position===r.tasks.length){ended=true;clear();resolve();return;}
    const task=r.tasks[position++],source=nativeRetentionSource(transaction,task);let count=0;
    const range=task.prefix?n.bound(task.prefix,[...task.prefix,[]],false,true):null;
    request=task.type==='point'?n.storeGet.call(source,task.key):task.type==='count'?n.indexCount.call(source,range):n.indexCursor.call(source,range);
    const valid=event=>event.isTrusted===true&&n.eventTarget.call(event)===request&&n.eventCurrent.call(event)===request;
    const identity=()=>{if(n.ready.call(request)!=='done'||n.source.call(request)!==source||n.requestTransaction.call(request)!==transaction)fail('BNS_HUMAN_RETENTION_REQUIRED');};
    error=event=>{try{if(!valid(event))return;identity();const actual=n.error.call(request);failPump(actual||new Error('Native retention request failed'));}catch(e){failPump(e);}};
    success=event=>{
     let result=null,cursor=null,more=false,finished=false;
     try{
      if(!valid(event))return;nativeRetentionCurrent(r);identity();result=n.result.call(request);
      if(task.type==='range'){
       cursor=result;
       if(!cursor){if(count!==task.rows.length)fail('BNS_HUMAN_CHANGED');finished=true;}
       else{
        if(n.cursorRequest.call(cursor)!==request||n.cursorSource.call(cursor)!==source)fail('BNS_HUMAN_RETENTION_REQUIRED');
        const expected=task.rows[count];if(!expected)fail('BNS_HUMAN_CHANGED');
        const key=n.cursorKey.call(cursor),primary=n.cursorPrimaryKey.call(cursor);nativeRetentionDelivered(r,key);nativeRetentionDelivered(r,primary);
        if(!equal(key,expected.listKey)||primary!==expected.id)fail('BNS_HUMAN_CHANGED');
        result=n.cursorValue.call(cursor);r.currentResult=result;nativeRetentionDelivered(r,result);if(!equal(result,expected))fail('BNS_HUMAN_CHANGED');count++;more=true;
       }
      }else if(task.type==='count'){if(result!==task.count)fail('BNS_HUMAN_CHANGED');finished=true;}
      else{result=result??null;r.currentResult=result;nativeRetentionDelivered(r,result);nativeRetentionPoint(r,task,result,after);finished=true;}
     }catch(e){failPump(e);}
     finally{result=null;r.currentResult=null;}
     if(ended)return;
     try{if(more)n.cursorContinue.call(cursor);else if(finished){clear();next();}}catch(e){failPump(e);}finally{cursor=null;}
    };
    n.add.call(request,'success',success);n.add.call(request,'error',error);
   }catch(e){failPump(e);}
  };
  next();
 });
}

export async function verifyHumanRetentionNativeCommitted(core,scope,retention){
 const p=branchWitnesses.get(retention),r=nativeRetentionWorks.get(retention);if(!retentionKind(p)||p.core!==core||!p.claimed||!r||r!==p.nativeWork||!p.nativeEffects?.authenticated||p.nativeEffects.postEntered)fail('BNS_HUMAN_RETENTION_REQUIRED');
 requireHumanRetentionClosingPhase(core,scope,retention,p.group);nativeRetentionCurrent(r);p.nativeEffects.postEntered=true;r.phase='verifying';
 const tx=retentionNative.transaction.call(p.binding.database,r.stores,'readonly');
 r.readTransaction=tx;r.unobservedRead=true;const observer=beginRepositoryHumanRetentionRead(p.binding.repository,scope,tx);r.unobservedRead=false;r.readScope=scope;r.readTransaction=tx;r.readObserver=observer;r.drain=awaitRepositoryHumanRetentionRead(p.binding.repository,scope,tx,observer);r.drain.catch(()=>{});
 let primary,failed=false;r.frames++;
 try{try{await nativeRetentionPump(r,tx,true);nativeRetentionCurrent(r);}catch(error){primary=error;failed=true;try{retentionNative.abort.call(tx);}catch(abortError){r.cleanupErrors??=[];r.cleanupErrors.push(abortError);}}
  try{await r.drain;}catch(error){if(failed){r.cleanupErrors??=[];r.cleanupErrors.push(error);}else{primary=error;failed=true;}}
  if(failed){primary=nativeRetentionFailure(primary,r.cleanupErrors);r.primaryFailure={value:primary};throw primary;}r.phase='verified';
 }finally{r.frames--;}
}
// Fixed original-owner current projection capture. No selected rows, callback,
// reader, budget override or portable body can be supplied by a caller.
const currentProjectionWorks=new WeakMap(),currentProjectionCaps=new WeakMap(),projectionQuarantine=new Map();
const PROJECTION_FRAME=384*1024,PROJECTION_SEMANTIC=512*1024;
const projectionFreeze=Object.freeze,projectionOwn=Object.hasOwn;
const projectionGeneratorNext=Object.getPrototypeOf(Object.getPrototypeOf((function*(){})())).next;
const projectionCompare=globalThis.IDBFactory?.prototype.cmp,projectionFactory=globalThis.indexedDB;
const projectionTables=Object.freeze([...humanTables,'libraryMigrationItems','librarySearchTerms','provenance','dependencies']);
const projectionPrefixes=Object.freeze(['personalTopicName:','topicKeepSeparate:','thought-read-index:','memory:topic:','memory:section:']);
const projectionPoints=Object.freeze(['gate','recovery-restore-epoch','thought-suppression-key','revision-sequence','thought-sequence','thought-library','thought-epoch','library-search-rebuild']);
const projectionRequired=()=>fail('BNS_HUMAN_PROJECTION_REQUIRED');
const projectionUint8=globalThis.Uint8Array,projectionTypedPrototype=Object.getPrototypeOf(projectionUint8.prototype);
const projectionByteLength=Object.getOwnPropertyDescriptor(projectionTypedPrototype,'byteLength').get,projectionByteTag=Object.getOwnPropertyDescriptor(projectionTypedPrototype,Symbol.toStringTag).get;
const projectionByteSet=projectionUint8.prototype.set,projectionByteSlice=projectionUint8.prototype.slice;
function projectionBoundedBytes(value,expected,maximum){
 let length,tag;try{length=projectionByteLength.call(value);tag=projectionByteTag.call(value);}catch{fail('BNS_OBJECT_INTEGRITY');}
 // Authenticate primitive size before any additional JS buffer allocation.
 if(tag!=='Uint8Array'||length!==expected||!Number.isSafeInteger(expected)||expected<1||expected>maximum)fail('BNS_OBJECT_INTEGRITY');
 const result=new projectionUint8(expected);projectionByteSet.call(result,value);
 // Original readObject's subsequent fixed slice cannot call a supplied own
 // method or supplied species constructor. Its size is now authenticated.
 Object.defineProperties(result,{slice:{value:projectionByteSlice},constructor:{value:undefined}});return result;
}
function projectionBoundedTransport(transport,profile){
 return {
  async putImmutable(ref,data){const expected=ref.encodedBytes;const copy=projectionBoundedBytes(data,expected,profile.encoded);return transport.putImmutable(clone(ref),copy);},
  async get(ref){const expected=ref.encodedBytes;const supplied=await transport.get(clone(ref));return projectionBoundedBytes(supplied,expected,profile.encoded);}
 };
}
function projectionMeasure(value,frozen=false){const stats={};const B=branchRawMeasure(value,BRANCH_RAW_BYTES,stats,frozen);return {B,T:stats.units,V:stats.nodes,E:stats.slots};}
function projectionRowMeasure(r,value,frozen='native'){return r.sourceWorking?measureSourceWorkingPhysicalTree(value):projectionMeasure(value,frozen);}
const projectionIndexSchema=r=>r.mixedIndexInspection?mixedCurrentIndexSchema():sourceWorkingCurrentIndexSchema;
const projectionPhysicalIndexKey=(r,store,index,row)=>r.mixedIndexInspection?mixedCurrentPhysicalIndexKey(store,index,row):sourceWorkingPhysicalIndexKey(store,index,row);
// The original clone/tree and canonical slots are used for these exact trees.
// Fixed frames pay finite selector, listener, meter-stack, 128/768 vectors/maps
// and one descriptor/builder/key-generator frame, not initial native cloning.
function projectionTreeCharge(m){return 2*m.T+128*m.V+8*m.E+128;}
function projectionCanonicalCharge(m){return projectionTreeCharge(m)+16*m.E+2*m.B+128;}
function projectionReserve(r,scratch=0){
 const charge=PROJECTION_FRAME+r.owned+(r.transient||0)+(r.fixedScratch||0)+scratch;
 if(charge>8*1024*1024){
  try{fail('BNS_HUMAN_GRAPH_LIMIT');}catch(error){
   // Body-free failure evidence for the unfinished mixed compiler. Keep the
   // original code/limit/refusal; expose no rows, keys, IDs or private secret.
   if(r.mixedCompilationInspection)error.message+=' '+JSON.stringify({limit:8*1024*1024,charge,owned:r.owned,transient:r.transient||0,fixed:r.fixedScratch||0,scratch,phase:r.phase});throw error;
  }
 }
 resizeHumanQualificationLease(r.work,charge);
}
function projectionDeepFreeze(value){if(!value||typeof value!=='object')return;for(const key in value)if(projectionOwn(value,key))projectionDeepFreeze(value[key]);projectionFreeze(value);}
function projectionCurrent(r){r.storeAssert(r.store);if(r.revoked||r.closed||!r.work||r.sourceWorking&&r.retainedParent&&(r.retainedParent.revoked||r.retainedParent.released))projectionRequired();if(r.sourceWorking)requireSourceWorkingStoreBinding(r.store,r.core,r.binding);else branchReady(r.store,r.core,r.binding);if(r.store.tail!==r.tail||r.store.controlCache!==r.control||r.store.pendingControl)fail('BNS_HUMAN_CHANGED');}
function projectionKeep(r,value,transfer=false){
 const m=projectionRowMeasure(r,value),charge=projectionTreeCharge(m);
 r.owned+=charge;if(transfer)r.transient-=charge;try{projectionReserve(r);}catch(error){r.owned-=charge;if(transfer)r.transient+=charge;throw error;}
 projectionDeepFreeze(value);return value;
}
function projectionEqual(r,a,b,scratch=0){const am=projectionRowMeasure(r,a,false),bm=projectionRowMeasure(r,b,false);projectionReserve(r,scratch+projectionCanonicalCharge(am)+projectionCanonicalCharge(bm));try{return r.sourceWorking?equalSourceWorkingPhysicalTree(a,b):equal(a,b);}finally{projectionReserve(r,scratch);}}
function projectionGroupCutEqual(r,a,b){
 // The controlled raw schema is a finite set of arrays/points. Compare every
 // complete ordered leaf with the unchanged original equality, instead of
 // making two additional whole-database canonical copies at once.
 const lists=(x,y)=>x.length===y.length&&x.every((row,i)=>projectionEqual(r,row,y[i]));
 if(a.namespace!==b.namespace)return false;
 if(r.sourceWorking){
  for(const name of r.group.stores)if(!lists(a.rows[name],b.rows[name]))return false;
  for(const [name,definitions]of Object.entries(projectionIndexSchema(r)))for(const index of Object.keys(definitions))if(!lists(a.indices[name][index],b.indices[name][index]))return false;
  const keys=Object.keys(a.points);if(keys.length!==Object.keys(b.points).length)return false;for(const key of keys)if(!projectionOwn(b.points,key)||!projectionEqual(r,a.points[key],b.points[key]))return false;
  return true;
 }
 for(const name of projectionTables)if(!lists(a.rows[name],b.rows[name]))return false;
 for(const prefix of projectionPrefixes)if(!lists(a.prefixes[prefix],b.prefixes[prefix]))return false;
 const keys=Object.keys(a.points),expected=Object.keys(b.points);if(keys.length!==expected.length)return false;
 for(const key of keys)if(!projectionOwn(b.points,key)||!projectionEqual(r,a.points[key],b.points[key]))return false;
 return lists(a.receiptOrder,b.receiptOrder)&&lists(a.placementOrder,b.placementOrder)&&lists(a.groupMeta,b.groupMeta);
}
function projectionFence(r){projectionCurrent(r);const actual=projectionRowMeasure(r,r.control),expected=projectionRowMeasure(r,r.controlValues,true);if(actual.B>expected.B||actual.T>expected.T||actual.V>expected.V||actual.E>expected.E||!projectionEqual(r,r.control,r.controlValues))fail('BNS_HUMAN_CHANGED');}
function projectionSource(tx,task,r){
 const n=retentionNative,store=n.store.call(tx,task.store);
 if(n.storeTransaction.call(store)!==tx||n.storeName.call(store)!==task.store||n.storeKeyPath.call(store)!=='id')projectionRequired();
 if(r.mixedIndexInspection&&n.storeAutoIncrement.call(store)!==false)projectionRequired();
 if(r.sourceWorking&&Object.hasOwn(projectionIndexSchema(r),task.store)){
  const names=n.storeIndexNames.call(store),definitions=projectionIndexSchema(r)[task.store];
  if(n.listLength.call(names)!==Object.keys(definitions).length)projectionRequired();
  for(let i=0;i<n.listLength.call(names);i++)if(!Object.hasOwn(definitions,n.listItem.call(names,i)))projectionRequired();
 }
 if(!task.index)return store;
 const index=n.index.call(store,task.index),path=n.indexKeyPath.call(index),spec=r.sourceWorking?projectionIndexSchema(r)[task.store][task.index]:null,expected=spec?spec.path:LIBRARY_INDEXES[task.store][task.index];
 if(spec){if(n.indexStore.call(index)!==store||n.indexName.call(index)!==task.index||n.indexUnique.call(index)!==spec.unique||n.indexMultiEntry.call(index)!==spec.multiEntry||!projectionEqual(r,path,expected))projectionRequired();return index;}
 if(n.indexStore.call(index)!==store||n.indexName.call(index)!==task.index||!Array.isArray(path)||path.length!==expected.length||path.some((x,i)=>x!==expected[i]))projectionRequired();
 return index;
}
function projectionRange(task){
 if(task.prefix){const p=task.prefix;return retentionNative.bound(p,p.slice(0,-1)+String.fromCharCode(p.charCodeAt(p.length-1)+1),false,true);}
 if(task.parts)return retentionNative.bound(task.parts,[...task.parts,[]],false,true);
 return null;
}
function projectionTasks(r){
 const tasks=[];
 if(r.sourceWorking){
  for(const name of r.group.stores){
   const limit=r.mixedIndexInspection?mixedIndexPrimaryLimit(name):!sourceWorkingCurrentNonemptyStores.includes(name)?0:name==='meta'?4096:name==='revisions'?96:name==='operationReceipts'||name==='invalidations'?2:1,target=r.raw.rows[name];
   tasks.push({kind:'count',store:name,limit,target,zero:limit===0});tasks.push({kind:'cursor',store:name,limit,target});
  }
  for(const [name,definitions]of Object.entries(projectionIndexSchema(r)))for(const index of Object.keys(definitions)){
   const limit=r.mixedIndexInspection?4096:128,target=r.raw.indices[name][index];tasks.push({kind:'count',store:name,index,limit,target,borrow:true});tasks.push({kind:'cursor',store:name,index,limit,target,borrow:true});
  }
  tasks.push({kind:'point',store:'meta',key:r.binding.prefix+'active',active:true});return tasks;
 }
 if(r.group){
  // Fixed finite Group profile, internal to the original capture owner. The
  // complete primary meta inventory closes public Core.rows/get omissions.
  tasks.push({kind:'count',store:'meta',limit:4096,target:r.raw.groupMeta});
  tasks.push({kind:'cursor',store:'meta',limit:4096,target:r.raw.groupMeta});
  for(const name of r.group.emptyStores)tasks.push({kind:'count',store:name,limit:0,target:[],zero:true});
 }
 for(const name of projectionTables){const limit=name==='libraryMigrationItems'?768:name==='librarySearchTerms'||name==='provenance'||name==='dependencies'?0:128;
  tasks.push({kind:'count',store:name,limit,target:r.raw.rows[name],zero:limit===0});
  tasks.push({kind:'cursor',store:name,limit,target:r.raw.rows[name]});
 }
 for(const p of projectionPrefixes){const target=r.raw.prefixes[p],limit=p.startsWith('memory:')?0:p==='thought-read-index:'?129:128;
  tasks.push({kind:'count',store:'meta',prefix:p,limit,target});tasks.push({kind:'cursor',store:'meta',prefix:p,limit,target});
 }
 for(const key of projectionPoints)tasks.push({kind:'point',store:'meta',key});
 tasks.push({kind:'point',store:'meta',key:r.binding.prefix+'active',active:true});
 return tasks;
}
function projectionOrderedTasks(r,tasks){
 if(r.sourceWorking)return;
 const raw=r.raw;
 for(const row of raw.rows.thoughts){if(typeof row.id!=='string'||row.id.length>512)projectionRequired();const view={ownerId:row.id,keys:[]};raw.receiptOrder.push(view);tasks.push({kind:'count',store:'operationReceipts',index:'byOwner',parts:['thought-library',row.id],limit:128,target:view.keys,borrow:true});tasks.push({kind:'cursor',store:'operationReceipts',index:'byOwner',parts:['thought-library',row.id],limit:128,target:view.keys,borrow:true});}
 for(const topic of raw.rows.topics){if(typeof topic.id!=='string'||topic.id.length>512||!Number.isSafeInteger(topic.activeLayoutGeneration)||topic.activeLayoutGeneration<0)projectionRequired();const view={topicId:topic.id,keys:[]};raw.placementOrder.push(view);tasks.push({kind:'count',store:'placements',index:'byTopicOrder',parts:[topic.id,topic.activeLayoutGeneration,0],limit:128,target:view.keys,borrow:true});tasks.push({kind:'cursor',store:'placements',index:'byTopicOrder',parts:[topic.id,topic.activeLayoutGeneration,0],limit:128,target:view.keys,borrow:true});}
}
function projectionExpectedKey(row,path){return Array.isArray(path)?path.map(key=>row[key]):row[path];}
function projectionPump(r,t){
 const n=retentionNative,tx=t.tx,identity=requireRepositoryTransactionScope(r.binding.repository,t);
 if(!identity.nativeTransaction||identity.database!==r.binding.database||n.db.call(tx)!==r.binding.database||!['readonly','readwrite'].includes(n.mode.call(tx))||n.mode.call(tx)!==identity.mode)projectionRequired();
 requireRepositoryTransactionDataMethods(r.binding.repository,t);r.scope=t;r.identity=identity;
 if(r.group){
  if(identity.mode!=='readonly')projectionRequired();
  for(const list of [n.storeNames.call(tx),n.databaseStoreNames.call(r.binding.database)]){
   if(n.listLength.call(list)!==37)projectionRequired();
   for(let i=0;i<37;i++){const name=n.listItem.call(list,i);if(typeof name!=='string'||name.length>128||!r.group.stores.includes(name))projectionRequired();}
  }
 }
 const tasks=projectionTasks(r),counts=new Map();
 return new Promise((resolve,reject)=>{
  let position=0,ended=false,request=null,success=null,error=null,ordered=false;
  const clear=()=>{const failures=[];if(request)for(const [type,listener]of [['success',success],['error',error]])try{n.remove.call(request,type,listener);}catch(e){failures.push(e);}if(failures.length){r.listenersCleared=false;r.failedRequest={request,success,error};throw new AggregateError(failures,'Projection request listener cleanup failed');}request=null;success=null;error=null;r.failedRequest=null;r.listenersCleared=true;};
  const failed=e=>{if(ended)return;ended=true;try{clear();}catch(cleanup){r.cleanupErrors.push(cleanup);}reject(e);};
  const next=()=>{
   try{
    projectionCurrent(r);
    if(position===tasks.length){if(!ordered){ordered=true;projectionOrderedTasks(r,tasks);}if(position===tasks.length){ended=true;clear();resolve();return;}}
    const task=tasks[position++],source=projectionSource(tx,task,r),range=projectionRange(task);let count=0,lastKey=null,lastPrimary=null,lastCharge=0;
    r.listenersCleared=false;request=task.kind==='point'?n.storeGet.call(source,task.key):task.kind==='count'?(task.index?n.indexCount:n.storeCount).call(source,range):(task.index?n.indexCursor:n.storeCursor).call(source,range);
    const valid=event=>event.isTrusted===true&&n.eventTarget.call(event)===request&&n.eventCurrent.call(event)===request;
    const checked=()=>{projectionCurrent(r);if(n.ready.call(request)!=='done'||n.source.call(request)!==source||n.requestTransaction.call(request)!==tx)projectionRequired();};
    error=event=>{try{if(!valid(event))return;checked();failed(n.error.call(request)||new Error('Native projection request failed'));}catch(e){failed(e);}};
    success=event=>{
     let value=null,cursor=null,more=false,finished=false;
     try{
      if(!valid(event))return;checked();value=n.result.call(request);
      if(task.kind==='count'){if(!Number.isSafeInteger(value)||value<0||value>task.limit)fail('BNS_HUMAN_GRAPH_LIMIT');counts.set(task.target,value);finished=true;}
      else if(task.kind==='point'){
       value=value??null;r.transient=projectionTreeCharge(projectionRowMeasure(r,value));projectionReserve(r);if(value!==null&&value.id!==task.key)projectionRequired();r.raw.points[task.key]=projectionKeep(r,value,true);
       if(task.active){const namespace=r.binding.fixedNamespace||value?.namespace||'initial';if(typeof namespace!=='string'||namespace!=='initial'&&!/^[A-Za-z0-9_-]{8,128}$/.test(namespace))projectionRequired();r.raw.namespace=namespace;tasks.push({kind:'point',store:'meta',key:protocolPhysicalId(r.binding.prefix,namespace,'generation',[])});}
       finished=true;
      }else{
       cursor=value;
       if(!cursor){if(count!==counts.get(task.target))fail('BNS_HUMAN_CHANGED');finished=true;}
       else{
        if(count>=task.limit||n.cursorRequest.call(cursor)!==request||n.cursorSource.call(cursor)!==source)projectionRequired();
        const key=n.cursorKey.call(cursor),primary=n.cursorPrimaryKey.call(cursor),keyCharge=projectionTreeCharge(projectionRowMeasure(r,key))+projectionTreeCharge(projectionRowMeasure(r,primary));
        r.transient=lastCharge+keyCharge;projectionReserve(r);
        if(typeof primary!=='string'||primary.length>2048||task.prefix&&!primary.startsWith(task.prefix))projectionRequired();
        if(lastKey!==null){const order=projectionCompare.call(projectionFactory,lastKey,key);if(order>0||order===0&&projectionCompare.call(projectionFactory,lastPrimary,primary)>=0)projectionRequired();}
        value=n.cursorValue.call(cursor);r.transient+=projectionTreeCharge(projectionRowMeasure(r,value));projectionReserve(r);if(!value||value.id!==primary)projectionRequired();
        const expected=r.sourceWorking&&task.index?projectionPhysicalIndexKey(r,task.store,task.index,value):projectionExpectedKey(value,task.index?LIBRARY_INDEXES[task.store][task.index]:'id');
        // Native keyPath and cursor identity are both checked, not row claims.
        if(r.sourceWorking&&task.index){const spec=projectionIndexSchema(r)[task.store][task.index],match=item=>{try{return projectionCompare.call(projectionFactory,key,item)===0;}catch(error){if(!r.mixedIndexInspection)throw error;return false;}};if(expected===null||!(spec.multiEntry&&Array.isArray(expected)?expected.some(match):match(expected)))projectionRequired();}
        else if(!projectionEqual(r,key,expected))projectionRequired();
        if(task.borrow){const whole=r.raw.rows[task.store].find(row=>row.id===primary);if(!whole||!projectionEqual(r,value,whole))fail('BNS_HUMAN_CHANGED');task.target.push(projectionKeep(r,{key,primary}));}
        else{task.target.push(projectionKeep(r,value,true));}
        // One transient native key pair survives to check strict source order.
        lastKey=key;lastPrimary=primary;lastCharge=keyCharge;count++;more=true;
       }
      }
     }catch(e){failed(e);}finally{value=null;r.transient=lastCharge;}
     if(ended)return;
     try{if(more)n.cursorContinue.call(cursor);else if(finished){lastKey=null;lastPrimary=null;lastCharge=0;r.transient=0;clear();next();}}catch(e){failed(e);}finally{cursor=null;}
    };
    n.add.call(request,'success',success);n.add.call(request,'error',error);
   }catch(e){failed(e);}
  };
  next();
 });
}
export function finishHumanProjectionNativeDrain(core,t,nonce){const r=currentProjectionWorks.get(nonce);if(!r||r.core!==core)projectionRequired();requireHumanProjectionNativeDrainPhase(core,t,nonce);r.nativeDrained=true;if(r.sourceWorking)projectionCurrent(r);}
export function requireHumanProjectionNativePreparation(core,nonce){const r=currentProjectionWorks.get(nonce);if(!r||r.core!==core||r.phase!=='opening')projectionRequired();projectionCurrent(r);}
export async function collectHumanCurrentUnindexedProjectionNative(core,t,nonce){
 const r=currentProjectionWorks.get(nonce);if(!r||r.core!==core||r.phase!=='opening')projectionRequired();if(r.sourceWorking)projectionCurrent(r);requireHumanProjectionReadPhase(core,t,nonce);r.phase='reading';r.nativeOpened=true;r.scope=t;await projectionPump(r,t);r.phase='observed';
}
function projectionRaw(){const rows=Object.create(null),prefixes=Object.create(null);for(const name of projectionTables)rows[name]=[];for(const name of projectionPrefixes)prefixes[name]=[];return {rows,prefixes,points:Object.create(null),namespace:null,receiptOrder:[],placementOrder:[]};}
function projectionSourceWorkingRaw(mixedIndexInspection=false){
 const rows=Object.create(null),indices=Object.create(null);for(const name of sourceWorkingCurrentStores())rows[name]=[];
 for(const [name,definitions]of Object.entries(mixedIndexInspection?mixedCurrentIndexSchema():sourceWorkingCurrentIndexSchema)){indices[name]=Object.create(null);for(const index of Object.keys(definitions))indices[name][index]=[];}
 return {rows,indices,points:Object.create(null),namespace:null,groupMeta:rows.meta};
}
function projectionSourceWorkingIndexViews(r){
 for(const [name,definitions]of Object.entries(projectionIndexSchema(r)))for(const [index,spec]of Object.entries(definitions)){
  // The complete mixed inspector pays its own current actual table and the
  // full bounded key/entry/sort vectors before any compound key is formed.
  if(r.mixedIndexInspection){const m=projectionRowMeasure(r,r.raw.rows[name]);projectionReserve(r,3*projectionTreeCharge(m)+2*projectionCanonicalCharge(m)+4096*128+64*1024);}
  const entries=[];
  for(const row of r.raw.rows[name]){
   const key=projectionPhysicalIndexKey(r,name,index,row);if(key===null)continue;
   const selected=spec.multiEntry&&Array.isArray(key)?key:[key],seen=[];
   for(const item of selected){try{projectionCompare.call(projectionFactory,item,item);}catch{continue;}if(seen.some(prior=>projectionCompare.call(projectionFactory,prior,item)===0))continue;seen.push(item);entries.push({key:item,primary:row.id});}
  }
  entries.sort((a,b)=>projectionCompare.call(projectionFactory,a.key,b.key)||projectionCompare.call(projectionFactory,a.primary,b.primary));
  const actual=r.raw.indices[name][index];if(actual.length!==entries.length)projectionRequired();
  for(let i=0;i<entries.length;i++)if(actual[i].primary!==entries[i].primary||projectionCompare.call(projectionFactory,actual[i].key,entries[i].key)!==0)projectionRequired();
 }
}
async function projectionCompileSourceWorking(r){
 // Scan borrowed operations only after original native commit/unwind/drain.
 // Prepay original validator/clone/hash/key-sort and compiler frames before
 // allocating the input vector, Plan or Scope. No public Core reader is used.
 const revisionPrefix=protocolPhysicalId(r.binding.prefix,r.raw.namespace,'revision',[]),totals={B:2,T:0,V:1,E:0};let peak={B:0,T:0,V:0,E:0},number=0;
 for(const row of r.raw.groupMeta)if(row.id.startsWith(revisionPrefix)){
  if(row.redacted!==false||!row.operation||++number>128)projectionRequired();const m=projectionMeasure(row.operation,'native');for(const key of ['B','T','V','E'])totals[key]+=m[key];totals.E++;if(projectionCanonicalCharge(m)>projectionCanonicalCharge(peak))peak=m;
 }
 if(!number)projectionRequired();
 // Fixed128 operation/group/head references,96 histories,49 index views and
 // complete4096 metadata Map slots are independently reserved. Numeric slots
 // bound these original frames, not native heap/platform initial allocations.
 // Existing fixed192KiB additionally covers the <=4096 borrowed completed-control
 // selector references and <=128 operation/local-device plus <=2 Working selectors;
 // no control body is copied into these vectors. Full control encoder/digest copies
 // are independently summed below before the asynchronous identity check.
 const compilerScratch=5*projectionTreeCharge(totals)+6*projectionCanonicalCharge(peak)+8*peak.B+4096*128+192*1024;
 projectionReserve(r,compilerScratch);const operations=[];for(const row of r.raw.groupMeta)if(row.id.startsWith(revisionPrefix))operations.push(row.operation);
 const plan=await prepareCurrentSourceWorkingGroupCheckpointPlan(r.core,operations);projectionCurrent(r);
 requireSelectedCurrentSourceWorkingGroupPlan(r.core,plan);
 projectionReserve(r,compilerScratch+sourceWorkingScopeScratch(plan));
 const scope=await currentGroupOwner.prepareGroupScope(plan);projectionCurrent(r);currentGroupOwner.requireOriginalCurrentSourceWorkingGroupScope(r.core,scope,plan);
 let hidden=0;for(const group of plan.groups)if(group.type==='sourceBootstrapCommit')for(const member of group.prepared.members)hidden+=projectionTreeCharge(projectionMeasure(member.value.entity,'native'));
 r.owned+=projectionTreeCharge(projectionMeasure(plan,'native'))+projectionTreeCharge(projectionMeasure(scope,'native'))+hidden;
 r.group={...r.group,plan,scope,databaseId:r.binding.databaseId};
 projectionReserve(r,compilerScratch+sourceWorkingComparisonScratch(r.raw.rows,r.controlValues,scope.expected)+completedGroupControlScratch(r.core,r.raw));
 if(r.raw.rows.meta.some(row=>row.id===r.core.prefix+'active'))await assertSourceWorkingRestoredDefaultMeta(r.core,scope,plan,r.raw.rows,r.controlValues,r.binding.databaseId);
 else assertSourceWorkingDefaultMeta(r.core,scope,plan,r.raw.rows,r.controlValues,r.binding.databaseId);
 projectionCurrent(r);projectionSourceWorkingIndexViews(r);projectionCurrent(r);projectionReserve(r);
}
function projectionSourceFree(value){if(!value||typeof value!=='object')return;for(const key in value)if(projectionOwn(value,key)){const item=value[key];if((key==='sourceRecordIds'||key==='inputRefs')&&(!Array.isArray(item)||item.length))fail('BNS_HUMAN_UNSUPPORTED');projectionSourceFree(item);}}
function projectionScalarString(value,max=512){if(typeof value!=='string'||value.length>max)projectionRequired();}
function projectionNativeOrder(r,store,view,parts){
 const path=LIBRARY_INDEXES[store][store==='placements'?'byTopicOrder':'byOwner'];
 const expected=r.raw.rows[store].filter(row=>parts.every((part,i)=>row[path[i]]===part));
 for(const row of expected){const key=projectionExpectedKey(row,path);projectionCompare.call(projectionFactory,key,key);}
 expected.sort((a,b)=>projectionCompare.call(projectionFactory,projectionExpectedKey(a,path),projectionExpectedKey(b,path))||projectionCompare.call(projectionFactory,a.id,b.id));
 if(expected.length!==view.keys.length)fail('BNS_HUMAN_CHANGED');
 for(let i=0;i<expected.length;i++)if(view.keys[i].primary!==expected[i].id||!projectionEqual(r,view.keys[i].key,projectionExpectedKey(expected[i],path),r.semantic))fail('BNS_HUMAN_CHANGED');
 return expected;
}
function projectionPendingOwner(row,kind){
 projectionScalarString(row.id);
 if(!row.id.length||!['active','removed'].includes(row.lifecycle)||Object.hasOwn(row,'indexedSearchVersion'))fail('BNS_HUMAN_SEARCH_UNPROVEN');
 const required=kind==='entry'?['revision','contentRevision']:kind==='topic'?['revision','activeLayoutGeneration']:['revision','layoutGeneration'];
 for(const field of required)if(!Number.isSafeInteger(row[field])||row[field]<0)projectionRequired();
 for(const field of ['layoutGeneration','searchSafetyVersion'])if(row[field]!==undefined&&(!Number.isSafeInteger(row[field])||row[field]<0))projectionRequired();
 if(kind==='entry'&&row.fieldRevisions?.type!==undefined&&(!Number.isSafeInteger(row.fieldRevisions.type)||row.fieldRevisions.type<0))projectionRequired();
 projectionScalarString(row.searchVersion,128);
}
function projectionSemanticCharge(r){
 let charge=PROJECTION_SEMANTIC;
 if(r.raw.rows.thoughts.length+r.raw.rows.topics.length+r.raw.rows.sections.length>128)fail('BNS_HUMAN_SEARCH_UNPROVEN');
 // Prepaid fixed frame holds these two/three-element borrowed scalar arrays
 // and one empty original constructor header. B bounds the exact JSON string
 // units without allocating that string; no normalizer expansion is assumed.
 for(const [kind,name]of [['entry','thoughts'],['topic','topics'],['section','sections']])for(const row of r.raw.rows[name]){
  projectionPendingOwner(row,kind);
  const ownerKey=projectionMeasure([kind,row.id]).B,queueKey=projectionMeasure(['search',kind,row.id]).B;
  const header=projectionMeasure(planSearchQueueLocator(kind,{id:'',sourceRecordIds:[]},'0'));
  charge+=4*ownerKey+projectionTreeCharge(header)+2*(queueKey+row.id.length+128);
 }
 return charge;
}
function projectionQualify(r){
 const raw=r.raw,rows=raw.rows,points=raw.points,settings=r.controlValues.settings;
 r.semantic=projectionSemanticCharge(r);projectionReserve(r,r.semantic);
 if(rows.provenance.length||rows.dependencies.length||rows.librarySearchTerms.length||raw.prefixes['memory:topic:'].length||raw.prefixes['memory:section:'].length)fail('BNS_HUMAN_UNSUPPORTED');
 if(!settings?.enabled||settings.consentVersion!==CONSENT_VERSION||points.gate&&(points.gate.epoch!==settings.epoch||points.gate.enabled!==settings.enabled))fail('BNS_HUMAN_PERMISSION');
 if(points['thought-library']?.sealed)fail('BNS_HUMAN_UNSUPPORTED');
 const epoch=points['thought-epoch']?.value||0;if(!Number.isSafeInteger(epoch)||epoch<0)projectionRequired();
 projectionSourceFree(raw);
 const migration=new Map(),metadata=new Map();let descriptors=0;
 for(const row of rows.libraryMigrationItems){projectionScalarString(row.id,2048);if(migration.has(row.id))projectionRequired();migration.set(row.id,row);}
 for(const row of raw.prefixes['thought-read-index:']){projectionScalarString(row.id,2048);if(metadata.has(row.id))projectionRequired();metadata.set(row.id,row);}
 const match=row=>{if(!row)return;if(!migration.has(row.id)||!projectionEqual(r,migration.get(row.id),row,r.semantic))fail('BNS_HUMAN_PROJECTION_UNPROVEN');migration.delete(row.id);};
 const queue=[];
 for(const [kind,name]of [['entry','thoughts'],['topic','topics'],['section','sections']])for(const row of rows[name]){projectionPendingOwner(row,kind);const task=planSearchQueueLocator(kind,row);match(task);queue.push(task);}
 // Every physical migration row will also be matched below; this subset is
 // used only after its exact original queue locator has been observed.
 const search={rows:{thoughts:rows.thoughts,topics:rows.topics,sections:rows.sections,revisions:rows.revisions,libraryMigrationItems:queue,librarySearchTerms:rows.librarySearchTerms},rebuild:points['library-search-rebuild']};
 projectionDeepFreeze(search);inspectHumanUnindexedSearch(search);
 const root=metadata.get('thought-read-index:v1:root');
 if(root){
  projectionScalarString(root.activeGeneration,80);if(!/^[A-Za-z0-9_.-]+$/.test(root.activeGeneration)||typeof root.completedAt!=='string'||!Number.isFinite(Date.parse(root.completedAt)))projectionRequired();
  let indexed=0;for(const topic of rows.topics){if(topic.createdAt!==null&&topic.createdAt!==undefined)projectionScalarString(topic.createdAt,128);const planned=planThoughtRootProjection(topic,root.activeGeneration);if(planned.row){match(planned.row);indexed++;}}
  const expected={id:'thought-read-index:v1:root',version:1,activeGeneration:root.activeGeneration,buildingGeneration:null,sourceCursor:null,scanned:rows.topics.length,indexed,activeCount:indexed,completedAt:root.completedAt};
  if(!projectionEqual(r,root,expected,r.semantic))fail('BNS_HUMAN_PROJECTION_UNPROVEN');metadata.delete(root.id);
 }
 for(const topic of rows.topics){
  const view=raw.placementOrder.find(item=>item.topicId===topic.id);if(!view)projectionRequired();
  const placements=projectionNativeOrder(r,'placements',view,[topic.id,topic.activeLayoutGeneration,0]);
  const id='thought-read-index:v1:topic:'+topic.id,actual=metadata.get(id);if(!actual)continue;
  if(topic.lifecycle!=='active'||topic.redirectTo||actual.version!==THOUGHT_TOPIC_INDEX_VERSION||!Number.isSafeInteger(actual.timeRevision)||actual.timeRevision<0)projectionRequired();
  projectionScalarString(actual.activeGeneration,80);if(!/^[A-Za-z0-9_.-]+$/.test(actual.activeGeneration)||typeof actual.completedAt!=='string'||!Number.isFinite(Date.parse(actual.completedAt)))projectionRequired();
  for(const field of ['organizationRevision','countVersion'])if(topic[field]!==undefined&&topic[field]!==null&&(!Number.isSafeInteger(topic[field])||topic[field]<0))projectionRequired();
  const key=liveTopicKey(topic,epoch,actual.timeRevision);
  const seed={id,version:THOUGHT_TOPIC_INDEX_VERSION,timeRevision:actual.timeRevision,activeGeneration:null,activeKey:null,buildingGeneration:null,buildingKey:null,sourceCursor:null,scanned:0,indexed:0};
  const expected=planThoughtTopicBuild(seed,key,actual.activeGeneration);
  for(const p of placements){
   expected.scanned++;if(p.lifecycle!=='active')continue;
   const row=rows.thoughts.find(entry=>entry.id===p.entryId);if(!row||row.storageSchema!==2||row.lifecycle!=='active')continue;
   if(row.provenanceType!=='user_created'||row.origin!=='user'||!Array.isArray(row.sourceRecordIds)||row.sourceRecordIds.length||!Array.isArray(row.inputRefs)||row.inputRefs.length)fail('BNS_HUMAN_UNSUPPORTED');
   for(const field of ['entryId','sectionId','sectionRank','rank'])projectionScalarString(p[field]);
   if(row.createdAt!==null&&row.createdAt!==undefined)projectionScalarString(row.createdAt,128);
   const receipts=raw.receiptOrder.find(item=>item.ownerId===row.id);if(!receipts)projectionRequired();
   const receiptRows=projectionNativeOrder(r,'operationReceipts',receipts,['thought-library',row.id]);
   const receipt=receiptRows[0]??null,evidenceAt=receipt?.result?.independentExpression?.at;if(evidenceAt!==undefined&&evidenceAt!==null)projectionScalarString(evidenceAt,128);
   if(!Number.isSafeInteger(p.revision)||p.revision<0)projectionRequired();
   const expression=row.staleReasons?.includes('source_purged')?unknownExpressionTime():planIndependentExpressionTime(row,receipt);
   const time={sourceSentAt:null,capturedAt:null},rawTime=row.createdAt||null,effectiveTime=Number.isFinite(Date.parse(rawTime||''))?rawTime:null;
   const iterator=planHumanPlacementDescriptor(topic,p,row,time,effectiveTime);
   projectionGeneratorNext.call(iterator);projectionGeneratorNext.call(iterator,expression);const descriptor=projectionGeneratorNext.call(iterator,[]).value;
   if(++descriptors>128)fail('BNS_HUMAN_GRAPH_LIMIT');expected.indexed++;
   const rowIterator=planThoughtTopicDescriptorRows(descriptor,actual.activeGeneration);
   for(let item=projectionGeneratorNext.call(rowIterator);!item.done;item=projectionGeneratorNext.call(rowIterator))match(item.value);
   accumulateThoughtTopicDescriptor(expected,descriptor);
  }
  const done=completeThoughtTopicProjection(expected);projectionGeneratorNext.call(done);projectionGeneratorNext.call(done,actual.completedAt);
  if(!projectionEqual(r,actual,expected,r.semantic))fail('BNS_HUMAN_PROJECTION_UNPROVEN');metadata.delete(id);
 }
 // Receipt order is authenticated even for an Entry outside a current Topic.
 for(const entry of rows.thoughts){const view=raw.receiptOrder.find(item=>item.ownerId===entry.id);if(!view)projectionRequired();projectionNativeOrder(r,'operationReceipts',view,['thought-library',entry.id]);}
 if(metadata.size||migration.size)fail('BNS_HUMAN_PROJECTION_UNPROVEN');
 migration.clear();metadata.clear();
}
function projectionFailure(primary,errors){return errors.length?new AggregateError([primary,...errors],'Projection primary and cleanup failures',{cause:primary}):primary;}
function projectionDrop(r){r.failedRequest=null;r.raw=null;r.group=null;r.encoderResult=null;r.scope=null;r.identity=null;r.controlValues=null;r.control=null;r.tail=null;r.closed=true;currentProjectionWorks.delete(r.nonce);if(r.work){const work=r.work;r.work=null;releaseHumanQualificationLease(work);}}
function projectionRevoke(p){p.revoked=true;if(p.frames===0&&!p.released){p.released=true;p.raw=null;p.group=null;p.encoderResult=null;p.controlValues=null;releaseHumanQualificationLease(p.ticket);p.ticket=null;}}
// Original mixed Scope construction will consume the already authenticated,
// frozen full native cut. No caller-supplied secret/DTO and no Store.run tail
// replacement is admitted. Only initial readonly compilation inspection uses
// this seam; mixed canonical encoder/export admission remains disabled.
export function borrowOriginalMixedScopeCompilationSecret(nonce,store,scope,wire){
 const r=currentProjectionWorks.get(nonce);
 if(arguments.length!==4||!r||r.sourceWorking!=='mixed'||r.store!==store||r.phase!=='mixed-scope-preparing'||!r.nativeDrained||!r.raw||!r.group?.plan)projectionRequired();
 projectionCurrent(r);currentGroupOwner.requireOriginalMixedHumanCompilationInput(r.core,scope,wire,r.group.plan);
 if(r.mixedCompilingScope&&r.mixedCompilingScope!==scope)projectionRequired();r.mixedCompilingScope=scope;
 const secret=r.raw.rows.meta.find(row=>row.id==='thought-suppression-key')?.value;
 if(!Array.isArray(secret)||secret.length!==32||secret.some(value=>!Number.isInteger(value)||value<0||value>255))projectionRequired();return secret;
}
export function borrowOriginalMixedScopeCompilationMeta(nonce,store,scope,wire){
 if(arguments.length!==4)projectionRequired();borrowOriginalMixedScopeCompilationSecret(nonce,store,scope,wire);return currentProjectionWorks.get(nonce).raw.rows.meta;
}
export function requireOriginalMixedScopeCompilationCurrent(nonce,store,scope){
 const r=currentProjectionWorks.get(nonce);
 if(arguments.length!==3||!r||r.sourceWorking!=='mixed'||r.store!==store||r.phase!=='mixed-scope-preparing'||r.mixedCompilingScope!==scope||!r.nativeDrained)projectionRequired();projectionCurrent(r);
}
export async function captureHumanCurrentUnindexedProjection(store,core){
 if(arguments.length!==2)projectionRequired();
 return captureCurrentProjection(store,core,null);
}
export async function captureHumanCurrentGroupProjection(store,core,scope,plan){
 if(arguments.length!==4)projectionRequired();
 return captureCurrentProjection(store,core,{scope,plan});
}
// Fixed selected opening only; empty opaque cap, no rows/DTO reader/Plan output.
// Public opt-in uses this fixed original cut; no generic Source reader exists.
export async function captureSourceWorkingCurrentGroupProjection(store,core){
 if(arguments.length!==2)projectionRequired();return captureCurrentProjection(store,core,null,true);
}
// A selected Context phase uses only original native structured-clone trees.
// Meter before the new owner creates vectors, validator clones or canonical
// operands. Full Scope/Plan/raw retained trees and old Human/row peaks remain.
// No Prompt scratch credits, larger pool or retained refund fund this phase.
function currentContextSnapshotScratch(scope,plan,raw){
 const kinds=['contextItem','contextRulesItem','contextNowItem','contextDesired'];
 let selected=false,transitionPeak=0;
 for(const group of plan.groups)if(kinds.includes(group.type)){
  selected=true;
  for(const op of group.operations){
   const m=projectionMeasure(op.value,'native');
   // Two simultaneously validated values (next and original parent), each
   // with its original codec's clone/JSON/UTF8 and equality operands. Parent
   // values are themselves in this complete authenticated Plan inventory.
   transitionPeak=Math.max(transitionPeak,4*projectionTreeCharge(m)+4*projectionCanonicalCharge(m));
  }
 }
 if(!selected)return 0;
 let physical=0;const row=raw.groupMeta.find(row=>row.id==='context-cards:v1');
 if(row){const m=projectionMeasure(row,'native');physical=4*projectionTreeCharge(m)+2*projectionCanonicalCharge(m)+m.B+16*m.E;}
 // Independently pay expected items/desired values and complete historical
 // operation operands even when actual physical metadata is small or missing.
 // 16KiB bounds three128 reference vectors, one fixed manual key <=512 chars,
 // and bounded descriptor/validator wrappers; full item arrays are above.
 return physical+transitionPeak+projectionCanonicalCharge(projectionMeasure(scope.expected.context,'native'))+projectionCanonicalCharge(projectionMeasure(scope.expected.desired,'native'))+projectionCanonicalCharge(projectionMeasure(plan,'native'))+16*1024;
}
function completedGroupControlScratch(core,raw){
 // Full control source trees are already retained. Independently prepay each
 // exact control's original manifest canonicalization/UTF8, identity byte copy,
 // digest/ref comparison, schema vectors and frames on THIS live work ticket.
 // Summation is intentional: extra controls cannot obtain a cheap exemption.
 let scratch=0;
 for(const row of raw.groupMeta){if(typeof row.id!=='string'||!row.id.startsWith(core.prefix+'generation:')||!row.id.endsWith(':restore:'))continue;
  const m=projectionMeasure(row,'native');scratch+=6*projectionTreeCharge(m)+6*projectionCanonicalCharge(m)+8*m.B+16*m.E+64*1024;
 }
 return scratch;
}
const mixedIndexNonempty=new Set([...sourceWorkingCurrentNonemptyStores,'thoughts','topics','sections','placements','thoughtSuppressions','libraryMigrationItems','librarySearchTerms']);
function mixedIndexPrimaryLimit(name){return !mixedIndexNonempty.has(name)?0:name==='meta'||name==='librarySearchTerms'?4096:name==='revisions'?96:name==='libraryMigrationItems'?768:128;}
// Consuming readonly prerequisite: the fixed original native reader checks the
// complete v5 index inventory on the existing live work ticket and drains it.
// No raw rows, retained cap, Scope, encoder or export admission is returned.
export async function inspectMixedCurrentNativeIndexClosure(store,core){
 if(arguments.length!==2)projectionRequired();return captureCurrentProjection(store,core,null,'mixed-index-inspection');
}
// Original native-cut/compiler handshake prerequisite only. It is deliberately
// separate from encoder admission: complete canonical/meta/query qualification
// and independent full tariffs remain unfinished, so no cap is ever returned.
export async function inspectMixedCurrentNativeScopeCompilation(store,core){
 if(arguments.length!==2)projectionRequired();return captureCurrentProjection(store,core,null,'mixed');
}
// The finite no-alias handshake must cover every identity actually consumed
// by the original keyed compiler, including both Topic history snapshots.
// This assertion creates no Scope, native authority or export capability.
export function assertOriginalInitialMixedScopeCompilationProfile(core,plan){
 if(arguments.length!==2)projectionRequired();requireOriginalCurrentMixedGroupPlan(core,plan);
 const topic=row=>{if(row?.identity?.aliases?.length)projectionRequired();};
 for(const group of plan.groups)if(group.type==='humanLibraryCommit'){
  if(!['topic','entry','placement'].includes(group.prepared.descriptor.value.kind))projectionRequired();
  for(const op of group.prepared.members){
   if(op.value.entityType==='topic'){topic(op.value.before);topic(op.value.after);}
   else if(op.value.entityType==='history')for(const row of [op.value.before,op.value.after])if(row?.kind==='topic'){topic(row.before);topic(row.after);}
  }
 }
}
async function projectionCompileInitialMixedScope(r){
 if(!r.mixedCompilationInspection||!r.nativeDrained||r.raw.namespace!=='initial'||r.binding.fixedNamespace!==null||r.raw.rows.meta.some(row=>row.id===r.binding.prefix+'active'))projectionRequired();
 const prefix=protocolPhysicalId(r.binding.prefix,r.raw.namespace,'revision',[]),totals={B:2,T:0,V:1,E:0};let peak={B:0,T:0,V:0,E:0},number=0;
 for(const row of r.raw.groupMeta)if(row.id.startsWith(prefix)){
  if(row.redacted!==false||!row.operation||++number>128)projectionRequired();const m=projectionMeasure(row.operation,'native');for(const key of ['B','T','V','E'])totals[key]+=m[key];totals.E++;if(projectionCanonicalCharge(m)>projectionCanonicalCharge(peak))peak=m;
 }
 if(!number)projectionRequired();
 const compilerScratch=5*projectionTreeCharge(totals)+6*projectionCanonicalCharge(peak)+8*peak.B+4096*128+192*1024;
 projectionReserve(r,compilerScratch);const operations=[];for(const row of r.raw.groupMeta)if(row.id.startsWith(prefix))operations.push(row.operation);
 const plan=await prepareCurrentMixedGroupCheckpointPlan(r.core,operations);projectionCurrent(r);requireOriginalCurrentMixedGroupPlan(r.core,plan);
 // This first consuming handshake accepts only original creation/placement
 // kinds, with no rename aliases/index-generation work. Later profiles owe
 // their own keyed-alias and restored-prefix scratch; never silently fall back.
 assertOriginalInitialMixedScopeCompilationProfile(r.core,plan);
 const m=projectionRowMeasure(r,plan),wire={B:2,T:0,V:1,E:0};let wireCount=0;
 // Scope clones original typed domain members/manual values, not complete
 // operation envelopes/parents or descriptor vectors. Those remain held in
 // the independently owned COMPLETE Plan. Price every domain input, including
 // overwritten histories and both nested sides, without allocating a DTO.
 const addWire=value=>{const measured=projectionRowMeasure(r,value);if(wireCount++)wire.B++;for(const key of ['B','T','V','E'])wire[key]+=measured[key];wire.E++;};
 for(const group of plan.groups){if(group.type==='humanLibraryCommit')for(const member of group.prepared.members)addWire(member.value.after);else if(['sourceBootstrapCommit','sourceAppendCommit','inputWorkingCommit'].includes(group.type))for(const member of group.prepared.members)addWire(member.value.entity);else addWire(group.operations[0].value);}
 const scopeScratch=8*projectionTreeCharge(wire)+4*projectionCanonicalCharge(wire)+8*wire.B+256*1024;
 let sourceHidden=0;for(const group of plan.groups)if(group.type==='sourceBootstrapCommit'||group.type==='sourceAppendCommit')for(const member of group.prepared.members)sourceHidden+=projectionTreeCharge(projectionRowMeasure(r,member.value.entity));
 // The fixed compiler has actually returned and all validator/hash awaits
 // settled. Transfer its surviving Plan/private Source trees, then release
 // only its finished scratch; the original work ticket remains continuously live.
 r.owned+=projectionTreeCharge(m)+sourceHidden;operations.length=0;projectionReserve(r);
 // Provisional finite preparation reserves the complete Plan for Map/member/
 // wire/normalized/keyed clones plus fixed transformation slots, independently
 // of raw. These are live logical charges, not full heap/tariff qualification.
 projectionReserve(r,scopeScratch+2*1024*1024);r.group={...r.group,plan};r.phase='mixed-scope-preparing';
 const scope=await currentGroupOwner.prepareGroupScope(plan,{store:r.store,nativeMixedCompilation:r.nonce});projectionCurrent(r);currentGroupOwner.requireOriginalCurrentMixedGroupScope(r.core,scope,plan);
 const hidden=currentHumanOwner.measureOriginalMixedHumanScopeExpectation(scope,r.store,r.nonce);
 // Scope construction and its sequential keyed operands have returned. The
 // same live ticket now owns their actual surviving trees, not both those
 // trees and a second copy of the already unwound construction scratch.
 r.owned+=projectionTreeCharge(projectionRowMeasure(r,scope))+projectionTreeCharge(hidden);r.group={...r.group,scope};
 projectionReserve(r);projectionFence(r);r.phase='mixed-scope-compiled';projectionReserve(r);
 return Object.freeze({version:1,state:'INITIAL_NATIVE_SCOPE_COMPILATION_ONLY',operations:plan.operationCount,groups:plan.groups.length,stores:37,indices:110,nativeDrained:true,scopeCompiled:true,canonicalQualified:false,exportAdmitted:false,retainedCapability:false,fullTariffsQualified:false});
}

async function captureCurrentProjection(store,core,group,sourceWorking=false){
 const work=beginHumanQualificationWork('projection',PROJECTION_FRAME);
 let r,cap,ticket,primary,failed=false;
 try{
  if('value'in Object.prototype)projectionRequired();nativeRetentionAvailable();if(typeof projectionCompare!=='function'||!projectionFactory)projectionRequired();
  // Fixed original owner is worker-safe; retain an asynchronous cancellation boundary.
  await Promise.resolve();const storeAssert=requireOriginalLibraryDocumentsStore;storeAssert(store);const binding=sourceWorking?requireSourceWorkingStoreBinding(store,core):branchReady(store,core);
  if(typeof binding.datasetId!=='string'||typeof binding.deviceId!=='string'||typeof binding.prefix!=='string'||binding.fixedNamespace!==null&&(typeof binding.fixedNamespace!=='string'||!/^[A-Za-z0-9_-]{8,128}$/.test(binding.fixedNamespace)))projectionRequired();
  if(binding.prefix!=='bns:v1:'+binding.datasetId+':'||!/^[A-Za-z0-9_-]{8,128}$/.test(binding.datasetId)||!/^[A-Za-z0-9_-]{8,128}$/.test(binding.deviceId))projectionRequired();
  r={work,owned:0,store,storeAssert,core,binding,tail:store.tail,control:store.controlCache,controlValues:null,raw:null,scope:null,identity:null,nonce:Object.freeze({}),phase:'opening',closed:false,revoked:false,cleanupErrors:[],group:null,sourceWorking,mixedIndexInspection:sourceWorking==='mixed-index-inspection'||sourceWorking==='mixed',mixedCompilationInspection:sourceWorking==='mixed'};
  if(sourceWorking){r.fixedScratch=4096*16+192*1024+(r.mixedIndexInspection?64*1024:0);projectionReserve(r);r.group={stores:sourceWorkingCurrentStores()};}
  if(group){
   await Promise.resolve();const owner=currentGroupOwner;owner.requireOriginalCurrentGroupScope(core,group.scope,group.plan);
   await Promise.resolve();const human=currentHumanOwner;
   // Borrowed source bodies gain a new lifetime while this cap is retained.
   // Pay their actual trees, private Human expectation and bounded key/task
   // vectors on the same original ticket before opening native requests.
   r.owned+=projectionTreeCharge(projectionMeasure(group.scope,'native'))+projectionTreeCharge(projectionMeasure(group.plan,'native'))+projectionTreeCharge(human.measureHumanScopeProjectionExpectation(group.scope,store));
   // Opening task/selector/Map frames unwind before the retained cap. Keep
   // their original reserve on this work ticket through finally/drain; only
   // actual retained trees transfer to the unchanged4MiB retained allowance.
   r.fixedScratch=4096*16+128*1024;
   projectionReserve(r);r.group={...group,databaseId:store.databaseId,emptyStores:owner.currentHumanGroupEmptyStores,stores:owner.currentHumanGroupStores};
  }
  const m=projectionRowMeasure(r,r.control);r.owned+=projectionTreeCharge(m);projectionReserve(r);r.controlValues=clone(r.control);projectionDeepFreeze(r.controlValues);
  await r.tail;projectionFence(r);r.raw=sourceWorking?projectionSourceWorkingRaw(r.mixedIndexInspection):projectionRaw();if(r.group&&!sourceWorking)r.raw.groupMeta=[];currentProjectionWorks.set(r.nonce,r);
  await openHumanProjectionNativeRead(core,r.nonce);projectionCurrent(r);
  if(r.phase!=='observed')projectionRequired();projectionRowMeasure(r,r.raw);projectionDeepFreeze(r.raw);
  if(r.mixedIndexInspection){
   if(!r.nativeDrained||r.listenersCleared===false)projectionRequired();projectionSourceWorkingIndexViews(r);projectionFence(r);projectionReserve(r);
   if(r.mixedCompilationInspection)return await projectionCompileInitialMixedScope(r);
   let indices=0,indexEntries=0,primaryRows=0;for(const name of r.group.stores){primaryRows+=r.raw.rows[name].length;for(const index of Object.keys(projectionIndexSchema(r)[name])){indices++;indexEntries+=r.raw.indices[name][index].length;}}
   // Only fixed numeric findings leave the original cut; it is dropped in the
   // same finally after genuine native terminal/unwind/listener cleanup.
   return Object.freeze({version:1,state:'INDEX_INVENTORY_ONLY',stores:r.group.stores.length,indices,indexEntries,primaryRows,nativeDrained:true,canonicalQualified:false,exportAdmitted:false,retainedCapability:false});
  }
  if(sourceWorking)await projectionCompileSourceWorking(r);else projectionQualify(r);projectionReserve(r);
  if(r.group&&!sourceWorking){
   await Promise.resolve();const owner=currentGroupOwner;await Promise.resolve();const human=currentHumanOwner;
   let rowPeak=0;for(const row of r.raw.groupMeta)rowPeak=Math.max(rowPeak,2*projectionCanonicalCharge(projectionMeasure(row,'native')));
   // Original normalizers compare one table at a time; the protocol owner
   // borrows a metered Map and compares one row at a time. No whole meta or
   // whole plan clone exists in those loops. Charge their actual overlap.
   let promptScratch=0;
   if(r.group.plan.groups.some(group=>group.type==='promptPreferences')){
    const row=r.raw.groupMeta.find(row=>row.id==='prompt-reuse:v1');
    if(row){const m=projectionMeasure(row,'native'),tree=projectionTreeCharge(m),canonical=projectionCanonicalCharge(m);promptScratch+=4*tree+2*canonical+m.B+16*m.E+4096;}
    // Pay expected Prompt and historical operations independently. Retained
    // Scope/Plan trees and a small corrupted actual row cannot pay for them.
    // The extra4096 is only the fixed ASCII manual-Prompt protocol wrapper.
    promptScratch+=projectionCanonicalCharge(projectionMeasure(r.group.scope.expected.prompt,'native'))+projectionCanonicalCharge(projectionMeasure(r.group.plan,'native'))+4096;
   }
   const scratch=12*1024+4096*128+human.measureHumanScopeProjectionComparisonPeak(r.group.scope,store,r.raw)+rowPeak+promptScratch+currentContextSnapshotScratch(r.group.scope,r.group.plan,r.raw)+completedGroupControlScratch(core,r.raw);projectionReserve(r,scratch);
   human.assertHumanScopeProjectionExpectation(r.group.scope,store,r.raw);await owner.assertCurrentHumanGroupNativeSnapshot(core,r.group.scope,r.group.plan,r.raw,r.controlValues,r.group.databaseId);projectionCurrent(r);
   projectionDeepFreeze(r.group.scope);projectionReserve(r);projectionFence(r);
  }
  // Admission must also be readable by the exact original whole-cut equality
  // used at require. Meter and prepay both real canonical operands first.
  if(!(sourceWorking?projectionGroupCutEqual(r,r.raw,r.raw):projectionEqual(r,r.raw,r.raw)))projectionRequired();projectionFence(r);
  if(PROJECTION_FRAME+r.owned>4*1024*1024)fail('BNS_HUMAN_GRAPH_LIMIT');ticket=retainHumanQualificationLease(work,PROJECTION_FRAME+r.owned);
  cap=Object.freeze({});const p={store,storeAssert,core,binding,tail:r.tail,control:r.control,controlValues:r.controlValues,raw:r.raw,ticket,frames:0,revoked:false,released:false,group:r.group,sourceWorking};
  currentProjectionCaps.set(cap,p);r.raw=null;r.controlValues=null;return cap;
 }catch(error){primary=error;failed=true;throw projectionFailure(primary,r?.cleanupErrors??[]);}
 finally{
  // The fixed Core entry returned only after native terminal, original unwind,
  // dispatch-end and listener cleanup. No active native frame is refunded here.
  if(r&&r.nativeOpened&&(!r.nativeDrained||r.listenersCleared===false)){r.revoked=true;projectionQuarantine.set(r.nonce,r);}else if(r)projectionDrop(r);else releaseHumanQualificationLease(work);
  if(failed&&ticket){releaseHumanQualificationLease(ticket);if(cap)currentProjectionCaps.delete(cap);}
 }
}
// Re-open the original fixed native reader, not a caller-supplied transaction,
// for every Source/Working cut. The retained original Plan/Scope never escapes.
// This work remains charged until genuine native unwind/dispatch-end/cleanup.
export async function requireSourceWorkingCurrentGroupProjection(cap){
 if(arguments.length!==1)projectionRequired();const p=currentProjectionCaps.get(cap);if(!p||!p.sourceWorking||p.revoked||p.released)projectionRequired();
 const work=beginHumanQualificationWork('projection',PROJECTION_FRAME),r={...p,work,owned:0,retainedParent:p,raw:null,scope:null,identity:null,nonce:Object.freeze({}),phase:'opening',closed:false,revoked:false,cleanupErrors:[],fixedScratch:4096*16+192*1024};p.frames++;
 try{
  if('value'in Object.prototype)projectionRequired();projectionReserve(r);projectionFence(r);r.raw=projectionSourceWorkingRaw();currentProjectionWorks.set(r.nonce,r);
  await openHumanProjectionNativeRead(p.core,r.nonce);projectionCurrent(r);
  if(r.phase!=='observed'||!r.nativeDrained)projectionRequired();projectionRowMeasure(r,r.raw);projectionDeepFreeze(r.raw);
  if(!projectionGroupCutEqual(r,r.raw,p.raw))fail('BNS_HUMAN_CHANGED');projectionFence(r);return true;
 }catch(error){throw projectionFailure(error,r.cleanupErrors);}
 finally{
  if(r.nativeOpened&&(!r.nativeDrained||r.listenersCleared===false)){
   // Quarantined r still borrows the original retained Scope/Plan/control.
   // Preserve BOTH its live work and p's frame/retained charge until actual
   // cleanup is proven; never refund a borrowed lifetime in a finally block.
   r.revoked=true;p.revoked=true;projectionQuarantine.set(r.nonce,r);
  }else{projectionDrop(r);p.frames--;if(p.revoked)projectionRevoke(p);}
 }
}
// No supplied Scope/Plan or DTO reader. Both original owners receive exactly
// the privately captured identities on the existing original encoder ticket.
export async function encodeSourceWorkingCurrentGroupCheckpoint(cap,transport,options){
 if(arguments.length!==3)projectionRequired();const p=currentProjectionCaps.get(cap);if(!p||!p.sourceWorking||p.revoked||p.released)projectionRequired();
 currentGroupOwner.requireOriginalCurrentSourceWorkingGroupScope(p.core,p.group.scope,p.group.plan);
 return encodeHumanCurrentGroupCheckpoint(cap,p.group.scope,p.group.plan,transport,options);
}
export async function publishSourceWorkingCurrentGroupCheckpoint(cap,checkpoint,transport,options){
 if(arguments.length!==4)projectionRequired();const p=currentProjectionCaps.get(cap);if(!p||!p.sourceWorking||p.revoked||p.released)projectionRequired();
 currentGroupOwner.requireOriginalCurrentSourceWorkingGroupScope(p.core,p.group.scope,p.group.plan);
 return publishHumanCurrentGroupCheckpoint(cap,p.group.scope,p.group.plan,checkpoint,transport,options);
}
export async function requireHumanCurrentUnindexedProjection(t,cap){
 if(arguments.length!==2)projectionRequired();const p=currentProjectionCaps.get(cap);if(!p||p.sourceWorking||p.revoked||p.released)projectionRequired();
 const work=beginHumanQualificationWork('projection',PROJECTION_FRAME),r={...p,work,owned:0,raw:null,scope:null,identity:null,nonce:Object.freeze({}),phase:'verifying',closed:false,revoked:false,cleanupErrors:[]};p.frames++;
 try{
  if('value'in Object.prototype)projectionRequired();projectionFence(r);r.raw=projectionRaw();if(r.group){r.owned+=4096*16;projectionReserve(r);r.raw.groupMeta=[];}await projectionPump(r,t);
  if(p.revoked)projectionRequired();requireRepositoryTransactionScope(p.binding.repository,t);projectionFence(r);
  if(!(p.group?projectionGroupCutEqual(r,r.raw,p.raw):projectionEqual(r,r.raw,p.raw)))fail('BNS_HUMAN_CHANGED');
 }catch(error){throw projectionFailure(error,r.cleanupErrors);}
 finally{
  // require resolves at the checked point in the original transaction. Its
  // work and revoked retained cut survive until that scope really drains.
  const drain=async()=>{try{if(r.scope)await awaitRepositoryTransactionSettled(p.binding.repository,r.scope);}catch(error){p.revoked=true;p.cleanupFailure=error;r.revoked=true;projectionQuarantine.set(r.nonce,r);throw error;}if(r.listenersCleared===false){p.revoked=true;p.cleanupFailure=r.cleanupErrors[0]??new Error('Projection request cleanup incomplete');r.revoked=true;projectionQuarantine.set(r.nonce,r);return;}projectionDrop(r);p.frames--;if(p.revoked)projectionRevoke(p);};
  if(r.scope){const cleanup=drain();cleanup.catch(()=>{});}else{projectionDrop(r);p.frames--;if(p.revoked)projectionRevoke(p);}
 }
}
export function releaseHumanCurrentUnindexedProjection(cap){
 if(arguments.length!==1)projectionRequired();const p=currentProjectionCaps.get(cap);if(!p||p.revoked&&!p.sourceWorking||p.released)projectionRequired();
 // A quarantined Source frame keeps its retained charge even after the public
 // handle is revoked. Releasing the handle must not replace the original
 // primary/cleanup error or refund still-borrowed retained values.
 currentProjectionCaps.delete(cap);projectionRevoke(p);
}
// Fixed private producer. The shared original encoder receives only rows from
// authenticated native R in its actual primary-key order, never Core.rows.
export async function encodeHumanCurrentGroupCheckpoint(cap,scope,plan,transport,options){
 if(arguments.length!==5)projectionRequired();const p=currentProjectionCaps.get(cap);
 if(!p||p.revoked||p.released||!p.group||p.group.scope!==scope||p.group.plan!==plan||p.encoderResult)projectionRequired();
 const work=beginHumanQualificationWork('projection',PROJECTION_FRAME),r={...p,work,owned:0,closed:false,revoked:false};p.frames++;
 try{
  if('value'in Object.prototype)projectionRequired();projectionFence(r);
  await Promise.resolve();const {SEGMENT_PROFILE}=currentSegmentOwner;await Promise.resolve();const owner=currentCheckpointOwner;
  if(p.revoked||p.released||currentProjectionCaps.get(cap)!==p)projectionRequired();if(options.profile!==SEGMENT_PROFILE)fail('BNS_GROUP_RESOURCE_LIMIT');
  const m=projectionMeasure(p.raw.groupMeta,'native'),items=plan.operationCount+plan.heads.length+plan.operationCount;
  const wire=m.B+128*items+2*p.binding.datasetId.length+4096,refs=items+Math.ceil(wire/SEGMENT_PROFILE.chunk)+6;
  // Exact source-bound slot families: canonical tree and key-sort vectors,
  // item JSON/UTF8, decoded-chain/concat/chain UTF8, shard JSON/UTF8, immutable
  // slice, readback slice and digest input, isolated put copy and bounded get
  // copy, plus finite chunk/index ref trees.
  // Twelve wire-sized byte/string slots bound their overlapping original owner
  // buffers. This is a logical tariff, not a browser/native-heap theorem.
  const scratch=projectionTreeCharge(m)+16*m.E+12*wire+1024*refs+64*1024;r.fixedScratch=scratch;projectionReserve(r);
  const prefix=protocolPhysicalId(p.binding.prefix,p.raw.namespace,'',[]).slice(0,-1);
  async function* rows(kind){
   for(const row of p.raw.groupMeta)if(row.id.startsWith(prefix+kind+':')){
    if(p.revoked||p.released||currentProjectionCaps.get(cap)!==p)projectionRequired();projectionFence(r);projectionReserve(r);
    yield row;
   }
  }
  const cut={namespace:p.raw.namespace,generation:p.raw.points[protocolPhysicalId(p.binding.prefix,p.raw.namespace,'generation',[])]?.value||0,ownerGeneration:p.raw.groupMeta.find(row=>row.id==='backup-data-generation')?.value||0,fence:{epoch:p.raw.points['recovery-restore-epoch']?.value??null,namespace:p.raw.namespace,marker:p.raw.groupMeta.some(row=>row.id===protocolPhysicalId(p.binding.prefix,p.raw.namespace,'ownerRecoveryEpoch',[]))},settings:clone(p.controlValues.settings)};
  const result=await owner.encodeOriginalCheckpoint(p.binding.datasetId,projectionBoundedTransport(transport,SEGMENT_PROFILE),{profile:SEGMENT_PROFILE,parents:options.parents,cut,rows,verifyCut:async()=>{if(p.revoked||p.released||currentProjectionCaps.get(cap)!==p)projectionRequired();projectionFence(r);projectionReserve(r);}});
  if(p.revoked||p.released||currentProjectionCaps.get(cap)!==p)projectionRequired();projectionFence(r);projectionDeepFreeze(result);p.encoderResult=result;return result;
 }finally{r.raw=null;r.group=null;r.control=null;r.controlValues=null;releaseHumanQualificationLease(work);p.frames--;if(p.revoked)projectionRevoke(p);}
}
export async function publishHumanCurrentGroupCheckpoint(cap,scope,plan,checkpoint,transport,options){
 if(arguments.length!==6)projectionRequired();const p=currentProjectionCaps.get(cap);
 if(!p||p.revoked||p.released||!p.group||p.group.scope!==scope||p.group.plan!==plan||p.encoderResult!==checkpoint||p.publishing||p.published)projectionRequired();
 const work=beginHumanQualificationWork('projection',PROJECTION_FRAME),r={...p,work,owned:0,closed:false,revoked:false};p.frames++;p.publishing=true;
 try{
  await Promise.resolve();const owner=currentSegmentOwner;if(p.revoked||p.released||currentProjectionCaps.get(cap)!==p)projectionRequired();if(options.profile!==owner.SEGMENT_PROFILE)fail('BNS_GROUP_RESOURCE_LIMIT');
  const m=projectionMeasure([checkpoint.manifest,scope.ownerScope],'native');
  r.fixedScratch=3*projectionTreeCharge(m)+16*m.E+12*(m.B+512)+32*1024;projectionReserve(r);projectionFence(r);
  const manifest={...checkpoint.manifest,ownerScope:scope.ownerScope},object=await owner.protocolObject('checkpoint-manifest',bytes(manifest),{profile:owner.SEGMENT_PROFILE});
  if(p.revoked||p.released||currentProjectionCaps.get(cap)!==p)projectionRequired();projectionFence(r);
  const bounded=projectionBoundedTransport(transport,owner.SEGMENT_PROFILE);await bounded.putImmutable(object.ref,object.bytes);await owner.readObject(object.ref,ref=>bounded.get(ref),{profile:owner.SEGMENT_PROFILE});
  if(p.revoked||p.released||currentProjectionCaps.get(cap)!==p)projectionRequired();projectionFence(r);p.published=true;
  const result={ref:object.ref,manifest};projectionDeepFreeze(result);return result;
 }finally{r.raw=null;r.group=null;r.encoderResult=null;r.control=null;r.controlValues=null;releaseHumanQualificationLease(work);p.publishing=false;p.frames--;if(p.revoked)projectionRevoke(p);}
}


// Fixed original Scope expectation handshake for optional local readonly
// checkpoint export. No DTO reader/callback or physical snapshot is returned.
export async function bindHumanCurrentUnindexedProjectionScope(cap,scope){
 if(arguments.length!==2)projectionRequired();const p=currentProjectionCaps.get(cap);if(!p||p.revoked||p.released||p.scopeBinding)projectionRequired();
 const work=beginHumanQualificationWork('projection',PROJECTION_FRAME),r={...p,work,owned:0,closed:false,revoked:false};p.frames++;
 try{
  if('value'in Object.prototype)projectionRequired();projectionFence(r);await Promise.resolve();const owner=currentHumanOwner;if(p.revoked||p.released||currentProjectionCaps.get(cap)!==p)projectionRequired();if('value'in Object.prototype)projectionRequired();
  if(p.group){
   if(p.group.scope!==scope)projectionRequired();await Promise.resolve();const groupOwner=currentGroupOwner;if(p.revoked||p.released||currentProjectionCaps.get(cap)!==p)projectionRequired();groupOwner.requireOriginalCurrentGroupScope(p.core,scope,p.group.plan);projectionFence(r);
   const ids=Object.freeze(p.raw.prefixes['thought-read-index:'].map(row=>row.id));p.scopeBinding=true;return ids;
  }
  const m=owner.measureHumanScopeProjectionExpectation(scope,p.store),n=projectionMeasure(p.raw,'native');
  // Five actual-source tree tariffs pay original normalizePhysical's whole
  // history plus two nested Topic clones and canonical operands. Expected
  // Scope canonical tree/string uses its own actual meter, never raw's size.
  // Fixed12KiB pays <=6*128 sorted-row refs +128 names/pairs +129 IDs and
  // numeric/handshake frames. These are logical slots, not heap multipliers.
  r.semantic=12*1024+5*projectionTreeCharge(n)+projectionTreeCharge(m)+16*(n.E+m.E)+2*(n.B+m.B);projectionReserve(r,r.semantic);
  owner.assertHumanScopeProjectionExpectation(scope,p.store,p.raw);if(p.revoked||p.released||currentProjectionCaps.get(cap)!==p)projectionRequired();projectionFence(r);
  const ids=Object.freeze(p.raw.prefixes['thought-read-index:'].map(row=>row.id));
  // Body-free <=129 borrowed IDs and one fixed Scope alias fit the existing
  // retained384KiB frame; no new body, second pool or retained lease is added.
  p.scopeBinding=true;return ids;
 }finally{r.semantic=0;r.raw=null;r.controlValues=null;r.control=null;r.scopeBinding=null;r.group=null;r.encoderResult=null;releaseHumanQualificationLease(work);p.frames--;if(p.revoked)projectionRevoke(p);}
}
