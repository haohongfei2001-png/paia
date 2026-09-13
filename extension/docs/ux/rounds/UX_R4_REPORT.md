# UX-R4 Implementation and Certification Report

## Round

- Round: UX-R4; local certification on 2026-09-13.
- Start commit: `9dfca7abbcf18984efcbdac39d815ad6d51a777a`, clean `ux-r2`.
- End / certified implementation-test commit: `c338f1bff8b569c62240b71cf5c896e0303e7ca0`.
- Scope: UI-06/07/15/16 and related Settings; DELTA-04/05; MIG-07/08/10.
- Authority read from AGENTS through Design Core, Development Specification, execution status, current product/architecture/roadmap and affected feature contracts.
- Real remote main at preflight: `61d2910a85fa6169b4cb716b2fdcb764a1892b3d`. Same as R3 preflight; its 13 website-file changes since R2's starting main have no extension/CI conflict. Main was neither checked out nor merged.

## Delivered behavior / reused owners

Search is a main-area task with scope, source, Topic, date, type and removed-item filters, bounded pages and stable return from Reader. Selection is by actual canonical references and remains fixed across pages, query changes, Reader navigation and later capture. Page selection and complete-result enumeration are distinct; complete enumeration requires a stable data generation and final explicit confirmation. Late responses cannot replace a new query and IME composition does not issue partial queries. Source filtering reflects the real ChatGPT/Claude source platform.

Historical reading searches immutable Input Source text and reliable original send times. Unknown dates are explicitly grouped as unknown; present-day edits are never shown as past expression. Two records can be read side by side. Scope and incomplete traversal are stated. Independent Thoughts and generated AI text are not relabelled as historical Source.

Input, selected Input text, Thought, selected Thought text, a Topic and existing AI fields can be explicitly selected through their current canonical references. Full bodies enter a transient material tray without a Profile or preliminary organizing step. Identity/version/range differences remain visible. Additions do not replace earlier selections; retrieval uses existing allowed-scope candidates and lexical ranking, with suggestions initially unselected.

The main-area preview contains the exact output. Local edits, task notes, removal, order and literal redaction remain through preview rebuilds and added suggestions. Explicit confirmation is required before copy or Markdown download. Stale/blocked/expired material is visible and stops output; restrictions point to the actual rule and changing a rule does not silently rehabilitate an old blocked selection. Source purge immediately clears visible output and blocks server share. Worker restart expires the session.

Local-only blocks PAIA's provider and external-connection access while explicit local manual copy/export remains available. The existing externalAccess switch keeps its previous connection-denial meaning. Legacy Grant-bound output retains its entire independent authorization and atomic consumption path.

Existing owners reused: UniversalSearchService / SearchService and canonical Reader projections; MemoryService allowed candidate retrieval; ContextPackageService for transient manual sessions; Passport for consumer/Grant authorization; organizer network guard and bounded stop; existing meta/preferences/Backup. No new body store, physical schema, provider, permission or dependency.

## Changed paths

- New helpers under existing owners: `core/manual-context.js`, `manual-materials.js`, `search-material-page.js`, `local-network-policy.js`.
- Existing domain/trust: `core/context-package-service.js`, `universal-search.js`, `memory/model.js`, `memory/service.js`, `passport.js`, `organizer/store.js`, `constants.js`, `background/service-worker.js`.
- UI: `ui/material-tray.js`, `reuse.css`, `universal-search.js`, `archive.html`, `archive.js`, `thoughts.js`, `memory.js`, `core-loop.js`.
- Tests: three R4 domain files, `ux-r4-search-reuse-chrome-e2e.test.mjs`, `harness/ux-large.mjs`; sender/privacy and retained R1/Round4.8/4.9 browser journeys updated for the new explicit-selection contract.
- Product, architecture, privacy, Backup and AI Context contracts; scoped package guard exceptions for the single validated clipboard write and Search keyboard handlers.
- CI includes the new browser file and evidence. Existing unit shards, unsharded Full Suite, current journeys, macOS Secure Store and aggregate gate remain mandatory. Full Suite uses the runner’s existing PAIA_TEST_CONCURRENCY=1 option to avoid competing 100,000-Input browser fixtures with the timed 10,000-Input import benchmark; no test, assertion or timeout is removed.

## Migration / compatibility

| ID | Result and evidence |
|---|---|
| MIG-07 | Worker-only sessions, trusted sender owner and generation; legacy preview IDs cannot be used as manual selection IDs. No durable preview/query/body history. Canonical revalidation, restart/expiry, long text, deletion and identity-conversion attacks are covered by domain and actual Chrome tests. |
| MIG-08 | Missing localOnly becomes false; strict boolean validation and existing portable Memory config are reused. Old externalAccess=false remains false, previous Profile/Grant/exclusions remain intact, enabling Local-only stops future bounded processing, disabling it does not replay. Actual configured-provider denial produces zero requests. |
| MIG-10 | Policy fields round-trip through the existing Backup whitelist; unknown/type-invalid fields reject. Temporary selections, previews, queries, credentials and device reading positions remain excluded. Existing Backup, restore, Source identity, purge and tombstone suites remain mandatory. |

Independent security analysis: `UX_R4_SECURITY_REPORT.md`. It documents DELTA-04/05 threat boundaries, exact rule handling, once-use/revoke, output equality, deletion priority and the intentional distinction between default-ungranted and explicitly denied material.

## Required commands

Environment: macOS 27 arm64; Node 24.19.0, npm 10.9.4, Python 3.12.14, Chrome 152.0.7977.83, Playwright 1.63.0. Synthetic isolated headless profiles only; no everyday profile or visible browser.

| Command | Exit | Executed / validated | Skipped | Evidence |
|---|---:|---|---:|---|
| `npm run test:unit` | 0 | 867 PASS | 0 | `work/ux-r4/unit.log` |
| `npm run test:browser` | 0 | 21 PASS | 0 | `work/ux-r4/browser.log` |
| `node scripts/test.mjs "adapter contract"` | 0 | 95 PASS | 0 | `work/ux-r4/adapter.log` |
| `node scripts/test.mjs "privacy/security"` | 0 | 52 PASS | 0 | `work/ux-r4/privacy.log` |
| `npm run check` | 0 | 8,252 guards / 188 runtime resources | n/a | `work/ux-r4/check.log` |
| `node scripts/check_development.mjs` | 0 | privacy/permission/network audit PASS | n/a | `work/ux-r4/development.log` |
| `npm test` | 0 | 1,035 PASS, unsharded; fullSuite=true / auditPassed=true / concurrency=1 | 0 | `work/ux-r4/full-suite.log`, `full-suite-summary.json` |
| `npm run build:release` | 0 | 7,824 guards / 181 runtime resources / 205 files | n/a | `work/ux-r4/release.log` |

- Input digest: `3a181819ca8a92d042c9ed44322048e6805b141fe935c6488e385b4d6b4e41ab`.
- Runtime digest: `741024fb4e6d7040de8a36f453151c46b4d9e06e212a7752bc9b086668e27daf`.
- Certification manifest: `work/ux-r4/certification.json`; screenshot hashes and preserved full receipt must match the final source. The documentation checkpoint changes neither digest.
- Optional user-sampled golden: UNAVAILABLE. The 76 pre-migration historical browser files are retained as a separate group, not claimed to pass. No remote CI, deployment or live-provider certification is claimed.

## Browser journeys / visual evidence

Five R4 real Chrome journeys exercise actual service-worker dispatch, IndexedDB, current extension UI and controlled capture:

1. Search 45 Inputs across real pages, select three, read/return with the same query and page, change query and capture 20 more Inputs; the same three refs remain. Delayed old response, IME and English labels are exercised.
2. Unorganized Inputs directly enter full preview under Local-only. Redaction survives edits, rebuilding and approved supplemental retrieval. Actual copy argument and downloaded Markdown equal the displayed preview. A specific exclusion blocks output; explicitly removing the rule still requires reselection. Source purge blocks the old package.
3. Current Input edits leave historical Source unchanged; known/unknown dates and two-source comparison. Search, history, tray and preview in light/dark at 1440×900, 1024×768, 390×844 and 320×720; no horizontal overflow. Keyboard, IME retained through appearance changes, reduced motion, 200% scale and actual worker-restart expiry.
4. Real F-LARGE: 100,000 Inputs, 1,000 documents, 300 Topics, 5,000 Thoughts and a 50,000-character Input. Document-scoped search returns 40 items with bounded scanning and zero writes; the long Input remains complete in manual output. Final measurements: seed 59.365 s / 2903 renderer heartbeats; scoped search 32.7 ms / 581 reads / 0 writes / 40 scanned rows; 50089 output characters.
5. Two concurrent shares of one once Grant produce exactly one consumption; manual identity conversion rejects; revoked Grant output rejects.

37 screenshots under `work/ux-r4/`: search/history/tray/preview light-dark × four widths, plus English, 200%, expiry, initial output and large search. Representative 320px tray, 320px preview, desktop preview and narrow historical screenshots were inspected directly. The mobile drawer's original navigation overlap and scroll inheritance were fixed and reverified.

All R4 journeys assert zero DeepSeek requests, zero extension network requests, zero unexpected external requests and no page errors. The synthetic configured-provider attempt under Local-only is rejected before dispatch. No history prompt is executed. The clipboard sink observes the exact write argument; file output uses a real browser download.

## Resolved failures, tokens and limitations

Verification fixed an IndexedDB transaction-lifetime bug caused by asynchronous hashing, stale query responses and old-result pagination, restrictive-source error targeting, output invalidation after purge, preview width/background and mobile navigation overlap, and legacy Reader reuse that still passed snippets as queries. A full-suite attempt overlapped an independent browser gate and timed out in the 10,000-Input import benchmark. The same run exposed a test race when worker restart proactively expired the preview before the test clicked Copy. The final test verifies the actual worker rejection and accepts either safe UI ordering. The failed evidence remains in full-suite-contention.log; an independent four-concurrency full run reproduced the same import timeout, so the final full suite uses one concurrent file, with unchanged tests and watchdogs. Standalone groups and final full execution are sequential. In that final one-concurrency run, the 10,000-Input import passed: commit 63.911 s, maximum batch 658.4 ms, Reader 20.4 ms, zero provider requests (work/ux-r4/import-benchmark.json). The earlier concurrent run also exposed a Reader-position timing failure; the unchanged Reader assertion remains in final full certification. Search status also updates in place on a language change.

No Design Token JSON changed. Existing canvas/surface/text/focus/control/width/reduced-motion tokens are used.

Limits are explicit: 20 worker sessions, 15-minute expiry, 200 material refs / 4 million characters, 200 scan rows per search page and 20 suggested additions. Partial coverage requires continued paging; this is bounded local lexical retrieval, not paid semantic search. Historical reading covers provable Input Sources and does not infer chronology for independent Thoughts or AI. Existing Backup 64 MB / 100,000-item limits remain. Synthetic headless execution does not establish real-user retention, physical-device behavior or live-provider success. No unresolved blocker after final certification.

## Gates / handoff

| Gate | Result | Evidence |
|---|---|---|
| G-01 Repo baseline | PASS | Actual branch/tree, main SHA, baseline difference and existing services checked. |
| G-02 Scope / compatibility | PASS | UI-06/07/15/16, DELTA-04/05, MIG-07/08/10; no new truth store or permissions. |
| G-03 Unit / domain | PASS | 867 unit tests including 12 R4 tests, compatibility and deletion suites. |
| G-04 Real browser | PASS | Five R4 journeys plus every existing current journey. |
| G-05 Trust regression | PASS | 95 adapter / 52 privacy tests; independent DELTA security report. |
| G-06 Visual / a11y | PASS | Required matrix, directly reviewed screenshots, mobile, English, IME, keyboard, scale, reduced motion. |
| G-07 Release | PASS | Full-source receipt, package/development/release and preserved mandatory CI. |
| G-08 Handoff | PASS | This report, independent security report, status and local evidence. |

UX-R4 is COMPLETE at the documentation checkpoint. UX-R5 may now start under the user’s renewed authorization. Its authorized starting point is existing AI presentation, bounded processing and revision/suggestion owners. No R6 work is authorized in this pass.
