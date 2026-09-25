# VS-04 Editor and Query Contract (CPV1-04.0)

Status: FROZEN for VS-04 engineering. This contract defines the user-visible path and the conditions for future implementation; it does not claim the whole slice is certified.

## One edit owner

A displayed editable library entry belongs to one `LibraryEntryEditor` session, including an entry loaded on demand after a long-content placeholder. The session owns its saved snapshot, local draft, field revisions, current Input revision, undo groups, autosave, recovery draft and leave flush. UI code must register newly loaded rows through `addRows`; directly inserting a partial entry into `entries` bypasses recovery and revision ownership.

The session collects plain text without changing the Source. It debounces ordinary saves, protects an unacknowledged draft before sending an edit, and sends `EDIT_LIBRARY_BATCH` with an operation ID plus expected entry, field and Input revisions. A lost acknowledgement may reuse that operation ID. An external revision may update untouched fields; a changed field with a local draft becomes a conflict and is not overwritten. A navigation or panel close must flush or visibly retain the draft. IME composition cannot be treated as a completed save.

Undo groups are local until saved. A saved undo is a new revision-bound edit, not a silent rollback of Source history; any archive-changing undo requires its existing per-action confirmation. A purge, removal or changed revision invalidates unsafe undo.

## Query and filter boundary

A search request carries the current container/scope and its query generation. Only the latest generation may render or move the Reader position. Search distinguishes an empty result from a partial/unavailable index, and uses exact lexical positioning in the opened entry. Project, time and Source filters apply only where the underlying evidence exists.

Smart Filter is a view over content. Hidden material is still present, can be explicitly shown/compared, and is not a deletion or AI authorization decision. Search-including-filtered must be explicit. Source purge, Archive removal, Topic removal and AI exclusion remain distinct operations.

## Evidence for the batch

CPV1-04.1–04.4 require a direct edit → saved revision → search → reopen/reuse journey with Chinese IME, long text, concurrent edit, navigation and storage-failure cases. CPV1-04.5–04.7 close removal distinctions and the reliability/performance matrix. The real private/device gates in `DEFERRED_FINAL_GATES.md` remain deferred; synthetic browser evidence does not turn them into PASS.
