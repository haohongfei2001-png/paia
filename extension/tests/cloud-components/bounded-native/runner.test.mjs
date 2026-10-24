// Pure runner/verifier tests. No product module, Playwright, browser, build,
// server, profile, provider, network, or child process is executed here.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {sha256, outputFingerprint, verifyArtifactSnapshots} from './artifacts.mjs';
import {exercisePreparedRunner, fixedRouteHandler, denyPageNetworking} from './runner.mjs';
import {BUDGETS, CONTEXT_OPTIONS, FIXTURE_PATH, LAUNCH_OPTIONS, NOT_READY, ORIGIN, SOURCE_COMMIT, TEST_IDS, VARIANTS, requireNativeReadiness} from './policy.mjs';

const sourceManifestBytes = await readFile(new URL('./source-manifest.json', import.meta.url));
const sourceManifest = JSON.parse(sourceManifestBytes);
const sourceFiles = Object.fromEntries(await Promise.all(Object.keys(sourceManifest.files).map(async path => [path, await readFile(new URL('../../../' + path, import.meta.url))])));
const fixtureBytes = await readFile(new URL('./recovery-saved-fixture.mjs', import.meta.url));
// In-memory verifier test doubles only. Not an emitted Release or a build.
const releaseFiles = {...sourceFiles, 'background/service-worker.js': Buffer.from(sourceFiles['background/service-worker.js'].toString().replace("    case 'FILTER_DIAGNOSTICS': return store.filterDiagnostics();\n", ''))};
const releaseManifest = {
  schema: 1, variant: 'Release', sourceCommit: sourceManifest.sourceCommit, sourceTree: sourceManifest.sourceTree,
  sourceManifestSha256: sha256(sourceManifestBytes),
  files: Object.fromEntries(Object.entries(releaseFiles).map(([path, bytes]) => [path, sha256(bytes)])),
  build: {entrypoint: 'scripts/build_current_release.py', builderFiles: sourceManifest.builderFiles, exitCode: 0,
    guardrails: 'PASS', reused: false, elapsedMs: 1, sourceFingerprint: '0'.repeat(64), outputFingerprint: outputFingerprint(releaseFiles), evidenceClass: 'CONTRACT_FIXTURE_NOT_A_BUILD'},
};
const input = {sourceManifestBytes, sourceFiles, releaseManifest, releaseFiles, fixtureBytes};
const artifacts = verifyArtifactSnapshots(input);

function fakeLauncher({failAt, rejectLaunch = false, wrongId = false, denials = [], closeFailure = false, onCase = async () => {}, onClose = async () => {}} = {}) {
  const events = [], options = [], contexts = [];
  let activeContexts = 0, maxContexts = 0;
  const launcher = async launchOptions => {
    events.push('launch'); options.push(launchOptions);
    if (rejectLaunch) throw Error('SYNTHETIC_LAUNCH_DENIED');
    return {
      async newContext(contextOptions) {
        activeContexts++; maxContexts = Math.max(maxContexts, activeContexts);
        const variant = VARIANTS[contexts.length], state = {variant, contextOptions, closed: false};
        contexts.push(state); events.push('open:' + variant);
        return {
          async route(pattern, handler) { assert.equal(pattern, '**/*'); state.handler = handler; },
          async addInitScript(fn) { assert.equal(fn, denyPageNetworking); state.init = true; },
          async newPage() { return {
            on(name, callback) { assert.equal(name, 'pageerror'); state.onError = callback; },
            async goto(url) {
              assert.equal(state.init, true);
              const answer = await routeRequest(state.handler, url);
              assert.equal(answer.kind, 'fulfill');
            },
            async evaluate(fn, arg) {
              if (!arg) return denials;
              assert.equal(arg.path, '/' + variant + '/' + FIXTURE_PATH);
              events.push('case:' + variant + ':' + arg.id);
              await onCase({variant, id: arg.id, state});
              return {id: wrongId ? 'UNAPPROVED_CASE' : arg.id, result: failAt === variant + ':' + arg.id ? 'FAIL' : 'PASS', assertions: 1, nativeFactory: true, details: 'SYNTHETIC_FAKE_LAUNCHER_ONLY'};
            },
          }; },
          async close() {
            events.push('close:' + variant);
            await onClose(state);
            if (closeFailure) throw Error('SYNTHETIC_CONTEXT_CLOSE_FAILURE');
            if (!state.closed) activeContexts--;
            state.closed = true;
          },
        };
      },
      async close() { events.push('close:browser'); },
    };
  };
  return {launcher, events, options, contexts, get maxContexts() { return maxContexts; }};
}
async function routeRequest(handler, url, method = 'GET') {
  let answer;
  await handler({
    request() { return {url: () => url, method: () => method}; },
    async abort(reason) { answer = {kind: 'abort', reason}; },
    async fulfill(value) { answer = {kind: 'fulfill', value}; },
    async continue() { assert.fail('NETWORK CONTINUE IS FORBIDDEN'); },
    async fallback() { assert.fail('NETWORK FALLBACK IS FORBIDDEN'); },
  });
  return answer;
}

test('native readiness remains NOT_READY regardless of runner unit success', () => {
  assert.equal(NOT_READY.length, 5);
  assert.throws(requireNativeReadiness, {code: 'NOT_READY'});
  assert.deepEqual(BUDGETS, {buildMs: 30000, nativeMs: 120000, jobMs: 300000});
});
test('one launch, eight fixed IDs, sequential fresh contexts, explicit sandbox and network deny', async () => {
  const fake = fakeLauncher(), receipt = await exercisePreparedRunner({artifacts, launcher: fake.launcher});
  assert.equal(receipt.result, 'CONTRACT_PASS');
  assert.equal(receipt.evidenceClass, 'RUNNER_UNIT_ONLY_NOT_NATIVE');
  assert.equal(receipt.sourceCommit, SOURCE_COMMIT);
  assert.equal(receipt.launchAttempts, 1);
  assert.deepEqual(fake.options, [{...LAUNCH_OPTIONS, args: [...LAUNCH_OPTIONS.args]}]);
  assert.equal(fake.options[0].chromiumSandbox, true);
  assert.ok(!fake.options[0].args.some(arg => /no-sandbox|disable-setuid-sandbox/.test(arg)));
  assert.equal(fake.maxContexts, 1);
  assert.deepEqual(fake.contexts.map(c => c.contextOptions), [{...CONTEXT_OPTIONS}, {...CONTEXT_OPTIONS}]);
  assert.ok(fake.events.indexOf('close:Source') < fake.events.indexOf('open:Release'));
  assert.deepEqual(receipt.cases.map(({variant, id, result}) => ({variant, id, result})), VARIANTS.flatMap(variant => TEST_IDS.map(id => ({variant, id, result: 'PASS'}))));
  assert.equal(receipt.hardBudgetEnforcement, 'NOT_READY');
  assert.equal(receipt.processTreeEnforcement, 'NOT_READY');
  assert.equal(receipt.osNetworkEnforcement, 'NOT_READY');
});
test('first case failure preserves response and stops before any later case or Release', async () => {
  const fake = fakeLauncher({failAt: 'Source:' + TEST_IDS[1]});
  const receipt = await exercisePreparedRunner({artifacts, launcher: fake.launcher});
  assert.equal(receipt.result, 'CONTRACT_FAIL');
  assert.deepEqual(receipt.cases.map(c => c.result), ['PASS', 'FAIL', ...Array(6).fill('NOT_RUN')]);
  assert.equal(receipt.cases[1].observed.result, 'FAIL');
  assert.equal(fake.contexts.length, 1);
  assert.equal(fake.events.filter(e => e === 'launch').length, 1);
});
test('Release failure stops after the first failed Release ID without retry', async () => {
  const fake = fakeLauncher({failAt: 'Release:' + TEST_IDS[0]});
  const receipt = await exercisePreparedRunner({artifacts, launcher: fake.launcher});
  assert.deepEqual(receipt.cases.map(c => c.result), [...Array(4).fill('PASS'), 'FAIL', ...Array(3).fill('NOT_RUN')]);
  assert.equal(receipt.launchAttempts, 1);
});
test('launch denial never retries, discovers another binary, or disables sandbox', async () => {
  const fake = fakeLauncher({rejectLaunch: true});
  const receipt = await exercisePreparedRunner({artifacts, launcher: fake.launcher});
  assert.equal(receipt.result, 'CONTRACT_FAIL');
  assert.equal(receipt.launchAttempts, 1);
  assert.deepEqual(fake.events, ['launch']);
  assert.ok(receipt.cases.every(c => c.result === 'NOT_RUN'));
});
test('wrong ID, page error, denied API, and close failure cannot pass or open Release', async () => {
  for (const options of [
    {wrongId: true}, {denials: [{kind: 'fetch'}]}, {closeFailure: true},
    {onCase: async ({state}) => state.onError(Error('SYNTHETIC_PAGE_ERROR'))},
  ]) {
    const fake = fakeLauncher(options), receipt = await exercisePreparedRunner({artifacts, launcher: fake.launcher});
    assert.equal(receipt.result, 'CONTRACT_FAIL');
    assert.equal(fake.contexts.length, 1);
  }
});
test('network attempt during a case or context close is blocked and stops Release', async () => {
  for (const boundary of ['onCase', 'onClose']) {
    const fake = fakeLauncher({[boundary]: async value => { await routeRequest((value.state ?? value).handler, 'https://unapproved.invalid/provider'); }});
    const receipt = await exercisePreparedRunner({artifacts, launcher: fake.launcher});
    assert.equal(receipt.result, 'CONTRACT_FAIL');
    assert.equal(fake.contexts.length, 1);
    assert.equal(receipt.contexts[0].blocked.length, 1);
  }
});
test('fixed route fulfills only same-variant exact manifest paths and never falls back', async () => {
  const events = {requests: [], blocked: []}, route = fixedRouteHandler(artifacts, 'Source', events);
  for (const url of [ORIGIN + '/Source/', ORIGIN + '/Source/core/idb-repository.js', ORIGIN + '/Source/' + FIXTURE_PATH]) {
    const result = await routeRequest(route, url);
    assert.equal(result.kind, 'fulfill');
    assert.match(result.value.headers['Content-Security-Policy'], /connect-src 'none'/);
  }
  for (const [url, method] of [
    ['https://provider.invalid/', 'GET'], [ORIGIN + '/Release/core/idb-repository.js', 'GET'],
    [ORIGIN + '/Source/core/idb-repository.js?escape=1', 'GET'], [ORIGIN + '/Source/core/idb-repository.js#fragment', 'GET'],
    [ORIGIN + '/Source/../core/idb-repository.js', 'GET'], [ORIGIN + '/Source/core/unlisted.js', 'GET'],
    [ORIGIN + '/Source/core/idb-repository.js', 'POST'], [ORIGIN + '.evil.invalid/Source/', 'GET'],
    [ORIGIN + '/Source/tests/old-full.test.mjs', 'GET'],
  ]) assert.equal((await routeRequest(route, url, method)).kind, 'abort');
  assert.equal(events.requests.length, 3);
  assert.equal(events.blocked.length, 9);
});
test('page network deny script throws and records all supported API attempts in an isolated VM', () => {
  const scope = {navigator: {}, fetch() {}, XMLHttpRequest() {}, WebSocket() {}, EventSource() {}, Worker() {}, SharedWorker() {}, RTCPeerConnection() {}, WebTransport() {}};
  runInNewContext('(' + denyPageNetworking.toString() + ')()', scope);
  for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'Worker', 'SharedWorker', 'RTCPeerConnection', 'WebTransport']) assert.throws(() => scope[name]('SYNTHETIC'), /network is disabled/);
  assert.throws(() => scope.navigator.sendBeacon('SYNTHETIC'), /network is disabled/);
  assert.equal(scope.__componentNetworkDenials.length, 9);
});
test('missing or hash-mismatched Source/Release/fixture is rejected before any launch', async () => {
  let calls = 0;
  const scenarios = [
    {...input, sourceManifestBytes: Buffer.from('{}')},
    {...input, fixtureBytes: Buffer.from('wrong fixture')},
    {...input, sourceFiles: {...sourceFiles, 'core/idb-repository.js': Buffer.from('changed')}},
    {...input, sourceFiles: {...sourceFiles, 'core/extra.js': Buffer.from('extra')}},
    {...input, releaseManifest: null},
    {...input, releaseFiles: {...releaseFiles, 'core/idb-repository.js': Buffer.from('changed')}},
    {...input, releaseManifest: {...releaseManifest, sourceCommit: '7ceb73c'.padEnd(40, '0')}},
    {...input, releaseManifest: {...releaseManifest, variant: 'Source'}},
    {...input, releaseManifest: {...releaseManifest, build: {...releaseManifest.build, entrypoint: 'custom-builder.py'}}},
    {...input, releaseManifest: {...releaseManifest, build: {...releaseManifest.build, elapsedMs: 30001}}},
    {...input, releaseManifest: {...releaseManifest, build: {...releaseManifest.build, evidenceClass: 'NATIVE_PASS'}}},
  ];
  for (const scenario of scenarios) {
    assert.throws(() => verifyArtifactSnapshots(scenario));
  }
  await assert.rejects(exercisePreparedRunner({artifacts: {}, launcher: async () => { calls++; }}), /Hash-verified/);
  assert.equal(calls, 0);
});
test('a self-consistent modified Release hash still fails unchanged-builder correspondence', () => {
  const path = 'core/idb-repository.js', files = {...releaseFiles, [path]: Buffer.from('SYNTHETIC wrong runtime')};
  const manifest = {...releaseManifest, files: {...releaseManifest.files, [path]: sha256(files[path])}, build: {...releaseManifest.build, outputFingerprint: outputFingerprint(files)}};
  assert.throws(() => verifyArtifactSnapshots({...input, releaseManifest: manifest, releaseFiles: files}), /differs from unchanged builder/);
});
test('verified served bytes cannot be changed by subsequently mutating input buffers', () => {
  const files = {...sourceFiles, 'core/idb-repository.js': Buffer.from(sourceFiles['core/idb-repository.js'])};
  const prepared = verifyArtifactSnapshots({...input, sourceFiles: files});
  const path = '/Source/core/idb-repository.js', before = prepared.body('Source', path);
  files['core/idb-repository.js'].fill(0);
  assert.equal(prepared.body('Source', path), before);
});
test('soft timeout stops later cases but cannot be mislabeled hard process enforcement', async () => {
  let fire, pending;
  const clock = {setTimeout(fn, ms) { if (ms === BUDGETS.nativeMs) fire = fn; return fn; }, clearTimeout() {}};
  const fake = fakeLauncher({onCase: async () => { await new Promise(resolve => { pending = resolve; }); }});
  const running = exercisePreparedRunner({artifacts, launcher: fake.launcher, clock});
  while (!pending) await Promise.resolve();
  fire();
  const receipt = await running;
  pending();
  await Promise.resolve();
  assert.equal(receipt.result, 'CONTRACT_FAIL');
  assert.match(receipt.failure.message, /SOFT_NATIVE_DEADLINE_EXCEEDED/);
  assert.equal(fake.events.filter(e => e.startsWith('case:')).length, 1);
  assert.equal(fake.events.filter(e => e === 'launch').length, 1);
  assert.equal(receipt.processTreeEnforcement, 'NOT_READY');
});
test('late launcher/context resolution preserves UNKNOWN cleanup and cannot start another case or launch', async () => {
  for (const kind of ['browser', 'context']) {
    let fire, release, acquisitions = 0, casesStarted = 0;
    const clock = {setTimeout(fn, ms) { if (ms === BUDGETS.nativeMs) fire = fn; return fn; }, clearTimeout() {}};
    const late = new Promise(resolve => { release = resolve; });
    const handle = {async close() {}, async newPage() { casesStarted++; throw Error('MUST_NOT_START'); }};
    const launcher = async () => {
      acquisitions++;
      if (kind === 'browser') return late;
      return {async newContext() { acquisitions++; return late; }, async close() {}};
    };
    const running = exercisePreparedRunner({artifacts, launcher, clock});
    const expectedAcquisitions = kind === 'browser' ? 1 : 2;
    for (let step = 0; step < 50 && acquisitions < expectedAcquisitions; step++) await Promise.resolve();
    assert.equal(acquisitions, expectedAcquisitions);
    fire();
    const receipt = await running;
    assert.equal(receipt.result, 'CONTRACT_FAIL');
    assert.deepEqual(receipt.unconfirmedHandles.map(row => ({kind: row.kind, outcome: row.outcome, cleanup: row.cleanup})), [{kind, outcome: 'UNKNOWN', cleanup: 'UNCONFIRMED'}]);
    release(handle);
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(receipt.launchAttempts, 1);
    assert.equal(casesStarted, 0);
    assert.ok(receipt.cases.every(row => row.result === 'NOT_RUN'));
    assert.equal(receipt.unconfirmedHandles[0].cleanup, 'UNCONFIRMED');
  }
});
