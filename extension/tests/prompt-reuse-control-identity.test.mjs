import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange,IDBObjectStore} from './vendor/fake-indexeddb/build/esm/index.js';
import {local} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {originalIndexedPromptReadOwner,observeOriginalControlPublication,requireOriginalControlObservation,originalControlIdentityFailure} from '../core/indexed-store.js';
import {ArchiveError} from '../core/constants.js';
globalThis.IDBKeyRange=IDBKeyRange;
const text='Explain sorting',clock=()=>1800000000000;
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function fixture(t){
 const base=local(),hooks={get:null},storage={async get(...args){const result=await base.get(...args);await hooks.get?.();return result;},set:base.set};
 const s=new OrganizerStore(storage,{indexedDB:new IDBFactory()});await s.consent(true);t.after(()=>s.repository.close());
 await s.capture({epoch:(await s.status()).epoch,adapterVersion:'0.3.0',chat:{id:'synthetic-control-identity',url:'https://chatgpt.com/c/synthetic-control-identity',title:'Synthetic control identity'},messages:[0,1].map(i=>({sourceMessageId:'input-'+i,pageOrder:i+1,originalText:text}))});
 await s.finishFoundation();const service=new PromptReuseService(s,{clock}),query=await service.query();return {s,storage,hooks,service,query};
}
async function reads(fn){
 const get=IDBObjectStore.prototype.get;let records=0;IDBObjectStore.prototype.get=function(...args){if(this.name==='records')records++;return get.apply(this,args);};
 try{return {value:await fn(),records};}finally{IDBObjectStore.prototype.get=get;}
}

test('inherited original adapter data methods remain eligible for one shared scan',async t=>{
 const f=await fixture(t),single=await reads(()=>f.service.query()),prototype={get:f.storage.get,set:f.storage.set};
 delete f.storage.get;delete f.storage.set;Object.setPrototypeOf(f.storage,prototype);
 assert.equal(originalIndexedPromptReadOwner(f.s),true);
 const pair=await reads(()=>Promise.all([f.service.query(),f.service.query()]));assert.deepEqual(pair.value,[f.query,f.query]);assert.equal(pair.records,single.records);
});
for(const key of ['local','get','set'])test(key+' accessor is not executed by optional Prompt eligibility and preserves the original observer contract',async t=>{
 const f=await fixture(t),owner=key==='local'?f.s:f.storage,descriptor=Object.getOwnPropertyDescriptor(owner,key);let calls=0;
 Object.defineProperty(owner,key,{configurable:true,enumerable:descriptor.enumerable,get(){calls++;return descriptor.value;}});t.after(()=>Object.defineProperty(owner,key,descriptor));
 assert.equal(originalIndexedPromptReadOwner(f.s),false);assert.equal(calls,0,'source eligibility must not execute an accessor');
 // The public observer also belongs to native Sync. A stable constructor-bound
 // function returned by an accessor remains accepted exactly as before.
 const observed=await f.s.run(()=>observeOriginalControlPublication(f.s));assert.equal(requireOriginalControlObservation(f.s,observed.token),true);
 const single=await reads(()=>f.service.snapshot()),pair=await reads(()=>Promise.all([f.service.query(),f.service.query()]));assert.deepEqual(pair.value,[f.query,f.query]);assert.equal(pair.records,single.records*2);assert.ok(calls>0,'original independent paths retain their actual adapter semantics');
});
for(const key of ['get','set'])test(key+' data wrapper before admission preserves independent original reads',async t=>{
 const f=await fixture(t),single=await reads(()=>f.service.snapshot()),original=f.storage[key];let calls=0;
 f.storage[key]=function(...args){calls++;return original.apply(this,args);};
 assert.equal(originalIndexedPromptReadOwner(f.s),false);
 const pair=await reads(()=>Promise.all([f.service.query(),f.service.query()]));assert.deepEqual(pair.value,[f.query,f.query]);assert.equal(pair.records,single.records*2);if(key==='get')assert.ok(calls>0);
});

test('only the original adapter identity rejection has an exact owner denial fact',async t=>{
 const f=await fixture(t),other=await fixture(t);let reason;
 await f.s.run(async()=>{
  const observed=await observeOriginalControlPublication(f.s),get=f.storage.get;f.storage.get=function(...args){return get.apply(this,args);};
  try{requireOriginalControlObservation(f.s,observed.token);}catch(error){reason=error;}finally{f.storage.get=get;}
 });
 assert.equal(reason?.code,'CONTROL_PUBLICATION_CHANGED');assert.equal(originalControlIdentityFailure(f.s,reason),true);assert.equal(originalControlIdentityFailure(other.s,reason),false);
 for(const fake of [null,undefined,{},new ArchiveError('CONTROL_PUBLICATION_CHANGED'),{code:'CONTROL_PUBLICATION_CHANGED'}])assert.equal(originalControlIdentityFailure(f.s,fake),false);
 assert.equal(originalControlIdentityFailure(undefined,undefined),false);assert.deepEqual(await f.service.query(),f.query);
});
test('an original adapter thrown error is not relabeled as an observed identity rejection',async t=>{
 const f=await fixture(t),reason=new ArchiveError('CONTROL_PUBLICATION_CHANGED');let actual;
 await f.s.run(async()=>{
  f.hooks.get=()=>{throw reason;};try{await observeOriginalControlPublication(f.s);}catch(error){actual=error;}finally{f.hooks.get=null;}
 });
 assert.equal(actual,reason);assert.equal(originalControlIdentityFailure(f.s,actual),false);assert.deepEqual(await f.service.query(),f.query);
});
test('normal readonly tail invalidation retains its original code without an identity denial brand',async t=>{
 const f=await fixture(t);let reason,queued;
 await f.s.run(async()=>{
  const observed=await observeOriginalControlPublication(f.s);queued=f.s.status();
  try{requireOriginalControlObservation(f.s,observed.token);}catch(error){reason=error;}
 });await queued;
 assert.equal(reason?.code,'CONTROL_PUBLICATION_CHANGED');assert.equal(originalControlIdentityFailure(f.s,reason),false);
 await f.s.run(async()=>{const current=await observeOriginalControlPublication(f.s);assert.equal(requireOriginalControlObservation(f.s,current.token),true);});
 assert.deepEqual(await f.service.query(),f.query);
});

test('an already qualified waiter cannot deliver after another waiter observes restored owner identity during its final delivery queue',{timeout:3000},async t=>{
 const f=await fixture(t),hash=crypto.subtle.digest,descriptors=Object.getOwnPropertyDescriptor,held=[deferred(),deferred()],releases=[deferred(),deferred()],delivery=deferred(),finishDelivery=deferred();let projections=0,gets=0,observed=false,restored=false;
 crypto.subtle.digest=async function(algorithm,bytes){const result=await hash.call(this,algorithm,bytes);if(new TextDecoder().decode(bytes)===JSON.stringify(['normal',text])){const number=++projections;if(number===2||number===3){held[number-2].resolve();await releases[number-2].promise;}}return result;};
 t.after(()=>{for(const release of releases)release.resolve();finishDelivery.resolve();crypto.subtle.digest=hash;Object.getOwnPropertyDescriptor=descriptors;delete f.s.run;f.hooks.get=null;});
 const calls=[f.service.query(),f.service.query(),f.service.query()],outcomes=Promise.allSettled(calls);await Promise.all(held.map(x=>x.promise));assert.deepEqual(await calls[0],f.query);
 f.hooks.get=async()=>{if(++gets===3){delivery.resolve();await finishDelivery.promise;}};
 releases[0].resolve();await delivery.promise;
 const run=f.s.run;f.s.run=function(...args){return run.apply(this,args);};
 Object.getOwnPropertyDescriptor=function(owner,key){const value=descriptors(owner,key);if(!observed&&owner===f.s&&key==='run'&&value?.value!==run){observed=true;queueMicrotask(()=>{delete f.s.run;restored=true;Object.getOwnPropertyDescriptor=descriptors;});}return value;};
 releases[1].resolve();const third=await Promise.allSettled([calls[2]]);finishDelivery.resolve();const settled=await outcomes;
 t.diagnostic(JSON.stringify({phase:'after-first-final-binding-before-delivery-transaction',gets,observed,restored,status:settled.map(x=>x.status),third:third[0].status}));
 assert.ok(observed&&restored);assert.equal(settled[0].status,'fulfilled');for(const result of settled.slice(1)){assert.equal(result.status,'rejected');assert.equal(result.reason.code,'MEMORY_STALE');}
 f.hooks.get=null;assert.deepEqual(await f.service.query(),f.query);
});
