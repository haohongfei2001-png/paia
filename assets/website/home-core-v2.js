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
  const text = (selector, value) => { $(selector).textContent = value; };
  function fit(field) {
    field.style.height = 'auto';
    field.style.height = `${Math.max(field.scrollHeight + 2, 36)}px`;
  }
  all('[disabled]').forEach(el => {
    if (!el.hasAttribute('data-await-confirmation')) el.disabled = false;
  });
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
  }
  function filterInputs() {
    const query = $('[data-archive-search]').value.trim().toLocaleLowerCase();
    let count = 0;
    records.forEach(record => {
      record.hidden = !record.querySelector('textarea').value.toLocaleLowerCase().includes(query);
      if (!record.hidden) count++;
    });
    $('[data-archive-empty]').hidden = count !== 0;
  }
  all('[data-working]').forEach(field => field.addEventListener('input', () => updateWorking(field)));
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
    composer.value = value; fit(composer); composer.focus({preventScroll: true});
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
  let dragging = null;
  all('[data-prompt-row]').forEach(row => {
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

  // The four SAME example records are reorganized. No live AI is simulated.
  const topicStage = $('[data-topic-stage]');
  all('[data-topic-view]').forEach(control => control.addEventListener('click', () => {
    const connected = control.dataset.topicView === 'connected';
    const cards = all('[data-thought]');
    const before = cards.map(card => card.getBoundingClientRect());
    topicStage.classList.toggle('is-connected', connected);
    all('[data-topic-view]').forEach(button => button.setAttribute('aria-pressed', String(button === control)));
    text('[data-topic-status]', connected ? t('同一批原话，按时间串联。你的编辑也在其中。', 'The same words, connected through time. Your edits are included.') : t('同一个主题，散落在不同时间。', 'One topic, scattered across different moments.'));
    if (!motion.matches) cards.forEach((card, i) => {
      const after = card.getBoundingClientRect();
      card.animate([{transform: `translate(${before[i].left - after.left}px,${before[i].top - after.top}px)`}, {transform: 'translate(0,0)'}], {duration: 540, easing: 'cubic-bezier(.2,.75,.2,1)'});
    });
  }));
  $('[data-topic-export]').addEventListener('click', () => {
    const title = t('产品的第一步', 'A product’s first step');
    const lines = ['# ' + title, '', t('PAIA 官网互动示例 · 虚构数据 · 含本页工作版本', 'PAIA website interactive example · Fictional data · Includes page working text'), ''];
    all('[data-thought]').forEach(card => {
      lines.push('## ' + card.querySelector('time').textContent.trim(), '', card.querySelector('.pc-topic-source').textContent.trim(), '', card.querySelector('[data-thought-text]').textContent, '');
    });
    const url = URL.createObjectURL(new Blob([lines.join('\n')], {type: 'text/markdown;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url; link.download = 'paia-example-thought-trail.md'; link.hidden = true;
    root.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    text('[data-topic-status]', t('已生成本页思路的 Markdown 文件', 'Markdown file generated from this page’s thought trail'));
  });

  // Local consent demonstration: confirmation is separate from selection;
  // changing any selected content invalidates the previously approved preview.
  let authorized = false;
  const log = [];
  const labels = {
    preference: t('沟通偏好', 'Communication preference'),
    project: t('当前项目', 'Current project'),
    candidate: t('工作方式', 'Working preference')
  };
  function valueFor(key) {
    return key === 'preference' ? $('#pc-personal-note').value : $(key === 'project' ? '[data-context-project]' : '[data-context-candidate]').textContent.trim();
  }
  function selectedFacts() {
    return all('[data-context-item]').filter(field => field.checked && !field.disabled).map(field => ({key: field.dataset.contextItem, value: valueFor(field.dataset.contextItem)}));
  }
  function logAction(message) {
    log.unshift(message);
    if (log.length > 8) log.pop();
    $('[data-usage-log]').replaceChildren(...log.map(value => {
      const item = document.createElement('li'); item.textContent = value; return item;
    }));
  }
  function renderContext(invalidate = true) {
    if (invalidate && authorized) {
      authorized = false;
      logAction(t('内容或范围改变，先前的示例授权已失效。没有内容外发。', 'Content or scope changed; previous example access invalidated. Nothing transmitted.'));
    }
    const selected = selectedFacts();
    const preview = $('[data-context-preview]');
    preview.replaceChildren();
    if (!selected.length) {
      const empty = document.createElement('p'); empty.textContent = t('尚未选择信息。', 'No information selected.'); preview.append(empty);
    }
    selected.forEach(fact => {
      const line = document.createElement('p'), title = document.createElement('strong');
      title.textContent = labels[fact.key]; line.append(title, document.createTextNode(fact.value)); preview.append(line);
    });
    text('[data-access-state]', authorized ? t(`${selected.length} 条示例信息已授权 · 实际发送 0 条`, `${selected.length} example items authorized · 0 transmitted`) : t(`${selected.length} 条已选 · 尚未授权`, `${selected.length} selected · Not authorized`));
    $('[data-authorize]').disabled = selected.length === 0;
    $('[data-authorize]').hidden = authorized;
    $('[data-revoke]').hidden = !authorized;
    $('.pc-access').classList.toggle('is-authorized', authorized);
  }
  all('[data-context-item]').forEach(field => field.addEventListener('change', () => renderContext()));
  $('#pc-personal-note').addEventListener('input', () => renderContext());
  $('[data-confirm-candidate]').addEventListener('click', () => {
    $('[data-await-confirmation]').disabled = false;
    $('[data-pending-fact]').classList.add('is-confirmed');
    text('[data-candidate-badge]', t('你已确认', 'CONFIRMED BY YOU'));
    text('[data-candidate-note]', t('现在可选择是否用于本次任务。', 'You can now select it for this task.'));
    $('[data-confirm-candidate]').hidden = true;
    $('[data-await-confirmation]').focus({preventScroll: true});
    logAction(t('已确认候选信息。没有自动选用或授权。', 'Candidate confirmed. Not automatically selected or authorized.'));
  });
  $('[data-authorize]').addEventListener('click', () => {
    const selected = selectedFacts();
    if (!selected.length) return;
    authorized = true;
    logAction(t(`示例授权：仅本次任务，${selected.length} 条信息；实际发送 0 条。`, `Example access: this task only, ${selected.length} items; 0 transmitted.`));
    renderContext(false);
    $('[data-revoke]').focus({preventScroll: true});
  });
  $('[data-revoke]').addEventListener('click', () => {
    authorized = false;
    logAction(t('本次示例授权已撤回。未连接任何 AI。', 'Example access revoked. No AI was connected.'));
    renderContext(false);
    $('[data-authorize]').focus({preventScroll: true});
  });
  renderContext(false);

  // One bounded reveal per product surface. No hidden-content dependency.
  if ('IntersectionObserver' in window && !motion.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        if (!motion.matches) entry.target.animate([{opacity: .72, transform: 'translateY(24px)'}, {opacity: 1, transform: 'translateY(0)'}], {duration: 620, easing: 'cubic-bezier(.2,.7,.2,1)'});
        observer.unobserve(entry.target);
      });
    }, {threshold: .12});
    all('.pc-reveal').forEach(element => observer.observe(element));
    motion.addEventListener('change', () => {
      if (motion.matches) { observer.disconnect(); root.getAnimations({subtree: true}).forEach(animation => animation.cancel()); }
    });
  }
})();
