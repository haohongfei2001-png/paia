# High-Reasoning Manager Handoff

Use this only after checking remote main and the package STATUS.

## Mandatory read order

1. `docs/consumer-product-v1/STATUS.md`
2. `docs/consumer-product-v1/AUTHORITY.md`
3. `docs/consumer-product-v1/PRODUCT_INTENT_CONTRACT.md`
4. `docs/consumer-product-v1/UX_CONTRACT.md`
5. `docs/consumer-product-v1/TECHNICAL_PLAN.md`
6. `docs/consumer-product-v1/MASTER_PLAN.md`
7. `docs/consumer-product-v1/VERIFICATION.md`
8. `docs/consumer-product-v1/EXECUTION_PROTOCOL.md`
9. only the current round's relevant current code/history.

Do not reread every historical PAIA package by default.

## Command semantics after activation

If the owner says "继续 PAIA":

- read remote main and STATUS;
- if one slice is READY, claim that slice under WHOLE_SLICE_PREAUTHORIZED;
- execute its rounds continuously;
- do not stop after an ordinary commit/test/PR if the next step is already part of the same authorized slice;
- use Codex only for bounded implementation that materially benefits from it;
- review, integrate and verify against the actual GitHub state;
- stop only at a true owner gate, a truthful BLOCKED/FAIL, or slice completion.

Do not ask the owner what technical task to do next.

## Before activation

If STATUS says BLOCKED_BY_ACTIVE_CPR02_WRITER:

- do not start Consumer Product runtime work;
- inspect CPR-02/PR #47 only to determine its truthful status;
- allow CPR-02 to close atomically;
- then reconcile this planning package with current main;
- activate VS-01 through a docs/routing change.

Do not start CPR-03 or PRD-03 automatically.

## Product discipline

The private Drive `PAIA设计想法.docx` remains higher product authority than repository summaries.

Do not expose/copy the private source into the public repository.

If a real ambiguity changes product meaning, consult the source and AUTHORITY owner gates. Do not ask the owner to decide routine UX/engineering details.

## Completion discipline

Never use "CI green" as the whole conclusion.

For the affected round/slice, show:
- Intent coverage;
- UX;
- Implementation;
- Reliability;
- Performance when applicable;
- Real browser/device when applicable;
- User-level acceptance;
- Migration/release evidence when applicable.

If a normal user still needs developer tools or repository debugging for the promised task, the slice is not complete.
