import {identityChannelFixture} from './identity-currentness-fixture.mjs';
import assert from 'node:assert/strict';
import {cp,mkdir,mkdtemp,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {toolbarRegistrationFixture} from '../../../extension/tests/harness/toolbar-registration.mjs';

const source=fileURLToPath(new URL('../../../extension/',import.meta.url));
const registry='core/ai-usage/maintenance-service-configuration.js',identityRegistry='core/ai-usage/maintenance-identity-currentness-configuration.js';
const id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',origin=`chrome-extension://${id}/`;
const ui={id,url:origin+'ui/archive.html'};

async function files(root,relative=''){
 const result=[];
 for(const entry of await readdir(join(root,relative),{withFileTypes:true})){
  const path=join(relative,entry.name);
  if(entry.isDirectory())result.push(...await files(root,path));else result.push(path);
 }
 return result.sort();
}

// The worker and all its owners execute their original bytes. Only the packaged
// source-owned service/identity endpoint registries are substituted, before worker construction. Neither a
// message field nor the fixture's directly constructed runner supplies authority.
// Chrome below only registers listeners and provides synthetic local storage.
// The production store uses fake-indexeddb, and signed handlers use synthetic
// SQL/HTTPS adapters. This is not native Chrome, PostgreSQL or live-Qwen proof.
export async function maintenanceSectionPromotionWorker(t,f,{configured=true,processingSource=false}={}){
 const root=await mkdtemp(join(tmpdir(),'paia-maintenance-worker-rpc-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 await Promise.all(['core','background'].map(path=>cp(join(source,path),join(root,path),{recursive:true})));
 await mkdir(join(root,'ui'));
 await cp(join(source,'ui/input-search.js'),join(root,'ui/input-search.js'));
 await cp(join(source,'package.json'),join(root,'package.json'));
 const key=`SYNTHETIC-maintenance-worker-${crypto.randomUUID()}`;let workerStore,coldAtConstruction=false,identityChannel=null;
 if(configured){
  const channel=identityChannel=identityChannelFixture({authority:f.server});t.after(()=>channel.close());
  Object.defineProperty(globalThis,key,{value:store=>{workerStore=store;coldAtConstruction=store.repository.db===undefined;const c=f.configuration,p=c.processing,v=c.service.context.processingVerifier;return {...c,fetch:request=>new URL(request.url).pathname==='/api/identity-currentness'?channel.handler(request):c.fetch(request),processing:processingSource?null:{resolve:async(t,scope)=>({...await p.resolve(t,scope),store}),isCurrent:r=>p.isCurrent({...r,store:f.s},f.s)},service:{...c.service,context:{...c.service.context,processingVerifier:{verify:async(caller,_store,scope)=>({...await v.verify(caller,f.s,scope),store}),isCurrent:(caller,r)=>v.isCurrent(caller,{...r,store:f.s},f.s)}}}};},configurable:true});
  t.after(()=>delete globalThis[key]);
  await writeFile(join(root,identityRegistry),`// Synthetic test-only source endpoint; never shipped.\nexport function readMaintenanceIdentityCurrentnessEndpoint(){return ${JSON.stringify(f.configuration.origin+'/api/identity-currentness')};}\n`);
  await writeFile(join(root,registry),`// Synthetic test-only registry; never shipped.\nexport function readMaintenanceServiceConfiguration(store){return globalThis[${JSON.stringify(key)}](store);}\n`);
 }
 const changed=[];
 for(const path of await files(root))if(!(await readFile(join(root,path))).equals(await readFile(join(source,path))))changed.push(path);
 assert.deepEqual(changed,configured?[identityRegistry,registry].sort():[],'only the two packaged source configuration registries may differ from production source');

 const prior=Object.fromEntries(['chrome','indexedDB','fetch'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 t.after(()=>{for(const [key,descriptor]of Object.entries(prior)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
 globalThis.indexedDB=f.indexedDB;
 globalThis.fetch=async()=>assert.fail('worker must never use an external network');
 let listener,startup;const notices=[],isolation=[];
 const storage={...f.storage,setAccessLevel:async options=>isolation.push(options),getBytesInUse:async()=>0};
 globalThis.chrome={runtime:{id,getURL:path=>origin+path,getManifest:()=>({version:'0.55.0'}),sendMessage:async message=>notices.push(message),onStartup:{addListener:fn=>{startup=fn;}},onMessage:{addListener:fn=>{assert.equal(listener,undefined,'one original worker RPC listener');listener=fn;}}},storage:{local:storage,session:{setAccessLevel:async()=>{},get:async()=>({}),set:async()=>{},remove:async()=>{}}}};
 toolbarRegistrationFixture(globalThis.chrome);
 globalThis.chrome.runtime.getContexts=async()=>[{contextType:'TAB',tabId:4,windowId:2,frameId:0,documentId:'original-worker-archive-document',documentUrl:ui.url,incognito:false}];
 globalThis.chrome.tabs.get=async()=>({id:4,windowId:2,incognito:false,url:ui.url});
 await import(pathToFileURL(join(root,'background/service-worker.js')).href);
 // This is the same file URL used by this exact worker, hence the same private
 // WeakMap. Importing the source checkout module would prove nothing here.
 const {consumeCommittedSemanticWrite}=await import(pathToFileURL(join(root,'core/idb-repository.js')).href);
 assert.equal(typeof listener,'function');
 const send=(request,sender=ui)=>new Promise(resolve=>assert.equal(listener(request,sender,resolve),true,'original asynchronous runtime.onMessage contract'));
 const read=()=>send({type:'GET_STATUS'});
 const initial=await read();assert.equal(initial.ok,true,JSON.stringify(initial));
 assert.deepEqual(isolation,[{accessLevel:'TRUSTED_CONTEXTS'}]);
 t.after(()=>f.revoke());
 return {send,read,notices,startup,identityObservations:()=>identityChannel?.clients.length??0,store:workerStore,coldAtConstruction,consumeCommittedSemanticWrite,sender:{...ui,frameId:0,documentId:'original-worker-archive-document',documentLifecycle:'active',tab:{id:4,windowId:2,incognito:false}}};
}

