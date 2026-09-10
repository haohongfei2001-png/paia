# v0.11.1 Thought Library reading closure

Baseline: 22111fa / checkpoint-v0.11.0-intelligence-optimization. Independent worktree; no private profile/database access. Headless synthetic acceptance only.

## Audit and reproduced cause
`archive.js` subscribes every local storage write to whole-page refresh and polls every 15 seconds. `ThoughtWorkspace.refresh` unconditionally calls `beginLoading`, including retained data. Home rebuilds every tile with `replaceChildren`, replaying CSS animation. AI reading replaces the heading before checking the cached revision. Search, ordering and presentation call `leave`, disposing editing sessions. Metadata status, organizer counts and actual document changes share the same refresh path.
Synthetic baseline: one unrelated local status write caused 1 loading transition, 7 direct list mutations, and changed first tile identity (reproduction.txt).

## Contract
Initial loading only without a route snapshot. State-only changes do not read documents. Real content invalidation uses generation fencing and keyed DOM reconciliation, retaining unchanged nodes and live editors. Success is quiet. Reading home is title, presentation toggle, search, naturally ordered topics. Organizer actions move to Settings. Entry body is the editable product field; nonempty legacy titles remain compatible and lossless, invisible to reading UI. Section headings and a collapsed outline remain. No new Provider call, automatic retries, permissions, Source changes or destructive migration.

Sorting: meaningful content time strongest, latest actual read next, seven-day decayed bounded access weight weak; deterministic id tie. Pin metadata preserved but ignored by the new home. Read metadata is local, background-written, bounded and independent of content revisions. Unplaced content is a nonempty-only final entry.

## Follow-up
Topic formation may create overly small topics. This release does not auto-merge, rebuild or change their identity.

## Source acceptance
Full serial headless suite 1028/1028 passed with zero failure/skip and current-source audit. Home and Topic each passed 60-second idle status-change checks with zero document reads, loading transitions or DOM mutations. Real insertion retained focus/selection/scroll. Search/sort/toggle and delayed stale-query tests passed. Frozen v0.11.0 same-identity upgrade and legacy backups passed. Exact artifact and daily deployment receipts are recorded in V0111_ACCEPTANCE.md after release validation.

## Implemented architecture and compatibility
- Storage-only updates no longer refresh Thought documents. Typed `ARCHIVE_CHANGED` keeps content invalidation separate from preference/read events; the 15-second global poll excludes Thought Library.
- Refresh is single-flight with a queued invalidation, request serial guards and retained route/home snapshots. No loading delay was added. Search invalidates an older request immediately, before its existing input debounce.
- Keyed Topic tiles and Section/Entry reconciliation retain equal DOM and editor instances. AI and original presentations have separate retained panes; switching flushes drafts and changes visibility before the local preference write, with rollback on failure.
- Autosave keeps fields/CAS, IME, revision, undo, failure and provenance safety. A source update also refreshes an expanded provenance panel. New Entry UI has only body; legacy title text remains in compatibility DTO/revisions and old restore, but ordinary reading/search labels/export do not display it. Empty titles are omitted for new manual/Organizer records and new backup entries. Existing database rows are not destructively migrated.
- Home reading order uses the latest nonempty body update from the existing bounded count maintenance. Topic rename, pin, notes and reading do not reset that timestamp. Reading recency expires after 28 days; a bounded weight decays with a 7-day half-life and falls to zero below .01. Deterministic id breaks ties. Reading activity is local derived preference metadata and excluded from the domain backup; body times are retained or rebuilt. Unplaced content is a separate nonempty-only entry after the grid.
- Physical/logical schema unchanged. Count caches are derived and rebuilt lazily under a new cache key. Migration assertions compare every existing domain field and exclude only this regenerated cache. Unexpected nonempty legacy title is explicitly seeded in the frozen v0.11.0 upgrade test.
- Settings owns explicit single/bounded original updates, bounded AI updates, merge suggestions and pending output review. Original/AI request budgets and cancellation are unchanged; ordinary success is quiet.

Feature freeze: 2026-09-08 22:38:30 UTC (implementation complete; subsequent work limited to regression fixes and release validation). Prior E2E fixtures now create legacy empty Topic/standalone data through preserved test RPCs; deleted Home entry points are not reintroduced for tests. Organizer interaction tests use the real Settings buttons. No skipped assertions are used to conceal runtime failures.
