# Original local tools and fixed worker composition

Local only. Owner commits d9ee08a and 9c0f971 were integrated exactly as 7046e45 and 039e78d. Only original ImportHandler/ImportLedger, BackupService and IntegrityChecker are accepted by the new fixed worker composition. Private class fields and captured prototype methods bind the exact store and Import runtime. All three admissions close synchronously before awaiting their actual tasks. One 30-second outer deadline covers acquisition/fences; each owner retains its original cumulative proof ticket. No activation command consumes this composition yet.

Original staged Backup items and Integrity sessions remain. Nonterminal Import durable work and unfinished backup-settings recovery refuse as UNKNOWN. Real Import disconnect still revokes grants during acquisition/held states and invalidates the proof; queued work cannot reuse its old admission serial after release. A timed-out queued read remains observed and must actually settle before new proof acquisition. No automatic replay, task deletion or inferred provider/host/cold settlement.

Evidence is deliberately separate:
- Parent owner 15 whole files: 119/119; then two new controls 2/2.
- Independent review found unbounded queued fence and blocked disconnect revocation. Original new controls 0/3 retained; corrected 3/3, final three owning files 43/43 on 9c0f971.
- New fixed composition actual worker harness: 5/5, TAP 835.790917 ms, wall 930.29525 ms.
- Five whole worker/editor owning files on this integrated source: 55/55, TAP 3046.333583 ms, wall 3070.204583 ms, exit 0; no fail/cancel/skip/todo. Commands and SHA256 vectors in tools-*-input.json, logs/results alongside.

Node 22.23.3 on macOS; synthetic IndexedDB and worker fixture. Existing locked pg dependency was exposed through an exact temporary owned symlink removed in finally. No installation, native browser, cloud, provider, accounts, push or global/product acceptance. Two independent review reports are attached, including closure of both owner findings. Existing generation ACTIVATE/CONTINUE/RESTART gates remain unchanged.
