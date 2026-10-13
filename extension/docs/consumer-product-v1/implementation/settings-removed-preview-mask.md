# SET2 removed-content preview preference

The approved PRE_REFINEMENT Settings plan section3 requires the existing hide-content-preview preference to cover removed-content excerpts. Actual Input, Entry and removed-placement summaries in the composite detail and retained typed list did not match the original mask. The same Chrome test fails against the old runtime and passes with this change.

The original html.paia-hide-content-previews owner now masks only explicit summary wrappers. Topic/Section names, restore/history controls and unknown/error feedback remain available. No new preference, writer, data format or recovery path is introduced. Excerpts are not moved into title or aria attributes. Confirmed preference changes and locale updates preserve the same controls and original text.

Author and independent six whole files:46 PASS each, zero fail/cancel/skip. Real Chrome module/CSS probe covers three types OFF/ON/OFF. Exact Source and standard release additionally pass the actual four-kind Settings dialog, native capture/removed data, persisted ON, live English, OFF/ON with stable nodes, original placement recovery, reload and320px layout. Source records and Context permissions compare unchanged; zero external requests/runtime errors. Standard503-file release guard passes.

Frozen production: settings-details63c6d71a2b02ccba217fd4de29ce2d5bca1e8a50, settings-removed-list3e1eebbc8affda96e85af42999b278d189cbbb37, r6.css4d463aa5cdb75f34f76ef6c1f491460a57b2e86f. Packets PR284-REMOVED-PREVIEW-MASK and PR284-REMOVED-PREVIEW-NATIVE retain old-runtime failure, sandbox launch failure and all checks. First composite browser oracle used innerText for generated CSS content and failed; corrected to native computed ::after content, preserving strict hidden-body and unchanged-data assertions without raising timeouts. Locale fixture focus now selects the original restore button rather than its old child position; existing behavioral assertions remain.

This candidate is not merged or installed; full exact-head and latest approved visual gates remain. All Canonical plans, paused Sync and Pro CI ownership remain.
