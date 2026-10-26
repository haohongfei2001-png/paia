import test from 'node:test';
import assert from 'node:assert/strict';
import {existingSelectionFixture} from './harness/existing-application-selection.mjs';
import {openConfiguredSyncWorker} from './harness/sync-configured-worker.mjs';
import {fakeGoogleCheckpointHTTP} from './harness/checkpoint-publication-http.mjs';
import {OriginalApplicationGenerationSelection,APPLICATION_SELECTION_MARKER} from '../core/browser-native-sync/application-generation-selection.js';
import {IDBObjectStore} from './vendor/fake-indexeddb/build/esm/index.js';
const binding={subject:'SYNTHETIC_selection_subject',clientId:'000000000000-synthetic.apps.googleusercontent.com',generation:'SYNTHETIC_generation',scopes:['https://www.googleapis.com/auth/drive.appdata']};
const options=f=>({storage:f.a.local,factory:f.factory,deviceId:'synthetic_A',datasetId:'synthetic_local_selection',provider:'google-drive',binding,cloud:fakeGoogleCheckpointHTTP(binding),applicationConfiguration:{mode:'validated-existing-generation'}});
const snapshot=async f=>({tables:await f.snapshot(f.a),local:await f.a.local.get(null)});
test('without an original cross-page editor proof, preparation stays read-only and direct activation cannot write a marker',async t=>{
 const f=await existingSelectionFixture(t),w=await openConfiguredSyncWorker(options(f));t.after(()=>w.close());
 const before=await snapshot(f);assert.equal((await w.ui('GENERATION_PREPARE')).ok,true);assert.deepEqual(await snapshot(f),before);
 // No page can assert away another page's dirty/IME/pending/unknown/disconnected
 // state. The current worker has no qualified cross-page proof producer.
 for(let attempt=0;attempt<2;attempt++)assert.equal((await w.rpc('PAIA_GENERATION_ACTIVATE')).ok,false);
 assert.deepEqual(await snapshot(f),before);assert.equal(await f.a.repository.transaction(false,t=>t.get('meta',APPLICATION_SELECTION_MARKER)),undefined);assert.equal(w.reloads(),0);
 const view=await w.rpc('PAIA_SYNC_STATUS');assert.equal(view.data.applicationSelection.editorProtection,'unavailable');assert.equal(view.data.applicationSelection.canActivate,false);assert.equal(view.data.applicationSelection.canRestart,false);
 assert.equal((await w.ui('GENERATION_CANCEL')).ok,true);assert.deepEqual(await snapshot(f),before);
});
test('a prepared interrupted operation cannot bypass the editor gate through continue before ready',async t=>{
 const f=await existingSelectionFixture(t),owner=new OriginalApplicationGenerationSelection(f.a,f.coreA,f.a.local);t.after(()=>owner.close());await owner.prepare();
 const original=IDBObjectStore.prototype.put;let once=false;IDBObjectStore.prototype.put=function(row,...args){if(!once&&row?.id===APPLICATION_SELECTION_MARKER&&row.role==='target'){once=true;throw Error('SYNTHETIC interrupted target fence');}return original.call(this,row,...args);};try{await assert.rejects(owner.activate());}finally{IDBObjectStore.prototype.put=original;}
 const before=await snapshot(f),w=await openConfiguredSyncWorker({...options(f),enabled:false,allowStartupPending:true});t.after(()=>w.close());assert.equal(w.startupError.code,'GENERATION_SELECTION_PENDING');
 assert.equal((await w.rpc('PAIA_GENERATION_CONTINUE')).ok,false);assert.deepEqual(await snapshot(f),before);assert.equal(w.reloads(),0);
 assert.equal((await w.ui('GENERATION_CANCEL')).ok,true);assert.equal((await w.rpc('PAIA_SYNC_STATUS')).data.applicationSelection.state,'not-prepared');
});
test('even a completed original selected receipt is not a cross-page editor proof and cannot reload the extension',async t=>{
 const f=await existingSelectionFixture(t),owner=new OriginalApplicationGenerationSelection(f.a,f.coreA,f.a.local);t.after(()=>owner.close());await owner.prepare();assert.equal((await owner.activate()).state,'selected');
 const before=await snapshot(f),w=await openConfiguredSyncWorker({...options(f),enabled:false});t.after(()=>w.close());
 for(let attempt=0;attempt<2;attempt++)assert.equal((await w.rpc('PAIA_GENERATION_RESTART')).ok,false);
 assert.equal(w.reloads(),0);assert.deepEqual(await snapshot(f),before);
});
