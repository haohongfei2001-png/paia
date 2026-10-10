import {LibraryDocumentsStore} from '../../core/library-documents-store.js';
import {BrowserNativeSyncCore} from '../../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../../core/browser-native-sync/source-bootstrap-journal.js';
import {FilterIntentSyncJournal} from '../../core/browser-native-sync/filter-intent-journal.js';
import {InputWorkingSyncJournal} from '../../core/browser-native-sync/input-working-journal.js';
import {captureSourceWorkingCurrentGroupProjection,releaseHumanCurrentUnindexedProjection} from '../../core/browser-native-sync/human-library-plan.js';
import {equalSourceWorkingPhysicalTree} from '../../core/browser-native-sync/source-working-physical.js';
import {beginHumanQualificationWork,releaseHumanQualificationLease} from '../../core/browser-native-sync/human-qualification-budget.js';

export async function runSourceWorkingCurrentCaptureNativeCases(){
 let assertions=0;const cases=[],check=(value,label)=>{assertions++;if(!value)throw Error(label);};
 const run=async(name,fn)=>{const before=assertions;try{await fn();cases.push({name,result:'PASS',assertions:assertions-before});}catch(error){cases.push({name,result:'FAIL',assertions:assertions-before,error:{name:error.name,message:error.message,code:error.code,stack:error.stack}});error.nativeCases=cases;throw error;}};
 const values={},local={async get(key){return {[key]:structuredClone(values[key])};},async set(next){Object.assign(values,structuredClone(next));}};
 const store=new LibraryDocumentsStore(local,{indexedDB,name:'SYNTHETIC-source-working-current-'+crypto.randomUUID(),clock:()=> '2026-10-10T00:00:00.000Z'});let cap;
 const all=()=>store.repository.transaction(false,async t=>{const rows={};for(const name of store.repository.stores)rows[name]=await t.all(name);return rows;});
 const pool=()=>{const work=beginHumanQualificationWork('graph',8*1024*1024);releaseHumanQualificationLease(work);check(true,'original whole global pool available after true native drain');};
 try{
  await store.consent(true);await store.finishFoundation();const core=new BrowserNativeSyncCore(store.repository,{datasetId:'SYNTHETIC_source_working_current',deviceId:'SYNTHETIC_source_device'});store.sourceBootstrapJournal=new SourceBootstrapJournal(core);store.filterIntentJournal=new FilterIntentSyncJournal(core);store.inputWorkingJournal=new InputWorkingSyncJournal(core,{filterJournal:store.filterIntentJournal,logicalCommits:true});
  const epoch=(await store.status()).epoch;await store.capture({epoch,adapterVersion:'0.3.0',chat:{id:'SYNTHETIC-source-chat',url:'https://chatgpt.com/c/SYNTHETIC-source-chat',title:'SYNTHETIC source'},messages:[{sourceMessageId:'SYNTHETIC-message',pageOrder:1,originalText:'SYNTHETIC exact Source 中文🙂'}]});
  const input=(await store.snapshot()).library.blocks[0].id;
  for(const note of ['SYNTHETIC first edit','SYNTHETIC second edit']){const row=await store.input(input);await store.editDocument({operationId:crypto.randomUUID(),documentId:row.documentId,blocks:[{id:input,expectedRevision:row.revision,libraryText:'SYNTHETIC exact Working 中文🙂',note,excluded:false}]});}
  await run('native initial Source and two genuine Working groups mint only an empty original capture cap',async()=>{
   const before=await all();check(Object.keys(before).length===37,'all original37 stores');check(store.repository.db instanceof IDBDatabase,'genuine native database');check(store.humanLibraryJournal===null,'no fabricated Human journal');check(Object.hasOwn(before.recordIndex[0],'legacyChat')&&before.recordIndex[0].legacyChat===undefined,'own undefined native Source index');check(Object.is(before.documents[0].displayKey[0],-0),'native document signed zero');
   cap=await captureSourceWorkingCurrentGroupProjection(store,core);check(Object.isFrozen(cap)&&Object.getOwnPropertyNames(cap).length===0,'empty immutable original cap');let copied=false;try{releaseHumanCurrentUnindexedProjection({...cap});}catch{copied=true;}check(copied,'copied DTO cannot release original cap');releaseHumanCurrentUnindexedProjection(cap);cap=null;
   check(equalSourceWorkingPhysicalTree(await all(),before),'all37 exact physical values unchanged');pool();
  });
  await run('original capture and family preparation never consult supplied Core public reader or preparation getters',async()=>{
   const names=['rows','get','bind','transaction','prepareWorkingReceive','prepareSourceBootstrapReceive','prepareCurrentSourceWorkingReceive'],descriptors=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(core,name)]));let reads=0;
   for(const name of names)Object.defineProperty(core,name,{configurable:true,get(){reads++;throw Error('SYNTHETIC supplied Core '+name);}});
   try{cap=await captureSourceWorkingCurrentGroupProjection(store,core);check(reads===0,'all supplied public getter calls zero');releaseHumanCurrentUnindexedProjection(cap);cap=null;}finally{for(const [name,d]of descriptors)if(d)Object.defineProperty(core,name,d);else delete core[name];}pool();
  });
  await run('unknown physical local metadata refuses before any capture cap and preserves all37 stores',async()=>{
   await store.repository.transaction(true,t=>t.put('meta',{id:'SYNTHETIC-unknown-source-meta',value:'SYNTHETIC unsupported'}));const before=await all();let error;
   try{cap=await captureSourceWorkingCurrentGroupProjection(store,core);}catch(cause){error=cause;}check(error?.code==='BNS_GROUP_CANONICAL_UNREPRESENTED','unknown exact metadata refusal');check(!cap,'no cap on refusal');check(equalSourceWorkingPhysicalTree(await all(),before),'all37 physical values unchanged after refusal');pool();
  });
  return {status:'SYNTHETIC_SOURCE_WORKING_NATIVE_CAPTURE_ONLY_NOT_EXPORT_OR_RECOVERY',cases,assertions,nativeCapture:true,sourceGroups:1,workingGroups:2,humanJournalAbsent:true,export:false,restore:false,workerRestart:false,provider:false,fullCanonicalReady:false};
 }finally{if(cap)releaseHumanCurrentUnindexedProjection(cap);store.repository.db?.close();}
}
