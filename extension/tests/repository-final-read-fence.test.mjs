import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,raw} from './harness/topic-02.mjs';
import {registerRepositoryFinalReadFence} from '../core/idb-repository.js';

const marker='test:terminal-write',proof='test:terminal-proof';
const expectProof=function*(expected){assert.deepEqual(yield {method:'get',table:'meta',key:proof},expected);return true;};
async function setup(){const f=await fixture();await f.s.repository.transaction(true,t=>t.put('meta',{id:proof,value:'original'}));return f;}
async function unchanged(f){assert.equal(await raw(f.s,'meta',marker),undefined);assert.deepEqual(await raw(f.s,'meta',proof),{id:proof,value:'original'});}

test('original closed terminal read plan permits legal owner writes and runs after actual finalizers',async()=>{
 const f=await setup();try{let final=false,checks=0;const before=await raw(f.s,'meta','backup-data-generation');
 await f.s.repository.transaction(true,async t=>{const put=t.put.bind(t);t.put=async(n,r,...a)=>{const result=await put(n,r,...a);if(n==='meta'&&r.id==='backup-data-generation')final=true;return result;};await t.put('operationReceipts',{id:marker});
 registerRepositoryFinalReadFence(f.s.repository,t,{isCurrent:()=>{checks++;return true;},plan:function*(){assert.equal(final,true);const row=yield {method:'get',table:'meta',key:'backup-data-generation'};assert.equal(row.value,(before?.value||0)+1);return true;}});});
 assert.ok(checks>=4);assert.equal((await raw(f.s,'operationReceipts',marker)).id,marker);
 }finally{await f.s.repository.close();}
});
for(const method of ['put','delete','clear'])test('terminal '+method+' rejection remains sticky when a second fence catches it',async()=>{
 const f=await setup();try{let first=false,caught=false;await assert.rejects(f.s.repository.transaction(true,async t=>{
 await t.put('meta',{id:marker});registerRepositoryFinalReadFence(f.s.repository,t,{isCurrent:()=>true,plan:function*(){yield*expectProof({id:proof,value:'original'});first=true;return true;}});
 registerRepositoryFinalReadFence(f.s.repository,t,{isCurrent:()=>true,plan:function*(){assert.equal(first,true);const p=method==='put'?t.put('meta',{id:proof,value:'evil'}):method==='delete'?t.delete('meta',proof):t.clear('meta');p.catch(()=>{caught=true;});return true;}});
 }));assert.equal(caught,true);await unchanged(f);}finally{await f.s.repository.close();}
});
for(const mode of ['async-plan','async-step','async-current','truthy-current','throw-current'])test('terminal rejects '+mode+' before a non-IDB promise can commit',async()=>{
 const f=await setup();try{let entered=false;await assert.rejects(f.s.repository.transaction(true,async t=>{
 await t.put('meta',{id:marker});const plan=mode==='async-plan'?async()=>{entered=true;await new Promise(r=>setTimeout(r,10));return true;}:mode==='async-step'?async function*(){entered=true;await new Promise(r=>setTimeout(r,10));return true;}:function*(){entered=true;return true;};
 const isCurrent=mode==='async-current'?async()=>true:mode==='truthy-current'?()=>({current:true}):mode==='throw-current'?()=>{throw Error('revoked');}:()=>true;
 registerRepositoryFinalReadFence(f.s.repository,t,{plan,isCurrent});
 }));await unchanged(f);if(mode.startsWith('async-')&&!mode.endsWith('current'))assert.equal(entered,true);}finally{await f.s.repository.close();}
});
test('late terminal registration cannot replace an already checked first fence even when caught',async()=>{
 const f=await setup();try{let caught=false;await assert.rejects(f.s.repository.transaction(true,async t=>{await t.put('meta',{id:marker});registerRepositoryFinalReadFence(f.s.repository,t,{isCurrent:()=>true,plan:function*(){yield*expectProof({id:proof,value:'original'});try{registerRepositoryFinalReadFence(f.s.repository,t,{isCurrent:()=>true,plan:function*(){return true;}});}catch{caught=true;}return true;}});}));assert.equal(caught,true);await unchanged(f);}finally{await f.s.repository.close();}
});
test('completed, foreign, copied and readonly scopes never register a terminal capability',async()=>{
 const f=await setup(),other=await setup();const config={isCurrent:()=>true,plan:function*(){return true;}};try{let prior;await f.s.repository.transaction(true,t=>{prior=t;});assert.throws(()=>registerRepositoryFinalReadFence(f.s.repository,prior,config));assert.throws(()=>registerRepositoryFinalReadFence(other.s.repository,prior,config));assert.throws(()=>registerRepositoryFinalReadFence(f.s.repository,{...prior},config));await assert.rejects(f.s.repository.transaction(false,t=>registerRepositoryFinalReadFence(f.s.repository,t,config)));await unchanged(f);}finally{await f.s.repository.close();await other.s.repository.close();}
});
test('all prior synchronous currentness predicates are checked after the final second-fence read',async()=>{
 const f=await setup();try{let current=true;await assert.rejects(f.s.repository.transaction(true,async t=>{await t.put('meta',{id:marker});registerRepositoryFinalReadFence(f.s.repository,t,{isCurrent:()=>current,plan:function*(){return true;}});registerRepositoryFinalReadFence(f.s.repository,t,{isCurrent:()=>true,plan:function*(){yield {method:'get',table:'meta',key:proof};current=false;return true;}});}));await unchanged(f);}finally{await f.s.repository.close();}
});
test('exact primary range count is bounded metadata and does not count the whole store',async()=>{
 const f=await setup();try{await f.s.repository.transaction(true,t=>{registerRepositoryFinalReadFence(f.s.repository,t,{isCurrent:()=>true,plan:function*(){const count=yield {method:'count',table:'meta',key:IDBKeyRange.bound('test:terminal-proof','test:terminal-proof\uffff')};assert.equal(count,1);return true;}});});}finally{await f.s.repository.close();}
});
test('late finalizer registration refusal is sticky outside the owner callback',async()=>{
 const f=await setup();try{let caught=false;await assert.rejects(f.s.repository.transaction(true,async t=>{const put=t.put.bind(t);t.put=async(n,r,...a)=>{const result=await put(n,r,...a);if(n==='meta'&&r.id==='backup-data-generation')try{registerRepositoryFinalReadFence(f.s.repository,t,{isCurrent:()=>true,plan:function*(){return true;}});}catch{caught=true;}return result;};await t.put('operationReceipts',{id:marker});}));assert.equal(caught,true);assert.equal(await raw(f.s,'operationReceipts',marker),undefined);}finally{await f.s.repository.close();}
});
for(const method of ['get','all','count','putDerivedSearchRow'])test('terminal comparator cannot escape the closed plan via '+method,async()=>{
 const f=await setup();try{let caught=false;await assert.rejects(f.s.repository.transaction(true,async t=>{await t.put('meta',{id:marker});registerRepositoryFinalReadFence(f.s.repository,t,{isCurrent:()=>true,plan:function*(){const escaped=method==='get'?t.get('meta',proof):method==='all'?t.all('records'):method==='count'?t.count('records'):t.putDerivedSearchRow('topics',{id:'missing'});escaped.catch(()=>{caught=true;});return true;}});}));assert.equal(caught,true);await unchanged(f);}finally{await f.s.repository.close();}
});
test('an unbounded all request is not a supported closed terminal operation',async()=>{
 const f=await setup();try{await assert.rejects(f.s.repository.transaction(true,async t=>{await t.put('meta',{id:marker});registerRepositoryFinalReadFence(f.s.repository,t,{isCurrent:()=>true,plan:function*(){yield {method:'all',table:'records'};return true;}});}));await unchanged(f);}finally{await f.s.repository.close();}
});
test('a registered scope cannot replace its original native transaction behind a closed get',async()=>{
 const f=await setup();try{await assert.rejects(f.s.repository.transaction(true,async t=>{await t.put('meta',{id:marker});registerRepositoryFinalReadFence(f.s.repository,t,{isCurrent:()=>true,plan:function*(){const original=t.tx;t.tx={objectStore:original.objectStore.bind(original)};yield*expectProof({id:proof,value:'original'});return true;}});}));await unchanged(f);}finally{await f.s.repository.close();}
});

for(const mode of ['accessor','inherited','symbol'])test('closed terminal specs reject '+mode+' properties without acquiring their value',async()=>{
 const f=await setup();try{let touched=0;await assert.rejects(f.s.repository.transaction(true,async t=>{await t.put('meta',{id:marker});registerRepositoryFinalReadFence(f.s.repository,t,{isCurrent:()=>true,plan:function*(){let spec={method:'get',table:'meta',key:proof};if(mode==='accessor')Object.defineProperty(spec,'key',{enumerable:true,get(){touched++;return proof;}});if(mode==='inherited')spec=Object.create(spec);if(mode==='symbol')spec[Symbol('unsupported')]=true;yield spec;return true;}});}));assert.equal(touched,0);await unchanged(f);}finally{await f.s.repository.close();}
});
