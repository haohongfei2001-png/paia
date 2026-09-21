# PAIA Production Readiness v1 — Development Plan

This plan is frozen by PRD-00. A later amendment must preserve historical
evidence and may not weaken a failed gate merely to advance the package.

## PRD-00 — Audit and package freeze

Status at publication: COMPLETE.

Deliverables:

- baseline audit;
- production definitions and non-goals;
- verification matrix;
- execution protocol;
- canonical queue;
- current PRODUCT/ROADMAP/AGENTS routing.

Runtime changes: **none**.

Exit: package is published on remote main and PRD-01 is the only READY round.

## PRD-01 — Exact-main baseline and certification-debt reconciliation

Purpose: establish one truthful current baseline before touching production
behavior.

Work:

- resolve exact remote main after the package publication;
- run/inspect all required PAIA Certification gates on that exact head;
- rerun the Capture Foundation targeted regression set on current code;
- explicitly rerun or account for the historically failed 10k/100k performance
  contracts relevant to current production paths;
- compare current results with the historical Capture Foundation receipt rather
  than overwriting history;
- inspect current release build/guardrails and compatibility gate semantics;
- classify every remaining failure as current defect, obsolete historical
  contract with documented replacement, environment limitation or later-round
  real-site requirement.

Constraints:

- no production feature expansion;
- no timeout increase merely to obtain green;
- no daily-profile mutation;
- no real private archive content in artifacts.

Exit:

- exact-head engineering baseline is green except explicitly deferred real-site /
  daily-profile gates;
- no unexplained current automated failure remains;
- a PRD-01 receipt records exact runs and debt disposition.

## PRD-02 — Current logged-in ChatGPT capture canary

Purpose: prove that the current live provider surface still satisfies PAIA's
capture contract.

Use a narrowly declared canary scope. Prefer an isolated canary conversation or
normal user activity with explicit owner authorization. Do not crawl account
history.

Required observations include:

- ordinary new user message;
- repeated observation/reload without duplicate Source creation;
- multiple user messages in one conversation;
- SPA navigation away/back;
- source time when reliable live evidence exists, otherwise explicit unknown;
- no assistant body, draft/editor text or credential/request-body capture;
- adapter mismatch/failure visibility;
- current release build parity with source.

Evidence committed to Git must be sanitized counts/hashes/states only. No real
message body, title, conversation ID, URL or credential.

Exit:

- all eligible messages in the declared canary window reconcile to durable
  Source/snapshot state or an explicit failure;
- no forbidden-content capture;
- live contract version and limitations are documented;
- no claim of account-wide completeness.

## PRD-03 — Daily-profile update, restart and recovery canary

Purpose: prove ordinary ownership/lifecycle behavior on the actual daily
installation without risking irreversible loss.

Preconditions:

- PRD-02 COMPLETE;
- a current PAIA Backup is created and validated locally before code deployment;
- runtime path and extension identity are confirmed;
- rollback code is available;
- no pending destructive archive operation.

Exercise:

- update the existing unpacked runtime through the documented updater path;
- reload the existing extension;
- restart Chrome;
- verify extension identity and existing archive invariants;
- verify a bounded pre-existing sample remains readable;
- perform one new post-update capture;
- verify duplicate safety after another reload/restart;
- test a bounded failure/recovery path without deleting real content.

Private evidence remains local. Git stores only sanitized counts/digests and
state transitions.

Exit:

- no loss/reclassification of pre-existing trusted data;
- new capture works after update/restart;
- rollback/recovery path is usable;
- no recurring manual code repair is required.

## PRD-04 — Backup/restore and scale durability

Purpose: certify durability at current supported boundaries.

Work:

- produce a current-version Backup from synthetic/controlled data and verify its
  integrity contract;
- restore into an empty isolated profile and compare durable domain state;
- verify tombstone/deletion precedence and no credential/temporary authorization
  resurrection;
- verify current migration/restart path from at least the declared supported
  historical baseline;
- execute large-library Reader/search/capture/Backup-relevant performance gates;
- publish explicit supported size/SLO boundaries instead of implying unlimited
  scale;
- preserve known Backup v1 64 MB / 100,000-item semantics unless a separately
  justified change is required.

Exit:

- round-trip correctness and supported scale boundaries are explicit and green;
- no unexplained performance gate remains;
- production docs say what happens beyond supported bounds.

## PRD-05 — Daily core-loop canary

Purpose: test product usefulness, not add product features.

The canary must use the existing product:

```text
Capture -> later Find/Read -> optional Thought/Reuse -> return again
```

Required evidence is local/private by default. Product Signals may be explicitly
enabled if the owner chooses; they must remain observation-only.

Minimum evidence set:

- multiple ordinary capture sessions on different days/sessions;
- retrieval of material not from the current conversation/session;
- at least one Search/Reader reopening flow;
- at least one explicit reuse/Context-preparation flow if relevant to real work;
- no silent capture-failure episode;
- no recurring engineering intervention to keep PAIA operational.

This is not a growth experiment. No notification loop or opaque recommendation
may be introduced to manufacture return use.

Exit:

- the owner can use PAIA for the stated core loop with materially less friction
  than manually returning to ChatGPT history for at least one recurring task;
- observed misses are classified. If semantic retrieval is proposed afterward,
  it must be justified by those misses.

## PRD-06 — Release and Private Beta certification

Purpose: close the package and issue a bounded production claim.

Required:

- PRD-01 through PRD-05 COMPLETE;
- exact candidate/main certification;
- current release build and package/privacy guards;
- production limitations and recovery documentation aligned;
- no stale READY round or active writer;
- final receipt with all prior evidence links;
- `acceptanceComplete=true` only if every mandatory package acceptance gate is
  complete;
- `productionCertified=true` only if every production gate in VERIFICATION is
  PASS.

Output:

- one certified PAIA release/private-beta baseline;
- explicit unsupported boundaries;
- no automatic next feature package.

After PRD-06, future work requires a separately authorized product package.
