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
