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
    const reveal = () => root.classList.remove('paia-i18n-booting');
    window.addEventListener('paia:ready', reveal, { once: true });
    window.setTimeout(reveal, 1600);
  }
})();
