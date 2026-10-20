import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBObjectStore} from './vendor/fake-indexeddb/build/esm/index.js';
import './harness/original-complete.mjs';
import {SmartFilterStore} from '../core/smart-filter-store.js';
import {LibraryFoundationStore} from '../core/thought-store.js';
import {IAStore} from '../core/ia-store.js';
import {IndexedArchiveStore} from '../core/indexed-store.js';
import {local} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {ArchiveRepository} from '../core/idb-repository.js';
import {ArchiveError} from '../core/constants.js';
import {MemoryService} from '../core/memory/service.js';
import {promptMaterialReadIsStatic} from '../core/manual-materials.js';
import {promptFilterReadIsStatic} from '../core/smart-filter-store.js';

const text='Explain sorting',clock=()=>1800000000000;
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function fixture(t){
 const base=local(),hooks={get:null},indexedDB=new IDBFactory();
 const storage={async get(...args){const result=await base.get(...args);await hooks.get?.();return result;},set:base.set};
 const s=new OrganizerStore(storage,{indexedDB});await s.consent(true);t.after(()=>s.repository.close());
 await s.capture({epoch:(await s.status()).epoch,adapterVersion:'0.3.0',chat:{id:'synthetic-lifetime',url:'https://chatgpt.com/c/synthetic-lifetime',title:'Synthetic lifetime'},messages:[0,1].map(i=>({sourceMessageId:'input-'+i,pageOrder:i+1,originalText:text}))});
 await s.finishFoundation();const service=new PromptReuseService(s,{clock}),query=await service.query();
 return {s,storage,indexedDB,hooks,service,query};
}
// Delay the actual original Family hash, outside every Store queue and IDB
// transaction. This does not wrap an owner method or mint an observation.
function heldProjection(t,number=1,{fail=false}={}){
 const original=crypto.subtle.digest,started=deferred(),release=deferred();let count=0;
 crypto.subtle.digest=async function(algorithm,bytes){
  const result=await original.call(this,algorithm,bytes);
  if(new TextDecoder().decode(bytes)===JSON.stringify(['normal',text])&&++count===number){started.resolve();await release.promise;if(fail)throw new ArchiveError('STORAGE_FAILED');}
  return result;
 };
 t.after(()=>{release.resolve();crypto.subtle.digest=original;});return {started:started.promise,release:release.resolve,count:()=>count};
}
async function reads(fn){
 const original=IDBObjectStore.prototype.get;let records=0;
 IDBObjectStore.prototype.get=function(...args){if(this.name==='records')records++;return original.apply(this,args);};
 try{return {value:await fn(),records};}finally{IDBObjectStore.prototype.get=original;}
}
function heldPage(t,_s){return heldProjection(t);}

test('ordinary callers cannot forge completed material or static Filter observations',async t=>{
 const f=await fixture(t);
 for(const token of [null,{},Object.freeze({static:true,complete:true}),{store:f.s,repository:f.s.repository}]){
  assert.equal(promptMaterialReadIsStatic(f.s,token,true),false);
  assert.equal(promptFilterReadIsStatic(f.s,{},token),false);
 }
});
for(const owner of ['custom-snapshot','custom-filter','configured-sync'])test(owner+' keeps independent original scans',async t=>{
 const f=await fixture(t);let service=f.service;
 if(owner==='custom-snapshot'){const original=service.snapshot;service.snapshot=function(...args){return original.apply(this,args);};}
 if(owner==='custom-filter'){const original=f.s.isFiltered;f.s.isFiltered=function(...args){return original.apply(this,args);};}
 if(owner==='configured-sync')service=new PromptReuseService(f.s,{clock,syncJournal:{prepare:async()=>{},commit:async()=>{}}});
 const single=await reads(()=>service.query()),pair=await reads(()=>Promise.all([service.query(),service.query()]));
 assert.deepEqual(pair.value,[single.value,single.value]);assert.equal(pair.records,single.records*2);
});
for(const boundary of ['original-pause-publication','repository-restore-marker'])test('same-generation '+boundary+' cannot join a held earlier scan',{timeout:10000},async t=>{
 const f=await fixture(t),held=heldPage(t,f.s),old=f.service.query();await held.started;
 if(boundary==='original-pause-publication')await f.s.setEnabled(false);
 else await f.s.repository.transaction(true,tx=>tx.put('meta',{id:'recovery-restore-epoch',value:'synthetic-restored-epoch'}));
 const fresh=await f.service.query();assert.deepEqual(fresh,f.query);assert.equal(held.count(),2);
 held.release();assert.deepEqual(await old,f.query);
});
test('original Memory exclusion invalidates a pending read and remains excluded in fresh work',async t=>{
 const f=await fixture(t),memory=new MemoryService(f.s);await memory.ready();
 const query=await f.service.query(),held=heldPage(t,f.s),old=f.service.query(),rejected=assert.rejects(old,e=>e.code==='MEMORY_STALE');
 await held.started;await memory.exclude({inputId:query.items[0].members[0],excluded:true});held.release();await rejected;
 assert.equal((await f.service.query()).items.length,0);
});
test('a first original projection failure retires its slot and lets an independent waiting caller recover',async t=>{
 const f=await fixture(t),held=heldProjection(t,1,{fail:true});
 const pair=Promise.allSettled([f.service.query(),f.service.query()]);await held.started;held.release();
 const outcomes=await pair;assert.equal(outcomes[0].status,'rejected');assert.equal(outcomes[0].reason.code,'STORAGE_FAILED');assert.equal(outcomes[1].status,'fulfilled');assert.deepEqual(outcomes[1].value,f.query);
 assert.equal(held.count(),2,'the waiting original caller must run its own projection after failure');
 assert.deepEqual(await f.service.query(),f.query);
});
test('an old custom-snapshot query cannot refresh the newer NextFamilyView serial or TTL',async t=>{
 const f=await fixture(t),started=deferred(),release=deferred();let now=0,count=0;
 const service=new PromptReuseService(f.s,{clock:()=>now}),original=service.snapshot;
 service.snapshot=async function(...args){const result=await original.apply(this,args);if(++count===1){started.resolve();await release.promise;}return result;};
 t.after(release.resolve);const old=service.query();await started.promise;now=5;await service.query();
 now=20;release.resolve();await old;now=30005;assert.equal((await service.nextFamilyView()).available,false);
});
test('a new caller starts fresh while earlier callers still project already-settled shared work',{timeout:10000},async t=>{
 const f=await fixture(t),single=await reads(()=>f.service.query()),held=heldProjection(t,2);
 const result=await reads(async()=>{
  const first=f.service.query(),waiting=f.service.query();await held.started;
  assert.deepEqual(await first,f.query);const fresh=await f.service.query();held.release();return [await first,await waiting,fresh];
 });
 assert.deepEqual(result.value,[f.query,f.query,f.query]);assert.equal(result.records,single.records*2);
});
test('a returned query object cannot alter the private material of a waiting caller',async t=>{
 const f=await fixture(t);let changed=false,returned=null;
 f.hooks.get=()=>{if(returned&&!changed){changed=true;returned.items[0].text='Only this caller changed its object';returned.items[0].callerOnly=()=>{};}};
 const first=f.service.query().then(value=>{returned=value;return value;}),waiting=f.service.query();
 await first;assert.deepEqual(await waiting,f.query);assert.equal(changed,true,'first caller mutation occurred during the waiting caller final original reads');
});
for(const change of ['canonical-generation','restore-publication'])test('another original repository '+change+' write before joiner final qualification is refused',{timeout:10000},async t=>{
 const f=await fixture(t),other=new ArchiveRepository(f.storage,{indexedDB:f.indexedDB,ia:true,smartFilter:true,thoughtLibrary:true});await other.initialize();t.after(()=>other.close());
 const held=heldProjection(t,2),first=f.service.query(),waiting=f.service.query(),outcome=Promise.allSettled([waiting]);await held.started;
 assert.deepEqual(await first,f.query);
 if(change==='canonical-generation')await other.transaction(true,async tx=>{const row=await tx.get('meta','smart-filter');await tx.put('meta',{...row,taskState:'idle'});});
 else await other.transaction(true,tx=>tx.put('meta',{id:'recovery-restore-epoch',value:'synthetic-other-repository-restore'}));
 held.release();const [result]=await outcome;assert.equal(result.status,'rejected');assert.equal(result.reason.code,'MEMORY_STALE');
});
test('normal readonly Store queue admission keeps a current shared query successful with one scan',async t=>{
 const f=await fixture(t),single=await reads(()=>f.service.query());let gets=0,queued=null;
 f.hooks.get=()=>{if(++gets===8)queued=f.s.status();};
 const pair=await reads(()=>Promise.all([f.service.query(),f.service.query()]));if(queued)await queued;
 assert.ok(queued,'the real readonly operation was admitted during first final control observation');
 assert.deepEqual(pair.value,[f.query,f.query]);assert.equal(pair.records,single.records);
});
for(const lastPage of ['static','early-skip','unknown-ai-decision'])test('complete multi-page qualification includes the '+lastPage+' final Input',async t=>{
 const s=new OrganizerStore(local(),{indexedDB:new IDBFactory()});await s.consent(true);t.after(()=>s.repository.close());
 await s.capture({epoch:(await s.status()).epoch,adapterVersion:'0.3.0',chat:{id:'synthetic-pages',url:'https://chatgpt.com/c/synthetic-pages',title:'Synthetic pages'},messages:Array.from({length:101},(_,i)=>({sourceMessageId:'input-'+i,pageOrder:i+1,originalText:text}))});
 await s.finishFoundation();const ids=await s.repository.transaction(false,async tx=>(await tx.all('inputStates')).map(x=>x.id).sort()),last=ids.at(-1);assert.equal(ids.length,101);
 if(lastPage!=='static')await s.repository.transaction(true,async tx=>{
  if(lastPage==='early-skip'){const row=await tx.get('blocks',last);await tx.put('blocks',{...row,value:{...row.value,excluded:true}});}
  // Deliberately invalid/unknown, not a fabricated AI authorization. Mere
  // decision presence must conservatively prevent static reuse on page two.
  else{const row=await tx.get('filterInputs',last);await tx.put('filterInputs',{...row,aiDecision:{version:0}});}
 });
 const service=new PromptReuseService(s,{clock}),single=await reads(()=>service.query()),pair=await reads(()=>Promise.all([service.query(),service.query()]));
 assert.deepEqual(pair.value,[single.value,single.value]);assert.equal(single.value.items[0].members.length,lastPage==='early-skip'?100:101);
 assert.equal(pair.records,single.records*(lastPage==='unknown-ai-decision'?2:1));
});

for(const kind of ['own-run','own-transaction','run-accessor','transaction-accessor','ancestor-run','transaction-prototype'])test(kind+' before admission preserves its independent wrapper semantics',async t=>{
 const f=await fixture(t),single=await reads(()=>f.service.query());let calls=0,owner=f.s,key='run';
 if(kind.includes('transaction')){owner=kind==='transaction-prototype'?ArchiveRepository.prototype:f.s.repository;key='transaction';}
 if(kind==='ancestor-run')owner=SmartFilterStore.prototype;
 const descriptor=Object.getOwnPropertyDescriptor(owner,key),original=owner[key],wrapper=function(...args){calls++;return original.apply(this,args);};
 Object.defineProperty(owner,key,kind.endsWith('accessor')?{get:()=>wrapper,configurable:true}:{value:wrapper,configurable:true,writable:true});
 t.after(()=>{if(descriptor)Object.defineProperty(owner,key,descriptor);else delete owner[key];});
 const pair=await reads(()=>Promise.all([f.service.query(),f.service.query()]));
 assert.ok(calls>0);assert.deepEqual(pair.value,[f.query,f.query]);assert.equal(pair.records,single.records*2);
});
for(const kind of ['own-run','own-transaction','ancestor-run'])test(kind+' replacement after shared admission rejects the waiting reuse',{timeout:10000},async t=>{
 const f=await fixture(t),held=heldProjection(t),pair=Promise.allSettled([f.service.query(),f.service.query()]);await held.started;
 const owner=kind==='own-transaction'?f.s.repository:kind==='ancestor-run'?SmartFilterStore.prototype:f.s,key=kind==='own-transaction'?'transaction':'run',descriptor=Object.getOwnPropertyDescriptor(owner,key),original=owner[key];
 Object.defineProperty(owner,key,{value:function(...args){return original.apply(this,args);},configurable:true,writable:true});
 const restore=()=>{if(descriptor)Object.defineProperty(owner,key,descriptor);else delete owner[key];};t.after(restore);
 held.release();const outcomes=await pair;for(const outcome of outcomes){assert.equal(outcome.status,'rejected');assert.equal(outcome.reason.code,'MEMORY_STALE');}
 restore();assert.deepEqual(await f.service.query(),f.query);
});
for(const owner of [LibraryFoundationStore,SmartFilterStore,IAStore,IndexedArchiveStore])test(owner.name+' run descriptor changes disable reuse even with the same function',async t=>{
 const f=await fixture(t),single=await reads(()=>f.service.query()),prototype=owner.prototype,descriptor=Object.getOwnPropertyDescriptor(prototype,'run');
 Object.defineProperty(prototype,'run',{...descriptor,enumerable:!descriptor.enumerable});t.after(()=>Object.defineProperty(prototype,'run',descriptor));
 const pair=await reads(()=>Promise.all([f.service.query(),f.service.query()]));assert.deepEqual(pair.value,[f.query,f.query]);assert.equal(pair.records,single.records*2);
});

test('an inherited possible AI decision cannot be certified as static by own-property absence',async t=>{
 const f=await fixture(t),single=await reads(()=>f.service.query()),descriptor=Object.getOwnPropertyDescriptor(Object.prototype,'aiDecision');
 Object.defineProperty(Object.prototype,'aiDecision',{value:{version:0},configurable:true});
 t.after(()=>{if(descriptor)Object.defineProperty(Object.prototype,'aiDecision',descriptor);else delete Object.prototype.aiDecision;});
 const pair=await reads(()=>Promise.all([f.service.query(),f.service.query()]));assert.deepEqual(pair.value,[f.query,f.query]);assert.equal(pair.records,single.records*2);
});

test('restoring an observed invalid run method cannot revive that caller through metadata retry',{timeout:10000},async t=>{
 const f=await fixture(t),held=heldProjection(t),pair=Promise.allSettled([f.service.query(),f.service.query()]);await held.started;
 const run=f.s.run,read=Object.getOwnPropertyDescriptor;let observed=false,restored=false;
 f.s.run=function(...args){return run.apply(this,args);};
 // Observation only: return exactly the original descriptor. Restore the
 // rejected method at the next microtask, before async admission resumes.
 Object.getOwnPropertyDescriptor=function(owner,key){const value=read(owner,key);if(!observed&&owner===f.s&&key==='run'&&value?.value!==run){observed=true;queueMicrotask(()=>{delete f.s.run;restored=true;Object.getOwnPropertyDescriptor=read;});}return value;};
 t.after(()=>{delete f.s.run;Object.getOwnPropertyDescriptor=read;});held.release();
 const outcomes=await pair;t.diagnostic(JSON.stringify({kind:'restored-run',observed,restored,status:outcomes.map(x=>x.status),errors:outcomes.map(x=>x.reason?.code??null)}));assert.ok(observed&&restored);for(const outcome of outcomes){assert.equal(outcome.status,'rejected');assert.equal(outcome.reason.code,'MEMORY_STALE');}
 assert.deepEqual(await f.service.query(),f.query);
});

test('restoring an observed original adapter identity mismatch cannot revive that caller through metadata retry',{timeout:2000},async t=>{
 const f=await fixture(t),held=heldProjection(t,2),first=f.service.query(),waiting=f.service.query(),pair=Promise.allSettled([first,waiting]);await held.started;assert.deepEqual(await first,f.query);
 const descriptor=Object.getOwnPropertyDescriptor(f.storage,'get'),original=descriptor.value;let gets=0,observed=false,restored=false;
 const restore=()=>{Object.defineProperty(f.storage,'get',descriptor);restored=true;};
 // The first caller has completed. Only the waiting caller's last binding run
 // and bound-adapter observation remain; no other queue can cause this failure.
 f.hooks.get=()=>{if(++gets===2)Object.defineProperty(f.storage,'get',{configurable:true,enumerable:descriptor.enumerable,get(){if(!observed){observed=true;queueMicrotask(restore);}return function(...args){return original.apply(this,args);};}});};
 t.after(()=>{f.hooks.get=null;restore();});held.release();const outcomes=await pair;
 t.diagnostic(JSON.stringify({gets,observed,restored,status:outcomes.map(x=>x.status)}));
 assert.ok(observed&&restored,'the real mismatching adapter was observed and restored only at the following microtask');
 assert.equal(outcomes[0].status,'fulfilled');assert.equal(outcomes[1].status,'rejected');assert.equal(outcomes[1].reason.code,'MEMORY_STALE');
 f.hooks.get=null;assert.deepEqual(await f.service.query(),f.query);
});
