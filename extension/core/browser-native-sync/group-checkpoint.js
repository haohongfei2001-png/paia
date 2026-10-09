import {InputWorkingCommitReceiver,prepareWorkingApplication} from './input-working-commit.js';
import {prepareHumanGroupApplication,requireHumanGroupApplication,applyHumanGroupStep} from './human-library-group.js';
import {FilterIntentSyncJournal,prepareRestoredFilterSources,prepareFilterApplication} from './filter-intent-journal.js';
import {manualSyncOwners} from './manual-owners.js';
import {contextDesiredMaterializer} from './context-desired-journal.js';
import {BrowserNativeSyncCore,acceptSequence,CORE_LIMITS} from './core.js';
import {buildCheckpoint,checkpointItems} from './checkpoints.js';
import {protocolObject,readObject,SEGMENT_PROFILE} from './segments.js';
import {prepareGroupCheckpointPlan} from './group-checkpoint-plan.js';
import {prepareGroupScope,requireGroupScope,prepareGroupCurrentProjection,requireGroupCurrentProjection,encodeGroupCurrentProjection,publishGroupCurrentProjection,releaseGroupCurrentProjection} from './group-checkpoint-scope.js';
import {prepareBootstrapApplication,applyBootstrapApplication} from './source-bootstrap-receive.js';
import {prepareAppendApplication,applyAppendApplication} from './source-append-receive.js';
import {JournalRestoreFence,readRestoreEpoch} from './prompt-journal.js';
import {CONSENT_VERSION} from '../constants.js';
import {bytes,clone,decodeJSON,digest,equal,exact,fail,hash,opaque} from './value.js';
import {validateCoverage} from './codecs.js';
import {awaitRepositoryTransactionSettled,requireRepositoryCommittedIdentity} from '../idb-repository.js';
const profileName='bounded-admitted-local-owners',own=(x,keys)=>exact(x,keys)&&Object.keys(x).length===keys.length;
const withoutId=({id,...row})=>row;
async function authority(store,core,t){const c=await store.control(t);if(!c.settings.enabled||c.settings.consentVersion!==CONSENT_VERSION)fail('BNS_GROUP_PERMISSION');return{namespace:await core.bind(t),generation:(await core.get(t,'generation'))?.value||0,ownerGeneration:(await t.get('meta','backup-data-generation'))?.value||0,fence:await new JournalRestoreFence(core).snapshot(t),settings:c.settings};}
async function allOperations(core){const operations=[];for await(const row of core.rows('revision')){if(row.redacted)fail('BNS_GROUP_OWNER_UNSUPPORTED');if(operations.length===128)fail('BNS_GROUP_RESOURCE_LIMIT');operations.push(row.operation);}return operations;}
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
export async function buildGroupedCheckpoint(core,transport,{store,profile=SEGMENT_PROFILE,parents=[],currentHumanProjection=false}={}){
 if(typeof currentHumanProjection!=='boolean')fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');if(store?.repository!==core.repository)fail('BNS_GROUP_BINDING');await store.finishFoundation();
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
 if(!own(v,['magic','protocol','kind','datasetId','clientEncryption','root','level','itemCount','chain','coverage','parents','ownerScope'])||v.magic!=='PAIA-BNS'||v.protocol!==1||v.kind!=='checkpoint-manifest'||v.datasetId!==core.datasetId||v.clientEncryption!=='none'||!Number.isSafeInteger(v.level)||v.level<0||v.level>8||!Number.isSafeInteger(v.itemCount)||v.itemCount<0||v.itemCount>384||(!hash(v.chain)&&v.itemCount!==0)||!Array.isArray(v.parents)||v.parents.length>128||v.parents.some(x=>!hash(x))||new Set(v.parents).size!==v.parents.length)fail('BNS_CHECKPOINT_INVALID');
 const scope=v.ownerScope;if(!own(scope,['version','profile','families'])||scope.version!==1||scope.profile!==profileName||!Array.isArray(scope.families)||scope.families.length>16||scope.families.some(row=>!own(row,['type','count','digest'])||typeof row.type!=='string'||!Number.isSafeInteger(row.count)||row.count<0||row.count>128||!hash(row.digest))||new Set(scope.families.map(x=>x.type)).size!==scope.families.length)fail('BNS_GROUP_SCOPE_INVALID');
 validateCoverage(v.coverage,supported);return v;
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
 const families=new Map();for(const head of plan.heads){const x=families.get(head.type)||{type:head.type,version:1,count:0};x.count++;families.set(head.type,x);}const coverage=[...families.values()].sort((a,b)=>a.type.localeCompare(b.type));
 if(!equal(coverage,manifest.coverage)||!equal(sorted(heads),plan.heads)||!equal(canonical.ownerScope,scope))fail('BNS_GROUP_SCOPE_INVALID');
 const expected=new Map();for(const op of operations)expected.set(op.deviceId,acceptSequence(expected.get(op.deviceId),op.sequence));
 if(frontiers.length!==expected.size||new Set(frontiers.map(x=>x.deviceId)).size!==frontiers.length)fail('BNS_CHECKPOINT_FRONTIER');
 for(const row of frontiers)if(!equal(row,{deviceId:row.deviceId,...expected.get(row.deviceId)}))fail('BNS_CHECKPOINT_FRONTIER');
 return {plan,canonical,frontiers};
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
  let state=await this.begin(ref,get,options);if(state.phase==='activated'||state.phase==='validated')return state;
  let index=0;for await(const item of checkpointItems(state.manifest,get,{profile:this.profile})){
   const at=index++;if(at<state.received)continue;
   await this.stage.transaction(true,async t=>{const current=await this.stage.get(t,'restore');if(current.phase!=='staging'||current.received!==at)fail('BNS_RESTORE_STAGE_CHANGED');if(!equal(await authority(this.store,this.live,t),current.base))fail('BNS_RESTORE_LOCAL_CHANGED');await this.stage.put(t,'groupItem',[String(at).padStart(4,'0')],{item});await this.stage.put(t,'restore',[],{...withoutId(current),received:at+1});await requireStorageBudget(t,this.stage,current.replayId);},['meta']);await this.checkpoint('staged-item',index);
  }
  state=await this.stage.read('restore');const items=[];for await(const row of this.stage.rows('groupItem'))items.push(row.item);
  const replay=new BrowserNativeSyncCore(this.live.repository,{datasetId:this.live.datasetId,deviceId:this.live.deviceId,namespace:state.replayId}),compiled=await compile(replay,items,state.manifest,this.store);
  await this.stage.transaction(true,async t=>{const current=await this.stage.get(t,'restore');if(current.phase!=='staging'||current.received!==items.length||items.length!==current.manifest.itemCount)fail('BNS_RESTORE_STAGE_CHANGED');await this.stage.put(t,'restore',[],{...withoutId(current),phase:'validated',graphDigest:compiled.plan.digest});},['meta']);return this.stage.read('restore');
 }
 async activate(){
  const state=await this.stage.read('restore');if(!state||!['validated','activated'].includes(state.phase))fail('BNS_RESTORE_NOT_READY');
  if(state.phase==='activated')return this.store.run(()=>this.live.transaction(false,async t=>{
   const current=await this.stage.get(t,'restore'),active=await t.get('meta',this.live.prefix+'active');
   if(!equal(current,state)||active?.namespace!==state.replayId||active.manifestId!==state.manifestId||active.graphDigest!==state.graphDigest||await readRestoreEpoch(t)!==state.base.fence.epoch)fail('BNS_RESTORE_LOCAL_CHANGED');
   return {state:'activated',namespace:state.replayId};
  }));
  const items=[];for await(const row of this.stage.rows('groupItem'))items.push(row.item);
  const replay=new BrowserNativeSyncCore(this.live.repository,{datasetId:this.live.datasetId,deviceId:this.live.deviceId,namespace:state.replayId}),{plan,canonical,frontiers}=await compile(replay,items,state.manifest,this.store);
  if(plan.digest!==state.graphDigest)fail('BNS_RESTORE_STAGE_CHANGED');
  const filter=new FilterIntentSyncJournal(replay),working=new InputWorkingCommitReceiver(this.store,replay,{filterJournal:filter}),manual=manualSyncOwners(replay),desired=contextDesiredMaterializer(replay);
  const sourceProof=await prepareRestoredFilterSources(canonical.expected.records.map(row=>({...row})));
  const humanApplication=await prepareHumanGroupApplication(this.store,replay,plan);
  const applications=[];for(const group of plan.groups){if(group.type==='sourceBootstrapCommit')applications.push([group,await prepareBootstrapApplication(this.store,replay,group.operations)]);else if(group.type==='sourceAppendCommit'){const anchor=plan.groups.find(x=>x.id===group.prepared.descriptor.value.bootstrap.revisionId);applications.push([group,await prepareAppendApplication(this.store,replay,group.operations,anchor.operations)]);}else if(group.type==='inputWorkingCommit')applications.push([group,await prepareWorkingApplication(working,group.operations)]);else if(group.type==='filterIntent')applications.push([group,await prepareFilterApplication(filter,group.operations[0])]);else applications.push([group,null]);}
  const empty=await prepareGroupScope(await prepareGroupCheckpointPlan(replay,[]));
  return this.store.run(()=>this.live.transaction(true,async t=>{
   const current=await this.stage.get(t,'restore');if(!equal(current,state))fail('BNS_RESTORE_STAGE_CHANGED');
   if(state.phase==='activated'){const active=await t.get('meta',this.live.prefix+'active');if(active?.namespace!==state.replayId||active.manifestId!==state.manifestId||await readRestoreEpoch(t)!==state.base.fence.epoch)fail('BNS_RESTORE_LOCAL_CHANGED');return {state:'activated',namespace:state.replayId};}
   if(!equal(await authority(this.store,this.live,t),state.base))fail('BNS_RESTORE_LOCAL_CHANGED');
   await requireGroupScope(this.store,t,empty);if(humanApplication)await requireHumanGroupApplication(t,humanApplication);
   for(const kind of ['pending','publicationActive'])if((await t.primaryRangePage('meta',{prefix:await this.live.idIn(t,kind),limit:1})).rows.length)fail('BNS_RESTORE_LIVE_PENDING');
   if((await t.primaryRangePage('meta',{prefix:replay.prefix+'generation:'+replay.fixedNamespace+':',limit:1})).rows.length)fail('BNS_RESTORE_STAGE_CHANGED');
   for(const [group,cap]of applications){if(group.type==='humanLibraryCommit')await applyHumanGroupStep(t,humanApplication,group.id);else if(group.type==='sourceBootstrapCommit')await applyBootstrapApplication(t,cap);else if(group.type==='sourceAppendCommit')await applyAppendApplication(t,cap);else if(group.type==='inputWorkingCommit')await working.applyRestored(t,cap,sourceProof);else if(group.type==='filterIntent')await filter.applyRestored(t,cap,sourceProof);else{replay.materialize=group.type==='contextDesired'?desired:manual.materialize;const result=await replay.applyInTransaction(t,group.operations[0]);if(result.state!=='applied')fail('BNS_GROUP_CAUSAL_GAP');}await this.checkpoint('applied-group',group.id);}
   await requireGroupScope(this.store,t,canonical);if(!equal(await authority(this.store,this.live,t),state.base))fail('BNS_RESTORE_LOCAL_CHANGED');await requireStorageBudget(t,this.stage,state.replayId);
   for(const expected of plan.heads){const actual=await replay.get(t,'head',expected.type,expected.entityId);if(!actual||!equal(withoutId(actual),expected))fail('BNS_CHECKPOINT_HEAD');}
   for(const expected of frontiers){const actual=await replay.get(t,'frontier',expected.deviceId);if(!actual||!equal(withoutId(actual),expected))fail('BNS_CHECKPOINT_FRONTIER');}
   await this.checkpoint('before-activation',t);await t.put('meta',{id:this.live.prefix+'active',namespace:state.replayId,manifestId:state.manifestId,graphDigest:state.graphDigest});
   await this.stage.put(t,'restore',[],{...withoutId(state),phase:'activated'});await this.checkpoint('after-activation',t);return {state:'activated',namespace:state.replayId};
  }));
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
