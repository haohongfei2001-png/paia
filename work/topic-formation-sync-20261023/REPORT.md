# Existing Topic Formation reactivation Sync — 2026-10-23

This package makes a finite existing-owner journey executable: a legally existing dormant Topic is reactivated by the original Formation service with its existing single Entry and unchanged placement; the original important history, operation receipt, and a new typed Sync event commit atomically. A receiver with that same lawful base repeats the original owner under its own current genuine Topic processing authority. Independent inactivity can subsequently reference the settled Formation event. The tested chain is inactivity → Formation → inactivity → Formation on A and on cold B.

No Topic, Entry, Section, Source, processing authority, background scheduler, default policy, real model, or account integration is created by this package. Cold B is initialized using the original Backup restore, not a fictitious Topic bootstrap. This is not a complete Topic checkpoint graph/export profile or a claim that all Sync is finished.

## Exact implementation and integration

Base: `1114ffe490c3db6bc918c30f81138aca69d886c6`. Five runtime paths belong to this feature:

- `extension/core/topic-formation.js`: private original-service/plan capability, before/inside/after hooks, original lifecycle timestamp and bounded-prune opt-in. Default behavior without explicit journal remains the original owner. Sync binding rejects a custom `writeTransaction` delegate: that separate installed-owner interface is not sufficient proof of first-query work-budget registration.
- `extension/core/browser-native-sync/topic-formation-codec.js`: strict bodyfree `topicFormation` event schema, original policy metadata, explicit allocation events and exact original result. It cannot carry a new label/body or a caller-selected arbitrary write set.
- `extension/core/browser-native-sync/topic-formation-journal.js`: explicit original-service binding, original prepare/commit replay, same-TX protocol/outbox and original domain settlement, receipt/history/causal terminal proofs, duplicate and lost-return handling, and private receive claim before the first async validation.
- `extension/core/browser-native-sync/topic-activity-codec.js`: optional `reactivationRevision` only with one previous activity parent; first-event old schema remains unchanged.
- `extension/core/browser-native-sync/topic-activity-journal.js`: exact prior activity, current Formation and settlement proofs; no generic relaxation of activity parents or human lifecycle locks.

The two shared Core/codec file edits are provided separately in `core-codecs-integration.patch`. They register the schema, restrict the activity actor to the two explicit families, and require the private original Formation TX capability at apply. Root should apply these exact edits against its newer shared files, retaining other agents' changes. The source vector includes the exact combination actually executed. The main feature commit intentionally does not replace shared Core/codecs wholesale.

The new test is `extension/tests/topic-formation-sync.test.mjs`. Original Formation `prepare`/`commit` is exercised, not a test-owned substitute writer. Reactivation and receiving tests use an actual `TopicProcessingAuthority`, a private receipt issuer, the same scope work budget, fixed epoch/expiry, and real revocation. Initial synthetic base creation also reuses the existing Formation fixture. The typed event is not an authority token. The receiver independently re-evaluates its current owner plan and requires equality with the admitted finite event.

## Portable history versus exact physical local history

`portableHistory` copies the original logical important journal row and removes exactly these properties at exactly two direct locations, `before` and `after`: `searchVersion`, `countVersion`, `updatedAt`, `updatedSequence`, `negativeUpdatedSequence`. It does not recurse through arbitrary same-named keys.

Why these fields differ legitimately:

- Original `LibraryDocumentsStore.libraryOperationInTransaction` (`library-documents-owner.js`) processes the lifecycle result, calls `queueSearch`, and calls original `touchTopic`.
- Original `touchTopic` passes `humanClock(this,t)` and `nextSequence(t)` to `planHumanTopicTouch` (`thought-store-owner.js`), which assigns `updatedAt`, `negativeUpdatedSequence`, and increments `countVersion`. Thus the original inactivity receiver has a local physical touch time/sequence after the shared semantic lifecycle intent. The typed inactivity timestamp is not that local touch clock.
- Original Backup restoration rebuilds Topic `countVersion` and search-derived state. It does not promise sender physical index versions on B.

No body, name, identity lifecycle intent clock, protection, source identity, revision, organization revision, history `at`/`windowStartedAt`, kind, owner, operation ID, or other semantic field is removed from this commitment. The important history ID is the exact allocated UUID; native sequence and its two index locators are checked against the original local row. Local sequence is not falsely claimed globally identical across different databases.

Every local transaction still validates the **entire** expected important history row and all actual original before-put domain write intents, including those five fields, plus selected-history rows/count and total revision count. Only the portable cross-device commitment omits those physical projections. A changed historical label and missing history both fail duplicate settlement. An extra selected history row or modification of a prior selected row at the end of the transaction aborts all writes.

## Budget and failure semantics

The original default `foundationWrite` receives the original work-limit object, registering the private repository meter before its first execution-TX query. `beginOriginalFormationSync` can only tighten that limit with remaining time. Existing Foundation initialization and earlier original processing reads are separate operations; the package does not call them part of the execution-TX physical meter. They keep the existing original processing/scope bounds.

Execution keeps 4096 references / 2 MiB / 30 seconds. Protocol and retained domain material are additionally bounded. No limit is raised. Three original owner collection queries (`dependencies.byTarget`, `provenance.byOwner`, `placements.byEntry`) are paged through the original repository in batches of at most 100; their indexes contain the owner row identity, so the cursor cannot skip equal-index rows. Other large queries retain their original refusal. Original revision pruning uses its existing explicit bounded path and unchanged retention/deletion rules. No native repository budget code is changed.

Original owner intent is captured before each actual put/delete, not sampled after a possible mutation. Original Source/member/processing final fences remain independent. Protocol head/revision/receipt/sequence/entityRevision/frontier/generation/device/outbox and typed marker are bound to the operation; missing pending/quarantine state remains missing. Received events do not echo to the local outbox. Unknown postcommit return is resolved only by validating durable original and typed receipts and important history; there is no automatic blind retry.

The concurrent-receive test found an actual bug: two validators could share the service-keyed `incoming` slot; one call cleared it while another owner was running, causing a local event rather than the expected remote revision. The new private `receiving` claim is established before any await and released in `finally`; close and unrelated commit cannot discard it. The exact two-call failure remains in `concurrent-before.tap` (0/1); final complete owning passes it.

## Validation evidence

Node v22.23.3, macOS arm64, repository fake-indexeddb. No browser/native, build, cloud, installation, external network, real provider, or paid model was executed.

1. `owning-final.tap`: ten complete owning files, **152/152**, exit 0, no fail/cancel/skip/todo, 32329.904125 ms. This precedes the final concurrent-receive and custom-delegate guards.
2. `reviewed-final.tap`: the complete final new owning file, **26/26**, exit 0, no fail/cancel/skip/todo, 5300.039667 ms. This is final-source evidence; do not combine both runs into one final 178-test invocation.

The ten-file command was:

```
<absolute Node22 path from execution.json> --test --test-concurrency=1 \
 extension/tests/topic-formation-sync.test.mjs \
 extension/tests/topic-activity-sync.test.mjs \
 extension/tests/topic-activity-human-restore-sync.test.mjs \
 extension/tests/cpv1-topic-03-formation.test.mjs \
 extension/tests/cpv1-topic-03-organization.test.mjs \
 extension/tests/cpv1-topic-03-adversarial.test.mjs \
 extension/tests/cpv1-topic-03-atomic.test.mjs \
 extension/tests/cpv1-topic-03-lineage.test.mjs \
 extension/tests/ai-topic-formation-membership-publication.test.mjs \
 extension/tests/ai-topic-formation-terminal.test.mjs
```

Final command uses the same absolute Node path, `--test --test-concurrency=1 extension/tests/topic-formation-sync.test.mjs`.

Original failures are preserved, not overwritten: wrong raw work-limit shape; original large-query budget refusal; test module path error; request property-order digest mismatch; missing original index reconstruction on restored B; actual duplicate-history omission; missing original queue-search version in expected history; portable Backup index version differences; receiver-local touch time differences; concurrent receive actual state corruption. Diagnostic logs show field names only. Small corrective runs are separate logs, not substitutes for the complete owning runs.

`SOURCE-SHA256.json` records exact final file bytes, blobs and base blobs. `execution.json` records environment and summaries. `SHA256SUMS` covers every report/evidence file other than itself.

## Remaining qualification

Root must independently review and integrate the five runtime paths plus the narrow Core/codec patch. Native Source/Release proof for this new Formation chain remains to be batched at a useful root milestone; no new native run is claimed. Existing first inactivity native evidence does not cover this new chain. Initial full Topic/Entry formation graph transport, arbitrary/multi-entry moves, new Section creation, mixed saved/Human/Source checkpoint recovery, real model semantics, cloud capacity and real account/provider qualification remain separate work. Artificially clearing a human restore lock or inventing a reactivation writer is explicitly unsupported.
