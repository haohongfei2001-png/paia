# Independent Settings UI lifetimes: combined local qualification

## Exact source and scope

Published base: `510d2c7f5a94367db2411f38ad1017860d9b81d8`, tree `74b1c25ab8c38134c4476e3668c4039ba4bc0736`.

Tested source: `dbc989fa2a81d99df806585b49704f0063de573c`, tree `a57c2d0c01d5592bc07f3e54149c57f7156db680`.

The source is the exact disjoint composition of feedback `c7c7f62347ba0bf39d394e76dba0cab96738e350` (16 paths) and Settings close lifetime `32678c92b63f9c0bb96ae831c31b01712d879e4e` (11 paths; source `9be7a8614a39feabbe3e584960b7b849d29f27d9`). Exactly two production files change:

- `extension/ui/settings-feedback.js`: SHA256 `8a69916367d1a0bc80ec53bf2465c53a058db8c4147127fdd5a4c7505ed7d5a2`.
- `extension/ui/settings-details.js`: SHA256 `c72f7f1a328488559ce531d8937c6e596ce44d7aa524d453ebe0e6c3378d8044`.

The two new complete owning files add nine feedback and six close-lifetime cases. Existing owning/consumer tests are unchanged from published 510d. Other source paths are author reports, independent reviews and preserved evidence. Core, background, services, CI and bounded-native preparation trees remain exactly equal to published 510d. All 32 previous published report/ZIP artifacts retain their exact blobs and hashes.

This is independent ordinary Settings UI work. The separately held Context/sync candidates, cold-control correction, security controls and Source continuation `7ceb` are neither imported nor cleared. Historical candidate passes, including blocked cold 155-file/3375 evidence, do not transfer to this source. No claim is made that the held `b30` candidate is accepted.

## Behavior repaired

Feedback copy failure no longer steals focus or replaces a newer same-text selection. The unchanged original attempt can still focus/select current text for explicit manual copying. One idempotent intent-observer disposer retires listeners on supersession, composition, actual leave and reopen even while the clipboard promise remains unresolved. Old completion cannot retire the current observer; a queued old native close event cannot retire an open newer attempt. The clipboard call is not cancelled, replayed or broadened, and no content is added to an external destination.

Settings detail close acknowledgements now belong to the original row-opening lifetime and its particular close request. A stale acknowledgement/error/finally cannot dismiss, annotate or reenable a newer opening. A superseded pre-dispatch microtask does not invoke the old guard for the new opening. Existing entered owner work is not cancelled or rolled back. Direct externally introduced `showModal` routes are outside this scoped proof. Keyboard containment and native browser-owned focus behavior are unchanged.

## One meaningful complete-file result

The exact unfiltered command and fixed file list are bundled. It runs 12 complete files: original and new feedback owners; original and new detail-close owners; About; About focus; AI-style presenter; Maintenance Settings; local Settings consumer; directory focus frame; Settings Sync; original Sync local lifecycle.

- Result: **216/216 PASS**, zero failed, cancelled, skipped or todo cases; exit 0.
- Started: 2026-10-25 03:47:25.651616 UTC; finished: 03:47:54.856275 UTC.
- TAP duration: 29114.150505 ms; wall time: 29.20449357596226 s.
- Original outer ceiling: 240 seconds. No per-test deadline, case, threshold, skip or filter was changed. No retries or second combined run.
- Raw log SHA256: `4b050ebbe3397f9c0d118ec2de5ef4db4b11d98a3d500a333d77626a7f9eaf38`.
- Fixed list SHA256: `2239fc932e1b8fc0c9265c89608830bc99f2c5f3ce70bc871a419c39f1698d6f`.

Both component source reviews and the independent post-run source/result audit passed at the recorded exact bytes. Component results overlap with this run and must not be added as unique coverage: feedback author22/22 and independent30/30 (including eight independent controls), close author10/10 and independent10/10.

## First failures and superseded results retained

- Feedback baseline new owner: 2/5 passed, three actual failures. Initial author18/18 and reviewer26/26 belong to earlier runtime `340c67ec`, before the pending-copy listener-retirement finding. Those are preserved, not relabeled as the final22/30 source.
- The reviewer versioned the independent overlapping-copy case when the correct maximum changed from ten listeners to five; old evidence remains. Original focus/cleanup assertions were preserved.
- Close baseline: 1/6 passed, five failures. Author and reviewer corrected10/10 results are retained separately.
- Initial close materialization failed on an unrelated unavailable screenshot blob. No missing historical object was restored.
- Feedback packaging initially compared a private index before/after intentional staged changes instead of shared-root state; its author recorded the corrected shared-root identity check. This was not a runtime failure.
- Integration preparation found unavailable exact Chinese About HTML Git blobs. Existing older local pages did not match and were rejected, not substituted. Root then authorized read-only connected GitHub retrieval of the three exact published blob identities into this isolated fixture only. SHA1 Git identities and SHA256/size are recorded. Shared Git objects and root checkout were not changed.
- An initial static import scanner mistook a data string `from` followed by a comma for an import; requiring declaration whitespace corrected the scanner. No source/test change or test rerun was involved.
- Full `git diff --check` reports whitespace-only lines inside preserved raw failure TAP. Source/test diff check passes. Raw logs were not trimmed to manufacture a clean evidence diff.

## Execution and delivery boundary

All 12 files and their 430 relative module dependencies were inspected. Imports are checked-in source/vendor fixtures and Node builtins only. Test transports, document, clipboard and browser APIs are synthetic; no real network/provider, OS clipboard, email application, browser or native launcher ran. Maintenance's existing pure test reads native-test text and executes only the extracted passive observer with a fake page/DOM in `node:vm`, not the native suite. About reads six exact-base local HTML fixtures and does not navigate or fetch their links. No pg link, dependency install, build, CI, Full, protected 129-group/100k/old-C gate, account or paid action was used.

The post-run preservation receipt proves root HEAD, complete original status and staged binary diff byte-identical to their before snapshots; the isolated source is clean, all tested source/test hashes remain exact, and there is no dependency symlink. Root raw staged contents are not republished in this bundle; only preservation hashes are recorded.

The new full engineering ZIP contains current source snapshots, complete current author/reviewer initial/intermediate/final history, exact tests/list/command/log, source patch and hash manifests. Prior published ZIPs remain unchanged in the repository and are referenced by exact commit/blob/size/SHA256 rather than nested again. No prior failure is erased by this packaging choice.

This is finite Node/fake-DOM UI qualification, not native clipboard/dialog/focus/IME or accessibility acceptance, exact new Release/Source proof, whole Settings or whole-product acceptance. It does not retry or waive held reviews. Publication remains a separate root-owned action; no remote mutation was performed by this integration task.
