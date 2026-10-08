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
