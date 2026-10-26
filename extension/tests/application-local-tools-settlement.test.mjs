import test from 'node:test';
import assert from 'node:assert/strict';
import {selectionAdmissionWorker,tick,deferred} from './harness/selection-admission-worker.mjs';

test('failed aggregate acquisition retains exclusion while another original tool is still draining',async t=>{
 const f=await selectionAdmissionWorker(t),c=f.bridge.localTools,{backups,imports}=f.bridge.tools;
 imports.ledger.adapters.add('synthetic-v1');
 const importTask=await imports.ledger.begin({consent:true,adapterId:'synthetic-v1',fingerprint:'a'.repeat(64)},f.sender.documentId);
 const draft=await backups.beginRestore(),state=backups.restores.get(draft.sessionId),entered=deferred(),gate=deferred();
 state.validator.add=async()=>{entered.resolve();await gate.promise;};
 const stage=backups.stageRestore({...draft,items:[{type:'item',value:{id:'synthetic-retained'}}]});await entered.promise;
 const holding=c.hold();holding.catch(()=>{});
 try{
  // Let the actual Import snapshot reject its nonterminal task while Backup's
  // already accepted validator stays physically pending. No timer is cancelled.
  let importReleased=false;
  for(let i=0;i<1000&&!importReleased;i++){try{await imports.ledger.list();importReleased=true;}catch(error){if(error.code!=='LOCAL_TOOL_SELECTION_HELD')throw error;}if(!importReleased)await tick();}
  assert.equal(importReleased,true,'original failed Import lease actually released');
  await assert.rejects(c.hold(),{code:'GENERATION_WORKER_NOT_QUIET'});
  assert.equal(state.staging,true);
  assert.throws(()=>backups.beginRestore(),{code:'LOCAL_TOOL_SELECTION_HELD'});
 }finally{gate.resolve();await Promise.allSettled([stage,holding]);}
 assert.equal(state.items.length,1);
 assert.equal(state.staging,false);
 await imports.ledger.cancel(importTask,f.sender.documentId);
 const next=await c.hold();assert.equal(c.current(next),true);assert.equal(c.release(next),true);
});

test('release retains aggregate exclusion until the accepted original fence actually settles',async t=>{
 const f=await selectionAdmissionWorker(t),c=f.bridge.localTools,token=await c.hold(),entered=deferred(),gate=deferred();
 const queued=f.bridge.store.run(async()=>{entered.resolve();await gate.promise;});await entered.promise;
 const fencing=c.fence(token);fencing.catch(()=>{});
 try{
  assert.equal(c.release(token),false,'a pending original fence is not settled cleanup');
  await assert.rejects(c.hold(),{code:'GENERATION_WORKER_NOT_QUIET'});
  assert.equal(c.current(token),false);
 }finally{gate.resolve();await queued;await assert.rejects(fencing);}
 const next=await c.hold();assert.equal(c.current(next),true);assert.equal(c.release(token),false);assert.equal(c.release(next),true);
});

test('close while an original acquisition drains stays closed after actual late cleanup',async t=>{
 const f=await selectionAdmissionWorker(t),c=f.bridge.localTools,{backups}=f.bridge.tools,draft=await backups.beginRestore(),state=backups.restores.get(draft.sessionId),entered=deferred(),gate=deferred();
 state.validator.add=async()=>{entered.resolve();await gate.promise;};
 const stage=backups.stageRestore({...draft,items:[{type:'item',value:{id:'synthetic-close-retained'}}]});await entered.promise;
 const holding=c.hold();holding.catch(()=>{});
 try{
  assert.equal(c.close(),false);assert.equal(c.close(),false);
  await assert.rejects(c.hold(),{code:'GENERATION_WORKER_NOT_QUIET'});
  assert.equal(state.staging,true);
 }finally{gate.resolve();await stage;await assert.rejects(holding);}
 assert.equal(c.close(),true);assert.equal(state.items.length,1);
 await assert.rejects(c.hold(),{code:'GENERATION_WORKER_NOT_QUIET'});
});

test('foreign original hold is not stolen and repeated close preserves failed cleanup',async t=>{
 const f=await selectionAdmissionWorker(t),c=f.bridge.localTools,{backups}=f.bridge.tools;
 const foreign=await backups.holdForApplicationSelection();
 try{
  await assert.rejects(c.hold());
  assert.equal(backups.applicationSelectionHeld(foreign),true);
  assert.equal(c.close(),false);assert.equal(c.close(),false);
 }finally{assert.equal(backups.releaseApplicationSelection(foreign),true);}
 await assert.rejects(c.hold(),{code:'GENERATION_WORKER_NOT_QUIET'});
});

test('two accepted fences settle before a later failed acquisition retains its own result',async t=>{
 const f=await selectionAdmissionWorker(t),c=f.bridge.localTools,{backups}=f.bridge.tools,token=await c.hold(),entered=deferred(),gate=deferred();
 const queued=f.bridge.store.run(async()=>{entered.resolve();await gate.promise;});await entered.promise;
 const first=c.fence(token),second=c.fence(token);first.catch(()=>{});second.catch(()=>{});
 assert.equal(c.release(token),false);gate.resolve();await queued;await Promise.allSettled([first,second]);
 const foreign=await backups.holdForApplicationSelection();
 try{await assert.rejects(c.hold());assert.equal(c.close(),false);assert.equal(c.close(),false);}
 finally{assert.equal(backups.releaseApplicationSelection(foreign),true);}
});
