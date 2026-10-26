import {originalBootstrapFreeze} from './native-host-bootstrap.js';
import {originalBootstrapWeakMap,originalBootstrapWeakGet,originalBootstrapWeakSet,originalBootstrapWeakHas,originalBootstrapWeakDelete,originalBootstrapSymbol} from './native-host-bootstrap.js';
import {readOriginalBootstrapHost,requireOriginalBootstrapHost,readOriginalBootstrapRuntime} from './native-host-bootstrap.js';
import {isProductionApplicationStore} from './application-store-selection.js';
import {originalSelectionHoldBinding,chargeOriginalSelectionHold,trackOriginalSelectionHoldWork,invalidateOriginalSelectionHold,originalSelectionHoldPinned} from '../core/local-tool-selection-hold.js';
import {ArchiveError} from '../core/constants.js';
import {ImportHandler,isProductionImportHandler,readOriginalImportSelectionMethods} from './import-handler.js';
import {BackupService,readOriginalBackupSelectionMethods} from '../core/backup-service.js';
import {IntegrityChecker,readOriginalIntegritySelectionMethods} from '../core/integrity-checker.js';

// Fixed original Import, Backup and Integrity warm owners only. This does not
// certify other writers, cold work, editors, host insertion or activation.
const apply=Reflect.apply,OriginalPromise=Promise,then=Promise.prototype.then,resolve=Promise.resolve;
const now=performance.now.bind(performance),timer=setTimeout,clearTimer=clearTimeout;
const observe=(p,yes,no)=>apply(then,p,[yes,no]),resolved=value=>apply(resolve,OriginalPromise,[value]);
const fail=()=>{throw new ArchiveError('GENERATION_WORKER_NOT_QUIET');};
const originalCoordinators=originalBootstrapWeakMap(),productionOrigin=originalBootstrapSymbol(),ordinaryOrigin=originalBootstrapSymbol(),injectedOrigin=originalBootstrapSymbol();
export function readOriginalApplicationSelectionLocalToolMembers(owner,store,runtime){const r=originalBootstrapWeakGet(originalCoordinators,owner);if(!r||r.store!==store||r.runtime!==runtime||!r.identities())fail();return r.members();}
export function holdOriginalApplicationSelectionLocalTools(action,owner){const r=originalBootstrapWeakGet(originalCoordinators,owner);if(!r)fail();return r.hold(action);}
export function currentOriginalApplicationSelectionLocalTools(action,owner,token){const r=originalBootstrapWeakGet(originalCoordinators,owner);return !!r&&r.currentAction(action,token);}
export function fenceOriginalApplicationSelectionLocalTools(action,owner,token){const r=originalBootstrapWeakGet(originalCoordinators,owner);if(!r||!r.currentAction(action,token))fail();return r.fence(token);}
export function releaseOriginalApplicationSelectionLocalTools(action,owner,token){const r=originalBootstrapWeakGet(originalCoordinators,owner);return !!r&&r.releaseAction(action,token);}

export function isOriginalApplicationLocalToolsCoordination(owner,store,runtime){
 const original=originalBootstrapWeakGet(originalCoordinators,owner);return !!original&&original.store===store&&original.runtime===runtime&&original.identities();
}
const invoke=(entry,key,...args)=>apply(entry[key],entry.owner,args);
function settled(promises){return new OriginalPromise(resolve=>{let pending=promises.length;const outcomes=[];if(!pending){resolve(outcomes);return;}promises.forEach((promise,i)=>observe(resolved(promise),value=>{outcomes[i]={value};if(!--pending)resolve(outcomes);},error=>{outcomes[i]={error};if(!--pending)resolve(outcomes);}));});}

function createLocalToolsCoordination({imports,backups,integrity,store,runtime},origin){
 const contracts=[readOriginalImportSelectionMethods(),readOriginalBackupSelectionMethods(),readOriginalIntegritySelectionMethods()],importMembers=contracts[0].members;
 const entries=[imports,backups,integrity].map((owner,i)=>({owner,...contracts[i]}));let active=null,closed=false,lastCleanupResult=null;
 const identities=()=>{
  try{return !closed&&(origin!==productionOrigin||(runtime===readOriginalBootstrapRuntime()&&isProductionApplicationStore(store)&&isProductionImportHandler(imports,store)))&&entries.every((entry,i)=>Object.getPrototypeOf(entry.owner)===entry.prototype&&['source','hold','current','fence','release','failed'].every(key=>typeof entry[key]==='function')&&invoke(entry,'source',store,...(i===0?[runtime]:[]))===true);}catch{return false;}
 };
 const releaseLease=(lease,state)=>{if(lease.released)return true;try{const result=invoke(lease.entry,lease.failed?'failed':'release',lease.token,state.selection?.action??null)===true;if(result)lease.released=true;return result;}catch{return false;}};
 const finishCleanup=state=>{
  if(state.cleanupFinished)return state.cleanupOk;
  if(!state.cleaning||state.attemptsRemaining||state.fencesPending)return false;
  state.cleanupFinished=true;
  if(active===state){active=null;lastCleanupResult=state.cleanupOk;}
  return state.cleanupOk;
 };
 const cleanup=state=>{
  if(originalSelectionHoldPinned(state)){invalidateOriginalSelectionHold(state);state.ready=false;state.releaseRequested=true;return false;}state.valid=false;state.ready=false;state.cleaning=true;
  for(const lease of [...state.leases].reverse())if(!releaseLease(lease,state))state.cleanupOk=false;
  if(!state.cleanupOk)closed=true;
  // Original release methods are synchronous, but accepted acquisition/fence
  // promises are not. Keep aggregate exclusion until those actually settle.
  return finishCleanup(state);
 };
 const fenceOriginal=(state,lease)=>{
  state.fencesPending++;
  return new OriginalPromise((resolve,reject)=>{
   let ended=false;const done=(ok,value)=>{if(ended)return;ended=true;state.fencesPending--;finishCleanup(state);if(ok)resolve(value);else reject(value);};
   try{observe(resolved(trackOriginalSelectionHoldWork(state,invoke(lease.entry,'fence',lease.token))),value=>done(true,value),error=>done(false,error));}
   catch(error){done(false,error);}
  });
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
 const coordination=originalBootstrapFreeze({
  async hold(action=null){
   if(active||!identities())fail();
   const selection=originalSelectionHoldBinding(action,coordination,'local-tools');const token=Object.freeze(Object.create(null)),state={selection,token,deadline:selection?.deadline??now()+30000,valid:true,ready:false,leases:[],attemptsRemaining:entries.length,fencesPending:0,cleaning:false,cleanupOk:true,cleanupFinished:false};active=state;
   // Every admission closes before any aggregate drain is awaited.
   const attempts=entries.map(entry=>{
    let pending;try{chargeOriginalSelectionHold(state,{operation:'child-hold'},1);pending=invoke(entry,'hold',action);trackOriginalSelectionHoldWork(state,pending);}catch(error){pending=new OriginalPromise((_,reject)=>reject(error));}
    return observe(resolved(pending),value=>{
     const lease={entry,token:value,failed:false,released:false};state.leases.push(lease);state.attemptsRemaining--;
     if(closed||!state.valid||active!==state){cleanup(state);fail();}return value;
    },error=>{
     state.attemptsRemaining--;
     if(entry.failed){const lease={entry,token:error,failed:true,released:false};state.leases.push(lease);}
     cleanup(state);throw error;
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
  release(token){if(active?.token!==token)return false;const state=active,result=cleanup(state);if(!state.cleanupOk)fail();return result;},
  close(){closed=true;if(active){const state=active,result=cleanup(state);if(!state.cleanupOk)fail();return result;}return lastCleanupResult??true;}
 });
 originalBootstrapWeakSet(originalCoordinators,coordination,{store,runtime,origin,identities,members:()=>Object.freeze([Object.freeze({owner:imports,kind:'local-import-handler'}),Object.freeze({owner:backups,kind:'local-backup'}),Object.freeze({owner:integrity,kind:'local-integrity'}),...apply(importMembers,imports,[store])]),hold:coordination.hold,fence:coordination.fence,
 currentAction:(action,token)=>{const state=active;if(!state||state.selection?.action!==action||state.token!==token)return false;const valid=current(token);if(!valid)invalidateOriginalSelectionHold(state);return valid;},releaseAction:(action,token)=>{const state=active;if(!state||state.selection?.action!==action||token!==undefined&&state.token!==token)return false;return coordination.release(state.token);}});return coordination;
}

export function createInjectedApplicationLocalToolsCoordinationForTest(options){return createLocalToolsCoordination(options,injectedOrigin);}
export function createApplicationLocalToolsCoordination(options){return createInjectedApplicationLocalToolsCoordinationForTest(options);}
export function createOrdinaryApplicationLocalToolsCoordination(options){return createLocalToolsCoordination(options,ordinaryOrigin);}
export function createProductionApplicationLocalToolsCoordination(options){if(arguments.length!==1||Object.hasOwn(options,'runtime'))fail();const {imports,backups,integrity,store}=options;const api=readOriginalBootstrapHost(),runtime=readOriginalBootstrapRuntime();const owner=createLocalToolsCoordination({imports,backups,integrity,store,runtime},productionOrigin);requireOriginalBootstrapHost(api);if(!isProductionApplicationLocalToolsCoordination(owner,store))fail();return owner;}
export function isProductionApplicationLocalToolsCoordination(owner,store){try{const r=originalBootstrapWeakGet(originalCoordinators,owner);return !!r&&r.origin===productionOrigin&&r.store===store&&r.runtime===readOriginalBootstrapRuntime()&&r.identities();}catch{return false;}}
