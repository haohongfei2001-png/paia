import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,derived} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {captureOriginalOrganizeScope,readOriginalOrganizeScope,releaseOriginalOrganizeScope} from '../core/organizer/organize-processing-scope.js';
import {key as memoryKey} from '../core/memory/model.js';

async function fixture(t,{input=false}={}){
 const f=await setup(OrganizerStore);t.after(()=>f.s.repository.db?.close());
 const topic=await f.s.createTopic({name:'SYNTHETIC topic title',operationId:crypto.randomUUID()});
 const inputId=await f.s.run(()=>f.s.repository.transaction(false,async tx=>(await tx.all('blocks'))[0].id));
 const entry=input?await derived(f.s,[inputId]):await f.s.createEntry({actor:'user',operationId:crypto.randomUUID(),body:'SYNTHETIC authored body',title:'SYNTHETIC title',note:'SYNTHETIC note',type:'idea',formation:'explicit',evidence:[]});
 await f.s.placeEntry({topicId:topic.id,entryId:entry.id,expectedEntryRevision:entry.revision,expectedTopicRevision:(await f.s.topic(topic.id)).organizationRevision,operationId:crypto.randomUUID()});
 return {...f,topic,entry,read:fn=>f.s.run(()=>f.s.repository.transaction(false,fn))};
}

test('original Organize metadata producer binds the exact original transaction, store and opaque result',async t=>{
 const f=await fixture(t);let token,scope;
 await f.read(async tx=>{
  token=await captureOriginalOrganizeScope(f.s,tx,f.topic.id);scope=readOriginalOrganizeScope(token,f.s,tx);
  assert.equal(scope.purpose,'organize-selection-provenance');assert.equal(scope.topic.id,f.topic.id);assert.equal(scope.entries.length,1);assert.equal(scope.entries[0].id,f.entry.id);
  assert.equal(Object.isFrozen(scope),true);assert.equal(Object.isFrozen(scope.entries[0]),true);
  assert.equal(JSON.stringify(scope).includes('SYNTHETIC'),false);assert.equal('processing' in scope,false);assert.equal('allowed' in scope,false);
  assert.throws(()=>readOriginalOrganizeScope({...token},f.s,tx));assert.throws(()=>readOriginalOrganizeScope(token,{...f.s},tx));assert.throws(()=>readOriginalOrganizeScope(token,f.s,{...tx}));
 });
 await f.read(async tx=>assert.throws(()=>readOriginalOrganizeScope(token,f.s,tx)));releaseOriginalOrganizeScope(token);assert.equal(scope.entries.length,1);
});

test('current Input-backed entry metadata closes original dependency and Source identities without content fields',async t=>{
 const f=await fixture(t,{input:true});
 await f.read(async tx=>{
  const token=await captureOriginalOrganizeScope(f.s,tx,f.topic.id),s=readOriginalOrganizeScope(token,f.s,tx);
  assert.equal(s.entries.length,1);assert.equal(s.inputs.length,1);assert.equal(s.sources.length,1);assert.equal(s.dependencies.length,1);assert.equal(s.provenance.length,1);
  assert.deepEqual(s.dependencies.map(x=>x.inputId),s.inputs.map(x=>x.input.id));
  for(const entry of s.entries)for(const field of ['thoughtText','title','note'])assert.equal(Object.hasOwn(entry,field),false,field);
  for(const {input}of s.inputs)for(const field of ['libraryText','note'])assert.equal(Object.hasOwn(input,field),false,field);
  for(const source of s.sources)for(const field of ['originalText','editedText','note'])assert.equal(Object.hasOwn(source,field),false,field);
  assert.equal(Object.hasOwn(s.topic,'name'),false);
  releaseOriginalOrganizeScope(token);assert.throws(()=>readOriginalOrganizeScope(token,f.s,tx));
 });
});

// Instrument only fake-IDB request results, not the original Repository data
// methods. This detects property access while preserving its exact scope brand.
function textGetters(tx,counter){
 const original=tx.tx.objectStore.bind(tx.tx),seen=new WeakSet();
 tx.tx.objectStore=name=>{
  const store=original(name);if(seen.has(store))return store;seen.add(store);const get=store.get.bind(store);
  store.get=key=>{const request=get(key);request.addEventListener('success',()=>{
   const row=request.result;if(!row)return;
   const target=['blocks','records'].includes(name)?row.value:row;
   const fields=name==='thoughts'?['thoughtText','title','note']:name==='topics'?['name','summary']:name==='blocks'?['libraryText','note']:name==='records'?['originalText','note','editedText']:[];
   for(const key of fields)Object.defineProperty(target,key,{configurable:true,enumerable:true,get(){counter.count++;throw Error('UNAUTHORIZED_TEXT_READ:'+name+'.'+key);}});
  });return request;};return store;
 };
}
test('metadata producer never touches Entry/Input/Topic or legacy Source text getters',async t=>{
 const f=await fixture(t,{input:true}),counter={count:0};
 await f.read(async tx=>{textGetters(tx,counter);const h=await captureOriginalOrganizeScope(f.s,tx,f.topic.id);assert.equal(readOriginalOrganizeScope(h,f.s,tx).entries.length,1);releaseOriginalOrganizeScope(h);});
 assert.equal(counter.count,0);
});

test('nested metadata has a positive schema and never visits future semantic fields',async t=>{
 const f=await fixture(t,{input:true});let reads=0;
 await f.read(async tx=>{
  const objectStore=tx.tx.objectStore.bind(tx.tx),seen=new WeakSet();tx.tx.objectStore=name=>{
   const s=objectStore(name);if(name!=='thoughts'||seen.has(s))return s;seen.add(s);const get=s.get.bind(s);s.get=id=>{const request=get(id);request.addEventListener('success',()=>{
    const row=request.result;if(!row)return;for(const value of [row.fieldRevisions,row.authorship.body,row.protections.body])Object.defineProperty(value,'futureText',{enumerable:true,get(){reads++;throw Error('PRIVATE_NESTED_TEXT');}});
   });return request;};return s;
  };
  const h=await captureOriginalOrganizeScope(f.s,tx,f.topic.id),facts=readOriginalOrganizeScope(h,f.s,tx);assert.equal(JSON.stringify(facts).includes('futureText'),false);releaseOriginalOrganizeScope(h);
 });assert.equal(reads,0);
});

test('restriction metadata includes redirects but excludes independent profile text and never grants permission',async t=>{
 const f=await fixture(t);const alias=crypto.randomUUID();
 await f.s.repository.transaction(true,async tx=>{
  await tx.put('topics',{id:alias,lifecycle:'merged',redirectTo:f.topic.id,revision:1,organizationRevision:1,activeLayoutGeneration:1});
  await tx.put('meta',{id:memoryKey('topic','default',alias),kind:'topic',version:1,profileId:'default',topicId:alias,decision:'never',layoutGeneration:1});
  await tx.put('meta',{id:memoryKey('profile','default'),kind:'profile',version:1,profileId:'default',name:'PRIVATE profile name',instruction:'PRIVATE instructions',budget:'standard',revision:0});
 });
 await f.read(async tx=>{const h=await captureOriginalOrganizeScope(f.s,tx,f.topic.id),facts=readOriginalOrganizeScope(h,f.s,tx);assert.equal(facts.restrictions.find(x=>x.topicId===alias).decision,'never');assert.equal(facts.restrictionTopics.find(x=>x.id===alias).redirectTo,f.topic.id);assert.equal(JSON.stringify(facts).includes('PRIVATE'),false);assert.equal('processing' in facts,false);releaseOriginalOrganizeScope(h);});
});

test('an unknown restriction shape is denied without serializing its future semantic value',async t=>{
 const f=await fixture(t);let reads=0;
 await f.s.repository.transaction(true,async tx=>{await tx.put('meta',{id:memoryKey('entry',f.entry.id),kind:'entry',version:1,entryId:f.entry.id,excluded:true,future:'PRIVATE'});});
 await f.read(async tx=>{const all=tx.tx.objectStore.bind(tx.tx);tx.tx.objectStore=name=>{const s=all(name);if(name!=='meta')return s;const original=s.getAll.bind(s);s.getAll=(...args)=>{const request=original(...args);request.addEventListener('success',()=>{for(const row of request.result||[])if(row.kind==='entry')Object.defineProperty(row,'future',{enumerable:true,configurable:true,get(){reads++;throw Error('PRIVATE');}});});return request;};return s;};await assert.rejects(captureOriginalOrganizeScope(f.s,tx,f.topic.id));});assert.equal(reads,0);
});

test('copied or replaced original transaction methods cannot mint a selection proof',async t=>{
 const f=await fixture(t);
 await f.read(async tx=>{
  await assert.rejects(captureOriginalOrganizeScope(f.s,{...tx},f.topic.id));
  const old=tx.get;tx.get=(...args)=>old.apply(tx,args);await assert.rejects(captureOriginalOrganizeScope(f.s,tx,f.topic.id));delete tx.get;
  const h=await captureOriginalOrganizeScope(f.s,tx,f.topic.id);const original=tx.tx;tx.tx={};assert.throws(()=>readOriginalOrganizeScope(h,f.s,tx));tx.tx=original;releaseOriginalOrganizeScope(h);
 });
 await f.s.repository.transaction(true,async tx=>assert.rejects(captureOriginalOrganizeScope(f.s,tx,f.topic.id)));
});

test('over-limit membership is rejected as a whole before reading any Entry text',async t=>{
 const f=await fixture(t);
 await f.s.repository.transaction(true,async tx=>{
  const base=(await tx.all('placements'))[0];
  for(let i=0;i<100;i++)await tx.put('placements',{...base,id:crypto.randomUUID(),entryId:crypto.randomUUID(),order:i+10,rank:String(i+10).padStart(12,'0')});
 });
 const counter={count:0};await f.read(async tx=>{textGetters(tx,counter);await assert.rejects(captureOriginalOrganizeScope(f.s,tx,f.topic.id));});assert.equal(counter.count,0);
});

test('settled scope and changed database cannot re-establish an old opaque proof',async t=>{
 const f=await fixture(t);let token,original;
 await f.read(async tx=>{original=tx;token=await captureOriginalOrganizeScope(f.s,tx,f.topic.id);});
 assert.throws(()=>readOriginalOrganizeScope(token,f.s,original));
 await f.read(async tx=>{const h=await captureOriginalOrganizeScope(f.s,tx,f.topic.id),db=f.s.repository.db;f.s.repository.db={};try{assert.throws(()=>readOriginalOrganizeScope(h,f.s,tx));}finally{f.s.repository.db=db;releaseOriginalOrganizeScope(h);}});
});

for(const changed of ['removed','redirect','gate','purged'])test('metadata eligibility rejects '+changed+' before any text read',async t=>{
 const f=await fixture(t,{input:true});
 await f.s.foundationWrite(async tx=>{
  if(changed==='gate'){const row=await tx.get('meta','gate');await tx.put('meta',{...row,enabled:false});}
  else if(changed==='purged'){const rows=await tx.all('recordIndex');await tx.put('tombstones',{id:'source:'+rows[0].sourceKey});}
  else{const row=await tx.get('topics',f.topic.id);await tx.put('topics',{...row,...(changed==='removed'?{lifecycle:'removed'}:{redirectTo:crypto.randomUUID()})});}
 });
 const counter={count:0};await f.read(async tx=>{textGetters(tx,counter);await assert.rejects(captureOriginalOrganizeScope(f.s,tx,f.topic.id));});assert.equal(counter.count,0);
});
