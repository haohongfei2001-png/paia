import {originalSelectionHoldBinding,chargeOriginalSelectionHold,trackOriginalSelectionHoldWork,invalidateOriginalSelectionHold,originalSelectionHoldPinned,originalSelectionHoldRemaining} from '../local-tool-selection-hold.js';
import {createConfiguredMaintenanceSession} from './configured-maintenance-session.js';
import {readLocalMaintenanceSessionAvailability} from './local-maintenance-session.js';
import {fail} from './contracts.js';
import {consumeCommittedSemanticWrite} from '../idb-repository.js';
const runners=new WeakMap();
// Source assembly only. Reading this capability never wakes Maintenance, scans
// a body, installs configuration or grants permission to a proposal.
export function readMaintenanceRunnerSession(runner,store){
 const r=runners.get(runner);if(!r||r.store!==store||r.disposed)fail('UNAVAILABLE');
 if(!r.repository||readLocalMaintenanceSessionAvailability(r.session)!==true)return null;
 if(store.repository!==r.repository||r.repository.db!==r.database)fail('STALE_BASE');
 return r.session;
}
// Startup/resume or a genuine original semantic write is one coalesced
// opportunity, never a bank of missed windows.
// No alarm, client-clock cadence or automatic provider repair is installed.
// Every actual request still crosses the original signed server cadence gate.
export function createMaintenanceRunner(store,configuration){
 const session=createConfiguredMaintenanceSession(store,configuration);let active=null,disposed=false,cooldown=null,last=null,selectionHold=null,requested=false;
 // Default-null assembly remains entirely store-free. A qualified runner holds
 // its original repository identity; later replacement cannot refresh it.
 const repository=readLocalMaintenanceSessionAvailability(session)===true?store.repository:null,record={store,session,repository,database:repository?.db,disposed:false,hold:null,current:null,release:null};
 const runner=Object.freeze({
  // Pure, body-free observation. Never wake a job or scan pending content just
  // to paint Context availability. An unobserved backlog remains unknown.
  status(){return {available:!disposed&&session.available()===true,running:!!active,state:disposed?'UNAVAILABLE':active?'RUNNING':last?.state??'UNOBSERVED',remainingWork:typeof last?.remainingWork==='boolean'?last.remainingWork:null,nextEligibilityAt:cooldown&&performance.now()<cooldown.until?cooldown.result.nextEligibilityAt:null};},
  // Only the exact successful original result can consume its transaction's
  // eligible-delta observation. Default-null performs no repository work.
  consumeSemanticWrite(result){return !disposed&&session.available()&&consumeCommittedSemanticWrite(store.repository,result);},
  wake(){if(selectionHold){requested=true;return Promise.resolve({state:'APPLICATION_SELECTION_HELD',financialAuthority:false,dispatchAllowed:false});}if(disposed||!session.available())return Promise.resolve({state:'UNAVAILABLE',financialAuthority:false,dispatchAllowed:false});if(active)return active;if(cooldown&&performance.now()<cooldown.until)return Promise.resolve(cooldown.result);const task=session.opportunity().catch(error=>({state:['OUTCOME_UNKNOWN','REQUEST_ALREADY_IN_FLIGHT','STALE_BASE','BUDGET_EXCEEDED'].includes(error?.code)?error.code:'UNAVAILABLE',financialAuthority:false,dispatchAllowed:false})).then(result=>{last={state:result.state,remainingWork:typeof result.remainingWork==='boolean'?result.remainingWork:null};if(Number.isSafeInteger(result.nextEligibilityAt)&&Number.isSafeInteger(result.observedAt)&&result.nextEligibilityAt>result.observedAt)cooldown={until:performance.now()+result.nextEligibilityAt-result.observedAt,result:{state:'MAINTENANCE_CADENCE',nextEligibilityAt:result.nextEligibilityAt,observedAt:result.observedAt,financialAuthority:false,dispatchAllowed:false}};return result;});active=task;task.finally(()=>{if(active===task)active=null;}).catch(()=>{});return task;},
  dispose(){invalidateOriginalSelectionHold(selectionHold);disposed=true;record.disposed=true;session.dispose();}
 });
 // A configured remote session has no source-owned suspend/unknown receipt yet.
 // Do not infer its quiescence from active=null, including a cold worker.
 record.current=token=>!!selectionHold&&selectionHold.token===token&&!disposed&&!active&&repository===null&&(!selectionHold.selection||selectionHold.valid&&originalSelectionHoldRemaining(selectionHold)>0);
 record.hold=async(action=null)=>{if(selectionHold)fail('GENERATION_WORKER_BUSY');if(repository!==null||disposed)fail('GENERATION_WORKER_NOT_QUIET');const token=Object.freeze(Object.create(null));selectionHold={token,valid:true,selection:originalSelectionHoldBinding(action,runner,'source-maintenance')};return token;};
 record.release=(token,action=null)=>{if(!selectionHold||selectionHold.token!==token&&!(token===undefined&&selectionHold.selection?.action===action))return false;if(originalSelectionHoldPinned(selectionHold)){invalidateOriginalSelectionHold(selectionHold);return false;}chargeOriginalSelectionHold(selectionHold,{operation:'release'},1);selectionHold=null;const resume=requested;requested=false;if(resume&&!disposed)void runner.wake();return true;};
 runners.set(runner,record);return runner;
}

// Original factory identity is checked through the private runner registry.
export function holdMaintenanceForApplicationSelection(runner,store,action=null){const r=runners.get(runner);if(!r||r.store!==store||r.disposed)fail('GENERATION_WORKER_CAPABILITY');return r.hold(action);}
export function maintenanceHeldForApplicationSelection(runner,store,token){const r=runners.get(runner);return !!r&&r.store===store&&!r.disposed&&r.current(token);}
export function releaseMaintenanceForApplicationSelection(runner,store,token,action=null){const r=runners.get(runner);if(!r||r.store!==store)return false;return r.release(token,action);}
