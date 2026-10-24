// Native-clock/initial-consume successor. Every original budget ceiling and
// overflow/sticky-denial oracle remains; only prior real metadata spend is deducted.
import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import * as original from '../background/organize-action-source.js';
import {spentObserver,actualCost} from './harness/organize-metadata-cost-observer.mjs';
const event=()=>({addListener(){},removeListener(){}});
async function fixture(t){
 const {s}=await setup(OrganizerStore),topic=await s.createTopic({name:'Synthetic source facts',operationId:crypto.randomUUID()}),entry=await s.createEntry({actor:'user',operationId:crypto.randomUUID(),body:'Synthetic selected body',type:'idea',formation:'explicit',evidence:[]});
 await s.placeEntry({topicId:topic.id,entryId:entry.id,expectedEntryRevision:entry.revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:crypto.randomUUID()});
 const sender={id:'synthetic',frameId:0,documentId:'document',url:'chrome-extension://synthetic/ui/archive.html',tab:{id:1,windowId:2,incognito:false}},api={runtime:{id:sender.id,getURL:p=>'chrome-extension://synthetic/'+p,async getContexts(){return [{contextType:'TAB',documentId:sender.documentId,documentUrl:sender.url,tabId:1,windowId:2,frameId:0,incognito:false}];}},tabs:{onUpdated:event(),onRemoved:event(),async get(){return {...sender.tab,url:sender.url};}}};
 const source=original.createOrganizeActionSource(s,api),scope=await source.select(sender,{topicId:topic.id});const repository=s.repository,database=repository.db;t.after(()=>{source.dispose();database.close();});
 // Observe actual native requests made by the fixed metadata producer, not
 // returned cursor rows or an arbitrary per-transaction budget.
 const measured=spentObserver();let action;try{action=await source.consume(sender,{topicId:topic.id,scopeBinding:scope.scopeBinding,userActionId:crypto.randomUUID()});}finally{measured.restore();}
 assert.equal(measured.passes.length,1);const paid=actualCost(measured.passes[0]);
 const metadata=await s.run(()=>s.repository.transaction(false,async tx=>{const proof=await captureOriginalOrganizeScope(s,tx,topic.id);try{return readOriginalOrganizeScope(proof,s,tx);}finally{releaseOriginalOrganizeScope(proof);}}));
 // This authored one-Entry fixture has no selected Input/Source/presentation;
 // preserve the exact facts schema while measuring paid receipts, never body.
 assert.equal(metadata.presentation,null);assert.deepEqual(metadata.inputs,[]);assert.deepEqual(metadata.sources,[]);assert.deepEqual(metadata.organizationSources,[]);assert.deepEqual(metadata.dependencies,[]);assert.deepEqual(metadata.provenance,[]);assert.equal(metadata.restrictionTopics.length,1);
 assert.equal(paid.reads,12,'this exact selection issues twelve original metadata requests');assert.ok(paid.bytes>0);const spent={...paid};t.diagnostic(JSON.stringify({consumePaidCost:paid}));
 return {s,repository,database,source,scope,action,sender,api,spent,metadata};
}
import {captureOriginalOrganizeScope,readOriginalOrganizeScope,releaseOriginalOrganizeScope} from '../core/organizer/organize-processing-scope.js';
import {DEFAULT_LIMITS} from '../core/organizer/budget.js';
const charge=(f,reads,bytes)=>original.chargeOriginalOrganizeActionWork(f.source,f.action,f.s,reads,bytes);
async function proof(f,fn){return f.s.run(()=>f.repository.transaction(false,async tx=>{const measured=spentObserver();let p;try{p=await captureOriginalOrganizeScope(f.s,tx,f.scope.topicId,f.source,f.action);}finally{measured.restore();}assert.equal(measured.passes.length,1);const cost=actualCost(measured.passes[0]);assert.deepEqual(readOriginalOrganizeScope(p,f.s,tx),f.metadata,'repeated selection preserves exact facts without pretending another full metadata tree was retained');f.spent.reads+=cost.reads;f.spent.bytes+=cost.bytes;try{return await fn(tx,p);}finally{releaseOriginalOrganizeScope(p);}}));}

test('deny-only work charges need the exact consumed private action and Store',async t=>{
 const f=await fixture(t);assert.equal(charge(f,0,0),undefined);
 for(const [source,action,store]of [[{...f.source},f.action,f.s],[f.source,{...f.action},f.s],[f.source,f.action,{...f.s}]])assert.throws(()=>original.chargeOriginalOrganizeActionWork(source,action,store,1,0));
 assert.equal(charge(f,1,0),undefined);assert.equal(original.assertOriginalOrganizeActionFacts(f.source,f.action,f.s),true);
});
test('metadata and original qualified charges share one cumulative read budget',async t=>{
 const f=await fixture(t);
 await proof(f,(tx,p)=>{charge(f,4096-f.spent.reads-1,0);original.chargeOriginalOrganizeWork(f.source,f.action,f.s,tx,p,{reads:1,bytes:0});});
 assert.equal(charge(f,0,0),undefined);assert.throws(()=>charge(f,1,0),e=>e.code==='BUDGET_EXCEEDED');
 assert.throws(()=>charge(f,0,0));assert.equal(await f.source.current(f.action,f.sender),false);
});
test('metadata and original qualified charges share the original byte budget',async t=>{
 const f=await fixture(t);
 await proof(f,(tx,p)=>{charge(f,0,DEFAULT_LIMITS.sessionBytes-f.spent.bytes-1);original.chargeOriginalOrganizeWork(f.source,f.action,f.s,tx,p,{reads:0,bytes:1});});
 assert.throws(()=>charge(f,0,1),e=>e.code==='BUDGET_EXCEEDED');assert.throws(()=>charge(f,0,0));
});
test('pure terminal accounting rejects public clock replacement without callbacks or abort dispatch',async t=>{
 const f=await fixture(t),intent=await proof(f,(tx,p)=>original.readOriginalOrganizeAction(f.source,f.action,f.s,tx,p));let clocks=0,callbacks=0;
 intent.signal.addEventListener('abort',()=>callbacks++);const now=Date.now,p=Object.getOwnPropertyDescriptor(performance,'now');
 Date.now=()=>{clocks++;throw Error('CALLER_CLOCK');};Object.defineProperty(performance,'now',{configurable:true,value:()=>{clocks++;throw Error('CALLER_CLOCK');}});
 try{assert.throws(()=>charge(f,0,0));assert.equal(clocks,0);assert.equal(callbacks,0);assert.equal(intent.signal.aborted,false);}finally{Date.now=now;if(p)Object.defineProperty(performance,'now',p);else delete performance.now;}
 assert.throws(()=>charge(f,0,0));f.source.release(f.action);assert.equal(callbacks,1);assert.equal(intent.signal.aborted,true);f.source.release(f.action);assert.equal(callbacks,1);
});
test('costs are primitive integers and never coerce an object or execute its accessors',async t=>{
 const f=await fixture(t);let calls=0;const fake={get reads(){calls++;throw Error('GETTER');},valueOf(){calls++;throw Error('COERCE');}};
 for(const [reads,bytes]of [[fake,0],[0,fake],[-1,0],[0,-1],[NaN,0],[Infinity,0],[0.5,0],[0,undefined]])assert.throws(()=>charge(f,reads,bytes));
 assert.equal(calls,0);charge(f,1,1);assert.equal(original.assertOriginalOrganizeActionFacts(f.source,f.action,f.s),true);
});
test('safe integer maximum cannot overflow the bounded private counters',async t=>{
 const f=await fixture(t);charge(f,1,1);assert.throws(()=>charge(f,Number.MAX_SAFE_INTEGER,0),e=>e.code==='BUDGET_EXCEEDED');assert.throws(()=>charge(f,0,0));
});
test('zero-cost calls do not revive release, invalidation, disposal or sampled expiry',async t=>{
 for(const method of ['release','invalidate','dispose','expire']){
  const f=await fixture(t);if(method==='release')f.source.release(f.action);else if(method==='expire'){const now=Date.now,tick=now();Date.now=()=>tick+30001;try{assert.throws(()=>original.assertOriginalOrganizeActionCurrent(f.source,f.action,f.s));}finally{Date.now=now;}}else f.source[method]();
  assert.throws(()=>charge(f,0,0));
 }
});
test('descriptor invalidation is deny-only and cannot be reversed by restoring the old value',async t=>{
 const f=await fixture(t),d=Object.getOwnPropertyDescriptor(f.s,'repository');let getters=0;
 Object.defineProperty(f.s,'repository',{configurable:true,enumerable:d.enumerable,get(){getters++;return d.value;}});
 try{assert.throws(()=>charge(f,1,0));assert.equal(getters,0);}finally{Object.defineProperty(f.s,'repository',d);}
 assert.throws(()=>charge(f,0,0));assert.equal(getters,0);
});
