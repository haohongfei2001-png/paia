import {registerRepositoryFinalReadFence} from '../idb-repository.js';
import {ownerVersion,planSearchQueueLocator} from '../library-search.js';
import {requireOriginalGroupCheckpointPlan} from './group-checkpoint-plan.js';
import {HumanLibrarySyncJournal,readOriginalHumanReceiveExpectation,requireOriginalHumanGenerationJournal,prepareOriginalHumanGenerationReceive,commitOriginalHumanGenerationReceive} from './human-library-journal.js';
import {captureHumanGraphReadSet,advanceHumanGraphSource,advanceHumanGraphWorking,requireHumanGraphReadSet,prepareHumanGraphNamedPlan,advanceHumanGraphReadSet,humanGraphReadSetProjection,humanPlanJournalRows,executeHumanPlanInTransaction} from './human-library-plan.js';
import {portableHumanEntity} from './human-library-codec.js';
import {physical,normalizePhysical} from './human-library-journal.js';
import {clone,equal,fail} from './value.js';
const applications=new WeakMap();
// A private closed-graph application, built only from the original opaque
// named-owner plans. No domain reducer or generic data-store proxy is installed.
export async function prepareHumanGroupApplication(store,core,plan,working=null){
 requireOriginalGroupCheckpointPlan(core,plan);
 if(working){if(working.plan!==plan||!Array.isArray(working.applications)||working.applications.length!==plan.groups.length||working.applications.some((pair,i)=>!Array.isArray(pair)||pair.length!==2||pair[0]!==plan.groups[i]))fail('BNS_PREPARATION_REQUIRED');working={plan,applications:Object.freeze(working.applications.map(pair=>Object.freeze([...pair])))};}
 return prepareGroupApplication(store,core,plan,null,working);
}
export async function prepareHumanIncrementalGroupApplication(store,core,basePlan,groups,working=null){
 requireOriginalGroupCheckpointPlan(core,basePlan);
 if(working){requireOriginalGroupCheckpointPlan(core,working.plan);if(!Array.isArray(groups)||!groups.length||groups.length>128||new Set(groups).size!==groups.length||!Array.isArray(working.applications)||working.applications.length>128)fail('BNS_HUMAN_UNSUPPORTED');
  groups=Object.freeze([...groups]);working={plan:working.plan,applications:Object.freeze(working.applications.map(pair=>Object.freeze([pair[0],pair[1]])))};let afterHuman=false;
  for(const group of groups){if(!working.plan.groups.includes(group)||!['humanLibraryCommit','inputWorkingCommit'].includes(group.type))fail('BNS_HUMAN_UNSUPPORTED');if(group.type==='inputWorkingCommit'){afterHuman=true;if(!working.applications.some(([g,cap])=>g===group&&cap))fail('BNS_PREPARATION_REQUIRED');}else if(afterHuman||group.prepared.descriptor.value.kind.startsWith('source-'))fail('BNS_HUMAN_UNSUPPORTED');}
 }
 return prepareGroupApplication(store,core,{groups},basePlan,working);
}
async function prepareGroupApplication(store,core,plan,basePlan,working=null){
 const groups=plan.groups.filter(group=>group.type==='humanLibraryCommit');if(!groups.length)return null;
 const protocols=basePlan?await core.prepareHumanIncrementalProtocols(basePlan,working?groups:plan.groups):await core.prepareHumanRestoreProtocols(plan.groups),inventory=await captureHumanGraphReadSet(store,core),initial=humanGraphReadSetProjection(inventory);
 if(!basePlan)for(const name of ['thoughts','topics','sections','placements','thoughtSuppressions','revisions','operationReceipts','names','pairs','indices','provenance','dependencies'])if(initial[name].length)fail('BNS_HUMAN_RESTORE_REQUIRED');
 const mappingState=new Map(),steps=[],searchChanges=new Map(),mappingIds=await core.transaction(false,async t=>Object.fromEntries(await Promise.all([...new Set(protocols.flatMap(item=>item.members.map(op=>op.entityId)))].map(async id=>[id,await core.idIn(t,'humanMapping',id)]))),['meta']);
 if(basePlan)await core.transaction(false,async t=>{for(const id of Object.keys(mappingIds)){const row=await core.get(t,'humanMapping',id);if(row)mappingState.set(id,row);}},['meta']);
 const linked=groups.some(group=>group.prepared.descriptor.value.kind.startsWith('source-'));let linkedWorkingEpoch=null;
 for(const group of plan.groups){
  if(group.type!=='humanLibraryCommit'){
   if(group.type==='inputWorkingCommit'&&working)await advanceHumanGraphWorking(inventory,working.plan,group,working.applications.find(([g])=>g===group)?.[1]);
   else if(group.type==='sourceBootstrapCommit'&&linked)advanceHumanGraphSource(inventory,plan,group);
   else if(linked&&!['contextMutationCommit','contextItem','contextRulesItem','contextNowItem','contextDesired'].includes(group.type))fail('BNS_HUMAN_UNSUPPORTED');
   continue;
  }
  const protocol=protocols.find(item=>item.descriptor.revisionId===group.id);if(!protocol)fail('BNS_HUMAN_COMMIT_REQUIRED');const beforeState=humanGraphReadSetProjection(inventory),owner=await prepareHumanGraphNamedPlan(inventory,protocol.descriptor.value),view=humanPlanJournalRows(owner),history=new Map(beforeState.revisions.map(row=>[row.id,row]));for(const row of view.history)history.set(row.id,row);
  for(const id of [...new Set(view.rows.filter(row=>row.type==='topic').map(row=>row.after.id))])for(const row of beforeState.revisions.filter(row=>row.kind==='topic'&&row.entityId===id))if(!view.rows.some(item=>item.type==='history'&&item.after.id===row.id))view.rows.push({type:'history',before:row,after:row});
  if(view.rows.length!==protocol.members.length)fail('BNS_HUMAN_PLAN_CHANGED');const mappings=[];
  for(const row of view.rows){
   const member=protocol.members.find(op=>op.entityId===row.type+':'+row.after.id);if(!member||member.value.entityType!==row.type)fail('BNS_HUMAN_PLAN_CHANGED');
   const before=await portableHumanEntity(row.type,row.before,[...history.values()],view.secret),after=await portableHumanEntity(row.type,row.after,[...history.values()],view.secret);
   if(!equal(normalizePhysical(row.type,before),normalizePhysical(row.type,member.value.before))||!equal(normalizePhysical(row.type,after),normalizePhysical(row.type,member.value.after)))fail('BNS_HUMAN_PLAN_CHANGED');
   const prior=mappingState.get(member.entityId)??null;if(prior&&(!equal(prior.local,physical(row.type,before))||!equal(prior.wire,physical(row.type,member.value.before))))fail('BNS_HUMAN_MAPPING_CHANGED');
   const mapped={type:row.type,wire:physical(row.type,member.value.after),local:physical(row.type,after),revisionId:member.revisionId};mappings.push({id:member.entityId,before:clone(prior),after:mapped});mappingState.set(member.entityId,{...mapped,id:mappingIds[member.entityId]});
  }
  for(const row of view.rows){const table={entry:'thoughts',topic:'topics',section:'sections'}[row.type];if(!table)continue;const old=beforeState[table].find(r=>r.id===row.after.id),version=ownerVersion(row.type,row.after);if(old?.searchVersion!==version){const queue=planSearchQueueLocator(row.type,row.after,version);searchChanges.set(queue.id,queue);}}
  steps.push({id:group.id,owner,protocol,mappings});advanceHumanGraphReadSet(inventory,owner);if(linked&&working)linkedWorkingEpoch=beforeState.epoch;
 }
 const cap=Object.freeze({});applications.set(cap,{store,core,plan,basePlan,inventory,steps,linkedWorkingEpoch,searchChanges:[...searchChanges.values()],incremental:!!basePlan,expected:basePlan?humanGraphReadSetProjection(inventory):null});return cap;
}
export async function requireHumanGroupApplication(t,cap){const a=applications.get(cap);if(!a)fail('BNS_PREPARATION_REQUIRED');await requireHumanGraphReadSet(t,a.inventory);}
// The future evidence epoch is retained by the original application, not
// supplied by the coordinator or sampled after writes to manufacture success.
export async function sealHumanWorkingGroupApplication(t,cap){
 const a=applications.get(cap);if(!a)fail('BNS_PREPARATION_REQUIRED');if(a.linkedWorkingEpoch===null)return;
 const expected={id:'thought-epoch',value:a.linkedWorkingEpoch};if(!equal(await t.get('meta',expected.id),expected))fail('BNS_HUMAN_CHANGED');
 registerRepositoryFinalReadFence(a.store.repository,t,{isCurrent:()=>{if(applications.get(cap)!==a)fail('BNS_PREPARATION_REQUIRED');return true;},plan:function*(){if(!equal(yield {method:'get',table:'meta',key:expected.id},expected))fail('BNS_HUMAN_CHANGED');return true;}});
}
export async function applyHumanGroupStep(t,cap,id){
 const a=applications.get(cap),step=a?.steps.find(item=>item.id===id);if(!step)fail('BNS_PREPARATION_REQUIRED');for(const row of step.mappings)if(!equal(await a.core.get(t,'humanMapping',row.id)??null,row.before))fail('BNS_HUMAN_MAPPING_CHANGED');
 return a.core.commitHumanReceive(t,step.protocol,async()=>{await executeHumanPlanInTransaction(t,step.owner);for(const row of step.mappings)await a.core.put(t,'humanMapping',[row.id],row.after);});
}

// A bounded generation continuation consumes the existing single-group receiver.
// It does not replay a DTO reducer or weaken the original whole graph compiler.
const generationSteps=new WeakMap(),generationTransactions=new WeakSet();
export function isOriginalHumanGenerationTransaction(t){return generationTransactions.has(t);}
export async function prepareOriginalHumanGenerationStep(store,core,plan,index){
 requireOriginalGroupCheckpointPlan(core,plan);
 if(!Number.isSafeInteger(index)||index<0||index>=plan.groups.length||plan.groups.some(g=>g.type!=='humanLibraryCommit'||!['entry','entry-edit'].includes(g.prepared.descriptor.value.kind)))fail('BNS_HUMAN_GENERATION_SCOPE');
 const journal=store.humanLibraryJournal,group=plan.groups[index];if(!(journal instanceof HumanLibrarySyncJournal)||journal.core!==core||store.repository!==core.repository)fail('BNS_HUMAN_BINDING_REQUIRED');
 requireOriginalHumanGenerationJournal(journal,core);const prepared=await prepareOriginalHumanGenerationReceive(journal,core,store,group.operations);requireOriginalHumanGenerationJournal(journal,core);if(prepared.duplicate)fail('BNS_HUMAN_GENERATION_CURSOR');
 const cap=Object.freeze({});generationSteps.set(cap,{store,core,journal,prepared,plan,index});return cap;
}
export async function applyOriginalHumanGenerationStep(t,cap){
 const p=generationSteps.get(cap);if(!p||p.store.repository!==p.core.repository||p.store.humanLibraryJournal!==p.journal||p.journal.core!==p.core)fail('BNS_HUMAN_GENERATION_SCOPE');requireOriginalGroupCheckpointPlan(p.core,p.plan);
 requireOriginalHumanGenerationJournal(p.journal,p.core);generationTransactions.add(t);try{const result=await commitOriginalHumanGenerationReceive(p.journal,p.core,t,p.prepared);if(result.state!=='applied')fail('BNS_HUMAN_GENERATION_CURSOR');return result;}finally{generationTransactions.delete(t);}
}

// Exact planned original-owner metadata, not a caller-supplied exclusion list.
// Every returned value was produced by the actual private named-owner plans.
export function humanIncrementalExpectedMetadata(store,core,cap){const a=applications.get(cap);if(!a||a.store!==store||a.core!==core||!a.incremental)fail('BNS_PREPARATION_REQUIRED');return clone({meta:[...a.expected.names,...a.expected.pairs,...a.expected.indices],search:a.searchChanges,tables:Object.fromEntries(['thoughts','topics','sections','placements','thoughtSuppressions','revisions','operationReceipts','provenance','dependencies'].map(name=>[name,a.expected[name]]))});}

// Only the original cold application can supply the Human partition to Saved.
// The inventory and mapping values are derived before any canonical write.
export function originalHumanSavedApplicationWitness(store,core,plan,cap){
 const a=applications.get(cap);if(!a||a.store!==store||a.core!==core||a.plan!==plan||a.incremental)fail('BNS_PREPARATION_REQUIRED');requireOriginalGroupCheckpointPlan(core,plan);
 if(a.steps.some(step=>!['entry','entry-edit'].includes(step.protocol.descriptor.value.kind)))fail('BNS_SAVED_WORK_UNSUPPORTED');
 const state=humanGraphReadSetProjection(a.inventory);
 return {state,search:clone(a.searchChanges),mappings:a.steps.flatMap(step=>step.mappings).map(row=>({id:row.id,after:clone(row.after)}))};
}
// A Saved mixed receiver may consume only this original single Human owner.
// Bind the private application to both compiled cuts, never a caller's DTO.
export function originalHumanSavedIncrementalWitness(store,core,before,after,cap){
 const a=applications.get(cap);if(!a||a.store!==store||a.core!==core||a.basePlan!==before||!a.incremental||a.steps.length!==1)fail('BNS_PREPARATION_REQUIRED');
 requireOriginalGroupCheckpointPlan(core,before);requireOriginalGroupCheckpointPlan(core,after);
 const step=a.steps[0];if(!['entry','entry-edit'].includes(step.protocol.descriptor.value.kind)||step.protocol.members.some(op=>!['entry','history'].includes(op.value.entityType)))fail('BNS_SAVED_WORK_UNSUPPORTED');
 const operations=[...step.protocol.members,step.protocol.descriptor],order=rows=>[...rows].sort((x,y)=>x.revisionId.localeCompare(y.revisionId));
 if(!equal(order(after.groups.flatMap(g=>g.operations)),order([...before.groups.flatMap(g=>g.operations),...operations])))fail('BNS_PREPARATION_REQUIRED');
 return clone({state:a.expected,search:a.searchChanges,mappings:step.mappings,operations});
}
export function readOriginalHumanGenerationStepExpectation(cap){const p=generationSteps.get(cap);if(!p)fail('BNS_HUMAN_GENERATION_SCOPE');requireOriginalGroupCheckpointPlan(p.core,p.plan);return readOriginalHumanReceiveExpectation(p.journal,p.prepared);}
