# Existing archive selection: fail closed without cross-page editor protection

Base: `d0189b6dbfa8a59241d69dd9f48007b144df0794`. This successor fixes the review finding in the actual Settings/worker consumer. It does not complete a cross-page editor handshake or general inheritance/reverse migration.

## Finding and disposition

The prior activation reserved Sync tasks, then installed the original source selection marker. The repository correctly refuses ordinary writes while this marker remains. The prior UI nevertheless asked the user to save unsubmitted edits only after activation, and exposed extension restart based solely on the selected receipt. A dirty editor in another page was neither retained nor confirmed by that receipt.

Inspected existing owners: `ui/session-lifecycle.js` has page-local dirty/IME/save/unknown recovery handling; `ui/archive.js` passes its own editors to that lifecycle and uses its own leave guard. Neither is a worker-verifiable complete cross-page freeze/retention authority. No timeout, tab enumeration, caller boolean or selected receipt can substitute for the missing proof.

Following root's explicitly approved safe fallback, the worker now always refuses ACTIVATE, CONTINUE and RESTART. CONTINUE is included because the original prepared operation can still dispatch the SDK pointer mutation. These requests reject before reserve/owner mutation and cannot install markers, change the pointer or call runtime.reload. Direct RPC cannot bypass hidden UI actions. No new authority argument exists. The original safe-error mapping remains unchanged.

Read-only prepare/status and original undispatched cancellation remain available, including when a pending selection prevents ready. Unknown/dispatched outcomes remain unchanged and can be inspected, not retried. The lower-level original selection backend and its prior proof tests are unchanged; this consumer no longer exposes its unsafe activation. Production configurations remain null. No lifecycle or Context source changed.

UI never exposes activation/continued switching/restart, even with an older apparently permissive selected state. It explains the absent cross-page protection. The selected historical state warns that old-page saving may already be blocked and asks the user to retain the unsaved text without restarting. It no longer promises that saving after activation is possible. No data or drafts are deleted.

## Validation

Absolute isolated official Node 22.23.3; synthetic existing-selection fixture, fake IndexedDB, mock extension reload counter and fake HTTP. No actual browser or extension reload.

- `before.log`: three new whole worker cases against original d0189 runtime, **0/3**, TAP 1829.911166 ms. They expose activation, prepared continue and selected-receipt restart lacking the editor gate.
- `after.log`: **16/17**, TAP 2333.629209 ms. The consumer file failed syntax loading because the test replacement left three old lines. The three new safety cases and Settings tests passed; this incomplete invocation is retained.
- `final.log`: after correcting only the malformed test block, three full owning files **23/23**, exit 0, no fail/cancel/skip/todo, TAP 3595.28375 ms. Commands: `node --test extension/tests/application-selection-editor-safety.test.mjs extension/tests/application-selection-consumer.test.mjs extension/tests/settings-sync.test.mjs`.

New cases assert source tables and local control byte-equivalent before/after refusal, no new source marker, no reload, existing pending marker/control unchanged on denied continue, and successful original safe cancellation. Another case obtains a genuine selected backend receipt and proves it still cannot authorize extension reload. UI cases cover every selection phase, direct hidden-button callbacks, bilingual warning, cancellation double-click/unknown result and late response fencing. These prove unconditional refusal without a cross-page proof; they are not a simulated successful cross-page handshake.

Previous d0189 37/37 and 20/20 consumer behavior is historical, not current activation qualification. No native, build, cloud, real accounts, paid API, scale fixture or installed-extension operation ran. General unjournaled inheritance, reverse preservation and a genuine cross-page freeze/retention owner remain local engineering work.
