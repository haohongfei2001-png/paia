import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './harness/organize-material-method-fixture.mjs';
import {spentObserver,actualCost} from './harness/organize-metadata-cost-observer.mjs';
import {captureOriginalOrganizeScope,captureOriginalOrganizeCommitScope,readOriginalOrganizeScope,registerOriginalOrganizeCommitSelectionFence,releaseOriginalOrganizeScope} from '../core/organizer/organize-processing-scope.js';
import {assertOriginalOrganizeActionFacts,chargeOriginalOrganizeActionWork} from '../background/organize-action-source.js';
import {registerRepositoryFinalReadFence} from '../core/idb-repository.js';
const marker='organize-commit-selection-test';
const exists=f=>f.s.repository.transaction(false,t=>t.get('meta',marker));
const commit=async(f,body)=>{let proof;try{return await f.s.run(()=>f.s.repository.transaction(true,async tx=>{proof=await captureOriginalOrganizeCommitScope(f.s,tx,f.topic.id,f.source,f.action);return body(tx,proof);}));}finally{releaseOriginalOrganizeScope(proof);}};

test('an original consumed action registers a metadata-only fence in its actual writable scope',async t=>{
 const f=await fixture(t);await commit(f,async(tx,proof)=>{const metadata=readOriginalOrganizeScope(proof,f.s,tx);assert.equal(metadata.topic.id,f.topic.id);assert.equal(JSON.stringify(metadata).includes('PRIVATE'),false);assert.equal(registerOriginalOrganizeCommitSelectionFence(proof,f.s,tx),true);assert.equal(registerOriginalOrganizeCommitSelectionFence(proof,f.s,tx),true);await tx.put('meta',{id:marker,ok:true});});assert.equal((await exists(f)).ok,true);
});
test('the old readonly scope does not admit a writable transaction',async t=>{
 const f=await fixture(t);await assert.rejects(f.s.repository.transaction(true,tx=>captureOriginalOrganizeScope(f.s,tx,f.topic.id)));
});
test('copied and foreign metadata proofs cannot register a final authority',async t=>{
 const f=await fixture(t);await commit(f,async(tx,proof)=>{assert.throws(()=>registerOriginalOrganizeCommitSelectionFence({...proof},f.s,tx));assert.throws(()=>registerOriginalOrganizeCommitSelectionFence(proof,{...f.s},tx));assert.throws(()=>registerOriginalOrganizeCommitSelectionFence(proof,f.s,{...tx}));registerOriginalOrganizeCommitSelectionFence(proof,f.s,tx);await tx.put('meta',{id:marker,ok:true});});assert.equal((await exists(f)).ok,true);
});
test('the original action budget is debited before the first writable metadata IO',async t=>{
 const measured=spentObserver();let f;try{f=await fixture(t);}finally{measured.restore();}assert.equal(measured.passes.length,2);const paid=actualCost(measured.passes[1]);assert.equal(paid.reads,12);chargeOriginalOrganizeActionWork(f.source,f.action,f.s,4096-paid.reads,0);let reads=-1;await assert.rejects(f.s.repository.transaction(true,async tx=>{const before=tx.metrics.reads;try{await captureOriginalOrganizeCommitScope(f.s,tx,f.topic.id,f.source,f.action);}finally{reads=tx.metrics.reads-before;}}));assert.equal(reads,0);assert.equal(await exists(f),undefined);assert.throws(()=>assertOriginalOrganizeActionFacts(f.source,f.action,f.s));
});
test('release before real Repository settlement rejects the staged metadata write',async t=>{
 const f=await fixture(t);await assert.rejects(commit(f,async(tx,proof)=>{registerOriginalOrganizeCommitSelectionFence(proof,f.s,tx);await tx.put('meta',{id:marker,ok:true});releaseOriginalOrganizeScope(proof);}));assert.equal(await exists(f),undefined);
});
test('a later original Repository current callback cannot retire an already checked action and commit',async t=>{
 const f=await fixture(t);let armed=false,invalidations=0;await assert.rejects(commit(f,async(tx,proof)=>{registerOriginalOrganizeCommitSelectionFence(proof,f.s,tx);registerRepositoryFinalReadFence(f.s.repository,tx,{plan:function*(){return true;},isCurrent:()=>{if(armed){invalidations++;f.source.invalidate();}return true;}});await tx.put('meta',{id:marker,ok:true});armed=true;}));assert.ok(invalidations>0);assert.equal(await exists(f),undefined);
});
test('a later callback pure action retirement without abort still prevents commit',async t=>{
 const f=await fixture(t);let armed=false,observed=false;await assert.rejects(commit(f,async(tx,proof)=>{registerOriginalOrganizeCommitSelectionFence(proof,f.s,tx);registerRepositoryFinalReadFence(f.s.repository,tx,{plan:function*(){return true;},isCurrent:()=>{if(armed&&!observed){observed=true;const descriptor=Object.getOwnPropertyDescriptor(f.s,'repository');Object.defineProperty(f.s,'repository',{configurable:true,get(){throw Error('must not call');}});try{assert.throws(()=>assertOriginalOrganizeActionFacts(f.source,f.action,f.s));}finally{Object.defineProperty(f.s,'repository',descriptor);}}return true;}});await tx.put('meta',{id:marker,ok:true});armed=true;}));assert.equal(observed,true);assert.equal(await exists(f),undefined);
});
test('the closed metadata plan rejects Source-independent original membership drift',async t=>{
 const f=await fixture(t);await assert.rejects(commit(f,async(tx,proof)=>{registerOriginalOrganizeCommitSelectionFence(proof,f.s,tx);const topic=await tx.get('topics',f.topic.id);await tx.put('topics',{...topic,organizationRevision:topic.organizationRevision+1});await tx.put('meta',{id:marker,ok:true});}));assert.equal(await exists(f),undefined);
});
