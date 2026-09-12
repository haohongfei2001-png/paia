# PAIA Architecture

Status: **current architecture source of truth**

Current runtime baseline: **v0.12.0 + post-release consolidation rounds**

This document defines the architecture boundaries that new work must preserve unless an explicit migration is approved. Historical implementation documents remain evidence, but they do not define new architecture direction by default.

## 1. Architectural goals

PAIA should become easier, not more dangerous, to change as the archive grows. The architecture therefore optimizes for:

1. **Trustworthy source history** — captured facts remain attributable and are not silently rewritten.
2. **User-work preservation** — edits, organization and explicit exclusions survive enrichment and migration.
3. **Derived-view replaceability** — AI presentation, search indexes and Context projections do not become the only copy of personal truth.
4. **Local-first operation** — ordinary reading/search/editing does not require a server.
5. **Explicit external use** — Provider access and Context export are bounded and user-authorized.
6. **Complexity control** — new UI capabilities should reuse existing durable state before adding new stores or body copies.

## 2. Runtime boundaries

```text
ChatGPT Web
   │
   ├─ adapter/ + content/       provider-specific observation/capture
   │
   ▼
background/service-worker      trusted caller validation + command dispatch
   │
   ├─ archive / thought / search domain services
   ├─ MemoryService            Context selection/reconstruction
   ├─ ContextPackageService    trusted package lifecycle + release gate
   ├─ PassportService          authorization metadata + audit
   └─ ProductSignals           observation-only aggregate metrics
   │
   ▼
IndexedDB + chrome.storage     durable local state

ui/                            trusted extension reading/editing surfaces
```

Responsibilities:

- `adapter/`: provider/web-structure interpretation. Keep ChatGPT-specific assumptions here where feasible.
- `content/`: bounded capture bridge. It must not gain Library/Context authority.
- `background/`: trusted caller validation and dispatch. Security-sensitive export decisions must be on this main path.
- `core/`: domain services and persistence contracts.
- `ui/`: presentation/editing interaction and local view state; it must not become an alternate persistence or authorization implementation.

### 2.1 Security path vs observation path

Round 4.5 establishes a strict rule:

> **Authorization is a main-path responsibility. Analytics is an observer.**

The trusted Context path is:

```text
trusted UI request
    ↓
service-worker caller / consent validation
    ↓
ContextPackageService
    ↓
PassportService (when Grant-bound)
    ↓
MemoryService
    ↓
returned Context text
```

`ProductSignals.observe()` runs only after the trusted command succeeds. It may count a fixed event, but it cannot bind a Package, resolve a Grant, reconstruct Context text, mutate an export result, or decide whether text is released.

This replaces the Round 4 tactical implementation where Passport enforcement temporarily lived in the Product Signals side-channel.

## 3. Canonical data layers

### 3.1 Source Record

Source Record is the immutable captured/imported fact layer. It owns provider/source identity, original user text snapshot, time evidence, dedupe/source lineage and permanent deletion fences/tombstones. Ordinary editing never overwrites it.

### 3.2 Working Input

Working Input is the user's editable archive representation and owns the canonical editable Input body.

Standing rule:

> **Sync/enrichment may add or improve source facts; it must not silently reset user work.**

### 3.3 Thought Library

Thought entities organize or derive durable material from Inputs while preserving provenance. Independent Thoughts do not reverse-write Inputs. Exact-original content may share working content only under the existing strict unambiguous relationship.

### 3.4 Derived projections

AI presentation, evolution reading, search ranking, Context previews and summaries are projections. They may be rebuilt and must not become an untraceable replacement for Source / Working Input truth.

## 4. Reader is a presentation layer

`Input Reader` is a product capability, not a persistent content layer. Reader may render Input documents, Thought Topics/Entries, AI-organized projections and Context Package previews. Reader-specific state should normally remain ephemeral or lightweight preference state.

Do not introduce a Reader body store that copies canonical Input or Thought text.

## 5. Search architecture

Round 2 introduced `core/search-service.js` as the shared lexical Search Service foundation for Input, Thought and Context preparation.

It currently provides:

- NFKC normalization;
- exact-title → partial-title → body ranking compatibility;
- Chinese 2/3-character query terms;
- lexical overlap/relevance primitives;
- Unicode-safe excerpts.

Input and Thought retain existing pagination/index structures where required for compatibility. Semantic/vector retrieval may later become a rebuildable implementation component only when real retrieval failures justify it; it is not a new truth store.

## 6. Context Package architecture

AI Context remains a local Context Compiler. `core/context-package-service.js` now owns the trusted ephemeral Package lifecycle around `MemoryService`.

The stable Package metadata contract includes:

```text
type / version
packageId / previewId
grantId (null for manual export)
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

Current invariants:

- Package metadata is in-memory and bounded by the same short-lived preview lifecycle; Package body text is not persisted.
- `ContextPackageService.build()` wraps the existing local Context build and creates the Package metadata.
- Existing manual AI Context copy/export remains backward compatible as an explicit user action.
- Passport use requires explicit `ContextPackageService.bind(previewId, grantId)` before protected export. Binding fixes Grant/consumer/purpose/Profile metadata but does not consume the Grant.
- `ContextPackageService.share()` validates the already-bound Grant **before calling `MemoryService.share()`**. Invalid, expired, revoked, consumed-once, mismatched or unbound Grants therefore do not trigger protected Context reconstruction.
- If a Grant changes after initial validation but before consumption, failure still prevents the service result from being returned to the caller.
- The existing AI Context `externalAccess` switch and stale-generation checks remain stronger gates inside the Memory path.
- Persistent Context Package body history remains unapproved and requires a separate privacy/product decision.

## 7. Passport architecture

`core/passport.js` implements the minimum governance layer over existing AI Context Profile authorization.

Division of responsibility:

```text
AI Context Profile
  -> what content may participate

Passport Grant
  -> who may export a Context Package, for what purpose, under which Profile scope, and for how long
```

Grant metadata:

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

Consumers and purposes are fixed enums, not private free text. Grant and audit rows reuse the existing `meta` store; no Passport object store or body cache exists.

Access audit stores only Grant/consumer/purpose/Profile reference, export action and time. It is bounded to 90 days / 200 rows and can be cleared independently.

Passport rows are deliberately excluded from PAIA Backup. Restore must not silently reactivate external-use permissions.

Passport currently governs explicit Context copy/Markdown export only. It does not grant autonomous agent access, background reads, remote API access or Provider credentials.

## 8. Runtime command boundaries

Round 4.5 separates command namespaces by responsibility:

```text
PAIA_PRODUCT_*    local aggregate product metrics only
PAIA_PASSPORT_*   Grant status/create/revoke/audit maintenance
PAIA_CONTEXT_*    Package binding / future package lifecycle commands
PAIA_MEMORY_*     Context authorization, build, share and Context content operations
```

`PAIA_MEMORY_BUILD` and `PAIA_MEMORY_SHARE` are routed through `ContextPackageService` at the trusted background boundary. `PAIA_PASSPORT_*` and `PAIA_CONTEXT_*` are local-tool commands and must not wake Smart Filter/Library maintenance or broadcast ordinary archive-content changes.

Revocation/status/audit clearing remain available without requiring capture consent so a user can always reduce or inspect permission state. Creating a new Grant and binding a Package require active PAIA consent.

## 9. Durable schema freeze

The post-v0.12 durable content schema is **frozen by default**. A feature may not add a new object store, canonical body copy, major durable content entity family or destructive migration unless it explicitly answers:

1. Why cannot this be a projection/read model over existing state?
2. What user-visible behavior requires durability?
3. What is the source-of-truth rule?
4. How do deletion, tombstones, backup/restore and provenance apply?
5. How does migration preserve human work?
6. What product evidence justifies long-term complexity?

Round 3 Product Signals and Round 4/4.5 Passport intentionally reuse `meta`; Context Package bodies remain ephemeral.

## 10. Privacy and authorization invariants

New work must preserve:

- no capture of drafts, keystrokes, assistant replies, unrelated pages, browser history, cookies or credentials as archive content;
- Source Record and user-edited content remain separate;
- permanent deletion/tombstones outrank re-import and caches;
- Smart Filter never silently deletes Source data;
- Provider calls require explicit authorized bounded actions; no hidden paid retry loops;
- credentials never enter archive bodies, backups or ordinary logs;
- local Context preparation never implies external sharing;
- Passport cannot expand the content scope granted by AI Context Profile rules;
- revoked, expired, consumed-once, mismatched or unbound Grants cannot release protected Context text;
- Product Signals must remain incapable of making an authorization decision;
- synthetic/headless tests are not proof of live private-data or Provider behavior.

Detailed implemented contracts remain in `PRIVACY.md`, `BACKUP.md`, `AI_CONTEXT.md` and feature-specific acceptance evidence.

## 11. Engineering simplification direction

Preferred gradual boundary:

```text
background/
  service-worker.js        validation + dispatch
  commands/                future domain command handlers when useful

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

Do not perform cosmetic all-at-once folder moves. Refactor only when product work touches the domain and targeted regression coverage exists.

## 12. Testing strategy

For each behavioral change:

- add targeted unit/domain tests;
- keep explicit privacy/authorization tests for trust-boundary changes;
- use selected browser journeys for user-visible flows;
- run package/release guards before release claims.

Round 4.5 adds `context-passport-round45.test.mjs` and `architecture-round45.test.mjs`. The first asserts authorization happens before protected Memory reconstruction; the second prevents Passport/Context ownership from drifting back into Product Signals.

A release claim still requires executable `npm test`, package audit and relevant Chrome E2E/smoke checks in an available development runtime.

## 13. Documentation authority

For new development, read in this order:

1. `PRODUCT.md` — what and why;
2. `ARCHITECTURE.md` — ownership/boundaries/invariants;
3. `ROADMAP.md` — what is next and what is frozen;
4. current feature contracts when changing that feature;
5. historical specs only for compatibility/evidence.

`PRODUCT_SPEC.md`, `DECISIONS.md`, old version acceptance documents and historical round documents do not override the first three for new direction.
