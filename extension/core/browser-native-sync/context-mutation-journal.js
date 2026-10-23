import {requireOriginalContextMutationCore} from './core.js';
import {ContextDesiredSyncJournal} from './context-desired-journal.js';
import {readContextCards,requireOriginalContextCardsService,CONTEXT_CARDS_ROW,emptyContextCards} from '../context-cards.js';
import {requireOriginalLibraryDocumentsGenerationMethods} from '../library-documents-owner.js';
import {readableContextItems,fenceContextLineage,releaseContextLineage} from '../context-item-lineage.js';
import {prepareContextMutationDescription,verifyContextMutationDescription,prepareContextBootstrapDescription,contextMutationItemAtEpoch as localContextItem} from './context-mutation-codec.js';
import {clone,digest,equal,fail} from './value.js';
import {hashText} from '../dedupe.js';
import {registerRepositoryWorkLimit,registerRepositoryFinalReadFence} from '../idb-repository.js';
import {readRestoreEpoch} from './prompt-journal.js';
const originalJournals=new WeakMap(),localPreparations=new WeakMap(),localTransactions=new WeakMap(),applications=new WeakMap();
const legacy={info:'contextItem',rules:'contextRulesItem',now:'contextNowItem'};
function binding(journal,service){
 const bound=originalJournals.get(journal);requireOriginalContextCardsService(service);
 if(Object.getPrototypeOf(journal)!==originalJournalPrototype)fail('BNS_CONTEXT_OWNER_REQUIRED');
 for(const [name,expected]of originalJournalMethods){const actual=Object.getOwnPropertyDescriptor(originalJournalPrototype,name);if(Object.getOwnPropertyDescriptor(journal,name)||!actual||['value','get','set','writable','enumerable','configurable'].some(key=>actual[key]!==expected[key]))fail('BNS_CONTEXT_OWNER_REQUIRED');}
 if(!bound||journal.core!==bound.core||service.syncJournal!==journal||service.s!==bound.store||bound.store.repository!==bound.core.repository)fail('BNS_CONTEXT_OWNER_REQUIRED');
 requireOriginalLibraryDocumentsGenerationMethods(bound.store);requireOriginalContextMutationCore(bound.core);return bound;
}
export function isOriginalContextMutationJournal(journal,service){try{binding(journal,service);return true;}catch{return false;}}
async function snapshot(t,service){
 const epoch=await service.admitted(t),row=await readContextCards(t),generation=await t.get('meta','backup-data-generation'),gate=await t.get('meta','gate'),restoreEpoch=await t.get('meta','recovery-restore-epoch');
 return {epoch,row,generation: generation??null,gate:gate??null,restoreEpoch:restoreEpoch??null};
}
// This capability is minted by the fixed journal only after the real Context
// owner has replayed its command and its current physical/protocol predecessors
// have matched. Core must consume the same private identity, never a cloned DTO.
export function originalContextMutationPreparation(core,capability){
 const p=localPreparations.get(capability);if(!p||p.core!==core)fail('BNS_CONTEXT_OWNER_REQUIRED');binding(p.journal,p.service);
 return {changes:clone(p.changes),description:clone(p.description)};
}
export class ContextMutationSyncJournal extends ContextDesiredSyncJournal{
 #prepared=new WeakMap();
 constructor(core,{store}){super(core);if(store?.repository!==core?.repository)fail('BNS_CONTEXT_OWNER_REQUIRED');requireOriginalLibraryDocumentsGenerationMethods(store);originalJournals.set(this,{core,store});}
 async prepare(before,after,command,owner){
  if(command.kind==='access')return super.prepare(before,after,command);
  const service=owner?.service,{core,store}=binding(this,service);
  if(typeof owner.at!=='string')fail('BNS_CONTEXT_OWNER_REQUIRED');
  const initial=await store.run(()=>store.repository.transaction(false,t=>snapshot(t,service),['meta']));
  if(!equal(initial.row,before)||initial.epoch!==command.epoch)fail('BNS_CONTEXT_OWNER_CHANGED');
  const portableBefore={...clone(before),items:before.items.map(item=>localContextItem(item,'initial'))},portableAfter={...clone(after),items:after.items.map(item=>localContextItem(item,'initial'))};
  const {description,items}=await prepareContextMutationDescription(portableBefore,portableAfter,command,owner.at,owner.priorMove??null),changes=[];
  await qualifiedPortableRow(core,before,initial.epoch);
  let lineage=null;
  try{
   // Deletion/restore retains its original lineage rather than turning an
   // adopted automatic Item into source-free manual content. An invalidated or
   // no-longer-readable source cannot be exported by taking over its body.
   const automatic=after.items.filter(item=>item.origin==='automatic'&&items.some(changed=>changed.id===item.id));
   if(automatic.some(item=>item.lifecycle==='invalidated'))fail('BNS_CONTEXT_LINEAGE_UNAVAILABLE');
   if(automatic.length){
    const result=await readableContextItems(store,automatic.map(item=>({...clone(item),lifecycle:'active',deletedBy:null})),{epoch:command.epoch,rowSerialized:JSON.stringify(await store.repository.transaction(false,t=>t.get('meta','context-cards:v1'),['meta'])),retainAuthoredCapture:true});
    lineage=result.captured;if(result.automaticEvaluation||result.items.length!==automatic.length)fail('BNS_CONTEXT_LINEAGE_UNAVAILABLE');
   }
   for(const item of items){
    const old=portableBefore.items.find(value=>value.id===item.id),head=await core.read('head','contextMutationMember',item.id);let previous=null,parents=[];
    if(head){
     if(head.purged||head.revisions.length!==1)fail('BNS_CONTEXT_CONFLICT_UNSUPPORTED');
     const operation=(await core.read('revision',head.revisions[0]))?.operation;
     if(!old||!equal(operation?.value.item,old))fail('BNS_CONTEXT_OWNER_CHANGED');
     previous={type:'contextMutationMember',entityId:item.id,revisionId:operation.revisionId,digest:await digest(old)};parents=head.revisions;
    }else if(old){
     const type=legacy[old.card],oldHead=await core.read('head',type,item.id);
     if(old.origin!=='manual'||!oldHead||oldHead.purged||oldHead.revisions.length!==1)fail('BNS_CONTEXT_BOOTSTRAP_REQUIRED');
     const operation=(await core.read('revision',oldHead.revisions[0]))?.operation;
     if(!equal(operation?.value,old))fail('BNS_CONTEXT_OWNER_CHANGED');
     previous={type,entityId:item.id,revisionId:operation.revisionId,digest:await digest(old)};
    }
    changes.push({type:'contextMutationMember',value:{id:item.id,logicalCommitId:description.id,previous,item},expectedParents:parents});
   }
   const capability=Object.freeze({});localPreparations.set(capability,{core,journal:this,service,description,changes});
   const prepared=await this.restoreFence.prepare(()=>core.prepareContextMutation(capability));
   if(!equal(await store.run(()=>store.repository.transaction(false,t=>snapshot(t,service),['meta'])),initial))fail('BNS_CONTEXT_OWNER_CHANGED');
   this.#prepared.set(prepared,{service,initial,after:clone(after),lineage});lineage=null;return prepared;
  }finally{releaseContextLineage(lineage);}
 }
 async commit(t,prepared){
  const held=this.#prepared.get(prepared);if(!held)return super.commit(t,prepared);
  const {core}=binding(this,held.service),now=await snapshot(t,held.service);
  try{
   if(now.epoch!==held.initial.epoch||!equal(now.row,held.after)||!equal(now.generation,held.initial.generation)||!equal(now.gate,held.initial.gate))fail('BNS_CONTEXT_OWNER_CHANGED');
   if(held.lineage)await fenceContextLineage(held.service.s,held.lineage,{transaction:t});
   await this.restoreFence.commit(t,prepared);
   localTransactions.set(t,{core,prepared});
   const result=await core.commitPrepared(t,prepared,{materialize:false});
   for(const operation of prepared.operations)if(operation.type==='contextMutationMember'){await core.recordMaterializedOwner(t,operation,operation.value.item.revision);await core.put(t,'contextMutationEpoch',[operation.entityId],{version:1,epoch:held.initial.epoch,revisionId:operation.revisionId});}else if(operation.type==='contextMutationCommit')await recordContextMutationCommand(t,core,operation);
   await contextFinalFence(t,core,{journal:this,service:held.service,initial:held.initial,after:held.after,advancesBackup:held.advancesBackup!==false},prepared.operations);
   return result;
  }finally{localTransactions.delete(t);releaseContextLineage(held.lineage);this.#prepared.delete(prepared);}
 }
 async bootstrapItem(service,itemId){
  const {core,store}=binding(this,service),initial=await store.run(()=>store.repository.transaction(false,t=>snapshot(t,service),['meta'])),item=initial.row.items.find(item=>item.id===itemId);
  if(!item||await core.read('head','contextMutationMember',itemId)||await core.read('head',legacy[item.card],itemId))fail('BNS_CONTEXT_BOOTSTRAP_REQUIRED');
  const before=emptyContextCards(),state=await core.read('contextMutationState');before.sequence=state?.sequence??0;
  for(const local of initial.row.items){const h=await core.read('head','contextMutationMember',local.id),old=await core.read('head',legacy[local.card],local.id),head=h??old;if(!head)continue;if(head.purged||head.revisions.length!==1)fail('BNS_CONTEXT_CONFLICT_UNSUPPORTED');const operation=(await core.read('revision',head.revisions[0]))?.operation,wire=h?operation?.value.item:operation?.value;if(!equal(localContextItem(wire,initial.epoch),local))fail('BNS_CONTEXT_OWNER_CHANGED');before.items.push(clone(wire));before.sequence=Math.max(before.sequence,local.order+1);}
  const {description}=await prepareContextBootstrapDescription(before,localContextItem(item,'initial'),initial.epoch,initial.row.sequence),changes=[{type:'contextMutationMember',value:{id:item.id,logicalCommitId:description.id,previous:null,item:localContextItem(item,'initial')},expectedParents:[]}];
  let lineage=null;
  try{
   if(item.origin==='automatic'){if(item.lifecycle==='invalidated')fail('BNS_CONTEXT_LINEAGE_UNAVAILABLE');const result=await readableContextItems(store,[{...clone(item),lifecycle:'active',deletedBy:null}],{epoch:initial.epoch,rowSerialized:JSON.stringify(await store.repository.transaction(false,t=>t.get('meta',CONTEXT_CARDS_ROW),['meta'])),retainAuthoredCapture:true});lineage=result.captured;if(result.automaticEvaluation||result.items.length!==1)fail('BNS_CONTEXT_LINEAGE_UNAVAILABLE');}
   const capability=Object.freeze({});localPreparations.set(capability,{core,journal:this,service,description,changes});const prepared=await this.restoreFence.prepare(()=>core.prepareContextMutation(capability));this.#prepared.set(prepared,{service,initial,after:clone(initial.row),lineage,advancesBackup:false});lineage=null;
   await store.write(t=>this.commit(t,prepared));return {operationId:description.domainOperationId};
  }finally{releaseContextLineage(lineage);}
 }
 async prepareReceive(service,input){
  const {core,store}=binding(this,service),protocol=await core.prepareContextMutationReceive(input);if(protocol.duplicate)return {protocol,ownerPlan:null};
  const initial=await store.run(()=>store.repository.transaction(false,t=>snapshot(t,service),['meta']));
  const before=await qualifiedPortableRow(core,initial.row,initial.epoch);
  const descriptor=protocol.descriptor.value;
  // The source's prior UI choice is input to its old command, never an access
  // grant on this installation. The materialized row retains all local access.
  if(descriptor.command.kind==='move')for(const [key,value]of Object.entries(descriptor.command.expectedAccess))before.access[key]=clone(value);
  const verified=await verifyContextMutationDescription(descriptor,protocol.members.map(op=>op.value),before);
  if(descriptor.priorMove){
   const proof=await core.read('contextMutationCommand',descriptor.command.undoOf);
   const {createdAt,...claimed}=descriptor.priorMove,prior=proof&&(await core.read('revision',proof.revisionId))?.operation;
   if(!prior||prior.type!=='contextMutationCommit'||prior.value.command.kind!=='move'||prior.value.command.undoOf)fail('BNS_CONTEXT_UNDO_ANCESTRY_REQUIRED');
   const priorCommand=Object.fromEntries(prior.value.commandKeys.map(key=>[key,key==='epoch'?descriptor.command.epoch:prior.value.command[key]])),expected={...proof.receipt,epoch:descriptor.command.epoch,digest:await hashText(JSON.stringify(priorCommand))};
   if(!equal(expected,claimed))fail('BNS_CONTEXT_UNDO_ANCESTRY_REQUIRED');
  }
  const after=clone(verified.row);after.access=clone(initial.row.access);after.items=after.items.map(item=>localContextItem(item,initial.epoch));
  let lineage=null;
  try{
   const automatic=after.items.filter(item=>item.origin==='automatic');
   if(automatic.some(item=>item.lifecycle==='invalidated'))fail('BNS_CONTEXT_LINEAGE_UNAVAILABLE');
   if(automatic.length){const readable=await readableContextItems(store,automatic.map(item=>({...clone(item),lifecycle:'active',deletedBy:null})),{epoch:initial.epoch,rowSerialized:JSON.stringify(await store.repository.transaction(false,t=>t.get('meta',CONTEXT_CARDS_ROW),['meta'])),retainAuthoredCapture:true});lineage=readable.captured;if(readable.automaticEvaluation||readable.items.length!==automatic.length)fail('BNS_CONTEXT_LINEAGE_UNAVAILABLE');}
   const command={...verified.command,epoch:initial.epoch},receipt=descriptor.command.kind==='bootstrap'?null:{id:'context:'+descriptor.domainOperationId,namespace:'context-cards',schemaVersion:1,ownerId:descriptor.command.itemId,createdAt:descriptor.at,digest:await hashText(JSON.stringify(command)),epoch:initial.epoch,result:clone(descriptor.result)};
   const ownerPlan=Object.freeze({});applications.set(ownerPlan,{journal:this,service,core,protocol,initial,after,receipt,lineage,advancesBackup:receipt!==null});lineage=null;return {protocol,ownerPlan};
  }finally{releaseContextLineage(lineage);}
 }
 async receive(service,input){const {protocol,ownerPlan}=await this.prepareReceive(service,input);try{return await service.s.write(t=>this.core.commitContextMutationReceive(t,protocol,ownerPlan));}finally{releaseOriginalContextMutationApplication(ownerPlan);}}

}

export function requireContextMutationProtocolOwner(t,core,operation){const p=localTransactions.get(t);if(!p||p.core!==core||!p.prepared.operations.includes(operation))fail('BNS_CONTEXT_OWNER_REQUIRED');}
export async function executeOriginalContextMutationApplication(t,core,protocol,ownerPlan){
 const p=applications.get(ownerPlan);if(!p||p.core!==core||p.protocol!==protocol)fail('BNS_CONTEXT_OWNER_REQUIRED');binding(p.journal,p.service);
 try{
  registerRepositoryWorkLimit(core.repository,t);
  if(!equal(await snapshot(t,p.service),p.initial))fail('BNS_CONTEXT_OWNER_CHANGED');
  if(p.lineage)await fenceContextLineage(p.service.s,p.lineage,{transaction:t});
  if(p.receipt&&await t.get('operationReceipts',p.receipt.id))fail('BNS_CONTEXT_RECEIPT_COLLISION');
  await t.put('meta',p.after);if(p.receipt)await t.put('operationReceipts',p.receipt);
  const epoch=await readRestoreEpoch(t),marker=await core.get(t,'ownerRecoveryEpoch');if(marker&&marker.epoch!==epoch)fail('BNS_RESTORE_EPOCH_CHANGED');
  if(!marker)await core.put(t,'ownerRecoveryEpoch',[],{version:1,epoch});
  for(const op of protocol.members)await core.put(t,'contextMutationEpoch',[op.entityId],{version:1,epoch:p.initial.epoch,revisionId:op.revisionId});
  await recordContextMutationCommand(t,core,protocol.descriptor);

 }catch(error){releaseOriginalContextMutationApplication(ownerPlan);throw error;}
}
async function recordContextMutationCommand(t,core,operation){const d=operation.value;await core.put(t,'contextMutationState',[],{version:1,sequence:d.after.sequence});if(d.command.kind==='bootstrap')return;await core.put(t,'contextMutationCommand',[d.domainOperationId],{version:1,revisionId:operation.revisionId,receipt:{id:'context:'+d.domainOperationId,namespace:'context-cards',schemaVersion:1,ownerId:d.command.itemId,digest:d.requestDigest,epoch:d.command.epoch,result:d.result}});}

async function qualifiedPortableRow(core,row,epoch){
 const before=clone(row);
 for(let index=0;index<before.items.length;index++){
  const local=before.items[index],head=await core.read('head','contextMutationMember',local.id);
  if(head){
   if(head.purged||head.revisions.length!==1)fail('BNS_CONTEXT_CONFLICT_UNSUPPORTED');
   const op=(await core.read('revision',head.revisions[0]))?.operation,mapping=await core.read('contextMutationEpoch',local.id);
   if(!op||mapping?.revisionId!==op.revisionId||mapping.epoch!==epoch||!equal(local,localContextItem(op.value.item,epoch)))fail('BNS_CONTEXT_OWNER_CHANGED');
   before.items[index]=clone(op.value.item);
  }else{
   if(local.origin!=='manual')fail('BNS_CONTEXT_BOOTSTRAP_REQUIRED');
   const type=legacy[local.card],old=await core.read('head',type,local.id),op=old?.revisions.length===1?(await core.read('revision',old.revisions[0]))?.operation:null;
   if(old?.purged||!op||!equal(op.value,local))fail('BNS_CONTEXT_BOOTSTRAP_REQUIRED');
  }
 }
 return before;
}
export async function finalizeOriginalContextMutationApplication(t,core,protocol,ownerPlan){
 const p=applications.get(ownerPlan);if(!p||p.core!==core||p.protocol!==protocol)fail('BNS_CONTEXT_OWNER_REQUIRED');
 await contextFinalFence(t,core,p,protocol.operations);
}
export function releaseOriginalContextMutationApplication(ownerPlan){const p=applications.get(ownerPlan);if(p){releaseContextLineage(p.lineage);applications.delete(ownerPlan);}}
async function contextFinalFence(t,core,p,operations){
 const rows=[];
 for(const op of operations)for(const [kind,ids]of [['head',[op.type,op.entityId]],['revision',[op.revisionId]],['receipt',[op.operationId]],...(op.type==='contextMutationMember'?[['materializedOwner',[op.type,op.entityId]],['contextMutationEpoch',[op.entityId]]]:[])]){
  const key=await core.idIn(t,kind,...ids),value=await t.get('meta',key);if(!value)fail('BNS_CONTEXT_OWNER_CHANGED');rows.push({key,value});
 }
 const marker=await core.get(t,'ownerRecoveryEpoch'),markerKey=await core.idIn(t,'ownerRecoveryEpoch');
 registerRepositoryFinalReadFence(core.repository,t,{isCurrent:()=>{binding(p.journal,p.service);return true;},plan:function*(){
  if(!equal((yield {method:'get',table:'meta',key:CONTEXT_CARDS_ROW}),p.after)||p.receipt&&!equal((yield {method:'get',table:'operationReceipts',key:p.receipt.id}),p.receipt)||!equal((yield {method:'get',table:'meta',key:'gate'})??null,p.initial.gate)||!equal((yield {method:'get',table:'meta',key:'backup-data-generation'}),(p.advancesBackup===false?p.initial.generation:{id:'backup-data-generation',value:(p.initial.generation?.value??0)+1}))||!equal((yield {method:'get',table:'meta',key:markerKey}),marker)||!equal((yield {method:'get',table:'meta',key:'recovery-restore-epoch'})??null,p.initial.restoreEpoch))fail('BNS_CONTEXT_OWNER_CHANGED');
  for(const row of rows)if(!equal((yield {method:'get',table:'meta',key:row.key}),row.value))fail('BNS_CONTEXT_OWNER_CHANGED');return true;
 }});
}

const originalJournalPrototype=ContextMutationSyncJournal.prototype,originalJournalMethods=Object.getOwnPropertyNames(originalJournalPrototype).filter(name=>name!=='constructor').map(name=>[name,Object.getOwnPropertyDescriptor(originalJournalPrototype,name)]);
