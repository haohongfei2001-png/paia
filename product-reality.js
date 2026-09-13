(() => {
  const page = document.body?.dataset.page;
  if (!page) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;

  const installSandboxFocus = () => {
    if (page !== 'demo' || !('IntersectionObserver' in window)) return;
    const sandbox = document.querySelector('.paia-simulator');
    if (!sandbox) return;

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      document.body.classList.toggle(
        'product-sandbox-active',
        Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.52)
      );
    }, { threshold: [0, 0.25, 0.52, 0.75, 1] });

    observer.observe(sandbox);
  };

  const installInteractionModality = () => {
    let keyboard = false;
    const set = (value) => {
      if (keyboard === value) return;
      keyboard = value;
      document.documentElement.classList.toggle('paia-keyboard-nav', value);
    };

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Tab' || event.key.startsWith('Arrow')) set(true);
    }, { passive: true });
    window.addEventListener('pointerdown', () => set(false), { passive: true });
  };

  const installVisibilityBudget = () => {
    const root = document.documentElement;
    const sync = () => {
      root.classList.toggle('paia-page-hidden', document.visibilityState !== 'visible');
    };
    document.addEventListener('visibilitychange', sync, { passive: true });
    sync();
  };

  const installProductBaseline = () => {
    // Website-only metadata for QA and future convergence checks; no visible copy.
    document.documentElement.dataset.productReality = 'current-extension-shell';
    document.documentElement.dataset.motionBudget = reducedMotion
      ? 'reduced'
      : (coarsePointer ? 'touch' : 'full');
  };

  installProductBaseline();
  installInteractionModality();
  installVisibilityBudget();
  installSandboxFocus();
})();
