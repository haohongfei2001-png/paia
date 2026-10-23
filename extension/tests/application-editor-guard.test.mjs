import test from 'node:test';
import assert from 'node:assert/strict';
import {createApplicationEditorGuard,APPLICATION_EDITOR_PORT} from '../background/application-editor-guard.js';
import {installApplicationEditorGuard} from '../ui/application-editor-guard.js';
const id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',url='chrome-extension://'+id+'/ui/archive.html';
const tick=()=>new Promise(r=>setImmediate(r));
const signal=()=>{const listeners=[];return {addListener:f=>listeners.push(f),emit:x=>{for(const f of listeners)f(x);}};};
function pair(sender){const a={name:APPLICATION_EDITOR_PORT,sender,onMessage:signal(),onDisconnect:signal()},b={onMessage:signal(),onDisconnect:signal()};let closed=false;a.postMessage=v=>{if(closed)throw Error('closed');queueMicrotask(()=>b.onMessage.emit(structuredClone(v)));};b.postMessage=v=>{if(closed)throw Error('closed');queueMicrotask(()=>a.onMessage.emit(structuredClone(v)));};a.disconnect=b.disconnect=()=>{if(!closed){closed=true;a.onDisconnect.emit();b.onDisconnect.emit();}};return {worker:a,page:b};}
function fixture(t){let contexts=[];const api={runtime:{id,getURL:path=>'chrome-extension://'+id+'/'+path,getContexts:async()=>structuredClone(contexts)}},guard=createApplicationEditorGuard(api),pages=[];t.after(()=>{for(const p of pages)p.client.dispose();guard.close();});
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
