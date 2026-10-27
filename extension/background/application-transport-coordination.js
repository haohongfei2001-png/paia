import {originalBootstrapFreeze} from './native-host-bootstrap.js';
import {originalBootstrapWeakMap,originalBootstrapWeakGet,originalBootstrapWeakSet,originalBootstrapWeakHas,originalBootstrapWeakDelete,originalBootstrapSymbol} from './native-host-bootstrap.js';
import {readOriginalBootstrapHost,requireOriginalBootstrapHost} from './native-host-bootstrap.js';
import {ArchiveError} from '../core/constants.js';
import {isProductionApplicationWorkerCoordination,isOriginalApplicationWorkerCoordination,holdOriginalApplicationSelectionSources,currentOriginalApplicationSelectionSources,fenceOriginalApplicationSelectionSources,releaseOriginalApplicationSelectionSources} from './application-worker-coordination.js';
import {isProductionCaptureRecovery,isOriginalCaptureRecovery,holdOriginalApplicationSelectionCapture,currentOriginalApplicationSelectionCapture,fenceOriginalApplicationSelectionCapture,releaseOriginalApplicationSelectionCapture} from './capture-recovery.js';
import {isProductionPromptInsertionReceipts,isOriginalPromptInsertionReceipts,readOriginalPromptInsertionReceiptSelectionMethods,holdOriginalApplicationSelectionReceipts,currentOriginalApplicationSelectionReceipts,fenceOriginalApplicationSelectionReceipts,releaseOriginalApplicationSelectionReceipts} from './prompt-insertion-receipts.js';
import {requireOriginalApplicationSelectionValidationMember,requireOriginalApplicationSelectionMember,chargeOriginalApplicationSelectionMember,trackOriginalApplicationSelectionMemberWork,invalidateOriginalApplicationSelectionMember,originalApplicationSelectionMemberPinned} from './application-selection-reservation-coordination.js';

// Fixed live sources, capture and original CURRENT TOP document receipts only.
// This is not historical/lifetime coverage, an editor freeze or activation authority.
const apply=Reflect.apply,OriginalPromise=Promise,then=Promise.prototype.then,resolve=Promise.resolve;
const now=performance.now.bind(performance),timer=setTimeout,clearTimer=clearTimeout;
const observe=(p,yes,no)=>apply(then,p,[yes,no]),resolved=value=>apply(resolve,OriginalPromise,[value]);
const fail=()=>{throw new ArchiveError('GENERATION_WORKER_NOT_QUIET');};
const method=(o,k)=>Object.getOwnPropertyDescriptor(o??{},k)?.value;
// Definition-time receipt identities are captured by the receipt owner itself.
// Read only after module initialization, never snapshot mutable prototypes here.
const originalOwners=originalBootstrapWeakMap(),productionOrigin=originalBootstrapSymbol(),ordinaryOrigin=originalBootstrapSymbol(),injectedOrigin=originalBootstrapSymbol();
const invoke=(entry,key,...args)=>apply(entry[key],entry.owner,args);
function settled(promises){return new OriginalPromise(resolve=>{let pending=promises.length;const outcomes=[];if(!pending){resolve(outcomes);return;}promises.forEach((promise,i)=>observe(resolved(promise),value=>{outcomes[i]={value};if(!--pending)resolve(outcomes);},error=>{outcomes[i]={error};if(!--pending)resolve(outcomes);}));});}

function createTransportCoordination({sourceCoordination,captureRecovery,promptInsertionReceipts,store,api},origin){
 const source={owner:sourceCoordination,hold:method(sourceCoordination,'holdApplicationSources'),current:method(sourceCoordination,'applicationSourcesHeld'),fence:method(sourceCoordination,'fenceApplicationSources'),release:method(sourceCoordination,'releaseApplicationSources')};
 const capture={owner:captureRecovery,hold:method(captureRecovery,'holdForApplicationSelection'),current:method(captureRecovery,'applicationSelectionHeld'),fence:method(captureRecovery,'fenceApplicationSelection'),release:method(captureRecovery,'releaseApplicationSelection'),failed:method(captureRecovery,'releaseApplicationSelection')};
 const receipt={owner:promptInsertionReceipts,...readOriginalPromptInsertionReceiptSelectionMethods()};
 const entries=[source,capture,receipt];let active=null,closed=false,lastCleanup=null,selectionAction=null;
 const poison=()=>{if(selectionAction)invalidateOriginalApplicationSelectionMember(selectionAction,coordinator,'transport');};
 const refuse=()=>{poison();fail();};
 const pinned=()=>!!selectionAction&&originalApplicationSelectionMemberPinned(selectionAction,coordinator,'transport');
 const requireAction=(frame=null)=>{if(frame!==null)return requireOriginalApplicationSelectionValidationMember(frame,selectionAction,coordinator,'transport');return selectionAction?requireOriginalApplicationSelectionMember(selectionAction,coordinator,'transport'):null;};
 const charge=(value,references=0)=>{if(selectionAction)chargeOriginalApplicationSelectionMember(selectionAction,coordinator,'transport',value,references);};
 const track=promise=>{if(selectionAction)trackOriginalApplicationSelectionMemberWork(selectionAction,coordinator,'transport',promise);return promise;};
 const actionMethods=new Map([[source,{hold:holdOriginalApplicationSelectionSources,current:currentOriginalApplicationSelectionSources,fence:fenceOriginalApplicationSelectionSources,release:releaseOriginalApplicationSelectionSources,failed:releaseOriginalApplicationSelectionSources}],[capture,{hold:holdOriginalApplicationSelectionCapture,current:currentOriginalApplicationSelectionCapture,fence:fenceOriginalApplicationSelectionCapture,release:releaseOriginalApplicationSelectionCapture,failed:releaseOriginalApplicationSelectionCapture}],[receipt,{hold:holdOriginalApplicationSelectionReceipts,current:currentOriginalApplicationSelectionReceipts,fence:fenceOriginalApplicationSelectionReceipts,release:releaseOriginalApplicationSelectionReceipts,failed:releaseOriginalApplicationSelectionReceipts}]]);
 const call=(entry,key,...args)=>selectionAction?actionMethods.get(entry)[key](selectionAction,entry.owner,...args):invoke(entry,key,...args);
 const identities=()=>{
  try{return !closed&&(origin!==productionOrigin||(isProductionApplicationWorkerCoordination(sourceCoordination,store)&&isProductionCaptureRecovery(captureRecovery)&&isProductionPromptInsertionReceipts(promptInsertionReceipts,store)))&&isOriginalApplicationWorkerCoordination(sourceCoordination,store)&&isOriginalCaptureRecovery(captureRecovery,api)&&isOriginalPromptInsertionReceipts(promptInsertionReceipts,store,api)&&typeof receipt.source==='function'&&invoke(receipt,'source',store,api)===true&&entries.every(entry=>['hold','current','fence','release'].every(key=>typeof entry[key]==='function'))&&typeof receipt.failed==='function';}catch{return false;}
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
  if(pinned()){poison();state.cleanupRequested=true;return;}if(lease.releaseStarted)return;lease.releaseStarted=true;state.releasesPending++;
  let pending;try{pending=call(lease.entry,lease.failed?'failed':'release',lease.failed&&selectionAction?undefined:lease.token);}catch{pending=false;}
  const ended=ok=>{lease.releaseSettled=true;lease.released=ok===true;if(!lease.released){state.cleanupOk=false;closed=true;}state.releasesPending--;finishCleanup(state);};
  try{observe(resolved(pending),ended,()=>ended(false));}catch{ended(false);}
 };
 const wait=(state,pending,{cleanup=false}={})=>new OriginalPromise((resolve,reject)=>{
  let id=timer(()=>{closed=true;poison();reject(new ArchiveError('GENERATION_WORKER_NOT_QUIET'));},Math.max(0,state.deadline-now()));
  // Install observation even when the fixed deadline has already elapsed.
  observe(resolved(pending),value=>{clearTimer(id);if(now()>=state.deadline){closed=true;poison();reject(new ArchiveError('GENERATION_WORKER_NOT_QUIET'));}else if(!cleanup&&(!state.valid||active!==state))reject(new ArchiveError('GENERATION_WORKER_NOT_QUIET'));else resolve(value);},error=>{clearTimer(id);reject(error);});
 });
 const cleanup=state=>{
  if(pinned()){poison();state.valid=false;state.ready=false;state.cleanupRequested=true;return resolved(false);}
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
   try{observe(resolved(track(call(lease.entry,'fence',lease.token))),value=>done(true,value),error=>done(false,error));}
   catch(error){done(false,error);}
  });
 };
 const current=(token,frame=null)=>{
  const state=active;if(!state||state.token!==token||!state.valid||!state.ready||state.cleaning||now()>=state.deadline||!identities()||state.leases.length!==entries.length){if(state?.token===token)poison();return false;}
  try{requireAction(frame);const valid=state.leases.every(lease=>!lease.failed&&!lease.releaseStarted&&(selectionAction&&lease.entry===receipt?currentOriginalApplicationSelectionReceipts(selectionAction,receipt.owner,lease.token,frame):call(lease.entry,'current',lease.token))===true);if(!valid)poison();return valid;}catch{poison();return false;}
 };
 const coordinator=originalBootstrapFreeze({
  async hold(){
   if(active||!identities())refuse();
   const token=Object.freeze(Object.create(null)),state={token,deadline:Math.min(now()+30000,requireAction()?.deadline??Infinity),valid:true,ready:false,leases:[],attemptsRemaining:entries.length,releasesPending:0,fencesPending:0,cleaning:false,cleanupOk:true,cleanupFinished:false,cleanupPromise:null};active=state;charge({owner:'transport',phase:'acquiring',members:entries.length},1);
   // Every admission closes before any aggregate drain is awaited.
   const attempts=entries.map(entry=>{
    let pending;try{pending=track(call(entry,'hold'));}catch(error){pending=new OriginalPromise((_,reject)=>reject(error));}
    return observe(resolved(pending),value=>{
     const lease={entry,token:value,failed:false,releaseStarted:false,released:false};state.leases.push(lease);state.attemptsRemaining--;
     if(closed||!state.valid||active!==state){cleanup(state);releaseLease(state,lease);finishCleanup(state);refuse();}return value;
    },error=>{
     state.attemptsRemaining--;poison();
     // Only the exact original Error is the failed owner's release capability.
     if(entry.failed)state.leases.push({entry,token:error,failed:true,releaseStarted:false,released:false});
     cleanup(state);for(const lease of state.leases)releaseLease(state,lease);finishCleanup(state);throw error;
    });
   });
   try{const outcomes=await wait(state,settled(attempts)),refused=outcomes.find(outcome=>Object.hasOwn(outcome,'error'));if(refused)throw refused.error;state.ready=true;charge({owner:'transport',phase:'held',members:state.leases.length},1);if(!current(token))refuse();return token;}
   catch(error){poison();cleanup(state);throw error;}
  },
  current,
  async fence(token){
   const state=active;if(!current(token)){if(state?.token===token)cleanup(state);refuse();}
   // Only the selection path uses the private dense-array synchronous group;
   // iterator.next cannot interpose after the fresh check before dispatch.
   try{if(selectionAction){for(let i=0;i<state.leases.length;i++){const lease=state.leases[i];if(await wait(state,fenceOriginal(state,lease))!==true||!current(token))refuse();}}else{for(const lease of state.leases){if(!current(token))refuse();if(await wait(state,fenceOriginal(state,lease))!==true||!current(token))refuse();}}return true;}
   catch(error){poison();cleanup(state);throw error;}
  },
  release(token){if(active?.token!==token)return resolved(false);return cleanup(active);},
  close(){closed=true;poison();return active?cleanup(active):lastCleanup??resolved(true);}
 });
 originalBootstrapWeakSet(originalOwners,coordinator,{store,api,origin,members:Object.freeze({sourceCoordination,captureRecovery,promptInsertionReceipts}),current:identities,bind(action){if(selectionAction||active||!identities())refuse();requireOriginalApplicationSelectionMember(action,coordinator,'transport');selectionAction=action;charge({owner:'transport',phase:'bound'},1);},action:()=>selectionAction,token:()=>active?.token});return coordinator;
}

export function isOriginalApplicationTransportCoordination(owner,store,api){const r=originalBootstrapWeakGet(originalOwners,owner);return !!r&&r.store===store&&r.api===api&&r.current();}
export function readOriginalApplicationSelectionTransportMembers(owner,store,api){const r=originalBootstrapWeakGet(originalOwners,owner);if(!r||r.store!==store||r.api!==api||!r.current())fail();return r.members;}
export function holdOriginalApplicationSelectionTransport(action,owner){const r=originalBootstrapWeakGet(originalOwners,owner);if(!r)fail();r.bind(action);return owner.hold();}
export function currentOriginalApplicationSelectionTransport(action,owner,token,frame=null){const r=originalBootstrapWeakGet(originalOwners,owner);if(!r||r.action()!==action)return false;return owner.current(token,frame);}
export function fenceOriginalApplicationSelectionTransport(action,owner,token){const r=originalBootstrapWeakGet(originalOwners,owner);if(!r||action===null||r.action()!==action)fail();return owner.fence(token);}
export function releaseOriginalApplicationSelectionTransport(action,owner,token){const r=originalBootstrapWeakGet(originalOwners,owner);if(!r||r.action()!==action)return resolved(false);return owner.release(token??r.token());}

export function createInjectedApplicationTransportCoordinationForTest(options){return createTransportCoordination(options,injectedOrigin);}
export function createApplicationTransportCoordination(options){return createInjectedApplicationTransportCoordinationForTest(options);}
export function createOrdinaryApplicationTransportCoordination(options){return createTransportCoordination(options,ordinaryOrigin);}
export function createProductionApplicationTransportCoordination(options){if(arguments.length!==1||Object.hasOwn(options,'api'))fail();const {sourceCoordination,captureRecovery,promptInsertionReceipts,store}=options;const api=readOriginalBootstrapHost();const owner=createTransportCoordination({sourceCoordination,captureRecovery,promptInsertionReceipts,store,api},productionOrigin);requireOriginalBootstrapHost(api);if(!isProductionApplicationTransportCoordination(owner,store))fail();return owner;}
export function isProductionApplicationTransportCoordination(owner,store){try{const r=originalBootstrapWeakGet(originalOwners,owner);return !!r&&r.origin===productionOrigin&&r.store===store&&r.api===readOriginalBootstrapHost()&&r.current();}catch{return false;}}
