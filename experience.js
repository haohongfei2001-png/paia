(() => {
  const currentLang = () => document.documentElement.dataset.language === 'zh' ? 'zh' : 'en';
  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const text = {
    zh: {
      headerBeta: '加入内测', productAlt: 'PAIA 产品界面预览',
      product: '产品', demo: '体验', homeDemo: '体验 PAIA', principles: '原则', privacy: '隐私', about: '关于',
      demoTitle: '体验 PAIA。',
      demoSubtitle: '打开一个会话，改一句话，再看看它如何进入 Thought Library 与 AI Context。',
      demoNote: '演示数据 · 所有交互都在浏览器本地运行',
      demoBack: '← 返回产品首页',
      demoExitTitle: '想用自己的档案试试 PAIA？',
      demoExitPrinciples: '看看背后的产品原则',
      menuOpen: '打开导航', menuClose: '关闭导航',
      betaSubmitting: '提交中…',
      betaSuccessTitle: '申请已提交。',
      betaSuccessBody: '感谢你对 PAIA Private Beta 的兴趣。如果适合当前测试范围，我会通过邮件联系你。',
      betaError: '提交没有成功。请稍后重试，或直接通过邮箱联系。',
      back: '返回 PAIA'
    },
    en: {
      headerBeta: 'Join beta', productAlt: 'PAIA product interface preview',
      product: 'Product', demo: 'Demo', homeDemo: 'Try PAIA', principles: 'Principles', privacy: 'Privacy', about: 'About',
      demoTitle: 'Try PAIA.',
      demoSubtitle: 'Open a conversation, edit one sentence, then see how it carries into Thought Library and AI Context.',
      demoNote: 'Demo data · every interaction runs entirely in your browser',
      demoBack: '← Back to product home',
      demoExitTitle: 'Ready to try PAIA with your own archive?',
      demoExitPrinciples: 'Read the product principles',
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

  const t = () => text[currentLang()];
  const page = () => document.body.dataset.page || 'home';

  const installPlatformIcons = () => {
    [
      ['icon', 'image/png', '16x16', 'assets/icon-16.png'],
      ['icon', 'image/png', '32x32', 'assets/icon-32.png'],
      ['apple-touch-icon', 'image/png', '180x180', 'assets/icon-180.png']
    ].forEach(([rel, type, sizes, href]) => {
      if (document.querySelector(`link[rel="${rel}"][sizes="${sizes}"]`)) return;
      const link = document.createElement('link');
      Object.assign(link, { rel, type, sizes, href });
      document.head.appendChild(link);
    });
  };

  const ensureDemoLinks = () => {
    const copy = t();
    const isDemo = page() === 'demo';

    document.querySelectorAll('.site-header .nav').forEach((nav) => {
      let link = nav.querySelector('.nav-demo');
      if (!link) {
        link = document.createElement('a');
        link.className = 'nav-demo';
        link.dataset.siteNavDemo = '';
        nav.insertBefore(link, nav.querySelector('.nav-principles, .header-beta, [data-language-toggle]'));
      }
      link.href = 'demo.html';
      link.textContent = copy.demo;
      if (isDemo) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });

    document.querySelectorAll('.footer-links').forEach((footer) => {
      let link = footer.querySelector('[data-site-nav-demo]');
      if (!link) {
        link = document.createElement('a');
        link.dataset.siteNavDemo = '';
        link.href = 'demo.html';
        footer.insertBefore(link, footer.querySelector('a[href^="principles.html"], .footer-meta'));
      }
      link.textContent = copy.demo;
      if (isDemo) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });

    document.querySelectorAll('[data-site-nav-demo]').forEach((link) => { link.textContent = copy.demo; });
    document.querySelectorAll('[data-site-home-demo-link]').forEach((link) => { link.textContent = copy.homeDemo; });
  };

  const applyDemoPageCopy = () => {
    if (page() !== 'demo') return;
    const copy = t();
    const setters = [
      ['[data-site-demo-title]', copy.demoTitle],
      ['[data-site-demo-subtitle]', copy.demoSubtitle],
      ['[data-site-demo-note]', copy.demoNote],
      ['[data-site-demo-back]', copy.demoBack],
      ['[data-site-demo-exit-title]', copy.demoExitTitle],
      ['[data-site-demo-exit-principles]', copy.demoExitPrinciples]
    ];
    setters.forEach(([selector, value]) => document.querySelectorAll(selector).forEach((el) => { el.textContent = value; }));

    const title = currentLang() === 'zh' ? '体验 PAIA — Interactive Demo' : 'Try PAIA — Interactive Demo';
    const description = currentLang() === 'zh'
      ? '使用演示数据体验 PAIA 的 Input Archive、Thought Library 与 AI Context。所有交互都在浏览器本地运行。'
      : 'Explore PAIA Input Archive, Thought Library, and AI Context with demo data. Every interaction runs entirely in your browser.';
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
  };

  const ensureHeaderCta = () => {
    const copy = t();
    document.querySelectorAll('.site-header .nav').forEach((nav) => {
      let cta = nav.querySelector('.header-beta');
      if (!cta) {
        cta = document.createElement('a');
        cta.className = 'header-beta';
        cta.dataset.experienceHeaderBeta = '';
        nav.insertBefore(cta, nav.querySelector('[data-language-toggle]'));
      }
      cta.href = 'beta.html';
      cta.textContent = copy.headerBeta;
      if (page() === 'beta') cta.setAttribute('aria-current', 'page');
      else cta.removeAttribute('aria-current');
    });
  };

  const updateHeroProduct = (animate = false) => {
    const proof = document.querySelector('.hero-product-proof');
    if (!proof) return;

    const view = proof.dataset.activeView || 'archive';
    const lang = currentLang();
    const image = proof.querySelector('[data-hero-product-image]');
    const panel = proof.querySelector('[role="tabpanel"]');
    const buttons = [...proof.querySelectorAll('[data-product-view]')];
    if (!image || !productViews[view]) return;

    const src = productViews[view][lang];
    if (image.getAttribute('src') !== src) {
      image.src = src;
      if (animate && !prefersReducedMotion() && image.animate) {
        image.animate([{ opacity: .72 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
      }
    }

    const label = view === 'archive' ? 'Input Archive' : view === 'thoughts' ? 'Thought Library' : 'AI Context';
    image.alt = `${t().productAlt} · ${label}`;

    buttons.forEach((button) => {
      const active = button.dataset.productView === view;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });

    const activeButton = buttons.find((button) => button.dataset.productView === view);
    if (panel && activeButton?.id) panel.setAttribute('aria-labelledby', activeButton.id);
  };

  const bindHeroProduct = () => {
    const proof = document.querySelector('.hero-product-proof');
    if (!proof || proof.dataset.bound === 'true') return;
    proof.dataset.bound = 'true';

    const buttons = [...proof.querySelectorAll('[data-product-view]')];
    const activate = (button, focus = false) => {
      proof.dataset.activeView = button.dataset.productView;
      updateHeroProduct(true);
      if (focus) button.focus();
    };

    buttons.forEach((button, index) => {
      button.addEventListener('click', () => activate(button));
      button.addEventListener('keydown', (event) => {
        let next = null;
        if (event.key === 'ArrowRight') next = buttons[(index + 1) % buttons.length];
        if (event.key === 'ArrowLeft') next = buttons[(index - 1 + buttons.length) % buttons.length];
        if (event.key === 'Home') next = buttons[0];
        if (event.key === 'End') next = buttons[buttons.length - 1];
        if (!next) return;
        event.preventDefault();
        activate(next, true);
      });
    });

    updateHeroProduct(false);
  };

  const ensureMobileMenu = () => {
    const header = document.querySelector('.site-header');
    const nav = header?.querySelector('.nav');
    if (!header || !nav) return;
    const copy = t();

    let button = nav.querySelector('[data-mobile-menu-button]');
    if (!button) {
      button = document.createElement('button');
      button.className = 'mobile-menu-button';
      button.type = 'button';
      button.dataset.mobileMenuButton = '';
      button.innerHTML = '<span></span><span></span><span></span>';
      nav.appendChild(button);
    }

    let panel = header.querySelector('[data-mobile-menu]');
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'mobile-menu-panel';
      panel.dataset.mobileMenu = '';
      header.appendChild(panel);
    }

    if (!panel.id) panel.id = 'mobile-site-menu';
    button.setAttribute('aria-controls', panel.id);

    const homePrefix = page() === 'home' ? '' : 'index.html';
    const demoCurrent = page() === 'demo' ? ' aria-current="page"' : '';
    panel.innerHTML = `
      <a href="${homePrefix}#product">${copy.product}</a>
      <a href="demo.html" data-site-nav-demo${demoCurrent}>${copy.demo}</a>
      <a href="principles.html">${copy.principles}</a>
      <a href="${homePrefix}#privacy">${copy.privacy}</a>
      <a href="about.html">${copy.about}</a>`;

    const sync = () => {
      const open = panel.classList.contains('is-open');
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? copy.menuClose : copy.menuOpen);
      panel.setAttribute('aria-hidden', String(!open));
    };

    const close = (restoreFocus = false) => {
      if (!panel.classList.contains('is-open')) return;
      panel.classList.remove('is-open');
      sync();
      if (restoreFocus) button.focus();
    };

    const open = () => {
      panel.classList.add('is-open');
      sync();
    };

    sync();

    if (button.dataset.bound !== 'true') {
      button.dataset.bound = 'true';
      button.addEventListener('click', () => {
        if (panel.classList.contains('is-open')) close(false);
        else open();
      });

      document.addEventListener('click', (event) => {
        if (panel.classList.contains('is-open') && !header.contains(event.target)) close(false);
      });

      document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || !panel.classList.contains('is-open')) return;
        event.preventDefault();
        close(true);
      });
    }

    panel.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => close(false)));
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
    const url = new URL(window.location.href);
    const lang = currentLang();
    if (url.searchParams.get('lang') === lang) return;
    url.searchParams.set('lang', lang);
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
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
      const copy = text[lang];
      status.textContent = '';
      status.classList.remove('is-error');
      if (button) { button.disabled = true; button.setAttribute('aria-busy', 'true'); }
      if (buttonLabel) buttonLabel.textContent = copy.betaSubmitting;

      const data = new FormData(form);
      data.set('language', lang);
      data.set('source_url', window.location.href);
      data.set('submitted_at', new Date().toISOString());
      data.delete('_next');

      try {
        const response = await fetch('https://formsubmit.co/ajax/haohongfei2001@gmail.com', {
          method: 'POST', body: data, headers: { Accept: 'application/json' }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        form.innerHTML = `
          <div class="beta-inline-success" role="status" aria-live="polite">
            <div class="eyebrow">PAIA · PRIVATE BETA</div>
            <h2>${copy.betaSuccessTitle}</h2>
            <p>${copy.betaSuccessBody}</p>
            <a class="text-link" href="index.html"><span>${copy.back}</span> <span aria-hidden="true">→</span></a>
          </div>`;
        propagateLanguageLinks();
      } catch (_) {
        status.textContent = copy.betaError;
        status.classList.add('is-error');
        if (button) { button.disabled = false; button.removeAttribute('aria-busy'); }
        if (buttonLabel) buttonLabel.textContent = lang === 'zh' ? '提交申请' : 'Submit application';
      }
    });
  };

  const refineFooter = () => {
    document.querySelectorAll('.footer-brand small').forEach((small) => {
      small.textContent = currentLang() === 'zh' ? 'Private Beta' : 'Private beta';
    });
  };

  const apply = () => {
    installPlatformIcons();
    ensureDemoLinks();
    ensureHeaderCta();
    ensureMobileMenu();
    bindHeroProduct();
    ensureAlternates();
    syncLanguageUrl();
    propagateLanguageLinks();
    enhanceBetaForm();
    refineFooter();
    applyDemoPageCopy();
    updateHeroProduct(false);
  };

  const init = () => {
    apply();
    window.addEventListener('paia:languagechange', apply);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
