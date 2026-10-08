import assert from 'node:assert/strict';
import {assertWorkerLifecycle,assertNetworkLedger} from './proof-oracles.mjs';

// Frozen whole-case scope; this is optional synthetic local closure, never an
// account/provider qualification or complete device recovery certificate.
export const SOURCE_APPEND_CASES=Object.freeze([
  "actual second capture appends to the bootstrap document with required complete outbox",
  "real append publication preserves shared document, exact baseline and both Working edit directions",
  "concurrent distinct new messages commute without overwriting old Working history or human document fields",
  "every incomplete/generic/applyPending append is rejected without any writes",
  "producer and remote canonical/outbox exceptions roll back the full transaction",
  "append anchor requires all committed receipts, current heads and retained baseline even while document remains",
  "same Source identity concurrent captures conflict rather than silently dedupe",
  "replay after new Source deletion cannot resurrect it",
  "resealed invalid Source formation and baseline bindings reject complete closure",
  "different valid append members cannot be spliced into another descriptor",
  "canonical refresh cannot overwrite human document fields inside append",
  "restore and permission changes during async closure validation cannot admit old append",
  "concurrent local document edit during receive qualification rejects without clobbering edit",
  "local producer before publication has committed anchor proof and remote no-outbox anchor also works",
  "real capture exclusion and Source tombstones reject append at producer and receiver",
  "no-op unknown ACK recapture cannot produce a second append identity",
  "partial committed append receipt is not a duplicate success",
  "capture dispatch cannot rebind its original request to a changed valid namespace after the first read"
]);
export const SOURCE_APPEND_PATHS=Object.freeze([
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
  "core/smart-filter-store.js"
]);
export function assertSourceAppendReceipt(receipt,{head,tree,variant}){
 assert.match(head,/^[a-f0-9]{40}$/);assert.match(tree,/^[a-f0-9]{40}$/);assert.ok(['source','release'].includes(variant));
 assert.equal(receipt.schema,1);assert.equal(receipt.head,head);assert.equal(receipt.tree,tree);assert.equal(receipt.variant,variant);assert.equal(receipt.result,'PASS');
 assert.equal(receipt.scope,'optional-local-existing-ChatGPT-conversation-Source-append');assert.equal(receipt.productionActivation,false);assert.equal(receipt.remoteMaterializer,true);assert.equal(receipt.fullRecovery,false);
 assert.deepEqual(receipt.cases,SOURCE_APPEND_CASES);
 assert.deepEqual(Object.keys(receipt.hashes).sort(),[...SOURCE_APPEND_PATHS].sort());for(const hash of Object.values(receipt.hashes))assert.match(hash,/^[a-f0-9]{64}$/);
 assert.match(receipt.browserVersion,/^\d+\./);
 assert.equal(receipt.isolation.nativeFactory,true);assert.equal(receipt.isolation.networkAttempts,0);assert.equal(receipt.isolation.httpRequests,0);
 assert.equal(receipt.restart.phase.name,'restart-boundary');assert.equal(receipt.restart.phase.hasNativeTransaction,false);
 assertWorkerLifecycle(receipt.restart);assertNetworkLedger(receipt.isolation.networkLedger,[receipt.restart]);
 const paused=receipt.isolation.networkLedger.observations.filter(row=>row.point==='paused-before-stop'&&row.lifetime===receipt.restart.beforeLifetime);assert.equal(paused.length,1);assert.deepEqual(receipt.restart.pausedNetwork,paused[0]);
 return receipt;
}
