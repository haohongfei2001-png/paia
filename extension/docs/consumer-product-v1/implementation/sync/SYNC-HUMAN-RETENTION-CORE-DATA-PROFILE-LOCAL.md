# Human retention original Core data-method profile — local component

## Scope and prior failure

Base `64365f21a35560f99adc21dce16441df59a597c5`; implementation commit `4466ebb037324bb188b28ad49d2a58fe1abccc7a`, tree `0f35759e2321c547df5fa2e4a2085da250ac2955`. The code has one production owner change: `core/browser-native-sync/core.js`.

Design `work/RETENTION_CORE_DATA_METHOD_PROFILE_DESIGN_20261009.md`, SHA-256 `6bf6ee2a9c93f8b03aca0f3b8cda26479e7fdd1aeb6a181ba7e79ab6283a06a8`, received Root and independent design approval before implementation. Independent design review SHA-256 `74b71a05e9aa8efe390a60eeedfbfa583d8737e7210d3361f71b5290ee7091a5`.

Prior real-native failure remains in `work/RETENTION_CORE_METHOD_SUPPRESSION_BEFORE_20261009`: script `f9a194c5b2b79f1ae5be0e181cddcc87f43a507ce7db92dba21d1a3d40d424f8`, log `1664151e46a03051174177cc8878b752d6126216796b9041cd974b72cbba6187`, JSON `4a78962dc707eb8159a99b28fac02adda631bd74ee7d3ea4af968d7e41138f71`. At the prior frozen source, paired public Core get/put replacements staged 28 writes and falsely returned retained-conflict while all four required receipts were absent. That failed observation is not relabeled a pass.

## Change

A module-private profile captures original Core get/put descriptors, Core prototype and its parent synchronously after the class declaration. Its fixed private guard checks exact direct prototype/parent, rejects own get/put properties and compares both original descriptors including function identity and flags. It does not invoke getters or enumerate arbitrary keys.

Only existing active-retention boundaries invoke it: `current()`, the fixed validation-phase assertion used by Plan, and `applyInTransaction` when a retention proof exists. Ordinary Core methods, finalizers and cleanup do not invoke the guard. No new export, callback, public profile, second map, reader or schema was added. Original Core get/put bodies and bind hook remain unchanged. Existing apply hook remains available; only its already active guarded branch adds this check.

Plan and Repository files remain byte-identical to the base:

- Plan SHA-256 `e610f0ddc8a79205643665282e0052dbe5310716ee7bf3dd0c5b86a0cb765e9b`.
- Repository SHA-256 `eec1aa35e435a799b1ead08d0c01faab55cd7ed7c3faa12727cabdd87cfca698`.
- Both original native fixtures remain `178acc01ccf8ef2c4cf86a9e1a2692859a3b83419dddaafedfd07d52de32fa42` and `801c2ac3efdb7deee7c8da55605d281a3efc2efb6f0fa518ceed99c0062f6224`, preserving their 27 cases and native fault hooks.

The existing owner-phase and fourth dispatch VM fixtures load exact original get/put declarations and the exact post-class profile/guard block. All previous assertion-bearing lines remain unchanged. These are honest isolated predicate/cleanup fixtures, not native proof.

## Local verification

The new `retention-core-data-profile-contract.test.mjs` checks untouched profile, reversible restoration, own callable/value/accessor changes, prototype function/accessor changes, exact descriptor flags and prototype/parent replacement. Getter calls stay zero. Each irreversible configurable-false mutation uses a disposable VM; no imported production prototype is frozen. An actual imported Core / nonnative Repository test verifies ordinary get/put wrappers still read/write outside retention.

Official Node `v22.23.3`, eight complete files, one invocation:

```
tests/native-sync/retention-core-data-profile-contract.test.mjs
tests/native-sync/retention-owner-phase-contract.test.mjs
tests/native-sync/retention-dispatch-contract.test.mjs
tests/retention-data-method-provenance.test.mjs
tests/human-retention-nonnative-refusal.test.mjs
tests/browser-native-sync-core.test.mjs
tests/browser-native-sync-human-library-group.test.mjs
tests/browser-native-sync-human-library-journal.test.mjs
```

Result **72/72 PASS**, zero failure/skipped/cancelled/todo, 2472.042708 ms. Log `/tmp/retention-core-profile-node22.log`, SHA-256 `d796c860e2eeffbf53f9b1ea1adf07489110b8f6db6cf036cf988820a26667ee`. The exact four code/test files were then committed unchanged as `4466ebb0`.

Two preliminary runs are retained and not added to that count: adapted existing VM files 7/7 PASS (`/tmp/retention-core-profile-vm-initial.log`, SHA-256 `5caad4ba1bfcb7f7a384243bde0ef09bfea83aff2f06af15b5a0764602a8d64b`) and new contract 4/4 PASS (`/tmp/retention-core-profile-new-contract.log`, SHA-256 `3fbf4e810f10d7d12d7d1bbc85f8c146845e1e9558230fdd4b4d3bc4eb7ccf3c`).

One standard build: 436 files, 13886 package checks over 412 runtime resources, product guard PASS, unchanged version `0.42.0`, reused false. Log `/tmp/retention-core-profile-build.log`, SHA-256 `da70334e70095e5b343b3440ac6f10672b57a9837a83fe6083c4a18dcd4ef08a`.

Actual source and generated-release Core/Plan cyclic ESM imports passed, with no public export/class property for the private guard. Log `/tmp/retention-core-profile-import.log`, SHA-256 `d71dea9de49e465cc2500f5fc23eed40393a0cd481fd7ef1bab041750b1f41ad`.

Preservation check `/tmp/retention-core-profile-byte-check.json`, SHA-256 `77909dd86b2d80f5afaa2e287720e5f1fae811589944a052573ceae3befe595b`, records exact unchanged Plan, Repository, native fixtures, original get/put/bind declarations and all prior VM assertion-bearing lines.

## Status and limits

Code and local checks complete; independent code review pending. **No new browser run, Full CI, merge or installed delivery.** The profile is an active-boundary refusal for immediate/persistent get/put replacement. It does not certify transient replacements between checks, other mutable Core methods/fields, native request/result provenance, complete persisted-effect/readback, closing-phase semantics, or pre-native-clone allocation bounds. Those requirements remain open. Existing native fault, bind/apply and finalizer scenarios still require appropriate current-runtime native verification before broader acceptance.

## Subsequent review and selected source/release native verification

This section supersedes only the preceding pending-code-review / no-new-browser status. All stated broader boundaries remain open.

Independent CODE/EVIDENCE review of frozen `91dbaa6452bf3aff76a54cc1a23aa3ee31aaf038` / tree `e16d8c2e364a7274f9ef0a69099c6274ea79aa07`: **APPROVE** within this two-method active guard. Report `/tmp/RETENTION_CORE_DATA_PROFILE_CODE_REVIEW_20261009.md`, SHA-256 `77d35cdf75f47fff1415e2ebf639467631cdaf483a59e49fddb499f16c61c0d5`. The independent reviewer repeated all eight whole Node22 files: **72/72 PASS**, zero failure/skipped/cancelled/todo, 2425.550042 ms; log `/tmp/retention-core-profile-independent-node22.log`, SHA-256 `3d3586be758f2efb2e0c801a55fa254c3c2a9b56b8422836953d2eae662c42b6`.

After code and script approval, Root ran the exact prepared `work/retention-core-profile-native-after-20261009.mjs` (SHA-256 `ceb465d703ec1a05a5013b5bc9d4058ed3d83ba23c2838a6dcf7744c7396b769`) on that frozen head/tree. Both actual source and the already-built, byte-checked release passed **7 selected cases / 156 browser assertions each** in Chrome `154.0.8037.99`: 14 case observations and 312 assertions across the two variants. The existing release was not rebuilt by this probe.

| Selected unchanged original case, or appended exact counterexample | Source | Release |
| --- | --- | --- |
| retention 0: normal complete retention and write-free exact duplicate | 27 assertions PASS | 27 assertions PASS |
| retention 3: native revision / receipt / frontier fault injection, rollback and retry | 31 assertions PASS | 31 assertions PASS |
| retention 4: postcommit late-control unknown outcome and duplicate reconciliation | 15 assertions PASS | 15 assertions PASS |
| retention 12: active origin / materialization / member / capability guards | 55 assertions PASS | 55 assertions PASS |
| owner 7: original backup finalization failure | 9 assertions PASS | 9 assertions PASS |
| owner 10: public wrapper cannot mask original finalizer failure | 11 assertions PASS | 11 assertions PASS |
| appended owner 14: exact immutable f9 Core get/put counter body | 8 assertions PASS | 8 assertions PASS |

The counter's original false-success assertion was preserved. Separate after-result assertions additionally confirmed `BNS_HUMAN_RETENTION_REQUIRED`, no returned success state, zero intercepted/staged Core puts, and four of four incoming receipts absent. Its `nativeScopes` field is vacuous when no put is intercepted and is not used as positive native-scope evidence.

Each variant verified exact before/after source identity, **187 runtime hashes / 23 proof hashes / 6 generated fixture hashes**, actual copied runtime and supplemented generated bytes. The cross-variant source/runtime/proof comparison passed; only the exact independently derived standard release-worker diagnostic removal was excluded from cross-variant generated equality. Both complete opened/final network ledgers recorded **0 network attempts and 0 HTTP requests**. Cleanup completed successfully.

Immutable successful artifacts: `work/RETENTION_CORE_PROFILE_NATIVE_AFTER_20261009`. Log `/tmp/retention-core-profile-native-after-91dbaa.log`, SHA-256 `b1feca96c58531dc0d99ed7e4d291a9650f30e2cd75488da4a594f94038d6515`; JSON `/tmp/retention-core-profile-native-after-91dbaa.json`, SHA-256 `993045167de8e03e0eca94d8b9784fe93214bd60b41f97b71872b5d79ee8df24`.

This is **selected 7-case source plus 7-case release validation**, not a rerun of all 27 originals or the complete native family. Independent audit of the resulting native artifacts is pending at this documentation update. No Full CI, merge, installed version or complete positive-effect / closing / native pre-clone resource guarantee is claimed. The original f9 false-success failure remains preserved separately.
