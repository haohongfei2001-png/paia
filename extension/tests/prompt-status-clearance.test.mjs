import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {assertPromptStatusClearance,assertPromptStatusFlow} from './harness/prompt-status-clearance.mjs';
const css=await readFile(new URL('../ui/prompt-surface.css',import.meta.url),'utf8');
const value=()=>({viewport:{width:334,height:216},status:{x:6,y:178,width:322,height:34},target:{x:250,y:130,width:70,height:44},quiet:false,statusContainsTarget:false,hit:true});
test('actual persistent status occupies card flow while quiet feedback retains its old geometry',()=>assertPromptStatusFlow(css));
test('original bottom overlay is rejected, not repaired by ignoring pointer events',()=>{
 for(const mutated of [css.replace('#status:not(:empty){position:relative','#status:not(:empty){position:absolute'),css+'#status{pointer-events:none}'])assert.throws(()=>assertPromptStatusFlow(mutated));
});
test('short viewport save/cancel hit target cannot overlap the persistent message',()=>{
 assertPromptStatusClearance(value());
 for(const mutate of [x=>x.status.y=155,x=>x.hit=false,x=>x.target.y=200,x=>x.target.height=0,x=>x.quiet=true]){const x=value();mutate(x);assert.throws(()=>assertPromptStatusClearance(x));}
});
test('long failure message still permits the existing status copy action',()=>{
 const x=value();x.status={x:6,y:146,width:322,height:66};x.target={x:240,y:176,width:80,height:32};x.statusContainsTarget=true;assertPromptStatusClearance(x,{withinStatus:true});
 assert.throws(()=>assertPromptStatusClearance({...x,hit:false},{withinStatus:true}));assert.throws(()=>assertPromptStatusClearance(x));
 const clipped=structuredClone(x);clipped.target.y=200;assert.throws(()=>assertPromptStatusClearance(clipped,{withinStatus:true}));
});
