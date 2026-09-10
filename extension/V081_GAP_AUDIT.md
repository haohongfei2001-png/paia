# v0.8.1 — v0.8.0 gap audit

Audited 2026-09-08 04:00–04:05 UTC. Timebox ends 07:50:26 UTC. Freeze new P1/P2 at 07:20:26 UTC.

Baseline b1708bd8139a31e35f6e7bf6a14d3907056cde83 / checkpoint-v0.8.0-thought-library-productization, clean. Daily version 0.8.0: all 114 file hashes match the recorded internal deployment. No daily Chrome profile, private database, or credentials accessed.

| Area | Status | Evidence / v0.8.1 response |
|---|---|---|
| AI schema acceptance | Partially completed | Canonical bounded validator handles safe missing lists/extras/evidence subset, deterministic Chrome chain passes. Original historical raw failing response unavailable; live DeepSeek success not verified. Keep this limitation explicit. |
| AI persistence / Grid / Reading / evidence / toggle | Completed | v0.8.0 tests and code; independent AI revisions and user field protection. Reverify in v0.8.1. |
| Topic Quality / Grid | Completed | Local candidate relevance and suggestion-only duplicate review are implemented; improve representative extractive summary. |
| Settings | Partially completed | Technical panels folded; cost controls exist. Need formal backup and clearer usage. A failed Settings Original message can outlive a later successful update; fix. |
| Update center / cost | Completed | Default one action at most one request, no retries, durable dispatch ledger. Extend only with explicit bounded authorization. |
| Migration | Partially completed | Frozen v0.7.2c schema upgrade tested synthetically; cannot claim private daily database verified. Add frozen v0.8.0 + partial/rerun synthetic coverage. |
| Reading UX | Partially completed | Editable prose with collapsed provenance; repeated dates, no remembered descending order / local Topic query / navigation. Priority work. |
| Protected AI after source purge | Partially completed | User fields retained as hidden detached drafts; old cache evidence hidden safely. No detached draft recovery UI. Preserve safety; expose draft recovery if feasible. |
| Backup / restore / bounded multi-request | Not completed | New v0.8.1 scope. |
| Confirmed P0 regression | None found in audit | No claim about real private data or real Provider response. Targeted tests precede new runtime changes. |

Implementation order: reading projection and preferences/search; summaries/AI prose; bounded workflow and cost; explicit backup schema and safe restore; governance/settings; long-term/migration/regression; package/deploy/checkpoint.
