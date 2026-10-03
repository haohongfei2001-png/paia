import test from 'node:test';
import assert from 'node:assert/strict';
import {OriginalSurface} from '../ui/original-surface.js';
class Node{constructor(tag){this.tagName=tag;this.children=[];this.hidden=false;this.dataset={};this.attributes={};this.textContent='';}append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=[...nodes];}setAttribute(name,value){this.attributes[name]=value;}}
const one={id:'SYNTHETIC_SOURCE',originalText:'SYNTHETIC exact original 👩‍💻',sourceSentAt:'2023-04-27T22:11:00Z'};
for(const [name,kind,page,quiet,copyAllowed]of [
 ['one complete Input','input',{availability:'available',records:[one],intended:1,nextCursor:null},true,true],
 ['one complete Conversation','conversation',{availability:'available',records:[one],intended:1,nextCursor:null},false,true],
 ['partial Input','input',{availability:'partial',records:[one],intended:1,nextCursor:null},false,false],
 ['unavailable Input','input',{availability:'unavailable',records:[],intended:1,nextCursor:null},false,false],
 ['multi-Source Input','input',{availability:'available',records:[one,{...one,id:'SYNTHETIC_SECOND'}],intended:2,nextCursor:null},false,true],
 ['Input with next page','input',{availability:'available',records:[one],intended:1,nextCursor:{after:1}},false,true]
])test(`D5 Original quiet presentation keeps scope and copy authority: ${name}`,async()=>{
 const prior=globalThis.document;globalThis.document={createElement:tag=>new Node(tag),documentElement:{lang:'zh-CN'}};
 try{
  const content=new Node('div'),heading=new Node('h2'),close=new Node('button'),dialog={dataset:{},querySelector:selector=>selector==='h2'?heading:close},readCalls=[];
  const surface=new OriginalSurface({dialog,content,host:{open:()=>()=>true},read:async request=>{readCalls.push(request);return {generation:4,...page};}});
  await surface.open({kind,ref:'SYNTHETIC_INPUT'},null);
  const [rows,status,controls,copy]=content.children;
  assert.equal(controls.hidden,quiet);assert.equal(copy.disabled,!copyAllowed);assert.equal(readCalls.length,1);assert.deepEqual(readCalls[0].target,{kind,ref:'SYNTHETIC_INPUT'});
  assert.equal(status.textContent.includes('所选输入的原始文字 · 只读'),quiet);
  if(page.records.length)assert.equal(rows.children[0].children[1].textContent,one.originalText,'quiet chrome never modifies immutable text');
  if(page.availability!=='available')assert.match(status.textContent,/不可用/,'missing Source remains explicit');
  if(kind==='conversation')assert.match(controls.children[1].textContent,/共 1 条原始输入/,'complete Conversation coverage remains visible');
 }finally{globalThis.document=prior;}
});
