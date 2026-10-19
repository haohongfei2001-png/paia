import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceServiceFixture} from './maintenance-client-fixture.mjs';
import {LocalMaintenanceSession,captureMaintenanceSectionPromotionDelivery,assertMaintenanceSectionPromotionDeliveryFacts} from '../../../extension/core/ai-usage/local-maintenance-session.js';
const capture=(f)=>captureMaintenanceSectionPromotionDelivery(f.session,f.s);
const check=(cap,f)=>assertMaintenanceSectionPromotionDeliveryFacts(cap,f.session,f.s);
const rows=(s,table)=>s.repository.transaction(false,t=>t.all(table));
for(const mode of ['healthy','copy','foreign-store','foreign-session','source-revoke','client-dispose','session-dispose','repository-replaced','database-replaced','repository-accessor','database-accessor'])test('original delivery lifetime is a callback-free deny-only witness: '+mode,async t=>{
 let callbacks=0;const f=await maintenanceServiceFixture(t,{exposeRemote:true,configure:({configuration})=>{for(const key of ['isCurrent','clock','resolveAuthority','readProofs']){const original=configuration[key];configuration[key]=(...args)=>{callbacks++;return original(...args);};}}});
 const repository=f.s.repository,database=repository.db,repoDescriptor=Object.getOwnPropertyDescriptor(f.s,'repository'),dbDescriptor=Object.getOwnPropertyDescriptor(repository,'db');let touches=0,foreign=null;
 t.after(()=>{Object.defineProperty(f.s,'repository',repoDescriptor);Object.defineProperty(repository,'db',dbDescriptor);foreign?.dispose();f.session.dispose();});
 const cap=await capture(f);assert.equal(check(cap,f),true);const baseline=callbacks;
 if(mode==='source-revoke')f.revoke();else if(mode==='client-dispose')f.remote.dispose();else if(mode==='session-dispose')f.session.dispose();else if(mode==='repository-replaced')f.s.repository={};else if(mode==='database-replaced')repository.db={};else if(mode==='repository-accessor')Object.defineProperty(f.s,'repository',{configurable:true,get(){touches++;return repository;}});else if(mode==='database-accessor')Object.defineProperty(repository,'db',{configurable:true,get(){touches++;return database;}});
 if(mode==='healthy')assert.equal(check(cap,f),true);
 else if(mode==='copy')assert.throws(()=>check({...cap},f));
 else if(mode==='foreign-store')assert.throws(()=>assertMaintenanceSectionPromotionDeliveryFacts(cap,f.session,{...f.s}));
 else if(mode==='foreign-session'){foreign=new LocalMaintenanceSession(f.s,{...f.remote.sessionOptions,remote:f.remote});assert.throws(()=>assertMaintenanceSectionPromotionDeliveryFacts(cap,foreign,f.s));}
 else assert.throws(()=>check(cap,f));
 assert.equal(callbacks,baseline);assert.equal(touches,0);
 Object.defineProperty(f.s,'repository',repoDescriptor);Object.defineProperty(repository,'db',dbDescriptor);
 if(['repository-replaced','database-replaced','repository-accessor','database-accessor'].includes(mode))assert.throws(()=>check(cap,f),'an observed invalid witness cannot revive after restoration');
 assert.equal(f.physical(),0);assert.deepEqual(f.calls,[]);assert.deepEqual(await rows(f.s,'organizerJobs'),[]);assert.deepEqual(await rows(f.s,'organizerUsage'),[]);
});
for(const mode of ['copy','foreign-store','disposed','default-null'])test('original delivery capture rejects '+mode+' without an authority request',async t=>{
 let issuer=0;const f=await maintenanceServiceFixture(t,{exposeRemote:true,configure:({configuration})=>{const original=configuration.resolveAuthority;configuration.resolveAuthority=(...args)=>{issuer++;return original(...args);};}});t.after(()=>f.session.dispose());
 let session=f.session,store=f.s;if(mode==='copy')session={...session};else if(mode==='foreign-store')store={...store};else if(mode==='disposed')f.session.dispose();else{session=new LocalMaintenanceSession(new Proxy({}, {get(){assert.fail('default-null source capture must not read Store');}}));t.after(()=>session.dispose());}
 await assert.rejects(Promise.resolve().then(()=>captureMaintenanceSectionPromotionDelivery(session,store)));assert.equal(issuer,0);assert.equal(f.physical(),0);assert.deepEqual(f.calls,[]);
});
for(const mode of ['source-revoke','client-dispose','session-dispose','database-replaced'])test('initial delivery capture cannot move to a later lifetime across original binding: '+mode,async t=>{
 const f=await maintenanceServiceFixture(t,{exposeRemote:true});let release,entered;const started=new Promise(r=>entered=r),held=new Promise(r=>release=r),repository=f.s.repository,database=repository.db,original=repository.transaction.bind(repository);let once=true;
 repository.transaction=async(...args)=>{const result=await original(...args);if(once){once=false;entered();await held;}return result;};t.after(()=>{release();repository.transaction=original;repository.db=database;f.session.dispose();});
 const pending=capture(f);pending.catch(()=>{});await started;if(mode==='source-revoke')f.revoke();else if(mode==='client-dispose')f.remote.dispose();else if(mode==='session-dispose')f.session.dispose();else repository.db={};release();await assert.rejects(pending);repository.db=database;assert.equal(f.physical(),0);assert.deepEqual(f.calls,[]);
});
for(const mode of ['native active with own true','native aborted with own false'])test('original session delivery capture reads only native source signal facts: '+mode,async t=>{
 const f=await maintenanceServiceFixture(t,{exposeRemote:true}),originalDispose=f.session.dispose.bind(f.session);t.after(()=>originalDispose());const opportunity=await f.remote.sessionOptions.window.acquire({jobType:'AI_MAINTENANCE',requestDigest:'b'.repeat(64)});let reads=0;
 Object.defineProperty(opportunity.revocationSignal,'aborted',{configurable:true,get(){reads++;return mode==='native active with own true';}});
 if(mode==='native aborted with own false'){f.session.dispose=()=>{};f.revoke();}
 if(mode==='native active with own true'){const cap=await capture(f);assert.equal(check(cap,f),true);}else await assert.rejects(capture(f));
 assert.equal(reads,0);assert.equal(f.physical(),0);assert.deepEqual(f.calls,[]);
});
