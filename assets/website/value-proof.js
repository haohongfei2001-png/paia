/* Website-only literal sample matching. No network, storage or AI. */
(() => {
  'use strict';
  const root = document.querySelector('[data-value-proof]');
  if (!root) return;
  const composer = root.querySelector('#pc-composer');
  const examples = JSON.parse(root.querySelector('[data-proof-fixture]').textContent);
  const controls = [...root.querySelectorAll('[data-proof-view-pick]')];
  const narrow = matchMedia('(max-width: 760px)');
  let view = 'reading';
  function update() {
    for (const example of examples) {
      const present = composer.value.includes(example.text);
      const line = root.querySelector(`[data-proof-line="${example.id}"]`);
      line.dataset.state = present ? 'included' : 'missing';
      line.querySelector('[data-proof-wording]').textContent = present ? example.included : example.missing;
      line.querySelector('.vp-proof-indicator').textContent = present ? '✓' : '—';
    }
    root.querySelector('[data-proof-draft-indicator]').textContent = composer.value === composer.defaultValue ? '' : '•';
  }
  function layout() {
    root.dataset.proofView = view;
    root.querySelector('.vp-mobile-navigation').hidden = !narrow.matches;
    for (const pane of root.querySelectorAll('[data-proof-pane]')) pane.hidden = narrow.matches && pane.dataset.proofPane !== view;
    for (const control of controls) control.setAttribute('aria-pressed', String(control.dataset.proofViewPick === view));
    dispatchEvent(new Event('resize'));
  }
  controls.forEach(control => control.addEventListener('click', () => {
    view = control.dataset.proofViewPick;
    layout();
  }));
  // Navigation inside a website illustration, not a new product mode.
  document.addEventListener('paia:demo-inspection', () => { view = 'draft'; layout(); });
  document.querySelectorAll('a[href="#prompt-reuse"]').forEach(link => link.addEventListener('click', () => { view = 'draft'; layout(); }));
  root.querySelector('[data-proof-reset]').disabled = false;
  root.querySelector('[data-proof-reset]').addEventListener('click', () => {
    if (composer.dataset.composing === 'true') return;
    composer.value = composer.defaultValue;
    composer.dispatchEvent(new Event('input', {bubbles:true}));
    composer.focus({preventScroll:true});
    root.querySelector('[data-prompt-status]').textContent = root.dataset.locale === 'zh' ? '请求已还原 · 没有发送' : 'Request reset · Not sent';
  });
  composer.addEventListener('input',update);
  composer.addEventListener('compositionstart',() => { composer.dataset.composing = 'true'; root.querySelector('[data-proof-reset]').disabled = true; });
  composer.addEventListener('compositionend',() => { delete composer.dataset.composing; root.querySelector('[data-proof-reset]').disabled = false; update(); });
  narrow.addEventListener('change',layout);
  update(); layout();
})();
