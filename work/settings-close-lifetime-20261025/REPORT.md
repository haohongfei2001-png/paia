# Settings detail close lifetime correction

Base: published development commit 510d2c7f5a94367db2411f38ad1017860d9b81d8. Ordinary SET2 modal lifetime/focus preservation; no redesign.

## Reproduction and correction
A close guard was retained across an external close and original row reopening. Its late true response could close the new opening; rejection could annotate it, and shared closing state prevented a fresh close request. A guard queued before synchronous close/reopen could also call the owner for the wrong opening.

Each original row opening now has an identity, and each pending close has an attempt identity. Before invoking the guard and after acknowledgement/error, current opening and attempt must still match and the dialog must be open. Finally only releases its own pending attempt. A new opening resets the close control and owns a new request. No close-event cleanup is installed, so an already queued old native close event cannot alter a newer pending request. Native dialog focus and keyboard behavior remain unchanged. Already-entered owner work is not cancelled or rolled back; only stale presentation completion is suppressed.

Only production path changed: extension/ui/settings-details.js. Backup/controller, domains, persistence, permissions, network, dependencies, workflows, manifest and version unchanged. This scope uses the original row-opening route; no new API for arbitrary direct showModal callers is claimed.

## Exact evidence
- New owning file baseline: 1/6 PASS, 5 FAIL. Original first log retained.
- Author: existing settings-details.test.mjs plus new settings-detail-close-lifetime.test.mjs, complete two files, 10/10 PASS, zero failure/skip/cancel/todo, 91.079711 ms.
- Independent reviewer: same complete two files 10/10 PASS, zero failure/skip, 93.010196 ms; source review found no blocker within the original row-opening route.
- Controls: stale allowed/error completion, immediate fresh close request while old pending, old finally isolation, queued native close event, before-microtask supersession, same-opening held/rejected/retry behavior, existing keyboard containment and destination identity.

These are pure DOM fixture tests. Native browser, Source/release, real focus/layout/IME, larger integration and full certification were not run. No held Sync/Context review or restricted operation was retried. No publication, integration, main change or installation is claimed.

Initial materialization encountered an unavailable unrelated screenshot blob; partial extraction retained, no lazy fetch. Required selected source/test files materialized; exact existing test/harness bytes match Git. Shared repository HEAD/index/worktree untouched.
