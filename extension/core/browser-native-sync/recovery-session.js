import {createOriginalRecoveryWork,chargeOriginalRecoveryWork,tightenOriginalRecoveryWork,withOriginalRecoveryWork,finishOriginalRecoveryWork} from '../idb-repository.js';
import {SourcePurgeGroupedCheckpointRestore,validateSourcePurgeCheckpointGraph,requireCheckpointRevisionRetention} from './source-purge-group.js';
import {sourcePurgeRestoreKey} from './source-purge-protocol-controls.js';
import {StagedSyncRestore,checkpointItems} from './checkpoints.js';
import {validateGroupedCheckpointGraph} from './group-checkpoint.js';
import {assertProtocolObjectReference,readObject,SEGMENT_PROFILE} from './segments.js';
import {assertGroupedCheckpointManifest} from './group-checkpoint-manifest.js';
import {bytes,clone,decodeJSON,equal,exact,fail,hash,opaque,SyncError} from './value.js';

// Local-stage coordinator only. The caller supplies an already-bound original
// Core/store and a transport; this module creates no provider, account or grant.
// Durable progress belongs exclusively to the existing staged restore owner.
export class LocalSyncRecoverySession {
 #activationWork=null;#discovered=null;#restore;#restoreId;#checkpoint;#negative=false;#transport;#core;#store;#discoveryTimeoutMs;#readTimeoutMs;#cancelRead=null;#recoveryState='not-restored';#busy=false;#paused=false;#closed=false;#serial=0;#ref=null;#state='idle';#error=null;
 constructor(core,{store,transport,restoreId=crypto.randomUUID(),checkpoint=async()=>{},discoveryTimeoutMs=30000,readTimeoutMs=30000}={}){
  if(store?.repository!==core?.repository||!core?.repository||typeof transport?.get!=='function'||!opaque(restoreId)||typeof checkpoint!=='function'||!Number.isSafeInteger(discoveryTimeoutMs)||discoveryTimeoutMs<1||discoveryTimeoutMs>30000||!Number.isSafeInteger(readTimeoutMs)||readTimeoutMs<1||readTimeoutMs>30000)fail('BNS_RECOVERY_BINDING');
  this.#restoreId=restoreId;this.#checkpoint=checkpoint;this.#transport=transport;this.#core=core;this.#store=store;this.#discoveryTimeoutMs=discoveryTimeoutMs;this.#readTimeoutMs=readTimeoutMs;
  this.#restore=new StagedSyncRestore(core,{restoreId,grouped:{store},checkpoint:async(...args)=>{this.#check();await checkpoint(...args);this.#check();}});
 }
 get restoreId(){return this.#restoreId;}
 snapshot(){return Object.freeze({version:1,state:this.#closed?'closed':this.#paused?'paused':this.#state,recoveryState:this.#recoveryState,busy:this.#busy,error:this.#error,productionActivation:false});}
 #check(serial=this.#serial){if(this.#closed||this.#paused||serial!==this.#serial)fail('BNS_RECOVERY_INTERRUPTED');}
 async #run(state,action){
  this.#check();if(this.#busy)fail('BNS_RECOVERY_BUSY');this.#busy=true;this.#state=state;this.#error=null;const serial=this.#serial;
  let result;try{result=await action(serial);}catch(error){this.#state=state==='applying'?'settlement-unknown':'incomplete';if(state==='applying')this.#recoveryState='settlement-unknown';this.#error=typeof error?.code==='string'&&/^(BNS_|STORAGE_|CONTROL_|BACKUP_)[A-Z_]+$/.test(error.code)?error.code:'BNS_RECOVERY_UNKNOWN';throw error;}
  finally{this.#busy=false;}
  return result===undefined?this.snapshot():result;
 }
 pause(){this.#paused=true;++this.#serial;this.#cancelRead?.();}
 resume(){if(this.#closed)fail('BNS_RECOVERY_INTERRUPTED');if(this.#busy)fail('BNS_RECOVERY_BUSY');this.#paused=false;}
 close(){this.#closed=true;++this.#serial;this.#cancelRead?.();}
 #transportBytes(reference,raw){
  // Bound our reader's copy, not allocations made inside an injected transport.
  assertProtocolObjectReference(reference);
  if(!(raw instanceof Uint8Array)||raw.byteLength!==reference.encodedBytes)fail('BNS_OBJECT_INTEGRITY');return raw;
 }
 async #readUntil(action,deadline,serial,limitCode='BNS_RECOVERY_DISCOVERY_LIMIT'){
  this.#check(serial);const remaining=deadline-performance.now();if(remaining<=0)fail(limitCode);
  let timer,cancel;const interruption=new Promise((_,reject)=>{cancel=()=>reject(new SyncError('BNS_RECOVERY_INTERRUPTED'));this.#cancelRead=cancel;timer=setTimeout(()=>{++this.#serial;reject(new SyncError(limitCode));},remaining);});
  try{const result=await Promise.race([Promise.resolve().then(()=>{this.#check(serial);return action();}),interruption]);this.#check(serial);if(performance.now()>=deadline){++this.#serial;fail(limitCode);}return result;}
  finally{clearTimeout(timer);if(this.#cancelRead===cancel)this.#cancelRead=null;}
 }
 #work(timeout,serial=this.#serial){return {deadline:performance.now()+timeout,ticket:createOriginalRecoveryWork(this.#core.repository,{ms:timeout,isCurrent:()=>this.#check(serial)})};}
 #native(work,action){return withOriginalRecoveryWork(this.#core.repository,work.ticket,action);}
 #charge(work,length,refs=1,code='BNS_RECOVERY_READ_LIMIT'){
  try{chargeOriginalRecoveryWork(this.#core.repository,work.ticket,length,refs);if(performance.now()>=work.deadline)fail(code);}catch(error){if(error?.code==='BNS_GROUP_RESOURCE_LIMIT')fail(code);throw error;}
 }
 #reader(work,serial,code='BNS_RECOVERY_READ_LIMIT'){
  return async reference=>{this.#check(serial);assertProtocolObjectReference(reference);this.#charge(work,reference.encodedBytes+reference.decodedBytes,1,code);return this.#transportBytes(reference,await this.#readUntil(()=>this.#transport.get(clone(reference)),work.deadline,serial,code));};
 }
 async #stored(work=null){
  if(work)return this.#native(work,()=>this.#stored());
  const negative=await this.#core.transaction(false,t=>t.get('meta',sourcePurgeRestoreKey(this.#core,this.#restoreId)));
  return {negative:!!negative,row:negative??await this.#restore.stage.read('restore')};
 }
 async #tailItems(manifest,get,work,serial){
  const items=[];for await(const item of checkpointItems(manifest,get)){this.#check(serial);this.#charge(work,bytes(item).length);items.push(item);}return items;
 }
 #tailPath(previous,ref,manifest,discovered){
  if(manifest.parents.includes(previous))return [ref];
  if(!discovered||discovered.ref.id!==ref.id||!discovered.refs.has(previous))fail('BNS_GROUP_TAIL_INVALID');
  // Select a route to the SAME authenticated sole head, not a winning head.
  // Every edge is reauthenticated below. No timestamp or item count is used.
  const queue=[ref.id],towardHead=new Map([[ref.id,null]]);
  for(let i=0;i<queue.length&&!towardHead.has(previous);i++)for(const parent of discovered.parents.get(queue[i])??[]){if(towardHead.has(parent))continue;towardHead.set(parent,queue[i]);queue.push(parent);}
  if(!towardHead.has(previous))fail('BNS_GROUP_TAIL_INVALID');
  const path=[];for(let id=towardHead.get(previous);id!==null;id=towardHead.get(id)){const next=discovered.refs.get(id);if(!next)fail('BNS_GROUP_TAIL_INVALID');path.push(next);}return path;
 }
 #ordinaryTail(manifest){if(manifest.ownerScope.version!==1||manifest.coverage.some(x=>!['sourceBootstrapMember','sourceBootstrapCommit','sourceAppendMember','sourceAppendCommit','inputWorkingMember','inputWorkingCommit','filterIntent'].includes(x.type)))fail('BNS_GROUP_OWNER_UNSUPPORTED');}
 async #advance(row,ref,manifest,get,work,serial,discovered){
  if(!exact(row,['id','manifestId','manifestRef','manifest','phase','base','replayId','received','graphDigest'])||Object.keys(row).length!==9||row.phase!=='validated'||row.manifestId!==row.manifestRef?.id||this.#negative||row.manifest?.ownerScope?.families.some(x=>x.type==='sourcePurgeIntent')||manifest.ownerScope.families.some(x=>x.type==='sourcePurgeIntent'))fail('BNS_RESTORE_ID_COLLISION');
  this.#ordinaryTail(row.manifest);this.#ordinaryTail(manifest);
  const path=this.#tailPath(row.manifestId,ref,manifest,discovered),old=decodeJSON(await readObject(row.manifestRef,get),SEGMENT_PROFILE.decoded);
  assertGroupedCheckpointManifest(old,{core:this.#core});if(!equal(old,row.manifest))fail('BNS_RESTORE_STAGE_CHANGED');
  let prior=await this.#tailItems(old,get,work,serial),parent=row.manifestId;const steps=[];
  // Validate the entire causal route BEFORE replacing any durable staged cut.
  // The original owner then independently rechecks each exact delta and CAS.
  for(const next of path){
   const m=next.id===ref.id?manifest:decodeJSON(await readObject(next,get),SEGMENT_PROFILE.decoded);assertGroupedCheckpointManifest(m,{core:this.#core});
   this.#ordinaryTail(m);if(!m.parents.includes(parent)||m.ownerScope.families.some(x=>x.type==='sourcePurgeIntent'))fail('BNS_GROUP_TAIL_INVALID');
   const items=await this.#tailItems(m,get,work,serial);await validateGroupedCheckpointGraph(this.#core,items,m,{store:this.#store});await requireCheckpointRevisionRetention(this.#core,prior,items);this.#check(serial);this.#charge(work,0,0);
   const known=new Set(prior.filter(x=>x.kind==='revision').map(x=>x.operation.revisionId));steps.push({ref:next,operations:items.filter(x=>x.kind==='revision'&&!known.has(x.operation.revisionId)).map(x=>x.operation)});prior=items;parent=next.id;
  }
  await this.#checkpoint('validated-tail');this.#check(serial);this.#charge(work,0,0);
  for(const step of steps){
   this.#check(serial);this.#charge(work,0,0);await this.#restore.reconcileTail(step.operations,{ref:step.ref,get});
   // A lost ACK may leave a newer VALIDATED stage. The next entry reads that
   // original durable row; the old in-memory ref is never recovery authority.
   this.#ref=clone(step.ref);this.#check(serial);this.#charge(work,0,0);await this.#checkpoint('reconciled-tail');this.#check(serial);this.#charge(work,0,0);
  }
  this.#state='validated';
 }
 async #stage(ref,serial,work=null,discovered=this.#discovered){
  work??=discovered?.ref.id===ref?.id?discovered.work:null;this.#discovered=null;this.#activationWork=null;const startedWork=work??this.#work(this.#readTimeoutMs),detached=clone(ref),held=await this.#stored(startedWork);this.#check(serial);
  const row=held.row,previous=row?.manifestRef??this.#ref,advancing=!!previous&&previous.id!==detached?.id;
  if(advancing&&(!row||held.negative||row.phase!=='validated'))fail('BNS_RESTORE_ID_COLLISION');
  if(row?.manifestRef)this.#ref=clone(row.manifestRef);else this.#ref=detached;
  // Ordinary stage keeps its existing owner limits. A tail (including every
  // intermediate edge) shares one finite read ticket; discovered recovery
  // also carries its already-consumed discovery ticket into this stage.
  if(advancing&&!work)work=startedWork;
  if(work)this.#charge(work,0,0);
  const deadline=Math.min(work?.deadline??Infinity,performance.now()+this.#readTimeoutMs);if(work){work.deadline=deadline;tightenOriginalRecoveryWork(this.#core.repository,work.ticket,Math.max(Number.EPSILON,deadline-performance.now()));}
  const get=work?this.#reader(work,serial):async reference=>{this.#check(serial);const raw=await this.#readUntil(()=>this.#transport.get(clone(reference)),deadline,serial,'BNS_RECOVERY_READ_LIMIT');this.#check(serial);return this.#transportBytes(reference,raw);};
  const manifest=decodeJSON(await readObject(detached,get),SEGMENT_PROFILE.decoded);assertGroupedCheckpointManifest(manifest,{core:this.#core});
  if(advancing){await this.#native(work,()=>this.#advance(row,detached,manifest,get,work,serial,discovered));this.#activationWork=work;return;}
  if(manifest.ownerScope.families.some(x=>x.type==='sourcePurgeIntent')){this.#restore=new SourcePurgeGroupedCheckpointRestore(this.#core,{store:this.#store,restoreId:this.#restoreId,persistent:true,isCurrent:()=>{this.#check(serial);return true;},checkpoint:async(...args)=>{this.#check(serial);await this.#checkpoint(...args);this.#check(serial);}});this.#negative=true;}else if(this.#negative||held.negative)fail('BNS_RESTORE_ID_COLLISION');
  const result=await this.#restore.stageCheckpoint(detached,get);this.#check(serial);if(performance.now()>=deadline)fail('BNS_RECOVERY_READ_LIMIT');
  // A previous activation still requires the original replay/epoch proof.
  this.#state=['activated','merged'].includes(result.phase)?'confirmation-needed':'validated';
 }
 async stage(ref){return this.#run('reading',serial=>this.#stage(ref,serial));}
 async activate(){
  return this.#run('applying',async serial=>{
   this.#check(serial);this.#recoveryState='unconfirmed';const work=this.#activationWork;this.#activationWork=null;let result;try{result=work?await this.#native(work,()=>this.#restore.activate()):await this.#restore.activate();}finally{if(work)finishOriginalRecoveryWork(this.#core.repository,work.ticket);}
   // Pause fences upcoming reads and the owner's in-transaction checkpoints.
   // It cannot undo a committed transaction or consumer publication. Once the
   // owner confirms activation, report that outcome even if paused or closed.
   if(result?.state!=='activated')fail('BNS_RESTORE_NOT_READY');this.#state='restored';this.#recoveryState='restored';
  });
 }
 async recover(ref){await this.stage(ref);return this.activate();}
 async resumeStored(){
  return this.#run('reading',async serial=>{
   const {row}=await this.#stored();this.#check(serial);if(!row?.manifestRef)fail('BNS_RESTORE_NOT_READY');
   this.#ref=clone(row.manifestRef);this.#state=['validated','publishing','activated','merged'].includes(row.phase)?'confirmation-needed':'incomplete';
  });
 }
 async continueStored(){await this.resumeStored();return this.recover(this.#ref);}
 // Exhaust the bounded listing and authenticate manifests with the original
 // owner before following its explicit supersession parents. Historical cuts
 // are supported; incomparable heads still need the causal/merge owner. No
 // timestamp, listing order or largest item count wins this selection.
 async #discover(serial){
   this.#discovered=null;
   if(typeof this.#transport.listCheckpoints!=='function')fail('BNS_RECOVERY_DISCOVERY_UNAVAILABLE');
   let cursor=null;const cursors=new Set(),refs=new Map();let scanned=0,pages=0;const work=this.#work(this.#discoveryTimeoutMs),deadline=work.deadline;const held=await this.#stored(work);
   do{
    if(++pages>4096||performance.now()>=deadline)fail('BNS_RECOVERY_DISCOVERY_LIMIT');
    this.#check(serial);const page=await this.#readUntil(()=>this.#transport.listCheckpoints({cursor,limit:100}),deadline,serial);this.#check(serial);
    if(!exact(page,['items','nextCursor'])||!Array.isArray(page.items)||page.items.length>100||page.nextCursor!==null&&(typeof page.nextCursor!=='string'||!page.nextCursor||page.nextCursor.length>2048))fail('BNS_RECOVERY_DISCOVERY_INVALID');
    for(const ref of page.items){if(++scanned>4096)fail('BNS_RECOVERY_DISCOVERY_LIMIT');if(ref?.kind!=='checkpoint-manifest'||!hash(ref.id))fail('BNS_RECOVERY_DISCOVERY_INVALID');assertProtocolObjectReference(ref);const old=refs.get(ref.id);if(old&&!equal(old,ref))fail('BNS_RECOVERY_DISCOVERY_INVALID');refs.set(ref.id,clone(ref));}
    this.#charge(work,bytes(page).length,page.items.length,'BNS_RECOVERY_DISCOVERY_LIMIT');
    cursor=page.nextCursor;if(cursor!==null){if(cursors.has(cursor))fail('BNS_RECOVERY_DISCOVERY_INVALID');cursors.add(cursor);}
   }while(cursor!==null);
   if(refs.size===0)fail('BNS_RECOVERY_REMOTE_MISSING');
   const parents=new Map(),cuts=new Map(),manifests=new Map(),children=new Map([...refs.keys()].map(id=>[id,[]]));
   const get=this.#reader(work,serial,'BNS_RECOVERY_DISCOVERY_LIMIT');
   for(const [id,ref]of refs){
    const manifest=decodeJSON(await readObject(ref,get),SEGMENT_PROFILE.decoded);
    this.#check(serial);if(performance.now()>=deadline)fail('BNS_RECOVERY_DISCOVERY_LIMIT');
    assertGroupedCheckpointManifest(manifest,{core:this.#core});manifests.set(id,manifest);
    const known=manifest.parents.filter(parent=>refs.has(parent));parents.set(id,known);
    for(const parent of known)children.get(parent).push(id);
   }
   // Kahn's traversal also refuses a cycle, without recursive graph walking.
   const remaining=new Map([...parents].map(([id,list])=>[id,list.length]));
   const ready=[...remaining].filter(([,count])=>count===0).map(([id])=>id);let visited=0;
   for(let index=0;index<ready.length;index++){visited++;for(const child of children.get(ready[index])){remaining.set(child,remaining.get(child)-1);if(remaining.get(child)===0)ready.push(child);}}
   if(visited!==refs.size)fail('BNS_RECOVERY_DISCOVERY_INVALID');
   const heads=[...children].filter(([,list])=>list.length===0).map(([id])=>id);
   if(heads.length!==1)fail('BNS_RECOVERY_MULTIPLE_CHECKPOINTS');
   // Classify the actual sole successor, not the number of historical cuts.
   // Re-discovering an unchanged staged head keeps its original owner profile.
   const tail=held.row?.phase==='validated'&&!held.negative&&heads[0]!==held.row.manifestId;
   let decodedItems=0;
   for(const [id,manifest]of manifests){
    if(tail)this.#ordinaryTail(manifest);
    const items=[];for await(const item of checkpointItems(manifest,get)){if(++decodedItems>4096)fail('BNS_RECOVERY_DISCOVERY_LIMIT');if(tail)this.#charge(work,bytes(item).length,1,'BNS_RECOVERY_DISCOVERY_LIMIT');items.push(item);}
    // Reuse the exact staged owner's graph/heads/frontier/scope compiler.
    const validate=async()=>{if(manifest.ownerScope.families.some(x=>x.type==='sourcePurgeIntent'))await validateSourcePurgeCheckpointGraph(this.#core,items,manifest);else await validateGroupedCheckpointGraph(this.#core,items,manifest,{store:this.#store});};
    if(tail)await this.#native(work,validate);else await validate();
    this.#check(serial);if(performance.now()>=deadline)fail('BNS_RECOVERY_DISCOVERY_LIMIT');cuts.set(id,items);
   }
   // A parent pointer alone is not a retention proof: the producer accepts
   // caller-supplied parent IDs. Require the original reconcileTail invariant
   // as well: every historical revision remains exact in the validated head.
   // Current projections or compaction that cannot prove this are refused.
   const selected=cuts.get(heads[0]);for(const revisions of cuts.values())await requireCheckpointRevisionRetention(this.#core,revisions,selected);
   this.#check(serial);this.#charge(work,0,0,'BNS_RECOVERY_DISCOVERY_LIMIT');
   this.#state='discovered';this.#discovered={ref:clone(refs.get(heads[0])),refs,parents,work};return {discovered:this.#discovered,work,serial};
 }
 async discover(){return this.#run('discovering',async serial=>clone((await this.#discover(serial)).discovered.ref));}
 async recoverDiscovered(){
  const result=await this.#run('discovering',serial=>this.#discover(serial));
  await this.#run('reading',serial=>{this.#check(result.serial);return this.#stage(result.discovered.ref,serial,result.work,result.discovered);});return this.activate();
 }
}
