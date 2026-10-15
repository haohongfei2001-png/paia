import test from 'node:test';
import assert from 'node:assert/strict';
import {centerRootSelectionTarget,rootSelectionTargetIsInterior} from './harness/root-selection-viewport.mjs';

test('native horizontal selection rejects the actual visible top-edge failure and positions an interior path',()=>{
 const previous=globalThis.innerHeight;globalThis.innerHeight=1000;
 try{
  let top=.484375,options;
  const node={getBoundingClientRect:()=>({top,bottom:top+32,height:32,width:285}),scrollIntoView(value){options=value;if(value.block==='center')top=(innerHeight-32)/2;}};
  assert.ok(top>=0&&top+32<=innerHeight,'the former wholly-visible check admitted this actual failed trace');
  assert.equal(rootSelectionTargetIsInterior(node),false,'y13 drag must not begin in the browser edge-autoscroll band');
  centerRootSelectionTarget(node);assert.deepEqual(options,{block:'center',inline:'nearest',behavior:'instant'});assert.equal(top,484);assert.equal(rootSelectionTargetIsInterior(node),true);
  for(const unsafe of [-1,0,63,937,968,1000]){top=unsafe;assert.equal(rootSelectionTargetIsInterior(node),false,'edge or clipped title '+unsafe+' is not an interior drag fixture');}
  top=646.484375;assert.equal(rootSelectionTargetIsInterior(node),true,'actual passing release trace is interior');
 }finally{if(previous===undefined)delete globalThis.innerHeight;else globalThis.innerHeight=previous;}
});
