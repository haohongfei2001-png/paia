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
  let timer = null;

  const setActive = (next) => {
    active = next;
    thoughtTransform.classList.toggle('ai-active', active);
    if (toggle) toggle.setAttribute('aria-pressed', String(active));
  };

  const stop = () => {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  };

  const start = () => {
    if (reduceMotion || timer) return;
    timer = window.setInterval(() => setActive(!active), 4200);
  };

  if (toggle) {
    toggle.addEventListener('click', () => {
      stop();
      setActive(!active);
      if (!reduceMotion) window.setTimeout(start, 6500);
    });
  }

  thoughtTransform.addEventListener('pointerenter', stop);
  thoughtTransform.addEventListener('pointerleave', start);

  if ('IntersectionObserver' in window && !reduceMotion) {
    const thoughtObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) start();
        else stop();
      });
    }, { threshold: 0.3 });
    thoughtObserver.observe(thoughtTransform);
  }
}