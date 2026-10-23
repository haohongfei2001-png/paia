# Saved typed coalesced continuation — 2026-10-23

This successor to `48228bf0` supports the original owner's rapid consecutive edits when `planJournalRevision` coalesces their retained history row. It preserves every real typed edit operation, original domain receipt, causal parent, and atomic outbox. Initial bootstrap remains strict: a coalesced initial history without retained typed intermediate facts is refused, never reconstructed by guessing.

## Implementation and safety

The transition codec uses the original field and journal planners. A coalesced transition must reproduce exactly the original three domain clock events and replace precisely the final retained history row; a new-row transition retains its original five allocation events and retention protection. Entry origin, generator, Source descriptor, manual protection and prior history remain exact. The codec proves a transition, not standalone write authority.

Final state authority comes from strict original bootstrap plus the entire continuous immutable typed ancestry. Local continuation reads and validates every ancestor, recomputes the original local-key Entry and Source provenance/dependency, compares actual canonical rows, and binds every original ancestor row in both the prewrite check and final raw transaction fence. Missing, changed or late-mutated older operations refuse with whole-table rollback, including when their intermediate text no longer appears in the coalesced history. The existing private 4096-reference/2-MiB/30-second transaction budget remains enabled before the first query. Prepared ancestry is additionally bounded to 128 successor rows, 2 MiB and 30 seconds; the aggregate original grouped compiler remains independently bounded.

Cold restoration derives the final canonical state only from an original branded grouped plan. It imports the qualified final state once while original Core retains every typed operation and receipt. The grouped stage/replay and original owner terminal seals remain unchanged. The optional final-state path cannot be supplied as a public expected-row override.

Canonical transport JSON sorts property names. The original journal compares snapshots with JSON.stringify, so a byte-equivalent object key reorder could otherwise change whether a subsequent actual edit coalesces. Sync restores the original known snapshot, body-protection and body-authorship insertion order after full semantic validation; no keys or values are removed. The original owner and coalescing policy are unchanged.

## Evidence

Existing isolated Node 22.23.3 and absolute Python 3.12 path; fake-indexeddb, synthetic data only. No browser, build, cloud, provider, installation or real-account action.

- Original new real consumer case: **0/1**, `BNS_SAVED_WORK_UNSUPPORTED`; strict final bootstrap validation rejected the legitimate coalesced revision. `saved-coalesced-baseline.log`.
- First implementation: **0/1** at cold stage, because wire property sorting changed the original journal comparison. `saved-coalesced-first.log`.
- Next check: **0/1**, test incorrectly selected the second hash-ordered revision instead of matching the real request ID; implementation was not changed to satisfy that assertion. `saved-coalesced-second.log`.
- Corrected real B edits → checkpoint → cold C → C coalesced continuation: **1/1**. `saved-coalesced-third.log`.
- Expanded owning file: **28/28**, TAP 4982.323583 ms. Original tests retained; the former explicit coalesced refusal assertion was replaced by the newly supported behavior, while ordinary unrepresented-edit refusal remains.
- Final eight-file owning combination: **164/164**, exit 0, no fail/cancel/skip/todo, TAP **8235.012417 ms**. Same eight files as previous package: saved successor/group/bootstrap, Core, grouped plan/restore, Human journal/group. `saved-coalesced-final.log`.

New cases verify original three-event allocation, every outbox operation, exact retry, cold restoration and continuation, missing/changed/tail-mutated hidden ancestry, late Source/receipt rollback, cold activation whole-state rollback, and refusal of unsupported initial coalesced capture. Existing conflicts, permissions, budgets, Source revocation, protocol and canonical terminal checks remain in the combination.

## Remaining work

This still supports one unplaced AI saved Entry and one primary Source. Original retention that deletes earlier journal rows, adopted AI, multiple saved entities, multiple Sources and receiving into a separately modified populated destination remain subsequent packages. Typed coalescing does not waive any shape or aggregate budget and does not certify native browser or Linux capacity. There is no new coordinator patch in this package; it uses the prior saved successor dispatcher already provided to root. Independent review is recorded separately, not inferred from test success.
