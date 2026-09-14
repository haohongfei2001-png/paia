# UX-R6 Implementation and Certification Report

## Status

- Round: **UX-R6**
- Status: **COMPLETE — certified 2026-09-14 UTC**
- Execution campaign: `paia-ux-r6-20260915-v3`
- Round start checkpoint: `18c9c2972c05dad1e45f748244f5947d2192e044` on `ux-r2`.
- Exact certified implementation/test head: `2d5de7e19d4756ecf90babf5101ff0127d7c6d50`.
- GitHub Actions certification: **PAIA Certification #272**, run id `34903574502`, overall `success`.
- CI carrier: draft PR **#28**, `ux-r2` -> frozen `overnight/ci-base-20260914` at `ad386c07cff59b9b3472a5aa03626fe89514f8d1`; PR #28 was **not merged**.
- Scope remained UX-R6: Settings, Backup/Restore, complete open export, privacy preview masking, storage/backup honesty, compatibility/migration and cross-size release acceptance. Production sync, remote API/MCP, native mobile app, voice, hosted-provider expansion and brand changes remained out of scope.

The exact certified source is the implementation/test tree that passed #272. The later report/status checkpoint is documentation-only and must not be substituted for this certified head.

## Implementation result

The bounded UX-R6 product chain published on `ux-r2` was:

1. `7631b91b166142911fae788d85af486ac0de0f2d` — R6-01 complete Settings/data-exit baseline, open export, privacy preview masking and current-release R6 acceptance.
2. `c65b751fe25b1f11ab84eb943cc51826045d6bc5` — R6-02 refreshes the R6 UI projection after a successful formal restore so restored preferences are immediately reflected in the open page.
3. `86bc60001665138837288131fe11714871bd3618` — R6-03 makes restored external access fail closed, corrects Source collection/document acceptance, and clarifies data-exit boundaries.
4. `2d5de7e19d4756ecf90babf5101ff0127d7c6d50` — R6-04 test-only scope repair for the synthetic restore marker; no product code, timeout, gate, expected behavior or acceptance strength changed.

Relative to the sealed UX-R5 documentation checkpoint, UX-R6 changed eleven files in four commits. Product-facing additions include `extension/core/open-export.js`, `extension/ui/r6-settings.js` and `extension/ui/r6.css`; compatible preference/Backup integration was added through the existing workspace and Backup paths rather than a second canonical store.

## Product behavior closed by UX-R6

### Complete Settings

The existing Settings shell is closed into the governed six-group structure. UX-R6 adds the missing release-facing controls and status without changing Source/Input/Thought ownership:

- Privacy preview masking is explicit and local. It hides preview excerpts on home/search/topic-list style cards while full Reader/Thought content remains readable.
- The UI states the real boundary: preview masking is **not encryption** and cannot prevent operating-system screenshots.
- Storage reporting is honest about what the browser reports instead of fabricating a precise local-storage total.
- The most recent successful local Backup time is surfaced in Settings after a real Backup download.
- Device sync is explicitly reported as **not provided in the current version**; UX-R6 does not turn historical sync contracts/simulators into a shipped sync feature.

### Backup / Restore

UX-R6 retains the existing formal Backup/Restore model and closes the settings/authorization boundary:

- Backup remains a local private-data artifact, distinct from open export.
- `hideContentPreviews` participates in the formal preference round trip rather than silently resetting after restore.
- Restore reprojects restored preferences into the currently open Settings UI.
- Old `memory:config.externalAccess=true` state is never silently re-enabled by restore. The Backup may preserve policy history, but restored external access is forced to `false` and requires a fresh explicit user decision.
- Passport Grants, transient session authorization and credentials remain outside ordinary Backup.
- Source restore acceptance follows the actual collection -> document API: the restored Source document is discovered first, then immutable Source records are read from that concrete document.

### Complete open export

UX-R6 adds a separate open, user-readable export path without mislabeling it as Backup:

- JSON and Markdown complete-export paths expose the user's portable archive content with explicit roles for immutable Source, working Input, Thought, AI presentation and human revision layers.
- Operational receipts and non-user organizer/runtime state are not presented as portable user content.
- The existing filtered Source Records export remains a narrower current-selection format and is not called a complete export.
- The streaming JSON path is covered at F-LARGE scale with 100k Inputs without first collecting the whole domain in one in-memory object.
- Export and Backup remain local actions in the certified browser journey; the R6 acceptance observed zero DeepSeek, extension-network or external requests.

## Repair / certification history

Certification failures were handled repair-before-progress and acceptance criteria were not weakened:

1. **#269 — product lifecycle defect.** Formal restore durably recovered `hideContentPreviews`, but the open page did not immediately re-apply the preview-mask class. R6-02 repaired the actual UI projection lifecycle.
2. **#270 — test contract error.** The test read `archive.records` from the collection DTO even though current API semantics expose Source records only after opening a concrete `documentId`. The test was corrected to collection -> document -> records; product API behavior was not changed to satisfy the test.
3. **#271 — test scope error.** Full Suite was 1087/1088 with the only failure `ReferenceError: marker is not defined`; the synthetic marker was declared inside the first `try` and referenced by the restore `try`. R6-04 moved the marker to the test callback scope only.
4. **#272 — certified PASS.** All mandatory jobs and the aggregate gate passed on exact head `2d5de7e19d4756ecf90babf5101ff0127d7c6d50`.

No repair lowered contrast thresholds, increased timeouts to hide races, removed gates, changed sender/consent boundaries, merged PR #28, modified `main`, or moved the frozen CI base.

## Required certification evidence

Certification source: PAIA Certification #272 on PR #28, exact product head `2d5de7e19d4756ecf90babf5101ff0127d7c6d50`, merge ref `16686aa83b3be7510d15e49b9f34e0791a117b5a`.

| Required command / gate | Result |
|---|---|
| Unit shards 1–4 | **PASS** on all four jobs; Full Suite unit group **909/909**. |
| Current Browser Certification | **PASS**; serial R1->R6 journey **32/32**, complete current browser suite PASS, package/development guards PASS, all UX evidence uploads PASS. |
| Adapter contract | **95/95 PASS**, 0 fail, 0 skipped. |
| Privacy/security | **52/52 PASS**, 0 fail, 0 skipped. |
| `npm test` / Full Suite | **1,088/1,088 PASS**, 0 fail, 0 skipped: unit 909, browser E2E 32, adapter 95, privacy/security 52. |
| Full Suite receipt | `fullSuite=true`, `auditPassed=true`, `historicalBrowserFiles=76`; input digest `5fc617fd38ef01ef34fd9a8c4c5ce48a8f2206ced13ae214a56fe3240381f5a5`. |
| Package/development audit | **8,438 package guardrails / 196 runtime resources PASS** and `DEVELOPMENT_PRIVACY_PERMISSION_NETWORK_AUDIT_PASS`. |
| Current release build and guards | **PASS**; release artifact uploaded successfully. |
| macOS Secure Store Certification | **PASS**. |
| Aggregate Certification gate | **PASS**. |

Full Suite receipt artifact:

- artifact id `10371802551`
- digest `sha256:bdae83eab591e1555e11723b6838ed03e9c518f6c0a34dc6c88338db190fb6dc`

UX-R6 visual/browser evidence artifact:

- artifact id `10371638768`
- artifact name `ux-r6-evidence-16686aa83b3be7510d15e49b9f34e0791a117b5a`
- digest `sha256:9558c24859b6b8f599a1c0994dfcc98996cc005258db72ebc15a62dcc90cb1ac`
- contents: 16 screenshots covering Privacy and Data/Device at 1440x900, 1024x768, 390x844 and 320x720 in both light and dark themes.

Current release artifact:

- artifact id `10371522875`
- digest `sha256:62db763c7508b7e433852ead76fec6f06d2543dc834ec6fcd34f0c9126cfebf8`

## Visual / responsive / accessibility acceptance

The certified R6 browser test enforces the release matrix rather than only producing screenshots:

- Viewports: 1440x900, 1024x768, 390x844 and 320x720.
- Themes: light and dark.
- Surfaces: Privacy and Data/Device Settings.
- Visible text contrast: existing threshold remains `>= 4.5`.
- Horizontal overflow: bounded to <=2 CSS px by the test.
- R6 mobile export targets: at least 44x44 CSS px when visible.
- Reduced-motion path is exercised.
- Language switch is exercised and persistent R6 status remains coherent.

The uploaded evidence was inspected at representative desktop-light and mobile-dark sizes after #272. This remains synthetic/current-browser certification; it does not claim real-user retention or every OS/profile rendering condition.

## Trust / privacy result

UX-R6 did not create a new remote transport, synchronization service or external authority. The certified source keeps the local-first boundaries explicit:

- complete export and Backup are local user actions;
- preview masking is presentation privacy, not cryptographic protection;
- external access is fail-closed after restore;
- transient Grants/session authorization and credentials are not resurrected through Backup;
- no R6 browser journey emitted hidden provider or external network requests;
- Adapter 95/95, privacy/security 52/52, development privacy/permission/network audit and macOS Secure Store certification all passed.

## Gates

| Gate | Result | Evidence |
|---|---|---|
| G-01 Repo baseline | PASS | R6 stayed on `ux-r2`; frozen CI base remained `ad386c07...`; `main` unchanged. |
| G-02 Scope / compatibility | PASS | UX-R6 only; no production sync, MCP/remote API, mobile app, voice or brand expansion. |
| G-03 Unit / migration / domain | PASS | Four unit jobs PASS; Full Suite unit group 909/909; R6 Backup/export/settings compatibility contracts PASS. |
| G-04 Real browser | PASS | R1->R6 serial current-browser journey 32/32 plus complete current browser suite PASS. |
| G-05 Trust regression | PASS | Adapter 95/95, privacy/security 52/52, development audit and macOS secure-store gate PASS. |
| G-06 Visual / a11y | PASS | R6 16-image evidence artifact plus viewport/theme/contrast/target/reduced-motion acceptance PASS. |
| G-07 Release | PASS | Full Suite receipt, release build/guards and aggregate Certification gate PASS. |
| G-08 Handoff | PASS | This report plus official UX execution status establish the canonical R6 checkpoint; control state separately records the exact certified source. |

## Known limits / non-goals

- Current PAIA still does **not** provide production device synchronization.
- Open export is not an encrypted backup and cannot restore every runtime/operational state.
- Backup is private-data portability/recovery, not a mechanism for restoring old external permissions.
- Preview masking hides UI previews only; it is not encryption or screenshot protection.
- `realGolden` remains `UNAVAILABLE`; current-browser evidence is authoritative for this synthetic release certification, while the 76 pre-migration browser files remain separate historical evidence.

## Handoff

UX-R6 is **COMPLETE**. The exact certified implementation/test source is `2d5de7e19d4756ecf90babf5101ff0127d7c6d50`, certified by PAIA Certification #272 / run `34903574502`.

After this report and `UX_IMPLEMENTATION_STATUS.md` are published as a documentation-only checkpoint and the v3 control state is sealed, the next authorized activity is the **final UX-R1 -> UX-R6 release regression**. That regression must use the sealed R6 checkpoint and must not reinterpret historical or docs-only commits as the exact R6 certified implementation source.
