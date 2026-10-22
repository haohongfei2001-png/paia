import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './harness/organize-material-method-fixture.mjs';
import {captureOriginalOrganizeScope,captureOriginalOrganizeCommitScope,readOriginalOrganizeScope,releaseOriginalOrganizeScope} from '../core/organizer/organize-processing-scope.js';
import {captureOrganizeProcessingGrant,releaseOrganizeProcessingGrant} from '../background/organize-processing-policy.js';

const scopeFile='/core/organizer/organize-processing-scope.js';
function allocationObserver(){
 const counts={snapshotObjects:0,metadataEncodes:0,fullCanonical:0},saved=[];
 const replace=(object,key,wrap)=>{const descriptor=Object.getOwnPropertyDescriptor(object,key);saved.push([object,key,descriptor]);Object.defineProperty(object,key,{...descriptor,value:wrap(descriptor.value)});};
 replace(Object,'create',original=>function(...args){if(args[0]===null){const stack=new Error().stack||'';if(stack.includes('/core/ai-usage/qwen-request-data.js:')&&stack.includes(scopeFile+':'))counts.snapshotObjects++;}return Reflect.apply(original,this,args);});
 replace(TextEncoder.prototype,'encode',original=>function(...args){const stack=new Error().stack||'';if(stack.includes(scopeFile+':')&&typeof args[0]==='string'&&/"(?:activeLayoutGeneration|storageSchema|entryId|targetKind|sourceRecordId)":/.test(args[0]))counts.metadataEncodes++;return Reflect.apply(original,this,args);});
 replace(JSON,'stringify',original=>function(...args){const value=args[0];if(value&&typeof value==='object'&&Object.getOwnPropertyDescriptor(value,'purpose')?.value==='organize-selection-provenance'){const stack=new Error().stack||'';if(stack.includes('/core/ai-usage/contracts.js:')&&stack.includes('/background/organize-action-source.js:'))counts.fullCanonical++;}return Reflect.apply(original,this,args);});
 return {counts,restore(){for(const [object,key,descriptor]of saved.reverse())Object.defineProperty(object,key,descriptor);}};
}
function requestCounter(tx){
 let requests=0;const seen=new WeakSet(),objectStore=tx.tx.objectStore.bind(tx.tx);const wrap=value=>{if(seen.has(value))return value;seen.add(value);for(const name of ['get','openCursor'])if(typeof value[name]==='function'){const original=value[name].bind(value);value[name]=(...args)=>{requests++;return original(...args);};}if(typeof value.index==='function'){const original=value.index.bind(value);value.index=(...args)=>wrap(original(...args));}return value;};tx.tx.objectStore=(...args)=>wrap(objectStore(...args));return ()=>requests;
}
function rawObserver(tx,observe){const seen=new WeakSet(),objectStore=tx.tx.objectStore.bind(tx.tx);tx.tx.objectStore=name=>{const store=objectStore(name);if(seen.has(store))return store;seen.add(store);const get=store.get.bind(store);store.get=key=>{const request=get(key);request.addEventListener('success',()=>observe(name,key,request.result));return request;};return store;};}
async function capture(f,{before=()=>{},source=f.source,action=f.action,commit=false,grant=true}={}){
 let handle,permission,metadata,requests=0,error;
 try{await f.s.run(()=>f.s.repository.transaction(commit,async tx=>{
  const count=requestCounter(tx);before(tx);
  try{handle=await (commit?captureOriginalOrganizeCommitScope:captureOriginalOrganizeScope)(f.s,tx,f.topic.id,source,action);metadata=readOriginalOrganizeScope(handle,f.s,tx);if(grant&&!commit)permission=captureOrganizeProcessingGrant(source,action,f.s,tx,handle);}
  finally{requests=count();releaseOrganizeProcessingGrant(permission);releaseOriginalOrganizeScope(handle);}
 }));}catch(caught){error=caught;}
 return {handle,metadata,requests,error};
}

test('paid readonly recapture avoids the original repeated snapshot, metadata UTF8, and complete canonical construction',async t=>{
 const f=await fixture(t),observer=allocationObserver();let first,second;
 try{first=await capture(f);second=await capture(f);}finally{observer.restore();}
 assert.equal(first.error,undefined);assert.equal(second.error,undefined);assert.equal(first.requests,12);assert.equal(second.requests,12);assert.notEqual(first.handle,second.handle);
 t.diagnostic(JSON.stringify({captures:2,requests:first.requests+second.requests,...observer.counts}));
 assert.deepEqual(observer.counts,{snapshotObjects:0,metadataEncodes:0,fullCanonical:0});
});

test('paid metadata values reuse one immutable root while every readonly proof remains fresh and transaction-bound',async t=>{
 const f=await fixture(t,{input:true}),first=await capture(f),second=await capture(f);assert.equal(first.error,undefined);assert.equal(second.error,undefined);
 assert.ok(first.requests>12&&second.requests===first.requests);assert.notEqual(first.handle,second.handle);
 await f.s.run(()=>f.s.repository.transaction(false,tx=>{assert.throws(()=>readOriginalOrganizeScope(first.handle,f.s,tx));assert.throws(()=>readOriginalOrganizeScope({...second.handle},f.s,tx));}));
 assert.strictEqual(first.metadata,second.metadata);assert.equal(Object.isFrozen(second.metadata.entries[0]),true);
 assert.equal(second.metadata.inputs.length,1);assert.equal(second.metadata.sources.length,1);
});

test('unbound GET metadata cannot supply the consumed action field grant',async t=>{
 const f=await fixture(t);await f.s.run(()=>f.s.repository.transaction(false,async tx=>{const proof=await captureOriginalOrganizeScope(f.s,tx,f.topic.id);try{assert.throws(()=>captureOrganizeProcessingGrant(f.source,f.action,f.s,tx,proof));}finally{releaseOriginalOrganizeScope(proof);}}));
 const next=await capture(f);assert.equal(next.error,undefined);assert.equal(next.requests,12);
});

test('copied or foreign source/action fail before any new metadata request',async t=>{
 const f=await fixture(t),other=await fixture(t);
 for(const [source,action]of [[{...f.source},f.action],[f.source,{...f.action}],[other.source,other.action]]){const value=await capture(f,{source,action});assert.ok(value.error);assert.equal(value.requests,0);}
});

test('selected metadata accessor is refused without touching it',async t=>{
 const f=await fixture(t);let touches=0;
 const result=await capture(f,{before:tx=>rawObserver(tx,(table,key,row)=>{if(table==='thoughts'&&key===f.entry.id)Object.defineProperty(row,'revision',{enumerable:true,configurable:true,get(){touches++;throw Error('SELECTED_GETTER');}});})});
 assert.ok(result.error);assert.equal(result.metadata,undefined);assert.equal(touches,0);
});

test('future nested semantic metadata remains unread and unretained',async t=>{
 const f=await fixture(t);let touches=0;
 const result=await capture(f,{before:tx=>rawObserver(tx,(table,key,row)=>{if(table==='thoughts'&&key===f.entry.id)for(const value of [row.fieldRevisions,row.authorship.body,row.protections.body])Object.defineProperty(value,'futureSemantic',{enumerable:true,configurable:true,get(){touches++;throw Error('UNKNOWN_GETTER');}});})});
 assert.equal(result.error,undefined);assert.equal(touches,0);assert.equal(JSON.stringify(result.metadata).includes('futureSemantic'),false);
});

test('known metadata drift cannot mint a new permission by refreshing its baseline',async t=>{
 const f=await fixture(t);const result=await capture(f,{before:tx=>rawObserver(tx,(table,key,row)=>{if(table==='thoughts'&&key===f.entry.id)row.revision++;})});
 assert.ok(result.error);assert.equal(result.metadata,undefined);assert.ok(result.requests>0);
});

test('readwrite selection stays on the original independent retained projection path',async t=>{
 const f=await fixture(t),first=await capture(f),observer=allocationObserver();let second;
 try{second=await capture(f,{commit:true,grant:false});}finally{observer.restore();}
 assert.equal(first.error,undefined);assert.equal(second.error,undefined);assert.notStrictEqual(first.metadata,second.metadata);assert.ok(observer.counts.snapshotObjects>0);assert.ok(observer.counts.metadataEncodes>0);assert.ok(observer.counts.fullCanonical>0);
});
