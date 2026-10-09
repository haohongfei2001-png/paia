import {CORE_LIMITS,validateOperation,validateHumanCommitGroup} from './core.js';
import {bytes,digest,fail,equal} from './value.js';
import {prepareInitialSourcePlan} from './source-bootstrap-plan.js';
import {prepareSourceAppendPlan} from './source-append-plan.js';

const families=Object.freeze({sourceBootstrapCommit:['members','prepareSourceBootstrapReceive'],sourceAppendCommit:['refs','prepareSourceAppendReceive'],inputWorkingCommit:['members','prepareWorkingReceive'],humanLibraryCommit:['members',null]});
const members=new Set(['sourceBootstrapMember','sourceAppendMember','inputWorkingMember','humanLibraryMember']);
const singles=new Set(['promptPreferences','contextItem','contextRulesItem','contextNowItem','contextDesired','filterIntent']);
const freeze=x=>{if(x&&typeof x==='object'){for(const value of Object.values(x))freeze(value);Object.freeze(x);}return x;};
const originalPlans=new WeakMap();
// Compilation identity is local and body-free. A cloned DTO remains useful to
// old validators but cannot authenticate a native current-generation export.
export function requireOriginalGroupCheckpointPlan(core,plan){
 const p=originalPlans.get(plan);
 if(arguments.length!==2||!p||p.core!==core||core.datasetId!==p.datasetId||core.repository!==p.repository||core.prefix!==p.prefix||core.fixedNamespace!==p.fixedNamespace)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
}
// A bounded immutable causal plan only. This module never writes canonical or
// protocol rows. Domain capabilities are minted by the existing strict owners.
export async function prepareGroupCheckpointPlan(core,input){
 const binding={core,datasetId:core.datasetId,repository:core.repository,prefix:core.prefix,fixedNamespace:core.fixedNamespace};
 if(!Array.isArray(input)||input.length>CORE_LIMITS.batch)fail('BNS_GROUP_RESOURCE_LIMIT');
 let size=0;const operations=[],byRevision=new Map(),byId=new Map(),sequences=new Set();
 for(const candidate of input){
  size+=bytes(candidate).length;if(size>CORE_LIMITS.batchBytes)fail('BNS_GROUP_RESOURCE_LIMIT');
  const op=await validateOperation(candidate);
  if(op.datasetId!==core.datasetId)fail('BNS_DATASET_MISMATCH');
  if(op.kind!=='put'||!members.has(op.type)&&!singles.has(op.type)&&!Object.hasOwn(families,op.type))fail('BNS_GROUP_OWNER_UNSUPPORTED');
  const sequence=JSON.stringify([op.deviceId,op.sequence]);
  if(byRevision.has(op.revisionId)||byId.has(op.operationId)||sequences.has(sequence))fail('BNS_GROUP_DUPLICATE');
  byRevision.set(op.revisionId,op);byId.set(op.operationId,op);sequences.add(sequence);operations.push(op);
 }
 const heads=new Map(),parentRefs=new Set(operations.flatMap(op=>op.parents));
 for(const op of operations){const key=JSON.stringify([op.type,op.entityId]);if(!heads.has(key))heads.set(key,[]);if(!parentRefs.has(op.revisionId))heads.get(key).push(op.revisionId);}
 for(const revisions of heads.values())if(revisions.length!==1)fail('BNS_CONFLICT_REQUIRES_RESOLUTION');
 const groups=[],claimed=new Map();
 for(const op of operations){
  if(members.has(op.type))continue;
  let rows=[op],prepared=null,capability=null;
  if(Object.hasOwn(families,op.type)){
   const [refs,prepare]=families[op.type];rows=[];
   for(const ref of op.value[refs]){const row=byRevision.get(ref.revisionId);if(!row||row.type!==ref.type||row.entityId!==ref.entityId)fail('BNS_GROUP_INCOMPLETE');rows.push(row);}
   rows.push(op);prepared=op.type==='humanLibraryCommit'?await validateHumanCommitGroup(rows,core.datasetId):await core[prepare](rows);
   const entities=Object.fromEntries(prepared.members.map(row=>[row.value.entityType,row.value.entity]));
   if(op.type==='sourceBootstrapCommit')capability=await prepareInitialSourcePlan(entities);
   if(op.type==='sourceAppendCommit')capability=await prepareSourceAppendPlan(entities,op.value.documentId);
  }
  const group={id:op.revisionId,type:op.type,operations:rows,prepared,capability,dependencies:new Set()};
  for(const row of rows){if(claimed.has(row.revisionId))fail('BNS_GROUP_DUPLICATE');claimed.set(row.revisionId,group);}
  groups.push(group);
 }
 if(claimed.size!==operations.length)fail('BNS_GROUP_INCOMPLETE');
 const createdInputs=new Map(),createdSources=new Map();
 for(const group of groups)if(group.type==='sourceBootstrapCommit'||group.type==='sourceAppendCommit'){
  for(const op of group.prepared.members){const entity=op.value.entity;if(op.value.entityType==='input'){if(createdInputs.has(entity.id))fail('BNS_GROUP_SOURCE_COLLISION');createdInputs.set(entity.id,group);}if(op.value.entityType==='source'){if(createdSources.has(entity.sourceKey))fail('BNS_GROUP_SOURCE_COLLISION');createdSources.set(entity.sourceKey,group);}}
 }
 const depend=(group,other)=>{if(!other)fail('BNS_GROUP_CAUSAL_GAP');if(other!==group)group.dependencies.add(other.id);};
 for(const group of groups){
  for(const op of group.operations){if(op.type==='humanLibraryMember'&&(op.parents.length>1||!equal(op.parents.length?byRevision.get(op.parents[0])?.value.after:null,op.value.before)))fail('BNS_HUMAN_OWNER_CHANGED');for(const id of op.parents){const parent=byRevision.get(id);if(!parent||parent.type!==op.type||parent.entityId!==op.entityId)fail('BNS_GROUP_CAUSAL_GAP');depend(group,claimed.get(id));}}
  if(group.type==='sourceAppendCommit'){
   const anchor=group.prepared.descriptor.value.bootstrap,op=byRevision.get(anchor.revisionId),parent=claimed.get(anchor.revisionId);
   if(!op||op.type!=='sourceBootstrapCommit'||op.operationId!==anchor.operationId||!op.value.members.some(ref=>ref.revisionId===anchor.documentMemberRevisionId&&ref.entityId==='inputDocument:'+group.prepared.descriptor.value.documentId))fail('BNS_GROUP_CAUSAL_GAP');depend(group,parent);
  }
  if(group.type==='inputWorkingCommit')depend(group,createdInputs.get(group.prepared.descriptor.value.inputId));
  if(group.type==='filterIntent'){if(group.operations[0].value.reason!=='restored_from_filter')fail('BNS_GROUP_OWNER_UNSUPPORTED');depend(group,createdSources.get(group.operations[0].entityId));}
 }
 // Qualified Human owners have no Source/Working references. Preserve their
 // complete parent order and execute them first, so the original local history
 // allocator starts from the actual captured empty installation, never a
 // predicted foreign-owner counter. Existing non-Human dependencies stay intact.
 const human=groups.filter(group=>group.type==='humanLibraryCommit');for(const group of human)if([...group.dependencies].some(id=>!human.some(other=>other.id===id)))fail('BNS_HUMAN_UNSUPPORTED');for(const group of groups)if(group.type!=='humanLibraryCommit')for(const other of human)group.dependencies.add(other.id);
 const done=new Set(),ordered=[];
 while(ordered.length<groups.length){const ready=groups.filter(group=>!done.has(group.id)&&[...group.dependencies].every(id=>done.has(id))).sort((a,b)=>a.id.localeCompare(b.id));if(!ready.length)fail('BNS_GROUP_CAUSAL_GAP');for(const group of ready){done.add(group.id);ordered.push({...group,dependencies:[...group.dependencies].sort()});}}
 // Exact ordering commitment is independent of received object/page order.
 const graph=ordered.map(group=>({id:group.id,type:group.type,revisions:group.operations.map(op=>op.revisionId),dependencies:group.dependencies}));
 const plan=freeze({heads:[...heads].map(([key,revisions])=>({type:JSON.parse(key)[0],entityId:JSON.parse(key)[1],revisions,purged:false,fence:null})).sort((a,b)=>JSON.stringify([a.type,a.entityId]).localeCompare(JSON.stringify([b.type,b.entityId]))),groups:ordered,operationCount:operations.length,operationBytes:size,digest:await digest(graph)});
 if(core.datasetId!==binding.datasetId||core.repository!==binding.repository||core.prefix!==binding.prefix||core.fixedNamespace!==binding.fixedNamespace)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
 originalPlans.set(plan,binding);return plan;
}
