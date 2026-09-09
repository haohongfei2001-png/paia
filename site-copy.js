(() => {
  const copy = {
    zh: {
      navPrinciples: '原则', navAbout: '关于', heroBeta: '加入 Private Beta', heroProblem: '从问题开始',
      availability: 'Chrome Extension · ChatGPT Web · Private Beta',
      closingTitle: '你一路对 AI 说过的话，<br />应该有一个真正属于自己的地方。',
      closingBody: 'PAIA 保存你说过的话，让散落的输入重新成为可以阅读、回看的长期记录。只有你明确选择的部分，才会成为 AI 的上下文。',
      closingButton: '加入 Private Beta', closingPrinciples: '查看产品原则',
      aboutHeroTitle: 'Why PAIA exists.',
      aboutHeroSubtitle: 'PAIA 从一个简单的问题开始：长期交给 AI 的输入，能不能重新成为用户自己可阅读、可拥有的信息。',
      aboutTitle: '一个真正以用户自己的输入为中心的私人信息空间。',
      aboutBody: 'PAIA 不试图成为另一个聊天客户端，也不把用户档案默认变成给模型消费的数据层。它先保存用户真正说过的话，再把长期内容组织成可阅读的主题；只有用户明确选择的部分，才会成为 AI Context。',
      projectTitle: '从产品定义，到一个真实运行的系统。',
      projectBody: 'PAIA 由个人从 0 到 1 设计并持续迭代：从用户问题、信息架构、交互与 AI 能力边界，到使用 Codex 协同完成 Chrome Extension 落地、测试和真实环境验证。',
      projectRole: '独立产品设计 / AI 协同开发',
      principlesHeroTitle: 'Principles behind PAIA.', principlesHeroSubtitle: '这些原则决定 PAIA 做什么，也决定它刻意不做什么。',
      principlesIntro: '四条原则，定义 PAIA 与普通 AI 历史工具之间的边界。',
      privacyPolicy: '隐私政策', terms: '使用条款', contact: '联系', lastUpdated: '最后更新：2026 年 9 月 10 日',
      betaTitle: '加入 PAIA Private Beta',
      betaSubtitle: 'PAIA 正在测试一个本地优先的 Chrome Extension，用来保存、组织并重新阅读你向 AI 发送过的内容。',
      betaEmail: '邮箱', betaTools: '你主要使用哪些 AI？', betaFrequency: '你使用 AI 的频率？', betaGoal: '你希望 PAIA 最先帮你解决什么？',
      betaToolsPlaceholder: '例如 ChatGPT、Claude、Gemini', betaGoalPlaceholder: '可选。写一两句话即可。', betaSubmit: '提交申请',
      betaFreqPlaceholder: '请选择', betaFreqDaily: '每天', betaFreqSeveral: '每周数次', betaFreqWeekly: '每周左右', betaFreqOccasional: '偶尔',
      betaPrivacy: '申请信息会通过 FormSubmit 发送到项目联系邮箱。请不要填写敏感信息。',
      thanksTitle: '申请已提交。', thanksBody: '感谢你对 PAIA Private Beta 的兴趣。如果适合当前测试范围，我会通过邮件联系你。', backHome: '返回 PAIA',
      notFoundTitle: '这个页面不存在。', notFoundBody: '链接可能已经改变，或者这个页面还没有公开。',
      legalPrivacySubtitle: '本地优先。用户显式控制。最小数据边界。', legalTermsSubtitle: '适用于持续迭代中的 PAIA Private Beta。',
      meta: {
        home: ['PAIA — Personal AI Input Archive', 'PAIA 是一个本地优先的个人 AI 输入档案与思想库：保存、整理，并重新阅读你在 AI 中表达过的信息和想法。'],
        principles: ['PAIA 原则 — Personal AI Input Archive', 'PAIA 的核心产品原则：以用户输入为中心、原话优先、AI Context 显式授权，以及受约束的自动化。'],
        about: ['关于 PAIA — Personal AI Input Archive', '了解 PAIA 为什么存在、它的产品边界，以及这个独立项目如何从 0 到 1 落地。'],
        'privacy-policy': ['PAIA 隐私政策', 'PAIA 的本地优先存储、AI 显式授权和最小数据边界说明。'],
        terms: ['PAIA 使用条款', '适用于 PAIA Private Beta 的使用条款。'],
        beta: ['加入 PAIA Private Beta', '申请加入 PAIA Private Beta，帮助测试一个本地优先的个人 AI 输入档案。'],
        thanks: ['PAIA Private Beta — 已提交', 'PAIA Private Beta 申请已提交。'],
        notfound: ['PAIA — 页面不存在', '这个 PAIA 页面不存在。']
      },
      privacyHTML: `
        <h2>1. 核心原则</h2><p>PAIA 当前以本地优先方式运行。核心档案数据默认保存在用户设备上，产品设计优先让保存、检索、备份和多数组织逻辑在本地完成。</p>
        <h2>2. AI 相关数据使用</h2><p>PAIA 不默认把完整档案交给外部 AI。需要调用外部 AI 的功能，应由用户明确触发，并尽量只处理完成当前任务所必要的内容。AI Context 的授权、排除和预览应当先由用户确认。</p>
        <h2>3. 本网站</h2><p>当前公开展示网站不连接用户的 PAIA 档案，也不设置分析脚本或行为跟踪器。网站仅用于说明产品理念、交互与当前开发状态。</p>
        <h2>4. Private Beta 申请</h2><p>Private Beta 申请表通过第三方表单转发服务 FormSubmit 将你主动填写的信息发送到项目联系邮箱 haohongfei2001@gmail.com。申请表只要求测试招募所需的基本信息，请不要提交敏感信息。</p>
        <h2>5. Private Beta</h2><p>PAIA 仍处于 Private Beta。具体数据结构、同步方式和可选 AI 功能可能继续调整。若未来引入云同步、账户系统或新的外部服务，会在正式启用前更新本政策并说明相应数据边界。</p>
        <h2>6. 用户控制与删除</h2><p>产品目标是让用户保留对自己档案的最终控制权，包括查看、编辑、导出和删除。具体能力以当前 Beta 版本实际提供的功能为准。</p>
        <h2>7. 联系</h2><p>有关隐私或 Beta 的问题，请联系 <a href="mailto:haohongfei2001@gmail.com">haohongfei2001@gmail.com</a>。</p>`,
      termsHTML: `
        <h2>1. Beta 状态</h2><p>PAIA 当前处于 Private Beta。功能、数据结构、界面和支持范围可能持续变化，部分能力可能不稳定或暂时不可用。</p>
        <h2>2. 用户数据</h2><p>用户对自己输入、编辑和导入的内容保留相应权利。PAIA 的产品目标是让这些内容保持可查看、可管理和可导出，而不是通过锁定用户数据建立使用门槛。</p>
        <h2>3. 备份责任</h2><p>在 Beta 阶段，用户不应把 PAIA 作为自己重要数据的唯一副本。对于需要长期保存的内容，请同时保留独立备份。</p>
        <h2>4. 合理使用</h2><p>请勿利用 PAIA 进行违法活动、未经授权的数据收集、侵犯他人隐私或知识产权，或规避第三方平台的访问和使用限制。</p>
        <h2>5. 第三方服务</h2><p>PAIA 可能与浏览器、AI 服务或其他第三方平台配合使用。第三方服务的可用性、条款和技术变化不由 PAIA 控制，相关功能可能因此调整。</p>
        <h2>6. 可用性与责任边界</h2><p>Beta 版本按当前状态提供，不承诺持续、无错误或永久可用。产品会尽力降低数据风险，但用户仍应为重要资料保留独立备份。</p>
        <h2>7. 联系</h2><p>有关 Private Beta 或这些条款的问题，请联系 <a href="mailto:haohongfei2001@gmail.com">haohongfei2001@gmail.com</a>。</p>`
    },
    en: {
      navPrinciples: 'Principles', navAbout: 'About', heroBeta: 'Join the Private Beta', heroProblem: 'Start with the problem',
      availability: 'Chrome Extension · ChatGPT Web · Private Beta',
      closingTitle: 'What you’ve told AI over time<br />should have a place that is truly yours.',
      closingBody: 'PAIA preserves what you said and turns scattered inputs into a long-term record you can read and revisit. Only the parts you explicitly choose become context for AI.',
      closingButton: 'Join the Private Beta', closingPrinciples: 'View product principles',
      aboutHeroTitle: 'Why PAIA exists.',
      aboutHeroSubtitle: 'PAIA starts with a simple question: can the things you tell AI become information you can truly read, revisit, and own?',
      aboutTitle: 'A private information space centered on your own inputs.',
      aboutBody: 'PAIA is not another chat client, and it does not treat your archive as a data layer that models can read by default. It preserves what you actually said, organizes long-term material into readable themes, and only turns explicitly selected material into AI Context.',
      projectTitle: 'From product definition to a working system.',
      projectBody: 'PAIA is independently designed and continuously iterated from 0 to 1: from the user problem, information architecture, interaction design, and AI capability boundaries to using Codex to help implement, test, and validate the Chrome Extension in real environments.',
      projectRole: 'Independent Product Design / AI-assisted Development',
      principlesHeroTitle: 'Principles behind PAIA.', principlesHeroSubtitle: 'These principles define what PAIA does — and what it deliberately refuses to do.',
      principlesIntro: 'Four principles define the boundary between PAIA and ordinary AI history tools.',
      privacyPolicy: 'Privacy Policy', terms: 'Terms', contact: 'Contact', lastUpdated: 'Last updated: September 10, 2026',
      betaTitle: 'Join the PAIA Private Beta',
      betaSubtitle: 'PAIA is testing a local-first Chrome Extension for preserving, organizing, and revisiting what you send to AI.',
      betaEmail: 'Email', betaTools: 'Which AI tools do you use most?', betaFrequency: 'How often do you use AI?', betaGoal: 'What would you want PAIA to help you with first?',
      betaToolsPlaceholder: 'e.g. ChatGPT, Claude, Gemini', betaGoalPlaceholder: 'Optional. One or two sentences is enough.', betaSubmit: 'Submit application',
      betaFreqPlaceholder: 'Select one', betaFreqDaily: 'Daily', betaFreqSeveral: 'Several times a week', betaFreqWeekly: 'About weekly', betaFreqOccasional: 'Occasionally',
      betaPrivacy: 'Your application is sent via FormSubmit to the project contact email. Please do not submit sensitive information.',
      thanksTitle: 'Application submitted.', thanksBody: 'Thanks for your interest in the PAIA Private Beta. If you fit the current testing scope, I’ll follow up by email.', backHome: 'Back to PAIA',
      notFoundTitle: 'This page isn’t here.', notFoundBody: 'The link may have changed, or this page may not be public yet.',
      legalPrivacySubtitle: 'Local-first storage. Explicit user control. Minimal data boundaries.', legalTermsSubtitle: 'Terms for the evolving PAIA Private Beta.',
      meta: {
        home: ['PAIA — Personal AI Input Archive', 'PAIA is a local-first personal AI input archive and thought library for preserving, organizing, and revisiting what you have expressed to AI.'],
        principles: ['PAIA Principles — Personal AI Input Archive', 'The product principles behind PAIA: user-input first, source-faithful by default, explicit AI Context authorization, and constrained automation.'],
        about: ['About PAIA — Personal AI Input Archive', 'Why PAIA exists, how its product boundaries are designed, and how the independent project is being built.'],
        'privacy-policy': ['PAIA Privacy Policy', 'PAIA privacy policy for local-first storage, explicit AI authorization, and minimal data boundaries.'],
        terms: ['PAIA Terms', 'Terms for the PAIA Private Beta.'],
        beta: ['Join the PAIA Private Beta', 'Apply to join the PAIA Private Beta and help test a local-first personal AI input archive.'],
        thanks: ['PAIA Private Beta — Submitted', 'Your PAIA Private Beta application has been submitted.'],
        notfound: ['PAIA — Page not found', 'This PAIA page does not exist.']
      },
      privacyHTML: `
        <h2>1. Core principle</h2><p>PAIA currently operates local-first. Core archive data is stored on the user’s device by default, and the product is designed to keep storage, retrieval, backup, and most organizational logic local whenever practical.</p>
        <h2>2. AI-related data use</h2><p>PAIA does not hand the full archive to external AI by default. Features that use external AI should be explicitly triggered by the user and should process only the material necessary for the current task. AI Context authorization, exclusions, and preview remain under user control.</p>
        <h2>3. This website</h2><p>This public showcase site does not connect to a user’s PAIA archive and currently includes no analytics scripts or behavioral trackers. It exists to explain the product, interaction model, and current development state.</p>
        <h2>4. Private Beta applications</h2><p>The Private Beta form uses FormSubmit, a third-party form forwarding service, to send information you choose to provide to the project contact email at haohongfei2001@gmail.com. The form asks only for basic information relevant to Beta recruitment. Please do not submit sensitive information.</p>
        <h2>5. Private Beta</h2><p>PAIA is still in Private Beta. Data structures, sync methods, and optional AI features may change. If cloud sync, accounts, or new external services are introduced, this policy will be updated before broader use to explain the relevant data boundaries.</p>
        <h2>6. User control and deletion</h2><p>The product is intended to keep the user in control of their archive, including viewing, editing, exporting, and deleting content. Exact capabilities depend on the current Beta build.</p>
        <h2>7. Contact</h2><p>For privacy or Beta questions, contact <a href="mailto:haohongfei2001@gmail.com">haohongfei2001@gmail.com</a>.</p>`,
      termsHTML: `
        <h2>1. Beta status</h2><p>PAIA is currently a Private Beta. Features, data structures, interfaces, and supported sources may continue to change, and some capabilities may be unstable or temporarily unavailable.</p>
        <h2>2. Your data</h2><p>You retain the applicable rights to content you input, edit, or import. PAIA is designed to keep that material viewable, manageable, and exportable rather than using data lock-in as a product dependency.</p>
        <h2>3. Backups</h2><p>During the Beta, PAIA should not be the only copy of important information. Keep an independent backup of material you need to preserve long term.</p>
        <h2>4. Acceptable use</h2><p>Do not use PAIA for unlawful activity, unauthorized data collection, infringement of privacy or intellectual-property rights, or to evade third-party platform access and usage restrictions.</p>
        <h2>5. Third-party services</h2><p>PAIA may work alongside browsers, AI services, and other third-party platforms. Their availability, terms, and technical changes are outside PAIA’s control and may require product changes.</p>
        <h2>6. Availability</h2><p>The Beta is provided in its current state without a promise of uninterrupted, error-free, or permanent availability. PAIA will aim to reduce data risk, but users should maintain independent backups of important material.</p>
        <h2>7. Contact</h2><p>For questions about the Private Beta or these terms, contact <a href="mailto:haohongfei2001@gmail.com">haohongfei2001@gmail.com</a>.</p>`
    }
  };

  const lang = () => document.documentElement.dataset.language === 'zh' ? 'zh' : 'en';
  const setText = (selector, value) => document.querySelectorAll(selector).forEach((el) => { el.textContent = value; });
  const setHtml = (selector, value) => document.querySelectorAll(selector).forEach((el) => { el.innerHTML = value; });
  const setAttr = (selector, attr, value) => document.querySelectorAll(selector).forEach((el) => { el.setAttribute(attr, value); });

  const applyMeta = (currentLang, t) => {
    const page = document.body.dataset.page || 'home';
    const pair = t.meta[page] || t.meta.home;
    document.title = pair[0];
    const description = document.querySelector('meta[name="description"]');
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (description) description.setAttribute('content', pair[1]);
    if (ogTitle) ogTitle.setAttribute('content', pair[0]);
    if (ogDescription) ogDescription.setAttribute('content', pair[1]);
  };

  const applyLocalizedImages = (currentLang) => {
    document.querySelectorAll('[data-localized-image]').forEach((img) => {
      const next = currentLang === 'zh' ? img.dataset.zhSrc : img.dataset.enSrc;
      if (next && img.getAttribute('src') !== next) img.setAttribute('src', next);
    });
    const faithful = document.querySelector('.thought-scroll-story .thought-layer-faithful');
    const organized = document.querySelector('.thought-scroll-story .thought-layer-ai');
    const suffix = currentLang === 'zh' ? '' : '-en';
    if (faithful) faithful.style.backgroundImage = `url('assets/screenshots/thought-reading${suffix}.svg?v=1')`;
    if (organized) organized.style.backgroundImage = `url('assets/screenshots/ai-organized${suffix}.svg?v=1')`;
  };

  const apply = () => {
    const currentLang = lang();
    const t = copy[currentLang];
    setText('[data-site-nav-principles]', t.navPrinciples); setText('[data-site-nav-about]', t.navAbout);
    setText('[data-site-hero-beta]', t.heroBeta); setText('[data-site-hero-problem]', t.heroProblem); setText('[data-site-availability]', t.availability);
    setHtml('[data-site-closing-title]', t.closingTitle); setText('[data-site-closing-body]', t.closingBody);
    setText('[data-site-closing-button]', t.closingButton); setText('[data-site-closing-principles]', t.closingPrinciples);
    setHtml('[data-site-about-hero-title]', t.aboutHeroTitle); setText('[data-site-about-hero-subtitle]', t.aboutHeroSubtitle);
    setText('[data-site-about-title]', t.aboutTitle); setText('[data-site-about-body]', t.aboutBody);
    setText('[data-site-project-title]', t.projectTitle); setText('[data-site-project-body]', t.projectBody); setText('[data-site-project-role]', t.projectRole);
    setHtml('[data-site-principles-hero-title]', t.principlesHeroTitle); setText('[data-site-principles-hero-subtitle]', t.principlesHeroSubtitle); setText('[data-site-principles-intro]', t.principlesIntro);
    setText('[data-site-privacy-policy]', t.privacyPolicy); setText('[data-site-terms]', t.terms); setText('[data-site-contact]', t.contact); setText('[data-site-last-updated]', t.lastUpdated);
    setText('[data-site-beta-title]', t.betaTitle); setText('[data-site-beta-subtitle]', t.betaSubtitle); setText('[data-site-beta-email]', t.betaEmail);
    setText('[data-site-beta-tools]', t.betaTools); setText('[data-site-beta-frequency]', t.betaFrequency); setText('[data-site-beta-goal]', t.betaGoal); setText('[data-site-beta-submit]', t.betaSubmit); setText('[data-site-beta-privacy]', t.betaPrivacy);
    setAttr('[data-site-beta-tools-input]', 'placeholder', t.betaToolsPlaceholder); setAttr('[data-site-beta-goal-input]', 'placeholder', t.betaGoalPlaceholder);
    setText('[data-site-beta-freq-placeholder]', t.betaFreqPlaceholder); setText('[data-site-beta-freq-daily]', t.betaFreqDaily); setText('[data-site-beta-freq-several]', t.betaFreqSeveral); setText('[data-site-beta-freq-weekly]', t.betaFreqWeekly); setText('[data-site-beta-freq-occasional]', t.betaFreqOccasional);
    setText('[data-site-thanks-title]', t.thanksTitle); setText('[data-site-thanks-body]', t.thanksBody); setText('[data-site-back-home]', t.backHome);
    setText('[data-site-notfound-title]', t.notFoundTitle); setText('[data-site-notfound-body]', t.notFoundBody);
    setText('[data-site-legal-privacy-subtitle]', t.legalPrivacySubtitle); setText('[data-site-legal-terms-subtitle]', t.legalTermsSubtitle);

    const legal = document.querySelector('[data-legal-copy]');
    if (legal) legal.innerHTML = document.body.dataset.page === 'terms' ? t.termsHTML : t.privacyHTML;

    applyLocalizedImages(currentLang);
    applyMeta(currentLang, t);
  };

  const init = () => { apply(); window.addEventListener('paia:languagechange', apply); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();