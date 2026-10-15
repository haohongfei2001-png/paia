import test from 'node:test';
import assert from 'node:assert/strict';
import {OriginalSurface} from '../ui/original-surface.js';
import {PresentationNode as Node} from './harness/presentation-dom.mjs';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function fixture(t){
 const previousDocument=Object.getOwnPropertyDescriptor(globalThis,'document'),previousNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 const document={createElement:tag=>{const node=new Node(tag);node.select=()=>{};return node;},createElementNS:(ns,tag)=>new Node(tag,ns),documentElement:{lang:'en'}};
 const clipboard=[],requests=[];Object.defineProperty(globalThis,'document',{configurable:true,value:document});Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:text=>{const pending=deferred();clipboard.push({text,...pending});return pending.promise;}}}});
 t.after(()=>{for(const [name,value]of [['document',previousDocument],['navigator',previousNavigator]])if(value)Object.defineProperty(globalThis,name,value);else delete globalThis[name];});
 const records=[{id:'first',originalText:'SYNTHETIC first 👩‍💻\n  exact',sourceSentAt:null},{id:'last',originalText:'SYNTHETIC next page',sourceSentAt:null}],content=new Node('div'),heading=new Node('h2'),close=new Node('button');let token=0,hook=null;
 const page=request=>({generation:1,availability:'available',unavailable:0,intended:2,title:'Synthetic',records:request.limit===100?records:request.cursor?[records[1]]:[records[0]],nextCursor:request.limit===100||request.cursor?null:{after:1}});
 const surface=new OriginalSurface({content,dialog:{dataset:{},querySelector:s=>s==='h2'?heading:close},host:{open(){const current=++token;return()=>current===token;}},read:async request=>{requests.push(request);return hook?hook(request,page):page(request);}});
 await surface.open({kind:'conversation',ref:'synthetic'});
 const [rows,status,controls,copy]=content.children,[previous,,next]=controls.children;
 return {surface,rows,status,copy,previous,next,records,clipboard,requests,setHook:value=>hook=value,close:()=>++token};
}
test('pagination retires pending original clipboard fallback without replacing the newer page',async t=>{
 const f=await fixture(t),pending=f.copy.onclick();await settle();assert.equal(f.clipboard.length,1);f.next.onclick();await settle();assert.match(f.rows.textContent,/next page/);const status=f.status.textContent;
 f.clipboard[0].reject(Error('denied'));await pending;assert.match(f.rows.textContent,/next page/);assert.equal(f.rows.children[0].tagName,'SECTION');assert.equal(f.status.textContent,status);assert.equal(f.copy.disabled,false);
});
test('pagination retires an old complete read before any clipboard dispatch or stale error',async t=>{
 const f=await fixture(t),held=deferred();f.setHook((request,page)=>request.limit===100?held.promise:page(request));const pending=f.copy.onclick();f.next.onclick();await settle();const status=f.status.textContent;held.reject(Error('old read failed'));await pending;
 assert.match(f.rows.textContent,/next page/);assert.equal(f.status.textContent,status);assert.equal(f.clipboard.length,0);assert.equal(f.copy.disabled,false);
});
test('a newer page copy owns its busy state when an older clipboard request finishes',async t=>{
 const f=await fixture(t),first=f.copy.onclick();await settle();f.next.onclick();await settle();const second=f.copy.onclick();await settle();assert.equal(f.clipboard.length,2);assert.equal(f.copy.disabled,true);
 f.clipboard[0].resolve();await first;assert.equal(f.copy.disabled,true);assert.doesNotMatch(f.status.textContent,/原文已复制/);f.clipboard[1].reject(Error('denied'));await second;assert.equal(f.rows.children[0].value,f.records.map(r=>r.originalText).join('\n\n'));
});
test('current copy still returns the entire original and a later page clears manual fallback',async t=>{
 const f=await fixture(t),pending=f.copy.onclick();await settle();f.clipboard[0].reject(Error('denied'));await pending;assert.equal(f.rows.children[0].value,f.records.map(r=>r.originalText).join('\n\n'));f.next.onclick();await settle();assert.match(f.rows.textContent,/next page/);assert.equal(f.rows.children[0].tagName,'SECTION');
});
test('closed original owner never receives a late manual fallback',async t=>{
 const f=await fixture(t),pending=f.copy.onclick();await settle();f.close();const before=f.rows.textContent;f.clipboard[0].reject(Error('denied'));await pending;assert.equal(f.rows.textContent,before);
});
test('successful old complete read cannot dispatch clipboard after a page change',async t=>{
 const f=await fixture(t),held=deferred();let originalRequest,makePage;f.setHook((request,page)=>{if(request.limit===100){originalRequest=request;makePage=page;return held.promise;}return page(request);});const pending=f.copy.onclick();f.next.onclick();await settle();held.resolve(makePage(originalRequest));await pending;
 assert.match(f.rows.textContent,/next page/);assert.equal(f.clipboard.length,0);assert.equal(f.copy.disabled,false);
});
