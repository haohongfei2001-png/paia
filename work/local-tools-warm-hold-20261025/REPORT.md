# Original local tools warm hold — local candidate

**Current successor:** read REVIEW-FOLLOWUP.md for the independent review corrections and final 43/43 result. The initial d9ee08a candidate and its results remain recorded below.

Base: `bf7e5cb1dce4c99f0d77d0466370862e6728eaff`. Branch `codex/local-tools-warm-hold-20261025`.

## Scope and behavior

Only the original ImportHandler/ImportLedger, BackupService and IntegrityChecker plus one fixed internal helper and owner tests changed. No worker/coordinator/activation, production adapter registry, workflow, runtime launch, database schema or budget changes.

The helper is restriction-only implementation detail. Original classes keep it private; source identity requires the original exact class/prototype methods, the original store and repository/db/databaseId, queued runner, transaction method and local SDK object/get/set. ImportHandler additionally binds its original Ledger/runtime/getURL/id. A caller-created helper/token is not accepted by any original class. Hold uses one original cumulative 4096-reference/2 MiB/30-second ticket for acquisition and subsequent fences. Failed/expired work stays closed until release by the exact returned token or exact original failure object. Second holds and foreign releases do not clear a lease.

All actual original asynchronous public operation promises enter the private task set before their first await and stay until genuine settlement. Holding synchronously denies new admission; queued or preflight operations compare a private serial before their next write transaction callback. Already-issued native transactions retain their original settlement, and Backup tracks its actual SDK write to settlement. Release does not replay actions. Native operations here mean fake IndexedDB's original transaction protocol in local Node tests, **not a native browser acceptance result**.

Import preserves grants, tasks and evidence; it never pauses/cancels to manufacture quiescence. This first implementation conservatively refuses any durable nonterminal import task, including a static paused task. Callers may resume/cancel through the existing explicit workflow only after releasing the exact failed hold. Its production verified-adapter registry stays empty. ImportHandler only delegates the private hold to its exact original Ledger; capability-only reads do not become writer authority.

Backup keeps staged session items. An already admitted staging validator can finish while hold drains it. A queued restore/settings write is refused after hold; an already-issued settings SDK publication is awaited. A subsequent blocked marker cleanup leaves `backup-recovery-settings` intact and hold returns OUTCOME_UNKNOWN. It must be explicitly recovered after release. No transaction-success claim is substituted for the full restore/settings outcome. Retired export methods still reject FEATURE_UNAVAILABLE before argument/storage access. Historical encoder subclasses remain usable in ordinary tests but cannot acquire an original production hold.

Integrity stays strictly read-only, RPC-driven pagination. Original pending scan/result continuation drains; static sessions and counts remain. A nonempty session map is not an active writer and is not deleted to fake completion. Explicit cancel/expiry mutation is rejected while held. Genuine Import disconnect/revoke remains immediate: it revokes the original grant and invalidates the original hold (corrected in REVIEW-FOLLOWUP.md).

The read-only proof includes gate, restore epoch, backup generation, recovery-settings marker, control-publication reservation and revision; Import additionally reads original bounded task pages. Canonical control encoding preserves exact stored shapes. Pending settings/control reservation refuse. Repeated fences consume the same ticket. This is **only warm local owner coverage**: it proves neither historical external insertion, remote provider termination, cold legacy closure nor global selection qualification. Activation remains disabled elsewhere.

## Validation (kept separate)

Environment: official pre-existing Node 22.23.3, macOS arm64; no downloads/install/browser/native/network/build/cloud/provider. All tests synthetic local Node/fake IndexedDB.

- `owning-first.log`: original Import Ledger + Integrity + current-version Backup complete files, 23/23 (0 fail/cancel/skip/todo).
- `hold-first.log`: first 13 local hold cases, 13/13.
- `hold-expanded.log`: expanded 17 cases, 17/17.
- `sdk-settlement.log`: new exact issued SDK settlement case, 1/1.
- `owning-combined.log`: 15 complete owner/affected files, 119/119, TAP 9843.145417 ms. The new hold file contained 18 cases at this point.
- `cumulative-and-foreign.log`: two later test-only additions, 2/2. Runtime bytes unchanged from the 119/119 run. Not a single 121-case combined run. Final hold file has 20 cases; the final two were checked separately to avoid repeating completed work.

No failed test invocation occurred in this package. Earlier project failures and external quotas are unchanged; nothing is overwritten or claimed repaired by these local results.

## Exact commands

Node path for every invocation:
`/Users/hhf/.codex/worktrees/organize-handoff-validation/paia/work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node`

First owning (worktree root):
`--test extension/tests/import-ledger.test.mjs extension/tests/integrity-v092.test.mjs extension/tests/backup-current-version.test.mjs`

First and expanded hold (worktree root, file evolving as documented):
`--test extension/tests/local-tools-selection-hold.test.mjs`

SDK targeted (worktree root):
`--test --test-name-pattern='issued Backup SDK' extension/tests/local-tools-selection-hold.test.mjs`

Full affected combination (cwd `extension`):
`--test tests/local-tools-selection-hold.test.mjs tests/import-ledger.test.mjs tests/import-security.test.mjs tests/import-upgrade.test.mjs tests/claude-import-round5a.test.mjs tests/import-reader.test.mjs tests/import-coordinator.test.mjs tests/integrity-v092.test.mjs tests/backup-current-version.test.mjs tests/backup-v081.test.mjs tests/backup-hardening-v092.test.mjs tests/cpv1-01-5-backup.test.mjs tests/ans-02-source-backup.test.mjs tests/intelligence-backup-v0110.test.mjs tests/settings-ai-style-backup.test.mjs`

Final test-only additions (worktree root):
`--test --test-name-pattern='fences consume|second holds' extension/tests/local-tools-selection-hold.test.mjs`

`git diff --check` passed. `source-vector.json` records final source bytes; SHA256SUMS covers the delivered report/evidence. Candidate needs root independent review and local integration. No remote publication was performed.
