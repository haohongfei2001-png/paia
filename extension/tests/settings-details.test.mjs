import test from 'node:test';
import assert from 'node:assert/strict';
import {PresentationNode} from './harness/presentation-dom.mjs';
import {mountSettingsDetail} from '../ui/settings-details.js';
test('read-only Settings destinations retain content and use labeled native dialogs without mounting side effects',()=>{
 const prior=Object.getOwnPropertyDescriptor(globalThis,'document'),body=new PresentationNode('body');let reads=0,language='zh-CN';
 const make=tag=>{const node=new PresentationNode(tag);if(tag==='dialog'){node.showModal=()=>{node.open=true;};node.close=()=>{node.open=false;};}return node;};Object.defineProperty(globalThis,'document',{configurable:true,value:{body,documentElement:{lang:language},createElement:make,createElementNS:(_ns,tag)=>make(tag)}});
 try{const content=make('section'),detail=mountSettingsDetail({id:'synthetic-storage',title:['存储空间','Storage space'],content,value:()=> '1.0 MiB',language:()=>language,onOpen:()=>reads++});body.append(detail.row);assert.equal(reads,0);assert.equal(detail.dialog.contains(content),true);assert.equal(detail.row.getAttribute('aria-haspopup'),'dialog');assert.equal(detail.row.getAttribute('aria-controls'),detail.dialog.id);assert.equal(detail.dialog.getAttribute('aria-labelledby'),'synthetic-storage-title');
 detail.row.listeners.get('click')();assert.equal(reads,1);assert.equal(detail.dialog.open,true);detail.row.listeners.get('click')();assert.equal(reads,1,'an open dialog does not duplicate its read');const close=detail.dialog.firstElementChild.children[1];assert.equal(close.getAttribute('aria-label'),'关闭存储空间');language='en';detail.sync();assert.equal(close.getAttribute('aria-label'),'Close Storage space');assert.equal(detail.dialog.contains(content),true);close.listeners.get('click')();assert.equal(detail.dialog.open,false);assert.equal(reads,1);assert.equal(detail.dialog.listeners.has('keydown'),false,'native Escape and focus lifecycle are not replaced');
 }finally{if(prior)Object.defineProperty(globalThis,'document',prior);else delete globalThis.document;}
});
