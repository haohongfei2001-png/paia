import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {IDBObjectStore} from './vendor/fake-indexeddb/build/esm/index.js';
import {createMaintenanceQualification,maintenanceQualificationReader,releaseMaintenanceQualification,maintenanceQualificationWorkBudget,readMaintenanceQualifiedSourcePresence,assertMaintenanceQualificationSourcePresenceAtTransactionFacts} from '../core/ai-usage/maintenance-qualification.js';
import {contextScopeTransactionReader,forkContextScopeWorkBudget,assertContextScopeTransactionIdentity} from '../core/context-topic-scope.js';
import {createMaintenanceProcessingDenyCell,bindMaintenanceProcessingRawDenials,retireMaintenanceProcessingDenyCell} from '../core/ai-usage/maintenance-processing-denial.js';
async function fixture(t,{denial=false,mutable=false}={}){
 const {s}=await setup(OrganizerStore);await s.setFilterMode('off');const caller=Object.freeze({}),controller=new AbortController(),issued=new WeakSet(),cell=denial?createMaintenanceProcessingDenyCell({store:s,repository:s.repository,database:s.repository.db,signals:[controller.signal]}):null;
 let capturedRaw;const processing={resolve:async(_tx,scope)=>{const value={version:1,store:s,caller,scope,epoch:'synthetic-source-presence',processing:true,expiresAt:Date.now()+60000,revocationSignal:controller.signal},raw=mutable?value:Object.freeze(value);capturedRaw=raw;if(cell)bindMaintenanceProcessingRawDenials(raw,s,[cell]);issued.add(raw);return raw;},isCurrent:(raw,store)=>issued.has(raw)&&store===s};
 const input=await s.repository.transaction(false,async tx=>(await tx.all('inputStates'))[0]);
 const cap=await s.repository.transaction(false,tx=>createMaintenanceQualification(s,tx,{items:[],coverage:[]},{processing,caller,binding:{operationId:'synthetic-source-presence'},isCurrent:()=>true,selection:{inputIds:[input.id]}}));
 const budget=maintenanceQualificationWorkBudget(cap,s),ids=input.sourceRecordIds;assert.ok(ids.length);t.after(()=>{releaseMaintenanceQualification(cap);controller.abort();s.repository.close();});
 return {s,cap,budget,ids,cell,raw:capturedRaw,read:fn=>s.repository.transaction(false,fn)};
}
function observe(t){let semantic=0,all=0;const get=IDBObjectStore.prototype.get;t.mock.method(IDBObjectStore.prototype,'get',function(...args){all++;if(['records','blocks','thoughts','revisions'].includes(this.name))semantic++;return get.apply(this,args);});return {all:()=>all,semantic:()=>semantic};}
test('fixed presence returns only boolean through original native and private context reader chains on one ledger',async t=>{
 const f=await fixture(t),seen=observe(t);await f.read(async tx=>{const before=f.budget.reads,q=maintenanceQualificationReader(f.cap,f.s,tx);assert.equal(await readMaintenanceQualifiedSourcePresence(q,f.s,f.ids),true);assert.equal(f.budget.reads-before,4*f.ids.length);});
 await f.read(async tx=>{const fork=forkContextScopeWorkBudget(f.budget,{qualification:f.cap,isCurrent:()=>true}),q=maintenanceQualificationReader(f.cap,f.s,contextScopeTransactionReader(f.s,tx,fork));assert.equal(await readMaintenanceQualifiedSourcePresence(q,f.s,f.ids),true);});assert.equal(seen.semantic(),0);
});
test('an arbitrary Object.create native transaction is not an original registered reader link',async t=>{const f=await fixture(t),seen=observe(t);await f.read(async tx=>{const q=maintenanceQualificationReader(f.cap,f.s,Object.create(tx));await assert.rejects(readMaintenanceQualifiedSourcePresence(q,f.s,f.ids));});assert.equal(seen.all(),0);});
for(const mode of ['copied reader','foreign Store','unselected Source'])test('fixed presence rejects '+mode+' before metadata IO',async t=>{const f=await fixture(t),seen=observe(t);await f.read(async tx=>{const q=maintenanceQualificationReader(f.cap,f.s,tx);await assert.rejects(readMaintenanceQualifiedSourcePresence(mode==='copied reader'?{...q}:q,mode==='foreign Store'?{}:f.s,mode==='unselected Source'?['synthetic-not-selected']:f.ids));assert.equal(await readMaintenanceQualifiedSourcePresence(q,f.s,f.ids),true);});assert.equal(seen.semantic(),0);assert.equal(seen.all(),3*f.ids.length);});
for(const mode of ['get replacement','get flags'])test('qualified '+mode+' observed then restored permanently retires that exact reader',async t=>{const f=await fixture(t),seen=observe(t);await f.read(async tx=>{const q=maintenanceQualificationReader(f.cap,f.s,tx),original=Object.getOwnPropertyDescriptor(q,'get');Object.defineProperty(q,'get',mode==='get replacement'?{...original,value:async()=>{throw Error('must not call');}}:{...original,enumerable:!original.enumerable});await assert.rejects(readMaintenanceQualifiedSourcePresence(q,f.s,f.ids));Object.defineProperty(q,'get',original);await assert.rejects(readMaintenanceQualifiedSourcePresence(q,f.s,f.ids));});assert.equal(seen.all(),0);});
for(const method of ['get','has'])test('original context '+method+' descriptor cannot change and revive after observation',async t=>{const f=await fixture(t),seen=observe(t);await f.read(async tx=>{const c=contextScopeTransactionReader(f.s,tx,f.budget),q=maintenanceQualificationReader(f.cap,f.s,c),original=Object.getOwnPropertyDescriptor(c,method);Object.defineProperty(c,method,{...original,enumerable:!original.enumerable});await assert.rejects(readMaintenanceQualifiedSourcePresence(q,f.s,f.ids));Object.defineProperty(c,method,original);await assert.rejects(readMaintenanceQualifiedSourcePresence(q,f.s,f.ids));});assert.equal(seen.all(),0);});
test('completed original transaction and replaced dynamic sourcePresent cannot supply an existence answer',async t=>{const f=await fixture(t);let q;await f.read(tx=>{q=maintenanceQualificationReader(f.cap,f.s,tx);});await assert.rejects(readMaintenanceQualifiedSourcePresence(q,f.s,f.ids));let called=0;f.s.sourcePresent=()=>{called++;throw Error('dynamic method is not the fixed owner');};await f.read(async tx=>assert.equal(await readMaintenanceQualifiedSourcePresence(maintenanceQualificationReader(f.cap,f.s,tx),f.s,f.ids),true));assert.equal(called,0);});

for(const mode of ['release qualification','pure raw denial','late has replacement','late mutable raw'])test('last original context-budget current '+mode+' cannot deliver an already-invalid presence result',async t=>{
 async function run(f,target=null){let calls=0,active=false,mutated=false;const fork=forkContextScopeWorkBudget(f.budget,{isCurrent:()=>{if(active){calls++;if(calls===target){mutated=true;if(mode==='release qualification')releaseMaintenanceQualification(f.cap);else if(mode==='pure raw denial')retireMaintenanceProcessingDenyCell(f.cell);else if(mode==='late mutable raw')f.raw.processing=false;else Object.defineProperty(context,'has',{...Object.getOwnPropertyDescriptor(context,'has'),enumerable:false});}}return true;}});let context;
  try{const result=await f.read(async tx=>{context=contextScopeTransactionReader(f.s,tx,fork);const q=maintenanceQualificationReader(f.cap,f.s,context);active=true;return readMaintenanceQualifiedSourcePresence(q,f.s,f.ids);});return {result,calls,mutated};}catch(error){error.syntheticObserved={calls,mutated};throw error;}
 }
 const baseline=await run(await fixture(t,{denial:mode==='pure raw denial',mutable:mode==='late mutable raw'}));assert.equal(baseline.result,true);assert.ok(baseline.calls>0);const f=await fixture(t,{denial:mode==='pure raw denial',mutable:mode==='late mutable raw'});let observed;
 await assert.rejects(run(f,baseline.calls),error=>{observed=error.syntheticObserved;return true;});assert.equal(observed.mutated,true);assert.equal(observed.calls,baseline.calls);
});

for(const mode of ['mutable raw','native get'])test('native direct reader cannot revive after observed final '+mode+' mismatch is restored',async t=>{
 async function sample(f,target=null){const nativeNow=Date.now;let calls=0,changed=false;return f.read(async tx=>{
  const q=maintenanceQualificationReader(f.cap,f.s,tx),get=Object.getOwnPropertyDescriptor(tx,'get'),processing=f.raw.processing;
  Date.now=()=>{if((new Error().stack||'').includes('maintenance-processing-receipt.js')){calls++;if(calls===target){changed=true;if(mode==='mutable raw')f.raw.processing=false;else Object.defineProperty(tx,'get',{value:tx.get,writable:true,configurable:true,enumerable:true});}}return nativeNow();};
  const read=async()=>{try{return {state:'resolved',value:await readMaintenanceQualifiedSourcePresence(q,f.s,f.ids)};}catch(error){return {state:'rejected',code:error.code};}};
  try{const first=await read();if(target===null)return {first,calls,changed};
   Date.now=nativeNow;f.raw.processing=processing;if(get)Object.defineProperty(tx,'get',get);else delete tx.get;
   const second=await read();const fresh=maintenanceQualificationReader(f.cap,f.s,tx),freshValue=await readMaintenanceQualifiedSourcePresence(fresh,f.s,f.ids);return {first,second,freshValue,calls,changed};
  }finally{Date.now=nativeNow;f.raw.processing=processing;if(get)Object.defineProperty(tx,'get',get);else delete tx.get;}
 });}
 const baseline=await sample(await fixture(t,{mutable:true}));assert.deepEqual(baseline.first,{state:'resolved',value:true});assert.ok(baseline.calls>0);
 const observed=await sample(await fixture(t,{mutable:true}),baseline.calls);assert.equal(observed.changed,true);assert.equal(observed.first.state,'rejected',JSON.stringify(observed));assert.equal(observed.second.state,'rejected',JSON.stringify(observed));assert.equal(observed.freshValue,true,'a new independent reader under the unchanged original qualification remains legitimate');
});

// The fixed pure-facts entry is also a legitimate private-chain terminator.
test('fixed qualified presence facts observation retires that reader while independent qualification remains usable',async t=>{
 const f=await fixture(t,{mutable:true});const observed=await f.read(async tx=>{
  const q=maintenanceQualificationReader(f.cap,f.s,tx);
  assert.equal(await readMaintenanceQualifiedSourcePresence(q,f.s,f.ids),true);
  f.raw.processing=false;let first;
  try{assertMaintenanceQualificationSourcePresenceAtTransactionFacts(f.cap,f.s,q,f.budget);first={state:'accepted'};}catch(error){first={state:'rejected',code:error.code};}
  finally{f.raw.processing=true;}
  let second;try{second={state:'resolved',value:await readMaintenanceQualifiedSourcePresence(q,f.s,f.ids)};}catch(error){second={state:'rejected',code:error.code};}
  const fresh=maintenanceQualificationReader(f.cap,f.s,tx),freshValue=await readMaintenanceQualifiedSourcePresence(fresh,f.s,f.ids);return {first,second,freshValue};
 });
 assert.equal(observed.first.state,'rejected',JSON.stringify(observed));assert.equal(observed.second.state,'rejected',JSON.stringify(observed));assert.equal(observed.freshValue,true);
});

// Pure original-reader identity is separate from field permission or raw grant.
test('source identity gate accepts original native, context and qualified wrappers without IO or handle return',async t=>{
 const f=await fixture(t),seen=observe(t);await f.read(async tx=>{const c=contextScopeTransactionReader(f.s,tx,f.budget),q=maintenanceQualificationReader(f.cap,f.s,c);for(const original of [tx,c,q])assert.equal(assertContextScopeTransactionIdentity(original,f.s),true);assert.equal(seen.all(),0);assert.equal(await readMaintenanceQualifiedSourcePresence(q,f.s,f.ids),true);});
});
for(const mode of ['native alias','context alias','qualified alias','context copy','qualified copy'])test('source identity gate rejects '+mode+' without retiring the separate original reader',async t=>{
 const f=await fixture(t),seen=observe(t);await f.read(async tx=>{const c=contextScopeTransactionReader(f.s,tx,f.budget),q=maintenanceQualificationReader(f.cap,f.s,c),original=mode.startsWith('native')?tx:mode.startsWith('context')?c:q,fake=mode.endsWith('alias')?Object.create(original):{...original};assert.throws(()=>assertContextScopeTransactionIdentity(fake,f.s));assert.equal(seen.all(),0);assert.equal(assertContextScopeTransactionIdentity(q,f.s),true);assert.equal(await readMaintenanceQualifiedSourcePresence(q,f.s,f.ids),true);});
});
for(const mode of ['context parent','qualified parent','context has flags','qualified get flags'])test('source identity gate observes '+mode+' mismatch once and keeps only that reader retired',async t=>{
 const f=await fixture(t),seen=observe(t);await f.read(async tx=>{const c=contextScopeTransactionReader(f.s,tx,f.budget),q=maintenanceQualificationReader(f.cap,f.s,c),subject=mode.startsWith('context')?c:q,parent=Object.getPrototypeOf(subject),key=mode.startsWith('context')?'has':'get',method=Object.getOwnPropertyDescriptor(subject,key);
 if(mode.endsWith('parent'))Object.setPrototypeOf(subject,Object.create(parent));else Object.defineProperty(subject,key,{...method,enumerable:!method.enumerable});
 assert.throws(()=>assertContextScopeTransactionIdentity(subject,f.s));if(mode.endsWith('parent'))Object.setPrototypeOf(subject,parent);else Object.defineProperty(subject,key,method);
 assert.throws(()=>assertContextScopeTransactionIdentity(subject,f.s));assert.equal(seen.all(),0);const fresh=maintenanceQualificationReader(f.cap,f.s,tx);assert.equal(assertContextScopeTransactionIdentity(fresh,f.s),true);assert.equal(await readMaintenanceQualifiedSourcePresence(fresh,f.s,f.ids),true);});
});

for(const kind of ['context','qualified'])test('source identity gate foreign Store mismatch does not retire the original '+kind+' reader',async t=>{
 const f=await fixture(t),seen=observe(t);await f.read(async tx=>{const c=contextScopeTransactionReader(f.s,tx,f.budget),q=maintenanceQualificationReader(f.cap,f.s,c),subject=kind==='context'?c:q;
 assert.throws(()=>assertContextScopeTransactionIdentity(subject,{}));assert.equal(seen.all(),0);assert.equal(assertContextScopeTransactionIdentity(subject,f.s),true);assert.equal(await readMaintenanceQualifiedSourcePresence(q,f.s,f.ids),true);});
});
