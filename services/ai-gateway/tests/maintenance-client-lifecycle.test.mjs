import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceServiceFixture} from './maintenance-client-fixture.mjs';
import {createMaintenanceServiceClient,captureMaintenanceServiceLifecycle,assertMaintenanceServiceLifecycleFacts} from '../../../extension/core/ai-usage/maintenance-service-client.js';

async function fixture(t){
 let subscribe=0,unsubscribe=0,current=0;const f=await maintenanceServiceFixture(t,{exposeRemote:true,configure({configuration}){
  const original=configuration.onInvalidate,check=configuration.isCurrent;
  configuration.onInvalidate=fn=>{subscribe++;const remove=original(fn);return ()=>{unsubscribe++;remove?.();};};
  configuration.isCurrent=()=>{current++;return check();};
 }});assert.ok(f.remote);t.after(()=>{f.session.dispose();f.remote.dispose();f.s.repository.db?.close();});
 return {...f,counts:()=>({subscribe,unsubscribe,current}),unchanged(){assert.equal(f.physical(),0);assert.deepEqual(f.calls,[]);}};
}

test('original client lifetime snapshot is repeatable deny-only facts with no issuer, clock, transport or dispatch',async t=>{
 const f=await fixture(t),cap=captureMaintenanceServiceLifecycle(f.remote,f.s),before=f.counts();
 assert.ok(Object.isFrozen(cap));assert.deepEqual(Reflect.ownKeys(cap),[]);
 for(let i=0;i<3;i++)assert.equal(assertMaintenanceServiceLifecycleFacts(cap,f.remote,f.s),true);
 await Promise.resolve();assert.equal(assertMaintenanceServiceLifecycleFacts(cap,f.remote,f.s),true);
 assert.deepEqual(f.counts(),before);f.unchanged();
});

for(const change of ['copied cap','foreign client','copied client','foreign store'])test('delivery lifecycle refuses '+change+' without consuming genuine original facts',async t=>{
 const f=await fixture(t),cap=captureMaintenanceServiceLifecycle(f.remote,f.s);
 assert.throws(()=>assertMaintenanceServiceLifecycleFacts(change==='copied cap'?{...cap}:cap,change==='foreign client'?Object.freeze({}):change==='copied client'?{...f.remote}:f.remote,change==='foreign store'?{...f.s}:f.s));
 assert.equal(assertMaintenanceServiceLifecycleFacts(cap,f.remote,f.s),true);f.unchanged();
});

for(const change of ['dispose','configuration invalidate'])test('original '+change+' denies a captured lifecycle after await without relying on a financial cap',async t=>{
 const f=await fixture(t),cap=captureMaintenanceServiceLifecycle(f.remote,f.s);await Promise.resolve();
 if(change==='dispose')f.remote.dispose();else f.revoke();
 assert.throws(()=>assertMaintenanceServiceLifecycleFacts(cap,f.remote,f.s));assert.throws(()=>captureMaintenanceServiceLifecycle(f.remote,f.s));f.unchanged();
});

test('capturing delivery snapshots does not replace the original single-listener source or session invalidation',async t=>{
 const f=await fixture(t),events=[];const remove=f.remote.onInvalidate(()=>events.push('consumer'));
 const caps=Array.from({length:8},()=>captureMaintenanceServiceLifecycle(f.remote,f.s));assert.equal(f.counts().subscribe,1);
 f.revoke();assert.deepEqual(events,['consumer']);for(const cap of caps)assert.throws(()=>assertMaintenanceServiceLifecycleFacts(cap,f.remote,f.s));remove();assert.equal(f.counts().unsubscribe,1);f.unchanged();
});

for(const key of ['repository','db'])test('lifecycle '+key+' replacement retires the old snapshot without adopting a new baseline',async t=>{
 const f=await fixture(t),cap=captureMaintenanceServiceLifecycle(f.remote,f.s),object=key==='repository'?f.s:f.s.repository,original=Object.getOwnPropertyDescriptor(object,key);
 try{Object.defineProperty(object,key,{...original,value:{}});assert.throws(()=>assertMaintenanceServiceLifecycleFacts(cap,f.remote,f.s));}finally{Object.defineProperty(object,key,original);}
 assert.throws(()=>assertMaintenanceServiceLifecycleFacts(cap,f.remote,f.s),'restoring old public values cannot revive an observed stale token');f.unchanged();
});

for(const key of ['repository','db'])test('lifecycle facts reject a late '+key+' accessor without evaluating it',async t=>{
 const f=await fixture(t),cap=captureMaintenanceServiceLifecycle(f.remote,f.s),object=key==='repository'?f.s:f.s.repository,original=Object.getOwnPropertyDescriptor(object,key);let reads=0;
 try{Object.defineProperty(object,key,{configurable:true,get(){reads++;return original.value;}});assert.throws(()=>assertMaintenanceServiceLifecycleFacts(cap,f.remote,f.s));assert.equal(reads,0);}finally{Object.defineProperty(object,key,original);}
 assert.throws(()=>assertMaintenanceServiceLifecycleFacts(cap,f.remote,f.s));f.unchanged();
});

test('native original client signal cannot be hidden by an own aborted getter at delivery',async t=>{
 const f=await fixture(t),opportunity=await f.remote.sessionOptions.window.acquire({jobType:'AI_MAINTENANCE',requestDigest:'a'.repeat(64)}),cap=captureMaintenanceServiceLifecycle(f.remote,f.s);let reads=0;
 Object.defineProperty(opportunity.revocationSignal,'aborted',{configurable:true,get(){reads++;return false;}});f.remote.dispose();
 assert.throws(()=>assertMaintenanceServiceLifecycleFacts(cap,f.remote,f.s));assert.equal(reads,0);f.unchanged();
});

test('source invalidation honors listener removal during dispatch and immediately notifies a newly registered listener once',async t=>{
 const f=await fixture(t),events=[];
 // The original session listener can dispose the client first. Already
 // admitted listeners retain their own unsubscribe identities during dispatch.
 const removeSession=f.session.dispose.bind(f.session);let removeSecond;
 const first=f.remote.onInvalidate(()=>{events.push('first');removeSecond();f.remote.onInvalidate(()=>events.push('late'));});
 removeSecond=f.remote.onInvalidate(()=>events.push('second'));
 f.revoke();assert.deepEqual(events,['first','late']);first();removeSecond();removeSession();f.remote.dispose();assert.equal(f.counts().subscribe,1);assert.equal(f.counts().unsubscribe,1);f.unchanged();
});

test('two registrations of the same listener retain independent unsubscribe identities',async t=>{
 const f=await fixture(t);let events=0;const fn=()=>events++,first=f.remote.onInvalidate(fn),second=f.remote.onInvalidate(fn);first();f.revoke();assert.equal(events,1);second();f.remote.dispose();assert.equal(f.counts().unsubscribe,1);f.unchanged();
});

test('removing an observer does not detach the private source generation watch needed by an existing token',async t=>{
 const f=await fixture(t),cap=captureMaintenanceServiceLifecycle(f.remote,f.s);let events=0;const remove=f.remote.onInvalidate(()=>events++);remove();assert.equal(f.counts().unsubscribe,0);f.revoke();assert.equal(events,0);assert.throws(()=>assertMaintenanceServiceLifecycleFacts(cap,f.remote,f.s));assert.equal(f.counts().unsubscribe,1);f.unchanged();
});

test('repeated client and session disposal performs original source unsubscribe only once',async t=>{
 const f=await fixture(t),cap=captureMaintenanceServiceLifecycle(f.remote,f.s);f.remote.dispose();f.remote.dispose();f.session.dispose();f.session.dispose();assert.equal(f.counts().unsubscribe,1);assert.throws(()=>assertMaintenanceServiceLifecycleFacts(cap,f.remote,f.s));f.unchanged();
});

test('private lifecycle multiplex retains an eight-listener bound and releases removed slots',async t=>{
 const f=await fixture(t),removes=[];for(let i=0;i<7;i++)removes.push(f.remote.onInvalidate(()=>{}));
 assert.throws(()=>f.remote.onInvalidate(()=>{}));removes.pop()();const replacement=f.remote.onInvalidate(()=>{});replacement();for(const remove of removes)remove();
 const cap=captureMaintenanceServiceLifecycle(f.remote,f.s);assert.equal(assertMaintenanceServiceLifecycleFacts(cap,f.remote,f.s),true);assert.equal(f.counts().subscribe,1);f.unchanged();
});

test('lifecycle capture reads an unrevoked native source signal without evaluating an own aborted getter',async t=>{
 const f=await fixture(t),opportunity=await f.remote.sessionOptions.window.acquire({jobType:'AI_MAINTENANCE',requestDigest:'b'.repeat(64)});let reads=0;
 Object.defineProperty(opportunity.revocationSignal,'aborted',{configurable:true,get(){reads++;return false;}});
 const cap=captureMaintenanceServiceLifecycle(f.remote,f.s);assert.equal(assertMaintenanceServiceLifecycleFacts(cap,f.remote,f.s),true);assert.equal(reads,0);f.unchanged();
});

test('lifecycle capture rejects a revoked native source signal without evaluating an own aborted getter',async t=>{
 const f=await fixture(t),{filterIdentity:unused,...ordinary}=f.configuration,client=createMaintenanceServiceClient(ordinary);assert.ok(client);t.after(()=>client.dispose());
 const opportunity=await client.sessionOptions.window.acquire({jobType:'AI_MAINTENANCE',requestDigest:'c'.repeat(64)}),cap=captureMaintenanceServiceLifecycle(client,f.s);let reads=0;
 Object.defineProperty(opportunity.revocationSignal,'aborted',{configurable:true,get(){reads++;return false;}});f.revoke();
 assert.throws(()=>captureMaintenanceServiceLifecycle(client,f.s));assert.throws(()=>assertMaintenanceServiceLifecycleFacts(cap,client,f.s));assert.equal(reads,0);f.unchanged();
});
