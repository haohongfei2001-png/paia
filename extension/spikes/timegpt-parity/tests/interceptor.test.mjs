import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const contract=await readFile(new URL('../contract.js',import.meta.url),'utf8'),source=await readFile(new URL('../interceptor.js',import.meta.url),'utf8');
const chat='11111111-1111-4111-8111-111111111111',id='aaaaaaaa-aaaa-4aaa-8aaa-000000000001',url='https://chatgpt.com/backend-api/conversation/'+chat;
const value={conversation_id:chat,mapping:{one:{message:{id,author:{role:'user'},create_time:1609459200}}}};
const tick=()=>new Promise(r=>setTimeout(r,5));
function setup(original,overrides={}){
 const events={},out=[],intervals=new Set();let fetchCalls=0;
 const ctx=vm.createContext({URL,Request,Response,TextDecoder,setTimeout,clearTimeout,setInterval:fn=>{intervals.add(fn);return fn;},clearInterval:fn=>intervals.delete(fn),location:{pathname:'/c/'+chat},
  fetch:function(...args){fetchCalls++;return original.apply(this,args);},addEventListener:(key,fn)=>(events[key]||=[]).push(fn),postMessage:d=>out.push(d),...overrides});
 vm.runInContext('window=globalThis',ctx);vm.runInContext(contract,ctx);vm.runInContext(source,ctx);
 ctx.deliver=data=>{ctx.input=data;for(const fn of events.message||[]){ctx.handler=fn;vm.runInContext("handler({source:window,origin:'https://chatgpt.com',data:input})",ctx);}};
 return {ctx,out,events,intervals,calls:()=>fetchCalls};
}
function response(body=JSON.stringify(value),options={}){const r=new Response(body,{headers:{'content-type':'application/json'},...options});Object.defineProperty(r,'url',{value:url});return r;}
test('original fetch once, exact this/args/Promise/Response; request secrets unread; immediate consumption',async()=>{
 const r=response(),promise=Promise.resolve(r),receiver={synthetic:true};let seen;
 const s=setup(function(...args){seen={that:this,args};return promise;});const options={};for(const k of ['body','headers','credentials'])Object.defineProperty(options,k,{get(){throw Error('request secret');}});
 assert.equal(s.ctx.fetch.call(receiver,url,options),promise);assert.equal(seen.that,receiver);assert.equal(seen.args[1],options);assert.equal(await promise,r);assert.deepEqual(await r.json(),value);
 for(let i=0;i<50&&!s.out.length;i++)await tick();assert.equal(s.calls(),1);assert.equal(s.out[0].rows[0].time,1609459200);
 s.ctx.deliver({type:'parity-drain-v1',chat});assert.equal(s.out.at(-1).drain,true);assert.equal(s.out.at(-1).rows.length,1);
});
test('slow clone cannot delay original; pagehide cancels; BFCache clears and restarts expiry',async()=>{
 let cancelled=false;const r=response(new ReadableStream({pull(){return new Promise(()=>{});},cancel(){cancelled=true;}}));
 const p=Promise.resolve(r),s=setup(()=>p);assert.equal(s.ctx.fetch(url),p);assert.equal(await p,r);
 for(const fn of s.events.pagehide)fn();assert.equal(s.intervals.size,0);
 for(const fn of s.events.pageshow)fn({persisted:true});assert.equal(s.intervals.size,1);
 s.ctx.deliver({type:'parity-drain-v1',chat});assert.equal(s.out.at(-1).rows.length,0);
});
for(const kind of ['HTTP','redirect','type','size','actual size','depth','malformed','wrong response URL'])test('interceptor rejects '+kind,async()=>{
 let r=response();
 if(kind==='HTTP')r=response(JSON.stringify(value),{status:403});
 if(kind==='redirect')Object.defineProperty(r,'redirected',{value:true});
 if(kind==='type')r=response(JSON.stringify(value),{headers:{'content-type':'text/plain'}});
 if(kind==='size')r=response(JSON.stringify(value),{headers:{'content-type':'application/json','content-length':'2097153'}});
 if(kind==='actual size')r=response(' '.repeat(2097153));
 if(kind==='depth')r=response('['.repeat(21)+']'.repeat(21));
 if(kind==='malformed')r=response('{invalid');
 if(kind==='wrong response URL'){r=new Response(JSON.stringify(value),{headers:{'content-type':'application/json'}});}
 const s=setup(()=>Promise.resolve(r));await s.ctx.fetch(url);for(let i=0;i<50&&!s.out.length;i++)await tick();
 assert.equal(s.out[0].rows.length,0);assert.equal(s.out[0].stats.rejected,1);assert.equal(s.calls(),1);
});
test('non-detail responses never cloned; rejected original Promise preserved; no request added',async()=>{
 const failure=Error('synthetic rejection'),p=Promise.reject(failure);p.catch(()=>{});const s=setup(()=>p);assert.equal(s.ctx.fetch(url),p);await assert.rejects(p,e=>e===failure);
 const r=response();Object.defineProperty(r,'headers',{get(){throw Error('non-detail response inspected');}});
 const x=setup(()=>Promise.resolve(r));await x.ctx.fetch('https://elsewhere.example/backend-api/conversation/'+chat);await tick();assert.equal(x.out.length,0);assert.equal(x.calls(),1);
});
test('response pending across pagehide cannot repopulate a restored document buffer',async()=>{
 let finish;const p=new Promise(r=>finish=r),s=setup(()=>p);s.ctx.fetch(url);
 for(const fn of s.events.pagehide)fn();for(const fn of s.events.pageshow)fn({persisted:true});
 finish(response());await p;await tick();s.ctx.deliver({type:'parity-drain-v1',chat});assert.equal(s.out.at(-1).rows.length,0);
});
test('bounded concurrency rejects the third pending clone; stop cancels without touching originals',async()=>{
 const responses=Array.from({length:3},()=>response(new ReadableStream({pull(){return new Promise(()=>{});}})));
 let index=0;const s=setup(()=>Promise.resolve(responses[index++]));
 for(let i=0;i<3;i++)assert.equal(await s.ctx.fetch(url),responses[i]);
 assert.equal(s.out.at(-1).stats.observed,3);assert.equal(s.out.at(-1).stats.rejected,1);assert.equal(s.calls(),3);
 s.ctx.deliver({type:'parity-stop-v1'});assert.equal(s.out.at(-1).stopped,true);assert.equal(s.out.at(-1).rows.length,0);
 assert.ok(responses.every(r=>!r.bodyUsed));
});
test('five-second clone deadline rejects stalled copy; wrong-conversation drain reveals nothing',async()=>{
 let deadline;const s=setup(()=>Promise.resolve(response(new ReadableStream({pull(){return new Promise(()=>{});}}))),{setTimeout:(fn,ms)=>{assert.equal(ms,5000);deadline=fn;return 1;},clearTimeout:()=>{}});
 await s.ctx.fetch(url);deadline();for(let i=0;i<50&&!s.out.length;i++)await tick();assert.equal(s.out[0].stats.rejected,1);
 const count=s.out.length;s.ctx.deliver({type:'parity-drain-v1',chat:'22222222-2222-4222-8222-222222222222'});assert.equal(s.out.length,count);
});
