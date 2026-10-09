# TOPIC saved-summary touch/Space — PR223 diagnostic observation

Candidate test commit `824b713236a1a1fa7b2b48c6c608cfef0b031989`, tree `c48feaaafb44bb0c2dfd64465e50ee6cb5d4aec2`, author base `1b36d7e6ecd266a8f3cbbc9d1f9684e3e701c175`. Only the owning original UI browser file changes. **No saved-summary product cause or runtime repair is proven; the original hosted failure remains FAIL.** No AI/SYNC/Settings/CI/version/runtime changes are made by this author.

## Remote failure and safe evidence

PR223 original Full `37868395189` failed; sole primary Browser5 job `113620530622`, `uir-03-ai-presentation-chrome-e2e.test.mjs`, cached A/durable B release assertion **Space restores disclosure after trusted touch**, actual false / expected true. Source corresponding case passed. Browser5 recorded 32 PASS / 1 FAIL, owning file 9 PASS / 1 FAIL, no skips. Test merge `f4964f47` as recorded by coordinator is a separate tested merge identity, not this author checkout.

Artifact `11589178212`, `work/035-browser5-evidence.zip`, 18,093,695 bytes, SHA256 `43f9acdf567dc3082d27059155cd25d211e2e1a56b2623164413a9cf93d8740c`, was extracted into `/tmp/paia-035-browser5-touch-evidence` with path traversal and symlink rejection. Release durable-B viewport and enlarged English summary screenshot exist; release enlarged Chinese summary screenshot is absent. The release English touch/Space loop therefore completed, and the failure occurred before the second-language screenshot. That locates the failing stage without inventing a focus, browser-default-action, compatibility-click or transition cause. Raw coordinator log `work/035-browser5-failure.log` retains the failed assertion. Previous console-only metadata was discarded by the custom reporter, which filters test:stdout.

## Actual observations and current change

An isolated actual native micro uses the original saved UI, real coarse-pointer CDP emulation, trusted touchStart/touchEnd, original summary native Space, enlarged text and repeated English/Chinese preference changes. **40 iterations PASS**, `/tmp/saved-summary-touch-micro-before.log`. Script `extension/work/saved-summary-touch-probe.mjs`, SHA256 `aa25c83dd77d3e5ded3603432e0cc7ea18d0bc3c7328eb0dc227c879dc503964`, is private synthetic evidence and not a new committed test or production hook. This simpler micro did not reproduce the full hosted sequence; it does not establish root cause or hosted repair.

The owning helper now installs abortable, bounded **48-event metadata only** diagnostics during the same real interaction. Native focus, touch/pointer, click, keydown/up and details toggle observations retain trusted/defaultPrevented, open/focus/document.hasFocus, DOM identity/connection, target/active tag and recomposition state. Only Space/Enter key values are retained; no other key characters, label/body text, HTML, element IDs, archive data or user material are collected. No listener prevents defaults or alters action order. Existing touch-trusted, exact opened state, immediate Space restored state, focus, geometry, clipping and native action assertions remain unchanged; no extra wait, timeout or retry is added.

On failure the original error is preserved/rethrown with bounded metadata appended to **both message and stack**. The original actual/expected/code/operator remain intact. Finally aborts all diagnostic listeners before normal style/CDP cleanup. This makes diagnostic data visible through the existing custom reporter's stack/message path rather than console-only output.

A controlled isolated Node reporter proof deliberately fails the same assertion pattern and verifies that `scripts/test-report.mjs` outputs both `false !== true` and body-free diagnostic metadata: `/tmp/saved-summary-custom-reporter-proof.log`. The controlled test's expected exit1 is a **serialization check, not a production browser failure or pass**; its generated summary was moved to `extension/work/saved-summary-diagnostic-reporter-proof-summary.json` to avoid confusion with full-suite evidence. No reporter/CI file was changed.

## Final exact-file evidence and limits

Original complete owning browser file: **10/10 PASS**, 0 fail/skip/cancel, 41,124.488583ms; `/tmp/saved-summary-touch-original-diagnostic.log`. Source and release both English/Chinese trusted touch→Space cases passed. Exact file SHA256 `2354d5309c29559103e1eb08713f91fb56b83fbf062d1d6e2aabfa2a4c0e1ec9`; no bytes changed after this run. This is a local diagnostic-candidate observation, not reproduction or repair of the historical cloud failure.

Package guardrails **13,421 / 401 runtime resources PASS**; development privacy/permission/network audit PASS. Runtime resources, dependencies, original 180s journey budgets and assertions are unchanged. No visible browser, paid call, user profile/window, installation, deployment or new cloud dispatch was used. Independent review is required before Root integrates the candidate with its separately validated Settings cleanup repair and observes the new exact hosted head once.

Unique cloud cause remains **UNKNOWN**. Future failure output will retain the exact body-free native timeline. The original run, skipped/cancelled results and old-version passes must not be relabeled as current certification.
