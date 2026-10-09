// Read-only facts over original owners. NOT_ADMITTED: no capability or activation.
import {PROMPT_REUSE_ROW,readPromptPreferences} from '../prompt-reuse-preferences.js';
import {PromptSyncJournal,JournalRestoreFence,materializePrompt} from './prompt-journal.js';
import {CODECS,projectEntity,validateEntity} from './codecs.js';
import {equal,SyncError} from './value.js';
import {validateOperation} from './core.js';
const result=(covered,reason=null)=>Object.freeze({version:1,state:'NOT_ADMITTED',covered,reason,productionActivation:false});
export async function readPromptCanonicalCoverage(core,{promptService=null}={}){
 const repository=core?.repository,journal=promptService?.syncJournal;
 const bound=()=>!!repository&&promptService?.s?.repository===repository&&core.repository===repository&&journal instanceof PromptSyncJournal&&journal.core===core&&core.materialize===materializePrompt;
 if(!bound())return result(false,'writer_not_bound');
 const database=repository.db,identity=[core.datasetId,core.deviceId,core.prefix,core.fixedNamespace];
 const current=()=>bound()&&repository.db===database&&identity.every((value,index)=>value===[core.datasetId,core.deviceId,core.prefix,core.fixedNamespace][index]);
 const observed=await core.transaction(false,async t=>{
  if(!current())return result(false,'binding_changed');
  const fence=new JournalRestoreFence(core),before=await fence.snapshot(t);
  if(!before.marker)return result(false,'restore_fence_missing');
  // readPromptPreferences synthesizes a default for absent/falsy storage. Such
  // a value cannot attest a persisted canonical row, even after empty bootstrap.
  if(!await t.get('meta',PROMPT_REUSE_ROW))return result(false,'empty_untracked');
  const preferences=await readPromptPreferences(t),head=await core.get(t,'head','promptPreferences',PROMPT_REUSE_ROW);
  if(!head)return result(false,'journal_head_missing');
  if(head.type!=='promptPreferences'||head.entityId!==PROMPT_REUSE_ROW)return result(false,'owner_head_changed');
  if(head.purged)return result(false,'purged');
  if(!Array.isArray(head.revisions)||head.revisions.length!==1)return result(false,'unresolved_head');
  const proof=await core.materializedOwner(t,'promptPreferences',PROMPT_REUSE_ROW);
  if(!proof)return result(false,'owner_proof_missing');
  if(head.revisions[0]!==proof.revisionId)return result(false,'owner_head_changed');
  if(!Object.hasOwn(proof.operation,'codecVersion')||proof.operation.codecVersion!==CODECS.promptPreferences.version)return result(false,'owner_codec_unavailable');
  if(proof.ownerRevision!==preferences.revision)return result(false,'owner_revision_changed');
  if(proof.operation.kind!=='put'||proof.operation.datasetId!==core.datasetId||proof.operation.revisionId!==proof.revisionId||!equal(projectEntity('promptPreferences',preferences),validateEntity('promptPreferences',proof.operation.value,proof.operation.codecVersion)))return result(false,'owner_bytes_changed');
  const after=await fence.snapshot(t);
  if(!equal(before,after)||!current())return result(false,'binding_changed');
  return {facts:result(true),operation:proof.operation};
 },['meta']);
 // Facts describe this observed cut, never a reusable permission. Do not return
 // a positive observation after its original public owner binding was replaced.
 if(!current())return result(false,'binding_changed');
 if(!observed.operation)return observed;
 // Envelope/digest crypto belongs after the original readonly transaction has
 // settled. Only this private frame holds the observed operation.
 try{await validateOperation(observed.operation);}catch(error){
  if(error instanceof SyncError)return result(false,'owner_operation_invalid');
  throw error;
 }
 return current()?observed.facts:result(false,'binding_changed');
}
