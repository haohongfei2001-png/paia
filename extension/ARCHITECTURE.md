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
   ├─ RevisitService           local return/read projection + lightweight cursor
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

AI presentation, evolution reading, search ranking, Revisit, Context previews and summaries are projections. They may be rebuilt and must not become an untraceable replacement for Source / Working Input truth.

## 4. Reader is a presentation layer

`Input Reader` is a product capability, not a persistent content layer. Reader may render Input documents, Thought Topics/Entries, AI-organized projections, longitudinal expression views, Revisit views and Context Package previews.

Reader projections include:

- **Universal Search** — a grouped read model over existing Input search, Thought search and existing AI-organized projection text.
- **“以前的我”** — a chronological projection over matching Input expressions, ordered using available source-send-time evidence.
- **Revisit / 回访** — an on-demand projection combining newly collected visible Inputs, Thought topics with currently pending supporting material, and a small set of older Inputs selected by explicit local criteria.

The longitudinal view describes **when matching expressions were recorded**. It must not infer that a belief, preference or identity changed merely because expressions differ over time.

### 4.1 Revisit architecture

Round 4.7 adds `core/revisit.js` as a bounded local Reader service.

It does not create another content feed or recommendation database. Its inputs are existing local facts:

```text
Input sequence / visibility / Smart Filter state
Input edit metadata / Thought dependency presence
existing Thought / AI-presentation pending-delta state
source-send-time evidence
```

Its only persistent state is one lightweight `meta` row:

```text
id = revisit:v1
version
lastBlockSequence
lastSeenAt
```

This row is a Reader cursor, not personal content, and is deliberately excluded from PAIA Backup. Restoring archive content should not pretend that the user already reviewed the restored device's Revisit surface.

Important boundaries:

- The first Revisit does **not** classify all historical Inputs as new. The user explicitly establishes the initial baseline.
- Opening Revisit does not advance the cursor. Only explicit **“从现在开始记录 / 已读到这里”** writes the current anchor.
- New-Input scanning is bounded and only surfaces Inputs still visible under current removal/Smart Filter policy.
- Older resurfacing requires source-send-time evidence at least 90 days old. It prefers Inputs the user edited or Inputs already used as Thought evidence.
- The daily rotation is deterministic for the same local day. It is not a randomized engagement sampler and does not call a recommendation model.
- Revisit is computed only after explicit user action; ordinary Reader startup does not run the old-content scan merely to display a badge.
- Thought “new material” uses already-computed local pending-delta state; Revisit does not invoke the Organizer or any Provider.
- Revisit navigation returns to the existing Input/Thought Reader/search paths. It does not own a second navigation or body state machine.

Reader-specific state should remain ephemeral or lightweight preference/cursor state. Do not introduce a Reader/Revisit body store that copies canonical Input or Thought text.

## 5. Search architecture

Round 2 introduced `core/search-service.js` as the shared lexical Search Service foundation for Input, Thought and Context preparation.

It provides:

- NFKC normalization;
- exact-title → partial-title → body ranking compatibility;
- Chinese 2/3-character query terms;
- lexical overlap/relevance primitives;
- Unicode-safe excerpts.

Input and Thought retain their existing pagination/index structures. Semantic/vector retrieval may later become a rebuildable implementation component only when measured retrieval failures justify it; it is not a new truth store.

### 5.1 Universal Search coordination

Round 4.6 adds `core/universal-search.js`. It is a bounded **coordinator**, not another search engine or index.

The flow is:

```text
one user query
   ├─ existing Input search
   ├─ existing Thought search
   └─ existing AI-presentation read projection
        ↓
Universal Search grouped result DTO
        ↓
Reader / “以前的我” / explicit Context preparation
```

Important boundaries:

- No new object store, normalized body store, embedding index or vector database is created.
- Input and Thought result bodies are returned only as bounded snippets needed for the Reader result list.
- AI-organized results search only already-stored projection fields; Universal Search does not call a Provider or generate new AI text.
- Universal Search is exposed through the existing trusted `SEARCH_INPUTS` command with `universal:true`; `OrganizerStore` delegates that mode to `UniversalSearchService` while ordinary Input search remains unchanged.
- Internal Input/Thought reads are direct domain calls, not additional runtime messages, so one Universal Search is counted once rather than as multiple product searches.
- Result navigation reuses the existing Input/Thought Reader and its pagination; Universal Search does not create a second document-opening state machine.

### 5.2 Search → Context boundary

A Universal Search result may be explicitly carried into AI Context preparation. This action creates only a bounded local retrieval query containing the selected result snippet and the user's current search query.

It does **not**:

- alter AI Context Profile authorization;
- enable unorganized Inputs;
- build a Context preview automatically;
- call an external Provider;
- bind or consume a Passport Grant;
- share Context externally.

The user must continue through the existing AI Context Builder and existing authorization/export path.

## 6. Context Package architecture

AI Context remains a local Context Compiler. `core/context-package-service.js` owns the trusted ephemeral Package lifecycle around `MemoryService`.

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

- Package metadata is in-memory and bounded by the short-lived preview lifecycle; Package body text is not persisted.
- `ContextPackageService.build()` wraps local Context build and creates Package metadata.
- Existing manual AI Context copy/export remains backward compatible as an explicit user action.
- Passport use requires explicit `ContextPackageService.bind(previewId, grantId)` before protected export.
- `ContextPackageService.share()` validates the already-bound Grant **before calling `MemoryService.share()`**.
- Invalid, expired, revoked, consumed-once, mismatched or unbound Grants do not trigger protected Context reconstruction.
- Existing AI Context `externalAccess` and stale-generation checks remain stronger gates.
- Persistent Context Package body history remains unapproved.

## 7. Passport architecture

`core/passport.js` implements the minimum governance layer over AI Context Profile authorization.

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

Consumers and purposes are fixed enums, not private free text. Grant and audit rows reuse the existing `meta` store; no Passport object store or body cache exists. Access audit is bounded and metadata-only. Passport rows remain excluded from PAIA Backup so restore cannot reactivate external-use permissions.

Passport governs explicit Context copy/Markdown export only. It does not grant autonomous agent access, background reads, remote API access or Provider credentials.

## 8. Runtime command boundaries

```text
PAIA_PRODUCT_*    local aggregate product metrics only
PAIA_REVISIT_*    on-demand Revisit read / explicit Reader-cursor mark
PAIA_PASSPORT_*   Grant status/create/revoke/audit maintenance
PAIA_CONTEXT_*    Package binding / future package lifecycle commands
PAIA_MEMORY_*     Context authorization, build, share and Context content operations
SEARCH_INPUTS     ordinary Input search; `universal:true` invokes bounded Universal Search coordination
```

`PAIA_MEMORY_BUILD` and `PAIA_MEMORY_SHARE` are routed through `ContextPackageService`. Passport/Context/Revisit local commands do not wake Smart Filter/Library maintenance or broadcast archive-content changes.

Revisit status/mark requires active PAIA consent because it reads archive/Thought state and advances a Reader cursor. The Revisit cursor itself contains no body text and is not an authorization grant.

## 9. Durable schema freeze

The post-v0.12 durable content schema is **frozen by default**. A feature may not add a new object store, canonical body copy, major durable content entity family or destructive migration unless it explicitly answers:

1. Why cannot this be a projection/read model over existing state?
2. What user-visible behavior requires durability?
3. What is the source-of-truth rule?
4. How do deletion, tombstones, backup/restore and provenance apply?
5. How does migration preserve human work?
6. What product evidence justifies long-term complexity?

Round 3 Product Signals, Round 4/4.5 Passport and Round 4.7 Revisit cursor reuse `meta`; Context Package bodies and Universal Search/longitudinal Reader/Revisit bodies remain ephemeral.

## 10. Privacy and authorization invariants

New work must preserve:

- no capture of drafts, keystrokes, assistant replies, unrelated pages, browser history, cookies or credentials as archive content;
- Source Record and user-edited content remain separate;
- permanent deletion/tombstones outrank re-import and caches;
- Smart Filter never silently deletes Source data;
- Provider calls require explicit authorized bounded actions; no hidden paid retry loops;
- credentials never enter archive bodies, backups or ordinary logs;
- local Context preparation never implies external sharing;
- Passport cannot expand AI Context Profile scope;
- revoked, expired, consumed-once, mismatched or unbound Grants cannot release protected Context text;
- Product Signals cannot make authorization decisions;
- longitudinal/Revisit Reader views must distinguish chronology/resurfacing facts from interpretation;
- Revisit must not become a hidden background recommendation or notification channel;
- synthetic/headless tests are not proof of live private-data or Provider behavior.

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
  reader/
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

Current post-release contracts include:

- `context-passport-round45.test.mjs` / `architecture-round45.test.mjs` for trusted Context/Passport boundaries;
- `universal-search-round46.test.mjs` for bounded coordination, snippets, chronology and Search → Context boundaries;
- `revisit-round47.test.mjs` for first-run baseline semantics, explainable old-material selection, backup exclusion and fixed-field retention signals.

A release claim still requires executable `npm test`, package audit and relevant Chrome E2E/smoke checks in an available development runtime.

## 13. Documentation authority

For new development, read in this order:

1. `PRODUCT.md` — what and why;
2. `ARCHITECTURE.md` — ownership/boundaries/invariants;
3. `ROADMAP.md` — what is next and what is frozen;
4. current feature contracts when changing that feature;
5. historical specs only for compatibility/evidence.

`PRODUCT_SPEC.md`, `DECISIONS.md`, old version acceptance documents and historical round documents do not override the first three for new direction.
