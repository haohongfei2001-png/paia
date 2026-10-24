// Synthetic fixed-source worker fixture. The appended bridge observes private
// original owners only; no production RPC or successful proof is manufactured.
import {cp,mkdir,mkdtemp,readFile,writeFile,symlink,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {IDBFactory,IDBKeyRange} from '../vendor/fake-indexeddb/build/esm/index.js';
import {local} from './thought-m1.mjs';
import {installApplicationEditorGuard} from '../../ui/application-editor-guard.js';
import {APPLICATION_EDITOR_PORT} from '../../background/application-editor-guard.js';
const ROOT=fileURLToPath(new URL('../../..',import.meta.url));
export const tick=()=>new Promise(r=>setImmediate(r));
export const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const signal=()=>{const listeners=new Set();return {addListener:f=>listeners.add(f),removeListener:f=>listeners.delete(f),emit:(...args)=>{for(const f of listeners)f(...args);}};};
export async function selectionAdmissionWorker(t){
 const root=join(ROOT,'work','selection-admission-test-fixtures');await mkdir(root,{recursive:true});const path=await mkdtemp(join(root,'worker-')),key='selection_admission_'+crypto.randomUUID(),prior={chrome:globalThis.chrome,indexedDB:globalThis.indexedDB,IDBKeyRange:globalThis.IDBKeyRange};
 await cp(join(ROOT,'extension','background'),join(path,'background'),{recursive:true});await symlink(join(ROOT,'extension','core'),join(path,'core'),'dir');await writeFile(join(path,'package.json'),'{"type":"module"}');
 const source=await readFile(join(path,'background/service-worker.js'),'utf8');await writeFile(join(path,'background/service-worker.js'),source+`\nglobalThis[${JSON.stringify(key)}]={ready,get store(){return store;},get coordination(){return applicationWorkerCoordination;},editors:applicationEditors,activity:applicationWorkerActivity,notifyArchiveChanged,get owners(){return {promptReuse,promptSurface,promptAssist,promptNext,imports,maintenanceProcessing,archiveArrival};},get sync(){return syncLifecycle;}};\n`);
 const id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',origin='chrome-extension://'+id+'/',sender={id,url:origin+'ui/archive.html',frameId:0,documentId:'SYNTHETIC_archive',tab:{id:1,windowId:1,incognito:false}},contexts=[],sent=[];let listener,send=async()=>undefined;
 const api={runtime:{id,getManifest:()=>({version:'0.55.9'}),getURL:p=>origin+p,getContexts:async()=>structuredClone(contexts),sendMessage:message=>{sent.push(message);return send(message);},onMessage:{addListener:f=>listener=f},onConnect:signal(),onStartup:signal(),onInstalled:signal(),onSuspend:signal(),onSuspendCanceled:signal(),onUpdateAvailable:signal()},tabs:{query:async()=>[{id:7,incognito:false}],sendMessage:(_id,message)=>{sent.push(message);return send(message);},onRemoved:signal(),onUpdated:signal()},action:{onClicked:signal()},storage:{local:{...local(),setAccessLevel:async()=>{}}}};
 globalThis.chrome=api;globalThis.indexedDB=new IDBFactory();globalThis.IDBKeyRange=IDBKeyRange;await import(pathToFileURL(join(path,'background/service-worker.js')));const bridge=globalThis[key];await bridge.ready;
 const rpc=(type,extra={},from=sender)=>new Promise(resolve=>listener({type,...extra},from,resolve));await rpc('CONSENT',{accepted:true});await bridge.activity.drain();
 const pages=[];let closed=false;
 t.after(async()=>{if(closed)return;closed=true;send=async()=>undefined;for(const p of pages)p.client.dispose();bridge.editors.close();await bridge.activity.drain();bridge.coordination.close();bridge.sync.suspend();await bridge.store.repository.close();Object.assign(globalThis,prior);delete globalThis[key];await rm(path,{recursive:true,force:true});});
 const addPage=async({prepare=async()=>true}={})=>{
  const worker={name:APPLICATION_EDITOR_PORT,sender,onMessage:signal(),onDisconnect:signal()},page={onMessage:signal(),onDisconnect:signal()};let disconnected=false;
  worker.postMessage=v=>queueMicrotask(()=>page.onMessage.emit(structuredClone(v)));page.postMessage=v=>queueMicrotask(()=>worker.onMessage.emit(structuredClone(v)));worker.disconnect=page.disconnect=()=>{if(!disconnected){disconnected=true;worker.onDisconnect.emit();page.onDisconnect.emit();}};
  contexts.push({contextType:'TAB',documentId:sender.documentId,documentUrl:sender.url,frameId:0,incognito:false});api.runtime.onConnect.emit(worker);
  const client=installApplicationEditorGuard({prepare,current:()=>true,release(){}},{api:{runtime:{connect:()=>page}},document:new EventTarget(),target:new EventTarget()});pages.push({client});await tick();return client;
 };
 return {api,bridge,rpc,sender,sent,addPage,send:callback=>{send=callback;}};
}
