(() => {
  const zh = () => document.documentElement.dataset.language === 'zh';
  const currentLang = () => zh() ? 'zh' : 'en';
  const text = {
    zh: {
      headerBeta: '加入内测',
      productAlt: 'PAIA 产品界面预览',
      product: '产品', principles: '原则', privacy: '隐私', about: '关于',
      menuOpen: '打开导航', menuClose: '关闭导航',
      betaSubmitting: '提交中…',
      betaSuccessTitle: '申请已提交。',
      betaSuccessBody: '感谢你对 PAIA Private Beta 的兴趣。如果适合当前测试范围，我会通过邮件联系你。',
      betaError: '提交没有成功。请稍后重试，或直接通过邮箱联系。',
      back: '返回 PAIA'
    },
    en: {
      headerBeta: 'Join beta',
      productAlt: 'PAIA product interface preview',
      product: 'Product', principles: 'Principles', privacy: 'Privacy', about: 'About',
      menuOpen: 'Open navigation', menuClose: 'Close navigation',
      betaSubmitting: 'Submitting…',
      betaSuccessTitle: 'Application submitted.',
      betaSuccessBody: 'Thanks for your interest in the PAIA Private Beta. If you fit the current testing scope, I’ll follow up by email.',
      betaError: 'The application could not be submitted. Please try again, or contact the project by email.',
      back: 'Back to PAIA'
    }
  };

  const productViews = {
    archive: { zh: 'assets/screenshots/input-archive-home.svg?v=3', en: 'assets/screenshots/input-archive-home-en.svg?v=1' },
    thoughts: { zh: 'assets/screenshots/thought-library.svg?v=3', en: 'assets/screenshots/thought-library-en.svg?v=1' },
    context: { zh: 'assets/screenshots/ai-context.svg?v=3', en: 'assets/screenshots/ai-context-en.svg?v=1' }
  };

  const ensureExperienceStylesheet = () => {
    if (document.querySelector('link[href^="experience.css"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'experience.css?v=1';
    document.head.appendChild(link);
  };

  const installPlatformIcons = () => {
    const specs = [
      ['icon', 'image/png', '16x16', 'assets/icon-16.png'],
      ['icon', 'image/png', '32x32', 'assets/icon-32.png'],
      ['apple-touch-icon', 'image/png', '180x180', 'assets/icon-180.png']
    ];
    specs.forEach(([rel, type, sizes, href]) => {
      if (document.querySelector(`link[rel="${rel}"][sizes="${sizes}"]`)) return;
      const link = document.createElement('link');
      link.rel = rel;
      link.type = type;
      link.sizes = sizes;
      link.href = href;
      document.head.appendChild(link);
    });
  };

  const ensureHeaderCta = () => {
    const t = text[currentLang()];
    document.querySelectorAll('.site-header .nav').forEach((nav) => {
      let cta = nav.querySelector('.header-beta');
      if (!cta) {
        cta = document.createElement('a');
        cta.className = 'header-beta';
        cta.setAttribute('data-experience-header-beta', '');
        const toggle = nav.querySelector('[data-language-toggle]');
        nav.insertBefore(cta, toggle || null);
      }
      cta.href = 'beta.html';
      cta.textContent = t.headerBeta;
      if (document.body.dataset.page === 'beta') cta.setAttribute('aria-current', 'page');
      else cta.removeAttribute('aria-current');
    });
  };

  const updateHeroProduct = (animate = false) => {
    const proof = document.querySelector('.hero-product-proof');
    if (!proof) return;
    const lang = currentLang();
    const view = proof.dataset.activeView || 'archive';
    const img = proof.querySelector('[data-hero-product-image]');
    if (!img) return;
    const src = productViews[view][lang];
    if (img.getAttribute('src') !== src) {
      img.src = src;
      if (animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches && img.animate) {
        img.animate([{opacity:.58, transform:'scale(.997)'}, {opacity:1, transform:'scale(1)'}], {duration:240, easing:'ease-out'});
      }
    }
    const label = view === 'archive' ? 'Input Archive' : view === 'thoughts' ? 'Thought Library' : 'AI Context';
    img.alt = `${text[lang].productAlt} · ${label}`;
    proof.querySelectorAll('[data-product-view]').forEach((button) => {
      button.setAttribute('aria-selected', String(button.dataset.productView === view));
    });
  };

  const bindHeroProduct = () => {
    const proof = document.querySelector('.hero-product-proof');
    if (!proof || proof.dataset.bound === 'true') return;
    proof.dataset.bound = 'true';
    proof.querySelectorAll('[data-product-view]').forEach((button) => {
      button.addEventListener('click', () => {
        proof.dataset.activeView = button.dataset.productView;
        updateHeroProduct(true);
      });
    });
    updateHeroProduct(false);
  };

  const ensureMobileMenu = () => {
    const header = document.querySelector('.site-header');
    const nav = header?.querySelector('.nav');
    if (!header || !nav) return;
    const t = text[currentLang()];

    let button = nav.querySelector('[data-mobile-menu-button]');
    if (!button) {
      button = document.createElement('button');
      button.className = 'mobile-menu-button';
      button.type = 'button';
      button.setAttribute('data-mobile-menu-button', '');
      button.setAttribute('aria-expanded', 'false');
      button.innerHTML = '<span></span><span></span><span></span>';
      nav.appendChild(button);
    }

    let panel = header.querySelector('[data-mobile-menu]');
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'mobile-menu-panel';
      panel.setAttribute('data-mobile-menu', '');
      header.appendChild(panel);
    }

    const homePrefix = document.body.dataset.page === 'home' ? '' : 'index.html';
    panel.innerHTML = `
      <a href="${homePrefix}#product">${t.product}</a>
      <a href="principles.html">${t.principles}</a>
      <a href="${homePrefix}#privacy">${t.privacy}</a>
      <a href="about.html">${t.about}</a>`;

    const syncButton = () => {
      const open = panel.classList.contains('is-open');
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? t.menuClose : t.menuOpen);
    };
    syncButton();

    if (button.dataset.bound !== 'true') {
      button.dataset.bound = 'true';
      button.addEventListener('click', () => {
        panel.classList.toggle('is-open');
        syncButton();
      });
      document.addEventListener('click', (event) => {
        if (!panel.classList.contains('is-open')) return;
        if (header.contains(event.target)) return;
        panel.classList.remove('is-open');
        syncButton();
      });
    }
    panel.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
      panel.classList.remove('is-open');
      syncButton();
    }));
  };

  const ensureAlternates = () => {
    const base = new URL(window.location.href);
    base.searchParams.delete('lang');
    ['zh', 'en', 'x-default'].forEach((code) => {
      let link = document.querySelector(`link[rel="alternate"][hreflang="${code}"]`);
      if (!link) {
        link = document.createElement('link');
        link.rel = 'alternate';
        link.hreflang = code;
        document.head.appendChild(link);
      }
      const url = new URL(base.href);
      if (code !== 'x-default') url.searchParams.set('lang', code);
      link.href = url.href;
    });
  };

  const syncLanguageUrl = () => {
    const lang = currentLang();
    const url = new URL(window.location.href);
    if (url.searchParams.get('lang') !== lang) {
      url.searchParams.set('lang', lang);
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }
  };

  const propagateLanguageLinks = () => {
    const lang = currentLang();
    document.querySelectorAll('a[href]').forEach((anchor) => {
      const raw = anchor.getAttribute('href');
      if (!raw || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) return;
      try {
        const url = new URL(raw, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (!url.pathname.startsWith('/paia/') && url.pathname !== '/paia') return;
        url.searchParams.set('lang', lang);
        anchor.href = `${url.pathname}${url.search}${url.hash}`;
      } catch (_) {}
    });
  };

  const enhanceBetaForm = () => {
    const form = document.querySelector('.beta-form');
    if (!form || form.dataset.ajaxReady === 'true') return;
    form.dataset.ajaxReady = 'true';
    const button = form.querySelector('.beta-submit');
    const buttonLabel = button?.querySelector('[data-site-beta-submit]');
    const status = document.createElement('p');
    status.className = 'beta-form-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    form.appendChild(status);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const lang = currentLang();
      const t = text[lang];
      status.textContent = '';
      status.classList.remove('is-error');
      if (button) { button.disabled = true; button.setAttribute('aria-busy', 'true'); }
      if (buttonLabel) buttonLabel.textContent = t.betaSubmitting;
      const data = new FormData(form);
      data.set('language', lang);
      data.set('source_url', window.location.href);
      data.set('submitted_at', new Date().toISOString());
      data.delete('_next');
      try {
        const response = await fetch('https://formsubmit.co/ajax/haohongfei2001@gmail.com', {
          method: 'POST', body: data, headers: { 'Accept': 'application/json' }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        form.innerHTML = `
          <div class="beta-inline-success" role="status" aria-live="polite">
            <div class="eyebrow">PAIA · PRIVATE BETA</div>
            <h2>${t.betaSuccessTitle}</h2>
            <p>${t.betaSuccessBody}</p>
            <a class="text-link" href="index.html"><span>${t.back}</span> <span aria-hidden="true">→</span></a>
          </div>`;
        propagateLanguageLinks();
      } catch (_) {
        status.textContent = t.betaError;
        status.classList.add('is-error');
        if (button) { button.disabled = false; button.removeAttribute('aria-busy'); }
        if (buttonLabel) buttonLabel.textContent = zh() ? '提交申请' : 'Submit application';
      }
    });
  };

  const refineFooter = () => {
    document.querySelectorAll('.footer-brand small').forEach((small) => {
      small.textContent = currentLang() === 'zh' ? 'Private Beta' : 'Private beta';
    });
  };

  const apply = () => {
    ensureExperienceStylesheet();
    installPlatformIcons();
    ensureHeaderCta();
    ensureMobileMenu();
    bindHeroProduct();
    ensureAlternates();
    syncLanguageUrl();
    propagateLanguageLinks();
    enhanceBetaForm();
    refineFooter();
    updateHeroProduct(false);
  };

  const init = () => {
    apply();
    window.addEventListener('paia:languagechange', apply);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();