import {ArchiveError} from '../core/constants.js';
import {isOriginalApplicationWorkerCoordination} from './application-worker-coordination.js';
import {isOriginalCaptureRecovery} from './capture-recovery.js';
import {PromptInsertionReceipts} from './prompt-insertion-receipts.js';

// Fixed live sources, capture and original CURRENT TOP document receipts only.
// This is not historical/lifetime coverage, an editor freeze or activation authority.
const apply=Reflect.apply,OriginalPromise=Promise,then=Promise.prototype.then,resolve=Promise.resolve;
const now=performance.now.bind(performance),timer=setTimeout,clearTimer=clearTimeout;
const observe=(p,yes,no)=>apply(then,p,[yes,no]),resolved=value=>apply(resolve,OriginalPromise,[value]);
const fail=()=>{throw new ArchiveError('GENERATION_WORKER_NOT_QUIET');};
const method=(o,k)=>Object.getOwnPropertyDescriptor(o??{},k)?.value;
const receiptPrototype=PromptInsertionReceipts.prototype;
const receiptMethods=Object.freeze({source:receiptPrototype.applicationSelectionSourceIs,hold:receiptPrototype.holdCurrentTopDocumentsForApplicationSelection,current:receiptPrototype.currentTopDocumentsHeldForApplicationSelection,fence:receiptPrototype.fenceCurrentTopDocumentsForApplicationSelection,release:receiptPrototype.releaseCurrentTopDocumentsForApplicationSelection,failed:receiptPrototype.releaseFailedCurrentTopDocumentsForApplicationSelection});
const invoke=(entry,key,...args)=>apply(entry[key],entry.owner,args);
function settled(promises){return new OriginalPromise(resolve=>{let pending=promises.length;const outcomes=[];if(!pending){resolve(outcomes);return;}promises.forEach((promise,i)=>observe(resolved(promise),value=>{outcomes[i]={value};if(!--pending)resolve(outcomes);},error=>{outcomes[i]={error};if(!--pending)resolve(outcomes);}));});}

export function createApplicationTransportCoordination({sourceCoordination,captureRecovery,promptInsertionReceipts,store,api}){
 const source={owner:sourceCoordination,hold:method(sourceCoordination,'holdApplicationSources'),current:method(sourceCoordination,'applicationSourcesHeld'),fence:method(sourceCoordination,'fenceApplicationSources'),release:method(sourceCoordination,'releaseApplicationSources')};
 const capture={owner:captureRecovery,hold:method(captureRecovery,'holdForApplicationSelection'),current:method(captureRecovery,'applicationSelectionHeld'),fence:method(captureRecovery,'fenceApplicationSelection'),release:method(captureRecovery,'releaseApplicationSelection'),failed:method(captureRecovery,'releaseApplicationSelection')};
 const receipt={owner:promptInsertionReceipts,...receiptMethods};
 const entries=[source,capture,receipt];let active=null,closed=false,lastCleanup=null;
 const identities=()=>{
  try{return !closed&&isOriginalApplicationWorkerCoordination(sourceCoordination,store)&&isOriginalCaptureRecovery(captureRecovery,api)&&Object.getPrototypeOf(promptInsertionReceipts)===receiptPrototype&&typeof receipt.source==='function'&&invoke(receipt,'source',store,api)===true&&entries.every(entry=>['hold','current','fence','release'].every(key=>typeof entry[key]==='function'))&&typeof receipt.failed==='function';}catch{return false;}
 };
 // The aggregate retains ownership until ALL accepted original acquisitions
 // and releases really settle. A timer rejects its caller; it cannot settle an
 // original promise, forget a late lease or reopen admission.
 const finishCleanup=state=>{
  if(!state.cleaning||state.attemptsRemaining||state.releasesPending||state.fencesPending||state.cleanupFinished)return;
  state.cleanupFinished=true;if(!state.cleanupOk)closed=true;
  if(active===state)active=null;state.resolveCleanup(state.cleanupOk);
 };
 const releaseLease=(state,lease)=>{
  if(lease.releaseStarted)return;lease.releaseStarted=true;state.releasesPending++;
  let pending;try{pending=invoke(lease.entry,lease.failed?'failed':'release',lease.token);}catch{pending=false;}
  const ended=ok=>{lease.releaseSettled=true;lease.released=ok===true;if(!lease.released){state.cleanupOk=false;closed=true;}state.releasesPending--;finishCleanup(state);};
  try{observe(resolved(pending),ended,()=>ended(false));}catch{ended(false);}
 };
 const wait=(state,pending,{cleanup=false}={})=>new OriginalPromise((resolve,reject)=>{
  let id=timer(()=>{closed=true;reject(new ArchiveError('GENERATION_WORKER_NOT_QUIET'));},Math.max(0,state.deadline-now()));
  // Install observation even when the fixed deadline has already elapsed.
  observe(resolved(pending),value=>{clearTimer(id);if(now()>=state.deadline){closed=true;reject(new ArchiveError('GENERATION_WORKER_NOT_QUIET'));}else if(!cleanup&&(!state.valid||active!==state))reject(new ArchiveError('GENERATION_WORKER_NOT_QUIET'));else resolve(value);},error=>{clearTimer(id);reject(error);});
 });
 const cleanup=state=>{
  if(state.cleanupPromise)return state.cleanupPromise;
  state.cleaning=true;state.valid=false;state.ready=false;
  const actual=new OriginalPromise(resolve=>{state.resolveCleanup=resolve;});
  state.cleanupPromise=wait(state,actual,{cleanup:true});lastCleanup=state.cleanupPromise;
  // Automatic failure cleanup is observed even without a caller awaiting it.
  observe(state.cleanupPromise,()=>{},()=>{closed=true;});
  for(const lease of [...state.leases].reverse())releaseLease(state,lease);
  finishCleanup(state);return state.cleanupPromise;
 };
 const fenceOriginal=(state,lease)=>{
  state.fencesPending++;
  return new OriginalPromise((resolve,reject)=>{
   let ended=false;const done=(ok,value)=>{if(ended)return;ended=true;state.fencesPending--;finishCleanup(state);if(ok)resolve(value);else reject(value);};
   try{observe(resolved(invoke(lease.entry,'fence',lease.token)),value=>done(true,value),error=>done(false,error));}
   catch(error){done(false,error);}
  });
 };
 const current=token=>{
  const state=active;if(!state||state.token!==token||!state.valid||!state.ready||state.cleaning||now()>=state.deadline||!identities()||state.leases.length!==entries.length)return false;
  try{return state.leases.every(lease=>!lease.failed&&!lease.releaseStarted&&invoke(lease.entry,'current',lease.token)===true);}catch{return false;}
 };
 return Object.freeze({
  async hold(){
   if(active||!identities())fail();
   const token=Object.freeze(Object.create(null)),state={token,deadline:now()+30000,valid:true,ready:false,leases:[],attemptsRemaining:entries.length,releasesPending:0,fencesPending:0,cleaning:false,cleanupOk:true,cleanupFinished:false,cleanupPromise:null};active=state;
   // Every admission closes before any aggregate drain is awaited.
   const attempts=entries.map(entry=>{
    let pending;try{pending=invoke(entry,'hold');}catch(error){pending=new OriginalPromise((_,reject)=>reject(error));}
    return observe(resolved(pending),value=>{
     const lease={entry,token:value,failed:false,releaseStarted:false,released:false};state.leases.push(lease);state.attemptsRemaining--;
     if(closed||!state.valid||active!==state){cleanup(state);releaseLease(state,lease);finishCleanup(state);fail();}return value;
    },error=>{
     state.attemptsRemaining--;
     // Only the exact original Error is the failed owner's release capability.
     if(entry.failed)state.leases.push({entry,token:error,failed:true,releaseStarted:false,released:false});
     cleanup(state);for(const lease of state.leases)releaseLease(state,lease);finishCleanup(state);throw error;
    });
   });
   try{const outcomes=await wait(state,settled(attempts)),refused=outcomes.find(outcome=>Object.hasOwn(outcome,'error'));if(refused)throw refused.error;state.ready=true;if(!current(token))fail();return token;}
   catch(error){cleanup(state);throw error;}
  },
  current,
  async fence(token){
   const state=active;if(!current(token)){if(state?.token===token)cleanup(state);fail();}
   try{for(const lease of state.leases){if(!current(token))fail();if(await wait(state,fenceOriginal(state,lease))!==true||!current(token))fail();}return true;}
   catch(error){cleanup(state);throw error;}
  },
  release(token){if(active?.token!==token)return resolved(false);return cleanup(active);},
  close(){closed=true;return active?cleanup(active):lastCleanup??resolved(true);}
 });
}
