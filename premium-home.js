(() => {
  if (document.body?.dataset.page !== 'home') return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lang = () => document.documentElement.dataset.language === 'zh' ? 'zh' : 'en';

  const stageCopy = {
    zh: {
      stageStatus: '本机优先',
      archiveLabel: 'INPUT ARCHIVE',
      archiveValue: '继续阅读自己的表达',
      thoughtLabel: 'THOUGHT LIBRARY',
      thoughtValue: '长期主题正在形成',
      contextLabel: '用于 AI',
      contextValue: '只带走这次需要的部分',
      stageAlt: 'PAIA 档案首页产品界面示意'
    },
    en: {
      stageStatus: 'Local-first',
      archiveLabel: 'INPUT ARCHIVE',
      archiveValue: 'Continue reading your own words',
      thoughtLabel: 'THOUGHT LIBRARY',
      thoughtValue: 'Long-term themes take shape',
      contextLabel: 'FOR AI',
      contextValue: 'Carry only what this task needs',
      stageAlt: 'PAIA archive home product interface preview'
    }
  };

  const ensureHeroStage = () => {
    const hero = document.querySelector('.hero');
    if (!hero || hero.querySelector('[data-premium-hero-stage]')) return;

    let copyWrap = hero.querySelector('.hero-copy');
    if (!copyWrap) {
      copyWrap = document.createElement('div');
      copyWrap.className = 'hero-copy';
      [...hero.children].forEach((child) => copyWrap.appendChild(child));
      hero.appendChild(copyWrap);
    }

    const stage = document.createElement('div');
    stage.className = 'hero-product-stage';
    stage.dataset.premiumHeroStage = '';
    stage.innerHTML = `
      <div class="hero-stage-glow" aria-hidden="true"></div>
      <div class="hero-window" data-premium-window>
        <div class="hero-window-bar">
          <span class="hero-window-dots" aria-hidden="true"><i></i><i></i><i></i></span>
          <strong>PAIA</strong>
          <span data-premium-stage-status></span>
        </div>
        <div class="hero-window-frame">
          <img data-premium-stage-image src="assets/screenshots/input-archive-home.svg?v=1" alt="" decoding="async" fetchpriority="high" />
        </div>
      </div>
      <div class="hero-signal hero-signal-archive" aria-hidden="true">
        <span data-premium-archive-label></span><strong data-premium-archive-value></strong>
      </div>
      <div class="hero-signal hero-signal-thought" aria-hidden="true">
        <span data-premium-thought-label></span><strong data-premium-thought-value></strong>
      </div>
      <div class="hero-signal hero-signal-context" aria-hidden="true">
        <span data-premium-context-label></span><strong data-premium-context-value></strong>
      </div>`;
    hero.appendChild(stage);
  };

  const applyStageCopy = () => {
    const c = stageCopy[lang()];
    const set = (selector, value) => {
      document.querySelectorAll(selector).forEach((node) => { node.textContent = value; });
    };

    set('[data-premium-stage-status]', c.stageStatus);
    set('[data-premium-archive-label]', c.archiveLabel);
    set('[data-premium-archive-value]', c.archiveValue);
    set('[data-premium-thought-label]', c.thoughtLabel);
    set('[data-premium-thought-value]', c.thoughtValue);
    set('[data-premium-context-label]', c.contextLabel);
    set('[data-premium-context-value]', c.contextValue);

    const stageImage = document.querySelector('[data-premium-stage-image]');
    if (stageImage) {
      stageImage.src = lang() === 'zh'
        ? 'assets/screenshots/input-archive-home.svg?v=1'
        : 'assets/screenshots/input-archive-home-en.svg?v=1';
      stageImage.alt = c.stageAlt;
    }
  };

  const installHeaderMotion = () => {
    const header = document.querySelector('.site-header');
    if (!header) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      header.classList.toggle('is-scrolled', window.scrollY > 18);
    };
    const request = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', request, { passive: true });
  };

  const installHeroMotion = () => {
    const stage = document.querySelector('[data-premium-hero-stage]');
    const windowCard = stage?.querySelector('[data-premium-window]');
    if (!stage || !windowCard || reduceMotion || !window.matchMedia('(pointer:fine)').matches) return;

    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const render = () => {
      frame = 0;
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      windowCard.style.setProperty('--hero-rotate-x', `${(-currentY * 1.35).toFixed(2)}deg`);
      windowCard.style.setProperty('--hero-rotate-y', `${(currentX * 1.6).toFixed(2)}deg`);
      stage.style.setProperty('--hero-shift-x', `${(currentX * 5).toFixed(2)}px`);
      stage.style.setProperty('--hero-shift-y', `${(currentY * 4).toFixed(2)}px`);
      if (Math.abs(targetX - currentX) > 0.004 || Math.abs(targetY - currentY) > 0.004) frame = requestAnimationFrame(render);
    };

    const requestRender = () => { if (!frame) frame = requestAnimationFrame(render); };
    stage.addEventListener('pointermove', (event) => {
      const rect = stage.getBoundingClientRect();
      targetX = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
      targetY = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));
      requestRender();
    });
    stage.addEventListener('pointerleave', () => {
      targetX = 0;
      targetY = 0;
      requestRender();
    });
  };

  const installImageDepth = () => {
    if (reduceMotion || !window.matchMedia('(pointer:fine)').matches) return;
    document.querySelectorAll('.product-shot, .story-visual').forEach((figure) => {
      figure.addEventListener('pointermove', (event) => {
        const rect = figure.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
        figure.style.setProperty('--media-x', `${(x * 2.5).toFixed(2)}px`);
        figure.style.setProperty('--media-y', `${(y * 2).toFixed(2)}px`);
      });
      figure.addEventListener('pointerleave', () => {
        figure.style.setProperty('--media-x', '0px');
        figure.style.setProperty('--media-y', '0px');
      });
    });
  };

  const init = () => {
    ensureHeroStage();
    applyStageCopy();
    installHeaderMotion();
    installHeroMotion();
    installImageDepth();
    document.body.classList.add('premium-home-ready');
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  window.addEventListener('paia:languagechange', () => requestAnimationFrame(applyStageCopy));
})();
