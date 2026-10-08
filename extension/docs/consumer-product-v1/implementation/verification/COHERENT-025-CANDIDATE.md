# Coherent 0.25 candidate

This integration follows main 050e43b72269a0fedb02ab780dd20ad4e813f351 (0.24, PR164 including the reviewed Sync PR204). Intermediate proposed 0.24.1/0.24.2 batches were not released separately. Their independently reviewed changes are combined with the stable Writing/Settings batch for one final full certification and one coherent release identity.

## User-facing behavior

Section-aware writing uses the existing draft/receipt owner and full-page composer, retains precise return history and editor state, and never duplicates Source or invents a second draft store. Saved AI reading defers visual reflow across a live selection; existing IME protection, eligibility checks and removal/revocation remain effective. Settings removed lists reject stale reads/feedback and duplicate pagination; late restore acknowledgements do not retarget a new list. The Topic backend's existing unpaged enumeration and other full recovery requirements remain open.

## Internal safety boundaries

Optional manual Info/Rules/Now journals compose with Prompt without activating production sync. Backup replacement invalidates journal preparation and last-materialized ancestor authority, even for same-value restore followed by verified reuse. Native tests build each release in an isolated temporary directory, retaining the observed shared-output contamination failure.

AI semantic writes invalidate relevant active jobs in the existing transaction while preserving settled receipts and unknown financial attempts. Current accepted-row metadata bounds database reads. On maintenance scan overflow, at most 100 proven-obsolete DEFER rows move atomically to a history prefix with all original fields retained; malformed/unknown authority never authorizes deletion. One bounded cleanup/read does not promise to traverse an arbitrarily large active backlog. No model, worker, financial authority or real cloud account is enabled.

## Evidence and limits

Independent component and integration reviews cover all changes. The ab9c926f Writing/AI-reading/Settings combination passed 114 complete targeted cases and three original complete native files, 9/9 in 60.810958125s. Its independent integration review passed 84 complete cases and verified exact component byte equality. Context54b1f597 passed all four complete native files 38/38 in46.766020708s, plus the identical CI verifier bound to its head/tree; each Context variant has68 scenarios and two actual worker restarts. The AI DEFER component passed122 complete cases and original full source/release native2/2, including actual IndexedDB rollback and unchanged job/usage/source evidence. Final c31a8fa6 integration passed29 focused AI/backup/restore-proof cases, current coverage checks and12346 package checks across373 runtime resources.

These are explicitly component/pre-final-checkpoint results. The final exact head/tested merge and main still require their own recorded full gates. All initial product, fixture, browser-launch, budget and output-contamination failures remain in owning receipts. The current 84-file browser corpus preserves all prior coverage with only the separately measured search-file width7 redistribution. Original budgets remain unchanged.

This does not complete all TOPIC-05.7/05.8, CTX4 real connection, whole SET2 recovery, Chrome/Edge/Safari account sync or AI live Qwen cost/quality acceptance. Installation, paid models, cloud credentials, wider permissions, uploads and formal deployment are not implied.

## Exact-candidate registration correction

Candidate db5d6810 Prompt37785814375 failed unit3 because the historical D5 registration guard did not include the two newly approved source/release selection-protection cases. Full37785814351 also recorded Unit3 failure. The original historical before/after/D7 arrays are unchanged; an explicit currentAdditions collection names exactly those two cases. The existing complete targeted browser command therefore requires10 results instead of8. Its original failure/skip/receipt/budget assertions remain. Nine complete related guard cases pass locally. This is a registration correction, not a reclassification of the failed runs; corrected-head CI is required.
