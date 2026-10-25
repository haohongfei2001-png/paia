import {currentOriginalRecoveryWork,chargeOriginalRecoveryWork,checkOriginalRecoveryWork,recordIndex,blockIndex,sourceCount,chatOf} from '../idb-repository.js';
import {describeOriginalWorkingGroup} from './input-working-commit.js';
import {inputEditJournalData,planInputRevision} from '../ia-store-owner.js';
import {planInitialFilter} from '../smart-filter-store-owner.js';
import {SOURCE_BOOTSTRAP_TYPES} from './source-bootstrap-codec.js';
import {SOURCE_APPEND_TYPES} from './source-append-codec.js';
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
  if(!['sourceBootstrapCommit','sourceAppendCommit','inputWorkingCommit'].includes(group.type))fail('BNS_GROUP_OWNER_UNSUPPORTED');
  const n=group.operations.filter(op=>retained.has(op.revisionId)).length;
  if(n&&(n!==group.operations.length||group.type!=='sourceBootstrapCommit'))invalid();(n?previous:added).push(group);
  if(group.type==='inputWorkingCommit')continue;
  const e=entities(group),claims=[...Object.entries(e).map(([kind,row])=>[kind,row.id]),['sourceKey',e.source.sourceKey],['dedupeKey',e.source.dedupeKey]];
  // Only an original bootstrap claims a conversation. Append's exact retained
  // bootstrap/document dependency was proved by the original group planner.
  if(group.type==='sourceBootstrapCommit')claims.push(['conversation',e.source.chatId]);
  for(const claim of claims){const key=JSON.stringify(claim);if(identities.has(key))fail('BNS_SOURCE_UNION_COLLISION');identities.add(key);}
 }
 if(previous.reduce((n,g)=>n+g.operations.length,0)!==retained.size)invalid();
 added.sort((a,b)=>a.prepared.descriptor.sequence-b.prepared.descriptor.sequence);
 if(added.length&&original.operations.some(op=>op.deviceId===core.deviceId))invalid();
 let sequence=0;
 for(const group of added){
  const ops=group.operations,types=group.type==='inputWorkingCommit'?group.prepared.members.map(op=>op.value.entityType):group.type==='sourceBootstrapCommit'?SOURCE_BOOTSTRAP_TYPES:SOURCE_APPEND_TYPES;
  if(ops.length!==types.length+1||group.prepared.descriptor.revisionId!==ops.at(-1).revisionId)invalid();
  for(let i=0;i<ops.length;i++)if(ops[i].deviceId!==core.deviceId||ops[i].sequence!==++sequence||i<types.length&&ops[i].value.entityType!==types[i])invalid();
 }
 const working=added.filter(group=>group.type==='inputWorkingCommit');
 // Retain the original one-Input sequential chain. The additional finite
 // shape is exactly two retained Inputs with one genuine edit each; mixed
 // Source/Human/Context tails and wider multi-Input histories remain separate.
 const inputCount=new Set(working.map(group=>group.prepared.descriptor.value.inputId)).size;
 if(working.length&&(working.length!==added.length||inputCount!==1&&(inputCount!==2||working.length!==2)))fail('BNS_GROUP_OWNER_UNSUPPORTED');
 return {previous,added,working};
}

export async function requireSourceUnionPublicationPhysical(core,t,originalCut,currentCut,groups,canonical){
 charge(core,originalCut);charge(core,currentCut);
 if(groups.working.length)return requireWorkingPhysical(core,t,originalCut,currentCut,groups,canonical);
 const expected=clone(originalCut),meta=new Map(expected.metadata.map(row=>[row.id,row]));
 if(meta.size!==expected.metadata.length||expected.inputStates.length!==groups.previous.length||expected.revisionAllocations.length!==groups.previous.length||expected.filterInputs.length!==groups.previous.length)invalid();
 const sequence=meta.get('sequence')?.row,history=meta.get('revision-sequence')?.row,delta=meta.get('input-delta-sequence')?.row;
 if(!sequence||!history||!delta||!equal(sequence,{id:'sequence',records:sequence.records,blocks:sequence.blocks,documents:sequence.documents})||!equal(history,{id:'revision-sequence',value:history.value})||!equal(delta,{id:'input-delta-sequence',value:delta.value}))invalid();
 const n=groups.previous.length,base={records:counter(sequence.records)-n,blocks:counter(sequence.blocks)-n,documents:counter(sequence.documents)-n,history:counter(history.value)-n,delta:counter(delta.value)-n};
 if(Object.values(base).some(value=>value<0))invalid();
 const expectedRows={recordIndex:[],blockIndex:[],documents:[],sourceCounts:[]},documents=new Map();
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
  const ri=recordIndex(r,base.records+index),bi=blockIndex(b,base.blocks+index,[r]),count=sourceCount(b.documentId,r.sourceKey,[ri],[bi],r.chatId);
  if(group.type==='sourceBootstrapCommit'){
   const doc=e.inputDocument.source;if(documents.has(doc.id))invalid();
   documents.set(doc.id,{id:doc.id,chatKey:chatOf(r),sequence:base.documents+documents.size});
  }
  expectedRows.recordIndex.push(ri);expectedRows.blockIndex.push(bi);expectedRows.sourceCounts.push(count);
 }
 // Scope values are independently compiled by the original planner from the
 // complete admitted graph. Reconstruct raw allocation/display rows as well:
 // appending an Input never allocates another document or replaces its anchor.
 if(canonical.expected.documents.length!==documents.size)invalid();
 for(const doc of canonical.expected.documents){
  const allocation=documents.get(doc.id);if(!allocation)invalid();
  const row={...allocation,displayKey:[-(Date.parse(doc.lastSourceSentAt)||0),doc.id],value:doc};
  for(const view of ['library','archive']){
   const times=expectedRows.sourceCounts.filter(count=>count.documentId===doc.id&&count[view+'Last']?.[1]===0).map(count=>count[view+'Last'][2]).sort();
   row[view+'Display']=[-(Date.parse(times.at(-1))||0),doc.id];
  }
  expectedRows.documents.push(row);
 }
 for(const key of ['records','blocks'])sequence[key]+=groups.added.length;sequence.documents+=groups.added.filter(group=>group.type==='sourceBootstrapCommit').length;history.value+=groups.added.length;delta.value+=groups.added.length;
 for(const name of ['inputStates','revisionAllocations','filterInputs'])order(expected[name]);
 charge(core,expected);if(!equalSourceWorkingPhysicalTree(currentCut,expected))invalid();
 for(const [table,rows]of Object.entries(expectedRows)){order(rows);charge(core,rows);if(!equalSourceWorkingPhysicalTree(await readGroupRows(t,table),rows))invalid();}
}


// Original protection keeps its local timestamp; only this complete sequential
// typed edit chain can qualify its fixed body-free state. No filter decision or
// content counter is borrowed from the current row being checked.
export function requireSourceUnionWorkingFilter(groups,original,row){
 const shapes=groups.map(group=>describeOriginalWorkingGroup(group.prepared));if(!shapes.length)invalid();const {block}=shapes.at(-1);
 if(shapes.some((shape,index)=>shape.block.value.id!==block.value.id||shape.block.value.revision!==index+1))invalid();
 if(!original||original.evaluationRevision!==0||original.basedOnContentRevision!==0||original.userEdited!==false||original.filterOverride!=='none'||typeof row.overrideAt!=='string'||!Number.isFinite(Date.parse(row.overrideAt)))invalid();
 const expected={...original,userEdited:true,filterOverride:'keep',overrideReason:'user_edit',overrideAt:row.overrideAt,evaluationRevision:shapes.length,failed:false,pendingKey:1,decision:'keep',reasonCode:'user_protected'};
 if(row.id!==block.value.id||!equalSourceWorkingPhysicalTree(row,expected))invalid();
 return stableFilter(row);
}
async function requireWorkingPhysical(core,t,originalCut,currentCut,groups,canonical){
 const shapes=groups.working.map(group=>describeOriginalWorkingGroup(group.prepared)),inputs=new Map();
 const editable=new Set(['libraryText','note','editedAt','revision']),fixed=value=>Object.fromEntries(Object.entries(value).filter(([key])=>!editable.has(key)));
 const expected=clone(originalCut),metadata=new Map(expected.metadata.map(row=>[row.id,row])),delta=metadata.get('input-delta-sequence')?.row,revision=metadata.get('revision-sequence')?.row,epoch=metadata.get('thought-epoch')?.row??{id:'thought-epoch',value:0};
 metadata.get('thought-epoch').row=epoch;
 if(!delta||!revision||!epoch||!Number.isSafeInteger(epoch.value)||epoch.value<0)invalid();
 const priorOperations=new Map(),events=[];
 // Iterate the original global descriptor order. Each Input has its own
 // original body/history edge, while allocation, delta and event counters are
 // shared across the complete local tail and never restarted per Input.
 for(const shape of shapes){
  const {block,state,history,keeps,descriptor}=shape,after=block.value;
  let input=inputs.get(descriptor.inputId);
  if(!input){
   const sourceGroup=groups.previous.find(g=>entities(g).input.id===descriptor.inputId);if(!sourceGroup)invalid();
   const original=entities(sourceGroup),before=original.input;
   if(before.revision!==0||before.libraryText!==null||before.note)invalid();
   const initial=expected.inputStates.find(row=>row.id===before.id),allocation=expected.revisionAllocations.find(row=>row.id===original.baselineRevision.id);
   if(!initial||!allocation)invalid();
   input={original,before,initial,allocation,previousBlock:before,previousState:initial,historyRows:new Map([[allocation.id,{...original.baselineRevision,...allocation}]])};inputs.set(descriptor.inputId,input);
  }
  const {original,before,previousBlock,previousState,historyRows}=input;
  if(!equal(fixed(before),fixed(after))||after.revision!==previousBlock.revision+1||after.libraryText===previousBlock.libraryText&&after.note===previousBlock.note)invalid();
  if(!equal(descriptor.sourceRefs,[{id:original.source.id,sourceKey:original.source.sourceKey,dedupeKey:original.source.dedupeKey,contentHash:original.source.contentHash}])||keeps.length!==1||keeps[0].value.id!==original.source.sourceKey)invalid();
  for(const item of shape.entities){const prior=priorOperations.get(item.operation.entityId);if(!equal(item.operation.parents,prior?[prior.revisionId]:[]))invalid();}
  // The original planner consumes a bounded, already authenticated transient
  // history view. It cannot access a repository or write; exact rows below
  // prove both fresh allocation and the original coalescing operation.
  const data=inputEditJournalData(previousBlock,after,{}),candidate=history.find(item=>!historyRows.has(item.value.id)&&item.value.sequence===revision.value+1);
  charge(core,[previousBlock,data,[...historyRows.values()],history.map(item=>item.value)]);
  const planned=await planInputRevision({edge:async()=>[...historyRows.values()].sort((a,b)=>a.sequence-b.sequence).at(-1),get:async(table,id)=>{if(table!=='meta'||id!=='revision-sequence')invalid();return clone(revision);}},data,{now:after.editedAt,uuid:()=>{if(!candidate)invalid();return candidate.value.id;}});
  historyRows.set(planned.row.id,planned.row);if(planned.sequence)revision.value=planned.sequence.value;
  if(history.length!==historyRows.size||history.some(item=>!equal(item.value,historyRows.get(item.value.id))))invalid();
  const nextState={...previousState,contentRevision:previousState.contentRevision+1,deltaSequence:delta.value+1};if(!equal(state.value,nextState))invalid();
  delta.value++;epoch.value++;events.push({descriptor,inputId:before.id,contentRevision:nextState.contentRevision,sequence:epoch.value});
  for(const item of shape.entities)priorOperations.set(item.operation.entityId,item.operation);
  input.previousBlock=after;input.previousState=nextState;
 }
 for(const {before,initial,allocation,previousState,historyRows}of inputs.values()){
  expected.inputStates[expected.inputStates.indexOf(initial)]=previousState;
  expected.revisionAllocations=expected.revisionAllocations.filter(row=>row.id!==allocation.id);
  for(const row of historyRows.values())expected.revisionAllocations.push({id:row.id,sequence:row.sequence,listKey:row.listKey,documentList:row.documentList});
  const edits=groups.working.filter(group=>group.prepared.descriptor.value.inputId===before.id),filter=await t.get('filterInputs',before.id),oldFilter=expected.filterInputs.find(item=>item.id===before.id);expected.filterInputs[expected.filterInputs.indexOf(oldFilter)]=requireSourceUnionWorkingFilter(edits,oldFilter,filter);
 }
 for(const name of ['inputStates','revisionAllocations','filterInputs'])order(expected[name]);charge(core,expected);if(!equalSourceWorkingPhysicalTree(currentCut,expected))invalid();
 const sourceOnly={previous:groups.previous,added:[],working:[]};await requireSourceUnionPublicationPhysical(core,t,originalCut,originalCut,sourceOnly,canonical);
 const invalidations=await readGroupRows(t,'invalidations'),receipts=await readGroupRows(t,'operationReceipts');charge(core,invalidations);charge(core,receipts);
 if(invalidations.length!==events.length||receipts.length!==events.length)invalid();
 for(const {descriptor,inputId,contentRevision,sequence} of events){
  const event=invalidations.find(row=>row.sequence===sequence),receipt=receipts.find(row=>row.id===descriptor.id);
  if(!event||typeof event.id!=='string'||!event.id||typeof event.at!=='string'||!Number.isFinite(Date.parse(event.at))||!equal(event,{id:event.id,eventSchema:2,inputId,reason:'source_updated',contentRevision,sequence,at:event.at,stateKey:0,state:'pending',cursor:null,dependencyAck:false,organizerAck:false}))invalid();
  if(!receipt||typeof receipt.createdAt!=='string'||!Number.isFinite(Date.parse(receipt.createdAt))||!(/^[a-f0-9]{64}$/).test(receipt.digest)||!equal(receipt,{id:descriptor.id,namespace:'working-input',schemaVersion:1,ownerId:descriptor.documentId,createdAt:receipt.createdAt,digest:receipt.digest,result:{ok:true}}))invalid();
 }
}
