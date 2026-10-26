import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {dormantSelectionWorker} from './harness/dormant-selection-worker.mjs';

// New failure-focused accounting control for the corrected path. This is NOT a
// replay of the old dispatched-marker success expectation; no phase is assumed.
test('full repeated owner/native operand accounting refuses an unfunded dormant action without an SDK selection',async t=>{
 const fixtureStarted=performance.now(),f=await dormantSelectionWorker(t,{stageOuterGate:true,observeActionLedger:true});await f.addPage();const resumed=await f.bridge.sync.handle({type:'PAIA_SYNC_RESUME'},f.sender);assert.equal(resumed.needsContextEnrollment,false);await f.bridge.selection.handle({type:'PAIA_GENERATION_PREPARE'},f.sender);
 const before=f.storageState.sets.length,started=performance.now();let failure;await assert.rejects(f.bridge.activity.dispatch(control=>f.bridge.selection.handle({type:'PAIA_GENERATION_ACTIVATE'},f.sender,control)),e=>{failure=e;return true;});const actionElapsedMs=performance.now()-started,ledger=f.bridge.readActionLedger();
 await writeFile(join(f.path,'COMPLETE-METER-REFUSAL.json'),JSON.stringify({label:'synthetic corrected full-operand budget refusal; no successful activation',ledger,actionElapsedMs,fixtureElapsedMs:performance.now()-fixtureStarted,error:failure?.code,stack:failure?.stack,setsBefore:before,setsAfter:f.storageState.sets.length,externalRequests:f.externalRequests()},null,2)+'\n');
 assert.equal(ledger.invalid,true);assert.equal(ledger.pending,0);assert.ok(ledger.references>4096||ledger.bytes>2*1024*1024,'the real corrected action must retain its actual exhausted ledger, not the former incomplete stage-cost inference');assert.equal(f.storageState.sets.length,before);assert.equal(f.externalRequests(),0);assert.equal(f.bridge.editors.blocksMutation(f.sender),true);assert.equal(f.hostMessages.some(x=>x.message?.type==='PAIA_PROMPT_INSERTION_SELECTION_RELEASE'),false);
});
