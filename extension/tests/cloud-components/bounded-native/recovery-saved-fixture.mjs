// PREPARATION ONLY. Same four original component bodies, served separately from verified Source/Release roots.
// Every canonical operation, checkpoint, restore, work ticket and search uses its original owner.
import {LibraryDocumentsStore} from '../../../core/library-documents-store.js';
import {BrowserNativeSyncCore} from '../../../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../../../core/browser-native-sync/source-bootstrap-journal.js';
import {InputWorkingSyncJournal} from '../../../core/browser-native-sync/input-working-journal.js';
import {FilterIntentSyncJournal} from '../../../core/browser-native-sync/filter-intent-journal.js';
import {buildCheckpoint,StagedSyncRestore} from '../../../core/browser-native-sync/checkpoints.js';
import {LocalSyncRecoverySession} from '../../../core/browser-native-sync/recovery-session.js';
import {prepareSavedWorkPublication,publishSavedWorkBootstrap} from '../../../core/browser-native-sync/saved-work-bootstrap.js';
import {planSearchQueueLocator} from '../../../core/library-search.js';
import {createOriginalRecoveryWork,chargeOriginalRecoveryWork,checkOriginalRecoveryWork,withOriginalRecoveryWork,currentOriginalRecoveryWork} from '../../../core/idb-repository.js';

const DATASET='SYNTHETIC_cloud_component_20261024', devices=[], cases=[];
let assertions=0;
function ok(value,message){assertions++;if(!value)throw Error(message);}
function exact(actual,expected,path='value'){
 assertions++;
 if(Object.is(actual,expected))return;
 if(actual===null||expected===null||typeof actual!=='object'||typeof expected!=='object')throw Error('Exact mismatch: '+path);
 if(Array.isArray(actual)!==Array.isArray(expected))throw Error('Array mismatch: '+path);
 const a=Reflect.ownKeys(actual).sort(),b=Reflect.ownKeys(expected).sort();
 if(a.length!==b.length||a.some((key,i)=>key!==b[i]))throw Error('Own-key mismatch: '+path);
 for(const key of a)exact(actual[key],expected[key],path+'.'+String(key));
}
async function rejected(fn,code){try{await fn();}catch(error){ok(error.code===code,'Expected '+code+', got '+error.code+': '+error.message);return {code:error.code,name:error.name,message:error.message};}throw Error('Expected rejection '+code);}
function fails(fn,code){try{fn();}catch(error){ok(error.code===code,'Expected persistent '+code);return;}throw Error('Expected failed work ticket');}
const id=()=>crypto.randomUUID();
const storage=()=>{const data={};return {async get(k){return {[k]:structuredClone(data[k])};},async set(v){Object.assign(data,structuredClone(v));}};};
const capture=epoch=>({epoch,adapterVersion:'0.3.0',chat:{id:'SYNTHETIC_component_chat',url:'https://chatgpt.com/c/SYNTHETIC_component_chat',title:'Synthetic component'},messages:[{sourceMessageId:'SYNTHETIC_component_input',pageOrder:1,originalText:'SYNTHETIC original body 中文 café'}]});
async function device(previous=null){
 const config=previous??{local:storage(),name:'SYNTHETIC_cloud_component_'+id(),deviceId:id()};
 const s=new LibraryDocumentsStore(config.local,{indexedDB:globalThis.indexedDB,name:config.name});
 if(!previous)await s.consent(true);await s.finishFoundation();
 const core=new BrowserNativeSyncCore(s.repository,{datasetId:DATASET,deviceId:config.deviceId});
 const value={s,core,...config};devices.push(value);
 ok(s.repository.factory===globalThis.indexedDB,'Original repository uses browser factory');
 ok(s.repository.db instanceof IDBDatabase,'Original repository owns native database');
 await s.repository.transaction(false,async tx=>{
  ok(tx.tx instanceof IDBTransaction,'Original owner transaction is native');
  exact(Object.getOwnPropertyDescriptor(IDBTransaction.prototype,'db').get.call(tx.tx).name,config.name,'native internal-slot database');
  await tx.get('meta','gate');
 },['meta']);
 return value;
}
async function cold(d){await d.s.repository.close();return device({local:d.local,name:d.name,deviceId:d.deviceId});}
const all=d=>d.s.repository.transaction(false,async tx=>Object.fromEntries(await Promise.all(d.s.repository.stores.map(async table=>[table,await tx.all(table)]))));
const rows=async(core,kind)=>{const list=[];for await(const row of core.rows(kind))list.push(row);return list;};
const state=(d,restoreId)=>new BrowserNativeSyncCore(d.s.repository,{datasetId:DATASET,deviceId:d.deviceId,namespace:restoreId}).read('restore');
function transport(){const objects=new Map();return {objects,async putImmutable(ref,raw){const before=objects.get(ref.id);if(before)exact([...before],[...raw],'immutable bytes');objects.set(ref.id,raw.slice());},async get(ref){return objects.get(ref.id)?.slice();}};}
const session=(d,t,options={})=>new LocalSyncRecoverySession(d.core,{store:d.s,transport:t,...options});
async function maintenance(s){for(let n=0;n<10;n++){const result=await s.processLibraryMaintenance();if(!result.pending)return n+1;}throw Error('Tiny original maintenance failed to settle within ten calls');}
const marker=physical=>physical.meta.find(row=>row.id==='library-search-rebuild');
async function tailFixture(){
 const a=await device(),b=await device(),t=transport();a.s.sourceBootstrapJournal=new SourceBootstrapJournal(a.core);
 await a.s.capture(capture((await a.s.status()).epoch));const first=await buildCheckpoint(a.core,t,{grouped:{store:a.s}});
 a.s.filterIntentJournal=new FilterIntentSyncJournal(a.core);a.s.inputWorkingJournal=new InputWorkingSyncJournal(a.core,{filterJournal:a.s.filterIntentJournal,logicalCommits:true});
 const block=(await a.s.snapshot()).library.blocks[0],input=await a.s.input(block.id);
 await a.s.editDocument({operationId:id(),documentId:input.documentId,blocks:[{id:input.id,expectedRevision:input.revision,libraryText:input.libraryText,note:'SYNTHETIC successor note 中文',excluded:input.excluded}]});
 const last=await buildCheckpoint(a.core,t,{grouped:{store:a.s},parents:[first.ref.id]});
 const expected=await a.s.snapshot(),revisions=await rows(a.core,'revision');await a.s.repository.close();return {a,b,t,first,last,expected,revisions};
}
async function savedFixture(){
 const a=await device(),t=transport();a.s.sourceBootstrapJournal=new SourceBootstrapJournal(a.core);await a.s.capture(capture((await a.s.status()).epoch));
 const input=(await a.s.snapshot()).library.blocks[0],evidence=await a.s.evidenceFor([{inputId:input.id,role:'primary',selectedFields:['body']}]);
 const generator={providerId:'fixture',providerVersion:'1',modelVersion:'deterministic-1',taskSchemaVersion:1,promptTemplateVersion:1,policyVersion:1};
 const entry=await a.s.createEntry({actor:'ai',operationId:id(),body:'SYNTHETIC initial saved body',type:'idea',formation:'explicit',evidence,generator});
 await a.s.editEntry({id:entry.id,expectedRevision:0,operationId:id(),changes:{body:'SYNTHETIC savedsearchneedle human protected body 中文'}});
 const operation=await publishSavedWorkBootstrap(a.s,await prepareSavedWorkPublication(a.s,a.core,entry.id));
 const cut=await buildCheckpoint(a.core,t,{grouped:{store:a.s}}),expected=await all(a);await a.s.repository.close();return {a,t,entry,operation,cut,expected};
}
async function run(id,name,body){const start=performance.now(),before=assertions;const record={id,name,result:'RUNNING'};cases.push(record);try{record.details=await body();record.result='PASS';}catch(error){record.result='FAIL';record.error={name:error.name,message:error.message,code:error.code??null,stack:error.stack};throw error;}finally{record.assertions=assertions-before;record.durationMs=performance.now()-start;}}
const fixedIds=Object.freeze(['RECOVERY_WORK_BUDGET','RECOVERY_NATIVE_ABORT_COLD','SAVED_EMPTY_SEARCH_COLD','SAVED_MISSING_LOCATOR_ABORT']);
let entered=false,failed=false;
export async function runRecoverySavedCase(testId){
 if(entered||failed||testId!==fixedIds[cases.length])throw Error('FIXED_CASE_ORDER_REQUIRED');
 entered=true;
 const beforeDevices=devices.length;
 let response;

 try{
  ok(globalThis.indexedDB instanceof IDBFactory,'Browser-native factory required');
  ok(Function.prototype.toString.call(IDBFactory.prototype.open).includes('[native code]'),'Unmodified native open required');
  if(testId==='RECOVERY_WORK_BUDGET')await run(testId,'R control reads exhaust original work ticket before write callback',async()=>{
   const d=await device(),before=await all(d),repository=d.s.repository,ticket=createOriginalRecoveryWork(repository);let callback=false;
   chargeOriginalRecoveryWork(repository,ticket,0,4095);
   const refusal=await rejected(()=>withOriginalRecoveryWork(repository,ticket,()=>repository.transaction(true,async tx=>{callback=true;await tx.put('meta',{id:'SYNTHETIC_never_written',value:1});},['meta'])),'BNS_GROUP_RESOURCE_LIMIT');
   exact(callback,false);exact(await all(d),before,'all physical tables after ticket failure');fails(()=>checkOriginalRecoveryWork(repository,ticket),'BNS_GROUP_RESOURCE_LIMIT');exact(currentOriginalRecoveryWork(repository),null);
   await d.s.repository.close();return {refusal,callbackEntered:false,allTablesUnchanged:true};
  });
  if(testId==='RECOVERY_NATIVE_ABORT_COLD')await run(testId,'R successor native abort preserves staged cut and cold original recovery succeeds',async()=>{
   const f=await tailFixture(),s=session(f.b,f.t);await s.stage(f.first.ref);const before=await all(f.b),repository=f.b.s.repository,original=repository.transaction,restoreKey=(await state(f.b,s.restoreId)).id;let aborted=0;
   repository.transaction=function(write,fn,stores){return original.call(this,write,async tx=>{const result=await fn(tx);if(write&&!aborted){const row=await tx.get('meta',restoreKey);if(row?.manifestId===f.last.ref.id){ok(tx.tx instanceof IDBTransaction,'Abort uses actual native IDB transaction');aborted++;IDBTransaction.prototype.abort.call(tx.tx);}}return result;},stores);};
   let refusal;try{refusal=await rejected(()=>s.stage(f.last.ref),'STORAGE_FAILED');}finally{repository.transaction=original;}
   exact(aborted,1);exact(await all(f.b),before,'all physical tables after native abort');exact((await state(f.b,s.restoreId)).manifestId,f.first.ref.id);
   const b=await cold(f.b),resumed=session(b,f.t,{restoreId:s.restoreId}),result=await resumed.recover(f.last.ref);exact(result.recoveryState,'restored');
   const actual=await b.s.snapshot();exact(actual.records,f.expected.records,'restored Source');exact(actual.library.blocks,f.expected.library.blocks,'restored Working');
   const byRevision=(a,b)=>a.revisionId.localeCompare(b.revisionId);
   exact((await rows(b.core,'revision')).map(r=>r.operation).sort(byRevision),f.revisions.map(r=>r.operation).sort(byRevision),'complete revision inventory');
   for(const {operation}of f.revisions)exact((await b.core.read('receipt',operation.operationId)).digest,operation.revisionId,'original receipt');
   exact(await rows(b.core,'outbox'),[]);exact((await state(b,s.restoreId)).phase,'activated');await b.s.repository.close();return {refusal,nativeAborts:aborted,allTablesRolledBack:true,coldRecovery:'restored',sourceAndWorkingExact:true,revisionCount:f.revisions.length,noEcho:true};
  });
  if(testId==='SAVED_EMPTY_SEARCH_COLD')await run(testId,'Saved completed-empty search receives exact locator and survives cold duplicate',async()=>{
   const f=await savedFixture(),b=await device();await maintenance(b.s);const before=await all(b),initialMarker=marker(before);exact(initialMarker.complete,true);exact(before.thoughts,[]);exact(before.librarySearchTerms,[]);
   const owner=new StagedSyncRestore(b.core,{grouped:{store:b.s}});await owner.stageCheckpoint(f.cut.ref,ref=>f.t.get(ref));await owner.activate();const restored=await all(b);
   exact(restored.thoughts,f.expected.thoughts,'Saved canonical body and human protections');exact(restored.records,f.expected.records,'Saved Source');
   exact(restored.libraryMigrationItems,[planSearchQueueLocator('entry',restored.thoughts[0])],'original search locator');exact(restored.librarySearchTerms,[]);exact(marker(restored),initialMarker,'completed empty marker retained');
   const pending=await b.s.searchLibrary({query:'savedsearchneedle'});exact(pending.complete,false);exact(pending.indexing,true);
   const passes=await maintenance(b.s),result=await b.s.searchLibrary({query:'savedsearchneedle'});exact(result.complete,true);exact(result.indexing,false);exact(result.items.map(row=>row.entryId),[f.entry.id]);
   const indexed=await all(b),reopened=await cold(b);exact(await all(reopened),indexed,'cold indexed physical state');
   await new StagedSyncRestore(reopened.core,{restoreId:owner.restoreId,grouped:{store:reopened.s}}).activate();exact(await all(reopened),indexed,'cold duplicate physical state');
   exact((await reopened.s.searchLibrary({query:'savedsearchneedle'})).items.map(row=>row.entryId),[f.entry.id]);exact(await rows(reopened.core,'outbox'),[]);
   await reopened.s.repository.close();return {completedEmptyMarkerRetained:true,exactLocator:true,pendingThenDiscoverable:true,maintenancePasses:passes,coldDuplicateUnchanged:true,noEcho:true};
  });
  if(testId==='SAVED_MISSING_LOCATOR_ABORT')await run(testId,'Saved missing genuine search locator aborts full native activation',async()=>{
   const f=await savedFixture(),b=await device();await maintenance(b.s);let removed=0,native=false;
   const owner=new StagedSyncRestore(b.core,{grouped:{store:b.s},checkpoint:async(phase,tx)=>{if(phase!=='after-activation')return;const key=planSearchQueueLocator('entry',f.operation.value.payload.entry).id;ok(await tx.get('libraryMigrationItems',key),'Original Saved writer created locator');native=tx.tx instanceof IDBTransaction;ok(native,'Original activation owns native transaction');await tx.delete('libraryMigrationItems',key);removed++;}});
   await owner.stageCheckpoint(f.cut.ref,ref=>f.t.get(ref));const before=await all(b);let failure;
   try{await owner.activate();throw Error('Missing locator was accepted');}catch(error){if(error.message==='Missing locator was accepted')throw error;exact(error.code,'BNS_SAVED_WORK_CHANGED','original Saved terminal locator fence');failure={name:error.name,code:error.code,message:error.message};}
   exact(removed,1);exact(await all(b),before,'all physical tables after Saved final fence');exact((await state(b,owner.restoreId)).phase,'validated');
   const reopened=await cold(b);exact(await all(reopened),before,'cold all-table rollback');await reopened.s.repository.close();return {failure,nativeTransaction:native,removedOriginalLocator:removed,allTablesRolledBack:true,coldRollbackExact:true};
  });
  response={...cases.at(-1),nativeFactory:true,databaseCount:new Set(devices.slice(beforeDevices).map(d=>d.name)).size};
 }catch(error){failed=true;response={...(cases.at(-1)?.id===testId?cases.at(-1):{}),id:testId,result:'FAIL',error:{name:error.name,message:error.message,code:error.code??null,stack:error.stack}};}
 finally{
  const cleanupErrors=[];
  for(const d of devices.slice(beforeDevices)){
   try{await d.s.repository.close();}
   catch(error){cleanupErrors.push({name:error.name,message:error.message,code:error.code??null,stack:error.stack});}
  }
  if(cleanupErrors.length){failed=true;response={...response,result:'FAIL',cleanupErrors};}
  entered=false;
 }
 return response;
}
