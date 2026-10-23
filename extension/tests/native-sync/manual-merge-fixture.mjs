import {nativeFilterIntentFixture} from './filter-intent-fixture.mjs';

// Reuse the exact owning assertions in the original worker/native IDB harness.
// Only the Node test bridge and synthetic database constructor are replaced.
export function nativeManualMergeFixture(source){
 const replace=(before,after)=>{if(source.split(before).length!==2)throw Error('MANUAL_MERGE_FIXTURE_CHANGED');source=source.replace(before,after);};
 for(const token of ["import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';","import {LibraryFoundationStore} from '../core/thought-store.js';","import {local} from './harness/thought-m1.mjs';","globalThis.IDBKeyRange=IDBKeyRange;"])replace(token,'');
 replace('new LibraryFoundationStore(local(),{indexedDB:new IDBFactory()})',"store('bns-manual-merge-native-'+(++sequence))");
 source+="\nimport {setup} from './harness/thought-m1.mjs';\nimport {inputEdit,capture} from './harness/thought-m1.mjs';";
 return nativeFilterIntentFixture(source).replace("command==='filter-intent-matrix'","command==='manual-merge-matrix'");
}
