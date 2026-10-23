// Explicit small native bridge. It executes the unchanged owning callbacks;
// only Node registration and the original fake-IDB setup become native setup.
export function nativeManualPromptConflictFixture(source,helpers,command){
 if(command!=='manual-prompt-conflict-matrix')throw Error('NATIVE_OWNER_COMMAND');
 const replace=(before,after)=>{if(source.split(before).length!==2)throw Error('NATIVE_OWNER_BOUNDARY_CHANGED');source=source.replace(before,after);};
 replace("import test from 'node:test';",'');replace("import assert from 'node:assert/strict';",'');replace("import {setup} from './harness/thought-m1.mjs';",'');
 if(/\bimport\s*\(|node:|fake-indexeddb|\.\/harness\//.test(source))throw Error('NATIVE_OWNER_UNSUPPORTED_IMPORT');
 const setupLine=helpers.match(/^export async function setup\([^\n]+/m)?.[0];if(!setupLine||!setupLine.includes('indexedDB=new IDBFactory()')||!setupLine.includes('new Store(storage,{indexedDB,...options})'))throw Error('NATIVE_HELPER_BOUNDARY_CHANGED');
 const retained=helpers.split('\n').filter(line=>/^export const (?:local|capture) =/.test(line)).join('\n');if(retained.split('\n').length!==2)throw Error('NATIVE_HELPER_BOUNDARY_CHANGED');
 const nativeSetup=setupLine.replace('export async function','async function').replace('Store=LibraryFoundationStore','Store=OrganizerStore').replace('indexedDB=new IDBFactory()','indexedDB=globalThis.indexedDB').replace('new Store(storage,{indexedDB,...options})',"new Store(storage,{indexedDB,...options,name:'paia-native-manual-conflict-'+(++sequence)})").replace('await s.consent(true);','owned.push(s.repository);await s.consent(true);');
 return `import {assert} from './generation-purge-assert.mjs';
const cases=[],test=(name,fn)=>cases.push({name,fn});let sequence=0;const owned=[];
${retained}
${nativeSetup}
${source}
const previous=globalThis.__bnsNative;
globalThis.__bnsNative={...previous,async run(command,...args){
 if(command!==${JSON.stringify(command)})return previous.run(command,...args);
 if(cases.length!==23||new Set(cases.map(c=>c.name)).size!==23)throw Error('NATIVE_CASE_BOUNDARY');
 const passed=[];for(const item of cases){try{await item.fn();passed.push(item.name);}catch(error){throw Error(item.name+': '+error.stack);}finally{for(const repository of owned.splice(0)){await repository.close();await new Promise((resolve,reject)=>{const request=indexedDB.deleteDatabase(repository.name);request.onsuccess=resolve;request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('native cleanup blocked'));});}}}return passed;
}};`;
}
