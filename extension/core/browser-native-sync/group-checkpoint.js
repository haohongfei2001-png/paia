import {readCanonicalCheckpointProof,requireCanonicalCheckpointProof,requireCanonicalCheckpointInputProof} from './canonical-generation-checkpoint-stage.js';
import {equalSourceWorkingPhysicalTree} from './source-working-physical.js';
import {readGroupRows} from './group-page-reader.js';
import {originalGenerationRepositoryTransaction,requireRepositoryTransactionDataMethods,registerRepositoryWorkLimit,registerRepositoryFinalReadFence} from '../idb-repository.js';
import {ArchiveError} from '../constants.js';
import {observeOriginalControlPublication,requireOriginalControlObservation,requireOriginalControlObservationSelectionTail,renewOriginalControlObservationSelectionTail} from '../indexed-store.js';
import {requireOriginalLibraryDocumentsGenerationMethods} from '../library-documents-owner.js';
import {captureSourceWorkingCurrentGroupProjection,requireSourceWorkingCurrentGroupProjection,encodeSourceWorkingCurrentGroupCheckpoint,publishSourceWorkingCurrentGroupCheckpoint,captureMixedCurrentGroupProjection,requireMixedCurrentGroupProjection,encodeMixedCurrentGroupCheckpoint,publishMixedCurrentGroupCheckpoint,releaseHumanCurrentUnindexedProjection} from './human-library-plan.js';
import {InputWorkingCommitReceiver,prepareWorkingApplication} from './input-working-commit.js';
import {prepareHumanGroupApplication,requireHumanGroupApplication,applyHumanGroupStep} from './human-library-group.js';
import {FilterIntentSyncJournal,prepareRestoredFilterSources,prepareFilterApplication} from './filter-intent-journal.js';
import {manualSyncOwners} from './manual-owners.js';
import {contextDesiredMaterializer} from './context-desired-journal-owner.js';
import {BrowserNativeSyncCore,requireOriginalGenerationCoreMethods,acceptSequence,CORE_LIMITS} from './core.js';
import {buildCheckpoint,checkpointItems} from './checkpoints.js';
import {protocolObject,readObject,SEGMENT_PROFILE} from './segments.js';
import {prepareGroupCheckpointPlan} from './group-checkpoint-plan.js';
import {prepareGroupScope,requireGroupScope,prepareGroupCurrentProjection,requireGroupCurrentProjection,encodeGroupCurrentProjection,publishGroupCurrentProjection,releaseGroupCurrentProjection} from './group-checkpoint-scope.js';
import {prepareBootstrapApplication,applyBootstrapApplication} from './source-bootstrap-receive.js';
import {prepareAppendApplication,applyAppendApplication} from './source-append-receive.js';
import {JournalRestoreFence,readRestoreEpoch,materializePromptBinding} from './prompt-journal.js';
import {CONSENT_VERSION} from '../constants.js';
import {bytes,clone,decodeJSON,digest,equal,exact,fail,hash,opaque,SyncError} from './value.js';
import {assertGroupedCheckpointManifest} from './group-checkpoint-manifest.js';
import {awaitRepositoryTransactionSettled,requireRepositoryCommittedIdentity} from '../idb-repository.js';
import {finalConsumerPreferenceOperations,prepareRestoredConsumerPreferenceApplication,applyRestoredConsumerPreferenceOwners} from './consumer-preference-restore.js';
import {CONSUMER_PUBLICATION_PENDING_ID,requireConsumerPublicationSettled} from './consumer-publication-state.js';
import {topicDesiredMaterializer} from './topic-desired-journal.js';
const own=(x,keys)=>exact(x,keys)&&Object.keys(x).length===keys.length;
const withoutId=({id,...row})=>row;
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
async function allOperations(core){const operations=[];for await(const row of core.rows('revision')){if(row.redacted)fail('BNS_GROUP_OWNER_UNSUPPORTED');if(operations.length===128)fail('BNS_GROUP_RESOURCE_LIMIT');operations.push(row.operation);}return operations;}
async function stageItems(stage){return stage.transaction(false,async t=>(await readGroupRows(t,'meta',{prefix:await stage.idIn(t,'groupItem')})).map(row=>row.item),['meta']);}
async function requireCommittedPlan(core,t,plan){
 const operations=plan.groups.flatMap(group=>group.operations);
 for(const op of operations){
  const revision=await core.get(t,'revision',op.revisionId),receipt=await core.get(t,'receipt',op.operationId),sequence=await core.get(t,'sequence',op.deviceId,String(op.sequence).padStart(16,'0'));
  if(!revision||revision.redacted||!equal(revision.operation,op)||!receipt||!equal(withoutId(receipt),{digest:op.revisionId,deviceId:op.deviceId,sequence:op.sequence})||!sequence||!equal(withoutId(sequence),{operationId:op.operationId,digest:op.revisionId}))fail('BNS_GROUP_COMMIT_UNPROVEN');
 }
 const heads=[];let after=null;do{const page=await t.primaryRangePage('meta',{prefix:await core.idIn(t,'head'),after,limit:100});for(const {value}of page.rows){if(heads.length===128)fail('BNS_GROUP_RESOURCE_LIMIT');heads.push(withoutId(value));}after=page.next;}while(after);
 heads.sort((a,b)=>JSON.stringify([a.type,a.entityId]).localeCompare(JSON.stringify([b.type,b.entityId])));
 if(!equal(heads,plan.heads))fail('BNS_GROUP_COMMIT_UNPROVEN');
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
export async function buildGroupedCheckpoint(core,transport,{store,profile=SEGMENT_PROFILE,parents=[],currentHumanProjection=false,currentSourceWorkingProjection=false,currentMixedProjection=false}={}){
 if([currentHumanProjection,currentSourceWorkingProjection,currentMixedProjection].some(value=>typeof value!=='boolean')||Number(currentHumanProjection)+Number(currentSourceWorkingProjection)+Number(currentMixedProjection)>1)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
 if(currentMixedProjection)return buildCurrentSourceWorkingCheckpoint(core,transport,store,profile,parents,true);
 if(currentSourceWorkingProjection)return buildCurrentSourceWorkingCheckpoint(core,transport,store,profile,parents);
 if(store?.repository!==core.repository)fail('BNS_GROUP_BINDING');await store.finishFoundation();
 const cut=await store.run(()=>core.transaction(false,t=>authority(store,core,t))),plan=await prepareGroupCheckpointPlan(core,await allOperations(core)),scope=await prepareGroupScope(plan,{store});
 const verifyCut=async()=>{let originalScope,calls=0;const check=()=>core.transaction(false,async t=>{if(++calls!==1)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');originalScope=t;if(currentHumanProjection)await requireGroupCurrentProjection(store,core,t,scope,plan);else{if(!equal(await authority(store,core,t),cut))fail('BNS_SNAPSHOT_CHANGED');await requireCommittedPlan(core,t,plan);await requireGroupScope(store,t,scope);}});
  // The native certificate pins the settled Store tail. Direct readonly Core
  // inspection leaves that tail intact; a genuine Store operation invalidates
  // it. Never rebind the tail to accommodate an intervening queued operation.
  if(currentHumanProjection){await check();if(calls!==1)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');await awaitRepositoryTransactionSettled(core.repository,originalScope);requireRepositoryCommittedIdentity(core.repository,originalScope);}else await store.run(check);
 };
 let currentPrepared=false;try{if(currentHumanProjection){await prepareGroupCurrentProjection(store,core,scope,plan);currentPrepared=true;}
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
 await verifyCut();
 return {ref,manifest,cut:currentHumanProjection?checkpoint.cut:cut};
 }catch(error){if(currentHumanProjection&&error?.code==='BNS_HUMAN_CHANGED')fail('BNS_SNAPSHOT_CHANGED');throw error;}finally{if(currentPrepared)releaseGroupCurrentProjection(scope);}
}
async function manifest(ref,get,core,profile,supported){
 if(ref?.kind!=='checkpoint-manifest')fail('BNS_CHECKPOINT_INVALID');
 const v=decodeJSON(await readObject(ref,get,{profile}),profile.decoded);
 assertGroupedCheckpointManifest(v,{core,supported});return v;
}
async function compile(core,items,manifest,store,recoveryWork=null){
 const scope=manifest.ownerScope;
 const operations=[],heads=[],frontiers=[];for(const item of items){
  if(item.kind==='revision'&&own(item,['kind','operation','redacted'])&&item.redacted===false)operations.push(item.operation);
  else if(item.kind==='head'&&own(item,['kind','type','entityId','revisions','purged','fence'])){const{kind,...row}=item;heads.push(row);}
  else if(item.kind==='frontier'&&own(item,['kind','deviceId','frontier','ranges'])){const{kind,...row}=item;frontiers.push(row);}
  else fail('BNS_GROUP_OWNER_UNSUPPORTED');
 }
 const plan=await prepareGroupCheckpointPlan(core,operations),canonical=await prepareGroupScope(plan,{store,recoveryWork});
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
export async function validateGroupedCheckpointGraph(core,items,manifest,{store,recoveryWork=null}={}){
 if(store?.repository!==core?.repository||!core?.repository)fail('BNS_GROUP_BINDING');
 assertGroupedCheckpointManifest(manifest,{core});
 return (await compile(core,items,manifest,store,recoveryWork)).plan.digest;
}
// The explicit phased task reuses the same complete original compiler once.
// A branded plan is semantic input only; it grants no repository writer.
export async function prepareValidatedGroupedCheckpointGraph(core,items,manifest,{store,recoveryWork=null}={}){
 if(store?.repository!==core?.repository||!core?.repository)fail('BNS_GROUP_BINDING');
 assertGroupedCheckpointManifest(manifest,{core});return (await compile(core,items,manifest,store,recoveryWork)).plan;
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
export class GroupedCheckpointRestore{
 constructor(core,{store,restoreId,profile=SEGMENT_PROFILE,checkpoint=defaultCheckpoint}){
  if(store?.repository!==core.repository||!opaque(restoreId))fail('BNS_GROUP_BINDING');this.store=store;this.live=core;this.restoreId=restoreId;this.profile=profile;this.checkpoint=checkpoint;
  this.stage=new BrowserNativeSyncCore(core.repository,{datasetId:core.datasetId,deviceId:core.deviceId,namespace:restoreId});canonicalGenerationBindings.set(this,{store,live:core,stage:this.stage,restoreId});
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
  canonicalGenerationPublications.set(this,{proof,verified,state,replay,...compiled});
  return {state:'publication-prepared',manifestId:state.manifestId,graphDigest:state.graphDigest};
 }
 async begin(ref,get,{supported}={}){
  const {store,live,stage}=this;await store.finishFoundation();
  const base=await store.run(()=>live.transaction(false,t=>authority(store,live,t))); // before first get
  const m=await manifest(ref,get,live,this.profile,supported),replayId=crypto.randomUUID();
  return store.run(()=>stage.transaction(true,async t=>{
   if(!equal(await authority(store,live,t),base))fail('BNS_RESTORE_LOCAL_CHANGED');
   const old=await stage.get(t,'restore');if(old){if(old.manifestId!==ref.id)fail('BNS_RESTORE_ID_COLLISION');return old;}
   if((await t.primaryRangePage('meta',{prefix:stage.prefix+'generation:'+stage.fixedNamespace+':',limit:1})).rows.length)fail('BNS_RESTORE_ID_COLLISION');
   const row={manifestId:ref.id,manifestRef:clone(ref),manifest:m,phase:'staging',base,replayId,received:0};await stage.put(t,'restore',[],row);return row;
  }));
 }
 async stageCheckpoint(ref,get,options={}){
  let state=await this.begin(ref,get,options);if(['activated','validated','publishing'].includes(state.phase))return state;
  let index=0;for await(const item of checkpointItems(state.manifest,get,{profile:this.profile})){
   const at=index++;if(at<state.received)continue;
   await this.stage.transaction(true,async t=>{const current=await this.stage.get(t,'restore');if(current.phase!=='staging'||current.received!==at)fail('BNS_RESTORE_STAGE_CHANGED');if(!equal(await authority(this.store,this.live,t),current.base))fail('BNS_RESTORE_LOCAL_CHANGED');await this.stage.put(t,'groupItem',[String(at).padStart(4,'0')],{item});await this.stage.put(t,'restore',[],{...withoutId(current),received:at+1});await requireStorageBudget(t,this.stage,current.replayId);},['meta']);await this.checkpoint('staged-item',index);
  }
  state=await this.stage.read('restore');const items=[];for await(const row of this.stage.rows('groupItem'))items.push(row.item);
  const replay=new BrowserNativeSyncCore(this.live.repository,{datasetId:this.live.datasetId,deviceId:this.live.deviceId,namespace:state.replayId}),compiled=await compile(replay,items,state.manifest,this.store);
  await this.stage.transaction(true,async t=>{const current=await this.stage.get(t,'restore');if(current.phase!=='staging'||current.received!==items.length||items.length!==current.manifest.itemCount)fail('BNS_RESTORE_STAGE_CHANGED');await this.stage.put(t,'restore',[],{...withoutId(current),phase:'validated',graphDigest:compiled.plan.digest});},['meta']);return this.stage.read('restore');
 }
 async activate(){
  const state=await this.stage.read('restore');if(!state||!['validated','activated','publishing'].includes(state.phase))fail('BNS_RESTORE_NOT_READY');
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
  const filter=new FilterIntentSyncJournal(replay),working=new InputWorkingCommitReceiver(this.store,replay,{filterJournal:filter}),manual=manualSyncOwners(replay),desired=contextDesiredMaterializer(replay),topicDesired=topicDesiredMaterializer(replay),consumerOperations=finalConsumerPreferenceOperations(plan);
  const sourceProof=await prepareRestoredFilterSources(canonical.expected.records.map(row=>({...row})));
  const humanApplication=await prepareHumanGroupApplication(this.store,replay,plan);
  const applications=[];for(const group of plan.groups){if(group.type==='sourceBootstrapCommit')applications.push([group,await prepareBootstrapApplication(this.store,replay,group.operations)]);else if(group.type==='sourceAppendCommit'){const anchor=plan.groups.find(x=>x.id===group.prepared.descriptor.value.bootstrap.revisionId);applications.push([group,await prepareAppendApplication(this.store,replay,group.operations,anchor.operations)]);}else if(group.type==='inputWorkingCommit')applications.push([group,await prepareWorkingApplication(working,group.operations)]);else if(group.type==='filterIntent')applications.push([group,await prepareFilterApplication(filter,group.operations[0])]);else applications.push([group,null]);}
  const consumerApplication=consumerOperations.length?await prepareRestoredConsumerPreferenceApplication(this.store,replay,plan,this.stage,state):null;
  const empty=await prepareGroupScope(await prepareGroupCheckpointPlan(replay,[]));
  const applyTransaction=generationProof?(fn=>generationTransaction(this,'group-apply',fn)):(fn=>this.live.transaction(true,fn));
  return this.store.run(async()=>{const result=await applyTransaction(async t=>{
   if(generationProof){registerRepositoryWorkLimit(this.store.repository,t);await requireCanonicalCheckpointProof(generationProof,{store:this.store,core:this.live},t);}
   const current=await this.stage.get(t,'restore');if(!equal(current,state))fail('BNS_RESTORE_STAGE_CHANGED');
   if(state.phase==='activated'){const active=await t.get('meta',this.live.prefix+'active');if(active?.namespace!==state.replayId||active.manifestId!==state.manifestId||await readRestoreEpoch(t)!==state.base.fence.epoch)fail('BNS_RESTORE_LOCAL_CHANGED');return {state:'activated',namespace:state.replayId};}
   if(!equal(await authority(this.store,this.live,t),state.base))fail('BNS_RESTORE_LOCAL_CHANGED');
   await requireConsumerPublicationSettled(t);await this.store.qualifyControlPublicationRead(t);
   await requireGroupScope(this.store,t,empty);if(humanApplication)await requireHumanGroupApplication(t,humanApplication);
   for(const kind of ['pending','publicationActive'])if((await t.primaryRangePage('meta',{prefix:await this.live.idIn(t,kind),limit:1})).rows.length)fail('BNS_RESTORE_LIVE_PENDING');
   if((await t.primaryRangePage('meta',{prefix:replay.prefix+'generation:'+replay.fixedNamespace+':',limit:1})).rows.length)fail('BNS_RESTORE_STAGE_CHANGED');
   for(const [group,cap]of applications){if(group.type==='humanLibraryCommit')await applyHumanGroupStep(t,humanApplication,group.id);else if(group.type==='sourceBootstrapCommit')await applyBootstrapApplication(t,cap);else if(group.type==='sourceAppendCommit')await applyAppendApplication(t,cap);else if(group.type==='inputWorkingCommit')await working.applyRestored(t,cap,sourceProof);else if(group.type==='filterIntent')await filter.applyRestored(t,cap,sourceProof);else{replay.materialize=group.type==='contextDesired'?desired:group.type==='topicDesired'?topicDesired:group.type==='promptBinding'?materializePromptBinding:manual.materialize;const result=await replay.applyInTransaction(t,group.operations[0],{materialize:group.type!=='consumerPreference'});if(result.state!=='applied')fail('BNS_GROUP_CAUSAL_GAP');}await this.checkpoint('applied-group',group.id);}
   const publication=consumerApplication?await applyRestoredConsumerPreferenceOwners(t,consumerApplication):null;
   await requireGroupScope(this.store,t,canonical);if(!equal(await authority(this.store,this.live,t),state.base))fail('BNS_RESTORE_LOCAL_CHANGED');await requireStorageBudget(t,this.stage,state.replayId,state);
   for(const expected of plan.heads){const actual=await replay.get(t,'head',expected.type,expected.entityId);if(!actual||!equal(withoutId(actual),expected))fail('BNS_CHECKPOINT_HEAD');}
   for(const expected of frontiers){const actual=await replay.get(t,'frontier',expected.deviceId);if(!actual||!equal(withoutId(actual),expected))fail('BNS_CHECKPOINT_FRONTIER');}
   await this.checkpoint('before-activation',t);await t.put('meta',{id:this.live.prefix+'active',namespace:state.replayId,manifestId:state.manifestId,graphDigest:state.graphDigest});
   const publishing=!!publication?.operations.length;
   await this.stage.put(t,'restore',[],{...withoutId(state),phase:publishing?'publishing':'activated'});
   if(publishing){const binding=await this.store.controlPublicationBinding(t);await t.put('meta',{id:CONSUMER_PUBLICATION_PENDING_ID,version:2,namespace:state.replayId,databaseId:binding.reservation.databaseId,controlRevision:binding.reservation.revision,nonce:binding.reservation.nonce,terminal:false,before:publication.before,operations:publication.operations,restore:{stageId:state.id,manifestId:state.manifestId,graphDigest:state.graphDigest,replayId:state.replayId,operations:publication.allOperations,smartFilter:publication.smartFilter}});}
   await this.checkpoint('after-activation',t);
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
 }
 async cleanup({abandon=false,limit=100}={}){
  if(typeof abandon!=='boolean'||!Number.isSafeInteger(limit)||limit<1||limit>100)fail('BNS_GROUP_CLEANUP_INVALID');
  return this.stage.transaction(true,async t=>{
   const row=await this.stage.get(t,'restore');if(!row)fail('BNS_RESTORE_NOT_READY');
   const active=await t.get('meta',this.live.prefix+'active');
   if(!['activated','abandoned'].includes(row.phase)&&!abandon)fail('BNS_RESTORE_NOT_READY');
   if(row.phase!=='activated'&&active?.namespace===row.replayId)fail('BNS_RESTORE_STAGE_CHANGED');
   const next={...withoutId(row),phase:row.phase==='activated'?'activated':'abandoned'},names=row.phase==='activated'?[this.stage.fixedNamespace]:[this.stage.fixedNamespace,row.replayId];
   if(next.cleanup?.complete)return {state:'cleaned',deleted:0,complete:true};
   let namespace=next.cleanup?.namespace??0,after=next.cleanup?.after??null,deleted=0;
   while(namespace<names.length&&deleted<limit){
    if(names[namespace]===active?.namespace)fail('BNS_RESTORE_STAGE_CHANGED');
    const page=await t.primaryRangePage('meta',{prefix:this.stage.prefix+'generation:'+names[namespace]+':',after,limit:Math.min(100,limit-deleted)});
    for(const {value}of page.rows)if(value.id!==row.id){await t.delete('meta',value.id);deleted++;}
    after=page.next;if(!after){namespace++;after=null;}
   }
   next.cleanup={namespace,after,complete:namespace===names.length};await this.stage.put(t,'restore',[],next);
   return {state:next.cleanup.complete?'cleaned':'cleaning',deleted,complete:next.cleanup.complete};
  },['meta']);
 }
 async reconcileTail(operations,{ref,get,supported}={}){
  if(!ref||typeof get!=='function'||!Array.isArray(operations))fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
  const old=await this.stage.read('restore');if(old?.phase!=='validated')fail('BNS_RESTORE_NOT_READY');
  const m=await manifest(ref,get,this.live,this.profile,supported);if(!m.parents.includes(old.manifestId))fail('BNS_GROUP_TAIL_INVALID');
  const oldItems=[];for await(const row of this.stage.rows('groupItem'))oldItems.push(row.item);
  const items=[];for await(const item of checkpointItems(m,get,{profile:this.profile})){if(items.length===384)fail('BNS_GROUP_RESOURCE_LIMIT');items.push(item);}
  const replay=new BrowserNativeSyncCore(this.live.repository,{datasetId:this.live.datasetId,deviceId:this.live.deviceId,namespace:old.replayId}),compiled=await compile(replay,items,m,this.store);
  const prior=new Map(oldItems.filter(x=>x.kind==='revision').map(x=>[x.operation.revisionId,x.operation])),next=new Map(items.filter(x=>x.kind==='revision').map(x=>[x.operation.revisionId,x.operation]));
  for(const [id,op]of prior)if(!equal(next.get(id)??null,op))fail('BNS_GROUP_TAIL_INVALID');
  const delta=[...next].filter(([id])=>!prior.has(id)).map(([,op])=>op),sort=rows=>[...rows].sort((a,b)=>String(a.revisionId).localeCompare(String(b.revisionId)));
  if(!equal(sort(delta),sort(operations)))fail('BNS_GROUP_TAIL_INVALID');
  await this.stage.transaction(true,async t=>{if(!equal(await this.stage.get(t,'restore'),old))fail('BNS_RESTORE_STAGE_CHANGED');if(!equal(await authority(this.store,this.live,t),old.base))fail('BNS_RESTORE_LOCAL_CHANGED');
   for(let i=0;i<oldItems.length;i++)await t.delete('meta',await this.stage.idIn(t,'groupItem',String(i).padStart(4,'0')));
   for(let i=0;i<items.length;i++)await this.stage.put(t,'groupItem',[String(i).padStart(4,'0')],{item:items[i]});
   await this.stage.put(t,'restore',[],{...withoutId(old),manifestId:ref.id,manifestRef:clone(ref),manifest:m,received:items.length,graphDigest:compiled.plan.digest});await requireStorageBudget(t,this.stage,old.replayId);
  },['meta']);return {state:'validated',operations:delta.length};
 }
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
 const current=()=>requireOriginalApplicationInheritanceCutCurrent(token);
 current();const observed=await observeOriginalControlPublication(store,p.observation);if(!equal(observed.row,p.control))fail('BNS_SNAPSHOT_CHANGED');
 const cut=await core.transaction(false,async t=>{const value=await authority(store,core,t);await store.qualifyControlPublicationRead(t);await requireCommittedPlan(core,t,p.plan);await requireGroupScope(store,t,p.scope);return value;});current();
 if(p.cut!==null&&!equal(cut,p.cut))fail('BNS_SNAPSHOT_CHANGED');
 return clone(cut);
}
// Stricter existing-cut action profile: this only rechecks the ORIGINAL
// prepared proof's in-memory provenance. It neither refreshes a proof nor reads
// a new local row. The fixed selection consumer must additionally compare its
// complete raw repository/local/registry/control cut before any mutation.
export function requireOriginalApplicationInheritanceCutCurrent(token){
 const p=applicationInheritanceCuts.get(token);if(!p)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');const {store,core,repository}=p;
 requireOriginalLibraryDocumentsGenerationMethods(store);requireOriginalGenerationCoreMethods(core);
 if(store.repository!==repository||core.repository!==repository||repository.db!==p.db||store.tail!==p.tail||core.datasetId!==p.datasetId||core.prefix!==p.prefix||core.fixedNamespace!==p.fixedNamespace)fail('BNS_SNAPSHOT_CHANGED');requireOriginalControlObservation(store,p.observation);return true;
}
export function requireOriginalApplicationInheritanceSelectionTail(token,action){
 const p=applicationInheritanceCuts.get(token);if(!p||p.selectionRenewed&&p.selectionRenewed!==action)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');const {store,core,repository}=p;
 requireOriginalLibraryDocumentsGenerationMethods(store);requireOriginalGenerationCoreMethods(core);if(store.repository!==repository||core.repository!==repository||repository.db!==p.db||core.datasetId!==p.datasetId||core.prefix!==p.prefix||core.fixedNamespace!==p.fixedNamespace)fail('BNS_SNAPSHOT_CHANGED');requireOriginalControlObservationSelectionTail(store,p.observation,action);return true;
}
export function renewOriginalApplicationInheritanceSelectionTail(token,action){
 requireOriginalApplicationInheritanceSelectionTail(token,action);const p=applicationInheritanceCuts.get(token);if(p.selectionRenewed)fail('BNS_SNAPSHOT_CHANGED');p.observation=renewOriginalControlObservationSelectionTail(p.store,p.observation,action);p.tail=p.store.tail;p.selectionRenewed=action;requireOriginalApplicationInheritanceCutCurrent(token);return true;
}
export function readOriginalApplicationInheritanceCut(token){
 const p=applicationInheritanceCuts.get(token);if(!p||!p.cut)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');requireOriginalControlObservation(p.store,p.observation);
 return Object.freeze({datasetId:p.datasetId,databaseName:p.repository.name,databaseId:p.control.databaseId,namespace:p.cut.namespace,epoch:p.cut.fence,graphDigest:p.plan.digest,canonicalDigest:p.canonicalDigest,control:clone(p.control)});
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
