import {hashText} from '../dedupe.js';
import {emptyContextCards} from '../context-cards.js';
import {verifyContextMutationDescription} from './context-mutation-codec.js';
import {digest,equal,fail} from './value.js';
const oldTypes=new Set(['contextItem','contextRulesItem','contextNowItem']);
// A pure exact causal reconstruction. This grants no native read/write access;
// the fixed compiler supplies already sealed operations and owns every digest.
export async function contextMutationDependencies(group,byRevision){
 const descriptor=group.prepared.descriptor.value,before=emptyContextCards(),dependencies=new Set();before.sequence=descriptor.before.sequence;
 for(const point of descriptor.before.items){
  const matches=[];
  for(const operation of byRevision.values()){
   if(operation.entityId!==point.id)continue;
   const item=operation.type==='contextMutationMember'?operation.value.item:oldTypes.has(operation.type)?operation.value:null;
   if(item&&await digest(item)===point.digest)matches.push({operation,item});
  }
  if(matches.length!==1)fail('BNS_CONTEXT_ANCESTRY_REQUIRED');
  const {operation,item}=matches[0];before.items.push(item);dependencies.add(operation.revisionId);
 }
 if(descriptor.command.kind==='move')for(const [key,value]of Object.entries(descriptor.command.expectedAccess))before.access[key]=value;
 for(const operation of group.prepared.members){const p=operation.value.previous;if(p){const prior=byRevision.get(p.revisionId),item=prior?.type==='contextMutationMember'?prior.value.item:oldTypes.has(prior?.type)?prior.value:null;if(!prior||prior.type!==p.type||prior.entityId!==p.entityId||!item||await digest(item)!==p.digest||!equal(item,before.items.find(x=>x.id===p.entityId)))fail('BNS_CONTEXT_ANCESTRY_REQUIRED');dependencies.add(prior.revisionId);}}
 await verifyContextMutationDescription(descriptor,group.prepared.members.map(op=>op.value),before);
 if(descriptor.command.undoOf){const previous=[...byRevision.values()].filter(op=>op.type==='contextMutationCommit'&&op.value.domainOperationId===descriptor.command.undoOf);if(previous.length!==1||previous[0].value.command.kind!=='move'||previous[0].value.command.undoOf)fail('BNS_CONTEXT_UNDO_ANCESTRY_REQUIRED');const prior=previous[0].value,command=Object.fromEntries(prior.commandKeys.map(key=>[key,key==='epoch'?descriptor.command.epoch:prior.command[key]])),{createdAt,...claimed}=descriptor.priorMove,expected={id:'context:'+prior.domainOperationId,namespace:'context-cards',schemaVersion:1,ownerId:prior.command.itemId,digest:await hashText(JSON.stringify(command)),epoch:descriptor.command.epoch,result:prior.result};if(!equal(expected,claimed))fail('BNS_CONTEXT_UNDO_ANCESTRY_REQUIRED');dependencies.add(previous[0].revisionId);}
 return dependencies;
}

export async function validateContextMutationPlanOrder(groups){
 let row=emptyContextCards();
 for(const group of groups){
  if(oldTypes.has(group.type)){
   const operation=group.operations[0],index=row.items.findIndex(item=>item.id===operation.entityId);if(index<0)row.items.push(operation.value);else row.items[index]=operation.value;row.sequence=Math.max(row.sequence,operation.value.order+1);
  }else if(group.type==='contextMutationCommit'){
   const d=group.prepared.descriptor.value;
   if(d.command.kind==='move')for(const [key,value]of Object.entries(d.command.expectedAccess))row.access[key]=value;
   row=(await verifyContextMutationDescription(d,group.prepared.members.map(op=>op.value),row)).row;
  }
 }
 return true;
}
