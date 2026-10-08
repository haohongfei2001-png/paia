import test from 'node:test';
import assert from 'node:assert/strict';
import {revealSearchResult} from '../ui/search-experience.js';
function fixture(run){
 const keys=['document','window','setTimeout','requestAnimationFrame','NodeFilter','CSS','Highlight'],prior=Object.fromEntries(keys.map(key=>[key,globalThis[key]]));
 const timers=[],frames=[],events=[];let current=true,contained=true;
 const target={dataset:{itemId:'synthetic-input'},isConnected:true,closest:()=>null,scrollIntoView:()=>events.push('scroll')};
 const root={querySelectorAll:()=>[target],contains:()=>contained};
 globalThis.document={getElementById:id=>id==='document-panel'?{hidden:false}:root,createTreeWalker:()=>({nextNode:()=>null})};
 globalThis.window={};globalThis.NodeFilter={SHOW_TEXT:4};globalThis.CSS={highlights:new Map()};globalThis.Highlight=class extends Array{};
 globalThis.setTimeout=fn=>timers.push(fn);globalThis.requestAnimationFrame=fn=>frames.push(fn);
 const options={isCurrent:()=>current,onMissingMatch:()=>events.push('changed')};
 try{run({events,options,start:()=>revealSearchResult('synthetic-input','old phrase',options),timer:()=>timers.shift()?.(),frame:()=>frames.shift()?.(),invalidate:()=>{current=false;},detach:()=>{contained=false;}});}finally{for(const key of keys)if(prior[key]===undefined)delete globalThis[key];else globalThis[key]=prior[key];}
}
test('qualified loaded Input without its prior phrase scrolls once and reports current match absence',()=>fixture(f=>{f.start();f.timer();f.frame();f.frame();assert.deepEqual(f.events,['scroll','changed']);}));
test('superseded route before lookup neither scrolls nor reports a changed match',()=>fixture(f=>{f.start();f.invalidate();f.timer();assert.deepEqual(f.events,[]);}));
test('superseded route across layout frames cannot scroll or notify in another route',()=>fixture(f=>{f.start();f.timer();f.frame();f.invalidate();f.frame();assert.deepEqual(f.events,[]);}));
test('connected target moved outside this Reader is not a qualified arrival',()=>fixture(f=>{f.start();f.timer();f.frame();f.detach();f.frame();assert.deepEqual(f.events,[]);}));
test('new arrival token cancels pending older layout work',()=>fixture(f=>{f.start();f.timer();f.frame();f.start();f.frame();assert.deepEqual(f.events,[]);f.timer();f.frame();f.frame();assert.deepEqual(f.events,['scroll','changed']);}));
