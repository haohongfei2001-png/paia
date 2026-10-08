# SYNC manual Info optional owner candidate

Base: c67db15a. Local candidate only; not worker-enabled, CI-admitted, merged, installed, cloud-qualified or full canonical restore.

## Implemented boundary

The existing ContextCardsService change algorithm is reused for preview and final write. Optional syncJournal defaults to null. A journal-backed manual Info change commits the canonical aggregate, protocol operation/outbox and local command receipt atomically. Consent/recovery epoch, original expectedRevision/deletedBy and whole-row preparation fences remain mandatory. Existing manual Info requires explicit bootstrap; this does not enable any access.

Incoming manual Info is validated against its actual causal revision chain and the exact prior canonical item, including revision, lifecycle and deletedBy. Soft removal preserves body/section; restoration must follow that removal, advance revision and preserve its body/section. A same-body locally deleted item is not silently overwritten. Existing untracked or locally edited owners reject before receive bookkeeping can persist. Staged activation uses the actual stage Core and Context owner, with rollback evidence. All unrelated Context items and local global/card access are preserved.

Excluded: ContextDesired, global/effective access, connection grants, Rules, Now, automatic items, permanent purge, conflict resolution, full Source/Context backup restoration and provider connections. Causal traversal is bounded to 128 revisions and conservatively refuses multi-parent or longer chains; this is not unlimited-history support. No codec, shared Core/checkpoint, schema, Settings, worker, CI or permissions changed.

## Evidence and limitations

- Original HEAD ContextCardsService with optional journal: genuine negative, successful local create produced zero outbox entries; /tmp/sync-context-baseline-negative.log.
- 12 owner cases passed, then 599 related explicit non-Chrome cases passed: /tmp/sync-context-fixed.log and /tmp/sync-context-related.log.
- Final head-binding refinement adds expectedParents. The older bootstrap race was already safely rejected by Core as BNS_BOOTSTRAP_AUTHORITY; the new case asserts earlier BNS_HEAD_CHANGED. This is contract precision, not proof of a previously successful unsafe commit. /tmp/sync-context-cas-negative.log retained.
- Final owner + Core + checkpoints: 56/56, /tmp/sync-context-final-related-review.log; 15 are this new owner matrix. Independent review requested two additional unit boundaries: exact 128-revision acceptance/129 refusal with complete receive rollback, and an injected same-value protocol head advancement between existing Item validation and prepare. Both pass. These two are unit-only; the unchanged native matrix remains 13 scenarios per variant. The same-value head is deliberate low-level protocol injection, not a claim of a valid Context domain transition.
- Final complete source/release native: 2/2, each executes all 13 owner scenarios in real isolated IndexedDB, then actual worker replacement verifies exact canonical/protocol/receipt persistence. /tmp/sync-context-native-final.log; extension/work/qa-bns-context-info/{source,release}.json contains hashes and zero-network/lifetime evidence. Release is built into a unique temporary directory and guards remain enabled.
- Earlier unit fixture confused outbox pointer with sealed operation (5 pass / 7 fail); fixed by reading referenced revision, retained /tmp/sync-context-first.log.
- Earlier native fixture JSON byte-order comparison rejected equivalent checkpoint-decoded objects (2 fail); structural comparison now recursively sorts object keys while retaining every value/array order. /tmp/sync-context-native-first.log retained, second 2/2 pass followed by final changed-head-binding 2/2 pass.
- An overbroad initial related-test glob accidentally included native files; sandbox headless launch failed and that run was canceled, never counted as passing. /tmp/sync-context-related-first.log retained. Subsequent lists explicitly exclude Chrome files.

Native transport is synthetic in-memory, no external cloud. Fixture calls real opt-in owners directly, not product worker routing. It does not certify Prompt purge, full backup restore, physical disk exhaustion or arbitrary remote conflict reconciliation.

## Final local bytes

- `core/context-cards.js`: `efb3b2e10e3a74f0d34adc93b56db818391c4927d4af18dc57e317389070f42f`
- `core/browser-native-sync/context-journal.js`: `362809597e42a89662f8f99a1ce3f8d9e96b6cd82a53d4cd19af97f0dbbdb2c0`
- `tests/browser-native-sync-context-info.test.mjs`: `443e9dd3afe57e3e6f435db6745a63058b91bd38686772813950aec9d25bb900`
- `tests/native-sync/context-info-worker-fixture.mjs`: `1927ae97ac6d04bc8bb14e4b538682a5b61aa3762e1ef08c3c53d58f0c73e9dc`
- `tests/native-sync/context-info-chrome.test.mjs`: `0536aaebd3b089c943babb68b24d17d8a6425811fa8a9fbc1a68ca32057ed8fe`
