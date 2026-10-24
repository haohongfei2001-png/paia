import test from 'node:test';
import assert from 'node:assert/strict';
import {cp,readFile,writeFile,mkdir,mkdtemp,symlink,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {local,capture} from './harness/thought-m1.mjs';
import {toolbarRegistrationFixture} from './harness/toolbar-registration.mjs';
import {observeLocalWorkerDrains} from './harness/local-worker-drains.mjs';
import {fakeGoogleCheckpointHTTP} from './harness/checkpoint-publication-http.mjs';
import {GOOGLE_APPDATA_SCOPE} from '../core/browser-native-sync/providers/google-drive.js';
import {readObject} from '../core/browser-native-sync/segments.js';
import {bytes} from '../core/browser-native-sync/value.js';
const ROOT=fileURLToPath(new URL('../..',import.meta.url)),ROW='paia-sync-local-lifecycle:v1';
const binding={subject:'SYNTHETIC_union_worker_subject',clientId:'000000000000-synthetic.apps.googleusercontent.com',generation:'SYNTHETIC_union_worker_generation',scopes:[GOOGLE_APPDATA_SCOPE]};
const sender={id:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',url:'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/ui/archive.html'};
const ordered=values=>[...values].sort((a,b)=>(a.id??a.revisionId).localeCompare(b.id??b.revisionId));
const operations=async core=>{const result=[];for await(const row of core.rows('revision'))result.push(row.operation);return ordered(result);};
async function assertOriginalReceipts(core,expected){const rows=[];for await(const row of core.rows('receipt'))rows.push(row);assert.equal(rows.length,expected.length);await core.transaction(false,async t=>{for(const op of expected){const row=await core.get(t,'receipt',op.operationId),{id,...value}=row;assert.deepEqual(value,{digest:op.revisionId,deviceId:op.deviceId,sequence:op.sequence});}},['meta']);}
const records=async worker=>ordered((await worker.store.snapshot()).records);
const event=()=>({listeners:[],addListener(fn){this.listeners.push(fn);},emit(){for(const fn of this.listeners)fn();}});

// The actual service worker and original command handlers run unchanged except
// for a disposable static read-only bridge. The fixture config is not shipped.
// IDB and provider HTTP are synthetic; no native browser or fetch is used.
// Cold A/B/C publication explicitly calls the existing RESUME command to attach
// original empty Prompt/Context owners. This is not automatic enrollment and
// does not claim qualification of an unchanged no-added-RESUME route.
async function workerHarness(t,cloud){
 const previous={chrome:globalThis.chrome,indexedDB:globalThis.indexedDB,IDBKeyRange:globalThis.IDBKeyRange,fetch:globalThis.fetch},paths=[],keys=[],workers=[];
 const originalWorker=await readFile(new URL('../background/service-worker.js',import.meta.url)),originalConfig=await readFile(new URL('../background/sync-lifecycle-configuration.js',import.meta.url));
 const drains=observeLocalWorkerDrains();let network=0;
 globalThis.IDBKeyRange=IDBKeyRange;globalThis.fetch=async()=>{network++;throw Error('Unexpected external network in synthetic union RPC fixture');};
 const root=join(ROOT,'work','sync-source-union-worker-fixtures');await mkdir(root,{recursive:true});
 const device=name=>({name,storage:local(),factory:new IDBFactory(),request:cloud.request,seeded:false});
 async function open(device){
  const path=await mkdtemp(join(root,'worker-')),key='sync_union_worker_'+crypto.randomUUID();paths.push(path);keys.push(key);
  await cp(join(ROOT,'extension','background'),join(path,'background'),{recursive:true});await symlink(join(ROOT,'extension','core'),join(path,'core'),'dir');await writeFile(join(path,'package.json'),'{"type":"module"}');
  await writeFile(join(path,'background','service-worker.js'),Buffer.concat([originalWorker,Buffer.from(`\nglobalThis[${JSON.stringify(key+'_bridge')}]={ready,get store(){return store;},get sync(){return syncLifecycle;}};\n`)]));
  let active=true;globalThis[key]={provider:'google-drive',datasetId:'SYNTHETIC_union_worker_dataset',deviceId:'SYNTHETIC_union_worker_'+device.name,binding,request:r=>device.request(r),isCurrent:()=>active};
  await writeFile(join(path,'background','sync-lifecycle-configuration.js'),`export function readSyncLifecycleConfiguration(){return globalThis[${JSON.stringify(key)}];}\n`);
  if(!device.seeded){const seed=new LibraryDocumentsStore(device.storage,{indexedDB:device.factory});await seed.consent(true);await seed.finishFoundation();await seed.repository.close();device.seeded=true;}
  const startup=event(),suspend=event(),cancel=event(),sent=[];let listener,release;const gate=new Promise(r=>release=r);
  const api={runtime:{id:sender.id,getManifest:()=>({version:'0.55.0'}),getURL:p=>'chrome-extension://'+sender.id+'/'+p,sendMessage:message=>{sent.push(message);return Promise.resolve();},onMessage:{addListener:fn=>listener=fn},onStartup:startup,onSuspend:suspend,onSuspendCanceled:cancel},storage:{local:{...device.storage,setAccessLevel:()=>gate}}};toolbarRegistrationFixture(api);
  globalThis.chrome=api;globalThis.indexedDB=device.factory;
  await import(pathToFileURL(join(path,'background/service-worker.js')));const bridge=globalThis[key+'_bridge'];assert.equal(typeof listener,'function');assert.ok(startup.listeners.length);assert.ok(suspend.listeners.length);assert.ok(cancel.listeners.length);assert.equal(bridge.store,undefined);
  const rpc=(type,extra={},from=sender)=>{globalThis.chrome=api;globalThis.indexedDB=device.factory;return new Promise(resolve=>listener({type,...extra},from,resolve));};
  const count=cloud.requests.length,waiting=rpc('PAIA_SYNC_STATUS');release();await bridge.ready;await drains.idle();const status=await waiting;assert.equal(status.ok,true,JSON.stringify(status));assert.equal(cloud.requests.length,count,'cold construction/status must not transfer');
  const instance={device,rpc,sent,store:bridge.store,core:bridge.store.sourceBootstrapJournal.core,closed:false,async close(){if(this.closed)return;globalThis.chrome=api;globalThis.indexedDB=device.factory;suspend.emit();active=false;await drains.idle();await bridge.store.repository.close();this.closed=true;}};workers.push(instance);return instance;
 }
 t.after(async()=>{try{for(const worker of workers)await worker.close();await drains.idle();drains.dispose();assert.equal(network,0);assert.deepEqual(await readFile(new URL('../background/service-worker.js',import.meta.url)),originalWorker);assert.deepEqual(await readFile(new URL('../background/sync-lifecycle-configuration.js',import.meta.url)),originalConfig);}finally{Object.assign(globalThis,previous);for(const key of keys){delete globalThis[key];delete globalThis[key+'_bridge'];}for(const path of paths)await rm(path,{recursive:true,force:true});}});
 return {device,open,drains};
}
async function command(worker,type){const result=await worker.rpc('PAIA_SYNC_'+type);assert.equal(result.ok,true,JSON.stringify(result));return result.data;}
async function captureSource(worker,name,drains){
 const request=capture((await worker.store.status()).epoch,'SYNTHETIC_message_'+name,'SYNTHETIC exact '+name+' 中文🙂\nline two');request.chat={id:'SYNTHETIC_chat_'+name,url:'https://chatgpt.com/c/SYNTHETIC_chat_'+name,title:'SYNTHETIC '+name};
 const content={id:sender.id,url:request.chat.url,tab:{id:1,url:request.chat.url,incognito:false},frameId:0},result=await worker.rpc('CAPTURE',{...request,contentVersion:'0.55.0'},content);assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.data.added,1);await drains.idle();
}
const state=device=>device.storage.get(ROW).then(value=>value[ROW]);
const writes=cloud=>cloud.requests.filter(r=>['POST','PUT'].includes(r.method)).length;
async function manifest(cloud,ref){const file=[...cloud.files.values()].find(file=>file.appProperties?.paiaDigest===ref.id);assert.ok(file,'actual published immutable object');return JSON.parse(new TextDecoder().decode(await readObject(ref,async()=>file.raw.slice())));}
// Model two peers completing against the same genuine ancestor listing. Both
// write into one immutable synthetic service; the second peer's listing view
// retains its original snapshot plus its own uploads until the fork is exposed.
// No checkpoint/operation/parent is synthesized by the fixture.
function forkListing(cloud,visible){return async request=>{const before=new Set(cloud.files.keys()),result=await cloud.request(request);for(const id of cloud.files.keys())if(!before.has(id))visible.add(id);const url=new URL(request.url);if(request.method==='GET'&&url.pathname==='/drive/v3/files'){const body=JSON.parse(new TextDecoder().decode(result.body));body.files=body.files.filter(file=>visible.has(file.id));return {...result,body:bytes(body)};}return result;};}

test('actual worker RPC A/B forks restore on cold C, publish both real parents, and restore exact union on cold D',async t=>{
 const cloud=fakeGoogleCheckpointHTTP(binding),h=await workerHarness(t,cloud),A=h.device('A'),B=h.device('B'),C=h.device('C'),D=h.device('D');
 let a=await h.open(A);await command(a,'RESUME');await captureSource(a,'ancestor',h.drains);assert.equal((await command(a,'NOW')).task.phase,'confirmed');const ancestor=(await state(A)).task.reference,initialFiles=new Set(cloud.files.keys());assert.deepEqual((await manifest(cloud,ancestor)).parents,[]);await a.close();
 let b=await h.open(B);await command(b,'RESUME');assert.equal((await command(b,'RESTORE')).task.phase,'confirmed');assert.equal((await records(b)).length,1);await captureSource(b,'right',h.drains);const bRecords=await records(b),bOperations=await operations(b.core);await b.close();
 a=await h.open(A);await command(a,'RESUME');await captureSource(a,'left',h.drains);const aRecords=await records(a),aOperations=await operations(a.core);assert.equal((await command(a,'NOW')).task.phase,'confirmed');const left=(await state(A)).task.reference;assert.deepEqual((await manifest(cloud,left)).parents,[ancestor.id]);await a.close();
 B.request=forkListing(cloud,initialFiles);b=await h.open(B);await command(b,'RESUME');assert.equal((await command(b,'NOW')).task.phase,'confirmed');const right=(await state(B)).task.reference;assert.deepEqual((await manifest(cloud,right)).parents,[ancestor.id]);assert.notEqual(right.id,left.id);await b.close();B.request=cloud.request;
 const expectedRecords=ordered(new Map([...aRecords,...bRecords].map(row=>[row.id,row])).values()),expectedOperations=ordered(new Map([...aOperations,...bOperations].map(op=>[op.revisionId,op])).values());assert.equal(expectedRecords.length,3);assert.equal(expectedOperations.length,21);
 const beforeRecovery=writes(cloud);let c=await h.open(C);await command(c,'RESUME');const recovered=await command(c,'RESTORE'),selected=await state(C);assert.equal(recovered.task.phase,'confirmed');assert.equal(recovered.wholeArchiveComplete,false);assert.equal(recovered.productionActivation,false);assert.equal(selected.task.kind,'restore');assert.equal(selected.task.reference.kind,'source-bootstrap-union');assert.equal(selected.task.reference.id,undefined);assert.deepEqual(selected.task.reference.headRefs.map(ref=>ref.id),[left.id,right.id].sort());assert.equal(selected.task.reference.ancestorRef.id,ancestor.id);assert.equal(writes(cloud),beforeRecovery,'restoration cannot publish a fake remote checkpoint');
 assert.deepEqual(await records(c),expectedRecords);assert.deepEqual(await operations(c.core),expectedOperations);await assertOriginalReceipts(c.core,expectedOperations);assert.deepEqual(c.sent.filter(message=>message.cause==='PAIA_SYNC_RESTORE'),[{type:'ARCHIVE_CHANGED',cause:'PAIA_SYNC_RESTORE'}]);
 const active=await c.core.transaction(false,t=>t.get('meta',c.core.prefix+'active'));assert.equal(active.restoreId,selected.task.id);assert.deepEqual(active.selection,selected.task.reference);assert.equal(active.manifestId,undefined);await c.close();
 const beforeCold=cloud.requests.length;c=await h.open(C);assert.deepEqual((await state(C)).task,selected.task);assert.equal(cloud.requests.length,beforeCold);assert.equal((await command(c,'CONTINUE')).task.phase,'confirmed');assert.equal((await state(C)).task.id,selected.task.id);assert.equal(cloud.requests.length,beforeCold,'confirmed cold union continuation uses durable original evidence');assert.deepEqual(await operations(c.core),expectedOperations);
 await command(c,'RESUME');const published=await command(c,'NOW');assert.equal(published.task.phase,'confirmed');assert.equal(published.wholeArchiveComplete,false);const merged=(await state(C)).task.reference;assert.equal(merged.kind,'checkpoint-manifest');assert.deepEqual((await manifest(cloud,merged)).parents,[left.id,right.id].sort());assert.ok([...cloud.files.values()].some(file=>file.appProperties?.paiaDigest===left.id));assert.ok([...cloud.files.values()].some(file=>file.appProperties?.paiaDigest===right.id));assert.deepEqual(await operations(c.core),expectedOperations);await c.close();
 const afterPublication=cloud.requests.length;c=await h.open(C);assert.equal((await state(C)).task.reference.id,merged.id);assert.equal(cloud.requests.length,afterPublication);await c.close();
 let d=await h.open(D);await command(d,'RESUME');assert.equal((await command(d,'RESTORE')).task.phase,'confirmed');const dState=await state(D);assert.equal(dState.task.reference.id,merged.id);assert.equal(dState.task.reference.kind,'checkpoint-manifest');assert.deepEqual(await records(d),expectedRecords);assert.deepEqual(await operations(d.core),expectedOperations);await assertOriginalReceipts(d.core,expectedOperations);await d.close();
 const beforeDCold=cloud.requests.length;d=await h.open(D);assert.deepEqual((await state(D)).task,dState.task);assert.equal(cloud.requests.length,beforeDCold);assert.equal((await command(d,'CONTINUE')).task.phase,'confirmed');assert.equal((await state(D)).task.id,dState.task.id);assert.deepEqual(await records(d),expectedRecords);assert.deepEqual(await operations(d.core),expectedOperations);assert.ok(cloud.requests.slice(beforeDCold).every(request=>request.method==='GET'),'ordinary single-manifest cold confirmation may reauthenticate, never upload');assert.equal((await d.rpc('PAIA_SYNC_STATUS',{}, {...sender,url:'https://chatgpt.com/'})).error,'FORBIDDEN');await d.close();
});
