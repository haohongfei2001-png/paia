# Saved restore search-discovery correction

## Result and identity

- Local candidate commit: `30802c1448e244878e636549735125f259355db8`.
- Exact parent: `eeebc743e146a5fb622f18bc5dab8e98b4e86682` (previous Human pending-completeness slice).
- Branch: `codex/dot-cloud-saved-search-discovery-20261024`.
- Only `extension/core/browser-native-sync/saved-work-bootstrap.js` and new `extension/tests/saved-bootstrap-search-discovery.test.mjs` changed. Runtime: 10 additions, 3 removals. Tests: 126 added lines. No prior test edited or removed.
- Final new owner suite: **26/26 PASS**, 5775.797195 ms. Original four complete owner files: **98/98 PASS**, 7338.36631 ms. Zero failures/cancellations/skips/todos in these candidate runs.
- Original red is preserved: **2 tests, 1 PASS, 1 FAIL**, 1023.309637 ms, exit 1. It remains a failure at original bytes.
- Node **v24.19.0**, Linux x64, synthetic fake IndexedDB and in-memory fake cloud. Not Node22, Mac, native browser, installed extension, GitHub CI, Full, 100k or 129-group recovery evidence.

## Actual cause, not an assumed missing-locator invariant

Original `thought-store-owner.js` writes a newly restored Saved Entry/provenance/dependency/history, then calls `finishSavedWorkBootstrap`. Neither schedules search. Restored Entry already has the current `searchVersion`, so simply invoking `queueSearch` would return early.

A cold installation with no rebuild marker is a legitimate original state: search creates a pending marker, and original maintenance scans and indexes the retained Entry. The original first test proves that state and unchanged reexport. Therefore `requireSavedWorkScope` was **not** changed to require locator cardinality.

The real bug requires another legitimate state: original maintenance completes an **empty** target's search rebuild before original Saved restoration. Activation inserts canonical Entry but creates no locator and does not invalidate the completed marker. The original search returns:

`{"complete":true,"indexing":false,"items":0,"queue":0,"postings":0}`

for the retained body. The original second test fails the invariant that retained content must either be found or truthfully reported rebuilding. No mock supplies successful rows, capabilities, owner results, search results, or marker status.

Relevant original contract: `BROWSER_NATIVE_SYNC_CONTRACT.md` lines 60, 139–141 makes search derivative local state and requires truthful restored/rebuilding readiness; `BROWSER_NATIVE_SYNC_PLAN.md` line 45 requires actual original rebuild rather than artificial permanently-pending state. These contracts do not make derivative rows portable canonical truth.

## Minimal original-owner correction

1. After its original exact canonical-write verification, `finishSavedWorkBootstrap` derives the locator with existing `planSearchQueueLocator` from the private expected Entry. It reads only that exact owner key, preserves an identical existing pending row, rejects a conflicting row atomically, and writes only when absent.
2. The existing original final read fence now also proves that exact locator. All prior Source evidence, authority, tombstone/suppression, original canonical/history/protocol/final-count and time checks remain.
3. The group application derives Saved search intents from actual prepared new members, accounts their retained bytes under the unchanged 2 MiB limit, and appends the original Human intents without mutating the Human array.
4. Original group final proof checks every combined intent and the exact whole migration table count for Saved-only as well as mixed activation. It deletes no unrelated row to satisfy count. Cold group already required the original empty scope before writes; standalone Saved does not acquire a new global count constraint.

Duplicate direct bootstrap exits through the original owner before this finish seam; already activated group replay exits through its existing readonly path. Neither rewinds a partial queue nor requeues an indexed or removed Entry. No global rebuild marker, `thought-store-owner.js`, `library-search.js`, group-checkpoint, IDB repository, publication, recovery, context-connections, scope or native eligibility guard changed.

## Evidence and commands

Original baseline probe ran once at parent `eeebc743`:

`node --test ../evidence-saved-search-review/saved-search-original-owner.test.mjs`

Preserved exact source/log copies: `original-owner-boundary.test.mjs`, `original-owner-boundary.log`. The source still imports the frozen prior worktree. Its first test explicitly documents the old no-locator state; this two-test historical diagnostic is not relabeled as a candidate green test.

Candidate new owner suite:

`node --test extension/tests/saved-bootstrap-search-discovery.test.mjs`

- `search-discovery-first.log`: first 19/19 pass.
- `search-discovery-owning.log`: expanded 23/23 pass.
- `search-discovery-final.log`: final frozen 26/26 pass.

Original owning regressions, unchanged complete files:

`node --test extension/tests/saved-work-bootstrap.test.mjs extension/tests/browser-native-sync-saved-group.test.mjs extension/tests/browser-native-sync-saved-mixed.test.mjs extension/tests/browser-native-sync-saved-multiple.test.mjs`

- `saved-owner-regressions.log`: 98/98 pass at the same frozen runtime bytes.
- Existing small work-budget checks make at most 4097 synthetic metered point reads and prove rejection despite public metric resets. They are not 129-group recovery or an exhausted scale rerun.
- Existing test titles containing “native fence” refer to raw fake-IDB terminal-fault injection in Node, not actual native browser diagnostic execution.

Both modified files pass `node --check`; `git diff --check` passes. Final commit/worktree identity is in `COMMIT.txt` and `final-identity.log`.

## Positive and negative boundaries

- Real original no marker, completed-empty marker, and in-progress marker already past Entry scan: activation retains the unchanged marker, schedules exact pending locators, reports `indexing:true/complete:false`, and bounded original maintenance produces actual searchable bodies with `indexing:false/complete:true`.
- Two Saved Entries and one independent Human Entry retain all three exact tasks and produce search hits through the existing engine.
- Original Source+Saved receiver and standalone Saved after original Source receiver both schedule discovery.
- Genuine original partial indexing at `phase:write,offset:200` survives both group and direct duplicate replay byte-for-byte, then completes. Completed indexed duplicates also leave every table unchanged.
- Original legacy no-locator cold export remains accepted, without mutation. Candidate legacy-shaped case is explicitly a synthetic derivative deletion, grounded by the untouched original positive proof.
- Identical preexisting task remains intact; conflicting-version or in-progress task for a *new absent* canonical owner rejects without overwriting anything. Unrelated standalone pending work is preserved.
- Missing/changed phase/version/foreign replacement/extra tasks after owner execution abort every table. Additional standalone terminal tests prove its own point fence independent of group count.
- Mixed Human faults select the exact Human `ownerId`, avoiding the old test's unstable first-row selection after Saved queues join the table.
- A raw extra locator injected in the final backup-generation tail fails the Saved-only final table count and rolls every table back.
- Fault immediately after the actual Saved writer sees the new locator and rolls it back with all canonical/protocol work.
- Original final deletion fact remains rejecting. Real Entry removal, completed cleanup and duplicate Saved replay remain unsearchable and cannot resurrect/requeue the Entry.

## Scope and remaining boundaries

This corrects newly executed original Saved bootstrap discovery. It does not migrate previously affected active installations. Legacy no-locator export is retained rather than hard-rejected. Ordinary indexed Saved export/merge remains at its existing profile boundary; this slice does not loosen zero-postings or exact canonical derive checks and does not claim indexed portable truth.

New necessary queue writes/reads and terminal proofs remain metered under all existing budgets. No limit, case count, timeout, final fence or negative control was reduced. Large combined activation performance/capacity was not measured and is not promised.

Automatic Context's seven-runtime WIP, Working capability lifetime, future Source/Working/Human composition, full-table A/B search oracle, native-linked qualification and original four failing large Node attempts remain independent unfinished evidence. The prior final fence failure of 3454 refs / 2099146 bytes / about 237 ms against 2 MiB remains a failure; this work neither reruns nor erases it.

No install, account, credentials, permission widening, provider traffic, push/PR, version change or deployment occurred. Root integration and independent exact-byte review are separate from this local commit.
