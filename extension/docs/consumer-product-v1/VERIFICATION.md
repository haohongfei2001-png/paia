# Verification Contract — PAIA Consumer Product v1

## 1. Completion layers

Every applicable slice must provide evidence in these classes.

### Intent

- relevant Product Intent IDs are covered;
- no confirmed capability is silently removed;
- owner-decision items remain unresolved until actually decided;
- superseded ideas are not accidentally reintroduced.

### UX

- production implementation matches the relevant UX surfaces;
- normal, empty, loading, partial, error, recovery, long-text and narrow-width states are covered where applicable;
- keyboard/focus and touch behavior are included;
- realistic data density is used, not empty showcase fixtures.

### Implementation

- fixed commit/runtime;
- real production functions/messages/storage paths;
- no hand-reimplemented mirror used as proof of the real algorithm;
- migrations and compatibility are explicit.

### Reliability

Where applicable, inject:

- worker termination;
- tab/page reload;
- browser restart;
- stale response;
- storage/full or write failure;
- import interruption;
- duplicate event;
- concurrent edit;
- deletion/re-import;
- revoked/expired authorization.

Confirmed saved data, protected human work and deletion fences must not be lost or resurrected.

### Performance

Targets are requirements to verify, not current claims.

Representative goals:

- visible input/click feedback P95 <= 50 ms;
- hot navigation P95 <= 150 ms;
- lexical search first results P95 <= 300 ms at 10k Inputs and <= 700 ms at 100k Inputs when the index is ready;
- common scrolling/transitions should preserve 120 Hz responsiveness on the declared 120 Hz reference device; main-thread JS work during common frames should normally remain below roughly 4 ms P95;
- no continuous background polling strategy is accepted without measured idle CPU/memory justification.

Measure P50/P95/P99, memory peak and idle resource behavior on declared hardware/browser versions.

### Real browser/device

Synthetic DOM validates contracts, not current provider compatibility.

Provider-facing slices require current supported real-site journeys. Mobile slices require real supported mobile devices. Private evidence stays local; Git stores sanitized counts/hashes/states only.

### User-level acceptance

The task must be completable without:

- DevTools;
- copying diagnostic JSON;
- reading repository SHAs;
- manually fixing storage;
- choosing internal entities;
- repeated unexplained reload rituals.

The result must be truthful, recoverable and reusable.

### Release/Migration

For schema/storage/identity changes:

- supported from/to versions;
- stable identity mapping;
- Source/Working/Thought body hashes or equivalent local comparisons;
- revision preservation;
- tombstone/deletion preservation;
- authorization delta;
- Backup compatibility;
- interruption points;
- rollback result.

## 2. P0 blocking failures

The following always block the affected slice:

- confirmed saved user data loss;
- protected human content overwritten without explicit user action;
- unauthorized external data release;
- permanent deletion resurrected through import/rebuild/restore;
- Source history rewritten as if current edits were original facts;
- duplicate logical Source caused by navigation/lifecycle repair;
- UX claims success before durable commit;
- normal core task requires engineering intervention.

## 3. AI quality

For AI Organize, semantic retrieval and AI-assisted Context:

- schema validity is necessary but insufficient;
- evidence IDs are necessary but insufficient;
- preserve uncertainty, negation, author role, causality and chronology;
- a material factual/attribution distortion is a blocking defect even if aggregate score is high;
- explicit user selections cannot be replaced by algorithmic relevance;
- low confidence or incomplete coverage must be visible.

Use fixed evaluation tasks and independent review before asking the owner for genuinely personal semantic judgments.

## 4. Accessibility

Target WCAG 2.2 AA for applicable surfaces.

At minimum:

- keyboard-complete operation;
- visible focus;
- no information conveyed by color alone;
- text and control contrast appropriate to the standard;
- dialogs/sheets have focus containment and restoration;
- 200% text scaling and 320 CSS px reflow;
- reduced-motion support;
- touch targets designed for comfortable consumer use.

## 5. Evidence honesty

A receipt must label evidence type:

- CODE
- CI
- SYNTHETIC_BROWSER
- RECORDED_LIVE
- CURRENT_LIVE
- DEVICE
- PERFORMANCE
- USER_ACCEPTANCE

Do not convert one class into another in prose.

A historical CI run may support unchanged code, but the receipt must identify the exact runtime relation. A screenshot does not prove performance. A parser fixture does not prove official export support. A copy/export preview does not prove a real connector.

## 6. Verification cadence and scheduling

This contract defines the evidence a completed slice must ultimately possess. It does not require every inner-loop candidate or ordinary round to reacquire every evidence class.

Use three levels:

1. **Candidate / inner loop** — targeted tests, affected regressions and bounded browser smoke for the changed behavior.
2. **Round closure** — full required CI plus the browser/reliability evidence directly owned by that round, followed by merge and exact-main verification.
3. **Slice / certification closure** — the complete applicable evidence classes in this document, including current real-browser/device, user-level, performance and migration/release-path evidence.

For VS-01 specifically, CPV1-01.6 is the owning full real-lifecycle certification round. Earlier VS-01 rounds still prove their own engineering exits, but should not repeatedly reacquire the entire VS-01 lifecycle matrix or perform publication merely to close an intermediate round.

External provider/deployment unavailability is evidence of an unavailable environment, not product PASS or FAIL by itself. If current-live or deployment evidence is unavailable, preserve that fact and defer only when the owning contract permits it. Never substitute synthetic evidence for CURRENT_LIVE, and never mark a slice COMPLETE before its required final evidence exists.

Production publication is not a default verification step. It is required only when a round/slice explicitly owns distribution/release behavior or when separately authorized.

