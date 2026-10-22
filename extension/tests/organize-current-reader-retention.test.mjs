import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './harness/organize-material-method-fixture.mjs';
import {derived} from './harness/thought-m1.mjs';
import {captureOriginalOrganizeScope,captureOriginalOrganizeCommitScope,hasOriginalOrganizeEmptyRelationship,releaseOriginalOrganizeScope} from '../core/organizer/organize-processing-scope.js';
import {captureOrganizeProcessingGrant,releaseOrganizeProcessingGrant,organizeProcessingReader,captureOriginalOrganizeCurrentScopeReader,readOriginalOrganizeScopeReader} from '../background/organize-processing-policy.js';
import {chargeOriginalOrganizeActionWork} from '../background/organize-action-source.js';
import {prefix} from '../core/thought-model.js';
import {IDBObjectStore,IDBIndex} from './vendor/fake-indexeddb/build/esm/index.js';
const sender={id:'synthetic',frameId:0,documentId:'document',url:'chrome-extension://synthetic/ui/archive.html',tab:{id:1,windowId:2,incognito:false}};
async function make(t,{n=3,unrelated=false,deleteTable=null,body}={}){
 const f=await fixture(t,{consume:false,...(body?{body}:{})});
 for(let i=1;i<n;i++){const e=await f.s.createEntry({actor:'user',operationId:crypto.randomUUID(),body:'SYNTHETIC current '+i,type:'idea',formation:'explicit',evidence:[]});await f.s.placeEntry({topicId:f.topic.id,entryId:e.id,expectedEntryRevision:e.revision,expectedTopicRevision:(await f.s.topic(f.topic.id)).organizationRevision,operationId:crypto.randomUUID()});}
 if(unrelated)await derived(f.s,[f.inputId]);
 if(deleteTable)await f.s.repository.transaction(true,async tx=>{for(const row of await tx.all(deleteTable))await tx.delete(deleteTable,row.id);});
 const selection=await f.source.select(sender,{topicId:f.topic.id});f.action=await f.source.consume(sender,{topicId:f.topic.id,scopeBinding:selection.scopeBinding,userActionId:crypto.randomUUID()});
 f.read=fn=>f.s.run(()=>f.s.repository.transaction(false,async tx=>{const proof=await captureOriginalOrganizeScope(f.s,tx,f.topic.id,f.source,f.action);let grant;try{grant=captureOrganizeProcessingGrant(f.source,f.action,f.s,tx,proof);return await fn(organizeProcessingReader(grant,f.s,tx),grant,tx);}finally{if(grant)releaseOrganizeProcessingGrant(grant);releaseOriginalOrganizeScope(proof);}}));return f;
}
function observe(t){
 const events=[];
 for(const [owner,method]of [[IDBObjectStore.prototype,'get'],[IDBObjectStore.prototype,'count'],[IDBIndex.prototype,'openCursor']]){const original=owner[method];t.mock.method(owner,method,function(...args){if((new Error().stack||'').includes('/background/organize-processing-policy.js:'))events.push({table:this.objectStore?.name??this.name,method});return Reflect.apply(original,this,args);});}
 return events;
}
const count=(events,table,method)=>events.filter(e=>e.table===table&&e.method===method).length;
const current=(f,fn)=>f.read(async(_ordinary,grant,tx)=>{const cap=captureOriginalOrganizeCurrentScopeReader(grant,f.s,tx);return fn(readOriginalOrganizeScopeReader(cap,f.s,tx).reader,tx,grant,cap);});

for(const n of [2,3])test('fixed current uses successful same-snapshot empty witnesses with zero native relationship cursor requests: '+n,async t=>{
 const f=await make(t,{n}),events=observe(t);await current(f,async(reader)=>{for(const table of ['dependencies','provenance']){const index=table==='dependencies'?'byTarget':'byOwner';assert.deepEqual(await reader.all(table,index,prefix(['entry',f.entry.id])),[]);assert.deepEqual(await reader.all(table,index,prefix(['entry',f.entry.id])),[]);assert.equal(count(events,table,'openCursor'),0);}});
});
for(const empty of ['dependencies','provenance'])test('fixed current emptiness is independent and positive table count keeps native selected range: '+empty,async t=>{
 const f=await make(t,{unrelated:true,deleteTable:empty}),events=observe(t);await current(f,async reader=>{for(const table of ['dependencies','provenance']){assert.deepEqual(await reader.all(table,table==='dependencies'?'byTarget':'byOwner',prefix(['entry',f.entry.id])),[]);assert.equal(count(events,table,'openCursor'),table===empty?0:1);}});
});
test('ordinary reader keeps its original physical relationship request even with the same fresh proof',async t=>{
 const f=await make(t),events=observe(t);await f.read(async reader=>{assert.deepEqual(await reader.all('dependencies','byTarget',prefix(['entry',f.entry.id])),[]);assert.equal(count(events,'dependencies','openCursor'),1);});
});
for(const shape of ['foreign Entry','wrong prefix','wrong index','primitive key','array spoof','reverse bound','limit'])test('fixed current does not borrow the empty witness for '+shape,async t=>{
 const f=await make(t),events=observe(t);let getterCalls=0;await current(f,async reader=>{
  let index='byTarget',range=prefix(['entry',f.entry.id]),limit;
  if(shape==='foreign Entry')range=prefix(['entry','synthetic-foreign']);
  if(shape==='wrong prefix')range=prefix(['input',f.entry.id]);
  if(shape==='wrong index')index='byInput';
  if(shape==='primitive key')range='synthetic';
  if(shape==='array spoof'){range=['synthetic'];for(const [key,value]of Object.entries({lower:['entry',f.entry.id],upper:['entry',f.entry.id,[]],lowerOpen:false,upperOpen:true}))Object.defineProperty(range,key,{get(){getterCalls++;return value;}});}
  if(shape==='reverse bound')range=IDBKeyRange.bound(['entry',f.entry.id],['entry',f.entry.id,[]],false,false);
  if(shape==='limit')limit=0;
  const result=await reader.all('dependencies',index,range,...(limit===undefined?[]:[limit])).then(value=>({value}),error=>({error}));
  if(shape==='limit')assert.ok(result.error);else assert.equal(count(events,'dependencies','openCursor'),1);
  assert.equal(getterCalls,0);
 });
});
test('current Thought reads allocate no retained template and repeated reads still issue native get requests',async t=>{
 const f=await make(t),events=observe(t);await current(f,async reader=>{const first=await reader.get('thoughts',f.entry.id);Object.defineProperty(first,'thoughtText',{value:'CALLER ONLY'});const second=await reader.get('thoughts',f.entry.id);assert.equal(second.thoughtText,'PRIVATE authored body');assert.equal(count(events,'thoughts','get'),2);});
});
test('current large Thought no-template reads do not retain a hidden text copy across transactions',async t=>{
 const f=await make(t,{n:1,body:'x'.repeat(100000)});for(let i=0;i<30;i++)await current(f,reader=>reader.get('thoughts',f.entry.id));
});
test('current no-template field getters still charge every actual selected-field access and retire on original byte budget',async t=>{
 const f=await make(t,{n:1,body:'x'.repeat(100000)});let reads=0;await current(f,async reader=>{const row=await reader.get('thoughts',f.entry.id);assert.throws(()=>{for(let i=0;i<30;i++){assert.equal(row.thoughtText.length,100000);reads++;}});assert.ok(reads>0&&reads<30);assert.throws(()=>row.thoughtText);await assert.rejects(reader.get('thoughts',f.entry.id));});
});
for(const changed of ['source','grant','method'])test('current witness and field getter both reject permanently after '+changed+' retirement',async t=>{
 const f=await make(t),events=observe(t);await current(f,async(reader,tx,grant)=>{const row=await reader.get('thoughts',f.entry.id),before=events.length;let descriptor,calls=0;
  if(changed==='source')f.source.invalidate();if(changed==='grant')releaseOrganizeProcessingGrant(grant);if(changed==='method'){descriptor=Object.getOwnPropertyDescriptor(tx,'count');Object.defineProperty(tx,'count',{get(){calls++;throw Error('must not invoke');},configurable:true});}
  try{await assert.rejects(reader.all('dependencies','byTarget',prefix(['entry',f.entry.id])));}finally{if(changed==='method'){if(descriptor)Object.defineProperty(tx,'count',descriptor);else delete tx.count;}}
  await assert.rejects(reader.all('dependencies','byTarget',prefix(['entry',f.entry.id])));assert.throws(()=>row.thoughtText);assert.equal(events.length,before);assert.equal(calls,0);
 });
});
test('current witness cannot cross an ended transaction or be invoked with a copied scope handle',async t=>{
 const f=await make(t);let old,proof;
 await f.s.run(()=>f.s.repository.transaction(false,async tx=>{proof=await captureOriginalOrganizeScope(f.s,tx,f.topic.id,f.source,f.action);const grant=captureOrganizeProcessingGrant(f.source,f.action,f.s,tx,proof);try{old=readOriginalOrganizeScopeReader(captureOriginalOrganizeCurrentScopeReader(grant,f.s,tx),f.s,tx).reader;assert.equal(hasOriginalOrganizeEmptyRelationship(proof,f.source,f.action,f.s,tx,'dependencies',f.entry.id),true);assert.throws(()=>hasOriginalOrganizeEmptyRelationship({...proof},f.source,f.action,f.s,tx,'dependencies',f.entry.id));}finally{releaseOrganizeProcessingGrant(grant);releaseOriginalOrganizeScope(proof);}}));
 await assert.rejects(old.all('dependencies','byTarget',prefix(['entry',f.entry.id])));await current(f,async(reader,tx)=>{assert.throws(()=>hasOriginalOrganizeEmptyRelationship(proof,f.source,f.action,f.s,tx,'dependencies',f.entry.id));assert.deepEqual(await reader.all('dependencies','byTarget',prefix(['entry',f.entry.id])),[]);});
});
test('current capability is unavailable in original write transaction and ordinary write reader still performs actual reads',async t=>{
 const f=await make(t),events=observe(t);await f.s.run(()=>f.s.repository.transaction(true,async tx=>{const proof=await captureOriginalOrganizeCommitScope(f.s,tx,f.topic.id,f.source,f.action),grant=captureOrganizeProcessingGrant(f.source,f.action,f.s,tx,proof);try{assert.throws(()=>captureOriginalOrganizeCurrentScopeReader(grant,f.s,tx));assert.equal(events.filter(e=>e.table==='thoughts').length,0);}finally{releaseOrganizeProcessingGrant(grant);releaseOriginalOrganizeScope(proof);}}));
});

test('current same-snapshot empty bridge cannot reopen a spent original ledger or issue fallback IO',async t=>{
 const f=await make(t),events=observe(t);await current(f,async reader=>{assert.throws(()=>chargeOriginalOrganizeActionWork(f.source,f.action,f.s,0,2097152),e=>e.code==='BUDGET_EXCEEDED');const before=events.length;await assert.rejects(reader.all('dependencies','byTarget',prefix(['entry',f.entry.id])));assert.equal(events.length,before);});
});
