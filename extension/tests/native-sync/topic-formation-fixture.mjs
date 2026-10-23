import {nativeTopicLifecycleFixture,nativeTopicLifecycleSetup} from './topic-lifecycle-fixture.mjs';
// Only Node registration and the factory/unique-database constructor boundaries
// differ. The full original owning file, including its causal cycle, is kept.
export function nativeTopicFormationFixture(source){
 const replace=(before,after)=>{if(source.split(before).length!==2)throw Error('FORMATION_NATIVE_BOUNDARY_CHANGED');source=source.replace(before,after);};
 replace("import {IDBFactory} from './vendor/fake-indexeddb/build/esm/index.js';","import {nativeFormationOptions} from './harness/thought-m1.mjs';");
 replace('new IDBFactory()','globalThis.indexedDB');
 replace('new OrganizerStore(storage,{indexedDB})','new OrganizerStore(storage,nativeFormationOptions(storage,{indexedDB}))');
 if(/node:/.test(source.replace("import test from 'node:test';",'').replace("import assert from 'node:assert/strict';",''))||/fake-indexeddb/.test(source))throw Error('FORMATION_NATIVE_UNSUPPORTED_IMPORT');
 return nativeTopicLifecycleFixture(source);
}
export function nativeTopicFormationSetup(source){
 let generated=nativeTopicLifecycleSetup(source);
 const before="{indexedDB:nativeFactory,name:'lifecycle-native-'+(++nativeSequence),...options}";
 if(generated.split(before).length!==2)throw Error('FORMATION_NATIVE_SETUP_CHANGED');
 generated=generated.replace(before,'nativeFormationOptions(storage,{indexedDB:nativeFactory,...options})');
 return generated+`\nconst formationNames=new WeakMap();
export function nativeFormationOptions(storage,options){
 if(options.indexedDB!==globalThis.indexedDB)throw Error('NATIVE_DATABASE_REQUIRED');
 let name=formationNames.get(storage);if(!name){name='formation-native-'+crypto.randomUUID();formationNames.set(storage,name);}
 if(options.name!==undefined)throw Error('FORMATION_NATIVE_EXPLICIT_NAME');
 return {...options,name};
}\n`;
}
