import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {unavailableAIProvider,unavailableAICredentials} from '../core/organizer/unavailable-service.js';
import {SimpleOriginalOrganizerRunner,holdOriginalOrganizerForApplicationSelection as holdOriginal,originalOrganizerHeldForApplicationSelection as currentOriginal,releaseOriginalOrganizerForApplicationSelection as releaseOriginal} from '../core/organizer/original-simple.js';
import {createConfiguredOrganizeRunner,holdConfiguredOrganizerForApplicationSelection as holdConfigured,configuredOrganizerHeldForApplicationSelection as currentConfigured,releaseConfiguredOrganizerForApplicationSelection as releaseConfigured} from '../core/organizer/configured-organize-runner.js';
import {BoundedOrganizerWorkflow,holdBoundedOrganizerForApplicationSelection as holdBounded,boundedOrganizerHeldForApplicationSelection as currentBounded,releaseBoundedOrganizerForApplicationSelection as releaseBounded} from '../core/organizer/bounded-workflow.js';
const busy={code:'GENERATION_WORKER_BUSY'},capability={code:'GENERATION_WORKER_CAPABILITY'};
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const original=(s,options={})=>new SimpleOriginalOrganizerRunner(s,{provider:unavailableAIProvider,credentials:unavailableAICredentials,...options});
async function fixture(){const {s}=await setup(OrganizerStore),o=original(s),ai=createConfiguredOrganizeRunner(s,null),bounded=new BoundedOrganizerWorkflow(s,{original:o,ai});return {s,o,ai,bounded};}
const meta=s=>s.repository.transaction(false,t=>t.all('meta'),['meta']);

// Tiny fake-IndexedDB fixtures only. No network, real identity, native browser or
// provider completion is inferred by these warm-owner controls.
test('exact default assembly holds all three originals and release never replays denied actions',async()=>{
 const {s,o,ai,bounded}=await fixture(),before=await meta(s),token=holdBounded(bounded,s);
 assert.equal(currentBounded(bounded,s,token),true);
 const denied=[()=>o.wake(),()=>o.run('held'),()=>o.stop(),()=>o.reconcileInterrupted(),()=>bounded.start(),()=>bounded.run({}),()=>bounded.patch('held',{}),()=>bounded.reconcileInterrupted(),()=>bounded.stop(),()=>bounded.status(),()=>ai.wake({}),()=>ai.handle({}),()=>ai.scope({}),()=>ai.stop(),()=>ai.reconcileInterrupted(),()=>ai.status()];
 for(const call of denied)await assert.rejects(call,busy);
 assert.deepEqual(await meta(s),before);assert.equal(releaseBounded(bounded,s,token),true);assert.equal(currentBounded(bounded,s,token),false);assert.equal(releaseBounded(bounded,s,token),false);
 await delay(0);assert.deepEqual(await meta(s),before);
 await o.reconcileInterrupted();const next=holdBounded(bounded,s);assert.equal(currentBounded(bounded,s,next),true);releaseBounded(bounded,s,next);
});

test('default original wake has real local work and public running cannot hide pending work',async()=>{
 const {s,o,bounded}=await fixture(),entered=deferred(),finish=deferred(),write=s.foundationWrite.bind(s);let first=true;
 s.foundationWrite=async fn=>{if(first){first=false;entered.resolve();await finish.promise;}return write(fn);};
 const work=o.wake({userActionId:'default-warm-test'});await entered.promise;o.running=null;
 assert.throws(()=>holdOriginal(o,s),busy);assert.throws(()=>holdBounded(bounded,s),busy);
 finish.resolve();const result=await work;assert.equal(result.providerRequestCount,0);assert.ok((await meta(s)).some(row=>row.id==='originalOrganizerRuntime'));
 const token=holdBounded(bounded,s);assert.equal(currentBounded(bounded,s,token),true);releaseBounded(bounded,s,token);
});

for(const name of ['stop','reconcileInterrupted'])test('direct original '+name+' is tracked before its first await',async()=>{
 const {s,o}=await fixture(),entered=deferred(),finish=deferred(),write=s.foundationWrite.bind(s);
 s.foundationWrite=async fn=>{entered.resolve();await finish.promise;return write(fn);};
 const work=o[name]();await entered.promise;assert.throws(()=>holdOriginal(o,s),busy);finish.resolve();await work;
 const token=holdOriginal(o,s);assert.equal(currentOriginal(o,s,token),true);releaseOriginal(o,s,token);
});

test('direct original run is privately tracked and its rejection cannot poison later holds',async()=>{
 const {s,o}=await fixture();
 await assert.rejects(o.run('no-controller'));
 const token=holdOriginal(o,s);assert.equal(currentOriginal(o,s,token),true);releaseOriginal(o,s,token);
});

for(const name of ['patch','reconcileInterrupted','status'])test('bounded '+name+' includes maintenance writes in admission',async()=>{
 const {s,bounded}=await fixture(),entered=deferred(),finish=deferred(),method=name==='status'?'finishFoundation':'foundationWrite',old=s[method].bind(s);
 s[method]=async(...args)=>{entered.resolve();await finish.promise;return old(...args);};
 const work=name==='patch'?bounded.patch('absent',{}):bounded[name]();await entered.promise;
 assert.throws(()=>holdBounded(bounded,s),busy);finish.resolve();await work;
 const token=holdBounded(bounded,s);assert.equal(currentBounded(bounded,s,token),true);releaseBounded(bounded,s,token);
});

test('configured status compatibility maintenance is tracked even for strict null owner',async()=>{
 const {s,ai}=await fixture(),entered=deferred(),finish=deferred(),compat=s.libraryCompatibilityStatus.bind(s);
 s.libraryCompatibilityStatus=async(...args)=>{entered.resolve();await finish.promise;return compat(...args);};
 const work=ai.status({summaryOnly:true});await entered.promise;assert.throws(()=>holdConfigured(ai,s),busy);finish.resolve();await work;
 const token=holdConfigured(ai,s);assert.equal(currentConfigured(ai,s,token),true);releaseConfigured(ai,s,token);
});

test('busy bounded original chain finishes naturally with no hold-induced stop or cancellation',async()=>{
 const {s,o,bounded}=await fixture(),entered=deferred(),finish=deferred(),write=s.foundationWrite.bind(s);let first=true;
 s.foundationWrite=async fn=>{if(first){first=false;entered.resolve();await finish.promise;}return write(fn);};
 const work=bounded.start({userActionId:'bounded-default-only',kind:'original',maxRequests:1,maxInputs:1});await entered.promise;
 assert.throws(()=>holdBounded(bounded,s),busy);assert.equal(bounded.stopped,false);assert.equal(o.controller,null);
 finish.resolve();const result=await work;assert.equal(result.state,'failed');assert.equal(result.requestsReserved,0);assert.equal(bounded.stopped,false);
 const token=holdBounded(bounded,s);assert.equal(currentBounded(bounded,s,token),true);releaseBounded(bounded,s,token);
});

test('second hold and failed composition never release another owners token',async()=>{
 const {s,o,ai,bounded}=await fixture(),held=holdConfigured(ai,s);
 assert.throws(()=>holdBounded(bounded,s),busy);assert.equal(currentConfigured(ai,s,held),true);
 const available=holdOriginal(o,s);assert.equal(currentOriginal(o,s,available),true);releaseOriginal(o,s,available);
 assert.equal(releaseConfigured(ai,s,{}),false);releaseConfigured(ai,s,held);
 const token=holdBounded(bounded,s);assert.throws(()=>holdBounded(bounded,s),busy);assert.equal(releaseBounded(bounded,s,{}),false);assert.equal(currentBounded(bounded,s,token),true);releaseBounded(bounded,s,token);
});

test('tokens reject foreign owner, wrong store, clones, released reuse and cold lookalikes',async()=>{
 const a=await fixture(),b=await fixture(),token=holdBounded(a.bounded,a.s);
 assert.equal(currentBounded(b.bounded,b.s,token),false);assert.equal(currentBounded(a.bounded,b.s,token),false);assert.equal(currentBounded(a.bounded,a.s,{}),false);
 assert.equal(releaseBounded(b.bounded,b.s,token),false);assert.equal(releaseBounded(a.bounded,b.s,token),false);assert.equal(currentBounded(a.bounded,a.s,token),true);
 assert.throws(()=>holdOriginal(Object.create(SimpleOriginalOrganizerRunner.prototype),a.s),capability);releaseBounded(a.bounded,a.s,token);
 assert.equal(currentBounded(a.bounded,a.s,token),false);
});

test('non-null malformed and unavailable configurations cannot masquerade as null birth',async()=>{
 const {s}=await fixture();
 for(const config of [{},false,0,'',{origin:'https://synthetic.invalid'}]){const ai=createConfiguredOrganizeRunner(s,config);assert.equal(ai.available(),false);assert.throws(()=>holdConfigured(ai,s),capability);await ai.stop();assert.throws(()=>holdConfigured(ai,s),capability);}
 const source={};assert.throws(()=>holdConfigured(createConfiguredOrganizeRunner(s,null,{actionSource:source}),s),capability);
 // Omitted configuration resolves through the original static null registry.
 const resolved=createConfiguredOrganizeRunner(s),token=holdConfigured(resolved,s);assert.equal(currentConfigured(resolved,s,token),true);releaseConfigured(resolved,s,token);
});

test('changed dependencies, prototype, required methods and child ownership invalidate proof',async()=>{
 const {s,o,ai,bounded}=await fixture();
 const fakeProvider={...unavailableAIProvider};assert.throws(()=>holdOriginal(original(s,{provider:fakeProvider}),s),capability);
 class Subclass extends SimpleOriginalOrganizerRunner{}assert.throws(()=>holdOriginal(new Subclass(s,{provider:unavailableAIProvider,credentials:unavailableAICredentials}),s),capability);
 const saved=o.provider;o.provider={...saved};assert.throws(()=>holdOriginal(o,s),capability);o.provider=saved;
 const wake=o.wake;o.wake=wake;assert.throws(()=>holdOriginal(o,s),capability);delete o.wake;
 const proto=Object.getPrototypeOf(o),replacement=Object.create(proto);Object.setPrototypeOf(o,replacement);assert.throws(()=>holdOriginal(o,s),capability);Object.setPrototypeOf(o,proto);
 const other=await fixture();assert.throws(()=>holdBounded(new BoundedOrganizerWorkflow(s,{original:other.o,ai}),s),capability);
 const token=holdBounded(bounded,s);bounded.ai=other.ai;assert.equal(currentBounded(bounded,s,token),false);assert.equal(releaseBounded(bounded,s,token),true);bounded.ai=ai;
 const free=holdOriginal(o,s);releaseOriginal(o,s,free);
});

test('repository/database replacement cannot refresh a warm birth binding',async()=>{
 const {s,o}=await fixture(),repository=s.repository,database=repository.db,token=holdOriginal(o,s);
 s.repository={...repository};assert.equal(currentOriginal(o,s,token),false);s.repository=repository;
 repository.db={};assert.equal(currentOriginal(o,s,token),false);repository.db=database;
 assert.equal(currentOriginal(o,s,token),false); // Observed identity loss cannot resurrect the same token.
 assert.equal(releaseOriginal(o,s,token),true);
});

test('deadline expiration invalidates proof but retains admission until exact release',async()=>{
 const {s,o,bounded}=await fixture();
 for(const deadlineAt of [0,-1,Infinity,NaN,performance.now()+30001])assert.throws(()=>holdBounded(bounded,s,{deadlineAt}),{code:'GENERATION_WORKER_NOT_QUIET'});
 const token=holdBounded(bounded,s,{deadlineAt:performance.now()+20});await delay(25);
 assert.equal(currentBounded(bounded,s,token),false);await assert.rejects(o.reconcileInterrupted(),busy);assert.throws(()=>holdBounded(bounded,s),busy);
 assert.equal(releaseBounded(bounded,s,token),true);await o.reconcileInterrupted();
});

test('two pending original tasks are not erased by one rejection or mutable running state',async()=>{
 const {s,o}=await fixture(),first=deferred(),second=deferred(),write=s.foundationWrite.bind(s);let count=0;
 s.foundationWrite=async fn=>{const waiting=++count===1?first:second;await waiting.promise;return write(fn);};
 const a=o.reconcileInterrupted(),b=o.reconcileInterrupted();o.running=null;
 first.reject(new Error('synthetic first failure'));await assert.rejects(a,/synthetic first failure/);assert.throws(()=>holdOriginal(o,s),busy);
 second.resolve();await b;const token=holdOriginal(o,s);releaseOriginal(o,s,token);
});

test('warm hold preserves durable UNKNOWN rows and does not assert historical settlement',async()=>{
 const {s,bounded}=await fixture();await s.foundationWrite(async t=>{
  await t.put('meta',{id:'originalProviderRequest:older-unknown',state:'outcome_unknown',requestId:'older-unknown'});
  await t.put('meta',{id:'boundedOrganizerAction:older-unknown',state:'outcome_unknown'});
  await t.put('meta',{id:'aiu:organize-service-preflight:v1:unknown-topic',jobId:'unknown-job'});
 });
 const before=await meta(s),token=holdBounded(bounded,s);assert.equal(currentBounded(bounded,s,token),true);assert.deepEqual(await meta(s),before);releaseBounded(bounded,s,token);assert.deepEqual(await meta(s),before);
});

test('real configured factory birth remains unsupported after local service invalidation',async()=>{
 const {s}=await fixture();let invalidate,fetchCalls=0;
 const configuration={origin:'https://synthetic.invalid',profile:{contractVersion:'synthetic-contract',modelVersion:'synthetic-model',promptVersion:'synthetic-prompt'},routeVersion:'synthetic-route',clock:()=>0,
  resolveAuthority:async()=>({allowed:false}),onInvalidate:fn=>{invalidate=fn;return ()=>{};},readProfile:async()=>null,currentProfile:()=>null,tokenize:async()=>null,isCurrentTokenizer:()=>false,readProofs:async()=>null,
  fetch:async()=>{fetchCalls++;throw Error('No network permitted');}};
 const ai=createConfiguredOrganizeRunner(s,configuration);assert.equal(typeof invalidate,'function');assert.equal(ai.available(),true);
 assert.throws(()=>holdConfigured(ai,s),capability);await ai.stop();invalidate();assert.equal(ai.available(),true);assert.throws(()=>holdConfigured(ai,s),capability);assert.equal(fetchCalls,0);
});


test('unbound legacy construction stays usable without granting a selection capability',()=>{
 const o=new SimpleOriginalOrganizerRunner(),ai=createConfiguredOrganizeRunner(undefined,null);
 assert.equal(ai.available(),false);assert.throws(()=>holdOriginal(o,undefined),capability);assert.throws(()=>holdConfigured(ai,undefined),capability);
});

for(const mode of ['detached','foreign-call','spread-copy'])test('factory private owner binding rejects held '+mode+' status and wake',async()=>{
 const {s,ai}=await fixture(),before=await meta(s),token=holdConfigured(ai,s);
 const invoke=(name)=>{const method=ai[name];return mode==='detached'?method({summaryOnly:true}):mode==='foreign-call'?Reflect.apply(method,{},[{summaryOnly:true}]):({...ai})[name]({summaryOnly:true});};
 try{for(const name of ['status','wake'])await assert.rejects(()=>invoke(name),busy);assert.equal(currentConfigured(ai,s,token),true);assert.deepEqual(await meta(s),before);}
 finally{releaseConfigured(ai,s,token);}
});

test('factory private owner binding tracks unheld detached maintenance until actual settlement',async()=>{
 const {s,ai}=await fixture(),entered=deferred(),finish=deferred(),compat=s.libraryCompatibilityStatus.bind(s);
 s.libraryCompatibilityStatus=async(...args)=>{entered.resolve();await finish.promise;return compat(...args);};
 const status=ai.status,work=status({summaryOnly:true});await entered.promise;let accidental;
 try{assert.throws(()=>{accidental=holdConfigured(ai,s);},busy);}
 finally{if(accidental)releaseConfigured(ai,s,accidental);finish.resolve();await work;}
 const token=holdConfigured(ai,s);assert.equal(currentConfigured(ai,s,token),true);releaseConfigured(ai,s,token);
});
