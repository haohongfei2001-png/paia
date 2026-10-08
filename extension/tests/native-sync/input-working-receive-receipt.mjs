import assert from 'node:assert/strict';
import {assertWorkerLifecycle,assertNetworkLedger} from './proof-oracles.mjs';

// Explicit local module integration only; never a production Sync/restore certificate.
export const INPUT_WORKING_RECEIVE_CASES=Object.freeze([
  "actual Working publication contains a required portable complete logical commit",
  "actual publication decode applies complete Working atomically without echo and replays after receiver recreation",
  "each incomplete member and generic receive route refuses without canonical or protocol acknowledgement",
  "second real edit coalesces history using stable local mapping and preserves wire history",
  "exception after canonical writes rolls back whole closure, receipts and frontiers",
  "two valid logical commits cannot lend members to one another",
  "current permission prevents entire remote closure with no derived Keep leakage",
  "current localEdit prevents entire remote closure with no derived Keep leakage",
  "current source prevents entire remote closure with no derived Keep leakage",
  "current restore prevents entire remote closure with no derived Keep leakage",
  "local history counter is allocated independently and coalescing never imports sender sequence",
  "legacy Keep head cannot be bypassed by enabling wrapped publication",
  "old complete acknowledgement replays after a later legitimate receive without reverting current Working",
  "a resealed descriptor cannot omit an existing baseline while retaining a matching final after body",
  "receive then real local wrapped edit can return to original producer and accept its next descendant",
  "same Source identity with a different valid content snapshot cannot qualify the remote commit",
  "malformed source descriptors reject typed without protocol or canonical writes"
]);
export const INPUT_WORKING_RECEIVE_PATHS=Object.freeze([
  "core/browser-native-sync/core.js",
  "core/browser-native-sync/codecs.js",
  "core/browser-native-sync/input-working-journal.js",
  "core/browser-native-sync/input-working-commit.js",
  "core/browser-native-sync/filter-intent-journal.js",
  "core/ia-store.js",
  "core/smart-filter-store.js"
]);
export function assertInputWorkingReceiveReceipt(receipt,{head,tree,variant}){
 assert.match(head,/^[a-f0-9]{40}$/);assert.match(tree,/^[a-f0-9]{40}$/);assert.ok(['source','release'].includes(variant));
 assert.equal(receipt.schema,1);assert.equal(receipt.head,head);assert.equal(receipt.tree,tree);assert.equal(receipt.variant,variant);assert.equal(receipt.result,'PASS');
 assert.equal(receipt.scope,'optional-local-Input-Working-receive');assert.equal(receipt.productionActivation,false);assert.equal(receipt.remoteMaterializer,true);assert.equal(receipt.fullRecovery,false);
 assert.deepEqual(receipt.cases,INPUT_WORKING_RECEIVE_CASES);
 assert.deepEqual(Object.keys(receipt.hashes).sort(),[...INPUT_WORKING_RECEIVE_PATHS].sort());for(const hash of Object.values(receipt.hashes))assert.match(hash,/^[a-f0-9]{64}$/);
 assert.match(receipt.browserVersion,/^\d+\./);
 assert.equal(receipt.isolation.nativeFactory,true);assert.equal(receipt.isolation.networkAttempts,0);assert.equal(receipt.isolation.httpRequests,0);
 assert.equal(receipt.restart.phase.name,'restart-boundary');assert.equal(receipt.restart.phase.hasNativeTransaction,false);
 assertWorkerLifecycle(receipt.restart);assertNetworkLedger(receipt.isolation.networkLedger,[receipt.restart]);
 const paused=receipt.isolation.networkLedger.observations.filter(row=>row.point==='paused-before-stop'&&row.lifetime===receipt.restart.beforeLifetime);assert.equal(paused.length,1);assert.deepEqual(receipt.restart.pausedNetwork,paused[0]);
 return receipt;
}
