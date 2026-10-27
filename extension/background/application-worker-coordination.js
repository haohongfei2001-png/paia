import {requireOriginalApplicationSelectionWorkerNativePrefix} from './application-selection-reservation-coordination.js';
import {originalBootstrapFreeze} from './native-host-bootstrap.js';
import {originalBootstrapWeakMap,originalBootstrapWeakGet,originalBootstrapWeakSet,originalBootstrapWeakHas,originalBootstrapWeakDelete,originalBootstrapSymbol} from './native-host-bootstrap.js';
import {readOriginalBootstrapHost,requireOriginalBootstrapHost} from './native-host-bootstrap.js';
import {isProductionApplicationStore} from './application-store-selection.js';
import {originalSelectionHoldBinding,chargeOriginalSelectionHold,trackOriginalSelectionHoldWork,invalidateOriginalSelectionHold,originalSelectionHoldPinned} from '../core/local-tool-selection-hold.js';
import {BoundedOrganizerWorkflow,readBoundedOrganizerApplicationSelectionMembers,holdBoundedOrganizerForApplicationSelection,boundedOrganizerHeldForApplicationSelection,releaseBoundedOrganizerForApplicationSelection} from '../core/organizer/bounded-workflow.js';
import {ArchiveError} from '../core/constants.js';
import {SafetyRunner,readOriginalSafetySelectionMethods} from '../core/thought-runner.js';
import {LibraryRunner,readOriginalLibrarySelectionMethods} from '../core/library-runner.js';
import {FilterRunner,readOriginalFilterSelectionMethods} from '../core/filter-runner.js';
import {ContextConnections,isProductionContextConnections,readOriginalContextSelectionMethods} from './context-connections.js';
import {AssistPromptCommands,isProductionAssistPromptCommands,readOriginalAssistSelectionMethods} from './prompt-assist.js';
import {NextPromptCommands,isProductionNextPromptCommands,readOriginalNextSelectionMethods} from './prompt-next.js';
import {PromptReuseCommands,isProductionPromptReuseCommands,readOriginalPromptSelectionMethods} from './prompt-reuse-commands.js';
import {PromptSurfaceCommands,isProductionPromptSurfaceCommands,readOriginalSurfaceSelectionMethods} from './prompt-surface.js';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {holdMaintenanceForApplicationSelection,maintenanceHeldForApplicationSelection,releaseMaintenanceForApplicationSelection} from '../core/ai-usage/maintenance-runner.js';
const fail=()=>{throw new ArchiveError('GENERATION_WORKER_NOT_QUIET');};
const apply=Reflect.apply,clock=performance.now.bind(performance),Timer=setTimeout,clearTimer=clearTimeout;
const DEADLINE_MS=30000;
const checkTime=state=>{if(clock()>=state.deadline)fail();};
async function waitOriginalOwner(state,pending){
 // Attach a rejection observer even when an already-created owner promise
 // crossed the deadline synchronously before reaching this await.
 let timer;
 try{const result=await Promise.race([pending,new Promise((_,reject)=>{timer=Timer(()=>reject(new ArchiveError('GENERATION_WORKER_NOT_QUIET')),Math.max(0,state.deadline-clock()));})]);checkTime(state);return result;}
 finally{clearTimer(timer);}
}
const originalCoordinators=originalBootstrapWeakMap(),productionOrigin=originalBootstrapSymbol(),ordinaryOrigin=originalBootstrapSymbol(),injectedOrigin=originalBootstrapSymbol();
export function readOriginalApplicationSelectionSourceMembers(owner,store){const r=originalBootstrapWeakGet(originalCoordinators,owner);if(!r||r.store!==store||!r.current())fail();return r.members();}
export function holdOriginalApplicationSelectionSources(action,owner){const r=originalBootstrapWeakGet(originalCoordinators,owner);if(!r)fail();return r.hold(action);}
export function currentOriginalApplicationSelectionSources(action,owner,token){const r=originalBootstrapWeakGet(originalCoordinators,owner);return !!r&&r.currentAction(action,token);}
export function fenceOriginalApplicationSelectionSources(action,owner,token){const r=originalBootstrapWeakGet(originalCoordinators,owner);if(!r)fail();return r.fenceAction(action,token);}
export function releaseOriginalApplicationSelectionSources(action,owner,token){const r=originalBootstrapWeakGet(originalCoordinators,owner);if(!r)return false;return r.releaseAction(action,token);}

export function isOriginalApplicationWorkerCoordination(owner,store,context=null){const original=originalBootstrapWeakGet(originalCoordinators,owner);try{return !!original&&original.store===store&&original.current(context);}catch{return false;}}
const exact=(owner,prototype)=>!!owner&&Object.getPrototypeOf(owner)===prototype;
const intact=entry=>entry.methods.every(([key,method])=>!Object.hasOwn(entry.owner,key)&&entry.prototype[key]===method);
// Capture original methods, not instance callbacks or a later prototype edit.
const bound=(owner,prototype,operations)=>({owner,prototype,...operations});
// Fixed original source owners only. This composes their live task evidence,
// not cold insertion/host freeze proof, editor safety or activation authority.
// PREPARE must remain read-only and must not consume these invalidating holds.
function createWorkerCoordination({store,safety,libraryRunner,filterRunner,maintenanceRunner,contextConnections,promptAssist,promptNext,promptCommands,promptSurface,boundedOrganizer},origin){
 const safetyMethods=readOriginalSafetySelectionMethods(),libraryMethods=readOriginalLibrarySelectionMethods(),filterMethods=readOriginalFilterSelectionMethods(),contextMethods=readOriginalContextSelectionMethods(),assistMethods=readOriginalAssistSelectionMethods(),nextMethods=readOriginalNextSelectionMethods(),promptMethods=readOriginalPromptSelectionMethods(),surfaceMethods=readOriginalSurfaceSelectionMethods(),assistMembers=assistMethods.members;
 const local=[bound(safety,SafetyRunner.prototype,safetyMethods),bound(libraryRunner,libraryMethods.prototype,libraryMethods),bound(filterRunner,FilterRunner.prototype,filterMethods)].map((entry,i)=>({...entry,kind:['source-safety','source-library','source-filter'][i]}));
 if(!store||local.some(({owner,prototype})=>!exact(owner,prototype)||owner.store!==store))fail();
 const repository=store.repository,database=repository?.db,databaseId=store.databaseId;
 const sources=[bound(contextConnections,ContextConnections.prototype,contextMethods),bound(promptAssist,AssistPromptCommands.prototype,assistMethods),bound(promptNext,NextPromptCommands.prototype,nextMethods),bound(promptCommands,PromptReuseCommands.prototype,promptMethods),bound(promptSurface,PromptSurfaceCommands.prototype,surfaceMethods)];
 const service=promptCommands?.service,session=promptAssist?.session;
 const identities=sources.map(({owner})=>({api:owner?.api,service:owner?.service,surface:owner?.surface}));
 const organize={owner:boundedOrganizer,hold:action=>holdBoundedOrganizerForApplicationSelection(boundedOrganizer,store,action?{action}:undefined),current:token=>boundedOrganizerHeldForApplicationSelection(boundedOrganizer,store,token),release:(token,action)=>releaseBoundedOrganizerForApplicationSelection(boundedOrganizer,store,token,action)};
 const maintenance={owner:maintenanceRunner,hold:action=>holdMaintenanceForApplicationSelection(maintenanceRunner,store,action),current:token=>maintenanceHeldForApplicationSelection(maintenanceRunner,store,token),release:(token,action)=>releaseMaintenanceForApplicationSelection(maintenanceRunner,store,token,action)};
 let active=null,closed=false;
 const storeCurrent=()=>!!database&&store.repository===repository&&repository.db===database&&store.databaseId===databaseId;
 const localCurrent=()=>storeCurrent()&&local.every(entry=>exact(entry.owner,entry.prototype)&&entry.owner.store===store&&intact(entry))&&safetyMethods.methods.every(([key,method])=>SafetyRunner.prototype[key]===method);
 const nativeSourcesCurrent=(context=null)=>origin!==productionOrigin||(context!==null?requireOriginalApplicationSelectionWorkerNativePrefix(context,coordinator,store):(isProductionApplicationStore(store)&&isProductionContextConnections(contextConnections,store)&&isProductionAssistPromptCommands(promptAssist,store)&&isProductionNextPromptCommands(promptNext,store)&&isProductionPromptReuseCommands(promptCommands,store)&&isProductionPromptSurfaceCommands(promptSurface,store)));
 const sourcesCurrent=(context=active?.selection?.action??null)=>nativeSourcesCurrent(context)&&localCurrent()&&exact(boundedOrganizer,BoundedOrganizerWorkflow.prototype)&&boundedOrganizer.s===store&&sources.every((entry,i)=>{const {owner,prototype,hold,current,fence,release}=entry;return exact(owner,prototype)&&intact(entry)&&[hold,current,fence,release].every(method=>typeof method==='function')&&owner.api===identities[i].api&&owner.service===identities[i].service&&owner.surface===identities[i].surface;})&&
  apply(contextMethods.source,contextConnections,[store])===true&&apply(assistMethods.source,promptAssist,[store])===true&&apply(nextMethods.source,promptNext,[store])===true&&
  exact(service,PromptReuseService.prototype)&&promptCommands.service===service&&service.s===store&&promptNext.service===service&&promptAssist.store===store&&promptAssist.session===session&&
  promptSurface.commands===promptCommands&&promptSurface.assist===promptAssist&&promptSurface.next===promptNext&&promptAssist.surface===promptSurface&&promptNext.surface===promptSurface;
 const call=(entry,method,...args)=>apply(entry[method],entry.owner,args);
 // A failed cleanup cannot leave an apparently reusable coordinator. Continue
 // releasing the remaining original receipts even when one owner throws.
 const releaseEntry=(entry,state)=>{if(entry.released)return true;try{const result=call(entry,'release',entry.token,state.selection?.action??null)===true;if(result)entry.released=true;return result;}catch{return false;}};
 const releaseState=state=>{
  if(originalSelectionHoldPinned(state)){invalidateOriginalSelectionHold(state);state.ready=false;state.releaseRequested=true;return false;}if(active===state)active=null;state.valid=false;state.ready=false;let ok=true;
  for(const entry of [...state.held].reverse())if(!releaseEntry(entry,state))ok=false;
  if(!ok)closed=true;return ok;
 };
 const release=(token,scope)=>{if(active?.token!==token||active.scope!==scope)return false;const state=active;if(originalSelectionHoldPinned(state)){invalidateOriginalSelectionHold(state);state.releaseRequested=true;return false;}if(!releaseState(state))fail();return true;};
 const current=(token,scope)=>{
  const state=active;if(closed||!state||state.token!==token||state.scope!==scope||!state.ready||!state.valid||clock()>=state.deadline)return false;
  try{return (scope==='sources'?sourcesCurrent():localCurrent())&&state.held.length===state.owners.length&&state.held.every(entry=>!entry.released&&call(entry,'current',entry.token)===true);}catch{return false;}
 };
 const hold=async (scope,action=null)=>{
  if(closed||active)fail();
  try{if(!(scope==='sources'?sourcesCurrent(action):localCurrent()))fail();}catch{fail();}
  const selection=originalSelectionHoldBinding(action,coordinator,'sources');const token=Object.freeze(Object.create(null)),state={selection,token,scope,deadline:selection?.deadline??clock()+DEADLINE_MS,owners:scope==='sources'?[...local,...sources,maintenance,organize]:[...local,maintenance],held:[],ready:false,valid:true};active=state;
  try{
   // Invoke EVERY original admission hold in this turn before awaiting any
   // drain. A synchronous refusal must not strand earlier pending promises.
   const attempts=state.owners.map(owner=>{
    const entry={...owner,token:undefined,released:false};if(action!==null)state.held.push(entry);let pending;try{chargeOriginalSelectionHold(state,{operation:'child-hold'},1);pending=call(owner,'hold',action,owner.kind);trackOriginalSelectionHoldWork(state,Promise.resolve(pending));}catch(error){pending=Promise.reject(error);}
    return Promise.resolve(pending).then(value=>{
     entry.token=value;if(action===null)state.held.push(entry);
     if(closed||active!==state||!state.valid){if(!releaseEntry(entry,state))closed=true;fail();}
     return value;
    }).catch(error=>{releaseState(state);throw error;});
   });
   const results=await waitOriginalOwner(state,Promise.allSettled(attempts)),refused=results.find(result=>result.status==='rejected');
   if(refused)throw refused.reason;state.ready=true;if(!current(token,scope))fail();return token;
  }catch(error){releaseState(state);throw error;}
 };
 const coordinator=originalBootstrapFreeze({
  holdLocalMaintenance:()=>hold('local'),
  assertLocalMaintenanceHeld(token){if(!current(token,'local'))fail();return true;},
  releaseLocalMaintenance:token=>release(token,'local'),
  holdApplicationSources:()=>hold('sources'),
  applicationSourcesHeld:token=>current(token,'sources'),
  async fenceApplicationSources(token){
   if(!current(token,'sources')){if(active?.token===token&&active.scope==='sources')releaseState(active);fail();}
   const state=active;
   try{
    // Each real asynchronous owner fence re-reads its own source snapshot. No
    // registry size or resolved outer wrapper replaces those original facts.
    if(state.selection){for(let i=0;i<state.held.length;i++){const entry=state.held[i];if(typeof entry.fence==='function'){checkTime(state);if(await waitOriginalOwner(state,trackOriginalSelectionHoldWork(state,call(entry,'fence',entry.token)))!==true)fail();if(!current(token,'sources'))fail();}}
     // Private dense-array entries without a fence execute no callback.
     checkTime(state);
    }else{for(const entry of state.held){if(typeof entry.fence==='function'){checkTime(state);if(await waitOriginalOwner(state,trackOriginalSelectionHoldWork(state,call(entry,'fence',entry.token)))!==true)fail();}if(!current(token,'sources'))fail();}}
    return true;
   }catch(error){releaseState(state);throw error;}
  },
  releaseApplicationSources:token=>release(token,'sources'),
  close(){closed=true;if(active&&!releaseState(active))fail();}
 });
 const nativeMembers=originalBootstrapFreeze({store,context:contextConnections,assist:promptAssist,next:promptNext,prompt:promptCommands,surface:promptSurface});
 originalBootstrapWeakSet(originalCoordinators,coordinator,{store,origin,current:(context=null)=>!closed&&sourcesCurrent(context??active?.selection?.action??null),nativeMembers:()=>closed?null:nativeMembers,
  members:()=>Object.freeze([...local.map(({owner},i)=>Object.freeze({owner,kind:['source-safety','source-library','source-filter'][i]})),...sources.map(({owner},i)=>Object.freeze({owner,kind:['source-context','source-assist','source-next','source-prompt','source-surface'][i]})),Object.freeze({owner:maintenanceRunner,kind:'source-maintenance'}),...readBoundedOrganizerApplicationSelectionMembers(boundedOrganizer,store),...apply(assistMembers,promptAssist,[store])]),
  hold:action=>hold('sources',action),fence:coordinator.fenceApplicationSources,
  fenceAction:(action,token)=>{const state=active;if(!state||state.selection?.action!==action||state.token!==token)fail();if(!state.selection&&!current(token,'sources')){invalidateOriginalSelectionHold(state);fail();}return coordinator.fenceApplicationSources(token);},
  currentAction:(action,token)=>{const state=active;if(!state||state.selection?.action!==action||state.token!==token)return false;const valid=current(token,'sources');if(!valid)invalidateOriginalSelectionHold(state);return valid;},
  releaseAction:(action,token)=>{const state=active;if(!state||state.selection?.action!==action||token!==undefined&&state.token!==token)return false;return release(state.token,'sources');}});return coordinator;
}

export function createInjectedApplicationWorkerCoordinationForTest(options){return createWorkerCoordination(options,injectedOrigin);}
export function createApplicationWorkerCoordination(options){return createInjectedApplicationWorkerCoordinationForTest(options);}
export function createOrdinaryApplicationWorkerCoordination(options){return createWorkerCoordination(options,ordinaryOrigin);}
export function createProductionApplicationWorkerCoordination(options){const api=readOriginalBootstrapHost();const owner=createWorkerCoordination(options,productionOrigin);requireOriginalBootstrapHost(api);if(!isProductionApplicationWorkerCoordination(owner,options.store))fail();return owner;}
export function isProductionApplicationWorkerCoordination(owner,store,context=null){try{const r=originalBootstrapWeakGet(originalCoordinators,owner);return !!r&&r.origin===productionOrigin&&r.store===store&&r.current(context);}catch{return false;}}

// Fixed original composition identities only. Not a host/readiness proof and
// never accepted back from a caller by the paid fixed driver.
export function readOriginalProductionWorkerNativeMembers(owner,store){const r=originalBootstrapWeakGet(originalCoordinators,owner);return r&&r.origin===productionOrigin&&r.store===store?r.nativeMembers():null;}
