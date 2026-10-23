import {contextMutationItemAtEpoch,assertContextMutationPhysicalShape} from './context-mutation-codec.js';
import {CONTEXT_CARDS_ROW,validContextCards} from '../context-cards.js';
import {assertManualContextCurrentPhysicalShape} from './manual-context-current-shape.js';
import {assertContextManualOperationTransition} from './context-journal.js';
import {assertContextDesiredOperationTransition} from './context-desired-journal-owner.js';
import {protocolPhysicalId} from './physical-key.js';
import {deltaDescription,deltaSignature,KNOWN_PREFIX,DIRTY_PREFIX} from '../ai-usage/delta.js';
import {equal,fail,count} from './value.js';

// Pure manual-family assertion. This neither captures native data nor mints a
// Scope. Only the original branded Group/native owner calls it
// after paying its physical/expected/Plan/proof and simultaneous scratch phases.
const types={contextItem:'info',contextRulesItem:'rules',contextNowItem:'now'};
const desiredKeys=['info','rules','now','inputs'];
const refused=()=>fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
export function hasCurrentContextOperations(plan){
 return plan.groups.some(group=>Object.hasOwn(types,group.type)||group.type==='contextDesired'||group.type==='contextMutationCommit');
}
export function assertCurrentContextSnapshot(core,scope,plan,raw,rows){
 const physical=rows.get(CONTEXT_CARDS_ROW);if(!physical)refused();
 const typed=plan.groups.some(group=>group.type==='contextMutationCommit');
 if(typed)assertContextMutationPhysicalShape(physical);else assertManualContextCurrentPhysicalShape(physical);if(!validContextCards(physical))refused();
 if(!Array.isArray(scope.expected.context)||!Array.isArray(scope.expected.desired))refused();
 const operations=plan.groups.flatMap(group=>group.operations);
 const key=(kind,...parts)=>protocolPhysicalId(core.prefix,raw.namespace,kind,parts);
 const take=(id,expected)=>{const row=rows.get(id);if(!row||!equal(row,{...expected,id}))fail('BNS_GROUP_COMMIT_UNPROVEN');rows.delete(id);};
 const epoch=raw.points['recovery-restore-epoch']?.value??null;
 if(typed||plan.groups.some(group=>group.type==='contextDesired')){
  const markerId=key('ownerRecoveryEpoch'),marker=raw.groupMeta.find(row=>row.id===markerId);
  if(!marker||!equal(marker,{id:markerId,version:1,epoch}))fail('BNS_RESTORE_EPOCH_CHANGED');
 }
 // The original compiler independently validates complete envelope/digest,
 // parent identity and causal order. Repeat each actual family transition;
 // optional older local anchors never shorten this complete history check.
 for(const op of operations){
  if(Object.hasOwn(types,op.type)){
   if(op.parents.length>1)fail('BNS_CONTEXT_CONFLICT_UNSUPPORTED');
   const parent=op.parents.length?operations.find(value=>value.revisionId===op.parents[0]):null;
   if(op.parents.length&&(!parent||parent.type!==op.type||parent.entityId!==op.entityId))fail('BNS_GROUP_CAUSAL_GAP');
   assertContextManualOperationTransition(op,parent);
  }else if(op.type==='contextDesired'){
   const parents=op.parents.map(id=>operations.find(value=>value.revisionId===id));
   assertContextDesiredOperationTransition(op,parents);
  }
 }
 const typedHeads=plan.heads.filter(head=>head.type==='contextMutationMember');
 const oldHeads=plan.heads.filter(head=>Object.hasOwn(types,head.type));
 for(const head of oldHeads.filter(head=>typedHeads.some(value=>value.entityId===head.entityId))){
  const latest=typedHeads.find(value=>value.entityId===head.entityId);let operation=operations.find(op=>op.revisionId===latest.revisions[0]),matched=false;
  for(let n=0;operation&&n<128;n++){const previous=operation.value.previous;if(previous?.type===head.type&&previous.entityId===head.entityId&&head.revisions.length===1&&previous.revisionId===head.revisions[0]){matched=true;break;}operation=previous?.type==='contextMutationMember'?operations.find(op=>op.revisionId===previous.revisionId):null;}
  if(!matched)fail('BNS_CONTEXT_ANCESTRY_REQUIRED');
  const proofId=key('materializedOwner',head.type,head.entityId),validationId=key('contextValidation',head.type,head.entityId),proof=rows.get(proofId),validation=rows.get(validationId);
  if(proof||validation){const anchor=proof&&operations.find(op=>op.revisionId===proof.revisionId);if(!anchor||anchor.type!==head.type||anchor.entityId!==head.entityId)fail('BNS_OWNER_PROOF_INVALID');take(proofId,{version:1,revisionId:anchor.revisionId,ownerRevision:anchor.value.revision});take(validationId,{version:1,epoch,revisionId:anchor.revisionId});}
 }
 const itemHeads=[...oldHeads.filter(head=>!typedHeads.some(value=>value.entityId===head.entityId)),...typedHeads];
 if(typed){
  take(key('contextMutationState'),{version:1,sequence:physical.sequence});
  for(const group of plan.groups.filter(group=>group.type==='contextMutationCommit')){const op=group.prepared.descriptor,d=op.value;if(d.command.kind==='bootstrap')continue;take(key('contextMutationCommand',d.domainOperationId),{version:1,revisionId:op.revisionId,receipt:{id:'context:'+d.domainOperationId,namespace:'context-cards',schemaVersion:1,ownerId:d.command.itemId,digest:d.requestDigest,epoch:d.command.epoch,result:d.result}});}
 }

 if(itemHeads.length!==physical.items.length||scope.expected.context.length!==physical.items.length)refused();
 for(const head of itemHeads){
  if(head.purged||head.revisions.length!==1)fail('BNS_GROUP_COMMIT_UNPROVEN');
  const operation=operations.find(op=>op.revisionId===head.revisions[0]);
  const item=physical.items.find(value=>value.id===head.entityId),expected=scope.expected.context.find(value=>value.id===head.entityId);
  const isTyped=head.type==='contextMutationMember',wire=operation&&(isTyped?operation.value.item:operation.value);
  if(!operation||!item||!expected||(!isTyped&&types[head.type]!==item.card)||!equal(item,isTyped?contextMutationItemAtEpoch(wire,epoch??'initial'):wire)||!equal(item,isTyped?contextMutationItemAtEpoch(expected,epoch??'initial'):expected))refused();
  const proofId=key('materializedOwner',head.type,head.entityId),validationId=key('contextValidation',head.type,head.entityId),proof=rows.get(proofId),validation=rows.get(validationId);
  if(isTyped){take(proofId,{version:1,revisionId:operation.revisionId,ownerRevision:wire.revision});take(key('contextMutationEpoch',head.entityId),{version:1,epoch:epoch??'initial',revisionId:operation.revisionId});if(validation)refused();}
  else if(proof||validation){
   const anchor=proof&&operations.find(op=>op.revisionId===proof.revisionId);
   if(!anchor||anchor.type!==head.type||anchor.entityId!==head.entityId)fail('BNS_OWNER_PROOF_INVALID');
   take(proofId,{version:1,revisionId:anchor.revisionId,ownerRevision:anchor.value.revision});
   take(validationId,{version:1,epoch,revisionId:anchor.revisionId});
  }
  const descriptor=deltaDescription('context_item',item),knownId=KNOWN_PREFIX+descriptor.key,dirtyId=DIRTY_PREFIX+descriptor.key,known=rows.get(knownId),dirty=rows.get(dirtyId);
  if(!known||!count(known.sequence)||known.sequence<1)refused();
  const base={version:1,descriptor,signature:deltaSignature(descriptor),sequence:known.sequence};
  take(knownId,base);
  if(descriptor.removed){if(dirty)refused();}
  else take(dirtyId,{...base,requirements:[],pendingFacets:['topic','context']});
 }
 if(scope.expected.desired.length!==desiredKeys.length)refused();
 for(const id of desiredKeys){
  const value={id,...physical.access[id]},expected=scope.expected.desired.find(value=>value.id===id),head=plan.heads.find(head=>head.type==='contextDesired'&&head.entityId===id);
  if(!expected||!equal(value,expected))refused();
  if(head){
   if(head.purged||head.revisions.length!==1)fail('BNS_GROUP_COMMIT_UNPROVEN');
   const operation=operations.find(op=>op.revisionId===head.revisions[0]);if(!operation||!equal(operation.value,value))refused();
   take(key('contextDesiredOwner',id),{version:1,epoch,heads:[...head.revisions].sort(),value});
  }else if(value.enabled!==false||value.revision!==0)refused();
 }
 rows.delete(CONTEXT_CARDS_ROW);
}
