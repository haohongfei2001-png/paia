# Human graph implementation checkpoints

Future 034, design base 033 `37fab2b6`. No enabled provider, worker/UI binding, schema or permission changes. This document records intermediate engineering checkpoints, not completed Sync functionality.

## 1. Shared domain computation extraction

`thought-journal.planJournalRevision`, `thought-store.planHumanTopicCreation`, `planHumanPlacement` and `planHumanEntryCreation` are pure computations consumed immediately by their original domain writers. They do not grant write authority. Default operation/CAS/evidence/memory guards, Topic name registration and derived work remain on the original path. UUID/time/sequence allocation order and real move's two placements within one transaction remain unchanged. No optional journal binding or new wire family exists yet.

Actual original journal baseline passed before extraction: `/tmp/human-graph-journal-before.log`. Reviewer identified important-history qualification missing in the extracted shared rule; `/tmp/human-graph-important-before.log` records actual `true !== false`. The shared rule now explicitly refuses coalescing important data; original outer behavior stays unchanged. Actual journal tests verify stable coalesced ID/sequence/window start at 59.999 seconds, a new history at exactly 60 seconds and ordered clock/UUID allocation. Actual move test verifies stale destination rollback, both placements/negative intent/two histories and original-operation idempotence.

Relevant whole-file regressions: 76/76 at `/tmp/human-graph-plans-regression.log` before final Entry row extraction; final Entry extraction related whole files 29/29 at `/tmp/human-graph-entry-plan-regression.log`. Final dedicated owner file 3/3 at `/tmp/human-graph-plans-owner.log`. Independent root_finish actual final whole file 3/3 PASS121.214ms at `/tmp/human-plans-independent.log`, pure extraction APPROVED. These are layered targeted checks, not a claim that 76 tests ran on the last bytes or that remote receive/restore passed.

Remaining: qualified request-local plan allocation/CAS, complete journal codec/outbox/receiver, portable Topic identity/history mapping, full bound mutation coverage, grouped restore and actual native validation. The existing IAStore pruning time seam requires a narrowly approved additional integration; no code there has been changed by this checkpoint.
