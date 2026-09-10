import {fail,keys,idOK,revisionOK,markHuman,prefix} from './thought-model.js';
import {journal} from './thought-journal.js';
export async function editSection(store,request){
 keys(request,['topicId','sectionId','expectedRevision','title','operationId','restoreRevisionId'],['topicId','sectionId','expectedRevision','title','operationId']);
 if(!idOK(request.topicId)||!idOK(request.sectionId)||!revisionOK(request.expectedRevision)||typeof request.title!=='string'||request.title.length>300)fail();
 return store.operation(request,async t=>{await checkRestore(store,t,request.restoreRevisionId,'section',request.sectionId);const topic=await store.canonicalTopic(t,request.topicId);if(topic.id!==request.topicId)fail();const row=await t.get('sections',JSON.stringify([topic.id,topic.activeLayoutGeneration,request.sectionId]));if(!row||row.lifecycle!=='active'||row.redirectTo)fail();if(row.revision!==request.expectedRevision)return {conflict:true};const before=structuredClone(row);row.title=request.title;row.revision++;markHuman(row,'title',request.operationId,store.clock());topic.organizationRevision++;await t.put('sections',row);await t.put('topics',topic);await journal(store,t,{kind:'section',entityId:row.sectionId,documentId:topic.id,before,after:row,fieldMask:['title'],actor:'user',reason:request.restoreRevisionId?'restore':store.libraryDocumentMode?'rename':'edit',important:store.libraryDocumentMode||!!request.restoreRevisionId,operationId:request.operationId,baseRevision:request.expectedRevision,afterRevision:row.revision,sourceRecordIds:[]});return {id:row.sectionId,revision:row.revision};});
}
export async function checkRestore(store,t,id,kind,entityId){if(!id)return;const r=await t.get('revisions',id);if(!r||r.kind!==kind||r.entityId!==entityId||!await store.sourcePresent(t,r.sourceRecordIds))fail();}
export async function restoreOrganization(store,request,saved){
 const {id,expectedRevision,operationId,side='before'}=request,value=saved[side];
 if(saved.kind==='topic'){if(!value)fail();return store.renameTopic({id:saved.entityId,name:value.name,expectedRevision,operationId,restoreRevisionId:id});}
 if(saved.kind==='section'){if(!value)fail();return editSection(store,{topicId:saved.documentId,sectionId:saved.entityId,title:value.title,expectedRevision,operationId,restoreRevisionId:id});}
 if(saved.kind==='placement'){
  const p=value||saved.after;if(!p)fail();
  return store.placeEntry({entryId:p.entryId,topicId:p.topicId,sectionId:p.sectionId,rank:p.rank,remove:!value||p.lifecycle==='removed',expectedEntryRevision:request.expectedEntryRevision,expectedTopicRevision:request.expectedTopicRevision,expectedPlacementRevision:expectedRevision,operationId,restoreRevisionId:id});
 }
 fail();
}
