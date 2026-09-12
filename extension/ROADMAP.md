# PAIA Roadmap

Status: **current roadmap source of truth**

Baseline: **v0.12.0 — Thought Evolution & Shared Context**

The next stage is not a race to add more features. PAIA already has a comparatively deep archive, Thought and Context foundation. The roadmap now prioritizes product validation, reading/retrieval quality and architectural simplification before cloud or multi-platform expansion.

## Decision rules

Across all rounds:

- Preserve Source / Working Input / Thought trust boundaries.
- Durable schema is frozen by default; prefer projections/read models over new fact stores.
- Do not silently overwrite user work.
- Do not introduce hidden background provider calls or automatic paid retries.
- Do not turn each product capability into a separate page or database by default.
- A later round may be reordered if real usage evidence shows a stronger bottleneck.

---

## Round 1 — Product & Architecture Consolidation

Status: **completed 2026-09-12**

Goal: remove documentation ambiguity and freeze speculative complexity before more runtime work.

Delivered:

- Created `PRODUCT.md` as the current product source of truth.
- Created `ARCHITECTURE.md` as the current architecture source of truth.
- Replaced the obsolete pre-v0.5 roadmap with this roadmap.
- Updated `AGENTS.md` so future AI development reads current truth before historical specs.
- Updated `README.md` so the repository clearly distinguishes current release behavior from forward product direction.
- Explicitly froze new durable schema/Thought ontology by default.
- Added `PRODUCT.md`, `ARCHITECTURE.md` and `ROADMAP.md` to the formal release allowlist.
- Added a release-product guard that fails if the current product documents are omitted from an emitted release.

Runtime impact:

- No IndexedDB/schema migration.
- No capture/Reader/Thought/Context behavior change.
- No Manifest permission or Provider/network change.

Exit criterion: **met**. A fresh developer/agent can identify the current product definition, data ownership rules, deliberate freezes and next development round without treating historical version plans as current direction.

---

## Round 2 — Reader & Unified Search Foundation

Status: **implementation completed 2026-09-12; full regression execution pending an available development runtime**

Goal: make PAIA materially better than returning to ChatGPT history for rereading and retrieval, while stopping Input / Thought / Context search logic from drifting into separate lexical systems.

Delivered:

- Added `core/search-service.js` as the provider-neutral shared lexical search foundation.
- Preserved the established Input/Thought ranking contract (`exact title → partial title → body`) while routing the legacy `search-ranking.js` API through the shared service.
- Moved Context query normalization, Chinese 2/3-character query terms, overlap scoring, shared lexical relevance and Unicode-safe excerpt selection into the shared Search Service.
- Changed Thought Library search to consume the shared ranking/excerpt primitives without changing its durable postings/index schema.
- Changed Input search result excerpts to use the same Unicode-safe excerpt selection rather than normalized-string offsets or raw UTF-16 slicing.
- Added Reader behavior for Input search results: after opening the bounded document page around a matching Input, PAIA waits for the target reading DOM, centers the exact Input and highlights the search phrase without stealing focus into the editable body.
- Confirmed Thought Library already had equivalent result-to-reading behavior through `focusSection` / `focusEntry` plus reading highlights, so no second Thought navigation mechanism was added.
- Added `tests/search-service-round2.test.mjs` covering compatibility ranking, shared Chinese/Latin query preparation, Context/shared score identity and Unicode/emoji-safe excerpts.
- Kept `search-ranking.js` as a compatibility facade so existing callers can migrate incrementally rather than requiring a large coordinated rewrite.

Runtime/data impact:

- No IndexedDB version or object-store change.
- No new canonical text copy or Reader persistence layer.
- No vector database, embeddings, local model or new Provider request.
- No Manifest permission/network change.
- Existing Thought search postings remain rebuildable derived indexes.

Validation status:

- The new test file is automatically discovered by `scripts/test.mjs` and classified as a unit test by the existing test grouping rules.
- Existing `search-hardening-v092.test.mjs` and `memory-ranking-v0100.test.mjs` remain the principal regression contracts for ranked Input/Thought search and Context retrieval behavior.
- This development session did not claim a green full suite: the connected development machine/runtime was unavailable, so `npm test` / browser journeys could not be executed here. The source changes were kept deliberately bounded for that reason.
- Real-use retrieval advantage is **not** claimed by this round. Measuring whether PAIA actually beats returning to ChatGPT history is a product question and is carried into Round 3.

Engineering exit criterion: **met at source level**. Input, Thought and Context now share one lexical search foundation and Input search opens into an explicit Reader target rather than merely the right document page.

Product exit criterion: **deferred to Round 3**. Repeatable reread/retrieval advantage must be demonstrated from local real-use signals rather than inferred from implementation quality.

---

## Round 3 — Local Product Validation

Status: **instrumentation implemented 2026-09-12; real-use evidence accumulation pending explicit local opt-in; full regression execution pending an available development runtime**

Goal: shift PAIA from engineering-validated to product-validated without creating a second behavioral-content archive.

Delivered:

- Added `core/product-signals.js` as a local-only aggregate Product Signals service.
- Product Signals is **off by default** and can be enabled, disabled, cleared and exported by the user.
- Signals accept only a fixed event taxonomy and fixed enum dimensions. Search text, archive text, titles, Topic names, Profile names, object IDs and arbitrary metadata are rejected rather than stored.
- Signals are aggregated into date buckets and counters only, with a hard 90-day retention window enforced both on writes and diagnostics reads.
- The Product Signals row is derived diagnostic metadata and is explicitly outside PAIA Backup; it is not a Source / Input / Thought / Context truth layer.
- Added observable signals for Input search hit/miss, search-result open, coarse content-age buckets and successful Reader copy/reuse.
- Added observable signals for Thought search hit/miss, search-result Topic open, first/repeat Topic visits, AI-organized view opens, returns to Original and successful saved AI-presentation edits.
- Added observable signals for Context preview generation outcome, default/custom Profile use, detail level and explicit copy/Markdown share actions.
- Reused existing `readingActivity` to classify first/repeat Topic reading instead of creating a per-Topic analytics history.
- Added `ui/product-signals.html` as a dedicated local diagnostics surface showing recent 30-day Input / Thought / Context loops, with export and destructive clear controls.
- Linked the diagnostics surface from the extension popup rather than adding another primary product navigation item.
- Product-signal writes are side-channel only: failures do not fail search, reading, Context generation, AI editing or copying, and `PAIA_PRODUCT_*` messages do not wake Smart Filter / Library maintenance or broadcast `ARCHIVE_CHANGED`.
- Added `tests/product-signals-round3.test.mjs` covering fixed-field validation, no arbitrary private metadata, retention, exact 30-day summaries, coarse age buckets, observational loop summaries and explicit exclusion from Backup.

Runtime/data impact:

- No IndexedDB version or object-store change; aggregate counters reuse the existing `meta` store.
- No new canonical content copy, event-body log, query history or per-object analytics table.
- No new network request, analytics SDK, Provider call or Manifest permission.
- Product statistics are local-only and are not restored through PAIA Backup.

Interpretation rules:

- A repeat Topic open is an observed revisit, not proof of satisfaction.
- Switching from AI整理 back to Original is an observed view change, not a rejection label.
- Saving an AI整理 edit is an observed maintenance action, not proof that the AI output was accepted wholesale.
- A Context copy/export signal is an explicit share action, not evidence that the receiving AI used the context successfully.
- Product decisions should use patterns accumulated over time, not one isolated counter.

Validation status:

- The Round 3 test file is automatically discoverable by the existing test runner as a unit test.
- Source-level comparison from the Round 2 baseline is deliberately bounded to Product Signals, the background routing boundary, Reader copy/search-origin instrumentation, the diagnostics UI and roadmap/tests; Manifest, capture adapters, durable schema and Provider code are unchanged.
- This development session still does not claim a green `npm test` / browser E2E suite because the connected development runtime is unavailable.
- No product-value claim is made yet: the counters begin at zero and remain off until explicitly enabled.

Engineering exit criterion: **met at source level**. PAIA can now measure its main reread/search/reuse loops locally without collecting the private content those loops operate on.

Product exit criterion: **not yet met**. At least one core repeat-use loop must accumulate observed local behavior before the project can claim product validation or use Round 3 as evidence for a major new product surface.

Round 4 gate: **closed until evidence exists**. In particular, a larger Passport/Context system should not be justified merely because the instrumentation now exists.

---

## Round 4 — Context Package & Minimum Passport

Prerequisite: Round 3 shows repeated Context/reuse demand.

Goal: turn AI Context from an isolated preview/export feature into a stable reusable interface while consolidating authorization semantics.

Deliverables:

- Define a stable Context Package contract over current trusted data.
- Reuse the unified Search Service for candidate retrieval.
- Define a minimum Grant model: consumer, purpose, resource scope, permissions, duration/expiry and revocation.
- Add metadata-only access audit where feasible.
- Unify existing Topic/Profile/external-access/provider authorization concepts instead of duplicating them.

Constraints:

- Passport owns permission metadata, not archive body text.
- No broad autonomous agent access by default.
- No new persistent Context body cache without a separate privacy/product decision.

Exit criterion:

The same Context/authorization contract can support at least two explicit reuse surfaces without bespoke permission logic for each.

---

## Round 5 — Portability, Second Adapter & Sync Readiness

Prerequisites:

- core reread/retrieval loop is validated;
- Context/Passport direction is justified if included;
- schema ownership is stable enough to reason about conflicts.

Goal: prove PAIA can become a personal data layer without prematurely building a distributed system.

Deliverables:

- Add a second capture/import adapter to validate provider-neutral Source/Input boundaries.
- Specify an encrypted sync contract, conflict model and deletion/tombstone propagation semantics.
- Define device identity and merge rules before implementing general cloud sync.
- Evaluate a Web/Desktop surface only for tasks the extension cannot serve well.

Constraints:

- Do not implement multi-device sync by copying the local database wholesale.
- Do not silently resolve conflicting human edits by latest-write-wins.
- Sync must enrich facts and preserve user work/deletion fences.

Exit criterion:

PAIA has a tested provider-neutral input boundary and an explicit sync/conflict specification strong enough to implement without guessing ownership rules.

---

## Later, only after the gates above

Potential later directions:

- encrypted multi-device sync;
- Web App / Desktop / mobile Reader surfaces;
- MCP/API/agent access through Passport grants;
- semantic/vector retrieval as a rebuildable Search implementation;
- additional capture sources;
- stronger on-device/hybrid organization.

These are not current commitments.

## Explicitly deprioritized now

- More Thought Library ontology/features merely because v0.12 can support them.
- Knowledge graph as a product goal.
- Provider proliferation.
- Automatic background AI organization.
- Cloud sync before conflict semantics and product value are proven.
- Native apps that only duplicate the current extension UI.
