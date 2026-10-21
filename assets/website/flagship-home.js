/* One fictional expression, continued. No storage, AI or network connection. */
(() => {
  'use strict';
  const root = document.querySelector('[data-continuation]');
  if (!root) return;
  const $ = selector => root.querySelector(selector);
  const zh = document.documentElement.lang.startsWith('zh');
  const t = (z, e) => zh ? z : e;
  const original = $('[data-continuation-original]');
  const working = $('[data-continuation-working]');
  const form = $('[data-continuation-form]');
  const field = $('[data-continuation-text]');
  const opener = $('[data-continuation-edit]');
  const status = $('[data-continuation-status]');
  const initial = original.textContent;
  let current = working.textContent;
  const close = () => {
    form.hidden = true;
    working.hidden = false;
    opener.hidden = false;
    opener.focus({preventScroll:true});
  };
  opener.addEventListener('click', () => {
    field.value = current;
    form.hidden = false;
    working.hidden = true;
    opener.hidden = true;
    field.focus({preventScroll:true});
  });
  $('[data-continuation-save]').addEventListener('click', () => {
    if (!field.value.trim()) {
      status.textContent = t('留下一些文字，或者取消这次修改。', 'Keep some words, or cancel this edit.');
      field.focus();
      return;
    }
    current = field.value;
    working.textContent = current;
    $('[data-continuation-echo]').textContent = current;
    // The original is never an edit target. It remains a separate source.
    if (original.textContent !== initial) original.textContent = initial;
    status.textContent = t('修改已留在本页，也出现在下方的主题阅读中。原话没有改变。', 'Kept in this page and the topic reading below. Your original is unchanged.');
    close();
  });
  $('[data-continuation-cancel]').addEventListener('click', close);
  form.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !event.isComposing) {
      event.preventDefault();
      close();
    }
  });
})();
