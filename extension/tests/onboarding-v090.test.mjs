import test from 'node:test';import assert from 'node:assert/strict';
import {OrganizerStore} from '../core/organizer/store.js';import {OnboardingService} from '../core/onboarding.js';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
globalThis.IDBKeyRange=IDBKeyRange;
async function setup(){const data={},local={get:async k=>({[k]:structuredClone(data[k])}),set:async v=>Object.assign(data,structuredClone(v))},indexedDB=new IDBFactory();const s=new OrganizerStore(local,{indexedDB});return {s,o:new OnboardingService(s),local,indexedDB};}
test('fresh onboarding is short, resumes partial steps and does not itself enable capture',async()=>{
 const f=await setup();assert.equal((await f.o.status()).step,'welcome');assert.equal((await f.s.status()).consented,false);
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
