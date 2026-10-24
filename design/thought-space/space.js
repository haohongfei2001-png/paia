/* Standalone visual study. Native scroll; no accounts, analytics, storage or AI. */
(()=>{'use strict';
 const root=document.documentElement, exp=document.querySelector('.experience'),stage=document.querySelector('.sticky-scene'),projection=document.querySelector('.projection'),reader=document.querySelector('.reader'),intro=document.querySelector('.intro');
 const cards=[...document.querySelectorAll('.topic')],views=[...document.querySelectorAll('[data-view]')],motion=document.querySelector('#motion-toggle');
 const reduce=matchMedia('(prefers-reduced-motion:reduce)');let still=reduce.matches,raf=0,lastP=0,pointerX=0,pointerY=0;
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t,smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
 const css=(el,k,v)=>el.style.setProperty(k,String(v));
 // Three quiet line-reliefs, generated once. Decorative: not a knowledge graph.
 const ns='http://www.w3.org/2000/svg';
 function filament(id,kind){const g=document.getElementById(id);for(let j=0;j<19;j++){
   let d='';const q=j/18;
   for(let i=0;i<=150;i++){const t=i/150*Math.PI*2;let x,y;
    if(kind===0){x=120+78*Math.cos(t)*(0.70+q*.3)+9*Math.sin(t*2);y=66+37*Math.sin(t)*(0.5+q*.5)+15*Math.cos(t)*(q-.5);}
    else if(kind===1){x=120+65*Math.cos(t)+15*Math.cos(t*2)*(q-.5);y=68+39*Math.sin(t)*(.35+q*.65)+21*Math.cos(t)*(q-.5);}
    else{x=120+82*Math.cos(t)*(.6+q*.4);y=68+25*Math.sin(t)+25*Math.sin(t*2)*(q-.5);}
    d+=(i?'L':'M')+x.toFixed(2)+' '+y.toFixed(2)+' ';
   }
   const path=document.createElementNS(ns,'path');path.setAttribute('d',d+'Z');path.setAttribute('opacity',String(.36+q*.27));g.appendChild(path);
 }}
 filament('writing-lines',0);filament('product-lines',1);filament('travel-lines',2);
 function paint(){raf=0;const mobile=innerWidth<=760,sh=stage.clientHeight,travel=Math.max(1,exp.offsetHeight-sh);const p=still?1:clamp(-exp.getBoundingClientRect().top/travel);lastP=p;
  const e=smooth(.22,.70,p),turn=smooth(.02,.83,p),reveal=smooth(.50,.67,p),width=mobile?Math.min(innerWidth-32,520):1180;
  const height=mobile?Math.round(mix(546,Math.min(704,sh-125),e)/2)*2:550;
  const fit=mobile?1:Math.min(mix(1.02,1,turn),(innerWidth-100)/1180,(sh-205)/560);
  css(root,'--progress',p.toFixed(4));css(root,'--expand',e.toFixed(4));css(root,'--board-w',width+'px');css(root,'--board-h',height+'px');css(root,'--fit',fit.toFixed(4));
  css(root,'--world-y',Math.round(sh*mix(.68,.51,turn))+'px');
  css(root,'--rx',(mix(mobile?12:13,0,turn)+(still?0:pointerY*.55))+'deg');css(root,'--ry',(mix(mobile?-8:-12,0,turn)+(still?0:pointerX*.65))+'deg');css(root,'--rz',mix(mobile?-3.5:-4,0,turn)+'deg');
  const ht=smooth(.09,.41,p);css(root,'--heading-opacity',1-ht);css(root,'--heading-y',(-55*ht)+'px');css(root,'--heading-scale',1-.08*ht);
  css(root,'--read-opacity',smooth(0,.3,reveal));css(root,'--reader-visibility',reveal>.001?'visible':'hidden');css(root,'--read-y',(1-reveal)*32+'px');css(root,'--read-z',(1-reveal)*65+'px');css(root,'--read-scale',mix(.9,1,reveal));
  reader.inert=reveal<.9;reader.setAttribute('aria-hidden',String(reveal<.02));
  const art=1-smooth(.03,.48,e),chapter=mobile?1-smooth(.05,.5,e):1;
  css(root,'--art-opacity',art);css(root,'--content-y',(-147*e)+'px');css(root,'--chapter-opacity',chapter);
  cards.forEach((card,i)=>{
   if(mobile){
    const cw=244,normal=[-166,(width-cw)/2,width-78][i],endX=12+i*(width-24)/3;
    card.style.left='0';card.style.top='0';card.style.width=mix(cw,(width-34)/3,e)+'px';card.style.height=mix(370,54,e)+'px';
    css(card,'--tx',mix(normal,endX,e)+'px');css(card,'--ty',mix(i===1?94:115,77,e)+'px');css(card,'--tz',mix(i===1?24:0,0,e)+'px');card.style.opacity=String(mix(i===1?1:.58,1,e));
    css(card,'--topic-font',mix(23,10.5,e)+'px');card.querySelector('.topic-content').style.padding=mix(24,10,e)+'px';
    card.querySelector('h2').style.marginBottom=mix(17,0,e)+'px';card.querySelector('.topic-art').style.height='128px';
   }else{
    card.style.left='0';card.style.top='0';const size=smooth(0,.55,e),shift=smooth(.15,1,e);card.style.width=mix(352,224,size)+'px';card.style.height=mix(382,118,size)+'px';
    css(card,'--tx',mix([32,414,796][i],32,shift)+'px');css(card,'--ty',mix(106,[98,238,378][i],shift)+'px');css(card,'--tz',mix(i===1?22:6,0,e)+'px');card.style.opacity='1';
    css(card,'--topic-font',mix(27,17,e)+'px');css(card,'--chapter-font',mix(13,10.5,e)+'px');card.querySelector('.topic-content').style.padding=mix(28,16,e)+'px';card.querySelector('h2').style.marginBottom=mix(18,7,e)+'px';card.querySelector('.chapter-list').style.gap=mix(10,3,e)+'px';
   }
  });
  if(mobile){reader.style.top='142px';reader.style.bottom='15px';}else{reader.style.top='94px';reader.style.bottom='26px';}
  const active=p<.28?0:p<.83?1:2;views.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===active)));
  document.body.dataset.view=String(active);if(p>=.84){css(root,'--rx','0deg');css(root,'--ry','0deg');css(root,'--rz','0deg');}document.body.dataset.motion=still?'static':'scroll';
 }
 function schedule(){if(!raf)raf=requestAnimationFrame(paint);}
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});
 stage.addEventListener('pointermove',e=>{if(still||e.pointerType==='touch')return;pointerX=clamp((e.clientX/innerWidth-.5)*2,-1,1);pointerY=clamp((e.clientY/innerHeight-.5)*2,-1,1);css(root,'--shine-x',(50+pointerX*20)+'%');css(root,'--shine-y',(25+pointerY*13)+'%');schedule();},{passive:true});
 stage.addEventListener('pointerleave',()=>{pointerX=pointerY=0;schedule();});
 function go(value){if(!reduce.matches)document.body.dataset.motion='scroll';if(still&&!reduce.matches){still=false;motion.setAttribute('aria-pressed','false');motion.setAttribute('aria-label','静态查看');}if(reduce.matches){still=true;schedule();return;}const y=exp.getBoundingClientRect().top+scrollY+value*(exp.offsetHeight-stage.clientHeight);scrollTo({top:y,behavior:'smooth'});schedule();}
 views.forEach(b=>b.addEventListener('click',()=>go(Number(b.dataset.view))));
 motion.addEventListener('click',()=>{still=reduce.matches||!still;document.body.dataset.motion=still?'static':'scroll';motion.setAttribute('aria-pressed',String(still));motion.setAttribute('aria-label',still?'恢复滚动动效':'静态查看');schedule();});
 document.querySelector('#restart').addEventListener('click',()=>go(0));
 document.querySelector('.skip').addEventListener('click',()=>{still=true;motion.setAttribute('aria-pressed','true');schedule();requestAnimationFrame(()=>reader.focus({preventScroll:true}));});
 reduce.addEventListener('change',()=>{still=reduce.matches;document.body.dataset.reduced=String(reduce.matches);document.body.dataset.motion=still?'static':'scroll';motion.setAttribute('aria-pressed',String(still));schedule();});
 document.body.dataset.reduced=String(reduce.matches);if(still)motion.setAttribute('aria-pressed','true');paint();document.body.dataset.ready='true';
})();
