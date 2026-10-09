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
