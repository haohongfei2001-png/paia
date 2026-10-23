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
  const tabDirection = () => tabs.length && document.querySelector('.pv-tabs')?.setAttribute('aria-orientation', narrow.matches ? 'horizontal' : 'vertical');
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

/* PAIA_FINISHING_20261013: isolated progressive enhancement. Keep the original
   hero/navigation owner above byte-identical. No script on unrelated routes. */
(() => {
  const page = document.body.dataset.page;
  if (document.querySelector('[data-paia-refinement]')) return;
  if (document.body.dataset.homeMode === 'presentation') return;
  if (!['index.html', 'how-it-works.html', 'contact.html'].includes(page)) return;
  const style = document.createElement('link');
  style.rel = 'stylesheet'; style.href = '/assets/website/refinement.css?v=20261013c';
  style.dataset.paiaRefinement = '';
  const script = document.createElement('script');
  script.src = '/assets/website/refinement.js?v=20261013c'; script.defer = true;
  document.head.append(style, script);
})();

/* EDITORIAL_FINISH_20261013: task/navigation presentation only.
   Context directories and all source/draft/permission/motion owners are untouched. */
(() => {
  'use strict';
  const body = document.body;
  if (body.classList.contains('ed-ready')) return;
  const zh = document.documentElement.lang.startsWith('zh');
  const t = (a, b) => zh ? a : b;
  const local = name => (zh ? '/zh/' : '/') + name;
  const page = body.dataset.page;
  // Remove only identical destinations, keeping first order and the active link.
  const menu = document.querySelector('.mobile-menu nav');
  if (menu) {
    const seen = new Set();
    for (const link of [...menu.children]) {
      const href = link.getAttribute('href');
      if (!href) continue;
      if (seen.has(href)) link.remove();
      else seen.add(href);
    }
  }
  if (['help.html', 'status.html', 'contact.html'].includes(page)) {
    const heading = document.querySelector('main h1');
    if (heading) heading.textContent = page === 'contact.html'
      ? t('联系 PAIA', 'Contact PAIA') : t('帮助中心', 'Help');
  }
  if (page === 'how-it-works.html') {
    const target = document.querySelector('.nr-process-top');
    if (target) {
      const section = document.createElement('section');
      section.className = 'ed-start'; section.setAttribute('aria-labelledby', 'ed-start-title');
      const heading = document.createElement('h2'); heading.id = 'ed-start-title';
      heading.textContent = t('第一次使用', 'Your first use');
      const steps = [
        [t('1. 添加到浏览器', '1. Add to your browser'), local('download.html'), t('从获取页进入官方安装地址，核对浏览器与所需权限。', 'Use Get PAIA for the official installation address. Check the browser and required permissions.')],
        [t('2. 主动开启保存', '2. Turn on capture'), '#capture', t('在 ChatGPT 中开启保存后，再发送一条非私人内容。未发送的草稿不会被保存。', 'Turn on capture in ChatGPT, then send a non-private example. Unsent drafts are not captured.')],
        [t('3. 回到档案核对', '3. Check your archive'), '#archive', t('打开档案，找到刚才的表达，查看原话、时间与来源。', 'Find that expression in your archive. Check its original text, time and source.')]
      ];
      const list = document.createElement('ol');
      for (const [label, href, detail] of steps) {
        const item = document.createElement('li');
        const link = document.createElement('a'); link.href = href;
        link.textContent = label.replace(/^\d\. /, '');
        const text = document.createElement('p'); text.textContent = detail;
        item.append(link, text); list.append(item);
      }
      section.append(heading, list); target.prepend(section);
    }
  }
  // The desktop Get destination remains unchanged. On phones, show an action
  // that works here and offer an explicit, local-only link handoff.
  const header = document.querySelector('.header-actions');
  if (header) {
    const demo = document.createElement('a'); demo.className = 'ed-mobile-primary';
    demo.href = local('demo.html'); demo.textContent = t('查看演示', 'View demo');
    header.append(demo);
  }
  if (page === 'index.html') {
    const actions = document.querySelector('.hero-actions');
    if (actions) {
      const button = document.createElement('button'); button.type = 'button';
      button.className = 'ed-desktop-link';
      button.textContent = t('复制获取链接', 'Copy link');
      button.setAttribute('aria-controls', 'ed-link-feedback');
      const feedback = document.createElement('div'); feedback.id = 'ed-link-feedback';
      feedback.className = 'ed-copy-feedback'; feedback.hidden = true;
      feedback.setAttribute('role', 'status');
      let busy = false;
      button.addEventListener('click', async () => {
        if (busy) return;
        busy = true;
        // Fixed public route, not location.href (which can contain user data).
        const url = 'https://inputarchive.com' + local('download.html');
        feedback.replaceChildren();
        try {
          if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
          await navigator.clipboard.writeText(url);
          feedback.textContent = t('已复制获取链接，可在电脑上打开。', 'Get link copied. Open it on your computer.');
        } catch (_) {
          const label = document.createElement('label');
          label.textContent = t('复制此链接，在电脑上打开：', 'Copy this link and open it on your computer:');
          const input = document.createElement('input');
          input.type = 'text'; input.readOnly = true; input.value = url;
          input.setAttribute('aria-label', t('PAIA 获取链接', 'PAIA Get link'));
          label.append(input); feedback.append(label);
          feedback.hidden = false; input.focus({preventScroll:true}); input.select();
        } finally {
          feedback.hidden = false; busy = false;
        }
      });
      actions.append(button); actions.after(feedback);
    }
  }
  // Late enhancement is limited to labels and secondary actions. The existing
  // static product demo and all native links work without this block.
  body.classList.add('ed-ready');
})();
