import test from 'node:test';import assert from 'node:assert/strict';
import {parseStrict,parseOwnerContract,captureDependencies,requireFrozenOwners,LEGACY_INPUTS} from './artifacts.mjs';
import {openCurrentSuite,replayShort} from './replay.mjs';
const bytes=s=>new TextEncoder().encode(s);
test('strict parser retains fatal UTF8, duplicate aliases and actual oneMiB view bound',()=>{
 assert.deepEqual(parseStrict(bytes('{"safe":true}')),{safe:true});for(const s of ['{"k":1,"k":2}','{"k":1,"\\u006b":2}','{} {}'])assert.throws(()=>parseStrict(bytes(s)));assert.throws(()=>parseStrict(new Uint8Array([255])));
 const view=new Uint8Array(1024*1024+1);Object.defineProperty(view,'byteLength',{value:1});assert.throws(()=>parseStrict(view),/OFFLINE_BYTES_BOUND/);assert.throws(()=>parseStrict(new Proxy(bytes('{}'),{})));
});
test('prospective owner contract refuses before replay; foreign suites cannot supply data',async()=>{
 await assert.rejects(requireFrozenOwners(),/CURRENT_OWNER_NOT_FROZEN/);await assert.rejects(openCurrentSuite(),/CURRENT_OWNER_NOT_FROZEN/);await assert.rejects(replayShort({},'SYN-T01','original'),/CURRENT_SUITE_REQUIRED/);
});
test('read-only prospective closure is complete for actual production harness vendor and SplitB',async()=>{
 const value=await captureDependencies();assert.equal(value.kind,'READ_ONLY_PROSPECTIVE_INVENTORY_NOT_QUALIFICATION');for(const p of ['core/organizer/store.js','core/organizer/local-organize-session.js','core/organizer/ai-presentation.js','core/thought-store.js','core/thought-read-index.js','core/idb-repository.js','tests/harness/thought-m1.mjs','tests/vendor/fake-indexeddb/build/esm/index.js'])assert.ok(value.files[p],p);assert.ok(Object.keys(value.files).length>54);assert.ok(value.totalBytes<=8*1024*1024);assert.equal(Object.keys(LEGACY_INPUTS).some(p=>p.includes('held-out')),false);
});

test('new owner manifest alone admits its bounded full inventory without raising historical data-parser keys',()=>{
 const files=Object.fromEntries(Array.from({length:174},(_,i)=>['core/synthetic-'+i+'.js','a'.repeat(64)]));const input=bytes(JSON.stringify({files}));assert.equal(Object.keys(parseOwnerContract(input).files).length,174);assert.throws(()=>parseStrict(input),{code:'JSON_KEY_LIMIT'});
 assert.throws(()=>parseOwnerContract(bytes(JSON.stringify({files:Object.fromEntries(Array.from({length:513},(_,i)=>[String(i),'a'.repeat(64)]))}))),{code:'JSON_KEY_LIMIT'});
});
