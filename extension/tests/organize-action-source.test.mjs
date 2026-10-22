import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,local} from './harness/thought-m1.mjs';
import {IDBFactory} from './vendor/fake-indexeddb/build/esm/index.js';
import {OrganizerStore} from '../core/organizer/store.js';
import {createOrganizeActionSource,readOriginalOrganizeAction} from '../background/organize-action-source.js';
import {captureOriginalOrganizeScope,releaseOriginalOrganizeScope} from '../core/organizer/organize-processing-scope.js';

const event=()=>{const listeners=new Set();return {addListener:f=>listeners.add(f),removeListener:f=>listeners.delete(f),emit:(...a)=>{for(const f of listeners)f(...a);},get size(){return listeners.size;}};};
async function fixture(t){
 const {s}=await setup(OrganizerStore),topic=await s.createTopic({name:'PRIVATE topic',operationId:crypto.randomUUID()}),entry=await s.createEntry({actor:'user',operationId:crypto.randomUUID(),body:'PRIVATE body',title:'PRIVATE title',note:'PRIVATE note',type:'idea',formation:'explicit',evidence:[]});
 await s.placeEntry({topicId:topic.id,entryId:entry.id,expectedEntryRevision:entry.revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:crypto.randomUUID()});
 const sender={id:'synthetic-extension',frameId:0,documentId:'document-one',documentLifecycle:'active',url:'chrome-extension://synthetic-extension/ui/archive.html',tab:{id:7,windowId:9,incognito:false}},onUpdated=event(),onRemoved=event(),trace=[];
 const tab={...sender.tab,url:sender.url},context={contextType:'TAB',documentId:sender.documentId,documentUrl:sender.url,tabId:7,windowId:9,frameId:0,incognito:false};
 const api={runtime:{id:sender.id,getURL:p=>'chrome-extension://synthetic-extension/'+p,async getContexts(){trace.push('context');return [context];}},tabs:{onUpdated,onRemoved,async get(){trace.push('tab');return tab;}}};
 const source=createOrganizeActionSource(s,api);t.after(()=>{source.dispose();s.repository.db?.close();});
 const select=()=>source.select(sender,{topicId:topic.id}),request=scope=>({topicId:topic.id,scopeBinding:scope.scopeBinding,userActionId:crypto.randomUUID()});
 const inspect=async action=>s.run(()=>s.repository.transaction(false,async tx=>{const proof=await captureOriginalOrganizeScope(s,tx,topic.id);try{return readOriginalOrganizeAction(source,action,s,tx,proof);}finally{releaseOriginalOrganizeScope(proof);}}));
 return {s,topic,entry,source,sender,api,tab,context,trace,onUpdated,onRemoved,select,request,inspect};
}

test('GET metadata selection cannot authorize text; one authenticated UPDATE creates only a private intent witness',async t=>{
 const f=await fixture(t),scope=await f.select();assert.equal(scope.complete,true);assert.equal(scope.eligibleCount,1);assert.match(scope.scopeBinding,/^[a-f0-9]{64}$/);assert.equal(JSON.stringify(scope).includes('PRIVATE'),false);
 await assert.rejects(f.inspect(scope));const req=f.request(scope),action=await f.source.consume(f.sender,req),intent=await f.inspect(action);
 assert.equal(intent.purpose,'organize-explicit-intent');assert.equal(intent.userActionId,req.userActionId);assert.equal('processing' in intent,false);assert.equal(JSON.stringify(intent).includes('PRIVATE'),false);
 assert.equal(await f.source.current(action,f.sender),true);await assert.rejects(f.source.consume(f.sender,req));await assert.rejects(f.inspect({...action}));f.source.release(action);await assert.rejects(f.inspect(action));
});

for(const kind of ['extension','document','tab','window','url','frame','incognito'])test('a copied wire ticket does not transfer intent to a different '+kind,async t=>{
 const f=await fixture(t),scope=await f.select(),sender=structuredClone(f.sender);
 if(kind==='extension')sender.id='other';if(kind==='document')sender.documentId='other';if(kind==='tab')sender.tab.id++;if(kind==='window')sender.tab.windowId++;if(kind==='url')sender.url+='?other';if(kind==='frame')sender.frameId=2;if(kind==='incognito')sender.tab.incognito=true;
 await assert.rejects(f.source.consume(sender,f.request(scope)));const action=await f.source.consume(f.sender,f.request(scope));assert.equal(await f.source.current(action,f.sender),true);
});

test('another runtime cannot consume the public scopeBinding from a prior owner',async t=>{
 const f=await fixture(t),scope=await f.select(),other=createOrganizeActionSource(f.s,f.api);try{await assert.rejects(other.consume(f.sender,f.request(scope)));}finally{other.dispose();}
});

for(const kind of ['restore','entry','gate','tab'])test('UPDATE refuses changed '+kind+' while retaining the original selection boundary',async t=>{
 const f=await fixture(t),scope=await f.select();
 if(kind==='tab')f.context.documentId='replacement';else await f.s.repository.transaction(true,async tx=>{if(kind==='restore')await tx.put('meta',{id:'recovery-restore-epoch',value:'changed'});if(kind==='entry'){const row=await tx.get('thoughts',f.entry.id);await tx.put('thoughts',{...row,revision:row.revision+1});}if(kind==='gate'){const row=await tx.get('meta','gate');await tx.put('meta',{...row,enabled:false});}});
 await assert.rejects(f.source.consume(f.sender,f.request(scope)));
});

test('navigation while GET authentication is pending cannot create a late ticket',async t=>{
 const f=await fixture(t);let release,enteredResolve;const entered=new Promise(r=>enteredResolve=r),original=f.api.runtime.getContexts;let held=false;f.api.runtime.getContexts=async()=>{if(!held){held=true;enteredResolve();await new Promise(r=>release=r);}return original();};
 const result=f.select();await entered;f.onUpdated.emit(f.sender.tab.id,{status:'loading'});release();await assert.rejects(result);f.api.runtime.getContexts=original;assert.equal((await f.select()).complete,true);
});

test('revoked pending work retains the shared eight acquisition slots until actual settlement',async t=>{
 const f=await fixture(t);const releases=[];let enter;const eight=new Promise(r=>enter=r),original=f.api.tabs.get;f.api.tabs.get=async()=>{await new Promise(r=>{releases.push(r);if(releases.length===8)enter();});return original();};
 const work=Array.from({length:8},()=>f.select().then(()=>false,()=>true));await eight;f.source.invalidate();await assert.rejects(f.select());for(const r of releases)r();assert.deepEqual(await Promise.all(work),Array(8).fill(true));f.api.tabs.get=original;assert.equal((await f.select()).complete,true);
});

test('the source holds at most eight live tickets even when selection calls overlap',async t=>{
 const f=await fixture(t);for(let i=0;i<7;i++)await f.select();const values=await Promise.all([f.select().then(x=>x,()=>null),f.select().then(x=>x,()=>null)]);assert.equal(values.filter(Boolean).length,1);await assert.rejects(f.select());
});

test('expiry is bounded from the start of GET and cannot be renewed by UPDATE',async t=>{
 const f=await fixture(t);const scope=await f.select(),original=Date.now,now=original();Date.now=()=>now+30001;try{await assert.rejects(f.source.consume(f.sender,f.request(scope)));}finally{Date.now=original;}
});

test('wall-clock rollback invalidates all prior tickets instead of extending their deadline',async t=>{
 const f=await fixture(t),scope=await f.select(),original=Date.now,now=original();Date.now=()=>now-1000;try{await assert.rejects(f.source.consume(f.sender,f.request(scope)));}finally{Date.now=original;}await assert.rejects(f.source.consume(f.sender,f.request(scope)));
});

test('a live original action still requires the exact transaction selection after an edit',async t=>{
 const f=await fixture(t),scope=await f.select(),action=await f.source.consume(f.sender,f.request(scope));await f.inspect(action);
 await f.s.repository.transaction(true,async tx=>{const row=await tx.get('thoughts',f.entry.id);await tx.put('thoughts',{...row,revision:row.revision+1});});await assert.rejects(f.inspect(action));
});

test('dispose unregisters source events and no old ticket survives',async t=>{
 const f=await fixture(t),scope=await f.select();assert.equal(f.onUpdated.size,1);assert.equal(f.onRemoved.size,1);f.source.dispose();assert.equal(f.onUpdated.size,0);assert.equal(f.onRemoved.size,0);await assert.rejects(f.source.consume(f.sender,f.request(scope)));await assert.rejects(f.select());
});


test('worker may construct the original action source before Repository first opens, then pins that database',async t=>{
 const s=new OrganizerStore(local(),{indexedDB:new IDBFactory()}),onUpdated=event(),onRemoved=event();
 const sender={id:'synthetic-extension',frameId:0,documentId:'first-document',url:'chrome-extension://synthetic-extension/ui/archive.html',tab:{id:7,windowId:9,incognito:false}};
 const api={runtime:{id:sender.id,getURL:p=>'chrome-extension://synthetic-extension/'+p,async getContexts(){return [{contextType:'TAB',documentId:sender.documentId,documentUrl:sender.url,tabId:7,windowId:9,frameId:0,incognito:false}];}},tabs:{onUpdated,onRemoved,async get(){return {...sender.tab,url:sender.url};}}};
 assert.equal(Object.hasOwn(s.repository,'db'),false);
 const source=createOrganizeActionSource(s,api);t.after(()=>{source.dispose();s.repository.db?.close();});
 assert.equal(Object.hasOwn(s.repository,'db'),false,'constructing an intent source cannot open or fabricate a database');
 await s.consent(true);const topic=await s.createTopic({name:'SYNTHETIC first open',operationId:crypto.randomUUID()}),scope=await source.select(sender,{topicId:topic.id});
 assert.equal(scope.complete,true);const db=s.repository.db;
 try{s.repository.db={};await assert.rejects(source.select(sender,{topicId:topic.id}));}finally{s.repository.db=db;}
 await assert.rejects(source.select(sender,{topicId:topic.id}),'restoring a replaced database never revives the source');
});
for(const inherited of [false,true])test('unopened source refuses '+(inherited?'inherited':'own')+' database accessors without evaluating them',()=>{
 const s=new OrganizerStore(local(),{indexedDB:new IDBFactory()});let touched=0;
 const descriptor={configurable:true,get(){touched++;return null;}},prior=Object.getPrototypeOf(s.repository);
 if(inherited)Object.setPrototypeOf(s.repository,Object.create(prior,{db:descriptor}));else Object.defineProperty(s.repository,'db',descriptor);
 assert.throws(()=>createOrganizeActionSource(s,{runtime:{},tabs:{}}));assert.equal(touched,0);
});
