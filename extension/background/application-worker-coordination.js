import {ArchiveError} from '../core/constants.js';
import {SafetyRunner} from '../core/thought-runner.js';
import {LibraryRunner} from '../core/library-runner.js';
import {FilterRunner} from '../core/filter-runner.js';
import {holdMaintenanceForApplicationSelection,maintenanceHeldForApplicationSelection,releaseMaintenanceForApplicationSelection} from '../core/ai-usage/maintenance-runner.js';
const fail=()=>{throw new ArchiveError('GENERATION_WORKER_NOT_QUIET');};
// Fixed original owners only. This receipt proves just the local maintenance
// lanes below; it is deliberately not an application-selection authority.
export function createApplicationWorkerCoordination({store,safety,libraryRunner,filterRunner,maintenanceRunner}){
 if(Object.getPrototypeOf(safety)!==SafetyRunner.prototype||Object.getPrototypeOf(libraryRunner)!==LibraryRunner.prototype||Object.getPrototypeOf(filterRunner)!==FilterRunner.prototype||[safety,libraryRunner,filterRunner].some(r=>r.store!==store))fail();
 const owners=[[safety,SafetyRunner.prototype],[libraryRunner,SafetyRunner.prototype],[filterRunner,FilterRunner.prototype]];let active=null,closed=false;
 const release=token=>{if(active?.token!==token)return false;const state=active;active=null;for(const [r,p,t]of state.held)p.releaseApplicationSelection.call(r,t);if(state.maintenance)releaseMaintenanceForApplicationSelection(maintenanceRunner,store,state.maintenance);return true;};
 const current=token=>!closed&&active?.token===token&&active.ready&&owners.every(([r,p],i)=>r.store===store&&p.applicationSelectionHeld.call(r,active.held[i]?.[2]))&&maintenanceHeldForApplicationSelection(maintenanceRunner,store,active.maintenance);
 return Object.freeze({
  async holdLocalMaintenance(){
   if(closed||active)fail();const token=Object.freeze(Object.create(null)),state={token,held:[],maintenance:null,ready:false};active=state;
   try{
    // Start all intake holds synchronously before awaiting any draining owner.
    const attempts=owners.map(([r,p])=>p.holdForApplicationSelection.call(r).then(t=>{if(closed||active!==state){p.releaseApplicationSelection.call(r,t);fail();}state.held.push([r,p,t]);return t;}));
    const results=await Promise.allSettled(attempts);if(results.some(r=>r.status!=='fulfilled'))fail();
    state.held=owners.map(([r,p],i)=>[r,p,results[i].value]);
    state.maintenance=await holdMaintenanceForApplicationSelection(maintenanceRunner,store);if(closed||active!==state){releaseMaintenanceForApplicationSelection(maintenanceRunner,store,state.maintenance);fail();}state.ready=true;
    if(!current(token))fail();return token;
   }catch(error){release(token);throw error;}
  },
  assertLocalMaintenanceHeld(token){if(!current(token))fail();return true;},
  releaseLocalMaintenance:release,
  close(){closed=true;if(active)release(active.token);}
 });
}
