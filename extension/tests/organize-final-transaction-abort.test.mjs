import test from 'node:test';
import assert from 'node:assert/strict';
import {getEventListeners} from 'node:events';
import {fixture} from './harness/organize-material-method-fixture.mjs';
import {captureOriginalOrganizeCommitScope,releaseOriginalOrganizeScope,registerOriginalOrganizeCommitSelectionFence,readOriginalOrganizeSelectionAbortSignal} from '../core/organizer/organize-processing-scope.js';
import {captureOrganizeProcessingGrant,releaseOrganizeProcessingGrant} from '../background/organize-processing-policy.js';
import {readOriginalOrganizeAction} from '../background/organize-action-source.js';
import {registerRepositoryFinalReadFence} from '../core/idb-repository.js';

const key='test:organize-original-action-abort';
const count=signal=>getEventListeners(signal,'abort').length;
const late=fn=>()=>{const stack=new Error().stack;if(stack.includes('currentFinalAuthorities')&&!stack.includes('runFinalReadFences'))fn();return true;};
const read=f=>f.s.repository.transaction(false,tx=>tx.get('meta',key));

test('original selection abort binding deduplicates and completes with no retained listener',async t=>{
 const f=await fixture(t);let proof,signal,before;
 await f.s.repository.transaction(true,async tx=>{
  proof=await captureOriginalOrganizeCommitScope(f.s,tx,f.topic.id,f.source,f.action);signal=readOriginalOrganizeAction(f.source,f.action,f.s,tx,proof).signal;before=count(signal);
  assert.throws(()=>readOriginalOrganizeSelectionAbortSignal(proof,f.s.repository,tx),'unregistered scope never supplies the cancellation signal');
  registerOriginalOrganizeCommitSelectionFence(proof,f.s,tx);assert.equal(readOriginalOrganizeSelectionAbortSignal(proof,f.s.repository,tx),signal);assert.equal(count(signal),before+1);
  registerOriginalOrganizeCommitSelectionFence(proof,f.s,tx);
  registerRepositoryFinalReadFence(f.s.repository,tx,{plan:function*(){return true;},isCurrent:()=>true,organizeSelectionAuthority:proof});assert.equal(count(signal),before+1);
  await tx.put('meta',{id:key,value:'committed'});
 });
 assert.equal(count(signal),before);releaseOriginalOrganizeScope(proof);assert.equal((await read(f)).value,'committed');
 await f.s.repository.transaction(true,async tx=>{await tx.put('meta',{id:key,value:'later independent commit'});let queued=false;registerRepositoryFinalReadFence(f.s.repository,tx,{plan:function*(){return true;},isCurrent:late(()=>{if(!queued){queued=true;queueMicrotask(()=>f.source.invalidate());}})});});
 assert.equal((await read(f)).value,'later independent commit');assert.equal(count(signal),before);
});

for(const mode of ['invalidate','release','dispose'])test('last microtask '+mode+' remains bound after proof release and repeated withdrawal',async t=>{
 const f=await fixture(t);let proof,grant,signal,before,hit=0,afterRelease;
 await assert.rejects(f.s.repository.transaction(true,async tx=>{
  proof=await captureOriginalOrganizeCommitScope(f.s,tx,f.topic.id,f.source,f.action);signal=readOriginalOrganizeAction(f.source,f.action,f.s,tx,proof).signal;before=count(signal);grant=captureOrganizeProcessingGrant(f.source,f.action,f.s,tx,proof);registerOriginalOrganizeCommitSelectionFence(proof,f.s,tx);assert.equal(count(signal),before+2);
  await tx.put('meta',{id:key,value:'must rollback'});
  registerRepositoryFinalReadFence(f.s.repository,tx,{plan:function*(){return true;},isCurrent:late(()=>{if(hit)return;hit++;queueMicrotask(()=>{releaseOrganizeProcessingGrant(grant);releaseOriginalOrganizeScope(proof);afterRelease=count(signal);for(let i=0;i<2;i++)mode==='release'?f.source.release(f.action):f.source[mode]();});})});
 }));
 assert.equal(hit,1);assert.equal(afterRelease,before+1,'releasing the token cannot remove original Repository cancellation');assert.equal(count(signal),before);assert.equal(await read(f),undefined);
});

test('fixed cancellation getter refuses copied token, foreign repository and transaction without caller signal access',async t=>{
 const f=await fixture(t);let proof,signal,before;await f.s.repository.transaction(true,async tx=>{
  proof=await captureOriginalOrganizeCommitScope(f.s,tx,f.topic.id,f.source,f.action);signal=readOriginalOrganizeAction(f.source,f.action,f.s,tx,proof).signal;before=count(signal);registerOriginalOrganizeCommitSelectionFence(proof,f.s,tx);
  for(const args of [[{},f.s.repository,tx],[proof,{},tx],[proof,f.s.repository,{tx:tx.tx}]])assert.throws(()=>readOriginalOrganizeSelectionAbortSignal(...args));
  let touched=0;const fake={get signal(){touched++;return signal;}};assert.throws(()=>readOriginalOrganizeSelectionAbortSignal(fake,f.s.repository,tx));assert.equal(touched,0);assert.equal(count(signal),before+1);
 });releaseOriginalOrganizeScope(proof);assert.equal(count(signal),before);
});

test('registration failure and original callback failure remove all original action abort listeners',async t=>{
 const f=await fixture(t);let signal,before,proof;
 await assert.rejects(f.s.repository.transaction(true,async tx=>{
  proof=await captureOriginalOrganizeCommitScope(f.s,tx,f.topic.id,f.source,f.action);signal=readOriginalOrganizeAction(f.source,f.action,f.s,tx,proof).signal;before=count(signal);registerOriginalOrganizeCommitSelectionFence(proof,f.s,tx);assert.equal(count(signal),before+1);
  registerRepositoryFinalReadFence(f.s.repository,tx,{plan:function*(){return true;},isCurrent:()=>false,organizeSelectionAuthority:proof});
 }));releaseOriginalOrganizeScope(proof);assert.equal(count(signal),before);
 await assert.rejects(f.s.repository.transaction(true,async tx=>{proof=await captureOriginalOrganizeCommitScope(f.s,tx,f.topic.id,f.source,f.action);registerOriginalOrganizeCommitSelectionFence(proof,f.s,tx);throw Error('synthetic original callback failure');}));
 releaseOriginalOrganizeScope(proof);assert.equal(count(signal),before);
});

test('signal method shadows cannot replace captured subscription or the original transaction abort',async t=>{
 const f=await fixture(t);let signal,before,proof,hit=0,signalShadowCalls=0;
 await assert.rejects(f.s.repository.transaction(true,async tx=>{
  proof=await captureOriginalOrganizeCommitScope(f.s,tx,f.topic.id,f.source,f.action);signal=readOriginalOrganizeAction(f.source,f.action,f.s,tx,proof).signal;before=count(signal);
  for(const name of ['addEventListener','removeEventListener'])Object.defineProperty(signal,name,{configurable:true,value(){signalShadowCalls++;throw Error('public signal method must not execute');}});
  Object.defineProperty(signal,'aborted',{configurable:true,get(){signalShadowCalls++;return false;}});
  registerOriginalOrganizeCommitSelectionFence(proof,f.s,tx);tx.tx.abort=()=>{};await tx.put('meta',{id:key,value:'must rollback'});
  registerRepositoryFinalReadFence(f.s.repository,tx,{plan:function*(){return true;},isCurrent:late(()=>{if(!hit){hit++;queueMicrotask(()=>f.source.invalidate());}})});
 }));releaseOriginalOrganizeScope(proof);assert.equal(hit,1);assert.equal(signalShadowCalls,0);assert.equal(count(signal),before);assert.equal(await read(f),undefined);
});
