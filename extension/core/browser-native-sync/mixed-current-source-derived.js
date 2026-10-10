import {recordIndex,blockIndex,sourceCount,chatOf} from '../idb-repository.js';
import {requireOriginalCurrentMixedGroupScope} from './group-checkpoint-scope.js';
import {measureSourceWorkingPhysicalTree,equalSourceWorkingPhysicalTree} from './source-working-physical.js';
import {assertSourceWorkingSpecialScalars} from './source-working-derived.js';
import {fail} from './value.js';

// Finite consuming mixed batch: one bootstrap plus one original append, in one
// Conversation, with independently owned Human work. No native grant, budget
// exemption or broadening of the existing one-Source exporter is created here.
// The native caller must prepay these original builder/sort/comparison frames.
export function assertMixedCurrentSourceDerivedRows(core,scope,plan,rows){
 if(arguments.length!==4)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');requireOriginalCurrentMixedGroupScope(core,scope,plan);measureSourceWorkingPhysicalTree(rows);
 const creation=plan.groups.filter(g=>g.type==='sourceBootstrapCommit'||g.type==='sourceAppendCommit');
 if(creation.length!==2||creation.filter(g=>g.type==='sourceBootstrapCommit').length!==1||creation.filter(g=>g.type==='sourceAppendCommit').length!==1||scope.expected.records.length!==2||scope.expected.blocks.length!==2||scope.expected.documents.length!==1)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
 const ordered=[creation.find(g=>g.type==='sourceBootstrapCommit'),creation.find(g=>g.type==='sourceAppendCommit')],records=scope.expected.records,blocks=scope.expected.blocks,doc=scope.expected.documents[0];
 const sources=ordered.map(g=>g.prepared.members.find(m=>m.value.entityType==='source')?.value.entity),inputs=ordered.map(g=>g.prepared.members.find(m=>m.value.entityType==='input')?.value.entity);
 if(sources.some(s=>!s||s.chatId!==doc.sourceConversationId)||inputs.some(b=>!b||b.documentId!==doc.id)||new Set(sources.map(s=>s.id)).size!==2||new Set(inputs.map(b=>b.id)).size!==2)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
 const recordRows=sources.map((source,i)=>recordIndex(records.find(r=>r.id===source.id),i)),blockRows=inputs.map((input,i)=>blockIndex(blocks.find(b=>b.id===input.id),i,records));
 // RefreshDoc prices/updates one count for each immutable Source key. Preserve
 // that partition rather than collapsing two Source facts into one aggregate.
 const counts=sources.map(source=>sourceCount(doc.id,source.sourceKey,records.filter(r=>r.sourceKey===source.sourceKey),blocks.filter(b=>b.provenance.some(p=>p.sourceRecordId===source.id)),doc.sourceConversationId));
 const document={id:doc.id,chatKey:chatOf(sources[0]),sequence:0,displayKey:[-(Date.parse(doc.lastSourceSentAt)||0),doc.id],value:doc};
 // Original refreshDoc's [doc,0] <= key < [doc,1] Last edge chooses the latest
 // known stamp. A present all-unknown view still has the original signed zero.
 for(const view of ['library','archive','excluded']){
  const available=counts.filter(count=>count.views.includes(JSON.stringify([doc.id,view])));if(!available.length)continue;
  const known=available.filter(count=>count[view+'Last']?.[1]===0).map(count=>count[view+'Last'][2]).sort();document[view+'Display']=[-(Date.parse(known.at(-1))||0),doc.id];
 }
 const expected={recordIndex:recordRows,blockIndex:blockRows,sourceCounts:counts,documents:[document]},sort=items=>[...items].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
 for(const name of Object.keys(expected)){
  if(!Array.isArray(rows[name]))fail('BNS_SOURCE_WORKING_PHYSICAL_INVALID');
  for(const row of rows[name])assertSourceWorkingSpecialScalars(name,row);
  if(!equalSourceWorkingPhysicalTree(sort(rows[name]),sort(expected[name])))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
 }
}
