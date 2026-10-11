import test from 'node:test';
import assert from 'node:assert/strict';
import {ArchiveArrival} from '../background/archive-arrival.js';
import {installArchiveArrival} from '../ui/archive-arrival.js';

const url='chrome-extension://synthetic/ui/archive.html';
const descriptor={version:1,query:'SYNTHETIC private query',scope:{ranked:true,providerKey:null,projectRef:null,includeFiltered:true,dateFrom:'',dateTo:''},searchSnapshot:null,ref:null};
const source={tabId:1,windowId:9,frameId:2,nonce:'synthetic-nonce',documentId:'source-frame-document',url:'https://chatgpt.com/c/synthetic'};
function fixture({existing=true}={}){
 const tabs=new Map([[1,{id:1,windowId:9,url:source.url,incognito:false}]]);if(existing)tabs.set(2,{id:2,windowId:9,url,incognito:false});
 const events=[],listeners=[];let valid=true,consent=true,nonce=source.nonce,qualifications=0;
 const service={s:{status:async()=>({consented:consent})},qualifyArchiveArrival:async value=>{qualifications++;if(!valid)throw new Error('MEMORY_STALE');return structuredClone(value);}};
 const api={runtime:{id:'synthetic',getURL:path=>'chrome-extension://synthetic/'+path,getContexts:async filter=>filter.documentIds?(filter.documentIds[0]===source.documentId?[{documentId:source.documentId,tabId:1,windowId:9,frameId:2,documentUrl:'chrome-extension://synthetic/ui/prompt-surface.html#'+source.nonce}]:[{documentId:'archive-document',tabId:2,windowId:9,frameId:0,documentUrl:url}]):[...tabs.values()].filter(t=>t.url===url).map(t=>({tabId:t.id,windowId:t.windowId,documentUrl:t.url,incognito:t.incognito})),sendMessage:async m=>{events.push(['message',m]);for(const listener of listeners)listener(m);},onMessage:{addListener:fn=>listeners.push(fn)}},tabs:{get:async id=>{if(!tabs.has(id))throw Error('gone');return {...tabs.get(id)};},sendMessage:async()=>({open:true,nonce,url:source.url}),create:async spec=>{events.push(['create',spec]);const tab={id:2,incognito:false,...spec};tabs.set(2,tab);return tab;},update:async(id,value)=>{events.push(['update',id,value]);Object.assign(tabs.get(id),value);return tabs.get(id);}}};
 const broker=new ArchiveArrival(service,api),sender={id:'synthetic',url,tab:{id:2,windowId:9,incognito:false},frameId:0,documentId:'archive-document',documentLifecycle:'active'};
 const ready=()=>broker.handle({type:'PAIA_ARCHIVE_ARRIVAL_READY'},sender);
 const wait=async()=>{for(let i=0;i<30&&!broker.pending.size;i++)await new Promise(r=>setImmediate(r));assert.equal(broker.pending.size,1);};
 return {broker,api,tabs,events,sender,ready,wait,setValid:v=>valid=v,setConsent:v=>consent=v,setNonce:v=>nonce=v,count:()=>qualifications};
}
test('existing same-window app claims exactly once, qualifies after leave and acknowledges actual result',async()=>{
 const f=fixture(),done=f.broker.open(descriptor,source);await f.wait();const claimed=await f.ready();assert.equal(claimed.query,descriptor.query);assert.equal(await f.ready(),null);
 assert.equal(f.events.some(e=>e[0]==='create'),false);assert.equal(JSON.stringify(f.events).includes(descriptor.query),false);
 await f.broker.handle({type:'PAIA_ARCHIVE_ARRIVAL_QUALIFY',requestId:claimed.requestId},f.sender);
 await f.broker.handle({type:'PAIA_ARCHIVE_ARRIVAL_RESULT',requestId:claimed.requestId,status:'opened'},f.sender);
 assert.deepEqual(await done,{status:'opened'});assert.equal(f.count(),3);assert.equal(f.broker.pending.size,0);
 await assert.rejects(f.broker.handle({type:'PAIA_ARCHIVE_ARRIVAL_RESULT',requestId:claimed.requestId,status:'opened'},f.sender),{code:'FORBIDDEN'});
});
test('cold creation uses plain URL, and late wakeup closes READY-before-association without replay',async()=>{
 const f=fixture({existing:false}),create=f.api.tabs.create;f.api.tabs.create=async spec=>{const tab=await create(spec);assert.equal(await f.ready(),null);return tab;};
 const done=f.broker.open(descriptor,source);await f.wait();await new Promise(r=>setImmediate(r));
 assert.equal(f.events.find(e=>e[0]==='create')[1].url,url);assert.ok(f.events.some(e=>e[0]==='message'));
 const claimed=await f.ready();await f.broker.handle({type:'PAIA_ARCHIVE_ARRIVAL_RESULT',requestId:claimed.requestId,status:'cancelled'},f.sender);assert.deepEqual(await done,{status:'cancelled'});
});
test('foreign windows, app frames/documents, malformed result and prequalification success cannot consume an intent',async()=>{
 const f=fixture(),done=f.broker.open(descriptor,source);await f.wait();const claimed=await f.ready();
 for(const sender of [{...f.sender,id:'foreign'},{...f.sender,frameId:1},{...f.sender,url:url+'?q=secret'},{...f.sender,tab:{...f.sender.tab,windowId:99}},{...f.sender,documentId:'reloaded'}])await assert.rejects(f.broker.handle({type:'PAIA_ARCHIVE_ARRIVAL_QUALIFY',requestId:claimed.requestId},sender),{code:'FORBIDDEN'});
 await assert.rejects(f.broker.handle({type:'PAIA_ARCHIVE_ARRIVAL_RESULT',requestId:claimed.requestId,status:'opened'},f.sender),{code:'FORBIDDEN'});
 await assert.rejects(f.broker.handle({type:'PAIA_ARCHIVE_ARRIVAL_RESULT',requestId:claimed.requestId,status:'cancelled',body:'injection'},f.sender),{code:'FORBIDDEN'});
 f.broker.removeTab(2);assert.deepEqual(await done,{status:'cancelled'});
});
test('stale source nonce, consent or selected revision after leave refuses before navigation permission',async()=>{
 for(const change of [f=>f.setNonce('replaced'),f=>f.setConsent(false),f=>f.setValid(false)]){
  const f=fixture(),done=f.broker.open(descriptor,source);await f.wait();const claimed=await f.ready();change(f);
  await assert.rejects(f.broker.handle({type:'PAIA_ARCHIVE_ARRIVAL_QUALIFY',requestId:claimed.requestId},f.sender));
  f.broker.removeTab(1);assert.deepEqual(await done,{status:'cancelled'});
 }
});
test('selected revision changing during actual page arrival cannot receive successful acknowledgement',async()=>{
 const f=fixture(),done=f.broker.open(descriptor,source);await f.wait();const claimed=await f.ready();await f.broker.handle({type:'PAIA_ARCHIVE_ARRIVAL_QUALIFY',requestId:claimed.requestId},f.sender);f.setValid(false);
 await assert.rejects(f.broker.handle({type:'PAIA_ARCHIVE_ARRIVAL_RESULT',requestId:claimed.requestId,status:'opened'},f.sender));assert.deepEqual(await done,{status:'unavailable'});
});
test('explicit new request supersedes previous claimed intent; reload and source SPA revoke without replay',async()=>{
 const f=fixture(),old=f.broker.open(descriptor,source);await f.wait();const first=await f.ready();const next=f.broker.open({...descriptor,query:'new synthetic'},source);assert.deepEqual(await old,{status:'cancelled'});
 await assert.rejects(f.broker.handle({type:'PAIA_ARCHIVE_ARRIVAL_QUALIFY',requestId:first.requestId},f.sender),{code:'FORBIDDEN'});
 const second=await f.ready();assert.equal(second.query,'new synthetic');f.broker.changedTab(2,{status:'loading'});await new Promise(r=>setImmediate(r));assert.equal(f.broker.pending.size,1,'same document route status is not reload');const contexts=f.api.runtime.getContexts;f.api.runtime.getContexts=async filter=>filter.documentIds?.[0]==='archive-document'?[]:contexts(filter);f.broker.changedTab(2,{status:'loading'});assert.deepEqual(await next,{status:'cancelled'});f.api.runtime.getContexts=contexts;
 const third=f.broker.open(descriptor,source);await f.wait();f.broker.changedTab(1,{url:source.url+'/new'});assert.deepEqual(await third,{status:'cancelled'});
});
test('ambiguous app tabs and unavailable permission-free context discovery do not create a bypass tab',async()=>{
 for(const missing of [true,false]){
  const f=fixture();if(missing)delete f.api.runtime.getContexts;else f.tabs.set(3,{id:3,windowId:9,url,incognito:false});
  await assert.rejects(f.broker.open(descriptor,source),{code:'UNAVAILABLE'});assert.equal(f.events.length,0);
 }
});
test('receiver waits original startup, delegates exact intent once and preserves declined navigation',async()=>{
 const listeners=[],calls=[];let release;const startup=new Promise(r=>release=r);let claimed=false;
 const request=async(type,data)=>{calls.push([type,data]);if(type==='PAIA_ARCHIVE_ARRIVAL_READY'){if(claimed)return null;claimed=true;return {requestId:'synthetic-request',...descriptor};}return {qualified:true};};
 const receiver=installArchiveArrival({api:{runtime:{onMessage:{addListener:f=>listeners.push(f)}}},request,startup,arrive:async(intent,qualify)=>{assert.equal(intent.query,descriptor.query);await qualify();return 'cancelled';},unavailable:()=>assert.fail('unexpected failure')});
 assert.deepEqual(calls,[]);release();await receiver.wake();await new Promise(r=>setImmediate(r));
 assert.equal(calls.filter(([t])=>t==='PAIA_ARCHIVE_ARRIVAL_RESULT').length,1);assert.equal(calls.find(([t])=>t==='PAIA_ARCHIVE_ARRIVAL_RESULT')[1].status,'cancelled');
 listeners[0]({type:'PAIA_ARCHIVE_ARRIVAL_AVAILABLE'});await new Promise(r=>setImmediate(r));assert.equal(calls.filter(([t])=>t==='PAIA_ARCHIVE_ARRIVAL_RESULT').length,1);
});

test('same nonce iframe reload invalidates the exact original source document',async()=>{
 const f=fixture(),done=f.broker.open(descriptor,source);await f.wait();const claimed=await f.ready(),base=f.api.runtime.getContexts;f.api.runtime.getContexts=async filter=>filter.documentIds?[]:base(filter);
 await assert.rejects(f.broker.handle({type:'PAIA_ARCHIVE_ARRIVAL_QUALIFY',requestId:claimed.requestId},f.sender),{code:'FORBIDDEN'});f.broker.removeTab(1);assert.deepEqual(await done,{status:'cancelled'});
});
test('board revocation during final qualification cannot be reported as opened',async()=>{
 const f=fixture(),done=f.broker.open(descriptor,source);await f.wait();const claimed=await f.ready();await f.broker.handle({type:'PAIA_ARCHIVE_ARRIVAL_QUALIFY',requestId:claimed.requestId},f.sender);const base=f.broker.service.qualifyArchiveArrival;f.broker.service.qualifyArchiveArrival=async d=>{const result=await base(d);f.setNonce('closed');return result;};
 await assert.rejects(f.broker.handle({type:'PAIA_ARCHIVE_ARRIVAL_RESULT',requestId:claimed.requestId,status:'opened'},f.sender),{code:'FORBIDDEN'});assert.deepEqual(await done,{status:'unavailable'});
});
