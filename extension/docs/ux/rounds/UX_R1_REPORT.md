# UX-R1 Implementation Report

## Round identity

- Round: **UX-R1**
- Status: **COMPLETE**
- Governing Design Core: `PAIA_DESIGN_CORE_v1.0.md`
- Governing Development Specification: `PAIA_UX_UI_DEVELOPMENT_SPEC_v1.0.md`
- Round start baseline: `fb109f6fcce365b5999031c5d33163c281ec0f31`
- UX-R1 product implementation merge: `7cb2ca155e95ed712fee8b81809ebfff1bd3a598` (PR #20)
- Final code/test certification head: `07ed0b1352f48098c2030a8625dc1ebc64e656f0` (PR #21)
- Final certification run: **PAIA Certification #157**, run id `34742272987`
- Certified PR merge ref: `c42d57ca78329eb57677537b2c3541a2909776e7`

## Scope delivered

UX-R1 implemented only the approved first-round shell and entry work:

- UI-01 App Shell;
- UI-02 onboarding / optional history-import entry;
- UI-03 Archive Home, UX-R1 portion;
- UI-04 Archive List, UX-R1 portion;
- UI-17 six-group Settings shell;
- foundational shared visual controls and responsive/light-dark presentation;
- DELTA-01 navigation/copy changes;
- MIG-01 additive UI-preference defaults;
- MIG-10 compatibility was exercised for the preferences and existing data paths touched by the round; no new body-bearing backup object was introduced.

The round did **not** implement UX-R2 reading anchors, Thought reverse-write semantics, Context permission redesign, cloud sync/provider work, Project capture, or a framework migration.

## Changed implementation paths

Primary UX-R1 implementation/test paths introduced or changed by PR #20:

- `.github/workflows/paia-certification.yml`
- `extension/core/archive-query.js`
- `extension/core/onboarding.js`
- `extension/core/workspace.js`
- `extension/ui/archive.js`
- `extension/ui/core-loop.css`
- `extension/ui/core-loop.js`
- `extension/ui/search-experience.js`
- `extension/ui/ux-r1-shell-coordinator.js`
- `extension/ui/ux-r1-state.js`
- `extension/tests/ux-r1-shell.test.mjs`
- `extension/tests/ux-r1-shell-chrome-e2e.test.mjs`
- existing Round 4.9 / 4.10 and onboarding test updates required by the approved UX delta.

Certification closure in PR #21 additionally changed only the test/certification boundary and one shell navigation race:

- `extension/scripts/test-groups.mjs`
- `extension/scripts/test.mjs`
- `extension/package.json`
- `.github/workflows/paia-certification.yml`
- `extension/ui/ux-r1-shell-coordinator.js`

No new Source/Input/Thought truth store was created.

## Reused services and ownership

UX-R1 retained the existing ownership model and reused existing trusted paths:

- Source capture, consent, pause/resume and import remained on the existing background/store path;
- `ui/archive.js` remained the authoritative in-page navigation/editor lifecycle owner;
- existing Reader, ThoughtWorkspace, Memory/Context and Backup surfaces remained reachable;
- history import reused the existing import coordinator/ledger rather than adding another importer;
- UI preferences remained in the existing preferences/meta path;
- the final Recently Captured route removed a competing fallback so only one canonical Reader navigation path is active.

## User-visible changes

- A stable root shell exposes **Archive / Thought Library / For AI** plus Settings.
- First-use copy explains the exact local-save scope; the primary “Start saving locally” action itself is the explicit consent action.
- The sample path remains isolated and does not write real archive content.
- Optional history import is available from onboarding and keeps preview/confirm separation.
- The Archive root no longer pretends to have a reading-progress anchor. It shows truthful **Recently saved / 最近收录** based on real `capturedAt` data.
- Existing Revisit remains distinct from Recently Captured and becomes primary when real post-baseline material exists.
- Settings is organized into six approved groups while reusing existing controls.
- Root Back/Forward is represented through same-URL `history.state`; no new public route or trusted sender was introduced.
- Responsive shell behavior covers desktop, narrow and mobile widths; light/dark and system-language presentation are supported.

## Compatibility and migration proof

### MIG-01

- Missing UX preferences are filled conservatively.
- Existing explicit preference values are preserved.
- Preference load failure uses visual fallbacks without writing defaults over persisted state.
- Existing consent, paused capture and Smart Filter state are not reset by UX preference initialization.
- Existing users with real data/consent are not forced back through first-run onboarding.

### Runtime compatibility

- Existing Reader / Thought / Context / Backup paths remain reachable.
- Round 4.8 Universal Search → Reader / Context and Passport revoke journeys pass.
- Round 4.9 capture → Archive home → read → retrieve → reuse passes.
- Round 4.10 activation → first real Input → durable Revisit baseline → later real Input → return state passes.
- Adapter and privacy/security contracts pass unchanged.
- Current package/development guards and release build pass.

### GitHub source migration / historical browser evidence

During formal closure, the repository exposed a pre-existing reproducibility conflict: `SOURCE_SNAPSHOT.md` states that the 2026-09-11 GitHub migration intentionally excluded the prior nested local `.git` object database, while a set of frozen pre-migration browser tests still invoke `git archive <old-sha>` or assert obsolete v0.x UI contracts. Those old Git objects do not exist in the authoritative GitHub repository.

The tests were **not deleted** and were not reported as passing. The runner now separates 76 pre-migration browser evidence files into the explicit `historical browser E2E` group, available through `npm run test:historical-browser` / manual workflow dispatch. All current UX round tests and the mandatory Round 4.8 / 4.9 / 4.10 journeys remain in the hard current browser gate. This makes the Development Specification §7.3 commands reproducible from the authoritative GitHub source without silently treating unavailable historical Git objects as current-source failures.

## Required command evidence

Final certification #157 executed the required current-source commands on the final code/test head:

| Required command / gate | Result | Evidence |
|---|---|---|
| `npm run test:unit` | PASS | 831 unit assertions in the unsharded current full-suite result; all 4 CI unit shards PASS |
| `npm run test:browser` | PASS | 7/7 current real-browser journeys PASS |
| `node scripts/test.mjs "adapter contract"` | PASS | 95/95 |
| `node scripts/test.mjs "privacy/security"` | PASS | 49/49 |
| `npm run check` | PASS | package guard reports 7,726 guardrails across 171 runtime resources |
| `node scripts/check_development.mjs` | PASS | `DEVELOPMENT_PRIVACY_PERMISSION_NETWORK_AUDIT_PASS` |
| `npm test` | PASS | unsharded current-source suite: **982/982 PASS, 0 fail, 0 skipped** |
| `npm run build:release` | PASS | Current release build and guards PASS |
| Current Browser Certification | PASS | targeted UX-R1 + Round 4.8 / 4.9 / 4.10 and complete current browser suite PASS |
| macOS Secure Store Certification | PASS | existing unrelated mandatory release gate preserved |
| Certification gate | PASS | run #157 final aggregate gate PASS |

Full-suite receipt:

- `fullSuite=true`
- `auditPassed=true`
- `historicalBrowserFiles=76`
- `inputDigest=edad20ddcac6610c629961568c7b04de739f00af2569d9b9511d74af1806f45c`
- artifact: `paia-current-full-suite-c42d57ca78329eb57677537b2c3541a2909776e7`
- artifact id: `10313016115`
- artifact digest: `sha256:d03e8e172fc865d6a7a9278c7e9772d25ebb3cead6695f05d9eaec17fa7d460d`

## Real-browser journeys and network assertions

Final current browser certification proves:

1. clean install: example path remains synthetic and writes no real archive content;
2. primary local-save action grants explicit consent and real capture reaches Archive;
3. Recently Captured points to real saved content and opens the canonical Input Reader;
4. optional history import previews, confirms, then opens one real imported document;
5. root navigation uses same-URL history and Settings return semantics;
6. Round 4.8 Search/Context/Passport paths remain functional;
7. Round 4.9 capture/read/retrieve/reuse remains functional;
8. Round 4.10 Revisit keeps first-run baseline semantics and promotes real new local material without silently marking it read.

The current browser journeys assert zero hidden extension/provider/external network requests on the UX-R1 local paths where required by the existing certification harness.

## Visual / accessibility evidence

Current Browser Certification uploaded `ux-r1-visual-evidence-c42d57ca78329eb57677537b2c3541a2909776e7` (artifact id `10312767353`, digest `sha256:b634457f4e662308abfd8f1e8c8e9474c8901e7c7e06a602e3b9371c7ed4bfd1`). It contains:

- `archive-1440x900-light.png`
- `archive-1440x900-dark.png`
- `archive-1024x768-light.png`
- `archive-1024x768-dark.png`
- `archive-390x844-light.png`
- `archive-390x844-dark.png`
- `archive-320x720-light.png`
- `archive-320x720-dark.png`
- `archive-200pct-light.png`

The browser journey also exercises keyboard navigation, mobile/narrow navigation, 200% page scaling and reduced-motion presentation. UX-R1 did not introduce a new editable text primitive; the pre-existing editor/IME primitives remain covered by the current unit/domain suite.

## Design Token disposition

`extension/docs/ux/PAIA_DESIGN_TOKENS_v1.json` was **not changed** in UX-R1. The round implemented the approved foundational shell using the existing token contract and CSS consumption points; no validated token value required a specification-level change. Keeping the token source unchanged avoids turning implementation tuning into a second visual source of truth.

## G-01 — G-08

| Gate | Result | Notes |
|---|---|---|
| G-01 Repo baseline | PASS | Started from bootstrap/spec baseline `fb109f6...`; final current-source closure certified at `07ed0b...`. |
| G-02 Scope / compatibility | PASS | R1 only; no duplicate truth store, permission expansion or later-round placeholder semantics. |
| G-03 Unit / domain | PASS | all current unit/domain tests pass; UX-R1 migration/state tests included. |
| G-04 Real browser | PASS | full current browser suite plus required real Chrome journeys pass. |
| G-05 Trust regression | PASS | adapter 95/95; privacy/security 49/49; release guards pass. |
| G-06 Visual / a11y | PASS | required R1 viewport/light-dark evidence plus keyboard/zoom/reduced-motion checks captured. |
| G-07 Release | PASS | unsharded full suite, package/development guards, release build and aggregate certification all pass on final code/test head. |
| G-08 Handoff | PASS | this report and `UX_IMPLEMENTATION_STATUS.md` establish UX-R2 as the next round. |

## Known limitations / unresolved evidence

- 76 pre-migration historical browser files remain a separate, explicitly named historical evidence group because their frozen environment includes old UI contracts and/or local Git objects intentionally excluded from the GitHub source snapshot. They remain executable where that historical environment is supplied; they are not silently skipped inside the current-source suite and are not claimed to pass.
- UX-R1 deliberately does not create a true reading anchor. “Recently Captured” remains capture order only. The true last-read paragraph and visit-boundary semantics are UX-R2 work.

## Next round start point

UX-R1 is complete. The next authorized implementation round is **UX-R2 — Input Reader, real continue-reading, and safe Revisit**, beginning from the post-closure `main` HEAD after PR #21 is merged.
