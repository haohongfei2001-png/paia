import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange,IDBObjectStore} from './vendor/fake-indexeddb/build/esm/index.js';
import {local} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {PromptReuseService,readPromptReuseRefusalEvidence} from '../core/prompt-reuse-service.js';
import {originalIndexedPromptReadOwner,observeOriginalControlPublication,requireOriginalControlObservation,observeOriginalPromptControlPublication,requireOriginalPromptControlObservation,originalControlIdentityFailure} from '../core/indexed-store.js';
import {ArchiveError} from '../core/constants.js';
import {STORAGE_KEY} from '../core/constants.js';
import {observeRepositoryWriteFence,requireRepositoryWriteFence} from '../core/idb-repository.js';
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

test('manual-only shared queries survive original readonly work queued during their control observation',{timeout:10000},async t=>{
 const backing=local(),hooks={get:null},storage={async get(key){const value=await backing.get(key);await new Promise(setImmediate);await hooks.get?.(new Error().stack);return value;},set:backing.set};
 const s=new OrganizerStore(storage,{indexedDB:new IDBFactory()});await s.consent(true);await s.finishFoundation();t.after(()=>s.repository.close());
 const service=new PromptReuseService(s,{clock}),first=await service.query();let revision=first.revision;
 for(const text of ['first independent manual sample','second independent manual sample'])revision=(await service.change({action:'create',revision,text})).revision;
 const expected=await service.query();assert.equal(expected.items.length,2);assert.equal(await s.repository.transaction(false,t=>t.count('inputStates')),0);
 const durable=async()=>({control:(await backing.get(STORAGE_KEY))[STORAGE_KEY],meta:await s.repository.transaction(false,t=>t.all('meta'),['meta']),jobs:await s.repository.transaction(false,t=>t.all('organizerJobs'),['organizerJobs'])});
 const before=await durable(),fence=observeRepositoryWriteFence(s.repository),queued=[];let observations=0;
 hooks.get=stack=>{if(/observeOriginal(?:Prompt)?ControlPublication/.test(stack)&&++observations>=3)queued.push(s.status());};
 let values;try{values=await Promise.allSettled([service.query(),service.query()]);}finally{hooks.get=null;await Promise.allSettled(queued);}
 assert.ok(observations>=3);assert.ok(queued.length>0,'genuine original readonly status work was queued');
 requireRepositoryWriteFence(s.repository,fence);assert.deepEqual(await durable(),before,'neither readonly work nor sharing may change durable authority');
 t.diagnostic(JSON.stringify({observations,queuedStatusCalls:queued.length,statuses:values.map(x=>x.status),codes:values.map(x=>x.reason?.code??null)}));
 for(const value of values){assert.equal(value.status,'fulfilled',value.reason?.stack);assert.deepEqual(value.value,expected);}
});

test('Prompt execution tokens are queue-scoped, non-native, and do not classify queued work by its label',async t=>{
 const f=await fixture(t);let token,queued;
 await f.s.run(async()=>{
  const observed=await observeOriginalPromptControlPublication(f.s),native=await observeOriginalControlPublication(f.s);token=observed.token;
  assert.throws(()=>requireOriginalControlObservation(f.s,token),{code:'CONTROL_PUBLICATION_CHANGED'});
  assert.throws(()=>requireOriginalPromptControlObservation(f.s,native.token),{code:'CONTROL_PUBLICATION_CHANGED'});
  assert.throws(()=>requireOriginalPromptControlObservation(f.s,{}),{code:'CONTROL_PUBLICATION_CHANGED'});
  // This is a genuine original write, not a status-shaped stand-in. Merely
  // queueing it cannot have executed its callback inside the occupied run.
  let entered=false;queued=f.s.write(async()=>{entered=true;});
  assert.equal(entered,false);assert.equal(requireOriginalPromptControlObservation(f.s,token),true);
  assert.throws(()=>requireOriginalControlObservation(f.s,native.token),{code:'CONTROL_PUBLICATION_CHANGED'});
 });
 await queued;assert.throws(()=>requireOriginalPromptControlObservation(f.s,token),{code:'CONTROL_PUBLICATION_CHANGED'});
 await assert.rejects(()=>observeOriginalPromptControlPublication(f.s),{code:'CONTROL_PUBLICATION_REQUIRED'});
});
for(const outcome of ['resolve','reject'])test('Prompt execution token retires when original callback '+outcome+'s',async t=>{
 const f=await fixture(t),reason=new Error('synthetic callback rejection');let token;
 const work=f.s.run(async()=>{token=(await observeOriginalPromptControlPublication(f.s)).token;assert.equal(requireOriginalPromptControlObservation(f.s,token),true);if(outcome==='reject')throw reason;return 'original-result';});
 if(outcome==='reject')await assert.rejects(work,error=>error===reason);else assert.equal(await work,'original-result');
 assert.throws(()=>requireOriginalPromptControlObservation(f.s,token),{code:'CONTROL_PUBLICATION_CHANGED'});
 await f.s.run(async()=>{assert.throws(()=>requireOriginalPromptControlObservation(f.s,token),{code:'CONTROL_PUBLICATION_CHANGED'});const current=await observeOriginalPromptControlPublication(f.s);assert.equal(requireOriginalPromptControlObservation(f.s,current.token),true);});
});
test('a public-tail alias cannot restore an older Prompt execution after a newer genuine run completes',{timeout:3000},async t=>{
 const f=await fixture(t),entered=deferred(),release=deferred();let token,reason;
 t.after(()=>release.resolve());
 const older=f.s.run(async()=>{token=(await observeOriginalPromptControlPublication(f.s)).token;entered.resolve();await release.promise;try{requireOriginalPromptControlObservation(f.s,token);}catch(error){reason=error;}});
 await entered.promise;f.s.tail=Promise.resolve();await f.s.run(async()=>{await assert.rejects(()=>observeOriginalPromptControlPublication(f.s),{code:'CONTROL_PUBLICATION_REQUIRED'});});
 release.resolve();await older;assert.equal(reason?.code,'CONTROL_PUBLICATION_CHANGED');assert.equal(originalControlIdentityFailure(f.s,reason),false);
 assert.throws(()=>requireOriginalPromptControlObservation(f.s,token),{code:'CONTROL_PUBLICATION_CHANGED'});
});
test('overlap during the original run prelude cannot remint a superseded Prompt execution',{timeout:3000},async t=>{
 const f=await fixture(t),entered=deferred(),release=deferred();let gets=0,called=false,reason;
 f.hooks.get=async()=>{if(++gets===1){entered.resolve();await release.promise;}};t.after(()=>{release.resolve();f.hooks.get=null;});
 const older=f.s.run(async()=>{called=true;try{await observeOriginalPromptControlPublication(f.s);}catch(error){reason=error;}});
 await entered.promise;f.s.tail=Promise.resolve();await f.s.run(async()=>{await assert.rejects(()=>observeOriginalPromptControlPublication(f.s),{code:'CONTROL_PUBLICATION_REQUIRED'});});
 release.resolve();await older;assert.equal(called,true);assert.equal(reason?.code,'CONTROL_PUBLICATION_REQUIRED');assert.equal(originalControlIdentityFailure(f.s,reason),false);f.hooks.get=null;
 await f.s.run(async()=>assert.equal(requireOriginalPromptControlObservation(f.s,(await observeOriginalPromptControlPublication(f.s)).token),true));
});
for(const key of ['local','get','set'])test('Prompt witness rejects '+key+' descriptor loss through the original adapter identity check',async t=>{
 const f=await fixture(t);let calls=0,reason;
 await f.s.run(async()=>{
  const observed=await observeOriginalPromptControlPublication(f.s),owner=key==='local'?f.s:f.storage,descriptor=Object.getOwnPropertyDescriptor(owner,key);
  Object.defineProperty(owner,key,{configurable:true,enumerable:descriptor.enumerable,get(){calls++;return descriptor.value;}});
  try{requireOriginalPromptControlObservation(f.s,observed.token);}catch(error){reason=error;}finally{Object.defineProperty(owner,key,descriptor);}
  assert.equal(calls,1,'the actual original adapter check precedes descriptor qualification');assert.equal(reason?.code,'CONTROL_PUBLICATION_CHANGED');assert.equal(originalControlIdentityFailure(f.s,reason),true);
 });
});
test('manual-only shared queries refuse an original queued consent revocation before final delivery',{timeout:10000},async t=>{
 const backing=local(),hooks={get:null},storage={async get(key){const value=await backing.get(key);await new Promise(setImmediate);await hooks.get?.(new Error().stack);return value;},set:backing.set};
 const s=new OrganizerStore(storage,{indexedDB:new IDBFactory()});await s.consent(true);await s.finishFoundation();t.after(()=>s.repository.close());
 const service=new PromptReuseService(s,{clock}),initial=await service.query();await service.change({action:'create',revision:initial.revision,text:'manual body must not survive revoked authority'});
 const expected=await service.query();assert.equal(expected.items.length,1);assert.equal(await s.repository.transaction(false,t=>t.count('inputStates')),0);
 let observations=0,queued=null,admitted=false;
 hooks.get=stack=>{if(/observeOriginal(?:Prompt)?ControlPublication/.test(stack)&&++observations===3){queued=s.write(async t=>{admitted=true;const control=await s.control(t);control.settings.consentVersion=0;control.settings.enabled=false;control.settings.epoch++;await s.saveControl(t,control);});assert.equal(admitted,false,'real write callback remains behind the current original run');}};
 let values;try{values=await Promise.allSettled([service.query(),service.query()]);}finally{hooks.get=null;if(queued)await queued;}
 assert.ok(queued);assert.equal(admitted,true);t.diagnostic(JSON.stringify({observations,statuses:values.map(x=>x.status),codes:values.map(x=>x.reason?.code??null)}));
 for(const value of values){assert.equal(value.status,'rejected','a currentness refresh cannot deliver the old manual body');assert.equal(value.reason.code,'MEMORY_STALE');}
 assert.equal((await backing.get(STORAGE_KEY))[STORAGE_KEY].settings.consentVersion,0);
});

test('a resumed older callback cannot adopt a newer still-active original Prompt execution',{timeout:3000},async t=>{
 const f=await fixture(t),olderEntered=deferred(),resumeOlder=deferred(),newerEntered=deferred(),releaseNewer=deferred();let olderReason;
 t.after(()=>{resumeOlder.resolve();releaseNewer.resolve();});
 const older=f.s.run(async()=>{olderEntered.resolve();await resumeOlder.promise;try{await observeOriginalPromptControlPublication(f.s);}catch(error){olderReason=error;}});
 await olderEntered.promise;f.s.tail=Promise.resolve();const newer=f.s.run(async()=>{newerEntered.resolve();await releaseNewer.promise;await assert.rejects(()=>observeOriginalPromptControlPublication(f.s),{code:'CONTROL_PUBLICATION_REQUIRED'});});
 await newerEntered.promise;resumeOlder.resolve();await older;assert.equal(olderReason?.code,'CONTROL_PUBLICATION_REQUIRED');assert.equal(originalControlIdentityFailure(f.s,olderReason),false);
 releaseNewer.resolve();await newer;
 await f.s.run(async()=>{const fresh=await observeOriginalPromptControlPublication(f.s);assert.equal(requireOriginalPromptControlObservation(f.s,fresh.token),true);});
});

test('an issued older Prompt token is invalid while a newer original callback is still active',{timeout:3000},async t=>{
 const f=await fixture(t),olderEntered=deferred(),resumeOlder=deferred(),newerEntered=deferred(),releaseNewer=deferred();let token,reason;
 t.after(()=>{resumeOlder.resolve();releaseNewer.resolve();});
 const older=f.s.run(async()=>{token=(await observeOriginalPromptControlPublication(f.s)).token;olderEntered.resolve();await resumeOlder.promise;try{requireOriginalPromptControlObservation(f.s,token);}catch(error){reason=error;}});
 await olderEntered.promise;f.s.tail=Promise.resolve();const newer=f.s.run(async()=>{newerEntered.resolve();await releaseNewer.promise;});
 await newerEntered.promise;resumeOlder.resolve();await older;assert.equal(reason?.code,'CONTROL_PUBLICATION_CHANGED');assert.equal(originalControlIdentityFailure(f.s,reason),false);
 releaseNewer.resolve();await newer;
});
test('a third genuine run cannot hide an older still-active execution after the newer callback ended',{timeout:3000},async t=>{
 const f=await fixture(t),olderEntered=deferred(),releaseOlder=deferred();let olderReason;
 t.after(()=>releaseOlder.resolve());
 const older=f.s.run(async()=>{olderEntered.resolve();await releaseOlder.promise;try{await observeOriginalPromptControlPublication(f.s);}catch(error){olderReason=error;}});
 await olderEntered.promise;f.s.tail=Promise.resolve();await f.s.run(()=>Promise.resolve());
 await f.s.run(async()=>{await assert.rejects(()=>observeOriginalPromptControlPublication(f.s),{code:'CONTROL_PUBLICATION_REQUIRED'});});
 releaseOlder.resolve();await older;assert.equal(olderReason?.code,'CONTROL_PUBLICATION_REQUIRED');
 await f.s.run(async()=>{const fresh=await observeOriginalPromptControlPublication(f.s);assert.equal(requireOriginalPromptControlObservation(f.s,fresh.token),true);});
});


test('body-free refusal evidence is bounded, copied and cannot invoke an adapter error accessor',async t=>{
 const f=await fixture(t),secret='PRIVATE_REFUSAL_BODY_MUST_NOT_BE_RECORDED';let codeReads=0;
 for(let i=0;i<20;i++){
  const reason=new Error(secret);Object.defineProperty(reason,'code',{get(){codeReads++;return secret;}});
  f.hooks.get=()=>{f.hooks.get=null;throw reason;};assert.deepEqual(await f.service.query(),f.query);
 }
 assert.equal(codeReads,0);const rows=readPromptReuseRefusalEvidence();assert.equal(rows.length,16);assert.ok(!JSON.stringify(rows).includes(secret));
 for(const row of rows){assert.match(row.phase,/^[a-z-]+$/);assert.ok(['MEMORY_STALE','STALE_BASE','CONTROL_PUBLICATION_CHANGED','CONTROL_PUBLICATION_REQUIRED','BNS_CONSUMER_PUBLICATION_PENDING','CONSENT_REQUIRED','STORAGE_FAILED','OTHER'].includes(row.code));for(const [key,value]of Object.entries(row))if(!['phase','code'].includes(key))assert.equal(typeof value,'boolean');}
 rows[0].phase='caller-mutation';rows.length=0;const fresh=readPromptReuseRefusalEvidence();assert.equal(fresh.length,16);assert.notEqual(fresh[0].phase,'caller-mutation');
});


test('body-free diagnostics never reflect on arbitrary adapter-thrown Proxy objects',async t=>{
 const f=await fixture(t),original=f.storage.get;let traps=0;
 const disturb=()=>{traps++;f.storage.get=()=>{throw Error('DIAGNOSTIC_PROXY_SIDE_EFFECT');};};
 const reason=new Proxy({}, {get(){disturb();return null;},getPrototypeOf(){disturb();return Object.prototype;},getOwnPropertyDescriptor(){disturb();return undefined;},ownKeys(){disturb();return [];}});
 try{f.hooks.get=()=>{f.hooks.get=null;throw reason;};assert.deepEqual(await f.service.query(),f.query);assert.equal(traps,0);}
 finally{f.hooks.get=null;f.storage.get=original;}
});
