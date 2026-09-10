// Resumable local queue. Each batch yields; no alarms, network or page-body diagnostics.
export class FilterRunner {
 constructor(store,{changed=()=>{},yieldBatch=()=>new Promise(resolve=>setTimeout(resolve,0))}={}){this.store=store;this.changed=changed;this.yieldBatch=yieldBatch;this.running=null;this.failed=false;this.requested=false;}
 wake({retry=false}={}){
  if(retry)this.failed=false;if(this.running){this.requested=true;return this.running;}if(this.failed)return Promise.resolve();
  this.requested=false;this.running=this.drain().finally(()=>{this.running=null;if(this.requested&&!this.failed)void this.wake();});return this.running;
 }
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
