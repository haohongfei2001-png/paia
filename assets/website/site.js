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
  const sequence = document.querySelector('[data-hero-sequence]');
  if (sequence) {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = matchMedia('(min-width: 1000px)');
    const root = document.documentElement;
    const inner = sequence.querySelector('.hero-inner');
    const collection = sequence.querySelector('.collection');
    const nodes = [...sequence.querySelectorAll('[data-arrival]')];
    const cue = sequence.querySelector('[data-scroll-collection]');
    const starts = {photo:.24,'card-gpt':.12,'card-note':.29,'card-claude':.4,'card-gemini':.5,lines:.55,paia:.66};
    const angles = {'card-gpt':-1,'card-note':1,'card-claude':-2,'card-gemini':1.5,paia:0,lines:0};
    let queued = false;
    const clamp = x => Math.min(1,Math.max(0,x));
    const ease = x => 1-Math.pow(1-x,3);
    function draw() {
      queued = false;
      const active = desktop.matches && !reduce.matches && parseFloat(getComputedStyle(root).fontSize) <= 20;
      root.classList.toggle('hero-motion',active);
      if (!active) {
        inner.style.removeProperty('--copy-x'); inner.style.removeProperty('--intro'); inner.style.removeProperty('--complete');
        collection.removeAttribute('inert'); collection.removeAttribute('aria-hidden');
        nodes.forEach(node => {node.style.removeProperty('opacity');node.style.removeProperty('transform');});
        sequence.dataset.progress = '1'; return;
      }
      const distance = Math.max(1,sequence.offsetHeight-innerHeight);
      const progress = clamp((scrollY-sequence.offsetTop+88)/distance);
      const copyProgress = ease(clamp(progress/.72));
      const intro = 1-copyProgress;
      const initialWidth = inner.clientWidth < 1120 ? 660 : 780;
      inner.style.setProperty('--copy-x',`${Math.max(0,(inner.clientWidth-initialWidth)/2)*intro}px`);
      inner.style.setProperty('--intro',intro.toFixed(5));
      inner.style.setProperty('--complete',ease(clamp((progress-.7)/.22)).toFixed(5));
      nodes.forEach(node => {
        const kind=node.dataset.arrival;
        const local=ease(clamp((progress-(starts[kind] || 0))/.28));
        const angle=kind==='photo' ? (node.classList.contains('photo-coast') ? -3 : 5) : (angles[kind] || 0);
        node.style.opacity=local.toFixed(5);
        node.style.transform=`translateY(${((1-local)*70).toFixed(2)}px) rotate(${angle}deg)`;
      });
      // Hidden artwork must never leave invisible links in the keyboard sequence.
      collection.toggleAttribute('inert',progress < .92);
      if(progress < .92) collection.setAttribute('aria-hidden','true'); else collection.removeAttribute('aria-hidden');
      sequence.dataset.progress=progress.toFixed(4);
    }
    function schedule(){if(!queued){queued=true;requestAnimationFrame(draw);}}
    addEventListener('scroll',schedule,{passive:true});
    addEventListener('resize',schedule,{passive:true});
    addEventListener('pageshow',schedule);
    reduce.addEventListener('change',draw);desktop.addEventListener('change',draw);
    cue?.addEventListener('click',e=>{if(root.classList.contains('hero-motion')){e.preventDefault();scrollTo({top:sequence.offsetTop+sequence.offsetHeight-innerHeight,behavior:reduce.matches?'auto':'smooth'});}});
    draw();
    // Narrow layouts keep normal document flow; a one-time, bounded rise remains.
    if(!desktop.matches && !reduce.matches && 'IntersectionObserver' in window){
      const observer=new IntersectionObserver(entries=>{
        for(const entry of entries){if(!entry.isIntersecting)continue;const el=entry.target;if(reduce.matches){observer.unobserve(el);continue;}el.animate([{opacity:.12,translate:'0 35px'},{opacity:1,translate:'0 0'}],{duration:600,easing:'cubic-bezier(.2,.7,.2,1)'});observer.unobserve(el);}
      },{threshold:.2});
      nodes.filter(n=>!['lines','photo'].includes(n.dataset.arrival)).forEach(n=>observer.observe(n));
    }
  }
  const field = document.querySelector('[data-v3-context]');
  if (!field) return;
  const fragments=[...field.querySelectorAll('[data-v3-fragment]')];
  const list=field.querySelector('[data-v3-list]');
  const count=field.querySelector('[data-v3-count]');
  const en=field.dataset.language==='en';
  function render(){
    const selected=fragments.filter(b=>b.getAttribute('aria-pressed')==='true');
    count.textContent=`${selected.length} / ${fragments.length}`;
    list.replaceChildren();
    for(const button of selected){const item=document.createElement('span');item.textContent=button.querySelector('.v3-fragment-copy').textContent.trim();list.append(item);}
    if(!selected.length){const item=document.createElement('span');item.textContent=en?'Nothing selected. Nothing is added automatically.':'没有选中内容，也不会自动添加。';list.append(item);}
  }
  fragments.forEach(button=>button.addEventListener('click',()=>{button.setAttribute('aria-pressed',String(button.getAttribute('aria-pressed')!=='true'));render();}));
  const tabs=[...field.querySelectorAll('[data-mini-tab]')];
  function activate(index,focus=false){
    const active=(index+tabs.length)%tabs.length;
    tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===active));tab.tabIndex=i===active?0:-1;field.querySelector(`[data-mini-panel="${tab.dataset.miniTab}"]`).hidden=i!==active;});
    if(focus)tabs[active].focus();
  }
  tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>activate(i));tab.addEventListener('keydown',e=>{const next={ArrowDown:i+1,ArrowRight:i+1,ArrowUp:i-1,ArrowLeft:i-1,Home:0,End:tabs.length-1}[e.key];if(next!==undefined){e.preventDefault();activate(next,true);}});});
  field.querySelector('[data-mini-search]').addEventListener('input',e=>{
    const query=e.target.value.trim().toLocaleLowerCase();let visible=0;
    fragments.forEach(b=>{b.hidden=!b.textContent.toLocaleLowerCase().includes(query);if(!b.hidden)visible++;});
    field.querySelector('[data-mini-empty]').hidden=visible!==0;
  });
  render();
})();
