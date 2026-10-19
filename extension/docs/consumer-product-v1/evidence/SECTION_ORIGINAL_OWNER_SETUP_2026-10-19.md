# Section native setup through the original worker

Base: PR305 head `665fb1b8437c2186ca0b3cc727470e769614547e`, tree `bb1374ddec6158cc4acd2d17994d5d61530b6416`, against main `734517759d3becf4b3d3ac33a182ad3e92708487` (0.55.2). This successor changes only two tests and this receipt. No runtime, version, permission, workflow or deadline changes.

## Original failure retained

Full39237260454 completed FAILURE. Browser3's original ANS08 Undo/Redo passed; Browser6/job118009280956 failed the release TOPIC-05.5 Section-actions setup, at line16:19 before its UI assertions. The source variant of that case passed. Browser6 was83/84; the other nine Browser shards and all nonbrowser component gates passed. This does not qualify the failed Full.

The exact original native test is17926 bytes, Git blob20299f2f627856c1f906b549e05f0ffd4afe04e3, SHA256760af425df9eedbe21840d887077855c06ed8e1e0062d1488e7cda4385ad0c8a. Original complete job log SHA25652a4dd6fe354117ccbb1af0a65156ac41d62c1a3b37be00ad90435590e0273d6 is retained. The failed setup created a new page-side OrganizerStore while the real worker retained its original Store. Its stack identifies the original IndexedArchiveStore.run before/local/after control-publication fence, before entry to the requested callback. The original CI artifact has not been inspected for this successor; the exact concurrent CI publisher is not identified.

## Deterministic original-owner evidence

The added unit uses the real OrganizerStore, original shared database, original local adapter and real updatePreferences publication. It holds the second Store's original local.get between its original before/after reads, publishes through the first owner, then releases. The original control revision really increases, the second read rejects CONTROL_PUBLICATION_CHANGED, and its requested callback is never entered. This establishes a reachable mechanism matching the original stack, without claiming the unique CI scheduling cause.

The native setup now waits for actual GET_STATUS consented/enabled, acknowledges the real completed GET_LIBRARY_FOUNDATION_STATUS, then uses the existing authenticated worker routes for Topic creation, Topic read, Section creation and continue-thinking. Every write has one distinct operationId and is sent once. The existing GET_LIBRARY_TOPIC recoverySnapshot wrapper remains. No retry catches a rejected write or replays a partially completed setup.

The actual original methods prove the exact default Section acknowledgement, two distinct added Sections and unchanged synthetic protected prose. Separate controls prove CONTROL_PUBLICATION_CHANGED and STORAGE_FAILED propagate without a second write attempt, and paused authorization performs zero writes. The unit's20-pass setImmediate watchdog bounds only its own paused negative fixture; the native retains the original eventual implementation and120-second case timeout.

## Preserved product assertions

All original native assertions after setup remain byte-for-byte unchanged: exact original default Section, contextual create/cancel and one durable ACK, in-flight duplicate prevention, keyboard/native focus, rename/order and stale rename rejection, protected prose and IME, reloaded state, both languages, narrow/touch/text-size geometry, screenshots and original privacy checks. This does not replace browser verification of the newly routed seed, including normal archive notifications.

## Local results and limits

- Added original-owner controls:5/5, zero failed/cancelled/skipped,409.673045ms.
- Final related combination:64/64, zero failed/cancelled/skipped,1475.377691ms. These include the five controls; counts overlap and are not added.
- Both modified/new test files pass syntax checking.
-1378 executed input files have identical before/after mappings and actual bytes, including the original five Python bytecode files. All1376 inputs inherited from the preceding frozen execution tree are unchanged; the two Section tests are the only additions to that partial materialization. The receipt was added after execution and is separately hashed. Generated work output is outside this execution inventory.

Reproducible final command, from extension:

`node --test --test-concurrency=1 --test-reporter=tap tests/topic-section-original-owner-seed.test.mjs tests/topic-section-pending-publication.test.mjs tests/topic-selected-section.test.mjs tests/ans-08-undo-save-lifecycle.test.mjs tests/topic-stale-publication.test.mjs`

Independent review, exact new-head original native/Full and subsequent actual merged-main checks remain required. This local mechanism result does not certify the new browser head, the whole product, a live provider or an installed update.
