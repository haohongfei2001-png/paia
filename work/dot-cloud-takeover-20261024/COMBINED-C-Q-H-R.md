# Recovery cumulative-work integration

Base GitHub candidate 8e85158245a1b7d7a035654d4ee78879e07c41a1 plus the exact six-file recovery candidate e92901c561d831f54f3612d7ba0f6d5344d26240. No other runtime change is included in this checkpoint.

Root executed the eleven complete files recorded in COMBINED-C-Q-H.md plus four complete files: browser-native-sync-recovery-causal-tail, browser-native-sync-local-recovery, repository-committed-work, canonical-generation-publication (all extension/tests/*.test.mjs). Result: 319/319 PASS, zero fail/cancel/skip/todo, 10695.830442ms, existing cloud Node24.19/Linux. See combined-c-q-h-r.log. This new combined result does not relabel earlier failed candidates.

The original native work accounting path is exercised by fake IndexedDB; it is not an actual browser-native or Node22 qualification. Independent review bound to the six-file freeze found no remaining blocker after cumulative accounting, same-head compatibility, cancellation-after-confirmed-commit and deadline corrections. The original failures and selected-test/full-file distinctions remain in recovery/16-candidate-report.md and its logs.

The window only restricts original work: one explicit ordinary invocation, same 4096 references/2MiB/30s maximum, original physical work/decoded input accounting, failed ticket burned, no qualified exception borrowing. New causal advancement supports only admitted ordinary Source/Working/filterIntent, not arbitrary conflicting heads or new linked/native-family admission. Global selection refusal, all special exhausted allowances, external-account and deployment restrictions remain unchanged.
