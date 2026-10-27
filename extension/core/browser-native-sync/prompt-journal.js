import {PROMPT_REUSE_ROW,readPromptPreferences} from '../prompt-reuse-preferences.js';
import {projectEntity,validateEntity} from './codecs.js';
import {clone,equal,fail,opaque} from './value.js';
import {PROMPT_CORRECTION_BINDING_ROW,capturePromptCorrectionSuccessor,promptCorrectionEnvelope,validatePromptCorrectionCompanion,projectBoundPromptCorrections} from './prompt-correction-binding.js';

export async function readRestoreEpoch(t){
 const row=await t.get('meta','recovery-restore-epoch');
 if(row!==undefined&&row!==null&&(!row||Object.keys(row).some(k=>!['id','value'].includes(k))||!opaque(row.value)))fail('BNS_RESTORE_EPOCH_INVALID');
 return row?.value??null;
}

// Shared persistent fence for the admitted local journals, not sync identity.
// An old namespace after local backup replacement requires explicit reconciliation.
export class JournalRestoreFence {
 constructor(core){this.core=core;this.prepared=new WeakMap();}
 async snapshot(t){
  const epoch=await readRestoreEpoch(t),namespace=await this.core.bind(t),marker=await this.core.get(t,'ownerRecoveryEpoch');
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

// Deny-only original method identity. Captured here after declaration, never
// from a caller or on first use; it grants no read, write or restore authority.
const restoreFencePrototype=JournalRestoreFence.prototype,restoreFenceParent=Object.getPrototypeOf(restoreFencePrototype),restoreFenceMethods=Object.getOwnPropertyNames(restoreFencePrototype).filter(name=>name!=='constructor').map(name=>[name,Object.getOwnPropertyDescriptor(restoreFencePrototype,name)]);
export function requireOriginalJournalRestoreFence(fence,core){
 if(Object.getPrototypeOf(fence)!==restoreFencePrototype||Object.getPrototypeOf(restoreFencePrototype)!==restoreFenceParent||Object.getOwnPropertyDescriptor(fence,'core')?.value!==core)fail('BNS_RESTORE_FENCE_REQUIRED');
 for(const [name,expected]of restoreFenceMethods){const current=Object.getOwnPropertyDescriptor(restoreFencePrototype,name);if(Object.hasOwn(fence,name)||!current||['value','get','set','writable','enumerable','configurable'].some(key=>current[key]!==expected[key]))fail('BNS_RESTORE_FENCE_REQUIRED');}
 return true;
}

// Explicit dependency injection only. The service worker does not construct this
// journal, so this proof cannot enable cloud access or change ordinary saves.
export class PromptSyncJournal {
 #correctionBindings;
 #bindingPrepared=new WeakMap();
 get correctionBindings(){return this.#correctionBindings;}
 constructor(core,{correctionBindings=false}={}){if(typeof correctionBindings!=='boolean')fail('BNS_PROMPT_BINDING_INVALID');this.core=core;this.restoreFence=new JournalRestoreFence(core);this.#correctionBindings=correctionBindings;}
 async bindingSnapshot(t,preferences,{allowAbsent=false}={}){
  const promptHead=await this.core.get(t,'head','promptPreferences',PROMPT_REUSE_ROW),head=await this.core.get(t,'head','promptBinding',PROMPT_REUSE_ROW),row=await t.get('meta',PROMPT_CORRECTION_BINDING_ROW),promptProof=await this.core.materializedOwner(t,'promptPreferences',PROMPT_REUSE_ROW),proof=await this.core.materializedOwner(t,'promptBinding',PROMPT_REUSE_ROW),generation=(await t.get('meta','backup-data-generation'))?.value||0;
  if(!promptHead&&promptProof)fail('BNS_OWNER_CHANGED');
  if(promptHead&&(promptHead.purged||promptHead.revisions.length!==1||!promptProof||promptProof.ownerRevision!==preferences.revision||promptProof.operation.revisionId!==promptHead.revisions[0]||!equal(promptProof.operation.value,projectEntity('promptPreferences',preferences))))fail('BNS_OWNER_CHANGED');
  if(!head&&!row&&!proof){if(!allowAbsent)fail('BNS_PROMPT_BINDING_REQUIRED');return {promptHead:promptHead??null,promptProof,head:null,row:null,proof:null,generation};}
  if(!head||head.purged||head.revisions.length!==1||!row||!proof||!promptHead)fail('BNS_PROMPT_BINDING_REQUIRED');
  if(row.id!==PROMPT_CORRECTION_BINDING_ROW)fail('BNS_OWNER_CHANGED');const portable=validatePromptCorrectionCompanion({...row,id:PROMPT_REUSE_ROW});promptCorrectionEnvelope(portable,projectEntity('promptPreferences',preferences));
  if(portable.promptRevisionId!==promptHead.revisions[0]||proof.ownerRevision!==preferences.revision||proof.operation.revisionId!==head.revisions[0]||!equal(proof.operation.value,portable))fail('BNS_OWNER_CHANGED');
  return {promptHead,promptProof,head,row,proof,generation};
 }
 async projectCorrections(snapshot,now){
  if(!this.correctionBindings)fail('BNS_PROMPT_BINDING_REQUIRED');const before=await this.core.transaction(false,t=>this.bindingSnapshot(t,snapshot.preferences,{allowAbsent:true}),['meta']);if(before.generation!==snapshot.generation)fail('BNS_OWNER_CHANGED');
  if(!before.row){if(before.promptHead)fail('BNS_PROMPT_BINDING_REQUIRED');return {families:snapshot.families,unresolved:[],bindingsComplete:true};}
  const binding=promptCorrectionEnvelope({...before.row,id:PROMPT_REUSE_ROW},projectEntity('promptPreferences',snapshot.preferences)),result=await projectBoundPromptCorrections({binding,inputs:snapshot.inputs,preferences:snapshot.preferences,now});
  await this.core.transaction(false,async t=>{if(!equal(await readPromptPreferences(t),snapshot.preferences)||!equal(await this.bindingSnapshot(t,snapshot.preferences),before))fail('BNS_OWNER_CHANGED');},['meta']);return result;
 }
 async prepare(before,after,snapshot){return this.restoreFence.prepare(()=>this.prepareCurrent(before,after,snapshot));}
 async prepareCurrent(before,after,snapshot){
  const old=projectEntity('promptPreferences',before),next=projectEntity('promptPreferences',after);
  const head=await this.core.read('head','promptPreferences',PROMPT_REUSE_ROW);
  if(head?.purged)fail('BNS_ENTITY_PURGED');
  if(head?.revisions.length>1)fail('BNS_CONFLICT_REQUIRES_RESOLUTION');
  if(head){const revision=await this.core.read('revision',head.revisions[0]);if(!equal(revision?.operation.value,old))fail('BNS_OWNER_CHANGED');}
  else if(old.pins.length||old.overrides.length||old.splits.length)fail('BNS_BOOTSTRAP_REQUIRED');
  if(!this.correctionBindings)return this.core.prepare([{type:'promptPreferences',value:next}]);
  if(!snapshot||!Array.isArray(snapshot.inputs)||!Number.isSafeInteger(snapshot.generation))fail('BNS_PROMPT_BINDING_REQUIRED');
  const bindingBefore=await this.core.transaction(false,t=>this.bindingSnapshot(t,before,{allowAbsent:!head}),['meta']);if(bindingBefore.generation!==snapshot.generation)fail('BNS_OWNER_CHANGED');
  const previous=bindingBefore.row?promptCorrectionEnvelope({...bindingBefore.row,id:PROMPT_REUSE_ROW},old):null,binding=await capturePromptCorrectionSuccessor({inputs:snapshot.inputs,preferences:after,previous}),prepared=await this.core.prepare([{type:'promptPreferences',value:next}],{promptBinding:{version:1,normalizerVersion:binding.normalizerVersion,bindings:binding.bindings}});
  this.#bindingPrepared.set(prepared,{before:clone(before),after:clone(after),bindingBefore});return prepared;
 }
 async commit(t,prepared){
  await this.restoreFence.commit(t,prepared);
  const binding=this.correctionBindings?this.#bindingPrepared.get(prepared):null;if(this.correctionBindings&&(!binding||!equal(await readPromptPreferences(t),binding.after)||!equal(await this.bindingSnapshot(t,binding.before,{allowAbsent:!binding.bindingBefore.head}),binding.bindingBefore)))fail('BNS_OWNER_CHANGED');
  const result=await this.core.commitPrepared(t,prepared,{materialize:false});
  const revision=(await readPromptPreferences(t)).revision;if(!binding?.enroll)await this.core.recordMaterializedOwner(t,prepared.operations[0],revision);
  if(binding){const operation=prepared.operations[binding.enroll?0:1],prompt=binding.enroll?binding.bindingBefore.promptProof.operation:prepared.operations[0];if(operation?.type!=='promptBinding'||operation.value.promptRevisionId!==prompt.revisionId)fail('BNS_PROMPT_BINDING_INVALID');promptCorrectionEnvelope(operation.value,prompt.value);await t.put('meta',{...clone(operation.value),id:PROMPT_CORRECTION_BINDING_ROW});await this.core.recordMaterializedOwner(t,operation,revision);}return result;
 }
 async noteVerifiedReuse(t,before,after){
  // Local ranking remains usable after recovery, but cannot renew old sync proof.
  try{await this.restoreFence.snapshot(t);}catch(error){if(['BNS_RESTORE_EPOCH_CHANGED','BNS_RESTORE_EPOCH_UNBOUND'].includes(error.code))return;throw error;}
  const proof=await this.core.materializedOwner(t,'promptPreferences',PROMPT_REUSE_ROW);
  if(proof&&proof.ownerRevision===before.revision&&equal(projectEntity('promptPreferences',before),proof.operation.value)&&equal(projectEntity('promptPreferences',after),proof.operation.value)){const binding=this.correctionBindings?await this.bindingSnapshot(t,before):null;await this.core.recordMaterializedOwner(t,proof.operation,after.revision);if(binding)await this.core.recordMaterializedOwner(t,binding.proof.operation,after.revision);}
 }
 async bootstrap(service){
  if(this.correctionBindings){if(service?.syncJournal!==this||service.s?.repository!==this.core.repository||typeof service.syncCorrectionSnapshot!=='function')fail('BNS_PROMPT_BINDING_REQUIRED');const snapshot=await service.syncCorrectionSnapshot(this),before=snapshot.preferences,bindingBefore=await this.core.transaction(false,t=>this.bindingSnapshot(t,before,{allowAbsent:true}),['meta']);if(bindingBefore.head)fail('BNS_BOOTSTRAP_EXISTS');if(bindingBefore.generation!==snapshot.generation)fail('BNS_OWNER_CHANGED');const binding=await capturePromptCorrectionSuccessor({inputs:snapshot.inputs,preferences:before}),enroll=!!bindingBefore.promptHead,prepared=await this.restoreFence.prepare(()=>enroll?this.core.prepare([{type:'promptBinding',value:{id:PROMPT_REUSE_ROW,version:1,promptRevisionId:bindingBefore.promptHead.revisions[0],normalizerVersion:binding.normalizerVersion,bindings:binding.bindings},expectedParents:[]}],{actor:'bootstrap'}):this.core.prepare([{type:'promptPreferences',value:projectEntity('promptPreferences',before),expectedParents:[]}],{actor:'bootstrap',promptBinding:{version:1,normalizerVersion:binding.normalizerVersion,bindings:binding.bindings}}));this.#bindingPrepared.set(prepared,{before:clone(before),after:clone(before),bindingBefore,enroll});return this.core.transaction(true,t=>this.commit(t,prepared));}
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
export async function materializePromptBinding(t,context){
 const {core,operation,head,previousHead}=context;if(operation.type!=='promptBinding'||head.purged||head.revisions.length!==1)fail('BNS_PROMPT_BINDING_REQUIRED');
 const value=validatePromptCorrectionCompanion(operation.value),preferences=await readPromptPreferences(t),promptHead=await core.get(t,'head','promptPreferences',PROMPT_REUSE_ROW),promptProof=await core.materializedOwner(t,'promptPreferences',PROMPT_REUSE_ROW);
 if(promptHead?.purged||promptHead?.revisions.length!==1||promptHead.revisions[0]!==value.promptRevisionId||promptProof?.operation.revisionId!==value.promptRevisionId||promptProof.ownerRevision!==preferences.revision||!equal(promptProof.operation.value,projectEntity('promptPreferences',preferences)))fail('BNS_OWNER_CHANGED');promptCorrectionEnvelope(value,promptProof.operation.value);
 const row=await t.get('meta',PROMPT_CORRECTION_BINDING_ROW),previousCore=context.previousCore||core,proof=await previousCore.materializedOwner(t,'promptBinding',PROMPT_REUSE_ROW);
 if(row||previousHead||proof){if(!row||row.id!==PROMPT_CORRECTION_BINDING_ROW||!previousHead||previousHead.purged||previousHead.revisions.length!==1||!proof||proof.operation.revisionId!==previousHead.revisions[0]||proof.ownerRevision!==preferences.revision-1||!equal(proof.operation.value,validatePromptCorrectionCompanion({...row,id:PROMPT_REUSE_ROW})))fail('BNS_OWNER_CHANGED');await new JournalRestoreFence(previousCore).snapshot(t);}
 await t.put('meta',{...clone(value),id:PROMPT_CORRECTION_BINDING_ROW});await core.recordMaterializedOwner(t,operation,preferences.revision);
}
