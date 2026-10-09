# TOPIC-05.7 saved-summary native touch completion — PR225

This is a **test-driver native input completion repair**, with a bounded diagnostic extension. It changes no production UI, persistence, provider, permissions, CI or version. It does not establish the unique cause of the historical hosted failures.

## Exact candidate

- Author base: `de591f3f0bb9219e827c94d02382ab95b0b95561`.
- Tested code: `2a5155519537b6a7481e6d0b9fbcd196143a2087`; tree `6101a1741b4543e18c9b265d2912bfe17d871d6c`.
- Sole code change: `tests/uir-03-ai-presentation-chrome-e2e.test.mjs`, 4 inserted / 3 removed lines. SHA256 `1650157e43c4197b8bfe33e445018a821c10164493ebb1054ae6382635488a06`.
- This receipt is a later documentation-only addition. It does not imply that a later integrated head or main has passed full certification.

## Preserved hosted evidence

PR225 Full `37884325923` at `de591f3f` completed **FAILED**. Its only failing primary browser shard was Browser5: `TOPIC-05.7 cached A never conceals new durable B (release)`, `Space restores disclosure after trusted touch`, actual false / expected true. The corresponding source case passed. The recorded cloud browser was Chrome `154.0.8037.97`.

The diagnostic timeline records a trusted touch click toggling the native disclosure from open to closed, then trusted Space keydown/keyup with no default prevention, summary/document focus intact, the same connected summary and no recomposition. No native keyboard click follows. This timeline did **not** record `:active`, so it cannot establish that the native activation overlap demonstrated below was the unique cause of that hosted failure.

Raw log `/tmp/037-back-repair-browser-5-failure.log`, SHA256 `8058e9a51fa5047fc9f4de88f0a2442837c217b1d583d23e0a03ac6c09d7e383`, remains failed. Reader Browser1 in the same run completed **89/89 PASS**, including the original VS04 undo case; `/tmp/037-back-repair-browser-1-success.log`, SHA256 `530a2cd384d4b7682dc1af5a2694a66129f42d10e193261a8b65d55872ea5b43`. Eight primary browser shards, including Reader Browser1, and all four unit shards passed according to the coordinator's final run readback; aggregate certification remains failed.

The two earlier PR225 Full runs `37878399910` and `37880915206` retained their different Reader failures. They are not relabeled by this repair. Earlier PR223 Full `37868395189` retained the same saved-summary assertion failure as documented in `TOPIC-SAVED-SUMMARY-PR223.md`; its passing local micro and owning-file runs did not prove a repair. This receipt does not replace those records.

## Actual native counterexample and control

An isolated headless Chrome `154.0.8037.99`, temporary profile and network-blocked bare native `<details open><summary>…</summary>…</details>` demonstrate a finite input-lifecycle counterexample without PAIA code. The script injects genuine CDP touch input and Playwright native keyboard input. It does not assign `open`, call a DOM click, prevent native events, move virtual time or add a custom activation handler.

After the touchEnd command completes and the disclosure is visibly closed, the summary can still match `:active`. In the counterexample, a genuine Space keydown is issued in that state. The script waits for the browser's actual `:active` state to clear and then sends the genuine Space keyup. All key events remain trusted, `code: Space`, `keyCode: 32`, not composing and not prevented, with summary focus intact. There is no native keyboard click and the disclosure remains closed. The original strict `Space restores disclosure after trusted touch` assertion throws **ERR_ASSERTION, actual false / expected true**.

The control waits for actual touch activation to become inactive **before** issuing the original Space press. The original assertion then passes, with a trusted native keyboard click and the disclosure restored to open. Each mode runs once. The counterexample deliberately holds a real key across the browser's native activation clearing to demonstrate the mechanism; it is not a claim that the cloud timing was reproduced spontaneously.

Strict scratch oracle: `/tmp/saved-summary-bare-native-active-clear-strict-oracle.mjs`, SHA256 `0b8e6a46012f5a91560065352a160352f0a0548cb517467423c603f354a7fc47`. Execute `node /tmp/saved-summary-bare-native-active-clear-strict-oracle.mjs` in the authorized isolated headless environment. All event-condition deadlines are 14,000 ms. Its exit 0 requires the expected original assertion failure in the counterexample and the original assertion passing in the control; it is **not** a two-case production PASS.

Strict log `/tmp/saved-summary-bare-native-active-clear-strict-oracle.log`, SHA256 `b05b61f4fbe7016f2029396e86c3c02ddd02a2acc11a63ac34ff7d0e28f16523`, records counterexample **0 PASS / 1 expected FAIL** and control **1 PASS / 0 FAIL**, process exit 0. The earlier non-strict observation remains at `/tmp/saved-summary-bare-native-active-clear-oracle.log`, SHA256 `4a59d307ccfb459a95be2f06b05ae57f3a1c1520ebd259f2aa4b708098a7bdf2`.

Earlier probes are retained, not promoted to repair evidence: `/tmp/saved-summary-bare-native-probe.log` contains the initial sandbox launch failure; `/tmp/saved-summary-bare-native-probe-isolated.log` contains a public touchscreen probe fixture error (missing touch-enabled context) after passing raw-input modes. `/tmp/saved-summary-bare-native-synchronous-probe.log` contains non-reproducing raw/toggle-event modes. `/tmp/saved-summary-bare-native-key-overlap-probe.log` establishes the still-active native state after touch, but its passing cases alone are not the counterexample. Attempts to read Chromium source did not return source contents; the mechanism claim above relies on actual native observations, not unverified source inference.

## Minimal owning test repair

The existing touch `eventually` predicate now requires both the original toggled disclosure state **and** `!summary.matches(':active')`. An explicit assertion verifies inactive native touch completion before starting the separate Space action. This is a stricter precondition in the same existing 14,000 ms event deadline. There is no new sleep, delayed retry, timeout extension, synthetic click fallback or direct disclosure-state mutation.

The original exact Space restoration, focus retention, trusted touch click, geometry, clipping, saved data and no-write assertions remain. All original ten tests remain, including both source and built-release variants. The original 180,000 / 300,000 ms case budgets remain. Production native `<details>/<summary>` behavior is unchanged.

The existing 48-event body-free diagnostic ring additionally records native `:active` and Space/Enter-only `code`, `keyCode`, `isComposing`. It does not record other typed characters, text, HTML, IDs or user data. Existing abort/cleanup and error message/stack propagation remain.

## Exact owning verification

One complete final owning-file invocation from the tested code, in `extension/`:

```sh
PAIA_HEADLESS=1 node --test tests/uir-03-ai-presentation-chrome-e2e.test.mjs
```

Result: **10/10 PASS**, 0 fail, cancelled, skipped or todo; process exit 0; **41,146.265375 ms**. The source and release cached A / durable B cases both passed, including enlarged English and Chinese trusted touch → native completion → Space. The existing fixture builds the release and launches real isolated MV3/IndexedDB journeys; no test selection or implementation substitute is used.

Log `/tmp/saved-summary-native-completion-owning-whole.log`, SHA256 `47a5e7c5a3ba0c8ae87297137e334e3177aaad67829dd22d1a1d5cb13f540800`. Syntax check and `git diff --check` also pass. No broad suite or cloud workflow was rerun by this author. No user window/profile, paid model, cloud account, upload, install or deployment was used.

Coordinator approved this bounded driver-completion direction before the code change. Independent final diff/oracle review and normal integrated-head certification remain with the coordinator. Hosted repair, current main acceptance and user installation are **not yet claimed**.

## Independent coordinator approval

Root read the full4-add/3-remove test diff and both strict native oracle script/log. The exact original touch/Space/focus/body/privacy assertions and14s event/180s–300s case budgets remain unchanged; the added inactive predicate and assertion strengthen native action completion. Independent original cachedA/durableB source/release cases2/2 PASS10501.389417ms, zero failures/skips/cancellations, `/tmp/saved-summary-native-completion-root-related.log`, SHA-256 `6acc59257cbb7a3b517537e40f4719a6283fc87ace453cfde07d250c45e8c1d6`. This targeted two-case run is distinct from the author whole10/10. Root APPROVE only the driver completion and evidence; no production change or uniquely proved historical cloud cause. One new stable final integrated-head hosted Full remains necessary.
