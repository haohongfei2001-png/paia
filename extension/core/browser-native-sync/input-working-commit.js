import {initialSourcePlan} from './source-bootstrap-plan.js';
import {retainOriginalWorkingConflict,readOriginalWorkingConflict} from './working-conflict-retention.js';
import {enqueueInvalidation} from '../thought-maintenance.js';
import {requireOriginalGroupCheckpointPlan} from './group-checkpoint-plan.js';
import {registerRepositoryFinalReadFence} from '../idb-repository.js';
import {remoteWorkingHistoryRow} from '../ia-store-owner.js';
import {CONSENT_VERSION} from '../constants.js';
import {InputWorkingSyncJournal,assertOriginalInputWorkingOwner} from './input-working-journal.js';
import {requireOriginalJournalRestoreFence} from './prompt-journal.js';
import {FilterIntentSyncJournal} from './filter-intent-journal.js';
import {projectEntity} from './codecs.js';
import {clone,equal,fail,bytes} from './value.js';
import {readSegmentDescriptor} from './segments.js';
import {CORE_LIMITS} from './core.js';
import {WorkingReceiveInbox,workingGroups,workingGroup} from './input-working-inbox.js';
const editable=new Set(['libraryText','note','editedAt','revision','userEdited']);
const identity=b=>Object.fromEntries(Object.entries(b).filter(([key])=>!editable.has(key)));
const originalWorkingReceivers=new WeakMap();
// Explicit local dependency injection. No worker registration or Source creation.
export class InputWorkingCommitReceiver{
  #inbox;
 constructor(store,core,{filterJournal}={}){if(store.repository!==core.repository||!(filterJournal instanceof FilterIntentSyncJournal)||filterJournal.core!==core)fail('BNS_WORKING_BINDING_REQUIRED');this.store=store;this.core=core;this.filter=filterJournal;this.journal=new InputWorkingSyncJournal(core,{filterJournal,logicalCommits:true});this.#inbox=new WorkingReceiveInbox(core);originalWorkingReceivers.set(this,Object.freeze({store,core,filter:this.filter,journal:this.journal}));}
 async #capture(t){const fence=await this.#inbox.fence(t);await this.journal.fence.snapshot(t);await this.#permission(t);return fence;}
 async #permission(t){const control=await this.store.control(t);if(control.settings.consentVersion!==CONSENT_VERSION||control.settings.enabled!==true)fail('BNS_WORKING_PERMISSION_REQUIRED');}
 async receiveSegment(ref,get){
  if(typeof get!=='function')fail('BNS_INBOX_REQUEST');await this.store.finishFoundation();
  const fence=await this.store.run(()=>this.core.transaction(false,t=>this.#capture(t)));
  const frozen=clone(ref),operations=await readSegmentDescriptor(frozen,get,{datasetId:this.core.datasetId}),groups=workingGroups(operations);
  return this.store.run(()=>this.core.transaction(true,async t=>{await this.#permission(t);return this.#inbox.admit(t,frozen,groups,fence);}));
 }
 async resume({get,after=null,limit=1}={}){
  if(typeof get!=='function'||limit!==1||after!==null&&typeof after!=='string')fail('BNS_INBOX_REQUEST');await this.store.finishFoundation();
  const claim=await this.store.run(()=>this.core.transaction(false,async t=>{const fence=await this.#capture(t),snapshot=await this.#inbox.read(t),groups=[...new Set(snapshot.rows.filter(row=>row.namespace===fence.namespace&&row.epoch===fence.epoch).flatMap(row=>row.groups))].sort(),group=groups.find(x=>after===null||x>after);return {...snapshot,fence,group};}));
  if(!claim.group)return {state:'nothing_pending',nextCursor:null};
  const collected=new Map();let size=0;
  for(const row of claim.rows.filter(row=>row.namespace===claim.fence.namespace&&row.epoch===claim.fence.epoch&&row.groups.includes(claim.group))){
   const operations=await readSegmentDescriptor(row.ref,get,{datasetId:this.core.datasetId});workingGroups(operations);
   for(const op of operations.filter(op=>workingGroup(op)===claim.group)){const previous=collected.get(op.operationId);if(previous){if(!equal(previous,op))fail('BNS_OPERATION_COLLISION');continue;}size+=bytes(op).length;if(collected.size>=CORE_LIMITS.batch||size>CORE_LIMITS.batchBytes)fail('BNS_WORKING_COMMIT_INVALID');collected.set(op.operationId,op);}
  }
  const operations=[...collected.values()],descriptors=operations.filter(op=>op.type==='inputWorkingCommit');
  if(!descriptors.length||descriptors.length===1&&descriptors[0].value.members.some(ref=>!operations.some(op=>op.type===ref.type&&op.entityId===ref.entityId&&op.revisionId===ref.revisionId))){await this.store.run(()=>this.core.transaction(false,async t=>{await this.#inbox.current(t,claim);await this.#permission(t);}));return {state:'waiting_for_members',nextCursor:claim.group};}
  await this.core.prepareWorkingReceive(operations);
  const missing=await this.store.run(()=>this.core.transaction(false,async t=>{await this.#inbox.current(t,claim);await this.#permission(t);const block=operations.find(op=>op.type==='inputWorkingMember'&&op.value.entityType==='input');if(!block)fail('BNS_WORKING_COMMIT_INVALID');for(const parent of block.parents)if(!await this.core.get(t,'revision',parent))return true;return false;}));
  if(missing)return {state:'waiting_for_parents',nextCursor:claim.group};
  return {...await this.#receive(operations,claim),nextCursor:claim.group};
 }
 async cleanupInbox(options){return this.store.run(()=>this.core.transaction(true,t=>this.#inbox.cleanup(t,options)));}
 async receive(input){return this.#receive(input,null);}
 // Explicit original-owner intake. This retains protocol branches, never
 // applies either body, completes an inbox claim, or activates a checkpoint.
 async retainConflict(input,options){return retainOriginalWorkingConflict(this,input,options);}
 async readConflict(inputId,options){return readOriginalWorkingConflict(this,inputId,options);}
 async applyRestored(t,application,sourceProof){
  const a=workingApplications.get(application);if(!a||a.receiver!==this)fail('BNS_PREPARATION_REQUIRED');
  const before=await this.journal.snapshot(t,a.descriptor.inputId,a.descriptor.documentId,this.store.clock()),sources=await this.filter.restoredSources(t,sourceProof,a.keeps.map(x=>x.value.id));
  qualifyWorking(application,before,sources);await this.#permission(t);
  if(a.future&&((await t.get('meta','thought-epoch'))?.value||0)!==a.future.beforeEpoch)fail('BNS_WORKING_HISTORY_CHANGED');
  const result=await applyWorkingOwner(this,t,application,before,null);
  if(a.future){
   const expected=a.future.effect,event=await t.edge('invalidations','bySequence',expected.sequence),{id,at,...facts}=event??{};
   if(!id||typeof at!=='string'||!Number.isFinite(Date.parse(at))||!equal(facts,expected)||((await t.get('meta','thought-epoch'))?.value||0)!==expected.sequence)fail('BNS_WORKING_HISTORY_CHANGED');
   // The actual original event, not a manufactured success DTO, remains a
   // terminal obligation through later Human/Context writes and rollback.
   registerRepositoryFinalReadFence(this.store.repository,t,{isCurrent:()=>{if(workingApplications.get(application)!==a)fail('BNS_PREPARATION_REQUIRED');return true;},plan:function*(){if(!equal(yield {method:'get',table:'invalidations',key:id},event))fail('BNS_WORKING_HISTORY_CHANGED');return true;}});
  }
  return result;
 }

 async #receive(input,claim){
  const application=await prepareWorkingApplication(this,input),{prepared,descriptor,entities,block,state,history,keeps}=workingApplications.get(application);
  await this.store.finishFoundation();
  const before=await this.store.run(()=>this.core.transaction(false,t=>this.journal.snapshot(t,descriptor.inputId,descriptor.documentId,this.store.clock()))),sources=await this.filter.qualify(keeps.map(x=>x.value.id));
  qualifyWorking(application,before,sources);
  return this.store.run(()=>this.core.transaction(true,async t=>{
   await this.filter.current(t,sources);
   const control=await this.store.control(t);if(control.settings.consentVersion!==CONSENT_VERSION||control.settings.enabled!==true)fail('BNS_WORKING_PERMISSION_REQUIRED');
   if(JSON.stringify(await this.journal.snapshot(t,descriptor.inputId,descriptor.documentId,this.store.clock()))!==JSON.stringify(before))fail('BNS_OWNER_CHANGED');
   const duplicate=await this.core.get(t,'receipt',prepared.descriptor.operationId);if(duplicate){if(duplicate.digest!==prepared.descriptor.revisionId)fail('BNS_OPERATION_COLLISION');await this.core.requireWorkingAppliedReceipt(t,prepared);if(claim)await this.#inbox.finish(t,claim);return {state:'duplicate'};}
   return applyWorkingOwner(this,t,application,before,claim?()=>this.#inbox.finish(t,claim):null);
  }));
 }
}

const workingApplications=new WeakMap();
export async function prepareWorkingApplication(receiver,input){
 if(!(receiver instanceof InputWorkingCommitReceiver))fail('BNS_WORKING_BINDING_REQUIRED');
 const prepared=await receiver.core.prepareWorkingReceive(input),shape=describeOriginalWorkingGroup(prepared);
 const cap=Object.freeze({});workingApplications.set(cap,{receiver,prepared,...shape});return cap;
}
// Pure shape only. No native witness or retention/application capability.
export function describeOriginalWorkingGroup(prepared){
  const descriptor=prepared.descriptor.value,entities=prepared.members.map(op=>({operation:op,type:op.value.entityType,value:op.value.entity}));
  const one=type=>{const rows=entities.filter(x=>x.type===type);if(rows.length!==1)fail('BNS_WORKING_COMMIT_INVALID');return rows[0];},block=one('input'),state=one('inputState'),history=entities.filter(x=>x.type==='revision'),keeps=entities.filter(x=>x.type==='filterIntent');
  if(block.value.id!==descriptor.inputId||state.value.id!==descriptor.inputId||block.value.documentId!==descriptor.documentId||state.value.documentId!==descriptor.documentId||!history.length||history.length>96||!keeps.length||keeps.length>16||history.some(x=>x.value.entityId!==descriptor.inputId||x.value.documentId!==descriptor.documentId)||keeps.some(x=>x.value.reason!=='user_edit'))fail('BNS_WORKING_COMMIT_INVALID');
  const snapshot=b=>({libraryText:b.libraryText,note:b.note,excluded:b.excluded,originalTextReference:b.originalTextReference,provenanceSignature:b.provenanceSignature});
  const ordered=[...history].sort((a,b)=>a.value.sequence-b.value.sequence);
  if(ordered.some((item,index)=>index>0&&!equal(ordered[index-1].value.after,item.value.before)))fail('BNS_WORKING_HISTORY_INCOMPLETE');
  if(new Set(ordered.map(x=>x.value.sequence)).size!==ordered.length||!equal(ordered.at(-1).value.after,snapshot(block.value))||history.some(x=>!equal(x.value.sourceRecordIds,state.value.sourceRecordIds)))fail('BNS_WORKING_HISTORY_INCOMPLETE');
 return {descriptor,entities,block,state,history,keeps};
}
function qualifyWorking(application,before,sources){
 const a=workingApplications.get(application);if(!a)fail('BNS_PREPARATION_REQUIRED');const {descriptor,block,state,keeps}=a;
  if(!equal(descriptor.sourceRefs,before.sourceRefs))fail('BNS_WORKING_SOURCE_CLOSURE');
  if(state.value.filteringPolicyState!==before.state.filteringPolicyState)fail('BNS_WORKING_SCOPE_UNAVAILABLE');
  if(!equal(identity(projectEntity('input',{value:before.b})),identity(block.value))||!equal(state.value.sourceRecordIds,before.state.sourceRecordIds)||state.value.sourcePurged||state.value.removalState!=='active'||block.value.excluded||block.value.branchStatus)fail('BNS_WORKING_SCOPE_UNAVAILABLE');
  const keys=before.b.provenance.map(p=>sources.sources.find(rows=>rows.some(row=>row.id===p.sourceRecordId))?.[0]?.sourceKey);
  if(keys.some(x=>!x)||!equal([...new Set(keys)].sort(),keeps.map(x=>x.value.id).sort()))fail('BNS_WORKING_SOURCE_CLOSURE');

}

export function qualifyOriginalWorkingRetentionApplication(receiver,application,before,sources){const a=workingApplications.get(application);if(!a||a.receiver!==receiver)fail('BNS_PREPARATION_REQUIRED');qualifyWorking(application,before,sources);return true;}
export function readOriginalWorkingRetentionPreparation(receiver,application){const a=workingApplications.get(application);if(!a||a.receiver!==receiver)fail('BNS_PREPARATION_REQUIRED');return a.prepared;}

const receiverPrototype=InputWorkingCommitReceiver.prototype,receiverMethods=Object.getOwnPropertyNames(receiverPrototype).filter(name=>name!=='constructor').map(name=>[name,Object.getOwnPropertyDescriptor(receiverPrototype,name)]);
export function requireOriginalWorkingRetentionReceiver(receiver){
 const binding=originalWorkingReceivers.get(receiver);if(!binding||Object.getPrototypeOf(receiver)!==receiverPrototype)fail('BNS_WORKING_RETENTION_REQUIRED');
 for(const [name,value]of Object.entries(binding)){const d=Object.getOwnPropertyDescriptor(receiver,name);if(!d||!Object.hasOwn(d,'value')||d.value!==value)fail('BNS_WORKING_RETENTION_REQUIRED');}
 for(const [name,expected]of receiverMethods){const d=Object.getOwnPropertyDescriptor(receiverPrototype,name);if(Object.hasOwn(receiver,name)||!d||['value','get','set','writable','enumerable','configurable'].some(k=>d[k]!==expected[k]))fail('BNS_WORKING_RETENTION_REQUIRED');}
 assertOriginalInputWorkingOwner(binding.journal,binding.core);
 for(const fence of [binding.journal.fence,binding.filter.fence,binding.store.inputWorkingJournal?.fence]){
  if(!fence)fail('BNS_WORKING_RETENTION_REQUIRED');requireOriginalJournalRestoreFence(fence,binding.core);
 }
 return binding;
}
async function applyWorkingOwner(receiver,t,application,before,finish){
 const a=workingApplications.get(application);if(!a||a.receiver!==receiver)fail('BNS_PREPARATION_REQUIRED');const {prepared,descriptor,entities,block,state,history,keeps}=a;
   const head=await receiver.core.get(t,'head','inputWorkingMember',block.operation.entityId),proof=await receiver.core.get(t,'workingOwner',descriptor.inputId);
   if(head?.purged||head?.revisions.length>1)fail('BNS_OWNER_CHANGED');
   if(head){
    const prior=await receiver.core.get(t,'revision',head.revisions[0]);if(!proof||proof.revisionId!==head.revisions[0]||!equal(projectEntity('input',{value:before.b}),prior?.operation.value.entity))fail('BNS_OWNER_CHANGED');
    const stateHead=await receiver.core.get(t,'head','inputWorkingMember',state.operation.entityId),priorState=stateHead?.revisions.length===1?await receiver.core.get(t,'revision',stateHead.revisions[0]):null;
    if(!priorState||!equal(before.state,{...priorState.operation.value.entity,deltaSequence:proof.deltaSequence}))fail('BNS_OWNER_CHANGED');
   }else if(proof||before.b.revision!==0||before.b.libraryText!==null||before.b.note||before.state.contentRevision!==0)fail('BNS_BOOTSTRAP_REQUIRED');
   if(block.value.revision!==before.b.revision+1||state.value.contentRevision!==before.state.contentRevision+1)fail('BNS_WORKING_STALE');
   // A known legacy head is not silently migrated into a separate wrapper chain.
   for(const item of entities)if(await receiver.core.get(t,'head',item.type,item.value.id))fail('BNS_WORKING_LEGACY_HEAD_UNSUPPORTED');
   for(const keep of keeps){const priorHead=await receiver.core.get(t,'head','inputWorkingMember',keep.operation.entityId),local=await t.get('filterIntents',keep.value.id);if(priorHead?.purged||priorHead?.revisions.length>1)fail('BNS_OWNER_CHANGED');if(local){const prior=priorHead?.revisions.length===1?await receiver.core.get(t,'revision',priorHead.revisions[0]):null;if(!equal(prior?.operation.value.entity??null,local))fail('BNS_OWNER_CHANGED');}}
   if(before.history.some(row=>!history.some(item=>item.value.id===row.id)))fail('BNS_WORKING_HISTORY_INCOMPLETE');
   const mapped=[];for(const item of history){const map=await receiver.core.get(t,'workingHistory',item.value.id),local=await t.get('revisions',item.value.id);if(map){const old=await receiver.core.get(t,'revision',map.revisionId);if(!local||!old||!equal(local,{...old.operation.value.entity,sequence:map.sequence,listKey:[item.value.entityKey,map.sequence],documentList:[item.value.documentId,map.sequence]}))fail('BNS_WORKING_HISTORY_CHANGED');}else if(local&&(item.value.reason!=='baseline'||!equal(local,{...item.value,sequence:local.sequence,listKey:[item.value.entityKey,local.sequence],documentList:[item.value.documentId,local.sequence]})))fail('BNS_WORKING_HISTORY_COLLISION');mapped.push({...item,localSequence:map?.sequence??local?.sequence??null});}
   if(new Set([...before.history.map(x=>x.id),...history.map(x=>x.value.id)]).size>96)fail('BNS_WORKING_HISTORY_BOUND');
   return receiver.core.commitWorkingReceive(t,prepared,async()=>{
    const result=await receiver.store.applyRemoteWorking(t,{before:before.b,block:block.value,inputState:state.value,history:mapped,keeps:keeps.map(x=>x.value),operationId:descriptor.id});
    for(const item of result.history)await receiver.core.put(t,'workingHistory',[item.id],{sequence:item.sequence,revisionId:history.find(x=>x.value.id===item.id).operation.revisionId});
    await receiver.core.put(t,'workingOwner',[descriptor.inputId],{revisionId:block.operation.revisionId,deltaSequence:result.deltaSequence});
    const fence=await receiver.journal.fence.snapshot(t);if(!fence.marker)await receiver.core.put(t,'ownerRecoveryEpoch',[],{version:1,epoch:fence.epoch});
    if(finish)await finish();
   });
}

// Read-only projection of the exact prepared Working owner. Only the original
// private application can select rows; the Human future graph supplies its
// private evolving history/counter. Actual writes still use applyWorkingOwner.
export async function projectOriginalWorkingHistory(store,core,application,group,currentHistory,revisionSequence,previousMappings){
 const a=requireOriginalWorkingApplication(store,core,application,group);
 if(!Number.isSafeInteger(revisionSequence)||revisionSequence<0||!(previousMappings instanceof Map))fail('BNS_WORKING_HISTORY_CHANGED');
 const rows=[],mappings=new Map(previousMappings);let sequence=revisionSequence;
 await core.transaction(false,async t=>{
  const oldHistory=currentHistory.filter(row=>row.entityKey==='input:'+a.descriptor.inputId);
  if(oldHistory.some(row=>!a.history.some(item=>item.value.id===row.id))||new Set([...oldHistory.map(row=>row.id),...a.history.map(item=>item.value.id)]).size>96)fail('BNS_WORKING_HISTORY_INCOMPLETE');
  for(const item of a.history){
   const virtual=mappings.get(item.value.id),map=virtual??await core.get(t,'workingHistory',item.value.id),local=currentHistory.find(row=>row.id===item.value.id),old=virtual?.operation??(map?await core.get(t,'revision',map.revisionId):null)?.operation;
   if(map){if(!local||!old||!equal(local,remoteWorkingHistoryRow(old.value.entity,map.sequence)))fail('BNS_WORKING_HISTORY_CHANGED');}
   else if(local&&(item.value.reason!=='baseline'||!equal(local,remoteWorkingHistoryRow(item.value,local.sequence))))fail('BNS_WORKING_HISTORY_COLLISION');
   const assigned=map?.sequence??local?.sequence??++sequence;if(!Number.isSafeInteger(assigned)||assigned<1||!Number.isSafeInteger(sequence))fail('BNS_WORKING_HISTORY_BOUND');
   rows.push(remoteWorkingHistoryRow(item.value,assigned));mappings.set(item.value.id,{sequence:assigned,revisionId:item.operation.revisionId,operation:item.operation});
  }
 },['meta']);
 return {rows,mappings,revisionSequence:sequence,operationCount:a.prepared.members.length+1};
}

// Only the owning restore can consume its exact private preparation. Invalid
// bindings do not dispose another restore's capability.
export function releaseOriginalWorkingApplication(store,core,application){
 const a=workingApplications.get(application);if(!a)return false;if(a.receiver.store!==store||a.receiver.core!==core)fail('BNS_PREPARATION_REQUIRED');return workingApplications.delete(application);
}

function requireOriginalWorkingApplication(store,core,application,group){
 const a=workingApplications.get(application);if(!a||a.receiver.store!==store||a.receiver.core!==core||store.repository!==core.repository||group?.type!=='inputWorkingCommit'||group.id!==a.prepared.descriptor.revisionId||!Array.isArray(group.operations)||group.operations.length!==a.prepared.members.length+1||new Set(group.operations.map(op=>op.revisionId)).size!==group.operations.length||group.operations.some(op=>![...a.prepared.members,a.prepared.descriptor].some(expected=>equal(op,expected))))fail('BNS_PREPARATION_REQUIRED');return a;
}
// Run the fixed original invalidation writer over its exact two-row detached
// effect. This is a readonly prediction, never a transaction or write authority.
export async function projectOriginalWorkingInvalidation(core,plan,group,epoch){
 requireOriginalGroupCheckpointPlan(core,plan);if(!plan.groups.includes(group)||group.type!=='inputWorkingCommit'||!Number.isSafeInteger(epoch)||epoch<0)fail('BNS_PREPARATION_REQUIRED');
 const state=group.prepared.members.find(op=>op.value.entityType==='inputState')?.value.entity;if(!state)fail('BNS_WORKING_COMMIT_INVALID');
 let counter={id:'thought-epoch',value:epoch},event=null;
 const scratch={async get(table,id){if(table!=='meta'||id!=='thought-epoch')fail('BNS_WORKING_HISTORY_CHANGED');return clone(counter);},async put(table,row){if(table==='meta'&&row.id==='thought-epoch'){counter=clone(row);return;}if(table==='invalidations'&&!event){event=clone(row);return;}fail('BNS_WORKING_HISTORY_CHANGED');}};
 await enqueueInvalidation({uuid:()=>group.id,clock:()=> '1970-01-01T00:00:00.000Z'},scratch,state.id,'source_updated',state.contentRevision);
 if(!Number.isSafeInteger(counter.value)||counter.value<1||event?.sequence!==counter.value)fail('BNS_WORKING_HISTORY_BOUND');const {id,at,...effect}=event;return effect;
}
// Exact original cap + original compiled group project only one private future
// Source. Caller DTOs cannot replace an operation or select unrelated rows.
export async function projectOriginalWorkingSource(store,core,application,plan,group,source,epoch){
 const a=requireOriginalWorkingApplication(store,core,application,group);requireOriginalGroupCheckpointPlan(core,plan);
 if(!plan.groups.includes(group)||!source||source.input.id!==a.descriptor.inputId||a.future)fail('BNS_PREPARATION_REQUIRED');
 const bootstrap=plan.groups.find(g=>g.type==='sourceBootstrapCommit'&&g.prepared.descriptor.value.inputId===a.descriptor.inputId),initial=bootstrap?initialSourcePlan(bootstrap.capability):null;
 if(!initial||!equal(source.source,initial.source)||!equal(source.timeEvidence,initial.timeEvidence)||!equal(source.inputDocument,initial.inputDocument)||!equal(source.baselineRevision,initial.baselineRevision))fail('BNS_WORKING_SOURCE_CLOSURE');
 const prior=op=>op.parents.length===1?plan.groups.flatMap(g=>g.operations).find(row=>row.revisionId===op.parents[0])?.value.entity:null;
 if(!equal(source.input,prior(a.block.operation)??initial.input)||!equal(source.inputState,prior(a.state.operation)??initial.inputState))fail('BNS_WORKING_STALE');
 const {input:b,inputState:state}=source,sourceRefs=[{id:source.source.id,sourceKey:source.source.sourceKey,dedupeKey:source.source.dedupeKey,contentHash:source.source.contentHash}];
 qualifyWorking(application,{b,state,sourceRefs},{sources:[[source.source]]});
 if(a.block.value.revision!==b.revision+1||a.state.value.contentRevision!==state.contentRevision+1)fail('BNS_WORKING_STALE');
 const effect=await projectOriginalWorkingInvalidation(core,plan,group,epoch);a.future={beforeEpoch:epoch,effect};
 return {source:{...clone(source),input:clone(a.block.value),inputState:clone(a.state.value)},epoch:effect.sequence};
}
