// Explicit opt-in candidate suite. Nested placement preserves every existing
// test.mjs discovery list, whole-file shard placement, and hosted gate budget.
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir, writeFile, mkdtemp, rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {instrumentedExtension, root, startNative} from './storage-harness.mjs';
import {assertReceipt, CASES} from './receipt.mjs';
import {assertPromptCrashOutcome, portablePrompt as portable} from './proof-oracles.mjs';

const head = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
const tree = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], {cwd: root, encoding: 'utf8'}).trim();
if (process.env.PAIA_TESTED_HEAD) assert.equal(head, process.env.PAIA_TESTED_HEAD);
const output = join(root, 'work/qa-bns-native-storage');
const empty = snapshot => { assert.deepEqual(snapshot.preferences.overrides, []); assert.deepEqual(snapshot.state, []); assert.deepEqual(snapshot.outbox, []); assert.equal(snapshot.namespace, 'initial'); };
function atomic(snapshot, text) {
  assert.equal(snapshot.preferences.overrides[0]?.text, text);
  assert.deepEqual(snapshot.outbox.at(-1)?.value, portable(snapshot.preferences));
  assert.equal(snapshot.sequence, snapshot.outbox.length);
  assert.deepEqual(snapshot.state[0]?.versions[0].value, portable(snapshot.preferences));
}

for (const variant of ['source', 'release']) test('BNS isolated native IndexedDB partial Core ' + variant, {timeout: 240000}, async t => {
  await mkdir(output, {recursive: true});
  const releaseOutput = await mkdtemp(join(tmpdir(), 'paia-bns-storage-release-'));
  let extension, a, b;
  const receipt = {
    schema: 1, result: 'IN_PROGRESS', head, tree, variant, evidence: 'SYNTHETIC_NATIVE_INDEXEDDB_PARTIAL_CORE',
    productionHashes: {}, cases: [], terminations: [], profileHashes: [],
    ownerCoverage: 'promptPreferences-only', quotaEvidence: 'injected-DOMException-not-physical-exhaustion',
    productionActivation: false, uiQualification: false, providerQualification: false, installedUserBuild: false, fullCanonicalCoverage: false
  };
  const save = () => writeFile(join(output, variant + '.json'), JSON.stringify(receipt, null, 2) + '\n');
  try {
    if (variant === 'release') execFileSync('python3', ['scripts/build_current_release.py', join(releaseOutput, 'release')], {cwd: root, stdio: 'pipe'});
    extension = await instrumentedExtension(variant === 'source' ? root : join(releaseOutput, 'release'));
    receipt.productionHashes = extension.hashes;
    a = await startNative(extension.path); b = await startNative(extension.path);
    receipt.sourceNetwork = a.networkLedger; receipt.destinationNetwork = b.networkLedger;
    receipt.browserVersion = b.browserVersion; assert.equal(a.browserVersion, b.browserVersion);
    receipt.profileHashes = [a.profileHash, b.profileHash]; assert.notEqual(...receipt.profileHashes);
    const cloud = await a.call('create-cloud-fixture');
    receipt.sourceIsolation = await a.isolation();
    await a.close(); a = null; receipt.sourceDeviceClosedBeforeRestore = true;
    // Only immutable protocol bytes/references are sent to device B. The expected
    // owner/state stay in the Node oracle; B cannot consult A's DB, state or heap.
    const objects = {entries: cloud.entries, descriptors: cloud.descriptors};
    const restored = snapshot => {
      assert.deepEqual(snapshot.state, cloud.expected.state);
      assert.deepEqual(portable(snapshot.preferences), portable(cloud.expected.preferences));
      assert.deepEqual(snapshot.outbox, []);
    };
    const runCase = async (id, body) => {
      let passed = false;
      await t.test(id, async () => { await body(); passed = true; });
      receipt.cases.push({id, result: passed ? 'PASS' : 'FAIL'}); await save();
      assert.ok(passed, 'Stop this variant after a failed storage case: ' + id);
    };
    await runCase(CASES[0], async () => {
      const value = await b.call('change', {name: 'journal', text: 'Synthetic saved exact e\u0301\n第二行'});
      assert.equal(value.ok, true); atomic(value.snapshot, 'Synthetic saved exact e\u0301\n第二行');
      receipt.promptOwnerGuard=[];
      for(const [mode,code]of [['unmanaged','BNS_RESTORE_UNMANAGED_OWNER'],['changed','BNS_OWNER_CHANGED'],['empty',null]]){
        const proof=await b.call('prompt-owner-guard',{mode});assert.equal(proof.code,code);
        if(code)assert.deepEqual(proof.after,proof.before,'native owner refusal rolls back all canonical and protocol meta');
        else assert.equal(proof.result.state,'applied');
        receipt.promptOwnerGuard.push({mode,code,atomic:code?JSON.stringify(proof.before)===JSON.stringify(proof.after):true});
      }

    });
    for (const [index, faultAt, code] of [[1, 'abort', 'STORAGE_FAILED'], [2, 'quota', 'STORAGE_FULL']]) await runCase(CASES[index], async () => {
      const before = await b.call('snapshot', {name: 'journal'});
      const result = await b.call('change', {name: 'journal', text: 'Synthetic must roll back', faultAt});
      assert.equal(result.ok, false); assert.equal(result.code, code); assert.deepEqual(result.snapshot, before);
    });
    await runCase(CASES[3], async () => {
      const before = await b.call('snapshot', {name: 'journal'}); receipt.committedRestart = await b.restart();
      assert.deepEqual(await b.call('snapshot', {name: 'journal'}), before);
    });
    for (const [index, faultAt] of [[4, 'pause-before-journal'], [5, 'pause-after-journal']]) await runCase(CASES[index], async () => {
      const before = await b.call('snapshot', {name: 'journal'});
      const text = 'Synthetic distinct interrupted edit: ' + faultAt;
      receipt.terminations.push(await b.stopAtPhase('change', {name: 'journal', text, faultAt}, faultAt));
      const after = await b.call('snapshot', {name: 'journal'});
      // Termination is racing the native backend's commit. Either complete
      // outcome is legal; canonical/outbox disagreement is never accepted.
      const event = receipt.terminations.at(-1);
      event.promptProof = {text, before, after};
      event.durabilityOutcome = assertPromptCrashOutcome(before, after, {text, operation: event.phase.preparedOperation});
    });
    await runCase(CASES[6], async () => {
      const first = await b.call('receive', {name: 'replay', ...objects, indices: [2, 1, 0]}); restored(first.snapshot);
      const again = await b.call('receive', {name: 'replay', ...objects, indices: [1, 2, 0]}); restored(again.snapshot);
      assert.ok(again.results.every(value => value.state === 'duplicate'));
    });
    await runCase(CASES[7], async () => {
      const args = {name: 'activation_abort', restoreId: 'native_activation_abort', ...objects, checkpointRef: cloud.final, faultAt: 'after-activation'};
      const staged = await b.call('stage', args); empty(staged.snapshot); assert.equal(staged.receipt.phase, 'validated');
      const result = await b.call('activate', args); assert.equal(result.ok, false); empty(result.snapshot);
      receipt.activationAbortRestart = await b.restart();
      const retry = await b.call('activate', {...args, faultAt: null}); assert.equal(retry.ok, true); restored(retry.snapshot);
    });
    await runCase(CASES[8], async () => {
      const args = {name: 'staged_restart', restoreId: 'native_staged_restart', ...objects, checkpointRef: cloud.final};
      receipt.terminations.push(await b.stopAtPhase('stage', {...args, pauseAt: 'staged-item'}, 'staged-item'));
      empty(await b.call('snapshot', {name: args.name}));
      const resumed = await b.call('stage', args); assert.equal(resumed.receipt.phase, 'validated'); empty(resumed.snapshot);
      restored((await b.call('activate', args)).snapshot);
    });
    await runCase(CASES[9], async () => {
      const args = {name: 'activation_restart', restoreId: 'native_activation_restart', ...objects, checkpointRef: cloud.final, pauseAt: 'after-activation'};
      await b.call('stage', args);
      receipt.terminations.push(await b.stopAtPhase('activate', args, 'after-activation'));
      const after = await b.call('snapshot', {name: args.name});
      if (after.namespace === 'initial') empty(after);
      else { assert.equal(after.namespace, args.restoreId); restored(after); }
      receipt.terminations.at(-1).durabilityOutcome = after.namespace === 'initial' ? 'neither' : 'both';
      restored((await b.call('activate', {...args, pauseAt: null})).snapshot);
    });
    for (const [index, timing, expected] of [[10, 'before', 'BNS_RESTORE_LIVE_PENDING'], [11, 'after', 'BNS_RESTORE_LOCAL_CHANGED']]) await runCase(CASES[index], async () => {
      const args = {name: 'pending_' + timing, restoreId: 'native_pending_' + timing, ...objects, checkpointRef: cloud.first};
      await b.call('receive', {...args, indices: [0]});
      if (timing === 'before') await b.call('receive', {...args, indices: [2]});
      await b.call('stage', args);
      if (timing === 'after') await b.call('receive', {...args, indices: [2]});
      const before = await b.call('snapshot', {name: args.name});
      const duplicate = await b.call('receive', {...args, indices: [2]}); assert.equal(duplicate.snapshot.generation, before.generation);
      const result = await b.call('activate', args); assert.equal(result.ok, false); assert.equal(result.code, expected);
      assert.equal(result.snapshot.namespace, 'initial'); assert.equal(result.snapshot.pending.length, 1); assert.deepEqual(result.snapshot, before);
    });
    await runCase(CASES[12], async () => {
      const args = {name: 'stage_pending', restoreId: 'native_stage_pending', ...objects, checkpointRef: cloud.first};
      await b.call('stage', args);
      const pending = await b.call('stage-receive', {...args, index: 2}); assert.equal(pending.result.state, 'pending'); assert.equal(pending.pending.length, 1);
      const result = await b.call('activate', {...args, checkpointRef: null}); assert.equal(result.ok, false); assert.equal(result.code, 'BNS_RESTORE_STAGE_CHANGED'); empty(result.snapshot);
    });
    await runCase(CASES[13], async () => {
      const result = await b.call('old-preparation', {name: 'old_prepared', restoreId: 'native_old_prepared', ...objects, checkpointRef: cloud.final});
      assert.equal(result.ok, false); assert.equal(result.code, 'BNS_PREPARATION_STALE'); restored(result.snapshot);
    });
    await runCase(CASES[14], async () => {
      const result = await b.call('counter-during-validation', {name: 'local_counter', ...objects});
      assert.equal(result.preferences.overrides[0].reuseCount, 1);
      assert.equal(result.preferences.overrides[0].text, 'Synthetic intermediate revision'); assert.deepEqual(result.outbox, []);
    });
    receipt.conflictOwnerCases=await b.call('prompt-conflict-matrix');assert.equal(receipt.conflictOwnerCases.length,12);
    const isolation = await b.isolation(); receipt.nativeFactory = isolation.nativeFactory; receipt.networkAttempts = isolation.networkAttempts; receipt.destinationIsolation = isolation;
    receipt.result = 'PASS'; assertReceipt(receipt, {head, variant}); await save();
  } catch (error) { receipt.result = 'FAIL'; receipt.failure = error.message; await save(); throw error; }
  finally { try { await a?.close(); } finally { try { await b?.close(); } finally { try { await extension?.cleanup(); } finally { await rm(releaseOutput, {recursive:true, force:true}); } } } }
});
