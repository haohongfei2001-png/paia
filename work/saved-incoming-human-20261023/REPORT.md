# Saved mixed receive of original incoming Human groups

2026-10-23. Local implementation and synthetic Node qualification only.

## Identity and ownership

- Isolated tree: `/Users/hhf/.codex/worktrees/paia-saved-resident-jobs/paia`.
- Baseline `2166a2fa28f6045576a64e2c11bd612a4604bb77` contains the exact cherry-pick of root TDZ correction `13772bc6ec3dd14a117f33b89e742c6c03d05999`; its original descriptor captures remain intact.
- Implementation `cbbb8a3b03016e3073577a1d4c4c2d4ddce33586` changes three runtime paths and three owning test paths. No group-plan, scope, repository, invalidator, journal, workflow or default runner change.
- Old `/Users/hhf/.codex/worktrees/paia-saved-mixed/paia` two uncommitted patches were read only. They concern the already-integrated cold partition/retained-Human implementation, still refuse incoming Human, and were neither applied nor overwritten. Their exact diff hash is in `preserved-old-worktree.json`.

## Delivered consumer

The existing Saved coordinator accepts only original `entry`/`entry-edit` Human commit groups, alongside its existing Saved-successor path. Each group gets an authentic incremental Human application against the exact pre-step compiled plan. Original Human named owner and protocol receiver perform the real write. The durable step cursor includes every member and descriptor; a cold coordinator resumes after a whole committed group, never half a group.

A private application witness binds store/core, original before-plan identity, original after-plan contents and the single original group. The Saved retention planner captures the pre-write raw database and constructs canonical, original allocation/counter, Human mapping, protocol, search, semantic metadata and original resident invalidation expectations before owner execution. It never adopts a post-write snapshot. The same transaction must seal the complete raw-table terminal proof. Local B Saved/Human content, physical histories, receipts and outbox remain represented. The existing invalidator retains its bounded behavior and UNKNOWN/settled/completed semantics; no synthetic financial refund, second dispatch or cross-device job replay is introduced.

## Wire identity versus cold local physical allocation

The original group compiler still rejects cross-entity wire created-sequence collisions. Cold replay of a genuine original Human partition may allocate a local sequence equal to a Saved wire sequence even though wire identities are distinct. The cold Saved owner now detects this specific local collision in its private pre-write plan, assigns a fresh monotonic local created/updated sequence, and writes a version-2 exact physical map (created, updated and all history physical fields). The immutable wire creation identity does not change. Multiple Saved members are included in local collision checks.

Version-1 mappings remain readable and strict, including exact created-sequence equality. Version 2 requires strictly larger local created allocation and exact wire/local images. Every scope check and subsequent original Saved edit verifies the mapping first. Saved editing emits the original wire creation identity while retaining its local physical allocation; cold C can edit/re-export to cold D. Missing/forged/copied/wrong mapping is refused. This is a local recovery proof, not global relaxation of identity or canonical guards.

## Verification (Node v22.23.3, macOS arm64)

Exact Node executable: `/Users/hhf/.codex/worktrees/organize-handoff-validation/paia/work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node`.

- Original baseline archived under the repository-local ignored `work/saved-incoming-human-baseline/`: the two new consumer positive cases failed 0/2 with `BNS_GROUP_MERGE_OWNER_UNSUPPORTED` (`original-baseline.log`). Only those two baseline cases ran.
- First setup call used invalid device IDs containing spaces: 0/3, corrected only fixture IDs; output was in the tool transcript. No consumer was reached.
- Initial original-owner integration: 2/3, create failed only at cold C `BNS_SAVED_WORK_COLLISION` (`first-original-owner.log`). After local-map support: 2/3 because the initial wire history expectation incorrectly used locally reordered history (`cold-mapping.log` and synthetic-only `mapping-diagnostic.log`). Corrected to original final wire payload, then 3/3 (`cold-mapping-wire.log`).
- Expanded new cases: 27/27 (`expanded.log`).
- First combined nine owning files: 204/205 (`owning.log`). The one failure was an updated old assertion incorrectly requiring the same-batch Saved successor to remain unchanged. Corrected the assertion to require the retained Human row plus the actual incoming Saved title. No production behavior changed for this correction.
- Affected two files: 66/66 (`affected-final.log`); additional forged-v2/multi-Saved/first-Human cases 3/3 (`allocation-tail.log`).
- **Final nine complete owning files: 209/209, 0 fail/cancel/skip/todo; TAP 23205.756333 ms** (`owning-final.log`). This includes all **34 new incoming-Human cases**, old wire-collision/fork/full-table protection, the 18 resident-job cases and original Human group tests. No name filter in final invocation.

Final command: `node --test extension/tests/browser-native-sync-saved-*.test.mjs extension/tests/browser-native-sync-human-library-group.test.mjs` using the absolute executable above. Shell commands saved TAP output and displayed tails; their shell completion was successful. Test counts and duration are from the unmodified TAP, not synthesized aggregates.

The first two baseline archive preparation attempts named nonexistent paths (`extension/shared`, then root `package.json`). They did not execute any test; their missing-file outputs are retained, followed by a successful archive of `extension` only. The baseline directory remains ignored/preserved, not tracked as another copy of the product.

## Limits

No browser, release build, 65/129 scale run, cloud job, Full, real account, credential, model/provider, installation or deployment executed. Native Source/Release remains a subsequent integrated milestone. This does not certify Linux capacity, the entire Sync programme or the product. General structural Human families and wire allocation collisions are still fail closed; resident state is not exported across devices. The 4096-reference, 2 MiB and 30-second protections remain.
