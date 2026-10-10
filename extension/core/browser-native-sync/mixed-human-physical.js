import {requireOriginalCurrentMixedGroupScope} from './group-checkpoint-scope.js';
import {physical} from './human-library-journal.js';
import {protocolPhysicalId} from './physical-key.js';
import {equal,exact,count,hash,fail} from './value.js';

const refuse=()=>fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
// Pure allocation description for the original Topic/Entry/Section/placement
// owners. The caller supplies its authenticated initial chronology or completed
// import-prefix + original local tail. This computation grants no native cut,
// scope, write, budget or export capability and never calls a domain writer.
export function prepareMixedHumanPhysicalExpectation(groups,localDeviceId){
 const entries=new Map(),topics=new Map(),sections=new Map(),placements=new Map(),receipts=new Map();let sequence=0;
 for(const group of groups){
  if(group.type!=='humanLibraryCommit')continue;
  const descriptor=group.prepared.descriptor.value,members=group.prepared.members;
  if(!['topic','entry','section','placement'].includes(descriptor.kind))fail('BNS_GROUP_OWNER_UNSUPPORTED');
  const local=group.operations.every(op=>op.deviceId===localDeviceId),member=type=>members.find(op=>op.value.entityType===type)?.value.after;
  let result;
  if(descriptor.kind==='topic'){
   const topic=member('topic'),section=member('section');if(!topic||!section||topics.has(topic.id))refuse();
   topics.set(topic.id,{row:topic,negativeUpdatedSequence:-++sequence});sections.set(section.id,section);result={id:topic.id,sectionId:section.sectionId,revision:topic.revision};
  }else if(descriptor.kind==='entry'){
   const entry=member('entry');if(!entry||entries.has(entry.id))refuse();const tick=++sequence;
   entries.set(entry.id,{createdSequence:tick,updatedSequence:tick,negativeUpdatedSequence:-tick});result={id:entry.id,revision:entry.revision};
  }else if(descriptor.kind==='section'){
   const section=member('section'),topic=member('topic'),prior=topics.get(descriptor.request.topicId);
   if(!section||!topic||!prior||topic.id!==descriptor.request.topicId||section.topicId!==topic.id||section.layoutGeneration!==topic.activeLayoutGeneration||section.id!==JSON.stringify([topic.id,topic.activeLayoutGeneration,section.sectionId])||sections.has(section.id))refuse();
   // Original createSection touches the requested Topic once, then the common
   // operation receipt advances the second tick. Section has no own sequence.
   prior.negativeUpdatedSequence=-++sequence;sections.set(section.id,section);
   result={id:section.id,sectionId:section.sectionId,revision:section.revision,topicRevision:topic.organizationRevision};
  }else{
   const entry=member('entry'),placement=member('placement'),target=descriptor.request.topicId;
   if(!entry||!placement||!entries.has(entry.id)||placement.entryId!==entry.id||placement.topicId!==target||!topics.has(target)||!sections.has(JSON.stringify([placement.topicId,placement.layoutGeneration,placement.sectionId])))refuse();
   placements.set(placement.id,placement);
   // Original nextPlacements ID ordering includes every layout edge. The target is
   // deliberately touched again below; a Set must not erase its second tick.
   const edges=[...placements.values()].filter(row=>row.entryId===entry.id).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
   for(const edge of edges){const topic=topics.get(edge.topicId);if(!topic)refuse();if(topic.row.activeLayoutGeneration===edge.layoutGeneration)topic.negativeUpdatedSequence=-++sequence;}
   topics.get(target).negativeUpdatedSequence=-++sequence;
   const topic=members.find(op=>op.value.entityType==='topic'&&op.value.after.id===target)?.value.after;if(!topic)refuse();
   result={id:entry.id,revision:entry.revision,placementRevision:placement.revision,topicRevision:topic.organizationRevision};
  }
  for(const op of members){const {entityType:type,after}=op.value;
   if(type==='topic'){const expected=topics.get(after.id);if(!expected||local&&after.negativeUpdatedSequence!==expected.negativeUpdatedSequence)refuse();expected.row=after;}
   if(type==='entry'&&(!entries.has(after.id)||local&&!equal(physical('entry',after),entries.get(after.id))))refuse();
   // These creation/placement owners retain the untouched Topic baseline history.
   // Its snapshot precedes the first touch and stays zero through identity
   // rehash members; foreign wire sequence cannot invent a touched snapshot.
   if(type==='history'&&after.kind==='topic'&&(after.before!==null||after.after?.negativeUpdatedSequence!==0))refuse();
  }
  const clocks=descriptor.events.filter(event=>event.role==='domain'&&event.kind==='clock'),createdAt=clocks.at(-1)?.value;
  if(!createdAt||receipts.has(descriptor.domainOperationId))refuse();
  receipts.set(descriptor.domainOperationId,{id:descriptor.domainOperationId,namespace:'thought-library',schemaVersion:1,ownerId:result.id,operationSequence:++sequence,createdAt,digest:descriptor.ownerRequestDigest,result});
 }
 return {entries,topics,receipts,sequence};
}

// Synchronous physical assertion only, consumed by the original mixed Scope.
// Foreign imported allocations are obtained from its opaque authenticated
// prefix proof, never inferred from mutually editable current rows/mappings.
export function assertMixedHumanPhysicalExpectation(core,scope,plan,rows,meta,expected,history,namespace){
 requireOriginalCurrentMixedGroupScope(core,scope,plan);
 const byId=new Map(meta.map(row=>[row.id,row]));if(byId.size!==meta.length||rows.thoughts.length!==expected.entries.size||rows.topics.length!==expected.topics.size||!equal(byId.get('thought-sequence'),{id:'thought-sequence',value:expected.sequence}))refuse();
 for(const row of rows.thoughts)if(!equal(physical('entry',row),expected.entries.get(row.id)))refuse();
 for(const row of rows.topics)if(!equal(physical('topic',row),{negativeUpdatedSequence:expected.topics.get(row.id)?.negativeUpdatedSequence}))refuse();
 for(const row of rows.revisions)if(row.kind==='topic'&&(row.before!==null||row.after?.negativeUpdatedSequence!==0))refuse();
 const operations=plan.groups.flatMap(group=>group.operations),key=(id)=>protocolPhysicalId(core.prefix,namespace,'humanMapping',[id]);
 for(const head of plan.heads)if(head.type==='humanLibraryMember'){
  const op=operations.find(op=>op.revisionId===head.revisions[0]);if(head.revisions.length!==1||!op)refuse();const {entityType:type,after}=op.value;
  let local={};if(type==='entry')local=expected.entries.get(after.id);else if(type==='topic')local={negativeUpdatedSequence:expected.topics.get(after.id)?.negativeUpdatedSequence};else if(type==='history'){const actual=rows.revisions.find(row=>row.id===after.id);if(!actual||actual.sequence!==history.get(after.id))refuse();local=physical(type,actual);}
  if(!equal(byId.get(key(head.entityId)),{id:key(head.entityId),type,local,wire:physical(type,after),revisionId:op.revisionId}))refuse();
 }
 const working=plan.groups.filter(group=>group.type==='inputWorkingCommit'&&group.prepared.descriptor.deviceId===core.deviceId),humanIds=new Set(),context=operations.filter(op=>op.deviceId===core.deviceId&&op.actor==='user'&&['contextItem','contextRulesItem','contextNowItem','contextDesired'].includes(op.type));let localWorking=0,localContext=0;
 if(rows.operationReceipts.length!==expected.receipts.size+working.length+context.length||new Set(rows.operationReceipts.map(row=>row.id)).size!==rows.operationReceipts.length)refuse();
 for(const row of rows.operationReceipts){
  if(row.namespace==='thought-library'){const receipt=expected.receipts.get(row.id);if(!receipt||humanIds.has(row.id)||!equal(row,receipt))refuse();humanIds.add(row.id);}
  else if(row.namespace==='working-input'){
   const group=working.find(group=>group.prepared.descriptor.entityId===row.id),input=group?.prepared.members.find(op=>op.value.entityType==='input')?.value.entity;
   // Original local Working request digest remains a local retry witness; it
   // cannot be reconstructed from the portable commit. Preserve its original
   // exact seven-key boundary and do not fabricate imported retries.
   if(!group||!input||!exact(row,['id','namespace','schemaVersion','ownerId','createdAt','digest','result'])||row.schemaVersion!==1||row.ownerId!==group.prepared.descriptor.value.documentId||!Number.isFinite(Date.parse(row.createdAt))||!hash(row.digest)||!equal(row.result,{ok:true}))refuse();localWorking++;
  }else if(row.namespace==='context-cards'){
   const op=context.find(op=>row.id==='context:'+op.operationId);if(!op)refuse();const value=op.value,result=op.type==='contextDesired'?{ok:true,key:value.id,revision:value.revision,enabled:value.enabled}:{ok:true,itemId:value.id,revision:value.revision,lifecycle:value.lifecycle,deletedBy:value.deletedBy};
   // Context command ID is the original Core operation ID. Its exact local
   // command hash/clock are not portable; bind its existing result and epoch
   // without importing or forging a UI retry receipt on a foreign restore.
   if(!exact(row,['id','namespace','schemaVersion','ownerId','createdAt','digest','epoch','result'])||row.schemaVersion!==1||row.ownerId!==value.id||row.epoch!==((byId.get('recovery-restore-epoch')?.value)||'initial')||!Number.isFinite(Date.parse(row.createdAt))||!hash(row.digest)||!equal(row.result,result))refuse();localContext++;
  }else refuse();
 }
 if(humanIds.size!==expected.receipts.size||localWorking!==working.length||localContext!==context.length||!count(expected.sequence))refuse();return true;
}
