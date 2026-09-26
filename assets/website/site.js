/* Website-only enhancement. No archive access, storage, analytics or network calls. */
(() => {
  'use strict';
  const menu = document.querySelector('.mobile-menu');
  if (!menu) return;
  const summary = menu.querySelector('summary');
  const close = (restoreFocus = false) => {
    menu.open = false;
    if (restoreFocus) summary.focus();
  };
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.open) {
      event.preventDefault();
      close(true);
    }
  });
  document.addEventListener('pointerdown', event => {
    if (menu.open && !menu.contains(event.target)) close();
  });
  menu.addEventListener('click', event => {
    if (event.target.closest('a')) close();
  });
  // Keep native navigation and form submission working without JavaScript.
})();

/* Context-stage illustration: no fetch, persistence, model or clipboard calls.
 * The optional full demo owns copying/export and explicit freshness checks. */
(() => {
  'use strict';
  const stage = document.querySelector('[data-context-stage]');
  if (!stage) return;
  const en = document.documentElement.lang === 'en';
  const tabs = [...stage.querySelectorAll('[role="tab"]')];
  const panels = [...stage.querySelectorAll('[role="tabpanel"]')];
  const activate = (index, focus = false) => {
    const active = (index + tabs.length) % tabs.length;
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(active === i));
      tab.tabIndex = active === i ? 0 : -1;
      panels[i].hidden = active !== i;
      panels[i].classList.toggle('panel-enter', active === i);
    });
    if (focus) tabs[active].focus();
  };
  tabs.forEach((tab, i) => {
    tab.disabled = false;
    tab.addEventListener('click', () => activate(i));
    tab.addEventListener('keydown', event => {
      const next = {ArrowRight:i+1,ArrowLeft:i-1,Home:0,End:tabs.length-1}[event.key];
      if (next === undefined) return;
      event.preventDefault();
      activate(next, true);
    });
  });
  const selections = [...stage.querySelectorAll('[data-context-item]')];
  function renderSelection() {
    let selected = 0;
    for (const box of selections) {
      const fragment = stage.querySelector(`[data-fragment="${box.dataset.contextItem}"]`);
      fragment.hidden = !box.checked;
      if (box.checked) selected += 1;
    }
    stage.querySelector('[data-selection-count]').textContent = en ? `${selected} of ${selections.length} selected` : `已选择 ${selected} / ${selections.length} 项`;
    stage.querySelector('[data-context-empty]').hidden = selected !== 0;
  }
  selections.forEach(box => {
    box.disabled = false;
    box.addEventListener('change', renderSelection);
  });
  renderSelection();
})();


/* PAIA Website v3: fragments become Context.
 * Website-only, synthetic text, no fetch/storage/analytics/clipboard/model calls. */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const reveals = [...document.querySelectorAll('[data-reveal]')];
  if (!reduceMotion && reveals.length) {
    document.documentElement.classList.add('v3-motion');
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }, {threshold: 0.12, rootMargin: '0px 0px -4% 0px'});
      reveals.forEach(node => observer.observe(node));
    } else {
      reveals.forEach(node => node.classList.add('is-visible'));
    }
  }

  const field = document.querySelector('[data-v3-context]');
  if (!field) return;
  const fragments = [...field.querySelectorAll('[data-v3-fragment]')];
  const list = field.querySelector('[data-v3-list]');
  const count = field.querySelector('[data-v3-count]');
  const en = field.dataset.language === 'en';

  function render() {
    const selected = fragments.filter(button => button.getAttribute('aria-pressed') === 'true');
    count.textContent = `${selected.length} / ${fragments.length}`;
    list.replaceChildren();
    for (const button of selected) {
      const item = document.createElement('span');
      item.textContent = button.querySelector('.v3-fragment-copy')?.textContent?.trim() || '';
      list.append(item);
    }
    if (!selected.length) {
      const empty = document.createElement('span');
      empty.textContent = en ? 'Nothing selected. Nothing moves forward.' : '没有选中内容，也不会自动补进来。';
      list.append(empty);
    }
  }

  fragments.forEach(button => {
    button.addEventListener('click', () => {
      const next = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(next));
      render();
    });
  });
  render();
})();
