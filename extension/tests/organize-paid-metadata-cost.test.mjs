import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './harness/organize-material-method-fixture.mjs';
import {captureOriginalOrganizeScope,readOriginalOrganizeScope,releaseOriginalOrganizeScope,registerOriginalOrganizePaidMetadataBaseline} from '../core/organizer/organize-processing-scope.js';
import {chargeOriginalOrganizeActionWork,assertOriginalOrganizeActionFacts} from '../background/organize-action-source.js';
import {spentObserver,actualCost} from './harness/organize-metadata-cost-observer.mjs';
async function capture(f){let proof,facts,error;try{await f.s.run(()=>f.s.repository.transaction(false,async tx=>{try{proof=await captureOriginalOrganizeScope(f.s,tx,f.topic.id,f.source,f.action);facts=readOriginalOrganizeScope(proof,f.s,tx);}finally{releaseOriginalOrganizeScope(proof);}}));}catch(e){error=e;}return {facts,error};}
async function measuredFixture(t){const observer=spentObserver();let f;try{f=await fixture(t);}finally{observer.restore();}assert.equal(observer.passes.length,2);assert.deepEqual(observer.passes.map(x=>x.requests),[12,12]);assert.equal(observer.passes[0].receiptTuples,0);assert.ok(observer.passes[1].receiptTuples>0);const initial=actualCost(observer.passes[1]);t.diagnostic(JSON.stringify({initial,consume:observer.passes[1]}));return {...f,initial};}

test('initial consume pays all original projections and every new numeric receipt before reuse',async t=>{
 const f=await measuredFixture(t);assert.ok(f.initial.bytes>5589);
 const observer=spentObserver();let result;try{result=await capture(f);}finally{observer.restore();}
 assert.equal(result.error,undefined);assert.equal(observer.passes.length,1);const next=actualCost(observer.passes[0]);assert.equal(next.reads,12);assert.equal(observer.passes[0].receiptTuples,0);assert.equal(observer.passes[0].observations,1);assert.ok(next.bytes>2&&next.bytes<f.initial.bytes);t.diagnostic(JSON.stringify({next,observation:observer.passes[0]}));
 chargeOriginalOrganizeActionWork(f.source,f.action,f.s,0,2*1024*1024-f.initial.bytes-next.bytes-1);
 chargeOriginalOrganizeActionWork(f.source,f.action,f.s,0,1);
 assert.throws(()=>chargeOriginalOrganizeActionWork(f.source,f.action,f.s,0,1),e=>e.code==='BUDGET_EXCEEDED');assert.throws(()=>assertOriginalOrganizeActionFacts(f.source,f.action,f.s));
});

test('a fresh proof observation cannot be published on a fully spent original byte ledger',async t=>{
 const f=await measuredFixture(t);chargeOriginalOrganizeActionWork(f.source,f.action,f.s,0,2*1024*1024-f.initial.bytes);
 const observer=spentObserver();let result;try{result=await capture(f);}finally{observer.restore();}
 assert.equal(result.error?.code,'BUDGET_EXCEEDED');assert.equal(result.facts,undefined);assert.equal(observer.passes.length,1);assert.equal(observer.passes[0].requests,12);assert.equal(observer.passes[0].receiptTuples,0);assert.equal(observer.passes[0].observations,1);
 assert.throws(()=>assertOriginalOrganizeActionFacts(f.source,f.action,f.s));
});

test('repeated readonly captures keep request fees cumulative, independent of metadata identity reuse',async t=>{
 const f=await measuredFixture(t),observer=spentObserver();let first;try{first=await capture(f);}finally{observer.restore();}assert.equal(first.error,undefined);
 chargeOriginalOrganizeActionWork(f.source,f.action,f.s,4096-f.initial.reads-observer.passes[0].requests-1,0);
 const next=spentObserver();let rejected;try{rejected=await capture(f);}finally{next.restore();}
 assert.equal(rejected.error?.code,'BUDGET_EXCEEDED');assert.equal(next.passes.length,1);assert.equal(next.passes[0].requests,1);assert.equal(rejected.facts,undefined);
});

test('a free GET facts object cannot replace the first paid capture identity',async t=>{
 const f=await fixture(t);let free;
 await f.s.run(()=>f.s.repository.transaction(false,async tx=>{const proof=await captureOriginalOrganizeScope(f.s,tx,f.topic.id);try{free=readOriginalOrganizeScope(proof,f.s,tx);}finally{releaseOriginalOrganizeScope(proof);}}));
 assert.throws(()=>registerOriginalOrganizePaidMetadataBaseline(f.source,f.action,f.s,free));assert.throws(()=>assertOriginalOrganizeActionFacts(f.source,f.action,f.s));
});
