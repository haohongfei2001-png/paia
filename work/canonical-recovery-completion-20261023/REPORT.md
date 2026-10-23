# Explicit canonical recovery completion — 2026-10-23

Implementation `4bc74715` on preserved startup candidate `c9a56e74`, with already-integrated retirement prerequisites `27075f90` and `a9d5505c`. Local copies of these dependencies are `c1a6e7da` and `414225f2`; cherry-pick only the new implementation/evidence onto the integration branch. The latter dependency had a missing predecessor report in this tree, so its complete incoming report was preserved during the modify/delete conflict; runtime dependency bytes were unchanged.

## Result and consumer

A committed canonical publication now has an explicit completion consumer, separate from the old `LocalSyncRecoverySession` and its `StagedSyncRestore` owner. This does not migrate that Settings recovery path or enable cloud/production startup.

- `publication.openRecoveryCompletion(handle, originalStore)` continues a genuine already-published, not-yet-bound original owner. It preserves externally owned store and registry resources.
- `publication.openOriginalRecoveryCompletion(local)` cold opens the existing durable selected identity through the original fixed schema/catalog/receipt checks. It keeps its original LibraryDocumentsStore private and installs no ordinary writer while cleanup is pending.
- `session.status()` reports the committed publication and last observed checkpoint-copy progress. `advance()` invokes exactly one captured original `retireCheckpointCopies` batch, with its existing 32-copy ceiling, transaction budgets and full terminal fences. There is no automatic loop, retry or startup deletion.
- Only a freshly revalidated `retired` result can install the original active-store binding and report `ready`. `readyStore()` refuses before then. The returned object is the original store, not a generic writer.
- Cancellation stops the session, preserves committed publication and any committed retirement progress, and removes only that session's exact private binding. A newer original-owner binding survives. The cold consumer closes only its owned target handle when no newer binding has replaced it; shared registry and caller-owned stores are never closed. Cancellation is checked again after awaited preparation and before binding installation.
- The fixed application Organizer opener now requires the exact original retirement qualification before binding. An otherwise valid unretired generation rejects with `GENERATION_RECOVERY_COMPLETION_REQUIRED`; malformed progress/control evidence still fails closed. The default source configuration remains off, no cleanup/fallback runs at startup, and the generic `openOriginalActiveStore`/publication `recover` paths retain compatibility.

## Validation, separate runs

Node 22.23.3/macOS synthetic IndexedDB only:

1. First three-owning-file batch: **22 pass, 1 fail, 5 cancelled**, 31214.121166 ms. One cold assertion incorrectly compared a hydrated Entry body with a physical thought row lacking body. A synchronous raw abort injection left its fixture promise pending; no runtime pass is claimed. `first.tap` and exact `first-source.mjs` retain this run.
2. Corrected three-owning-file batch: **28/28**, 6098.897917 ms, exit 0, no fail/cancel/skip/todo. Eight new completion cases, fourteen application-selection cases (including actual configured worker and new unretired/retired selection pair), and six original qualified retirement cases. Runtime unchanged between the two runs; only the expected body and failure injection changed. The corrected injection causes a real terminal-fence mismatch by changing the ledger in the same retirement transaction, and asserts full rollback plus unchanged committed publication.
3. Complete original publication owning file: **32/32**, 297.026083 ms, exit 0, no fail/cancel/skip/todo. This independently covers original recover/publication compatibility; it is not a single 60-case run.
4. Native Source/release bridge prepared only, exact eight-case ordered allowlist with no duplicate/unknown names. The owning case bodies are preserved except the fixed original constructor substitutions needed for native IDB. Syntax/bridge generation passed; **zero browser or build executions**. First generation assertion refusal and reason are retained in `preparation-failure.txt`.

New restore fixtures enforce one or three groups. They verify genuine publication → no cleanup on open → explicit original retirement → ready → original Human edit; cold reopen before/after retirement; injected full rollback; cancel during real retirement; newer-owner binding preservation; forged handles/session rejection; concurrent advance refusal. These small profiles have at most 32 item/page copies, so one original batch completes them. **They do not establish multi-batch partial-retirement performance or repeat the 129-group recovery.** Durable multi-batch progress and the fixed batch bound are inherited unchanged from the original retirement owner; old larger-group tests were not rerun.

The root's unique 129-group result remains FAIL (publication succeeded, subsequent edit exceeded its ordinary bound). This package addresses the missing explicit retirement lifecycle in small profiles; it does not retroactively turn that failure into a pass, prove native capacity or spend another large-run allowance.

## Limits retained

Ordinary 4096-reference / 2 MiB / 30-second transaction budgets and existing final fences unchanged. No idb, ledger, retirement-owner, Source-purge, worker/startup, schema, workflow, version or provider changes. No cloud CI, browser, build, installation, real data, model, credentials or deployment. Default application configuration remains null. Broader noninitial/replacement families remain fail-closed under original qualification.
