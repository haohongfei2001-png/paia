import test from 'node:test';
import assert from 'node:assert/strict';
import {PresentationNode} from './harness/presentation-dom.mjs';
import {mountSettingsPromptPosition} from '../ui/settings-prompt-position.js';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document'),body=new PresentationNode('body'),host=new PresentationNode('section'),note=new PresentationNode('p');host.append(note);body.append(host);host.querySelector=()=>note;
 const make=tag=>{const node=new PresentationNode(tag);node.getClientRects=()=>[{}];return node;};Object.defineProperty(globalThis,'document',{configurable:true,value:{body,documentElement:{lang:'zh-CN'},createElement:make}});
 return {host,note,restore(){if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document;}};
}
test('secondary reset uses exact owner commands, acknowledgement and the same focused control across locale changes',async()=>{
 const f=fixture(),calls=[];let resolve,lang='zh-CN';try{
  const owner=mountSettingsPromptPosition(f.host,{language:()=>lang,send:async type=>{calls.push(type);return type.endsWith('STATUS')?{status:'ready',position:'custom'}:new Promise(r=>resolve=r);}});await tick();assert.equal(owner.control.disabled,false);assert.equal(calls.length,1);assert.doesNotMatch(f.note.textContent,/位置重置尚未接通/);
  owner.control.focus();const pending=owner.control.listeners.get('click')();assert.equal(owner.control.disabled,true);assert.match(owner.status.textContent,/正在重置/);resolve({status:'reset',changed:true});await pending;assert.equal(document.activeElement,owner.control);assert.match(owner.status.textContent,/位置已重置/);assert.deepEqual(calls,['PAIA_PROMPT_SURFACE_SETTINGS_STATUS','PAIA_PROMPT_SURFACE_RESET_POSITION']);
  lang='en';owner.sync();assert.match(owner.control.textContent,/Reset floating/);assert.equal(document.activeElement,owner.control);assert.equal(mountSettingsPromptPosition(f.host,{send:()=>assert.fail()}),owner);
 }finally{f.restore();}
});
test('reset failure and unknown format stay visible; geometry notifications reread only status without stealing focus',async()=>{
 const f=fixture(),changes=[],calls=[];let value={status:'ready',position:'custom'},other;try{
  const owner=mountSettingsPromptPosition(f.host,{send:async type=>{calls.push(type);if(type.endsWith('STATUS'))return value;throw Error('lost acknowledgement');},storage:{onChanged:{addListener:fn=>changes.push(fn)}}});await tick();other=new PresentationNode('button');document.body.append(other);other.focus();await owner.control.listeners.get('click')();assert.match(owner.status.textContent,/未获确认/);assert.equal(document.activeElement,other);
  const n=calls.length;changes[0]({unrelated:{}},'local');changes[0]({promptSurfaceV1:{}},'sync');await tick();assert.equal(calls.length,n);
  value={status:'unavailable'};changes[0]({promptSurfaceV1:{}},'local');await tick();assert.equal(owner.control.disabled,true);assert.match(owner.status.textContent,/无法重置/);assert.equal(document.activeElement,other);assert.equal(calls.at(-1),'PAIA_PROMPT_SURFACE_SETTINGS_STATUS');
 }finally{f.restore();}
});
