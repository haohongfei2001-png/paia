# Entry move: definitive storage failure recovery

Base4d19ba173ef83115247d22e4b713a1c988b963a3. PR199 review identified an inherited Topic0.22 defect: a definitive PLACE_LIBRARY_ENTRY storage failure retained its retry payload, preventing a fresh destination and eventually occupying all eight unresolved-operation slots.

The narrow UI catch now releases STORAGE_FULL and STORAGE_FAILED for this exact RPC. Its operation owner writes placement, Topic/Entry revisions and the operation receipt atomically in foundationWrite. The path does not set pendingControl, has no onCommitted callback or post-commit read, and the worker sends its successful response before notification. Independent review verified this call chain. This conclusion is not generalized to other commands. Missing/unconfirmed responses, unavailable/channel interruption, timeouts and unknown outcomes still retain the exact operation and destination.

Two new regressions failed before the fix (retained size1 instead of0); after the fix, the complete owning units pass25/25, including five explicit unknown-result preservation cases and the existing eight-attempt bound/idempotent owner test. The unchanged complete native source/release Entry move file passes2/2 in5.55s with current Source/body/version/retained-node/English320dark assertions. No test timeout, old assertion, schema, version or CI is changed here.

Raw local evidence: work/entry-move-storage-before.log, work/entry-move-storage-after.log, work/entry-move-failure/entry-move-storage-native.log. Independent root_finish review passed against the production call chain and diff. This is a local follow-up candidate, not a main/installed or whole-TOPIC completion claim.
