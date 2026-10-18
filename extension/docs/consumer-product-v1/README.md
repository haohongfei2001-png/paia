# PAIA Consumer Product v1

Current floating-input amendment: **PAIA-FLOAT-UI-1.3 / approved R3 shared control corner / 2026-10-18**. The fixed48px control becomes the unified capsule end and the336×328 board's right-bottom quarter-circle; existing tools move to the bottom; six full rows remain; custom/native-title hover hints are removed. Exact R3 reference source is incorporated, not production runtime. See the existing [NIB plan](NARROW_INPUT_BOARD_V4_PLAN.md), [adoption ledger](NARROW_INPUT_BOARD_V4_ADOPTION.md) and [approved references](NARROW_INPUT_BOARD_V4_REFERENCES.md). Programme execution is routed by current [STATUS](STATUS.md) and [AUTHORITY](AUTHORITY.md); the package/activation statements below describe the original planning baseline. This scoped adoption changes no runtime or global schedule.

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
- PROMPT_REUSE_SURFACE.md — owner-approved stable product/interaction contract for personal high-frequency prompt reuse across supported AI pages.
- PROMPT_REUSE_STAGE_3A.md — owner-approved B-04-3A, local Reply → Next Action detector, transient capsule and Stage 3A evaluation/development contract.
- [NARROW_INPUT_BOARD_V4_SPEC.md](NARROW_INPUT_BOARD_V4_SPEC.md) / [PLAN](NARROW_INPUT_BOARD_V4_PLAN.md) / [REFERENCES](NARROW_INPUT_BOARD_V4_REFERENCES.md) — current PAIA-FLOAT-UI-1.3/R3 authority and existing S0–S4 plan; exact preceding1.2 contracts are retained in PRE_R3 archives, and the exact runnable R3 source is under design/narrow-input-board-v4/fusion-r3-2026-10-18/.
- prompt-reuse-visual-v1/ — historical Prompt visual reference; superseded where the current NIB adoption ledger specifies a later decision.
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
