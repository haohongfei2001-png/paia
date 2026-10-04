import test from 'node:test';
import assert from 'node:assert/strict';
import {mountContextWorkspacePreview} from '../ui/context-workspace-presentation.js';

// A DOM identity harness, not rendering/browser evidence.
class Node {
 constructor(tag='#text',text=''){this.tagName=tag.toUpperCase();this.childNodes=[];this.parentElement=null;this.dataset={};this.attributes={};this.listeners=new Map();this._text=text;this.className='';this.value='';this.hidden=false;this.classList={add:(...names)=>{this.className=[this.className,...names].filter(Boolean).join(' ');}};}
 get children(){return this.childNodes.filter(n=>n.tagName!=='#TEXT');}
 get firstChild(){return this.childNodes[0]||null;}
 get textContent(){return this.tagName==='#TEXT'?this._text:this.childNodes.map(n=>n.textContent).join('');}
 set textContent(text){if(this.tagName==='#TEXT')this._text=String(text);else this.replaceChildren(new Node('#text',String(text)));}
 append(...nodes){for(const node of nodes){node.remove();node.parentElement=this;this.childNodes.push(node);}}
 prepend(...nodes){for(const node of [...nodes].reverse()){node.remove();node.parentElement=this;this.childNodes.unshift(node);}}
 replaceChildren(...nodes){for(const node of this.childNodes)node.parentElement=null;this.childNodes=[];this.append(...nodes);}
 remove(){if(this.parentElement)this.parentElement.childNodes=this.parentElement.childNodes.filter(n=>n!==this);this.parentElement=null;}
 replaceWith(node){const parent=this.parentElement;if(!parent)return;const index=parent.childNodes.indexOf(this);node.remove();parent.childNodes[index]=node;node.parentElement=parent;this.parentElement=null;}
 setAttribute(name,value){this.attributes[name]=String(value);if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(value);}
 removeAttribute(name){delete this.attributes[name];}
 getAttribute(name){return this.attributes[name]??null;}
 addEventListener(type,fn){const list=this.listeners.get(type)||[];list.push(fn);this.listeners.set(type,list);}
 async fire(type){for(const fn of this.listeners.get(type)||[])await fn({target:this});if(this.parentElement)await this.parentElement.fire(type);}
 matches(selector){
  if(selector.endsWith(':last-child'))return this===this.parentElement?.children.at(-1)&&this.matches(selector.slice(0,-11));
  if(selector.endsWith(':focus'))return this===document.activeElement&&this.matches(selector.slice(0,-6));
  if(selector.startsWith('.'))return this.className.split(' ').includes(selector.slice(1));
  if(selector.startsWith('#'))return this.id===selector.slice(1);
  if(selector.startsWith('[')){const [,name,quoted,value]=selector.match(/^\[([^=\]]+)(?:=(['"]?)(.*?)\2)?\]$/)||[];let actual=name?.startsWith('data-')?this.dataset[name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]:this.getAttribute(name);return value===undefined?actual!==undefined&&actual!==null:actual===value;}
  return this.tagName===selector.toUpperCase();
 }
 querySelectorAll(selector){const matches=[],selectors=selector.split(',');const visit=node=>{for(const child of node.children){if(selectors.some(s=>child.matches(s)))matches.push(child);visit(child);}};visit(this);return matches;}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 focus(){document.activeElement=this;}
 setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end;}
}

function withPreview(run){
 const names=['document','chrome'],saved=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
 const body=new Node('body'),host=new Node('section'),headerHost=new Node('header');body.append(headerHost,host);
 globalThis.document={body,documentElement:{lang:'zh-CN'},activeElement:null,createElement:tag=>new Node(tag)};
 globalThis.chrome=new Proxy({}, {get(){throw Error('Design preview must not access extension APIs');}});
 const model={purpose:'Synthetic design task',materials:[{id:'first',title:'Synthetic title',body:'Synthetic selected passage',meta:'Synthetic source label'}],suggestions:[{id:'extra',body:'Synthetic suggested passage'}],output:{purpose:'Synthetic output purpose',sections:[{title:'Synthetic section',paragraphs:['Exact first paragraph','Exact second paragraph'],meta:'Synthetic provenance'}]}};
 try{return run({host,headerHost,model,preview:mountContextWorkspacePreview({host,headerHost,model})});}
 finally{for(const name of names){const descriptor=saved.get(name);if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}}
}

test('Context design pages switch presentation only and never mark a task complete',()=>withPreview(({preview,model})=>{
 const snapshot=JSON.stringify(model),root=preview.root,purpose=root.querySelector('textarea');assert.equal(purpose.readOnly,true);assert.equal(purpose.value,model.purpose);
 for(const stage of ['task','select','retrieve','review','ready']){
  assert.equal(preview.setStage('context-'+stage),stage);assert.equal(root.dataset.contextStep,stage);assert.equal(root.querySelectorAll('[data-context-panel]').filter(node=>!node.hidden).length,1);assert.equal(root.querySelectorAll('[aria-current="page"]').length,1);assert.equal(root.querySelectorAll('[aria-current="step"]').length,0);
 }
 assert.equal(root.querySelector('textarea'),purpose);assert.equal(JSON.stringify(model),snapshot);assert.match(root.textContent,/设计预览/);assert.match(root.textContent,/均未开放/);assert.match(root.textContent,/Exact first paragraph/);assert.match(root.textContent,/Exact second paragraph/);
}));

test('Every displayed business action is disabled and has no behavior handler',()=>withPreview(({preview})=>{
 const actions=[...preview.root.querySelectorAll('[data-preview-action]'),...preview.header.querySelectorAll('[data-preview-action]')];assert.ok(actions.length>8);
 for(const action of actions){assert.equal(action.disabled,true);assert.equal(action.listeners.has('click'),false);assert.match(action.title,/功能尚未开放/);}
 assert.equal(preview.root.querySelectorAll('input').every(input=>input.disabled),true);assert.equal(preview.root.querySelectorAll('input').filter(input=>input.type==='checkbox').some(input=>input.checked===false),true);
}));

test('Invalid preview page cannot change the view; disposal removes the entire isolated surface',()=>withPreview(({preview,host,headerHost})=>{
 assert.throws(()=>preview.setStage('not-a-page'),RangeError);assert.equal(preview.root.dataset.contextStep,'task');assert.equal(host.firstChild,preview.root);assert.equal(headerHost.firstChild,preview.header);preview.dispose();assert.equal(host.children.length,0);assert.equal(headerHost.children.length,0);
}));
