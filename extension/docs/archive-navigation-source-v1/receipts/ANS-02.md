# ANS-02 Completion Receipt — Provenance-safe source structure foundation

## Identity

- Package: `PAIA-ARCHIVE-NAVIGATION-SOURCE-v1`
- Round: `ANS-02`
- Execution: `ANS02-20260919-0109`
- Canonical execution start: `0f394d66bf8e84e82eb3dd72a45c05e1d17152b1`
- Claim/status commit: `1c1ea18254d323e0053148a574016880856b1084`
- Implementation commit: `6de0f4a525b181562b9873f7ee3da220d8b18d79`
- CI synchronization commit: `a9fd811a3d5aadddc7a99e492cd4a0dab970ea2b`
- Candidate branch: `ans/v1/ANS-02-20260919-0109`
- Candidate certification: PAIA Certification #366 / run `35386445629` / attempt 3 / **success**
- Published runtime head on `main`: `a9fd811a3d5aadddc7a99e492cd4a0dab970ea2b` (fast-forward; PR #32)
- Main certification: PAIA Certification #367 / run `35394493831` / attempt 2 / **success**
- Main certification completed: 2026-09-18T21:49:08Z
- Product-owner blocker: **NONE**

This receipt closes only ANS-02. It does not authorize or claim ANS-03 implementation.

## Delivered behavior

ANS-02 implements the package-defined source relationship/history/lifecycle and Backup/purge foundation without changing Source/Input/Thought ownership, capture scope, provider permissions, AI authorization or Source identity:

1. Added strict durable source-structure rows in the existing meta store: `ans:conversation:v1:*`, `ans:project:v1:*`, and append-only `ans:event:v1:*`. No new object store or IndexedDB version is introduced.
2. Added a pure relationship/status reducer for Conversation and Project facts, including unknown/unassigned/project membership, active/confirmed-deleted status, move/rename/reappear semantics, stale observations, duplicate observations and CAS conflicts.
3. Added a trusted `SourceStructureStore` that commits current rows plus history atomically through the existing writer/transaction boundary. Metadata does not become a second body store and does not rewrite Source/Input/Thought text or IDs.
4. Integrated source-structure cleanup with the actual PAIA purge path. Purging the last legal source reference removes Conversation metadata/history and orphan Project metadata so last-known private names/refs cannot survive as a side channel. External source deletion remains metadata only and is not treated as PAIA purge.
5. Extended Backup/open-export/restore with an explicit source-structure whitelist and strict validators. Durable facts/history round-trip; restored evidence is marked `restored` while preserving original observation time; UI/order/index/cache namespaces remain non-portable; unsupported newer ANS metadata versions fail closed.
6. Fixed the pre-existing Backup provider validation mismatch for already-supported portable ChatGPT + Claude archives by reusing the existing import identity/provider contract. This does not add a provider or certify Claude real-export support.
7. Restore graph/reference validation, target safety and transactional rollback protect Source/Input/relationship rows together. A failed restore leaves the target empty/unchanged rather than partially committing ANS metadata.
8. Browser evidence verifies source metadata/history survives worker restart and Backup restore while immutable Source text/hash and edited Working Input remain unchanged, with zero hidden provider/network work.

## Actual changed files

Compared with the ANS-02 claim checkpoint `1c1ea182…`, the certified runtime head changes only these files:

- `extension/core/backup-format.js`
- `extension/core/backup-service.js`
- `extension/core/idb-repository.js`
- `extension/core/import/contract.js`
- `extension/core/indexed-store.js`
- `extension/core/open-export.js`
- `extension/core/source-structure-backup.js` (new)
- `extension/core/source-structure-model.js` (new)
- `extension/core/source-structure-store.js` (new)
- `extension/tests/ans-01-reader-surfaces-chrome-e2e.test.mjs`
- `extension/tests/ans-02-source-backup.test.mjs` (new)
- `extension/tests/ans-02-source-foundation-chrome-e2e.test.mjs` (new)
- `extension/tests/ans-02-source-structure.test.mjs` (new)
- `extension/tests/ux-r5-ai-organize-chrome-e2e.test.mjs`
- `extension/tests/ux-r5-certification-chrome-e2e.test.mjs`

The two non-ANS browser-test adjustments are synchronization-only fixes for pre-existing asynchronous UI assertions surfaced by certification. No timeout, product assertion, security/privacy requirement or acceptance threshold was weakened.

## Focused verification

The final main Full Suite reports the ANS-02 focused files as:

| Test file | Pass | Fail | Skipped |
|---|---:|---:|---:|
| `ans-02-source-structure.test.mjs` | 7 | 0 | 0 |
| `ans-02-source-backup.test.mjs` | 3 | 0 | 0 |
| `ans-02-source-foundation-chrome-e2e.test.mjs` | 1 | 0 | 0 |

Focused coverage includes relationship transitions/history, stale/duplicate/CAS behavior, atomic write failure, actual purge cleanup, mixed ChatGPT/Claude Backup round-trip, unsupported metadata version rejection, broken graph rejection, transactional restore rollback, restart persistence and preservation of immutable Source + edited Working Input.

## Certification evidence

### Candidate exact head

PAIA Certification #366 / run `35386445629` completed at exact candidate head `a9fd811a3d5aadddc7a99e492cd4a0dab970ea2b` with attempt 3 **success**.

Required jobs all succeeded:

- Adapter and privacy contracts
- Current release build and guards
- Unit 1/4
- Unit 2/4
- Unit 3/4
- Unit 4/4
- Current Browser Certification
- Full Suite Certification
- macOS Secure Store Certification
- Certification gate

Candidate Current Browser explicitly passed the ANS-02 source-foundation browser journey and all 53 current browser cases.

Candidate attempts 1–2 exposed two independent baseline browser timing/focus flakes: one UX-R5 focus restoration assertion and one UX-R2 asynchronous concurrent-change visibility assertion. Both same-head cases passed in Current Browser and/or another Full Suite attempt; attempt 3 completed all required jobs successfully. No gate was weakened.

### Main publication exact head

The certified candidate was fast-forwarded directly to `main`; PR #32 was then recorded by GitHub as merged with merge SHA equal to the candidate SHA, so no merge commit changed the tested tree.

PAIA Certification #367 / run `35394493831` on `main@a9fd811a…` completed with attempt 2 **success**. All required jobs and the final Certification gate succeeded.

Main Current Browser evidence:

- coverage guard: `CURRENT_BROWSER_COVERAGE_CONTRACT_PASS core=11 uir=10 ans=2`
- **53 pass / 0 fail**
- ANS-02 source-foundation browser case: PASS
- package guardrails: **8659** across **201** runtime resources
- privacy/permission/network audit: `DEVELOPMENT_PRIVACY_PERMISSION_NETWORK_AUDIT_PASS`

Main Full Suite evidence:

- current full suite: **157 files**
- historical browser audit inventory: **76** pre-migration browser files
- formal receipt: `fullSuite=true auditPassed=true`
- input digest: `561b42a6182a8c4a2d7f4cce83eb8310f53c2789994d242555d51ae076e6792f`
- package guardrails: **8659** across **201** runtime resources
- privacy/permission/network audit: PASS

Main attempt 1 reproduced the known UX-R5 transient focus assertion while the same exact-head Current Browser run passed that test. The failed Full Suite job alone was rerun; attempt 2 passed without code or test changes.

No local clone/test result was used as the unattended-development source of truth. GitHub remote refs, Actions runs and exact-head readbacks are the canonical execution evidence.

## Migration, privacy, ownership and rollback

- Durable body migration: none.
- New object store / DB version: none.
- Source identity, Input identity and Thought ownership: unchanged.
- Existing human edits/revisions/tombstones: unchanged and remain authoritative.
- Provider/capture permissions: unchanged.
- New network/AI authorization: none.
- Old archives without structure metadata read as unknown and are not bulk-inferred into Projects.
- Durable source-structure history is not a disposable index; rollback must not erase it.
- Rebuildable UI/order/index/cache state is intentionally excluded from Backup.

## Handoff

ANS-02 is complete at certified runtime head `a9fd811a3d5aadddc7a99e492cd4a0dab970ea2b`, published on `main` and certified by main PAIA Certification #367.

Canonical STATUS may now mark ANS-02 COMPLETE and ANS-03 READY. This execution stops after publishing and remotely reading back the completion documents; it does not implement ANS-03.
