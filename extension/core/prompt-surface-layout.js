// Geometry only: no page text, drafts, library or durable content.
(() => {
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const intersects=(a,b)=>a.x<b.right+8&&a.x+a.w>b.left-8&&a.y<b.bottom+8&&a.y+a.h>b.top-8;
 globalThis.PAIAPromptLayout=(width,height,form,position)=>{
  const w=Math.min(336,width-16),above=Math.max(0,form.top-24),below=Math.max(0,height-form.bottom-24);
  const candidates=[{x:form.left-52,y:form.top},{x:form.right+8,y:form.top},{x:width-52,y:form.top-52},{x:width-52,y:form.bottom+8},{x:8,y:8}];
  if(position)candidates.unshift({x:position.x*(width-44),y:position.y*(height-44)});
  const orb=candidates.map(p=>({x:clamp(p.x,8,width-52),y:clamp(p.y,8,height-52),w:44,h:44})).find(p=>!intersects(p,form));
  if(!orb||width<120||height<120)return null;
  const h=Math.min(400,Math.max(above,below)-52),top=above>=below?8:form.bottom+16;
  return {orb,card:h>=96?{x:clamp(orb.x+44-w,8,width-w-8),y:above>=below?Math.max(8,Math.min(orb.y-8-h,form.top-h-68)):top+52,w,h}:null};
 };
})();
