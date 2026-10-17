// Loading the archive page does not certify Playwright's MV3 worker target.
// One ordinary status request wakes the registered worker; the original bounded
// eventual helper then observes that exact target. No Store or worker is created.
export async function awakeLibraryFixtureWorker({context,extensionId,wake,eventually}){
 const url=`chrome-extension://${extensionId}/background/service-worker.js`;
 let worker,awake=false,failure;
 // The same existing deadline bounds a missing status response and the target
 // publication. Late settlement cannot start another request or install traces.
 Promise.resolve().then(wake).then(()=>{awake=true;},error=>{failure={error};});
 await eventually(()=>{
  if(failure)throw failure.error;
  if(!awake)return false;
  const matches=context.serviceWorkers().filter(candidate=>candidate.url()===url);
  if(matches.length>1)throw Error('Ambiguous original native worker');
  worker=matches[0];return !!worker;
 },'the original native worker is running');
 return worker;
}

// Injected into the disposable native worker. Observe and reuse the original
// LibraryRunner/Store; no replacement store, retry, drain, or public RPC exists.
export function installLibraryFixtureObservation(){
 const {store,library:owner,prefix}=globalThis.__uir03Worker||{};
 if(!store||owner?.store!==store||typeof prefix!=='function')throw Error('Original static worker fixture references required');
 const trace=globalThis.__uir03Library={owner,errors:[],batches:0};
 const run=store.run,process=store.processLibraryMaintenance;
 store.run=function(callback){let entered=false;return run.call(this,()=>{entered=true;return callback();}).catch(error=>{
  trace.errors.push({code:/^[A-Z][A-Z0-9_]{0,63}$/.test(error?.code)?error.code:'OTHER',entered});if(trace.errors.length>64)trace.errors.shift();throw error;
 });};
 store.processLibraryMaintenance=async function(...args){trace.batches++;return process.apply(this,args);};
 trace.restore=()=>{store.run=run;store.processLibraryMaintenance=process;};
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
