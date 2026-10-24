# Checkpoint proof duplicate-read removal

Status: scoped code candidate, not automatic Context or product acceptance.

Base: 26e6b241342990dfd5d64b599e44e727fd692892.
Local commit: 76553558bf0ee2e4a7bb5c09d2f918665a5210d0.
Branch: codex/dot-cloud-automatic-20261024.
Only two files changed. No push, PR, version change, build, installation or deployment.

## Exact change and equivalence

In canonical-generation-checkpoint-stage.js requireProof, retain the state/gate point checks. Remove only the preliminary item/page body point reads already repeated by the immediately following complete prefix readRows calls. The original readRows checks cursor key equals row.id, charges all physical rows, and compares the complete ordered item/page collections with the private cloned proof. Missing, changed, extra and same-cardinality replacement rows therefore remain rejected.

The original points vector is unchanged. Every terminal item/page point read, both prefix counts, currentness checks, purge guard, real original transaction and all resource ceilings remain. No shared IDB change, read cache, skipped fence or reduced fixture.

## Verification

Runtime: Linux x86_64, Node v24.19.0. These are cloud-computer synthetic Node/fake-IDB tests, not historical Node22/macOS evidence or GitHub Actions.

1. Syntax: node --check on both changed files: PASS.
2. node --test extension/tests/canonical-generation-checkpoint-stage.test.mjs: 49/49 PASS, 0 fail/cancelled/skipped/todo, 5150.502043 ms. Log: automatic-stage-owning.log.
3. node --test extension/tests/repository-final-read-fence.test.mjs extension/tests/canonical-generation-owner-restore.test.mjs: 53/53 PASS, 0 fail/cancelled/skipped/todo, 4658.652517 ms. Log: automatic-owner-fence.log.
4. git diff --check: PASS.

The original 27 stage cases remain unchanged. The 22 additive cases cover the apply/seal/input entrypoints, actual terminal get inventory, complete-set absence/content/extra/replacement rejection, corrupt cursor key and read failures, rechecking after a real same-transaction write, late deletion/replacement terminal rejection, all-table rollback and the ordinary 2 MiB byte refusal.

Independent read-only reviewer reported no blocking findings for the exact two-file hashes below. It verified the logs without rerunning them.

## Frozen identities

Runtime SHA256: 45dc7dd94dec3664cfa1f6f84087e8cb51e122d0be8e846c3463eeb64a7327b6.
Test SHA256: 9425bf74850a39263d14e889360f294add1180d04a42d9ca8e86bebf66e3781f.
Unchanged idb-repository.js SHA256: 2198dd0066d3ef742788f38a56871a0ed4ffe0d7a13c2b7be1ad1d6ed25db37a.
Patch SHA256: 7e4950ab6456f6a8a0c8c4e5011006e563187345dda5b30640fe767eb6806684.

The first local commit attempt failed before commit creation because the sparse object database lacked the existing root .gitignore blob e43b0f988953ae3a84b00331d0ccf5f7d51cb3cf. After the coordinator supplied the exact missing Git objects and verified the original tree, one authorized retry produced the commit above. No source or test edits occurred between verification and commit. Worktree is clean.

## Preserved limits and remaining work

The independent seven-file WIP c9fcc034 was neither picked nor run. Its four failures remain failures, including the observed final-fence 3454 refs / 2099146 bytes / approximately 237 ms. This candidate proves elimination of the specific repeated reads, not that the original automatic round trip now passes or what its final work totals will be.

No Full, exhausted cloud diagnostic, 100k seed, 129-group recovery, native/browser, real account/data, credential, paid model, installation or deployment action was run. Native linked qualification, Source/Working/Human future-view equivalence, full-table/search round-trip equivalence and the genuine Working capability disposal-on-Human-rejection control remain independent work.
