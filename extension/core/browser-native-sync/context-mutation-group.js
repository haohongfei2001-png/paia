import {ContextCardsService,readContextCards,emptyContextCards,CONTEXT_CARDS_ROW} from '../context-cards.js';
import {requireOriginalLibraryDocumentsGenerationMethods} from '../library-documents-owner.js';
import {readableContextItems,fenceContextLineage,releaseContextLineage} from '../context-item-lineage.js';
import {requireOriginalGroupCheckpointPlan} from './group-checkpoint-plan.js';
import {readCanonicalCheckpointProof} from './canonical-generation-checkpoint-stage.js';
import {contextMutationItemAtEpoch,verifyContextMutationDescription} from './context-mutation-codec.js';
import {readRestoreEpoch} from './prompt-journal.js';
import {hashText} from '../dedupe.js';
import {registerRepositoryWorkLimit} from '../idb-repository.js';
import {requireOriginalContextMutationCore} from './core.js';
import {clone,equal,fail} from './value.js';
const applications=new WeakMap(),publications=new WeakMap();
const oldTypes=new Set(['contextItem','contextRulesItem','contextNowItem']);
function requireOwner(a){requireOriginalLibraryDocumentsGenerationMethods(a.store);requireOriginalContextMutationCore(a.core);requireOriginalGroupCheckpointPlan(a.core,a.plan);if(a.store.repository!==a.core.repository)fail('BNS_CONTEXT_OWNER_REQUIRED');}
// Only an authentic complete graph on an empty fixed replay namespace may
// create this capability. Automatic evidence is initially written only to the
// original invisible generation, then qualified from that real owner before
// publication. No DTO is ever presented as an IndexedStore.
export async function prepareContextGroupApplication(store,core,plan,{live=null,generationProof=null}={}){
 requireOriginalLibraryDocumentsGenerationMethods(store);requireOriginalGroupCheckpointPlan(core,plan);
 if(!plan.groups.some(group=>group.type==='contextMutationCommit'))return null;
 if(store.repository!==core.repository)fail('BNS_CONTEXT_OWNER_REQUIRED');
 const automatic=plan.groups.some(group=>group.type==='contextMutationCommit'&&group.prepared.members.some(op=>op.value.item.origin==='automatic'));
 if(automatic){const proof=readCanonicalCheckpointProof(generationProof,{store,core:live});if(proof.graphDigest!==plan.digest||live.repository!==core.repository)fail('BNS_CONTEXT_SHADOW_REQUIRED');}
 requireOriginalContextMutationCore(core);const service=new ContextCardsService(store);
 const protocols=await core.prepareContextRestoreProtocols(plan),initial=await store.run(()=>core.transaction(false,async t=>{await service.admitted(t);return {row:await readContextCards(t),epoch:await readRestoreEpoch(t)};},['meta']));
 if(initial.row.items.length||initial.row.sequence!==0)fail('BNS_CONTEXT_RESTORE_NOT_EMPTY');
 let row=emptyContextCards();const steps=[];
 for(const group of plan.groups){
  if(oldTypes.has(group.type)){const op=group.operations[0],index=row.items.findIndex(item=>item.id===op.entityId);if(index<0)row.items.push(op.value);else row.items[index]=op.value;row.sequence=Math.max(row.sequence,op.value.order+1);continue;}
  if(group.type!=='contextMutationCommit')continue;
  const protocol=protocols.find(p=>p.descriptor.revisionId===group.id);if(!protocol)fail('BNS_CONTEXT_GROUP_REQUIRED');
  const descriptor=protocol.descriptor.value,beforeItems=[...row.items],beforeSequence=row.sequence;
  if(descriptor.command.kind==='move')for(const [key,value]of Object.entries(descriptor.command.expectedAccess))row.access[key]=clone(value);
  const verified=await verifyContextMutationDescription(descriptor,protocol.members.map(op=>op.value),row),epoch=initial.epoch??'initial',command={...verified.command,epoch};
  const receipt=command.kind==='bootstrap'?null:{id:'context:'+descriptor.domainOperationId,namespace:'context-cards',schemaVersion:1,ownerId:command.itemId,createdAt:descriptor.at,digest:await hashText(JSON.stringify(command)),epoch,result:clone(descriptor.result)};
  // These are borrowed exact sealed member references, not durable alternate
  // before/after bodies. The existing canonical row remains the sole UI owner.
  steps.push({id:group.id,protocol,beforeItems,beforeSequence,afterItems:[...verified.row.items],afterSequence:verified.row.sequence,receipt});row=verified.row;
 }
 const capability=Object.freeze({});applications.set(capability,{store,core,plan,service,initial,steps,automatic});return capability;
}
export async function applyContextGroupStep(t,capability,id){const a=applications.get(capability),step=a?.steps.find(value=>value.id===id);if(!step)fail('BNS_CONTEXT_GROUP_REQUIRED');requireOwner(a);return a.core.commitContextRestoreProtocol(t,step.protocol,capability);}
export async function executeOriginalContextGroupStep(t,core,protocol,capability){
 const a=applications.get(capability),step=a?.steps.find(value=>value.protocol===protocol);if(!step||a.core!==core)fail('BNS_CONTEXT_GROUP_REQUIRED');requireOwner(a);
 registerRepositoryWorkLimit(a.store.repository,t);await a.service.admitted(t);
 const epoch=await readRestoreEpoch(t);if(epoch!==a.initial.epoch)fail('BNS_RESTORE_EPOCH_CHANGED');
 const row=await readContextCards(t),localEpoch=epoch??'initial';
 if(row.sequence!==step.beforeSequence||!equal(row.items,step.beforeItems.map(item=>contextMutationItemAtEpoch(item,localEpoch))))fail('BNS_CONTEXT_OWNER_CHANGED');
 row.items=step.afterItems.map(item=>contextMutationItemAtEpoch(item,localEpoch));row.sequence=step.afterSequence;
 if(step.receipt&&await t.get('operationReceipts',step.receipt.id))fail('BNS_CONTEXT_RECEIPT_COLLISION');
 await t.put('meta',row);if(step.receipt)await t.put('operationReceipts',step.receipt);
 const marker=await core.get(t,'ownerRecoveryEpoch');if(marker&&marker.epoch!==epoch)fail('BNS_RESTORE_EPOCH_CHANGED');if(!marker)await core.put(t,'ownerRecoveryEpoch',[],{version:1,epoch});
 for(const op of protocol.members)await core.put(t,'contextMutationEpoch',[op.entityId],{version:1,epoch:localEpoch,revisionId:op.revisionId});
 const d=protocol.descriptor.value;await core.put(t,'contextMutationState',[],{version:1,sequence:d.after.sequence});
 if(d.command.kind!=='bootstrap')await core.put(t,'contextMutationCommand',[d.domainOperationId],{version:1,revisionId:protocol.descriptor.revisionId,receipt:{id:'context:'+d.domainOperationId,namespace:'context-cards',schemaVersion:1,ownerId:d.command.itemId,digest:d.requestDigest,epoch:d.command.epoch,result:d.result}});
}
// This is a read-only qualification of the actual restored canonical owner.
// The original generation publisher holds and fences it before the active
// pointer can change. A second preparation releases its own capture only.
export async function prepareContextGenerationPublication(store,core,plan){
 requireOriginalLibraryDocumentsGenerationMethods(store);requireOriginalGroupCheckpointPlan(core,plan);
 if(!plan.groups.some(group=>group.type==='contextMutationCommit'))return null;
 const captured=await store.run(()=>core.transaction(false,async t=>({row:await readContextCards(t),raw:await t.get('meta',CONTEXT_CARDS_ROW),epoch:await readRestoreEpoch(t)}),['meta']));
 const automatic=captured.row.items.filter(item=>item.origin==='automatic');let lineage=null;
 try{
  if(automatic.some(item=>item.lifecycle==='invalidated'))fail('BNS_CONTEXT_LINEAGE_UNAVAILABLE');
  if(automatic.length){const readable=await readableContextItems(store,automatic.map(item=>({...clone(item),lifecycle:'active',deletedBy:null})),{epoch:captured.epoch??'initial',rowSerialized:JSON.stringify(captured.raw),retainAuthoredCapture:true});lineage=readable.captured;if(readable.automaticEvaluation||readable.items.length!==automatic.length)fail('BNS_CONTEXT_LINEAGE_UNAVAILABLE');}
  const capability=Object.freeze({});publications.set(capability,{store,core,plan,captured,lineage});lineage=null;return capability;
 }finally{releaseContextLineage(lineage);}
}
export async function requireContextGenerationPublication(t,store,core,plan,capability){
 if(!plan.groups.some(group=>group.type==='contextMutationCommit')){if(capability!==null)fail('BNS_CONTEXT_GROUP_REQUIRED');return;}
 const a=publications.get(capability);if(!a||a.store!==store||a.core!==core||a.plan!==plan)fail('BNS_CONTEXT_GROUP_REQUIRED');requireOwner(a);
 if(!equal(await readContextCards(t),a.captured.row)||await readRestoreEpoch(t)!==a.captured.epoch)fail('BNS_CONTEXT_OWNER_CHANGED');
 if(a.lineage)await fenceContextLineage(store,a.lineage,{transaction:t});
}
export function releaseContextGenerationPublication(capability){const a=publications.get(capability);if(a){releaseContextLineage(a.lineage);publications.delete(capability);}}
