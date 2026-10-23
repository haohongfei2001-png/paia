import {MemoryService} from '../core/memory/service.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,derived} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {createOrganizeActionSource} from '../background/organize-action-source.js';
import {captureOriginalOrganizeScope,releaseOriginalOrganizeScope} from '../core/organizer/organize-processing-scope.js';
import {captureOrganizeProcessingGrant,readOrganizeProcessingGrant,organizeProcessingReader,releaseOrganizeProcessingGrant} from '../background/organize-processing-policy.js';
import {inputProjection} from '../core/thought-evidence.js';
import {readLocalOrganizeScopeInTransaction} from '../core/organizer/ai-presentation.js';
import {configDefault,key as memoryKey} from '../core/memory/model.js';

const event=()=>({addListener(){},removeListener(){}});
async function fixture(t,{input=false,restriction=null,presentation=null,memorySetup=null,body='PRIVATE authored body'}={}){
 const {s}=await setup(OrganizerStore),topic=await s.createTopic({name:'PRIVATE topic',operationId:crypto.randomUUID()}),inputId=await s.run(()=>s.repository.transaction(false,async tx=>(await tx.all('blocks'))[0].id));
 const entry=input?await derived(s,[inputId]):await s.createEntry({actor:'user',operationId:crypto.randomUUID(),body,title:'PRIVATE title',note:'PRIVATE note',type:'idea',formation:'explicit',evidence:[]});
 await s.placeEntry({topicId:topic.id,entryId:entry.id,expectedEntryRevision:entry.revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:crypto.randomUUID()});
 const sender={id:'synthetic',frameId:0,documentId:'document',url:'chrome-extension://synthetic/ui/archive.html',tab:{id:1,windowId:2,incognito:false}},api={runtime:{id:sender.id,getURL:p=>'chrome-extension://synthetic/'+p,async getContexts(){return [{contextType:'TAB',documentId:sender.documentId,documentUrl:sender.url,tabId:1,windowId:2,frameId:0,incognito:false}];}},tabs:{onUpdated:event(),onRemoved:event(),async get(){return {...sender.tab,url:sender.url};}}},source=createOrganizeActionSource(s,api);
 t.after(()=>{source.dispose();s.repository.db?.close();});
 if(restriction)await s.repository.transaction(true,async tx=>{if(restriction==='localOnly')await tx.put('meta',{...configDefault(),localOnly:true});if(restriction==='entry')await tx.put('meta',{id:memoryKey('entry',entry.id),kind:'entry',version:1,entryId:entry.id,excluded:true});if(restriction==='input')await tx.put('meta',{id:memoryKey('input',inputId),kind:'input',version:1,inputId,excluded:true});if(restriction==='topic')await tx.put('meta',{id:memoryKey('topic','default',topic.id),kind:'topic',version:1,profileId:'default',topicId:topic.id,decision:'never',layoutGeneration:1});});
 if(memorySetup)await memorySetup(new MemoryService(s));
 if(presentation){const row=await presentation({s,topic,entry,inputId});await s.repository.transaction(true,tx=>tx.put('meta',row));}
 const selection=await source.select(sender,{topicId:topic.id}),action=await source.consume(sender,{topicId:topic.id,scopeBinding:selection.scopeBinding,userActionId:crypto.randomUUID()});
 const read=fn=>s.run(()=>s.repository.transaction(false,async tx=>{const proof=await captureOriginalOrganizeScope(s,tx,topic.id,source,action);let grant;try{grant=captureOrganizeProcessingGrant(source,action,s,tx,proof);return await fn(organizeProcessingReader(grant,s,tx),grant,tx);}finally{if(grant)releaseOrganizeProcessingGrant(grant);releaseOriginalOrganizeScope(proof);}}));
 return {s,source,topic,entry,inputId,action,read};
}

const observeGets=(tx,table,id)=>{let count=0;const wrapped=new WeakSet(),original=tx.tx.objectStore.bind(tx.tx);tx.tx.objectStore=name=>{const object=original(name);if(name!==table||wrapped.has(object))return object;wrapped.add(object);const get=object.get.bind(object);object.get=key=>{if(key===id)count++;return get(key);};return object;};return ()=>count;};

test('readonly-template: completed qualified get is one physical read and returned descriptors stay isolated',async t=>{
 const f=await fixture(t);await f.read(async(reader,_grant,tx)=>{const count=observeGets(tx,'thoughts',f.entry.id),first=await reader.get('thoughts',f.entry.id);assert.equal(first.thoughtText,'PRIVATE authored body');Object.defineProperty(first,'thoughtText',{value:'CALLER CHANGE',configurable:true});first.fieldRevisions={body:999};first.unselected='CALLER ONLY';const next=await reader.get('thoughts',f.entry.id);assert.notEqual(first,next);assert.equal(next.thoughtText,'PRIVATE authored body');assert.notEqual(next.fieldRevisions.body,999);assert.equal(Object.hasOwn(next,'unselected'),false);assert.equal(count(),1);});
});
test('readonly-template: positive metadata is fresh and caller mutation cannot poison the next read',async t=>{
 const f=await fixture(t);await f.read(async(reader,_grant,tx)=>{const count=observeGets(tx,'meta','gate'),first=await reader.get('meta','gate'),expected={...first};first.enabled=false;Object.defineProperty(first,'privateNext',{get(){throw Error('CALLER GETTER');}});const next=await reader.get('meta','gate');assert.deepEqual(next,expected);assert.equal(count(),1);});
});
for(const result of ['undefined','null'])test('readonly-template: completed missing '+result+' remains distinct and bounded',async t=>{
 const f=await fixture(t);await f.read(async(reader,_grant,tx)=>{let count=0;const wrapped=new WeakSet(),original=tx.tx.objectStore.bind(tx.tx);tx.tx.objectStore=name=>{const object=original(name);if(name!=='meta'||wrapped.has(object))return object;wrapped.add(object);const get=object.get.bind(object);object.get=key=>{const request=get(key);if(key==='backup-recovery-settings'){count++;if(result==='null')request.addEventListener('success',()=>Object.defineProperty(request,'result',{value:null,configurable:true}));}return request;};return object;};const expected=result==='null'?null:undefined;assert.equal(await reader.get('meta','backup-recovery-settings'),expected);assert.equal(await reader.get('meta','backup-recovery-settings'),expected);assert.equal(count,1);});
});
for(const revoke of ['source','grant','method'])test('readonly-template: observed '+revoke+' retirement rejects cached rows and emitted field getters permanently',async t=>{
 const f=await fixture(t);await f.read(async(reader,grant,tx)=>{const count=observeGets(tx,'thoughts',f.entry.id),first=await reader.get('thoughts',f.entry.id);const descriptor=Object.getOwnPropertyDescriptor(tx,'get');let touched=0;if(revoke==='source')f.source.invalidate();else if(revoke==='grant')releaseOrganizeProcessingGrant(grant);else Object.defineProperty(tx,'get',{configurable:true,get(){touched++;throw Error('LATE METHOD GETTER');}});try{await assert.rejects(reader.get('thoughts',f.entry.id));}finally{if(revoke==='method'){if(descriptor)Object.defineProperty(tx,'get',descriptor);else delete tx.get;}}await assert.rejects(reader.get('thoughts',f.entry.id));assert.throws(()=>first.thoughtText);assert.equal(count(),1);assert.equal(touched,0);});
});
test('readonly-template: a closed original transaction cannot reuse its result and a new transaction reads again',async t=>{
 const f=await fixture(t);let previous,first,reads=0;await f.read(async(reader,_grant,tx)=>{const count=observeGets(tx,'thoughts',f.entry.id);previous=reader;first=await reader.get('thoughts',f.entry.id);reads+=count();});await assert.rejects(previous.get('thoughts',f.entry.id));assert.throws(()=>first.thoughtText);await f.read(async(reader,_grant,tx)=>{const count=observeGets(tx,'thoughts',f.entry.id);assert.equal((await reader.get('thoughts',f.entry.id)).thoughtText,'PRIVATE authored body');reads+=count();});assert.equal(reads,2);
});
test('readonly-template: in-flight reads are never joined or charged as a hit',async t=>{
 const f=await fixture(t);await f.read(async(reader,_grant,tx)=>{const count=observeGets(tx,'thoughts',f.entry.id);await Promise.all([reader.get('thoughts',f.entry.id),reader.get('thoughts',f.entry.id)]);assert.equal(count(),2);assert.equal((await reader.get('thoughts',f.entry.id)).thoughtText,'PRIVATE authored body');assert.equal(count(),2);});
});
test('readonly-template: original readwrite reads are never cached',async t=>{
 const {captureOriginalOrganizeCommitScope}=await import('../core/organizer/organize-processing-scope.js'),f=await fixture(t);await f.s.run(()=>f.s.repository.transaction(true,async tx=>{const proof=await captureOriginalOrganizeCommitScope(f.s,tx,f.topic.id,f.source,f.action);let grant;try{grant=captureOrganizeProcessingGrant(f.source,f.action,f.s,tx,proof);const reader=organizeProcessingReader(grant,f.s,tx),count=observeGets(tx,'thoughts',f.entry.id);assert.equal((await reader.get('thoughts',f.entry.id)).thoughtText,'PRIVATE authored body');assert.equal((await reader.get('thoughts',f.entry.id)).thoughtText,'PRIVATE authored body');assert.equal(count(),2);}finally{if(grant)releaseOrganizeProcessingGrant(grant);releaseOriginalOrganizeScope(proof);}}));
});
test('readonly-template: retaining selected fields without invoking them still debits the original cumulative byte limit',async t=>{
 const f=await fixture(t,{body:'x'.repeat(100000)});let refused=false,completed=0;for(let i=0;i<30;i++){try{await f.read(reader=>reader.get('thoughts',f.entry.id));completed++;}catch{refused=true;break;}}assert.ok(completed>0);assert.equal(refused,true);await assert.rejects(f.read(reader=>reader.get('thoughts',f.entry.id)));
});
