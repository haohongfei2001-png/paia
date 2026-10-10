import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {local,capture,inputEdit} from './harness/thought-m1.mjs';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {SourceBootstrapJournal} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {FilterIntentSyncJournal} from '../core/browser-native-sync/filter-intent-journal.js';
import {InputWorkingSyncJournal} from '../core/browser-native-sync/input-working-journal.js';
import {requireSourceWorkingStoreBinding} from '../core/browser-native-sync/source-working-binding.js';
globalThis.IDBKeyRange=IDBKeyRange;
async function producer(){const store=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory()});await store.consent(true);await store.finishFoundation();const core=new BrowserNativeSyncCore(store.repository,{datasetId:'synthetic_source_binding_dataset',deviceId:'synthetic_source_binding_device'});store.sourceBootstrapJournal=new SourceBootstrapJournal(core);store.filterIntentJournal=new FilterIntentSyncJournal(core);store.inputWorkingJournal=new InputWorkingSyncJournal(core,{filterJournal:store.filterIntentJournal,logicalCommits:true});return {store,core};}
test('genuine current application Store permits Source and Working readiness without a fabricated Human journal',async()=>{
 const x=await producer();try{assert.equal(x.store.humanLibraryJournal,null);const before=requireSourceWorkingStoreBinding(x.store,x.core);await x.store.capture(capture((await x.store.status()).epoch));const input=(await x.store.snapshot()).library.blocks[0].id;await inputEdit(x.store,input,{note:'SYNTHETIC real application Working edit'});const after=requireSourceWorkingStoreBinding(x.store,x.core,before);assert.equal(after.source,before.source);assert.equal(after.working,before.working);assert.equal(x.store.humanLibraryJournal,null);}finally{await x.store.repository.close();}
});
test('readiness rejects nonlogical Working owner, mismatched filter and a changed otherwise genuine Source owner',async()=>{
 const x=await producer();try{const before=requireSourceWorkingStoreBinding(x.store,x.core),working=x.store.inputWorkingJournal,filter=x.store.filterIntentJournal,source=x.store.sourceBootstrapJournal;
 x.store.inputWorkingJournal=new InputWorkingSyncJournal(x.core,{filterJournal:filter});assert.throws(()=>requireSourceWorkingStoreBinding(x.store,x.core),{code:'BNS_SOURCE_WORKING_OWNER_REQUIRED'});x.store.inputWorkingJournal=working;
 x.store.filterIntentJournal=new FilterIntentSyncJournal(x.core);assert.throws(()=>requireSourceWorkingStoreBinding(x.store,x.core),{code:'BNS_SOURCE_WORKING_OWNER_REQUIRED'});x.store.filterIntentJournal=filter;
 x.store.sourceBootstrapJournal=new SourceBootstrapJournal(x.core);assert.throws(()=>requireSourceWorkingStoreBinding(x.store,x.core,before),{code:'BNS_HUMAN_CHANGED'});x.store.sourceBootstrapJournal=source;
 }finally{await x.store.repository.close();}
});
test('readiness rejects an incomplete Store, unpublished control and supplied readiness getter without invoking it',async()=>{
 const x=await producer();try{for(const key of ['documentsLoaded','pendingControl']){const d=Object.getOwnPropertyDescriptor(x.store,key);x.store[key]=key==='documentsLoaded'?false:{};assert.throws(()=>requireSourceWorkingStoreBinding(x.store,x.core),{code:'BNS_SOURCE_WORKING_OWNER_REQUIRED'});Object.defineProperty(x.store,key,d);}
 let reads=0;const d=Object.getOwnPropertyDescriptor(x.store,'loaded');Object.defineProperty(x.store,'loaded',{get(){reads++;return true;},configurable:true});try{assert.throws(()=>requireSourceWorkingStoreBinding(x.store,x.core),{code:'BNS_SOURCE_WORKING_OWNER_REQUIRED'});assert.equal(reads,0);}finally{Object.defineProperty(x.store,'loaded',d);}
 }finally{await x.store.repository.close();}
});
