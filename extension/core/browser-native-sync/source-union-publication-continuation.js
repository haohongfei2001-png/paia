import {currentOriginalRecoveryWork,chargeOriginalRecoveryWork,checkOriginalRecoveryWork,recordIndex,blockIndex,sourceCount,chatOf} from '../idb-repository.js';
import {planInitialFilter} from '../smart-filter-store-owner.js';
import {SOURCE_BOOTSTRAP_TYPES} from './source-bootstrap-codec.js';
import {readGroupRows} from './group-page-reader.js';
import {equalSourceWorkingPhysicalTree,measureSourceWorkingPhysicalTree} from './source-working-physical.js';
import {clone,equal,fail} from './value.js';

// Publication-only comparisons. These helpers mint no restore/native authority,
// write no rows, and never replace the durable original activation sourceCut.
const invalid=()=>fail('BNS_SOURCE_UNION_CONTINUATION_INVALID');
const entities=group=>Object.fromEntries(group.prepared.members.map(op=>[op.value.entityType,op.value.entity]));
const order=rows=>rows.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
const stableFilter=row=>Object.fromEntries(Object.entries(row).filter(([key])=>!['decision','reasonCode','pendingKey','failed','evaluatedAt','decisionSequence','filteredKey'].includes(key)));
const counter=value=>{if(!Number.isSafeInteger(value)||value<0)invalid();return value;};
function charge(core,value){const ticket=currentOriginalRecoveryWork(core.repository);if(!ticket)fail('BNS_SOURCE_UNION_WORK_REQUIRED');checkOriginalRecoveryWork(core.repository,ticket);chargeOriginalRecoveryWork(core.repository,ticket,measureSourceWorkingPhysicalTree(value).B);}

export function sourceUnionPublicationGroups(core,plan,original){
 const retained=new Set(original.operations.map(op=>op.revisionId)),identities=new Set(),previous=[],added=[];
 for(const group of plan.groups){
  if(group.type!=='sourceBootstrapCommit')fail('BNS_GROUP_OWNER_UNSUPPORTED');
  const n=group.operations.filter(op=>retained.has(op.revisionId)).length;
  if(n&&n!==group.operations.length)invalid();(n?previous:added).push(group);
  const e=entities(group),claims=[...Object.entries(e).map(([kind,row])=>[kind,row.id]),['sourceKey',e.source.sourceKey],['dedupeKey',e.source.dedupeKey],['conversation',e.source.chatId]];
  for(const claim of claims){const key=JSON.stringify(claim);if(identities.has(key))fail('BNS_SOURCE_UNION_COLLISION');identities.add(key);}
 }
 if(previous.reduce((n,g)=>n+g.operations.length,0)!==retained.size)invalid();
 added.sort((a,b)=>a.prepared.descriptor.sequence-b.prepared.descriptor.sequence);
 if(added.length&&original.operations.some(op=>op.deviceId===core.deviceId))invalid();
 for(let index=0;index<added.length;index++){
  const group=added[index],ops=group.operations;
  if(ops.length!==7||group.prepared.descriptor!==ops[6]&&group.prepared.descriptor.revisionId!==ops[6].revisionId)invalid();
  for(let i=0;i<7;i++)if(ops[i].deviceId!==core.deviceId||ops[i].sequence!==index*7+i+1||i<6&&ops[i].value.entityType!==SOURCE_BOOTSTRAP_TYPES[i])invalid();
 }
 return {previous,added};
}

export async function requireSourceUnionPublicationPhysical(core,t,originalCut,currentCut,groups){
 charge(core,originalCut);charge(core,currentCut);
 const expected=clone(originalCut),meta=new Map(expected.metadata.map(row=>[row.id,row]));
 if(meta.size!==expected.metadata.length||expected.inputStates.length!==groups.previous.length||expected.revisionAllocations.length!==groups.previous.length||expected.filterInputs.length!==groups.previous.length)invalid();
 const sequence=meta.get('sequence')?.row,history=meta.get('revision-sequence')?.row,delta=meta.get('input-delta-sequence')?.row;
 if(!sequence||!history||!delta||!equal(sequence,{id:'sequence',records:sequence.records,blocks:sequence.blocks,documents:sequence.documents})||!equal(history,{id:'revision-sequence',value:history.value})||!equal(delta,{id:'input-delta-sequence',value:delta.value}))invalid();
 const n=groups.previous.length,base={records:counter(sequence.records)-n,blocks:counter(sequence.blocks)-n,documents:counter(sequence.documents)-n,history:counter(history.value)-n,delta:counter(delta.value)-n};
 if(Object.values(base).some(value=>value<0))invalid();
 const expectedRows={recordIndex:[],blockIndex:[],documents:[],sourceCounts:[]};
 for(const [index,group]of [...groups.previous,...groups.added].entries()){
  const e=entities(group),h=e.baselineRevision,b=e.input,r=e.source,step=index+1;
  const state={...e.inputState,deltaSequence:base.delta+step},allocation={id:h.id,sequence:base.history+step,listKey:[h.entityKey,base.history+step],documentList:[h.documentId,base.history+step]},filter=stableFilter(planInitialFilter(b,state));
  if(index<n){
   if(!equal(expected.inputStates.find(row=>row.id===state.id),state)||!equal(expected.revisionAllocations.find(row=>row.id===h.id),allocation)||!equal(expected.filterInputs.find(row=>row.id===b.id),filter))invalid();
  }else{
   // Unlike received operations, a genuine local capture already used these
   // exact physical counters. Portable normalization is not provenance.
   if(!equal(e.inputState,state)||h.sequence!==allocation.sequence||!equal(h.listKey,allocation.listKey)||!equal(h.documentList,allocation.documentList))invalid();
   expected.inputStates.push(state);expected.revisionAllocations.push(allocation);expected.filterInputs.push(filter);
  }
  const ri=recordIndex(r,base.records+index),bi=blockIndex(b,base.blocks+index,[r]),count=sourceCount(b.documentId,r.sourceKey,[ri],[bi],r.chatId),doc=e.inputDocument.source;
  const row={id:doc.id,chatKey:chatOf(r),sequence:base.documents+index,displayKey:[-(Date.parse(doc.lastSourceSentAt)||0),doc.id],value:doc};
  for(const view of ['library','archive'])row[view+'Display']=[-(Date.parse(count[view+'Last']?.[2])||0),doc.id];
  expectedRows.recordIndex.push(ri);expectedRows.blockIndex.push(bi);expectedRows.documents.push(row);expectedRows.sourceCounts.push(count);
 }
 for(const key of ['records','blocks','documents'])sequence[key]+=groups.added.length;history.value+=groups.added.length;delta.value+=groups.added.length;
 for(const name of ['inputStates','revisionAllocations','filterInputs'])order(expected[name]);
 charge(core,expected);if(!equalSourceWorkingPhysicalTree(currentCut,expected))invalid();
 for(const [table,rows]of Object.entries(expectedRows)){order(rows);charge(core,rows);if(!equalSourceWorkingPhysicalTree(await readGroupRows(t,table),rows))invalid();}
}
