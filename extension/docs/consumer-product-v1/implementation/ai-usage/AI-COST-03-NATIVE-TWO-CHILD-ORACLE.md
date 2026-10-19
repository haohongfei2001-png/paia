# AI-COST-03 — native mixed Placement two-child oracle correction

Scoped test-only successor, 2026-10-18. The original mixed Topic/Placement contract completes the eligible Placement Context facet within the original two-child opportunity. Its unsupported Placement Topic facet remains deferred. This change reconciles two outdated native test branches with that implemented contract and measured native results; it does not alter runtime behavior, authority, budgets, case counts or timeouts.

## Preserved native failures and diagnostic evidence

- P0 native CI `39158831672` on its original frozen P0 identity failed: 148 tests, 142 PASS / 6 FAIL, zero skipped. Four failing leaves were mixed Placement and mixed-race in each Source/release variant; the other two failures were their parent suites. Original log `paia-p0-native-ci-39158831672.log`, SHA-256 `99a568e4df42a94e436b91f155702d3bb771b22a40c2b70f38c800f3cc1e3942`, remains a failure.
- Diagnostic head `d214bc1ed7bbd90cdd40cd7cf4251c531e2585df` retained every original oracle and added only body-free state/count/phase assertion context. Its native test SHA-256 was `e11e3d49147c7262dd4ffebd51fc4939416bef35067be6f4026d3915a8e4ecc8`. Native CI `39159820150` again failed 142/148 with the same four leaves and two parents. Log `paia-p1-native-diagnostic-39159820150.log`, SHA-256 `0d551762dc32560bf6a451469dd505b5e571f408c41b5af49c1c060853d4b1a0`, is not relabeled a pass.
- Source and release both observed mixed result PARTIAL, processedState COMMITTED, zero pending Placement Context units, complete true and a two-child original handle. The physical count was three including the warm initial call; Placement payload counts were exactly `[0,0,1]`.
- Source and release both observed mixed-race passive handle and result NO_DELTA, no processedState property, zero pending Placement Context units, complete true and the same three physical calls. The former PARTIAL/pending-one/withhold-until-new-opportunity assertions did not match these measured original two-child semantics.

The diagnostic emitted only enum states, booleans and numeric counts; it contained no payload body, Item identity, provenance or credentials.

## Corrected assertions

`extension/tests/cpv1-ctx4-05-maintenance-chrome-e2e.test.mjs` now requires the exact measured branch dispositions. Both branches prove two different child IDs in the same logical job, the warm-plus-two total of three physical requests, and Placement material only in the second admitted child. The requested Entry, Topic and Placement identities remain exact.

The exact Placement Context unit must have one ACK and no fake DEFER. The unsupported Placement Topic unit must have one DEFER and no ACK. The entire human Placement row and complete Source/Working rows stay unchanged. Reusing the original handle and creating a new opportunity must each preserve the full durable snapshot, including all provenance and ACK rows, and cannot make a fourth physical call. The passive race retains its complete no-write snapshot comparison. Body-free actual diagnostics remain for future failures. No leaf was removed, skipped or given a longer timeout.

Frozen corrected test SHA-256: `4baa0e6eefe5031e01c142196af9d71e0b73002a33f458a1a773cab7f42837b7`. The minimal successor diff is `/tmp/paia-native-two-child-oracle.diff`, SHA-256 `fd0087fde100c3019d112be3bb061d2fd37cd9e3b3ba001afa3be88afceef314`.

## Scoped validation and native outcome

Syntax check passes. The two corresponding original Node whole-session positive tests pass 2/2 in 1394.221031 ms, log `/tmp/paia-native-oracle-unit-controls.tap`, SHA-256 `ef9b61c526045316359b83baac59d858a52e1f8824e333f4ea9094139bee1c17`. A temporary copy of the same actual-owner mixed test, adding the exact new-opportunity full-snapshot assertion, passes 1/1 in 957.306837 ms; `/tmp/paia-native-new-opportunity-oracle-probe.tap`, SHA-256 `bbb3cbe619fefc918a175c05ce7d1a2b603430de2f9622fc5978920b2c257da5`. These are synthetic fake-IndexedDB controls, not native evidence.

The complete native Source/release file passed **148/148**, zero failed, cancelled or skipped, in 117975.710413 ms on remote CI `39160602435`, exact head `22acbe9c142a7bb1fdffc3866e1f817abdd5d4ef`. The parent independently read the full log `paia-native-oracle-ci-39160602435.log`, SHA-256 `fbdc0b28bc57fe0fbeef21b2de2a865c26838e750a9061f0cd76bd1b79dc01e2`; Node22.23.3 and Chrome155.0.8059.39 ran the original fixture-mapper path. This qualifies that complete native fixture set on that head; it is not a live-provider, new authenticated source-mapper, successor Filter or whole-product qualification. Both historical failures above retain their original identities.

Local Chromium launch was not retried after the previously reported environment denial. No runtime, workflow, installation, provider activation or external account change was made by this test correction.
