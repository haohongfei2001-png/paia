import {prefix,same,fail} from './thought-model.js';

export async function nextSequence(t,id='thought-sequence') {
 const seq=(await t.get('meta',id))||{id,value:0};seq.value++;await t.put('meta',seq);return seq.value;
}
export async function journal(store,t,data) {
 // Before-images of generated labels retain their purge fence after human rename/merge.
 if(['topic','section'].includes(data.kind))data={...data,sourceRecordIds:[...new Set([...(data.sourceRecordIds||[]),...(data.before?.sourceRecordIds||[]),...(data.after?.sourceRecordIds||[])])]};
 const at=store.clock(),entityKey=data.kind+':'+data.entityId;
 const previous=data.important?null:await t.edge('revisions','byList',prefix([entityKey]),'prev');
 if(previous&&!previous.important&&previous.actor===data.actor&&previous.reason===data.reason&&same(previous.fieldMask,data.fieldMask)&&same(previous.after,data.before)&&Date.parse(at)-Date.parse(previous.windowStartedAt)<60000) {
  await t.put('revisions',{...previous,after:data.after,at,afterRevision:data.afterRevision,operationId:data.operationId});return previous.id;
 }
 const sequence=await nextSequence(t,'revision-sequence'),id=store.uuid();
 await t.put('revisions',{...data,id,entityKey,documentId:data.documentId||data.entityId,sequence,at,windowStartedAt:at,listKey:[entityKey,sequence],documentList:[data.documentId||data.entityId,sequence]});await store.pruneEntity(t,entityKey);return id;
}
export async function receipt(t,request,digest) {
 const prior=await t.get('operationReceipts',request.operationId);if(!prior)return null;
 if(prior.digest!==digest)fail();return prior.result;
}
export async function saveReceipt(store,t,request,digest,result) {
 await t.put('operationReceipts',{id:request.operationId,namespace:'thought-library',schemaVersion:1,ownerId:result.id||request.id||'library',operationSequence:await nextSequence(t),createdAt:store.clock(),digest,result});
}
