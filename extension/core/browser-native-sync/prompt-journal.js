import {PROMPT_REUSE_ROW,readPromptPreferences} from '../prompt-reuse-preferences.js';
import {projectEntity,validateEntity} from './codecs.js';
import {clone,equal,fail,opaque} from './value.js';

// Shared persistent fence for the admitted local journals, not sync identity.
// An old namespace after local backup replacement requires explicit reconciliation.
export class JournalRestoreFence {
 constructor(core){this.core=core;this.prepared=new WeakMap();}
 async snapshot(t){
  const row=await t.get('meta','recovery-restore-epoch');
  if(row!==undefined&&row!==null&&(!row||Object.keys(row).some(k=>!['id','value'].includes(k))||!opaque(row.value)))fail('BNS_RESTORE_EPOCH_INVALID');
  const epoch=row?.value??null,namespace=await this.core.bind(t),marker=await this.core.get(t,'ownerRecoveryEpoch');
  if(marker){
   if(marker.version!==1||Object.keys(marker).some(k=>!['id','version','epoch'].includes(k))||marker.epoch!==null&&!opaque(marker.epoch))fail('BNS_RESTORE_EPOCH_INVALID');
   if(marker.epoch!==epoch)fail('BNS_RESTORE_EPOCH_CHANGED');
  }else if(epoch!==null){
   const heads=await t.primaryRangePage('meta',{prefix:await this.core.idIn(t,'head'),limit:1});
   if(heads.rows.length)fail('BNS_RESTORE_EPOCH_UNBOUND');
  }
  return {epoch,namespace,marker:!!marker};
 }
 async prepare(make){
  const before=await this.core.transaction(false,t=>this.snapshot(t),['meta']);
  const prepared=await make();this.prepared.set(prepared,before);return prepared;
 }
 async commit(t,prepared){
  const before=this.prepared.get(prepared);if(!before)fail('BNS_PREPARATION_REQUIRED');
  const now=await this.snapshot(t);
  if(now.namespace!==before.namespace)fail('BNS_PREPARATION_STALE');
  if(now.epoch!==before.epoch)fail('BNS_RESTORE_EPOCH_CHANGED');
  if(!now.marker)await this.core.put(t,'ownerRecoveryEpoch',[],{version:1,epoch:now.epoch});
 }
}

// Explicit dependency injection only. The service worker does not construct this
// journal, so this proof cannot enable cloud access or change ordinary saves.
export class PromptSyncJournal {
 constructor(core){this.core=core;this.restoreFence=new JournalRestoreFence(core);}
 async prepare(before,after){return this.restoreFence.prepare(()=>this.prepareCurrent(before,after));}
 async prepareCurrent(before,after){
  const old=projectEntity('promptPreferences',before),next=projectEntity('promptPreferences',after);
  const head=await this.core.read('head','promptPreferences',PROMPT_REUSE_ROW);
  if(head?.purged)fail('BNS_ENTITY_PURGED');
  if(head?.revisions.length>1)fail('BNS_CONFLICT_REQUIRES_RESOLUTION');
  if(head){const revision=await this.core.read('revision',head.revisions[0]);if(!equal(revision?.operation.value,old))fail('BNS_OWNER_CHANGED');}
  else if(old.pins.length||old.overrides.length||old.splits.length)fail('BNS_BOOTSTRAP_REQUIRED');
  return this.core.prepare([{type:'promptPreferences',value:next}]);
 }
 async commit(t,prepared){
  await this.restoreFence.commit(t,prepared);
  const result=await this.core.commitPrepared(t,prepared,{materialize:false});
  await this.core.recordMaterializedOwner(t,prepared.operations[0],(await readPromptPreferences(t)).revision);return result;
 }
 async noteVerifiedReuse(t,before,after){
  // Local ranking remains usable after recovery, but cannot renew old sync proof.
  try{await this.restoreFence.snapshot(t);}catch(error){if(['BNS_RESTORE_EPOCH_CHANGED','BNS_RESTORE_EPOCH_UNBOUND'].includes(error.code))return;throw error;}
  const proof=await this.core.materializedOwner(t,'promptPreferences',PROMPT_REUSE_ROW);
  if(proof&&proof.ownerRevision===before.revision&&equal(projectEntity('promptPreferences',before),proof.operation.value)&&equal(projectEntity('promptPreferences',after),proof.operation.value))await this.core.recordMaterializedOwner(t,proof.operation,after.revision);
 }
 async bootstrap(){
  const before=await this.core.repository.transaction(false,t=>readPromptPreferences(t),['meta']);
  if(await this.core.read('head','promptPreferences',PROMPT_REUSE_ROW))fail('BNS_BOOTSTRAP_EXISTS');
  const prepared=await this.restoreFence.prepare(()=>this.core.prepare([{type:'promptPreferences',value:projectEntity('promptPreferences',before),expectedParents:[]}],{actor:'bootstrap'}));
  return this.core.transaction(true,async t=>{if(!equal(await readPromptPreferences(t),before))fail('BNS_OWNER_CHANGED');return this.commit(t,prepared);});
 }
}
export async function materializePrompt(t,context){
 const {operation,head,origin,core}=context;
 if(operation.type!=='promptPreferences')fail('BNS_MATERIALIZER_UNSUPPORTED');
 if(head.purged)fail('BNS_PROMPT_PURGE_SCOPE_UNAVAILABLE');
 if(origin==='remote')await qualifyPromptOwner(t,context);
 const portable=validateEntity(operation.type,operation.value),local=await readPromptPreferences(t);
 // Ranking is device-local: retain this device's matching-ID counter across a
 // remote content update. A genuinely new restored ID starts at zero.
 const value={...clone(portable),revision:local.revision+1,overrides:portable.overrides.map(item=>({...item,reuseCount:local.overrides.find(x=>x.id===item.id)?.reuseCount||0}))};
 await t.put('meta',value);
 if(core)await core.recordMaterializedOwner(t,operation,value.revision);
}
async function qualifyPromptOwner(t,context){
 const preferences=await readPromptPreferences(t),local=projectEntity('promptPreferences',preferences);
 // Existing immediate-head qualification remains byte-exact and ignores local ranking.
 if(context.previousHead&&!context.previousHead.purged&&context.previousVersions.some(operation=>equal(operation.value,local)))return;
 const proof=context.previousCore?await context.previousCore.materializedOwner(t,'promptPreferences',PROMPT_REUSE_ROW):null;
 if(proof){
  await new JournalRestoreFence(context.previousCore).snapshot(t);
  if(proof.ownerRevision!==preferences.revision||!equal(proof.operation.value,local)||!context.previousHead||context.previousHead.purged||!await context.core.ownerAncestor(t,proof.operation,context.previousHead.revisions))fail('BNS_OWNER_CHANGED');
  return;
 }
 if(!context.previousHead){if(local.pins.length||local.overrides.length||local.splits.length)fail('BNS_RESTORE_UNMANAGED_OWNER');}
 else if(!context.previousHead.purged&&!context.previousVersions.some(operation=>equal(operation.value,local)))fail('BNS_OWNER_CHANGED');
}
export async function restorePromptPreferences(t,context){
 return materializePrompt(t,{...context,origin:'remote'});
}
