# AI-COST-05 — local saved-projection cache qualification

Base `2ed4931c`; independent `codex/ai-cache-qualification-20261009`. This is a read-side local slice, not generation, Qwen qualification, a production cache writer, a new incremental block manifest, or full AI-COST-05 completion.

## Actual owner and scope

The existing `aiPresentationStatus` / `topicState` path consumes the qualifier. The existing readable Entry/Input/provenance/filter logic still decides whether saved text may be returned. No legacy projection is retrospectively marked balanced or Qwen. Without binding metadata, a saved permitted projection stays readable and is `unqualified`. Missing saved output is `unavailable`; impermissible saved evidence is `unreadable`. Stale but permitted output stays under its original owner, and protected human fields can never be reusable generated cache.

The optional internal third argument of `aiPresentationStatus` is an explicit expected generation profile (contract/model/prompt versions). It is cloned before awaits. The Store/worker path does not pass it, and public request options cannot configure it. Missing or malformed expected profile cannot produce an exact hit. Tests use an explicitly synthetic profile; no record is allowed to self-select its expected profile. This is not authentication, financial admission, permission or dispatch authorization. `dispatchAllowed` is always false.

A future trusted producer can read the same internal transaction snapshot helper; no RPC exposes that helper. This slice does not add a production writer for `cacheBinding`. Synthetic records in tests explicitly seed that optional envelope in the existing projection row; no IndexedDB schema/object store, import/export, backup or Sync contract is changed or claimed.

The qualifier binds exact Topic identity/name/layout/organization, existing Entry and Input version tokens, source policy, Section metadata, coverage, gate epoch and the separate real `recovery-restore-epoch`. Projection row, evidence and recovery metadata are read in one existing repository transaction. Style uses the existing acknowledged preference owner and enum/policy equality, not the global preference revision: A→B→A may reuse A, while no execution authorization is granted. This retains the existing serialized single-worker control owner; it does not establish cross-instance atomic CAS for extension local storage.

Only `{state, reason, reusable, dispatchAllowed}` is returned as new public metadata. Exact refs, internal evidence tokens, profile and raw bodies are not added to the UI DTO. Internal evidence metadata is bounded at 256 KiB for qualification; excess yields unqualified, never truncation. This is not a new Topic scan limit or a claim of bounded total allocation: existing `topicSnapshot` traversal is unchanged. Legacy/no-binding paths skip the extra cache snapshot reads. The existing migration/read lifecycle is unchanged; seeded post-migration read tests prove no additional writes.

## Evidence

- `/tmp/ai-cache-qualification-before.log`: initial test setup failed because a derived Entry had no Topic; not a product negative.
- `/tmp/ai-cache-qualification-owner-before.log`: after actual createTopic/placeEntry, status lacked the new cache qualification contract. This is missing local functionality, not evidence that old reads called a provider.
- `/tmp/ai-cache-owner-final.log`: 12 PASS / 1 FAIL. The attempted real purge was refused by the existing `SOURCE_PURGE_OWNER_GATE`. This boundary was preserved, not bypassed.
- Initial `/tmp/ai-cache-related-final.log`: **46/46 PASS**, 1924.877542 ms, four complete files: `organize-cache-qualification`, `ai-presentation-v072c`, `settings-ai-style-owner`, `settings-ai-style-content-preservation`. Thirteen cases belonged to that initial new owner file; the final suite has seventeen.
- New tests cover actual create/place/status, legacy read preservation, synthetic internal exact profile, public-options refusal, real preference A→B→A, Input edit/removal, changed restore epoch with otherwise unchanged revisions, new local Entry coverage, actual `editAIPresentation` protected human work, unknown preference, recovery-in-progress, expected profile changes, malformed binding, metadata bound, zero fetch, and transaction-observed evidence/row/epoch reads.
- Purge evidence is explicitly limited: actual purge refusal leaves every checked store unchanged; a separate raw persisted `sourcePurged` tombstone injects a read-side negative. It is not a successful purge transaction or whole recovery proof.
- `/tmp/ai-cache-package.log`: **12782** package guardrails over **385** runtime resources PASS. Static audit only. No browser, CI, provider, account, model or production activation ran for this slice.

Current bytes:
- `core/organizer/ai-presentation.js`: `931cdc8fe6ebcd6ba5bc73439cc6ceea6519ce3450ae9c42f95348dbf635b1b3`
- `core/organizer/organize-cache-qualification.js`: `588ce864e1be976268cd753b47b903230b93c6a9ad93a277668a38b2d3f508cf`
- `tests/organize-cache-qualification.test.mjs`: `54a87a64eeacd725ad209b4e459fc2e68ec4d780a6b0cf071f50ec26aff1be9a`

Independent review is pending. No deployment/installation, trusted cache writer, real Qwen output quality, billing, 200+5 incremental assembly, or block-reuse completion is claimed. The canonical 200+5 example remains an acceptance scenario, never a global hard threshold.

## Independent-review corrections and final evidence

Independent reviewer reproduced a real omission: the existing `clearDerivedMetadata` candidate-retirement owner marks `needsUpdate` without incrementing presentation revision. The initial new qualifier could report exact while the old owner reported stale. `/tmp/ai-cache-independent-negative.log` preserves that actual-owner negative. The owning suite now contains both that retirement and a valid pending proposal produced by `createAIPresentationCandidate`; `/tmp/ai-cache-retirement-owner-before.log` recorded 14 PASS / 2 FAIL before the correction. Needs-update/stale flags and pending candidates now retain readable Current through its existing owner but never yield reusable exact. Initial additional fixture errors (numeric rather than string candidate binding epoch, unsupported `consent(false)`) remain in `/tmp/ai-cache-retirement-before.log`; corrected tests use the real `setEnabled` owner.

The existing evidence checkpoint also remains authoritative: the actual pending/changed/removed owner cannot be overridden by a matching optional cache binding. `/tmp/ai-cache-checkpoint-before.log` records 16 PASS / 1 FAIL for that seam. `topicState` now passes its actual changed/removed predicate; the pure qualifier rejects exact as owner_pending if more specific invalidation has not already applied. The positive fixture writes matching existing entry-version checkpoint metadata and the synthetic bound saved row in the same transaction, explicitly representing a future qualified writer; no production writer is added. An initial reason-order mismatch is preserved in `/tmp/ai-cache-final-all.log`; final qualification reports specific changed-evidence reasons before the otherwise-exact owner-pending guard.

Additional actual-owner tests verify `setEnabled(false/true)` changes gate epoch independently of restore epoch and retained `MemoryService.settings({localOnly:true})` changes policy. Enabling its retired external access still rejects; no external service is restored.

Final four complete files: **50/50 PASS**, **1482.964 ms**, `/tmp/ai-cache-final-stable.log`, including **17** new owner cases. Package **12782 / 385** PASS (`/tmp/ai-cache-package-final.log`), diff check PASS. Runtime bytes above bind this final revision; independent final review remains pending. No browser or paid/provider work was performed.

Final independent review **APPROVED**. Reviewer independently ran the same four complete files: **50/50 PASS**, **1467.642208 ms**, `/tmp/ai-cache-review-final-complete.log`; all three code/test SHA256 values above match and diff check passes. Review confirms owner invalidation/pending checkpoints cannot be overridden, synthetic exact fixtures do not imply production qualification, and legacy readability/human protection remain unchanged. Coordinator authorized this exact four-file local checkpoint; no push or browser rerun.
