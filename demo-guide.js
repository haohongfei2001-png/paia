(() => {
  const root = document.querySelector('[data-paia-demo]');
  if (!root) return;

  const controls = root.querySelector('.demo-controls');
  if (!controls) return;

  const guide = document.createElement('section');
  guide.className = 'demo-guide';
  guide.setAttribute('aria-live', 'polite');
  controls.insertAdjacentElement('afterend', guide);

  const copy = {
    zh: {
      steps: [
        ['1 / 3', '打开「产品研究与决策」', '先从一条真实会话进入 Input Archive。'],
        ['2 / 3', '修改其中一句话', '直接编辑正文。你的修改会保留，并影响依赖它的长期主题。'],
        ['3 / 3', '去 Thought Library 看结果', '打开 Thought Library，再进入「长期学习系统」，看看原始表达如何进入长期主题。']
      ],
      completeTitle: '核心链路已经走完。',
      completeBody: '你刚刚体验了 Input Archive → 用户编辑 → Thought Library。接下来可以自由探索 AI Context 与 Smart Filter。',
      beta: '加入 Private Beta →',
      explore: '继续自由探索',
      skip: '跳过引导'
    },
    en: {
      steps: [
        ['1 / 3', 'Open “Product research & decisions”', 'Start from a real conversation inside Input Archive.'],
        ['2 / 3', 'Edit one sentence', 'Edit the source text directly. Your change is preserved and carries into the long-term topic built from it.'],
        ['3 / 3', 'See it in Thought Library', 'Open Thought Library, then enter “Long-term learning system” to see how source material becomes a durable topic.']
      ],
      completeTitle: 'You have completed the core path.',
      completeBody: 'You just experienced Input Archive → user edit → Thought Library. You can now explore AI Context and Smart Filter freely.',
      beta: 'Join the Private Beta →',
      explore: 'Continue exploring',
      skip: 'Skip guide'
    }
  };

  let step = 0;
  let dismissed = false;

  const lang = () => document.documentElement.dataset.language === 'zh' ? 'zh' : 'en';
  const clearTargets = () => root.querySelectorAll('.is-guide-target').forEach((node) => node.classList.remove('is-guide-target'));

  const markTarget = () => {
    clearTargets();
    if (dismissed || step >= 3) return;

    let target = null;
    if (step === 0) {
      target = root.querySelector('[data-demo-conversation="research"]') || root.querySelector('[data-demo-nav="archive"]');
    } else if (step === 1) {
      target = root.querySelector('[data-demo-editable]') || root.querySelector('[data-demo-conversation="research"]') || root.querySelector('[data-demo-nav="archive"]');
    } else {
      target = root.querySelector('[data-demo-topic="learning"]') || root.querySelector('[data-demo-nav="thoughts"]');
    }
    target?.classList.add('is-guide-target');
  };

  const render = () => {
    if (dismissed) {
      guide.hidden = true;
      clearTargets();
      return;
    }

    guide.hidden = false;
    const c = copy[lang()];
    if (step >= 3) {
      guide.classList.add('is-complete');
      guide.innerHTML = `
        <div class="demo-guide-progress">3 / 3</div>
        <div class="demo-guide-copy"><strong>${c.completeTitle}</strong><span>${c.completeBody}</span></div>
        <div class="demo-guide-actions"><a href="beta.html?lang=${lang()}">${c.beta}</a><button type="button" data-demo-guide-dismiss>${c.explore}</button></div>`;
    } else {
      guide.classList.remove('is-complete');
      const [progress, title, body] = c.steps[step];
      guide.innerHTML = `
        <div class="demo-guide-progress">${progress}</div>
        <div class="demo-guide-copy"><strong>${title}</strong><span>${body}</span></div>
        <div class="demo-guide-actions"><button type="button" data-demo-guide-dismiss>${c.skip}</button></div>`;
    }

    guide.querySelector('[data-demo-guide-dismiss]')?.addEventListener('click', () => {
      dismissed = true;
      render();
    });
    requestAnimationFrame(markTarget);
  };

  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-demo-reset]')) {
      step = 0;
      dismissed = false;
      render();
      return;
    }

    const conversation = event.target.closest('[data-demo-conversation]');
    if (step === 0 && conversation?.dataset.demoConversation === 'research') {
      step = 1;
      render();
      return;
    }

    const topic = event.target.closest('[data-demo-topic]');
    if (step === 2 && topic?.dataset.demoTopic === 'learning') {
      step = 3;
      render();
    }
  });

  root.addEventListener('input', (event) => {
    if (step !== 1 || !event.target.closest('[data-demo-editable]')) return;
    step = 2;
    render();
  });

  const observer = new MutationObserver(() => requestAnimationFrame(markTarget));
  observer.observe(root, { childList: true, subtree: true });
  window.addEventListener('paia:languagechange', render);
  render();
})();