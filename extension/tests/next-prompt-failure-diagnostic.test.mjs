import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
// Evaluate only the exact small diagnostic helpers. Never import/execute the
// browser fixture, launch Chrome or manufacture a replacement UI/transport.
const source=readFileSync(new URL('./cpv1-12-next-prompt-chrome-e2e.test.mjs',import.meta.url),'utf8');
const begin='// BEGIN CASE13_DIAGNOSTIC_HELPERS',end='// END CASE13_DIAGNOSTIC_HELPERS';
assert.equal(source.split(begin).length,2);assert.equal(source.split(end).length,2);
const helpers=source.split(begin)[1].split(end)[0];
function setup(send){const runtime={sendMessage:send},context=vm.createContext({chrome:{runtime}});vm.runInContext(helpers,context);context.installCompleteReviewObservation('SYNTHETIC exact\ntext');return {context,runtime};}
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const query={type:'PAIA_PROMPT_SURFACE_RPC',command:{type:'PAIA_PROMPT_QUERY'}};

test('diagnostic returns the identical original Promise/request/result without another RPC',async()=>{
 const held=deferred(),calls=[],h=setup(function(...args){calls.push({receiver:this,args});return held.promise;}),returned=h.runtime.sendMessage(query,'unchanged argument');
 assert.equal(returned,held.promise);assert.equal(calls.length,1);assert.equal(calls[0].receiver,h.runtime);assert.equal(calls[0].args[0],query);assert.equal(calls[0].args[1],'unchanged argument');
 const response={ok:true,data:{revision:9,items:[{text:'SYNTHETIC exact\ntext',id:'DO_NOT_RECORD_ID',secret:'DO_NOT_RECORD_SECRET'}]}};held.resolve(response);assert.equal(await returned,response);
 assert.deepEqual(JSON.parse(JSON.stringify(h.context.__completeReviewRPC.items)),[{type:'PAIA_PROMPT_QUERY',state:'settled',ok:true,revision:9,itemCount:1,expectedPresent:true}]);assert.doesNotMatch(JSON.stringify(h.context.__completeReviewRPC),/DO_NOT_RECORD|SYNTHETIC exact/);
});

test('rejected original RPC remains the same rejection; observer creates no unhandled rejection',async()=>{
 const held=deferred(),failure=Error('SYNTHETIC original failure'),unhandled=[],listener=reason=>unhandled.push(reason);process.on('unhandledRejection',listener);
 try{const h=setup(()=>held.promise),returned=h.runtime.sendMessage(query);assert.equal(returned,held.promise);const checked=assert.rejects(returned,error=>error===failure);held.reject(failure);await checked;await new Promise(resolve=>setImmediate(resolve));assert.equal(h.context.__completeReviewRPC.items[0].state,'rejected');assert.deepEqual(unhandled,[]);}finally{process.removeListener('unhandledRejection',listener);}
});

test('a throwing diagnostic response getter cannot change the successful response or reject a side chain',async()=>{
 const response={ok:true,get data(){throw Error('SYNTHETIC diagnostic getter');}},pending=Promise.resolve(response),unhandled=[],listener=reason=>unhandled.push(reason);process.on('unhandledRejection',listener);
 try{const h=setup(()=>pending),returned=h.runtime.sendMessage(query);assert.equal(await returned,response);await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(unhandled,[]);}finally{process.removeListener('unhandledRejection',listener);}
});

test('RPC observation is bounded and retains the original single insertion counter',async()=>{
 let calls=0;const h=setup(()=>{calls++;return Promise.resolve({ok:false,error:'NON_SECRET_CODE',data:{text:'NEVER_RECORD_BODY'}});});
 for(let i=0;i<40;i++)await h.runtime.sendMessage(query);
 await h.runtime.sendMessage({type:'PAIA_PROMPT_SURFACE_RPC',command:{type:'PAIA_PROMPT_SELECTION_INSERT'}});
 assert.equal(calls,41);assert.equal(h.context.__completeReviewRPC.items.length,32);assert.equal(h.context.__completeReviewRPC.dropped,9);assert.equal(h.context.__completeReviewWrites,1);assert.doesNotMatch(JSON.stringify(h.context.__completeReviewRPC),/NEVER_RECORD_BODY/);assert.equal(h.context.__completeReviewRPC.items[0].error,'NON_SECRET_CODE');
});

test('synchronous original transport error stays the exact original error',()=>{
 const failure=Error('SYNTHETIC synchronous original error'),h=setup(()=>{throw failure;});assert.throws(()=>h.runtime.sendMessage(query),error=>error===failure);assert.equal(h.context.__completeReviewRPC.items.length,0);
});

test('capture or diagnostic-report failure never replaces the original test failure',async()=>{
 const h=setup(()=>Promise.resolve()),original=Error('SYNTHETIC locator timeout'),diagnostic=Error('SYNTHETIC screenshot failure'),reported=[];
 await assert.rejects(h.context.preserveCompleteReviewFailure(original,async()=>{throw diagnostic;},error=>reported.push(error)),error=>error===original);assert.equal(reported[0],diagnostic);
 await assert.rejects(h.context.preserveCompleteReviewFailure(original,async()=>{throw diagnostic;},()=>{throw Error('SYNTHETIC report failure');}),error=>error===original);
 await assert.rejects(h.context.preserveCompleteReviewFailure(original,async()=>{},()=>{throw Error('must not be called');}),error=>error===original);
});
