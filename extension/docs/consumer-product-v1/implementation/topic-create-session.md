# TOPIC exact create attempt and recoverable name

The reachable Home add-Topic action previously minted a new operation for each submission. A real original-store reproduction committed the first CREATE, lost its acknowledgement, then created a second same-name Topic on retry. The original CREATE receipt already supports idempotence; this slice uses that owner instead of creating another writer.

The controller retains one bounded session with the confirmed name, immutable request and known result. An unknown retry reuses the exact operation. A known result is re-read without a second creation; only the current caller may open it. If another window removed/redirected the already confirmed result, the old attempt retires but the name remains for a later explicit form confirmation. Temporary reads retain the known result. Cancelling a fresh form does not write. Pending, composition, failed-save and caller-intent guards preserve existing editing and navigation.

Existing GET_LIBRARY_FOUNDATION_STATUS reads the original recovery epoch in its same transaction. CREATE optionally carries that epoch, checked by the original operation transaction before receipt lookup/write. The original LibraryDocuments override refuses guarded requests before Sync journal delegation and rechecks epoch in its existing compatibility transaction. Legacy callers remain compatible. Guarded requests do not claim Sync-wire compatibility or resume Sync. No new RPC, schema, provider, data writer or installation.

Author eleven whole files256PASS with final runtime and tests frozen; independent review and immutable Source/release Chrome evidence are recorded in work/reviews/PR284-TOPIC-CREATE-SESSION before publication. Native outcomes must not be inferred from synthetic unit passes. Earlier old-runtime duplicate reproduction and override journal-bypass failure are retained. Whole-head/full/latest visual gates and all seven Canonical obligations remain separate.

Frozen UI f04e10288a20dfedea276ea9e9d68626aedde0ec, ThoughtStore b36d8b14ce7fa84275430b1c9132f80007528605, original Documents owner c7ab7a806ea2e94a3e4af0982c836d6cf90c298e and test9006b6c095e7a36f7f218e4d737460d5fc5e5792 passed independent eight whole files184 tests, zero failures/cancellations/skips. Exact immutable Source real headless Chrome verifies one actual Topic after committed-lost-ACK plus identical DTO retry, late ACK retaining actual B heading/body, and epoch replacement after UI qualification refusing both new Topic and receipt. Zero external requests/runtime errors. Standard release503-file guard passes.

Exact standard release real headless Chrome also passes all original CREATE retry, late-ACK reading and recovery-epoch refusal journeys; no user profile or production service was used.

Changed-owner release combination also passes the entire prior Entry deletion Undo native safety set and Topic container rename/delete native set, preserving exact bodies and current reading.
