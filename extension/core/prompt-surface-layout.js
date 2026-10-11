// Geometry only: no page text, drafts, library or durable content. All inputs
// and output rectangles use layout-viewport CSS pixels, including visual offsets.
(() => {
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const intersects=(a,b)=>a.x<b.right+8&&a.x+a.w>b.left-8&&a.y<b.bottom+8&&a.y+a.h>b.top-8;
 globalThis.PAIAPromptLayout=(width,height,form,position,open=false,measurement={})=>{
  const viewport=measurement.viewport||{left:0,top:0,width,height};
  const left=Math.max(0,viewport.left||0),top=Math.max(0,viewport.top||0),right=Math.min(width,left+viewport.width),bottom=Math.min(height,top+viewport.height);
  const visibleWidth=right-left,w=Math.min(visibleWidth<=400?322:336,visibleWidth-32);
  if(w<=0||visibleWidth<120||bottom-top<120)return null;
  const candidates=[{x:form.left-52,y:form.top},{x:form.right+8,y:form.top},{x:right-52,y:form.top-52},{x:right-52,y:form.bottom+8},{x:left+8,y:top+8}];
  if(position)candidates.unshift({x:position.x*(width-44),y:position.y*(height-44)});
  const orb=candidates.map(p=>({x:clamp(p.x,left+8,right-52),y:clamp(p.y,top+8,bottom-52),w:44,h:44})).find(p=>!intersects(p,form));
  if(!orb)return null;
  const safeTop=Math.max(top,measurement.topControlsBottom??top)+12;
  const safeBottom=Math.min(bottom-12,form.top-12),available=Math.max(0,safeBottom-safeTop);
  const intrinsic=Number.isFinite(measurement.contentHeight)?Math.max(0,measurement.contentHeight):310;
  const minimum=Number.isFinite(measurement.minimumHeight)?measurement.minimumHeight:134;
  const h=Math.min(intrinsic,available);
  const x=clamp((position?position.x*(width-44):orb.x)+44-w,left+16,right-w-16);
  const card=available>=minimum&&h>=minimum?{x,y:safeBottom-h,w,h}:null;
  // The open handle stays inside the board's reserved header: no additional
  // invisible anchor or safe-band exception. Stored x/y remains the same owner.
  return {orb:open&&card?{x:card.x+card.w-44,y:card.y,w:44,h:44}:orb,card,safeTop,safeBottom,available};
 };
})();
