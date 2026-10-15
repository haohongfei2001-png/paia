import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PresentationNode} from './harness/presentation-dom.mjs';
import {ContextScopePreview} from '../ui/context-scope-preview.js';
import {ContextItemBasis} from '../ui/context-item-basis.js';
import {ContextTopicViewer} from '../ui/context-topic-viewer.js';
class Node extends PresentationNode{showModal(){this.open=true;}close(){this.open=false;}}
test('all real Context drawer owners retain a header, independently scrolling middle, and footer',()=>{
 const prior=Object.getOwnPropertyDescriptor(globalThis,'document');globalThis.document={documentElement:{lang:'en'},hidden:false,createElement:t=>new Node(t),addEventListener(){},removeEventListener(){}};
 try{for(const Owner of [ContextScopePreview,ContextItemBasis,ContextTopicViewer]){
  let sends=0;const viewer=new Owner({host:new Node('div'),send:async()=>{sends++;throw Error('No implicit reads');},identity:{},topicId:'synthetic',name:'Synthetic Topic'});
  assert.ok(viewer.root.classList.contains('context-drawer'));
  assert.equal(viewer.root.children.length,3);const [header,content,footer]=viewer.root.children;
  assert.ok(header.classList.contains('context-drawer-head'));assert.ok(content.classList.contains('context-drawer-content'));assert.ok(footer.classList.contains('context-drawer-footer'));
  assert.ok(content.contains(viewer.body));assert.ok(content.contains(viewer.status));assert.ok(header.contains(viewer.back));assert.equal(sends,0);assert.equal(viewer.root.open,true);viewer.close();assert.equal(viewer.active,false);
 }}finally{if(prior)Object.defineProperty(globalThis,'document',prior);else delete globalThis.document;}
});
test('drawer cascade declares original breakpoints and never scrolls the full panel',async()=>{
 const css=await readFile(new URL('../ui/context-topic-viewer.css',import.meta.url),'utf8');
 assert.match(css,/\.context-drawer\{[^}]*width:530px;[^}]*overflow:hidden/);
 assert.match(css,/@media\(max-width:760px\)\{\s*\.context-drawer\{width:460px\}/);
 assert.match(css,/@media\(max-width:530px\)\{\s*\.context-drawer\{width:100%\}/);
 assert.match(css,/\.context-drawer-content\{[^}]*overflow-y:auto;[^}]*min-height:0/);
});
