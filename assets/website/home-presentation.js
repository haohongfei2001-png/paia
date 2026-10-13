/* Homepage owns presentation only. No editing, storage, provider or send.
   Independent demo.html keeps its original controllers. */
(() => {
  'use strict';
  if(document.body.dataset.homeMode!=='presentation')return;
  const body=document.body;
  const thought=document.querySelector('[data-scroll-story="thought"]');
  const prompt=document.querySelector('[data-scroll-story="prompt"]');
  const sheet=thought.querySelector('.ad-thought-scenes');
  const host=prompt.querySelector('[data-ad-host]');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const narrow=matchMedia('(max-width: 640px)');
  let queued=false;
  const phase=(el,value)=>{if(el.dataset.phase!==value)el.dataset.phase=value;};
  const visible=(el,show)=>{const value=String(!show);if(el.getAttribute('aria-hidden')!==value)el.setAttribute('aria-hidden',value);};
  function accessibility(staticView){
    const reading=staticView||narrow.matches||thought.dataset.phase!=='cards';
    const organized=thought.dataset.phase==='organize';
    visible(thought.querySelector('[data-topic-overview]'),staticView||narrow.matches||!reading);
    visible(sheet,reading);
    visible(thought.querySelector('[data-story-original]'),reading&&!organized);
    visible(thought.querySelector('[data-story-organized]'),reading&&organized);
    visible(thought.querySelector('.ad-original-cue'),reading&&!organized);
    visible(thought.querySelector('.ad-ai-cue'),reading&&organized);
    visible(prompt.querySelector('.pc-palette'),prompt.dataset.phase==='board');
    visible(prompt.querySelector('.ad-morph-track'),prompt.dataset.phase!=='board');
    visible(prompt.querySelector('.hp-composer-phrase'),prompt.dataset.phase==='board');
  }
  function travel(track){
    const top=parseFloat(getComputedStyle(track.querySelector('.ad-scroll-sticky')).top)||105;
    return Math.max(0,top-track.getBoundingClientRect().top);
  }
  function geometry(){
    const r=host.getBoundingClientRect(),composer=host.querySelector('.pc-composer').getBoundingClientRect();
    const wrap=host.querySelector('.pc-palette-wrap');
    const bottom=Math.round(r.bottom-composer.top+14),width=host.clientWidth<=400?322:336;
    if(wrap.style.bottom!==bottom+'px')wrap.style.bottom=bottom+'px';
    if(wrap.style.width!==width+'px')wrap.style.width=width+'px';
  }
  function draw(){
    queued=false;body.classList.toggle('hp-static',reduced.matches);
    if(reduced.matches){phase(thought,'organize');phase(prompt,'board');}
    else if(narrow.matches){
      phase(thought,sheet.getBoundingClientRect().top<innerHeight*.26?'organize':'open');
      const p=innerHeight-host.getBoundingClientRect().top;
      phase(prompt,p<innerHeight*.42?'orb':p<innerHeight*.82?'capsule':'board');
    }else{
      const t=travel(thought),p=travel(prompt);
      phase(thought,t<72?'cards':t<248?'open':'organize');
      phase(prompt,p<72?'orb':p<240?'capsule':'board');
    }
    accessibility(reduced.matches);geometry();
  }
  function schedule(){if(!queued){queued=true;requestAnimationFrame(draw);}}
  body.classList.add('hp-ready');
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule,{passive:true});
  addEventListener('pageshow',schedule);
  reduced.addEventListener('change',schedule);narrow.addEventListener('change',schedule);
  if('ResizeObserver'in window){const observer=new ResizeObserver(schedule);observer.observe(host);observer.observe(host.querySelector('.pc-composer'));}
  document.fonts.ready.then(schedule);schedule();
})();
