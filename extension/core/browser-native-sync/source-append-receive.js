import {appendAuthority,appendSnapshot,requireAppendAbsent,sameAppendSnapshot,validateAppendAnchor} from './source-append-journal.js';
import {prepareSourceAppendPlan} from './source-append-plan.js';
import {SOURCE_APPEND_TYPES} from './source-append-codec.js';
import {equal,fail} from './value.js';
// Explicit local integration only; no default worker/provider or checkpoint.
export class SourceAppendReceiver{
 constructor(store,core){if(store.repository!==core.repository)fail('BNS_SOURCE_APPEND_BINDING');this.store=store;this.core=core;}
 async receive(input){
  const {store,core}=this;await store.finishFoundation();const entry=await store.run(()=>core.transaction(false,t=>appendAuthority(store,core,t)));
  const prepared=await core.prepareSourceAppendReceive(input),v=prepared.descriptor.value,e=Object.fromEntries(prepared.members.map(op=>[op.value.entityType,op.value.entity]));
  if(Object.keys(e).length!==5||!equal(v.refs.map(ref=>prepared.members.find(op=>op.revisionId===ref.revisionId)?.value.entityType),SOURCE_APPEND_TYPES)||v.sourceId!==e.source?.id||v.sourceKey!==e.source?.sourceKey||v.documentId!==e.input?.documentId||v.inputId!==e.input?.id||v.baselineId!==e.baselineRevision?.id||v.conversation.chatId!==e.source?.chatId)fail('BNS_SOURCE_APPEND_INVALID');
  const cap=await prepareSourceAppendPlan(e,v.documentId),before=await store.run(()=>core.transaction(false,t=>appendSnapshot(store,core,t,e.source,v.bootstrap)));if(!equal(entry,before.authority))fail('BNS_SOURCE_APPEND_CHANGED');await validateAppendAnchor(core,before.anchor);
  if(before.anchor.doc.id!==v.documentId)fail('BNS_SOURCE_APPEND_ANCHOR');
  return store.run(()=>core.transaction(true,async t=>{
   const current=await appendSnapshot(store,core,t,e.source,v.bootstrap);if(!sameAppendSnapshot(current,before))fail('BNS_SOURCE_APPEND_CHANGED');const receipt=await core.get(t,'receipt',prepared.descriptor.operationId);
   if(receipt){
    if(receipt.digest!==prepared.descriptor.revisionId)fail('BNS_OPERATION_COLLISION');
    for(const op of [...prepared.members,prepared.descriptor]){const rec=await core.get(t,'receipt',op.operationId),rev=await core.get(t,'revision',op.revisionId),head=await core.get(t,'head',op.type,op.entityId),sequence=await core.get(t,'sequence',op.deviceId,String(op.sequence).padStart(16,'0'));if(!rec||rec.digest!==op.revisionId||rec.deviceId!==op.deviceId||rec.sequence!==op.sequence||!rev||rev.redacted||!equal(rev.operation,op)||head?.purged||!equal(head?.revisions??null,[op.revisionId])||sequence?.operationId!==op.operationId||sequence?.digest!==op.revisionId)fail('BNS_SOURCE_APPEND_CHANGED');}
    const h=e.baselineRevision,local=await t.get('revisions',h.id),state=await t.get('inputStates',e.input.id);
    if(!current.record||!equal(current.record.value,e.source)||!equal(current.time?.value??null,e.timeEvidence.value)||!current.input||current.input.value.documentId!==v.documentId||current.input.value.sourceRecordId!==e.source.id||!state||state.removalState!=='active'||current.tombstone||current.snapshotTombstone||current.removal||!local||!equal(local,{...h,sequence:local.sequence,listKey:[h.entityKey,local.sequence],documentList:[h.documentId,local.sequence]}))fail('BNS_SOURCE_APPEND_CHANGED');return {state:'duplicate'};
   }
   requireAppendAbsent(current);return core.commitSourceAppendReceive(t,prepared,()=>store.applySourceAppend(t,cap));
  }));
 }
}
