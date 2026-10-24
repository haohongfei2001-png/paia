# Manual Prompt and surface source settlement

Base: `1632908ab836738ea8c1f57308ae7c2610f670ef` (tree `cdff94551b3cb8fab7bcdcd68dd40a06d781308a`).

## Original owners

`PromptReuseCommands` and `PromptSurfaceCommands` now issue separate, private-brand, frozen source-task receipts using the existing Assist/Next quartet: `holdForApplicationSelection`, `applicationSelectionHeld`, `fenceApplicationSelection` and `releaseApplicationSelection`. Both bind their constructor's actual service/store/repository/database/database ID/API; the surface also binds its original command, storage and Archive-arrival owners. Later-attached Next/Assist links and the optional existing Prompt journal are bound during acquisition and must be reconciled by the fixed worker coordinator, not supplied by a caller.

Manual command dispatch and direct insertion retain all accepted tasks independently of public attempt bookkeeping. The original physical insertion promise remains tracked beyond the unchanged 2,000 ms UI race. An early verified non-replayed ACK starts the existing generation-fenced reuse publication exactly once; the original preferences and optional Sync journal promise, then its notification, remain owned until settlement. A UI timeout or ambiguous transport result leaves constant-space sticky `OUTCOME_UNKNOWN`. A late success/failure/rejection never rewrites the UI tombstone, creates a new reuse write, triggers replay or restores readiness. A publication whose outcome cannot be established also refuses source proof.

The actual surface RPC, geometry queue/write, history candidate, target-validation and notification promises are tracked. Queued pre-hold work and old target continuations cannot restart after the bounded 30,000 ms acquisition expires. Original accepted writes are still drained. Existing authentic Close, Assist Cancel and Dismiss remain restrictive: exact caller/nonce/document validation precedes invalidation; forged restrictive requests cannot invalidate genuine source or Assist receipts. Ordinary intake remains blocked while held.

## Bounded evidence

Node `v24.19.0`, nine explicitly selected files, **233 passed / 0 failed / 0 skipped**, 3,389.274426 ms. The new owning file contributes 100 cases. Evidence uses synthetic state and fake IndexedDB with production owners; existing focused files include actual content/Settings VM controls. This is not native-browser or live-site evidence.

Command from repository root:

```sh
node --test \
  extension/tests/prompt-manual-source-quiescence.test.mjs \
  extension/tests/cpv1-09-prompt-security.test.mjs \
  extension/tests/cpv1-09-prompt-surface.test.mjs \
  extension/tests/settings-prompt-position-reset.test.mjs \
  extension/tests/manual-prompt-conflict-surface.test.mjs \
  extension/tests/manual-prompt-current-shape.test.mjs \
  extension/tests/nib-approved-activation-key.test.mjs \
  extension/tests/prompt-surface-cancel-close.test.mjs \
  extension/tests/prompt-next-source-quiescence.test.mjs
```

Retained focused log SHA-256: `a39e61b058d683b10151adc362154043c5b4b6d9f60548e727868d0a15baeb42`. Syntax checks and `git diff --check` passed. Intermediate fixture-only failures (missing typed ref and teardown after deliberate repository replacement) were repaired without relaxing production guards or assertions; the final command above passed.

## Integration and limits

These two receipts must be consumed by the actual fixed worker coordinator together with the other original source owners in the same milestone. Neither receipt is a worker/global activation permit, host freeze ACK, cold insertion journal, configured Maintenance settlement, or a new permission. Unknown cold host/insertion and configured Maintenance outcomes remain refusal; selector activation stays closed. This slice does not modify Prompt service, worker/coordinator, manifest, version, permissions, provider configuration, content adapter, drafts or Send behavior. Root owns the coherent integration and version identity.

No browser/native run, Full/C-phase acceptance, 129/100k matrix, paid call, account creation, install, deployment or GitHub write was performed for this slice.
