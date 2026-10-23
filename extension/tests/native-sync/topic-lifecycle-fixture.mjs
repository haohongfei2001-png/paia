// Test-only adaptation: all owning test bodies and assertions remain unchanged.
export function nativeTopicLifecycleFixture(source){
 const replace=(before,after)=>{if(source.split(before).length!==2)throw Error('LIFECYCLE_NATIVE_OWNER_CHANGED');source=source.replace(before,after);};
 replace("import test from 'node:test';",'');
 replace("import assert from 'node:assert/strict';",'');
 return `
import originalAssert,{assertionCount} from './lifecycle-native-assert.mjs';
const assert={...originalAssert,match(value,pattern,message){originalAssert.ok(pattern instanceof RegExp&&typeof value==='string'&&pattern.test(value),message);}};
const cases=[],test=(name,fn)=>cases.push({name,fn});
${source}
const previous=globalThis.__bnsNative;
globalThis.__bnsNative={...previous,async run(command,...args){
 if(command==='topic-lifecycle-native-matrix'){
  const outcomes=[];
  for(const item of cases){const before=assertionCount();try{await item.fn();outcomes.push({name:item.name,state:'PASS',assertions:assertionCount()-before});}catch(error){outcomes.push({name:item.name,state:'FAIL',assertions:assertionCount()-before,error:{name:error.name,code:error.code||null,message:error.message,stack:error.stack}});}}
  return outcomes;
 }
 return previous.run(command,...args);
}};
`;
}
export function nativeTopicLifecycleSetup(source){
 const replace=(before,after)=>{if(source.split(before).length!==2)throw Error('LIFECYCLE_NATIVE_SETUP_CHANGED');source=source.replace(before,after);};
 replace("import {IDBFactory,IDBKeyRange} from '../vendor/fake-indexeddb/build/esm/index.js';",'');
 replace('globalThis.IDBKeyRange=IDBKeyRange;','let nativeSequence=0;');
 replace("export const local = () => { const data = {}; return {async get(k) {return {[k]:structuredClone(data[k])};}, async set(v) {Object.assign(data,structuredClone(v));}}; };",`export const local=()=>{const prefix='lifecycle-native:'+crypto.randomUUID()+':';return {async get(key){const row=await chrome.storage.local.get(prefix+key);return {[key]:row[prefix+key]};},async set(value){await chrome.storage.local.set(Object.fromEntries(Object.entries(value).map(([key,row])=>[prefix+key,row])));}};};`);
 replace('indexedDB=new IDBFactory(),s=new Store(storage,{indexedDB,...options})',"nativeFactory=globalThis.indexedDB,s=new Store(storage,{indexedDB:nativeFactory,name:'lifecycle-native-'+(++nativeSequence),...options})");
 replace('return {s,storage,indexedDB};',"if(!(s.repository.db instanceof IDBDatabase)||!(nativeFactory instanceof IDBFactory))throw Error('NATIVE_DATABASE_REQUIRED');return {s,storage,indexedDB:nativeFactory};");
 return source;
}
