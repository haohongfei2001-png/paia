import {recordIndex,blockIndex,sourceCount,chatOf} from '../idb-repository.js';
import {requireOriginalCurrentSourceWorkingGroupScope} from './group-checkpoint-scope.js';
import {measureSourceWorkingPhysicalTree,equalSourceWorkingPhysicalTree} from './source-working-physical.js';
import {fail} from './value.js';

const own=Object.hasOwn,descriptor=Object.getOwnPropertyDescriptor,names=Object.getOwnPropertyNames,array=Array.isArray;
const invalid=()=>fail('BNS_SOURCE_WORKING_PHYSICAL_INVALID');
// Call only after the native caller has prepaid the full meter/comparison and
// original builder frames. This pure check neither opens a read nor mints a cap.
export function assertSourceWorkingSpecialScalars(store,row){
 measureSourceWorkingPhysicalTree(row);
 const visit=(value,path)=>{
  if(value===undefined){if(store!=='recordIndex'||path.length!==1||path[0]!=='legacyChat'||typeof row.sourceKey!=='string'||!row.sourceKey)invalid();return;}
  if(typeof value==='number'&&Object.is(value,-0)){
   if(store!=='documents'||path.length!==2||!['displayKey','libraryDisplay','archiveDisplay','excludedDisplay'].includes(path[0])||path[1]!=='0')invalid();return;
  }
  if(!value||typeof value!=='object')return;
  for(const key of names(value)){if(array(value)&&key==='length')continue;const d=descriptor(value,key);if(!d||!own(d,'value'))invalid();visit(d.value,[...path,key]);}
 };
 visit(row,[]);
}

// Exact formation of the four derived families in the bounded Source/Working
// profile. No callback, supplied expected DTO, JSON normalization or duplicate
// index builder: original Scope and original repository builders supply values.
// Scope identity is not proof that the caller's rows came from native IDB.
export function assertSourceWorkingDerivedRows(core,scope,plan,rows,replay){
 if(arguments.length!==4&&arguments.length!==5)invalid();requireOriginalCurrentSourceWorkingGroupScope(core,scope,plan);
 const {records,blocks,documents}=scope.expected,meta=new Map((rows.meta??[]).map(row=>[row.id,row]));
 const ordered=[...plan.groups].sort((a,b)=>Math.min(...a.operations.map(op=>op.sequence))-Math.min(...b.operations.map(op=>op.sequence)));
 // Initial physical counters follow local capture order. Restored inventories
 // follow the validated original graph order; replay proof checks them again.
 const groups=replay?replay.transactions.flat():meta.has(core.prefix+'active')?plan.groups:ordered,recordOrder=[],blockOrder=[],documentOrder=[];
 for(const group of groups)if(['sourceBootstrapCommit','sourceAppendCommit'].includes(group.type))for(const member of group.prepared.members){const {entityType,entity}=member.value;if(entityType==='source')recordOrder.push(entity.id);if(entityType==='input'){blockOrder.push(entity.id);if(!documentOrder.includes(entity.documentId))documentOrder.push(entity.documentId);}}
 const counts=records.map(source=>{const block=blocks.find(b=>b.provenance.some(p=>p.sourceRecordId===source.id));if(!block)invalid();return sourceCount(block.documentId,source.sourceKey,records.filter(r=>r.sourceKey===source.sourceKey),blocks.filter(b=>b.documentId===block.documentId&&b.provenance.some(p=>p.sourceRecordId===source.id)),source.chatId);});
 const expected={recordIndex:records.map(r=>recordIndex(r,recordOrder.indexOf(r.id))),blockIndex:blocks.map(b=>blockIndex(b,blockOrder.indexOf(b.id),records)),sourceCounts:counts,documents:documents.map(doc=>{const source=records.find(r=>r.chatId===doc.chatId)||records.find(r=>blocks.some(b=>b.documentId===doc.id&&b.provenance.some(p=>p.sourceRecordId===r.id)));if(!source)invalid();const related=counts.filter(c=>c.documentId===doc.id),document={id:doc.id,chatKey:chatOf(source),sequence:documentOrder.indexOf(doc.id),displayKey:[-(Date.parse(doc.lastSourceSentAt)||0),doc.id],value:doc};for(const view of ['library','archive','excluded']){const available=related.filter(c=>c.views.includes(JSON.stringify([doc.id,view])));if(available.length){const known=available.filter(c=>c[view+'Last']?.[1]===0).map(c=>c[view+'Last'][2]).sort();document[view+'Display']=[-(Date.parse(known.at(-1))||0),doc.id];}}return document;})};
 for(const name of Object.keys(expected)){
  const d=descriptor(rows,name);if(!d||!own(d,'value')||!array(d.value))invalid();
  measureSourceWorkingPhysicalTree(d.value);measureSourceWorkingPhysicalTree(expected[name]);
  for(const row of d.value)assertSourceWorkingSpecialScalars(name,row);
  if(!equalSourceWorkingPhysicalTree([...d.value].sort((a,b)=>a.id.localeCompare(b.id)),expected[name].sort((a,b)=>a.id.localeCompare(b.id))))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
 }
}
