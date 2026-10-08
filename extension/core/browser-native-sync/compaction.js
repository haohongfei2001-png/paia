import {readObject,readSegmentDescriptor,SEGMENT_PROFILE} from './segments.js';
import {clone,decodeJSON,equal,fail,hash} from './value.js';

async function retainedState(restore){
 const state=await restore.stage.read('restore');
 // A restored checkpoint and its later causal tail are distinct durable cuts.
 // Tail receipts prove local staging, not inclusion in the retained manifest.
 if(!['validated','activated'].includes(state?.phase)||state.manifestRef?.kind!=='checkpoint-manifest'||state.manifestRef.id!==state.manifestId||!Number.isSafeInteger(state.checkpointGeneration)||state.checkpointGeneration!==state.validatedGeneration||state.checkpointGeneration!==((await restore.stage.read('generation'))?.value||0))fail('BNS_COMPACTION_UNVERIFIED');
 return state;
}
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
 // Own the complete inventory and pins before the first asynchronous read.
 // Coverage and object closure must refer to the same immutable input cut.
 descriptors=clone(descriptors);pinned=clone(pinned);profile=clone(profile);
 const previous=await retainedState(older),current=await retainedState(newer);
 if(previous.manifestId===current.manifestId||!current.manifest.parents.includes(previous.manifestId))fail('BNS_COMPACTION_REDUNDANCY');
 for await(const receipt of older.stage.rows('receipt')){
  const retained=await newer.stage.read('receipt',decodeURIComponent(receipt.id.split(':').at(-1)));
  if(!retained||retained.digest!==receipt.digest)fail('BNS_COMPACTION_INCOMPARABLE');
 }
 // A generation carrying a purged body is not retained merely to satisfy the
 // two-copy rule. Build a second body-free complete generation first.
 for await(const head of newer.stage.rows('head'))if(head.purged){const previousHead=await older.stage.read('head',head.type,head.entityId);if(previousHead&&!previousHead.purged)fail('BNS_COMPACTION_PURGE_RETENTION');}
 const protectedIds=new Set(),visited=new Set();await retainReferences(previous,get,profile,protectedIds,visited);await retainReferences(current,get,profile,protectedIds,visited);
 const knownIds=new Set(protectedIds),eligible=new Map(),retained=[],candidates=[];
 for(const descriptor of descriptors){
  const operations=await readSegmentDescriptor(descriptor,get,{datasetId:newer.stage.datasetId,profile});
  let covered=true;for(const operation of operations){const receipt=await newer.stage.read('receipt',operation.operationId);if(!receipt||receipt.digest!==operation.revisionId){covered=false;break;}}
  const content=decodeJSON(await readObject(descriptor,get,{profile}),profile.decoded),objects=[descriptor,content.segment,...content.dependencies];
  for(const ref of objects)knownIds.add(ref.id);
  if(!covered||objects.some(ref=>pinned.includes(ref.id))){retained.push({descriptor:descriptor.id,reason:covered?'active_restore_pin':'uncovered_tail'});for(const ref of objects)protectedIds.add(ref.id);}
  else candidates.push(objects);
 }
 // A pin whose closure is absent from the supplied evidence cannot justify
 // deleting shared objects. The caller must first supply that retained graph.
 if(pinned.some(id=>!knownIds.has(id)))fail('BNS_COMPACTION_PIN_UNKNOWN');
 for(const objects of candidates)for(const ref of objects)if(!protectedIds.has(ref.id))eligible.set(ref.id,ref);
 const frontiers=[];for await(const row of newer.stage.rows('frontier'))frontiers.push({deviceId:row.deviceId,frontier:row.frontier,ranges:row.ranges});
 // Recheck after all asynchronous reads. Neither retained proof may absorb a
 // concurrent local/tail mutation while eligibility is being calculated.
 await retainedState(older);await retainedState(newer);
 await verifyManifest(previous,get,profile);await verifyManifest(current,get,profile);
 return {requiredCheckpoint:current.manifestId,retainedCheckpoints:[previous.manifestId,current.manifestId],frontiers,eligible:[...eligible.values()],retained,performedDeletion:false};
}
