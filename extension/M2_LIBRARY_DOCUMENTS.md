# M2 — Library Documents

Baseline: `7d5df85`. Independent branch `codex/library-documents-v070-m2`.
Manual Library only; no Provider, network, daily deployment or M3.

## Schema reconciliation gate — PASS

Approved final design `77176f5`, THOUGHT_LIBRARY_FOUNDATION.md lines 81, 87 and 257 already includes `organizerUsage`: 25 existing + 12 new = 37. The earlier 36-store estimate predates the approved BudgetPolicy decision. M1 implemented the final approved DDL.

Existing 25 stores:
`meta`, `records`, `recordIndex`, `blocks`, `blockIndex`, `documents`, `libraryDocuments`, `times`, `tombstones`, `migrationBackup`, `sourceCounts`, `operationReceipts`, `importTasks`, `importBatches`, `importEvidence`, `importSources`, `inputStates`, `inputRemovals`, `thoughts`, `categories`, `dependencies`, `revisions`, `invalidations`, `filterInputs`, `filterIntents`.

New 12 stores:
`topics`, `sections`, `placements`, `provenance`, `thoughtSuppressions`, `organizerJobs`, `organizerWorkItems`, `organizerSuggestions`, `entryRelations`, `librarySearchTerms`, `libraryMigrationItems`, `organizerUsage`.

The additional name relative to the earlier estimate is `organizerUsage`. It reserves numeric session/daily budget accounting, request reservation/settlement and body-free audit metadata. It is implementation infrastructure, not a new durable product entity. It does not store prompts, responses, credentials or another private body; it does not change Entry/Source/Input ownership. M1 only reserved the store. M2 does not activate Provider budgeting. No further product decision is required; continue M2 without redesigning M1. Physical schema remains v5 / 37 stores.

## Implementation contract

Vertical Topic index and continuous Section/Entry documents, default 40 entries per page. Manual Topic/Section/Placement operations, stable identities and redirects, negative membership, shared single Entry body. Entry fields autosave using changed masks and field CAS; bounded session Undo is new writing. Persistent revisions retain 90 days OR latest 20 important per entity. Explicit delete/restore respects the M1 suppression and purge fences.

Input editor characterization precedes extraction of PlainTextSurface, AutosaveSession, UndoJournal and RevisionSession. Existing Input transaction and cross-block behavior stay intact. Library navigation must flush drafts; remote dirty-field conflicts retain drafts. Source details are loaded only on explicit expansion.

Search stores only versioned token postings, one owner index per Entry; no normalized body copy. Local bounded rebuilding reports incomplete state. Results recheck current owner version, lifecycle, source and active layout. Structural merge staging contains IDs/ranks/protection only, never body copies; activation validates source/survivor organization revisions. Interrupted work resumes from durable cursors.

## Acceptance plan

Characterization: IME, 750ms autosave/3s max wait, empty text, focus, cross-block delete and Undo; run against unchanged Input editor before extraction, then repeat.

Automated data/UI coverage follows all 32 areas in the M2 authorization. Synthetic performance: 1k/10k Entries, first40/next, 10k-entry Topic, 1/3/10 memberships, search, 200KiB body, bounded editor history, merge and reorder. Visible Chrome uses only a fresh isolated synthetic profile and extension origin. Full baseline regressions and package/privacy checks required. No daily database or installation access.

Final results and known limitations will be recorded in outputs/v070-m2-acceptance.md. Stop at checkpoint-v0.7.0-m2-library-documents.

## Implemented details

- Library Index has pinned/recent/all Topic views, local search and an independent writing action. Unplaced entries are available under content/version management and may later join Topics; no automatic Topic is created.
- Topic documents page by stable placement keys (default 40, max 100). Cursors bind Topic UUID, active generation and organization revision. Long entries load separately in full; removed rows and purge fences are rechecked. Empty/default sections persist. A bounded M2 metadata bootstrap adds missing default-section references to existing M1 Topics without changing IDs or Source/Input rows.
- Shared editor primitives are in `ui/editor-primitives.js`. Input keeps its existing transactions and receive logic; its event/timer/history helpers delegate minimally. Library uses atomic changed-field batches, field revisions, retained conflict drafts, 750ms/3s autosave, session Undo and persistent revisions. IME defers incoming revisions. A Source purge invalidates affected composition and increments cleared-field revisions before an old draft can write back; unrelated drafts remain in their own entries.
- Layout jobs use `organizerJobs` with `kind=library_layout`. Staging contains Section/Placement metadata only; activation switches a generation. Ordinary reorder swaps ranks in a short transaction; equal ranks use staged rebasing. Organization mutations wait for an active layout job, while Entry body editing remains available. Failure pauses local maintenance, exposes retry, and preserves committed content.
- Search/count work uses the already-reserved `libraryMigrationItems` store. Search batches cover at most 20 owners and 200 posting mutations; layout/bootstrap batches cover at most 100 rows, counts at most 200 placements. Current owner versions, lifecycle, Source fences and active generation are authoritative. Hash postings contain no normalized-body copy. Rebuilding and partial query pages are explicitly incomplete.
- Source provenance is read only after expansion. Used/current version status is displayed without technical IDs or default Original Snapshot access. A removed-then-restored Input does not silently make an old contribution current again.
- Revision restore writes new revisions. Layout restoration refuses to discard later organization work. Current generation placements are the organization authority; inactive layouts are metadata for guarded revision restoration, never a second Entry body.

## Intentional limits

No real Provider, extraction, embeddings, semantic classification or Entry merge. Search is literal local token search (Latin words/Chinese characters), not semantic search. Undo is a bounded in-page session; persistent Revision supports reload. Large layouts take time to stage and can be retried after interruption. Inactive layout generations retain metadata for restore; further metadata compaction is not part of this checkpoint. Formal packaging/version upgrade and daily installation remain out of scope.
