import {prefix} from '../thought-model.js';
import {blockIndex} from '../idb-repository.js';
import {nextSequence} from '../thought-journal.js';
// New branch evidence can withdraw an untouched Input from the default view.
// This is a source review state, never a user removal or authored revision.
export async function importedBranchChanged(store,t,recordId,branch){
 const documents=new Set();if(branch==='current'||!store.repository.ia)return documents;
 for(const ix of await t.all('blockIndex','byRecord',recordId)){
  const row=await t.get('blocks',ix.id),b=row?.value;if(!b)continue;
  const m=await t.get('inputStates',b.id),filter=store.repository.smartFilter?await t.get('filterInputs',b.id):null;
  if(b.excluded&&!b.branchStatus||b.libraryText!=null||b.note||b.userTitle||b.userEdited||b.editedAt!=null||m?.contentRevision>0||b.provenance.length!==1||filter?.userEdited||filter?.filterOverride==='keep')continue;
  const record=await t.get('records',recordId);
  if(await t.get('inputRemovals',record.value.sourceKey)||store.repository.smartFilter&&await t.get('filterIntents',record.value.sourceKey))continue;
  if(b.branchStatus===branch&&b.excluded)continue;
  b.branchStatus=branch;b.excluded=true;b.status='import_branch_review';b.revision++;
  await t.put('blocks',row);await t.put('blockIndex',blockIndex(b,ix.sequence,[record.value]));
  if(m){m.removalState='branch_pending';m.deltaSequence=await nextSequence(t,'input-delta-sequence');await t.put('inputStates',m);await store.invalidate(t,b.id,'source_updated',m.contentRevision);}
  await store.trackBlock(t,b);documents.add(b.documentId);
 }
 return documents;
}
// A corrected expression time can change an AI interpretation of chronology.
// Mark the derived presentation stale; retain every authored/generated field and
// leave text-only Original classification checkpoints intact. Never invoke AI.
export async function importedTimeChanged(store,t,recordId){
 if(!store.repository.thoughtLibrary)return;
 const topics=new Set();
 for(const block of await t.all('blockIndex','byRecord',recordId)){
  for(const dep of await t.all('dependencies','byInput',block.id)){
   for(const placement of await t.all('placements','byEntry',prefix([dep.targetId||dep.thoughtId])))topics.add(placement.topicId);
  }
 }
 for(const id of topics){
  const key='aiPresentation:'+id,cache=await t.get('meta',key);
  if(cache&&!cache.needsUpdate)await t.put('meta',{...cache,needsUpdate:true});
  if(await t.get('meta','topicChronology:'+id))await t.delete('meta','topicChronology:'+id);
 }
}
