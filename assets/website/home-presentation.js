/* Homepage presentation only. No editing, storage, provider, input or send.
   The independent demo retains its original controller and real sample actions. */
(() => {
  'use strict';
  if(document.body.dataset.homeMode!=='presentation')return;
  const body=document.body;
  const thought=document.querySelector('[data-scroll-story="thought"]');
  const prompt=document.querySelector('[data-scroll-story="prompt"]');
  if(!thought||!prompt)return;
  const sheet=thought.querySelector('.ad-thought-scenes');
  const host=prompt.querySelector('[data-ad-host]');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const narrow=matchMedia('(max-width: 640px)');
  const footer=thought.querySelector('.ad-document-source');
  let queued=false,layoutDirty=true,sequence=[],sequencePhase='';
  const phase=(el,value)=>{if(el.dataset.phase!==value)el.dataset.phase=value;};
  const visible=(el,show)=>{if(!el)return;const value=String(!show);if(el.getAttribute('aria-hidden')!==value)el.setAttribute('aria-hidden',value);};
  function cancelSequence(){sequence.forEach(clearTimeout);sequence=[];}
  function step(value){if(prompt.dataset.demoStep!==value)prompt.dataset.demoStep=value;}
  function promptSequence(){
    const current=prompt.dataset.phase;
    if(reduced.matches||document.hidden){cancelSequence();step(current==='board'?'filled':'idle');sequencePhase=current;return;}
    if(current===sequencePhase)return;
    cancelSequence();sequencePhase=current;
    if(current!=='board'){step('idle');return;}
    step('show');
    sequence.push(setTimeout(()=>{if(prompt.dataset.phase==='board')step('selected');},260));
    sequence.push(setTimeout(()=>{
      if(prompt.dataset.phase==='board'){step('filled');visible(prompt.querySelector('.hp-composer-phrase'),true);}
      sequence=[];
    },640));
  }
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
    visible(prompt.querySelector('.hp-composer-phrase'),prompt.dataset.phase==='board'&&prompt.dataset.demoStep==='filled');
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
    if(!layoutDirty)return;
    layoutDirty=false;
    const documentBox=thought.querySelector('.ad-thought-expanded');
    const header=thought.querySelector('.ad-document-header');
    const pages=thought.querySelector('.ad-document-pages');
    const raw=thought.querySelector('[data-story-original]');
    const organized=thought.querySelector('[data-story-organized]');
    const s=getComputedStyle(documentBox),f=getComputedStyle(footer),p=getComputedStyle(pages);
    const contentHeight=element=>{
      return Math.max(0,...[...element.children].map(child=>child.offsetTop+child.offsetHeight+parseFloat(getComputedStyle(child).marginBottom)));
    };
    const required=Math.ceil(parseFloat(s.paddingTop)+parseFloat(s.paddingBottom)+header.offsetHeight+
      Math.max(contentHeight(raw),contentHeight(organized))+parseFloat(p.marginTop)+footer.offsetHeight+parseFloat(f.marginTop)+4);
    const value=required+'px';
    if(thought.style.getPropertyValue('--hp-reading-required')!==value)thought.style.setProperty('--hp-reading-required',value);
  }
  function draw(){
    queued=false;body.classList.toggle('hp-static',reduced.matches);geometry();
    if(reduced.matches){phase(thought,'organize');phase(prompt,'board');}
    else if(narrow.matches){
      // Use the actual end of the reading sheet, not its top. A 48px band
      // preserves a readable original/source state before the next result.
      const end=footer.getBoundingClientRect().bottom;
      if(end<=innerHeight-72)phase(thought,'organize');
      else if(end>innerHeight-24)phase(thought,'open');
      // The actual fixed anchor must enter the visible viewport before its
      // silhouette changes. Fast scrolling still reaches a complete outcome.
      const anchor=host.querySelector('.pc-palette-wrap').getBoundingClientRect();
      const seen=innerHeight-24-anchor.bottom;
      phase(prompt,seen<64?'orb':seen<176?'capsule':'board');
    }else{
      const t=travel(thought),p=travel(prompt);
      phase(thought,t<72?'cards':t<248?'open':'organize');
      phase(prompt,p<72?'orb':p<240?'capsule':'board');
    }
    promptSequence();accessibility(reduced.matches);
  }
  function schedule(){if(!queued){queued=true;requestAnimationFrame(draw);}}
  function resize(){layoutDirty=true;schedule();}
  body.classList.add('hp-ready');
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',resize,{passive:true});
  addEventListener('pageshow',resize);
  document.addEventListener('visibilitychange',schedule);
  reduced.addEventListener('change',()=>{sequencePhase='';resize();});
  narrow.addEventListener('change',resize);
  if('ResizeObserver'in window){
    const observer=new ResizeObserver(resize);
    observer.observe(host);observer.observe(host.querySelector('.pc-composer'));
    observer.observe(thought.querySelector('.ad-document-header'));
    observer.observe(thought.querySelector('[data-story-original]'));
    observer.observe(thought.querySelector('[data-story-organized]'));
  }
  document.fonts.ready.then(resize);schedule();
})();
