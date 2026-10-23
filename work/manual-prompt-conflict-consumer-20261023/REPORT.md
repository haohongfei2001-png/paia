# Explicit manual Prompt conflict consumer — local candidate

Implementation: `0ff6f0ff`, parent `a1cd9867`. This package owns only the original Prompt journal/service/commands/private surface/UI and its small tests. It does not modify service-worker, Sync lifecycle, publication/recovery, IDB, source-purge, budgets, routing, workflow or version.

## Implemented behavior

A genuinely admitted `PromptReuseService` with its original explicit `PromptSyncJournal` can expose one human-reviewed independent `manual:<uuid>` body conflict. Exactly two current heads must validate their original operation digests. The original materialized proof must identify one of those heads and exactly match the current portable preferences and local preference revision. Pins, splits, override IDs/order and every non-body preference must agree; only one independent body may differ. A Prompt correction companion, including stray companion head/row/proof, is outside this finite profile. Advanced materialized ancestors and other conflicts remain unsupported; no fabricated aggregate selection appears.

The original private auxiliary Prompt surface shows both literal bodies. Provenance says “version currently retained here” and “other version”: a materialized local version may originally have arrived remotely, so no device attribution is invented. The human can explicitly retain either body, manually reconcile it, keep both as two independent templates, or decide later. Existing reading presentation is reused; no hash UI or raw HTML. Existing 150-grapheme editor rule applies to a new manual edit, while choosing an existing longer body preserves its exact original text. Unchanged textarea CRLF is restored to its exact authored value. Drafts survive failure or invalidation; no automatic resubmit. New independent “both” copy starts unpinned, visible, local reuse count zero; existing IDs, pins, splits, other overrides and local reuse counts are preserved.

Opaque review tokens live only in the service's bounded private map (at most eight), and map to journal-private original snapshots. Command sender and the private iframe's original nonce/document/host/consent checks remain. No bodies are sent to the website host. Query delivery revalidates the offer after both host and display preference awaits. A successful mutation emits the original change notification; a failure emits none.

Prepare uses the original Core exact-parent `resolve` command. The original canonical preference write, Core head/receipt/outbox/device updates and materialized proof commit together. Before commit, exact heads/revisions, preference row, materialized proof, backup generation, active namespace, restore epoch/owner epoch, companion absence and gate are rechecked. Final original repository read fence verifies expected canonical row, exact new head/proof/revision/outbox, both retained revisions, companion absence and original namespace/epoch/gate. The backup generation expectation includes the original repository's own single increment; this is not a new counter or relaxation.

The original 2 MiB / 4096-reference / 30-second write limit is registered. Read snapshots use the existing same-size budget. Exceeding it refuses; this package does not solve arbitrary large aggregate conflicts.

## Consent and final-boundary qualification

Review and review revalidation run in the original Store execution with `observeOriginalPromptControlPublication` before and after metadata work. The exact original control row is retained privately. After asynchronous prepare, a new original run compares its actual observed control row with that review. SDK access finishes before native IDB admission. Commit and final `isCurrent` synchronously require the original live Prompt control execution and exact current control-cache content; the native final read plan pins the original gate. No SDK promise enters the final IDB segment.

Tests separately prove a genuine original `setEnabled(false)` after prepare refuses before the resolution write, a late in-transaction gate change rolls back everything, and a late consent change within the existing control-cache object also rolls back everything. The two latter cases are controlled boundary injections, not claims of a real provider revocation. Same-owner normal control changes queue after its current original run; another original IDB writer cannot interleave inside the native transaction. No guarantee is invented for unsupported external mutation of browser storage outside the original control publication owner.

## Verification and retained failures

All runtime test invocations used the already approved isolated Node `v22.23.3` on macOS arm64; no runtime download/install.

1. First small aggregate: **28/33**, 5 failures, 0 cancelled/skipped/todo; `first.log`, 582.250542 ms. Four positive resolutions failed because the new final fence expected the pre-write backup generation rather than the existing repository increment. The fifth was an invalid synthetic split group ID. No production budget or original assertion was weakened.
2. Those two corrections: **33/33**, `final.log`, with 0 failures/cancelled/skipped/todo. `journal-after-first-fix.js` records that intermediate journal, before additional control-race qualification. It is not presented as the first failed source or the final implementation.
3. Added original control observation, exact gate/control final checks and three race tests; final related aggregate **85/85**, 1216.602708 ms, exit 0, no failures/cancelled/skipped/todo: `owner-final.log`. Files: new manual consumer (23), new view (4), original Prompt security, original private surface, original Cancel/Close, original Prompt service.
4. New private-surface delivery/notification tests **2/2**, separately `surface-final.log`, exit 0. These prove final offer invalidation before body delivery, no host body disclosure, authorized resolution dispatch and success-only notification.
5. Syntax and diff checks passed. A subsequent UI wording-only correction makes the unsupported state refer to unchanged existing records rather than falsely claiming exactly two preserved bodies for every unsupported state. No repeated runtime was needed for this copy correction.

No browser/native execution, build, cloud CI, large seed, 65/129-group run, real account, paid model, deployment or installation occurred.

## Native bridge prepared, not executed

`extension/tests/native-sync/manual-prompt-conflict-fixture.mjs` exports `nativeManualPromptConflictFixture(source, helpers, 'manual-prompt-conflict-matrix')`. It preserves every original owning callback/assertion and substitutes only Node registration/assert import plus the original fake-IDB setup. The helper constructs the original `OrganizerStore` with real native IndexedDB, a fresh uniquely named synthetic DB, original consent/capture/foundation, and closes/deletes only its owned databases. Exact count is 23; no group-scale fixture or retry.

`prepare-native.mjs` registers names without executing callbacks, verifies the owning body occurs byte-for-byte in generated code, and produces `generated.mjs` / `native-preparation.json`. Executed callback count is **0**. The existing native host must serve `generation-purge-assert.mjs` just as it does for the other prepared owner bridges, and serve this generated module with the original import-relative mapping. UI fake-DOM tests are not claimed as real browser layout/IME/visual evidence.

## Genuine owner integration boundary

The existing worker constructs `PromptReuseService` without a Sync journal. This candidate deliberately leaves that unchanged: ordinary local UI gets no new conflict availability or production Sync issuer. The usable consumer is exercised through the real explicit journal/service/commands and fixed private surface, not a standalone helper.

A later coordinated local Sync integration must bind this *same genuine service's* journal to its exact active original repository/Core/namespace and original restore epoch, with `materializePrompt` for admitted remote Prompt preferences. It must qualify bootstrap/materialized proof via the existing original journal. Do not create a second Prompt service or copy preferences into a synthetic owner, silently migrate legacy correction bindings, or attach this journal as a side effect of the source-working-only lifecycle. Journal/core/store replacement invalidates outstanding reviews. The global production worker, three provider adapters, complete multi-entity conflict UX and their native/visual qualification remain separate pending work.
