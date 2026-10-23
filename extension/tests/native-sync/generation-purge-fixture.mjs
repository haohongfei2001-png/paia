// Explicit milestone-only native bridge. Original owning case bodies and
// assertion calls are retained. Only Node registration, database construction
// and the existing synthetic helper module boundary are adapted for MV3.
export function nativeGenerationPurgeFixture(source,helpers,command){
 if(!['generation-owner-matrix','source-purge-matrix','saved-multiple-matrix'].includes(command))throw Error('NATIVE_OWNER_COMMAND');
 const replace=(before,after)=>{if(source.split(before).length!==2)throw Error('NATIVE_OWNER_BOUNDARY_CHANGED: '+before);source=source.replace(before,after);};
 replace("import test from 'node:test';",'');replace("import assert from 'node:assert/strict';",'');
 replace("import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';",'');
 replace('globalThis.IDBKeyRange=IDBKeyRange;','');
 const storeClass=command==='saved-multiple-matrix'?'LibraryDocumentsStore':'LibraryFoundationStore';
 const helperImport=command==='generation-owner-matrix'?"import {local,capture} from './harness/thought-m1.mjs';":command==='saved-multiple-matrix'?"import {local,capture,inputEdit} from './harness/thought-m1.mjs';":"import {local,capture,inputEdit,derived} from './harness/thought-m1.mjs';";
 replace(helperImport,'');
 if(/\bimport\s*\(/.test(source)||/node:|fake-indexeddb|\.\/harness\//.test(source))throw Error('NATIVE_OWNER_UNSUPPORTED_IMPORT');
 // Construct the real original owners and preserve all supplied options. Each
 // factory-isolated synthetic DB becomes a uniquely named native IDB database.
 const storeCount=source.split('new '+storeClass+'(').length-1,repositoryCount=(source.match(/new ArchiveRepository\(/g)||[]).length;
 if(storeCount!==(command==='generation-owner-matrix'?2:1)||repositoryCount!==(command==='generation-owner-matrix'?2:0))throw Error('NATIVE_OWNER_CONSTRUCTORS_CHANGED');
 source=source.replaceAll('new '+storeClass+'(','nativeStore(').replaceAll('new ArchiveRepository(','nativeRepository(').replaceAll('new IDBFactory()','indexedDB');
 const helperLines=["import {IDBFactory,IDBKeyRange} from '../vendor/fake-indexeddb/build/esm/index.js';","import {LibraryFoundationStore} from '../../core/thought-store.js';",'globalThis.IDBKeyRange=IDBKeyRange;'];
 for(const line of helperLines){if(helpers.split(line).length!==2)throw Error('NATIVE_HELPER_BOUNDARY_CHANGED');helpers=helpers.replace(line,'');}
 // setup is not consumed by either original owning file. Refuse accidental use
 // rather than constructing an untracked fallback database.
 helpers=helpers.replace(/^export async function setup\([^\n]+\n/m,'');
 if(/IDBFactory|\bsetup\(/.test(helpers))throw Error('NATIVE_HELPER_SETUP_CHANGED');
 const extraImport=repositoryCount?'':"import {ArchiveRepository} from '../core/idb-repository.js';\n";
 return `import {assert} from './generation-purge-assert.mjs';
${extraImport}
const cases=[],test=(name,fn)=>{if(typeof name!=='string'||typeof fn!=='function')throw Error('native registration');cases.push({name,fn});};
let sequence=0;const repositories=[],ownedNames=new Set();
function nativeOptions(options){if(options?.indexedDB!==indexedDB)throw Error('native factory binding');const name='paia-native-${command}-'+(++sequence)+'-'+(options.name||'default');ownedNames.add(name);return {...options,name};}
function nativeStore(storage,options){const store=new ${storeClass}(storage,nativeOptions(options));repositories.push(store.repository);return store;}
function nativeRepository(storage,options){const repository=new ArchiveRepository(storage,nativeOptions(options));repositories.push(repository);return repository;}
${helpers}
${source}
const previous=globalThis.__bnsNative;
globalThis.__bnsNative={...previous,async run(command,...args){
 if(command!==${JSON.stringify(command)})return previous.run(command,...args);
 const passed=[];
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
