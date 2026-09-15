# UX-R4 Implementation and Certification Report

## Status

- Round: **UX-R4**
- Status: **COMPLETE — recertified 2026-09-14**
- Recovery baseline: `c4a373824646e576814c80cc9fe24c46d4507d5a` on `ux-r2`.
- Certified Recovery-1 head: `37c0d64683a4dc3ca2bd823e7c46f3c431f252d3`.
- Certification PR: **#23**, `recovery-r4-1` → `ux-r2`.
- GitHub Actions certification: **PAIA Certification #205**, run id `34799718496`, conclusion `success`.
- Certified PR merge ref: `843e34717f78671d13d8bd8ad18e4d011b59ae56`.
- Squash merge committed to `ux-r2`: `ee7fe62f543b4354206b9e3a46b298bbbce79f46`.
- Scope remains UI-06/07/15/16 and related Settings; DELTA-04/05; MIG-07/08/10. No R5/R6 implementation is part of this checkpoint.

The historical 2026-09-13 R4 implementation established the feature body. Recovery-1 re-audited the current GitHub source and closed the safety, race and certification gaps discovered after that checkpoint. This report records the current GitHub truth and supersedes the earlier local-only completion claim where the two differ.

## Recovery-1 corrections

Recovery-1 keeps the original R4 product model and repairs its boundaries rather than redesigning it.

1. **Safe connection defaults.** Fresh and legacy-missing `externalAccess` configurations now fail closed. `externalAccess=false` blocks connection/provider/Grant-bound release, but does not block explicit local manual copy or Markdown export. Manual selection identity and Grant identity remain separate.
2. **Context package serialization and exact output accounting.** Bind and final output share one serialized package boundary, preventing an in-flight share from overwriting a newly bound package. Final package metadata reports the actual emitted item count after removals/revalidation.
3. **Backup evidence closure.** AI presentation state is exported/restored only when its Topic and evidence are safely present and restorable. Evidence-incomplete AI presentation state is dropped or rejected instead of being resurrected from Backup. Human-authored work is not erased merely because generated state became stale.
4. **Material Tray stale-output fencing.** Delayed reads, language rerenders, policy changes and Source purge cannot repaint or re-enable an old preview. Stale/blocked output fails closed while the user’s current selection state remains explicit.
5. **Source purge ordering.** `PURGE_SOURCE` dispatches the invalidation notification before returning success, removing the window in which callers could observe purge success while old derived output was still visible.
6. **Archive/Reader startup and refresh stability.** Archive/Continue rendering no longer waits behind onboarding reads, and idempotent duplicate capture no longer emits a false archive mutation that causes avoidable DOM churn. Existing real mutations still notify normally.
7. **Deterministic browser certification.** The synthetic browser harness pins locale for locale-sensitive baseline assertions; explicit language-switch tests remain. Passport certification explicitly opts into external access before testing revoke/once-use semantics, so the test reaches the intended Grant boundary under the new safe default.

## Preserved product and trust semantics

Search remains bounded, paged and local. Historical reading uses immutable Source text and reliable original send time; current edits are not presented as historical expression. Explicit material selections use current canonical references and retain identity/version/range distinctions.

The preview remains an exact, local, user-controlled output surface. Edits, notes, order, removals and literal redactions survive rebuilds. Copy/Markdown requires explicit confirmation. Stale, blocked or expired material prevents output.

Manual local reuse deliberately permits explicit user-selected local material without requiring a Profile or Grant, but it never converts that manual intent into a Passport Grant. Grant-bound output still requires valid consumer/purpose/Profile scope, explicit connection opt-in, expiry/revocation checks and atomic once-use handling at final release.

No new body store, provider, required permission, host permission or physical schema was introduced by Recovery-1.

## Migration and compatibility

| ID | Current result |
|---|---|
| MIG-07 | Context/manual sessions remain worker-local, bounded and non-durable. Old/foreign/stale identities cannot be promoted into a current manual or Grant-bound release. |
| MIG-08 | Connection access is explicit opt-in. Missing legacy `externalAccess` fails closed; explicit `false` remains false. Local manual copy/export remains available because it is not a connection. Existing Local-only semantics remain stricter and continue to block provider/connection access. |
| MIG-10 | Backup preserves portable policy and user work while excluding transient sessions, queries, preview text and credentials. AI presentation state requires restorable evidence closure. |

Independent DELTA-04/05 analysis is maintained in `UX_R4_SECURITY_REPORT.md` and was updated with the Recovery-1 boundaries.

## Required certification commands

Certification source: GitHub PR #23 / PAIA Certification #205. The workflow checked out merge ref `843e34717f78671d13d8bd8ad18e4d011b59ae56`, produced from certified head `37c0d64683a4dc3ca2bd823e7c46f3c431f252d3` and the audited `ux-r2` base. All mandatory jobs concluded `success`; the final aggregate Certification gate also concluded `success`.

| Required command / gate | Result |
|---|---|
| `npm run test:unit` | **884/884 PASS**, 0 fail, 0 skipped across four CI shards (279 + 200 + 162 + 243). |
| `npm run test:browser` | **23/23 PASS**, 0 fail, 0 skipped. |
| `node scripts/test.mjs "adapter contract"` | **95/95 PASS**, 0 fail, 0 skipped. |
| `node scripts/test.mjs "privacy/security"` | **52/52 PASS**, 0 fail, 0 skipped. |
| `npm run check` | **8,258 package guardrails / 188 runtime resources PASS**. |
| `node scripts/check_development.mjs` | **DEVELOPMENT_PRIVACY_PERMISSION_NETWORK_AUDIT_PASS**. |
| `npm test` | **1,054/1,054 PASS**, 0 fail, 0 skipped; unit 884, browser E2E 23, adapter 95, privacy/security 52; `fullSuite=true`, `auditPassed=true`. |
| `npm run build:release` | **7,830 package guardrails / 181 runtime resources / 205 release files PASS**. |

Additional mandatory workflow gates also passed: macOS Secure Store Certification and the final aggregate Certification gate.

Full-suite receipt digest: `81bcb268380b0502f9fd07b0085106633f8735fafabda5cf3b51d078fcabdb37`. The current workflow continues to retain 76 pre-migration browser files as separate historical evidence rather than falsely counting them as current-source tests.

GitHub Actions artifacts include the current release tree, current full-suite receipt and UX-R1/R2/R3/R4 visual/browser evidence. R4 evidence upload completed successfully for the certified merge ref.

## Current browser evidence

The Current Browser Certification ran the complete current browser suite twice within the job boundary: the explicit R1→R4/current-product journey set and `npm run test:browser`. Both executions passed all **23** tests.

The five R4 browser journeys specifically verify:

1. Search pagination, fixed selections, Reader return, later capture and stale-response handling.
2. Direct unorganized Input → editable preview → redaction/rebuild/export under Local-only, including Source purge invalidation.
3. Historical Source comparison, scope/tray/preview responsive states, IME/keyboard/zoom and worker expiry.
4. F-LARGE behavior with 100,000 Inputs / 1,000 documents / 300 Topics / 5,000 Thoughts plus long Input reuse, bounded search, once/revoke and sender fences.
5. Real-worker once Grant, revocation and manual-vs-Grant identity separation.

Recovery-specific regressions additionally cover overlapping startup reads and the purge-before-success boundary. The previously failing Continue/startup and Source-purge cases passed on the certified tree.

## Security / privacy result

The certified tree preserves exact trusted-sender and consent gates. External/connection access is fail-closed by default. Grant-bound release rechecks connection access after reconstruction and before release. Once-use/revocation stays atomic. Source deletion has priority over derived output and Backup restore. AI presentation Backup state cannot survive without restorable evidence. No source body is introduced into diagnostics, authorization metadata or durable Context-session state.

All security/privacy contract tests pass, and the R4 real-browser paths perform no unauthorized provider/network release.

## Gates

| Gate | Result | Recovery-1 evidence |
|---|---|---|
| G-01 Repo baseline | PASS | Recovery began from audited `ux-r2` baseline `c4a373...`; `main` was not merged. |
| G-02 Scope / compatibility | PASS | Recovery is limited to R4 behavior, safety and regressions; no R5/R6 implementation. |
| G-03 Unit / domain | PASS | 884 unit tests; R4 selection, authorization, history, Backup and race regressions pass. |
| G-04 Real browser | PASS | Current Browser Certification 23/23 and Full Suite browser E2E 23/23. |
| G-05 Trust regression | PASS | Adapter 95/95; privacy/security 52/52; DELTA report updated. |
| G-06 Visual / a11y | PASS | Existing R1–R4 current visual/browser evidence uploaded by #205; responsive/IME/keyboard/zoom paths pass. |
| G-07 Release | PASS | Package/development checks, Full Suite, release build, macOS Secure Store and aggregate Certification gate all pass. |
| G-08 Handoff | PASS | PR #23 merged to `ux-r2`; report, security report and execution status are checkpointed to GitHub. |

## Handoff

UX-R4 is **COMPLETE — recertified**. The certified implementation is now on `ux-r2` via squash merge `ee7fe62f543b4354206b9e3a46b298bbbce79f46`.

GitHub contains no `UX_R5_REPORT.md` and no `UX_R6_REPORT.md` at this checkpoint. Therefore UX-R5 is **NOT STARTED** and UX-R6 is **NOT STARTED**. The next executable round is UX-R5 under the user’s renewed authorization; R6 follows only after R5 is actually implemented and certified.
