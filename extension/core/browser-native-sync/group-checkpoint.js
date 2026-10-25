import {chargeOriginalCheckpointPublicationWork,requireOriginalCheckpointPublicationControls,requireOriginalCheckpointPublicationCleanup} from './checkpoint-publication.js';
import {sourceUnionPublicationGroups,requireSourceUnionPublicationPhysical,requireSourceUnionWorkingFilter} from './source-union-publication-continuation.js';
import {flushNavigationWrites} from '../archive-navigation-invalidation.js';
import {flushSemanticWrites} from '../ai-usage/delta.js';
import {decideLight,FILTER_VERSIONS} from '../smart-filter.js';
import {requireSourcePurgeProtocolControlReceipts} from './source-purge-protocol-controls.js';
import {protocolPhysicalId} from './physical-key.js';
import {prepareStoredSourceBootstrapUnion,readSourceBootstrapUnionProof,requireSourceBootstrapUnionProof,assertSourceBootstrapUnionSelection} from './source-bootstrap-union.js';
import {prepareContextGroupApplication,applyContextGroupStep,prepareContextGenerationPublication,requireContextGenerationPublication,releaseContextGenerationPublication} from './context-mutation-group.js';
import {requireResolvedPromptReplayConflict} from './resolved-prompt-replay.js';
import {observeOriginalControlPublication,requireOriginalControlObservation} from '../indexed-store.js';
import {buildSourcePurgeGroupedCheckpoint,SourcePurgeGroupedCheckpointRestore,hasSourcePurgeDispatchCut,requireSourcePurgeDispatchCut} from './source-purge-group.js';
import {prepareMixedNonemptyMerge,prepareMixedNonemptyResult,requireMixedNonemptyBase,sealMixedNonemptyResult} from './mixed-nonempty-merge.js';
import {prepareSourceWorkingMerge,prepareSourceWorkingMergeResult,requireSourceWorkingMergeBase,requireSourceWorkingMergeResult,sealSourceWorkingMerge} from './source-working-merge.js';
import {requireOriginalLibraryDocumentsGenerationMethods} from '../library-documents-owner.js';
import {requireNoSourcePurgeDeny} from './source-purge-journal.js';
import {equalSourceWorkingPhysicalTree,measureSourceWorkingPhysicalTree} from './source-working-physical.js';
import {readCanonicalCheckpointProof,requireCanonicalCheckpointProof,requireCanonicalCheckpointInputProof} from './canonical-generation-checkpoint-stage.js';
import {prepareSavedWorkGroupApplication,applySavedWorkGroupStep,sealSavedWorkGroupActivation,prepareSavedWorkReceive,commitSavedWorkEdit,sealSavedWorkCurrentScope,sealSavedWorkMergeProgress,prepareSavedMixedRetention,sealSavedMixedRetention} from './saved-work-bootstrap.js';
import {groupOperationPages,createGroupPageBudget,chargeGroupPageValue,checkGroupPageBudget,readGroupRows} from './group-page-reader.js';
import {captureSourceWorkingCurrentGroupProjection,requireSourceWorkingCurrentGroupProjection,encodeSourceWorkingCurrentGroupCheckpoint,publishSourceWorkingCurrentGroupCheckpoint,captureMixedCurrentGroupProjection,requireMixedCurrentGroupProjection,encodeMixedCurrentGroupCheckpoint,publishMixedCurrentGroupCheckpoint,releaseHumanCurrentUnindexedProjection} from './human-library-plan.js';
import {InputWorkingCommitReceiver,prepareWorkingApplication,releaseOriginalWorkingApplication} from './input-working-commit.js';
import {prepareHumanGroupApplication,prepareHumanIncrementalGroupApplication,requireHumanGroupApplication,applyHumanGroupStep,sealHumanWorkingGroupApplication} from './human-library-group.js';
import {FilterIntentSyncJournal,prepareRestoredFilterSources,prepareFilterApplication} from './filter-intent-journal.js';
import {manualSyncOwners} from './manual-owners.js';
import {contextDesiredMaterializer} from './context-desired-journal-owner.js';
import {BrowserNativeSyncCore,requireOriginalGenerationCoreMethods,acceptSequence,CORE_LIMITS} from './core.js';
import {buildCheckpoint,checkpointItems} from './checkpoints.js';
import {protocolObject,readObject,SEGMENT_PROFILE,assertProtocolObjectReference} from './segments.js';
import {prepareGroupCheckpointPlan} from './group-checkpoint-plan.js';
import {prepareGroupScope,requireGroupScope,prepareGroupCurrentProjection,requireGroupCurrentProjection,encodeGroupCurrentProjection,publishGroupCurrentProjection,releaseGroupCurrentProjection} from './group-checkpoint-scope.js';
import {prepareBootstrapApplication,applyBootstrapApplication} from './source-bootstrap-receive.js';
import {prepareAppendApplication,applyAppendApplication} from './source-append-receive.js';
import {JournalRestoreFence,readRestoreEpoch,preparePromptBindingReplay} from './prompt-journal.js';
import {ArchiveError,CONSENT_VERSION} from '../constants.js';
import {bytes,clone,decodeJSON,digest,equal,exact,fail,hash,opaque,SyncError} from './value.js';
import {assertGroupedCheckpointManifest} from './group-checkpoint-manifest.js';
import {observeRepositoryWriteFence,requireRepositoryWriteFence,currentOriginalRecoveryWork,chargeOriginalRecoveryWork,checkOriginalRecoveryWork,originalGenerationRepositoryTransaction,requireRepositoryTransactionDataMethods,awaitRepositoryTransactionSettled,requireRepositoryCommittedIdentity,registerRepositoryWorkLimit,registerRepositoryFinalReadFence} from '../idb-repository.js';
import {finalConsumerPreferenceOperations,prepareRestoredConsumerPreferenceApplication,applyRestoredConsumerPreferenceOwners} from './consumer-preference-restore.js';
import {CONSUMER_PUBLICATION_PENDING_ID,requireConsumerPublicationSettled} from './consumer-publication-state.js';
import {sealManualMergeTransaction} from './manual-merge-terminal.js';
import {topicDesiredMaterializer} from './topic-desired-journal.js';
const own=(x,keys)=>exact(x,keys)&&Object.keys(x).length===keys.length;
const withoutId=({id,...row})=>row;
const sourceUnionProofs=new WeakMap(),sourceUnionPublicationCuts=new WeakMap(),sourceUnionPublicationCleanup=new WeakMap();
const canonicalGenerationStates=new WeakMap(),canonicalGenerationProofs=new WeakMap(),canonicalGenerationPublications=new WeakMap(),canonicalGenerationBindings=new WeakMap();
function originalGenerationBinding(restore){const b=canonicalGenerationBindings.get(restore);if(!b||['store','live','stage','restoreId'].some(key=>Object.getOwnPropertyDescriptor(restore,key)?.value!==b[key]))fail('BNS_GENERATION_PROOF_REQUIRED');return b;}
const generationRepositoryAuthorities=new WeakMap(),generationStorageChecks=new WeakMap(),defaultCheckpoint=async()=>{};
export function readOriginalGroupGenerationRepositoryAuthority(token,repository,scope){
 const r=generationRepositoryAuthorities.get(token);if(!r)return null;const b=originalGenerationBinding(r.restore);
 if(b.store.repository!==repository||b.live.repository!==repository||b.stage.repository!==repository||b.live.prefix!==r.livePrefix||b.stage.prefix!==r.stagePrefix||b.stage.fixedNamespace!==r.namespace||Object.getOwnPropertyDescriptor(r.restore,'checkpoint')?.value!==r.checkpoint||scope!==null&&r.scope!==null&&r.scope!==scope)fail('GENERATION_REPOSITORY_WRITE_DENIED');
 if(scope!==null){requireOriginalLibraryDocumentsGenerationMethods(b.store);requireOriginalGenerationCoreMethods(b.live);requireOriginalGenerationCoreMethods(b.stage);if(r.scope===null)r.scope=scope;}return r.authority;
}
async function generationTerminal(restore,t){
 // The original delta owner alone appends rebuildable body-free scheduling
 // metadata. Canonical data, protocol receipts and all other metadata close.
 if(t.navigationChanges?.size)fail('BNS_GENERATION_TARGET_NOT_EMPTY');
 const {store}=originalGenerationBinding(restore),snapshots=[],ranges=[IDBKeyRange.upperBound('aiu:delta:',true),IDBKeyRange.lowerBound('aiu:delta:\uffff',true)];
 for(const table of t.tx.objectStoreNames){
  const rows=[];let after=null;
  do{const page=await t.primaryRangePage(table,{after,limit:64});for(const row of page.rows){if(table==='meta'&&typeof row.key==='string'&&row.key.startsWith('aiu:delta:'))continue;let value=clone(row.value);if(table==='meta'&&row.key==='backup-data-generation'&&t.backupChanged)value={...value,value:value.value+1};rows.push([row.key,value]);}after=page.next;}while(after);
  if(table==='meta')requireGenerationStorageBudgets(restore,t,rows);
  const counts=table==='meta'?ranges.map(key=>({key,count:rows.filter(([id])=>key.includes(id)).length})):[{count:await t.count(table)}];snapshots.push({table,counts,rows});
 }
 registerRepositoryFinalReadFence(store.repository,t,{isCurrent:()=>{originalGenerationBinding(restore);return true;},plan:function*(){for(const {table,counts,rows}of snapshots){for(const {key,count}of counts)if((yield {method:'count',table,...(key?{key}:{})})!==count)throw new ArchiveError('BNS_RESTORE_STAGE_CHANGED');for(const [key,value]of rows)if(!equalSourceWorkingPhysicalTree(yield {method:'get',table,key},value))throw new ArchiveError('BNS_RESTORE_STAGE_CHANGED');}return true;}});
}
async function generationTransaction(restore,kind,fn,stores){
 const b=originalGenerationBinding(restore),token=Object.freeze(Object.create(null));let semantic,scope;
 generationRepositoryAuthorities.set(token,{restore,scope:null,livePrefix:b.live.prefix,stagePrefix:b.stage.prefix,namespace:b.stage.fixedNamespace,checkpoint:Object.getOwnPropertyDescriptor(restore,'checkpoint')?.value,authority:Object.freeze({kind:Object.getOwnPropertyDescriptor(restore,'checkpoint')?.value===defaultCheckpoint?kind:'group-debug',prefix:b.stage.prefix+'generation:'+b.stage.fixedNamespace+':'})});
 try{return await originalGenerationRepositoryTransaction(b.store.repository,token,async t=>{scope=t;registerRepositoryWorkLimit(b.store.repository,t);requireRepositoryTransactionDataMethods(b.store.repository,t);const authority=generationRepositoryAuthorities.get(token);if(authority.scope===t&&authority.checkpoint===defaultCheckpoint&&['group-stage','group-apply'].includes(kind))generationStorageChecks.set(t,{restore,stage:b.stage,token,kind,checks:[]});try{const result=await fn(t);await generationTerminal(restore,t);return result;}catch(e){if(e instanceof SyncError)semantic=e;throw e;}},stores);}catch(e){throw semantic??e;}finally{generationStorageChecks.delete(scope);generationRepositoryAuthorities.delete(token);}
}
async function authority(store,core,t){const c=await store.control(t);if(!c.settings.enabled||c.settings.consentVersion!==CONSENT_VERSION)fail('BNS_GROUP_PERMISSION');return{namespace:await core.bind(t),generation:(await core.get(t,'generation'))?.value||0,ownerGeneration:(await t.get('meta','backup-data-generation'))?.value||0,fence:await new JournalRestoreFence(core).snapshot(t),settings:c.settings};}
function chargeRecoveryValue(core,value,physical=false){const ticket=currentOriginalRecoveryWork(core.repository);if(ticket)chargeOriginalRecoveryWork(core.repository,ticket,physical?measureSourceWorkingPhysicalTree(value).B:bytes(value).length);}
async function allOperations(core){const operations=[],budget=createGroupPageBudget();for await(const row of core.rows('revision')){if(row.redacted)fail('BNS_GROUP_OWNER_UNSUPPORTED');chargeGroupPageValue(budget,row.operation);chargeRecoveryValue(core,row.operation);operations.push(row.operation);}checkGroupPageBudget(budget);return operations;}
async function stageItems(stage){return stage.transaction(false,async t=>(await readGroupRows(t,'meta',{prefix:await stage.idIn(t,'groupItem')})).map(row=>{chargeRecoveryValue(stage,row,true);return row.item;}),['meta']);}
async function requireCommittedPlan(core,t,plan){
 const operations=plan.groups.flatMap(group=>group.operations);
 for(const op of operations){
  const revision=await core.get(t,'revision',op.revisionId),receipt=await core.get(t,'receipt',op.operationId),sequence=await core.get(t,'sequence',op.deviceId,String(op.sequence).padStart(16,'0'));
  if(!revision||revision.redacted||!equal(revision.operation,op)||!receipt||!equal(withoutId(receipt),{digest:op.revisionId,deviceId:op.deviceId,sequence:op.sequence})||!sequence||!equal(withoutId(sequence),{operationId:op.operationId,digest:op.revisionId}))fail('BNS_GROUP_COMMIT_UNPROVEN');
 }
 const heads=(await readGroupRows(t,'meta',{prefix:await core.idIn(t,'head')})).map(withoutId);
 heads.sort((a,b)=>JSON.stringify([a.type,a.entityId]).localeCompare(JSON.stringify([b.type,b.entityId])));
 if(!equal(heads,plan.heads))fail('BNS_GROUP_COMMIT_UNPROVEN');
}
// Private, opt-in proof from the original final committed cut. It is never
// accepted from an RPC or caller-created snapshot. Assertion is synchronous so
// a provider can call it in the exact frame that dispatches its HTTP request.
const checkpointDispatchCuts=new WeakMap();
export function requireGroupedCheckpointDispatchCut(core,store,result){
 if(hasSourcePurgeDispatchCut(result))return requireSourcePurgeDispatchCut(core,store,result);
 const proof=checkpointDispatchCuts.get(result);
 if(!proof||proof.core!==core||proof.store!==store||store.repository!==core.repository||store.tail!==proof.tail)fail('BNS_SNAPSHOT_CHANGED');
 requireOriginalGenerationCoreMethods(core);requireOriginalLibraryDocumentsGenerationMethods(store);requireOriginalControlObservation(store,proof.observation);if(proof.union){chargeOriginalCheckpointPublicationWork(proof.union.work,core,store,undefined,0);requireRepositoryWriteFence(core.repository,proof.union.fence);}return true;
}
async function buildCurrentSourceWorkingCheckpoint(core,transport,store,profile,parents,mixed=false){
 let cap;
 try{
  cap=mixed?await captureMixedCurrentGroupProjection(store,core):await captureSourceWorkingCurrentGroupProjection(store,core);
  const requireCut=mixed?requireMixedCurrentGroupProjection:requireSourceWorkingCurrentGroupProjection;
  await requireCut(cap);
  const checkpoint=mixed?await encodeMixedCurrentGroupCheckpoint(cap,transport,{profile,parents}):await encodeSourceWorkingCurrentGroupCheckpoint(cap,transport,{profile,parents});
  await requireCut(cap);
  const published=mixed?await publishMixedCurrentGroupCheckpoint(cap,checkpoint,transport,{profile}):await publishSourceWorkingCurrentGroupCheckpoint(cap,checkpoint,transport,{profile});
  // Immutable publication may overlap a genuine local edit. Advertise only an
  // unchanged full37-store/49-index cut after its true native read has drained.
  await requireCut(cap);
  return {ref:published.ref,manifest:published.manifest,cut:checkpoint.cut};
 }catch(error){if(error?.code==='BNS_HUMAN_CHANGED')fail('BNS_SNAPSHOT_CHANGED');throw error;}
 finally{if(cap)releaseHumanCurrentUnindexedProjection(cap);}
}
export async function buildGroupedCheckpoint(core,transport,{store,profile=SEGMENT_PROFILE,parents=[],currentHumanProjection=false,currentSourceWorkingProjection=false,currentMixedProjection=false,sourcePurgeProjection=false,dispatchQualification=false,publicationWork=null,publicationFinalCut=false}={}){
 if(typeof publicationFinalCut!=='boolean'||publicationFinalCut&&!publicationWork)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');let union=publicationWork?sourceUnionPublicationCuts.get(publicationWork):null;if(publicationWork)chargeOriginalCheckpointPublicationWork(publicationWork,core,store,undefined,0);if(union&&[currentHumanProjection,currentSourceWorkingProjection,currentMixedProjection,sourcePurgeProjection].some(value=>value!==false))fail('BNS_SOURCE_UNION_PROOF_REQUIRED');
 if(typeof dispatchQualification!=='boolean'||dispatchQualification&&[currentHumanProjection,currentSourceWorkingProjection,currentMixedProjection].some(value=>value!==false))fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
 if(typeof sourcePurgeProjection!=='boolean')fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
 if(sourcePurgeProjection){if([currentHumanProjection,currentSourceWorkingProjection,currentMixedProjection].some(value=>value!==false))fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');return buildSourcePurgeGroupedCheckpoint(core,transport,{store,profile,parents,dispatchQualification});}
 if([currentHumanProjection,currentSourceWorkingProjection,currentMixedProjection].some(value=>typeof value!=='boolean')||Number(currentHumanProjection)+Number(currentSourceWorkingProjection)+Number(currentMixedProjection)>1)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
 if(currentMixedProjection)return buildCurrentSourceWorkingCheckpoint(core,transport,store,profile,parents,true);
 if(currentSourceWorkingProjection)return buildCurrentSourceWorkingCheckpoint(core,transport,store,profile,parents);
 if(store?.repository!==core.repository)fail('BNS_GROUP_BINDING');await store.finishFoundation();
 const cut=await store.run(()=>core.transaction(false,t=>authority(store,core,t))),plan=await prepareGroupCheckpointPlan(core,await allOperations(core)),scope=await prepareGroupScope(plan,{store});
 let dispatchProof=null,contextPublication=null;
 if(publicationWork){chargeOriginalCheckpointPublicationWork(publicationWork,core,store,undefined,0);const active=await core.transaction(false,t=>t.get('meta',core.prefix+'active'));chargeOriginalCheckpointPublicationWork(publicationWork,core,store,active);if(active?.selection?.kind==='source-bootstrap-union'){if(!union||union.core!==core||union.store!==store)fail('BNS_SOURCE_UNION_PROOF_REQUIRED');}}
 const verifyCut=async(terminal=false)=>{let originalScope,calls=0,observation,unionFence;const check=async()=>{if(dispatchQualification)observation=(await observeOriginalControlPublication(store)).token;return core.transaction(false,async t=>{if(++calls!==1)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');originalScope=t;if(currentHumanProjection)await requireGroupCurrentProjection(store,core,t,scope,plan);else{if(!equal(await authority(store,core,t),cut))fail('BNS_SNAPSHOT_CHANGED');await requireCommittedPlan(core,t,plan);await requireGroupScope(store,t,scope);await requireContextGenerationPublication(t,store,core,plan,contextPublication);}if(union&&(!publicationFinalCut||terminal))unionFence=await requireSourceUnionPublicationCut(publicationWork,union,t,publicationFinalCut&&terminal);});};
  // The native certificate pins the settled Store tail. Direct readonly Core
  // inspection leaves that tail intact; a genuine Store operation invalidates
  // it. Never rebind the tail to accommodate an intervening queued operation.
  if(currentHumanProjection){await check();if(calls!==1)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');await awaitRepositoryTransactionSettled(core.repository,originalScope);requireRepositoryCommittedIdentity(core.repository,originalScope);}else{const pending=store.run(check),tail=store.tail;await pending;if(dispatchQualification){if(store.tail!==tail)fail('BNS_SNAPSHOT_CHANGED');requireOriginalControlObservation(store,observation);dispatchProof={core,store,tail,observation,...(union?{union:{work:publicationWork,fence:unionFence}}:{})};}}
 };
 let currentPrepared=false;try{contextPublication=await prepareContextGenerationPublication(store,core,plan);if(currentHumanProjection){await prepareGroupCurrentProjection(store,core,scope,plan);currentPrepared=true;}
 await verifyCut();
 const checkpoint=currentHumanProjection?await encodeGroupCurrentProjection(core,scope,plan,transport,{profile,parents}):await buildCheckpoint(core,transport,{profile,parents});
 let manifest,ref;
 if(currentHumanProjection){
  await verifyCut();const published=await publishGroupCurrentProjection(core,scope,plan,checkpoint,transport,{profile});manifest=published.manifest;ref=published.ref;
 }else{
  manifest={...checkpoint.manifest,ownerScope:scope.ownerScope};const object=await protocolObject('checkpoint-manifest',bytes(manifest),{profile});
  await verifyCut();await transport.putImmutable(object.ref,object.bytes);await readObject(object.ref,ref=>transport.get(ref),{profile});ref=object.ref;
 }
 // A transport await may overlap a local edit; never advertise a stale cut as a
 // completed current checkpoint even though its immutable object may exist.
 await verifyCut(true);
 const result={ref,manifest,cut:currentHumanProjection?checkpoint.cut:cut};if(dispatchQualification){checkpointDispatchCuts.set(result,dispatchProof);requireGroupedCheckpointDispatchCut(core,store,result);}return result;
 }catch(error){if(currentHumanProjection&&error?.code==='BNS_HUMAN_CHANGED')fail('BNS_SNAPSHOT_CHANGED');throw error;}finally{releaseContextGenerationPublication(contextPublication);if(currentPrepared)releaseGroupCurrentProjection(scope);}
}
async function manifest(ref,get,core,profile,supported){
 if(ref?.kind!=='checkpoint-manifest')fail('BNS_CHECKPOINT_INVALID');
 const v=decodeJSON(await readObject(ref,get,{profile}),profile.decoded);
 assertGroupedCheckpointManifest(v,{core,supported});return v;
}
async function compile(core,items,manifest,store){
 const scope=manifest.ownerScope;
 const operations=[],heads=[],frontiers=[];for(const item of items){
  if(item.kind==='revision'&&own(item,['kind','operation','redacted'])&&item.redacted===false)operations.push(item.operation);
  else if(item.kind==='head'&&own(item,['kind','type','entityId','revisions','purged','fence'])){const{kind,...row}=item;heads.push(row);}
  else if(item.kind==='frontier'&&own(item,['kind','deviceId','frontier','ranges'])){const{kind,...row}=item;frontiers.push(row);}
  else fail('BNS_GROUP_OWNER_UNSUPPORTED');
 }
 const plan=await prepareGroupCheckpointPlan(core,operations),canonical=await prepareGroupScope(plan,{store});
 const sorted=rows=>[...rows].sort((a,b)=>JSON.stringify([a.type,a.entityId]).localeCompare(JSON.stringify([b.type,b.entityId])));
 const families=new Map();for(const head of plan.heads){const operation=operations.find(op=>op.revisionId===head.revisions[0]);const x=families.get(head.type)||{type:head.type,version:operation.codecVersion,count:0};x.count++;families.set(head.type,x);}const coverage=[...families.values()].sort((a,b)=>a.type.localeCompare(b.type));
 if(!equal(coverage,manifest.coverage)||!equal(sorted(heads),plan.heads)||!equal(canonical.ownerScope,scope))fail('BNS_GROUP_SCOPE_INVALID');
 const expected=new Map();for(const op of operations)expected.set(op.deviceId,acceptSequence(expected.get(op.deviceId),op.sequence));
 if(frontiers.length!==expected.size||new Set(frontiers.map(x=>x.deviceId)).size!==frontiers.length)fail('BNS_CHECKPOINT_FRONTIER');
 for(const row of frontiers)if(!equal(row,{deviceId:row.deviceId,...expected.get(row.deviceId)}))fail('BNS_CHECKPOINT_FRONTIER');
 return {plan,canonical,frontiers};
}
// Read-only consuming discovery check. Reuse the exact original compiler;
// return only its digest, never a plan, stage, writer or activation capability.
export async function validateGroupedCheckpointGraph(core,items,manifest,{store}={}){
 if(store?.repository!==core?.repository||!core?.repository)fail('BNS_GROUP_BINDING');
 assertGroupedCheckpointManifest(manifest,{core});
 return (await compile(core,items,manifest,store)).plan.digest;
}
// The explicit phased task reuses the same complete original compiler once.
// A branded plan is semantic input only; it grants no repository writer.
export async function prepareValidatedGroupedCheckpointGraph(core,items,manifest,{store}={}){
 if(store?.repository!==core?.repository||!core?.repository)fail('BNS_GROUP_BINDING');
 assertGroupedCheckpointManifest(manifest,{core});return (await compile(core,items,manifest,store)).plan;
}
// Both protocol namespaces count toward one explicit local admission budget.
// Reuse the two existing per-batch byte envelopes; never count just wire bodies.
function requireGenerationStorageBudgets(restore,t,rows){
 const held=generationStorageChecks.get(t);if(!held)return;
 if(held.restore!==restore)fail('BNS_GENERATION_PROOF_REQUIRED');readOriginalGroupGenerationRepositoryAuthority(held.token,held.stage.repository,t);
 for(const check of held.checks){let total=0,matched=!check.before;
  for(const range of check.ranges)for(const [key,row]of rows)if(range.includes(key)){
   let value=row;if(check.before&&key===check.before.id){if(!equal(row,{...check.before,phase:'activated'}))fail('BNS_RESTORE_STAGE_CHANGED');value=check.before;matched=true;}
   if((total+=bytes(value).length)>CORE_LIMITS.batchBytes*2)fail('BNS_GROUP_RESOURCE_LIMIT');
  }
  if(!matched)fail('BNS_RESTORE_STAGE_CHANGED');
 }
}
async function requireStorageBudget(t,stage,replayId,before=null){
 const held=generationStorageChecks.get(t);
 // Only the original protected writer with its fixed callback can defer this
 // scan. Generic and debug transactions retain the original admission point.
 if(held&&held.stage===stage&&(held.kind==='group-stage'&&before===null||held.kind==='group-apply'&&before?.phase==='validated'&&before.replayId===replayId)){
  readOriginalGroupGenerationRepositoryAuthority(held.token,stage.repository,t);
  // After this point the fixed apply tail writes only the out-of-namespace
  // active pointer and this exact restore phase. Count its original preimage,
  // not a smaller final row. Consumer publication is refused before staging.
  held.checks.push({ranges:[stage.fixedNamespace,replayId].map(namespace=>{const prefix=stage.prefix+'generation:'+namespace+':';return IDBKeyRange.bound(prefix,prefix+'\uffff',false,true);}),before:before?clone(before):null});return;
 }
 let total=0,rows=0;for(const namespace of [stage.fixedNamespace,replayId]){let after=null;do{const page=await t.primaryRangePage('meta',{prefix:stage.prefix+'generation:'+namespace+':',after,limit:100});for(const {value}of page.rows){rows++;if((total+=bytes(value).length)>CORE_LIMITS.batchBytes*2)fail('BNS_GROUP_RESOURCE_LIMIT');}after=page.next;}while(after);}return {rows,bytes:total};
}
const sourceUnionKind='source-bootstrap-union-restore';
function sourceUnionTicket(restore){
 originalGenerationBinding(restore);requireOriginalGenerationCoreMethods(restore.live);requireOriginalGenerationCoreMethods(restore.stage);const ticket=currentOriginalRecoveryWork(restore.live.repository);
 if(!ticket)fail('BNS_SOURCE_UNION_WORK_REQUIRED');checkOriginalRecoveryWork(restore.live.repository,ticket);
 if(restore.profile!==SEGMENT_PROFILE||restore.live.fixedNamespace!==null||restore.stage.fixedNamespace!==restore.restoreId)fail('BNS_SOURCE_UNION_PROOF_REQUIRED');return ticket;
}
function sourceUnionState(restore,row){
 const keys=['id','version','kind','databaseId','deviceId','selection','receipt','phase','base','replayId','received','graphDigest',...(row?.phase==='activated'?['sourceCut']:[]),...(Object.hasOwn(row??{},'cleanup')?['cleanup']:[])];
 if(!own(row,keys)||row.databaseId!==restore.store.databaseId||row.deviceId!==restore.live.deviceId||row.kind!==sourceUnionKind||row.version!==1||!['validated','activated','abandoned'].includes(row.phase)||!opaque(row.replayId)||row.replayId===restore.restoreId||!hash(row.graphDigest)||!Number.isSafeInteger(row.received)||row.received<1||row.received>384||row.id!==restore.stage.prefix+'generation:'+restore.restoreId+':restore:'||!own(row.base,['namespace','generation','ownerGeneration','fence','settings']))fail('BNS_RESTORE_STAGE_CHANGED');
 const b=row.base,f=b.fence,settings=b.settings;
 if(b.namespace!=='initial'||b.generation!==0||!Number.isSafeInteger(b.ownerGeneration)||b.ownerGeneration<0||!own(f,['epoch','namespace','marker'])||f.namespace!=='initial'||f.epoch!==null&&!opaque(f.epoch)||typeof f.marker!=='boolean'||!own(settings,['consentVersion','consentAt','enabled','epoch'])||settings.consentVersion!==CONSENT_VERSION||settings.enabled!==true||!Number.isSafeInteger(settings.epoch)||settings.epoch<1||typeof settings.consentAt!=='string'||!Number.isFinite(Date.parse(settings.consentAt)))fail('BNS_RESTORE_STAGE_CHANGED');
 if(row.phase==='activated'&&!own(row.sourceCut,['version','inputStates','revisionAllocations','metadata','filterInputs','filterMetadata','filterSequenceBase']))fail('BNS_RESTORE_STAGE_CHANGED');
 assertSourceBootstrapUnionSelection(row.selection);
 if(row.selection.datasetId!==restore.live.datasetId||!equal(row.selection,row.receipt?.selection)||row.graphDigest!==row.receipt?.graphDigest)fail('BNS_RESTORE_STAGE_CHANGED');
 if(Object.hasOwn(row,'cleanup')&&(!own(row.cleanup,['namespace','after','complete'])||!Number.isSafeInteger(row.cleanup.namespace)||row.cleanup.namespace<0||row.cleanup.namespace>2||row.cleanup.after!==null&&typeof row.cleanup.after!=='string'||typeof row.cleanup.complete!=='boolean'))fail('BNS_RESTORE_STAGE_CHANGED');
}
async function sourceUnionReplayId(restore,base,selection){
 sourceUnionTicket(restore);const identity={version:1,kind:'source-bootstrap-union-replay',restoreId:restore.restoreId,datasetId:restore.live.datasetId,deviceId:restore.live.deviceId,databaseId:restore.store.databaseId,selectionId:selection.selectionId,base};chargeRecoveryValue(restore.live,identity);const id=await digest(identity);sourceUnionTicket(restore);return id;
}
async function requireOrdinarySourceUnion(restore,t){
 sourceUnionTicket(restore);
 if(await t.get('meta','canonical-generation:repository-protection:v1'))fail('BNS_SOURCE_UNION_PROTECTED_UNSUPPORTED');
 await requireNoSourcePurgeDeny(restore.live,t);await requireConsumerPublicationSettled(t);
}
async function requireSourceUnionInventory(restore,t,state,items){
 const prefix=restore.stage.prefix+'generation:'+restore.restoreId+':',expected=new Map(items.map((item,index)=>[prefix+'groupItem:'+String(index).padStart(4,'0'),item]));
 let count=0,after=null;do{const page=await t.primaryRangePage('meta',{prefix,after,limit:100});for(const {value}of page.rows){if(value.id===state.id){if(!equal(value,state))fail('BNS_RESTORE_STAGE_CHANGED');continue;}if(!expected.has(value.id)||!own(value,['id','item'])||!equal(value.item,expected.get(value.id)))fail('BNS_RESTORE_STAGE_CHANGED');count++;}after=page.next;}while(after);
 if(state.phase==='validated'&&count!==items.length||state.cleanup?.complete&&count!==0)fail('BNS_RESTORE_STAGE_CHANGED');
}
function sourceUnionProtocolRows(replay,packet,epoch){
 const key=(kind,...ids)=>protocolPhysicalId(replay.prefix,replay.fixedNamespace,kind,ids),rows=new Map(),add=(kind,ids,value)=>{const id=key(kind,...ids);if(rows.has(id))fail('BNS_GROUP_DUPLICATE');rows.set(id,{id,...value});};
 for(const op of packet.operations){add('revision',[op.revisionId],{operation:op,redacted:false});add('receipt',[op.operationId],{digest:op.revisionId,deviceId:op.deviceId,sequence:op.sequence});add('sequence',[op.deviceId,String(op.sequence).padStart(16,'0')],{operationId:op.operationId,digest:op.revisionId});add('entityRevision',[op.type,op.entityId,op.revisionId],{revisionId:op.revisionId});}
 for(const head of packet.heads)add('head',[head.type,head.entityId],head);for(const frontier of packet.frontiers)add('frontier',[frontier.deviceId],frontier);
 add('generation',[],{value:packet.operations.length});add('ownerRecoveryEpoch',[],{version:1,epoch});return rows;
}
async function requireSourceUnionProtocol(replay,t,expected){
 const rows=await readGroupRows(t,'meta',{prefix:replay.prefix+'generation:'+replay.fixedNamespace+':'});
 if(rows.length!==expected.size||rows.some(row=>!expected.has(row.id)||!equal(row,expected.get(row.id))))fail('BNS_GROUP_COMMIT_UNPROVEN');
}
const sourceUnionPhysicalMetadata=['sequence','revision-sequence','input-delta-sequence','thought-sequence','thought-epoch','thought-suppression-key'];
// A local physical receipt from the actual Source owners, never portable wire
// state. Canonical bodies remain solely in their original tables/operations.
// Rebuildable filter evaluation may advance the broad backup generation but
// cannot alter original allocation, local suppression or epoch identities.
async function prepareSourceUnionLocalIdentity(restore){
 const row=(await restore.store.run(()=>restore.live.transaction(false,t=>t.get('meta','thought-suppression-key'),['meta'])))??null;chargeRecoveryValue(restore.live,row);const fingerprint=await digest(row);sourceUnionTicket(restore);return {row,fingerprint};
}
async function sourceUnionPhysicalCut(t,identity,working=null){
 const inputStates=await readGroupRows(t,'inputStates'),revisionAllocations=(await readGroupRows(t,'revisions')).map(({id,sequence,listKey,documentList})=>({id,sequence,listKey,documentList})),metadata=[];
 for(const id of sourceUnionPhysicalMetadata){const row=(await t.get('meta',id))??null;if(id==='thought-suppression-key'){if(!equalSourceWorkingPhysicalTree(row,identity.row))fail('BNS_RESTORE_LOCAL_CHANGED');metadata.push({id,fingerprint:identity.fingerprint});}else metadata.push({id,row});}
 const filterInputs=[],evaluated=[],runtime=new Set(['decision','reasonCode','pendingKey','failed','evaluatedAt','decisionSequence','filteredKey']),allowed=new Set(['id','documentId','authorship','userEdited','filterOverride','presence','evaluationRevision','basedOnContentRevision',...Object.keys(FILTER_VERSIONS),...runtime]);
 for(const row of await readGroupRows(t,'filterInputs')){
  const edit=working?.groups.find(group=>group.prepared.descriptor.value.inputId===row.id);if(edit){filterInputs.push(requireSourceUnionWorkingFilter(edit,working.cut.filterInputs.find(item=>item.id===row.id),row));continue;}
  if(Object.keys(row).some(key=>!allowed.has(key))||!Number.isSafeInteger(row.evaluationRevision)||row.evaluationRevision<0||Object.hasOwn(row,'failed')&&typeof row.failed!=='boolean'||!Object.entries(FILTER_VERSIONS).every(([key,value])=>row[key]===value))fail('BNS_RESTORE_LOCAL_CHANGED');
  const state=inputStates.find(state=>state.id===row.id);if(!state||row.basedOnContentRevision!==state.contentRevision)fail('BNS_RESTORE_LOCAL_CHANGED');
  if(Object.hasOwn(row,'evaluatedAt')){
   const source=await t.get('records',state.sourceRecordIds[0]),decision=decideLight({text:source?.value.originalText,...row});
   if(typeof row.evaluatedAt!=='string'||!Number.isFinite(Date.parse(row.evaluatedAt))||row.pendingKey!==1||row.failed!==false||!Number.isSafeInteger(row.decisionSequence)||row.decisionSequence<1||!Object.entries(decision).every(([key,value])=>equal(row[key],value))||Object.hasOwn(row,'filteredKey')!== (row.decision==='filter')||row.decision==='filter'&&!equal(row.filteredKey,[0,-row.decisionSequence,row.id]))fail('BNS_RESTORE_LOCAL_CHANGED');evaluated.push(row.decisionSequence);
  }else if(row.pendingKey!==0||row.decision!=='uncertain'||row.reasonCode!=='metadata_unknown'||Object.hasOwn(row,'decisionSequence')||Object.hasOwn(row,'filteredKey'))fail('BNS_RESTORE_LOCAL_CHANGED');
  filterInputs.push(Object.fromEntries(Object.entries(row).filter(([key])=>!runtime.has(key))));
 }
 const filter=await t.get('meta','smart-filter');if(!filter||!Number.isSafeInteger(filter.decisionSequence)||filter.decisionSequence<evaluated.length||!['idle','running','failed'].includes(filter.taskState)||Object.hasOwn(filter,'lastCheckedAt')&&!Number.isFinite(filter.lastCheckedAt))fail('BNS_RESTORE_LOCAL_CHANGED');
 const filterSequenceBase=filter.decisionSequence-evaluated.length;evaluated.sort((a,b)=>a-b);if(evaluated.some((value,index)=>value!==filterSequenceBase+index+1))fail('BNS_RESTORE_LOCAL_CHANGED');
 const filterMetadata=Object.fromEntries(Object.entries(filter).filter(([key])=>!['taskState','lastCheckedAt','decisionSequence'].includes(key)));
 return {version:1,inputStates,revisionAllocations,metadata,filterInputs,filterMetadata,filterSequenceBase};
}
async function requireSourceUnionPhysicalCut(t,expected,identity){
 if(expected?.version!==1||!equalSourceWorkingPhysicalTree(await sourceUnionPhysicalCut(t,identity),expected))fail('BNS_RESTORE_LOCAL_CHANGED');
}
// Snapshot every actual table/key/value before either debug hook. Project the
// SAME original finalizers into a clone-only overlay: no ignored meta prefix,
// alternate materializer, native grant or write through this read projection.
async function sealSourceUnionTerminal(restore,t,updates=[]){
 const tables=new Map();for(const table of t.tx.objectStoreNames)tables.set(table,new Map((await readGroupRows(t,table)).map(row=>[row.id,clone(row)])));
 const current=()=>{sourceUnionTicket(restore);return true;},retain=(table,key,value)=>{current();chargeRecoveryValue(restore.live,value,true);const rows=tables.get(table);if(!rows)fail('BNS_RESTORE_STAGE_CHANGED');if(value===null)rows.delete(key);else rows.set(key,clone(value));};
 for(const {table,key,value}of updates)retain(table,key,value);
 const snapshotChanges=input=>new Map([...(input??[])].map(([key,value])=>{chargeRecoveryValue(restore.live,[key,value],true);return [key,clone(value)];}));
 const names=Object.freeze([...t.tx.objectStoreNames]);chargeRecoveryValue(restore.live,names,true);const tx=Object.freeze({objectStoreNames:Object.freeze({contains:name=>names.includes(name)})});
 const projected={tx,semanticEnabled:t.semanticEnabled,navigationChanges:snapshotChanges(t.navigationChanges),semanticChanges:snapshotChanges(t.semanticChanges),aiUsageBoundaryChanged:t.aiUsageBoundaryChanged,
  get:async(table,key)=>{current();const value=tables.get(table)?.get(key);chargeRecoveryValue(restore.live,value,true);return clone(value);},
  put:async(table,value)=>retain(table,value.id,value),delete:async(table,key)=>retain(table,key,null),
  rangePage:async(...args)=>{current();return clone(await t.rangePage(...args));}
 };
 await flushNavigationWrites(projected);await flushSemanticWrites(projected);
 if(t.backupChanged){const row=tables.get('meta').get('backup-data-generation');retain('meta','backup-data-generation',{id:'backup-data-generation',value:(row?.value||0)+1});}
 current();registerRepositoryFinalReadFence(restore.store.repository,t,{isCurrent:current,plan:function*(){for(const [table,rows]of tables){if((yield {method:'count',table})!==rows.size)throw new ArchiveError('BNS_RESTORE_STAGE_CHANGED');for(const [key,value]of rows)if(!equalSourceWorkingPhysicalTree(yield {method:'get',table,key},value))throw new ArchiveError('BNS_RESTORE_STAGE_CHANGED');}return true;}});
}
export class GroupedCheckpointRestore{
 constructor(core,{store,restoreId,profile=SEGMENT_PROFILE,checkpoint=defaultCheckpoint,sourcePurgeProjection=false}){
  if(store?.repository!==core.repository||!opaque(restoreId))fail('BNS_GROUP_BINDING');if(typeof sourcePurgeProjection!=='boolean')fail('BNS_GROUP_BINDING');if(sourcePurgeProjection){if(sourcePurgeProjection!==true||checkpoint!==defaultCheckpoint)fail('BNS_GROUP_BINDING');return new SourcePurgeGroupedCheckpointRestore(core,{store,restoreId,profile});}this.store=store;this.live=core;this.restoreId=restoreId;this.profile=profile;this.checkpoint=checkpoint;
  this.stage=new BrowserNativeSyncCore(core.repository,{datasetId:core.datasetId,deviceId:core.deviceId,namespace:restoreId});
  canonicalGenerationBindings.set(this,{store,live:core,stage:this.stage,restoreId});
 }
 // This is a LOCAL selection, not a checkpoint-manifest or a second restore.
 // The proof retains all three authenticated original cuts. Its work ticket is
 // supplied by the consumer and stays unchanged across staging and activation.
 async stageSourceBootstrapUnion(proof){
  const ticket=sourceUnionTicket(this),packet=readSourceBootstrapUnionProof(proof,{core:this.live,store:this.store});
  await this.store.finishFoundation();sourceUnionTicket(this);
  const empty=await prepareGroupScope(await prepareGroupCheckpointPlan(this.live,[]));
  const base=await this.store.run(()=>this.live.transaction(false,async t=>{await requireOrdinarySourceUnion(this,t);return authority(this.store,this.live,t);})),replayId=await sourceUnionReplayId(this,base,packet.selection);
  const state=await this.store.run(()=>this.stage.transaction(true,async t=>{
   await requireOrdinarySourceUnion(this,t);await requireSourceBootstrapUnionProof(proof,{core:this.live,store:this.store},t);
   const old=await this.stage.get(t,'restore');
   if(old){sourceUnionState(this,old);if(!['validated','activated'].includes(old.phase)||!equal(old.selection,packet.selection)||!equal(old.receipt,packet.receipt)||old.received!==packet.items.length)fail('BNS_RESTORE_ID_COLLISION');await requireSourceUnionInventory(this,t,old,packet.items);return old;}
   if((await t.primaryRangePage('meta',{prefix:this.stage.prefix+'generation:'+this.restoreId+':',limit:1})).rows.length)fail('BNS_RESTORE_ID_COLLISION');
   if(!equal(await authority(this.store,this.live,t),base))fail('BNS_RESTORE_LOCAL_CHANGED');
   if(base.namespace!=='initial'||base.generation!==0||await t.get('meta',this.live.prefix+'active'))fail('BNS_SOURCE_UNION_TARGET_NOT_EMPTY');
   await requireGroupScope(this.store,t,empty);await this.store.qualifyControlPublicationRead(t);
   for(const kind of ['revision','pending','publicationActive'])if((await t.primaryRangePage('meta',{prefix:await this.live.idIn(t,kind),limit:1})).rows.length)fail('BNS_SOURCE_UNION_TARGET_NOT_EMPTY');
   for(let index=0;index<packet.items.length;index++)await this.stage.put(t,'groupItem',[String(index).padStart(4,'0')],{item:packet.items[index]});
   const row={version:1,kind:sourceUnionKind,databaseId:this.store.databaseId,deviceId:this.live.deviceId,selection:packet.selection,receipt:packet.receipt,phase:'validated',base,replayId,received:packet.items.length,graphDigest:packet.graphDigest};
   await this.stage.put(t,'restore',[],row);await requireStorageBudget(t,this.stage,replayId);await sealSourceUnionTerminal(this,t);await this.checkpoint('source-union-staged',t);const written=await this.stage.get(t,'restore');if(!equal(written,{...row,id:await this.stage.idIn(t,'restore')}))fail('BNS_RESTORE_STAGE_CHANGED');return written;
  }));
  sourceUnionState(this,state);sourceUnionProofs.set(this,{proof,ticket,state:clone(state)});return state;
 }
 async #activateSourceBootstrapUnion(state){
  const ticket=sourceUnionTicket(this);sourceUnionState(this,state);if(!['validated','activated'].includes(state.phase))fail('BNS_RESTORE_NOT_READY');if(state.replayId!==await sourceUnionReplayId(this,state.base,state.selection))fail('BNS_RESTORE_STAGE_CHANGED');
  const replay=new BrowserNativeSyncCore(this.live.repository,{datasetId:this.live.datasetId,deviceId:this.live.deviceId,namespace:state.replayId});
  const cached=sourceUnionProofs.get(this);let proof;
  if(cached?.ticket===ticket&&equal(cached.state,state))proof=cached.proof;
  else{
   const operations=state.phase==='activated'?await allOperations(replay):(await stageItems(this.stage)).filter(item=>item.kind==='revision').map(item=>item.operation);
   proof=await prepareStoredSourceBootstrapUnion(this.live,{store:this.store,receipt:state.receipt,operations});
  }
  const packet=readSourceBootstrapUnionProof(proof,{core:this.live,store:this.store});
  if(!equal(packet.selection,state.selection)||!equal(packet.receipt,state.receipt)||packet.items.length!==state.received||packet.graphDigest!==state.graphDigest)fail('BNS_RESTORE_STAGE_CHANGED');
  const plan=await prepareGroupCheckpointPlan(replay,packet.operations),canonical=await prepareGroupScope(plan,{store:this.store});
  if(plan.digest!==packet.graphDigest||!equal(plan.heads,packet.heads)||!equal(canonical.ownerScope,packet.ownerScope))fail('BNS_RESTORE_STAGE_CHANGED');
  const localIdentity=await prepareSourceUnionLocalIdentity(this);
  const active={id:this.live.prefix+'active',namespace:state.replayId,restoreId:this.restoreId,selection:state.selection,graphDigest:state.graphDigest},protocol=sourceUnionProtocolRows(replay,packet,state.base.fence.epoch);
  if(state.phase==='activated'){
   // Original provider allocation/attempt controls are local transport receipts,
   // not canonical operations. Authenticate their exact existing publication
   // journal before retaining them; no other extra protocol row is admitted.
   const prefix=replay.prefix+'generation:'+state.replayId+':',controls=await this.store.run(()=>replay.transaction(false,async t=>(await readGroupRows(t,'meta',{prefix})).filter(row=>row.id.startsWith(prefix+'google-appdata-allocation:')||row.id.startsWith(prefix+'onedrive-upload-attempt:')),['meta']));
   for(const row of await requireSourcePurgeProtocolControlReceipts(this.store,this.live,controls,state.replayId)){if(protocol.has(row.id))fail('BNS_RESTORE_STAGE_CHANGED');protocol.set(row.id,row);}
   return this.store.run(()=>this.live.transaction(false,async t=>{
   await requireOrdinarySourceUnion(this,t);await requireSourceBootstrapUnionProof(proof,{core:this.live,store:this.store},t);await requireSourceUnionInventory(this,t,state,packet.items);
   if(!equal(await this.stage.get(t,'restore'),state)||!equal((await t.get('meta',active.id))??null,active))fail('BNS_RESTORE_LOCAL_CHANGED');
   const current=await authority(this.store,this.live,t);
   if(current.namespace!==state.replayId||current.generation!==packet.operations.length||!Number.isSafeInteger(current.ownerGeneration)||current.ownerGeneration<state.base.ownerGeneration+1||current.fence.epoch!==state.base.fence.epoch||!equal(current.settings,state.base.settings))fail('BNS_RESTORE_LOCAL_CHANGED');
   await requireSourceUnionProtocol(replay,t,protocol);await requireGroupScope(this.store,t,canonical);await requireSourceUnionPhysicalCut(t,state.sourceCut,localIdentity);return {state:'activated',namespace:state.replayId,selection:state.selection};
  }));
  }
  if(state.phase!=='validated')fail('BNS_RESTORE_NOT_READY');
  // Actual original Source applications are prepared outside the transaction.
  // There is one original activation, never one restore per incoming head.
  const applications=[];for(const group of plan.groups){if(group.type!=='sourceBootstrapCommit')fail('BNS_GROUP_OWNER_UNSUPPORTED');applications.push([group,await prepareBootstrapApplication(this.store,replay,group.operations)]);sourceUnionTicket(this);}
  const empty=await prepareGroupScope(await prepareGroupCheckpointPlan(this.live,[]));
  return this.store.run(()=>this.live.transaction(true,async t=>{
   await requireOrdinarySourceUnion(this,t);await requireSourceBootstrapUnionProof(proof,{core:this.live,store:this.store},t);await requireSourceUnionInventory(this,t,state,packet.items);
   if(!equal(await this.stage.get(t,'restore'),state)||!equal(await authority(this.store,this.live,t),state.base))fail('BNS_RESTORE_LOCAL_CHANGED');
   if(state.base.namespace!=='initial'||state.base.generation!==0||await t.get('meta',active.id))fail('BNS_SOURCE_UNION_TARGET_NOT_EMPTY');
   await this.store.qualifyControlPublicationRead(t);await requireGroupScope(this.store,t,empty);
   for(const kind of ['revision','pending','publicationActive'])if((await t.primaryRangePage('meta',{prefix:await this.live.idIn(t,kind),limit:1})).rows.length)fail('BNS_SOURCE_UNION_TARGET_NOT_EMPTY');
   if((await t.primaryRangePage('meta',{prefix:replay.prefix+'generation:'+state.replayId+':',limit:1})).rows.length)fail('BNS_RESTORE_STAGE_CHANGED');
   for(const [group,application]of applications){await applyBootstrapApplication(t,application);await this.checkpoint('source-union-applied-group',group.id);}
   await requireSourceUnionProtocol(replay,t,protocol);await requireGroupScope(this.store,t,canonical);
   if(!equal(await authority(this.store,this.live,t),state.base))fail('BNS_RESTORE_LOCAL_CHANGED');await requireStorageBudget(t,this.stage,state.replayId,state);const sourceCut=await sourceUnionPhysicalCut(t,localIdentity);
   const completed={...withoutId(state),phase:'activated',sourceCut};await sealSourceUnionTerminal(this,t,[{table:'meta',key:active.id,value:active},{table:'meta',key:state.id,value:{...completed,id:state.id}}]);
   await this.checkpoint('before-activation',t);await requireOrdinarySourceUnion(this,t);await requireSourceBootstrapUnionProof(proof,{core:this.live,store:this.store},t);await requireSourceUnionInventory(this,t,state,packet.items);if(!equal(await authority(this.store,this.live,t),state.base))fail('BNS_RESTORE_LOCAL_CHANGED');await this.store.qualifyControlPublicationRead(t);await requireSourceUnionPhysicalCut(t,sourceCut,localIdentity);await t.put('meta',active);await this.stage.put(t,'restore',[],completed);
   await requireSourceUnionProtocol(replay,t,protocol);await requireGroupScope(this.store,t,canonical);
   await this.checkpoint('after-activation',t);
   registerRepositoryFinalReadFence(this.store.repository,t,{isCurrent:()=>{sourceUnionTicket(this);return true;},plan:function*(){if(!equal(yield {method:'get',table:'meta',key:active.id},active)||!equal(yield {method:'get',table:'meta',key:state.id},{...completed,id:state.id}))throw new ArchiveError('BNS_RESTORE_STAGE_CHANGED');return true;}});
   return {state:'activated',namespace:state.replayId,selection:state.selection};
  }));
 }
 // A bounded consumer for an independently staged canonical database. Only
 // the original authenticated stage can mint proof; owner application remains
 // the same activate() path below. This is not the application DB switch and
 // does not raise the original whole-graph or transaction limits.
 async stageCanonicalGeneration(proof){
  const {store,live,stage}=originalGenerationBinding(this),verified=readCanonicalCheckpointProof(proof,{store,core:live});
  await store.finishFoundation();
  const replayId=crypto.randomUUID(),replay=new BrowserNativeSyncCore(live.repository,{datasetId:live.datasetId,deviceId:live.deviceId,namespace:replayId});
  const compiled=await compile(replay,verified.items,verified.manifest,store);
  if(compiled.plan.digest!==verified.graphDigest)fail('BNS_RESTORE_STAGE_CHANGED');
  // chrome.local publication needs its own cross-database coordinator. An
  // invisible staging database must never publish those preferences early.
  if(compiled.plan.groups.some(group=>group.type==='consumerPreference'))fail('BNS_GENERATION_CONSUMER_PUBLICATION_UNSUPPORTED');
  const binding={stateId:verified.stateId,identity:verified.generationIdentity};
  const result=await store.run(()=>generationTransaction(this,'group-stage',async t=>{
   registerRepositoryWorkLimit(live.repository,t);
   await requireCanonicalCheckpointProof(proof,{store,core:live},t);
   const old=await stage.get(t,'restore');
   if(old){
    if(!own(old,['id','manifestId','manifestRef','manifest','phase','base','replayId','received','graphDigest','canonicalGeneration'])||old.manifestId!==verified.manifestRef.id||old.graphDigest!==verified.graphDigest||!equal(old.canonicalGeneration,binding)||!['validated','activated'].includes(old.phase))fail('BNS_RESTORE_ID_COLLISION');
    return old;
   }
   if((await t.primaryRangePage('meta',{prefix:stage.prefix+'generation:'+stage.fixedNamespace+':',limit:1})).rows.length)fail('BNS_RESTORE_ID_COLLISION');
   const base=await authority(store,live,t);
   for(let at=0;at<verified.items.length;at++)await stage.put(t,'groupItem',[String(at).padStart(4,'0')],{item:verified.items[at]});
   const row={manifestId:verified.manifestRef.id,manifestRef:clone(verified.manifestRef),manifest:clone(verified.manifest),phase:'validated',base,replayId,received:verified.items.length,graphDigest:verified.graphDigest,canonicalGeneration:binding};
   await stage.put(t,'restore',[],row);await requireStorageBudget(t,stage,replayId);return stage.get(t,'restore');
  },['meta']));
  canonicalGenerationProofs.set(this,proof);canonicalGenerationStates.set(this,clone(result));return result;
 }
 // Compilation may hash protocol data, so prepare outside a live native
 // write TX. The fixed publication consumer below rechecks all owner facts
 // and seals physical rows inside the actual sealing transaction.
 async prepareCanonicalGenerationPublication(proof){
  originalGenerationBinding(this);
  if(canonicalGenerationProofs.get(this)!==proof)fail('BNS_GENERATION_PROOF_REQUIRED');
  const verified=readCanonicalCheckpointProof(proof,{store:this.store,core:this.live}),state=await this.stage.read('restore');
  if(state?.phase!=='activated'||state.manifestId!==verified.manifestRef.id||state.graphDigest!==verified.graphDigest||!equal(state.canonicalGeneration,{stateId:verified.stateId,identity:verified.generationIdentity}))fail('BNS_RESTORE_NOT_READY');
  const items=await stageItems(this.stage);if(!equal(items,verified.items)||!equal(state.manifest,verified.manifest))fail('BNS_RESTORE_STAGE_CHANGED');
  const replay=new BrowserNativeSyncCore(this.live.repository,{datasetId:this.live.datasetId,deviceId:this.live.deviceId,namespace:state.replayId}),compiled=await compile(replay,items,state.manifest,this.store);
  if(compiled.plan.digest!==verified.graphDigest)fail('BNS_RESTORE_STAGE_CHANGED');
  const contextPublication=await prepareContextGenerationPublication(this.store,replay,compiled.plan);
  releaseContextGenerationPublication(canonicalGenerationPublications.get(this)?.contextPublication);
  canonicalGenerationPublications.set(this,{proof,verified,state,replay,...compiled,contextPublication});
  return {state:'publication-prepared',manifestId:state.manifestId,graphDigest:state.graphDigest};
 }
 async begin(ref,get,{supported}={}){
  ref=clone(ref);assertProtocolObjectReference(ref,this.profile);
  const {store,live,stage}=this;await store.finishFoundation();
  const base=await store.run(()=>live.transaction(false,async t=>{await requireNoSourcePurgeDeny(live,t);return authority(store,live,t);})); // before first get
  const m=await manifest(ref,get,live,this.profile,supported),replayId=crypto.randomUUID();
  return store.run(()=>stage.transaction(true,async t=>{
   await requireNoSourcePurgeDeny(live,t);
   if(!equal(await authority(store,live,t),base))fail('BNS_RESTORE_LOCAL_CHANGED');
   const old=await stage.get(t,'restore');if(old){if(old.manifestId!==ref.id)fail('BNS_RESTORE_ID_COLLISION');return old;}
   if((await t.primaryRangePage('meta',{prefix:stage.prefix+'generation:'+stage.fixedNamespace+':',limit:1})).rows.length)fail('BNS_RESTORE_ID_COLLISION');
   const row={manifestId:ref.id,manifestRef:clone(ref),manifest:m,phase:'staging',base,replayId,received:0};await stage.put(t,'restore',[],row);return row;
  }));
 }
 async stageCheckpoint(ref,get,options={}){
  let state=await this.begin(ref,get,options);if(['activated','merged','validated','publishing','merging-saved'].includes(state.phase))return state;
  let index=0;for await(const item of checkpointItems(state.manifest,get,{profile:this.profile})){
   const at=index++;if(at<state.received)continue;
   await this.stage.transaction(true,async t=>{await requireNoSourcePurgeDeny(this.live,t);const current=await this.stage.get(t,'restore');if(current.phase!=='staging'||current.received!==at)fail('BNS_RESTORE_STAGE_CHANGED');if(!equal(await authority(this.store,this.live,t),current.base))fail('BNS_RESTORE_LOCAL_CHANGED');await this.stage.put(t,'groupItem',[String(at).padStart(4,'0')],{item});await this.stage.put(t,'restore',[],{...withoutId(current),received:at+1});await requireStorageBudget(t,this.stage,current.replayId);},['meta']);await this.checkpoint('staged-item',index);
  }
  state=await this.stage.read('restore');const items=await stageItems(this.stage);
  const replay=new BrowserNativeSyncCore(this.live.repository,{datasetId:this.live.datasetId,deviceId:this.live.deviceId,namespace:state.replayId}),compiled=await compile(replay,items,state.manifest,this.store);
  await this.stage.transaction(true,async t=>{await requireNoSourcePurgeDeny(this.live,t);const current=await this.stage.get(t,'restore');if(current.phase!=='staging'||current.received!==items.length||items.length!==current.manifest.itemCount)fail('BNS_RESTORE_STAGE_CHANGED');await this.stage.put(t,'restore',[],{...withoutId(current),phase:'validated',graphDigest:compiled.plan.digest});},['meta']);return this.stage.read('restore');
 }
 async activate(){
  const state=await this.stage.read('restore');if(state?.kind===sourceUnionKind)return this.#activateSourceBootstrapUnion(state);if(!state||!['validated','activated','merged','publishing','merging-saved'].includes(state.phase))fail('BNS_RESTORE_NOT_READY');
  if(state.phase==='merged')return this.confirmManualMerge(state);
  if(state.phase==='publishing'){
   if(!this.store.consumerPreferenceJournal)fail('BNS_CONSUMER_PREFERENCE_OWNER_REQUIRED');
   await this.store.consumerPreferenceJournal.recover(this.store);
   const current=await this.stage.read('restore');if(current?.phase!=='activated')fail('BNS_CONSUMER_PUBLICATION_PENDING');return this.activate();
  }
  if(state.phase==='activated')return this.store.run(()=>this.live.transaction(false,async t=>{
   await requireConsumerPublicationSettled(t);
   const current=await this.stage.get(t,'restore'),active=await t.get('meta',this.live.prefix+'active');
   if(!equal(current,state)||active?.namespace!==state.replayId||active.manifestId!==state.manifestId||active.graphDigest!==state.graphDigest||await readRestoreEpoch(t)!==state.base.fence.epoch)fail('BNS_RESTORE_LOCAL_CHANGED');
   return {state:'activated',namespace:state.replayId};
  }));
  const generationProof=canonicalGenerationProofs.get(this);
  if(state.canonicalGeneration&&!generationProof)fail('BNS_GENERATION_PROOF_REQUIRED');
  if(generationProof&&!equal(state,canonicalGenerationStates.get(this)))fail('BNS_RESTORE_STAGE_CHANGED');
  const items=[];for await(const row of this.stage.rows('groupItem'))items.push(row.item);
  if(generationProof){
   const proofRecord=readCanonicalCheckpointProof(generationProof,{store:this.store,core:this.live});
   if(!equal(state.canonicalGeneration,{stateId:proofRecord.stateId,identity:proofRecord.generationIdentity})||state.manifestId!==proofRecord.manifestRef.id||!equal(state.manifestRef,proofRecord.manifestRef)||!equal(state.manifest,proofRecord.manifest)||state.graphDigest!==proofRecord.graphDigest||state.received!==proofRecord.items.length||!equal(items,proofRecord.items))fail('BNS_RESTORE_STAGE_CHANGED');
  }
  const replay=new BrowserNativeSyncCore(this.live.repository,{datasetId:this.live.datasetId,deviceId:this.live.deviceId,namespace:state.replayId}),{plan,canonical,frontiers}=await compile(replay,items,state.manifest,this.store);
  if(plan.digest!==state.graphDigest)fail('BNS_RESTORE_STAGE_CHANGED');
  await this.store.run(()=>this.live.transaction(false,async t=>{if(!equal(await authority(this.store,this.live,t),state.savedMerge?.base??state.base))fail('BNS_RESTORE_LOCAL_CHANGED');}));
  const localOperations=await allOperations(this.live);
  if(state.canonicalGeneration&&localOperations.length)fail('BNS_GENERATION_TARGET_NOT_EMPTY');
  if(localOperations.length)return plan.groups.some(g=>g.type==='savedWorkBootstrap')?this.mergeSaved(state,plan,localOperations):plan.groups.every(g=>['sourceBootstrapCommit','sourceAppendCommit','inputWorkingCommit'].includes(g.type))?this.mergeSourceWorking(state,plan,localOperations):plan.groups.some(g=>g.type==='sourceBootstrapCommit')&&plan.groups.some(g=>g.type==='humanLibraryCommit')?this.mergeMixed(state,plan,localOperations):this.mergeManual(state,plan,localOperations);
  const filter=new FilterIntentSyncJournal(replay),working=new InputWorkingCommitReceiver(this.store,replay,{filterJournal:filter}),manual=manualSyncOwners(replay),desired=contextDesiredMaterializer(replay),topicDesired=topicDesiredMaterializer(replay),consumerOperations=finalConsumerPreferenceOperations(plan),bindingMaterializer=preparePromptBindingReplay(replay,plan);
  const sourceProof=await prepareRestoredFilterSources(canonical.expected.records.map(row=>({...row})));
  const applications=[];try{for(const group of plan.groups){if(group.type==='sourceBootstrapCommit')applications.push([group,await prepareBootstrapApplication(this.store,replay,group.operations)]);else if(group.type==='sourceAppendCommit'){const anchor=plan.groups.find(x=>x.id===group.prepared.descriptor.value.bootstrap.revisionId);applications.push([group,await prepareAppendApplication(this.store,replay,group.operations,anchor.operations)]);}else if(group.type==='inputWorkingCommit')applications.push([group,await prepareWorkingApplication(working,group.operations)]);else if(group.type==='filterIntent')applications.push([group,await prepareFilterApplication(filter,group.operations[0])]);else applications.push([group,null]);}
  const humanApplication=await prepareHumanGroupApplication(this.store,replay,plan,plan.groups.some(g=>g.type==='inputWorkingCommit')?{plan,applications}:null),savedApplication=await prepareSavedWorkGroupApplication(this.store,replay,plan,this.stage,state,humanApplication),contextApplication=await prepareContextGroupApplication(this.store,replay,plan,{live:this.live,generationProof});
  const consumerApplication=consumerOperations.length?await prepareRestoredConsumerPreferenceApplication(this.store,replay,plan,this.stage,state):null;
  const empty=await prepareGroupScope(await prepareGroupCheckpointPlan(replay,[]));
  const applyTransaction=generationProof?(fn=>generationTransaction(this,'group-apply',fn)):(fn=>this.live.transaction(true,fn));
  return await this.store.run(async()=>{const result=await applyTransaction(async t=>{
   if(state.manifest.ownerScope.version===2||savedApplication||generationProof)registerRepositoryWorkLimit(this.store.repository,t);
   await requireNoSourcePurgeDeny(this.live,t);
   if(generationProof)await requireCanonicalCheckpointProof(generationProof,{store:this.store,core:this.live},t);
   const current=await this.stage.get(t,'restore');if(!equal(current,state))fail('BNS_RESTORE_STAGE_CHANGED');
   if(state.phase==='activated'){const active=await t.get('meta',this.live.prefix+'active');if(active?.namespace!==state.replayId||active.manifestId!==state.manifestId||await readRestoreEpoch(t)!==state.base.fence.epoch)fail('BNS_RESTORE_LOCAL_CHANGED');return {state:'activated',namespace:state.replayId};}
   if(!equal(await authority(this.store,this.live,t),state.base))fail('BNS_RESTORE_LOCAL_CHANGED');
   await requireConsumerPublicationSettled(t);await this.store.qualifyControlPublicationRead(t);
   await requireGroupScope(this.store,t,empty);if(humanApplication)await requireHumanGroupApplication(t,humanApplication);
   for(const kind of ['pending','publicationActive'])if((await t.primaryRangePage('meta',{prefix:await this.live.idIn(t,kind),limit:1})).rows.length)fail('BNS_RESTORE_LIVE_PENDING');
   if((await t.primaryRangePage('meta',{prefix:replay.prefix+'generation:'+replay.fixedNamespace+':',limit:1})).rows.length)fail('BNS_RESTORE_STAGE_CHANGED');
   for(const [group,cap]of applications){if(['savedWorkBootstrap','savedWorkSuccessor'].includes(group.type))await applySavedWorkGroupStep(t,savedApplication,group.id);else if(group.type==='contextMutationCommit')await applyContextGroupStep(t,contextApplication,group.id);else if(group.type==='humanLibraryCommit')await applyHumanGroupStep(t,humanApplication,group.id);else if(group.type==='sourceBootstrapCommit')await applyBootstrapApplication(t,cap);else if(group.type==='sourceAppendCommit')await applyAppendApplication(t,cap);else if(group.type==='inputWorkingCommit')await working.applyRestored(t,cap,sourceProof);else if(group.type==='filterIntent')await filter.applyRestored(t,cap,sourceProof);else{replay.materialize=group.type==='contextDesired'?desired:group.type==='topicDesired'?topicDesired:group.type==='promptBinding'?bindingMaterializer:manual.materialize;const result=await replay.applyInTransaction(t,group.operations[0],{materialize:group.type!=='consumerPreference'});if(result.state!=='applied')requireResolvedPromptReplayConflict(replay,plan,group,result);}await this.checkpoint('applied-group',group.id);}
   const publication=consumerApplication?await applyRestoredConsumerPreferenceOwners(t,consumerApplication):null;
   await requireGroupScope(this.store,t,canonical);if(humanApplication)await sealHumanWorkingGroupApplication(t,humanApplication);if(!equal(await authority(this.store,this.live,t),state.base))fail('BNS_RESTORE_LOCAL_CHANGED');await requireStorageBudget(t,this.stage,state.replayId,state);
   for(const expected of plan.heads){const actual=await replay.get(t,'head',expected.type,expected.entityId);if(!actual||!equal(withoutId(actual),expected))fail('BNS_CHECKPOINT_HEAD');}
   for(const expected of frontiers){const actual=await replay.get(t,'frontier',expected.deviceId);if(!actual||!equal(withoutId(actual),expected))fail('BNS_CHECKPOINT_FRONTIER');}
   await this.checkpoint('before-activation',t);await t.put('meta',{id:this.live.prefix+'active',namespace:state.replayId,manifestId:state.manifestId,graphDigest:state.graphDigest});
   const publishing=!!publication?.operations.length;
   await this.stage.put(t,'restore',[],{...withoutId(state),phase:publishing?'publishing':'activated'});
   if(publishing){const binding=await this.store.controlPublicationBinding(t);await t.put('meta',{id:CONSUMER_PUBLICATION_PENDING_ID,version:2,namespace:state.replayId,databaseId:binding.reservation.databaseId,controlRevision:binding.reservation.revision,nonce:binding.reservation.nonce,terminal:false,before:publication.before,operations:publication.operations,restore:{stageId:state.id,manifestId:state.manifestId,graphDigest:state.graphDigest,replayId:state.replayId,operations:publication.allOperations,smartFilter:publication.smartFilter}});}
   await sealSavedWorkGroupActivation(t,savedApplication);await this.checkpoint('after-activation',t);
   if(generationProof){
    await requireCanonicalCheckpointProof(generationProof,{store:this.store,core:this.live},t);
    const active={id:this.live.prefix+'active',namespace:state.replayId,manifestId:state.manifestId,graphDigest:state.graphDigest},completed={...state,phase:'activated'};
    // Bind the real original activation receipt through native completion;
    // neither a user callback nor a stage DTO can stand in for this receipt.
    registerRepositoryFinalReadFence(this.store.repository,t,{isCurrent:()=>true,plan:function*(){
     if(!equal(yield {method:'get',table:'meta',key:active.id},active)||!equal(yield {method:'get',table:'meta',key:state.id},completed))fail('BNS_RESTORE_STAGE_CHANGED');return true;
    }});
   }
   return {state:publishing?'publishing':'activated',namespace:state.replayId};
  });if(result.state==='publishing'){await this.store.publish();return {state:'activated',namespace:state.replayId};}return result;});
  }finally{for(const [group,cap]of applications)if(group.type==='inputWorkingCommit')releaseOriginalWorkingApplication(this.store,replay,cap);}
 }
 // Source/Working union uses one bounded original-owner transaction. Failure
 // rolls back this whole checkpoint merge; local queued work stays untouched.
 async mergeSourceWorking(state,remotePlan,localOperations){
  const started=performance.now(),current=()=>{if(performance.now()-started>=30000)fail('BNS_GROUP_RESOURCE_LIMIT');},p=await prepareSourceWorkingMerge(this.store,this.live,this.stage,localOperations,remotePlan,this.restoreId),filter=new FilterIntentSyncJournal(this.live),working=new InputWorkingCommitReceiver(this.store,this.live,{filterJournal:filter}),sources=await prepareRestoredFilterSources(p.after.expected.records.map(row=>({...row}))),applications=[];
  for(const group of p.incoming){current();if(group.type==='sourceBootstrapCommit')applications.push([group,await prepareBootstrapApplication(this.store,this.live,group.operations)]);else if(group.type==='sourceAppendCommit'){const anchor=p.merged.groups.find(g=>g.id===group.prepared.descriptor.value.bootstrap.revisionId);applications.push([group,await prepareAppendApplication(this.store,this.live,group.operations,anchor.operations)]);}else applications.push([group,await prepareWorkingApplication(working,group.operations)]);}
  const receipts=remotePlan.groups.flatMap(g=>g.operations).map(o=>({operationId:o.operationId,revisionId:o.revisionId,deviceId:o.deviceId,sequence:o.sequence}));
  const mergeReceipt={id:this.live.prefix+'generation:'+p.namespace+':mergeCommit:'+encodeURIComponent(this.restoreId),version:1,restoreId:this.restoreId,namespace:p.namespace,epoch:state.base.fence.epoch,manifestId:state.manifestId,graphDigest:state.graphDigest,mergeDigest:p.merged.digest,receipts},comparison=await prepareSourceWorkingMergeResult(this.live,p,mergeReceipt);
  return this.store.foundationWrite(async t=>{
   current();if(!equal(await this.stage.get(t,'restore'),state)||!equal(await authority(this.store,this.live,t),state.base))fail('BNS_RESTORE_LOCAL_CHANGED');await requireNoSourcePurgeDeny(this.live,t);await requireConsumerPublicationSettled(t);await this.store.qualifyControlPublicationRead(t);
   await requireSourceWorkingMergeBase(this.store,this.live,this.stage,t,p);
   for(const kind of ['pending','publicationActive'])if((await t.primaryRangePage('meta',{prefix:await this.live.idIn(t,kind),limit:1})).rows.length)fail('BNS_RESTORE_LIVE_PENDING');
   for(const [g,cap]of applications){current();if(g.type==='sourceBootstrapCommit')await applyBootstrapApplication(t,cap);else if(g.type==='sourceAppendCommit')await applyAppendApplication(t,cap);else await working.applyRestored(t,cap,sources);await this.checkpoint('source-working-applied-group',g.id);}
   // Original owners may not mutate the staged cursor or replace the prior
   // chronology before this coordinator performs its exact transition.
   if(!equal(await this.stage.get(t,'restore'),state)||!equal((await t.get('meta',p.timeline.id))??null,p.rows.meta.find(r=>r.id===p.timeline.id)??null))fail('BNS_RESTORE_STAGE_CHANGED');
   if(await this.live.get(t,'mergeCommit',this.restoreId))fail('BNS_RESTORE_ID_COLLISION');
   await this.live.put(t,'mergeCommit',[this.restoreId],{version:1,restoreId:this.restoreId,namespace:p.namespace,epoch:state.base.fence.epoch,manifestId:state.manifestId,graphDigest:state.graphDigest,mergeDigest:p.merged.digest,receipts});await t.put('meta',p.timeline);
   await this.stage.put(t,'restore',[],{...withoutId(state),phase:'merged',mergeNamespace:p.namespace,mergeDigest:p.merged.digest,mergeReceipts:receipts});
   const seal=await requireSourceWorkingMergeResult(this.store,this.live,this.stage,t,p,comparison);await sealSourceWorkingMerge(this.store,this.live,this.stage,t,started,p.semantic,seal);await this.checkpoint('before-source-working-commit',t);current();return {state:'activated',namespace:p.namespace,merged:true};
  },{ms:Math.max(1,Math.floor(30000-(performance.now()-started)))});
 }
 async mergeMixed(state,remotePlan,localOperations){
  const started=performance.now(),p=await prepareMixedNonemptyMerge(this.store,this.live,this.stage,localOperations,remotePlan,this.restoreId),filter=new FilterIntentSyncJournal(this.live),working=new InputWorkingCommitReceiver(this.store,this.live,{filterJournal:filter}),sources=await prepareRestoredFilterSources(p.afterScope.expected.records),applications=[];
  for(const g of p.incoming){if(g.type==='sourceBootstrapCommit')applications.push([g,await prepareBootstrapApplication(this.store,this.live,g.operations)]);else if(g.type==='sourceAppendCommit'){const anchor=p.merged.groups.find(x=>x.id===g.prepared.descriptor.value.bootstrap.revisionId);applications.push([g,await prepareAppendApplication(this.store,this.live,g.operations,anchor.operations)]);}else if(g.type==='inputWorkingCommit')applications.push([g,await prepareWorkingApplication(working,g.operations)]);else applications.push([g,null]);}
  const humanApplication=p.incoming.some(g=>g.type==='humanLibraryCommit')?await prepareHumanIncrementalGroupApplication(this.store,this.live,p.beforePlan,p.incoming,p.incoming.some(g=>g.type==='inputWorkingCommit')?{plan:p.merged,applications}:null):null;
  const manual=new BrowserNativeSyncCore(this.live.repository,{datasetId:this.live.datasetId,deviceId:this.live.deviceId,namespace:state.base.namespace==='initial'?null:state.base.namespace});manual.materialize=manualSyncOwners(manual).materialize;
  const receipts=remotePlan.groups.flatMap(g=>g.operations).map(o=>({operationId:o.operationId,revisionId:o.revisionId,deviceId:o.deviceId,sequence:o.sequence}));
  const mergeReceipt={id:this.live.prefix+'generation:'+p.namespace+':mergeCommit:'+encodeURIComponent(this.restoreId),version:1,restoreId:this.restoreId,namespace:p.namespace,epoch:state.base.fence.epoch,manifestId:state.manifestId,graphDigest:state.graphDigest,mergeDigest:p.merged.digest,receipts},resultProof=await prepareMixedNonemptyResult(this.store,this.live,p,mergeReceipt,humanApplication);
  return this.store.foundationWrite(async t=>{
   if(!equal(await this.stage.get(t,'restore'),state)||!equal(await authority(this.store,this.live,t),state.base))fail('BNS_RESTORE_LOCAL_CHANGED');await requireNoSourcePurgeDeny(this.live,t);await requireConsumerPublicationSettled(t);await this.store.qualifyControlPublicationRead(t);await requireMixedNonemptyBase(this.store,this.live,this.stage,t,p);
   for(const kind of ['pending','publicationActive'])if((await t.primaryRangePage('meta',{prefix:await this.live.idIn(t,kind),limit:1})).rows.length)fail('BNS_RESTORE_LIVE_PENDING');
   if(humanApplication)await requireHumanGroupApplication(t,humanApplication);
   for(const[g,cap]of applications){if(g.type==='humanLibraryCommit')await applyHumanGroupStep(t,humanApplication,g.id);else if(g.type==='sourceBootstrapCommit')await applyBootstrapApplication(t,cap);else if(g.type==='sourceAppendCommit')await applyAppendApplication(t,cap);else if(g.type==='inputWorkingCommit')await working.applyRestored(t,cap,sources);else if((await manual.applyInTransaction(t,g.operations[0])).state!=='applied')fail('BNS_GROUP_CAUSAL_GAP');await this.checkpoint('mixed-applied-group',g.id);}
   // Original owners may not mutate the staged cursor or replace the prior
   // chronology before this coordinator performs its exact transition.
   if(!equal(await this.stage.get(t,'restore'),state)||!equal((await t.get('meta',p.timeline.id))??null,p.snapshot.meta.find(r=>r.id===p.timeline.id)??null))fail('BNS_RESTORE_STAGE_CHANGED');
   if(await this.live.get(t,'mergeCommit',this.restoreId))fail('BNS_RESTORE_ID_COLLISION');
   await this.live.put(t,'mergeCommit',[this.restoreId],{version:1,restoreId:this.restoreId,namespace:p.namespace,epoch:state.base.fence.epoch,manifestId:state.manifestId,graphDigest:state.graphDigest,mergeDigest:p.merged.digest,receipts});await t.put('meta',p.timeline);await this.stage.put(t,'restore',[],{...withoutId(state),phase:'merged',mergeNamespace:p.namespace,mergeDigest:p.merged.digest,mergeReceipts:receipts});
   await sealMixedNonemptyResult(this.store,this.live,this.stage,t,p,started,resultProof);await this.checkpoint('before-mixed-commit',t);return {state:'activated',namespace:p.namespace,merged:true};
  },{ms:Math.max(1,Math.floor(30000-(performance.now()-started)))});
 }
 // Incremental saved recovery keeps the live namespace and commits one real
 // named-owner transition with its durable cursor. A failed later step is not
 // described as whole-checkpoint rollback or acknowledged as complete.
 async mergeSaved(state,remotePlan,localOperations){
  const started=performance.now(),current=()=>{if(performance.now()-started>=30000)fail('BNS_GROUP_RESOURCE_LIMIT');},allowed=new Set(['sourceBootstrapCommit','savedWorkBootstrap','savedWorkSuccessor','humanLibraryCommit']);
  let localPlan=await prepareGroupCheckpointPlan(this.live,localOperations);if([...localPlan.groups,...remotePlan.groups].some(g=>!allowed.has(g.type)))fail('BNS_GROUP_MERGE_OWNER_UNSUPPORTED');
  const combined=new Map(localOperations.map(op=>[op.revisionId,op]));for(const g of remotePlan.groups)for(const op of g.operations){const old=combined.get(op.revisionId);if(old&&!equal(old,op))fail('BNS_GROUP_DUPLICATE');combined.set(op.revisionId,op);}
  if(bytes([...combined.values()]).length>2*1024*1024)fail('BNS_GROUP_RESOURCE_LIMIT');const merged=await prepareGroupCheckpointPlan(this.live,[...combined.values()]),known=new Set(localOperations.map(op=>op.revisionId)),incoming=merged.groups.filter(g=>g.operations.some(op=>!known.has(op.revisionId)));
  if(incoming.some(g=>g.type==='savedWorkSuccessor'?g.operations.length!==1:g.type!=='humanLibraryCommit'||!['entry','entry-edit'].includes(g.prepared.descriptor.value.kind)))fail('BNS_GROUP_MERGE_OWNER_UNSUPPORTED');if(state.savedMerge&&state.savedMerge.digest!==merged.digest)fail('BNS_RESTORE_LOCAL_CHANGED');
  const remoteOperations=remotePlan.groups.flatMap(g=>g.operations),receipts=remoteOperations.map(o=>({operationId:o.operationId,revisionId:o.revisionId,deviceId:o.deviceId,sequence:o.sequence}));
  for(let index=0;index<Math.max(1,incoming.length);index++){
   current();const group=incoming[index],stepOperations=group?.operations??[],operation=group?.type==='savedWorkSuccessor'?group.operations[0]:null,humanApplication=group?.type==='humanLibraryCommit'?await prepareHumanIncrementalGroupApplication(this.store,this.live,localPlan,[group]):null,prepared=operation?await prepareSavedWorkReceive(this.store,this.live,operation):null;if(prepared?.conflict||prepared?.duplicate)fail('BNS_RESTORE_LOCAL_CHANGED');
   const nextPlan=group?await prepareGroupCheckpointPlan(this.live,[...localOperations,...stepOperations]):localPlan,before=await prepareGroupScope(localPlan,{store:this.store}),after=await prepareGroupScope(nextPlan,{store:this.store}),complete=index===incoming.length-1||!incoming.length,previous=state;
   const result=await this.store.foundationWrite(async t=>{
    current();if(!equal(await this.stage.get(t,'restore'),previous)||!equal(await authority(this.store,this.live,t),previous.savedMerge?.base??previous.base))fail('BNS_RESTORE_LOCAL_CHANGED');
    await requireNoSourcePurgeDeny(this.live,t);await requireConsumerPublicationSettled(t);await this.store.qualifyControlPublicationRead(t);await requireCommittedPlan(this.live,t,localPlan);
    if(humanApplication)await requireHumanGroupApplication(t,humanApplication);const retention=await prepareSavedMixedRetention(this.store,this.live,t,before,prepared,this.stage,after,humanApplication);await requireGroupScope(this.store,t,before,retention);
    for(const kind of ['pending','publicationActive'])if((await t.primaryRangePage('meta',{prefix:await this.live.idIn(t,kind),limit:1})).rows.length)fail('BNS_RESTORE_LIVE_PENDING');
    if(operation)await commitSavedWorkEdit(t,prepared,this.store);else if(humanApplication)await applyHumanGroupStep(t,humanApplication,group.id);
    await requireCommittedPlan(this.live,t,nextPlan);await requireGroupScope(this.store,t,after,retention);await sealSavedWorkCurrentScope(this.store,this.live,t,after);
    const base=await authority(this.store,this.live,t),nextBase={...base,ownerGeneration:base.ownerGeneration+(t.backupChanged?1:0)},completed=[...(previous.savedMerge?.completed??[]),...stepOperations.map(op=>op.revisionId)];
    const next={...withoutId(previous),phase:complete?'merged':'merging-saved',savedMerge:{digest:merged.digest,completed,base:nextBase}};
    const intents=[],merge=complete?{version:1,restoreId:this.restoreId,namespace:base.namespace,epoch:base.fence.epoch,manifestId:state.manifestId,graphDigest:state.graphDigest,mergeDigest:merged.digest,receipts}:null;
    if(complete){if(await this.live.get(t,'mergeCommit',this.restoreId))fail('BNS_RESTORE_ID_COLLISION');intents.push({id:await this.live.idIn(t,'mergeCommit',this.restoreId),...merge});Object.assign(next,{mergeNamespace:base.namespace,mergeDigest:merged.digest,mergeReceipts:receipts});}
    intents.push({id:await this.stage.idIn(t,'restore'),...next});await sealSavedMixedRetention(this.store,this.live,t,retention,this.stage,intents);await sealSavedWorkMergeProgress(this.store,this.live,t,this.stage,started,intents);await this.checkpoint('before-saved-step-commit',t);
    if(merge)await this.live.put(t,'mergeCommit',[this.restoreId],merge);await this.stage.put(t,'restore',[],next);await this.checkpoint('after-saved-step-commit',t);current();return {state:complete?'activated':'partial',namespace:base.namespace,merged:complete};
   },{ms:Math.max(1,Math.floor(30000-(performance.now()-started)))});
   state=await this.stage.read('restore');await this.checkpoint('saved-step-settled',group?.id??null);current();if(complete)return result;localOperations.push(...stepOperations);localPlan=nextPlan;
  }
 }
 // A bounded first nonempty consumer: merge only the four original manual
 // owners. All other populated families still require their named merge owner.
 // Keep the live namespace, local outbox and private ranking. Never clear the
 // canonical database or activate an incoming snapshot over local work.
 async mergeManual(state,remotePlan,localOperations){
  const started=performance.now(),allowed=new Set(['promptPreferences','contextItem','contextRulesItem','contextNowItem']);
  const localPlan=await prepareGroupCheckpointPlan(this.live,localOperations);
  if([...localPlan.groups,...remotePlan.groups].some(g=>!allowed.has(g.type)))fail('BNS_GROUP_MERGE_OWNER_UNSUPPORTED');
  const combined=new Map(localOperations.map(op=>[op.revisionId,op]));
  for(const g of remotePlan.groups)for(const op of g.operations){const old=combined.get(op.revisionId);if(old&&!equal(old,op))fail('BNS_GROUP_DUPLICATE');combined.set(op.revisionId,op);}
  const operations=[...combined.values()];if(bytes(operations).length>2*1024*1024)fail('BNS_GROUP_RESOURCE_LIMIT');
  // Original graph compiler rejects same-field forks, missing ancestors and
  // sequence collisions before any write. No timestamp selects a winner.
  const merged=await prepareGroupCheckpointPlan(this.live,operations),before=await prepareGroupScope(localPlan,{store:this.store}),after=await prepareGroupScope(merged,{store:this.store});
  const known=new Set(localOperations.map(op=>op.revisionId)),incoming=merged.groups.filter(g=>!known.has(g.id));
  const core=new BrowserNativeSyncCore(this.live.repository,{datasetId:this.live.datasetId,deviceId:this.live.deviceId,namespace:state.base.namespace==='initial'?null:state.base.namespace});core.materialize=manualSyncOwners(core).materialize;
  const receipts=remotePlan.groups.map(g=>{const o=g.operations[0];return {operationId:o.operationId,revisionId:o.revisionId,deviceId:o.deviceId,sequence:o.sequence};});
  return this.store.run(()=>this.live.transaction(true,async t=>{
   await requireNoSourcePurgeDeny(this.live,t);
   registerRepositoryWorkLimit(this.store.repository,t,{references:4096,bytes:2*1024*1024,ms:30000-(performance.now()-started)});
   const current=await this.stage.get(t,'restore');if(!equal(current,state))fail('BNS_RESTORE_STAGE_CHANGED');
   if(!equal(await authority(this.store,this.live,t),state.base))fail('BNS_RESTORE_LOCAL_CHANGED');
   await requireConsumerPublicationSettled(t);await this.store.qualifyControlPublicationRead(t);
   await requireCommittedPlan(this.live,t,localPlan);await requireGroupScope(this.store,t,before);
   for(const kind of ['pending','publicationActive'])if((await t.primaryRangePage('meta',{prefix:await this.live.idIn(t,kind),limit:1})).rows.length)fail('BNS_RESTORE_LIVE_PENDING');
   for(const group of incoming){if(performance.now()-started>=30000)fail('BNS_GROUP_RESOURCE_LIMIT');const result=await core.applyInTransaction(t,group.operations[0]);if(result.state!=='applied')fail('BNS_GROUP_CAUSAL_GAP');await this.checkpoint('applied-merge-group',group.id);}
   await this.checkpoint('before-merge-commit',t);
   await requireCommittedPlan(this.live,t,merged);await requireGroupScope(this.store,t,after);
   const expected={...state.base,generation:state.base.generation+incoming.length};if(!equal(await authority(this.store,this.live,t),expected))fail('BNS_RESTORE_LOCAL_CHANGED');
   if(await core.get(t,'mergeCommit',this.restoreId))fail('BNS_RESTORE_ID_COLLISION');
   await core.put(t,'mergeCommit',[this.restoreId],{version:1,restoreId:this.restoreId,namespace:state.base.namespace,epoch:state.base.fence.epoch,manifestId:state.manifestId,graphDigest:state.graphDigest,mergeDigest:merged.digest,receipts});
   await this.stage.put(t,'restore',[],{...withoutId(state),phase:'merged',mergeNamespace:state.base.namespace,mergeDigest:merged.digest,mergeReceipts:receipts});
   await sealManualMergeTransaction(this.store,this.live,t,{started,stage:this.stage});
   await this.checkpoint('after-merge-commit',t);
   return {state:'activated',namespace:state.base.namespace,merged:true};
  }));
 }
 async confirmManualMerge(state){
  return this.store.run(()=>this.live.transaction(false,async t=>{
   if(!equal(await this.stage.get(t,'restore'),state)||await this.live.bind(t)!==state.mergeNamespace||await readRestoreEpoch(t)!==state.base.fence.epoch)fail('BNS_RESTORE_LOCAL_CHANGED');
   await requireConsumerPublicationSettled(t);
   if(!Array.isArray(state.mergeReceipts)||state.mergeReceipts.length>4096||bytes(state.mergeReceipts).length>2*1024*1024)fail('BNS_RESTORE_STAGE_CHANGED');
   const committed=await this.live.get(t,'mergeCommit',this.restoreId);
   if(!committed||!equal(withoutId(committed),{version:1,restoreId:this.restoreId,namespace:state.mergeNamespace,epoch:state.base.fence.epoch,manifestId:state.manifestId,graphDigest:state.graphDigest,mergeDigest:state.mergeDigest,receipts:state.mergeReceipts}))fail('BNS_GROUP_COMMIT_UNPROVEN');
   for(const o of state.mergeReceipts){const receipt=await this.live.get(t,'receipt',o.operationId),sequence=await this.live.get(t,'sequence',o.deviceId,String(o.sequence).padStart(16,'0'));if(!receipt||!sequence||!equal(withoutId(receipt),{digest:o.revisionId,deviceId:o.deviceId,sequence:o.sequence})||!equal(withoutId(sequence),{operationId:o.operationId,digest:o.revisionId}))fail('BNS_GROUP_COMMIT_UNPROVEN');}
   return {state:'activated',namespace:state.mergeNamespace,merged:true};
  }));
 }
 async cleanup({abandon=false,limit=100,publication=null}={}){
  const bound=publication?sourceUnionPublicationCleanup.get(publication):null;
  const checkPublication=()=>{if(!publication)return;if(!bound||bound.restore!==this||abandon||!requireOriginalCheckpointPublicationCleanup(bound.work,this.live,this.store))fail('BNS_SOURCE_UNION_PROOF_REQUIRED');};
  checkPublication();let cleanedState;
  if(typeof abandon!=='boolean'||!Number.isSafeInteger(limit)||limit<1||limit>100)fail('BNS_GROUP_CLEANUP_INVALID');
  const prior=await this.stage.read('restore');if(prior?.kind===sourceUnionKind){sourceUnionTicket(this);sourceUnionState(this,prior);if(prior.replayId!==await sourceUnionReplayId(this,prior.base,prior.selection))fail('BNS_RESTORE_STAGE_CHANGED');}
  const result=await this.stage.transaction(true,async t=>{
   checkPublication();const row=await this.stage.get(t,'restore');if(!row)fail('BNS_RESTORE_NOT_READY');
   if(bound){if(!equal(row,bound.state)||!equal(await t.get('meta',this.live.prefix+'active'),bound.active))fail('BNS_RESTORE_STAGE_CHANGED');await requireSourceUnionInventory(this,t,row,bound.items);checkPublication();}
   if(row.kind===sourceUnionKind||prior?.kind===sourceUnionKind){sourceUnionTicket(this);if(!equal(row,prior))fail('BNS_RESTORE_STAGE_CHANGED');await requireOrdinarySourceUnion(this,t);}
   const active=await t.get('meta',this.live.prefix+'active');
   if(!['activated','merged','abandoned'].includes(row.phase)&&!abandon)fail('BNS_RESTORE_NOT_READY');
   if(row.phase!=='activated'&&active?.namespace===row.replayId)fail('BNS_RESTORE_STAGE_CHANGED');
   const next={...withoutId(row),phase:['activated','merged'].includes(row.phase)?row.phase:'abandoned'},names=['activated','merged'].includes(row.phase)?[this.stage.fixedNamespace]:[this.stage.fixedNamespace,row.replayId];
   if(next.cleanup?.complete)return {state:'cleaned',deleted:0,complete:true};
   let namespace=next.cleanup?.namespace??0,after=next.cleanup?.after??null,deleted=0;
   while(namespace<names.length&&deleted<limit){
    if(names[namespace]===active?.namespace)fail('BNS_RESTORE_STAGE_CHANGED');
    const page=await t.primaryRangePage('meta',{prefix:this.stage.prefix+'generation:'+names[namespace]+':',after,limit:Math.min(100,limit-deleted)});
    for(const {value}of page.rows)if(value.id!==row.id){checkPublication();await t.delete('meta',value.id);deleted++;}
    after=page.next;if(!after){namespace++;after=null;}
   }
   next.cleanup={namespace,after,complete:namespace===names.length};checkPublication();await this.stage.put(t,'restore',[],next);checkPublication();cleanedState={...next,id:row.id};
   return {state:next.cleanup.complete?'cleaned':'cleaning',deleted,complete:next.cleanup.complete};
  },['meta']);
  if(bound&&cleanedState)bound.state=cleanedState;checkPublication();return result;
 }
 async reconcileTail(operations,{ref,get,supported}={}){
  if(!ref||typeof get!=='function'||!Array.isArray(operations))fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
  ref=clone(ref);assertProtocolObjectReference(ref,this.profile);
  const old=await this.stage.read('restore');if(old?.phase!=='validated')fail('BNS_RESTORE_NOT_READY');
  if(old.kind===sourceUnionKind)fail('BNS_SOURCE_UNION_TAIL_UNSUPPORTED');
  const m=await manifest(ref,get,this.live,this.profile,supported);if(!m.parents.includes(old.manifestId))fail('BNS_GROUP_TAIL_INVALID');
  const oldItems=await stageItems(this.stage);
  const items=[];for await(const page of groupOperationPages(checkpointItems(m,get,{profile:this.profile})))for(const item of page){chargeRecoveryValue(this.stage,item);items.push(item);}
  const replay=new BrowserNativeSyncCore(this.live.repository,{datasetId:this.live.datasetId,deviceId:this.live.deviceId,namespace:old.replayId}),compiled=await compile(replay,items,m,this.store);
  const prior=new Map(oldItems.filter(x=>x.kind==='revision').map(x=>[x.operation.revisionId,x.operation])),next=new Map(items.filter(x=>x.kind==='revision').map(x=>[x.operation.revisionId,x.operation]));
  for(const [id,op]of prior)if(!equal(next.get(id)??null,op))fail('BNS_GROUP_TAIL_INVALID');
  const delta=[...next].filter(([id])=>!prior.has(id)).map(([,op])=>op),sort=rows=>[...rows].sort((a,b)=>String(a.revisionId).localeCompare(String(b.revisionId)));
  if(!equal(sort(delta),sort(operations)))fail('BNS_GROUP_TAIL_INVALID');
  await this.stage.transaction(true,async t=>{await requireNoSourcePurgeDeny(this.live,t);if(!equal(await this.stage.get(t,'restore'),old))fail('BNS_RESTORE_STAGE_CHANGED');if(!equal(await authority(this.store,this.live,t),old.base))fail('BNS_RESTORE_LOCAL_CHANGED');
   for(let i=0;i<oldItems.length;i++)await t.delete('meta',await this.stage.idIn(t,'groupItem',String(i).padStart(4,'0')));
   for(let i=0;i<items.length;i++)await this.stage.put(t,'groupItem',[String(i).padStart(4,'0')],{item:items[i]});
   await this.stage.put(t,'restore',[],{...withoutId(old),manifestId:ref.id,manifestRef:clone(ref),manifest:m,received:items.length,graphDigest:compiled.plan.digest});await requireStorageBudget(t,this.stage,old.replayId);
  },['meta']);return {state:'validated',operations:delta.length};
 }
}

// Only the actual completed LOCAL restore can authorize publication to consume
// its two remote heads. Selection DTOs and source-only rows do not suffice.
export async function requireActivatedSourceBootstrapUnion(core,{store,selection}={}){
 if(store?.repository!==core?.repository)fail('BNS_GROUP_BINDING');const ticket=currentOriginalRecoveryWork(core.repository);if(!ticket)fail('BNS_SOURCE_UNION_WORK_REQUIRED');checkOriginalRecoveryWork(core.repository,ticket);if(selection!==undefined)assertSourceBootstrapUnionSelection(selection);
 const active=await store.run(()=>core.transaction(false,t=>t.get('meta',core.prefix+'active')));
 if(!active||!own(active,['id','namespace','restoreId','selection','graphDigest'])||!opaque(active.restoreId)||selection!==undefined&&!equal(active.selection,selection))fail('BNS_SOURCE_UNION_ACTIVATION_REQUIRED');
 selection=clone(active.selection);assertSourceBootstrapUnionSelection(selection);
 const restore=new GroupedCheckpointRestore(core,{store,restoreId:active.restoreId});
 const row=await restore.stage.read('restore');if(row?.phase!=='activated')fail('BNS_SOURCE_UNION_ACTIVATION_REQUIRED');
 await restore.activate();checkOriginalRecoveryWork(core.repository,ticket);
 const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
 return Object.freeze({selection:freeze(clone(selection)),parents:Object.freeze(selection.headRefs.map(ref=>ref.id)),graphDigest:row.graphDigest,namespace:row.replayId,restoreId:active.restoreId});
}

// Full private cut survives discovery, but no recovery ticket is reopened.
// Only changed repository generations pay a new comparison on the EXISTING
// producer ledger. Its sole allowed changes are exact original transport
// controls authenticated against that producer's validated publication journal.
async function requireSourceUnionPublicationCut(work,cut,t,force=false){
 const {core,store}=cut;chargeOriginalCheckpointPublicationWork(work,core,store,undefined,0);
 try{requireRepositoryWriteFence(core.repository,cut.fence);if(!force)return cut.fence;}catch(error){if(error?.code!=='STALE_BASE')throw error;}
 const prefix=core.prefix+'generation:'+cut.namespace+':',control=row=>row.id.startsWith(prefix+'google-appdata-allocation:')||row.id.startsWith(prefix+'onedrive-upload-attempt:');
 for(const table of t.tx.objectStoreNames){
  const current=[];let after=null;for(;;){
   // These original tables are id-keyed. Bounded getAll returns the actual
   // values once, rather than rematerializing every key beside row.id.
   chargeOriginalCheckpointPublicationWork(work,core,store,after,1);const rows=await t.all(table,null,after===null?undefined:IDBKeyRange.lowerBound(after,true),64);chargeOriginalCheckpointPublicationWork(work,core,store,rows,rows.length);
   if(!Array.isArray(rows)||rows.length>64)fail('BNS_GROUP_PAGE_INVALID');for(const row of rows){if(typeof row?.id!=='string'||after!==null&&row.id<=after)fail('BNS_GROUP_PAGE_INVALID');current.push(row);after=row.id;}if(rows.length<64)break;
  }
  const expected=cut.tables.get(table);if(!expected)fail('BNS_SOURCE_UNION_PROOF_REQUIRED');chargeOriginalCheckpointPublicationWork(work,core,store,expected);
  if(table==='meta'){
   const oldControls=expected.filter(control),nowControls=current.filter(control);requireOriginalCheckpointPublicationControls(work,core,store,nowControls,cut.namespace);
   if(oldControls.some(row=>!equalSourceWorkingPhysicalTree(nowControls.find(now=>now.id===row.id),row))||!equalSourceWorkingPhysicalTree(current.filter(row=>!control(row)),expected.filter(row=>!control(row))))fail('BNS_SOURCE_UNION_CONTINUATION_INVALID');
  }else if(!equalSourceWorkingPhysicalTree(current,expected))fail('BNS_SOURCE_UNION_CONTINUATION_INVALID');
 }
 if([...t.tx.objectStoreNames].length!==cut.tables.size)fail('BNS_SOURCE_UNION_PROOF_REQUIRED');
 cut.fence=observeRepositoryWriteFence(core.repository);return cut.fence;
}

// Separate publication continuation: the original restore acknowledgment above
// remains exact. Only receipt-declared historical operations reauthenticate the
// old union; the complete current graph must independently prove fresh local
// Source groups and all of their original physical/protocol provenance.
export async function requireSourceBootstrapUnionPublication(core,{store,selection,publicationWork=null}={}){
 if(store?.repository!==core?.repository)fail('BNS_GROUP_BINDING');const ticket=currentOriginalRecoveryWork(core.repository);if(!ticket)fail('BNS_SOURCE_UNION_WORK_REQUIRED');checkOriginalRecoveryWork(core.repository,ticket);if(selection!==undefined)assertSourceBootstrapUnionSelection(selection);
 const active=await store.run(()=>core.transaction(false,t=>t.get('meta',core.prefix+'active')));
 if(!active||!own(active,['id','namespace','restoreId','selection','graphDigest'])||!opaque(active.restoreId)||selection!==undefined&&!equal(active.selection,selection))fail('BNS_SOURCE_UNION_ACTIVATION_REQUIRED');
 const restore=new GroupedCheckpointRestore(core,{store,restoreId:active.restoreId});sourceUnionTicket(restore);
 let state=await restore.stage.read('restore');sourceUnionState(restore,state);
 if(state.phase!=='activated'||state.replayId!==await sourceUnionReplayId(restore,state.base,state.selection)||!equal(active,{id:core.prefix+'active',namespace:state.replayId,restoreId:restore.restoreId,selection:state.selection,graphDigest:state.graphDigest}))fail('BNS_SOURCE_UNION_ACTIVATION_REQUIRED');
 const replay=new BrowserNativeSyncCore(core.repository,{datasetId:core.datasetId,deviceId:core.deviceId,namespace:state.replayId}),operations=await allOperations(replay);
 if(operations.length>CORE_LIMITS.batch)fail('BNS_GROUP_RESOURCE_LIMIT');if(operations.some(op=>!['sourceBootstrapMember','sourceBootstrapCommit','sourceAppendMember','sourceAppendCommit','inputWorkingMember','inputWorkingCommit'].includes(op.type)))fail('BNS_GROUP_OWNER_UNSUPPORTED');
 if(!Array.isArray(state.receipt?.cuts)||state.receipt.cuts.length!==3||state.receipt.cuts.some(cut=>!Array.isArray(cut.items)))fail('BNS_RESTORE_STAGE_CHANGED');
 // Do not let a caller choose an arbitrary old subset. The original receipt's
 // own ordered hash chains authenticate every declared revision and each cut.
 const ids=new Set(state.receipt.cuts.flatMap(cut=>cut.items.filter(item=>item.kind==='revision').map(item=>item.revisionId))),original=operations.filter(op=>ids.has(op.revisionId));
 const proof=await prepareStoredSourceBootstrapUnion(core,{store,receipt:state.receipt,operations:original}),packet=readSourceBootstrapUnionProof(proof,{core,store});
 if(packet.items.length!==state.received||packet.graphDigest!==state.graphDigest)fail('BNS_RESTORE_STAGE_CHANGED');
 const plan=await prepareGroupCheckpointPlan(replay,operations),groups=sourceUnionPublicationGroups(core,plan,packet),canonical=await prepareGroupScope(plan,{store}),frontiers=new Map();
 for(const op of operations)frontiers.set(op.deviceId,acceptSequence(frontiers.get(op.deviceId),op.sequence));
 const protocol=sourceUnionProtocolRows(replay,{operations,heads:plan.heads,frontiers:[...frontiers].map(([deviceId,value])=>({deviceId,...value}))},state.base.fence.epoch);
 for(const group of groups.added)for(const op of group.operations){const id=protocolPhysicalId(replay.prefix,replay.fixedNamespace,'outbox',[op.operationId]);protocol.set(id,{id,operationId:op.operationId,revisionId:op.revisionId,state:'queued'});}
 if(groups.added.length){const id=protocolPhysicalId(replay.prefix,replay.fixedNamespace,'device',[core.deviceId]);protocol.set(id,{id,sequence:groups.added.reduce((n,group)=>n+group.operations.length,0)});}
 for(const group of groups.working)for(const op of group.prepared.members){const value=op.value.entity,kind=op.value.entityType==='input'?'workingOwner':op.value.entityType==='revision'?'workingHistory':null;if(kind){const id=protocolPhysicalId(replay.prefix,replay.fixedNamespace,kind,[value.id]);protocol.set(id,{id,revisionId:op.revisionId,...(kind==='workingOwner'?{deltaSequence:group.prepared.members.find(item=>item.value.entityType==='inputState').value.entity.deltaSequence}:{sequence:value.sequence})});}}
 const prefix=replay.prefix+'generation:'+state.replayId+':',controls=await store.run(()=>replay.transaction(false,async t=>(await readGroupRows(t,'meta',{prefix})).filter(row=>row.id.startsWith(prefix+'google-appdata-allocation:')||row.id.startsWith(prefix+'onedrive-upload-attempt:')),['meta']));
 for(const row of await requireSourcePurgeProtocolControlReceipts(store,core,controls,state.replayId)){if(protocol.has(row.id))fail('BNS_RESTORE_STAGE_CHANGED');protocol.set(row.id,row);}
 const identity=await prepareSourceUnionLocalIdentity(restore),cleanup=publicationWork&&requireOriginalCheckpointPublicationCleanup(publicationWork,core,store)&&!state.cleanup?.complete;
 const verify=retain=>store.run(()=>core.transaction(false,async t=>{
  await requireOrdinarySourceUnion(restore,t);await requireSourceBootstrapUnionProof(proof,{core,store},t);await requireSourceUnionInventory(restore,t,state,packet.items);
  if(!equal(await restore.stage.get(t,'restore'),state)||!equal(await t.get('meta',active.id),active))fail('BNS_RESTORE_LOCAL_CHANGED');
  const current=await authority(store,core,t);if(current.namespace!==state.replayId||current.generation!==operations.length||!Number.isSafeInteger(current.ownerGeneration)||current.ownerGeneration<state.base.ownerGeneration+1+groups.added.length||current.fence.epoch!==state.base.fence.epoch||!equal(current.settings,state.base.settings))fail('BNS_RESTORE_LOCAL_CHANGED');
  await requireSourceUnionProtocol(replay,t,protocol);await requireGroupScope(store,t,canonical);
  await requireSourceUnionPublicationPhysical(core,t,state.sourceCut,await sourceUnionPhysicalCut(t,identity,{groups:groups.working,cut:state.sourceCut}),groups,canonical);
  if(publicationWork&&retain){
   chargeOriginalCheckpointPublicationWork(publicationWork,core,store,undefined,0);const tables=new Map();
   for(const table of t.tx.objectStoreNames)tables.set(table,await readGroupRows(t,table));
   if(sourceUnionPublicationCuts.has(publicationWork))fail('BNS_SOURCE_UNION_PROOF_REQUIRED');sourceUnionPublicationCuts.set(publicationWork,{core,store,namespace:state.replayId,tables,fence:observeRepositoryWriteFence(core.repository)});
  }
 }));await verify(!cleanup);checkOriginalRecoveryWork(core.repository,ticket);
 if(cleanup){
  // Explicit publication preparation completes the original activated-stage
  // owner before retaining its cut. Discovery/publish never gain this write.
  // Both proof passes and every cleanup page consume this same recovery ticket.
  const token=Object.freeze({});sourceUnionPublicationCleanup.set(token,{restore,work:publicationWork,state,active,items:packet.items});
  try{for(;;){checkOriginalRecoveryWork(core.repository,ticket);if((await restore.cleanup({publication:token})).complete)break;}state=sourceUnionPublicationCleanup.get(token).state;sourceUnionState(restore,state);await verify(true);checkOriginalRecoveryWork(core.repository,ticket);}
  finally{sourceUnionPublicationCleanup.delete(token);}
 }
 return {selection:clone(state.selection),parents:state.selection.headRefs.map(ref=>ref.id),graphDigest:plan.digest,namespace:state.replayId,restoreId:restore.restoreId};
}

// Fixed original-owner entry for CanonicalGenerationPublication. No supplied
// callback, public receipt DTO or activated return value grants graph validity.
export async function requireOriginalCanonicalGenerationActivation(restore,proof,t){
 const held=canonicalGenerationPublications.get(restore);
 if(!held||held.proof!==proof||canonicalGenerationProofs.get(restore)!==proof)fail('BNS_GENERATION_PROOF_REQUIRED');
 const {store,live}=originalGenerationBinding(restore),{state,verified,replay,plan,canonical}=held;
 if(await t.get('meta','canonical-generation:repository-protection:v1')){requireOriginalLibraryDocumentsGenerationMethods(store);requireOriginalGenerationCoreMethods(live);requireOriginalGenerationCoreMethods(restore.stage);}
 registerRepositoryWorkLimit(store.repository,t);
 await requireCanonicalCheckpointInputProof(proof,{store,core:live},t);
 const active={id:live.prefix+'active',namespace:state.replayId,manifestId:state.manifestId,graphDigest:state.graphDigest};
 if(!equal((await t.get('meta',state.id))??null,state)||!equal((await t.get('meta',active.id))??null,active))fail('BNS_RESTORE_STAGE_CHANGED');
 const now=await authority(store,live,t);
 if(now.namespace!==state.replayId||now.fence.epoch!==state.base.fence.epoch||!equal(now.settings,state.base.settings))fail('BNS_RESTORE_LOCAL_CHANGED');
 await requireConsumerPublicationSettled(t);await store.qualifyControlPublicationRead(t);
 await requireCommittedPlan(replay,t,plan);await requireGroupScope(store,t,canonical);
 await requireContextGenerationPublication(t,store,replay,plan,held.contextPublication);
 // A bounded physical closure includes extra/removed rows and protocol facts,
 // not merely the active pointer. The publication owner owns the sole gate
 // mutation; its own terminal fence pins the new sealed gate value.
 const snapshots=[];
 for(const table of t.tx.objectStoreNames){
  const rows=[];let after=null;
  do{const page=await t.primaryRangePage(table,{after,limit:64});for(const row of page.rows)if(table!=='meta'||row.key!=='canonical-generation:gate:v1')rows.push([row.key,clone(row.value)]);after=page.next;}while(after);
  snapshots.push({table,count:await t.count(table),rows});
 }
 registerRepositoryFinalReadFence(store.repository,t,{isCurrent:()=>true,plan:function*(){
  for(const snapshot of snapshots){
   if((yield {method:'count',table:snapshot.table})!==snapshot.count)fail('BNS_RESTORE_STAGE_CHANGED');
   for(const [key,value]of snapshot.rows)if(!equalSourceWorkingPhysicalTree(yield {method:'get',table:snapshot.table,key},value))fail('BNS_RESTORE_STAGE_CHANGED');
  }return true;
 }});
 return Object.freeze({manifestId:state.manifestId,graphDigest:state.graphDigest,generationIdentity:verified.generationIdentity});
}

// Read-only existing-library inheritance evidence. The original compiler and
// canonical owner qualify every represented family; this opaque proof grants no
// write, provider or activation capability and never initializes Foundation.
const applicationInheritanceCuts=new WeakMap();
export async function prepareOriginalApplicationInheritanceCut(store,core){
 requireOriginalLibraryDocumentsGenerationMethods(store);requireOriginalGenerationCoreMethods(core);
 if(store.repository!==core.repository||store.loaded!==true||!store.repository.db)fail('BNS_GROUP_BINDING');
 const observation=await observeOriginalControlPublication(store),tail=store.tail,repository=store.repository;
 const plan=await prepareGroupCheckpointPlan(core,await allOperations(core)),scope=await prepareGroupScope(plan,{store});
 const held={store,core,repository,datasetId:core.datasetId,prefix:core.prefix,fixedNamespace:core.fixedNamespace,db:repository.db,tail,observation:observation.token,plan,scope,canonicalDigest:await digest(scope.ownerScope),cut:null,control:clone(observation.row)};
 const token=Object.freeze(Object.create(null));applicationInheritanceCuts.set(token,held);
 held.cut=await requireOriginalApplicationInheritanceCut(token);return token;
}
export async function requireOriginalApplicationInheritanceCut(token){
 const p=applicationInheritanceCuts.get(token);if(arguments.length!==1||!p)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
 const {store,core,repository}=p;
 const current=()=>{requireOriginalLibraryDocumentsGenerationMethods(store);requireOriginalGenerationCoreMethods(core);if(store.repository!==repository||core.repository!==repository||repository.db!==p.db||store.tail!==p.tail||core.datasetId!==p.datasetId||core.prefix!==p.prefix||core.fixedNamespace!==p.fixedNamespace)fail('BNS_SNAPSHOT_CHANGED');requireOriginalControlObservation(store,p.observation);};
 current();const observed=await observeOriginalControlPublication(store,p.observation);if(!equal(observed.row,p.control))fail('BNS_SNAPSHOT_CHANGED');
 const cut=await core.transaction(false,async t=>{const value=await authority(store,core,t);await store.qualifyControlPublicationRead(t);await requireCommittedPlan(core,t,p.plan);await requireGroupScope(store,t,p.scope);return value;});current();
 if(p.cut!==null&&!equal(cut,p.cut))fail('BNS_SNAPSHOT_CHANGED');
 return clone(cut);
}
export function readOriginalApplicationInheritanceCut(token){
 const p=applicationInheritanceCuts.get(token);if(!p||!p.cut)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');requireOriginalControlObservation(p.store,p.observation);
 return Object.freeze({datasetId:p.datasetId,databaseName:p.repository.name,databaseId:p.control.databaseId,namespace:p.cut.namespace,epoch:p.cut.fence,graphDigest:p.plan.digest,canonicalDigest:p.canonicalDigest,control:clone(p.control)});
}
