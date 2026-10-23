# Original repository complete reads under private work limits

Local implementation only. The real original positive primary/indexed complete-read tests failed **0/2** before this change because the private work guard rejected an omitted query limit. Existing owners intentionally request complete sets; silently truncating them would change data semantics.

For `all()` with an omitted limit **only when the original private transaction work envelope is registered**, the original repository now uses a cursor and charges each physical row before retaining it. The full original result is returned or the entire transaction is aborted. It never materializes an unlimited getAll result first. Original private 4096 references / 2 MiB / 30 seconds limits, sticky refusal, method/scope identity and final-read fence rules remain. Explicit oversized query limits remain rejected. No-budget queries retain their existing behavior.

The nine new cases cover complete primary/indexed150-row ranges, empty sets, reference/byte/repeated-read limits with public metrics resets, caught refusal with whole-database rollback, explicit oversized query refusal and legacy behavior. Combined with the whole final-fence and grouped-paging files, see owning.tap for exact counts and durations. Node22.23.3, synthetic fake IndexedDB; native verification is a separate milestone. No browser/cloud/seed/build was run for this primitive.

This removes an API incompatibility; it does not prove a larger corpus fits the same budget or that full Sync/large canonical recovery is complete.
