# AI-COST-03: bounded human Context text correction

Local implementation based on `eeae4bebaac359eb154d0c7a9d86f4cfb78e108f`. This is scoped original-owner engineering, not full-plan completion, browser/native acceptance, live-provider qualification, deployment or installation.

## Existing contract and finite scope

- `AI_USAGE_ARCHITECTURE.md` §§3–5 requires necessary Context corrections, body-free current deltas, exact per-facet acknowledgement and preservation of manual/human-edited Items.
- `AI_USAGE_PLAN.md` §5 requires a bounded authorized multi-facet payload and original-domain operation validation; `AI_CONTEXT_CARDS_V2_PLAN.md` CTX4-05 retains genuine maintenance, human protection and transactional exact ACK.
- This slice handles one genuine body/section edit of an existing active automatic Item per opportunity, using its original successful human put receipt and a full current semantic witness. Both body and section are independently selected for processing. Its complete original plain body-only Input lineage remains required and independently granted. Pasted/replaced Item text never becomes source-free human evidence.
- The selected operation is existing ContextMaintenanceService `maintain` for the exact protected Item, revision, card, associations and original evidence. Only the original `protected` result settles Context coverage with NO_CHANGE and zero effective result. It does not mutate the Item or acknowledge its Topic facet.
- The protection-only zero-provider path and existing human Topic reconciliation remain unchanged. No new original Context command/evidence/receipt schema, UI, provider, credential, permission, store or service is added. Body-free local witness and constructor-only payload/grant mapping are extended.

## Safety and currentness

The original human owner mints the witness only after observing the exact preimage and successful put receipt in its own transaction. The witness binds full semantic state and actual Item update time. Current receipt, Item body/section/order/provenance/protection, complete original Input/Source lineage, original processing authority and original Context eligibility are checked before dispatch and again after asynchronous hashing. Final dispatch joins the original Input material transaction.

The original Context write and exact ACK share one transaction. Its final fence follows receipt, ACK, usage, job and NO_CHANGE-counter staging, and the final asynchronous authority read. It rechecks the full captured Item/receipt, Input projections, retained Source records/indices, Topic/membership metadata and original legacy restrictions. No asynchronous authority callback follows this final snapshot fence. Expiry, revocation and disposal clear retained ephemeral material. Source purge still refuses protected human work at the existing B-02 owner gate.

## Explicitly pending

Manual creation; unchanged/cosmetic put; restoration without a current text-edit witness; stale or missing receipt; stale/removed/excluded/purged lineage; authored/bound/structural or note-bearing lineage; temporal maintenance metadata; more than 16 complete original Inputs or more than 16 current Topic placements; new automatic derivatives from edited Context; explicit original NO_CHANGE/REMOVE_CANDIDATE operations for a protected Item; Topic interpretation of changed Context. These receive no manufactured ACK. A changed admitted route may requalify only the exact old Context-mapping DEFER; its old job/attempt history remains unchanged.

## Local evidence

The initial real-owner test failed RED because both correction facets remained DEFERRED. The implementation then passed the real LocalMaintenanceSession path and original protected Context transaction. Focused tests cover independent Context/Input denial, replaced text, repeat edits, full stale-currentness controls, held hash/provider, actual Input edit/exclusion and Source trash, original purge gate, last Input-material fence, last joint settlement, final asynchronous authority mutation, mixed-page boundaries, old DEFER reconsideration and duplicate/restart behavior.

Logs are local executor evidence under `/tmp/context-edit-*.log`; they are not shipped runtime dependencies. Exact final commit/tree, focused counts and independent review are reported in the integration handoff. Broad/native/browser/provider acceptance is deliberately deferred and not claimed by these synthetic direct-function tests.

## Independent receipt qualification repair — 2026-10-18

Independent review of frozen `a7524165d1acbe67a96970614fb741145a422990` reproduced three malformed original human receipts (missing/invalid `createdAt`, unknown field) each reaching one synthetic provider call and one Context ACK. The successor uses the existing `ContextCardsService.recoveryCommitted` convention: exact eight-field receipt, matching original receipt id, string timestamp of at most 64 characters with finite `Date.parse`, and exact five-field original put result. The existing `lineageExact` helper rejects unknown fields even when their value is `undefined`; the receipt and result schemas themselves are unchanged. The protection-only path is unchanged.

The original independent RED remains `/tmp/independent-context-edit-receipt-schema.log`. Corrected owning negative/boundary tests on the original frozen production bytes produced 9 failures / 4 passes (`/tmp/context-edit-receipt-repair-red.log`). They include stable mismatched receipt id, parseable 65-character timestamp, unknown/undefined fields, and receipt drift after the final ACK was staged. The first repair run passed 91/92: its padded ISO-string positive fixture was not parseable; the boundary fixture was corrected to an explicitly parseable UTC string without relaxing production validation (`/tmp/context-edit-receipt-repair-green-attempt1.log`). Final direct owning 89 tests plus the unchanged independent three-test reproducer passed 92/92 (`/tmp/context-edit-receipt-repair-green.log`). The same 11 affected owner/session/payload regression files passed 678/678, with no failures, cancellations or skips (`/tmp/context-edit-receipt-repair-regression.log`). Production/test syntax and whitespace checks passed. These are scoped synthetic direct-function tests; independent successor review and broad acceptance remain separate.

This receipt was moved to the canonical `docs/consumer-product-v1/implementation/ai-usage/` directory with all preceding text preserved. Product scope remains independently authorized edited Context fields alongside current original Input evidence, followed only by the original protected-Item transaction's NO_CHANGE settlement. AI cannot rewrite the protected Item; new derived results and Topic semantics remain pending.

## Final independent review and integration

Successor `5c2bc5414f655291bc0dadea18a9610a2319efcd` received independent CLEAN review: the unchanged three malformed-receipt counterexamples now make zero provider calls and zero ACKs, and the 10 additional final-authority/currentness controls plus 13 new owning receipt cases pass. The reviewed seven file blobs were verified unchanged at integration `78d6b47b0b517eadf1aac9ecbb19a2eac5222d5a` before this receipt carry. This closes the bounded source review; actual native/provider and broad acceptance remain deferred or unqualified, and the explicitly pending mappings above remain pending.
