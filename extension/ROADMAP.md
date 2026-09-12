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

Goal: make PAIA materially better than returning to ChatGPT history for rereading and retrieval.

Product work:

- Treat Reader as a reusable presentation layer for Input and Thought content.
- Reduce navigation/UI noise around ordinary reading.
- Improve long-document position continuity, source jumps, copy/reuse and older-material discovery.
- Define one Search Service boundary used by Input search, Thought search and Context candidate retrieval.

Engineering work:

- Wrap existing lexical/indexed retrieval behind the shared Search Service before adding semantic retrieval.
- Begin incremental decomposition of oversized archive/UI/background coordination files when touched by this work.
- Do not add a Reader body database.

Validation:

- Measure retrieval failures on real personal-use queries without committing private content.
- Compare whether users can find known old material faster/more reliably through PAIA than through original chat history.

Exit criterion:

Reader/Search demonstrates a repeatable retrieval/reread advantage and the three existing retrieval surfaces no longer need to evolve separate search contracts.

---

## Round 3 — Local Product Validation

Goal: shift PAIA from engineering-validated to product-validated.

Deliverables:

- Add privacy-preserving local-only product signals for reread/search/reuse behavior.
- No raw archive text in metrics.
- Build a local product diagnostics view or export that can answer questions such as:
  - how often old Inputs are reopened;
  - search → open/copy success;
  - Thought Topic repeat visits;
  - AI-organized view acceptance/edit/rejection;
  - Context preview → copy/export conversion;
  - repeated Context use by purpose.

Decision use:

- If Reader/Search drives repeat use and Thought does not, prioritize retrieval over deeper organization.
- If Thought repeat visits are strong, improve organization quality selectively.
- If Context reuse is weak, do not build a large Passport system yet.

Exit criterion:

At least one core repeat-use loop is supported by observed behavior rather than design intuition alone.

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
