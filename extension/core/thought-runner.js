// Only local data-safety maintenance; this is not an Organizer or provider runner.
// Cursor/fence state lives in IDB. A fresh worker or trusted event can resume it.
export class SafetyRunner {
 constructor(store,{yieldBatch=()=>new Promise(resolve=>setTimeout(resolve,0))}={}){this.store=store;this.yieldBatch=yieldBatch;this.running=null;this.failed=false;this.requested=false;}
 wake({retry=false}={}){if(retry)this.failed=false;if(this.running){this.requested=true;return this.running;}if(this.failed)return Promise.resolve();this.requested=false;this.running=this.drain().finally(()=>{this.running=null;if(this.requested&&!this.failed)void this.wake();});return this.running;}
 async drain(){try{for(;;){const purge=await this.store.processPurgeCleanup({limit:100}),invalidation=await this.store.processInvalidations({limit:100});if(!purge.pending&&!invalidation.pending)break;await this.yieldBatch();}}catch{this.failed=true;/* Persisted cursors and read fences remain authoritative. No raw logging. */}}
}
