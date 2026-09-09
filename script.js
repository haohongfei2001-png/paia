const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const sections = document.querySelectorAll('.section');
if ('IntersectionObserver' in window && !reduceMotion) {
  sections.forEach((section) => section.classList.add('reveal'));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  sections.forEach((section) => observer.observe(section));
}

const thoughtTransform = document.querySelector('[data-thought-transform]');

if (thoughtTransform) {
  const style = document.createElement('style');
  style.textContent = `
    .thought-scroll-story {
      position: relative;
      min-height: 122vh;
      margin-top: 2px;
    }

    .thought-scroll-story .thought-transform {
      position: sticky;
      top: clamp(82px, 11vh, 116px);
      overflow: hidden;
      z-index: 2;
      background: #f8faf6;
      border-color: rgba(205,216,201,.95);
      box-shadow: 0 22px 58px rgba(36,45,34,.08);
    }

    .thought-scroll-story .thought-transform-head,
    .thought-scroll-story .thought-transform-caption,
    .thought-scroll-story .thought-transform-flare {
      display: none !important;
    }

    .thought-scroll-story .thought-transform::before {
      display: none !important;
    }

    .thought-scroll-story .thought-transform-canvas {
      position: relative;
      aspect-ratio: 3 / 2;
      overflow: hidden;
      border-radius: 19px;
      background: #fbfcf9;
      isolation: isolate;
    }

    .thought-scroll-story .thought-layer {
      position: absolute;
      inset: 0;
      margin: 0;
      background-repeat: no-repeat;
      background-size: contain;
      background-position: center;
      background-color: #fbfcf9;
      transition: none !important;
      will-change: opacity, transform, filter;
    }

    .thought-scroll-story .thought-layer img {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      opacity: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
      overflow: hidden !important;
    }

    .thought-scroll-story .thought-layer-faithful {
      z-index: 1;
      background-image: url('assets/screenshots/thought-reading.svg?v=7');
      opacity: var(--faithful-opacity, 1) !important;
      transform: scale(var(--faithful-scale, 1)) !important;
      filter: blur(var(--faithful-blur, 0px)) saturate(var(--faithful-saturation, 1)) !important;
    }

    .thought-scroll-story .thought-layer-ai {
      z-index: 2;
      background-image: url('assets/screenshots/ai-organized.svg?v=7');
      opacity: var(--ai-opacity, 0) !important;
      transform: translateY(var(--ai-y, 12px)) scale(var(--ai-scale, .992)) !important;
      filter: blur(var(--ai-blur, 7px)) saturate(var(--ai-saturation, .94)) !important;
    }

    .memory-fog {
      position: absolute;
      z-index: 3;
      inset: 0;
      pointer-events: none;
      opacity: var(--fog-opacity, 0);
      background: rgba(244,248,242,.38);
      backdrop-filter: blur(var(--fog-blur, 0px));
      -webkit-backdrop-filter: blur(var(--fog-blur, 0px));
      will-change: opacity, backdrop-filter;
    }

    .memory-fragment {
      position: absolute;
      z-index: 4;
      border: 1px solid rgba(191,205,186,.72);
      border-radius: 14px;
      background: rgba(248,250,247,.58);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow: 0 7px 20px rgba(43,53,40,.05);
      opacity: 0;
      overflow: hidden;
      pointer-events: none;
      will-change: transform, opacity;
    }

    .memory-fragment::before,
    .memory-fragment::after {
      content: '';
      position: absolute;
      left: 12%;
      height: 7px;
      border-radius: 999px;
      background: rgba(102,123,94,.17);
    }

    .memory-fragment::before {
      top: 31%;
      width: 64%;
    }

    .memory-fragment::after {
      top: 56%;
      width: 44%;
      background: rgba(92,106,88,.12);
    }

    .memory-fragment.fragment-1 { left: 26%; top: 28%; width: 25%; height: 13%; }
    .memory-fragment.fragment-2 { left: 57%; top: 29%; width: 24%; height: 12%; }
    .memory-fragment.fragment-3 { left: 27%; top: 48%; width: 19%; height: 13%; }
    .memory-fragment.fragment-4 { left: 49%; top: 48%; width: 19%; height: 13%; }
    .memory-fragment.fragment-5 { left: 71%; top: 48%; width: 18%; height: 13%; }
    .memory-fragment.fragment-6 { left: 29%; top: 69%; width: 28%; height: 10%; }
    .memory-fragment.fragment-7 { left: 61%; top: 69%; width: 25%; height: 10%; }

    .memory-settled-haze {
      position: absolute;
      z-index: 5;
      inset: 0;
      pointer-events: none;
      opacity: var(--settled-opacity, 0);
      background:
        radial-gradient(circle at 63% 42%, rgba(224,233,219,.18), transparent 36%),
        linear-gradient(180deg, rgba(249,251,248,.02), rgba(236,242,233,.10));
      mix-blend-mode: normal;
      will-change: opacity;
    }

    @media (max-width: 900px) {
      .thought-scroll-story { min-height: 116vh; }
      .thought-scroll-story .thought-transform { top: 80px; }
    }

    @media (max-width: 620px) {
      .thought-scroll-story { min-height: 112vh; }
      .thought-scroll-story .thought-transform { top: 72px; }
      .memory-fragment { border-radius: 10px; }
    }
  `;
  document.head.appendChild(style);

  const faithfulLayer = thoughtTransform.querySelector('.thought-layer-faithful');
  const aiLayer = thoughtTransform.querySelector('.thought-layer-ai');
  const canvas = thoughtTransform.querySelector('.thought-transform-canvas');

  [faithfulLayer, aiLayer].forEach((layer) => {
    if (!layer) return;
    layer.setAttribute('role', 'img');
  });
  if (faithfulLayer) faithfulLayer.setAttribute('aria-label', 'PAIA Thought Library 原始思路历程视图，AI整理关闭');
  if (aiLayer) aiLayer.setAttribute('aria-label', 'PAIA Thought Library AI整理后的完整主题阅读视图，AI整理开启');

  thoughtTransform.querySelectorAll('.thought-layer img').forEach((img) => {
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
  });

  const story = document.createElement('div');
  story.className = 'thought-scroll-story';
  thoughtTransform.parentNode.insertBefore(story, thoughtTransform);
  story.appendChild(thoughtTransform);

  const fragments = [];
  const fragmentStarts = [
    [-72, -34, -3.6],
    [86, -26, 2.8],
    [-94, 38, -4.2],
    [18, 68, 2.2],
    [96, 42, 4.4],
    [-64, 84, -2.5],
    [78, 78, 3.2]
  ];

  if (canvas) {
    const fog = document.createElement('span');
    fog.className = 'memory-fog';
    fog.setAttribute('aria-hidden', 'true');
    canvas.appendChild(fog);

    for (let i = 0; i < fragmentStarts.length; i += 1) {
      const fragment = document.createElement('span');
      fragment.className = `memory-fragment fragment-${i + 1}`;
      fragment.setAttribute('aria-hidden', 'true');
      canvas.appendChild(fragment);
      fragments.push(fragment);
    }

    const settledHaze = document.createElement('span');
    settledHaze.className = 'memory-settled-haze';
    settledHaze.setAttribute('aria-hidden', 'true');
    canvas.appendChild(settledHaze);
  }

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const smoothstep = (value) => {
    const x = clamp(value, 0, 1);
    return x * x * (3 - 2 * x);
  };

  let ticking = false;
  let lastProgress = -1;

  const renderProgress = (rawProgress) => {
    const progress = clamp(rawProgress, 0, 1);
    if (Math.abs(progress - lastProgress) < 0.001) return;
    lastProgress = progress;

    const loosen = smoothstep((progress - 0.08) / 0.24);
    const assemble = smoothstep((progress - 0.24) / 0.44);
    const resolve = smoothstep((progress - 0.50) / 0.40);

    const faithfulExit = smoothstep((progress - 0.20) / 0.54);
    const aiEnter = smoothstep((progress - 0.40) / 0.46);

    const fogIn = smoothstep((progress - 0.10) / 0.22);
    const fogOut = smoothstep((progress - 0.60) / 0.24);
    const fogOpacity = fogIn * (1 - fogOut) * 0.72;
    const fogBlur = fogIn * (1 - fogOut) * 9;

    thoughtTransform.style.setProperty('--faithful-opacity', (1 - faithfulExit * 0.95).toFixed(3));
    thoughtTransform.style.setProperty('--faithful-scale', (1 - faithfulExit * 0.012).toFixed(4));
    thoughtTransform.style.setProperty('--faithful-blur', `${(faithfulExit * 3.0).toFixed(2)}px`);
    thoughtTransform.style.setProperty('--faithful-saturation', (1 - faithfulExit * 0.06).toFixed(3));

    thoughtTransform.style.setProperty('--ai-opacity', aiEnter.toFixed(3));
    thoughtTransform.style.setProperty('--ai-y', `${((1 - aiEnter) * 12).toFixed(2)}px`);
    thoughtTransform.style.setProperty('--ai-scale', (0.992 + aiEnter * 0.008).toFixed(4));
    thoughtTransform.style.setProperty('--ai-blur', `${((1 - aiEnter) * 7).toFixed(2)}px`);
    thoughtTransform.style.setProperty('--ai-saturation', (0.94 + aiEnter * 0.06).toFixed(3));

    thoughtTransform.style.setProperty('--fog-opacity', fogOpacity.toFixed(3));
    thoughtTransform.style.setProperty('--fog-blur', `${fogBlur.toFixed(2)}px`);
    thoughtTransform.style.setProperty('--settled-opacity', (resolve * 0.34).toFixed(3));

    const fragmentAppear = smoothstep((progress - 0.12) / 0.18);
    const fragmentDissolve = smoothstep((progress - 0.62) / 0.22);
    const fragmentOpacity = fragmentAppear * (1 - fragmentDissolve) * 0.92;
    const settle = smoothstep((progress - 0.20) / 0.48);

    fragments.forEach((fragment, index) => {
      const [startX, startY, startRotate] = fragmentStarts[index];
      const localDelay = index * 0.018;
      const localSettle = smoothstep((settle - localDelay) / (1 - localDelay));
      const x = startX * (1 - localSettle);
      const y = startY * (1 - localSettle);
      const rotate = startRotate * (1 - localSettle);
      const scale = 0.94 + localSettle * 0.06;
      const localOpacity = fragmentOpacity * (0.74 + localSettle * 0.26);
      fragment.style.opacity = localOpacity.toFixed(3);
      fragment.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${rotate.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
    });
  };

  const update = () => {
    ticking = false;
    const rect = story.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const stickyTop = clamp(viewportHeight * 0.11, 82, 116);
    const pinnedHeight = Math.min(thoughtTransform.offsetHeight || viewportHeight * 0.60, viewportHeight * 0.78);
    const scrollDistance = Math.max(1, story.offsetHeight - pinnedHeight - stickyTop * 0.18);
    const progress = (stickyTop - rect.top) / scrollDistance;
    renderProgress(progress);
  };

  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  };

  if (reduceMotion) {
    renderProgress(0);
  } else {
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    requestUpdate();
  }
}
