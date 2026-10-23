'use strict';
// Diagnostic only: preload on the main thread, without wrapping spawn/reporters,
// signals or timers. "exit" is a Node event, NOT kernel/Chrome descendant exit.
const fs = require('node:fs');
const path = require('node:path');
const {isMainThread} = require('node:worker_threads');
const {createHash} = require('node:crypto');
const {pathToFileURL} = require('node:url');
const TESTED = '02144bccf5e0e0b6842aaa4e7c6958cedecdfde1';
const FILES = Object.freeze([
  "tests/ans-08-topic-continuous-chrome-e2e.test.mjs",
  "tests/archive-year-chrome-e2e.test.mjs",
  "tests/capture-foundation-chrome-e2e.test.mjs",
  "tests/consumer-cleanup-chrome-e2e.test.mjs",
  "tests/cpr-00-project-discovery-chrome-e2e.test.mjs",
  "tests/cpr-01-project-recognition-chrome-e2e.test.mjs",
  "tests/cpv1-02-3-navigator-chrome-e2e.test.mjs",
  "tests/cpv1-02-dvn-search-chrome-e2e.test.mjs",
  "tests/cpv1-05-dvn-organize-chrome-e2e.test.mjs",
  "tests/desktop-vnext-context-chrome-e2e.test.mjs",
  "tests/nib-v4-surface-chrome-e2e.test.mjs",
  "tests/topic-section-return-position-chrome-e2e.test.mjs",
  "tests/ux-r1-shell-chrome-e2e.test.mjs",
  "tests/ux-r4-search-reuse-chrome-e2e.test.mjs"
]);
const HASHES = Object.freeze({
  "scripts/test.mjs": "c072aeae532c78d8350fab3069a63cdfe10654f45fe55d1bedd6ad3856009d2c",
  "scripts/test-report.mjs": "6d50b8409748bb65a4019f09acc5a5a0c6c33bea2cb59a19044d409ad9a470aa",
  "scripts/test-groups.mjs": "8be98bf35cdd77812aaf9f749f664da1961791c28c60f263885fc799aa60ca32",
  "scripts/prepare-browser-fonts.py": "3713f58ed8d3e48f12c72c2aae1a08d119180c50c34a5e5cf7afd61ee4e2d510",
  "package.json": "db8762aaaddaf503b780cc88fb764eb61ac1e97ec958d2c645d6902c34f75b7f",
  "tests/ans-08-topic-continuous-chrome-e2e.test.mjs": "8b843583938aa50b261a671e548dafed352edba292e0563c75c63febc0ac3c78",
  "tests/archive-year-chrome-e2e.test.mjs": "f4c39a3b4190780b76327a9b2fc0909b003158467913ffc676930853dc5de23e",
  "tests/capture-foundation-chrome-e2e.test.mjs": "2273eafd23e77ec3c3bf2bb953642b10ed1c34a39682a249350c605a7d30045d",
  "tests/consumer-cleanup-chrome-e2e.test.mjs": "2f7dc83022e141803474d8393ea782b498f813dc334548a5709dd9f03c9b1679",
  "tests/cpr-00-project-discovery-chrome-e2e.test.mjs": "874f207f4536ca457887e965842a79d7c121c4807471fad71be86a830097efe7",
  "tests/cpr-01-project-recognition-chrome-e2e.test.mjs": "f077e25c8ab5ac6d9072c0346e3f986b8fa83d0ad5c7f0564b072e749ccdc2ec",
  "tests/cpv1-02-3-navigator-chrome-e2e.test.mjs": "6de1a1ba46a8572e77d99b1d0a7813d662af81f2ca0348f898fa1aa5f4f7e45f",
  "tests/cpv1-02-dvn-search-chrome-e2e.test.mjs": "7b3e5570cec83327b0b66ea40aefd0deffbf7dfab83b412612bf92105bd81e63",
  "tests/cpv1-05-dvn-organize-chrome-e2e.test.mjs": "bb5e04886781419845b683b903532b0b0f54ddaa26ae3d6fb81b495fe1dff653",
  "tests/desktop-vnext-context-chrome-e2e.test.mjs": "a612c7f99d92af3766944e633c9aa8bc40d3adafed6acddf6aca0dbad4aef9cb",
  "tests/nib-v4-surface-chrome-e2e.test.mjs": "f6526383e574d07eaf8fac464fb7c537a2e60f4f765e4f028613c610b55843f5",
  "tests/topic-section-return-position-chrome-e2e.test.mjs": "4f432cec19778c3b29eb23930d6b03d6187e1751d2babd68652e706dfdeb91d1",
  "tests/ux-r1-shell-chrome-e2e.test.mjs": "0fa478cb1bb0367026d68143dd76f46303d11993be74e7cd5ec2e74c2d0987a7",
  "tests/ux-r4-search-reuse-chrome-e2e.test.mjs": "913d73ed533297e0d558f9854e2063cfd0405dd60a9c4a51b437c1df24f6b2b2"
});

function classify(root, argv, execArgv, context) {
  const args = argv.slice(1).map(value => path.resolve(root, value));
  const absolute = FILES.map(file => path.join(root, file));
  if (context === 'child-v8' && args.length === 1 && absolute.includes(args[0])) {
    return {role: 'test-file', file: FILES[absolute.indexOf(args[0])]};
  }
  if (!context && args.length === 2 && args[0] === path.join(root, 'scripts/test.mjs') && argv[2] === 'browser E2E') {
    return {role: 'runner', file: null};
  }
  if (!context && JSON.stringify(execArgv) === JSON.stringify(['--test', '--test-concurrency=1', '--test-reporter=./scripts/test-report.mjs']) && JSON.stringify(args) === JSON.stringify(absolute)) {
    return {role: 'test-controller', file: null};
  }
  return null; // npm, audit scripts, helpers, unknown files and workers are not logged.
}

async function verifySource(root) {
  const assert = require('node:assert/strict');
  root = fs.realpathSync(root);
  const {group, testShard} = await import(pathToFileURL(path.join(root, 'scripts/test-groups.mjs')).href);
  // Exactly the original runner's sorted selection and post-category positions.
  const names = fs.readdirSync(path.join(root, 'tests')).filter(n => n.endsWith('.test.mjs')).sort();
  const browser = names.filter(n => group(n) === 'browser E2E').map(n => 'tests/' + n);
  const selected = browser.filter((file, i) => testShard(file, i, 10, 'browser E2E') === 2);
  assert.equal(browser.length, 101);
  assert.equal(selected.length, 14);
  assert.deepEqual(selected, FILES);
  for (const [file, expected] of Object.entries(HASHES)) {
    assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex'), expected, file);
  }
  const harness = process.env.PAIA_B2_HARNESS_SHA;
  const observerSHA256 = process.env.PAIA_B2_OBSERVER_SHA256;
  assert.match(harness || '', /^[0-9a-f]{40}$/);
  assert.match(observerSHA256 || '', /^[0-9a-f]{64}$/);
  assert.equal(process.env.PAIA_B2_TESTED_SHA, TESTED);
  assert.equal(process.env.GITHUB_RUN_ATTEMPT, '1');
  const directory = path.join(root, 'work/browser2-capacity');
  fs.mkdirSync(path.dirname(directory), {recursive: true});
  fs.mkdirSync(directory); // Never reuse previous diagnostic output.
  const identity = {schema: 1, harnessCommit: harness, testedCommit: TESTED, observerSHA256, node: process.version, platform: process.platform, arch: process.arch, shard: '2/10', concurrency: 1, browserRoots: browser.length, files: selected, sourceSHA256: HASHES, eventMeaning: 'Node preload start/beforeExit/exit only; missing events and kernel/Chrome descendant completion remain UNKNOWN'};
  fs.writeFileSync(path.join(directory, 'identity.json'), JSON.stringify(identity, null, 2) + '\n', {flag: 'wx', mode: 0o600});
  console.log('BROWSER2_DIAGNOSTIC_SOURCE_VERIFIED');
}

function observe() {
  if (!isMainThread || process.env.PAIA_B2_OBSERVE !== '1') return;
  const root = process.env.PAIA_B2_ROOT;
  if (!root || !path.isAbsolute(root) || process.env.PAIA_TEST_SHARD !== '2/10' || process.env.PAIA_TEST_CONCURRENCY !== '1') return;
  const identity = classify(root, process.argv, process.execArgv, process.env.NODE_TEST_CONTEXT);
  if (!identity) return;
  const start = process.hrtime.bigint();
  let fd;
  const failed = () => { try { fs.writeSync(2, 'BROWSER2_DIAGNOSTIC_WRITE_FAILED: lifecycle evidence UNKNOWN\n'); } catch {} };
  try { fd = fs.openSync(path.join(root, 'work/browser2-capacity', 'process-' + process.pid + '.jsonl'), 'ax', 0o600); }
  catch { failed(); return; } // Never mask the original test result with a logging fault.
  const emit = (event, code) => {
    const now = process.hrtime.bigint();
    const record = {schema: 1, ...identity, event, pid: process.pid, ppid: process.ppid, monotonicNs: String(now), sincePreloadNs: String(now - start), exitCode: Number.isInteger(code) ? code : null};
    try { fs.writeSync(fd, JSON.stringify(record) + '\n'); } catch { failed(); }
  };
  emit('start', null);
  process.on('beforeExit', code => emit('beforeExit', code));
  process.on('exit', code => { emit('exit', code); try { fs.closeSync(fd); } catch { failed(); } });
}

module.exports = {TESTED, FILES, HASHES, classify, verifySource};
if (isMainThread && require.main === module) {
  if (process.argv.length !== 4 || process.argv[2] !== '--verify-source') throw Error('BROWSER2_DIAGNOSTIC_INVALID_COMMAND');
  verifySource(process.argv[3]).catch(() => { console.error('BROWSER2_DIAGNOSTIC_SOURCE_REJECTED'); process.exitCode = 1; });
} else observe();
