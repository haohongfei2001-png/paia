import {nativeTopicLifecycleFixture,nativeTopicLifecycleSetup} from './topic-lifecycle-fixture.mjs';
// Only factory/constructor boundaries change. Original owning case bodies,
// processing issuer, backup restore and all assertions are retained.
export function nativeTopicActivityFixture(source){
 const replace=(before,after,count=1)=>{if(source.split(before).length!==count+1)throw Error('ACTIVITY_NATIVE_BOUNDARY_CHANGED');source=source.split(before).join(after);};
 replace("import {IDBFactory} from './vendor/fake-indexeddb/build/esm/index.js';", "import {nativeActivityOptions} from './harness/thought-m1.mjs';\nconst nativeActivityStore=(storage,options)=>new OrganizerStore(storage,nativeActivityOptions(storage,options));");
 replace('new IDBFactory()','globalThis.indexedDB');
 replace('new OrganizerStore(storage,{indexedDB})','nativeActivityStore(storage,{indexedDB})',2);
 if(/node:/.test(source.replace("import test from 'node:test';",'').replace("import assert from 'node:assert/strict';",''))||/fake-indexeddb/.test(source))throw Error('ACTIVITY_NATIVE_UNSUPPORTED_IMPORT');
 return nativeTopicLifecycleFixture(source);
}
export function nativeTopicActivitySetup(source){
 let generated=nativeTopicLifecycleSetup(source);
 const before="{indexedDB:nativeFactory,name:'lifecycle-native-'+(++nativeSequence),...options}";
 if(generated.split(before).length!==2)throw Error('ACTIVITY_NATIVE_SETUP_CHANGED');
 generated=generated.replace(before,'nativeActivityOptions(storage,{indexedDB:nativeFactory,...options})');
 return generated+`\nconst activityNames=new WeakMap();
export function nativeActivityOptions(storage,options){
 if(options.indexedDB!==globalThis.indexedDB)throw Error('NATIVE_DATABASE_REQUIRED');
 let name=activityNames.get(storage);if(!name){name='activity-native-'+crypto.randomUUID();activityNames.set(storage,name);}
 if(options.name!==undefined)throw Error('ACTIVITY_NATIVE_EXPLICIT_NAME');
 return {...options,name};
}\n`;
}
