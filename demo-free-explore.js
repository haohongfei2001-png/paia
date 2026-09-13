(() => {
  if (document.body?.dataset.page !== 'demo') return;

  const copy = {
    zh: {
      subtitle: '使用演示数据自由探索 Input Archive、Thought Library、AI Context 与设置。',
      reset: '恢复初始状态',
      hint: '自由探索不同会话、编辑、过滤、Thought Library、AI Context 与设置。这里不会使用你的真实数据。'
    },
    en: {
      subtitle: 'Explore Input Archive, Thought Library, AI Context, and Settings freely with demo data.',
      reset: 'Reset state',
      hint: 'Explore conversations, editing, filtering, Thought Library, AI Context, and Settings freely. No personal data is used here.'
    }
  };

  const lang = () => document.documentElement.dataset.language === 'zh' ? 'zh' : 'en';

  const apply = () => {
    const c = copy[lang()];
    document.querySelectorAll('[data-site-demo-subtitle]').forEach((node) => { node.textContent = c.subtitle; });
    document.querySelectorAll('[data-demo-reset]').forEach((node) => { node.textContent = c.reset; });
    document.querySelectorAll('[data-demo-hint]').forEach((node) => { node.textContent = c.hint; });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();

  window.addEventListener('paia:languagechange', () => requestAnimationFrame(apply));
})();
