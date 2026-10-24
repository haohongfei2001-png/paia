// Successor to the retained 4/7 first round: only deduct original UPDATE
// metadata already spent, using actual request counts and closed retained bytes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture as originalFixture} from './harness/organize-material-method-fixture.mjs';
import {chargeOriginalOrganizeActionWork,assertOriginalOrganizeActionFacts} from '../background/organize-action-source.js';
import {captureOriginalOrganizeScope,readOriginalOrganizeScope,releaseOriginalOrganizeScope} from '../core/organizer/organize-processing-scope.js';
import {captureOrganizeProcessingGrant,releaseOrganizeProcessingGrant} from '../background/organize-processing-policy.js';

import {spentObserver,actualCost} from './harness/organize-metadata-cost-observer.mjs';
async function fixture(t,options={}){
 if(options.consume===false)return originalFixture(t,options);
 const measured=spentObserver();let f;try{f=await originalFixture(t,options);}finally{measured.restore();}
 assert.equal(measured.passes.length,2);assert.deepEqual(measured.passes.map(pass=>pass.requests),[12,12],'original GET and consumed UPDATE each use twelve actual metadata requests');
 const paid=actualCost(measured.passes[1]);
 const m=await f.s.run(()=>f.s.repository.transaction(false,async tx=>{const proof=await captureOriginalOrganizeScope(f.s,tx,f.topic.id);try{return readOriginalOrganizeScope(proof,f.s,tx);}finally{releaseOriginalOrganizeScope(proof);}}));
 assert.equal(m.presentation,null);for(const k of ['inputs','sources','organizationSources','dependencies','provenance'])assert.deepEqual(m[k],[]);assert.equal(m.restrictionTopics.length,1);
 f.consumeCost=paid;t.diagnostic(JSON.stringify({consumePaidCost:paid}));return f;
}
function requestCounter(tx){
 let starts=0;const seen=new WeakSet(),original=tx.tx.objectStore.bind(tx.tx);const wrap=target=>{if(seen.has(target))return target;seen.add(target);for(const name of ['get','openCursor'])if(typeof target[name]==='function'){const method=target[name].bind(target);target[name]=(...args)=>{starts++;return method(...args);};}if(typeof target.index==='function'){const index=target.index.bind(target);target.index=(...args)=>wrap(index(...args));}return target;};tx.tx.objectStore=(...args)=>wrap(original(...args));return ()=>starts;
}
async function capture(f,{source=f.source,action=f.action,body=()=>{}}={}){
 let proof,grant,reads=0,requests=0;
 try{return await f.s.run(()=>f.s.repository.transaction(false,async tx=>{
  const before=tx.metrics.reads,count=requestCounter(tx);
  try{proof=await captureOriginalOrganizeScope(f.s,tx,f.topic.id,source,action);grant=captureOrganizeProcessingGrant(source,action,f.s,tx,proof);return await body({tx,proof,grant});}
  finally{reads=tx.metrics.reads-before;requests=count();releaseOrganizeProcessingGrant(grant);releaseOriginalOrganizeScope(proof);}
 })).then(value=>({value,reads,requests}),error=>({error,reads,requests}));}
 finally{releaseOrganizeProcessingGrant(grant);releaseOriginalOrganizeScope(proof);}
}
test('consumed metadata debits its exhausted original action before any underlying read',async t=>{
 const f=await fixture(t);chargeOriginalOrganizeActionWork(f.source,f.action,f.s,4096-f.consumeCost.reads,0);const result=await capture(f);assert.equal(result.reads,0);assert.equal(result.error?.code,'BUDGET_EXCEEDED');assert.throws(()=>assertOriginalOrganizeActionFacts(f.source,f.action,f.s));
});
test('fresh readonly transactions share the same consumed-action metadata budget',async t=>{
 const f=await fixture(t),first=await capture(f);t.diagnostic(JSON.stringify({firstMetricsReads:first.reads,firstRequests:first.requests}));assert.equal(first.error,undefined);assert.ok(first.reads>0&&first.reads<100);chargeOriginalOrganizeActionWork(f.source,f.action,f.s,4096-f.consumeCost.reads-first.requests-1,0);const next=await capture(f);assert.equal(next.reads,1);assert.equal(next.requests,1);assert.equal(next.error?.code,'BUDGET_EXCEEDED');
});
test('a GET-only metadata proof cannot be laundered into a consumed UPDATE field grant',async t=>{
 const f=await fixture(t);await f.s.run(()=>f.s.repository.transaction(false,async tx=>{const proof=await captureOriginalOrganizeScope(f.s,tx,f.topic.id);try{assert.equal(readOriginalOrganizeScope(proof,f.s,tx).topic.id,f.topic.id);assert.throws(()=>captureOrganizeProcessingGrant(f.source,f.action,f.s,tx,proof));}finally{releaseOriginalOrganizeScope(proof);}}));
});
test('metadata source and action must be present together and original before IO',async t=>{
 const f=await fixture(t);for(const [source,action]of [[null,f.action],[f.source,null],[{...f.source},f.action],[f.source,{...f.action}]]){const result=await capture(f,{source,action});assert.ok(result.error);assert.equal(result.reads,0);}
});
test('a bound proof cannot receive another original consumed action grant',async t=>{
 const f=await fixture(t),other=await fixture(t);const result=await capture(f,{body:({tx,proof})=>assert.throws(()=>captureOrganizeProcessingGrant(other.source,other.action,f.s,tx,proof))});assert.equal(result.error,undefined);
});
test('retained metadata bytes debit the original action and cannot mint a proof after overflow',async t=>{
 const f=await fixture(t);chargeOriginalOrganizeActionWork(f.source,f.action,f.s,0,2*1024*1024-f.consumeCost.bytes);let minted=false;const result=await capture(f,{body:()=>{minted=true;}});assert.equal(result.error?.code,'BUDGET_EXCEEDED');assert.equal(minted,false);assert.ok(result.reads>0&&result.reads<100);
});
test('GET selection keeps its independent bounded metadata path without a consumed action',async t=>{
 const f=await fixture(t,{consume:false});await f.s.run(()=>f.s.repository.transaction(false,async tx=>{const proof=await captureOriginalOrganizeScope(f.s,tx,f.topic.id);try{assert.equal(readOriginalOrganizeScope(proof,f.s,tx).topic.id,f.topic.id);assert.throws(()=>captureOrganizeProcessingGrant(f.source,null,f.s,tx,proof));}finally{releaseOriginalOrganizeScope(proof);}}));
});
