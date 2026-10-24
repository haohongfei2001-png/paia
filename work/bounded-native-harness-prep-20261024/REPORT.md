# Fixed eight-case native-harness preparation

## Outcome

Preparation only; native gate **NOT_READY**, all eight proposed product-native cases **NOT_RUN**. This task performed zero browser/native launches, builds, installations, downloads, workflow dispatches, PRs or remote mutations. Existing prior Source-only preparation, its blocked launch and all earlier failures remain unchanged.

Isolated worktree: `bounded-native-harness-prep-20261024`.
Branch: `codex/bounded-native-harness-prep-20261024`.
Accepted base: `98761c8c627ee66445c20dee452959d644fcd634`.
Accepted base tree: `b3b243627bf9ff117565d27d646f126a63e6c55b`.
The partial `7ceb73c` lineage is not included.

## Prepared artifacts

Nine new files under `extension/tests/cloud-components/bounded-native/`:

1. `policy.mjs`
2. `source-manifest.json`
3. `artifacts.mjs`
4. `runner.mjs`
5. `recovery-saved-fixture.mjs`
6. `fixture-provenance.json`
7. `runner.test.mjs`
8. `fixture-contract.test.mjs`
9. `README.md`

The Source manifest SHA256 is `798736cc88a97530c6270c5455b59ff3bd3a0d1cd258a9deee7a418a70c64b2a`. It pins exactly 474 original core/background modules and five original builder/guard files. Their bytes were checked against accepted Git blobs; none were edited. This is the exact module-serving inventory, not a claim that every Source-tree file was enumerated.

The final prepared fixture SHA256 is `0b516daf11378ecc98791499e8e7359f96fe56eea6d6eac06aff93e761caa35d`. The previous final Source-only fixture SHA256 is `f7f9e0ab8334141c203f95f3b23c2097ee6d24534142799c743738ea193f46fd`. Each of its four case bodies and names remains byte-exact, separately pinned in fixture provenance. Only import depth and the fixed-ID/per-case/cleanup wrapper changed.

No executable production file, package version, manifest, website, main workflow, original test, builder, guard, permission or budget was changed. No real launcher adapter, executable path lookup or native CLI exists. `requireNativeReadiness()` always throws `NOT_READY`.

## Proposed configuration and ownership

Exactly one sandbox-enabled launch; no retry, alternate binary, sandbox fallback or profile. Exactly two fresh sequential contexts, Source then genuine Release. Exactly four fixed IDs each, eight total, stop on first failure and preserve remaining NOT_RUN rows:

- `RECOVERY_WORK_BUDGET`: original recovery-ticket control-read refusal. The original API is deliberately precharged with 4095 references. This is a near-limit refusal control, **not end-to-end affordability proof**.
- `RECOVERY_NATIVE_ABORT_COLD`: original successor-stage native abort, exact full-table rollback and cold original recovery.
- `SAVED_EMPTY_SEARCH_COLD`: original Saved locator, pending-to-discoverable search and exact cold duplicate.
- `SAVED_MISSING_LOCATOR_ABORT`: original terminal locator fence and exact full-table cold rollback.

Product ownership references: `extension/tests/browser-native-sync-recovery-causal-tail.test.mjs` and `extension/tests/saved-bootstrap-search-discovery.test.mjs`. These existing suites were not rerun in this preparation. The old Working-retention runner requires two launches and is excluded; Context, local-meta, broader Working, C/cloud, old Full, 129-group and 100k lanes are excluded.

Proposed maximums: build 30,000 ms; native 120,000 ms; whole job 300,000 ms. These are not asserted as enforced OS limits. Process-tree ownership/termination, hard deadline enforcement, actual sandbox availability, OS network deny, executable identity and genuine supervised Release build provenance remain NOT_READY.

The artifact verifier accepts exact Source hashes and a separate full Release inventory/fingerprint, checking runtime correspondence to the unchanged original builder. Hash agreement is explicitly not build provenance. Unit tests use an in-memory `CONTRACT_FIXTURE_NOT_A_BUILD` Release-like double only. A future genuine Release must be emitted by the unchanged original `build_current_release.py` with its original guards under verified supervision. No Release was built or claimed here.

## Verification performed

Final combined pure contracts: **17/17 passed**, zero failed/skipped/cancelled, in `pure-runner-07-cleanup-review.tap`. Node `v24.19.0`, Linux cloud execution. The duration is runner-unit timing, not native or environmental performance evidence.

The tests cover fixed IDs, exact one launch, sequential contexts, no fallback, first-failure stop, unchanged sandbox options, exact route allowlisting, page-network deny behavior in an isolated VM, manifest/hash tampering, Source/Release confusion, modified Release despite self-consistent hashes, immutable served bytes, soft timeout, unknown late-handle cleanup, exact original fixture bodies, and cleanup preservation. They never import or execute product modules or invoke a native component body.

All new JavaScript modules are syntax-checked; source/docs whitespace checks pass. A full evidence diff reports four trailing-whitespace lines in the untouched independent pre-fix TAP failure log; those original log bytes are deliberately preserved rather than normalized. Final frozen hashes and patch are recorded beside this report after review.

## Preserved first failures and review corrections

- `pure-runner-01.tap`: first pure run failed at the test-file level without detailed child signal output.
- `pure-runner-02.tap`: repeated pure run explicitly reports SIGKILL. Neither is native/browser evidence. Both remain original failures.
- `pure-runner-03-targeted.tap` and `pure-runner-04-timeout.tap`: individually passing narrow diagnostics.
- `pure-runner-05.tap`: 13/13 after replacing a large mismatched Buffer `assert.deepEqual` with a bounded `Buffer.equals` boolean assertion and path-only refusal. This avoids potentially large assertion diff rendering; it does not prove the unique cause of SIGKILL or any native/environment performance claim.
- `pure-runner-06-combined.tap`: 15/15 with static fixture preservation checks.
- Independent read-only review identified two cleanup evidence gaps. The fixture could lose a body error when `finally` close rejected; it now retains the original body response/error, accumulates cleanup errors, attempts every close and prevents further case entry. A timed-out launch/context could resolve late without an assigned handle; receipts now explicitly retain UNKNOWN / UNCONFIRMED acquisition-cleanup state. No late cleanup or process termination is claimed. The reviewer preserved pre-fix bytes and pure diagnostic failures separately.
- `pure-runner-07-cleanup-review.tap`: 17/17 including both review regressions.

Independent final review accepted this exact nine-file freeze for PREPARATION ONLY, with no remaining blocking findings in that limited scope. Its final run passed 17/17 with zero failed/skipped/cancelled in 473.61334 ms; all six `.mjs` syntax checks passed; nine-file hashes matched before and after; no tracked production diffs existed. See `independent-review-final.tap`, `independent-reviewed-files.sha256`, and `harness-SHA256SUMS`. The reviewer accepted UNKNOWN late-handle state as honest unresolved cleanup, not successful cleanup or native readiness.

The independently reviewed harness-only freeze is local commit `70e2fbde27eae3da75dfa4f830fec0d509fa13d3`, tree `939ce37c3828299fa4907613d77dd66f77de774b`. A separate evidence-only successor preserves this report and all prior logs. The initial staging command refused evidence paths outside sparse-checkout; `evidence-stage-sparse-refusal.txt` records that outcome. Explicit `git add --sparse` stages only these newly authorized evidence files without altering sparsity or resetting anything. The ordinary evidence commit then hit the known unrelated missing blob `b5602156acf1c9a41d93b0efd982a1b4e8e78c17` at `work/context-authored-correction-SHA256SUMS`. Its exact failure is retained in `evidence-commit-sparse-gap.txt`. The parent authorized a missing-object-preserving tree/commit creation and guarded own-branch update; no fetch, restore, reset or read-tree occurs. Full independent review, including pre-fix diagnostic failures and snapshots, is retained under `independent-review/`. This preparation does not authorize native execution or upgrade any existing acceptance status.
