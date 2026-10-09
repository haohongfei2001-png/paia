import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {local} from './harness/thought-m1.mjs';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {BrowserNativeSyncCore,sealOperation} from '../core/browser-native-sync/core.js';
import {HumanLibrarySyncJournal} from '../core/browser-native-sync/human-library-journal.js';
import {humanPlanEntry,captureHumanBranchSemanticWitness as captureWitness,revalidateHumanBranchSemanticWitness as revalidate,executeHumanPlan} from '../core/browser-native-sync/human-library-plan.js';
import {prefix} from '../core/thought-model.js';
import {prepareGroupCheckpointPlan} from '../core/browser-native-sync/group-checkpoint-plan.js';
import {prepareHumanBranchRetention,prepareHumanBranchRetentionRetry,claimHumanBranchRetention,requireHumanBranchRetentionInTransaction,finishHumanBranchRetention} from '../core/browser-native-sync/human-library-plan.js';
import {hashText} from '../core/dedupe.js';
import {humanWireRequestDigest} from '../core/browser-native-sync/human-library-request.js';
import {clone} from '../core/browser-native-sync/value.js';
globalThis.IDBKeyRange=IDBKeyRange;
const op=()=>crypto.randomUUID();
const snapshot=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async n=>[n,await t.all(n)]))));
const latestGroup=async(core,id)=>{const rows=[];for await(const r of core.rows('revision'))if(!r.redacted)rows.push(r.operation);const d=rows.filter(r=>r.type==='humanLibraryCommit'&&r.deviceId===core.deviceId&&r.value.request.id===id).sort((a,b)=>a.sequence-b.sequence).at(-1);return d?[...d.value.members.map(ref=>rows.find(r=>r.revisionId===ref.revisionId)),d]:null;};
const allGroups=async core=>{const rows=[];for await(const r of core.rows('revision'))if(!r.redacted)rows.push(r.operation);return rows.filter(r=>r.type==='humanLibraryCommit').sort((a,b)=>a.sequence-b.sequence).map(d=>[...d.value.members.map(ref=>rows.find(r=>r.revisionId===ref.revisionId)),d]);};
async function device(id){let tick=0;const s=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory(),clock:()=>new Date(Date.UTC(2026,9,9)+tick++).toISOString()});await s.consent(true);await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic-historical-body',deviceId:id});s.humanLibraryJournal=new HumanLibrarySyncJournal(core);return {s,core};}
async function capture(s,core,id){const base=await humanPlanEntry(s,core);return {base,read:await s.repository.transaction(false,async t=>{const page=await t.rangePage('revisions','byList',prefix(['library_entry:'+id]),null,129);assert.equal(page.next,null);return {row:await t.get('thoughts',id),history:page.rows.map(x=>x.value),placements:await t.count('placements','byEntry',prefix([id])),placementRows:[],topics:[],epoch:(await t.get('meta','thought-epoch'))?.value||0,provenance:await t.count('provenance','byOwner',prefix(['entry',id])),dependencies:await t.count('dependencies','byTarget',prefix(['entry',id]))};})};}
async function scenario({parent='create',offset=false,incomingNoDelta=false,afterParentUnrelated=false,padding='',extraEdits=0}={}){
 const a=await device('synthetic-history-a'),b=await device('synthetic-history-b');if(offset)await b.s.createEntry({actor:'user',body:'SYNTHETIC unrelated receiver counter',type:'idea',formation:'explicit',evidence:[],operationId:op()});
 const entry=await a.s.createEntry({actor:'user',body:'SYNTHETIC historical baseline 汉字'+padding,type:'idea',formation:'explicit',evidence:[],operationId:op()});let revision=0;
 if(parent!=='create'){await a.s.editEntry({id:entry.id,expectedRevision:revision++,changes:{body:'SYNTHETIC common parent first'},operationId:op()});if(parent==='coalesced')await a.s.editEntry({id:entry.id,expectedRevision:revision++,changes:{body:'SYNTHETIC common parent coalesced'},operationId:op()});if(parent==='no-delta')await a.s.editEntry({id:entry.id,expectedRevision:revision,changes:{body:'SYNTHETIC common parent first'},operationId:op()});}
 for(let i=0;i<extraEdits;i++)await a.s.editEntry({id:entry.id,expectedRevision:revision++,changes:{body:'SYNTHETIC extra parent '+i},operationId:op()});
 for(const group of await allGroups(a.core))assert.equal((await b.s.humanLibraryJournal.receive(b.s,group)).state,'applied');
 const oracle=await capture(b.s,b.core,entry.id);if(afterParentUnrelated)await b.s.createEntry({actor:'user',body:'SYNTHETIC later unrelated history counter',type:'idea',formation:'explicit',evidence:[],operationId:op()});const body=incomingNoDelta?oracle.read.row.thoughtText:'SYNTHETIC lawful branch A 🧠';
 await a.s.editEntry({id:entry.id,expectedRevision:revision,changes:{body},operationId:op()});const incoming=await latestGroup(a.core,entry.id);
 await b.s.editEntry({id:entry.id,expectedRevision:revision,changes:{body:'SYNTHETIC current canonical branch B'},operationId:op()});return {a,b,id:entry.id,incoming,oracle};
}

import {requireRepositoryTransactionScope,awaitRepositoryTransactionSettled,requireRepositoryTransactionCommitted} from '../core/idb-repository.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
const turn=()=>new Promise(resolve=>setImmediate(resolve));

test('original owner exact identity rejects aliases, proxies, changed tx and foreign owner, retaining ordinary reads/writes',async()=>{
 const f=await scenario();let old,identity;
 await f.b.s.repository.transaction(true,async t=>{
  old=t;identity=requireRepositoryTransactionScope(f.b.s.repository,t);assert.equal(identity.mode,'readwrite');assert.equal(identity.database,t.tx.db);assert.equal(Object.isFrozen(identity),true);
  for(const wrong of [Object.create(t),new Proxy(t,{})])assert.throws(()=>requireRepositoryTransactionScope(f.b.s.repository,wrong),{code:'BNS_HUMAN_RETENTION_REQUIRED'});
  assert.throws(()=>requireRepositoryTransactionScope(f.a.s.repository,t),{code:'BNS_HUMAN_RETENTION_REQUIRED'});
  const native=t.tx;t.tx=new Proxy(native,{});assert.throws(()=>requireRepositoryTransactionScope(f.b.s.repository,t),{code:'BNS_HUMAN_RETENTION_REQUIRED'});t.tx=native;
  await t.put('meta',{id:'synthetic-owner-ordinary',value:true});assert.equal((await t.get('meta','synthetic-owner-ordinary')).value,true);
 });
 assert.throws(()=>requireRepositoryTransactionScope(f.b.s.repository,old),{code:'BNS_HUMAN_RETENTION_REQUIRED'});
 assert.equal(await awaitRepositoryTransactionSettled(f.b.s.repository,old),undefined);
 await assert.rejects(awaitRepositoryTransactionSettled(f.a.s.repository,old),{code:'BNS_HUMAN_RETENTION_REQUIRED'});
 await assert.rejects(awaitRepositoryTransactionSettled(f.b.s.repository,Object.create(old)),{code:'BNS_HUMAN_RETENTION_REQUIRED'});
 await f.b.s.repository.transaction(false,t=>{const current=requireRepositoryTransactionScope(f.b.s.repository,t);assert.equal(current.mode,'readonly');assert.notEqual(current.token,identity.token);});
});

test('owner settlement waits for aborted native transaction AND authentic callback unwind',async()=>{
 const f=await scenario(),hold=deferred(),entered=deferred(),aborted=deferred();let scope;
 const transaction=f.b.s.repository.transaction(true,async t=>{scope=t;entered.resolve();await t.put('meta',{id:'synthetic-owner-abort',value:true});t.tx.addEventListener('abort',aborted.resolve,{once:true});t.tx.abort();await hold.promise;throw Error('synthetic callback unwound');});
 const caught=transaction.catch(error=>error);await entered.promise;let settled=false;
 const waiting=awaitRepositoryTransactionSettled(f.b.s.repository,scope).then(()=>{settled=true;});
 await aborted.promise;assert.equal(settled,false,'native abort alone cannot release a live callback');
 assert.throws(()=>requireRepositoryTransactionScope(f.b.s.repository,scope),{code:'BNS_HUMAN_RETENTION_REQUIRED'});
 hold.resolve();assert.equal((await caught).code,'STORAGE_FAILED');await waiting;assert.equal(settled,true);
 assert.equal(await f.b.s.repository.transaction(false,t=>t.get('meta','synthetic-owner-abort')),undefined);
});

test('callback failure preserves owner rollback and waits to expose closed settlement',async()=>{
 const f=await scenario(),before=await snapshot(f.b.s);let scope;
 await assert.rejects(f.b.s.repository.transaction(true,async t=>{scope=t;await t.put('meta',{id:'synthetic-owner-fail',value:true});throw Error('synthetic failure');}),{code:'STORAGE_FAILED'});
 await awaitRepositoryTransactionSettled(f.b.s.repository,scope);assert.deepEqual(await snapshot(f.b.s),before);
 assert.throws(()=>requireRepositoryTransactionScope(f.b.s.repository,scope),{code:'BNS_HUMAN_RETENTION_REQUIRED'});
});

test('retention opening rejects reentrant local materialization during first binding await',async()=>{
 const f=await scenario(),w=await captureWitness(f.b.s,f.b.core,f.incoming),p=await prepareHumanBranchRetention(f.b.s,f.b.core,w),before=await snapshot(f.b.s);
 let entered=false,calls=0;const bind=f.b.core.bind.bind(f.b.core),apply=f.b.core.applyInTransaction.bind(f.b.core);
 f.b.core.materialize=async()=>{calls++;};
 f.b.core.bind=async t=>{if(!entered){entered=true;await assert.rejects(apply(t,f.incoming.at(-1),{origin:'local',materialize:true}),{code:'BNS_HUMAN_RETENTION_REQUIRED'});}return bind(t);};
 assert.deepEqual(await f.b.core.retainHumanBranch(p),{state:'retained-conflict'});assert.equal(entered,true);assert.equal(calls,0);assert.notDeepEqual(await snapshot(f.b.s),before);
});

async function wrappedFixture(kind){
 const f=await scenario(),original=f.b.s.repository.transaction.bind(f.b.s.repository),entered=deferred(),release=deferred();let armed=false,late,pending,scope;
 f.b.s.repository.transaction=(write,fn,stores)=>{
  if(!armed||!write)return original(write,fn,stores);
  if(kind==='before'){late=()=>original(write,fn,stores);return Promise.resolve({state:'retained-conflict'});}
  pending=original(write,t=>{scope=t;const result=fn(t);entered.resolve();return result;},stores);pending.catch(()=>{});
  return entered.promise.then(()=>({state:'retained-conflict'}));
 };
 const core=new BrowserNativeSyncCore(f.b.s.repository,{datasetId:f.b.core.datasetId,deviceId:f.b.core.deviceId});f.b.core=core;f.b.s.humanLibraryJournal=new HumanLibrarySyncJournal(core);
 const w=await captureWitness(f.b.s,core,f.incoming),p=await prepareHumanBranchRetention(f.b.s,core,w),before=await snapshot(f.b.s),bind=core.bind.bind(core);
 if(kind==='after')core.bind=async t=>{await release.promise;return bind(t);};
 armed=true;return {f,p,before,original,entered,release,late:()=>late(),pending:()=>pending,scope:()=>scope};
}

test('wrapper return before any authentic callback permanently consumes and rejects a late callback',async()=>{
 const x=await wrappedFixture('before');await assert.rejects(x.f.b.core.retainHumanBranch(x.p),{code:'BNS_HUMAN_RETENTION_REQUIRED'});
 await assert.rejects(x.late(),{code:'BNS_HUMAN_RETENTION_REQUIRED'});
 await assert.rejects(x.f.b.core.retainHumanBranch(x.p),{code:'BNS_HUMAN_RETENTION_REQUIRED'});
 x.f.b.s.repository.transaction=x.original;assert.deepEqual(await snapshot(x.f.b.s),x.before);
});

test('wrapper early return after authentic opening keeps ownership until callback and native settlement',async()=>{
 const x=await wrappedFixture('after');let ended=false;
 const result=x.f.b.core.retainHumanBranch(x.p).then(()=>{ended=true;return null;},error=>{ended=true;return error;});await x.entered.promise;await turn();
 assert.equal(ended,false,'outer cleanup cannot trust the early public promise');
 await assert.rejects(captureWitness(x.f.b.s,x.f.b.core,x.f.incoming),{code:'BNS_HUMAN_BRANCH_BUSY'});
 x.release.resolve();assert.equal((await result).code,'BNS_HUMAN_RETENTION_REQUIRED');await x.pending().catch(()=>{});
 await awaitRepositoryTransactionSettled(x.f.b.s.repository,x.scope());x.f.b.s.repository.transaction=x.original;assert.deepEqual(await snapshot(x.f.b.s),x.before);
});

test('private native completion observer survives public event property replacement',async()=>{
 const f=await scenario();let scope,publicComplete=false;
 await f.b.s.repository.transaction(true,async t=>{scope=t;t.tx.oncomplete=()=>{publicComplete=true;};t.tx.onabort=()=>{};await t.put('meta',{id:'synthetic-owner-event',value:true});});
 await awaitRepositoryTransactionSettled(f.b.s.repository,scope);assert.equal(publicComplete,true);
 assert.equal((await f.b.s.repository.transaction(false,t=>t.get('meta','synthetic-owner-event'))).value,true);
});

test('original backup finalization failure aborts before owner settlement is exposed',async()=>{
 const f=await scenario(),before=await snapshot(f.b.s);let scope;
 await assert.rejects(f.b.s.repository.transaction(true,async t=>{scope=t;await t.put('meta',{id:'synthetic-owner-flush-failure',value:true});t.backupChanged=true;const get=t.get.bind(t);t.get=(store,id)=>{if(store==='meta'&&id==='backup-data-generation')throw Error('synthetic original backup-finalization fault');return get(store,id);};}),{code:'STORAGE_FAILED'});
 await awaitRepositoryTransactionSettled(f.b.s.repository,scope);assert.deepEqual(await snapshot(f.b.s),before);
});


test('commit evidence requires authentic completed original success, never pending, aborted or foreign scope',async()=>{
 const f=await scenario();let committed,aborted;
 await f.b.s.repository.transaction(true,async t=>{committed=t;assert.throws(()=>requireRepositoryTransactionCommitted(f.b.s.repository,t),{code:'BNS_HUMAN_RETENTION_REQUIRED'});await t.put('meta',{id:'synthetic-committed-evidence',value:true});});
 assert.equal(requireRepositoryTransactionCommitted(f.b.s.repository,committed),undefined);
 assert.throws(()=>requireRepositoryTransactionCommitted(f.a.s.repository,committed),{code:'BNS_HUMAN_RETENTION_REQUIRED'});
 assert.throws(()=>requireRepositoryTransactionCommitted(f.b.s.repository,Object.create(committed)),{code:'BNS_HUMAN_RETENTION_REQUIRED'});
 await assert.rejects(f.b.s.repository.transaction(true,async t=>{aborted=t;await t.put('meta',{id:'synthetic-aborted-evidence',value:true});t.tx.abort();}),{code:'STORAGE_FAILED'});
 await awaitRepositoryTransactionSettled(f.b.s.repository,aborted);assert.throws(()=>requireRepositoryTransactionCommitted(f.b.s.repository,aborted),{code:'BNS_HUMAN_RETENTION_REQUIRED'});
});

for(const mode of ['abort','finalizer','completed-then-throw'])test('public wrapper cannot mask original owner '+mode+' after authentic callback',async()=>{
 const f=await scenario(),repo=f.b.s.repository,original=repo.transaction.bind(repo);let armed=false,pending,scope;
 repo.transaction=(write,fn,stores)=>{
  if(!armed||!write)return original(write,fn,stores);
  const returned=deferred();pending=original(write,async t=>{
   scope=t;const result=await fn(t);
   if(mode==='abort')t.tx.abort();
   if(mode==='finalizer'){t.backupChanged=true;const get=t.get.bind(t);t.get=(store,key)=>{if(store==='meta'&&key==='backup-data-generation')throw Error('synthetic failed original finalization');return get(store,key);};}
   returned.resolve(result);
   if(mode==='completed-then-throw'){await new Promise(resolve=>t.tx.addEventListener('complete',resolve,{once:true}));throw Error('synthetic original callback failed after native completed');}
   return result;
  },stores).then(value=>({ok:true,value}),error=>({ok:false,code:error.code}));
  return returned.promise;
 };
 const core=new BrowserNativeSyncCore(repo,{datasetId:f.b.core.datasetId,deviceId:f.b.core.deviceId});f.b.s.humanLibraryJournal=new HumanLibrarySyncJournal(core);
 const witness=await captureWitness(f.b.s,core,f.incoming),plan=await prepareHumanBranchRetention(f.b.s,core,witness),before=await snapshot(f.b.s);armed=true;
 await assert.rejects(core.retainHumanBranch(plan),{code:'BNS_HUMAN_RETENTION_REQUIRED'});assert.deepEqual(await pending,{ok:false,code:'STORAGE_FAILED'});
 await awaitRepositoryTransactionSettled(repo,scope);assert.throws(()=>requireRepositoryTransactionCommitted(repo,scope),{code:'BNS_HUMAN_RETENTION_REQUIRED'});
 repo.transaction=original;armed=false;
 if(mode==='completed-then-throw'){
  assert.notDeepEqual(await snapshot(f.b.s),before);const durable=await snapshot(f.b.s);
  assert.deepEqual(await f.b.s.humanLibraryJournal.retainSibling(f.b.s,f.incoming),{state:'duplicate',materialization:'not-reapplied'});assert.deepEqual(await snapshot(f.b.s),durable);
 }else assert.deepEqual(await snapshot(f.b.s),before);
});

test('normal original commit and exact duplicate both have completed owner evidence',async()=>{
 const f=await scenario(),repo=f.b.s.repository,original=repo.transaction.bind(repo),scopes=[];
 repo.transaction=(write,fn,stores)=>original(write,async t=>{if(write)scopes.push(t);return fn(t);},stores);
 const core=new BrowserNativeSyncCore(repo,{datasetId:f.b.core.datasetId,deviceId:f.b.core.deviceId});f.b.s.humanLibraryJournal=new HumanLibrarySyncJournal(core);
 assert.deepEqual(await f.b.s.humanLibraryJournal.retainSibling(f.b.s,f.incoming),{state:'retained-conflict'});assert.equal(requireRepositoryTransactionCommitted(repo,scopes.at(-1)),undefined);
 const durable=await snapshot(f.b.s);assert.deepEqual(await f.b.s.humanLibraryJournal.retainSibling(f.b.s,f.incoming),{state:'duplicate',materialization:'not-reapplied'});
 assert.equal(requireRepositoryTransactionCommitted(repo,scopes.at(-1)),undefined);assert.deepEqual(await snapshot(f.b.s),durable);
});
