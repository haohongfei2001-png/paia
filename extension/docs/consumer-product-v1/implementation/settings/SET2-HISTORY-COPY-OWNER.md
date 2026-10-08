# SET2 History label single owner

Base `5cba4470`. Narrow local UI correction after the 0.29 candidate; no worker, storage, permissions, CI, version or provider changes.

`settings-preferences.js` retained an obsolete second write to `#history-read`: `读一篇 / Read one`. Group activation and Settings reopen invoke that function without necessarily dispatching the History locale event. Remove that write; the existing `history-copy.js` and History preferences listener continue owning `阅读 Input Archive / Read Input Archive`. No new copy map or listener is introduced.

Negative evidence: `/tmp/settings-history-copy-negative.log` preserves the new actual production-function regression failing on the original Chinese label. `/tmp/settings-history-copy-both-locales-negative.log` executes the exact base function and records both Chinese and English mismatches. The regression uses the existing real History refresh function and production Settings function extracted from its module; DOM is a minimal unit fixture, not a browser or physical-input claim.

Final two complete owning files (`settings-consumer-local.test.mjs`, `settings-history-locale.test.mjs`) **18/18 PASS**, 68.579209ms, `/tmp/settings-history-copy-unit-final.log`. Repeated Chinese/English/Chinese refresh preserves the History label without Settings rewriting its node. Existing History state/failed-read and locale tests remain.

Original unmodified complete `ux-r1-shell-chrome-e2e.test.mjs` **3/3 PASS**, 11.345030833s, `/tmp/settings-history-copy-native.log`, explicit headless Chrome. Original consent, real capture, same-URL/history, reversible Settings, responsive navigation, actual import→Reader and zero-network assertions and time budgets are unchanged. This existing file is a source browser journey, not source/release dual-variant evidence; no release verification claim is added.

An initial shell append used an extra `extension/` prefix from extension cwd and did not edit the test; `/tmp/settings-history-copy-before.log` is the old 13-test run, not negative evidence. A preliminary command named a nonexistent locale test; only the final exact two-file run above is the related-suite evidence. Diff check passed. Integration and final candidate gates remain with the coordinator.

## Exact bytes

- `ui/settings-preferences.js`: `b172f77dfab4f80012b120303ca5c2d211caab6986e45a997a68d15c4aaabc66`
- `tests/settings-consumer-local.test.mjs`: `f92e0fbdbe6bcd5853e3b6e420ca3c32700e9b0372a49481c7613aaa56eb64d1`
- `tests/ux-r1-shell-chrome-e2e.test.mjs`: `369c6196a357da90de37d85c96d688daab2ceecaf0087c341a52b5231a8727c7`

Root independent review APPROVED: narrow duplicate-owner removal reviewed; independent reported run **14/14 PASS**, 60.38ms (`settings-consumer-local` plus requested `settings-consumer-locale`). This is separate from the author's exact `settings-consumer-local.test.mjs` + `settings-history-locale.test.mjs` **18/18** result; counts are not combined.
