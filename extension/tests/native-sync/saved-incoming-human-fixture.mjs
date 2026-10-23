// Explicit milestone-only bridge for the ORIGINAL 34 incoming-Human cases.
// Only registration/assertions, fake factory and synthetic helper boundaries
// change. Production owner imports and every owning assertion/body remain.
export function nativeSavedIncomingHumanFixture(source,helpers){
 const replace=(before,after)=>{if(source.split(before).length!==2)throw Error('NATIVE_INCOMING_HUMAN_BOUNDARY_CHANGED: '+before);source=source.replace(before,after);};
 replace("import test from 'node:test';",'');replace("import assert from 'node:assert/strict';",'');
 replace("import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';",'');
 replace('globalThis.IDBKeyRange=IDBKeyRange;','');
 replace("import {local,capture,inputEdit} from './harness/thought-m1.mjs';",'');
 if(/\bimport\s*\(/.test(source)||/node:|fake-indexeddb|\.\/harness\//.test(source))throw Error('NATIVE_INCOMING_HUMAN_UNSUPPORTED_IMPORT');
 replace('new LibraryDocumentsStore(', 'nativeStore(');replace('new IDBFactory()', 'indexedDB');
 if(/new ArchiveRepository\(|IDBFactory/.test(source))throw Error('NATIVE_INCOMING_HUMAN_CONSTRUCTORS_CHANGED');
 const helperLines=["import {IDBFactory,IDBKeyRange} from '../vendor/fake-indexeddb/build/esm/index.js';","import {LibraryFoundationStore} from '../../core/thought-store.js';",'globalThis.IDBKeyRange=IDBKeyRange;'];
 for(const line of helperLines){if(helpers.split(line).length!==2)throw Error('NATIVE_HELPER_BOUNDARY_CHANGED');helpers=helpers.replace(line,'');}
 // setup is not consumed by this original owning file. Refuse accidental use
 // rather than constructing an untracked fallback database.
 helpers=helpers.replace(/^export async function setup\([^\n]+\n/m,'');
 if(/IDBFactory|\bsetup\(/.test(helpers))throw Error('NATIVE_HELPER_SETUP_CHANGED');
 return `import {assert} from './generation-purge-assert.mjs';
const cases=[],test=(name,fn)=>{if(typeof name!=='string'||typeof fn!=='function')throw Error('native registration');cases.push({name,fn});};
let sequence=0;const repositories=[],ownedNames=new Set();
function nativeOptions(options){if(options?.indexedDB!==indexedDB)throw Error('native factory binding');const name=ownedNames.has(options.name)?options.name:'paia-native-saved-incoming-human-matrix-'+(++sequence)+'-'+(options.name||'default');ownedNames.add(name);return {...options,name};}
function nativeStore(storage,options){const store=new LibraryDocumentsStore(storage,nativeOptions(options));repositories.push(store.repository);return store;}
${helpers}
${source}
const previous=globalThis.__bnsNative;
globalThis.__bnsNative={...previous,async run(command,...args){
 if(command!=='saved-incoming-human-matrix')return previous.run(command,...args);
 if(cases.length!==34)throw Error('native incoming Human case count changed');
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
