# ANS-08 original editor completion boundary

This test-only successor is based on main `734517759d3becf4b3d3ac33a182ad3e92708487` (0.55.2). It changes no product runtime, version, permissions, model configuration or timeout.

## Actual failure retained

Main Full run `39220176472`, Browser3 job `117953416568`, failed the original ANS-08 exact persisted pre-edit Undo assertion. The other nine browser shards and the non-browser gates succeeded. The PR304 result and paired panel measurements remain separate evidence.

The original job log has SHA256 `de6c51829bf2eb65c743e5accc6b99f301ab29621c747aec6184d61373820faa`. Artifact `12171289291` has SHA256 `4fef7012eb681d26bea38cd3dd83db5565040af5050ddcb07f27e1b060f2242c`. It contains no ANS-08 failure trace, because the original file wrote evidence only after successful Undo/Redo. The original native test has SHA256 `f41ec89ee432834b966f1a4b7c68052b2f97bdd3b79696700b40b86220872ec2` / Git blob `2018ed9a5c70bba82ae7431f9ac5daff9e0c7f6b`.

## Deterministic original-owner evidence

The new controls use the original LibraryEntryEditor, PlainTextSurface composition events, OrganizerStore, actual Input-bound Entry, a separate human-authored IME Entry, original edit and history transactions, and actual persisted revision rows. The recovery transport is a synthetic held boundary, not a claim about real Chrome IndexedDB timing.

1. A composition-end change clears the editor's failed latch. If a flush captures the old dirty body and waits for recovery protection while the fixture clears its injected failure and appends RECOVER, the original owner legitimately persists two revisions: original to DIRTY, then DIRTY to RECOVER. The last saved revision's Undo restores DIRTY. Applying the original fixture's unconditional original-body expectation to this controlled interleaving fails. This proves a reachable fixture precondition gap, not the unique cause of the historical CI run.
2. Keeping the injected failure active until the new composition-triggered flush has actually failed preserves the original persisted body. The subsequent successful recovery produces one target revision; original Undo and Redo restore the exact original and final bodies.
3. A successful EDIT RPC is earlier than recovery-draft clearing and savedEdit publication. Holding the original clear request leaves the editor saving after the durable edit ACK. Completion of the original flush Promise establishes the saved-history boundary.
4. The native observer preserves the original receiver, arguments, exact returned Promise and full prototype descriptor. It observes success and rejection without driving flush, changing the journal, replaying a call or hiding rejection counts. Source and Input rows remain unchanged in the controls.

## Native correction

The fixture keeps its failure injection until a strictly newer failed batch, the original failed-status text and Retry surface, and zero outstanding original flush Promises are all observed. It then checks the target is still the original persisted body before enabling recovery. The existing retry.completed, bounded successful batches and zero transport-pending conditions remain, with original-owner completion added before Undo.

The original 180-second file deadline, 20-second exact Undo/Redo checks, Input binding, dirty/IME/selection preservation, batch limits, Source immutability, reverse-edit setting and zero external/provider assertions remain. Failure evidence now retains bounded operation/revision metadata and a target-body digest. It does not export personal text.

## Qualification

Local deterministic controls and syntax checks are limited mechanism evidence. The changed-head original browser file and complete required Full gates must pass before this successor can be treated as resolving the main gate. The historical failure is retained; no blind retry or threshold relaxation establishes a pass.

An initial local export added one trailing newline (SHA256 `532b3819…`); that export is retained separately. The baseline identity and final diff use the exact 14,122-byte Git blob above. This bookkeeping correction does not change the executed owner controls.
