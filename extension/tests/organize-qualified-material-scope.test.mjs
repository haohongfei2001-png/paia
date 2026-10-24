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

test('real consumed Archive action supplies an exact private adapter to the original material owner',async t=>{
 const f=await fixture(t);await f.read(async(_reader,grant,tx)=>{const cap=captureOriginalOrganizeScopeReader(grant,f.s,tx),prepared=await material(f,tx,cap);assert.equal(prepared.topic.id,f.topic.id);assert.equal(prepared.inputs.length,1);assert.equal(prepared.inputs[0].text,'PRIVATE authored body');assert.equal(prepared.style.value,'balanced');assert.equal(assertOriginalOrganizeScopeReaderFacts(cap,f.s,tx),true);});
});

test('qualified material uses only original style and settings without cloning unrelated preferences',async t=>{
 const f=await fixture(t);let getters=0,controlCalls=0;await f.read(async(_reader,grant,tx)=>{
  const preferences=f.s.controlCache.preferences;Object.defineProperty(preferences,'privateUnselectedText',{enumerable:true,configurable:true,get(){getters++;throw Error('Unselected');}});
  const original=f.s.control;f.s.control=async()=>{controlCalls++;throw Error('Whole control is forbidden for this capability');};
  try{const cap=captureOriginalOrganizeScopeReader(grant,f.s,tx),view=readOriginalOrganizeScopeReader(cap,f.s,tx);assert.deepEqual(Object.keys(view.controls),['settings','preferences']);assert.deepEqual(Object.keys(view.controls.preferences),[]);const prepared=await material(f,tx,cap);assert.equal(prepared.inputs[0].text,'PRIVATE authored body');}finally{f.s.control=original;delete preferences.privateUnselectedText;}
 });assert.equal(getters,0);assert.equal(controlCalls,0);
});

test('original explicit style is projected through the same first private snapshot',async t=>{
 const f=await fixture(t,{style:'concise'});await f.read(async(_reader,grant,tx)=>{const cap=captureOriginalOrganizeScopeReader(grant,f.s,tx),view=readOriginalOrganizeScopeReader(cap,f.s,tx);assert.ok(Object.isFrozen(view.controls.preferences.aiOrganizeStyle));const prepared=await material(f,tx,cap);assert.equal(prepared.style.value,'concise');assert.equal(prepared.style.expectedRevision,1);});
});

for(const kind of ['copied','foreign store','foreign transaction'])test('material adapter rejects '+kind+' before any original content request',async t=>{
 const f=await fixture(t);let requests=0;await f.read(async(_reader,grant,tx)=>{const cap=captureOriginalOrganizeScopeReader(grant,f.s,tx);rawObserve(tx,()=>requests++);if(kind==='copied')await assert.rejects(material(f,tx,{...cap}));if(kind==='foreign store')await assert.rejects(readLocalOrganizeScopeInTransaction({...f.s},tx,f.topic.id,profile,3,1,false,cap));if(kind==='foreign transaction')await assert.rejects(material(f,{...tx},cap));assert.equal(requests,0);});
});

test('released original purpose grant cannot become a material adapter',async t=>{
 const f=await fixture(t);await f.read(async(_reader,grant,tx)=>{releaseOrganizeProcessingGrant(grant);assert.throws(()=>captureOriginalOrganizeScopeReader(grant,f.s,tx));});
});

test('GET selection alone does not mint a purpose grant or read material',async t=>{
 const f=await fixture(t,{consume:false});let admitted=false;await assert.rejects(f.read(async()=>{admitted=true;}));assert.equal(admitted,false);
});

test('style metadata changes after GET still cannot mint purpose processing without UPDATE',async t=>{
 const f=await fixture(t,{consume:false});assert.equal((await f.s.updatePreferences({aiOrganizeStyle:{version:1,value:'concise',expectedRevision:0,expectedEpoch:'initial'}})).ok,true);assert.throws(()=>captureOriginalOrganizeScopeReader({},f.s,{}));let admitted=false;await assert.rejects(f.read(async()=>{admitted=true;}));assert.equal(admitted,false);
});

for(const kind of ['style replacement','settings replacement','late style getter'])test('after-await '+kind+' refuses before the first permitted Entry body',async t=>{
 const f=await fixture(t,{style:'balanced'});let bodies=0,unknown=0,changed=false;await assert.rejects(f.read(async(_reader,grant,tx)=>{
  const prefs=f.s.controlCache.preferences;const cap=captureOriginalOrganizeScopeReader(grant,f.s,tx);
  rawObserve(tx,(table,id,row)=>{if(table==='thoughts'&&row){bodies++;}if(table==='meta'&&id==='gate'&&!changed){changed=true;if(kind==='style replacement')prefs.aiOrganizeStyle={...prefs.aiOrganizeStyle};if(kind==='settings replacement')f.s.controlCache.settings={...f.s.controlCache.settings};if(kind==='late style getter')Object.defineProperty(prefs.aiOrganizeStyle,'value',{enumerable:true,configurable:true,get(){unknown++;return 'balanced';}});}});
  // The first gate IO is before the owner's first Entry body request.
  await material(f,tx,cap);
 }));assert.equal(changed,true);assert.equal(bodies,0);assert.equal(unknown,0);
});

test('a same-value style replacement observed once cannot revive the old material adapter',async t=>{
 const f=await fixture(t,{style:'balanced'});await f.read(async(_reader,grant,tx)=>{const prefs=f.s.controlCache.preferences,original=prefs.aiOrganizeStyle;const cap=captureOriginalOrganizeScopeReader(grant,f.s,tx);prefs.aiOrganizeStyle={...original};assert.throws(()=>readOriginalOrganizeScopeReader(cap,f.s,tx));prefs.aiOrganizeStyle=original;assert.throws(()=>readOriginalOrganizeScopeReader(cap,f.s,tx));});
});

test('a replaced public action clock is denied before its callback can mutate style',async t=>{
 const f=await fixture(t,{style:'balanced'});let changed=false,getters=0;await f.read(async(_reader,grant,tx)=>{const prefs=f.s.controlCache.preferences,before=Object.getOwnPropertyDescriptor(prefs.aiOrganizeStyle,'value');const cap=captureOriginalOrganizeScopeReader(grant,f.s,tx),now=Date.now;Date.now=()=>{changed=true;Object.defineProperty(prefs.aiOrganizeStyle,'value',{enumerable:true,configurable:true,get(){getters++;return 'balanced';}});return now();};try{assert.throws(()=>readOriginalOrganizeScopeReader(cap,f.s,tx));assert.throws(()=>assertOriginalOrganizeScopeReaderFacts(cap,f.s,tx));}finally{Date.now=now;}assert.deepEqual(Object.getOwnPropertyDescriptor(prefs.aiOrganizeStyle,'value'),before);});assert.equal(changed,false);assert.equal(getters,0);
});

test('finished transaction token cannot authorize a replacement transaction',async t=>{
 const f=await fixture(t);let held;await f.read(async(_reader,grant,tx)=>{held={cap:captureOriginalOrganizeScopeReader(grant,f.s,tx),tx};assert.equal((await material(f,tx,held.cap)).inputs.length,1);});assert.throws(()=>readOriginalOrganizeScopeReader(held.cap,f.s,held.tx));await f.read(async(_reader,_grant,tx)=>{await assert.rejects(material(f,tx,held.cap));});
});

test('legacy local material reader keeps its existing default semantics',async t=>{
 const f=await fixture(t);await f.read(async reader=>{const prepared=await readLocalOrganizeScopeInTransaction(f.s,reader,f.topic.id,profile,3,1,false);assert.equal(prepared.inputs[0].text,'PRIVATE authored body');});
});


test('a plain enable or pause switch without UPDATE cannot mint Organize processing',async t=>{
 const f=await fixture(t,{consume:false});let admitted=false;for(const enabled of [false,true]){assert.deepEqual(await f.s.setEnabled(enabled),{enabled});await assert.rejects(f.read(async()=>{admitted=true;}));assert.equal(admitted,false);assert.throws(()=>captureOriginalOrganizeScopeReader({},f.s,{}));}
});

test('style data replaced before capture is not accepted as original publication metadata',async t=>{
 const f=await fixture(t,{style:'balanced'});let bodies=0;await f.read(async(_reader,grant,tx)=>{rawObserve(tx,(table,_id,row)=>{if(table==='thoughts'&&row)bodies++;});f.s.controlCache.preferences.aiOrganizeStyle={version:1,value:'balanced',revision:1,explicit:true};assert.throws(()=>captureOriginalOrganizeScopeReader(grant,f.s,tx));});assert.equal(bodies,0);
});

for(const mutation of ['preferences','style'])test('original '+mutation+' accessor is refused without evaluation',async t=>{
 const f=await fixture(t,{style:'balanced'});let getters=0;await f.read(async(_reader,grant,tx)=>{const target=mutation==='preferences'?f.s.controlCache:f.s.controlCache.preferences,key=mutation==='preferences'?'preferences':'aiOrganizeStyle',d=Object.getOwnPropertyDescriptor(target,key);Object.defineProperty(target,key,{configurable:true,enumerable:true,get(){getters++;return d.value;}});try{assert.throws(()=>captureOriginalOrganizeScopeReader(grant,f.s,tx));}finally{Object.defineProperty(target,key,d);}});assert.equal(getters,0);
});

test('the material capability keeps all reads in the original cumulative action budget',async t=>{
 const f=await fixture(t);let first;await f.read(async(_reader,grant,tx)=>{const cap=captureOriginalOrganizeScopeReader(grant,f.s,tx);first=await material(f,tx,cap);assert.equal(first.inputs.length,1);const proof=await captureOriginalOrganizeScope(f.s,tx,f.topic.id);try{assert.throws(()=>chargeOriginalOrganizeWork(f.source,f.action,f.s,tx,proof,{reads:4096}));}finally{releaseOriginalOrganizeScope(proof);}});await assert.rejects(f.read(async(_r,grant,tx)=>material(f,tx,captureOriginalOrganizeScopeReader(grant,f.s,tx))));
});

test('original Input-derived visible material follows the same private reader and Source field scope',async t=>{
 const f=await fixture(t,{input:true});let legacyGetters=0;await f.read(async(_reader,grant,tx)=>{const cap=captureOriginalOrganizeScopeReader(grant,f.s,tx);rawObserve(tx,(table,_id,row)=>{if(table==='records'&&row)for(const name of ['note','editedText'])Object.defineProperty(row.value,name,{enumerable:true,configurable:true,get(){legacyGetters++;throw Error('Unselected Source annotation');}});});const prepared=await material(f,tx,cap);assert.equal(prepared.inputs.length,1);assert.equal(prepared.inputs[0].text,'Synthetic conclusion');});assert.equal(legacyGetters,0);
});

test('a material token cannot switch its selected Topic before original storage access',async t=>{
 const f=await fixture(t);let reads=0;await f.read(async(_reader,grant,tx)=>{const cap=captureOriginalOrganizeScopeReader(grant,f.s,tx);rawObserve(tx,()=>reads++);await assert.rejects(readLocalOrganizeScopeInTransaction(f.s,tx,'different-topic',profile,3,1,false,cap));});assert.equal(reads,0);
});
