import test from 'node:test';
import assert from 'node:assert/strict';
import {ArchiveOrderSettings} from '../ui/archive-order-settings.js';

class Node {
 constructor(){this.children=[];this.listeners=new Map();this.dataset={};this.style={setProperty(){}};this.value='';this.textContent='';this.disabled=false;}
 append(...nodes){this.children.push(...nodes);}
 setAttribute(){}
 addEventListener(type,fn){this.listeners.set(type,fn);}
 querySelector(){return null;}
 querySelectorAll(){return [];}
 fire(type){return this.listeners.get(type)?.();}
}
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const turn=()=>new Promise(resolve=>setImmediate(resolve));
const preference=mode=>({mode,providers:{chatgpt:{availability:'unavailable'}}});
async function fixture(run){
 const names=['document','navigator','chrome','CustomEvent'],previous=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)])),nodes=[],events=[];
 const document={documentElement:Object.assign(new Node(),{lang:'zh-CN'}),body:new Node(),activeElement:null,createElement:()=>{const node=new Node();nodes.push(node);return node;},addEventListener(){},dispatchEvent:event=>events.push(event),getElementById:id=>nodes.find(node=>node.id===id)||null,querySelector:()=>null,querySelectorAll:()=>[]};
 for(const [name,value]of Object.entries({document,navigator:{language:'zh-CN'},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}}}))Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});
 try{await run({document,nodes,events});}finally{for(const [name,value]of previous)if(value)Object.defineProperty(globalThis,name,value);else delete globalThis[name];}
}

test('First rejected order read refreshes once after confirmed consent, with no preference write',()=>fixture(async({events})=>{
 let consented=false;const calls=[],control=new ArchiveOrderSettings({send:async(type,fields)=>{calls.push({type,fields});if(!consented)throw Error('CONSENT_REQUIRED');return preference('source');}});
 await control.load();assert.match(control.status.textContent,/暂时不可读/);assert.equal(events.length,0);
 control.setConsented(false);assert.equal(calls.length,1);
 consented=true;control.setConsented(true);await turn();control.setConsented(true);control.setConsented(true);await turn();
 assert.equal(calls.length,2);assert.ok(calls.every(call=>call.type==='PAIA_ARCHIVE_ORDER_PREFERENCE'&&call.fields===undefined));assert.equal(control.mode,'source');assert.equal(control.select.value,'source');assert.match(control.status.textContent,/ChatGPT.*回退 PAIA/);assert.equal(events.length,1);
}));

test('Failed consent refresh stays unavailable without success events or a write',()=>fixture(async({events})=>{
 let fail=true;const calls=[],control=new ArchiveOrderSettings({send:async(type,fields)=>{calls.push({type,fields});if(fail)throw Error('STORAGE_FAILED');return preference('paia');}});
 control.setConsented(true);await turn();assert.match(control.status.textContent,/暂时不可读/);assert.equal(events.length,0);assert.equal(control.loading,0);assert.equal(control.select.disabled,false);assert.equal(calls.length,1);
 fail=false;await control.load();assert.match(control.status.textContent,/使用 PAIA 稳定顺序/);assert.equal(events.length,1);assert.ok(calls.every(call=>call.fields===undefined));
}));

test('Read failure retains the last acknowledged source preference and reports the failure',()=>fixture(async({events})=>{
 let fail=false;const control=new ArchiveOrderSettings({send:async()=>{if(fail)throw Error('MESSAGE_CHANNEL_INTERRUPTED');return preference('source');}});
 await control.load();fail=true;await control.load();assert.equal(control.mode,'source');assert.equal(control.select.value,'source');assert.match(control.status.textContent,/暂时不可读.*上次确认/);assert.equal(events.length,1);
}));

for(const result of ['success','failure'])test(`Late read ${result} cannot overwrite a newer saved preference`,()=>fixture(async({events})=>{
 const read=deferred(),writes=[],control=new ArchiveOrderSettings({send:async(_type,fields)=>{if(!fields)return read.promise;writes.push(fields);return preference(fields.mode);}});
 const pending=control.load();control.select.value='source';await control.save('source');const status=control.status.textContent;
 if(result==='success')read.resolve(preference('paia'));else read.reject(Error('STORAGE_FAILED'));await pending;
 assert.equal(control.mode,'source');assert.equal(control.select.value,'source');assert.equal(control.status.textContent,status);assert.equal(events.length,1);assert.deepEqual(writes,[{mode:'source'}]);assert.equal(control.select.disabled,false);assert.equal(control.loading,0);
}));

test('A stale read cannot hide a failed write or replace its rollback',()=>fixture(async({events})=>{
 const read=deferred(),control=new ArchiveOrderSettings({send:async(_type,fields)=>{if(!fields)return read.promise;throw Error('STORAGE_FAILED');}});
 const pending=control.load();await control.save('source');const status=control.status.textContent;read.resolve(preference('source'));await pending;
 assert.equal(control.mode,'paia');assert.equal(control.select.value,'paia');assert.match(status,/尚未保存/);assert.equal(control.status.textContent,status);assert.equal(events.length,0);
}));

test('Read-only refresh waits for select blur and preserves the active control and uncommitted choice',()=>fixture(async({document,events})=>{
 const calls=[],control=new ArchiveOrderSettings({send:async(type,fields)=>{calls.push({type,fields});return preference('source');}});
 document.activeElement=control.select;control.select.value='paia';await control.load();assert.equal(calls.length,0);assert.equal(document.activeElement,control.select);assert.equal(control.select.value,'paia');assert.equal(control.select.disabled,false);
 document.activeElement=null;control.select.fire('blur');await turn();assert.equal(calls.length,1);assert.equal(control.select.value,'source');assert.equal(events.length,1);assert.equal(calls[0].fields,undefined);
}));

test('Focus acquired during a read defers application, and a user change supersedes that deferred read',()=>fixture(async({document,events})=>{
 const read=deferred(),calls=[],control=new ArchiveOrderSettings({send:async(type,fields)=>{calls.push({type,fields});return fields?preference(fields.mode):read.promise;}});
 const pending=control.load();document.activeElement=control.select;control.select.value='source';read.resolve(preference('paia'));await pending;
 assert.equal(control.select.value,'source');assert.equal(document.activeElement,control.select);assert.equal(control.pendingLoad,true);assert.equal(events.length,0);
 await control.save('source');document.activeElement=null;control.select.fire('blur');await turn();assert.equal(calls.length,2);assert.deepEqual(calls[1].fields,{mode:'source'});assert.equal(control.mode,'source');assert.equal(events.length,1);
}));

test('Pending writes exclude automatic reads and repeat writes',()=>fixture(async()=>{
 const write=deferred(),calls=[],control=new ArchiveOrderSettings({send:async(type,fields)=>{calls.push({type,fields});return write.promise;}});
 const pending=control.save('source');await control.load();await control.save('paia');control.setConsented(true);assert.equal(calls.length,1);assert.equal(control.select.disabled,true);write.resolve(preference('source'));await pending;assert.equal(control.mode,'source');assert.equal(control.select.disabled,false);
}));

test('A changed consent state fences old read callbacks before a new consent refresh',()=>fixture(async({events})=>{
 const reads=[deferred(),deferred()],calls=[],control=new ArchiveOrderSettings({send:async(type,fields)=>{calls.push({type,fields});return reads[calls.length-1].promise;}});
 control.setConsented(true);control.setConsented(false);control.setConsented(true);reads[1].resolve(preference('source'));await turn();reads[0].reject(Error('CONSENT_REQUIRED'));await turn();
 assert.equal(control.mode,'source');assert.doesNotMatch(control.status.textContent,/暂时不可读/);assert.equal(events.length,1);assert.equal(calls.length,2);assert.ok(calls.every(call=>call.fields===undefined));
}));

test('Settings mount waits for consent and ignores an older page response after the consent notification',()=>fixture(async({document,nodes})=>{
 const reads=[],calls=[],listeners=[];
 globalThis.chrome={runtime:{onMessage:{addListener:fn=>listeners.push(fn)},sendMessage:async message=>{calls.push(message);if(message.type==='GET_PAGE'){const read=deferred();reads.push(read);return read.promise;}assert.equal(message.type,'PAIA_ARCHIVE_ORDER_PREFERENCE');assert.equal(message.mode,undefined);return {ok:true,data:preference('source')};}}};
 const {installSettingsPreferences}=await import('../ui/settings-preferences.js?archive-order-refresh');installSettingsPreferences();assert.equal(reads.length,1);assert.equal(calls.length,1,'mount no longer makes an unauthorized order read');
 listeners[0]({type:'ARCHIVE_CHANGED',cause:'CONSENT'});reads[1].resolve({ok:true,data:{settings:{consentVersion:1},preferences:{}}});await turn();
 assert.equal(nodes.find(node=>node.id==='archive-order-mode').value,'source');reads[0].resolve({ok:true,data:{settings:{consentVersion:0},preferences:{}}});await turn();
 listeners[0]({type:'ARCHIVE_CHANGED'});reads[2].resolve({ok:true,data:{settings:{consentVersion:1},preferences:{}}});await turn();
 assert.equal(calls.filter(call=>call.type==='PAIA_ARCHIVE_ORDER_PREFERENCE').length,1,'an older pre-consent page cannot retrigger or clear the confirmed preference');assert.equal(document.activeElement,null);
}));


test('Navigator pending, fallback and effective-order notices cannot hide unresolved preference read or write failures',()=>fixture(async()=>{
 let failRead=false,failWrite=false;const control=new ArchiveOrderSettings({send:async(_type,fields)=>{if(fields?failWrite:failRead)throw Error('STORAGE_FAILED');return preference(fields?.mode||'source');}});
 const notifications=[{pending:true},{fallback:true},{effective:'source',fallback:false}];
 await control.load();failRead=true;await control.load();const readFailure=control.status.textContent;
 for(const detail of notifications){control.navigatorStatus(detail);assert.equal(control.status.textContent,readFailure);}
 failRead=false;await control.load();control.navigatorStatus({effective:'source'});assert.match(control.status.textContent,/已按可验证/);
 failWrite=true;await control.save('paia');const writeFailure=control.status.textContent;assert.match(writeFailure,/尚未保存/);
 for(const detail of notifications){control.navigatorStatus(detail);assert.equal(control.status.textContent,writeFailure);}
 failWrite=false;await control.save('source');control.navigatorStatus({effective:'source'});assert.match(control.status.textContent,/已按可验证/);
}));


test('A read failure is visible immediately while focused, without changing the uncommitted selection or retrying on blur',()=>fixture(async({document,events})=>{
 const read=deferred(),calls=[],control=new ArchiveOrderSettings({send:async(type,fields)=>{calls.push({type,fields});return read.promise;}});
 const pending=control.load();document.activeElement=control.select;control.select.value='source';read.reject(Error('STORAGE_FAILED'));await pending;
 assert.match(control.status.textContent,/暂时不可读/);assert.equal(control.failed,true);assert.equal(document.activeElement,control.select);assert.equal(control.select.value,'source');assert.equal(control.select.disabled,false);assert.equal(events.length,0);
 document.activeElement=null;control.select.fire('blur');await turn();assert.equal(calls.length,1);
}));
