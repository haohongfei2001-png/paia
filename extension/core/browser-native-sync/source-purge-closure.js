import {prepareSourcePurgeRemote} from './source-purge-journal.js';
import {prepareGroupCheckpointPlan,requireOriginalGroupCheckpointPlan} from './group-checkpoint-plan.js';
import {initialSourcePlan} from './source-bootstrap-plan.js';
import {acceptSequence} from './core.js';
import {bytes,clone,equal,exact,canonical,fail} from './value.js';
import {measureSourceWorkingPhysicalTree} from './source-working-physical.js';
const closures=new WeakMap();
const invalid=()=>fail('BNS_SOURCE_PURGE_CHECKPOINT_INVALID');
const own=(value,keys)=>exact(value,keys)&&Object.keys(value).length===keys.length;
const sorted=rows=>[...rows].sort((a,b)=>canonical(a).localeCompare(canonical(b)));
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};

// Original immutable protocol closure, not canonical/read/write authority.
// Negative groups contribute only their seven original redacted envelopes and
// eight authenticated purge operations. They never reconstruct a Source body.
// Positive independent initial Sources and their complete surviving Working
// chains go through the existing group compiler. Deleted Source Working stays
// unsupported: its original bootstrap body is never reconstructed.
export async function compileSourcePurgeClosure(core,input){
 const binding={core,repository:core.repository,datasetId:core.datasetId,deviceId:core.deviceId,prefix:core.prefix,namespace:core.fixedNamespace},started=performance.now();
 const current=()=>{if(core.repository!==binding.repository||core.datasetId!==binding.datasetId||core.deviceId!==binding.deviceId||core.prefix!==binding.prefix||core.fixedNamespace!==binding.namespace)invalid();if(performance.now()-started>=30000)fail('BNS_GROUP_RESOURCE_LIMIT');};
 if(!Array.isArray(input)||input.length>384)invalid();
 // Meter descriptors and strings before the canonical encoder or clone can
 // allocate complete copies; accessors are rejected without being invoked.
 const measured=measureSourceWorkingPhysicalTree(input);if(measured.B*4>2*1024*1024)fail('BNS_GROUP_RESOURCE_LIMIT');
 const encoded=bytes(input);
 // Snapshot before WebCrypto awaits. Neither the caller's array nor nested
 // target rows can mutate a partially compiled denial into a different claim.
 const items=freeze(clone(input)),revisions=[],heads=[],frontiers=[];
 for(const item of items){
  if(own(item,['kind','operation','redacted'])&&item.kind==='revision'&&typeof item.redacted==='boolean')revisions.push(item);
  else if(own(item,['kind','type','entityId','revisions','purged','fence'])&&item.kind==='head'){const {kind,...row}=item;heads.push(row);}
  else if(own(item,['kind','deviceId','frontier','ranges'])&&item.kind==='frontier'){const {kind,...row}=item;frontiers.push(row);}else invalid();
 }
 if(revisions.length>128)fail('BNS_GROUP_RESOURCE_LIMIT');
 const byRevision=new Map(),operationIds=new Set(),sequences=new Set();
 for(const row of revisions){const op=row.operation;if(!op||op.datasetId!==binding.datasetId||byRevision.has(op.revisionId)||operationIds.has(op.operationId)||sequences.has(JSON.stringify([op.deviceId,op.sequence])))invalid();byRevision.set(op.revisionId,row);operationIds.add(op.operationId);sequences.add(JSON.stringify([op.deviceId,op.sequence]));}
 const negatives=[],claimed=new Set(),identities=new Set(),expectedHeads=[];
 const identity=(kind,id)=>{const key=JSON.stringify([kind,id]);if(identities.has(key))invalid();identities.add(key);};
 const claim=expected=>{const actual=byRevision.get(expected.operation.revisionId);if(!actual||claimed.has(expected.operation.revisionId)||!equal(actual,expected))invalid();claimed.add(expected.operation.revisionId);};
 for(const row of revisions.filter(row=>row.operation.type==='sourcePurgeIntent')){
  current();const targets=row.operation.value?.targets;if(!Array.isArray(targets)||targets.length!==7)invalid();
  const remote=await prepareSourcePurgeRemote([...targets.map(target=>byRevision.get(target.purgeRevisionId)?.operation),row.operation],core);current();
  for(const target of remote.intent.targets)claim({kind:'revision',operation:target.before,redacted:true});
  for(const operation of remote.operations){claim({kind:'revision',operation,redacted:operation.kind==='purge'});expectedHeads.push({type:operation.type,entityId:operation.entityId,revisions:[operation.revisionId],purged:operation.kind==='purge',fence:operation.kind==='purge'?operation.revisionId:null});}
  for(const kind of ['sourceId','sourceKey','documentId','inputId','baselineId'])identity(kind,remote.intent[kind]);
  negatives.push(freeze(remote));
 }
 if(!negatives.length)invalid();
 const positive=[];for(const row of revisions)if(!claimed.has(row.operation.revisionId)){if(row.redacted||row.operation.kind!=='put'||!['sourceBootstrapMember','sourceBootstrapCommit','inputWorkingMember','inputWorkingCommit','consumerPreference','promptPreferences','promptBinding'].includes(row.operation.type))invalid();positive.push(row.operation);}
 const positivePlan=await prepareGroupCheckpointPlan(core,positive);current();
 for(const group of positivePlan.groups){if(['inputWorkingCommit','consumerPreference','promptPreferences','promptBinding'].includes(group.type))continue;if(group.type!=='sourceBootstrapCommit')invalid();const p=initialSourcePlan(group.capability);for(const [kind,id]of [['sourceId',p.source.id],['sourceKey',p.source.sourceKey],['documentId',p.inputDocument.id],['inputId',p.input.id],['baselineId',p.baselineRevision.id]])identity(kind,id);}
 expectedHeads.push(...positivePlan.heads);
 const expectedFrontiers=new Map();for(const row of revisions){const op=row.operation;expectedFrontiers.set(op.deviceId,acceptSequence(expectedFrontiers.get(op.deviceId),op.sequence));}
 const frontierRows=[...expectedFrontiers].map(([deviceId,value])=>({...value,deviceId}));
 if(!equal(sorted(heads),sorted(expectedHeads))||!equal(sorted(frontiers),sorted(frontierRows)))invalid();
 const coverage=new Map();for(const head of expectedHeads){const op=byRevision.get(head.revisions[0])?.operation;if(!op)invalid();const row=coverage.get(head.type)??{type:head.type,version:op.codecVersion,count:0};if(row.version!==op.codecVersion)invalid();row.count++;coverage.set(head.type,row);}
 const result=Object.freeze({positivePlan,negative:Object.freeze(negatives.sort((a,b)=>a.operations.at(-1).revisionId.localeCompare(b.operations.at(-1).revisionId))),heads:freeze(sorted(expectedHeads)),frontiers:freeze(sorted(frontierRows)),coverage:freeze([...coverage.values()].sort((a,b)=>a.type.localeCompare(b.type))),revisionCount:revisions.length,itemCount:items.length});
 // Conservative aggregate of detached input, compiler result and bookkeeping;
 // this finite constructor cannot buy extra retained work by using small items.
 if(encoded.length+measureSourceWorkingPhysicalTree({items,result,ids:[...operationIds],sequences:[...sequences],identities:[...identities]}).B>2*1024*1024)fail('BNS_GROUP_RESOURCE_LIMIT');
 current();closures.set(result,binding);return result;
}
export function requireOriginalSourcePurgeClosure(core,closure){
 const binding=closures.get(closure);if(arguments.length!==2||!binding||core!==binding.core||core.repository!==binding.repository||core.datasetId!==binding.datasetId||core.deviceId!==binding.deviceId||core.prefix!==binding.prefix||core.fixedNamespace!==binding.namespace)invalid();requireOriginalGroupCheckpointPlan(core,closure.positivePlan);return closure;
}
