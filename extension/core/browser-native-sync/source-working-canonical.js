import {planInitialFilter} from '../smart-filter-store-owner.js';
import {initialSourceWorkingReplay,restoredSourceWorkingReplay,mergedSourceWorkingReplay} from './source-working-replay.js';
import {checkCurrentGroupProtocolRows} from './current-group-protocol-rows.js';
import {STORES,FILTER_STORES,IA_STORES} from '../idb-repository.js';
import {LIBRARY_STORES} from '../thought-schema.js';
import {requireOriginalCurrentSourceWorkingGroupScope} from './group-checkpoint-scope.js';
import {assertSourceWorkingDerivedRows,assertSourceWorkingSpecialScalars} from './source-working-derived.js';
import {measureSourceWorkingPhysicalTree} from './source-working-physical.js';
import {FILTER_VERSIONS} from '../smart-filter.js';
import {assertCompletedGroupedRestoreControl} from './completed-group-restore-control.js';
import {equal,exact,hash,count,opaque,fail} from './value.js';

// Defer the body-free schema vector until invocation: this owner can join the
// original Core/Repository static import cycle in an MV3 worker. No imported
// repository binding is read while that original module is still initializing.
let currentStores;
export function sourceWorkingCurrentStores(){return currentStores??=Object.freeze([...STORES,...IA_STORES,...FILTER_STORES,...LIBRARY_STORES]);}
export const sourceWorkingCurrentNonemptyStores=Object.freeze(['meta','records','recordIndex','blocks','blockIndex','documents','libraryDocuments','times','sourceCounts','inputStates','revisions','filterInputs','filterIntents','operationReceipts','invalidations']);
const unrepresented=()=>fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
const unproven=()=>fail('BNS_GROUP_COMMIT_UNPROVEN');
const iso=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
function sameRows(actual,expected){
 if(actual.length!==expected.length)unrepresented();const rows=new Map(actual.map(row=>[row.id,row]));if(rows.size!==actual.length)unrepresented();
 for(const row of expected)if(!equal(rows.get(row.id),row))unrepresented();
}

// Pure canonical/protocol qualification after original native capture and paid
// compiler/builder frames. No reads, callbacks, writes or capability are exposed.
// The native owner must separately close the entire local/default meta inventory,
// authenticate complete indexes, and pin the complete raw cut at every boundary.
export function assertSourceWorkingCanonicalAndProtocolRows(core,scope,plan,rows){
 if(arguments.length!==4)unrepresented();requireOriginalCurrentSourceWorkingGroupScope(core,scope,plan);
 const replay=initialSourceWorkingReplay(core,scope,plan);qualifyRows(core,scope,plan,rows,{...replay,epoch:null});return replay;
}
// Pure qualification of the original frozen native cut. Completion authentication
// does not read storage or grant a projection; the fixed native caller prepays
// every immutable-control frame before this asynchronous identity check.
export async function assertSourceWorkingRestoredCanonicalAndProtocolRows(core,scope,plan,rows){
 if(arguments.length!==4)unrepresented();requireOriginalCurrentSourceWorkingGroupScope(core,scope,plan);measureSourceWorkingPhysicalTree(rows);if(core.fixedNamespace!==null)unrepresented();
 const replay=await restoredSourceWorkingReplay(core,scope,plan,rows);qualifyRows(core,scope,plan,rows,{...replay,epoch:null});return replay;
}

export async function assertSourceWorkingMergedCanonicalAndProtocolRows(core,scope,plan,rows){if(arguments.length!==4)unrepresented();const replay=await mergedSourceWorkingReplay(core,scope,plan,rows);qualifyRows(core,scope,plan,rows,{...replay,epoch:null});return replay;}
const mergedComparisons=new WeakMap();
export async function prepareSourceWorkingMergedComparison(core,scope,plan,rows){const replay=await mergedSourceWorkingReplay(core,scope,plan,rows),cap=Object.freeze({});mergedComparisons.set(cap,{core,scope,plan,replay});return cap;}
export function requireSourceWorkingMergedComparison(core,scope,plan,rows,cap){const bound=mergedComparisons.get(cap);if(!bound||bound.core!==core||bound.scope!==scope||bound.plan!==plan)unproven();qualifyRows(core,scope,plan,rows,{...bound.replay,epoch:null});return bound.replay;}
function qualifyRows(core,scope,plan,rows,replay){
 const {namespace,epoch,restored,activeId,completedId,working,localWorking,merged}=replay;
 requireOriginalCurrentSourceWorkingGroupScope(core,scope,plan);
 measureSourceWorkingPhysicalTree(rows);
 const stores=sourceWorkingCurrentStores();
 if(Object.keys(rows).length!==37||stores.some(name=>!Object.hasOwn(rows,name)||!Array.isArray(rows[name])))unrepresented();
 for(const name of stores){
  if(!sourceWorkingCurrentNonemptyStores.includes(name)&&rows[name].length)unrepresented();
  for(const row of rows[name])assertSourceWorkingSpecialScalars(name,row);
 }
 if(rows.meta.length>4096)unrepresented();
 assertSourceWorkingDerivedRows(core,scope,plan,rows,replay);
 const expected=scope.expected;
 sameRows(rows.records,expected.records.map(value=>({id:value.id,value})));
 sameRows(rows.blocks,expected.blocks.map(value=>({id:value.id,value})));
 sameRows(rows.libraryDocuments,expected.libraryDocuments.map(value=>({id:value.id,value})));
 sameRows(rows.times,expected.times);sameRows(rows.filterIntents,expected.filterIntents);
 const {meta,key,used,take}=checkCurrentGroupProtocolRows(core,plan,rows,{namespace,epoch,restored,activeId,completedId,merged});
 if(merged)for(const row of [replay.timeline,...replay.extra]){const {id,...value}=row;take(id,value);}
 for(const input of expected.blocks){const head=plan.heads.find(h=>h.type==='inputWorkingMember'&&h.entityId==='input:'+input.id);if(head)take(key('workingOwner',input.id),{revisionId:head.revisions[0],deltaSequence:replay.inputs.get(input.id)});}
 sameRows(rows.inputStates,expected.inputStates.map(row=>({...row,deltaSequence:replay.inputs.get(row.id)})));
 if(rows.revisions.length!==expected.revisions.length)unrepresented();
 for(const row of expected.revisions){
  const actual=rows.revisions.find(item=>item.id===row.id),head=plan.heads.find(head=>head.type==='inputWorkingMember'&&head.entityId==='revision:'+row.id),sequence=replay.history.get(row.id);
  if(!actual||!count(sequence)||sequence<1||actual.sequence!==sequence)unproven();
  if(head)take(key('workingHistory',row.id),{revisionId:head.revisions[0],sequence});
  if(!equal(actual,{...row,sequence,listKey:[row.entityKey,sequence],documentList:[row.documentId,sequence]}))unrepresented();
 }
 for(const row of rows.meta)if(row.id.startsWith('bns:')&&!used.has(row.id))unrepresented();
 // UI retry digests authenticate local retry evidence, not portable revision
 // digests; full request bytes are not reconstructed from a typed descriptor.

 if(rows.operationReceipts.length!==localWorking.length||new Set(rows.operationReceipts.map(row=>row.id)).size!==localWorking.length)unrepresented();
 for(const row of rows.operationReceipts)if(!exact(row,['id','namespace','schemaVersion','ownerId','createdAt','digest','result'])||!localWorking.some(group=>group.prepared.descriptor.entityId===row.id)||row.namespace!=='working-input'||row.schemaVersion!==1||row.ownerId!==localWorking.find(group=>group.prepared.descriptor.entityId===row.id)?.prepared.descriptor.value.documentId||!iso(row.createdAt)||!hash(row.digest)||!equal(row.result,{ok:true}))unrepresented();
 // Local pending derivatives remain local. Their exact immutable current cut
 // is pinned by the native owner; no history timestamp is invented or uploaded.
 if(rows.invalidations.length!==working.length||new Set(rows.invalidations.map(row=>row.id)).size!==working.length)unrepresented();
 const matched=new Set();for(const row of rows.invalidations){const group=working.find(g=>g.prepared.descriptor.value.inputId===row.inputId&&g.prepared.members.some(m=>m.value.entityType==='inputState'&&m.value.entity.contentRevision===row.contentRevision));if(!group||matched.has(group)||!exact(row,['id','eventSchema','inputId','reason','contentRevision','sequence','at','stateKey','state','cursor','dependencyAck','organizerAck'])||!opaque(row.id)||row.eventSchema!==2||row.reason!=='source_updated'||row.sequence!==working.indexOf(group)+1||!iso(row.at)||row.stateKey!==0||row.state!=='pending'||row.cursor!==null||row.dependencyAck!==false||row.organizerAck!==false)unrepresented();matched.add(group);}
 if(rows.filterInputs.length!==expected.blocks.length)unrepresented();const seen=new Set();for(const filter of rows.filterInputs){const input=expected.blocks.find(b=>b.id===filter.id),edits=working.filter(g=>g.prepared.descriptor.value.inputId===filter.id);if(!input||seen.has(filter.id))unrepresented();seen.add(filter.id);if(!edits.length){const initial=plan.groups.filter(g=>['sourceBootstrapCommit','sourceAppendCommit'].includes(g.type)).flatMap(g=>g.prepared.members),block=initial.find(m=>m.value.entityType==='input'&&m.value.entity.id===input.id)?.value.entity,state=initial.find(m=>m.value.entityType==='inputState'&&m.value.entity.id===input.id)?.value.entity;if(!block||!state||!equal(filter,planInitialFilter(block,state)))unrepresented();continue;}
 if(!exact(filter,['id','documentId','authorship','userEdited','filterOverride','presence','evaluationRevision','pendingKey','decision','reasonCode',...Object.keys(FILTER_VERSIONS),'basedOnContentRevision','overrideReason','overrideAt','failed'])||!equal(filter,{id:input.id,documentId:input.documentId,authorship:'untouched',userEdited:true,filterOverride:'keep',presence:null,evaluationRevision:edits.length,pendingKey:1,decision:'keep',reasonCode:'user_protected',...FILTER_VERSIONS,basedOnContentRevision:0,overrideReason:'user_edit',overrideAt:filter.overrideAt,failed:false})||!iso(filter.overrideAt))unrepresented();}
}
