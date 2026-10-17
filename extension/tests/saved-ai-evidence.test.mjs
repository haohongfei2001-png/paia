import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {installSavedAIDiagnostic,releaseSavedAI} from './harness/saved-ai-evidence.mjs';

function fixture(options){
 const previous={chrome:globalThis.chrome,document:globalThis.document,trace:globalThis.__savedAITrace},calls=[],messages=new Set(),listeners=new Map(),reply={ok:true,data:{revision:8}};
 const original=function(message,...args){calls.push({message,args});return Promise.resolve(reply);};
 globalThis.chrome={runtime:{sendMessage:original,onMessage:{addListener:f=>messages.add(f),removeListener:f=>messages.delete(f)}}};
 globalThis.document={addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:(key,fn)=>{if(listeners.get(key)===fn)listeners.delete(key);}};
 installSavedAIDiagnostic(options);
 return {calls,reply,messages,listeners,trace:globalThis.__savedAITrace,close(){globalThis.__savedAITrace.restore();assert.equal(messages.size,0);assert.equal(listeners.size,0);globalThis.chrome=previous.chrome;globalThis.document=previous.document;globalThis.__savedAITrace=previous.trace;}};
}
test('saved AI observation forwards the original payload and ACK while retaining only hashes and revision identity',async()=>{
 const f=fixture();try{
  const value='SYNTHETIC diagnostic must not leak\n<literal> 👩‍💻 é',message={type:'EDIT_AI_PRESENTATION',edit:{field:'currentView',value,expectedRevision:7,operationId:'synthetic-operation'}};
  assert.equal(await chrome.runtime.sendMessage(message),f.reply);assert.equal(f.calls[0].message,message);
  const read=await f.trace.read(),request=read.events.find(x=>x.event==='edit-request'),ack=read.events.find(x=>x.event==='edit-ack');
  assert.equal(request.expectedRevision,7);assert.equal(request.operationId,'synthetic-operation');assert.equal(request.value.items[0].codeUnits,value.length);assert.equal(request.value.items[0].lineFeeds,1);assert.equal(request.value.items[0].sha256,createHash('sha256').update(value).digest('hex'));assert.equal(ack.revision,8);assert.equal(ack.id,request.id);assert.doesNotMatch(JSON.stringify(read),/diagnostic must not leak|<literal>/);
 }finally{f.close();}
});
test('the explicit negative fixture holds exactly one recovery RPC and releases the unchanged original request',async()=>{
 const f=fixture({holdRecovery:true});try{
  const message={type:'PAIA_RECOVERY_DRAFT_SAVE',draft:{operation:{type:'AI_RECOVERY_SNAPSHOT',baseRevision:7,values:{currentView:'SYNTHETIC held draft'}}}},pending=chrome.runtime.sendMessage(message);
  assert.equal(f.trace.held,true);assert.equal(f.calls.length,0);f.trace.release();assert.equal(await pending,f.reply);assert.equal(f.calls.length,1);assert.equal(f.calls[0].message,message);
  await chrome.runtime.sendMessage(message);assert.equal(f.calls.length,2);assert.equal(f.trace.held,false);
  const read=await f.trace.read();assert.equal(read.events.filter(e=>e.event==='recovery-request').length,2);assert.doesNotMatch(JSON.stringify(read),/SYNTHETIC held draft/);
 }finally{f.close();}
});
test('DOM sampling exposes connected/hidden/newline metadata without retaining literal text and caps its trace',async()=>{
 const f=fixture();try{
  const node={dataset:{aiField:'currentView'},isConnected:false,children:[{tagName:'DIV'},{tagName:'BR'}],textContent:'SYNTHETIC firstsecond',innerText:'SYNTHETIC first\nsecond',closest:selector=>selector==='[data-ai-field]'?node:null};
  f.listeners.get('blur')({type:'blur',target:node});const first=(await f.trace.read()).events[0];assert.equal(first.connected,false);assert.equal(first.hidden,false);assert.equal(first.textContent.lineFeeds,0);assert.equal(first.innerText.lineFeeds,1);assert.notEqual(first.textContent.sha256,first.innerText.sha256);
  for(let i=0;i<260;i++)f.trace.mark('synthetic-step',i);const read=await f.trace.read();assert.equal(read.events.length,240);assert.doesNotMatch(JSON.stringify(read),/firstsecond/);
 }finally{f.close();}
});
test('a finite diagnostic snapshot excludes later events and does not drain their held hashes',async()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto'),digests=[];
 Object.defineProperty(globalThis,'crypto',{configurable:true,value:{subtle:{digest:()=>new Promise(resolve=>digests.push(resolve))}}});
 const f=fixture();try{
  const send=value=>chrome.runtime.sendMessage({type:'EDIT_AI_PRESENTATION',edit:{field:'currentView',value,expectedRevision:7,operationId:'synthetic-'+value}});
  await send('A');const pending=f.trace.read();await send('B');digests[0](new Uint8Array(32).buffer);
  const snapshot=await pending,requests=snapshot.events.filter(e=>e.event==='edit-request');assert.equal(requests.length,1);assert.equal(requests[0].operationId,'synthetic-A');assert.equal(requests[0].value.items[0].sha256,'0'.repeat(64));
 }finally{for(const resolve of digests)resolve(new Uint8Array(32).buffer);await f.trace.read();f.close();Object.defineProperty(globalThis,'crypto',descriptor);}
});

for(const kind of ['rejected','held'])test('held-recovery cleanup is bounded and harmless when page release is '+kind,async()=>{
 let release;const held=new Promise(resolve=>release=resolve),error=Error('SYNTHETIC page unavailable');
 await releaseSavedAI({evaluate:()=>kind==='held'?held:Promise.reject(error)},1);release();
});
