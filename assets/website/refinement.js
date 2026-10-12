/* PAIA finishing pass: progressive, page-local presentation. The original
   controllers still own drafts, topic navigation and permissions. */
(() => {
  'use strict';
  const zh = document.documentElement.lang.startsWith('zh');
  const t = (a, b) => zh ? a : b;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const phone = matchMedia('(max-width:640px)');
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  function mount() {
    if (document.body.classList.contains('pf-ready')) return;
    document.body.classList.add('pf-ready');
    refineHome();
    refineHow();
    refineApplication();
    document.dispatchEvent(new Event('paia:refinement-ready'));
  }
  function refineHome() {
    const root = document.querySelector('.art-refined');
    if (!root) return;
    const host = root.querySelector('[data-ad-host]');
    const answer = host.querySelector('.pc-answer-body');
    const suggestion = root.querySelector('.pc-suggestion-wrap');
    // Move, do not clone: there remains one suggestion, one source of wording,
    // and one insertion handler. Its preset disclosure remains on the page.
    if (suggestion) {
      host.querySelector('.pc-window-bar').append(suggestion);
      suggestion.classList.add('pf-inline-suggestion');
      const description = suggestion.querySelector('.pc-suggestion-head>span');
      description.id = 'pf-suggestion-description';
      suggestion.querySelector('[data-suggestion-toggle]').setAttribute('aria-describedby', description.id);
    }
    const composer = host.querySelector('#pc-composer');
    let pulseTimer = 0, acknowledged = composer.value;
    const insertions = new WeakMap();
    root.addEventListener('click', event => {
      const control = event.target.closest('[data-prompt-pick],[data-insert],[data-suggestion]');
      if (control) insertions.set(event, {control, before:composer.value});
    }, true);
    root.addEventListener('click', event => {
      // Target handlers have now completed. A canceled full-text check,
      // IME refusal or overflow never reaches this successful value change.
      const sample = insertions.get(event);
      if (!sample || composer.value === sample.before || composer.value === acknowledged) return;
      acknowledged = composer.value;
      const row = sample.control.closest('[data-prompt-row]');
      root.querySelectorAll('.pf-picked').forEach(node => node.classList.remove('pf-picked'));
      row?.classList.add('pf-picked');
      composer.closest('.pc-composer').classList.add('pf-inserted');
      clearTimeout(pulseTimer);
      pulseTimer = setTimeout(() => {
        row?.classList.remove('pf-picked');
        composer.closest('.pc-composer').classList.remove('pf-inserted');
      }, reduced.matches ? 850 : 650);
    });
    const mechanics = root.querySelector('.pc-prompt-mechanics');
    if (mechanics) {
      const details = el('details', 'pf-mobile-details');
      const summary = el('summary', '', t('查看操作说明', 'How the prompt controls work'));
      details.append(summary); mechanics.before(details); details.append(mechanics);
      const reflow = () => { details.open = !phone.matches; };
      reflow(); phone.addEventListener('change', reflow);
    }
    const thought = root.querySelector('[data-scroll-story="thought"]');
    const scenes = thought.querySelector('.ad-thought-scenes');
    const overview = thought.querySelector('[data-topic-overview]');
    const bar = el('div', 'pf-mobile-views');
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', t('思想库展示方式', 'Thought Library preview'));
    const choices = [
      ['cards', t('主题', 'Topics')],
      ['open', t('原文', 'Original')],
      ['organize', t('整理', 'Organized')]
    ];
    const setView = (view) => {
      thought.dataset.mobileView = view;
      bar.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
      const illustrated = phone.matches && view !== 'cards';
      scenes.setAttribute('aria-hidden', String(!illustrated));
      scenes.querySelector('.ad-original-cue')?.setAttribute('aria-hidden', String(view === 'organize'));
      scenes.querySelector('.ad-ai-cue')?.setAttribute('aria-hidden', String(view !== 'organize'));
      overview.inert = illustrated;
      overview.setAttribute('aria-hidden', String(illustrated));
    };
    for (const [view, label] of choices) {
      const button = el('button', '', label);
      button.type = 'button'; button.dataset.view = view;
      button.setAttribute('aria-controls', 'pf-thought-illustration');
      button.addEventListener('click', () => setView(view));
      bar.append(button);
    }
    scenes.id = 'pf-thought-illustration';
    thought.querySelector('.ad-library-content').prepend(bar);
    setView('cards');
    phone.addEventListener('change', () => setView('cards'));
    thought.addEventListener('click', event => {
      if (event.target.closest('[data-topic-open],[data-topic-back]')) setView('cards');
    }, true);
  }
  function refineHow() {
    const scene = document.querySelector('.nr-scene-prompt');
    if (!scene) return;
    const sheet = scene.querySelector('.nr-prompt-sheet');
    const palette = scene.querySelector('.nr-prompt-palette');
    if (!sheet || !palette) return;
    sheet.append(palette);
    const capsule = el('span', 'pf-how-capsule', palette.querySelector('.nr-prompt-choice>span').textContent);
    const toggle = el('button', 'pf-how-toggle');
    toggle.type = 'button';
    toggle.append(el('i', 'pf-orb'));
    palette.id = 'pf-how-palette';
    toggle.setAttribute('aria-controls', palette.id);
    sheet.append(capsule, toggle);
    let phase = 2;
    const modes = ['orb', 'capsule', 'board'];
    const setMode = () => {
      scene.dataset.previewMode = modes[phase];
      palette.setAttribute('aria-hidden', String(phase !== 2));
      toggle.setAttribute('aria-expanded', String(phase === 2));
      toggle.setAttribute('aria-label', [
        t('预览悬浮胶囊', 'Preview the floating capsule'),
        t('预览悬浮板', 'Preview the floating board'),
        t('收起为悬浮球', 'Collapse to the floating orb')
      ][phase]);
    };
    toggle.addEventListener('click', () => { phase = (phase + 1) % 3; setMode(); });
    setMode();
    // The miniature remains an honest illustration; the real working demo
    // is already linked by this page. Decorative message icons do not click.
    const reader = document.querySelector('.nr-thought-reader-state');
    const intro = document.querySelector('.nr-thought-overview-state');
    if (reader && intro) {
      const details = el('details', 'pf-how-reader');
      const summary = el('summary', '', t('打开同一主题的原文', 'Read this topic’s original'));
      reader.before(details); details.append(summary, reader);
      const reflow = () => { details.open = !phone.matches; };
      reflow(); phone.addEventListener('change', reflow);
      intro.addEventListener('click', event => {
        if (event.target.closest('a[href^="#how-thought-"]')) details.open = true;
      });
    }
  }
  function refineApplication() {
    const form = document.querySelector('form.beta-form');
    if (!form || !window.fetch || !window.AbortController) return;
    const action = new URL(form.action);
    // Only enhance the already-declared, consented destination. Never accept
    // query parameters, arbitrary server URLs or an external redirect target.
    if (action.origin !== 'https://formsubmit.co' || action.pathname.split('/').length !== 2) return;
    const endpoint = new URL('/ajax' + action.pathname, action.origin).href;
    const submit = form.querySelector('button[type="submit"]');
    const originalLabel = submit.textContent.trim();
    const status = el('div', 'pf-form-result'); status.hidden = true;
    status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    status.id = 'pf-form-result'; status.tabIndex = -1;
    submit.before(status);
    submit.setAttribute('aria-describedby', status.id);
    const notice = submit.nextElementSibling;
    if (notice?.matches('p.small')) notice.textContent = t(
      '留言由 FormSubmit 转发。收到服务确认后才显示已接收；接收不代表邮件已送达收件箱。',
      'FormSubmit forwards your message. Receipt is shown after confirmation; acceptance does not guarantee inbox delivery.'
    );
    let busy = false, completed = false;
    const locks = [...form.elements].filter(control => control.matches('input:not([type=hidden]),textarea,select'))
      .map(control => ({control, disabled:control.disabled, readOnly:control.readOnly}));
    const lock = locked => locks.forEach(({control, disabled, readOnly}) => {
      if (control.matches('select,input[type=checkbox]')) control.disabled = locked || disabled;
      else control.readOnly = locked || readOnly;
    });
    form.dataset.submission = 'idle';
    const state = (kind, text) => {
      form.dataset.submission = kind;
      status.hidden = false; status.textContent = text;
    };
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (busy || completed || !form.reportValidity()) return;
      const consent = form.elements.namedItem('contact_consent');
      if (!consent?.checked) return;
      const honey = form.elements.namedItem('_honey');
      if (honey?.value) {
        state('unconfirmed', t('请检查表单后再提交。', 'Please check the form before submitting.'));
        return;
      }
      // Snapshot only these declared application fields. No page text, URL,
      // cookies, archive data or browser storage is added to the request.
      const fields = ['email', 'frequency', 'goal', 'contact_consent', 'language', '_subject', '_template', '_captcha', '_honey'];
      const values = Object.create(null);
      for (const name of fields) {
        const control = form.elements.namedItem(name);
        if (control) values[name] = control.value;
      }
      busy = true; lock(true); submit.disabled = true; form.setAttribute('aria-busy', 'true');
      submit.textContent = t('正在提交…', 'Submitting…');
      state('pending', t('正在将留言交给 FormSubmit。请稍候。', 'Sending your message to FormSubmit. Please wait.'));
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(endpoint, {
          method: 'POST', mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer',
          headers: {'Content-Type': 'application/json', Accept: 'application/json'},
          body: JSON.stringify(values), signal: controller.signal, redirect: 'error'
        });
        if (!response.ok) throw new Error('unconfirmed-response');
        const data = await response.json();
        if (!data || (data.success !== true && data.success !== 'true')) throw new Error('unconfirmed-receipt');
        // An activation request must not masquerade as a received application.
        if (typeof data.message === 'string' && /activat|verif|confirm.{0,20}email/i.test(data.message)) throw new Error('activation-pending');
        completed = true;
        state('received', t(
          'FormSubmit 已确认接收留言。服务接收不等于邮件已送达收件箱。',
          'FormSubmit confirmed receipt. Service acceptance does not guarantee inbox delivery.'
        ));
        submit.textContent = t('已接收', 'Receipt confirmed');
        status.focus({preventScroll: true});
      } catch (_) {
        // A timeout can occur after server acceptance. Do not auto-retry or
        // fall back to another POST; an explicit new click is required.
        state('unconfirmed', t(
          '尚未获得送达确认，填写内容已保留在本页。留言可能已送达，请先检查邮箱或使用下方联系邮箱；再次提交可能重复。',
          'Delivery is unconfirmed. Your entries remain on this page. The message may have arrived; check your email or use the contact address below. Resubmitting may duplicate it.'
        ));
        submit.textContent = t('再次提交', 'Submit again');
        status.focus({preventScroll: true});
      } finally {
        clearTimeout(timeout); busy = false;
        form.removeAttribute('aria-busy'); submit.disabled = completed; lock(completed);
        if (!completed && form.dataset.submission === 'idle') submit.textContent = originalLabel;
      }
    });
    // No persistence. Native HTML form submission remains the no-JS fallback.
  }
  const style = document.querySelector('link[data-paia-refinement]');
  if (!style || style.sheet) mount();
  else style.addEventListener('load', mount, {once: true});
})();
