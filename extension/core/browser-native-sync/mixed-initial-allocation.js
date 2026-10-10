import {prepareMixedHumanPhysicalExpectation,assertMixedHumanPhysicalExpectation} from './mixed-human-physical.js';
import {requireOriginalCurrentMixedGroupScope} from './group-checkpoint-scope.js';
import {count,equal,fail} from './value.js';

// Original mixed Scope's initial-local allocation check only. General restore
// uses its existing constructor; foreign/restored local allocation requires its
// own authenticated import-prefix and local-tail witness, never a whole-graph
// replay. This assertion creates no native capture or export capability.
export function assertMixedInitialPhysicalAllocations(core,scope,plan,rows,counters){
 if(arguments.length!==5)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');requireOriginalCurrentMixedGroupScope(core,scope,plan);
 const refuse=()=>fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
 if(core.fixedNamespace!==null||counters.active!==null||plan.groups.some(group=>group.operations.some(op=>op.deviceId!==core.deviceId)))refuse();
 const creations=plan.groups.filter(group=>group.type==='sourceBootstrapCommit'||group.type==='sourceAppendCommit'),operations=plan.groups.flatMap(group=>group.operations);
 const latest=(type,id)=>{const head=plan.heads.find(head=>head.type===type&&head.entityId===id);return head&&head.revisions.length===1?operations.find(op=>op.revisionId===head.revisions[0]):null;};
 const baseline=(type,id)=>creations.flatMap(group=>group.prepared.members).find(op=>op.value.entityType===type&&op.value.entity.id===id)?.value.entity;
 for(const row of rows.inputStates){
  const wire=latest('inputWorkingMember','inputState:'+row.id)?.value.entity??baseline('inputState',row.id);
  if(!wire||!count(wire.deltaSequence)||wire.deltaSequence<1||row.deltaSequence!==wire.deltaSequence)refuse();
 }
 const delta=Math.max(0,...rows.inputStates.map(row=>row.deltaSequence));
 if(!equal(counters.input,{id:'input-delta-sequence',value:delta}))refuse();
 const seen=new Set();
 for(const row of rows.revisions){
  if(!count(row.sequence)||row.sequence<1||seen.has(row.sequence)||!equal(row.listKey,[row.entityKey,row.sequence])||!equal(row.documentList,[row.documentId,row.sequence]))refuse();seen.add(row.sequence);
  const working=latest('inputWorkingMember','revision:'+row.id),human=latest('humanLibraryMember','history:'+row.id);
  const wire=working?.value.entity??human?.value.after??baseline('baselineRevision',row.id);
  if(!wire||wire.sequence!==row.sequence)refuse();
 }
 if(!equal(counters.history,{id:'revision-sequence',value:Math.max(0,...seen)}))refuse();
 return true;
}

export function assertMixedInitialHumanPhysicalAllocations(core,scope,plan,rows,meta){
 if(arguments.length!==5)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');requireOriginalCurrentMixedGroupScope(core,scope,plan);
 if(core.fixedNamespace!==null||meta.some(row=>row.id===core.prefix+'active')||plan.groups.some(group=>group.operations.some(op=>op.deviceId!==core.deviceId)))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
 const chronology=[...plan.groups].sort((a,b)=>Math.min(...a.operations.map(op=>op.sequence))-Math.min(...b.operations.map(op=>op.sequence)));
 const expected=prepareMixedHumanPhysicalExpectation(chronology,core.deviceId),history=new Map(rows.revisions.map(row=>[row.id,row.sequence]));
 return assertMixedHumanPhysicalExpectation(core,scope,plan,rows,meta,expected,history,'initial');
}
