import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from './vendor/fake-indexeddb/build/esm/index.js';
import {ArchiveRepository,registerRepositoryWorkLimit,readOriginalCommittedTransactionWork} from '../core/idb-repository.js';

test('action-only put-result debit does not change ordinary original committed operand model',async t=>{
 const r=new ArchiveRepository({get:async()=>({}),set:async()=>{}},{indexedDB:new IDBFactory(),name:'SYNTHETIC-action-meter-ordinary'});await r.open();t.after(()=>r.close());
 const run=async length=>{let scope;const key='SYNTHETIC-'+ 'k'.repeat(length);await r.transaction(true,async tx=>{scope=tx;registerRepositoryWorkLimit(r,tx);assert.equal(await tx.put('meta',{id:key,value:1}),key);},['meta']);return readOriginalCommittedTransactionWork(r,scope);};
 const short=await run(20),long=await run(80);assert.equal(long.references,short.references);assert.equal(long.bytes-short.bytes,60,'ordinary result key remains under the original no-action model, not the action-only result debit');
});
