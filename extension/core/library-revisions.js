import {fail,idOK,keys,revisionOK,prefix,markHuman} from './thought-model.js';
import {journal} from './thought-journal.js';
import {queueSearch} from './library-search.js';
export async function libraryRevisions(store,{kind,entityId=null,documentId=null,cursor=null,limit=50}={}){
 if(!['library_entry','topic','section','placement'].includes(kind)||!idOK(entityId||documentId)||!Number.isInteger(limit)||limit<1||limit>100)fail();
 const scope=JSON.stringify([kind,entityId,documentId]);if(cursor&&cursor.scope!==scope)fail();await store.finishFoundation();
 return store.run(()=>store.repository.transaction(false,async t=>{const index=entityId?'byEntitySequence':'byDocumentList',p=entityId?`${kind}:${entityId}`:documentId,base=prefix([p]);const range=cursor?IDBKeyRange.bound(base.lower,cursor.key,false,true):base;
  const page=await new Promise((resolve,reject)=>{const rows=[],r=t.tx.objectStore('revisions').index(index).openCursor(range,'prev');r.onerror=()=>reject(new Error('STORAGE_FAILED'));r.onsuccess=()=>{const c=r.result;if(!c||rows.length===limit){resolve({rows,next:c?rows.at(-1).key:null});return;}rows.push({key:c.key,value:c.value});t.metrics.reads++;c.continue();};});const items=[];for(const {value:r}of page.rows){if(r.kind!==kind||!await store.sourcePresent(t,r.sourceRecordIds))continue;if(kind==='library_entry'){const owner=await t.get('thoughts',r.entityId);if(!owner||owner.quarantineSealed||owner.lifecycle==='quarantined')continue;}items.push(r);}return {items,nextCursor:page.next?{scope,key:page.next}:null};
 }));
}
export async function restoreLayout(store,request,saved){
 const jobId=saved.layoutJobId||saved.before?.layoutJobId;if(!jobId)fail();
 return store.operation(request,async t=>{const liveRevision=await t.get('revisions',saved.id);if(!liveRevision||!await store.sourcePresent(t,liveRevision.sourceRecordIds))fail();const job=await t.get('organizerJobs',jobId);if(!job||job.state!=='complete')fail();const target=await t.get('topics',job.targetId),source=await t.get('topics',job.sourceId);if(target.layoutJobId||source.layoutJobId)return {conflict:true};const beforeSide=(request.side||'before')==='before';const selected=saved.kind==='topic'?(saved.entityId===source.id?source:target):saved.kind==='section'?await t.get('sections',JSON.stringify([target.id,target.activeLayoutGeneration,saved.entityId])):await t.get('placements',JSON.stringify([target.id,target.activeLayoutGeneration,saved.after.entryId]));if(!selected||selected.revision!==request.expectedRevision)return {conflict:true};
  if(target.organizationRevision!==(job.restored?job.undoTargetRevision:job.completedTargetRevision)||source.id!==target.id&&source.organizationRevision!==(job.restored?job.undoSourceRevision:job.completedSourceRevision))return {conflict:true};
  if(beforeSide===!!job.restored)return {id:target.id,revision:target.revision};
  for(const row of source.id===target.id?[target]:[source,target]){const before=structuredClone(row);if(row.id===target.id)row.activeLayoutGeneration=beforeSide?job.targetGeneration:job.newGeneration;else{row.activeLayoutGeneration=job.sourceGeneration;row.lifecycle=beforeSide?'active':'merged';row.activeKey=beforeSide?0:1;if(beforeSide)delete row.redirectTo;else row.redirectTo=target.id;}row.revision++;row.organizationRevision++;markHuman(row,'organization',request.operationId,store.clock(),'restore');await store.touchTopic(t,row);await queueSearch(t,'topic',row);await journal(store,t,{kind:'topic',entityId:row.id,before,after:row,fieldMask:['organization','redirect'],actor:'user',reason:'restore',important:true,layoutJobId:job.id,operationId:request.operationId,baseRevision:before.revision,afterRevision:row.revision,sourceRecordIds:[]});}
  job.restored=beforeSide;if(beforeSide){job.undoTargetRevision=target.organizationRevision;job.undoSourceRevision=source.organizationRevision;}else{job.completedTargetRevision=target.organizationRevision;job.completedSourceRevision=source.organizationRevision;}await t.put('organizerJobs',job);return {id:target.id,revision:target.revision};
 });
}
export async function restoreLibraryRevision(store,r){
 keys(r,['id','side','expectedRevision','expectedEntryRevision','expectedTopicRevision','operationId'],['id','expectedRevision','operationId']);if(!idOK(r.id)||!revisionOK(r.expectedRevision)||r.side!==undefined&&!['before','after'].includes(r.side))fail();
 const saved=await store.run(()=>store.repository.transaction(false,async t=>{const row=await t.get('revisions',r.id);if(!row||!await store.sourcePresent(t,row.sourceRecordIds))fail();return row;})),value=saved[r.side||'before'];
 if(saved.layoutJobId||saved.before?.layoutJobId)return restoreLayout(store,r,saved);
 if(saved.kind==='library_entry'){
  const e=await store.entry(saved.entityId);if(e.revision!==r.expectedRevision)return {conflict:true};if(!value)fail();
  if(saved.fieldMask.includes('lifecycle')&&value.lifecycle!==e.lifecycle)return value.lifecycle==='removed'?store.removeEntry({id:e.id,expectedRevision:r.expectedRevision,operationId:r.operationId}):store.restoreEntry({id:e.id,expectedRevision:r.expectedRevision,operationId:r.operationId});
  return LibraryRestoreFields(store,r,saved);
 }
 if(saved.kind==='topic'){
  if(!value)fail();const fields={};for(const f of saved.fieldMask){if(f==='name'||f==='summary')fields[f]=value[f];if(f==='pinned')fields.pinned=value.pinKey===0;}if(!Object.keys(fields).length)fail();
  return store.editTopic({id:saved.entityId,expectedRevision:r.expectedRevision,changes:fields,operationId:r.operationId,restoreRevisionId:saved.id});
 }
 if(saved.kind==='section'){
  if(!value)fail();const topic=await store.topic(saved.documentId);return store.editSection({topicId:topic.id,sectionId:saved.entityId,expectedRevision:r.expectedRevision,title:value.title,operationId:r.operationId,restoreRevisionId:saved.id});
 }
 if(saved.kind==='placement'){
  const p=value||saved.after;if(!p)fail();const topic=await store.topic(p.topicId),e=await store.entry(p.entryId);return store.placeEntry({topicId:topic.id,entryId:e.id,sectionId:p.sectionId,rank:p.rank,remove:!value||value.lifecycle==='removed',expectedEntryRevision:r.expectedEntryRevision,expectedTopicRevision:r.expectedTopicRevision,expectedPlacementRevision:r.expectedRevision,operationId:r.operationId,restoreRevisionId:saved.id});
 }
 fail();
}
async function LibraryRestoreFields(store,r,saved){return store.restoreLibraryRevision({id:r.id,side:r.side,expectedRevision:r.expectedRevision,operationId:r.operationId});}
