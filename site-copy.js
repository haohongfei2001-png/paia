(() => {
  const load = (src) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  load('site-copy-base.js?v=4')
    .then(() => load('experience.js?v=3'))
    .catch(() => {});
})();
