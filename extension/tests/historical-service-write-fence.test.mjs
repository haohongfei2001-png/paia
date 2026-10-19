import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {ArchiveRepository,observeRepositoryWriteFence,requireRepositoryWriteFence} from '../core/idb-repository.js';
const stale=fn=>assert.throws(fn,{code:'STALE_BASE'});
const gate=()=>{let release;const pending=new Promise(r=>release=r);return {pending,release};};

test('repository refusal token survives original readonly Source status but is private and owner-bound',async()=>{
 const {s,indexedDB,storage}=await setup();await s.finishFoundation();const repository=s.repository,token=observeRepositoryWriteFence(repository);
 await s.status();await repository.transaction(false,t=>t.get('meta','gate'));
 assert.equal(requireRepositoryWriteFence(repository,token),true);stale(()=>requireRepositoryWriteFence(repository,{}));stale(()=>requireRepositoryWriteFence(repository,structuredClone(token)));
 const other=new ArchiveRepository(storage,{indexedDB,ia:true,thoughtLibrary:true});await other.open();stale(()=>requireRepositoryWriteFence(other,token));await other.close();
 const bound=repository.db;repository.db={};stale(()=>requireRepositoryWriteFence(repository,token));repository.db=bound;
 assert.equal(requireRepositoryWriteFence(repository,token),true,'a forged public binding never mints another observation');
});

test('write admission invalidates synchronously before open, while concurrent writers drain independently',async()=>{
 const {s}=await setup(),repository=s.repository,open=repository.open.bind(repository),first=gate(),second=gate();let calls=0;
 repository.open=async()=>{await (++calls===1?first.pending:second.pending);return open();};
 const token=observeRepositoryWriteFence(repository),a=repository.transaction(true,t=>t.put('meta',{id:'synthetic-fence-a'})),b=repository.transaction(true,t=>t.put('meta',{id:'synthetic-fence-b'}));
 stale(()=>requireRepositoryWriteFence(repository,token));stale(()=>observeRepositoryWriteFence(repository));
 first.release();await a;stale(()=>observeRepositoryWriteFence(repository),'the second admitted writer is still pending');
 second.release();await b;repository.open=open;stale(()=>requireRepositoryWriteFence(repository,token));assert.equal(requireRepositoryWriteFence(repository,observeRepositoryWriteFence(repository)),true);
});

test('nested writer and aborted outer transaction cannot clear each other or revive old observations',async()=>{
 const {s}=await setup(),repository=s.repository,open=repository.open.bind(repository),hold=gate();let calls=0,nested;
 repository.open=async()=>{if(++calls===2)await hold.pending;return open();};
 const token=observeRepositoryWriteFence(repository),outer=repository.transaction(true,async t=>{
  await t.put('meta',{id:'synthetic-outer-rollback'});nested=repository.transaction(true,t=>t.put('meta',{id:'synthetic-inner'}));throw Error('SYNTHETIC rollback');
 });
 await assert.rejects(outer,{code:'STORAGE_FAILED'});stale(()=>observeRepositoryWriteFence(repository));hold.release();await nested;repository.open=open;
 stale(()=>requireRepositoryWriteFence(repository,token));assert.equal(await repository.transaction(false,t=>t.get('meta','synthetic-outer-rollback')),undefined);assert.equal(requireRepositoryWriteFence(repository,observeRepositoryWriteFence(repository)),true);
});

for(const stage of ['open','native-creation','callback','finalizer'])test(`failed ${stage} write releases activity without restoring stale tokens`,async()=>{
 const {s}=await setup(),repository=s.repository,token=observeRepositoryWriteFence(repository),open=repository.open,db=repository.db,transaction=db.transaction;
 if(stage==='open')repository.open=async()=>{throw Error('SYNTHETIC open failure');};
 if(stage==='native-creation')db.transaction=()=>{throw Error('SYNTHETIC transaction failure');};
 await assert.rejects(repository.transaction(true,async t=>{
  if(stage==='callback')throw Error('SYNTHETIC callback failure');
  if(stage==='finalizer'){await t.put('meta',{id:'synthetic-backup-fence'});t.backupChanged=true;const put=t.put.bind(t);t.put=(name,row)=>{if(name==='meta'&&row.id==='backup-data-generation')throw Error('SYNTHETIC finalizer failure');return put(name,row);};}
 }));
 repository.open=open;db.transaction=transaction;
 stale(()=>requireRepositoryWriteFence(repository,token));assert.equal(requireRepositoryWriteFence(repository,observeRepositoryWriteFence(repository)),true);
});

test('close and reopen invalidate old observations even without a content write',async()=>{
 const {s}=await setup(),repository=s.repository,token=observeRepositoryWriteFence(repository);await repository.close();stale(()=>observeRepositoryWriteFence(repository));stale(()=>requireRepositoryWriteFence(repository,token));
 await repository.open();stale(()=>requireRepositoryWriteFence(repository,token));assert.equal(requireRepositoryWriteFence(repository,observeRepositoryWriteFence(repository)),true);
});
