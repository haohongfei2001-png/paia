import {MemoryService} from '../core/memory/service.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,derived} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {createOrganizeActionSource,chargeOriginalOrganizeWork} from '../background/organize-action-source.js';
import {captureOriginalOrganizeScope,releaseOriginalOrganizeScope} from '../core/organizer/organize-processing-scope.js';
import {captureOrganizeProcessingGrant,readOrganizeProcessingGrant,organizeProcessingReader,releaseOrganizeProcessingGrant,captureOriginalOrganizeScopeReader,readOriginalOrganizeScopeReader,assertOriginalOrganizeScopeReaderFacts} from '../background/organize-processing-policy.js';
import {inputProjection} from '../core/thought-evidence.js';
import {readLocalOrganizeScopeInTransaction} from '../core/organizer/ai-presentation.js';
import {configDefault,key as memoryKey} from '../core/memory/model.js';

const event=()=>({addListener(){},removeListener(){}});
async function fixture(t,{input=false,restriction=null,presentation=null,memorySetup=null,body='PRIVATE authored body',consume=true,style=null}={}){
 const {s}=await setup(OrganizerStore),topic=await s.createTopic({name:'PRIVATE topic',operationId:crypto.randomUUID()}),inputId=await s.run(()=>s.repository.transaction(false,async tx=>(await tx.all('blocks'))[0].id));
 const entry=input?await derived(s,[inputId]):await s.createEntry({actor:'user',operationId:crypto.randomUUID(),body,title:'PRIVATE title',note:'PRIVATE note',type:'idea',formation:'explicit',evidence:[]});
 await s.placeEntry({topicId:topic.id,entryId:entry.id,expectedEntryRevision:entry.revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:crypto.randomUUID()});
 const sender={id:'synthetic',frameId:0,documentId:'document',url:'chrome-extension://synthetic/ui/archive.html',tab:{id:1,windowId:2,incognito:false}},api={runtime:{id:sender.id,getURL:p=>'chrome-extension://synthetic/'+p,async getContexts(){return [{contextType:'TAB',documentId:sender.documentId,documentUrl:sender.url,tabId:1,windowId:2,frameId:0,incognito:false}];}},tabs:{onUpdated:event(),onRemoved:event(),async get(){return {...sender.tab,url:sender.url};}}},source=createOrganizeActionSource(s,api);
 t.after(()=>{source.dispose();s.repository.db?.close();});
 if(restriction)await s.repository.transaction(true,async tx=>{if(restriction==='localOnly')await tx.put('meta',{...configDefault(),localOnly:true});if(restriction==='entry')await tx.put('meta',{id:memoryKey('entry',entry.id),kind:'entry',version:1,entryId:entry.id,excluded:true});if(restriction==='input')await tx.put('meta',{id:memoryKey('input',inputId),kind:'input',version:1,inputId,excluded:true});if(restriction==='topic')await tx.put('meta',{id:memoryKey('topic','default',topic.id),kind:'topic',version:1,profileId:'default',topicId:topic.id,decision:'never',layoutGeneration:1});});
 if(memorySetup)await memorySetup(new MemoryService(s));
 if(presentation){const row=await presentation({s,topic,entry,inputId});await s.repository.transaction(true,tx=>tx.put('meta',row));}
 if(style)assert.equal((await s.updatePreferences({aiOrganizeStyle:{version:1,value:style,expectedRevision:0,expectedEpoch:'initial'}})).ok,true);
 const selection=await source.select(sender,{topicId:topic.id}),action=consume?await source.consume(sender,{topicId:topic.id,scopeBinding:selection.scopeBinding,userActionId:crypto.randomUUID()}):null;
 const read=fn=>s.run(()=>s.repository.transaction(false,async tx=>{const proof=await captureOriginalOrganizeScope(s,tx,topic.id,source,action);let grant;try{grant=captureOrganizeProcessingGrant(source,action,s,tx,proof);return await fn(organizeProcessingReader(grant,s,tx),grant,tx);}finally{if(grant)releaseOrganizeProcessingGrant(grant);releaseOriginalOrganizeScope(proof);}}));
 return {s,source,topic,entry,inputId,action,read};
}


const profile={contractVersion:'test',modelVersion:'test',promptVersion:'test'};
const material=(f,tx,cap)=>readLocalOrganizeScopeInTransaction(f.s,tx,f.topic.id,profile,3,1,false,cap);
function rawObserve(tx,onRow){const stores=new WeakSet(),original=tx.tx.objectStore.bind(tx.tx);tx.tx.objectStore=name=>{const store=original(name);if(stores.has(store))return store;stores.add(store);const get=store.get.bind(store);store.get=key=>{const request=get(key);request.addEventListener('success',()=>onRow(name,key,request.result));return request;};return store;};}


test('MemoryService-first cold module entry performs the first legitimate material read without retry or sleep',async t=>{
 const f=await fixture(t);const value=await f.read(async(_reader,grant,tx)=>material(f,tx,captureOriginalOrganizeScopeReader(grant,f.s,tx)));assert.equal(value.topic.id,f.topic.id);assert.equal(value.inputs.length,1);assert.equal(value.inputs[0].text,'PRIVATE authored body');
});

for(const name of ['canonicalTopic','readableEntry'])test('real material cap does not execute replacement '+name+' semantic accessors',async t=>{
 const f=await fixture(t);let injected=0;await f.read(async(_reader,grant,tx)=>{
  const cap=captureOriginalOrganizeScopeReader(grant,f.s,tx),original=f.s[name];
  f.s[name]=async function(...args){const row=await original.apply(this,args),out={...row};Object.defineProperty(out,name==='canonicalTopic'?'name':'thoughtText',{enumerable:true,configurable:true,get(){injected++;return 'UNSELECTED replacement semantic value';}});return out;};
  try{const result=await material(f,tx,cap).then(value=>({value}),error=>({error}));t.diagnostic(JSON.stringify({method:name,returned:!!result.value,semanticGetterReads:injected}));assert.equal(injected,0);assert.ok(result.error);}finally{delete f.s[name];}
 });assert.equal(injected,0);
});

test('the independent Source presence check still refuses an absent Source despite a replacement Store method',async t=>{
 const f=await fixture(t,{input:true});await f.read(async(_reader,grant,tx)=>{
  const cap=captureOriginalOrganizeScopeReader(grant,f.s,tx);const stores=new WeakSet(),objectStore=tx.tx.objectStore.bind(tx.tx);
  tx.tx.objectStore=name=>{const st=objectStore(name);if(name==='records'&&!stores.has(st)){stores.add(st);const get=st.get.bind(st);st.get=id=>{const req=get(id);req.addEventListener('success',()=>{if(req.result)Object.defineProperty(req,'result',{configurable:true,value:undefined});});return req;};}return st;};
  assert.equal(await f.s.sourcePresent(_reader,readOrganizeProcessingGrant(grant,f.s,tx).scope.sources.map(x=>x.id)),false);
  f.s.sourcePresent=async()=>true;
  try{await assert.rejects(material(f,tx,cap));}finally{delete f.s.sourcePresent;}
 });
});

for(const name of ['canonicalTopic','readableEntry','sourcePresent','isFiltered'])test('original material admission rejects own '+name+' getter without evaluating it',async t=>{
 const f=await fixture(t);let getters=0;await f.read(async(_reader,grant,tx)=>{Object.defineProperty(f.s,name,{configurable:true,get(){getters++;throw Error('Changed Store method');}});try{assert.throws(()=>captureOriginalOrganizeScopeReader(grant,f.s,tx));}finally{delete f.s[name];}});assert.equal(getters,0);
});

for(const name of ['canonicalTopic','readableEntry'])test('module-owned '+name+' identity cannot be replaced before admission',async t=>{
 const f=await fixture(t);let holder=Object.getPrototypeOf(f.s);while(!Object.hasOwn(holder,name))holder=Object.getPrototypeOf(holder);const descriptor=Object.getOwnPropertyDescriptor(holder,name);let calls=0;
 await f.read(async(_reader,grant,tx)=>{Object.defineProperty(holder,name,{...descriptor,value:async function(...args){calls++;return descriptor.value.apply(this,args);}});try{assert.throws(()=>captureOriginalOrganizeScopeReader(grant,f.s,tx));}finally{Object.defineProperty(holder,name,descriptor);}});assert.equal(calls,0);
});

test('a Store method changed across the original gate await refuses before Entry reads and cannot revive after ABA',async t=>{
 const f=await fixture(t);let getters=0,bodyReads=0;await f.read(async(_reader,grant,tx)=>{const cap=captureOriginalOrganizeScopeReader(grant,f.s,tx);rawObserve(tx,(table,id,row)=>{if(table==='thoughts'&&row)bodyReads++;if(table==='meta'&&id==='gate')Object.defineProperty(f.s,'readableEntry',{configurable:true,get(){getters++;throw Error('Changed after await');}});});try{await assert.rejects(material(f,tx,cap));}finally{delete f.s.readableEntry;}assert.throws(()=>readOriginalOrganizeScopeReader(cap,f.s,tx));});assert.equal(getters,0);assert.equal(bodyReads,0);
});

test('an observed method change permanently retires the old material cap',async t=>{
 const f=await fixture(t);await f.read(async(_reader,grant,tx)=>{const cap=captureOriginalOrganizeScopeReader(grant,f.s,tx);f.s.isFiltered=async()=>false;try{assert.throws(()=>assertOriginalOrganizeScopeReaderFacts(cap,f.s,tx));}finally{delete f.s.isFiltered;}assert.throws(()=>readOriginalOrganizeScopeReader(cap,f.s,tx));assert.throws(()=>assertOriginalOrganizeScopeReaderFacts(cap,f.s,tx));});
});

test('a replaced public action clock is denied before its callback can replace a Store method',async t=>{
 const f=await fixture(t);let getters=0,changed=false;await f.read(async(_reader,grant,tx)=>{const cap=captureOriginalOrganizeScopeReader(grant,f.s,tx),before=Object.getOwnPropertyDescriptor(f.s,'canonicalTopic'),now=Date.now;Date.now=()=>{changed=true;Object.defineProperty(f.s,'canonicalTopic',{configurable:true,get(){getters++;throw Error('Changed by last clock');}});return now();};try{assert.throws(()=>readOriginalOrganizeScopeReader(cap,f.s,tx));}finally{Date.now=now;const after=Object.getOwnPropertyDescriptor(f.s,'canonicalTopic');delete f.s.canonicalTopic;assert.deepEqual(after,before);}assert.throws(()=>assertOriginalOrganizeScopeReaderFacts(cap,f.s,tx));});assert.equal(changed,false);assert.equal(Object.hasOwn(f.s,'canonicalTopic'),false);assert.equal(getters,0);
});


test('a facts-observed method change also permanently retires an already delivered reader',async t=>{
 const f=await fixture(t);await f.read(async(_reader,grant,tx)=>{const cap=captureOriginalOrganizeScopeReader(grant,f.s,tx),held=readOriginalOrganizeScopeReader(cap,f.s,tx).reader;f.s.isFiltered=async()=>false;try{assert.throws(()=>assertOriginalOrganizeScopeReaderFacts(cap,f.s,tx));}finally{delete f.s.isFiltered;}const result=await held.get('thoughts',f.entry.id).then(value=>({value}),error=>({error}));t.diagnostic(JSON.stringify({boundary:'facts-retired reader',returned:!!result.value,error:result.error?.code}));assert.ok(result.error);});
});

test('an original current callback throw also permanently retires an already delivered field getter',async t=>{
 const f=await fixture(t);await f.read(async(_reader,grant,tx)=>{const cap=captureOriginalOrganizeScopeReader(grant,f.s,tx),held=readOriginalOrganizeScopeReader(cap,f.s,tx).reader,row=await held.get('thoughts',f.entry.id),now=Date.now;Date.now=()=>{throw Error('Original clock temporarily unavailable');};try{assert.throws(()=>readOriginalOrganizeScopeReader(cap,f.s,tx));}finally{Date.now=now;}let result;try{result={value:row.thoughtText};}catch(error){result={error};}t.diagnostic(JSON.stringify({boundary:'current-throw retired field',returned:Object.hasOwn(result,'value'),error:result.error?.code}));assert.ok(result.error);await assert.rejects(held.get('thoughts',f.entry.id));});
});

test('the original super lookup rejects an intermediate canonicalTopic shadow before material reads',async t=>{
 const f=await fixture(t),middle=Object.getPrototypeOf(OrganizerStore.prototype);assert.equal(Object.getOwnPropertyDescriptor(middle,'canonicalTopic'),undefined);let calls=0;
 await f.read(async(_reader,grant,tx)=>{const cap=captureOriginalOrganizeScopeReader(grant,f.s,tx);Object.defineProperty(middle,'canonicalTopic',{configurable:true,value:async()=>{calls++;return f.topic;}});try{await assert.rejects(material(f,tx,cap));}finally{delete middle.canonicalTopic;}assert.throws(()=>readOriginalOrganizeScopeReader(cap,f.s,tx));});assert.equal(calls,0);
});
test('a late canonicalTopic declaration accessor is rejected without evaluating the super getter',async t=>{
 const f=await fixture(t);let owner=Object.getPrototypeOf(OrganizerStore.prototype);while(!Object.hasOwn(owner,'canonicalTopic'))owner=Object.getPrototypeOf(owner);const descriptor=Object.getOwnPropertyDescriptor(owner,'canonicalTopic');let getters=0;
 await f.read(async(_reader,grant,tx)=>{const cap=captureOriginalOrganizeScopeReader(grant,f.s,tx);Object.defineProperty(owner,'canonicalTopic',{configurable:true,get(){getters++;return descriptor.value;}});try{await assert.rejects(material(f,tx,cap));}finally{Object.defineProperty(owner,'canonicalTopic',descriptor);}assert.throws(()=>assertOriginalOrganizeScopeReaderFacts(cap,f.s,tx));});assert.equal(getters,0);
});
test('the original declaration requires complete readableEntry descriptor identity',async t=>{
 const f=await fixture(t);let owner=Object.getPrototypeOf(f.s);while(!Object.hasOwn(owner,'readableEntry'))owner=Object.getPrototypeOf(owner);const descriptor=Object.getOwnPropertyDescriptor(owner,'readableEntry');
 await f.read(async(_reader,grant,tx)=>{Object.defineProperty(owner,'readableEntry',{...descriptor,enumerable:!descriptor.enumerable});try{assert.throws(()=>captureOriginalOrganizeScopeReader(grant,f.s,tx));}finally{Object.defineProperty(owner,'readableEntry',descriptor);}});
});
