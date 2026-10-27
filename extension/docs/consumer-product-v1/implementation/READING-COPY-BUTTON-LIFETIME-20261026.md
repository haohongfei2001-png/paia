# Reading copy button: departure and delayed-result lifetime

## Product gap and authority

This is a reliability repair to the existing copy action, not a new reading
surface or design. Current UX_CONTRACT preserves exact authored text/copy;
AI_CONTEXT_CARDS_V2_PLAN preserves precise copying, failure feedback and safe
leaving. MASTER_PLAN's prior compose/Reader lifetime repairs remain scoped to
those owners and do not by themselves protect other callers.

The real `AIReadingEditor.mountExcerpts` and `TopicTimeline.entryNode`
call `readingCopyButton`. That helper previously awaited a local fresh-body read
and then copied without checking whether its original control was still mounted
or visible. A late clipboard refusal could also create a manual-copy dialog
containing old text after the user had left. No new receiver, clipboard read,
provider, permission, body store or data mutation is involved in this repair.

## Bounded correction

`readingCopyButton` owns at most one current copy/fallback session across its
callers. A newer explicit copy retires the prior session. Original-control
removal, hidden/inert/closed-dialog ancestry, document backgrounding and pagehide
abort the UI lifetime. A single active MutationObserver checks that identity;
listeners/observer/timer are released on retirement. Fresh read failures are
still actionable, and the original current manual-copy fallback remains exact.

The existing `copyReadingText` API and implementation are unchanged; its signal
and current predicate now receive the button's lifetime. An open fallback's
retained textarea is erased when that lifetime ends. A stale read/error cannot
start copying or replace feedback on a later page.

**A clipboard write already dispatched to the browser cannot be recalled.**
Cancellation only prevents not-yet-dispatched copying, a late fallback, and
stale UI feedback. It does not undo or claim to undo an OS clipboard change.

## Local evidence

Original source base: `397d9797ddb28d0a3f54857d4df4d835c7819c2d`.
Only the new `reading-copy-button-lifetime.test.mjs` was executed:

- Two original-source negative controls failed as expected: delayed read after
  departure still wrote the clipboard; late rejection created a stale dialog.
- After the correction, all 11 new cases passed, with zero failure/skip. They
  cover both departure timings, non-recall of an already dispatched write,
  late errors, current retry, exact Unicode/whitespace fallback, hidden owner,
  document backgrounding, newer-copy supersession, detached starts and pagehide.
- The fixture uses a bounded local DOM/MutationObserver and clipboard stub;
  it is not browser, real clipboard, extension, source/release or full-suite
  certification. Historical visual evidence is unchanged and no visual claim
  is inferred from these tests.

The protected release candidate worktree is untouched. Product version is
unchanged in this isolated patch; the integrating owner chooses the next coherent
PATCH version against fresh main. No publication or browser run is performed by
this lane.
