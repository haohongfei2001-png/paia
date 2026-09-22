# Execution Protocol — PAIA ChatGPT Project Recognition v1

## Authority

GitHub remote `main` plus this package's `STATUS.md` are authoritative.

## Start gate

No CPR round may begin while package_status is `BLOCKED_BY_PRD02`.

PRD-02 must first be canonically COMPLETE on remote main.

## One-round rule

One owner continuation instruction authorizes at most one READY CPR round.

After the round is COMPLETE, FAIL or BLOCKED and its receipt/status are
published, stop. Do not automatically start the next CPR round or PRD-03.

## Real-site privacy

Live discovery/certification must use normal owner-authorized ChatGPT activity.

Do not:

- crawl historical account data;
- read or export private bodies for Git evidence;
- send test messages unless explicitly necessary and owner-authorized;
- mutate Project membership on ChatGPT;
- delete/rename/move real Projects for testing.

Prefer passive observation of naturally occurring Project and non-Project
navigation.

## Failure semantics

A provider capability that cannot be proven remains unverified. Do not weaken
the contract or infer Project facts to achieve PASS.

If the three required capabilities cannot be safely verified, package closure is
FAIL/BLOCKED and PRD-03 remains blocked.

## Publication

For code-bearing rounds: targeted tests → candidate required CI → review → merge
→ exact-main CI → receipt/status → remote readback → release writer → stop.
