import test from 'node:test';
import assert from 'node:assert/strict';
import {holdBoundedOrganizerForApplicationSelection} from '../core/organizer/bounded-workflow.js';
import {selectionAdmissionWorker,tick,deferred} from './harness/selection-admission-worker.mjs';

test('original worker source hold includes all three default Organize admissions',async t=>{
 const f=await selectionAdmissionWorker(t),c=f.bridge.coordination,{original,ai,bounded}=f.bridge.organizers;
 const token=await c.holdApplicationSources();
 await assert.rejects(original.wake({manual:false}),{code:'GENERATION_WORKER_BUSY'});
 await assert.rejects(ai.status({summaryOnly:true}),{code:'GENERATION_WORKER_BUSY'});
 const detached=ai.status;await assert.rejects(detached({summaryOnly:true}),{code:'GENERATION_WORKER_BUSY'});
 await assert.rejects(bounded.status(),{code:'GENERATION_WORKER_BUSY'});
 assert.equal(await c.fenceApplicationSources(token),true);assert.equal(c.releaseApplicationSources(token),true);
 assert.deepEqual(await original.wake({manual:false}),{pending:false,error:'MANUAL_ACTION_REQUIRED'});
});

test('an actual queued configured status remains busy and is never cancelled for the hold',async t=>{
 const f=await selectionAdmissionWorker(t),c=f.bridge.coordination,{ai}=f.bridge.organizers,gate=deferred(),entered=deferred();
 const blocking=f.bridge.store.run(()=>{entered.resolve();return gate.promise;});await entered.promise;
 let statusEnded=false;const pending=ai.status({summaryOnly:true}).finally(()=>{statusEnded=true;});pending.catch(()=>{});
 assert.throws(()=>holdBoundedOrganizerForApplicationSelection(f.bridge.organizers.bounded,f.bridge.store),{code:'GENERATION_WORKER_BUSY'});
 const holding=c.holdApplicationSources();holding.catch(()=>{});
 try{
  await tick();assert.equal(statusEnded,false);gate.resolve();await blocking;await pending;
  await assert.rejects(holding,{code:'GENERATION_WORKER_NOT_QUIET'}); // aggregate also observes earlier owners released after the busy refusal
  assert.equal(statusEnded,true);
  const next=await c.holdApplicationSources();assert.equal(await c.fenceApplicationSources(next),true);c.releaseApplicationSources(next);
 }finally{gate.resolve();await Promise.allSettled([blocking,pending,holding]);}
});

test('warm source proof preserves historical Organize UNKNOWN and still grants no activation',async t=>{
 const f=await selectionAdmissionWorker(t),c=f.bridge.coordination;
 const rows=[{id:'originalProviderRequest:older-unknown',state:'outcome_unknown',requestId:'older-unknown'},{id:'boundedOrganizerAction:older-unknown',state:'outcome_unknown'}];
 await f.bridge.store.repository.transaction(true,async tr=>{for(const row of rows)await tr.put('meta',row);},['meta']);
 const token=await c.holdApplicationSources();assert.equal(await c.fenceApplicationSources(token),true);
 for(const row of rows)assert.deepEqual(await f.bridge.store.repository.transaction(false,tr=>tr.get('meta',row.id),['meta']),row);
 assert.equal(f.bridge.selection.enabled,false);await assert.rejects(f.bridge.selection.handle({type:'PAIA_GENERATION_ACTIVATE'},f.sender),{code:'GENERATION_SELECTION_UNAVAILABLE'});
 c.releaseApplicationSources(token);
});
