import {entrySnapshot,markHuman,prefix,refreshEntryIndex} from './thought-model.js';
import {journal,nextSequence} from './thought-journal.js';
import {inputProjection} from './thought-evidence.js';

const bodyOf=async(t,b)=>{
 if(b.libraryText!==null&&b.libraryText!==undefined)return b.libraryText;
 if(!b.originalTextReference)return '';
 const row=await t.get('records',b.originalTextReference);
 return row?.value?.originalText||'';
};
const nonContext=dep=>Array.isArray(dep.roles)&&dep.roles.some(role=>role!=='context_only');
const bodyHuman=row=>row.protections?.body?.locked===true||row.authorship?.body?.everHumanConfirmed===true;
const liveEntry=row=>row?.storageSchema===2&&['active','invalidated'].includes(row.lifecycle);

async function exactFullSource(t,row,inputId,body,revision){
 const deps=(await t.all('dependencies','byTarget',prefix(['entry',row.id]))).filter(nonContext);
 if(deps.length!==1||deps[0].inputId!==inputId||deps[0].basedOnContentRevision!==revision||!deps[0].selectedFields?.includes('body'))return null;
 const provenance=(await t.all('provenance','byOwner',prefix(['entry',row.id]))).filter(p=>p.role!=='context_only'&&p.contributionType==='exact_excerpt');
 const exact=provenance.filter(p=>p.inputId===inputId&&p.basedOnContentRevision===revision&&p.span?.field==='body'&&p.span.start===0&&p.span.end===body.length);
 return exact.length===1?deps[0]:null;
}

export async function sharedWorkingProjection(store,t,row){
 if(!liveEntry(row))return null;
 if(row.workingInputId){
  const p=await inputProjection(store,t,row.workingInputId);if(!p)return null;
  const deps=(await t.all('dependencies','byTarget',prefix(['entry',row.id]))).filter(nonContext);
  if(deps.length!==1||deps[0].inputId!==row.workingInputId)return null;
  return {...p,dep:deps[0],inferred:false};
 }
 if(row.provenanceType!=='input_original'||bodyHuman(row)||row.lifecycle!=='active')return null;
 const deps=(await t.all('dependencies','byTarget',prefix(['entry',row.id]))).filter(nonContext);
 if(deps.length!==1)return null;
 const p=await inputProjection(store,t,deps[0].inputId);if(!p||p.contentRevision!==deps[0].basedOnContentRevision||row.thoughtText!==p.body)return null;
 const dep=await exactFullSource(t,row,p.inputId,p.body,p.contentRevision);return dep?{...p,dep,inferred:true}:null;
}

// Keep the user-facing mirror atomic with the canonical Input, but deliberately
// do not calculate cryptographic evidence inside an IndexedDB transaction.
// The normal invalidation worker refreshes dependency digests/tokens immediately
// afterwards, outside its read transaction. Until then workingInputId is the
// explicit authority for this exact 1:1 body.
async function saveLinkedBody(store,t,row,inputId,body,{operationId,reason='shared_input_edit',markAsHuman=true}={}){
 const before=entrySnapshot(row),changed=row.thoughtText!==body,wasInvalid=row.lifecycle==='invalidated';
 row.workingInputId=inputId;
 if(changed){row.thoughtText=body;row.fieldRevisions.body=(row.fieldRevisions.body||0)+1;row.contentRevision=(row.contentRevision||0)+1;row.revision=(row.revision||0)+1;if(markAsHuman&&operationId)markHuman(row,'body',operationId,store.clock(),reason);row.meaningfulContentAt=store.clock();}
 if(wasInvalid){row.lifecycle='active';row.revision=(row.revision||0)+1;}
 row.freshness='current';row.staleReasons=(row.staleReasons||[]).filter(x=>!['source_updated','input_removed','context_updated','shared_sync_pending'].includes(x));row.integrity='complete';
 // Never leave an old-body dedupe/suppression hash attached to the new body.
 // Maintenance recreates both from the current body before the next AI use.
 delete row.exactSignature;delete row.exactKey;
 row.updatedAt=store.clock();row.updatedSequence=await nextSequence(t);refreshEntryIndex(row);await t.put('thoughts',row);
 if(changed||wasInvalid)await journal(store,t,{kind:'library_entry',entityId:row.id,before,after:entrySnapshot(row),fieldMask:[...(changed?['body']:[]),...(wasInvalid?['lifecycle']:[])],actor:'user',reason,important:reason!=='shared_input_edit',operationId:operationId||'shared-working-content',baseRevision:before.revision??0,afterRevision:row.revision,sourceRecordIds:row.sourceRecordIds});
 return row;
}

export async function propagateInputWorkingChange(store,t,beforeBlock,afterBlock,meta,request={}){
 const inputId=afterBlock.id,beforeBody=await bodyOf(t,beforeBlock),afterBody=await bodyOf(t,afterBlock),previousRevision=meta.contentRevision-(beforeBody!==afterBody||beforeBlock.note!==afterBlock.note?1:0);
 // Input edits must stay O(number of actual evidence owners), not O(all dependency
 // fan-out). Provenance is the durable reverse map for Entries that really cited
 // this Input; synthetic/auxiliary dependencies cannot turn an edit into a
 // synchronous scan of every downstream consumer.
 const evidence=await t.all('provenance','byInputVersion',prefix([inputId])),ownerIds=[...new Set(evidence.filter(p=>p.ownerKind==='entry'&&p.role!=='context_only').map(p=>p.ownerId))];
 for(const ownerId of ownerIds){let row=await t.get('thoughts',ownerId);if(!liveEntry(row))continue;
  let linked=row.workingInputId===inputId;
  if(row.workingInputId&&row.workingInputId!==inputId)continue;
  if(linked){const primary=(await t.all('dependencies','byTarget',prefix(['entry',row.id]))).filter(nonContext);if(primary.length!==1||primary[0].inputId!==inputId){delete row.workingInputId;await t.put('thoughts',row);continue;}}
  if(!linked&&!bodyHuman(row)&&row.provenanceType==='input_original'&&row.thoughtText===beforeBody)linked=!!await exactFullSource(t,row,inputId,beforeBody,previousRevision);
  if(!linked)continue;
  if(!row.workingInputId){row.workingInputId=inputId;await t.put('thoughts',row);}
  if(afterBlock.excluded)continue;
  row=await t.get('thoughts',row.id);
  await saveLinkedBody(store,t,row,inputId,afterBody,{operationId:request.operationId,reason:request.revisionReason==='restore'?'restore':'shared_input_edit',markAsHuman:beforeBody!==afterBody});
 }
}

export async function editSharedBodyFromEntry(store,t,row,newBody,operationId,{reason='shared_input_edit'}={}){
 const projection=await sharedWorkingProjection(store,t,row);if(!projection||projection.body===newBody)return projection?{shared:true,inputId:projection.inputId,changed:false}:null;
 const saved=await t.get('blocks',projection.inputId);if(!saved)return null;const before=structuredClone(saved.value),after=structuredClone(saved.value);after.libraryText=newBody;after.editedAt=store.clock();after.revision=(after.revision||0)+1;
 const meta=await t.get('inputStates',projection.inputId);if(!meta||meta.removalState!=='active'||meta.sourcePurged)return null;
 await store.afterInputEdit(t,[before],[after],{}, {},{operationId,revisionReason:reason,blocks:[{id:after.id}]});
 await t.put('blocks',{id:after.id,value:after});const ix=await t.get('blockIndex',after.id);if(ix){ix.excluded=after.excluded;ix.excludedKey=after.excluded?1:0;ix.listKey[1]=ix.excludedKey;await t.put('blockIndex',ix);}
 return {shared:true,inputId:projection.inputId,changed:true};
}

export async function markCreatedSharedWorkingEntry(store,t,entry,candidate,maps){
 if(candidate.localOriginal!==true||entry.provenanceType!=='input_original'||!Array.isArray(candidate.evidence))return false;
 const primary=candidate.evidence.filter(x=>{const mapped=maps[x.ref];return mapped&&mapped.role!=='context_only';});if(primary.length!==1)return false;
 const span=primary[0],mapped=maps[span.ref];if(!mapped||span.field!=='body'||span.start!==0)return false;
 const p=await inputProjection(store,t,mapped.inputId);if(!p||span.end!==p.body.length||entry.thoughtText!==p.body)return false;
 if(entry.workingInputId&&entry.workingInputId!==p.inputId){delete entry.workingInputId;return false;}
 const deps=(await t.all('dependencies','byTarget',prefix(['entry',entry.id]))).filter(nonContext);if(deps.some(d=>d.inputId!==p.inputId)){delete entry.workingInputId;return false;}
 entry.workingInputId=p.inputId;return true;
}
