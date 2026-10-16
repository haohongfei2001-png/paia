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
 const previous=globalThis.document,body=new Node('body'),nodes=new Map(),expression=new Node('span'),expand=new Node('button');expression.textContent='SYNTHETIC 原样表达 👩‍💻';expand.textContent='⌃';body.append(expression,expand);nodes.set('#capsule-text',expression);nodes.set('#capsule-expand',expand);
 const document={body,documentElement:new Node('html'),createElementNS:(ns,tag)=>new Node(tag,ns),querySelector(selector){if(!nodes.has(selector)){const n=new Node('button');body.append(n);nodes.set(selector,n);}return nodes.get(selector);},getElementById(id){return this.querySelector('#'+id);}};globalThis.document=document;
 try{const context=vm.createContext({document,createIcon,navigator:{language:'zh-CN'},matchMedia:()=>({matches:false,addEventListener(){}}),resolveLanguage:x=>x,resolveAppearance:x=>x,scheduleLayout(){}});vm.runInContext(source.slice(source.indexOf('const copy={'),source.indexOf('\nasync function rpc(')),context);const original=new Map(nodes);
  for(const [language,labels]of [['en',['Long expressions','Collapse to capsule','Collapse to orb','Frequent expression','Expand frequent inputs']],['zh-CN',['较长的常用表达','收起为胶囊','收起为圆球','常用表达','展开常用输入']]]){vm.runInContext(`applyDisplay({language:${JSON.stringify(language)},appearance:'light'})`,context);for(const [i,selector]of ['#long-expressions','#collapse-capsule','#collapse-orb','#capsule','#capsule-expand'].entries()){assert.equal(nodes.get(selector),original.get(selector),'language changes retain original static control identity');assert.equal(i<3?nodes.get(selector).textContent:nodes.get(selector).getAttribute('aria-label'),labels[i]);}assert.equal(expression.textContent,'SYNTHETIC 原样表达 👩‍💻');assert.equal(nodes.get('#capsule-text'),expression);assert.equal(expand.textContent,'⌃');}
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});

test('the original product link keeps normal-text AA on real frosted stops and intervening gradients over dark and light hosts',async()=>{
 const css=await readFile(new URL('../ui/prompt-surface.css',import.meta.url),'utf8'),host=await readFile(new URL('../content/prompt-surface.js',import.meta.url),'utf8');
 const rgb=hex=>[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)),luminance=rgb=>rgb.map(value=>value/255).reduce((sum,value,i)=>sum+[.2126,.7152,.0722][i]*(value<=.04045?value/12.92:((value+.055)/1.055)**2.4),0);
 assert.match(css,/#surface-tools #open-paia\{color:var\(--action\);/,'the actual product action outranks the general #surface-tools button muted role');
 for(const [theme,pattern]of [['light',/iframe\{[^}]*background:linear-gradient\(([^;]+)\)/],['dark',/:host\(\[data-theme=dark\]\) iframe\{[^}]*background:linear-gradient\(([^;]+)\)/]]){
  const block=theme==='light'?css.slice(0,css.indexOf('}')):css.match(/:root\[data-paia-theme=dark\]\{([^}]+)\}/)[1],foreground=rgb(block.match(/--action:#([a-f0-9]{6})/)[1]),gradient=host.match(pattern)[1],stops=[...gradient.matchAll(/#([a-f0-9]{6})([a-f0-9]{2})?/g)].map(([,hex,opacity])=>({color:rgb(hex),alpha:opacity?parseInt(opacity,16)/255:1}));assert.equal(stops.length,3);
  // Premultiplied sRGB interpolation matches this legacy CSS gradient. Black
  // and white bound every host channel; intermediate grays also exercise the
  // continuous gradient, without whitening or making the real glass opaque.
  for(let segment=0;segment<stops.length-1;segment++)for(let step=0;step<=100;step++){
   const fraction=step/100,a=stops[segment],b=stops[segment+1],alpha=a.alpha*(1-fraction)+b.alpha*fraction,premultiplied=a.color.map((value,i)=>value*a.alpha*(1-fraction)+b.color[i]*b.alpha*fraction);
   for(const hostChannel of [0,64,128,192,255]){const background=premultiplied.map(value=>value+hostChannel*(1-alpha)),ink=luminance(foreground),panel=luminance(background),ratio=(Math.max(ink,panel)+.05)/(Math.min(ink,panel)+.05);assert.ok(ratio>=4.5,`${theme} product link gradient ${segment}/${step} over host ${hostChannel}: ${ratio}`);}
  }
 }
});
