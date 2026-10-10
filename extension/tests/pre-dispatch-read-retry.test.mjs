import test from 'node:test';
import assert from 'node:assert/strict';
import {runWithPreDispatchReadRetry} from './harness/pre-dispatch-read-retry.mjs';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {CONTROL_PUBLICATION_REVISION} from '../core/local-control-publication.js';

test('pre-dispatch reader returns the original first result without a second attempt',async()=>{
 let runs=0,calls=0;const result={value:true};
 assert.equal(await runWithPreDispatchReadRetry(fn=>{runs++;return fn();},()=>{calls++;return result;}),result);assert.equal(runs,1);assert.equal(calls,1);
});
test('one exact pre-dispatch publication change restarts only the original reader',async()=>{
 let runs=0,calls=0;const conflict=Object.assign(Error('synthetic changed preflight'),{code:'CONTROL_PUBLICATION_CHANGED'});
 assert.equal(await runWithPreDispatchReadRetry(fn=>{if(++runs===1)throw conflict;return fn();},()=>{calls++;return 'current';}),'current');assert.equal(runs,2);assert.equal(calls,1);
});
test('a second pre-dispatch conflict is thrown unchanged without a third attempt',async()=>{
 let runs=0,calls=0;const first=Object.assign(Error('first'),{code:'CONTROL_PUBLICATION_CHANGED'}),second=Object.assign(Error('second'),{code:'CONTROL_PUBLICATION_CHANGED'});
 await assert.rejects(runWithPreDispatchReadRetry(()=>{throw ++runs===1?first:second;},()=>{calls++;}),e=>e===second);assert.equal(runs,2);assert.equal(calls,0);
});
for(const asynchronous of [false,true])test('an '+(asynchronous?'asynchronous':'synchronous')+' entered callback conflict is never retried',async()=>{
 let runs=0,calls=0;const error=Object.assign(Error('entered callback'),{code:'CONTROL_PUBLICATION_CHANGED'});
 await assert.rejects(runWithPreDispatchReadRetry(fn=>{runs++;return fn();},()=>{calls++;if(asynchronous)return Promise.reject(error);throw error;}),e=>e===error);assert.equal(runs,1);assert.equal(calls,1);
});
for(const code of ['CONTROL_PUBLICATION_PENDING','BNS_CONSUMER_PUBLICATION_PENDING','STORAGE_FAILED'])test(code+' never retries before callback entry',async()=>{
 let runs=0,calls=0;const error=Object.assign(Error(code),{code});await assert.rejects(runWithPreDispatchReadRetry(()=>{runs++;throw error;},()=>{calls++;}),e=>e===error);assert.equal(runs,1);assert.equal(calls,0);
});
test('actual initialized independent reader retries a genuine same-DB writer before entry and reads the settled original control',async()=>{
 const f=await completeFixture(),reader=new f.s.constructor(f.storage,{indexedDB:f.indexedDB});await reader.finishFoundation();const before=await rows(f.s,'records'),original=reader.repository.transaction.bind(reader.repository);let injected=false,entered=0,fences=0;
 reader.repository.transaction=async(write,fn,stores)=>{let fence=false;const result=await original(write,async t=>{const get=t.get.bind(t);t.get=(name,key)=>{if(key===CONTROL_PUBLICATION_REVISION){fence=true;fences++;}return get(name,key);};return fn(t);},stores);if(fence&&!injected){injected=true;await f.s.updatePreferences({appearance:'dark'});}return result;};
 try{const value=await runWithPreDispatchReadRetry(reader.run.bind(reader),()=>{entered++;return reader.repository.transaction(false,t=>reader.control(t),['meta']);});assert.equal(value.preferences.appearance,'dark');assert.equal(injected,true);assert.equal(entered,1);assert.equal(fences,4);assert.deepEqual(await rows(f.s,'records'),before);assert.equal(f.requests.length,0);}
 finally{reader.repository.transaction=original;await reader.repository.close();await f.s.repository.close();}
});
test('an entered original reader with a completed transaction is not replayed after a later conflict',async()=>{
 const f=await completeFixture(),error=Object.assign(Error('synthetic failure after committed callback work'),{code:'CONTROL_PUBLICATION_CHANGED'});let entered=0;
 try{await assert.rejects(runWithPreDispatchReadRetry(f.s.run.bind(f.s),async()=>{entered++;await f.s.repository.transaction(true,t=>t.put('meta',{id:'synthetic-read-retry-commit',value:entered}),['meta']);throw error;}),e=>e===error);assert.equal(entered,1);assert.deepEqual(await f.s.repository.transaction(false,t=>t.get('meta','synthetic-read-retry-commit'),['meta']),{id:'synthetic-read-retry-commit',value:1});assert.equal(f.requests.length,0);}
 finally{await f.s.repository.close();}
});
