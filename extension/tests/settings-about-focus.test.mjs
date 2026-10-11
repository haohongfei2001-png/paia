import test from 'node:test';
import assert from 'node:assert/strict';
import {PresentationNode} from './harness/presentation-dom.mjs';
import {mountSettingsAbout} from '../ui/settings-about.js';

// Actual controller with a bounded DOM fixture. Its disabled-button blur is
// explicit; the owning native file separately proves Chrome's real behavior.
const events=()=>{const listeners=new Map();return {addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},removeEventListener(type,fn){listeners.get(type)?.delete(fn);},emit(type,fields={}){for(const fn of [...listeners.get(type)||[]])fn({type,...fields});},listeners};};
async function fixture(run){
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document'),created=[],pending=[],focusCalls=[];
 const doc={...events(),documentElement:{lang:'en'},visibilityState:'visible',hasFocus:()=>true},view={...events(),document:doc};doc.defaultView=view;
 doc.createElement=tag=>{const n=new PresentationNode(tag);n.ownerDocument=doc;n.getClientRects=()=>n.isConnected&&!n.hidden&&!host.hidden?[{}]:[];n.focus=options=>{doc.activeElement=n;focusCalls.push(options);doc.emit('focusin',{target:n});};
  let disabled=false;Object.defineProperty(n,'disabled',{get:()=>disabled,set:value=>{disabled=value;if(value&&doc.activeElement===n){doc.activeElement=doc.body;doc.emit('focusout',{target:n,relatedTarget:null});}}});created.push(n);return n;};
 doc.createElementNS=(ns,tag)=>new PresentationNode(tag,ns);doc.body=new PresentationNode('body');doc.activeElement=doc.body;
 Object.defineProperty(globalThis,'document',{configurable:true,value:doc});const host=new PresentationNode('section');doc.body.append(host);
 try{const owner=mountSettingsAbout(host,{version:'0.43.19',checkForUpdate:()=>new Promise((resolve,reject)=>pending.push({resolve,reject}))}),check=created.find(n=>n.id==='settings-check-update');
  const start=()=>{doc.activeElement=check;check.listeners.get('click')({isTrusted:true});assert.equal(check.disabled,true);assert.equal(doc.activeElement,doc.body);};
  const complete=async(error=false)=>{error?pending.at(-1).reject(Error('synthetic')):pending.at(-1).resolve({version:'0.43.19',state:'checked-none'});await new Promise(resolve=>setImmediate(resolve));assert.equal(check.disabled,false);assert.ok([...doc.listeners.values(),...view.listeners.values()].every(set=>set.size===0),'temporary focus ownership always releases');};
  await run({doc,view,host,owner,check,start,complete,focusCalls});
 }finally{if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document;}
}
test('original About check returns its disabled-blurred focus once without scrolling, including a failed check',async()=>fixture(async f=>{for(const failed of [false,true]){f.start();await f.complete(failed);assert.equal(f.doc.activeElement,f.check);}assert.deepEqual(f.focusCalls,[{preventScroll:true},{preventScroll:true}]);}));
for(const intent of ['keydown','pointerdown','wheel','focusin','pagehide','blur','hidden','group','removed','document'])test(`original About completed check cannot reclaim focus after ${intent}`,async()=>fixture(async f=>{
 f.start();
 if(['keydown','pointerdown','wheel','focusin'].includes(intent))f.doc.emit(intent,{target:f.doc.body,isTrusted:true});
 else if(['pagehide','blur'].includes(intent))f.view.emit(intent,{target:f.view,isTrusted:true});
 else if(intent==='hidden'){f.doc.visibilityState='hidden';f.doc.emit('visibilitychange');f.doc.visibilityState='visible';}
 else if(intent==='group')f.host.hidden=true;
 else if(intent==='removed')f.check.remove();
 else f.view.document={};
 await f.complete();assert.equal(f.doc.activeElement,f.doc.body);assert.deepEqual(f.focusCalls,[]);
}));
test('original About completion cannot replace a different current focus even without an input event',async()=>fixture(async f=>{f.start();const next=new PresentationNode('input');f.host.append(next);f.doc.activeElement=next;await f.complete();assert.equal(f.doc.activeElement,next);assert.deepEqual(f.focusCalls,[]);}));
