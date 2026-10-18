// Geometry only: no page text, drafts, library or durable content. All inputs
// and output rectangles use layout-viewport CSS pixels, including visual offsets.
(() => {
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 globalThis.PAIAPromptLayout=(width,height,form,position,open=false,measurement={})=>{
  const viewport=measurement.viewport||{left:0,top:0,width,height};
  const left=Math.max(0,viewport.left||0),top=Math.max(0,viewport.top||0),right=Math.min(width,left+viewport.width),bottom=Math.min(height,top+viewport.height);
  const visibleWidth=right-left,diameter=48;
  if(visibleWidth<120)return null;
  const safeTop=Math.max(top,measurement.topControlsBottom??top)+12;
  const safeBottom=Math.min(bottom-12,form.top-12);
  if(safeBottom-safeTop<diameter)return null;
  // State changes never move the circle to make room for a shell. Only the
  // viewport can constrain its composer-relative target; the body yields first.
  const anchorRight=clamp(form.right-(visibleWidth<=530?0:4),left+diameter,right);
  const orb={x:anchorRight-diameter,y:safeBottom-diameter,w:diameter,h:diameter};
  const available=Math.max(0,orb.y+24-safeTop),intrinsic=312;
  const minimum=Number.isFinite(measurement.minimumHeight)?Math.max(88,measurement.minimumHeight):92;
  const h=Math.min(intrinsic,available),w=Math.min(336,visibleWidth-32,anchorRight-left-36);
  // The board's lower-right quarter joins the fixed circle. Its content has a
  // matching 12px right clearance so no expression or action sits under it.
  const card=w>=88&&h>=minimum?{x:anchorRight-36-w,y:orb.y+24-h,w,h}:null;
  const capsuleWidth=Math.min(224,orb.x-left),capsule=capsuleWidth>=44?{x:orb.x-capsuleWidth,y:orb.y+2,w:capsuleWidth,h:44}:null;
  const front={x:15,y:17,w:21,h:14,r:3},mark={front,rear:{...front,dx:open?-5:measurement.form==='capsule'?-4.5:-2,dy:open?-1.5:0}};
  return {capsule,orb,card,mark,safeTop,safeBottom,available};
 };
})();
