// Prepared only: exact original cold and semantic cases, with no browser execution.
export const PHASED_HUMAN_COLD_CASES=Object.freeze([
 "fixed phased seal rejects real late semantic-sequence mutation and rolls back the whole publication transaction",
 "fixed phased seal rejects real late semantic-known mutation and rolls back the whole publication transaction",
 "fixed phased seal rejects real late semantic-dirty mutation and rolls back the whole publication transaction",
 "fixed phased seal rejects real late semantic-extra mutation and rolls back the whole publication transaction",
 "explicit cold rehydration resumes the original two-group cursor and publishes without resetting its ledger",
 "cold original expectation refuses durable origin drift without publishing",
 "cold original expectation refuses durable entry drift without publishing",
 "cold original expectation refuses durable history drift without publishing",
 "cold original expectation refuses durable receipt drift without publishing",
 "cold original expectation refuses durable semantic drift without publishing",
 "cold original expectation refuses durable binding drift without publishing",
 "cold original expectation refuses durable compatibility drift without publishing",
 "cold completed readiness never repairs incomplete or damaged binding inside a shadow generation",
 "cold completed readiness never repairs incomplete or damaged binding-version inside a shadow generation",
 "cold completed readiness never repairs incomplete or damaged compatibility inside a shadow generation",
 "cold readonly readiness does not permit later binding drift before the next original owner",
 "cold readonly readiness does not permit later compatibility drift before the next original owner",
 "cold publication crash keeps the old prepaid ticket burned and resumes the original completed cursor"
]);
export function nativePhasedHumanColdFixture(source,helpers,command){
 if(!['phased-human-cold-matrix','phased-copy-retirement-matrix','checkpoint-storage-cold-matrix'].includes(command))throw Error('NATIVE_OWNER_COMMAND');
 const replace=(before,after)=>{if(source.split(before).length!==2)throw Error('NATIVE_OWNER_BOUNDARY_CHANGED: '+before);source=source.replace(before,after);};
 replace("import test from 'node:test';",'');replace("import assert from 'node:assert/strict';",'');
 replace("import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';",'');
 replace('globalThis.IDBKeyRange=IDBKeyRange;','');
 const storeClass='LibraryDocumentsStore';
 const helperImport="import {local} from './harness/thought-m1.mjs';";
 replace(helperImport,'');
 if(/\bimport\s*\(/.test(source)||/node:|fake-indexeddb|\.\/harness\//.test(source))throw Error('NATIVE_OWNER_UNSUPPORTED_IMPORT');
 // Construct the real original owners and preserve all supplied options. Each
 // factory-isolated synthetic DB becomes a uniquely named native IDB database.
 const storeCount=source.split('new '+storeClass+'(').length-1,repositoryCount=(source.match(/new ArchiveRepository\(/g)||[]).length;
 const expected=command==='phased-human-cold-matrix'?[5,5,2]:command==='phased-copy-retirement-matrix'?[4,2,3]:[3,2,2];
 if(storeCount!==expected[0]||repositoryCount!==expected[1]||source.split('new IDBFactory()').length!==expected[2])throw Error('NATIVE_OWNER_CONSTRUCTORS_CHANGED');
 source=source.replaceAll('new '+storeClass+'(','nativeStore(').replaceAll('new ArchiveRepository(','nativeRepository(').replaceAll('new IDBFactory()','nativeFactory()');
 const helperLines=["import {IDBFactory,IDBKeyRange} from '../vendor/fake-indexeddb/build/esm/index.js';","import {LibraryFoundationStore} from '../../core/thought-store.js';",'globalThis.IDBKeyRange=IDBKeyRange;'];
 for(const line of helperLines){if(helpers.split(line).length!==2)throw Error('NATIVE_HELPER_BOUNDARY_CHANGED');helpers=helpers.replace(line,'');}
 // setup is not consumed by these original owning files. Refuse accidental use
 // rather than constructing an untracked fallback database.
 helpers=helpers.replace(/^export async function setup\([^\n]+\n/m,'');
 if(/IDBFactory|\bsetup\(/.test(helpers))throw Error('NATIVE_HELPER_SETUP_CHANGED');
 const extraImport=repositoryCount?'':"import {ArchiveRepository} from '../core/idb-repository.js';\n";
 return `import {assert} from './generation-purge-assert.mjs';
${extraImport}
const cases=[],test=(name,fn)=>{if(typeof name!=='string'||typeof fn!=='function')throw Error('native registration');cases.push({name,fn});};
let sequence=0;const repositories=[],ownedNames=new Set(),factoryNames=new WeakMap();
function nativeFactory(){const cap=Object.freeze({});factoryNames.set(cap,new Map());return cap;}
function nativeOptions(options){const names=factoryNames.get(options?.indexedDB);if(!names||typeof options.name!=='string')throw Error('native factory binding');let name=names.get(options.name);if(!name){name='paia-native-${command}-'+(++sequence)+'-'+options.name;names.set(options.name,name);ownedNames.add(name);}return {...options,indexedDB,name};}
function nativeStore(storage,options){const store=new ${storeClass}(storage,nativeOptions(options));repositories.push(store.repository);return store;}
function nativeRepository(storage,options){const repository=new ArchiveRepository(storage,nativeOptions(options));repositories.push(repository);return repository;}
${helpers}
${source}
const previous=globalThis.__bnsNative;
globalThis.__bnsNative={...previous,async run(command,...args){
 if(command!==${JSON.stringify(command)})return previous.run(command,...args);
 const passed=[];
 const selected=${command!=='phased-human-cold-matrix'?'cases':"cases.filter(item=>"+JSON.stringify(PHASED_HUMAN_COLD_CASES)+".includes(item.name))"};if(selected.length!==${command==='phased-copy-retirement-matrix'?17:command==='checkpoint-storage-cold-matrix'?6:18})throw Error('native selected count');
 if(new Set(selected.map(item=>item.name)).size!==selected.length||selected.some(item=>/(?:^|[^0-9])(?:65|129)(?:[^0-9]|$)/.test(item.name)))throw Error('NATIVE_FORBIDDEN_CASE');
 for(const item of selected){const after=[];let failure;
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
