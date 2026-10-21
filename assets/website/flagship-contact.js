/* PAIA contact form. The existing consented FormSubmit controller is extracted
   unchanged from refinement.js. Load with defer after the static form markup. */
(() => {
  'use strict';
  const zh = document.documentElement.lang.startsWith('zh');
  const t = (a, b) => zh ? a : b;
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
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
  refineApplication();
})();
