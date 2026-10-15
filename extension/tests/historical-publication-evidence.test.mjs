import test from 'node:test';
import assert from 'node:assert/strict';
import {observeHistoricalPublication} from './harness/historical-publication-evidence.mjs';
test('publication observer keeps get/publish promise identities, restores accessors and bounds metadata',async()=>{
 let listener;const storage={onChanged:{addListener:fn=>listener=fn,removeListener:fn=>{assert.equal(fn,listener);listener=null;}}},getResult=Promise.resolve({revision:4,body:'NEVER'}),publishResult=Promise.resolve('ack'),get=function(){return getResult;},t={get},store={repository:{transaction:async function(write,fn){return fn(t);}},publish(){return publishResult;}},trace={stage:'finish-foundation'},original={...store.repository},publish=store.publish;
 const stop=observeHistoricalPublication(store,storage,'control',trace);
 await store.repository.transaction(false,async tx=>{assert.equal(tx.get('meta','local-control-publication:revision'),getResult);for(let i=0;i<40;i++)await tx.get('meta','local-control-publication:revision');});assert.equal(t.get,get);assert.equal(store.publish(),publishResult);
 for(let i=0;i<40;i++)listener({control:{oldValue:{controlPublication:{revision:i}},newValue:{controlPublication:{revision:i+1},settings:{enabled:true},body:'NEVER'}}},'local');
 stop();assert.equal(store.repository.transaction,original.transaction);assert.equal(store.publish,publish);assert.equal(listener,null);assert.equal(trace.fences.length,32);assert.equal(trace.publications.length,32);assert.equal(JSON.stringify(trace).includes('NEVER'),false);
});
test('callback failure preserves exact identity and listener cleanup failure still restores owners',async()=>{
 const failure=Error('callback'),cleanup=Error('cleanup'),get=()=>Promise.resolve(),t={get},transaction=async(w,fn)=>fn(t),publish=()=>Promise.resolve(),store={repository:{transaction},publish},trace={stage:'fixture'},storage={onChanged:{addListener(){},removeListener(){throw cleanup;}}};const stop=observeHistoricalPublication(store,storage,'control',trace);
 await assert.rejects(store.repository.transaction(false,()=>{throw failure;}),error=>error===failure);assert.equal(t.get,get);assert.throws(stop,error=>error===cleanup);assert.equal(store.repository.transaction,transaction);assert.equal(store.publish,publish);
});

import {completeFixture} from './harness/original-complete.mjs';
import {CONTROL_PUBLICATION_REVISION} from '../core/local-control-publication.js';
import {runWithPreDispatchReadRetry} from './harness/pre-dispatch-read-retry.mjs';
test('two genuine same-database publications reject both acquisitions before entry without a third attempt',async()=>{
 const f=await completeFixture(),reader=new f.s.constructor(f.storage,{indexedDB:f.indexedDB});await reader.finishFoundation();const original=reader.repository.transaction.bind(reader.repository);let acquisitions=0,entered=0;
 reader.repository.transaction=async(write,fn,stores)=>{let fence=false;const result=await original(write,async t=>{const get=t.get.bind(t);t.get=(name,key)=>{if(key===CONTROL_PUBLICATION_REVISION)fence=true;return get(name,key);};return fn(t);},stores);if(fence&&++acquisitions%2===1)await f.s.updatePreferences({fontSize:acquisitions===1?'small':'large'});return result;};
 try{await assert.rejects(runWithPreDispatchReadRetry(reader.run.bind(reader),()=>{entered++;}),error=>error.code==='CONTROL_PUBLICATION_CHANGED');assert.equal(entered,0);assert.equal(acquisitions,4);assert.equal(f.requests.length,0);}
 finally{reader.repository.transaction=original;await reader.repository.close();await f.s.repository.close();}
});
