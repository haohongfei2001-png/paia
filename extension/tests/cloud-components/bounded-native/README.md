# Bounded Recovery/Saved native-gate preparation

Status: **NOT_READY for native execution.** This directory contains a reviewed-target preparation, not native or release acceptance. It has no browser import, actual launcher adapter, automatic executable discovery, build entry point, workflow dispatch, or native CLI. The only runnable tests are pure runner/verifier/static contracts with a fake launcher. `requireNativeReadiness()` always refuses.

`exercisePreparedRunner` accepts an injected fake launcher for unit testing. This callable injection seam is **not an enforcement boundary** against a caller supplying their own real launcher. Such a caller would be outside the authorized preparation and must not treat the unit runner or its result labels as a native-execution gate. This package supplies no real adapter or CLI.

## Exact proposed scope

Accepted Source is `98761c8c627ee66445c20dee452959d644fcd634`, tree `b3b243627bf9ff117565d27d646f126a63e6c55b`. The partial `7ceb73c` lineage is not used. The pinned Source manifest records all 474 existing core/background JS modules and the unchanged standard builder/guard digests. The inventory is a fixed explicit route allowlist, not guessed import parsing or arbitrary filesystem serving. Requests for any other files are denied.

One sandbox-enabled browser launch, with no retry, alternate executable, changed security flags, profile, or fallback. Exactly two fresh contexts, **Source then Release**, never overlapping. Source must close successfully before Release opens. Each context executes exactly these four IDs, sequentially. Any failure stops the remaining cases; receipts retain observed failures and mark untouched cases NOT_RUN.

1. `RECOVERY_WORK_BUDGET`: original recovery-ticket pre-callback control-read refusal. This explicitly precharges 4095 references via the original API. It proves a near-limit refusal control, **not actual end-to-end resource affordability**.
2. `RECOVERY_NATIVE_ABORT_COLD`: real successor stage transaction abort, full physical rollback, cold original recovery, exact Source/Working/revision/receipt state and no echo.
3. `SAVED_EMPTY_SEARCH_COLD`: genuine completed-empty search locator, honest pending search, original maintenance discovery, cold duplicate preservation and no echo.
4. `SAVED_MISSING_LOCATOR_ABORT`: remove the original Saved locator inside the original activation hook, require exact original terminal error and cold full-table rollback.

This is four cases × two variants = **eight**, not a filtered/relabelled old native job. The four case bodies are unchanged from the final prior Source-only preparation; `fixture-provenance.json` and static tests pin their individual hashes. Only import depth, strict case IDs/order, per-case response and cleanup wrapping differ. Their original old-base preparation and all failed launch evidence remain untouched.

The separately prepared Working-retention runner uses two launches and is excluded. Context, local-meta, broader Working, old Full, 129-group, 100k, C/cloud, MV3, native-host, provider and full-product qualification are excluded. A tiny Working successor within the existing Recovery case is not a new Working-retention lane. No website, runtime owner, workflow, test threshold, production guard, or builder is changed.

## Files and owning tests

- `policy.mjs`: immutable base, fixed IDs, launch/context options, proposed budgets, unconditional native NOT_READY gate.
- `source-manifest.json`: accepted Source module hashes and original build/guard hashes.
- `artifacts.mjs`: exact Source manifest/hash verification, separate Release inventory/hash/fingerprint verification, immutable byte snapshots, and expected unchanged-builder runtime correspondence. Receipts alone do not establish builder provenance.
- `runner.mjs`: single-launch, sequential-context orchestration contract; exact route fulfillment, blocked page networking, preserved failures, first-failure stopping and clearly labelled soft deadline.
- `recovery-saved-fixture.mjs` / `fixture-provenance.json`: fixed four original native component bodies, not run here.
- `runner.test.mjs`: pure fake-launcher and manifest unit tests. The in-memory Release-like test double is explicitly `CONTRACT_FIXTURE_NOT_A_BUILD`, never a generated Release or native evidence.
- `fixture-contract.test.mjs`: text/hash preservation tests and an extracted-wrapper cleanup unit test. The latter never imports the product/fixture module or invokes any component body; its fake preflight values carry no native evidence.

Existing product ownership references are `tests/browser-native-sync-recovery-causal-tail.test.mjs` for the recovery-budget and successor-abort controls, and `tests/saved-bootstrap-search-discovery.test.mjs` for the original Saved locator/final-fence behavior. These existing owner suites were **not rerun** by this preparation.

Allowed preparation check, from the repository root:

```sh
node --test --test-concurrency=1 --test-reporter=tap \
  extension/tests/cloud-components/bounded-native/runner.test.mjs \
  extension/tests/cloud-components/bounded-native/fixture-contract.test.mjs
```

All `.mjs` files may be syntax-checked without import/execution. Do not execute the fixture in Node, a browser, or any native launcher on the authority of this document.

## Future native prerequisites, not implemented or authorized

The proposed maximums are build ≤30 seconds, native ≤120 seconds, whole job ≤300 seconds. All must cover process launch, case work, cleanup and descendants within a verified outer supervisor. Promise racing here is only an orchestration contract and **does not kill an OS process tree**. The 1-second best-effort cleanup timer also does not establish containment. A failed or timed-out launcher/context acquisition is retained as `outcome: UNKNOWN, cleanup: UNCONFIRMED`; later Promise resolution does not upgrade the receipt or start another case. No late-handle cleanup is claimed. Fixture cleanup preserves the first body error, attempts every known repository close and records all close errors, even when the body succeeded. A timeout/uncertain launch must not be retried. Real process supervision, network containment, executable selection and budget accounting remain NOT_READY.

A future separately approved adapter must:

1. Bind fresh explicit execution authorization to the exact accepted source, frozen harness hashes, eight IDs, one launch, budgets and environment. Do not infer native approval from preparation or prior failed attempts.
2. Read Source and Release from separate verified roots without symlinks or shared runtime-file identity. Verify files against accepted Git bytes, the pinned Source manifest and full frozen harness hashes before and after; preserve original and failed outputs, never reset or clean.
3. Run the unmodified `extension/scripts/build_current_release.py` once under the build/outer budget, with its original package/release guards, retaining raw output, return code and provenance. No hand-assembled, source-renamed, cached or release-like fixture can qualify. Generate Release hashes only from that verified emitted directory, and bind them to source commit/tree, source fingerprint, complete output fingerprint and builder/guard hashes. No such Release exists in this preparation.
4. Supply independently verified executable identity, real sandbox availability, OS-level network deny, no credentials/provider/profile, actual process-tree supervision and evidence of hard termination. Page route/API controls are defense in depth, not OS-network proof.
5. Import the fixed fixture separately from the genuine Source and Release byte snapshots, using fresh isolated contexts in the same sole browser. Assert native IndexedDB/internal slots. Reject network attempts, page errors, hash drift, wrong IDs, missing assertions and incomplete cases. Stop on first failure; preserve full receipt and unrun rows.
6. Obtain separate review and authorization for any expansion. No adapter, real launch, build, process-limit adjustment, security change, dependency installation, download, dispatch, PR or remote publication is authorized by this preparation.

These prerequisites are deliberately not represented by caller-set `approved: true` flags or a permissive “ready” option. A future production adapter and verified supervisor require a separate scoped change and review.
