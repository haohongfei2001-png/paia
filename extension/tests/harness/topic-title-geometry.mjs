import assert from 'node:assert/strict';

// Text ranges include real fallback-font ascent/descent, which can extend past
// a visible-overflow CSS line box without being clipped. Check the actual glyph
// geometry against horizontal viewport, scrollable document, clipping owners
// and adjacent controls. Native first/last-character focus separately proves
// vertical viewport reachability at200%; a long title may require scrolling.
export function assertTopicTitleVisible(actual,label){
 const title=actual.title,rects=title?.textRects;
 assert.equal(title?.visible,true,label+' title is visibly rendered');
 assert.ok(typeof title?.text==='string'&&title.text.trim()&&Array.isArray(rects)&&rects.length,label+' full title has measured text ranges');
 const valid=r=>r&&['left','top','right','bottom'].every(key=>Number.isFinite(r[key]))&&r.right>=r.left&&r.bottom>r.top;
 const clips=title.clips,neighbors=title.neighbors;assert.ok(Array.isArray(clips)&&Array.isArray(neighbors),label+' title has measured clipping and adjacent layout owners');
 for(const r of rects){
  assert.ok(valid(r),label+' valid title text rectangle');
  assert.ok(r.left>=-.5&&r.right<=actual.width+.5&&r.top+actual.scrollY>=-.5&&r.bottom+actual.scrollY<=actual.documentHeight+.5,label+' complete title is inside the horizontal viewport and scrollable document');
  for(const c of clips){
   assert.ok(valid(c),label+' valid clipping owner');assert.ok(!c.clipPath||c.clipPath==='none',label+' title cannot use an unverified clip path');
   if(/^(hidden|clip|auto|scroll)$/.test(c.x))assert.ok(r.left>=c.left-.5&&r.right<=c.right+.5,label+' full title survives horizontal clipping owner '+(c.id||c.tag));
   if(/^(hidden|clip|auto|scroll)$/.test(c.y))assert.ok(r.top>=c.top-.5&&r.bottom<=c.bottom+.5,label+' full title survives vertical clipping owner '+(c.id||c.tag));
  }
  for(const n of neighbors){assert.ok(valid(n),label+' valid adjacent layout owner');assert.ok(Math.min(r.right,n.right)-Math.max(r.left,n.left)<=.5||Math.min(r.bottom,n.bottom)-Math.max(r.top,n.top)<=.5,label+' title does not overlap adjacent control or text '+(n.id||n.className));}
 }
}
