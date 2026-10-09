// The private profile is executed from exact original source in disposable VMs.
// Those VMs are predicate checks, never native transaction/commit evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {ArchiveError} from '../../core/constants.js';
import {BrowserNativeSyncCore} from '../../core/browser-native-sync/core.js';
import {ArchiveRepository} from '../../core/idb-repository.js';
import {IDBFactory,IDBKeyRange} from '../vendor/fake-indexeddb/build/esm/index.js';
import {local} from '../harness/thought-m1.mjs';
globalThis.IDBKeyRange=IDBKeyRange;
const source=await readFile(new URL('../../core/browser-native-sync/core.js',import.meta.url),'utf8');
const start=source.indexOf('// BEGIN original retention Core data methods.'),end=source.indexOf('// END original retention Core data methods.',start);
assert.ok(start>0&&end>start);assert.equal(source.indexOf('// BEGIN original retention Core data methods.',start+1),-1);
const profile=source.slice(start,end);
const methods=['get','put'].map(name=>{const matches=source.match(new RegExp('^ async '+name+'\\(.*$','gm'));assert.equal(matches?.length,1);return matches[0];}).join('\n');
function fixture(){
 return runInNewContext(`(()=>{
  function fail(code){throw new ArchiveError(code);}
  class BrowserNativeSyncCore{${methods}}
  ${profile}
  const core=new BrowserNativeSyncCore(),proto=BrowserNativeSyncCore.prototype;
  const originalGet=Object.getOwnPropertyDescriptor(proto,'get');let getters=0;
  return {
   check(){return requireOriginalHumanRetentionCoreDataMethods(core);},
   getters(){return getters;},
   ownFunction(){core.get=async()=>undefined;},
   ownValue(){core.put=null;},
   ownAccessor(){Object.defineProperty(core,'get',{configurable:true,get(){getters++;return originalGet.value;}});},
   prototypeAccessor(){Object.defineProperty(proto,'get',{configurable:true,get(){getters++;return originalGet.value;}});},
   prototypeFunction(){Object.defineProperty(proto,'get',{...originalGet,value:async()=>undefined});},
   flag(name,value){Object.defineProperty(proto,'get',{...originalGet,[name]:value});},
   prototype(){Object.setPrototypeOf(core,Object.create(proto));},
   parent(){Object.setPrototypeOf(proto,{});},
   deleteOwn(){delete core.get;},
   restorePrototype(){Object.defineProperty(proto,'get',originalGet);},
  };
 })()`,{ArchiveError});
}
const refusal={code:'BNS_HUMAN_RETENTION_REQUIRED'};
test('original private Core profile accepts its exact get/put and restores reversible descriptor changes',()=>{
 const f=fixture();assert.equal(f.check(),undefined);
 f.ownFunction();assert.throws(()=>f.check(),refusal);f.deleteOwn();assert.equal(f.check(),undefined);
 f.prototypeFunction();assert.throws(()=>f.check(),refusal);f.restorePrototype();assert.equal(f.check(),undefined);
});
test('own and prototype data/accessor changes refuse without executing getters',()=>{
 for(const change of ['ownFunction','ownValue','ownAccessor','prototypeAccessor','prototypeFunction','prototype','parent']){
  const f=fixture();f[change]();assert.throws(()=>f.check(),refusal,change);assert.equal(f.getters(),0,change);
 }
});
test('every descriptor flag mismatch is isolated, including irreversible configurable false',()=>{
 for(const [name,value]of [['writable',false],['enumerable',true],['configurable',false]]){
  // Each fixture has its own class/prototype. Never freeze or mutate the actual
  // imported production prototype, and never pretend configurable is reversible.
  const f=fixture();f.flag(name,value);assert.throws(()=>f.check(),refusal,name);
 }
});
test('ordinary imported Core operations retain public get/put instrumentation outside retention',async()=>{
 const repository=new ArchiveRepository(local(),{indexedDB:new IDBFactory(),name:'synthetic-ordinary-core-profile'});
 const core=new BrowserNativeSyncCore(repository,{datasetId:'synthetic-core-profile',deviceId:'synthetic-core'}),originalGet=core.get.bind(core),originalPut=core.put.bind(core);let reads=0,writes=0;
 core.get=(...args)=>{reads++;return originalGet(...args);};core.put=(...args)=>{writes++;return originalPut(...args);};
 try{
  await core.transaction(true,t=>core.put(t,'profile-ordinary',['one'],{value:'SYNTHETIC ordinary wrapped storage'}),['meta']);
  const row=await core.read('profile-ordinary','one');assert.equal(row.value,'SYNTHETIC ordinary wrapped storage');assert.equal(reads,1);assert.equal(writes,1);
 }finally{await repository.close();}
});
