import {CONSENT_VERSION} from '../constants.js';
import {protocolObject} from './segments.js';
import {assertGroupedCheckpointManifest} from './group-checkpoint-manifest.js';
import {prepareOriginalMixedWireOwnerScope} from './group-checkpoint-scope.js';
import {requireOriginalCurrentMixedGroupPlan,prepareCurrentMixedGroupCheckpointPlan} from './group-checkpoint-plan.js';
import {assertCompletedGroupedRestoreControl} from './completed-group-restore-control.js';
import {bytes,count,equal,exact,hash,opaque,fail} from './value.js';
const refuse=()=>fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
const precise=(v,keys)=>exact(v,keys)&&Object.keys(v).length===keys.length;
export const mixedTimelineKey=(core,namespace)=>core.prefix+'generation:'+namespace+':mixedTimeline:';
function requireLocalSequence(groups){const ops=groups.flatMap(g=>g.operations).sort((a,b)=>a.sequence-b.sequence);if(ops.some((op,i)=>op.sequence!==i+1))refuse();for(const g of groups){const seq=g.operations.map(op=>op.sequence).sort((a,b)=>a-b);if(seq.some((n,i)=>n!==seq[0]+i))refuse();}}
// Exact body-free committed transaction order; never authority to import rows,
// discard history, bypass an original owner or choose a concurrent winner.
export async function readMixedMergeChronology(core,plan,rows){
 requireOriginalCurrentMixedGroupPlan(core,plan);const active=rows.meta.find(r=>r.id===core.prefix+'active'),namespace=active?.namespace??'initial',timeline=rows.meta.find(r=>r.id===mixedTimelineKey(core,namespace));
 if(!timeline||!precise(timeline,['id','version','namespace','base','batches'])||timeline.version!==1||timeline.namespace!==namespace||!Array.isArray(timeline.base)||!timeline.base.length||!Array.isArray(timeline.batches)||!timeline.batches.length||timeline.batches.length>128)refuse();
 const groups=new Map(plan.groups.map(g=>[g.id,g])),used=new Set(),transactions=[],extra=[],take=ids=>{if(!Array.isArray(ids)||!ids.length||ids.length>128)refuse();return ids.map(id=>{const group=groups.get(id);if(!hash(id)||!group||used.has(id))refuse();used.add(id);return group;});};
 for(const ids of timeline.base)transactions.push(take(ids));let current=await prepareCurrentMixedGroupCheckpointPlan(core,transactions.flat().flatMap(g=>g.operations));
 let completedId;
 if(active){const completed=rows.meta.filter(r=>r.id.startsWith(core.prefix+'generation:')&&r.id.endsWith(':restore:')&&r.phase==='activated');if(completed.length!==1)refuse();completedId=completed[0].id;await assertCompletedGroupedRestoreControl(completed[0],{prefix:core.prefix,datasetId:core.datasetId,active,namespace,epoch:null});const first=await prepareCurrentMixedGroupCheckpointPlan(core,transactions[0].flatMap(g=>g.operations)),prefixScope=await prepareOriginalMixedWireOwnerScope(core,first);if(first.digest!==completed[0].graphDigest||!equal(prefixScope,completed[0].manifest.ownerScope))refuse();for(const tx of transactions.slice(1))if(tx.length!==1||tx.some(g=>g.operations.some(op=>op.deviceId!==core.deviceId)))refuse();}
 else for(const tx of transactions)if(tx.length!==1||tx.some(g=>g.operations.some(op=>op.deviceId!==core.deviceId)))refuse();
 for(const batch of timeline.batches){
  if(!precise(batch,['restoreId','before','after','local','incoming'])||!opaque(batch.restoreId)||!hash(batch.before)||!hash(batch.after)||!Array.isArray(batch.local)||!Array.isArray(batch.incoming))refuse();
  for(const id of batch.local){const tx=take([id]);if(tx[0].operations.some(op=>op.deviceId!==core.deviceId))refuse();transactions.push(tx);}
  current=await prepareCurrentMixedGroupCheckpointPlan(core,transactions.flat().flatMap(g=>g.operations));if(current.digest!==batch.before)refuse();
  if(batch.incoming.length){const tx=take(batch.incoming);if(tx.some(g=>g.operations.some(op=>op.deviceId===core.deviceId)))refuse();transactions.push(tx);}
  current=await prepareCurrentMixedGroupCheckpointPlan(core,transactions.flat().flatMap(g=>g.operations));if(current.digest!==batch.after||!equal(current.groups.filter(g=>batch.incoming.includes(g.id)).map(g=>g.id),batch.incoming))refuse();
  const id=core.prefix+'generation:'+namespace+':mergeCommit:'+encodeURIComponent(batch.restoreId),receipt=rows.meta.find(r=>r.id===id);
  if(!receipt||!precise(receipt,['id','version','restoreId','namespace','epoch','manifestId','graphDigest','mergeDigest','receipts'])||receipt.version!==1||receipt.restoreId!==batch.restoreId||receipt.namespace!==namespace||receipt.epoch!==null||receipt.mergeDigest!==batch.after||!hash(receipt.manifestId)||!hash(receipt.graphDigest)||!Array.isArray(receipt.receipts)||receipt.receipts.length>128||new Set(receipt.receipts.map(r=>r.operationId)).size!==receipt.receipts.length)refuse();
  for(const ref of receipt.receipts){const op=current.groups.flatMap(g=>g.operations).find(op=>op.operationId===ref.operationId);if(!op||!equal(ref,{operationId:op.operationId,revisionId:op.revisionId,deviceId:op.deviceId,sequence:op.sequence}))refuse();}for(const group of transactions.at(-1)??[])if(batch.incoming.includes(group.id)&&group.operations.some(op=>!receipt.receipts.some(r=>r.revisionId===op.revisionId)))refuse();extra.push(receipt);
  const stage=rows.meta.find(r=>r.id===core.prefix+'generation:'+batch.restoreId+':restore:');if(stage){await assertMergedControl(core,stage,receipt,current);extra.push(stage);}
 }
 const local=[...groups.values()].filter(g=>!used.has(g.id)).sort((a,b)=>Math.min(...a.operations.map(op=>op.sequence))-Math.min(...b.operations.map(op=>op.sequence)));for(const group of local){if(group.operations.some(op=>op.deviceId!==core.deviceId))refuse();transactions.push([group]);}
 requireLocalSequence(transactions.flat().filter(g=>g.operations.every(op=>op.deviceId===core.deviceId)));return Object.freeze({transactions,namespace,active:active??null,completedId,merged:true,timeline,extra});
}

async function assertMergedControl(core,row,receipt,current){
 if(!precise(row,['id','manifestId','manifestRef','manifest','phase','base','replayId','received','graphDigest','cleanup','mergeNamespace','mergeDigest','mergeReceipts'])||row.phase!=='merged'||!equal(row.cleanup,{namespace:1,after:null,complete:true})||row.manifestId!==receipt.manifestId||row.graphDigest!==receipt.graphDigest||row.mergeNamespace!==receipt.namespace||row.mergeDigest!==receipt.mergeDigest||!equal(row.mergeReceipts,receipt.receipts)||!opaque(row.replayId)||!precise(row.base,['namespace','generation','ownerGeneration','fence','settings'])||!count(row.base.generation)||!count(row.base.ownerGeneration)||row.base.namespace!==receipt.namespace||row.base.fence.epoch!==receipt.epoch)refuse();
 const b=row.base,f=b.fence,s=b.settings;if(!precise(f,['epoch','namespace','marker'])||f.namespace!==b.namespace||typeof f.marker!=='boolean'||!precise(s,['consentVersion','consentAt','enabled','epoch'])||s.consentVersion!==CONSENT_VERSION||s.enabled!==true||!count(s.epoch)||s.epoch<1||typeof s.consentAt!=='string'||!Number.isFinite(Date.parse(s.consentAt)))refuse();
 assertGroupedCheckpointManifest(row.manifest,{core:{datasetId:core.datasetId}});if(row.received!==row.manifest.itemCount)refuse();const encoded=await protocolObject('checkpoint-manifest',bytes(row.manifest));if(!equal(encoded.ref,row.manifestRef)||encoded.ref.id!==row.manifestId)refuse();
 const ids=new Set(receipt.receipts.map(r=>r.revisionId)),selected=current.groups.flatMap(g=>g.operations).filter(op=>ids.has(op.revisionId)),remote=await prepareCurrentMixedGroupCheckpointPlan(core,selected),scope=await prepareOriginalMixedWireOwnerScope(core,remote);if(remote.digest!==row.graphDigest||!equal(scope,row.manifest.ownerScope))refuse();
}
