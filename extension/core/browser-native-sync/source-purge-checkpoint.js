import {registerRepositoryWorkLimit} from '../idb-repository.js';
import {encodeOriginalCheckpoint,checkpointItems,readCheckpointManifest} from './checkpoints.js';
import {SourcePurgeReceiver,prepareSourcePurgeRemote} from './source-purge-journal.js';
import {acceptSequence} from './core.js';
import {assertProtocolObjectReference,SEGMENT_PROFILE} from './segments.js';
import {bytes,clone,equal,fail,exact,canonical,hash} from './value.js';
const invalid=()=>fail('BNS_SOURCE_PURGE_CHECKPOINT_INVALID');
const sort=rows=>[...rows].sort((a,b)=>canonical(a).localeCompare(canonical(b)));
const strip=({id,...row})=>row;
const pending=new WeakMap(),serials=new WeakMap(),configs=new WeakMap();
function settings(profile,limits){
 if(profile!==SEGMENT_PROFILE||!limits||Object.getPrototypeOf(limits)!==Object.prototype||Reflect.ownKeys(limits).some(k=>typeof k!=='string'||!['references','bytes','ms'].includes(k)||!Object.hasOwn(Object.getOwnPropertyDescriptor(limits,k),'value')))invalid();
 const result={references:limits.references??4096,bytes:limits.bytes??2*1024*1024,ms:limits.ms??30000};
 for(const [key,max]of [['references',4096],['bytes',2*1024*1024],['ms',30000]])if(!Number.isSafeInteger(result[key])||result[key]<=0||result[key]>max)invalid();return Object.freeze(result);
}
function ledger(limits,isCurrent=()=>true){
 let references=0,size=0,active=true,timer;const started=Date.now();
 const current=()=>{if(!active||!isCurrent()||Date.now()-started>limits.ms)fail('BNS_SOURCE_PURGE_CHECKPOINT_LIMIT');};
 const charge=ref=>{current();assertProtocolObjectReference(ref,SEGMENT_PROFILE);if(++references>limits.references||(size+=ref.encodedBytes+ref.decodedBytes)>limits.bytes)fail('BNS_SOURCE_PURGE_CHECKPOINT_LIMIT');};
 return {current,get:get=>async ref=>{const selected=Object.freeze(clone(ref));charge(selected);const raw=await get(clone(selected));current();if(!(raw instanceof Uint8Array)||raw.byteLength!==selected.encodedBytes||raw.byteLength>limits.bytes)fail('BNS_OBJECT_INTEGRITY');return raw;},put:put=>async(ref,data)=>{const selected=Object.freeze(clone(ref));charge(selected);if(!(data instanceof Uint8Array)||data.byteLength!==selected.encodedBytes)invalid();await put(clone(selected),data.slice());current();},async run(work){try{return await Promise.race([work(),new Promise((_,reject)=>{timer=setTimeout(()=>{active=false;reject(Object.assign(Error('BNS_SOURCE_PURGE_CHECKPOINT_LIMIT'),{code:'BNS_SOURCE_PURGE_CHECKPOINT_LIMIT'}));},limits.ms);})]);}finally{active=false;clearTimeout(timer);}}};
}
async function compile(core,items,manifest){
 if(items.length>25||bytes(items).length>2*1024*1024)invalid();
 const revisions=[],heads=[],frontiers=[];for(const item of items){
  if(item.kind==='revision'&&exact(item,['kind','operation','redacted'])&&Object.keys(item).length===3&&typeof item.redacted==='boolean')revisions.push(item);
  else if(item.kind==='head'&&exact(item,['kind','type','entityId','revisions','purged','fence'])&&Object.keys(item).length===6){const {kind,...row}=item;heads.push(row);}
  else if(item.kind==='frontier'&&exact(item,['kind','deviceId','frontier','ranges'])&&Object.keys(item).length===4){const {kind,...row}=item;frontiers.push(row);}else invalid();
 }
 if(revisions.length!==15||heads.length!==8)invalid();
 const remote=await prepareSourcePurgeRemote(revisions.filter(item=>item.operation.kind==='purge'||item.operation.type==='sourcePurgeIntent').map(item=>item.operation),core);
 const expectedRevisions=[...remote.intent.targets.map(x=>({kind:'revision',operation:x.before,redacted:true})),...remote.operations.map(operation=>({kind:'revision',operation,redacted:operation.kind==='purge'}))];
 const expectedHeads=remote.operations.map(op=>({type:op.type,entityId:op.entityId,revisions:[op.revisionId],purged:op.kind==='purge',fence:op.kind==='purge'?op.revisionId:null}));
 if(!equal(sort(revisions),sort(expectedRevisions))||!equal(sort(heads),sort(expectedHeads)))invalid();
 const expectedFrontier=new Map();for(const op of [...remote.intent.targets.map(x=>x.before),...remote.operations])expectedFrontier.set(op.deviceId,acceptSequence(expectedFrontier.get(op.deviceId),op.sequence));
 const frontierRows=[...expectedFrontier].map(([deviceId,value])=>({...value,deviceId}));if(!equal(sort(frontiers),sort(frontierRows)))invalid();
 const coverage=[{type:'sourceBootstrapCommit',version:1,count:1},{type:'sourceBootstrapMember',version:1,count:6},{type:'sourcePurgeIntent',version:1,count:1}];if(manifest&&!equal(manifest.coverage,coverage))invalid();return remote;
}
async function marker(store,core){return store.run(()=>core.transaction(false,async t=>({namespace:await core.bind(t),generation:(await core.get(t,'generation'))?.value||0,ownerGeneration:(await t.get('meta','backup-data-generation'))?.value||0})));}
async function currentCut(store,core,cut){if(!equal(await marker(store,core),cut))fail('BNS_SNAPSHOT_CHANGED');}
// An immutable negative-intent checkpoint, not a full canonical backup. It
// reuses the original container; old/general owners still refuse activation.
export async function buildSourcePurgeCheckpoint(core,transport,{store,profile=SEGMENT_PROFILE,parents=[],limits={}}={}){
 if(store?.repository!==core.repository||!Array.isArray(parents)||parents.length>128||parents.some(x=>!hash(x)))invalid();const limit=settings(profile,limits),selectedParents=clone(parents),work=ledger(limit),get=work.get(ref=>transport.get(ref)),put=work.put((ref,data)=>transport.putImmutable(ref,data));
 return work.run(async()=>{await store.finishFoundation();work.current();const cut=await marker(store,core),items=[];
 await core.transaction(true,async t=>{registerRepositoryWorkLimit(core.repository,t,limit);for(const kind of ['revision','head','frontier']){let after=null;do{const page=await t.primaryRangePage('meta',{prefix:await core.idIn(t,kind),after,limit:16});for(const {value:row}of page.rows){items.push(kind==='revision'?{kind,operation:row.operation,redacted:row.redacted}:{kind,...strip(row)});if(items.length>25||bytes(items).length>limit.bytes)invalid();}after=page.next;}while(after!==null);}},['meta']);
 const proof=await compile(core,items,null);await currentCut(store,core,cut);work.current();
 await core.transaction(false,async t=>{const deny=await t.get('meta',core.prefix+'sourcePurgeDeny:'+proof.intent.sourceKey),tomb=await t.get('tombstones','source:'+proof.intent.sourceKey);if(deny?.intent!==proof.operations[7].revisionId||tomb?.value?.status!=='permanently_ignored'||await t.get('records',proof.intent.sourceId))invalid();});
 // Feed the original encoder the exact validated detached cut, not a second
 // unbounded database scan. A deadline never claims to undo an immutable put.
 const result=await encodeOriginalCheckpoint(core.datasetId,{putImmutable:put,get},{profile,parents:selectedParents,cut,rows:async function*(kind){for(const item of items)if(item.kind===kind){work.current();const {kind:_,...row}=item;yield row;}},verifyCut:async()=>{await currentCut(store,core,cut);work.current();}});await currentCut(store,core,cut);work.current();return result;});
}
// Stage retains bodyfree validated data only in this session; restart requires
// reading the immutable cut again. No stage-only ACK or activation is persisted.
export class SourcePurgeCheckpointRestore{
 constructor(core,{store,profile=SEGMENT_PROFILE,limits={}}={}){if(store?.repository!==core.repository)invalid();const limit=settings(profile,limits);this.core=core;this.store=store;this.profile=profile;configs.set(this,{core,store,profile,limits:limit});}
 async stageCheckpoint(ref,get){
  pending.delete(this);const serial=(serials.get(this)||0)+1;serials.set(this,serial);const config=configs.get(this);if(!config||this.core!==config.core||this.store!==config.store||this.profile!==config.profile)invalid();
  assertProtocolObjectReference(ref,config.profile);const selectedRef=clone(ref),{core,store,profile,limits}=config,work=ledger(limits,()=>serials.get(this)===serial),boundedGet=work.get(get);
  return work.run(async()=>{await store.finishFoundation();work.current();const cut=await marker(store,core);work.current();const manifest=await readCheckpointManifest(selectedRef,boundedGet,{datasetId:core.datasetId,profile}),items=[];
   if(manifest.itemCount>25)invalid();for await(const item of checkpointItems(manifest,boundedGet,{profile})){work.current();items.push(item);if(items.length>25||bytes(items).length>limits.bytes)invalid();}
   const proof=await compile(core,items,manifest);await currentCut(store,core,cut);work.current();pending.set(this,{core,store,profile,cut,proof,ref:selectedRef,phase:'validated'});return {phase:'validated',manifestId:selectedRef.id,operationCount:8};
  });
 }
 async activate(){const p=pending.get(this);if(!p||this.core!==p.core||this.store!==p.store||this.profile!==p.profile)fail('BNS_RESTORE_NOT_READY');if(p.phase==='activated')return {state:'activated'};await currentCut(p.store,p.core,p.cut);const result=await new SourcePurgeReceiver(p.store,p.core).receive(p.proof.operations);p.phase='activated';return {state:'activated',result:result.state};}
}
