// Synthetic fixed-source worker fixture. It imports the actual background and
// Settings modal; no service factory, runtime config RPC or external fetch.
import assert from 'node:assert/strict';
import {cp,mkdir,mkdtemp,readFile,writeFile,symlink,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {IDBFactory,IDBKeyRange} from '../vendor/fake-indexeddb/build/esm/index.js';
import {local,capture} from './thought-m1.mjs';
import {toolbarRegistrationFixture} from './toolbar-registration.mjs';
import {observeLocalWorkerDrains} from './local-worker-drains.mjs';
import {PresentationNode} from './presentation-dom.mjs';
import {mountSettingsSync} from '../../ui/settings-sync.js';
import {mountSettingsDetail} from '../../ui/settings-details.js';
const ROOT=fileURLToPath(new URL('../../..',import.meta.url));
export async function openConfiguredSyncWorker({deviceId,provider,binding,cloud,storage=local(),factory=new IDBFactory(),enabled=true,datasetId='SYNTHETIC_worker_checkpoint',applicationConfiguration=null,allowStartupPending=false}={}){
 const root=join(ROOT,'work','sync-lifecycle-test-fixtures');await mkdir(root,{recursive:true});const path=await mkdtemp(join(root,'consumer-')),key='sync_consumer_'+crypto.randomUUID(),prior={chrome:globalThis.chrome,indexedDB:globalThis.indexedDB,IDBKeyRange:globalThis.IDBKeyRange,document:globalThis.document};
 const drains=observeLocalWorkerDrains(),sent=[];let listener,uiPending,closed=false,reloadCount=0,startupError=null;
 await cp(join(ROOT,'extension','background'),join(path,'background'),{recursive:true});await symlink(join(ROOT,'extension','core'),join(path,'core'),'dir');await writeFile(join(path,'package.json'),'{"type":"module"}');
 if(enabled){globalThis[key]={provider,datasetId,deviceId,binding,request:cloud.request,isCurrent:()=>true};await writeFile(join(path,'background/sync-lifecycle-configuration.js'),`export function readSyncLifecycleConfiguration(){return globalThis[${JSON.stringify(key)}];}\n`);}
 if(applicationConfiguration)await writeFile(join(path,'background/application-store-configuration.js'),`export function readApplicationStoreConfiguration(){return ${JSON.stringify(applicationConfiguration)};}\n`);
 const worker=await readFile(join(path,'background/service-worker.js'),'utf8');await writeFile(join(path,'background/service-worker.js'),worker+`\nglobalThis[${JSON.stringify(key+'_bridge')} ]={ready,get store(){return store;},get sync(){return syncLifecycle;},get prompt(){return promptReuse.service;},get same(){return archiveArrival.service===promptReuse.service&&promptNext.service===promptReuse.service;}};\n`);
 const id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',sender={id,url:`chrome-extension://${id}/ui/archive.html`,frameId:0},event=()=>({addListener(){}});
 globalThis.indexedDB=factory;globalThis.IDBKeyRange=IDBKeyRange;globalThis.chrome={runtime:{id,getManifest:()=>({version:'0.55.0'}),getURL:p=>`chrome-extension://${id}/${p}`,reload:()=>{reloadCount++;},sendMessage:message=>{if(message.type.startsWith('PAIA_SYNC_')||message.type.startsWith('PAIA_GENERATION_'))return uiPending=new Promise(resolve=>listener(message,sender,resolve));sent.push(message);return Promise.resolve();},onMessage:{addListener:fn=>listener=fn},onStartup:event(),onSuspend:event(),onSuspendCanceled:event()},storage:{local:{...storage,setAccessLevel:async()=>{}}}};toolbarRegistrationFixture(chrome);
 await import(pathToFileURL(join(path,'background/service-worker.js')));const bridge=globalThis[key+'_bridge'];try{await bridge.ready;}catch(error){if(!allowStartupPending||error.code!=='GENERATION_SELECTION_PENDING')throw error;startupError=error;}await drains.idle();
 const rpc=(type,extra={},from=sender)=>new Promise(resolve=>listener({type,...extra},from,resolve));if(!startupError&&!(await bridge.store.status()).consented){const r=await rpc('CONSENT',{accepted:true});assert.equal(r.ok,true);await drains.idle();}
 const body=new PresentationNode('body'),panel={hidden:false},make=tag=>{const n=new PresentationNode(tag);if(tag==='dialog'){n.showModal=()=>n.open=true;n.close=()=>{n.open=false;n.listeners.get('close')?.();};}return n;};globalThis.document={body,documentElement:{lang:'en'},getElementById:id=>id==='settings-panel'?panel:null,createElement:make,createElementNS:(_ns,tag)=>make(tag)};
 const detail=mountSettingsSync({mountDetail:mountSettingsDetail,language:()=> 'en'});body.append(detail.row);detail.row.listeners.get('click')();await uiPending;await new Promise(r=>setImmediate(r));
 const ui=async command=>{const b=detail.dialog.children[1].children.flatMap(n=>n.children??[]).find(n=>n.dataset.syncCommand===command);assert.ok(b&&!b.hidden&&!b.disabled,'actual Settings action '+command);b.listeners.get('click')();const response=await uiPending;await new Promise(r=>setImmediate(r));return response;};
 return {bridge,rpc,ui,storage,factory,sent,detail,startupError,reloads:()=>reloadCount,async capture(){const r=capture((await bridge.store.status()).epoch,'SYNTHETIC_input','SYNTHETIC explain this carefully');const result=await rpc('CAPTURE',{...r,contentVersion:'0.55.0'},{id,url:r.chat.url,frameId:0,tab:{id:1,url:r.chat.url,incognito:false}});assert.equal(result.ok,true,JSON.stringify(result));await drains.idle();return result;},async promptChange(change){const response=await rpc('PAIA_PROMPT_CHANGE',{change});assert.equal(response.ok,true,JSON.stringify(response));await drains.idle();return response.data;},async query(){const response=await rpc('PAIA_PROMPT_QUERY');assert.equal(response.ok,true,JSON.stringify(response));await drains.idle();return response.data;},async close(){if(closed)return;closed=true;await drains.idle();drains.dispose();bridge.sync?.suspend();await bridge.store?.repository.close();Object.assign(globalThis,prior);delete globalThis[key];delete globalThis[key+'_bridge'];await rm(path,{recursive:true,force:true});}};
}
