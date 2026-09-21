# PRD-00 Baseline Audit

Audit type: docs-only architecture/product/reliability audit.

Planning baseline: `main@3565a00e213c6d5001a300965a00006628db3f51`.

No runtime, schema, permission, archive data or user browser state was modified by
this audit.

## Executive finding

PAIA does not need another feature-expansion round before it needs production
evidence.

The repository already contains mature capture, archive, Reader, Thought,
search/reuse, Backup and authorization machinery. The principal unresolved risk
is now **operational trust**: whether the implemented system can be depended on
against the current real ChatGPT surface, the normal daily Chrome lifecycle,
real local data durability and ordinary retrieval/use over time.

That risk cannot be closed by adding more entities or AI sophistication.

## What is already strong

### Capture architecture

Capture Foundation Hardening v1 established:

- provider-specific observation behind the ChatGPT adapter boundary;
- stable Source identity rather than text-hash identity;
- immutable Source snapshots separated from editable Working Input;
- bounded message stability, metadata reconciliation and transport/resource
  limits;
- fail-closed role/text-leaf checks;
- duplicate resistance across rescans/reloads/restarts;
- conservative source-time semantics;
- bounded local diagnostics without private bodies;
- no broader permissions or hidden provider call.

Its historical targeted evidence was strong: 262 capture regressions and 3
isolated Chrome foundation checks passed.

### Current repository engineering quality

Later PAIA packages expanded current browser and full-suite coverage and ANS-09
closed its package with exact-main certification. The PR #38 maintenance head
also passed the complete required PAIA Certification before merge.

This establishes that the current codebase is not an untested prototype.

### Data ownership and recovery model

PAIA already separates Source, Working Input, Thought, derived AI organization,
Context authorization and Backup responsibilities. Permanent deletion and
tombstones outrank caches/restores. Backup is local, integrity-checked and
fail-closed.

## What is not yet proven

### 1. Current real ChatGPT compatibility

The Capture Foundation certification explicitly recorded current logged-in
ChatGPT capture and actual response contract as NOT VERIFIED.

Synthetic/fake ChatGPT pages prove the contract implementation, not that the live
site still satisfies that contract today.

### 2. Daily installation and real local-data lifecycle

The existing updater preserves the loaded unpacked path and code identity, but
the historical Capture Foundation audit did not certify a normal daily-profile
upgrade/reload against the user's existing archive.

A disposable profile restart is useful evidence but not equivalent to real
daily data surviving an update.

### 3. Bounded completeness

PAIA should not claim account-history completeness. The production requirement is
narrower and testable: within a declared canary scope, every eligible observed
user message must either be durably represented exactly once per logical Source
snapshot or produce an explicit bounded failure state.

Recent capture-health metadata remains a diagnostic, not a completeness proof.

### 4. Scale/performance debt

The historical Capture Foundation full run contained explicit 10k/100k
performance failures. Later current-suite results do not automatically erase
those historical gates, especially where historical large-fixture audits may be
separate from current-release jobs.

Production Readiness must rerun the specific relevant scale contracts on the
current architecture and either satisfy them or replace them with a justified,
explicit production SLO. It may not silently widen old timeouts.

### 5. Backup production confidence

Backup implementation and synthetic migration/restore evidence are substantial,
but production readiness requires current-version round-trip evidence, clear
size boundaries and a safe rollback story before daily-profile mutation.

A production claim must not imply that the current 64 MB / 100,000-item restore
limit covers every 100k-Source archive.

### 6. Real retrieval/use value

The current PRODUCT and ROADMAP explicitly say real repeat-use evidence is still
pending. Search, Revisit and reuse paths are engineered, but production trust is
not only "data was captured"; it also requires that archived material can
actually be found and reread in ordinary use.

### 7. Failure recovery without an engineer

A daily product cannot require repository debugging when capture pauses, Chrome
restarts, an adapter mismatch appears or an update fails. Existing diagnostics
are a foundation; the package must verify that an ordinary failure has a safe,
bounded recovery path and cannot silently masquerade as success.

## Product decision

For this package, **feature expansion is frozen**.

The priority order is:

1. current exact-main truth;
2. live capture compatibility;
3. daily-profile durability and rollback;
4. Backup/restore and scale;
5. real core-loop usefulness;
6. final release/private-beta certification.

Semantic retrieval is intentionally deferred. A future semantic package must be
justified by measured retrieval failures after the lexical/current Reader system
is production-trusted, not by architecture enthusiasm.

## Risk register

| Risk | Current assessment | Required closure |
|---|---|---|
| Live ChatGPT markup/response drift | Unverified | PRD-02 real-site canary |
| Silent missed eligible message | Not globally provable | Bounded canary reconciliation + visible failure state |
| Duplicate Source/snapshot | Strong synthetic evidence | Reconfirm live + restart/update |
| Wrong source timestamp | Conservative implementation, live availability unknown | Real evidence or explicit unknown |
| Daily update damages archive | Not production-certified | PRD-03 backup, update, restart, invariant checks |
| Backup cannot recover current state | Strong implementation, production round-trip incomplete | PRD-04 isolated restore |
| Large archive becomes unusable | Historical performance debt exists | PRD-04 scale SLO |
| Search/Reader technically works but user returns to ChatGPT instead | Product evidence pending | PRD-05 real-use canary |
| Failure requires engineering intervention | Partial diagnostics | Recovery drills + explicit operator guidance |
| New feature work expands privacy surface before trust is proven | High strategic risk | Package non-goals + separate authorization |

## PRD-00 verdict

The architecture is suitable for production-readiness work without a new durable
data model.

No schema migration, provider expansion or semantic subsystem is justified by
this audit.

Proceed to PRD-01: exact-main baseline and certification-debt reconciliation.
