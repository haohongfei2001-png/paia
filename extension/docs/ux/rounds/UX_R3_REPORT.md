# UX-R3 Implementation and Certification Report

## Recovery certification — 2026-09-14

- Round: **UX-R3 — COMPLETE**. All eight required commands passed on the same fixed implementation snapshot; the report/status checkpoint is documentation only.
- Recovery start commit: `ce037bc8dd6154ec873bb85679ae2b35b9ce65f5` on `ux-r2`.
- Certified implementation/test commit: `e0d7fb09cae70e42c6a92c91e0a56d08ccb379da`. The documentation checkpoint preserves the certified runtime/test digest.
- Scope remains UI-09 / UI-10 / UI-11 / UI-12 and related UI-20, the existing Thought binding contract, MIG-05 / MIG-06 / MIG-10. Earlier completion statements are historical evidence, not a substitute for current execution.
- Unfinished later-round work remains separate from this R3 receipt. Certification used the R2 checkpoint plus only the eight R3 runtime/test changes listed below. All 755 tracked extension paths were independently compared with that expected snapshot; its only other differences were older R2 report/status Markdown, which are not runtime or test inputs. The unfinished R4/R5 changes remain in the main working tree for their own rounds.

### Repairs and regression coverage

The recovery audit found two related failures in the existing editing/history path: an advanced complete-reference edit could save its body and note together but return a revision that could not undo that complete operation; and the first Input propagation within a batch could make another live sibling Thought's in-memory revision stale. `core/library-edit.js` now rereads the current transaction's sibling rows and completes the existing shared-body revision with companion fields before the transaction commits. `core/thought-history.js` preflights shared target bodies, writes each shared Input once, rereads propagated siblings and restores every field belonging to the selected edit. It retains both Input and Thought revision checks and the existing one-time archive confirmation when the advanced setting is off.

Further mixed-batch review found that a shared-body edit followed by a sibling metadata-only edit could reuse a hash computed for the sibling's previous body. In the opposite order, later Input propagation could make an earlier returned Save DTO stale; mixed metadata/body Undo had the same returned-version problem. Save and history results now reread all affected rows after the entire transaction has finished its writes. A precomputed exact signature is stored only when both the final body and type still match the hash inputs; otherwise it is removed for existing maintenance to rebuild, instead of indexing old content. Hash computation stays outside the IndexedDB transaction.

The same history repair keeps note-only Undo independent of a later Input body revision. Restoring an older body also preserves surviving human note/title/organization protection, so aggregate human flags cannot make a later independent note eligible for source-dependent deletion.

An additional batch conflict was reproduced in both orders: a shared-body Undo could target one Input body while another historical restoration tried to rebind a Thought to a different body of the same Input. History now validates all planned rebindings against all shared Input targets before the first write. An incompatible batch returns a conflict without changing bodies, provenance, dependencies, revision history or operation receipts.

`core/topic-reading-state.js` now stores an ordering point with the existing bounded device reading anchor. A removed placement or cleared source-dependent quote can resolve to the next safe Thought in the selected reading order, or the last safe remaining Thought when there is no successor. The Topic page announces that the former location was removed instead of silently returning to the beginning. Existing section ordering and source/capture/creation chronology remain authoritative.

Eleven focused domain regressions were added, with existing assertions retained:

1. Shared body plus note Undo/Redo restores the complete edit, checks current authority, and rolls the entire transaction back after an injected write failure.
2. One batch can update two distinct live Thoughts referencing the same Input and Undo/Redo both without stale sibling revisions or duplicate Input writes.
3. Note-only Undo after a later Input edit keeps the current body and live binding intact.
4. Restoring an automatic whole body cannot clear protection on a later independent human note; the note survives subsequent source purge while the source-dependent body is cleared.
5. A removed middle Topic placement resumes at its safe successor in both ascending and descending order, including legacy anchors whose order can be recovered from retained metadata; anchor storage contains no body and is absent from Backup.
6. A purged middle quote cannot remain a resume target; its safe neighbor remains selected before and after purge cleanup.
7. A body-first mixed batch with a metadata-only sibling returns final versions and cannot leave an exact signature for the old body/type.
8. A metadata-first mixed batch followed by shared-body propagation returns the sibling's final revision, field revisions and binding/Input revision; returned values can be used for the next edit.
9. Mixed history with note-only restoration before shared Input Undo/Redo returns revisions after every later sibling propagation.
10. A shared-body Undo followed by an incompatible historical Input rebind rejects the entire batch before any write.
11. The reverse order, historical rebind before shared-body Undo, rejects identically and preserves all data and operation receipts.

The real-browser suite adds a middle-of-topic removal journey using actual trusted worker commands, placement revisions and persisted reading state. It verifies the neighbor is the first returned reading item, the removed placement is absent, the underlying Thought remains unchanged, and the nearby-location notice is visible. The existing advanced-edit journey now changes a whole body and its note in one editor input event; declining Undo leaves both intact, and accepting the one-time confirmation restores both without enabling the global setting. The strengthened journey first focuses the real editable body and asserts Undo actionability; its first certification attempt exposed an unfocused synthetic input event that left the focus-revealed Undo control unavailable. That failed attempt is retained as failure evidence, and the corrected journey retains the original confirmation assertions while adding note preservation after cancellation. Existing whole/partial binding, two-Topic consistency, Source identity, IME/draft retention, responsive and zero-network assertions remain in place.

### Exact changed paths and reused ownership

| Path | Responsibility |
|---|---|
| `core/library-edit.js` | Atomic batch edit, shared revision completion, safe exact signatures and final transaction DTOs |
| `core/thought-history.js` | Whole-operation Undo/Redo, sibling propagation, final returned revisions and human-field protection |
| `core/topic-reading-state.js` | Safe resume resolution using bounded body-free ordering metadata |
| `ui/thoughts.js` | Visible nearby-location notice during existing anchor restoration |
| `ui/thought-copy.js` | English copy for the same location notice |
| `tests/ux-r3-thought-binding.test.mjs` | Nine editing/history regressions, including both mixed-batch and conflicting rebind orders |
| `tests/ux-r3-topic-actions.test.mjs` | Two removed/purged-anchor regressions |
| `tests/ux-r3-thought-chrome-e2e.test.mjs` | New nearby-anchor journey and strengthened shared body/note Undo journey |

All paths are relative to `extension/`. The implementation reuses the existing Thought/Input binding services, `editSharedBodyFromEntry`, field authorship/protection, revision journal, operation transaction/receipt, placement index, chronology projection and `reading:v1` meta row. It adds no duplicate Source/Input/Thought body store, entity family, provider, permission or dependency.

### Migration, Backup and limits

- **MIG-05:** Existing binding migration remains metadata-only, resumable and conservative for ambiguous legacy links. This repair preserves Source identity/body, user work, placement semantics and existing binding/revision DTOs; it does not reattach an independent Thought through a read path.
- **MIG-06:** Advanced reverse editing remains off by default and off after Backup restore. A one-time Undo confirmation authorizes only that operation and does not change the setting. Historical authorized Input edits are not retroactively undone.
- **MIG-10:** Existing Backup round-trip, old-format restore, interrupted migration, malformed/unknown binding rejection, re-capture and deletion/fence tests remain required. Shared edit snapshots continue through the existing revision format; no new body format is introduced.
- New anchor order contains only `sectionId`, `sectionRank`, `time` and `entryId`. It shares the existing maximum of 200 device reading anchors. Neighbor discovery reads the existing placement index in pages of 100 and retains only two body-free candidates; it does not retain a collection of entry bodies. Reading anchors remain excluded from Backup, with no grants or credentials added to export.
- A legacy anchor without saved ordering first uses the old entry and placement metadata when both remain available. If deletion or layout replacement has removed that information too, its exact former neighborhood cannot be reconstructed: the resolver uses the first safe remaining location in the selected order and shows the location-change notice. It does not infer missing order from content or recover purged text. An empty or removed Topic supplies no unsafe fallback.
- Design Tokens and product defaults: **unchanged**. No sorting, authorization, capture, deletion or source-identity semantics were relaxed.

### Required commands and evidence

The additional mixed-batch cases first reproduced three failures: body-first retained an outdated signature, metadata-first returned revision 3 instead of 4, and mixed history returned revision 5 instead of 6. `work/recovery-r3-diagnostics/paia-r3-mixed-batch-red.log` records 12 passes and those 3 failures. After the repair, `work/recovery-r3-diagnostics/paia-r3-mixed-batch-green.log` records both R3 domain files at **23/23 PASS, zero failures/skips**. These focused results demonstrate the repaired failures; they do not replace any required gate below.

The incompatible rebind diagnosis separately reproduced **0/2 PASS** before repair. The final focused run, `work/recovery-r3-diagnostics/paia-r3-mixed-and-rebind-final.log`, records **25/25 PASS, zero failures/skips**, including both atomic rejection orders. An in-progress full certification attempt was explicitly stopped when this additional real conflict was found; its incomplete output remains diagnostic only. All eight commands below were restarted on the final fixed source.

| Command | Exit | Executed / result | Skipped | Evidence |
|---|---:|---|---:|---|
| `npm run test:unit` | 0 | 878/878 PASS | 0 | `work/recovery-r3/unit.log` |
| `npm run test:browser` | 0 | 23/23 PASS | 0 | `work/recovery-r3/browser.log` |
| `node scripts/test.mjs "adapter contract"` | 0 | 95/95 PASS | 0 | `work/recovery-r3/adapter.log` |
| `node scripts/test.mjs "privacy/security"` | 0 | 52/52 PASS | 0 | `work/recovery-r3/privacy.log` |
| `npm run check` | 0 | 8,255 guards / 188 resources PASS | — | `work/recovery-r3/check.log` |
| `node scripts/check_development.mjs` | 0 | Privacy / permissions / network audit PASS | — | `work/recovery-r3/development.log` |
| `npm test` | 0 | 1,048/1,048 PASS; unsharded, fullSuite/auditPassed=true | 0 | `work/recovery-r3/full.log` |
| `npm run build:release` | 0 | 7,827 guards / 181 resources PASS / 205 files | — | `work/recovery-r3/release.log` |

- Input digest: `f65d659aa6e391cb23b28c34ea7473b7da83e207be6b2ece1e0258e80e4a425e`.
- Runtime digest: `40b5532fdefcbe8ce4a453166252b6bff19753c1fb13f8d089f558832fd15557`.
- All required commands executed on the same snapshot and independently confirmed `sourceUnchanged=true`. Earlier failed/interrupted attempts are preserved under `work/recovery-r3-diagnostics/`; none counts as PASS.
- Final receipt: `work/recovery-r3/receipt.json`; `fullSuite=true`, `auditPassed=true`, concurrency 1, zero failures/skips, with 128 hashed browser PNG/JSON artifacts. Environment: macOS arm64, Node 24.19.0, Playwright 1.63.0, headless Chrome 152.0.7977.83. Remote CI uses Node 22; no remote CI run is claimed.
- Browser evidence: `work/recovery-r3/browser/ux-r3/`, including `removed-topic-anchor.png`, `mobile-done.png`, `draft-save-error.png`, four viewport sizes in light/dark, keyboard, IME, 200% text, reduced-motion and no-network assertions. Direct review covered the new nearby-anchor screenshot, 320px dark Topic, mobile Done and failed-save retained draft. All five R3 journeys passed in both the browser gate and the unsharded full suite.
- F-LARGE: 100,000 Inputs / 1,000 documents / 300 Topics / 5,000 Thoughts; actual IndexedDB seeding and rendering. Topic read returned 40 items with truthful pagination, 0 writes, about 908 ms, 10,242 reads and 5,162 scans. Evidence: `work/recovery-r3/browser/ux-r3/large-fixture.json`. Existing ordering descriptors remain body-free; the nearby resolver retains only two candidates.
- Source/Input equality, exact shared edits and one-time authority, zero Provider/unexpected network calls and no page errors are asserted in the real-worker journeys. These are synthetic isolated headless tests; no everyday profile or live Provider was used.

### Completion gates and handoff

| Gate | Certification status |
|---|---|
| G-01 Repo baseline | PASS — active ux-r2; exact scoped commit and source proof above |
| G-02 Scope / compatibility | PASS — existing ownership, MIG-05/06/10 and eleven domain regressions |
| G-03 Unit / domain | PASS — unit 878/878 and complete full suite |
| G-04 Real browser | PASS — browser 23/23, all five R3 journeys twice |
| G-05 Trust regression | PASS — adapter 95/95, privacy/security 52/52, deletion/Backup/history regressions |
| G-06 Visual / a11y | PASS — current viewport/theme matrix and reviewed screenshots above |
| G-07 Release | PASS — both audits, exact full receipt and current release build |
| G-08 Handoff | PASS — report/status aligned to certified code and documentation checkpoint |

The implementation audit has identified no unresolved R3 product/architecture blocker. This report does not claim live-provider validation, remote CI execution, product retention or optional user-sampled review. Next round may start: **YES — UX-R4**, under the user's explicit authorization. Stay on `ux-r2` and stop after UX-R6 and its final regression.

---

## Historical certification — 2026-09-13

## Round identity

- Round: **UX-R3**; local certification on 2026-09-13.
- Start commit: `1e79b173fcb652652c8f400e8c3d9112fff66ed0`; clean `ux-r2`, ahead of `origin/ux-r2` by two commits.
- End commit / certified implementation and test HEAD: `ff0475edb67b4aa185da7c4daeeec29841e97d95`.
- Scope: **UI-09/10/11/12, related UI-17/20; DELTA-03; MIG-05/06/10**.
- Authority: AGENTS → Design Core → Development Specification → implementation status → PRODUCT → ARCHITECTURE → ROADMAP → relevant privacy, Backup and Context contracts.
- Actual remote main at preflight: `61d2910a85fa6169b4cb716b2fdcb764a1892b3d`. Compared with the R2 starting baseline, its changes affected 13 website files, not extension/CI. Main was neither checked out nor merged.
- The documentation checkpoint following the implementation commit preserves its runtime/test digests. No push, deployment, remote certification or subsequent-round work is claimed by this report.

## Delivered behavior and reused services

The Thought Library has stable topic order, at most two separate recently read topics, a portable list/grid preference and optional bounded organizing controls at the point of use. Topic reading retains the existing document and editor while adding genuine device-local positions, a weak directory, provenance, read-only Source/current-Archive comparisons and mobile Edit/Done.

Add to Topic accepts a whole current Input, a real grapheme-safe selection, or an existing Thought. It checks saved revisions, enumerates existing targets and can create a topic. Same content/version/range reuses an exact existing reference; distinct human rewrites remain distinct. Placement of the same Thought does not create a second canonical body. Thought excerpts preserve evidence and deletion restrictions. Continue Writing requires nonblank text and can save an independent Thought without a topic. Optional response context remains context-only and does not turn newly written text into an Input mirror. Failed saves keep the buffer and stable operation ID, with Retry/Copy and explicit discard protection.

The first genuine edit of a valid whole Input reference detaches the existing Thought by default, preserving Input and immutable Source. The advanced reverse-write switch defaults off and permits only future, still-valid one-to-one whole references with both revisions checked atomically. Partial references, multiple-source synthesis, AI drafts and already independent Thought edits never reverse-write. Re-enabling the switch never replays old edits. Explicit comparison and restoration create a new Thought version and rebind to the current Input only after both versions are checked.

Undo/Redo restores the whole edit transaction, including binding, protection/authorship and body. Shared Undo checks both revisions; if the advanced switch has since been disabled, a one-time confirmation is required and does not reopen the global switch. Source purge removes dependent quoted/rewritten bodies and recoverable history while preserving provably independent human writing and notes.

Existing owners remain authoritative: ThoughtStore, LibraryDocumentsStore, library-edit, shared-working-content, organizer reading, provenance/dependencies, existing revisions, PlainTextSurface/editor primitives, trusted service-worker dispatch and existing Backup. There is no new body table, durable entity family, physical schema version or provider permission.

## Changed paths

- Added domain helpers: `core/thought-binding.js`, `core/thought-history.js`, `core/topic-actions.js`, `core/topic-reading-state.js`.
- Updated domain owners/read paths: `core/thought-store.js`, `thought-model.js`, `thought-evidence.js`, `thought-maintenance.js`, `shared-working-content.js`, `library-edit.js`, `library-documents-store.js`, `reader-state.js`, `organizer/store.js`, `organizer/topic-reading.js`.
- Compatibility/trust: `core/backup-format.js`, `core/backup-service.js`, `background/service-worker.js`.
- UI: `ui/topic-actions.js`, `thought-copy.js`, `thought-reader.css`, `thoughts.js`, `library-entry-editor.js`, `archive.js`, `archive.html`, `reader-navigation.js`, `core-loop.js`.
- Tests: `ux-r3-thought-binding.test.mjs`, `ux-r3-topic-actions.test.mjs`, `ux-r3-thought-chrome-e2e.test.mjs`; retained shared-edit, evidence, Backup, AI and sender/privacy suites updated for the explicit new default.
- Contracts: PRODUCT, ARCHITECTURE, AI_CONTEXT, BACKUP, this report and implementation status. Package guard adds only the scoped composer keyboard-handler exception.
- CI explicitly includes R3 browser certification and evidence upload. Existing unit shards, current browser journeys, unsharded Full Suite, macOS Secure Store and aggregate certification remain required.

## Migration and compatibility

| ID | Evidence |
|---|---|
| MIG-05 | Versioned, resumable 100-row batches classify existing Thought metadata without rewriting bodies or old revisions. Whole binding requires every primary reference to prove the same Input and complete range. Ambiguous legacy links become protected Thought bodies; known independent/AI metadata is preserved. Repeated/interrupted migration, genuine old Backup with new fields removed from entries and revisions, canonical Reader/Search/evidence/Context DTOs and old Input history are tested. |
| MIG-06 | Strict versioned boolean metadata in existing meta. Default and restore are off. Both revisions and valid whole provenance gate every reverse write, including Undo. No backward replay or automatic reconnection. Default-off, enabled, switch-off Undo, stale races and restart/restore tests pass. |
| MIG-10 | Existing Backup whitelist validates binding kind, IDs, revisions and ranges, plus the layout preference. Unknown/malformed binding metadata is rejected. Portable bindings and layout round-trip; advanced reverse writing restores off. Topic/Reader positions, temporary output and credentials remain excluded. Purge and recapture retain tombstone safety. |

The migration summary in Advanced Settings is body-free. Existing Source identity/time, manual protections, retained old version formats, permission exclusions and deletion precedence remain covered by the full suite.

## Required commands

Environment: macOS 27.0 arm64, Node 24.19.0, npm 10.9.4, Python 3.12.14, Playwright 1.63.0, Chrome 152.0.7977.83. All browser execution uses synthetic isolated headless profiles (`PAIA_HEADLESS=1`). No visible browser or everyday profile is used.

| Command | Exit | Executed / validated | Skipped | Evidence |
|---|---:|---|---:|---|
| `npm run test:unit` | 0 | 855 PASS | 0 | `work/ux-r3/unit.log` |
| `npm run test:browser` | 0 | 16 PASS | 0 | `work/ux-r3/browser.log` |
| `node scripts/test.mjs "adapter contract"` | 0 | 95 PASS | 0 | `work/ux-r3/adapter.log` |
| `node scripts/test.mjs "privacy/security"` | 0 | 51 PASS | 0 | `work/ux-r3/privacy.log` |
| `npm run check` | 0 | 8,055 guards / 182 runtime resources | n/a | `work/ux-r3/check.log` |
| `node scripts/check_development.mjs` | 0 | privacy / permission / network audit PASS | n/a | `work/ux-r3/development.log` |
| `npm test` | 0 | **1,017 PASS**, unsharded, 0 fail | 0 | `work/ux-r3/full-suite.log`, `full-suite-summary.json` |
| `npm run build:release` | 0 | 7,627 emitted guards / 175 runtime resources / 199 files | n/a | `work/ux-r3/release.log` |

The unchanged-source full receipt records `fullSuite=true`, `auditPassed=true`. Subsequent standalone groups do not replace that preserved receipt. The release version remains 0.12.0.

- Input digest: `cf8eec92525d7af88e72a82de689fc1b5a997dd1b549d774e991dd45f07c0b1f`.
- Runtime digest: `5086ad92e06443ee84890e4307009456575b3b1723be8309ca2e49af326c871a`.
- `work/ux-r3/certification.json` records the digests, full-suite groups and screenshot SHA-256 checksums.
- Optional user-sampled golden data is explicitly `UNAVAILABLE`. The 76 pre-migration historical browser files remain a separate evidence group; they are neither removed nor claimed to pass.

## Real-browser and visual evidence

The current group includes all R1/R2 and Round 4.8/4.9/4.10 journeys plus four R3 journeys through the actual service worker and Chrome IndexedDB:

1. Capture → whole Input → picker/new topic → default Thought edit → Undo/Redo → same Thought in another topic → changed Input → Source/current comparison → explicit rebind.
2. Native Input Range selection → partial Thought; real Advanced switch → whole dual edit while partial remains independent → switch-off Undo confirmation; IME and capture retain the editor DOM; mobile Edit/Done flushes successfully.
3. Independent unplaced writing, empty-save refusal, cancel/discard, IME, injected save failure, Retry/Copy and Ctrl/Cmd-Enter; stable home/recent/layout; English shell switch leaves Chinese user content unchanged.
4. Actual F-LARGE IndexedDB fixture: 100,000 Inputs, 1,000 documents, 300 valid topics, 5,000 Thoughts and a 50,000-character Input. Bounded topic pages and index return 40 items; actual topic opening/anchor, home Back and browser Back/Forward preserve their target.

There are 47 screenshots in `work/ux-r3/`: `picker-`, `topic-`, `compare-`, `compose-`, `home-` with light/dark at 1440×900, 1024×768, 390×844 and 320×720; plus mobile Done, failed-save, 200% scaling, English and large-library states. Keyboard, focus, real selection, IME, reduced motion and horizontal overflow checks are part of the browser tests. Representative mobile/light and composer/dark screenshots were inspected directly.

`large-fixture.json` records the latest synthetic measurements. The certified full-suite run seeded the fixture in 109.4095 s with 5,220 renderer heartbeats. The bounded topic read took 1,842.5 ms, 10,242 reads, 5,162 metadata scans and zero writes, returning 40 bodies with a real continuation cursor. Topic chronology still inspects the topic's ordering metadata; this is not claimed to be constant-time over all placements. Passive home/Reader views no longer trigger an unrelated full-library AI status read.

## Resolved failures and network assertions

Verification exposed and fixed default reverse-write bypasses, overly broad context-only evidence acceptance, migration changing already known AI protections, computed read fields being persisted, missing consent checks on new commands, a comparison panel invalidating itself, unsupported composition property handlers, stale navigation completion overwriting Back/Forward, lost topic cursor anchors and passive unbounded AI status work. English verification found untranslated static controls; final product-only localization updates labels without translating user content. Full certification was rerun after the final source edit.

All R3 journeys assert **zero DeepSeek requests, zero extension network requests, zero unexpected external requests and no page errors**. Fixture capture responses are local. No live-provider or logged-in-user verification is implied.

## Tokens, limits and handoff

No Design Token JSON changed. New surfaces use existing light/dark colors, prose width, control size, focus, spacing and reduced-motion tokens. There are no new providers, remote requests, body stores or permission expansions.

Known limits: automated synthetic headless verification is not user retention, physical-device or live-provider certification; existing Backup 64 MB / 100,000-item limits remain; contextual response evidence retains the existing 4 KB context bound, and unavailable context does not prevent independent new writing; failed drafts are retained in the current page, not a new durable draft store. Source/time availability is stated rather than inferred. No unresolved blocker remains.

| Gate | Result | Evidence |
|---|---|---|
| G-01 Repo baseline | PASS | Actual branch/tree, main SHA, baseline delta and service paths checked. |
| G-02 Scope / compatibility | PASS | UI-09/10/11/12/17/20, DELTA-03, MIG-05/06/10; existing ownership preserved. |
| G-03 Unit / domain | PASS | 855 unit tests; 14 new R3 domain tests plus retained compatibility suites. |
| G-04 Real browser | PASS | 16 current Chrome journeys, including four R3 journeys and F-LARGE. |
| G-05 Trust regression | PASS | 95 adapter / 51 privacy tests; consent, canonical body, provenance, purge and Backup checks. |
| G-06 Visual / a11y | PASS | 47 screenshots, required matrix, keyboard, IME, mobile Done, reduced motion, 200% scaling. |
| G-07 Release | PASS | Eight commands, final-source full digest, package/development/release validation; mandatory CI retained. |
| G-08 Handoff | PASS | Report and status identify certified source, migrations, receipts, limits and next round. |

UX-R3 is COMPLETE at its documentation checkpoint. UX-R4 may start under the user's renewed authorization. Its starting point is the existing unified Search and trusted Context/Passport path; fixed manual selection and permission changes have not been implemented in R3. The later user instruction authorizes subsequent UX-R5 after R4 is certified, without skipping either prerequisite or entering UX-R6.
