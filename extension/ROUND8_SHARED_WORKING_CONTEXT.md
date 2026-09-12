# Round 8 — Shared working content and direct Input Context

Development candidate on `round8/shared-working-context`, stacked on the verified Round 7 candidate. This round changes data semantics deliberately but does **not** introduce a new IndexedDB schema or another body store. It is not a daily deployment authorization.

## Shared working body

`blocks.libraryText` remains the canonical editable Input working body. A Thought may carry `workingInputId` only when it is an `input_original` backed by exactly one non-context Input dependency and an exact full-body provenance span. New exact Original Organizer results establish that link; an old untouched exact-original Thought may be linked lazily only when its body still equals the current Input and no human body protection exists.

When linked, editing the body in Input Archive or Thought Library writes the same canonical Input body and mirrors the linked Thought atomically. Source records remain immutable. The normal invalidation worker then refreshes evidence digests, version tokens and exact dedupe metadata outside the write transaction. A note-only edit does not rewrite the shared body. Remove/restore invalidates and then reactivates the same linked Thought without reading Source text back into the working layer.

The reverse-write boundary is strict: partial excerpts, multi-input/coalesced Thoughts, synthesized AI prose, context-only evidence, user-created entries and previously independent human-edited Thoughts never acquire a shared link. If duplicate Inputs later coalesce into one Thought, the ambiguous link is removed rather than choosing an arbitrary canonical Input. Source purge detaches retained human work.

Propagation uses provenance as the reverse owner map rather than scanning every dependency consumer, so an Input edit remains independent of unrelated dependency fan-out. Persistent dependency invalidation stays incremental.

A linked-body save and its evidence-maintenance pass are intentionally separate. Read APIs therefore tolerate only a bounded transient maintenance window and retry locally before returning `STALE_BASE`; they do not weaken source/removal validation or publish mixed revisions.

## AI Context direct Input path

Memory config gains optional `includeUnorganizedInputs`, default `false`. Missing legacy values backfill to `false`. When explicitly enabled, AI Context may retrieve current unorganized Inputs locally after Smart Filter, removal, Source and per-Input exclusion gates. Direct candidates are never persisted as a new body copy.

An Input with any surviving non-context Thought provenance is never eligible for the direct path. It remains governed by Topic/Profile allow/deny/never and Entry/Section exclusions even if a dependency was temporarily removed and later restored. This closes the obvious authorization-bypass path.

Per-Input exclusions are durable Memory metadata, can be cleared from Settings, are included in Backup, and are deleted when their Source is permanently purged. Activity keeps only IDs and SHA-256 query digests. Share reconstructs current candidates and rejects stale previews. Context drafts and AI synthesis never reverse-write Input or Thought.

When a Context preview becomes stale because content or authorization changes, the old preview stays visible for human comparison but copy/export is disabled until the user rebuilds it. This avoids disappearing-reading-state races without allowing stale content to be shared.

## Compatibility and migration

No schema bump is required. `workingInputId`, `includeUnorganizedInputs`, Memory input-exclusion rows and optional activity `inputIds` are additive fields under existing stores. Backup allowlists and integrity checks understand them. Old backups/config rows remain accepted; old independent user work stays independent.

The intentional behavior change is that editing the body of a safely linked exact-original Thought is now an Input working-body edit. Therefore Original Organizer correctly sees one changed Input and may need a later explicit reorganization request. A note-only edit remains free of that delta. Backup round-trip preserves this pending organizational state instead of pretending the checkpoint is current.

## Verification result

Round 8 is development-closed on commit `2e19b8c93ac1a593a15bbf55f924feea9582a353`.

GitHub Actions run `34662095494` completed successfully with:

- **879 / 879** portable unit / adapter-contract / privacy-security tests passing;
- **16 / 16** selected real unpacked-extension browser journeys passing;
- source package audit passing: **6706 guardrails across 144 runtime resources**;
- built release audit passing: **6294 guardrails across 137 runtime resources**;
- release product guard passing for **152 files**;
- explicit `ROUND8_VERIFIED` completion marker.

The browser journeys include the Round 7 evolution UI, Memory authorization / backup / restore journeys, Original Organizer success/failure/interruption behavior, optional-read failure recovery, direct Input Context, denied-topic bypass prevention, and bidirectional Input ↔ linked Thought body editing. They use synthetic data and simulated provider responses only.

The portable suite retains the same three explicitly documented historical/environment exclusions used by the predecessor verification: `history-performance-v090.test.mjs`, `light-coverage.test.mjs`, and `smart-filter-diagnostics.test.mjs`. No new product-policy exception was added to make Round 8 pass.

Several failures encountered while closing the round were diagnosed rather than suppressed: ambiguous Settings selectors in the browser harness, GitHub Runner absolute-path matching in the backup fixture, authorization-render timing, fail-closed `MEMORY_STALE` during capture settling, a real stale-Context-preview invalidation race, a linked-read maintenance race, and Playwright actionability retries while a collection row was being rerendered. The real product races were fixed; harness-only races were made deterministic without loosening privacy or authorization rules.

The verification artifact is named `paia-round8-evidence-2e19b8c93ac1a593a15bbf55f924feea9582a353` and is retained by GitHub Actions for seven days.

## Remaining deployment gate

Development closure is **not** daily-profile deployment authorization.

Before this stack can reach `main` or the user's existing Chrome profile, the inherited existing-database structural gate in `V0111_REAL_DATA_GATE.md` must still be checked against the long-lived archive. Synthetic fixtures cannot prove the exact durable Topic / Section / placement shape of that database.

No uninstall, extension-ID change, database clearing, alternate unpacked path, Organizer-as-repair action, or backup overwrite is authorized as a substitute for that read-only gate.
