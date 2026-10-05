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

### 5.4 Personal Prompt Reuse Surface

The prompt surface is a derived/local reuse capability over eligible
user-authored Working Inputs plus explicit user-owned template overrides. It is
not a fourth archive, another Source layer or another AI Context store.

Architecture requirements:

- Stage 1/2 candidate grouping/ranking is local and does not read assistant
  replies or call a Provider.
- Keep provider-specific composer discovery/insertion in provider adapters.
  Generic arbitrary-site contenteditable injection is not an accepted fallback.
- The trusted extension side owns Prompt Family queries and user overrides.
  The host page receives only the text the user explicitly chooses to insert.
  Do not preload the whole personal prompt library into ordinary host-page DOM or
  website storage as a convenience shortcut.
- A Shadow DOM may provide style encapsulation but must not be treated as an
  authorization boundary by itself; choose an extension-controlled rendering
  boundary whose exposure model passes security review.
- Ordinary insert is a user gesture and must never call send/submit. Exact
  insertion is acknowledged only after the adapter can verify the composer state.
  Unknown acknowledgement does not retry automatically.
- Existing draft text, selection/IME state and framework editor ownership must be
  preserved. Explicit destructive replace is separate from the normal row click.
- Prompt Family membership/ranking is rebuildable. Durable state is limited to
  real user work/preferences such as edited template text, pin/manual order,
  chosen representative, hidden/split corrections and safe surface placement.
- Reuse-template edits never rewrite Source or Working Input. Prompt-specific
  independent template persistence does not resolve B-01/B-02 semantics for
  Thought or other derivatives.
- Do not add a new object store merely to cache ranking. If durable edited
  template text cannot fit an existing versioned state boundary safely, answer
  the durable-schema freeze questions and ship an explicit migration/Backup rule.
- Stage 3A is a separately authorized local capability governed by
  `PROMPT_REUSE_STAGE_3A.md`. Keep Stage 1/2 reply-blind.
- Stage 3A owns a provider-specific **CurrentReplyAdapter** that identifies the
  current newly completed latest assistant reply and final-generation lifecycle
  in the isolated extension world. Do not broaden the existing user-only capture
  parser/metadata bridge into a general assistant-body pipeline merely for
  convenience.
- Full assistant reply text remains ephemeral. No reply body store, object store,
  durable cache, Backup row, website storage or ordinary body log is added.
- A pure local **NextActionDetector** produces DIRECT_REPLY / CHOICE /
  REQUEST_USER_MATERIAL / PROMPT_FAMILY_MATCH / DEFER from bounded current-reply
  input. It performs zero Provider/model/network requests.
- Prompt Family matching reuses current eligible PromptReuseService results and
  local lexical primitives through a disposable bounded view; it does not add a
  second prompt archive, vector database or per-token full-library scan.
- Direct-extracted/choice suggestions are ephemeral trusted candidates, not fake
  persistent Prompt Families. The worker must bind each candidate to current
  tab/document/conversation/reply revision and authorization generation, then
  revalidate it at click time.
- Recommendation rendering stays in an extension-controlled frame/boundary. Do
  not expose the whole prompt library, reply snapshot or detector evidence to the
  host page merely because a capsule is visible.
- Suggestion insertion reuses the existing provider-specific composer execution
  and read-back/no-send guarantees, but it must not weaken the current Prompt
  Family resolver to admit arbitrary strings.
- Disable/revoke invalidates the reply reader, in-flight analysis and candidate
  tokens. A late result may not recreate a suggestion.
- Stage 3B external/model generation remains B-04-3B-gated and is not authorized
  by Stage 3A.

Visual isolation and insertion security are both product requirements: style
encapsulation alone is insufficient if it exposes the user's full prompt list to
host scripts.

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
