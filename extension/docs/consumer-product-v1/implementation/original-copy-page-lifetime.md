# Original complete-copy page lifetime

On the inherited PR284 candidate `b5a641c81aecf899db7cbe405fdeaada0de952d3`, the original-text surface kept a copy request alive across its own next/previous-page actions. A delayed clipboard failure could replace the newly selected original page with an earlier manual-copy field. A delayed full-read failure could clear that page, and an older successful clipboard response could enable a newer pending Copy action.

The existing OriginalSurface now binds each complete-copy operation to the current page/copy intent as well as the original reading host. Starting a page read retires the preceding copy intent. Complete-read traversal, clipboard completion, failure presentation and final busy release all check the same ownership. Already dispatched OS clipboard writes cannot be revoked; retirement only prevents stale completion/UI effects and prevents not-yet-dispatched obsolete reads from copying. No Source reader, generation qualification, complete-target copy, permissions, storage, navigation or recovery owner changes. The current page can still explicitly copy the complete original target, including unmounted text, and current clipboard denial retains its exact manual-copy fallback.

Independent parent and peer code reviews found no blocking issue in the runtime and complete tests; the peer independently ran all six new cases successfully.

## Evidence and limits

- The initial five new production-class regressions on the inherited runtime produced 2 PASS / 3 FAIL. The failures demonstrate stale page replacement, stale error replacement and premature busy release; they are preserved as failures.
- After repair, five whole owning test files, including one additional successful-held-read regression, pass 33 tests, with zero failures, cancellations or skips. They cover existing protection refresh, original sequence integrity, original presentation, Reader copy retirement and the new page/copy combinations.
- The existing complete Source/release Original native file now also exercises two held clipboard requests around real next/previous-page navigation. It retains the original full-target, source equality, close/purge, layout, history, no-network and runtime-error assertions.
- Local native execution was attempted before the repair using isolated synthetic profiles. All four cases failed before application execution because the cloud process disallowed Chromium's singleton socket (`Operation not permitted`). This is an environment failure, not browser acceptance. No user profile, local extension, permission or runtime security setting was changed. The updated native file remains pending the existing hosted full certification gate.
- Package guards pass: 16,347 checks over 483 runtime resources. The development privacy/permission/network audit passes. The standard release builds and passes the 503-file release guard. These are static/build results, not native or visual certification.

This is a candidate repair in the original PR284, not integration, installation, formal publication or whole-plan completion. Exact-head full certification, latest approved visual comparison, independent review and exact merged-main qualification remain required. Pro retains PR264/CI infrastructure ownership; Sync new features remain paused. Prior failed, cancelled and skipped evidence remains unchanged.
