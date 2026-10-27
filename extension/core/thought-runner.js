import {retainOriginalSelectionHoldWork,originalSelectionHoldBinding,chargeOriginalSelectionHold,trackOriginalSelectionHoldWork,invalidateOriginalSelectionHold,originalSelectionHoldPinned,originalSelectionHoldRemaining} from './local-tool-selection-hold.js';
import {ArchiveError} from './constants.js';
// Only local data-safety maintenance; this is not an Organizer or provider runner.
// Cursor/fence state lives in IDB. A fresh worker or trusted event can resume it.
export class SafetyRunner {
 #selectionHold=null;
 constructor(store,{yieldBatch=()=>new Promise(resolve=>setTimeout(resolve,0))}={}){this.store=store;this.yieldBatch=yieldBatch;this.running=null;this.failed=false;this.requested=false;}
 wake({retry=false}={}){if(this.#selectionHold){this.requested=true;return Promise.resolve({state:'APPLICATION_SELECTION_HELD'});}if(retry)this.failed=false;if(this.running){this.requested=true;return this.running;}if(this.failed)return Promise.resolve();this.requested=false;this.running=this.drain().finally(()=>{this.running=null;if(this.requested&&!this.failed&&!this.#selectionHold)void this.wake();});return this.running;}
 applicationSelectionHolding(){return this.#selectionHold!==null;}
 async holdForApplicationSelection(action=null,kind='source-safety'){
  if(this.#selectionHold)throw new ArchiveError('GENERATION_WORKER_BUSY');
  const selection=originalSelectionHoldBinding(action,this,kind);const token=Object.freeze(Object.create(null));this.#selectionHold={selection,valid:true,token,store:this.store,repository:this.store.repository,database:this.store.repository?.db};
  try{if(this.running)await retainOriginalSelectionHoldWork(this.#selectionHold,this.running);if(!this.applicationSelectionHeld(token))throw new ArchiveError('GENERATION_WORKER_NOT_QUIET');return token;}
  catch(error){invalidateOriginalSelectionHold(this.#selectionHold);this.releaseApplicationSelection(token,action);throw error;}
 }
 applicationSelectionHeld(token){const h=this.#selectionHold;const valid=this.#selectionHold?.token===token&&this.#selectionHold.store===this.store&&this.#selectionHold.repository===this.store.repository&&this.#selectionHold.database===this.store.repository?.db&&!this.running&&!this.failed&&(!h.selection||h.valid&&originalSelectionHoldRemaining(h)>0);if(!valid&&h)invalidateOriginalSelectionHold(h);return valid;}
 releaseApplicationSelection(token,action=null){const h=this.#selectionHold;if(!h||h.token!==token&&!(token===undefined&&h.selection?.action===action))return false;if(originalSelectionHoldPinned(h)){invalidateOriginalSelectionHold(h);return false;}chargeOriginalSelectionHold(h,{operation:'release'},1);this.#selectionHold=null;if(this.requested&&!this.failed)void this.wake();return true;}
 async drain(){try{for(;;){const purge=await this.store.processPurgeCleanup({limit:100}),invalidation=await this.store.processInvalidations({limit:100});if(!purge.pending&&!invalidation.pending)break;await this.yieldBatch();}}catch{this.failed=true;/* Persisted cursors and read fences remain authoritative. No raw logging. */}}
}

const originalSafetySelectionMethods=Object.freeze({methods:Object.freeze(Object.getOwnPropertyNames(SafetyRunner.prototype).filter(key=>key!=='constructor').map(key=>Object.freeze([key,SafetyRunner.prototype[key]]))),prototype:SafetyRunner.prototype,hold:SafetyRunner.prototype.holdForApplicationSelection,current:SafetyRunner.prototype.applicationSelectionHeld,fence:SafetyRunner.prototype.fenceApplicationSelection,release:SafetyRunner.prototype.releaseApplicationSelection,source:SafetyRunner.prototype.applicationSelectionSourceIs,members:SafetyRunner.prototype.applicationSelectionMembers,failed:SafetyRunner.prototype.releaseFailedApplicationSelection});
export function readOriginalSafetySelectionMethods(){return originalSafetySelectionMethods;}

// Keep this small inheritance edge in the same definition module: a static
// driver cycle must not evaluate `extends` before the original base exists.
// Local layout/search maintenance only. No Organizer execution or Provider calls.
export class LibraryRunner extends SafetyRunner {
 wake(options={}){if(options.retry&&!this.applicationSelectionHolding())this.store.libraryMaintenanceFailed=false;return super.wake(options);}
 async drain(){try{for(;;){const r=await this.store.processLibraryMaintenance();if(!r.pending)break;await this.yieldBatch();}}catch{this.failed=true;this.store.libraryMaintenanceFailed=true;}}
}

const originalLibrarySelectionMethods=Object.freeze({methods:Object.freeze(Object.getOwnPropertyNames(LibraryRunner.prototype).filter(key=>key!=='constructor').map(key=>Object.freeze([key,LibraryRunner.prototype[key]]))),prototype:LibraryRunner.prototype,hold:LibraryRunner.prototype.holdForApplicationSelection,current:LibraryRunner.prototype.applicationSelectionHeld,fence:LibraryRunner.prototype.fenceApplicationSelection,release:LibraryRunner.prototype.releaseApplicationSelection,source:LibraryRunner.prototype.applicationSelectionSourceIs,members:LibraryRunner.prototype.applicationSelectionMembers,failed:LibraryRunner.prototype.releaseFailedApplicationSelection});
export function readOriginalLibrarySelectionMethods(){return originalLibrarySelectionMethods;}
