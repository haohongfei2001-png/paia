const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const sections = document.querySelectorAll('.section');
if ('IntersectionObserver' in window && !reduceMotion) {
  sections.forEach((section) => section.classList.add('reveal'));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  sections.forEach((section) => observer.observe(section));
}

const thoughtTransform = document.querySelector('[data-thought-transform]');
if (thoughtTransform) {
  const toggle = thoughtTransform.querySelector('.thought-demo-toggle');
  let active = false;
  let lastScrollY = window.scrollY;
  let ticking = false;

  const setActive = (next) => {
    if (active === next) return;
    active = next;
    thoughtTransform.classList.toggle('ai-active', active);
    if (toggle) toggle.setAttribute('aria-pressed', String(active));
  };

  // The switch is now a visual state indicator. The page scroll controls the demo.
  if (toggle) {
    toggle.disabled = true;
    toggle.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('tabindex', '-1');
    toggle.style.pointerEvents = 'none';
    toggle.style.cursor = 'default';
  }

  const updateFromScroll = () => {
    ticking = false;

    const currentScrollY = window.scrollY;
    const delta = currentScrollY - lastScrollY;
    lastScrollY = currentScrollY;

    if (Math.abs(delta) < 2) return;

    const rect = thoughtTransform.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    // Only react while the transformation demo is meaningfully inside the viewport.
    const inNarrativeZone = rect.top < viewportHeight * 0.78 && rect.bottom > viewportHeight * 0.22;
    if (!inNarrativeZone) return;

    // Scrolling down reveals the AI-organized view; scrolling back up restores
    // the original source-faithful thought journey.
    setActive(delta > 0);
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateFromScroll);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
}
