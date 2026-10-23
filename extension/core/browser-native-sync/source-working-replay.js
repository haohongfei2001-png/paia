import {requireOriginalCurrentSourceWorkingGroupScope,prepareGroupScope} from './group-checkpoint-scope.js';
import {prepareOriginalCurrentSourceWorkingForeignPrefix} from './group-checkpoint-plan.js';
import {assertCompletedGroupedRestoreControl} from './completed-group-restore-control.js';
import {count,equal,fail} from './value.js';
const refuse=()=>fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
// Pure exact chronology from the original committed typed graph. No native
// read, projection capability, write permission or external rows are acquired.
export function initialSourceWorkingReplay(core,scope,plan){
 requireOriginalCurrentSourceWorkingGroupScope(core,scope,plan);if(core.fixedNamespace!==null||plan.groups.some(g=>g.operations.some(op=>op.deviceId!==core.deviceId)))refuse();
 const ordered=[...plan.groups].sort((a,b)=>Math.min(...a.operations.map(op=>op.sequence))-Math.min(...b.operations.map(op=>op.sequence)));requireLocalSequence(ordered);
 return replay(ordered.map(g=>[g]),false,core.deviceId);
}
export async function restoredSourceWorkingReplay(core,scope,plan,rows){
 requireOriginalCurrentSourceWorkingGroupScope(core,scope,plan);if(core.fixedNamespace!==null)refuse();
 const active=rows.meta.find(row=>row.id===core.prefix+'active'),completed=rows.meta.filter(row=>row.id.startsWith(core.prefix+'generation:')&&row.id.endsWith(':restore:'));
 if(!active||completed.length!==1||rows.meta.some(row=>row.id==='recovery-restore-epoch'))refuse();
 await assertCompletedGroupedRestoreControl(completed[0],{prefix:core.prefix,datasetId:core.datasetId,active,namespace:active.namespace,epoch:null});
 const prefix=await prepareOriginalCurrentSourceWorkingForeignPrefix(core,plan),scopePrefix=await prepareGroupScope(prefix);requireOriginalCurrentSourceWorkingGroupScope(core,scope,plan);
 const manifest=completed[0].manifest,coverage=new Map(),devices=new Set();for(const group of prefix.groups)for(const op of group.operations)devices.add(op.deviceId);
 for(const head of prefix.heads){const op=prefix.groups.flatMap(g=>g.operations).find(op=>op.revisionId===head.revisions[0]);if(!op)refuse();const row=coverage.get(head.type)??{type:head.type,version:op.codecVersion,count:0};if(row.version!==op.codecVersion)refuse();row.count++;coverage.set(head.type,row);}
 if(prefix.digest!==completed[0].graphDigest||!equal(scopePrefix.ownerScope,manifest.ownerScope)||!equal([...coverage.values()].sort((a,b)=>a.type.localeCompare(b.type)),manifest.coverage)||manifest.itemCount!==prefix.operationCount+prefix.heads.length+devices.size)refuse();
 const local=plan.groups.filter(g=>g.operations.every(op=>op.deviceId===core.deviceId)).sort((a,b)=>Math.min(...a.operations.map(op=>op.sequence))-Math.min(...b.operations.map(op=>op.sequence)));requireLocalSequence(local);
 // New captured Sources use their original append/bootstrap owners too. A
 // foreign/local mixed group is rejected by the original prefix compiler.
 const result=replay([prefix.groups,...local.map(g=>[g])],true,core.deviceId);return {...result,namespace:active.namespace,activeId:active.id,completedId:completed[0].id};
}
function requireLocalSequence(groups){const ops=groups.flatMap(g=>g.operations).sort((a,b)=>a.sequence-b.sequence);if(ops.some((op,i)=>op.sequence!==i+1))refuse();for(const g of groups){const seq=g.operations.map(op=>op.sequence).sort((a,b)=>a-b);if(seq.some((n,i)=>n!==seq[0]+i))refuse();}}
function replay(transactions,restored,deviceId){
 const inputs=new Map(),history=new Map(),records=new Map(),blocks=new Map(),documents=new Map(),working=[];let delta=0,revision=0;
 for(let tx=0;tx<transactions.length;tx++)for(const group of transactions[tx]){
  if(!['sourceBootstrapCommit','sourceAppendCommit','inputWorkingCommit'].includes(group.type))refuse();const members=group.prepared.members,local=!restored||tx>0;
  if(group.type!=='inputWorkingCommit'){
   const source=members.find(op=>op.value.entityType==='source')?.value.entity,input=members.find(op=>op.value.entityType==='input')?.value.entity,state=members.find(op=>op.value.entityType==='inputState')?.value.entity,baseline=members.find(op=>op.value.entityType==='baselineRevision')?.value.entity;
   if(!source||!input||!state||!baseline||records.has(source.id)||blocks.has(input.id)||history.has(baseline.id))refuse();records.set(source.id,records.size);blocks.set(input.id,blocks.size);if(!documents.has(input.documentId))documents.set(input.documentId,documents.size);inputs.set(input.id,++delta);history.set(baseline.id,++revision);if(local&&(state.deltaSequence!==delta||baseline.sequence!==revision))refuse();
  }else{
   const state=members.find(op=>op.value.entityType==='inputState')?.value.entity;if(!state||!inputs.has(state.id))refuse();inputs.set(state.id,++delta);working.push(group);if(local&&state.deltaSequence!==delta)refuse();
   for(const member of members)if(member.value.entityType==='revision'){const row=member.value.entity;if(!history.has(row.id))history.set(row.id,++revision);if(local&&row.sequence!==history.get(row.id))refuse();}
  }
 }
 if(!count(delta)||!count(revision))refuse();return {transactions,restored,records,blocks,documents,inputs,history,delta,revision,working,localWorking:working.filter(g=>!restored||g.prepared.descriptor.deviceId===deviceId),namespace:'initial'};
}
