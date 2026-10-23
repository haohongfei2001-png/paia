import {prepareSourcePurgeWorkingCut} from './source-purge-group-working.js';
import {prepareGroupScope} from './group-checkpoint-scope.js';
import {prepareSourcePurgeActiveCut} from './source-purge-group-active.js';
import {requireOriginalGroupCheckpointPlan} from './group-checkpoint-plan.js';
import {requireRepositoryTransactionScope,requireRepositoryTransactionDataMethods} from '../idb-repository.js';
import {readGroupRows} from './group-page-reader.js';
import {measureSourceWorkingPhysicalTree,equalSourceWorkingPhysicalTree} from './source-working-physical.js';
import {validateOperation,sealOperation} from './core.js';
import {validateSourcePurgeIntent} from './source-purge-codec.js';
import {clone,equal,exact,fail,count} from './value.js';
const inventories=new WeakMap(),proofs=new WeakMap();
const freeze=v=>{if(v&&typeof v==='object'){for(const x of Object.values(v))freeze(x);Object.freeze(v);}return v;};
const denied=()=>fail('BNS_SOURCE_PURGE_UNSUPPORTED');
const own=(v,keys)=>exact(v,keys)&&Object.keys(v).length===keys.length;
const iso=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
// A negative group can prove denial and retirement only. Missing original
// Source bodies are never reconstructed or passed to a materializing owner.
export async function sourcePurgeNegativeInventory(core,revisionRows,allRows,namespace,prepareRemote,allowWorking=false,allowPortable=false){
 const prefix=core.prefix+'generation:'+namespace+':',remaining=new Map(revisionRows.map(row=>[row.id,row])),negative=[],entries=[];
 for(const row of revisionRows.filter(row=>row.operation?.type==='sourcePurgeIntent')){
  const descriptor=await validateOperation(row.operation),intent=validateSourcePurgeIntent(descriptor.value),operations=intent.targets.map(target=>remaining.get(prefix+'revision:'+target.purgeRevisionId)?.operation);operations.push(descriptor);
  const remote=await prepareRemote(operations,core);if(!equal(remote.operations,operations))denied();
  const deny={id:core.prefix+'sourcePurgeDeny:'+intent.sourceKey,version:1,intent:descriptor.revisionId,sourceKey:intent.sourceKey,sourceId:intent.sourceId};if(!equal(allRows.find(row=>row.id===deny.id),deny))denied();
  for(const target of intent.targets){const id=prefix+'revision:'+target.before.revisionId,value={id,operation:target.before,redacted:true};if(!equal(remaining.get(id),value))denied();remaining.delete(id);entries.push({operation:target.before,redacted:true,original:true});}
  for(const operation of operations){const id=prefix+'revision:'+operation.revisionId,value={id,operation,redacted:operation.kind==='purge'};if(!equal(remaining.get(id),value))denied();remaining.delete(id);entries.push({operation,redacted:value.redacted,original:false});}
  negative.push({intent,operations,deny});
 }
 const active=[];for(const row of remaining.values()){if(row.redacted||!['sourceBootstrapMember','sourceBootstrapCommit',...(allowWorking?['inputWorkingMember','inputWorkingCommit']:[]),...(allowPortable?['consumerPreference','promptPreferences','promptBinding']:[])].includes(row.operation?.type))denied();const operation=await validateOperation(row.operation);active.push(operation);entries.push({operation,redacted:false,original:false});}
 const keys=new Set(),revisions=new Set(),operationIds=new Set(),sequences=new Set();for(const {operation:op}of entries){const sequence=JSON.stringify([op.deviceId,op.sequence]);if(revisions.has(op.revisionId)||operationIds.has(op.operationId)||sequences.has(sequence))denied();revisions.add(op.revisionId);operationIds.add(op.operationId);sequences.add(sequence);}
 for(const p of negative)for(const [kind,value]of Object.entries(p.intent).filter(([k])=>['sourceId','sourceKey','documentId','inputId','baselineId'].includes(k))){const k=kind+':'+value;if(keys.has(k))denied();keys.add(k);}
 if(allRows.filter(row=>row.id.startsWith(core.prefix+'sourcePurgeDeny:')).length!==negative.length)denied();
 const result=freeze({active,negative,entries});inventories.set(result,{core,repository:core.repository,namespace});return result;
}
async function matchesOriginalMember(p,type,entity,total){
 const target=p.intent.targets.find(x=>x.before.entityId===type+':'+entity.id),commit=p.intent.targets.find(x=>x.before.type==='sourceBootstrapCommit');if(!target||!commit)denied();
 // Physical local allocation may differ from the portable creation. All
 // admitted history consists of complete bootstrap groups, so the original
 // allocation is bounded by their total number, including retired groups.
 for(let n=1;n<=total;n++){
  const candidate=clone(entity);if(type==='inputState')candidate.deltaSequence=n;else{candidate.sequence=n;candidate.listKey=[candidate.entityKey,n];candidate.documentList=[candidate.documentId,n];}
  const value={id:target.before.entityId,entityType:type,entity:candidate,logicalCommitId:commit.before.entityId,datasetId:target.before.datasetId,deviceId:target.before.deviceId};
  if((await sealOperation({...target.before,value})).revisionId===target.before.revisionId)return;
 }denied();
}
// Validate only the original pure-Source cleanup envelope. It can remove a
// canonical baseline, never authorize imported body content or a human row.
async function sourcePurgeNegativeCanonical(raw,negative,total){
 const excluded={inputStates:new Set(),revisions:new Set()},jobs=new Set(),events=new Set(),tombs=new Set();
 if(raw.inputStates.length!==total||new Set(raw.inputStates.map(row=>row.deltaSequence)).size!==total||raw.inputStates.some(row=>!count(row.deltaSequence)||row.deltaSequence<1||row.deltaSequence>total)||new Set(raw.revisions.map(row=>row.sequence)).size!==raw.revisions.length||raw.revisions.some(row=>!count(row.sequence)||row.sequence<1||row.sequence>total))denied();
 const epoch=raw.meta.find(row=>row.id==='thought-epoch');if(!equal(epoch,{id:'thought-epoch',value:negative.length*2}))denied();
 for(const p of negative){const v=p.intent,tomb=raw.tombstones.find(row=>row.id==='source:'+v.sourceKey);if(!tomb||!own(tomb,['id','sequence','value'])||!own(tomb.value,['sourceIdentityHash','deletedAt','status'])||tomb.value.sourceIdentityHash!==v.sourceKey||tomb.value.status!=='permanently_ignored'||!iso(tomb.value.deletedAt)||tomb.sequence!==Date.parse(tomb.value.deletedAt))denied();tombs.add(tomb.id);
  for(const [table,id]of [['records',v.sourceId],['recordIndex',v.sourceId],['blocks',v.inputId],['blockIndex',v.inputId],['documents',v.documentId],['libraryDocuments',v.documentId],['times',v.sourceKey],['sourceCounts',JSON.stringify([v.documentId,v.sourceKey])],['filterInputs',v.inputId]])if(raw[table].some(row=>row.id===id))denied();
  const state=raw.inputStates.find(row=>row.id===v.inputId);if(!state||!own(state,['id','documentId','contentRevision','removalState','filteringPolicyState','sourceRecordIds','deltaSequence','sourcePurged'])||!equal({...state,deltaSequence:0},{id:v.inputId,documentId:v.documentId,contentRevision:0,removalState:'active',filteringPolicyState:'none',sourceRecordIds:[],deltaSequence:0,sourcePurged:true}))denied();const originalState={...state,sourceRecordIds:[v.sourceId]};delete originalState.sourcePurged;await matchesOriginalMember(p,'inputState',originalState,total);excluded.inputStates.add(state.id);
  const history=raw.revisions.find(row=>row.id===v.baselineId);if(history){if(history.kind!=='input'||history.entityId!==v.inputId||history.documentId!==v.documentId||history.reason!=='baseline'||history.important!==true||!equal(history.sourceRecordIds,[v.sourceId]))denied();await matchesOriginalMember(p,'baselineRevision',history,total);excluded.revisions.add(history.id);}
  const event=raw.invalidations.find(row=>row.inputId===v.inputId);if(!event||!own(event,['id','eventSchema','inputId','reason','contentRevision','sequence','at','stateKey','state','cursor','dependencyAck','organizerAck'])||event.eventSchema!==2||event.reason!=='source_purged'||event.contentRevision!==null||!count(event.sequence)||event.sequence<2||event.sequence>negative.length*2||event.sequence%2!==0||!iso(event.at)||event.stateKey!==0||event.state!=='pending'||event.cursor!==null||event.dependencyAck!==false||event.organizerAck!==false)denied();events.add(event.id);
  const job=raw.organizerJobs.find(row=>row.sequence===event.sequence-1);if(!job||job.kind!=='purge_cleanup'||job.nextAttemptAt!==0||job.priority!==0||job.cursor!==null||!iso(job.createdAt)||!count(job.stage)||job.stage>11)denied();
  if(job.state==='completed'){if(!own(job,['id','kind','state','stateKey','sequence','nextAttemptAt','priority','stage','cursor','createdAt','sourceOffset'])||job.stateKey!==1||job.stage!==11||job.sourceOffset!==0||history)denied();}
  else if(!own(job,['id','kind','state','stateKey','sequence','nextAttemptAt','priority','sourceRecordIds','stage','cursor','createdAt',...(Object.hasOwn(job,'sourceOffset')?['sourceOffset']:[])])||job.state!=='queued'||job.stateKey!==0||!equal(job.sourceRecordIds,[v.sourceId])||Object.hasOwn(job,'sourceOffset')&&job.sourceOffset!==0)denied();jobs.add(job.id);
 }
 if(raw.organizerJobs.length!==jobs.size||raw.invalidations.length!==events.size||raw.tombstones.length!==tombs.size)denied();
 return excluded;
}

async function readCanonical(store,core,t){requireRepositoryTransactionScope(store.repository,t);requireRepositoryTransactionDataMethods(store.repository,t);if(core.repository!==store.repository)denied();const raw={};let references=0,retained=0;for(const name of t.tx.objectStoreNames){raw[name]=await readGroupRows(t,name);references+=raw[name].length;if(references>4096)denied();for(const row of raw[name]){retained+=measureSourceWorkingPhysicalTree(row).B;if(retained>2*1024*1024)denied();}}return raw;}
export async function prepareSourcePurgeRemainingCanonical(store,core,plan,scope,inventory){
 const original=inventories.get(inventory);if(!original||original.core!==core||original.repository!==store.repository||core.repository!==store.repository||!inventory.negative.length)denied();requireOriginalGroupCheckpointPlan(core,plan);
 const raw=await core.transaction(false,t=>readCanonical(store,core,t)),excluded=await sourcePurgeNegativeCanonical(raw,inventory.negative,plan.groups.filter(g=>g.type==='sourceBootstrapCommit').length+inventory.negative.length),view=Object.fromEntries(Object.entries(raw).map(([name,rows])=>[name,rows.filter(row=>!excluded[name]?.has(row.id))]));for(const name of ['tombstones','organizerJobs','invalidations'])view[name]=[];
 const proof=Object.freeze({});freeze(raw);freeze(view);proofs.set(proof,{store,core,repository:store.repository,plan,scope,raw,view});return {raw,view,proof};
}
export async function requireSourcePurgeRemainingCanonicalProof(proof,store,t,scope,view){const p=proofs.get(proof);if(!p||p.store!==store||p.repository!==store.repository||p.core.repository!==p.repository||p.scope!==scope||p.view!==view)denied();requireOriginalGroupCheckpointPlan(p.core,p.plan);if(!equalSourceWorkingPhysicalTree(await readCanonical(store,p.core,t),p.raw))denied();return true;}

// Mixed local cleanup and cold remote denial remain distinct original facts.
// A selected receiver with surviving Working but no local negative is also
// compared through the exact original native cut; it does not mint a denial.
// Only the former has original Input state / maintenance evidence. A cold
// denial can never fabricate those rows to impersonate local Source history.
export async function prepareGroupedSourcePurgeRemainingCanonical(store,core,plan,scope,inventory){
 const original=inventories.get(inventory);if(!original||original.core!==core||original.repository!==store.repository)denied();requireOriginalGroupCheckpointPlan(core,plan);if(!inventory.negative.length&&!plan.groups.some(g=>g.type==='inputWorkingCommit'))denied();
 const raw=await core.transaction(false,t=>readCanonical(store,core,t)),selected=await prepareSourcePurgeActiveCut(store,core,raw),working=await prepareSourcePurgeWorkingCut(store,core,raw,plan,original.namespace,inventory.negative),projected=working.view;plan=working.plan;scope=await prepareGroupScope(plan);const local=inventory.negative.filter(n=>raw.inputStates.some(row=>row.id===n.intent.inputId)),cold=inventory.negative.filter(n=>!local.includes(n)),coldTombs=new Set();
 if(raw.tombstones.length!==inventory.negative.length)denied();
 for(const p of cold){const v=p.intent,tomb=raw.tombstones.find(row=>row.id==='source:'+v.sourceKey),expected={id:'source:'+v.sourceKey,sequence:Date.parse(v.at),value:{sourceIdentityHash:v.sourceKey,deletedAt:v.at,status:'permanently_ignored'}};if(!equal(tomb,expected))denied();coldTombs.add(expected.id);
  for(const [table,id]of [['records',v.sourceId],['recordIndex',v.sourceId],['blocks',v.inputId],['blockIndex',v.inputId],['times',v.sourceKey],['documents',v.documentId],['libraryDocuments',v.documentId],['inputStates',v.inputId],['revisions',v.baselineId],['filterInputs',v.inputId]])if(raw[table].some(row=>row.id===id))denied();
 }
 const excluded=local.length?await sourcePurgeNegativeCanonical({...projected,tombstones:projected.tombstones.filter(row=>!coldTombs.has(row.id))},local,plan.groups.filter(g=>g.type==='sourceBootstrapCommit').length+local.length):{};
 if(!local.length&&(projected.organizerJobs.length||projected.invalidations.length))denied();
 const view=Object.fromEntries(Object.entries(projected).map(([name,rows])=>[name,(name==='meta'?rows.filter(row=>selected.view.meta.some(r=>r.id===row.id)):rows).filter(row=>!excluded[name]?.has(row.id))]));for(const name of ['tombstones','organizerJobs','invalidations'])view[name]=[];
 const proof=Object.freeze({});freeze(raw);freeze(view);proofs.set(proof,{store,core,repository:store.repository,plan,scope,raw,view});return {raw,view,proof,localCount:local.length,scope,plan,working};
}
