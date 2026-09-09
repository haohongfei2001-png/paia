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
  /*
   * Thought Library narrative:
   * scrolling continues, but the visual itself stays pinned for a while.
   * Scroll progress is converted into a reversible transformation from the
   * source-faithful thought journey to the AI-organized presentation.
   * Scrolling upward naturally peels the AI layer back off.
   */

  const style = document.createElement('style');
  style.textContent = `
    .thought-scroll-story {
      position: relative;
      min-height: 190vh;
      margin-top: 2px;
    }

    .thought-scroll-story .thought-transform {
      position: sticky;
      top: clamp(84px, 12vh, 126px);
      overflow: hidden;
      z-index: 2;
      will-change: transform, box-shadow;
      box-shadow:
        0 24px 70px rgba(36,45,34,.09),
        0 0 0 1px rgba(100,123,88,var(--frame-glow, 0));
      transition: box-shadow .12s linear;
    }

    .thought-scroll-story .thought-transform-head,
    .thought-scroll-story .thought-transform-caption {
      display: none;
    }

    .thought-scroll-story .thought-transform::before {
      opacity: var(--glow-opacity, 0) !important;
      transform: scale(var(--glow-scale, .76)) !important;
      transition: none !important;
    }

    .thought-scroll-story .thought-transform-canvas {
      aspect-ratio: 1.48 / 1;
      border-radius: 19px;
    }

    .thought-scroll-story .thought-layer {
      transition: none !important;
      will-change: opacity, transform, filter;
    }

    .thought-scroll-story .thought-layer-faithful {
      opacity: var(--faithful-opacity, 1) !important;
      transform: scale(var(--faithful-scale, 1)) !important;
      filter: blur(var(--faithful-blur, 0px)) saturate(var(--faithful-saturation, 1)) !important;
    }

    .thought-scroll-story .thought-layer-ai {
      opacity: var(--ai-opacity, 0) !important;
      transform: translateY(var(--ai-y, 26px)) scale(var(--ai-scale, .975)) !important;
      filter: blur(var(--ai-blur, 8px)) saturate(var(--ai-saturation, .88)) !important;
    }

    .thought-scroll-story .thought-transform-flare {
      opacity: var(--flare-opacity, 0) !important;
      transform: translateY(var(--flare-y, 8px)) !important;
      transition: none !important;
    }

    .thought-scroll-sheen {
      position: absolute;
      z-index: 5;
      top: -16%;
      bottom: -16%;
      left: -26%;
      width: 22%;
      pointer-events: none;
      opacity: var(--sheen-opacity, 0);
      transform: translateX(var(--sheen-x, 0px)) rotate(8deg);
      background: linear-gradient(
        90deg,
        rgba(255,255,255,0),
        rgba(240,247,236,.16) 25%,
        rgba(235,246,229,.62) 50%,
        rgba(240,247,236,.14) 75%,
        rgba(255,255,255,0)
      );
      filter: blur(7px);
      mix-blend-mode: screen;
      will-change: transform, opacity;
    }

    .thought-scroll-vignette {
      position: absolute;
      z-index: 4;
      inset: 0;
      pointer-events: none;
      border-radius: inherit;
      opacity: var(--vignette-opacity, 0);
      background:
        radial-gradient(circle at 72% 28%, rgba(151,178,136,.18), transparent 34%),
        linear-gradient(135deg, rgba(248,251,246,0), rgba(224,235,218,.16));
      will-change: opacity;
    }

    @media (max-width: 900px) {
      .thought-scroll-story { min-height: 165vh; }
      .thought-scroll-story .thought-transform { top: 82px; }
    }

    @media (max-width: 620px) {
      .thought-scroll-story { min-height: 150vh; }
      .thought-scroll-story .thought-transform { top: 76px; }
      .thought-scroll-story .thought-transform-canvas { aspect-ratio: 1.15 / 1; }
    }
  `;
  document.head.appendChild(style);

  const story = document.createElement('div');
  story.className = 'thought-scroll-story';
  thoughtTransform.parentNode.insertBefore(story, thoughtTransform);
  story.appendChild(thoughtTransform);

  const canvas = thoughtTransform.querySelector('.thought-transform-canvas');
  if (canvas) {
    const vignette = document.createElement('span');
    vignette.className = 'thought-scroll-vignette';
    vignette.setAttribute('aria-hidden', 'true');
    canvas.appendChild(vignette);

    const sheen = document.createElement('span');
    sheen.className = 'thought-scroll-sheen';
    sheen.setAttribute('aria-hidden', 'true');
    canvas.appendChild(sheen);
  }

  let ticking = false;
  let lastProgress = -1;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const smoothstep = (value) => value * value * (3 - 2 * value);

  const renderProgress = (rawProgress) => {
    const progress = clamp(rawProgress, 0, 1);
    if (Math.abs(progress - lastProgress) < 0.001) return;
    lastProgress = progress;

    // Give the user a short beat to see the original thought journey first,
    // then spend most of the pinned scroll distance on the actual reveal.
    const morphRaw = clamp((progress - 0.12) / 0.68, 0, 1);
    const morph = smoothstep(morphRaw);
    const finish = clamp((progress - 0.68) / 0.22, 0, 1);

    const faithfulOpacity = 1 - morph * 0.90;
    const faithfulScale = 1 - morph * 0.028;
    const faithfulBlur = morph * 4.2;
    const faithfulSaturation = 1 - morph * 0.13;

    const aiOpacity = morph;
    const aiY = (1 - morph) * 30;
    const aiScale = 0.972 + morph * 0.028;
    const aiBlur = (1 - morph) * 9;
    const aiSaturation = 0.88 + morph * 0.12;

    // A moving light sweep makes the reorganization feel like a new layer is
    // being revealed rather than one screenshot simply cross-fading to another.
    const sheenPhase = clamp((morphRaw - 0.05) / 0.90, 0, 1);
    const sheenX = sheenPhase * Math.max(window.innerWidth * 0.64, 620);
    const sheenOpacity = Math.sin(sheenPhase * Math.PI) * 0.82;

    thoughtTransform.style.setProperty('--faithful-opacity', faithfulOpacity.toFixed(3));
    thoughtTransform.style.setProperty('--faithful-scale', faithfulScale.toFixed(4));
    thoughtTransform.style.setProperty('--faithful-blur', `${faithfulBlur.toFixed(2)}px`);
    thoughtTransform.style.setProperty('--faithful-saturation', faithfulSaturation.toFixed(3));

    thoughtTransform.style.setProperty('--ai-opacity', aiOpacity.toFixed(3));
    thoughtTransform.style.setProperty('--ai-y', `${aiY.toFixed(2)}px`);
    thoughtTransform.style.setProperty('--ai-scale', aiScale.toFixed(4));
    thoughtTransform.style.setProperty('--ai-blur', `${aiBlur.toFixed(2)}px`);
    thoughtTransform.style.setProperty('--ai-saturation', aiSaturation.toFixed(3));

    thoughtTransform.style.setProperty('--glow-opacity', (morph * 0.95).toFixed(3));
    thoughtTransform.style.setProperty('--glow-scale', (0.76 + morph * 0.36).toFixed(3));
    thoughtTransform.style.setProperty('--frame-glow', (morph * 0.20).toFixed(3));
    thoughtTransform.style.setProperty('--vignette-opacity', (morph * 0.85).toFixed(3));

    thoughtTransform.style.setProperty('--sheen-x', `${sheenX.toFixed(1)}px`);
    thoughtTransform.style.setProperty('--sheen-opacity', sheenOpacity.toFixed(3));

    thoughtTransform.style.setProperty('--flare-opacity', finish.toFixed(3));
    thoughtTransform.style.setProperty('--flare-y', `${((1 - finish) * 8).toFixed(2)}px`);
  };

  const update = () => {
    ticking = false;

    const rect = story.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const stickyTop = clamp(viewportHeight * 0.12, 84, 126);
    const pinnedHeight = Math.min(thoughtTransform.offsetHeight || viewportHeight * 0.58, viewportHeight * 0.74);
    const scrollDistance = Math.max(1, story.offsetHeight - pinnedHeight - stickyTop * 0.35);

    // Progress starts when the visual reaches its sticky resting position.
    // Because the visual is sticky, the page appears to pause here while the
    // user's wheel/trackpad movement drives only the transformation.
    const progress = (stickyTop - rect.top) / scrollDistance;
    renderProgress(progress);
  };

  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  };

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  requestUpdate();
}
