/* One small, page-local demonstration. No model, archive, storage or send. */
(() => {
  'use strict';
  if (document.body.dataset.siteRevision !== '20261022') return;
  const host = document.querySelector('[data-vs-host]');
  const draft = document.querySelector('#vs-draft');
  const board = document.querySelector('#vs-prompt-board');
  const toggle = document.querySelector('[data-vs-toggle]');
  const reset = document.querySelector('[data-vs-reset]');
  const status = document.querySelector('[data-vs-status]');
  if (!host || !draft || !board || !toggle || !reset || !status) return;
  const zh = document.documentElement.lang.startsWith('zh');
  const text = (cn, en) => zh ? cn : en;
  const initial = draft.value;
  const initialStatus = status.textContent;
  const choices = [...host.querySelectorAll('[data-vs-insert]')];
  let composing = false;
  let selectionEnd = initial.length;
  const rememberCaret = () => { selectionEnd = draft.selectionEnd ?? draft.value.length; };
  for (const event of ['select', 'input', 'keyup', 'click', 'blur']) draft.addEventListener(event, rememberCaret);
  draft.addEventListener('compositionstart', () => { composing = true; });
  draft.addEventListener('compositionend', () => { composing = false; rememberCaret(); });
  for (const control of [draft, toggle, reset, ...choices]) control.disabled = false;
  for (const choice of choices) {
    choice.addEventListener('click', () => {
      if (composing) {
        status.textContent = text('请先完成正在输入的文字。', 'Finish composing the current text first.');
        return;
      }
      const phrase = choice.querySelector('span').textContent;
      const current = draft.value;
      const at = Math.min(Math.max(0, selectionEnd), current.length);
      const before = current.slice(0, at), after = current.slice(at);
      // Insert AFTER the selection; selected and unselected draft text survive.
      const addition = (before && !/\s$/.test(before) ? '\n' : '') + phrase + (after && !/^\s/.test(after) ? '\n' : '');
      if (current.length + addition.length > draft.maxLength) {
        status.textContent = text('演示草稿已接近长度上限；原有文字没有改变。', 'The sample draft is near its limit. Your existing text has not changed.');
        return;
      }
      draft.setRangeText(addition, at, at, 'end');
      selectionEnd = at + addition.length;
      draft.focus({preventScroll: true});
      draft.setSelectionRange(selectionEnd, selectionEnd);
      draft.dispatchEvent(new Event('input', {bubbles: true}));
      status.textContent = text('已填入。原有草稿保留，没有发送。', 'Filled. The existing draft is intact. Nothing was sent.');
    });
  }
  toggle.addEventListener('click', () => {
    board.hidden = !board.hidden;
    toggle.setAttribute('aria-expanded', String(!board.hidden));
  });
  reset.addEventListener('click', () => {
    if (composing) return;
    draft.value = initial;
    selectionEnd = initial.length;
    status.textContent = initialStatus;
    board.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
  });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const reflectMotion = () => document.body.classList.toggle('hp-static', reduced.matches);
  reduced.addEventListener('change', reflectMotion);
  reflectMotion();
  document.body.classList.add('hp-ready', 'vs-ready');
})();
