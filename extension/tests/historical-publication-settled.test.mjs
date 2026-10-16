import test from 'node:test';
import assert from 'node:assert/strict';
import {waitForHistoricalPublication} from './harness/historical-publication-settled.mjs';
import {runWithPreDispatchReadRetry} from './harness/pre-dispatch-read-retry.mjs';
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
test('one publication start and settlement are observed before the original second acquisition',async()=>{
 const conflict=Object.assign(Error('SYNTHETIC publication started'),{code:'CONTROL_PUBLICATION_CHANGED'});let runs=0,entered=0,reads=0,waits=0;
 const fences=[{revision:10,reservation:{revision:10}},{revision:10},{revision:10}];
 const value=await runWithPreDispatchReadRetry(fn=>{if(++runs===1)throw conflict;return fn();},()=>{entered++;return 'original result';},async error=>{assert.equal(error,conflict);assert.equal(await waitForHistoricalPublication(async()=>fences[reads++],equal,{pause:async()=>{waits++;}}),true);});
 assert.equal(value,'original result');assert.equal(runs,2);assert.equal(entered,1);assert.equal(reads,3);assert.equal(waits,2);
});
test('unsettled publication is bounded and cannot enter or create a third attempt',async()=>{
 const conflict=Object.assign(Error('SYNTHETIC unresolved publication'),{code:'CONTROL_PUBLICATION_CHANGED'});let runs=0,reads=0,entered=0;
 await assert.rejects(runWithPreDispatchReadRetry(()=>{runs++;throw conflict;},()=>{entered++;},async error=>{if(!await waitForHistoricalPublication(async()=>{reads++;return {revision:1,reservation:{revision:1}};},equal,{pause:async()=>{}}))throw error;}),e=>e===conflict);
 assert.equal(reads,40);assert.equal(runs,1);assert.equal(entered,0);
});
test('settlement waits for stable complete fences, not just a missing reservation',async()=>{
 let reads=0;const rows=[{revision:1,epoch:1},{revision:1,epoch:2},{revision:1,epoch:2}];
 assert.equal(await waitForHistoricalPublication(async()=>rows[reads++],equal,{pause:async()=>{}}),true);assert.equal(reads,3);
});
for(const entered of [false,true])test('original '+(entered?'entered error':'second acquisition conflict')+' never runs another settlement wait',async()=>{
 const conflict=Object.assign(Error('SYNTHETIC changed'),{code:'CONTROL_PUBLICATION_CHANGED'});let waits=0,runs=0;
 await assert.rejects(runWithPreDispatchReadRetry(fn=>{runs++;if(entered)return fn();throw conflict;},()=>{throw conflict;},async()=>{waits++;}),e=>e===conflict);
 assert.equal(runs,entered?1:2);assert.equal(waits,entered?0:1);
});

import {completeFixture,rows} from './harness/original-complete.mjs';
import {readControlPublicationFence,controlPublicationEqual,CONTROL_PUBLICATION_REVISION} from '../core/local-control-publication.js';
test('actual same-database publication settles before the one allowed reacquisition without replaying work',async()=>{
 const f=await completeFixture({texts:[]}),reader=new f.s.constructor(f.storage,{indexedDB:f.indexedDB});await reader.finishFoundation();
 const before=await rows(f.s,'records'),transaction=reader.repository.transaction.bind(reader.repository),set=f.storage.set;
 let release,started,writer,injected=false,entered=0;const held=new Promise(r=>release=r),atSet=new Promise(r=>started=r);
 f.storage.set=async value=>{started();await held;return set.call(f.storage,value);};
 reader.repository.transaction=async(write,fn,stores)=>{let fence=false;const result=await transaction(write,async t=>{const get=t.get.bind(t);t.get=(name,id)=>{if(id===CONTROL_PUBLICATION_REVISION)fence=true;return get(name,id);};return fn(t);},stores);
  if(fence&&!injected){injected=true;writer=f.s.updatePreferences({appearance:'dark'});await atSet;}return result;};
 try{
  const value=await runWithPreDispatchReadRetry(reader.run.bind(reader),()=>{entered++;return reader.repository.transaction(false,t=>reader.control(t),['meta']);},async error=>{
   if(!await waitForHistoricalPublication(()=>transaction(false,readControlPublicationFence,['meta']),controlPublicationEqual,{pause:async()=>{release();await writer;}}))throw error;
  });
  assert.equal(injected,true);assert.equal(entered,1);assert.equal(value.preferences.appearance,'dark');assert.deepEqual(await rows(f.s,'records'),before);assert.equal(f.requests.length,0);
 }finally{release();await writer;f.storage.set=set;reader.repository.transaction=transaction;await reader.repository.close();await f.s.repository.close();}
});
