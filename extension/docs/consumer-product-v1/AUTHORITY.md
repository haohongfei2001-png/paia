# Authority and Source Policy

## 1. Product authority

The authority order for PAIA Consumer Product v1 is:

1. Google Drive: PAIA设计想法.docx — highest product-intent source.
2. Explicit later product-owner decisions.
3. PRODUCT_INTENT_CONTRACT.md — public executable derivation of the highest source.
4. UX_CONTRACT.md — implementation-level UX translation.
5. TECHNICAL_PLAN.md and MASTER_PLAN.md — implementation strategy and sequencing.
6. Existing PRODUCT.md / ARCHITECTURE.md / ROADMAP.md and active historical package contracts, only where they do not contradict higher product intent.
7. Current implementation — evidence of what exists, never proof of what the product should be.

The current codebase must not redefine the product merely because a capability is difficult to implement or was previously frozen for validation.

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
- Backup execution;
- updater/distribution path;
- component system;
- deployment/service boundaries.

Any migration must preserve the protected data/authorization invariants in TECHNICAL_PLAN.md.

## 4. Conflict handling

Do not silently choose between incompatible product meanings.

The currently known owner-decision gates are:

- B-01: whether an existing/old Thought may be directly edited, versus corrections being appended as new Thought material.
- B-02: permanent Source deletion boundary for user-rewritten derivative material.
- B-03: long-term default data residency and cloud relationship.
- B-04: prompt-assistant access to AI replies, including retention and external processing.
- B-05: regions, service burden and commercial commitments.

These gates block only the rounds that need them. They do not block unrelated work.

Ordinary UX/engineering questions are not owner gates. The manager decides them against the higher contracts.

## 5. Historical package relationship

Existing ANS, UIS, UIR, UX-R, PRD and CPR work remains valid evidence and useful implementation. Once this package activates:

- completed historical packages must not be resumed as competing queues;
- unfinished correct work is absorbed into the relevant slice;
- historical PASS does not automatically satisfy a Consumer Product v1 slice;
- historical FAIL remains evidence and must not be erased;
- previous freezes remain safety/evidence constraints only where they still serve higher product intent.

## 6. No false completion

A round or slice cannot be marked complete merely because:

- tests are green;
- a fallback is correct;
- a component exists;
- a screenshot looks cleaner;
- a synthetic DOM path passes;
- the user can recover only through developer tools;
- a future target was removed from scope.

Completion is governed by VERIFICATION.md.
