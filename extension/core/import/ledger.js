import {fail,LIMITS} from './errors.js';
import {prepareRows,validHash} from './contract.js';
import {SUPPORTED_EXPORT_ADAPTER_IDS} from './registry.js';
import {CONSENT_VERSION} from '../constants.js';
import {unknownTime} from '../record-time.js';
import {blockIndex} from '../idb-repository.js';
import {applyOfficialTime} from './official-time.js';
import {importedTimeChanged,importedBranchChanged} from './library-integration.js';
const taskID=v=>typeof v==='string'&&/^[a-f0-9-]{36}$/.test(v);
const sequence=v=>{if(!Number.isSafeInteger(v)||v<0||v>LIMITS.rows)fail('INVALID_IMPORT');};
const terminal=['completed','partial','cancelled'];
const counts=()=>({added:0,duplicates:0,ignored:0,enriched:0,issues:0,newSources:0,newInputs:0,review:0,removed:0,timeEnriched:0,metadataEnriched:0});
const view=t=>({taskId:t.id,phase:t.phase,checkedBatches:t.checkedBatches,committedBatches:t.committedBatches,rows:t.rows,preview:{...t.preview},counts:{...counts(),...t.counts},inspection:t.inspection||null,provider:'official_export',adapterId:t.adapterId,profileVersion:t.profileVersion||1,realExportVerified:false,createdAt:t.createdAt||null,completedAt:t.completedAt||null});
export class ImportLedger {
 constructor(store,{verifiedAdapters=SUPPORTED_EXPORT_ADAPTER_IDS}={}){this.store=store;this.adapters=new Set(verifiedAdapters);this.grants=new Map();}
 authorize(q,owner){const g=this.grants.get(q.grant);if(!g||g.owner!==owner||g.taskId!==q.taskId||g.expires<Date.now())fail('IMPORT_SESSION_EXPIRED');return g;}
 async begin(q,owner){
  if(q.consent!==true)fail('CONSENT_REQUIRED');if(!this.adapters.has(q.adapterId))fail('SCHEMA_UNVERIFIED');
  if(!validHash(q.fingerprint)||typeof owner!=='string'||!owner.length||owner.length>300||q.taskId!==undefined&&!taskID(q.taskId))fail('INVALID_IMPORT');
  await this.store.finishFoundation?.();
  const result=await this.store.run(()=>this.store.repository.transaction(true,async t=>{
   const c=await this.store.control(t);if(c.settings.consentVersion!==CONSENT_VERSION)fail('CONSENT_REQUIRED');
   let task=q.taskId?await t.get('importTasks',q.taskId):null;
   if(q.taskId&&!task||task?.phase==='cancelled')fail('IMPORT_STATE');
   if(task&&(task.fingerprint!==q.fingerprint||task.adapterId!==q.adapterId))fail('IMPORT_FILE_MISMATCH');
   if(!task)task={id:crypto.randomUUID(),fingerprint:q.fingerprint,adapterId:q.adapterId,profileVersion:1,createdAt:this.store.clock(),phase:'checking',checkedBatches:0,committedBatches:0,rows:0,preview:{added:0,duplicates:0,ignored:0,issues:0,conversations:0,estimatedTextBytes:0,knownTime:0,unknownTime:0,review:0,removed:0},counts:counts()};
   if(task.phase==='paused')task.phase=task.resumePhase;await t.put('importTasks',task);return view(task);
  }));
  for(const [token,g]of this.grants)if(g.taskId===result.taskId||g.expires<Date.now())this.grants.delete(token);
  const grant=crypto.randomUUID();this.grants.set(grant,{owner,taskId:result.taskId,expires:Date.now()+30*60*1000});return {...result,grant};
 }
 async status(id){
  if(!taskID(id))fail('INVALID_IMPORT');
  return this.store.run(()=>this.store.repository.transaction(false,async t=>{
   const task=await t.get('importTasks',id);if(!task)fail('IMPORT_STATE');const v=view(task);
   v.needsFile=![...this.grants.values()].some(g=>g.taskId===id&&g.expires>=Date.now());
   if(v.needsFile&&!terminal.includes(v.phase))v.phase='awaiting_file';return v;
  }));
 }
 async list(after){
  if(after!==undefined&&!taskID(after))fail('INVALID_IMPORT');
  return this.store.run(()=>this.store.repository.transaction(false,async t=>{
   const page=await t.page('importTasks',{limit:20,after});
   return {tasks:page.rows.map(x=>({...view(x.value),needsFile:true,phase:terminal.includes(x.value.phase)?x.value.phase:'awaiting_file'})),nextCursor:page.next};
  }));
 }
 latest(){return this.store.run(()=>this.store.repository.transaction(false,async t=>({lastImport:(await t.get('meta','history-completion'))?.lastImport||null}),['meta']));}
 async preflight(q,owner){
  this.authorize(q,owner);sequence(q.sequence);const batch=await prepareRows(q.rows);
  return this.store.run(()=>this.store.repository.transaction(true,async t=>{
   this.authorize(q,owner);const task=await t.get('importTasks',q.taskId);
   if(!task||['paused','cancelled'].includes(task.phase))fail('IMPORT_STATE');
   const key=q.taskId+':'+q.sequence,prior=await t.get('importBatches',key);
   if(prior){if(prior.digest!==batch.digest)fail('IMPORT_BATCH_MISMATCH');return view(task);}
   if(task.phase!=='checking'||q.sequence!==task.checkedBatches||task.rows+batch.rows.length>LIMITS.rows)fail('IMPORT_STATE');
   for(const r of batch.rows){
    if(await t.get('tombstones','source:'+r.sourceKey)||await t.get('tombstones','snapshot:'+r.dedupeKey)){task.preview.ignored++;continue;}
    const sourceID=q.taskId+':source:'+r.sourceKey,proof=await t.get('importEvidence',sourceID)||{id:sourceID,taskId:q.taskId,sourceKey:r.sourceKey,time:null,conflict:false,branch:r.branch,parentSourceKey:r.parentSourceKey,relationConflict:false};
    const wasConflict=proof.conflict||proof.relationConflict;
    if(proof.branch!==r.branch||proof.parentSourceKey!==r.parentSourceKey){proof.relationConflict=true;proof.branch='ambiguous';proof.parentSourceKey=null;}
    if(r.timeInvalid)proof.conflict=true;if(r.time){if(proof.time&&proof.time!==r.time)proof.conflict=true;else proof.time=r.time;}
    await t.put('importEvidence',proof);
    if(r.timeInvalid||r.branch!=='current'||!wasConflict&&(proof.conflict||proof.relationConflict))task.preview.issues++;
    const snapshotID=q.taskId+':snapshot:'+r.dedupeKey,seen=await t.get('importEvidence',snapshotID),exists=await t.count('recordIndex','byDedupe',r.dedupeKey);
    task.preview[seen||exists?'duplicates':'added']++;
    if(!seen){
     await t.put('importEvidence',{id:snapshotID,taskId:q.taskId,sourceKey:r.sourceKey});
     if(!exists)task.preview.estimatedTextBytes+=new TextEncoder().encode(r.text+r.title).length;
     const timeKey=r.time&&!proof.conflict?'knownTime':'unknownTime';task.preview[timeKey]=(task.preview[timeKey]||0)+1;
     if(r.branch!=='current')task.preview.review=(task.preview.review||0)+1;
     if(this.store.repository.ia&&await t.get('inputRemovals',r.sourceKey))task.preview.removed=(task.preview.removed||0)+1;
    }
    const chatID=q.taskId+':chat:'+r.chatHash;
    if(!await t.get('importEvidence',chatID)){await t.put('importEvidence',{id:chatID,taskId:q.taskId,sourceKey:r.sourceKey});task.preview.conversations++;}
   }
   task.checkedBatches++;task.rows+=batch.rows.length;await t.put('importBatches',{id:key,taskId:q.taskId,digest:batch.digest});await t.put('importTasks',task);return view(task);
  }));
 }
 async ready(q,owner){
  this.authorize(q,owner);sequence(q.batches);sequence(q.issues??0);
  if(q.inspection){if(typeof q.inspection!=='object'||Array.isArray(q.inspection)||Object.keys(q.inspection).some(k=>!['skippedConversations','skippedMessages','invalidTimes','unknownEntries'].includes(k)))fail('INVALID_IMPORT');for(const v of Object.values(q.inspection))sequence(v);}
  return this.store.run(()=>this.store.repository.transaction(true,async t=>{
   this.authorize(q,owner);const task=await t.get('importTasks',q.taskId);
   if(!task||['paused','cancelled'].includes(task.phase)||task.checkedBatches!==q.batches)fail('IMPORT_STATE');
   if(task.phase==='checking'){task.phase='ready';task.inspection=q.inspection||null;task.skippedIssues=q.issues??0;task.preview.issues+=task.skippedIssues;task.counts.issues+=task.skippedIssues;}
   else if(task.skippedIssues!==(q.issues??0)||JSON.stringify(task.inspection||null)!==JSON.stringify(q.inspection||null))fail('IMPORT_BATCH_MISMATCH');
   await t.put('importTasks',task);return view(task);
  }));
 }
 async commit(q,owner){
  this.authorize(q,owner);sequence(q.sequence);const batch=await prepareRows(q.rows);await this.store.finishFoundation?.();
  if(typeof this.store.filterMutation==='number')this.store.filterMutation++;
  try{return await this.store.run(()=>this.store.repository.transaction(true,async t=>{
   this.authorize(q,owner);const task=await t.get('importTasks',q.taskId),key=q.taskId+':'+q.sequence,proof=await t.get('importBatches',key);
   if(!task||!['ready','importing','completed','partial'].includes(task.phase)||!proof)fail('IMPORT_STATE');
   if(proof.digest!==batch.digest)fail('IMPORT_BATCH_MISMATCH');if(proof.receipt)return proof.receipt;
   if(q.sequence!==task.committedBatches)fail('IMPORT_STATE');
   const c=await this.store.control(t);if(c.settings.consentVersion!==CONSENT_VERSION)fail('CONSENT_REQUIRED');
   const seq=await t.get('meta','sequence'),docs=new Set(),count=counts();
   for(const r of batch.rows){
    if(await t.get('tombstones','source:'+r.sourceKey)||await t.get('tombstones','snapshot:'+r.dedupeKey)){count.ignored++;continue;}
    if(await t.count('recordIndex','bySource',r.sourceKey)>2048||await t.count('recordIndex','byLegacyChat','chatgpt:'+r.chatId)>2048)fail('RESOURCE_LIMIT');
    const chat={id:r.chatId,url:'https://chatgpt.com/c/'+r.chatId,title:r.title},selected=await this.store.recordsFor(t,chat,r.messageId,r.sourceKey,r,[]);
    const exists=await t.count('recordIndex','byDedupe',r.dedupeKey),newSource=selected.length===0;
    const removed=this.store.repository.ia&&!!await t.get('inputRemovals',r.sourceKey);
    if(removed)count.removed++;
    let addedRecord=null;
    if(!exists){
     const now=this.store.clock();addedRecord={id:this.store.uuid(),platform:'chatgpt',chatId:r.chatId,chatUrl:chat.url,chatTitle:r.title,sourceMessageId:r.messageId,pageOrder:r.order,originalText:r.text,contentHash:r.contentHash,dedupeKey:r.dedupeKey,sourceKey:r.sourceKey,...unknownTime(),conversationOrder:r.order,capturedAt:now,importedAt:now,importProvider:'official_export',importProfile:task.adapterId,previousVersionId:selected.at(-1)?.r.id||null,note:'',editedText:'',hidden:false,deletedAt:null,updatedAt:now};
     selected.push({r:addedRecord,index:{sequence:seq.records++}});count.added++;if(newSource)count.newSources++;
    }else count.duplicates++;
    const timeProof=await t.get('importEvidence',q.taskId+':source:'+r.sourceKey);if(!timeProof)fail('IMPORT_STATE');
    const priorRelation=await t.get('importSources',r.sourceKey),relation={branch:timeProof.branch,parentSourceKey:timeProof.parentSourceKey,conflict:timeProof.relationConflict===true};
    if(priorRelation&&(priorRelation.conflict||priorRelation.branch!==relation.branch||priorRelation.parentSourceKey!==relation.parentSourceKey)){relation.conflict=true;relation.branch='ambiguous';relation.parentSourceKey=null;}
    const timeRow=await t.get('times',r.sourceKey),ledger=structuredClone(timeRow?.value||{blocked:false,createTime:null});
    const oldTimes=new Map(selected.filter(x=>x.r!==addedRecord).map(x=>[x.r.id,x.r.sourceSentAt]));
    count.enriched+=applyOfficialTime(selected.map(x=>x.r),ledger,timeProof);
    count.timeEnriched+=selected.filter(x=>oldTimes.has(x.r.id)&&oldTimes.get(x.r.id)!==x.r.sourceSentAt).length;
    if(relation.conflict||ledger.officialExport.conflict||timeProof.conflict||r.timeInvalid||r.branch!=='current')count.issues++;
    if(relation.branch!=='current')count.review++;
    if(!timeRow||JSON.stringify(timeRow.value)!==JSON.stringify(ledger))await t.put('times',{id:r.sourceKey,value:ledger});
    let metadataChanged=false;
    for(const {r:record,index}of selected){
     const old=await t.get('records',record.id);
     if(old){if(!record.chatTitle&&r.title){record.chatTitle=r.title;metadataChanged=true;}if(record.conversationOrder==null&&relation.branch==='current'&&r.order!==null){record.conversationOrder=r.order;metadataChanged=true;}}
     let changed=!old||JSON.stringify(old.value)!==JSON.stringify(record);if(changed)await this.store.saveRecord(t,record,index);
     if(old&&old.value.sourceSentAt!==record.sourceSentAt)await importedTimeChanged(this.store,t,record.id);
     if(old)for(const id of await importedBranchChanged(this.store,t,record.id,relation.branch))docs.add(id);
     if(record===addedRecord&&newSource){
      const doc=await this.store.defaultBlock(t,record,seq,{branch:relation.branch});if(doc)docs.add(doc);
      const b=(await t.get('blocks','block:'+record.id))?.value;
      if(b){count.newInputs+=!b.excluded?1:0;if(this.store.initialFilter){const m=await t.get('inputStates',b.id);await t.put('filterInputs',this.store.initialFilter(b,m));}}
     }
     if(changed){for(const b of await t.all('blockIndex','byRecord',record.id))docs.add(b.documentId);for(const d of await t.all('documents','byChat','chatgpt:'+record.chatId))docs.add(d.id);}
    }
    if(metadataChanged)count.metadataEnriched++;
    if(r.title)for(const doc of await t.all('documents','byChat','chatgpt:'+r.chatId,2)){
     if(!doc.value.originalConversationTitle){doc.value.originalConversationTitle=r.title;await t.put('documents',doc);const ld=await t.get('libraryDocuments',doc.id);if(ld&&!ld.value.originalConversationTitle){ld.value.originalConversationTitle=r.title;await t.put('libraryDocuments',ld);}}
    }
    const nextRelation={id:r.sourceKey,sourceKey:r.sourceKey,provider:'official_export',profileId:task.adapterId,profileVersion:task.profileVersion||1,...relation};if(JSON.stringify(priorRelation)!==JSON.stringify(nextRelation))await t.put('importSources',nextRelation);
   }
   for(const id of docs)await this.store.refreshDoc(t,id);
   task.phase='importing';task.committedBatches++;task.counts={...counts(),...task.counts};
   for(const k of Object.keys(count))task.counts[k]+=count[k];
   if(task.committedBatches===1){const onboarding=await t.get('meta','first-run-onboarding');if(onboarding){onboarding.historyState='partial';onboarding.step='done';onboarding.updatedAt=this.store.clock();await t.put('meta',onboarding);}}
   const receipt={sequence:q.sequence,counts:count,cumulativeCounts:{...task.counts}};
   await t.put('meta',seq);await t.put('importBatches',{...proof,receipt});await t.put('importTasks',task);return receipt;
  }));}finally{if(typeof this.store.filterMutation==='number')this.store.filterMutation++;}
 }
 async pause(q,owner){
  this.authorize(q,owner);
  const result=await this.store.run(()=>this.store.repository.transaction(true,async t=>{
   const task=await t.get('importTasks',q.taskId);if(!task)fail('IMPORT_STATE');
   if(![...terminal,'paused'].includes(task.phase)){task.resumePhase=task.phase;task.phase='paused';await t.put('importTasks',task);}return view(task);
  }));this.grants.delete(q.grant);return result;
 }
 async cancel(q,owner){
  if(!taskID(q.taskId)||typeof owner!=='string'||!owner)fail('INVALID_IMPORT');
  if(q.grant)this.authorize(q,owner);
  const result=await this.store.run(()=>this.store.repository.transaction(true,async t=>{
   const task=await t.get('importTasks',q.taskId);if(!task)fail('IMPORT_STATE');
   if(!terminal.includes(task.phase)){task.phase='cancelled';task.cancelledAt=this.store.clock();await t.put('importTasks',task);}return view(task);
  }));
  for(const [k,g]of this.grants)if(g.taskId===q.taskId)this.grants.delete(k);return result;
 }
 async complete(q,owner){
  this.authorize(q,owner);
  const result=await this.store.run(()=>this.store.repository.transaction(true,async t=>{
   this.authorize(q,owner);const task=await t.get('importTasks',q.taskId);
   if(!task||!['ready','importing','completed','partial'].includes(task.phase)||task.committedBatches!==task.checkedBatches)fail('IMPORT_STATE');
   task.phase=task.counts.issues?'partial':'completed';task.completedAt??=this.store.clock();
   await t.put('importTasks',task);const result=view(task);await t.put('meta',{id:'history-completion',lastImport:result});
   const onboarding=await t.get('meta','first-run-onboarding');
   if(onboarding){onboarding.historyState=task.phase==='partial'?'partial':'completed';onboarding.step='done';onboarding.updatedAt=this.store.clock();await t.put('meta',onboarding);}
   return result;
  }));this.grants.delete(q.grant);return result;
 }
 async resolveBranch(q){
  const action=q.action||'current';
  if(typeof q.id!=='string'||!Number.isInteger(q.expectedRevision)||!this.store.operation||!['current','existing','standalone','ignore'].includes(action)||action==='existing'&&(typeof q.documentId!=='string'||q.documentId.length>200)||q.documentId!==undefined&&action!=='existing')fail('INVALID_IMPORT');
  return this.store.operation(q,async t=>{
   const row=await t.get('blocks',q.id);if(!row?.value.branchStatus)fail('IMPORT_STATE');
   const b=row.value;if(b.revision!==q.expectedRevision)fail('IMPORT_STATE');if(!await this.store.sourcePresent(t,b.provenance.map(p=>p.sourceRecordId)))fail('IMPORT_STATE');
   const before=structuredClone(b),oldDocumentId=b.documentId;
   if(action==='existing'){if(!await t.get('documents',q.documentId))fail('IMPORT_STATE');b.documentId=q.documentId;}
   if(action==='standalone'){
    const id='document:'+this.store.uuid(),seq=await t.get('meta','sequence');
    const doc={id,platform:'chatgpt',sourceConversationId:null,originalConversationTitle:'',userTitle:'待确认输入 · 独立整理',summaryPlaceholder:'',futureAISummary:null,firstSourceSentAt:null,lastSourceSentAt:null,status:'active',aiSuggestionStatus:'none',titleRevision:0};
    await t.put('documents',{id,value:doc,sequence:seq.documents++,displayKey:[0,id]});const working={...doc};delete working.titleRevision;await t.put('libraryDocuments',{id,value:working});await t.put('meta',seq);b.documentId=id;
   }
   delete b.branchStatus;b.excluded=action==='ignore';b.status=b.excluded?'excluded_by_user':'active';b.revision++;
   await this.store.afterInputEdit(t,[before],[b],{},{},{});
   const meta=await t.get('inputStates',b.id);meta.documentId=b.documentId;meta.removalState=b.excluded?'user_removed':'active';await t.put('inputStates',meta);await this.store.markRemoval(t,b,b.excluded);
   const filter=await t.get('filterInputs',b.id);if(filter){filter.documentId=b.documentId;await t.put('filterInputs',filter);}
   // Body revisions follow the same Input; only their document lookup changes.
   // No source, authored snapshot, sequence or timestamp is rewritten.
   if(oldDocumentId!==b.documentId)for(const r of await t.all('revisions','byEntity','input:'+b.id)){r.documentId=b.documentId;r.documentList=[b.documentId,r.sequence];await t.put('revisions',r);}
   await t.put('blocks',row);const ix=await t.get('blockIndex',b.id),records=[];
   for(const p of b.provenance){const r=await t.get('records',p.sourceRecordId);if(r)records.push(r.value);}
   await t.put('blockIndex',blockIndex(b,ix.sequence,records));await this.store.trackBlock(t,b);if(oldDocumentId!==b.documentId)await this.store.refreshDoc(t,oldDocumentId);await this.store.refreshDoc(t,b.documentId);return {id:b.id,revision:b.revision,documentId:b.documentId,action};
  });
 }
 revokeOwner(owner){for(const [key,g]of this.grants)if(g.owner===owner)this.grants.delete(key);}
}
