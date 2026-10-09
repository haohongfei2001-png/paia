import {CONTEXT_CARDS_ROW,validateContextChange,validContextCards} from './context-cards.js';
import {isBaseNoneEnvelope,validAIPresentationCandidate} from './organizer/ai-candidate.js';
import {validateRemovalEdit} from './archive-removal.js';
import {ArchiveError} from './constants.js';
import {chatOf} from './idb-repository.js';
import {detachSources} from './library.js';
import {recoveryDraftPrefix} from './recovery-draft.js';

const gate=()=>{throw new ArchiveError('SOURCE_PURGE_OWNER_GATE');};
const unavailable=()=>{throw new ArchiveError('SOURCE_PURGE_UNAVAILABLE');};
const prefix=p=>IDBKeyRange.bound(p,[...p,[]],false,true);
const idOK=id=>typeof id==='string'&&id.length>0&&id.length<=512;
const has=(t,name)=>t.tx.objectStoreNames.contains(name);
const humanFields=row=>{
 if(!row)return false;
 if(row.createdBy==='user'||row.userEditedAt||['hasHumanAction','userEdited','legacyHumanEvidence'].some(k=>row[k]!==undefined&&row[k]!==false))return true;
 if(row.protections!==undefined){
  if(!row.protections||typeof row.protections!=='object'||Array.isArray(row.protections))return true;
  for(const v of Object.values(row.protections))if(v!==false&&(!v||typeof v!=='object'||Array.isArray(v)||v.locked!==false))return true;
 }
 if(row.authorship!==undefined){
  if(!row.authorship||typeof row.authorship!=='object'||Array.isArray(row.authorship))return true;
  for(const v of Object.values(row.authorship))if(!v||v.actor!=='ai'||v.everHumanConfirmed!==false)return true;
 }
 return false;
};
const untouched=s=>s&&s.libraryText===null&&s.note==='';

// This is admission, never a keep/delete policy for human derivatives. Every
// traversal is complete or refuses; no prefix can authorize permanent deletion.
export async function assessSourcePurge(t,{id,key,record},rawRecovery){
 let budget=10000;
 const all=async(name,index,value,limit=1000)=>{
  const rows=await t.all(name,index,value,limit+1);
  budget-=rows.length;if(rows.length>limit||budget<0)unavailable();return rows;
 };
 const indexes=new Map((await all('recordIndex','bySource',key)).map(r=>[r.id,r]));
 if(record.chatId&&record.sourceMessageId)for(const ix of await all('recordIndex','byIdentity',[chatOf(record),record.sourceMessageId])){
  if(ix.sourceKey&&ix.sourceKey!==key)unavailable();indexes.set(ix.id,ix);
 }
 const own=await t.get('recordIndex',id);if(!own)unavailable();indexes.set(id,own);
 const records=[],blocks=new Map(),sourceIds=new Set(indexes.keys());
 for(const ix of indexes.values()){
  const r=(await t.get('records',ix.id))?.value;
  if(!r||r.sourceKey&&r.sourceKey!==key||r.platform!==record.platform||chatOf(r)!==chatOf(record)||r.sourceMessageId!==record.sourceMessageId)unavailable();
  if(typeof r.editedText!=='string'||typeof r.note!=='string')gate();
  if(r.editedText!==''||r.note!=='')gate();records.push(r);
  for(const bx of await all('blockIndex','byRecord',r.id)){
   const b=(await t.get('blocks',bx.id))?.value;if(!b||b.id!==bx.id||b.documentId!==bx.documentId)unavailable();blocks.set(b.id,{index:bx,value:b});
  }
 }
 if(blocks.size>1000)unavailable();
 for(const {value:b}of blocks.values()){
  if(!untouched(b)||b.editedAt!==null||!Array.isArray(b.provenance)||!b.provenance.length||
     b.provenance.some(p=>!sourceIds.has(p.sourceRecordId))||!Array.isArray(b.mergedSourceIds)||b.mergedSourceIds.some(id=>!sourceIds.has(id)))gate();
  if(has(t,'inputStates')){
   const state=await t.get('inputStates',b.id);
   if(!state||state.contentRevision!==0||state.sourcePurged===true)gate();
  }
 }
 // Source-linked Context remains protected pending the explicit B-02 decision,
 // independently of whether an editor currently has a recovery draft.
 const context=await t.get('meta',CONTEXT_CARDS_ROW);
 if(context&&!validContextCards(context))gate();
 const contextInputs=new Set(),contextSources=new Set(),savedFamilies=new Map();
 const point=async(name,key)=>{if(--budget<0)unavailable();return t.get(name,key);};
 const sourceList=value=>Array.isArray(value)&&value.length<=1000&&value.every(idOK)&&new Set(value).size===value.length;
 const sameIds=(a,b)=>sourceList(a)&&sourceList(b)&&a.length===b.length&&a.every(id=>b.includes(id));
 for(const item of context?.items||[])if(item.origin==='automatic')for(const evidence of item.maintenance.provenance.evidence){
  if(evidence.sourceIdentityTokens.includes(key)||blocks.has(evidence.inputId)||evidence.sourceRecordIds.some(id=>sourceIds.has(id)))gate();
  for(const sid of evidence.sourceRecordIds){contextSources.add(sid);const families=savedFamilies.get(sid)||[];families.push(evidence.sourceIdentityTokens);savedFamilies.set(sid,families);}
  if(contextInputs.has(evidence.inputId))continue;contextInputs.add(evidence.inputId);
  const block=await point('blocks',evidence.inputId),index=await point('blockIndex',evidence.inputId),state=await point('inputStates',evidence.inputId);
  // Both-owner absence can be legitimate retained pre-restore history. A
  // present-but-partial current owner cannot prove target disjointness.
  if(!block&&!index&&!state)continue;
  if(!block||!index||!state||block.id!==evidence.inputId||block.value?.id!==evidence.inputId||index.id!==evidence.inputId||state.id!==evidence.inputId||block.value.documentId!==index.documentId||block.value.documentId!==state.documentId||!Array.isArray(block.value.provenance))gate();
  const ids=block.value.provenance.map(p=>p?.sourceRecordId);
  if(!sameIds(ids,index.recordIds)||!sameIds(ids,state.sourceRecordIds))gate();
  for(const sid of ids){if(sourceIds.has(sid))gate();contextSources.add(sid);}
 }
 for(const sid of contextSources){
  const index=await point('recordIndex',sid),source=await point('records',sid);
  if(!index&&!source){if(savedFamilies.get(sid)?.some(tokens=>tokens.includes('legacy:'+sid)))gate();continue;}
  const value=source?.value;
  if(!index||!source||source.id!==sid||value?.id!==sid||index.id!==sid||index.sourceKey!==value.sourceKey||index.sourceMessageId!==value.sourceMessageId||index.chatKey!==chatOf(value)||index.dedupeKey!==value.dedupeKey)gate();
  if(savedFamilies.get(sid)?.some(tokens=>!tokens.includes(value.sourceKey)&&!tokens.includes('legacy:'+sid)))gate();
  if(!value.sourceKey&&(!idOK(value.sourceMessageId)||!value.chatId&&!value.chatUrl))gate();
  if(value.sourceKey===key||value.platform===record.platform&&chatOf(value)===chatOf(record)&&value.sourceMessageId===record.sourceMessageId)gate();
 }
 const thoughts=new Map(),metadataOwners=new Set(),topicIds=new Set();
 if(has(t,'thoughts')){
  if(t.tx.objectStore('thoughts').indexNames.contains('byQuarantine')&&await t.edge('thoughts','byQuarantine',prefix([1])))gate();
  for(const sid of sourceIds)for(const row of await all('thoughts','bySourceRecord',sid))thoughts.set(row.id,row);
  if(has(t,'dependencies')){
   const current=t.tx.objectStore('dependencies').indexNames.contains('byInputTarget');
   if(!current&&!t.tx.objectStore('dependencies').indexNames.contains('byInput'))unavailable();
   for(const bid of blocks.keys())for(const dep of await all('dependencies',current?'byInputTarget':'byInput',current?prefix([bid]):bid)){
    const tid=current?dep.targetId:dep.thoughtId;if(current&&dep.targetKind!=='entry'||!idOK(tid))gate();
    const row=await t.get('thoughts',tid);if(!row)gate();thoughts.set(row.id,row);
   }
  }
  for(const row of thoughts.values()){
   if(row.storageSchema!==2||row.quarantineSealed||row.lifecycle==='quarantined'||humanFields(row)||row.origin!=='ai'||
      row.hasHumanAction!==false||row.userEdited!==false||!Array.isArray(row.sourceRecordIds))gate();
   if(has(t,'placements'))for(const p of await all('placements','byEntry',prefix([row.id])))topicIds.add(p.topicId);
  }
 }
 if(has(t,'revisions')){
  const revisions=new Map();
  for(const sid of sourceIds)for(const row of await all('revisions','bySourceRecord',sid))revisions.set(row.id,row);
  for(const bid of blocks.keys())for(const row of await all('revisions','byEntity','input:'+bid))revisions.set(row.id,row);
  for(const tid of thoughts.keys())for(const row of await all('revisions','byEntity','thought:'+tid))revisions.set(row.id,row);
  for(const row of revisions.values()){
   if(row.kind==='input'){
    if(!['baseline','migration','remove','restore'].includes(row.reason)||!untouched(row.before)||!untouched(row.after))gate();
   }else if(row.actor!=='ai'||humanFields(row.before)||humanFields(row.after))gate();
  }
 }
 if(has(t,'libraryMigrationItems')){
  for(const name of ['topics','sections'])for(const row of await all(name,undefined,undefined)){
   if(row.sourceRecordIds?.some(id=>sourceIds.has(id))){metadataOwners.add(row.id);if(humanFields(row))gate();}
  }
  for(const sid of sourceIds)for(const relation of await all('entryRelations','bySource',sid))if(relation.actor!=='ai')gate();
  const markers=new Map();for(const sid of sourceIds)for(const m of await all('libraryMigrationItems','bySource',sid))markers.set(m.id,m);
  for(const m of markers.values()){
   if(m.entityKind==='search'&&['entry','topic','section'].includes(m.ownerKind)){
    const owner=await t.get(m.ownerKind==='entry'?'thoughts':m.ownerKind==='topic'?'topics':'sections',m.ownerId);
    if(!owner||humanFields(owner))gate();continue;
   }
   if(m.entityKind!=='organizer_metadata'||!['topic','section','ai_presentation','ai_presentation_candidate'].includes(m.ownerKind))gate();
   metadataOwners.add(m.ownerId);
   const row=await t.get(m.ownerKind==='topic'?'topics':m.ownerKind==='section'?'sections':'meta',m.ownerKind.startsWith('ai_')?'aiPresentation:'+m.ownerId:m.ownerId);
   if(!row||humanFields(row)||row.userEditedAt)gate();
  }
  // Legacy AI rows may predate a Source-indexed fence. Resolve their real
  // evidence owners rather than assuming absence of a fence means no content.
  let after=null,total=0;
  do{
  const page=await t.primaryRangePage('meta',{prefix:'aiPresentation:',limit:100,after});after=page.next;total+=page.rows.length;if(total>1000)unavailable();
  for(const {value:row}of page.rows){
   const none=isBaseNoneEnvelope(row);
   if(none){if(row.candidate&&(!validAIPresentationCandidate(row.candidate,new Set(row.candidate.proposal?.evidenceEntryIds||[]))||row.candidate.baseKind!=='none'||row.candidate.proposal.topicId!==row.topicId))gate();}
   else if(!Array.isArray(row.evidenceEntryIds)||row.candidate&&!Array.isArray(row.candidate.proposal?.evidenceEntryIds))gate();
   const ids=[...(row.evidenceEntryIds||[]),...(row.candidate?.proposal?.evidenceEntryIds||[])];
   if(ids.length>1000||ids.some(id=>!idOK(id)))gate();
   let affected=false;for(const eid of new Set(ids)){
    if(--budget<0)unavailable();
    const e=await t.get('thoughts',eid);if(!e||!Array.isArray(e.sourceRecordIds))gate();
    if(e.sourceRecordIds.some(id=>sourceIds.has(id)))affected=true;
   }
   if(affected){metadataOwners.add(row.topicId);if(humanFields(row)||row.userEditedAt)gate();}
  }
  }while(after!==null);
 }
 const docs=new Map((await all('documents','byChat',chatOf(record))).map(d=>[d.id,d]));
 for(const {value:b}of blocks.values()){
  const doc=await t.get('documents',b.documentId);if(!doc)unavailable();docs.set(doc.id,doc);
 }
 // Reuse the actual detach rule to determine whether refreshDoc would remove
 // the owner of a title/title-history/draft. A surviving independent title is
 // not rewritten or erased by admission.
 const detached={library:{blocks:structuredClone([...blocks.values()].map(b=>b.value))}};detachSources(detached,records);
 const kept=new Set(detached.library.blocks.map(b=>b.id)),destroyedDocs=new Set();
 for(const doc of docs.values()){
  const removedCount=[...blocks.values()].filter(b=>b.value.documentId===doc.id&&!kept.has(b.value.id)).length;
  const remainingBlocks=await t.count('blockIndex','byDocument',doc.id)-removedCount;
  const removedRecords=records.filter(r=>chatOf(r)===doc.chatKey).length;
  const remainingRecords=doc.chatKey?await t.count('recordIndex','byChat',doc.chatKey)-removedRecords:0;
  if(remainingBlocks<0||remainingRecords<0)unavailable();
  if(remainingBlocks||remainingRecords)continue;
  destroyedDocs.add(doc.id);
  if(typeof doc.value.userTitle!=='string'||doc.value.userTitle!==''||doc.value.titleRevision>0)gate();
  if(has(t,'revisions'))for(const row of await all('revisions','byDocument',doc.id))if(row.kind==='title')gate();
 }
 await assessRecovery(t,rawRecovery,{sourceIds,blocks,thoughts,metadataOwners,topicIds,destroyedDocs});
 return {records,blocks,docs,sourceIds};
}

async function assessRecovery(t,all,{sourceIds,blocks,thoughts,metadataOwners,topicIds,destroyedDocs}){
 if(!all||typeof all!=='object'||Array.isArray(all))unavailable();
 const rows=Object.entries(all).filter(([key])=>key.startsWith(recoveryDraftPrefix));if(rows.length>32)unavailable();
 for(const [key,row]of rows){
  if(!row||row.version!==1||!idOK(row.ownerId)||!idOK(row.token)||!Number.isFinite(row.updatedAt)||!Number.isFinite(row.expiresAt)||!Array.isArray(row.sourceRecordIds)||row.sourceRecordIds.length>2000||row.sourceRecordIds.some(id=>!idOK(id))||
     key!==recoveryDraftPrefix+row.kind+':'+row.ownerId||!row.operation||typeof row.operation!=='object')gate();
  // Expiration is not proof of absence: never load/prune/clear resident drafts
  // before deciding this owner gate.
  if(row.sourceRecordIds.some(id=>sourceIds.has(id)))gate();
  if(row.kind==='document'){
   if(destroyedDocs.has(row.ownerId))gate();
   if(Object.keys(row.operation).some(k=>!['type','edit','pendingRequest'].includes(k)))gate();
   const edits=[row.operation.edit];
   if(row.operation.pendingRequest!==undefined){if(typeof row.operation.pendingRequest!=='string'||row.operation.pendingRequest.length>800000)gate();try{edits.push(JSON.parse(row.operation.pendingRequest));}catch{gate();}}
   for(const edit of edits){
    if(row.operation.type!=='EDIT_DOCUMENT'||!edit||edit.documentId!==row.ownerId||!Array.isArray(edit.blocks)||edit.blocks.length>1000)gate();
    if(Object.keys(edit).some(k=>!['operationId','documentId','blocks','title','expectedTitleRevision','revisionReason','restoreRevisionId','restoreRevisionSide','removeScope'].includes(k)))gate();
    let refs=edit.blocks;if(edit.removeScope!==undefined){try{refs=validateRemovalEdit(edit).members;}catch{gate();}}
    for(const change of refs){
     if(blocks.has(change.id))gate();const b=(await t.get('blocks',change.id))?.value;
     if(!b||b.documentId!==row.ownerId||!Array.isArray(b.provenance))gate();
     if(b.provenance.some(p=>sourceIds.has(p.sourceRecordId)))gate();
    }
   }
  }else if(row.kind==='context_item'){
   // Approved manual Context is independent human work, not a Source-derived
   // body. Admit only the exact bounded, source-free recovery contract; any
   // malformed/linked/unknown row retains the existing B-02 gate.
   if(Object.keys(row).some(k=>!['version','kind','ownerId','token','epoch','operation','sourceRecordIds','updatedAt','expiresAt'].includes(k))||row.sourceRecordIds.length||Object.keys(row.operation).some(k=>!['type','change'].includes(k))||row.operation.type!=='PAIA_CONTEXT_CARDS_CHANGE')gate();
   const change=row.operation.change;
   try{validateContextChange(change,{draft:true});}catch{gate();}
   if(change.kind!=='put'||change.itemId!==row.ownerId||change.epoch!==row.epoch)gate();
   const context=await t.get('meta',CONTEXT_CARDS_ROW);if(context&&!validContextCards(context))gate();
   const item=context?.items.find(x=>x.id===row.ownerId);
   if(!item&&change.expectedRevision!==0||item&&(item.origin!=='manual'||item.protected!==true))gate();
  }else if(row.kind==='library_entry'){
   if(row.operation.type!=='EDIT_LIBRARY_BATCH'||row.operation.edit?.entries?.length!==1||row.operation.edit.entries[0].id!==row.ownerId)gate();
   const e=await t.get('thoughts',row.ownerId);if(!e||thoughts.has(e.id)||!Array.isArray(e.sourceRecordIds)||e.sourceRecordIds.some(id=>sourceIds.has(id)))gate();
  }else if(row.kind==='topic_metadata'||row.kind==='section_metadata'||row.kind==='ai_presentation'){
   if(metadataOwners.has(row.ownerId)||topicIds.has(row.ownerId))gate();
   let owner;
   if(row.kind==='section_metadata'){
    const edit=row.operation.edit;if(row.operation.type!=='EDIT_LIBRARY_SECTION'||row.ownerId!==edit?.topicId+':'+edit?.sectionId)gate();
    const topic=await t.get('topics',edit.topicId);if(!topic||topicIds.has(topic.id))gate();
    owner=await t.get('sections',JSON.stringify([topic.id,topic.activeLayoutGeneration,edit.sectionId]));
   }else{
    if(row.kind==='topic_metadata'&&(row.operation.type!=='EDIT_LIBRARY_TOPIC'||row.operation.edit?.id!==row.ownerId)||row.kind==='ai_presentation'&&(row.operation.type!=='AI_RECOVERY_SNAPSHOT'||row.operation.topicId!==row.ownerId))gate();
    owner=await t.get(row.kind==='topic_metadata'?'topics':'meta',row.kind==='ai_presentation'?'aiPresentation:'+row.ownerId:row.ownerId);
   }
   if(!owner||owner.sourceRecordIds?.some(id=>sourceIds.has(id)))gate();
   if(row.kind==='ai_presentation'){
    if(!Array.isArray(owner.evidenceEntryIds)||owner.evidenceEntryIds.length>1000)gate();
    for(const eid of owner.evidenceEntryIds){const e=await t.get('thoughts',eid);if(!e||!Array.isArray(e.sourceRecordIds)||e.sourceRecordIds.some(id=>sourceIds.has(id)))gate();}
   }
  }else gate();
 }
}

export function sourcePurgePreview(id,proof){return {state:'unambiguous',targetRef:id,coverage:'complete',sourceCount:proof.records.length,inputCount:proof.blocks.size};}
