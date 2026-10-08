# SET2 removed-list product locale

Base: `5e995c25` on independent branch `codex/settings-removed-locale-20261009`. This is a follow-up to the frozen 0.28 candidate, not part of its already recorded evidence or a release claim.

## Scope

Only explicit product leaves in SettingsRemovedList are translated: restore/history/more buttons, the Topic removal explanation, empty-list text and the empty-Entry placeholder. Entry bodies and Topic names, including names identical to a product label, remain unchanged. The existing resolved language event updates leaves in place. It does not rerender or read the list, invalidate its generation, change cursors, reset pending controls or allocate a new operation ID. No shared preference writer, storage, schema, recovery command or route owner changes.

Restore failure/unknown-ACK behavior remains with the existing checked/error owner; this batch does not claim to localize global error/status messages. Existing independent Topic/Entry actions and pagination semantics remain. This is not complete Input/Placement recovery, paginated removed Topics, a new recovery engine, or whole SET2 completion.

## Actual evidence

- `/tmp/settings-removed-locale-before.log`: three actual TopicController negative cases failed before the fix: English list open, held page language switching, and held/unknown restore language switching. Original failure retained.
- New four-case complete owner file covers those three and separate Topic-name/empty-placeholder ownership. Held pagination preserves the same row, pending promise, cursor, disabled control and focus with no extra read. Held restore rejects duplicate clicks; after unknown ACK, the same unchanged request/operationId is retried across language changes. User text is not translated.
- Existing removed-list ten-case file retains every late-read/ACK/current checked conflict/error/duplicate/cursor assertion. Its minimal document fixture only gained the standard addEventListener method required by the production language event.
- Final five complete unit files (`settings-removed-list`, `settings-removed-locale`, `settings-consumer-local`, `settings-backup-session`, `settings-history-locale`): **38/38 PASS**, zero failures/skips/cancellations, 72.518 ms, `/tmp/settings-removed-locale-related.log`.
- Original complete Data native file: **1/1 PASS**, 36.268 s, `/tmp/settings-removed-locale-native.log`, with source, empty-profile restore and fresh isolated release journeys. Source and release both retain all original durable recovery/privacy/CAS oracles and now switch zh→en→zh during a real held pagination response and a real worker restore whose ACK is held. Node identity, disabled state, focus and user text remain unchanged; switches make zero RPCs and retain one held request. The existing late-ACK newer-list protection remains asserted. Original 300-second budget is unchanged. Headless, explicit matching Playwright 1.63.0; synthetic local content only.
- Package audit: **12643 checks / 381 runtime resources PASS**, `/tmp/settings-removed-locale-package.log`, including the new copy module. Static audit is not installation/live-provider evidence.
- Root independent runtime/copy review **APPROVED**, actual two complete owner files **14/14 PASS**, 64.056 ms, `/tmp/settings-removed-locale-root-review.log`. Product leaves only; no cursor/generation/operationId mutation or RPC on preference events. Diff check passed.

The runtime and Data native test bytes stayed fixed throughout the native run. The only later test addition is the fourth owner test for exact-name/empty-placeholder separation; the final complete unit run covers it. No repeated native run was necessary. No CI/version/public STATUS changes or push.

## Final bytes

- `ui/settings-removed-list.js`: `152634a5e190028ff1a2c412c9f30305e601724b4c2983a16ac62454c5ca4170`
- `ui/settings-removed-copy.js`: `542ed522116301b5d321525a687a76c8573f69f3342d2394d07bb3331c875ca3`
- `tests/settings-removed-locale.test.mjs`: `36c5637d02907ac16a5b5080498830ed6749c4b972dabc26d7336d367de04d63`
- `tests/settings-removed-list.test.mjs`: `a4bd5974f219a9d632c9edfe10a777f1d7ca39059a7e04f0dd0ecea6d90d70b5`
- `tests/uir-04-data-chrome-e2e.test.mjs`: `1c6f215313621638dc774da8b63daef815c5bc0fde65d0ce804d7b7982dfb145`
