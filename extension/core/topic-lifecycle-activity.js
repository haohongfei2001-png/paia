import {ArchiveError} from './constants.js';
import {prefix} from './thought-model.js';
import {contextScopeTransactionReader} from './context-topic-scope.js';
import {registerRepositoryFinalReadFence} from './idb-repository.js';
import {liveTopicKey,THOUGHT_TOPIC_INDEX_VERSION,THOUGHT_TOPIC_STATUS_KEY,observeOriginalTopicInvalidation,originalTopicInvalidationResult} from './thought-read-index.js';
import {rootReadAuthority,planRootReadAuthority} from './organizer/root-read.js';
import {lifecycleEntryMetadata,lifecycleInputMetadata} from './topic-lifecycle-entry-metadata.js';
import {evaluateTopicInactivity} from './topic-lifecycle-policy.js';
const caps=new WeakMap(),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const defer=reason=>{const error=new ArchiveError('TOPIC_ACTIVITY_DEFERRED');error.reason=reason;throw error;};
const projection=(row,fields)=>row?Object.fromEntries(fields.map(key=>[key,row[key]??null])):null;
const topicFields=['id','revision','organizationRevision','lifecycle','redirectTo','activeLayoutGeneration','countVersion','pinKey','protections','layoutJobId','sourceRecordIds'];
const inputFields=['id','contentRevision','removalState','sourcePurged','sourceRecordIds','filterVersion','filterDecision','lastRemovalSequence'];
// The only activity input is the original completed asc metadata projection.
// Canonical eligibility uses a fixed internal metadata projection; physical IDB
// row reads remain budgeted. No Entry/Input body is retained as activity evidence.
export async function captureTopicLifecycleActivity(service,t,row,{policy,now,previousObservedAt,workBudget},scope){
 service.guard.assertProcessingFacts(t,{workBudget});
 const reader=contextScopeTransactionReader(service.store,t,workBudget),facts=[],counts=[];
 const hold=(table,key,value,fields=null)=>{facts.push({table,key,value:structuredClone(fields?projection(value,fields):value??null),fields});return value;};
 const get=async(table,key,fields=null)=>hold(table,key,await reader.get(table,key),fields);
 const meta=await reader.get('meta','thought-read-index:v1:topic:'+row.id),authority=await rootReadAuthority(reader),epoch=(await reader.get('meta','thought-epoch'))?.value||0;
 if(!meta||meta.version!==THOUGHT_TOPIC_INDEX_VERSION||!meta.activeGeneration||meta.buildingGeneration||meta.activeKey!==liveTopicKey(row,epoch,meta.timeRevision||0)||meta.activityAuthority!==authority)defer('incomplete_activity');
 if(!Number.isSafeInteger(meta.activeCount)||meta.activeCount<1||meta.activeCount>1000)defer('activity_resource_limit');
 const descriptorRange=prefix([THOUGHT_TOPIC_STATUS_KEY,'thought_topic_v1:'+meta.activeGeneration+':asc']),placementRange=prefix([row.id,row.activeLayoutGeneration,0]);
 const descriptors=[],placements=[];
 for(const [table,index,range,out] of [['libraryMigrationItems','byStatus',descriptorRange,descriptors],['placements','byTopicOrder',placementRange,placements]]){
  const count=await reader.count(table,index,range);if(count!==meta.activeCount)defer('incomplete_activity');counts.push({table,index,key:range,value:count});
  await reader.scanRange(table,index,range,value=>{out.push(value);hold(table,value.id,value);});
 }
 const sourceIds=new Set([...(row.sourceRecordIds||[]),...scope.flatMap(item=>item.sourceRecordIds||[])]);
 let latest=null;const members=new Map(placements.map(p=>[p.entryId,p]));
 for(const d of descriptors){const p=members.get(d.entryId);if(!p||d.topicId!==row.id||d.layoutGeneration!==row.activeLayoutGeneration||p.lifecycle!=='active'||p.excludedByUser||d.placementRevision!==p.revision||d.sectionId!==p.sectionId||d.rank!==p.rank||d.sectionRank!==p.sectionRank)defer('incomplete_activity');members.delete(d.entryId);
  const entry=lifecycleEntryMetadata(await reader.get('thoughts',d.entryId));
  if(!entry||entry.storageSchema!==2||entry.lifecycle!=='active'||entry.quarantineSealed||entry.revision!==d.entryRevision)defer('incomplete_activity');
  facts.push({table:'thoughts',key:d.entryId,value:entry,metadata:'entry'});
  for(const id of entry.sourceRecordIds||[])sourceIds.add(id);
  const inputIds=new Set(entry.workingInputId?[entry.workingInputId]:[]);
  for(const [table,index] of [['provenance','byOwner'],['dependencies','byTarget']]){
   const range=prefix(['entry',d.entryId]),count=await reader.count(table,index,range);counts.push({table,index,key:range,value:count});
   let seen=0;await reader.scanRange(table,index,range,value=>{seen++;hold(table,value.id,value);if(value.inputId)inputIds.add(value.inputId);for(const id of value.sourceRecordIds||[])sourceIds.add(id);});
   if(seen!==count)defer('incomplete_activity');
  }
  for(const inputId of inputIds){
   const state=await get('inputStates',inputId,inputFields),block=lifecycleInputMetadata(await reader.get('blocks',inputId));
   if(!state||state.removalState!=='active'||state.sourcePurged||!block||block.excluded||block.branchStatus)defer('source_unavailable');
   facts.push({table:'blocks',key:inputId,value:block,metadata:'input'});
   for(const id of state.sourceRecordIds||[])sourceIds.add(id);for(const ref of block.provenance||[])sourceIds.add(ref.sourceRecordId);
  }
  const evaluation=evaluateTopicInactivity({policy,now,previousObservedAt,activityAt:d.activityAt});if(!evaluation.eligible)defer(evaluation.reason);if(!latest||d.activityAt>latest)latest=d.activityAt;}
 if(members.size||latest!==meta.activityAt)defer('incomplete_activity');
 // The original prepared Input scope stays independent of selected Topics.
 for(const item of scope)await get('inputStates',item.inputId,inputFields);
 for(const id of sourceIds){
  const index=await get('recordIndex',id,['id','sourceKey','dedupeKey']);if(!index)defer('source_unavailable');
  for(const key of ['source:'+index.sourceKey,'snapshot:'+index.dedupeKey])if(await get('tombstones',key))defer('source_unavailable');
  const key=IDBKeyRange.only(id),count=await reader.count('records',null,key);if(count!==1)defer('source_unavailable');counts.push({table:'records',key,value:1});
 }
 const root=planRootReadAuthority();let step=root.next();while(!step.done){const value=await get('meta',step.value);step=root.next(value);}
 for(const id of ['gate','thought-library'])await get('meta',id);
 // Same bodyfree negative witnesses the original transition guard reads.
 // Exact key set fences additions as well as changes after its first check.
 for(const keyPrefix of ['memory:topic:','memory:section:']){
  const range=IDBKeyRange.bound(keyPrefix,keyPrefix+'\uffff',false,true),count=await reader.count('meta',null,range);counts.push({table:'meta',key:range,value:count});
  await reader.scanPrimary('meta',keyPrefix,value=>hold('meta',value.id,value));
 }
 if(typeof service.store.libraryOperationInTransaction!=='function')defer('unsupported_activity_owner');
 const indexCap=observeOriginalTopicInvalidation(service.store,t,row.id,meta);
 const cap=Object.freeze({});caps.set(cap,{service,t,indexCap,rowId:row.id,options:{policy,now,previousObservedAt,workBudget},facts,counts});return cap;
}
export function sealTopicLifecycleActivity(service,t,cap,expectedTopic){
 const held=caps.get(cap);if(!held||held.service!==service||held.t!==t||held.rowId!==expectedTopic.id)defer('stale_activity');caps.delete(cap);
 const {facts,counts,options,indexCap}=held;
 for(const id of ['thought-sequence','revision-sequence','backup-data-generation']){const fact=facts.find(f=>f.table==='meta'&&f.key===id);if(!fact)defer('stale_activity');fact.value={...(fact.value||{id,value:0}),value:(fact.value?.value||0)+(id==='thought-sequence'&&typeof service.store.libraryOperationInTransaction==='function'?2:1)};}
 facts.push({table:'topics',key:expectedTopic.id,value:projection({...expectedTopic,countVersion:(expectedTopic.countVersion||0)+(typeof service.store.libraryOperationInTransaction==='function'?1:0)},topicFields),fields:topicFields});
 const current=()=>{service.guard.assertProcessingFacts(t,{workBudget:options.workBudget});return true;};
 registerRepositoryFinalReadFence(service.store.repository,t,{authority:service.guard.finalFactsCapability(t),isCurrent:current,plan:function*(){
  const index=yield {method:'get',table:'meta',key:'thought-read-index:v1:topic:'+held.rowId};if(JSON.stringify(index)!==originalTopicInvalidationResult(service.store,t,indexCap))defer('stale_activity');
  for(const fact of facts){const row=yield {method:'get',table:fact.table,key:fact.key};if(!same(fact.metadata==='entry'?lifecycleEntryMetadata(row):fact.metadata==='input'?lifecycleInputMetadata(row):fact.fields?projection(row,fact.fields):row??null,fact.value))defer('stale_activity');}
  for(const count of counts){const value=yield {method:'count',table:count.table,index:count.index,key:count.key};if(value!==count.value)defer('stale_activity');}return current();
 }});
}
