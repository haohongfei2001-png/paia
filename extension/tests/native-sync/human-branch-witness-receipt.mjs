import assert from 'node:assert/strict';
import {assertNetworkLedger} from './proof-oracles.mjs';
export const HUMAN_WITNESS_ORIGINAL_CASES=Object.freeze([
  "six exact parent semantic cases are readonly and mint no execution capability",
  "guard await cannot reopen a database closed after the settled-tail barrier",
  "all readiness flags, queued reset and failure state refuse without initializing",
  "only one capture or revalidation in flight; ninth witness revokes oldest",
  "foreign object identity and later counter/mapping/control changes revoke witness",
  "resealed semantic fields, actor, partial closure and hidden local index remain refused",
  "caller mutation cannot retarget capture and final pending control invalidates it",
  "aggregate raw retention evicts before the ninth handle for large valid closures",
  "complete causal union uses original global bounds including shared closure",
  "oversize incoming byte envelope refuses before a partial proof",
  "unjournaled current Entry and every current history phase refuse despite identical physical slots",
  "comparison raw cap leaves room for the fresh snapshot without widening protocol limits",
  "same-object control mutation after the final transaction refuses capture and revalidation",
  "shared parent receipt schema, result identity and operation sequence remain strict original guards"
]);
export const HUMAN_WITNESS_CASES=Object.freeze([...HUMAN_WITNESS_ORIGINAL_CASES,"native same-name reopened database and foreign Core or journal cannot reuse a witness","native revalidation refuses every readiness or failure flag without opening or writing"]);
// Call order is invocation order, including the first pending/busy pair.
// Derived from every original loop and the two additive native cases; failures
// are required observations, not successes inferred from a case name.
const repeat=(values,n)=>Array.from({length:n},()=>values).flat();
export const HUMAN_WITNESS_INVOCATIONS=Object.freeze([
 repeat(['capture:resolved','revalidate:resolved','revalidate:rejected'],6),
 ['capture:rejected'],repeat(['capture:rejected'],8),
 ['capture:resolved','capture:rejected',...repeat(['capture:resolved'],8),'revalidate:rejected','revalidate:resolved'],
 [...repeat(['capture:resolved','revalidate:rejected','revalidate:rejected'],4),'capture:resolved','revalidate:rejected'],
 repeat(['capture:rejected'],8),['capture:resolved','revalidate:resolved','capture:rejected'],
 [...repeat(['capture:resolved'],8),'revalidate:rejected','revalidate:resolved'],
 ['capture:resolved','revalidate:resolved','capture:rejected'],['capture:rejected'],
 repeat(['capture:rejected'],4),['capture:rejected'],['capture:rejected','capture:resolved','revalidate:rejected'],
 repeat(['capture:rejected'],5),
 ['capture:resolved','revalidate:rejected','revalidate:rejected','capture:resolved','revalidate:rejected','revalidate:rejected'],
 repeat(['capture:resolved','revalidate:rejected','revalidate:rejected'],8)
].map(Object.freeze));
// Complete static/literal module closure of the actual Store/Core/journal/plan roots.
export const HUMAN_WITNESS_PATHS=Object.freeze([
  'core/ai-organize-style-preference.js',
  'core/ai-usage/contracts.js',
  'core/ai-usage/delta.js',
  'core/ai-usage/semantic-invalidation.js',
  'core/archive-navigation-invalidation.js',
  'core/archive-query.js',
  'core/archive-removal.js',
  'core/backup-format.js',
  'core/browser-native-sync/checkpoints.js',
  'core/browser-native-sync/codecs.js',
  'core/browser-native-sync/context-desired-journal.js',
  'core/browser-native-sync/context-journal.js',
  'core/browser-native-sync/core.js',
  'core/browser-native-sync/filter-intent-journal.js',
  'core/browser-native-sync/group-checkpoint-plan.js',
  'core/browser-native-sync/group-checkpoint-scope.js',
  'core/browser-native-sync/group-checkpoint.js',
  'core/browser-native-sync/human-library-allocation.js',
  'core/browser-native-sync/human-library-codec.js',
  'core/browser-native-sync/human-library-group.js',
  'core/browser-native-sync/human-library-identity.js',
  'core/browser-native-sync/human-library-journal.js',
  'core/browser-native-sync/human-library-plan.js',
  'core/browser-native-sync/human-library-request.js',
  'core/browser-native-sync/human-library-scope.js',
  'core/browser-native-sync/human-library-search-proof.js',
  'core/browser-native-sync/human-qualification-budget.js',
  'core/browser-native-sync/input-working-commit.js',
  'core/browser-native-sync/input-working-inbox.js',
  'core/browser-native-sync/input-working-journal.js',
  'core/browser-native-sync/manual-owners.js',
  'core/browser-native-sync/manual-prompt-current-shape.js',
  'core/browser-native-sync/physical-key.js',
  'core/browser-native-sync/prompt-journal.js',
  'core/browser-native-sync/segments.js',
  'core/browser-native-sync/source-append-codec.js',
  'core/browser-native-sync/source-append-journal.js',
  'core/browser-native-sync/source-append-plan.js',
  'core/browser-native-sync/source-append-receive.js',
  'core/browser-native-sync/source-bootstrap-codec.js',
  'core/browser-native-sync/source-bootstrap-journal.js',
  'core/browser-native-sync/source-bootstrap-plan.js',
  'core/browser-native-sync/source-bootstrap-receive.js',
  'core/browser-native-sync/value.js',
  'core/constants.js',
  'core/context-cards.js',
  'core/context-item-lineage.js',
  'core/context-topic-access-policy.js',
  'core/context-topic-access.js',
  'core/context-topic-preferences.js',
  'core/context-topic-scope.js',
  'core/dedupe.js',
  'core/diagnostics.js',
  'core/historical-time.js',
  'core/ia-store.js',
  'core/idb-repository.js',
  'core/import/contract.js',
  'core/import/errors.js',
  'core/indexed-store.js',
  'core/input-search-cache.js',
  'core/library-counts.js',
  'core/library-documents-owner.js',
  'core/library-documents-store.js',
  'core/library-edit.js',
  'core/library-layout.js',
  'core/library-revisions.js',
  'core/library-search.js',
  'core/library.js',
  'core/memory/model.js',
  'core/memory/organization-guard.js',
  'core/memory/service.js',
  'core/operation-outcome.js',
  'core/organizer/ai-candidate.js',
  'core/organizer/ai-contract.js',
  'core/organizer/ai-incremental-v2.js',
  'core/organizer/ai-incremental-v3.js',
  'core/organizer/contracts.js',
  'core/organizer/expression-time.js',
  'core/organizer/organize-cache-qualification.js',
  'core/organizer/root-read.js',
  'core/organizer/topic-chronology.js',
  'core/organizer/topic-reading.js',
  'core/prompt-reuse-preferences.js',
  'core/qualified-input-search.js',
  'core/read-projection-keys.js',
  'core/reader-state.js',
  'core/record-time.js',
  'core/recovery-draft.js',
  'core/removed-placements.js',
  'core/search-ranking.js',
  'core/search-service.js',
  'core/shared-working-content.js',
  'core/smart-filter-store.js',
  'core/smart-filter.js',
  'core/source-initial.js',
  'core/source-purge-admission.js',
  'core/source-structure-backup.js',
  'core/source-structure-model.js',
  'core/source-structure-store.js',
  'core/source-time-resolver.js',
  'core/store.js',
  'core/thought-binding.js',
  'core/thought-evidence.js',
  'core/thought-history.js',
  'core/thought-journal.js',
  'core/thought-maintenance.js',
  'core/thought-migration.js',
  'core/thought-model.js',
  'core/thought-organization.js',
  'core/thought-read-index.js',
  'core/thought-schema.js',
  'core/thought-source-scope.js',
  'core/thought-store.js',
  'core/topic-actions.js',
  'core/topic-compatibility.js',
  'core/topic-governance.js',
  'core/topic-identity-backup.js',
  'core/topic-identity.js',
  'core/topic-intent.js',
  'core/topic-reading-order.js',
  'core/topic-reading-state.js',
  'core/validation.js',
  'core/workspace.js',
]);
export const HUMAN_WITNESS_PROOF_PATHS=Object.freeze([
 'tests/human-branch-semantic-witness.test.mjs','tests/native-sync/human-branch-witness-fixture.mjs','tests/native-sync/human-branch-witness-chrome.test.mjs','tests/native-sync/human-branch-witness-receipt.mjs','tests/native-sync/storage-harness.mjs','tests/native-sync/storage-worker-fixture.mjs','tests/native-sync/proof-oracles.mjs',
 'tests/native-sync/immutable-objects.mjs','tests/harness/fake-chatgpt.mjs','tests/harness/synthetic-device-options.mjs'
]);
const shape=(v,keys)=>{assert.ok(v&&typeof v==='object'&&!Array.isArray(v));assert.deepEqual(Object.keys(v).sort(),[...keys].sort());};
const hashMap=(v,paths,expected)=>{shape(v,paths);for(const h of Object.values(v))assert.match(h,/^[a-f0-9]{64}$/);shape(expected,paths);assert.deepEqual(v,expected,'fresh exact checkout hashes required');};
export function assertHumanBranchWitnessReceipt(r,{head,tree,variant,expectedHashes,expectedProofHashes}){
 shape(r,['schema','head','tree','variant','scope','result','productionActivation','retentionImplemented','writeCapability','fullRecovery','providerActivation','browserVersion','cases','hashes','proofHashes','isolation']);
 assert.match(head,/^[a-f0-9]{40}$/);assert.match(tree,/^[a-f0-9]{40}$/);assert.ok(['source','release'].includes(variant));assert.equal(r.schema,1);assert.equal(r.head,head);assert.equal(r.tree,tree);assert.equal(r.variant,variant);assert.equal(r.result,'PASS');assert.equal(r.scope,'private-readonly-human-branch-semantic-witness');
 for(const key of ['productionActivation','writeCapability','fullRecovery','providerActivation'])assert.equal(r[key],false);assert.equal(r.retentionImplemented,true);assert.match(r.browserVersion,/^\d+\.\d+\.\d+\.\d+$/);
 hashMap(r.hashes,HUMAN_WITNESS_PATHS,expectedHashes);hashMap(r.proofHashes,HUMAN_WITNESS_PROOF_PATHS,expectedProofHashes);
 assert.ok(Array.isArray(r.cases));assert.deepEqual(r.cases.map(c=>c.name),HUMAN_WITNESS_CASES);let count=0,acceptedCapture=0,acceptedRevalidate=0;
 for(const [index,c]of r.cases.entries()){
  shape(c,['name','observations']);assert.ok(Array.isArray(c.observations));assert.deepEqual(c.observations.map(o=>o.kind+':'+o.result),HUMAN_WITNESS_INVOCATIONS[index],'exact original positive/negative invocation order');
  for(const o of c.observations){count++;shape(o,['caseIndex','kind','result','code','transactions','nonNativeTransactions','readwriteTransactions','foreignTransactions','writes','factoryOpens','initializations','controlWrites','storeNative','factoryNative','databaseNative','repositoryMatches','journalMatches']);assert.equal(o.caseIndex,index);assert.ok(['capture','revalidate'].includes(o.kind));assert.ok(['resolved','rejected'].includes(o.result));assert.ok(Number.isSafeInteger(o.transactions)&&o.transactions>=0);
   for(const key of ['nonNativeTransactions','readwriteTransactions','foreignTransactions','writes','factoryOpens','initializations','controlWrites'])assert.equal(o[key],0);
   for(const key of ['storeNative','factoryNative','databaseNative','repositoryMatches','journalMatches'])assert.equal(typeof o[key],'boolean');assert.equal(o.storeNative,true);assert.equal(o.factoryNative,true);
   if(o.result==='resolved'){assert.equal(o.code,null);for(const key of ['databaseNative','repositoryMatches','journalMatches'])assert.equal(o[key],true);assert.ok(o.transactions>=(o.kind==='capture'?2:1));if(o.kind==='capture')acceptedCapture++;else acceptedRevalidate++;}
   else assert.ok(typeof o.code==='string'&&o.code.length>0&&o.code.length<=80);
  }
 }
 assert.equal(count,121);assert.ok(acceptedCapture>=6);assert.ok(acceptedRevalidate>=6);
 shape(r.isolation,['nativeFactory','networkAttempts','httpRequests','databases','networkLedger']);assert.equal(r.isolation.nativeFactory,true);assert.equal(r.isolation.networkAttempts,0);assert.equal(r.isolation.httpRequests,0);assert.ok(Array.isArray(r.isolation.databases)&&r.isolation.databases.length>1&&r.isolation.databases.length<=128);assert.equal(new Set(r.isolation.databases).size,r.isolation.databases.length);assert.ok(r.isolation.databases.some(n=>n.startsWith('bns-human-witness-')));for(const n of r.isolation.databases)assert.ok(n==='paia-archive'||/^bns-human-witness-\d+$/.test(n));
 const ledger=r.isolation.networkLedger;shape(ledger,['observations','transitions','complete']);for(const o of ledger.observations)shape(o,['lifetime','nativeFactory','networkAttempts','databases','point']);
 assertNetworkLedger(ledger,[]);assert.equal(r.isolation.networkLedger.observations.length,2);assert.deepEqual(r.isolation.networkLedger.observations.map(x=>x.point),['opened','final']);return r;
}
