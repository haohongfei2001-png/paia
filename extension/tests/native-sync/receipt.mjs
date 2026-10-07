import assert from 'node:assert/strict';
import {assertPromptCrashOutcome, assertNetworkLedger, assertWorkerLifecycle} from './proof-oracles.mjs';

export const CASES = Object.freeze([
  'prompt-atomic-success', 'prompt-injected-abort', 'prompt-injected-quota',
  'prompt-committed-worker-restart', 'prompt-stop-before-journal', 'prompt-stop-after-journal',
  'reordered-duplicate-segment-delivery', 'restore-injected-activation-abort',
  'restore-staged-worker-restart', 'restore-stop-after-activation',
  'live-pending-before-stage-fence', 'live-pending-after-stage-fence',
  'staging-pending-generation-fence', 'pre-restore-preparation-fence',
  'device-counter-during-remote-validation'
]);

export function assertReceipt(receipt, {head, variant}) {
  assert.equal(receipt.schema, 1); assert.equal(receipt.result, 'PASS');
  assert.equal(receipt.head, head); assert.match(head, /^[a-f0-9]{40}$/);
  assert.match(receipt.tree, /^[a-f0-9]{40}$/); assert.match(receipt.browserVersion, /^\d+\./);
  assert.equal(receipt.variant, variant); assert.equal(receipt.evidence, 'SYNTHETIC_NATIVE_INDEXEDDB_PARTIAL_CORE');
  assert.deepEqual(receipt.cases.map(value => value.id), CASES);
  assert.ok(receipt.cases.every(value => value.result === 'PASS'));
  assert.equal(receipt.nativeFactory, true); assert.equal(receipt.networkAttempts, 0);
  assert.equal(receipt.sourceDeviceClosedBeforeRestore, true);
  assert.equal(receipt.profileHashes.length, 2); assert.notEqual(...receipt.profileHashes);
  assert.ok(receipt.profileHashes.every(value => /^[a-f0-9]{64}$/.test(value)));
  assert.equal(receipt.ownerCoverage, 'promptPreferences-only');
  assert.equal(receipt.quotaEvidence, 'injected-DOMException-not-physical-exhaustion');
  for (const claim of ['productionActivation', 'uiQualification', 'providerQualification', 'installedUserBuild', 'fullCanonicalCoverage']) assert.equal(receipt[claim], false);
  const expectedPhases = ['pause-before-journal', 'pause-after-journal', 'staged-item', 'after-activation'];
  for (const event of [receipt.committedRestart, receipt.activationAbortRestart]) {
    assertWorkerLifecycle(event); assert.equal(event.phase.name, 'restart-boundary');
    assert.equal(event.phase.hasNativeTransaction, false); assert.equal(event.phase.lifetime, event.beforeLifetime);
  }
  assert.deepEqual(receipt.terminations.map(value => value.phase.name), expectedPhases);
  for (const event of receipt.terminations) {
    assertWorkerLifecycle(event); assert.equal(event.interruptedCall, 'terminated');
    assert.equal(event.phase.lifetime, event.beforeLifetime);
    assert.equal(event.phase.hasNativeTransaction, event.phase.name !== 'staged-item');
    if (event.phase.hasNativeTransaction) assert.ok(['both', 'neither'].includes(event.durabilityOutcome));
    if (event.phase.name.startsWith('pause-')) {
      const {text, before, after} = event.promptProof;
      assert.equal(event.durabilityOutcome, assertPromptCrashOutcome(before, after, {text, operation: event.phase.preparedOperation}));
    }
  }
  assert.notEqual(receipt.terminations[0].promptProof.text, receipt.terminations[1].promptProof.text);
  assertNetworkLedger(receipt.sourceNetwork, []);
  const lifecycle = [receipt.committedRestart, ...receipt.terminations.slice(0, 2), receipt.activationAbortRestart, ...receipt.terminations.slice(2)];
  assertNetworkLedger(receipt.destinationNetwork, lifecycle);
  for (const event of lifecycle) {
    const paused = receipt.destinationNetwork.observations.filter(value => value.point === 'paused-before-stop' && value.lifetime === event.beforeLifetime);
    assert.equal(paused.length, 1); assert.deepEqual(event.pausedNetwork, paused[0]);
  }
  assert.equal(Object.keys(receipt.productionHashes).length, 6);
  assert.ok(Object.values(receipt.productionHashes).every(value => /^[a-f0-9]{64}$/.test(value)));
  return receipt;
}
