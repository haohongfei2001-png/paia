// New, bounded observation controls only. Synthetic host and fake IndexedDB;
// no old selection/capacity suite, provider, browser or activation is exercised.
import test from 'node:test';
import assert from 'node:assert/strict';
import {installInitialHost} from './harness/main-bound-native-host-fixture.mjs';
import {IDBFactory,IDBDatabase} from './vendor/fake-indexeddb/build/esm/index.js';

const host=installInitialHost(),listeners=[];
let isolationCalls=0,databaseOpens=0,enumerations=0;
// Keep actual worker startup pending. The one new status route must answer
// without invoking any startup/recovery owner or escaping the original guard.
host.api.storage.local.setAccessLevel=()=>{isolationCalls++;return new Promise(()=>{});};
host.api.runtime.onMessage.addListener=fn=>listeners.push(fn);
const originalOpen=globalThis.indexedDB.open,originalDatabases=globalThis.indexedDB.databases;
globalThis.indexedDB.open=function(...args){databaseOpens++;return Reflect.apply(originalOpen,this,args);};
globalThis.indexedDB.databases=function(...args){enumerations++;return Reflect.apply(originalDatabases,this,args);};
await import('../background/service-worker.js');
const {inspectOriginalApplicationGenerationSelection,continueOriginalApplicationGenerationSelection,cancelOriginalApplicationGenerationSelection,openOriginalSelectedExistingApplication,APPLICATION_SELECTION_MARKER}=await import('../core/browser-native-sync/application-generation-selection.js');
const {DATABASE_NAME}=await import('../core/idb-repository.js');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const request=(value,sender)=>new Promise((resolve,reject)=>{let accepted=false;try{for(const listener of listeners)if(listener(value,sender,resolve)===true)accepted=true;if(!accepted)reject(Error('No original worker listener'));}catch(error){reject(error);}});
const sender={id:host.api.runtime.id,url:host.api.runtime.getURL('ui/archive.html'),frameId:0};

test('new original worker status ingress answers NULL without startup, DB or SDK work and has no mutation aftereffect',async()=>{
 const before={...host.counters},result=await request({type:'PAIA_GENERATION_STATUS'},sender);
 assert.equal(result.ok,true);assert.equal(result.data.state,'unavailable');assert.equal(result.data.productionActivation,false);
 await tick();await tick();
 assert.deepEqual(host.counters,before);assert.equal(databaseOpens,0);assert.equal(enumerations,0);assert.equal(isolationCalls,1);
 for(const forbidden of [
  {...sender,id:'foreign-extension'}, {...sender,url:'https://chatgpt.com/c/synthetic',tab:{id:1,incognito:false}},
  {...sender,url:'https://example.invalid/'}, {...sender,frameId:1}, {...sender,tab:{incognito:true}},
  {...sender,url:sender.url+'?untrusted=1'}, {...sender,url:sender.url+'#unrecognized'},
 ]){const denied=await request({type:'PAIA_GENERATION_STATUS'},forbidden);assert.equal(denied.ok,false);assert.equal(denied.error,'FORBIDDEN');}
 const extra=await request({type:'PAIA_GENERATION_STATUS',resume:true},sender);assert.equal(extra.ok,false);assert.equal(extra.error,'INVALID_REQUEST');
 assert.equal(databaseOpens,0);assert.equal(enumerations,0);assert.deepEqual(host.counters,before);
});

const nativeRead=(db,key)=>new Promise((resolve,reject)=>{const tx=db.transaction(['meta'],'readonly'),r=tx.objectStore('meta').get(key);let value;r.onsuccess=()=>{value=r.result;};tx.oncomplete=()=>resolve(value);tx.onabort=()=>reject(tx.error);});
const hash='1'.repeat(64),sourceId='synthetic_source',targetId='synthetic_target',operationId='synthetic_operation';
const receipt=phase=>({id:APPLICATION_SELECTION_MARKER,version:1,operationId,role:'source',phase,sourceDatabaseId:sourceId,targetDatabaseId:targetId,targetName:'SYNTHETIC-missing-target',datasetId:'synthetic_dataset',graphDigest:hash,canonicalDigest:hash,registryRoot:{active:{synthetic:true}},targetGate:{writeRevision:1},beforeDigest:hash,afterDigest:phase==='prepared'?null:hash,reservation:phase==='prepared'?null:{id:'local-control-publication:reservation',version:1,revision:1,nonce:operationId,databaseId:targetId,beforeDigest:hash,afterDigest:hash,fenceDigest:hash},fences:phase==='prepared'?null:{migration:{phase:'active',databaseId:targetId},gate:null,epoch:null}});
async function seed(t,value){
 const factory=new IDBFactory(),db=await new Promise((resolve,reject)=>{const r=factory.open(DATABASE_NAME,5);r.onupgradeneeded=()=>{const s=r.result.createObjectStore('meta',{keyPath:'id'});s.put({id:'migration',databaseId:sourceId});s.put(value);};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 t.after(()=>db.close());let writes=0,reads=0,localCalls=0;const opened=[],open=factory.open;
 factory.open=function(...args){opened.push(args[0]);return Reflect.apply(open,this,args);};
 const transaction=IDBDatabase.prototype.transaction;
 IDBDatabase.prototype.transaction=function(...args){if(args[1]==='readwrite'||args[1]==='versionchange')writes++;else reads++;return Reflect.apply(transaction,this,args);};
 t.after(()=>{IDBDatabase.prototype.transaction=transaction;});
 const local={get:async()=>{localCalls++;throw Error('No SDK observation needed');},set:async()=>{localCalls++;throw Error('No cold SDK writes');}};
 return {factory,db,local,opened,counts:()=>({writes,reads,localCalls})};
}

test('prepared source receipt remains explainable with missing target/registry; no cold cancellation, budget, or DB creation',async t=>{
 const row=receipt('prepared'),f=await seed(t,row),before=await f.factory.databases();
 const value=await inspectOriginalApplicationGenerationSelection(f.local,f.factory);
 assert.equal(value.state,'prepared');assert.equal(value.recoveryReason,'original-accounting-unavailable');
 assert.equal(value.observationOnly,true);assert.equal(value.originalDeadlineAvailable,false);assert.equal(value.originalAllowanceAvailable,false);
 for(const key of ['retryAllowed','cancelAvailable','coldWriteAllowed'])assert.equal(value[key],false);
 await assert.rejects(cancelOriginalApplicationGenerationSelection(f.local,f.factory),{code:'GENERATION_SELECTION_COLD_ACCOUNT_REQUIRED'});
 await assert.rejects(openOriginalSelectedExistingApplication(f.local,f.factory),{code:'GENERATION_SELECTION_PENDING'});
 assert.deepEqual(await nativeRead(f.db,APPLICATION_SELECTION_MARKER),row);assert.deepEqual(await f.factory.databases(),before);
 assert.ok(f.opened.every(name=>name===DATABASE_NAME));assert.equal(f.counts().writes,0);assert.equal(f.counts().localCalls,0);
});

test('dispatched remains UNKNOWN on repeated observation and continue; no replay or missing-target allocation',async t=>{
 const row=receipt('dispatched'),f=await seed(t,row),before=await f.factory.databases();
 for(const observe of [inspectOriginalApplicationGenerationSelection,continueOriginalApplicationGenerationSelection]){
  const value=await observe(f.local,f.factory);assert.equal(value.state,'outcome-unknown');assert.equal(value.operationId,operationId);assert.equal(value.coldWriteAllowed,false);assert.equal(value.retryAllowed,false);
 }
 await assert.rejects(cancelOriginalApplicationGenerationSelection(f.local,f.factory),{code:'GENERATION_SELECTION_OUTCOME_UNKNOWN'});
 assert.deepEqual(await nativeRead(f.db,APPLICATION_SELECTION_MARKER),row);assert.deepEqual(await f.factory.databases(),before);
 assert.ok(f.opened.every(name=>name===DATABASE_NAME));assert.equal(f.counts().writes,0);assert.equal(f.counts().localCalls,0);
});

test('missing, corrupt and incomplete selected dependencies fail closed without creating a database or modifying evidence',async t=>{
 const missing=new IDBFactory(),local={get:()=>assert.fail('unexpected SDK read'),set:()=>assert.fail('unexpected SDK write')};
 await assert.rejects(inspectOriginalApplicationGenerationSelection(local,missing));assert.deepEqual(await missing.databases(),[]);
 for(const row of [{...receipt('prepared'),phase:'unknown-future-phase'},receipt('selected')]){
  const f=await seed(t,row),before=await f.factory.databases();
  await assert.rejects(inspectOriginalApplicationGenerationSelection(f.local,f.factory));
  assert.deepEqual(await nativeRead(f.db,APPLICATION_SELECTION_MARKER),row);assert.deepEqual(await f.factory.databases(),before);
  assert.equal(f.counts().writes,0);assert.equal(f.counts().localCalls,0);
 }
});
