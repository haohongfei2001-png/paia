# Technical Restructuring Plan — PAIA Consumer Product v1

The product is fixed by higher intent; implementation is replaceable where needed. This plan preserves trusted data/authorization assets while replacing structures that prevent reliability or coherent UX.

## 1. Target runtime model

Provider / first-party source adapters
→ evidence-bearing observation or user write command
→ trusted admission (identity, role, consent, idempotency, time, deletion fences)
→ transactional Source facts + Working Input / independent Thought + human decisions
→ commit receipt / bounded change cursor
→ rebuildable projections (navigation, Topic placement, lexical/semantic indexes, AI candidates)
→ query/edit services
→ one UI router/component tree
→ Context compiler/review
→ Passport gate
→ copy/export/controlled connector

This is a responsibility model, not a requirement for many databases.

## 2. KEEP

Keep as product/trust assets:

- stable Source/message/Conversation identity semantics;
- immutable source evidence versus Working Input separation;
- revisions and human-protection semantics;
- tombstones/deletion fences and anti-resurrection behavior;
- provider-specific adapter boundary;
- trusted worker/caller validation path;
- current lexical normalization/search primitives where correct;
- existing Thought evidence/binding concepts where they remain compatible with B-01;
- AI candidate/projection separation and protection of edited human results;
- Context release revalidation;
- Passport metadata/audit concept;
- strict import parsing/admission boundary;
- Backup validation/hash/graph invariants and old-version decoders;
- existing privacy/security tests and truthful failure history.

A UX rewrite may not weaken these.

## 3. REFACTOR

### 3.1 ChatGPT capture and source lifecycle

Keep current verified evidence channels, but refactor lifecycle coordination so observation is driven by meaningful route/DOM/visibility/reconnect events with bounded compensation.

Requirements:
- same Conversation may emit a new structure event when Project membership/name changes;
- no duplicate Source/body when only metadata changes;
- unknown, unassigned and last-known remain distinct;
- temporary evidence loss does not invent a move;
- stale/old content-script versions are detected explicitly after extension updates;
- polling is bounded and justified by measured idle resource cost.

CPR-02 correct work should be absorbed, not rewritten for stylistic reasons.

### 3.2 Worker tasks

Chrome service-worker termination is a normal condition.

Long-running import/index/backup/AI tasks use:
- bounded batches;
- persistent checkpoint/receipt;
- idempotent replay;
- revision/generation preconditions;
- explicit cancellation state.

Do not keep correctness-critical progress only in process memory.

### 3.3 Domain command/query APIs

UI does not directly own persistence, provider behavior or Passport decisions.

Create stable command/query DTOs with:
- version;
- operation ID;
- revision precondition;
- bounded payload;
- typed error category;
- no private diagnostic leakage.

Queries expose user concepts, not storage internals.

### 3.4 Editing

Keep useful IME/grapheme/revision primitives, but unify save ownership.

One EditorSession per editable body owns:
- current text;
- base revision;
- dirty;
- composition;
- selection;
- save state;
- recoverable draft state where approved.

Navigation cannot independently re-fetch and overwrite this session.

## 4. REWRITE

### 4.1 Consumer UI shell and page composition

Rewrite the presentation orchestration that currently depends on multiple scripts moving/observing legacy DOM and stacked global CSS overrides.

Goal:
- one AppShell owns primary navigation/history;
- one route/state model owns current source/Project/Conversation/Topic/Context task;
- one component owner per visible control;
- one dialog/focus stack;
- one notification presenter;
- shared components/tokens from UX_CONTRACT.md.

Migration is incremental by vertical slice. A new route is certified before the corresponding old coordinator/CSS path is removed. Do not leave old and new navigation permanently handling the same action.

Framework choice is secondary. A typed declarative component system may be used if it works with Chrome MV3, IME, long-list virtualization and current build constraints. Do not perform a full framework migration without a user-slice reason.

### 4.2 Backup execution for supported long-term scale

Keep format/invariant compatibility where possible but rewrite execution if necessary so supported library size is actually recoverable.

Required direction:
- consistent snapshot/generation;
- streaming/chunked export rather than whole-library final Blob dependence;
- staged restore;
- up-front space/size checks;
- strict graph/hash/tombstone validation;
- atomic activation;
- old library remains usable on failure;
- non-empty restore/merge policy;
- explicit compatibility matrix.

The supported browse/search scale and supported Backup/Restore scale must not contradict each other.

### 4.3 Consumer update/distribution path

Keep development updater as fallback.

Replace it as the normal consumer path:
- verified packaged release;
- extension identity preservation;
- schema compatibility preflight;
- unsaved-work protection;
- page reconnect/refresh guidance when required;
- self-check;
- safe rollback where data compatibility permits.

Do not rely on GitHub Desktop/manual script/chrome://extensions for normal use.

## 5. ADD / REPLACE DERIVED CAPABILITIES

### 5.1 Semantic retrieval

Current lexical search is not semantic search.

Add a replaceable derived semantic/hybrid retrieval layer only after a fixed evaluation task set is defined.

Requirements:
- lexical fallback remains;
- index is rebuildable;
- no new personal-truth body store;
- deletion/exclusion/revision invalidates index;
- result includes real body/time/source/Topic location;
- coverage state visible;
- retrieval quality evaluated on Chinese paraphrase, fuzzy memory, negation, corrections and no-answer cases;
- model/vector technology selected from measured quality/cost/resource evidence, not preference.

Independent Semantic Lab results may inform design but do not automatically qualify production integration.

### 5.2 Dependency invalidation

Introduce/centralize a service that tracks revision dependencies among:
- Working Input;
- Thought evidence/binding;
- AI organized projections;
- search/index projections;
- Context manifests.

Edits/deletions mark derived state stale or remove it safely. Paid AI recomputation is not automatically triggered.

### 5.3 Recovery drafts

If real failure testing shows ordinary autosave cannot protect user typing across hard termination, add a bounded protected local recovery draft.

It:
- is not Source/history truth;
- has explicit lifecycle/expiry;
- clears after durable commit;
- clears with relevant permanent deletion/data clearing;
- is never stored in the host website's storage.

## 6. AI Organize

Keep candidate/projection architecture.

Refactor toward:
- Topic-bounded requests;
- change-based input;
- affected-relation reconsideration;
- stable input/revision fingerprints;
- candidate diff;
- protected edited result;
- explicit model/provider/cost state;
- no hidden retries.

Validation layers:
1. schema/structure;
2. evidence validity;
3. semantic fidelity.

The third requires task evaluation and independent review.

## 7. AI Context and Passport

Unify explicit material selection and task retrieval into one Context compiler.

Explicit selected material is fixed input. Retrieval is supplementary.

Context manifest tracks:
- selected IDs/revisions/spans;
- retrieved IDs/revisions;
- exclusions;
- authorization/policy version;
- build version;
- completeness/budget state.

Before release:
- revalidate revision/deletion/exclusion;
- revalidate Passport when externally controlled;
- ensure visible review equals actual released text.

Passport evolves from local grant model to real external enforcement only when a real consumer/connector exists.

## 8. Connector

First real connector is read-only.

Minimum contract:
- list/query authorized Topics/material;
- retrieve by stable ref;
- retrieve Context for a task;
- scope/purpose/duration enforcement;
- bounded paging/rate/size;
- revocation;
- minimal metadata audit;
- no full-library upload for remote filtering.

Retrieved archive text is data. Embedded historical instructions cannot alter tool permissions.

Write/organize access is a later distinct permission:
AI proposes typed changes → PAIA validates object/revision/scope → user/policy review → trusted domain command commits.

No third party writes storage directly.

## 9. Import and source expansion

Keep a provider-neutral Source model and provider-specific adapters.

Official import support is not declared until a current real official export has passed:
- preflight;
- role handling;
- time handling;
- branches;
- duplicate import;
- interruption/resume;
- existing human edits;
- tombstones;
- final recoverability.

Each new live source/provider is a vertical integration, not a registry entry.

Mutable sources define source revision semantics explicitly.

## 10. Sync / cloud / mobile

B-03 must be decided before production cloud Sync.

Any Sync architecture must include:
- account/device trust;
- encryption/key lifecycle appropriate to chosen model;
- stable identity;
- revision merge/conflict UI;
- offline replay;
- tombstone propagation;
- device revoke/loss;
- recovery;
- no plaintext-content authority delegated to a coordination service without explicit product decision.

MyWrite uses first-party stable creation IDs and real creation time; it does not impersonate an AI message.

Voice is a source/write workflow with explicit microphone/transcription permissions.

## 11. Migration contract

Any change to schema, identity or canonical body representation requires a Migration Receipt.

Required:
- from/to schema/runtime;
- local entity counts and safe hashes;
- identity mapping;
- Source/Working/Thought body preservation;
- revision graph preservation;
- unknown-time preservation;
- tombstone/exclusion preservation;
- authorization delta;
- Backup compatibility;
- interruption injection;
- rollback result;
- remaining limitations.

Real private text/identifying IDs stay local. Public evidence uses counts/hashes/states.

Do not begin a destructive migration until the supported current library has a proven recovery point.

## 12. Technical non-goals

Do not:
- choose a vector database before retrieval evidence;
- upload the whole library to cloud as a shortcut;
- rewrite Source content during UI migration;
- create one archive model per provider;
- use remotely delivered arbitrary executable adapter code;
- treat historical prompts as agent authorization;
- add a new durable body store for each UI;
- preserve an obsolete coordinator merely because many tests target it—replace tests with equivalent or stronger behavior evidence when the product path is replaced.
