import {applyDocumentEdit} from '../workspace.js';
import {inputEditJournalData,planInputRevision,REVISION_POLICY} from '../ia-store.js';
import {projectEntity} from './codecs.js';
import {FilterIntentSyncJournal} from './filter-intent-journal.js';
import {JournalRestoreFence} from './prompt-journal.js';
import {clone,equal,fail,exact,count} from './value.js';
const range=id=>IDBKeyRange.bound([id],[id,[]],false,true);
const absent=x=>x??null;
// Physical index tuples can contain -0; they are local snapshots, not wire values.
const sameSnapshot=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// Default publication stays local-only. Optional logical commits have an explicit
// receiver module; neither path registers a production remote materializer.
export class InputWorkingSyncJournal{
 constructor(core,{filterJournal,logicalCommits=false}={}){if(!(filterJournal instanceof FilterIntentSyncJournal)||filterJournal.core!==core)fail('BNS_WORKING_BINDING_REQUIRED');if(typeof logicalCommits!=='boolean')fail('BNS_WORKING_BINDING_REQUIRED');this.logicalCommits=logicalCommits;this.core=core;this.filter=filterJournal;this.fence=new JournalRestoreFence(core);this.prepared=new WeakMap();this.transactions=new WeakMap();}
 async snapshot(t,id,documentId,at){
  const b=(await t.get('blocks',id))?.value,document=await t.get('documents',documentId),workingDocument=await t.get('libraryDocuments',documentId),state=await t.get('inputStates',id),index=await t.get('blockIndex',id),filter=await t.get('filterInputs',id);
  if(!b||!document||!workingDocument||!state||!index||b.documentId!==documentId||state.documentId!==documentId||index.documentId!==documentId||b.excluded||b.branchStatus||state.removalState!=='active'||state.sourcePurged||!count(state.contentRevision)||!Array.isArray(b.provenance)||!b.provenance.length||b.provenance.length>16||b.provenanceSignature!==JSON.stringify(b.provenance)||!equal(state.sourceRecordIds,[...b.provenance.map(p=>p.sourceRecordId)]))fail('BNS_WORKING_SCOPE_UNAVAILABLE');
  if(await t.count('dependencies','byInputTarget',range(id))||await t.count('provenance','byInputVersion',range(id)))fail('BNS_WORKING_REFERENCED');
  for(const source of state.sourceRecordIds)if(await t.count('thoughts','bySourceRecord',source))fail('BNS_WORKING_REFERENCED');
  const history=await t.all('revisions','byEntity','input:'+id,97);if(history.length>96)fail('BNS_WORKING_HISTORY_BOUND');
  // This publication-only slice cannot yet send history retirement bundles.
  // Refuse old history before mutation; the normal unbound pruning owner is unchanged.
  if(history.some(row=>!Number.isFinite(Date.parse(row.at))||Date.parse(row.at)<Date.parse(at)-REVISION_POLICY.days*86400000))fail('BNS_WORKING_HISTORY_RETIREMENT_UNAVAILABLE');
  const sourceRefs=[];for(const id of state.sourceRecordIds){const source=(await t.get('records',id))?.value;if(!source)fail('BNS_WORKING_SCOPE_UNAVAILABLE');sourceRefs.push({id,sourceKey:source.sourceKey,dedupeKey:source.dedupeKey,contentHash:source.contentHash});}
  return {b,document,workingDocument,state,index,sourceRefs,filter:absent(filter),history,revisionSequence:absent(await t.get('meta','revision-sequence')),deltaSequence:absent(await t.get('meta','input-delta-sequence')),generation:(await t.get('meta','backup-data-generation'))?.value||0,fence:await this.fence.snapshot(t)};
 }
 async prepareEdit(store,request,digest){
  if(store.repository!==this.core.repository||store.filterIntentJournal!==this.filter)fail('BNS_WORKING_BINDING_REQUIRED');
  if(!exact(request,['operationId','documentId','blocks'])||typeof request.operationId!=='string'||!Array.isArray(request.blocks)||request.blocks.length!==1)fail('BNS_WORKING_SCOPE_UNAVAILABLE');
  const id=request.blocks[0]?.id,at=store.clock();
  const planned=await store.run(()=>this.core.transaction(false,async t=>{
   const before=await this.snapshot(t,id,request.documentId,at);
   if(request.blocks[0].excluded!==before.b.excluded)fail('BNS_WORKING_SCOPE_UNAVAILABLE');
   const after=clone(before.b),state={conversations:[clone(before.document.value)],library:{documents:[clone(before.workingDocument.value)],blocks:[after]}};
   const result=applyDocumentEdit(state,request,at);if(!result.ok)fail('BNS_WORKING_STALE');
   if(after.libraryText===before.b.libraryText&&after.note===before.b.note)fail('BNS_WORKING_NO_CHANGE');
   const data=inputEditJournalData(before.b,after,request),revision=await planInputRevision(t,data,{now:at,uuid:()=>store.uuid()}),inputState={...clone(before.state),contentRevision:before.state.contentRevision+1,deltaSequence:(before.deltaSequence?.value||0)+1};
   return {before,after,inputState,revision,data};
  }));
  let protection,prepared;
  try{
   protection=await this.filter.prepareWorking(store,planned.before.b,at,{wrapped:this.logicalCommits});
   const changes=this.filter.workingChanges(protection);
   const values=[['input',projectEntity('input',{value:planned.after}),projectEntity('input',{value:planned.before.b})],['inputState',projectEntity('inputState',planned.inputState),projectEntity('inputState',planned.before.state)]];
   const history=new Map(planned.before.history.map(row=>[row.id,row]));history.set(planned.revision.row.id,planned.revision.row);
   for(const row of history.values())values.push(['revision',projectEntity('revision',row),planned.before.history.find(x=>x.id===row.id)?projectEntity('revision',planned.before.history.find(x=>x.id===row.id)):null]);
   for(const [type,value,previous]of values){
    if(this.logicalCommits&&await this.core.read('head',type,value.id))fail('BNS_WORKING_LEGACY_HEAD_UNSUPPORTED');
    const wireType=this.logicalCommits?'inputWorkingMember':type,wireId=this.logicalCommits?type+':'+value.id:value.id,head=await this.core.read('head',wireType,wireId);if(head?.purged||head?.revisions.length>1)fail('BNS_OWNER_CHANGED');
    if(head){const row=await this.core.read('revision',head.revisions[0]);let prior=this.logicalCommits?row?.operation.value.entity:row?.operation.value;
     if(this.logicalCommits&&type==='inputState'){const owner=await this.core.read('workingOwner',value.id);if(owner)prior={...prior,deltaSequence:owner.deltaSequence};}
     if(this.logicalCommits&&type==='revision'){const owner=await this.core.read('workingHistory',value.id);if(owner){if(owner.revisionId!==head.revisions[0])fail('BNS_OWNER_CHANGED');prior={...prior,sequence:owner.sequence,listKey:[prior.entityKey,owner.sequence],documentList:[prior.documentId,owner.sequence]};}}
     if(!equal(prior,previous))fail('BNS_OWNER_CHANGED');if(!this.logicalCommits&&equal(previous,value))continue;}
    else if(type==='input'&&(planned.before.b.revision!==0||planned.before.b.libraryText!==null||planned.before.b.note))fail('BNS_BOOTSTRAP_REQUIRED');
    changes.push({type,value,expectedParents:head?.revisions||[]});
   }
   const logicalCommit=this.logicalCommits?{id:request.operationId,inputId:planned.after.id,documentId:request.documentId,sourceRefs:planned.before.sourceRefs}:null;
   const wireChanges=this.logicalCommits?changes.map(change=>({...change,type:'inputWorkingMember',value:{id:change.type+':'+change.value.id,entityType:change.type,entity:change.value,logicalCommitId:request.operationId,datasetId:this.core.datasetId,deviceId:this.core.deviceId}})):changes;
   prepared=await this.fence.prepare(()=>this.core.prepare(wireChanges,logicalCommit?{logicalCommit}:undefined));this.filter.bindWorking(protection,prepared);
   this.prepared.set(prepared,{...planned,request:clone(request),digest,at,store,prepared});return prepared;
  }catch(e){if(protection)this.filter.release(protection);if(prepared)this.filter.release(prepared);throw e;}
 }
 async authorize(t,prepared,request,digest){
  const p=this.prepared.get(prepared);if(!p||p.digest!==digest||!equal(p.request,request)||p.store.filterIntentJournal!==this.filter)fail('BNS_PREPARATION_REQUIRED');
  if(!sameSnapshot(await this.snapshot(t,p.before.b.id,request.documentId,p.at),p.before))fail('BNS_OWNER_CHANGED');
  this.transactions.set(t,p);
 }
 pruneTime(t){return this.transactions.get(t)?.at??null;}
 editTime(t){const p=this.transactions.get(t);if(!p)fail('BNS_PREPARATION_REQUIRED');return p.at;}
 revisionPlan(t,data){const p=this.transactions.get(t);if(!p)return null;if(!equal(data,p.data)||p.revisionUsed)fail('BNS_WORKING_REVISION_CHANGED');p.revisionUsed=true;return clone(p.revision);}
 protectionFor(t,b,reason,userEdited){const p=this.transactions.get(t);if(!p||b.id!==p.after.id||reason!=='user_edit'||userEdited!==true)fail('BNS_WORKING_SCOPE_UNAVAILABLE');return p.prepared;}
 async commit(t,prepared){
  const p=this.prepared.get(prepared);if(!p||this.transactions.get(t)!==p||!p.revisionUsed)fail('BNS_PREPARATION_REQUIRED');
  if(!equal((await t.get('blocks',p.after.id))?.value,p.after)||!equal(await t.get('inputStates',p.after.id),p.inputState)||!equal(await t.get('revisions',p.revision.row.id),p.revision.row))fail('BNS_WORKING_OWNER_DIVERGED');
  for(const operation of prepared.operations.map(x=>x.type==='inputWorkingMember'?{...x,type:x.value.entityType,entityId:x.value.entity.id,value:x.value.entity}:x).filter(x=>x.type==='filterIntent'))if(!equal(await t.get('filterIntents',operation.entityId),operation.value))fail('BNS_WORKING_OWNER_DIVERGED');
  await this.fence.commit(t,prepared);const result=await this.core.commitPrepared(t,prepared,{materialize:false});
  if(this.logicalCommits)for(const operation of prepared.operations){if(operation.type!=='inputWorkingMember')continue;const value=operation.value.entity;if(operation.value.entityType==='input')await this.core.put(t,'workingOwner',[value.id],{revisionId:operation.revisionId,deltaSequence:p.inputState.deltaSequence});if(operation.value.entityType==='revision')await this.core.put(t,'workingHistory',[value.id],{revisionId:operation.revisionId,sequence:value.sequence});}return result;
 }
 release(prepared){this.filter.release(prepared);this.prepared.delete(prepared);}
}
