import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {IndexedArchiveStore} from '../core/indexed-store.js';
import {createContextScopeWorkBudget} from '../core/context-topic-scope.js';
import {MaintenanceProcessingConsent,MAINTENANCE_PROCESSING_KEY as KEY,readMaintenanceProcessingConsent,bindMaintenanceProcessingConsentReceipt,assertMaintenanceProcessingConsentReceiptSnapshot,releaseMaintenanceProcessingConsent,readMaintenanceProcessingConsentDenial} from '../background/maintenance-processing-consent.js';
import {registerRepositoryFinalReadFence} from '../core/idb-repository.js';
import {retireMaintenanceProcessingDenyCell} from '../core/ai-usage/maintenance-processing-denial.js';
globalThis.IDBKeyRange=IDBKeyRange;
const memory=()=>{const values={};return {async get(k){return {[k]:structuredClone(values[k])};},async set(v){Object.assign(values,structuredClone(v));}};};
async function fixture(t){const s=new IndexedArchiveStore(memory(),{indexedDB:new IDBFactory()});await s.consent(true);const owner=new MaintenanceProcessingConsent(s);t.after(()=>{owner.dispose();s.repository.close();});const before=await owner.status();await owner.configure({enabled:true,expectedGeneration:before.generation,consentVersion:1,confirmed:true});const budget=createContextScopeWorkBudget({database:s.repository.db}),cap=await s.run(()=>s.repository.transaction(false,tx=>readMaintenanceProcessingConsent(owner,s,tx,{workBudget:budget}),['meta']));const raw=Object.freeze({});bindMaintenanceProcessingConsentReceipt(raw,cap,owner,s,{workBudget:budget});const read=(fn,write=false)=>s.run(()=>s.repository.transaction(write,fn));return {s,owner,budget,cap,raw,read,check:tx=>assertMaintenanceProcessingConsentReceiptSnapshot(raw,s,tx,budget)};}
test('raw-purpose is only an extra requirement: legacy unbound and copied raw introduce zero metadata IO',async t=>{const f=await fixture(t),before=f.budget.reads;assert.equal(await assertMaintenanceProcessingConsentReceiptSnapshot({},f.s,{},f.budget),null);assert.equal(await assertMaintenanceProcessingConsentReceiptSnapshot({...f.raw},f.s,{},f.budget),null);assert.equal(f.budget.reads,before);});
test('original readonly transaction reuses only its own completed four-key observation; another transaction rechecks',async t=>{const f=await fixture(t),before=f.budget.reads;await f.read(async tx=>{assert.equal(await f.check(tx),true);const read=f.budget.reads;assert.equal(read-before,4);assert.equal(await f.check(tx),true);assert.equal(f.budget.reads,read);});await f.read(f.check);assert.equal(f.budget.reads-before,8);});
test('exact raw cannot change owner Store or original ledger, copy a transaction, or rebind purpose',async t=>{const f=await fixture(t);assert.throws(()=>bindMaintenanceProcessingConsentReceipt(f.raw,f.cap,f.owner,f.s,{workBudget:f.budget}));await assert.rejects(assertMaintenanceProcessingConsentReceiptSnapshot(f.raw,{}, {},f.budget));await f.read(async tx=>{await assert.rejects(assertMaintenanceProcessingConsentReceiptSnapshot(f.raw,f.s,tx,createContextScopeWorkBudget({database:f.s.repository.db})));await assert.rejects(f.check({...tx}));assert.equal(await f.check(tx),true);});});
for(const mode of ['off','restore','localOnly'])test('second original transaction '+mode+' rejects before selected semantic row IO',async t=>{const f=await fixture(t);await f.read(f.check);await f.read(async tx=>{if(mode==='off'){const row=await tx.get('meta',KEY);await tx.put('meta',{...row,enabled:false});}else await tx.put('meta',mode==='restore'?{id:'recovery-restore-epoch',value:'changed'}:{id:'memory:config',kind:'config',localOnly:true});},true);let semantic=0;await assert.rejects(f.read(async tx=>{await f.check(tx);semantic++;await tx.get('blocks','never');}));assert.equal(semantic,0);});
for(const mode of ['off','restore','localOnly'])test('original readwrite finalizer '+mode+' drift rolls back writer and policy mutation',async t=>{const f=await fixture(t);await assert.rejects(f.read(async tx=>{await f.check(tx);await tx.put('meta',{id:'synthetic-checkpoint',value:'tentative'});if(mode==='off'){const row=await tx.get('meta',KEY);await tx.put('meta',{...row,enabled:false});}else await tx.put('meta',mode==='restore'?{id:'recovery-restore-epoch',value:'changed'}:{id:'memory:config',localOnly:true});},true));assert.equal(await f.read(tx=>tx.get('meta','synthetic-checkpoint')),undefined);assert.equal((await f.read(tx=>tx.get('meta',KEY))).enabled,true);});
test('externalAccess false is independent and does not veto the explicit Maintenance purpose',async t=>{const f=await fixture(t);await f.read(tx=>tx.put('meta',{id:'memory:config',externalAccess:false,localOnly:false}),true);await f.read(f.check);});
test('malformed stored localOnly refuses rather than being treated as missing',async t=>{const f=await fixture(t);await f.read(tx=>tx.put('meta',{id:'memory:config',localOnly:'false'}),true);await assert.rejects(f.read(f.check));});
test('released purpose binding stays closed and cannot be rebound to fresh evidence',async t=>{const f=await fixture(t);releaseMaintenanceProcessingConsent(f.cap,f.owner,f.s);await assert.rejects(f.read(f.check));});

test('last original Repository owner callback cannot retire the already-checked purpose and still commit',async t=>{
 const first=await fixture(t);let count=0;
 await first.read(async tx=>{await first.check(tx);await tx.put('meta',{id:'synthetic-terminal-write',value:'tentative'});registerRepositoryFinalReadFence(first.s.repository,tx,{isCurrent:()=>{count++;return true;},plan:function*(){return true;}});},true);
 assert.ok(count>2);const f=await fixture(t),denial=readMaintenanceProcessingConsentDenial(f.cap,f.owner,f.s);let calls=0,retired=false;
 await assert.rejects(f.read(async tx=>{await f.check(tx);await tx.put('meta',{id:'synthetic-terminal-write',value:'tentative'});registerRepositoryFinalReadFence(f.s.repository,tx,{isCurrent:()=>{calls++;if(calls===count){retired=true;retireMaintenanceProcessingDenyCell(denial.cell);}return true;},plan:function*(){return true;}});},true));
 assert.equal(retired,true);assert.equal(await f.read(tx=>tx.get('meta','synthetic-terminal-write')),undefined);
});

test('last later original Topic facts clock cannot retire an earlier purpose after its group was checked',async t=>{
 const {TopicProcessingAuthority}=await import('../core/topic-processing-authority.js');
 const {TopicProcessingGuard}=await import('../core/topic-processing.js');
 async function execute(f,target=null){
  const caller=Object.freeze({}),signal=new AbortController(),issued=new WeakSet(),denial=readMaintenanceProcessingConsentDenial(f.cap,f.owner,f.s),nativeNow=Date.now;
  const processing=Object.freeze({resolve:async(_tx,scope)=>{const raw=Object.freeze({version:1,store:f.s,caller,scope,epoch:'synthetic-topic-identity',processing:true,expiresAt:nativeNow()+30000,revocationSignal:signal.signal});issued.add(raw);return raw;},isCurrent:(raw,store)=>issued.has(raw)&&store===f.s});
  const owner=new TopicProcessingAuthority(f.s,{processing,caller,binding:{operationId:'synthetic-topic-operation'},workBudget:f.budget}),guard=new TopicProcessingGuard(f.s,{resolveProcessing:(tx,request)=>owner.authorize(tx,request)});let clocks=0,retired=false;
  try{await f.read(async tx=>{
   await f.check(tx);await guard.processing(tx,[{inputId:'synthetic-input'}]);guard.registerProcessingFinalFence(tx);await tx.put('meta',{id:'synthetic-clock-tail-write',value:'tentative'});
   Date.now=()=>{const stack=new Error().stack||'';if(stack.includes('requireTopicProcessingFinalFacts')&&stack.includes('finalAuthorityFacts')){clocks++;if(clocks===target){retired=true;retireMaintenanceProcessingDenyCell(denial.cell);}}return nativeNow();};
  },true);return {clocks,retired};}catch(error){error.observed={clocks,retired};throw error;}finally{Date.now=nativeNow;owner.release();}
 }
 const baseline=await execute(await fixture(t));assert.ok(baseline.clocks>2);const f=await fixture(t);let seen;
 await assert.rejects(execute(f,baseline.clocks),error=>{seen=error.observed;return true;});assert.equal(seen.retired,true);assert.equal(seen.clocks,baseline.clocks);assert.equal(await f.read(tx=>tx.get('meta','synthetic-clock-tail-write')),undefined);
});
