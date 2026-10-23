// Preparation only. The 22 original cases run against real IndexedDB at the
// integration milestone; no case body or assertion is removed or replaced.
export function nativeSourcePurgeGroupFixture(source,helpers){
 const replace=(before,after)=>{if(source.split(before).length!==2)throw Error('NATIVE_OWNER_BOUNDARY_CHANGED: '+before);source=source.replace(before,after);};
 replace("import test from 'node:test';",'');replace("import assert from 'node:assert/strict';",'');
 replace("import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';",'');
 replace('globalThis.IDBKeyRange=IDBKeyRange;','');replace("import {local,capture,inputEdit} from './harness/thought-m1.mjs';",'');
 if(/\bimport\s*\(/.test(source)||/node:|fake-indexeddb|\.\/harness\//.test(source))throw Error('NATIVE_OWNER_UNSUPPORTED_IMPORT');
 if(source.split('new LibraryFoundationStore(').length!==3||source.includes('new ArchiveRepository(')||source.split('new IDBFactory()').length!==2)throw Error('NATIVE_OWNER_CONSTRUCTORS_CHANGED');
 source=source.replaceAll('new LibraryFoundationStore(','nativeStore(').replaceAll('new IDBFactory()','nativeFactory()');
 for(const line of ["import {IDBFactory,IDBKeyRange} from '../vendor/fake-indexeddb/build/esm/index.js';","import {LibraryFoundationStore} from '../../core/thought-store.js';",'globalThis.IDBKeyRange=IDBKeyRange;']){if(helpers.split(line).length!==2)throw Error('NATIVE_HELPER_BOUNDARY_CHANGED');helpers=helpers.replace(line,'');}
 const setup=/^export async function setup\([^\n]+\n/m;if(!setup.test(helpers))throw Error('NATIVE_HELPER_SETUP_CHANGED');helpers=helpers.replace(setup,'');
 if(/IDBFactory|\bsetup\(/.test(helpers))throw Error('NATIVE_HELPER_SETUP_CHANGED');
 return `import {assert} from './generation-purge-assert.mjs';
const cases=[],test=(name,fn)=>{if(typeof name!=='string'||typeof fn!=='function')throw Error('native registration');cases.push({name,fn});};
let sequence=0;const repositories=[],ownedNames=new Set(),factoryNames=new WeakMap();
function nativeName(factory,name){const names=factoryNames.get(factory);if(!names||typeof name!=='string')throw Error('native factory binding');if([...names.values()].includes(name))return name;if(name!=='SYNTHETIC-source-purge-group')throw Error('native synthetic name');let physical=names.get(name);if(!physical){physical='paia-native-source-purge-group-'+(++sequence)+'-'+name;names.set(name,physical);ownedNames.add(physical);}return physical;}
function nativeFactory(){
 const factory={open(name,version){const physical=nativeName(factory,name);return version===undefined?indexedDB.open(physical):indexedDB.open(physical,version);},deleteDatabase(name){return indexedDB.deleteDatabase(nativeName(factory,name));},async databases(){const names=factoryNames.get(factory);return (await indexedDB.databases()).filter(row=>[...names.values()].includes(row.name));}};
 factoryNames.set(factory,new Map());return factory;
}
// Keep the same per-fixture factory identity for all original repositories and
// selector-created stores. Requests, DBs, transactions and inventories are native.
function nativeOptions(options){if(!factoryNames.has(options?.indexedDB))throw Error('native factory binding');return {...options,name:nativeName(options.indexedDB,options.name??'SYNTHETIC-source-purge-group')};}
function nativeStore(storage,options){const store=new LibraryFoundationStore(storage,nativeOptions(options));repositories.push(store.repository);return store;}
${helpers}
${source}
const previous=globalThis.__bnsNative;
globalThis.__bnsNative={...previous,async run(command,...args){
 if(command!=='source-purge-group-matrix')return previous.run(command,...args);
 const expectedNames=["complete original positive and permanent negative Source checkpoint activates atomically and re-exports", "existing permanent denial and queued local work survive a complete checkpoint successor", "independent local positive Source and outbox are preserved while incoming positive and negative apply", "atomic rollback preserves every table on owner-failure", "atomic rollback preserves every table on owner-extra-row", "atomic rollback preserves every table on post-callback-extra-row", "atomic rollback preserves every table on semantic-terminal-extra-row", "concurrent ordinary local edit after validation refuses entire staged restore", "read-only stage refuses a checkpoint intersecting a live old Source rather than deleting it", "caller/Core rebinding after validation cannot apply prepared negative capabilities", "ordinary grouped consumer keeps its existing negative refusal", "cold reopen consumes restored positive Source and retains permanent denial across a real Working edit", "new cold negative combines with existing genuine local cleanup and re-exports both without losing outbox", "current cut refuses extra-protocol before any external get", "current cut refuses missing-deny before any external get", "current cut refuses wrong-frontier before any external get", "current cut refuses invented-generation before any external get", "current cut refuses unrepresented-human before any external get", "settings revocation after owner callback still aborts all positive and negative writes", "replacement staging invalidates an older unresolved reader instead of overwriting the new plan", "fresh repeated import and same-instance replay leave every row unchanged", "an ordinary local capture during export prevents publication of a stale checkpoint result"];
 if(cases.length!==expectedNames.length||new Set(cases.map(item=>item.name)).size!==expectedNames.length||cases.some((item,i)=>item.name!==expectedNames[i]))throw Error('native case allowlist');const passed=[];
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
