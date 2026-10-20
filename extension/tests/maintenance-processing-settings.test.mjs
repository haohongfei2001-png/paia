import test from 'node:test';import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {IndexedArchiveStore} from '../core/indexed-store.js';
import {MaintenanceProcessingCommands} from '../background/maintenance-processing-commands.js';
import {MaintenanceProcessingConsent,readMaintenanceProcessingConsent,assertMaintenanceProcessingConsentFacts} from '../background/maintenance-processing-consent.js';
import {SettingsMaintenanceState} from '../ui/settings-maintenance-state.js';
import {mountSettingsMaintenance} from '../ui/settings-maintenance.js';
import {PresentationNode} from './harness/presentation-dom.mjs';
globalThis.IDBKeyRange=IDBKeyRange;
const KEY='aiu:maintenance-processing-consent:v1';
const READ='PAIA_MAINTENANCE_PROCESSING_STATUS',WRITE='PAIA_MAINTENANCE_PROCESSING_CONFIGURE';
const snapshot=(extra={})=>({enabled:false,savedEnabled:false,generation:'g1',phase:'off',serviceAvailable:false,...extra});
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const tick=()=>new Promise(r=>setImmediate(r));
async function fixture(t){const data={},storage={async get(k){return {[k]:structuredClone(data[k])};},async set(v){Object.assign(data,structuredClone(v));}},s=new IndexedArchiveStore(storage,{indexedDB:new IDBFactory()});await s.consent(true);t.after(()=>s.repository.close());const listeners={},url='chrome-extension://synthetic/ui/archive.html',sender={id:'synthetic',frameId:0,documentId:'document-A',documentLifecycle:'active',url,tab:{id:4,windowId:2,incognito:false}},api={runtime:{id:'synthetic',getURL:p=>'chrome-extension://synthetic/'+p,getContexts:async()=>[{contextType:'TAB',tabId:4,windowId:2,frameId:0,documentId:'document-A',documentUrl:url,incognito:false}]},tabs:{get:async()=>({id:4,windowId:2,incognito:false,url}),onRemoved:{addListener(fn){listeners.removed=fn;}},onUpdated:{addListener(fn){listeners.updated=fn;}}}},commands=new MaintenanceProcessingCommands(s,api);return {s,api,sender,commands,listeners,send:(type,fields={})=>commands.handle({type,...fields},sender)};}

test('original verified Settings action persists real preference, and only fresh original transaction yields purpose evidence',async t=>{const f=await fixture(t),state=new SettingsMaintenanceState({send:f.send});await state.load();assert.equal(state.value.enabled,false);assert.equal(await state.configure(true),true);assert.equal(state.value.enabled,true);const original=new MaintenanceProcessingConsent(f.s);t.after(()=>original.dispose());const cap=await f.s.run(()=>f.s.repository.transaction(false,t=>readMaintenanceProcessingConsent(original,f.s,t),['meta']));assert.equal(assertMaintenanceProcessingConsentFacts(cap,original,f.s),true);assert.equal(await state.configure(false),true);assert.throws(()=>assertMaintenanceProcessingConsentFacts(cap,original,f.s));});
test('foreign sender, document, frame, incognito, missing current context and schema additions refuse',async t=>{const f=await fixture(t);for(const sender of [{...f.sender,id:'foreign'},{...f.sender,frameId:1},{...f.sender,documentId:'foreign'},{...f.sender,url:'https://chatgpt.com/'},{...f.sender,tab:{...f.sender.tab,incognito:true}}])await assert.rejects(f.commands.handle({type:READ},sender));const v=await f.send(READ);await assert.rejects(f.send(WRITE,{enabled:true,expectedGeneration:v.generation,consentVersion:1,confirmed:false}));await assert.rejects(f.send(WRITE,{enabled:true,expectedGeneration:v.generation,consentVersion:1,confirmed:true,scope:{arbitrary:true}}));f.api.runtime.getContexts=async()=>[];await assert.rejects(f.send(READ));});
test('unknown or malformed purpose state cannot become checked or editable',async()=>{for(const v of [{enabled:true},snapshot({enabled:true}),{...snapshot(),unknown:'scope'}]){const s=new SettingsMaintenanceState({send:async()=>v});await s.load();assert.equal(s.editable,false);assert.equal(s.value,null);}});
test('held explicit configure does not optimistically turn the switch on; exact ACK is required',async()=>{const held=deferred(),calls=[],s=new SettingsMaintenanceState({send:async(type,fields)=>{calls.push({type,fields});return type===READ?snapshot():held.promise;}});await s.load();const pending=s.configure(true);assert.equal(s.value.enabled,false);assert.equal(s.busy,true);held.resolve(snapshot({enabled:true,savedEnabled:true,phase:'on',generation:'g2'}));assert.equal(await pending,true);assert.deepEqual(calls[1].fields,{enabled:true,expectedGeneration:'g1',consentVersion:1,confirmed:true});});
test('lost enable ACK rereads actual durable preference without replaying a write',async()=>{let on=false,writes=0;const s=new SettingsMaintenanceState({send:async type=>{if(type===WRITE){writes++;on=true;throw Error('lost return');}return snapshot(on?{enabled:true,savedEnabled:true,phase:'on',generation:'g2'}:{});}});await s.load();assert.equal(await s.configure(true),false);assert.equal(s.value.enabled,true);assert.equal(s.feedback,'save-error');assert.equal(writes,1);});
test('failed OFF is shown separately from saved ON and remains retryable',async()=>{let failed=false;const s=new SettingsMaintenanceState({send:async type=>{if(type===WRITE){failed=true;throw Error('not saved');}return snapshot({enabled:!failed,savedEnabled:true,phase:failed?'off_unconfirmed':'on'});}});await s.load();assert.equal(await s.configure(false),false);assert.equal(s.value.enabled,false);assert.equal(s.value.savedEnabled,true);assert.equal(s.feedback,'off-unconfirmed');await s.load();assert.equal(s.feedback,'off-unconfirmed');assert.equal(s.editable,true);});
test('old status cannot overwrite newer confirmed preference',async()=>{const held=deferred();let n=0;const s=new SettingsMaintenanceState({send:async type=>type===WRITE?snapshot({enabled:true,savedEnabled:true,phase:'on',generation:'g2'}):++n===1?snapshot():held.promise});await s.load();const reading=s.load();await s.configure(true);held.resolve(snapshot());await reading;assert.equal(s.value.enabled,true);});

// Opt-in queued close delivery models the native split: hiding and returning
// focus are synchronous; close listeners run in a later task. Attribute
// mutations run at a microtask checkpoint, independently of that close task.
class DialogAttributeObserver {
 constructor(callback){this.callback=callback;this.records=[];this.queued=false;}
 observe(node){node.attributeObserver=this;}
 takeRecords(){return this.records.splice(0);}
 record(node,oldValue){this.records.push({type:'attributes',target:node,attributeName:'open',oldValue});if(this.queued)return;this.queued=true;queueMicrotask(()=>{this.queued=false;const records=this.takeRecords();if(records.length)this.callback(records,this);});}
}
class Element extends PresentationNode {
 constructor(tag,closeTasks=null){super(tag);this._open=false;this.closeTasks=closeTasks;this.tabIndex=['button','input','select','textarea'].includes(tag)?0:-1;}
 get open(){return this._open;}
 set open(value){const old=this._open;this._open=!!value;if(old!==this._open)this.attributeObserver?.record(this,old?'':null);}
 showModal(){this.priorFocus=document.activeElement;this.open=true;if(this.closeTasks)document.modal=this;}
 close(){if(!this.open)return;this.open=false;if(this.closeTasks){document.modal=null;this.priorFocus?.focus();this.closeTasks.push(()=>this.listeners.get('close')?.());}else this.listeners.get('close')?.();}
 focus(){if(document.modal&&!document.modal.contains(this))return;super.focus();}
 getClientRects(){return this.hidden?[]:[{}];}
 querySelectorAll(){return descendants(this).slice(1).filter(node=>['BUTTON','INPUT','SELECT','TEXTAREA'].includes(node.tagName));}
}
const descendants=node=>[node,...node.children.flatMap(descendants)];
function ui(t,send,{visible=true,queuedClose=false}={}){const old=Object.getOwnPropertyDescriptor(globalThis,'document'),oldObserver=Object.getOwnPropertyDescriptor(globalThis,'MutationObserver'),closeTasks=queuedClose?[]:null,body=new Element('body',closeTasks);globalThis.document={body,activeElement:null,createElement:tag=>new Element(tag,closeTasks)};globalThis.MutationObserver=DialogAttributeObserver;t.after(()=>{if(old)Object.defineProperty(globalThis,'document',old);else delete globalThis.document;if(oldObserver)Object.defineProperty(globalThis,'MutationObserver',oldObserver);else delete globalThis.MutationObserver;});let current=visible,notify;const owner=mountSettingsMaintenance(body,{send,language:()=> 'en',runtime:{onMessage:{addListener(fn){notify=fn;}}},isCurrent:()=>current}),find=id=>descendants(body).find(n=>n.id===id);return {owner,host:body,closeTasks,find,notify:message=>notify(message),setCurrent:v=>{current=v;owner.sync();}};}
const fire=(node,type,trusted=true)=>node.listeners.get(type)?.({isTrusted:trusted});
test('actual row opens explicit remote-purpose dialog; only trusted confirm writes and cancel does not',async t=>{const calls=[],f=ui(t,async(type,fields)=>{calls.push({type,fields});return type===READ?snapshot():snapshot({enabled:true,savedEnabled:true,phase:'on',generation:'g2'});});await tick();const toggle=f.find('settings-maintenance-enabled');toggle.checked=true;fire(toggle,'change');assert.equal(f.find('settings-maintenance-consent').open,true);assert.equal(calls.length,1);assert.match(f.find('settings-maintenance-consent-explanation').textContent,/remote AI|AI service and model provider/);fire(f.find('settings-maintenance-confirm'),'click',false);assert.equal(calls.length,1);fire(f.find('settings-maintenance-cancel'),'click');assert.equal(calls.length,1);toggle.checked=true;fire(toggle,'change');fire(f.find('settings-maintenance-confirm'),'click');await tick();assert.equal(calls.length,2);assert.equal(toggle.checked,true);});
test('synthetic change and hidden Settings cannot confirm; changed generation requires a new dialog',async t=>{let value=snapshot();const calls=[],f=ui(t,async(type,fields)=>{calls.push({type,fields});return value;});await tick();const toggle=f.find('settings-maintenance-enabled');toggle.checked=true;fire(toggle,'change',false);assert.equal(f.find('settings-maintenance-consent').open,false);toggle.checked=true;fire(toggle,'change');f.setCurrent(false);fire(f.find('settings-maintenance-confirm'),'click');assert.equal(calls.filter(c=>c.type===WRITE).length,0);f.setCurrent(true);toggle.checked=true;fire(toggle,'change');value=snapshot({generation:'changed'});await f.owner.state.load();fire(f.find('settings-maintenance-confirm'),'click');await tick();assert.equal(calls.filter(c=>c.type===WRITE).length,0);});

test('original acknowledged Settings OFF stops live purpose before a held document check settles',async t=>{const f=await fixture(t),state=new SettingsMaintenanceState({send:f.send});await state.load();assert.equal(await state.configure(true),true);const owner=new MaintenanceProcessingConsent(f.s);t.after(()=>owner.dispose());const cap=await f.s.run(()=>f.s.repository.transaction(false,t=>readMaintenanceProcessingConsent(owner,f.s,t),['meta'])),entered=deferred(),release=deferred(),get=f.api.tabs.get;f.api.tabs.get=async id=>{entered.resolve();await release.promise;return get(id);};const pending=f.send(WRITE,{enabled:false,expectedGeneration:state.value.generation,consentVersion:1,confirmed:true});let stillCurrent;try{await entered.promise;try{stillCurrent=assertMaintenanceProcessingConsentFacts(cap,owner,f.s);}catch{stillCurrent=false;}}finally{release.resolve();await pending;}assert.equal(stillCurrent,false);});


async function enabledFixture(t){const f=await fixture(t),state=new SettingsMaintenanceState({send:f.send});await state.load();assert.equal(await state.configure(true),true);const owner=new MaintenanceProcessingConsent(f.s);t.after(()=>owner.dispose());const cap=await f.s.run(()=>f.s.repository.transaction(false,t=>readMaintenanceProcessingConsent(owner,f.s,t),['meta']));return {...f,state,owner,cap};}
const off=f=>f.send(WRITE,{enabled:false,expectedGeneration:f.state.value.generation,consentVersion:1,confirmed:true});
const persisted=f=>f.s.run(()=>f.s.repository.transaction(false,t=>t.get('meta',KEY),['meta']));
test('original known-document OFF denies during held getContexts and writes only after original validation',async t=>{const f=await enabledFixture(t),entered=deferred(),release=deferred(),contexts=f.api.runtime.getContexts;f.api.runtime.getContexts=async options=>{entered.resolve();await release.promise;return contexts(options);};const pending=off(f);try{await entered.promise;assert.throws(()=>assertMaintenanceProcessingConsentFacts(f.cap,f.owner,f.s));assert.equal((await persisted(f)).enabled,true);}finally{release.resolve();}assert.equal((await pending).phase,'off');});
test('OFF authentication failure after early denial leaves original durable ON and sticky current OFF',async t=>{const f=await enabledFixture(t);f.api.runtime.getContexts=async()=>[];const pending=off(f);assert.throws(()=>assertMaintenanceProcessingConsentFacts(f.cap,f.owner,f.s));await assert.rejects(pending);assert.equal((await persisted(f)).enabled,true);f.api.runtime.getContexts=async()=>[{contextType:'TAB',tabId:4,windowId:2,frameId:0,documentId:'document-A',documentUrl:f.sender.url,incognito:false}];const status=await f.send(READ);assert.equal(status.phase,'off_unconfirmed');assert.equal(status.savedEnabled,true);assert.equal(status.enabled,false);});
test('navigation during held known-document OFF cancels the original intent and preserves the old row',async t=>{const f=await enabledFixture(t),entered=deferred(),release=deferred(),get=f.api.tabs.get;f.api.tabs.get=async id=>{entered.resolve();await release.promise;return get(id);};const pending=off(f),rejected=assert.rejects(pending);try{await entered.promise;f.listeners.updated(4,{status:'loading'});assert.throws(()=>assertMaintenanceProcessingConsentFacts(f.cap,f.owner,f.s));}finally{release.resolve();}await rejected;assert.equal((await persisted(f)).enabled,true);});
test('navigation removes acknowledged-document shortcut; old sender cannot revoke through a held unauthenticated request',async t=>{const f=await enabledFixture(t),entered=deferred(),release=deferred(),get=f.api.tabs.get;f.listeners.updated(4,{status:'loading'});f.api.tabs.get=async id=>{entered.resolve();await release.promise;return get(id);};f.api.runtime.getContexts=async()=>[];const pending=off(f),rejected=assert.rejects(pending);try{await entered.promise;assert.equal(assertMaintenanceProcessingConsentFacts(f.cap,f.owner,f.s),true);}finally{release.resolve();}await rejected;assert.equal((await persisted(f)).enabled,true);});
test('eight held document checks retain their slots; acknowledged ninth OFF still denies before resource refusal',async t=>{const f=await enabledFixture(t),entered=deferred(),release=deferred(),get=f.api.tabs.get;let count=0;f.api.tabs.get=async id=>{if(++count===8)entered.resolve();await release.promise;return get(id);};const pending=Array.from({length:8},()=>f.send(READ));try{await entered.promise;const denied=off(f);assert.throws(()=>assertMaintenanceProcessingConsentFacts(f.cap,f.owner,f.s));await assert.rejects(denied,e=>e.code==='RESOURCE_LIMIT');assert.equal(count,8);assert.equal((await persisted(f)).enabled,true);}finally{release.resolve();await Promise.all(pending);}assert.equal((await f.send(READ)).phase,'off_unconfirmed');});
test('original bounded Chrome contexts reject oversize and accessors without dereferencing',async t=>{const f=await fixture(t),contexts=await f.api.runtime.getContexts();f.api.runtime.getContexts=async()=>Array.from({length:65},()=>contexts[0]);await assert.rejects(f.send(READ));let touches=0;const c={...contexts[0]};Object.defineProperty(c,'documentId',{get(){touches++;return 'document-A';}});f.api.runtime.getContexts=async()=>[c];await assert.rejects(f.send(READ));const list=[];Object.defineProperty(list,'0',{get(){touches++;return contexts[0];}});f.api.runtime.getContexts=async()=>list;await assert.rejects(f.send(READ));assert.equal(touches,0);});
test('original ON commit followed by document-return failure remains an honestly persisted preference',async t=>{const f=await fixture(t),before=await f.send(READ),get=f.api.tabs.get;let checks=0;f.api.tabs.get=async id=>{if(++checks===3)throw Error('post-commit document unavailable');return get(id);};await assert.rejects(f.send(WRITE,{enabled:true,expectedGeneration:before.generation,consentVersion:1,confirmed:true}));assert.equal((await persisted(f)).enabled,true);f.api.tabs.get=get;const seen=await f.send(READ);assert.equal(seen.savedEnabled,true);assert.equal(seen.enabled,true);});
test('accessor request type is rejected before invocation or document work',async t=>{const f=await fixture(t);let touches=0,documents=0;f.api.tabs.get=async()=>{documents++;throw Error('no entry');};await assert.rejects(f.commands.handle(Object.defineProperty({},'type',{get(){touches++;return READ;}}),f.sender));assert.equal(touches,0);assert.equal(documents,0);});

test('hidden Settings AI group sends no new metadata request until actual visible refresh',async t=>{const calls=[],f=ui(t,async type=>{calls.push(type);return snapshot();},{visible:false});await tick();assert.deepEqual(calls,[]);f.notify({type:'ARCHIVE_CHANGED'});f.notify({type:'PAIA_MAINTENANCE_PROCESSING_CHANGED'});await f.owner.refresh();assert.deepEqual(calls,[]);f.setCurrent(true);await f.owner.refresh();assert.deepEqual(calls,[READ]);f.setCurrent(false);f.notify({type:'ARCHIVE_CHANGED'});await tick();assert.deepEqual(calls,[READ]);});


test('explicit OFF retry stays busy across its fresh read and one original configure acknowledgement',async()=>{
 const read=deferred(),ack=deferred(),calls=[];let reads=0;
 const state=new SettingsMaintenanceState({send:async(type,fields)=>{calls.push({type,fields});return type===READ?(++reads===1?snapshot({savedEnabled:true,phase:'off_unconfirmed'}):read.promise):ack.promise;}});
 await state.load();const retry=state.configure(false,{reread:true});
 assert.equal(state.busy,true);assert.equal(state.editable,false);assert.equal(state.value.phase,'off_unconfirmed');
 read.resolve(snapshot({savedEnabled:true,phase:'off_unconfirmed',generation:'fresh'}));await tick();
 assert.equal(state.busy,true,'fresh status cannot expose a false settled gap before the write');
 assert.equal(state.editable,false);assert.equal(calls.filter(c=>c.type===WRITE).length,1);
 assert.equal(calls.at(-1).fields.expectedGeneration,'fresh');
 ack.resolve(snapshot({generation:'committed'}));assert.equal(await retry,true);
 assert.equal(state.busy,false);assert.equal(state.value.phase,'off');
});
test('native modal keyboard boundaries wrap inside without confirming or changing Escape behavior',async t=>{
 const calls=[],f=ui(t,async(type,fields)=>{calls.push({type,fields});return snapshot();});await tick();
 const toggle=f.find('settings-maintenance-enabled');toggle.checked=true;fire(toggle,'change');
 const dialog=f.find('settings-maintenance-consent'),cancel=f.find('settings-maintenance-cancel'),confirm=f.find('settings-maintenance-confirm');
 let prevented=0;confirm.focus();dialog.listeners.get('keydown')({key:'Tab',shiftKey:false,preventDefault(){prevented++;}});
 assert.equal(document.activeElement,cancel);cancel.focus();dialog.listeners.get('keydown')({key:'Tab',shiftKey:true,preventDefault(){prevented++;}});
 assert.equal(document.activeElement,confirm);assert.equal(prevented,2);
 dialog.listeners.get('keydown')({key:'Escape',preventDefault(){throw Error('Escape must remain native');}});
 assert.equal(dialog.open,true);assert.equal(calls.filter(c=>c.type===WRITE).length,0);
});


test('one current-epoch navigation refusal retries only original status and never configures purpose',async()=>{
 const calls=[];const s=new SettingsMaintenanceState({send:async type=>{calls.push(type);if(calls.length===1)throw Object.assign(Error('FORBIDDEN'),{code:'FORBIDDEN'});return snapshot({enabled:true,savedEnabled:true,phase:'on',generation:'current-document'});}});
 assert.equal(await s.load(),true);assert.deepEqual(calls,[READ,READ]);assert.equal(s.value.generation,'current-document');assert.equal(s.value.enabled,true);assert.equal(s.error,false);
});
test('permanent navigation refusal remains unavailable after exactly one status retry',async()=>{
 const calls=[];const s=new SettingsMaintenanceState({send:async type=>{calls.push(type);throw Object.assign(Error('FORBIDDEN'),{code:'FORBIDDEN'});}});
 assert.equal(await s.load(),false);assert.deepEqual(calls,[READ,READ]);assert.equal(s.value,null);assert.equal(s.editable,false);assert.equal(s.error,true);
});
test('superseded navigation refusal cannot issue a late retry or overwrite the newer owner view',async()=>{
 let reject;const old=new Promise((_,r)=>reject=r),calls=[];const s=new SettingsMaintenanceState({send:async type=>{calls.push(type);return calls.length===1?old:snapshot({generation:'newer'});}});
 const prior=s.load();assert.equal(await s.load(),true);reject(Object.assign(Error('FORBIDDEN'),{code:'FORBIDDEN'}));assert.equal(await prior,false);assert.deepEqual(calls,[READ,READ]);assert.equal(s.value.generation,'newer');assert.equal(s.error,false);
});
test('status retry never masks other owner denials or a malformed successful response',async()=>{
 for(const code of ['CONSENT_REQUIRED','RESOURCE_LIMIT','UNAVAILABLE',null]){const calls=[];const s=new SettingsMaintenanceState({send:async type=>{calls.push(type);if(code)throw Object.assign(Error(code),{code});return {enabled:true};}});assert.equal(await s.load(),false);assert.deepEqual(calls,[READ]);assert.equal(s.editable,false);}
});


test('retired hidden status load cannot retry after a later show without a fresh load epoch',async()=>{
 let active=true,reject;const held=new Promise((_,r)=>reject=r),calls=[];const s=new SettingsMaintenanceState({isCurrent:()=>active,send:async type=>{calls.push(type);return held;}});
 const reading=s.load();active=false;s.retireRead();active=true;reject(Object.assign(Error('FORBIDDEN'),{code:'FORBIDDEN'}));assert.equal(await reading,false);assert.deepEqual(calls,[READ]);assert.equal(s.value,null);assert.equal(s.error,false);
});
test('hidden or detached status lifetime cannot begin or retry a read',async()=>{
 let active=false,reject;const held=new Promise((_,r)=>reject=r),calls=[];const s=new SettingsMaintenanceState({isCurrent:()=>active,send:async type=>{calls.push(type);return held;}});
 assert.equal(await s.load(),false);assert.deepEqual(calls,[]);active=true;const reading=s.load();active=false;reject(Object.assign(Error('FORBIDDEN'),{code:'FORBIDDEN'}));assert.equal(await reading,false);assert.deepEqual(calls,[READ]);assert.equal(s.value,null);
});
test('newer explicit configure retires a held retry result without replaying or overwriting its ACK',async()=>{
 const held=deferred(),calls=[];let reads=0;const s=new SettingsMaintenanceState({send:async(type,fields)=>{calls.push({type,fields});if(type===WRITE)return snapshot({enabled:true,savedEnabled:true,phase:'on',generation:'configured'});if(++reads===1)return snapshot();if(reads===2)throw Object.assign(Error('FORBIDDEN'),{code:'FORBIDDEN'});return held.promise;}});
 await s.load();const reading=s.load();await tick();assert.equal(reads,3);assert.equal(await s.configure(true),true);held.resolve(snapshot({generation:'old-retry'}));assert.equal(await reading,false);assert.equal(s.value.generation,'configured');assert.equal(s.value.enabled,true);assert.equal(calls.filter(x=>x.type===WRITE).length,1);
});
test('real Maintenance presenter retires an outstanding status across hidden and re-shown navigation',async t=>{
 let reject;const held=new Promise((_,r)=>reject=r),calls=[],f=ui(t,async type=>{calls.push(type);return held;});await tick();f.setCurrent(false);f.setCurrent(true);reject(Object.assign(Error('FORBIDDEN'),{code:'FORBIDDEN'}));await tick();assert.deepEqual(calls,[READ]);assert.equal(f.owner.state.value,null);assert.equal(f.owner.state.error,false);
});


test('real detached Maintenance host cannot retry a late first refusal',async t=>{
 let reject;const held=new Promise((_,r)=>reject=r),calls=[],f=ui(t,async type=>{calls.push(type);return calls.length===1?held:snapshot({generation:'reattached'});});await tick();
 const host=f.find('settings-maintenance').parentElement;Object.defineProperty(host,'isConnected',{configurable:true,value:false});reject(Object.assign(Error('FORBIDDEN'),{code:'FORBIDDEN'}));await tick();assert.deepEqual(calls,[READ]);assert.equal(f.owner.state.value,null);delete host.isConnected;assert.equal(await f.owner.refresh(),true);assert.equal(f.owner.state.value.generation,'reattached');
});
test('hide and reshow cannot adopt the old held status retry response',async t=>{
 const held=deferred(),calls=[],f=ui(t,async type=>{calls.push(type);if(calls.length===1)throw Object.assign(Error('FORBIDDEN'),{code:'FORBIDDEN'});return calls.length===2?held.promise:snapshot({generation:'fresh-show'});});await tick();assert.deepEqual(calls,[READ,READ]);f.setCurrent(false);f.setCurrent(true);held.resolve(snapshot({enabled:true,savedEnabled:true,phase:'on',generation:'retired-retry'}));await tick();assert.equal(f.owner.state.value,null);assert.equal(f.owner.state.error,false);assert.deepEqual(calls,[READ,READ]);assert.equal(await f.owner.refresh(),true);assert.equal(f.owner.state.value.generation,'fresh-show');
});
test('a burst of superseded status refusals gives only the final epoch one bounded retry',async()=>{
 const calls=[];const s=new SettingsMaintenanceState({send:async type=>{calls.push(type);if(calls.length<=8)throw Object.assign(Error('FORBIDDEN'),{code:'FORBIDDEN'});return snapshot();}});const loads=Array.from({length:8},()=>s.load());const outcomes=await Promise.all(loads);assert.deepEqual(outcomes,[false,false,false,false,false,false,false,true]);assert.deepEqual(calls,Array(9).fill(READ));assert.equal(s.error,false);
});


async function queuedDialog(t){
 const calls=[];let value=snapshot();const f=ui(t,async(type,fields)=>{calls.push({type,fields});if(type===WRITE)value=snapshot({enabled:true,savedEnabled:true,phase:'on',generation:'committed'});return value;},{queuedClose:true});await tick();
 const toggle=f.find('settings-maintenance-enabled'),dialog=f.find('settings-maintenance-consent'),cancel=f.find('settings-maintenance-cancel'),confirm=f.find('settings-maintenance-confirm');
 const open=()=>{toggle.focus();toggle.checked=true;fire(toggle,'change');assert.equal(dialog.open,true);assert.equal(document.activeElement,cancel);};
 const dismiss=kind=>{if(kind==='cancel')fire(cancel,'click');else if(kind==='escape'){let prevented=false;dialog.listeners.get('cancel')?.({isTrusted:true,preventDefault(){prevented=true;}});assert.equal(prevented,false,'native Escape cancellation remains browser-owned');dialog.close();}else dialog.close();assert.equal(dialog.open,false);assert.equal(document.activeElement,toggle);};
 return {...f,calls,toggle,dialog,cancel,confirm,open,dismiss,setValue:v=>{value=v;}};
}
for(const kind of ['cancel','escape'])test(`queued ${kind} close cannot retire a newer trusted Maintenance dialog`,async t=>{
 const f=await queuedDialog(t);f.open();f.dismiss(kind);assert.equal(f.closeTasks.length,1);f.open();f.confirm.focus();f.closeTasks.shift()();await Promise.resolve();
 assert.equal(f.dialog.open,true);assert.equal(document.activeElement,f.confirm,'an old close cannot take focus from the newer modal');assert.equal(f.owner.state.editable,true);fire(f.confirm,'click');await tick();
 assert.equal(f.calls.filter(c=>c.type===WRITE).length,1);assert.deepEqual(f.calls.find(c=>c.type===WRITE).fields,{enabled:true,expectedGeneration:'g1',consentVersion:1,confirmed:true});assert.equal(f.toggle.checked,true);
});
for(const kind of ['cancel','escape'])test(`${kind} retires Maintenance intent before a script-only reopen or queued close event`,async t=>{
 const f=await queuedDialog(t);f.open();f.dismiss(kind);f.dialog.showModal();f.confirm.focus();fire(f.confirm,'click');await Promise.resolve();f.closeTasks.shift()();fire(f.confirm,'click');await tick();
 assert.equal(f.calls.filter(c=>c.type===WRITE).length,0,'a script-only reopen cannot reuse cancelled authority');assert.equal(f.owner.state.value.enabled,false);
});
test('programmatic close and reopen retires old Maintenance intent at the native mutation checkpoint',async t=>{
 const f=await queuedDialog(t);f.open();f.dismiss('programmatic');f.dialog.showModal();await Promise.resolve();f.confirm.focus();fire(f.confirm,'click');await tick();
 assert.equal(f.calls.filter(c=>c.type===WRITE).length,0);assert.equal(f.owner.state.value.enabled,false);f.closeTasks.shift()();
});
test('fresh trusted opener drains older close mutations without retiring its own Maintenance intent',async t=>{
 const f=await queuedDialog(t);f.open();f.dismiss('programmatic');f.open();await Promise.resolve();f.closeTasks.shift()();fire(f.confirm,'click');await tick();assert.equal(f.calls.filter(c=>c.type===WRITE).length,1);
});
test('queued close protection retains exact stale-generation denial and original reread',async t=>{
 const f=await queuedDialog(t);f.open();f.dismiss('cancel');f.open();f.closeTasks.shift()();await Promise.resolve();f.setValue(snapshot({generation:'changed'}));await f.owner.state.load();const reads=f.calls.filter(c=>c.type===READ).length;fire(f.confirm,'click');await tick();
 assert.equal(f.calls.filter(c=>c.type===WRITE).length,0);assert.equal(f.calls.filter(c=>c.type===READ).length,reads+1);assert.equal(f.dialog.open,false);
});
for(const kind of ['hidden','detached'])test(`${kind} Maintenance presenter retires consent before reappearance and script-only reopening`,async t=>{
 const f=await queuedDialog(t);f.open();if(kind==='hidden')f.setCurrent(false);else{Object.defineProperty(f.host,'isConnected',{configurable:true,value:false});f.owner.sync();}
 assert.equal(f.dialog.open,false);if(kind==='hidden')f.setCurrent(true);else delete f.host.isConnected;f.dialog.showModal();fire(f.confirm,'click');await Promise.resolve();while(f.closeTasks.length)f.closeTasks.shift()();fire(f.confirm,'click');await tick();assert.equal(f.calls.filter(c=>c.type===WRITE).length,0);
});
test('consumed Maintenance confirmation cannot write twice before its queued close is delivered',async t=>{
 const f=await queuedDialog(t);f.open();fire(f.confirm,'click');fire(f.confirm,'click');await tick();fire(f.confirm,'click');assert.equal(f.calls.filter(c=>c.type===WRITE).length,1);assert.equal(f.closeTasks.length,1);f.closeTasks.shift()();assert.equal(f.owner.state.value.enabled,true);
});
test('queued Maintenance lifecycle never upgrades synthetic activation into consent',async t=>{
 const f=await queuedDialog(t);f.toggle.checked=true;fire(f.toggle,'change',false);assert.equal(f.dialog.open,false);f.dialog.showModal();fire(f.confirm,'click',false);fire(f.confirm,'click');await tick();assert.equal(f.calls.filter(c=>c.type===WRITE).length,0);f.dialog.close();await Promise.resolve();f.closeTasks.shift()();f.open();fire(f.confirm,'click',false);await tick();assert.equal(f.calls.filter(c=>c.type===WRITE).length,0);fire(f.confirm,'click');await tick();assert.equal(f.calls.filter(c=>c.type===WRITE).length,1);
});

test('same-turn direct close and reopen cannot reuse Maintenance intent before mutation delivery',async t=>{
 const f=await queuedDialog(t);f.open();f.dismiss('programmatic');f.dialog.showModal();f.confirm.focus();fire(f.confirm,'click');await tick();assert.equal(f.calls.filter(c=>c.type===WRITE).length,0);assert.equal(f.owner.state.value.enabled,false);
});

// Execute the exact passive native observer in isolation; no browser or owner
// result is substituted, and these controls cannot capture user text.
{
const {readFile}=await import('node:fs/promises');
const {runInNewContext}=await import('node:vm');
const native=await readFile(new URL('./settings-maintenance-chrome-e2e.test.mjs',import.meta.url),'utf8');
const source=native.match(/^async function installTransportObserver\(page\) \{[\s\S]*?^\}\n/m)?.[0];assert.ok(source);
const READ='PAIA_MAINTENANCE_PROCESSING_STATUS',WRITE='PAIA_MAINTENANCE_PROCESSING_CONFIGURE',INPUT='#settings-maintenance-enabled',DIALOG='#settings-maintenance-consent';
async function fixture(){
 const listeners=new Map(),calls=[],input={id:INPUT.slice(1),checked:false,disabled:false,dataset:{loaded:'true'},getAttribute:k=>k==='aria-busy'?'false':null,matches:selector=>selector===INPUT},dialog={id:DIALOG.slice(1),open:true},cancel={id:'settings-maintenance-cancel',matches:()=>false},confirm={id:'settings-maintenance-confirm',matches:()=>false},section={isConnected:true,getClientRects:()=>[{}]};dialog.matches=()=>false;
 const nodes=new Map([[input.id,input],[dialog.id,dialog],[cancel.id,cancel],[confirm.id,confirm],['settings-maintenance',section]]),document={activeElement:confirm,getElementById:id=>nodes.get(id),addEventListener(type,fn,options){const list=listeners.get(type)||[];list.push({fn,options});listeners.set(type,list);},removeEventListener(type,fn,capture){listeners.set(type,(listeners.get(type)||[]).filter(x=>x.fn!==fn||!!(x.options===true||x.options?.capture)!==!!capture));}};
 const reply={ok:true,data:{enabled:false,savedEnabled:false,phase:'off',generation:'synthetic',serviceAvailable:false}},originalPromise=Promise.resolve(reply);
 const original=function(...args){calls.push({receiver:this,args});return originalPromise;};const runtime={};Object.defineProperty(runtime,'sendMessage',{configurable:true,enumerable:false,writable:true,value:original});
 const descriptor=Object.getOwnPropertyDescriptor(runtime,'sendMessage');const scope={READ,WRITE,INPUT,DIALOG,document,chrome:{runtime}};
 const install=runInNewContext(source+'\ninstallTransportObserver',scope);const page={async evaluate(fn,args){return fn(args);}};await install(page);
 const fire=(type,target=dialog,key)=>{const event={type,target,key,isTrusted:true,preventDefault(){throw Error('observer cannot prevent native events');}};for(const{fn}of listeners.get(type)||[])fn(event);return event;};
 return {probe:scope.__maintenanceSettingsProbe,listeners,calls,runtime,original,descriptor,originalPromise,input,dialog,cancel,confirm,section,document,fire};
}
test('exact original observer is passive and records queued close on a reopened dialog without any RPC or DOM change',async()=>{const f=await fixture();f.fire('close');const row=JSON.parse(JSON.stringify(f.probe.lifecycle[0]));assert.deepEqual(row,{order:1,type:'close',id:DIALOG.slice(1),trusted:true,key:null,dialogOpen:true,active:'settings-maintenance-confirm',checked:false,disabled:false,busy:false,loaded:'true',connected:true,visible:true});assert.equal(f.dialog.open,true);assert.equal(f.document.activeElement,f.confirm);assert.equal(f.calls.length,0);assert.deepEqual(Array.from(f.probe.events),[]);for(const[type,entries]of f.listeners)for(const e of entries)if(type!=='click'&&type!=='change')assert.deepEqual(JSON.parse(JSON.stringify(e.options)),{capture:true,passive:true});});
test('original trustedActivation event shape remains exact while lifecycle observes cancel and keyboard separately',async()=>{const f=await fixture();f.fire('click',f.confirm);f.fire('click',f.cancel);f.fire('change',f.input);f.fire('cancel',f.dialog);f.fire('keydown',f.confirm,'Enter');f.fire('keyup',f.input,' ');assert.deepEqual(JSON.parse(JSON.stringify(f.probe.events)),[{type:'click',trusted:true,id:f.confirm.id},{type:'change',trusted:true,id:f.input.id}]);assert.deepEqual(Array.from(f.probe.lifecycle,row=>row.type),['click','click','change','cancel','keydown','keyup']);assert.equal(f.probe.lifecycle.at(-1).key,'Space');assert.equal(f.calls.length,0);});
test('input text, arbitrary identifiers and nonallowlisted keys cannot enter lifecycle diagnostics',async()=>{const f=await fixture();f.input.value='SENSITIVE_BODY_SENTINEL';f.fire('keydown',f.input,'SENSITIVE_KEY_SENTINEL');f.fire('close',{id:'SENSITIVE_ID_SENTINEL'});f.document.activeElement={id:'SENSITIVE_ACTIVE_SENTINEL'};f.input.dataset.loaded='SENSITIVE_DATASET_SENTINEL';f.fire('close');assert.equal(f.probe.lifecycle.length,1);const s=JSON.stringify(f.probe.lifecycle);assert.doesNotMatch(s,/SENSITIVE|value|textContent|innerText/);assert.equal(f.probe.lifecycle[0].active,'other');assert.equal(f.probe.lifecycle[0].loaded,'other');});
test('synthetic lifecycle facts are bounded to latest128 records, never unbounded event amplification',async()=>{const f=await fixture();for(let i=0;i<200;i++)f.fire('close');assert.equal(f.probe.lifecycle.length,128);assert.equal(f.probe.lifecycle[0].order,73);assert.equal(f.probe.lifecycle.at(-1).order,200);assert.equal(f.calls.length,0);});
test('ordinary READ and WRITE observation invokes native once with original receiver/arguments and returns exact native Promise',async()=>{const f=await fixture();for(const type of [READ,WRITE,'UNCHANGED_ORDINARY']){const message={type,enabled:false};const result=f.runtime.sendMessage(message);assert.equal(result,f.originalPromise);assert.equal(f.calls.at(-1).receiver,f.runtime);assert.equal(f.calls.at(-1).args[0],message);await result;}await new Promise(resolve=>setImmediate(resolve));assert.equal(f.calls.length,3);assert.equal(f.probe.reads.length,1);assert.equal(f.probe.writes.length,1);assert.equal(f.probe.pending,0);assert.deepEqual(Array.from(f.probe.unexpected),[]);});
test('restore recovers exact native descriptor and removes all original/lifecycle listeners',async()=>{const f=await fixture();f.probe.restore();assert.deepEqual(Object.getOwnPropertyDescriptor(f.runtime,'sendMessage'),f.descriptor);assert.equal([...f.listeners.values()].flat().length,0);f.fire('close');assert.equal(f.probe.lifecycle.length,0);});
test('observer failure is recorded as gate-failing diagnostic and cannot throw into the owner event',async()=>{const f=await fixture();f.document.getElementById=()=>{throw Error('synthetic observation failure');};assert.doesNotThrow(()=>{for(let i=0;i<200;i++)f.fire('close');});assert.deepEqual(Array.from(f.probe.unexpected),['lifecycle-observer-failed']);assert.equal(f.calls.length,0);});
test('success and failure reports contain only bounded existing-observer rows, no extra status or native event injection',()=>{assert.match(native,/MAINTENANCE_SETTINGS_MODAL_LIFECYCLE/);assert.match(native,/lifecycle:probe\?\.lifecycle\.slice\(-128\)/);assert.match(source,/if \(probe\.lifecycle\.length > 128\) probe\.lifecycle\.shift\(\)/);assert.doesNotMatch(source,/dispatchEvent|setTimeout|keyboard\.press|\.click\(|\.focus\(|textContent|innerText|input\.value/);});
}
