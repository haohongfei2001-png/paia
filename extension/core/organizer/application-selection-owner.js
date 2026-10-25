// Private registries are created once by each original Organize owner module.
// These warm, idle-only capabilities do not certify historical provider outcomes.
import {ArchiveError} from '../constants.js';
const apply=Reflect.apply,NativePromise=Promise,resolve=Promise.resolve,rejected=Promise.reject,then=Promise.prototype.then;
const clock=globalThis.performance,nowMethod=clock.now,now=()=>apply(nowMethod,clock,[]);
const own=Object.getOwnPropertyDescriptor,prototype=Object.getPrototypeOf;
const fail=code=>{throw new ArchiveError(code);};
const value=(object,key)=>{const d=own(object,key);return d&&Object.hasOwn(d,'value')?d.value:undefined;};

export function createOrganizeSelectionOwnerRegistry(){
 const records=new WeakMap();let classPrototype=null,classMethods=null;
 function wrap(method,owner=null){return function(...args){
  // Factory methods close over their original owner and remain valid when detached.
  // Class methods retain their original receiver semantics.
  const record=records.get(owner??this);
  if(record?.hold)return apply(rejected,NativePromise,[new ArchiveError('GENERATION_WORKER_BUSY')]);
  // Register before invoking the original body, including synchronous nested work.
  const pending=Object.freeze(Object.create(null));record?.pending.add(pending);
  let result;try{result=apply(method,this,args);}catch(error){record?.pending.delete(pending);throw error;}
  const task=apply(resolve,NativePromise,[result]);
  apply(then,task,[()=>{record?.pending.delete(pending);},()=>{record?.pending.delete(pending);}]);
  return task;
 };}
 function instrumentPrototype(target,names){
  if(classPrototype)throw new Error('Organize registry already bound');
  classPrototype=target;classMethods=new Map();
  for(const name of names){const d=own(target,name);if(typeof d?.value!=='function')throw new Error('Missing original Organize method');const method=wrap(d.value);Object.defineProperty(target,name,{...d,value:method});classMethods.set(name,method);}
 }
 function instrumentObject(target,names){const methods=new Map();for(const name of names){const d=own(target,name);if(typeof d?.value!=='function')throw new Error('Missing original Organize method');const method=wrap(d.value,target);Object.defineProperty(target,name,{...d,value:method});methods.set(name,method);}return methods;}
 function register(owner,store,{qualified=false,bindings=[],methods=null}={}){
  if(records.has(owner))throw new Error('Organize owner already registered');
  const repository=store?.repository,database=repository?.db;
  records.set(owner,{owner,store,repository,database,qualified,bindings,pending:new Set(),hold:null,
   prototype:classPrototype??prototype(owner),methods:methods??classMethods,ownMethods:methods!==null});
 }
 function intact(record){
  if(!record?.qualified||!record.repository||!record.database||prototype(record.owner)!==record.prototype||value(record.store,'repository')!==record.repository||value(record.repository,'db')!==record.database)return false;
  for(const [object,key,expected]of record.bindings)if(value(object,key)!==expected)return false;
  for(const [name,method]of record.methods){if(record.ownMethods){if(value(record.owner,name)!==method)return false;}else if(own(record.owner,name)||value(record.prototype,name)!==method)return false;}
  return true;
 }
 function eligible(owner,store){const r=records.get(owner);return !!r&&r.store===store&&intact(r);}
 function hold(owner,store,{deadlineAt=now()+30000}={}){
  const r=records.get(owner);if(!r||r.store!==store||!intact(r))fail('GENERATION_WORKER_CAPABILITY');
  if(r.hold||r.pending.size)fail('GENERATION_WORKER_BUSY');
  const at=now();if(!Number.isFinite(deadlineAt)||deadlineAt<=at||deadlineAt-at>30000)fail('GENERATION_WORKER_NOT_QUIET');
  const token=Object.freeze(Object.create(null));r.hold={token,deadlineAt};return token;
 }
 function current(owner,store,token){
  const r=records.get(owner);if(!r||r.store!==store||r.hold?.token!==token||r.hold.invalid)return false;
  if(r.pending.size||now()>=r.hold.deadlineAt||!intact(r)){r.hold.invalid=true;return false;}
  return true;
 }
 function release(owner,store,token){const r=records.get(owner);if(!r||r.store!==store||r.hold?.token!==token)return false;r.hold=null;return true;}
 function deadline(owner,store,token){const r=records.get(owner);if(!r||r.store!==store||r.hold?.token!==token)fail('GENERATION_WORKER_CAPABILITY');return r.hold.deadlineAt;}
 return Object.freeze({register,instrumentPrototype,instrumentObject,eligible,hold,current,release,deadline});
}
