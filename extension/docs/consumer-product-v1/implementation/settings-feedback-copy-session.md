# SET2-04 feedback clipboard completion lifetime

A pending explicit clipboard result previously checked only text equality. Closing and reopening the same feedback body let the old failure overwrite the current status and select/focus the textarea. An older failure could also replace newer copy success; composition beginning during the request could be interrupted.

The original dialog now scopes completion to its opening identity and latest copy request, requires the dialog still open, and invalidates pending copies at compositionstart. Original recovery persistence, token/CAS, source-free feedback, exact copiedBody departure protection, and explicit email URL remain. No upload, new writer or permission.

Old runtime fails three regression cases and actual isolated Chrome reopen/status test. Final related four whole files33PASS, independent settings-feedback whole13PASS (overlapping, zero skips/cancellations). New tests cover closed/reopened dialogs, superseded completion and IME success/failure plus refusal to leave unsaved work using a superseded copy. Original valid copy-after-save-failure departure still passes.

Exact Source and standard release native pass original reload recovery, held clipboard refusal across reopen with same body and focus preservation, explicit exact copy, failed persistence/explicit retry, concurrent original CAS, zero outbound requests/runtime errors. Clipboard adapter and all bodies are synthetic; not real OS clipboard or user acceptance. Release503-file guard passes. First fixed Source native attempt moved focus before original show validation finished; retained failure. Final native observes actual GET_PAGE validation completion and original render turns before setting focus; no product change, timeout increase or weakened assertion.

Runtime blob f97138d231e05e2b08ad0e48679d2e07780b8b5b; test de24664086815b87657958e56bcf9542fd2f18cd. Packet work/reviews/PR284-FEEDBACK-COPY-SESSION, frozen snapshot paia-feedback-copy-jsvvjb1k. No CI/Sync/paid-service changes. PR284 remains unmerged/uninstalled; current exact-head gates and latest approved white comparison still required.
