# Guarded Settings category intent — scoped local repair

Base: 510d2c7f5a94367db2411f38ad1017860d9b81d8. One runtime owner: extension/ui/settings-preferences.js.

## Requirement and result
SETTINGS_CONSUMER_V2_PLAN.md §2 retains guarded dirty-feedback work and focus/scroll restoration; the current takeover queue Q3 requires actual entry reachability and failure/draft/Back preservation. During feedback save, a later valid category request previously called the same feedback leave owner while it was closing, received false, and lost to the first request. The presenter now retains one pending original leave result and the latest route parameters. No save retry, persistence bypass, draft drop, new storage or grant was added. Refused leave does not advance the admitted group serial. About admission and Settings hide retire stale route intent; a rejected leave does not cause unhandled promise rejection.

## Exact verification
- Original published baseline, new ten pure VM/original feedback leave-body controls: 6 passed, 4 failed. The original failures cover latest category/directory/history intent and unexpected leave rejection.
- First combined attempt: 16 passed, 1 file setup failure due absent sparse archive.js.
- Second: 16 passed, 1 file setup failure due absent exact route-history dependency input-search.js. Exact base files were materialized locally; no old-content substitution.
- Third: 30 passed, 1 failed because the existing VM fixture enumerated globals without new pendingGroupLeave. Root authorized only adding pendingGroupLeave:null; no assertion/case changed. The production code also preserves the existing refused-leave serial invariant rather than weakening that assertion.
- Final author: all three complete files 31/31, zero failed/cancelled/skipped/todo, 122.179386 ms.
- Independent: same three complete files 31/31, zero failed/skipped, source unchanged; see exact attached review/log.
- Node syntax check passed. No native browser, OS clipboard/email, external network, backend/sync review, Full or spent quota was run. These synthetic controls are not native or whole-plan acceptance.

Files: settings-feedback-navigation-intent.test.mjs (10); settings-directory-focus-frame.test.mjs (6); settings-restore-intent.test.mjs (15). Test invokes extracted unchanged production activation/presentation and original feedback leave bodies with deterministic synthetic DOM/persistence completion, not real service persistence qualification.

## Boundaries
Only one runtime file, one new owning test, one approved existing fixture binding and this scoped report/evidence. Existing settings-feedback/details fixes are separate and not imported here. Held b30b87ac/Context/sync work remains untouched and blocked. No external publication or main modification. Sparse checkout is not a full object audit: independent broad numstat encountered unrelated absent 6fdf245... object; no restoration attempted and scoped source hashes are the reviewed identity.
