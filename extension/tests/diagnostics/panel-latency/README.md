# PAIA opening latency diagnostic v2

## Status and scope

Native/browser measurement remains **UNRUN**. No timing, performance improvement, user-machine measurement, physical120Hz or NIB50ms acceptance is claimed. V1 is unchanged in paia-panel-latency-measure-isolated-20261019T0630Z. V2 is a minimal successor package, not production runtime. No local browser retry, protected-path access, remote write or CI dispatch was performed for V2.

Completed locally: JS syntax checks;22/22 evidence-validator contract self-tests;5/5 instrumentation safety self-tests; read-only baseline SHA/anchor check. These are harness-contract tests, not22 measured samples or native PAIA acceptance. See the two SELFTEST output files. Prior startup failures are preserved in STARTUP-ERRORS.txt and run.log.

Baseline owner identity: PR303 c1529ff5169ef2f64bd1943d7f4043eca29570f2, whose Prompt runtime the owner identifies as identical to main e0516f0. No independent remote fetch was performed. Runtime bytes are pinned:
- core/prompt-reuse-service.js:2a619906f846572dd8939e2944647d6c970b731a6d0f80a36f2ff5fc001dc384
- background/prompt-surface.js:ed43a96f6d740aea7921486ea2979673156dec8c4e2804984babbb77473c7117

## Minimal existing-CI assembly

Use only an already-authorized functioning original Chrome CI job, with its existing official Chrome and original Playwright dependency. No package installation, package/lock change, workflow weakening or new test timeout/threshold is part of this package. Reserve an exclusive timing window without competing test workers.

Required package files:
- panel-latency.mjs
- validate-evidence.mjs
- instrument.py
- check-result.mjs (independent output verifier)

Required original checkout: complete extension/ tree, including tests/harness/fake-chatgpt.mjs, its transitive synthetic-device-options.mjs, and tests/harness/prompt-composer.mjs (only isolated-world discovery is imported). The synthetic host uses the supported contenteditable signature; actual ProseMirror is not imported or exercised. This is opening/read measurement, not insertion qualification.

Example shell outline; paths/environment variables must come from the real existing job. This outline has NOT been executed here:

```sh
set -euo pipefail
HARNESS=/path/to/reviewed/panel-latency-v2
RUN=$(mktemp -d "${RUNNER_TEMP}/paia-panel-latency-XXXX")
cp -a extension "$RUN/extension"
python3 "$HARNESS/instrument.py" --extension "$RUN/extension" --check > "$RUN/instrument-check.json"
python3 "$HARNESS/instrument.py" --extension "$RUN/extension" > "$RUN/instrument-applied.json"
PAIA_LATENCY_AUTORUN=1 \
PAIA_LATENCY_EXTENSION_PATH="$RUN/extension" \
PAIA_LATENCY_OUTPUT="$RUN/panel-latency-evidence.json" \
CI=1 CHROME_PATH="$CHROME_PATH" PLAYWRIGHT_MODULE="$PLAYWRIGHT_MODULE" \
node "$HARNESS/panel-latency.mjs"
node "$HARNESS/check-result.mjs" "$RUN/panel-latency-evidence.json"
```

This bounded diagnostic workflow prints only the diagnostic JSON, applied/check receipts, source commit identity, official Chrome version, runner identity and stdout/stderr to its ordinary job log. It does not upload artifacts or cache. Preserve partial JSON on failure; its status remains INCOMPLETE. Do not copy instrumented runtime back into the checkout or production release. No credentials, profile, body dump or screenshot is needed. No paid model, Send or provider request is performed.

The instrumentation script verifies both full-file hashes and every exactly-once anchor before staging any edits. Hash/anchor errors make zero changes. It refuses symlinks/double instrumentation and rechecks files before replacement; staging/replacement errors attempt rollback and explicitly report rollback failure. Instrument only a dedicated temporary copy, never a concurrently written tree. If baseline bytes differ, stop and review/update exact hashes and anchors intentionally; do not drop checks or auto-find an approximate match.

## Designed matrix and fail-closed result contract

Exactly22 ordered samples:
1. 0,100,500 captured Inputs, each with1 first iframe open +5 repeated recreated-iframe opens:18 samples.
2. Prepare-retained opening at500 Inputs:1 sample.
3. Same-frame capsule expansion at500 Inputs:1 sample.
4. Actual future Direct and Family suggestion capsule expansions:2 samples.

Exactly2 suggestion traces, Direct then Family. All stored data is synthetic. Each captured Input has1 Source. There is1 manual Prompt and, at100/500 Inputs,50 historical Families with2/10 members each. Total51 fits the existing64-family matching limit. Direct uses “Reply \"done\".”; Family uses the original saved-manual Family-matcher path for “Explain sorting”, with real prospective reply binding and source qualification. This is a designed matrix, not a report of successful execution.

Checks required before status=COMPLETE:
- Every expected sample identity/order exists; all clocks are finite and ordered; content is observed visible.
- Recreated frames are actually new; click precedes frame init; exactly1 initial QUERY and1 successful snapshot; all3 original read-target fences remain; rows/Source/eligible/Family counts match the fixture.
- Retained frames are the same frame; content predates the click; there is no post-click QUERY. Visibility observation follows the click.
- Each suggestion has1 fresh successful OFFER bound to this new replyId and its unique offerId. Original successful safe PRESENT must refer to the same offerId and prove REPLY_SPAN for Direct or PROMPT_FAMILY for Family. Exact expected capsule text is compared in memory, with only a boolean stored. The Family trace must exercise at least2 original snapshot scans; Direct at least1.
- All observed RPCs complete successfully with ordered clocks. Snapshot and target-check timestamps/counts validate.
- Exactly500 captured Inputs remain; the synthetic composer draft is unchanged; Send=0; unrelated external requests=0; extension network requests=0; provider requests=0; captured browser page errors=[];

Failed validation aborts; no failed action, click, query or provider attempt is replayed. The readiness loops only observe state. No product timing threshold is introduced. check-result.mjs independently rejects an INCOMPLETE or malformed artifact.

Without PAIA_LATENCY_AUTORUN=1, the harness writes READY beside itself and waits for a sibling GO file before measurement. CI should set AUTORUN explicitly. FakeChatGPT startup and fixture preparation occur before the measured section.

## Body-free outputs and interpretation

The artifact contains trusted click, iframe init/DOMContentLoaded, RPC type/start/end/ok/error, first list DOM content, next-two-rAF paint opportunity, snapshot foundation/full scan/Family/end timestamps and page/Input/Source/eligible/Family counts, plus original live-target-check timestamps. It records identity metadata for synthetic OFFER/PRESENT classification, never reply/Prompt bodies.

For recreated iframe samples, use in-page timestamp differences, not locator wait duration. A two-rAF opportunity is not a screenshot, physical display, or proof that opening animation has fully revealed every row. Visible means the original browser locator observation. Existing currentness/privacy checks remain untouched.

For retained capsule expansion, old frame/query/content times intentionally precede the click. Never report those differences as negative latency. There is no fresh QUERY; report sameFrame and no post-click query, with afterClickObserved as an upper-bound observation including polling/settling overhead. Do not compare that upper bound directly with cold DOM timing.

“Cold” means first/recreated iframe in an already-running browser and warm service worker. It is not cold OS/browser/process/worker startup. No worker kill/cache flush is included. Linux headless CI cannot certify the user's Mac, real corpus, physical120Hz or NIB50ms. Large diversity/long bodies/multi-Source Inputs, migration, notification storms and1,000+ Inputs remain separate cases. Six observations per size are a small diagnostic sample, not a statistically strong tail-latency claim.

## Static diagnosis retained

Default orb close destroys the iframe; each open waits for full QUERY. Snapshot scans all Inputs in100-row pages, requalifies Sources/material restrictions, then builds/hashes all Families. A local Family suggestion can trigger a concurrent second snapshot. Source inspection shows the same one-Source records/index keys requested four times per Input within one readonly page.

The narrow optimization proposal remains original-owner transaction-local duplicate-read removal while retaining materialRead restrictions and all live target, consent, generation and preference-revision boundaries. No persistent cache, relaxed permission, retained hidden-frame lifetime change, or measured speedup is part of this diagnostic package.

## Dedicated diagnostic branch

The isolated workflow runs only on the public repository branch `codex/prompt-panel-latency-20261019`, Ubuntu standard runner, Node 22 and the runner's existing Chrome, with a 12-minute job limit and `contents: read`. It does not change an existing gate or production runtime. Original exact direct npm dependency versions are installed from the official npm registry with scripts disabled; the existing extension has no lock, so transitives are not described as pinned. No artifact/cache upload or service activation is included. Native status remains unrun until the exact remote job produces a terminal result.

GitHub's public standard-runner free-usage terms were checked on 2026-10-19: https://docs.github.com/en/billing/concepts/product-billing/github-actions . Any later private-repository or runner change falls outside this diagnostic scope.
