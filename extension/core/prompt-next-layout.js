// A suggestion never relocates the accepted orb/card or overlaps the host composer.
(() => {
 const overlap=(a,b)=>b&&a.x<b.x+b.w+8&&a.x+a.w>b.x-8&&a.y<b.y+b.h+8&&a.y+a.h>b.y-8;
 globalThis.PAIANextPromptLayout=(width,height,orb,card,form,wantedHeight=160)=>{
  if(!orb||!form)return null;
  const w=Math.min(336,width-16),h=Math.min(wantedHeight,height-16),anchor=card||orb;
  const x=Math.max(8,Math.min(width-w-8,anchor.x+anchor.w-w));
  const positions=[{x,y:anchor.y-h-12},{x,y:anchor.y+anchor.h+12},{x:anchor.x-w-12,y:anchor.y},{x:anchor.x+anchor.w+12,y:anchor.y}];
  return positions.map(p=>({...p,w,h})).find(p=>p.x>=8&&p.y>=8&&p.x+w<=width-8&&p.y+h<=height-8&&![orb,card,form].some(b=>overlap(p,b)))||null;
 };
})();
