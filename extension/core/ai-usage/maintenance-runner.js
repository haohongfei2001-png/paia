import {createConfiguredMaintenanceSession} from './configured-maintenance-session.js';
import {LocalMaintenanceSession} from './local-maintenance-session.js';
import {fail} from './contracts.js';
import {consumeCommittedSemanticWrite} from '../idb-repository.js';
const runners=new WeakMap(),available=LocalMaintenanceSession.prototype.available;
// Source assembly only. Reading this capability never wakes Maintenance, scans
// a body, installs configuration or grants permission to a proposal.
export function readMaintenanceRunnerSession(runner,store){
 const r=runners.get(runner);if(!r||r.store!==store||r.disposed)fail('UNAVAILABLE');
 if(!r.repository||available.call(r.session)!==true)return null;
 if(store.repository!==r.repository||r.repository.db!==r.database)fail('STALE_BASE');
 return r.session;
}
// Startup/resume or a genuine original semantic write is one coalesced
// opportunity, never a bank of missed windows.
// No alarm, client-clock cadence or automatic provider repair is installed.
// Every actual request still crosses the original signed server cadence gate.
export function createMaintenanceRunner(store,configuration){
 const session=createConfiguredMaintenanceSession(store,configuration);let active=null,disposed=false,cooldown=null,last=null;
 // Default-null assembly remains entirely store-free. A qualified runner holds
 // its original repository identity; later replacement cannot refresh it.
 const repository=available.call(session)===true?store.repository:null,record={store,session,repository,database:repository?.db,disposed:false};
 const runner=Object.freeze({
  // Pure, body-free observation. Never wake a job or scan pending content just
  // to paint Context availability. An unobserved backlog remains unknown.
  status(){return {available:!disposed&&session.available()===true,running:!!active,state:disposed?'UNAVAILABLE':active?'RUNNING':last?.state??'UNOBSERVED',remainingWork:typeof last?.remainingWork==='boolean'?last.remainingWork:null,nextEligibilityAt:cooldown&&performance.now()<cooldown.until?cooldown.result.nextEligibilityAt:null};},
  // Only the exact successful original result can consume its transaction's
  // eligible-delta observation. Default-null performs no repository work.
  consumeSemanticWrite(result){return !disposed&&session.available()&&consumeCommittedSemanticWrite(store.repository,result);},
  wake(){if(disposed||!session.available())return Promise.resolve({state:'UNAVAILABLE',financialAuthority:false,dispatchAllowed:false});if(active)return active;if(cooldown&&performance.now()<cooldown.until)return Promise.resolve(cooldown.result);const task=session.opportunity().catch(error=>({state:['OUTCOME_UNKNOWN','REQUEST_ALREADY_IN_FLIGHT','STALE_BASE','BUDGET_EXCEEDED'].includes(error?.code)?error.code:'UNAVAILABLE',financialAuthority:false,dispatchAllowed:false})).then(result=>{last={state:result.state,remainingWork:typeof result.remainingWork==='boolean'?result.remainingWork:null};if(Number.isSafeInteger(result.nextEligibilityAt)&&Number.isSafeInteger(result.observedAt)&&result.nextEligibilityAt>result.observedAt)cooldown={until:performance.now()+result.nextEligibilityAt-result.observedAt,result:{state:'MAINTENANCE_CADENCE',nextEligibilityAt:result.nextEligibilityAt,observedAt:result.observedAt,financialAuthority:false,dispatchAllowed:false}};return result;});active=task;task.finally(()=>{if(active===task)active=null;}).catch(()=>{});return task;},
  dispose(){disposed=true;record.disposed=true;session.dispose();}
 });
 runners.set(runner,record);return runner;
}
