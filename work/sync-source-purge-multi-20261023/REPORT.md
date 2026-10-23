# Independent Source portfolio: first selected purge

Base: `0b6d7c74bae37347603ad1d744e7e992c2f7b5e2`.

The original Source purge owner now accepts multiple complete, mutually independent Source bootstrap groups and deletes only the explicitly selected Source. Every group goes through the original group compiler and canonical scope proof. Source, source key, chat, document, Input and baseline identities must be disjoint. Shared conversation append, Working, Topic, Human, other namespaces and resident generation staging remain rejected. The existing single-Source path and cold-empty receiver remain bounded by their original policies.

The protocol proof accounts for all groups, including full head/revision/receipt/sequence/entityRevision/frontier/generation/local-device state. The selected seven bootstrap operations are redacted and the original eight negative-intent operations are applied by the original owner. Other local outbox entries remain exactly unchanged. A write-before snapshot covers the complete canonical tables; the original maintenance writer supplies expected cleanup rows before its own puts. All remaining table rows/counts, unselected annual indexes and physical counters are checked again by the original terminal read fence. Public metric resets cannot bypass the private transaction budget.

## Evidence

- New actual two-Source contract on old implementation: **0/1**, `BNS_SOURCE_PURGE_UNSUPPORTED`, `negative.log`, exit 1.
- Initial new implementation invocation had a test-helper syntax error before any test ran: `first.log`; retained separately.
- First corrected positive: **1/1**, `second.log`, 639.821666 ms.
- Expanded finite set: **18/18**, `expanded.log`, 3241.818083 ms.
- Final single combination: **107/107**, exit 0, no failure/cancellation/skip/todo, **12663.279167 ms**, `combined.log`. It contains the new **25** cases plus original source-purge, source-bootstrap, source-append and dvn-source-purge owning files.

The new cases exercise two Sources locally and three on a receiving device (two remote plus one local), retained local outbox, exact replay, old bootstrap refusal, actual late mutations of unselected canonical/index/history/protocol rows, cryptographically valid cross-group reference reuse, global protocol counter corruption, unsupported mixtures, maintenance-return drift, and 4097 real repository reads with reset public metrics. All failure controls compare full repository snapshots after rejection.

Command used Node 22.23.3 via the existing isolated official absolute runtime, `--test --test-concurrency=1`, with absolute Python 3.12.14. No install, APT, build, browser, cloud, actual account, real user deletion or remote immutable object deletion occurred. These are synthetic fake IndexedDB correctness results, not native/browser or capacity evidence.

## Limits and continuing queue

This commit admits a portfolio containing only pristine independent bootstrap groups before its first purge. The next package will admit a subsequent purge of another remaining Source while preserving and validating earlier body-free deny/redacted groups; this is not yet implemented here. A previous deny still blocks old-cut activation and old bootstrap admission through the existing owners.

Protocol redaction and durable cleanup intent are committed atomically with the original canonical Source deletion. Remaining canonical history is physically removed later by the original resumable purge cleanup owner. Remote immutable copies are not physically erased. Original B-02 human protection remains authoritative. The original write transaction retains 4096 references / 2 MiB / 30 seconds; read preparation is bounded by the finite group/schema/retained-byte checks and final elapsed check and is not claimed to be transport cancellation or a newly private-ledgered read transaction. Maximum bootstrap operation envelope remains 128; this does not promise every such graph fits the transaction budget.

Only source-purge-journal.js and the new owning test are implementation changes. No coordinator/Core/shared writer changes. Root owns integration, independent review and any later native milestone.
