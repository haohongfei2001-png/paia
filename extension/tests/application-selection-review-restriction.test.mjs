import test from 'node:test';
import assert from 'node:assert/strict';
import {existingSelectionFixture} from './harness/existing-application-selection.mjs';
import {OriginalApplicationGenerationSelection,holdOriginalApplicationSelectionReview as hold,requireOriginalApplicationSelectionReviewHold as current,releaseOriginalApplicationSelectionReviewHold as release,APPLICATION_SELECTION_MARKER} from '../core/browser-native-sync/application-generation-selection.js';
import {IDBObjectStore} from './vendor/fake-indexeddb/build/esm/index.js';
async function fixture(t){const f=await existingSelectionFixture(t),owner=new OriginalApplicationGenerationSelection(f.a,f.coreA,f.a.local);t.after(()=>owner.close());await owner.prepare();return {...f,owner};}
test('original review restriction blocks every stateful original owner entry and exact release only removes its own restriction',async t=>{
 const f=await fixture(t),beforeA=await f.snapshot(f.a),beforeB=await f.snapshot(f.b),token=hold(f.owner,f.a,f.coreA,f.a.local);assert.deepEqual(Reflect.ownKeys(token),[]);assert.equal(Object.isFrozen(token),true);
 for(const method of ['prepare','requalify','activate','continue','status','cancel'])await assert.rejects(f.owner[method](),{code:'GENERATION_SELECTION_BUSY'},method);
 assert.equal(current(token,f.owner),true);assert.throws(()=>release(Object.freeze({...token}),f.owner));assert.throws(()=>hold(f.owner,f.a,f.coreA,f.a.local));assert.equal(current(token,f.owner),true);
 assert.deepEqual(await f.snapshot(f.a),beforeA);assert.deepEqual(await f.snapshot(f.b),beforeB);assert.equal(release(token,f.owner),true);assert.throws(()=>release(token,f.owner));
 const next=hold(f.owner,f.a,f.coreA,f.a.local);assert.throws(()=>release(token,f.owner));assert.equal(current(next,f.owner),true);release(next,f.owner);assert.equal((await f.owner.activate()).state,'selected');
});
for(const change of ['close','sdk'])test(change+' invalidates the exact held review without reopening it',async t=>{
 const f=await fixture(t),token=hold(f.owner,f.a,f.coreA,f.a.local),original=f.a.local.set;
 if(change==='close')f.owner.close();else f.a.local.set=async()=>{};
 assert.throws(()=>current(token,f.owner));assert.throws(()=>release(token,f.owner));await assert.rejects(f.owner.activate(),{code:'GENERATION_SELECTION_BUSY'});
 f.a.local.set=original;
 assert.throws(()=>current(token,f.owner));assert.throws(()=>release(token,f.owner));
});
test('an attempted marker write cannot be reclassified as an untouched private review even after transaction rollback',async t=>{
 const f=await fixture(t),put=IDBObjectStore.prototype.put;let attempted=0;
 IDBObjectStore.prototype.put=function(row,...rest){if(row?.id===APPLICATION_SELECTION_MARKER){attempted++;throw Error('SYNTHETIC marker attempt');}return put.call(this,row,...rest);};
 try{await assert.rejects(f.owner.activate());}finally{IDBObjectStore.prototype.put=put;}
 assert.equal(attempted,1);assert.equal(await f.a.repository.transaction(false,t=>t.get('meta',APPLICATION_SELECTION_MARKER)),undefined);
 assert.throws(()=>hold(f.owner,f.a,f.coreA,f.a.local),{code:'GENERATION_SELECTION_NOT_PREPARED'});
});
test('foreign original owner, store or local object cannot obtain or release this private restriction',async t=>{
 const f=await fixture(t);assert.throws(()=>hold(f.owner,f.b,f.coreB,f.b.local));assert.throws(()=>hold(Object.create(OriginalApplicationGenerationSelection.prototype),f.a,f.coreA,f.a.local));
 const token=hold(f.owner,f.a,f.coreA,f.a.local),other=new OriginalApplicationGenerationSelection(f.a,f.coreA,f.a.local);t.after(()=>other.close());assert.throws(()=>release(token,other));assert.equal(current(token,f.owner),true);release(token,f.owner);
});

for(const method of ['status','continue','cancel'])test('already accepted original '+method+' retains its busy lifetime through the real read',async t=>{
 const f=await fixture(t),original=f.factory.databases;let resume,entered;
 const paused=new Promise(resolve=>{resume=resolve;}),started=new Promise(resolve=>{entered=resolve;});let used=false;
 f.factory.databases=async function(...args){if(!used){used=true;entered();await paused;}return original.apply(this,args);};
 t.after(()=>{resume();f.factory.databases=original;});
 const pending=f.owner[method]();await started;
 let token;
 try{assert.throws(()=>{token=hold(f.owner,f.a,f.coreA,f.a.local);},{code:'GENERATION_SELECTION_BUSY'});}
 finally{if(token)release(token,f.owner);resume();await pending;f.factory.databases=original;}
 const after=hold(f.owner,f.a,f.coreA,f.a.local);assert.equal(current(after,f.owner),true);release(after,f.owner);
});
