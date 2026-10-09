import {CODECS,validateEntityAsync} from './codecs.js';
import {canonical,clone,count,digest,equal,exact,fail,hash,identifier,opaque,SyncError,bytes} from './value.js';

export const CORE_LIMITS=Object.freeze({batch:128,batchBytes:4*1024*1024,parents:128,heads:128,gapRanges:4096,ancestryReads:100000,pendingDependents:512});
const key=parts=>parts.map(x=>encodeURIComponent(x)).join(':');
const opFields=['protocol','datasetId','deviceId','sequence','operationId','type','entityId','codecVersion','kind','actor','parents','value','revisionId'];
export async function sealOperation(input){
 const operation=clone(input);delete operation.revisionId;
 operation.revisionId=await digest(operation);await validateOperation(operation);return operation;
}
export async function validateOperation(operation){
 operation=clone(operation);
 if(!exact(operation,opFields)||Object.keys(operation).length!==opFields.length||operation.protocol!==1||!opaque(operation.datasetId)||!opaque(operation.deviceId)||!opaque(operation.operationId)||!count(operation.sequence)||operation.sequence<1||!identifier(operation.entityId)||!Object.hasOwn(CODECS,operation.type)||operation.codecVersion!==1||!['put','purge'].includes(operation.kind)||!['user','source','bootstrap'].includes(operation.actor)||!Array.isArray(operation.parents)||operation.parents.length>CORE_LIMITS.parents||operation.parents.some(x=>!hash(x))||new Set(operation.parents).size!==operation.parents.length||!hash(operation.revisionId))fail('BNS_OPERATION_INVALID');
 if(operation.kind==='purge'){if(operation.actor!=='user'||operation.value!==null)fail('BNS_PURGE_INVALID');}
 else{await validateEntityAsync(operation.type,operation.value,operation.codecVersion);if(operation.value.id!==operation.entityId)fail('BNS_ENTITY_MISMATCH');}
 if(['sourceAppendMember','sourceAppendCommit'].includes(operation.type)&&(operation.kind!=='put'||operation.actor!=='bootstrap'||operation.parents.length))fail('BNS_SOURCE_APPEND_INVALID');
 if(['sourceBootstrapMember','sourceBootstrapCommit'].includes(operation.type)&&(operation.kind!=='put'||operation.actor!=='bootstrap'||operation.parents.length))fail('BNS_SOURCE_BOOTSTRAP_INVALID');
 if(operation.type==='source'&&operation.kind!=='purge'&&operation.actor==='user')fail('BNS_SOURCE_AUTHORITY');
 if(operation.actor==='source'&&operation.type!=='source'&&operation.type!=='timeEvidence'&&operation.type!=='sourceStructure')fail('BNS_ACTOR_AUTHORITY');
 if(operation.actor==='bootstrap'&&operation.parents.length)fail('BNS_BOOTSTRAP_AUTHORITY');
 const unsigned={...operation};delete unsigned.revisionId;if(await digest(unsigned)!==operation.revisionId)fail('BNS_OPERATION_DIGEST');
 return operation;
}

export async function validateHumanCommitGroup(input,datasetId){
  if(!Array.isArray(input)||input.length<2||input.length>CORE_LIMITS.batch||input.reduce((n,x)=>n+bytes(x).length,0)>CORE_LIMITS.batchBytes)fail('BNS_HUMAN_GRAPH_LIMIT');
  const operations=[];for(const item of input){const op=await validateOperation(item);if(op.datasetId!==datasetId||op.kind!=='put'||op.actor!=='user'||!['humanLibraryMember','humanLibraryCommit'].includes(op.type))fail('BNS_HUMAN_COMMIT_INVALID');operations.push(op);}
  const descriptors=operations.filter(op=>op.type==='humanLibraryCommit');if(descriptors.length!==1)fail('BNS_HUMAN_COMMIT_REQUIRED');const descriptor=descriptors[0],members=operations.filter(op=>op!==descriptor),v=descriptor.value;
  if(descriptor.parents.length||v.id!==descriptor.entityId||v.deviceId!==descriptor.deviceId||v.datasetId!==descriptor.datasetId||members.length!==v.members.length||new Set(operations.map(op=>op.operationId)).size!==operations.length||new Set(operations.map(op=>op.sequence)).size!==operations.length)fail('BNS_HUMAN_COMMIT_INVALID');
  const ordered=[];for(const ref of v.members){const hits=members.filter(op=>op.type===ref.type&&op.entityId===ref.entityId&&op.revisionId===ref.revisionId&&op.operationId===ref.operationId);if(hits.length!==1)fail('BNS_HUMAN_COMMIT_INCOMPLETE');const op=hits[0],m=op.value;if(op.deviceId!==descriptor.deviceId||m.deviceId!==v.deviceId||m.datasetId!==v.datasetId||m.logicalCommitId!==v.id||m.domainOperationId!==v.domainOperationId||m.requestDigest!==v.requestDigest)fail('BNS_HUMAN_COMMIT_INVALID');ordered.push(op);}
  return {descriptor,members:ordered,operations};
}

// Inclusive disjoint ranges above a contiguous frontier. This represents sparse
// gaps without allocating [1..maxReceived] or treating maxReceived as progress.
export function acceptSequence(current,sequence){
 if(!count(sequence)||sequence<1)fail('BNS_SEQUENCE_INVALID');
 const state=clone(current||{frontier:0,ranges:[]});
 if(sequence<=state.frontier)return state;
 const ranges=[...state.ranges,[sequence,sequence]].sort((a,b)=>a[0]-b[0]),merged=[];
 for(const [start,end]of ranges){const last=merged.at(-1);if(last&&start<=last[1]+1)last[1]=Math.max(last[1],end);else merged.push([start,end]);}
 while(merged[0]?.[0]===state.frontier+1)state.frontier=merged.shift()[1];
 if(merged.length>CORE_LIMITS.gapRanges)fail('BNS_GAP_LIMIT');state.ranges=merged;return state;
}

// ArchiveRepository supplies real strict transactions. All protocol rows live in
// an explicit meta namespace. No schema upgrade, arbitrary-store export, network
// adapter, automatic enablement or second user-facing content store is installed.
export class BrowserNativeSyncCore {
 #humanTransactions=new WeakMap();
 #humanPrepared=new WeakSet();
 #appendTransactions=new WeakMap();
 #appendPrepared=new WeakSet();
 #bootstrapTransactions=new WeakMap();
 #bootstrapPrepared=new WeakSet();
 #workingTransactions=new WeakMap();
 #workingPrepared=new WeakSet();
 constructor(repository,{datasetId,deviceId,materialize=null,checkpoint=async()=>{},namespace=null,conflictOwners=null}={}){
  if(!opaque(datasetId)||!opaque(deviceId))fail('BNS_IDENTITY_INVALID');
  if(conflictOwners!==null&&(!exact(conflictOwners,['contextDesired'])||Object.values(conflictOwners).some(owner=>typeof owner!=='function')))fail('BNS_CONFLICT_OWNER_INVALID');
  this.conflictOwners=Object.freeze({...conflictOwners});
  this.repository=repository;this.datasetId=datasetId;this.deviceId=deviceId;
  if(namespace!==null&&!opaque(namespace))fail('BNS_NAMESPACE_INVALID');
  this.prefix=`bns:v1:${datasetId}:`;this.fixedNamespace=namespace;this.boundTransactions=new WeakMap();this.materialize=materialize;this.checkpoint=checkpoint;
 }
 async transaction(write,fn,stores){let semanticError;try{return await this.repository.transaction(write,async t=>{try{return await fn(t);}catch(error){if(error instanceof SyncError)semanticError=error;throw error;}},stores);}catch(error){throw semanticError||error;}}
 async bind(t){
  if(this.boundTransactions.has(t))return this.boundTransactions.get(t);
  const active=this.fixedNamespace?null:await t.get('meta',this.prefix+'active');
  const namespace=this.fixedNamespace||active?.namespace||'initial';
  if(namespace!=='initial'&&!opaque(namespace))fail('BNS_NAMESPACE_INVALID');
  this.boundTransactions.set(t,namespace);return namespace;
 }
 async idIn(t,kind,...ids){return this.prefix+'generation:'+await this.bind(t)+':'+kind+':'+key(ids);}
 async get(t,kind,...ids){return t.get('meta',await this.idIn(t,kind,...ids));}
 async put(t,kind,ids,data){return t.put('meta',{...data,id:await this.idIn(t,kind,...ids)});}
 async namespace(){return this.transaction(false,t=>this.bind(t),['meta']);}
 async read(kind,...ids){return this.transaction(false,t=>this.get(t,kind,...ids),['meta']);}
 async prepareLocal(changes,{actor='user',operationIds=null,logicalCommit=null,sourceBootstrap=null,sourceAppend=null,humanLibrary=null}={}){
  if(!Array.isArray(changes)||!changes.length||changes.length>CORE_LIMITS.batch)fail('BNS_BATCH_LIMIT');
  changes=clone(changes);operationIds=operationIds?clone(operationIds):null;
  const snapshot=await this.transaction(false,async t=>({
   sequence:(await this.get(t,'device',this.deviceId))?.sequence||0,
   generation:(await this.get(t,'generation'))?.value||0,namespace:await this.bind(t),
   heads:await Promise.all(changes.map(c=>this.get(t,'head',c.type,c.entityId||c.value?.id))),
  }),['meta']);
  const operations=[],seen=new Set();let sequence=snapshot.sequence;
  for(let index=0;index<changes.length;index++){
   const change=changes[index],entityId=change.entityId||change.value?.id,entity=key([change.type,entityId]);
   if(seen.has(entity))fail('BNS_BATCH_DUPLICATE_ENTITY');seen.add(entity);
   const head=snapshot.heads[index],parents=change.parents??head?.revisions??[];
   if(head?.purged)fail('BNS_ENTITY_PURGED');
   if(change.expectedParents&&!equal([...change.expectedParents].sort(),[...(head?.revisions||[])].sort()))fail('BNS_HEAD_CHANGED');
   if(head?.revisions?.length>1&&!change.resolve)fail('BNS_CONFLICT_REQUIRES_RESOLUTION');
   if(change.resolve&&!equal([...parents].sort(),[...(head?.revisions||[])].sort()))fail('BNS_RESOLUTION_PARENTS');
   operations.push(await sealOperation({protocol:1,datasetId:this.datasetId,deviceId:this.deviceId,sequence:++sequence,operationId:operationIds?.[index]||crypto.randomUUID(),type:change.type,entityId,codecVersion:1,kind:change.kind||'put',actor,parents:[...parents].sort(),value:change.kind==='purge'?null:clone(change.value)}));
  }
  if(logicalCommit){
   if(!exact(logicalCommit,['id','inputId','documentId','sourceRefs'])||operations.length>=CORE_LIMITS.batch||operations.some(op=>op.type!=='inputWorkingMember'||op.value.logicalCommitId!==logicalCommit.id||op.value.datasetId!==this.datasetId||op.value.deviceId!==this.deviceId))fail('BNS_WORKING_COMMIT_INVALID');
   const value={...clone(logicalCommit),version:1,datasetId:this.datasetId,deviceId:this.deviceId,members:operations.map(op=>({type:op.type,entityId:op.entityId,revisionId:op.revisionId}))};
   operations.push(await sealOperation({protocol:1,datasetId:this.datasetId,deviceId:this.deviceId,sequence:++sequence,operationId:crypto.randomUUID(),type:'inputWorkingCommit',entityId:value.id,codecVersion:1,kind:'put',actor:'user',parents:[],value}));
  }
  if(sourceBootstrap){
   if(!exact(sourceBootstrap,['id','sourceId','sourceKey','documentId','inputId','baselineId'])||operations.length!==6||operations.some(op=>op.type!=='sourceBootstrapMember'||op.actor!=='bootstrap'||op.parents.length||op.value.logicalCommitId!==sourceBootstrap.id||op.value.datasetId!==this.datasetId||op.value.deviceId!==this.deviceId))fail('BNS_SOURCE_BOOTSTRAP_INVALID');
   const value={...clone(sourceBootstrap),version:1,datasetId:this.datasetId,deviceId:this.deviceId,members:operations.map(op=>({type:op.type,entityId:op.entityId,revisionId:op.revisionId}))};
   operations.push(await sealOperation({protocol:1,datasetId:this.datasetId,deviceId:this.deviceId,sequence:++sequence,operationId:crypto.randomUUID(),type:'sourceBootstrapCommit',entityId:value.id,codecVersion:1,kind:'put',actor:'bootstrap',parents:[],value}));
  }
  if(sourceAppend){
   if(sourceBootstrap||logicalCommit||operations.length!==5||operations.some(op=>op.type!=='sourceAppendMember'||op.actor!=='bootstrap'||op.parents.length||op.value.logicalCommitId!==sourceAppend.id||op.value.datasetId!==this.datasetId||op.value.deviceId!==this.deviceId))fail('BNS_SOURCE_APPEND_INVALID');
   const value={...clone(sourceAppend),logicalCommitId:sourceAppend.id,datasetId:this.datasetId,deviceId:this.deviceId,refs:operations.map(op=>({type:op.type,entityId:op.entityId,revisionId:op.revisionId}))};
   operations.push(await sealOperation({protocol:1,datasetId:this.datasetId,deviceId:this.deviceId,sequence:++sequence,operationId:crypto.randomUUID(),type:'sourceAppendCommit',entityId:value.id,codecVersion:1,kind:'put',actor:'bootstrap',parents:[],value}));
  }
  if(humanLibrary){
   if(sourceBootstrap||sourceAppend||logicalCommit||operations.length>=CORE_LIMITS.batch||operations.some(op=>op.type!=='humanLibraryMember'||op.actor!=='user'||op.value.logicalCommitId!==humanLibrary.id||op.value.datasetId!==this.datasetId||op.value.deviceId!==this.deviceId||op.value.domainOperationId!==humanLibrary.domainOperationId||op.value.requestDigest!==humanLibrary.requestDigest))fail('BNS_HUMAN_COMMIT_INVALID');
   const value={...clone(humanLibrary),datasetId:this.datasetId,deviceId:this.deviceId,members:operations.map(op=>({type:op.type,entityId:op.entityId,revisionId:op.revisionId,operationId:op.operationId}))};
   operations.push(await sealOperation({protocol:1,datasetId:this.datasetId,deviceId:this.deviceId,sequence:++sequence,operationId:crypto.randomUUID(),type:'humanLibraryCommit',entityId:value.id,codecVersion:1,kind:'put',actor:'user',parents:[],value}));
  }
  if(humanLibrary)await this.transaction(false,t=>this.requireHumanAncestry(t,operations),['meta']);
  if(operations.reduce((sum,operation)=>sum+bytes(operation).length,0)>CORE_LIMITS.batchBytes)fail('BNS_BATCH_BYTES');
  return {datasetId:this.datasetId,deviceId:this.deviceId,baseSequence:snapshot.sequence,baseGeneration:snapshot.generation,baseNamespace:snapshot.namespace,operations};
 }
 async commitPrepared(t,prepared,{origin='local',materialize=true}={}){
  if(prepared.datasetId!==this.datasetId||prepared.deviceId!==this.deviceId||!['local','remote'].includes(origin))fail('BNS_BINDING_CHANGED');
  // Seals are prepared before the IDB transaction. Reject caller mutation using
  // a private capability below rather than starting crypto while IDB is alive.
  if(!this.prepared?.has(prepared))fail('BNS_PREPARATION_REQUIRED');
  if(await this.bind(t)!==prepared.baseNamespace)fail('BNS_PREPARATION_STALE');
  if(((await this.get(t,'device',this.deviceId))?.sequence||0)!==prepared.baseSequence||((await this.get(t,'generation'))?.value||0)!==prepared.baseGeneration)fail('BNS_PREPARATION_STALE');
  for(const operation of prepared.operations){
   const result=await this.applyInTransaction(t,operation,{origin,materialize});if(result.state==='pending')fail('BNS_LOCAL_ANCESTRY_MISSING');
   if(origin==='local')await this.put(t,'outbox',[operation.operationId],{operationId:operation.operationId,revisionId:operation.revisionId,state:'queued'});
  }
  await this.put(t,'device',[this.deviceId],{sequence:prepared.baseSequence+prepared.operations.length});
  return {operationIds:prepared.operations.map(x=>x.operationId)};
 }
 async prepare(changes,options){
  const value=await this.prepareLocal(changes,options);
  // Deep freeze makes the precomputed digest a transaction-safe capability.
  const freeze=x=>{if(x&&typeof x==='object'){for(const child of Object.values(x))freeze(child);Object.freeze(x);}return x;};
  freeze(value);this.prepared??=new WeakSet();this.prepared.add(value);return value;
 }
 async commit(prepared,writeOwner=async()=>{}){
  return this.transaction(true,async t=>{await writeOwner(t);await this.checkpoint('after-canonical-write',t);const result=await this.commitPrepared(t,prepared);await this.checkpoint('after-outbox-write',t);return result;});
 }
 async ancestor(t,ancestor,descendant){
  if(ancestor===descendant)return true;const seen=new Set(),queue=[descendant];
  while(queue.length){const id=queue.pop();if(seen.has(id))continue;seen.add(id);if(seen.size>CORE_LIMITS.ancestryReads)fail('BNS_ANCESTRY_LIMIT');const row=await this.get(t,'revision',id);if(!row)return false;for(const parent of row.operation.parents){if(parent===ancestor)return true;if(!seen.has(parent))queue.push(parent);}}
  return false;
 }
 // Exact last materialized owner, scoped to this Core's bound namespace.
 async materializedOwner(t,type,entityId){
  const proof=await this.get(t,'materializedOwner',type,entityId);if(!proof)return null;
  if(proof.version!==1||!hash(proof.revisionId)||!count(proof.ownerRevision)||Object.keys(proof).some(k=>!['id','version','revisionId','ownerRevision'].includes(k)))fail('BNS_OWNER_PROOF_INVALID');
  const row=await this.get(t,'revision',proof.revisionId);
  if(!row||row.redacted||row.operation.type!==type||row.operation.entityId!==entityId)fail('BNS_OWNER_PROOF_INVALID');
  return {...proof,operation:row.operation};
 }
 async recordMaterializedOwner(t,operation,ownerRevision){
  if(!count(ownerRevision))fail('BNS_OWNER_PROOF_INVALID');
  await this.put(t,'materializedOwner',[operation.type,operation.entityId],{version:1,revisionId:operation.revisionId,ownerRevision});
 }
 async ownerAncestor(t,operation,heads){
  const queue=[...heads],seen=new Set();
  while(queue.length){const id=queue.pop();if(seen.has(id))continue;if(seen.size>=128)fail('BNS_OWNER_ANCESTRY_LIMIT');seen.add(id);
   const row=await this.get(t,'revision',id);
   if(!row||row.redacted||row.operation.type!==operation.type||row.operation.entityId!==operation.entityId)fail('BNS_OWNER_PROOF_INVALID');
   if(id===operation.revisionId)return true;
   for(const parent of row.operation.parents)if(!seen.has(parent))queue.push(parent);
  }
  return false;
 }
 async applyInTransaction(t,operation,{origin='remote',materialize=true,workingCapability=null,bootstrapCapability=null,appendCapability=null,humanCapability=null}={}){
  if(origin==='remote'&&['humanLibraryMember','humanLibraryCommit'].includes(operation.type)&&(humanCapability===null||this.#humanTransactions.get(t)!==humanCapability))fail('BNS_HUMAN_COMMIT_REQUIRED');
  if(origin==='remote'&&['sourceAppendMember','sourceAppendCommit'].includes(operation.type)&&(appendCapability===null||this.#appendTransactions.get(t)!==appendCapability))fail('BNS_SOURCE_APPEND_REQUIRED');
  if(origin==='remote'&&['sourceBootstrapMember','sourceBootstrapCommit'].includes(operation.type)&&(bootstrapCapability===null||this.#bootstrapTransactions.get(t)!==bootstrapCapability))fail('BNS_SOURCE_BOOTSTRAP_REQUIRED');
  if(origin==='remote'&&['inputWorkingMember','inputWorkingCommit'].includes(operation.type)&&(workingCapability===null||this.#workingTransactions.get(t)!==workingCapability))fail('BNS_WORKING_COMMIT_REQUIRED');
  if(operation.datasetId!==this.datasetId)fail('BNS_DATASET_MISMATCH');
  const quarantined=await this.get(t,'quarantine',operation.operationId);if(quarantined){if(quarantined.digest!==operation.revisionId)fail('BNS_OPERATION_COLLISION');return {state:'quarantined',reason:quarantined.reason};}
  const receipt=await this.get(t,'receipt',operation.operationId);
  if(receipt){if(receipt.digest!==operation.revisionId)fail('BNS_OPERATION_COLLISION');return {state:'duplicate'};}
  const seq=await this.get(t,'sequence',operation.deviceId,String(operation.sequence).padStart(16,'0'));
  if(seq&&seq.operationId!==operation.operationId)fail('BNS_SEQUENCE_COLLISION');
  const current=await this.get(t,'head',operation.type,operation.entityId),missing=[];
  for(const parent of operation.parents){const prior=await this.get(t,'revision',parent);if(!prior)missing.push(parent);else if(prior.operation.type!==operation.type||prior.operation.entityId!==operation.entityId)fail('BNS_PARENT_ENTITY_MISMATCH');}
  const pending=await this.get(t,'pending',operation.operationId);if(pending&&pending.operation.revisionId!==operation.revisionId)fail('BNS_OPERATION_COLLISION');
  if(missing.length&&!current?.purged&&operation.kind!=='purge'){
   await this.put(t,'pending',[operation.operationId],{operation});
   await this.put(t,'entityPending',[operation.type,operation.entityId,operation.operationId],{operationId:operation.operationId});
   for(const parent of missing){const row=await this.get(t,'waiting',parent),ids=[...new Set([...(row?.operations||[]),operation.operationId])];if(ids.length>CORE_LIMITS.pendingDependents)fail('BNS_PENDING_LIMIT');await this.put(t,'waiting',[parent],{operations:ids});}
   // Pending content is durable work too. A restore/compaction cut cannot
   // silently strand it merely because no canonical head advanced yet.
   if(!pending)await this.advanceGeneration(t);
   return {state:'pending',missingParents:missing.length};
  }
  if(CODECS[operation.type].immutable&&current&&!current.purged&&operation.kind!=='purge')for(const rev of current.revisions){const prior=await this.get(t,'revision',rev);if(!equal(prior?.operation.value,operation.value))fail('BNS_IMMUTABLE_SOURCE_MISMATCH');}
  // Capture canonical predecessor versions before purge redaction or head
  // replacement. Trusted materializers can reject unmanaged/local owner edits
  // within this same transaction, rolling back all protocol acknowledgements.
  const previousVersions=[];
  if(materialize&&(this.materialize||this.conflictOwners[operation.type])&&current&&!current.purged)for(const revision of current.revisions){const prior=await this.get(t,'revision',revision);if(!prior||prior.redacted)fail('BNS_REVISION_MISSING');previousVersions.push(prior.operation);}
  const purged=current?.purged||operation.kind==='purge';
  await this.put(t,'revision',[operation.revisionId],{operation:purged?{...operation,value:null}:operation,redacted:purged});
  let revisions=[...(current?.revisions||[])];
  if(purged){
   if(operation.kind==='purge')revisions=[...new Set([...(current?.purged?revisions:[]),operation.revisionId])];
   // Purge all body-bearing revisions of this entity, not only its live heads.
   if(operation.kind==='purge'){
    let after=null;do{const page=await t.primaryRangePage('meta',{prefix:await this.idIn(t,'entityRevision',operation.type,operation.entityId)+':',after,limit:100});for(const {value:row}of page.rows){const prior=await this.get(t,'revision',row.revisionId);if(prior&&!prior.redacted){await this.put(t,'revision',[row.revisionId],{operation:{...prior.operation,value:null},redacted:true});await t.delete('meta',await this.idIn(t,'outbox',prior.operation.operationId));}}after=page.next;}while(after);
    after=null;do{const page=await t.primaryRangePage('meta',{prefix:await this.idIn(t,'entityPending',operation.type,operation.entityId)+':',after,limit:100});for(const {value:row}of page.rows){const pending=await this.get(t,'pending',row.operationId);if(pending){await this.put(t,'revision',[pending.operation.revisionId],{operation:{...pending.operation,value:null},redacted:true});await this.put(t,'entityRevision',[operation.type,operation.entityId,pending.operation.revisionId],{revisionId:pending.operation.revisionId});await this.recordReceipt(t,pending.operation);await t.delete('meta',pending.id);}await t.delete('meta',row.id);}after=page.next;}while(after);
   }
  }else{
   const retained=[];let stale=false;
   for(const head of revisions){if(await this.ancestor(t,head,operation.revisionId))continue;if(await this.ancestor(t,operation.revisionId,head))stale=true;retained.push(head);}
   revisions=stale?retained:[...retained,operation.revisionId];
   if(revisions.length>CORE_LIMITS.heads)fail('BNS_CONFLICT_LIMIT');
  }
  revisions.sort();
  await this.put(t,'entityRevision',[operation.type,operation.entityId,operation.revisionId],{revisionId:operation.revisionId});
  await this.put(t,'head',[operation.type,operation.entityId],{type:operation.type,entityId:operation.entityId,revisions,purged:!!purged,fence:purged?revisions[0]:null});
  await this.recordReceipt(t,operation);
  if(pending){await t.delete('meta',pending.id);await t.delete('meta',await this.idIn(t,'entityPending',operation.type,operation.entityId,operation.operationId));}
  await this.advanceGeneration(t);
  if(materialize&&this.materialize&&(purged||revisions.length===1)){
   const winner=purged?{...operation,value:null}:(await this.get(t,'revision',revisions[0])).operation;
   await this.materialize(t,{operation:winner,head:{revisions,purged:!!purged},origin,previousHead:current||null,previousVersions,core:this,previousCore:this});
  }
  if(materialize&&!purged&&revisions.length>1&&this.conflictOwners[operation.type])await this.conflictOwners[operation.type](t,{operation,head:{revisions,purged:false},origin,previousHead:current||null,previousVersions,core:this,previousCore:this});
  return {state:purged?'purged':revisions.length>1?'conflict':'applied',revisions};
 }
 async recordReceipt(t,operation){
  const sequenceKey=String(operation.sequence).padStart(16,'0'),existing=await this.get(t,'sequence',operation.deviceId,sequenceKey);
  if(existing&&existing.operationId!==operation.operationId)fail('BNS_SEQUENCE_COLLISION');
  await this.put(t,'receipt',[operation.operationId],{digest:operation.revisionId,deviceId:operation.deviceId,sequence:operation.sequence});
  await this.put(t,'sequence',[operation.deviceId,sequenceKey],{operationId:operation.operationId,digest:operation.revisionId});
  const frontier=await this.get(t,'frontier',operation.deviceId);
  await this.put(t,'frontier',[operation.deviceId],{...acceptSequence(frontier?{frontier:frontier.frontier,ranges:frontier.ranges}:null,operation.sequence),deviceId:operation.deviceId});
  if(operation.deviceId===this.deviceId){const local=await this.get(t,'device',this.deviceId);if((local?.sequence||0)<operation.sequence)await this.put(t,'device',[this.deviceId],{sequence:operation.sequence});}
 }
 async advanceGeneration(t){const generation=(await this.get(t,'generation'))?.value||0;await this.put(t,'generation',[],{value:generation+1});}
 async requireHumanAncestry(t,operations){
  const seen=new Map(operations.map(op=>[op.revisionId,op])),queue=operations.flatMap(op=>op.parents);let size=operations.reduce((n,op)=>n+bytes(op).length,0);if(seen.size>CORE_LIMITS.batch||size>CORE_LIMITS.batchBytes)fail('BNS_HUMAN_GRAPH_LIMIT');
  while(queue.length){const id=queue.pop();if(seen.has(id))continue;const row=await this.get(t,'revision',id);if(!row||row.redacted)fail('BNS_HUMAN_ANCESTRY_REQUIRED');const op=row.operation;if(!['humanLibraryMember','humanLibraryCommit'].includes(op.type))fail('BNS_HUMAN_ANCESTRY_REQUIRED');seen.set(id,op);size+=bytes(op).length;if(seen.size>CORE_LIMITS.batch||size>CORE_LIMITS.batchBytes)fail('BNS_HUMAN_GRAPH_LIMIT');queue.push(...op.parents);if(op.type==='humanLibraryMember'){const head=await this.get(t,'head','humanLibraryCommit',op.value.logicalCommitId);if(head?.purged||head?.revisions.length!==1)fail('BNS_HUMAN_ANCESTRY_REQUIRED');queue.push(...head.revisions);}else queue.push(...op.value.members.map(ref=>ref.revisionId));}
 }
 async prepareHumanReceive(input){
  const {descriptor,members:ordered,operations}=await validateHumanCommitGroup(input,this.datasetId);
  const cut=await this.transaction(false,async t=>{
   const prior=await this.get(t,'receipt',descriptor.operationId);if(prior){if(prior.digest!==descriptor.revisionId)fail('BNS_OPERATION_COLLISION');return {duplicate:true};}
   await this.requireHumanAncestry(t,operations);
   for(const op of ordered){const head=await this.get(t,'head',op.type,op.entityId);if(head?.purged||!equal(head?.revisions||[],op.parents))fail('BNS_HUMAN_OWNER_CHANGED');}
   return {namespace:await this.bind(t),generation:(await this.get(t,'generation'))?.value||0};
  },['meta']);
  const prepared={descriptor,members:ordered,...cut};const freeze=x=>{if(x&&typeof x==='object'){for(const y of Object.values(x))freeze(y);Object.freeze(x);}return x;};freeze(prepared);this.#humanPrepared.add(prepared);return prepared;
 }
 // A closed grouped graph on an actually empty, fixed replay namespace only.
 // This mints no generic materializer: each Human group still needs the exact
 // original named-owner capability and final current heads/generation checks.
 async prepareHumanRestoreProtocols(groups){
  if(!this.fixedNamespace||!Array.isArray(groups))fail('BNS_HUMAN_RESTORE_REQUIRED');const input=groups.flatMap(group=>group.operations||[]);
  if(input.length>CORE_LIMITS.batch||input.reduce((n,op)=>n+bytes(op).length,0)>CORE_LIMITS.batchBytes)fail('BNS_HUMAN_GRAPH_LIMIT');
  const seen=new Map(),ids=new Set(),sequences=new Set(),heads=new Map(),result=[];let generation=0;
  for(const group of groups){
   if(!Array.isArray(group.operations)||!group.operations.length)fail('BNS_HUMAN_COMMIT_INVALID');
   for(const raw of group.operations){const op=await validateOperation(raw),seq=JSON.stringify([op.deviceId,op.sequence]);if(op.datasetId!==this.datasetId)fail('BNS_DATASET_MISMATCH');if(seen.has(op.revisionId)||ids.has(op.operationId)||sequences.has(seq))fail('BNS_GROUP_DUPLICATE');ids.add(op.operationId);sequences.add(seq);
    for(const id of op.parents){const parent=seen.get(id);if(!parent||parent.type!==op.type||parent.entityId!==op.entityId)fail('BNS_HUMAN_ANCESTRY_REQUIRED');}
    const key=JSON.stringify([op.type,op.entityId]);if(!equal(heads.get(key)||[],op.parents))fail('BNS_HUMAN_OWNER_CHANGED');
    if(op.type==='humanLibraryMember'){if(op.parents.length>1||!equal(op.parents.length?seen.get(op.parents[0]).value.after:null,op.value.before))fail('BNS_HUMAN_OWNER_CHANGED');}
    seen.set(op.revisionId,op);heads.set(key,[op.revisionId]);
   }
   if(group.type==='humanLibraryCommit'){const {descriptor,members}=await validateHumanCommitGroup(group.operations,this.datasetId);if(group.id!==descriptor.revisionId)fail('BNS_HUMAN_COMMIT_INVALID');result.push({descriptor,members,namespace:this.fixedNamespace,generation});}
   generation+=group.operations.length;
  }
  await this.transaction(false,async t=>{if(await this.bind(t)!==this.fixedNamespace||(await t.primaryRangePage('meta',{prefix:this.prefix+'generation:'+this.fixedNamespace+':',limit:1})).rows.length)fail('BNS_HUMAN_RESTORE_REQUIRED');},['meta']);
  const freeze=x=>{if(x&&typeof x==='object'){for(const y of Object.values(x))freeze(y);Object.freeze(x);}return x;};for(const prepared of result){freeze(prepared);this.#humanPrepared.add(prepared);}return Object.freeze(result);
 }
 async commitHumanReceive(t,prepared,writeOwner){
  if(!this.#humanPrepared.has(prepared)||typeof writeOwner!=='function')fail('BNS_PREPARATION_REQUIRED');const prior=await this.get(t,'receipt',prepared.descriptor.operationId);if(prior){if(prior.digest!==prepared.descriptor.revisionId)fail('BNS_OPERATION_COLLISION');return {state:'duplicate'};}
  if(prepared.duplicate||await this.bind(t)!==prepared.namespace||((await this.get(t,'generation'))?.value||0)!==prepared.generation)fail('BNS_PREPARATION_STALE');
  for(const op of prepared.members){const head=await this.get(t,'head',op.type,op.entityId);if(head?.purged||!equal(head?.revisions||[],op.parents))fail('BNS_HUMAN_OWNER_CHANGED');}
  const capability=Object.freeze({});this.#humanTransactions.set(t,capability);try{await writeOwner();for(const op of [...prepared.members,prepared.descriptor]){const result=await this.applyInTransaction(t,op,{origin:'remote',materialize:false,humanCapability:capability});if(result.state!=='applied')fail('BNS_HUMAN_ANCESTRY_REQUIRED');}return {state:'applied'};}finally{this.#humanTransactions.delete(t);}
 }
 async prepareWorkingReceive(input){
  if(!Array.isArray(input)||input.length<5||input.length>CORE_LIMITS.batch||input.reduce((n,x)=>n+bytes(x).length,0)>CORE_LIMITS.batchBytes)fail('BNS_WORKING_COMMIT_INVALID');
  const operations=[];for(const candidate of input){const op=clone(await validateOperation(candidate));if(op.datasetId!==this.datasetId||op.kind!=='put'||op.actor!=='user')fail('BNS_WORKING_COMMIT_INVALID');operations.push(op);}
  const descriptors=operations.filter(op=>op.type==='inputWorkingCommit');if(descriptors.length!==1)fail('BNS_WORKING_COMMIT_REQUIRED');const descriptor=descriptors[0],members=operations.filter(op=>op!==descriptor),value=descriptor.value;
  if(descriptor.parents.length||value.datasetId!==descriptor.datasetId||value.deviceId!==descriptor.deviceId||value.id!==descriptor.entityId||members.length!==value.members.length||new Set(operations.map(op=>op.operationId)).size!==operations.length||new Set(operations.map(op=>op.sequence)).size!==operations.length)fail('BNS_WORKING_COMMIT_INVALID');
  for(const ref of value.members){const matches=members.filter(op=>op.type===ref.type&&op.entityId===ref.entityId&&op.revisionId===ref.revisionId);if(matches.length!==1)fail('BNS_WORKING_COMMIT_INCOMPLETE');const op=matches[0];if(op.deviceId!==descriptor.deviceId||op.value.deviceId!==descriptor.deviceId||op.value.datasetId!==this.datasetId||op.value.logicalCommitId!==descriptor.entityId)fail('BNS_WORKING_COMMIT_INVALID');}
  const prepared={descriptor,members};const freeze=x=>{if(x&&typeof x==='object'){for(const child of Object.values(x))freeze(child);Object.freeze(x);}return x;};freeze(prepared);this.#workingPrepared.add(prepared);return prepared;
 }
 async commitWorkingReceive(t,prepared,writeOwner){
  if(!this.#workingPrepared.has(prepared)||typeof writeOwner!=='function')fail('BNS_PREPARATION_REQUIRED');
  const prior=await this.get(t,'receipt',prepared.descriptor.operationId);if(prior){if(prior.digest!==prepared.descriptor.revisionId)fail('BNS_OPERATION_COLLISION');return {state:'duplicate'};}
  const capability=Object.freeze({});this.#workingTransactions.set(t,capability);
  try{for(const operation of [...prepared.members,prepared.descriptor]){const result=await this.applyInTransaction(t,operation,{origin:'remote',materialize:false,workingCapability:capability});const head=await this.get(t,'head',operation.type,operation.entityId);if(result.state!=='applied'||head?.purged||!equal(head?.revisions,[operation.revisionId]))fail('BNS_WORKING_ANCESTRY_REQUIRED');}await writeOwner();return {state:'applied'};}
  finally{this.#workingTransactions.delete(t);}
 }
 async prepareSourceAppendReceive(input){
  if(!Array.isArray(input)||input.length!==6||input.reduce((n,x)=>n+bytes(x).length,0)>CORE_LIMITS.batchBytes)fail('BNS_SOURCE_APPEND_INVALID');
  const operations=[];for(const candidate of input){const op=await validateOperation(candidate);if(op.datasetId!==this.datasetId||op.kind!=='put'||op.actor!=='bootstrap'||op.parents.length)fail('BNS_SOURCE_APPEND_INVALID');operations.push(op);}
  const descriptors=operations.filter(op=>op.type==='sourceAppendCommit');if(descriptors.length!==1)fail('BNS_SOURCE_APPEND_REQUIRED');const descriptor=descriptors[0],members=operations.filter(op=>op!==descriptor),v=descriptor.value;
  if(v.datasetId!==this.datasetId||v.deviceId!==descriptor.deviceId||new Set(operations.map(op=>op.operationId)).size!==6||new Set(operations.map(op=>op.sequence)).size!==6)fail('BNS_SOURCE_APPEND_INVALID');
  for(const ref of v.refs){const hits=members.filter(op=>op.type===ref.type&&op.entityId===ref.entityId&&op.revisionId===ref.revisionId);if(hits.length!==1)fail('BNS_SOURCE_APPEND_INCOMPLETE');const op=hits[0];if(op.deviceId!==descriptor.deviceId||op.value.deviceId!==descriptor.deviceId||op.value.datasetId!==this.datasetId||op.value.logicalCommitId!==descriptor.entityId)fail('BNS_SOURCE_APPEND_INVALID');}
  const prepared={descriptor,members};const freeze=x=>{if(x&&typeof x==='object'){for(const y of Object.values(x))freeze(y);Object.freeze(x);}return x;};freeze(prepared);this.#appendPrepared.add(prepared);return prepared;
 }
 async commitSourceAppendReceive(t,prepared,writeOwner){
  if(!this.#appendPrepared.has(prepared)||typeof writeOwner!=='function')fail('BNS_PREPARATION_REQUIRED');
  const cap=Object.freeze({});this.#appendTransactions.set(t,cap);
  try{for(const op of [...prepared.members,prepared.descriptor]){const result=await this.applyInTransaction(t,op,{origin:'remote',materialize:false,appendCapability:cap});const head=await this.get(t,'head',op.type,op.entityId);if(result.state!=='applied'||head?.purged||!equal(head?.revisions,[op.revisionId]))fail('BNS_SOURCE_APPEND_INVALID');}await writeOwner();return {state:'applied'};}finally{this.#appendTransactions.delete(t);}
 }
 async prepareSourceBootstrapReceive(input){
  if(!Array.isArray(input)||input.length!==7||input.reduce((n,x)=>n+bytes(x).length,0)>CORE_LIMITS.batchBytes)fail('BNS_SOURCE_BOOTSTRAP_INVALID');
  const operations=[];for(const candidate of input){const op=await validateOperation(candidate);if(op.datasetId!==this.datasetId||op.kind!=='put'||op.actor!=='bootstrap'||op.parents.length)fail('BNS_SOURCE_BOOTSTRAP_INVALID');operations.push(op);}
  const descriptors=operations.filter(op=>op.type==='sourceBootstrapCommit');if(descriptors.length!==1)fail('BNS_SOURCE_BOOTSTRAP_REQUIRED');const descriptor=descriptors[0],members=operations.filter(op=>op!==descriptor),v=descriptor.value;
  if(v.datasetId!==this.datasetId||v.deviceId!==descriptor.deviceId||new Set(operations.map(op=>op.operationId)).size!==7||new Set(operations.map(op=>op.sequence)).size!==7)fail('BNS_SOURCE_BOOTSTRAP_INVALID');
  for(const ref of v.members){const hits=members.filter(op=>op.type===ref.type&&op.entityId===ref.entityId&&op.revisionId===ref.revisionId);if(hits.length!==1)fail('BNS_SOURCE_BOOTSTRAP_INCOMPLETE');const op=hits[0];if(op.deviceId!==descriptor.deviceId||op.value.deviceId!==descriptor.deviceId||op.value.datasetId!==this.datasetId||op.value.logicalCommitId!==descriptor.entityId)fail('BNS_SOURCE_BOOTSTRAP_INVALID');}
  const prepared={descriptor,members};const freeze=x=>{if(x&&typeof x==='object'){for(const y of Object.values(x))freeze(y);Object.freeze(x);}return x;};freeze(prepared);this.#bootstrapPrepared.add(prepared);return prepared;
 }
 async commitSourceBootstrapReceive(t,prepared,writeOwner){
  if(!this.#bootstrapPrepared.has(prepared)||typeof writeOwner!=='function')fail('BNS_PREPARATION_REQUIRED');const previous=await this.get(t,'receipt',prepared.descriptor.operationId);if(previous){if(previous.digest!==prepared.descriptor.revisionId)fail('BNS_OPERATION_COLLISION');return {state:'duplicate'};}
  const cap=Object.freeze({});this.#bootstrapTransactions.set(t,cap);
  try{for(const op of [...prepared.members,prepared.descriptor]){const result=await this.applyInTransaction(t,op,{origin:'remote',materialize:false,bootstrapCapability:cap});const head=await this.get(t,'head',op.type,op.entityId);if(result.state!=='applied'||head?.purged||!equal(head?.revisions,[op.revisionId]))fail('BNS_SOURCE_BOOTSTRAP_INVALID');}await writeOwner();return {state:'applied'};}finally{this.#bootstrapTransactions.delete(t);}
 }
 async receive(operation){
  return (await this.receiveBatch([operation]))[0];
 }
 async receiveBatch(input){
  if(!Array.isArray(input)||!input.length||input.length>512)fail('BNS_BATCH_LIMIT');
  input=clone(input);let totalBytes=0;for(const item of input){totalBytes+=bytes(item).length;if(totalBytes>CORE_LIMITS.batchBytes)fail('BNS_BATCH_BYTES');}
  const operations=[];for(const item of input){const operation=clone(await validateOperation(item));if(operation.datasetId!==this.datasetId)fail('BNS_DATASET_MISMATCH');operations.push(operation);}
  const results=await this.transaction(true,async t=>{const results=[];for(const operation of operations)results.push(await this.applyInTransaction(t,operation));return results;});
  for(let i=0;i<operations.length;i++)if(results[i].state!=='pending')await this.reconcileDependents(operations[i].revisionId);
  return results;
 }
 async reconcileDependents(revisionId){
  const queue=[revisionId],visited=new Set();
  while(queue.length){const parent=queue.shift();if(visited.has(parent))continue;visited.add(parent);const waiting=await this.read('waiting',parent);if(!waiting)continue;
   for(const id of waiting.operations){const pending=await this.read('pending',id);if(!pending)continue;const result=await this.applyPending(pending);if(result.state!=='pending'&&result.state!=='quarantined')queue.push(pending.operation.revisionId);}
   await this.transaction(true,async t=>t.delete('meta',await this.idIn(t,'waiting',parent)),['meta']);
  }
 }
 async applyPending(row){
  try{await validateOperation(row.operation);return await this.transaction(true,t=>this.applyInTransaction(t,row.operation));}
  catch(error){
   if(!['BNS_PARENT_ENTITY_MISMATCH','BNS_OPERATION_COLLISION','BNS_SEQUENCE_COLLISION','BNS_IMMUTABLE_SOURCE_MISMATCH','BNS_OPERATION_DIGEST','BNS_ACTOR_AUTHORITY','BNS_BOOTSTRAP_AUTHORITY','BNS_CODEC_INVALID'].includes(error.code))throw error;
   const operation=row.operation;
   await this.transaction(true,async t=>{
    await this.put(t,'quarantine',[operation.operationId],{operationId:operation.operationId,digest:operation.revisionId,reason:error.code});
    await t.delete('meta',row.id);await t.delete('meta',await this.idIn(t,'entityPending',operation.type,operation.entityId,operation.operationId));
    for(const parent of operation.parents){const waiting=await this.get(t,'waiting',parent);if(waiting)await this.put(t,'waiting',[parent],{operations:waiting.operations.filter(id=>id!==operation.operationId)});}
    await this.advanceGeneration(t);
   },['meta']);return {state:'quarantined',reason:error.code};
  }
 }
 async resumePending(){
  // A process can stop after parent commit but before dependent reconciliation.
  // Resume is bounded-page and durable; no arrival notification is required.
  let progressed=true,applied=0;
  while(progressed){progressed=false;for await(const row of this.rows('pending')){const result=await this.applyPending(row);if(result.state!=='pending'){progressed=true;if(result.state!=='quarantined'){applied++;await this.reconcileDependents(row.operation.revisionId);}}}}
  return {applied};
 }
 async *rows(kind){const namespace=await this.namespace();let after=null;do{const page=await this.transaction(false,async t=>{if(await this.bind(t)!==namespace)fail('BNS_SNAPSHOT_CHANGED');return t.primaryRangePage('meta',{prefix:await this.idIn(t,kind),after,limit:100});},['meta']);for(const row of page.rows)yield row.value;after=page.next;}while(after);}
 async *outbox(){for await(const row of this.rows('outbox')){const revision=await this.read('revision',row.revisionId);if(revision&&(!revision.redacted||revision.operation.kind==='purge'))yield clone(revision.operation);}}
 async acknowledge(operationId,revisionId){
  if(!opaque(operationId)||!hash(revisionId))fail('BNS_ACK_INVALID');
  return this.transaction(true,async t=>{const row=await this.get(t,'outbox',operationId);if(!row)return {state:'absent'};if(row.revisionId!==revisionId)fail('BNS_ACK_INVALID');if(row.publicationId!==undefined)fail('BNS_PUBLICATION_OWNS_ACK');await t.delete('meta',row.id);return {state:'acknowledged'};},['meta']);
 }
 async state(){const heads=[];for await(const head of this.rows('head')){const versions=[];if(!head.purged)for(const revisionId of head.revisions){const row=await this.read('revision',revisionId);if(!row||row.redacted)fail('BNS_REVISION_MISSING');versions.push(row.operation);}heads.push({type:head.type,entityId:head.entityId,purged:head.purged,revisions:head.revisions,versions});}return heads.sort((a,b)=>canonical([a.type,a.entityId]).localeCompare(canonical([b.type,b.entityId])));}
}
