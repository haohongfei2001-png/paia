import {ArchiveError} from '../constants.js';
import {requireOriginalContextTopicDesiredService} from '../context-topic-access.js';
import {CONTEXT_TOPIC_ACCESS_ROW,emptyContextTopicPreferences,validContextTopicPreferences,sameContextTopicBinding} from '../context-topic-preferences.js';
import {physical} from './human-library-journal.js';
import {validateOperation} from './core.js';
import {JournalRestoreFence} from './prompt-journal.js';
import {requireConsumerPublicationSettled} from './consumer-publication-state.js';
import {TOPIC_DESIRED_PREFIX,validateTopicDesired,assertTopicDesiredReference,logicalTopicFacts} from './topic-desired-codec.js';
import {clone,equal,exact,count} from './value.js';
const fail=code=>{throw new ArchiveError(code);},rowId=id=>TOPIC_DESIRED_PREFIX+id;
async function desiredRows(t){const rows=[];let after=null;do{const page=await t.primaryRangePage('meta',{prefix:TOPIC_DESIRED_PREFIX,after,limit:Math.min(100,129-rows.length)});rows.push(...page.rows);if(rows.length>128)fail('BNS_GROUP_RESOURCE_LIMIT');after=page.next;}while(after);return rows;}
async function localRow(t){const row=await t.get('meta',CONTEXT_TOPIC_ACCESS_ROW);if(row&&!validContextTopicPreferences(row))fail('BNS_TOPIC_LOCAL_OWNER_INVALID');return row??emptyContextTopicPreferences();}
async function referenced(t,core,value){const commit=(await core.get(t,'revision',value.topicRef.commitRevisionId))?.operation,member=(await core.get(t,'revision',value.topicRef.memberRevisionId))?.operation;const topic=assertTopicDesiredReference(value,commit,member);return {commit,member,topic};}
async function desiredOwner(t,core,id){
 const row=await t.get('meta',rowId(id)),head=await core.get(t,'head','topicDesired',id);
 if(!head){if(row)fail('BNS_TOPIC_DESIRED_OWNER_CHANGED');return {row:null,head:null,operation:null};}
 if(head.purged||head.revisions.length!==1)fail('BNS_CONFLICT_REQUIRES_RESOLUTION');const operation=(await core.get(t,'revision',head.revisions[0]))?.operation,proof=await core.materializedOwner(t,'topicDesired',id);
 if(!operation||operation.type!=='topicDesired'||operation.entityId!==id||operation.kind!=='put'||!exact(row,['id','version','revision','value'])||Object.keys(row).length!==4||row.id!==rowId(id)||row.version!==1||!count(row.revision)||row.revision<1||!equal(row.value,operation.value)||proof?.ownerRevision!==row.revision||proof.operation.revisionId!==operation.revisionId)fail('BNS_TOPIC_DESIRED_OWNER_CHANGED');await referenced(t,core,row.value);return {row,head,operation};
}
async function currentReference(t,core,id,binding){
 const head=await core.get(t,'head','humanLibraryMember','topic:'+id),topic=await t.get('topics',id);if(head?.purged||head?.revisions.length!==1||!topic)fail('BNS_TOPIC_BINDING_UNRESOLVED');
 const mapping=await core.get(t,'humanMapping','topic:'+id),current=(await core.get(t,'revision',head.revisions[0]))?.operation;
 if(!current||!mapping||mapping.type!=='topic'||mapping.revisionId!==current.revisionId||!equal(mapping.local,physical('topic',topic))||!equal(mapping.wire,physical('topic',current.value.after))||!equal(logicalTopicFacts(topic),logicalTopicFacts(current.value.after)))fail('BNS_TOPIC_BINDING_UNRESOLVED');
 const facts={createdAt:binding.createdAt,layoutGeneration:binding.layoutGeneration,removalOperationId:binding.removalOperationId,organizationOperationId:binding.organizationOperationId};let member=current;
 for(let n=0;n<128;n++){
  if(!member||member.type!=='humanLibraryMember'||member.entityId!=='topic:'+id)fail('BNS_TOPIC_BINDING_UNRESOLVED');
  if(equal(logicalTopicFacts(member.value.after),facts)){
   const commitHead=await core.get(t,'head','humanLibraryCommit',member.value.logicalCommitId);if(commitHead?.purged||commitHead?.revisions.length!==1)fail('BNS_TOPIC_BINDING_UNRESOLVED');const commit=(await core.get(t,'revision',commitHead.revisions[0]))?.operation,value={id,enabled:false,topicRef:{commitRevisionId:commit.revisionId,memberRevisionId:member.revisionId}};assertTopicDesiredReference(value,commit,member);return {topicRef:value.topicRef,commit,member};
  }
  if(member.parents.length!==1)fail('BNS_TOPIC_BINDING_UNRESOLVED');member=(await core.get(t,'revision',member.parents[0]))?.operation;
 }
 fail('BNS_TOPIC_BINDING_UNRESOLVED');
}
export class TopicDesiredSyncJournal{
 #prepared=new WeakMap();
 constructor(core){this.core=core;this.fence=new JournalRestoreFence(core);}
 async snapshot(t,service,id){
  requireOriginalContextTopicDesiredService(service,this);
  if(service.s.repository!==this.core.repository||service.syncDesiredJournal!==this)fail('BNS_TOPIC_DESIRED_BINDING');await requireConsumerPublicationSettled(t);
  const local=await localRow(t),choice=local.choices.find(row=>row.topicId===id)??null,owner=await desiredOwner(t,this.core,id);return {local,choice,owner,fence:await this.fence.snapshot(t)};
 }
 async prepare(service,change){
  const before=await this.core.transaction(false,t=>this.snapshot(t,service,change.topicId));if(!change.enabled&&!before.choice)return null;
  if((before.choice?.revision??0)!==change.expectedRevision)return null;
  if(before.choice&&!before.owner.head)fail('BNS_TOPIC_BOOTSTRAP_REQUIRED');
  const binding=change.enabled?change.expectedBinding:before.choice.binding,reference=await this.core.transaction(false,t=>currentReference(t,this.core,change.topicId,binding));
  await validateOperation(reference.commit);await validateOperation(reference.member);
  const value=validateTopicDesired({id:change.topicId,enabled:change.enabled,topicRef:reference.topicRef}),prepared=await this.fence.prepare(()=>this.core.prepare([{type:'topicDesired',value,expectedParents:before.owner.head?.revisions??[]}],{operationIds:[change.operationId]}));
  this.#prepared.set(prepared,{service,before,change:clone(change),reference});return prepared;
 }
 async commit(t,prepared,choice){
  const p=this.#prepared.get(prepared);if(!p||p.service.syncDesiredJournal!==this)fail('BNS_PREPARATION_REQUIRED');const current=await localRow(t),expected=clone(p.before.local),old=expected.choices.find(row=>row.topicId===p.change.topicId);
  if(old)Object.assign(old,{enabled:p.change.enabled,revision:old.revision+1,...(p.change.enabled?{binding:clone(p.change.expectedBinding)}:{})});else expected.choices.push({topicId:p.change.topicId,enabled:true,revision:1,binding:clone(p.change.expectedBinding)});expected.revision++;
  if(!equal(current,expected)||!equal(current.choices.find(x=>x.topicId===p.change.topicId),choice)||!equal(await desiredOwner(t,this.core,p.change.topicId),p.before.owner)||!equal(await currentReference(t,this.core,p.change.topicId,choice.binding),p.reference))fail('BNS_TOPIC_DESIRED_OWNER_CHANGED');
  await this.fence.commit(t,prepared);await this.core.commitPrepared(t,prepared,{materialize:false});const operation=prepared.operations[0],revision=(p.before.owner.row?.revision??0)+1;await t.put('meta',{id:rowId(operation.entityId),version:1,revision,value:clone(operation.value)});await this.core.recordMaterializedOwner(t,operation,revision);
 }
 async bootstrap(service){
  requireOriginalContextTopicDesiredService(service,this);
  const before=await this.core.transaction(false,async t=>{await service.admission(t);await requireConsumerPublicationSettled(t);const row=await localRow(t);if(row.choices.length>128)fail('BNS_GROUP_RESOURCE_LIMIT');const choices=[];for(const choice of row.choices){const owner=await desiredOwner(t,this.core,choice.topicId);if(owner.head)continue;choices.push({choice,reference:await currentReference(t,this.core,choice.topicId,choice.binding)});}return {row,choices};});if(!before.choices.length)return {count:0};
  for(const item of before.choices){await validateOperation(item.reference.commit);await validateOperation(item.reference.member);}const prepared=await this.fence.prepare(()=>this.core.prepare(before.choices.map(item=>({type:'topicDesired',value:{id:item.choice.topicId,enabled:item.choice.enabled,topicRef:item.reference.topicRef},expectedParents:[]})),{actor:'bootstrap'}));
  return service.s.run(()=>this.core.transaction(true,async t=>{if(!equal(await localRow(t),before.row))fail('BNS_TOPIC_DESIRED_OWNER_CHANGED');for(const item of before.choices)if((await desiredOwner(t,this.core,item.choice.topicId)).head||!equal(await currentReference(t,this.core,item.choice.topicId,item.choice.binding),item.reference))fail('BNS_TOPIC_DESIRED_OWNER_CHANGED');await this.fence.commit(t,prepared);await this.core.commitPrepared(t,prepared,{materialize:false});for(const operation of prepared.operations){await t.put('meta',{id:rowId(operation.entityId),version:1,revision:1,value:clone(operation.value)});await this.core.recordMaterializedOwner(t,operation,1);}return {count:prepared.operations.length};}));
 }
 async fact(t,id,choice,expectedBinding){
  const {row}=await desiredOwner(t,this.core,id);if(!row)return null;const reference=await referenced(t,this.core,row.value),topic=await t.get('topics',id),resolved=!!topic&&['active','dormant'].includes(topic.lifecycle)&&!topic.redirectTo&&!topic.layoutJobId&&!topic.identity?.noRecreation&&equal(logicalTopicFacts(topic),logicalTopicFacts(reference.topic));
  return {enabled:row.value.enabled,resolved,requiresLocalConfirmation:row.value.enabled&&resolved&&(!choice?.enabled||!sameContextTopicBinding(choice.binding,expectedBinding??null)),reason:resolved?'desired_retained':'desired_topic_changed',externalAllowed:false};
 }
 async directory(t){const rows=await desiredRows(t);const result=[];for(const {value:row}of rows){if(!row.value?.id||row.id!==rowId(row.value.id))fail('BNS_TOPIC_DESIRED_OWNER_CHANGED');await desiredOwner(t,this.core,row.value.id);const ref=await referenced(t,this.core,row.value);result.push({id:row.value.id,createdAt:ref.topic.createdAt});}return result;}
}
export const topicDesiredMaterializer=core=>async(t,state)=>{
 const operation=state.operation;if(state.core!==core||operation.type!=='topicDesired'||operation.kind!=='put'||state.head.purged||!equal(state.head.revisions,[operation.revisionId])||!equal((await core.get(t,'revision',operation.revisionId))?.operation,operation)||!equal((await core.get(t,'head','topicDesired',operation.entityId))?.revisions,[operation.revisionId]))fail('BNS_TOPIC_DESIRED_OWNER_CHANGED');
 validateTopicDesired(operation.value);await referenced(t,core,operation.value);const id=rowId(operation.entityId),prior=await t.get('meta',id),proof=await core.materializedOwner(t,'topicDesired',operation.entityId);
 if(state.previousHead){if(!exact(prior,['id','version','revision','value'])||Object.keys(prior).length!==4||prior.id!==id||prior.version!==1||!count(prior.revision)||prior.revision<1||state.previousHead.purged||state.previousHead.revisions.length!==1||!prior||proof?.revisionId!==state.previousHead.revisions[0]||proof.ownerRevision!==prior.revision||!equal(proof.operation.value,prior.value))fail('BNS_TOPIC_DESIRED_OWNER_CHANGED');}else if(prior||proof)fail('BNS_RESTORE_UNMANAGED_OWNER');
 const revision=(prior?.revision??0)+1;if(!count(revision)||revision<1)fail('BNS_TOPIC_DESIRED_OWNER_CHANGED');await t.put('meta',{id,version:1,revision,value:clone(operation.value)});await core.recordMaterializedOwner(t,operation,revision);
 // No local selection, epoch, grant, receipt or imported permission is written.
};
export async function readTopicDesiredOwners(t,core,expected){
 const rows=await desiredRows(t);if(rows.length!==expected.length)fail('BNS_GROUP_CANONICAL_UNREPRESENTED');const values=[];
 for(const value of expected){const owner=await desiredOwner(t,core,value.id);if(!owner.row||!equal(owner.row.value,value))fail('BNS_GROUP_COMMIT_UNPROVEN');values.push(clone(owner.row.value));}return values.sort((a,b)=>a.id.localeCompare(b.id));
}
export async function requireLocalTopicChoicesRepresented(t,core,expected){
 const row=await localRow(t);for(const choice of row.choices){const value=expected.find(value=>value.id===choice.topicId);if(!value||value.enabled!==choice.enabled)fail('BNS_GROUP_CANONICAL_UNREPRESENTED');const ref=await referenced(t,core,value),facts={createdAt:choice.binding.createdAt,layoutGeneration:choice.binding.layoutGeneration,removalOperationId:choice.binding.removalOperationId,organizationOperationId:choice.binding.organizationOperationId};if(!equal(logicalTopicFacts(ref.topic),facts))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');}
}
