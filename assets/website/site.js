/* PAIA website presentation. No network, storage, archive access or AI calls. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false;
  const mayMove = () => !reduce.matches && !paused;
  const menu = document.querySelector('.mobile-menu');
  if (menu) {
    const trigger = menu.querySelector('summary');
    const panel = document.querySelector('.header-inner');
    // Text enlargement can wrap the header. Keep its menu inside the viewport.
    const sizeMenu = () => panel.style.setProperty('--header-panel-height', `${Math.ceil(panel.getBoundingClientRect().height)}px`);
    sizeMenu();
    document.fonts.ready.then(sizeMenu);
    if ('ResizeObserver' in window) new ResizeObserver(sizeMenu).observe(panel);
    else addEventListener('resize', sizeMenu, {passive: true});
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
  const toggle = document.querySelector('[data-motion-toggle]');
  const zh = document.documentElement.lang === 'zh-CN';
  function motionState() {
    root.dataset.motion = mayMove() ? 'on' : 'off';
    if (toggle) {
      toggle.hidden = false;
      toggle.disabled = reduce.matches;
      toggle.setAttribute('aria-pressed', String(!mayMove()));
      toggle.textContent = reduce.matches ? (zh ? '已减少动效' : 'Reduced motion')
        : paused ? (zh ? '开启动效' : 'Enable motion') : (zh ? '暂停动效' : 'Pause motion');
    }
    if (!mayMove()) document.getAnimations().forEach(animation => animation.cancel());
    document.dispatchEvent(new Event('paia:motionchange'));
    draw();
  }
  toggle?.addEventListener('click', () => { paused = !paused; motionState(); });
  reduce.addEventListener('change', motionState);

  // Real tabs, not autoplay. Every panel has an accessible name and static text.
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
      {opacity: .3, transform: 'translateY(8px)'}, {opacity: 1, transform: 'translateY(0)'}
    ], {duration: 260, easing: 'cubic-bezier(.2,0,0,1)'});
    if (focus) tabs[selected].focus({preventScroll: true});
  }
  tabs.forEach((tab, index) => {
    tab.disabled = false;
    tab.addEventListener('click', () => showTab(index));
    tab.addEventListener('keydown', event => {
      const next = {ArrowDown: index + 1, ArrowRight: index + 1,
        ArrowUp: index - 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1}[event.key];
      if (next !== undefined) { event.preventDefault(); showTab(next, true); }
    });
  });
  if (hero) hero.dataset.activeSpace = 'archive';

  // Native scroll moves only the surrounding optical layers. No scroll gate,
  // invisible product controls or requestAnimationFrame loop while idle.
  let queued = false;
  let heroVisible = true;
  const clamp = value => Math.max(0, Math.min(1, value));
  function draw() {
    queued = false;
    if (!hero) return;
    const progress = mayMove() ? clamp(scrollY / Math.max(1, hero.offsetHeight * .65)) : 0;
    hero.style.setProperty('--hero-progress', progress.toFixed(4));
    hero.dataset.progress = progress.toFixed(4);
  }
  function schedule() {
    if (!heroVisible || queued) return;
    queued = true;
    requestAnimationFrame(draw);
  }
  addEventListener('scroll', schedule, {passive: true});
  addEventListener('resize', schedule, {passive: true});
  addEventListener('pageshow', schedule);
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      heroVisible = entries[0].isIntersecting;
      if (heroVisible) schedule();
    }).observe(hero);
  }

  // Bounded arrivals; content stays visible even without JS or an observer.
  if ('IntersectionObserver' in window) {
    const reveal = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        if (mayMove()) entry.target.animate([
          {opacity: .4, transform: 'translateY(32px)'}, {opacity: 1, transform: 'translateY(0)'}
        ], {duration: 780, easing: 'cubic-bezier(.16,1,.3,1)'});
        reveal.unobserve(entry.target);
      }
    }, {threshold: .08});
    document.querySelectorAll('.pc-reveal, .feature-visual, .invitation').forEach(element => reveal.observe(element));
  }
  motionState();
})();
