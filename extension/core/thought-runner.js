import {ArchiveError} from './constants.js';
// Only local data-safety maintenance; this is not an Organizer or provider runner.
// Cursor/fence state lives in IDB. A fresh worker or trusted event can resume it.
export class SafetyRunner {
 #selectionHold=null;
 constructor(store,{yieldBatch=()=>new Promise(resolve=>setTimeout(resolve,0))}={}){this.store=store;this.yieldBatch=yieldBatch;this.running=null;this.failed=false;this.requested=false;}
 wake({retry=false}={}){if(this.#selectionHold){this.requested=true;return Promise.resolve({state:'APPLICATION_SELECTION_HELD'});}if(retry)this.failed=false;if(this.running){this.requested=true;return this.running;}if(this.failed)return Promise.resolve();this.requested=false;this.running=this.drain().finally(()=>{this.running=null;if(this.requested&&!this.failed&&!this.#selectionHold)void this.wake();});return this.running;}
 applicationSelectionHolding(){return this.#selectionHold!==null;}
 async holdForApplicationSelection(){
  if(this.#selectionHold)throw new ArchiveError('GENERATION_WORKER_BUSY');
  const token=Object.freeze(Object.create(null));this.#selectionHold={token,store:this.store,repository:this.store.repository,database:this.store.repository?.db};
  try{if(this.running)await this.running;if(!this.applicationSelectionHeld(token))throw new ArchiveError('GENERATION_WORKER_NOT_QUIET');return token;}
  catch(error){this.releaseApplicationSelection(token);throw error;}
 }
 applicationSelectionHeld(token){return this.#selectionHold?.token===token&&this.#selectionHold.store===this.store&&this.#selectionHold.repository===this.store.repository&&this.#selectionHold.database===this.store.repository?.db&&!this.running&&!this.failed;}
 releaseApplicationSelection(token){if(this.#selectionHold?.token!==token)return false;this.#selectionHold=null;if(this.requested&&!this.failed)void this.wake();return true;}
 async drain(){try{for(;;){const purge=await this.store.processPurgeCleanup({limit:100}),invalidation=await this.store.processInvalidations({limit:100});if(!purge.pending&&!invalidation.pending)break;await this.yieldBatch();}}catch{this.failed=true;/* Persisted cursors and read fences remain authoritative. No raw logging. */}}
}
