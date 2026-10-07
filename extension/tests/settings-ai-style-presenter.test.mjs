import test from 'node:test';
import assert from 'node:assert/strict';
import {PresentationNode} from './harness/presentation-dom.mjs';
import {mountSettingsAIStyle} from '../ui/settings-ai-style.js';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;const promise=new Promise(a=>resolve=a);return {promise,resolve};};

test('style native-radio presenter records default intent, acknowledges the focused control and preserves later focus',async()=>{
 const prior=Object.getOwnPropertyDescriptor(globalThis,'document'),created=[],body=new PresentationNode('body');let language='zh-CN',current={available:true,value:'balanced',revision:0,explicit:false,epoch:'initial'},pending=null;const calls=[];
 const make=tag=>{const node=new PresentationNode(tag);created.push(node);node.getClientRects=()=>[{}];if(tag==='dialog'){node.showModal=()=>{node.open=true;};node.close=()=>{node.open=false;};}return node;};Object.defineProperty(globalThis,'document',{configurable:true,value:{body,documentElement:{lang:language},createElement:make,createElementNS:(_ns,tag)=>make(tag)}});
 try{
  const host=make('section');body.append(host);const owner=mountSettingsAIStyle(host,{language:()=>language,send:async(type,payload)=>{calls.push([type,payload]);return type==='PAIA_SETTINGS_AI_STYLE'?current:pending.promise;}});await tick();const inputs=created.filter(node=>node.tagName==='INPUT'),balanced=inputs.find(node=>node.value==='balanced'),original=inputs.find(node=>node.value==='original'),status=created.find(node=>node.id==='settings-ai-style-feedback');
  assert.equal(inputs.length,3);assert.equal(inputs.every(node=>node.type==='radio'&&node.name==='settings-ai-organize-style'),true);assert.equal(balanced.checked,true);assert.equal(calls.length,1);assert.equal(owner.dialog.getAttribute('aria-labelledby'),'settings-ai-style-open-title');
  document.activeElement=balanced;pending=deferred();balanced.listeners.get('click')();assert.equal(inputs.every(node=>node.disabled),true);assert.equal(balanced.checked,true);assert.match(status.textContent,/正在保存/);pending.resolve({ok:true,changed:true});await tick();assert.equal(owner.state.value.explicit,true);assert.equal(owner.state.value.revision,1);assert.equal(balanced.checked,true);assert.equal(document.activeElement,balanced);
  document.activeElement=original;pending=deferred();original.listeners.get('change')();assert.equal(balanced.checked,true,'pending selection displays the last acknowledged choice');const close=owner.dialog.firstElementChild.children[1];document.activeElement=close;pending.resolve({ok:true,changed:true});await tick();assert.equal(original.checked,true);assert.equal(document.activeElement,close,'settled save cannot steal newer focus');assert.equal(owner.state.value.revision,2);
  language='en';owner.sync();assert.match(owner.row.textContent,/Original wording/);assert.equal(document.activeElement,close);assert.equal(created.filter(node=>node.tagName==='INPUT').length,3);assert.equal(mountSettingsAIStyle(host,{send:()=>assert.fail()}),owner);
 }finally{if(prior)Object.defineProperty(globalThis,'document',prior);else delete globalThis.document;}
});

test('style notification/storage reconciliation uses only its bounded reader and preserves radio nodes',async()=>{
 const prior=Object.getOwnPropertyDescriptor(globalThis,'document'),created=[],body=new PresentationNode('body'),messages=[],changes=[],calls=[];let current={available:true,value:'original',revision:1,explicit:true,epoch:'initial'};
 const make=tag=>{const node=new PresentationNode(tag);created.push(node);return node;};Object.defineProperty(globalThis,'document',{configurable:true,value:{body,documentElement:{lang:'en'},createElement:make,createElementNS:(_ns,tag)=>make(tag)}});
 try{const host=make('section');body.append(host);const owner=mountSettingsAIStyle(host,{send:async type=>{calls.push(type);return current;},runtime:{onMessage:{addListener:fn=>messages.push(fn)}},storage:{onChanged:{addListener:fn=>changes.push(fn)}}});await tick();const input=created.find(node=>node.tagName==='INPUT'&&node.value==='original');document.activeElement=input;
  messages[0]({type:'ARCHIVE_CHANGED'});changes[0]({personalAIArchive:{oldValue:{preferences:{appearance:'light'}},newValue:{preferences:{appearance:'dark'}}}},'local');await tick();assert.equal(calls.length,1);
  current={available:true,value:'concise',revision:2,explicit:true,epoch:'initial'};messages[0]({type:'PAIA_SETTINGS_AI_STYLE_CHANGED'});await tick();assert.equal(owner.state.value.value,'concise');assert.equal(document.activeElement,input);assert.equal(calls.every(type=>type==='PAIA_SETTINGS_AI_STYLE'),true);
  changes[0]({personalAIArchive:{oldValue:{preferences:{aiOrganizeStyle:{revision:2}}},newValue:{preferences:{aiOrganizeStyle:{revision:3}}}}},'local');await tick();assert.equal(calls.length,3);assert.equal(created.filter(node=>node.tagName==='INPUT').length,3);
  current={...current,value:'balanced',epoch:'restored-epoch'};messages[0]({type:'ARCHIVE_CHANGED',cause:'PAIA_BACKUP_RESTORE'});await tick();assert.equal(owner.state.value.epoch,'restored-epoch');assert.equal(owner.state.value.value,'balanced');assert.equal(calls.length,4);assert.equal(document.activeElement,input);
 }finally{if(prior)Object.defineProperty(globalThis,'document',prior);else delete globalThis.document;}
});

test('a superseded closed-dialog read cannot focus an old choice in a newer opening',async()=>{
 const prior=Object.getOwnPropertyDescriptor(globalThis,'document'),created=[],body=new PresentationNode('body'),first=deferred(),second=deferred();let reads=0;
 const make=tag=>{const node=new PresentationNode(tag);created.push(node);node.getClientRects=()=>[{}];if(tag==='dialog'){node.showModal=()=>{node.open=true;document.activeElement=node.firstElementChild.children[1];};node.close=()=>{node.open=false;};}return node;};Object.defineProperty(globalThis,'document',{configurable:true,value:{body,documentElement:{lang:'en'},createElement:make,createElementNS:(_ns,tag)=>make(tag)}});
 try{const host=make('section');body.append(host);const owner=mountSettingsAIStyle(host,{send:async()=>++reads===1?{available:true,value:'balanced',revision:0,explicit:false,epoch:'initial'}:reads===2?first.promise:second.promise});await tick();const close=owner.dialog.firstElementChild.children[1];owner.row.listeners.get('click')();assert.equal(document.activeElement,close);owner.dialog.close();document.activeElement=body;owner.row.listeners.get('click')();assert.equal(document.activeElement,close);
  first.resolve({available:true,value:'original',revision:1,explicit:true,epoch:'initial'});await tick();assert.equal(document.activeElement,close,'stale earlier opening cannot move later focus');assert.equal(owner.state.value.value,'balanced');
  second.resolve({available:true,value:'concise',revision:2,explicit:true,epoch:'initial'});await tick();assert.equal(document.activeElement.id,'settings-ai-style-concise');assert.equal(owner.state.value.value,'concise');
 }finally{if(prior)Object.defineProperty(globalThis,'document',prior);else delete globalThis.document;}
});
