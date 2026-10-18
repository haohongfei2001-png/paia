// Geometry only: no page text, drafts, library or durable content. All inputs
// and output rectangles use layout-viewport CSS pixels, including visual offsets.
(() => {
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 globalThis.PAIAPromptLayout=(width,height,form,position,open=false,measurement={})=>{
  const viewport=measurement.viewport||{left:0,top:0,width,height};
  const left=Math.max(0,viewport.left||0),top=Math.max(0,viewport.top||0),right=Math.min(width,left+viewport.width),bottom=Math.min(height,top+viewport.height);
  const visibleWidth=right-left,w=Math.min(336,visibleWidth-32);
  if(w<=0||visibleWidth<120)return null;
  const safeTop=Math.max(top,measurement.topControlsBottom??top)+12;
  const safeBottom=Math.min(bottom-12,form.top-12);
  if(safeBottom-safeTop<44)return null;
  // The entry is the same hit target in every state. Keep compatible saved
  // position metadata at its original owner, but never let it move this anchor.
  // Clamp only when required by the viewport: a 390px composer inset by 40px
  // still has its exact right edge, rather than a spurious extra 2px shift.
  // No extra right margin: an edge-aligned composer keeps its approved inset
  // while the whole board fits within the actual visual viewport.
  const anchorRight=clamp(form.right-(visibleWidth<=530?0:4),left+w,right);
  const orb={x:anchorRight-44,y:safeBottom-44,w:44,h:44};
  const available=Math.max(0,orb.y-safeTop),intrinsic=312;
  const minimum=Number.isFinite(measurement.minimumHeight)?Math.max(88,measurement.minimumHeight):92;
  const h=Math.min(intrinsic,available);
  // Board opens above the unchanged target with zero gap. Its sixth row and
  // the complete composer remain outside the entry's hit area.
  const card=available>=minimum&&h>=minimum?{x:anchorRight-w,y:orb.y-h,w,h}:null;
  const capsuleWidth=Math.min(272,visibleWidth-32),capsule={x:anchorRight-capsuleWidth,y:orb.y,w:capsuleWidth,h:44};
  return {capsule,orb,card,safeTop,safeBottom,available};
 };
})();
