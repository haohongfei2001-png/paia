# PAIA opening latency diagnostic v3

## Status and scope

V3 native/browser measurement remains **UNRUN**. Original V2 ran once in authorized independent CI at head 1eaad3b842dbde0419fbb720d595b0b45862e45a, run 39213242260/job 117931134551. It produced 21 validated samples and 1 Direct trace, then failed waiting for a fresh classified Family capsule. Its status remains INCOMPLETE. That failure and partial measurements must not be relabeled as a complete pass or erased.

V3 preserves the original 22-sample/2-source contract and exact production baseline. Only the diagnostic fixture, its evidence validator and contract tests change. The same production detector, source wording, 64-family capacity, original qualification and timing thresholds remain. Instrumentation and production runtime are unchanged. No local browser launch, protected-path access, remote write or CI dispatch was performed for V3.

Static diagnosis: collapsing Direct to an orb does not retire its live Next candidate. Orb pointer release can schedule the original controller's 850ms resumption while the next 500-Input prewarm query takes around 1.5s. The old Direct can reopen an iframe, whose QUERY begins a new Family projection and temporarily clears the bounded view. A simultaneous Family opportunity can then legitimately defer. This mechanism is consistent with the failure; the first run did not retain failing Family lineage, so the exact cause is not proved.

The narrow correction uses the same actual completed-reply mutation as the original Stage3 native fixture. It verifies the exact prior replyId, waits for the original INVALIDATE acknowledgment of that exact offerId, checks the original authenticated suggestion_current result is null and Next authorization unchanged, then retires the original frame. The next prewarm asserts there is no old frame before or after it. No candidate is inserted, consumed artificially, force-cleared, or retried. Actual sourceType classification and all 22 samples remain mandatory.

Failure evidence now retains actual OFFER/PRESENT/INVALIDATE IDs, sourceType, outcome/error/reason, current prewarm generation, frame/RPC timing metadata, host form and unchanged-draft/Send booleans. These observations are body-free and cannot change the original failed action. Per-observation error isolation preserves earlier metadata if a later diagnostic read fails.

Local contract checks passed on 2026-10-19 at 07:16 UTC: evidence validator 29/29, instrumentation safety 5/5, syntax checks for the three executable JavaScript modules, and the exact original-baseline instrumentation check. These are contract/syntax checks only; they do not execute the extension or establish native timing, the actual failure cause, or product acceptance. Previous versions remain unchanged. The old local browser startup failures are retained in STARTUP-ERRORS.txt and run.log.

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
HARNESS=/path/to/reviewed/panel-latency-v3
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

Upload only the diagnostic JSON, applied/check receipts, source commit identity, official Chrome version, runner identity and stdout/stderr through the existing artifact mechanism. Preserve partial JSON on failure; its status remains INCOMPLETE. Do not copy instrumented runtime back into the checkout or production release. No credentials, profile, body dump or screenshot is needed. No paid model, Send or provider request is performed.

The instrumentation script verifies both full-file hashes and every exactly-once anchor before staging any edits. Hash/anchor errors make zero changes. It refuses symlinks/double instrumentation and rechecks files before replacement; staging/replacement errors attempt rollback and explicitly report rollback failure. Instrument only a dedicated temporary copy, never a concurrently written tree. If baseline bytes differ, stop and review/update exact hashes and anchors intentionally; do not drop checks or auto-find an approximate match.

## Designed matrix and fail-closed result contract

Exactly 22 ordered samples:
1. 0,100,500 captured Inputs, each with 1 first iframe open + 5 repeated recreated-iframe opens: 18 samples.
2. Prepare-retained opening at 500 Inputs: 1 sample.
3. Same-frame capsule expansion at 500 Inputs: 1 sample.
4. Actual future Direct and Family suggestion capsule expansions: 2 samples.

Exactly 2 suggestion traces, Direct then Family, plus 2 exact prior-reply retirement controls. All stored data is synthetic. Each captured Input has 1 Source. There is 1 manual Prompt and, at100/500 Inputs, 50 historical Families with 2/10 members each. Total 51 fits the existing 64-family matching limit. Direct uses “Reply \"done\".”; Family uses the original saved-manual Family-matcher path for “Explain sorting”, with real prospective reply binding and source qualification. This is a designed matrix, not a report of successful execution.

Checks required before status=COMPLETE:
- Every expected sample identity/order exists; all clocks are finite and ordered; content is observed visible.
- Recreated frames are actually new; click precedes frame init; exactly 1 initial QUERY and 1 successful snapshot; all 3 original read-target fences remain; rows/Source/eligible/Family counts match the fixture.
- Retained frames are the same frame; content predates the click; there is no post-click QUERY. Visibility observation follows the click.
- Each suggestion has 1 fresh successful OFFER bound to this new replyId and its unique offerId. Original successful safe PRESENT must refer to the same offerId and prove REPLY_SPAN for Direct or PROMPT_FAMILY for Family. Exact expected capsule text is compared in memory, with only a boolean stored. The Family trace must exercise at least 2 original snapshot scans; Direct at least 1.
- All observed RPCs complete successfully with ordered clocks. Snapshot and target-check timestamps/counts validate.
- Both retirement controls acknowledge the exact old offer, prove null original candidate and unchanged original authorization, retire the exact frame, and precede the next prewarm.
- Exactly 500 captured Inputs remain; the synthetic composer draft is unchanged; Send=0; unrelated external requests=0; extension network requests=0; provider requests=0; captured browser page errors=[];

Failed validation aborts; no failed action, click, query or provider attempt is replayed. The readiness loops only observe state. No product timing threshold is introduced. check-result.mjs independently rejects an INCOMPLETE or malformed artifact.

Without PAIA_LATENCY_AUTORUN=1, the harness writes READY beside itself and waits for a sibling GO file before measurement. CI should set AUTORUN explicitly. FakeChatGPT startup and fixture preparation occur before the measured section.

## Body-free outputs and interpretation

The artifact contains trusted click, iframe init/DOMContentLoaded, RPC type/start/end/ok/error, first list DOM content, next-two-rAF paint opportunity, snapshot foundation/full scan/Family/end timestamps and page/Input/Source/eligible/Family counts, plus original live-target-check timestamps. It records identity metadata for synthetic OFFER/PRESENT classification, never reply/Prompt bodies.

For recreated iframe samples, use in-page timestamp differences, not locator wait duration. A two-rAF opportunity is not a screenshot, physical display, or proof that opening animation has fully revealed every row. Visible means the original browser locator observation. Existing currentness/privacy checks remain untouched.

For retained capsule expansion, old frame/query/content times intentionally precede the click. Never report those differences as negative latency. There is no fresh QUERY; report sameFrame and no post-click query, with afterClickObserved as an upper-bound observation including polling/settling overhead. Do not compare that upper bound directly with cold DOM timing.

“Cold” means first/recreated iframe in an already-running browser and warm service worker. It is not cold OS/browser/process/worker startup. No worker kill/cache flush is included. Linux headless CI cannot certify the user's Mac, real corpus, physical 120Hz or NIB 50ms. Large diversity/long bodies/multi-Source Inputs, migration, notification storms and 1,000+ Inputs remain separate cases. Six observations per size are a small diagnostic sample, not a statistically strong tail-latency claim.

## Static diagnosis retained

Default orb close destroys the iframe; each open waits for full QUERY. Snapshot scans all Inputs in 100-row pages, requalifies Sources/material restrictions, then builds/hashes all Families. A local Family suggestion can trigger a concurrent second snapshot. Source inspection shows the same one-Source records/index keys requested four times per Input within one readonly page.

The narrow optimization proposal remains original-owner transaction-local duplicate-read removal while retaining materialRead restrictions and all live target, consent, generation and preference-revision boundaries. No persistent cache, relaxed permission, retained hidden-frame lifetime change, or measured speedup is part of this diagnostic package.

## Existing dedicated CI boundary

This successor retains the original public independent diagnostic branch, Ubuntu standard runner, Node 22, existing Chrome, 12-minute limit, contents:read, official exact direct dependencies with ignore-scripts, and temporary-copy instrumentation. All complete or failed body-free evidence remains in stdout. There is no artifact/cache upload, deployment, provider, extra permission or runtime change. Native V3 status is UNRUN until its own exact-head job finishes.
