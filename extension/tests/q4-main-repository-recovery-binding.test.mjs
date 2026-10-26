import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange,IDBObjectStore} from './vendor/fake-indexeddb/build/esm/index.js';
globalThis.IDBKeyRange=IDBKeyRange;
const {
 ArchiveRepository,createOriginalRecoveryWork,chargeOriginalRecoveryWork,
 checkOriginalRecoveryWork,currentOriginalRecoveryWork,withOriginalRecoveryWork,
 remainingOriginalRecoveryWork,tightenOriginalRecoveryWork,finishOriginalRecoveryWork,
 registerRepositoryFinalReadFence,awaitRepositoryTransactionSettled,
 requireRepositoryTransactionSucceeded
}=await import('../core/idb-repository.js');
const limit=error=>error?.code==='BNS_GROUP_RESOURCE_LIMIT';
const failed=error=>error?.code==='STORAGE_FAILED';
const gate=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function repository(t,name,factory=new IDBFactory()){
 const r=new ArchiveRepository({async get(){return {};},async set(){}},{indexedDB:factory,name:'SYNTHETIC-Q4-'+name});
 t.after(()=>r.db?.close());return r;
}
async function seed(r){await r.transaction(true,async tx=>{await tx.put('meta',{id:'SYNTHETIC_A',value:1});await tx.put('meta',{id:'SYNTHETIC_B',value:2});},['meta']);}

// All six are NEW exact-main-binding controls. Fake IndexedDB exercises original
// repository functions; it is not browser/native/source-provider certification.
test('Q4 main ordinary transactions stay unmetered; no-index Source count honors the given key',async t=>{
 const r=repository(t,'ordinary');await seed(r);
 await r.transaction(true,async tx=>{await tx.put('records',{id:'SYNTHETIC_source_A',value:{originalText:'synthetic A'}});await tx.put('records',{id:'SYNTHETIC_source_B',value:{originalText:'synthetic B'}});},['records']);
 assert.equal(currentOriginalRecoveryWork(r),null);
 const ordinary=await r.transaction(false,async tx=>({all:await tx.count('records'),one:await tx.count('records',null,IDBKeyRange.only('SYNTHETIC_source_A')),missing:await tx.count('records',null,IDBKeyRange.only('SYNTHETIC_missing')),rows:await tx.all('records')}),['records']);
 assert.equal(ordinary.all,2);assert.equal(ordinary.one,1);assert.equal(ordinary.missing,0);assert.equal(ordinary.rows.length,2);
 const ticket=createOriginalRecoveryWork(r);
 await withOriginalRecoveryWork(r,ticket,()=>r.transaction(false,async tx=>{assert.equal(await tx.count('records'),2);assert.equal(await tx.count('records',null,IDBKeyRange.only('SYNTHETIC_source_B')),1);},['records']));
 finishOriginalRecoveryWork(r,ticket);
 await r.transaction(true,tx=>tx.clear('records'),['records']);
 assert.equal(await r.transaction(false,tx=>tx.count('records'),['records']),0);
});

test('Q4 main ticket keeps exact repository and original time/ref ledger across transaction windows',async t=>{
 const r=repository(t,'binding'),other=repository(t,'other');await seed(r);
 const ticket=createOriginalRecoveryWork(r,{ms:30000});
 assert.throws(()=>checkOriginalRecoveryWork(other,ticket),limit);
 assert.throws(()=>checkOriginalRecoveryWork(r,Object.freeze({...ticket})),limit);
 const first=remainingOriginalRecoveryWork(r,ticket);tightenOriginalRecoveryWork(r,ticket,15000);
 const shortened=remainingOriginalRecoveryWork(r,ticket);tightenOriginalRecoveryWork(r,ticket,25000);
 assert.ok(shortened<first);assert.ok(remainingOriginalRecoveryWork(r,ticket)<=shortened);
 await withOriginalRecoveryWork(r,ticket,()=>r.transaction(false,tx=>tx.get('meta','SYNTHETIC_A'),['meta']));
 // One fixed prepayment, not a capacity sweep. The actual native get already
 // consumed one reference; no later grant/action/window resets that debit.
 chargeOriginalRecoveryWork(r,ticket,0,4095);
 let entered=false;await assert.rejects(withOriginalRecoveryWork(r,ticket,()=>r.transaction(false,()=>{entered=true;},['meta'])),limit);
 assert.equal(entered,false);assert.throws(()=>checkOriginalRecoveryWork(r,ticket),limit);
 assert.equal(currentOriginalRecoveryWork(r),null);
});

test('Q4 main accepted native result is physically traversed before currentness refusal',async t=>{
 const r=repository(t,'result-before-refusal');await seed(r);let live=true,intercepted=false,scope;const events=[];
 const ticket=createOriginalRecoveryWork(r,{isCurrent:()=>{if(!live)events.push('revocation-refusal-check');return live;}});
 const original=IDBObjectStore.prototype.get;
 IDBObjectStore.prototype.get=function(...args){
  const request=Reflect.apply(original,this,args);
  if(this.transaction.db===r.db&&args[0]==='SYNTHETIC_A')request.addEventListener('success',()=>{
   const actual=request.result;intercepted=true;events.push('actual-request-result');live=false;
   // Transparent observation of the genuine returned synthetic row. No fake
   // meter/export, replacement payload, success event or transaction is used.
   request.result=new Proxy(actual,{ownKeys(target){events.push('physical-result-traversal');return Reflect.ownKeys(target);}});
  },{once:true});
  return request;
 };t.after(()=>{IDBObjectStore.prototype.get=original;});
 await assert.rejects(withOriginalRecoveryWork(r,ticket,()=>r.transaction(false,tx=>{scope=tx;return tx.get('meta','SYNTHETIC_A');},['meta'])),limit);
 IDBObjectStore.prototype.get=original;
 await awaitRepositoryTransactionSettled(r,scope);
 assert.equal(intercepted,true);assert.ok(events.indexOf('physical-result-traversal')>events.indexOf('actual-request-result'));
 assert.ok(events.indexOf('revocation-refusal-check')>events.indexOf('physical-result-traversal'));
 assert.throws(()=>requireRepositoryTransactionSucceeded(r,scope),error=>error.code==='STALE_BASE');
 assert.equal(currentOriginalRecoveryWork(r),null);
});

test('Q4 main work window drains pending acquisition and actual abort before releasing admission',async t=>{
 const r=repository(t,'pending');await seed(r);const acquired=gate(),release=gate(),originalOpen=r.open;let pending,windowSettled=false,entered=false;
 r.open=async function(){acquired.resolve();await release.promise;return Reflect.apply(originalOpen,this,[]);};
 const ticket=createOriginalRecoveryWork(r),sentinel=Object.assign(new Error('SYNTHETIC logical caller cancellation'),{code:'SYNTHETIC_CANCEL'});
 const window=withOriginalRecoveryWork(r,ticket,async()=>{pending=r.transaction(false,()=>{entered=true;},['meta']);pending.catch(()=>{});await acquired.promise;throw sentinel;});
 window.then(()=>{windowSettled=true;},()=>{windowSettled=true;});
 await acquired.promise;await new Promise(setImmediate);
 assert.equal(windowSettled,false);assert.equal(currentOriginalRecoveryWork(r),ticket);
 release.resolve();await assert.rejects(window,error=>error===sentinel);await assert.rejects(pending,limit);r.open=originalOpen;
 assert.equal(entered,false);assert.equal(currentOriginalRecoveryWork(r),null);
 const second=createOriginalRecoveryWork(r),events=[];let scope;
 await assert.rejects(withOriginalRecoveryWork(r,second,()=>r.transaction(true,async tx=>{
  scope=tx;tx.tx.addEventListener('abort',()=>events.push('actual-abort'));
  try{await tx.put('meta',{id:'SYNTHETIC_aborted',value:3});tx.tx.abort();throw sentinel;}finally{events.push('callback-unwind');}
 },['meta'])),failed);
 events.push('window-rejected');await awaitRepositoryTransactionSettled(r,scope);
 assert.ok(events.includes('actual-abort'));assert.ok(events.indexOf('actual-abort')<events.indexOf('window-rejected'));
 assert.equal(currentOriginalRecoveryWork(r),null);
 assert.equal(await r.transaction(false,tx=>tx.get('meta','SYNTHETIC_aborted'),['meta']),undefined);
});

test('Q4 main existing-only cold owner cannot create or migrate and binds the real connection',async t=>{
 const factory=new IDBFactory(),missing=repository(t,'missing',factory);
 await assert.rejects(missing.openExisting(),failed);assert.deepEqual(await factory.databases(),[]);
 await assert.rejects(missing.open(),failed);assert.deepEqual(await factory.databases(),[]);
 const original=repository(t,'existing',factory);await seed(original);original.db.close();original.db=null;
 const cold=repository(t,'existing',factory);let calledPublicOpen=0;cold.open=()=>{calledPublicOpen++;throw new Error('public open must not run');};
 await cold.openExisting();assert.equal(calledPublicOpen,0);assert.equal(cold.db.name,cold.name);delete cold.open;
 const ticket=createOriginalRecoveryWork(cold);await withOriginalRecoveryWork(cold,ticket,()=>cold.transaction(false,async tx=>{assert.equal((await tx.get('meta','SYNTHETIC_A')).value,1);},['meta']));finishOriginalRecoveryWork(cold,ticket);
 const olderName='SYNTHETIC-Q4-older';await new Promise((resolve,reject)=>{const request=factory.open(olderName,1);request.onupgradeneeded=()=>request.result.createObjectStore('meta',{keyPath:'id'});request.onsuccess=()=>{request.result.close();resolve();};request.onerror=()=>reject(request.error);});
 const older=repository(t,'older',factory);await assert.rejects(older.openExisting(),failed);assert.equal((await factory.databases()).find(row=>row.name===olderName).version,1);
 await assert.rejects(ArchiveRepository.prototype.openExisting.call({factory,name:cold.name}),TypeError);
});

test('Q4 main original terminal get/count and successful commit consume the same ticket without refill',async t=>{
 const r=repository(t,'terminal');await seed(r);const ticket=createOriginalRecoveryWork(r);chargeOriginalRecoveryWork(r,ticket,0,4093);const seen=[];let scope;
 const originalGet=IDBObjectStore.prototype.get,originalCount=IDBObjectStore.prototype.count;
 IDBObjectStore.prototype.get=function(...args){if(this.transaction.db===r.db)seen.push('get');return Reflect.apply(originalGet,this,args);};
 IDBObjectStore.prototype.count=function(...args){if(this.transaction.db===r.db)seen.push('count');return Reflect.apply(originalCount,this,args);};
 t.after(()=>{IDBObjectStore.prototype.get=originalGet;IDBObjectStore.prototype.count=originalCount;});
 await withOriginalRecoveryWork(r,ticket,()=>r.transaction(true,async tx=>{
  scope=tx;await tx.put('meta',{id:'SYNTHETIC_terminal',value:4});
  registerRepositoryFinalReadFence(r,tx,{isCurrent:()=>true,plan:function*(){
   assert.equal((yield {method:'get',table:'meta',key:'SYNTHETIC_terminal'}).value,4);
   assert.equal(yield {method:'count',table:'meta',key:IDBKeyRange.only('SYNTHETIC_terminal')},1);return true;
  }});
 },['meta']));
 IDBObjectStore.prototype.get=originalGet;IDBObjectStore.prototype.count=originalCount;
 assert.deepEqual(seen,['get','count']);assert.equal(requireRepositoryTransactionSucceeded(r,scope),true);
 let entered=false;await assert.rejects(withOriginalRecoveryWork(r,ticket,()=>r.transaction(false,()=>{entered=true;},['meta'])),limit);
 assert.equal(entered,false);assert.equal((await r.transaction(false,tx=>tx.get('meta','SYNTHETIC_terminal'),['meta'])).value,4);
});
