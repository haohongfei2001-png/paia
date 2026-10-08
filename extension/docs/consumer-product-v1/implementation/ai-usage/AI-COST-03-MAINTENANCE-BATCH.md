# AI-COST-03 local maintenance assembly candidate

Base b1f10884bd8fadb5b3780055bfb920f928d68b5d, isolated branch
codex/ai-maintenance-batch-20261008. This adds an unused local owner adapter,
not a scheduler, Qwen transport, financial service or production activation.

AI_USAGE_PLAN outcome03 and AI_USAGE_ARCHITECTURE section4 require one bounded
multi-facet cycle, no repeated unchanged DEFER and no catch-up storms. The Qwen
amendment retains PAIA-owned jobs/evidence and requires separately qualified
Flash/Plus/Max routes and held-out quality evaluation. Those gates remain open.

The existing foundation already owns dirty delta, exact facet coverage, logical
job deduplication, current authority and atomic plan/commit. Its collect method
correctly retains unresolved work, including deferred work, but is not a retry
planner. readMaintenanceBatch reuses these existing rows and returns the exact
foundation.plan request shape only when a current metadata candidate is available.
It does not persist another queue or ledger. Scope/contract/route are explicit
inputs; other job types, timestamps and invented service windows are rejected.

One bounded read selects at most50 dirty rows (default37), preserves the real
next cursor (`complete` describes scan exhaustion, not all work resolved) and checks exact facet/scope ACK rows. At most100 units are partitioned
into50-unit children under CHILD_LIMITS.AI_MAINTENANCE=2. Filter-only residual work
cannot start an independent maintenance cycle. Bounds refuse rather than truncate.
The read checks actual foundation authority/current source/revision protection.
The result remains CANDIDATE_ONLY, dispatchAllowed:false, financialAuthority:false;
actual plan/commit must revalidate it. Partial remaining candidates do not resolve
or replace an existing in-flight job: the existing plan owner may refuse that
new scope, and this adapter never cancels or retries it.

Existing DEFER records are job-scoped with an opaque retryCondition and no
condition evaluator or per-unit lookup index. The adapter uses a bounded100-row
read of that existing prefix and returns UNAVAILABLE if more records exist.
Any same-unit/same-signature DEFER blocks automatic reassembly, even across jobs.
A genuine evidence signature change can be reconsidered. Clearing a non-evidence
retry condition remains unsupported pending a real owner; no local time/string
change is treated as proof. The adapter does not claim priority scheduling,
service-window deduplication, restart/device quotas or a complete orchestrator.

## Local evidence

Actual synthetic OrganizerStore/AIUsageFoundation tests establish:

-37 Inputs yield74 units and two children in one real plan; repeated plan reuses
 the same logical/child IDs and produces no physical attempts.
-38 Inputs retain a truthful continuation; no skipped final page.
-Actual local ACK removes just its facet; full local resolution has no candidate.
-Actual fixture DEFER remains unresolved with no automatic retry; changed Working
 Input revision allows reconsideration. The test fixture's provider is purely
 in-process synthetic and never performs a network call.
-Missing authority, stale plan input, filter-only work and all bounds fail closed.
-After existing foundation initialization, adapter reads do not mutate the meta,
 job, work-item or usage stores and output contains no source/working body.

First run:9 PASS/1 FAIL, /tmp/ai-maintenance-batch-first.log. The no-write fixture
snapshot was taken before foundation initialization, whose existing maintenance
writes are part of foundation.read preparation. Completing that setup before the
comparison corrected the fixture without changing the assertion or production.
Final new file10/10 PASS, /tmp/ai-maintenance-batch-fixed.log. Complete AI02 files,
new AI03 file and foundation owner115/115 PASS,0 skipped/cancelled,4341.190041ms,
/tmp/ai-maintenance-batch-related.log. Static package guard11845 checks/356 runtime
resources PASS, /tmp/ai-maintenance-batch-package.log.

No browser, provider account, paid model, permission, schema, CI, Settings,
worker or foundation runtime changed. Independent root_finish review found no blocking issue and independently ran
the whole new owner file10/10 PASS (/tmp/ai03-maintenance-independent.log).
Exact integrated candidate verification remains required. AI-COST-03 is not complete.

## Follow-up: bounded obsolete-DEFER archival (base 282f1a74)

The earlier read-only adapter description is superseded only for overflowing active DEFER history. A single read now performs at most one 100-row archival transaction and one new qualification read. This is no scheduler, provider call, time-based retry, dispatch authorization, or financial reconciliation. Ordinary nonoverflow reads remain read-only.

Negative-first actual-owner test produced 102 DEFER records through 51 legal `plan` → fixture dispatch → `commitFacet(DEFER)` → human Input-edit cycles. No raw malformed record was used to prove this normal-history defect. The prior adapter returned `UNAVAILABLE / DEFER_SCAN_BOUND` before evaluating current dirty work: `/tmp/ai-maintenance-defer-before.log`.

`AIUsageFoundation.archiveObsoleteDeferred` validates each inspected DEFER record's exact shape and original job/child/unit/signature binding. Within the same transaction it archives only a record proven obsolete by current KNOWN metadata with a changed signature/removal, or exact acknowledged unit/signature evidence. Missing KNOWN/job/authority is never guessed to be obsolescence. Each original record survives under `aiu:defer-history:` with `originalId` and all other original fields unchanged; active-prefix removal and history insertion are atomic. Existing conflicting history fails closed. Jobs, attempts, receipts, reservations and financial state are untouched. No store/index/schema or worker entry is added.

Malformed rows abort the entire archival page. The retained 101-malformed regression stays fail-closed and byte-for-byte unchanged. Same-signature opaque DEFER remains active; no opaque retry condition is presumed cleared. A remaining overflow stays `UNAVAILABLE / DEFER_SCAN_BOUND`, now with bounded `cleanup` progress. The method exposes a bounded primary-key cursor for explicit maintenance, but the adapter does not loop or skip pages to manufacture absence. If the first page consists of still-current records, this batch does not claim arbitrary-sized active-pool query scalability.

Evidence on current code:

- Six complete related unit files **122/122 PASS**, `/tmp/ai-maintenance-defer-related-final.log` (4.782136459s): maintenance batch, foundation, domain commit evidence, atomic reservation, settlement, semantic invalidation. Maintenance file contains 18 cases.
- Legal 102-record history now yields the current candidate after exactly 100 records are preserved in history; metadata/jobs/usage remain identical and archived rows reconstruct their originals exactly.
- Legal 204-record history yields only 100 archival moves on the first explicit read and remains unavailable with 104 active rows. A second explicit call advances once and returns a qualified candidate. No hidden loop.
- Actual owner tests cover same-signature retention, actual ACK, real Input removal, missing KNOWN, in-transaction current-state qualification, malformed-row rollback, and failure injected after the second active-row deletion with whole-store rollback. The initial rollback oracle expected the injected Error, but the real repository correctly normalized it to `STORAGE_FAILED`; the final oracle checks that exact existing code. The old failure remains `/tmp/ai-maintenance-defer-unit.log`.
- The above units use production owners with the existing synthetic repository harness. The separate native evidence below proves the new write boundary in real Chromium IndexedDB; neither constitutes a cloud/provider or worker-wiring claim.
- **12220 package guardrails / 369 resources PASS**, `/tmp/ai-maintenance-defer-package.log` (static).
- Tested hashes: foundation `156e9a4fd175b4fe18bf2659a65b7b26b4bdc467d0a852ff36c1272ffd0eb29a`; maintenance-batch `4080c01eec688c33c0544c6259f2c9e9a1aa5d3a6231418209c597b7b0f492d1`; owning test `0449f47909d22052de3b36575e199fd73b344bf44c5bdbf709295c9ef54a9f8a`.

Independent review and integration are separate from these local results; no current remote CI, main or installed acceptance is inferred. Version and CI remain the coordinating owner's responsibility.

### Real IndexedDB follow-up and independent review

The existing complete `cpv1-01-ai-cost-foundation-chrome-e2e.test.mjs` retains its two source/release cases, original 120-second case budgets, original atomic-delta/unknown-attempt/reload coverage and current semantic-invalidation/performance checks. Each case now additionally creates 102 DEFER rows via legal production `plan` / fixture dispatch / DEFER / human Input-edit calls in an isolated native database. Injecting a failure after the second active-row removal rolls back the entire database snapshot. A normal overflowing read then archives exactly 100 rows; every original field reconstructs exactly, and jobs/usage/Source/Input remain unchanged. A separate 101 malformed-row corruption fixture remains unavailable with the entire database unchanged. No provider request occurs; releases use the existing private temporary build path.

- Complete native source/release **2/2 PASS**, 16.696027958 seconds: `/tmp/ai-maintenance-defer-native.log`. Both report `nativeFactory:true`, 102 original active rows, `STORAGE_FAILED` on injected abort, complete rollback, 100 historical rows preserving original records, and exact jobs/usage/records/input preservation. No skip/cancel.
- Runtime/unit/native bytes recorded and verified unchanged: `/tmp/ai-maintenance-defer-final-bytes.txt`:

```text
156e9a4fd175b4fe18bf2659a65b7b26b4bdc467d0a852ff36c1272ffd0eb29a  core/ai-usage/foundation.js
4080c01eec688c33c0544c6259f2c9e9a1aa5d3a6231418209c597b7b0f492d1  core/ai-usage/maintenance-batch.js
0449f47909d22052de3b36575e199fd73b344bf44c5bdbf709295c9ef54a9f8a  tests/ai-cost-03-maintenance-batch.test.mjs
ea5f504a690517bd32fa8a5c9061502d92d59e6054d47ad966b13500a660013d  tests/cpv1-01-ai-cost-foundation-chrome-e2e.test.mjs
```

`root_finish` independently reviewed the runtime/unit changes and executed the complete owning file **18/18 PASS**, `/tmp/ai-defer-independent.log`. The explicit-cursor/current-first-page limitation was independently confirmed and remains disclosed above. The same independent reviewer subsequently approved the native increment: legitimate DEFER production path, exact original history, whole-snapshot rollback, original budgets/oracles and no-provider boundary. No duplicate browser execution was requested.

After the native run, `git diff --check` identified one trailing space on the newly added native `preserved` comparison line. Only that trailing space was removed; the executed native hash above remains the historical evidence, while final syntax-checked native file hash is `b44ac093e293d1cda215c430f674096c1517602cac9f4f6017be2b295eada2e7`. Runtime and unit hashes remain unchanged. No browser rerun was needed for this whitespace-only change.
