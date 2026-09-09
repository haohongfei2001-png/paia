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
  const faithfulLayer = thoughtTransform.querySelector('.thought-layer-faithful');
  const aiLayer = thoughtTransform.querySelector('.thought-layer-ai');
  const canvas = thoughtTransform.querySelector('.thought-transform-canvas');

  [faithfulLayer, aiLayer].forEach((layer) => {
    if (!layer) return;
    layer.setAttribute('role', 'img');
  });

  const updateThoughtAria = () => {
    const isZh = document.documentElement.dataset.language === 'zh';
    if (faithfulLayer) {
      faithfulLayer.setAttribute('aria-label', isZh
        ? 'PAIA Thought Library 原始思路历程视图，AI 整理关闭'
        : 'PAIA Thought Library source-faithful view with AI organization off');
    }
    if (aiLayer) {
      aiLayer.setAttribute('aria-label', isZh
        ? 'PAIA Thought Library AI 整理后的完整主题阅读视图，AI 整理开启'
        : 'PAIA Thought Library AI-organized topic view with AI organization on');
    }
  };
  updateThoughtAria();
  window.addEventListener('paia:languagechange', updateThoughtAria);

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
