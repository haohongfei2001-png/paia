import {captureHumanGraphReadSet,requireHumanGraphReadSet,prepareHumanGraphNamedPlan,advanceHumanGraphReadSet,humanGraphReadSetProjection,humanPlanJournalRows,executeHumanPlanInTransaction} from './human-library-plan.js';
import {portableHumanEntity} from './human-library-codec.js';
import {physical,normalizePhysical} from './human-library-journal.js';
import {clone,equal,fail} from './value.js';
const applications=new WeakMap();
// A private closed-graph application, built only from the original opaque
// named-owner plans. No domain reducer or generic data-store proxy is installed.
export async function prepareHumanGroupApplication(store,core,plan){
 const groups=plan.groups.filter(group=>group.type==='humanLibraryCommit');if(!groups.length)return null;
 const protocols=await core.prepareHumanRestoreProtocols(plan.groups),inventory=await captureHumanGraphReadSet(store,core),initial=humanGraphReadSetProjection(inventory);
 for(const name of ['thoughts','topics','sections','placements','thoughtSuppressions','revisions','operationReceipts','names','pairs','indices'])if(initial[name].length)fail('BNS_HUMAN_RESTORE_REQUIRED');
 const mappingState=new Map(),steps=[],mappingIds=await core.transaction(false,async t=>Object.fromEntries(await Promise.all([...new Set(protocols.flatMap(item=>item.members.map(op=>op.entityId)))].map(async id=>[id,await core.idIn(t,'humanMapping',id)]))),['meta']);
 for(const group of groups){
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
  steps.push({id:group.id,owner,protocol,mappings});advanceHumanGraphReadSet(inventory,owner);
 }
 const cap=Object.freeze({});applications.set(cap,{store,core,inventory,steps});return cap;
}
export async function requireHumanGroupApplication(t,cap){const a=applications.get(cap);if(!a)fail('BNS_PREPARATION_REQUIRED');await requireHumanGraphReadSet(t,a.inventory);}
export async function applyHumanGroupStep(t,cap,id){
 const a=applications.get(cap),step=a?.steps.find(item=>item.id===id);if(!step)fail('BNS_PREPARATION_REQUIRED');for(const row of step.mappings)if(!equal(await a.core.get(t,'humanMapping',row.id)??null,row.before))fail('BNS_HUMAN_MAPPING_CHANGED');
 return a.core.commitHumanReceive(t,step.protocol,async()=>{await executeHumanPlanInTransaction(t,step.owner);for(const row of step.mappings)await a.core.put(t,'humanMapping',[row.id],row.after);});
}
