# PAIA Consumer Product v1

Status: planning package. This branch contains documentation only.

This package converts the product-owner design intent into a single executable development system for PAIA. It does not redefine the product, and it does not treat the current implementation as product authority.

## Purpose

PAIA has accumulated substantial engineering, tests and historical execution packages, but user-visible quality has not converged at the same rate. The next phase therefore changes the delivery unit:

- from module/gate completion to complete user tasks;
- from UI patch layers to one coherent product shell and state ownership;
- from synthetic engineering PASS alone to reliability + performance + real-browser + user-level acceptance;
- from current-implementation-led scope to design-intent-led implementation.

No standalone Figma/prototype phase is required. Production implementation itself is the interactive validation surface. UI work is not complete until the real product satisfies the UX contract on realistic long-form data and failure states.

## Files

- AUTHORITY.md — authority order, private-source rules and conflict handling.
- PRODUCT_INTENT_CONTRACT.md — executable product contract derived from the owner's design intent.
- UX_CONTRACT.md — consumer-grade interaction and presentation contract.
- TECHNICAL_PLAN.md — keep/refactor/rewrite/add strategy and migration boundaries.
- MASTER_PLAN.md — twelve vertical slices and detailed round sequence.
- VERIFICATION.md — package-wide Definition of Done and evidence classes.
- EXECUTION_PROTOCOL.md — how a High-reasoning manager executes the plan without repeatedly returning ordinary engineering choices to the owner.
- STATUS.md — the only package queue after activation.

## Activation interlock

At planning baseline main fa1a6c6452153bb99ec24cdd8662b5d8c6a9371a, ChatGPT Project Recognition CPR-02 is IN_PROGRESS and writer-claimed. This package must not race it.

This package remains PLANNED until:

1. CPR-02 reaches a truthful terminal state and its writer is RELEASED;
2. any correct CPR-02 runtime work is preserved;
3. the planning branch is rebased/reconciled against the then-current main;
4. activation updates current routing documents without weakening existing Source, edit, deletion, Backup or authorization invariants;
5. STATUS.md explicitly marks VS-01 READY.

A planning PR may exist while CPR-02 runs. It may not authorize runtime changes.

## Development model

A vertical slice is a complete user capability. A round is one bounded construction/verification step inside that capability.

Default owner command after activation: "继续 PAIA" authorizes the currently READY slice as WHOLE_SLICE_PREAUTHORIZED. The manager may execute its ordinary engineering rounds continuously. It stops only at the slice boundary or at a true owner gate defined in EXECUTION_PROTOCOL.md.

Historical packages remain evidence. They are not parallel execution queues once this package becomes active.
