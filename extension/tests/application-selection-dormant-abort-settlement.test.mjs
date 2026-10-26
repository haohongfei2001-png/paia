import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {existingSelectionFixture} from './harness/existing-application-selection.mjs';
import {createOriginalApplicationSelectionForLifecycle,holdOriginalApplicationSelectionReview,readOriginalApplicationSelectionAction,invalidateOriginalApplicationSelectionAction} from '../core/browser-native-sync/application-generation-selection.js';

// Genuine original core action, not a driver capability and not native/browser
// commit evidence. No inner SDK guard or production command guard is removed.
test('action abort uses definition-time constructor, signal accessor and abort despite post-import prototype substitution',async t=>{
 const f=await existingSelectionFixture(t),{owner,portal}=createOriginalApplicationSelectionForLifecycle(f.a,f.coreA,f.a.local);await owner.prepare();t.after(()=>owner.close());
 const C=globalThis.AbortController,abort=C.prototype.abort,signal=Object.getOwnPropertyDescriptor(C.prototype,'signal'),aborted=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get,add=EventTarget.prototype.addEventListener;
 let fakeCalls=0,events=0;const fakeSignal={aborted:false};
 try{
  globalThis.AbortController=class {constructor(){fakeCalls++;}get signal(){return fakeSignal;}abort(){fakeCalls++;}};
  C.prototype.abort=()=>{fakeCalls++;};Object.defineProperty(C.prototype,'signal',{...signal,get(){fakeCalls++;return fakeSignal;}});
  const hold=holdOriginalApplicationSelectionReview(owner,f.a,f.coreA,f.a.local),action=portal.begin(hold),actual=readOriginalApplicationSelectionAction(action).signal;
  assert.notEqual(actual,fakeSignal);assert.equal(aborted.call(actual),false);add.call(actual,'abort',()=>{events++;});
  invalidateOriginalApplicationSelectionAction(action);assert.equal(aborted.call(actual),true);assert.equal(events,1);assert.equal(fakeCalls,0);
  assert.throws(()=>portal.current(action));portal.retire(action);
 }finally{globalThis.AbortController=C;C.prototype.abort=abort;Object.defineProperty(C.prototype,'signal',signal);}
});

test('dormant success source has post-finish and post-actual-wait original holder sweeps with no intervening asynchronous cleanup',async()=>{
 const source=await readFile(new URL('../background/application-selection-reservation-coordination.js',import.meta.url),'utf8');
 assert.match(source,/const result=await session\.portal\.finish\(action\);allHeld\(r\);if\(r\.pending\.size\)fail\('GENERATION_SELECTION_OUTCOME_UNKNOWN'\);r\.phase='terminal';return result;/);
 assert.match(source,/observe\(waitActual\(r\),\(\)=>\{try\{if\(!error\)\{allHeld\(r\);if\(r\.pending\.size\|\|r\.memberPending\.size\|\|r\.unobservable\)fail\('GENERATION_SELECTION_OUTCOME_UNKNOWN'\);\}if\(!r\.unobservable\)\{session\.retire\(\);r\.settled=true;/);
 assert.match(source,/independent review[\s\S]*?fail\('BNS_GROUP_RESOURCE_LIMIT'\);\s*session\.sdk\(\);/);
 // This assertion qualifies source order only: success remains unreachable
 // while the independent terminal-demand proof and production premise lack.
});
