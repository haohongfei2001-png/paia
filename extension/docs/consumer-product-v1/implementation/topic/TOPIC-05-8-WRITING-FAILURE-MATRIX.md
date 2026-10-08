# TOPIC-05.8 compact writing failure evidence

Base: `5e995c25e2356686efaabcff4cb95f6d2f7a3abf`. This is a test-only local follow-up, not a runtime repair, complete 05.8/06 acceptance, hosted certification or installation. No CI/version/data/schema changes.

The existing `topic-section-writing-chrome-e2e.test.mjs` retains both whole source/release cases, the original 90-second budgets and every preceding assertion. An added segment creates actual long mixed-script Topic/Section names, reloads the existing strict fragment, checks the real Section heading and actual Topic context, then uses the existing generic selected-Section copy. Canonical §7.6 does not require a new Section-name label inside More.

At 320 CSS pixels/dark/reduced-motion, the production worker's actual `operationReceipts.put` throws once. The existing repository aborts the canonical transaction; the real worker returns the error. Evidence checks the exact failed operation, full unchanged Entry/placement/Source snapshot, same literal textarea and Unicode draft, unchanged Topic and Section identity, visible unsaved status, native keyboard retry with the same operation/payload, exactly one new Entry placed in the named Section and unchanged original Source. The original header invoker regains focus after success. No fake successful RPC, sleeping, retry loop, timeout enlargement or runtime bypass is used. The two temporary test hooks are restored in finally.

Final whole-file headless result: **2/2 PASS**, zero failed/skipped/cancelled, 12.90577225 seconds. Log: `/tmp/topic-writing-failure-matrix-final.log`. The default existing source/release journeys remain within these two cases. Runtime files are unchanged from the base.

Failure history is retained, not counted as product fixes: `/tmp/topic-writing-failure-matrix-first.log` failed both new fragment-arrival preconditions because same-document hash navigation did not load the new owner; the fixture now follows the original file's explicit fragment plus reload path. `/tmp/topic-writing-failure-matrix-second.log` failed before the asynchronously read Topic label arrived and assumed trailing whitespace survived canonical normalization; the fixture uses trimmed names and the existing bounded wait for actual context. `/tmp/topic-writing-failure-matrix-third.log` incorrectly required More to show the Section name; coordinator review of §7.6/7.8 rejected that invented UI requirement. The final test verifies the long actual heading before writing, generic approved destination text during writing, and exact request/placement Section identity. No preexisting assertion was removed.

Actual release viewport image reviewed: `extension/work/qa-topic-writing/release/compact-save-failure.png`. The focused Save button and complete unsaved message are visible without horizontal overflow. The long Topic heading extends above this scrolled viewport, so this image is not claimed to show the entire heading simultaneously; the actual heading text and overflow checks are separate evidence. No 44px coarse-pointer or whole-page 200% claim is added by this segment; earlier matrix checks remain.

SHA-256:
- test: `c58601877cc227cb79a2065c28ac0c854318618ee17f433d169ba69078cf3fd2`
- unchanged ui/topic-actions.js: `fa2d16b16effbb1a8719683af5651e1cf9fcbb6171cb6c542d4c7a0bfce8ff3b`
- unchanged ui/topic-workspace.js: `b29fd996f058503a754efccef8f2339bff2ae4d5ecefd8efa97c894ea882655a`
- release viewport image: `e6d7c3dcba822d36373326ca1331cdfc6ddd129a558e5b7bd17ef00171f107f0`

Independent review by settings_review: PASS. Reviewed actual transaction-abort injection, exact operation and snapshot assertions, same draft identity, exact retry/Section placement, fixture cleanup, preserved original budgets/assertions and evidence limits. The reviewer did not repeat the browser run.
