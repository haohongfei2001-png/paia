import test from 'node:test';
import assert from 'node:assert/strict';
import {STORAGE_KEY} from '../core/constants.js';
import {existingSelectionFixture} from './harness/existing-application-selection.mjs';
import {createOriginalApplicationSelectionForLifecycle,holdOriginalApplicationSelectionReview,readOriginalApplicationSelectionAction,APPLICATION_SELECTION_MARKER} from '../core/browser-native-sync/application-generation-selection.js';
import {originalStagedApplicationSelectionTransaction,originalApplicationSelectionRead} from '../core/idb-repository.js';
import {readOriginalApplicationSelectionPhase,bindOriginalApplicationSelectionPhaseScope,requireOriginalApplicationSelectionDriverDispatch,requireOriginalApplicationSelectionMember} from '../background/application-selection-reservation-coordination.js';

// A genuine foreign factory/portal is stronger than a copied DTO. It still
// cannot mint the FIXED driver's phase/native scope or dispatch permission.
// No configured command seam, actual SDK selection, or native browser here.
test('genuine foreign lifecycle portal cannot acquire fixed driver phase, readonly attribution or dispatch',async t=>{
 const f=await existingSelectionFixture(t),{owner,portal}=createOriginalApplicationSelectionForLifecycle(f.a,f.coreA,f.a.local);await owner.prepare();
 t.after(()=>owner.close());const hold=holdOriginalApplicationSelectionReview(owner,f.a,f.coreA,f.a.local),action=portal.begin(hold),info=readOriginalApplicationSelectionAction(action);let entered=0;
 assert.equal(info.owner,owner);assert.equal(info.phase,'held-review');assert.equal(info.sdkAttempted,false);
 assert.throws(()=>requireOriginalApplicationSelectionMember(action,owner,'editor'),{code:'GENERATION_SELECTION_CAPABILITY'});
 assert.throws(()=>originalApplicationSelectionRead(f.a.repository,action,()=>{entered++;},['meta']),{code:'GENERATION_SELECTION_CAPABILITY'});
 for(const phase of [{},Object.freeze(Object.create(null)),{action,repository:f.a.repository,phase:'source-prepared'}]){
  assert.throws(()=>readOriginalApplicationSelectionPhase(phase,f.a.repository,{},['meta']),{code:'GENERATION_SELECTION_CAPABILITY'});
  assert.throws(()=>bindOriginalApplicationSelectionPhaseScope(phase,f.a.repository,{tx:{db:f.a.repository.db}}),{code:'GENERATION_SELECTION_CAPABILITY'});
  assert.throws(()=>originalStagedApplicationSelectionTransaction(f.a.repository,{},phase,()=>{entered++;},['meta']),{code:'GENERATION_SELECTION_CAPABILITY'});
 }
 assert.throws(()=>requireOriginalApplicationSelectionDriverDispatch(action),{code:'GENERATION_SELECTION_CAPABILITY'});
 await assert.rejects(portal.renew(action),{code:'GENERATION_SELECTION_CAPABILITY'});assert.equal(entered,0);
 assert.equal(await f.a.repository.transaction(false,t=>t.get('meta',APPLICATION_SELECTION_MARKER),['meta']),undefined);
 assert.equal((await f.a.local.get(STORAGE_KEY))[STORAGE_KEY]?.databaseId,f.a.databaseId);
 portal.retire(action);owner.close();
});
