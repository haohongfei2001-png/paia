# PAIA Product

Status: **current product source of truth**

Current runtime: **v0.12.0 — Thought Evolution & Shared Context**

This document defines what PAIA is now, what it is trying to become, and which product bets are intentionally frozen while they are being validated. Historical version specifications remain evidence of past implementation decisions, but they do not override this document for new product work.

## 1. Product definition

PAIA is a **local-first personal AI input and context system**.

Its job is not merely to archive prompts. PAIA helps a person preserve what they said to AI, read it again as durable personal material, organize recurring ideas without losing the original expression, and selectively reuse relevant context with AI later.

The current product loop is:

**Catch → Read → Remember → Organize → Reuse**

A cross-cutting authorization layer, **Passport**, is the long-term mechanism for deciding which AI or tool may use which parts of that personal context.

PAIA is not intended to become another general note editor, another chat client, or an autonomous agent that silently rewrites a person's archive.

## 2. Product thesis

AI conversations are producing a rapidly growing body of user-authored material: questions, judgments, preferences, decisions, plans, hypotheses, personal explanations and evolving ideas. Today most of that material remains trapped inside individual AI products and is difficult to reread, search, compare over time or reuse elsewhere.

PAIA's core thesis is:

> A person's own AI inputs are a durable personal data asset and should remain readable, attributable, editable without destroying provenance, and reusable across future AI interactions under explicit user control.

The strongest near-term product promise is deliberately narrower:

> **Important things I have said to AI should be easier to reread, find and reuse in PAIA than in the original AI application.**

If this promise does not hold in real use, deeper organization, memory and authorization features do not have a strong foundation.

## 3. Capability model

The following six capabilities describe the product. They are **not six required pages** and must not automatically become six separate durable data layers.

### 3.1 Input Catch

Purpose: reliably acquire eligible user-authored AI inputs with stable source identity and provenance.

Current state:

- ChatGPT Web capture is implemented.
- Historical completion/import paths exist under explicit user action.
- Source snapshots are immutable facts and remain separate from editable working content.

Direction:

- Keep the capture adapter boundary provider-specific and the archive model provider-neutral.
- A second source adapter is useful later as an architecture test, but broad source expansion is not the next product priority.

### 3.2 Input Reader

Purpose: make archived inputs substantially better to read and revisit than the original chat history.

Current state:

- Continuous reading, editing, search, ordering and source navigation exist.
- v0.12.0 already moves primary reading surfaces toward quieter, content-first presentation.

Direction:

- Reader is a **presentation capability**, not a new database.
- It should be reusable for Inputs, Thoughts and later Context history.
- Reader and Search are the highest-priority product improvements after this consolidation round.

### 3.3 Thought Record

Purpose: preserve durable ideas that recur across conversations while retaining evidence back to the user's own expressions.

Current state:

- Topic / Section / Entry organization, provenance, revision history and human protection semantics exist.
- Exact original Thoughts may share canonical working content with an Input only when the relationship is unambiguous.

Direction:

- The current Thought Library is feature-complete enough for validation.
- Do **not** add new Thought entities or new automatic organization layers merely because they are technically possible.
- Prefer better reading, retrieval and product validation over further Thought Library feature expansion.

### 3.4 Thought Organize

Purpose: help the user turn accumulated expressions into a more useful current view without erasing uncertainty, contradictions or historical evolution.

Current state:

- Explicit bounded Organizer/AI presentation flows exist.
- v0.12.0 includes evidence-grounded current understanding and thought-evolution reading.
- AI-generated organization is separated from Source and protected human work.

Direction:

- Treat organization as a derived projection over trusted data, not as the owner of personal truth.
- No hidden background paid requests, automatic retries or silent AI rewrites.
- Further sophistication is frozen until real usage shows that organization is a retention driver.

### 3.5 AI Context

Purpose: compile relevant, authorized personal material into context that can be reused with AI.

Current state:

- Local Context retrieval/build/preview exists.
- Current retrieval is primarily lexical/structural and intentionally conservative.
- Copy/export is explicit and stale previews cannot be shared until rebuilt.

Direction:

- The current feature should be understood as a **Context Compiler**, not yet a universal AI memory service.
- Establish a stable Context Package concept before adding more external integrations.
- Search/retrieval should become a shared service so Input, Thought and Context do not evolve separate retrieval stacks.

### 3.6 Passport

Purpose: define and audit what an AI, agent or external tool may access, for what purpose and for how long.

Current state:

- Authorization already exists in several places: Topic/Profile allow/deny/never, exclusions, external-access controls, provider consent and bounded AI actions.
- These controls are not yet a single user-facing Passport product.

Direction:

- Passport is a **cross-cutting governance layer**, not a fourth or fifth body-text database.
- A future minimum grant should model consumer, purpose, resource scope, permissions, duration/expiry and revocation.
- A corresponding access log should answer: what used what, when and under which grant.
- Do not build a broad permission operating system before Context reuse itself proves valuable.

## 4. Product architecture from a user's point of view

The product should conceptually behave like this:

```text
Capture
  ↓
Source Record
  ↓
Working Input ────────────────┐
  ↓                           │
Thought evidence / Topics     │
  ↓                           │
Organized projections         │
  ↓                           │
Context package ─────→ AI     │
                              │
Reader shows trusted layers ──┘

Passport governs external use across the system.
```

Important consequences:

- Reader does not own another canonical copy of text.
- AI Context does not become a fourth body-text truth store.
- Passport does not own content; it owns authorization and audit metadata.
- Derived views may be rebuilt. User-authored facts and edits must not be silently regenerated away.

## 5. Current product priorities

For the next development stages, priorities are:

1. **Rereading quality** — opening PAIA should feel useful before the user invokes any AI organization.
2. **Retrieval quality** — users should be able to find an old expression even when they do not remember the original chat.
3. **Reuse rate** — Context generation/copy/export should solve a real repeated task rather than exist as an impressive demo.
4. **Trust** — source identity, deletion, edit boundaries, authorization and provenance must remain understandable and reliable.
5. **Complexity control** — new product value should not automatically imply a new durable entity or schema store.

## 6. Deliberate freezes

Until evidence justifies reopening them:

- No new Thought Library ontology layer.
- No new durable fact database for Reader.
- No automatic background Organizer.
- No broad cloud-sync implementation.
- No Web/mobile app merely to duplicate the extension UI.
- No knowledge graph as a product goal.
- No provider proliferation.
- No embedding/vector-store migration before a unified Search Service boundary exists and lexical retrieval limits are measured in real use.

These are product freezes, not claims that the ideas are permanently rejected.

## 7. Product validation

PAIA currently has stronger engineering validation than product-market validation. The next stage must therefore measure product behavior, preferably locally and without transmitting private archive content.

Useful local-only signals include:

- archived Inputs reopened after 1 / 7 / 30 days;
- searches that lead to opening or copying a result;
- Reader sessions that revisit older material rather than only the newest conversation;
- Thought Topics reopened after organization;
- AI-organized views that users edit, reject or switch away from;
- Context previews that are actually copied/exported;
- repeated Context use for the same broad purpose;
- time from install/import to first meaningful reread or reuse.

Raw private text is not required for these metrics.

## 8. Success gates for expansion

PAIA should not move into expensive multi-device or platform expansion merely because the architecture can support it.

Before prioritizing cloud sync, Web App or native apps, at least the following should be true in real use:

- Reader/Search is clearly better than returning to ChatGPT history for a meaningful class of tasks.
- Users repeatedly retrieve material older than the current session/week.
- Thought organization produces repeat visits rather than one-time curiosity.
- Context reuse occurs repeatedly enough that a cross-AI authorization layer solves an observed problem.

## 9. Relationship to historical documents

For new product work, this file is authoritative together with `ARCHITECTURE.md` and `ROADMAP.md`.

The following remain important evidence but are not current product source-of-truth documents:

- `PRODUCT_SPEC.md`
- `DECISIONS.md`
- version-specific `V*_*.md` and `ROUND*.md`
- foundation/acceptance documents
- `README_HISTORY.md`

`PRIVACY.md`, `BACKUP.md`, `AI_CONTEXT.md` and other feature contracts still contain detailed behavioral/security constraints for existing implemented features. Consult them when changing those features, but do not infer new product priorities from old version plans.