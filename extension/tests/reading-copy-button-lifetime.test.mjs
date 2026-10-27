import test from 'node:test';
import assert from 'node:assert/strict';
import {readingCopyButton} from '../ui/reading-actions.js';

const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
async function settle(){for(let i=0;i<8;i++)await Promise.resolve();}
function fixture(t){
 const originals=new Map(['document','navigator','MutationObserver','addEventListener','removeEventListener'].map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)])),observers=new Set(),windowEvents=new EventTarget();
 const mutation=()=>queueMicrotask(()=>{for(const observer of [...observers])observer.callback([]);});
 class Node extends EventTarget{
  constructor(tag){super();this.tagName=tag.toUpperCase();this.children=[];this.parentElement=null;this.attributes=new Map();this.disabled=false;this.textContent='';this.value='';this.open=false;}
  get isConnected(){return this===body||!!this.parentElement?.isConnected;}
  append(...nodes){for(const node of nodes){node.parentElement?.detach(node);node.parentElement=this;this.children.push(node);}mutation();}
  detach(node){this.children=this.children.filter(child=>child!==node);node.parentElement=null;mutation();}
  remove(){this.parentElement?.detach(this);}
  setAttribute(name,value){this.attributes.set(name,String(value));mutation();}
  getAttribute(name){return this.attributes.get(name)??null;}
  get hidden(){return this.attributes.has('hidden');}
  set hidden(value){if(value)this.attributes.set('hidden','');else this.attributes.delete('hidden');mutation();}
  closest(selector){assert.equal(selector,'[hidden],[inert],dialog:not([open])');for(let node=this;node;node=node.parentElement)if(node.hidden||node.attributes.has('inert')||node.tagName==='DIALOG'&&!node.open)return node;return null;}
  click(){if(!this.disabled)this.dispatchEvent(new Event('click'));}
  showModal(){this.open=true;mutation();}
  close(){if(!this.open)return;this.open=false;this.dispatchEvent(new Event('close'));mutation();}
  focus(){}select(){}
 }
 const body=new Node('body'),document=new EventTarget();Object.assign(document,{body,hidden:false,createElement:tag=>new Node(tag)});
 class Observer{constructor(callback){this.callback=callback;}observe(){observers.add(this);}disconnect(){observers.delete(this);}}
 const writes=[],pending=[];let clipboard=(text)=>{const task=deferred();writes.push(text);pending.push(task);return task.promise;};
 for(const[name,value]of Object.entries({document,navigator:{clipboard:{writeText:text=>clipboard(text)}},MutationObserver:Observer,addEventListener:(...args)=>windowEvents.addEventListener(...args),removeEventListener:(...args)=>windowEvents.removeEventListener(...args)}))Object.defineProperty(globalThis,name,{configurable:true,value});
 t.after(async()=>{windowEvents.dispatchEvent(new Event('pagehide'));await settle();for(const[name,descriptor]of originals)if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];});
 const mount=(read,onError=()=>{})=>{const container=new Node('section'),button=readingCopyButton(read,onError);container.append(button);body.append(container);return {button,container};};
 const dialogs=()=>body.children.filter(node=>node.tagName==='DIALOG');
 return {body,document,writes,pending,observers,mount,dialogs,windowEvents,setClipboard:fn=>{clipboard=text=>{writes.push(text);return fn(text);};}};
}

test('leaving before delayed read resolves never starts a clipboard write',async t=>{
 const h=fixture(t),read=deferred(),{button}=h.mount(()=>read.promise);button.click();button.remove();read.resolve('old private body');await settle();assert.deepEqual(h.writes,[]);assert.equal(h.dialogs().length,0);
});
test('clipboard rejection after departure cannot create a stale manual-copy dialog',async t=>{
 const h=fixture(t),{button}=h.mount(async()=>'old private body');button.click();await settle();assert.equal(h.writes.length,1);button.remove();h.pending[0].reject(Error('denied'));await settle();assert.equal(h.dialogs().length,0);
});
test('already dispatched clipboard write is not claimed recalled after departure',async t=>{
 const h=fixture(t),{button}=h.mount(async()=>'already handed to browser');button.click();await settle();button.remove();h.pending[0].resolve();await settle();assert.deepEqual(h.writes,['already handed to browser']);assert.equal(button.textContent,'复制');assert.equal(h.dialogs().length,0);
});
test('late read failure after departure does not overwrite the new page status',async t=>{
 const h=fixture(t),read=deferred(),errors=[],{button}=h.mount(()=>read.promise,(...args)=>errors.push(args));button.click();button.remove();read.reject(Error('offline'));await settle();assert.deepEqual(errors,[]);assert.deepEqual(h.writes,[]);
});
test('current read error stays actionable and the next click reads fresh text',async t=>{
 const h=fixture(t),errors=[];let reads=0;const {button}=h.mount(async()=>{if(++reads===1)throw Error('offline');return 'fresh exact body';},(...args)=>errors.push(args));button.click();await settle();assert.equal(errors.length,1);assert.match(errors[0][0],/未复制旧文本/);assert.equal(button.disabled,false);button.click();await settle();assert.deepEqual(h.writes,['fresh exact body']);h.pending[0].resolve();await settle();assert.equal(button.textContent,'已复制');
});
test('current manual fallback preserves exact whitespace Unicode and clears on removal',async t=>{
 const h=fixture(t),text=' 一\n\n🧠\u200b code  \r\nend ',{button}=h.mount(async()=>text);button.click();await settle();h.pending[0].reject(Error('denied'));await settle();const dialog=h.dialogs()[0],field=dialog.children.find(node=>node.tagName==='TEXTAREA');assert.equal(field.value,text);assert.equal(dialog.open,true);button.remove();await settle();assert.equal(field.value,'');assert.equal(dialog.open,false);assert.equal(h.dialogs().length,0);assert.equal(h.observers.size,0);
});
test('hiding a still-mounted owner cancels a pending read without clipboard effects',async t=>{
 const h=fixture(t),read=deferred(),{button,container}=h.mount(()=>read.promise);button.click();container.hidden=true;read.resolve('hidden body');await settle();assert.deepEqual(h.writes,[]);assert.equal(button.disabled,false);assert.equal(h.observers.size,0);
});
test('backgrounding closes an existing manual fallback and erases its textarea',async t=>{
 const h=fixture(t),{button}=h.mount(async()=>'background body');button.click();await settle();h.pending[0].reject(Error('denied'));await settle();const field=h.dialogs()[0].children.find(node=>node.tagName==='TEXTAREA');h.document.hidden=true;h.document.dispatchEvent(new Event('visibilitychange'));await settle();assert.equal(field.value,'');assert.equal(h.dialogs().length,0);assert.equal(h.observers.size,0);
});
test('new explicit copy retires prior fallback; stale completion does not touch the newer control',async t=>{
 const h=fixture(t),oldRead=deferred(),old=h.mount(()=>oldRead.promise),next=h.mount(async()=>'new body');old.button.click();next.button.click();oldRead.resolve('old body');await settle();assert.deepEqual(h.writes,['new body']);h.pending[0].reject(Error('denied'));await settle();const field=h.dialogs()[0].children.find(node=>node.tagName==='TEXTAREA');const last=h.mount(async()=>'newer body');last.button.click();await settle();assert.equal(field.value,'');assert.equal(h.dialogs().length,0);assert.deepEqual(h.writes,['new body','newer body']);h.pending[1].resolve();await settle();assert.equal(last.button.textContent,'已复制');
});
test('hidden or detached copy control cannot begin a read; no observer is retained',async t=>{
 const h=fixture(t);let reads=0;const {button,container}=h.mount(async()=>{reads++;return 'never';});container.hidden=true;button.click();await settle();container.hidden=false;button.remove();button.click();await settle();assert.equal(reads,0);assert.deepEqual(h.writes,[]);assert.equal(h.observers.size,0);
});
test('pagehide cancels pending clipboard fallback but does not repeat the browser request',async t=>{
 const h=fixture(t),{button}=h.mount(async()=>'once');button.click();await settle();h.windowEvents.dispatchEvent(new Event('pagehide'));h.pending[0].reject(Error('denied'));await settle();assert.deepEqual(h.writes,['once']);assert.equal(h.dialogs().length,0);assert.equal(h.observers.size,0);
});
