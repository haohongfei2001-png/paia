import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const context={};vm.runInNewContext(await readFile(new URL('../core/prompt-surface-layout.js',import.meta.url),'utf8'),context);
const layout=context.PAIAPromptLayout;
test('a measured minimum larger than the fixed board refuses the board without moving its entry',()=>{
 const form={left:40,right:1240,top:800,bottom:884},base=layout(1280,900,form,null,true,{minimumHeight:312});
 assert.equal(base.card.h,312);
 for(const minimumHeight of [313,400,1024]){
  const g=layout(1280,900,form,null,true,{minimumHeight});assert.equal(g.card,null);assert.deepEqual(g.orb,base.orb);assert.deepEqual(g.capsule,base.capsule);
 }
});
test('approved fixed board ignores candidate counts and retains a fixed entry below the board',()=>{
 for(const width of [320,375,390,400,401,768,1280])for(const rows of [1,2,3,50]){
  const form={left:16,right:width-16,top:700,bottom:884},contentHeight=90+44*rows,g=layout(width,900,form,null,true,{contentHeight});
  assert.equal(g.card.w,Math.min(336,width-32));assert.equal(g.safeTop,12);assert.equal(g.safeBottom,688);assert.equal(g.card.h,312);assert.equal(g.card.y+g.card.h,644);assert.equal(g.orb.y,644);assert.equal(g.orb.y+44,688);
 }
});
test('visual viewport and actual top controls share one coordinate space',()=>{
 const g=layout(1280,900,{left:50,right:1200,top:700,bottom:884},{x:1,y:1},true,{viewport:{left:120,top:80,width:400,height:620},topControlsBottom:130,contentHeight:700});
 assert.equal(g.card.w,336);assert.equal(g.safeTop,142);assert.equal(g.safeBottom,688);assert.equal(g.card.y,332);assert.equal(g.card.h,312);assert.ok(g.card.x>=120&&g.card.x+g.card.w<=520);
});
test('minimum usable height has no side, below-composer or clipped-row fallback',()=>{
 const form={left:500,right:1000,top:220,bottom:880};
 const unavailable=layout(1280,900,form,{x:0,y:.5},true,{topControlsBottom:70,minimumHeight:150,contentHeight:400});
 assert.equal(unavailable.available,82);assert.equal(unavailable.card,null);
 const restored=layout(1280,900,{...form,top:700},{x:0,y:.5},true,{topControlsBottom:70,minimumHeight:150,contentHeight:400});assert.equal(restored.card.h,312);assert.equal(restored.card.y+312,644);
});
test('content changes keep fixed geometry while a growing composer moves the whole board upward',()=>{
 const position=Object.freeze({x:.45,y:.28}),form={left:16,right:1264,top:700,bottom:884};
 const a=layout(1280,900,form,position,true,{contentHeight:134}),b=layout(1280,900,{...form,top:612},position,true,{contentHeight:222});
 assert.equal(a.card.x,b.card.x);assert.equal(a.card.y-b.card.y,88);assert.equal(a.card.h,b.card.h);assert.equal(a.card.h,312);assert.deepEqual(position,{x:.45,y:.28});
});

test('capsule has one distinct fixed 272 by44 safe receiver and genuine shortages constrain board only',()=>{
 const form={left:16,right:1264,top:700,bottom:884};let g=layout(1280,900,form,null,false,{});assert.equal(g.capsule.w,272);assert.equal(g.capsule.h,44);assert.equal(g.capsule.y+44,688);
 g=layout(320,360,{...form,right:304,top:230,bottom:350},null,true,{minimumHeight:92,contentHeight:900});assert.equal(g.card.w,288);assert.equal(g.card.h,162);assert.ok(g.card.y>=12);assert.ok(g.card.y+g.card.h<=174);
});


test('all forms share the exact entry target even with legacy positions and narrow composer insets',()=>{
 for(const [width,inset] of [[390,40],[530,40],[531,40],[1280,90]]){
  const form={left:inset,right:width-inset,top:700,bottom:884};
  const closed=layout(width,900,form,{x:0,y:0},false),opened=layout(width,900,form,{x:1,y:1},true);
  assert.deepEqual(opened.orb,closed.orb,'opening or stored free position cannot move the target');
  assert.equal(opened.orb.x+44,form.right-(width<=530?0:4));
  assert.equal(opened.card.x+opened.card.w,opened.orb.x+44);
  assert.equal(opened.capsule.x+opened.capsule.w,opened.orb.x+44);
  assert.equal(opened.card.y+opened.card.h,opened.orb.y,'entry never covers the sixth row');
  assert.equal(opened.capsule.y,opened.orb.y);
 }
});

test('extreme safe-space fallback never moves the entry into top controls or the composer',()=>{
 const form={left:40,right:350,top:140,bottom:790},measurement={topControlsBottom:40,minimumHeight:92};
 const short=layout(390,800,form,null,true,measurement);
 assert.equal(short.card,null);assert.equal(short.orb.y+44,form.top-12);assert.ok(short.orb.y>=short.safeTop);
 assert.equal(layout(390,800,{...form,top:100},null,true,measurement),null);
 const restored=layout(390,800,{...form,top:650},null,true,measurement);
 assert.equal(restored.card.h,312);assert.equal(restored.card.y+312,restored.orb.y);
});

test('composer edges keep the approved inset until the actual visual viewport requires clamping',()=>{
 for(const width of [390,530,531,1280])for(const rightInset of [0,4,8,16,40]){
  const form={left:0,right:width-rightInset,top:700,bottom:884},g=layout(width,900,form,null,true),expected=form.right-(width<=530?0:4);
  assert.equal(g.orb.x+44,expected,`width ${width}, composer inset ${rightInset}: no unnecessary 16px margin`);
  assert.equal(g.card.x+g.card.w,expected);assert.ok(g.card.x>=0&&expected<=width);
 }
 const viewport={left:120,top:80,width:400,height:620};
 for(const formRight of [200,480,520,600]){
  const g=layout(1280,900,{left:0,right:formRight,top:700,bottom:884},null,true,{viewport});
  assert.equal(g.orb.x+44,Math.max(456,Math.min(520,formRight)));
  assert.ok(g.card.x>=120&&g.card.x+g.card.w<=520);
  assert.deepEqual(g.orb,layout(1280,900,{left:0,right:formRight,top:700,bottom:884},null,false,{viewport}).orb);
 }
});
