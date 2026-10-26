import {requireRepositoryTransactionScope} from './idb-repository.js';
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
export async function journal(store,t,data,{boundedPrune=false}={}) {
 // Before-images of generated labels retain their purge fence after human rename/merge.
 if(['topic','section'].includes(data.kind))data={...data,sourceRecordIds:[...new Set([...(data.sourceRecordIds||[]),...(data.before?.sourceRecordIds||[]),...(data.after?.sourceRecordIds||[])])]};
 const at=humanClock(store,t),entityKey=data.kind+':'+data.entityId;
 const previous=data.important?null:await t.edge('revisions','byList',prefix([entityKey]),'prev');
 const plan=planJournalRevision(data,previous,at);
 if(plan.coalesced){await t.put('revisions',plan.row);return plan.row.id;}
 // Preserve the existing sequence-write -> UUID order, and allocate neither
 // when a coalesced revision keeps its original physical row identity.
 const sequence=await nextSequence(t,'revision-sequence'),id=humanUuid(store,t);
 await t.put('revisions',{...plan.row,id,sequence,listKey:[entityKey,sequence],documentList:[plan.row.documentId,sequence]});await store.pruneEntity(t,entityKey,{bounded:boundedPrune});return id;
}
export async function receipt(t,request,digest) {
 const prior=await t.get('operationReceipts',request.operationId);if(!prior)return null;
 if(prior.digest!==digest)fail();return prior.result;
}
// Opt-in observation of the original writer intent. Callers can observe a
// receipt, but cannot set its expected contents or manufacture a saved write.
const receiptObservers=new WeakMap(),receiptExpectations=new WeakMap();
export function observeOriginalOperationReceipt(store,t,operationId){
 const scope=requireRepositoryTransactionScope(store.repository,t);if(scope.mode!=='readwrite'||scope.database!==store.repository.db)fail();
 let selected=receiptObservers.get(t);if(!selected){selected=new Map();receiptObservers.set(t,selected);}if(selected.has(operationId))fail();
 const cap=Object.freeze(Object.create(null)),record={store,t,operationId,scope,expected:null,released:false};selected.set(operationId,record);receiptExpectations.set(cap,record);return cap;
}
export function originalOperationReceiptResult(store,t,cap){
 const record=receiptExpectations.get(cap);if(!record||record.released||record.store!==store||record.t!==t||record.scope!==requireRepositoryTransactionScope(store.repository,t)||record.expected===null)fail();return record.expected;
}
export function releaseOriginalOperationReceipt(cap){
 const record=receiptExpectations.get(cap);if(!record)return;record.released=true;const selected=receiptObservers.get(record.t);if(selected?.get(record.operationId)===record)selected.delete(record.operationId);if(selected?.size===0)receiptObservers.delete(record.t);receiptExpectations.delete(cap);
}
export async function saveReceipt(store,t,request,digest,result) {
 const selected=receiptObservers.get(t),observer=selected?.get(request.operationId);
 try{
  const row={id:request.operationId,namespace:'thought-library',schemaVersion:1,ownerId:result.id||request.id||'library',operationSequence:await nextSequence(t),createdAt:humanClock(store,t),digest,result};
  if(observer){if(observer.store!==store||observer.released||observer.expected!==null||observer.scope!==requireRepositoryTransactionScope(store.repository,t))fail();observer.expected=JSON.stringify(row);}
  await t.put('operationReceipts',row);
 }finally{if(observer&&selected.get(request.operationId)===observer)selected.delete(request.operationId);if(selected?.size===0)receiptObservers.delete(t);}
}
