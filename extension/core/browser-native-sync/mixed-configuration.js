import {CONSUMER_PREFERENCE_KEYS,assertConsumerPreferenceOperation,consumerPreferenceRenderingValue} from './consumer-preference-codec.js';
import {CONSUMER_OWNER_PREFIX,consumerDisplayPreferences} from './consumer-preference-restore.js';
import {TOPIC_DESIRED_PREFIX,assertTopicDesiredReference,logicalTopicFacts} from './topic-desired-codec.js';
import {CONTEXT_TOPIC_ACCESS_ROW,validContextTopicPreferences} from '../context-topic-preferences.js';
import {validContextTopicReceipt} from '../context-topic-access.js';
import {requireOriginalCurrentMixedGroupScope,originalMixedRestoredMetadataReplay} from './group-checkpoint-scope.js';
import {CONTROL_PUBLICATION_REVISION,CONTROL_PUBLICATION_RESERVATION,validateControlPublicationStamp} from '../local-control-publication.js';
import {CONSUMER_PUBLICATION_PENDING_ID} from './consumer-publication-state.js';
import {protocolPhysicalId} from './physical-key.js';
import {clone,equal,exact,count,fail} from './value.js';
const refuse=()=>fail('BNS_GROUP_CANONICAL_UNREPRESENTED'),unproven=()=>fail('BNS_GROUP_COMMIT_UNPROVEN');
// Pure typed comparisons inside the original authenticated Mixed consumer.
// The caller prepays these bounded row/ref/equality operands. No native cut,
// metadata prefix exemption, grant or transport capability is created here.
export function mixedConfigurationReplay(core,scope,plan,restored){
 requireOriginalCurrentMixedGroupScope(core,scope,plan);
 const transactions=restored?originalMixedRestoredMetadataReplay(core,scope,plan).transactions:[...plan.groups].sort((a,b)=>a.operations[0].sequence-b.operations[0].sequence).map(g=>[g]);
 const operations=transactions.flat().flatMap(g=>g.operations),local=operations.filter(op=>op.deviceId===core.deviceId),imported=operations.filter(op=>op.deviceId!==core.deviceId),revisions=new Map();
 for(const head of plan.heads)if(['consumerPreference','topicDesired'].includes(head.type)){
  const prior=imported.filter(op=>op.type===head.type&&op.entityId===head.entityId);revisions.set(head.type+'\0'+head.entityId,(head.type==='consumerPreference'?(prior.length?1:0):prior.length)+local.filter(op=>op.type===head.type&&op.entityId===head.entityId).length);
 }
 let mode='light',policyEpoch=0;
 if(restored){const head=imported.filter(op=>op.type==='consumerPreference'&&op.entityId==='smartFilter').at(-1);if(head){assertConsumerPreferenceOperation(head);mode=consumerPreferenceRenderingValue(head.value);policyEpoch=mode==='light'?0:1;}}
 for(const op of local.filter(op=>op.type==='consumerPreference'&&op.entityId==='smartFilter').sort((a,b)=>a.sequence-b.sequence)){
  assertConsumerPreferenceOperation(op);const next=consumerPreferenceRenderingValue(op.value);
  // A prejournal nondefault bootstrap does not prove its prior policy counter.
  if(op.actor==='bootstrap'&&next!==mode)refuse();if(next!==mode){mode=next;policyEpoch++;}
 }
 return {revisions,mode,policyEpoch};
}
export function compareMixedConfiguration(core,scope,plan,raw,control,restored){
 requireOriginalCurrentMixedGroupScope(core,scope,plan);const rows=new Map(raw.rows.meta.map(r=>[r.id,r])),ops=plan.groups.flatMap(g=>g.operations),heads=new Map(plan.heads.map(h=>[h.type+'\0'+h.entityId,h])),key=(type,id)=>protocolPhysicalId(core.prefix,raw.namespace,'materializedOwner',[type,id]),replay=mixedConfigurationReplay(core,scope,plan,restored),consumed=[],values=[],desired=[];
 const consume=(type,id,prefix,field)=>{
  const head=heads.get(type+'\0'+id),row=rows.get(prefix+id),proof=rows.get(key(type,id));
  if(!head){if(row||proof)unproven();return null;}
  const op=ops.find(op=>op.revisionId===head.revisions[0]);
  if(head.purged||head.revisions.length!==1||!op||!exact(row,['id','version','revision',field])||Object.keys(row).length!==4||row.id!==prefix+id||row.version!==1||!count(row.revision)||row.revision<1||row.revision!==replay.revisions.get(type+'\0'+id)||!equal(row[field],op.value)||!equal(proof,{id:key(type,id),version:1,revisionId:op.revisionId,ownerRevision:row.revision}))unproven();
  consumed.push(row.id,proof.id);return op;
 };
 for(const id of CONSUMER_PREFERENCE_KEYS){const op=consume('consumerPreference',id,CONSUMER_OWNER_PREFIX,'intent');if(op){assertConsumerPreferenceOperation(op);values.push(clone(op.value));}}
 if(raw.rows.meta.filter(row=>row.id.startsWith(CONSUMER_OWNER_PREFIX)).length!==values.length||!equal(control.preferences,consumerDisplayPreferences(values)))refuse();
 const filter=rows.get('smart-filter');if(filter?.mode!==replay.mode||filter.policyEpoch!==replay.policyEpoch)refuse();
 for(const value of scope.expected.topicDesired??[]){const op=consume('topicDesired',value.id,TOPIC_DESIRED_PREFIX,'value');if(!op||!equal(op.value,value))unproven();const member=ops.find(o=>o.revisionId===value.topicRef.memberRevisionId),commit=ops.find(o=>o.revisionId===value.topicRef.commitRevisionId);assertTopicDesiredReference(value,commit,member);desired.push(clone(value));}
 if(raw.rows.meta.filter(row=>row.id.startsWith(TOPIC_DESIRED_PREFIX)).length!==desired.length)refuse();
 const local=rows.get(CONTEXT_TOPIC_ACCESS_ROW),receipts=raw.rows.operationReceipts.filter(row=>row.namespace==='context-topic-access');
 if(local){if(!validContextTopicPreferences(local)||local.choices.length>128)refuse();let total=0;
  for(const choice of local.choices){const value=desired.find(v=>v.id===choice.topicId),member=value&&ops.find(o=>o.revisionId===value.topicRef.memberRevisionId);if(!value||value.enabled!==choice.enabled||!member||!equal(logicalTopicFacts(member.value.after),{createdAt:choice.binding.createdAt,layoutGeneration:choice.binding.layoutGeneration,removalOperationId:choice.binding.removalOperationId,organizationOperationId:choice.binding.organizationOperationId}))refuse();
   const owned=receipts.filter(r=>r.ownerId===choice.topicId&&!r.result.noOp).sort((a,b)=>a.result.revision-b.result.revision);if(owned.length!==choice.revision||owned.some((r,i)=>!validContextTopicReceipt(r)||r.result.revision!==i+1)||owned.at(-1)?.result.enabled!==choice.enabled)refuse();total+=choice.revision;
  }
  if(local.revision!==total)refuse();consumed.push(local.id);
 }else if(receipts.length)refuse();
 for(const r of receipts){if(!validContextTopicReceipt(r)||!local?.choices.some(c=>c.topicId===r.ownerId))refuse();const op=ops.find(op=>op.type==='topicDesired'&&op.operationId===r.id.slice('context-topic:'.length));if(op&&(op.deviceId!==core.deviceId||op.actor!=='user'||op.entityId!==r.ownerId||op.value.enabled!==r.result.enabled))refuse();if(!op&&!ops.some(op=>op.type==='topicDesired'&&op.actor==='bootstrap'&&op.deviceId===core.deviceId&&op.entityId===r.ownerId))refuse();}
 const localOps=ops.filter(op=>op.type==='topicDesired'&&op.deviceId===core.deviceId&&op.actor==='user').sort((a,b)=>a.sequence-b.sequence),epoch=rows.get('recovery-restore-epoch')?.value??'initial';
 for(const choice of local?.choices??[]){const ours=localOps.filter(op=>op.entityId===choice.topicId),baseline=choice.revision-ours.length;if(baseline<0||baseline&&!ops.some(op=>op.type==='topicDesired'&&op.deviceId===core.deviceId&&op.actor==='bootstrap'&&op.entityId===choice.topicId))refuse();for(let i=0;i<ours.length;i++){const receipt=receipts.find(r=>r.id==='context-topic:'+ours[i].operationId);if(!receipt||receipt.result.noOp||receipt.result.revision!==baseline+i+1||receipt.epoch!==epoch)refuse();}}
 if(receipts.some(receipt=>receipt.epoch!==epoch))refuse();
 return {values:values.sort((a,b)=>a.id.localeCompare(b.id)),desired:desired.sort((a,b)=>a.id.localeCompare(b.id)),consumed,mode:replay.mode,policyEpoch:replay.policyEpoch};
}
export function consumeMixedPublicationMetadata(rows){
 if(rows.has(CONTROL_PUBLICATION_RESERVATION)||rows.has(CONSUMER_PUBLICATION_PENDING_ID))refuse();const row=rows.get(CONTROL_PUBLICATION_REVISION);
 if(row){if(!exact(row,['id','version','revision'])||Object.keys(row).length!==3||row.version!==1||!count(row.revision)||row.revision<1)refuse();rows.delete(row.id);}
 // Raw SDK stamp/revision equality was checked by the original capture, before
 // this named metadata consumption. A row alone supplies no publication proof.
}
