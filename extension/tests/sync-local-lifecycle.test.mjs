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
   if(saved){assert.equal(deletion.ok,true,JSON.stringify(deletion));await bridge.store.drainPurgeCleanup();await drains.idle();assert.equal((await bridge.store.snapshot()).records.length,0,'original legal local deletion is not blocked by an unrelated unresolved remote receipt');const retained=(await storage.get(ROW))[ROW];assert.deepEqual(retained.task,saved.task,'deletion neither replaces nor confirms the unknown task');assert.equal(posts(cloud).length,postCount);const next=await ui('NOW');assert.equal(next.ok,false);assert.equal((await storage.get(ROW))[ROW].task.id,saved.task.id);assert.equal(posts(cloud).length,postCount,'old cut cannot send deleted content after local purge');}
   else{assert.equal(deletion.ok,true,JSON.stringify(deletion));await bridge.store.drainPurgeCleanup();await drains.idle();const after=await bridge.store.repository.transaction(false,async tx=>Object.fromEntries(await Promise.all(bridge.store.repository.stores.map(async name=>[name,await tx.all(name)]))));assert.equal(after.records.length,0);assert.equal(after.filterInputs.length,0);assert.equal(after.filterIntents.length,0);assert.equal(JSON.stringify(after).includes(request.messages[0].originalText),false);assert.ok(sent.some(x=>x.cause==='PURGE_SOURCE'));}
  }
  if(enabled==='purge'){const before=posts(cloud).length,result=await ui('NOW');assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.data.task.phase,'confirmed');assert.ok(posts(cloud).length>before,'original complete negative plus portable checkpoint publishes');assert.equal(result.data.wholeArchiveComplete,false);}
  else if(enabled!=='purge-unknown'){const published=await ui('NOW');assert.equal(published.ok,true,JSON.stringify(published));assert.equal(published.data.task.phase,'confirmed');assert.equal(published.data.wholeArchiveComplete,false);assert.ok(cloud.files.size>0);assert.equal(sent.some(x=>x.cause==='PAIA_SYNC_NOW'),false);}
  if(enabled==='purge-unknown')await ui('STATUS');const n=cloud.requests.length;assert.equal((await ui('PAUSE')).data.state,'paused');startup.emit();await Promise.resolve();await bridge.store.tail;assert.equal(cloud.requests.length,n);suspend.emit();assert.equal((await bridge.sync.snapshot()).state,'suspended');cancel.emit();await Promise.resolve();await bridge.sync.resumeAfterSuspend();assert.equal((await bridge.sync.snapshot()).state,'paused');assert.equal(cloud.requests.length,n);
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

import {ConsumerPreferenceSyncJournal} from '../core/browser-native-sync/consumer-preference-journal.js';
test('explicit pause during enrollment wins over an earlier Resume and refuses simultaneous enrollment',async t=>{
 const f=await configured(t),x=await f.open();let enter,release;const entered=new Promise(r=>enter=r),wait=new Promise(r=>release=r),bootstrap=ConsumerPreferenceSyncJournal.prototype.bootstrap;
 ConsumerPreferenceSyncJournal.prototype.bootstrap=async function(...args){enter();await wait;return bootstrap.apply(this,args);};t.after(()=>{ConsumerPreferenceSyncJournal.prototype.bootstrap=bootstrap;release();});
 const pending=command(x.owner,'RESUME'),rejected=assert.rejects(pending,{code:'BNS_RECOVERY_INTERRUPTED'});await entered;await assert.rejects(command(x.owner,'RESUME'),{code:'BNS_SYNC_BUSY'});await command(x.owner,'PAUSE');release();await rejected;assert.equal((await row(f)).mode,'paused');assert.equal((await x.owner.snapshot()).busy,false);assert.equal(f.cloud.requests.length,0);assert.equal((await row(f)).task,null);
});

import {SourcePurgeJournal} from '../core/browser-native-sync/source-purge-journal.js';
import {sourcePurgeRestoreKey} from '../core/browser-native-sync/source-purge-protocol-controls.js';
async function negativeContinuation(t,{extraPositive=false}={}){
 const cloud=fakeDrive(),a=new LibraryFoundationStore(local(),{indexedDB:new IDBFactory()});t.after(()=>a.repository.db?.close());await a.consent(true);await a.finishFoundation();
 const core=new BrowserNativeSyncCore(a.repository,{datasetId:'SYNTHETIC_google_data',deviceId:'SYNTHETIC_negative_sender'});a.sourceBootstrapJournal=new SourceBootstrapJournal(core);a.sourcePurgeJournal=new SourcePurgeJournal(core);
 for(let n=0;n<2;n++){const q=capture((await a.status()).epoch,'SYNTHETIC_negative_message_'+n,'SYNTHETIC negative Source '+n);q.chat={id:'SYNTHETIC_negative_chat_'+n,url:'https://chatgpt.com/c/SYNTHETIC_negative_chat_'+n,title:'SYNTHETIC negative '+n};await a.capture(q);}
 const originals=(await a.snapshot()).records,publisher=new RecoverableCheckpointPublication(core,{store:a,binding:{...binding,provider:'google-drive-appdata'},request:cloud.request,isCurrent:()=>true});
 await a.purge(originals[0].id,true);await a.drainPurgeCleanup();await publisher.prepare();const first=await publisher.publish(),f=await configured(t,{cloud,deviceId:'SYNTHETIC_negative_receiver'});let x=await f.open();await command(x.owner,'RESUME');
 const transaction=x.store.repository.transaction;let aborted=0;x.store.repository.transaction=function(write,fn,stores){return transaction.call(this,write,async tx=>{const result=await fn(tx);if(write&&result?.state==='activated'&&!aborted++){throw Error('SYNTHETIC interrupted negative activation');}return result;},stores);};
 try{await assert.rejects(command(x.owner,'RESTORE'),{code:'STORAGE_FAILED'});}finally{x.store.repository.transaction=transaction;}
 assert.equal(aborted,1);const saved=await row(f),held=await x.core.transaction(false,tx=>tx.get('meta',sourcePurgeRestoreKey(x.core,saved.task.id)));assert.equal(held.phase,'validated');assert.equal(held.version,1);assert.equal((await x.store.snapshot()).records.length,0);
 await a.purge(originals[1].id,true);await a.drainPurgeCleanup();if(extraPositive){const q=capture((await a.status()).epoch,'SYNTHETIC_extra_positive','SYNTHETIC unsupported tail addition');q.chat={id:'SYNTHETIC_extra_chat',url:'https://chatgpt.com/c/SYNTHETIC_extra_chat',title:'SYNTHETIC extra'};await a.capture(q);}await publisher.prepare();const last=await publisher.publish();publisher.close();await a.repository.close();x=await cold(f,x);
 return {f,x,first,last,saved,originals};
}
test('trusted CONTINUE advances the same validated negative task to its real second-purge descendant',async t=>{
 const {f,x,last,saved}=await negativeContinuation(t);let materialized=0;const apply=x.store.applyInitialSource;x.store.applyInitialSource=async function(...args){materialized++;return apply.apply(this,args);};await command(x.owner,'CONTINUE');assert.equal(materialized,0,'no ancestor Source application may occur even transiently');assert.equal((await x.store.snapshot()).records.length,0,'the second permanently ignored Source must never be materialized from the pinned ancestor');
 const state=await row(f);assert.equal(state.task.id,saved.task.id);assert.equal(state.task.phase,'confirmed');assert.deepEqual(state.task.reference,last.ref);const data=await x.core.transaction(false,tx=>tx.all('tombstones'));assert.equal(data.length,2);assert.ok(data.every(r=>r.value.status==='permanently_ignored'));
});
const negativeStage=(x,id)=>x.core.transaction(false,tx=>tx.get('meta',sourcePurgeRestoreKey(x.core,id)));
for(const failure of ['candidate-saved','candidate-not-saved','tail-ack-lost','confirmation-not-saved','confirmation-ack-lost'])test('trusted negative CONTINUE preserves two-store outcome through '+failure+' and cold retry',async t=>{
 const f0=await negativeContinuation(t),{f,last,first,saved}=f0;let x=f0.x,hit=0;const set=f.storage.set.bind(f.storage),transaction=x.store.repository.transaction;
 if(failure==='tail-ack-lost')x.store.repository.transaction=function(write,fn,stores){return transaction.call(this,write,fn,stores).then(async result=>{if(write&&!hit&&(await transaction.call(this,false,tx=>tx.get('meta',sourcePurgeRestoreKey(x.core,saved.task.id)),['meta']))?.manifestRef.id===last.ref.id){hit++;throw Error('SYNTHETIC lost durable negative tail acknowledgement');}return result;});};
 else f.storage.set=async values=>{const task=values[ROW]?.task,selected=task?.reference?.id===last.ref.id&&task.phase==='running',confirmed=task?.reference?.id===last.ref.id&&task.phase==='confirmed',match=failure.startsWith('candidate')?selected:confirmed;if(!hit&&match){hit++;if(failure.endsWith('not-saved'))throw Error('SYNTHETIC original lifecycle write refused');await set(values);if(failure==='candidate-saved')f.setCurrent(false);else throw Error('SYNTHETIC original lifecycle acknowledgement lost');return;}return set(values);};
 if(failure!=='tail-ack-lost')x=await cold(f,x);
 try{if(failure==='confirmation-ack-lost')await command(x.owner,'CONTINUE');else await assert.rejects(command(x.owner,'CONTINUE'));}finally{f.storage.set=set;x.store.repository.transaction=transaction;f.setCurrent(true);}
 assert.equal(hit,1);const task=(await row(f)).task,stage=await negativeStage(x,saved.task.id);assert.equal(task.id,saved.task.id);
 if(failure==='candidate-not-saved'){assert.deepEqual(task.reference,first.ref);assert.deepEqual(stage.manifestRef,first.ref);}else assert.deepEqual(task.reference,last.ref);
 if(failure==='candidate-saved'){assert.deepEqual(stage.manifestRef,first.ref);assert.equal((await x.store.snapshot()).records.length,0);}
 if(failure==='tail-ack-lost'){assert.deepEqual(stage.manifestRef,last.ref);assert.equal(stage.phase,'validated');assert.equal((await x.store.snapshot()).records.length,0);}
 if(failure.startsWith('confirmation')){assert.equal(stage.phase,'activated');assert.equal((await x.core.transaction(false,tx=>tx.all('tombstones'))).length,2);}
 x=await cold(f,x);await command(x.owner,'CONTINUE');assert.equal((await row(f)).task.id,saved.task.id);assert.equal((await row(f)).task.phase,'confirmed');assert.deepEqual((await row(f)).task.reference,last.ref);assert.equal((await x.store.snapshot()).records.length,0);assert.equal((await x.core.transaction(false,tx=>tx.all('tombstones'))).length,2);
});
test('trusted negative CONTINUE refuses an authenticated unsupported positive addition before replacing either binding',async t=>{
 const {f,x,first,saved}=await negativeContinuation(t,{extraPositive:true}),before=await negativeStage(x,saved.task.id);await assert.rejects(command(x.owner,'CONTINUE'),{code:'BNS_GROUP_TAIL_INVALID'});assert.deepEqual((await row(f)).task.reference,first.ref);assert.deepEqual(await negativeStage(x,saved.task.id),before);assert.equal((await x.store.snapshot()).records.length,0);assert.equal((await x.core.transaction(false,tx=>tx.all('tombstones'))).length,0);
});

test('trusted negative CONTINUE and PAUSE settle promptly when candidate storage acknowledgement is held',async t=>{
 const fixture=await negativeContinuation(t),{f,last,saved}=fixture;let x=fixture.x,enter,release,hit=0,settled=false;const set=f.storage.set.bind(f.storage),entered=new Promise(r=>enter=r),waiting=new Promise(r=>release=r);
 f.storage.set=async values=>{if(values[ROW]?.task?.reference?.id===last.ref.id&&values[ROW]?.task?.phase==='running'&&!hit++){enter();await waiting;}return set(values);};x=await cold(f,x);
 const pending=command(x.owner,'CONTINUE').then(value=>{settled=true;return {value};},error=>{settled=true;return {error};});await entered;const paused=command(x.owner,'PAUSE').catch(error=>({error}));
 let early;try{await new Promise(r=>setTimeout(r,150));early=settled;assert.equal((await x.owner.snapshot()).state,'settlement-unknown');assert.equal((await negativeStage(x,saved.task.id)).phase,'validated');assert.equal((await x.store.snapshot()).records.length,0);}finally{release();await pending;await paused;f.storage.set=set;}
 assert.equal(early,true,'cancellation must not queue another write behind the uncertain candidate set');x=await cold(f,x);await command(x.owner,'CONTINUE');assert.equal((await row(f)).task.phase,'confirmed');assert.equal((await x.core.transaction(false,tx=>tx.all('tombstones'))).length,2);
});


import {ContextCardsService} from '../core/context-cards.js';
const attachContext=async x=>{const service=new ContextCardsService(x.store);await x.owner.attachContextService(service);return service;};
const enrollmentTables=x=>x.store.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(x.store.repository.stores.map(async name=>[name,await t.all(name)]))));
for(const mutation of ['absent','database','namespace','epoch','physical-namespace','physical-epoch','nonempty','access','binding','generation'])test('cold empty Context enrollment refuses '+mutation+' without enrolling from active mode or repairing its receipt',async t=>{
 const f=await configured(t),x=await f.open();await attachContext(x);await command(x.owner,'RESUME');const enrolled=await row(f);assert.ok(enrolled.contextEnrollment);const changed=structuredClone(enrolled);
 if(mutation==='absent')delete changed.contextEnrollment;
 if(mutation==='database')changed.contextEnrollment.databaseId='SYNTHETIC_foreign_database';
 if(mutation==='namespace')changed.contextEnrollment.namespace='SYNTHETIC_foreign_namespace';
 if(mutation==='epoch')changed.contextEnrollment.epoch='SYNTHETIC_foreign_restore_epoch';
 if(mutation==='binding')changed.bindingId='a'.repeat(64);
 if(mutation==='generation')changed.generation='b'.repeat(64);
 if(mutation==='physical-namespace')await x.core.transaction(true,t=>t.put('meta',{id:x.core.prefix+'active',namespace:'SYNTHETIC_next_namespace'}),['meta']);
 if(mutation==='physical-epoch')await x.core.transaction(true,async t=>{await t.put('meta',{id:'recovery-restore-epoch',value:'SYNTHETIC_next_restore_epoch'});await x.core.put(t,'ownerRecoveryEpoch',[],{version:1,epoch:'SYNTHETIC_next_restore_epoch'});},['meta']);
 if(mutation==='nonempty'||mutation==='access'){const plain=new ContextCardsService(x.store);await plain.change(mutation==='access'?{kind:'access',operationId:crypto.randomUUID(),epoch:'initial',key:'global',enabled:true,expectedRevision:0}:{kind:'put',operationId:crypto.randomUUID(),epoch:'initial',itemId:crypto.randomUUID(),expectedRevision:0,body:'SYNTHETIC unmanaged item',section:'SYNTHETIC',card:'info'});}
 await f.storage.set({[ROW]:changed});const y=await cold(f,x),before=await enrollmentTables(y),saved=await row(f),service=await attachContext(y);assert.equal(service.syncJournal,null);assert.equal((await command(y.owner,'STATUS')).needsContextEnrollment,true);assert.deepEqual(await row(f),saved);assert.deepEqual(await enrollmentTables(y),before);assert.equal(f.cloud.requests.length,0);
 if(!['binding','generation'].includes(mutation))await assert.rejects(command(y.owner,'NOW'),e=>e.code==='BNS_CONTEXT_BOOTSTRAP_REQUIRED');
});
for(const corruption of ['version','extra','missing','epoch-type'])test('malformed empty Context enrollment '+corruption+' fails closed before cold attachment',async t=>{
 const f=await configured(t),x=await f.open();await attachContext(x);await command(x.owner,'RESUME');const saved=await row(f);
 if(corruption==='version')saved.contextEnrollment.version=2;
 if(corruption==='extra')saved.contextEnrollment.enabled=true;
 if(corruption==='missing')delete saved.contextEnrollment.epoch;
 if(corruption==='epoch-type')saved.contextEnrollment.epoch={value:'SYNTHETIC'};
 await f.storage.set({[ROW]:saved});const before=await enrollmentTables(x);await assert.rejects(cold(f,x),e=>e.code==='BNS_SYNC_STATE_CORRUPT');assert.deepEqual(await row(f),saved);assert.equal(f.cloud.requests.length,0);const store=new LibraryFoundationStore(f.storage,{indexedDB:f.factory});await store.finishFoundation();assert.deepEqual(await enrollmentTables({store}),before);await store.repository.close();
});


test('empty enrollment ignores substituted public Store.run rather than accepting forged or delayed snapshots',async t=>{
 const f=await configured(t),x=await f.open();await attachContext(x);await command(x.owner,'RESUME');const enrolled=await row(f),y=await cold(f,x),plain=new ContextCardsService(y.store);await plain.change({kind:'put',operationId:crypto.randomUUID(),epoch:'initial',itemId:crypto.randomUUID(),expectedRevision:0,body:'SYNTHETIC unmanaged content',section:'SYNTHETIC',card:'info'});
 let calls=0;y.store.run=async()=>{calls++;return structuredClone(enrolled.contextEnrollment);};const before=await enrollmentTables(y),service=await attachContext(y);assert.equal(service.syncJournal,null);assert.equal(calls,0);assert.equal((await y.owner.snapshot()).needsContextEnrollment,true);assert.deepEqual(await enrollmentTables(y),before);assert.deepEqual(await row(f),enrolled);
});

import {IDBObjectStore} from './vendor/fake-indexeddb/build/esm/index.js';
for(const during of ['host','lifecycle'])test('held original readonly empty proof cannot attach after '+during+' changes',async t=>{
 const f=await configured(t),x=await f.open();await attachContext(x);await command(x.owner,'RESUME');const y=await cold(f,x),service=new ContextCardsService(y.store),get=IDBObjectStore.prototype.get;let reads=0,enter,release,released=false;
 const entered=new Promise(r=>enter=r),held=new Promise(r=>release=()=>{released=true;r();});
 IDBObjectStore.prototype.get=function(key){const request=get.call(this,key);if(this.name==='meta'&&key==='context-cards:v1'&&++reads===2){const store=this;Object.defineProperty(request,'onsuccess',{configurable:true,set(callback){request.addEventListener('success',event=>{const keepAlive=()=>{if(released)return;const next=get.call(store,'SYNTHETIC_readonly_hold');next.onsuccess=keepAlive;};keepAlive();enter();void held.then(()=>callback.call(request,event));},{once:true});}});}return request;};
 try{const attaching=y.owner.attachContextService(service);await entered;if(during==='host')f.setCurrent(false);else await command(y.owner,'PAUSE');release();await attaching;assert.equal(service.syncJournal,null);assert.equal((await y.owner.snapshot()).needsContextEnrollment,true);assert.equal(f.cloud.requests.length,0);}finally{release();IDBObjectStore.prototype.get=get;}
});


import {readOriginalLifecycleV1} from './fixtures/sync-lifecycle-v1-reader.mjs';
test('original v1 reader fails closed; explicit paused rollback removes only the local optional receipt and preserves original data/tasks',async t=>{
 const f=await configured(t),x=await f.open();await attachContext(x);await command(x.owner,'RESUME');await command(x.owner,'PAUSE');const paused=await row(f),before=await enrollmentTables(x);assert.ok(paused.contextEnrollment);assert.throws(()=>readOriginalLifecycleV1(paused),e=>e.code==='BNS_SYNC_STATE_CORRUPT');
 // Model an explicitly requested paused rollback, never startup/status repair.
 const rollback=structuredClone(paused);delete rollback.contextEnrollment;assert.deepEqual(readOriginalLifecycleV1(rollback),rollback);await f.storage.set({[ROW]:rollback});const y=await cold(f,x),service=await attachContext(y);assert.equal(service.syncJournal,null);assert.equal((await command(y.owner,'STATUS')).state,'paused');assert.equal((await y.owner.snapshot()).needsContextEnrollment,true);assert.deepEqual(await row(f),rollback);assert.deepEqual(await enrollmentTables(y),before);assert.equal(f.cloud.requests.length,0);
 assert.deepEqual({...rollback,contextEnrollment:paused.contextEnrollment},paused);
});

// Exercise the mounted Settings handlers against the original lifecycle owner,
// not a reimplementation of its stop/consent/task rules.
function mountedOwner(t,owner){
 const previous={document:globalThis.document,chrome:globalThis.chrome},body=new PresentationNode('body'),calls=[];let pending;
 const make=tag=>{const n=new PresentationNode(tag);if(tag==='dialog'){n.showModal=()=>n.open=true;n.close=()=>{n.open=false;n.listeners.get('close')?.();};}return n;};
 globalThis.document={body,documentElement:{lang:'en'},getElementById:id=>id==='settings-panel'?{hidden:false}:null,createElement:make,createElementNS:(_ns,tag)=>make(tag)};
 globalThis.chrome={runtime:{sendMessage:message=>{calls.push(message);return pending=owner.handle(message,sender).then(data=>({ok:true,data}),error=>({ok:false,error:syncLifecycleError(error)}));}}};
 const detail=mountSettingsSync({mountDetail:mountSettingsDetail,language:()=> 'en'});body.append(detail.row);t.after(()=>{detail.dialog.close();globalThis.document=previous.document;globalThis.chrome=previous.chrome;});
 const button=command=>detail.dialog.children[1].children.flatMap(n=>n.children??[]).find(n=>n.dataset.syncCommand===command),settle=async()=>{const value=await pending;await new Promise(r=>setImmediate(r));return value;};
 return {detail,calls,button,open:async()=>{detail.row.listeners.get('click')();return settle();},start:command=>{const b=button(command);assert.ok(b&&!b.hidden&&!b.disabled,'mounted owner '+command+' is actionable');b.listeners.get('click')();return pending;},settle};
}
for(const stop of ['PAUSE','DISCONNECT'])test(`mounted Settings ${stop} stops held original publication with no extra transfer or task replacement`,async t=>{
 const f=await configured(t),x=await f.open();await source(x);await command(x.owner,'RESUME');const ui=mountedOwner(t,x.owner);await ui.open();
 let enter,release,held=false;const entered=new Promise(r=>enter=r),gate=new Promise(r=>release=r);t.after(()=>release());
 f.conf.request=async r=>{const result=await f.cloud.request(r);if(r.method==='POST'&&!held){held=true;enter();await gate;}return result;};
 const operation=ui.start('NOW');await entered;const original=await row(f),requests=f.cloud.requests.length;
 const stopped=await ui.start(stop);await ui.settle();assert.equal(stopped.ok,true);assert.equal(stopped.data.busy,true);assert.equal(stopped.data.state,stop==='PAUSE'?'paused':'disconnected');assert.equal((await row(f)).task.id,original.task.id);assert.equal(f.cloud.requests.length,requests);
 for(const name of ['NOW','RESTORE','RESUME','CONTINUE']){assert.equal(ui.button(name).hidden,true);ui.button(name).listeners.get('click')();}assert.equal(ui.calls.length,3);
 release();assert.equal((await operation).ok,false);await new Promise(r=>setImmediate(r));assert.match(ui.detail.dialog.textContent,stop==='PAUSE'?/Transfers are paused/:/This device is disconnected/);assert.equal(f.cloud.requests.length,requests);assert.equal((await row(f)).task.id,original.task.id);
 await ui.start('STATUS');await ui.settle();assert.equal(ui.button('RESUME').hidden,stop==='DISCONNECT');assert.equal(f.cloud.requests.length,requests);
 if(stop==='PAUSE'){
  assert.equal((await ui.start('RESUME')).ok,true);await ui.settle();assert.equal((await row(f)).task.id,original.task.id);assert.equal(f.cloud.requests.length,requests,'explicit resume alone never transfers');
 }
 assert.ok(ui.calls.every(message=>Object.keys(message).length===1));
});
test('mounted Settings stop does not grant consent and explicit resume still needs the original consent owner',async t=>{
 const f=await configured(t,{consented:false}),x=await f.open();await command(x.owner,'PAUSE');const ui=mountedOwner(t,x.owner);await ui.open();
 assert.equal((await ui.start('RESUME')).error,'CONSENT_REQUIRED');await ui.settle();assert.equal((await row(f)).mode,'paused');assert.equal(f.cloud.requests.length,0);
 await ui.start('STATUS');await ui.settle();await x.store.consent(true);assert.equal((await ui.start('RESUME')).ok,true);await ui.settle();assert.equal((await row(f)).mode,'active');assert.equal(f.cloud.requests.length,0);
});
for(const stop of ['PAUSE','DISCONNECT'])test(`mounted Settings ${stop} stops held original restore without applying data or replacing its task`,async t=>{
 const cloud=fakeDrive(),sourceStore=new LibraryFoundationStore(local(),{indexedDB:new IDBFactory()});t.after(()=>sourceStore.repository.db?.close());await sourceStore.consent(true);await sourceStore.finishFoundation();
 const sourceCore=new BrowserNativeSyncCore(sourceStore.repository,{datasetId:'SYNTHETIC_google_data',deviceId:'SYNTHETIC_stop_sender'});sourceStore.sourceBootstrapJournal=new SourceBootstrapJournal(sourceCore);await sourceStore.capture(capture((await sourceStore.status()).epoch));await buildCheckpoint(sourceCore,new GoogleDriveAppDataTransport(sourceCore,{binding,request:cloud.request,isCurrent:()=>true}),{grouped:{store:sourceStore}});
 const f=await configured(t,{cloud,deviceId:'SYNTHETIC_stop_receiver'}),x=await f.open();await command(x.owner,'RESUME');const baseline=await x.store.snapshot(),ui=mountedOwner(t,x.owner);await ui.open();
 let enter,release,held=false;const entered=new Promise(r=>enter=r),gate=new Promise(r=>release=r);t.after(()=>release());
 f.conf.request=async r=>{const result=await cloud.request(r);if(r.url.includes('alt=media')&&!held){held=true;enter();await gate;}return result;};
 const operation=ui.start('RESTORE');await entered;const original=await row(f),requests=cloud.requests.length;assert.equal((await ui.start(stop)).ok,true);await ui.settle();assert.equal((await row(f)).task.id,original.task.id);assert.equal(cloud.requests.length,requests);
 release();assert.equal((await operation).ok,false);await new Promise(r=>setImmediate(r));assert.match(ui.detail.dialog.textContent,stop==='PAUSE'?/Transfers are paused/:/This device is disconnected/);assert.deepEqual((await x.store.snapshot()).records,baseline.records);assert.equal(cloud.requests.length,requests);assert.equal((await row(f)).task.id,original.task.id);assert.equal(ui.calls.length,3);
});
