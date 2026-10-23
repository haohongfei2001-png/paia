import {LibraryDocumentsStore} from '../../core/library-documents-store.js';
import {BrowserNativeSyncCore} from '../../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../../core/browser-native-sync/source-bootstrap-journal.js';
import {SourcePurgeJournal} from '../../core/browser-native-sync/source-purge-journal.js';
import {FilterIntentSyncJournal} from '../../core/browser-native-sync/filter-intent-journal.js';
import {InputWorkingSyncJournal} from '../../core/browser-native-sync/input-working-journal.js';
import {HumanLibrarySyncJournal} from '../../core/browser-native-sync/human-library-journal.js';
import {PromptSyncJournal} from '../../core/browser-native-sync/prompt-journal.js';
import {PromptReuseService} from '../../core/prompt-reuse-service.js';
import {keyedHash} from '../../core/thought-model.js';
import {RecoverableCheckpointPublication} from '../../core/browser-native-sync/checkpoint-publication.js';
import {LocalSyncRecoverySession} from '../../core/browser-native-sync/recovery-session.js';
import {GroupedCheckpointRestore} from '../../core/browser-native-sync/group-checkpoint.js';
import {GoogleDriveAppDataTransport,GOOGLE_APPDATA_SCOPE} from '../../core/browser-native-sync/providers/google-drive.js';
import {OneDriveAppFolderTransport,ONEDRIVE_APPFOLDER_SCOPE} from '../../core/browser-native-sync/providers/onedrive.js';
import {fakeGoogleCheckpointHTTP,fakeOneDriveCheckpointHTTP} from '../harness/checkpoint-publication-http.mjs';

// Real owners and providers, with synthetic HTTP only. The same small fixture
// may be checked with fake IDB during preparation; only the MV3 entry proves native IDB.
export async function runCheckpointPublicationNativeCases(){
 const cases=[];let assertions=0;
 const check=(value,label)=>{assertions++;if(!value)throw Error(label);};
 const equal=(a,b,label)=>check(JSON.stringify(a)===JSON.stringify(b),label);
 const snapshot=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(s.repository.stores.map(async k=>[k,await t.all(k)]))));
 const prompt=rows=>rows.meta.filter(x=>x.id==='prompt-reuse:v1');
 for(const kind of ['google','onedrive'])for(const action of ['mixed','pause','purge']){
  const stores=[],owners=[],beforeCount=assertions,dataset='SYNTHETIC_native_checkpoint_'+kind+'_'+action;
  const binding=kind==='google'?{subject:'SYNTHETIC_google_subject',clientId:'000000000000-synthetic.apps.googleusercontent.com',generation:'SYNTHETIC_generation',scopes:[GOOGLE_APPDATA_SCOPE]}:{subject:'SYNTHETIC_subject',tenantId:'9188040d-6c67-4c5b-b112-36a304b66dad',clientId:'00000000-0000-0000-0000-000000000001',generation:'SYNTHETIC_generation',scopes:[ONEDRIVE_APPFOLDER_SCOPE]};
  const cloud=kind==='google'?fakeGoogleCheckpointHTTP(binding):fakeOneDriveCheckpointHTTP(binding),provider=kind==='google'?'google-drive-appdata':'onedrive-appfolder',C=kind==='google'?GoogleDriveAppDataTransport:OneDriveAppFolderTransport;
  const writes=()=>cloud.requests.filter(r=>['POST','PUT'].includes(r.method)).length;
  const fresh=async(device,prior=null)=>{
   const values={},local=prior?.local??{async get(k){return structuredClone(k===null?values:{[k]:values[k]});},async set(v){Object.assign(values,structuredClone(v));}},name=prior?.name??'SYNTHETIC-native-checkpoint-'+crypto.randomUUID();
   let tick=0;const store=new LibraryDocumentsStore(local,{indexedDB,name,clock:()=>new Date(Date.UTC(2026,9,24)+70000*tick++).toISOString()});stores.push(store);
   if(!prior)await store.consent(true);await store.finishFoundation();
   const core=new BrowserNativeSyncCore(store.repository,{datasetId:dataset,deviceId:device});
   store.sourceBootstrapJournal=new SourceBootstrapJournal(core);store.sourcePurgeJournal=new SourcePurgeJournal(core);store.filterIntentJournal=new FilterIntentSyncJournal(core);
   store.inputWorkingJournal=new InputWorkingSyncJournal(core,{filterJournal:store.filterIntentJournal,logicalCommits:true});store.humanLibraryJournal=new HumanLibrarySyncJournal(core);
   return {store,core,local,name,device,prompts:new PromptReuseService(store,{syncJournal:new PromptSyncJournal(core)})};
  };
  const publish=(f,request=cloud.request)=>{const p=new RecoverableCheckpointPublication(f.core,{store:f.store,binding:{...binding,provider},request,isCurrent:()=>true});owners.push(p);return p;};
  const transport=f=>{const t=new C(f.core,{binding,request:cloud.request,isCurrent:()=>true});owners.push(t);return t;};
  const edit=async(f,id,note)=>{const row=await f.store.input(id);await f.store.editDocument({operationId:crypto.randomUUID(),documentId:row.documentId,blocks:[{id,expectedRevision:row.revision,libraryText:row.libraryText,note,excluded:false}]});};
  try{
   const a=await fresh('SYNTHETIC_native_A');
   await a.store.capture({epoch:(await a.store.status()).epoch,adapterVersion:'0.3.0',chat:{id:'SYNTHETIC_chat',url:'https://chatgpt.com/c/SYNTHETIC_chat',title:'SYNTHETIC title'},messages:[{sourceMessageId:'SYNTHETIC_message',pageOrder:1,originalText:'SYNTHETIC native Source 中文🙂'}]});
   if(action!=='mixed'){
    let armed=false,hit=false,arrive,release,settle;
    const entered=new Promise(r=>arrive=r),held=new Promise(r=>release=r),requestSettled=new Promise(r=>settle=r);
    const p=publish(a,async r=>{const response=await cloud.request(r);if(armed&&!hit&&r.method==='GET'&&(kind==='google'?new URL(r.url).searchParams.get('q')?.includes("key='paiaDigest'"):new URL(r.url).pathname.includes(':/paia-bns1_'))){hit=true;arrive();await held;settle();}return response;});
    await p.prepare();armed=true;
    // Attach rejection handling before the controlled pause can reject the action.
    const pending=p.publish().then(()=>({resolved:true}),error=>({error}));await entered;
    try{if(action==='pause')p.pause();else{await a.store.purge((await a.store.snapshot()).records[0].id,true);await a.store.drainPurgeCleanup();}}finally{release();}
    const result=await pending;await requestSettled;check(!!result.error,'held GET action refuses');check(hit,'last lookup intercepted');check(writes()===0,'no body POST or PUT after original pause/purge');
    if(action==='purge')check((await a.store.snapshot()).records.length===0,'original purge completed with original Filter journal installed');
    else{p.resume();await p.status();const retry=await p.publish().then(()=>null,e=>e);check(!!retry,'unknown attempting object stays blocked');check(writes()===0,'resumed work cannot authorize old body dispatch');}
   }else{
    const input=(await a.store.snapshot()).library.blocks[0].id;await edit(a,input,'SYNTHETIC native Working');
    const topic=await a.store.createTopic({name:'SYNTHETIC topic',operationId:crypto.randomUUID()});
    const entry=await a.store.createEntry({actor:'user',body:'SYNTHETIC human text',type:'idea',formation:'explicit',evidence:[],operationId:crypto.randomUUID()});
    await a.store.placeEntry({entryId:entry.id,topicId:topic.id,expectedEntryRevision:0,expectedTopicRevision:0,operationId:crypto.randomUUID()});
    await a.prompts.change({action:'create',revision:0,text:'SYNTHETIC manual prompt 中文🙂\r\nsecond line'});
    const original=await snapshot(a.store),publisher=publish(a);await publisher.prepare();check(writes()===0,'prepare has no remote writes');
    const first=await publisher.publish();check(first.state==='confirmed','original checkpoint confirmed');publisher.close();await a.store.repository.close();check(a.store.repository.db===null,'A original repository closed');
    const b=await fresh('SYNTHETIC_native_B');check(b.local!==a.local&&b.name!==a.name,'B independent local storage and database');
    const recovery=new LocalSyncRecoverySession(b.core,{store:b.store,transport:transport(b)});check((await recovery.recoverDiscovered()).state==='restored','fresh B discovers cloud only');
    check((await b.store.input(input)).note==='SYNTHETIC native Working','exact Working');check((await b.store.entry(entry.id)).body==='SYNTHETIC human text','exact Human');
    const restored=await snapshot(b.store),secret=restored.meta.find(x=>x.id==='thought-suppression-key').value;
    check(JSON.stringify(secret)!==JSON.stringify(original.meta.find(x=>x.id==='thought-suppression-key').value),'B retains its own suppression secret');
    const topics=structuredClone(original.topics);for(const row of topics)row.identity.nameToken=await keyedHash(secret,['personal-topic-name-v1',row.name.normalize('NFKC').toLocaleLowerCase().trim()]);
    equal(restored.topics,topics,'exact Topic with original B-secret qualification');equal(restored.placements,original.placements,'exact Placement');check(prompt(original).length===1,'actual Prompt row created');equal(prompt(restored),prompt(original),'exact original Prompt body and preferences');
    const cleanup=new GroupedCheckpointRestore(b.core,{store:b.store,restoreId:recovery.restoreId});let complete=false;for(let n=0;n<16&&!complete;n++)complete=(await cleanup.cleanup({limit:64})).complete;check(complete,'bounded original stage cleanup');
    await b.store.repository.close();check(b.store.repository.db===null,'B original repository closed');
    const cold=await fresh(b.device,b);check(cold.store.repository.db instanceof IDBDatabase,'cold actual database instance');await edit(cold,input,'SYNTHETIC native cold edit');
    const oldEntry=await cold.store.entry(entry.id);await cold.store.editEntry({id:entry.id,expectedRevision:oldEntry.revision,changes:{body:'SYNTHETIC cold Human edit'},operationId:crypto.randomUUID()});
    equal(prompt(await snapshot(cold.store)),prompt(original),'cold Prompt retained');
    const again=publish(cold);await again.prepare();const second=await again.publish();check(second.state==='confirmed'&&second.ref.id!==first.ref.id,'cold causal re-publication');again.close();await cold.store.repository.close();check(cold.store.repository.db===null,'cold B original repository closed');
    const c=await fresh('SYNTHETIC_native_C');check(c.local!==b.local&&c.name!==b.name,'C independent local storage and database');
    const last=new LocalSyncRecoverySession(c.core,{store:c.store,transport:transport(c)});check((await last.recoverDiscovered()).state==='restored','fresh C discovers causal successor');check((await c.store.input(input)).note==='SYNTHETIC native cold edit','exact subsequent Working');check((await c.store.entry(entry.id)).body==='SYNTHETIC cold Human edit','exact subsequent Human');equal(prompt(await snapshot(c.store)),prompt(original),'exact subsequent Prompt');
   }
   cases.push({name:kind+'-'+action,result:'PASS',assertions:assertions-beforeCount});
  }finally{for(const owner of owners)owner.close();for(const store of stores)await store.repository.close();}
 }
 return {status:'SYNTHETIC_RECOVERABLE_CHECKPOINT_ONLY_NOT_COMPLETE_SYNC',cases,assertions,sourceOwnerAbsent:true,nativeDBReopen:true,workerRestart:false,externalNetwork:false};
}
