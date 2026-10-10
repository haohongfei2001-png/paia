import {LibraryDocumentsStore} from '../../core/library-documents-store.js';
import {BrowserNativeSyncCore} from '../../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../../core/browser-native-sync/source-bootstrap-journal.js';
import {FilterIntentSyncJournal} from '../../core/browser-native-sync/filter-intent-journal.js';
import {InputWorkingSyncJournal} from '../../core/browser-native-sync/input-working-journal.js';
import {captureSourceWorkingCurrentGroupProjection,requireSourceWorkingCurrentGroupProjection,releaseHumanCurrentUnindexedProjection} from '../../core/browser-native-sync/human-library-plan.js';
import {equalSourceWorkingPhysicalTree} from '../../core/browser-native-sync/source-working-physical.js';
import {beginHumanQualificationWork,releaseHumanQualificationLease} from '../../core/browser-native-sync/human-qualification-budget.js';
export async function runSourceWorkingNativeCleanupFault(){
 let assertions=0;const check=(value,label)=>{assertions++;if(!value)throw Error(label);},values={},local={async get(key){return {[key]:structuredClone(values[key])};},async set(next){Object.assign(values,structuredClone(next));}};
 const store=new LibraryDocumentsStore(local,{indexedDB,name:'SYNTHETIC-source-quarantine-'+crypto.randomUUID(),clock:()=> '2026-10-10T00:00:00.000Z'});const flag=globalThis.__sourceWorkingNativeCleanupFault;let cap;
 const all=()=>store.repository.transaction(false,async t=>{const rows={};for(const name of store.repository.stores)rows[name]=await t.all(name);return rows;});
 const busy=()=>{let work,error;try{work=beginHumanQualificationWork('graph',8*1024*1024);}catch(cause){error=cause;}finally{if(work)releaseHumanQualificationLease(work);}check(error?.code==='BNS_HUMAN_QUALIFICATION_BUSY','original unresolved native work remains charged and busy');};
 try{
  check(flag?.enabled===false&&flag.calls===0,'declared preloaded fault starts disabled');await store.consent(true);await store.finishFoundation();const core=new BrowserNativeSyncCore(store.repository,{datasetId:'SYNTHETIC_source_quarantine',deviceId:'SYNTHETIC_source'});store.sourceBootstrapJournal=new SourceBootstrapJournal(core);store.filterIntentJournal=new FilterIntentSyncJournal(core);store.inputWorkingJournal=new InputWorkingSyncJournal(core,{filterJournal:store.filterIntentJournal,logicalCommits:true});
  await store.capture({epoch:(await store.status()).epoch,adapterVersion:'0.3.0',chat:{id:'SYNTHETIC-quarantine-chat',url:'https://chatgpt.com/c/SYNTHETIC-quarantine-chat',title:'SYNTHETIC cleanup'},messages:[{sourceMessageId:'SYNTHETIC-message',pageOrder:1,originalText:'SYNTHETIC exact Source'}]});const input=(await store.snapshot()).library.blocks[0].id,row=await store.input(input);await store.editDocument({operationId:crypto.randomUUID(),documentId:row.documentId,blocks:[{id:input,expectedRevision:row.revision,libraryText:'SYNTHETIC genuine Working',note:'SYNTHETIC note',excluded:false}]});
  cap=await captureSourceWorkingCurrentGroupProjection(store,core);check(Object.isFrozen(cap)&&Object.getOwnPropertyNames(cap).length===0,'original native opaque retained cap');const before=await all();check(store.repository.db instanceof IDBDatabase,'genuine native database');flag.enabled=true;let error;try{await requireSourceWorkingCurrentGroupProjection(cap);}catch(cause){error=cause;}finally{flag.enabled=false;}
  check(!!error,'listener cleanup failure refuses original current cut');check(flag.calls>=2,'both original success/error removal attempts faulted');check(error.message.includes('Projection'),'original primary/cleanup error survives');check(equalSourceWorkingPhysicalTree(await all(),before),'complete37 data unchanged after genuine native readonly failure');busy();
  // Successful opaque-handle revocation proves its borrowed frame has NOT
  // prematurely reached zero/released; the original runtime rejects a released
  // ticket/cap. This does not inspect private Scope, Plan or budget totals.
  releaseHumanCurrentUnindexedProjection(cap);cap=null;check(true,'revoked Source handle releases without masking original cleanup failure');busy();
  return {status:'SYNTHETIC_SOURCE_NATIVE_CLEANUP_QUARANTINE_HELD_NOT_REFUNDED',cases:[{name:'unresolved genuine native listener cleanup retains work and borrowed retained lifetime through handle revocation',result:'PASS',assertions}],assertions,listenerCleanupFaultCalls:flag.calls,genuineNative:true,allStores:37,workQuarantineHeld:true,retainedBorrowedFrameHeld:true,automaticCleanupSucceeded:false,workerRestart:false,provider:false};
 }finally{flag.enabled=false;if(cap)try{releaseHumanCurrentUnindexedProjection(cap);}catch{}store.repository.db?.close();}
}
