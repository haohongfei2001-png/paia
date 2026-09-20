# ANS-05 Completion Receipt — Persistent Archive Navigator workspace

## Identity

- Package: `PAIA-ARCHIVE-NAVIGATION-SOURCE-v1`
- Round: `ANS-05`
- Execution: `ANS05-20260919-exec01`
- Canonical execution start: `386fca6ede8079736d980ab7d69b9c4521b506a1`
- Claim/status commit: `74c53f9c9abc114766e3781c6cc1cf351e7178d8`
- Core implementation commit: `dce0d5784b375e8e7020a40f8183d57b1b633256`
- Certified runtime/test closure head on `main`: `f4fbd204518e7de8aea9ffd98fa0895a0b2ac6d7`
- Main certification: PAIA Certification #385 / run `35451076737` / attempt 2 / **success**
- Certification completed: 2026-09-20T03:14:29Z
- Product-owner blocker: **NONE**

This receipt closes only ANS-05. It marks ANS-06 READY but does not authorize or implement ANS-06.

## Delivered behavior

ANS-05 delivers the package-defined persistent Archive Navigator / Reader workspace on top of the bounded ANS-04 read model:

1. Added a persistent three-level Archive Navigator for Source → Project → Window beside the Reader.
2. Added current/deleted/unknown/unassigned projections without collapsing unknown and unassigned semantics.
3. Preserved Project-first collapsed behavior; a deep link expands only the selected parent Project.
4. Cross-window navigation stays inside the Reader workspace and reuses the existing leave/navigate safety path.
5. Dirty edits, IME/composition state, selection, flush failure and save retry remain fail-closed during window switching.
6. Active-window selection survives source relationship changes and responsive viewport changes.
7. Added mobile sheet behavior with focus trap, Escape close and trigger-focus restoration.
8. Added responsive layouts across desktop/tablet/mobile, reduced-motion handling, light/dark coverage and horizontal-overflow assertions.
9. Added Source detail/history surfacing without changing Source/Input/Thought ownership or adding body-backed Navigator queries.
10. Existing Archive/Reader browser tests were migrated to the real Navigator entry path where ANS-05 owns the library flow; excluded/recovery-only flows remain on their existing surface.

## Actual runtime / test files

ANS-05 runtime implementation changed:

- `extension/background/service-worker.js`
- `extension/ui/archive-navigator.css` (new)
- `extension/ui/archive-navigator.js` (new)
- `extension/ui/archive.html`
- `extension/ui/archive.js`
- `extension/ui/reader-navigation.js`
- `extension/tests/ans-04-navigation-query-chrome-e2e.test.mjs`
- `extension/tests/ans-05-navigator-state.test.mjs` (new)
- `extension/tests/ans-05-navigator-workspace-chrome-e2e.test.mjs` (new)

Certification closure then added/updated only test navigation harnesses and old browser journeys:

- `extension/tests/harness/archive-navigator.mjs` (new)
- `extension/tests/ans-01-reader-surfaces-chrome-e2e.test.mjs`
- `extension/tests/ans-02-source-foundation-chrome-e2e.test.mjs`
- `extension/tests/capture-foundation-chrome-e2e.test.mjs`
- `extension/tests/uir-02-archive-search-reader-chrome-e2e.test.mjs`
- `extension/tests/uis-02-page-scoped-search-chrome-e2e.test.mjs`
- `extension/tests/ux-r3-thought-chrome-e2e.test.mjs`

The closure fixes did not modify ANS-05 runtime behavior and did not weaken assertions, timeouts, privacy/security checks or certification rules.

## Requirement / UI evidence

Committed ANS-05 tests cover the relevant V01/V02/V07–V13/V23 and responsive requirements, including:

- persistent Navigator + Reader without leaving the workspace;
- bounded paging and selected-path restoration;
- first-load Project collapse and targeted parent expansion;
- safe dirty save failure that blocks switching until retry succeeds;
- selection preservation across resize;
- mobile sheet inert/focus/Escape/trigger restoration;
- deleted/unknown/unassigned projections;
- source details/history;
- reduced motion and light/dark responsive matrix;
- widths exercised at 1440×900, 1200×800, 1024×768, 800×700, 390×844 and 320×720;
- no page horizontal overflow and mobile touch targets at least 44px;
- 200% scaling coverage;
- zero external/provider/DeepSeek network requests in the ANS-05 browser path.

ANS-05 does not implement R8 source-order provider/settings. It also does not implement Thought continuous Reader work.

## Certification evidence

PAIA Certification #385 / run `35451076737` / attempt 2 completed **success** on exact head `f4fbd204518e7de8aea9ffd98fa0895a0b2ac6d7`.

Required evidence:

- Current Browser Certification: **57 / 57**
- Full Suite Certification: **1177 / 1177**
- Full-suite receipt: `fullSuite=true auditPassed=true historicalBrowserFiles=76`
- Full-suite input digest: `c43f5b812e5f6666bfe0452a2de18a9edff9e387693ee3636e45fc0bb495ddaf`
- package guardrails: **8919 across 211 runtime resources**
- `DEVELOPMENT_PRIVACY_PERMISSION_NETWORK_AUDIT_PASS`
- Unit 1/4 through Unit 4/4: success
- Current release build and guards: success
- Adapter and privacy contracts: success
- macOS Secure Store Certification: success
- final Certification gate: success

Attempt 1 exposed legacy browser journeys that still clicked the hidden pre-Navigator `.conversation-document` entry and one unrelated `MEMORY_STALE` race in an old UX-R4 test. The legacy journeys were migrated to the real Navigator path without restoring obsolete UI or weakening assertions. The same exact certified head then passed the rerun-failed-jobs attempt 2; the fail-closed `MEMORY_STALE` production guard was not changed.

## Ownership, provider capability and rollback

- Durable Source/Input/Thought ownership: unchanged.
- Source/message/document identity: unchanged.
- No new object store, DB version or durable body schema migration.
- Provider/capture permissions and host permissions: unchanged.
- No new active provider/API request.
- No new AI authorization or automatic model work.
- ChatGPT Project identity/name, membership, Project/window order, rename/move and conversation/project deletion remain unverified/unavailable where ANS-03 did not certify them.
- Synthetic relationship/lifecycle evidence remains synthetic; it is not treated as live ChatGPT provider certification.
- ANS-04 bounded projection remains rebuildable derived state; ANS-05 consumes it rather than creating a second source of truth.

## Handoff

ANS-05 is complete at certified runtime/test closure head `f4fbd204518e7de8aea9ffd98fa0895a0b2ac6d7`, published on `main` and certified by PAIA Certification #385 attempt 2.

Canonical STATUS may now mark ANS-05 COMPLETE and ANS-06 READY. This execution stops after publishing and remotely reading back the completion documents; it does not implement ANS-06.
