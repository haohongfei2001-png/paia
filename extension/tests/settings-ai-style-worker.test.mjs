import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {FilterRunner} from '../core/filter-runner.js';
import {SafetyRunner} from '../core/thought-runner.js';
import {LibraryRunner} from '../core/library-runner.js';
import {ArchiveRepository} from '../core/idb-repository.js';
import {STORAGE_KEY} from '../core/constants.js';

test('actual worker style CAS schedules no filters, maintenance, Topic scan or provider while unrelated preferences keep their owner',async()=>{
 globalThis.indexedDB=new IDBFactory();globalThis.IDBKeyRange=IDBKeyRange;
 const id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',origin=`chrome-extension://${id}/`,ui={id,url:origin+'ui/archive.html'},values={},events=[];let listener,topicReads=0,failAfterWrite=false,failRead=false;
 const storage={setAccessLevel:async()=>{},get:async keys=>{if(failRead)throw Error('synthetic read failure');return keys===null?structuredClone(values):Object.fromEntries((Array.isArray(keys)?keys:[keys]).filter(k=>k in values).map(k=>[k,structuredClone(values[k])]));},set:async rows=>{Object.assign(values,structuredClone(rows));if(failAfterWrite)throw Error('synthetic lost ack');},remove:async()=>assert.fail('unexpected deletion'),getBytesInUse:async()=>0};
 globalThis.chrome={runtime:{id,getManifest:()=>({version:'0.15.0'}),getURL:path=>origin+path,sendMessage:async message=>events.push(message),onMessage:{addListener:fn=>listener=fn}},storage:{local:storage,session:{...storage,get:async()=>({}),set:async()=>{}}}};globalThis.fetch=async()=>assert.fail('no network');
 const prototypes=[FilterRunner.prototype,SafetyRunner.prototype,LibraryRunner.prototype],old=prototypes.map(p=>p.wake),wakes=[0,0,0],transaction=ArchiveRepository.prototype.transaction;
 try{
  prototypes.forEach((p,index)=>p.wake=async()=>{wakes[index]++;});
  await import('../background/service-worker.js');
  const send=(request,sender=ui)=>new Promise(resolve=>listener(request,sender,resolve));
  await send({type:'GET_BOUNDED_ORGANIZER'});await new Promise(resolve=>setImmediate(resolve));wakes.fill(0);events.length=0;
  ArchiveRepository.prototype.transaction=function(write,fn,stores){return transaction.call(this,write,t=>fn(new Proxy(t,{get(target,key){const value=target[key];if(typeof value!=='function')return value;return (...args)=>{if(['all','count','keys','edge'].includes(key)&&['topics','thoughts','placements','sections','organizerJobs'].includes(args[0]))topicReads++;return value.apply(target,args);};}})),stores);};
  const request=(value,expectedRevision)=>({type:'UPDATE_PREFERENCES',changes:{aiOrganizeStyle:{version:1,value,expectedRevision,expectedEpoch:'initial'}}});
  const read=()=>send({type:'PAIA_SETTINGS_AI_STYLE'});assert.deepEqual((await read()).data,{available:true,value:'balanced',revision:0,explicit:false,epoch:'initial'});
  for(const sender of [{id,url:origin+'ui/popup.html'},{...ui,frameId:1},{...ui,tab:{incognito:true}},{...ui,url:ui.url+'#spoof'},{...ui,url:ui.url+'?private=query'}]){assert.equal((await send({type:'PAIA_SETTINGS_AI_STYLE'},sender)).error,'FORBIDDEN');assert.equal((await send(request('original',0),sender)).error,'FORBIDDEN');}
  assert.equal((await send({type:'PAIA_SETTINGS_AI_STYLE',scan:true})).error,'INVALID_REQUEST');assert.equal((await send({...request('balanced',0),activate:true})).error,'INVALID_REQUEST');
  assert.deepEqual(await send(request('balanced',0)),{ok:true,data:{ok:true,changed:true}});
  assert.deepEqual(await send(request('original',0)),{ok:true,data:{conflict:true}});
  assert.deepEqual(await send(request('balanced',1)),{ok:true,data:{ok:true,changed:false}});
  assert.equal((await send({...request('concise',1),changes:{...request('concise',1).changes,appearance:'dark'}})).error,'INVALID_REQUEST');
  assert.equal((await send(request('concise',1),{id,url:'https://chatgpt.com/c/synthetic',frameId:0,tab:{id:1,url:'https://chatgpt.com/c/synthetic'}})).error,'FORBIDDEN');
  await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(wakes,[0,0,0]);assert.equal(topicReads,0);assert.equal(values[STORAGE_KEY].preferences.aiOrganizeStyle.value,'balanced');
  assert.deepEqual(events,[{type:'PAIA_SETTINGS_AI_STYLE_CHANGED'}],'only actual acknowledged intent notifies the bounded cross-window reader');
  assert.deepEqual((await read()).data,{available:true,value:'balanced',revision:1,explicit:true,epoch:'initial'});
  failAfterWrite=true;assert.equal((await send(request('concise',1))).error,'STORAGE_FAILED');failAfterWrite=false;assert.deepEqual((await read()).data,{available:true,value:'concise',revision:2,explicit:true,epoch:'initial'});assert.deepEqual((await send(request('original',1))).data,{conflict:true});
  failRead=true;assert.equal((await read()).error,'STORAGE_FAILED');failRead=false;assert.equal((await read()).data.value,'concise');
  await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(wakes,[0,0,0]);assert.equal(topicReads,0);assert.equal(events.length,1);
  await send({type:'UPDATE_PREFERENCES',changes:{appearance:'dark'}});await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(wakes,[1,1,1],'unrelated preferences preserve the existing maintenance contract');
  assert.equal(values[STORAGE_KEY].preferences.aiOrganizeStyle.revision,2);
 }finally{prototypes.forEach((p,index)=>p.wake=old[index]);ArchiveRepository.prototype.transaction=transaction;}
});
