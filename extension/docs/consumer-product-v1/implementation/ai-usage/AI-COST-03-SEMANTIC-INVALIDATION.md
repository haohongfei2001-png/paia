# AI-COST-01 / 03 semantic-write invalidation candidate

Base: 7e68a30cdc2d9a8e39f0176a6ba839f25d620c37, merge of PR207 ed0356f6 and independently confirmed main 1d50b2c4. This local increment wires the existing semantic transaction tail to existing job cancellation semantics. It grants no processing, entitlement, reservation or provider dispatch capability. The production foundation still has no trusted resolver. Financial service and Qwen quality acceptance remain unavailable / not run.

## Scope and bounds

Only an actual changed semantic signature, or a changed existing gate / restore marker, triggers this check. Duplicate capture, navigation and unrelated metadata do not scan active jobs. The existing v5 organizerJobs.byMaintenance index selects ai_usage_v1 stateKey=0, at most100 rows. The page is collected before any cancellation; if its continuation exists, the entire batch stays unchanged and the helper returns INCOMPLETE / SCAN_BOUND. No truncated page is reported as fully invalidated. The transaction-local result is not a durable product notification or another retry queue. No background continuation is implemented. Existing foundation.current checks still reject stale dispatch and commit in this overflow case.

A same-transaction known semantic signature/removal, trusted gate change, or explicit restore epoch change can establish stale work. Missing known data, missing authority or unavailable reads are not interpreted as proof. Read failures propagate and roll back the canonical write. Legacy/narrow transactions missing the required meta/job/usage stores return UNSUPPORTED without touching them. Existing repository write transactions include these stores for full v5 domain operations; no transaction scope or schema changes are made.

Human-fence-only changes deliberately retain the existing plan rebind contract. They still prevent direct stale reserve/dispatch; only the original trusted plan owner can rebind the never-dispatched remainder. Existing partial local acknowledgements, logical IDs and child IDs are preserved. A changed human fence alone never rewrites a dispatched receipt.

Confirmed stale work follows the existing cancel semantics: never-dispatched work becomes CANCELLED_BEFORE_DISPATCH; actual unknown dispatched work stays OUTCOME_UNKNOWN with RESERVATION_RETAINED; recorded but uncommitted results become EXPIRED_UNCOMMITTED, also retaining spend. Completed child receipts remain byte-identical, including local NO_PROVIDER_COST results, while only unfinished siblings are cancelled. A durable dispatch fence with an absent or zero-attempt receipt returns INCOMPLETE rather than assuming no dispatch. Physical attempts, operation IDs, receipts, dispatch fences and facet acknowledgements are not recreated or removed. Already-cancelled unknown work is not repeatedly cancelled. No claim of a financial refund is made.

## Evidence

- Original actual-owner negative: /tmp/ai-stale-before.log, 1 pass / 2 failures (canonical edits left PLANNED / RESPONSE_RECORDED jobs).
- Initial broad human-fence cancellation: /tmp/ai-stale-related-first.log, 64 pass / 4 failures. Three established rebind/receipt cases revealed an incompatible scope; the implementation was narrowed and those assertions are unchanged.
- The fourth previous failure was the existing exclusion test's STALE_BASE error. With approved earlier atomic cancellation, the same reserve now rejects exactly CANCELLED. The sole old-test hunk additionally requires CANCELLED_BEFORE_DISPATCH, dispatch rejection and zero physical attempts; it does not accept multiple errors.
- Final command: node --test extension/tests/ai-cost-*.test.mjs extension/tests/cpv1-ai-cost-01-foundation.test.mjs. 129/129 pass, zero failures/skips/cancellations, /tmp/ai-stale-all-final.log. Includes thirteen new actual OrganizerStore tests, overflow/no partial mutation, unchanged dispatch fence, unknown retention, read/write rollback and duplicate zero-index-scan behavior.
- Synthetic fake-indexeddb operation measurements: 100 active jobs plus actual edit:524 reads /115 writes, approximately33ms in the final whole-file run; zero-job actual capture:40 reads /19 writes, approximately2.35ms. These totals include the domain operation, not just this helper. Measurements are local harness observations, not Chrome IndexedDB or 10k performance qualification.
- Static package check:11869 guardrails across357 runtime resources pass, /tmp/ai-stale-package-final.log. git diff --check passes. No browser rerun, real provider, cloud account or financial test is claimed.

Independent review found an already-COMMITTED local child was incorrectly rewritten by the reused cancellation algorithm; a new actual-owner negative and a separate missing-receipt dispatch-fence negative both failed in /tmp/ai-stale-review-before.log. Preserving completed receipts and refusing ambiguous fence/receipt combinations fixes both, thirteen new owner tests pass in /tmp/ai-stale-review-after.log. Final root_finish independent re-review found no remaining blocker and actually ran the entire thirteen-case owner file:13/13 pass, /tmp/ai-stale-independent-final.log. This is a local invalidation slice, not complete AI-COST-03 maintenance or production paid admission.

## Exact reviewed candidate bytes

- core/ai-usage/delta.js: 4e1ccac7f4ac04624aa791b384a4122883bb8bc00066a3253643098116704f8a
- core/ai-usage/semantic-invalidation.js: 2bbc29a25d16314eebf77004c074a73f442e0590c86606cc91371e0fb7d8ebd0
- tests/ai-cost-semantic-invalidation.test.mjs: b2e793035b37f4fd8f707d56c0a71eb7dcf3743f3d258850704c5bff88392096
- tests/cpv1-ai-cost-01-foundation.test.mjs: c9090b303957c1859c69bb742c6fda5f6c5bbd43fd29277330842ab27e5d6f61

## Actual Chrome IndexedDB follow-up

On production checkpoint854803d8 (runtime unchanged), the existing full
`tests/cpv1-01-ai-cost-foundation-chrome-e2e.test.mjs` was extended in place.
The original100 captures, body-free queue, separate facet acknowledgement,
page-reload unknown fence and original rollback assertions all remain.
New assertions use actual production OrganizerStore and Chrome IndexedDB:
unknown attempt plus real Working Input edit retains its one attempt/reservation;
an actual resolveLocal completed child receipt stays byte-identical while its
unfinished sibling's job is cancelled; cancellation-write failure rolls back both
canonical Input and jobs;101 active jobs leave the entire set unchanged and
return INCOMPLETE while the existing reserve gate still rejects stale evidence.
Fixtures use separate synthetic database names and injected synthetic authority;
there is no production entitlement, worker restart or real provider evidence.

Complete source/release file2/2PASS,0 failures/skips/cancellations,4742.87ms,
/tmp/ai-stale-native.log. Source2120.18ms; release2287.88ms. The original120000ms
per-case budget is unchanged. Release uses the existing fresh mkdtemp builder
and guard, then removes only its generated temporary directory. One headless
browser suite ran with explicit PLAYWRIGHT_MODULE1.63.0, matching package.json.
All zero-network/privacy assertions passed. No visible user browser was opened.

Runtime hashes remain the checkpoint values above. Actual run test hash:
30613cb0b2bedc3157fac5d09d4667f6dcec6ed15517904bb891dcd7206cd643.
Harness fake-chatgpt.mjs:
edeecefc2b0ecb6a6d74083d78fb180a22326178a5499c2b473ea30b424840ed.
package.json:
72e1ce7c6c6208601c8ed94d0a6f7f8acd1c575714acc56174e30c5a4d9d6001.
The browser test increment passed root_finish independent read-only review of the actual assertions and2/2 log; prior129 unit evidence is
reused only because all runtime and unit-test bytes remain unchanged.


## Coherent integration candidate0.24.1

The coordinator merged native-verified6b33e7b9 with Prompt/Settings8a38c864 without conflicts (merge8fb4e911). Product manifests/package now identify0.24.1 AI Job Safety, planned after0.24.0 Prompt; the existing strict0.24 backup admission already covers this patch and still rejects0.25. No backup/schema rule changed. The preceding bounded maintenance adapter from PR207 remains unused in production; this batch's actual runtime change is the existing semantic-write invalidation hook.

On the combined tree, complete AI owner/CI plus backup files pass133/133 (1408.11ms), package guard12220 across369 resources passes, and the unchanged complete source/release native file passes2/2 in4648.00ms. Native assertions include actual IndexedDB unknown-spend retention, completed local child receipt identity, rollback and101-job overflow refusal. No model, entitlement authority, reservation or new dispatch path is enabled. Full high-risk current-head CI and exact-main integration remain pending; previous scoped evidence is not full-seven-lane completion.
