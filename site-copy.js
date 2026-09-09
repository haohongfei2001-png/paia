(() => {
  const copy = {
    zh: {
      navPrinciples: '原则',
      navAbout: '关于',
      heroBeta: '加入 Private Beta',
      heroProblem: '从问题开始',
      closingTitle: '你一路对 AI 说过的话，<br />应该有一个真正属于自己的地方。',
      closingBody: 'PAIA 保存你说过的话，让散落的输入重新成为可以阅读、回看的长期记录。只有你明确选择的部分，才会成为 AI 的上下文。',
      closingButton: '加入 Private Beta',
      closingPrinciples: '查看产品原则',
      aboutHeroTitle: 'Why PAIA exists.',
      aboutHeroSubtitle: 'PAIA 从一个简单的问题开始：长期交给 AI 的输入，能不能重新成为用户自己可阅读、可拥有的信息。',
      aboutTitle: '一个真正以用户自己的输入为中心的私人信息空间。',
      aboutBody: 'PAIA 不试图成为另一个聊天客户端，也不把用户档案默认变成给模型消费的数据层。它先保存用户真正说过的话，再把长期内容组织成可阅读的主题；只有用户明确选择的部分，才会成为 AI Context。',
      projectTitle: '从产品定义，到一个真实运行的系统。',
      projectBody: 'PAIA 由个人从 0 到 1 设计并持续迭代：从用户问题、信息架构、交互与 AI 能力边界，到使用 Codex 协同完成 Chrome Extension 落地、测试和真实环境验证。',
      projectRole: '独立产品设计 / AI 协同开发',
      principlesHeroTitle: 'Principles behind PAIA.',
      principlesHeroSubtitle: '这些原则决定 PAIA 做什么，也决定它刻意不做什么。',
      principlesIntro: '四条原则，定义 PAIA 与普通 AI 历史工具之间的边界。',
      privacyPolicy: '隐私政策',
      terms: '使用条款',
      contact: '联系',
      lastUpdated: '最后更新：2026 年 9 月 10 日'
    },
    en: {
      navPrinciples: 'Principles',
      navAbout: 'About',
      heroBeta: 'Join the Private Beta',
      heroProblem: 'Start with the problem',
      closingTitle: 'What you’ve told AI over time<br />should have a place that is truly yours.',
      closingBody: 'PAIA preserves what you said and turns scattered inputs into a long-term record you can read and revisit. Only the parts you explicitly choose become context for AI.',
      closingButton: 'Join the Private Beta',
      closingPrinciples: 'View product principles',
      aboutHeroTitle: 'Why PAIA exists.',
      aboutHeroSubtitle: 'PAIA starts with a simple question: can the things you tell AI become information you can truly read, revisit, and own?',
      aboutTitle: 'A private information space centered on your own inputs.',
      aboutBody: 'PAIA is not another chat client, and it does not treat your archive as a data layer that models can read by default. It preserves what you actually said, organizes long-term material into readable themes, and only turns explicitly selected material into AI Context.',
      projectTitle: 'From product definition to a working system.',
      projectBody: 'PAIA is independently designed and continuously iterated from 0 to 1: from the user problem, information architecture, interaction design, and AI capability boundaries to using Codex to help implement, test, and validate the Chrome Extension in real environments.',
      projectRole: 'Independent Product Design / AI-assisted Development',
      principlesHeroTitle: 'Principles behind PAIA.',
      principlesHeroSubtitle: 'These principles define what PAIA does — and what it deliberately refuses to do.',
      principlesIntro: 'Four principles define the boundary between PAIA and ordinary AI history tools.',
      privacyPolicy: 'Privacy Policy',
      terms: 'Terms',
      contact: 'Contact',
      lastUpdated: 'Last updated: September 10, 2026'
    }
  };

  const lang = () => document.documentElement.dataset.language === 'zh' ? 'zh' : 'en';
  const setText = (selector, value) => document.querySelectorAll(selector).forEach((el) => { el.textContent = value; });
  const setHtml = (selector, value) => document.querySelectorAll(selector).forEach((el) => { el.innerHTML = value; });

  const apply = () => {
    const t = copy[lang()];
    setText('[data-site-nav-principles]', t.navPrinciples);
    setText('[data-site-nav-about]', t.navAbout);
    setText('[data-site-hero-beta]', t.heroBeta);
    setText('[data-site-hero-problem]', t.heroProblem);
    setHtml('[data-site-closing-title]', t.closingTitle);
    setText('[data-site-closing-body]', t.closingBody);
    setText('[data-site-closing-button]', t.closingButton);
    setText('[data-site-closing-principles]', t.closingPrinciples);
    setHtml('[data-site-about-hero-title]', t.aboutHeroTitle);
    setText('[data-site-about-hero-subtitle]', t.aboutHeroSubtitle);
    setText('[data-site-about-title]', t.aboutTitle);
    setText('[data-site-about-body]', t.aboutBody);
    setText('[data-site-project-title]', t.projectTitle);
    setText('[data-site-project-body]', t.projectBody);
    setText('[data-site-project-role]', t.projectRole);
    setHtml('[data-site-principles-hero-title]', t.principlesHeroTitle);
    setText('[data-site-principles-hero-subtitle]', t.principlesHeroSubtitle);
    setText('[data-site-principles-intro]', t.principlesIntro);
    setText('[data-site-privacy-policy]', t.privacyPolicy);
    setText('[data-site-terms]', t.terms);
    setText('[data-site-contact]', t.contact);
    setText('[data-site-last-updated]', t.lastUpdated);
  };

  const init = () => {
    apply();
    window.addEventListener('paia:languagechange', apply);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
