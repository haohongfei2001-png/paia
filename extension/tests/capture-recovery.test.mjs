import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {installCaptureRecovery} from '../background/capture-recovery.js';
const manifest=JSON.parse(await readFile(new URL('../manifest.json',import.meta.url)));
function fixture(options={}) {
 const calls=[],events={};let attempts=0;
 const tabs=options.tabs||[{id:1,url:'https://chatgpt.com/c/synthetic-chat'}];
 const event=name=>({addListener(fn){events[name]=fn;}});
 const chrome={
  runtime:{getManifest:()=>manifest,onInstalled:event('installed'),onStartup:event('startup')},
  tabs:{onActivated:event('activated'),onUpdated:event('updated'),
   async query(query){calls.push(['query',query]);if(options.queryHold)await options.queryHold;return tabs;},
   async get(id){calls.push(['get',id]);return tabs.find(t=>t.id===id);}},
  permissions:{onAdded:event('permission')},
  scripting:{async executeScript(request){
   calls.push(['execute',request]);
   if(options.failFirst&&attempts++===0)throw Error('withheld');
   if(request.func&&options.probeHold)await options.probeHold;
   if(request.func&&options.rejectProbe)throw options.rejectProbe;
   if(request.func&&typeof options.probe==='function')return options.probe(request);
   if(request.func)return options.probe||[{documentId:'document-a',result:{active:false,ready:false,version:null}}];
   if(options.hold)await options.hold;
   return [{documentId:'document-a',result:undefined}];
  }}
 };
 return {api:installCaptureRecovery(chrome,options.ready||Promise.resolve(),options.waitForStartup?{waitForStartup:options.waitForStartup}:{}),chrome,calls,events};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('recovery registers events before isolation, then injects exact packaged worlds into only the probed main document',async()=>{
 let release;const f=fixture({ready:new Promise(resolve=>{release=resolve;})});
 assert.deepEqual(Object.keys(f.events).sort(),['activated','installed','permission','startup','updated']);
 f.events.installed({reason:'update'});await tick();assert.deepEqual(f.calls,[]);
 release();await tick();
 assert.deepEqual(f.calls[0],['query',{url:['https://chatgpt.com/*']}]);
 const requests=f.calls.filter(c=>c[0]==='execute').map(c=>c[1]);
 assert.deepEqual(requests[0].target,{tabId:1,frameIds:[0]});
 assert.equal(requests[0].world,'ISOLATED');
 assert.deepEqual(requests.slice(1),manifest.content_scripts.map(group=>({
  target:{tabId:1,documentIds:['document-a']},world:group.world,files:group.js
 })));
 for(const request of requests.slice(1))assert.equal(request.target.allFrames,undefined);
});
test('healthy runtime is untouched by ordinary activation, but same-version extension reload replaces its generation',async()=>{
 const f=fixture({probe:[{documentId:'document-a',result:{active:true,ready:true,version:manifest.version}}]});
 await f.api.repair(1);assert.equal(f.calls.filter(c=>c[0]==='execute').length,1);
 await f.api.repair(1,true);assert.equal(f.calls.filter(c=>c[1]?.files).length,3);
});
test('recovery refuses unrelated, incognito, discarded, frozen and navigated documents',async()=>{
 const tabs=[{id:1,url:'https://api.deepseek.com/c/a'},{id:2,url:'https://chatgpt.com/',incognito:true},
  {id:3,url:'https://chatgpt.com/',discarded:true},{id:4,url:'https://chatgpt.com/',frozen:true},
  {id:5,url:'chrome://extensions/'}];
 const f=fixture({tabs});await f.api.repairAll(true);
 assert.equal(f.calls.filter(c=>c[0]==='execute').length,0);
 const raced=fixture({probe:[{documentId:'document-other',result:null}]});await raced.api.repair(1);
 assert.equal(raced.calls.filter(c=>c[1]?.files).length,0,'actual-origin probe refuses navigation to another granted host');
});
test('withheld permission or closed document does not poison subsequent recovery; failed isolation never injects',async()=>{
 const f=fixture({failFirst:true});await f.api.repair(1);assert.equal(f.calls.filter(c=>c[1]?.files).length,0);
 await f.api.repair(1);assert.equal(f.calls.filter(c=>c[1]?.files).length,3);
 const failed=fixture({ready:Promise.reject(Error('isolation'))});await failed.api.repairAll();assert.deepEqual(failed.calls,[]);
});
test('concurrent recovery is single-flight and a pending update is not lost',async()=>{
 let release;const f=fixture({hold:new Promise(resolve=>{release=resolve;})});
 const a=f.api.repair(1);await tick();const b=f.api.repair(1);const c=f.api.repair(1,true);
 assert.equal(f.calls.filter(c=>c[1]?.files).length,1);
 release();await Promise.all([a,b,c]);
 assert.equal(f.calls.filter(c=>c[1]?.files).length,6,'one ordinary injection followed by one explicitly requested update');
});
test('only supported permission/activation/resume events request another bounded check',async()=>{
 const f=fixture();f.events.permission({origins:['https://example.com/*']});f.events.updated(1,{title:'unrelated'});await tick();assert.deepEqual(f.calls,[]);
 f.events.permission({origins:['https://chatgpt.com/*']});await tick();assert.equal(f.calls.filter(c=>c[0]==='query').length,1);
 f.events.updated(1,{frozen:false});await tick();assert.equal(f.calls.filter(c=>c[0]==='get').length,2);
});
test('probe returns finite health only, and cannot read body or run outside top-level ChatGPT',async()=>{
 const f=fixture();await f.api.repair(1);const func=f.calls.find(c=>c[1]?.func)[1].func;
 const source='('+func.toString()+')()';
 const context={location:{origin:'https://chatgpt.com'},window:{},chrome:{runtime:{id:'fixture'}},PAIACaptureLifecycle:{active:true,ready:true,version:'0.12.0'}};context.window.top=context.window;
 Object.defineProperty(context,'document',{get(){throw Error('page data must never be read');}});
 assert.deepEqual(JSON.parse(JSON.stringify(vm.runInNewContext(source,context))),{active:true,ready:true,version:'0.12.0'});
 context.location.origin='https://api.deepseek.com';assert.equal(vm.runInNewContext(source,context),null);
 context.location.origin='https://chatgpt.com';context.window.top={};assert.equal(vm.runInNewContext(source,context),null);
});
test('document lifecycle replacement tears down once; page-triggered retirement cannot authorize or restart',async()=>{
 const source=await readFile(new URL('../content/capture-lifecycle.js',import.meta.url),'utf8');
 const listeners=new Set(),messages=[];
 const document={addEventListener(name,fn){listeners.add(fn);},removeEventListener(name,fn){listeners.delete(fn);},dispatchEvent(){for(const fn of [...listeners])fn();}};
 const context=vm.createContext({document,Event,crypto:webcrypto,location:{origin:'https://chatgpt.com'},window:{postMessage(message){messages.push(message);}},chrome:{runtime:{getManifest:()=>({version:'0.12.0'})}}});
 vm.runInContext(source,context);const old=context.PAIACaptureLifecycle;let disposed=0;old.add(()=>disposed++);
 vm.runInContext(source,context);assert.equal(old.active,false);assert.equal(disposed,1);assert.notEqual(context.PAIACaptureLifecycle.instance,old.instance);
 assert.equal(listeners.size,1);document.dispatchEvent();assert.equal(context.PAIACaptureLifecycle.active,false);assert.equal(listeners.size,0);
 assert.equal(messages.every(m=>m.channel==='archive-response-control-v1'&&m.active===false),true);
});


test('forced update queued behind a delayed healthy probe cannot be dropped',async()=>{
 let release;const f=fixture({probeHold:new Promise(resolve=>{release=resolve;}),probe:[{documentId:'document-a',result:{active:true,ready:true,version:manifest.version}}]});
 const ordinary=f.api.repair(1);await tick();const forced=f.api.repair(1,true);release();
 await Promise.all([ordinary,forced]);assert.equal(f.calls.filter(c=>c[1]?.files).length,3);
});


test('ordinary startup waits for document_idle readiness without retiring already authorized metadata', async () => {
 let probes=0;const waits=[];
 const f=fixture({waitForStartup:async ms=>{waits.push(ms);},probe:()=>[{documentId:'document-a',result:{active:true,ready:++probes>1,version:manifest.version}}]});
 await f.api.repair(1);
 assert.deepEqual(waits,[250]);assert.equal(probes,2);
 assert.equal(f.calls.filter(c=>c[1]?.files).length,0);
 assert.deepEqual(f.calls.filter(c=>c[1]?.func)[1][1].target,{tabId:1,documentIds:['document-a']});
});
test('startup grace is bounded and cannot inject into a navigated document', async () => {
 const waits=[];const stalled=fixture({waitForStartup:async ms=>{waits.push(ms);},probe:[{documentId:'document-a',result:{active:true,ready:false,version:manifest.version}}]});
 await stalled.api.repair(1);assert.equal(waits.length,20);assert.equal(waits.reduce((a,b)=>a+b,0),5000);assert.equal(stalled.calls.filter(c=>c[1]?.files).length,3);
 let probes=0;const navigated=fixture({waitForStartup:async()=>{},probe:()=>[{documentId:++probes===1?'document-a':'document-other',result:{active:true,ready:false,version:manifest.version}}]});
 await navigated.api.repair(1);assert.equal(navigated.calls.filter(c=>c[1]?.files).length,0);
});
test('forced replacement queued during startup grace wins exactly once', async () => {
 let release;const f=fixture({waitForStartup:()=>new Promise(resolve=>{release=resolve;}),probe:[{documentId:'document-a',result:{active:true,ready:false,version:manifest.version}}]});
 const ordinary=f.api.repair(1);await tick();const forced=f.api.repair(1,true);release();
 await Promise.all([ordinary,forced]);assert.equal(f.calls.filter(c=>c[1]?.files).length,3);
});


const deferred=()=>{let resolve;return {promise:new Promise(r=>{resolve=r;}),resolve:()=>resolve()};};
const injectionCount=f=>f.calls.filter(c=>c[1]?.files).length;
async function stillPending(promise){let settled=false;void promise.then(()=>{settled=true;},()=>{settled=true;});await tick();assert.equal(settled,false);}

test('capture recovery live hold is private, single-use and releases without inventing work',async()=>{
 const f=fixture();assert.equal(f.api.applicationSelectionSourceIs(f.chrome),true);assert.equal(f.api.applicationSelectionSourceIs({...f.chrome}),false);
 const token=await f.api.holdForApplicationSelection();assert.equal(Object.getPrototypeOf(token),null);assert.equal(Object.isFrozen(token),true);assert.deepEqual(Object.keys(token),[]);
 assert.equal(f.api.applicationSelectionHeld(token),true);assert.equal(f.api.applicationSelectionHeld({...token}),false);assert.equal(await f.api.fenceApplicationSelection(token),true);
 assert.equal(f.api.releaseApplicationSelection({}),false);await assert.rejects(f.api.holdForApplicationSelection(),{code:'GENERATION_WORKER_NOT_QUIET'});
 assert.deepEqual(f.calls,[]);assert.equal(f.api.releaseApplicationSelection(token),true);assert.equal(f.api.releaseApplicationSelection(token),false);assert.equal(f.api.applicationSelectionHeld(token),false);await tick();assert.deepEqual(f.calls,[]);
});

test('hold drains the actual pending probe and cancels its not-yet-dispatched forced replacement',async()=>{
 const probe=deferred(),f=fixture({probeHold:probe.promise});const ordinary=f.api.repair(1);await tick();const forced=f.api.repair(1,true),holding=f.api.holdForApplicationSelection();
 await stillPending(holding);assert.equal(f.calls.filter(c=>c[0]==='execute').length,1);probe.resolve();assert.deepEqual(await Promise.all([ordinary,forced]),[{status:'interrupted',reason:'application_selection_hold'},{status:'interrupted',reason:'application_selection_hold'}]);const token=await holding;
 assert.equal(injectionCount(f),0);assert.equal(await f.api.fenceApplicationSelection(token),true);f.api.releaseApplicationSelection(token);await tick();assert.equal(injectionCount(f),0);
});

test('hold waits for one dispatched world but cannot dispatch the remaining worlds or replay on release',async()=>{
 const world=deferred(),f=fixture({hold:world.promise}),repair=f.api.repair(1);await tick();assert.equal(injectionCount(f),1);
 const holding=f.api.holdForApplicationSelection();await stillPending(holding);world.resolve();assert.deepEqual(await repair,{status:'interrupted',reason:'application_selection_hold'});const token=await holding;
 assert.equal(injectionCount(f),1);f.api.releaseApplicationSelection(token);await tick();assert.equal(injectionCount(f),1);
 f.events.updated(1,{status:'complete'});await tick();assert.equal(injectionCount(f),4,'only the later original event requests a new original repair');
});

for(const stage of ['isolation','query'])test('hold tracks repairAll pending '+stage+' before any per-tab task exists',async()=>{
 const wait=deferred(),f=fixture(stage==='isolation'?{ready:wait.promise}:{queryHold:wait.promise}),repair=f.api.repairAll(true);await tick();
 const holding=f.api.holdForApplicationSelection();await stillPending(holding);wait.resolve();await repair;const token=await holding;
 assert.equal(f.calls.filter(c=>c[0]==='query').length,stage==='query'?1:0);assert.equal(f.calls.filter(c=>c[0]==='get').length,0);assert.equal(injectionCount(f),0);assert.equal(await f.api.fenceApplicationSelection(token),true);f.api.releaseApplicationSelection(token);
});

test('hold drains accepted startup grace without issuing a subsequent probe',async()=>{
 const wait=deferred(),f=fixture({waitForStartup:()=>wait.promise,probe:[{documentId:'document-a',result:{active:true,ready:false,version:manifest.version}}]}),repair=f.api.repair(1);await tick();
 const holding=f.api.holdForApplicationSelection();await stillPending(holding);wait.resolve();await repair;const token=await holding;
 assert.equal(f.calls.filter(c=>c[0]==='execute').length,1);assert.equal(injectionCount(f),0);f.api.releaseApplicationSelection(token);
});

for(const event of ['installed','startup','activated','updated','permission'])test('eligible '+event+' while held invalidates the live receipt without starting work',async()=>{
 const f=fixture(),token=await f.api.holdForApplicationSelection();f.events.updated(1,{title:'unrelated'});assert.equal(f.api.applicationSelectionHeld(token),true);
 if(event==='activated')f.events.activated({tabId:1});else if(event==='updated')f.events.updated(1,{frozen:false});else if(event==='permission')f.events.permission({permissions:['scripting']});else f.events[event]();
 await tick();assert.deepEqual(f.calls,[]);assert.equal(f.api.applicationSelectionHeld(token),false);await assert.rejects(f.api.fenceApplicationSelection(token),{code:'GENERATION_WORKER_NOT_QUIET'});
 assert.equal(f.api.releaseApplicationSelection(token),true);await tick();assert.deepEqual(f.calls,[]);
});

test('capture hold deadline does not clear an unresolved script or authorize its late continuation',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const probe=deferred(),f=fixture({probeHold:probe.promise}),repair=f.api.repair(1);await tick();
 const holding=f.api.holdForApplicationSelection(),failure=holding.catch(error=>error);
 t.mock.timers.tick(29999);await stillPending(holding);t.mock.timers.tick(1);const error=await failure;assert.equal(error.code,'GENERATION_WORKER_NOT_QUIET');
 await assert.rejects(f.api.holdForApplicationSelection(),{code:'GENERATION_WORKER_NOT_QUIET'});
 assert.deepEqual(await f.api.repair(1),{status:'not-admitted',reason:'application_selection_hold'});assert.equal(f.api.applicationSelectionHeld(error),false);await assert.rejects(f.api.fenceApplicationSelection(error));
 assert.equal(f.api.releaseApplicationSelection({...error}),false);assert.equal(f.api.releaseApplicationSelection(new Error(error.message)),false);
 assert.equal(f.api.releaseApplicationSelection(error),true);assert.equal(f.api.releaseApplicationSelection(error),false);
 // Explicit release is not cancellation or quietness: the next hold still
 // waits for the same issued Chrome promise, which timeout did not erase.
 const again=f.api.holdForApplicationSelection();await stillPending(again);probe.resolve();assert.deepEqual(await repair,{status:'interrupted',reason:'application_selection_hold'});const token=await again;
 assert.equal(injectionCount(f),0);assert.equal(f.calls.filter(c=>c[0]==='execute').length,1);assert.equal(await f.api.fenceApplicationSelection(token),true);f.api.releaseApplicationSelection(token);await tick();assert.equal(injectionCount(f),0);
});

test('changed original script executor invalidates a held capture source instead of refreshing its identity',async()=>{
 const f=fixture(),original=f.chrome.scripting.executeScript,token=await f.api.holdForApplicationSelection();f.chrome.scripting.executeScript=async()=>[];
 assert.equal(f.api.applicationSelectionSourceIs(f.chrome),false);assert.equal(f.api.applicationSelectionHeld(token),false);await assert.rejects(f.api.fenceApplicationSelection(token),{code:'GENERATION_WORKER_NOT_QUIET'});
 f.api.releaseApplicationSelection(token);await assert.rejects(f.api.holdForApplicationSelection(),{code:'GENERATION_WORKER_NOT_QUIET'});f.chrome.scripting.executeScript=original;assert.deepEqual(f.calls,[]);
});


test('a rejected already-issued probe fails hold without being relabelled as settled-safe',async()=>{
 const probe=deferred(),cause=Error('SYNTHETIC uncertain probe'),f=fixture({probeHold:probe.promise,rejectProbe:cause}),repair=f.api.repair(1);await tick();
 const holding=f.api.holdForApplicationSelection(),failure=holding.catch(error=>error);probe.resolve();await repair;const error=await failure;
 assert.equal(error.code,'GENERATION_WORKER_NOT_QUIET');assert.equal(f.api.applicationSelectionHeld(error),false);await assert.rejects(f.api.holdForApplicationSelection());
 assert.equal(f.api.releaseApplicationSelection({...error}),false);assert.equal(f.api.releaseApplicationSelection(error),true);assert.equal(injectionCount(f),0);
});

test('a request during acquisition cannot be mistaken for a successful quiet receipt',async()=>{
 const probe=deferred(),f=fixture({probeHold:probe.promise}),repair=f.api.repair(1);await tick();const holding=f.api.holdForApplicationSelection(),failure=holding.catch(error=>error);
 assert.deepEqual(await f.api.repairAll(true),{status:'not-admitted',reason:'application_selection_hold'});probe.resolve();await repair;const error=await failure;
 assert.equal(error.code,'GENERATION_WORKER_NOT_QUIET');assert.equal(f.api.applicationSelectionHeld(error),false);assert.deepEqual(await f.api.repair(1),{status:'not-admitted',reason:'application_selection_hold'});
 assert.equal(f.api.releaseApplicationSelection(error),true);assert.equal(injectionCount(f),0);
});
