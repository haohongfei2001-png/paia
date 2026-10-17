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

test('approved single-expression row keeps only More while retaining original management actions',async()=>{
 const css=await readFile(new URL('../ui/prompt-surface.css',import.meta.url),'utf8');
 assert.match(css,/\.row\{[^}]*display:flex;align-items:stretch;padding:0 4px\}/);
 assert.match(css,/#list\{[^}]*padding:1px 7px/);assert.match(css,/\.insert\{[^}]*padding:11px 6px/);
 assert.equal(1+7+4+6,18,'outer border + list + row + native insertion padding matches original reference');
 assert.match(css,/\.grip\{position:static;flex:0 0 22px/);assert.doesNotMatch(css,/\.grip\{position:absolute/);
 assert.match(css,/\.grip\{flex-basis:44px;width:44px;min-width:44px;opacity:1/);
 assert.match(css,/\.more,\.edit-shortcut,\.copy-shortcut\{flex:0 0 28px/);
 assert.match(source,/row\.append\(insertButton,more\)/);assert.match(source,/tools\.append\(button\('核对全文'/);assert.match(source,/button\('编辑'/);assert.match(source,/button\(item\.pinned/);
 assert.match(source,/tools\.append\(dragHandle\(item,row\)\)/);
 assert.match(css,/\.row:hover :is\(\.more,\.edit-shortcut,\.copy-shortcut,\.grip\)/);
});

test('three-form static labels localize on their original nodes while the capsule expression and expand glyph stay exact',()=>{
 const previous=globalThis.document,body=new Node('body'),nodes=new Map(),expression=new Node('span'),expand=new Node('button');expression.textContent='SYNTHETIC 原样表达 👩‍💻';const capsuleMark=new Node('svg');expand.append(capsuleMark);body.append(expression,expand);nodes.set('#capsule-text',expression);nodes.set('#capsule-expand',expand);
 const document={body,documentElement:new Node('html'),createElementNS:(ns,tag)=>new Node(tag,ns),querySelector(selector){if(!nodes.has(selector)){const n=new Node('button');body.append(n);nodes.set(selector,n);}return nodes.get(selector);},getElementById(id){return this.querySelector('#'+id);}};globalThis.document=document;
 try{const context=vm.createContext({document,createIcon,navigator:{language:'zh-CN'},matchMedia:()=>({matches:false,addEventListener(){}}),resolveLanguage:x=>x,resolveAppearance:x=>x,scheduleLayout(){}});vm.runInContext(source.slice(source.indexOf('const copy={'),source.indexOf('\nasync function rpc(')),context);const original=new Map(nodes);
  for(const [language,labels]of [['en',['Long expressions','Collapse to capsule','Collapse to orb','Frequent expression','Expand frequent expressions']],['zh-CN',['较长的常用表达','收起为胶囊','收起为圆球','常用表达','展开常用表达']]]){vm.runInContext(`applyDisplay({language:${JSON.stringify(language)},appearance:'light'})`,context);for(const [i,selector]of ['#long-expressions','#collapse-capsule','#collapse-orb','#capsule','#capsule-expand'].entries()){assert.equal(nodes.get(selector),original.get(selector),'language changes retain original static control identity');assert.equal(i<3?nodes.get(selector).textContent:nodes.get(selector).getAttribute('aria-label'),labels[i]);}assert.equal(expression.textContent,'SYNTHETIC 原样表达 👩‍💻');assert.equal(nodes.get('#capsule-text'),expression);assert.equal(expand.firstElementChild,capsuleMark);assert.equal(expand.getAttribute('title'),labels[4]);}
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});

test('the original product link keeps normal-text AA on the approved solid light and dark panels',async()=>{
 const css=await readFile(new URL('../ui/prompt-surface.css',import.meta.url),'utf8'),host=await readFile(new URL('../content/prompt-surface.js',import.meta.url),'utf8');
 const rgb=hex=>[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)),luminance=rgb=>rgb.map(value=>value/255).reduce((sum,value,i)=>sum+[.2126,.7152,.0722][i]*(value<=.04045?value/12.92:((value+.055)/1.055)**2.4),0);
 assert.match(css,/#surface-tools #open-paia\{color:var\(--action\);/,'the actual product action outranks the general muted role');
 assert.doesNotMatch(host,/backdrop-filter|linear-gradient|radial-gradient/);
 for(const theme of ['light','dark']){
  const block=theme==='light'?css.slice(0,css.indexOf('}')):css.match(/:root\[data-paia-theme=dark\]\{([^}]+)\}/)[1];
  const ink=luminance(rgb(block.match(/--action:#([a-f0-9]{6})/)[1])),panel=luminance(rgb(block.match(/--panel:#([a-f0-9]{6})/)[1]));
  assert.ok((Math.max(ink,panel)+.05)/(Math.min(ink,panel)+.05)>=4.5,theme+' product action AA');
 }
});
