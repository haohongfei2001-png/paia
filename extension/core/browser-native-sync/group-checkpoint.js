import {prepareSavedWorkGroupApplication,applySavedWorkGroupStep,sealSavedWorkGroupActivation} from './saved-work-bootstrap.js';
import {groupOperationPages,createGroupPageBudget,chargeGroupPageValue,checkGroupPageBudget,readGroupRows} from './group-page-reader.js';
import {captureSourceWorkingCurrentGroupProjection,requireSourceWorkingCurrentGroupProjection,encodeSourceWorkingCurrentGroupCheckpoint,publishSourceWorkingCurrentGroupCheckpoint,captureMixedCurrentGroupProjection,requireMixedCurrentGroupProjection,encodeMixedCurrentGroupCheckpoint,publishMixedCurrentGroupCheckpoint,releaseHumanCurrentUnindexedProjection} from './human-library-plan.js';
import {InputWorkingCommitReceiver,prepareWorkingApplication} from './input-working-commit.js';
import {prepareHumanGroupApplication,requireHumanGroupApplication,applyHumanGroupStep} from './human-library-group.js';
import {FilterIntentSyncJournal,prepareRestoredFilterSources,prepareFilterApplication} from './filter-intent-journal.js';
import {manualSyncOwners} from './manual-owners.js';
import {contextDesiredMaterializer} from './context-desired-journal-owner.js';
import {BrowserNativeSyncCore,acceptSequence,CORE_LIMITS} from './core.js';
import {buildCheckpoint,checkpointItems} from './checkpoints.js';
import {protocolObject,readObject,SEGMENT_PROFILE} from './segments.js';
import {prepareGroupCheckpointPlan} from './group-checkpoint-plan.js';
import {prepareGroupScope,requireGroupScope,prepareGroupCurrentProjection,requireGroupCurrentProjection,encodeGroupCurrentProjection,publishGroupCurrentProjection,releaseGroupCurrentProjection} from './group-checkpoint-scope.js';
import {prepareBootstrapApplication,applyBootstrapApplication} from './source-bootstrap-receive.js';
import {prepareAppendApplication,applyAppendApplication} from './source-append-receive.js';
import {JournalRestoreFence,readRestoreEpoch,materializePromptBinding} from './prompt-journal.js';
import {CONSENT_VERSION} from '../constants.js';
import {bytes,clone,decodeJSON,digest,equal,exact,fail,hash,opaque} from './value.js';
import {assertGroupedCheckpointManifest} from './group-checkpoint-manifest.js';
import {awaitRepositoryTransactionSettled,requireRepositoryCommittedIdentity,registerRepositoryWorkLimit} from '../idb-repository.js';
import {finalConsumerPreferenceOperations,prepareRestoredConsumerPreferenceApplication,applyRestoredConsumerPreferenceOwners} from './consumer-preference-restore.js';
import {CONSUMER_PUBLICATION_PENDING_ID,requireConsumerPublicationSettled} from './consumer-publication-state.js';
import {sealManualMergeTransaction} from './manual-merge-terminal.js';
import {topicDesiredMaterializer} from './topic-desired-journal.js';
const own=(x,keys)=>exact(x,keys)&&Object.keys(x).length===keys.length;
const withoutId=({id,...row})=>row;
async function authority(store,core,t){const c=await store.control(t);if(!c.settings.enabled||c.settings.consentVersion!==CONSENT_VERSION)fail('BNS_GROUP_PERMISSION');return{namespace:await core.bind(t),generation:(await core.get(t,'generation'))?.value||0,ownerGeneration:(await t.get('meta','backup-data-generation'))?.value||0,fence:await new JournalRestoreFence(core).snapshot(t),settings:c.settings};}
async function allOperations(core){const operations=[],budget=createGroupPageBudget();for await(const row of core.rows('revision')){if(row.redacted)fail('BNS_GROUP_OWNER_UNSUPPORTED');chargeGroupPageValue(budget,row.operation);operations.push(row.operation);}checkGroupPageBudget(budget);return operations;}
async function stageItems(stage){return stage.transaction(false,async t=>(await readGroupRows(t,'meta',{prefix:await stage.idIn(t,'groupItem')})).map(row=>row.item),['meta']);}
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
// Both protocol namespaces count toward one explicit local admission budget.
// Reuse the two existing per-batch byte envelopes; never count just wire bodies.
async function requireStorageBudget(t,stage,replayId){
 let total=0,rows=0;for(const namespace of [stage.fixedNamespace,replayId]){let after=null;do{const page=await t.primaryRangePage('meta',{prefix:stage.prefix+'generation:'+namespace+':',after,limit:100});for(const {value}of page.rows){rows++;if((total+=bytes(value).length)>CORE_LIMITS.batchBytes*2)fail('BNS_GROUP_RESOURCE_LIMIT');}after=page.next;}while(after);}return {rows,bytes:total};
}
export class GroupedCheckpointRestore{
 constructor(core,{store,restoreId,profile=SEGMENT_PROFILE,checkpoint=async()=>{}}){
  if(store?.repository!==core.repository||!opaque(restoreId))fail('BNS_GROUP_BINDING');this.store=store;this.live=core;this.restoreId=restoreId;this.profile=profile;this.checkpoint=checkpoint;
  this.stage=new BrowserNativeSyncCore(core.repository,{datasetId:core.datasetId,deviceId:core.deviceId,namespace:restoreId});
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
  let state=await this.begin(ref,get,options);if(['activated','merged','validated','publishing'].includes(state.phase))return state;
  let index=0;for await(const item of checkpointItems(state.manifest,get,{profile:this.profile})){
   const at=index++;if(at<state.received)continue;
   await this.stage.transaction(true,async t=>{const current=await this.stage.get(t,'restore');if(current.phase!=='staging'||current.received!==at)fail('BNS_RESTORE_STAGE_CHANGED');if(!equal(await authority(this.store,this.live,t),current.base))fail('BNS_RESTORE_LOCAL_CHANGED');await this.stage.put(t,'groupItem',[String(at).padStart(4,'0')],{item});await this.stage.put(t,'restore',[],{...withoutId(current),received:at+1});await requireStorageBudget(t,this.stage,current.replayId);},['meta']);await this.checkpoint('staged-item',index);
  }
  state=await this.stage.read('restore');const items=await stageItems(this.stage);
  const replay=new BrowserNativeSyncCore(this.live.repository,{datasetId:this.live.datasetId,deviceId:this.live.deviceId,namespace:state.replayId}),compiled=await compile(replay,items,state.manifest,this.store);
  await this.stage.transaction(true,async t=>{const current=await this.stage.get(t,'restore');if(current.phase!=='staging'||current.received!==items.length||items.length!==current.manifest.itemCount)fail('BNS_RESTORE_STAGE_CHANGED');await this.stage.put(t,'restore',[],{...withoutId(current),phase:'validated',graphDigest:compiled.plan.digest});},['meta']);return this.stage.read('restore');
 }
 async activate(){
  const state=await this.stage.read('restore');if(!state||!['validated','activated','merged','publishing'].includes(state.phase))fail('BNS_RESTORE_NOT_READY');
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
  const items=[];for await(const row of this.stage.rows('groupItem'))items.push(row.item);
  const replay=new BrowserNativeSyncCore(this.live.repository,{datasetId:this.live.datasetId,deviceId:this.live.deviceId,namespace:state.replayId}),{plan,canonical,frontiers}=await compile(replay,items,state.manifest,this.store);
  if(plan.digest!==state.graphDigest)fail('BNS_RESTORE_STAGE_CHANGED');
  await this.store.run(()=>this.live.transaction(false,async t=>{if(!equal(await authority(this.store,this.live,t),state.base))fail('BNS_RESTORE_LOCAL_CHANGED');}));
  const localOperations=await allOperations(this.live);
  if(localOperations.length)return this.mergeManual(state,plan,localOperations);
  const filter=new FilterIntentSyncJournal(replay),working=new InputWorkingCommitReceiver(this.store,replay,{filterJournal:filter}),manual=manualSyncOwners(replay),desired=contextDesiredMaterializer(replay),topicDesired=topicDesiredMaterializer(replay),consumerOperations=finalConsumerPreferenceOperations(plan);
  const sourceProof=await prepareRestoredFilterSources(canonical.expected.records.map(row=>({...row})));
  const humanApplication=await prepareHumanGroupApplication(this.store,replay,plan),savedApplication=await prepareSavedWorkGroupApplication(this.store,replay,plan,this.stage,state);
  const applications=[];for(const group of plan.groups){if(group.type==='sourceBootstrapCommit')applications.push([group,await prepareBootstrapApplication(this.store,replay,group.operations)]);else if(group.type==='sourceAppendCommit'){const anchor=plan.groups.find(x=>x.id===group.prepared.descriptor.value.bootstrap.revisionId);applications.push([group,await prepareAppendApplication(this.store,replay,group.operations,anchor.operations)]);}else if(group.type==='inputWorkingCommit')applications.push([group,await prepareWorkingApplication(working,group.operations)]);else if(group.type==='filterIntent')applications.push([group,await prepareFilterApplication(filter,group.operations[0])]);else applications.push([group,null]);}
  const consumerApplication=consumerOperations.length?await prepareRestoredConsumerPreferenceApplication(this.store,replay,plan,this.stage,state):null;
  const empty=await prepareGroupScope(await prepareGroupCheckpointPlan(replay,[]));
  return this.store.run(async()=>{const result=await this.live.transaction(true,async t=>{
   if(state.manifest.ownerScope.version===2||savedApplication)registerRepositoryWorkLimit(this.store.repository,t);
   const current=await this.stage.get(t,'restore');if(!equal(current,state))fail('BNS_RESTORE_STAGE_CHANGED');
   if(state.phase==='activated'){const active=await t.get('meta',this.live.prefix+'active');if(active?.namespace!==state.replayId||active.manifestId!==state.manifestId||await readRestoreEpoch(t)!==state.base.fence.epoch)fail('BNS_RESTORE_LOCAL_CHANGED');return {state:'activated',namespace:state.replayId};}
   if(!equal(await authority(this.store,this.live,t),state.base))fail('BNS_RESTORE_LOCAL_CHANGED');
   await requireConsumerPublicationSettled(t);await this.store.qualifyControlPublicationRead(t);
   await requireGroupScope(this.store,t,empty);if(humanApplication)await requireHumanGroupApplication(t,humanApplication);
   for(const kind of ['pending','publicationActive'])if((await t.primaryRangePage('meta',{prefix:await this.live.idIn(t,kind),limit:1})).rows.length)fail('BNS_RESTORE_LIVE_PENDING');
   if((await t.primaryRangePage('meta',{prefix:replay.prefix+'generation:'+replay.fixedNamespace+':',limit:1})).rows.length)fail('BNS_RESTORE_STAGE_CHANGED');
   for(const [group,cap]of applications){if(group.type==='savedWorkBootstrap')await applySavedWorkGroupStep(t,savedApplication,group.id);else if(group.type==='humanLibraryCommit')await applyHumanGroupStep(t,humanApplication,group.id);else if(group.type==='sourceBootstrapCommit')await applyBootstrapApplication(t,cap);else if(group.type==='sourceAppendCommit')await applyAppendApplication(t,cap);else if(group.type==='inputWorkingCommit')await working.applyRestored(t,cap,sourceProof);else if(group.type==='filterIntent')await filter.applyRestored(t,cap,sourceProof);else{replay.materialize=group.type==='contextDesired'?desired:group.type==='topicDesired'?topicDesired:group.type==='promptBinding'?materializePromptBinding:manual.materialize;const result=await replay.applyInTransaction(t,group.operations[0],{materialize:group.type!=='consumerPreference'});if(result.state!=='applied')fail('BNS_GROUP_CAUSAL_GAP');}await this.checkpoint('applied-group',group.id);}
   const publication=consumerApplication?await applyRestoredConsumerPreferenceOwners(t,consumerApplication):null;
   await requireGroupScope(this.store,t,canonical);if(!equal(await authority(this.store,this.live,t),state.base))fail('BNS_RESTORE_LOCAL_CHANGED');await requireStorageBudget(t,this.stage,state.replayId);
   for(const expected of plan.heads){const actual=await replay.get(t,'head',expected.type,expected.entityId);if(!actual||!equal(withoutId(actual),expected))fail('BNS_CHECKPOINT_HEAD');}
   for(const expected of frontiers){const actual=await replay.get(t,'frontier',expected.deviceId);if(!actual||!equal(withoutId(actual),expected))fail('BNS_CHECKPOINT_FRONTIER');}
   await this.checkpoint('before-activation',t);await t.put('meta',{id:this.live.prefix+'active',namespace:state.replayId,manifestId:state.manifestId,graphDigest:state.graphDigest});
   const publishing=!!publication?.operations.length;
   await this.stage.put(t,'restore',[],{...withoutId(state),phase:publishing?'publishing':'activated'});
   if(publishing){const binding=await this.store.controlPublicationBinding(t);await t.put('meta',{id:CONSUMER_PUBLICATION_PENDING_ID,version:2,namespace:state.replayId,databaseId:binding.reservation.databaseId,controlRevision:binding.reservation.revision,nonce:binding.reservation.nonce,terminal:false,before:publication.before,operations:publication.operations,restore:{stageId:state.id,manifestId:state.manifestId,graphDigest:state.graphDigest,replayId:state.replayId,operations:publication.allOperations,smartFilter:publication.smartFilter}});}
   await sealSavedWorkGroupActivation(t,savedApplication);await this.checkpoint('after-activation',t);return {state:publishing?'publishing':'activated',namespace:state.replayId};
  });if(result.state==='publishing'){await this.store.publish();return {state:'activated',namespace:state.replayId};}return result;});
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
 async cleanup({abandon=false,limit=100}={}){
  if(typeof abandon!=='boolean'||!Number.isSafeInteger(limit)||limit<1||limit>100)fail('BNS_GROUP_CLEANUP_INVALID');
  return this.stage.transaction(true,async t=>{
   const row=await this.stage.get(t,'restore');if(!row)fail('BNS_RESTORE_NOT_READY');
   const active=await t.get('meta',this.live.prefix+'active');
   if(!['activated','merged','abandoned'].includes(row.phase)&&!abandon)fail('BNS_RESTORE_NOT_READY');
   if(row.phase!=='activated'&&active?.namespace===row.replayId)fail('BNS_RESTORE_STAGE_CHANGED');
   const next={...withoutId(row),phase:['activated','merged'].includes(row.phase)?row.phase:'abandoned'},names=['activated','merged'].includes(row.phase)?[this.stage.fixedNamespace]:[this.stage.fixedNamespace,row.replayId];
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
  const oldItems=await stageItems(this.stage);
  const items=[];for await(const page of groupOperationPages(checkpointItems(m,get,{profile:this.profile})))items.push(...page);
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
