# Independent local interruption slice

- Read-only base: `/tmp/paia-main-sync-local-integration-20261026T1625Z`, `397d9797ddb28d0a3f54857d4df4d835c7819c2d`.
- Isolated branch/worktree: `codex/sync-interruption-inspection-20261026`, `/tmp/paia-sync-interruption-20261026T1824Z`.
- Scope: source-only restrictive observation for incomplete selection; original-guarded read-only worker STATUS ingress; existing Settings detail consumer; no original action/schema/quota/permission changes.
- Existing selected + target-cleaned cold reopen is KEEP, unchanged. Missing nonrenewable durable accounting/deadline for incomplete cold writes remains explicitly blocked.

## New bounded verification

`sync-interruption-readonly.test.mjs` is new, not an old-suite replay. Its complete production service-worker import runs against the synthetic initial host with the real original startup promise held. Core receipt tests use deliberately synthetic marker-only fake-IDB fixtures to test observation/refusal, not valid action admission or whole-library restore.

1. `backend-first.tap`: setup failure before application evaluation/cases because sparse checkout omitted the already tracked `extension/ui/input-search.js`; no passed case existed to replay.
2. Missing exact-HEAD UI dependencies were materialized without overwriting files. `backend-materialized.tap`: the four previously unexecuted new cases pass 4/4, 0 skips/failures. No provider/browser/network and no budget/capacity experiment.
3. Original worker NULL status returns with startup still pending; strict foreign/content/frame/incognito/payload negatives reject. SDK/DB counters remain unchanged. Source wiring also explicitly excludes status from the original post-response Filter/mutation-notification paths.
4. Prepared and dispatched source-only observations survive missing target/registry, preserve the exact marker and database set, refuse cancellation/cold opening or replay, and perform zero writes/SDK calls. Missing/corrupt/selected-incomplete dependencies fail without database creation or evidence changes.

Syntax checks passed for the three changed backend modules and the new backend test before the first invocation. These checks are local mechanism evidence, not actual Chrome/Edge/Safari, product visual/accessibility, provider, whole-Sync, or publication acceptance. All prior evidence and original UNKNOWN states remain intact. UI exact evidence and final manifest follow in this directory; no old tests will be replayed.

Integration must select the next appropriate product version against then-current main. This independent unintegrated branch does not reuse 0.55.18 as a separately delivered runtime and does not modify its candidate.

## UI evidence and review boundary

- New UI file first invocation: 19/19 PASS on its initial bytes.
- Second invocation: 20/20 PASS after preserving last-observed UNKNOWN across an unavailable refresh and correcting unavailable copy. This repeated the prior 19 new cases; it is **not** 39 distinct cases and no pre-existing suite ran. The author's declared second invocation completed before the coordinator's narrower no-repeat refinement reached it.
- Final wording-only successor: one fresh prepared-copy boundary check PASS on final bytes, selected by exact name; no final full-file replay. Final prepared wording says incomplete, not that a host crash is proven.
- All attempts, identities and setup failures are retained; see `ui-result.md`. The synthetic mount delegates to the existing Settings owner but does not qualify actual browser modal focus, visuals or accessibility.
- Independent review is requested for exactly five runtime files (the three backend modules plus Settings presenter/integration), with no further suite execution. No claim of integrated or published product readiness.

## Same-slice singleflight closure

The original new refresh entry was tightened before independent review: one physical STATUS promise remains pending across repeated clicks and Close/hide/reopen. View invalidation does not invent settlement; only the original fulfilled/rejected request clears pending. Stale outcomes are not displayed, no replacement is automatic, and an explicit post-settlement refresh is allowed. Two earlier overlap-expecting controls were materially updated, their exact previous source/test bytes archived, and three new hide/rejection controls added. Only the five singleflight-named controls ran, passing 5/5 on final UI bytes; no whole-file replay. Original 19/20/1 evidence stays attached to its own versions.

The intermediate local save `01370f67ee3f5a59aef58ef1d14b447d21cb7c3e` was not sent for independent review. The final successor is the sole requested review candidate, compared against original base397d9797. Pending .55.18 worktree remains clean at its original SHA.
