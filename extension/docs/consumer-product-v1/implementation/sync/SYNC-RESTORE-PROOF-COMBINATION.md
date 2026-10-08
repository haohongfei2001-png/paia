# Local recovery epoch / Prompt ancestor-proof combination

Candidate basef28c3b9f combines the previously reviewed epoch fence and P1 Prompt
materialized-owner proof. This receipt records a necessary interaction repair;
it does not broaden the existing immediate-head qualification contract.

Independent integration review used the actual BackupService to restore identical
Prompt preferences after A/B advanced to C/B. Both direct resolution and resolution
after verified reuse still accepted the old ancestor proof; staged activation had
the same issue. Initial four failing cases are preserved at
`/tmp/sync-restore-proof-before.log`. Ad hoc exact production reproductions remain
`/tmp/sync-combination-review.mjs` and `/tmp/sync-combination-no-reuse.mjs`.

Only three production lines in prompt-journal.js change:
- The newly added ancestor path qualifies the previous/live Core's restore epoch
  inside the current transaction before it can use the persisted proof. Staged
  activation checks the previous live Core, not its new stage namespace.
- Verified reuse can keep its legitimate local counter change when the optional
  journal is CHANGED/UNBOUND after recovery, but cannot renew the obsolete proof.
  Other failures, including malformed epoch or storage read failure, still abort.

The original immediate-head portable equality path is untouched. This is not a
claim that all remote receiving now enforces a new global recovery policy, and
neither scope gains worker/provider activation. No history, publication receipt,
financial record, source text or binding is deleted by this fix.

Eight actual-owner tests cover persisted epoch marker / legacy unbound namespace,
with / without verified reuse, and ordinary receive / staged activation. Each
uses a real same-value backup replacement, checks the exact CHANGED or UNBOUND
code and compares all meta rows after refusal. Reuse separately asserts its local
counter increments without changing the proof. Original60 native Context cases
remain, with these8 added (68 per variant); existing head/tree, production hashes,
source/release equality, two worker restarts and network/lifecycle oracles remain.

Five complete related owner files74/74PASS697.04ms,
`/tmp/sync-restore-proof-related-final.log`. Independent reviewer ran new8/8PASS
303.54ms in `/tmp/sync-restore-proof-independent.log` and approved the exact two
production changes. Package12319 checks/372 runtime resources PASS,
`/tmp/sync-restore-proof-package.log`.

The prior f28 four-file native38/38PASS is retained in
`work/sync-context-combined-native.log`; it predates this repair and is not reused
as repaired-candidate evidence. A copied test import initially appeared inside a
native fixture block; static syntax validation caught it before a browser run,
and only that duplicate import was removed.

Final runtime proof is split into two recorded full-file runs, not a fabricated
single green run. The four-file run `/tmp/sync-restore-proof-native.log` returned
36PASS/2FAIL46734.78ms: storage32, publication2 and retirement2 passed in full;
Context source/release both failed only because the new fixture omitted its
materializePrompt import. The missing fixture import was added without changing
runtime or other owner files. The full Context file then passed2/2,
68 scenarios per variant plus both real restarts,15865.76ms in
`/tmp/sync-restore-proof-context-final.log`,0skip/cancel. All five runtime hashes
and the Context test remained unchanged across both runs; only the Context
fixture import changed. Therefore the three unchanged complete-file successes
are reused accurately and not needlessly repeated.

Seven final hashes were identical before/after the Context rerun. Source/release
production hashes and68 case names also match. Evidence records candidatef28
HEAD/tree plus these dirty bytes, not a claim a later commit was already tested.
CI/version/admission remain coordinated separately; no push or main certification
is implied by this local receipt.

Final candidate hashes:

```
2bad39f83f1fdb24700dbab889da326a17f48007250efc3ab689c67af3f1a17b  core/browser-native-sync/prompt-journal.js
6bbfa65639988e25621b727169431feb385d5632eca46d7f51bc03322159ff1f  core/browser-native-sync/core.js
b8a002683c8a7b117ab3fe4bb8b8851dcec441446a346821566a2ba078fd55cb  core/browser-native-sync/checkpoints.js
541e0fcc3f04c0fdd6ee1352f438734358e9f5e1e2745b4306966aa1d60650ab  core/browser-native-sync/context-journal.js
008c41aba13939c9fdff3535b77fc37f20747f158b7430cc9a52569d34aa713b  core/prompt-reuse-service.js
1d37a560ee90ad50f1ef75123d24f9d759bb0deb47ad49995ec7fb6eba253661  tests/native-sync/context-info-chrome.test.mjs
b7cbf4ccd56c526108ea00451f20037b07d86d002f67e742f96c393ed6dd2148  tests/native-sync/context-info-worker-fixture.mjs
```
