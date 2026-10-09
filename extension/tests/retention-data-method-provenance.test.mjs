// Fixed original-method profile contracts use ordinary Node IndexedDB only.
// They cannot establish a trusted native commit or positive retention result.
import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from './vendor/fake-indexeddb/build/esm/index.js';
import {local} from './harness/thought-m1.mjs';
import {ArchiveRepository,requireRepositoryTransactionScope,requireRepositoryTransactionDataMethods as requireMethods,requireRepositoryTransactionCommitted} from '../core/idb-repository.js';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
const methods=['get','put','count','rangePage','primaryRangePage','delete'];
const repository=()=>new ArchiveRepository(local(),{indexedDB:new IDBFactory(),name:'synthetic-data-method-profile'});
const snapshot=repo=>repo.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async name=>[name,await t.all(name)]))));
const code={code:'BNS_HUMAN_RETENTION_REQUIRED'};

test('original profile is a fixed refusal check, never native commit authority',async()=>{
 const repo=repository();let old;
 await repo.transaction(true,async t=>{old=t;assert.equal(requireRepositoryTransactionScope(repo,t).nativeTransaction,false);assert.equal(requireMethods(repo,t),undefined);await t.put('meta',{id:'synthetic-profile-ordinary',value:true});assert.equal((await t.get('meta','synthetic-profile-ordinary')).value,true);assert.equal(requireMethods(repo,t),undefined);});
 assert.throws(()=>requireMethods(repo,old),code);assert.throws(()=>requireRepositoryTransactionCommitted(repo,old),code);
});

for(const method of methods)for(const accessor of [false,true])test('own '+method+' '+(accessor?'accessor':'function')+' refuses without invocation and rolls back all stores',async()=>{
 const repo=repository(),before=await snapshot(repo);let called=0;
 await assert.rejects(repo.transaction(true,async t=>{
  await t.put('meta',{id:'synthetic-before-refusal',value:true});
  Object.defineProperty(t,method,accessor?{configurable:true,get(){called++;throw Error('must not invoke an untrusted accessor');}}:{configurable:true,writable:true,value(){called++;throw Error('must not invoke a substitute');}});
  requireMethods(repo,t);
 }),code);
 assert.equal(called,0);assert.deepEqual(await snapshot(repo),before);
});

test('module-init original prototype values and flags cannot be recaptured at first use',async()=>{
 const repo=repository();
 await repo.transaction(false,async t=>{
  const prototype=Object.getPrototypeOf(t);
  for(const name of methods){const original=Object.getOwnPropertyDescriptor(prototype,name);
   for(const changed of [{value:async()=>null},{writable:!original.writable},{enumerable:!original.enumerable}]){
    try{Object.defineProperty(prototype,name,{...original,...changed});assert.throws(()=>requireMethods(repo,t),code);}finally{Object.defineProperty(prototype,name,original);}
    assert.equal(requireMethods(repo,t),undefined);
   }
  }
  const parent=Object.getPrototypeOf(prototype);try{Object.setPrototypeOf(prototype,{});assert.throws(()=>requireMethods(repo,t),code);}finally{Object.setPrototypeOf(prototype,parent);}
  assert.equal(requireMethods(repo,t),undefined);
 });
});

test('private original scope rejects aliases, proxies, foreign owner, changed tx and changed scope prototype',async()=>{
 const repo=repository(),foreign=repository();
 await repo.transaction(false,async t=>{
  for(const wrong of [Object.create(t),new Proxy(t,{}),{tx:t.tx}])assert.throws(()=>requireMethods(repo,wrong),code);
  assert.throws(()=>requireMethods(foreign,t),code);
  const tx=t.tx;try{t.tx=new Proxy(tx,{});assert.throws(()=>requireMethods(repo,t),code);}finally{t.tx=tx;}
  const prototype=Object.getPrototypeOf(t);try{Object.setPrototypeOf(t,Object.create(prototype));assert.throws(()=>requireMethods(repo,t),code);}finally{Object.setPrototypeOf(t,prototype);}
  Object.defineProperty(t,'unrelated',{get(){throw Error('must not enumerate or invoke unrelated scope data');}});
  assert.equal(requireMethods(repo,t),undefined);
 });
});

test('persistent substitution across an await is refused by the next explicit boundary',async()=>{
 const repo=repository(),before=await snapshot(repo);
 await assert.rejects(repo.transaction(true,async t=>{
  requireMethods(repo,t);await t.put('meta',{id:'synthetic-held-boundary',value:true});
  await Promise.resolve().then(()=>{t.get=async()=>({forged:true});});requireMethods(repo,t);
 }),code);assert.deepEqual(await snapshot(repo),before);
});

test('ordinary Core methods still accept original supported non-owner scopes and post-settlement scope reads',async()=>{
 const repo=repository(),core=new BrowserNativeSyncCore(repo,{datasetId:'synthetic-profile',deviceId:'synthetic-local',namespace:'synthetic-namespace'}),calls=[];
 const custom={get:async(...args)=>{calls.push(['get',...args]);return {value:true};},put:async(...args)=>{calls.push(['put',...args]);return 'ordinary-key';}};
 assert.deepEqual(await core.get(custom,'generation'),{value:true});assert.equal(await core.put(custom,'generation',[],{value:2}),'ordinary-key');assert.equal(calls.length,2);
 let old;await repo.transaction(false,t=>{old=t;});old.get=async()=>({ordinary:true});assert.deepEqual(await core.get(old,'generation'),{ordinary:true});
});

test('ordinary method mutation remains supported and original backup finalizer fault retains STORAGE_FAILED',async()=>{
 const repo=repository();await repo.transaction(true,async t=>{const get=t.get.bind(t),put=t.put.bind(t);t.get=(...args)=>get(...args);t.put=(...args)=>put(...args);await t.put('meta',{id:'synthetic-supported-mutation',value:true});assert.equal((await t.get('meta','synthetic-supported-mutation')).value,true);});
 const before=await snapshot(repo);await assert.rejects(repo.transaction(true,async t=>{await t.put('meta',{id:'synthetic-finalization-rollback',value:true});t.backupChanged=true;const get=t.get.bind(t);t.get=(store,id)=>{if(store==='meta'&&id==='backup-data-generation')throw Error('synthetic original backup-finalization fault');return get(store,id);};}),{code:'STORAGE_FAILED'});
 assert.deepEqual(await snapshot(repo),before);
});
