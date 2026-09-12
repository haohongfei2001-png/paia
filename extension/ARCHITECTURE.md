# PAIA Architecture

Status: **current architecture source of truth**

Current runtime baseline: **v0.12.0 + post-release consolidation rounds**

This document defines the architecture boundaries that new work must preserve unless an explicit migration is approved. Historical implementation documents remain useful evidence, but they do not define new architecture direction by default.

## 1. Architectural goals

PAIA should make future product iteration cheaper, not more dangerous, as the archive grows.

The architecture therefore optimizes for:

1. **Trustworthy source history** — captured facts remain attributable and are not silently rewritten.
2. **User-work preservation** — edits, organization and explicit exclusions survive enrichment and migration.
3. **Derived-view replaceability** — AI presentation and retrieval projections can evolve without becoming the only copy of personal truth.
4. **Local-first operation** — ordinary reading/search/editing does not require a server.
5. **Explicit external use** — network/provider access and Context export are bounded and user-authorized.
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
core/                           archive, thought, search, context, policy and persistence logic
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
- `ui/`: presentation, editing interaction and local view state; it must not become an alternate content persistence implementation.

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

AI presentation, evolution reading, search ranking, Context previews and summaries are projections.

A projection may be cached when safe, but it is not allowed to become an untraceable replacement for the Source/Working Input trust chain.

## 4. Reader is a presentation layer

`Input Reader` is a product capability, not a new persistent content layer.

Reader can render:

- Input documents;
- Thought Topics/Entries;
- AI-organized projections;
- Context Package previews and future reusable views.

Reader-specific state should normally be ephemeral or lightweight preference state: reading order, current position, collapsed sections, display mode and similar UI concerns.

Do not introduce a Reader body store that copies canonical Input or Thought text.

## 5. Search architecture

Round 2 introduced `core/search-service.js` as the provider-neutral lexical Search Service foundation shared by Input, Thought and Context preparation.

The current boundary provides common behavior for:

- NFKC normalization;
- established exact-title → partial-title → body ranking compatibility;
- Chinese 2/3-character query terms;
- lexical overlap/relevance signals;
- Unicode-safe excerpts.

Input and Thought retain their existing pagination/index structures where required for compatibility, while Context consumes the same shared query/relevance primitives.

Semantic/vector retrieval may later become one implementation component, but only after real retrieval failure modes justify it. A vector index, if ever added, is a rebuildable derived index, not a new truth store.

## 6. Context Package architecture

AI Context remains a local Context Compiler over current trusted state. Round 4 adds a stable, ephemeral **Context Package** metadata contract around its existing preview/share lifecycle.

The current package contract includes:

```text
type / version
packageId / previewId
resourceScope = profile
profileId
consumer
purpose
permission = context_export
budget
createdAt / expiresAt
generation
itemCount / characters / tokens
retrievalConfidence / partial
localOnly / persistedBody=false
```

Important boundaries:

- Package metadata is tied to the existing in-memory Memory preview lifecycle and expires after a bounded interval.
- Package body text is not persisted as a new canonical copy.
- Context compilation still reads current authorized Source/Input/Thought-derived state through AI Context.
- Stale content/authorization continues to invalidate Memory share/export.
- Existing manual AI Context copy/export is treated as an explicit one-time manual authorization and remains backward compatible.
- A Passport-protected export is fail-closed: the result body is cleared before Grant validation and restored to the trusted UI only after the Grant passes.
- Defining Context Package does not authorize a persistent package-body history. That remains a separate future privacy/product decision.

## 7. Passport architecture

Round 4 implements a **minimum Passport governance layer** over existing AI Context Profile authorization; it does not replace Topic/Profile rules.

The division of responsibility is:

```text
AI Context Profile
  -> what content may participate

Passport Grant
  -> who may export a package, for what purpose, under which Profile scope, and for how long
```

The current Grant model is metadata-only and expresses:

```text
consumer
purpose
resourceScope = profile
profileId
permission = context_export
duration = once | 7d | 30d
createdAt / expiresAt
revokedAt / consumedAt
lastUsedAt / useCount
```

Current consumers and purposes are fixed enums rather than free-text metadata. This prevents Passport from becoming another place that silently accumulates private user prose.

Grant and access-audit rows reuse the existing `meta` store; Round 4 adds no IndexedDB object store and no body cache. Access audit records only Grant/consumer/purpose/Profile reference, export action and time. Audit history is bounded to 90 days / 200 rows and can be cleared independently.

Passport rows are deliberately excluded from PAIA Backup in this implementation. Restoring a backup must not silently reactivate old external-use permissions. Re-authorizing on a restored/new device remains an explicit user action.

The existing `externalAccess` AI Context switch remains a stronger gate: a valid Passport Grant cannot bypass it. Existing Topic/Profile deny/never rules likewise continue to constrain what a package can contain.

Passport currently governs explicit copy/Markdown Context export only. It does **not** grant autonomous agent access, background reads, remote API access or provider credentials.

## 8. Durable schema freeze

Beginning with the post-v0.12 consolidation phase, the current durable content schema is **frozen by default**.

A feature may not add a new object store, canonical body copy, major durable content entity family or destructive migration unless its design explicitly answers:

1. Why can this not be represented as a read model/projection over existing state?
2. What user-visible behavior requires durability across reload/device boundaries?
3. What is the ownership/source-of-truth rule?
4. How do deletion, tombstones, backup/restore and provenance apply?
5. How will old data migrate without resetting user work?
6. What product evidence justifies the additional long-term complexity?

Round 3 Product Signals and Round 4 Passport intentionally reuse the existing `meta` store and do not create canonical content copies. This does not exempt them from privacy/retention rules; it simply avoids speculative object-store growth.

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
- Passport does not own body text and cannot expand the content scope granted by AI Context Profile rules.
- Revoked, expired, consumed-once or mismatched Passport Grants must not release protected Context text.
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

Round 4 adds explicit contract tests for Package metadata, Grant validation/expiry/revocation/one-time consumption, metadata-only audit and fail-closed protected export. These tests still require execution in an available development runtime before a release claim.

## 12. Documentation authority

For new development, read in this order:

1. `PRODUCT.md` — what and why;
2. `ARCHITECTURE.md` — ownership/boundaries/invariants;
3. `ROADMAP.md` — what is next and what is frozen;
4. feature-specific current contracts only when changing that feature;
5. historical specs/acceptance records only for compatibility and evidence.

`PRODUCT_SPEC.md`, `DECISIONS.md`, old version acceptance documents and historical round documents do not override the first three for new direction.
