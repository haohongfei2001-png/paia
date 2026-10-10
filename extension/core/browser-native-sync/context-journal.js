import {CONTEXT_CARDS_ROW,readContextCards,validContextCards} from '../context-cards.js';
import {validateEntity} from './codecs.js';
import {clone,equal,fail,exact,opaque} from './value.js';
import {JournalRestoreFence,readRestoreEpoch} from './prompt-journal.js';
const infoTypes=Object.freeze({info:'contextItem'});
const manualTypes=Object.freeze({...infoTypes,rules:'contextRulesItem',now:'contextNowItem'});
const itemType=(types,item)=>{const type=types[item?.card];if(!type)fail('BNS_CONTEXT_SCOPE_UNAVAILABLE');return type;};
function step(operation,parent=null){
 const type=operation.type;
 if(!Object.values(manualTypes).includes(type)||operation.kind!=='put'||parent&&parent.type!==type)fail('BNS_CONTEXT_SCOPE_UNAVAILABLE');
 const next=validateEntity(type,operation.value);
 if(!parent){if(operation.actor!=='bootstrap'&&(next.revision!==1||next.lifecycle!=='active'||next.deletedBy!==null))fail('BNS_CONTEXT_TRANSITION_INVALID');return;}
 const before=validateEntity(type,parent.value);
 if(next.revision!==before.revision+1||['id','card','order','origin','protected','userEdited','createdAt'].some(k=>!equal(next[k],before[k])))fail('BNS_CONTEXT_TRANSITION_INVALID');
 if(before.lifecycle==='removed'){
  if(next.lifecycle!=='active'||next.deletedBy!==null||!equal(next.body,before.body)||!equal(next.section,before.section))fail('BNS_CONTEXT_TRANSITION_INVALID');
 }else if(next.lifecycle==='removed'){
  if(next.deletedBy!==operation.operationId||!equal(next.body,before.body)||!equal(next.section,before.section))fail('BNS_CONTEXT_TRANSITION_INVALID');
 }else if(next.deletedBy!==null)fail('BNS_CONTEXT_TRANSITION_INVALID');
}
// Assert the original single transition only. This does not validate a Core
// binding, authorize a Scope or replace the complete bounded causal chain.
export {step as assertContextManualOperationTransition};
async function chain(t,core,operation,verified=null){
 for(let n=0;n<128;n++){
  if(verified&&operation.revisionId===verified.revisionId)return;
  if(operation.parents.length>1)fail('BNS_CONTEXT_CONFLICT_UNSUPPORTED');
  const parentId=operation.parents[0],parent=parentId?(await core.get(t,'revision',parentId))?.operation:null;
  if(parentId&&!parent)fail('BNS_REVISION_MISSING');
  step(operation,parent);
  if(!parent)return;
  operation=parent;
 }
 fail('BNS_CONTEXT_ANCESTRY_LIMIT');
}
// Explicit dependency injection only; ordinary Context writes use no journal.
class ContextSyncJournal{
 constructor(core,types){this.core=core;this.types=types;this.restoreFence=new JournalRestoreFence(core);}
 async prepare(beforeRow,afterRow,command){return this.restoreFence.prepare(()=>this.prepareCurrent(beforeRow,afterRow,command));}
 async prepareCurrent(beforeRow,afterRow,command){
  if(command.kind==='access')fail('BNS_CONTEXT_SCOPE_UNAVAILABLE');
  const before=beforeRow.items.find(x=>x.id===command.itemId),after=afterRow.items.find(x=>x.id===command.itemId);
  const type=itemType(this.types,after);
  validateEntity(type,after);if(before)validateEntity(type,before);
  const head=await this.core.read('head',type,command.itemId);
  if(head?.purged)fail('BNS_ENTITY_PURGED');
  if(head?.revisions.length>1)fail('BNS_CONFLICT_REQUIRES_RESOLUTION');
  if(head){const prior=await this.core.read('revision',head.revisions[0]);if(!before||!equal(prior?.operation.value,before))fail('BNS_OWNER_CHANGED');}
  else if(before)fail('BNS_BOOTSTRAP_REQUIRED');
  return this.core.prepare([{type,value:after,expectedParents:head?.revisions||[]}],{operationIds:[command.operationId]});
 }
 async commit(t,prepared){await this.restoreFence.commit(t,prepared);return this.core.commitPrepared(t,prepared,{materialize:false});}
 async bootstrap(itemId){
  const item=await this.core.repository.transaction(false,async t=>(await readContextCards(t)).items.find(x=>x.id===itemId),['meta']);
  const type=itemType(this.types,item);
  validateEntity(type,item);
  if(await this.core.read('head',type,itemId))fail('BNS_BOOTSTRAP_EXISTS');
  const prepared=await this.restoreFence.prepare(()=>this.core.prepare([{type,value:item,expectedParents:[]}],{actor:'bootstrap'}));
  return this.core.transaction(true,async t=>{await this.restoreFence.commit(t,prepared);if(!equal((await readContextCards(t)).items.find(x=>x.id===itemId),item))fail('BNS_OWNER_CHANGED');return this.core.commitPrepared(t,prepared,{materialize:false});});
 }
}
// Bind to live Core for receive; bind to restore.stage for staged activation.
// This proves the actual causal soft-delete/restore chain, not just equal text.
function materializer(core,types){
 return async(t,{operation,head,previousHead,previousVersions=[]})=>{
  if(!Object.values(types).includes(operation.type))fail('BNS_CONTEXT_SCOPE_UNAVAILABLE');
  const type=operation.type;
  if(head.purged)fail('BNS_CONTEXT_PURGE_SCOPE_UNAVAILABLE');
  const value=validateEntity(type,operation.value),row=await readContextCards(t),index=row.items.findIndex(x=>x.id===value.id),local=row.items[index];
  const epoch=await readRestoreEpoch(t),proof=await core.materializedOwner(t,type,value.id),binding=await core.get(t,'contextValidation',type,value.id);let verified=null;
  if(binding&&!proof)fail('BNS_OWNER_PROOF_INVALID');
  if(proof){
   if(!binding||!exact(binding,['id','version','epoch','revisionId'])||binding.version!==1||binding.revisionId!==proof.revisionId||binding.epoch!==null&&!opaque(binding.epoch))fail('BNS_OWNER_PROOF_INVALID');
   if(binding.epoch!==epoch)fail('BNS_RESTORE_EPOCH_CHANGED');
   if(previousHead&&!previousHead.purged&&previousHead.revisions.length===1&&previousHead.revisions[0]===proof.revisionId&&local&&local.revision===proof.ownerRevision&&equal(local,proof.operation.value))verified=proof.operation;
   // A lawful journaled local change can advance past this older proof. It
   // must use the full bounded chain and normal local-owner checks below.
  }
  await chain(t,core,operation,verified);
  if(local){if(!previousHead)fail('BNS_RESTORE_UNMANAGED_OWNER');if(!previousVersions.some(p=>equal(p.value,local)))fail('BNS_OWNER_CHANGED');}
  else if(previousHead&&!previousHead.purged)fail('BNS_OWNER_CHANGED');
  if(index<0)row.items.push(clone(value));else row.items[index]=clone(value);
  row.sequence=Math.max(row.sequence,value.order+1);
  if(!validContextCards(row))fail('BNS_CONTEXT_OWNER_INVALID');
  await t.put('meta',row);
  // Only this successful canonical materialization establishes the next bounded
  // validation anchor. It cannot be borrowed across namespace/restore epochs.
  await core.recordMaterializedOwner(t,operation,value.revision);
  await core.put(t,'contextValidation',[type,value.id],{version:1,epoch,revisionId:operation.revisionId});
 };
}

// Separate exports retain the original Info-only admission contract.
export class ContextInfoSyncJournal extends ContextSyncJournal{constructor(core){super(core,infoTypes);}}
export class ContextManualSyncJournal extends ContextSyncJournal{
 constructor(core){super(core,manualTypes);}
 async prepare(beforeRow,afterRow,command){
  // Explicit local-only paths, not synchronized access or automatic lineage.
  // The Context owner still commits its canonical change and receipt atomically.
  if(command.kind==='access')return null;
  const before=beforeRow.items.find(item=>item.id===command.itemId),after=afterRow.items.find(item=>item.id===command.itemId);
  if(before?.origin==='automatic'&&after?.origin==='automatic')return null;
  return super.prepare(beforeRow,afterRow,command);
 }
}
export const contextInfoMaterializer=core=>materializer(core,infoTypes);
export const contextManualMaterializer=core=>materializer(core,manualTypes);
