(() => {
  if (document.body?.dataset.page !== 'home') return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktop = window.matchMedia('(min-width: 761px)');

  const installHeaderState = () => {
    const header = document.querySelector('.site-header');
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

    let manual = false;
    let manualValue = 0;
    let frame = 0;

    const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
    const smoothstep = (value) => {
      const x = clamp(value);
      return x * x * (3 - 2 * x);
    };

    const set = (value) => {
      const p = clamp(value);
      host.style.setProperty('--organize', p.toFixed(3));
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
      const end = Math.min(vh * .20, 180);
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
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') request();
    }, { passive: true });
    if (desktop.addEventListener) desktop.addEventListener('change', syncMode);
    else desktop.addListener(syncMode);

    set(0);
    request();
  };

  installHeaderState();
  installThoughtOrganization();
})();
