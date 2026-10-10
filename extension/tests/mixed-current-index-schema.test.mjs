import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {local} from './harness/thought-m1.mjs';
import {mixedCurrentIndexSchema,mixedCurrentPhysicalIndexKey as key} from '../core/browser-native-sync/mixed-current-index-schema.js';
import {sourceWorkingCurrentIndexSchema} from '../core/browser-native-sync/source-working-index-schema.js';
globalThis.IDBKeyRange=IDBKeyRange;
test('complete mixed v5 schema equals original repository DDL for all37 stores, including empty families',async()=>{
 const store=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory()});await store.consent(true);await store.finishFoundation();
 try{await store.repository.transaction(false,t=>{
  const specs=mixedCurrentIndexSchema();assert.equal(Object.keys(specs).length,37);assert.deepEqual(Object.keys(specs).sort(),[...t.tx.objectStoreNames].sort());let total=0;
  for(const [name,definitions]of Object.entries(specs)){
   const objectStore=t.tx.objectStore(name);assert.equal(objectStore.keyPath,'id');assert.equal(objectStore.autoIncrement,false);assert.deepEqual([...objectStore.indexNames].sort(),Object.keys(definitions).sort());
   for(const [index,spec]of Object.entries(definitions)){const actual=objectStore.index(index);assert.deepEqual(actual.keyPath,spec.path,name+'/'+index);assert.equal(actual.unique,spec.unique,name+'/'+index);assert.equal(actual.multiEntry,spec.multiEntry,name+'/'+index);total++;}
  }
  assert.equal(total,110);assert.equal(total,Object.values(specs).reduce((n,s)=>n+Object.keys(s).length,0));
  for(const [name,definitions]of Object.entries(sourceWorkingCurrentIndexSchema))for(const [index,spec]of Object.entries(definitions))assert.equal(specs[name][index],spec,'original Source49 spec identity');
 });}finally{await store.repository.close();}
});
test('Human indexes preserve original compound and multiEntry paths and missing fields; selectors invoke no supplied getter',()=>{
 const specs=mixedCurrentIndexSchema();assert.equal(Object.isFrozen(specs),true);assert.equal(Object.isFrozen(specs.dependencies.bySource.path),true);
 assert.deepEqual(key('thoughts','byUpdated',{activeKey:0,negativeUpdatedSequence:-4,id:'SYNTHETIC'}),[0,-4,'SYNTHETIC']);
 const sources=['SYNTHETIC_A','SYNTHETIC_A'];assert.equal(key('dependencies','bySource',{sourceRecordIds:sources}),sources);
 assert.equal(key('thoughts','byExact',{}),null);assert.equal(key('thoughts','byExact',{exactKey:undefined}),null);assert.equal(key('thoughts','byExact',Object.create({exactKey:'SYNTHETIC'})),null);
 let reads=0;const row={};Object.defineProperty(row,'exactKey',{get(){reads++;throw Error('supplied getter');}});assert.throws(()=>key('thoughts','byExact',row),{code:'BNS_SOURCE_WORKING_PHYSICAL_INVALID'});assert.equal(reads,0);
 for(const [store,index]of [['meta','byOwner'],['__proto__','byName'],['thoughts','constructor']])assert.throws(()=>key(store,index,{}),{code:'BNS_SOURCE_WORKING_PHYSICAL_INVALID'});
 assert.throws(()=>{specs.topics.byIndex.path.push('SYNTHETIC');});assert.throws(()=>mixedCurrentIndexSchema({}),{code:'BNS_SOURCE_WORKING_PHYSICAL_INVALID'});
});
