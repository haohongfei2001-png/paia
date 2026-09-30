import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const chat='synthetic-reconnect-chat',id='synthetic-reconnect-user';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const source=async path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const lifecycleSource=await source('content/capture-lifecycle.js');
const responseBridgeSource=await source('content/response-bridge.js');
const structureBridgeSource=await source('content/source-structure-bridge.js');
const observerSource=await source('content/response-observer.js');
function events(){
 const listeners=new Map();
 return {
  addEventListener(type,listener,options=false){if(!listeners.has(type))listeners.set(type,new Map());listeners.get(type).set(listener,options===true||options?.capture===true);},
  removeEventListener(type,listener){listeners.get(type)?.delete(listener);},
  dispatchEvent(event){let stopped=false;event.stopImmediatePropagation=()=>{stopped=true;};const entries=[...listeners.get(event.type)||[]].sort((a,b)=>Number(b[1])-Number(a[1]));for(const [listener] of entries){if(stopped)break;listener(event);}return true;},
  count(type){return listeners.get(type)?.size||0;},
  handlers(type){return [...listeners.get(type)?.keys()||[]];}
 };
}
function clock(){
 const timers=new Map();let next=0;
 return {timers,setTimeout(fn,delay){const id=++next;timers.set(id,{fn,delay});return id;},clearTimeout(id){timers.delete(id);},
  async run(delay){const entry=[...timers].find(([,timer])=>timer.delay===delay);assert.ok(entry,`missing ${delay}ms timer`);timers.delete(entry[0]);entry[1].fn();await tick();}}
}
async function bridges({deferStatus=false,version='0.12.0'}={}){
 const window=events(),document=events(),timing=clock(),requests=[],controls=[],pendingStatus=[];
 let serial=0,scans=0,reads=0,enrichment=null,structure=null;
 let status={enabled:true,consented:true,epoch:1,adapterVersion:'0.3.0',runtimeVersion:version};
 window.postMessage=data=>controls.push(data);
 document.querySelectorAll=()=>{reads++;return [];};
 class Adapter{static version='0.3.0';version='0.3.0';route(){return {code:'READY',id:chat,url:'https://chatgpt.com/c/'+chat};}}
 class Structure{reset(){}observe(_status,{session}){scans++;return {chat:{id:chat,url:'https://chatgpt.com/c/'+chat},dtos:[],stateKey:session};}}
 const messages=new Set();
 const runtime={id:'synthetic-extension',getManifest:()=>({version:'0.12.0'}),onMessage:{addListener:fn=>messages.add(fn),removeListener:fn=>messages.delete(fn)},
  sendMessage(request){
   requests.push(request);
   if(request.type==='GET_STATUS')return deferStatus?new Promise(resolve=>pendingStatus.push(resolve)):Promise.resolve({ok:true,data:{...status}});
   if(request.type==='ENRICH_SOURCE_METADATA'&&enrichment)return enrichment;
   if(request.type==='OBSERVE_SOURCE_STRUCTURE'&&structure)return structure;
   return Promise.resolve({ok:true,data:request.type==='RESPONSE_POLL'?{fingerprintAllowed:false}:{settled:true}});
  }};
 const context=vm.createContext({window,document,Event,Date,URL,TextEncoder,crypto:{randomUUID:()=>`synthetic-session-${++serial}`,subtle:crypto.subtle},
  location:{origin:'https://chatgpt.com',href:'https://chatgpt.com/c/'+chat},ChatGPTAdapter:Adapter,ChatGPTSourceStructure:Structure,
  chrome:{runtime},setTimeout:timing.setTimeout,clearTimeout:timing.clearTimeout,
  addEventListener:window.addEventListener,removeEventListener:window.removeEventListener});
 for(const path of ['core/json-fingerprint.js','core/history-time.js','core/source-time.js','core/response-time.js'])vm.runInContext(await source(path),context);
 vm.runInContext(lifecycleSource,context);
 const inject=()=>{vm.runInContext(responseBridgeSource,context);vm.runInContext(structureBridgeSource,context);};
 inject();await tick();
 return {context,window,document,timing,runtime,messages,requests,controls,pendingStatus,inject,
  get scans(){return scans;},get reads(){return reads;},setStatus:change=>Object.assign(status,change),
  setEnrichment:p=>enrichment=p,setStructure:p=>structure=p,
  resolveStatus(){deferStatus=false;for(const resolve of pendingStatus.splice(0))resolve({ok:true,data:{...status}});},
  observe(api=context.ArchiveResponseTime){api.observe({chat:{id:chat,url:'https://chatgpt.com/c/'+chat},messages:[{sourceMessageId:id,pageOrder:1}]},{epoch:status.epoch});},
  metadata(control=controls.at(-1),channel='archive-response-metadata-v2'){window.dispatchEvent({type:'message',source:window,origin:'https://chatgpt.com',data:{channel,chat,epoch:control.epoch,historySession:control.historySession,history:{contract:'chatgpt-history-user-v1',rows:[{chat,id,create:{state:'value',value:1609459200},update:{state:'missing',value:null}}]}}});},
  close(){context.PAIACaptureLifecycle.dispose();}
 };
}

test('bridge reinjection replaces singleton listeners/timers and retained old APIs cannot resume',async()=>{
 const f=await bridges();
 try{
  const oldAPI=f.context.ArchiveResponseTime,oldProbe=f.context.PAIAProjectDiscoveryProbe;
  for(let i=0;i<4;i++){f.inject();await tick();}
  assert.equal(f.window.count('message'),1);assert.equal(f.window.count('pagehide'),2);assert.equal(f.window.count('pageshow'),2);assert.equal(f.messages.size,1);
  assert.deepEqual([...f.timing.timers.values()].map(t=>t.delay).sort(),[500,750]);
  const before=f.requests.length,reads=f.reads;
  f.observe(oldAPI);oldAPI.persisted();assert.equal(oldAPI.owns(chat,id),false);
  assert.equal(await oldProbe.scan({salt:'a'.repeat(32)}),null);await tick();
  assert.equal(f.requests.length,before);assert.equal(f.reads,reads);
  assert.ok(f.requests.every(request=>request.contentVersion==='0.12.0'));
 }finally{f.close();}
 assert.equal(f.window.count('message'),0);assert.equal(f.window.count('pagehide'),0);assert.equal(f.messages.size,0);assert.equal(f.timing.timers.size,0);
});

test('shared retirement rejects pending status and pageshow cannot resurrect disposed bridges',async()=>{
 const f=await bridges({deferStatus:true});
 const oldAPI=f.context.ArchiveResponseTime,oldProbe=f.context.PAIAProjectDiscoveryProbe;
 assert.equal(f.scans,0);
 f.document.dispatchEvent(new Event('paia-capture-retire-v1'));
 f.resolveStatus();f.window.dispatchEvent({type:'pageshow',persisted:true});await tick();
 f.observe(oldAPI);assert.equal(await oldProbe.scan({salt:'a'.repeat(32)}),null);
 assert.equal(f.scans,0);assert.equal(f.reads,0);assert.equal(f.requests.length,2);assert.equal(f.timing.timers.size,0);
 assert.equal(f.context.ArchiveResponseTime,undefined);assert.equal(f.context.PAIAProjectDiscoveryProbe,undefined);
 assert.equal(f.controls.at(-1).active,false);
});

test('runtime loss and worker version mismatch stop both bridges before page observation',async()=>{
 for(const mode of ['runtime','version']){
  const f=await bridges({deferStatus:true});
  if(mode==='runtime')delete f.runtime.id;else f.setStatus({runtimeVersion:'0.12.1'});
  f.resolveStatus();await tick();f.window.dispatchEvent({type:'pageshow',persisted:true});await tick();
  assert.equal(f.scans,0,mode);assert.equal(f.context.PAIACaptureLifecycle.active,false,mode);assert.equal(f.timing.timers.size,0,mode);
 }
});

test('BFCache suspension rejects old status continuations and only fresh status can resume scans',async()=>{
 const f=await bridges({deferStatus:true});
 try{
  f.window.dispatchEvent({type:'pagehide'});f.window.dispatchEvent({type:'pageshow',persisted:true});f.resolveStatus();await tick();
  assert.equal(f.scans,0);assert.equal(f.requests.length,2);
  await f.timing.run(750);assert.equal(f.scans,1);
  await f.timing.run(500);assert.equal(f.controls.at(-1).active,true);
 }finally{f.close();}
});

test('late enrichment cannot restore old-epoch evidence after consent revocation or new epoch',async()=>{
 const f=await bridges();let resolve;
 try{
  f.setEnrichment(new Promise(r=>resolve=r));f.observe();f.metadata();await tick();const old=f.controls.at(-1);
  f.setStatus({consented:false,epoch:2});await f.timing.run(500);
  assert.equal(f.controls.at(-1).active,false);resolve({ok:true,data:{settled:[true]}});await tick();
  const count=f.requests.filter(r=>r.type==='ENRICH_SOURCE_METADATA').length;
  f.metadata(old);f.setStatus({consented:true,epoch:3});await f.timing.run(500);f.metadata(old);await tick();
  assert.equal(f.context.ArchiveResponseTime.owns(chat,id),false);assert.equal(f.requests.filter(r=>r.type==='ENRICH_SOURCE_METADATA').length,count);
  f.metadata(f.controls.at(-1),'archive-response-metadata-v1');assert.equal(f.context.ArchiveResponseTime.owns(chat,id),false);
 }finally{f.close();}
});

test('source structure teardown during write rejects late settlement without another scan or timer',async()=>{
 const f=await bridges();let resolve;
 f.setStructure(new Promise(r=>resolve=r));await f.timing.run(750);const scans=f.scans;
 f.close();resolve({ok:true,data:{settled:true}});await tick();
 assert.equal(f.scans,scans);assert.equal(f.timing.timers.size,0);assert.equal(f.messages.size,0);
});

async function mainFixture({origin='https://chatgpt.com',beforeMain}={}){
 const window=events(),document=events(),sent=[];let calls=0,result;
 const original=function(...args){calls++;assert.equal(args.length,2);return result;};
 window.fetch=original;window.postMessage=value=>{if(value.channel==='archive-response-metadata-v2')sent.push(value);else queueMicrotask(()=>window.dispatchEvent({type:'message',source:window,origin:'https://chatgpt.com',data:value}));};
 const context=vm.createContext({window,document,location:{origin,pathname:'/c/'+chat},Response,URL,TextDecoder,setTimeout,clearTimeout});
 for(const path of ['adapter/response-parser.js','adapter/history-contract.js','adapter/json-fingerprint.js'])vm.runInContext(await source(path),context);
 const inject=()=>vm.runInContext(observerSource,context);beforeMain?.(window);inject();
 const control=(changes={})=>window.dispatchEvent({type:'message',source:window,origin:'https://chatgpt.com',data:{channel:'archive-response-control-v2',active:true,chat,epoch:1,session:'synthetic-session',historySession:'synthetic-history',history:true,...changes}});
 function response(){const value=new Response(JSON.stringify({conversation_id:chat,mapping:{one:{message:{id,author:{role:'user'},create_time:1609459200}}}}),{headers:{'content-type':'application/json'}});Object.defineProperty(value,'url',{value:'https://chatgpt.com/backend-api/conversation/'+chat});return value;}
 return {window,document,context,inject,control,sent,original,response,get calls(){return calls;},setResult:p=>result=p,
  async fetch(){const value=response();result=Promise.resolve(value);const promise=window.fetch({},{});assert.equal(promise,result);assert.equal(await promise,value);await value.text();for(let i=0;i<20&&!sent.some(v=>v.history);i++)await tick();return value;},
  close(){context.PAIAResponseObserver?.dispose();}};
}

test('MAIN reinjection preserves one passthrough and one reader pair under a later page wrapper',async()=>{
 for(const wrapped of [false,true]){
  const f=await mainFixture();
  try{
   const passthrough=f.window.fetch;let pageCalls=0;
   const pageWrapper=function(...args){pageCalls++;return Reflect.apply(passthrough,this,args);};
   if(wrapped)f.window.fetch=pageWrapper;
   for(let i=0;i<5;i++)f.inject();
   assert.equal(f.window.fetch,wrapped?pageWrapper:passthrough);
   assert.equal(f.window.count('message'),2);assert.equal(f.window.count('pagehide'),1);assert.equal(f.document.count('paia-capture-retire-v1'),1);
   f.control();await f.fetch();
   assert.equal(f.calls,1);assert.equal(pageCalls,wrapped?1:0);assert.equal(f.sent.filter(v=>v.history).length,1);assert.equal(f.sent.filter(v=>v.observedFetchResponse).length,1);
  }finally{f.close();}
  assert.equal(f.window.count('message'),1);assert.equal(f.document.count('paia-capture-retire-v1'),0);
  if(!wrapped)assert.equal(f.window.fetch,f.original);
 }
});

test('MAIN retirement cannot authorize, stale in-flight fetch cannot revive, and legacy controls stay inert',async()=>{
 const f=await mainFixture();let resolve;
 try{
  f.control();f.setResult(new Promise(r=>resolve=r));f.window.fetch({},{});
  f.document.dispatchEvent(new Event('paia-capture-retire-v1'));f.control();resolve(f.response());await tick();await tick();
  assert.equal(f.sent.length,0);
  f.control({channel:'archive-response-control-v1',active:false});await f.fetch();assert.equal(f.sent.filter(v=>v.history).length,1);
  f.sent.length=0;f.control({active:false});f.control({channel:'archive-response-control-v1'});f.document.dispatchEvent(new Event('paia-capture-retire-v1'));
  await f.fetch();assert.equal(f.sent.length,0);
 }finally{f.close();}
});

test('MAIN revocation during a pending read cancels readers and never parses returned stale bytes',async()=>{
 const f=await mainFixture();let reads=0,cancels=0,resolveRead;
 const body=JSON.stringify({conversation_id:chat,mapping:{one:{message:{id,author:{role:'user'},create_time:1609459200}}}});
 const pending=new Promise(resolve=>resolveRead=resolve);
 const reader={read(){reads++;return pending;},async cancel(){cancels++;}};
 // Use the real observer with a deterministic response clone boundary.
 class ControlledResponse{clone(){return {body:{getReader:()=>reader}};}}
 f.context.Response=ControlledResponse;f.inject();
 try{
  f.control({history:false});f.setResult(Promise.resolve({url:'https://chatgpt.com/backend-api/conversation/'+chat,ok:true,redirected:false,headers:{get:name=>name==='content-type'?'application/json':null}}));
  f.window.fetch({},{});await tick();assert.equal(reads,1);
  f.document.dispatchEvent(new Event('paia-capture-retire-v1'));const reports=f.sent.length;
  f.control({history:false});resolveRead({done:false,value:new TextEncoder().encode(body)});await tick();await tick();
  assert.equal(reads,1);assert.ok(cancels>=1);assert.equal(f.sent.length,reports);assert.equal(f.sent.some(v=>v.rows),false);
 }finally{f.close();}
});

test('MAIN exact-origin guard never wraps another origin',async()=>{
 const f=await mainFixture({origin:'https://example.invalid'});
 assert.equal(f.window.fetch,f.original);assert.equal(f.window.count('message'),0);assert.equal(f.context.PAIAResponseObserver,undefined);
});


test('MAIN capture-phase migration blocker rejects late legacy activation ahead of old bubble listener',async()=>{
 const legacy=[],foreign=[];
 const f=await mainFixture({beforeMain(window){window.addEventListener('message',event=>{
  if(event.data?.channel==='archive-response-control-v1')legacy.push(event.data.active);
  else foreign.push(event.data?.channel);
 });}});
 try{
  const legacyControl=active=>f.control({channel:'archive-response-control-v1',active});
  assert.deepEqual(legacy,[false],'new MAIN revokes the already-active legacy gate');legacy.length=0;
  legacyControl(false);legacyControl(true);assert.deepEqual(legacy,[false]);
  for(let i=0;i<4;i++)f.inject();await tick();
  assert.ok(legacy.every(active=>active===false));legacy.length=0;
  legacyControl(false);legacyControl(true);f.document.dispatchEvent(new Event('paia-capture-retire-v1'));legacyControl(true);
  assert.deepEqual(legacy,[false]);
  assert.equal(f.window.count('message'),3,'one legacy, one blocker and one current listener');
  f.control();assert.ok(foreign.includes('archive-response-control-v2'));await f.fetch();assert.equal(f.sent.filter(v=>v.history).length,1);
  f.close();legacyControl(true);legacyControl(false);assert.deepEqual(legacy,[false,false],'blocker remains after observer disposal');
 }finally{f.close();}
});


test('MAIN migration shuts an already-active legacy observer after installing the late-control blocker',async()=>{
 let legacyActive=true,legacyReads=0;
 const f=await mainFixture({beforeMain(window){
  const original=window.fetch;
  window.fetch=function(...args){if(legacyActive)legacyReads++;return Reflect.apply(original,this,args);};
  window.addEventListener('message',event=>{if(event.data?.channel==='archive-response-control-v1')legacyActive=event.data.active===true;});
 }});
 try{
  await tick();assert.equal(legacyActive,false);
  f.control({channel:'archive-response-control-v1'});assert.equal(legacyActive,false);
  f.control();await f.fetch();assert.equal(legacyReads,0);assert.equal(f.calls,1);assert.equal(f.sent.filter(v=>v.history).length,1);
 }finally{f.close();}
});
