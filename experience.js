(() => {
  const zh = () => document.documentElement.dataset.language === 'zh';
  const currentLang = () => zh() ? 'zh' : 'en';
  const text = {
    zh: {
      headerBeta: '加入内测',
      productAlt: 'PAIA 产品界面预览',
      betaSubmitting: '提交中…',
      betaSuccessTitle: '申请已提交。',
      betaSuccessBody: '感谢你对 PAIA Private Beta 的兴趣。如果适合当前测试范围，我会通过邮件联系你。',
      betaError: '提交没有成功。请稍后重试，或直接通过邮箱联系。',
      back: '返回 PAIA'
    },
    en: {
      headerBeta: 'Join beta',
      productAlt: 'PAIA product interface preview',
      betaSubmitting: 'Submitting…',
      betaSuccessTitle: 'Application submitted.',
      betaSuccessBody: 'Thanks for your interest in the PAIA Private Beta. If you fit the current testing scope, I’ll follow up by email.',
      betaError: 'The application could not be submitted. Please try again, or contact the project by email.',
      back: 'Back to PAIA'
    }
  };

  const productViews = {
    archive: {
      zh: 'assets/screenshots/input-archive-home.svg?v=3',
      en: 'assets/screenshots/input-archive-home-en.svg?v=1'
    },
    thoughts: {
      zh: 'assets/screenshots/thought-library.svg?v=3',
      en: 'assets/screenshots/thought-library-en.svg?v=1'
    },
    context: {
      zh: 'assets/screenshots/ai-context.svg?v=3',
      en: 'assets/screenshots/ai-context-en.svg?v=1'
    }
  };

  const installStyles = () => {
    if (document.getElementById('paia-experience-styles')) return;
    const style = document.createElement('style');
    style.id = 'paia-experience-styles';
    style.textContent = `
      .header-beta{display:inline-flex;align-items:center;justify-content:center;min-height:34px;padding:0 13px;border:1px solid #cfd8cb;border-radius:999px;background:#eef2eb;color:#3f503a!important;font-size:12.5px;font-weight:650;white-space:nowrap;transition:background .2s ease,border-color .2s ease,transform .2s ease}.header-beta:hover{background:#e6ece2;border-color:#bdc9b8;transform:translateY(-1px)}
      .hero-product-proof{margin-top:64px}.hero-product-tabs{display:flex;align-items:center;gap:8px;margin:0 0 14px;overflow-x:auto;scrollbar-width:none}.hero-product-tabs::-webkit-scrollbar{display:none}.hero-product-tab{appearance:none;border:0;border-radius:999px;background:transparent;color:#6f796d;padding:8px 12px;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap;transition:background .2s ease,color .2s ease}.hero-product-tab[aria-selected="true"]{background:#e9eee6;color:#354332}.hero-product-frame{position:relative;overflow:hidden;border:1px solid #d6ddd2;border-radius:24px;background:#fbfcf9;box-shadow:0 30px 90px rgba(36,45,34,.10)}.hero-product-frame::before{content:"";position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.72);z-index:1}.hero-product-frame img{width:100%;display:block;background:#fff}.hero-product-meta{display:flex;justify-content:space-between;gap:14px;margin-top:12px;color:#687267;font-size:11.5px;line-height:1.5}.hero-product-meta span:last-child{text-align:right}
      .beta-submit[aria-busy="true"]{opacity:.68;cursor:progress;pointer-events:none}.beta-form-status{min-height:22px;margin:0;color:#687267;font-size:13px}.beta-form-status.is-error{color:#8d4138}.beta-inline-success{padding:34px 0 12px;border-top:1px solid var(--line)}.beta-inline-success .eyebrow{margin-bottom:18px}.beta-inline-success h2{margin-bottom:14px}.beta-inline-success p{max-width:560px;margin-bottom:24px}.beta-inline-success .text-link{font-size:14px}
      @media(max-width:900px){.nav{gap:10px}.header-beta{min-height:32px;padding:0 11px}.hero-product-proof{margin-top:48px}.hero-product-frame{border-radius:20px}}
      @media(max-width:620px){.site-header{padding-left:16px;padding-right:16px}.nav .nav-product,.nav .nav-principles,.nav .nav-privacy,.nav .nav-about{display:none!important}.header-beta{display:inline-flex!important}.nav{gap:9px}.hero-product-proof{margin-top:42px}.hero-product-frame{border-radius:16px}.hero-product-meta{display:none}}
    `;
    document.head.appendChild(style);
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
        const toggle = nav.querySelector('[data-language-toggle]');
        nav.insertBefore(cta, toggle || null);
      }
      cta.href = 'beta.html';
      cta.textContent = t.headerBeta;
      if (document.body.dataset.page === 'beta') cta.setAttribute('aria-current', 'page');
      else cta.removeAttribute('aria-current');
    });
  };

  const updateHeroProduct = () => {
    const proof = document.querySelector('.hero-product-proof');
    if (!proof) return;
    const lang = currentLang();
    const view = proof.dataset.activeView || 'archive';
    const img = proof.querySelector('[data-hero-product-image]');
    if (!img) return;
    const src = productViews[view][lang];
    if (img.getAttribute('src') !== src) {
      img.src = src;
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && img.animate) {
        img.animate([{opacity:.55,transform:'scale(.997)'},{opacity:1,transform:'scale(1)'}], {duration:260,easing:'ease-out'});
      }
    }
    const label = view === 'archive' ? 'Input Archive' : view === 'thoughts' ? 'Thought Library' : 'AI Context';
    img.alt = `${text[lang].productAlt} · ${label}`;
  };

  const ensureHeroProduct = () => {
    if (document.body.dataset.page !== 'home') return;
    const hero = document.querySelector('.hero');
    if (!hero) return;
    let proof = hero.querySelector('.hero-product-proof');
    if (!proof) {
      proof = document.createElement('div');
      proof.className = 'hero-product-proof';
      proof.dataset.activeView = 'archive';
      proof.innerHTML = `
        <div class="hero-product-tabs" role="tablist" aria-label="PAIA product views">
          <button class="hero-product-tab" type="button" role="tab" data-product-view="archive" aria-selected="true">Input Archive</button>
          <button class="hero-product-tab" type="button" role="tab" data-product-view="thoughts" aria-selected="false">Thought Library</button>
          <button class="hero-product-tab" type="button" role="tab" data-product-view="context" aria-selected="false">AI Context</button>
        </div>
        <div class="hero-product-frame"><img data-hero-product-image alt="" decoding="async" fetchpriority="high" /></div>
        <div class="hero-product-meta"><span>Local-first product preview</span><span>Input Archive → Thought Library → AI Context</span></div>`;
      hero.appendChild(proof);
      proof.querySelectorAll('[data-product-view]').forEach((button) => {
        button.addEventListener('click', () => {
          proof.dataset.activeView = button.dataset.productView;
          proof.querySelectorAll('[data-product-view]').forEach((b) => b.setAttribute('aria-selected', String(b === button)));
          updateHeroProduct();
        });
      });
    }
    updateHeroProduct();
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
      const u = new URL(base.href);
      if (code !== 'x-default') u.searchParams.set('lang', code);
      link.href = u.href;
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
          method: 'POST',
          body: data,
          headers: { 'Accept': 'application/json' }
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

  const apply = () => {
    installStyles();
    installPlatformIcons();
    ensureHeaderCta();
    ensureHeroProduct();
    ensureAlternates();
    syncLanguageUrl();
    propagateLanguageLinks();
    enhanceBetaForm();
    updateHeroProduct();
  };

  const init = () => {
    apply();
    window.addEventListener('paia:languagechange', apply);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
