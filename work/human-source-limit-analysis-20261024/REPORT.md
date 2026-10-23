# Cold linked Human lifecycle pagination correction — 2026-10-24

Parent: 3ab92f5f5d89c1a4df671bcc7665e9c505192f3e. Only `human-library-plan.js` lifecycleReadSet and its original owning test file are changed. Context agent explicitly reserved this one function for this line; Context private scope/compiler changes remain separate.

## Observed cause

The earlier final 86/87 aggregate and independent base 00e91c4c reproduction retain their failures. A single small original `linked removal and explicit restore` case with temporary body-free diagnostics at repository work refusal captured **472 references / 4096**, **128593 physical work bytes / 2097152**, and **11.228625 ms / 30000**. Its refusal stack enters `finiteWorkQuery` from lifecycleReadSet's `rangePage(...,129)`. The established transaction reader refuses page requests over 100 before reading: this is an invalid page size, not measured exhaustion, child-process waiting, or a need for new budget.

`diagnostic.log` retains the failing run (0/1, 315.359916 ms). `idb-diagnostic.patch` records the temporary logging line. The repository source was restored byte-for-byte immediately after this diagnostic and is absent from the commit diff; no diagnostic output or new public observer remains in runtime.

## Minimal correction and constraints

Read the same `thoughtSuppressions.byEntry` equality index using the original `indexPrimaryPage`, at most 64 rows per request. Continue by primary key because every row for this Entry has the same secondary key; an ordinary secondary-key continuation could skip all remaining rows. Keep the original total limit of 128. Count the same equality index after collecting the pages and reject any mismatch. Other Entries are not included. Existing reference, byte, time and final transaction guards still account for every request and result.

No limit increases, skipped assertions, Source evidence shortcuts or changed lifecycle mutations are introduced. The original transactional owner still restores the collected suppression records and rechecks the exact prepared read set. The unrelated 20-Topic 184-operation ancestry closure remains blocked by the unchanged ancestor128 guard. The 65/128/129 records below are small synthetic suppression rows for one Entry, not 129-group restore or a new scale attempt.

## Validation

Node22.23.3 absolute executable from the existing official isolated runtime; local macOS arm64, fake IndexedDB. One final invocation of two complete owning files:

```
node --test extension/tests/human-source-entry-plan.test.mjs extension/tests/human-source-placement.test.mjs
```

`owning-after.log`: **21/21**, exit0, 3064.561208 ms, no failures/cancellations/skips/todo. The original cold-B removal and restore test is unchanged and now passes through cold C.

Three added controls use the real owner and original same-key index:

- 65 owned records span pages; exact IDs and unique count prove no missing or repeated page boundary. A changed record on the final page after preparation causes BNS_HUMAN_CHANGED inside the original bounded transaction, and every table stays unchanged.
- Exactly128 owned records: exact collected ID set and unique count; the original restore owner runs inside the original repository work envelope and restores all128. A different Entry's extra record remains byte-identical.
- 129 owned records: the original BNS_HUMAN_HISTORY_LIMIT rejects preparation, with every table unchanged.

No native browser, build, cloud CI, network, real data/account, model or large restoration was executed. This closes the specific previously observed page-size failure, not all mixed Context combination or product acceptance. Earlier evidence is not rewritten as passing.
