# IAH-1.1 primary Archive entry and ordinary Back

At baseea2024b, both actual source/release fixtures failed because primary Archive
retained SYNTHETIC_NEEDLE after leaving Reader. Primary navigation and ordinary
Back previously passed the same intent to navigate.

Only the explicit primary Library action now passes freshArchiveEntry. The current
navigate owner waits for existing leave/save/IME and supersession guards before
resetting search query/paging/date/source/project/selected target and showing the
blank root. Tree expansion metadata is retained. No alternate router, URL protocol,
schema, private query persistence or permanent scope control is added.

Independent review removed an unnecessary routeStates deletion: fresh entry uses
existing resetArchiveSearch plus explicit empty query and ignores old scroll,
while retaining the old snapshot for existing return consumers. Unit coverage
checks accepted/refused/held/superseded navigation, preserved snapshot identity,
fresh top position and ordinary Back's query/cursor/scroll. Three complete related
unit files15/15 pass. Final complete IAH source/release native2/2 passes29.3s,
including all existing presentation/Unicode/filter-reveal checks and actual
Reader Back restoring query versus primary Archive clearing it. Unchanged90s
budgets and all negative logs remain. Coordinator reviewed the scoped source diff.

This is not full IAH-05/history/reload acceptance: view/document-keyed routeStates
still do not represent complete origin-specific dates/result focus/window metadata.
RouteHistory session loss degrades to empty private query/tree instead of inventing
recovery. Tests using a controlled leave fixture do not prove complete multi-step
browser-history restoration. Further qualified origin/state work remains, along
with deep arrival, selected visual/accessibility, final version and main acceptance.
No cloud/model/permission/deployment or installed-user claim.
