(() => {
  const normalize = (value) => {
    if (!value) return null;
    const lower = String(value).toLowerCase();
    if (lower === 'zh' || lower.startsWith('zh-')) return 'zh';
    if (lower === 'en' || lower.startsWith('en-')) return 'en';
    return null;
  };

  let selected = null;
  try {
    selected = normalize(new URLSearchParams(window.location.search).get('lang'));
    if (!selected) selected = normalize(window.localStorage.getItem('paia-language'));
  } catch (_) {}

  if (!selected) {
    const preferred = Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator.language || 'en'];
    selected = preferred.some((language) => normalize(language) === 'zh') ? 'zh' : 'en';
  }

  const root = document.documentElement;
  root.dataset.language = selected;
  root.lang = selected === 'zh' ? 'zh-CN' : 'en';

  if (selected === 'en') {
    root.classList.add('paia-i18n-booting');
    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      root.classList.remove('paia-i18n-booting');
    };

    // i18n.js fires this while the remaining synchronous site scripts are
    // still being parsed. Deferring one task keeps the first painted frame
    // from exposing the Chinese fallback copy, without holding the page blank.
    window.addEventListener('paia:languagechange', () => window.setTimeout(reveal, 0), { once: true });
    window.setTimeout(reveal, 900);
  }
})();
