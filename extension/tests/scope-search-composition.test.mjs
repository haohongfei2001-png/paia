import test from 'node:test';
import assert from 'node:assert/strict';
import {ScopeSearch} from '../ui/components/scope-search.js';
class Node {
 constructor(){this.listeners=new Map();this.dataset={};this.classList={add(){}};this.value='';this.disabled=false;}
 addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(fn);}
 append(...children){for(const child of children)child.parentElement=this;}
 setAttribute(name,value){this[name]=value;}
 closest(){return null;}
 fire(type,fields={}){for(const fn of this.listeners.get(type)||[])fn({type,...fields});}
}
function fixture(run){const prior=globalThis.document;globalThis.document={createElement:()=>new Node(),createElementNS:()=>new Node(),activeElement:null};try{const calls=[],search=new ScopeSearch({host:new Node(),onInput:()=>calls.push(search.input.value)});search.present({scope:'archive',owner:'library',query:''});run(search,calls);}finally{if(prior===undefined)delete globalThis.document;else globalThis.document=prior;}}
test('same-owner repaint cannot replace an in-flight native composition before final input admission',()=>fixture((search,calls)=>{
 search.input.fire('compositionstart');search.input.value='SYNTHETIC composed 中文';search.input.fire('input',{isComposing:true});
 // A source-header refresh is allowed while the native composition owns text.
 search.present({scope:'archive',owner:'library',query:'',label:'Source archive'});
 assert.equal(search.input.value,'SYNTHETIC composed 中文');assert.deepEqual(calls,[]);
 search.input.fire('compositionend');assert.deepEqual(calls,['SYNTHETIC composed 中文']);
}));
test('composition state blocks partial input even when an intermediate input event omits its flag',()=>fixture((search,calls)=>{
 search.input.fire('compositionstart');search.input.value='partial';search.input.fire('input',{isComposing:false});assert.deepEqual(calls,[]);
 search.input.value='final';search.input.fire('compositionend');assert.deepEqual(calls,['final']);
}));
test('scope changes discard old composition ownership and never admit it to a new Reader',()=>fixture((search,calls)=>{
 search.input.fire('compositionstart');search.input.value='old';search.present({scope:'reader',owner:'new-document',query:'new'});assert.equal(search.input.value,'new');search.input.fire('compositionend');assert.deepEqual(calls,[]);
 search.input.fire('input',{isComposing:false});assert.deepEqual(calls,['new']);
}));
test('disabled or hidden search never admits a composition, and ordinary input remains functional',()=>fixture((search,calls)=>{
 search.input.fire('compositionstart');search.input.value='blocked';search.input.disabled=true;search.input.fire('compositionend');assert.deepEqual(calls,[]);
 search.input.disabled=false;search.input.value='normal';search.input.fire('input',{isComposing:false});assert.deepEqual(calls,['normal']);
 search.input.fire('compositionstart');search.present({scope:null,owner:null});search.input.fire('compositionend');assert.deepEqual(calls,['normal']);
}));
