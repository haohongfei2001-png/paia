// Geometry only: no page text, drafts, library or durable content.
(() => {
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const intersects=(a,b)=>a.x<b.right+8&&a.x+a.w>b.left-8&&a.y<b.bottom+8&&a.y+a.h>b.top-8;
 globalThis.PAIAPromptLayout=(width,height,form,position,open=false)=>{
  const w=Math.min(width<=400?322:336,width-32);
  const candidates=[{x:form.left-52,y:form.top},{x:form.right+8,y:form.top},{x:width-52,y:form.top-52},{x:width-52,y:form.bottom+8},{x:8,y:8}];
  if(position&&!open)candidates.unshift({x:position.x*(width-44),y:position.y*(height-44)});
  const orb=candidates.map(p=>({x:clamp(p.x,8,width-52),y:clamp(p.y,8,height-52),w:44,h:44})).find(p=>!intersects(p,form));
  if(!orb||width<120||height<120)return null;
  const cards=[];
  for(const [start,end] of [[40,form.top-16],[form.bottom+40,height-8]]){
   const bottom=Math.min(end,orb.y-8),top=Math.max(start,orb.y+52);
   const a=Math.min(width<=400?340:350,bottom-start),b=Math.min(width<=400?340:350,end-top);
   if(a>=96)cards.push({y:bottom-a,h:a});if(b>=96)cards.push({y:top,h:b});
  }
  cards.sort((a,b)=>b.h-a.h||Math.abs(a.y-orb.y)-Math.abs(b.y-orb.y));
  let card=cards[0]?{x:clamp(orb.x+44-w,8,width-w-8),w,...cards[0]}:null;
  if(!open)return {orb,card};
  // Saved position owns the visible handle, never an invisible collapsed orb.
  // Project the complete attached surface into safe bands around the composer.
  // A default/reset open card also needs lateral space when a tall composer
  // leaves no vertical band. Use its default orb, never the cleared old offset.
  if(position||!card){
   const desired=position?{x:position.x*(width-44),y:position.y*(height-44)}:orb,placements=[],preferredHeight=card?.h||(width<=400?340:350);
   for(const [zoneLeft,zoneRight,zoneTop,zoneBottom]of [[8,width-8,8,form.top-16],[8,width-8,form.bottom+8,height-8],[8,form.left-16,8,height-8],[form.right+16,width-8,8,height-8]]){
    const left=Math.max(8,zoneLeft),right=Math.min(width-8,zoneRight),start=Math.max(8,zoneTop),end=Math.min(height-8,zoneBottom);
    if(right-left<w)continue;
    const h=Math.min(preferredHeight,end-start-32);if(h<96)continue;
    const x=clamp(desired.x+40-w,left,right-w),y=clamp(desired.y,start,end-h-32);
    placements.push({x,y:y+32,w,h,distance:(x+w-40-desired.x)**2+(y-desired.y)**2});
   }
   placements.sort((a,b)=>a.distance-b.distance);const best=placements[0];
   card=best?{x:best.x,y:best.y,w:best.w,h:best.h}:null;
  }
  return {orb:card?{x:card.x+card.w-40,y:card.y-32,w:44,h:44}:orb,card};
 };
})();
