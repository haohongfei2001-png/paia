# Populated mixed recovery milestone — 2026-10-23

Frozen runtime: `736031b68547e39db880152bfe884914a47e9801`. Local development version 0.55.9. Root integrates original Working/Human nonempty owners, exact mixed chronology and allocation proofs, Source multi-purge protections and causal Formation journals. Private prewrite expectations and complete postwrite graph/metadata closure are retained. Stage cursor and chronology are checked before coordinator transitions overwrite them.

## Actual verification

- First 21 complete owning Node files: **389/390**, one stage-cursor drift rejection missing. `e7584cf9` adds the transition guard; targeted correction **1/1**.
- Second same Node batch: **374/390**, sixteen Source failures caused by the new guard referring to `p.snapshot` instead of its original `p.rows`. `736031b6` corrects that reference and adds Source cursor/timeline negatives. Complete affected Source owning file **24/24**. There was no third full 390-test invocation; these counts are not a single all-green run.
- One standard development build: **667 files**, **22860 guardrails / 643 runtime**, exit 0, wall 1857.90129099 ms.
- Final native Source/Release: **8/8 parents**, exit 0, zero failures/cancellations/skips/todos, TAP 232519.498833 ms, wall 232592.2377090028 ms. Each variant executes the original **36 mixed recovery**, **50 multi-Source purge**, **24 Source incremental**, and **26 Formation** case bodies. Eight receipts bind native IndexedDB and exact named runtime hashes. All report zero external network attempts/requests. Complete source vectors before/after are unchanged.
- Actual tools: Node 22.23.3, Python 3.12.14, Playwright 1.63.0, Chrome 156.0.8078.47, macOS 27 arm64. Original headless harness and isolation are preserved.

## Failure history and scope

`test-results.json` enumerates every retained TAP invocation, including unsupported baseline 0/1; draft closure failures; intermediate 99/101; and real unrelated Working receipt mutation negative 0/1 followed by complete nine-table closure 3/3. Earlier partial successes never replace their failures. Exact commands and complete frozen vectors are in the execution JSON files; raw logs and native receipts are retained.

Supported nonempty merges preserve independent local Human edits while applying original Working updates, or apply original Human updates against a populated mixed base. Same-Input forks refuse. Original private owner graph planning, receipts, outbox, semantic metadata and budgets remain authoritative. Interleaved incoming Human plus Working, native current mixed re-export, Saved mixtures and larger phased restoration remain separate unfinished work at this freeze. Source purge still has its documented finite eligibility. Formation uses existing local qualified owners and does not enable a new issuer or scheduler.

The runnable unpacked development artifact is locally at `release/` beside this report (not committed or installed). No cloud CI/Full, real account/data/provider, deployment, main merge, or production/default Sync activation occurred. This milestone is not Linux capacity or whole-programme certification.
