# Original existing Context human Item witness

## First prerequisite: explicit empty-plan assertion

Base: `daba319c3f4026d8bb3bec26bbc6818e28a8bd43`. This receipt does not independently certify that base's human source candidate.

`assertMaintenanceExistingContextEmptyPlan(store, planHandle)` synchronously uses the original private WeakMap plan owner. It requires the same Store and current database lifetime, original lineage readiness, and both original `items` and `scope` empty. Failure is `STALE_BASE`. It does not refresh metadata, read material, mint processing permission or authorize a Context mutation. The source integration must separately retain exact original resolver acceptance of `existingContextItems: []`, ADD-only handling and the original final freshness/Context-owner checks.

Focused actual synthetic run: `node --test extension/tests/ai-cost-03-existing-context-empty-plan.test.mjs`, 6/6 passed, zero failures/skips; log `/tmp/paia-human-empty-plan.log`. Cases cover synchronous no-read behavior, forged/wrong-Store/released/closed-database handles and a genuine original-maintain nonempty Item negative. `git diff --check` passed.

Human-derived existing Item qualification and its source integration are still pending. No Full/PG/native/live/provider/paid/remote action was run or claimed.
