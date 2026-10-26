import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {IDBObjectStore} from './vendor/fake-indexeddb/build/esm/index.js';
import {dormantSelectionWorker,deferred} from './harness/dormant-selection-worker.mjs';
const ROW='paia-sync-local-lifecycle:v1';
async function prepare(t){const f=await dormantSelectionWorker(t,{stageOuterGate:true,observeActionLedger:true});await f.addPage();assert.equal((await f.bridge.sync.handle({type:'PAIA_SYNC_RESUME'},f.sender)).needsContextEnrollment,false);await f.bridge.selection.handle({type:'PAIA_GENERATION_PREPARE'},f.sender);return f;}
const activate=f=>f.bridge.activity.dispatch(control=>f.bridge.selection.handle({type:'PAIA_GENERATION_ACTIVATE'},f.sender,control));
function duringBatch(effect){const original=String.prototype.charCodeAt;let fired=false;
 String.prototype.charCodeAt=function(index){if(!fired&&String(this)==='private-row-identity'){fired=true;effect();}return Reflect.apply(original,this,[index]);};return {fired:()=>fired,restore:()=>{String.prototype.charCodeAt=original;}};
}
function nativeReads(f){const original=IDBObjectStore.prototype.get;let reads=0;IDBObjectStore.prototype.get=function(key){if(f.bridge.readActionLedger())reads++;return Reflect.apply(original,this,[key]);};return {count:()=>reads,restore:()=>{IDBObjectStore.prototype.get=original;}};}
async function evidence(f,name,data){await writeFile(join(f.path,name+'.json'),JSON.stringify(data,null,2)+'\n');}

test('batch measurement cannot turn a changed complete mutable binding into paid readiness',async t=>{
 const f=await prepare(t),configuration=(await import(pathToFileURL(join(f.path,'background/sync-lifecycle-configuration.js')))).readSyncLifecycleConfiguration(),reads=nativeReads(f),before=f.storageState.sets.length;
 const hook=duringBatch(()=>{const old=configuration.binding.generation;configuration.binding.generation='X'+old.slice(1);});let failure;
 try{await assert.rejects(activate(f),error=>{failure=error;return true;});}finally{hook.restore();reads.restore();}
 assert.equal(hook.fired(),true);assert.equal(failure.code,'BNS_SYNC_SELECTION_INVALID');assert.equal(reads.count(),0);assert.equal(f.hostMessages.some(x=>x.message?.type==='PAIA_PROMPT_INSERTION_SELECTION_HOLD'),false);assert.equal(f.storageState.sets.length,before);const ledger=f.bridge.readActionLedger();assert.equal(ledger.invalid,true);assert.equal(ledger.pending,0);assert.equal(f.externalRequests(),0);await evidence(f,'BATCH-MUTABLE-BINDING',{label:'synthetic callback after full binding measurement but before unchanged comparison',error:failure.code,nativeReads:reads.count(),ledger,writesBefore:before,writesAfter:f.storageState.sets.length});
});

test('an original PAUSE accepted during batch measurement invalidates currentness and still settles independently',async t=>{
 const f=await prepare(t),arrived=deferred(),release=deferred(),reads=nativeReads(f);let pause;
 f.storageState.set=async(value,write)=>{if(value[ROW]?.mode==='paused'){arrived.resolve();await release.promise;}return write();};
 const hook=duringBatch(()=>{pause=f.bridge.sync.handle({type:'PAIA_SYNC_PAUSE'},f.sender);pause.catch(()=>{});});let failure;
 try{await assert.rejects(activate(f),error=>{failure=error;return true;});hook.restore();assert.equal(hook.fired(),true);assert.ok(pause);await arrived.promise;const ledger=f.bridge.readActionLedger();assert.equal(ledger.invalid,true);assert.equal(ledger.pending,0);assert.equal(reads.count(),0);assert.equal(f.hostMessages.some(x=>x.message?.type==='PAIA_PROMPT_INSERTION_SELECTION_HOLD'),false);release.resolve();await pause;assert.equal((await f.storage.get(ROW))[ROW].mode,'paused');assert.deepEqual(f.bridge.readActionLedger(),ledger);await evidence(f,'BATCH-REENTRANT-PAUSE',{label:'synthetic executable measurement callback accepting actual original stop',error:failure.code,nativeReads:reads.count(),ledger,durableMode:'paused'});}
 finally{hook.restore();reads.restore();release.resolve();}
 assert.equal(f.externalRequests(),0);
});

test('original editor withdrawal during batch measurement is checked before original native work',async t=>{
 const f=await prepare(t),reads=nativeReads(f),before=f.storageState.sets.length,hook=duringBatch(()=>f.bridge.editors.close());let failure;
 try{await assert.rejects(activate(f),error=>{failure=error;return true;});}finally{hook.restore();reads.restore();}
 assert.equal(hook.fired(),true);assert.equal(reads.count(),0);assert.equal(f.storageState.sets.length,before);const ledger=f.bridge.readActionLedger();assert.equal(ledger.invalid,true);assert.equal(ledger.pending,0);assert.equal(f.externalRequests(),0);await evidence(f,'BATCH-OWNER-WITHDRAWAL',{label:'synthetic original owner withdrawal during charged measurement',error:failure.code,nativeReads:reads.count(),ledger});
});
