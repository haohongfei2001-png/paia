import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange,IDBObjectStore} from './vendor/fake-indexeddb/build/esm/index.js';
import {local} from './harness/thought-m1.mjs';
import {IndexedArchiveStore,withOriginalRecoveryStoreAdmission} from '../core/indexed-store.js';
import {createOriginalRecoveryWork,withOriginalRecoveryWork,currentOriginalRecoveryWork,remainingOriginalRecoveryWork,checkOriginalRecoveryWork,readOriginalRecoveryTransactionWork,chargeOriginalRecoveryWork} from '../core/idb-repository.js';
globalThis.IDBKeyRange=IDBKeyRange;
const gate=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};

test('Q4 original recovery window cannot adopt an unrelated queued Store prelude',async t=>{
 const s=new IndexedArchiveStore(local(),{indexedDB:new IDBFactory(),name:'SYNTHETIC-Q4-execution-binding'}),r=s.repository;
 t.after(()=>r.close());await s.consent(true);await s.run(()=>r.transaction(true,tx=>tx.put('meta',{id:'SYNTHETIC-owner-row',value:1}),['meta']));
 const ownerDone=gate(),finishOwner=gate(),pollAcquired=gate(),releasePoll=gate(),returning=gate(),events=[],requests=[];
 const originalOpen=r.open,originalGet=IDBObjectStore.prototype.get;let pollTicket=null,ownerTicket=null,pollWindow=null,directTicket=null,ownerReferences=0,held=false;
 t.after(()=>{releasePoll.resolve();r.open=originalOpen;});
 t.mock.method(IDBObjectStore.prototype,'get',function(key){if(this.transaction.db===r.db)requests.push({table:this.name,key});return originalGet.call(this,key);});
 const ticket=createOriginalRecoveryWork(r),first=remainingOriginalRecoveryWork(r,ticket);
 const work=withOriginalRecoveryWork(r,ticket,async()=>{
  await withOriginalRecoveryStoreAdmission(s,ticket,()=>s.run(()=>r.transaction(false,async tx=>{ownerTicket=readOriginalRecoveryTransactionWork(r,tx);assert.equal((await tx.get('meta','SYNTHETIC-owner-row')).value,1);},['meta'])));
  events.push('owner-queue-task-complete');ownerDone.resolve();await finishOwner.promise;
  // A direct original maintenance read stays on its explicit same ticket even
  // while the independent Store prelude is awaiting acquisition.
  await r.transaction(false,async tx=>{directTicket=readOriginalRecoveryTransactionWork(r,tx);assert.equal((await tx.get('meta','SYNTHETIC-owner-row')).value,1);},['meta'],ticket);ownerReferences=requests.length;events.push('owner-direct-read-complete');events.push('owner-action-returning');returning.resolve();return 'owner-done';
 });
 work.catch(()=>{});await Promise.race([ownerDone.promise,work.then(()=>assert.fail('owner returned before boundary'))]);
 r.open=async function(){if(!held){held=true;events.push('independent-prelude-acquisition');pollWindow=currentOriginalRecoveryWork(r);pollAcquired.resolve();await releasePoll.promise;}return originalOpen.call(this);};
 const poll=s.run(()=>r.transaction(false,tx=>{pollTicket=readOriginalRecoveryTransactionWork(r,tx);return tx.get('meta','SYNTHETIC-owner-row');},['meta']));poll.catch(()=>{});
 try{await Promise.race([pollAcquired.promise,poll.then(()=>assert.fail('poll missed acquisition boundary'))]);
  let forgedEntered=false;assert.throws(()=>withOriginalRecoveryStoreAdmission(s,Object.freeze({...ticket}),()=>{forgedEntered=true;}),e=>e.code==='BNS_GROUP_RESOURCE_LIMIT');
  await assert.rejects(r.transaction(false,()=>{forgedEntered=true;},['meta'],null),e=>e.code==='BNS_GROUP_RESOURCE_LIMIT');assert.equal(forgedEntered,false);
  finishOwner.resolve();await Promise.race([returning.promise,work.then(()=>assert.fail('owner missed return boundary'))]);}finally{finishOwner.resolve();releasePoll.resolve();}
 const outcomes=await Promise.allSettled([work,poll]);r.open=originalOpen;
 t.diagnostic(JSON.stringify({events,ownerHasOriginalTicket:ownerTicket===ticket,independentWindowVisible:pollWindow===ticket,independentScopeInheritedTicket:pollTicket===ticket,directHasOriginalTicket:directTicket===ticket,ownerReferences,requests,outcomes:outcomes.map(x=>({status:x.status,...(x.status==='rejected'?{error:{code:x.reason.code,message:x.reason.message,stack:x.reason.stack}}:{value:x.value})})),firstDeadlineNotRenewed:outcomes[0].status==='fulfilled'?remainingOriginalRecoveryWork(r,ticket)<=first:null}));
 assert.equal(ownerTicket,ticket);assert.equal(directTicket,ticket);assert.equal(pollTicket,null,'an independent Store execution must not inherit the maintenance ticket');
 assert.deepEqual(outcomes.map(x=>x.status),['fulfilled','fulfilled']);assert.equal(outcomes[0].value,'owner-done');assert.equal(outcomes[1].value.value,1);checkOriginalRecoveryWork(r,ticket);assert.ok(remainingOriginalRecoveryWork(r,ticket)<=first);
 // Fixed arithmetic, not a capacity sweep: both original preludes (10 gets),
 // the owned body read and the overlapping direct read must all have debited.
 assert.equal(ownerReferences,12);chargeOriginalRecoveryWork(r,ticket,0,4096-ownerReferences);assert.throws(()=>chargeOriginalRecoveryWork(r,ticket,0,1),e=>e.code==='BNS_GROUP_RESOURCE_LIMIT');assert.equal(currentOriginalRecoveryWork(r),null);
});
