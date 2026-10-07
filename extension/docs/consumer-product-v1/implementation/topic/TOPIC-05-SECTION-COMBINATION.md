# TOPIC-05.4 / Settings recovered combination

Candidate only; no installed release or whole-stage completion.

Root candidate 6d55837 and Settings recovery b6b5dc06 were merged as afde7c6.
The coordinator retained the current Root/Context routing tests where the older
Settings branch carried equivalent historical routes. Section recovery6299dcea
was applied as6a7e623: shared worker local request classification preserves both
Settings commands and both Section read commands; the Section renderer retains
current navigation-intent fences. No overlapping patch was blindly overlaid.

Independent reviews found no confirmed blocking merge defect. The exact combined
candidate passed294 owning tests plus74 security/Topic/Context regressions, zero
skip/cancel. Root source/release2/2 and the complete Data file1/1 passed; Data's
single top-level case contains its source restore and release checks.

The original Root native command first failed both variants because it looked
for the earlier temporary anchor that the new reader intentionally replaces.
Commitddf0aea changes only this test to require one actual durable Section node,
its exact ID/title/Topic route and active heading. Back/new-tab/reload assertions
remain. The successful run used6a7e623 plus test blob
2102461f582609c55b0bd8293f9d1ec68f6c713f, committed unchanged asddf0aea.
Earlier failures remain recorded and are not counted as passes.

Still pending: complete long-document Section native scenarios, the fixed-version
headed Settings matrix in hosted virtual display, Prompt native drag completion,
current version reconciliation and applicable full storage/restore certification.
IAH implementation is excluded. No cloud, paid model or deployment is authorized
or certified by this combination.


## Subsequent bounded evidence, 2026-10-08

The pending list above records the earlier checkpoint. Commit cd25208 now adds
complete Section native source/release coverage (4/4, no skips/cancellations):
165 domain-created Entries, named/default/empty Sections, long body expansion,
IME draft protection, 120-entry window eviction and identity restoration, and
actual purge with a held stale response. It exposed and fixed a normal
compositionend pin that was never released; 114 affected owner tests pass.
Prior failed fixture and negative regression runs are retained. Thousands-scale
browser performance and exact character-offset restoration remain unverified.

Prompt source and release each passed all20 cases on the unchanged test/runtime
candidate subsequently committed as72e1098 and included here as3d485f1.
The fixture uses real keyboard movement to establish a safe starting position;
all original pointer delta, boundary, persisted geometry and draft assertions
remain. The earlier drag-setup failure remains negative evidence, not a product
fix claim. These component results are not exact-head combined certification.

The reviewed routing change5ce9e08 admits the complete new Section file to the
current browser corpus:76 files, still7 jobs and the original budgets. Independent
comparison found all300 prior mappings at4/5/6/7 unchanged and each current file
covered exactly once. All14 routing guards pass.

The coherent candidate uses version0.20.0, following the pending Root0.19.0 batch.
Remote main remains99bb95ed114c166347520b58e3216d0e63519379 at preparation.
Root must integrate first; version and current main must be reconciled again
before this batch integrates. Hosted fixed-Chrome Settings matrices and full
combined certification are still pending. No runtime here is claimed merged,
installed, visually accepted by the owner, cloud-connected or publicly released.
