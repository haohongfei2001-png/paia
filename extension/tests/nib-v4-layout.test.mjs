import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const context={};vm.runInNewContext(await readFile(new URL('../core/prompt-surface-layout.js',import.meta.url),'utf8'),context);
const layout=context.PAIAPromptLayout;
test('approved fixed board ignores candidate counts and retains safe bottom anchoring',()=>{
 for(const width of [320,375,390,400,401,768,1280])for(const rows of [1,2,3,50]){
  const form={left:16,right:width-16,top:700,bottom:884},contentHeight=90+44*rows,g=layout(width,900,form,null,true,{contentHeight});
  assert.equal(g.card.w,Math.min(336,width-32));assert.equal(g.safeTop,12);assert.equal(g.safeBottom,688);assert.equal(g.card.h,312);assert.equal(g.card.y+g.card.h,688);assert.equal(g.orb.y,g.card.y);
 }
});
test('visual viewport and actual top controls share one coordinate space',()=>{
 const g=layout(1280,900,{left:50,right:1200,top:700,bottom:884},{x:1,y:1},true,{viewport:{left:120,top:80,width:400,height:620},topControlsBottom:130,contentHeight:700});
 assert.equal(g.card.w,336);assert.equal(g.safeTop,142);assert.equal(g.safeBottom,688);assert.equal(g.card.y,376);assert.equal(g.card.h,312);assert.ok(g.card.x>=136&&g.card.x+g.card.w<=504);
});
test('minimum usable height has no side, below-composer or clipped-row fallback',()=>{
 const form={left:500,right:1000,top:220,bottom:880};
 const unavailable=layout(1280,900,form,{x:0,y:.5},true,{topControlsBottom:70,minimumHeight:150,contentHeight:400});
 assert.equal(unavailable.available,126);assert.equal(unavailable.card,null);
 const restored=layout(1280,900,{...form,top:700},{x:0,y:.5},true,{topControlsBottom:70,minimumHeight:150,contentHeight:400});assert.equal(restored.card.h,312);assert.equal(restored.card.y+312,688);
});
test('content changes keep fixed geometry while a growing composer moves the whole board upward',()=>{
 const position=Object.freeze({x:.45,y:.28}),form={left:16,right:1264,top:700,bottom:884};
 const a=layout(1280,900,form,position,true,{contentHeight:134}),b=layout(1280,900,{...form,top:612},position,true,{contentHeight:222});
 assert.equal(a.card.x,b.card.x);assert.equal(a.card.y-b.card.y,88);assert.equal(a.card.h,b.card.h);assert.equal(a.card.h,312);assert.deepEqual(position,{x:.45,y:.28});
});

test('capsule has one distinct fixed 272 by44 safe receiver and genuine shortages constrain board only',()=>{
 const form={left:16,right:1264,top:700,bottom:884};let g=layout(1280,900,form,null,false,{});assert.equal(g.capsule.w,272);assert.equal(g.capsule.h,44);assert.equal(g.capsule.y+44,688);
 g=layout(320,360,{...form,right:304,top:230,bottom:350},null,true,{minimumHeight:92,contentHeight:900});assert.equal(g.card.w,288);assert.equal(g.card.h,206);assert.ok(g.card.y>=12);assert.ok(g.card.y+g.card.h<=218);
});
