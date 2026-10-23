# Same-Topic compound authored Context correction — 2026-10-23

Parent `861ba8dd017539221128cc1a5197b4f1f982dbed`; finite CTX4-05 continuation under the user's full current-plan takeover. Authority: `AI_CONTEXT_CARDS_V2_PLAN.md` (retained blob `99e41ca113603956c4e61e9e461d9c801a15e485`) and existing Context/field authorization contracts. This is local implementation, not whole-plan or native qualification.

## Actual gap and behavior

The original ContextMaintenance owner already accepts bounded composite humanEntry evidence. A genuine automatic Context Item made from two independent human-authored Entries, followed by a genuine ContextCards edit or remove→restore, was nevertheless left DEFERRED by the correction mapper's single-Entry condition. The original owner fixture produces that failure without writing fabricated provenance or a human receipt.

The mapper now accepts 1–16 unique source-free original humanEntry witnesses in one Topic with one exact current Topic binding. Every witness must separately match unchanged `readAuthoredEntryContext` and its complete selected fields. Metadata-only reference selection precedes independent local field/history qualification; payload processing and original Context processing remain separate. Current body/title/note selection, birth and human field receipts, membership, source-free proof, scope revocation and current/recovery fences remain unchanged.

The DTO carries exactly the selected author ID set, no Input, bound Entry or structural material, and exactly one Context coverage unit. It is not a generic mixed-evidence route, does not write Topic or membership, and does not use a Context grant as Topic authority. Existing array-based session material collection, qualification and final snapshot/fence already handle all selected original owners and are reused unchanged. No durable schema, Sync format, native launcher, workflow or runtime default changes.

The human Context stays byte-for-byte protected. The existing source-owned response adapter and Context owner record protected `NO_CHANGE` with the exact child receipt and ACK. ACK failure rolls back; replay consumes one retained response without a second provider call.

## Verification and retained failures

All evidence is in `work/context-multi-authored-correction-20261023/`.

- `baseline.tap`: old implementation, real original compound owner edit and restore, **0/2**, each correctly observed DEFERRED instead of expected COMMITTED.
- `after.tap`: runtime completed both paths, **0/2** only because the new assertion expected unsorted field names; original owner emits canonical `body,note,title`. Assertion corrected without runtime changes.
- `focused.tap`: **29/30**; original owner refused 17 witnesses before a Context Item could be created. The new test had incorrectly expected that invalid precondition to succeed. Failure retained; corrected test now verifies the unchanged original owner's refusal and unchanged data.
- `boundary.tap`: corrected 17-witness rejection, exact DTO defects and invalidated-lineage refusal, **3/3**.
- Final complete 14-file owning batch: **970/970**, 72813.225375 ms, exit 0, zero failures/cancellations/skips/todos. See `owning.tap`, `exit.json` and exact `command.json`; before/after source vectors match. This count belongs to that listed batch, not a rerun of the prior structural package’s different 13-file selection.

Positive cases include edit/restore, two independently selected field sets and the 16-witness boundary. Negative cases omit the second author or history/selected field at separate qualification and payload boundaries; alter the second author's body/note/history/membership at provider time or after the backup finalizer; replace a membership at unchanged count; change the human receipt or revoke scope. Exact DTO tests reject missing/duplicate/foreign IDs, extra author material, cross-Topic material, mixed bound/field selection and Topic coverage. Genuine cross-Topic original provenance remains pending. The existing invalidation marker still refuses qualification and dispatch, without old-text reads.

No browser/native/build/cloud/paid model/deployment execution occurred in this package. The separate original authored/bound native result does not certify this compound family.

## Remaining finite work

Multiple bound Input/Entry pairs and same-Topic mixtures with plain Input evidence remain separate finite engineering gaps under the corresponding independent grants. Multiple structural proofs require complete original memberships and correct shared-field deduplication. Cross-Topic combinations cannot acquire implicit authority from this route. Invalidated or source-deleted historical lineage remains refused; prior generation text is not promoted into new source-free human evidence. Runtime activation, real services, cloud capacity and final integrated acceptance remain on the root queue.
