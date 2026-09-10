// Shipped only in a generated internal build; no message or storage interface.
(() => {
  if (window.top !== window ||
      location.href !== chrome.runtime.getURL('ui/popup.html') ||
      document.documentElement.dataset.paiaDevelopment !== 'reload-v1') return;
  const button = document.getElementById('development-reload');
  if (!button) return;
  button.addEventListener('click', event => {
    if (!event.isTrusted || !navigator.userActivation?.isActive || button.disabled) return;
    button.disabled = true;
    button.textContent = 'Reloading development extension…';
    try { chrome.runtime.reload(); }
    catch {
      button.disabled = false;
      button.textContent = 'Reload failed — try again';
    }
  });
})();
