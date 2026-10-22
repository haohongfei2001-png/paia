import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
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

test('one original immutable selection is deeply compared once while every read keeps its live transaction boundary',async t=>{
 const f=await fixture(t),scope=await f.select(),action=await f.source.consume(f.sender,f.request(scope));let observed;
 await f.s.run(()=>f.s.repository.transaction(false,async tx=>{
  const proof=await captureOriginalOrganizeScope(f.s,tx,f.topic.id),descriptor=Object.getOwnPropertyDescriptor(JSON,'stringify'),original=descriptor.value;let comparisons=0;
  Object.defineProperty(JSON,'stringify',{...descriptor,value:function(value,...args){if(value&&typeof value==='object'&&Object.getOwnPropertyDescriptor(value,'purpose')?.value==='organize-selection-provenance')comparisons++;return Reflect.apply(original,this,[value,...args]);}});
  try{const initial=readOriginalOrganizeAction(f.source,action,f.s,tx,proof),reads=f.s.repository.metrics.reads;for(let i=0;i<100;i++)assert.strictEqual(readOriginalOrganizeAction(f.source,action,f.s,tx,proof).metadata,initial.metadata);assert.equal(f.s.repository.metrics.reads,reads);observed=comparisons;assert.throws(()=>readOriginalOrganizeAction(f.source,action,f.s,tx,{...proof}));releaseOriginalOrganizeScope(proof);assert.throws(()=>readOriginalOrganizeAction(f.source,action,f.s,tx,proof));}
  finally{Object.defineProperty(JSON,'stringify',descriptor);releaseOriginalOrganizeScope(proof);}
 }));console.log(JSON.stringify({control:'original-metadata-comparisons',observed}));assert.equal(observed,1);
});
test('a compared original proof cannot cross transaction or action lifetime',async t=>{
 const f=await fixture(t),scope=await f.select(),action=await f.source.consume(f.sender,f.request(scope));let proof;
 await f.s.run(()=>f.s.repository.transaction(false,async tx=>{proof=await captureOriginalOrganizeScope(f.s,tx,f.topic.id);readOriginalOrganizeAction(f.source,action,f.s,tx,proof);}));
 try{await f.s.run(()=>f.s.repository.transaction(false,async tx=>{assert.throws(()=>readOriginalOrganizeAction(f.source,action,f.s,tx,proof));const fresh=await captureOriginalOrganizeScope(f.s,tx,f.topic.id);try{readOriginalOrganizeAction(f.source,action,f.s,tx,fresh);f.source.invalidate();assert.throws(()=>readOriginalOrganizeAction(f.source,action,f.s,tx,fresh));}finally{releaseOriginalOrganizeScope(fresh);}}));}finally{releaseOriginalOrganizeScope(proof);}
});
test('new transaction selection changes still reject after an earlier comparison',async t=>{
 const f=await fixture(t),scope=await f.select(),action=await f.source.consume(f.sender,f.request(scope));await f.inspect(action);
 await f.s.repository.transaction(true,async tx=>{const row=await tx.get('thoughts',f.entry.id);await tx.put('thoughts',{...row,revision:row.revision+1});});await assert.rejects(f.inspect(action));
});
test('a fresh original facts identity with equal content receives its own deep comparison',async t=>{
 const f=await fixture(t),scope=await f.select(),action=await f.source.consume(f.sender,f.request(scope));let observed;
 await f.s.run(()=>f.s.repository.transaction(false,async tx=>{
  const first=await captureOriginalOrganizeScope(f.s,tx,f.topic.id),second=await captureOriginalOrganizeScope(f.s,tx,f.topic.id),descriptor=Object.getOwnPropertyDescriptor(JSON,'stringify'),original=descriptor.value;let comparisons=0;
  Object.defineProperty(JSON,'stringify',{...descriptor,value:function(value,...args){if(value&&typeof value==='object'&&Object.getOwnPropertyDescriptor(value,'purpose')?.value==='organize-selection-provenance')comparisons++;return Reflect.apply(original,this,[value,...args]);}});
  try{const a=readOriginalOrganizeAction(f.source,action,f.s,tx,first),b=readOriginalOrganizeAction(f.source,action,f.s,tx,second);assert.notStrictEqual(a.metadata,b.metadata);assert.deepEqual(a.metadata,b.metadata);readOriginalOrganizeAction(f.source,action,f.s,tx,first);readOriginalOrganizeAction(f.source,action,f.s,tx,second);observed=comparisons;}
  finally{Object.defineProperty(JSON,'stringify',descriptor);releaseOriginalOrganizeScope(first);releaseOriginalOrganizeScope(second);}
 }));assert.equal(observed,2);
});
test('memoized facts never replace the original data-method and source descriptor guards',async t=>{
 const f=await fixture(t),scope=await f.select(),action=await f.source.consume(f.sender,f.request(scope));
 await f.s.run(()=>f.s.repository.transaction(false,async tx=>{
  const proof=await captureOriginalOrganizeScope(f.s,tx,f.topic.id),method=Object.getOwnPropertyDescriptor(tx,'get'),repository=Object.getOwnPropertyDescriptor(f.s,'repository');let getterCalls=0;
  try{readOriginalOrganizeAction(f.source,action,f.s,tx,proof);Object.defineProperty(tx,'get',{configurable:true,writable:true,value:async()=>null});assert.throws(()=>readOriginalOrganizeAction(f.source,action,f.s,tx,proof));if(method)Object.defineProperty(tx,'get',method);else delete tx.get;Object.defineProperty(f.s,'repository',{configurable:true,get(){getterCalls++;return repository.value;}});assert.throws(()=>readOriginalOrganizeAction(f.source,action,f.s,tx,proof));assert.equal(getterCalls,0);Object.defineProperty(f.s,'repository',repository);assert.throws(()=>readOriginalOrganizeAction(f.source,action,f.s,tx,proof));}
  finally{if(method)Object.defineProperty(tx,'get',method);else delete tx.get;Object.defineProperty(f.s,'repository',repository);releaseOriginalOrganizeScope(proof);}
 }));
});
