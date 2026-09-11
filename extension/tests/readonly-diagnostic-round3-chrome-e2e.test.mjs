import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {uiHarness} from './harness/library-ui-round3.mjs';
const code=await readFile(new URL('../development/inspect-library-readonly.js',import.meta.url),'utf8');
test('Round 3 native IDB: read-only diagnostic preserves seeded data and never calls Store',{timeout:15000},async()=>{
 const h=await uiHarness();try{const p=await h.page();const result=await p.evaluate(async code=>{
  const open=()=>new Promise((resolve,reject)=>{const r=indexedDB.open('paia-archive',5);r.onupgradeneeded=()=>{for(const n of ['topics','sections','placements','meta','records'])r.result.createObjectStore(n,{keyPath:'id'});r.transaction.objectStore('topics').createIndex('byIndex',['activeKey','pinKey','pinRank','negativeUpdatedSequence','id']);};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  const db=await open();await new Promise((resolve,reject)=>{const tx=db.transaction([...db.objectStoreNames],'readwrite'),row={id:'SYNTHETIC_PRIVATE_ID',name:'SYNTHETIC_PRIVATE_NAME',lifecycle:'active',activeKey:0,pinKey:1,pinRank:'500000000000'};tx.objectStore('topics').put(row);tx.objectStore('sections').put({id:'SECTION_PRIVATE_ID',topicId:row.id,layoutGeneration:1,lifecycle:'active',title:'PRIVATE_SECTION'});tx.objectStore('records').put({id:'SOURCE_PRIVATE_ID',body:'PRIVATE_SOURCE'});tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});
  const dump=async()=>{const result={};await new Promise(resolve=>{const tx=db.transaction([...db.objectStoreNames],'readonly');for(const n of db.objectStoreNames){const r=tx.objectStore(n).getAll();r.onsuccess=()=>result[n]=r.result;}tx.oncomplete=resolve;});return JSON.stringify(result);};const before=await dump();
  const modes=[],stores=[],original=IDBDatabase.prototype.transaction;IDBDatabase.prototype.transaction=function(names,mode,...args){modes.push(mode);stores.push(...names);return original.call(this,names,mode,...args);};
  let report;const logs=[];try{report=await new Function('globalThis','IDBKeyRange','console','return '+code)({indexedDB,chrome:{runtime:{id:'synthetic'}},location:{protocol:'chrome-extension:',host:'synthetic'}},IDBKeyRange,{info:x=>logs.push(x)});}finally{IDBDatabase.prototype.transaction=original;}
  const after=await dump();db.close();return {report,modes,stores,logs,unchanged:before===after};
 },code);
 assert.equal(result.unchanged,true);assert.deepEqual(result.modes,['readonly']);assert.ok(!result.stores.includes('records'));assert.equal(result.report.index.gap,1);assert.equal(result.report.layouts.legacyOneWithSection,1);assert.equal(result.report.markers.compatibilityComplete,false);assert.equal(result.logs.length,1);assert.doesNotMatch(result.logs[0],/PRIVATE/);
 }finally{await h.close();}
});
test('Round 3 native IDB: create-after-enumeration race is aborted with no database left behind',{timeout:15000},async()=>{
 const h=await uiHarness();try{const p=await h.page();const r=await p.evaluate(async code=>{
  const logs=[],factory={databases:async()=>[{name:'paia-archive',version:5}],open:(...a)=>indexedDB.open(...a)};
  const report=await new Function('globalThis','IDBKeyRange','console','return '+code)({indexedDB:factory,chrome:{runtime:{id:'synthetic'}},location:{protocol:'chrome-extension:',host:'synthetic'}},IDBKeyRange,{info:x=>logs.push(x)});
  return {report,databases:await indexedDB.databases()};
 },code);assert.equal(r.report.status,'read_unavailable');assert.deepEqual(r.databases,[]);
 }finally{await h.close();}
});
