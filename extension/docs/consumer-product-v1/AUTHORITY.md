# Authority and Source Policy

## AI Context Cards v2 — scoped owner decision, 2026-10-07

The owner explicitly approved the four-card design and requested its conversion into a development plan in GitHub. [The adoption](AI_CONTEXT_CARDS_V2_ADOPTION.md), [canonical plan](AI_CONTEXT_CARDS_V2_PLAN.md) and [visual references](AI_CONTEXT_CARDS_V2_REFERENCES.md) are the current AI Context product/design authority. Original design review-pending labels are historical; no production capability or production visual acceptance is implied.

This latest explicit decision supersedes only conflicting AI Context requirements in PRODUCT_INTENT_CONTRACT.md §10, UX_CONTRACT.md's Context flow, TECHNICAL_PLAN.md and ARCHITECTURE.md's compiler-only/body-store limitation, the retained former VS-06/CPV1-06 plan, desktop-vnext/FROZEN_CONTRACT.md F-07, and D6/D7 Context journey/state/acceptance mappings. The old standalone Context design is not an alternative. Info/Rules/Now now own independent Items; Inputs remains a Topic-access reference. This is not permission to copy the full Archive/Thought corpus or alter their truth ownership.

The replacement visual-state mapping is AI_CONTEXT_CARDS_V2_REFERENCES.md; the replacement verification and dependent-gate requirements are plan §§7–8, applied through existing VERIFICATION.md and DEFERRED_FINAL_GATES.md rather than a parallel process. The unchanged text of the lower-order documents remains history/compatibility where it conflicts. This explicit supersession is effective without treating its historical PASS as a new PASS. Future edits should label affected paragraphs rather than resume them.

The approved shell, brand and non-Context visuals remain. Thought Library is a separate design task. Current consumer-cleanup cancellations, including exports, backup generation and BYO/direct provider transport, remain in force. The design does not authorize new payment, recurring costs, external account connections, cloud uploads, destructive migrations, public release or runtime implementation in this documentation task. Source eligibility, human work, revocation, read/write separation and unresolved affected gates remain protected.

## 1. Product authority

The authority order for PAIA Consumer Product v1 is:

1. Explicit latest product-owner decisions for their stated scope, including the AI Context decision above.
2. Google Drive: PAIA设计想法.docx, where not superseded by a later explicit owner decision.
3. PRODUCT_INTENT_CONTRACT.md and explicitly adopted scoped contracts — public executable derivations; AI Context uses AI_CONTEXT_CARDS_V2_PLAN.md where specified above.
4. UX_CONTRACT.md and the current explicitly approved visual/interaction references.
5. TECHNICAL_PLAN.md and MASTER_PLAN.md — implementation strategy and sequencing.
6. Existing PRODUCT.md / ARCHITECTURE.md / ROADMAP.md and active historical package contracts, only where they do not contradict higher product intent.
7. Current implementation — evidence of what exists, never proof of what the product should be.

The current codebase must not redefine the product merely because a capability is difficult to implement or was previously frozen for validation. Newer explicit owner choices control conflicts; do not invoke an older Drive paragraph to undo the approved four-card model.

## 2. Private-source rule

The repository is public.

Do not copy the full Drive design document, the full Pro audit artifact, private archive content, private screenshots, personal examples, or source paragraph dumps into this repository.

The executable public contract should contain only the minimum product decisions required to build PAIA. If a future executor needs to resolve ambiguity, it must read the authorized Drive source directly and record only the resulting decision, not mirror the private source text.

Planning source checkpoints:

- Design-intent source referenced by the 2026-09-23 audit: PAIA设计想法.docx.
- The audit records the design-source SHA-256 as `d61b141afdeb794b74ffe627e12b0a2530acca53aa94e9f28b6d8c2f13c08824`.
- Planning GitHub baseline: `fa1a6c6452153bb99ec24cdd8662b5d8c6a9371a`.

These checkpoints identify evidence; they do not make the audit artifact repository authority.

## 3. Product fixed, implementation negotiable

Product intent may not be deleted because of:

- current architecture inconvenience;
- current UI limitations;
- engineering complexity;
- low current usage;
- current test gaps;
- a desire to make the product look simpler;
- an earlier roadmap freeze whose purpose was sequencing or validation.

Implementation may be changed aggressively when required, including:

- provider adapters;
- capture lifecycle;
- UI architecture;
- routing and state ownership;
- search/retrieval technology;
- storage implementation details;
- Backup execution, only within current scope (user backup generation remains cancelled);
- updater/distribution path;
- component system;
- deployment/service boundaries.

Any migration must preserve the protected data/authorization invariants in TECHNICAL_PLAN.md. The Context Item product justification does not by itself approve an arbitrary schema or destructive migration.

## 4. Conflict handling

Do not silently choose between incompatible product meanings.

The currently known owner-decision gates are:

- B-01: whether an existing/old Thought may be directly edited, versus corrections being appended as new Thought material.
- B-02: permanent Source deletion boundary for user-rewritten derivative material.
- B-03: long-term default data residency and cloud relationship.
- B-04-3A: **resolved by owner decision 2026-10-05** for Prompt Reuse Stage 3A only. After an explicit, default-off enablement, PAIA may locally and ephemerally analyze only the newly completed latest assistant reply in the current supported conversation. The reply is not durably retained, not added to Archive/Thought/Context/Source/Backup/logs, and is not sent to an external model. Disable/revoke stops reading and clears transient candidates without disabling Stage 1/2.
- B-04-3B: remains an owner gate for any broader reply scope, durable reply retention/evidence, external/model processing, model-generated next prompts or use of reply access outside the approved Stage 3A purpose.
- B-05: regions, service burden and commercial commitments.

These gates block only the rounds that need them. They do not block unrelated work. For CTX4, record concrete extraction-service, real-client/transport, paid activation and data-residency dependencies under the existing deferred-gate process. The four-card design does not resolve B-01/B-02/B-03 by implication.

Ordinary UX/engineering questions are not owner gates. The manager decides them against the higher contracts.

## 5. Historical package relationship

Existing ANS, UIS, UIR, UX-R, PRD and CPR work remains valid evidence and useful implementation. Once this package activates:

- completed historical packages must not be resumed as competing queues;
- unfinished correct work is absorbed into the relevant slice;
- historical PASS does not automatically satisfy a Consumer Product v1 slice;
- historical FAIL remains evidence and must not be erased;
- previous freezes remain safety/evidence constraints only where they still serve higher product intent.

The pre-CTX4 STATUS and MASTER_PLAN are retained byte-for-byte in same-directory dated snapshots. Current STATUS and MASTER_PLAN remain the routing entrypoints; retained non-Context plan details are unchanged subject to later decisions. AI_CONTEXT_LEGACY_PRE_CTX4.md preserves the old implementation contract without making it current product direction.

## 6. No false completion

A round or slice cannot be marked complete merely because:

- tests are green;
- a fallback is correct;
- a component exists;
- a screenshot looks cleaner;
- a synthetic DOM path passes;
- the user can recover only through developer tools;
- a future target was removed from scope.

Completion is governed by VERIFICATION.md and the applicable scoped plan. CTX4 separately requires local-data, security, whole-content, model-fidelity, real-connection and production-visual evidence. Prototype 78/78 and design approval are not production certification.
