import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {samplePreGateFilter,admitPreGatePurgeBrowserFixture} from './harness/pre-gate-purge-browser-fixture.mjs';
import {runWithPreDispatchReadRetry} from './harness/pre-dispatch-read-retry.mjs';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {CONTROL_PUBLICATION_REVISION} from '../core/local-control-publication.js';
async function fixture(){
 const f=await completeFixture({texts:[]}),s=new f.s.constructor(f.storage,{indexedDB:f.indexedDB});await s.finishFoundation();const original=s.repository.transaction.bind(s.repository);let fences=0,publications=0;
 s.repository.transaction=async(write,fn,stores)=>{let fence=false;const result=await original(write,async t=>{const get=t.get.bind(t);t.get=(name,key)=>{if(key===CONTROL_PUBLICATION_REVISION)fence=true;return get(name,key);};return fn(t);},stores);if(fence){fences++;if(fences===1||fences===3){publications++;await f.s.updatePreferences({appearance:publications===1?'dark':'light'});}}return result;};
 return {f,s,get publications(){return publications;},async close(){await s.repository.close();await f.s.repository.close();}};
}
test('old two-attempt acquisition rejects two actual same-database publications before read callback',async()=>{
 const x=await fixture();let entered=0;try{await assert.rejects(runWithPreDispatchReadRetry(x.s.run.bind(x.s),()=>{entered++;return x.s.filterStatus();}),e=>e.code==='CONTROL_PUBLICATION_CHANGED');assert.equal(x.publications,2);assert.equal(entered,0);}finally{await x.close();}
});
test('two exact unentered attempts mean missing filter snapshot, then a new real sample succeeds',async()=>{
 const x=await fixture(),trace=[],original=x.s.run;try{const before=await rows(x.f.s,'records');assert.deepEqual(await samplePreGateFilter(x.s,original,runWithPreDispatchReadRetry,trace),{pending:true});assert.equal(x.publications,2);assert.equal(x.s.run,original);assert.deepEqual(trace[0].attempts.map(e=>[e.attempt,e.entered,e.initialized,e.code]),[[1,false,true,'CONTROL_PUBLICATION_CHANGED'],[2,false,true,'CONTROL_PUBLICATION_CHANGED']]);const next=await samplePreGateFilter(x.s,original,runWithPreDispatchReadRetry,trace);assert.equal(next.pending,false);assert.equal(next.filter.taskState,'idle');assert.deepEqual(await rows(x.f.s,'records'),before);assert.equal(x.f.requests.length,0);}finally{await x.close();}
});
for(const kind of ['entered','other-code','not-initialized','partial-multiple-calls'])test('filter sampling does not hide '+kind,async()=>{
 const conflict=Object.assign(Error('SYNTHETIC '+kind),{code:kind==='other-code'?'STORAGE_FAILED':'CONTROL_PUBLICATION_CHANGED'}),trace=[];let attempts=0,callbacks=0;
 const s={loaded:kind!=='not-initialized',run:null,filterStatus:async function(){if(kind==='partial-multiple-calls'){await this.run(()=>({partial:true}));}return this.run(()=>{callbacks++;throw conflict;});}};
 const run=async function(fn){attempts++;if(kind==='entered'||kind==='partial-multiple-calls'&&attempts===1)return fn();throw conflict;};s.run=run;
 await assert.rejects(samplePreGateFilter(s,run,runWithPreDispatchReadRetry,trace),e=>e===conflict);assert.equal(s.run,run);if(kind==='entered'){assert.equal(attempts,1);assert.equal(callbacks,1);}if(kind==='other-code')assert.equal(attempts,1);
});
const source=await readFile(new URL('./harness/pre-gate-purge-browser-fixture.mjs',import.meta.url),'utf8');
const loop=source.slice(source.indexOf('let prior=null,stable=0;'),source.indexOf('\n  const preview='));
const runLoop=Function('store','sampleFilter','originalRun','preDispatchRead','trace','chrome','setTimeout','return (async()=>{'+loop+'return true;})()');
async function settle(pendingAt){let calls=0,reads=0,delays=0;const metadata=[{id:'ans:index-state:v1:catalog',phase:'complete',pending:false}],store={repository:{transaction:async()=>{reads++;return metadata;}}};
 const result=runLoop(store,async()=>{calls++;return pendingAt(calls)?{pending:true}:{pending:false,filter:{pending:0,taskState:'idle'}};},null,null,[],{runtime:{sendMessage:async()=>({ok:true,data:{coverage:{state:'complete',archiveComplete:true}}})}},(fn,ms)=>{assert.equal(ms,25);delays++;fn();});
 return {result,get calls(){return calls;},get reads(){return reads;},get delays(){return delays;}};
}
test('pending after seven stable comparisons resets all prior progress and reads no partial metadata',async()=>{const x=await settle(n=>n===9);assert.equal(await x.result,true);assert.equal(x.calls,18);assert.equal(x.reads,34);assert.equal(x.delays,17);});
test('original100-sample budget admits only a full new stable sequence at boundary',async()=>{const x=await settle(n=>n<=91);assert.equal(await x.result,true);assert.equal(x.calls,100);assert.equal(x.reads,18);assert.equal(x.delays,99);});
test('one later pending sample cannot fabricate stability at original100-sample boundary',async()=>{const x=await settle(n=>n<=92);await assert.rejects(x.result,/HISTORICAL_FIXTURE_MAINTENANCE_NOT_SETTLED/);assert.equal(x.calls,100);assert.equal(x.reads,16);assert.equal(x.delays,100);});
test('all100 unavailable samples never read partial metadata or admit purge',async()=>{const x=await settle(()=>true);await assert.rejects(x.result,/HISTORICAL_FIXTURE_MAINTENANCE_NOT_SETTLED/);assert.equal(x.calls,100);assert.equal(x.reads,0);assert.equal(x.delays,100);});

test('serialized browser fixture remains valid and failed diagnostic read preserves original failure',async()=>{const original=Error('SYNTHETIC original browser failure'),page={evaluate:async source=>{assert.doesNotThrow(()=>Function('return '+source));throw original;},locator:()=>({evaluate:async()=>{throw Error('SYNTHETIC detached diagnostic');}})};await assert.rejects(admitPreGatePurgeBrowserFixture(page,'synthetic-source-id'),error=>error===original);});
