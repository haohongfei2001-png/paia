import {SafetyRunner} from './thought-runner.js';
// Local layout/search maintenance only. No Organizer execution or Provider calls.
export class LibraryRunner extends SafetyRunner {
 wake(options={}){if(options.retry)this.store.libraryMaintenanceFailed=false;return super.wake(options);}
 async drain(){try{for(;;){const r=await this.store.processLibraryMaintenance();if(!r.pending)break;await this.yieldBatch();}}catch{this.failed=true;this.store.libraryMaintenanceFailed=true;}}
}
