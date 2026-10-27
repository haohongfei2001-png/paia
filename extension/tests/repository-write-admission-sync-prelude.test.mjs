import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {observeRepositoryWriteFence,requireRepositoryWriteFence} from '../core/idb-repository.js';

// Exercise the real unbound publication preparer: it returns an async null,
// not a substituted issuer or a fabricated selection/shadow authority.
test('write admission revokes observations before the real async prelude reaches open',async()=>{
 const {s}=await setup(),repository=s.repository,open=repository.open.bind(repository);
 const before=observeRepositoryWriteFence(repository);
 await repository.transaction(false,t=>t.get('meta','gate'));
 assert.equal(requireRepositoryWriteFence(repository,before),true,'readonly probes do not admit writers');
 let release,entered,opens=0;
 const held=new Promise(resolve=>{release=resolve;}),started=new Promise(resolve=>{entered=resolve;});
 repository.open=async()=>{opens++;entered();await held;return open();};
 const write=repository.transaction(true,t=>t.put('meta',{id:'synthetic-sync-admission',value:1}));
 try{
  assert.equal(opens,0,'the real preparer has yielded before open');
  assert.throws(()=>requireRepositoryWriteFence(repository,before),{code:'STALE_BASE'});
  assert.throws(()=>observeRepositoryWriteFence(repository),{code:'STALE_BASE'});
  await started;
  assert.throws(()=>observeRepositoryWriteFence(repository),{code:'STALE_BASE'});
  release();await write;
  assert.throws(()=>requireRepositoryWriteFence(repository,before),{code:'STALE_BASE'});
  assert.equal(requireRepositoryWriteFence(repository,observeRepositoryWriteFence(repository)),true);
 }finally{release();await write.catch(()=>{});repository.open=open;}
 assert.equal((await repository.transaction(false,t=>t.get('meta','synthetic-sync-admission'))).value,1);
});
