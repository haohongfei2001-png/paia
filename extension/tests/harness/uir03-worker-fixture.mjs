// Injected into the disposable native worker. Observe and reuse the original
// LibraryRunner/Store; no replacement store, retry, drain, or public RPC exists.
export async function installLibraryFixtureObservation(){
 const {LibraryRunner}=await import(chrome.runtime.getURL('core/library-runner.js'));
 const {prefix}=await import(chrome.runtime.getURL('core/thought-model.js'));
 const trace=globalThis.__uir03Library={owner:null,errors:[],batches:0};
 const wake=LibraryRunner.prototype.wake;
 trace.restoreWake=()=>{LibraryRunner.prototype.wake=wake;};
 LibraryRunner.prototype.wake=function(...args){
  if(!trace.owner){
   trace.owner=this;const store=this.store,run=store.run,process=store.processLibraryMaintenance;
   store.run=function(callback){let entered=false;return run.call(this,()=>{entered=true;return callback();}).catch(error=>{
    trace.errors.push({code:/^[A-Z][A-Z0-9_]{0,63}$/.test(error?.code)?error.code:'OTHER',entered});if(trace.errors.length>64)trace.errors.shift();throw error;
   });};
   store.processLibraryMaintenance=async function(...args){trace.batches++;return process.apply(this,args);};
   trace.restore=()=>{trace.restoreWake();store.run=run;store.processLibraryMaintenance=process;};
  }else if(trace.owner!==this)throw Error('Synthetic fixture observed a second Library owner');
  return wake.apply(this,args);
 };
 trace.read=async()=>{
  const owner=trace.owner;if(!owner)return {observed:false};
  const index=await owner.store.repository.transaction(false,async t=>{
   const rebuild=await t.get('meta','library-search-rebuild');
   return {rebuild:rebuild?{phase:rebuild.phase,complete:rebuild.complete===true,hasCursor:!!rebuild.cursor}:null,searchPending:await t.count('libraryMigrationItems','byStatus',prefix([0,'search'])),countPending:await t.count('libraryMigrationItems','byStatus',prefix([0,'count']))};
  },['meta','libraryMigrationItems']);
  return {observed:true,failed:owner.failed===true,running:!!owner.running,requested:owner.requested===true,libraryMaintenanceFailed:owner.store.libraryMaintenanceFailed===true,batches:trace.batches,errors:trace.errors.slice(),index};
 };
}

// Failure evidence must never replace or indefinitely postpone the original
// assertion. This bound affects diagnostics only, not the tested operation.
export async function failWithBoundedEvidence(error,{read,persist,report,fallback,timeoutMs=1000}){
 let active=true,timer;
 const reportSafe=value=>{if(active)try{report(value);}catch{}};
 const work=Promise.resolve().then(read).then(async value=>{if(!active)return;await persist(value);reportSafe(value);}).catch(()=>reportSafe(fallback));
 try{await Promise.race([work,new Promise(resolve=>{timer=setTimeout(()=>{reportSafe(fallback);resolve();},timeoutMs);})]);}
 finally{active=false;clearTimeout(timer);}
 throw error;
}
