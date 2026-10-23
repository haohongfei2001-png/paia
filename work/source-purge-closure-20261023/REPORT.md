# Original Source purge closure compiler

Parent b76bf781e6fd0a0103190440c378509c4f7dc63c. Branch codex/source-purge-closure-20261023.

This closes a concrete shared compiler prerequisite for BNS-03/04 and SYNC-01 §3.2 negative-intent inheritance; it is **not** the complete mixed checkpoint restore outcome. The original negative-only Source checkpoint publisher/restorer now actually calls this compiler, retaining its existing single-negative 25-item profile. No generic/grouped restore guard is relaxed.

`source-purge-closure.js` reconstructs each complete body-free negative group exclusively through the original SourcePurgeIntent validator and SourcePurgeRemote owner: seven redacted original envelopes, seven purge operations, one original descriptor. The remaining positive independent initial Source groups use the original group compiler and Source plan. Shared identity, duplicate operation/revision/sequence, missing lineage, retained deleted body, malformed redaction, extra/missing head or frontier all reject. Heads/frontiers/coverage and negative order are deterministic; no row merge winner is inferred from arrival time. Private result identity binds repository/dataset/device/prefix/namespace; cloned results have no original compiler identity. No compiler result itself has a read, mutation, export or publication grant.

Physical preflight rejects accessors without invoking them and meters complete input before canonical encoding/cloning; the fixed 128-revision/384-item, 2 MiB and 30-second limits are retained. Conservative aggregate counts detached input, output and bookkeeping. This is finite logical work accounting, not a measured browser heap theorem.

## Actual checks

Node 22.23.3 at `/Users/hhf/.codex/worktrees/organize-handoff-validation/paia/work/node22-official-20261023/node-v22.23.3-darwin-arm64/bin/node`; macOS arm64, fake IndexedDB.

Whole files:

```
node --test extension/tests/browser-native-sync-source-purge-closure.test.mjs extension/tests/browser-native-sync-source-purge.test.mjs
```

- first.log: 46/46, exit0, 3759.902583ms, before explicit Core-device race/deterministic-negative refinements.
- final.log: 47/47, exit0, 4558.932875ms, before pre-encoding physical preflight negatives.
- **preflight-final.log: 49/49, exit0, 4784.257666ms; no fail/cancel/skip/todo.** New 21 and existing negative-only owner/checkpoint 28.

These are separate runs of successively changed candidates, not 142 distinct tests. Existing negative-only tests include real immutable publish, cold restore, re-export and stale grouped-checkpoint refusal. New mixed closure inputs originate from actual Source capture/purge/cleanup owners, including two original deletions plus one live Source. New tests retain every real repository unchanged during compilation and reject mixed publication through the old negative-only consumer. No native/browser/build/CI/Full/large-seed execution occurred.

## Phase 2 ownership and atomic connection

Shared coordinator files `group-checkpoint.js` and `group-checkpoint-plan.js` were not edited in this prerequisite. Parent has released those files after the Saved-work coherent changes; next branch should incorporate cbbb8a3b and original journal dependency before touching them.

The next implementation must add an explicit complete positive/negative owner-scope representation, validate all immutable items and local negative authority before activation, and derive the exact canonical/protocol before/after cut prior to the original write transaction. `SourcePurgeReceiver.receive()` and `SourceBootstrapReceiver.receive()` must not simply be run as two transactions and called atomic recovery. The existing cold-negative owner currently insists on an entirely empty protocol/canonical target; the coordinator needs a private original-owner prepared application seam and final whole-table closure for the unified transaction. Existing already-negative or nonempty targets require an actual reconciliation proof, retaining original outbox/negative metadata. This is remaining local implementation work, not an external authorization block or full-family completion.
