import {GROUP_PAGE_LIMITS,readGroupRows,createGroupPageBudget,chargeGroupPageValue,chargeGroupPageBytes,checkGroupPageBudget} from './group-page-reader.js';
import {readObject,readSegmentDescriptor,SEGMENT_PROFILE} from './segments.js';
import {BrowserNativeSyncCore} from './core.js';
import {validateGroupedCheckpointGraph} from './group-checkpoint.js';
import {bytes,clone,decodeJSON,equal,fail,hash,opaque} from './value.js';

async function retainedState(restore){
 const state=await restore.stage.read('restore');
 if(restore.grouped){
  if(restore.grouped.store?.repository!==restore.live?.repository||restore.stage.repository!==restore.live.repository||restore.stage.datasetId!==restore.live.datasetId||!['validated','activated'].includes(state?.phase)||state.manifestRef?.kind!=='checkpoint-manifest'||state.manifestRef.id!==state.manifestId||!hash(state.graphDigest)||!opaque(state.replayId)||state.received!==state.manifest?.itemCount)fail('BNS_COMPACTION_UNVERIFIED');
  return state;
 }
 // A restored checkpoint and its later causal tail are distinct durable cuts.
 // Tail receipts prove local staging, not inclusion in the retained manifest.
 if(!['validated','activated'].includes(state?.phase)||state.manifestRef?.kind!=='checkpoint-manifest'||state.manifestRef.id!==state.manifestId||!Number.isSafeInteger(state.checkpointGeneration)||state.checkpointGeneration!==state.validatedGeneration||state.checkpointGeneration!==((await restore.stage.read('generation'))?.value||0))fail('BNS_COMPACTION_UNVERIFIED');
 return state;
}
// Grouped staging deliberately has no materialized Core receipts. Reconstruct
// the exact original validated graph, never treat absence as empty coverage.
async function groupedProof(restore,state){
 if(!restore.grouped)return null;
 const items=await restore.stage.transaction(false,async t=>(await readGroupRows(t,'meta',{prefix:await restore.stage.idIn(t,'groupItem')})).map(row=>row.item),['meta']);
 if(items.length!==state.received)fail('BNS_COMPACTION_UNVERIFIED');
 const replay=new BrowserNativeSyncCore(restore.live.repository,{datasetId:restore.live.datasetId,deviceId:restore.live.deviceId,namespace:state.replayId});
 const digest=await validateGroupedCheckpointGraph(replay,items,state.manifest,{store:restore.grouped.store});if(digest!==state.graphDigest)fail('BNS_COMPACTION_UNVERIFIED');
 return {receipts:new Map(items.filter(item=>item.kind==='revision').map(({operation})=>[operation.operationId,{digest:operation.revisionId}])),heads:items.filter(item=>item.kind==='head'),frontiers:items.filter(item=>item.kind==='frontier')};
}
async function* receiptRows(restore,proof){if(proof){for(const [operationId,receipt]of proof.receipts)yield {operationId,...receipt};}else for await(const receipt of restore.stage.rows('receipt'))yield {operationId:decodeURIComponent(receipt.id.split(':').at(-1)),digest:receipt.digest};}
const receiptAt=(restore,proof,id)=>proof?proof.receipts.get(id):restore.stage.read('receipt',id);
async function* headRows(restore,proof){if(proof)yield*proof.heads;else yield*restore.stage.rows('head');}
const headAt=(restore,proof,type,id)=>proof?proof.heads.find(row=>row.type===type&&row.entityId===id):restore.stage.read('head',type,id);
async function verifyManifest(state,get,profile){const actual=decodeJSON(await readObject(state.manifestRef,get,{profile}),profile.decoded);if(!equal(actual,state.manifest))fail('BNS_COMPACTION_MANIFEST_CHANGED');}
async function retainReferences(state,get,profile,protectedIds,visited){
 await verifyManifest(state,get,profile);protectedIds.add(state.manifestId);const stack=[state.manifest.root];
 while(stack.length){const ref=stack.pop();if(visited.has(ref.id))continue;visited.add(ref.id);protectedIds.add(ref.id);
  const page=decodeJSON(await readObject(ref,get,{profile}),profile.decoded);
  if(page.level>0){for(const child of page.children)stack.push(child);}
  else for(const entry of page.entries)if(entry.kind==='chunked')for(const chunk of entry.chunks){await readObject(chunk,get,{profile});protectedIds.add(chunk.id);}
 }
}

// Read-only eligibility planner. No provider deletion API is called here.
// The caller must retain two independently complete, validated generations;
// checkpoint IDs, causal receipts and explicit restore pins replace age/LWW.
export async function planCompaction({older,newer,descriptors,get,pinned=[],profile=SEGMENT_PROFILE}={}){
 if(!older?.stage||!newer?.stage||older.stage.datasetId!==newer.stage.datasetId||!Array.isArray(descriptors)||!Array.isArray(pinned)||pinned.some(id=>!hash(id)))fail('BNS_COMPACTION_INVALID');
 // Own the bounded inventory before the first asynchronous read. The budget
 // covers this planner invocation; eligibility is still only a snapshot.
 if(descriptors.length>GROUP_PAGE_LIMITS.refs||pinned.length>GROUP_PAGE_LIMITS.refs)fail('BNS_GROUP_RESOURCE_LIMIT');
 const budget=createGroupPageBudget();chargeGroupPageValue(budget,{descriptors,pinned,profile});
 descriptors=clone(descriptors);pinned=clone(pinned);profile=clone(profile);
 const remote=get;get=async ref=>{checkGroupPageBudget(budget);const raw=await remote(ref);checkGroupPageBudget(budget);if(raw instanceof Uint8Array)chargeGroupPageBytes(budget,raw.byteLength);return raw;};
 const previous=await retainedState(older),current=await retainedState(newer),previousProof=await groupedProof(older,previous),currentProof=await groupedProof(newer,current);
 if(previous.manifestId===current.manifestId||!current.manifest.parents.includes(previous.manifestId))fail('BNS_COMPACTION_REDUNDANCY');
 for await(const receipt of receiptRows(older,previousProof)){
  const retained=await receiptAt(newer,currentProof,receipt.operationId);
  if(!retained||retained.digest!==receipt.digest)fail('BNS_COMPACTION_INCOMPARABLE');
 }
 // A generation carrying a purged body is not retained merely to satisfy the
 // two-copy rule. Build a second body-free complete generation first.
 for await(const head of headRows(newer,currentProof))if(head.purged){const previousHead=await headAt(older,previousProof,head.type,head.entityId);if(previousHead&&!previousHead.purged)fail('BNS_COMPACTION_PURGE_RETENTION');}
 const protectedIds=new Set(),visited=new Set();await retainReferences(previous,get,profile,protectedIds,visited);await retainReferences(current,get,profile,protectedIds,visited);
 const knownIds=new Set(protectedIds),eligible=new Map(),retained=[],candidates=[];
 for(const descriptor of descriptors){
  const operations=await readSegmentDescriptor(descriptor,get,{datasetId:newer.stage.datasetId,profile});
  let covered=true;for(const operation of operations){const receipt=await receiptAt(newer,currentProof,operation.operationId);if(!receipt||receipt.digest!==operation.revisionId){covered=false;break;}}
  const content=decodeJSON(await readObject(descriptor,get,{profile}),profile.decoded),objects=[descriptor,content.segment,...content.dependencies];
  for(const ref of objects)knownIds.add(ref.id);
  if(!covered||objects.some(ref=>pinned.includes(ref.id))){retained.push({descriptor:descriptor.id,reason:covered?'active_restore_pin':'uncovered_tail'});for(const ref of objects)protectedIds.add(ref.id);}
  else candidates.push(objects);
 }
 // A pin whose closure is absent from the supplied evidence cannot justify
 // deleting shared objects. The caller must first supply that retained graph.
 if(pinned.some(id=>!knownIds.has(id)))fail('BNS_COMPACTION_PIN_UNKNOWN');
 for(const objects of candidates)for(const ref of objects)if(!protectedIds.has(ref.id))eligible.set(ref.id,ref);
 const frontiers=[];for await(const row of currentProof?currentProof.frontiers:newer.stage.rows('frontier'))frontiers.push({deviceId:row.deviceId,frontier:row.frontier,ranges:row.ranges});
 // Recheck after all asynchronous reads. Neither retained proof may absorb a
 // concurrent local/tail mutation while eligibility is being calculated.
 // Finish untrusted transport awaits before the final local proof checks.
 await verifyManifest(previous,get,profile);await verifyManifest(current,get,profile);
 await groupedProof(older,previous);await groupedProof(newer,current);
 if(!equal(await retainedState(older),previous)||!equal(await retainedState(newer),current))fail('BNS_COMPACTION_UNVERIFIED');
 checkGroupPageBudget(budget);
 return {requiredCheckpoint:current.manifestId,retainedCheckpoints:[previous.manifestId,current.manifestId],frontiers,eligible:[...eligible.values()],retained,performedDeletion:false};
}
