import test from 'node:test';
import assert from 'node:assert/strict';
import {watchThoughtCopy} from '../ui/thought-copy.js';

test('relocated Thought Source controls change locale without translating authored Topic text',()=>{
 const prior=Object.fromEntries(['document','NodeFilter','MutationObserver'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const aiLabel={data:'AI整理 '},aiAttributes={'aria-label':'AI整理'},aiControl={getAttribute:key=>aiAttributes[key]??null,setAttribute:(key,value)=>aiAttributes[key]=value};
 const rootAttributes={'aria-label':'思想库显示'},aiRoot={text:[aiLabel],querySelectorAll:()=>[aiControl],getAttribute:key=>rootAttributes[key]??null,setAttribute:(key,value)=>rootAttributes[key]=value};
 const label={data:'来源'},option={data:'全部来源（含独立写下的内容）'},authored={data:'来源'},attributes={'aria-label':'思想列表来源范围'};
 const field={getAttribute:key=>attributes[key]??null,setAttribute:(key,value)=>attributes[key]=value};
 const controls={text:[label,option],querySelectorAll:()=>[field]},body={text:[authored],querySelectorAll:()=>[]};let update;
 try{
  globalThis.NodeFilter={SHOW_TEXT:4};globalThis.MutationObserver=class{constructor(callback){update=callback;}observe(){}};
  globalThis.document={documentElement:{lang:'en'},querySelectorAll:selector=>selector.split(',').flatMap(key=>key==='#library-view-switch'?[aiRoot]:key==='#thought-root-source'?[controls]:key==='#thought-list'?[body]:[]),createTreeWalker:root=>{let index=0;return {nextNode:()=>root.text[index++]||null};}};
  watchThoughtCopy();assert.equal(rootAttributes['aria-label'],'Thought Library display');assert.equal(aiLabel.data,'AI organization ');assert.equal(aiAttributes['aria-label'],'AI organization');assert.equal(label.data,'Source');assert.equal(option.data,'All Sources (including independent thoughts)');assert.equal(attributes['aria-label'],'Topic list Source scope');assert.equal(authored.data,'来源');
  document.documentElement.lang='zh-CN';update();assert.equal(rootAttributes['aria-label'],'思想库显示');assert.equal(aiLabel.data,'AI整理 ');assert.equal(aiAttributes['aria-label'],'AI整理');assert.equal(label.data,'来源');assert.equal(option.data,'全部来源（含独立写下的内容）');assert.equal(attributes['aria-label'],'思想列表来源范围');assert.equal(authored.data,'来源');
 }finally{for(const [key,descriptor]of Object.entries(prior))if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
});
