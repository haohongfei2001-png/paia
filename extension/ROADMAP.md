# PAIA Roadmap

Status: **current roadmap source of truth**

Baseline: **v0.12.0 — Thought Evolution & Shared Context + post-release consolidation rounds**

PAIA is no longer in a phase where the main goal is to add more feature categories. Current priorities are product validation, Reader/Search quality, trust-boundary hardening and keeping future expansion cheap.

## Decision rules

Across all rounds:

- Preserve Source / Working Input / Thought trust boundaries.
- Durable content schema is frozen by default; prefer projections/read models over new fact stores.
- Do not silently overwrite user work.
- Do not introduce hidden background Provider calls or automatic paid retries.
- Do not turn every capability into a separate page/database.
- Security decisions must live on trusted main paths, never in analytics side channels.
- Search/Reader projections must not become new content truth layers.
- A product-owner override may change implementation order, but it is not evidence that a product gate was satisfied.

---

## Round 1 — Product & Architecture Consolidation

Status: **completed 2026-09-12**

Delivered current product/architecture/roadmap truth sources, documentation authority, release guards and the default durable-schema freeze.

Exit criterion: **met**.

---

## Round 2 — Reader & Unified Search Foundation

Status: **source implementation completed 2026-09-12; executable full regression still pending an available development runtime**

Delivered shared lexical Search Service primitives across Input, Thought and Context, ranking compatibility, CJK query terms, Unicode-safe excerpts and exact Input result → Reader positioning.

Engineering exit criterion: **met at source level**.

Product exit criterion: **still depends on real-use evidence**.

---

## Round 3 — Local Product Validation

Status: **instrumentation implemented 2026-09-12; real-use evidence accumulation still pending explicit local opt-in; full regression execution pending**

Delivered local-only aggregate Product Signals, fixed privacy-preserving event taxonomy, 90-day aggregate retention, Input/Thought/Context loop metrics and the low-frequency local tools surface.

Interpretation remains conservative: counters describe observable behavior, not satisfaction or user intent.

Engineering exit criterion: **met at source level**.

Product exit criterion: **not met**. Real repeat-use evidence has not yet accumulated.

---

## Round 4 — Context Package & Minimum Passport

Status: **implemented 2026-09-12 by explicit product-owner override; product validation still pending**

Delivered the ephemeral Context Package contract, minimum metadata-only Passport Grant/audit, explicit preview → Grant binding, Backup exclusion and low-frequency management/export UI.

The tactical Round 4 security path was superseded by Round 4.5.

Product exit criterion: **not met**. Broader agent/API work remains unjustified without repeated Context reuse.

---

## Round 4.5 — Runtime Hardening & Context/Passport Architecture Cleanup

Status: **source implementation completed 2026-09-12; full executable regression/package/Chrome validation pending an available development runtime**

Delivered:

- trusted `ContextPackageService` main-path authorization/release;
- Grant validation before protected `MemoryService.share()` reconstruction;
- Product Signals reduced to observation-only metrics;
- explicit Product / Passport / Context / Memory command ownership;
- low-frequency UI migrated to the explicit APIs;
- source-level architecture/security regression tests.

Engineering exit criterion: **met at source level**.

---

## Round 4.6 — Reader & Search Productization

Status: **source implementation completed 2026-09-12; browser/product validation pending**

Goal: turn the shared Search foundation into a visibly better reread/reuse experience without adding another search truth layer.

Delivered:

- Added `core/universal-search.js` as a bounded coordinator over existing Input search, Thought search and already-stored AI-organized projection text.
- Universal Search is exposed through the existing `SEARCH_INPUTS` domain path with `universal:true`; ordinary Input search is unchanged.
- `OrganizerStore` delegates only that explicit mode to `UniversalSearchService`, keeping the service worker unchanged and thin.
- One query returns grouped Input Archive / Thought Library / AI整理 result DTOs with bounded snippets rather than full duplicate bodies.
- No Provider call is made for Universal Search. AI整理 matching searches only existing saved projection text.
- Added a header-level **全局搜索** dialog installed from the shared Search experience module rather than another primary navigation destination.
- Universal Search results reuse existing Input/Thought Reader routes. The UI follows existing local-search pagination when needed so deeper bounded results can still open the exact Reader target.
- Added **“以前的我”** as a chronological projection over the matching Input results. It orders available source-send-time evidence from old to new and explicitly states that chronology is not inferred belief change.
- Added explicit **“用于 AI Context”** on search results. It prefills the existing Context Builder with a bounded local retrieval query using the selected snippet/current search; it does not change authorization, generate a preview, call a Provider or share anything automatically.
- Preserved the Round 2 search-origin marker so successful copy after a located Input remains measurable as search-driven reuse.
- Expanded Product Signals with fixed-field Universal Search hit/miss, result-open and Search → Context-preparation counters. No query text or object ID is stored.
- The local product-validation page now shows Universal Search / Reader follow-through rates alongside Input, Thought and Context metrics.
- Added `tests/universal-search-round46.test.mjs` covering bounded coordination, snippet-only DTOs, local AI projection matching, longitudinal ordering, Search → Context query bounds, fixed metric fields and the no-persistence/no-vector boundary.
- Updated `PRODUCT.md` and `ARCHITECTURE.md` so Universal Search and longitudinal Reader are current behavior, not future proposals.

Runtime/data impact:

- No IndexedDB version or object-store change.
- No new search/body truth store.
- No embedding/vector index or model.
- No Manifest permission change.
- No capture-adapter change.
- No new Provider/network request.
- No automatic Context build/share or authorization expansion.

Validation status:

- Round 4.6 source tests are present and automatically discoverable by the existing Node test runner.
- The connected development device remains unavailable, so this session does **not** claim green `npm test`, package audit, Chrome E2E or live UI smoke results.
- Product value remains unproven until real Product Signals show that Universal Search leads to result opening, rereading/copying or Context preparation.

Engineering exit criterion: **met at source level**.

Product exit criterion: **not yet met**. Reader/Search advantage still requires real-use evidence.

---

## Round 4.7 — Revisit / Retention Surface

Status: **recommended next product round, not started**

Goal: give users a reason to return without relying on push notifications or more AI generation.

Candidate work:

- surface meaningful newly accumulated Inputs;
- show Topics with materially new supporting expressions;
- resurface older relevant material using local facts/history;
- connect resurfacing back into Reader/Universal Search rather than generating a separate feed truth;
- keep generated interpretation clearly separate from original user wording.

Constraint: this round should use Round 3/4.6 local signals where available and should not become an engagement-notification system.

---

## Round 5 — Portability, Second Adapter & Sync Readiness

Status: **gated**

Prerequisites:

- core reread/retrieval loop has real-use evidence;
- Context/Passport direction is justified by use if Round 5 depends on it;
- Round 2–4.6 runtime tests can execute in a real development environment;
- schema ownership is stable enough to reason about conflicts.

Potential work after the gate is deliberately opened:

- add a second capture/import adapter to test provider-neutral Source/Input boundaries;
- specify encrypted sync semantics, device identity, merge rules, conflict UI and tombstone/deletion propagation before implementing general sync;
- evaluate Web/Desktop only for tasks the extension cannot serve well.

Constraints:

- Do not sync by copying the entire local database wholesale.
- Do not silently resolve conflicting human edits with latest-write-wins.
- Sync must enrich facts while preserving user work and deletion fences.
- Early Passport implementation is not permission for broad autonomous agent access.

---

## Later, only after the gates above

Potential later directions:

- encrypted multi-device sync;
- Web / Desktop / mobile Reader surfaces;
- Google Drive or other portable Context backends;
- MCP/API/agent access through Passport Grants;
- semantic/vector retrieval as a rebuildable Search implementation;
- additional capture sources;
- stronger on-device/hybrid organization.

These are not current commitments.

## Explicitly deprioritized now

- more Thought Library ontology merely because the schema can support it;
- knowledge graph as a product goal;
- Provider proliferation;
- automatic background AI organization;
- cloud sync before conflict semantics and product value are proven;
- native apps that only duplicate the extension UI;
- broad Passport/agent integration before repeated Context reuse is observed;
- embeddings/vector storage before measured lexical-search failures justify them.
