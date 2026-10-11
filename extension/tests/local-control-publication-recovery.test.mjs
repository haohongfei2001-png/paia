import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {STORAGE_KEY} from '../core/constants.js';
import {CONTROL_PUBLICATION_RESERVATION as LEASE,CONTROL_PUBLICATION_REVISION as REVISION} from '../core/local-control-publication.js';
globalThis.IDBKeyRange=IDBKeyRange;
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function fixture(t){
 const data={},indexedDB=new IDBFactory(),name='synthetic-publication-recovery-'+crypto.randomUUID(),instances=[];let fault=null,sets=0;
 const local={async get(key){return {[key]:structuredClone(data[key])};},async set(value){sets++;if(fault==='unknown')throw Error('synthetic outcome unknown');Object.assign(data,structuredClone(value));}};
 const fresh=()=>{const s=new LibraryDocumentsStore(local,{indexedDB,name});instances.push(s);return s;},s=fresh();
 await s.consent(true);await s.capture({epoch:(await s.status()).epoch,adapterVersion:'0.3.0',chat:{id:'publication-recovery',url:'https://chatgpt.com/c/publication-recovery',title:'Synthetic'},messages:[{sourceMessageId:'publication-recovery-1',pageOrder:1,originalText:'SYNTHETIC original stays unchanged'}]});await s.finishFoundation();
 t.after(()=>{for(const instance of instances)instance.repository.db?.close();});
 const rows=()=>s.repository.transaction(false,async tx=>Object.fromEntries(await Promise.all(s.repository.stores.map(async name=>[name,await tx.all(name)]))));
 const meta=id=>s.repository.transaction(false,tx=>tx.get('meta',id),['meta']);
 return {s,fresh,data,local,rows,meta,sets:()=>sets,fault:value=>fault=value};
}
async function interrupted(f,phase,operation=()=>f.s.updatePreferences({appearance:'dark'})){
 if(phase==='undispatched'){const publish=f.s.publish;f.s.publish=async()=>{throw Error('synthetic stop before prepared');};try{await assert.rejects(operation(),/synthetic stop/);}finally{f.s.publish=publish;}}
 else if(phase==='visible'){
  const transaction=f.s.repository.transaction;let stopped=false;
  f.s.repository.transaction=function(write,fn,stores){return transaction.call(this,write,async tx=>{const remove=tx.delete;tx.delete=function(name,key){if(!stopped&&name==='meta'&&key===LEASE){stopped=true;throw Error('synthetic stop after SDK before settlement');}return remove.call(this,name,key);};return fn(tx);},stores);};
  try{await assert.rejects(operation(),{code:'STORAGE_FAILED'});assert.equal(stopped,true);}finally{f.s.repository.transaction=transaction;}
 }else{f.fault('unknown');try{await assert.rejects(operation(),/synthetic outcome unknown/);}finally{f.fault(null);}}
 assert.ok(await f.meta(LEASE));
}
const withoutLease=rows=>({...rows,meta:rows.meta.filter(row=>row.id!==LEASE)});
test('startup without a lease has no canonical or SDK writes',async t=>{
 const f=await fixture(t),before=await f.rows(),local=structuredClone(f.data),sets=f.sets();assert.deepEqual(await f.fresh().recoverControlPublication(),{state:'absent'});assert.deepEqual(await f.rows(),before);assert.deepEqual(f.data,local);assert.equal(f.sets(),sets);
});
for(const phase of ['undispatched','visible'])test('cold original publisher resolves only proven '+phase+' boundary without replay',async t=>{
 const f=await fixture(t);await interrupted(f,phase);const before=await f.rows(),local=structuredClone(f.data),sets=f.sets(),revision=await f.meta(REVISION),cold=f.fresh();
 await assert.rejects(cold.setEnabled(false),{code:'CONTROL_PUBLICATION_PENDING'});assert.deepEqual(await f.rows(),before);
 assert.deepEqual(await cold.recoverControlPublication(),{state:phase==='undispatched'?'cancelled-undispatched':'settled-visible'});assert.deepEqual(await f.rows(),withoutLease(before));assert.deepEqual(f.data,local);assert.equal(f.sets(),sets);assert.deepEqual(await f.meta(REVISION),revision);assert.equal(f.data[STORAGE_KEY].preferences.appearance,phase==='visible'?'dark':'system');
 await cold.updatePreferences({language:'en'});assert.equal(f.sets(),sets+1);assert.equal((await f.meta(REVISION)).revision,revision.revision+1);assert.equal(f.data[STORAGE_KEY].preferences.appearance,local[STORAGE_KEY].preferences.appearance);
});
test('unknown prepared SDK outcome remains held across cold startup and explicit retry',async t=>{
 const f=await fixture(t);await interrupted(f,'unknown');const before=await f.rows(),local=structuredClone(f.data),sets=f.sets(),cold=f.fresh();assert.deepEqual(await cold.recoverControlPublication(),{state:'pending'});await assert.rejects(cold.setEnabled(false),{code:'CONTROL_PUBLICATION_PENDING'});assert.deepEqual(await f.rows(),before);assert.deepEqual(f.data,local);assert.equal(f.sets(),sets);
});
test('an undispatched live predecessor loses its prepared CAS and cannot later reach the SDK',async t=>{
 const f=await fixture(t),entered=deferred(),release=deferred(),publish=f.s.publish;f.s.publish=async function(){entered.resolve();await release.promise;return publish.call(this);};const old=f.s.updatePreferences({appearance:'dark'});await entered.promise;const before=await f.rows(),sets=f.sets();assert.deepEqual(await f.fresh().recoverControlPublication(),{state:'cancelled-undispatched'});release.resolve();await assert.rejects(old,{code:'CONTROL_PUBLICATION_CHANGED'});assert.deepEqual(await f.rows(),withoutLease(before));assert.equal(f.sets(),sets);
});
test('cancelled undispatched pause preserves the restrictive original gate',async t=>{
 const f=await fixture(t);await interrupted(f,'undispatched',()=>f.s.setEnabled(false));const gate=await f.meta('gate'),cold=f.fresh(),local=structuredClone(f.data);assert.equal(gate.enabled,false);assert.deepEqual(await cold.recoverControlPublication(),{state:'cancelled-undispatched'});assert.deepEqual(await f.meta('gate'),gate);assert.deepEqual(f.data,local);assert.equal((await cold.status()).enabled,false,'old local enabled flag cannot override committed pause');
});
for(const phase of ['undispatched','visible'])for(const key of ['bns:consumer-preference-publication:pending','backup-recovery-settings'])test(phase+' never releases another recovery owner '+key,async t=>{
 const f=await fixture(t);await interrupted(f,phase);await f.s.repository.transaction(true,tx=>tx.put('meta',{id:key,synthetic:true}),['meta']);const before=await f.rows(),local=structuredClone(f.data),sets=f.sets();assert.deepEqual(await f.fresh().recoverControlPublication(),{state:'pending'});assert.deepEqual(await f.rows(),before);assert.deepEqual(f.data,local);assert.equal(f.sets(),sets);
});
for(const change of ['stamp','local-body','database','gate','epoch'])test('visible recovery refuses mismatched '+change+' without changing any owner',async t=>{
 const f=await fixture(t);await interrupted(f,'visible');
 if(change==='stamp')f.data[STORAGE_KEY].controlPublication.nonce=crypto.randomUUID();
 else if(change==='local-body')f.data[STORAGE_KEY].preferences.language='en';
 else if(change==='database')f.data[STORAGE_KEY].databaseId='synthetic-foreign';
 else await f.s.repository.transaction(true,tx=>tx.put('meta',change==='gate'?{id:'gate',epoch:999,enabled:false}:{id:'recovery-restore-epoch',value:'synthetic-foreign'}),['meta']);
 const before=await f.rows(),local=structuredClone(f.data),sets=f.sets();if(change==='database')await assert.rejects(f.fresh().recoverControlPublication(),{code:'STORAGE_FAILED'});else assert.deepEqual(await f.fresh().recoverControlPublication(),{state:'pending'});assert.deepEqual(await f.rows(),before);assert.deepEqual(f.data,local);assert.equal(f.sets(),sets);
});
test('a changed final transaction fence cannot delete a newer lease',async t=>{
 const f=await fixture(t);await interrupted(f,'visible');const cold=f.fresh();await cold.status();const original=cold.repository.transaction,local=structuredClone(f.data),sets=f.sets();let before;
 cold.repository.transaction=async function(write,fn,stores){if(write){await f.s.repository.transaction(true,async tx=>{const lease=await tx.get('meta',LEASE);await tx.put('meta',{...lease,nonce:crypto.randomUUID()});},['meta']);before=await f.rows();}return original.call(this,write,fn,stores);};
 assert.deepEqual(await cold.recoverControlPublication(),{state:'pending'});assert.deepEqual(await f.rows(),before);assert.deepEqual(f.data,local);assert.equal(f.sets(),sets);
});
test('a substituted SDK facade is refused without invoking it or altering the lease',async t=>{
 const f=await fixture(t);await interrupted(f,'visible');const cold=f.fresh();await cold.status();const before=await f.rows(),sets=f.sets();let called=0;cold.local={async get(){called++;throw Error('must not run');},set:f.local.set};await assert.rejects(cold.recoverControlPublication(),{code:'CONTROL_PUBLICATION_CHANGED'});assert.equal(called,0);assert.deepEqual(await f.rows(),before);assert.equal(f.sets(),sets);
});

for(const field of ['afterDigest','fenceDigest'])test('a half-prepared '+field+' lease remains held',async t=>{
 const f=await fixture(t);await interrupted(f,'undispatched');await f.s.repository.transaction(true,async tx=>{const lease=await tx.get('meta',LEASE);await tx.put('meta',{...lease,[field]:'a'.repeat(64)});},['meta']);const before=await f.rows(),local=structuredClone(f.data),sets=f.sets();assert.deepEqual(await f.fresh().recoverControlPublication(),{state:'pending'});assert.deepEqual(await f.rows(),before);assert.deepEqual(f.data,local);assert.equal(f.sets(),sets);
});
