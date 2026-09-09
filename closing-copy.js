(() => {
  const copy = {
    zh: {
      title: '你一路对 AI 说过的话，<br />应该有一个真正属于自己的地方。',
      body: 'PAIA 保存你说过的话，让散落的输入重新成为可以阅读、回看的长期记录。只有你明确选择的部分，才会成为 AI 的上下文。',
      button: '加入 Private Beta',
      principles: '查看产品原则'
    },
    en: {
      title: 'What you’ve told AI over time<br />should have a place that is truly yours.',
      body: 'PAIA preserves what you said and turns scattered inputs into a long-term record you can read and revisit. Only the parts you explicitly choose become context for AI.',
      button: 'Join the Private Beta',
      principles: 'View product principles'
    }
  };

  const apply = () => {
    const lang = document.documentElement.dataset.language === 'zh' ? 'zh' : 'en';
    const text = copy[lang];

    const title = document.querySelector('[data-closing-title]');
    const body = document.querySelector('[data-closing-body]');
    const button = document.querySelector('[data-closing-button]');
    const principles = document.querySelector('[data-closing-principles]');

    if (title) title.innerHTML = text.title;
    if (body) body.textContent = text.body;
    if (button) button.textContent = text.button;
    if (principles) principles.textContent = text.principles;
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
