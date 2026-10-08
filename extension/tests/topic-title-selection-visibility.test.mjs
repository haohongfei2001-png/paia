import test from 'node:test';
import assert from 'node:assert/strict';
import {revealCompactTopicTitleSelection} from '../ui/topic-workspace-presentation.js';
function fixture(run){
 const keys=['document','window','innerWidth','innerHeight','getSelection','getComputedStyle'],prior=new Map(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 const text={},title={isConnected:true,contains:node=>node===text},root={querySelector:()=>title},scrolls=[],rect={top:6,bottom:75,height:69},barrier={top:0,bottom:59},range={commonAncestorContainer:text,getBoundingClientRect:()=>rect},selection={rangeCount:1,getRangeAt:()=>range};
 const env={document:{activeElement:title,querySelector:()=>({getBoundingClientRect:()=>barrier})},window:{scrollBy:(...args)=>scrolls.push(args)},innerWidth:320,innerHeight:900,getSelection:()=>selection,getComputedStyle:()=>({position:'sticky'})};
 for(const[k,v]of Object.entries(env))Object.defineProperty(globalThis,k,{value:v,writable:true,configurable:true});
 try{run({root,title,rect,barrier,range,selection,scrolls});}finally{for(const[k,v]of prior)if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}
}
test('native title range clears actual compact rail height at 200% without replacing selection',()=>fixture(({root,barrier,selection,scrolls})=>{
 const original=selection.getRangeAt();revealCompactTopicTitleSelection(root);assert.deepEqual(scrolls,[[0,-57]]);assert.equal(selection.getRangeAt(),original);
 barrier.bottom=95;revealCompactTopicTitleSelection(root);assert.deepEqual(scrolls.at(-1),[0,-93]);
}));
test('visible title selection does not scroll and bottom edge remains reachable',()=>fixture(({root,rect,scrolls})=>{
 Object.assign(rect,{top:70,bottom:139});revealCompactTopicTitleSelection(root);assert.deepEqual(scrolls,[]);
 Object.assign(rect,{top:850,bottom:919});revealCompactTopicTitleSelection(root);assert.deepEqual(scrolls,[[0,23]]);
}));
test('desktop, unrelated focus, detached title and foreign ranges are untouched',()=>fixture(({root,title,range,scrolls})=>{
 globalThis.innerWidth=768;revealCompactTopicTitleSelection(root);globalThis.innerWidth=320;
 document.activeElement={};revealCompactTopicTitleSelection(root);document.activeElement=title;
 title.isConnected=false;revealCompactTopicTitleSelection(root);title.isConnected=true;
 range.commonAncestorContainer={};revealCompactTopicTitleSelection(root);assert.deepEqual(scrolls,[]);
}));
