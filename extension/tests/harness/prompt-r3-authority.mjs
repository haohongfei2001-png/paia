// R3 checks are separate from historical B capture receipts and their validators.
// Test the original production owners; never substitute the demo runtime.
import assert from 'node:assert/strict';
import vm from 'node:vm';
export function assertProductionR3(runtime){
 const host=runtime['content/prompt-surface.js'],css=runtime['ui/prompt-surface.css'],html=runtime['ui/prompt-surface.html'],ui=runtime['ui/prompt-surface.js'];
 const world={};vm.runInNewContext(runtime['core/prompt-surface-layout.js'],world);
 for(const [open,form,dx,dy] of [[false,'orb',-2.5,0],[false,'capsule',-5,0],[true,'capsule',-5.25,-1.5]]){
  const g=world.PAIAPromptLayout(1280,900,{left:40,right:1240,top:800,bottom:884},null,open,{form});
  assert.deepEqual(JSON.parse(JSON.stringify(g.mark.front)),{x:14.75,y:17,w:21,h:14,r:3.25});assert.equal(g.mark.rear.dx,dx);assert.equal(g.mark.rear.dy,dy);
  for(const [box,w,h] of [[g.orb,48,48],[g.capsule,272,48],[g.card,336,328]]){assert.equal(box.w,w);assert.equal(box.h,h);assert.equal(box.x+w,1236);assert.equal(box.y+h,788);}
 }
 for(const pattern of [/className='surface-skin'/,/border:1px solid transparent;border-radius:0/,/clip-path:inset\(/,/18px 18px 24px 18px/,/--speed:80ms/,/--speed:120ms/,/--ease:cubic-bezier\(\.2,\.7,\.2,1\)/,/transition:clip-path var\(--speed\) var\(--ease\)/,/\['rear','\.18'\],\['front','\.2'\],\['edge','\.25'\]/,/--rear-edge-alpha:\.26/,/stroke-width:\.7/,/stroke-width:\.8/,/@media\(prefers-reduced-motion:reduce\)/])assert.match(host,pattern);
 for(const role of ['#93a2be','#8192b1','#899bb9','#667c9f','#c1cee5','#a0b3d2','#d4dff2','#9eb4d6'])assert.ok(host.includes(role),'exact glyph gradient '+role);
 assert.doesNotMatch(host,/\.hint|transition-delay|junction|anchor-edge|\.title=/);
 assert.match(css,/header\{height:48px;min-height:48px;flex:0 0 48px;padding:2px 55px 0 15px/);
 assert.match(css,/#list\{margin:7px 0;padding:0 12px/);assert.match(css,/\.row\{height:44px;min-height:44px/);assert.match(css,/#capsule-use\{[^}]*right:48px[^}]*width:224px[^}]*height:48px/);
 assert.match(css,/#surface-tools\{position:relative;inset:auto;flex:1 1 auto/);assert.match(css,/#status:not\(:empty\)\{position:relative/);
 assert.ok(html.indexOf('<header')>html.indexOf('id="surface-tools"'));assert.ok(html.indexOf('<header')>html.indexOf('id="check-text"'));assert.equal((html.match(/<header/g)||[]).length,1);
 assert.ok(ui.includes("setTimeout(()=>tell(''),480)"));assert.ok(ui.includes('},480);paintCapsule()'));
}
