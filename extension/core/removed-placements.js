import {keys,idOK,revisionOK,fail,prefix} from './thought-model.js';
function placementKey(value){if(typeof value!=='string'||value.length>2500)return false;try{const p=JSON.parse(value);return Array.isArray(p)&&p.length===3&&idOK(p[0])&&revisionOK(p[1])&&p[1]>0&&idOK(p[2])&&JSON.stringify(p)===value;}catch{return false;}}
const epoch=async t=>(await t.get('meta','recovery-restore-epoch'))?.value??'initial';
async function qualified(s,t,p){
 if(!p||p.lifecycle!=='removed'||p.removedWithTopicOperationId)return null;
 const topic=await t.get('topics',p.topicId),entry=await t.get('thoughts',p.entryId);
 if(!topic||topic.lifecycle!=='active'||topic.redirectTo||topic.layoutJobId||topic.activeLayoutGeneration!==p.layoutGeneration||!entry||entry.storageSchema!==2||entry.lifecycle!=='active')return null;
 const section=await t.get('sections',JSON.stringify([p.topicId,p.layoutGeneration,p.sectionId]));
 if(!section||section.lifecycle!=='active'||section.redirectTo)return null;
 if(!await s.sourcePresent(t,entry.sourceRecordIds))return null;
 const readable=await s.readableEntry(t,p.entryId);
 const last=await t.edge('revisions','byEntitySequence',prefix(['placement:'+p.id]),'prev');
 if(!last||last.kind!=='placement'||last.reason!=='remove'||last.actor!=='user'||last.layoutJobId||last.entityId!==p.id||last.documentId!==p.topicId||last.before?.lifecycle!=='active'||last.after?.lifecycle!=='removed'||last.after.revision!==p.revision||last.before.sectionId!==p.sectionId||last.after.sectionId!==p.sectionId||last.before.entryId!==p.entryId||last.before.topicId!==p.topicId||!await s.sourcePresent(t,last.sourceRecordIds))return null;
 return {topic,entry,section,history:last,readable};
}
export async function removedPlacements(s,options={}){
 keys(options,['cursor','limit']);const {cursor=null,limit=40}=options;if(!Number.isInteger(limit)||limit<1||limit>100)fail();
 if(cursor!==null){keys(cursor,['version','key','generation','recoveryEpoch'],['version','key','generation','recoveryEpoch']);if(cursor.version!==1||!placementKey(cursor.key)||!revisionOK(cursor.generation)||!idOK(cursor.recoveryEpoch))fail();}
 await s.finishFoundation();return s.run(()=>s.repository.transaction(false,async t=>{
 const generation=(await t.get('meta','backup-data-generation'))?.value??0,recoveryEpoch=await epoch(t);
 if(cursor&&(cursor.generation!==generation||cursor.recoveryEpoch!==recoveryEpoch))return {items:[],nextCursor:null,cursorInvalid:true};
 const page=await t.primaryRangePage('placements',{after:cursor?.key??null,limit}),items=[];
 for(const {value:p}of page.rows){const q=await qualified(s,t,p);if(!q)continue;items.push({id:p.id,topicId:p.topicId,entryId:p.entryId,label:(q.readable.title||q.readable.thoughtText||'').slice(0,80),topicName:q.topic.name,sectionName:q.section.title||'',revision:p.revision,entryRevision:q.entry.revision,topicRevision:q.topic.organizationRevision,historyId:q.history.id,recoveryEpoch});}
 return {items,nextCursor:page.next?{version:1,key:page.next,generation,recoveryEpoch}:null};
 }));
}
export async function restoreRemovedPlacement(s,r){
 keys(r,['id','historyId','recoveryEpoch','expectedRevision','expectedEntryRevision','expectedTopicRevision','operationId'],['id','historyId','recoveryEpoch','expectedRevision','expectedEntryRevision','expectedTopicRevision','operationId']);
 if(!placementKey(r.id)||!idOK(r.historyId)||!idOK(r.recoveryEpoch)||![r.expectedRevision,r.expectedEntryRevision,r.expectedTopicRevision].every(revisionOK))fail();
 return s.operation(r,async t=>{
 if(await epoch(t)!==r.recoveryEpoch)return {conflict:true};
 const p=await t.get('placements',r.id),q=await qualified(s,t,p);if(!q||q.history.id!==r.historyId)return {conflict:true};
 if(p.revision!==r.expectedRevision||q.entry.revision!==r.expectedEntryRevision||q.topic.organizationRevision!==r.expectedTopicRevision)return {conflict:true};
 return s.placeEntryInTransaction(t,{topicId:p.topicId,entryId:p.entryId,sectionId:p.sectionId,rank:q.history.before.rank,expectedEntryRevision:r.expectedEntryRevision,expectedTopicRevision:r.expectedTopicRevision,expectedPlacementRevision:r.expectedRevision,operationId:r.operationId,restoreRevisionId:q.history.id});
 });
}
