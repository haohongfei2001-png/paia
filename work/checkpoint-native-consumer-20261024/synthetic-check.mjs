import {IDBFactory,IDBKeyRange,IDBDatabase} from '../../extension/tests/vendor/fake-indexeddb/build/esm/index.js';
import {runCheckpointPublicationNativeCases} from '../../extension/tests/native-sync/checkpoint-publication-fixture.mjs';
globalThis.indexedDB=new IDBFactory();globalThis.IDBKeyRange=IDBKeyRange;globalThis.IDBDatabase=IDBDatabase;
console.log(JSON.stringify({environment:'NODE_FAKE_IDB_ONLY_NOT_NATIVE',result:await runCheckpointPublicationNativeCases()},null,2));
