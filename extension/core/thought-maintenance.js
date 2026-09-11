import {hashText} from './dedupe.js';
import {fail,prefix,refreshEntryIndex,keyedHash,markHuman} from './thought-model.js';
import {nextSequence} from './thought-journal.js';
import {inputProjection} from './thought-evidence.js';

export async function enqueueInvalidation(store,t,inputId,reason,contentRevision,context={}) {
 const sequence=await nextSequence(t,'thought-epoch'),id=store.uuid();
 if(reason==='input_removed'){const m=await t.get('inputStates',inputId);if(m){m.lastRemovalSequence=sequence;await t.put('inputStates',m);}}
 await t.put('invalidations',{id,eventSchema:2,inputId,reason,contentRevision,sequence,at:store.clock(),stateKey:0,state:'pending',cursor:null,dependencyAck:false,organizerAck:false,...(context.operationId?{operationId:context.operationId}:{}),...(context.revisionReason?{revisionReason:context.revisionReason}:{})});
}
export async function beforeSourcePurge(store,t,records,blocks) {
 const sequence=await nextSequence(t,'thought-epoch'),sourceRecordIds=records.map(r=>r.id),id=store.uuid();
 // The tombstone is committed by the frozen source transaction. This metadata-only
 // job/fence shares that transaction; no Thought fan-out or raw payload is copied.
 await t.put('organizerJobs',{id,kind:'purge_cleanup',state:'queued',stateKey:0,sequence,nextAttemptAt:0,priority:0,sourceRecordIds,stage:0,cursor:null,createdAt:store.clock()});
 for(const [inputId]of blocks) {
  const meta=await t.get('inputStates',inputId);if(meta){meta.sourcePurged=true;meta.sourceRecordIds=meta.sourceRecordIds.filter(x=>!sourceRecordIds.includes(x));await t.put('inputStates',meta);}
  await enqueueInvalidation(store,t,inputId,'source_purged',null);
  await t.delete('filterInputs',inputId);
  await t.delete('meta','memory:input:'+JSON.stringify([inputId]));
 }
 for(const r of records)await t.delete('filterIntents',r.sourceKey||'legacy:'+r.id);
}
export async function invalidationBatch(store,limit=100) {
 if(!Number.isInteger(limit)||limit<1||limit>100)fail();
 const work=await store.run(()=>store.repository.transaction(false,async t=>{
  const event=await t.edge('invalidations','byPending',prefix([0]));if(!event)return null;
  const page=await t.rangePage('dependencies','byInputTarget',prefix([event.inputId]),event.cursor,limit),input=await inputProjection(store,t,event.inputId),secret=(await t.get('meta','thought-suppression-key'))?.value,linked={};
  for(const {value:dep}of page.rows)if(dep.targetKind==='entry'){const row=await t.get('thoughts',dep.targetId);if(row?.workingInputId===event.inputId)linked[dep.id]={entryId:row.id,type:row.type};}
  return {event,page,input,secret,linked};
 }));
 if(!work)return {processed:0,pending:false};
 const digests={},tokens={},exact={};if(work.input){digests.body=await hashText(work.input.body);digests.note=await hashText(work.input.note);for(const {value:dep}of work.page.rows){if(work.secret&&dep.scopeToken){const selected={};for(const field of dep.selectedFields||[])selected[field]=digests[field];tokens[dep.id]=await keyedHash(work.secret,['version',dep.scopeToken,selected]);}}for(const info of Object.values(work.linked)){if(exact[info.entryId]||!work.secret)continue;exact[info.entryId]={signature:await keyedHash(work.secret,['body',info.type,work.input.body]),key:await keyedHash(work.secret,['original-exact',info.type,work.input.body])};}}
 await store.repository.checkpoint('thought-invalidation-read');
 return store.foundationWrite(async t=>{
  const event=await t.get('invalidations',work.event.id);if(!event||event.stateKey!==0||JSON.stringify(event.cursor)!==JSON.stringify(work.event.cursor))return {processed:0,pending:true};
  const current=await inputProjection(store,t,event.inputId);if(current?.contentRevision!==work.input?.contentRevision||!!current!==!!work.input)return {processed:0,pending:true};
  let processed=0;
  for(const {value:old}of work.page.rows) {
   const dep=await t.get('dependencies',old.id);if(!dep)continue;
   let row=dep.targetKind==='entry'?await t.get('thoughts',dep.targetId):null,shared=!!row&&row.workingInputId===event.inputId,missing=!current||(!shared&&(current.lastRemovalSequence||0)>(dep.eligibilityEpochAtUse||0)),changed=!missing&&(!dep.selectedFields?.length||dep.selectedFields.some(f=>digests[f]!==dep.fieldDigests?.[f]));
   let keepSharedDependency=false;
   if(row&&shared&&current){
    const bodyChanged=row.thoughtText!==current.body,wasInvalid=row.lifecycle==='invalidated';if(bodyChanged){row.thoughtText=current.body;row.fieldRevisions.body=(row.fieldRevisions.body||0)+1;row.contentRevision=(row.contentRevision||0)+1;row.revision=(row.revision||0)+1;if(event.operationId)markHuman(row,'body',event.operationId,store.clock(),'shared_input_edit');row.meaningfulContentAt=store.clock();}if(wasInvalid){row.lifecycle='active';row.revision=(row.revision||0)+1;}
    row.freshness='current';row.integrity='complete';row.staleReasons=(row.staleReasons||[]).filter(x=>!['source_updated','input_removed','context_updated','shared_sync_pending'].includes(x));row.dependencyRevision=(row.dependencyRevision||0)+1;row.updatedAt=store.clock();row.updatedSequence=await nextSequence(t);if(exact[row.id]){row.exactSignature=exact[row.id].signature;row.exactKey=exact[row.id].key;}refreshEntryIndex(row);await t.put('thoughts',row);if(store.librarySafetyChange)await store.librarySafetyChange(t,row);
    const selected={};for(const field of dep.selectedFields||[])selected[field]=digests[field];dep.basedOnContentRevision=current.contentRevision;dep.validatedAgainstContentRevision=current.contentRevision;dep.fieldDigests={...dep.fieldDigests,...selected};if(tokens[dep.id])dep.versionToken=tokens[dep.id];dep.eligibilityEpochAtUse=event.sequence;dep.status='valid';dep.lastEventSequence=event.sequence;await t.put('dependencies',dep);row.inputRefs=(row.inputRefs||[]).map(ref=>ref.inputBlockId===event.inputId?{...ref,basedOnContentRevision:current.contentRevision}:ref);await t.put('thoughts',row);processed++;continue;
   }
   if(row) {
    keepSharedDependency=missing&&shared;
    if(missing||changed){row.freshness='stale';row.staleReasons=[...new Set([...(row.staleReasons||[]),missing?event.reason:dep.roles?.includes('context_only')?'context_updated':'source_updated'])];row.dependencyRevision=(row.dependencyRevision||0)+1;row.revision=(row.revision||0)+1;}
    if(missing&&keepSharedDependency){row.integrity='detached';row.lifecycle='invalidated';}
    else if(missing){await t.delete('dependencies',dep.id);const others=await t.all('dependencies','byTarget',prefix(['entry',row.id]));let valid=0;for(const other of others)if(other.roles?.some(r=>r!=='context_only')){const p=await inputProjection(store,t,other.inputId);if(p&&(p.lastRemovalSequence||0)<=(other.eligibilityEpochAtUse||0))valid++;}row.integrity=valid?'partial':'detached';if(!valid&&!row.hasHumanAction&&row.origin==='ai'&&row.lifecycle==='active')row.lifecycle='invalidated';row.inputRefs=(row.inputRefs||[]).filter(r=>r.inputBlockId!==event.inputId);}
    refreshEntryIndex(row);await t.put('thoughts',row);if(store.librarySafetyChange)await store.librarySafetyChange(t,row);
   }
   if(!missing){dep.status=changed?'source_updated':'valid';dep.validatedAgainstContentRevision=current.contentRevision;dep.lastEventSequence=event.sequence;await t.put('dependencies',dep);}else if(keepSharedDependency){dep.status=event.reason;dep.lastEventSequence=event.sequence;await t.put('dependencies',dep);}else await t.delete('dependencies',dep.id);
   processed++;
  }
  event.cursor=work.page.next;if(event.cursor===null){event.stateKey=1;event.state='completed';event.dependencyAck=true;}await t.put('invalidations',event);return {processed,pending:true};
 });
}
const CLEANUP_STORES=['unknownQuarantine','thoughts','revisions','provenance','dependencies','organizerSuggestions','organizerWorkItems','librarySearchTerms','entryRelations','libraryMigrationItems','organizerJobs'];
export async function purgeBatch(store,limit=100) {
 if(!Number.isInteger(limit)||limit<1||limit>100)fail();
 return store.foundationWrite(async t=>{
  const job=await t.edge('organizerJobs','byMaintenance',prefix(['purge_cleanup',0]));if(!job)return {processed:0,pending:false};
  const name=CLEANUP_STORES[job.stage];if(!name){job.state='completed';job.stateKey=1;delete job.sourceRecordIds;await t.put('organizerJobs',job);return {processed:0,pending:true};}
  if(name==='unknownQuarantine'){
   const row=await t.edge('thoughts','byQuarantine',prefix([1]));
   if(row){const history=await t.all('revisions','byEntity','thought:'+row.id,limit);for(const revision of history)await t.delete('revisions',revision.id);if(history.length<limit)await t.delete('thoughts',row.id);await t.put('organizerJobs',job);return {processed:history.length+1,pending:true};}
   job.stage++;job.sourceOffset=0;await t.put('meta',{...(await t.get('meta','thought-library')),sealed:0,libraryActivation:'ready'});await t.put('organizerJobs',job);return {processed:0,pending:true};}

  const sourceId=job.sourceRecordIds[job.sourceOffset||0],index=name==='thoughts'||name==='revisions'?'bySourceRecord':'bySource';
  // getAll is bounded and rows are deleted/detached, so the next batch starts at
  // the same source index key without skipping a row after a crash.
  const rows=await t.all(name,index,sourceId,limit);let processed=0;
  for(const row of rows) {
   if(name==='organizerJobs'&&row.id===job.id)continue;
   if(name==='thoughts') {
    const human=row.storageSchema===2&&(row.lifecycle==='quarantined'?row.legacyHumanEvidence:row.hasHumanAction)&&!row.quarantineSealed;
    if(human) {
     const priorFields={body:row.thoughtText,title:row.title,note:row.note};
     if(row.lifecycle==='quarantined'){for(const key of Object.keys(row))if(!['id','storageSchema','lifecycle','thoughtText','title','note','revision','contentRevision','fieldRevisions','organizationRevision','dependencyRevision','protections','authorship','hasHumanAction','userEdited','legacyHumanEvidence','sourceRecordIds'].includes(key))delete row[key];}
     row.inputRefs=(row.inputRefs||[]).filter(ref=>ref.sourceRecordId&&ref.sourceRecordId!==sourceId);
     if(row.workingInputId)delete row.workingInputId;
     row.sourceRecordIds=(row.sourceRecordIds||[]).filter(x=>x!==sourceId);row.thoughtText=row.protections?.body?.locked?row.thoughtText:'';row.title=row.protections?.title?.locked?row.title:'';row.note=row.protections?.note?.locked?row.note:'';
     row.freshness='stale';row.staleReasons=[...new Set([...(row.staleReasons||[]),'source_purged'])];row.integrity=row.sourceRecordIds.length?'partial':'detached';row.revision=(row.revision||0)+1;row.dependencyRevision=(row.dependencyRevision||0)+1;delete row.exactKey;refreshEntryIndex(row);await t.put('thoughts',row);if(store.librarySafetyChange)await store.librarySafetyChange(t,row,priorFields);
    }else{await t.delete('thoughts',row.id);for(const p of await t.all('placements','byEntry',prefix([row.id])))await t.delete('placements',p.id);}
   }else{if(name==='libraryMigrationItems'&&row.entityKind==='organizer_metadata'&&store.clearDerivedMetadata)await store.clearDerivedMetadata(t,row);await t.delete(name,row.id);}
   processed++;
  }
  if(rows.length<limit||name==='organizerJobs'&&rows.length===1&&rows[0].id===job.id){job.sourceOffset=(job.sourceOffset||0)+1;if(job.sourceOffset>=job.sourceRecordIds.length){job.sourceOffset=0;job.stage++;}}await t.put('organizerJobs',job);return {processed,pending:true};
 });
}
