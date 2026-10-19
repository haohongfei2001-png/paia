# F09 pending feedback repair — 2026-10-19

Base: PR302 head `2f0de1f1444ae5cde5da400ab712d0c9ec5c6459`.

The original Full run39182287245 Browser6 failed both F09 Source/release at the unchanged first-expression enabled wait. Original artifacts show 14/13 successful insertions before the next warm iteration stalled. This is not a measured50ms regression: measurement of the next insertion had not begun. Artifact ZIP SHA256:526c3a6725dd84a6f93570d41a5224dc7c938e0ace80b2ce9d67d417bc8bf0df.

Deterministic original-function controls hold the existing surface-form RPC across the existing480ms verified-success feedback timer. The timer enabled a control while another action was pending, then that action restored its stale disabled baseline, leaving the row disabled indefinitely. The same baseline could restore a stale capsule eligibility, including after an UNKNOWN attempt. A hidden original row also regained enabled presentation in the old timer. Original insertion domain guards were not bypassed by these UI-state failures.

The original pending owner now receives eligibility changes in its saved baseline while controls remain disabled until its ACK. The verified timer only unlocks the exact current, unchanged, nonhidden, quick-eligible original row. Capsule eligibility is recalculated from the existing current candidate and attempt state. UNKNOWN keeps its original one-attempt lock and has no success timer. No new request, refresh, replay, provider or permission is introduced.

Eight deterministic controls plus the existing surface/presenter/automatic/R3 lifecycle groups pass72/72 on the frozen source. The same eight controls against the exact pre-repair source retain their original failures. These are local mechanism tests with original source functions and controlled DOM/RPC/timers, not native browser evidence. The original F09 file,40 warm sample requirement, clock measurements,50ms observation,120s bound and all insertion/Send/geometry oracles are unchanged. New exact-head Full/native remains required; this receipt does not relabel the prior failed Full.
