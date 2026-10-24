# Context quiescence package, 2026-10-24

## Frozen deliverable

- Base: `26e6b241342990dfd5d64b599e44e727fd692892`.
- Branch: `codex/dot-cloud-quiescence-20261024`.
- Commits: `a9edf5c669321a19c4d2a2d3f117b7c96df0d32f`, then independent-review correction `e956b80e72cc6c5cf32641e22e52d8eea4799dca`.
- Exact final file ownership: `extension/background/context-connections.js` and new `extension/tests/context-connections-quiescence.test.mjs` only. Aggregate base diff: 214 insertions, 23 deletions. Source patch: `context-quiescence.patch`.
- No pushes, PR creation, version change, worker composition, activation-gate change, installation, native-host execution, browser, real account/data/provider, Full, cloud diagnostic, 100k or 129-group execution.
- This sparse-history cloud worktree is not a complete merge-base or native-environment qualification.

## Implementation

Reconstructed only the unfinished Context owner boundary from candidate ca38c8d8bdfdc05f8b88f5be7f98333fbee7a669 relative to fa889ea3ed42963d635691e9961ced4826f950e8. Already-integrated maintenance owners and page freeze were not repeated. Parent maintenance 12/12 evidence does not qualify this previously untested WIP.

Hold closes admission synchronously, cancels renewal scheduling and request controllers, drains tracked original serial/native promises to stable emptiness, then requires each configured source transport's exact closed-listener ACK. Original callbacks and host identity remain authoritative. The acquisition is bounded by the unchanged 30000 ms limit; original 5000 ms handshake and 3000 ms ACK limits remain unchanged.

Three closure states are distinguished: a source host never sent configure cannot have opened its listener; a configured host must provide its exact original protocol/nonce/generation close ACK; disconnect, failed write, missing ACK, cold nonempty registry and unexplained mirror drift remain UNKNOWN. A late matching ACK may settle only its exact original transport, once. Ordinary map removal is never closure proof.

Pause/revoke remain synchronously restrictive and persist through their original owner while invalidating a hold. Token and final fence bind owner identity, repository and DB object, database ID, original epoch, mirror row and exact original IDB witness including operation ID. No new durable truth store or artificial clean suspend witness is created.

Admission generations stop old connect, ready/list publication and other live transport continuations from reviving after a failed/timed-out hold. Failed acquisition closes old-generation ports without claiming closure acknowledgement. Successful release removes the gate but never auto-reconnects; the original explicit reconnect path remains available. Normal suspend cancellation and cold clean resume remain usable outside selection, but do not erase preceding host uncertainty.

## Tests and failures retained

Environment: Node v24.19.0 on the cloud executor. These are pure synthetic fake-IndexedDB/fake-NativePort owner checks, not Node 22, macOS, Playwright or installed native-host certification.

Final command:

`node --test --test-reporter=tap extension/tests/context-connections-quiescence.test.mjs extension/tests/context-connection-policy.test.mjs`

Final result: 44/44 passed, 0 failed/skipped/cancelled, 6173.016888 ms (`review-owner.log`): 41 new owning tests plus 3 unchanged original policy tests. `node --check` passed for source and test; `git diff --check` passed. The older `context-connections.test.mjs` starts real native hosts and was deliberately not run.

Retained execution evidence:

- `first.log`: 24/25, fixture expectation failure for invalid-version ACK; production correctly retired the bad transport. Fixture corrected, not production weakened. Timer fixture cleanup was also corrected.
- `second.log`: 33/33.
- `deadline-before.log`: focused 0/1 negative control, pending pre-hold pairing permission revived a host after acquisition timeout. Fixed with admission generation.
- `third.log`: 38/38 (35 new plus policy 3).
- `final-owner.log`: 40/40 (37 new plus policy 3), before independent review.
- `transport-timeout-before.log`: focused 0/1 negative control, pending tools/list verification left a ready old transport connected after hold timeout (actual 1 versus expected 0).
- `transport-timeout-after.log`: corresponding focused 1/1 after correction.
- `review-owner.log`: final 44/44, including old ready/list continuation retirement and original five-second hello/ready deadline controls.

Coverage includes exact/foreign/late ACK, multiple ports, never-configured and configured-before-ready hosts, pending serial writes and permission checks, pending Context reads, renewal/ready races, old-generation timeout continuations, pause/revoke and persistence failure, cold registry and drift, exact witness replacement, epoch/database/disposal, permission loss, suspension and explicit cancellation/reconnect. No clean activation claim follows from these owner tests.

## Remaining boundary and next package

This package is only the Context proof. Global activation remains locked. Cold nonempty registry and unacknowledged prior host remain fail-closed until a separately designed original-owner durable closure proof exists. UNKNOWN is not converted to success by reconnect, clean-looking rows, process disappearance, timeout or service-worker restart. The default configured-empty owner can prove absence without enabling native configuration.

Next package must own both original async task settlement and insertion outcome, not merely clear Maps:

1. `extension/background/prompt-assist.js`: hold admission, tracked activation/automatic/context-change tasks, insertion race and original callbacks.
2. `extension/core/ai-usage/local-assist-session.js`: track original preparation/provider registration/cancellation/report promises; invalidation and abort do not prove termination. Existing unawaited cancelServer work and registration-versus-stop races must settle through original owner evidence.
3. `extension/core/ai-usage/foundation.js`: preserve its existing durable financial UNKNOWN and cancel semantics. Never equate financial receipt settlement with composer insertion result or manufacture retry/refund.
4. `extension/background/prompt-next.js`: track original offer/read/resolve-family/configuration/insertion work beyond groups/offers/WeakMap deletion; preserve indeterminate dispatched insertion.
5. Host boundary: `extension/content/prompt-assist.js`, `extension/content/assist-result-runtime.js`, `extension/content/prompt-next.js`. Keep original authenticated QUALIFY/INSERT_CURRENT and synchronous native-composer guards. Durable insertion UNKNOWN needs bounded body-free original operation evidence before dispatch, exact confirmation only after original response, cold survival and no replay. New persistence design needs separate owner review.
6. Root composition, only after all proofs qualify: `extension/background/service-worker.js`, original application editor guard, selection commands and generation selection owner. Keep ACTIVATE/CONTINUE/RESTART refusal unchanged until independent full composition review.

Next-package tests should cover pending registration/cancel/report after display invalidation, read-only hold qualification, pre-dispatch no-send versus post-dispatch unknown, late ACK without replay, cold-persistent unknown, host disconnect/IME/currentness, and strict separation of financial and insertion UNKNOWN. Existing candidate test owners include ai-assist-private-session, ai-assist-automatic-worker, assist-client, prompt-next-r3-lifecycle, prompt-next-reopen-boundary, cpv1-12-next-security/lifecycle, assist-content-bridge and application-selection-editor-safety. Do not rerun exhausted global qualification groups.
