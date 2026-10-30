/* PAIA Atelier 17. Page-local examples; no accounts, AI, network or persistence. */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const zh = document.documentElement.lang.startsWith('zh');
  const words = (cn, en) => zh ? cn : en;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const header = $('#site-header');
  const menu = $('#mobile-nav');
  const menuButton = $('.menu-toggle');
  let headerFrame = 0;

  function updateHeader() {
    headerFrame = 0;
    header.classList.toggle('is-scrolled', scrollY > 70);
  }
  addEventListener('scroll', () => {
    if (!headerFrame) headerFrame = requestAnimationFrame(updateHeader);
  }, { passive: true });
  updateHeader();

  function closeMenu() {
    menu.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', words('打开导航', 'Open navigation'));
  }
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? words('关闭导航', 'Close navigation') : words('打开导航', 'Open navigation'));
    menu.hidden = !open;
  });
  $$('#mobile-nav a').forEach(link => link.addEventListener('click', closeMenu));
  addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) {
      closeMenu();
      menuButton.focus({ preventScroll: true });
    }
  });
  matchMedia('(min-width: 641px)').addEventListener('change', event => {
    if (event.matches) closeMenu();
  });

  // Three static illustrations. Choosing a tab never calls a product service.
  const tabs = $$('[data-preview-tab]');
  const panels = $$('[data-preview-panel]');
  function selectPreview(index, focus = false) {
    const selected = tabs[index];
    tabs.forEach(tab => {
      const active = tab === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    panels.forEach(panel => { panel.hidden = panel.dataset.previewPanel !== selected.dataset.previewTab; });
    if (focus) selected.focus({ preventScroll: true });
  }
  tabs.forEach((tab, index) => {
    tab.disabled = false;
    tab.addEventListener('click', () => selectPreview(index));
    tab.addEventListener('keydown', event => {
      const target = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
      if (target === undefined) return;
      event.preventDefault();
      selectPreview(target, true);
    });
  });

  // Keep the approved R3 component. Only the explicit insertion action changes
  // this readonly fictional draft; the existing draft is preserved in full.
  const phrases = (zh ? [
    '保留我的原意，用更自然的语言表达。',
    '请先给出结论，再解释原因。',
    '发现我的前提有问题，请直接指出。',
    '先比较不同方案，再说明取舍。',
    '给出一个具体的例子。',
    '把可以执行的下一步写清楚。'
  ] : [
    'Keep my meaning, using more natural language.',
    'Give the conclusion first, then explain why.',
    'Point out a mistaken premise directly.',
    'Compare the options, then explain the trade-offs.',
    'Give a concrete example.',
    'Make the actionable next step clear.'
  ]).map((text, i) => ({ id: 'example-' + i, text, revision: 1, hidden: false, pinned: false }));
  const draft = $('#prompt-draft');
  const host = $('#r3-host');
  const adapter = {
    list: () => phrases,
    recommendation: () => phrases[0].id,
    async insert(snapshot) {
      const phrase = phrases.find(item => item.id === snapshot.id);
      if (!phrase || phrase.text !== snapshot.text || phrase.revision !== snapshot.revision) return { ok: false };
      draft.value += (draft.value && !draft.value.endsWith('\n') ? '\n' : '') + phrase.text;
      const toast = $('#toast');
      toast.textContent = words('已放入示例草稿。发送由你决定。', 'Added to the example draft. You choose when to send.');
      toast.classList.add('is-visible');
      clearTimeout(toast.dismissTimer);
      toast.dismissTimer = setTimeout(() => toast.classList.remove('is-visible'), 2400);
      return { ok: true };
    },
    async save() {
      return { ok: false, reason: words('这是展示画面；完整操作请进入产品示例。', 'This is an illustration. Explore the demo for the full interaction.') };
    },
    async mutate() {
      return { ok: false, reason: words('这里只演示复用，不修改保存的表达。', 'This illustration does not change your saved expressions.') };
    },
    open() { location.href = zh ? '/zh/demo.html#prompt-reuse' : '/demo.html#prompt-reuse'; }
  };
  if (window.PaiaRefinement?.Surface && host && draft) {
    const surface = new window.PaiaRefinement.Surface(host, $('#r3-composer'), adapter, { mode: 'collapsed' });
    surface.previous = 'collapsed';
    surface.setMode('capsule');
  }

  // A one-time, small arrival. Layout and text are present even without JS.
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-entering');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    $$('.p16-archive-scene, .p16-library-track, .context-desk, .p13-detail-card').forEach(element => {
      element.classList.add('a17-arrive');
      observer.observe(element);
    });
  }
  document.body.dataset.atelierReady = 'true';
})();
