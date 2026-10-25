import test from 'node:test';
import assert from 'node:assert/strict';
import {selectionAdmissionWorker,tick,deferred} from './harness/selection-admission-worker.mjs';
const options=f=>({sourceCoordination:f.bridge.coordination,captureRecovery:f.bridge.capture,promptInsertionReceipts:f.bridge.receipts,store:f.bridge.store,api:f.api});
test('fixed original warm owners compose without granting activation or historical coverage',async t=>{
 const f=await selectionAdmissionWorker(t,{capture:true}),c=f.bridge.transports;
 const token=await c.hold();assert.equal(c.current(token),true);assert.equal(c.current({}),false);assert.equal(c.release({}),false);
 assert.equal(await c.fence(token),true);const status=await f.bridge.receipts.inspect();assert.equal(status.legacyCoverageUnknown,true);assert.equal(status.productionActivation,false);
 assert.equal(c.release(token),true);assert.equal(c.current(token),false);assert.equal(c.release(token),false);
 const second=await c.hold();assert.equal(await c.fence(second),true);c.release(second);
 assert.equal(f.bridge.selection.enabled,false,'warm composition does not enable configured selection');
 for(const type of ['PAIA_GENERATION_ACTIVATE','PAIA_GENERATION_CONTINUE','PAIA_GENERATION_RESTART']){
  await assert.rejects(f.bridge.selection.handle({type},f.sender),{code:'GENERATION_SELECTION_UNAVAILABLE'});
  assert.deepEqual(await f.rpc(type),{ok:false,error:'STORAGE_FAILED'}); // original public error mapping
 }
});
test('missing capture owner refuses before borrowing original source gates',async t=>{
 const f=await selectionAdmissionWorker(t);await assert.rejects(f.bridge.transports.hold());
 const token=await f.bridge.coordination.holdApplicationSources();assert.equal(await f.bridge.coordination.fenceApplicationSources(token),true);assert.equal(f.bridge.coordination.releaseApplicationSources(token),true);
});
test('copied fixed owners and foreign API cannot manufacture composition',async t=>{
 const f=await selectionAdmissionWorker(t,{capture:true}),base=options(f);
 for(const extra of [{sourceCoordination:{...base.sourceCoordination}},{captureRecovery:{...base.captureRecovery}},{promptInsertionReceipts:Object.create(Object.getPrototypeOf(base.promptInsertionReceipts))},{api:{...f.api}}]){
  const c=f.bridge.makeTransport({...base,...extra});await assert.rejects(c.hold());c.close();
 }
 const token=await f.bridge.transports.hold();assert.equal(await f.bridge.transports.fence(token),true);f.bridge.transports.release(token);
});
test('capture admission during hold invalidates the composition without replaying capture',async t=>{
 const f=await selectionAdmissionWorker(t,{capture:true}),c=f.bridge.transports;const token=await c.hold();
 const result=await f.bridge.capture.repairAll(true);assert.equal(result.status,'not-admitted');assert.equal(c.current(token),false);await assert.rejects(c.fence(token));
 const next=await c.hold();assert.equal(await c.fence(next),true);c.release(next);
});
test('timed out original capture remains pending and old completion cannot clear a new hold',async t=>{
 // Only original long deadline timers are advanced; real short IndexedDB
 // scheduling must continue, otherwise the fixture itself cannot initialize.
 const timers=new Map(),set=globalThis.setTimeout,clear=globalThis.clearTimeout;
 globalThis.setTimeout=(fn,ms,...args)=>{if(ms>=29000){const id={};timers.set(id,()=>fn(...args));return id;}return set(fn,ms,...args);};
 globalThis.clearTimeout=id=>{if(!timers.delete(id))clear(id);};
 t.after(()=>{globalThis.setTimeout=set;globalThis.clearTimeout=clear;});
 const gate=deferred();let block=false,queries=0;
 const f=await selectionAdmissionWorker(t,{capture:true,captureQuery:()=>{queries++;return block?gate.promise:[];}}),c=f.bridge.transports;
 block=true;const repair=f.bridge.capture.repairAll(true);await tick();const before=queries;let firstResult=null;
 const first=c.hold().then(value=>{firstResult={value};},error=>{firstResult={error};});await tick();await tick();
 try{
  for(const [id,fire] of [...timers])if(timers.delete(id))fire();await first;await tick();assert.ok(firstResult.error);assert.equal(queries,before);
  let secondResult=null;const second=c.hold().then(value=>{secondResult={value};return value;},error=>{secondResult={error};throw error;});
  await tick();assert.equal(secondResult,null,'physical query has not settled');block=false;gate.resolve([]);await repair;
  const token=await second;assert.equal(c.current(token),true);assert.equal(await c.fence(token),true);assert.equal(c.release(token),true);assert.equal(queries,before,'release does not invent a query');
 }finally{block=false;gate.resolve([]);await repair;await first;}
});
