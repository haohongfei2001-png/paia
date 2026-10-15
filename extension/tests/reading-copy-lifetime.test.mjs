import test from 'node:test';
import assert from 'node:assert/strict';
import {copyReadingText} from '../ui/reading-actions.js';
import {ReaderExperience} from '../ui/reader-experience.js';
class Node extends EventTarget{
 constructor(tag){super();this.tag=tag;this.children=[];this.open=false;this.value='';}
 append(...nodes){this.children.push(...nodes);for(const n of nodes)n.parent=this;}
 setAttribute(){} showModal(){this.open=true;} focus(){} select(){}
 close(){this.open=false;this.dispatchEvent(new Event('close'));}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);}
}
function setup(t){
 const oldDoc=Object.getOwnPropertyDescriptor(globalThis,'document'),oldNav=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 const body=new Node('body'),document={body,hidden:false,createElement:tag=>new Node(tag)};let reject,resolve,calls=0;
 Object.defineProperty(globalThis,'document',{configurable:true,value:document});Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:()=>{calls++;return new Promise((a,b)=>{resolve=a;reject=b;});}}}});
 t.after(()=>{for(const [name,d]of [['document',oldDoc],['navigator',oldNav]])if(d)Object.defineProperty(globalThis,name,d);else delete globalThis[name];});
 return {body,document,reject:()=>reject(Error('denied')),resolve:()=>resolve(),calls:()=>calls};
}
test('aborted pending clipboard cannot recreate a private fallback; pre-abort dispatches nothing',async t=>{
 const h=setup(t),controller=new AbortController(),pending=copyReadingText('private',{signal:controller.signal});controller.abort();h.reject();assert.equal(await pending,false);assert.equal(h.body.children.length,0);await copyReadingText('private',{signal:controller.signal});assert.equal(h.calls(),1);
});
test('current manual fallback retains exact Unicode and clears retained textarea on abort',async t=>{
 const h=setup(t),controller=new AbortController(),text='一\n\n🧠\u200b end ',pending=copyReadingText(text,{signal:controller.signal});h.reject();assert.equal(await pending,false);const dialog=h.body.children[0],field=dialog.children.find(n=>n.tag==='textarea');assert.equal(field.value,text);assert.equal(dialog.open,true);controller.abort();assert.equal(field.value,'');assert.equal(dialog.open,false);assert.equal(h.body.children.length,0);
});
test('reader copy checks current editor identity even without a route event',async t=>{
 const h=setup(t);let state={editor:{},view:'library',documentId:'doc'};const reader=Object.assign(Object.create(ReaderExperience.prototype),{active:true,read:()=>state});const pending=reader.copyText('private');state={...state,editor:{}};h.reject();assert.equal(await pending,false);assert.equal(h.body.children.length,0);
});
test('reader newer copy retires an open fallback; unmount prevents late fallback',async t=>{
 const h=setup(t),state={editor:{},view:'library',documentId:'doc'},reader=Object.assign(Object.create(ReaderExperience.prototype),{active:true,read:()=>state,toolbar:{},expanded:new Set()});const first=reader.copyText('old');h.reject();await first;const field=h.body.children[0].children.find(n=>n.tag==='textarea');const next=reader.copyText('new');assert.equal(field.value,'');assert.equal(h.body.children.length,0);reader.unmount();h.reject();assert.equal(await next,false);assert.equal(h.body.children.length,0);
});

test('composition in progress prevents both late fallback and a new clipboard request',async t=>{
 const h=setup(t),state={editor:{composing:false},view:'library',documentId:'doc'},reader=Object.assign(Object.create(ReaderExperience.prototype),{active:true,read:()=>state});const pending=reader.copyText('private');state.editor.composing=true;h.reject();assert.equal(await pending,false);assert.equal(h.body.children.length,0);assert.equal(await reader.copyText('private'),false);assert.equal(h.calls(),1);
});
