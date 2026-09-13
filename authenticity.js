(() => {
  if (document.body?.dataset.page !== 'home') return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktop = window.matchMedia('(min-width: 761px)');

  const installHeaderState = () => {
    const header = document.querySelector('.site-header');
    const wordmark = header?.querySelector('.brand > span');
    if (wordmark) wordmark.style.fontSize = '20px';
    if (!header) return;

    let frame = 0;
    const render = () => {
      frame = 0;
      header.classList.toggle('is-scrolled', window.scrollY > 18);
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };

    render();
    window.addEventListener('scroll', request, { passive: true });
  };

  const installThoughtOrganization = () => {
    const host = document.querySelector('[data-thought-live]');
    const toggle = host?.querySelector('[data-thought-live-toggle]');
    const section = document.querySelector('#thought-library');
    if (!host || !toggle || !section) return;

    const sourceBlocks = Array.from(host.querySelectorAll('.thought-source-block'));
    const derived = host.querySelector('.thought-derived');
    const offsets = [[-18, -12], [18, 6], [-10, 20]];

    let manual = false;
    let manualValue = 0;
    let frame = 0;

    const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
    const smoothstep = (value) => {
      const x = clamp(value);
      return x * x * (3 - 2 * x);
    };

    const syncToggleLabel = () => {
      const isZh = document.documentElement.dataset.language === 'zh';
      toggle.setAttribute('aria-label', isZh ? '切换 AI 整理层' : 'Toggle AI organization layer');
    };

    const set = (value) => {
      const p = clamp(value);
      host.style.setProperty('--organize', p.toFixed(3));

      sourceBlocks.forEach((node, index) => {
        const [x, y] = offsets[index] || [0, 0];
        node.style.opacity = (1 - p * .64).toFixed(3);
        node.style.transform = `translate3d(${(x * p).toFixed(2)}px, ${(y * p).toFixed(2)}px, 0)`;
      });

      if (derived) {
        derived.style.opacity = p.toFixed(3);
        derived.style.transform = `translateY(${((1 - p) * 18).toFixed(2)}px)`;
      }

      const organized = p >= .72;
      host.classList.toggle('is-organized', organized);
      toggle.setAttribute('aria-pressed', String(organized));
    };

    const render = () => {
      frame = 0;
      if (manual || reduceMotion || !desktop.matches) {
        set(manual ? manualValue : 0);
        return;
      }

      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const start = vh * .68;
      const raw = (start - rect.top) / Math.max(1, section.offsetHeight - vh * .24);
      set(smoothstep(raw));
    };

    const request = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };

    toggle.addEventListener('click', () => {
      manual = true;
      manualValue = host.classList.contains('is-organized') ? 0 : 1;
      set(manualValue);
    });

    const syncMode = () => {
      manual = false;
      manualValue = 0;
      set(0);
      request();
    };

    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request, { passive: true });
    window.addEventListener('paia:languagechange', syncToggleLabel);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') request();
    }, { passive: true });

    if (desktop.addEventListener) desktop.addEventListener('change', syncMode);
    else desktop.addListener(syncMode);

    syncToggleLabel();
    set(0);
    request();
  };

  installHeaderState();
  installThoughtOrganization();
})();
