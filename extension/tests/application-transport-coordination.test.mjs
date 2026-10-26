import test from 'node:test';
import assert from 'node:assert/strict';
import {selectionAdmissionWorker,tick,deferred} from './harness/selection-admission-worker.mjs';
const options=f=>({sourceCoordination:f.bridge.coordination,captureRecovery:f.bridge.capture,promptInsertionReceipts:f.bridge.receipts,store:f.bridge.store,api:f.api});
test('fixed original current-top owners compose without granting activation or historical coverage',async t=>{
 const f=await selectionAdmissionWorker(t,{capture:true,currentTop:true}),c=f.bridge.transports;
 const token=await c.hold();assert.equal(c.current(token),true);assert.equal(c.current({}),false);assert.equal(await c.release({}),false);
 assert.equal(await c.fence(token),true);const status=await f.bridge.receipts.inspect();assert.equal(status.legacyCoverageUnknown,true);assert.equal(status.productionActivation,false);
 assert.equal(await c.release(token),true);assert.equal(c.current(token),false);assert.equal(await c.release(token),false);
 const second=await c.hold();assert.equal(await c.fence(second),true);await c.release(second);
 assert.equal(f.bridge.selection.enabled,false,'current-top composition does not enable configured selection');
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
 const f=await selectionAdmissionWorker(t,{capture:true,currentTop:true}),base=options(f);
 for(const extra of [{sourceCoordination:{...base.sourceCoordination}},{captureRecovery:{...base.captureRecovery}},{promptInsertionReceipts:Object.create(Object.getPrototypeOf(base.promptInsertionReceipts))},{api:{...f.api}}]){
  const c=f.bridge.makeTransport({...base,...extra});await assert.rejects(c.hold());await c.close();
 }
 const token=await f.bridge.transports.hold();assert.equal(await f.bridge.transports.fence(token),true);await f.bridge.transports.release(token);
});
test('capture admission during hold invalidates the composition without replaying capture',async t=>{
 const f=await selectionAdmissionWorker(t,{capture:true,currentTop:true}),c=f.bridge.transports;const token=await c.hold();
 const result=await f.bridge.capture.repairAll(true);assert.equal(result.status,'not-admitted');assert.equal(c.current(token),false);await assert.rejects(c.fence(token));await c.release(token);
 const next=await c.hold();assert.equal(await c.fence(next),true);await c.release(next);
});
test('timed out original capture keeps aggregate closed through its actual settlement',async t=>{
 const timers=new Map(),set=globalThis.setTimeout,clear=globalThis.clearTimeout;
 globalThis.setTimeout=(fn,ms,...args)=>{if(ms>=29000){const id={};timers.set(id,()=>fn(...args));return id;}return set(fn,ms,...args);};
 globalThis.clearTimeout=id=>{if(!timers.delete(id))clear(id);};
 t.after(()=>{globalThis.setTimeout=set;globalThis.clearTimeout=clear;});
 const gate=deferred(),hostHeld=deferred();let block=false,queries=0;
 const f=await selectionAdmissionWorker(t,{capture:true,currentTop:true,captureQuery:()=>{queries++;if(block){block=false;return gate.promise;}return [{id:7,windowId:1,url:'https://chatgpt.com/c/synthetic-selection',incognito:false,discarded:false,frozen:false}];}}),c=f.bridge.transports;
 f.hostState.send=(message,_target,actual)=>{if(message.type.endsWith('_HOLD'))hostHeld.resolve();return actual();};
 block=true;const repair=f.bridge.capture.repairAll(true);await tick();let firstResult=null;
 const first=c.hold().then(value=>{firstResult={value};},error=>{firstResult={error};});await hostHeld.promise;await tick();const before=queries;
 try{
  for(const [id,fire] of [...timers])if(timers.delete(id))fire();await first;assert.ok(firstResult.error);
  await assert.rejects(c.hold(),{code:'GENERATION_WORKER_NOT_QUIET'});assert.equal(queries,before);
  block=false;gate.resolve([]);await repair;await tick();await tick();
  await assert.rejects(c.hold(),{code:'GENERATION_WORKER_NOT_QUIET'},'timeout does not fabricate quietness after late settlement');
  assert.equal(queries,before,'release does not invent a query');
 }finally{block=false;gate.resolve([]);await repair;await first;}
});
