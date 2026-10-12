import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {CONTROL_PUBLICATION_REVISION} from '../core/local-control-publication.js';
import {runWithPreDispatchReadRetry} from './harness/pre-dispatch-read-retry.mjs';
const source=await readFile(new URL('./cpv1-topic-05-2-root-chrome-e2e.test.mjs',import.meta.url),'utf8');
const seed=Function('return ('+source.slice(source.indexOf('async function seedRootTopics('),source.indexOf('\nasync function rootFixture('))+')')();
async function fixture({at='create-topic-0',afterCommit=false}={}){
 const f=await completeFixture({texts:[]}),s=new f.s.constructor(f.storage,{indexedDB:f.indexedDB}),events=[],original=s.repository.transaction.bind(s.repository);let injected=false,commits=0;
 s.repository.transaction=async(write,fn,stores)=>{let fence=false,topicWrite=false;const result=await original(write,async t=>{const get=t.get.bind(t),put=t.put.bind(t);t.get=(name,key)=>{if(key===CONTROL_PUBLICATION_REVISION)fence=true;return get(name,key);};t.put=(name,row)=>{if(name==='topics')topicWrite=true;return put(name,row);};return fn(t);},stores);
  if(topicWrite)commits++;
  if(!injected&&events.at(-1)?.stage===at&&(afterCommit?topicWrite:fence)){injected=true;if(afterCommit)throw Object.assign(Error('SYNTHETIC post-commit conflict'),{code:'CONTROL_PUBLICATION_CHANGED'});await f.s.updatePreferences({appearance:'dark'});}
  return result;
 };
 return {f,s,events,get injected(){return injected;},get commits(){return commits;},async close(){await s.repository.close();await f.s.repository.close();}};
}
test('original one-shot initialized Root fixture rejects actual pre-dispatch publication change before create callback',async()=>{
 const x=await fixture();try{await assert.rejects(seed(x.s,(run,fn)=>run(fn),{from:0,to:1,sections:true},x.events),e=>e.code==='CONTROL_PUBLICATION_CHANGED');assert.equal(x.injected,true);assert.equal(x.commits,0);assert.deepEqual(await rows(x.f.s,'topics'),[]);const failed=x.events.find(e=>e.code);assert.equal(failed.entered,false);assert.equal(failed.initialized,true);assert.equal(x.f.requests.length,0);}finally{await x.close();}
});
test('bounded per-run acquisition completes actual Root Topic/Section seed once after same-DB publication',async()=>{
 const x=await fixture();try{const result=await seed(x.s,runWithPreDispatchReadRetry,{from:0,to:3,sections:true},x.events);assert.equal(x.injected,true);assert.equal(result.length,3);assert.deepEqual(result.map(r=>r.sections.length),[0,1,2]);assert.equal((await rows(x.f.s,'topics')).length,3);assert.equal(new Set(result.map(r=>r.id)).size,3);const failed=x.events.find(e=>e.code);assert.equal(failed.entered,false);assert.equal(failed.initialized,true);const same=x.events.filter(e=>e.call===failed.call);assert.deepEqual(same.map(e=>[e.attempt,e.entered]),[[1,false],[2,true]]);assert.equal(x.s.run,x.f.s.run);assert.equal(x.s.repository.db,null);assert.equal(x.f.requests.length,0);}finally{await x.close();}
});
test('initialization acquisition is not replayed when publication changes before first callback',async()=>{
 const x=await fixture({at:'initialize'});try{await assert.rejects(seed(x.s,runWithPreDispatchReadRetry,{from:0,to:1},x.events),e=>e.code==='CONTROL_PUBLICATION_CHANGED');assert.equal(x.injected,true);assert.equal(x.events.length,1);assert.equal(x.events[0].stage,'initialize');assert.equal(x.events[0].entered,false);assert.equal(x.commits,0);assert.deepEqual(await rows(x.f.s,'topics'),[]);}finally{await x.close();}
});
test('actual Topic commit followed by callback conflict is preserved and never replayed',async()=>{
 const x=await fixture({afterCommit:true});try{await assert.rejects(seed(x.s,runWithPreDispatchReadRetry,{from:0,to:1},x.events),e=>e.code==='CONTROL_PUBLICATION_CHANGED');assert.equal(x.injected,true);assert.equal(x.commits,1);assert.equal((await rows(x.f.s,'topics')).length,1);const failed=x.events.find(e=>e.code);assert.equal(failed.entered,true);assert.equal(x.events.filter(e=>e.call===failed.call).length,1);assert.equal(x.f.requests.length,0);}finally{await x.close();}
});
