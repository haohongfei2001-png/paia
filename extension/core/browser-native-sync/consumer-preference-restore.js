import {requireOriginalSourcePurgeConsumerApplication,validateSourcePurgeConsumerStage} from './source-purge-group.js';
import {sourcePurgeProtocolControls} from './source-purge-protocol-controls.js';
import {defaults} from '../workspace.js';
import {CONSUMER_PREFERENCE_KEYS,assertConsumerPreferenceOperation,consumerPreferenceRenderingValue} from './consumer-preference-codec.js';
import {clone,equal,exact,hash,opaque,count} from './value.js';
import {ArchiveError,CONSENT_VERSION} from '../constants.js';
const fail=code=>{throw new ArchiveError(code);};
import {assertGroupedCheckpointManifest} from './group-checkpoint-manifest.js';
import {assertProtocolObjectReference,protocolObject,SEGMENT_PROFILE} from './segments.js';
import {bytes} from './value.js';
import {protocolPhysicalId} from './physical-key.js';
import {requireOriginalGroupCheckpointPlan,originalGroupCheckpointCore} from './group-checkpoint-plan.js';
const applications=new WeakMap();
export const CONSUMER_OWNER_PREFIX='consumer-preference-owner:';
const rowId=id=>CONSUMER_OWNER_PREFIX+id;

// Final, admitted heads only. Historical operations are replayed by Core with
// origin=remote; their intermediate display values never reach the local SDK.
export function finalConsumerPreferenceOperations(plan){
 if(!plan.heads.some(head=>head.type==='consumerPreference')&&!plan.groups.some(group=>group.type==='consumerPreference'))return [];
 requireOriginalGroupCheckpointPlan(originalGroupCheckpointCore(plan),plan);
 const operations=plan.groups.flatMap(g=>g.operations),result=[];
 for(const head of plan.heads)if(head.type==='consumerPreference'){
  const op=operations.find(op=>op.revisionId===head.revisions[0]);
  if(head.purged||head.revisions.length!==1||!op)fail('BNS_CONSUMER_PREFERENCE_AUTHORITY');
  assertConsumerPreferenceOperation(op);result.push(op);
 }
 return result.sort((a,b)=>a.entityId.localeCompare(b.entityId));
}
export function consumerDisplayPreferences(values){
 const preferences=defaults();for(const value of values)if(value.id!=='smartFilter')preferences[value.id]=consumerPreferenceRenderingValue(value);return preferences;
}
// Only the two validated device-local booleans are excluded from portable intent.
// All other fields, including unsupported local authority, remain exact. The
// original control publication fence and saveControl preserve the latest local values.
export function consumerPreferencesMatchLocal(actual,expected){
 if(typeof actual?.hideContentPreviews!=='boolean'||typeof actual?.sidebarCollapsed!=='boolean')return false;
 return equal({...actual,hideContentPreviews:false,sidebarCollapsed:false},expected);
}
export async function requireConsumerPreferenceOwners(t,store,core,operations){
 const control=await store.control(t),values=operations.map(op=>op.value),filter=await t.get('meta','smart-filter');
 if(!consumerPreferencesMatchLocal(control.preferences,consumerDisplayPreferences(values)))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
 const mode=values.find(v=>v.id==='smartFilter');if(filter?.mode!==(mode?consumerPreferenceRenderingValue(mode):'light')||!Number.isSafeInteger(filter.policyEpoch)||filter.policyEpoch<0||!mode&&filter.policyEpoch!==0)fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
 const result=[];for(const key of CONSUMER_PREFERENCE_KEYS){
  const row=await t.get('meta',rowId(key)),operation=operations.find(op=>op.entityId===key);
  if(!operation){if(row)fail('BNS_GROUP_CANONICAL_UNREPRESENTED');continue;}
  const head=await core.get(t,'head','consumerPreference',key),proof=await core.materializedOwner(t,'consumerPreference',key);
  if(!exact(row,['id','version','revision','intent'])||Object.keys(row).length!==4||row.id!==rowId(key)||row.version!==1||!Number.isSafeInteger(row.revision)||row.revision<1||!equal(row.intent,operation.value)||head?.purged||!equal(head?.revisions,[operation.revisionId])||proof?.ownerRevision!==row.revision||!equal(proof.operation,operation))fail('BNS_GROUP_COMMIT_UNPROVEN');result.push(clone(row.intent));
 }
 return result.sort((a,b)=>a.id.localeCompare(b.id));
}
export async function prepareRestoredConsumerPreferenceApplication(store,core,plan,stageCore,state){
 requireOriginalGroupCheckpointPlan(core,plan);
 if(core.repository!==store.repository||core.fixedNamespace!==state.replayId||stageCore.repository!==core.repository||stageCore.datasetId!==core.datasetId||!opaque(stageCore.fixedNamespace)||stageCore.fixedNamespace===core.fixedNamespace||state.id!==protocolPhysicalId(core.prefix,stageCore.fixedNamespace,'restore',[])||state.phase!=='validated'||state.graphDigest!==plan.digest)fail('BNS_GROUP_STAGE_CHANGED');
 await validateImportedConsumerStage(state,core);
 const token=Object.freeze({});applications.set(token,{store,core,plan,stageCore,state:clone(state),operations:finalConsumerPreferenceOperations(plan)});return token;
}
export async function prepareSourcePurgeConsumerApplication(store,core,plan,authority){
 requireOriginalGroupCheckpointPlan(core,plan);
 const held=requireOriginalSourcePurgeConsumerApplication(authority,core,plan);
 if(held.store!==store||held.state.version!==2||held.state.phase!=='validated')fail('BNS_GROUP_STAGE_CHANGED');
 await validateImportedConsumerStage(held.state,core,3);
 const token=Object.freeze({});applications.set(token,{store,core,plan,state:clone(held.state),negative:authority,operations:finalConsumerPreferenceOperations(plan).filter(op=>held.revisionIds.includes(op.revisionId))});return token;
}
export async function applyRestoredConsumerPreferenceOwners(t,token){
 const prepared=applications.get(token);if(!prepared)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
 const {store,core,plan,stageCore,state,operations}=prepared;requireOriginalGroupCheckpointPlan(core,plan);
 if(prepared.negative)requireOriginalSourcePurgeConsumerApplication(prepared.negative,core,plan);
 if(!equal(await t.get('meta',state.id),state)||core.repository!==store.repository||(prepared.negative?await core.bind(t)!==state.namespace:core.fixedNamespace!==state.replayId))fail('BNS_GROUP_STAGE_CHANGED');
 return applyConsumerRows(t,store,core,operations);
}
async function applyConsumerRows(t,store,core,operations){
 if(!operations.length)return null;
 if(!store.consumerPreferenceJournal||store.consumerPreferenceJournal.core.repository!==core.repository||store.consumerPreferenceJournal.core.datasetId!==core.datasetId)fail('BNS_CONSUMER_PREFERENCE_OWNER_REQUIRED');
 await store.qualifyControlPublicationRead(t);
 const control=await store.control(t),before=[],display=[];
 for(const operation of operations){
  assertConsumerPreferenceOperation(operation);const id=operation.entityId;
  if(await t.get('meta',rowId(id)))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
  const head=await core.get(t,'head','consumerPreference',id),outbox=await core.get(t,'outbox',operation.operationId);
  if(head?.purged||!equal(head?.revisions,[operation.revisionId])||outbox)fail('BNS_GROUP_COMMIT_UNPROVEN');
  const value=consumerPreferenceRenderingValue(operation.value);
  if(id==='smartFilter'){
   const filter=await t.get('meta','smart-filter');if(filter?.phase!=='active'||!Number.isSafeInteger(filter.policyEpoch)||filter.policyEpoch<0)fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
   if(filter.mode!==value){if(filter.policyEpoch===Number.MAX_SAFE_INTEGER)fail('BNS_VALUE_LIMIT');await t.put('meta',{...filter,mode:value,policyEpoch:filter.policyEpoch+1});}
  }else{before.push({id,value:control.preferences[id]});control.preferences[id]=value;display.push(operation);}
  await t.put('meta',{id:rowId(id),version:1,revision:1,intent:clone(operation.value)});await core.recordMaterializedOwner(t,operation,1);
 }
 if(display.length)await store.saveControl(t,control);
 const ref=op=>({entityId:op.entityId,operationId:op.operationId,revisionId:op.revisionId}),filter=await t.get('meta','smart-filter');
 return {before,operations:display.map(ref),allOperations:operations.map(ref),smartFilter:{mode:filter.mode,policyEpoch:filter.policyEpoch}};
}

// Detached prediction shares the original value writer. It cannot receive a
// native transaction: the original physical planner supplies an isolated facade.
export async function projectSourcePurgeConsumerRows(token,t,store,core){
 const p=applications.get(token);if(!p?.negative||store.repository!==p.store.repository||core!==p.core||t.tx?.objectStore)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
 requireOriginalSourcePurgeConsumerApplication(p.negative,p.core,p.plan);
 return applyConsumerRows(t,store,core,p.operations);
}

// Separate imported role: never interpret an absent outbox as a local write.
// Its exact original durable stage/active pointer must remain publishing until
// the one original control publication is verified and atomically settled.
export async function requireImportedConsumerPublication(t,core,pending){
 const ref=pending.restore,negative=pending.version===3;
 if(!exact(ref,['stageId','manifestId','graphDigest','replayId','operations','smartFilter'])||Object.keys(ref).length!==6||!hash(ref.manifestId)||!hash(ref.graphDigest)||ref.replayId!==pending.namespace||typeof ref.stageId!=='string'||!ref.stageId.startsWith(core.prefix+'generation:')||!(negative?ref.stageId.endsWith(':sourcePurgeRestore:'):ref.stageId.endsWith(':restore:')))fail('BNS_CONSUMER_PUBLICATION_PENDING');
 const stage=await t.get('meta',ref.stageId),active=await t.get('meta',core.prefix+'active');
 if(negative){
  sourcePurgeProtocolControls(core,[stage],ref.replayId);
  if(stage.version!==2||stage.databaseId!==pending.databaseId||stage.namespace!==ref.replayId||stage.phase!=='publishing'||stage.manifestRef.id!==ref.manifestId||stage.portableDigest!==ref.graphDigest||stage.epoch!==((await t.get('meta','recovery-restore-epoch'))?.value??null))fail('BNS_CONSUMER_PUBLICATION_PENDING');
 }else if(!stage||stage.id!==ref.stageId||stage.phase!=='publishing'||stage.manifestId!==ref.manifestId||stage.graphDigest!==ref.graphDigest||stage.replayId!==ref.replayId||stage.received!==stage.manifest?.itemCount||!equal(active,{id:core.prefix+'active',namespace:ref.replayId,manifestId:ref.manifestId,graphDigest:ref.graphDigest})||(await t.get('meta','recovery-restore-epoch'))?.value!==stage.base?.fence?.epoch&&!(stage.base?.fence?.epoch===null&&(await t.get('meta','recovery-restore-epoch'))===undefined))fail('BNS_CONSUMER_PUBLICATION_PENDING');
 const refs=ref.operations;if(!Array.isArray(refs)||refs.length<1||refs.length>7||new Set(refs.map(x=>x?.entityId)).size!==refs.length||refs.some(x=>!exact(x,['entityId','operationId','revisionId'])||Object.keys(x).length!==3||!CONSUMER_PREFERENCE_KEYS.includes(x.entityId)||!hash(x.revisionId))||!equal(pending.operations,refs.filter(x=>x.entityId!=='smartFilter')))fail('BNS_CONSUMER_PUBLICATION_PENDING');
 for(const item of refs){const revision=await core.get(t,'revision',item.revisionId),receipt=await core.get(t,'receipt',item.operationId),head=await core.get(t,'head','consumerPreference',item.entityId),proof=await core.materializedOwner(t,'consumerPreference',item.entityId),owner=await t.get('meta',rowId(item.entityId));
  if(!revision?.operation||revision.operation.type!=='consumerPreference'||revision.operation.entityId!==item.entityId||revision.operation.operationId!==item.operationId||await core.get(t,'outbox',item.operationId)||!receipt||receipt.digest!==item.revisionId||receipt.deviceId!==revision.operation.deviceId||receipt.sequence!==revision.operation.sequence||head?.purged||!equal(head?.revisions,[item.revisionId])||!exact(owner,['id','version','revision','intent'])||Object.keys(owner).length!==4||owner.version!==1||!Number.isSafeInteger(owner.revision)||owner.revision<1||!equal(owner.intent,revision.operation.value)||proof?.ownerRevision!==owner.revision||proof?.operation.revisionId!==item.revisionId)fail('BNS_CONSUMER_PUBLICATION_PENDING');
 }
 const filter=await t.get('meta','smart-filter'),modeRef=refs.find(x=>x.entityId==='smartFilter'),modeOp=modeRef&&(await core.get(t,'revision',modeRef.revisionId)).operation;
 if(!exact(ref.smartFilter,['mode','policyEpoch'])||Object.keys(ref.smartFilter).length!==2||!Number.isSafeInteger(ref.smartFilter.policyEpoch)||ref.smartFilter.policyEpoch<0||!equal(ref.smartFilter,{mode:filter?.mode,policyEpoch:filter?.policyEpoch})||filter.mode!==(modeOp?consumerPreferenceRenderingValue(modeOp.value):'light'))fail('BNS_CONSUMER_PUBLICATION_PENDING');
 return stage;
}
// Crypto and immutable re-encoding stay outside every original IDB transaction.
export async function validateImportedConsumerStage(stage,core,role=2,revisions=null){
 if(role===3){sourcePurgeProtocolControls(core,[stage],stage.namespace);if(stage.version!==2||!['validated','publishing'].includes(stage.phase))fail('BNS_CONSUMER_PUBLICATION_PENDING');const encoded=await protocolObject('checkpoint-manifest',bytes(stage.manifest),{profile:SEGMENT_PROFILE});if(!equal(encoded.ref,stage.manifestRef))fail('BNS_OBJECT_INTEGRITY');if(stage.phase==='publishing')await validateSourcePurgeConsumerStage(core,stage,revisions);return;}
 if(role!==2)fail('BNS_CONSUMER_PUBLICATION_PENDING');
 const base=stage?.base,fence=base?.fence,settings=base?.settings;
 if(!exact(stage,['id','manifestId','manifestRef','manifest','phase','base','replayId','received','graphDigest'])||Object.keys(stage).length!==9||!['validated','publishing'].includes(stage.phase)||!hash(stage.manifestId)||!hash(stage.graphDigest)||!opaque(stage.replayId)||!count(stage.received)||stage.received!==stage.manifest?.itemCount||!exact(base,['namespace','generation','ownerGeneration','fence','settings'])||Object.keys(base).length!==5||!(base.namespace==='initial'||opaque(base.namespace))||base.namespace===stage.replayId||!count(base.generation)||!count(base.ownerGeneration)||!exact(fence,['epoch','namespace','marker'])||Object.keys(fence).length!==3||fence.namespace!==base.namespace||!(fence.epoch===null||opaque(fence.epoch))||typeof fence.marker!=='boolean'||!exact(settings,['consentVersion','consentAt','enabled','epoch'])||Object.keys(settings).length!==4||settings.enabled!==true||settings.consentVersion!==CONSENT_VERSION||!count(settings.epoch)||!Number.isFinite(Date.parse(settings.consentAt)))fail('BNS_CONSUMER_PUBLICATION_PENDING');
 assertGroupedCheckpointManifest(stage.manifest,{core});assertProtocolObjectReference(stage.manifestRef);
 if(stage.manifestRef.kind!=='checkpoint-manifest'||stage.manifestRef.codec!=='identity')fail('BNS_CONSUMER_PUBLICATION_PENDING');
 const encoded=await protocolObject('checkpoint-manifest',bytes(stage.manifest),{profile:SEGMENT_PROFILE});
 if(encoded.ref.id!==stage.manifestId||!equal(encoded.ref,stage.manifestRef))fail('BNS_OBJECT_INTEGRITY');
}
