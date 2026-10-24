import assert from 'node:assert/strict';
import {requireVerifiedArtifacts} from './artifacts.mjs';
import {BUDGETS, CONTEXT_OPTIONS, FIXTURE_PATH, LAUNCH_OPTIONS, ORIGIN, TEST_IDS, VARIANTS} from './policy.mjs';

const message = error => ({name: error?.name ?? 'Error', message: String(error?.message ?? error)});
const html = '<!doctype html><meta charset="utf-8"><title>PAIA synthetic component</title>';
const headers = Object.freeze({
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; connect-src 'none'; worker-src 'none'; img-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'",
});

export function denyPageNetworking() {
  const denied = [];
  Object.defineProperty(globalThis, '__componentNetworkDenials', {value: denied});
  function refuse(kind) {
    return function (...args) {
      denied.push({kind, target: String(args[0] ?? '')});
      throw Error('Component network is disabled: ' + kind);
    };
  }
  for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'Worker', 'SharedWorker', 'RTCPeerConnection', 'WebTransport']) {
    if (name in globalThis) Object.defineProperty(globalThis, name, {value: refuse(name), writable: false, configurable: false});
  }
  Object.defineProperty(navigator, 'sendBeacon', {value: refuse('sendBeacon'), writable: false, configurable: false});
}

// Route-only serving, with no listening socket and no continue/fallback path.
// Browser-process network isolation still needs a future OS-level supervisor.
export function fixedRouteHandler(artifacts, variant, events) {
  requireVerifiedArtifacts(artifacts);
  assert.ok(VARIANTS.includes(variant));
  return async route => {
    const request = route.request();
    const url = request.url();
    const root = '/' + variant + '/';
    const path = url.startsWith(ORIGIN) ? url.slice(ORIGIN.length) : null;
    const body = path === root ? html : artifacts.body(variant, path);
    if (request.method() !== 'GET' || body === undefined || !path || url !== ORIGIN + path) {
      events.blocked.push({url, method: request.method()});
      await route.abort('blockedbyclient');
      return;
    }
    events.requests.push({path, fulfilled: true});
    await route.fulfill({status: 200, headers, contentType: path === root ? 'text/html' : 'text/javascript', body});
  };
}

// A testable orchestration contract, not a native gate. No real launcher is
// imported, discovered, downloaded, selected from the environment, or retried.
// A supplied fake launcher is the only use authorized for this preparation.
export async function exercisePreparedRunner({artifacts, launcher, clock = globalThis}) {
  requireVerifiedArtifacts(artifacts);
  assert.equal(typeof launcher, 'function', 'An explicit fake launcher is required');
  const receipt = {
    schema: 1,
    evidenceClass: 'RUNNER_UNIT_ONLY_NOT_NATIVE',
    result: 'RUNNING',
    sourceCommit: artifacts.sourceCommit,
    sourceTree: artifacts.sourceTree,
    sourceManifestSha256: artifacts.sourceManifestSha256,
    releaseOutputFingerprint: artifacts.releaseOutputFingerprint,
    artifactProvenance: artifacts.provenance,
    proposedBudgets: BUDGETS,
    hardBudgetEnforcement: 'NOT_READY',
    processTreeEnforcement: 'NOT_READY',
    osNetworkEnforcement: 'NOT_READY',
    launchAttempts: 0,
    contexts: [],
    cases: VARIANTS.flatMap(variant => TEST_IDS.map(id => ({variant, id, result: 'NOT_RUN'}))),
    cleanupFailures: [],
    unconfirmedHandles: [],
  };
  let browser, context, activeCase, pendingHandle, stopped = false, timer;
  const deadline = new Promise((_, reject) => {
    timer = clock.setTimeout(() => {
      stopped = true;
      reject(Error('SOFT_NATIVE_DEADLINE_EXCEEDED: hard process termination is NOT_READY'));
    }, BUDGETS.nativeMs);
  });
  // Racing a Promise is not OS process termination. The receipt says so.
  const bounded = work => {
    if (stopped) throw Error('RUN_STOPPED');
    return Promise.race([Promise.resolve().then(work), deadline]);
  };
  try {
    receipt.phase = 'single-launch';
    receipt.launchAttempts++;
    pendingHandle = {kind: 'browser', phase: receipt.phase};
    browser = await bounded(() => launcher({...LAUNCH_OPTIONS, args: [...LAUNCH_OPTIONS.args]}));
    pendingHandle = null;
    for (const variant of VARIANTS) {
      receipt.phase = variant + ':context';
      const events = {variant, requests: [], blocked: [], pageErrors: []};
      receipt.contexts.push(events);
      pendingHandle = {kind: 'context', variant, phase: receipt.phase};
      context = await bounded(() => browser.newContext({...CONTEXT_OPTIONS}));
      pendingHandle = null;
      await bounded(() => context.route('**/*', fixedRouteHandler(artifacts, variant, events)));
      await bounded(() => context.addInitScript(denyPageNetworking));
      const page = await bounded(() => context.newPage());
      page.on('pageerror', error => events.pageErrors.push(message(error)));
      await bounded(() => page.goto(ORIGIN + '/' + variant + '/', {waitUntil: 'domcontentloaded', timeout: 10_000}));
      for (const id of TEST_IDS) {
        activeCase = receipt.cases.find(row => row.variant === variant && row.id === id);
        activeCase.result = 'RUNNING';
        receipt.phase = variant + ':' + id;
        const result = await bounded(() => page.evaluate(async ({path, id}) => {
          const fixture = await import(path);
          return fixture.runRecoverySavedCase(id);
        }, {path: '/' + variant + '/' + FIXTURE_PATH, id}));
        // Keep the actual response, including a failing response, before checks.
        activeCase.observed = result;
        assert.equal(result?.id, id, 'Wrong or unallowlisted case response');
        assert.equal(result.result, 'PASS', 'Component case failed');
        assert.ok(Number.isSafeInteger(result.assertions) && result.assertions > 0, 'Positive assertions required');
        assert.equal(result.nativeFactory, true, 'Native-factory fixture assertion required');
        const denials = await bounded(() => page.evaluate(() => globalThis.__componentNetworkDenials));
        events.networkDenials = denials;
        assert.deepEqual(events.blocked, [], 'Non-allowlisted request attempted');
        assert.deepEqual(events.pageErrors, [], 'Uncaught page error');
        assert.deepEqual(denials, [], 'Page network API attempted');
        activeCase.result = 'PASS';
        activeCase = null;
      }
      // Release is not opened until Source closes successfully. Close failure
      // stops the run; no new context or launcher is used as a workaround.
      await bounded(() => context.close());
      events.closed = true;
      context = null;
      assert.deepEqual(events.blocked, [], 'Request attempted before context close');
      assert.deepEqual(events.pageErrors, [], 'Page error before context close');
    }
    receipt.phase = 'browser-close';
    await bounded(() => browser.close());
    browser = null;
    assert.equal(receipt.cases.filter(row => row.result === 'PASS').length, 8);
    receipt.result = 'CONTRACT_PASS';
    receipt.phase = 'completed';
  } catch (error) {
    stopped = true;
    receipt.result = 'CONTRACT_FAIL';
    receipt.failure = message(error);
    if (activeCase) activeCase.result = 'FAIL';
    if (pendingHandle) {
      // A rejected/raced acquisition provides no owned handle. Even if its
      // promise resolves later, cleanup cannot be confirmed by this receipt.
      // A future native adapter needs independent process ownership here.
      receipt.unconfirmedHandles.push({...pendingHandle, outcome: 'UNKNOWN', cleanup: 'UNCONFIRMED'});
    }
  } finally {
    clock.clearTimeout(timer);
    // Best effort only. A hung cleanup is observable, not called termination.
    for (const [kind, handle] of [['context', context], ['browser', browser]]) {
      if (!handle) continue;
      let closeTimer;
      try {
        await Promise.race([
          Promise.resolve().then(() => handle.close()),
          new Promise((_, reject) => { closeTimer = clock.setTimeout(() => reject(Error('CLEANUP_UNCONFIRMED')), 1000); }),
        ]);
      } catch (error) {
        receipt.cleanupFailures.push({kind, ...message(error)});
        receipt.result = 'CONTRACT_FAIL';
      } finally { clock.clearTimeout(closeTimer); }
    }
  }
  return receipt;
}
