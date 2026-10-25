// Synthetic fixed-source worker fixture. The appended bridge observes private
// original owners only; no production RPC or successful proof is manufactured.
import {cp,mkdir,mkdtemp,readFile,writeFile,symlink,rm} from 'node:fs/promises';
import {join} from 'node:path';
import vm from 'node:vm';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {IDBFactory,IDBKeyRange} from '../vendor/fake-indexeddb/build/esm/index.js';
import {local} from './thought-m1.mjs';
import {installApplicationEditorGuard} from '../../ui/application-editor-guard.js';
import {APPLICATION_EDITOR_PORT} from '../../background/application-editor-guard.js';
const ROOT=fileURLToPath(new URL('../../..',import.meta.url));
export const tick=()=>new Promise(r=>setImmediate(r));
export const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const signal=()=>{const listeners=new Set();return {addListener:f=>listeners.add(f),removeListener:f=>listeners.delete(f),emit:(...args)=>{for(const f of listeners)f(...args);}};};
export async function selectionAdmissionWorker(t,{capture=false,captureQuery=null,currentTop=false}={}){
 const root=join(ROOT,'work','selection-admission-test-fixtures');await mkdir(root,{recursive:true});const path=await mkdtemp(join(root,'worker-')),key='selection_admission_'+crypto.randomUUID(),prior={chrome:globalThis.chrome,indexedDB:globalThis.indexedDB,IDBKeyRange:globalThis.IDBKeyRange};
 await cp(join(ROOT,'extension','background'),join(path,'background'),{recursive:true});await symlink(join(ROOT,'extension','core'),join(path,'core'),'dir');await writeFile(join(path,'package.json'),'{"type":"module"}');
 const source=await readFile(join(path,'background/service-worker.js'),'utf8');await writeFile(join(path,'background/service-worker.js'),source+`\nglobalThis[${JSON.stringify(key)}]={ready,get store(){return store;},get coordination(){return applicationWorkerCoordination;},get transports(){return applicationTransportCoordination;},makeTransport:createApplicationTransportCoordination,get localTools(){return applicationLocalToolsCoordination;},makeLocalTools:createApplicationLocalToolsCoordination,get tools(){return {imports,backups,integrity};},selection:applicationSelection,get capture(){return captureRecovery;},get receipts(){return promptInsertionReceipts;},editors:applicationEditors,activity:applicationWorkerActivity,notifyArchiveChanged,get organizers(){return {original:originalOrganizer,ai:aiOrganizer,bounded:boundedOrganizer};},get owners(){return {promptReuse,promptSurface,promptAssist,promptNext,imports,maintenanceProcessing,archiveArrival};},get sync(){return syncLifecycle;}};\n`);
 const id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',origin='chrome-extension://'+id+'/',sender={id,url:origin+'ui/archive.html',frameId:0,documentId:'SYNTHETIC_archive',tab:{id:1,windowId:1,incognito:false}},contexts=[],sent=[];let listener,send=async()=>undefined;
 const api={runtime:{id,getManifest:()=>({version:'0.55.9'}),getURL:p=>origin+p,getContexts:async()=>structuredClone(contexts),sendMessage:message=>{sent.push(message);return send(message);},onMessage:{addListener:f=>listener=f},onConnect:signal(),onStartup:signal(),onInstalled:signal(),onSuspend:signal(),onSuspendCanceled:signal(),onUpdateAvailable:signal()},tabs:{get:async()=>{throw new Error('SYNTHETIC_TAB_UNAVAILABLE');},query:async()=>captureQuery?captureQuery():[{id:7,incognito:false}],sendMessage:(_id,message)=>{sent.push(message);return send(message);},onRemoved:signal(),onUpdated:signal()},action:{onClicked:signal()},storage:{local:{...local(),setAccessLevel:async()=>{}}}};
 const hostState={query:null,send:null,script:null},hostMessages=[],hostPages=[];
 if(capture){const manifest=JSON.parse(await readFile(join(ROOT,'extension/manifest.json'),'utf8'));api.runtime.getManifest=()=>structuredClone(manifest);api.scripting={executeScript:async()=>[]};}
 if(currentTop){
  // Opt-in synthetic browser metadata; HOLD/FENCE/RELEASE replies are produced
  // by the real adapter in a VM and registered with the actual worker owner.
  if(!capture)throw new Error('currentTop fixture requires capture API');
  api.tabs.onCreated=signal();api.tabs.onReplaced=signal();
  const tab={id:7,windowId:1,url:'https://chatgpt.com/c/synthetic-selection',incognito:false,discarded:false,frozen:false},documentId='synthetic_selection_top';
  api.tabs.get=async tabId=>{if(tabId!==tab.id)throw new Error('SYNTHETIC_TAB_UNAVAILABLE');return structuredClone(tab);};
  api.tabs.query=async query=>captureQuery?captureQuery(query):Object.hasOwn(query??{},'url')?(hostState.query?hostState.query([structuredClone(tab)]):[structuredClone(tab)]):[];
  api.scripting.executeScript=async request=>{
   if(request.func?.name!=='probeCurrentPromptTopDocument')return [];
   const rows=[{frameId:0,documentId,result:{origin:'https://chatgpt.com',top:true}}];return hostState.script?hostState.script(request,rows):rows;
  };
  const listeners=new Set(),document=new EventTarget(),location={origin:'https://chatgpt.com',href:tab.url};
  document.defaultView=new EventTarget();document.querySelectorAll=()=>[];
  const hostSender={id,tab:{id:tab.id,windowId:tab.windowId,incognito:false},frameId:0,documentId,documentLifecycle:'active',url:tab.url};
  const context=vm.createContext({document,location,crypto:globalThis.crypto,TextEncoder,queueMicrotask,setTimeout,clearTimeout,performance,chrome:{runtime:{id,onMessage:{addListener:f=>listeners.add(f),removeListener:f=>listeners.delete(f)},sendMessage:message=>new Promise(resolve=>listener(structuredClone(message),hostSender,resolve))}}});context.top=context;
  vm.runInContext(await readFile(join(ROOT,'extension/adapter/chatgpt-composer.js'),'utf8'),context);
  const adapter=new context.PAIAChatGPTComposerAdapter({document,location});hostPages.push(adapter);
  const actual=message=>new Promise(resolve=>{let asynchronous=false,answered=false;for(const callback of listeners){if(callback(structuredClone(message),{id},value=>{answered=true;resolve(structuredClone(value));})===true)asynchronous=true;}if(!answered&&!asynchronous)resolve(undefined);});
  api.tabs.sendMessage=(tabId,message,target)=>{hostMessages.push({tabId,message:structuredClone(message),target:structuredClone(target)});if(tabId!==tab.id||target?.documentId&&target.documentId!==documentId)return Promise.resolve(undefined);return hostState.send?hostState.send(message,target,()=>actual(message)):actual(message);};
 }
 globalThis.chrome=api;globalThis.indexedDB=new IDBFactory();globalThis.IDBKeyRange=IDBKeyRange;await import(pathToFileURL(join(path,'background/service-worker.js')));const bridge=globalThis[key];await bridge.ready;
 const rpc=(type,extra={},from=sender)=>new Promise(resolve=>listener({type,...extra},from,resolve));await rpc('CONSENT',{accepted:true});await bridge.activity.drain();
 const pages=[];let closed=false;
 t.after(async()=>{if(closed)return;closed=true;send=async()=>undefined;for(const p of pages)p.client.dispose();bridge.editors.close();await bridge.activity.drain();await bridge.transports.close().catch(()=>false);for(const adapter of hostPages)adapter.dispose();bridge.localTools.close();bridge.coordination.close();bridge.sync.suspend();await bridge.store.repository.close();Object.assign(globalThis,prior);delete globalThis[key];await rm(path,{recursive:true,force:true});});
 const addPage=async({prepare=async()=>true}={})=>{
  const worker={name:APPLICATION_EDITOR_PORT,sender,onMessage:signal(),onDisconnect:signal()},page={onMessage:signal(),onDisconnect:signal()};let disconnected=false;
  worker.postMessage=v=>queueMicrotask(()=>page.onMessage.emit(structuredClone(v)));page.postMessage=v=>queueMicrotask(()=>worker.onMessage.emit(structuredClone(v)));worker.disconnect=page.disconnect=()=>{if(!disconnected){disconnected=true;worker.onDisconnect.emit();page.onDisconnect.emit();}};
  contexts.push({contextType:'TAB',documentId:sender.documentId,documentUrl:sender.url,frameId:0,incognito:false});api.runtime.onConnect.emit(worker);
  const client=installApplicationEditorGuard({prepare,current:()=>true,release(){}},{api:{runtime:{connect:()=>page}},document:new EventTarget(),target:new EventTarget()});pages.push({client});await tick();return client;
 };
 return {api,bridge,rpc,sender,sent,addPage,hostState,hostMessages,send:callback=>{send=callback;}};
}
