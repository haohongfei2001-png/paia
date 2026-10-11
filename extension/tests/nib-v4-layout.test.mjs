import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const context={};vm.runInNewContext(await readFile(new URL('../core/prompt-surface-layout.js',import.meta.url),'utf8'),context);
const layout=context.PAIAPromptLayout;
test('v4 exact CSS width boundaries, intrinsic height and bottom anchoring',()=>{
 for(const width of [320,375,390,400,401,768,1280])for(const rows of [1,2,3,50]){
  const form={left:16,right:width-16,top:700,bottom:884},contentHeight=90+44*rows,g=layout(width,900,form,null,true,{contentHeight});
  assert.equal(g.card.w,Math.min(width<=400?322:336,width-32));assert.equal(g.safeTop,12);assert.equal(g.safeBottom,688);assert.equal(g.card.h,Math.min(contentHeight,676));assert.equal(g.card.y+g.card.h,688);assert.equal(g.orb.y,g.card.y);
 }
});
test('visual viewport and actual top controls share one coordinate space',()=>{
 const g=layout(1280,900,{left:50,right:1200,top:700,bottom:884},{x:1,y:1},true,{viewport:{left:120,top:80,width:400,height:620},topControlsBottom:130,contentHeight:700});
 assert.equal(g.card.w,322);assert.equal(g.safeTop,142);assert.equal(g.safeBottom,688);assert.equal(g.card.y,142);assert.equal(g.card.h,546);assert.ok(g.card.x>=136&&g.card.x+g.card.w<=504);
});
test('minimum usable height has no side, below-composer or clipped-row fallback',()=>{
 const form={left:500,right:1000,top:220,bottom:880};
 const unavailable=layout(1280,900,form,{x:0,y:.5},true,{topControlsBottom:70,minimumHeight:150,contentHeight:400});
 assert.equal(unavailable.available,126);assert.equal(unavailable.card,null);
 const restored=layout(1280,900,{...form,top:700},{x:0,y:.5},true,{topControlsBottom:70,minimumHeight:150,contentHeight:400});assert.equal(restored.card.h,400);assert.equal(restored.card.y+400,688);
});
test('content-only growth goes upward and geometry never changes the stored position object',()=>{
 const position=Object.freeze({x:.45,y:.28}),form={left:16,right:1264,top:700,bottom:884};
 const a=layout(1280,900,form,position,true,{contentHeight:134}),b=layout(1280,900,form,position,true,{contentHeight:222});
 assert.equal(a.card.x,b.card.x);assert.equal(a.card.y-b.card.y,88);assert.deepEqual(position,{x:.45,y:.28});
});
