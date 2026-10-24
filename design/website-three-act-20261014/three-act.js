/* A choreography, not a second app. All entries are the existing public examples.
   No user data, input fields, timers, providers, permission changes or messages.
   Scroll remains native and reversible. Only one rAF is scheduled per event.
*/
(() => {
 'use strict';
 const body=document.body, story=document.querySelector('.three-story'), stage=document.querySelector('.three-stage');
 if(!story||body.dataset.threeAct!=='design')return;
 const actors=Object.fromEntries([...stage.querySelectorAll('[data-actor]')].map(el=>[el.dataset.actor,el]));
 const captions=Object.fromEntries([...stage.querySelectorAll('[data-caption]')].map(el=>[el.dataset.caption,el]));
 const narrow=matchMedia('(max-width:1100px)'), reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const order=['archive','thought','writing','learning','chat','context'];
 const keys=['x','y','w','h','opacity','detail','angle'];
 const rect=(...values)=>Object.fromEntries(keys.map((k,i)=>[k,values[i]??0]));
 const off={archive:rect(-330,440,286,330,0,0,-2),thought:rect(630,190,200,285,0,0,0),writing:rect(795,215,184,270,0,0,2),learning:rect(995,250,184,270,0,0,-1),chat:rect(1260,225,600,480,0,1,0),context:rect(45,770,500,390,0,1,0)};
 const frame=(at,name,objects,other={})=>({at,name,actors:{...off,...objects},caption:null,open:0,organized:0,capsule:0,board:0,draft:0,overview:0,glow:0,...other});
 const ARCHIVE=rect(540,113,602,518,1,1,0);
 const T_CARD=rect(565,240,187,280,1,0,-1.2);
 const T_READ=rect(637,50,479,658,1,1,0);
 const CHAT=rect(468,104,715,557,1,1,0);
 const CTX=rect(572,164,590,448,1,1,0);
 const parkArchive=rect(-390,565,270,276,0,0,-3);
 const parkThought=rect(-380,536,247,326,0,0,-2);
 const overview={archive:rect(15,170,290,325,1,0,0),thought:rect(348,158,397,505,1,0,0),writing:rect(820,64,140,165,0,0,2),learning:rect(1000,70,140,165,0,0,-1),chat:rect(786,225,399,390,1,0,0),context:rect(15,537,290,137,1,0,0)};
 const frames=[
  frame(0,'archive',{archive:ARCHIVE},{caption:'archive'}),
  frame(400,'topics',{archive:parkArchive,thought:T_CARD,writing:rect(772,196,187,280,1,0,1.3),learning:rect(977,247,187,280,1,0,-.4)},{caption:'thought'}),
  frame(750,'original',{archive:parkArchive,thought:T_READ,writing:rect(1180,130,155,230,0,0,3),learning:rect(1320,160,155,230,0,0,4)},{caption:'thought',open:1}),
  frame(1110,'organized',{archive:parkArchive,thought:T_READ},{caption:'thought',open:1,organized:1,glow:1}),
  frame(1460,'orb',{archive:rect(-400,610,240,190,0,0,-4),thought:parkThought,chat:CHAT},{caption:'prompt',open:1,organized:1}),
  frame(1620,'capsule',{thought:parkThought,chat:CHAT},{caption:'prompt',open:1,organized:1,capsule:1}),
  frame(1860,'board',{thought:parkThought,chat:CHAT},{caption:'prompt',open:1,organized:1,capsule:1,board:1,draft:1}),
  frame(2240,'context',{thought:rect(-380,520,240,320,0,0,-3),chat:rect(1230,360,420,390,0,0,2),context:CTX},{caption:'context',open:1,organized:1,capsule:1,board:1,draft:1}),
  frame(2690,'overview',overview,{open:1,organized:1,capsule:1,board:1,draft:1,overview:1}),
  frame(3120,'overview',overview,{open:1,organized:1,capsule:1,board:1,draft:1,overview:1})
 ];
 const mix=(a,b,p)=>a+(b-a)*p;
 const clamp=n=>Math.max(0,Math.min(1,n));
 const smooth=t=>t*t*(3-2*t);
 let scheduled=false, lastDistance=NaN;
 function locate(distance){
  let i=0;while(i<frames.length-2&&distance>frames[i+1].at)i++;
  const a=frames[i],b=frames[i+1];
  const raw=clamp((distance-a.at)/(b.at-a.at));
  // A brief stable reading interval precedes each transition. No scroll capture.
  const progress=a.name===b.name?raw:smooth(clamp((raw-.27)/.73));
  return {a,b,raw,progress};
 }
 function visibility(el,on){el.style.visibility=on?'visible':'hidden';el.setAttribute('aria-hidden',on?'false':'true');}
 function render(distance){
  const {a,b,progress:p,raw}=locate(distance);
  for(const key of order){
   const el=actors[key],start=a.actors[key],end=b.actors[key];
   const state=Object.fromEntries(keys.map(k=>[k,mix(start[k],end[k],p)]));
   el.style.transform=`translate3d(${state.x.toFixed(2)}px,${state.y.toFixed(2)}px,0) rotate(${state.angle.toFixed(3)}deg)`;
   el.style.width=state.w.toFixed(2)+'px';el.style.height=state.h.toFixed(2)+'px';el.style.opacity=state.opacity.toFixed(4);el.style.setProperty('--detail',state.detail.toFixed(4));
   el.classList.toggle('is-condensed',state.detail<.18);
   visibility(el,state.opacity>.012);
   if(key==='chat'){
    el.style.setProperty('--board-width',mix(264,336,state.detail)+'px');
    el.style.setProperty('--capsule-width',mix(196,236,state.detail)+'px');
   }
  }
  for(const [key,el] of Object.entries(captions)){
   const opacity=a.caption===b.caption?(a.caption===key?1:0):(a.caption===key?1-smooth(clamp(p*2)):b.caption===key?smooth(clamp((p-.38)/.62)):0);
   el.style.opacity=opacity.toFixed(4);el.style.transform=`translateY(${((1-opacity)*10).toFixed(2)}px)`;visibility(el,opacity>.01);
  }
  const values={};
  for(const property of ['open','organized','capsule','board','draft','overview'])values[property]=mix(a[property],b[property],p);
  for(const property of ['open','organized'])actors.thought.style.setProperty('--'+property,values[property].toFixed(4));
  for(const property of ['capsule','board','draft'])actors.chat.style.setProperty('--'+property,values[property].toFixed(4));
  const og=values.overview;
  for(const el of stage.querySelectorAll('.scene-overview-title,.scene-overview-footer')){
   el.style.opacity=og.toFixed(4);el.style.transform=`translateY(${((1-og)*14).toFixed(2)}px)`;visibility(el,og>.01);
  }
  const beam=stage.querySelector('.thought-sweep');
  // The light crosses this SAME sheet, and then vanishes. No endless glow.
  const sweep=(a.name==='original'&&b.name==='organized')?Math.sin(p*Math.PI):0;
  beam.style.opacity=(sweep*.8).toFixed(4);beam.style.transform=`translateX(${mix(-56,54,p)}%) rotate(-18deg)`;
  stage.querySelector('.scene-light').style.opacity=(.45+.35*og+.2*sweep).toFixed(3);
  stage.dataset.scene=p>.55?b.name:a.name;stage.dataset.distance=distance.toFixed(1);
  stage.querySelector('.thought-card-face').setAttribute('aria-hidden',values.open>.5?'true':'false');
  stage.querySelector('.thought-original').setAttribute('aria-hidden',values.organized>.5||values.open<.5?'true':'false');
  stage.querySelector('.thought-organized').setAttribute('aria-hidden',values.organized>.5&&values.open>.5?'false':'true');
  stage.querySelector('.scene-board').setAttribute('aria-hidden',values.board>.5?'false':'true');
  stage.querySelector('.scene-capsule').setAttribute('aria-hidden',values.capsule>.5&&values.board<.5?'false':'true');
 }
 function staticMode(){
  for(const el of [...Object.values(actors),...Object.values(captions),...stage.querySelectorAll('.scene-overview-title,.scene-overview-footer')]){
   el.removeAttribute('style');el.removeAttribute('aria-hidden');el.classList.remove('is-condensed');
  }
  actors.thought.style.setProperty('--organized',1);actors.thought.style.setProperty('--open',1);
  for(const el of stage.querySelectorAll('.thought-organized,.scene-board'))el.setAttribute('aria-hidden','false');
  stage.querySelector('.thought-original').setAttribute('aria-hidden','true');stage.querySelector('.thought-card-face').setAttribute('aria-hidden','true');
 }
 function frameTick(){
  scheduled=false;
  const enabled=!narrow.matches&&!reduced.matches&&innerHeight>=620;
  const changed=body.classList.contains('three-motion')!==enabled;
  body.classList.toggle('three-motion',enabled);
  if(!enabled){if(changed||!body.dataset.threeReady)staticMode();body.dataset.threeReady='true';return;}
  const header=document.querySelector('.site-header');
  const top=Math.max(82,Math.round(header?.getBoundingClientRect().height||98));
  const view=innerHeight-top;
  const scale=Math.min(1,(innerWidth-80)/1200,(view-18)/740);
  story.style.setProperty('--scene-top',top+'px');story.style.setProperty('--scene-view',view+'px');story.style.setProperty('--scene-scale',scale.toFixed(5));
  const distance=clamp((top-story.getBoundingClientRect().top)/3120)*3120;
  if(distance!==lastDistance||changed){render(distance);lastDistance=distance;}
  body.dataset.threeReady='true';
 }
 function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(frameTick);}}
 function jumpHash(){
  const map={overview:2690,reuse:1620,original:750,organized:1110,context:2240,topics:400};
  const name=location.hash.slice(1);if(!(name in map))return;
  schedule();requestAnimationFrame(()=>{
   if(body.classList.contains('three-motion')){
    const top=parseFloat(getComputedStyle(story).getPropertyValue('--scene-top'))||98;
    scrollTo({top:story.getBoundingClientRect().top+scrollY-top+map[name],behavior:'instant'});
   }else (name==='overview'?stage.querySelector('.scene-overview-title'):name==='context'?actors.context:name==='reuse'?actors.chat:actors.thought).scrollIntoView({behavior:'instant'});
  });
 }
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',()=>{lastDistance=NaN;schedule();},{passive:true});addEventListener('pageshow',schedule);addEventListener('hashchange',jumpHash);
 reduced.addEventListener('change',()=>{lastDistance=NaN;schedule();});narrow.addEventListener('change',()=>{lastDistance=NaN;schedule();});
 document.fonts.ready.then(()=>{lastDistance=NaN;schedule();if(location.hash)jumpHash();});schedule();
})();
