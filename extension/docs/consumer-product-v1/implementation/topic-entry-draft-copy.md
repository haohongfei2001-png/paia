# TOPIC-05.6 existing Entry safe draft copy

The approved failed-save/retry/safe-copy requirement applies to existing inline and standalone Entries. Previously Copy current text called flushEditors first, so a failed save prevented copying the unsaved draft. The original menu now snapshots the exact current editor body using textOf without collect/flush (collect would clear failure and schedule a save). Original GET_LIBRARY_ENTRY qualifies epoch, active lifecycle and non-purged source before copying; its saved body never replaces the draft. Remote revisions may differ for a conflict draft, while owner/row/field/text/route/IME/visibility must remain current. Non-editor saved reading retains its original qualification path.

The existing clipboard helper uses fallback:false and a separate local status. Failure, conflict, unknown-save/recovery state and existing save feedback are preserved; no writer, provider or permission is added.

Frozen runtime0ffd57d5e945a57a776d69628ce82e5a4e7f37b6/test87e88f89f2b42d6788ada5686bbea00e513bda1a. Author22 focused/125 related and independent72 related tests pass. Old-runtime failure retained. Exact isolated Source/release headless Chrome executes a real editor save with synthetic STORAGE_FAILED, then original copy-menu click: exact Unicode/newline draft, unchanged persisted body, no additional edit request, unchanged failed/dirty state. Clipboard rejection keeps draft/failed state and opens no fallback dialog. Zero external network/errors;502-file standard release guard passes. Evidence work/reviews/PR284-ENTRY-DRAFT-COPY.

Candidate only, not merged or installed; full/visual/main qualification remains separate. All historical evidence, seven plans, Sync pause and Pro CI ownership remain.
