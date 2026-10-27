# Working History — latest explicit comparison selection

Status: local source implementation; no browser, native storage or release acceptance claimed.

## Existing product contract and actual consumer

Base is local candidate `2688625c69387cb45235480193d2af84960a783e`, tree
`bcaf849d8281fb63a06bb6ce2b89d9b0b8ed725e`, identical to published 0.55.24
`3d735e6f98fff8cd012543991bb8bceb53fdd99b`.

[D1/Q2.1](desktop-vnext/D1-Q2.1.md), Behavior and P/I/D, requires one inline
Current/chosen-past comparison in the existing ReadingModalHost, late reads
that cannot repaint, Cancel returning to the chosen action, and confirmation
handing one exact prepared request to DocumentEditor. The current UX contract
retains these nonconflicting history, human-work and recovery protections.

The live Archive `showRevisions` consumer calls `appendWorkingRevision` for
Input and Conversation-title history. Its original route/modal token prevents
responses after departure, but does not distinguish two selections inside the
same still-open dialog. A slower earlier selection could append another
confirmation and take focus; another preview could also remove a confirmation
whose restore was already dispatched.

## Finite change

Only `ui/working-history.js` changes production behavior. A weak, modal-local
selection identity supplements the original modal/route predicate. Only the
latest still-mounted selection may show comparison/error, focus a confirmation
or invoke its unchanged restore callback. Removed confirmations cannot perform
new writes or dismiss/focus a later selection. Cancel returns to the exact
invoker without writing.

During an already-dispatched restore, preview actions (including newly
appended history rows) are disabled until its callback settles. Pending preview
completion cannot prematurely re-enable them. The original failure feedback,
retained-draft guidance and disabled failed confirmation remain. Closing the
modal suppresses late UI; **it cannot recall a write already sent to
DocumentEditor**, and does not issue cancellation, replacement or retry.

No new data/write/recovery coordinator exists. Exact prepared DTO/operation
identity, Source text, title semantics, revision/CAS, commit receipts, UNKNOWN
reconciliation, removal intent and IME/draft owners are unchanged. No new
permissions, schema, provider, UI layout, preference or configuration gate.

## Necessary local evidence

The new `working-history-selection-owner.test.mjs` imports the actual production
module with a small bounded DOM fixture and synthetic deferred read/restore
callbacks. Original source fails both new negative controls (two confirmations;
preview admitted while restore pending). An initial incomplete fixture attempt
awaited its deliberately held second preview and was stopped; its log is
retained separately. The corrected negative-control invocation fails 2/2 with
no skipped cases. After the runtime change, the complete new file passes 12/12,
zero failures/skips, 177.99 ms. `git diff --check` passes.

Controls cover out-of-order selection, same-row before/after, retired handlers,
late/current errors, Cancel/focus, departure, already-dispatched write without
replay, pending/new-row controls, exact Source whitespace/Unicode/note/removal
status, missing Source, title restoration and unchanged failed-restore guidance.
Existing store/recovery suites were not rerun or weakened. This local evidence
does not certify real browser focus/layout, persistence/atomicity, physical IME,
installed extension behavior, complete UI parity or whole-plan acceptance.
The coherent integration owns any PATCH increment; this author delta does not
alter manifest/package identity.
