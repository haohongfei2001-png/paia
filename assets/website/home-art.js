/* Homepage demonstration geometry and deliberate shape selection only.
   Existing home-core-v2.js remains the sole writer of the fictional draft.
   No persistence, network, real chat access or production extension behavior. */
(() => {
  'use strict';
  const root = document.querySelector('.art-directed');
  if (!root) return;
  const zh = root.dataset.locale === 'zh';
  const t = (a, b) => zh ? a : b;
  const host = root.querySelector('[data-ad-host]');
  const wrap = host.querySelector('.pc-palette-wrap');
  const board = host.querySelector('#pc-prompt-card');
  const list = board.querySelector('[data-prompt-list]');
  const toggle = host.querySelector('[data-prompt-toggle]');
  const capsule = host.querySelector('[data-ad-capsule]');
  const composer = host.querySelector('#pc-composer');
  const shapes = [...root.querySelectorAll('[data-ad-shape]')];
  const geometryNote = document.createElement('p');
  geometryNote.className = 'ad-geometry-note'; geometryNote.hidden = true;
  geometryNote.setAttribute('role', 'status');
  geometryNote.textContent = t('当前空间不足，面板状态已保留。', 'Not enough space. The panel state is retained.');
  host.after(geometryNote);
  let collapsed = 'orb', composing = false, queued = false;
  let draftPoint = null, pending = null, approved = null;

  const check = document.createElement('section');
  check.className = 'ad-check'; check.hidden = true;
  const full = document.createElement('p'); full.tabIndex = 0;
  full.setAttribute('aria-label', t('核对完整表达', 'Check the complete expression'));
  const actions = document.createElement('div'); actions.className = 'ad-check-actions';
  const back = document.createElement('button'); back.type = 'button'; back.textContent = t('返回', 'Back');
  const use = document.createElement('button'); use.type = 'button'; use.textContent = t('填入整条', 'Insert whole text');
  actions.append(back, use); check.append(full, actions); board.append(check);

  const remember = () => { draftPoint = {value:composer.value, end:composer.selectionEnd}; };
  ['focus','input','select','keyup','pointerup','blur'].forEach(name => composer.addEventListener(name, remember));
  composer.addEventListener('compositionstart', () => { composing = true; });
  composer.addEventListener('compositionend', () => { composing = false; remember(); });
  const status = message => { host.querySelector('[data-prompt-status]').textContent = message; };

  function updateCapsule() {
    const value = root.querySelector('[data-prompt-row="0"] [data-prompt-text]').value;
    root.querySelector('[data-ad-capsule-text]').textContent = value;
    root.querySelector('[data-ad-specimen-text]').textContent = value;
    capsule.setAttribute('aria-label', t('展开悬浮胶囊', 'Expand floating capsule'));
  }
  function syncShape() {
    const open = !board.hidden;
    host.dataset.open = String(open); host.dataset.collapsed = collapsed;
    capsule.hidden = open || collapsed !== 'capsule';
    capsule.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-expanded', String(open));
    shapes.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.adShape === (open ? 'board' : collapsed))));
    schedule();
  }
  shapes.forEach(button => button.addEventListener('click', () => {
    const shape = button.dataset.adShape;
    if (shape !== 'board') collapsed = shape;
    board.hidden = shape !== 'board';
    syncShape();
  }));
  capsule.addEventListener('click', () => { if (board.hidden) toggle.click(); });
  new MutationObserver(syncShape).observe(board, {attributes:true, attributeFilter:['hidden']});

  // Derive the available band from this illustrative host and its entire
  // composer. Width is fixed; a taller composer only reduces vertical space.
  function measure() {
    queued = false;
    const hostBox = host.getBoundingClientRect();
    const nominalWidth = host.clientWidth <= 400 ? 322 : 336;
    if (wrap.style.width !== `${nominalWidth}px`) wrap.style.width = `${nominalWidth}px`;
    const composerBox = composer.closest('.pc-composer').getBoundingClientRect();
    const barBox = host.querySelector('.pc-window-bar').getBoundingClientRect();
    const caption = host.querySelector('.pc-prompt-caption');
    const captionHeight = board.hidden ? 0 : caption.getBoundingClientRect().height + 10;
    const available = Math.max(0, composerBox.top - barBox.bottom - 24);
    const cap = Math.max(0, available - captionHeight - 53);
    const bottom = hostBox.bottom - composerBox.top + 12;
    if (wrap.style.bottom !== `${bottom}px`) wrap.style.bottom = `${bottom}px`;
    if (board.style.maxHeight !== `${cap}px`) board.style.maxHeight = `${cap}px`;
    // A narrow illustration can be scrolled as a page; it never paints over
    // its host controls. Geometry does not mutate the user's selected mode.
    const limited = !board.hidden && cap < 88;
    wrap.style.visibility = limited ? 'hidden' : '';
    host.dataset.geometry = limited ? 'limited' : 'available';
    geometryNote.hidden = !limited;
  }
  function schedule() {
    if (!queued) { queued = true; requestAnimationFrame(measure); }
  }
  const observer = new ResizeObserver(schedule);
  [host, composer.closest('.pc-composer'), board, host.querySelector('.pc-window-bar')].forEach(node => observer.observe(node));
  addEventListener('resize', schedule, {passive:true});
  document.fonts.ready.then(schedule);

  function candidate(button) {
    const row = button.closest('[data-prompt-row]');
    if (row) return {button, field:row.querySelector('[data-prompt-text]'), visible:row.querySelector('[data-prompt-pick]')};
    if (button.matches('[data-suggestion]')) return {button, field:button, visible:button};
    return null;
  }
  const valueOf = ref => ref.field.matches('textarea') ? ref.field.value : ref.field.textContent.trim();
  function unread(ref, value) {
    const row = ref.visible;
    return row.scrollWidth > row.clientWidth + 1 || /[\r\n\t]|^\s|\s$| {2,}/u.test(value);
  }
  function endCheck(restore) {
    const previous = pending;
    pending = null; check.hidden = true; list.hidden = false; full.textContent = '';
    if (restore && previous?.button.isConnected) previous.button.focus({preventScroll:true});
    schedule();
  }
  back.addEventListener('click', () => endCheck(true));
  use.addEventListener('click', () => {
    if (!pending) return;
    const ref = pending;
    if (!ref.button.isConnected || valueOf(ref) !== ref.value || composer.value !== ref.draft || composing) {
      status(t('内容或输入框已变化，请重新核对。', 'The text or draft changed. Please check it again.'));
      endCheck(true); return;
    }
    approved = {button:ref.button, value:ref.value};
    endCheck(false);
    // Dispatch only the existing explicit insertion control. This script does
    // not assign composer.value or introduce another insertion implementation.
    ref.button.click(); approved = null;
  });
  root.addEventListener('click', event => {
    const button = event.target.closest('[data-prompt-pick],[data-insert],[data-suggestion]');
    if (!button) return;
    const ref = candidate(button); if (!ref) return;
    const value = valueOf(ref);
    const stop = () => { event.preventDefault(); event.stopImmediatePropagation(); };
    if (composing || !value.trim()) {
      stop(); if (composing) status(t('请先完成输入法组合。', 'Finish composing before inserting.')); return;
    }
    const draft = composer.value;
    const position = draftPoint && draftPoint.value === draft ? Math.min(draftPoint.end, draft.length) : draft.length;
    const nextLength = draft.length + value.length + (position ? 2 : 0) + (position < draft.length ? 2 : 0);
    if (nextLength > composer.maxLength) {
      stop(); status(t('输入框空间不足，原草稿未改变。', 'Not enough room. The existing draft is unchanged.')); return;
    }
    if (approved?.button === button && approved.value === value) { approved = null; return; }
    if (unread(ref, value)) {
      stop(); pending = {...ref, value, draft}; full.textContent = value;
      list.hidden = true; check.hidden = false; board.hidden = false;
      syncShape(); full.focus({preventScroll:true}); schedule();
    }
  }, true);
  root.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || event.defaultPrevented || !host.contains(event.target)) return;
    if (!check.hidden) { event.preventDefault(); endCheck(true); }
    else if (!board.hidden && board.contains(event.target)) {
      event.preventDefault(); toggle.click();
      (collapsed === 'capsule' ? capsule : toggle).focus({preventScroll:true});
    }
  });
  root.addEventListener('input', event => {
    if (event.target.matches('[data-prompt-text]')) updateCapsule();
    schedule();
  });
  const location = root.querySelector('.ad-location');
  location.addEventListener('keydown', event => {
    if (event.key === 'Escape' && location.open) {
      event.preventDefault(); location.open = false; location.querySelector('summary').focus({preventScroll:true});
    }
  });
  location.addEventListener('click', event => { if (event.target.closest('a')) location.open = false; });
  updateCapsule(); syncShape();
})();
