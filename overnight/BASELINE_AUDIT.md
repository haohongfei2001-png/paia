# Overnight baseline audit — 2026-09-14

This is a source/CI reconstruction for planning, not a fresh execution of product acceptance. No old-chat completion claim is used as project evidence.

## Pinned repository facts

Repository: `haohongfei2001-png/paia`.

| Item | Observed value |
|---|---|
| Active product branch | `ux-r2`, explicitly named in target UX_IMPLEMENTATION_STATUS |
| Product HEAD | `c8bcecd4c8a49a069e66225c199fc3d49c7b8b1b` |
| Product root tree | `fb40053c4ce93ec42d8a7989e95d794fc0c2d34b` |
| Main observed HEAD | `c1c37f749a80f96ce3b1e5f19efad75679c3142c` |
| Merge base | `ad386c07cff59b9b3472a5aa03626fe89514f8d1` |
| Target vs observed main | diverged, 14 ahead / 83 behind |
| Merge-base → target actual changed-file inventory | 96 files, +2741 / -603, visible in CI carrier PR #28 |
| Current official UX round | UX-R5 READY / NOT STARTED |
| Existing reports | R1, R2, R3, R4 and R4 security report; no R5/R6 report at this snapshot |

The three-dot comparison is a merge-base comparison, NOT a two-tip content diff and not permission to bring main into the recovery line. Do not interpret squash-history divergence as proof of missing code.

## Source reads and scope of inspection

Read the active `extension/AGENTS.md`; the governing Design Core and UX Spec (particularly fixed semantics, migration, G gates, commands, R5/R6 and state-machine sections); current implementation status; PRODUCT / ARCHITECTURE / ROADMAP; DEVELOPMENT_WORKFLOW; existing R1–R4 recovery/report evidence; R4 DELTA-04/05 security report; package.json, test.mjs, test-report.mjs, compatibility-gate.mjs and mandatory workflow; actual AI editor/runner source and Remote Object v1 contract.

Inspected current branch refs, tree inventory, recent commits, actual compare file statistics, recovery squash patch and selected source implementations. This is not a claim that every line of the 96-file branch diff has received a full security audit. A later implementation must read all touched source and applicable contracts at its own pinned product HEAD. The small overnight bootstrap set is not a replacement for the governing Spec.

Root tree had no root AGENTS.md or existing overnight directory at the pinned source. The existing relevant AGENTS is `extension/AGENTS.md`; discover any additional nested instructions before modifying a newly introduced platform/integration path.

## Recent integration history

- `c8bcecd4c8a49a069e66225c199fc3d49c7b8b1b`: docs(ux): checkpoint R4 recertification and R5 truth.
- `693a43992dcd071f5d40e60901fb97ee11075b5a`: docs(ux-r4): recertify DELTA-04 and DELTA-05.
- `ef1f9389d0f686d5a361bca0f696cf9a5db18415`: docs(ux-r4): record Recovery-1 recertification.
- `ee7fe62f543b4354206b9e3a46b298bbbce79f46`: Recovery-1 squash integration.
- `c4a373824646e576814c80cc9fe24c46d4507d5a`: recovered UX-R3 handoff.
- `e0d7fb09cae70e42c6a92c91e0a56d08ccb379da`: UX-R3 certified source.

R4 source `37c0d64683a4dc3ca2bd823e7c46f3c431f252d3` and squash `ee7fe62...` have the SAME tree `2b3aa4aff7da7e6d22368246457f95a9ab9a31a5`. Compare squash → current target returns only three changed Markdown files: UX_IMPLEMENTATION_STATUS, UX_R4_REPORT and UX_R4_SECURITY_REPORT. Thus the runtime continuation is evidence-backed; no runtime changes are hidden inside these three documentation checkpoints.

R4 recovery patch includes real changes to external-access defaults, serialized Context bind/share, output counts, AI Backup evidence closure, stale Material Tray fencing, purge notification ordering, startup and idempotent capture repaint behavior. Existing domain boundaries must be retained.

Older R2/R3 report portions mention unfinished later local work. Such wording is historical evidence, not a current R5 completion record. Actual current status and source must control; preserve any real reusable fragments discovered during preflight.

## CI independently queried

R4: PR #23, source `37c0d646...`, PAIA Certification #205 / run `34799718496`, recorded PR merge ref `843e34717f78671d13d8bd8ad18e4d011b59ae56`.

Queried actual run jobs and steps: all ten required current-release jobs succeeded. The separate optional historical-browser job was skipped. Full Suite, Current Browser, adapter/privacy, four unit shards, release build, macOS secure-store and aggregate gate all succeeded.

Committed R4 report states 884 unit + 23 browser + 95 adapter + 52 privacy = 1,054 full-suite passes, zero fail/skip; reported digest `81bcb268380b0502f9fd07b0085106633f8735fafabda5cf3b51d078fcabdb37`. Those counts are report-derived in this audit. Receipt bytes, logs proving each count and visual artifacts have not all been independently inspected here, and no product tests were rerun in this planning session. First execution must close necessary evidence review or rely on new executed certification with actual artifacts.

Fresh carrier created for ongoing verification: Draft PR #28, `ux-r2` → `overnight/ci-base-20260914`. Initial PAIA Certification #257 / run `34826604211` was actually observed IN_PROGRESS, not PASS. Refresh status instead of copying this observation into a completion claim.

## Engineering constraints that materially shape the plan

- Existing PAIA workflow push trigger only covers main; PRs cover extension/native-host/workflow paths. A state file on the active product PR could repeatedly trigger/cancel CI. Therefore control metadata is on a separate branch, not the product head.
- Current full-suite receipt is valid only for its actual input digest. The digest does not encompass every workflow/package/native-host input, so exact diff/tree checks are additionally necessary.
- `package.json` exposes test/unit/browser/historical/check/build scripts and pins Playwright 1.63.0; there is no lint script. Report that absence honestly.
- UX R5/R6 require all eight commands and G-01–G-08. A new browser test file outside the required workflow is insufficient.
- Existing Round 5 crypto, key management and macOS adapter are reusable, not evidence of production account/sync/iOS/MCP services.
- Native secure-store CI does not prove physical Secure Enclave success, real signed/notarized distribution or stable production Chrome identity.
- Current Context packages are ephemeral; local Passport is not remote OAuth/MCP authorization. The earlier conversational 1.0 design is a future destination/proposal, not a current source implementation.

## Environment and audit limits

The GitHub connector successfully reads source, refs, CI and exposes branch/tree/commit/PR writes. A direct container network attempt to obtain the repository failed DNS; no product build or runtime validation was performed here. This does not establish that later scheduled executions have the same tools or limitations. Each must verify its own executable environment or permitted existing CI plus artifact access, without asking for or exposing secrets.

All new deliverables in this planning turn are control Markdown/JSON and non-main CI plumbing. No product source, main, production service, daily profile, App Store listing or actual Scheduled Task is changed by the bootstrap.
