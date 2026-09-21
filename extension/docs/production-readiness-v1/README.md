# PAIA Production Readiness v1

Package: `PAIA-PRODUCTION-READINESS-v1`

Status: **FROZEN / EXECUTION NOT YET STARTED BEYOND PRD-00**

This package turns PAIA from a strongly tested engineering system into a product
that can be relied on for daily personal use. It does not add another feature
category. It closes the gap between implementation success and production
evidence.

## Product question

The package answers one operational question:

> Can PAIA quietly and reliably preserve eligible things I say to ChatGPT,
> keep them durable through normal browser/update/restart events, let me find
> and reread them later, and recover safely without ongoing maintenance?

The target loop is:

```text
real eligible input
  -> captured with stable Source identity
  -> durable local archive
  -> readable/retrievable later
  -> reusable under existing authorization
  -> recoverable through Backup
```

A green synthetic suite is necessary but not sufficient for this package.

## Baseline facts

Planning baseline: `main@3565a00e213c6d5001a300965a00006628db3f51`.

At this baseline:

- Archive Navigation & Source Structure v1 is COMPLETE through ANS-09.
- PR #38 browser/CI maintenance is merged.
- Capture Foundation Hardening v1 is present in current main.
- Its historical certification explicitly remains
  `acceptanceComplete=false` and `productionCertified=false`.
- The later ANS certification establishes strong current engineering coverage,
  but does not by itself certify current logged-in ChatGPT behavior, the user's
  daily Chrome installation/data upgrade path, or longitudinal real-use value.
- PAIA still has stronger engineering validation than product validation.

## Non-goals

This package does **not** authorize:

- ANS-10 or continuation of completed UX/UI packages;
- Semantic Engine integration, embeddings, vectors, new Topic ontology or
  automatic semantic classification;
- new live providers or broader host permissions;
- assistant-response capture, drafts, keystrokes, clipboard, browser history,
  cookies, credentials or account-wide crawling;
- cloud sync, a Web/mobile clone, remote archive storage or a new body-text
  truth layer;
- background Organizer calls, hidden paid requests or automatic paid retries;
- broad Passport/MCP/agent access;
- weakening tests, timeouts, privacy fences, tombstones, source identity or
  authorization semantics to achieve certification.

Any such work requires a separate owner-authorized package.

## Production definitions

Three states are intentionally separate.

### Engineering green

The exact tested source passes the required current automated and browser gates.

### Release-candidate certified

Engineering green plus current-site capture evidence, update/restart durability,
Backup/restore and bounded scale requirements are satisfied.

### Production certified

Release-candidate certification plus a real daily-use canary demonstrates that
capture, retrieval, rereading and recovery work in ordinary use without silent
data loss or recurring operator repair.

No document may use `productionCertified=true` before every mandatory gate in
`VERIFICATION.md` is satisfied.

## Evidence hierarchy

When evidence conflicts, prefer:

1. exact remote main and canonical package status;
2. exact-head required CI;
3. sanitized real-site / daily-profile evidence;
4. isolated real-browser evidence;
5. deterministic synthetic/unit evidence;
6. historical receipts;
7. developer statements.

Real private content never becomes Git evidence. Only bounded counts, hashes,
state transitions and sanitized fixture identifiers may be committed.

## Execution model

`STATUS.md` is the only queue for this package. Execute one READY round at a
time. Completion requires its receipt/status update on remote main and the
required exact-head checks. Do not automatically enter the next round from the
same execution.

Read before every round:

1. `extension/AGENTS.md`
2. `extension/PRODUCT.md`
3. `extension/ARCHITECTURE.md`
4. `extension/ROADMAP.md`
5. this README
6. `AUDIT.md`
7. `DEVELOPMENT_PLAN.md`
8. `VERIFICATION.md`
9. `EXECUTION_PROTOCOL.md`
10. `STATUS.md`
11. the previous PRD receipt, when one exists
