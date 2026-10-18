# AI-COST-06 — Full native Settings and private Assist loader repair

Date:2026-10-18. Test-only successor to the failed Full39175581389. Actual browser execution on these changed files remains pending. No production runtime, model/permission gate, timeout or original lifecycle assertion changes.

## Actual failures and bounded replacements

- Browser3 Source/release failed at ai-assist-native.mjs:18 with Runtime.evaluate Uncaught, before the private Assist lifecycle. The fixture still replaced an old export-class declaration and evaluated the current ESM wrapper as a classic isolated-world script. A new deterministic test extracts and executes that exact loader span; it reproduced SyntaxError:Cannot use import statement outside a module. The fixture now loads the complete original content/assist-result-runtime.js bytes and aliases its existing PAIAAssistResultController global. It does not rewrite the controller or inject a grant. The new test proves the alias is the exact same function used by the current ESM wrapper. All real IndexedDB singleflight, original Condition/Context/selection/IME/draft/UNKNOWN/revoke/no-Send journey assertions remain unchanged.
- Browser1 nib-v4-settings-entry:228 and Browser5 settings-next:34 still required browser-session-only copy. Current approved automatic Settings explicitly persist the preference while requalifying each opportunity. Both exact text assertions now require that full source-owned explanation. Independent capture pause, native confirmation/cancel/focus, disabled read, storage-failure, accessibility, Source/release and no-network assertions remain.
- The same original actual browser restart journey now requires the enabled v2 preference to survive, its live generation to change, and the persisted three-field metadata row to remain exactly unchanged. This retains the restart boundary instead of deleting the test: previous live reply authority cannot survive restart. No historical reply/body is persisted or authorized by this preference.

## Verification and limits

The loader test was1/1 actual RED before the fixture-only change. The changed loader plus original private session and Settings Next owner suites pass66/66, zero failures/cancellations/skips. All three changed native JavaScript files pass node --check. The original 120000ms lifecycle and90000ms Settings limits and leaf assertions are retained; no browser or Chrome retry was run locally. The following exact saved-head Source/release run must establish the native result; earlier automatic3/3 and Full failures are separate identities.

The complete thirteen-leaf Stage3A independent-frame migration is a different subsequent checkpoint, not part of these five paths. Source snippets and exact before/after hashes are in this freeze manifest.
