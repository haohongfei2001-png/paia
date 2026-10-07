import {packOperations,readObject,readSegmentDescriptor,SEGMENT_PROFILE} from './segments.js';
import {validateOperation} from './core.js';
import {bytes,clone,count,digest,equal,exact,fail,hash,opaque} from './value.js';

export const PUBLICATION_LIMITS=Object.freeze({operations:512,bytes:4*1024*1024,objects:512,journalBytes:256*1024,page:100});
const activeStates=['prepared','uploading','unknown','blocked_integrity','blocked_remote_missing','obsolete'];
const safeFailures=new Set(['BNS_OBJECT_INTEGRITY','BNS_OBJECT_NOT_FOUND','BNS_PUBLICATION_OBSOLETE','BNS_BINDING_CHANGED','BNS_PUBLICATION_CHANGED','BNS_CUT_RESERVED','BNS_PUBLICATION_BLOCKED','BNS_PUBLICATION_CORRUPT','BNS_PUBLICATION_REENCODED','BNS_PUBLICATION_INCOMPLETE']);
const immutable=row=>({version:row.version,publicationId:row.publicationId,namespace:row.namespace,datasetId:row.datasetId,producer:row.producer,target:row.target,profile:row.profile,operationRefs:row.operationRefs,objectRefs:row.objectRefs});
const withoutId=row=>{const {id,...value}=row;return value;};
const publicState=row=>({publicationId:row.publicationId,namespace:row.namespace,state:row.state,operationCount:row.operationRefs.length,objectCount:row.objectRefs.length,verifiedObjects:row.nextIndex,blueprintDigest:row.blueprintDigest});
const indexKey=index=>String(index).padStart(6,'0');
function checkedProfile(profile){
 profile=clone(profile);
 // Packing targets vary separately. Other parser/chunk parameters must be a
 // qualified exact profile; accepting a tiny chunk size would amplify a single
 // admitted body into an unbounded pre-yield object list.
 if(!equal(profile,SEGMENT_PROFILE))fail('BNS_PROFILE_INVALID');
 return profile;
}

// Explicit local test/transport seam. No production scheduler or cloud adapter
// instantiates this class. A prepared cut owns only immutable operation/object
// identities; it never stores another body copy or relies on process memory.
export class PreparedPublicationJournal {
 constructor(core,{profile=SEGMENT_PROFILE,checkpoint=async()=>{}}={}){this.core=core;this.profile=checkedProfile(profile);this.checkpoint=checkpoint;}
 async #load(publicationId){
  if(!opaque(publicationId))fail('BNS_PUBLICATION_INVALID');
  const row=await this.core.transaction(false,async t=>{const identity=await t.get('meta',this.core.prefix+'publicationIdentity:'+publicationId),namespace=await this.core.bind(t);if(identity&&identity.namespace!==namespace)fail('BNS_BINDING_CHANGED');const row=await this.core.get(t,'publication',publicationId);if(!!identity!==!!row||identity&&identity.blueprintDigest!==row.blueprintDigest)fail('BNS_PUBLICATION_CORRUPT');return row;},['meta']);if(!row)return null;
  if(row.version!==1||row.publicationId!==publicationId||row.datasetId!==this.core.datasetId||!opaque(row.producer)||row.namespace!=='initial'&&!opaque(row.namespace)||!['confirmed',...activeStates].includes(row.state)||!Array.isArray(row.operationRefs)||!row.operationRefs.length||row.operationRefs.length>PUBLICATION_LIMITS.operations||row.operationRefs.some(ref=>!exact(ref,['operationId','revisionId','bytes'])||!opaque(ref.operationId)||!hash(ref.revisionId)||!count(ref.bytes)||ref.bytes<1)||!Array.isArray(row.objectRefs)||!row.objectRefs.length||row.objectRefs.length>PUBLICATION_LIMITS.objects||!count(row.nextIndex)||row.nextIndex>row.objectRefs.length||!hash(row.blueprintDigest))fail('BNS_PUBLICATION_CORRUPT');
  checkedProfile(row.profile);if(bytes(immutable(row)).length>PUBLICATION_LIMITS.journalBytes||await digest(immutable(row))!==row.blueprintDigest)fail('BNS_PUBLICATION_CORRUPT');
  return row;
 }
 async #bound(t,row){if(await this.core.bind(t)!==row.namespace)fail('BNS_BINDING_CHANGED');const current=await this.core.get(t,'publication',row.publicationId);if(!current||current.blueprintDigest!==row.blueprintDigest)fail('BNS_PUBLICATION_CHANGED');return current;}
 async #checkCut(t,row,{unreserved=false}={}){
  if(await this.core.bind(t)!==row.namespace)fail('BNS_BINDING_CHANGED');
  for(const ref of row.operationRefs){
   const queued=await this.core.get(t,'outbox',ref.operationId),revision=await this.core.get(t,'revision',ref.revisionId);
   if(!queued||queued.revisionId!==ref.revisionId||!revision||revision.operation.operationId!==ref.operationId||revision.operation.revisionId!==ref.revisionId||revision.redacted&&revision.operation.kind!=='purge')fail('BNS_PUBLICATION_OBSOLETE');
   if(unreserved?queued.publicationId!==undefined:queued.publicationId!==row.publicationId)fail('BNS_CUT_RESERVED');
  }
 }
 async prepare({publicationId=crypto.randomUUID(),target=this.profile.target,maxOperations=PUBLICATION_LIMITS.operations,maxBytes=PUBLICATION_LIMITS.bytes,after=null}={}){
  if(!opaque(publicationId)||![64,256,1024].map(x=>x*1024).includes(target)||!count(maxOperations)||maxOperations<1||maxOperations>PUBLICATION_LIMITS.operations||!count(maxBytes)||maxBytes<1||maxBytes>Math.min(PUBLICATION_LIMITS.bytes,this.profile.decodedOperations))fail('BNS_PUBLICATION_INVALID');
  const profile=clone(this.profile),existing=await this.#load(publicationId);
  if(existing){if(existing.target!==target||!equal(existing.profile,profile))fail('BNS_PUBLICATION_COLLISION');return publicState(existing);}
  const selection=await this.core.transaction(false,async t=>{
   const namespace=await this.core.bind(t),rows=[];let scanned=0,cursor=after;
   do{const page=await t.primaryRangePage('meta',{prefix:await this.core.idIn(t,'outbox'),after:cursor,limit:Math.min(PUBLICATION_LIMITS.page,maxOperations-scanned)});scanned+=page.rows.length;for(const {value}of page.rows){if(!exact(value,['id','operationId','revisionId','state','publicationId'])||!opaque(value.operationId)||!hash(value.revisionId)||value.state!=='queued'||value.id!==await this.core.idIn(t,'outbox',value.operationId)||value.publicationId!==undefined&&!opaque(value.publicationId))fail('BNS_PUBLICATION_CORRUPT');if(value.publicationId===undefined)rows.push({operationId:value.operationId,revisionId:value.revisionId});}cursor=page.next;if(!cursor||scanned>=maxOperations)break;}while(true);
   return {namespace,rows,nextCursor:cursor};
  },['meta']);
  const operations=[],operationRefs=[];let size=0;
  for(const ref of selection.rows){
   const revision=await this.core.read('revision',ref.revisionId);if(!revision||revision.redacted&&revision.operation.kind!=='purge')fail('BNS_PUBLICATION_OBSOLETE');
   const operation=await validateOperation(revision.operation),length=bytes(operation).length;if(operation.operationId!==ref.operationId||operation.revisionId!==ref.revisionId)fail('BNS_PUBLICATION_CORRUPT');
   if(size+length>maxBytes){if(!operations.length)fail('BNS_PUBLICATION_ITEM_LIMIT');break;}
   operations.push(operation);operationRefs.push({...ref,bytes:length});size+=length;
  }
  if(!operations.length)return {state:'nothing_to_prepare',nextCursor:selection.nextCursor};
  const objectRefs=[];for await(const object of packOperations(operations,{datasetId:this.core.datasetId,producer:this.core.deviceId,target,profile})){objectRefs.push(clone(object.ref));if(objectRefs.length>PUBLICATION_LIMITS.objects)fail('BNS_PUBLICATION_OBJECT_LIMIT');}
  const row={version:1,publicationId,namespace:selection.namespace,datasetId:this.core.datasetId,producer:this.core.deviceId,target,profile,operationRefs,objectRefs,state:'prepared',nextIndex:0,error:null};
  if(bytes(immutable(row)).length>PUBLICATION_LIMITS.journalBytes)fail('BNS_PUBLICATION_JOURNAL_LIMIT');row.blueprintDigest=await digest(immutable(row));
  await this.core.transaction(true,async t=>{
   if(await this.core.get(t,'publication',publicationId)||await t.get('meta',this.core.prefix+'publicationIdentity:'+publicationId))fail('BNS_PUBLICATION_COLLISION');await this.#checkCut(t,row,{unreserved:true});
   for(const ref of operationRefs){const queued=await this.core.get(t,'outbox',ref.operationId);await this.core.put(t,'outbox',[ref.operationId],{...withoutId(queued),publicationId});}
   await this.core.put(t,'publication',[publicationId],row);await this.core.put(t,'publicationActive',[publicationId],{publicationId});await t.put('meta',{id:this.core.prefix+'publicationIdentity:'+publicationId,namespace:row.namespace,blueprintDigest:row.blueprintDigest});await this.checkpoint('prepared-before-commit',t);
  },['meta']);return publicState(row);
 }
 async pending({after=null,limit=PUBLICATION_LIMITS.page}={}){
  if(!count(limit)||limit<1||limit>PUBLICATION_LIMITS.page)fail('BNS_PUBLICATION_INVALID');
  return this.core.transaction(false,async t=>{const page=await t.primaryRangePage('meta',{prefix:await this.core.idIn(t,'publicationActive'),after,limit}),items=[];for(const {value}of page.rows){const row=await this.core.get(t,'publication',value.publicationId);if(!row)fail('BNS_PUBLICATION_CORRUPT');items.push(publicState(row));}return {items,nextCursor:page.next};},['meta']);
 }
 async state(publicationId){const row=await this.#load(publicationId);return row?publicState(row):null;}
 async #attempt(row,index){
  return this.core.transaction(true,async t=>{
   const current=await this.#bound(t,row);if(current.state==='confirmed')return {alreadyVerified:true};if(['blocked_integrity','blocked_remote_missing','obsolete'].includes(current.state))fail('BNS_PUBLICATION_BLOCKED');if(current.nextIndex>index)return {alreadyVerified:true};if(current.nextIndex!==index)fail('BNS_PUBLICATION_CHANGED');
   await this.#checkCut(t,current);const previous=await this.core.get(t,'publicationObject',row.publicationId,indexKey(index));
   await this.core.put(t,'publicationObject',[row.publicationId,indexKey(index)],{ref:current.objectRefs[index],state:'attempting',attempts:(previous?.attempts||0)+1});
   await this.core.put(t,'publication',[row.publicationId],{...withoutId(current),state:'uploading',error:null});return {alreadyVerified:false,reconcile:!!previous};
  },['meta']);
 }
 async #verified(row,index){
  return this.core.transaction(true,async t=>{
   const current=await this.#bound(t,row);if(current.state==='confirmed')return;if(['blocked_integrity','blocked_remote_missing','obsolete'].includes(current.state))fail('BNS_PUBLICATION_BLOCKED');if(current.nextIndex>index)return;if(current.nextIndex!==index)fail('BNS_PUBLICATION_CHANGED');await this.#checkCut(t,current);
   const previous=await this.core.get(t,'publicationObject',row.publicationId,indexKey(index));if(!previous||!equal(previous.ref,current.objectRefs[index]))fail('BNS_PUBLICATION_CORRUPT');
   await this.core.put(t,'publicationObject',[row.publicationId,indexKey(index)],{...withoutId(previous),state:'verified'});await this.core.put(t,'publication',[row.publicationId],{...withoutId(current),nextIndex:index+1,state:'uploading',error:null});
  },['meta']);
 }
 async #failed(row,error){
  const state=error?.code==='BNS_PUBLICATION_OBSOLETE'?'obsolete':error?.code==='BNS_OBJECT_INTEGRITY'?'blocked_integrity':error?.code==='BNS_OBJECT_NOT_FOUND'?'blocked_remote_missing':'unknown';
  await this.core.transaction(true,async t=>{const current=await this.#bound(t,row);if(current.state==='confirmed'||['blocked_integrity','blocked_remote_missing','obsolete'].includes(current.state))return;await this.core.put(t,'publication',[row.publicationId],{...withoutId(current),state,error:state==='unknown'?'BNS_TRANSPORT_UNKNOWN':error.code});},['meta']);
 }
 async #operations(row){
  const operations=[];let size=0;
  await this.core.transaction(false,t=>this.#checkCut(t,row),['meta']);
  for(const ref of row.operationRefs){const revision=await this.core.read('revision',ref.revisionId);if(!revision||revision.redacted&&revision.operation.kind!=='purge')fail('BNS_PUBLICATION_OBSOLETE');const operation=await validateOperation(revision.operation);size+=bytes(operation).length;if(size>PUBLICATION_LIMITS.bytes||operation.operationId!==ref.operationId||operation.revisionId!==ref.revisionId)fail('BNS_PUBLICATION_CORRUPT');operations.push(operation);}
  return operations;
 }
 async #finish(row){
  return this.core.transaction(true,async t=>{
   const current=await this.#bound(t,row);if(current.state==='confirmed')return this.core.get(t,'publicationReceipt',row.publicationId);if(['blocked_integrity','blocked_remote_missing','obsolete'].includes(current.state))fail('BNS_PUBLICATION_BLOCKED');if(current.nextIndex!==current.objectRefs.length)fail('BNS_PUBLICATION_INCOMPLETE');await this.#checkCut(t,current);
   for(let i=0;i<current.objectRefs.length;i++){const receipt=await this.core.get(t,'publicationObject',row.publicationId,indexKey(i));if(receipt?.state!=='verified'||!equal(receipt.ref,current.objectRefs[i]))fail('BNS_PUBLICATION_INCOMPLETE');}
   await this.checkpoint('publication-before-ack',t);
   for(const ref of current.operationRefs)await t.delete('meta',await this.core.idIn(t,'outbox',ref.operationId));
   const receipt={publicationId:row.publicationId,namespace:row.namespace,state:'confirmed',blueprintDigest:row.blueprintDigest,operationCount:row.operationRefs.length,descriptors:row.objectRefs.filter(ref=>ref.kind==='descriptor')};
   await this.core.put(t,'publicationReceipt',[row.publicationId],receipt);await this.core.put(t,'publication',[row.publicationId],{...withoutId(current),state:'confirmed',error:null});await t.delete('meta',await this.core.idIn(t,'publicationActive',row.publicationId));
   await this.checkpoint('publication-after-ack',t);return receipt;
  },['meta']);
 }
 async *publish(publicationId,transport){
  if(typeof transport?.putImmutable!=='function'||typeof transport?.get!=='function')fail('BNS_TRANSPORT_INVALID');
  const row=await this.#load(publicationId);if(!row)fail('BNS_PUBLICATION_MISSING');
  if(row.state==='confirmed'){yield withoutId(await this.core.read('publicationReceipt',publicationId));return;}
  if(['blocked_integrity','blocked_remote_missing','obsolete'].includes(row.state))fail('BNS_PUBLICATION_BLOCKED');
  try{
   const operations=await this.#operations(row);let index=0;
   for await(const object of packOperations(operations,{datasetId:row.datasetId,producer:row.producer,target:row.target,profile:row.profile})){
    if(!equal(object.ref,row.objectRefs[index]))fail('BNS_PUBLICATION_REENCODED');
    const attempt=await this.#attempt(row,index);if(!attempt.alreadyVerified){
     let exists=false;
     if(attempt.reconcile){try{await readObject(object.ref,ref=>transport.get(ref),{profile:row.profile});exists=true;}catch(error){if(error?.code!=='BNS_OBJECT_NOT_FOUND')throw error;}}
     if(!exists){await transport.putImmutable(clone(object.ref),object.bytes.slice());await this.checkpoint('publication-after-put',{publicationId,index,ref:clone(object.ref)});}
     await readObject(object.ref,ref=>transport.get(ref),{profile:row.profile});
     if(object.ref.kind==='descriptor')await readSegmentDescriptor(object.ref,ref=>transport.get(ref),{datasetId:row.datasetId,profile:row.profile});
     await this.checkpoint('publication-verified-before-receipt',{publicationId,index,ref:clone(object.ref)});await this.#verified(row,index);
    }
    yield {publicationId,state:'object_verified',index,ref:clone(object.ref)};index++;
   }
   if(index!==row.objectRefs.length)fail('BNS_PUBLICATION_REENCODED');
   // A delayed/lost local acknowledgement must not bless remotely missing data
   // merely because this process once verified it. Recheck the complete cut.
   for(const ref of row.objectRefs)if(ref.kind==='descriptor')await readSegmentDescriptor(ref,key=>transport.get(key),{datasetId:row.datasetId,profile:row.profile});
   yield withoutId(await this.#finish(row));
  }catch(error){await this.#failed(row,error);fail(safeFailures.has(error?.code)?error.code:'BNS_TRANSPORT_UNKNOWN');}
 }
 async run(publicationId,transport){let result=null;for await(const receipt of this.publish(publicationId,transport))if(receipt.state==='confirmed')result=receipt;return result;}
}
