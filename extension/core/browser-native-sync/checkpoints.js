import {BrowserNativeSyncCore,CORE_LIMITS,validateOperation} from './core.js';
import {CODECS,validateCoverage} from './codecs.js';
import {protocolObject,readObject,SEGMENT_PROFILE} from './segments.js';
import {bytes,clone,count,decodeJSON,digest,equal,exact,fail,hash,identifier,opaque} from './value.js';

const FANOUT=128;
const withoutId=row=>{const {id,...data}=row;return data;};
const stateKey=(type,id)=>JSON.stringify([type,id]);
async function putVerified(transport,object,profile){await transport.putImmutable(object.ref,object.bytes);await readObject(object.ref,ref=>transport.get(ref),{profile});return object.ref;}
async function marker(core){return core.transaction(false,async t=>({namespace:await core.bind(t),generation:(await core.get(t,'generation'))?.value||0}),['meta']);}
async function requireMarker(core,expected){if(!equal(await marker(core),expected))fail('BNS_SNAPSHOT_CHANGED');}

// Complete immutable checkpoint, including all retained live/conflict ancestry
// and body-free purge receipts. Bounded index pages avoid a giant global manifest.
export async function buildCheckpoint(core,transport,{profile=SEGMENT_PROFILE,parents=[]}={}){
 if(!Array.isArray(parents)||parents.length>FANOUT||parents.some(x=>!hash(x)))fail('BNS_CHECKPOINT_PARENTS');
 const cut=await marker(core);for await(const _ of core.rows('pending'))fail('BNS_CHECKPOINT_CAUSAL_GAP');
 let entries=[],entrySize=0,itemCount=0,chain='',leafRefs=[];const coverage=new Map();
 const flush=async()=>{if(!entries.length)return;leafRefs.push(await putVerified(transport,await protocolObject('checkpoint-shard',bytes({magic:'PAIA-BNS',protocol:1,datasetId:core.datasetId,level:0,entries}),{profile}),profile));entries=[];entrySize=0;};
 async function add(item){
  const raw=bytes(item);chain=await digest(bytes(chain+'\n'+new TextDecoder().decode(raw)));itemCount++;
  let entry={kind:'inline',item};
  if(raw.length>profile.target-4096){
   if(raw.length>profile.operationBytes)fail('BNS_OPERATION_RESOURCE_LIMIT');const chunks=[];
   for(let offset=0;offset<raw.length;offset+=profile.chunk)chunks.push(await putVerified(transport,await protocolObject('chunk',raw.slice(offset,offset+profile.chunk),{profile}),profile));
   entry={kind:'chunked',bytes:raw.length,digest:await digest(raw),chunks};
  }
  const size=bytes(entry).length;if(entries.length&&(entrySize+size+1024>profile.target||entries.length>=profile.operations))await flush();
  if(size+1024>profile.encoded)fail('BNS_CHECKPOINT_ITEM_LIMIT');entries.push(entry);entrySize+=size;
 }
 for await(const row of core.rows('revision'))await add({kind:'revision',...withoutId(row)});
 for await(const row of core.rows('head')){await add({kind:'head',...withoutId(row)});const family=coverage.get(row.type)||{type:row.type,version:CODECS[row.type].version,count:0};family.count++;coverage.set(row.type,family);}
 for await(const row of core.rows('frontier'))await add({kind:'frontier',...withoutId(row)});
 await flush();await requireMarker(core,cut);
 let level=0,current=leafRefs;
 if(!current.length)current=[await putVerified(transport,await protocolObject('checkpoint-shard',bytes({magic:'PAIA-BNS',protocol:1,datasetId:core.datasetId,level:0,entries:[]}),{profile}),profile)];
 while(current.length>1){const next=[];level++;for(let offset=0;offset<current.length;offset+=FANOUT)next.push(await putVerified(transport,await protocolObject('checkpoint-shard',bytes({magic:'PAIA-BNS',protocol:1,datasetId:core.datasetId,level,children:current.slice(offset,offset+FANOUT)}),{profile}),profile));current=next;}
 await requireMarker(core,cut);
 const manifest={magic:'PAIA-BNS',protocol:1,kind:'checkpoint-manifest',datasetId:core.datasetId,clientEncryption:'none',root:current[0],level,itemCount,chain,coverage:[...coverage.values()].sort((a,b)=>a.type.localeCompare(b.type)),parents:[...parents].sort()};
 const object=await protocolObject('checkpoint-manifest',bytes(manifest),{profile});
 await putVerified(transport,object,profile);
 return {ref:object.ref,manifest,cut};
}

async function readManifest(ref,get,{datasetId,profile,supported}){
 if(ref?.kind!=='checkpoint-manifest')fail('BNS_CHECKPOINT_INVALID');
 const value=decodeJSON(await readObject(ref,get,{profile}),profile.decoded);
 if(!exact(value,['magic','protocol','kind','datasetId','clientEncryption','root','level','itemCount','chain','coverage','parents'])||value.magic!=='PAIA-BNS'||value.protocol!==1||value.kind!=='checkpoint-manifest'||value.datasetId!==datasetId||value.clientEncryption!=='none'||!count(value.level)||value.level>8||!count(value.itemCount)||!hash(value.chain)&&value.itemCount!==0||!Array.isArray(value.parents)||value.parents.length>FANOUT||value.parents.some(x=>!hash(x))||new Set(value.parents).size!==value.parents.length)fail('BNS_CHECKPOINT_INVALID');
 validateCoverage(value.coverage,supported);return value;
}
export async function* checkpointItems(manifest,get,{profile=SEGMENT_PROFILE}={}){
 const stack=[{ref:manifest.root,level:manifest.level}],seen=new Set();let countItems=0,chain='';
 while(stack.length){
  const {ref,level}=stack.pop();if(ref.kind!=='checkpoint-shard'||seen.has(ref.id))fail('BNS_CHECKPOINT_GRAPH');seen.add(ref.id);
  const page=decodeJSON(await readObject(ref,get,{profile}),profile.decoded);
  if(page.magic!=='PAIA-BNS'||page.protocol!==1||page.datasetId!==manifest.datasetId||page.level!==level)fail('BNS_CHECKPOINT_GRAPH');
  if(level>0){if(!exact(page,['magic','protocol','datasetId','level','children'])||!Array.isArray(page.children)||!page.children.length||page.children.length>FANOUT)fail('BNS_CHECKPOINT_GRAPH');for(const child of [...page.children].reverse())stack.push({ref:child,level:level-1});continue;}
  if(!exact(page,['magic','protocol','datasetId','level','entries'])||!Array.isArray(page.entries)||page.entries.length>profile.operations)fail('BNS_CHECKPOINT_GRAPH');
  for(const entry of page.entries){
   let item;
   if(entry.kind==='inline'&&exact(entry,['kind','item']))item=entry.item;
   else if(entry.kind==='chunked'&&exact(entry,['kind','bytes','digest','chunks'])&&count(entry.bytes)&&entry.bytes>0&&entry.bytes<=profile.operationBytes&&hash(entry.digest)&&Array.isArray(entry.chunks)&&entry.chunks.length>0&&entry.chunks.length<=profile.dependencies){
    const size=entry.chunks.reduce((sum,ref)=>sum+(count(ref.decodedBytes)?ref.decodedBytes:Infinity),0);if(size!==entry.bytes||entry.chunks.some(ref=>ref.kind!=='chunk'))fail('BNS_CHECKPOINT_GRAPH');
    const raw=new Uint8Array(size);let offset=0;for(const ref of entry.chunks){const part=await readObject(ref,get,{profile});raw.set(part,offset);offset+=part.length;}
    if(await digest(raw)!==entry.digest)fail('BNS_CHUNK_INTEGRITY');item=decodeJSON(raw,profile.operationBytes);
   }else fail('BNS_CHECKPOINT_GRAPH');
   chain=await digest(bytes(chain+'\n'+new TextDecoder().decode(bytes(item))));if(++countItems>manifest.itemCount)fail('BNS_CHECKPOINT_COUNT');yield item;
  }
 }
 if(countItems!==manifest.itemCount||chain!==manifest.chain)fail('BNS_CHECKPOINT_COUNT');
}

function validateRedacted(operation){
 if(!exact(operation,['protocol','datasetId','deviceId','sequence','operationId','type','entityId','codecVersion','kind','actor','parents','value','revisionId'])||operation.protocol!==1||!opaque(operation.datasetId)||!opaque(operation.deviceId)||!opaque(operation.operationId)||!count(operation.sequence)||operation.sequence<1||!Object.hasOwn(CODECS,operation.type)||operation.codecVersion!==1||!identifier(operation.entityId)||!['put','purge'].includes(operation.kind)||!['user','source','bootstrap'].includes(operation.actor)||operation.value!==null||!hash(operation.revisionId)||!Array.isArray(operation.parents)||operation.parents.length>CORE_LIMITS.parents||operation.parents.some(x=>!hash(x)))fail('BNS_REDACTED_INVALID');
 // The original payload is intentionally irrecoverable. Its immutable digest
 // receipt and ancestry are covered by the verified checkpoint, not recomputed
 // from a fabricated empty payload. V1 remains provider-trust, not signatures.
 return operation;
}

export class StagedSyncRestore {
 constructor(core,{restoreId=crypto.randomUUID(),profile=SEGMENT_PROFILE,owners={},checkpoint=async()=>{}}={}){
  if(!opaque(restoreId))fail('BNS_RESTORE_INVALID');this.live=core;this.restoreId=restoreId;this.profile=profile;this.owners=owners;this.checkpoint=checkpoint;
  this.stage=new BrowserNativeSyncCore(core.repository,{datasetId:core.datasetId,deviceId:core.deviceId,namespace:restoreId});
 }
 async begin(ref,get,{supported}={}){
  ref=clone(ref);
  const manifest=await readManifest(ref,get,{datasetId:this.live.datasetId,profile:this.profile,supported});
  const existing=await this.stage.read('restore');
  if(existing){if(existing.manifestId!==ref.id)fail('BNS_RESTORE_ID_COLLISION');return existing;}
  const base=await this.live.transaction(false,async t=>({namespace:await this.live.bind(t),generation:(await this.live.get(t,'generation'))?.value||0,ownerGeneration:(await t.get('meta','backup-data-generation'))?.value||0}),['meta']);
  const state={manifestId:ref.id,manifestRef:ref,manifest,phase:'staging',base,received:0};await this.stage.transaction(true,t=>this.stage.put(t,'restore',[],state),['meta']);return state;
 }
 async stageCheckpoint(ref,get,options={}){
  const state=await this.begin(ref,get,options);if(state.phase==='activated'||state.phase==='validated')return state;
  let index=0;
  for await(const item of checkpointItems(state.manifest,get,{profile:this.profile})){
   if(index++<state.received)continue;await this.add(item);
   await this.stage.transaction(true,async t=>{const row=await this.stage.get(t,'restore');await this.stage.put(t,'restore',[],{...withoutId(row),received:index});},['meta']);
   await this.checkpoint('staged-item',index);
  }
  await this.stage.resumePending();const validatedCut=await marker(this.stage);await this.validate();
  await this.checkpoint('validated-checkpoint',validatedCut);await requireMarker(this.stage,validatedCut);
  await this.stage.transaction(true,async t=>{if(((await this.stage.get(t,'generation'))?.value||0)!==validatedCut.generation)fail('BNS_SNAPSHOT_CHANGED');const row=await this.stage.get(t,'restore');await this.stage.put(t,'restore',[],{...withoutId(row),phase:'validated',activeCoverage:row.manifest.coverage,checkpointGeneration:validatedCut.generation,validatedGeneration:validatedCut.generation});},['meta']);
  return this.stage.read('restore');
 }
 async add(item){
  if(item.kind==='revision'&&exact(item,['kind','operation','redacted'])&&typeof item.redacted==='boolean'){
   if(item.operation.datasetId!==this.live.datasetId)fail('BNS_DATASET_MISMATCH');
   if(!item.redacted){await validateOperation(item.operation);await this.stage.receive(item.operation);return;}
   const operation=validateRedacted(item.operation);
   await this.stage.transaction(true,async t=>{
    const old=await this.stage.get(t,'revision',operation.revisionId);if(old&&!equal(old.operation,operation))fail('BNS_OPERATION_COLLISION');
    const receipt=await this.stage.get(t,'receipt',operation.operationId);if(receipt&&receipt.digest!==operation.revisionId)fail('BNS_OPERATION_COLLISION');
    await this.stage.put(t,'revision',[operation.revisionId],{operation,redacted:true});await this.stage.put(t,'entityRevision',[operation.type,operation.entityId,operation.revisionId],{revisionId:operation.revisionId});await this.stage.recordReceipt(t,operation);
   },['meta']);return;
  }
  if(item.kind==='head'&&exact(item,['kind','type','entityId','revisions','purged','fence'])&&Object.hasOwn(CODECS,item.type)&&identifier(item.entityId)&&Array.isArray(item.revisions)&&item.revisions.length>0&&item.revisions.length<=CORE_LIMITS.heads&&item.revisions.every(hash)&&typeof item.purged==='boolean'&&(item.purged?hash(item.fence):item.fence===null)){
   await this.stage.transaction(true,async t=>{const old=await this.stage.get(t,'expectedHead',item.type,item.entityId);if(old&&!equal(withoutId(old),item))fail('BNS_CHECKPOINT_DUPLICATE');await this.stage.put(t,'expectedHead',[item.type,item.entityId],item);},['meta']);return;
  }
  if(item.kind==='frontier'&&exact(item,['kind','frontier','ranges','deviceId'])&&opaque(item.deviceId)&&count(item.frontier)&&Array.isArray(item.ranges)&&item.ranges.length<=CORE_LIMITS.gapRanges){await this.stage.transaction(true,async t=>{const old=await this.stage.get(t,'expectedFrontier',item.deviceId);if(old&&!equal(withoutId(old),item))fail('BNS_CHECKPOINT_DUPLICATE');await this.stage.put(t,'expectedFrontier',[item.deviceId],item);},['meta']);return;}
  fail('BNS_CHECKPOINT_ITEM_INVALID');
 }
 async validate(){
  const restore=await this.stage.read('restore'),families=new Map();for await(const _ of this.stage.rows('pending'))fail('BNS_CHECKPOINT_CAUSAL_GAP');for await(const _ of this.stage.rows('quarantine'))fail('BNS_CHECKPOINT_INVALID_OPERATION');
  for await(const expected of this.stage.rows('expectedHead')){
   await this.stage.transaction(true,async t=>{
    const {kind,id,...head}=expected;
    for(const revisionId of head.revisions){const revision=await this.stage.get(t,'revision',revisionId);if(!revision||revision.operation.type!==head.type||revision.operation.entityId!==head.entityId||revision.redacted!==head.purged||head.purged&&revision.operation.kind!=='purge')fail('BNS_CHECKPOINT_HEAD');}
    if(head.purged){if(head.fence!==[...head.revisions].sort()[0])fail('BNS_CHECKPOINT_HEAD');await this.stage.put(t,'head',[head.type,head.entityId],head);}
    else{const actual=await this.stage.get(t,'head',head.type,head.entityId);if(!actual||!equal(withoutId(actual),head))fail('BNS_CHECKPOINT_HEAD');}
   },['meta']);
   const family=families.get(expected.type)||{type:expected.type,version:1,count:0};family.count++;families.set(expected.type,family);
  }
  const coverage=[...families.values()].sort((a,b)=>a.type.localeCompare(b.type));if(!equal(coverage,restore.manifest.coverage))fail('BNS_CHECKPOINT_COVERAGE');
  for await(const row of this.stage.rows('revision')){
   const head=await this.stage.read('expectedHead',row.operation.type,row.operation.entityId);if(!head||row.redacted!==head.purged)fail('BNS_CHECKPOINT_COVERAGE');
   if(!row.redacted)for(const parent of row.operation.parents){const p=await this.stage.read('revision',parent);if(!p||p.operation.type!==row.operation.type||p.operation.entityId!==row.operation.entityId)fail('BNS_CHECKPOINT_CAUSAL_GAP');}
  }
  for await(const row of this.stage.rows('frontier')){const expected=await this.stage.read('expectedFrontier',row.deviceId);if(!expected||!equal({frontier:row.frontier,ranges:row.ranges,deviceId:row.deviceId},{frontier:expected.frontier,ranges:expected.ranges,deviceId:expected.deviceId}))fail('BNS_CHECKPOINT_FRONTIER');}
  for await(const expected of this.stage.rows('expectedFrontier'))if(!await this.stage.read('frontier',expected.deviceId))fail('BNS_CHECKPOINT_FRONTIER');
  return true;
 }
 async reconcileTail(operations){
  const restore=await this.stage.read('restore');if(restore?.phase!=='validated')fail('BNS_RESTORE_NOT_READY');
  const results=await this.stage.receiveBatch(operations);await this.stage.resumePending();
  for await(const _ of this.stage.rows('pending'))fail('BNS_CHECKPOINT_CAUSAL_GAP');
  for await(const _ of this.stage.rows('quarantine'))fail('BNS_CHECKPOINT_INVALID_OPERATION');
  const cut=await marker(this.stage),families=new Map();for await(const head of this.stage.rows('head')){const family=families.get(head.type)||{type:head.type,version:1,count:0};family.count++;families.set(head.type,family);}await requireMarker(this.stage,cut);
  await this.stage.transaction(true,async t=>{if(((await this.stage.get(t,'generation'))?.value||0)!==cut.generation)fail('BNS_SNAPSHOT_CHANGED');const row=await this.stage.get(t,'restore');await this.stage.put(t,'restore',[],{...withoutId(row),activeCoverage:[...families.values()].sort((a,b)=>a.type.localeCompare(b.type)),validatedGeneration:cut.generation});},['meta']);
  return results;
 }
 async activate(){
  const restore=await this.stage.read('restore');if(restore?.phase==='activated')return {state:'activated',namespace:this.restoreId};if(restore?.phase!=='validated')fail('BNS_RESTORE_NOT_READY');
  // Materializers are trusted existing domain owners. A populated unsupported
  // family prevents activation, even if its transport codec is understood.
  for(const family of restore.activeCoverage)if(family.count&&(!Object.hasOwn(this.owners,family.type)||typeof this.owners[family.type]!=='function'))fail('BNS_OWNER_RESTORE_UNSUPPORTED');
  const result=await this.live.transaction(true,async t=>{
   if(await this.live.bind(t)!==restore.base.namespace||((await this.live.get(t,'generation'))?.value||0)!==restore.base.generation||((await t.get('meta','backup-data-generation'))?.value||0)!==restore.base.ownerGeneration)fail('BNS_RESTORE_LOCAL_CHANGED');
   if(((await this.stage.get(t,'generation'))?.value||0)!==restore.validatedGeneration)fail('BNS_RESTORE_STAGE_CHANGED');
   if((await t.primaryRangePage('meta',{prefix:await this.live.idIn(t,'pending'),limit:1})).rows.length)fail('BNS_RESTORE_LIVE_PENDING');
   if((await t.primaryRangePage('meta',{prefix:await this.stage.idIn(t,'pending'),limit:1})).rows.length)fail('BNS_RESTORE_STAGE_PENDING');
   if((await t.primaryRangePage('meta',{prefix:await this.live.idIn(t,'publicationActive'),limit:1})).rows.length)fail('BNS_RESTORE_PUBLICATION_PENDING');
   // The initial admitted materializer scope is bounded to one aggregate Prompt
   // preference owner. Other families need their own staged generation owners.
   if(restore.activeCoverage.reduce((sum,x)=>sum+x.count,0)>128)fail('BNS_OWNER_ACTIVATION_LIMIT');
   let liveAfter=null;do{const page=await t.primaryRangePage('meta',{prefix:await this.live.idIn(t,'head'),after:liveAfter,limit:100});for(const {value:current}of page.rows)if(!await this.stage.get(t,'head',current.type,current.entityId))fail('BNS_RESTORE_LOCAL_DIVERGENCE');liveAfter=page.next;}while(liveAfter);
   for(const family of restore.activeCoverage){
    let after=null;do{const page=await t.primaryRangePage('meta',{prefix:await this.stage.idIn(t,'head',family.type)+':',after,limit:100});for(const {value:head}of page.rows){
     const current=await this.live.get(t,'head',head.type,head.entityId);
     if(current?.purged&&!head.purged)fail('BNS_RESTORE_TOMBSTONE_REGRESSION');
     if(current&&!current.purged){for(const revision of current.revisions){let retained=head.revisions.includes(revision);for(const candidate of head.revisions)if(!retained)retained=await this.stage.ancestor(t,revision,candidate);if(!retained&&!head.purged)fail('BNS_RESTORE_LOCAL_DIVERGENCE');}}
     if(head.revisions.length!==1&&!head.purged)fail('BNS_CONFLICT_REQUIRES_RESOLUTION');
     const operation=(await this.stage.get(t,'revision',head.revisions[0])).operation;
     const previousVersions=[];if(current&&!current.purged)for(const revision of current.revisions)previousVersions.push((await this.live.get(t,'revision',revision)).operation);
     await this.owners[head.type](t,{operation,head,origin:'remote',previousHead:current||null,previousVersions});
    }after=page.next;}while(after);
   }
   await this.checkpoint('before-activation',t);
   await t.put('meta',{id:this.live.prefix+'active',namespace:this.restoreId,manifestId:restore.manifestId});
   await this.stage.put(t,'restore',[],{...withoutId(restore),phase:'activated'});
   await this.checkpoint('after-activation',t);
   return {state:'activated',namespace:this.restoreId};
  });return result;
 }
}
