# Bounded audit repair, 2026-09-30

Base: `368a8ca5065ef8c0ef526be85c667a8389375e95` (main after #104).
This is an owner-authorized repair of six observed boundaries. The Consumer
Product pause and inactive #99 remain unchanged. It is not a new roadmap,
production certification, merge, deployment or extension installation.

## Behavior

1. Recovery admission validates live owner identity and Source tombstones, and
   shares a serialized worker fence with Source purge. Both save/purge orders
   are covered. Ordinary conflicting edits remain recoverable. Purge clears
   cached recovery before deleting Source; cache failure leaves Source intact.
2. Diagnostics are fire-and-forget with one outstanding transport. A diagnostic
   that never responds cannot delay canonical capture or the next status check.
   Capture still checks consent/epoch and requires its durable response.
3. Reader search invalidates results/cursors on content change, keeps the query
   and reading anchor, and rejects late responses and mixed-generation pages.
4. Thought continuation flushes and reads the latest entry once; its quote and
   optional relationship use that same body/revision. Navigation cancels stale
   opening, while ordinary refresh does not cancel the user's own edit.
5. Header actions apply only to the document. Per-entry actions remain attached
   to that entry. Ordinary archive removal stays reversible; Source purge is
   separately confirmed.
6. Source-record export fixes its query/provider scope, verifies the existing
   backup-data generation on each page and after serialization, rejects cursor
   cycles/partial failures, prevents duplicate export and offers a visible retry.
   Existing Source JSON/Markdown formats are unchanged.

## Recovery metadata compatibility

No new object store, index, canonical body, schema version or destructive
migration is introduced. Existing surviving rows record a local-only
`recoveryPurgeRevision`: the earliest editor revision permitted to protect text
following Source purge. Later ordinary revision conflicts are allowed. Existing
purged survivors lacking the field establish a conservative floor on first
successful current admission. Missing/removed targets fail closed.

AI presentation owners can be deleted and reused with a reset revision. Each
new presentation lifetime has `recoveryGeneration`, using its existing unique
request identity; edits preserve it. Pre-existing presentations use `legacy`
until replaced. Old-generation drafts cannot refill a recreated owner's cache.

Backup output recursively excludes both local fields, including revision
before/after images and AI organization state. Empty/replace restore atomically
rotates the local-only `recovery-restore-epoch`; disjoint merge preserves the
existing epoch and unrelated drafts. Failed transactions retain the old epoch.
The trusted worker binds the epoch to every editor read, discarding reads that
cross restore, and the editor never refreshes an old snapshot's token. Legacy
callers missing that snapshot identity fail safely. Recovery rows retain their
local epoch; stale rows cannot load or save after replacement. Successful
replacement attempts physical cache cleanup; failed cleanup is still fenced on
read. Portable Backup content and Source exports do not carry these tokens.

Recovery drafts are bounded local protection, not Source or Backup truth. The
seven-day expiry is enforced by load/save/prune; it is not a guarantee of
physical deletion at exactly seven days while the extension is idle.

## Evidence and limits

Tests use synthetic data and production handlers/services. The before/after
purge reproduction first proves that initial protection succeeds on both
versions, then attempts the same stale save after deletion. Source count stays
zero in both; only the old version reloads purged plaintext from recovery.

The opt-in `PAIA_AUDIT_BOUNDARIES_BROWSER` draft gate runs all cases in the
owning audit, recovery, save-recovery and Reader files on the exact PR head,
with isolated hosted Chrome, offline fixtures, screenshots and sanitized JSON.
Local Chrome remains unavailable because of the previously observed socket
restriction; no alternative route bypasses it.

The existing 120-second historical 10k performance test remains unchanged and
is a known failed local gate. A focused/hosted pass must not be represented as a
complete local unit pass, full historical/Mac/current-live provider acceptance,
private export verification or signed distribution certification.
