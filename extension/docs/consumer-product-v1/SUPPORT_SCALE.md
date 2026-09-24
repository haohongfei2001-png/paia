# VS-03 support-scale contract — CPV1-03.0

status: ENGINEERING_TARGET / NOT_CERTIFIED

This contract separates current code limits from the recoverable-library claim. A large library is supported only when its complete current-version Backup can be validated and restored within the same declared envelope. Browsing or importing 100,000 Inputs alone is not recovery certification.

| Surface | Current implemented boundary at VS-03 entry | VS-03 certification target |
| --- | --- | --- |
| Official-history input | File at most 1 GiB; ZIP at most 10,000 entries; decoded total at most 1 GiB; one projected Input at most 200,000 characters; at most 1,000,000 projected rows. These parser guards are not a real-export compatibility claim. | Repeat import of a current real official export yields zero new logical duplicates after the first completed import. Supported profiles are admitted only after private real-export verification; absent evidence stays DFG-CPV1-005. |
| Bounded import execution | At most 32 projected rows and 512 KiB text per batch; durable task/batch ledger permits restart with the same file fingerprint. | Interruption at every batch boundary resumes without losing protected edits, bypassing tombstones or duplicating logical Sources. A visible storage preflight and result/review precede commit. |
| Current Backup v1 / schema 5 | Export pages contain at most 40 items and normally at most 1 MiB. A recoverable file is at most 64 MiB, 100,000 domain items and 8 MiB per line. Restore requires an empty library, validates before writing, then uses one IndexedDB transaction. | A complete current-version library at the declared Source/Input/entity scale exports and restores end to end, including revisions, metadata, protected edits and deletion fences. Export and restore use bounded memory and storage rather than holding the whole library in a page Blob or session array. |
| Current large-library claim | The 10k/100k synthetic Reader/search benchmarks certify navigation/search only. A 100k-Input library can exceed the current 100,000-item Backup boundary because Source, Input, document, revision and protection records each count separately. | At least 10,000 and 100,000 Input fixtures with their complete corresponding Sources and domain entities must pass export, integrity verification, restore and post-restore readback. The accepted maximum serialized byte size and entity counts will be fixed from those full-flow measurements before a support claim. |
| Memory and disk | Import streams decoded entries; export accumulates final parts in the page, and restore retains validated items in a session array. Current code has no proven peak-memory or temporary-disk budget for a 100k-Input recovery. | Cloud browser evidence records P50/P95/P99 duration, peak foreground and worker memory, and storage use for each scale. The product displays the measured supported limit and requires enough free quota for staging plus the existing library before mutation. A quota or interruption failure preserves the prior library. |
| Historical compatibility | Backup v1/schema 5 accepts supported app headers from v0.7–v0.12 under the current strict validator; current restore rejects newer/unknown format or schema. Import profiles are structural candidates, with `realExportVerified: false`. | Every claimed historical Backup and official-export version has a fixed fixture plus current-version restore/import evidence. Unknown versions remain unsupported with a clear no-mutation result. |

## Interim truth and gates

- Until the full-flow scale matrix passes, the only current recovery envelope is the file-based 64 MiB / 100,000-item limit above. No fixed Input count is implied by it. Export may produce a larger open file, but it must say it is not a recovery point.
- Current ChatGPT and Claude export adapters remain structural candidates. DFG-CPV1-005 keeps current real private-export verification pending. Do not label either profile real-export verified on synthetic fixtures.
- Signed-channel/current-live debts DFG-CPV1-001/004 remain separate. They do not block synthetic import, resumability, streaming Backup or staged restore engineering.
- No limit may be raised by changing a constant alone. The certification target needs complete data, privacy, interruption, rollback and exact-main evidence.

Sources: `core/import/errors.js`, `core/import/coordinator.js`, `core/import/ledger.js`, `core/backup-format.js`, `core/backup-service.js`, `ui/backup.js`, `BACKUP.md`, and `MASTER_PLAN.md`.
