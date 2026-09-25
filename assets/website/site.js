/* Website-only enhancement. No archive access, storage, analytics or network calls. */
(() => {
  'use strict';
  const menu = document.querySelector('.mobile-menu');
  if (!menu) return;
  const summary = menu.querySelector('summary');
  const close = (restoreFocus = false) => {
    menu.open = false;
    if (restoreFocus) summary.focus();
  };
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.open) {
      event.preventDefault();
      close(true);
    }
  });
  document.addEventListener('pointerdown', event => {
    if (menu.open && !menu.contains(event.target)) close();
  });
  menu.addEventListener('click', event => {
    if (event.target.closest('a')) close();
  });
  // Keep native navigation and form submission working without JavaScript.
})();
