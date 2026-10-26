import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import FDBObjectStore from './vendor/fake-indexeddb/build/esm/FDBObjectStore.js';
import {dormantSelectionWorker,deferred,tick} from './harness/dormant-selection-worker.mjs';

// Failure-focused synthetic native adapter schedule, not real IndexedDB/browser
// acceptance. All original action/owner/native-scope identities stay genuine.
test('accepted original native result after revocation debits the same ledger before refusing and retaining pins',async t=>{
 const f=await dormantSelectionWorker(t,{stageOuterGate:true,observeActionLedger:true});await f.addPage();const resumed=await f.bridge.sync.handle({type:'PAIA_SYNC_RESUME'},f.sender);assert.equal(resumed.needsContextEnrollment,false);await f.bridge.selection.handle({type:'PAIA_GENERATION_PREPARE'},f.sender);
 const payload='L'.repeat(64*1024),original=FDBObjectStore.prototype.get,arrived=deferred(),release=deferred();let held=false,delivered=false;
 FDBObjectStore.prototype.get=function(key){const request=original.call(this,key);if(!held&&key==='context-connection-runtime:v1'&&f.bridge.readActionLedger()&&!f.bridge.readActionLedger().invalid){held=true;let callback;Object.defineProperty(request,'onsuccess',{configurable:true,get(){return event=>{arrived.resolve();release.promise.then(()=>{delivered=true;request.result={...request.result,syntheticLatePayload:payload};callback?.call(request,event);});};},set(value){callback=value;}});}return request;};
 t.after(()=>{FDBObjectStore.prototype.get=original;release.resolve();});
 const started=performance.now(),sets=f.storageState.sets.length,action=f.bridge.activity.dispatch(control=>f.bridge.selection.handle({type:'PAIA_GENERATION_ACTIVATE'},f.sender,control));let finished=false,error;action.then(()=>{finished=true;},e=>{finished=true;error=e;});
 await arrived.promise;f.bridge.editors.close();await tick();await tick();
 const before=f.bridge.readActionLedger();assert.equal(before.invalid,true);assert.ok(before.pending>0);assert.equal(delivered,false);assert.equal(finished,false);
 release.resolve();await assert.rejects(action);const after=f.bridge.readActionLedger();
 await writeFile(join(f.path,'LATE-NATIVE-METER.json'),JSON.stringify({label:'synthetic actual native result after restriction loss; same private ledger',before,after,actionElapsedMs:performance.now()-started,delivered,latePayloadBytes:payload.length,error:error?.code,setsBefore:sets,setsAfter:f.storageState.sets.length,externalRequests:f.externalRequests()},null,2)+'\n');
 assert.equal(delivered,true);assert.ok(after.bytes-before.bytes>=payload.length,'full late native payload must debit BEFORE invalid currentness refuses, not merely later unwind bookkeeping');assert.ok(after.references>before.references);assert.equal(after.invalid,true);assert.equal(after.pending,0);assert.equal(f.storageState.sets.length,sets);assert.equal(f.externalRequests(),0);assert.equal(f.bridge.editors.blocksMutation(f.sender),true);assert.equal(f.hostMessages.some(x=>x.message?.type==='PAIA_PROMPT_INSERTION_SELECTION_RELEASE'),false);
});
