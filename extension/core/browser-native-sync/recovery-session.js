import {StagedSyncRestore,checkpointItems} from './checkpoints.js';
import {validateGroupedCheckpointGraph} from './group-checkpoint.js';
import {assertProtocolObjectReference,readObject,SEGMENT_PROFILE} from './segments.js';
import {assertGroupedCheckpointManifest} from './group-checkpoint-manifest.js';
import {bytes,clone,decodeJSON,equal,exact,fail,hash,opaque,SyncError} from './value.js';

// Local-stage coordinator only. The caller supplies an already-bound original
// Core/store and a transport; this module creates no provider, account or grant.
// Durable progress belongs exclusively to the existing staged restore owner.
export class LocalSyncRecoverySession {
 #restore;#transport;#core;#store;#discoveryTimeoutMs;#readTimeoutMs;#cancelRead=null;#recoveryState='not-restored';#busy=false;#paused=false;#closed=false;#serial=0;#ref=null;#state='idle';#error=null;
 constructor(core,{store,transport,restoreId=crypto.randomUUID(),checkpoint=async()=>{},discoveryTimeoutMs=30000,readTimeoutMs=30000}={}){
  if(store?.repository!==core?.repository||!core?.repository||typeof transport?.get!=='function'||!opaque(restoreId)||typeof checkpoint!=='function'||!Number.isSafeInteger(discoveryTimeoutMs)||discoveryTimeoutMs<1||discoveryTimeoutMs>30000||!Number.isSafeInteger(readTimeoutMs)||readTimeoutMs<1||readTimeoutMs>30000)fail('BNS_RECOVERY_BINDING');
  this.#transport=transport;this.#core=core;this.#store=store;this.#discoveryTimeoutMs=discoveryTimeoutMs;this.#readTimeoutMs=readTimeoutMs;
  this.#restore=new StagedSyncRestore(core,{restoreId,grouped:{store},checkpoint:async(...args)=>{this.#check();await checkpoint(...args);this.#check();}});
 }
 get restoreId(){return this.#restore.restoreId;}
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
 async stage(ref){
  return this.#run('reading',async serial=>{
   const deadline=performance.now()+this.#readTimeoutMs;
   const detached=clone(ref);if(this.#ref&&this.#ref.id!==detached?.id)fail('BNS_RESTORE_ID_COLLISION');this.#ref=detached;
   const get=async reference=>{this.#check(serial);const raw=await this.#readUntil(()=>this.#transport.get(clone(reference)),deadline,serial,'BNS_RECOVERY_READ_LIMIT');this.#check(serial);return this.#transportBytes(reference,raw);};
   const result=await this.#restore.stageCheckpoint(detached,get);this.#check(serial);if(performance.now()>=deadline)fail('BNS_RECOVERY_READ_LIMIT');
   // A previous activation still requires the original replay/epoch proof.
   this.#state=result.phase==='activated'?'confirmation-needed':'validated';
  });
 }
 async activate(){
  return this.#run('applying',async serial=>{
   this.#check(serial);this.#recoveryState='unconfirmed';const result=await this.#restore.activate();
   // Pause fences upcoming reads and the owner's in-transaction checkpoints.
   // It cannot undo a committed transaction or consumer publication. Once the
   // owner confirms activation, report that outcome even if paused or closed.
   if(result?.state!=='activated')fail('BNS_RESTORE_NOT_READY');this.#state='restored';this.#recoveryState='restored';
  });
 }
 async recover(ref){await this.stage(ref);return this.activate();}
 async resumeStored(){
  return this.#run('reading',async serial=>{
   const row=await this.#restore.stage.read('restore');this.#check(serial);if(!row?.manifestRef)fail('BNS_RESTORE_NOT_READY');
   this.#ref=clone(row.manifestRef);this.#state=['validated','publishing','activated'].includes(row.phase)?'confirmation-needed':'incomplete';
  });
 }
 async continueStored(){await this.resumeStored();return this.recover(this.#ref);}
 // Exhaust the bounded listing and authenticate manifests with the original
 // owner before following its explicit supersession parents. Historical cuts
 // are supported; incomparable heads still need the causal/merge owner. No
 // timestamp, listing order or largest item count wins this selection.
 async discover(){
  return this.#run('discovering',async serial=>{
   if(typeof this.#transport.listCheckpoints!=='function')fail('BNS_RECOVERY_DISCOVERY_UNAVAILABLE');
   let cursor=null;const cursors=new Set(),refs=new Map();let scanned=0,pages=0,totalBytes=0;const started=performance.now(),deadline=started+this.#discoveryTimeoutMs;
   do{
    if(++pages>4096||performance.now()>=deadline)fail('BNS_RECOVERY_DISCOVERY_LIMIT');
    this.#check(serial);const page=await this.#readUntil(()=>this.#transport.listCheckpoints({cursor,limit:100}),deadline,serial);this.#check(serial);
    if(!exact(page,['items','nextCursor'])||!Array.isArray(page.items)||page.items.length>100||page.nextCursor!==null&&(typeof page.nextCursor!=='string'||!page.nextCursor||page.nextCursor.length>2048))fail('BNS_RECOVERY_DISCOVERY_INVALID');
    for(const ref of page.items){if(++scanned>4096)fail('BNS_RECOVERY_DISCOVERY_LIMIT');if(ref?.kind!=='checkpoint-manifest'||!hash(ref.id))fail('BNS_RECOVERY_DISCOVERY_INVALID');assertProtocolObjectReference(ref);const old=refs.get(ref.id);if(old&&!equal(old,ref))fail('BNS_RECOVERY_DISCOVERY_INVALID');refs.set(ref.id,clone(ref));}
    totalBytes+=bytes(page).length;if(totalBytes>2*1024*1024||performance.now()>=deadline)fail('BNS_RECOVERY_DISCOVERY_LIMIT');
    cursor=page.nextCursor;if(cursor!==null){if(cursors.has(cursor))fail('BNS_RECOVERY_DISCOVERY_INVALID');cursors.add(cursor);}
   }while(cursor!==null);
   if(refs.size===0)fail('BNS_RECOVERY_REMOTE_MISSING');
   const parents=new Map(),cuts=new Map(),children=new Map([...refs.keys()].map(id=>[id,[]]));
   const get=async reference=>{
    assertProtocolObjectReference(reference);totalBytes+=reference.encodedBytes+reference.decodedBytes;
    if(totalBytes>2*1024*1024||performance.now()>=deadline)fail('BNS_RECOVERY_DISCOVERY_LIMIT');
    return this.#transportBytes(reference,await this.#readUntil(()=>this.#transport.get(clone(reference)),deadline,serial));
   };
   let decodedItems=0;
   for(const [id,ref]of refs){
    const manifest=decodeJSON(await readObject(ref,get),SEGMENT_PROFILE.decoded);
    this.#check(serial);if(performance.now()>=deadline)fail('BNS_RECOVERY_DISCOVERY_LIMIT');
    assertGroupedCheckpointManifest(manifest,{core:this.#core});
    const items=[];for await(const item of checkpointItems(manifest,get)){if(++decodedItems>4096)fail('BNS_RECOVERY_DISCOVERY_LIMIT');items.push(item);}
    // Reuse the exact staged owner's graph/heads/frontier/scope compiler.
    await validateGroupedCheckpointGraph(this.#core,items,manifest,{store:this.#store});
    this.#check(serial);if(performance.now()>=deadline)fail('BNS_RECOVERY_DISCOVERY_LIMIT');
    cuts.set(id,new Map(items.filter(item=>item.kind==='revision').map(item=>[item.operation.revisionId,item])));
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
   // A parent pointer alone is not a retention proof: the producer accepts
   // caller-supplied parent IDs. Require the original reconcileTail invariant
   // as well: every historical revision remains exact in the validated head.
   // Current projections or compaction that cannot prove this are refused.
   const selected=cuts.get(heads[0]);for(const revisions of cuts.values())for(const [id,item]of revisions)if(!equal(selected.get(id)??null,item))fail('BNS_GROUP_TAIL_INVALID');
   this.#state='discovered';return clone(refs.get(heads[0]));
  });
 }
 async recoverDiscovered(){const ref=await this.discover();return this.recover(ref);}
}
