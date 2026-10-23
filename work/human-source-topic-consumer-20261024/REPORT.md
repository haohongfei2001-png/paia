# Source-linked Human compound owner candidate — 2026-10-24

Base: `00e91c4ce6dc346ccf073e3437b7a0b81ca62b6c`. This is a local synthetic candidate, not whole-product completion or native acceptance. Root owns integration. Existing predecessor edits were retained and completed; no other worktree or branch was overwritten.

## Implemented behavior

The original Input `addToTopics` route now reserves and publishes creation/deduplication, all selected placements, original exact-excerpt evidence and one original operation receipt in one Human commit. Whole Input selections retain the Input binding; partial selections retain their exact grapheme-bounded span and thought binding. No intermediate receipt or compensating transaction is introduced. The final original transaction rechecks the complete reserved inventory, live Input projection and original Source evidence before writing. A failed outbox write rolls back body, membership, provenance, receipt and outbox together.

Source-derived and original Input Entries can use the original placement owner and recover through typed checkpoints. SourceLink v1 remains derived evidence; strictly shaped v2 carries the original exact-excerpt span. Placement histories retain real Source IDs, and complete provenance/dependency comparison reconstructs that exact span. Request property order, including span keys, preserves the original owner's JSON receipt digest across wire canonicalization. Two-Topic requests, exact repeat, a new deduplicated operation, removal/re-add and cold checkpoint destination mutations are covered.

Eight existing runtime files and one owning test are changed. No generic reducer/callback is introduced into wire data. Context private capture/measurement regions, group-checkpoint planner, shared harness, runtime budgets, workflows and source data are unchanged. The original `requireHumanAncestry` is byte-for-byte equal to the base.

## Final validation

Absolute executable: `/Users/hhf/.codex/worktrees/organize-handoff-validation/paia/work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node` (Node 22.23.3, macOS arm64). Final command is `node --test` followed by these eight complete files, without name filtering:

- extension/tests/human-source-placement.test.mjs
- extension/tests/human-source-entry-plan.test.mjs
- extension/tests/ux-r3-topic-actions.test.mjs
- extension/tests/browser-native-sync-human-library-journal.test.mjs
- extension/tests/browser-native-sync-human-library-group.test.mjs
- extension/tests/browser-native-sync-group-checkpoint-restore.test.mjs
- extension/tests/browser-native-sync-group-checkpoint-plan.test.mjs
- extension/tests/browser-native-sync-human-library-derived-refusal.test.mjs

`owning-final.log`: **86/87**, exit 1, 6171.406542 ms, 0 cancelled/skipped/todo. All seven new Source/Input controls passed. The sole failure is the existing `linked removal and explicit restore preserve portable negative intent and protected history across cold B`, `BNS_GROUP_RESOURCE_LIMIT`. `linked-lifecycle-baseline-result.log` reproduces that same failure on an isolated archive of the unchanged base 00e91c4c; this is a real remaining limitation, not a passing aggregate. Earlier baseline archive attempts lacked background modules and are preserved separately. No native browser, large-scale run, build, network, CI, real account or model call occurred.

The seven new controls cover Source-derived placement/cold recovery; full Input and partial exact-excerpt two-Topic recovery; changed Source recheck; changed provenance recheck; complete rollback under synthetic outbox failure; invalid span, duplicate/21/missing Topic refusal, request collision and reversed span-key order. Existing tests retain their assertions.

## Retained failures and unadopted experiment

All local logs remain, including intermediate planner/codec/provenance/request-order failures. `owning-first.log` was an earlier seven-file 74/74 run, not final identity. `owning-second.log` was 85/87: the same pre-existing budget failure plus a new synthetic injection using an ordinary Error that correctly mapped to STORAGE_FAILED. The final injection uses the original ArchiveError type and checks complete rollback; production error mapping was not changed.

`safety-first.log` and `limit-trace.log` preserve the real 20-Topic `BNS_HUMAN_GRAPH_LIMIT` failure. `safety-second.log` (6/6) used a temporary proposed ancestry budget change which was **rejected and reverted**, and must not certify the final code. The abandoned function is preserved in `ancestry-proposal-not-applied.txt`. The original 20-Topic control is preserved in `twenty-topic-control-preserved.txt` and excluded from the current test to obey root's explicit instruction not to repeat this scale attempt. No existing test was removed. Intermediate test/planner snapshots are evidence, not current source.

## Known limits / integration queue

The request grammar still allows 1–20 distinct Topics, but the 20-Topic scenario is **blocked**, not complete. Its exact closure is 184 Human operations: 20 original Topic commands each contribute Topic + default Section + two identity histories + descriptor = 100 ancestors; the new compound contributes 83 members (Entry 1 + SourceLink 1 + Topics 20 + Placements 20 + new histories 21 + existing Topic identity histories 20) + descriptor 1 = 84. The unchanged single-command ancestor cap 128 rejects at 129. Source bootstrap is separately bound and is not counted in that Human closure. No unrelated Topics were included. A different normal-write reference limit does not authorize enlarging this narrower guard; root will coordinate any explicit proposal.

The original cold-B linked lifecycle BNS_GROUP_RESOURCE_LIMIT remains separate from this 20-Topic guard. Automatic Source → Working → Human → Context currentMixed replay is also still a separate composition task: linked checkpoint admission currently does not close that mixed causal profile. The Context agent owns that integration; merely adding allowed kinds would not prove its causality or budgets. Source-linked explicit restoreRevisionId and move-owner broadening are not claimed by this finite placement/add-to-topics package.

No native performance, cloud capacity, whole-program acceptance, remote integration or installed release is claimed. Preserve the Context candidate core.js first-line lazy-owner import during integration; this package changes only the later Human validator portion of that file.
