import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {IDBObjectStore} from './vendor/fake-indexeddb/build/esm/index.js';
import {dormantSelectionWorker,deferred,tick} from './harness/dormant-selection-worker.mjs';
const ROW='paia-sync-local-lifecycle:v1';
async function prepared(t){
 const f=await dormantSelectionWorker(t,{stageOuterGate:true,observeActionLedger:true});await f.addPage();let saved=null;
 f.storageState.set=(value,write)=>{if(Object.hasOwn(value,ROW))saved=value[ROW];return write();};
 const resumed=await f.bridge.sync.handle({type:'PAIA_SYNC_RESUME'},f.sender);assert.equal(resumed.needsContextEnrollment,false);assert.ok(saved?.enrollmentSettlement);await f.bridge.selection.handle({type:'PAIA_GENERATION_PREPARE'},f.sender);return {...f,saved};
}
function holdNative(f){const original=IDBObjectStore.prototype.get,arrived=deferred(),release=deferred();let held=false;
 IDBObjectStore.prototype.get=function(key){const request=Reflect.apply(original,this,[key]);if(!held&&key==='context-connection-runtime:v1'&&f.bridge.readActionLedger()){held=true;let callback;Object.defineProperty(request,'onsuccess',{configurable:true,get(){return event=>{arrived.resolve();release.promise.then(()=>callback?.call(request,event));};},set(value){callback=value;}});}return request;};
 return {arrived:arrived.promise,release:()=>release.resolve(),restore:()=>{IDBObjectStore.prototype.get=original;release.resolve();}};
}
const activate=f=>f.bridge.activity.dispatch(control=>f.bridge.selection.handle({type:'PAIA_GENERATION_ACTIVATE'},f.sender,control));

test('private row detaches retained SDK root/nested aliases and keeps original queued PAUSE/DISCONNECT durable',async t=>{
 const f=await prepared(t),hold=holdNative(f);t.after(hold.restore);const action=activate(f);action.catch(()=>{});await hold.arrived;
 const before=f.bridge.readActionLedger();assert.equal(before.invalid,false);f.saved.mode='disconnected';f.saved.enrollmentSettlement.phase='pending';f.saved.enrollmentSettlement.confirmedRevision=null;
 assert.equal((await f.bridge.sync.snapshot()).state,'active');assert.equal(f.bridge.readActionLedger().invalid,false,'retained old SDK aliases are not the private published row');
 const pauseArrived=deferred(),pauseRelease=deferred();f.storageState.set=async(value,write)=>{if(value[ROW]?.mode==='paused'){pauseArrived.resolve();await pauseRelease.promise;}return write();};
 const pause=f.bridge.sync.handle({type:'PAIA_SYNC_PAUSE'},f.sender);pause.catch(()=>{});await pauseArrived.promise;const disconnect=f.bridge.sync.handle({type:'PAIA_SYNC_DISCONNECT'},f.sender);disconnect.catch(()=>{});
 hold.release();await assert.rejects(action);const stoppedMeter=f.bridge.readActionLedger();assert.equal(stoppedMeter.invalid,true);assert.equal(stoppedMeter.pending,0);
 pauseRelease.resolve();await pause;await disconnect;const durable=(await f.storage.get(ROW))[ROW];assert.equal(durable.mode,'disconnected');assert.equal(durable.enrollmentSettlement.phase,'confirmed');assert.deepEqual(f.bridge.readActionLedger(),stoppedMeter,'independent durable stop writes must not debit the retired action');
 await writeFile(join(f.path,'PRIVATE-ROW-ALIAS-STOPS.json'),JSON.stringify({label:'synthetic private-row alias detachment and actual original queued stops',before,stoppedMeter,durableMode:durable.mode,durableSettlement:durable.enrollmentSettlement.phase,externalRequests:f.externalRequests()},null,2)+'\n');assert.equal(f.externalRequests(),0);
});

test('owned immutable row never replaces complete actual SDK raw-row CAS',async t=>{
 const f=await prepared(t);let altered=false;f.storageState.get=async(key,read)=>{const raw=await read();if(key===ROW&&f.bridge.readActionLedger()){altered=true;return {[ROW]:{...raw[ROW],revision:raw[ROW].revision+1}};}return raw;};
 const before=f.storageState.sets.length;let failure;await assert.rejects(activate(f),error=>{failure=error;return true;});const ledger=f.bridge.readActionLedger();await writeFile(join(f.path,'PRIVATE-ROW-RAW-CAS.json'),JSON.stringify({label:'synthetic full actual raw lifecycle row drift remains closed',altered,error:failure?.code,stack:failure?.stack,ledger,setsBefore:before,setsAfter:f.storageState.sets.length,externalRequests:f.externalRequests()},null,2)+'\n');
 assert.equal(altered,true);assert.equal(failure.code,'BNS_SYNC_STATE_CHANGED');assert.equal(ledger.invalid,true);assert.equal(ledger.pending,0);assert.equal(f.storageState.sets.length,before);assert.equal(f.externalRequests(),0);
});

test('private row clone and freeze use definition-time captures before first action installation',async t=>{
 const f=await prepared(t),hold=holdNative(f);t.after(hold.restore);const clone=globalThis.structuredClone,freeze=Object.freeze;let rowCloneSubstitutions=0,rowFreezeSubstitutions=0;
 globalThis.structuredClone=value=>{if(value?.bindingId&&value?.mode){rowCloneSubstitutions++;return value;}return clone(value);};Object.freeze=value=>{if(value?.bindingId&&value?.mode){rowFreezeSubstitutions++;return value;}return freeze(value);};
 let action;try{action=activate(f);action.catch(()=>{});await hold.arrived;assert.equal(rowCloneSubstitutions,0);assert.equal(rowFreezeSubstitutions,0);f.saved.mode='disconnected';assert.equal((await f.bridge.sync.snapshot()).state,'active');f.bridge.editors.close();hold.release();await assert.rejects(action);}finally{globalThis.structuredClone=clone;Object.freeze=freeze;hold.restore();}
 assert.equal(f.bridge.readActionLedger().invalid,true);assert.equal(f.externalRequests(),0);
});
