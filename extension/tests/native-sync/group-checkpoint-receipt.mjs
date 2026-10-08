import assert from 'node:assert/strict';
import {assertWorkerLifecycle,assertNetworkLedger} from './proof-oracles.mjs';
// Frozen bounded local owner proof; no account or full-library recovery claim.
export const GROUP_CHECKPOINT_CASES=Object.freeze([
  "grouped checkpoint restores actual journaled Source into an empty target atomically",
  "complete admitted portfolio activates Source append, Working history, manual Prompt and all manual cards together",
  "failure at applied-group rolls every canonical row, protocol row and active pointer back",
  "failure at before-activation rolls every canonical row, protocol row and active pointer back",
  "failure at after-activation rolls every canonical row, protocol row and active pointer back",
  "prepared grouped activation rejects local-capture without clobbering the new state",
  "prepared grouped activation rejects restore-epoch without clobbering the new state",
  "prepared grouped activation rejects permission without clobbering the new state",
  "prepared grouped activation rejects namespace without clobbering the new state",
  "existing unjournaled Source and existing manual content block construction or target activation",
  "unknown activation acknowledgement after restart is idempotent but cannot cross a subsequent restore epoch",
  "successor full-scope manifest binds an exact tail and rejects proofless/missing/extra operations",
  "same-value restore during first object fetch cannot bind stale checkpoint content to a new epoch",
  "bounded cleanup preserves active replay and exact no-op ACK, while abandoned partial stage cannot activate",
  "exact128 retained operations restore, the129th refuses, and bounded transaction work is measured",
  "producer scope requires committed protocol receipts, not matching canonical bytes plus a retained revision alone",
  "final transport publication cannot advertise stale document inventory",
  "final transport publication cannot advertise stale Prompt inventory",
  "final transport publication cannot advertise stale Context inventory",
  "final transport publication rechecks receipt proof even without a generation change"
]);
export const GROUP_CHECKPOINT_PATHS=Object.freeze([
  "core/indexed-store.js",
  "core/ia-store.js",
  "core/source-initial.js",
  "core/browser-native-sync/core.js",
  "core/browser-native-sync/codecs.js",
  "core/browser-native-sync/source-bootstrap-codec.js",
  "core/browser-native-sync/source-bootstrap-plan.js",
  "core/browser-native-sync/source-bootstrap-journal.js",
  "core/browser-native-sync/source-bootstrap-receive.js",
  "core/browser-native-sync/source-append-codec.js",
  "core/browser-native-sync/source-append-plan.js",
  "core/browser-native-sync/source-append-journal.js",
  "core/browser-native-sync/source-append-receive.js",
  "core/browser-native-sync/input-working-journal.js",
  "core/browser-native-sync/input-working-commit.js",
  "core/browser-native-sync/filter-intent-journal.js",
  "core/smart-filter-store.js",
  "core/browser-native-sync/checkpoints.js",
  "core/browser-native-sync/group-checkpoint.js",
  "core/browser-native-sync/group-checkpoint-plan.js",
  "core/browser-native-sync/group-checkpoint-scope.js",
  "core/browser-native-sync/manual-owners.js",
  "core/browser-native-sync/prompt-journal.js",
  "core/browser-native-sync/context-journal.js",
  "core/browser-native-sync/context-desired-journal.js",
  "core/context-cards.js",
  "core/prompt-reuse-preferences.js",
  "core/library.js",
  "core/workspace.js"
]);
export function assertGroupCheckpointReceipt(r,{head,tree,variant}){
 assert.match(head,/^[a-f0-9]{40}$/);assert.match(tree,/^[a-f0-9]{40}$/);assert.ok(['source','release'].includes(variant));
 assert.equal(r.schema,1);assert.equal(r.head,head);assert.equal(r.tree,tree);assert.equal(r.variant,variant);assert.equal(r.result,'PASS');
 assert.equal(r.scope,'optional-local-bounded-admitted-groups-checkpoint-activation');assert.equal(r.productionActivation,false);assert.equal(r.remoteMaterializer,true);assert.equal(r.fullRecovery,false);assert.equal(r.scopeComplete,true);assert.equal(r.providerActivation,false);
 assert.equal(r.maximumReplayOperations,128);assert.equal(r.maximumReplayBytes,4194304);assert.deepEqual(r.cases,GROUP_CHECKPOINT_CASES);
 assert.deepEqual(Object.keys(r.hashes).sort(),[...GROUP_CHECKPOINT_PATHS].sort());for(const hash of Object.values(r.hashes))assert.match(hash,/^[a-f0-9]{64}$/);assert.match(r.browserVersion,/^\d+\./);
 assert.equal(r.capacity.length,1);const c=r.capacity[0];assert.equal(c.operations,128);for(const key of ['reads','writes'])assert.ok(Number.isSafeInteger(c[key])&&c[key]>0);assert.ok(Number.isFinite(c.activationMs)&&c.activationMs>=0);
 assert.equal(r.restarts.length,2);assert.equal(r.restarts[0].afterLifetime,r.restarts[1].beforeLifetime);
 assert.equal(r.isolation.nativeFactory,true);assert.equal(r.isolation.networkAttempts,0);assert.equal(r.isolation.httpRequests,0);
 for(const event of r.restarts){assert.equal(event.phase.name,'restart-boundary');assert.equal(event.phase.hasNativeTransaction,false);assertWorkerLifecycle(event);const paused=r.isolation.networkLedger.observations.filter(x=>x.point==='paused-before-stop'&&x.lifetime===event.beforeLifetime);assert.equal(paused.length,1);assert.deepEqual(event.pausedNetwork,paused[0]);}
 assertNetworkLedger(r.isolation.networkLedger,r.restarts);
 assert.equal(typeof r.outcome.active,'string');assert.ok(r.outcome.active.length>0);assert.deepEqual(r.outcome,{atomic:true,duplicate:true,noEcho:true,active:r.outcome.active});return r;
}
