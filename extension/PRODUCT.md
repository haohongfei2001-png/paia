# PAIA Product

Status: **current product source of truth**

Current runtime baseline: **v0.12.0 + post-release consolidation rounds**

This document defines what PAIA is now, what it is trying to become, and which product bets are intentionally frozen while they are being validated. Historical version specifications remain evidence of past implementation decisions, but they do not override this document for new product work.

## 1. Product definition

PAIA is a **local-first personal AI input and context system**.

Its job is not merely to archive prompts. PAIA helps a person preserve what they said to AI, read it again as durable personal material, organize recurring ideas without losing the original expression, and selectively reuse relevant context with AI later.

The current product loop is:

**Catch → Read → Remember → Organize → Reuse**

A cross-cutting authorization layer, **Passport**, governs reusable external Context exports without owning another copy of the user's content.

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

Purpose: make archived inputs substantially better to read, find and reuse than the original chat history.

Current state:

- Continuous reading, editing, ordering, source navigation and local per-surface search exist.
- Reader search results can open directly around the matched Input and highlight the query.
- Input/Thought/Context lexical retrieval shares a common Search Service foundation.
- **Universal Search** provides one bounded local entry point across Input Archive, Thought Library and existing AI-organized projections without creating another search index or truth layer.
- Universal Search can reopen the matching Input/Thought/AI-organized location and can explicitly carry a selected result into AI Context as a local retrieval focus; it never auto-generates or auto-shares Context.
- **“以前的我”** is a time-oriented projection over matching Input expressions. It orders available source-send-time evidence from earlier to later and explicitly does not infer that the user's belief changed.
- **Revisit / 回访** is an on-demand local Reader surface. After the user explicitly establishes a baseline, it shows newly collected visible Inputs, Thought topics whose current organization has new/changed supporting material, and a small rotating set of older Inputs worth reopening.
- Older resurfacing is deliberately explainable: PAIA prefers Inputs at least 90 days old that the user edited or that already became Thought evidence; it does not use random engagement sampling or a hidden recommendation model.

Direction:

- Reader is a **presentation capability**, not a new database.
- Universal Search and Revisit are coordinators/projections over existing trusted state, not new truth stores.
- Revisit should remain user-initiated: no push-notification growth loop, no background AI generation, and no automatic marking-as-seen merely because the surface was opened.
- Longitudinal reading should remain grounded in attributable user expression; AI may later help retrieval only if it does not silently convert chronology into invented personal conclusions.
- Reader/Search/Revisit advantage still requires real-use validation rather than being inferred from implementation quality.

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

- Local Context retrieval/build/preview exists over existing AI Context Profile authorization.
- Retrieval shares the common lexical Search Service foundation with Input and Thought search.
- A stable **Context Package** metadata contract wraps the existing preview/share lifecycle.
- Context Package bodies remain ephemeral and are not stored as another canonical content layer.
- Existing copy/export remains explicit and stale previews cannot be shared until rebuilt.
- Universal Search may prefill Context Builder with a selected historical result as a retrieval focus, but this does not change authorization, invoke an external AI, generate a preview, or share anything until the user explicitly continues.

Direction:

- AI Context should still be understood as a **Context Compiler**, not yet a universal autonomous AI memory service.
- Context Package is the reusable boundary for future integrations; do not create bespoke output contracts for every consumer.
- Do not persist a general Context Package body history without a separate product/privacy decision.

### 3.6 Passport

Purpose: define and audit what an AI or external tool may export, for what purpose and for how long, without expanding what the user has already authorized as eligible context.

Current state:

- A minimum Passport implementation exists as a low-frequency local tool.
- AI Context Profile remains the content scope: Topic/Profile allow/deny/never and exclusions decide what may participate.
- Passport Grant adds fixed consumer, fixed purpose, `resourceScope=profile`, Profile reference, `context_export` permission and `once / 7d / 30d` duration.
- Grants can expire, be revoked, or be consumed once; access audit is metadata-only and bounded.
- Context Package preview is explicitly bound to a Grant before protected export, and export revalidates/consumes the bound Grant.
- Passport metadata does not contain Context body text and is deliberately excluded from PAIA Backup so restore cannot silently reactivate old external-use permissions.

Direction:

- Passport remains a **cross-cutting governance layer**, not another body-text database and not another primary navigation surface by default.
- The minimum implementation is sufficient to validate the concept; do not expand it into MCP/API/autonomous-agent access merely because the authorization model now exists.
- Broader Passport work should wait for repeated Context reuse to demonstrate that cross-AI authorization solves an observed problem.

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
Context Package ─────→ AI     │
                              │
Reader + Search + Revisit ────┘

Passport governs external Context use without owning content.
```

Important consequences:

- Reader does not own another canonical copy of text.
- Search/Revisit do not own another canonical copy of text or a parallel product truth.
- AI Context does not become a fourth body-text truth store.
- Passport does not own content; it owns authorization and audit metadata.
- Derived views may be rebuilt. User-authored facts and edits must not be silently regenerated away.

## 5. Current product priorities

For the next development stages, priorities are:

1. **Rereading quality** — opening PAIA should feel useful before the user invokes any AI organization.
2. **Retrieval quality** — Universal Search and local Reader search should make old expression retrieval visibly easier than returning to the original chat product.
3. **Return value without engagement tricks** — Revisit should give a concrete reason to come back by surfacing real newly accumulated or older meaningful material, without push loops or opaque recommendation logic.
4. **Longitudinal understanding without fabrication** — time-oriented views should help the user compare their own earlier expressions without silently claiming a change of belief.
5. **Reuse rate** — Search → Read → Context preparation and Context copy/export should solve repeated tasks rather than exist as impressive demos.
6. **Trust** — source identity, deletion, edit boundaries, authorization and provenance must remain understandable and reliable.
7. **Complexity control** — new product value should not automatically imply a new durable entity, index or schema store.

## 6. Deliberate freezes

Until evidence justifies reopening them:

- No new Thought Library ontology layer.
- No new durable fact database for Reader/Revisit.
- No automatic background Organizer.
- No broad cloud-sync implementation.
- No Web/mobile app merely to duplicate the extension UI.
- No knowledge graph as a product goal.
- No provider proliferation.
- No embedding/vector-store migration before measured retrieval failures justify it.
- No broad Passport agent/API/MCP access solely because the minimum Grant model is implemented.
- No notification/engagement machinery justified only by wanting higher return frequency.

These are product freezes, not claims that the ideas are permanently rejected.

## 7. Product validation

PAIA currently has stronger engineering validation than product-market validation. Product behavior should be measured locally where possible without transmitting private archive content.

The current Product Signals implementation can observe coarse behavior such as:

- local Input/Thought searches that hit or miss and lead to opening/copying a result;
- Universal Search hit/miss, result opening and explicit Search → AI Context preparation;
- Revisit opens, whether a visit has new material, opening newly collected/older Inputs or updated Thought topics, and explicit “read to here” marks;
- revisits to older Inputs using coarse age buckets;
- Thought Topic first/repeat visits;
- opening AI-organized view, returning to Original and saving AI-organized edits;
- Context previews that find content and explicit copy/Markdown actions.

These signals are fixed-field aggregate counters, are off by default, and do not store raw private text, search text, titles or object identifiers. They still require real use over time before they support product conclusions.

## 8. Success gates for expansion

PAIA should not move into expensive multi-device, platform or agent expansion merely because the architecture can support it.

Before prioritizing cloud sync, Web App, native apps or broad Passport integrations, at least the following should be true in real use:

- Reader/Search is clearly better than returning to ChatGPT history for a meaningful class of tasks.
- Users repeatedly retrieve material older than the current session/week.
- Universal Search produces result opening, rereading or Context preparation rather than only searches with no follow-through.
- Revisit produces voluntary opening of older/newly accumulated material rather than becoming an ignored badge or notification substitute.
- Thought organization produces repeat visits rather than one-time curiosity.
- Context reuse occurs repeatedly enough that cross-AI authorization solves an observed problem.

The explicit decision to implement Minimum Passport early is an implementation-order override, not evidence that this gate has been met.

## 9. Relationship to historical documents

For new product work, this file is authoritative together with `ARCHITECTURE.md` and `ROADMAP.md`.

The following remain important evidence but are not current product source-of-truth documents:

- `PRODUCT_SPEC.md`
- `DECISIONS.md`
- version-specific `V*_*.md` and `ROUND*.md`
- foundation/acceptance documents
- `README_HISTORY.md`

`PRIVACY.md`, `BACKUP.md`, `AI_CONTEXT.md` and other feature contracts still contain detailed behavioral/security constraints for existing implemented features. Consult them when changing those features, but do not infer new product priorities from old version plans.
