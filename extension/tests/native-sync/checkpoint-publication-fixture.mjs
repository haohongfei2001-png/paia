import {LibraryDocumentsStore} from '../../core/library-documents-store.js';
import {BrowserNativeSyncCore} from '../../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../../core/browser-native-sync/source-bootstrap-journal.js';
import {FilterIntentSyncJournal} from '../../core/browser-native-sync/filter-intent-journal.js';
import {InputWorkingSyncJournal} from '../../core/browser-native-sync/input-working-journal.js';
import {HumanLibrarySyncJournal} from '../../core/browser-native-sync/human-library-journal.js';
import {RecoverableCheckpointPublication} from '../../core/browser-native-sync/checkpoint-publication.js';
import {LocalSyncRecoverySession} from '../../core/browser-native-sync/recovery-session.js';
import {GroupedCheckpointRestore} from '../../core/browser-native-sync/group-checkpoint.js';
import {GoogleDriveAppDataTransport,GOOGLE_APPDATA_SCOPE} from '../../core/browser-native-sync/providers/google-drive.js';
import {OneDriveAppFolderTransport,ONEDRIVE_APPFOLDER_SCOPE} from '../../core/browser-native-sync/providers/onedrive.js';
import {fakeGoogleCheckpointHTTP,fakeOneDriveCheckpointHTTP} from '../harness/checkpoint-publication-http.mjs';

// Preparation only until separately authorized native execution. This fixture
// calls real native IDB and original providers with synthetic in-memory HTTP;
// it has no fetch, live account, credentials, or external transport fallback.
export async function runCheckpointPublicationNativeCases(){
 const cases=[];let assertions=0;const check=(value,label)=>{assertions++;if(!value)throw Error(label);};
 for(const kind of ['google','onedrive']){
  const stores=[],before=assertions,dataset='SYNTHETIC_native_checkpoint_'+kind,binding=kind==='google'?{subject:'SYNTHETIC_google_subject',clientId:'000000000000-synthetic.apps.googleusercontent.com',generation:'SYNTHETIC_generation',scopes:[GOOGLE_APPDATA_SCOPE]}:{subject:'SYNTHETIC_subject',tenantId:'9188040d-6c67-4c5b-b112-36a304b66dad',clientId:'00000000-0000-0000-0000-000000000001',generation:'SYNTHETIC_generation',scopes:[ONEDRIVE_APPFOLDER_SCOPE]},cloud=kind==='google'?fakeGoogleCheckpointHTTP(binding):fakeOneDriveCheckpointHTTP(binding),provider=kind==='google'?'google-drive-appdata':'onedrive-appfolder',C=kind==='google'?GoogleDriveAppDataTransport:OneDriveAppFolderTransport;
  const fresh=async(device,prior=null)=>{const values={},local=prior?.local??{async get(k){return structuredClone(k===null?values:{[k]:values[k]});},async set(v){Object.assign(values,structuredClone(v));}},name=prior?.name??'SYNTHETIC-native-checkpoint-'+crypto.randomUUID(),store=new LibraryDocumentsStore(local,{indexedDB,name});stores.push(store);if(!prior)await store.consent(true);await store.finishFoundation();const core=new BrowserNativeSyncCore(store.repository,{datasetId:dataset,deviceId:device});store.sourceBootstrapJournal=new SourceBootstrapJournal(core);store.filterIntentJournal=new FilterIntentSyncJournal(core);store.inputWorkingJournal=new InputWorkingSyncJournal(core,{filterJournal:store.filterIntentJournal,logicalCommits:true});store.humanLibraryJournal=new HumanLibrarySyncJournal(core);return {store,core,local,name,device};};
  const publish=f=>new RecoverableCheckpointPublication(f.core,{store:f.store,binding:{...binding,provider},request:cloud.request,isCurrent:()=>true}),transport=f=>new C(f.core,{binding,request:cloud.request,isCurrent:()=>true});
  const edit=async(f,id,note)=>{const row=await f.store.input(id);await f.store.editDocument({operationId:crypto.randomUUID(),documentId:row.documentId,blocks:[{id,expectedRevision:row.revision,libraryText:row.libraryText,note,excluded:false}]});};
  try{
   const a=await fresh('SYNTHETIC_native_A');await a.store.capture({epoch:(await a.store.status()).epoch,adapterVersion:'0.3.0',chat:{id:'SYNTHETIC_chat',url:'https://chatgpt.com/c/SYNTHETIC_chat',title:'SYNTHETIC title'},messages:[{sourceMessageId:'SYNTHETIC_message',pageOrder:1,originalText:'SYNTHETIC native Source 中文🙂'}]});const input=(await a.store.snapshot()).library.blocks[0].id;await edit(a,input,'SYNTHETIC native Working');const entry=await a.store.createEntry({actor:'user',body:'SYNTHETIC human text',type:'idea',formation:'explicit',evidence:[],operationId:crypto.randomUUID()});const publisher=publish(a);await publisher.prepare();check((await publisher.publish()).state==='confirmed','original checkpoint confirmed');publisher.close();a.store.repository.db.close();
   const b=await fresh('SYNTHETIC_native_B'),recovery=new LocalSyncRecoverySession(b.core,{store:b.store,transport:transport(b)});check((await recovery.recoverDiscovered()).state==='restored','fresh B discovers cloud only');check((await b.store.input(input)).note==='SYNTHETIC native Working','exact Working');check((await b.store.entry(entry.id)).body==='SYNTHETIC human text','exact Human');const cleanup=new GroupedCheckpointRestore(b.core,{store:b.store,restoreId:recovery.restoreId});while(!(await cleanup.cleanup({limit:64})).complete){}b.store.repository.db.close();
   const cold=await fresh(b.device,b);check(cold.store.repository.db instanceof IDBDatabase,'actual cold native database');await edit(cold,input,'SYNTHETIC native cold edit');const again=publish(cold);await again.prepare();check((await again.publish()).state==='confirmed','cold original re-publication');again.close();cold.store.repository.db.close();const c=await fresh('SYNTHETIC_native_C'),last=new LocalSyncRecoverySession(c.core,{store:c.store,transport:transport(c)});check((await last.recoverDiscovered()).state==='restored','fresh C discovers causal successor');check((await c.store.input(input)).note==='SYNTHETIC native cold edit','exact subsequent Working');cases.push({name:kind,result:'PASS',assertions:assertions-before});
  }catch(error){cases.push({name:kind,result:'FAIL',error:{name:error.name,code:error.code,message:error.message}});throw error;}
  finally{for(const store of stores)store.repository.db?.close();}
 }
 return {status:'SYNTHETIC_RECOVERABLE_CHECKPOINT_ONLY_NOT_COMPLETE_SYNC',cases,assertions,sourceOwnerAbsent:true,nativeDBReopen:true,workerRestart:false,externalNetwork:false};
}
