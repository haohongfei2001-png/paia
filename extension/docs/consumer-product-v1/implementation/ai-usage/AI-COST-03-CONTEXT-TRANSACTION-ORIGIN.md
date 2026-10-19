# Original bounded Context transaction identity

## Scope

The original Context scope module now privately records the original Repository scope, store, database and work ledger when it creates its own bounded transaction adapter. `assertContextScopeTransactionOrigin(adapter,repository,workBudget?)` validates only those exact adapters and their original live transaction. It returns `true` or rejects; it exposes no raw transaction, unguarded reader, processing grant or Filter decision.

The original Repository brand remains the first check in the separately owned cold Filter consumer. This narrow fallback is needed because an actual original bounded Context adapter is an intentional wrapper, not the raw branded Repository scope. Every subsequent read still uses the bounded adapter and its original field and budget guards. The producer adds no read, scan, hash, provider call or permission.

The proof checks exact own method descriptors, its exact original prototype and descriptors, store/repository/database identity, same optional ledger, original native AbortSignal and fork-parent facts, each distinct original ledger currentness in the entire adapter and fork-parent chain, then callback-free facts across the whole chain again. An exact nested adapter can retain its privately recorded parent; copies, arbitrary inherited wrappers and prototype guessing cannot acquire this proof. Observed failure permanently retires that adapter proof. A completed transaction, changed method/prototype, substituted database/signal/ledger, exceeded budget or revoked original currentness is rejected. Legacy readers that cannot establish this optional proof retain their original behavior without a new brand.

This successor depends on the separately frozen original-preflight metadata producer. Its body-free hint remains only a preparation input and does not replace post-warm admission, scope or currentness checks. The original preflight may run independently authorized authored/history validators; no all-phase metadata-only claim is made.

## Current successor: independent parent ledgers

The0137 predecessor passed685 controls but its currentness traversal started only at the newest adapter ledger. A valid parent adapter with a separate, non-fork ledger was still accepted after only that parent ledger's currentness callback became false. The exact two-adapter test retained the real `actual true / expected false` RED; this was a producer-origin proof currentness gap, not a new processing grant.

The successor visits each private adapter's original ledger and all fork parents, deduplicates each original callback, and finally checks the full captured chain without callbacks. It never retries issuer callbacks to find a fixed point. Three added controls cover two healthy independent ledgers followed by parent-only denial, a later child callback aborting the earlier parent's original Signal, and a shared fork parent whose callback is invoked once. The focused set is19/19.

The unchanged original command below passed **688/688**, zero failures/cancellations/skips, in38919.768241ms. All3342 actual dependency files stayed byte-identical. The before/after inventory SHA256 is `5ec952f1b68d6e46c2f31d53ad292325b5df834e12665897863ff2ab0ea9584d`; the complete tested tree is `paia-context-scope-origin-chain-isolated-20261019T0143Z/tree`. Its scope runtime SHA256 is `645e0d4845baa7366c052959ecf8fb913dd789646f5626b4c34a36da289b8ad8`. No old oracle, limit, timeout or concurrency option changed.

## Preserved predecessor evidence

Sixteen new original-owner controls pass. The missing-export test retained its real failure before implementation; it is an API mechanism test rather than evidence that the pre-existing owner leaked data. The separately owned consumer had an actual cold-read failure: its original Repository brand rejected the legitimate bounded adapter and left the historical Filter decision visible. Its later 24/24 source/binding result belongs to that consumer's own bytes and receipt.

The complete isolated original qualification/Context group passed **685/685**, zero failures/cancellations/skips, in39656.062452ms. All3342 dependency files are byte-identical before and after the run; the inventory SHA256 is `38dd1aa08013954ba4289d0eefc6c39772088bc59042f8e1116f4fb57dce2e67`. The full tested dependency tree is `paia-context-scope-origin-isolated-20261019T0132Z/tree` in the local workspace. This group is the prior669 controls plus these16, with no changed assertions, limits or timeouts.

Command:

`node --test extension/tests/context-scope-transaction-origin.test.mjs extension/tests/context-processing-metadata.test.mjs extension/tests/cpv1-ctx4-04-read.test.mjs extension/tests/cpv1-ctx4-05-maintenance.test.mjs extension/tests/ai-maintenance-promotion-own-mutation-reader.test.mjs extension/tests/ai-maintenance-topic-summary-qualification.test.mjs extension/tests/ai-maintenance-terminal-facts.test.mjs extension/tests/ai-maintenance-processing-receipt.test.mjs extension/tests/ai-maintenance-qualification-capability.test.mjs extension/tests/ai-maintenance-existing-context.test.mjs extension/tests/ai-maintenance-topic-candidate-{capture,operation}.test.mjs extension/tests/ai-cost-03-{authored-context,bound-entry-fields}.test.mjs extension/tests/context-maintenance-{invalidation,no-change}.test.mjs extension/tests/ai-maintenance-strict-topic-identity.test.mjs`

An earlier invocation accidentally used the prior0110 dependency tree. That run passed669/669 but did not load the new adapter test or runtime; it is preserved as wrong-directory nonqualification evidence, not credited to this successor. Initial and final16-test focused runs also retain distinct identities.

This is local original-owner/synthetic-fixture evidence. The consumer's complete cold-read integration, native/Full and production qualification remain separate. Deep ContextRead Topic-only preflight and all other remaining Maintenance semantic work are not implemented by this slice.
