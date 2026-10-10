import {reserveOriginalMixedRestoredPrefixPhase} from './human-library-plan.js';
import {measureSourceWorkingPhysicalTree} from './source-working-physical.js';
import {prepareMixedHumanPhysicalExpectation,assertMixedHumanPhysicalExpectation} from './mixed-human-physical.js';
import {requireOriginalCurrentMixedGroupPlan,prepareCurrentMixedGroupCheckpointPlan} from './group-checkpoint-plan.js';
import {requireOriginalCurrentMixedGroupScope,prepareOriginalMixedWireOwnerScope} from './group-checkpoint-scope.js';
import {assertCompletedGroupedRestoreControl} from './completed-group-restore-control.js';
import {protocolPhysicalId} from './physical-key.js';
import {clone,count,equal,fail} from './value.js';

const proofs=new WeakMap(),refuse=()=>fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
// Preparation runs outside IDB. Only the separately authenticated imported
// prefix is replayed for local allocator facts; later original local groups
// retain their real device sequence. This opaque proof grants no native read,
// budget, write or export. A native consumer still owes all live-work tariffs.
export async function prepareMixedRestoredAllocationProof(core,plan,meta,native){
 if(arguments.length!==3&&arguments.length!==4)refuse();requireOriginalCurrentMixedGroupPlan(core,plan);
 if(core.fixedNamespace!==null||!Array.isArray(meta)||meta.length>4096)refuse();
 const active=meta.find(row=>row.id===core.prefix+'active'),completed=meta.filter(row=>row.id.startsWith(core.prefix+'generation:')&&row.id.endsWith(':restore:'));
 if(!active||completed.length!==1||meta.some(row=>row.id==='recovery-restore-epoch'))refuse();
 if(native)reserveOriginalMixedRestoredPrefixPhase(native.nonce,native.store,native.scope,plan,'control');
 await assertCompletedGroupedRestoreControl(completed[0],{prefix:core.prefix,datasetId:core.datasetId,active,namespace:active.namespace,epoch:null});requireOriginalCurrentMixedGroupPlan(core,plan);
 const imported=[],local=[];
 for(const group of plan.groups){
  const ours=group.operations.filter(op=>op.deviceId===core.deviceId).length;
  if(ours!==0&&ours!==group.operations.length)refuse();(ours?local:imported).push(group);
 }
 if(!imported.length)refuse();
 if(native)reserveOriginalMixedRestoredPrefixPhase(native.nonce,native.store,native.scope,plan,'compiler');
 const prefix=await prepareCurrentMixedGroupCheckpointPlan(core,imported.flatMap(group=>group.operations));requireOriginalCurrentMixedGroupPlan(core,plan);
 if(prefix.digest!==completed[0].graphDigest)refuse();
 if(native)reserveOriginalMixedRestoredPrefixPhase(native.nonce,native.store,native.scope,plan,'wire',prefix);
 const ownerScope=await prepareOriginalMixedWireOwnerScope(core,prefix);requireOriginalCurrentMixedGroupPlan(core,plan);
 const coverage=new Map();for(const head of prefix.heads){const row=coverage.get(head.type)??{type:head.type,version:1,count:0};row.count++;coverage.set(head.type,row);}
 const devices=new Set(prefix.groups.flatMap(group=>group.operations.map(op=>op.deviceId))),manifest=completed[0].manifest;
 if(!equal(ownerScope,manifest.ownerScope)||!equal([...coverage.values()].sort((a,b)=>a.type.localeCompare(b.type)),manifest.coverage)||manifest.itemCount!==prefix.operationCount+prefix.heads.length+devices.size)refuse();
 const tail=local.sort((a,b)=>Math.min(...a.operations.map(op=>op.sequence))-Math.min(...b.operations.map(op=>op.sequence))),localOps=tail.flatMap(group=>group.operations).sort((a,b)=>a.sequence-b.sequence);
 if(localOps.some((op,i)=>op.sequence!==i+1))refuse();
 for(const group of tail){const sequences=group.operations.map(op=>op.sequence).sort((a,b)=>a-b);if(sequences.some((n,i)=>n!==sequences[0]+i)||!['inputWorkingCommit','humanLibraryCommit','promptPreferences','contextItem','contextRulesItem','contextNowItem','contextDesired'].includes(group.type))refuse();}
 if(native)reserveOriginalMixedRestoredPrefixPhase(native.nonce,native.store,native.scope,plan,'mapped',prefix);
 const inputs=new Map(),history=new Map();let delta=0,revision=0;
 for(const [groups,localGroup]of [[prefix.groups,false],[tail,true]])for(const group of groups){
  if(group.type==='sourceBootstrapCommit'||group.type==='sourceAppendCommit'){
   const state=group.prepared.members.find(op=>op.value.entityType==='inputState')?.value.entity,baseline=group.prepared.members.find(op=>op.value.entityType==='baselineRevision')?.value.entity;
   if(!state||!baseline||inputs.has(state.id)||history.has(baseline.id))refuse();inputs.set(state.id,++delta);history.set(baseline.id,++revision);
  }else if(group.type==='inputWorkingCommit'){
   const state=group.prepared.members.find(op=>op.value.entityType==='inputState')?.value.entity;if(!state||!inputs.has(state.id))refuse();inputs.set(state.id,++delta);
   if(localGroup&&state.deltaSequence!==delta)refuse();
   for(const op of group.prepared.members)if(op.value.entityType==='revision'){const h=op.value.entity;if(!history.has(h.id))history.set(h.id,++revision);if(localGroup&&h.sequence!==history.get(h.id))refuse();}
  }else if(group.type==='humanLibraryCommit'){
   for(const op of group.prepared.members)if(op.value.entityType==='history'){const h=op.value.after;if(!history.has(h.id))history.set(h.id,++revision);if(localGroup&&h.sequence!==history.get(h.id))refuse();}
  }else if(!['promptPreferences','contextItem','contextRulesItem','contextNowItem','contextDesired'].includes(group.type))refuse();
 }
 // Bind the validated prefix order back to the existing complete immutable
 // Plan. Prefix compiler/control/ownerScope operands have returned; no second
 // full Plan or its private Source payload survives into keyed construction.
 // The prefix dependency order was separately digest-checked above; a genuine
 // local Human tail can add dependencies to current full-Plan Source groups.
 const prefixGroups=Object.freeze(prefix.groups.map(group=>{const original=plan.groups.find(row=>row.id===group.id);if(!original||original.type!==group.type||!equal(original.operations,group.operations)||!equal(original.prepared,group.prepared))refuse();return original;}));
 const cap=Object.freeze({});proofs.set(cap,{core,plan,active:Object.freeze(clone(active)),completed:clone(completed[0]),prefixGroups,tail:Object.freeze(tail),inputs,history,delta,revision,human:prepareMixedHumanPhysicalExpectation([...prefixGroups,...tail],core.deviceId)});return cap;
}

export function assertMixedRestoredPhysicalAllocations(core,scope,plan,rows,meta,cap,humanRows){
 if(arguments.length!==7)refuse();requireOriginalCurrentMixedGroupScope(core,scope,plan);const p=proofs.get(cap);if(!p||p.core!==core||p.plan!==plan)refuse();
 const byId=new Map(meta.map(row=>[row.id,row]));if(byId.size!==meta.length||!equal(byId.get(p.active.id),p.active)||!equal(byId.get(p.completed.id),p.completed)||meta.filter(row=>row.id.startsWith(core.prefix+'generation:')&&row.id.endsWith(':restore:')).length!==1||byId.has('recovery-restore-epoch'))refuse();
 if(rows.inputStates.length!==p.inputs.size||rows.revisions.length!==p.history.size||!equal(byId.get('input-delta-sequence'),{id:'input-delta-sequence',value:p.delta})||!equal(byId.get('revision-sequence'),{id:'revision-sequence',value:p.revision}))refuse();
 for(const state of rows.inputStates)if(state.deltaSequence!==p.inputs.get(state.id))refuse();
 const seen=new Set();for(const row of rows.revisions){if(!count(row.sequence)||row.sequence<1||row.sequence!==p.history.get(row.id)||seen.has(row.sequence)||!equal(row.listKey,[row.entityKey,row.sequence])||!equal(row.documentList,[row.documentId,row.sequence]))refuse();seen.add(row.sequence);}
 const key=(kind,...parts)=>protocolPhysicalId(core.prefix,p.active.namespace,kind,parts);
 for(const head of plan.heads)if(head.type==='inputWorkingMember'&&head.entityId.startsWith('input:')){
  const id=head.entityId.slice(6);if(head.revisions.length!==1||!equal(byId.get(key('workingOwner',id)),{id:key('workingOwner',id),revisionId:head.revisions[0],deltaSequence:p.inputs.get(id)}))refuse();
 }else if(head.type==='inputWorkingMember'&&head.entityId.startsWith('revision:')){
  const id=head.entityId.slice(9);if(head.revisions.length!==1||!equal(byId.get(key('workingHistory',id)),{id:key('workingHistory',id),revisionId:head.revisions[0],sequence:p.history.get(id)}))refuse();
 }
 assertMixedHumanPhysicalExpectation(core,scope,plan,humanRows,meta,p.human,p.history,p.active.namespace);return true;
}

// Borrow immutable authenticated replay order only. No native cut, mutable
// allocator map, metadata exemption or provider/write capability is returned.
export function originalMixedRestoredReplay(core,scope,plan,cap){
 requireOriginalCurrentMixedGroupScope(core,scope,plan);const p=proofs.get(cap);if(!p||p.core!==core||p.plan!==plan)refuse();
 return Object.freeze({active:p.active,completedId:p.completed.id,transactions:Object.freeze([p.prefixGroups,...p.tail.map(group=>Object.freeze([group]))]),historySequence:id=>p.history.get(id)});
}
export function measureMixedRestoredExpectation(core,scope,plan,cap){
 requireOriginalCurrentMixedGroupPlan(core,plan);const p=proofs.get(cap);if(!p||p.core!==core||p.plan!==plan)refuse();
 const total={B:0,T:0,V:0,E:0},add=value=>{const m=measureSourceWorkingPhysicalTree(value);for(const key of ['B','T','V','E'])total[key]+=m[key];};
 add(p.active);add(p.completed);
 for(const map of [p.inputs,p.history,p.human.entries,p.human.topics,p.human.receipts])for(const [key,value]of map)add([key,value]);
 // Stored Map/array/control wrappers have their own finite cells, independent
 // of borrowed complete Plan/member rows and already owned public Scope.
 total.E+=p.inputs.size+p.history.size+p.human.entries.size+p.human.topics.size+p.human.receipts.size+p.prefixGroups.length+p.tail.length+64;return Object.freeze(total);
}
