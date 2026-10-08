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

export function assertReceipt(receipt, {head, variant, requiredFilterIntent=false}) {
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
  if(requiredFilterIntent)assert.ok(receipt.filterIntentRestart,'current Keep receipt requires its real restart');
  if(receipt.filterIntentRestart){
    assertWorkerLifecycle(receipt.filterIntentRestart);lifecycle.push(receipt.filterIntentRestart);
    assert.equal(receipt.filterIntentCases.length,23);assert.equal(new Set(receipt.filterIntentCases).size,23);
    assert.deepEqual(Object.keys(receipt.filterIntentHashes).sort(),['core/browser-native-sync/codecs.js','core/browser-native-sync/filter-intent-journal.js','core/smart-filter-store.js']);
    assert.ok(Object.values(receipt.filterIntentHashes).every(value=>/^[a-f0-9]{64}$/.test(value)));
  }
  assertNetworkLedger(receipt.destinationNetwork, lifecycle);
  for (const event of lifecycle) {
    const paused = receipt.destinationNetwork.observations.filter(value => value.point === 'paused-before-stop' && value.lifetime === event.beforeLifetime);
    assert.equal(paused.length, 1); assert.deepEqual(event.pausedNetwork, paused[0]);
  }
  assert.equal(Object.keys(receipt.productionHashes).length, 6);
  assert.ok(Object.values(receipt.productionHashes).every(value => /^[a-f0-9]{64}$/.test(value)));
  return receipt;
}

// Optional local Working owner only: this receipt cannot certify remote restore.
export const INPUT_WORKING_PATHS=Object.freeze(['core/indexed-store.js','core/ia-store.js','core/smart-filter-store.js','core/browser-native-sync/input-working-journal.js','core/browser-native-sync/filter-intent-journal.js','core/browser-native-sync/codecs.js']);
export const INPUT_WORKING_CASES=Object.freeze(["actual single Input human edit requires an atomic portable Working head", "optional Working binding must compose with actual Keep protection without bypassing its owner", "note-only edit preserves the canonical content-revision and paired protocol semantics", "lost acknowledgement replay returns the durable receipt without new history or outbox", "second human edit advances one existing Input head and preserves revision coalescing", "failure after protocol writes rolls back canonical edits, protection, history and receipts together", "unsupported title remains fail closed with no canonical or protocol writes", "unsupported removal remains fail closed with no canonical or protocol writes", "unsupported multiple remains fail closed with no canonical or protocol writes", "a canonical edit after preparation invalidates all prepared journal writes", "referenced Input refuses the incomplete Working-only bundle without losing Thought dependencies", "aged history requires a future retirement bundle and is not silently republished or pruned", "clock crossing the retention boundary after preparation cannot prune unretired history", "bound explicit history pruning refuses missing retirement support without deleting data"]);
export function assertInputWorkingReceipt(receipt,{head,tree,variant}){
 assert.match(head,/^[a-f0-9]{40}$/);assert.match(tree,/^[a-f0-9]{40}$/);assert.ok(['source','release'].includes(variant));
 assert.equal(receipt.schema,1);assert.equal(receipt.head,head);assert.equal(receipt.tree,tree);assert.equal(receipt.variant,variant);assert.equal(receipt.result,'PASS');
 assert.equal(receipt.scope,'optional-local-Input-Working-publication');
 for(const field of ['productionActivation','remoteMaterializer','fullRecovery'])assert.equal(receipt[field],false);
 assert.deepEqual(receipt.cases,INPUT_WORKING_CASES);
 assert.deepEqual(Object.keys(receipt.hashes).sort(),[...INPUT_WORKING_PATHS].sort());for(const value of Object.values(receipt.hashes))assert.match(value,/^[a-f0-9]{64}$/);
 assert.match(receipt.browserVersion,/^\d+\./);
 assert.equal(receipt.isolation.nativeFactory,true);assert.equal(receipt.isolation.networkAttempts,0);assert.equal(receipt.isolation.httpRequests,0);
 assert.equal(receipt.restart.phase.name,'restart-boundary');assert.equal(receipt.restart.phase.hasNativeTransaction,false);
 assertWorkerLifecycle(receipt.restart);assertNetworkLedger(receipt.isolation.networkLedger,[receipt.restart]);
 const paused=receipt.isolation.networkLedger.observations.filter(value=>value.point==='paused-before-stop'&&value.lifetime===receipt.restart.beforeLifetime);assert.equal(paused.length,1);assert.deepEqual(receipt.restart.pausedNetwork,paused[0]);
 return receipt;
}
