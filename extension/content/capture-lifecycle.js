/* ISOLATED: replace one document-local runtime without touching page input. */
(() => {
  'use strict';
  if (globalThis.location?.origin !== 'https://chatgpt.com') return;
  const eventName = 'paia-capture-retire-v1';
  globalThis.PAIACaptureLifecycle?.dispose();
  // A page can also send this event, but it can only stop observation. It never
  // supplies consent, an epoch, source data, or permission to start capture.
  document.dispatchEvent(new Event(eventName));
  // The pre-recovery observer has no teardown hook. Leave its fetch passthrough
  // inert; new bridges use a separate channel and never reactivate this one.
  window.postMessage({channel: 'archive-response-control-v1', active: false}, 'https://chatgpt.com');
  const disposers = new Set();
  let active = true;
  const lifecycle = {
    version: chrome.runtime.getManifest().version,
    instance: crypto.randomUUID(),
    ready: false,
    get active() { return active; },
    add(dispose) { if (active) disposers.add(dispose); else dispose(); },
    dispose() {
      if (!active) return;
      active = false;
      document.removeEventListener(eventName, retire);
      for (const dispose of disposers) { try { dispose(); } catch {} }
      disposers.clear();
    }
  };
  function retire() { lifecycle.dispose(); }
  document.addEventListener(eventName, retire);
  globalThis.PAIACaptureLifecycle = lifecycle;
})();
