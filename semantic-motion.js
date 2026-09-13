(() => {
  if (document.body?.dataset.page !== 'home') return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktopQuery = window.matchMedia('(min-width: 901px)');
  const main = document.querySelector('main');
  if (!main) return;

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
    return { ...spec, node, section, x: 0, y: 0 };
  }).filter(Boolean);

  if (stages.length < 3) return;

  let svg = null;
  let basePath = null;
  let progressPath = null;
  let marker = null;
  let pathLength = 0;
  let mainTop = 0;
  let ticking = false;
  let resizeTimer = 0;
  let pageVisible = document.visibilityState === 'visible';
  let thoughtVisible = true;

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const smoothstep = (value) => {
    const x = clamp(value);
    return x * x * (3 - 2 * x);
  };

  const ensureThread = () => {
    if (svg) return;
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('paia-semantic-thread');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `
      <path class="paia-semantic-thread-base"></path>
      <path class="paia-semantic-thread-progress"></path>
      <circle class="paia-semantic-thread-marker" r="3.1"></circle>`;
    main.prepend(svg);
    basePath = svg.querySelector('.paia-semantic-thread-base');
    progressPath = svg.querySelector('.paia-semantic-thread-progress');
    marker = svg.querySelector('.paia-semantic-thread-marker');
  };

  const geometry = () => {
    if (!desktopQuery.matches || reducedMotion || !pageVisible) return;
    ensureThread();

    const mainRect = main.getBoundingClientRect();
    mainTop = mainRect.top + window.scrollY;
    const mainLeft = mainRect.left + window.scrollX;
    const width = Math.max(main.scrollWidth, main.clientWidth);
    const height = Math.max(main.scrollHeight, main.clientHeight);

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.style.width = `${width}px`;
    svg.style.height = `${height}px`;

    stages.forEach((stage) => {
      const rect = stage.node.getBoundingClientRect();
      stage.x = clamp(rect.left + window.scrollX - mainLeft - 14, 24, width - 24);
      stage.y = rect.top + window.scrollY - mainTop + rect.height * 0.5;
    });

    let d = `M ${stages[0].x.toFixed(1)} ${stages[0].y.toFixed(1)}`;
    for (let index = 1; index < stages.length; index += 1) {
      const prev = stages[index - 1];
      const next = stages[index];
      const dy = Math.max(48, next.y - prev.y);
      const c1y = prev.y + dy * 0.42;
      const c2y = next.y - dy * 0.42;
      d += ` C ${prev.x.toFixed(1)} ${c1y.toFixed(1)}, ${next.x.toFixed(1)} ${c2y.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)}`;
    }

    basePath.setAttribute('d', d);
    progressPath.setAttribute('d', d);
    pathLength = Math.max(1, progressPath.getTotalLength());
    progressPath.style.strokeDasharray = `${pathLength} ${pathLength}`;
    render();
  };

  const stageIndexForY = (y) => {
    if (stages.length === 1) return 0;
    for (let i = 0; i < stages.length - 1; i += 1) {
      const midpoint = (stages[i].y + stages[i + 1].y) * 0.5;
      if (y < midpoint) return i;
    }
    return stages.length - 1;
  };

  const updateThoughtFragments = () => {
    if (!thoughtVisible || !pageVisible) return;
    const thought = document.querySelector('#thought-library .thought-transform');
    const fragments = thought?._semanticFragments || [];
    const field = thought?._semanticResolveField;
    if (!thought || !fragments.length || !desktopQuery.matches || reducedMotion) return;

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

  const render = () => {
    ticking = false;
    if (!pageVisible || !desktopQuery.matches || reducedMotion || !svg || !pathLength) return;

    const y = window.scrollY + window.innerHeight * 0.56 - mainTop;
    const first = stages[0].y;
    const last = stages[stages.length - 1].y;
    const progress = clamp((y - first) / Math.max(1, last - first));
    const length = pathLength * progress;

    progressPath.style.strokeDashoffset = `${pathLength - length}`;
    const point = progressPath.getPointAtLength(length);
    marker.setAttribute('cx', point.x.toFixed(1));
    marker.setAttribute('cy', point.y.toFixed(1));

    const activeIndex = stageIndexForY(y);
    stages.forEach((stage, index) => {
      const active = index === activeIndex;
      stage.node.classList.toggle('is-semantic-active', active);
      stage.section.classList.toggle('is-semantic-current', active);
    });
    svg.classList.toggle('is-context', activeIndex >= 3);

    updateThoughtFragments();
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
        geometry();
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
    geometry();
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
    if (pageVisible) {
      geometry();
      requestRender();
    }
  }, { passive: true });

  window.addEventListener('scroll', requestRender, { passive: true });
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(geometry, 90);
  }, { passive: true });
  window.addEventListener('load', geometry, { once: true });
  window.addEventListener('paia:languagechange', syncLanguage);

  if (desktopQuery.addEventListener) desktopQuery.addEventListener('change', syncMode);
  else desktopQuery.addListener(syncMode);

  document.querySelectorAll('img').forEach((img) => {
    if (!img.complete) img.addEventListener('load', geometry, { once: true });
  });

  syncMode();
})();
