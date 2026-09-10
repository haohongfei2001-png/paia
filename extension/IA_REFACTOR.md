# v0.6.0 IA Refactor internal — implementation contract

This isolated worktree implements the approved Information Architecture. Primary navigation is Input Archive (default), Thought Library, AI Memory. Existing Library documents and blocks become Input Archive without rewriting source facts or authored fields. Source Records remain immutable to editors and are accessible through a source side panel and Settings > Data. New Thought Library starts empty with “尚未整理思想内容”.

Input is a continuous editable conversation document: weak date separators, small light-gray sending times per input, direct title/body edits, autosave, undo/redo. Empty text remains an active empty block. Only explicit whole-block removal changes membership; a persistent source suppression marker prevents recapture/import revival. Filtering policy is separate and disabled.

Revision policy: retain all revisions within 90 days and at least the latest 20 important revisions per entity. Baseline, removal, restore, significant edit, and future AI update are distinct important revisions. Ordinary input coalesces within 60 seconds. Permanent source purge deletes affected revision payloads and wins over all restore/undo paths. Independently authored content is preserved detached; a source purge is not a purge of all independently authored text.

Thoughts have topic/type categories, input-version dependencies, editable text/title/notes, user protection, freshness and dependency integrity. provenanceType supports input_derived and user_created (empty inputRefs allowed only for the latter at creation). No UI creation, Organizer, filtering, generated classification, Memory access, MCP, network, new permissions, sync provider, or multi-device feature is added.

Migration adds an IA schema marker and auxiliary stores; existing blocks/documents remain the physical Input storage for lossless compatibility. Migration is resumable in batches, adds no permanent raw backup, and initializes baseline revisions. Physical IDB version 3 blocks v0.5.x runtime downgrade. Existing v0.5.1 import stores and schema gates are preserved. Daily installation and its IndexedDB must not be opened or changed for acceptance: use isolated Chrome and synthetic data.

## Validation matrix

- Field-for-field v0.5.0/v0.5.1 Input mapping, empty Thought space, restartable IA initialization, old runtime fails closed.
- Source text/hash/time/capturedAt unchanged by Input/title/Thought edits; empty input is not removal.
- Explicit removal persists per source and rejects recapture of new snapshots; Undo and durable history restore.
- 90-day OR latest-20-important retention; coalescing boundaries; purge removes every affected historical payload; stale restore cannot revive source.
- Topic/type editing, user_created without refs, generated refresh cannot overwrite user work, dependency direction and version checks.
- Real Chrome isolated synthetic migration, direct editing/IME/undo/redo, source panel/purge, history after reopening, suppression after self-reload, zero extension network.

## Delivery status

Implementation complete: 470 automated checks pass, static audit passes, and visible isolated Chrome acceptance passes. Daily installation and user IndexedDB unchanged. No claim of real export schema acceptance or live private ChatGPT verification. Full results: TEST_RESULTS.md.
