import {humanIncrementalExpectedMetadata} from './human-library-group.js';
import {prepareGroupCheckpointPlan,prepareCurrentMixedGroupCheckpointPlan} from './group-checkpoint-plan.js';
import {prepareGroupScope,requireGroupScope} from './group-checkpoint-scope.js';
import {prepareMixedRestoredAllocationProof,assertMixedRestoredPhysicalAllocations} from './mixed-restored-allocation.js';
import {mixedTimelineKey,readMixedMergeChronology} from './mixed-merge-chronology.js';
import {sourceWorkingMergeSnapshot,requireOriginalMergeStageTransition,originalMergeRawSnapshot} from './source-working-merge.js';
import {checkCurrentGroupProtocolRows} from './current-group-protocol-rows.js';
import {registerRepositoryFinalReadFence,requireRepositoryTransactionScope} from '../idb-repository.js';
import {measureSourceWorkingPhysicalTree,equalSourceWorkingPhysicalTree} from './source-working-physical.js';
import {planSourceWorkingSemanticMetadata} from './source-working-default-meta.js';
import {bytes,clone,equal,fail} from './value.js';
import {assertMixedInitialPhysicalAllocations,assertMixedInitialHumanPhysicalAllocations} from './mixed-initial-allocation.js';
import {assertMixedCurrentSourceDerivedRows} from './mixed-current-source-derived.js';
import {syncArchiveYearIndex} from '../archive-year-index.js';
import {FILTER_VERSIONS} from '../smart-filter.js';
import {exact,opaque} from './value.js';
const resultProofs=new WeakMap();
const refuse=()=>fail('BNS_RESTORE_LOCAL_CHANGED');
export async function prepareMixedNonemptyMerge(store,core,stage,localOperations,remotePlan,restoreId){
 const beforePlan=await prepareGroupCheckpointPlan(core,localOperations),beforeScope=await prepareGroupScope(beforePlan,{store}),snapshot=await store.run(()=>core.transaction(false,async t=>{await requireGroupScope(store,t,beforeScope);return sourceWorkingMergeSnapshot(store,core,stage,t);}));
 const plan=await prepareCurrentMixedGroupCheckpointPlan(core,localOperations),active=snapshot.meta.find(r=>r.id===core.prefix+'active'),namespace=active?.namespace??'initial';let transactions;
 if(snapshot.meta.some(r=>r.id===mixedTimelineKey(core,namespace)))transactions=(await readMixedMergeChronology(core,plan,snapshot)).transactions;
 else if(active){const proof=await prepareMixedRestoredAllocationProof(core,plan,snapshot.meta);transactions=originalMixedReplayForMerge(core,plan,proof);}
 else transactions=[...plan.groups].sort((a,b)=>Math.min(...a.operations.map(o=>o.sequence))-Math.min(...b.operations.map(o=>o.sequence))).map(g=>[g]);
 checkCurrentGroupProtocolRows(core,plan,snapshot,{namespace,epoch:null,restored:!!active,merged:snapshot.meta.some(r=>r.id===mixedTimelineKey(core,namespace)),activeId:active?.id,completedId:snapshot.meta.find(r=>r.id.endsWith(':restore:')&&r.phase==='activated')?.id});
 const priorAllocation=active||snapshot.meta.some(r=>r.id===mixedTimelineKey(core,namespace))?await prepareMixedRestoredAllocationProof(core,plan,snapshot.meta):undefined,fixedScope=await prepareGroupScope(plan,{store,mixedAllocationProof:priorAllocation});if(priorAllocation)assertMixedRestoredPhysicalAllocations(core,fixedScope,plan,snapshot,snapshot.meta,priorAllocation,snapshot);else{assertMixedInitialPhysicalAllocations(core,fixedScope,plan,snapshot,{active:null,input:snapshot.meta.find(r=>r.id==='input-delta-sequence'),history:snapshot.meta.find(r=>r.id==='revision-sequence')});assertMixedInitialHumanPhysicalAllocations(core,fixedScope,plan,snapshot,snapshot.meta);}
 const operations=new Map(localOperations.map(o=>[o.revisionId,o]));for(const group of remotePlan.groups)for(const op of group.operations){const prior=operations.get(op.revisionId);if(prior&&!equal(prior,op))refuse();operations.set(op.revisionId,op);}
 const merged=await prepareCurrentMixedGroupCheckpointPlan(core,[...operations.values()]),known=new Set(localOperations.map(o=>o.revisionId)),incoming=merged.groups.filter(g=>g.operations.some(o=>!known.has(o.revisionId)));
 if(incoming.some(g=>g.operations.some(o=>known.has(o.revisionId)||o.deviceId===core.deviceId)))refuse();
 // Each incoming family uses its original predecessor-aware owner. Other
 // families and interleaved owner cuts need their own preparation; portable
 // rows alone cannot authorize adoption.
 if(incoming.some(g=>!['inputWorkingCommit','humanLibraryCommit'].includes(g.type))||incoming.some(g=>g.type==='humanLibraryCommit')&&incoming.some(g=>g.type==='inputWorkingCommit'))fail('BNS_GROUP_MERGE_OWNER_UNSUPPORTED');
 const afterPlan=await prepareGroupCheckpointPlan(core,[...operations.values()]),afterScope=await prepareGroupScope(afterPlan,{store}),prior=snapshot.meta.find(r=>r.id===mixedTimelineKey(core,namespace));
 const timeline=prior?clone(prior):{id:mixedTimelineKey(core,namespace),version:1,namespace,base:transactions.map(tx=>tx.map(g=>g.id)),batches:[]},previous=new Set([...timeline.base.flat(),...timeline.batches.flatMap(b=>[...b.local,...b.incoming])]);
 const local=transactions.flat().filter(g=>!previous.has(g.id)).map(g=>g.id);timeline.batches.push({restoreId,before:plan.digest,after:merged.digest,local,incoming:incoming.map(g=>g.id)});if(timeline.batches.length>128||bytes(timeline).length>2*1024*1024)fail('BNS_GROUP_RESOURCE_LIMIT');
 return {snapshot,beforePlan,beforeScope,afterPlan,afterScope,plan,merged,incoming,namespace,timeline,transactions:[...transactions,...(incoming.length?[incoming]:[])],semantic:planSourceWorkingSemanticMetadata([...transactions,...(incoming.length?[incoming]:[])])};
}
import {originalMixedAllocationTransactions} from './mixed-restored-allocation.js';
const originalMixedReplayForMerge=(core,plan,proof)=>originalMixedAllocationTransactions(core,plan,proof);
export async function requireMixedNonemptyBase(store,core,stage,t,p){if(!equalSourceWorkingPhysicalTree(await sourceWorkingMergeSnapshot(store,core,stage,t),p.snapshot))refuse();}
export async function prepareMixedNonemptyResult(store,core,p,receipt,humanApplication=null){
 const humanMetadata=humanApplication?humanIncrementalExpectedMetadata(store,core,humanApplication):{meta:[],search:[],tables:{}};
 const meta=p.snapshot.meta.filter(r=>r.id!==p.timeline.id);meta.push(p.timeline,receipt);
 const allocation=await prepareMixedRestoredAllocationProof(core,p.merged,meta),scope=await prepareGroupScope(p.merged,{store,mixedAllocationProof:allocation}),token=Object.freeze({});
 resultProofs.set(token,{core,p,receipt,scope,allocation,humanMetadata});return token;
}
function sorted(rows){return [...rows].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);}
function same(a,b){if(!equalSourceWorkingPhysicalTree(sorted(a),sorted(b)))refuse();}
function qualifyWorkingDerivatives(p,now){
 const working=p.transactions.flat().filter(g=>g.type==='inputWorkingCommit'),changed=new Set(p.incoming.filter(g=>g.type==='inputWorkingCommit').map(g=>g.prepared.descriptor.value.inputId));
 if(now.filterInputs.length!==p.snapshot.filterInputs.length||now.invalidations.length!==p.snapshot.invalidations.length+p.incoming.filter(g=>g.type==='inputWorkingCommit').length)refuse();
 for(const row of p.snapshot.invalidations)if(!equalSourceWorkingPhysicalTree(now.invalidations.find(r=>r.id===row.id),row))refuse();
 for(const row of p.snapshot.filterInputs)if(!changed.has(row.id)&&!equalSourceWorkingPhysicalTree(now.filterInputs.find(r=>r.id===row.id),row))refuse();
 const newRows=now.invalidations.filter(r=>!p.snapshot.invalidations.some(o=>o.id===r.id)),seen=new Set();
 for(const row of newRows){const group=p.incoming.find(g=>g.prepared.descriptor.value.inputId===row.inputId&&g.prepared.members.some(m=>m.value.entityType==='inputState'&&m.value.entity.contentRevision===row.contentRevision));if(!group||seen.has(group)||!exact(row,['id','eventSchema','inputId','reason','contentRevision','sequence','at','stateKey','state','cursor','dependencyAck','organizerAck'])||!opaque(row.id)||row.eventSchema!==2||row.reason!=='source_updated'||row.sequence!==working.indexOf(group)+1||!Number.isFinite(Date.parse(row.at))||row.stateKey!==0||row.state!=='pending'||row.cursor!==null||row.dependencyAck!==false||row.organizerAck!==false)refuse();seen.add(group);}
 for(const id of changed){const row=now.filterInputs.find(r=>r.id===id),input=p.afterScope.expected.blocks.find(b=>b.id===id),edits=working.filter(g=>g.prepared.descriptor.value.inputId===id);if(!row||!input||!Number.isFinite(Date.parse(row.overrideAt))||!equalSourceWorkingPhysicalTree(row,{id,documentId:input.documentId,authorship:'untouched',userEdited:true,filterOverride:'keep',presence:null,evaluationRevision:edits.length,pendingKey:1,decision:'keep',reasonCode:'user_protected',...FILTER_VERSIONS,basedOnContentRevision:0,overrideReason:'user_edit',overrideAt:row.overrideAt,failed:false}))refuse();}
}
export async function sealMixedNonemptyResult(store,core,stage,t,p,started,token){
 requireRepositoryTransactionScope(store.repository,t);await requireGroupScope(store,t,p.afterScope);const now=await sourceWorkingMergeSnapshot(store,core,stage,t),db=core.repository.db,points=[],counts=[];let size=0;
 const proof=resultProofs.get(token);if(!proof||proof.core!==core||proof.p!==p)refuse();resultProofs.delete(token);
 requireOriginalMergeStageTransition(core,stage,p.snapshot,now,proof.receipt,p.merged.digest);
 assertMixedRestoredPhysicalAllocations(core,proof.scope,p.merged,now,now.meta,proof.allocation,now);
 assertMixedCurrentSourceDerivedRows(core,proof.scope,p.merged,now);
 qualifyWorkingDerivatives(p,now);
 const active=now.meta.find(r=>r.id===core.prefix+'active'),protocol=checkCurrentGroupProtocolRows(core,p.merged,now,{namespace:p.namespace,epoch:null,restored:!!active,merged:true,activeId:active?.id});
 const consumed=new Set([...protocol.used].filter(Boolean));
 // Physical allocation above independently checked these exact mappings. All
 // other protocol/control/default rows retain the pre-owner cut, including any
 // future or unknown metadata: prefixes are never a metadata exemption.
 for(const head of p.merged.heads){if(head.type==='inputWorkingMember'&&head.entityId.startsWith('input:'))consumed.add(protocol.key('workingOwner',head.entityId.slice(6)));else if(head.type==='inputWorkingMember'&&head.entityId.startsWith('revision:'))consumed.add(protocol.key('workingHistory',head.entityId.slice(9)));else if(head.type==='humanLibraryMember')consumed.add(protocol.key('humanMapping',head.entityId));}
 const counters=new Map([['sequence',{id:'sequence',records:p.afterScope.expected.records.length,blocks:p.afterScope.expected.blocks.length,documents:p.afterScope.expected.documents.length}],['thought-epoch',{id:'thought-epoch',value:p.transactions.flat().filter(g=>g.type==='inputWorkingCommit').length}]]);
 for(const[id,row]of counters){if(!equal(now.meta.find(r=>r.id===id),row))refuse();consumed.add(id);}for(const id of ['input-delta-sequence','revision-sequence','thought-sequence'])consumed.add(id);
 const expected=new Map(p.snapshot.meta.map(r=>[r.id,r]));expected.set(p.timeline.id,p.timeline);expected.set(proof.receipt.id,proof.receipt);for(const row of proof.humanMetadata.meta)expected.set(row.id,row);
 const priorIndex=new Map(p.snapshot.blockIndex.map(r=>[r.id,r])),annual={get:async(table,id)=>{if(table!=='meta')refuse();return expected.get(id);},put:async(table,row)=>{if(table!=='meta')refuse();expected.set(row.id,row);},delete:async(table,id)=>{if(table!=='meta')refuse();expected.delete(id);},count:async()=>refuse()};
 for(const row of now.blockIndex)await syncArchiveYearIndex(annual,priorIndex.get(row.id)??null,row);
 // Semantic changes are queued by the original repository and flush only at
 // the transaction boundary. Preserve the exact pre-flush rows here; the final
 // native read fence below checks the independently replayed post-flush rows.
 same(now.meta.filter(r=>!consumed.has(r.id)),[...expected.values()].filter(r=>!consumed.has(r.id)));
 const oldOutbox=p.snapshot.meta.filter(r=>r.id.startsWith(core.prefix+'generation:'+p.namespace+':outbox:'));same(now.meta.filter(r=>r.id.startsWith(core.prefix+'generation:'+p.namespace+':outbox:')),oldOutbox);
 for(const [table,rows]of Object.entries(proof.humanMetadata.tables))same(now[table],rows);
 const search=new Map(p.snapshot.libraryMigrationItems.map(r=>[r.id,r]));for(const row of proof.humanMetadata.search)search.set(row.id,row);same(now.libraryMigrationItems,[...search.values()]);
 const changedTables=new Set(['meta','blocks','blockIndex','documents','inputStates','revisions','filterInputs','filterIntents','invalidations','libraryMigrationItems',...(p.incoming.some(g=>g.type==='humanLibraryCommit')?['thoughts','topics','sections','placements','operationReceipts']:[])]);for(const table of core.repository.stores)if(!changedTables.has(table))same(now[table],p.snapshot[table]);
 const current=()=>{if(store.repository!==core.repository||core.repository.db!==db||performance.now()-started>=30000)fail('BNS_GROUP_RESOURCE_LIMIT');return true;};
 const keep=v=>{size+=measureSourceWorkingPhysicalTree(v).B;if(size>2*1024*1024)fail('BNS_GROUP_RESOURCE_LIMIT');return clone(v);};
 for(const table of core.repository.stores){current();const rows=originalMergeRawSnapshot(now)[table];if(table!=='meta'){counts.push({table,value:rows.length});for(const row of rows)points.push({table,key:row.id,value:keep(row)});continue;}
  const eligible=rows.filter(r=>!r.id.startsWith('aiu:delta:'));for(const row of eligible)points.push({table,key:row.id,value:keep(row.id==='backup-data-generation'&&t.backupChanged?{...row,value:row.value+1}:row)});
  for(const key of [IDBKeyRange.upperBound('aiu:delta:',true),IDBKeyRange.lowerBound('aiu:delta:\uffff',true)])counts.push({table,key,value:eligible.filter(r=>key.includes(r.id)).length});
 }
 const semantic=[...p.semantic.known,...p.semantic.dirty,p.semantic.sequence,...(p.semantic.humanFence?[p.semantic.humanFence]:[])];counts.push({table:'meta',key:IDBKeyRange.bound('aiu:delta:','aiu:delta:\uffff'),value:semantic.length});for(const row of semantic)points.push({table:'meta',key:row.id,value:keep(row)});
 registerRepositoryFinalReadFence(core.repository,t,{isCurrent:current,plan:function*(){for(const c of counts)if((yield {method:'count',table:c.table,...(c.key?{key:c.key}:{})})!==c.value)refuse();for(const p of points)if(!equalSourceWorkingPhysicalTree((yield {method:'get',table:p.table,key:p.key})??null,p.value))refuse();return true;}});
}
