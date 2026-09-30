/* Trusted, event-driven replacement of stale capture runtimes. No page reloads. */
const CHATGPT = 'https://chatgpt.com/*';
function allowedTab(tab) {
  if (!Number.isInteger(tab?.id) || tab.incognito || tab.discarded || tab.frozen) return false;
  try { return new URL(tab.url).origin === 'https://chatgpt.com'; } catch { return false; }
}

// Serialized by Chrome into the existing ISOLATED world. Return health metadata
// only; never read page text, drafts, URLs, titles, or source observations here.
function probeCapture() {
  if (location.origin !== 'https://chatgpt.com' || window.top !== window) return null;
  const lifecycle = globalThis.PAIACaptureLifecycle;
  return {active: lifecycle?.active === true && Boolean(globalThis.chrome?.runtime?.id),
    ready: lifecycle?.ready === true, version: lifecycle?.version || null};
}

export function installCaptureRecovery(chrome, ready) {
  if (!chrome.scripting?.executeScript || !chrome.tabs?.query) return;
  const pending = new Map();
  const manifest = chrome.runtime.getManifest();
  // The install manifest is the sole source of bundled file paths/worlds.
  const scripts = manifest.content_scripts.filter(group =>
    group.matches?.length === 1 && group.matches[0] === CHATGPT && group.all_frames !== true);
  async function repair(tabId, force = false) {
    if (!Number.isInteger(tabId)) return;
    if (pending.has(tabId)) {
      if (force) pending.get(tabId).force = true;
      return pending.get(tabId).promise;
    }
    const task = {force, promise: null};
    pending.set(tabId, task);
    task.promise = (async () => {
      await ready; // The same fail-closed storage isolation gate as all capture.
      do {
        const replacing = task.force;
        task.force = false;
        const tab = await chrome.tabs.get(tabId);
        if (!allowedTab(tab)) return;
        const [probe] = await chrome.scripting.executeScript({
          target: {tabId, frameIds: [0]}, world: 'ISOLATED', func: probeCapture
        });
        if (!probe?.documentId || !probe.result) return;
        if (!replacing && probe.result.active && probe.result.ready && probe.result.version === manifest.version) {
          if (task.force) continue; // An update queued while the probe awaited must win.
          return;
        }
        // Pin every world to the exact document probed above. A tab navigating
        // to another permitted origin can never receive the capture bundle.
        for (const group of scripts) {
          await chrome.scripting.executeScript({
            target: {tabId, documentIds: [probe.documentId]},
            world: group.world || 'ISOLATED', files: group.js
          });
        }
        // Injection is not a capture-success acknowledgement. Fresh status,
        // consent/epoch checks and durable source writes stay in their owners.
      } while (task.force);
    })().catch(() => {
      // Closed/navigated tabs and withheld site access are expected failures.
      // A later eligible event can retry; no attempted/healthy flag is persisted.
    }).finally(() => { if (pending.get(tabId) === task) pending.delete(tabId); });
    return task.promise;
  }
  async function repairAll(force = false) {
    try {
      await ready;
      const tabs = await chrome.tabs.query({url: [CHATGPT]});
      await Promise.all(tabs.filter(allowedTab).map(tab => repair(tab.id, force)));
    } catch {} // Permission absence never falls back to broad tab enumeration.
  }
  // Listener registration is synchronous, including when the worker is waking.
  chrome.runtime.onInstalled?.addListener(() => { void repairAll(true); });
  chrome.runtime.onStartup?.addListener(() => { void repairAll(); });
  chrome.tabs.onActivated?.addListener(({tabId}) => { void repair(tabId); });
  chrome.tabs.onUpdated?.addListener((tabId, change) => {
    if (change.status === 'complete' || change.discarded === false || change.frozen === false) void repair(tabId);
  });
  chrome.permissions?.onAdded?.addListener(change => {
    if (change.origins?.includes(CHATGPT) || change.permissions?.includes('scripting')) void repairAll();
  });
  return {repair, repairAll};
}
