# Original reviewed-target requalification (local candidate)

Base `f7e64ffdef90f8b8c0e50ba09ac42f1aa9083ccd`, branch `codex/local-selection-requalification-20261025`. Original owner runtime only: `core/browser-native-sync/application-generation-selection.js`. Added one owning test file; no fixture/shared owner/proof/compiler/worker/UI/configuration/workflow changes.

## Narrow supported profile

`OriginalApplicationGenerationSelection.requalify()` takes **no arguments**. Only its current owner-private `cuts` WeakMap record can supply the reviewed target. The method reuses the same original candidate/registry/targetCore handles and preserves the original review operationId, dataset, graph/canonical digests, source and target physical database identity/name/factory, target gate, registry root and SDK before/control fences. Caller-supplied DTOs/proofs or another owner cannot qualify it.

It recaptures the complete original source and target inheritance proofs using existing `prepareOriginalApplicationInheritanceCut` / `requireOriginalApplicationInheritanceCut` and captures **all original physical rows**. Both complete new physical row trees must still equal the original reviewed trees, without metadata filtering, normalization or skipped rows. Therefore this first profile safely renews same-content original tail/control-observation expiry only. Any actual content, target, control, restore identity, unknown metadata, pending marker or reservation change refuses; a failed requalification discards the stale private prepared record and closes its original candidate/registry handles, so activate cannot use it. Even a later proven legitimate owner-settlement metadata write is **not accepted** by this profile and requires a new explicit review. This does not solve the broader settlement requalification dependency.

On success a new private prepared record holds the newly proven physical cut but the original operation identity. Original activation is unchanged: it still requires both full inheritance proofs, exact control/registry checks and full physical rows within original write transactions before installing markers. Existing one-SDK-dispatch/unknown/cancel/continue semantics are unchanged.

Explicit new prepare closes/discards the superseded original handles. A private lifetime prevents close during pending prepare/requalify from publishing an old asynchronous prepared result. Busy concurrent prepare refuses; after old work settles a new explicit review has a distinct operationId. Success retains the existing handles instead of opening a replacement target.

This method is **not global, editor, host, legacy, cold or provider quiescence authority**. Root's later consumer must acquire and recheck the actual original holds and final dispatch-bound guard. RPC/global gates, cold CONTINUE consumer, provider configuration and activation permissions remain unchanged.

## Validation

Pre-existing official Node22.23.3/macOS arm64. Only small synthetic local Node/fake IndexedDB tests; no native browser, cloud, downloads, models/accounts, scale replay, build, push or deployment.

- `requalification-first.log`: first 17 new cases **17/17**, 9918.380625 ms, 0 fail/cancel/skip/todo.
- `owning-combined.log`: final four complete owning/affected files **56/56**, 14616.819666 ms, 0 fail/cancel/skip/todo. Includes final 19 new cases and original SDK loss/one-dispatch/cold selected paths and synthetic worker wiring. This is not native browser qualification.
- `node --check` on the runtime and `git diff --check` passed.
- No failed test invocation in this candidate. Prior project failures are neither overwritten nor relabeled by these local results.

Controls include same original review+tail advance→requalification→original activation with unchanged operation; source/target content change; source/target unknown raw metadata; replaced registry candidate without opening a replacement DB; target gate change; source database rebinding; changed SDK before row; source/target pending markers; restore-epoch change; foreign owner and forged arguments; raw mutation after new capture still refused by original activate; close during requalification/prepare; explicit reprepare identity; and source/target pending control reservations. Every refusal path checks original complete data and SDK call count for no mutation by requalification.

## Exact commands

Node binary:
`/Users/hhf/.codex/worktrees/organize-handoff-validation/paia/work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node`

Both commands ran at the worktree root:

`--test extension/tests/application-existing-selection-requalification.test.mjs`

Final complete combination:
`--test extension/tests/application-existing-selection-requalification.test.mjs extension/tests/application-existing-selection.test.mjs extension/tests/application-selection-consumer.test.mjs extension/tests/application-store-selection.test.mjs`

Final byte identities are in `source-vector.json`; SHA256SUMS covers this report and raw logs. Independent root review is required before local integration. No remote publication.
