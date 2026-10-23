import {prepareOriginalActiveSourceWorkingRows,projectOriginalActiveSourceWorkingRows} from './canonical-generation-publication.js';
import {syncArchiveYearIndex} from '../archive-year-index.js';
import {measureSourceWorkingPhysicalTree,equalSourceWorkingPhysicalTree} from './source-working-physical.js';
import {prepareCurrentSourceWorkingGroupCheckpointPlan} from './group-checkpoint-plan.js';
import {prepareGroupScope} from './group-checkpoint-scope.js';
import {initialSourceWorkingReplay,restoredSourceWorkingReplay,mergedSourceWorkingReplay,sourceWorkingTimelineKey} from './source-working-replay.js';
import {assertSourceWorkingDefaultMeta,assertSourceWorkingRestoredDefaultMeta,assertSourceWorkingMergedDefaultMeta,planSourceWorkingSemanticMetadata} from './source-working-default-meta.js';
import {prepareSourceWorkingMergedComparison,requireSourceWorkingMergedComparison} from './source-working-canonical.js';
import {readGroupRows} from './group-page-reader.js';
import {registerRepositoryFinalReadFence,requireRepositoryTransactionScope} from '../idb-repository.js';
import {bytes,clone,equal,fail} from './value.js';
const rawSnapshots=new WeakMap(),seals=new WeakMap();
const refuse=()=>fail('BNS_RESTORE_LOCAL_CHANGED');
const freeze=value=>{if(value&&typeof value==='object'){for(const next of Object.values(value))freeze(next);Object.freeze(value);}return value;};
export async function sourceWorkingMergeSnapshot(store,core,stage,t){
 if(store.repository!==core.repository||stage.repository!==core.repository)refuse();const rows={};let retained=0;for(const name of core.repository.stores){rows[name]=await readGroupRows(t,name);for(const row of rows[name]){retained+=measureSourceWorkingPhysicalTree(row).B;if(retained>2*1024*1024)fail('BNS_GROUP_RESOURCE_LIMIT');}}
 const prefix=stage.prefix+'generation:'+stage.fixedNamespace+':',raw={...rows};rows.meta=rows.meta.filter(row=>!row.id.startsWith(prefix));freeze(rows);freeze(raw);rawSnapshots.set(rows,raw);return rows;
}
async function qualifiedSnapshot(store,core,stage,t,before){
 const rows=await sourceWorkingMergeSnapshot(store,core,stage,t),projected=projectOriginalActiveSourceWorkingRows(core.repository,before,rows);rawSnapshots.set(projected,rawSnapshots.get(rows));return projected;
}
export async function prepareSourceWorkingMerge(store,core,stage,operations,remotePlan,restoreId){
 const plan=await prepareCurrentSourceWorkingGroupCheckpointPlan(core,operations),scope=await prepareGroupScope(plan),raw=await store.run(()=>core.transaction(false,t=>sourceWorkingMergeSnapshot(store,core,stage,t))),rows=await prepareOriginalActiveSourceWorkingRows(core.repository,raw),active=rows.meta.find(r=>r.id===core.prefix+'active'),namespace=active?.namespace??'initial';rawSnapshots.set(rows,rawSnapshots.get(raw));let replay;
 if(rows.meta.some(r=>r.id===sourceWorkingTimelineKey(core,namespace))){await assertSourceWorkingMergedDefaultMeta(core,scope,plan,rows,store.controlCache,store.databaseId);replay=await mergedSourceWorkingReplay(core,scope,plan,rows);}
 else if(active){await assertSourceWorkingRestoredDefaultMeta(core,scope,plan,rows,store.controlCache,store.databaseId);replay=await restoredSourceWorkingReplay(core,scope,plan,rows);}
 else{assertSourceWorkingDefaultMeta(core,scope,plan,rows,store.controlCache,store.databaseId);replay=initialSourceWorkingReplay(core,scope,plan);}
 const map=new Map(operations.map(op=>[op.revisionId,op]));for(const group of remotePlan.groups)for(const op of group.operations){const old=map.get(op.revisionId);if(old&&!equal(old,op))refuse();map.set(op.revisionId,op);}
 const merged=await prepareCurrentSourceWorkingGroupCheckpointPlan(core,[...map.values()]),after=await prepareGroupScope(merged),known=new Set(operations.map(op=>op.revisionId)),incoming=merged.groups.filter(g=>g.operations.some(op=>!known.has(op.revisionId)));
 if(incoming.some(g=>g.operations.some(op=>known.has(op.revisionId)||op.deviceId===core.deviceId)))refuse();
 const timeline=replay.timeline?clone(replay.timeline):{id:sourceWorkingTimelineKey(core,namespace),version:1,namespace,base:replay.transactions.map(tx=>tx.map(g=>g.id)),batches:[]};
 const previous=new Set([...timeline.base.flat(),...timeline.batches.flatMap(b=>[...b.local,...b.incoming])]),local=replay.transactions.flat().filter(g=>!previous.has(g.id)).map(g=>g.id);
 timeline.batches.push({restoreId,before:plan.digest,after:merged.digest,local,incoming:incoming.map(g=>g.id)});if(timeline.batches.length>128||bytes(timeline).length>2*1024*1024)fail('BNS_GROUP_RESOURCE_LIMIT');
 return {plan,scope,rows,merged,after,incoming,timeline,namespace,semantic:planSourceWorkingSemanticMetadata([...replay.transactions,...(incoming.length?[incoming]:[])])};
}
export async function requireSourceWorkingMergeBase(store,core,stage,t,prepared){const rows=await qualifiedSnapshot(store,core,stage,t,prepared.rows);if(!equalSourceWorkingPhysicalTree(rows,prepared.rows))refuse();}
export async function prepareSourceWorkingMergeResult(core,prepared,receipt){const rows={meta:[...prepared.rows.meta.filter(row=>row.id!==prepared.timeline.id),prepared.timeline,receipt]};return prepareSourceWorkingMergedComparison(core,prepared.after,prepared.merged,rows);}
export async function requireSourceWorkingMergeResult(store,core,stage,t,prepared,comparison){
 const rows=await qualifiedSnapshot(store,core,stage,t,prepared.rows),replay=requireSourceWorkingMergedComparison(core,prepared.after,prepared.merged,rows,comparison);
 // The original incoming owners may change only these fully replayed local
 // counters. All other infrastructure, secrets, queued local work and prior
 // local retry/invalidations must retain the PRE-write exact cut. A post-owner
 // snapshot is not authority to adopt mutations to optional/default metadata.
 const counters=new Map([['sequence',{records:replay.records.size,blocks:replay.blocks.size,documents:replay.documents.size}],['thought-epoch',{value:replay.working.length}],['input-delta-sequence',{value:replay.delta}],['revision-sequence',{value:replay.revision}]]);
 for(const [id,value]of counters)if(!equalSourceWorkingPhysicalTree(rows.meta.find(r=>r.id===id),{id,...value}))refuse();
 const immutable=row=>!row.id.startsWith('bns:')&&!counters.has(row.id)||row.id.startsWith(core.prefix+'generation:'+prepared.namespace+':outbox:');
 const expectedMeta=new Map(prepared.rows.meta.map(row=>[row.id,row])),previousIndex=new Map(prepared.rows.blockIndex.map(row=>[row.id,row]));
 // Replay only the original disposable annual-index writer over its verified
 // before/after index projections. Its build-marker revision is local state,
 // never inferred from the post-owner metadata being validated.
 const annual={get:async(table,id)=>{if(table!=='meta')refuse();return expectedMeta.get(id);},put:async(table,row)=>{if(table!=='meta')refuse();expectedMeta.set(row.id,row);},delete:async(table,id)=>{if(table!=='meta')refuse();expectedMeta.delete(id);},count:async()=>refuse()};
 for(const next of rows.blockIndex)await syncArchiveYearIndex(annual,previousIndex.get(next.id)??null,next);
 const sorted=list=>list.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
 if(!equalSourceWorkingPhysicalTree(sorted(rows.meta.filter(immutable)),sorted([...expectedMeta.values()].filter(immutable))))refuse();
 if(!equalSourceWorkingPhysicalTree(rows.operationReceipts,prepared.rows.operationReceipts))refuse();
 for(const row of prepared.rows.invalidations)if(!equalSourceWorkingPhysicalTree(rows.invalidations.find(r=>r.id===row.id),row))refuse();
 const changedInputs=new Set(prepared.incoming.filter(g=>g.type==='inputWorkingCommit').map(g=>g.prepared.descriptor.value.inputId));
 for(const row of prepared.rows.filterInputs)if(!changedInputs.has(row.id)&&!equalSourceWorkingPhysicalTree(rows.filterInputs.find(r=>r.id===row.id),row))refuse();
 const prefix=stage.prefix+'generation:'+stage.fixedNamespace+':',restoreId=prefix+'restore:',raw=rawSnapshots.get(rows),before=rawSnapshots.get(prepared.rows),receipt=rows.meta.find(r=>r.id===core.prefix+'generation:'+prepared.namespace+':mergeCommit:'+encodeURIComponent(stage.fixedNamespace)),old=before.meta.find(r=>r.id===restoreId);
 if(!old||!receipt)refuse();
 const expected=before.meta.filter(r=>r.id.startsWith(prefix)).map(row=>row.id===restoreId?{...old,phase:'merged',mergeNamespace:prepared.namespace,mergeDigest:prepared.merged.digest,mergeReceipts:receipt.receipts}:row);
 if(!equalSourceWorkingPhysicalTree(raw.meta.filter(r=>r.id.startsWith(prefix)),expected))refuse();
 const seal=Object.freeze({});seals.set(seal,{store,core,stage,t,rows:raw});return seal;
}
// Register after original semantic/protocol qualification, before any external
// checkpoint callback. Raw terminal reads close every canonical row and the
// exact protocol namespaces; no post-callback mutation is adopted as baseline.
export async function sealSourceWorkingMerge(store,core,stage,t,started,semantic,seal){
 requireRepositoryTransactionScope(store.repository,t);const bound=seals.get(seal);if(!bound||bound.store!==store||bound.core!==core||bound.stage!==stage||bound.t!==t)refuse();seals.delete(seal);const db=core.repository.db,points=[],counts=[];let retained=0;
 const current=()=>{if(core.repository!==store.repository||core.repository.db!==db||performance.now()-started>=30000)fail('BNS_GROUP_RESOURCE_LIMIT');return true;};
 const retain=value=>{retained+=measureSourceWorkingPhysicalTree(value).B;if(retained>2*1024*1024)fail('BNS_GROUP_RESOURCE_LIMIT');return structuredClone(value);};
 for(const table of core.repository.stores){current();const rows=bound.rows[table];if(table!=='meta'){counts.push({table,value:rows.length});for(const row of rows)points.push({table,key:row.id,value:retain(row)});continue;}
  const eligible=rows.filter(row=>!row.id.startsWith('aiu:delta:'));for(const row of eligible){let expected=row;if(row.id==='backup-data-generation'&&t.backupChanged)expected={...row,value:row.value+1};points.push({table,key:row.id,value:retain(expected)});}
  for(const key of [IDBKeyRange.upperBound('aiu:delta:',true),IDBKeyRange.lowerBound('aiu:delta:\uffff',true)])counts.push({table,key,value:eligible.filter(r=>key.includes(r.id)).length});
 }
 const semanticRows=[...semantic.known,...semantic.dirty,semantic.sequence,...(semantic.humanFence?[semantic.humanFence]:[])];counts.push({table:'meta',key:IDBKeyRange.bound('aiu:delta:','aiu:delta:\uffff'),value:semanticRows.length});for(const row of semanticRows)points.push({table:'meta',key:row.id,value:retain(row)});
 current();registerRepositoryFinalReadFence(store.repository,t,{isCurrent:current,plan:function*(){for(const c of counts)if((yield {method:'count',table:c.table,...(c.key?{key:c.key}:{})})!==c.value)refuse();for(const p of points)if(!equalSourceWorkingPhysicalTree((yield {method:'get',table:p.table,key:p.key})??null,p.value))refuse();return true;}});
}

// Both snapshots must originate from this module's original real-repository
// capture. Verify the entire staged namespace before sealing the consuming
// merge; a later raw snapshot cannot authorize a changed manifest or cursor.
export function requireOriginalMergeStageTransition(core,stage,before,after,receipt,digest){
 const original=rawSnapshots.get(before),current=rawSnapshots.get(after);if(!original||!current||stage.repository!==core.repository)refuse();
 const prefix=stage.prefix+'generation:'+stage.fixedNamespace+':',id=prefix+'restore:',old=original.meta.find(r=>r.id===id);if(!old)refuse();
 const expected=original.meta.filter(r=>r.id.startsWith(prefix)).map(r=>r.id===id?{...old,phase:'merged',mergeNamespace:receipt.namespace,mergeDigest:digest,mergeReceipts:receipt.receipts}:r);
 if(!equalSourceWorkingPhysicalTree(current.meta.filter(r=>r.id.startsWith(prefix)),expected))refuse();
}

// Read-only reuse of the exact already captured real transaction cut; no new
// authority or unvalidated caller snapshot is accepted.
export function originalMergeRawSnapshot(snapshot){const raw=rawSnapshots.get(snapshot);if(!raw)refuse();return raw;}
