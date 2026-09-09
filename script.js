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
  const toggle = thoughtTransform.querySelector('[data-thought-toggle]');
  const mobileQuery = window.matchMedia('(max-width: 620px)');

  [faithfulLayer, aiLayer].forEach((layer) => {
    if (!layer) return;
    layer.setAttribute('role', 'img');
  });

  const updateThoughtAria = () => {
    const isZh = document.documentElement.dataset.language === 'zh';
    if (faithfulLayer) {
      faithfulLayer.setAttribute('aria-label', isZh
        ? 'PAIA Thought Library 原始表达视图，AI 整理关闭'
        : 'PAIA Thought Library source view with AI organization off');
    }
    if (aiLayer) {
      aiLayer.setAttribute('aria-label', isZh
        ? 'PAIA Thought Library AI 综合理解层，AI 整理开启'
        : 'PAIA Thought Library AI synthesis layer with AI organization on');
    }
    if (toggle) toggle.setAttribute('aria-label', isZh ? '切换 AI 整理层' : 'Toggle AI organization layer');
  };
  updateThoughtAria();
  window.addEventListener('paia:languagechange', updateThoughtAria);

  thoughtTransform.querySelectorAll('.thought-layer img').forEach((img) => {
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
  });

  let story = thoughtTransform.parentElement;
  if (!story?.classList.contains('thought-scroll-story')) {
    story = document.createElement('div');
    story.className = 'thought-scroll-story';
    thoughtTransform.parentNode.insertBefore(story, thoughtTransform);
    story.appendChild(thoughtTransform);
  }

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const smoothstep = (value) => {
    const x = clamp(value, 0, 1);
    return x * x * (3 - 2 * x);
  };

  const clearScrollState = () => {
    ['--faithful-opacity', '--faithful-scale', '--faithful-blur', '--ai-opacity', '--ai-y', '--ai-blur']
      .forEach((name) => thoughtTransform.style.removeProperty(name));
  };

  const setManualState = (active) => {
    thoughtTransform.classList.toggle('ai-active', active);
    if (toggle) toggle.setAttribute('aria-pressed', String(active));
  };

  if (toggle) {
    toggle.addEventListener('click', () => setManualState(!thoughtTransform.classList.contains('ai-active')));
  }

  let ticking = false;
  let lastProgress = -1;

  const renderProgress = (rawProgress) => {
    const progress = clamp(rawProgress, 0, 1);
    if (Math.abs(progress - lastProgress) < 0.002) return;
    lastProgress = progress;

    const ai = smoothstep((progress - 0.18) / 0.68);
    thoughtTransform.style.setProperty('--faithful-opacity', (1 - ai * 0.62).toFixed(3));
    thoughtTransform.style.setProperty('--faithful-scale', (1 - ai * 0.005).toFixed(4));
    thoughtTransform.style.setProperty('--faithful-blur', `${(ai * 0.55).toFixed(2)}px`);
    thoughtTransform.style.setProperty('--ai-opacity', ai.toFixed(3));
    thoughtTransform.style.setProperty('--ai-y', `${((1 - ai) * 6).toFixed(2)}px`);
    thoughtTransform.style.setProperty('--ai-blur', `${((1 - ai) * 2.5).toFixed(2)}px`);
  };

  const update = () => {
    ticking = false;
    if (mobileQuery.matches || reduceMotion) return;
    const rect = story.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const stickyTop = clamp(viewportHeight * 0.11, 82, 112);
    const pinnedHeight = Math.min(thoughtTransform.offsetHeight || viewportHeight * 0.60, viewportHeight * 0.78);
    const scrollDistance = Math.max(1, story.offsetHeight - pinnedHeight - stickyTop * 0.18);
    renderProgress((stickyTop - rect.top) / scrollDistance);
  };

  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  };

  const syncMode = () => {
    lastProgress = -1;
    if (mobileQuery.matches || reduceMotion) {
      clearScrollState();
      setManualState(false);
    } else {
      setManualState(false);
      requestUpdate();
    }
  };

  if (!reduceMotion) {
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
  }
  if (mobileQuery.addEventListener) mobileQuery.addEventListener('change', syncMode);
  else mobileQuery.addListener(syncMode);
  syncMode();
}
