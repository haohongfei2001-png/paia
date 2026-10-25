import {ArchiveError} from '../core/constants.js';
import {SafetyRunner} from '../core/thought-runner.js';
import {LibraryRunner} from '../core/library-runner.js';
import {FilterRunner} from '../core/filter-runner.js';
import {ContextConnections} from './context-connections.js';
import {AssistPromptCommands} from './prompt-assist.js';
import {NextPromptCommands} from './prompt-next.js';
import {PromptReuseCommands} from './prompt-reuse-commands.js';
import {PromptSurfaceCommands} from './prompt-surface.js';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {holdMaintenanceForApplicationSelection,maintenanceHeldForApplicationSelection,releaseMaintenanceForApplicationSelection} from '../core/ai-usage/maintenance-runner.js';
const fail=()=>{throw new ArchiveError('GENERATION_WORKER_NOT_QUIET');};
const apply=Reflect.apply,clock=performance.now.bind(performance),Timer=setTimeout,clearTimer=clearTimeout;
const DEADLINE_MS=30000;
const checkTime=state=>{if(clock()>=state.deadline)fail();};
async function waitOriginalOwner(state,pending){
 checkTime(state);let timer;
 try{const result=await Promise.race([pending,new Promise((_,reject)=>{timer=Timer(()=>reject(new ArchiveError('GENERATION_WORKER_NOT_QUIET')),Math.max(0,state.deadline-clock()));})]);checkTime(state);return result;}
 finally{clearTimer(timer);}
}
const exact=(owner,prototype)=>!!owner&&Object.getPrototypeOf(owner)===prototype;
// Capture original methods, not instance callbacks or a later prototype edit.
const methods=prototype=>Object.freeze({hold:prototype.holdForApplicationSelection,current:prototype.applicationSelectionHeld,fence:prototype.fenceApplicationSelection,release:prototype.releaseApplicationSelection,source:prototype.applicationSelectionSourceIs});
const safetyMethods=methods(SafetyRunner.prototype),filterMethods=methods(FilterRunner.prototype),contextMethods=methods(ContextConnections.prototype),assistMethods=methods(AssistPromptCommands.prototype),nextMethods=methods(NextPromptCommands.prototype),promptMethods=methods(PromptReuseCommands.prototype),surfaceMethods=methods(PromptSurfaceCommands.prototype);
const bound=(owner,prototype,operations)=>({owner,prototype,...operations});
// Fixed original source owners only. This composes their live task evidence,
// not cold insertion/host freeze proof, editor safety or activation authority.
// PREPARE must remain read-only and must not consume these invalidating holds.
export function createApplicationWorkerCoordination({store,safety,libraryRunner,filterRunner,maintenanceRunner,contextConnections,promptAssist,promptNext,promptCommands,promptSurface}){
 const local=[bound(safety,SafetyRunner.prototype,safetyMethods),bound(libraryRunner,LibraryRunner.prototype,safetyMethods),bound(filterRunner,FilterRunner.prototype,filterMethods)];
 if(!store||local.some(({owner,prototype})=>!exact(owner,prototype)||owner.store!==store))fail();
 const repository=store.repository,database=repository?.db,databaseId=store.databaseId;
 const sources=[bound(contextConnections,ContextConnections.prototype,contextMethods),bound(promptAssist,AssistPromptCommands.prototype,assistMethods),bound(promptNext,NextPromptCommands.prototype,nextMethods),bound(promptCommands,PromptReuseCommands.prototype,promptMethods),bound(promptSurface,PromptSurfaceCommands.prototype,surfaceMethods)];
 const service=promptCommands?.service,session=promptAssist?.session;
 const identities=sources.map(({owner})=>({api:owner?.api,service:owner?.service,surface:owner?.surface}));
 const maintenance={owner:maintenanceRunner,hold:()=>holdMaintenanceForApplicationSelection(maintenanceRunner,store),current:token=>maintenanceHeldForApplicationSelection(maintenanceRunner,store,token),release:token=>releaseMaintenanceForApplicationSelection(maintenanceRunner,store,token)};
 let active=null,closed=false;
 const storeCurrent=()=>!!database&&store.repository===repository&&repository.db===database&&store.databaseId===databaseId;
 const localCurrent=()=>storeCurrent()&&local.every(({owner,prototype})=>exact(owner,prototype)&&owner.store===store);
 const sourcesCurrent=()=>localCurrent()&&sources.every(({owner,prototype,hold,current,fence,release},i)=>exact(owner,prototype)&&[hold,current,fence,release].every(method=>typeof method==='function')&&owner.api===identities[i].api&&owner.service===identities[i].service&&owner.surface===identities[i].surface)&&
  apply(contextMethods.source,contextConnections,[store])===true&&apply(assistMethods.source,promptAssist,[store])===true&&apply(nextMethods.source,promptNext,[store])===true&&
  exact(service,PromptReuseService.prototype)&&promptCommands.service===service&&service.s===store&&promptNext.service===service&&promptAssist.store===store&&promptAssist.session===session&&
  promptSurface.commands===promptCommands&&promptSurface.assist===promptAssist&&promptSurface.next===promptNext&&promptAssist.surface===promptSurface&&promptNext.surface===promptSurface;
 const call=(entry,method,...args)=>apply(entry[method],entry.owner,args);
 // A failed cleanup cannot leave an apparently reusable coordinator. Continue
 // releasing the remaining original receipts even when one owner throws.
 const releaseEntry=entry=>{if(entry.released)return true;entry.released=true;try{return call(entry,'release',entry.token)===true;}catch{return false;}};
 const releaseState=state=>{
  if(active===state)active=null;state.valid=false;state.ready=false;let ok=true;
  for(const entry of [...state.held].reverse())if(!releaseEntry(entry))ok=false;
  if(!ok)closed=true;return ok;
 };
 const release=(token,scope)=>{if(active?.token!==token||active.scope!==scope)return false;if(!releaseState(active))fail();return true;};
 const current=(token,scope)=>{
  const state=active;if(closed||!state||state.token!==token||state.scope!==scope||!state.ready||!state.valid||clock()>=state.deadline)return false;
  try{return (scope==='sources'?sourcesCurrent():localCurrent())&&state.held.length===state.owners.length&&state.held.every(entry=>!entry.released&&call(entry,'current',entry.token)===true);}catch{return false;}
 };
 const hold=async scope=>{
  if(closed||active)fail();
  try{if(!(scope==='sources'?sourcesCurrent():localCurrent()))fail();}catch{fail();}
  const token=Object.freeze(Object.create(null)),state={token,scope,deadline:clock()+DEADLINE_MS,owners:scope==='sources'?[...local,...sources,maintenance]:[...local,maintenance],held:[],ready:false,valid:true};active=state;
  try{
   // Invoke EVERY original admission hold in this turn before awaiting any
   // drain. A synchronous refusal must not strand earlier pending promises.
   const attempts=state.owners.map(owner=>{
    let pending;try{pending=call(owner,'hold');}catch(error){pending=Promise.reject(error);}
    return Promise.resolve(pending).then(value=>{
     const entry={...owner,token:value,released:false};
     if(closed||active!==state||!state.valid){if(!releaseEntry(entry))closed=true;fail();}
     state.held.push(entry);return value;
    }).catch(error=>{releaseState(state);throw error;});
   });
   const results=await waitOriginalOwner(state,Promise.allSettled(attempts)),refused=results.find(result=>result.status==='rejected');
   if(refused)throw refused.reason;state.ready=true;if(!current(token,scope))fail();return token;
  }catch(error){releaseState(state);throw error;}
 };
 return Object.freeze({
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
    for(const entry of state.held){if(typeof entry.fence==='function'){if(await waitOriginalOwner(state,call(entry,'fence',entry.token))!==true)fail();}if(!current(token,'sources'))fail();}
    return true;
   }catch(error){releaseState(state);throw error;}
  },
  releaseApplicationSources:token=>release(token,'sources'),
  close(){closed=true;if(active&&!releaseState(active))fail();}
 });
}
