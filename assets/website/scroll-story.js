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

  const clamp = value => Math.max(0, Math.min(1, value));
  function progressOf(track) {
    const sticky = track.querySelector('.ad-scroll-sticky');
    const stickyTop = parseFloat(getComputedStyle(sticky).top) || 105;
    const travel = Math.max(0, stickyTop - track.getBoundingClientRect().top);
    // Fixed, modest wheel travel rather than a percentage of several screens.
    track.dataset.scrollTravel = String(Math.round(travel));
    return travel;
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
          {opacity:.2, clipPath:'inset(100% 0 0 0 round 18px)'},
          {opacity:1, clipPath:'inset(0 0 0 0 round 18px)'}
        ], {duration:420, easing:'cubic-bezier(.16,1,.3,1)'});
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
    thought.style.setProperty('--story-progress', clamp(tp / 440).toFixed(4));
    prompt.style.setProperty('--story-progress', clamp(pp / 440).toFixed(4));
    setThought(tp < 72 ? 'cards' : tp < 248 ? 'open' : 'organize');
    setPrompt(pp < 72 ? 'orb' : pp < 240 ? 'capsule' : 'board');
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
  function enterTopicInteraction(target) {
    if (thought.dataset.userReading === 'true') return;
    // A real reader can be taller than the marketing frame. Exit pinning
    // before the click so the original controller owns a normal document.
    const before = target.getBoundingClientRect().top;
    manualThought = true;
    thought.dataset.phase = 'cards';
    thought.dataset.userReading = 'true';
    const shift = target.getBoundingClientRect().top - before;
    if (Math.abs(shift) > .5) scrollBy({top:shift, behavior:'instant'});
  }
  for (const type of ['pointerdown', 'focusin']) {
    thought.addEventListener(type, event => {
      const target = event.target.closest('[data-topic-open]');
      if (target) enterTopicInteraction(target);
    }, {capture:true});
  }
  thought.addEventListener('click', event => {
    if (event.target.closest('[data-topic-open],[data-topic-back]')) {
      manualThought = true;
      thought.dataset.phase = 'cards';
      thought.style.setProperty('--story-glow', 0);
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
