import test from 'node:test';import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {IndexedArchiveStore} from '../core/indexed-store.js';import {ImportLedger} from '../core/import/ledger.js';
import {ImportCoordinator} from '../core/import/coordinator.js';import {syntheticAdapter,syntheticRow} from './fixtures/import-adapter.mjs';
globalThis.IDBKeyRange=IDBKeyRange;
async function setup(){let s={};const local={async get(k){return {[k]:structuredClone(s[k])};},async set(v){Object.assign(s,v);}};const store=new IndexedArchiveStore(local,{indexedDB:new IDBFactory()});await store.consent(true);const ledger=new ImportLedger(store,{verifiedAdapters:['synthetic-v1']});return {store,ledger,transport:async(method,q)=>ledger[method](q,'test-page')};}
const file=(n=65)=>new Blob([JSON.stringify(Array.from({length:n},(_,i)=>syntheticRow(i+1)))]);
test('unverified production adapter completes syntax inspection but never touches transport or archives',async()=>{let calls=0;const c=new ImportCoordinator({transport:async()=>{calls++;}});await c.select(file(1),{consent:true});const r=await c.preflight();assert.equal(r.phase,'unsupported');assert.equal(calls,0);await assert.rejects(c.commit(),{code:'SCHEMA_UNVERIFIED'});});
test('coordinator batches with backpressure and keeps preview separate from explicit commit',async()=>{const {store,transport}=await setup();let inFlight=0,max=0;const c=new ImportCoordinator({adapter:syntheticAdapter,transport:async(m,q)=>{max=Math.max(max,++inFlight);try{return await transport(m,q);}finally{inFlight--;}}});await c.select(file(),{consent:true});const p=await c.preflight();assert.equal(p.checkedBatches,3);assert.equal((await store.snapshot()).records.length,0);const r=await c.commit();assert.equal(r.phase,'completed');assert.equal(r.counts.added,65);assert.equal(max,1);assert.equal((await store.snapshot()).records.length,65);});
test('lost acknowledgement resumes from atomic committed checkpoint after file reselection',async()=>{const {store,ledger,transport}=await setup();let drop=true;const c=new ImportCoordinator({adapter:syntheticAdapter,transport:async(m,q)=>{const r=await transport(m,q);if(m==='commit'&&drop){drop=false;throw Error('SYNTHETIC_LOST_ACK');}return r;}});await c.select(file(),{consent:true});const p=await c.preflight();await assert.rejects(c.commit());assert.equal((await store.snapshot()).records.length,32);assert.equal((await ledger.status(p.taskId)).committedBatches,1);const again=new ImportCoordinator({adapter:syntheticAdapter,transport});await again.select(file(),{consent:true,taskId:p.taskId});await again.preflight();const r=await again.commit();assert.equal(r.counts.added,65);assert.equal((await store.snapshot()).records.length,65);});
test('pause discards the selected file and requires new consent instead of silently resuming',async()=>{const {transport}=await setup(),c=new ImportCoordinator({adapter:syntheticAdapter,transport});await c.select(file(1),{consent:true});await c.preflight();await c.pause();assert.equal(c.hasFile,false);await assert.rejects(c.commit(),{code:'CONSENT_REQUIRED'});await assert.rejects(c.select(file(1),{consent:false}),{code:'CONSENT_REQUIRED'});});
test('pause while begin awaits acknowledgement revokes the arriving grant before any preflight',async()=>{const {transport,store,ledger}=await setup();let entered,release;const waiting=new Promise(r=>entered=r),gate=new Promise(r=>release=r);let task;const c=new ImportCoordinator({adapter:syntheticAdapter,transport:async(m,q)=>{const r=await transport(m,q);if(m==='begin'){task=r.taskId;entered();await gate;}return r;}});await c.select(file(),{consent:true});const run=c.preflight();await waiting;await c.pause();release();await assert.rejects(run,{code:'CANCELLED'});assert.equal(c.hasFile,false);assert.equal((await ledger.status(task)).checkedBatches,0);assert.equal(ledger.grants.size,0);assert.equal((await store.snapshot()).records.length,0);});
test('a corrupt later ZIP shard prevents every archive write, even after earlier preflight batches',async()=>{const {zip:syntheticZip}=await import('./fixtures/import-zip.mjs');const {transport,store}=await setup(),c=new ImportCoordinator({adapter:syntheticAdapter,transport});const zip=syntheticZip([{name:'conversations-1.json',text:JSON.stringify(Array.from({length:33},(_,i)=>syntheticRow(i+1)))},{name:'conversations-2.json',text:JSON.stringify([syntheticRow(99)]),badCrc:true}]);await c.select(zip,{consent:true});await assert.rejects(c.preflight(),{code:'ZIP_INTEGRITY'});assert.equal((await store.snapshot()).records.length,0);assert.equal(c.hasFile,false);});

test('known storage shortage blocks import before any write and can resume after headroom returns',async()=>{
 const {store,transport}=await setup();let freeBytes=1;
 const c=new ImportCoordinator({adapter:syntheticAdapter,transport,estimateStorage:async()=>({quota:1024*1024,usage:1024*1024-freeBytes})});
 await c.select(file(1),{consent:true});
 const first=await c.preflight();
 assert.equal(first.storagePreflight.state,'insufficient');
 assert.ok(first.storagePreflight.minimumNewTextBytes>freeBytes);
 await assert.rejects(c.commit(),{code:'STORAGE_FULL'});
 assert.equal((await store.snapshot()).records.length,0);
 assert.equal(c.hasFile,false);
 freeBytes=1024*1024;
 await c.select(file(1),{consent:true,taskId:first.taskId});
 const resumed=await c.preflight();
 assert.equal(resumed.taskId,first.taskId);
 assert.equal(resumed.storagePreflight.state,'lower_bound_met');
 const result=await c.commit();
 assert.equal(result.counts.added,1);
 assert.equal((await store.snapshot()).records.length,1);
});

test('storage is rechecked after a successful preflight before the first write',async()=>{
 const {store,transport}=await setup();let freeBytes=1024*1024;
 const c=new ImportCoordinator({adapter:syntheticAdapter,transport,estimateStorage:async()=>({quota:1024*1024,usage:1024*1024-freeBytes})});
 await c.select(file(1),{consent:true});
 assert.equal((await c.preflight()).storagePreflight.state,'lower_bound_met');
 freeBytes=0;
 await assert.rejects(c.commit(),{code:'STORAGE_FULL'});
 assert.equal((await store.snapshot()).records.length,0);
});

const rowsFile=rows=>new Blob([JSON.stringify(rows)]);
test('file time range is transient selected-file evidence and never changes ledger preview or transport',async()=>{
 const {store,ledger,transport}=await setup(),messages=[],publications=[];
 const c=new ImportCoordinator({adapter:syntheticAdapter,transport:async(m,q)=>{messages.push({m,q:structuredClone(q)});return transport(m,q);},onProgress:s=>publications.push(structuredClone(s))});
 const rows=[{...syntheticRow(1),createTime:'2021-02-03T04:05:06.000Z'},{...syntheticRow(2),createTime:'2020-01-01T00:00:00.000Z'},{...syntheticRow(3),createTime:'2022-03-04T00:00:00.000Z'}];
 await c.select(rowsFile(rows),{consent:true});const ready=await c.preflight();
 assert.deepEqual(ready.fileTimeRange,{from:rows[1].createTime,to:rows[2].createTime,known:3,unknown:0,conflicted:false});
 const stored=await ledger.status(ready.taskId);assert.deepEqual(ready.preview,stored.preview);assert.equal('fileTimeRange' in stored,false);assert.equal(JSON.stringify(messages).includes('fileTimeRange'),false);
 assert.equal((await store.snapshot()).records.length,0);await c.commit();assert.equal('fileTimeRange' in c.summary,false);assert.equal((await store.snapshot()).records.length,3);
 assert.ok(publications.filter(s=>s.phase!=='ready').every(s=>!('fileTimeRange' in s)));assert.equal(JSON.stringify(messages).includes('fileTimeRange'),false);assert.equal('fileTimeRange' in await ledger.status(ready.taskId),false);
});
for(const [label,times,expected]of [
 ['all unknown',[null,null],{from:null,to:null,known:0,unknown:2,conflicted:false}],
 ['mixed unknown',['2020-01-01T00:00:00.000Z',null],{from:'2020-01-01T00:00:00.000Z',to:'2020-01-01T00:00:00.000Z',known:1,unknown:1,conflicted:false}],
 ['invalid and out-of-range',['not-a-date','1999-01-01T00:00:00.000Z','2099-01-01T00:00:00.000Z','2020-02-30T00:00:00.000Z'],{from:null,to:null,known:0,unknown:4,conflicted:false}]
])test('file time range honestly reports '+label,async()=>{
 const {transport}=await setup(),c=new ImportCoordinator({adapter:syntheticAdapter,transport});await c.select(rowsFile(times.map((createTime,i)=>({...syntheticRow(i+1),createTime}))),{consent:true});assert.deepEqual((await c.preflight()).fileTimeRange,expected);await c.pause();assert.equal('fileTimeRange' in c.summary,false);
});
test('same Source conflicting valid times across batches make the file range unavailable without changing admission',async()=>{
 const {transport,store}=await setup(),c=new ImportCoordinator({adapter:syntheticAdapter,transport});const rows=Array.from({length:32},(_,i)=>syntheticRow(i+1));rows.push({...syntheticRow(1),createTime:'2022-01-01T00:00:00.000Z'});
 await c.select(rowsFile(rows),{consent:true});const r=await c.preflight();assert.equal(r.checkedBatches,2);assert.deepEqual(r.fileTimeRange,{from:null,to:null,known:33,unknown:0,conflicted:true});assert.equal(r.preview.added,32);assert.equal(r.preview.duplicates,1);assert.equal((await store.snapshot()).records.length,0);await c.cancel();assert.equal('fileTimeRange' in c.summary,false);
});
test('file range identifies Sources by platform and chat as well as message id',async()=>{
 const {transport}=await setup(),c=new ImportCoordinator({adapter:syntheticAdapter,transport});await c.select(rowsFile([syntheticRow(1),{...syntheticRow(1),chatId:'synthetic-chat-002',createTime:'2022-01-01T00:00:00.000Z'}]),{consent:true});assert.deepEqual((await c.preflight()).fileTimeRange,{from:'2020-01-01T00:00:00.000Z',to:'2022-01-01T00:00:00.000Z',known:2,unknown:0,conflicted:false});
});
test('late ready response cannot publish a file range into a newly selected session',async()=>{
 const {transport}=await setup();let entered,release;const waiting=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
 const c=new ImportCoordinator({adapter:syntheticAdapter,transport:async(m,q)=>{const r=await transport(m,q);if(m==='ready'){entered();await gate;}return r;}});
 await c.select(file(1),{consent:true});const pending=c.preflight();await waiting;await c.select(rowsFile([{...syntheticRow(2),createTime:null}]),{consent:true});assert.equal(c.summary.phase,'selected');assert.equal('fileTimeRange' in c.summary,false);release();await assert.rejects(pending,{code:'CANCELLED'});assert.equal(c.summary.phase,'selected');assert.equal('fileTimeRange' in c.summary,false);
 const next=await c.preflight();assert.deepEqual(next.fileTimeRange,{from:null,to:null,known:0,unknown:1,conflicted:false});
});

test('cancel rejection clears only transient range as soon as the selected file is released',async()=>{
 const {transport}=await setup();let entered,release;const waiting=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
 const c=new ImportCoordinator({adapter:syntheticAdapter,transport:async(m,q)=>{if(m==='cancel'){entered();await gate;throw Error('SYNTHETIC_CANCEL_REJECTED');}return transport(m,q);}});
 await c.select(file(1),{consent:true});await c.preflight();const before={...c.summary};delete before.fileTimeRange;
 const pending=c.cancel();await waiting;assert.equal(c.hasFile,false);assert.deepEqual(c.summary,before);release();await assert.rejects(pending,/SYNTHETIC_CANCEL_REJECTED/);assert.deepEqual(c.summary,before);
});
test('pause clears transient range during its existing transport wait and preserves rejection handling',async()=>{
 const {transport}=await setup();let entered,release;const waiting=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
 const c=new ImportCoordinator({adapter:syntheticAdapter,transport:async(m,q)=>{if(m==='pause'){entered();await gate;throw Error('SYNTHETIC_PAUSE_REJECTED');}return transport(m,q);}});
 await c.select(file(1),{consent:true});await c.preflight();const pending=c.pause();await waiting;assert.equal(c.hasFile,false);assert.equal(c.summary.phase,'ready');assert.equal('fileTimeRange' in c.summary,false);release();await pending;assert.equal(c.summary.phase,'paused');assert.equal('fileTimeRange' in c.summary,false);
});
test('failure cleanup clears transient range before waiting and old cancellation never clears a new ready range',async()=>{
 const {transport}=await setup();let entered,release;const waiting=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
 const c=new ImportCoordinator({adapter:syntheticAdapter,transport:async(m,q)=>{if(m==='cancel'){entered();await gate;throw Error('SYNTHETIC_OLD_CANCEL');}return transport(m,q);}});
 await c.select(file(1),{consent:true});await c.preflight();const old=c.session,pending=c.cancel();await waiting;
 await c.select(rowsFile([{...syntheticRow(2),createTime:'2022-01-01T00:00:00.000Z'}]),{consent:true});const ready=await c.preflight();const expected=structuredClone(ready.fileTimeRange);release();await assert.rejects(pending,/SYNTHETIC_OLD_CANCEL/);assert.deepEqual(c.summary.fileTimeRange,expected);
 await c.failed(Error('SYNTHETIC_OLD_FAILURE'),old);assert.equal(c.summary.phase,'ready');assert.deepEqual(c.summary.fileTimeRange,expected);
 let failureEntered,failureRelease;const failureWaiting=new Promise(r=>failureEntered=r),failureGate=new Promise(r=>failureRelease=r);const original=c.transport;c.transport=async(m,q)=>{if(m==='pause'){failureEntered();await failureGate;throw Error('SYNTHETIC_FAILURE_PAUSE');}return original(m,q);};
 const failed=c.failed(Error('SYNTHETIC_CURRENT_FAILURE'),c.session);await failureWaiting;assert.equal('fileTimeRange' in c.summary,false);failureRelease();await failed;assert.equal(c.summary.phase,'failed');assert.equal('fileTimeRange' in c.summary,false);
});
