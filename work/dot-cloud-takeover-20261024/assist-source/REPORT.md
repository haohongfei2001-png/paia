# Assist original source-task quiescence package

## Frozen identity

- Cloud worktree: `/workspace/scratch/ff1c41bf9b29/paia-cloud-dev-20261024/worktree-assist`
- Branch: `codex/dot-cloud-assist-quiescence-20261024`
- Package base: `e956b80e72cc6c5cf32641e22e52d8eea4799dca` (reviewed Context candidate).
- Initial Assist candidate: `d886474b649790a457ecc6b86fbe172eb061d462`.
- Final candidate: `6cae8f63c313f0d2d041aa1d4977ba6059b317e2`, parent d886, tree `81b5de076a183a97ec8a87f749662b2d5733456f`.
- Relative to e956: exactly three files, 224 insertions / 39 deletions. No foundation, Next, service client, worker, content, activation gate, version, dependency lock or CI changes.
- Sparse history retained unchanged. Final commit used `git write-tree --missing-ok`, `git commit-tree`, and guarded `git update-ref` on the owned branch. No reset, clean, push or PR. Final index/worktree clean.

## Exact owned files and SHA256

- `extension/background/prompt-assist.js`: `3e5084e56511b27f5d239a93b47c6cd74e3d67c3215f757902ad8b38be888557`
- `extension/core/ai-usage/local-assist-session.js`: `38b86327a5127a5a40101a215110930e0ff9cfbff1fc903e6a64623821c460c7`
- `extension/tests/assist-source-quiescence.test.mjs`: `41267957173a6e5e09a651dd4e47631800fa12dc9ca9e2ecbb2ad9cbb1b1bd11`
- `assist-source-quiescence.patch`: `e10b599a2036eb670a984102cf65568e01d284193e9e144a9ab5bfdc196e051d`

## Implementation

The real command/session owners retain their original preparation, registration, automatic reply probe, run, report, cancellation, notification and insertion promises through settlement. Clearing activation/private maps, aborting a signal, or settling a bounded Promise.race is not a drain acknowledgement. The private local provider's physical promise is retained independently of its existing race. A branded service provider is never cloned or unbranded.

Source holds synchronously close admission, invalidate old continuations, drain real original tasks, then read the original jobs/attempts/preflight and existing terminal/financial receipt validators. Exact opaque tokens bind session, admission, repository/database identity, original epoch/gate and the original readonly evidence snapshot. Final fences re-read the snapshot. Original 4096-reference, 2 MiB and 30-second bounds remain; the original insertion race stays 2 seconds. Restrictive cancel/revoke/remove-tab/context invalidations remain effective during a hold. Release does not trigger or replay work. A never-dispatched prepublication registration is left to its original preparation owner rather than fabricated into a terminal receipt.

Every original dispatch call now closes only on its own returned RESPONSE_RECORDED. A thrown settlement ACK or any other result leaves a monotonic O(1) source UNKNOWN flag, without changing the original financial row or outcome. Later successful calls cannot clear earlier uncertainty. Insertion uncertainty likewise uses constant-space ever-true flags instead of accumulating historical empty tokens; live transports remain in the original task sets.

## Final scoped verification

Cloud Node v24.19.0 only. Final combination: **134/134**, 0 failures, 0 skips, 9041.571248 ms, in `owner-corrected-final.log` (SHA256 `ac35d9daab3725580c4d337ad6eae4cb2fe0f42ae2820926492f1e590854a316`). This is 28 new owning tests plus 106 original directly relevant tests, not a cumulative sum of earlier runs.

```sh
node --test --test-reporter=tap \
 extension/tests/assist-source-quiescence.test.mjs \
 extension/tests/ai-assist-private-session.test.mjs \
 extension/tests/assist-service-configuration.test.mjs \
 services/ai-gateway/tests/assist-client-path.test.mjs \
 services/ai-gateway/tests/assist-client-boundaries.test.mjs \
 services/ai-gateway/tests/assist-client-content-ack.test.mjs \
 services/ai-gateway/tests/assist-client-recovery.test.mjs
```

All three files pass `node --check`; full package `git diff --check` passes. `final-syntax-status.log` records the environment and final clean identity. The original signed gateway/ledger fixture uses a deterministic SQL protocol simulator, fake IndexedDB and intercepted HTTPS. No socket, PostgreSQL service, real provider, browser or native host was used. Existing pg 8.23.1 matching the original lock was read-only reused through a worktree-only symlink; no install or lock edit. The symlink was removed after testing.

## Preserved failures and controls, not relabelled passes

- `prerequisite-missing-pg.log`: initial fixture could not import pg. This is an environment prerequisite failure, not a runtime regression. Existing compatible dependency was then reused without installation.
- `map-empty-before.log`: original registration awaited before map invalidation; empty maps incorrectly implied settlement, actual original continuation was pending. True pre-implementation negative, 0/1, 694.141199 ms. Its exact test file is preserved beside the log.
- `dispatch-throw-before.log`: original private provider failed; original markUnknown wrote UNKNOWN, then its ACK threw. Original BackupService replace removed transient job/usage rows. d886 incorrectly issued a warm hold. True negative, 0/1, 608.855239 ms, “Missing expected rejection.”
- `dispatch-throw-after.log`: that same owner negative passes after the finally correction, together with the server tail control, 2/2.
- `server-tail-throw-before.log`: 1/1 positive control even before the correction, not a claimed negative. Original branded server fetch response-tail promise remains pending while bounded wrapper and markUnknown ACK fail. The synthetic HTTPS completion has already arrived; this is not evidence of a remote model still physically executing. Original preflight also denies the hold, and late resolution does not grant it.
- `owner-reviewed-final.log`: first expanded combination 133/134. The added later-dispatch test wrongly assumed original restore clearing transient rows permits a new job; original Foundation's surviving global flight correctly rejected OUTCOME_UNKNOWN. No production guard was weakened. The corrected control uses a real original RESPONSE_RECORDED publication-ACK loss, explicit original commitAssistResult settlement, and a real later successful dispatch to prove the earlier source UNKNOWN remains. `later-dispatch-control.log` is 1/1.
- Earlier compatibility 53/53, new-owner 20/20, combination 126/126 and d886 combination 130/130 logs are historical snapshots. Only final 134/134 applies to the frozen candidate.

## Required non-claims and next boundaries

This is an instance-local **source-task** proof only. It is not global quiescence, cold provider/insertion evidence, native host freeze acknowledgement, or permission to activate an existing library. All application-selection gates remain unchanged and deny activation. A missing configured session proves only the current command instance has no tracked session tasks; it proves nothing about old provider work or insertion.

The original Foundation hides the server physical promise behind its bounded wrapper. Any unproved original dispatch result remains denied; this package does not pretend to observe or settle that hidden promise. Cold instances can inspect original visible jobs/preflight, but cannot infer absent past work from rows removed by restore or empty private maps. A future integration must obtain the relevant original owner's durable evidence, not promote this partial token.

Controller exceptions before observed dispatch are intentionally conservative UNKNOWN, including qualification failure inside a controller. There is no local reset or automatic retry for these source flags. Future original durable operation evidence is needed for cold/uncertain insertion; no parallel persistent truth was introduced. Financial UNKNOWN and original anti-replay fences remain authoritative and unchanged.

Next distinct package owners, not edited here: `extension/background/prompt-next.js` for its actual offer/configure/insertion task lifetime; original Foundation/provider bridge for hidden physical lifetime; original content/operation insertion owners for body-free durable pre-dispatch and exact confirmed completion evidence; only then the worker/application-selection composition. Neither Assist nor Next map emptiness is that evidence.

No Full, cloud diagnostics, 100k, 129-group, native host, browser, Node22/macOS or live-provider qualification was rerun or claimed. Independent read-only review of final 6cae8f63 found no blocking issue, limited to the warm instance source-task proof and the non-claims above. The reviewer read the author logs but did not run tests or modify files. Integration belongs to the parent owner.
