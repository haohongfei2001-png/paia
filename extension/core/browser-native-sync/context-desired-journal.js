import {readContextCards,CONTEXT_CARDS_ROW,validContextCards} from '../context-cards.js';
import {ContextManualSyncJournal,contextManualMaterializer} from './context-journal.js';
import {readRestoreEpoch} from './prompt-journal.js';
import {validateEntity} from './codecs.js';
import {clone,equal,exact,hash,opaque,count,fail} from './value.js';
const TYPE='contextDesired',keys=['info','rules','now','inputs'];
const project=(row,id)=>({id,...row.access[id]});
const ids=head=>[...(head?.revisions||[])].sort();
async function proof(t,core,id){
 const p=await core.get(t,'contextDesiredOwner',id),epoch=await readRestoreEpoch(t);
 if(!p)return {epoch,record:null};
 if(!exact(p,['id','version','epoch','heads','value'])||p.version!==1||p.epoch!==null&&!opaque(p.epoch)||!Array.isArray(p.heads)||!p.heads.length||p.heads.length>128||p.heads.some(x=>!hash(x))||new Set(p.heads).size!==p.heads.length)fail('BNS_OWNER_PROOF_INVALID');
 validateEntity(TYPE,p.value);if(p.value.id!==id)fail('BNS_OWNER_PROOF_INVALID');
 const revisions=[];for(const ref of p.heads){const operation=(await core.get(t,'revision',ref))?.operation;if(!operation||operation.type!==TYPE||operation.entityId!==id||operation.kind!=='put')fail('BNS_OWNER_PROOF_INVALID');revisions.push(validateEntity(TYPE,operation.value));}
 if(p.heads.length===1?!equal(p.value,revisions[0]):p.value.enabled||p.value.revision!==Math.max(...revisions.map(v=>v.revision)))fail('BNS_OWNER_PROOF_INVALID');
 if(p.epoch!==epoch)fail('BNS_RESTORE_EPOCH_CHANGED');
 return {epoch,record:p};
}
async function record(t,core,value,heads,epoch){const marker=await core.get(t,'ownerRecoveryEpoch');if(marker&&(!exact(marker,['id','version','epoch'])||marker.version!==1||marker.epoch!==epoch))fail('BNS_RESTORE_EPOCH_CHANGED');await core.put(t,'ownerRecoveryEpoch',[],{version:1,epoch});await core.put(t,'contextDesiredOwner',[value.id],{version:1,epoch,heads:[...heads].sort(),value:clone(value)});}
async function validateChain(t,core,operations,anchors=[]){
 const seen=new Set(),queue=[...operations],stop=new Set(anchors);
 while(queue.length){const op=queue.pop();if(stop.has(op.revisionId)||seen.has(op.revisionId))continue;if(seen.size>=128)fail('BNS_CONTEXT_ANCESTRY_LIMIT');seen.add(op.revisionId);
  if(op.type!==TYPE||op.kind!=='put')fail('BNS_CONTEXT_SCOPE_UNAVAILABLE');const next=validateEntity(TYPE,op.value),parents=[];
  for(const id of op.parents){const p=(await core.get(t,'revision',id))?.operation;if(!p||p.type!==TYPE||p.entityId!==op.entityId||p.kind!=='put')fail('BNS_REVISION_MISSING');parents.push(p);}
  if(!parents.length){if(op.actor!=='bootstrap'&&next.revision!==1)fail('BNS_CONTEXT_TRANSITION_INVALID');}
  else {const revisions=parents.map(p=>validateEntity(TYPE,p.value).revision),max=Math.max(...revisions);if(op.actor!=='user'||(parents.length===1?next.revision!==max+1:next.revision<=max))fail('BNS_CONTEXT_TRANSITION_INVALID');}
  queue.push(...parents);
 }
}
async function qualify(t,core,state){
 if(state.core!==core)fail('BNS_NAMESPACE_INVALID');
 if(state.head.purged)fail('BNS_CONTEXT_PURGE_SCOPE_UNAVAILABLE');
 const id=state.operation.entityId;if(!keys.includes(id))fail('BNS_CONTEXT_SCOPE_UNAVAILABLE');
 const row=await readContextCards(t),local=project(row,id),{record:p,epoch}=await proof(t,state.previousCore||core,id);
 const marker=await (state.previousCore||core).get(t,'ownerRecoveryEpoch');if(marker&&(!exact(marker,['id','version','epoch'])||marker.version!==1||marker.epoch!==epoch))fail('BNS_RESTORE_EPOCH_CHANGED');
 if(!marker&&!p&&epoch!==null&&state.previousHead)fail('BNS_RESTORE_EPOCH_UNBOUND');
 if(p&&!state.previousHead)fail('BNS_OWNER_PROOF_INVALID');
 const proven=p&&equal(p.heads,ids(state.previousHead))&&equal(p.value,local);
 if(local.revision!==0||state.previousHead){
  if(!state.previousHead)fail('BNS_RESTORE_UNMANAGED_OWNER');
  if(!proven&&!state.previousVersions.some(op=>equal(op.value,local)))fail('BNS_OWNER_CHANGED');
 }
 const operations=[];for(const revision of state.head.revisions){const op=(await core.get(t,'revision',revision))?.operation;if(!op)fail('BNS_REVISION_MISSING');operations.push(op);}
 // A stage namespace cannot borrow a live proof as a validation shortcut.
 await validateChain(t,core,operations,proven&&(!state.previousCore||state.previousCore===core)?p.heads:[]);
 return {row,local,epoch,operations};
}
export class ContextDesiredSyncJournal extends ContextManualSyncJournal{
 async prepare(before,after,command){
  if(command.kind!=='access')return super.prepare(before,after,command);
  if(command.key==='global')return null;
  return this.restoreFence.prepare(async()=>{
   const old=validateEntity(TYPE,project(before,command.key)),value=validateEntity(TYPE,project(after,command.key)),head=await this.core.read('head',TYPE,command.key);
   if(head?.purged)fail('BNS_ENTITY_PURGED');if(head?.revisions.length>1)fail('BNS_CONFLICT_REQUIRES_RESOLUTION');
   if(head){const previous=(await this.core.read('revision',head.revisions[0]))?.operation;if(!equal(previous?.value,old))fail('BNS_OWNER_CHANGED');}
   else if(old.revision!==0)fail('BNS_RESTORE_UNMANAGED_OWNER');
   return this.core.prepare([{type:TYPE,value,expectedParents:ids(head)}],{operationIds:[command.operationId]});
  });
 }
 async bootstrapAccess(key){
  if(!keys.includes(key))fail('BNS_CONTEXT_SCOPE_UNAVAILABLE');
  const value=await this.core.transaction(false,async t=>project(await readContextCards(t),key),['meta']);
  if(await this.core.read('head',TYPE,key))fail('BNS_CONTEXT_ALREADY_BOUND');
  const prepared=await this.restoreFence.prepare(()=>this.core.prepare([{type:TYPE,value,expectedParents:[]}],{actor:'bootstrap'}));
  return this.core.transaction(true,async t=>{if(!equal(project(await readContextCards(t),key),value))fail('BNS_OWNER_CHANGED');return this.commit(t,prepared);});
 }
 async commit(t,prepared){
  const result=await super.commit(t,prepared);
  for(const operation of prepared.operations)if(operation.type===TYPE)await record(t,this.core,operation.value,[operation.revisionId],await readRestoreEpoch(t));
  return result;
 }
}
export const contextDesiredMaterializer=core=>async(t,state)=>{
 if(state.operation.type!==TYPE)return contextManualMaterializer(core)(t,state);
 const {row,local,epoch}=await qualify(t,core,state),value=validateEntity(TYPE,state.operation.value);
 if(value.enabled&&!local.enabled&&row.access.global.enabled)fail('BNS_CONTEXT_ACCESS_CONFIRMATION_REQUIRED');
 if(value.revision<=local.revision&&!equal(value,local))fail('BNS_CONTEXT_REVISION_REGRESSION');
 row.access[value.id]={enabled:value.enabled,revision:value.revision};if(!validContextCards(row))fail('BNS_CONTEXT_OWNER_INVALID');
 await t.put('meta',row);await record(t,core,value,state.head.revisions,epoch);
};
export const contextDesiredConflictOwner=core=>async(t,state)=>{
 if(state.operation.type!==TYPE||state.head.revisions.length<2)fail('BNS_CONTEXT_SCOPE_UNAVAILABLE');
 const {row,local,epoch,operations}=await qualify(t,core,state);
 // A conflict never selects a winning portable revision. Only a restrictive
 // local projection is written; all original heads remain for explicit resolution.
 // Do not consume a new portable revision for this derived restriction. The
 // namespace proof binds the entire head set; normal writes remain blocked by
 // the unresolved Core heads until an explicit resolution is committed.
 const revision=Math.max(local.revision,...operations.map(op=>op.value.revision));
 if(!count(revision))fail('BNS_CONTEXT_OWNER_INVALID');
 const value={id:local.id,enabled:false,revision};row.access[local.id]={enabled:false,revision};
 await t.put('meta',row);await record(t,core,value,state.head.revisions,epoch);
};
