/* PAIA post-capture previews. Fictional, ephemeral, browser-local only.
   No network, persistence, model calls, capture permissions or automatic sending. */
(() => {
  'use strict';
  const root = document.querySelector('[data-core-preview]');
  if (!root) return;
  const zh = root.dataset.locale === 'zh';
  const t = (cn, en) => zh ? cn : en;
  const $ = selector => root.querySelector(selector);
  const all = selector => [...root.querySelectorAll(selector)];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const mayMove = () => !motion.matches && document.documentElement.dataset.motion !== 'off';
  const arrive = element => { if (mayMove()) element.animate([{opacity: .4, transform: 'translateY(8px)'}, {opacity: 1, transform: 'translateY(0)'}], {duration: 220, easing: 'cubic-bezier(.2,0,0,1)'}); };
  const text = (selector, value) => { $(selector).textContent = value; };
  function fit(field) {
    field.style.height = 'auto';
    field.style.height = `${Math.max(field.scrollHeight + 2, 36)}px`;
  }
  all('[disabled]').forEach(el => { el.disabled = false; });
  all('textarea').forEach(field => {
    fit(field);
    field.addEventListener('input', () => fit(field));
  });
  document.fonts.ready.then(() => all('textarea').forEach(fit));
  let resizeQueued = false;
  addEventListener('resize', () => {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => { all('textarea').forEach(fit); resizeQueued = false; });
  }, {passive: true});

  // Direct working-text editing with separate immutable source text.
  const originals = new Map(all('[data-working]').map(el => [el.dataset.working, el.value]));
  const records = all('[data-input]');
  function updateWorking(field) {
    const output = $(`[data-thought-text="${field.dataset.working}"]`);
    output.textContent = field.value;
    text('[data-edit-status]', t('本页工作版本已更新 · 原始来源保留', 'Page working text updated · Original preserved'));
    filterInputs();
    renderReading();
    renderContext();
    findTopics();
  }
  function filterInputs() {
    const query = $('[data-archive-search]').value.trim().toLocaleLowerCase();
    let count = 0;
    records.forEach(record => {
      const field = record.querySelector('textarea');
      record.hidden = document.activeElement !== field && !field.value.toLocaleLowerCase().includes(query);
      if (!record.hidden) count++;
    });
    $('[data-archive-empty]').hidden = count !== 0;
  }
  all('[data-working]').forEach(field => {
    field.addEventListener('input', () => updateWorking(field));
    field.addEventListener('blur', filterInputs);
  });
  $('[data-archive-search]').addEventListener('input', filterInputs);
  let reversed = false;
  $('[data-sort]').addEventListener('click', () => {
    reversed = !reversed;
    (reversed ? [...records].reverse() : records).forEach(record => $('[data-records]').append(record));
    $('[data-sort]').setAttribute('aria-label', t(reversed ? '当前为倒序，切换正序' : '当前为正序，切换倒序', reversed ? 'Newest first; switch to oldest first' : 'Oldest first; switch to newest first'));
  });
  $('[data-reset-inputs]').addEventListener('click', () => {
    $('[data-archive-search]').value = '';
    all('[data-working]').forEach(field => {
      field.value = originals.get(field.dataset.working);
      updateWorking(field); fit(field);
    });
    text('[data-edit-status]', t('示例已还原 · 原始来源未改变', 'Example reset · Original unchanged'));
  });

  // Personal prompt wording/order are editable. Selecting only fills a composer.
  const promptList = $('[data-prompt-list]');
  const composer = $('#pc-composer');
  function insertPrompt(value) {
    if (!value.trim()) return;
    composer.value = composer.value.length ? composer.value + '\n\n' + value : value;
    fit(composer); composer.focus({preventScroll: true});
    if (mayMove()) composer.closest('.pc-composer').animate([{boxShadow: '0 0 0 3px #a4c5f2'}, {boxShadow: '0 0 0 0px #a4c5f200'}], {duration: 650, easing: 'ease-out'});
    text('[data-prompt-status]', t('已填入本页输入框 · 没有发送', 'Inserted in this page’s composer · Not sent'));
  }
  function rankPrompts() {
    const rows = [...promptList.children];
    rows.forEach((row, i) => {
      row.querySelector('[data-rank]').textContent = String(i + 1).padStart(2, '0');
      row.querySelector('[data-move="-1"]').disabled = i === 0 || rows[i - 1].classList.contains('is-pinned') !== row.classList.contains('is-pinned');
      row.querySelector('[data-move="1"]').disabled = i === rows.length - 1 || rows[i + 1].classList.contains('is-pinned') !== row.classList.contains('is-pinned');
    });
  }
  const promptToggle = $('[data-prompt-toggle]');
  promptToggle.addEventListener('click', () => {
    const card = $('#pc-prompt-card');
    card.hidden = !card.hidden;
    promptToggle.setAttribute('aria-expanded', String(!card.hidden));
    if (!card.hidden) arrive(card);
  });
  const suggestionToggle = $('[data-suggestion-toggle]');
  suggestionToggle.addEventListener('click', () => {
    const capsule = $('#pc-local-suggestion');
    capsule.hidden = !capsule.hidden;
    suggestionToggle.setAttribute('aria-expanded', String(!capsule.hidden));
    suggestionToggle.textContent = capsule.hidden ? t('显示建议', 'Show suggestion') : t('收起建议', 'Hide suggestion');
    if (!capsule.hidden) arrive(capsule);
  });
  let dragging = null;
  all('[data-prompt-row]').forEach(row => {
    const pick = row.querySelector('[data-prompt-pick]');
    const field = row.querySelector('[data-prompt-text]');
    const manage = row.querySelector('[data-prompt-manage]');
    const management = row.querySelector('.pc-prompt-management');
    pick.addEventListener('click', () => insertPrompt(field.value));
    row.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !management.hidden) { event.preventDefault(); management.hidden = true; manage.setAttribute('aria-expanded', 'false'); manage.focus({preventScroll: true}); }
    });
    manage.addEventListener('click', () => {
      const opening = management.hidden;
      all('.pc-prompt-management').forEach(panel => { panel.hidden = true; });
      all('[data-prompt-manage]').forEach(control => control.setAttribute('aria-expanded', 'false'));
      management.hidden = !opening;
      manage.setAttribute('aria-expanded', String(opening));
      if (opening) { fit(field); arrive(management); }
    });
    field.addEventListener('input', () => {
      pick.textContent = field.value || t('空提示词', 'Empty prompt');
      pick.disabled = !field.value.trim();
      if (row.dataset.promptRow === '0') $('[data-suggestion]').textContent = field.value;
    });
    row.querySelector('[data-pin]').addEventListener('click', () => {
      const pinned = row.classList.toggle('is-pinned');
      const control = row.querySelector('[data-pin]');
      control.setAttribute('aria-pressed', String(pinned));
      control.textContent = pinned ? t('已固定', 'Pinned') : t('固定', 'Pin');
      control.setAttribute('aria-label', pinned ? t('取消固定提示词', 'Unpin prompt') : t('固定提示词', 'Pin prompt'));
      [...promptList.children].sort((a, b) => Number(b.classList.contains('is-pinned')) - Number(a.classList.contains('is-pinned'))).forEach(item => promptList.append(item));
      rankPrompts();
      control.focus({preventScroll: true});
      text('[data-prompt-status]', pinned ? t('已固定在前方 · 只保留在本页', 'Pinned above unpinned prompts · This page only') : t('已取消固定 · 可继续排序', 'Unpinned · Ready to reorder'));
    });
    row.querySelector('[data-insert]').addEventListener('click', () => insertPrompt(row.querySelector('textarea').value));
    row.querySelectorAll('[data-move]').forEach(control => control.addEventListener('click', () => {
      const delta = Number(control.dataset.move);
      const other = delta < 0 ? row.previousElementSibling : row.nextElementSibling;
      if (!other || other.classList.contains('is-pinned') !== row.classList.contains('is-pinned')) return;
      if (delta < 0) promptList.insertBefore(row, other); else promptList.insertBefore(other, row);
      rankPrompts();
      const available = control.disabled ? row.querySelector('[data-insert]') : control;
      available.focus({preventScroll: true});
      text('[data-prompt-status]', t('顺序已在本页更新', 'Prompt order updated on this page'));
    }));
    const grip = row.querySelector('.pc-grip');
    grip.draggable = true;
    grip.addEventListener('dragstart', event => {
      dragging = row;
      event.dataTransfer.setData('text/plain', row.dataset.promptRow);
      event.dataTransfer.effectAllowed = 'move';
      row.classList.add('is-dragging');
    });
    row.addEventListener('dragover', event => {
      if (!dragging || dragging === row || dragging.classList.contains('is-pinned') !== row.classList.contains('is-pinned')) return;
      event.preventDefault(); event.dataTransfer.dropEffect = 'move'; row.classList.add('is-drop-target');
    });
    row.addEventListener('dragleave', () => row.classList.remove('is-drop-target'));
    row.addEventListener('drop', event => {
      if (!dragging || dragging === row || dragging.classList.contains('is-pinned') !== row.classList.contains('is-pinned')) return;
      event.preventDefault();
      const after = event.clientY > row.getBoundingClientRect().top + row.offsetHeight / 2;
      promptList.insertBefore(dragging, after ? row.nextElementSibling : row);
      rankPrompts();
      text('[data-prompt-status]', t('顺序已在本页更新', 'Prompt order updated on this page'));
      all('[data-prompt-row]').forEach(item => item.classList.remove('is-drop-target', 'is-dragging'));
      dragging = null;
    });
    grip.addEventListener('dragend', () => {
      all('[data-prompt-row]').forEach(item => item.classList.remove('is-drop-target', 'is-dragging'));
      dragging = null;
    });
  });
  rankPrompts();
  $('[data-suggestion]').addEventListener('click', () => insertPrompt($('[data-suggestion]').textContent.trim()));

  // PT1: stable Topic/Section grid, then a continuous reader in the same space.
  const topicStage = $('[data-topic-stage]');
  const topicOverview = $('[data-topic-overview]');
  let topicReturn = null;
  let topicScroll = 0;
  all('[data-topic-reader]').forEach(reader => { reader.hidden = true; });
  topicStage.dataset.view = 'overview';
  all('[data-topic-open]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    topicReturn = link;
    topicScroll = scrollY;
    const key = link.dataset.topicOpen;
    topicOverview.hidden = true;
    all('[data-topic-reader]').forEach(reader => { reader.hidden = reader.dataset.topicReader !== key; });
    topicStage.dataset.view = 'reader';
    const target = root.querySelector(link.getAttribute('href'));
    target.focus({preventScroll: true});
    if (link.classList.contains('pc-section-anchor')) target.scrollIntoView({block: 'start', behavior: 'instant'});
    arrive($(`[data-topic-reader="${key}"]`));
    text('[data-topic-status]', t('同一个主题，按章节连续阅读。原话与来源仍然保留。', 'The same topic, read continuously by section. Your words and sources remain.'));
  }));
  all('[data-topic-back]').forEach(control => control.addEventListener('click', () => {
    all('[data-topic-reader]').forEach(reader => { reader.hidden = true; });
    topicOverview.hidden = false;
    topicStage.dataset.view = 'overview';
    if (topicReturn) topicReturn.focus({preventScroll: true});
    scrollTo({top: topicScroll, behavior: 'instant'});
    text('[data-topic-status]', t('回到原来的主题位置。', 'Back to the same place in your topics.'));
    arrive(topicOverview);
  }));
  const topicSearch = $('[data-topic-search]');
  const topicBlocks = all('[data-topic-block]');
  function findTopics() {
    const query = topicSearch.value.trim().toLocaleLowerCase();
    let matches = 0;
    topicBlocks.forEach(block => {
      const reader = $(`[data-topic-reader="${block.dataset.topicBlock}"]`);
      const body = [...reader.querySelectorAll('h3,h4,[data-thought-text],.pc-reader-prose')].map(element => element.textContent).join(' ');
      const contents = (block.textContent + ' ' + body).toLocaleLowerCase();
      const match = contents.includes(query);
      if (query) block.dataset.match = match ? 'yes' : 'no'; else block.removeAttribute('data-match');
      if (match) matches++;
    });
    text('[data-topic-match]', query ? t(`找到 ${matches} 个示例主题。`, `${matches} example topics match.`) : '');
  }
  topicSearch.addEventListener('input', findTopics);
  topicSearch.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    const first = topicBlocks.find(block => block.dataset.match !== 'no');
    if (first) { event.preventDefault(); first.querySelector('h3 a').focus(); }
  });
  // The three approved styles illustrate derivative reading only. An edited
  // source never leaves the prewritten derivative looking like a current result.
  const reading = $('[data-reading-style]');
  function renderReading() {
    const changed = all('[data-working]').some(field => field.value !== originals.get(field.dataset.working));
    const wording = {
      original: t('保留上方原话。整理只改变阅读呈现，不覆盖你的文字或主题组织。', 'Keep the words above. Organization changes the reading view, never your words or topic structure.'),
      balanced: t('最初比较素材找回和内容生成，判断创作者更需要什么。随后把第一版缩到一个反复发生的问题，暂缓协作。最新保留的决定是先做素材找回，是否增加生成待后续判断；仍以能否接上下一次任务作为标准。', 'The early question compared material retrieval with generation. The scope then narrowed to one recurring problem, with collaboration deferred. The latest retained decision is to start with retrieval and decide later whether to add generation. Success still means helping the next task build on existing work.'),
      concise: t('当前决定：先验证素材找回，暂缓协作；是否增加生成以后再判断，标准是下一次任务能否接上积累。', 'Current decision: validate retrieval first and defer collaboration. Decide later whether to add generation, judging it by whether the next task builds on existing work.')
    };
    const output = $('[data-reading-output]');
    output.replaceChildren();
    const line = document.createElement('p');
    line.textContent = changed && reading.value !== 'original'
      ? t('原话已被修改，这份预设整理已不再对应当前文字。请查看上方工作版本，或还原示例再比较整理方式。本页不会调用 AI 重新生成。', 'The words have changed, so the preset organization is out of date. Read the current working text above, or reset the example to compare styles. This page does not call AI to regenerate it.')
      : wording[reading.value];
    output.append(line);
    output.dataset.stale = String(changed && reading.value !== 'original');
  }
  reading.addEventListener('change', renderReading);
  renderReading();

  // Four independent cards and explicit Personal Topic access. Switches only
  // update this page's scope illustration; there is no real grant or AI client.
  const master = $('[data-context-global]');
  const isOn = field => field.getAttribute('aria-pressed') === 'true';
  const setOn = (field, value) => field.setAttribute('aria-pressed', String(value));
  const removedItems = new Set();
  let openedCard = null;
  const cardLabels = {
    info: t('我的信息', 'My Information'),
    rules: t('我的规则', 'My Rules'),
    now: t('我的现在', 'My Now')
  };
  function renderContext() {
    const scope = [];
    if (isOn(master)) {
      Object.entries(cardLabels).forEach(([key, label]) => {
        if (!isOn($(`[data-card-allow="${key}"]`)) || removedItems.has(key)) return;
        const value = $(`[data-context-text="${key}"]`).value;
        if (value.trim()) scope.push({label, value});
      });
      if (isOn($('[data-card-allow="inputs"]'))) {
        if (isOn($('[data-topic-allow="product"]'))) {
          scope.push({label: t('我的输入 / 产品的第一步', 'My Inputs / A product’s first step'),
            value: all('[data-topic-reader="product"] [data-thought-text]').map(field => field.textContent).join('\n\n')});
        }
        if (isOn($('[data-topic-allow="writing"]'))) {
          scope.push({label: t('我的输入 / 写作习惯', 'My Inputs / Writing practice'),
            value: all('[data-topic-reader="writing"] .pc-reader-prose').map(item => item.textContent).join('\n\n')});
        }
      }
    }
    const preview = $('[data-context-preview]');
    preview.replaceChildren();
    if (!scope.length) {
      const empty = document.createElement('p');
      empty.textContent = isOn(master)
        ? t('尚未开放任何内容。分别选择卡片，以及“我的输入”中的主题。', 'Nothing is open yet. Choose cards, and topics within My Inputs, separately.')
        : t('已暂停：没有内容在允许范围内。卡片内容和单独的开关选择仍然保留。', 'Paused: no content is in the allowed scope. Card content and individual choices are retained.');
      preview.append(empty);
    }
    scope.forEach(item => {
      const line = document.createElement('p');
      const label = document.createElement('strong');
      label.textContent = item.label;
      line.append(label, document.createTextNode(item.value));
      preview.append(line);
    });
    text('[data-access-state]', isOn(master)
      ? t('允许范围已在本页更新 · 未连接 AI', 'Page scope updated · No AI connected')
      : t('已暂停 · 没有内容外发', 'Paused · Nothing transmitted'));
    $('.pc-access').classList.toggle('is-authorized', isOn(master) && scope.length > 0);
    master.textContent = isOn(master) ? t('AI 访问：开', 'AI access: on') : t('AI 访问：关', 'AI access: off');
    all('[data-card-allow], [data-topic-allow]').forEach(control => {
      const parentsOpen = isOn(master) && (!control.hasAttribute('data-topic-allow') || isOn($('[data-card-allow="inputs"]')));
      const stateLabel = control.querySelector('[data-topic-access-state]') || control;
      stateLabel.textContent = isOn(control)
        ? (parentsOpen ? t('AI 可读', 'AI readable') : t('已开放', 'Open'))
        : t('仅自己', 'Only me');
    });
    Object.keys(cardLabels).forEach(key => {
      const removed = removedItems.has(key);
      $(`[data-context-entry="${key}"]`).hidden = removed;
      $(`[data-context-empty="${key}"]`).hidden = !removed;
      text(`[data-card-count="${key}"]`, removed ? t('0 条内容', '0 items') : t('1 条内容', '1 item'));
    });
    const topicsOpen = all('[data-topic-allow]').filter(isOn).length;
    text('[data-topic-count]', topicsOpen ? t(`${topicsOpen} 个主题已开放`, `${topicsOpen} topics open`) : t('尚未开放主题', 'No topics open'));

    $('[data-context-pause]').disabled = !isOn(master);
    $('[data-context-clear]').disabled = !isOn(master) && !all('[data-card-allow], [data-topic-allow]').some(isOn);
  }
  all('[data-card-allow], [data-topic-allow], [data-context-global]').forEach(field => field.addEventListener('click', () => {
    setOn(field, !isOn(field));
    renderContext();
  }));
  all('[data-card-open]').forEach(control => control.addEventListener('click', () => {
    openedCard = control.dataset.cardOpen;
    $('[data-context-overview]').hidden = true;
    all('[data-card-detail]').forEach(detail => { detail.hidden = detail.dataset.cardDetail !== openedCard; });
    all(`[data-card-detail="${openedCard}"] textarea`).forEach(fit);
    $(`#pc-detail-${openedCard}`).focus({preventScroll: true});
    arrive($(`[data-card-detail="${openedCard}"]`));
  }));
  all('[data-context-back]').forEach(control => control.addEventListener('click', () => {
    all('[data-card-detail]').forEach(detail => { detail.hidden = true; });
    $('[data-context-overview]').hidden = false;
    arrive($('[data-context-overview]'));
    $(`[data-card-open="${openedCard}"]`).focus({preventScroll: true});
  }));
  all('[data-context-remove]').forEach(control => control.addEventListener('click', () => {
    removedItems.add(control.dataset.contextRemove);
    renderContext();
    $(`[data-context-undo="${control.dataset.contextRemove}"]`).focus({preventScroll: true});
  }));
  all('[data-context-undo]').forEach(control => control.addEventListener('click', () => {
    const key = control.dataset.contextUndo;
    removedItems.delete(key);
    renderContext();
    fit($(`[data-context-text="${key}"]`));
    $(`[data-context-text="${key}"]`).focus({preventScroll: true});
  }));
  all('[data-context-text]').forEach(field => field.addEventListener('input', renderContext));
  $('[data-context-pause]').addEventListener('click', () => {
    setOn(master, false);
    renderContext();
    master.focus({preventScroll: true});
  });
  $('[data-context-clear]').addEventListener('click', () => {
    setOn(master, false);
    all('[data-card-allow], [data-topic-allow]').forEach(field => { setOn(field, false); });
    renderContext();
    master.focus({preventScroll: true});
  });
  renderContext();

  // Site presentation owns the page arrivals; product interactions remain local.
  document.addEventListener('paia:motionchange', () => {
    if (!mayMove()) root.getAnimations({subtree: true}).forEach(animation => animation.cancel());
  });
})();
