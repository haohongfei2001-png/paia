import test from 'node:test';import assert from 'node:assert/strict';
import {OrganizerStore} from '../core/organizer/store.js';import {OnboardingService} from '../core/onboarding.js';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
globalThis.IDBKeyRange=IDBKeyRange;
async function setup(){const data={},local={get:async k=>({[k]:structuredClone(data[k])}),set:async v=>Object.assign(data,structuredClone(v))},indexedDB=new IDBFactory();const s=new OrganizerStore(local,{indexedDB});return {s,o:new OnboardingService(s),local,indexedDB};}
test('fresh onboarding is consent-first, resumes partial steps and does not itself enable capture',async()=>{
 const f=await setup();assert.equal((await f.o.status()).step,'consent');assert.equal((await f.s.status()).consented,false);
 await f.o.action('start');assert.equal((await new OnboardingService(f.s).status()).step,'consent');await assert.rejects(f.o.action('skip_history'),{code:'CONSENT_REQUIRED'});
 await f.s.consent(true);assert.equal((await f.o.status()).step,'history');await f.o.action('skip_history');assert.deepEqual(await f.o.status(),{version:1,step:'done',historyState:'skipped',existingUser:false});
 assert.equal((await new OnboardingService(new OrganizerStore(f.local,{indexedDB:f.indexedDB})).status()).step,'done');
});
test('v081 existing consent/data users are never blocked by first-run steps',async()=>{
 const f=await setup();await f.s.consent(true);assert.equal((await f.o.status()).step,'done');assert.equal((await f.o.status()).existingUser,true);await f.o.action('start');assert.equal((await f.o.status()).step,'done');
});
test('history can start after skip; completed/partial state cannot be reset by later skip',async()=>{
 const f=await setup();await f.o.status();await f.o.action('start');await f.s.consent(true);await f.o.action('skip_history');await f.o.action('start_history');assert.equal((await f.o.status()).historyState,'started');
 await f.s.write(async t=>{const r=await t.get('meta','first-run-onboarding');r.historyState='partial';await t.put('meta',r);});await f.o.action('skip_history');assert.equal((await f.o.status()).historyState,'partial');
});
test('minimal consent dismissal uses original progress without granting capture or starting history',async()=>{
 const f=await setup();await f.o.status();const before=await f.s.status();await f.o.action('dismiss_consent');assert.deepEqual(await f.s.status(),before);assert.deepEqual(await f.o.status(),{version:1,step:'done',historyState:'not_started',existingUser:false});
 const cold=new OnboardingService(new OrganizerStore(f.local,{indexedDB:f.indexedDB}));assert.equal((await cold.status()).step,'done');await cold.action('start');assert.equal((await cold.status()).step,'done');await assert.rejects(cold.action('start_history'),{code:'CONSENT_REQUIRED'});
 await f.s.consent(true);assert.equal((await cold.status()).historyState,'not_started');await cold.action('start_history');assert.equal((await cold.status()).historyState,'started');
});
test('dismissal cannot reset acknowledged partial import or consent and storage failure does not claim progress',async()=>{
 const f=await setup();await f.o.status();const original=f.s.write.bind(f.s);f.s.write=()=>Promise.reject(Error('Synthetic failed write'));await assert.rejects(f.o.action('dismiss_consent'));f.s.write=original;assert.equal((await f.o.status()).step,'consent');assert.equal((await f.s.status()).consented,false);
 await f.s.consent(true);await f.o.action('start_history');await f.s.write(async t=>{const row=await t.get('meta','first-run-onboarding');row.historyState='partial';await t.put('meta',row);});const before=await f.o.status(),capture=await f.s.status();await f.o.action('dismiss_consent');assert.deepEqual(await f.o.status(),before);assert.deepEqual(await f.s.status(),capture);
});
