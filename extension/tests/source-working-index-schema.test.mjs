import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {local} from './harness/thought-m1.mjs';
import {sourceWorkingCurrentIndexSchema as specs,sourceWorkingPhysicalIndexKey as key} from '../core/browser-native-sync/source-working-index-schema.js';
globalThis.IDBKeyRange=IDBKeyRange;
test('all selected Source/IA/Library index names, keyPaths and unique/multiEntry flags equal the original real repository DDL',async()=>{
 const store=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory()});await store.consent(true);await store.finishFoundation();
 try{await store.repository.transaction(false,t=>{let checked=0;for(const [name,definitions]of Object.entries(specs)){
  const objectStore=t.tx.objectStore(name);assert.equal(objectStore.keyPath,'id');assert.deepEqual([...objectStore.indexNames].sort(),Object.keys(definitions).sort());
  for(const [index,spec]of Object.entries(definitions)){const actual=objectStore.index(index);assert.deepEqual(actual.keyPath,spec.path);assert.equal(actual.unique,spec.unique);assert.equal(actual.multiEntry,spec.multiEntry);checked++;}
 }assert.equal(checked,49);});}finally{await store.repository.close();}
});
test('original missing/own-undefined index path omits an entry while compound or display vectors preserve physical values',()=>{
 assert.equal(key('recordIndex','byLegacyChat',{legacyChat:undefined}),null);assert.equal(key('recordIndex','byLegacyChat',{}),null);
 assert.equal(key('operationReceipts','byOwner',{namespace:'working-input',ownerId:'SYNTHETIC'}),null);
 const display=[-0,'SYNTHETIC document'];assert.equal(key('documents','byDisplay',{displayKey:display}),display);assert.ok(Object.is(display[0],-0));
 assert.deepEqual(key('blockIndex','byTime',{documentId:'SYNTHETIC',known:1,stamp:'',id:'SYNTHETIC input'}),['SYNTHETIC',1,'','SYNTHETIC input']);
});
test('fixed schema is deeply immutable and index key projection never invokes supplied getters or inherits a path',()=>{
 assert.throws(()=>specs.recordIndex.byIdentity.path.push('SYNTHETIC'));
 assert.throws(()=>{specs.recordIndex.bySource.path='SYNTHETIC';});
 let reads=0;const row={};Object.defineProperty(row,'legacyChat',{get(){reads++;return 'SYNTHETIC';}});assert.throws(()=>key('recordIndex','byLegacyChat',row),{code:'BNS_SOURCE_WORKING_PHYSICAL_INVALID'});assert.equal(reads,0);
 assert.equal(key('recordIndex','byLegacyChat',Object.create({legacyChat:'SYNTHETIC'})),null);
 for(const [store,index]of [['records','bySource'],['SYNTHETIC','bySource'],['recordIndex','constructor'],['__proto__','hasOwnProperty'],['constructor','prototype']])assert.throws(()=>key(store,index,{}),{code:'BNS_SOURCE_WORKING_PHYSICAL_INVALID'});
 let coerced=0;const selector={[Symbol.toPrimitive](){coerced++;return 'recordIndex';}};assert.throws(()=>key(selector,'bySource',{}),{code:'BNS_SOURCE_WORKING_PHYSICAL_INVALID'});assert.throws(()=>key('recordIndex',selector,{}),{code:'BNS_SOURCE_WORKING_PHYSICAL_INVALID'});assert.equal(coerced,0);
});
