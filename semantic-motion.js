(() => {
  if (document.body?.dataset.page !== 'home') return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktopQuery = window.matchMedia('(min-width: 901px)');

  const stageSpecs = [
    { selector: '.hero-window', section: '.hero.section', kind: 'source' },
    { selector: '#product .archive-detail-shot', section: '#product', kind: 'archive' },
    { selector: '#thought-library .thought-transform', section: '#thought-library', kind: 'thought' },
    { selector: '#ai-context .context-detail-shot', section: '#ai-context', kind: 'context' },
    { selector: '#privacy .story-visual', section: '#privacy', kind: 'boundary' }
  ];

  const stages = stageSpecs.map((spec) => {
    const node = document.querySelector(spec.selector);
    const section = document.querySelector(spec.section);
    if (!node || !section) return null;
    node.classList.add('semantic-stage', `semantic-${spec.kind}`);
    section.classList.add('is-semantic-section');
    return { ...spec, node, section };
  }).filter(Boolean);

  if (stages.length < 3) return;

  let ticking = false;
  let pageVisible = document.visibilityState === 'visible';
  let thoughtVisible = true;

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const smoothstep = (value) => {
    const x = clamp(value);
    return x * x * (3 - 2 * x);
  };

  const updateThoughtFragments = () => {
    if (!thoughtVisible || !pageVisible || !desktopQuery.matches || reducedMotion) return;

    const thought = document.querySelector('#thought-library .thought-transform');
    const fragments = thought?._semanticFragments || [];
    const field = thought?._semanticResolveField;
    if (!thought || !fragments.length) return;

    const raw = parseFloat(thought.style.getPropertyValue('--ai-opacity'));
    const p = Number.isFinite(raw) ? clamp(raw) : 0;
    const emerge = smoothstep((p - 0.06) / 0.50);
    const depart = smoothstep((p - 0.66) / 0.30);
    const opacity = clamp(emerge * (1 - depart)) * 0.88;
    const spread = smoothstep((p - 0.05) / 0.72);
    const blur = clamp((1 - Math.abs(p - .5) * 2) * .34, 0, .34);
    const offsets = [
      [-10, -6, .998],
      [7, -9, .997],
      [-7, 8, .998],
      [10, 5, .997]
    ];

    fragments.forEach((fragment, index) => {
      const [x, y, scale] = offsets[index];
      fragment.style.opacity = opacity.toFixed(3);
      fragment.style.transform = `translate3d(${(x * spread).toFixed(2)}px, ${(y * spread).toFixed(2)}px, 0) scale(${(1 - (1 - scale) * spread).toFixed(4)})`;
      fragment.style.filter = `blur(${blur.toFixed(2)}px)`;
    });

    if (field) {
      const fieldOpacity = clamp((1 - Math.abs(p - .52) * 2.7) * .34, 0, .34);
      field.style.opacity = fieldOpacity.toFixed(3);
    }
  };

  const updateActiveStage = () => {
    if (!desktopQuery.matches || reducedMotion || !pageVisible) return;

    const focusY = window.innerHeight * 0.55;
    let activeIndex = 0;
    let bestDistance = Infinity;

    stages.forEach((stage, index) => {
      const rect = stage.node.getBoundingClientRect();
      const center = rect.top + rect.height * 0.5;
      const distance = Math.abs(center - focusY);
      if (distance < bestDistance) {
        bestDistance = distance;
        activeIndex = index;
      }
    });

    stages.forEach((stage, index) => {
      const active = index === activeIndex;
      stage.node.classList.toggle('is-semantic-active', active);
      stage.section.classList.toggle('is-semantic-current', active);
    });

    updateThoughtFragments();
  };

  const render = () => {
    ticking = false;
    updateActiveStage();
  };

  const requestRender = () => {
    if (!pageVisible || ticking) return;
    ticking = true;
    window.requestAnimationFrame(render);
  };

  const installThoughtFragments = () => {
    const thought = document.querySelector('#thought-library .thought-transform');
    const canvas = thought?.querySelector('.thought-transform-canvas');
    const faithful = thought?.querySelector('.thought-layer-faithful');
    if (!thought || !canvas || !faithful || thought._semanticFragments) return;

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

    thought._semanticFragments = fragments;
    thought._semanticResolveField = field;

    const syncBackground = () => {
      const bg = getComputedStyle(faithful).backgroundImage;
      fragments.forEach((fragment) => { fragment.style.backgroundImage = bg; });
    };

    syncBackground();
    thought._syncSemanticBackground = syncBackground;
  };

  const syncLanguage = () => {
    const thought = document.querySelector('#thought-library .thought-transform');
    window.requestAnimationFrame(() => {
      thought?._syncSemanticBackground?.();
      window.setTimeout(() => {
        thought?._syncSemanticBackground?.();
        requestRender();
      }, 80);
    });
  };

  const syncMode = () => {
    if (!desktopQuery.matches || reducedMotion) {
      document.body.classList.remove('d2-semantic-ready');
      stages.forEach((stage) => {
        stage.node.classList.remove('is-semantic-active');
        stage.section.classList.remove('is-semantic-current');
      });
      return;
    }

    document.body.classList.add('d2-semantic-ready');
    installThoughtFragments();
    requestRender();
  };

  const thoughtSection = document.querySelector('#thought-library');
  if (thoughtSection && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      thoughtVisible = Boolean(entries[0]?.isIntersecting);
      if (thoughtVisible) requestRender();
    }, { rootMargin: '45% 0px 45% 0px', threshold: 0 });
    observer.observe(thoughtSection);
  }

  document.addEventListener('visibilitychange', () => {
    pageVisible = document.visibilityState === 'visible';
    if (pageVisible) requestRender();
  }, { passive: true });

  window.addEventListener('scroll', requestRender, { passive: true });
  window.addEventListener('resize', requestRender, { passive: true });
  window.addEventListener('load', requestRender, { once: true });
  window.addEventListener('paia:languagechange', syncLanguage);

  if (desktopQuery.addEventListener) desktopQuery.addEventListener('change', syncMode);
  else desktopQuery.addListener(syncMode);

  syncMode();
})();
