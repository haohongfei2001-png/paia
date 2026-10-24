# Settings Sync stop controls

## Scope and source

Accepted source: `08d06a3c3a143bb8db42dfb3ff4f152a05b9722b`.
Only delivered runtime change: `extension/ui/settings-sync.js`.
Owning additions: `extension/tests/settings-sync.test.mjs` and `extension/tests/sync-local-lifecycle.test.mjs`.
Default provider configuration, RPC shapes, backend cancellation, task identity, consent, storage, permissions, package versions, release files and workflows are unchanged.

The original lifecycle accepts PAUSE and DISCONNECT before ordinary transfer/consent busy gates. Settings previously both disabled those buttons during a local request and hid them when a reopened worker status reported busy, so the original cancellation owner could not be reached. This violates the already adopted stop-future-transfers behavior in BROWSER_NATIVE_SYNC_UX section 4.

## Implementation

- Track the current pending command, not an undifferentiated local busy flag. Existing PAUSE/DISCONNECT remain actionable while an ordinary request is pending or the worker reports busy. Active-only Pause scope is unchanged.
- Keep local stop and generation actions single-flight. Preserve generation selection busy/terminal holds and ordinary transfer/enrollment restrictions. No additional mutation command is admitted concurrently.
- Supersede earlier presentation work with a per-request serial. A delayed ordinary result, invalid result, rejection or finally cannot replace a newer confirmed paused/disconnected view or clear a newer request's pending state.
- A stop reply's worker busy and resumeAvailable values remain authoritative. Only an explicit status read can refresh them; no automatic polling, retry, Resume or transfer occurs.
- An uncertain response remains visibly uncertain and blocks transfer/enrollment; explicit non-transferring stop actions remain reachable. Close/reopen and leaving Settings retain their original current-view fences.

## Preserved failures and verification

All executions below are synthetic Node only. Fake transport requests stay in process; no account, provider or network operation was made.

1. `first-mounted-red.log`: accepted UI with new mounted-handler tests, 28 cases, 15 pass / 13 fail. Failure is non-actionable PAUSE/DISCONNECT during held local or worker-busy operations and after uncertain ordinary response.
2. `first-owner-red.log`: accepted UI against original lifecycle, held committed publication, 0/2 pass. Both actual mounted stop controls are unreachable.
3. `owning-attempt-1.log`: first candidate attempt, 80/81 pass. The new consent fixture mistakenly called unsupported `consent(false)` and received INVALID_REQUEST. This failure is retained. The fixture was replaced by a distinct genuinely unconsented original owner, not a mock of authorization or weakened runtime assertion.
4. `owner-stop-targeted.log`: all five mounted original-owner cases pass. Held publication and held restore each accept PAUSE/DISCONNECT without additional transfer, restored data or task replacement. Original unconsented Resume fails; only explicit original consent allows a later explicit Resume, with no automatic transfer.
5. `owning-final.log`: complete Settings Sync and original local lifecycle files pass 89/89; zero failure, cancellation, skip or todo. No name filter. Includes all unchanged owning cases plus late ACK/error/invalid/finally, reopened busy, active enrollment, not-started disconnect, repeated stop, failure, close/reopen, newer Status/Resume and generation single-flight controls.
6. `adjacent-owners.log`: six complete adjacent files, 29/32 pass. Three failures occur in unchanged sync-worker-checkpoint-prompt.test.mjs. Comparison with accepted UI is recorded below; these failures are not relabeled passes.

Commands:

    node --test extension/tests/settings-sync.test.mjs extension/tests/sync-local-lifecycle.test.mjs
    node --test extension/tests/settings-details.test.mjs extension/tests/application-selection-consumer.test.mjs extension/tests/application-selection-editor-safety.test.mjs extension/tests/application-worker-admission.test.mjs extension/tests/sync-worker-checkpoint-prompt.test.mjs extension/tests/sync-worker-context-consumer.test.mjs

`node --check extension/ui/settings-sync.js` and scoped `git diff --check` pass.

## Boundaries

No actual browser/native, Full/C, protected 129-group, 100k-scale, real provider, cloud, account, paid model, install, deployment or local-computer execution. Synthetic mounted DOM and original-worker fixtures do not establish native/visual/accessibility or whole-programme acceptance. Independent exact-candidate review remains separate. Integration/version identity and any later broader validation remain the integration owner's responsibility.

Sparse materialization encountered four already-absent historical asset blobs. They were not fetched, deleted from the committed tree or treated as new missing runtime files. The isolated commit uses an exact-base temporary index and write-tree --missing-ok, preserving every unrelated base object. Shared repository HEAD/staging are not changed.

## Accepted-baseline comparison

`adjacent-prompt-accepted-baseline.log`: complete unchanged Prompt worker file with accepted UI SHA256 `8fa8f450fb9d071c595c84eb13da643c19c7a74576c914ce820b0199bcf35eed`, 1/4 pass. The same three test names fail, but their provider failure steps are not identical:

- Candidate Google and OneDrive each fail line16:161, B RESUME's ok assertion; the unchanged assertion does not record its underlying error.
- Accepted baseline Google reaches line16:243, B RESTORE, and reports BNS_GROUP_RESOURCE_LIMIT. Accepted baseline OneDrive fails B RESUME at line16:161.
- Both cold-start runs fail CONTROL_PUBLICATION_CHANGED in ContextMutationSyncJournal.emptyEnrollment, through SyncLifecycle.attachContextService.

This proves the additional file was not green on accepted source; it does not establish a shared root cause, classify these refusals as expected, or show identical provider execution. No backend or adjacent-test correction is included. The failing test file is byte-identical in both trees, SHA256 `3dd5ec79cf629643399d354cf4e05afc01fef484da03bd9d06e73be5aaaf525d`. Five other adjacent files pass all 28 cases; do not sum overlapping invocations into a fresh combined run.

The prior 151-file allowlist SHA256 `1ab438ccbbf39c5d3598b828ec2f42c9a0d11f411b7da6605f8e48117e0ffdf1` omits sync-worker-checkpoint-prompt.test.mjs, so all three failures are outside that prior green scope. It includes settings-sync, sync-local-lifecycle and sync-worker-context-consumer. No historical expected-failure qualification for these exact Prompt cases was established in this task. They remain separately actionable accepted-source failures, not a reason to weaken this fix's stop/consent/identity checks.

Final runtime SHA256: `d9401b4697106b92669b33b328f783aaae900bf63c26f87edf085075a26ed633`. Exact test hashes are in source-sha256.txt. Independent review of these runtime bytes separately reports 30/30 synthetic controls; its report and final commit binding are owned separately, not claimed by this author receipt.
