# PAIA Architecture

Status: **current architecture source of truth**

Current runtime: **v0.12.0**

This document defines the architecture boundaries that new work must preserve unless an explicit migration is approved. Historical implementation documents remain useful evidence, but they do not define new architecture direction by default.

## 1. Architectural goals

PAIA should make future product iteration cheaper, not more dangerous, as the archive grows.

The architecture therefore optimizes for:

1. **Trustworthy source history** — captured facts remain attributable and are not silently rewritten.
2. **User-work preservation** — edits, organization and explicit exclusions survive enrichment and migration.
3. **Derived-view replaceability** — AI presentation and retrieval projections can evolve without becoming the only copy of personal truth.
4. **Local-first operation** — ordinary reading/search/editing does not require a server.
5. **Explicit external use** — network/provider access is bounded and user-authorized.
6. **Complexity control** — new UI/product capabilities should reuse existing durable state whenever possible.

## 2. Runtime boundaries

The Chrome extension remains organized around these runtime boundaries:

```text
ChatGPT Web
   │
   ├─ adapter/ + content/        provider-specific capture/observation
   │
   ▼
background/service-worker       trusted command dispatch boundary
   │
   ▼
core/                           archive, thought, context, policy and persistence logic
   │
   ▼
IndexedDB + chrome.storage      durable local state

ui/                             trusted extension reading/editing surfaces

provider-facing core/background explicit authorized network path
```

Responsibilities:

- `adapter/`: provider/web-structure interpretation. Keep ChatGPT-specific assumptions here where feasible.
- `content/`: bounded observation/capture bridge. It must not gain broad Library/Context authority.
- `background/`: trusted caller validation and command dispatch. It should become thinner over time rather than accumulate domain behavior.
- `core/`: domain services and persistence contracts.
- `ui/`: presentation, editing interaction and local view state; it must not become an alternate persistence implementation.

## 3. Canonical data layers

PAIA has three important content/trust layers plus derived projections.

### 3.1 Source Record

Source Record is the immutable captured/imported fact layer.

It owns:

- provider/source identity;
- captured original user text snapshot;
- source/capture time evidence;
- dedupe/source lineage needed for archive integrity;
- permanent deletion fences/tombstones.

Ordinary editing does not rewrite Source Record text.

### 3.2 Working Input

Working Input is the user's editable archive representation.

It owns the canonical editable body for an Input. Enrichment may add facts, but it must not reset user work.

The standing rule remains:

> **Sync/enrichment may add or improve source facts; it must not silently reset user work.**

### 3.3 Thought Library

Thought entities organize or derive durable material from Inputs while preserving provenance.

A Thought may have independent editable content. The only case where a Thought and Input share the same canonical editable body is the existing strict exact-original relationship: one full-body non-context Input with no ambiguous or previously divergent human Thought body.

Partial excerpts, multi-Input synthesis, AI prose, context-only evidence, user-created entries and independently edited Thoughts do not reverse-write an Input.

### 3.4 Derived projections

AI presentation, evolution reading, search ranking, Context previews and future summaries are projections.

A projection may be cached when safe, but it is not allowed to become an untraceable replacement for the Source/Working Input trust chain.

## 4. Reader is a presentation layer

`Input Reader` is a product capability, not a new persistent content layer.

Reader should be able to render:

- Input documents;
- Thought Topics/Entries;
- AI-organized projections;
- later, Context Package history or other reusable views.

Reader-specific state should normally be ephemeral or lightweight preference state: reading order, current position, collapsed sections, display mode and similar UI concerns.

Do not introduce a Reader body store that copies canonical Input or Thought text.

## 5. Search architecture direction

Current production retrieval is primarily lexical/structural and deliberately conservative. That is acceptable for the current release but should not lead to separate search implementations growing independently.

The next architecture target is a provider-neutral **Search Service boundary**:

```text
search(query, scope, filters, limit) -> ranked references + evidence
```

Expected scopes include Input, Thought and Context preparation.

The service should initially wrap existing local lexical/indexed behavior. Semantic/vector retrieval may later become one implementation component, but only after:

- the shared boundary exists;
- real retrieval failure modes are measured;
- privacy/storage cost is understood;
- it can be added without changing canonical content ownership.

A vector index, if ever added, is a rebuildable derived index, not a new truth store.

## 6. Context architecture direction

The current AI Context feature is a local Context Compiler. It selects authorized material, builds a preview and supports explicit copy/export.

Future work should converge on a stable **Context Package** contract instead of adding more one-off output paths.

A Context Package may contain metadata such as:

- purpose/query reference or digest;
- selected Input/Thought evidence references;
- compiled text or structured sections;
- freshness/generation information;
- authorization/grant reference;
- created time and bounded export metadata.

Important boundary:

- Context compilation reads current trusted state.
- It does not silently write conclusions back into Source or Working Input.
- Stale authorization/content invalidates share/export capability.
- Persistent Context Package bodies are not approved merely by defining this contract; persistence requires a separate product/privacy decision.

## 7. Passport architecture direction

Passport is a future governance layer over existing authorization semantics.

It should unify rather than duplicate Topic/Profile permissions, external-access settings and provider action authorization.

A minimum future Grant model should be capable of expressing:

```text
consumer
purpose
resource scope
permissions
createdAt
expiresAt / duration
revokedAt
```

An Access Log should be metadata-only where possible and should answer which consumer used which resource scope under which grant and when.

Passport does not own body text.

No new Passport schema/store is authorized by this document alone. First implementation should reuse existing authorization metadata where possible and add durable entities only when required by an approved user-facing behavior.

## 8. Durable schema freeze

Beginning with the post-v0.12 consolidation phase, the current durable content schema is **frozen by default**.

A feature may not add a new object store, canonical body copy, major durable entity family or destructive migration unless its design explicitly answers:

1. Why can this not be represented as a read model/projection over existing state?
2. What user-visible behavior requires durability across reload/device boundaries?
3. What is the ownership/source-of-truth rule?
4. How do deletion, tombstones, backup/restore and provenance apply?
5. How will old data migrate without resetting user work?
6. What product evidence justifies the additional long-term complexity?

This is not a permanent ban on schema evolution. It is a default decision rule intended to stop speculative ontology growth.

## 9. Privacy and authorization invariants

New work must preserve the following unless the user explicitly approves a changed contract:

- Do not capture drafts, keystrokes, assistant replies, unrelated pages, browser history, cookies or credentials as archive content.
- Source Record and user-edited content remain separate.
- Permanent deletion/tombstone semantics take precedence over re-import or derived caches.
- Smart Filter does not silently delete Source data.
- Provider calls require an explicit authorized action and remain bounded.
- No hidden automatic paid retries.
- Credentials do not enter archive bodies, backups, Git evidence or ordinary logs.
- Local Context preparation does not become automatic external sharing.
- Synthetic/headless tests must not be described as proof of real private-data behavior or live-provider quality.

Detailed implemented contracts remain in `PRIVACY.md`, `BACKUP.md`, `AI_CONTEXT.md` and feature-specific acceptance records.

## 10. Engineering simplification direction

PAIA should gradually reduce large coordination files without changing behavior merely for stylistic reasons.

Preferred direction:

```text
background/
  service-worker.js        validation + dispatch
  commands/                domain command handlers

core/
  archive/
  thoughts/
  search/
  context/
  permissions/
  providers/

ui/
  reader/
  archive/
  thoughts/
  context/
  settings/
```

This is a module-boundary target, not an instruction to perform a risky all-at-once folder migration.

Refactor when touching a domain for real product work, with targeted regression coverage. Avoid large cosmetic moves that create diff noise without reducing coupling.

## 11. Testing strategy

The existing regression suite is an asset and should be preserved, but engineering test count is not itself a product objective.

For each behavioral change:

- add targeted unit/domain tests;
- keep privacy/authorization tests for trust-boundary changes;
- use selected browser journeys for user-visible flows;
- run package/release guards when release assets change.

Do not create elaborate test infrastructure for speculative features that have not passed a product-value gate.

## 12. Documentation authority

For new development, read in this order:

1. `PRODUCT.md` — what and why;
2. `ARCHITECTURE.md` — ownership/boundaries/invariants;
3. `ROADMAP.md` — what is next and what is frozen;
4. feature-specific current contracts only when changing that feature;
5. historical specs/acceptance records only for compatibility and evidence.

`PRODUCT_SPEC.md`, `DECISIONS.md`, old version acceptance documents and historical round documents do not override the first three for new direction.