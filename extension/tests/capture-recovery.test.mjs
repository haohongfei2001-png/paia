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
   async query(query){calls.push(['query',query]);return tabs;},
   async get(id){calls.push(['get',id]);return tabs.find(t=>t.id===id);}},
  permissions:{onAdded:event('permission')},
  scripting:{async executeScript(request){
   calls.push(['execute',request]);
   if(options.failFirst&&attempts++===0)throw Error('withheld');
   if(request.func&&options.probeHold)await options.probeHold;
   if(request.func)return options.probe||[{documentId:'document-a',result:{active:false,ready:false,version:null}}];
   if(options.hold)await options.hold;
   return [{documentId:'document-a',result:undefined}];
  }}
 };
 return {api:installCaptureRecovery(chrome,options.ready||Promise.resolve()),calls,events};
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
