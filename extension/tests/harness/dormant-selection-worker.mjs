// Isolated coherent dormant-action fixture. Original core/background modules
// share one graph and their genuine private WeakMaps. The ONLY command guard
// seam is the declared outer missing-global-premise gate; internal guards remain.
// Source-owned synthetic configuration and observer exports are declared and
// hashed below. No production file, install, provider or native browser is used.
import {cp,mkdir,mkdtemp,readFile,writeFile,symlink,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {IDBKeyRange} from '../vendor/fake-indexeddb/build/esm/index.js';
import {local} from './thought-m1.mjs';
import {APPLICATION_EDITOR_PORT} from '../../background/application-editor-guard.js';
const ROOT=fileURLToPath(new URL('../../..',import.meta.url));
export const tick=()=>new Promise(r=>setImmediate(r));
export const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const signal=()=>{const listeners=new Set();return {addListener:f=>listeners.add(f),removeListener:f=>listeners.delete(f),emit:(...args)=>{for(const f of listeners)f(...args);}};};
export async function dormantSelectionWorker(t,{stageOuterGate=false,mutateReceiptBeforeFirstTransport=false,captureQuery=null,observeActionLedger=false}={}){
 const capture=true,currentTop=true;
 const root=process.env.PAIA_DORMANT_FIXTURE_ROOT??join(ROOT,'work','dormant-selection-owner-fixtures');await mkdir(root,{recursive:true});const path=await mkdtemp(join(root,'worker-')),key='dormant_selection_'+crypto.randomUUID(),prior={chrome:globalThis.chrome,indexedDB:globalThis.indexedDB,IDBKeyRange:globalThis.IDBKeyRange};
 let cleanupRegistered=false;t.after(()=>{if(!cleanupRegistered){Object.assign(globalThis,prior);delete globalThis[key];delete globalThis[key+'_config'];}});
 await cp(join(ROOT,'extension','background'),join(path,'background'),{recursive:true});await cp(join(ROOT,'extension','core'),join(path,'core'),{recursive:true});await cp(join(ROOT,'extension','adapter'),join(path,'adapter'),{recursive:true});await cp(join(ROOT,'extension','ui'),join(path,'ui'),{recursive:true});await writeFile(join(path,'package.json'),'{"type":"module"}');
 await mkdir(join(path,'tests','harness'),{recursive:true});await symlink(join(ROOT,'extension','tests','vendor'),join(path,'tests','vendor'),'dir');
 for(const name of ['thought-m1.mjs','existing-application-selection.mjs'])await cp(join(ROOT,'extension','tests','harness',name),join(path,'tests','harness',name));
 const digest=text=>createHash('sha256').update(text).digest('hex'),seams=[];
 const change=async(relative,transform,scope)=>{const file=join(path,relative),before=await readFile(file,'utf8'),after=transform(before);if(before===after)throw Error('SYNTHETIC seam did not change '+relative);await writeFile(file,after);seams.push({path:relative,scope,sourceSHA256:digest(before),fixtureSHA256:digest(after)});await writeFile(join(path,'SYNTHETIC-SEAMS.json'),JSON.stringify({version:1,incomplete:true,stageOuterGate,mutateReceiptBeforeFirstTransport,seams},null,2)+'\n');};
 await change('background/application-store-configuration.js',()=>"export function readApplicationStoreConfiguration(){return Object.freeze({mode:'validated-existing-generation'}); }\n",'synthetic source-owned existing-generation configuration; production remains null');
 await change('background/sync-lifecycle-configuration.js',()=>`export function readSyncLifecycleConfiguration(){return globalThis[${JSON.stringify(key+'_config')}];}\n`,'synthetic source-owned local Sync configuration; request always rejects; production remains null');
 const outerGate="  if(['PAIA_GENERATION_ACTIVATE','PAIA_GENERATION_CONTINUE','PAIA_GENERATION_RESTART'].includes(request.type))fail('GENERATION_EDITOR_PROTECTION_REQUIRED');";
 if(stageOuterGate)await change('background/application-selection-commands.js',source=>{if(source.split(outerGate).length!==2)throw Error('SYNTHETIC outer gate identity changed');return source.replace(outerGate,'  // SYNTHETIC ONLY: outer missing-global-premise gate staged; all internal guards retained.');},'EXACT outer unconditional command gate only; NOT global lifetime acceptance');
 if(observeActionLedger)await change('background/application-selection-reservation-coordination.js',source=>source+`
// SYNTHETIC READONLY diagnostic: no action/member/scope/SDK authority escapes.
export function readSyntheticSelectionLedger(coordinator){const r=coordinators.get(coordinator)?.active;if(!r)return null;return Object.freeze({references:r.references,bytes:r.bytes,phase:r.phase,invalid:r.invalid,pending:r.pending.size,memberPending:r.memberPending.size,settled:r.settled,runDone:r.runDone,costs:Object.freeze(Object.fromEntries([...r.costAttribution].map(([kind,value])=>[kind,Object.freeze({references:value.references,bytes:value.bytes})])))});}
`,'append readonly numerical private-ledger diagnostic only; no handle, issuer, admission or mutable reference');
 const {installApplicationEditorGuard}=await import(pathToFileURL(join(path,'ui/application-editor-guard.js')));
 const fixtureModule=await import(pathToFileURL(join(path,'tests/harness/existing-application-selection.mjs'))),baseStorage=local(),storageState={get:null,set:null,sets:[]},storage={get:async key=>storageState.get?storageState.get(key,()=>baseStorage.get(key)):baseStorage.get(key),set:async value=>{storageState.sets.push(structuredClone(value));return storageState.set?storageState.set(value,()=>baseStorage.set(value)):baseStorage.set(value);},setAccessLevel:async()=>{}},seed=await fixtureModule.existingSelectionFixture(t,{sourceLocal:storage});
 await seed.a.repository.close();await seed.b.repository.close();await seed.registry.close();
 let externalRequests=0;globalThis[key+'_config']={provider:'google-drive',datasetId:seed.coreA.datasetId,deviceId:seed.coreA.deviceId,binding:{subject:'SYNTHETIC_dormant_owner',clientId:'000000000000-synthetic.apps.googleusercontent.com',generation:'SYNTHETIC_generation',scopes:['https://www.googleapis.com/auth/drive.appdata']},request:async()=>{externalRequests++;throw Error('SYNTHETIC no provider transport permitted');},isCurrent:()=>true};
 let source=await readFile(join(path,'background/service-worker.js'),'utf8');
 const originalWorker=source;
 if(observeActionLedger){source="import {readSyntheticSelectionLedger} from './application-selection-reservation-coordination.js';\nlet syntheticObservedCoordinator=null;\n"+source;const expression='createApplicationSelectionReservationCoordination({store,api:chrome,lifecycle:syncLifecycle,editors:applicationEditors,transports:applicationTransportCoordination,localTools:applicationLocalToolsCoordination,activity:applicationWorkerActivity,selection:applicationSelection})';if(source.split(expression).length!==2)throw Error('SYNTHETIC fixed composition identity changed');source=source.replace(expression,'(syntheticObservedCoordinator='+expression+')');}

 if(mutateReceiptBeforeFirstTransport){const line='applicationTransportCoordination=createApplicationTransportCoordination(';if(source.split(line).length!==2)throw Error('SYNTHETIC transport composition identity changed');source=source.replace(line,`globalThis[${JSON.stringify(key+'_mutation')}]={prototype:Object.getPrototypeOf(promptInsertionReceipts),original:Object.getPrototypeOf(promptInsertionReceipts).holdCurrentTopDocumentsForApplicationSelection,calls:0};Object.getPrototypeOf(promptInsertionReceipts).holdCurrentTopDocumentsForApplicationSelection=async function(){globalThis[${JSON.stringify(key+'_mutation')}].calls++;return Object.freeze({ready:true});};\n`+line);}
 const observedWorker=source+`\nglobalThis[${JSON.stringify(key)}]={ready,get store(){return store;},get coordination(){return applicationWorkerCoordination;},get transports(){return applicationTransportCoordination;},makeTransport:createApplicationTransportCoordination,get localTools(){return applicationLocalToolsCoordination;},makeLocalTools:createApplicationLocalToolsCoordination,get tools(){return {imports,backups,integrity};},selection:applicationSelection,get capture(){return captureRecovery;},get receipts(){return promptInsertionReceipts;},editors:applicationEditors,activity:applicationWorkerActivity,notifyArchiveChanged,get organizers(){return {original:originalOrganizer,ai:aiOrganizer,bounded:boundedOrganizer};},get owners(){return {promptReuse,promptSurface,promptAssist,promptNext,imports,maintenanceProcessing,archiveArrival};},get sync(){return syncLifecycle;}${observeActionLedger?',readActionLedger:()=>readSyntheticSelectionLedger(syntheticObservedCoordinator)':''}};\n`;
 await writeFile(join(path,'background/service-worker.js'),observedWorker);seams.push({path:'background/service-worker.js',scope:mutateReceiptBeforeFirstTransport?'append original-owner observers + exact receipt prototype replacement before FIRST transport factory (negative only)':observeActionLedger?'append original-owner observers + closure-only fixed coordinator numerical ledger reader; no original handles returned':'append original-owner observers only; no callback or issuer replacement',sourceSHA256:digest(originalWorker),fixtureSHA256:digest(observedWorker)});
 const manifest={version:1,stageOuterGate,mutateReceiptBeforeFirstTransport,observeActionLedger,label:'synthetic dormant chain under staged missing outer premise; not global/browser/native acceptance',seams};await writeFile(join(path,'SYNTHETIC-SEAMS.json'),JSON.stringify(manifest,null,2)+'\n');
 const id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',origin='chrome-extension://'+id+'/',sender={id,url:origin+'ui/archive.html',frameId:0,documentId:'SYNTHETIC_archive',tab:{id:1,windowId:1,incognito:false}},contexts=[],sent=[];let listener,send=async()=>undefined;
 const api={runtime:{id,getManifest:()=>({version:'0.55.9'}),getURL:p=>origin+p,getContexts:async()=>structuredClone(contexts),sendMessage:message=>{sent.push(message);return send(message);},onMessage:{addListener:f=>listener=f},onConnect:signal(),onStartup:signal(),onInstalled:signal(),onSuspend:signal(),onSuspendCanceled:signal(),onUpdateAvailable:signal()},tabs:{get:async()=>{throw new Error('SYNTHETIC_TAB_UNAVAILABLE');},query:async()=>captureQuery?captureQuery():[{id:7,incognito:false}],sendMessage:(_id,message)=>{sent.push(message);return send(message);},onRemoved:signal(),onUpdated:signal()},action:{onClicked:signal()},storage:{local:storage}};
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
  vm.runInContext(await readFile(join(path,'adapter/chatgpt-composer.js'),'utf8'),context);
  const adapter=new context.PAIAChatGPTComposerAdapter({document,location});hostPages.push(adapter);
  const actual=message=>new Promise(resolve=>{let asynchronous=false,answered=false;for(const callback of listeners){if(callback(structuredClone(message),{id},value=>{answered=true;resolve(structuredClone(value));})===true)asynchronous=true;}if(!answered&&!asynchronous)resolve(undefined);});
  api.tabs.sendMessage=(tabId,message,target)=>{hostMessages.push({tabId,message:structuredClone(message),target:structuredClone(target)});if(tabId!==tab.id||target?.documentId&&target.documentId!==documentId)return Promise.resolve(undefined);return hostState.send?hostState.send(message,target,()=>actual(message)):actual(message);};
 }
 globalThis.chrome=api;globalThis.indexedDB=seed.factory;globalThis.IDBKeyRange=IDBKeyRange;await import(pathToFileURL(join(path,'background/service-worker.js')));const bridge=globalThis[key];let startupError=null;try{await bridge.ready;}catch(error){startupError=error;if(!mutateReceiptBeforeFirstTransport)throw error;}
 const rpc=(type,extra={},from=sender)=>new Promise(resolve=>listener({type,...extra},from,resolve));if(!startupError)await bridge.activity.drain();
 const pages=[];let closed=false;cleanupRegistered=true;
 t.after(async()=>{if(closed)return;closed=true;send=async()=>undefined;const cleanup=[];const record=async(name,operation)=>{try{cleanup.push({name,result:(await operation())??null});}catch(error){cleanup.push({name,error:error?.code??error?.message??'unknown'});}};
  try{for(const p of pages)p.client.dispose();await record('original-editor-close',()=>bridge.editors.close());await record('actual-activity-drain',()=>bridge.activity.drain());await record('original-transport-close',()=>bridge.transports.close());for(const adapter of hostPages)adapter.dispose();await record('original-localtools-close',()=>bridge.localTools.close());await record('original-sources-close',()=>bridge.coordination.close());await record('original-sync-suspend',()=>bridge.sync?.suspend());await record('synthetic-fixture-db-disposal',()=>bridge.store.repository.close());}
  finally{await writeFile(join(path,'FIXTURE-CLEANUP.json'),JSON.stringify({label:'synthetic fixture disposal; false/error preserves restrictive original owner result, not product cleanup evidence',cleanup},null,2)+'\n');Object.assign(globalThis,prior);delete globalThis[key];delete globalThis[key+'_config'];const mutation=globalThis[key+'_mutation'];if(mutation)mutation.prototype.holdCurrentTopDocumentsForApplicationSelection=mutation.original;delete globalThis[key+'_mutation'];}
  // Preserve exact synthetic graph, false cleanup outcomes and failure evidence.
 });
 const addPage=async({prepare=async()=>true}={})=>{
  const worker={name:APPLICATION_EDITOR_PORT,sender,onMessage:signal(),onDisconnect:signal()},page={onMessage:signal(),onDisconnect:signal()};let disconnected=false;
  worker.postMessage=v=>queueMicrotask(()=>page.onMessage.emit(structuredClone(v)));page.postMessage=v=>queueMicrotask(()=>worker.onMessage.emit(structuredClone(v)));worker.disconnect=page.disconnect=()=>{if(!disconnected){disconnected=true;worker.onDisconnect.emit();page.onDisconnect.emit();}};
  contexts.push({contextType:'TAB',documentId:sender.documentId,documentUrl:sender.url,frameId:0,incognito:false});api.runtime.onConnect.emit(worker);
  const client=installApplicationEditorGuard({prepare,current:()=>true,release(){}},{api:{runtime:{connect:()=>page}},document:new EventTarget(),target:new EventTarget()});pages.push({client});await tick();return client;
 };
 return {api,bridge,rpc,sender,sent,addPage,hostState,hostMessages,contexts,seed,storage,storageState,path,manifest,startupError,mutation:globalThis[key+'_mutation'],externalRequests:()=>externalRequests,send:callback=>{send=callback;}};
}
