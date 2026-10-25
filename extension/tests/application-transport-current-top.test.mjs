import test from 'node:test';
import assert from 'node:assert/strict';
import {selectionAdmissionWorker,tick,deferred} from './harness/selection-admission-worker.mjs';
const make=t=>selectionAdmissionWorker(t,{capture:true,currentTop:true});
const independentAdmissionFree=async f=>{const token=await f.bridge.coordination.holdLocalMaintenance();assert.equal(f.bridge.coordination.assertLocalMaintenanceHeld(token),true);assert.equal(f.bridge.coordination.releaseLocalMaintenance(token),true);const capture=await f.bridge.capture.holdForApplicationSelection();assert.equal(await f.bridge.capture.fenceApplicationSelection(capture),true);assert.equal(f.bridge.capture.releaseApplicationSelection(capture),true);};
const releases=f=>f.hostMessages.filter(({message})=>message.type==='PAIA_PROMPT_INSERTION_DOCUMENT_RELEASE');
const originalSourcesFree=async f=>{const token=await f.bridge.coordination.holdApplicationSources();assert.equal(await f.bridge.coordination.fenceApplicationSources(token),true);assert.equal(f.bridge.coordination.releaseApplicationSources(token),true);const capture=await f.bridge.capture.holdForApplicationSelection();assert.equal(await f.bridge.capture.fenceApplicationSelection(capture),true);assert.equal(f.bridge.capture.releaseApplicationSelection(capture),true);};

test('current-top release waits for the actual SDK promise and shares one cleanup on repeated release',async t=>{
 const f=await make(t),c=f.bridge.transports,gate=deferred(),entered=deferred();
 const before=await f.bridge.receipts.inspect(),token=await c.hold();
 f.hostState.send=async(message,_target,actual)=>{const result=await actual();if(message.type.endsWith('_RELEASE')){entered.resolve();await gate.promise;}return result;};
 const release=c.release(token);assert.equal(c.release(token),release);await entered.promise;
 let settled=false;release.then(()=>{settled=true;});await tick();assert.equal(settled,false);
 await assert.rejects(c.hold(),{code:'GENERATION_WORKER_NOT_QUIET'});assert.equal(c.current(token),false);assert.equal(releases(f).length,1);
 gate.resolve();assert.equal(await release,true);assert.equal(await c.release(token),false);
 f.hostState.send=null;const next=await c.hold();assert.equal(await c.fence(next),true);assert.equal(await c.release(next),true);
 assert.deepEqual(await f.bridge.receipts.inspect(),before);assert.equal(before.legacyCoverageUnknown,true);
});

test('source acquisition failure retains a late current-top lease until its exact asynchronous release settles',async t=>{
 const f=await make(t),c=f.bridge.transports,held=await f.bridge.coordination.holdApplicationSources();
 const holdGate=deferred(),holdEntered=deferred(),releaseGate=deferred(),releaseEntered=deferred();
 f.hostState.send=async(message,_target,actual)=>{const result=await actual();if(message.type.endsWith('_HOLD')){holdEntered.resolve();await holdGate.promise;}if(message.type.endsWith('_RELEASE')){releaseEntered.resolve();await releaseGate.promise;}return result;};
 const acquisition=c.hold();const refused=assert.rejects(acquisition,{code:'GENERATION_WORKER_NOT_QUIET'});await holdEntered.promise;
 const cleanup=c.close();assert.equal(c.close(),cleanup);let finished=false;cleanup.then(()=>{finished=true;});
 await tick();assert.equal(finished,false);await assert.rejects(c.hold(),{code:'GENERATION_WORKER_NOT_QUIET'});assert.equal(releases(f).length,0);
 holdGate.resolve();await releaseEntered.promise;await refused;await tick();assert.equal(finished,false);assert.equal(releases(f).length,1);
 releaseGate.resolve();assert.equal(await cleanup,true);assert.equal(releases(f).length,1);
 assert.equal(f.bridge.coordination.applicationSourcesHeld(held),true,'failed borrower never releases another source holder');
 f.bridge.coordination.releaseApplicationSources(held);await originalSourcesFree(f);
});

for(const outcome of ['false','reject'])test('failed original document release '+outcome+' permanently refuses aggregate reuse but releases other original owners',async t=>{
 const f=await make(t),c=f.bridge.transports,token=await c.hold();
 f.hostState.send=async(message,_target,actual)=>{const result=await actual();if(message.type.endsWith('_RELEASE')){if(outcome==='reject')throw new Error('SYNTHETIC_RELEASE_LOST');return {version:1,released:false};}return result;};
 assert.equal(await c.release(token),false);assert.equal(await c.close(),false,'repeated close cannot relabel failed cleanup');assert.equal(releases(f).length,1);await assert.rejects(c.hold(),{code:'GENERATION_WORKER_NOT_QUIET'});await independentAdmissionFree(f);
 await assert.rejects(f.bridge.receipts.resolveReceiver(7,'https://chatgpt.com/c/synthetic-selection'),{code:'PROMPT_INSERTION_HELD'},'failed document cleanup preserves its original receipt restriction');
 assert.equal((await f.bridge.receipts.inspect()).legacyCoverageUnknown,true);
});

for(const mode of ['missing-profile','incomplete-inventory'])test('current-top transport refuses '+mode+' without substituting a warm receipt proof',async t=>{
 const f=await make(t),c=f.bridge.transports;
 if(mode==='missing-profile')f.hostState.send=async(message,_target,actual)=>{const result=await actual();if(message.type==='PAIA_PROMPT_INSERTION_RECEIVER_PROBE')return {version:result.version,nonce:result.nonce};return result;};
 else f.hostState.query=()=>[];
 await assert.rejects(c.hold(),{code:'GENERATION_WORKER_NOT_QUIET'});await c.close();
 assert.equal(f.hostMessages.filter(({message})=>message.type.endsWith('_HOLD')).length,0);await originalSourcesFree(f);
 assert.equal((await f.bridge.receipts.inspect()).legacyCoverageUnknown,true);assert.equal(f.bridge.selection.enabled,false);
});

test('topology change cleans the already-issued successful token and never synthesizes a failed Error capability',async t=>{
 const f=await make(t),c=f.bridge.transports,token=await c.hold();f.api.tabs.onUpdated.emit(7,{status:'loading'});
 assert.equal(c.current(token),false);await assert.rejects(c.fence(token),{code:'GENERATION_WORKER_NOT_QUIET'});
 assert.equal(await c.release(token),true);assert.equal(releases(f).length,1);
 await originalSourcesFree(f);assert.equal((await f.bridge.receipts.inspect()).legacyCoverageUnknown,true);
});


test('release cannot reopen aggregate admission while a real original document FENCE remains unsettled',async t=>{
 const f=await make(t),c=f.bridge.transports,token=await c.hold(),gate=deferred(),entered=deferred();
 f.hostState.send=async(message,_target,actual)=>{const result=await actual();if(message.type.endsWith('_FENCE')){entered.resolve();await gate.promise;}return result;};
 const fence=c.fence(token),refused=assert.rejects(fence,{code:'OUTCOME_UNKNOWN'});await entered.promise;
 let released=false;const release=c.release(token);release.then(()=>{released=true;});await tick();await tick();
 assert.equal(releases(f).length,1);assert.equal(released,false,'original SDK FENCE has not settled although RELEASE replied');
 await assert.rejects(c.hold(),{code:'GENERATION_WORKER_NOT_QUIET'});
 gate.resolve();await refused;assert.equal(await release,true);
 f.hostState.send=null;const next=await c.hold();assert.equal(await c.fence(next),true);assert.equal(await c.release(next),true);
});
