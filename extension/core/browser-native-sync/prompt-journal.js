import {PROMPT_REUSE_ROW,readPromptPreferences} from '../prompt-reuse-preferences.js';
import {projectEntity,validateEntity} from './codecs.js';
import {clone,equal,fail} from './value.js';

// Explicit dependency injection only. The service worker does not construct this
// journal, so this proof cannot enable cloud access or change ordinary saves.
export class PromptSyncJournal {
 constructor(core){this.core=core;}
 async prepare(before,after){
  const old=projectEntity('promptPreferences',before),next=projectEntity('promptPreferences',after);
  const head=await this.core.read('head','promptPreferences',PROMPT_REUSE_ROW);
  if(head?.purged)fail('BNS_ENTITY_PURGED');
  if(head?.revisions.length>1)fail('BNS_CONFLICT_REQUIRES_RESOLUTION');
  if(head){const revision=await this.core.read('revision',head.revisions[0]);if(!equal(revision?.operation.value,old))fail('BNS_OWNER_CHANGED');}
  else if(old.pins.length||old.overrides.length||old.splits.length)fail('BNS_BOOTSTRAP_REQUIRED');
  return this.core.prepare([{type:'promptPreferences',value:next}]);
 }
 async commit(t,prepared){
  const result=await this.core.commitPrepared(t,prepared,{materialize:false});
  await this.core.recordMaterializedOwner(t,prepared.operations[0],(await readPromptPreferences(t)).revision);return result;
 }
 async noteVerifiedReuse(t,before,after){
  const proof=await this.core.materializedOwner(t,'promptPreferences',PROMPT_REUSE_ROW);
  if(proof&&proof.ownerRevision===before.revision&&equal(projectEntity('promptPreferences',before),proof.operation.value)&&equal(projectEntity('promptPreferences',after),proof.operation.value))await this.core.recordMaterializedOwner(t,proof.operation,after.revision);
 }
 async bootstrap(){
  const before=await this.core.repository.transaction(false,t=>readPromptPreferences(t),['meta']);
  if(await this.core.read('head','promptPreferences',PROMPT_REUSE_ROW))fail('BNS_BOOTSTRAP_EXISTS');
  const prepared=await this.core.prepare([{type:'promptPreferences',value:projectEntity('promptPreferences',before),expectedParents:[]}],{actor:'bootstrap'});
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
  if(proof.ownerRevision!==preferences.revision||!equal(proof.operation.value,local)||!context.previousHead||context.previousHead.purged||!await context.core.ownerAncestor(t,proof.operation,context.previousHead.revisions))fail('BNS_OWNER_CHANGED');
  return;
 }
 if(!context.previousHead){if(local.pins.length||local.overrides.length||local.splits.length)fail('BNS_RESTORE_UNMANAGED_OWNER');}
 else if(!context.previousHead.purged&&!context.previousVersions.some(operation=>equal(operation.value,local)))fail('BNS_OWNER_CHANGED');
}
export async function restorePromptPreferences(t,context){
 return materializePrompt(t,{...context,origin:'remote'});
}
