(() => {
  if (document.body?.dataset.page !== 'home') return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktopQuery = window.matchMedia('(min-width: 761px)');
  const thought = document.querySelector('#thought-library .thought-transform');
  const canvas = thought?.querySelector('.thought-transform-canvas');
  const faithful = thought?.querySelector('.thought-layer-faithful');
  if (!thought || !canvas || !faithful || reducedMotion) return;

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const smoothstep = (value) => {
    const x = clamp(value);
    return x * x * (3 - 2 * x);
  };

  const fragmentHost = document.createElement('div');
  fragmentHost.className = 'paia-semantic-fragments';
  fragmentHost.setAttribute('aria-hidden', 'true');
  const fragments = [];
  for (let index = 0; index < 4; index += 1) {
    const fragment = document.createElement('div');
    fragment.className = 'paia-semantic-fragment';
    fragmentHost.appendChild(fragment);
    fragments.push(fragment);
  }

  const field = document.createElement('div');
  field.className = 'paia-semantic-resolve-field';
  field.setAttribute('aria-hidden', 'true');
  canvas.appendChild(field);
  canvas.appendChild(fragmentHost);

  const syncBackground = () => {
    const bg = getComputedStyle(faithful).backgroundImage;
    fragments.forEach((fragment) => { fragment.style.backgroundImage = bg; });
  };

  const render = () => {
    if (!desktopQuery.matches || document.visibilityState !== 'visible') return;
    const raw = parseFloat(thought.style.getPropertyValue('--ai-opacity'));
    const p = Number.isFinite(raw) ? clamp(raw) : 0;
    const emerge = smoothstep((p - 0.10) / 0.48);
    const depart = smoothstep((p - 0.68) / 0.25);
    const opacity = clamp(emerge * (1 - depart)) * 0.72;
    const spread = smoothstep((p - 0.08) / 0.68);
    const offsets = [
      [-7, -4, .999],
      [5, -6, .998],
      [-5, 6, .999],
      [7, 4, .998]
    ];

    fragments.forEach((fragment, index) => {
      const [x, y, scale] = offsets[index];
      fragment.style.opacity = opacity.toFixed(3);
      fragment.style.transform = `translate3d(${(x * spread).toFixed(2)}px, ${(y * spread).toFixed(2)}px, 0) scale(${(1 - (1 - scale) * spread).toFixed(4)})`;
      fragment.style.filter = 'none';
    });

    const fieldOpacity = clamp((1 - Math.abs(p - .52) * 2.8) * .22, 0, .22);
    field.style.opacity = fieldOpacity.toFixed(3);
  };

  let frame = 0;
  const request = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      render();
    });
  };

  const syncMode = () => {
    fragmentHost.hidden = !desktopQuery.matches;
    field.hidden = !desktopQuery.matches;
    if (desktopQuery.matches) {
      syncBackground();
      request();
    }
  };

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request, { passive: true });
  window.addEventListener('paia:languagechange', () => {
    requestAnimationFrame(() => {
      syncBackground();
      request();
    });
  });
  document.addEventListener('visibilitychange', request, { passive: true });
  if (desktopQuery.addEventListener) desktopQuery.addEventListener('change', syncMode);
  else desktopQuery.addListener(syncMode);

  syncBackground();
  syncMode();
})();