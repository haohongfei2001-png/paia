// Geometry only: no page text, drafts, library or durable content.
(() => {
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const intersects=(a,b)=>a.x<b.right+8&&a.x+a.w>b.left-8&&a.y<b.bottom+8&&a.y+a.h>b.top-8;
 globalThis.PAIAPromptLayout=(width,height,form,position)=>{
  const w=Math.min(336,width-16);
  const candidates=[{x:form.left-52,y:form.top},{x:form.right+8,y:form.top},{x:width-52,y:form.top-52},{x:width-52,y:form.bottom+8},{x:8,y:8}];
  if(position)candidates.unshift({x:position.x*(width-44),y:position.y*(height-44)});
  const orb=candidates.map(p=>({x:clamp(p.x,8,width-52),y:clamp(p.y,8,height-52),w:44,h:44})).find(p=>!intersects(p,form));
  if(!orb||width<120||height<120)return null;
  const cards=[];
  for(const [start,end] of [[8,form.top-16],[form.bottom+16,height-8]]){
   const bottom=Math.min(end,orb.y-8),top=Math.max(start,orb.y+52);
   const a=Math.min(400,bottom-start),b=Math.min(400,end-top);
   if(a>=96)cards.push({y:bottom-a,h:a});if(b>=96)cards.push({y:top,h:b});
  }
  cards.sort((a,b)=>b.h-a.h||Math.abs(a.y-orb.y)-Math.abs(b.y-orb.y));
  const card=cards[0];return {orb,card:card?{x:clamp(orb.x+44-w,8,width-w-8),w,...card}:null};
 };
})();
