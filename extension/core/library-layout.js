import {fail,keys,idOK,revisionOK,prefix,markHuman,rankBetween} from './thought-model.js';
import {journal,nextSequence} from './thought-journal.js';
import {queueSearch} from './library-search.js';
const sectionKey=(t,g,s)=>JSON.stringify([t,g,s]);
const placementKey=(t,g,e)=>JSON.stringify([t,g,e]);
export async function startLayout(store,r,operationRequest=r){
 keys(r,['kind','topicId','survivorId','sectionId','targetSectionId','otherSectionId','entryId','otherEntryId','expectedTopicRevision','expectedSurvivorRevision','operationId'],['kind','topicId','expectedTopicRevision','operationId']);
 if(!['topic_merge','section_merge','section_order','entry_order'].includes(r.kind)||!idOK(r.topicId)||!revisionOK(r.expectedTopicRevision))fail();
 return store.operation(operationRequest,async t=>{
  const source=await t.get('topics',r.topicId),target=r.kind==='topic_merge'?await t.get('topics',r.survivorId):source;
  if(!source||!target||source.redirectTo||target.redirectTo||r.kind==='topic_merge'&&source.id===target.id)fail();
  if(source.organizationRevision!==r.expectedTopicRevision||r.kind==='topic_merge'&&target.organizationRevision!==r.expectedSurvivorRevision||source.layoutJobId||target.layoutJobId)return {conflict:true};
  let a,b,aPosition,bPosition;if(r.kind==='entry_order'){a=await t.get('placements',placementKey(source.id,source.activeLayoutGeneration,r.entryId));b=await t.get('placements',placementKey(source.id,source.activeLayoutGeneration,r.otherEntryId));if(!a||!b||a.id===b.id||a.lifecycle!=='active'||b.lifecycle!=='active'||a.sectionId!==b.sectionId)fail();const start=[source.id,source.activeLayoutGeneration,a.sectionId,0];aPosition=await t.count('placements','bySectionOrder',IDBKeyRange.bound(start,[...start,a.rank,a.entryId]));bPosition=await t.count('placements','bySectionOrder',IDBKeyRange.bound(start,[...start,b.rank,b.entryId]));}else if(r.kind!=='topic_merge'){a=await t.get('sections',sectionKey(source.id,source.activeLayoutGeneration,r.sectionId));b=await t.get('sections',sectionKey(source.id,source.activeLayoutGeneration,r.targetSectionId||r.otherSectionId));if(!a||!b||a.sectionId===b.sectionId||a.lifecycle!=='active'||b.lifecycle!=='active'||r.kind==='section_merge'&&a.sectionId===source.defaultSectionId)fail();if(r.kind==='section_order'){const start=[source.id,source.activeLayoutGeneration,0];aPosition=await t.count('sections','byTopicOrder',IDBKeyRange.bound(start,[...start,a.rank,a.sectionId]));bPosition=await t.count('sections','byTopicOrder',IDBKeyRange.bound(start,[...start,b.rank,b.sectionId]));}}
  const id=store.uuid(),sequence=await nextSequence(t),job={id,kind:'library_layout',stateKey:0,state:'running',sequence,phase:'target_sections',cursor:null,operationId:r.operationId,layoutKind:r.kind,sourceId:source.id,targetId:target.id,sourceGeneration:source.activeLayoutGeneration,targetGeneration:target.activeLayoutGeneration,newGeneration:(target.layoutSequence||target.activeLayoutGeneration)+1,sourceRevision:source.organizationRevision,targetRevision:target.organizationRevision,aPosition:aPosition||0,bPosition:bPosition||0,orderSequence:0,sectionId:r.sectionId||null,targetSectionId:r.kind==='entry_order'?a.sectionId:r.targetSectionId||r.otherSectionId||null,aRank:a?.rank||null,bRank:b?.rank||null,sourceDefault:source.defaultSectionId,targetDefault:target.defaultSectionId,sourceRecordIds:[]};
  source.layoutJobId=id;target.layoutJobId=id;target.layoutSequence=job.newGeneration;await t.put('topics',source);await t.put('topics',target);await t.put('organizerJobs',job);return {id:target.id,jobId:id};
 });
}
export async function layoutBatch(store){
 await store.finishFoundation();return store.libraryMaintenanceWrite(async t=>{
  const job=await t.edge('organizerJobs','byMaintenance',prefix(['library_layout',0]));if(!job)return {pending:false};
  const source=await t.get('topics',job.sourceId),target=await t.get('topics',job.targetId);
  if(source?.layoutJobId!==job.id||target?.layoutJobId!==job.id||source.organizationRevision!==job.sourceRevision||target.organizationRevision!==job.targetRevision)fail();
  const sourcePhase=job.phase.startsWith('source'),sectionPhase=job.phase.endsWith('sections'),owner=sourcePhase?source:target,generation=sourcePhase?job.sourceGeneration:job.targetGeneration;
  if(job.phase!=='activate'){
   const table=sectionPhase?'sections':'placements',page=await t.rangePage(table,'byTopicOrder',prefix([owner.id,generation]),job.cursor,100);
   for(const {value:raw}of page.rows){
    const old=sectionPhase&&store.safeOrganization?await store.safeOrganization(t,'section',raw):raw;
    if(sectionPhase){
     if(sourcePhase&&old.sectionId===job.sourceDefault)continue;
     const row={...old,id:sectionKey(target.id,job.newGeneration,old.sectionId),topicId:target.id,layoutGeneration:job.newGeneration,revision:old.revision+1};
     if(sourcePhase)row.isDefault=false;
     if(job.layoutKind==='section_merge'&&row.sectionId===job.sectionId){row.lifecycle='merged';row.activeKey=1;row.redirectTo=job.targetSectionId;}
     if(job.layoutKind==='section_order'&&row.lifecycle==='active'){job.orderSequence++;const position=job.orderSequence===job.aPosition?job.bPosition:job.orderSequence===job.bPosition?job.aPosition:job.orderSequence;row.rank=String(position*1024).padStart(12,'0');}
     markHuman(row,job.layoutKind==='section_order'?'order':'organization',job.operationId,store.clock());await t.put('sections',row);await queueSearch(t,'section',row);
     await journal(store,t,{kind:'section',entityId:row.sectionId,documentId:target.id,before:old,after:row,fieldMask:['organization','rank'],actor:'user',reason:job.layoutKind.endsWith('_order')?'reorder':'merge',important:true,operationId:job.operationId,layoutJobId:job.id,baseRevision:old.revision,afterRevision:row.revision,sourceRecordIds:[]});
    }else{
     const id=placementKey(target.id,job.newGeneration,old.entryId);if(sourcePhase&&await t.get('placements',id))continue; // Survivor membership, including negative intent, wins.
     let sectionId=old.sectionId;if(sourcePhase&&sectionId===job.sourceDefault)sectionId=job.targetDefault;if(job.layoutKind==='section_merge'&&sectionId===job.sectionId)sectionId=job.targetSectionId;
     const section=await t.get('sections',sectionKey(target.id,job.newGeneration,sectionId));if(!section)fail();
     const row={...old,id,topicId:target.id,layoutGeneration:job.newGeneration,sectionId,sectionRank:section.rank,revision:old.revision+1,membershipAuthorship:'user',sectionProtection:true,orderProtection:true};
     if(job.layoutKind==='entry_order'&&row.sectionId===job.targetSectionId&&row.lifecycle==='active'){job.orderSequence++;const position=job.orderSequence===job.aPosition?job.bPosition:job.orderSequence===job.bPosition?job.aPosition:job.orderSequence;row.rank=String(position*1024).padStart(12,'0');}
     await t.put('placements',row);
     const e=await t.get('thoughts',row.entryId);await journal(store,t,{kind:'placement',entityId:id,documentId:target.id,before:old,after:row,fieldMask:['membership','section','order'],actor:'user',reason:job.layoutKind.endsWith('_order')?'reorder':'merge',important:true,operationId:job.operationId,layoutJobId:job.id,baseRevision:old.revision,afterRevision:row.revision,sourceRecordIds:e?.sourceRecordIds||[]});
    }
   }
   job.cursor=page.next;if(!page.next){const phases=job.layoutKind==='topic_merge'?['target_sections','source_sections','target_placements','source_placements','activate']:['target_sections','target_placements','activate'];job.phase=phases[phases.indexOf(job.phase)+1];job.cursor=null;}
   await t.put('organizerJobs',job);return {pending:true,jobId:job.id};
  }
  const beforeTarget=structuredClone(target),beforeSource=structuredClone(source);
  target.activeLayoutGeneration=job.newGeneration;target.organizationRevision++;target.revision++;delete target.layoutJobId;markHuman(target,'organization',job.operationId,store.clock());await store.touchTopic(t,target);await queueSearch(t,'topic',target);
  if(source.id!==target.id){source.redirectTo=target.id;source.lifecycle='merged';source.activeKey=1;source.organizationRevision++;source.revision++;delete source.layoutJobId;markHuman(source,'organization',job.operationId,store.clock());await t.put('topics',source);await queueSearch(t,'topic',source);await journal(store,t,{kind:'topic',entityId:source.id,before:beforeSource,after:source,fieldMask:['redirect','organization'],actor:'user',reason:job.layoutKind.endsWith('_order')?'reorder':'merge',important:true,operationId:job.operationId,layoutJobId:job.id,baseRevision:beforeSource.revision,afterRevision:source.revision,sourceRecordIds:[]});}
  await journal(store,t,{kind:'topic',entityId:target.id,before:beforeTarget,after:target,fieldMask:['organization'],actor:'user',reason:job.layoutKind.endsWith('_order')?'reorder':'merge',important:true,operationId:job.operationId,layoutJobId:job.id,baseRevision:beforeTarget.revision,afterRevision:target.revision,sourceRecordIds:[]});
  job.state='complete';job.stateKey=1;job.completedTargetRevision=target.organizationRevision;job.completedSourceRevision=source.id===target.id?target.organizationRevision:source.organizationRevision;await t.put('organizerJobs',job);return {pending:true,jobId:job.id};
 });
}
export async function reorderPlacement(store,r){
 keys(r,['topicId','entryId','otherEntryId','expectedTopicRevision','operationId'],['topicId','entryId','otherEntryId','expectedTopicRevision','operationId']);if(!idOK(r.entryId)||!idOK(r.otherEntryId)||r.entryId===r.otherEntryId||!revisionOK(r.expectedTopicRevision))fail();
 const prior=await store.priorOperation(r);if(prior)return prior;const pair=await store.run(()=>store.repository.transaction(false,async t=>{const topic=await t.get('topics',r.topicId);if(!topic)fail();const a=await t.get('placements',placementKey(topic.id,topic.activeLayoutGeneration,r.entryId)),b=await t.get('placements',placementKey(topic.id,topic.activeLayoutGeneration,r.otherEntryId));const tied=a&&b&&(await t.count('placements','bySectionOrder',prefix([topic.id,topic.activeLayoutGeneration,a.sectionId,0,a.rank]))>1||await t.count('placements','bySectionOrder',prefix([topic.id,topic.activeLayoutGeneration,b.sectionId,0,b.rank]))>1);return {tied};}));if(pair.tied)return startLayout(store,{kind:'entry_order',topicId:r.topicId,entryId:r.entryId,otherEntryId:r.otherEntryId,expectedTopicRevision:r.expectedTopicRevision,operationId:r.operationId},r);
 return store.operation(r,async t=>{const topic=await t.get('topics',r.topicId);if(!topic||topic.redirectTo)fail();if(topic.organizationRevision!==r.expectedTopicRevision)return {conflict:true};const a=await t.get('placements',placementKey(topic.id,topic.activeLayoutGeneration,r.entryId)),b=await t.get('placements',placementKey(topic.id,topic.activeLayoutGeneration,r.otherEntryId));if(!a||!b||a.lifecycle!=='active'||b.lifecycle!=='active'||a.sectionId!==b.sectionId)fail();
  // Stable key ties are legal. Generate an explicit distinct pair when imported ranks tie.
  const ranks=a.rank===b.rank?[rankBetween(null,a.rank),rankBetween(a.rank,null)]:[b.rank,a.rank];
  for(const [i,row]of [a,b].entries()){const before=structuredClone(row);row.rank=ranks[i];row.revision++;row.orderProtection=true;row.membershipAuthorship='user';await t.put('placements',row);const e=await t.get('thoughts',row.entryId);if(e){markHuman(e,'order',r.operationId,store.clock());e.organizationRevision++;e.revision++;await t.put('thoughts',e);}await journal(store,t,{kind:'placement',entityId:row.id,documentId:topic.id,before,after:row,fieldMask:['order'],actor:'user',reason:'reorder',important:true,operationId:r.operationId,baseRevision:before.revision,afterRevision:row.revision,sourceRecordIds:e?.sourceRecordIds||[]});}
  topic.organizationRevision++;await t.put('topics',topic);return {id:r.entryId,topicRevision:topic.organizationRevision};
 });
}
