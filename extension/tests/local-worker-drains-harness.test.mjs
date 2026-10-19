import test from 'node:test';
import assert from 'node:assert/strict';
import {SafetyRunner} from '../core/thought-runner.js';
import {LibraryRunner} from '../core/library-runner.js';
import {FilterRunner} from '../core/filter-runner.js';
import {observeLocalWorkerDrains} from './harness/local-worker-drains.mjs';
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
test('observer waits for actual initial and requested recursive drains without substituting work',async()=>{
 const old=SafetyRunner.prototype.wake,observed=observeLocalWorkerDrains(),held=deferred();let calls=0;
 const store={async processPurgeCleanup(){if(++calls===1)await held.promise;return {pending:false};},async processInvalidations(){return {pending:false};}};
 const runner=new SafetyRunner(store);const original=runner.wake();assert.equal(original,runner.running);assert.equal(runner.wake(),original);
 let done=false;const idle=observed.idle().then(()=>{done=true;});await Promise.resolve();assert.equal(done,false);held.resolve();await idle;
 assert.equal(calls,2,'the real requested wake performs a second original drain');assert.equal(runner.running,null);observed.dispose();assert.equal(SafetyRunner.prototype.wake,old);
});
test('observer includes original Library and Filter instances from two worker generations',async()=>{
 const observed=observeLocalWorkerDrains();const store={async processPurgeCleanup(){return {pending:false};},async processInvalidations(){return {pending:false};},async processLibraryMaintenance(){return {pending:false};},async filterStatus(){return {mode:'off'};}};
 for(let generation=0;generation<2;generation++)for(const Type of [SafetyRunner,LibraryRunner,FilterRunner])new Type(store).wake({retry:true});
 await observed.idle();observed.assertOwners();observed.dispose();
});
test('observer retains original synchronous argument refusal and asynchronous runner failure',async()=>{
 const observed=observeLocalWorkerDrains(),runner=new SafetyRunner({async processPurgeCleanup(){throw Error('synthetic local failure');}});
 assert.throws(()=>runner.wake(null),TypeError);await runner.wake();assert.equal(runner.failed,true);await assert.rejects(observed.idle(),/original local runner/);observed.dispose();
});
