# Local Sync recovery and Settings entry — 2026-10-23

Base: `0897127e67902141a43b94ea18f44998235a2fc5`. User-authorized local implementation only; no cloud account, credentials, provider registration, network, paid API, deployment or default Sync activation.

## Delivered behavior

Settings now includes its missing Sync destination, first in Data, through the original modal and language owners. It reports the actual build capability (no qualified provider, cannot enable). Opening it neither reads private identity/content nor starts recovery. This entry is not evidence that Sync is enabled or that SYNC-01 is complete.

`LocalSyncRecoverySession` composes the existing `StagedSyncRestore`/`GroupedCheckpointRestore`, bound Core and original LibraryFoundationStore with an explicitly supplied local transport. It discovers all pages, validates original object references and digest/canonical manifest bytes, and uses explicit manifest `parents` plus proven revision retention to select a unique causal descendant. Every listed cut is fully read with original `checkpointItems` and checked by the original group compiler for operations, heads, frontiers and owner scope. The selected cut must preserve every historical revision item exactly; a parent pointer by itself is never sufficient. Duplicate references and normal listed history are supported. Incomparable heads, missing intermediary links that leave multiple listed heads, malformed pages, cycles, missing data and unsupported manifests remain refusals. Current projections or compaction that replace historical operation identities and cannot prove exact retention remain safely refused; arbitrary historical recovery is not claimed. Neither listing order, timestamp nor largest item count selects a winner. The chosen checkpoint still passes the complete original staged graph/owner validation and activation.

Durable stage/receipt/epoch state stays in the original owner. Restart uses the same restore ID and original stage; a lost transport response can resume without replacing destination state. Pause/close fences pending reads and the original in-transaction checkpoints. It is **not** an undo operation. `state` describes session scheduling; `recoveryState` independently reports restoration knowledge. If the original owner confirms `activated` after pause/close, it remains `restored`. Any rejected activation has `settlement-unknown` until original durable receipt/epoch verification succeeds; it does not claim rollback. No exception text or content is exposed by the snapshot.

Discovery limits are 4096 listed entries/pages and decoded checkpoint items, 2 MiB cumulative page plus declared encoded/decoded object bytes, and a default 30-second deadline. A caller may lower but cannot raise this deadline. Held list/get calls settle publicly by deadline, pause or close; the session invalidates their serial and refuses late completion. Raw object length is checked before the original reader can copy bytes. The existing parser, transaction and canonical limits are unchanged. This transport contract has no physical cancellation primitive: ending the session wait does not claim cancellation of underlying IO or prevent allocations inside a supplied transport. Activation is not raced against a timer: the original strict transaction/consumer publication must report its real outcome. The production provider adapters must supply qualified request cancellation/binding.

## Verification

Node 22.23.3 (existing isolated official runtime), Python 3.12.14, macOS; actual tests use original Core/Repository/domain owners with repository fake IndexedDB and synthetic fixtures. No browser, build, package installation, APT or cloud execution.

- Initial new cases: 10/10 (`first.log`).
- Coordinator correction with original 10 cases: 10/10 (`corrected.log`). A test-edit command initially used an incorrect relative path and did not modify the test; this log is explicitly the original 10 cases, not the subsequently added cases.
- Added settlement/history cases: 16/17 (`settlement-and-history.log`). The one failure expected `STORAGE_FAILED` for the explicit pause checkpoint; original repository correctly preserves the typed `BNS_RECOVERY_INTERRUPTED`. Only that expectation was corrected, without changing production error mapping.
- First owning batch: **87/87**, no fail/cancel/skip/todo, exit 0, TAP 9271.683584 ms (`owning.log`). It includes the two new files plus original group checkpoint restore/plan/audit/old-reader, restore epoch and Settings detail/local-state tests.

- After independent review: **94/94**, no fail/cancel/skip/todo, exit 0, TAP 8737.137541 ms (`reviewed-owning.log`), same owning batch plus the real stale-cut forged-parent regression, held list/get deadline and late-response fencing, pause/close held discovery, and oversized transport-copy refusal.

The old UI Data owner test has one exact contract update: add `settings-sync` before `settings-history` in its existing destination array. All other assertions remain intact. This native file was not executed in this local batch; the takeover integration owns the combined native verification.

The added cases use two genuinely separate installations and close the sender before restore. They check exact Source/Working content, no outgoing echo, retry with the original stored stage, late transport completion, real canonical transaction rollback, local-edit fences, causal historical selection and incomparable genuine checkpoints. Post-commit pause/close and response-loss injections wrap the real Core transaction **after awaiting its successful commit**, without substituting writes or constructing an activation receipt.

## Remaining local implementation (not external blockers)

This package completes one recovery-coordination gap; it does not clear `canonical-readiness` or accept SYNC-01. The original mixed current projection and portable configuration owners already exist and are reused rather than rewritten. Remaining C includes lawful Source-linked Thought/shared bodies, saved/adopted protected work, full Source/import/structure provenance and supported legacy bindings. The current human codec still explicitly admits independent `user_created` entries with no Source/Input references. The original grouped restore remains limited to 384 items, 128 retained operations and 128 rows per owner family; no arbitrary corpus completeness is implied. Populated destination merge, cross-domain negative intent, canonical migration, bounded paging beyond existing whole-corpus 128-operation assumptions and the required integrated scale matrix remain local work. No caps are increased and no data family is silently dropped.

Mutation availability must be tested as well as static recovery: TopicLifecycleService currently refuses its mutation path when `humanLibraryJournal` is installed (`BNS_HUMAN_UNSUPPORTED_MUTATION`). A recovered snapshot cannot be used to claim automatic lifecycle/Sync closure. The takeover root owns the lifecycle technical-policy work; this package leaves those runtime files unchanged.

## SYNC-02–06 separation of implementation and external evidence

A source/path audit of current `extension/core` and related Sync tests found protocol Core, immutable object verification, publication, inbox and staged restore components, but no production Google Drive/OneDrive adapter or CloudKit bridge. The current UI deliberately cannot activate a missing provider.

| Stage | Local work that remains implementable | Separate external acceptance |
|---|---|---|
| 02 Chrome | Adapter interface and injected-transport conformance, app-data-only request construction, binding to verified subject/generation, OAuth result parsing/cancellation without real credentials, paginated discovery and immutable completion mapping | Real registration/release identity, account consent, actual appDataFolder containment, token lifecycle and lost-device recovery |
| 03 hardening | Deterministic failure mapping (revocation, 403/429/quota, interrupted/unknown completion), stale in-flight account binding, pause/disconnect/retirement distinction, fake-transport partial deletion and restart, current local canonical/conflict gates | MV3/uninstall/update and real provider failure/retention/idle evidence, authorized representative historical migration |
| 04 Edge | Same Core transport conformance, scoped OneDrive app-folder request/cursor/result adapter, typed local failure and binding checks; no general Drive fallback | Microsoft registration/delegated AppFolder/redirect and account-type qualification |
| 05 Safari | Strict typed JS/native bridge envelope, caller/version/container binding and injected host response tests; native app implementation/build where toolchain permits | Entitlements/signing/container identity, real iCloud/CKAssets account-change and platform lifecycle tests |
| 06 common | One provider-parameterized synthetic protocol/convergence corpus, truthful availability state, local UI keyboard/reflow coverage, exact per-owner comparisons | Platform provider/security/migration/performance, real screen reader/IME, release and supported account/browser acceptance |

These local adapter/bridge tasks are not declared blocked merely because real credentials are absent. They must follow current official provider contracts and cannot enable default production behavior before the existing gates. This package has not implemented or tested those adapters.
