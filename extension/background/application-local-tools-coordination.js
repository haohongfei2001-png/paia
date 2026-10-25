import {ArchiveError} from '../core/constants.js';
import {ImportHandler} from './import-handler.js';
import {BackupService} from '../core/backup-service.js';
import {IntegrityChecker} from '../core/integrity-checker.js';

// Fixed original Import, Backup and Integrity warm owners only. This does not
// certify other writers, cold work, editors, host insertion or activation.
const apply=Reflect.apply,OriginalPromise=Promise,then=Promise.prototype.then,resolve=Promise.resolve;
const now=performance.now.bind(performance),timer=setTimeout,clearTimer=clearTimeout;
const observe=(p,yes,no)=>apply(then,p,[yes,no]),resolved=value=>apply(resolve,OriginalPromise,[value]);
const fail=()=>{throw new ArchiveError('GENERATION_WORKER_NOT_QUIET');};
const originalCoordinators=new WeakMap();
const contracts=[ImportHandler,BackupService,IntegrityChecker].map(type=>{
 const prototype=type.prototype;
 return Object.freeze({prototype,source:prototype.applicationSelectionSourceIs,hold:prototype.holdForApplicationSelection,current:prototype.applicationSelectionHeld,fence:prototype.fenceApplicationSelection,release:prototype.releaseApplicationSelection,failed:prototype.releaseFailedApplicationSelection});
});
export function isOriginalApplicationLocalToolsCoordination(owner,store,runtime){
 const original=originalCoordinators.get(owner);return !!original&&original.store===store&&original.runtime===runtime&&original.identities();
}
const invoke=(entry,key,...args)=>apply(entry[key],entry.owner,args);
function settled(promises){return new OriginalPromise(resolve=>{let pending=promises.length;const outcomes=[];if(!pending){resolve(outcomes);return;}promises.forEach((promise,i)=>observe(resolved(promise),value=>{outcomes[i]={value};if(!--pending)resolve(outcomes);},error=>{outcomes[i]={error};if(!--pending)resolve(outcomes);}));});}

export function createApplicationLocalToolsCoordination({imports,backups,integrity,store,runtime}){
 const entries=[imports,backups,integrity].map((owner,i)=>({owner,...contracts[i]}));let active=null,closed=false;
 const identities=()=>{
  try{return !closed&&entries.every((entry,i)=>Object.getPrototypeOf(entry.owner)===entry.prototype&&['source','hold','current','fence','release','failed'].every(key=>typeof entry[key]==='function')&&invoke(entry,'source',store,...(i===0?[runtime]:[]))===true);}catch{return false;}
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
 const coordination=Object.freeze({
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
 originalCoordinators.set(coordination,{store,runtime,identities});return coordination;
}
