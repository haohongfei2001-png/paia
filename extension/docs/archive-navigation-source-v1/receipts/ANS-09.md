# ANS-09 Completion Receipt — Integration, lossless migration and final certification

Package: `PAIA-ARCHIVE-NAVIGATION-SOURCE-v1`.
Execution: `ANS09-20260921-aem01`.
Start main: `d0f767fb64deb3c951bbd916d232114de9a8dbfb`.
Docs-only claim: `cbf78739f0d7bc0c7f42828d3fdd80045c319936`.
Previous receipts read: ANS-01 through ANS-08.
Candidate branch: `manager/ans09-aem-20260921`.
PR37: https://github.com/haohongfei2001-png/paia/pull/37
Final candidate: `512ba781d140680d61714eefa6ae527198ec1aba`.
Main runtime/test commit: `4e7d991852c451027f11e6974a4413eb897277bb`.
Main tree: `a99634456e4e8a81f88633aaa3589db1d7ea4bc9`.
Candidate/main/local validated trees match exactly.
Main Certification: **#434 / run35564803189 / attempt1 / success / event push /
branch main / head4e7d991852c451027f11e6974a4413eb897277bb**.
Certification completed: `2026-09-21T05:59:41Z`.
Product-owner blocker: **NONE**.

The 2026-09-21 user instruction authorized this separate READY-round execution.
It did not reuse ANS08's writer or old worktree. The manager published the visible
claim before runtime work and merged the reviewed PR with its expected head.
Local archive-snapshot Git ancestry was never pushed. GitHub commits used actual
remote parents and non-force updates. Runtime certification and completion-doc
publication have distinct SHAs; documentation cannot contain its own future SHA.

## Delivered scope

- R1–R9 integration is mapped requirement by requirement in
  `../INTEGRATION_MATRIX.md`: V01–23, M01–08, C01–08, P01–06, RSP01–06. All mapped
  current tests execute in this certification; prior receipts are not substituted
  for current evidence. Existing Navigator/Topic implementations were retained.
- A genuine pre-package archive generated and validated by unmodified
  `38804b99153074f54148f875e2e09c76568bc1cd` tests raw DB upgrade and portable Backup
  restore. All canonical fields and portable items are deeply compared, including
  IDs, original bytes/hashes/times, working text, revisions, provenance, exclusions,
  settings and fences. Reopen/index rebuild preserves canonical state.
- Tamper, unsupported version, oversized line, truncation and occupied-target cases
  require exact failure codes and unchanged existing archive. Oversize is greater
  than actual `BACKUP_LIMITS.lineBytes`; limits and strict restore are unchanged.
- The migration regression exposed dangling placement/provenance when the existing
  export gate excludes a source-derived entry. A six-line Backup export fix applies
  that same entry gate to dependent rows. The original strict restore failure was
  reproduced before the fix; the regression now passes. Independent human content
  remains preserved; source-bound lifecycle restrictions are unchanged.
- The same actual browser journey runs against source and current release build:
  legacy Backup into real IndexedDB, two tabs, injected save failure, unsaved text
  across Project move/external deletion, explicit retry, real worker termination
  and fresh-heap restart, automatic selected Input restoration, Topic reading,
  Source purge and preservation of wholly independent new writing. Source digests
  are compared before/after; forbidden observation from UI is rejected.
- P02 has committed 30-sample warm source-order page and preference measurements,
  each p95 <=500ms, retaining exact order/selected-identity checks. The preference
  restart regression holds an actual pending write and requires durable commit
  acknowledgement, rather than treating selected DOM state as persisted state.
- Product, architecture, roadmap, UX specification and agent-routing documentation
  now describe current ANS behavior. Frozen Design Core, manifest/host permissions,
  source identity, DB version, body ownership and AI authorization remain unchanged.

Runtime change is limited to `core/backup-service.js`. Other changed files are
verification, fixture/harness and documentation. This round adds no new provider,
feature direction, account, credential, paid action or permission scope.

## Migration and browser evidence

Fixture: `tests/fixtures/ans-09/legacy-38804b9.json`.
SHA256: `2f71bd6db4ba96b12f37faa01566b9b5595175b32dea2925637edd707df0d7c0`.
It contains 37 raw stores and 84 portable Backup rows, all synthetic. A pinned
baseline generator and provenance README are checked in. No user profile, real
credentials or source-site export is represented by this fixture.

Source/release immutable Source+tombstone digest:
`0e38522187338a1248d154501e2798a140c84aec00c382ef98c4f2226a8e8be4`.
The two JSON journey reports match. No active source/AI/external request or page
error occurred. Reader and Topic screenshots for both source/release were opened
and inspected; six viewports assert no horizontal overflow. Existing current
responsive, IME, focus, selection, dirty pin and performance tests cover the full
matrix rather than claiming four screenshots alone prove every requirement.

Local environment: Node26.8.2, macOS arm64, Playwright1.63.0, Chromium1243;
all profiles isolated/headless. No user Chrome window or focus was used.
Local final source/release focused run: 2/2 PASS, zero fail/skip,9.03seconds.
Migration plus existing Backup regressions:17/17 PASS; reviewer-strengthened
migration negative cases:5/5 PASS. Preference fault regression:1/1 PASS;
local P02 page p95 2.53ms / mode1.62ms over30 samples each.
Package guards9146/216 PASS; actual current release build8711/209,233files PASS.
Build source fingerprint:
`ea7d8ec7f276b392a4be14bb349cac528736863c39a1e85275e2b5ab291d73a4`.
This fingerprint predates the last test-only corrections; runtime did not change.

## Remote certification

Reviewed PR candidate Certification #433 / run35561856567 / attempt1 / success /
head512ba781d140680d61714eefa6ae527198ec1aba completed2026-09-21T05:08:08Z.
Candidate Current Browser63/63 and Full Suite1207/1207, zero fail/skip; full groups:
unit988, browser63, adapter102, privacy54. All required jobs and final gate passed.
Its merge-ref checkout is PR evidence and is not used as exact-main certification.

Exact-main #434 completed success on the published runtime/test commit above.
- [Full Suite Certification](https://github.com/haohongfei2001-png/paia/actions/runs/35564803189/job/106224402312):1207/1207 PASS,0 fail/skip (unit988/browser63/adapter102/privacy54).
- [Current Browser Certification](https://github.com/haohongfei2001-png/paia/actions/runs/35564803189/job/106224402396):63/63 PASS,0 fail/skip; explicit UI Refresh10/10 PASS. Both ANS09 source/release journeys passed.
- [Current release build and guards](https://github.com/haohongfei2001-png/paia/actions/runs/35564803189/job/106224402397):success.
- [Adapter and privacy contracts](https://github.com/haohongfei2001-png/paia/actions/runs/35564803189/job/106224402411):success.
- [macOS Secure Store](https://github.com/haohongfei2001-png/paia/actions/runs/35564803189/job/106224402424):success.
- Unit [1/4](https://github.com/haohongfei2001-png/paia/actions/runs/35564803189/job/106224402550), [2/4](https://github.com/haohongfei2001-png/paia/actions/runs/35564803189/job/106224402437), [3/4](https://github.com/haohongfei2001-png/paia/actions/runs/35564803189/job/106224402474), [4/4](https://github.com/haohongfei2001-png/paia/actions/runs/35564803189/job/106224402439):all success.
- [Certification gate](https://github.com/haohongfei2001-png/paia/actions/runs/35564803189/job/106229527084):success.

Full-suite receipt: `fullSuite=true`, `auditPassed=true`, `historicalBrowserFiles=76`,
input digest `77b250b823d8f48b3fb735ad186eec411df65c5748b67a81f74611ac707e0b2c`.
Current browser coverage contract `core=11 uir=10 ans=11` passed. Package guardrails
9146 across216 runtime resources and the privacy/permission/network audit passed.
No local re-certification was repeated after merge because main and certified
candidate have the identical tree; the independent main CI above supplies required
publication evidence.

Historical Browser Audit is skipped by current workflow policy. Full-suite audit
checks that its 76 historical files remain accounted for as separate pre-migration
evidence. It must not be reported as newly run historical browser certification.

## Retained failure and correction history

1. Original legacy-exclusion regression failed BACKUP_INVALID: exported dependent
   references outlived an ineligible entry. Export was corrected; strict restore,
   graph validation and source lifecycle gates were not loosened.
2. Reviewer caught an oversized test fixture below the actual line limit. It now
   uses limit+1 and exact BACKUP_TOO_LARGE; all malformed cases assert their reason.
3. Old-head local full38e80aa exposed an ANS06 asynchronous preference-write race.
   A held/delayed write reproduced it. Current test requires durable preference and
   non-busy acknowledgement before restart. Superseded run35559221304 was cancelled;
   local full was interrupted after preserving its failure (exit130, not PASS).
4. Candidate26cd / run35559573964 passed browser63 but full1206/1207 failed the new
   release journey. Test navigation after reload cleared documentId and raced
   automatic restore with a volatile collapsed-group locator. Current512ba removes
   interfering root navigation/fallback; it requires the selected Input to restore
   itself and exact saved text. Shared helper and production behavior are unchanged.
5. An intermediate local generated package contained63 extra duplicate-named files,
   all mtime2026-09-21T03:46:51Z. Source tree contained none. The old generated
   directory was retained whole and a clean package rebuilt. Process inspection
   found no old test/build worker or overlapping writer. Cause is unknown; no guard
   was bypassed, and no user files were deleted.
6. Initial post-restore/purge export snapshots legitimately returned BACKUP_CHANGED
   during maintenance. The final test waits for actual stable durable generation;
   it never retries a failed export or accepts a partial hash chain.

## Honest capability and execution boundaries

ChatGPT current-conversation identity/presence uses its existing verified path.
Project identity/name/membership/order/rename/move/deletion remain unverified and
unavailable; source order uses PAIA fallback. Synthetic provider proofs establish
only generic admission/reconciliation/integration behavior. Claude legal import
and Backup retain their existing contract; `realExportVerified` stays false.
No calibration/evaluation, live capability certification or new authorization was
invented for this round.

Retain independent worktree and evidence:
`/Users/hhf/Documents/Codex/2026-09-20/github-plugin-github-openai-curated-remote/work/paia-ans09`.
Local reports/logs/screenshots are under `extension/work/ans-09/`.
Preserved polluted artifact: `extension/work/current-release-preserved-duplicate-files-20260921`.
Old user checkouts, branches, uncommitted contents and failure records are intact.

ANS09 and the package are COMPLETE with no active round or writer. This receipt
and STATUS are docs-only closure of the certified runtime above. The manager
publishes the closure, resolves its separate completion-doc SHA from GitHub and
reads the remote files back; the completion document does not claim its own SHA
was executed by the earlier runtime certification. There is no ANS10 or READY
next round in this package. This execution stops and releases its writer.
