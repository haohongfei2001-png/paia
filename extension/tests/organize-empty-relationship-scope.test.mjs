import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './harness/organize-material-method-fixture.mjs';
import {derived} from './harness/thought-m1.mjs';
import {captureOriginalOrganizeScope,captureOriginalOrganizeCommitScope,readOriginalOrganizeScope,releaseOriginalOrganizeScope} from '../core/organizer/organize-processing-scope.js';
import {assertOriginalOrganizeActionFacts,chargeOriginalOrganizeActionWork} from '../background/organize-action-source.js';
import {IDBObjectStore,IDBIndex} from './vendor/fake-indexeddb/build/esm/index.js';
const sender={id:'synthetic',frameId:0,documentId:'document',url:'chrome-extension://synthetic/ui/archive.html',tab:{id:1,windowId:2,incognito:false}};
const scopeFile='/core/organizer/organize-processing-scope.js:';
function observer(hook=()=>{}){
 const events=[],saved=[];
 for(const [owner,method]of [[IDBObjectStore.prototype,'get'],[IDBObjectStore.prototype,'count'],[IDBObjectStore.prototype,'openCursor'],[IDBIndex.prototype,'openCursor']]){
  const d=Object.getOwnPropertyDescriptor(owner,method);saved.push([owner,method,d]);Object.defineProperty(owner,method,{...d,value:function(...args){
   if(!(new Error().stack||'').includes(scopeFile))return Reflect.apply(d.value,this,args);
   const table=this.objectStore?.name??this.name,event={table,method};events.push(event);const request=Reflect.apply(d.value,this,args);hook(event,request);return request;
  }});
 }
 return {events,restore(){for(const [owner,method,d]of saved.reverse())Object.defineProperty(owner,method,d);}};
}
const counts=(events,table)=>Object.fromEntries(['get','count','openCursor'].map(method=>[method,events.filter(x=>x.table===table&&x.method===method).length]));
async function make(t,{n=3,selected=false,unrelated=false,deleteTable=null,complex=false}={}){
 const f=await fixture(t,{input:selected,consume:false});
 for(let i=1;i<n;i++){const entry=await f.s.createEntry({actor:'user',operationId:crypto.randomUUID(),body:'SYNTHETIC authored entry '+i,type:'idea',formation:'explicit',evidence:[]});await f.s.placeEntry({topicId:f.topic.id,entryId:entry.id,expectedEntryRevision:entry.revision,expectedTopicRevision:(await f.s.topic(f.topic.id)).organizationRevision,operationId:crypto.randomUUID()});}
 if(unrelated)await derived(f.s,[f.inputId]);
 if(deleteTable)await f.s.repository.transaction(true,async tx=>{for(const row of await tx.all(deleteTable))await tx.delete(deleteTable,row.id);});
 if(complex)await f.s.repository.transaction(true,tx=>tx.put('meta',{id:'recovery-restore-epoch',value:{generation:'complex'}}));
 const selection=await f.source.select(sender,{topicId:f.topic.id}),o=observer();
 try{f.action=await f.source.consume(sender,{topicId:f.topic.id,scopeBinding:selection.scopeBinding,userActionId:crypto.randomUUID()});}finally{o.restore();}
 f.initialReads=o.events.length;f.consumeEvents=o.events;return f;
}
async function capture(f,{free=false,commit=false,before=()=>{},hook=()=>{}}={}){
 const o=observer(hook);let facts,proof,error;
 try{await f.s.run(()=>f.s.repository.transaction(commit,async tx=>{await before(tx);try{proof=await (commit?captureOriginalOrganizeCommitScope:captureOriginalOrganizeScope)(f.s,tx,f.topic.id,...(free?[]:[f.source,f.action]));facts=readOriginalOrganizeScope(proof,f.s,tx);}finally{releaseOriginalOrganizeScope(proof);}}));}catch(e){error=e;}finally{o.restore();}
 return {facts,error,events:o.events};
}
function success(result){assert.equal(result.error,undefined);assert.ok(result.facts);}
function sticky(f,result){assert.ok(result.error);assert.equal(result.facts,undefined);assert.throws(()=>assertOriginalOrganizeActionFacts(f.source,f.action,f.s));}

for(const n of [2,3])test('native cost RED: paid empty '+n+' Entry scope uses two count requests instead of per-Entry empty cursors',async t=>{
 const f=await make(t,{n}),result=await capture(f);success(result);assert.equal(result.facts.entries.length,n);assert.equal(result.facts.dependencies.length,0);assert.equal(result.facts.provenance.length,0);
 assert.equal(f.initialReads,3*n+9);assert.deepEqual(counts(f.consumeEvents,'dependencies'),{get:0,count:0,openCursor:n});
 t.diagnostic(JSON.stringify({n,requests:result.events.length,dependencies:counts(result.events,'dependencies'),provenance:counts(result.events,'provenance')}));
 assert.deepEqual(counts(result.events,'dependencies'),{get:0,count:1,openCursor:0});assert.deepEqual(counts(result.events,'provenance'),{get:0,count:1,openCursor:0});assert.equal(result.events.length,n+11);
 const next=await capture(f);success(next);assert.strictEqual(next.facts,result.facts);assert.equal(next.events.length,n+11);
});

test('free GET and original readwrite capture do not use paid empty-table counts',async t=>{
 const f=await make(t);for(const options of [{free:true},{commit:true}]){const result=await capture(f,options);success(result);for(const table of ['dependencies','provenance'])assert.deepEqual(counts(result.events,table),{get:0,count:0,openCursor:3});}
});

test('one Entry keeps the original request path and request fee',async t=>{const f=await make(t,{n:1}),result=await capture(f);success(result);assert.equal(result.events.length,12);for(const table of ['dependencies','provenance'])assert.deepEqual(counts(result.events,table),{get:0,count:0,openCursor:1});});

test('never-eligible complex restore keeps the full-fee path without count',async t=>{const f=await make(t,{complex:true}),a=await capture(f),b=await capture(f);success(a);success(b);assert.notStrictEqual(a.facts,b.facts);for(const table of ['dependencies','provenance'])assert.deepEqual(counts(a.events,table),{get:0,count:0,openCursor:3});});

test('nonempty selected baseline preserves every original relationship range with zero count',async t=>{const f=await make(t,{selected:true}),result=await capture(f);success(result);assert.ok(result.facts.dependencies.length);assert.ok(result.facts.provenance.length);for(const table of ['dependencies','provenance'])assert.deepEqual(counts(result.events,table),{get:0,count:0,openCursor:3});});

test('unrelated rows cause charged positive-count fallback without reading unrelated rows',async t=>{
 const f=await make(t,{unrelated:true}),result=await capture(f);success(result);assert.equal(result.facts.dependencies.length,0);assert.equal(result.facts.provenance.length,0);
 for(const table of ['dependencies','provenance'])assert.deepEqual(counts(result.events,table),{get:0,count:1,openCursor:3});assert.equal(result.events.length,20);
});

for(const empty of ['dependencies','provenance'])test('empty-table evidence is independent for '+empty,async t=>{
 const f=await make(t,{unrelated:true,deleteTable:empty}),result=await capture(f);success(result);
 for(const table of ['dependencies','provenance'])assert.deepEqual(counts(result.events,table),{get:0,count:1,openCursor:table===empty?0:3});assert.equal(result.events.length,17);
});

for(const table of ['dependencies','provenance'])test('a later transaction new selected '+table+' member refuses and never refreshes baseline',async t=>{
 const f=await make(t,{unrelated:true}),first=await capture(f);success(first);
 const changed=await f.s.repository.transaction(true,async tx=>{const row=(await tx.all(table))[0];assert.ok(row);const altered={...row,id:crypto.randomUUID(),...(table==='dependencies'?{targetId:f.entry.id}:{ownerId:f.entry.id,contributionKey:crypto.randomUUID()})};await tx.put(table,altered);assert.ok((await tx.get(table,altered.id)));return altered;});
 const result=await capture(f);sticky(f,result);assert.equal(counts(result.events,table).count,1);assert.ok(counts(result.events,table).openCursor>=1);
 await f.s.repository.transaction(true,tx=>tx.delete(table,changed.id));sticky(f,await capture(f));
});

for(const table of ['dependencies','provenance'])test('source invalidation at actual '+table+' count completion refuses before another IO',async t=>{
 const f=await make(t);let reached=false,at=-1;
 const result=await capture(f,{hook(event,request){if(event.table===table&&event.method==='count')request.addEventListener('success',()=>{reached=true;f.source.invalidate();});}});
 assert.equal(reached,true);sticky(f,result);at=result.events.findIndex(e=>e.table===table&&e.method==='count');assert.equal(result.events.length,at+1);assert.equal(result.events.filter(e=>e.method==='openCursor'&&['dependencies','provenance'].includes(e.table)).length,0);
});

for(const invalid of [-1,NaN,1.5,Number.MAX_SAFE_INTEGER+1,'0'])test('malformed native count result '+String(invalid)+' refuses with no range fallback',async t=>{
 const f=await make(t);let reached=false;const result=await capture(f,{hook(event,request){if(event.table==='dependencies'&&event.method==='count')request.addEventListener('success',()=>{reached=true;request.result=invalid;});}});
 assert.equal(reached,true);sticky(f,result);assert.deepEqual(counts(result.events,'dependencies'),{get:0,count:1,openCursor:0});assert.equal(result.events.at(-1).method,'count');
});

test('original count method own accessor is refused without invoking it or issuing IO',async t=>{
 const f=await make(t);let getters=0;const result=await capture(f,{before(tx){Object.defineProperty(tx,'count',{get(){getters++;return ()=>0;},configurable:true});}});sticky(f,result);assert.equal(getters,0);assert.equal(result.events.length,0);
});

test('method replacement after first count is observed without calling replacement or continuing IO',async t=>{
 const f=await make(t);let active,called=0,reached=false;const result=await capture(f,{before(tx){active=tx;},hook(event,request){if(event.table==='dependencies'&&event.method==='count')request.addEventListener('success',()=>{reached=true;Object.defineProperty(active,'count',{value:()=>{called++;return 0;},configurable:true});});}});
 assert.equal(reached,true);sticky(f,result);assert.equal(called,0);assert.equal(result.events.at(-1).method,'count');delete active.count;sticky(f,await capture(f));
});

for(const allowance of [8,9,10])test('only '+allowance+' remaining reads stops before the next actual request and stays retired',async t=>{
 const f=await make(t);assert.equal(f.initialReads,18);chargeOriginalOrganizeActionWork(f.source,f.action,f.s,4096-f.initialReads-allowance,0);
 const result=await capture(f);sticky(f,result);assert.equal(result.error.code,'BUDGET_EXCEEDED');assert.equal(result.events.length,allowance);assert.equal(counts(result.events,'dependencies').count,allowance>=9?1:0);assert.equal(counts(result.events,'provenance').count,allowance>=10?1:0);assert.equal((await capture(f)).events.length,0);
});

test('last full capture fits exactly the original cumulative request allowance then next request is refused',async t=>{
 const f=await make(t);chargeOriginalOrganizeActionWork(f.source,f.action,f.s,4096-f.initialReads-14,0);const result=await capture(f);success(result);assert.equal(result.events.length,14);const exhausted=await capture(f);sticky(f,exhausted);assert.equal(exhausted.error.code,'BUDGET_EXCEEDED');assert.equal(exhausted.events.length,0);
});

test('an actual count transaction abort refuses without publishing a proof or fallback',async t=>{
 const f=await make(t);let active,reached=false;const result=await capture(f,{before(tx){active=tx;},hook(event,request){if(event.table==='dependencies'&&event.method==='count')request.addEventListener('success',()=>{reached=true;active.tx.abort();});}});
 assert.equal(reached,true);sticky(f,result);assert.deepEqual(counts(result.events,'dependencies'),{get:0,count:1,openCursor:0});assert.equal(result.events.filter(e=>e.method==='openCursor'&&['dependencies','provenance'].includes(e.table)).length,0);
});

