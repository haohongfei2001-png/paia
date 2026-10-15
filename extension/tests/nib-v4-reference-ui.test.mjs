import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {createIcon} from '../ui/icons.js';
import {PresentationNode as Node} from './harness/presentation-dom.mjs';
const source=await readFile(new URL('../ui/prompt-surface.js',import.meta.url),'utf8');

test('approved search glyph keeps the original localized accessible control through language changes',()=>{
 const previous=globalThis.document,body=new Node('body'),nodes=new Map();
 const document={body,documentElement:new Node('html'),createElementNS:(ns,tag)=>new Node(tag,ns),querySelector(selector){if(!nodes.has(selector)){const node=new Node('button');body.append(node);nodes.set(selector,node);}return nodes.get(selector);},getElementById(id){return this.querySelector('#'+id);}};
 globalThis.document=document;
 try{
  const context=vm.createContext({document,createIcon,navigator:{language:'zh-CN'},matchMedia:()=>({matches:false,addEventListener(){}}),resolveLanguage:x=>x,resolveAppearance:x=>x,scheduleLayout(){}});
  vm.runInContext(source.slice(source.indexOf('const copy={'),source.indexOf('\nasync function rpc(')),context);
  const search=nodes.get('#open-search'),glyph=search.firstElementChild;
  assert.equal(glyph.dataset.paiaIcon,'search');assert.equal(glyph.getAttribute('aria-hidden'),'true');assert.equal(search.getAttribute('aria-label'),'搜索全部档案');assert.equal(search.textContent,'');
  vm.runInContext("applyDisplay({language:'en',appearance:'dark'})",context);
  assert.equal(search.getAttribute('aria-label'),'Search all Archive Inputs');assert.equal(search.firstElementChild,glyph);assert.equal(search.children.length,1);
  vm.runInContext("applyDisplay({language:'zh-CN',appearance:'light'})",context);
  assert.equal(search.getAttribute('aria-label'),'搜索全部档案');assert.equal(search.firstElementChild,glyph);
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});

test('approved text axis leaves original reorder and every row action in a non-overlapping flex rail',async()=>{
 const css=await readFile(new URL('../ui/prompt-surface.css',import.meta.url),'utf8');
 assert.match(css,/\.row\{[^}]*display:flex;align-items:stretch;padding:0 4px\}/);
 assert.match(css,/#list\{[^}]*padding:1px 7px/);assert.match(css,/\.insert\{[^}]*padding:11px 6px/);
 assert.equal(1+7+4+6,18,'outer border + list + row + native insertion padding matches original reference');
 assert.match(css,/\.grip\{position:static;flex:0 0 22px/);assert.doesNotMatch(css,/\.grip\{position:absolute/);
 assert.match(css,/\.grip\{flex-basis:44px;width:44px;min-width:44px;opacity:1/);
 assert.match(css,/\.more,\.edit-shortcut,\.copy-shortcut\{flex:0 0 28px/);
 assert.match(source,/row\.append\(insertButton,[^\n]*dragHandle\(item,row,true\)[^\n]*copyButton,editButton,more\)/);
 assert.match(source,/tools\.append\(dragHandle\(item,row\)\)/);
 assert.match(css,/\.row:hover :is\(\.more,\.edit-shortcut,\.copy-shortcut,\.grip\)/);
});
