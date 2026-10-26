import test from 'node:test';
import assert from 'node:assert/strict';
import {createApplicationEditorGuard,APPLICATION_EDITOR_PORT} from '../background/application-editor-guard.js';
import {installApplicationEditorGuard} from '../ui/application-editor-guard.js';
const id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',url='chrome-extension://'+id+'/ui/archive.html';
const tick=()=>new Promise(r=>setImmediate(r));
const signal=()=>{const listeners=[];return {addListener:f=>listeners.push(f),emit:x=>{for(const f of listeners)f(x);}};};
function pair(sender){const a={name:APPLICATION_EDITOR_PORT,sender,onMessage:signal(),onDisconnect:signal()},b={onMessage:signal(),onDisconnect:signal()};let closed=false;a.postMessage=v=>{if(closed)throw Error('closed');queueMicrotask(()=>b.onMessage.emit(structuredClone(v)));};b.postMessage=v=>{if(closed)throw Error('closed');queueMicrotask(()=>a.onMessage.emit(structuredClone(v)));};a.disconnect=b.disconnect=()=>{if(!closed){closed=true;a.onDisconnect.emit();b.onDisconnect.emit();}};return {worker:a,page:b};}
function fixture(t,{factory=createApplicationEditorGuard,inventory=null}={}){let contexts=[];const api={runtime:{id,getURL:path=>'chrome-extension://'+id+'/'+path,getContexts:async()=>inventory?inventory(contexts):structuredClone(contexts)}},guard=factory(api),pages=[];t.after(()=>{for(const p of pages)p.client.dispose();guard.close();});
 const add=async(documentId,options={})=>{const sender={id,url:options.url??url,documentId,frameId:options.frameId??0,tab:{incognito:false}},ports=pair(sender),doc=new EventTarget(),target=new EventTarget();contexts.push({documentId,documentUrl:sender.url,frameId:sender.frameId,incognito:false,contextType:'TAB'});guard.connect(ports.worker);let prepares=0,releases=0,current=true;const hooks={prepare:async()=>{prepares++;return options.prepare?options.prepare():true;},current:()=>options.current?options.current():current,release:()=>releases++};const client=installApplicationEditorGuard(hooks,{api:{runtime:{connect:()=>ports.page}},document:doc,target});const p={client,ports,doc,target,sender,setCurrent:v=>current=v,prepares:()=>prepares,releases:()=>releases};pages.push(p);await tick();return p;};return {api,guard,add,pages,get contexts(){return contexts;},set contexts(value){contexts=value;}};
}
test('all original extension pages must freeze and recheck; unacknowledged owner can flush before global fence',async t=>{
 const f=fixture(t);let a;const first=await f.add('document-a',{prepare:()=>{assert.equal(f.guard.blocksMutation(a.sender),false);return true;}});a=first;const b=await f.add('document-b');const token=await f.guard.freezeExtensionPages(a.sender.documentId);
 assert.equal(a.prepares(),1);assert.equal(b.prepares(),1);assert.equal(a.client.isFrozen(),true);assert.equal(f.guard.blocksMutation(a.sender),true);assert.equal(f.guard.blocksMutation({documentId:'host-content'}),true);assert.equal(f.guard.assertFrozenExtensionPages(token),true);
 await f.guard.fenceExtensionPages(token);f.guard.release(token);await tick();assert.equal(a.client.isFrozen(),false);assert.equal(b.releases(),1);assert.equal(f.guard.blocksMutation(a.sender),false);assert.throws(()=>f.guard.assertFrozenExtensionPages(token));
});
for(const reason of ['dirty','ime','unknown','save-failed'])test('original owner refusing '+reason+' never issues a freeze proof',async t=>{const f=fixture(t),a=await f.add('document-a',{prepare:()=>false});await assert.rejects(f.guard.freezeExtensionPages(a.sender.documentId),{code:'GENERATION_EDITOR_PROTECTION_REQUIRED'});await tick();assert.equal(a.releases(),1);assert.equal(f.guard.blocksMutation(a.sender),false);});
test('missing or unregistered page, duplicate/unknown document and unavailable inventory refuse',async t=>{
 const f=fixture(t),a=await f.add('document-a');const original=f.contexts;for(const more of [{documentId:'document-unregistered',documentUrl:url,frameId:0,incognito:false,contextType:'TAB'},{...original[0]},{documentId:'document-unknown',documentUrl:'chrome-extension://'+id+'/ui/unknown.html',frameId:0,incognito:false,contextType:'TAB'}]){f.contexts=[...original,more];await assert.rejects(f.guard.freezeExtensionPages(a.sender.documentId));}f.contexts=original;delete f.api.runtime.getContexts;await assert.rejects(f.guard.freezeExtensionPages(a.sender.documentId));assert.equal(a.prepares(),0);
});
test('disconnect while owner flush is pending rejects instead of treating missing page as saved',async t=>{
 const f=fixture(t);let finish;const a=await f.add('document-a',{prepare:()=>new Promise(r=>finish=r)});const pending=f.guard.freezeExtensionPages(a.sender.documentId);await tick();a.ports.page.disconnect();await assert.rejects(pending);finish(true);await tick();assert.equal(a.client.isFrozen(),true);
});
test('new document or changed inventory invalidates the held freeze',async t=>{
 const f=fixture(t),a=await f.add('document-a'),token=await f.guard.freezeExtensionPages(a.sender.documentId);f.contexts.push({documentId:'document-new',documentUrl:url,frameId:0,incognito:false,contextType:'TAB'});await assert.rejects(f.guard.fenceExtensionPages(token));assert.throws(()=>f.guard.assertFrozenExtensionPages(token));f.guard.release(token);
 const other=pair({id,url,documentId:'document-c',frameId:0,tab:{incognito:false}});f.contexts=f.contexts.filter(x=>x.documentId!=='document-new');const held=await f.guard.freezeExtensionPages(a.sender.documentId);f.guard.connect(other.worker);assert.throws(()=>f.guard.assertFrozenExtensionPages(held));f.guard.release(held);other.page.disconnect();
});
test('fresh challenge rechecks original owner and input invalidation revokes the old ACK',async t=>{
 const f=fixture(t),a=await f.add('document-a'),token=await f.guard.freezeExtensionPages(a.sender.documentId);a.setCurrent(false);await assert.rejects(f.guard.fenceExtensionPages(token));f.guard.release(token);await tick();a.setCurrent(true);const next=await f.guard.freezeExtensionPages(a.sender.documentId);a.doc.dispatchEvent(new Event('input'));await tick();assert.throws(()=>f.guard.assertFrozenExtensionPages(next));f.guard.release(next);
});
test('page blocks interaction during freeze and after an active disconnect without clearing text',async t=>{
 const f=fixture(t),a=await f.add('document-a');const token=await f.guard.freezeExtensionPages(a.sender.documentId);for(const type of ['beforeinput','compositionstart','submit','click']){const event=new Event(type,{cancelable:true});a.doc.dispatchEvent(event);assert.equal(event.defaultPrevented,true);}a.ports.page.disconnect();f.guard.release(token);const event=new Event('beforeinput',{cancelable:true});a.doc.dispatchEvent(event);assert.equal(event.defaultPrevented,true);assert.equal(a.client.isFrozen(),true);
});
test('caller objects and another issuer cannot substitute for a private extension-only freeze proof',async t=>{
 const f=fixture(t),a=await f.add('document-a'),other=createApplicationEditorGuard(f.api);t.after(()=>other.close());assert.throws(()=>f.guard.assertFrozenExtensionPages({valid:true}));const token=await f.guard.freezeExtensionPages(a.sender.documentId);assert.throws(()=>other.assertFrozenExtensionPages(token));assert.equal(Object.keys(token).length,0);assert.equal('activate' in f.guard,false);f.guard.release(token);
});

test('an in-flight repeated fence cannot be used as a completed private proof',async t=>{
 const f=fixture(t),a=await f.add('document-a'),token=await f.guard.freezeExtensionPages(a.sender.documentId);let finish;f.api.runtime.getContexts=()=>new Promise(r=>finish=r);const pending=f.guard.fenceExtensionPages(token);await tick();assert.throws(()=>f.guard.assertFrozenExtensionPages(token));finish(structuredClone(f.contexts));await pending;assert.equal(f.guard.assertFrozenExtensionPages(token),true);f.guard.release(token);
});

test('registration unavailable or idle disconnect does not freeze ordinary editing',async t=>{
 const ports=pair({id,url,documentId:'idle-document',frameId:0}),doc=new EventTarget(),target=new EventTarget();const client=installApplicationEditorGuard({prepare:async()=>true,current:()=>true,release(){}},{api:{runtime:{connect:()=>ports.page}},document:doc,target});t.after(()=>client.dispose());
 let event=new Event('beforeinput',{cancelable:true});doc.dispatchEvent(event);assert.equal(event.defaultPrevented,false);assert.equal(client.isFrozen(),false);ports.worker.disconnect();event=new Event('compositionstart',{cancelable:true});doc.dispatchEvent(event);assert.equal(event.defaultPrevented,false);assert.equal(client.isFrozen(),false);
});


test('initial inventory synchronously blocks new mutations and concurrent freeze cannot overwrite it',async t=>{
 let finish;const gate=new Promise(r=>finish=r),f=fixture(t,{inventory:async contexts=>{await gate;return structuredClone(contexts);}}),a=await f.add('document-a');
 const first=f.guard.freezeExtensionPages(a.sender.documentId);let second;
 try{assert.equal(f.guard.blocksMutation(a.sender),true);second=f.guard.freezeExtensionPages(a.sender.documentId);await assert.rejects(second,{code:'GENERATION_EDITOR_PROTECTION_REQUIRED'});finish();const token=await first;assert.equal(f.guard.assertFrozenExtensionPages(token),true);f.guard.release(token);}
 finally{finish();await first.catch(()=>{});await second?.catch(()=>{});}
});
test('original editor freeze deadline covers later checks without extending the lease',async t=>{
 let clock=0;const descriptor=Object.getOwnPropertyDescriptor(performance,'now');Object.defineProperty(performance,'now',{value:()=>clock,configurable:true});
 let factory;try{factory=(await import('../background/application-editor-guard.js?fixed-editor-deadline')).createApplicationEditorGuard;}finally{if(descriptor)Object.defineProperty(performance,'now',descriptor);else delete performance.now;}
 const f=fixture(t,{factory}),a=await f.add('document-a'),token=await f.guard.freezeExtensionPages(a.sender.documentId);clock=29000;assert.equal(await f.guard.fenceExtensionPages(token),true);clock=30000;
 assert.throws(()=>f.guard.assertFrozenExtensionPages(token),{code:'GENERATION_EDITOR_PROTECTION_REQUIRED'});await assert.rejects(f.guard.fenceExtensionPages(token));f.guard.release(token);assert.equal(f.guard.blocksMutation(a.sender),false);
});

test('late timed-out inventory cannot release or authorize a new private freeze',async t=>{
 const timers=new Map(),set=globalThis.setTimeout,clear=globalThis.clearTimeout;
 globalThis.setTimeout=(fn,ms,...args)=>{if(ms>29000){const key={};timers.set(key,()=>fn(...args));return key;}return set(fn,ms,...args);};
 globalThis.clearTimeout=key=>{if(!timers.delete(key))clear(key);};
 let factory;try{factory=(await import('../background/application-editor-guard.js?late-inventory')).createApplicationEditorGuard;}finally{globalThis.setTimeout=set;globalThis.clearTimeout=clear;}
 const gates=[];let delaying=true;const f=fixture(t,{factory,inventory:contexts=>{if(!delaying)return structuredClone(contexts);return new Promise(resolve=>gates.push(()=>resolve(structuredClone(contexts))));}}),a=await f.add('document-a');
 const first=f.guard.freezeExtensionPages(a.sender.documentId),firstRejected=assert.rejects(first,{code:'GENERATION_EDITOR_PROTECTION_REQUIRED'});assert.equal(gates.length,1);
 for(const [key,fire] of [...timers])if(timers.delete(key))fire();await firstRejected;assert.equal(f.guard.blocksMutation(a.sender),false);
 const second=f.guard.freezeExtensionPages(a.sender.documentId);assert.equal(gates.length,2);assert.equal(f.guard.blocksMutation(a.sender),true);
 gates[0]();await tick();assert.equal(f.guard.blocksMutation(a.sender),true);assert.equal(a.prepares(),0);
 delaying=false;gates[1]();const token=await second;assert.equal(a.prepares(),1);assert.equal(f.guard.assertFrozenExtensionPages(token),true);f.guard.release(token);
});

test('old fence inventory released before settlement cannot invalidate a newer freeze',async t=>{
 let pending=null;const f=fixture(t,{inventory:contexts=>pending?new Promise(resolve=>{pending.resolve=()=>resolve(structuredClone(contexts));}):structuredClone(contexts)}),a=await f.add('document-a'),first=await f.guard.freezeExtensionPages(a.sender.documentId);
 const old={resolve:null};pending=old;const fence=f.guard.fenceExtensionPages(first),rejected=assert.rejects(fence);await tick();assert.equal(typeof old.resolve,'function');f.guard.release(first);await tick();pending=null;
 const next=await f.guard.freezeExtensionPages(a.sender.documentId);old.resolve();await rejected;assert.equal(f.guard.assertFrozenExtensionPages(next),true);f.guard.release(next);
});

test('already queued old deadline callbacks cannot revoke a newer editor freeze',async t=>{
 const queued=[],set=globalThis.setTimeout,clear=globalThis.clearTimeout,live=new Set();
 globalThis.setTimeout=(fn,ms,...args)=>{if(ms>29000){const key={};live.add(key);queued.push(()=>fn(...args));return key;}return set(fn,ms,...args);};globalThis.clearTimeout=key=>{if(!live.delete(key))clear(key);};
 let factory;try{factory=(await import('../background/application-editor-guard.js?queued-old-deadline')).createApplicationEditorGuard;}finally{globalThis.setTimeout=set;globalThis.clearTimeout=clear;}
 const f=fixture(t,{factory}),a=await f.add('document-a'),first=await f.guard.freezeExtensionPages(a.sender.documentId),old=queued.slice();f.guard.release(first);await tick();
 const second=await f.guard.freezeExtensionPages(a.sender.documentId);for(const fire of old)fire();await tick();assert.equal(f.guard.assertFrozenExtensionPages(second),true);assert.equal(await f.guard.fenceExtensionPages(second),true);f.guard.release(second);assert.equal(live.size,0);
});

test('a released page prepare completing late cannot deny a newer successful freeze',async t=>{
 const timers=new Map(),set=globalThis.setTimeout,clear=globalThis.clearTimeout;
 globalThis.setTimeout=(fn,ms,...args)=>{if(ms>29000){const key={};timers.set(key,()=>fn(...args));return key;}return set(fn,ms,...args);};globalThis.clearTimeout=key=>{if(!timers.delete(key))clear(key);};
 let factory;try{factory=(await import('../background/application-editor-guard.js?late-page-prepare')).createApplicationEditorGuard;}finally{globalThis.setTimeout=set;globalThis.clearTimeout=clear;}
 let finish,calls=0;const f=fixture(t,{factory}),a=await f.add('document-a',{prepare:()=>++calls===1?new Promise(resolve=>finish=resolve):true});
 const first=f.guard.freezeExtensionPages(a.sender.documentId),rejected=assert.rejects(first);await tick();assert.equal(calls,1);
 for(const [key,fire]of [...timers])if(timers.delete(key))fire();await rejected;await tick();
 const token=await f.guard.freezeExtensionPages(a.sender.documentId);finish(true);await tick();assert.equal(f.guard.assertFrozenExtensionPages(token),true);assert.equal(a.client.isFrozen(),true);f.guard.release(token);
});
