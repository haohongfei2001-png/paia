import assert from 'node:assert/strict';
import {assertWorkerLifecycle,assertNetworkLedger} from './proof-oracles.mjs';

// Frozen whole-case scope; this is optional synthetic local closure, never an
// account/provider qualification or complete device recovery certificate.
export const SOURCE_BOOTSTRAP_CASES=Object.freeze([
  "actual opt-in capture atomically publishes a complete required Source bootstrap",
  "real publication creates empty receiver Source and preserves exact baseline identity/time with local sequences",
  "actual A first Working edit follows bootstrap, roundtrips and coalesces without copied canonical rows",
  "actual B first Working edit follows bootstrap, roundtrips and coalesces without copied canonical rows",
  "incomplete, generic and applyPending bootstrap refuse with all stores unchanged",
  "receiver exception after Source/canonical writes rolls back every store and protocol receipt with no echo",
  "producer exception after outbox write rolls back canonical and protocol together",
  "actual initial time ledger survives publication exactly and does not substitute capture time for Source time",
  "committed duplicate capture, enrichment and multi-message bound requests refuse without half writes",
  "receive first-await permission race rejects without admitting protocol or canonical rows",
  "receive first-await restore race rejects without admitting protocol or canonical rows",
  "receive first-await namespace race rejects without admitting protocol or canonical rows",
  "re-sealed internally inconsistent Source time, document, and baseline closures reject every store atomically",
  "valid separate captures cannot lend members or descriptors to one another",
  "deleted Source cannot be recreated by exact acknowledged bootstrap replay",
  "old acknowledged bootstrap is refused after same-value restore epoch changes",
  "existing conversation or local capture is not silently merged into initial bootstrap scope",
  "malformed descriptor refs and unknown member fields reject as typed codec errors",
  "default null keeps ordinary capture duplicates and enrichment without bootstrap wire publication",
  "actual checkpoint staging refuses the required bootstrap family and cannot activate partial canonical Source",
  "canonical refresh mutation cannot slip into committed outbox despite a valid prepared Source plan",
  "Source ledger cannot carry a createTime inconsistent with its qualified response candidate",
  "actual DOM/response conflict and blocked time remain qualified, while fabricated empty or historical conflict ledgers refuse"
]);
export const SOURCE_BOOTSTRAP_PATHS=Object.freeze([
  "core/indexed-store.js",
  "core/ia-store.js",
  "core/source-initial.js",
  "core/browser-native-sync/core.js",
  "core/browser-native-sync/codecs.js",
  "core/browser-native-sync/source-bootstrap-codec.js",
  "core/browser-native-sync/source-bootstrap-plan.js",
  "core/browser-native-sync/source-bootstrap-journal.js",
  "core/browser-native-sync/source-bootstrap-receive.js",
  "core/browser-native-sync/input-working-journal.js",
  "core/browser-native-sync/input-working-commit.js",
  "core/browser-native-sync/filter-intent-journal.js",
  "core/smart-filter-store.js"
]);
export function assertSourceBootstrapReceipt(receipt,{head,tree,variant}){
 assert.match(head,/^[a-f0-9]{40}$/);assert.match(tree,/^[a-f0-9]{40}$/);assert.ok(['source','release'].includes(variant));
 assert.equal(receipt.schema,1);assert.equal(receipt.head,head);assert.equal(receipt.tree,tree);assert.equal(receipt.variant,variant);assert.equal(receipt.result,'PASS');
 assert.equal(receipt.scope,'optional-local-initial-ChatGPT-Source-bootstrap');assert.equal(receipt.productionActivation,false);assert.equal(receipt.remoteMaterializer,true);assert.equal(receipt.fullRecovery,false);
 assert.deepEqual(receipt.cases,SOURCE_BOOTSTRAP_CASES);
 assert.deepEqual(Object.keys(receipt.hashes).sort(),[...SOURCE_BOOTSTRAP_PATHS].sort());for(const hash of Object.values(receipt.hashes))assert.match(hash,/^[a-f0-9]{64}$/);
 assert.match(receipt.browserVersion,/^\d+\./);
 assert.equal(receipt.isolation.nativeFactory,true);assert.equal(receipt.isolation.networkAttempts,0);assert.equal(receipt.isolation.httpRequests,0);
 assert.equal(receipt.restart.phase.name,'restart-boundary');assert.equal(receipt.restart.phase.hasNativeTransaction,false);
 assertWorkerLifecycle(receipt.restart);assertNetworkLedger(receipt.isolation.networkLedger,[receipt.restart]);
 const paused=receipt.isolation.networkLedger.observations.filter(row=>row.point==='paused-before-stop'&&row.lifetime===receipt.restart.beforeLifetime);assert.equal(paused.length,1);assert.deepEqual(receipt.restart.pausedNetwork,paused[0]);
 return receipt;
}
