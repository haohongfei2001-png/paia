// Preparation only. The 14 original cases run against real IndexedDB at the
// integration milestone; no case body or assertion is removed or replaced.
export function nativeSelectedNegativeFixture(source,helpers){
 const replace=(before,after)=>{if(source.split(before).length!==2)throw Error('NATIVE_OWNER_BOUNDARY_CHANGED: '+before);source=source.replace(before,after);};
 replace("import test from 'node:test';",'');replace("import assert from 'node:assert/strict';",'');
 replace("import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';",'');
 replace('globalThis.IDBKeyRange=IDBKeyRange;','');replace("import {local,capture,inputEdit} from './harness/thought-m1.mjs';",'');
 if(/\bimport\s*\(/.test(source)||/node:|fake-indexeddb|\.\/harness\//.test(source))throw Error('NATIVE_OWNER_UNSUPPORTED_IMPORT');
 if(source.split('new LibraryDocumentsStore(').length!==4||source.split('new ArchiveRepository(').length!==3||source.split('new IDBFactory()').length!==2)throw Error('NATIVE_OWNER_CONSTRUCTORS_CHANGED');
 source=source.replaceAll('new LibraryDocumentsStore(','nativeStore(').replaceAll('new ArchiveRepository(','nativeRepository(').replaceAll('new IDBFactory()','nativeFactory()');
 for(const line of ["import {IDBFactory,IDBKeyRange} from '../vendor/fake-indexeddb/build/esm/index.js';","import {LibraryFoundationStore} from '../../core/thought-store.js';",'globalThis.IDBKeyRange=IDBKeyRange;']){if(helpers.split(line).length!==2)throw Error('NATIVE_HELPER_BOUNDARY_CHANGED');helpers=helpers.replace(line,'');}
 const setup=/^export async function setup\([^\n]+\n/m;if(!setup.test(helpers))throw Error('NATIVE_HELPER_SETUP_CHANGED');helpers=helpers.replace(setup,'');
 if(/IDBFactory|\bsetup\(/.test(helpers))throw Error('NATIVE_HELPER_SETUP_CHANGED');
 return `import {assert} from './generation-purge-assert.mjs';
const cases=[],test=(name,fn)=>{if(typeof name!=='string'||typeof fn!=='function')throw Error('native registration');cases.push({name,fn});};
let sequence=0;const repositories=[],ownedNames=new Set(),factoryNames=new WeakMap();
function nativeName(factory,name){const names=factoryNames.get(factory);if(!names||typeof name!=='string')throw Error('native factory binding');if([...names.values()].includes(name))return name;if(!name.startsWith('SYNTHETIC-'))throw Error('native synthetic name');let physical=names.get(name);if(!physical){physical='paia-native-selected-negative-'+(++sequence)+'-'+name;names.set(name,physical);ownedNames.add(physical);}return physical;}
function nativeFactory(){
 const factory={open(name,version){const physical=nativeName(factory,name);return version===undefined?indexedDB.open(physical):indexedDB.open(physical,version);},deleteDatabase(name){return indexedDB.deleteDatabase(nativeName(factory,name));},async databases(){const names=factoryNames.get(factory);return (await indexedDB.databases()).filter(row=>[...names.values()].includes(row.name));}};
 factoryNames.set(factory,new Map());return factory;
}
// Keep the same per-fixture factory identity for all original repositories and
// selector-created stores. Requests, DBs, transactions and inventories are native.
function nativeOptions(options){if(!factoryNames.has(options?.indexedDB))throw Error('native factory binding');return {...options,name:nativeName(options.indexedDB,options.name)};}
function nativeStore(storage,options){const store=new LibraryDocumentsStore(storage,nativeOptions(options));repositories.push(store.repository);return store;}
function nativeRepository(storage,options){const repository=new ArchiveRepository(storage,nativeOptions(options));repositories.push(repository);return repository;}
${helpers}
${source}
const previous=globalThis.__bnsNative;
globalThis.__bnsNative={...previous,async run(command,...args){
 if(command!=='selected-negative-matrix')return previous.run(command,...args);
 if(cases.length!==14)throw Error('native case count');const passed=[];
 for(const item of cases){const after=[];let failure;
  try{await item.fn({after(fn){if(typeof fn!=='function')throw Error('native after');after.push(fn);}});passed.push(item.name);}
  catch(error){failure=Error(item.name+': '+error.stack);}
  finally{
   for(const fn of after.reverse())try{await fn();}catch(error){failure??=error;}
   for(const repository of repositories.splice(0))try{await repository.close();}catch(error){failure??=error;}
   for(const name of ownedNames){try{await new Promise((resolve,reject)=>{const request=indexedDB.deleteDatabase(name);request.onsuccess=resolve;request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('native cleanup blocked'));});}catch(error){failure??=error;}}ownedNames.clear();
  }
  if(failure)throw failure;
 }
 return passed;
}};
`;
}
