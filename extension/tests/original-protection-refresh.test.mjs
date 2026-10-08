import test from 'node:test';import assert from 'node:assert/strict';
import {OriginalSurface} from '../ui/original-surface.js';import {PresentationNode as Node} from './harness/presentation-dom.mjs';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const page={generation:1,target:{kind:'input',ref:'input'},availability:'available',records:[{id:'source',originalText:'SYNTHETIC original',sourceSentAt:null}],intended:1,unavailable:0,nextCursor:null,title:'Synthetic'};
async function fixture(run){const prior=globalThis.document;globalThis.document={createElement:t=>new Node(t),createElementNS:(ns,t)=>new Node(t,ns),documentElement:{lang:'en'}};try{let token=0,closed=0,reads=[];const content=new Node('div'),heading=new Node('h2'),close=new Node('button'),host={open(){const own=++token;return()=>own===token;},close(){++token;closed++;}},dialog={dataset:{},querySelector:s=>s==='h2'?heading:close};const surface=new OriginalSurface({dialog,content,host,read:async()=>structuredClone(page)});await surface.open(page.target);await run({surface,content,host,closed:()=>closed,setRead:fn=>surface.read=fn});}finally{globalThis.document=prior;}}
// open captures the real read dependency; each case installs it before opening.
for(const changed of ['same','source','body','scope','unavailable','partial','failure'])test('qualified Original protection refresh '+changed,()=>fixture(async f=>{
 const held=deferred(),started=deferred();let calls=0;f.setRead(async()=>{if(++calls===1)return structuredClone(page);started.resolve();return held.promise;});await f.surface.open(page.target);const nodes=[...f.content.children];
 assert.equal(f.surface.retainProtectedInput(),true);await started.promise;let next=structuredClone({...page,generation:2});
 if(changed==='source')next.records[0].id='other';if(changed==='body')next.records[0].originalText='Changed source';if(changed==='scope')next.target.ref='other';if(changed==='unavailable')next.availability='unavailable';if(changed==='partial')next.nextCursor={offset:1};
 if(changed==='failure')next=null;held.resolve(next);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.closed(),changed==='same'?0:1);if(changed==='same')assert.deepEqual(f.content.children,nodes);
}));
for(const transition of ['close','replacement','second-protection'])test('held Original refresh cannot revive after '+transition,()=>fixture(async f=>{
 const held=deferred(),started=deferred();let calls=0;f.setRead(async()=>{if(++calls===1)return structuredClone(page);if(calls===2){started.resolve();return held.promise;}return {...structuredClone(page),records:[]};});await f.surface.open(page.target);
 assert.equal(f.surface.retainProtectedInput(),true);await started.promise;
 if(transition==='close')f.host.close();else if(transition==='replacement')await f.surface.open({kind:'conversation',ref:'other'});else f.surface.retainProtectedInput();
 await new Promise(resolve=>setImmediate(resolve));const before=f.closed();held.resolve({...structuredClone(page),generation:99});await new Promise(resolve=>setImmediate(resolve));assert.equal(f.closed(),before,'late read neither reopens nor closes a replacement');
 if(transition==='second-protection')assert.equal(before,1);
}));
test('protection during initial Source read waits for its qualified identity',()=>fixture(async f=>{
 const initial=deferred(),fresh=deferred();let reads=0;f.setRead(async()=>++reads===1?initial.promise:fresh.promise);const opening=f.surface.open(page.target);assert.equal(f.surface.retainProtectedInput(),true);assert.equal(reads,1);initial.resolve(structuredClone(page));await opening;await new Promise(resolve=>setImmediate(resolve));assert.equal(reads,2);fresh.resolve({...structuredClone(page),generation:2});await new Promise(resolve=>setImmediate(resolve));assert.equal(f.closed(),0);
}));

test('copy uses newly qualified generation only after exact complete Source comparison',()=>fixture(async f=>{
 let calls=0;const seen=[];f.setRead(async request=>{seen.push(request);return {...structuredClone(page),generation:++calls===1?1:2};});await f.surface.open(page.target);assert.equal(f.surface.retainProtectedInput(),true);await new Promise(resolve=>setImmediate(resolve));await f.content.children[3].onclick();assert.equal(seen[2].expectedGeneration,2);
}));
