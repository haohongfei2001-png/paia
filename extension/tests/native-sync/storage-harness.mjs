import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {cp, mkdtemp, readFile, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, relative} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {LifetimeNetworkLedger, assertWorkerLifecycle} from './proof-oracles.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
export const root = fileURLToPath(new URL('../..', import.meta.url));
const hash = value => createHash('sha256').update(value).digest('hex');
const deadline = (promise, label, ms = 15000) => {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(Error(label)), ms); })]).finally(() => clearTimeout(timer));
};
async function eventually(check, label) {
  const end = Date.now() + 15000;
  do { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 50)); } while (Date.now() < end);
  throw Error(label);
}

export async function instrumentedExtension(runtimePath) {
  const path = await mkdtemp(join(tmpdir(), 'paia-bns-native-extension-'));
  try {
    await cp(runtimePath, path, {recursive: true, filter: file => !['work', 'dist', 'node_modules', 'tests', '.git', 'docs'].includes(relative(runtimePath, file).split(/[\\/]/)[0])});
    const worker = join(path, 'background/service-worker.js'), original = await readFile(worker, 'utf8');
    await cp(join(here, 'storage-worker-fixture.mjs'), join(path, 'background/bns-native-storage-fixture.mjs'));
    await cp(join(here, 'immutable-objects.mjs'), join(path, 'background/bns-native-immutable-objects.mjs'));
    await writeFile(worker, "import './bns-native-storage-fixture.mjs';\n" + original);
    const files = ['core/idb-repository.js', 'core/prompt-reuse-service.js', 'core/browser-native-sync/core.js', 'core/browser-native-sync/prompt-journal.js', 'core/browser-native-sync/checkpoints.js', 'core/browser-native-sync/segments.js'];
    const hashes = Object.fromEntries(await Promise.all(files.map(async file => [file, hash(await readFile(join(path, file)))])));
    return {path, hashes, originalWorkerSha256: hash(original), cleanup: () => rm(path, {recursive: true, force: true})};
  } catch (error) { await rm(path, {recursive: true, force: true}); throw error; }
}

// CDP's supported non-flattened Target session is used because Playwright's
// public newCDPSession accepts a Page/Frame, not an MV3 ServiceWorker.
class WorkerProtocol extends EventEmitter {
  constructor(browserSession, sessionId) {
    super(); this.browserSession = browserSession; this.sessionId = sessionId; this.next = 1; this.pending = new Map();
    this.receive = event => {
      if (event.sessionId !== this.sessionId) return;
      const message = JSON.parse(event.message);
      if (message.id) {
        const pending = this.pending.get(message.id); this.pending.delete(message.id);
        if (message.error) pending?.reject(Error(message.error.message)); else pending?.resolve(message.result);
      } else this.emit(message.method, message.params);
    };
    browserSession.on('Target.receivedMessageFromTarget', this.receive);
  }
  static async attach(browserSession, targetId) {
    const {sessionId} = await browserSession.send('Target.attachToTarget', {targetId, flatten: false});
    return new WorkerProtocol(browserSession, sessionId);
  }
  async send(method, params = {}) {
    const id = this.next++;
    const response = new Promise((resolve, reject) => this.pending.set(id, {resolve, reject}));
    try {
      await this.browserSession.send('Target.sendMessageToTarget', {sessionId: this.sessionId, message: JSON.stringify({id, method, params})});
      return await deadline(response, 'Worker CDP command timed out: ' + method);
    } finally { this.pending.delete(id); }
  }
  async close() {
    this.browserSession.off('Target.receivedMessageFromTarget', this.receive);
    for (const {reject} of this.pending.values()) reject(Error('Worker target closed'));
    this.pending.clear();
    await this.browserSession.send('Target.detachFromTarget', {sessionId: this.sessionId}).catch(() => {});
  }
}

export async function startNative(extensionPath, {closeArchivePage = false} = {}) {
  if (typeof closeArchivePage !== 'boolean') throw new TypeError('closeArchivePage must be boolean');
  // Importing this harness for static contracts never imports or launches Chrome.
  const {FakeChatGPT} = await import('../harness/fake-chatgpt.mjs');
  const h = await FakeChatGPT.start({extensionPath, headless: true, launchThroughPort: true});
  const blockedRequests = [];
  await h.context.route(/^https?:\/\//, route => { blockedRequests.push(route.request().url()); return route.abort(); });
  const url = `chrome-extension://${h.extensionId}/background/service-worker.js`;
  async function worker() {
    await eventually(() => h.context.serviceWorkers().some(value => value.url() === url), 'Synthetic worker missing');
    return h.context.serviceWorkers().find(value => value.url() === url);
  }
  const call = async (command, args = {}) => (await worker()).evaluate(({command, args}) => globalThis.__bnsNative.run(command, args), {command, args});
  await h.state();
  // A test-only isolated worker mode: stop future Archive page refreshes without
  // changing production startup or ignoring any already queued IDB activity.
  // This mode does not support the page-dependent restart/stopAtPhase helpers.
  if (closeArchivePage) {
    await h.archive.close();
    assert.equal(h.archive.isClosed(), true, 'Native Archive page must be closed');
  }
  const identity = await call('identity'); assert.equal(identity.nativeFactory, true);
  const network = new LifetimeNetworkLedger(); network.observe(identity, 'opened');
  const profileHash = hash(h.externalChrome.profile);
  async function restart() {
    return stopAtPhase('pause-for-restart', {}, 'restart-boundary');
  }
  async function stopAtPhase(command, args, expectedPhase) {
    const before = await call('identity'), lifecycle = await h.context.newCDPSession(h.archive), events = [];
    network.observe(before, 'before-stop');
    lifecycle.on('ServiceWorker.workerVersionUpdated', ({versions}) => events.push(...versions.filter(version => version.scriptURL === url)));
    let protocol;
    try {
      await lifecycle.send('ServiceWorker.enable');
      await eventually(() => events.some(value => value.runningStatus === 'running'), 'No running native worker version');
      const versionId = events.findLast(value => value.runningStatus === 'running').versionId;
      const {targetInfos} = await h.cdp.send('Target.getTargets');
      const target = targetInfos.find(value => value.type === 'service_worker' && value.url === url); assert.ok(target);
      protocol = await WorkerProtocol.attach(h.cdp, target.targetId);
      await protocol.send('Debugger.enable');
      const paused = new Promise(resolve => protocol.once('Debugger.paused', resolve));
      const inFlight = call(command, args).then(value => ({settled: 'returned', value}), error => ({settled: 'terminated', error: error.message}));
      const event = await deadline(paused, 'No synchronous phase pause: ' + expectedPhase);
      const {result, exceptionDetails} = await protocol.send('Debugger.evaluateOnCallFrame', {callFrameId: event.callFrames[0].callFrameId, expression: '({phase: globalThis.__bnsNativePhase, network: globalThis.__bnsNative.networkEvidence()})', returnByValue: true});
      assert.equal(exceptionDetails, undefined); assert.equal(result.value.phase.name, expectedPhase);
      assert.equal(result.value.phase.hasNativeTransaction, !['staged-item', 'restart-boundary'].includes(expectedPhase));
      const phase = result.value.phase;
      const pausedNetwork = network.observe(result.value.network, 'paused-before-stop');
      await deadline(lifecycle.send('ServiceWorker.stopWorker', {versionId}), 'Stopping paused worker failed');
      await eventually(() => events.some(value => value.versionId === versionId && value.runningStatus === 'stopped'), 'Worker did not emit stopped');
      const outcome = await deadline(inFlight, 'Interrupted worker call did not settle');
      if (expectedPhase !== 'restart-boundary') assert.equal(outcome.settled, 'terminated', 'The paused operation must not return a success before termination');
      else if (outcome.settled === 'returned') assert.equal(outcome.value, true, 'Only the exact restart no-op reply may complete');
      await protocol.close(); protocol = null;
      await h.state();
      await eventually(() => events.some(value => value.runningStatus === 'running' && events.indexOf(value) > events.findIndex(entry => entry.runningStatus === 'stopped')), 'Worker did not emit restarted');
      const after = await call('identity'); assert.notEqual(after.lifetime, before.lifetime);
      network.restarted(before, after);
      return assertWorkerLifecycle({phase, pausedNetwork, beforeLifetime: before.lifetime, afterLifetime: after.lifetime, stopped: true, restarted: true, interruptedCall: outcome.settled, ...(outcome.settled === 'returned' ? {completedNoopValue: outcome.value} : {})});
    } finally { await protocol?.close(); await lifecycle.detach(); }
  }
  return {
    call, restart, stopAtPhase, profileHash, networkLedger: network.evidence, browserVersion: h.context.browser().version(),
    async isolation() {
      const current = await call('identity');
      const networkLedger = network.finish(current);
      assert.deepEqual(current.networkAttempts, []); assert.deepEqual(blockedRequests, []);
      assert.equal(h.extensionNetworkRequests, 0); assert.equal(h.externalRequests, 0);
      assert.deepEqual(h.errors, []);
      return {nativeFactory: current.nativeFactory, networkAttempts: 0, httpRequests: 0, databases: current.databases, networkLedger};
    },
    close: () => h.close()
  };
}
