# IAH-1.1 narrow temporary filtered target

Basefc62111 retains the reviewed original-safe range and Input-first result work.
Actual SmartFilterStore tests reproduced two failures: ascending and descending
context reads admitted every filtered neighbour instead of only the target. Five
other negative/compatibility cases passed. The fixture-authoring error and actual
production-negative logs remain distinct and preserved.

The existing read-only page owner now always uses its computed visible ID list,
and only the validated contextInputId may bypass ordinary filtering unless the
caller explicitly requests includeFiltered. Existing wrong-document/excluded/
missing target checks, sort/cursors, readingSnapshot and all filter rules remain.
No storage write, Keep/Protect, body rewrite or global preference change occurs.

Independent runtime review passed. Four whole related unit files32/32 pass,
including exact persistence snapshots, both sorts, explicit show-all, unavailable
and purged targets, and legitimate earlier readingSnapshot visibility. The same
existing complete source/release native file2/2 passes in28.05s: real capture and
filter evaluation, user search with filtered results, native keyboard opening,
Reader target-only exception, Back and ordinary tree opening with filters restored.
Read-only IndexedDB records/blocks/filterInputs/filterIntents/inputStates/revisions
are equal before and after. Original Unicode, presentation and zero-network checks
remain, with unchanged90s per-variant budget. Coordinator reviewed native fixtures.

Logs: work/iah11-filter-reveal-negative.log, work/iah11-filter-reveal-fixed-production.log,
work/iah11-filter-native.log. Native JSON evidence is under extension/work/iah11-results.
This closes only the proven temporary-reveal scope defect. It does not complete
fresh primary navigation, qualified revision/range revalidation, deep offscreen
arrival, origin-aware Back or all IAH-04/05/06 acceptance. Formal version/main and
installed availability remain pending; no cloud/model/permission/deployment action.
