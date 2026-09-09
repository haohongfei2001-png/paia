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
        ? 'PAIA Thought Library 原始思路历程视图，AI 整理关闭'
        : 'PAIA Thought Library source-faithful view with AI organization off');
    }
    if (aiLayer) {
      aiLayer.setAttribute('aria-label', isZh
        ? 'PAIA Thought Library AI 整理后的主题阅读视图，AI 整理开启'
        : 'PAIA Thought Library AI-organized topic view with AI organization on');
    }
    if (toggle) {
      toggle.setAttribute('aria-label', isZh ? '切换 AI 整理视图' : 'Toggle AI-organized view');
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

  const setMobileState = (active) => {
    thoughtTransform.classList.toggle('ai-active', active);
    if (toggle) toggle.setAttribute('aria-pressed', String(active));
  };

  if (toggle) {
    toggle.addEventListener('click', () => {
      setMobileState(!thoughtTransform.classList.contains('ai-active'));
    });
  }

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const smoothstep = (value) => {
    const x = clamp(value, 0, 1);
    return x * x * (3 - 2 * x);
  };

  let ticking = false;
  let lastProgress = -1;

  const renderProgress = (rawProgress) => {
    if (mobileQuery.matches) return;
    const progress = clamp(rawProgress, 0, 1);
    if (Math.abs(progress - lastProgress) < 0.002) return;
    lastProgress = progress;

    const faithfulExit = smoothstep((progress - 0.20) / 0.52);
    const aiEnter = smoothstep((progress - 0.38) / 0.44);

    thoughtTransform.style.setProperty('--faithful-opacity', (1 - faithfulExit * 0.90).toFixed(3));
    thoughtTransform.style.setProperty('--faithful-scale', (1 - faithfulExit * 0.006).toFixed(4));
    thoughtTransform.style.setProperty('--faithful-blur', `${(faithfulExit * 1.4).toFixed(2)}px`);

    thoughtTransform.style.setProperty('--ai-opacity', aiEnter.toFixed(3));
    thoughtTransform.style.setProperty('--ai-y', `${((1 - aiEnter) * 8).toFixed(2)}px`);
    thoughtTransform.style.setProperty('--ai-blur', `${((1 - aiEnter) * 4).toFixed(2)}px`);
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
    if (mobileQuery.matches) {
      thoughtTransform.style.removeProperty('--faithful-opacity');
      thoughtTransform.style.removeProperty('--faithful-scale');
      thoughtTransform.style.removeProperty('--faithful-blur');
      thoughtTransform.style.removeProperty('--ai-opacity');
      thoughtTransform.style.removeProperty('--ai-y');
      thoughtTransform.style.removeProperty('--ai-blur');
      lastProgress = -1;
    } else {
      setMobileState(false);
      requestUpdate();
    }
  };

  if (!reduceMotion) {
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    if (mobileQuery.addEventListener) mobileQuery.addEventListener('change', syncMode);
    else mobileQuery.addListener(syncMode);
    requestUpdate();
  } else {
    renderProgress(0);
  }
}
