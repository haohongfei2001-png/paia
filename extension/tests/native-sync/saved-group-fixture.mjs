import {nativeFilterIntentFixture} from './filter-intent-fixture.mjs';
// Retain the original owning cases/assertions. Replace only Node's runner,
// assertion bridge and fake database constructor in the isolated test worker.
export function nativeSavedGroupFixture(source){
 const replace=(before,after)=>{if(source.split(before).length!==2)throw Error('SAVED_GROUP_FIXTURE_CHANGED');source=source.replace(before,after);};
 for(const token of ["import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';","import {LibraryDocumentsStore} from '../core/library-documents-store.js';","import {local,capture,inputEdit} from './harness/thought-m1.mjs';","globalThis.IDBKeyRange=IDBKeyRange;"])replace(token,'');
 replace('new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory()})',"store('bns-saved-group-native-'+(++sequence))");
 replace('await s.finishFoundation();t.after',"await s.finishFoundation();assert.ok(s.repository.db instanceof IDBDatabase,'original native database');t.after");
 source+="\nimport {setup} from './harness/thought-m1.mjs';\nimport {inputEdit,capture} from './harness/thought-m1.mjs';";
 let result=nativeFilterIntentFixture(source);
 const change=(before,after)=>{if(result.split(before).length!==2)throw Error('SAVED_GROUP_NATIVE_BRIDGE_CHANGED');result=result.replace(before,after);};
 change("import {LibraryFoundationStore} from '../core/thought-store.js';","import {LibraryDocumentsStore as LibraryFoundationStore} from '../core/library-documents-store.js';");
 change("command==='filter-intent-matrix'","command==='saved-group-matrix'");
 change("const assert={equal(a,b,label)","const assert={notEqual(a,b,label){if(a===b)throw Error(label||'notEqual');},equal(a,b,label)");
 change('try{await item.fn();}catch(e){throw Error(item.name+\': \'+e.stack);}',"const after=[];try{await item.fn({after(fn){after.push(fn);}});}catch(e){throw Error(item.name+': '+e.stack);}finally{for(const fn of after.reverse())await fn();}");
 return result;
}
