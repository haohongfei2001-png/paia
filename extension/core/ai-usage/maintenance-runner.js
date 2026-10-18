import {createConfiguredMaintenanceSession} from './configured-maintenance-session.js';
import {consumeCommittedSemanticWrite} from '../idb-repository.js';
// Startup/resume or a genuine original semantic write is one coalesced
// opportunity, never a bank of missed windows.
// No alarm, client-clock cadence or automatic provider repair is installed.
// Every actual request still crosses the original signed server cadence gate.
export function createMaintenanceRunner(store,configuration){
 const session=createConfiguredMaintenanceSession(store,configuration);let active=null,disposed=false,cooldown=null;
 return Object.freeze({
  // Only the exact successful original result can consume its transaction's
  // eligible-delta observation. Default-null performs no repository work.
  consumeSemanticWrite(result){return !disposed&&session.available()&&consumeCommittedSemanticWrite(store.repository,result);},
  wake(){if(disposed||!session.available())return Promise.resolve({state:'UNAVAILABLE',financialAuthority:false,dispatchAllowed:false});if(active)return active;if(cooldown&&performance.now()<cooldown.until)return Promise.resolve(cooldown.result);const task=session.opportunity().catch(error=>({state:['OUTCOME_UNKNOWN','REQUEST_ALREADY_IN_FLIGHT','STALE_BASE','BUDGET_EXCEEDED'].includes(error?.code)?error.code:'UNAVAILABLE',financialAuthority:false,dispatchAllowed:false})).then(result=>{if(Number.isSafeInteger(result.nextEligibilityAt)&&Number.isSafeInteger(result.observedAt)&&result.nextEligibilityAt>result.observedAt)cooldown={until:performance.now()+result.nextEligibilityAt-result.observedAt,result:{state:'MAINTENANCE_CADENCE',nextEligibilityAt:result.nextEligibilityAt,observedAt:result.observedAt,financialAuthority:false,dispatchAllowed:false}};return result;});active=task;task.finally(()=>{if(active===task)active=null;}).catch(()=>{});return task;},
  dispose(){disposed=true;session.dispose();}
 });
}
