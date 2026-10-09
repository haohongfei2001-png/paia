/* PAIA optical archive. Native scroll, finite transitions, no visitor data. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = matchMedia('(max-width: 760px)');
  const mayMove = () => !reduce.matches;
  const menu = document.querySelector('.mobile-menu');
  if (menu) {
    const trigger = menu.querySelector('summary');
    const panel = document.querySelector('.header-inner');
    const sizeMenu = () => panel.style.setProperty('--header-panel-height', `${Math.ceil(panel.getBoundingClientRect().height)}px`);
    sizeMenu();
    document.fonts.ready.then(sizeMenu);
    if ('ResizeObserver' in window) new ResizeObserver(sizeMenu).observe(panel);
    else addEventListener('resize', sizeMenu, {passive:true});
    const close = restore => { menu.open = false; if (restore) trigger.focus(); };
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menu.open) { event.preventDefault(); close(true); }
    });
    document.addEventListener('pointerdown', event => {
      if (menu.open && !menu.contains(event.target)) close(false);
    });
    menu.addEventListener('click', event => { if (event.target.closest('a')) close(false); });
  }

  const hero = document.querySelector('[data-product-hero]');
  const tabs = [...document.querySelectorAll('[data-preview-tab]')];
  const panels = [...document.querySelectorAll('[data-preview-panel]')];
  function showTab(index, focus = false) {
    const selected = (index + tabs.length) % tabs.length;
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === selected));
      tab.tabIndex = i === selected ? 0 : -1;
    });
    panels.forEach((panel, i) => { panel.hidden = i !== selected; });
    if (hero) hero.dataset.activeSpace = tabs[selected].dataset.previewTab;
    if (mayMove()) panels[selected].animate([
      {opacity:.35,transform:'translateX(12px)'}, {opacity:1,transform:'translateX(0)'}
    ], {duration:360,easing:'cubic-bezier(.2,.75,.25,1)'});
    if (focus) tabs[selected].focus({preventScroll:true});
  }
  tabs.forEach((tab, index) => {
    tab.disabled = false;
    tab.addEventListener('click', () => showTab(index));
    tab.addEventListener('keydown', event => {
      const next = {ArrowDown:index+1,ArrowRight:index+1,ArrowUp:index-1,ArrowLeft:index-1,Home:0,End:tabs.length-1}[event.key];
      if (next !== undefined) { event.preventDefault(); showTab(next, true); }
    });
  });
  if (hero) hero.dataset.activeSpace = 'archive';
  const tabDirection = () => document.querySelector('.pv-tabs')?.setAttribute('aria-orientation', narrow.matches ? 'horizontal' : 'vertical');
  tabDirection(); narrow.addEventListener('change', tabDirection);

  // One frame per scroll event, and none at rest. Text is never gated by motion.
  let queued = false;
  const clamp = value => Math.max(0, Math.min(1, value));
  const scenes = [...document.querySelectorAll('.pc-section, [data-scroll-scene]')];
  const sectionLinks = [...document.querySelectorAll('.pc-nav a')];
  const tracked = sectionLinks.map(link => document.querySelector(link.hash)).filter(Boolean);
  function draw() {
    queued = false;
    if (hero) {
      const progress = mayMove() ? clamp(scrollY / Math.max(1,hero.offsetHeight*.8)) : 0;
      hero.style.setProperty('--hero-progress', progress.toFixed(4));
      hero.dataset.progress = progress.toFixed(4);
    }
    for (const scene of scenes) {
      const rect = scene.getBoundingClientRect();
      if (rect.top > innerHeight || rect.bottom < 0) continue;
      const progress = mayMove() ? clamp((innerHeight-rect.top)/(innerHeight+rect.height)) : 0;
      scene.style.setProperty('--scene-progress', progress.toFixed(4));
    }
    if (tracked.length) {
      let current = tracked[0].id;
      for (const section of tracked) if (section.getBoundingClientRect().top < innerHeight*.48) current = section.id;
      sectionLinks.forEach(link => {
        if (link.hash === `#${current}`) link.setAttribute('aria-current','location');
        else link.removeAttribute('aria-current');
      });
    }
  }
  function schedule() { if (!queued) { queued = true; requestAnimationFrame(draw); } }
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule,{passive:true});
  addEventListener('pageshow',schedule);
  function motionState() {
    root.dataset.motion = mayMove() ? 'on' : 'off';
    if (!mayMove()) document.getAnimations().forEach(animation => animation.cancel());
    document.dispatchEvent(new Event('paia:motionchange'));
    draw();
  }
  reduce.addEventListener('change',motionState);

  // Entering pages and chapters have different scales of movement. All remain
  // fully present in the DOM and readable without JavaScript or observers.
  if ('IntersectionObserver' in window) {
    const reveal = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        if (mayMove()) {
          const isScene = entry.target.matches('.pc-reveal, [data-scroll-scene]');
          entry.target.animate([
            {opacity:.45,transform:`translateY(${isScene ? 28 : 15}px)`},
            {opacity:1,transform:'translateY(0)'}
          ],{duration:isScene ? 900 : 680,easing:'cubic-bezier(.16,1,.3,1)'});
        }
        reveal.unobserve(entry.target);
      }
    },{threshold:.09});
    document.querySelectorAll('[data-reveal],.pc-reveal,.invitation,.hero-heading,.hero-product,.page-intro,.beta-form,.nr-intro,.nr-step').forEach(element=>reveal.observe(element));
  }
  motionState();
})();
