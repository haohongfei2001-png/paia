import test from 'node:test';
import assert from 'node:assert/strict';
import {cp,mkdir,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join} from 'node:path';
const ROOT=fileURLToPath(new URL('../..',import.meta.url));
const KEY='personalAIArchive',MARKER='application-generation-selection:v1';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function fixture(t){
 const parent=join(ROOT,'work','selection-reservation-test-fixtures');await mkdir(parent,{recursive:true});const path=await mkdtemp(join(parent,'fixture-')),key='reserved_selection_'+crypto.randomUUID();
 // Complete module identity is deliberate: a symlinked core plus copied
 // lifecycle would be two distinct private issuers, unlike the shipped graph.
 await cp(join(ROOT,'extension'),join(path,'extension'),{recursive:true,filter:p=>!p.split('/').includes('node_modules')});await writeFile(join(path,'package.json'),'{"type":"module"}');
 const data={},pause=deferred(),entered=deferred();let sets=0,armed=false,intercepted=false,f,clock=100,requests=0;
 const storage={async get(k){const value={[k]:structuredClone(data[k])};if(armed&&!intercepted&&k===KEY&&f){const row=await new Promise((resolve,reject)=>{const tx=f.a.repository.db.transaction(['meta'],'readonly'),r=tx.objectStore('meta').get(MARKER);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});if(row?.phase==='dispatched'){intercepted=true;entered.resolve();await pause.promise;}}return value;},async set(value){if(Object.hasOwn(value,KEY))sets++;Object.assign(data,structuredClone(value));}};
 const config={provider:'google-drive',datasetId:'synthetic_local_selection',deviceId:'synthetic_A',binding:{subject:'SYNTHETIC_google_subject',clientId:'000000000000-synthetic.apps.googleusercontent.com',generation:'SYNTHETIC_generation',scopes:['https://www.googleapis.com/auth/drive.appdata']},request:async()=>{requests++;throw Error('SYNTHETIC no provider request allowed');},isCurrent:()=>true};
 globalThis[key]=config;await writeFile(join(path,'extension/background/sync-lifecycle-configuration.js'),`export function readSyncLifecycleConfiguration(){return globalThis[${JSON.stringify(key)}];}\n`);
 const priorPerformance=globalThis.performance;
 // Synthetic monotonic clock captured at module birth, not a runtime setter.
 globalThis.performance={now:()=>clock};
 let lifecycleModule,selectionModule,existing;
 try{existing=await import(pathToFileURL(join(path,'extension/tests/harness/existing-application-selection.mjs')));lifecycleModule=await import(pathToFileURL(join(path,'extension/background/sync-local-lifecycle.js')));selectionModule=await import(pathToFileURL(join(path,'extension/core/browser-native-sync/application-generation-selection.js')));}finally{globalThis.performance=priorPerformance;}
 let lifecycle,owner;
 t.after(async()=>{pause.resolve();owner?.close();lifecycle?.suspend();delete globalThis[key];await rm(path,{recursive:true,force:true});});
 f=await existing.existingSelectionFixture(t,{sourceLocal:storage});
 for(const name of ['sourceBootstrapJournal','sourcePurgeJournal','filterIntentJournal','inputWorkingJournal','consumerPreferenceJournal'])f.a[name]=null;
 const id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',api={runtime:{id,getURL:p=>`chrome-extension://${id}/${p}`},storage:{local:storage}};
 lifecycle=await lifecycleModule.createConfiguredSyncLifecycle(f.a,api);owner=lifecycle.applicationSelectionOwner();await owner.prepare();
 return {...f,lifecycle,owner,storage,lifecycleModule,selectionModule,sets:()=>sets,requests:()=>requests,tick:n=>{clock+=n;},arm:()=>{armed=true;},entered:entered.promise,releaseRead:()=>pause.resolve()};
}

for(const event of ['set-replaced','closed'])test('original final wait '+event+' must prevent SDK entry',async t=>{
 const f=await fixture(t),n=f.sets();f.arm();const outcome=f.owner.activate().then(value=>({value}),error=>({error}));await f.entered;
 let alternate=0;if(event==='set-replaced')f.storage.set=async()=>{alternate++;};if(event==='closed')f.owner.close();f.releaseRead();await outcome;
 assert.equal(f.sets()+alternate,n,'no SDK call after original owner or SDK identity invalidation');
});
