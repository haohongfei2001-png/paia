# Private checkpoint manifest storage v2 — 2026-10-23

Runtime base: `872e23b00e141f9f2d0a192d763ae91e9ba3e171`. Prior accounting evidence: `d3c9f347` (same isolated worktree). This candidate changes only the private durable checkpoint representation and its original consumers. It is not a new restore engine or a budget grant.

## Change and invariant

New checkpoint state rows use version 2 and canonical padded base64 for the existing encoded manifest bytes. Legacy version 1 numeric arrays remain readable and are never automatically migrated. The stable state key remains `canonical-generation:checkpoint:state:v1`; the row version selects only representation. A resumed legacy row retains its version through authentication, validation, owner application and publication. After publication, the existing copy retirement accepts either version and preserves its exact digest/fences, canonical/protocol data and audit controls. Its initial state check now also uses the original ref shape assertion and the same private representation validator; this is shape/length validation, not a second content authentication or restore path.

The private decoder rejects unknown versions, wrong type/length, invalid alphabet/padding and nonzero unused padding bits. Original ref validation, encoded length, digest, gzip/decoded length and decoded manifest equality still execute through the original `readObject`. There is no alternate protocol representation, new persistent content truth, cache, or final-row omission. The decoder returns an owned `Uint8Array`; a legacy sparse array is rejected explicitly. No ordinary writer, per-transaction or task limit, metering call, ticket rule or rollback path changes.

No suitable existing byte codec was present in this checkpoint path. The private helper uses browser/Node standard btoa/atob and fixed 4,096-byte encode chunks; it is not exported as a protocol codec. Its limit remains the original SEGMENT_PROFILE encoded byte limit. Actual stored strings are charged by the original physical meter; this report does not equate that meter to IndexedDB disk bytes or total VM heap allocations.

## Correctness checks

All local Node v22.23.3, macOS arm64, no browser/build/cloud execution:

- `owning-first.tap`: 78/78, exit 0, no failures/cancellations/skips/todos. Complete new codec and cold compatibility files, complete original checkpoint-stage file, complete ordinary and phased copy-retirement files. Includes canonical roundtrips at 1 MiB, noncanonical encodings, unknown versions, malformed v1, v1/v2 real DB close/reopen after one of two original owners, exact original continuation/publication/retirement and active edit, and raw durable drift negatives.
- **Execution correction (discovered during native registration preparation):** `phased-selected.tap` actually contains the complete 40-case phased-stage invocation, exit 0. The intended negative name pattern `^(?!.*(?:129 source-free|65-group)).*$` did NOT exclude 65/129: Node v22.23.3 recursively accepts a matching parent name. Both expressly forbidden large cases were inadvertently executed. Their `ok` status asserts expected budget refusal; neither completed recovery. The 129 case reached 36 owners then BNS_GROUP_RESOURCE_LIMIT; the 65 case reached final publication and refused with BNS_GROUP_RESOURCE_LIMIT. The previous report falsely said these were not run. Original TAP/args are retained unchanged, the error was disclosed to root immediately, and there has been no rerun. See EXECUTION-CORRECTION.md.
- Subsequently expanded the existing gzip-manifest case into v1/v2 compatibility, then `gzip-compat-added.tap`: 2/2 targeted, exit 0. These are separate invocations, not one combined result.
- Following review, added retirement ref/representation shape checks and four raw metadata negatives (unknown version, malformed base64, length, ref digest mismatch). `retirement-final.tap`: 38/38, exit 0, complete ordinary retirement, phased retirement, and new cold compatibility files. The two cold positives include both storage formats. No known test failure was hidden or retried.

Legacy fixtures are explicitly constructed as the preexisting v1 durable bytes before original authentication, then consumed by actual stage/owner/publication/retirement. They are synthetic compatibility fixtures, not imported customer state. Native browser qualification belongs to the root integration milestone.

## Fixed 1/2/3 comparison

`fixed-comparison.mjs` freezes only synthetic clock/UUID/secret values and constructs a fresh source and target for each format. Every same-count pair asserts the exact original manifest hash matches. v1 is explicitly prepared before original phased authentication; v2 is the new begin output. No runtime metering instrumentation or idb source edit is involved. The original full final seal executes for each small sample. Preparation/setup is outside the measured phases, and no wall-clock/performance claim is made.

| Groups | State row original meter B v1 → v2 | Encoded field B v1 → v2 | Authentication cumulative charge v1 → v2 | Validation charge v1 → v2 |
|---|---|---|---|---|
| 1 | 9,124 → 5,143 | 6,591 → 2,610 | 110,233 → 86,347 | 113,683 → 89,797 |
| 2 | 9,131 → 5,150 | 6,595 → 2,614 | 155,610 → 131,724 | 149,875 → 125,989 |
| 3 | 9,128 → 5,150 | 6,592 → 2,614 | 200,914 → 177,046 | 185,979 → 162,111 |

The actual one-page auth+validation ledger reduction is 47,772 / 47,772 / 47,736 B. Original owner charges are identical between formats: 1-group owner 141,628 B; 2-group owners 142,196+127,872 B; 3-group owners 142,795+127,914+127,897 B. Final preparation still reserves 2,097,152 B, and final seal settles that full reservation with ledger delta 0. Therefore these observations do not measure a smaller final reservation or solve the principal repeated owner costs.

State representation savings are real in the existing read/write/materialization meter, not reclassified or omitted work. This bounded improvement does NOT prove 65/129 completion, final 129 transaction fit, Linux capacity or native speed. Prior failures and the unresolved task/final limits remain. No budget increase, pruning of final canonical/protocol rows or new qualification was performed. The accidental prohibited 65/129 execution is disclosed above; it is not a new authorization or a successful large qualification.

## Pending decisions

The previous BUDGET-PROPOSAL.md remains an explicitly unapproved option based on small-case extrapolation, not a grant. This private representation change does not make those proposed numbers proven. Root should integrate/review the candidate and conduct the planned native milestone without treating old large failures as resolved.
