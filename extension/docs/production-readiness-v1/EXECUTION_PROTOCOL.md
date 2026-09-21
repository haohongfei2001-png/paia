# PAIA Production Readiness v1 — Execution Protocol

## Authority

GitHub remote `main` plus this package's canonical `STATUS.md` are the source
of truth.

Local clones, old chats, unpacked extension directories and historical receipts
are evidence/workspaces, not current execution authority.

## One-round rule

Only one PRD round may be IN_PROGRESS.

A new owner instruction to continue this package authorizes the one round marked
READY in STATUS. The execution must stop after that round is completed, blocked
or failed and its evidence is published.

Do not automatically start the next round.

## Writer discipline

Before any implementation:

1. re-read remote main and STATUS;
2. claim the current READY round in durable docs/status;
3. use one writer branch/worktree or one explicitly controlled writer;
4. inspect any existing PR/worktree before creating parallel code;
5. never let a stale agent remain an implicit second writer.

Maintenance discovered during a round may be fixed only if it is necessary to
close that round and does not expand product scope.

## Real-profile safety

Rounds PRD-02 and later may involve real-site or daily-profile evidence.

They must:

- keep private content local;
- avoid sending/deleting/editing real ChatGPT content merely for testing unless
  the owner explicitly authorizes that exact action;
- prefer observation of normal activity or a dedicated canary;
- create/validate a PAIA Backup before any daily-profile update in PRD-03;
- never restore into a non-empty daily archive as a test;
- perform restore tests in isolated empty profiles;
- preserve permanent deletion/tombstone semantics;
- stop rather than guess when identity, consent or Source evidence is ambiguous.

## Failure semantics

A failed mandatory gate remains failed.

Allowed outcomes for a round are:

- COMPLETE / PASS;
- COMPLETE / FAIL when the purpose was an experiment/audit whose result is
  legitimately negative;
- BLOCKED with a specific external/owner/environment dependency.

Do not relabel a failed gate PASS because a narrower targeted test passed.

Do not use a later different population/environment as if it retroactively
changes the earlier result.

## CI and publication

For code-bearing rounds:

1. targeted regression;
2. required package/static/privacy checks;
3. candidate required CI;
4. review actual failures/artifacts;
5. merge/publish;
6. exact-main required CI where the package requires it;
7. publish receipt and update STATUS;
8. re-read remote main;
9. release writer and stop.

Docs-only PRD-00 may publish without changing runtime behavior, but it still must
be readable from remote main before PRD-01 is executable.

## Scope escalation

Stop and require a separate owner decision if closure would require:

- a durable content-schema change;
- a new provider/host permission;
- a new category of collected private data;
- cloud storage/sync authority;
- automatic paid AI behavior;
- changing Source identity, deletion or authorization semantics;
- weakening an established safety/privacy invariant.

An ordinary bug fix, test repair or internal performance optimization inside the
existing contract does not need product re-approval.

## Package completion

PRD-06 may mark the package COMPLETE only when VERIFICATION's production gates
are satisfied.

If the product is technically sound but the daily-use canary shows insufficient
retrieval value, record that result honestly. The package must not manufacture a
"production certified" claim by adding unrelated features.
