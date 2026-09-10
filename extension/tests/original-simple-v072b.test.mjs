import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,capture} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {SimpleOriginalOrganizerRunner} from '../core/organizer/original-simple.js';
import {claimOriginalWork,enqueueOriginalWork,startBootstrap} from '../core/organizer/original.js';
import {leaseGuard} from '../core/organizer/commit.js';

class FixtureProvider {
 constructor({failure=null,invalidSpan=false}={}){this.failure=failure;this.invalidSpan=invalidSpan;this.calls=[];}
 describe(){return {providerId:'synthetic-original',adapterVersion:'1',capabilityVersion:1,modelVersion:'deterministic-1',executionKind:'fixture',supportedTaskSchemas:['organize.v1'],credentialRequirement:'opaque'};}
 supportsTask(profile){return profile==='original_classification';}
 async execute(request){this.calls.push(structuredClone(request));if(this.failure)throw {code:this.failure};return {items:request.inputs.map(input=>({inputRef:input.ref,topic:{proposedName:'Synthetic topic'},section:{proposedName:'Chronology'},type:'idea',relatedGroupingCandidate:'nearby',spans:[{start:0,end:input.text.length+(this.invalidSpan?1:0)}],uncertain:false})),invalidItems:[]};}
}
const credentials={async acquire(){return {status:'ready',handle:'synthetic-only'};},revoke(){}};
async function fixture(options={}){const f=await setup(OrganizerStore),provider=new FixtureProvider(options),runner=new SimpleOriginalOrganizerRunner(f.s,{provider,credentials});return {...f,provider,runner};}
async function addFour(f){const epoch=(await f.s.status()).epoch;await f.s.capture({epoch,adapterVersion:'0.3.0',chat:{id:'m1-synthetic-chat',url:'https://chatgpt.com/c/m1-synthetic-chat',title:'Synthetic chat'},messages:Array.from({length:4},(_,i)=>({sourceMessageId:'simple-'+i,pageOrder:i+2,originalText:'Simple synthetic input '+i}))});}

test('simple Original runner sends one direct five-item batch and commits only locally sliced bodies',async()=>{
 const f=await fixture();await addFour(f);const result=await f.runner.wake(),status=await f.s.originalOrganizerStatus(),entries=await f.s.entryPage();assert.equal(f.provider.calls.length,1);assert.equal(f.provider.calls[0].inputs.length,5);assert.equal(result.result.created.length,5);assert.equal(status.bootstrap.processed,5);assert.equal(entries.items.length,5);for(const entry of entries.items)assert.ok(['Synthetic explicit working input',...Array.from({length:4},(_,i)=>'Simple synthetic input '+i)].includes(entry.body));
});

test('simple Original provider failures leave cursor, Input and Library unchanged',async()=>{
 for(const code of ['INVALID_CREDENTIAL','PROVIDER_TIMEOUT','RATE_LIMITED','PROVIDER_UNAVAILABLE','MODEL_NOT_AVAILABLE']){const f=await fixture({failure:code}),before=await f.s.snapshot(),cursor=(await f.s.originalOrganizerStatus()).bootstrap.processed,result=await f.runner.wake(),after=await f.s.snapshot();assert.equal(result.error,code);assert.equal((await f.s.originalOrganizerStatus()).bootstrap.processed,cursor);assert.deepEqual(after.records,before.records);assert.deepEqual(after.library.blocks,before.library.blocks);assert.equal((await f.s.entryPage()).items.length,0);}
 const commit=await fixture();commit.s.libraryCommit.commitOriginalBatch=async()=>{throw {code:'STORAGE_FAILED'};};const commitResult=await commit.runner.wake();assert.equal(commitResult.error,'LIBRARY_COMMIT_FAILED');assert.equal((await commit.s.originalOrganizerStatus()).bootstrap.processed,0);assert.equal((await commit.s.entryPage()).items.length,0);
});

test('one invalid item becomes terminal manual-required while valid items commit and cursor advances',async()=>{
 const f=await fixture();await addFour(f);f.provider.execute=async request=>{f.provider.calls.push(structuredClone(request));return {items:request.inputs.slice(0,4).map(input=>({inputRef:input.ref,topic:{proposedName:'Synthetic topic'},section:{proposedName:'Chronology'},type:'idea',relatedGroupingCandidate:null,spans:[{start:0,end:input.text.length}],uncertain:false})),invalidItems:[{inputRef:request.inputs[4].ref,code:'INVALID_PROVIDER_OUTPUT'}]};};const result=await f.runner.wake(),status=await f.s.originalOrganizerStatus(),receipts=await f.s.repository.transaction(false,t=>t.all('operationReceipts'));
 assert.equal(result.result.created.length,4);assert.equal(result.result.manualInputCount,1);assert.equal(status.bootstrap.processed,5);assert.equal(status.diagnostics.validatorResult,'partial');assert.equal((await f.s.entryPage()).items.length,4);assert.equal(receipts.filter(x=>x.namespace==='original-simple-input').length,5);assert.equal(receipts.find(x=>x.namespace==='original-simple-input'&&x.result.status==='manual_required').result.code,'INVALID_PROVIDER_OUTPUT');
});

test('a committed deterministic batch receipt advances a lost cursor without another provider call',async()=>{
 const f=await fixture();const first=await f.runner.wake(),entryCount=(await f.s.entryPage()).items.length;assert.equal(f.provider.calls.length,1);await f.s.foundationWrite(async t=>{const state=await t.get('meta','originalOrganizerBootstrap');state.state='running';state.cursorSequence=-1;state.processed=0;await t.put('meta',state);});f.provider.calls.length=0;const replay=await new SimpleOriginalOrganizerRunner(f.s,{provider:f.provider,credentials}).wake();assert.equal(replay.replayed,true);assert.equal(replay.batchId,first.batchId);assert.equal(f.provider.calls.length,0);assert.equal((await f.s.entryPage()).items.length,entryCount);assert.equal((await f.s.originalOrganizerStatus()).bootstrap.processed,1);
});

test('a failed batch retries only after a new explicit action and keeps its deterministic batch id',async()=>{
 const f=await fixture({failure:'NETWORK_ERROR'}),first=await f.runner.wake({userActionId:'action-1'}),firstLedger=await f.s.originalOrganizerStatus();assert.equal(first.error,'NETWORK_ERROR');assert.equal(firstLedger.bootstrap.processed,0);assert.equal(firstLedger.diagnostics.providerRequestCount,1);f.provider.failure=null;const second=await new SimpleOriginalOrganizerRunner(f.s,{provider:f.provider,credentials}).wake({userActionId:'action-2'});assert.equal(f.provider.calls.length,2);assert.notEqual(f.provider.calls[1].requestId,f.provider.calls[0].requestId);assert.equal(second.batchId,first.batchId);assert.equal((await f.s.originalOrganizerStatus()).bootstrap.processed,1);
});

test('legacy Organizer jobs cannot block the simple runner or submit after their fence is invalidated',async()=>{
 const f=await fixture();await startBootstrap(f.s);await enqueueOriginalWork(f.s,{limit:5});const legacy=await claimOriginalWork(f.s,'legacy-worker');assert.ok(legacy);const result=await f.runner.wake(),stored=await f.s.repository.transaction(false,t=>t.get('organizerJobs',legacy.id)),work=await f.s.repository.transaction(false,t=>t.get('organizerWorkItems',legacy.id));assert.equal(f.provider.calls.length,1);assert.equal(result.result.created.length,1);assert.equal(stored.state,'legacy_stuck');assert.equal(work.state,'legacy_stuck');await assert.rejects(f.s.foundationWrite(t=>leaseGuard(f.s,t,legacy)),error=>error?.code==='CANCELLED');
});

test('simple runner exposes only the fixed six-state lifecycle and atomically stores receipt plus cursor',async()=>{
 const f=await fixture(),states=[],original=f.s.libraryCommit.commitOriginalBatch.bind(f.s.libraryCommit);f.s.libraryCommit.commitOriginalBatch=async(...args)=>{const before=await f.s.originalOrganizerStatus();assert.equal(before.bootstrap.processed,0);const result=await original(...args),after=await f.s.originalOrganizerStatus(),receipt=await f.s.repository.transaction(false,t=>t.get('operationReceipts','original-simple:'+args[0]));assert.equal(after.bootstrap.processed,1);assert.ok(receipt);return result;};const old=f.s.foundationWrite.bind(f.s);f.s.foundationWrite=async fn=>old(async t=>{const r=await fn(t),runtime=await t.get('meta','originalOrganizerRuntime');if(runtime?.state)states.push(runtime.state);return r;});await f.runner.wake();for(const state of states)assert.ok(['idle','preparing','sending','validating','committing','completed','failed'].includes(state));
});
