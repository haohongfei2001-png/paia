# Original Source purge with surviving portable owners

Base: 7ac78c15. Local Node 22.23.3, small synthetic data only. No browser, build, native, cloud or real account.

The actual configured worker's explicit FILTER_MODE off creates an original consumerPreference intent. SourcePurgeJournal had incorrectly treated every positive operation as part of a seven-operation Source bootstrap. This successor admits only consumerPreference, promptPreferences and promptBinding alongside initial Source groups, authenticates their current original owner/proof/physical value and exact complete heads, and preserves them through the original deletion transaction and all-table final fence. Source indexes and negative allocation counts count only original Source groups. Deleted Source Working remains unsupported. No new publication or restore capability is claimed by this change.

The new original proof comparison requires each final portable head and exact materializedOwner record. Prompt companion must match its exact Prompt revision and physical original envelope. All unrelated protocol rows remain rejected. The existing all-table portfolio planner preserves portable owner history and settings during deletion; there is no metadata prefix exemption.

## Evidence

- worker-before.log: actual configured=purge 0/1, STORAGE_FAILED.
- worker-purge-first.log: original configured=purge 1/1 after runtime fix.
- portable-first.log: 5/5, Google/OneDrive configured worker retain all seven intents and subsequent Prompt edit; three poisoned proof types refuse deletion with all tables/control unchanged.
- purge-owning-final.log: 104/104, new five cases plus original Source purge/multi/closure suites. This ran before the subsequent test-only cold unknown case; runtime bytes unchanged thereafter.
- worker-purge-final.log: 1/2; old unknown test expected deletion refusal. The original 50cb producer supports exact unknown receipt plus local purge and refuses old-cut retransmission. The earlier worker refusal depended on unsupported smartFilter, not a distinct unknown guard. Root approved correcting this consumer expectation.
- portable-cold-first.log: 5/6; test incorrectly used get(null) on the existing single-key local fixture. Corrected to original exact durable key.
- worker-purge-second.log and unknown-second.log: retained test failures from attempting a disabled Settings action immediately after its prior error; the new post-purge rejection uses the original worker RPC and explicit STATUS refresh before later UI action. No runtime guards changed.
- unknown-third.log: 3/3, original two configured purge cases plus new actual cold worker. The original producer task id/ref/attempting state remain byte-exact; local deletion succeeds, subsequent NOW and cold NOW refuse, and POST/PUT counts never increase.
- portable-final.log: final six new owning cases, no filters.

Existing negative-only / Source+Working checkpoint publication evidence remains at work/purge-checkpoint-publication-20261024/REPORT.md (196/196, not rerun here). Negative + portable checkpoint export/restore remains a separate in-progress successor. Existing configured=purge NOW rejection is retained; this report does not claim that full chain works.
