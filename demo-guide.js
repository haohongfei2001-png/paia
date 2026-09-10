(() => {
  const root = document.querySelector('[data-paia-demo]');
  if (!root) return;

  const controls = root.querySelector('.demo-controls');
  const stage = root.querySelector('[data-demo-stage]');
  if (!controls || !stage) return;

  const guide = document.createElement('section');
  guide.className = 'demo-guide';
  guide.setAttribute('aria-live', 'polite');
  guide.innerHTML = `
    <div class="demo-guide-progress-wrap" aria-hidden="true">
      <span class="demo-guide-progress" data-demo-guide-progress>1 / 3</span>
      <span class="demo-guide-dots">
        <i data-demo-guide-dot="0"></i><i data-demo-guide-dot="1"></i><i data-demo-guide-dot="2"></i>
      </span>
    </div>
    <div class="demo-guide-copy" data-demo-guide-copy>
      <strong data-demo-guide-title></strong>
      <span data-demo-guide-body></span>
    </div>
    <div class="demo-guide-actions">
      <a data-demo-guide-beta href="beta.html" hidden></a>
      <button type="button" data-demo-guide-dismiss></button>
    </div>`;
  controls.insertAdjacentElement('afterend', guide);

  const progressNode = guide.querySelector('[data-demo-guide-progress]');
  const titleNode = guide.querySelector('[data-demo-guide-title]');
  const bodyNode = guide.querySelector('[data-demo-guide-body]');
  const copyNode = guide.querySelector('[data-demo-guide-copy]');
  const betaLink = guide.querySelector('[data-demo-guide-beta]');
  const dismissButton = guide.querySelector('[data-demo-guide-dismiss]');
  const dots = [...guide.querySelectorAll('[data-demo-guide-dot]')];

  const copy = {
    zh: {
      steps: [
        ['打开「产品研究与决策」', '先从一条真实会话进入 Input Archive。'],
        ['修改其中一句话', '直接编辑正文；离开编辑后，你的修改会被保留。'],
        ['去 Thought Library 看结果', '打开 Thought Library，看看这次修改怎样进入长期主题。']
      ],
      topicStep: ['打开「长期学习系统」', '原始表达仍然保留，同时进入跨会话的长期主题。'],
      completeTitle: '核心链路已经走完。',
      completeBody: 'Input Archive → 用户编辑 → Thought Library。接下来可以自由探索 AI Context 与 Smart Filter。',
      beta: '加入 Private Beta →',
      explore: '继续探索',
      skip: '跳过'
    },
    en: {
      steps: [
        ['Open “Product research & decisions”', 'Start from a real conversation inside Input Archive.'],
        ['Edit one sentence', 'Edit the source text directly; your change is preserved when you leave the editor.'],
        ['See it in Thought Library', 'Open Thought Library and see how the edit carries into a long-term topic.']
      ],
      topicStep: ['Open “Long-term learning system”', 'The source remains intact while it becomes part of a cross-conversation topic.'],
      completeTitle: 'Core path complete.',
      completeBody: 'Input Archive → user edit → Thought Library. You can now explore AI Context and Smart Filter freely.',
      beta: 'Join the Private Beta →',
      explore: 'Keep exploring',
      skip: 'Skip'
    }
  };

  let step = 0;
  let dismissed = false;
  let targetFrame = 0;
  let lastCopyKey = '';

  const lang = () => document.documentElement.dataset.language === 'zh' ? 'zh' : 'en';
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const clearTargets = () => root.querySelectorAll('.is-guide-target').forEach((node) => node.classList.remove('is-guide-target'));

  const markTarget = () => {
    targetFrame = 0;
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

  const queueTargetRefresh = () => {
    if (targetFrame) cancelAnimationFrame(targetFrame);
    targetFrame = requestAnimationFrame(markTarget);
  };

  const animateCopy = () => {
    if (reducedMotion() || !copyNode?.animate) return;
    copyNode.animate(
      [
        { opacity: .45, transform: 'translateY(4px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ],
      { duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' }
    );
  };

  const render = (animate = false) => {
    if (dismissed) {
      guide.hidden = true;
      clearTargets();
      return;
    }

    guide.hidden = false;
    const c = copy[lang()];
    const complete = step >= 3;
    const topicVisible = step === 2 && !!root.querySelector('[data-demo-topic="learning"]');
    const pair = complete ? [c.completeTitle, c.completeBody] : topicVisible ? c.topicStep : c.steps[step];
    const copyKey = `${lang()}-${step}-${topicVisible}-${complete}`;

    guide.classList.toggle('is-complete', complete);
    progressNode.textContent = complete ? '3 / 3' : `${step + 1} / 3`;
    dots.forEach((dot, index) => {
      dot.classList.toggle('is-done', complete || index < step);
      dot.classList.toggle('is-current', !complete && index === step);
    });

    if (copyKey !== lastCopyKey) {
      titleNode.textContent = pair[0];
      bodyNode.textContent = pair[1];
      lastCopyKey = copyKey;
      if (animate) animateCopy();
    }

    betaLink.hidden = !complete;
    betaLink.textContent = c.beta;
    betaLink.href = `beta.html?lang=${lang()}`;
    dismissButton.textContent = complete ? c.explore : c.skip;

    queueTargetRefresh();
  };

  const advance = (next) => {
    if (dismissed || next <= step) return;
    step = Math.min(next, 3);
    render(true);
  };

  guide.addEventListener('click', (event) => {
    if (!event.target.closest('[data-demo-guide-dismiss]')) return;
    dismissed = true;
    render(false);
  });

  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-demo-reset]')) {
      step = 0;
      dismissed = false;
      lastCopyKey = '';
      render(false);
      return;
    }

    const conversation = event.target.closest('[data-demo-conversation]');
    if (step === 0 && conversation?.dataset.demoConversation === 'research') {
      advance(1);
      return;
    }

    const topic = event.target.closest('[data-demo-topic]');
    if (step === 2 && topic?.dataset.demoTopic === 'learning') advance(3);
  });

  // Advance only when editing is actually finished. This avoids changing the
  // guide while the user is still typing and matches the demo's save-on-blur behavior.
  root.addEventListener('focusout', (event) => {
    if (step === 1 && event.target.closest('[data-demo-editable]')) advance(2);
  });

  // Observe only the demo stage. Guide updates no longer trigger the observer,
  // and stage rerenders are coalesced into a single animation frame.
  const observer = new MutationObserver(() => {
    if (step === 2) {
      const topicVisible = !!root.querySelector('[data-demo-topic="learning"]');
      const expectedKey = `${lang()}-${step}-${topicVisible}-false`;
      if (expectedKey !== lastCopyKey) render(true);
      else queueTargetRefresh();
    } else {
      queueTargetRefresh();
    }
  });
  observer.observe(stage, { childList: true });

  window.addEventListener('paia:languagechange', () => {
    lastCopyKey = '';
    render(false);
  });

  render(false);
})();