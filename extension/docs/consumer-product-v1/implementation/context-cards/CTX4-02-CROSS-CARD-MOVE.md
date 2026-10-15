# CTX4-02 permission-confirmed cross-card movement

Approved retained Context §1.8 now runs through the original ContextCardsService writer and immutable operation receipt. Explicit confirmation displays global/source/target saved access state; it neither changes those switches nor enables any real AI connection. Item revision, source identity and all three permission values/revisions must still match in the original transaction. Destination placement preserves section and appends above existing/restored/removed order values; integer exhaustion refuses without writes.

The receipt contains no second body. Undo derives source/order from that server receipt, requires exact resulting Item revision and fresh reverse permission confirmation/CAS, and refuses occupied old positions or later edits/moves/deletion. It never revives old grants. Automatic Items retain provenance/maintenance and receive human protection. Sync journal injection still refuses before prepare/write; no Sync/codec/protocol change.

UI retains failed/IME/pending drafts and flags moved-away dirty editors instead of presenting them as current-card content. Clean moved-away editors retire. Preparation is guarded before the first await through confirmation/hash/ACK and blocks leaving; original unknown-ACK reconciliation remains available.

Evidence: independent four whole files257 PASS with six directions/eight access combinations, original maintenance/read invalidation, exact undo, overflow/collision/receipt rollback, IME and preparation checks. Exact frozen core3f7daf1b/commit7d38c6fa/UI4d11bdca plus owning tests were copied over HEAD9c853d7a to an isolated checkout. Original standard release build, actual Source/release confirmation/cancel/undo/access-race/receipt-rollback/lost-ACK journeys all PASS. Original affected editor Source/release six cases PASS52871.724167ms, and prior group-reorder release combination PASS. Independent review found no remaining slice blocker.

Historical failure: the first native helper toggled an already-open menu after cancellation, hiding its target; fixed the gesture using actual open state without changing production/assertions/timeouts. Isolated old runtime rejects the new command INVALID_REQUEST. All logs retained in work/reviews/PR284-CONTEXT-MOVE.

This is reviewed local candidate code, not full PR certification, user installation or whole Canonical completion. Sync new work stays paused and Pro owns CI.
