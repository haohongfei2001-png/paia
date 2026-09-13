(() => {
  if (document.body?.dataset.page !== 'home') return;

  const lang = () => document.documentElement.dataset.language === 'zh' ? 'zh' : 'en';

  // These strings already existed in the product-stage UI. This file does not
  // own or alter the site's marketing/product copy.
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

  const installHeaderState = () => {
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

  const init = () => {
    applyStageCopy();
    installHeaderState();
    document.body.classList.add('premium-home-ready');
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  window.addEventListener('paia:languagechange', () => requestAnimationFrame(applyStageCopy));
})();