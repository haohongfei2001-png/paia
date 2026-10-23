import {contextMutationDependencies,validateContextMutationPlanOrder} from './context-mutation-graph.js';
import {normalizeSavedPayload} from './saved-work-successor-codec.js';
import {groupOperationPages,createGroupPageBudget,checkGroupPageBudget} from './group-page-reader.js';
import {measureSourceWorkingPhysicalTree} from './source-working-physical.js';
import {CORE_LIMITS,validateOperation,validateFrozenOperation,validateHumanCommitGroup,validateContextMutationGroup,prepareOriginalSourceWorkingReceive,prepareOriginalCurrentMixedGroupReceive,requireOriginalSourceWorkingCore} from './core.js';
import {bytes,digest,fail,equal} from './value.js';
import {prepareInitialSourcePlan,initialSourcePlan} from './source-bootstrap-plan.js';
import {prepareSourceAppendPlan} from './source-append-plan.js';
import {promptCorrectionEnvelope} from './prompt-correction-binding.js';
import {assertTopicDesiredReference} from './topic-desired-codec.js';

const families=Object.freeze({sourceBootstrapCommit:['members','prepareSourceBootstrapReceive'],sourceAppendCommit:['refs','prepareSourceAppendReceive'],inputWorkingCommit:['members','prepareWorkingReceive'],humanLibraryCommit:['members',null],contextMutationCommit:['members',null]});
const members=new Set(['sourceBootstrapMember','sourceAppendMember','inputWorkingMember','humanLibraryMember','contextMutationMember']);
const singles=new Set(['promptPreferences','promptBinding','consumerPreference','topicDesired','contextItem','contextRulesItem','contextNowItem','contextDesired','filterIntent','savedWorkBootstrap','savedWorkSuccessor']);
const freeze=x=>{if(x&&typeof x==='object'){for(const value of Object.values(x))freeze(value);Object.freeze(x);}return x;};
const originalPlans=new WeakMap(),originalOperationSizes=new WeakMap();
// Compilation identity is local and body-free. A cloned DTO remains useful to
// old validators but cannot authenticate a native current-generation export.
export function requireOriginalGroupCheckpointPlan(core,plan){
 const p=originalPlans.get(plan);
 if(arguments.length!==2||!p||p.core!==core||core.datasetId!==p.datasetId||core.repository!==p.repository||core.prefix!==p.prefix||core.fixedNamespace!==p.fixedNamespace)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
}
export function originalGroupCheckpointCoreOrNull(plan){if(!originalPlans.has(plan))return null;return originalGroupCheckpointCore(plan);}
export function originalGroupCheckpointCore(plan){const binding=originalPlans.get(plan);if(!binding)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');requireOriginalGroupCheckpointPlan(binding.core,plan);return binding.core;}
export function requireOriginalCurrentSourceWorkingGroupPlan(core,plan){
 requireOriginalSourceWorkingCore(core);
 requireOriginalGroupCheckpointPlan(core,plan);
 if(arguments.length!==2||originalPlans.get(plan).currentSourceWorking!==true)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
}
// Distinct constructor identity for the consuming mixed recovery batch. It
// remains separate from the bounded Source/Working portfolio proof. Each
// constructor keeps its own supported families and original owner qualification.
export function requireOriginalCurrentMixedGroupPlan(core,plan){
 requireOriginalSourceWorkingCore(core);requireOriginalGroupCheckpointPlan(core,plan);
 if(arguments.length!==2||originalPlans.get(plan).currentSourceWorking!=='mixed')fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
}
// Body-free original constructor identity for its consuming Scope. Returning
// an already public Core creates no native read, writer or export authority.
export function originalCurrentMixedGroupCore(plan){
 if(arguments.length!==1)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
 const p=originalPlans.get(plan);if(!p||p.currentSourceWorking!=='mixed')return null;
 requireOriginalCurrentMixedGroupPlan(p.core,plan);return p.core;
}
// Restrict this current-native slice before the general Scope owner allocates
// its complete tables or digests families. The general fixed compiler remains
// usable for broader future prerequisites; only this original native selection
// admits only original Source bootstrap/append and genuine Working commits.
export function requireSelectedCurrentSourceWorkingGroupPlan(core,plan){
 if(arguments.length!==2)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');requireOriginalCurrentSourceWorkingGroupPlan(core,plan);
 let source=0,working=0;
 for(const group of plan.groups){if(group.type==='sourceBootstrapCommit')source++;else if(group.type==='inputWorkingCommit')working++;else if(group.type!=='sourceAppendCommit')fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');}
 if(plan.operationCount>128||source<1||working<1)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
}
// A bounded immutable causal plan only. This module never writes canonical or
// protocol rows. Domain capabilities are minted by the existing strict owners.
async function prepareGroupCheckpointPlanInternal(core,input,currentSourceWorking){
 const binding={core,datasetId:core.datasetId,repository:core.repository,prefix:core.prefix,fixedNamespace:core.fixedNamespace,currentSourceWorking};
 if(currentSourceWorking&&(!Array.isArray(input)||input.length>CORE_LIMITS.batch))fail('BNS_GROUP_RESOURCE_LIMIT');
 const pageBudget=currentSourceWorking||Array.isArray(input)&&input.length<=CORE_LIMITS.batch?null:createGroupPageBudget();
 let size=0;const operations=[],byRevision=new Map(),byId=new Map(),sequences=new Set();
 // Recheck each iteration: validation awaits must not let a growing vector
 // bypass its selected finite profile. Private native and legacy small arrays
 // retain the original batch envelope; paged graphs share a new work ticket.
 for await(const page of pageBudget?groupOperationPages(input,{budget:pageBudget}):[input])for(const candidate of page){
  if(!pageBudget&&operations.length>=CORE_LIMITS.batch)fail('BNS_GROUP_RESOURCE_LIMIT');
  const operationBytes=bytes(candidate).length;size+=operationBytes;if(size>CORE_LIMITS.batchBytes)fail('BNS_GROUP_RESOURCE_LIMIT');
  const op=currentSourceWorking==='mixed'?await validateFrozenOperation(candidate):await validateOperation(candidate);originalOperationSizes.set(op,operationBytes);
  if(currentSourceWorking)requireOriginalSourceWorkingCore(core);else if(pageBudget)checkGroupPageBudget(pageBudget);
  if(op.datasetId!==core.datasetId)fail('BNS_DATASET_MISMATCH');
  if(currentSourceWorking===true&&!['sourceBootstrapCommit','sourceBootstrapMember','sourceAppendCommit','sourceAppendMember','inputWorkingCommit','inputWorkingMember'].includes(op.type))fail('BNS_GROUP_OWNER_UNSUPPORTED');
  if(op.kind!=='put'||!members.has(op.type)&&!singles.has(op.type)&&!Object.hasOwn(families,op.type))fail('BNS_GROUP_OWNER_UNSUPPORTED');
  const sequence=JSON.stringify([op.deviceId,op.sequence]);
  if(byRevision.has(op.revisionId)||byId.has(op.operationId)||sequences.has(sequence))fail('BNS_GROUP_DUPLICATE');
  byRevision.set(op.revisionId,op);byId.set(op.operationId,op);sequences.add(sequence);operations.push(op);
 }
 const heads=new Map(),parentRefs=new Set(operations.flatMap(op=>op.parents));
 for(const op of operations){const key=JSON.stringify([op.type,op.entityId]);if(!heads.has(key))heads.set(key,[]);if(!parentRefs.has(op.revisionId))heads.get(key).push(op.revisionId);}
 for(const revisions of heads.values())if(revisions.length!==1)fail('BNS_CONFLICT_REQUIRES_RESOLUTION');
 const groups=[],claimed=new Map();
 for(const op of operations){
  if(members.has(op.type))continue;
  let rows=[op],prepared=null,capability=null;
  if(Object.hasOwn(families,op.type)){
   const [refs,prepare]=families[op.type];rows=[];
   for(const ref of op.value[refs]){const row=byRevision.get(ref.revisionId);if(!row||row.type!==ref.type||row.entityId!==ref.entityId)fail('BNS_GROUP_INCOMPLETE');rows.push(row);}
   rows.push(op);prepared=op.type==='contextMutationCommit'?await validateContextMutationGroup(rows,core.datasetId):currentSourceWorking==='mixed'?await prepareOriginalCurrentMixedGroupReceive(core,op.type,rows):op.type==='humanLibraryCommit'?await validateHumanCommitGroup(rows,core.datasetId):currentSourceWorking?await prepareOriginalSourceWorkingReceive(core,op.type,rows):await core[prepare](rows);
   const entities=Object.fromEntries(prepared.members.map(row=>[row.value.entityType,row.value.entity]));
   if(op.type==='sourceBootstrapCommit')capability=await prepareInitialSourcePlan(entities);
   if(op.type==='sourceAppendCommit')capability=await prepareSourceAppendPlan(entities,op.value.documentId);
  }
  const group={id:op.revisionId,type:op.type,operations:rows,prepared,capability,dependencies:new Set()};
  for(const row of rows){if(claimed.has(row.revisionId))fail('BNS_GROUP_DUPLICATE');claimed.set(row.revisionId,group);}
  groups.push(group);
 }
 if(claimed.size!==operations.length)fail('BNS_GROUP_INCOMPLETE');
 const plan=await finishOriginalCompiledGraph(core,binding,operations,groups,size,byRevision,claimed,heads);if(pageBudget)checkGroupPageBudget(pageBudget);return plan;
}
async function finishOriginalCompiledGraph(core,binding,operations,groups,size,byRevision,claimed,heads){
 const currentSourceWorking=binding.currentSourceWorking;
 const createdInputs=new Map(),createdSources=new Map();
 for(const group of groups)if(group.type==='sourceBootstrapCommit'||group.type==='sourceAppendCommit'){
  for(const op of group.prepared.members){const entity=op.value.entity;if(op.value.entityType==='input'){if(createdInputs.has(entity.id))fail('BNS_GROUP_SOURCE_COLLISION');createdInputs.set(entity.id,group);}if(op.value.entityType==='source'){if(createdSources.has(entity.sourceKey))fail('BNS_GROUP_SOURCE_COLLISION');createdSources.set(entity.sourceKey,group);}}
 }
 const depend=(group,other)=>{if(!other)fail('BNS_GROUP_CAUSAL_GAP');if(other!==group)group.dependencies.add(other.id);};
 const promptBindings=new Map();for(const group of groups)if(group.type==='promptBinding'){const ref=group.operations[0].value.promptRevisionId;if(promptBindings.has(ref))fail('BNS_PROMPT_BINDING_INVALID');promptBindings.set(ref,group);}
 for(const group of groups){
  for(const op of group.operations){if(op.type==='humanLibraryMember'&&(op.parents.length>1||!equal(op.parents.length?byRevision.get(op.parents[0])?.value.after:null,op.value.before)))fail('BNS_HUMAN_OWNER_CHANGED');for(const id of op.parents){const parent=byRevision.get(id);if(!parent||parent.type!==op.type||parent.entityId!==op.entityId)fail('BNS_GROUP_CAUSAL_GAP');depend(group,claimed.get(id));}}
  if(group.type==='contextMutationCommit'){for(const revision of await contextMutationDependencies(group,byRevision))depend(group,claimed.get(revision));for(const other of groups)if(['sourceBootstrapCommit','sourceAppendCommit','inputWorkingCommit','humanLibraryCommit'].includes(other.type))depend(group,other);}
  if(group.type==='sourceAppendCommit'){
   const anchor=group.prepared.descriptor.value.bootstrap,op=byRevision.get(anchor.revisionId),parent=claimed.get(anchor.revisionId);
   if(!op||op.type!=='sourceBootstrapCommit'||op.operationId!==anchor.operationId||!op.value.members.some(ref=>ref.revisionId===anchor.documentMemberRevisionId&&ref.entityId==='inputDocument:'+group.prepared.descriptor.value.documentId))fail('BNS_GROUP_CAUSAL_GAP');depend(group,parent);
  }
  if(group.type==='inputWorkingCommit')depend(group,createdInputs.get(group.prepared.descriptor.value.inputId));
  if(group.type==='filterIntent'){if(group.operations[0].value.reason!=='restored_from_filter')fail('BNS_GROUP_OWNER_UNSUPPORTED');depend(group,createdSources.get(group.operations[0].entityId));}
  if(group.type==='promptPreferences')for(const parent of group.operations[0].parents)if(promptBindings.has(parent))depend(group,promptBindings.get(parent));
  if(group.type==='topicDesired'){const value=group.operations[0].value;assertTopicDesiredReference(value,byRevision.get(value.topicRef.commitRevisionId),byRevision.get(value.topicRef.memberRevisionId));depend(group,claimed.get(value.topicRef.commitRevisionId));depend(group,claimed.get(value.topicRef.memberRevisionId));}
  if(group.type==='promptBinding'){
   const operation=group.operations[0],prompt=byRevision.get(operation.value.promptRevisionId);if(!prompt||prompt.type!=='promptPreferences'||prompt.entityId!==operation.entityId||prompt.kind!=='put')fail('BNS_GROUP_CAUSAL_GAP');promptCorrectionEnvelope(operation.value,prompt.value);depend(group,claimed.get(prompt.revisionId));
   for(const row of operation.value.bindings)for(const id of row.inputIds)depend(group,createdInputs.get(id));for(const split of prompt.value.splits)depend(group,createdInputs.get(split.inputId));
  }
 }
 for(const [key,revisions]of heads){const [type,id]=JSON.parse(key);if(type!=='promptPreferences')continue;const prompt=byRevision.get(revisions[0]),full=prompt.value.splits.length||prompt.value.pins.some(id=>id.startsWith('pf:'))||prompt.value.overrides.some(row=>row.id.startsWith('pf:')||row.representative!==undefined);const bindingRefs=heads.get(JSON.stringify(['promptBinding',id])),companion=bindingRefs&&byRevision.get(bindingRefs[0]);if((full||bindingRefs)&&(!companion||companion.value.promptRevisionId!==prompt.revisionId))fail('BNS_PROMPT_BINDING_REQUIRED');}
 // Qualified Human owners have no Source/Working references. Preserve their
 // complete parent order and execute them first, so the original local history
 // allocator starts from the actual captured empty installation, never a
 // predicted foreign-owner counter. Existing non-Human dependencies stay intact.
 const saved=groups.filter(group=>group.type==='savedWorkBootstrap'),successors=groups.filter(group=>group.type==='savedWorkSuccessor');
 if(successors.length&&!saved.length)fail('BNS_SAVED_WORK_UNSUPPORTED');
 if(saved.length){
  const humanSaved=groups.filter(g=>g.type==='humanLibraryCommit');
  if(humanSaved.some(g=>!['entry','entry-edit'].includes(g.prepared.descriptor.value.kind)||g.prepared.members.some(op=>!['entry','history'].includes(op.value.entityType))))fail('BNS_SAVED_WORK_UNSUPPORTED');
  if(currentSourceWorking||groups.length!==1+saved.length+successors.length+humanSaved.length||groups.filter(group=>group.type==='sourceBootstrapCommit').length!==1)fail('BNS_SAVED_WORK_UNSUPPORTED');
  // A complete graph may retain pruned/coalesced historical payloads. Check
  // identities across every before/after, not only the final canonical rows:
  // another entity cannot borrow an old revision, provenance or owner receipt.
  const identities=new Map(),sourceBaseline=initialSourcePlan(groups.find(group=>group.type==='sourceBootstrapCommit').capability).baselineRevision;
  const claim=(kind,id,entity)=>{const key=JSON.stringify([kind,id]),prior=identities.get(key);if(prior!==undefined&&prior!==entity)fail('BNS_SAVED_WORK_COLLISION');identities.set(key,entity);};
  const sourceOwner=Symbol('source');claim('history',sourceBaseline.id,sourceOwner);claim('operation',sourceBaseline.operationId,sourceOwner);
  const humanOwners=new Map(),humanOwner=id=>{if(!humanOwners.has(id))humanOwners.set(id,Symbol('human-entry'));return humanOwners.get(id);};
  for(const g of humanSaved)for(const op of g.prepared.members){const row=op.value.after,entity=humanOwner(op.value.entityType==='entry'?row.id:row.entityId);if(op.value.entityType==='entry'){claim('entry',row.id,entity);claim('allocation',row.createdSequence,entity);}else{claim('history',row.id,entity);claim('operation',row.operationId,entity);}}
  for(const group of [...saved,...successors]){const op=group.operations[0],payloads=group.type==='savedWorkBootstrap'?[op.value.payload]:[op.value.before,op.value.after];
   for(const payload of payloads){const entity=op.entityId;claim('entry',entity,entity);claim('provenance',payload.link.provenanceId,entity);claim('allocation',payload.entry.createdSequence,entity);for(const row of payload.history){claim('history',row.id,entity);claim('operation',row.operationId,entity);}}const after=group.type==='savedWorkBootstrap'?op.value.payload:op.value.after;claim('update:'+op.deviceId,after.entry.updatedSequence,op.entityId);
  }
  const anchors=new Map();for(const group of saved){const anchor=group.operations[0],wire=anchor.value.payload.link.evidence,source=createdInputs.get(wire.inputId);
   if(anchors.has(anchor.entityId)||!source||!equal([source.prepared.descriptor.value.sourceId],wire.sourceRecordIds)||!equal([source.prepared.descriptor.value.sourceKey],wire.sourceIdentityTokens))fail('BNS_GROUP_CAUSAL_GAP');
   anchors.set(anchor.entityId,group);depend(group,source);
  }
  for(const next of successors){const op=next.operations[0],group=anchors.get(op.entityId),anchor=group?.operations[0],prior=op.parents.length?byRevision.get(op.parents[0]):anchor;
   if(!anchor||op.value.anchor!==anchor.revisionId||op.parents.length>1||!prior||prior.entityId!==anchor.entityId||(op.parents.length&&(prior.type!=='savedWorkSuccessor'||prior.value.anchor!==anchor.revisionId))||!equal(normalizeSavedPayload(op.value.before),normalizeSavedPayload(prior.type==='savedWorkBootstrap'?prior.value.payload:prior.value.after)))fail('BNS_SAVED_WORK_CHANGED');
   depend(next,group);
  }
 }
 const human=groups.filter(group=>group.type==='humanLibraryCommit'),linked=human.filter(group=>group.prepared.descriptor.value.kind.startsWith('source-'));
 if(linked.length){
  if(binding.currentSourceWorking===true||groups.filter(group=>group.type==='sourceBootstrapCommit').length!==1||groups.some(group=>!['humanLibraryCommit','sourceBootstrapCommit','inputWorkingCommit','contextMutationCommit','contextItem','contextRulesItem','contextNowItem','contextDesired'].includes(group.type)))fail('BNS_HUMAN_UNSUPPORTED');
  // A linked Human action observes one exact Source/Working content revision.
  // Order the real producer, never just a same-Input bootstrap or every edit.
  for(const group of linked){
   const links=group.prepared.members.filter(op=>op.value.entityType==='sourceLink');if(!links.length)fail('BNS_GROUP_CAUSAL_GAP');
   for(const link of links){const e=link.value.after.evidence,source=createdInputs.get(e.inputId);if(!source)fail('BNS_GROUP_CAUSAL_GAP');
    const initial=initialSourcePlan(source.capability);if(!equal([initial.source.id],e.sourceRecordIds)||!equal([initial.source.sourceKey],e.sourceIdentityTokens))fail('BNS_GROUP_CAUSAL_GAP');depend(group,source);
    const edits=groups.filter(g=>g.type==='inputWorkingCommit'&&g.prepared.descriptor.value.inputId===e.inputId),states=edits.map(g=>({group:g,state:g.prepared.members.find(op=>op.value.entityType==='inputState')?.value.entity}));
    if(states.some(x=>!x.state)||states.length&&Math.max(...states.map(x=>x.state.contentRevision))!==e.basedOnContentRevision)fail('BNS_GROUP_CAUSAL_GAP');
    if(e.basedOnContentRevision===initial.inputState.contentRevision){if(edits.length)fail('BNS_GROUP_CAUSAL_GAP');}
    else{const match=states.filter(x=>x.state.contentRevision===e.basedOnContentRevision);if(match.length!==1)fail('BNS_GROUP_CAUSAL_GAP');depend(group,match[0].group);}
   }
  }
  for(const group of groups)if(group.type==='sourceBootstrapCommit')for(const other of human.filter(g=>!linked.includes(g)))group.dependencies.add(other.id);
 }else{for(const group of human)if([...group.dependencies].some(id=>!human.some(other=>other.id===id)))fail('BNS_HUMAN_UNSUPPORTED');for(const group of groups)if(group.type!=='humanLibraryCommit')for(const other of human)group.dependencies.add(other.id);}

 const done=new Set(),ordered=[];
 while(ordered.length<groups.length){const ready=groups.filter(group=>!done.has(group.id)&&[...group.dependencies].every(id=>done.has(id))).sort((a,b)=>a.id.localeCompare(b.id));if(!ready.length)fail('BNS_GROUP_CAUSAL_GAP');for(const group of ready){done.add(group.id);ordered.push({...group,dependencies:[...group.dependencies].sort()});}}
 if(ordered.some(group=>group.type==='contextMutationCommit'))await validateContextMutationPlanOrder(ordered);
 // Exact ordering commitment is independent of received object/page order.
 const graph=ordered.map(group=>({id:group.id,type:group.type,revisions:group.operations.map(op=>op.revisionId),dependencies:group.dependencies}));
 const plan=freeze({heads:[...heads].map(([key,revisions])=>({type:JSON.parse(key)[0],entityId:JSON.parse(key)[1],revisions,purged:false,fence:null})).sort((a,b)=>JSON.stringify([a.type,a.entityId]).localeCompare(JSON.stringify([b.type,b.entityId]))),groups:ordered,operationCount:operations.length,operationBytes:size,digest:await digest(graph)});
 if(currentSourceWorking)requireOriginalSourceWorkingCore(core);
 if(core.datasetId!==binding.datasetId||core.repository!==binding.repository||core.prefix!==binding.prefix||core.fixedNamespace!==binding.fixedNamespace)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
 originalPlans.set(plan,binding);return plan;
}

export async function prepareGroupCheckpointPlan(core,input){return prepareGroupCheckpointPlanInternal(core,input,false);}
// Only fixed original Source/Working validators; no supplied preparation method.
// The later native capture owner still authenticates the complete current cut.
export async function prepareCurrentSourceWorkingGroupCheckpointPlan(core,input){
 if(arguments.length!==2)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');requireOriginalSourceWorkingCore(core);
 return prepareGroupCheckpointPlanInternal(core,input,true);
}

// Pure fixed-original compilation only; the native owner must still bind and
// qualify the complete physical cut before the mixed exporter can consume it.
export async function prepareCurrentMixedGroupCheckpointPlan(core,input){
 if(arguments.length!==2)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');requireOriginalSourceWorkingCore(core);
 return prepareGroupCheckpointPlanInternal(core,input,'mixed');
}

// Original closed graph construction from already admitted immutable domain
// groups. No validator/Source private payload is cloned again. Dependencies,
// heads and digest are rebuilt by the SAME original causal graph owner;
// filtering the current dependency vectors or final heads would be incorrect.
export async function prepareOriginalCurrentMixedForeignPrefix(core,complete){
 if(arguments.length!==2)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');requireOriginalCurrentMixedGroupPlan(core,complete);return prepareOriginalCurrentForeignPrefix(core,complete);
}
export async function prepareOriginalCurrentSourceWorkingForeignPrefix(core,complete){
 if(arguments.length!==2)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');requireSelectedCurrentSourceWorkingGroupPlan(core,complete);return prepareOriginalCurrentForeignPrefix(core,complete);
}
async function prepareOriginalCurrentForeignPrefix(core,complete){
 const requirePlan=originalPlans.get(complete)?.currentSourceWorking==='mixed'?requireOriginalCurrentMixedGroupPlan:requireOriginalCurrentSourceWorkingGroupPlan;requirePlan(core,complete);if(originalPlans.get(complete).borrowedFrom)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
 const binding={...originalPlans.get(complete),borrowedFrom:complete},groups=[],operations=[],byRevision=new Map(),claimed=new Map();let size=0;
 for(const original of complete.groups){
  const ours=original.operations.filter(op=>op.deviceId===core.deviceId).length;if(ours&&ours!==original.operations.length)fail('BNS_GROUP_CAUSAL_GAP');if(ours)continue;
  const group={id:original.id,type:original.type,operations:original.operations,prepared:original.prepared,capability:original.capability,dependencies:new Set()};groups.push(group);
  for(const op of group.operations){const length=originalOperationSizes.get(op);if(!Number.isSafeInteger(length)||length<1||byRevision.has(op.revisionId))fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');size+=length;operations.push(op);byRevision.set(op.revisionId,op);claimed.set(op.revisionId,group);}
 }
 if(!groups.length||operations.length>CORE_LIMITS.batch||size>CORE_LIMITS.batchBytes)fail('BNS_GROUP_RESOURCE_LIMIT');
 const heads=new Map(),parents=new Set(operations.flatMap(op=>op.parents));for(const op of operations){const key=JSON.stringify([op.type,op.entityId]);if(!heads.has(key))heads.set(key,[]);if(!parents.has(op.revisionId))heads.get(key).push(op.revisionId);}
 for(const revisions of heads.values())if(revisions.length!==1)fail('BNS_CONFLICT_REQUIRES_RESOLUTION');
 const prefix=await finishOriginalCompiledGraph(core,binding,operations,groups,size,byRevision,claimed,heads);requirePlan(core,complete);return prefix;
}
// A pure causal subplan of one already validated complete Mixed Plan. Exact
// group membership is snapshotted before hashing; original immutable operation,
// family and Source capabilities stay borrowed from that same complete Plan.
// This produces no native cut, Scope, writer or permission capability.
export async function prepareOriginalCurrentMixedSubset(core,complete,ids){
 if(arguments.length!==3)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');requireOriginalCurrentMixedGroupPlan(core,complete);
 if(originalPlans.get(complete).borrowedFrom||!Array.isArray(ids)||!ids.length||ids.length>128)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
 const selected=new Set();for(let i=0;i<ids.length;i++){const d=Object.getOwnPropertyDescriptor(ids,String(i));if(!d||!Object.hasOwn(d,'value')||typeof d.value!=='string'||selected.has(d.value)||!complete.groups.some(g=>g.id===d.value))fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');selected.add(d.value);}
 const binding={...originalPlans.get(complete),borrowedFrom:complete},groups=[],operations=[],byRevision=new Map(),claimed=new Map();let size=0;
 for(const original of complete.groups){if(!selected.has(original.id))continue;const group={id:original.id,type:original.type,operations:original.operations,prepared:original.prepared,capability:original.capability,dependencies:new Set()};groups.push(group);
  for(const op of group.operations){const n=originalOperationSizes.get(op);if(!Number.isSafeInteger(n)||n<1||byRevision.has(op.revisionId))fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');size+=n;operations.push(op);byRevision.set(op.revisionId,op);claimed.set(op.revisionId,group);}
 }
 if(operations.length>CORE_LIMITS.batch||size>CORE_LIMITS.batchBytes)fail('BNS_GROUP_RESOURCE_LIMIT');const parents=new Set(operations.flatMap(op=>op.parents)),heads=new Map();
 for(const op of operations){const key=JSON.stringify([op.type,op.entityId]);if(!heads.has(key))heads.set(key,[]);if(!parents.has(op.revisionId))heads.get(key).push(op.revisionId);}for(const rows of heads.values())if(rows.length!==1)fail('BNS_CONFLICT_REQUIRES_RESOLUTION');
 const result=await finishOriginalCompiledGraph(core,binding,operations,groups,size,byRevision,claimed,heads);requireOriginalCurrentMixedGroupPlan(core,complete);return result;
}

export function measureOriginalMixedPrefixWrappers(core,complete,prefix){
 requireOriginalCurrentMixedGroupPlan(core,complete);requireOriginalCurrentMixedGroupPlan(core,prefix);if(originalPlans.get(prefix).borrowedFrom!==complete)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
 const total=measureSourceWorkingPhysicalTree(prefix.heads);for(const group of prefix.groups){const m=measureSourceWorkingPhysicalTree({id:group.id,type:group.type,dependencies:group.dependencies});for(const key of ['B','T','V','E'])total[key]+=m[key];}
 total.V+=prefix.groups.length*4+16;total.E+=prefix.groups.length*8+32;total.T+=prefix.digest.length;return Object.freeze(total);
}

// Logical canonical Plan metering still traverses every encoded view. Actual
// retained ownership counts the already identical Human prepared operation
// objects once; their extra array/reference cells remain in the full meter.
// All independent group-operation clones and private Source bodies stay owned.
export function measureOriginalMixedPlanNativeOperationAliases(core,plan,nativeOperations){
 if(arguments.length!==3||!Array.isArray(nativeOperations))fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');requireOriginalCurrentMixedGroupPlan(core,plan);
 const native=new Set(nativeOperations),seen=new WeakSet(),total={B:0,T:0,V:0,E:0};for(const group of plan.groups)for(const op of group.operations)if(native.has(op)&&!seen.has(op)){seen.add(op);const m=measureSourceWorkingPhysicalTree(op);for(const key of ['B','T','V','E'])total[key]+=m[key];}return Object.freeze(total);
}
export function measureOriginalMixedRepeatedPreparedOperations(core,plan){
 if(arguments.length!==2)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');requireOriginalCurrentMixedGroupPlan(core,plan);
 const total={B:0,T:0,V:0,E:0},add=op=>{const m=measureSourceWorkingPhysicalTree(op);for(const key of ['B','T','V','E'])total[key]+=m[key];};
 for(const group of plan.groups)if(group.prepared){
  const p=group.prepared;
  // The full Plan meter traverses operations and prepared descriptor/members
  // separately. Rebate only actual identity aliases, never equal independent
  // trees or private Source capabilities; their reference cells stay paid.
  for(const op of [p.descriptor,...p.members])if(group.operations.includes(op))add(op);
  if(Array.isArray(p.operations))for(const op of p.operations){if(op!==p.descriptor&&!p.members.includes(op))fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');add(op);}
 }
 return Object.freeze(total);
}
