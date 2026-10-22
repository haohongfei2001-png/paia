import test from 'node:test';
import assert from 'node:assert/strict';
import {observeANS07Seed,observeANS07Consent} from './harness/ans07-seed-evidence.mjs';

test('seed evidence retains earlier committed writes and the exact later pre-dispatch failure without retry',async()=>{
 const failure=Object.assign(Error('original refusal'),{code:'CONTROL_PUBLICATION_CHANGED'});let calls=0,callbacks=0;
 const store={repository:{transaction:async(_write,callback)=>callback()},run:async fn=>{if(++calls===2)throw failure;return fn();}};
 const original=store.run,transaction=store.repository.transaction,trace={phase:'topic-0'},stop=observeANS07Seed(store,trace);
 await store.run(()=>{callbacks++;return store.repository.transaction(true,()=>{});});
 trace.phase='topic-1';await assert.rejects(store.run(()=>callbacks++),error=>error===failure);
 assert.equal(calls,2);assert.equal(callbacks,1);assert.equal(trace.committedWrites,1);
 assert.deepEqual(trace.runs,[{phase:'topic-0',number:1,entered:true},{phase:'topic-1',number:2,entered:false,error:'CONTROL_PUBLICATION_CHANGED'}]);
 stop();assert.equal(store.run,original);assert.equal(store.repository.transaction,transaction);
});

test('seed evidence preserves an entered failure and does not count aborted writes as committed',async()=>{
 const failure=Error('original transaction failure');let calls=0;
 const store={repository:{transaction:async()=>{throw failure;}},run:async fn=>{calls++;return fn();}},trace={phase:'placement-0'},stop=observeANS07Seed(store,trace);
 await assert.rejects(store.run(()=>store.repository.transaction(true,()=>{})),error=>error===failure);
 assert.equal(calls,1);assert.equal(trace.committedWrites,0);assert.equal(trace.runs[0].entered,true);stop();
});

test('consent completion waits for the original ACK, forwards once and restores its observer',async()=>{
 let resolve,calls=0;const result=new Promise(r=>resolve=r),runtime={sendMessage(message){calls++;assert.deepEqual(message,{type:'CONSENT',accepted:true});return result;}},send=runtime.sendMessage,trace={},observer=observeANS07Consent(runtime,trace);
 const forwarded=runtime.sendMessage({type:'CONSENT',accepted:true});assert.equal(forwarded,result);
 let complete=false;const wait=observer.complete().then(()=>{complete=true;});await Promise.resolve();assert.equal(complete,false);assert.equal(calls,1);
 resolve({ok:true,data:{enabled:true}});await wait;assert.deepEqual(trace.consent,{dispatched:1,settled:1,acknowledged:1});observer.stop();assert.equal(runtime.sendMessage,send);
});

test('missing, duplicate, unconfirmed and rejected consent never admit seed or retry the request',async()=>{
 for(const kind of ['missing','duplicate','unconfirmed','rejected']){
  const failure=Error('original RPC rejection');let calls=0;const runtime={sendMessage(){calls++;return kind==='rejected'?Promise.reject(failure):Promise.resolve({ok:kind!=='unconfirmed',data:{enabled:true}});}},observer=observeANS07Consent(runtime,{});
  if(kind!=='missing')runtime.sendMessage({type:'CONSENT'});if(kind==='duplicate')runtime.sendMessage({type:'CONSENT'});
  await assert.rejects(observer.complete(),error=>kind==='rejected'?error===failure:/ANS07_CONSENT_/.test(error.message));
  assert.equal(calls,kind==='missing'?0:kind==='duplicate'?2:1);observer.stop();
 }
});
