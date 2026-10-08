import {CONSENT_VERSION} from '../constants.js';
import {InputWorkingSyncJournal} from './input-working-journal.js';
import {FilterIntentSyncJournal} from './filter-intent-journal.js';
import {projectEntity} from './codecs.js';
import {clone,equal,fail} from './value.js';
const editable=new Set(['libraryText','note','editedAt','revision','userEdited']);
const identity=b=>Object.fromEntries(Object.entries(b).filter(([key])=>!editable.has(key)));
// Explicit local dependency injection. No worker registration or Source creation.
export class InputWorkingCommitReceiver{
 constructor(store,core,{filterJournal}={}){if(store.repository!==core.repository||!(filterJournal instanceof FilterIntentSyncJournal)||filterJournal.core!==core)fail('BNS_WORKING_BINDING_REQUIRED');this.store=store;this.core=core;this.filter=filterJournal;this.journal=new InputWorkingSyncJournal(core,{filterJournal,logicalCommits:true});}
 async receive(input){
  const prepared=await this.core.prepareWorkingReceive(input),descriptor=prepared.descriptor.value,entities=prepared.members.map(op=>({operation:op,type:op.value.entityType,value:op.value.entity}));
  const one=type=>{const rows=entities.filter(x=>x.type===type);if(rows.length!==1)fail('BNS_WORKING_COMMIT_INVALID');return rows[0];},block=one('input'),state=one('inputState'),history=entities.filter(x=>x.type==='revision'),keeps=entities.filter(x=>x.type==='filterIntent');
  if(block.value.id!==descriptor.inputId||state.value.id!==descriptor.inputId||block.value.documentId!==descriptor.documentId||state.value.documentId!==descriptor.documentId||!history.length||history.length>96||!keeps.length||keeps.length>16||history.some(x=>x.value.entityId!==descriptor.inputId||x.value.documentId!==descriptor.documentId)||keeps.some(x=>x.value.reason!=='user_edit'))fail('BNS_WORKING_COMMIT_INVALID');
  const snapshot=b=>({libraryText:b.libraryText,note:b.note,excluded:b.excluded,originalTextReference:b.originalTextReference,provenanceSignature:b.provenanceSignature});
  const ordered=[...history].sort((a,b)=>a.value.sequence-b.value.sequence);
  if(ordered.some((item,index)=>index>0&&!equal(ordered[index-1].value.after,item.value.before)))fail('BNS_WORKING_HISTORY_INCOMPLETE');
  if(new Set(ordered.map(x=>x.value.sequence)).size!==ordered.length||!equal(ordered.at(-1).value.after,snapshot(block.value))||history.some(x=>!equal(x.value.sourceRecordIds,state.value.sourceRecordIds)))fail('BNS_WORKING_HISTORY_INCOMPLETE');
  await this.store.finishFoundation();
  const before=await this.store.run(()=>this.core.transaction(false,t=>this.journal.snapshot(t,descriptor.inputId,descriptor.documentId,this.store.clock()))),sources=await this.filter.qualify(keeps.map(x=>x.value.id));
  if(!equal(descriptor.sourceRefs,before.sourceRefs))fail('BNS_WORKING_SOURCE_CLOSURE');
  if(state.value.filteringPolicyState!==before.state.filteringPolicyState)fail('BNS_WORKING_SCOPE_UNAVAILABLE');
  if(!equal(identity(projectEntity('input',{value:before.b})),identity(block.value))||!equal(state.value.sourceRecordIds,before.state.sourceRecordIds)||state.value.sourcePurged||state.value.removalState!=='active'||block.value.excluded||block.value.branchStatus)fail('BNS_WORKING_SCOPE_UNAVAILABLE');
  const keys=before.b.provenance.map(p=>sources.sources.find(rows=>rows.some(row=>row.id===p.sourceRecordId))?.[0]?.sourceKey);
  if(keys.some(x=>!x)||!equal([...new Set(keys)].sort(),keeps.map(x=>x.value.id).sort()))fail('BNS_WORKING_SOURCE_CLOSURE');
  return this.store.run(()=>this.core.transaction(true,async t=>{
   await this.filter.current(t,sources);
   const control=await this.store.control(t);if(control.settings.consentVersion!==CONSENT_VERSION||control.settings.enabled!==true)fail('BNS_WORKING_PERMISSION_REQUIRED');
   if(JSON.stringify(await this.journal.snapshot(t,descriptor.inputId,descriptor.documentId,this.store.clock()))!==JSON.stringify(before))fail('BNS_OWNER_CHANGED');
   const duplicate=await this.core.get(t,'receipt',prepared.descriptor.operationId);if(duplicate){if(duplicate.digest!==prepared.descriptor.revisionId)fail('BNS_OPERATION_COLLISION');return {state:'duplicate'};}
   const head=await this.core.get(t,'head','inputWorkingMember',block.operation.entityId),proof=await this.core.get(t,'workingOwner',descriptor.inputId);
   if(head?.purged||head?.revisions.length>1)fail('BNS_OWNER_CHANGED');
   if(head){
    const prior=await this.core.get(t,'revision',head.revisions[0]);if(!proof||proof.revisionId!==head.revisions[0]||!equal(projectEntity('input',{value:before.b}),prior?.operation.value.entity))fail('BNS_OWNER_CHANGED');
    const stateHead=await this.core.get(t,'head','inputWorkingMember',state.operation.entityId),priorState=stateHead?.revisions.length===1?await this.core.get(t,'revision',stateHead.revisions[0]):null;
    if(!priorState||!equal(before.state,{...priorState.operation.value.entity,deltaSequence:proof.deltaSequence}))fail('BNS_OWNER_CHANGED');
   }else if(proof||before.b.revision!==0||before.b.libraryText!==null||before.b.note||before.state.contentRevision!==0)fail('BNS_BOOTSTRAP_REQUIRED');
   if(block.value.revision!==before.b.revision+1||state.value.contentRevision!==before.state.contentRevision+1)fail('BNS_WORKING_STALE');
   // A known legacy head is not silently migrated into a separate wrapper chain.
   for(const item of entities)if(await this.core.get(t,'head',item.type,item.value.id))fail('BNS_WORKING_LEGACY_HEAD_UNSUPPORTED');
   for(const keep of keeps){const priorHead=await this.core.get(t,'head','inputWorkingMember',keep.operation.entityId),local=await t.get('filterIntents',keep.value.id);if(priorHead?.purged||priorHead?.revisions.length>1)fail('BNS_OWNER_CHANGED');if(local){const prior=priorHead?.revisions.length===1?await this.core.get(t,'revision',priorHead.revisions[0]):null;if(!equal(prior?.operation.value.entity??null,local))fail('BNS_OWNER_CHANGED');}}
   if(before.history.some(row=>!history.some(item=>item.value.id===row.id)))fail('BNS_WORKING_HISTORY_INCOMPLETE');
   const mapped=[];for(const item of history){const map=await this.core.get(t,'workingHistory',item.value.id),local=await t.get('revisions',item.value.id);if(map){const old=await this.core.get(t,'revision',map.revisionId);if(!local||!old||!equal(local,{...old.operation.value.entity,sequence:map.sequence,listKey:[item.value.entityKey,map.sequence],documentList:[item.value.documentId,map.sequence]}))fail('BNS_WORKING_HISTORY_CHANGED');}else if(local&&(item.value.reason!=='baseline'||!equal(local,{...item.value,sequence:local.sequence,listKey:[item.value.entityKey,local.sequence],documentList:[item.value.documentId,local.sequence]})))fail('BNS_WORKING_HISTORY_COLLISION');mapped.push({...item,localSequence:map?.sequence??local?.sequence??null});}
   if(new Set([...before.history.map(x=>x.id),...history.map(x=>x.value.id)]).size>96)fail('BNS_WORKING_HISTORY_BOUND');
   return this.core.commitWorkingReceive(t,prepared,async()=>{
    const result=await this.store.applyRemoteWorking(t,{before:before.b,block:block.value,inputState:state.value,history:mapped,keeps:keeps.map(x=>x.value),operationId:descriptor.id});
    for(const item of result.history)await this.core.put(t,'workingHistory',[item.id],{sequence:item.sequence,revisionId:history.find(x=>x.value.id===item.id).operation.revisionId});
    await this.core.put(t,'workingOwner',[descriptor.inputId],{revisionId:block.operation.revisionId,deltaSequence:result.deltaSequence});
    const fence=await this.journal.fence.snapshot(t);if(!fence.marker)await this.core.put(t,'ownerRecoveryEpoch',[],{version:1,epoch:fence.epoch});
   });
  }));
 }
}
