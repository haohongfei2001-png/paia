# Round 8 — Shared working content and direct Input Context

Development candidate on `round8/shared-working-context`, stacked on the verified Round 7 candidate. This round changes data semantics deliberately but does **not** introduce a new IndexedDB schema or another body store. It is not a daily deployment authorization.

## Shared working body

`blocks.libraryText` remains the canonical editable Input working body. A Thought may carry `workingInputId` only when it is an `input_original` backed by exactly one non-context Input dependency and an exact full-body provenance span. New exact Original Organizer results establish that link; an old untouched exact-original Thought may be linked lazily only when its body still equals the current Input and no human body protection exists.

When linked, editing the body in Input Archive or Thought Library writes the same canonical Input body and mirrors the linked Thought atomically. Source records remain immutable. The normal invalidation worker then refreshes evidence digests, version tokens and exact dedupe metadata outside the write transaction. A note-only edit does not rewrite the shared body. Remove/restore invalidates and then reactivates the same linked Thought without reading Source text back into the working layer.

The reverse-write boundary is strict: partial excerpts, multi-input/coalesced Thoughts, synthesized AI prose, context-only evidence, user-created entries and previously independent human-edited Thoughts never acquire a shared link. If duplicate Inputs later coalesce into one Thought, the ambiguous link is removed rather than choosing an arbitrary canonical Input. Source purge detaches retained human work.

Propagation uses provenance as the reverse owner map rather than scanning every dependency consumer, so an Input edit remains independent of unrelated dependency fan-out. Persistent dependency invalidation stays incremental.

## AI Context direct Input path

Memory config gains optional `includeUnorganizedInputs`, default `false`. Missing legacy values backfill to `false`. When explicitly enabled, AI Context may retrieve current unorganized Inputs locally after Smart Filter, removal, Source and per-Input exclusion gates. Direct candidates are never persisted as a new body copy.

An Input with any surviving non-context Thought provenance is never eligible for the direct path. It remains governed by Topic/Profile allow/deny/never and Entry/Section exclusions even if a dependency was temporarily removed and later restored. This closes the obvious authorization-bypass path.

Per-Input exclusions are durable Memory metadata, can be cleared from Settings, are included in Backup, and are deleted when their Source is permanently purged. Activity keeps only IDs and SHA-256 query digests. Share reconstructs current candidates and rejects stale previews. Context drafts and AI synthesis never reverse-write Input or Thought.

## Compatibility and migration

No schema bump is required. `workingInputId`, `includeUnorganizedInputs`, Memory input-exclusion rows and optional activity `inputIds` are additive fields under existing stores. Backup allowlists and integrity checks understand them. Old backups/config rows remain accepted; old independent user work stays independent.

The intentional behavior change is that editing the body of a safely linked exact-original Thought is now an Input working-body edit. Therefore Original Organizer correctly sees one changed Input and may need a later explicit reorganization request. A note-only edit remains free of that delta. Backup round-trip preserves this pending organizational state instead of pretending the checkpoint is current.

## Verification gate

Before this round can reach `main` or the daily Chrome profile:

- shared-body, direct-Context, backup, purge, Smart Filter, authorization-bypass and stale-preview regressions must pass;
- the portable suite must keep the same explicitly documented historical/environment exclusions unless separately repaired;
- real browser journeys must run through GitHub Actions with the actual unpacked extension;
- source/release package audits must pass;
- the inherited existing-database structural gate must still be checked against the user's long-lived archive before daily deployment.

No uninstall, extension-ID change, database clearing or alternate unpacked path is authorized by this round.
