import {
 SOURCE_STRUCTURE_PREFIXES,SOURCE_STRUCTURE_EPHEMERAL_PREFIXES,
 validateSourceStructureRow,conversationMetaId,projectMetaId,eventMetaId,
 sourceEvidence
} from './source-structure-model.js';

const clone=value=>structuredClone(value);
const projectToken=ref=>JSON.stringify([ref.providerKey,ref.namespace,ref.projectId]);
const prefixRange=prefix=>IDBKeyRange.bound(prefix,prefix+'\uffff',false,false);

export function sourceStructureMetaAllowed(id){
 if(typeof id!=='string')return false;
 if(id.startsWith(SOURCE_STRUCTURE_PREFIXES.conversation))return /^[a-f0-9]{64}$/.test(id.slice(SOURCE_STRUCTURE_PREFIXES.conversation.length));
 if(id.startsWith(SOURCE_STRUCTURE_PREFIXES.project))return /^[a-f0-9]{64}$/.test(id.slice(SOURCE_STRUCTURE_PREFIXES.project.length));
 if(id.startsWith(SOURCE_STRUCTURE_PREFIXES.event))return /^[a-f0-9]{64}:\d{20}$/.test(id.slice(SOURCE_STRUCTURE_PREFIXES.event.length));
 return false;
}
export function sourceStructureEphemeral(id){
 if(typeof id!=='string')return false;
 return id==='ans:ui:v1'||SOURCE_STRUCTURE_EPHEMERAL_PREFIXES.filter(prefix=>prefix!=='ans:ui:v1').some(prefix=>id.startsWith(prefix));
}
export function validateSourceStructureBackupRow(row){
 if(!sourceStructureMetaAllowed(row?.id))throw new TypeError('invalid ANS metadata key');
 validateSourceStructureRow(row);
 return row;
}
export async function validateSourceStructureBackupKey(row){
 validateSourceStructureBackupRow(row);
 let expected;
 if(row.kind==='conversation')expected=await conversationMetaId(row.conversationRef);
 else if(row.kind==='project')expected=await projectMetaId(row.projectRef);
 else expected=await eventMetaId(row.subjectRef,row.observationSequence);
 if(expected!==row.id)throw new TypeError('ANS metadata key mismatch');
 return row;
}
export function restoreSourceStructureRow(row){
 validateSourceStructureBackupRow(row);
 const restored=clone(row);
 if(restored.kind==='event'){
  const prior=restored.evidence.channel;
  restored.evidence=sourceEvidence({...restored.evidence,channel:'restored',restored:true,restoredFromChannel:restored.evidence.restoredFromChannel||prior},{restored:true});
 }
 return restored;
}
function collectSnapshotProjects(snapshot,out){
 if(snapshot?.membership?.state==='project')out.add(projectToken(snapshot.membership.projectRef));
 if(snapshot?.lastKnownSourceProject?.projectRef)out.add(projectToken(snapshot.lastKnownSourceProject.projectRef));
}
export async function validateSourceStructureBackupGraph(rows,{documents=[]}={}){
 const current=new Map(),eventsBySubject=new Map(),projectsReferenced=new Set();
 for(const row of rows){await validateSourceStructureBackupKey(row);if(row.kind!=='event')current.set(row.id,row);}
 const documentRefs=new Set(documents.filter(doc=>doc.sourceConversationId).map(doc=>JSON.stringify([doc.platform||'chatgpt',doc.sourceConversationId])));
 for(const row of rows){
  if(row.kind==='conversation'){
   if(!documentRefs.has(JSON.stringify([row.conversationRef.platform,row.conversationRef.sourceConversationId])))throw new TypeError('orphan ANS conversation');
   collectSnapshotProjects(row,projectsReferenced);
  }
  if(row.kind==='event'){
   const subjectId=row.subjectRef.kind==='conversation'?await conversationMetaId(row.subjectRef.conversationRef):await projectMetaId(row.subjectRef.projectRef);
   if(!current.has(subjectId))throw new TypeError('orphan ANS event');
   const list=eventsBySubject.get(subjectId)||[];list.push(row);eventsBySubject.set(subjectId,list);
   if(row.subjectRef.kind==='conversation'){collectSnapshotProjects(row.before,projectsReferenced);collectSnapshotProjects(row.after,projectsReferenced);}
  }
 }
 for(const row of current.values()){
  const events=(eventsBySubject.get(row.id)||[]).sort((a,b)=>a.observationSequence-b.observationSequence);
  if(events.length!==row.relationshipRevision)throw new TypeError('incomplete ANS history');
  for(let i=0;i<events.length;i++)if(events[i].observationSequence!==i+1)throw new TypeError('non-contiguous ANS history');
 }
 for(const row of current.values())if(row.kind==='project'&&!projectsReferenced.has(projectToken(row.projectRef)))throw new TypeError('orphan ANS project');
 for(const token of projectsReferenced){
  let found=false;for(const row of current.values())if(row.kind==='project'&&projectToken(row.projectRef)===token){found=true;break;}
  if(!found)throw new TypeError('missing ANS project');
 }
 return true;
}
export async function clearSourceStructureEphemeral(t){
 await t.delete('meta','ans:ui:v1');
 for(const prefix of SOURCE_STRUCTURE_EPHEMERAL_PREFIXES.filter(value=>value!=='ans:ui:v1')){
  for(;;){
   const page=await t.rangePage('meta',null,prefixRange(prefix),null,100);
   if(!page.rows.length)break;
   for(const {value}of page.rows)await t.delete('meta',value.id);
   if(page.rows.length<100)break;
  }
 }
}
export function projectRefsInConversationRow(row,out=new Set()){
 if(row?.kind==='conversation')collectSnapshotProjects(row,out);
 if(row?.kind==='event'&&row.subjectRef?.kind==='conversation'){collectSnapshotProjects(row.before,out);collectSnapshotProjects(row.after,out);}
 return out;
}
export const sourceStructurePrefixRange=prefixRange;

