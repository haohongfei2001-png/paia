/* PAIA website. Native scroll; no model calls, trackers, storage or archive access. */
(() => {
  'use strict';
  const menu = document.querySelector('.mobile-menu');
  if (menu) {
    const trigger = menu.querySelector('summary');
    const close = restore => { menu.open = false; if (restore) trigger.focus(); };
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.open) { e.preventDefault(); close(true); } });
    document.addEventListener('pointerdown', e => { if (menu.open && !menu.contains(e.target)) close(false); });
    menu.addEventListener('click', e => { if (e.target.closest('a')) close(false); });
  }
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let manualPause = false;
  const motionOK = () => !reduce.matches && !manualPause;
  const finiteAnimations = new Set();
  function animateOnce(el, keyframes, options) {
    if (!motionOK() || !el?.animate) return;
    const animation = el.animate(keyframes, options);
    finiteAnimations.add(animation);
    animation.finished.catch(() => {}).finally(() => finiteAnimations.delete(animation));
  }
  function cancelMotion() {
    for (const animation of finiteAnimations) animation.cancel();
    finiteAnimations.clear();
  }
  reduce.addEventListener('change', () => { if (reduce.matches) cancelMotion(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelMotion(); });

  const sequence = document.querySelector('[data-hero-sequence]');
  if (sequence) {
    const desktop = matchMedia('(min-width: 1200px)');
    const inner = sequence.querySelector('.hero-inner');
    const collection = sequence.querySelector('.collection');
    const nodes = [...sequence.querySelectorAll('[data-arrival]')];
    const cue = sequence.querySelector('[data-scroll-collection]');
    const toggle = sequence.querySelector('[data-motion-toggle]');
    const starts = {field:.18,'card-gpt':.07,'card-note':.19,'card-claude':.3,'card-gemini':.39,lines:.4,sheets:.57,paia:.62};
    const angles = {'card-gpt':-4,'card-note':4,'card-claude':-3,'card-gemini':5,paia:0,lines:0,field:0};
    const offsets = {'card-gpt':[-55,125],'card-note':[45,145],'card-claude':[-40,95],'card-gemini':[60,125],paia:[0,75]};
    let queued = false, lastProgress = -1, lastActive = null;
    const clamp = x => Math.min(1,Math.max(0,x));
    const ease = x => x*x*(3-2*x);
    const reveal = x => 1-Math.pow(1-x,3);
    function draw() {
      queued = false;
      const large = parseFloat(getComputedStyle(root).fontSize) > 20;
      const active = desktop.matches && motionOK() && !large;
      root.classList.toggle('large-text',large);
      root.classList.toggle('hero-motion',active);
      root.classList.add('motion-available');
      root.classList.toggle('motion-paused',manualPause);
      toggle.setAttribute('aria-pressed',String(manualPause || reduce.matches));
      toggle.disabled=reduce.matches;
      toggle.textContent=reduce.matches ? (document.body.dataset.language==='zh'?'已遵循系统减少动效设置':'System reduced motion is on') : (document.body.dataset.language==='zh' ? (manualPause?'恢复动效':'减少动效') : (manualPause?'Resume motion':'Reduce motion'));
      if (!active) {
        inner.style.removeProperty('--copy-x'); inner.style.removeProperty('--intro'); inner.style.removeProperty('--complete');
        collection.removeAttribute('inert'); collection.removeAttribute('aria-hidden');
        nodes.forEach(node => {node.style.removeProperty('opacity');node.style.removeProperty('transform');node.style.removeProperty('--line-rest');});
        sequence.dataset.progress = '1'; lastActive = false; return;
      }
      const distance = Math.max(1,sequence.offsetHeight-(innerHeight-88));
      const progress = clamp((scrollY-sequence.offsetTop+88)/distance);
      if (progress === lastProgress && lastActive === true) return;
      lastProgress = progress; lastActive = true;
      const intro = 1-ease(clamp(progress/.53));
      const initialWidth=innerWidth<=1399?690:780;
      inner.style.setProperty('--copy-x',`${Math.max(0,(inner.clientWidth-initialWidth)/2)*intro}px`);
      inner.style.setProperty('--intro',intro.toFixed(5));
      inner.style.setProperty('--complete',reveal(clamp((progress-.86)/.14)).toFixed(5));
      nodes.forEach(node => {
        const kind=node.dataset.arrival;
        const local=reveal(clamp((progress-(starts[kind] || 0))/.28));
        const [x,y]=offsets[kind] || [0,0];
        node.style.opacity=local.toFixed(5);
        node.style.transform=`translate3d(${(x*(1-local)).toFixed(2)}px,${(y*(1-local)).toFixed(2)}px,0) rotate(${((angles[kind]||0)+(1-local)*-5).toFixed(2)}deg)`;
        if(kind==='lines') node.style.setProperty('--line-rest',(1-local).toFixed(5));
      });
      collection.toggleAttribute('inert',progress < .96);
      if(progress < .96) collection.setAttribute('aria-hidden','true'); else collection.removeAttribute('aria-hidden');
      cue.toggleAttribute('inert',progress>=.96);
      sequence.dataset.progress=progress.toFixed(4);
    }
    function schedule(){if(!queued && !document.hidden){queued=true;requestAnimationFrame(draw);}}
    addEventListener('scroll',schedule,{passive:true});
    addEventListener('resize',()=>{lastActive=null;schedule();},{passive:true});
    addEventListener('pageshow',()=>{lastActive=null;schedule();});
    document.fonts?.ready.then(()=>{lastActive=null;schedule();});
    function updatePreference() {
      // Keep the reader's current scene anchored when the sticky runway is removed.
      const wasActive=root.classList.contains('hero-motion');
      const previousHeight=sequence.offsetHeight;
      const previousScroll=scrollY;
      const sceneTop=sequence.offsetTop-88;
      const pastScene=previousScroll>sceneTop+previousHeight-(innerHeight-88);
      lastActive=null;draw();
      if(wasActive!==root.classList.contains('hero-motion')) {
        const delta=sequence.offsetHeight-previousHeight;
        scrollTo({top:pastScene?Math.max(0,previousScroll+delta):Math.max(0,sceneTop),behavior:'instant'});
        lastProgress=-1;draw();
      }
    }
    reduce.addEventListener('change',updatePreference);
    desktop.addEventListener('change',()=>{lastActive=null;draw();});
    toggle.addEventListener('click',()=>{manualPause=!manualPause;cancelMotion();updatePreference();});
    cue?.addEventListener('click',e=>{
      if(root.classList.contains('hero-motion')){
        e.preventDefault();
        scrollTo({top:sequence.offsetTop+sequence.offsetHeight-(innerHeight-88)-88,behavior:motionOK()?'smooth':'auto'});
      }
    });
    draw();
  }

  // Never hide content waiting for JavaScript, a timer, or a scroll observer.
  // These bounded entrances animate from a nearby position; normal flow is final.
  if ('IntersectionObserver' in window) {
    const observer=new IntersectionObserver(entries=>{
      for (const entry of entries) {
        if(!entry.isIntersecting) continue;
        const el=entry.target;
        animateOnce(el,[{opacity:.55,transform:'translateY(24px)'},{opacity:1,transform:'translateY(0)'}],{duration:650,easing:'cubic-bezier(.18,.72,.25,1)'});
        const symbol=el.querySelector('.art-icon');
        if(symbol && el.closest('.benefits')) {
          symbol.querySelectorAll('path,circle').forEach((part,i)=>{
            part.setAttribute('pathLength','1');
            animateOnce(part,[{strokeDasharray:'1',strokeDashoffset:1},{strokeDasharray:'1',strokeDashoffset:0}],{duration:700,delay:i*55,easing:'cubic-bezier(.2,.7,.2,1)'});
          });
        }
        observer.unobserve(el);
      }
    },{threshold:.16});
    document.querySelectorAll('[data-reveal],.journal-item').forEach(el=>observer.observe(el));
    if (innerWidth<1200) document.querySelectorAll('.input-card,.synthesis-card').forEach(el=>observer.observe(el));
    const theatre=document.querySelector('[data-theatre]');
    if(theatre){
      const stageObserver=new IntersectionObserver(entries=>{
        if(!entries.some(e=>e.isIntersecting))return;
        if(innerWidth>=1200) animateOnce(theatre.querySelector('.app-shell'),[
          {opacity:.7,transform:'translateY(45px) rotateX(5deg)'},
          {opacity:1,transform:'translateY(0) rotateX(0)'}
        ],{duration:950,easing:'cubic-bezier(.18,.72,.25,1)'});
        stageObserver.disconnect();
      },{threshold:.22});
      stageObserver.observe(theatre);
    }
  }
  const field = document.querySelector('[data-v3-context]');
  if (!field) return;
  const fragments=[...field.querySelectorAll('[data-v3-fragment]')];
  const list=field.querySelector('[data-v3-list]');
  const count=field.querySelector('[data-v3-count]');
  const en=field.dataset.language==='en';
  const copyButton=field.querySelector('[data-mini-copy]');
  const copyStatus=field.querySelector('[data-copy-status]');
  let revision=0;
  function render(){
    revision++;
    if(copyStatus) copyStatus.textContent='';
    const selected=fragments.filter(b=>b.getAttribute('aria-pressed')==='true');
    copyButton.disabled=selected.length===0;
    field.querySelectorAll('[data-context-wire]').forEach(w=>w.classList.toggle('is-selected',selected.some(b=>b.dataset.fragmentId===w.dataset.contextWire)));
    count.textContent=`${selected.length} / ${fragments.length}`;
    list.replaceChildren();
    for(const button of selected){const item=document.createElement('span');item.textContent=button.querySelector('.v3-fragment-copy').textContent.trim();item.dataset.contextFragment=button.dataset.fragmentId;list.append(item);}
    if(!selected.length){const item=document.createElement('span');item.textContent=en?'Nothing selected. Nothing is added automatically.':'没有选中内容，也不会自动添加。';list.append(item);}
  }
  fragments.forEach(button=>{
    button.disabled=false;
    button.addEventListener('click',()=>{
      const adding=button.getAttribute('aria-pressed')!=='true';
      button.setAttribute('aria-pressed',String(adding));render();
      const target=[...list.children].find(item=>item.dataset.contextFragment===button.dataset.fragmentId);
      const wire=field.querySelector(`[data-context-wire="${button.dataset.fragmentId}"]`);
      if(wire && adding) animateOnce(wire,[{strokeDashoffset:1},{strokeDashoffset:0}],{duration:480,easing:'ease-out'});
      if(!adding || !target || !motionOK()) return;
      const from=button.getBoundingClientRect(),to=target.getBoundingClientRect();
      if(to.top<0 || to.bottom>innerHeight || from.top<0) return;
      const token=document.createElement('span');token.className='selection-transfer';
      token.textContent=button.querySelector('strong').textContent;
      token.setAttribute('aria-hidden','true');token.inert=true;
      token.style.left=`${from.x+28}px`;token.style.top=`${from.y+10}px`;
      document.body.append(token);
      const flight=token.animate([{opacity:0,transform:'translate(0,0)'},{opacity:1,offset:.16},{opacity:0,transform:`translate(${to.x-from.x-28}px,${to.y-from.y-10}px)`}],{duration:550,easing:'cubic-bezier(.2,.7,.2,1)'});
      finiteAnimations.add(flight);
      flight.finished.catch(()=>{}).finally(()=>{token.remove();finiteAnimations.delete(flight);});
    });
  });
  const tabs=[...field.querySelectorAll('[data-mini-tab]')];
  function activate(index,focus=false){
    const active=(index+tabs.length)%tabs.length;
    tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===active));tab.tabIndex=i===active?0:-1;field.querySelector(`[data-mini-panel="${tab.dataset.miniTab}"]`).hidden=i!==active;});
    if(focus)tabs[active].focus();
  }
  tabs.forEach((tab,i)=>{tab.disabled=false;tab.addEventListener('click',()=>activate(i));tab.addEventListener('keydown',e=>{const next={ArrowDown:i+1,ArrowRight:i+1,ArrowUp:i-1,ArrowLeft:i-1,Home:0,End:tabs.length-1}[e.key];if(next!==undefined){e.preventDefault();activate(next,true);}});});
  field.querySelector('[data-mini-search]').disabled=false;
  field.querySelector('[data-mini-search]').addEventListener('input',e=>{
    const query=e.target.value.trim().toLocaleLowerCase();let visible=0;
    fragments.forEach(b=>{b.hidden=!b.textContent.toLocaleLowerCase().includes(query);if(!b.hidden)visible++;});
    field.querySelector('[data-mini-empty]').hidden=visible!==0;
  });
  copyButton?.addEventListener('click',async()=>{
    const selected=fragments.filter(b=>b.getAttribute('aria-pressed')==='true');
    if(!selected.length) return;
    const text=selected.map(b=>b.querySelector('.v3-fragment-copy').textContent.trim()).join('\n\n');
    const current=revision;
    try {
      if(!navigator.clipboard?.writeText) throw new Error('clipboard-unavailable');
      await navigator.clipboard.writeText(text);
      if(current===revision) copyStatus.textContent=en?'Copied. Nothing was sent to AI.':'已复制，未发送给 AI。';
    } catch {
      if(current===revision) copyStatus.textContent=en?'Copy unavailable. Select and copy the preview text.':'暂时无法自动复制，请选择预览文字后复制。';
    }
  });
  // Selection feedback follows the actual state; no simulated inference or spinner.
  fragments.forEach(button=>button.addEventListener('click',()=>{
    animateOnce(field.querySelector('.context-preview'),[{transform:'translateY(5px)'},{transform:'translateY(0)'}],{duration:280,easing:'ease-out'});
  }));
  render();
})();
