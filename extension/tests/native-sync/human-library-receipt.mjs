import assert from 'node:assert/strict';
import {assertWorkerLifecycle,assertNetworkLedger} from './proof-oracles.mjs';
// Evidence validation only: the caller must supply freshly read checkout byte hashes.
export const HUMAN_LIBRARY_PATHS=Object.freeze([
  "core/idb-repository.js",
  "core/ia-store.js",
  "core/thought-store.js",
  "core/thought-model.js",
  "core/thought-journal.js",
  "core/library-documents-store.js",
  "core/thought-organization.js",
  "core/topic-governance.js",
  "core/topic-identity.js",
  "core/topic-intent.js",
  "core/thought-read-index.js",
  "core/library-search.js",
  "core/browser-native-sync/core.js",
  "core/browser-native-sync/codecs.js",
  "core/browser-native-sync/human-library-plan.js",
  "core/browser-native-sync/human-library-allocation.js",
  "core/browser-native-sync/human-library-identity.js",
  "core/browser-native-sync/human-library-codec.js",
  "core/browser-native-sync/human-library-journal.js",
  "core/browser-native-sync/human-library-request.js",
  "core/browser-native-sync/human-library-group.js",
  "core/browser-native-sync/human-library-scope.js",
  "core/browser-native-sync/publications.js",
  "core/browser-native-sync/segments.js",
  "core/browser-native-sync/group-checkpoint-plan.js",
  "core/browser-native-sync/group-checkpoint-scope.js",
  "core/browser-native-sync/group-checkpoint.js",
  "core/browser-native-sync/human-library-search-proof.js"
]);
export const HUMAN_LIBRARY_CASE_NAMES=Object.freeze([
  "real bound create/edit/lifecycle owners publish required members through original segments and duplicate ACK adds nothing",
  "actual owner and its outbox roll back together after protocol write failure",
  "real bound named Topic/Section/placement/move/fixed/remove/restore/identity consumers remain atomic",
  "private receiver replays actual owners across installation keys and local sequences, preserves coalesced history, duplicate after edit is zero write",
  "partial/swapped/semantic tampered/local-counter tampered groups and invalid options refuse with all actual stores unchanged",
  "remote actual canonical/domain history/Core/mapping writes all roll back on final ACK failure; prepared owner edit refuses",
  "one global 128-operation ancestry budget includes every parent commit and its member closure before producer writes",
  "actual receiver can edit and republish to original producer despite different physical sequences",
  "current grouped checkpoint refuses an unjournaled human edit before publication with every store unchanged",
  "private prepared receiver refuses a real intervening canonical owner change and an unbound capability before any ACK",
  "all nine actual sender/receiver absent, building and completed index pairs preserve semantic history and use only receiver derived allocations",
  "unknown, missing, reordered, reclassified, mismatched counts and wrong touch anchors refuse before any canonical or protocol write",
  "real move touches both original index owners in order; different local branches retain complete metadata and failure rolls back every store",
  "actual known-Human pre-role Core and codec bytes reject the new required descriptor and full group with zero store writes",
  "actual complete Human graph checkpoint replays original Topic/default/named Section, Entry coalescing and membership owners on an empty installation in one transaction",
  "actual owner, Core, physical mapping and pointer activation faults leave the entire staged receiver installation unchanged",
  "actual mixed Human, Source and Working checkpoint preserves both owners and counters; a later Source fault rolls earlier Human writes back",
  "real canonical wire restores both legal Topic edit key orders and Entry field-revision order without changing original receipt digests",
  "a cryptographically resealed order mutation cannot change original meaning, history or owner receipt; every store remains unchanged",
  "original indexed sender edit receives without transmitting completion; receiver indexed=false",
  "original indexed sender edit receives without transmitting completion; receiver indexed=true",
  "actual search-only race after prepare refuses the whole journal transaction without canonical/outbox changes",
  "incoming Topic history cannot carry sender-local indexed completion, including nested identity leaves",
  "resealed remote completion tag refuses before original receive and leaves every store unchanged"
]);
const shape=(value,required,optional=[])=>{assert.ok(value&&typeof value==='object'&&!Array.isArray(value));assert.deepEqual(Object.keys(value).filter(key=>!optional.includes(key)).sort(),[...required].sort());};
const hashMap=value=>{shape(value,HUMAN_LIBRARY_PATHS);for(const hash of Object.values(value))assert.match(hash,/^[a-f0-9]{64}$/);};
const databases=value=>{assert.ok(Array.isArray(value)&&value.length>0&&value.length<=100);assert.equal(new Set(value).size,value.length);for(const name of value)assert.ok(typeof name==='string'&&/^(?:paia-archive|bns-human-[A-Za-z0-9-]{1,80})$/.test(name));};
export function assertHumanLibraryReceipt(r,{head,tree,variant,expectedHashes}){
 assert.match(head,/^[a-f0-9]{40}$/);assert.match(tree,/^[a-f0-9]{40}$/);assert.ok(['source','release'].includes(variant));hashMap(expectedHashes);
 shape(r,['schema','head','tree','variant','scope','result','productionActivation','fullRecovery','groupCheckpointImplemented','derivedProjectionRecovery','browserVersion','cases','hashes','restart','durable','groupRestart','groupDurable','isolation']);
 assert.equal(r.schema,1);assert.equal(r.head,head);assert.equal(r.tree,tree);assert.equal(r.variant,variant);assert.equal(r.result,'PASS');
 assert.equal(r.scope,'private-local-human-named-owners-and-bounded-partial-grouped-recovery');assert.equal(r.productionActivation,false);assert.equal(r.fullRecovery,false);assert.equal(r.groupCheckpointImplemented,true);assert.equal(r.derivedProjectionRecovery,false);
 assert.deepEqual(r.cases,HUMAN_LIBRARY_CASE_NAMES);assert.equal(new Set(r.cases).size,24);hashMap(r.hashes);assert.deepEqual(r.hashes,expectedHashes,'receipt bytes must match independently read current checkout');assert.match(r.browserVersion,/^\d+\.\d+\.\d+\.\d+$/);
 const restarts=[r.restart,r.groupRestart];assert.equal(r.restart.afterLifetime,r.groupRestart.beforeLifetime);
 for(const event of restarts){
  shape(event,['phase','pausedNetwork','beforeLifetime','afterLifetime','stopped','restarted','interruptedCall','completedNoopValue']);shape(event.phase,['name','lifetime','hasNativeTransaction','preparedOperation']);
  assert.equal(event.phase.name,'restart-boundary');assert.equal(event.phase.hasNativeTransaction,false);assert.equal(event.phase.preparedOperation,null);assert.equal(event.interruptedCall,'returned');assertWorkerLifecycle(event);
 }
 shape(r.durable,['duplicate','noEcho','history']);assert.deepEqual(r.durable,{duplicate:true,noEcho:true,history:2});
 shape(r.groupDurable,['duplicate','noEcho','allStoresPreserved','sections','coalescedEdits','history','active','entryRevision']);assert.ok(typeof r.groupDurable.active==='string'&&r.groupDurable.active.length>0&&r.groupDurable.active.length<=80);
 assert.deepEqual(r.groupDurable,{duplicate:true,noEcho:true,allStoresPreserved:true,sections:2,coalescedEdits:1,history:12,active:r.groupDurable.active,entryRevision:3});
 shape(r.isolation,['nativeFactory','networkAttempts','httpRequests','databases','networkLedger']);assert.equal(r.isolation.nativeFactory,true);assert.equal(r.isolation.networkAttempts,0);assert.equal(r.isolation.httpRequests,0);databases(r.isolation.databases);for(const name of ['paia-archive','bns-human-durable','bns-human-group-durable'])assert.ok(r.isolation.databases.includes(name));
 const ledger=r.isolation.networkLedger;shape(ledger,['observations','transitions','complete']);assert.equal(ledger.observations.length,8);assert.equal(ledger.transitions.length,2);
 for(const row of ledger.observations){shape(row,['lifetime','nativeFactory','networkAttempts','point'],['databases']);if(Object.hasOwn(row,'databases'))databases(row.databases);}
 for(const row of ledger.transitions)shape(row,['beforeLifetime','afterLifetime']);
 assert.deepEqual(ledger.observations.map(row=>row.point),['opened','before-stop','paused-before-stop','restarted','before-stop','paused-before-stop','restarted','final']);
 for(const event of restarts){const paused=ledger.observations.filter(row=>row.point==='paused-before-stop'&&row.lifetime===event.beforeLifetime);assert.equal(paused.length,1);assert.deepEqual(event.pausedNetwork,paused[0]);}
 assertNetworkLedger(ledger,restarts);return r;
}
