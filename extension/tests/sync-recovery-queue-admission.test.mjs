import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {queueOriginalIndexedStoreWork} from '../core/indexed-store.js';
import {BrowserNativeSyncCore} from '../core/browser-native-sync/core.js';
import {LocalSyncRecoverySession} from '../core/browser-native-sync/recovery-session.js';
import {createOriginalRecoveryWork,withOriginalRecoveryWork,currentOriginalRecoveryWork,checkOriginalRecoveryWork} from '../core/idb-repository.js';
globalThis.IDBKeyRange=IDBKeyRange;
const immediate=()=>new Promise(r=>setImmediate(r));
const gate=()=>{let release;const promise=new Promise(r=>release=r);return {promise,release};};
async function device(t,{fresh=false}={}){
 const data={},factory=new IDBFactory();let gets=0,sets=0;
 const local={async get(key){gets++;return {[key]:structuredClone(data[key])};},async set(value){sets++;Object.assign(data,structuredClone(value));}};
 const store=new LibraryDocumentsStore(local,{indexedDB:factory});if(!fresh){await store.consent(true);await store.finishFoundation();}
 t.after(()=>store.repository.db?.close());const core=new BrowserNativeSyncCore(store.repository,{datasetId:'SYNTHETIC_queue_admission',deviceId:'SYNTHETIC_queue_device'});
 const transport={async get(){throw Error('SYNTHETIC unexpected object read');},async listCheckpoints(){return {items:[],nextCursor:null};}};
 return {store,core,factory,data,counters:()=>({gets,sets}),session:options=>new LocalSyncRecoverySession(core,{store,transport,...options})};
}
const rows=f=>f.store.repository.transaction(false,async tx=>Object.fromEntries(await Promise.all(f.store.repository.stores.map(async name=>[name,await tx.all(name)]))));
async function blockedQueue(f){const held=gate(),entered=gate();const prior=f.store.run(async()=>{entered.release();await held.promise;});await entered.promise;return {prior,release:held.release};}
async function bounded(promise){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('SYNTHETIC test-only settlement ceiling')),500);})]);}finally{clearTimeout(timer);}}

test('actual idle Thought cleanup runs outside the queued stored-stage recovery ticket, before and after it',async t=>{
 const f=await device(t),repository=f.store.repository,before=await rows(f),held=gate(),entered=gate(),run=f.store.run,transaction=repository.transaction,coreTransaction=f.core.transaction;
 const cleanupTickets=[],storedTickets=[],recoveryTickets=[];
 repository.transaction=function(write,fn,stores){if(currentOriginalRecoveryWork(this))recoveryTickets.push(currentOriginalRecoveryWork(this));if(stores?.includes('organizerJobs'))cleanupTickets.push(currentOriginalRecoveryWork(this));return transaction.call(this,write,fn,stores);};
 f.core.transaction=function(...args){storedTickets.push(currentOriginalRecoveryWork(repository));return coreTransaction.apply(this,args);};
 f.store.run=function(fn){return run.call(this,async()=>{entered.release();await held.promise;return fn();});};
 const first=f.store.processPurgeCleanup();await entered.promise;f.store.run=run;
 const pending=f.session().discover();pending.catch(()=>{});await immediate();const later=f.store.processPurgeCleanup();
 assert.equal(currentOriginalRecoveryWork(repository),null);assert.equal(storedTickets.length,0,'stored read waits for original local work');
 held.release();assert.deepEqual(await first,{processed:0,pending:false});await assert.rejects(pending,{code:'BNS_RECOVERY_REMOTE_MISSING'});assert.deepEqual(await later,{processed:0,pending:false});
 assert.equal(cleanupTickets.length,2);assert.ok(cleanupTickets.every(ticket=>ticket===null),'unrelated actual maintenance never borrows the recovery ticket');
 assert.equal(storedTickets.length,1);assert.ok(storedTickets[0]);assert.equal(recoveryTickets.length,2);assert.ok(recoveryTickets.every(ticket=>ticket===storedTickets[0]),'both original stored observations share the same ticket');assert.equal(currentOriginalRecoveryWork(repository),null);assert.deepEqual(await rows(f),before);
});

test('queue admission ignores substituted public run and introduces no local-control refresh or writes',async t=>{
 const f=await device(t),before=await rows(f),localBefore=structuredClone(f.data),counts=f.counters();let called=0;
 f.store.run=()=>{called++;throw Error('SYNTHETIC forged public run');};
 await assert.rejects(f.session().discover(),{code:'BNS_RECOVERY_REMOTE_MISSING'});assert.equal(called,0);assert.deepEqual(f.counters(),counts);assert.deepEqual(f.data,localBefore);assert.deepEqual(await rows(f),before);
});

test('fresh genuine Store and fake or foreign Store bindings cannot initialize through queue admission',async t=>{
 const fresh=await device(t,{fresh:true}),before=await fresh.factory.databases(),counts=fresh.counters(),database=fresh.store.repository.db;
 await assert.rejects(fresh.session().discover(),{code:'BNS_RECOVERY_BINDING'});assert.equal(fresh.store.repository.db,database);assert.deepEqual(await fresh.factory.databases(),before);assert.deepEqual(fresh.counters(),counts);assert.deepEqual(fresh.data,{});
 const a=await device(t),b=await device(t);let called=0;
 for(const [store,repository]of [[{repository:a.store.repository,loaded:true},a.store.repository],[a.store,b.store.repository]])assert.throws(()=>queueOriginalIndexedStoreWork(store,repository,()=>{called++;}),{code:'BNS_RECOVERY_BINDING'});
 assert.equal(called,0);
});

for(const method of ['discover','stage'])for(const action of ['pause','close','deadline'])test(method+' '+action+' settles while queued and late admission performs no native read',async t=>{
 const f=await device(t),before=await rows(f),blocked=await blockedQueue(f),session=f.session({discoveryTimeoutMs:30,readTimeoutMs:30}),original=f.core.transaction;let reads=0;
 f.core.transaction=function(...args){reads++;return original.apply(this,args);};
 const pending=method==='discover'?session.discover():session.stage({kind:'checkpoint-manifest',id:'a'.repeat(64),digest:'a'.repeat(64),encodedBytes:1,decodedBytes:1});pending.catch(()=>{});await immediate();
 assert.equal(currentOriginalRecoveryWork(f.store.repository),null);if(action!=='deadline')session[action]();
 await assert.rejects(bounded(pending),{code:action==='deadline'?(method==='discover'?'BNS_RECOVERY_DISCOVERY_LIMIT':'BNS_RECOVERY_READ_LIMIT'):'BNS_RECOVERY_INTERRUPTED'});assert.equal(session.snapshot().busy,false);assert.equal(reads,0);
 // Resume before releasing the old queued callback: its captured serial still
 // refuses admission rather than borrowing the newly resumed session state.
 if(action==='pause')session.resume();blocked.release();await blocked.prior;await f.store.tail;await immediate();assert.equal(reads,0);assert.equal(currentOriginalRecoveryWork(f.store.repository),null);assert.deepEqual(await rows(f),before);
 if(action!=='close'){await assert.rejects(session.discover(),{code:'BNS_RECOVERY_REMOTE_MISSING'});assert.equal(reads,1);}
});

test('physical database replacement while waiting refuses the original queued observation',async t=>{
 const f=await device(t),blocked=await blockedQueue(f),session=f.session(),database=f.store.repository.db;let called=0;const transaction=f.core.transaction;
 f.core.transaction=function(...args){called++;return transaction.apply(this,args);};const pending=session.discover();pending.catch(()=>{});await immediate();f.store.repository.db=null;blocked.release();
 try{await blocked.prior;await assert.rejects(pending,{code:'BNS_RECOVERY_BINDING'});assert.equal(called,0);}finally{f.store.repository.db=database;}
});

test('public tail alias cannot admit queue-only recovery during an active genuine local execution',async t=>{
 const f=await device(t),blocked=await blockedQueue(f);f.store.tail=Promise.resolve();let called=0;
 await assert.rejects(queueOriginalIndexedStoreWork(f.store,f.store.repository,()=>{called++;}),{code:'BNS_RECOVERY_BINDING'});assert.equal(called,0);blocked.release();await blocked.prior;
});

test('same-ticket overlapping original repository work still fails the unchanged pending guard',async t=>{
 const f=await device(t),repository=f.store.repository,before=await rows(f),ticket=createOriginalRecoveryWork(repository),open=repository.open,held=gate(),entered=gate();let first=true,callbacks=0;
 repository.open=async function(...args){if(first){first=false;entered.release();await held.promise;}return open.apply(this,args);};
 let one,two;const pending=withOriginalRecoveryWork(repository,ticket,async()=>{
  one=repository.transaction(false,tx=>{callbacks++;return tx.get('meta','gate');},['meta']);one.catch(()=>{});await entered.promise;
  two=repository.transaction(false,tx=>{callbacks++;return tx.get('meta','gate');},['meta']);two.catch(()=>{});await two;
 });pending.catch(()=>{});await entered.promise;await immediate();assert.equal(currentOriginalRecoveryWork(repository),ticket);held.release();await assert.rejects(pending,{code:'BNS_GROUP_RESOURCE_LIMIT'});await assert.rejects(one,{code:'BNS_GROUP_RESOURCE_LIMIT'});await assert.rejects(two,{code:'BNS_GROUP_RESOURCE_LIMIT'});
 repository.open=open;assert.equal(callbacks,0);assert.throws(()=>checkOriginalRecoveryWork(repository,ticket),{code:'BNS_GROUP_RESOURCE_LIMIT'});assert.equal(currentOriginalRecoveryWork(repository),null);assert.deepEqual(await rows(f),before);
});

for(const behavior of ['forged-result','drop-callback','replay-callback'])test('non-Promise public tail '+behavior+' cannot provide stored data or run an observation',async t=>{
 const f=await device(t);let methods=0,actions=0;
 f.store.tail={then(callback){methods++;if(behavior==='replay-callback'){callback();callback();}return Promise.resolve({negative:true,row:{phase:'validated'}});}};
 await assert.rejects(queueOriginalIndexedStoreWork(f.store,f.store.repository,async()=>{actions++;return {negative:false,row:null};}),{code:'BNS_RECOVERY_BINDING'});assert.equal(methods,0);assert.equal(actions,0);
 await f.store.tail;await assert.rejects(f.session().discover(),{code:'BNS_RECOVERY_REMOTE_MISSING'});
});

test('a native tail with substituted then cannot drop or replay genuine queue admission',async t=>{
 const f=await device(t),blocked=await blockedQueue(f),tail=f.store.tail;let methods=0,actions=0;
 tail.then=callback=>{methods++;callback();callback();return Promise.resolve('SYNTHETIC forged');};
 const pending=queueOriginalIndexedStoreWork(f.store,f.store.repository,async()=>{actions++;return 'SYNTHETIC actual';});await immediate();assert.equal(methods,0);assert.equal(actions,0);
 blocked.release();await blocked.prior;assert.equal(await pending,'SYNTHETIC actual');assert.equal(methods,0);assert.equal(actions,1);
});

test('native Promise species return cannot counterfeit the original queued completion',async t=>{
 const f=await device(t),blocked=await blockedQueue(f);let actions=0;
 f.store.tail.constructor={ [Symbol.species]:function(executor){executor(()=>{},()=>{});return {then:resolve=>resolve('SYNTHETIC forged'),catch:()=>Promise.resolve('SYNTHETIC forged')};} };
 const pending=queueOriginalIndexedStoreWork(f.store,f.store.repository,async()=>{actions++;return 'SYNTHETIC actual';});await immediate();assert.equal(actions,0);blocked.release();await blocked.prior;
 assert.equal(await pending,'SYNTHETIC actual');assert.equal(actions,1);await f.store.tail;
});
