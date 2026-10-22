import {IDBIndex} from './vendor/fake-indexeddb/build/esm/index.js';
import {MemoryService} from '../core/memory/service.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,derived} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {createOrganizeActionSource,chargeOriginalOrganizeActionWork,chargeOriginalOrganizeWork} from '../background/organize-action-source.js';
import {captureOriginalOrganizeScope,releaseOriginalOrganizeScope} from '../core/organizer/organize-processing-scope.js';
import {captureOrganizeProcessingGrant,readOrganizeProcessingGrant,organizeProcessingReader,releaseOrganizeProcessingGrant,captureOriginalOrganizeScopeReader,readOriginalOrganizeScopeReader,assertOriginalOrganizeScopeReaderFacts} from '../background/organize-processing-policy.js';
import {inputProjection} from '../core/thought-evidence.js';
import {readLocalOrganizeScopeInTransaction,readLocalOrganizeCurrentInTransaction} from '../core/organizer/ai-presentation.js';
import {configDefault,key as memoryKey} from '../core/memory/model.js';

const event=()=>({addListener(){},removeListener(){}});
async function fixture(t,{input=false,restriction=null,presentation=null,memorySetup=null,body='PRIVATE authored body',consume=true,style=null,count=1}={}){
 const {s}=await setup(OrganizerStore),topic=await s.createTopic({name:'PRIVATE topic',operationId:crypto.randomUUID()}),inputId=await s.run(()=>s.repository.transaction(false,async tx=>(await tx.all('blocks'))[0].id));
 const entry=input?await derived(s,[inputId]):await s.createEntry({actor:'user',operationId:crypto.randomUUID(),body,title:'PRIVATE title',note:'PRIVATE note',type:'idea',formation:'explicit',evidence:[]});
 await s.placeEntry({topicId:topic.id,entryId:entry.id,expectedEntryRevision:entry.revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:crypto.randomUUID()});
 for(let i=1;i<count;i++){const added=await s.createEntry({actor:'user',operationId:crypto.randomUUID(),body:'SYNTHETIC additional '+i,type:'idea',formation:'explicit',evidence:[]});await s.placeEntry({topicId:topic.id,entryId:added.id,expectedEntryRevision:added.revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:crypto.randomUUID()});}
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
function rawObserve(tx,onRow){const stores=new WeakSet(),original=tx.tx.objectStore.bind(tx.tx);tx.tx.objectStore=name=>{const store=original(name);if(stores.has(store))return store;stores.add(store);const get=store.get.bind(store);store.get=key=>{const request=get(key);request.addEventListener('success',()=>onRow(name,key,request.result,request));return request;};return store;};}


for(const options of [{count:1},{count:21},{input:true}])test('fixed current keeps the full proof and inputs while omitting only chronology: '+JSON.stringify(options),async t=>{
 const f=await fixture(t,options),open=IDBIndex.prototype.openCursor;let phase='capture',fullTime=0,currentTime=0;
 t.mock.method(IDBIndex.prototype,'openCursor',function(...args){if((new Error().stack||'').includes('entryTime (')){if(phase==='full')fullTime++;if(phase==='current')currentTime++;}return Reflect.apply(open,this,args);});
 await f.read(async(_reader,grant,tx)=>{
  const cap=captureOriginalOrganizeScopeReader(grant,f.s,tx);phase='full';
  const full=await readLocalOrganizeScopeInTransaction(f.s,tx,f.topic.id,profile,3,options.count>20?2:1,false,cap);
  phase='current';const current=await readLocalOrganizeCurrentInTransaction(f.s,tx,full,cap);phase='done';
  assert.equal(current.proof,full.proof);assert.deepEqual(current.inputs,full.inputs);assert.deepEqual(current.style,full.style);assert.equal(current.incremental,!!full.incremental);assert.equal(current.topic.id,full.topic.id);
  assert.deepEqual(Object.keys(current).sort(),['incremental','inputs','proof','style','topic']);assert.deepEqual(Object.keys(current.topic),['id']);
  assert.ok(full.topic.entries.every(e=>Object.hasOwn(e,'sourceSentAt')&&Object.hasOwn(e,'capturedAt')));assert.equal(assertOriginalOrganizeScopeReaderFacts(cap,f.s,tx),true);
 });assert.ok(fullTime>0);assert.equal(currentTime,0);t.diagnostic(JSON.stringify({boundary:'full/current chronology',count:options.count??1,fullTime,currentTime}));
});

const mutations=['same-valued method','Source consistently absent','Filter unknown','Entry CAS','style replaced','native clock replaced','pure action retirement'];
for(const kind of mutations)for(const mode of ['full','current'])test(mode+' preserves the original denial after '+kind,async t=>{
 const f=await fixture(t,{input:kind==='Source consistently absent'||kind==='Filter unknown',style:'balanced'});
 const expected=await f.read(async(_r,g,tx)=>material(f,tx,captureOriginalOrganizeScopeReader(g,f.s,tx)));
 let changed=false,calls=0,originalMethod,originalClock=Date.now;
 await f.read(async(_r,g,tx)=>{
  const cap=captureOriginalOrganizeScopeReader(g,f.s,tx);
  if(kind==='same-valued method'){originalMethod=f.s.readableEntry;f.s.readableEntry=function(...args){calls++;return originalMethod.apply(this,args);};changed=true;}
  if(kind==='pure action retirement'){assert.throws(()=>chargeOriginalOrganizeActionWork(f.source,f.action,f.s,4096,0));changed=true;}
  rawObserve(tx,(table,key,row,request)=>{
   if(kind==='Source consistently absent'&&table==='records'&&row){changed=true;Object.defineProperty(request,'result',{value:undefined,configurable:true});}
   if(kind==='Filter unknown'&&table==='filterInputs'&&key===f.inputId&&!changed){changed=true;row.aiDecision={version:1};}
   if(kind==='Entry CAS'&&table==='thoughts'&&key===f.entry.id&&!changed){changed=true;row.revision++;}
   if(table==='meta'&&key==='gate'&&!changed){
    if(kind==='style replaced'){changed=true;const prefs=f.s.controlCache.preferences;prefs.aiOrganizeStyle={...prefs.aiOrganizeStyle};}
    if(kind==='native clock replaced'){changed=true;Date.now=()=>{calls++;return originalClock();};}
   }
  });
  try{const result=await (mode==='current'?readLocalOrganizeCurrentInTransaction(f.s,tx,expected,cap):material(f,tx,cap)).then(value=>({value}),error=>({error}));if(kind==='Source consistently absent')t.diagnostic(JSON.stringify({mode,kind,returned:!!result.value,error:result.error?.code,changed}));assert.ok(result.error,'original material must reject');}
  finally{if(originalMethod)delete f.s.readableEntry;Date.now=originalClock;}
 });assert.equal(changed,true);assert.equal(calls,0);
});

for(const kind of ['copied cap','foreign store','foreign transaction','missing cap'])test('fixed current refuses '+kind+' before content IO',async t=>{
 const f=await fixture(t),expected=await f.read(async(_r,g,tx)=>material(f,tx,captureOriginalOrganizeScopeReader(g,f.s,tx)));let reads=0;
 await f.read(async(_r,g,tx)=>{const cap=captureOriginalOrganizeScopeReader(g,f.s,tx);rawObserve(tx,()=>reads++);
  await assert.rejects(readLocalOrganizeCurrentInTransaction(kind==='foreign store'?{...f.s}:f.s,kind==='foreign transaction'?{...tx}:tx,expected,kind==='copied cap'?{...cap}:kind==='missing cap'?null:cap));assert.equal(reads,0);
 });
});

for(const children of [0,5])for(const mode of ['full','current'])test(mode+' preserves invalid physical child count '+children,async t=>{
 const f=await fixture(t),expected=await f.read(async(_r,g,tx)=>material(f,tx,captureOriginalOrganizeScopeReader(g,f.s,tx)));
 await f.read(async(_r,g,tx)=>{const cap=captureOriginalOrganizeScopeReader(g,f.s,tx);await assert.rejects(mode==='current'?readLocalOrganizeCurrentInTransaction(f.s,tx,{...expected,physicalChildren:children},cap):readLocalOrganizeScopeInTransaction(f.s,tx,f.topic.id,profile,3,children,false,cap),e=>e.code==='INVALID_REQUEST');});
});

for(const mode of ['full','current'])test('actual original Source deletion after preparation denies '+mode+' without returning material',async t=>{
 const f=await fixture(t,{input:true}),expected=await f.read(async(_r,g,tx)=>material(f,tx,captureOriginalOrganizeScopeReader(g,f.s,tx)));
 const original=await f.s.repository.transaction(false,tx=>tx.get('thoughts',f.entry.id)),id=original.sourceRecordIds[0];assert.equal(typeof id,'string');
 await f.s.repository.transaction(true,async tx=>{assert.ok(await tx.get('records',id));assert.ok(await tx.get('recordIndex',id));await tx.delete('records',id);});
 assert.equal(await f.s.repository.transaction(false,tx=>f.s.sourcePresent(tx,[id])),false);
 let admitted=false;const result=await f.read(async(_r,g,tx)=>{admitted=true;const cap=captureOriginalOrganizeScopeReader(g,f.s,tx);return mode==='current'?readLocalOrganizeCurrentInTransaction(f.s,tx,expected,cap):material(f,tx,cap);}).then(value=>({value}),error=>({error}));t.diagnostic(JSON.stringify({boundary:'actual original Source deletion',mode,admitted,returned:!!result.value,error:result.error?.code}));assert.ok(result.error);assert.equal(result.value,undefined);
});
