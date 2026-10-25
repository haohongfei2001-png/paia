# Source general continuation: next local implementation scope

Read-only audit, 2026-10-25. Root checkout observed at `a3359fdac044cef32b24e0eb40519ec8d993c44f` (includes retained Working continuation from b25daa6). No runtime/test edits or executions, network, native or renewed budgets in this audit.

## Decision

**Proceed with one complete bounded Source + Working continuation package on the existing, authenticated two-sibling Source union.** The implementation gap is a missing unified chronological physical proof, not a missing product permission or an inherently external dependency. Support the existing three group types in arbitrary admitted local descriptor order, subject to the original complete graph and cumulative budgets. Do not introduce another fixed group-count/Input-count whitelist. A safe small mixed positive is sufficient to begin this local algorithm work; absence of a full-scale performance result is not a reason to stop it.

This package does not implement Human/Context mixed authority, new incomparable-head selection, a provider permission, or production global activation. Its ordinary limits remain 4096 references / 2 MiB / 30 seconds. The algorithm is proposed here, not tested or certified.

## Existing implementation that must remain

`BROWSER_NATIVE_SYNC_PLAN.md` places complete canonical Source/Working recovery and continued edits in the effective plan. Its older slice-status examples must be reconciled with current source. Source bootstrap/append owners, original Source union restore and publication, per-Input Working history reconstruction, third Working publication/cold recovery, multi-retained-Input continuous Working, exact compact publication objects and original failed evidence already exist.

Current continuation has no remaining count-only restriction on a pure Working tail. A→B→A coalesced/allocated and A→B→C have actual local synthetic publication and fresh/cold restoration evidence; their reported invocations remain 4/6 then 2/2. Do not rerun those to establish this new package. Source-only bootstrap/append continuation already reconstructs exact documents, Source rows, immutable provenance and allocation rows. The original two-head union has complete original typed operations and canonical authority; none of this should be replaced by a new generic merge protocol.

## Exact current gaps

1. `source-union-publication-continuation.js:44–47` explicitly rejects any added tail containing both Working and Source groups. Removing only that check is unsafe.
2. `requireSourceUnionPublicationPhysical` at lines 50–94 uses Source-only step/index arithmetic for history and delta. Working also consumes delta, sometimes consumes a history sequence, and emits an epoch/invalidation. Interleaving must use the real shared chronology rather than Source-only indices.
3. `requireWorkingPhysical` at lines 108 onward seeds an Input exclusively from `groups.previous`, iterates only Working groups, then validates Source physical rows with an empty added tail against originalCut. It cannot prove a Source append/new conversation between edits or an edit of the newly captured Input.
4. `group-checkpoint.js:254–260,752` supplies a filter baseline only from originalCut. A new Source Input has no row there. The baseline for a subsequent edit must be reconstructed from its authenticated Source group and the original `planInitialFilter`, never borrowed from the final edited row.

The actual writers already supply the needed facts: `SourceBootstrapJournal.capture` and `captureSourceAppend` bind genuine original Source identity, original document/anchor proof, baseline history and physical delta/history values. `planInputRevision` supplies the real coalescing/allocation rule. The original group planner supplies typed causal dependencies; no new body-reader or cross-source permission is needed to verify these already admitted local facts.

## One unified proof algorithm

Keep original receipt/cut/graph authentication in `group-checkpoint.js` unchanged. Build a detached, budget-charged expected state from the original authenticated Source cut, and process the **single existing added descriptor sequence** in order. Do not partition/reorder by family or Input.

- Seed retained Source groups exactly as today, proving original baseline allocations, source identities, index rows and initial filters against originalCut. Retained physical allocation is original recovery allocation, not a portable source counter reused without normalization.
- Maintain shared counters for record/block/document allocation, revision sequence, input delta sequence and thought epoch. Keep per-Input original Source identity, fixed original Input fields, current Working value/state and complete history; keep per-document original Source anchor/allocation and exact Source count/display inputs. Maintain one global prior-operation map for typed Working entity parent edges.
- For each new SourceBootstrap: require original planner-verified bootstrap shape; allocate exactly one record, block, document, baseline history and delta using the current shared counters. Prove the group's physical baseline/history/inputState values equal those allocations. Seed the new Input's fixed original body, history, state and initial filter. It becomes available to later Working only after this event.
- For each SourceAppend: require the original bootstrap/document anchor dependency from the original planner, allocate record/block/history/delta but no new document. Preserve the original document allocation; derive its canonical final display from all genuine Source records. Seed the appended Input exactly as above. No assumption that all appended Inputs belong to a previously edited or original document.
- For each Working: require an already-seeded Input; preserve original fixed fields, SourceRefs/Keep and exact original typed parents. Run `planInputRevision` against this Input's previous history but the **shared current revision counter**, retaining coalescing versus fresh allocation. Advance global delta and epoch once, append the original invalidation/receipt expectation, and update only this Input's state/history/filter expectation. A→Source→A may coalesce history while its global delta moves past Source; do not equate per-Input history sequence with global chronology.
- At the end compare every expected physical cut row, allocation/filter/metadata row, index/source-count/document row, original protocol rows and independently compiled canonical scope. Unedited Inputs and unrelated complete-table rows remain protected. Validate invalidation/receipt rows from the actual Working descriptors only; Source capture itself does not fabricate Working events.

For filters, pass a fixed original-owner-derived map of initial filter expectations (retained cut or reconstructed Source group baseline) into the existing private `sourceUnionPhysicalCut` call. An internal helper may return this map from authenticated group inputs; it must not become caller-supplied proof/authority, accept current-row baselines, or bypass its final exact comparison. Preserve `requireSourceUnionWorkingFilter` and its exact edited-chain checks. Reuse the same expectation generation inside the final physical verifier, or bind its result to the same original inputs, rather than having two inconsistent allocation algorithms.

## File ownership and implementation boundaries

- Main owner: `extension/core/browser-native-sync/source-union-publication-continuation.js`.
- One necessary narrow caller: `extension/core/browser-native-sync/group-checkpoint.js`, only preparation/passing of authentic new-Input filter baselines around `sourceUnionPhysicalCut` and its publication call. No restore state-machine, receipt schema, permission or global-gate changes.
- New focused owning test file using existing real Source/Working owners and actual synthetic publication/fresh/cold restore. Any old `working-after-append` unsupported expectation that becomes obsolete must have its original source/evidence preserved and its coverage moved to a real positive, not deleted silently. Do not modify unrelated harnesses.
- No changes to encoder, group planner, provider, Source bootstrap/append writer, budget API or shared IDB are currently necessary. If implementation reveals such a dependency, report its concrete contract before widening this package.

## A complete semantic test package, not a sequence of shape gates

Use a compact original two-head fixture with short distinct texts. Cover these ordering/dependency classes together in one design and one implementation:

1. Retained Input Working → append to its original conversation → Working of the newly appended Input.
2. New conversation bootstrap → Working of that Input → append to that new conversation → Working of the new appended Input.
3. Retained A Working → Source event → retained A Working, once within the original history window and once allocating a new history row. Assert shared delta/revision/epoch progression explicitly.

Each positive must prove original publish, exact complete Source/time/provenance/history/Working cut restoration in a fresh synthetic receiver, and cold reopen. Actual old sibling ancestry remains unchanged. The goal is general chronological proof, not permanent admission limited to these example lengths.

Negative coverage should mutate genuinely required facts: new Input edit before its Source dependency, wrong original document/bootstrap anchor, wrong cross-Input SourceRefs or Keep, invalid typed parent, source/global revision/delta mismatch, unchanged retained Input tamper, extra/missing invalidation or receipt, and final filter borrowed from a mismatched source baseline. Assert exact domain failures where the original path determines them; RESOURCE_LIMIT or setup failure cannot count as successful causal rejection. Keep full no-POST/no-durable-success and unchanged-snapshot assertions for prepublication failures.

Start with the new original-code mixed positive rejection as the baseline proof and a minimal coherent algorithm. Do not rerun prior LIMIT positives. The new bounded tests are ordinary local correctness work, not native/full acceptance. If a new positive reaches the original resource ceiling, retain the actual phase/outcome, stop repeating it, and analyze the measured cost separately rather than weakening checks or labeling a refusal as support.

## Budget facts and separate genuine cost work

Existing three-appends-to-new-`local_0` and Source-only interleaved capture tests reach qualification and preparation, then fail with `BNS_CHECKPOINT_PUBLICATION_LIMIT` during publication. They are **not** evidence that mixed Source/Working causal proof works, and their interleaving is Source-only. The actual `working-after-append` path fails the structural mixed-family gate earlier.

The proposed reducer uses already bounded admitted group inventory and one chronological walk, with one final full physical proof. It can avoid the current Working branch's recursive second Source physical pass without omitting any expected rows. Retain charges for all actual reads and expected/comparison operands; no hidden fresh ticket or per-family limit. Small existing Source and Working positives demonstrate these owners run under ordinary limits individually, but this audit does not assert a measured combined byte margin or a universal chain-length guarantee.

There is also a concrete separate repeated local read in `checkpoint-publication.js:112–114`: `#causal` enumerates the same immutable prepared local checkpoint for each parent, while lines 128 and 135 invoke it once per parent. A future exact per-invocation reuse of that immutable local next-vector could be independently designed while retaining each parent's full history proof and actual comparison accounting. It is not necessary to first solve this optimization to start mixed proof work, and no claim is made that it alone resolves the old LIMIT outcomes. Reusing `#same` across remote awaits is not justified; those repeated full-cut checks protect publication freshness.

## More incomparable heads: separate real protocol work

`source-bootstrap-union.js:35–42` authenticates an exact two-head selection; `finish` at lines 65–95 destructures ancestor/left/right and exact three cuts, requires both heads to directly share one parent, checks nonempty disjoint complete Source bootstrap deltas and all collisions. `group-checkpoint.js` requires the exact three authenticated receipt cuts. Thus N-head or arbitrary ancestry is not a missing loop-bound change. It needs a complete normalized original head inventory, ancestor/closure proof, deterministic selection identity and compatible durable receipt/recovery contract. Current code provides neither a general DAG/LCA resolver nor conflict authority for overlapping Working/Human/Context operations.

This does not block the selected mixed continuation package. Keep existing two-sibling selection identity fixed while completing all admitted Source/Working local tail orders. Then separately design multi-head causal closure against actual provider discovery and original receipt evidence, without declaring it solved by count relaxation or mocks.

## Acceptance status

Next package is locally implementable within existing authorization. No new user decision is required merely to implement the chronological proof. Broader scale capacity, N-head ancestry, Human/Context mixed authority and real-browser/provider/global activation remain separate unfinished requirements. This audit made no test or performance claim.
