// Separate process: every original module captures the same controllable
// monotonic clock before import. No production source or timer is replaced.
import test from 'node:test';
import assert from 'node:assert/strict';
const descriptor=Object.getOwnPropertyDescriptor(globalThis,'performance'),realNow=performance.now.bind(performance);let offset=0;
Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>realNow()+offset}});
const {existingSelectionFixture}=await import('./harness/existing-application-selection.mjs');
const {local}=await import('./harness/thought-m1.mjs');
const {STORAGE_KEY}=await import('../core/constants.js');
const {OriginalApplicationGenerationSelection,holdOriginalApplicationSelectionReview:hold,requireOriginalApplicationSelectionReviewHold:current,releaseOriginalApplicationSelectionReviewHold:release,requalifyOriginalApplicationSelectionReviewHold:renew,readOriginalApplicationSelectionReview:reviewIdentity}=await import('../core/browser-native-sync/application-generation-selection.js');
Object.defineProperty(globalThis,'performance',descriptor);
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
test('fixed original hold deadline rejects late raw-read completion without a timeout callback or renewed clock',async t=>{
 const base=local(),entered=deferred(),gate=deferred();let armed=false,sets=0;
 const storage={async get(key){const value=await base.get(key);if(armed&&key===STORAGE_KEY){armed=false;entered.resolve();await gate.promise;}return value;},async set(value){sets++;return base.set(value);}};
 const f=await existingSelectionFixture(t,{sourceLocal:storage}),owner=new OriginalApplicationGenerationSelection(f.a,f.coreA,storage);t.after(()=>{owner.close();gate.resolve();offset=0;});
 const review=await owner.prepare(),token=hold(owner,f.a,f.coreA,storage);assert.deepEqual(await renew(token,owner),review);const before={a:await f.snapshot(f.a),b:await f.snapshot(f.b),sets};
 armed=true;const pending=renew(token,owner);pending.catch(()=>{});await entered.promise;
 // The actual core hold clock expires. There is no caller timeout/invalidation
 // callback: the original CAS itself must reject rather than promote a handle.
 offset+=30001;gate.resolve();await assert.rejects(pending,{code:'GENERATION_SELECTION_NOT_PREPARED'});
 assert.throws(()=>reviewIdentity(owner,f.a,f.coreA,storage),{code:'GENERATION_SELECTION_NOT_PREPARED'});assert.throws(()=>current(token,owner));assert.throws(()=>release(token,owner));await assert.rejects(owner.activate(),{code:'GENERATION_SELECTION_BUSY'});
 assert.deepEqual(await f.snapshot(f.a),before.a);assert.deepEqual(await f.snapshot(f.b),before.b);assert.equal(sets,before.sets);
});
