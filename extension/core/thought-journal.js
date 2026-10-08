import {humanClock,humanUuid} from './browser-native-sync/human-library-allocation.js';
import {prefix,same,fail} from './thought-model.js';

export async function nextSequence(t,id='thought-sequence') {
 const seq=(await t.get('meta',id))||{id,value:0};seq.value++;await t.put('meta',seq);return seq.value;
}
// One domain rule for both ordinary writes and a future qualified graph plan.
// This is a pure computation, not a transaction capability or write authority.
export function planJournalRevision(data,previous,at) {
 const entityKey=data.kind+':'+data.entityId;
 if(!data.important&&previous&&!previous.important&&previous.actor===data.actor&&previous.reason===data.reason&&same(previous.fieldMask,data.fieldMask)&&same(previous.after,data.before)&&Date.parse(at)-Date.parse(previous.windowStartedAt)<60000) {
  return {coalesced:true,entityKey,row:{...previous,after:data.after,at,afterRevision:data.afterRevision,operationId:data.operationId}};
 }
 return {coalesced:false,entityKey,row:{...data,entityKey,documentId:data.documentId||data.entityId,at,windowStartedAt:at}};
}
export async function journal(store,t,data) {
 // Before-images of generated labels retain their purge fence after human rename/merge.
 if(['topic','section'].includes(data.kind))data={...data,sourceRecordIds:[...new Set([...(data.sourceRecordIds||[]),...(data.before?.sourceRecordIds||[]),...(data.after?.sourceRecordIds||[])])]};
 const at=humanClock(store,t),entityKey=data.kind+':'+data.entityId;
 const previous=data.important?null:await t.edge('revisions','byList',prefix([entityKey]),'prev');
 const plan=planJournalRevision(data,previous,at);
 if(plan.coalesced){await t.put('revisions',plan.row);return plan.row.id;}
 // Preserve the existing sequence-write -> UUID order, and allocate neither
 // when a coalesced revision keeps its original physical row identity.
 const sequence=await nextSequence(t,'revision-sequence'),id=humanUuid(store,t);
 await t.put('revisions',{...plan.row,id,sequence,listKey:[entityKey,sequence],documentList:[plan.row.documentId,sequence]});await store.pruneEntity(t,entityKey);return id;
}
export async function receipt(t,request,digest) {
 const prior=await t.get('operationReceipts',request.operationId);if(!prior)return null;
 if(prior.digest!==digest)fail();return prior.result;
}
export async function saveReceipt(store,t,request,digest,result) {
 await t.put('operationReceipts',{id:request.operationId,namespace:'thought-library',schemaVersion:1,ownerId:result.id||request.id||'library',operationSequence:await nextSequence(t),createdAt:humanClock(store,t),digest,result});
}
