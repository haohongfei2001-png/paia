# Smart Filter Diagnostics v0.6.1.1

## Scope

Internal diagnostics/queue correction on top of frozen f3fa0e7. No daily installation or private IndexedDB access during development. The approved Light grammar, provider registry, presence collector, Source/Input text and time semantics remain unchanged.

## Confirmed defects and repairs

1. v0.6.1 initialized filterInputs.pendingKey=1 for legacy rows. The queue index selects pendingKey=0, so Light could show an empty recent list without ever checking history. New rows start queued. A one-time diagnosticsVersion=1 metadata migration repairs missing/unexamined/failed/stale rows, preserves valid decisions and does not invent missing authorship or attachment evidence.
2. Four batches per external request could leave a remainder until a later request. FilterRunner now processes 50-row batches and yields between batches, persists pending work, starts on worker startup/installation and resumes on accepted activity. A coalesced wake flag handles capture arriving during shutdown. MV3 termination still stops execution; the next worker start resumes persisted work without requiring the recovery button.
3. Recent-filter pagination could return no valid rows on the first page because its indexed rows were all removed. The UI now follows empty intermediate pages before deciding that the list is empty.

## Settings contract

The read-only FILTER_DIAGNOSTICS command is limited to trusted extension UI. It returns exactly active, checked, pending, keep, filter, uncertain, userProtected, failed, mode, filterRatio, filterVersion, policyVersion, classifierVersion, lastCheckedAt and taskState. Values are numeric or fixed enums. lastCheckedAt is the local task check timestamp (Unix ms); 0 means no completed task check. No original text, editable text, title, URL, source/message ID, hash, raw exception or diagnostics cursor is returned.

Active excludes user-removed and branch inputs. Active = checked + pending; checked = keep + filter + uncertain. User protected is a subset of keep, including explicit source keep intents. Failed is the currently failed subset of pending, not a cumulative failure-event counter. Filter means a valid effective Light decision even when mode is Off; Off never clears the stored decisions. Ratio uses all active inputs as denominator.

Counts are scanned in at most 100-row read transactions; pending writes may run between them. A mutation counter rejects mixed snapshots and retries up to three times. Under ongoing changes the UI reports that statistics are temporarily unavailable rather than showing incomplete counts. No aggregate body copy, separate tracking database or private report file is created. Settings polls every two seconds, with one request in flight; ordinary document reading does not poll diagnostics.

Task status is idle / running / paused / failed. Off displays paused. Failed batches remain pending and visible, with fixed failure state only; worker recreation or explicit recovery can retry. A terminated worker's completed running marker is normalized to idle on its next wake. Capture is acknowledged independently of queue completion; both evaluation and aggregation yield between bounded batches.

The low-frequency recovery action uses the existing resumable metadata pass and preserves valid cached decisions. It repairs missing rows, old unexamined flags, stale versions/revisions and failed work. It does not restore user-removed content, clear a tombstone, change user text, or force protected/unknown inputs to filter. Normal initialization and continuation are automatic.

## Migration and boundaries

Physical IndexedDB remains v4; legacy control schema6 and Smart Filter migrationVersion=1 remain unchanged. diagnosticsVersion=1 is additional Smart Filter metadata, not a Source migration. No permissions, host scope, CSP, model, network, Organizer or Memory changes. The two new commands are subject to the same trusted-UI gate; webpage/content/external callers are rejected.

Old metadata remains conservative: history with insufficient evidence is checked as uncertain, not promoted to safely filterable. An empty list therefore cannot establish that history had no control inputs; the new counters distinguish unexamined from examined-but-uncertain.

## Verification

Tests cover legacy enqueue, exact v0.6.1 bad row shape, worker/failure recovery, counter partitions, removed and protected inputs, cached Off/Light/recovery, partial recent pages, specified zero-result text, synthetic capture during queue processing and shutdown, sanitized response fields and byte-identical rule/privacy boundaries. Full regression also exercises legacy migration, revisions, tombstones, time, capture, import and 1k/10k/100k storage performance. All browser work uses isolated synthetic profiles. Final results are recorded in outputs/v0.6.1.1-acceptance.md.
