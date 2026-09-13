# UX-R3 Implementation and Certification Report

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
