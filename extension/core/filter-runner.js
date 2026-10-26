import {retainOriginalSelectionHoldWork,originalSelectionHoldBinding,chargeOriginalSelectionHold,trackOriginalSelectionHoldWork,invalidateOriginalSelectionHold,originalSelectionHoldPinned,originalSelectionHoldRemaining} from './local-tool-selection-hold.js';
import {ArchiveError} from './constants.js';
// Resumable local queue. Each batch yields; no alarms, network or page-body diagnostics.
export class FilterRunner {
 #selectionHold=null;
 constructor(store,{changed=()=>{},yieldBatch=()=>new Promise(resolve=>setTimeout(resolve,0))}={}){this.store=store;this.changed=changed;this.yieldBatch=yieldBatch;this.running=null;this.failed=false;this.requested=false;}
 wake({retry=false}={}){
  if(this.#selectionHold){this.requested=true;return Promise.resolve({state:'APPLICATION_SELECTION_HELD'});}if(retry)this.failed=false;if(this.running){this.requested=true;return this.running;}if(this.failed)return Promise.resolve();
  this.requested=false;this.running=this.drain().finally(()=>{this.running=null;if(this.requested&&!this.failed&&!this.#selectionHold)void this.wake();});return this.running;
 }
 async holdForApplicationSelection(action=null,kind='source-filter'){
  if(this.#selectionHold)throw new ArchiveError('GENERATION_WORKER_BUSY');
  const selection=originalSelectionHoldBinding(action,this,kind);const token=Object.freeze(Object.create(null));this.#selectionHold={selection,valid:true,token,store:this.store,repository:this.store.repository,database:this.store.repository?.db};
  try{if(this.running)await retainOriginalSelectionHoldWork(this.#selectionHold,this.running);if(!this.applicationSelectionHeld(token))throw new ArchiveError('GENERATION_WORKER_NOT_QUIET');return token;}
  catch(error){invalidateOriginalSelectionHold(this.#selectionHold);this.releaseApplicationSelection(token,action);throw error;}
 }
 applicationSelectionHeld(token){const h=this.#selectionHold;const valid=this.#selectionHold?.token===token&&this.#selectionHold.store===this.store&&this.#selectionHold.repository===this.store.repository&&this.#selectionHold.database===this.store.repository?.db&&!this.running&&!this.failed&&(!h.selection||h.valid&&originalSelectionHoldRemaining(h)>0);if(!valid&&h)invalidateOriginalSelectionHold(h);return valid;}
 releaseApplicationSelection(token,action=null){const h=this.#selectionHold;if(!h||h.token!==token&&!(token===undefined&&h.selection?.action===action))return false;if(originalSelectionHoldPinned(h)){invalidateOriginalSelectionHold(h);return false;}chargeOriginalSelectionHold(h,{operation:'release'},1);this.#selectionHold=null;if(this.requested&&!this.failed)void this.wake();return true;}
 async drain(){
  let changed=false;
  try{
   const status=await this.store.filterStatus();if(status.mode==='off')return;if(!status.pending){if(status.taskState==='running')await this.store.setFilterTask('idle');return;}
   await this.store.setFilterTask('running');
   for(;;){const result=await this.store.evaluateFilters({limit:50});if(!result.processed)break;changed=true;await this.yieldBatch();}
   await this.store.setFilterTask('idle');
  }catch{this.failed=true;try{await this.store.setFilterTask('failed');}catch{/* No raw error or content logging. Pending work remains recoverable. */}}
  finally{if(changed)this.changed();}
 }
}

const originalFilterSelectionMethods=Object.freeze({methods:Object.freeze(Object.getOwnPropertyNames(FilterRunner.prototype).filter(key=>key!=='constructor').map(key=>Object.freeze([key,FilterRunner.prototype[key]]))),prototype:FilterRunner.prototype,hold:FilterRunner.prototype.holdForApplicationSelection,current:FilterRunner.prototype.applicationSelectionHeld,fence:FilterRunner.prototype.fenceApplicationSelection,release:FilterRunner.prototype.releaseApplicationSelection,source:FilterRunner.prototype.applicationSelectionSourceIs,members:FilterRunner.prototype.applicationSelectionMembers,failed:FilterRunner.prototype.releaseFailedApplicationSelection});
export function readOriginalFilterSelectionMethods(){return originalFilterSelectionMethods;}
