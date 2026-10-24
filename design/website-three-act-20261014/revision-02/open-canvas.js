/* Open-canvas design, revision 02. The page scrolls, not a virtual stage.
   Read geometry only on resize/font changes. During scroll write transform and
   opacity only; never width, height, padding, font size or a scaled design canvas.
   No wheel interception, inertial scroll emulator, timers, private data or services. */
(() => {
 'use strict';
 if(document.body.dataset.openCanvas!=='design')return;
 const body=document.body;
 const reading=document.querySelector('.oc-reading-run');
 const chat=document.querySelector('.oc-chat-run');
 const original=document.querySelector('.oc-original');
 const organized=document.querySelector('.oc-organized');
 const originalLabel=document.querySelector('.oc-state-original');
 const organizedLabel=document.querySelector('.oc-state-organized');
 const sheen=document.querySelector('.oc-journal-sheen');
 const capsuleBg=document.querySelector('.oc-capsule-bg');
 const capsuleText=document.querySelector('.oc-capsule-text');
 const board=document.querySelector('.oc-board');
 const placeholder=document.querySelector('.oc-composer-placeholder');
 const phrase=document.querySelector('.oc-composer-text');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const clamp=n=>Math.max(0,Math.min(1,n));
 let active=false,measureQueued=false,frameQueued=false,readStart=0,chatStart=0;
 const last=new WeakMap();
 function paint(el,property,value){
  const state=last.get(el)||{};
  if(state[property]===value)return;
  el.style[property]=value;state[property]=value;last.set(el,state);
 }
 function show(el,yes){const s=yes?'false':'true';if(el.getAttribute('aria-hidden')!==s)el.setAttribute('aria-hidden',s);}
 function opacity(el,n){paint(el,'opacity',n.toFixed(4));}
 function draw(){
  frameQueued=false;
  const y=scrollY;
  const r=active?clamp((y-readStart)/280):1;
  const c=active?clamp((y-chatStart)/260):1;
  const o=active?clamp((r-.12)/.55):1;
  opacity(original,1-o);opacity(organized,o);
  paint(original,'transform',`translate3d(0,${(-o*6).toFixed(3)}px,0)`);
  paint(organized,'transform',`translate3d(0,${((1-o)*6).toFixed(3)}px,0)`);
  opacity(originalLabel,1-o);opacity(organizedLabel,o);
  show(original,active&&o<.5);show(organized,!active||o>=.5);
  show(originalLabel,active&&o<.5);show(organizedLabel,!active||o>=.5);
  opacity(sheen,active?Math.sin(r*Math.PI)*.58:0);
  paint(sheen,'transform',`translate3d(${(-45+r*90).toFixed(2)}%,0,0)`);
  const cap=clamp(c*2.35),b=clamp((c-.48)/.48);
  opacity(capsuleBg,cap*(1-b));
  paint(capsuleBg,'transform',`scaleX(${(.145+cap*.855).toFixed(4)})`);
  opacity(capsuleText,clamp((cap-.3)/.7)*(1-b));
  opacity(board,b);paint(board,'transform',`translate3d(0,${((1-b)*9).toFixed(3)}px,0)`);
  opacity(phrase,b);opacity(placeholder,1-b);
  show(capsuleText,cap>.7&&b<.5);show(board,b>=.5);show(phrase,b>=.5);show(placeholder,b<.5);
  reading.dataset.state=o<.5?'original':'organized';chat.dataset.state=c<.32?'orb':b<.5?'capsule':'board';
 }
 function schedule(){if(!frameQueued){frameQueued=true;requestAnimationFrame(draw);}}
 function measure(){
  measureQueued=false;
  const font=parseFloat(getComputedStyle(document.documentElement).fontSize);
  active=innerWidth>1100&&innerHeight>=820&&font<=20&&!reduced.matches;
  body.classList.toggle('oc-motion',active);
  // These reads are a one-time response to geometry changes, not wheel frames.
  readStart=reading.getBoundingClientRect().top+scrollY-108;
  chatStart=chat.getBoundingClientRect().top+scrollY-108;
  schedule();
 }
 function requestMeasure(){if(!measureQueued){measureQueued=true;requestAnimationFrame(measure);}}
 addEventListener('scroll',schedule,{passive:true});
 addEventListener('resize',requestMeasure,{passive:true});
 addEventListener('pageshow',requestMeasure);
 reduced.addEventListener('change',requestMeasure);
 document.fonts.ready.then(requestMeasure);
 body.dataset.canvasReady='true';requestMeasure();
})();
