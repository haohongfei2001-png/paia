/* Scroll only changes an explicitly fictional marketing illustration.
   No AI calls, permissions, storage, tracking, send, or writer effects. */
(() => {
  'use strict';
  const root = document.querySelector('.art-refined');
  if (!root) return;
  const thought = root.querySelector('[data-scroll-story="thought"]');
  const prompt = root.querySelector('[data-scroll-story="prompt"]');
  const board = root.querySelector('#pc-prompt-card');
  const composer = root.querySelector('#pc-composer');
  const morph = prompt.querySelector('[data-story-advance]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = matchMedia('(max-width:640px)');
  let scheduled = false;
  let manualPrompt = false;
  let manualThought = false;
  let topicReturnY = null;

  const clamp = value => Math.max(0, Math.min(1, value));
  function progressOf(track) {
    const bounds = track.getBoundingClientRect();
    const distance = Math.max(1, bounds.height - innerHeight + 100);
    return clamp((115 - bounds.top) / distance);
  }
  function setPrompt(phase, fromUser = false) {
    if (!fromUser && manualPrompt) return;
    if (fromUser) manualPrompt = true;
    const previous = prompt.dataset.phase;
    prompt.dataset.phase = phase;
    const shouldShow = phase === 'board';
    if (board.hidden === shouldShow) {
      board.hidden = !shouldShow;
      if (shouldShow && !reduced.matches) {
        board.animate([
          {opacity:0, transform:'translateY(-18px) scale(.94)'},
          {opacity:1, transform:'translateY(0) scale(1)'}
        ], {duration:780, easing:'cubic-bezier(.16,1,.3,1)'});
      }
    }
    // The only draft on scroll is decorative; the real textarea is untouched.
    if (previous !== phase) {
      prompt.style.setProperty('--story-glow', phase === 'board' ? 1 : phase === 'capsule' ? .6 : .2);
    }
    morph.setAttribute('aria-label', phase === 'orb'
      ? (root.dataset.locale === 'zh' ? '预览悬浮胶囊' : 'Preview floating capsule')
      : (root.dataset.locale === 'zh' ? '展开悬浮板' : 'Expand the floating board'));
  }
  function setThought(phase) {
    if (manualThought) return;
    thought.dataset.phase = phase;
    thought.style.setProperty('--story-glow', phase === 'organize' ? 1 : phase === 'open' ? .55 : 0);
  }
  function frame() {
    scheduled = false;
    if (reduced.matches || narrow.matches) {
      setThought('cards');
      setPrompt('board');
      return;
    }
    const tp = progressOf(thought);
    const pp = progressOf(prompt);
    thought.style.setProperty('--story-progress', tp.toFixed(4));
    prompt.style.setProperty('--story-progress', pp.toFixed(4));
    setThought(tp < .3 ? 'cards' : tp < .63 ? 'open' : 'organize');
    setPrompt(pp < .3 ? 'orb' : pp < .63 ? 'capsule' : 'board');
  }
  function schedule() {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(frame);
    }
  }
  addEventListener('scroll', schedule, {passive:true});
  addEventListener('resize', schedule, {passive:true});
  addEventListener('pageshow', schedule);
  reduced.addEventListener('change', schedule);
  narrow.addEventListener('change', schedule);
  document.fonts.ready.then(schedule);

  // One keyboard-operable progressive control substitutes for the retired
  // three simultaneous buttons. User choice wins over any later scrolling.
  morph.addEventListener('click', () => {
    const current = prompt.dataset.phase;
    setPrompt(current === 'orb' ? 'capsule' : 'board', true);
  });
  prompt.addEventListener('pointerdown', event => {
    if (event.target.closest('#pc-prompt-card,[data-prompt-toggle],#pc-composer,[data-suggestion-toggle],[data-ad-capsule]')) {
      manualPrompt = true;
    }
  }, {passive:true});
  prompt.addEventListener('keydown', event => {
    if (event.target.closest('#pc-prompt-card,[data-prompt-toggle],#pc-composer,[data-ad-capsule]')) manualPrompt = true;
  });
  // Keyboard or automated focus is also explicit intent. A focus-induced
  // scroll must never re-collapse a board during editing, pinning or search.
  prompt.addEventListener('focusin', event => {
    if (event.target.closest('#pc-prompt-card,[data-prompt-toggle],#pc-composer,[data-ad-capsule],[data-suggestion-toggle]'))
      manualPrompt = true;
  });
  thought.addEventListener('click', event => {
    if (event.target.closest('[data-topic-open]')) topicReturnY = scrollY;
    if (event.target.closest('[data-topic-open],[data-topic-back]')) {
      manualThought = true;
      thought.dataset.phase = 'cards';
      thought.style.setProperty('--story-glow', 0);
    }
    if (event.target.closest('[data-topic-back]') && topicReturnY !== null) {
      // The reader/overview differ in height. Reassert the exact scroll
      // origin after the original product controller's own Back handler.
      const origin = topicReturnY;
      queueMicrotask(() => scrollTo({top:origin, behavior:'instant'}));
    }
  }, {capture:true});

  // Never present a simulated scroll-stage as an irreversible user decision.
  // The real controls still own every actual draft edit and permission toggle.
  const detail = root.querySelector('.ad-context-disclosure');
  detail?.addEventListener('keydown', event => {
    if (event.key === 'Escape' && detail.open) {
      event.preventDefault();
      detail.open = false;
      detail.querySelector('summary').focus({preventScroll:true});
    }
  });
  schedule();
})();
