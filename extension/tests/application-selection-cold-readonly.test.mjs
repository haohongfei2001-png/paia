import test from 'node:test';
import assert from 'node:assert/strict';
import {existingSelectionFixture} from './harness/existing-application-selection.mjs';
import {inputEdit} from './harness/thought-m1.mjs';
import {IDBDatabase,IDBObjectStore} from './vendor/fake-indexeddb/build/esm/index.js';
import {STORAGE_KEY} from '../core/constants.js';
import {CONTROL_PUBLICATION_RESERVATION} from '../core/local-control-publication.js';
import {CANONICAL_GENERATION_GATE} from '../core/browser-native-sync/canonical-generation-publication.js';
import {OriginalApplicationGenerationSelection,APPLICATION_SELECTION_MARKER as MARKER,inspectOriginalApplicationGenerationSelection as inspect,continueOriginalApplicationGenerationSelection as resume,cancelOriginalApplicationGenerationSelection as cancel,openOriginalSelectedExistingApplication as openSelected} from '../core/browser-native-sync/application-generation-selection.js';

// Each setup uses the original forward owner, never HELD reverse, a caller
// capability, a changed quota, a real SDK/provider or an old owning test run.
async function fixture(t,failure=null){
 const f=await existingSelectionFixture(t),owner=new OriginalApplicationGenerationSelection(f.a,f.coreA,f.a.local);t.after(()=>owner.close());await owner.prepare();
 const put=IDBObjectStore.prototype.put,del=IDBObjectStore.prototype.delete;let hit=false;
 IDBObjectStore.prototype.put=function(row,...args){if(!hit&&row?.id===MARKER&&((failure==='target-prepared'&&row.role==='target')||(failure==='source-selected'&&row.role==='source'&&row.phase==='selected'))){hit=true;throw Error('SYNTHETIC original phase interruption');}return put.call(this,row,...args);};
 IDBObjectStore.prototype.delete=function(key,...args){if(!hit&&failure==='target-cleanup'&&key===MARKER){hit=true;throw Error('SYNTHETIC original cleanup interruption');}return del.call(this,key,...args);};
 try{if(failure)await assert.rejects(owner.activate());else assert.equal((await owner.activate()).state,'selected');}finally{IDBObjectStore.prototype.put=put;IDBObjectStore.prototype.delete=del;}
 if(failure)assert.equal(hit,true);owner.close();return f;
}
async function observationOnly(f,fn){
 const transaction=IDBDatabase.prototype.transaction,set=f.a.local.set;let writeAttempts=0,sdkAttempts=0;
 IDBDatabase.prototype.transaction=function(stores,mode,...args){if(mode==='readwrite'){writeAttempts++;throw Error('SYNTHETIC cold write attempt blocked');}return transaction.call(this,stores,mode,...args);};
 f.a.local.set=async()=>{sdkAttempts++;throw Error('SYNTHETIC cold SDK attempt blocked');};
 try{return await fn();}finally{IDBDatabase.prototype.transaction=transaction;f.a.local.set=set;assert.equal(writeAttempts,0,'cold consumer must not even attempt native writes');assert.equal(sdkAttempts,0,'cold consumer must not attempt an SDK set');}
}
const call=(action,f)=>action(f.a.local,f.factory);
const state=async f=>({a:await f.snapshot(f.a),b:await f.snapshot(f.b),local:(await f.a.local.get(STORAGE_KEY))[STORAGE_KEY]});
const closed=result=>{assert.equal(result.retryAllowed,false);assert.equal(result.cancelAvailable,false);assert.equal(result.coldWriteAllowed,false);};

test('cold prepared continuation keeps original marker and cannot create target or dispatch',async t=>{
 const f=await fixture(t,'target-prepared'),before=await state(f);
 await observationOnly(f,async()=>{const result=await call(resume,f);assert.equal(result.state,'prepared');closed(result);assert.equal(result.recoveryReason,'original-accounting-unavailable');});assert.deepEqual(await state(f),before);
});
test('cold prepared cancellation cannot erase a legacy record without original accounting',async t=>{
 const f=await fixture(t,'target-prepared'),before=await state(f);
 await observationOnly(f,()=>assert.rejects(call(cancel,f),{code:'GENERATION_SELECTION_COLD_ACCOUNT_REQUIRED'}));assert.deepEqual(await state(f),before);
});
test('matching actual SDK after-row does not settle a cold dispatched source receipt',async t=>{
 const f=await fixture(t,'source-selected'),before=await state(f);const receipt=before.a.meta.find(x=>x.id===MARKER);assert.equal(before.local.databaseId,receipt.targetDatabaseId);assert.equal(receipt.phase,'dispatched');
 await observationOnly(f,async()=>{for(const action of [inspect,resume]){const result=await call(action,f);assert.equal(result.state,'outcome-unknown');closed(result);}await assert.rejects(call(cancel,f),{code:'GENERATION_SELECTION_OUTCOME_UNKNOWN'});});assert.deepEqual(await state(f),before);
});
test('cold selected source with unfinished target remains finishing and preserves reservation',async t=>{
 const f=await fixture(t,'target-cleanup'),before=await state(f);assert.ok(before.b.meta.find(x=>x.id===CONTROL_PUBLICATION_RESERVATION));
 await observationOnly(f,async()=>{for(const action of [inspect,resume]){const result=await call(action,f);assert.equal(result.state,'finishing');closed(result);}await assert.rejects(call(openSelected,f),{code:'GENERATION_SELECTION_PENDING'});});assert.deepEqual(await state(f),before);
});

// A genuine second native connection restores a matching unresolved target
// pair after the first absence observation. This is synthetic adversarial
// durable drift, not a permitted old-writer replay or an atomic global proof.
async function insertLateTarget(f){
 const source=(await f.snapshot(f.a)).meta.find(row=>row.id===MARKER),get=IDBObjectStore.prototype.get,transaction=IDBDatabase.prototype.transaction;
 const database=await new Promise((resolve,reject)=>{const request=f.factory.open(f.b.repository.name);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});let injected=null,reads=0;
 IDBObjectStore.prototype.get=function(key,...args){const request=get.call(this,key,...args);if(this.transaction.db.name===f.b.repository.name&&key===MARKER&&++reads===1)request.addEventListener('success',()=>{assert.equal(request.result,undefined);injected=new Promise((resolve,reject)=>{const tx=transaction.call(database,['meta'],'readwrite');tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);const table=tx.objectStore('meta');table.put({...source,role:'target',phase:'dispatched'});table.put(source.reservation);table.put({...source.targetGate,writeRevision:source.targetGate.writeRevision+2});});injected.catch(()=>{});});return request;};
 return {async close(){IDBObjectStore.prototype.get=get;try{assert.ok(injected,'actual late target native write was scheduled');await injected;}finally{database.close();}},source};
}
for(const [name,action]of [['inspect',inspect],['continue',resume],['startup',openSelected]])test(name+' never repairs a target pair that appears after an absence read',async t=>{
 const f=await fixture(t),late=await insertLateTarget(f);try{await observationOnly(f,async()=>{if(action===openSelected)await assert.rejects(call(action,f));else{const result=await call(action,f);assert.equal(result.state,'finishing');closed(result);}});}finally{await late.close();}
 const target=(await f.snapshot(f.b)).meta;assert.deepEqual(target.find(x=>x.id===MARKER),{...late.source,role:'target',phase:'dispatched'});assert.deepEqual(target.find(x=>x.id===CONTROL_PUBLICATION_RESERVATION),late.source.reservation);
});
test('terminal observation permits later original target edits without reviving old authority',async t=>{
 const f=await fixture(t);await inputEdit(f.b,f.blocks[0].id,{note:'SYNTHETIC later target work'});const before=await state(f);
 await observationOnly(f,async()=>{const result=await call(resume,f);assert.equal(result.state,'selected');closed(result);assert.equal(result.wholeArchiveComplete,false);});assert.deepEqual(await state(f),before);
});
test('same original control revision cannot be accepted with changed control bytes',async t=>{
 const f=await fixture(t),control=(await f.a.local.get(STORAGE_KEY))[STORAGE_KEY];control.preferences.appearance='dark';await f.a.local.set({[STORAGE_KEY]:control});const before=await state(f);
 await observationOnly(f,()=>assert.rejects(call(inspect,f),{code:'GENERATION_SELECTION_CHANGED'}));assert.deepEqual(await state(f),before);
});
test('original later control publication stays compatible with readonly completed receipt observation',async t=>{
 const f=await fixture(t),selected=await call(openSelected,f);t.after(()=>selected.repository.db?.close());await selected.updatePreferences({appearance:'dark'});const before=await state(f);
 await observationOnly(f,async()=>{const result=await call(inspect,f);assert.equal(result.state,'selected');closed(result);});assert.deepEqual(await state(f),before);
});
test('missing durable accounting remains denied after wall-clock reset and fabricated time fields',async t=>{
 const f=await fixture(t,'source-selected'),now=Date.now;Date.now=()=>0;try{await observationOnly(f,async()=>{const result=await call(resume,f);assert.equal(result.state,'outcome-unknown');closed(result);});}finally{Date.now=now;}
 const row=(await f.snapshot(f.a)).meta.find(x=>x.id===MARKER);await f.raw(f.a.repository,table=>table.put({...row,remainingMs:30000,remainingBytes:2097152}));const before=await state(f);
 await observationOnly(f,()=>assert.rejects(call(resume,f),{code:'GENERATION_SELECTION_CHANGED'}));assert.deepEqual(await state(f),before);
});
test('cold receipt decoder rejects a missing original reservation revision after later publication',async t=>{
 const f=await fixture(t),selected=await call(openSelected,f);t.after(()=>selected.repository.db?.close());await selected.updatePreferences({appearance:'dark'});const receipt=(await f.snapshot(f.a)).meta.find(x=>x.id===MARKER);await f.raw(f.a.repository,table=>table.put({...receipt,reservation:{}}));const before=await state(f);
 await observationOnly(f,()=>assert.rejects(call(inspect,f),{code:'GENERATION_SELECTION_CHANGED'}));assert.deepEqual(await state(f),before);
});
test('original fence digest cannot be detached from the selected source receipt',async t=>{
 const f=await fixture(t),receipt=(await f.snapshot(f.a)).meta.find(x=>x.id===MARKER);receipt.fences.gate.enabled=!receipt.fences.gate.enabled;await f.raw(f.a.repository,table=>table.put(receipt));const before=await state(f);
 await observationOnly(f,()=>assert.rejects(call(inspect,f),{code:'GENERATION_SELECTION_CHANGED'}));assert.deepEqual(await state(f),before);
});
test('later control revision still requires the exact original control stamp schema',async t=>{
 const f=await fixture(t),selected=await call(openSelected,f);t.after(()=>selected.repository.db?.close());await selected.updatePreferences({appearance:'dark'});const control=(await f.a.local.get(STORAGE_KEY))[STORAGE_KEY];control.controlPublication.nonce=null;await f.a.local.set({[STORAGE_KEY]:control});const before=await state(f);
 await observationOnly(f,()=>assert.rejects(call(inspect,f),{code:'GENERATION_SELECTION_CHANGED'}));assert.deepEqual(await state(f),before);
});
test('falsy native receipt results are not absence or permission to fall back to default',async t=>{
 const f=await fixture(t),before=await state(f),get=IDBObjectStore.prototype.get;
 // The inline-key native schema cannot persist primitive rows normally. This
 // explicitly injects a malformed native READ result, not a fabricated claim
 // that normal IDB put accepted null/false/0/empty-string durable metadata.
 for(const value of [null,false,0,''])for(const action of [inspect,resume,cancel,openSelected]){
  IDBObjectStore.prototype.get=function(key,...args){const request=get.call(this,key,...args);if(key===MARKER&&this.transaction.db.name===f.a.repository.name)request.addEventListener('success',()=>{request.result=value;});return request;};
  try{await observationOnly(f,()=>assert.rejects(call(action,f),{code:'GENERATION_SELECTION_CHANGED'}));}finally{IDBObjectStore.prototype.get=get;}
 }
 assert.deepEqual(await state(f),before);
});
