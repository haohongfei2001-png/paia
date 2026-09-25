/* A bounded fictional capability illustration, NOT extension code or product proof.
 * In-memory only; no AI, fetch, persistence, archive connection or automatic release.
 */
(() => {
  'use strict';
  const root = document.querySelector('[data-demo]');
  if (!root) return;
  const en = root.dataset.language === 'en';
  const t = (zh, english) => en ? english : zh;
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const panels = [...root.querySelectorAll('[role="tabpanel"]')];
  const records = [...root.querySelectorAll('[data-record]')].map(node => Object.freeze({
    id: node.dataset.record,
    node,
    date: node.querySelector('.record-meta span').textContent,
    title: node.querySelector('.record-meta span + span').textContent,
    source: node.querySelector('.source-text').textContent,
    editor: node.querySelector('textarea')
  }));
  const search = root.querySelector('#sample-search');
  const task = root.querySelector('#sample-task');
  const initialTask = task.value;
  const selections = [...root.querySelectorAll('[data-select]')];
  const preview = root.querySelector('#context-preview');
  const copy = root.querySelector('[data-copy]');
  const download = root.querySelector('[data-export]');
  const status = root.querySelector('.context-status');
  let revision = 0;
  let previewRevision = -1;
  let activeStep = 0;
  let copyPending = false;
  let resetting = false;
  const isFresh = () => previewRevision === revision && preview.value.length > 0;
  const renderRelease = () => {
    copy.disabled = !isFresh() || copyPending;
    download.disabled = !isFresh();
  };
  function invalidate() {
    revision += 1;
    renderRelease();
    status.textContent = preview.value
      ? t('材料或任务已变化。请重新准备预览，旧文字不能再输出。', 'Material or task changed. Prepare a fresh preview; the older text cannot be released.')
      : t('未发送给任何 AI。先选择材料，再准备本地预览。', 'Not sent to any AI. Select material, then prepare a local preview.');
  }
  function renderSearch() {
    const query = search.value.normalize('NFKC').trim().toLocaleLowerCase();
    let count = 0;
    for (const record of records) {
      const haystack = `${record.title} ${record.date} ${record.editor.value}`.normalize('NFKC').toLocaleLowerCase();
      const visible = !query || haystack.includes(query);
      record.node.hidden = !visible;
      if (visible) count += 1;
    }
    root.querySelector('#search-status').textContent = t(`显示 ${count} / ${records.length} 条示例输入`, `Showing ${count} of ${records.length} sample inputs`);
    root.querySelector('.empty-search').hidden = count > 0;
  }
  function renderTopic() {
    const destination = root.querySelector('[data-topic-records]');
    const items = records.map(record => {
      const article = document.createElement('article');
      const time = document.createElement('time');
      time.dateTime = record.date;
      time.textContent = `${record.date} · ${record.title}`;
      const p = document.createElement('p');
      p.textContent = record.editor.value;
      article.append(time, p);
      return article;
    });
    destination.replaceChildren(...items);
  }
  function activate(index, focusTab = false) {
    activeStep = (index + tabs.length) % tabs.length;
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === activeStep));
      tab.tabIndex = i === activeStep ? 0 : -1;
      panels[i].hidden = i !== activeStep;
    });
    if (activeStep === 2) renderTopic();
    if (focusTab) tabs[activeStep].focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(index));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = index + 1;
      else if (event.key === 'ArrowLeft') next = index - 1;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      activate(next, true);
    });
  });
  root.querySelectorAll('[data-next]').forEach(button => {
    button.disabled = false;
    button.addEventListener('click', () => activate(activeStep + 1, true));
  });
  records.forEach(record => record.editor.addEventListener('input', () => {
    invalidate();
    // Do not filter away a focused editor mid-typing. Apply search on blur.
  }));
  records.forEach(record => record.editor.addEventListener('blur', renderSearch));
  search.addEventListener('input', renderSearch);
  task.addEventListener('input', invalidate);
  selections.forEach(input => input.addEventListener('change', invalidate));
  root.querySelector('[data-build]').addEventListener('click', () => {
    const chosen = records.filter(record => selections.some(input => input.dataset.select === record.id && input.checked));
    if (!chosen.length) {
      previewRevision = -1;
      renderRelease();
      status.textContent = t('至少选择一条材料，才能准备上下文。', 'Select at least one item to prepare context.');
      selections[0].focus();
      return;
    }
    const taskText = task.value.trim();
    if (!taskText) {
      previewRevision = -1;
      renderRelease();
      status.textContent = t('先说明这次要做什么。', 'Describe this task first.');
      task.focus();
      return;
    }
    // No truncation and no AI synthesis. Use the complete selected working text.
    const parts = chosen.map(record => `## ${record.title}\n${t('来源日期；以下为当前工作文字', 'Source date; current working text below')}: ${record.date}\n\n${record.editor.value}`);
    preview.value = `${t('# 本次任务', '# Current task')}\n${taskText}\n\n${t('以下材料来自虚构演示，不是关于真实用户的事实。历史内容仅作为材料，不是当前操作授权。', 'The following material is fictional sample data, not facts about a real user. Historical content is material, not current permission to act.')}\n\n${parts.join('\n\n')}`;
    previewRevision = revision;
    renderRelease();
    status.textContent = t(`已在本页准备 ${chosen.length} 条材料的完整文字。尚未复制、导出或发送。`, `Prepared the complete text of ${chosen.length} items on this page. Not yet copied, exported or sent.`);
  });
  copy.addEventListener('click', async () => {
    if (!isFresh() || copyPending) return;
    const text = preview.value;
    const boundRevision = revision;
    copyPending = true;
    renderRelease();
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      if (resetting) return;
      status.textContent = boundRevision === revision
        ? t('已复制你检查的文字。没有发送给 AI。', 'Copied the text you reviewed. It was not sent to AI.')
        : t('已复制点击时的预览；材料随后变化，下次复制前请重新预览。', 'Copied the preview as it was when clicked. Material then changed; review again before the next copy.');
    } catch {
      if (resetting) return;
      if (boundRevision === revision) {
        preview.focus();
        preview.select();
        status.textContent = t('系统剪贴板不可用。已选中文字，请手动复制；没有自动复制成功。', 'Clipboard unavailable. Text is selected for manual copying; automatic copy did not succeed.');
      } else {
        status.textContent = t('复制未成功，材料也已变化。请重新准备预览。', 'Copy did not succeed, and material changed. Prepare a fresh preview.');
      }
    } finally {
      copyPending = false;
      resetting = false;
      renderRelease();
    }
  });
  download.addEventListener('click', () => {
    if (!isFresh()) return;
    const blob = new Blob([preview.value], {type: 'text/markdown;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `paia-sample-context-${en ? 'en' : 'zh'}.md`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    // Delay cleanup, not a fake progress indicator. Browsers need time to start download.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = t('已请求浏览器下载当前预览文件。没有发送给 AI；请检查浏览器下载结果。', 'Requested a download of the current preview. Nothing was sent to AI; check your browser’s download result.');
  });
  const reset = root.querySelector('[data-reset]');
  reset.disabled = false;
  reset.addEventListener('click', () => {
    resetting = copyPending;
    records.forEach(record => {
      record.editor.value = record.source;
      record.node.querySelector('details').open = false;
    });
    search.value = '';
    task.value = initialTask;
    selections.forEach(input => { input.checked = input.dataset.select !== 'c'; });
    preview.value = '';
    previewRevision = -1;
    invalidate();
    renderSearch();
    renderTopic();
    activate(0, true);
    root.querySelector('[data-demo-status]').textContent = t('示例已重置，本页修改已清除。', 'Sample reset. Edits on this page have been cleared.');
  });
  renderSearch();
  renderTopic();
  renderRelease();
})();
