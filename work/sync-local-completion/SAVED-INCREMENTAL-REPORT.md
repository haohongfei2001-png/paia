# Existing-device saved typed incremental consumer — 2026-10-23

Base: `4f803429bd256dbcac11c779b11fcb62922f9f19`. Local synthetic implementation; no live provider, account, browser, CI, deployment, native performance claim, or real deletion.

## Implemented consumer

An existing B containing the same Source and saved anchors may retain its own typed edit/outbox while consuming causally compatible remote saved successors. The original named edit owner prepares and performs each edit; original Core applies the exact remote operation in that same transaction. Remote receipt, canonical rows, domain receipt, physical allocation mapping, and progress settle together; remote operations do not echo into local outbox. The full union graph is validated before the first write. Same-entity forks, changed Source, changed local base, unknown incoming anchors or unrelated families fail closed.

Local physical update/revision counters can differ between devices. Only those allocation fields are normalized for chain semantics; the exact remote operation remains validated against its original owner events. A per-entity mapping binds the precise current remote revision, wire counters/history coordinates, and actual local original-owner counters. Body, authorship, protection, provenance, dependency, created identity, history identities and request facts remain exact. Existing snapshots without this mapping retain the old exact update-counter requirement. No old operation is rewritten.

The coordinator uses one original bounded Foundation transaction per incoming typed operation. This is **not checkpoint-wide atomicity**. After every committed step the entire canonical/protocol prefix is valid and can be exported and cold-restored. A durable digest, exact completed revisions and captured next base permit restart. A new local edit after partial completion invalidates that base; it is not silently refreshed. Completion is acknowledged only when the final stage and original merge receipt agree. A lost final return is resolved from durable receipts without repeating edits.

The public batch checks elapsed 30 seconds at phase boundaries and each transaction receives the remaining bounded budget; original private 4096 references / 2 MiB ceilings are retained. This is not a claim that every never-returning JavaScript await or underlying I/O can be forcibly cancelled. The elapsed test stops after an already committed first step, preserves its partial status, and resumes explicitly. No partial operation is called rolled back after it committed.

## Closure and failures

The exact verified next protocol namespace is captured before the external checkpoint callback, with only explicitly predicted stage/merge receipt writes substituted. Raw terminal fences protect all rows and counts. Current saved scope seals every member and its history/provenance/dependency, Source evidence facts, and the required global empty placement/suppression/search-term sets. Existing local outbox rows and counts are retained. Original authority, Source, owner markers, original history and receipt identities remain checked.

Review found three actual missing-rejection cases: mutation of another saved entity's anchor receipt after union verification, insertion of another entity's placement, and insertion of a search term. The initial receipt test incorrectly opened a separate read transaction inside the writer and failed to reach injection; that log is preserved separately. The corrected three-case negative run failed 0/3 as expected against the draft. The final implementation rejects and rolls back all three.

Earlier actual failures are preserved: first physical-mapping draft failed on the paired negative-update counter; old coordinator rejected populated saved merge; first draft seal omitted required `isCurrent`; its next version incorrectly reused a manual helper which reads public lifetime diagnostics and falsely rejected the second step. The saved path now uses the original private per-transaction meter and an independent exact final fence; it does not alter the shared manual helper or reset private accounting.

## Validation

Node 22.23.3, synthetic fake IndexedDB, `PYTHON=/opt/homebrew/opt/python@3.12/bin/python3.12`. No browser/build/cloud execution.

- Original populated coordinator negative: 0/1, `BNS_GROUP_MERGE_OWNER_UNSUPPORTED`.
- Early owning controls: 14/14.
- Corrected review negative: 0/3 (missing rejection), followed by 17/17 owning after closure repair.
- Final owning: **21/21**, 8070.118416 ms, no fail/cancel/skip/todo.
- One final eight-file combination: **139/139**, 10525.245583 ms, no fail/cancel/skip/todo. Files: saved-incremental, saved-multiple, saved-successor, saved-group, group-checkpoint-plan, group-checkpoint-restore, group-checkpoint-old-reader, group-compaction.
- Original separate saved-work-bootstrap owner: **37/37**, 2542.082833 ms. This is separate, not a combined 176-test invocation.

New controls cover compatible two-step merge, retained B local edit/outbox, full union fork refusal before write, same-entity causal continuation through another cold device, intermediate cold export, restart, intervening local edit, lost return, competing receive, five backup-tail corruption cases, Source revocation, three review regressions, ancestor-only acknowledgement, no-op Source terminal drift, 4097 real repository reads despite public diagnostics reset, and elapsed partial settlement.

## Integration and remaining scope

Commit the four Sync runtime files and owning tests/evidence. `group-checkpoint.js` is intentionally not committed by this line: root owns it. `saved-incremental-coordinator-only.patch` is generated against the exact pre-incremental temporary coordinator and contains only this consumer's import, ready-phase/base selection, dispatch and new method. Root must integrate those small changes into its newer coordinator, preserving its generation/purge guards.

Finite tested scope: one Source, two saved entities, existing B with the same immutable anchors, compatible typed successors. It is not multi-Source, new-anchor import into populated B, arbitrary family union, provider acceptance, UI conflict resolution, or full Sync delivery. The next engineering package is multi-Source bootstrap/append and each Source's Working relationships; remote/account qualification remains separate.
