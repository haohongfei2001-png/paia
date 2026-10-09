# Human Entry edit original computation extraction

## Authorized scope and owner transfer

Base: `1fa44e4e52680f5245e34f6933c129e659d0675d` (frozen 0.39 native/version candidate). This isolated future-batch branch is the sole writer of `core/browser-native-sync/human-library-plan.js` for this extraction. Root retains CI, version, backup and native test ownership; no changes to coordinated-039.

Only the original Entry-edit computation is moved into `computeHumanEntryEditState(request, before, entry, requestDigest, exactSignature, allocation)`. The existing prepare entry point invokes that same computation immediately after its unchanged keyed-signature read and allocation creation. No other owner, Core, codec, receive, transport, UI or worker changes.

## Exact internal interface

The synchronous function accepts the **already validated original typed** Entry-edit request, original bounded `{base, read, receipt}` snapshot, original permission/namespace/secret/counter entry snapshot, already computed request digest and keyed body signature, and the existing request-local allocation object. It reads no transaction or store and receives no generic get/put callback. Its allocation clock, domain UUID and index-generation slot calls retain the original order and role. It returns `{row, touchedTopics, touchedIndices, history, result, operationReceipt, revisionSequence, thoughtSequence}`.

All request shape/field-revision validation, permission and secret authority, duplicate/collision decisions, active/user-created/source-free eligibility, membership qualification, CAS checks and final read-set fences stay in their exact original prepare/require positions. This function alone grants no capability or permission; only the existing prepare path brands its opaque plan. No historical read adapter, sibling retention, resolution intent or new codec is introduced.

## Independent original oracle and intended verification

Freeze the exact original plan module and its complete transitive static imports from this Git base, together with the original LibraryDocumentsStore/Core entry points needed to run original owner transactions. Record each file SHA-256 and Git blob; no edited oracle module or substitute reducer.

Use real original/current typed store captures and exact original prepare/execute flows. Compare full plan bytes and allocation events, original/current whole-store before/after states and ordered writes. Exercise changed and no-delta fields, request/expected-field key order, history coalescence versus new history, active/stale membership touches and inherited index metadata, removal/restore/protection, duplicate/CAS/permission refusal and history-retirement refusal. Inputs, typed reads and allocation evidence must remain unchanged except the original allocator's private consumption. Test evidence is pending; no equivalence or sibling-sync completion is claimed in this interface record.

## Frozen implementation and author evidence

Runtime/test commit: `543adde74013c59c68a8af29d62e5b1cbd52429b`, tree `946ceb5922b7cf7b3273a05a531b10e8c7ba15c6`. The production diff is only the mechanical extraction in the existing plan module (13 inserted/7 removed lines). Original validation/read/identity/permission/hash/CAS/duplicate/capability/final-fence statements are unchanged. No other existing production file changed. The 96 original modules are 903814 bytes of exact Git source, not a rewritten oracle or a production dependency.

| Frozen file | SHA-256 |
|---|---|
| core/browser-native-sync/human-library-plan.js | `7e47474fd92aa3575317fa7d3a16f589774392016b89c7108f946e4e2fa6c074` |
| tests/human-entry-edit-compute-original-owner.test.mjs | `89119b96f23bf2614411fa47e5223adc5a58c475c3d28ec9ec253e6f6a0ebe5c` |
| tests/fixtures/human-entry-edit-original-owner/manifest.json | `f4d759d8340e74254f3a12d8131fad99001ac7420400d4ad7d007b1931b3844d` |

Author owning file: **7/7 PASS**, 498.211083 ms, `/tmp/human-entry-edit-compute-owning-final-fixed.log`. This uses two actual original/current LibraryDocumentsStore installations and original/current opaque prepare/execute flows, with a test-only complete installation clone including local control. Every compared plan is JSON-byte equal (including request field order, receipt, history and allocation events); complete actual store snapshots and ordered transaction writes are byte equal. A separately captured typed read is fed through the same new computation and original role-aware allocator, preserving its inputs and exact events; every computed counter/index agrees with the actual owner result. The frozen original module and all static dependencies retain exact SHA-256/Git blob identities.

The eight **complete** related files passed **34/34**, 1931.272125 ms, `/tmp/human-entry-edit-compute-related-whole.log`: the new owning file, placed-edit, Human journal, request order, grouped receive, allocation portability, indexed journal and derived-refusal files. This includes original current producer/receiver/outbox rollback, group and source/index qualification assertions; it is targeted regression evidence, not whole Sync/product acceptance. Package check passed **13932 guardrails /416 resources**, `/tmp/human-entry-edit-compute-package-check.log`.

Retained author failures (no runtime repair or assertion weakening):

- `/tmp/human-entry-edit-compute-first.log`: 1 PASS/5 FAIL. The test installation clone copied IndexedDB but omitted original local control; consentAt mismatched before computation. Copying the actual original local control fixed fixture equality.
- `/tmp/human-entry-edit-compute-fixture-fixed.log`: 5 PASS/1 FAIL. The extra test expected a nonexistent `protections.body.userTouched`; actual original protection is `locked`/`reason`, with human-confirmed authorship. The oracle equality had passed; the test now asserts the actual original fields.
- `/tmp/human-entry-edit-compute-owning-final.log`: 6 PASS/1 FAIL. A new sequential field-CAS fixture reused the same generated history UUID in separate edits; the exact original owner refused `BNS_HUMAN_PLAN_CHANGED`. Distinct deterministic IDs for distinct allocations fixed this fixture. The original refusal and original/current UUID event comparison remain intact.

No skipped/cancelled cases, native browser/model/network/cloud runs, deployment or permission changes. The existing 0.39 browser results cannot be relabeled as testing this changed plan module. Independent review is **PENDING**. This completes a prerequisite extraction only; Human sibling retention/resolution and global conflict recovery remain unimplemented.
