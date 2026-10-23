# Original Prompt stale-view command presentation

Native Settings diagnosis demonstrated original BNS_OWNER_CHANGED after concurrent backup-data-generation changed7→8. The guard remains correct. The generic worker error mapper previously presented this as STORAGE_FAILED, incorrectly describing a read/review invalidation as storage failure.

The original Prompt command boundary now maps only an actual SyncError with exact BNS_OWNER_CHANGED to the existing MEMORY_STALE user-facing result. It neither retries nor weakens the original journal/private capability/generation checks. Storage errors, integrity errors, forged plain error codes and all other exceptions remain identical. Sender and consent gates stay in their original locations. No new wire authority, automatic refresh or commit is introduced.

The new real stale-review regression failed on the previous implementation,0/1. After correction the complete original conflict consumer/bound conflict/surface three files passed (exact counts in owning.log). The regression preserves every table after refusal; error-identity tests verify no blanket remapping or retries. Existing actual native passes predate this presentation-only change and are not claimed as a rerun. No browser/build/cloud/large dataset execution.
