import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../adapter/chatgpt-current-reply.js',import.meta.url),'utf8');
const ctx=vm.createContext({performance:{now:()=>0},TextEncoder});vm.runInContext(source,ctx);
const url='https://chatgpt.com/c/lifecycle';
function fixture(){const a=new ctx.PAIAChatGPTCurrentReplyAdapter({document:{},location:{href:url,pathname:'/c/lifecycle'}}),node={};let s={url,latest:node,replyId:'reply-1',userId:'user-1',signature:'1:user-1',streaming:false,complete:true,uncertain:false};a.inspect=()=>s;return {a,s,node};}
function start(a,s,t,id='reply-2'){s.streaming=true;s.complete=false;a.observe(t);s.replyId=id;s.latest={};a.observe(t+1,true);}
function finish(a,s,t){s.streaming=false;s.complete=true;return a.observe(t);}
test('old final reply, enable/reload, streaming pause and absent completion never become a new reply',()=>{const {a,s}=fixture();assert.equal(a.observe(0).binding,undefined);assert.equal(a.observe(10000).binding,undefined);start(a,s,11000);assert.equal(a.observe(20000).binding,undefined);s.streaming=false;s.complete=false;a.observe(21000);assert.equal(a.observe(22000).binding,undefined);});
test('new observed reply identity, cycle, completion and stability are all required',()=>{const {a,s}=fixture();a.observe(0);start(a,s,100);let r=finish(a,s,200);assert.equal(r.ready,false);assert.equal(r.binding.cycle,1);assert.equal(a.observe(799).ready,false);assert.equal(a.observe(800).ready,true);});
test('enable during a generation excludes that generation; next cycle can qualify',()=>{const {a,s}=fixture();s.streaming=true;s.complete=false;a.observe(0);s.replyId='reply-2';finish(a,s,1000);assert.equal(a.observe(2000).binding,undefined);start(a,s,2100,'reply-3');finish(a,s,2200);assert.equal(a.observe(3000).ready,true);});
test('regenerate, continue, mutation, new user turn and route invalidate old identity',()=>{const {a,s}=fixture();a.observe(0);start(a,s,10);finish(a,s,20);const old=a.observe(700).binding;start(a,s,800,'reply-3');assert.equal(a.observe(1800).binding,undefined);finish(a,s,1900);assert.notEqual(a.observe(2600).binding.cycle,old.cycle);assert.equal(a.observe(2800,true).binding,undefined);assert.equal(a.observe(5000).binding,undefined);s.signature='2:user-2';assert.equal(a.observe(5100).binding,undefined);s.url=url+'other';assert.equal(a.observe(6000).binding,undefined);});
test('failed regeneration and same-ID continue cannot reinterpret the historical final reply',()=>{const {a,s}=fixture();a.observe(0);s.streaming=true;s.complete=false;a.observe(10);s.streaming=false;s.complete=true;a.observe(20);assert.equal(a.observe(1000).binding,undefined);});
test('autonomous branch replacement after final completion does not reuse the prior generation',()=>{const {a,s}=fixture();a.observe(0);start(a,s,10);finish(a,s,20);assert.equal(a.observe(700).ready,true);s.replyId='historical-branch';s.latest={};assert.equal(a.observe(800).binding,undefined);assert.equal(a.observe(1600).binding,undefined);});
test('a reply that first appears after stop disappears has no observed generation identity',()=>{const {a,s}=fixture();a.observe(0);s.streaming=true;s.complete=false;a.observe(10);s.streaming=false;s.complete=true;s.replyId='late-unverified';s.latest={};a.observe(20);assert.equal(a.observe(1000).binding,undefined);});

test('production snapshot enforces limits before unbounded text expansion and traversal',()=>{
 const {a,s}=fixture();const element=(tag,children=[])=>({nodeType:1,isConnected:true,childNodes:children,getClientRects:()=>[{}],closest:()=>null,matches:selector=>selector.split(',').some(x=>x===tag)});
 const body=element('div',[element('p',[{nodeType:3,data:'回复“继续”'}])]);s.latest.querySelectorAll=()=>[body];a.current=s.latest;a.armed=true;
 assert.equal(a.snapshot().text.trim(),'回复“继续”');
 body.childNodes=[{nodeType:3,data:'x'.repeat(1000000)}];assert.equal(a.snapshot(),null);
 body.childNodes=Array.from({length:2050},()=>element('span',[]));assert.equal(a.snapshot(),null);
 body.childNodes=[element('blockquote',[{nodeType:3,data:'回复“继续”'}])];assert.equal(a.snapshot().excluded,true);
});
