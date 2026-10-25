/* Trusted, event-driven replacement of stale capture runtimes. No page reloads. */
import {ArchiveError} from '../core/constants.js';
const CHATGPT = 'https://chatgpt.com/*';
const apply = Reflect.apply, originalOwners = new WeakMap();
export function isOriginalCaptureRecovery(owner, chrome) {
  const original = originalOwners.get(owner);
  return !!original && original.chrome === chrome && original.current();
}
const holdFailure = () => { throw new ArchiveError('GENERATION_WORKER_NOT_QUIET'); };
const notAdmitted = Object.freeze({status: 'not-admitted', reason: 'application_selection_hold'});
const interrupted = Object.freeze({status: 'interrupted', reason: 'application_selection_hold'});
const sourceRefused = Object.freeze({status: 'not-admitted', reason: 'source_changed'});
const sourceInterrupted = Object.freeze({status: 'interrupted', reason: 'source_changed'});
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

export function installCaptureRecovery(chrome, ready, {waitForStartup = ms => new Promise(resolve => setTimeout(resolve, ms))} = {}) {
  if (!chrome.scripting?.executeScript || !chrome.tabs?.query) return;
  const pending = new Map(), tasks = new Set();
  const scripting = chrome.scripting, tabs = chrome.tabs, runtime = chrome.runtime;
  const execute = scripting.executeScript, get = tabs.get, query = tabs.query, getManifest = runtime.getManifest;
  let admission = 0, selectionHold = null, sourceValid = true;
  const sourceCurrent = () => {
    if (!sourceValid) return false;
    try { if (chrome.scripting === scripting && chrome.tabs === tabs && chrome.runtime === runtime &&
      scripting.executeScript === execute && tabs.get === get && tabs.query === query && runtime.getManifest === getManifest) return true; }
    catch { /* A changed API surface cannot certify this original owner. */ }
    sourceValid = false; admission++; if (selectionHold) selectionHold.valid = false; return false;
  };
  const track = promise => { tasks.add(promise); const done = () => tasks.delete(promise); void promise.then(done, done); return promise; };
  const enter = () => { if (!sourceCurrent()) return null; if (selectionHold) { selectionHold.valid = false; return null; } return admission; };
  const admitted = serial => sourceCurrent() && selectionHold === null && serial === admission;
  const interruptedResult = () => sourceValid ? interrupted : sourceInterrupted;
  const taskFailed = error => { if (selectionHold) { selectionHold.valid = false; selectionHold.taskFailure ??= error; } };
  // Only live work accepted by this original owner is covered. No host/editor,
  // cold capture, successful insertion or global selection proof is produced.
  const held = state => selectionHold === state && state.valid && state.admission === admission && sourceCurrent();
  async function holdForApplicationSelection() {
    if (selectionHold || !sourceCurrent()) holdFailure();
    const token = Object.freeze(Object.create(null)), state = {token, valid: true, ready: false, admission: ++admission};
    selectionHold = state; let timer;
    const drain = async () => {
      for (;;) { if (!held(state)) holdFailure(); const accepted = [...tasks]; if (!accepted.length) break; await Promise.allSettled(accepted); }
      if (!held(state) || tasks.size) holdFailure(); state.ready = true; return token;
    };
    try { return await Promise.race([drain(), new Promise((_, reject) => {
      timer = setTimeout(() => { state.valid = false; reject(new ArchiveError('GENERATION_WORKER_NOT_QUIET')); }, 30000);
    })]); }
    catch (error) {
      // A failed acquisition has no successful token. Retain its exact Error
      // identity for explicit owner release, never as a quietness receipt.
      state.valid = false; state.failure = error; throw error;
    }
    finally { clearTimeout(timer); }
  }
  const applicationSelectionHeld = token => !!selectionHold && selectionHold.token === token && selectionHold.ready && held(selectionHold) && tasks.size === 0;
  async function fenceApplicationSelection(token) {
    if (!applicationSelectionHeld(token)) { if (selectionHold?.token === token) selectionHold.valid = false; holdFailure(); }
    return true;
  }
  function releaseApplicationSelection(token) {
    if (!selectionHold || selectionHold.token !== token && (!selectionHold.failure || selectionHold.failure !== token)) return false;
    selectionHold.valid = false; selectionHold = null; admission++; return true;
  }
  const manifest = apply(getManifest, runtime, []);
  // The install manifest is the sole source of bundled file paths/worlds.
  const scripts = manifest.content_scripts.filter(group =>
    group.matches?.length === 1 && group.matches[0] === CHATGPT && group.all_frames !== true);
  async function repair(tabId, force = false) {
    if (!Number.isInteger(tabId)) return;
    const serial = enter(); if (serial === null) return sourceValid ? notAdmitted : sourceRefused;
    if (pending.has(tabId)) {
      if (force && pending.get(tabId).admission === serial) pending.get(tabId).force = true;
      return pending.get(tabId).promise;
    }
    const task = {force, promise: null, admission: serial};
    pending.set(tabId, task);
    task.promise = track((async () => {
      await ready; // The same fail-closed storage isolation gate as all capture.
      if (!admitted(serial)) return interruptedResult();
      do {
        const replacing = task.force;
        task.force = false;
        if (!admitted(serial)) return interruptedResult();
        const tab = await apply(get, tabs, [tabId]);
        if (!admitted(serial)) return interruptedResult();
        if (!allowedTab(tab)) return;
        let [probe] = await apply(execute, scripting, [{
          target: {tabId, frameIds: [0]}, world: 'ISOLATED', func: probeCapture
        }]);
        if (!admitted(serial)) return interruptedResult();
        if (!probe?.documentId || !probe.result) return;
        // document_start bridges can already hold authorized response metadata
        // while document_idle capture is still waiting for its first status.
        // An activation/complete event must not replace that healthy startup.
        // Bound the grace period; a genuinely stalled runtime remains repairable.
        const documentId = probe.documentId;
        for (let attempt = 0; !replacing && !task.force && attempt < 20 &&
          probe.result.active && !probe.result.ready && probe.result.version === manifest.version; attempt++) {
          await waitForStartup(250);
          if (!admitted(serial)) return interruptedResult();
          if (task.force) break;
          const [next] = await apply(execute, scripting, [{
            target: {tabId, documentIds: [documentId]}, world: 'ISOLATED', func: probeCapture
          }]);
          if (!admitted(serial)) return interruptedResult();
          if (next?.documentId !== documentId || !next.result) return;
          probe = next;
        }
        if (!replacing && task.force) continue;
        if (!replacing && probe.result.active && probe.result.ready && probe.result.version === manifest.version) {
          if (task.force) continue; // An update queued while the probe awaited must win.
          return;
        }
        // Pin every world to the exact document probed above. A tab navigating
        // to another permitted origin can never receive the capture bundle.
        for (const group of scripts) {
          if (!admitted(serial)) return interruptedResult();
          await apply(execute, scripting, [{
            target: {tabId, documentIds: [probe.documentId]},
            world: group.world || 'ISOLATED', files: group.js
          }]);
        }
        // Injection is not a capture-success acknowledgement. Fresh status,
        // consent/epoch checks and durable source writes stay in their owners.
      } while (task.force);
    })().catch(error => {
      taskFailed(error);
      // Closed/navigated tabs and withheld site access are expected failures.
      // A later eligible event can retry; no attempted/healthy flag is persisted.
    }).finally(() => { if (pending.get(tabId) === task) pending.delete(tabId); }));
    return task.promise;
  }
  async function repairAll(force = false) {
    const serial = enter(); if (serial === null) return sourceValid ? notAdmitted : sourceRefused;
    return track((async () => {
      try {
        await ready;
        if (!admitted(serial)) return interruptedResult();
        const eligibleTabs = await apply(query, tabs, [{url: [CHATGPT]}]);
        if (!admitted(serial)) return interruptedResult();
        await Promise.all(eligibleTabs.filter(allowedTab).map(tab => repair(tab.id, force)));
        if (!admitted(serial)) return interruptedResult();
      } catch (error) { taskFailed(error); } // Permission absence never falls back to broad tab enumeration.
    })());
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
  // Release (success token or exact failed-acquisition Error) never cancels
  // already-issued Chrome work, certifies quietness, or replays a task. Only a
  // later original eligible event/explicit repair may request work again.
  const owner = Object.freeze({repair, repairAll, holdForApplicationSelection, applicationSelectionHeld,
    fenceApplicationSelection, releaseApplicationSelection,
    applicationSelectionSourceIs: api => api === chrome && sourceCurrent()});
  originalOwners.set(owner, {chrome, current: sourceCurrent});
  return owner;
}
