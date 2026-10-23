import test from 'node:test';
import {PresentationNode} from './harness/presentation-dom.mjs';
import {mountSettingsDetail} from '../ui/settings-details.js';
import {mountSettingsSync} from '../ui/settings-sync.js';
import {topicRootURL} from '../core/topic-root-target.js';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,symlink,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore as LibraryFoundationStore} from '../core/library-documents-store.js';
import {RecoverableCheckpointPublication} from '../core/browser-native-sync/checkpoint-publication.js';
import {local,capture} from './harness/thought-m1.mjs';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {buildCheckpoint} from '../core/browser-native-sync/checkpoints.js';
import {readSegmentDescriptor} from '../core/browser-native-sync/segments.js';
import {GoogleDriveAppDataTransport,GOOGLE_APPDATA_SCOPE} from '../core/browser-native-sync/providers/google-drive.js';
import {PreparedPublicationJournal} from '../core/browser-native-sync/publications.js';
import {readSyncLifecycleConfiguration} from '../background/sync-lifecycle-configuration.js';
import {createConfiguredSyncLifecycle,syncLifecycleError} from '../background/sync-local-lifecycle.js';
const ROOT=fileURLToPath(new URL('../..',import.meta.url)),ROW='paia-sync-local-lifecycle:v1';
globalThis.IDBKeyRange=IDBKeyRange;
const encode=x=>new TextEncoder().encode(typeof x==='string'?x:JSON.stringify(x));
const binding={subject:'SYNTHETIC_google_subject',clientId:'000000000000-synthetic.apps.googleusercontent.com',generation:'SYNTHETIC_generation',scopes:[GOOGLE_APPDATA_SCOPE]};
const sender={id:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',url:'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/ui/archive.html'};
const api=storage=>({runtime:{id:sender.id,getURL:p=>'chrome-extension://'+sender.id+'/'+p},storage:{local:storage}});
const command=(owner,type)=>owner.handle({type:'PAIA_SYNC_'+type},sender);
function fakeDrive(){
 const files=new Map(),requests=[];let next=0,lose=false;
 const request=async r=>{
  requests.push(r);const u=new URL(r.url);assert.equal(u.origin,'https://www.googleapis.com');assert.equal(r.binding.subject,binding.subject);assert.equal(r.headers.Authorization,undefined);assert.ok(r.maxResponseBytes<=262144||r.maxResponseBytes<=1024*1024);
  const respond=(body,status=200)=>({status,body:encode(body)});
  if(u.pathname==='/drive/v3/files/generateIds'){assert.equal(r.method,'GET');assert.equal(u.searchParams.get('space'),'appDataFolder');return respond({ids:[`SYNTHETIC_file_${++next}`]});}
  if(u.pathname==='/upload/drive/v3/files'){
   assert.equal(r.method,'POST');assert.equal(u.searchParams.get('uploadType'),'multipart');const boundary=r.headers['Content-Type'].split('boundary=')[1],text=new TextDecoder().decode(r.body),parts=text.split(`--${boundary}`);assert.equal(parts.length,4);
   const metadata=JSON.parse(parts[1].split('\r\n\r\n')[1].trim());assert.deepEqual(metadata.parents,['appDataFolder']);assert.equal(metadata.mimeType,'application/octet-stream');
   if(files.has(metadata.id))return respond({},409);
   const separator=encode('\r\n\r\n');let at=0,hits=0;for(;at<=r.body.length-separator.length;at++){if(separator.every((v,i)=>r.body[at+i]===v)&&++hits===2){at+=separator.length;break;}}
   const raw=r.body.slice(at,r.body.length-encode(`\r\n--${boundary}--\r\n`).length);files.set(metadata.id,{...metadata,spaces:['appDataFolder'],trashed:false,size:String(raw.length),raw});if(lose){lose=false;throw Error('SYNTHETIC lost POST response');}return respond({id:metadata.id});
  }
  if(u.pathname==='/drive/v3/files'){
   assert.equal(r.method,'GET');assert.equal(u.searchParams.get('spaces'),'appDataFolder');assert.equal(u.searchParams.has('orderBy'),false);const q=u.searchParams.get('q');assert.ok(q.includes('trashed = false'));
   let found=[...files.values()].filter(f=>f.appProperties?.paiaProtocol==='1');for(const match of q.matchAll(/key='([^']+)' and value='([^']+)'/g))found=found.filter(f=>f.appProperties[match[1]]===match[2]);
   const start=Number(u.searchParams.get('pageToken')||0),size=Number(u.searchParams.get('pageSize'));return respond({files:found.slice(start,start+size).map(({raw,...f})=>f),...(start+size<found.length?{nextPageToken:String(start+size)}:{})});
  }
  const id=u.pathname.slice('/drive/v3/files/'.length);assert.equal(r.method,'GET');assert.match(id,/^[A-Za-z0-9_-]+$/);const file=files.get(id);if(!file)return respond({},404);if(u.searchParams.get('alt')==='media')return {status:200,body:file.raw.slice()};const {raw,...metadata}=file;return respond(metadata);
 };
 return {files,requests,request,loseNextPost(){lose=true;}};
}
// Reuse the existing provider's synthetic HTTP model above. It never calls fetch.
// Only the disposable source configuration reads this private fixture binding;
// there is no production global setter, caller config parameter or RPC issuer.
async function configured(t,options={}){
 const work=join(ROOT,'work','sync-lifecycle-test-fixtures');await mkdir(work,{recursive:true});const path=await mkdtemp(join(work,'fixture-')),key='sync_fixture_'+crypto.randomUUID();
 await mkdir(join(path,'background'));await symlink(join(ROOT,'extension','core'),join(path,'core'),'dir');
 await writeFile(join(path,'package.json'),' {"type":"module"} ');
 await writeFile(join(path,'background','sync-local-lifecycle.js'),await readFile(new URL('../background/sync-local-lifecycle.js',import.meta.url)));
 await writeFile(join(path,'background','sync-lifecycle-configuration.js'),`export function readSyncLifecycleConfiguration(){return globalThis[${JSON.stringify(key)}];}\n`);
 const cloud=options.cloud??fakeDrive(),storage=options.storage??local(),factory=options.factory??new IDBFactory();let active=true,identity=structuredClone(options.binding??binding);
 const conf={provider:options.provider??'google-drive',datasetId:'SYNTHETIC_google_data',deviceId:options.deviceId??'SYNTHETIC_device_A',binding:identity,request:r=>cloud.request(r),isCurrent:()=>active};globalThis[key]=conf;
 const {createConfiguredSyncLifecycle:create}=await import(pathToFileURL(join(path,'background/sync-local-lifecycle.js')));
 const stores=[],owners=[];
 async function open(){const store=new LibraryFoundationStore(storage,{indexedDB:factory});stores.push(store);if(options.consented!==false&&!(await store.status()).consented)await store.consent(true);await store.finishFoundation();const owner=await create(store,api(storage));owners.push(owner);return {store,owner,core:store.sourceBootstrapJournal.core};}
 t.after(async()=>{owners.forEach(x=>x.suspend());stores.forEach(x=>x.repository.db?.close());delete globalThis[key];await rm(path,{recursive:true,force:true});});
 return {cloud,storage,factory,conf,create,open,setCurrent:v=>active=v,setGeneration:g=>{conf.binding={...conf.binding,generation:g};},setSubject:s=>{conf.binding={...conf.binding,subject:s};}};
}
async function source(x){await x.store.capture(capture((await x.store.status()).epoch));return (await x.store.snapshot()).records;}
async function cold(f,x){x.owner.suspend();x.store.repository.db?.close();x.store.repository.db=null;return f.open();}
const row=f=>f.storage.get(ROW).then(x=>x[ROW]);
const posts=cloud=>cloud.requests.filter(x=>x.method==='POST');

test('shipped configuration is unavailable and cannot be activated by command, extra parameters or content sender',async()=>{
 assert.equal(syncLifecycleError({code:'BNS_SYNC_OUTCOME_UNKNOWN'}),'BNS_SYNC_OUTCOME_UNKNOWN');assert.equal(syncLifecycleError(Error('SYNTHETIC private text')),'STORAGE_FAILED');
 assert.equal(readSyncLifecycleConfiguration(),null);const storage=local(),owner=await createConfiguredSyncLifecycle(null,api(storage));assert.equal((await command(owner,'STATUS')).state,'unavailable');await assert.rejects(command(owner,'RESUME'),{code:'BNS_SYNC_UNAVAILABLE'});await assert.rejects(owner.handle({type:'PAIA_SYNC_STATUS',binding},sender),{code:'INVALID_REQUEST'});await assert.rejects(owner.handle({type:'PAIA_SYNC_STATUS'},{...sender,url:'https://chatgpt.com/'}),{code:'FORBIDDEN'});await assert.rejects(createConfiguredSyncLifecycle(null,api(storage),{}),{code:'BNS_SYNC_CONFIGURATION'});assert.equal((await storage.get(ROW))[ROW],undefined);
});
test('pause/disconnect before first start persist across cold opens; resume does not mint reauthorization',async t=>{
 const f=await configured(t);let x=await f.open();await command(x.owner,'PAUSE');x=await cold(f,x);assert.equal((await x.owner.snapshot()).state,'paused');assert.equal(f.cloud.requests.length,0);await command(x.owner,'RESUME');await command(x.owner,'DISCONNECT');x=await cold(f,x);await assert.rejects(command(x.owner,'RESUME'),{code:'BNS_SYNC_REAUTHORIZATION_REQUIRED'});f.setGeneration('SYNTHETIC_generation_2');x=await cold(f,x);await command(x.owner,'RESUME');assert.equal((await x.owner.snapshot()).state,'active');assert.equal(f.cloud.requests.length,0);
});
test('same actual store journals feed original durable publication; no whole archive completion claim',async t=>{
 const f=await configured(t),x=await f.open();await source(x);assert.equal(x.store.inputWorkingJournal.core,x.core);await command(x.owner,'RESUME');const result=await command(x.owner,'NOW');assert.equal(result.task.phase,'confirmed');assert.equal(result.scope,'source-working-only');assert.equal(result.wholeArchiveComplete,false);assert.equal(result.productionActivation,false);assert.ok(f.cloud.files.size>0);assert.equal((await row(f)).task.kind,'checkpoint');assert.equal((await row(f)).task.reference.kind,'checkpoint-manifest');const count=f.cloud.requests.length;await command(x.owner,'STATUS');assert.equal(f.cloud.requests.length,count);assert.equal((await x.owner.snapshot()).task.phase,'confirmed');
 const persisted=JSON.stringify(await row(f));for(const secret of [binding.subject,binding.clientId,binding.generation,'Synthetic explicit working input'])assert.ok(!persisted.includes(secret));
});
test('lost committed upload response preserves original task and reads original receipt after cold open without duplicate POST',async t=>{
 const f=await configured(t);let x=await f.open();await source(x);await command(x.owner,'RESUME');f.cloud.loseNextPost();await assert.rejects(command(x.owner,'NOW'));const first=await row(f),n=f.cloud.requests.length,firstId=[...f.cloud.files.keys()][0];assert.equal(first.task.phase,'unknown');x=await cold(f,x);assert.equal((await row(f)).task.id,first.task.id);assert.equal(f.cloud.requests.length,n);await command(x.owner,'NOW');assert.equal((await row(f)).task.id,first.task.id);assert.equal((await row(f)).task.phase,'confirmed');assert.equal(posts(f.cloud).filter(r=>new TextDecoder().decode(r.body).includes('"id":"'+firstId+'"')).length,1);assert.equal(f.cloud.requests[n].method,'GET');
});
test('pause during committed POST fences late response and explicit same task continuation first reconciles it',async t=>{
 const f=await configured(t),x=await f.open();await source(x);await command(x.owner,'RESUME');let enter,release,held=false;const entered=new Promise(r=>enter=r),wait=new Promise(r=>release=r);f.conf.request=async r=>{const response=await f.cloud.request(r);if(r.method==='POST'&&!held){held=true;enter();await wait;}return response;};const pending=command(x.owner,'NOW');const rejected=assert.rejects(pending);await entered;await command(x.owner,'PAUSE');release();await rejected;const saved=await row(f);assert.equal(saved.mode,'paused');assert.equal(saved.task.phase,'unknown');const n=f.cloud.requests.length;await assert.rejects(command(x.owner,'NOW'),{code:'BNS_SYNC_PAUSED'});assert.equal(f.cloud.requests.length,n);await command(x.owner,'RESUME');await command(x.owner,'NOW');assert.equal((await row(f)).task.id,saved.task.id);assert.equal((await row(f)).task.phase,'confirmed');assert.equal(posts(f.cloud).length,f.cloud.files.size);
});
test('binding generation change and foreign account block old pending upload without retargeting it',async t=>{
 const f=await configured(t);let x=await f.open();await source(x);await command(x.owner,'RESUME');f.cloud.loseNextPost();await assert.rejects(command(x.owner,'NOW'));const saved=await row(f),n=f.cloud.requests.length;f.setGeneration('SYNTHETIC_generation_2');x=await cold(f,x);assert.equal((await x.owner.snapshot()).state,'account-changed');await assert.rejects(command(x.owner,'NOW'));assert.equal(f.cloud.requests.length,n);await command(x.owner,'RESUME');await assert.rejects(command(x.owner,'NOW'),{code:'BNS_CHECKPOINT_PUBLICATION_JOURNAL'});assert.equal((await row(f)).task.id,saved.task.id);assert.equal(f.cloud.requests.length,n);f.setSubject('SYNTHETIC_other_subject');x=await cold(f,x);await assert.rejects(command(x.owner,'RESUME'),{code:'BNS_SYNC_ACCOUNT_CHANGED'});assert.equal((await row(f)).bindingId,saved.bindingId);
});
test('durable local acknowledgement loss is read back once; unprovable outcome sends nothing',async t=>{
 const storage=local(),set=storage.set.bind(storage);let lose=false,drop=false,writes=0;storage.set=async values=>{if(Object.hasOwn(values,ROW)){writes++;if(drop)throw Error('synthetic before write');await set(values);if(lose){lose=false;throw Error('synthetic after write');}}else await set(values);};const f=await configured(t,{storage}),x=await f.open();lose=true;await command(x.owner,'RESUME');assert.equal(writes,1);assert.equal((await x.owner.snapshot()).state,'active');await source(x);drop=true;await assert.rejects(command(x.owner,'NOW'),{code:'BNS_SYNC_OUTCOME_UNKNOWN'});assert.equal(posts(f.cloud).length,0);assert.equal((await x.owner.snapshot()).state,'settlement-unknown');await assert.rejects(command(x.owner,'RESUME'));assert.equal(writes,2);
});
test('second owner and state changes are refused, malformed provider binding never installs journals',async t=>{
 const f=await configured(t),x=await f.open();await assert.rejects(f.create(x.store,api(f.storage)),{code:'BNS_SYNC_OWNER_BUSY'});await command(x.owner,'RESUME');const saved=await row(f);await f.storage.set({[ROW]:{...saved,revision:saved.revision+1}});await assert.rejects(command(x.owner,'PAUSE'),{code:'BNS_SYNC_STATE_CHANGED'});assert.equal(f.cloud.requests.length,0);x.owner.suspend();f.conf.binding={...binding,token:'SYNTHETIC forbidden'};const store=new LibraryFoundationStore(f.storage,{indexedDB:f.factory});t.after(()=>store.repository.db?.close());await assert.rejects(f.create(store,api(f.storage)),{code:'BNS_PROVIDER_BINDING'});assert.equal(store.sourceBootstrapJournal,null);
});
test('wrong task command does not mutate pending identity or conceal original failure',async t=>{
 const f=await configured(t),x=await f.open();await source(x);await command(x.owner,'RESUME');f.cloud.loseNextPost();await assert.rejects(command(x.owner,'NOW'));const saved=await row(f);await assert.rejects(command(x.owner,'RESTORE'),{code:'BNS_SYNC_TASK_PENDING'});assert.deepEqual(await row(f),saved);
});
test('existing grouped checkpoint restores through original owner; cold continuation keeps same restore ID',async t=>{
 const cloud=fakeDrive(),a=new LibraryFoundationStore(local(),{indexedDB:new IDBFactory()});t.after(()=>a.repository.db?.close());await a.consent(true);await a.finishFoundation();const core=new BrowserNativeSyncCore(a.repository,{datasetId:'SYNTHETIC_google_data',deviceId:'SYNTHETIC_sender'});a.sourceBootstrapJournal=new SourceBootstrapJournal(core);await a.capture(capture((await a.status()).epoch));await buildCheckpoint(core,new GoogleDriveAppDataTransport(core,{binding,request:cloud.request,isCurrent:()=>true}),{grouped:{store:a}});const expected=await a.snapshot(),f=await configured(t,{cloud,deviceId:'SYNTHETIC_receiver'});let x=await f.open();await command(x.owner,'RESUME');const result=await command(x.owner,'RESTORE');assert.equal(result.task.phase,'confirmed');assert.deepEqual((await x.store.snapshot()).records,expected.records);const saved=await row(f),n=cloud.requests.length;x=await cold(f,x);assert.equal(cloud.requests.length,n);await command(x.owner,'CONTINUE');assert.equal((await row(f)).task.id,saved.task.id);assert.deepEqual((await x.store.snapshot()).records,expected.records);
});

test('suspend cancellation reconciles local state without IO or automatic continuation',async t=>{
 const f=await configured(t),x=await f.open();await command(x.owner,'RESUME');await source(x);x.owner.suspend();assert.equal((await x.owner.snapshot()).state,'suspended');await x.owner.resumeAfterSuspend();assert.equal((await x.owner.snapshot()).state,'active');assert.equal(f.cloud.requests.length,0);await command(x.owner,'NOW');assert.equal((await row(f)).task.phase,'confirmed');
});

test('cold recovery of original confirmed publication receipt needs no remote request',async t=>{
 const storage=local(),set=storage.set.bind(storage);let dropConfirmation=true;storage.set=async values=>{if(dropConfirmation&&values[ROW]?.task?.phase==='confirmed')throw Error('synthetic local result not saved');return set(values);};const f=await configured(t,{storage});let x=await f.open();await command(x.owner,'RESUME');await source(x);await assert.rejects(command(x.owner,'NOW'),{code:'BNS_SYNC_OUTCOME_UNKNOWN'});const saved=await row(f);assert.equal((await new RecoverableCheckpointPublication(x.core,{store:x.store,binding:{...binding,provider:'google-drive-appdata'},request:f.cloud.request,isCurrent:()=>true}).status()).state,'confirmed');const n=f.cloud.requests.length;dropConfirmation=false;x=await cold(f,x);assert.equal((await row(f)).task.id,saved.task.id);assert.equal((await row(f)).task.phase,'confirmed');assert.equal(f.cloud.requests.length,n);
});

test('remote loss after original verified cut never causes silently recreating it',async t=>{
 const f=await configured(t),x=await f.open();await command(x.owner,'RESUME');await source(x);f.cloud.loseNextPost();await assert.rejects(command(x.owner,'NOW'));const saved=await row(f),n=posts(f.cloud).length;assert.ok(n>0);f.cloud.files.clear();await assert.rejects(command(x.owner,'NOW'),{code:'BNS_CHECKPOINT_PUBLICATION_UNKNOWN'});assert.equal(posts(f.cloud).length,n);assert.equal((await row(f)).task.id,saved.task.id);
});

for(const enabled of [false,true,'restore','purge','purge-unknown'])test('actual worker synchronous events and same-store command consumer, configured='+enabled,async t=>{
 const {cp}=await import('node:fs/promises'),{toolbarRegistrationFixture}=await import('./harness/toolbar-registration.mjs'),{observeLocalWorkerDrains}=await import('./harness/local-worker-drains.mjs');
 const root=join(ROOT,'work','sync-lifecycle-test-fixtures');await mkdir(root,{recursive:true});const path=await mkdtemp(join(root,'worker-')),key='sync_worker_fixture_'+crypto.randomUUID(),cloud=fakeDrive(),storage=local(),factory=new IDBFactory(),previous={chrome:globalThis.chrome,indexedDB:globalThis.indexedDB,document:globalThis.document};
 const originalConfig=await readFile(new URL('../background/sync-lifecycle-configuration.js',import.meta.url)),worker=await readFile(new URL('../background/service-worker.js',import.meta.url)),drains=observeLocalWorkerDrains();
 await cp(join(ROOT,'extension','background'),join(path,'background'),{recursive:true});await symlink(join(ROOT,'extension','core'),join(path,'core'),'dir');await writeFile(join(path,'package.json'),'{"type":"module"}');
 // Static bridge into the original worker instances, suitable for a later
 // separately authorized native fixture. No production launch flags are changed.
 await writeFile(join(path,'background','service-worker.js'),Buffer.concat([worker,Buffer.from(`\nglobalThis[${JSON.stringify(key+'_bridge')} ]={ready,get store(){return store;},get sync(){return syncLifecycle;}};\n`)]));
 if(enabled){globalThis[key]={provider:'google-drive',datasetId:'SYNTHETIC_google_data',deviceId:'SYNTHETIC_worker',binding,request:cloud.request,isCurrent:()=>true};await writeFile(join(path,'background','sync-lifecycle-configuration.js'),`export function readSyncLifecycleConfiguration(){return globalThis[${JSON.stringify(key)}];}\n`);}
 const seed=new LibraryFoundationStore(storage,{indexedDB:factory});await seed.consent(true);await seed.finishFoundation();seed.repository.db.close();seed.repository.db=null;
 const sent=[];
 const event=()=>({listeners:[],addListener(fn){this.listeners.push(fn);},emit(){for(const fn of this.listeners)fn();}}),startup=event(),suspend=event(),cancel=event();let listener,release,uiPending;const gate=new Promise(r=>release=r);globalThis.indexedDB=factory;
 globalThis.chrome={runtime:{id:sender.id,getManifest:()=>({version:'0.55.0'}),getURL:p=>'chrome-extension://'+sender.id+'/'+p,sendMessage:message=>{if(message.type.startsWith('PAIA_SYNC_'))return uiPending=new Promise(resolve=>listener(message,sender,resolve));sent.push(message);return Promise.resolve();},onMessage:{addListener:fn=>listener=fn},onStartup:startup,onSuspend:suspend,onSuspendCanceled:cancel},storage:{local:{...storage,setAccessLevel:()=>gate}}};toolbarRegistrationFixture(chrome);
 let bridge;t.after(async()=>{release();await drains.idle();drains.dispose();bridge?.sync.suspend();bridge?.store.repository.db?.close();globalThis.chrome=previous.chrome;globalThis.indexedDB=previous.indexedDB;globalThis.document=previous.document;delete globalThis[key];delete globalThis[key+'_bridge'];await rm(path,{recursive:true,force:true});});
 await import(pathToFileURL(join(path,'background/service-worker.js')));bridge=globalThis[key+'_bridge'];assert.equal(typeof listener,'function');assert.ok(startup.listeners.length>=1);assert.ok(suspend.listeners.length>=1);assert.ok(cancel.listeners.length>=1);assert.equal(bridge.store,undefined);
 const rpc=(type,extra={},from=sender)=>new Promise(resolve=>listener({type,...extra},from,resolve));const waiting=rpc('PAIA_SYNC_STATUS');release();await bridge.ready;await drains.idle();const status=await waiting;assert.equal(status.ok,true);assert.equal(status.data.state,enabled?'not-started':'unavailable');assert.equal(cloud.requests.length,0);
 const body=new PresentationNode('body'),panel={hidden:false},make=tag=>{const n=new PresentationNode(tag);if(tag==='dialog'){n.showModal=()=>n.open=true;n.close=()=>{n.open=false;n.listeners.get('close')?.();};}return n;};
 globalThis.document={body,documentElement:{lang:'en'},getElementById:id=>id==='settings-panel'?panel:null,createElement:make,createElementNS:(_ns,tag)=>make(tag)};
 const detail=mountSettingsSync({mountDetail:mountSettingsDetail,language:()=> 'en'});body.append(detail.row);detail.row.listeners.get('click')();await uiPending;await new Promise(r=>setImmediate(r));
 const ui=async command=>{const button=detail.dialog.children[1].children.flatMap(n=>n.children??[]).find(n=>n.dataset.syncCommand===command);assert.ok(button&&!button.hidden&&!button.disabled,'actual Settings action '+command);button.listeners.get('click')();const response=await uiPending;await new Promise(r=>setImmediate(r));return response;};
 if(enabled)assert.match(detail.dialog.textContent,/not a whole-archive backup/);else assert.match(detail.dialog.textContent,/not available/);
 if(enabled==='restore'){
  const sourceStore=new LibraryFoundationStore(local(),{indexedDB:new IDBFactory()});t.after(()=>sourceStore.repository.db?.close());await sourceStore.consent(true);await sourceStore.finishFoundation();const sourceCore=new BrowserNativeSyncCore(sourceStore.repository,{datasetId:'SYNTHETIC_google_data',deviceId:'SYNTHETIC_sender'});sourceStore.sourceBootstrapJournal=new SourceBootstrapJournal(sourceCore);await sourceStore.capture(capture((await sourceStore.status()).epoch));await buildCheckpoint(sourceCore,new GoogleDriveAppDataTransport(sourceCore,{binding,request:cloud.request,isCurrent:()=>true}),{grouped:{store:sourceStore}});
  assert.equal((await ui('RESUME')).ok,true);const restored=await ui('RESTORE');assert.equal(restored.ok,true,JSON.stringify(restored));assert.equal(restored.data.task.phase,'confirmed');assert.deepEqual(sent.filter(x=>x.cause==='PAIA_SYNC_RESTORE'),[{type:'ARCHIVE_CHANGED',cause:'PAIA_SYNC_RESTORE'}]);assert.deepEqual((await bridge.store.snapshot()).records,(await sourceStore.snapshot()).records);
 }else if(enabled){
  assert.equal(bridge.store.sourceBootstrapJournal.core.repository,bridge.store.repository);assert.equal(bridge.store.sourcePurgeJournal.core.repository,bridge.store.repository);assert.equal((await ui('RESUME')).ok,true);
  if(String(enabled).startsWith('purge')){assert.equal((await rpc('FILTER_MODE',{mode:'off'})).ok,true);await drains.idle();}
  const request=capture((await bridge.store.status()).epoch),content={id:sender.id,url:request.chat.url,tab:{id:1,url:request.chat.url,incognito:false},frameId:0};const captured=await rpc('CAPTURE',{...request,contentVersion:'0.55.0'},content);assert.equal(captured.ok,true,JSON.stringify(captured));await drains.idle();assert.equal(captured.data.added,1);
  if(String(enabled).startsWith('purge')){
   const baseline=await bridge.store.snapshot();let saved=null,postCount=0;
   if(enabled==='purge-unknown'){cloud.loseNextPost();assert.equal((await ui('NOW')).ok,false);saved=(await storage.get(ROW))[ROW];postCount=posts(cloud).length;await ui('STATUS');}
   const deletion=await rpc('PURGE_SOURCE',{id:baseline.records[0].id,confirm:true});
   if(saved){assert.equal(deletion.ok,false);assert.equal(deletion.error,'STORAGE_FAILED','original worker error mapping is retained');await assert.rejects(bridge.store.permanentDelete(baseline.records[0].id),{code:'BNS_SOURCE_PURGE_UNSUPPORTED'});assert.deepEqual((await bridge.store.snapshot()).records,baseline.records,'unknown publication refuses deletion without erasing original evidence');assert.equal((await storage.get(ROW))[ROW].task.id,saved.task.id);assert.equal(posts(cloud).length,postCount,'delete refusal never retransmits unknown cut');}
   else{assert.equal(deletion.ok,true,JSON.stringify(deletion));await bridge.store.drainPurgeCleanup();await drains.idle();const after=await bridge.store.repository.transaction(false,async tx=>Object.fromEntries(await Promise.all(bridge.store.repository.stores.map(async name=>[name,await tx.all(name)]))));assert.equal(after.records.length,0);assert.equal(after.filterInputs.length,0);assert.equal(after.filterIntents.length,0);assert.equal(JSON.stringify(after).includes(request.messages[0].originalText),false);assert.ok(sent.some(x=>x.cause==='PURGE_SOURCE'));}
  }
  if(enabled==='purge'){const before=posts(cloud).length,result=await ui('NOW');assert.equal(result.ok,false);assert.equal(posts(cloud).length,before,'unsupported negative checkpoint cannot publish a partial cut');await ui('STATUS');}
  else{const published=await ui('NOW');assert.equal(published.ok,true,JSON.stringify(published));assert.equal(published.data.task.phase,'confirmed');assert.equal(published.data.wholeArchiveComplete,false);assert.ok(cloud.files.size>0);assert.equal(sent.some(x=>x.cause==='PAIA_SYNC_NOW'),false);}
  const n=cloud.requests.length;assert.equal((await ui('PAUSE')).data.state,'paused');startup.emit();await Promise.resolve();await bridge.store.tail;assert.equal(cloud.requests.length,n);suspend.emit();assert.equal((await bridge.sync.snapshot()).state,'suspended');cancel.emit();await Promise.resolve();await bridge.sync.resumeAfterSuspend();assert.equal((await bridge.sync.snapshot()).state,'paused');assert.equal(cloud.requests.length,n);
 }else {assert.equal(bridge.store.sourceBootstrapJournal,null);assert.equal((await rpc('PAIA_SYNC_RESUME')).error,'BNS_SYNC_UNAVAILABLE');}
 const forbidden=await rpc('PAIA_SYNC_STATUS',{}, {...sender,url:'https://chatgpt.com/'});assert.equal(forbidden.error,'FORBIDDEN');assert.deepEqual(await readFile(new URL('../background/sync-lifecycle-configuration.js',import.meta.url)),originalConfig);assert.deepEqual(await readFile(new URL('../background/service-worker.js',import.meta.url)),worker);
});

const oneBinding={subject:'SYNTHETIC_subject',tenantId:'9188040d-6c67-4c5b-b112-36a304b66dad',clientId:'00000000-0000-0000-0000-000000000001',generation:'SYNTHETIC_generation',scopes:['Files.ReadWrite.AppFolder']};
function fakeOneDrive(){
 const files=new Map(),sessions=new Map(),requests=[];let n=0,losePut=false,losePost=false,root='SYNTHETIC_approot';const drive='SYNTHETIC_drive';
 const metadata=f=>({id:f.id,name:f.name,size:f.raw.length,file:{},parentReference:{id:root,driveId:drive},eTag:f.etag,'@microsoft.graph.downloadUrl':`https://synthetic.files.1drv.com/${f.id}?SYNTHETIC_secret=download`});
 const respond=(v,status=200)=>({status,body:encode(v)});
 const request=async r=>{
  requests.push(r);assert.equal(r.headers.Authorization,undefined);assert.deepEqual(r.binding,oneBinding);const u=new URL(r.url);
  if(u.hostname==='synthetic.up.1drv.com'){assert.equal(r.authorization,'none');assert.equal(r.method,'PUT');const session=sessions.get(u.pathname);assert.ok(session);assert.equal(r.headers['Content-Length'],String(r.body.length));assert.equal(r.headers['Content-Range'],`bytes 0-${r.body.length-1}/${r.body.length}`);if(files.has(session.name))return respond({},409);const f={id:'SYNTHETIC_file_'+(++n),name:session.name,raw:r.body.slice(),etag:'SYNTHETIC_tag_1'};files.set(f.name,f);if(losePut){losePut=false;throw Error('synthetic lost upload');}return respond(metadata(f),201);}
  if(u.hostname==='synthetic.files.1drv.com'){assert.equal(r.authorization,'none');assert.equal(r.method,'GET');const f=[...files.values()].find(f=>'/'+f.id===u.pathname);return f?{status:200,body:f.raw.slice()}:respond({},404);}
  assert.equal(u.origin,'https://graph.microsoft.com');assert.equal(r.authorization,'graph');
  if(u.pathname==='/v1.0/me/drive/special/approot')return respond({id:root,folder:{},specialFolder:{name:'approot'},parentReference:{driveId:drive}});
  const prefix='/v1.0/me/drive/items/'+root;
  if(u.pathname===prefix+'/children'){const all=[...files.values()],start=Number(u.searchParams.get('$skiptoken')||0),limit=Number(u.searchParams.get('$top')),next=new URL(r.url);next.searchParams.set('$skiptoken',String(start+limit));return respond({value:all.slice(start,start+limit).map(metadata),...(start+limit<all.length?{'@odata.nextLink':next.href}:{})});}
  assert.ok(u.pathname.startsWith(prefix+':/'));const name=u.pathname.slice((prefix+':/').length).replace(/:\/createUploadSession$/,'');
  if(u.pathname.endsWith(':/createUploadSession')){assert.equal(r.method,'POST');assert.deepEqual(JSON.parse(new TextDecoder().decode(r.body)),{item:{'@microsoft.graph.conflictBehavior':'fail',name},deferCommit:false});if(files.has(name))return respond({},409);const path='/SYNTHETIC_session_'+(++n);sessions.set(path,{name});if(losePost){losePost=false;throw Error('synthetic lost session');}return respond({uploadUrl:'https://synthetic.up.1drv.com'+path+'?SYNTHETIC_secret=upload',expirationDateTime:new Date(Date.now()+60000).toISOString()});}
  assert.equal(r.method,'GET');const f=files.get(name);return f?respond(metadata(f)):respond({},404);
 };
 return {files,sessions,requests,request,metadata,losePut(){losePut=true;},losePost(){losePost=true;},changeRoot(){root='SYNTHETIC_other';}};
}
test('OneDrive unknown session creation survives cold owner and never repeats POST without receipt',async t=>{
 const cloud=fakeOneDrive(),f=await configured(t,{cloud,provider:'onedrive',binding:oneBinding});let x=await f.open();await source(x);await command(x.owner,'RESUME');cloud.losePost();await assert.rejects(command(x.owner,'NOW'));const saved=await row(f),n=cloud.requests.length;x=await cold(f,x);assert.equal(cloud.requests.length,n);await assert.rejects(command(x.owner,'NOW'));assert.equal((await row(f)).task.id,saved.task.id);assert.equal(cloud.requests.filter(x=>x.method==='POST').length,1);assert.equal(cloud.requests.filter(x=>x.method==='PUT').length,0);assert.equal(cloud.files.size,0);
});
test('interrupted checkpoint stage retains exact reference and original restore task across cold continuation',async t=>{
 const cloud=fakeDrive(),a=new LibraryFoundationStore(local(),{indexedDB:new IDBFactory()});t.after(()=>a.repository.db?.close());await a.consent(true);await a.finishFoundation();const core=new BrowserNativeSyncCore(a.repository,{datasetId:'SYNTHETIC_google_data',deviceId:'SYNTHETIC_sender'});a.sourceBootstrapJournal=new SourceBootstrapJournal(core);await a.capture(capture((await a.status()).epoch));await buildCheckpoint(core,new GoogleDriveAppDataTransport(core,{binding,request:cloud.request,isCurrent:()=>true}),{grouped:{store:a}});
 const storage=local(),set=storage.set.bind(storage);let failRead=false;storage.set=async values=>{await set(values);if(values[ROW]?.task?.phase==='running'&&values[ROW]?.task?.reference)failRead=true;};const f=await configured(t,{cloud,storage,deviceId:'SYNTHETIC_receiver'});let x=await f.open();const baseline=await x.store.snapshot();f.conf.request=async r=>{if(failRead&&r.url.includes('alt=media')){failRead=false;throw Error('synthetic stage interruption');}return cloud.request(r);};await command(x.owner,'RESUME');await assert.rejects(command(x.owner,'RESTORE'));const saved=await row(f),n=cloud.requests.length;assert.ok(saved.task.reference);assert.equal(saved.task.phase,'unknown');assert.deepEqual((await x.store.snapshot()).records,baseline.records);storage.set=set;f.conf.request=cloud.request;x=await cold(f,x);assert.equal(cloud.requests.length,n);await command(x.owner,'CONTINUE');assert.equal((await row(f)).task.id,saved.task.id);assert.deepEqual((await row(f)).task.reference,saved.task.reference);assert.equal((await row(f)).task.phase,'confirmed');assert.deepEqual((await x.store.snapshot()).records,(await a.snapshot()).records);
});

test('configured capture owner always includes original permanent-denial journal',async t=>{const f=await configured(t),x=await f.open();assert.equal(x.store.sourcePurgeJournal?.core,x.core);});

test('Sync sender accepts canonical Topic arrival only and rejects query, arbitrary hash, incognito and nested frames',async()=>{
 const storage=local(),owner=await createConfiguredSyncLifecycle(null,api(storage));const url=topicRootURL('SYNTHETIC_topic','SYNTHETIC_section',sender.url);
 assert.equal((await owner.handle({type:'PAIA_SYNC_STATUS'},{...sender,url,frameId:0,tab:{incognito:false}})).state,'unavailable');
 for(const from of [{...sender,url:sender.url+'#unknown'},{...sender,url:url+'&topic=duplicate'},{...sender,url:sender.url+'?x=1'+new URL(url).hash},{...sender,frameId:1},{...sender,tab:{incognito:true}},{...sender,id:'other'}])await assert.rejects(owner.handle({type:'PAIA_SYNC_STATUS'},from),{code:'FORBIDDEN'});
 assert.equal((await storage.get(ROW))[ROW],undefined);
});

test('configured actions still require original consent; status and stop remain non-transferring',async t=>{
 const f=await configured(t,{consented:false}),x=await f.open();await assert.rejects(command(x.owner,'RESUME'),{code:'CONSENT_REQUIRED'});assert.equal((await command(x.owner,'STATUS')).state,'not-started');await command(x.owner,'PAUSE');assert.equal(f.cloud.requests.length,0);
});

test('explicit pause during original preparation fences its transaction checkpoint before any transfer',async t=>{
 const f=await configured(t),x=await f.open();await source(x);await command(x.owner,'RESUME');let enter,release;const entered=new Promise(r=>enter=r),wait=new Promise(r=>release=r),prepare=RecoverableCheckpointPublication.prototype.prepare;
 RecoverableCheckpointPublication.prototype.prepare=async function(...args){enter();await wait;return prepare.apply(this,args);};t.after(()=>{RecoverableCheckpointPublication.prototype.prepare=prepare;release();});
 const pending=command(x.owner,'NOW'),rejected=assert.rejects(pending,{code:'BNS_CHECKPOINT_PUBLICATION_INTERRUPTED'});await entered;await command(x.owner,'PAUSE');release();await rejected;assert.equal((await row(f)).mode,'paused');assert.equal(posts(f.cloud).length,0);assert.equal((await row(f)).task,null,'no replacement task or data write after pause');
});
