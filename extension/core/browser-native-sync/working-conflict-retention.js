import {CORE_LIMITS,acceptSequence,requireOriginalWorkingRetentionCore,requireWorkingRetentionPhase} from './core.js';
import {describeOriginalWorkingGroup,prepareWorkingApplication,qualifyOriginalWorkingRetentionApplication,readOriginalWorkingRetentionPreparation,releaseOriginalWorkingApplication,requireOriginalWorkingRetentionReceiver} from './input-working-commit.js';
import {requireSourceWorkingStoreBinding} from './source-working-binding.js';
import {requireOriginalLibraryDocumentsGenerationMethods} from '../library-documents-owner.js';
import {readOriginalControlSettings,assertOriginalControlSettingsFacts} from '../indexed-store.js';
import {CONSENT_VERSION} from '../constants.js';
import {remoteWorkingHistoryRow} from '../ia-store-owner.js';
import {projectEntity} from './codecs.js';
import {protocolPhysicalId} from './physical-key.js';
import {requireConsumerPublicationSettled} from './consumer-publication-state.js';
import {CANONICAL_REPOSITORY_PROTECTION} from './canonical-generation-repository-gate.js';
import {APPLICATION_SELECTION_MARKER} from './application-generation-selection.js';
import {measureSourceWorkingPhysicalTree,equalSourceWorkingPhysicalTree} from './source-working-physical.js';
import {createOriginalRecoveryWork,withOriginalRecoveryWork,chargeOriginalRecoveryWork,checkOriginalRecoveryWork,finishOriginalRecoveryWork,originalRepositoryTransactionOwner,requireRepositoryTransactionScope,requireRepositoryTransactionDataMethods,requireRepositoryTransactionCommitted,awaitRepositoryTransactionSettled,registerRepositoryFinalReadFence} from '../idb-repository.js';
import {clone,equal,fail,identifier} from './value.js';

const required=()=>fail('BNS_WORKING_RETENTION_REQUIRED');
const changed=()=>fail('BNS_WORKING_CONFLICT_CHANGED');
const freeze=x=>{if(x&&typeof x==='object'){for(const v of Object.values(x))freeze(v);Object.freeze(x);}return x;};
const caps=new WeakMap();
// Internal-slot schema reads only, not another native-commit proof mechanism.
const nativeDatabaseStores=Object.getOwnPropertyDescriptor(globalThis.IDBDatabase?.prototype??{},'objectStoreNames')?.get,nativeTransactionStores=Object.getOwnPropertyDescriptor(globalThis.IDBTransaction?.prototype??{},'objectStoreNames')?.get,nativeNamesLength=Object.getOwnPropertyDescriptor(globalThis.DOMStringList?.prototype??{},'length')?.get,nativeNamesItem=globalThis.DOMStringList?.prototype?.item;
function nativeNames(object,getter){if(!getter||!nativeNamesLength||!nativeNamesItem)required();const names=getter.call(object),length=nativeNamesLength.call(names),result=[];for(let i=0;i<length;i++)result.push(nativeNamesItem.call(names,i));return result;}
const snapshot=b=>({libraryText:b.libraryText,note:b.note,excluded:b.excluded,originalTextReference:b.originalTextReference,provenanceSignature:b.provenanceSignature});
const immutable=b=>Object.fromEntries(Object.entries(b).filter(([k])=>!['libraryText','note','editedAt','revision','userEdited'].includes(k)));

// PURE structural qualification. The result cannot authorize any transaction.
// Every retained member is accompanied by its complete original logical group.
export async function qualifyWorkingConflictGraph(core,input,incumbent,incoming,pay=()=>{}){
 requireOriginalWorkingRetentionCore(core);
 if(!Array.isArray(input)||input.length>CORE_LIMITS.batch||input.length<15||incumbent===incoming)fail('BNS_WORKING_CONFLICT_GRAPH');
 const buckets=new Map(),ids=new Set(),sequences=new Set(),revisions=new Set();
 for(const op of input){
  pay(op);
  if(!op||!['inputWorkingMember','inputWorkingCommit'].includes(op.type)||op.kind!=='put'||op.actor!=='user'||ids.has(op.operationId)||sequences.has(JSON.stringify([op.deviceId,op.sequence]))||revisions.has(op.revisionId))fail('BNS_WORKING_CONFLICT_GRAPH');
  ids.add(op.operationId);sequences.add(JSON.stringify([op.deviceId,op.sequence]));revisions.add(op.revisionId);
  const id=op.type==='inputWorkingCommit'?op.entityId:op.value?.logicalCommitId,rows=buckets.get(id)||[];rows.push(op);buckets.set(id,rows);
 }
 const groups=[],byInput=new Map(),byRevision=new Map();
 for(const rows of buckets.values()){
  const prepared=await core.prepareWorkingReceive(rows);pay(prepared);
  if(prepared.members.some(op=>op.sequence>=prepared.descriptor.sequence))fail('BNS_WORKING_CONFLICT_VECTOR');
  const shape=describeOriginalWorkingGroup(prepared),g={prepared,...shape};
  groups.push(g);byInput.set(g.block.operation.revisionId,g);
  for(const op of [...prepared.members,prepared.descriptor])byRevision.set(op.revisionId,op);
 }
 const local=byInput.get(incumbent),remote=byInput.get(incoming);if(!local||!remote)fail('BNS_WORKING_CONFLICT_GRAPH');
 const roots=[];
 for(const g of groups){
  if(g.descriptor.inputId!==local.descriptor.inputId||g.descriptor.documentId!==local.descriptor.documentId||!equal(g.descriptor.sourceRefs,local.descriptor.sourceRefs)||!equal(immutable(g.block.value),immutable(local.block.value))||!equal(g.state.value.sourceRecordIds,local.state.value.sourceRecordIds)||g.state.value.filteringPolicyState!==local.state.value.filteringPolicyState||g.state.value.sourcePurged||g.state.value.removalState!=='active'||g.block.value.excluded||g.block.value.branchStatus)fail('BNS_WORKING_CONFLICT_GRAPH');
  if(!equal([...g.keeps.map(x=>x.value.id)].sort(),[...new Set(g.descriptor.sourceRefs.map(x=>x.sourceKey))].sort()))fail('BNS_WORKING_SOURCE_CLOSURE');
  const parents=g.block.operation.parents;if(parents.length>1)fail('BNS_WORKING_CONFLICT_GRAPH');
  const previous=parents.length?byInput.get(parents[0]):null;
  if(parents.length&&!previous)fail('BNS_WORKING_ANCESTRY_REQUIRED');
  if(previous){
   if(g.block.value.revision!==previous.block.value.revision+1||g.state.value.contentRevision!==previous.state.value.contentRevision+1||previous.history.some(row=>!g.history.some(x=>x.value.id===row.value.id)))fail('BNS_WORKING_CONFLICT_GRAPH');
   if(g.block.value.libraryText===previous.block.value.libraryText&&g.block.value.note===previous.block.value.note)fail('BNS_WORKING_NO_CHANGE');
  }else{
   roots.push(g);const baseline=g.history.filter(x=>x.value.reason==='baseline');
   if(g.block.value.revision!==1||g.state.value.contentRevision!==1||baseline.length!==1||!equal(baseline[0].value.before,baseline[0].value.after)||!equal(baseline[0].value.after,{...snapshot(g.block.value),libraryText:null,note:''})||g.block.value.libraryText===null&&g.block.value.note==='')fail('BNS_WORKING_CONFLICT_GRAPH');
  }
  for(const member of g.entities){
   const prior=previous?.entities.find(x=>x.operation.entityId===member.operation.entityId);
   if(!equal(member.operation.parents,prior?[prior.operation.revisionId]:[])||!prior&&previous&&member.type!=='revision')fail('BNS_WORKING_CONFLICT_VECTOR');
   if(prior&&prior.operation.deviceId===member.operation.deviceId&&prior.operation.sequence>=member.operation.sequence)fail('BNS_WORKING_CONFLICT_VECTOR');
  }
 }
 if(roots.length!==1)fail('BNS_WORKING_ANCESTRY_REQUIRED');
 const ancestors=id=>{const seen=new Set();while(id){if(seen.has(id))fail('BNS_WORKING_CONFLICT_GRAPH');seen.add(id);id=byInput.get(id)?.block.operation.parents[0];}return seen;};
 const a=ancestors(incumbent),b=ancestors(incoming);
 if(a.has(incoming)||b.has(incumbent)||![...a].some(id=>b.has(id)))fail('BNS_WORKING_CONFLICT_NOT_CONCURRENT');
 const parentInputs=new Set(groups.flatMap(g=>g.block.operation.parents)),leaves=groups.map(g=>g.block.operation.revisionId).filter(id=>!parentInputs.has(id)).sort();
 if(!equal(leaves,[incumbent,incoming].sort())||new Set([...a,...b]).size!==groups.length)fail('BNS_WORKING_CONFLICT_HEADS');
 const heads=new Map();
 for(const op of byRevision.values()){const key=op.type+':'+op.entityId,rows=heads.get(key)||[];rows.push(op);heads.set(key,rows);}
 const expected=[];
 for(const rows of heads.values()){
  const parentIds=new Set(rows.flatMap(op=>op.parents)),live=rows.filter(op=>!parentIds.has(op.revisionId));
  if(!live.length||live.length>2)fail('BNS_WORKING_CONFLICT_HEADS');
  expected.push({type:rows[0].type,entityId:rows[0].entityId,revisions:live.map(op=>op.revisionId).sort(),purged:false,fence:null});
 }
 const result={kind:'PURE_WORKING_CONFLICT_GRAPH_ONLY',inputId:local.descriptor.inputId,documentId:local.descriptor.documentId,incumbent,incoming,local,remote,groups,operations:[...byRevision.values()],heads:expected};pay(result);return freeze(result);
}

function binding(receiver,previous=null){
 const r=requireOriginalWorkingRetentionReceiver(receiver);requireOriginalWorkingRetentionCore(r.core);requireOriginalLibraryDocumentsGenerationMethods(r.store);
 const b=requireSourceWorkingStoreBinding(r.store,r.core,previous);
 if(r.filter!==b.filter||!originalRepositoryTransactionOwner(b.repository)||b.fixedNamespace!==null)required();return b;
}
function scope(p,t,write){
 const s=requireRepositoryTransactionScope(p.binding.repository,t);requireRepositoryTransactionDataMethods(p.binding.repository,t);
 if(!s.nativeTransaction||s.database!==p.binding.database||s.mode!==(write?'readwrite':'readonly'))required();
 // A caller-shortened repository.stores must not turn a partial transaction
 // into a supposedly complete canonical/negative cut.
 const tables=nativeNames(t.tx,nativeTransactionStores);if(!equal(tables,nativeNames(s.database,nativeDatabaseStores))||p.tables&&!equal(p.tables,tables))required();p.tables??=Object.freeze(tables);return s;
}
function pay(p,value){const n=measureSourceWorkingPhysicalTree(value).B;chargeOriginalRecoveryWork(p.binding.repository,p.ticket,n);return value;}
function current(p){
 checkOriginalRecoveryWork(p.binding.repository,p.ticket);binding(p.receiver,p.binding);if(p.control)assertOriginalControlSettingsFacts(p.binding.store,p.control);return true;
}
async function capture(p,t){
 scope(p,t,false);current(p);await requireConsumerPublicationSettled(t);
 if(await t.get('meta',CANONICAL_REPOSITORY_PROTECTION)||await t.get('meta',APPLICATION_SELECTION_MARKER))fail('BNS_WORKING_RETENTION_UNPROTECTED_REQUIRED');
 const control=readOriginalControlSettings(p.binding.store,t,p.control??null);
 if(control.settings.enabled!==true||control.settings.consentVersion!==CONSENT_VERSION)fail('BNS_WORKING_PERMISSION_REQUIRED');p.control=control;
 const raw={};for(const table of p.tables){
  const rows=[];let after=null;do{const page=await t.primaryRangePage(table,{after,limit:64});for(const {key,value}of page.rows){if(value?.id!==key)changed();rows.push(value);}after=page.next;}while(after!==null);raw[table]=rows;
 }
 if(raw.meta.some(r=>r.id.startsWith('canonical-generation:checkpoint:')))fail('BNS_WORKING_RETENTION_UNPROTECTED_REQUIRED');
 if(control.restoreEpoch!==(row(raw,'meta','recovery-restore-epoch')?.value??null))fail('BNS_RESTORE_EPOCH_CHANGED');
 // Capture and seal the exact physical cut, including own undefined/-0.
 pay(p,raw);return freeze(raw);
}
const row=(raw,table,id)=>raw[table]?.find(x=>x.id===id);
function protocol(p,kind,...ids){return protocolPhysicalId(p.binding.prefix,p.namespace,kind,ids);}
function get(p,kind,...ids){return row(p.raw,'meta',protocol(p,kind,...ids));}
function storedGroups(p,id){
 const revisions=p.raw.meta.filter(x=>x.id.startsWith(protocol(p,'revision'))),descriptors=revisions.filter(x=>x.operation?.type==='inputWorkingCommit'&&x.operation.value?.inputId===id),ids=new Set(descriptors.map(x=>x.operation.entityId));
 const rows=revisions.filter(x=>ids.has(x.operation?.type==='inputWorkingCommit'?x.operation.entityId:x.operation?.value?.logicalCommitId));
 if(rows.some(x=>x.redacted))fail('BNS_WORKING_ANCESTRY_REQUIRED');
 for(const r of revisions){const op=r.operation;if(op?.type==='inputWorkingMember'&&(['input','inputState'].includes(op.value?.entityType)?op.value.entity.id===id:op.value?.entityType==='revision'&&op.value.entity.entityId===id)&&!ids.has(op.value.logicalCommitId))fail('BNS_WORKING_ANCESTRY_REQUIRED');}
 return rows.map(x=>x.operation);
}
async function qualify(p,input,inputId){
 const {core,store}=p.binding,owner=get(p,'workingOwner',inputId),head=get(p,'head','inputWorkingMember','input:'+inputId);
 if(!owner||!head||head.purged||!head.revisions.includes(owner.revisionId)||head.revisions.length>2)fail('BNS_WORKING_INCUMBENT_REQUIRED');
 let incoming=input?.find(x=>x.type==='inputWorkingMember'&&x.value.entityType==='input')?.revisionId;
 if(!incoming){if(head.revisions.length!==2)fail('BNS_WORKING_CONFLICT_REQUIRED');incoming=head.revisions.find(id=>id!==owner.revisionId);}
 const operations=storedGroups(p,inputId),existing=new Map(operations.map(op=>[op.revisionId,op]));
 if(input)for(const op of input){const old=existing.get(op.revisionId);if(old){if(!equal(old,op))fail('BNS_OPERATION_COLLISION');}else operations.push(op);}
 const graph=await qualifyWorkingConflictGraph(core,operations,owner.revisionId,incoming,v=>pay(p,v));current(p);
 if(graph.remote.prepared.descriptor.deviceId===p.binding.deviceId)fail('BNS_WORKING_CONFLICT_DEVICE');
 const receipt=get(p,'receipt',graph.remote.prepared.descriptor.operationId);p.duplicate=!!receipt;
 if(head.revisions.length!==(p.duplicate?2:1)||!input&&!p.duplicate)changed();
 for(const op of graph.operations){
  const remote=graph.remote.prepared.members.includes(op)||op===graph.remote.prepared.descriptor;
  const existing=get(p,'revision',op.revisionId),r=get(p,'receipt',op.operationId),seq=get(p,'sequence',op.deviceId,String(op.sequence).padStart(16,'0'));
  const index=get(p,'entityRevision',op.type,op.entityId,op.revisionId);
  if(existing){if(!equal(existing,{id:protocol(p,'revision',op.revisionId),operation:op,redacted:false})||!equal(index,{id:protocol(p,'entityRevision',op.type,op.entityId,op.revisionId),revisionId:op.revisionId})||r?.digest!==op.revisionId||r.deviceId!==op.deviceId||r.sequence!==op.sequence||seq?.operationId!==op.operationId||seq.digest!==op.revisionId)changed();}
  else if(!remote||p.duplicate||r||seq||index)changed();
 }
 // All live vectors must be exactly the complete original history, before or
 // after retention. No unaccounted third branch or receipt is adopted.
 for(const expected of graph.heads){
  const candidates=graph.operations.filter(op=>op.type===expected.type&&op.entityId===expected.entityId&&(p.duplicate||op!==graph.remote.prepared.descriptor&&!graph.remote.prepared.members.includes(op))),parents=new Set(candidates.flatMap(op=>op.parents)),revisions=candidates.filter(op=>!parents.has(op.revisionId)).map(op=>op.revisionId).sort(),actual=get(p,'head',expected.type,expected.entityId);
  if(!equal(actual??null,revisions.length?{...expected,revisions,id:protocol(p,'head',expected.type,expected.entityId)}:null))changed();
 }
 if(p.raw.meta.some(r=>['pending','entityPending','waiting','quarantine'].some(kind=>r.id.startsWith(protocol(p,kind)))))fail('BNS_WORKING_CONFLICT_PENDING');
 for(const ref of graph.local.descriptor.sourceRefs){
  if(row(p.raw,'meta',p.binding.prefix+'sourcePurgeDeny:'+ref.sourceKey)||row(p.raw,'tombstones','source:'+ref.sourceKey)||row(p.raw,'tombstones','snapshot:'+ref.dedupeKey)||row(p.raw,'inputRemovals',ref.sourceKey)||p.raw.meta.some(r=>r.operation?.type==='sourcePurgeIntent'&&(r.operation.value?.sourceKey===ref.sourceKey||r.operation.value?.inputId===inputId)))fail('BNS_WORKING_SOURCE_PURGED');
  const related=new Set(['source:'+ref.id,'timeEvidence:'+ref.sourceKey,'inputDocument:'+graph.documentId,'input:'+inputId,'inputState:'+inputId,...graph.local.history.filter(h=>h.value.reason==='baseline').map(h=>'baselineRevision:'+h.value.id)]);
  if(p.raw.meta.some(r=>r.type==='sourceBootstrapMember'&&related.has(r.entityId)&&r.purged||r.operation?.type==='sourceBootstrapMember'&&related.has(r.operation.entityId)&&(r.redacted||r.operation.kind==='purge')))fail('BNS_WORKING_SOURCE_PURGED');
 }
 const application=await prepareWorkingApplication(p.receiver,[...graph.remote.prepared.members,graph.remote.prepared.descriptor]);
 try{
  const before=await core.transaction(false,async t=>{scope(p,t,false);current(p);const before=await p.receiver.journal.snapshot(t,inputId,graph.documentId,store.clock());p.fence=before.fence;return before;}),sources=await p.receiver.filter.qualify(graph.local.keeps.map(x=>x.value.id));
  if(before.fence.namespace!==p.namespace||before.fence.epoch!==p.control.restoreEpoch||!equal(sources.fence,before.fence)||before.generation!==(row(p.raw,'meta','backup-data-generation')?.value||0))fail('BNS_RESTORE_EPOCH_CHANGED');
  qualifyOriginalWorkingRetentionApplication(p.receiver,application,before,sources);current(p);
  if(!equal(projectEntity('input',{value:before.b}),graph.local.block.value)||!equal(before.state,{...graph.local.state.value,deltaSequence:owner.deltaSequence})||before.history.length!==graph.local.history.length)changed();
  for(const h of graph.local.history){const map=get(p,'workingHistory',h.value.id);if(!map||map.revisionId!==h.operation.revisionId||!equal(row(p.raw,'revisions',h.value.id),remoteWorkingHistoryRow(h.value,map.sequence)))changed();}
  for(const keep of graph.local.keeps)if(!equal(row(p.raw,'filterIntents',keep.value.id),keep.value))changed();
  if(!before.filter?.userEdited||before.filter.decision!=='keep'||!equal(before.b,row(p.raw,'blocks',inputId)?.value)||!equal(before.state,row(p.raw,'inputStates',inputId)))changed();
 }finally{releaseOriginalWorkingApplication(store,core,application);}
 p.graph=graph;return graph;
}

async function window(receiver,options,action){
 const b=binding(receiver),descriptors=Object.getOwnPropertyDescriptors(options??{});
 if(Reflect.ownKeys(descriptors).some(k=>!['isCurrent','ms'].includes(k))||Object.values(descriptors).some(d=>!Object.hasOwn(d,'value')))required();
 const isCurrent=descriptors.isCurrent?.value??(()=>true),ms=descriptors.ms?.value??30000;if(typeof isCurrent!=='function')required();
 let p;const ticket=createOriginalRecoveryWork(b.repository,{ms,isCurrent:()=>{if(isCurrent()!==true)return false;binding(receiver,b);if(p?.control)assertOriginalControlSettingsFacts(b.store,p.control);return true;}});p={receiver,binding:b,ticket,control:null,namespace:null};
 try{return await withOriginalRecoveryWork(b.repository,ticket,()=>action(p));}finally{finishOriginalRecoveryWork(b.repository,ticket);}
}
async function readCut(p){
 let observed;p.raw=await p.binding.core.transaction(false,async t=>{observed=t;const raw=await capture(p,t);p.namespace=row(raw,'meta',p.binding.prefix+'active')?.namespace??'initial';if(await p.binding.core.bind(t)!==p.namespace)changed();return raw;});
 await awaitRepositoryTransactionSettled(p.binding.repository,observed);requireRepositoryTransactionCommitted(p.binding.repository,observed);current(p);
}
export async function retainOriginalWorkingConflict(receiver,input,options){
 return window(receiver,options,async p=>{
  pay(p,input);const application=await prepareWorkingApplication(receiver,input);let prepared;
  try{prepared=readOriginalWorkingRetentionPreparation(receiver,application);}finally{releaseOriginalWorkingApplication(p.binding.store,p.binding.core,application);}
  if(prepared.descriptor.deviceId===p.binding.deviceId)fail('BNS_WORKING_CONFLICT_DEVICE');
  await readCut(p);await qualify(p,[...prepared.members,prepared.descriptor],prepared.descriptor.value.inputId);current(p);
  const cap=Object.freeze({});caps.set(cap,p);try{return await p.binding.core.retainWorkingConflict(cap);}finally{caps.delete(cap);}
 });
}
export async function readOriginalWorkingConflict(receiver,inputId,options){
 if(!identifier(inputId))required();return window(receiver,options,async p=>{
  await readCut(p);const graph=await qualify(p,null,inputId);current(p);let observed;
  await p.binding.core.transaction(false,async t=>{observed=t;scope(p,t,false);current(p);await requireConsumerPublicationSettled(t);readOriginalControlSettings(p.binding.store,t,p.control);await requirePhysicalCut(p,t);});
  await awaitRepositoryTransactionSettled(p.binding.repository,observed);requireRepositoryTransactionCommitted(p.binding.repository,observed);current(p);
  const result={state:'retained-conflict',inputId,incumbentRevision:graph.incumbent,heads:[graph.incumbent,graph.incoming].sort(),groups:graph.groups.map(g=>[...g.prepared.members,g.prepared.descriptor])};pay(p,result);return clone(result);
 });
}

export function claimWorkingRetention(core,cap){const p=caps.get(cap);if(!p||p.binding.core!==core||p.claimed)required();current(p);p.claimed=true;return Object.freeze({repository:p.binding.repository,database:p.binding.database,namespace:p.namespace});}
export function assertWorkingRetentionCurrent(core,cap){const p=caps.get(cap);if(!p||p.binding.core!==core||!p.claimed)required();return current(p);}

function predicted(p){
 const raw=Object.fromEntries(Object.entries(p.raw).map(([name,rows])=>[name,[...rows]])),meta=new Map(raw.meta.map(r=>[r.id,r]));
 const put=(kind,ids,value)=>{const id=protocol(p,kind,...ids);meta.set(id,{...value,id});};
 if(!p.duplicate)for(const op of [...p.graph.remote.prepared.members,p.graph.remote.prepared.descriptor]){
  put('revision',[op.revisionId],{operation:op,redacted:false});put('entityRevision',[op.type,op.entityId,op.revisionId],{revisionId:op.revisionId});
  const h=p.graph.heads.find(h=>h.type===op.type&&h.entityId===op.entityId);put('head',[op.type,op.entityId],h);
  put('receipt',[op.operationId],{digest:op.revisionId,deviceId:op.deviceId,sequence:op.sequence});put('sequence',[op.deviceId,String(op.sequence).padStart(16,'0')],{operationId:op.operationId,digest:op.revisionId});
  const frontier=meta.get(protocol(p,'frontier',op.deviceId));put('frontier',[op.deviceId],{...acceptSequence(frontier?{frontier:frontier.frontier,ranges:frontier.ranges}:null,op.sequence),deviceId:op.deviceId});
  const generation=meta.get(protocol(p,'generation'));put('generation',[],{value:(generation?.value||0)+1});
 }
 raw.meta=[...meta.values()];pay(p,raw);return freeze(raw);
}
export async function requireWorkingRetentionInTransaction(core,t,cap){
 const p=caps.get(cap);if(!p||p.binding.core!==core)required();requireWorkingRetentionPhase(core,t,cap,'validate');scope(p,t,true);current(p);
 if(await core.bind(t)!==p.namespace)changed();await requireConsumerPublicationSettled(t);readOriginalControlSettings(p.binding.store,t,p.control);
 await requirePhysicalCut(p,t);
 const expected=predicted(p);registerRepositoryFinalReadFence(p.binding.repository,t,{isCurrent:()=>current(p),plan:function*(){for(const [table,rows]of Object.entries(expected)){if((yield {method:'count',table})!==rows.length)changed();for(const r of rows)if(!equalSourceWorkingPhysicalTree(yield {method:'get',table,key:r.id},r))changed();}return true;}});
 return {duplicate:p.duplicate,operations:[...p.graph.remote.prepared.members,p.graph.remote.prepared.descriptor]};
}
async function requirePhysicalCut(p,t){for(const [table,rows]of Object.entries(p.raw)){if(await t.count(table)!==rows.length)changed();for(const expected of rows)if(!equalSourceWorkingPhysicalTree(await t.get(table,expected.id),expected))changed();}}
