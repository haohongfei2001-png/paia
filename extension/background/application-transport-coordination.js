import {ArchiveError} from '../core/constants.js';
import {isOriginalApplicationWorkerCoordination} from './application-worker-coordination.js';
import {isOriginalCaptureRecovery} from './capture-recovery.js';
import {PromptInsertionReceipts} from './prompt-insertion-receipts.js';

// Compose only these fixed LIVE owners. This is not cold/legacy insertion
// closure, an editor/host freeze, all background writers, or activation authority.
const apply=Reflect.apply,OriginalPromise=Promise,then=Promise.prototype.then,resolve=Promise.resolve;
const now=performance.now.bind(performance),timer=setTimeout,clearTimer=clearTimeout;
const observe=(p,yes,no)=>apply(then,p,[yes,no]),resolved=value=>apply(resolve,OriginalPromise,[value]);
const fail=()=>{throw new ArchiveError('GENERATION_WORKER_NOT_QUIET');};
const method=(o,k)=>Object.getOwnPropertyDescriptor(o??{},k)?.value;
const receiptPrototype=PromptInsertionReceipts.prototype;
const receiptMethods=Object.freeze({source:receiptPrototype.applicationSelectionSourceIs,hold:receiptPrototype.holdForApplicationSelection,current:receiptPrototype.applicationSelectionHeld,fence:receiptPrototype.fenceApplicationSelection,release:receiptPrototype.releaseApplicationSelection,failed:receiptPrototype.releaseFailedApplicationSelection});
const invoke=(entry,key,...args)=>apply(entry[key],entry.owner,args);
function settled(promises){return new OriginalPromise(resolve=>{let pending=promises.length;const outcomes=[];if(!pending){resolve(outcomes);return;}promises.forEach((promise,i)=>observe(resolved(promise),value=>{outcomes[i]={value};if(!--pending)resolve(outcomes);},error=>{outcomes[i]={error};if(!--pending)resolve(outcomes);}));});}

export function createApplicationTransportCoordination({sourceCoordination,captureRecovery,promptInsertionReceipts,store,api}){
 const source={owner:sourceCoordination,hold:method(sourceCoordination,'holdApplicationSources'),current:method(sourceCoordination,'applicationSourcesHeld'),fence:method(sourceCoordination,'fenceApplicationSources'),release:method(sourceCoordination,'releaseApplicationSources')};
 const capture={owner:captureRecovery,hold:method(captureRecovery,'holdForApplicationSelection'),current:method(captureRecovery,'applicationSelectionHeld'),fence:method(captureRecovery,'fenceApplicationSelection'),release:method(captureRecovery,'releaseApplicationSelection'),failed:method(captureRecovery,'releaseApplicationSelection')};
 const receipt={owner:promptInsertionReceipts,...receiptMethods};
 const entries=[source,capture,receipt];let active=null,closed=false;
 const identities=()=>{
  try{return !closed&&isOriginalApplicationWorkerCoordination(sourceCoordination,store)&&isOriginalCaptureRecovery(captureRecovery,api)&&Object.getPrototypeOf(promptInsertionReceipts)===receiptPrototype&&typeof receipt.source==='function'&&invoke(receipt,'source',store,api)===true&&entries.every(entry=>['hold','current','fence','release'].every(key=>typeof entry[key]==='function'))&&typeof receipt.failed==='function';}catch{return false;}
 };
 const releaseLease=lease=>{if(lease.released)return true;lease.released=true;try{return invoke(lease.entry,lease.failed?'failed':'release',lease.token)===true;}catch{return false;}};
 const cleanup=state=>{
  state.valid=false;state.ready=false;if(active===state)active=null;let ok=true;
  for(const lease of [...state.leases].reverse())if(!releaseLease(lease))ok=false;
  if(!ok)closed=true;return ok;
 };
 const current=token=>{
  const state=active;if(!state||state.token!==token||!state.valid||!state.ready||now()>=state.deadline||!identities()||state.leases.length!==entries.length)return false;
  try{return state.leases.every(lease=>!lease.failed&&!lease.released&&invoke(lease.entry,'current',lease.token)===true);}catch{return false;}
 };
 const wait=(state,pending)=>new OriginalPromise((resolve,reject)=>{
  // Observe an already-started owner even if it crossed the boundary before
  // returning its promise. Timeout cannot cancel or forget that physical work.
  let id=timer(()=>reject(new ArchiveError('GENERATION_WORKER_NOT_QUIET')),Math.max(0,state.deadline-now()));
  observe(resolved(pending),value=>{clearTimer(id);if(now()>=state.deadline||!state.valid||active!==state)reject(new ArchiveError('GENERATION_WORKER_NOT_QUIET'));else resolve(value);},error=>{clearTimer(id);reject(error);});
 });
 return Object.freeze({
  async hold(){
   if(active||!identities())fail();
   const token=Object.freeze(Object.create(null)),state={token,deadline:now()+30000,valid:true,ready:false,leases:[]};active=state;
   // Every admission closes before any aggregate drain is awaited.
   const attempts=entries.map(entry=>{
    let pending;try{pending=invoke(entry,'hold');}catch(error){pending=new OriginalPromise((_,reject)=>reject(error));}
    return observe(resolved(pending),value=>{
     const lease={entry,token:value,failed:false,released:false};state.leases.push(lease);
     if(closed||!state.valid||active!==state){if(!releaseLease(lease))closed=true;fail();}return value;
    },error=>{
     if(entry.failed){const lease={entry,token:error,failed:true,released:false};state.leases.push(lease);if(!releaseLease(lease))closed=true;}
     cleanup(state);throw error;
    });
   });
   try{const outcomes=await wait(state,settled(attempts)),refused=outcomes.find(outcome=>Object.hasOwn(outcome,'error'));if(refused)throw refused.error;state.ready=true;if(!current(token))fail();return token;}
   catch(error){cleanup(state);throw error;}
  },
  current,
  async fence(token){
   const state=active;if(!current(token)){if(state?.token===token)cleanup(state);fail();}
   try{for(const lease of state.leases){if(!current(token))fail();if(await wait(state,invoke(lease.entry,'fence',lease.token))!==true||!current(token))fail();}return true;}
   catch(error){cleanup(state);throw error;}
  },
  release(token){if(active?.token!==token)return false;if(!cleanup(active))fail();return true;},
  close(){closed=true;if(active&&!cleanup(active))fail();}
 });
}
