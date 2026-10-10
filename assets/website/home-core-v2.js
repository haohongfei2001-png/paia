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
  all('[disabled]').filter(el => !el.closest('[data-narrow-board]')).forEach(el => { el.disabled = false; });
  const ownedTextareas = all('textarea').filter(field => !field.closest('[data-narrow-board]'));
  ownedTextareas.forEach(field => {
    fit(field);
    field.addEventListener('input', () => fit(field));
  });
  document.fonts.ready.then(() => ownedTextareas.forEach(fit));
  let resizeQueued = false;
  addEventListener('resize', () => {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => { ownedTextareas.forEach(fit); resizeQueued = false; });
  }, {passive: true});

  // Direct working-text editing with separate immutable source text.
  const originals = new Map(all('[data-working]').map(el => [el.dataset.working, el.value]));
  const records = all('[data-input]');
  function updateWorking(field) {
    const output = $(`[data-thought-text="${field.dataset.working}"]`);
    output.textContent = field.value;
    text('[data-edit-status]', t('本页工作版本已更新 · 原始来源保留', 'Page working text updated · Original preserved'));
    updateFind();
    renderReading();
    renderContext();
    findTopics();
  }
  // Reader Find locates words inside this conversation. It never filters the
  // continuous document or changes its text, unlike the separate archive search.
  const readerFind = $('[data-archive-search]');
  let findQuery = '';
  let findMatches = [];
  let findCurrent = null;
  let findOrigin = null;
  let findRestoreFrame = null;
  function updateFind() {
    const query = readerFind.value.trim().toLocaleLowerCase();
    if (query && !findQuery) findOrigin = scrollY;
    if (query !== findQuery) findCurrent = null;
    findQuery = query;
    findMatches = [...$('[data-records]').children].filter(record =>
      query && record.querySelector('textarea').value.toLocaleLowerCase().includes(query));
    if (!findMatches.includes(findCurrent)) findCurrent = null;
    records.forEach(record => {
      record.hidden = false;
      if (findMatches.includes(record)) record.dataset.findMatch = 'true';
      else record.removeAttribute('data-find-match');
      if (record === findCurrent) record.dataset.findCurrent = 'true';
      else record.removeAttribute('data-find-current');
    });
    $('[data-find-controls]').hidden = !query;
    $('[data-archive-empty]').hidden = !query || findMatches.length !== 0;
    const position = findCurrent ? findMatches.indexOf(findCurrent) + 1 : 0;
    text('[data-find-count]', t(`${position} / ${findMatches.length} 条输入`, `${position} / ${findMatches.length} inputs`));
    $('[data-find-prev]').disabled = !findMatches.length;
    $('[data-find-next]').disabled = !findMatches.length;
    if (!query) {
      const origin = findOrigin;
      findOrigin = null;
      if (origin !== null) {
        scrollTo({top: origin, behavior: 'instant'});
        // Settle the closed toolbar and restored focus before the browser's
        // next scroll-anchoring pass. This is a single frame, never an idle loop.
        if (findRestoreFrame !== null) cancelAnimationFrame(findRestoreFrame);
        findRestoreFrame = requestAnimationFrame(() => {
          if (!findQuery) scrollTo({top: origin, behavior: 'instant'});
          findRestoreFrame = null;
        });
      }
    }
  }
  function stepFind(direction) {
    if (!findMatches.length) return;
    const index = findMatches.indexOf(findCurrent);
    const next = index < 0 ? (direction < 0 ? findMatches.length - 1 : 0) :
      (index + direction + findMatches.length) % findMatches.length;
    findCurrent = findMatches[next];
    updateFind();
    findCurrent.scrollIntoView({block: 'center', behavior: mayMove() ? 'smooth' : 'instant'});
  }
  all('[data-working]').forEach(field => {
    field.addEventListener('input', () => updateWorking(field));
  });
  readerFind.addEventListener('input', updateFind);
  readerFind.closest('.pc-reader').addEventListener('keydown', event => {
    if (event.key === 'Enter' && event.target === readerFind) { event.preventDefault(); stepFind(event.shiftKey ? -1 : 1); }
    if (event.key === 'Escape' && findQuery) {
      event.preventDefault();
      readerFind.value = '';
      updateFind();
      readerFind.focus({preventScroll: true});
    }
  });
  $('[data-find-prev]').addEventListener('click', () => stepFind(-1));
  $('[data-find-next]').addEventListener('click', () => stepFind(1));
  let reversed = false;
  $('[data-sort]').addEventListener('click', () => {
    reversed = !reversed;
    (reversed ? [...records].reverse() : records).forEach(record => $('[data-records]').append(record));
    updateFind();
    $('[data-sort]').setAttribute('aria-label', t(reversed ? '时间顺序 — 当前为倒序，切换正序' : '时间顺序 — 当前为正序，切换倒序', reversed ? 'Time order — newest first; switch to oldest first' : 'Time order — oldest first; switch to newest first'));
  });
  $('[data-reset-inputs]').addEventListener('click', () => {
    $('[data-archive-search]').value = '';
    all('[data-working]').forEach(field => {
      field.value = originals.get(field.dataset.working);
      updateWorking(field); fit(field);
    });
    text('[data-edit-status]', t('示例已还原 · 原始来源未改变', 'Example reset · Original unchanged'));
  });

  // NIB v4 website interactions have a single owner: narrow-board.js.

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
    const wording = JSON.parse(root.querySelector('[data-reading-presets]').textContent);
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
          scope.push({label: t('我的输入 / 学过以后，留下什么', 'My Inputs / What stays after learning'),
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
      const key = control.dataset.cardAllow;
      const label = key ? (cardLabels[key] || t('我的输入', 'My Inputs')) : control.querySelector('.pc-topic-name').textContent;
      control.setAttribute('aria-label', `${stateLabel.textContent} — ${label} ${t('（示例）', '(example)')}`);
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
