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
  const available=Math.max(0,orb.y+48-safeTop),intrinsic=328;
  const minimum=Number.isFinite(measurement.minimumHeight)?Math.max(108,measurement.minimumHeight):108;
  const h=Math.min(intrinsic,available),w=Math.min(336,visibleWidth-32,anchorRight-left);
  // R3 shares the anchor's right/bottom edges. Tools reserve its full target;
  // only the body yields to a genuine space shortage, never the anchor.
  const card=w>=224&&h>=minimum?{x:anchorRight-w,y:safeBottom-h,w,h}:null;
  const capsule=anchorRight-left>=272?{x:anchorRight-272,y:orb.y,w:272,h:48}:null;
  const boardVisible=open&&!!card,capsuleVisible=!open&&measurement.form==='capsule'&&!!capsule;
  const front={x:14.75,y:17,w:21,h:14,r:3.25},mark={front,rear:{...front,dx:boardVisible?-5.25:capsuleVisible?-5:-2.5,dy:boardVisible?-1.5:0}};
  return {capsule,orb,card,mark,safeTop,safeBottom,available};
 };
})();
