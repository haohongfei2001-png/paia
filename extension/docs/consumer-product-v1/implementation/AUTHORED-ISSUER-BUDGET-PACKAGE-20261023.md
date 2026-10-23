# Authored issuer budget and inert provider packaging — 2026-10-23

The integrated Source/release preparation at `838c68e4` found two concrete failures, preserved by the native owner: genuine independent Topic authorization used a separately constructed work budget, and the original package audit rejected four new Google URL literals. Neither was a provider/network result.

LocalMaintenanceSession now passes its already-qualified operation work budget as a frozen third argument to the constructor-owned trusted Topic resolver. It passes no qualification token, body or new authority. The independent Topic issuer must still authorize the original exact scope; separate budget identity and revoked issuer remain refused by the original terminal guard. Existing two-argument legacy callers keep their behavior. This is an internal source callback, not a page or RPC endpoint.

The original package audit now permits only the exact four literal/module pairs in the two inert injected Google modules. Changed origin/scope, duplicate literals, and the same text in another module remain rejected. Required/optional permissions, host permissions, default fetch, account activation and credential behavior are unchanged. This is static packaging admission only.

## Verification

Node22.23.3/macOS, absolute Python3.12.14: four complete owning files (`ai-cost-03-authored-context`, `topic-authored-reconciliation`, `ai-cost-03-placement-topic-reconciliation`, `browser-native-sync-package-guard`) passed **241/241**, exit0, TAP22441.103291ms, no failure/cancel/skip/todo. Three new genuine issuer cases cover shared budget commit, independent budget rejection and independent revoke. The package test runs ten exact/changed/duplicated/foreign-module variants. Original package checker passed **21416 checks /614 runtime resources**.

First109/110 and next240/241 remain failures: the new synthetic issuer incorrectly extended the same epoch lease with Date.now()+60000 per call; the unchanged guard correctly refused it. Fixing the fixture to use one fixed expiry yielded the final result. No production lease rule was weakened. The original native failure/log and subsequent native verification are reported separately; these Node passes do not certify native, Full, Linux capacity or real accounts.

Evidence: `work/paia-takeover-20261023/authored-budget-package-*.tap`, `google-package-corrected.log`, and `authored-budget-package-SHA256SUMS`. No cloud run, model call, browser or build was started by this Node/package check.
