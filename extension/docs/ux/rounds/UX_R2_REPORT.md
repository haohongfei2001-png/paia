# UX-R2 Implementation and Certification Report

## Recovery certification — 2026-09-14

- Round: **UX-R2 — COMPLETE** after the required commands below actually passed.
- Recovery start commit: `e6556cc1347a51d846773deb831196e9a70c437f` on `ux-r2`.
- Certified implementation/test commit: `0f5c7308b7b079eaaa75dbbb844a69400fc5760c`. The documentation checkpoint containing this report preserves its runtime/test digest.
- Start tree contained unfinished R5 changes. They were preserved. Certification used an isolated copy of the committed start tree plus only the R2 repair; the corresponding commit contains exactly those runtime/test changes. Later-round corrections were not silently included in this receipt.
- Scope remains UI-03 / UI-05 / UI-08 / UI-20, DELTA-02 / DELTA-08, MIG-02 / MIG-03 / MIG-04 / MIG-10. The authority order and original migration evidence below remain applicable; earlier PASS claims were treated as historical evidence and rerun.

### Verified repair and compatibility

`ui/archive.js` now ties awaited refresh completion to the latest applicable read. A superseded response cannot release navigation before the Reader renders, consume another navigation's position, or show a stale read error on a successful newer page. Navigation anchors belong to their own intent. Sorting and explicit new-content refresh use the same completion ownership and refuse late restoration after navigation changes.

`tests/ux-r2-reader-revisit-chrome-e2e.test.mjs` retains the existing dwell, saved character, scroll, sorting, editing, privacy and visual assertions. A new actual-worker test controls delivery of real `GET_PAGE` responses around a real preference mutation. It proves stale-first and latest-first completion, an obsolete response that remains pending while the current Reader becomes usable, and rejection of obsolete error feedback. The original failure was reproduced at scroll 0 with the saved character near 944 px; the fixed deterministic journey aligns that character at 140 px.

No Source/Input/Thought body, identity, deletion rule, permission, schema or Backup format changes in this repair. Existing Reader-state migration, old-content opt-in, capture exclusions, restore defaults, Unicode/IME, failed-save retention and Source purge compatibility were executed again through the unit and full suites. The same domain and Reader services are reused; no duplicate body store or new dependency was introduced.

### Required commands

| Command | Exit | Executed / validated | Skipped | Evidence |
|---|---:|---|---:|---|
| `npm run test:unit` | 0 | 867 PASS | 0 | `work/recovery-r2/unit.log` |
| `npm run test:browser` | 0 | 22 PASS | 0 | `work/recovery-r2/browser.log` |
| `node scripts/test.mjs "adapter contract"` | 0 | 95 PASS | 0 | `work/recovery-r2/adapter.log` |
| `node scripts/test.mjs "privacy/security"` | 0 | 52 PASS | 0 | `work/recovery-r2/privacy.log` |
| `npm run check` | 0 | 8,252 guards / 188 resources PASS | n/a | `work/recovery-r2/check.log` |
| `node scripts/check_development.mjs` | 0 | Privacy / permission / network audit PASS | n/a | `work/recovery-r2/development.log` |
| `npm test` | 0 | 1,036 PASS | 0 | `work/recovery-r2/full.log` |
| `npm run build:release` | 0 | 7,824 guards / 181 resources / 205 files PASS | n/a | `work/recovery-r2/release.log` |

- Input digest: `232c8c2f25056d37e033b5bb883a8f1ea7e194538a65f7c1b056c939be561961`.
- Runtime digest: `56fb32c3b92f58f1aeb4e798c4892c642ced0afa46ebfa865685de56ea75fbc3`.
- Unsharded receipt requires `fullSuite=true`, `auditPassed=true`, zero failures/skips and an unchanged source digest. Every command also checks that the source digest stayed unchanged.
- Complete local evidence: `work/recovery-r2/receipt.json`, command logs and group summaries. The first failed baseline browser run remains separately preserved; it is not PASS evidence.

### Browser, visual and network evidence

The complete current browser group ran twice, once through `test:browser` and once through the unsharded full suite. Both use the real unpacked extension, service worker and Chrome IndexedDB in isolated headless synthetic profiles. They include the required 100,000-Input / 1,000-document / 300-Topic fixture, its 5,000-entry Topic and 50,000-character Input.

Immutable screenshots and measurements are in `work/recovery-r2/browser/ux-r2/`: `overlapping-resume.png`, Reader / Revisit / Source four-viewport light/dark matrices, selected and save-failure states, 200% and purge-empty views, and `large-fixture.json`. The receipt includes checksums. The UI/style contract is unchanged; keyboard, IME, narrow-screen editing and reduced-motion assertions remain mandatory.

R2 journeys assert zero provider, extension-network and unexpected external requests. No visible browser, everyday browser profile, private archive, live provider or deployment was used. Design Token changes: **none**.

### Completion gates and handoff

| Gate | Result | Evidence |
|---|---|---|
| G-01 Repo baseline | PASS | Branch/HEAD/tree audit; isolated R2 snapshot and recorded digests |
| G-02 Scope / compatibility | PASS | Existing MIG-02/03/04/10 tests rerun; repair changes refresh ownership only |
| G-03 Unit / domain | PASS | Complete unit and full-suite summaries |
| G-04 Real browser | PASS | Current headless Chrome suite and new deterministic overlap journey |
| G-05 Trust regression | PASS | Adapter, privacy/security, deletion and Backup regressions |
| G-06 Visual / a11y | PASS | Regenerated required visual matrices and retained interaction assertions |
| G-07 Release | PASS | Package/development audits, current release build, unchanged source digests |
| G-08 Handoff | PASS | This report, status update and named checkpoint |

No known unresolved R2 blocker. This is local engineering/UX certification; it does not claim product retention, live-provider validation, remote CI execution or the optional user-sampled golden bundle. The 76 frozen pre-migration browser files and the mandatory CI jobs remain unchanged.

Next: **UX-R3**, authorized by the user, after this checkpoint. Its prepared corrections require their own complete gates.

---

## Historical certification — 2026-09-13


## Round identity

- Round: **UX-R2 — COMPLETE**. All required local gates passed on 2026-09-13.
- Start commit: `ad386c07cff59b9b3472a5aa03626fe89514f8d1`.
- Start branch/tree: clean `ux-r2`, tracking `origin/ux-r2`; remote `main` and `ux-r2` both resolved to that start SHA during read-only preflight.
- Governing authority: `extension/AGENTS.md` → Design Core v1.0 → Development Specification v1.0 → implementation status → PRODUCT → ARCHITECTURE → ROADMAP → relevant Backup/Smart Filter/privacy contracts.
- Scope: **UI-03 reading completion, UI-05, UI-08, UI-20; DELTA-02, DELTA-08; MIG-02, MIG-03, MIG-04, MIG-10**.
- End commit / certified implementation and test HEAD: `bc2d2800a7281123e061d75d8e4df9cb2f550481`.
- The final checkpoint containing this report and the status update changes documentation only; its parent is the certified implementation commit above. Runtime/test digests are identical across that documentation checkpoint.
- No switch to or merge of `main`; no UX-R3 implementation, provider expansion, new body store or permission expansion.

## Delivered behavior and reused ownership

Reader keeps `DocumentEditor`, `PlainTextSurface`, autosave/Undo/revision primitives, source identities, existing edit/restore/purge commands, Smart Filter, Search and the existing Context reuse path. Its continuous prose uses the shared design tokens; desktop editing is direct, mobile editing has an explicit Edit/Done lifecycle. The display-only long-text collapse never truncates saved/copied/searchable content; search and resume targets expand with bounded surrounding Inputs.

The real reading position stores stable Input/revision, grapheme-safe character offset, reading order and expansion IDs after a visible three-second dwell or “记住这里”. Capture never manufactures a read. Continue/Recently Read are separate from Recently Captured. Removed/purged positions resolve nearby; new material in the current conversation offers an explicit refresh without moving the current view. The single same-URL coordinator preserves originating query/page/scroll state and owns Back/Forward for roots, Reader and Revisit.

Input autosave uses a 500 ms idle delay; composition suppresses writes. Save failures retain the actual buffer, offer Retry/Copy and block destructive navigation. Concurrent edits retain both versions and require an explicit comparison before a new CAS-protected write. Cross-Input mutation is rejected while native text copying remains possible. Undo, revision preview/restore and ordinary removal all use the existing domain transactions. Restoring a working revision creates a new revision; Source/time/identity remain unchanged.

Source text is read-only in a separate panel with genuine time, verified original-conversation links, an explicit missing-context explanation and current-work comparison. The existing user-note control edits annotations only. Permanent deletion has an explicit impact confirmation with Cancel initially focused. Removed content remains recoverable through the existing review path; purge removes source/history outputs and retains tombstones.

Revisit is a full page with true Continue entries, a fixed visit window, bounded new material and topic changes, and optional old material. It has no baseline task or read-all action. Old material is off by default and after restore. Input/conversation/topic rules suppress related proactive previews without changing explicit Search or AI authorization. Exact conversation capture exclusion is checked inside the capture/enrichment transaction and is reversible from settings, including after its Source has been purged.

## Changed paths

- Domain: `core/reader-state.js`, `core/revisit.js`, `core/archive-query.js`, `core/indexed-store.js`, `core/smart-filter-store.js`, and the additive bounded delta projection in `core/organizer/ai-presentation.js`.
- Compatibility/trust: `core/backup-format.js`, `core/backup-service.js`, `background/service-worker.js`.
- UI: `ui/archive.html`, `ui/archive.js`, `ui/library.js`, `ui/reader-experience.js`, `ui/reader-navigation.js`, `ui/reader.css`, `ui/revisit.js`, `ui/core-loop.js`, `ui/universal-search.js`, `ui/ux-r1-shell-coordinator.js`.
- Tests: new UX-R2 domain/browser suites; updated prior Revisit/current-browser/backup-version/security tests; R1 import now also proves no fabricated reads or imported-history debt.
- Contracts: `ARCHITECTURE.md`, `PRODUCT.md`, `BACKUP.md`, `PRIVACY.md`, this report and implementation status.
- CI: `.github/workflows/paia-certification.yml` explicitly adds the UX-R2 browser file and artifact upload. Existing unit shards, contracts, Current Browser, unsharded Full Suite, macOS Secure Store and aggregate certification remain mandatory.

## Migration and compatibility evidence

| Migration | Implementation and evidence |
|---|---|
| MIG-02 | Existing `meta`, `reading:v1`; no history inferred from capture. At most 200 anchors, no Source/Input text. Reads/reopen, offsets, revision drift, sorting, removal/purge fallback and eviction covered. Positions never enter Backup. |
| MIG-03 | Atomic/idempotent `revisit:v2` initialization at the current safe sequence. `revisit:v1` is read-only historical evidence. A window fixes start/end; refresh/reload retain it; exit/next visit advances only visit metadata. Imported history is omitted from fresh candidates. Failure/retry and restart are covered. Backup restore clears local visit/reading state. |
| MIG-04 | Versioned body-free Revisit and exact capture policies in existing `meta`. Opt-in defaults off. Input/document/topic exclusions propagate across evidence and derived topic previews. Purge clears removed target references and retains opaque restrictions. Capture/enrich, restart, unrelated conversations, reversal and existing-content preservation are covered. |
| MIG-10 | Existing Backup v1/schema 5 and organization-state whitelist gain strict policy validation. Current v0.12 headers and validated editable shell preferences round-trip. Unknown future format/policy versions and fields are rejected. Restored exclusions survive, old-content opt-in resets off, local capture restrictions are retained, and positions/credentials/temporary output are excluded. |

Source/Input/Thought ownership and the physical schema are unchanged. No Thought reverse-write migration, Context permission redesign or new authorization grant is included. Existing v0.7/v0.8/v0.9/v0.10/v0.11 Backup, tombstone, Smart Filter, revision, retention and privacy regressions remain in the current suite.

## Required behavior traceability

| IDs | Executed evidence |
|---|---|
| T-03 / T-04 | Immutable Source/time checks, live IME, real write failure, retry, Undo/Redo, chosen revision restore and concurrent-edit comparison in the UX-R2 browser suite; existing edit/revision domain regressions. |
| T-05 / T-06 | Formal dwell and reopened character position, pending-startup navigation, arrival/expiration stability, bounded read fallback, fixed visit windows, no imported-history debt and derived-preview exclusions. |
| T-07 / T-24 | Retained Smart Filter, restoration, tombstone, organizer/Memory purge and privacy/security suites; real Source purge invalidates visible Source/history and proactive surfaces. |
| T-26 / T-31 | Old metadata/Backup migration, atomic failure/retry, exact conversation capture exclusion, worker restart, unrelated conversations and explicit reversal after purge. |
| T-28 | Required viewport/light-dark matrices, keyboard/focus, IME, mobile Edit/Done, reduced-motion and 2× page scaling; failure controls remain operable. |

## Required commands and receipt

Environment: macOS 27.0 arm64, Node v24.19.0, npm 10.9.4, Python 3.12.14, repository-pinned Playwright 1.63.0 and Google Chrome 152.0.7977.83. The available bundled Node runtime was used locally; CI remains on its existing Node 22 configuration. No dependency versions or manifest permissions changed. All browser runs used isolated headless profiles with `PAIA_HEADLESS=1`.

| Command | Exit code | Executed / validated | Skipped | Evidence |
|---|---:|---|---:|---|
| `npm run test:unit` | 0 | 841 PASS | 0 | `work/ux-r2/certification/required-unit.log` |
| `npm run test:browser` | 0 | 12 PASS | 0 | `work/ux-r2/certification/required-browser.log` |
| `node scripts/test.mjs "adapter contract"` | 0 | 95 PASS | 0 | `work/ux-r2/certification/required-adapter.log` |
| `node scripts/test.mjs "privacy/security"` | 0 | 50 PASS | 0 | `work/ux-r2/certification/required-privacy.log` |
| `npm run check` | 0 | 7,854 guardrails / 175 runtime resources PASS | n/a | `work/ux-r2/certification/check.log` |
| `node scripts/check_development.mjs` | 0 | Privacy / permission / network audit PASS | n/a | `work/ux-r2/certification/development.log` |
| `npm test` | 0 | **998 PASS, 0 fail**, unsharded, concurrency 4 | 0 | `work/ux-r2/certification/full.log` and `test-summary.json` |
| `npm run build:release` | 0 | 7,426 emitted-package guards / 168 runtime resources; 192 release files PASS | n/a | `work/ux-r2/certification/build.log`; `work/current-release/` |

The final unsharded receipt has `fullSuite=true`, `auditPassed=true`, 998/998 PASS and zero skipped. Its input digest was checked against the current source after the suite, then again across the checkpoint. `receipt.json` retains the exact full-suite result, environment, performance measurements and SHA-256 checksums for all 29 required screenshots. Three consecutive targeted position/startup regressions and three consecutive retained Search/Context/Passport runs also passed; these are additional evidence, not substitutes for the required group/full runs.

- Final input digest: `71cf2283808b05f0940fcde1db8d60c38a0d4a3cafe95e932b66872b4dcd00b7`.
- Final runtime digest: `a78dd8d246a6c040db93ea61dd68a942b779b29501bf5bb6e3686460a8ba7a33`.
- Release version remains `0.12.0`; no deployment or remote CI run is claimed. Existing mandatory CI jobs are preserved and the UX-R2 browser file is added to Current Browser Certification.
- The optional user-sampled real golden bundle is `UNAVAILABLE`, as the receipt explicitly records. This checkpoint does not claim that bundle or the separate historical browser group passed. The current required suite and source release build above actually ran and passed.

## Browser and visual evidence

The mandatory current browser group includes UX-R1, UX-R2, Round 4.8, Round 4.9 and Round 4.10. It runs a real unpacked extension, real service worker, actual Chrome IndexedDB and synthetic offline ChatGPT pages in temporary profiles. It never opens a visible browser or accesses the user's everyday profile.

UX-R2 journeys cover:

1. Search into a long Input beyond the first 100 records; transient previews do not count as reading; actual dwell/caret position does. Capture another conversation and later same-conversation material, retain the reading anchor/scroll, reopen a tab, resume, change sorting and keep bounded context.
2. Chinese composition, complete-text autosave, an injected real IndexedDB write failure, buffer copying, blocked navigation, successful retry, Undo/Redo, cross-Input cut refusal, Source comparison, selected revision restore, concurrent edit comparison/CAS and mobile Edit/Done/Back.
3. Exact conversation capture exclusion, service-worker restart, other-conversation capture, removal/Undo/repeated capture, old-content opt-in, conversation exclusion, explicit Search, Source purge and reversible capture policy after purge.
4. Real synthetic Input → derived Entry → Topic fixture, explicit opt-in, topic exclusion removing both the topic and related Input previews, quiet Revisit, keyboard toggle and responsive layouts.
5. A separate real IndexedDB F-LARGE fixture with **100,000 Inputs, 1,000 source documents, 300 topics, 5,000 Entries in one topic and a 50,000-character Input**. Reader/anchor/Revisit reads are measured and bounded; the renderer continues processing heartbeats during batched seeding.
6. The retained R1 import journey previews/confirms actual synthetic history and opens an imported Reader; assertions prove import creates neither a reading position nor new-input debt.

The fixture setup for topic/performance tests writes synthetic entities through the real local domain/IndexedDB APIs. It does not simulate a successful model request. The failure test throws once at the actual IndexedDB write boundary; the clipboard sink is isolated in the page so synthetic test text does not replace the user's system clipboard. The Round 4.9 race test delays an actual completed onboarding RPC result; it does not substitute fabricated data or bypass worker validation.

Screenshots and measurements:

- `work/ux-r2/reader-{1440x900,1024x768,390x844,320x720}-{light,dark}.png`.
- `work/ux-r2/revisit-quiet-{1440x900,1024x768,390x844,320x720}-{light,dark}.png`.
- `work/ux-r2/source-{1440x900,1024x768,390x844,320x720}-{light,dark}.png` verifies read-only Source panel geometry and wrapping.
- `reader-selected.png`, `reader-save-failure.png`, `reader-source.png`, `reader-empty-after-purge.png`, `reader-200pct.png` in the same directory.
- `reader-matrix.json` and `large-fixture.json` contain synthetic measurements only.
- Keyboard/native selection, visible focus, cross-Input boundary, Chinese IME, mobile Edit/Done, reduced motion, 2× Chrome page scaling at a narrow CSS viewport and horizontal-overflow checks are included. Native plaintext Enter was separately checked in isolated headless Chrome for consistent text/caret offsets.
- Visual inspection corrected dark selected-sort contrast, old/new trash-icon overlap, desktop-only edit-control leakage and excessive action spacing. These are covered by the final browser assertions and regenerated evidence.

## Resolved verification failures

The final-source review found and fixed a delayed onboarding/root response that could overwrite a newly opened Reader. The retained Round 4.9 journey now delays that real RPC response to make the race reproducible. Large-fixture measurements also exposed an unbounded AI-presentation status read; Revisit now uses a bounded projection through the existing presentation owner.

The final scroll diagnostic measured a 56 px change in `scrollY` when inline new-content feedback appeared, even though Chrome scroll anchoring held the visible prose in place. Reader feedback now floats without changing document layout; refreshes do not repeat the same pending-new-content notification. Toast timing pauses during hover/focus and resumes after leaving. The browser test checks both scroll coordinates and visible prose before/after arrival and expiration. A second startup race could commit the Reader route before expansion/scroll restoration. User navigation now waits for initial route restoration. The new-tab test holds the first real onboarding response, clicks the real Continue control while that response is pending, releases it, then checks completed navigation and the saved character at 140 px. This covers the race without depending on a fixed sleep or relaxing position accuracy. The failed run and diagnostic are retained separately from the final PASS receipt.

The retained Universal Search journey exposed its old navigation-by-simulated-clicks race. Input results now use the shared Reader coordinator with canonical document/Input IDs; the Archive search query is preserved on return and existing highlighting is reused. The Round 4.8 regression verifies both opening and returning to that query.

The first broad verification attempts are not completion evidence. A run whose source digest changed while tests were running was discarded. The final receipt below comes from an unchanged runtime/test tree and the complete, unsharded suite.

## Network and performance boundaries

All non-provider UX-R2 journeys assert **zero provider requests, zero extension network requests and zero unexpected external requests**. Synthetic fixture history responses are supplied locally; no logged-in ChatGPT or live DeepSeek success is claimed. Revisit never invokes organizer work to show statistics.

New candidates scan at most 400 Inputs and show at most five cards. Old candidates scan at most 1,200 and show at most four, only after opt-in. Topic delta inspection is limited to 24 topics, 60 entries per topic and 240 entries total; partial ranges are explicitly labeled. Very large ambiguous excluded-evidence projections fail closed. These are bounded discovery views, not exhaustive unread totals.

The final F-LARGE run seeded 100,000 Inputs / 1,000 documents / 300 topics / 5,000 Entries in **54.446 s**, with **2,664 renderer heartbeats**. On the recorded machine/browser, one bounded Reader page took **119.2 ms**, read 283 rows and returned 92 bodies; anchor lookup took **2.6 ms** and four reads; Revisit took **125.9 ms**, 2,978 reads, scanned 400 fresh candidates and returned five cards. These measured read paths made zero writes; local storage had no body cache. These are one-run synthetic measurements, not a cross-device latency guarantee.

## Design token changes

No JSON token values changed. Reader/Revisit consume the shared tokens for 680 px default prose, 17 px body text, 40/44 px controls, mobile layout, light/dark colors, visible focus and reduced motion. Reader's 500 ms save delay and three-second reading dwell implement the Development Specification defaults. The desktop Source overlay remains at most 400 px; mobile uses a full-screen dialog. Version confirmation uses the existing wider comparison surface.

## Known limitations

- Validation is synthetic automated headless Chrome, not product-retention evidence, real-user profile validation, physical-device keyboard testing or live-provider certification.
- The pre-existing 76 historical browser files remain a separate explicit evidence group; none is silently deleted, promoted to PASS or substituted for the required current suite.
- Existing Backup limits remain 64 MB / 100,000 items and empty-library restore. The large Reader fixture does not claim whole-library Backup support beyond those limits.
- Bounded Revisit discovery can omit material outside its documented ranges. Exclusions/positions fail safely when their target or a policy version cannot be validated.
- Failed drafts remain in the current page. Deliberately closing a tab after a failed save is not a new persistent draft feature; Retry/Copy and navigation blocking are available.
- No remote push, PR, merge, deployment, daily-profile modification or UX-R3 work is part of this checkpoint.

## Completion gates and handoff

| Gate | Result | Evidence |
|---|---|---|
| G-01 Repo baseline | PASS | Clean `ux-r2` start at `ad386c07cff59b9b3472a5aa03626fe89514f8d1`; actual local/remote baseline and authority paths checked; no main switch or merge. |
| G-02 Scope / compatibility | PASS | UI-03/05/08/20, DELTA-02/08, MIG-02/03/04/10 delivered; existing owners/services reused; no body store, schema-version or permission expansion. |
| G-03 Unit / domain | PASS | 841/841 unit; 10 new R2 domain tests plus retained migration/edit/Undo/filter/delete regressions. |
| G-04 Real browser | PASS | 12/12 current Chrome journeys, including five R2 journeys, actual service worker/IndexedDB, deterministic startup regression and zero hidden network assertions. |
| G-05 Trust regression | PASS | 95/95 adapter and 50/50 privacy/security; current Source/purge/Backup/authorization suites retained. |
| G-06 Visual / a11y | PASS | 29 recorded screenshots, required viewport/light-dark matrices, manual screenshot inspection, keyboard, focus, IME, mobile Done, reduced motion and 2× scaling. |
| G-07 Release | PASS | All eight commands exit 0; unchanged-source unsharded full receipt; package/development/release guards pass; existing mandatory CI preserved. |
| G-08 Handoff | PASS | This committed report and implementation status identify the certified head, exact receipts, migrations, resolved failures, limits and next starting point. |

## Handoff

- UX-R2 status: **COMPLETE**, no unresolved blocker.
- Next round may start: **YES — UX-R3 is technically READY, not started**.
- When the user's renewed conditional instruction arrived, the state file still named UX-R2 / READY. That instruction therefore continued UX-R2; this checkpoint contains no UX-R3 implementation.
- Next starting point: Development Specification §8, UX-R3, using the same authority order and a fresh repository/main preflight. A later start must be explicitly instructed. Do not enter UX-R4 or merge main as part of this handoff.
