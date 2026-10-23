import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const base=new URL('./',import.meta.url);
const original=await readFile(new URL('original-ux-large.mjs',base),'utf8');
const instrumented=await readFile(new URL('instrumented-ux-large.mjs',base),'utf8');
function body(text){
 let code=text.slice(text.indexOf('page.evaluate(async()=>{')+'page.evaluate(async()=>{'.length,text.lastIndexOf('});}'));
 code=code.replace(/const \{OrganizerStore\}=await import[^\n]+;/,'const {OrganizerStore,recordIndex,blockIndex,sourceCount}=mock;');
 assert.ok(!code.includes('await import'));
 // Tiny synthetic surrogate only: two batches of two rows, in memory. The
 // full-scale module and executable driver are never altered by this check.
 code=code.replaceAll('start<100000','start<4').replaceAll('start<5000','start<4').replaceAll('start+=500','start+=2').replaceAll('start+500','start+2');
 return new AsyncFunction('mock','globalThis','performance','setInterval','clearInterval','crypto','chrome',code);
}
const fns=[body(original),body(instrumented)];
async function simulate(fn,failure=null){
 const trace=[],tables=new Map(),sentinel=new Error('synthetic sentinel'),global={},clock={value:0},timers={started:0,cleared:0};
 let writes=0,txCount=0;
 const table=n=>{if(!tables.has(n))tables.set(n,new Map());return tables.get(n);};
 const t={async clear(n){trace.push(['clear',n]);table(n).clear();},async put(n,v){const number=++writes;trace.push(['put',n,createHash('sha256').update(JSON.stringify(v)).digest('hex')]);await Promise.resolve();if(failure==='put'&&number===3)throw sentinel;table(n).set(v.id,structuredClone(v));},async get(n,id){trace.push(['get',n,id]);return table(n).get(id);},async count(n){trace.push(['count',n]);if(failure==='count')throw sentinel;return table(n).size;}};
 const repository={async transaction(write,callback){const id=++txCount;trace.push(['transaction',id,write]);let value;try{value=await callback(t);trace.push(['callback-complete',id]);await Promise.resolve();await Promise.resolve();if(failure==='commit'&&id===2)throw sentinel;trace.push(['native-complete',id]);return value;}catch(e){trace.push(['native-abort',id]);throw e;}}};
 class OrganizerStore{
  constructor(){this.repository=repository;}
  async consent(){}async status(){return {epoch:1};}async capture(){}
  async snapshot(){return {records:[{id:'template',platform:'chatgpt',hidden:false,deletedAt:null}],library:{blocks:[{id:'block',excluded:false}]},conversations:[{id:'document'}]};}
  async createTopic(){table('topics').set('topic',{id:'topic',defaultSectionId:'section'});table('sections').set('["topic",1,"section"]',{id:'["topic",1,"section"]'});return {id:'topic'};}
  async createEntry(){table('thoughts').set('entry',{id:'entry',body:'synthetic'});return {id:'entry'};}
 }
 const mock={OrganizerStore,recordIndex:(r,i)=>({id:r.id,sequence:i}),blockIndex:(b,i)=>({id:b.id,sequence:i}),sourceCount:(d,k)=>({id:JSON.stringify([d,k])})};
 global.chrome={storage:{local:{}}};
 let result,error;try{result=await fn(mock,global,{now:()=>clock.value+=0.25},()=>++timers.started,()=>timers.cleared++,{randomUUID:()=> 'synthetic-operation'},global.chrome);}catch(e){error=e;}
 return {trace,result,error,errorIsSentinel:error===sentinel,timing:global.__uxr4SeedTiming,timers,writes};
}
const results=[];
for(const scenario of [null,'put','commit','count']){
 const a=await simulate(fns[0],scenario),b=await simulate(fns[1],scenario);
 assert.deepEqual(b.trace,a.trace,'exact original write/read/transaction order');
 assert.deepEqual(b.timers,a.timers,'no new timer or changed original cleanup');
 assert.equal(b.errorIsSentinel,a.errorIsSentinel);
 assert.equal(b.timing.failed,scenario!==null);
 assert.ok(b.timing.finishedMs>=b.timing.startedMs);
 if(!scenario){assert.deepEqual(b.result.counts,a.result.counts);assert.equal(b.result.topicId,a.result.topicId);assert.equal(b.timing.batches.length,4);for(const batch of b.timing.batches){assert.ok(batch.transactionStartMs<=batch.callbackStartMs&&batch.callbackStartMs<=batch.requestsIssuedMs&&batch.requestsIssuedMs<=batch.promisesDoneMs&&batch.promisesDoneMs<batch.transactionDoneMs);}}
 else{assert.equal(a.errorIsSentinel,true);assert.equal(b.errorIsSentinel,true);assert.equal(b.result,undefined);}
 const allowedTop=['version','startedMs','finishedMs','failed','phases','batches'];assert.deepEqual(Object.keys(b.timing),allowedTop);
 const allowedPhase=new Set(['name','startMs','endMs']);for(const p of b.timing.phases)assert.ok(Object.keys(p).every(k=>allowedPhase.has(k)));
 const allowedBatch=new Set(['kind','offset','units','transactionStartMs','callbackStartMs','requestsIssuedMs','promisesDoneMs','transactionDoneMs','objectConstructionMs']);for(const p of b.timing.batches)assert.ok(Object.keys(p).every(k=>allowedBatch.has(k)));
 assert.ok(!JSON.stringify(b.timing).includes('synthetic sentinel'));
 results.push({scenario:scenario??'success',pass:true,originalTraceEqual:true,originalErrorIdentityPreserved:!!scenario,fullScaleExecuted:false,traceEvents:a.trace.length,syntheticWrites:a.writes});
 console.log('PASS '+(scenario??'success')+' original operation order / await / exception / body-free timing');
}
await writeFile(new URL('synthetic-validation.json',base),JSON.stringify({cases:results,realIDB:false,realBrowser:false,fullScale:false},null,2)+'\n');
