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
if (thoughtTransform && !reduceMotion) {
  let active = false;
  let ticking = false;

  const setActive = (next) => {
    if (active === next) return;
    active = next;
    thoughtTransform.classList.toggle('ai-active', active);
  };

  const updateFromScrollPosition = () => {
    ticking = false;

    const rect = thoughtTransform.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    // Use the element's position instead of scroll direction alone. As the user
    // moves down through the Thought Library section, the demo crosses a stable
    // viewport threshold and becomes the AI-organized view. Scrolling back up
    // across the same point restores the original thought journey.
    const narrativePoint = rect.top + rect.height * 0.44;
    const triggerLine = viewportHeight * 0.62;

    setActive(narrativePoint <= triggerLine);
  };

  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateFromScrollPosition);
  };

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);

  // Set the correct state immediately on reload, anchor navigation, or when the
  // page is restored at a previous scroll position.
  requestUpdate();
}
