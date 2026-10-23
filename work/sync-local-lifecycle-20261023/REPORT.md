# Fixed local Sync lifecycle and Settings consumer

Base: 424b485b7b5ef1129fb3c935cb1ee9ac95fd097c. Local synthetic development only. No real issuer, account, token, cloud request, browser execution, build, installation, CI or large corpus was used.

## Implemented consumer

The actual worker initializes one fixed source configuration after its original store/control recovery is ready. The shipped configuration is null: no new Core, journals, transfer or writable Sync actions. All startup/suspend listeners register synchronously; startup and cold recovery reconcile local original receipts only. Configured test copies use the actual same worker store and original Source/Filter/Working plus SourcePurge journals, original Core, publication journal, recovery session, Google and OneDrive transports. No RPC can supply identity, database, dataset, scope or transport. Original consent remains required for resume/publication/restore. The original publication checkpoint synchronously checks the current local mode/host fence; no async storage check is inserted inside IDB. Existing nontrue CONSENT is an INVALID_REQUEST, not an actual revocation API; no new side effect or invented reset is added. SET_ENABLED continues to mean capture pause, not a new Sync grant rule. Real host binding revocation is checked by each original transport before and after requests.

Body-free lifecycle state persists exact provider/account/database/dataset/device binding hashes, generation, mode and original task/reference. Pause/disconnect invalidate transport first; account changes never retarget old work. Unknown local storage acknowledgements are read back once without repeating the write. Original provider receipts govern lost uploads and remote-missing refusal. The singleton fence is one MV3/module owner plus local row comparison, not an atomic cross-process CAS claim.

Settings opens with one status read. Configured explicit buttons send only fixed zero-argument commands to the same worker; no login or invented permission. Busy blocks duplicate clicks, uncertain replies require an explicit status check, and late replies after close/leaving Settings cannot replace UI. The original modal and bilingual default unavailable text are retained. Successful explicit recovery emits original ARCHIVE_CHANGED notification. Valid Topic deep links use original canonical topicRootTarget; query/arbitrary hash/duplicates/incognito/non-top frames are refused.

## Safety finding and exact boundary

The original SourcePurgeJournal was initially missing from configured assembly; the failing contract is preserved in purge-before.log. It is now installed on the same Core. Actual worker capture→PURGE_SOURCE tests show the existing Filter writer guard refuses permanent deletion. Worker retains original STORAGE_FAILED error mapping; the direct original owner proves BNS_FILTER_WRITER_UNSUPPORTED. Source records remain unchanged. The unknown-publication variant proves delete refusal sends nothing and retains original task; explicit later publication reconciles the original cut, not a new task. This is fail-closed unsupported deletion, **not** observed deletion success, observed deleted-body leakage, or fully supported purge propagation. UI/state retain incomplete scope and unsupported Source purge.

## Verification chronology

Actual runtime: existing official isolated Node 22.23.3 on macOS. All suites below are small synthetic Node with fake IDB and bounded fake provider HTTP; no HTTP implementation performs fetch.

- first: 10/10; expanded: 15/15. These precede later worker/UI changes.
- owning: 135/135; final: 135/135. Both precede final notifications/purge/UI; filenames are historical, not latest-byte certification.
- notification: 18/18 before new purge/UI consumers.
- purge-before: expected missing SourcePurgeJournal wiring failure; not an observed data-leak trace.
- ui-first: 26/26 before actual Settings→worker extension of coverage.
- ui-worker: 28/30; two tests expected internal BNS_FILTER_WRITER_UNSUPPORTED at the worker boundary, but actual original worker maps it to STORAGE_FAILED. Only assertions were corrected, production mapping was preserved.
- purge-worker: 2/2 targeted actual worker tests; direct owner separately proves exact guard reason.
- delivery: seven owning files, 146/147, 5697.482167 ms. Sole failure was the new consent fixture trying to revoke consent after journal installation, which itself is refused by the existing filter writer guard. The fixture now starts with an originally unconsented store rather than disabling an installed owner.
- consent-correction: 1/1, only that corrected fixture. Do not report one all-green 147-case invocation.
- checkpoint-fence-final: final seven-file batch **148/148**, 5226.644208 ms, exit0, no fail/cancel/skip/todo. This follows the original publication checkpoint fence addition and covers every final production byte plus corrected fixtures. Explicit pause while original preparation is held rolls back its transaction at the original checkpoint before any transfer. All earlier failures remain separate.

The delivery invocation was:

```text
<existing isolated Node22>/bin/node --test extension/tests/sync-local-lifecycle.test.mjs extension/tests/settings-sync.test.mjs extension/tests/browser-native-sync-publications.test.mjs extension/tests/browser-native-sync-google-drive.test.mjs extension/tests/browser-native-sync-onedrive.test.mjs extension/tests/application-startup-events.test.mjs extension/tests/application-store-selection.test.mjs
```

Targeted corrections use --test-name-pattern='configured=purge' and --test-name-pattern='configured actions still require original consent', respectively. All complete raw TAP outputs are retained. Source-vector identifies final seven source/test files; SHA256SUMS binds report and evidence.

## Native preparation, not executed

`extension/tests/native-sync/sync-local-lifecycle-native-preparation.mjs` exports prepareSyncLifecycleNative(extension) for the original disposable instrumentedExtension result, and runSyncLifecycleNative(h) for the original headless FakeChatGPT harness. No automatic test registration or launch occurs. Source config is replaced only in that disposable copy; a static bridge captures one fixed synthetic input into the original worker store. The prepared driver uses actual Settings DOM buttons, native IDB, retained unknown task, pause and cold restart. Its synthetic request capability deliberately refuses before network, so it cannot certify a successful upload. Syntax checked only; selectors/native behavior remain NOT_RUN. Root can include it in the planned single native milestone with other lines, using the same original launcher/network isolation. No security arguments changed.

## Unclosed obligations

NOW publishes operation cuts, not a checkpoint manifest. RESTORE consumes existing grouped checkpoints. Tests prebuild an original checkpoint explicitly and do not prove NOW→new device recovery. The original checkpoint-producing successor is a separate active package. Source/Working-only, wholeArchiveComplete=false, productionActivation=false and missing Human/Prompt/Context/Topic owner coverage are always explicit. This package is not SYNC01 C or SYNC02–06 programme completion; real issuer/OAuth, actual provider qualification, complete canonical lifecycle, cross-platform/native and cloud/Full gates remain separate. Native prepared entry and local timestamps are not Linux capacity evidence.
