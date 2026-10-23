import {requireOriginalGroupCheckpointPlan} from './group-checkpoint-plan.js';
import {finalConsumerPreferenceOperations,requireConsumerPreferenceOwners} from './consumer-preference-restore.js';
import {PROMPT_REUSE_ROW,readPromptPreferences} from '../prompt-reuse-preferences.js';
import {PROMPT_CORRECTION_BINDING_ROW,validatePromptCorrectionCompanion,promptCorrectionEnvelope} from './prompt-correction-binding.js';
import {projectEntity} from './codecs.js';
import {equal,fail} from './value.js';
const denied=()=>fail('BNS_SOURCE_PURGE_UNSUPPORTED');
// These surviving original owners do not authorize deletion. Their complete
// current values and proof rows are preserved alongside the Source closure.
export async function requireSourcePurgePortableOwnerRows(t,store,core,plan){
 requireOriginalGroupCheckpointPlan(core,plan);
 const operations=plan.groups.flatMap(g=>g.operations),result=[];
 await requireConsumerPreferenceOwners(t,store,core,finalConsumerPreferenceOperations(plan));
 const prompt=await readPromptPreferences(t);
 for(const head of plan.heads.filter(h=>['consumerPreference','promptPreferences','promptBinding'].includes(h.type))){
  if(head.purged||head.revisions.length!==1)denied();
  const operation=operations.find(op=>op.revisionId===head.revisions[0]),proof=await core.materializedOwner(t,head.type,head.entityId);
  if(!operation||!proof||!equal(proof.operation,operation))denied();
  if(head.type==='promptPreferences'){
   if(head.entityId!==PROMPT_REUSE_ROW||proof.ownerRevision!==prompt.revision||!equal(projectEntity('promptPreferences',prompt),operation.value))denied();
  }else if(head.type==='promptBinding'){
   const row=await t.get('meta',PROMPT_CORRECTION_BINDING_ROW),portable=validatePromptCorrectionCompanion({...row,id:PROMPT_REUSE_ROW});
   promptCorrectionEnvelope(portable,projectEntity('promptPreferences',prompt));
   const parent=plan.heads.find(h=>h.type==='promptPreferences'&&h.entityId===PROMPT_REUSE_ROW);
   if(head.entityId!==PROMPT_REUSE_ROW||proof.ownerRevision!==prompt.revision||!equal(portable,operation.value)||!parent||parent.revisions.length!==1||portable.promptRevisionId!==parent.revisions[0])denied();
  }
  result.push({id:await core.idIn(t,'materializedOwner',head.type,head.entityId),version:1,revisionId:head.revisions[0],ownerRevision:proof.ownerRevision});
 }
 return result;
}
