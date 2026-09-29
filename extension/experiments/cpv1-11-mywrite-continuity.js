// CPV1-11.0 detached metadata planner. No transport, credentials, plaintext,
// account, cloud authority or MyWrite production sync route is admitted.
const ID=/^draft:[A-Za-z0-9._:-]{1,122}$/;
const OPAQUE=/^[A-Za-z0-9._:-]{8,128}$/;
const HASH=/^[a-f0-9]{64}$/;
const KEYS=['id','writeId','parentWriteId','deviceId','deviceSequence','revision','deleted','payloadHash'];
const plain=value=>value!==null&&typeof value==='object'&&
 (Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
export class MyWriteContinuityError extends Error{
 constructor(code){super(code);this.name='MyWriteContinuityError';this.code=code;}
}
const fail=code=>{throw new MyWriteContinuityError(code);};
export function validateMyWriteContinuityOperation(input){
 if(!plain(input))fail('MYWRITE_CONTINUITY_INVALID');
 const descriptors=Object.getOwnPropertyDescriptors(input);
 if(Reflect.ownKeys(descriptors).length!==KEYS.length||
    !KEYS.every(key=>Object.hasOwn(descriptors,key)&&Object.hasOwn(descriptors[key],'value')))
  fail('MYWRITE_CONTINUITY_INVALID');
 if(!ID.test(input.id)||!OPAQUE.test(input.writeId)||
    (input.parentWriteId!==null&&!OPAQUE.test(input.parentWriteId))||
    input.parentWriteId===input.writeId||!OPAQUE.test(input.deviceId)||
    !Number.isSafeInteger(input.deviceSequence)||input.deviceSequence<1||
    !Number.isSafeInteger(input.revision)||input.revision<1||
    typeof input.deleted!=='boolean'||
    (input.deleted?input.payloadHash!==null:!HASH.test(input.payloadHash)))
  fail('MYWRITE_CONTINUITY_INVALID');
 if(input.revision===1&&input.parentWriteId!==null)fail('MYWRITE_CONTINUITY_INVALID');
 if(input.revision>1&&input.parentWriteId===null)fail('MYWRITE_CONTINUITY_INVALID');
 return Object.freeze(Object.fromEntries(KEYS.map(key=>[key,input[key]])));
}
const same=(a,b)=>KEYS.every(key=>a[key]===b[key]);
const decision=(action,local,remote,extra={})=>Object.freeze({
 action,id:local.id,localWriteId:local.writeId,remoteWriteId:remote.writeId,...extra
});
export function planMyWriteContinuity({local,remote}={}){
 local=validateMyWriteContinuityOperation(local);
 remote=validateMyWriteContinuityOperation(remote);
 if(local.id!==remote.id)fail('MYWRITE_CONTINUITY_IDENTITY_MISMATCH');
 if(local.writeId===remote.writeId){
  if(!same(local,remote))fail('MYWRITE_CONTINUITY_WRITE_COLLISION');
  return decision('duplicate',local,remote);
 }
 const remoteChild=remote.parentWriteId===local.writeId&&remote.revision===local.revision+1;
 const localChild=local.parentWriteId===remote.writeId&&local.revision===remote.revision+1;
 if(local.deleted||remote.deleted){
  if(remoteChild&&remote.deleted)return decision('accept_tombstone',local,remote);
  if(localChild&&local.deleted)return decision('keep_tombstone',local,remote);
  if(local.deleted&&remote.deleted)return decision('concurrent_tombstones',local,remote,{holdDeletion:true});
  if(remoteChild||localChild)return decision('reject_resurrection',local,remote,{
   holdDeletion:true,requiresHumanReview:true
  });
  // Concurrent delete/edit retains an encrypted edit candidate by its hash
  // in the caller's store, but never makes an old device's edit visible again.
  return decision('delete_edit_conflict',local,remote,{
   holdDeletion:true,requiresHumanReview:true,
   editHash:local.deleted?remote.payloadHash:local.payloadHash
  });
 }
 if(remoteChild)return decision('accept_remote_fast_forward',local,remote);
 if(localChild)return decision('keep_local_fast_forward',local,remote);
 return decision('concurrent_or_unproven_conflict',local,remote,{
  requiresHumanReview:true,localHash:local.payloadHash,remoteHash:remote.payloadHash
 });
}


// Deterministic bounded in-memory relay for synthetic two-device matrices.
// This is not a network transport or persistent Sync authority.
export class LocalMyWriteRelay{
 #log=[];
 publish(operation){
  const value=validateMyWriteContinuityOperation(operation);
  const prior=this.#log.find(item=>item.writeId===value.writeId);
  if(prior){
   if(!same(prior,value))fail('MYWRITE_CONTINUITY_WRITE_COLLISION');
   return Object.freeze({status:'duplicate',size:this.#log.length});
  }
  if(this.#log.length>=128)fail('MYWRITE_CONTINUITY_RELAY_FULL');
  this.#log.push(value);
  return Object.freeze({status:'stored',size:this.#log.length});
 }
 inbox(deviceId){
  if(!OPAQUE.test(deviceId))fail('MYWRITE_CONTINUITY_INVALID');
  return Object.freeze(this.#log.filter(item=>item.deviceId!==deviceId)
   .map(item=>Object.freeze({...item})));
 }
 get size(){return this.#log.length;}
}
