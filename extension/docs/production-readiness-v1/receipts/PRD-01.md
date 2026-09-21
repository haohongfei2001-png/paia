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
Its exact tree is `e62fa0f2d67804d20ae23b70bbb7cb1923b92ea3`.
Its exact push triggered PAIA Certification #441 / run `35585419827`.

A repository compare from the already-certified PR #38 head
`07690218e84293cf74acf202572b387701416dfd` to this PRD-00 main shows only the
new Production Readiness documentation/routing files. Runtime, tests, manifest,
workflow and package scripts are unchanged between those two points.

Certification #441 became the failure baseline described below. It is preserved
as failed evidence and is not used as the PRD-01 closing certification.

## Exact-main #441 first-attempt failure

PAIA Certification #441 attempt 1 on exact PRD-00 main did **not** pass.
Current Browser, all four Unit shards, Adapter/privacy, release guards and macOS
Secure Store passed. The unsharded Full Suite completed with two failures and
zero skips, so the final Certification gate correctly failed.

The two retained failures were:

1. `ux-r4-search-reuse-chrome-e2e.test.mjs` — the real-worker once-Grant
   concurrency case expected exactly one successful share and observed zero.
   The same file/case passed in Current Browser on the same exact source.
2. `ux-r5-ai-organize-chrome-e2e.test.mjs` — during first AI generation,
   Original was not visible at one refresh point while the provider request was
   still gated. The same case passed in Current Browser on the same exact source.

This is a real PRD-01 blocker. It is not reclassified as runner noise.

Investigation found two independent race boundaries:

- the once-Grant test began Memory preview construction immediately after a real
  capture fixture reached Source-count completion, without requiring the
  asynchronous Smart Filter queue to be idle. If a late foundation write lands
  after preview creation, the trusted Memory path correctly rejects the preview
  as stale, so both concurrent share attempts may fail before Grant consumption;
- Thought AI refresh hid Original immediately on entry to AI view, then awaited
  status before learning that no saved presentation existed. A slow status read
  could therefore expose a transient blank/AI-only interval during first
  generation even though the intended product contract is "Original remains
  readable until a saved presentation exists".

The bounded repair keeps the Grant assertion unchanged, waits for capture/filter
quiescence before that Grant-specific test constructs its preview, and changes
AI reading refresh so Original is hidden immediately only when a saved
presentation is already known. A new held-status regression forces the
first-generation refresh window instead of relying on timing.

No timeout, permission, schema, provider, authorization or paid-request rule is
relaxed.

The failed jobs were also re-run unchanged as #441 attempt 2 only to measure
reproducibility. That retry cannot erase attempt 1 and is not a substitute for
the repaired candidate certification.

### #441 attempt 2

Attempt 2 did not establish a clean baseline either. The unmodified ANS-05
Navigator browser case hit its existing 300000 ms test timeout. The unsharded
suite later continued through unit and browser work, including the large UX-R2/R3
fixtures and early UX-R4 cases, but GitHub cancelled the Full Suite job at the
existing 30-minute job boundary before `work/test-summary.json` was written.
The final Certification gate therefore failed.

This second result is also retained as failure evidence. No timeout was increased
and no missing receipt was synthesized.

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

The 2026-09-18 full attempt was run locally without `CI=1`, so it used the
180-second outer timeout. A direct historical read of the same test at
`d063707293d887352905143dc1af58c1cbb5e606` shows that the 240-second CI
watchdog, 180-second local watchdog and controlled-machine <120-second commit
target were already present then; PRD-01 did not relax them.

On exact-main #441, the 1000 case PASSed at 09:50:14Z and the 10000 case PASSed
at 09:53:16Z under the pre-existing CI contract.

The 2026-09-18 failure is not erased.
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

## Repaired candidate and exact-main certification

PR #40 candidate head
`a9f0ff42f6dc30190d2a2d5acecce51ba8151142` passed PAIA Certification #442 /
run `35588786337` on the behavior-bearing candidate. Full Suite reported
1207/1207 PASS, 0 fail, 0 skip with `fullSuite=true`,
`auditPassed=true`, `historicalBrowserFiles=76` and input digest
`26b6c3acdaae1f36871c7d901664ac0b94aaae0bb113b387278cbb249c86987f`.
Current Browser also passed the repaired UX-R4 once-Grant path and the held-status
UX-R5 first-generation path.

Review then found two documentation inconsistencies only: the queue row still
said READY while the canonical field said IN_PROGRESS, and the scope audit
understated the bounded runtime UI fix. Those were corrected without changing
runtime/tests. The final PR head was merged as:

- merged main: `c32acb0f1454268c6cf67bd5d203ba2e781bc7d9`
- certified tree: `ee5eae893d2f6c98055d65d73084915b1f676300`

Exact-main PAIA Certification #445 / run `35591542309` completed SUCCESS on
that merged main:

- Unit: 988/988
- Browser E2E: 63/63
- Adapter contracts: 102/102
- Privacy/security: 54/54
- Full Suite: **1207/1207 PASS, 0 fail, 0 skip**
- `fullSuite=true`
- `auditPassed=true`
- `historicalBrowserFiles=76`
- input digest:
  `26b6c3acdaae1f36871c7d901664ac0b94aaae0bb113b387278cbb249c86987f`
- package guardrails: 9146 across 216 runtime resources
- Current Browser: SUCCESS
- release build/guards: SUCCESS
- macOS Secure Store: SUCCESS
- final Certification gate: SUCCESS

The exact-main Current Browser log explicitly re-passed:

- all three Capture Foundation browser journeys;
- UX-R2 F-LARGE: 100k Inputs / 1000 documents / 300 Topics / 5000 Entries;
- UX-R3 F-LARGE: 100k Inputs / 1000 documents / 300 Topics / 5000 Thoughts;
- UX-R4 F-LARGE and the real-worker once-Grant case;
- UX-R5 first-generation/Original-readability and the remaining ON-01 paths.

Thus the historical automated debt is reconciled on the current certified
runtime/test tree without deleting the old failed evidence or weakening its
gates.

## Scope audit

PRD-01 makes one bounded runtime UI behavior fix: while the first AI
presentation is still being generated and no saved presentation exists,
ThoughtWorkspace keeps Original readable during an asynchronous status refresh.
This does not change provider calls, authorization, persistence, Source/Thought
ownership, or AI-generated content semantics.

PRD-01 makes no durable schema, manifest/permission, provider, authorization,
Source identity, deletion or Backup change. No Semantic Engine, vector
retrieval, sync, new provider or hidden AI work is introduced.

## PRD-01 final verdict

**COMPLETE / ENGINEERING BASELINE PASS.**

PRD-01 closes V01-V04 for the certified engineering baseline represented by
`main@c32acb0f1454268c6cf67bd5d203ba2e781bc7d9` and Certification #445.

This does **not** satisfy V05+ live-provider/daily-profile/product-use gates.
In particular:

- current logged-in ChatGPT compatibility remains PRD-02;
- bounded live capture reconciliation remains PRD-02;
- daily-profile update/restart/recovery remains PRD-03;
- Backup current-version round-trip and supported production scale remain PRD-04;
- real retrieval/reread/reuse value remains PRD-05.

Therefore:

- `acceptanceComplete=false`
- `releaseCandidateCertified=false`
- `productionCertified=false`

PRD-02 may become READY after this receipt/status closure, but it is not started
by PRD-01.
