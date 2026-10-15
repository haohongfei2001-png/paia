import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('./ans-08-topic-continuous-chrome-e2e.test.mjs',import.meta.url),'utf8');
// Execute the exact test-only worker functions without launching a native suite.
const functions=new Function(source.slice(source.indexOf('function installAns08PerformanceDiagnostics'),source.indexOf("\ntest('ANS-08 Chrome"))+';return {installAns08PerformanceDiagnostics,collectAns08PerformanceDiagnostics};')();
const {installAns08PerformanceDiagnostics:install,collectAns08PerformanceDiagnostics:collect}=functions;
function fixture(run){
 const previous=Object.fromEntries(['IDBDatabase','IDBTransaction','chrome'].map(key=>[key,globalThis[key]]));
 class Tx extends EventTarget{constructor(){super();this.mode='readonly';}}
 class DB{transaction(){return new Tx();}}
 const listeners=new Set(),existing=()=>{};listeners.add(existing);const messages={addListener:f=>listeners.add(f),removeListener:f=>listeners.delete(f)};
 Object.assign(globalThis,{IDBDatabase:DB,IDBTransaction:Tx,chrome:{runtime:{onMessage:messages}}});
 const descriptor=Object.getOwnPropertyDescriptor(DB.prototype,'transaction'),db=new DB();
 try{const setup=install({topicId:'synthetic'});assert.equal(setup.status,'INSTALLED');const observer=[...listeners].find(x=>x!==existing),transactions=[];
  const samples=(count=30,holdLast=false)=>{for(let i=0;i<count;i++){assert.equal(observer({type:'TOPIC_DOCUMENT_PAGE',options:{topicId:'synthetic',cursor:{},sort:'asc',limit:40}}),false);const tx=db.transaction();transactions.push(tx);if(!holdLast||i<count-1)tx.dispatchEvent(new Event('complete'));}};
  run({setup,samples,transactions,state:globalThis.__ans08PerformanceDiagnostics,DB,descriptor,listeners,existing});
 }finally{globalThis.__ans08PerformanceDiagnostics?.restore();delete globalThis.__ans08PerformanceDiagnostics;for(const [key,value]of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
}
test('completed observed windows retain complete status and restore exact native descriptor',()=>fixture(({setup,samples,DB,descriptor,listeners,existing})=>{samples();const report=collect(setup);assert.equal(report.status,'OBSERVED');assert.equal(report.pendingAtCutoff,0);assert.deepEqual(Object.getOwnPropertyDescriptor(DB.prototype,'transaction'),descriptor);assert.deepEqual([...listeners],[existing]);assert.equal(globalThis.__ans08PerformanceDiagnostics,undefined);}));
test('a never-completing observed background transaction is explicitly censored without waiting or inventing completion',()=>fixture(({setup,samples,transactions,DB,descriptor,listeners,existing})=>{samples(30,true);const report=collect(setup);assert.equal(report.status,'OBSERVED_CENSORED');assert.equal(report.pendingAtCutoff,1);assert.equal(report.samples[29].pending,1);assert.equal(report.samples[29].censoredTransactions,1);assert.equal(report.samples[29].completed,0);const frozen=JSON.stringify(report);transactions[29].dispatchEvent(new Event('complete'));assert.equal(JSON.stringify(report),frozen,'late event cannot mutate the collected report');assert.deepEqual(Object.getOwnPropertyDescriptor(DB.prototype,'transaction'),descriptor);assert.deepEqual([...listeners],[existing]);}));
for(const failure of ['missing-sample','observation-error','dropped-event','cleanup-failure'])test('censoring does not hide '+failure,()=>fixture(({setup,samples,state})=>{samples(failure==='missing-sample'?29:30,true);if(failure==='observation-error')state.report.observationErrors++;if(failure==='dropped-event')state.report.samples[0].droppedObservations++;if(failure==='cleanup-failure'){const restore=state.restore;state.restore=()=>{restore();state.report.cleanup='FAILED';};}assert.equal(collect(setup).status,failure==='cleanup-failure'?'CLEANUP_FAILED':'INCOMPLETE');assert.equal(globalThis.__ans08PerformanceDiagnostics,undefined);}));
test('missing observer remains unavailable rather than a successful empty report',()=>{assert.equal(collect({status:'UNAVAILABLE',reason:'CAPABILITY_UNAVAILABLE'}).status,'UNAVAILABLE');});
test('original sampling and product gates retain priority over diagnostic collection outcomes',()=>{assert.match(source,/for\(let i=0;i<30;i\+\+\)/);assert.match(source,/perf\.p95<=750/);assert.ok(source.indexOf('if(perfError)throw perfError')<source.indexOf('if(diagnosticError)throw diagnosticError'));assert.ok(source.indexOf('warmed Topic next-chunk p95 <= 750 ms')<source.indexOf('if(diagnosticError)throw diagnosticError'));assert.doesNotMatch(source.slice(source.indexOf('function collectAns08PerformanceDiagnostics'),source.indexOf("\ntest('ANS-08 Chrome")),/setTimeout|setInterval|await/);});
