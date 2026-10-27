import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createSettingsSyncRecovery,readSyncInterruptionState,syncInterruptionCopy} from '../ui/settings-sync-recovery.js';

const known=['unavailable','not-prepared','review-ready','prepared','outcome-unknown','finishing','selected'];
const envelope=(state,extra={})=>({ok:true,data:{version:1,state,...extra}});
const tick=()=>new Promise(resolve=>setImmediate(resolve));

// New finite synthetic DOM controls, not a browser/old-suite replay. The fake
// Settings mount stands in for the unchanged modal owner and records delegation.
function fixture({language='en',defaultRequest=false}={}){
 const globals=new Map(['document','MutationObserver','chrome'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)])),observers=[],calls=[];
 const notify=(target,attributeName,oldValue)=>{for(const observer of observers)if(observer.targets.some(row=>row.node===target&&row.options.attributeFilter.includes(attributeName)))observer.records.push({target,attributeName,oldValue});};
 class Node{
  constructor(tag){this.tagName=tag;this.children=[];this.attributes=new Map();this.listeners=new Map();this.style={};this.parentNode=null;this.text='';}
  get hidden(){return this.attributes.has('hidden');}set hidden(value){if(value)this.setAttribute('hidden','');else this.removeAttribute('hidden');}
  get open(){return this.attributes.has('open');}
  get textContent(){return this.text+this.children.map(node=>node.textContent).join(' ');}set textContent(value){this.text=String(value);this.children=[];}
  append(...nodes){for(const node of nodes){node.parentNode=this;this.children.push(node);}}
  prepend(node){node.parentNode=this;this.children.unshift(node);}
  after(node){node.parentNode=this.parentNode;this.parentNode.children.splice(this.parentNode.children.indexOf(this)+1,0,node);}
  setAttribute(name,value){const old=this.getAttribute(name);this.attributes.set(name,String(value));notify(this,name,old);}
  removeAttribute(name){if(!this.attributes.has(name))return;const old=this.getAttribute(name);this.attributes.delete(name);notify(this,name,old);}
  getAttribute(name){return this.attributes.get(name)??null;}
  addEventListener(name,fn){const values=this.listeners.get(name)??[];values.push(fn);this.listeners.set(name,values);}
  dispatch(name,event={}){for(const fn of this.listeners.get(name)??[])fn(event);}
  querySelector(selector){for(const node of this.children){if(selector[0]==='#'?node.id===selector.slice(1):node.tagName===selector)return node;const match=node.querySelector(selector);if(match)return match;}return null;}
  showModal(){this.setAttribute('open','');}
  close(){this.removeAttribute('open');this.dispatch('close');}
  focus(){throw Error('The read-only presenter must not take focus from the Settings owner.');}
 }
 class Observer{
  constructor(callback){this.callback=callback;this.targets=[];this.records=[];observers.push(this);}
  observe(node,options){assert.ok(node);this.targets.push({node,options});}
  takeRecords(){return this.records.splice(0);}
 }
 const body=new Node('body'),panel=new Node('section'),group=new Node('section'),heading=new Node('h2'),existing=new Node('button'),doc=new Node('document');
 panel.id='settings-panel';group.id='ux-settings-data-group';heading.textContent='Data & recovery';existing.textContent='Existing destination';group.append(heading,existing);panel.append(group);body.append(panel);doc.body=body;doc.documentElement={lang:language};doc.createElement=tag=>new Node(tag);doc.getElementById=id=>body.querySelector('#'+id);
 const request=message=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});calls.push({message,resolve,reject});return promise;};
 let mounted;
 function mountDetail(options){
  assert.equal(mounted,undefined,'exactly one existing detail owner');mounted=options;
  const row=new Node('button'),dialog=new Node('dialog'),close=new Node('button');row.id=options.id;dialog.id=options.id+'-dialog';close.textContent='Close';dialog.append(close,options.content);body.append(dialog);
  const sync=()=>{row.textContent=options.title[options.language()==='zh-CN'?0:1]+' '+options.value();};
  row.addEventListener('click',()=>{if(dialog.open)return;sync();dialog.showModal();void options.onOpen();});close.addEventListener('click',()=>dialog.close());return {row,dialog,sync};
 }
 Object.defineProperty(globalThis,'document',{configurable:true,value:doc});Object.defineProperty(globalThis,'MutationObserver',{configurable:true,value:Observer});Object.defineProperty(globalThis,'chrome',{configurable:true,value:{runtime:{sendMessage:request}}});
 const detail=createSettingsSyncRecovery({dataGroup:group,language:()=>doc.documentElement.lang,mountDetail,...(defaultRequest?{}:{request})});
 const content=mounted.content,status=content.children[0],description=content.children[1],boundary=content.children[2],refresh=content.children[3];
 return {doc,panel,group,heading,existing,detail,content,status,description,boundary,refresh,calls,mounted,observers,
  open:()=>detail.row.dispatch('click'),
  flush:()=>{for(const observer of observers){const records=observer.takeRecords();if(records.length)observer.callback(records);}},
  resolve:(index,state,extra)=>calls[index].resolve(envelope(state,extra)),
  restore:()=>{for(const [key,value]of globals)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}
 };
}

test('the status presenter accepts only the exact worker data envelope and known versioned states',()=>{
 for(const state of known)assert.equal(readSyncInterruptionState(envelope(state)),state);
 for(const value of [null,{}, {ok:false,data:{version:1,state:'selected'}},{ok:1,data:{version:1,state:'selected'}},{ok:true,result:{version:1,state:'selected'}},{ok:true,version:1,state:'selected'},{ok:true,data:{version:2,state:'selected'}},{ok:true,data:{version:'1',state:'selected'}},envelope('dispatched'),envelope('synced'),envelope('toString'),envelope(null)])assert.equal(readSyncInterruptionState(value),null);
});

test('all known states have distinct English and Chinese labels, and inspection never claims cloud success',()=>{
 for(const language of ['en','zh-CN']){
  const labels=new Set();for(const state of known){const view=syncInterruptionCopy(state,{language});labels.add(view.summary);assert.ok(view.description.length>20);assert.ok(view.boundary.length>20);assert.equal(view.refresh,language==='en'?'Refresh status':'刷新状态');}
  assert.equal(labels.size,known.length);
 }
 assert.match(syncInterruptionCopy('unavailable').description,/currently unavailable/);
 const selected=syncInterruptionCopy('selected');assert.match(selected.summary,/local selection verified/);assert.match(selected.description,/original startup flow still opens it/);assert.match(selected.description,/does not repeat recovery or prove whole-archive recovery or cloud synchronization/);
});

for(const state of ['prepared','outcome-unknown','finishing'])test(`${state} discloses unavailable original accounting and deadline without recovery actions`,()=>{
 for(const language of ['en','zh-CN']){const view=syncInterruptionCopy(state,{language});assert.match(view.description,language==='en'?/original cumulative work accounting and deadline are unavailable/:/原累计工作量与截止时间不可用|无法核对原累计工作量与截止时间/);assert.match(view.boundary,language==='en'?/does not retry, cancel, reload the app or change permissions/:/不会重试、取消、重载应用或更改权限/);}
});

test('mount is inert and first in Data; the sole explicit action uses the default read-only worker command',async()=>{
 const f=fixture({defaultRequest:true});try{
  assert.equal(f.calls.length,0);assert.deepEqual(f.group.children,[f.heading,f.detail.row,f.existing]);assert.equal(f.mounted.id,'settings-sync');assert.equal(f.mounted.beforeClose,undefined,'no alternate close guard');assert.equal(f.refresh.type,'button');assert.equal(f.refresh.style.minHeight,'44px');assert.equal(f.status.getAttribute('role'),'status');assert.equal(f.status.getAttribute('aria-live'),'polite');assert.equal(f.refresh.getAttribute('aria-describedby'),f.boundary.id);
  f.open();f.open();assert.equal(f.calls.length,1,'already-open detail does not repeat read');assert.deepEqual(f.calls[0].message,{type:'PAIA_GENERATION_STATUS'});assert.equal(f.content.getAttribute('aria-busy'),'true');
  f.resolve(0,'unavailable');await tick();assert.equal(f.status.textContent,'Sync unavailable');assert.equal(f.content.getAttribute('aria-busy'),'false');
  f.refresh.dispatch('click');assert.equal(f.calls.length,2);f.resolve(1,'not-prepared');await tick();assert.match(f.status.textContent,/No prepared local recovery/);await tick();assert.equal(f.calls.length,2,'settlement does not poll');
  assert.deepEqual(f.calls.map(call=>call.message),[{type:'PAIA_GENERATION_STATUS'},{type:'PAIA_GENERATION_STATUS'}]);
 }finally{f.restore();}
});

test('singleflight coalesces repeated refresh controls until actual settlement and ignores capability fields',async()=>{
 const f=fixture();try{
  f.open();f.refresh.dispatch('click');await f.detail.refresh();f.open();assert.equal(f.calls.length,1);assert.equal(f.refresh.disabled,true);assert.equal(f.refresh.textContent,'Reading status…');
  f.doc.documentElement.lang='zh-CN';f.doc.dispatch('paia:preferences-applied');assert.equal(f.refresh.textContent,'正在读取状态…');assert.equal(f.refresh.disabled,true);assert.equal(f.calls.length,1);
  f.doc.documentElement.lang='en';f.detail.sync();f.resolve(0,'outcome-unknown',{canActivate:true,canContinue:true,canRestart:true,reloadRequired:true,operationId:'PRIVATE_OPERATION',body:'PRIVATE_BODY'});await tick();
  assert.match(f.status.textContent,/outcome unknown/);assert.doesNotMatch(f.content.textContent,/PRIVATE_/);assert.equal(f.content.children.filter(node=>node.tagName==='button').length,1);assert.equal(f.refresh.disabled,false);assert.equal(f.refresh.textContent,'Refresh status');assert.equal(f.content.getAttribute('aria-busy'),'false');assert.equal(f.calls.length,1,'settlement does not auto-request');
  const next=f.detail.refresh();assert.equal(f.calls.length,2);f.resolve(1,'prepared');await next;assert.match(f.status.textContent,/incomplete: prepared/);assert.equal(f.refresh.disabled,false);
  assert.deepEqual(f.calls.map(call=>call.message),[{type:'PAIA_GENERATION_STATUS'},{type:'PAIA_GENERATION_STATUS'}]);
 }finally{f.restore();}
});

test('failed refresh preserves UNKNOWN only as a labeled last observation and never releases or repeats it',async()=>{
 const f=fixture();try{
  f.open();f.resolve(0,'outcome-unknown');await tick();f.refresh.dispatch('click');assert.match(f.status.textContent,/last observed: Local recovery outcome unknown/);
  f.calls[1].reject(Error('PRIVATE_FAILURE'));await tick();assert.match(f.status.textContent,/Current status unavailable; last observed \(not a current confirmation\): Local recovery outcome unknown/);assert.match(f.description.textContent,/not success or failure/);assert.doesNotMatch(f.content.textContent,/PRIVATE_FAILURE/);assert.equal(f.calls.length,2);
 }finally{f.restore();}
});

test('a later unavailable observation does not erase a prior UNKNOWN or invent a missing-capability cause',async()=>{
 const f=fixture();try{
  f.open();f.resolve(0,'outcome-unknown');await tick();f.refresh.dispatch('click');f.resolve(1,'unavailable');await tick();
  assert.match(f.status.textContent,/Sync unavailable; last observed \(not a current confirmation\): Local recovery outcome unknown/);assert.match(f.description.textContent,/preserves that unknown outcome/);assert.equal(f.calls.length,2);
  assert.doesNotMatch(syncInterruptionCopy('unavailable').description,/not enabled|missing database|signed out/);
 }finally{f.restore();}
});

test('a malformed first response stays unavailable rather than asserting no pending operation',async()=>{
 const f=fixture();try{f.open();f.calls[0].resolve({ok:true,result:{version:1,state:'selected'}});await tick();assert.equal(f.status.textContent,'Current status unavailable');assert.match(f.description.textContent,/outcome cannot be determined/);assert.doesNotMatch(f.status.textContent,/No prepared|verified/);assert.equal(f.calls.length,1);}finally{f.restore();}
});

test('singleflight Close and reopening keep one physical request without painting its stale result',async()=>{
 const f=fixture();try{
  f.open();f.detail.dialog.close();f.open();f.refresh.dispatch('click');await f.detail.refresh();assert.equal(f.calls.length,1);assert.equal(f.refresh.disabled,true);assert.equal(f.content.getAttribute('aria-busy'),'true');assert.equal(f.status.textContent,'Previous status read still running');assert.match(f.description.textContent,/No new request was sent/);
  f.resolve(0,'selected');await tick();assert.equal(f.status.textContent,'Read-only status');assert.equal(f.refresh.disabled,false);assert.equal(f.calls.length,1,'stale settlement does not create a replacement request');
  const next=f.detail.refresh();assert.equal(f.calls.length,2);f.resolve(1,'prepared');await next;assert.match(f.status.textContent,/incomplete: prepared/);
  f.detail.dialog.close();await f.detail.refresh();assert.equal(f.calls.length,2,'closed refresh is inert');assert.equal(f.status.textContent,'Read-only status');
 }finally{f.restore();}
});

for(const target of ['panel','group','dialog'])test(`hiding ${target} closes through the original owner and invalidates a pending observation`,async()=>{
 const f=fixture();try{
  f.open();(target==='dialog'?f.detail.dialog:f[target]).hidden=true;f.flush();assert.equal(f.detail.dialog.open,false);f.resolve(0,'selected');await tick();assert.equal(f.status.textContent,'Read-only status');assert.equal(f.calls.length,1);
 }finally{f.restore();}
});

for(const target of ['panel','group','dialog'])test(`a ${target} hide/show before observer delivery still invalidates an old response`,async()=>{
 const f=fixture();try{
  f.open();const node=target==='dialog'?f.detail.dialog:f[target];node.hidden=true;node.hidden=false;f.resolve(0,'selected');await tick();assert.equal(f.status.textContent,'Read-only status');assert.equal(f.calls.length,1);
  const next=f.detail.refresh();f.resolve(1,'finishing');await next;assert.match(f.status.textContent,/completion unconfirmed/);
 }finally{f.restore();}
});

test('document visibility and native Escape invalidate pending work without intercepting dismissal',async()=>{
 const f=fixture();try{
  f.open();f.doc.hidden=true;f.doc.dispatch('visibilitychange');f.doc.hidden=false;f.resolve(0,'selected');await tick();assert.equal(f.status.textContent,'Read-only status');assert.equal(f.calls.length,1);
  const next=f.detail.refresh();let prevented=0;f.detail.dialog.dispatch('cancel',{preventDefault:()=>prevented++});f.resolve(1,'selected');await next;assert.equal(prevented,0);assert.equal(f.status.textContent,'Read-only status');assert.equal(f.calls.length,2);
 }finally{f.restore();}
});

test('language changes render local copy without reading, resetting UNKNOWN or taking focus',async()=>{
 const f=fixture();try{
  f.open();f.resolve(0,'outcome-unknown');await tick();f.doc.documentElement.lang='zh-CN';f.doc.dispatch('paia:preferences-applied');assert.equal(f.status.textContent,'本机恢复结果尚未确认');assert.equal(f.refresh.textContent,'刷新状态');assert.match(f.detail.row.textContent,/同步/);assert.equal(f.calls.length,1);
  f.doc.documentElement.lang='en';f.detail.sync();assert.match(f.status.textContent,/outcome unknown/);assert.equal(f.calls.length,1);
 }finally{f.restore();}
});

test('the tiny Settings integration delegates to the existing modal owner; the new module has no writes or timers',async()=>{
 const [settings,source]=await Promise.all([readFile(new URL('../ui/settings-details.js',import.meta.url),'utf8'),readFile(new URL('../ui/settings-sync-recovery.js',import.meta.url),'utf8')]);
 assert.match(settings,/import \{createSettingsSyncRecovery\} from '\.\/settings-sync-recovery\.js'/);assert.match(settings,/createSettingsSyncRecovery\(\{dataGroup,language,mountDetail:mountSettingsDetail\}\)/);assert.match(settings,/\[syncDetail,storageDetail/);assert.match(settings,/installSettingsDialogKeyboard\(dialog\)/);
 assert.deepEqual([...source.matchAll(/type:'([^']+)'/g)].map(match=>match[1]),['PAIA_GENERATION_STATUS']);assert.doesNotMatch(source,/setTimeout|setInterval|location\.reload|storage\.|fetch\(|PAIA_GENERATION_(?:ACTIVATE|PREPARE|CONTINUE|CANCEL|RESTART)/);
});


test('prepared receipt copy does not infer interruption or successful recovery',()=>{
 const english=syncInterruptionCopy('prepared'),chinese=syncInterruptionCopy('prepared',{language:'zh-CN'});
 assert.equal(english.summary,'Local recovery incomplete: prepared');assert.equal(chinese.summary,'本机恢复尚未完成：已准备');
 assert.doesNotMatch(english.summary,/interrupted|recovered|synchronized/);assert.doesNotMatch(chinese.summary,/中断|已恢复|已同步/);
 assert.match(english.description,/original cumulative work accounting and deadline are unavailable/);assert.match(chinese.description,/无法核对原累计工作量与截止时间/);
});


for(const target of ['panel','group','dialog'])test(`singleflight ${target} hide invalidates presentation but holds the physical read through rejection`,async()=>{
 const f=fixture();try{
  f.open();const node=target==='dialog'?f.detail.dialog:f[target];node.hidden=true;f.flush();assert.equal(f.detail.dialog.open,false);assert.equal(f.refresh.disabled,true);
  node.hidden=false;f.open();f.refresh.dispatch('click');await f.detail.refresh();assert.equal(f.calls.length,1);assert.equal(f.refresh.disabled,true);assert.equal(f.status.textContent,'Previous status read still running');
  f.calls[0].reject(Error('PRIVATE_STALE_FAILURE'));await tick();assert.equal(f.calls.length,1);assert.equal(f.refresh.disabled,false);assert.equal(f.status.textContent,'Read-only status');assert.doesNotMatch(f.content.textContent,/PRIVATE_STALE_FAILURE|Current status unavailable/);
  const next=f.detail.refresh();assert.equal(f.calls.length,2);f.resolve(1,'outcome-unknown');await next;assert.match(f.status.textContent,/outcome unknown/);assert.equal(f.refresh.disabled,false);
 }finally{f.restore();}
});
