# PRD-01 — Exact-main Baseline and Certification-Debt Reconciliation

Execution: `PRD01-20260921-aem01`

Execution start main: `f821377daa3b84d55dfd6b0853431b6d68c6f6d5`

Writer: `manager/prd01-baseline-20260921`

Scope: automated engineering baseline and historical debt reconciliation only.
No live ChatGPT observation, daily-profile mutation, real archive read or feature
expansion was performed.

## Baseline

PRD-00 publication left remote main at
`f821377daa3b84d55dfd6b0853431b6d68c6f6d5`.
Its exact push triggered PAIA Certification #441 / run `35585419827`.

At the time this receipt was drafted, that exact-main run was still executing.
The final exact-main verdict must be filled from the completed run before PRD-01
can close.

## Historical Capture Foundation debt

The 2026-09-18 Capture Foundation full attempt recorded 1119/1129 PASS and ten
failures. That historical receipt remains immutable evidence. PRD-01 does not
rewrite it.

Current evidence shows the old failures remain represented in the present test
surface rather than being silently deleted:

| Historical failure | Current disposition |
|---|---|
| `history-performance-v090` 10k import | Current test still exists. CI now uses a 240s outer watchdog while retaining bounded batch/byte, read/search, idempotence and per-batch gates. The controlled-machine <120s commit target remains non-CI. Certification #437 full suite explicitly PASSed both 1k and 10k cases. |
| `original-trace-rescue-v072b` | Still current unit coverage; all seven named cases PASSed in #437. |
| `source-time` fingerprint lease | Still current unit coverage; all source-time cases including revoked-fingerprint lease PASSed in #437. |
| `uir-03-ai-presentation` | Still current Browser E2E; PASSed in #437 current/full suite. |
| `uir-03-preview-mask` | Still current Browser E2E; PASSed in #437 current/full suite. |
| UX-R2 F-LARGE 100k | Still current Browser E2E. #437 PASSed 100k Inputs / 1000 docs / 300 Topics / 5000 Entries. |
| UX-R3 F-LARGE 100k | Still current Browser E2E. #437 PASSed 100k Inputs / 1000 docs / 300 Topics / 5000 Thoughts. |
| UX-R4 F-LARGE | Still current Browser E2E. #437 PASSed the bounded large-library search/direct-reuse case. |
| `ux-r5-ai-organize` focus/navigation family | Still current Browser E2E. #437 PASSed the current UX-R5 organize cases. |
| `ux-r5-certification` | Still current Browser E2E. PR #38 corrected test lifecycle/synchronization without weakening timeouts or product behavior; #437 PASSed all three recovery cases. |

Certification #437 is not substituted for the PRD-01 exact-main run. It is used
only to prove that the historical failures were genuinely exercised by the
current test topology before this execution.

## Capture Foundation regression coverage

The historical Capture Foundation targeted command named adapter, backfill,
background-security, capture-foundation, capture, diagnostics, enrichment,
history-contract/observer/store, source-time/resolver, storage-foundation,
import-upgrade/ledger, frozen-capture and privacy-product tests.

Those files are part of the current non-historical full suite. The current full
suite is therefore a strict superset of that historical targeted unit set.
Current Browser also directly contains
`capture-foundation-chrome-e2e.test.mjs`.

PRD-01 uses the completed exact-main full suite as the current rerun evidence; it
does not require a second duplicate invocation of the same files merely to create
a different command line.

## Performance semantics

PRD-01 preserves the distinction between correctness watchdogs and product SLOs.

### 10k historical import

The present test explicitly documents:

- CI outer timeout: 240 seconds;
- local outer timeout: 180 seconds;
- controlled-machine commit target: <120 seconds, enforced only outside CI;
- portable correctness gates: bounded batch rows/bytes, every commit batch <10s,
  reading <10s, search succeeds, duplicate replay is idempotent and final state
  is exact.

The 2026-09-18 failure on a GitHub/fake-indexeddb timing threshold is not erased.
The current contract makes the portable CI semantics explicit instead of using
GitHub-hosted fake-indexeddb wall time as a production latency claim.

### 100k Reader/Thought/Search fixtures

The current UX-R2/R3/R4 large fixtures remain in Browser E2E with their original
300-second case ceilings and bounded-read/search assertions. No PRD-01 timeout
increase or assertion deletion was made.

These synthetic 100k gates are engineering scale evidence. Backup's independent
64 MB / 100,000-item restore boundary remains a PRD-04 concern; passing a 100k
Reader fixture does not imply that a 100k-Source Backup round-trip is supported.

## Compatibility gate semantics

`scripts/compatibility-gate.mjs` has two layers:

1. automatic evidence: `work/test-summary.json` must be a zero-failure,
   zero-skip, `fullSuite=true`, `auditPassed=true` receipt with an exact
   current input digest;
2. real-Chrome evidence: a matching
   `work/live-debug/verification.json` must satisfy the bounded real-evidence
   contract when `requireRealChrome=true`.

Therefore:

- a fresh checkout without the full-suite artifact correctly returns
  `AUTOMATIC_VALIDATION_REQUIRED`;
- after automatic evidence exists, absence of the real-Chrome evidence correctly
  remains `REAL_CHROME_VERIFICATION_REQUIRED`;
- PRD-01 may close the automatic engineering baseline only;
- current logged-in ChatGPT and daily-profile evidence remain PRD-02/03 and must
  not be relabeled as PRD-01 PASS.

## Scope audit

PRD-01 makes no runtime, durable schema, manifest/permission, provider,
authorization, Source identity, deletion, Backup or AI-behavior change.

No Semantic Engine, vector retrieval, sync, new provider or hidden AI work is
introduced.

## Pending exact-main closure

Before marking PRD-01 COMPLETE:

1. PAIA Certification #441 must finish on exact
   `f821377daa3b84d55dfd6b0853431b6d68c6f6d5`;
2. every required current-release job must be SUCCESS;
3. the full-suite receipt must report fullSuite/auditPassed and zero fail/skip;
4. capture/history/large-fixture evidence in the completed logs must be sampled
   to confirm it is the expected current suite;
5. final status must preserve V05+ live/daily gates as unresolved rather than
   upgrading `productionCertified`.
