# 0.42.1 — shared Human qualification resource ownership

This is a compatible reliability batch on accepted main source `62970f0044b11c1f3e5236610d9846a2f0950df3`, tree `61b963eaef1fbfb1798c289dab6b33c956d458e5`. It changes only the pure Graph qualifier's resource ownership, adds its shared numeric budget service and focused tests, and identifies the delivered runtime as0.42.1. It does not add a database consumer or activate recovery.

## Behavior and bounded scope

Graph instances now share one canonical numeric service: at most one active qualification, eight retained leases,4MiB retained and8MiB total reservation. Exact existing parsing limits and allocation formulas are preserved. A Graph instance can evict only its own oldest handles on genuine shared-limit failure; it cannot revoke another instance's or future projection owner's leases. Publication failure clears pending references and releases both retained and work tickets. The128-byte escrow preserves bookkeeping charge if retained ownership ends before active work.

The service exposes four synchronous lease operations, no stored payload, callback, database reader, counter inspection or reset. Graph retains its original three exports, primitive canonical JSON intake and body-free all-head structural summary. Same-realm module reuse and explicit controlled-reference accounting are claimed; physical heap measurement, hostile pre-import platform substitution and garbage-collection timing are not.

All Core, Repository, Journal, Plan, schema, permissions, CI workflows and existing UI are byte-identical to main. NIB v4 remains design-only. Failed retention PR231 and its independently reviewed repairs remain isolated; this batch does not certify positive persisted effects, pre-clone native size bounds, unresolved recovery, real cloud providers or full Sync. Missing approved Context/Settings original references still block their precise visual acceptance only.

## Exact targeted evidence

Integrated runtime/test checkpoint: `5608bbb5a288a04c7a83b6ee7275af92c41d343f`. Subsequent documentation-only commits must preserve these bytes to reuse evidence.

| Evidence | Result | Log SHA256 |
|---|---|---|
| Node22.23.3, complete Graph + shared service + backup current-version files |48/48 PASS,0fail/skip/cancel;2533.914833ms|`ac1ee964285c49185fb309465982a45b768e3d823758d5a5a45ba8a7dd1e76cc`|
| Source package guards |13995 checks /418 runtime resources PASS|`3bb8cdd87bcdede34df596480371de241b3a1abce7a57181a9e8e00b9fd8ad31`|
| Standard release build |438 files;13931 guards /414 runtime resources;0.42.1;PASS|`f3f0631bc04c4839f4790ceddfefbe906905b602a9c0a6d32a3ed6de3016730a`|

The unchanged version validator already admits compatible0.42.1. Original current-version tests actually restore a synthetic historical-encoder stream through the production restore service and keep retired export unavailable. No validator broadening or test rewrite is needed for this patch increment. Manifest numeric version, version-name prefix and package version agree.

The owning [Graph integration receipt](../sync/SYNC-HUMAN-GRAPH-SHARED-BUDGET-INTEGRATION-LOCAL.md) preserves original24 Graph cases,94 original assertions, full3000-padding fixture, the initial failed new slot-isolation case, corrected45-case result, exact source closure and zero-effect import evidence. [Shared-service receipt](../sync/SYNC-HUMAN-SHARED-QUALIFICATION-BUDGET-LOCAL.md) preserves the separately reviewed sixteen complete numerical lifecycle cases and escrow correction. Those are not browser/native or physical-memory results.

Independent finite Graph code/resource review APPROVED the exactd5 source in `work/HUMAN_GRAPH_SHARED_BUDGET_CODE_REVIEW_20261009.md`, SHA256 `a090e05f6200b66daa9d61da4346d635b7761c8214a62c4f479b797389c3cfda`. Its complete45-case run passed, log `2ddc621c6e9543356b33fc38e846dfa0f849fde3756fdb160bc57f70a9438535`; a separate pre/post WeakMap-publication fault test passed1/1 with two subcases, log `6ac22166f70b6ab854c63fb315ff764baafd6bd4a3c26e6230796d1f9b66dfd9`. These are independent observations, not additional distinct whole-case coverage. Root version/scope review APPROVED5608 and its initial document drafts in `/tmp/COORDINATED_0421_VERSION_SCOPE_REVIEW_20261009.md`, SHA256 `e02f69fa5b7c5f91a02ee2702964d6d382f9c1b976550dd4657b2f33bd889f4a`; the final documentation commit still needs exact review. Root separately read the full code diff and confirms the bounded integration. One stable hosted full certification is required at this release-identity boundary under protocol7.2/7.5, followed by guarded merge, one exact-main certification and byte-verified packaging. No current candidate/full-main/installed or user-visible capability acceptance is claimed here. Earlier failures are retained.
