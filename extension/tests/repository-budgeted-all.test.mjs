import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {registerRepositoryWorkLimit} from '../core/idb-repository.js';
const range=()=>IDBKeyRange.bound('synthetic:scan:','synthetic:scan:\uffff');
const snapshot=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async name=>[name,await t.all(name)]))));
async function fixture(t,n=150){const {s}=await setup();t.after(()=>s.repository.close());await s.repository.transaction(true,async q=>{for(let i=0;i<n;i++)await q.put('meta',{id:'synthetic:scan:'+String(i).padStart(4,'0'),value:i});});return s;}
for(const indexed of [false,true])test('budgeted original all returns the complete '+(indexed?'indexed':'primary')+' range above one page',async t=>{
 const s=await fixture(t);if(indexed)await s.repository.transaction(true,async q=>{for(let i=0;i<150;i++)await q.put('revisions',{id:'synthetic:history:'+i,entityKey:'synthetic:history',sequence:i,listKey:['synthetic:history',i]});});
 const table=indexed?'revisions':'meta',index=indexed?'byList':undefined,key=indexed?IDBKeyRange.bound(['synthetic:history'],['synthetic:history',[]]):range(),expected=await s.repository.transaction(false,q=>q.all(table,index,key));assert.equal(expected.length,150);
 const actual=await s.repository.transaction(true,async q=>{registerRepositoryWorkLimit(s.repository,q);return q.all(table,index,key);});assert.deepEqual(actual,expected);
});
for(const kind of ['refs','bytes','caught','repeat'])test('budgeted all '+kind+' excess atomically rejects despite public metrics reset',async t=>{
 const s=await fixture(t,10),before=await snapshot(s);let caught=false;
 await assert.rejects(s.repository.transaction(true,async q=>{registerRepositoryWorkLimit(s.repository,q,{references:kind==='bytes'?4096:kind==='repeat'?16:6,bytes:kind==='bytes'?128:2*1024*1024});await q.put('meta',{id:'synthetic:rollback'});q.metrics.reads=0;q.metrics.writes=0;
 try{await q.all('meta',undefined,range());if(kind==='repeat'){q.metrics.reads=0;registerRepositoryWorkLimit(s.repository,q);await q.all('meta',undefined,range());}}catch(error){caught=true;if(kind!=='caught')throw error;}
 }),{code:'BNS_GROUP_RESOURCE_LIMIT'});assert.equal(caught,true);assert.deepEqual(await snapshot(s),before);
});
test('budgeted empty all returns an empty complete range',async t=>{const s=await fixture(t,0);assert.deepEqual(await s.repository.transaction(true,q=>{registerRepositoryWorkLimit(s.repository,q);return q.all('meta',undefined,range());}),[]);});
test('budgeted explicit oversized all remains refused and rollback is sticky',async t=>{const s=await fixture(t),before=await snapshot(s);await assert.rejects(s.repository.transaction(true,async q=>{registerRepositoryWorkLimit(s.repository,q);await q.put('meta',{id:'synthetic:rollback'});await q.all('meta',undefined,range(),129);}),{code:'BNS_GROUP_RESOURCE_LIMIT'});assert.deepEqual(await snapshot(s),before);});
test('ordinary all retains original complete and explicit-limit behavior',async t=>{const s=await fixture(t);assert.equal((await s.repository.transaction(false,q=>q.all('meta',undefined,range()))).length,150);assert.equal((await s.repository.transaction(false,q=>q.all('meta',undefined,range(),129))).length,129);});
