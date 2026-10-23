import {nativeTopicLifecycleFixture} from './topic-lifecycle-fixture.mjs';
// Original case bodies remain intact. The two original store constructors
// share one native database name per original synthetic storage identity.
export function nativeTopicHumanRestoreFixture(source){
 const replace=(before,after,count=1)=>{if(source.split(before).length!==count+1)throw Error('HUMAN_RESTORE_NATIVE_BOUNDARY_CHANGED');source=source.split(before).join(after);};
 replace('globalThis.IDBKeyRange=IDBKeyRange;','');
 replace('new IDBFactory()','globalThis.indexedDB');
 replace('new OrganizerStore(storage,','nativeHumanStore(storage,');
 replace('new OrganizerStore(source.storage,','nativeHumanStore(source.storage,');
 replace("import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';","import {nativeActivityOptions} from './harness/thought-m1.mjs';\nconst nativeHumanStore=(storage,options)=>new OrganizerStore(storage,nativeActivityOptions(storage,options));");
 if(/fake-indexeddb|new IDBFactory/.test(source))throw Error('HUMAN_RESTORE_NATIVE_UNSUPPORTED_FACTORY');
 return nativeTopicLifecycleFixture(source);
}
