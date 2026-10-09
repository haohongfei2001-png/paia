import test from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {LibraryDocumentsStore,requireOriginalLibraryDocumentsStore} from '../core/library-documents-store.js';
import {originalLibraryDocumentsConstructor} from '../core/library-documents-owner.js';
import {LibraryFoundationStore} from '../core/thought-store.js';
import {IDBFactory} from './vendor/fake-indexeddb/build/esm/index.js';
import {local} from './harness/thought-m1.mjs';
test('fixed lazy original constructor preserves singleton, base and private constructor identity',()=>{
 assert.equal(originalLibraryDocumentsConstructor(),LibraryDocumentsStore);assert.equal(originalLibraryDocumentsConstructor(),LibraryDocumentsStore);
 assert.equal(LibraryDocumentsStore.name,'LibraryDocumentsStore');assert.equal(Object.getPrototypeOf(LibraryDocumentsStore),LibraryFoundationStore);
 const store=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory()});assert.doesNotThrow(()=>requireOriginalLibraryDocumentsStore(store));
 assert.equal(store.libraryDocumentMode,true);assert.equal(store.compatibilityStatus,null);
 for(const fake of [{libraryDocumentMode:true},Object.create(LibraryDocumentsStore.prototype),new LibraryFoundationStore(local(),{indexedDB:new IDBFactory()})])assert.throws(()=>requireOriginalLibraryDocumentsStore(fake));
 assert.throws(()=>originalLibraryDocumentsConstructor(LibraryFoundationStore));assert.equal(originalLibraryDocumentsConstructor(),LibraryDocumentsStore);
});
test('each original public entry independently initializes the static worker graph',()=>{
 for(const file of ['library-documents-store.js','thought-store.js','organizer/store.js','browser-native-sync/core.js','browser-native-sync/group-checkpoint-scope.js','browser-native-sync/human-library-plan.js'])execFileSync(process.execPath,['--input-type=module','-e',`await import(${JSON.stringify(new URL('../core/'+file,import.meta.url).href)});`],{stdio:'pipe'});
});
