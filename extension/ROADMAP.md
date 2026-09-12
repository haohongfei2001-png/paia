# PAIA Roadmap

Status: **current roadmap source of truth**

Baseline: **v0.12.0 — Thought Evolution & Shared Context**

The next stage is not a race to add more features. PAIA already has a comparatively deep archive, Thought and Context foundation. The roadmap prioritizes product validation, reading/retrieval quality and architectural simplification before cloud or multi-platform expansion.

## Decision rules

Across all rounds:

- Preserve Source / Working Input / Thought trust boundaries.
- Durable schema is frozen by default; prefer projections/read models over new fact stores.
- Do not silently overwrite user work.
- Do not introduce hidden background provider calls or automatic paid retries.
- Do not turn each product capability into a separate page or database by default.
- A later round may be reordered by an explicit product-owner decision, but an implementation override is not evidence that the original product gate was satisfied.

---

## Round 1 — Product & Architecture Consolidation

Status: **completed 2026-09-12**

Goal: remove documentation ambiguity and freeze speculative complexity before more runtime work.

Delivered:

- Created `PRODUCT.md` as the current product source of truth.
- Created `ARCHITECTURE.md` as the current architecture source of truth.
- Replaced the obsolete pre-v0.5 roadmap with this roadmap.
- Updated `AGENTS.md` and `README.md` so current truth outranks historical specs for new development.
- Explicitly froze new durable schema/Thought ontology by default.
- Added the current truth-source documents to formal release packaging/guards.

Runtime impact:

- No IndexedDB/schema migration.
- No capture/Reader/Thought/Context behavior change.
- No Manifest permission or Provider/network change.

Exit criterion: **met**.

---

## Round 2 — Reader & Unified Search Foundation

Status: **implementation completed 2026-09-12; full regression execution pending an available development runtime**

Goal: make PAIA materially better than returning to ChatGPT history for rereading and retrieval, while stopping Input / Thought / Context search logic from drifting into separate lexical systems.

Delivered:

- Added `core/search-service.js` as the provider-neutral shared lexical search foundation.
- Preserved the established Input/Thought ranking contract (`exact title → partial title → body`) while routing legacy ranking through the shared service.
- Shared Context query normalization, Chinese 2/3-character query terms, overlap scoring, lexical relevance and Unicode-safe excerpt selection.
- Moved Thought and Input search onto shared ranking/excerpt primitives without replacing existing durable postings/index structures.
- Added explicit Input Reader result targeting: center the exact matched Input and highlight the query without stealing edit focus.
- Kept Thought's existing `focusSection` / `focusEntry` behavior rather than building a second navigation mechanism.
- Added `tests/search-service-round2.test.mjs`.

Runtime/data impact:

- No IndexedDB version or object-store change.
- No new canonical text copy or Reader persistence layer.
- No vector database, embeddings, local model or new Provider request.
- No Manifest permission/network change.

Engineering exit criterion: **met at source level**.

Product exit criterion: **deferred to Round 3**. Repeatable reread/retrieval advantage must be demonstrated from real use rather than inferred from implementation quality.

---

## Round 3 — Local Product Validation

Status: **instrumentation implemented 2026-09-12; real-use evidence accumulation still pending explicit local opt-in; full regression execution pending an available development runtime**

Goal: shift PAIA from engineering-validated to product-validated without creating a second behavioral-content archive.

Delivered:

- Added a local-only aggregate Product Signals service, off by default.
- Signals accept only fixed event names and fixed enum dimensions; search text, archive text, titles, Topic names, Profile names, object IDs and arbitrary metadata are rejected rather than stored.
- Aggregate date buckets/counters have a hard 90-day retention window and are outside PAIA Backup.
- Added observable signals for Input search/reopen/reuse, Thought search/repeat visits/AI-view maintenance, and Context build/share actions.
- Reused existing Topic `readingActivity` rather than introducing a per-Topic analytics history.
- Added the low-frequency local tools surface for viewing/exporting/clearing the aggregate statistics.
- Added `tests/product-signals-round3.test.mjs`.

Interpretation rules remain strict:

- A repeat Topic open is not proof of satisfaction.
- Switching back to Original is not labeled as rejecting AI.
- Saving an AI整理 edit is not proof of accepting the AI output wholesale.
- Context copy/export does not prove a receiving AI used the context successfully.

Engineering exit criterion: **met at source level**.

Product exit criterion: **not yet met**. The counters begin at zero and remain off until explicitly enabled; no repeat-use loop has yet been established by observed local behavior.

Round 4 prerequisite status: **not satisfied by evidence**. Round 4 was nevertheless implemented after an explicit product-owner request to proceed. That override changes implementation order only; it does not convert missing Round 3 evidence into validation.

---

## Round 4 — Context Package & Minimum Passport

Status: **source implementation completed 2026-09-12 by explicit product-owner override; product validation remains pending; full regression execution pending an available development runtime**

Goal: turn AI Context from an isolated preview/export feature into a stable reusable interface and add the smallest useful authorization layer without building an autonomous permissions platform.

Delivered:

- Added `core/context-package.js` with a stable, ephemeral Context Package metadata contract over the existing AI Context preview lifecycle.
- Context Package carries `packageId`, `previewId`, optional/bound `grantId`, `resourceScope=profile`, `profileId`, consumer, purpose, `context_export` permission, budget, freshness/generation and size metadata.
- Package bodies remain ephemeral: no new persistent Context body cache or canonical text copy was introduced.
- Existing manual AI Context copy/export remains backward compatible and is treated as an explicit manual one-time authorization.
- Added `core/passport.js` with a minimum metadata-only Grant model:
  - fixed consumer;
  - fixed purpose;
  - `resourceScope=profile`;
  - Profile reference;
  - `permission=context_export`;
  - duration `once | 7d | 30d`;
  - expiry, revocation, one-time consumption and use metadata.
- Passport reuses the existing AI Context Profile as the content-selection scope. It does not duplicate Topic allow/deny/never rules.
- Added metadata-only access audit, bounded to 90 days / 200 rows and independently clearable.
- Passport Grant/audit rows reuse the existing `meta` store and are deliberately excluded from PAIA Backup so restore cannot silently reactivate old external-use permissions.
- Added explicit preview-to-Grant binding. Binding fixes Grant/consumer/purpose/Profile metadata in the Context Package but does not consume the Grant.
- Protected share is fail-closed even though the existing background observation hook is side-channel: reconstructed text is blanked before Passport validation and restored to the trusted UI only after the already-bound Grant validates and is consumed.
- Unbound, mismatched, revoked, expired or consumed-once Grants cannot release protected Context text.
- The existing `externalAccess` switch and AI Context Profile rules remain stronger gates; Passport cannot expand what content is eligible.
- Expanded the existing low-frequency local tools page rather than adding Passport to primary navigation. It supports Grant creation/revocation, access-audit review/clear, Package preview binding, and Grant-protected copy/Markdown export.
- Added `tests/passport-round4.test.mjs` and `tests/passport-product-gate-round4.test.mjs` covering Package metadata, fixed Grant fields, Profile scope, expiry/revocation/one-time consumption, metadata-only audit, explicit binding, mismatch/unbound denial, Backup exclusion and fail-closed release.
- Updated `ARCHITECTURE.md` so Search, Context Package and Passport are current architecture rather than future proposals.

Runtime/data impact:

- No IndexedDB version or object-store change.
- No Manifest permission change.
- No capture adapter change.
- No additional network request, analytics SDK or Provider integration.
- No persistent Context body history.
- No autonomous agent/background access.

Validation status:

- Round 4 tests are automatically discoverable by the existing Node test runner at source level.
- The development runtime was unavailable and an isolated clone could not resolve GitHub, so this session does **not** claim a green `npm test`, package audit or Chrome E2E run.
- The security contract is represented in source-level regression tests, but a release still requires execution of those tests and relevant browser journeys.
- Round 3 product evidence is still absent; implementing Passport early does not prove users need a larger Passport product.

Engineering exit criterion: **met at source level**. The same AI Context compiler now supports ordinary explicit manual export and a Grant-bound Context Package export without separate content-permission systems.

Product exit criterion: **not met**. Passport/Context reuse must still be observed in real use before it justifies broader agent/API integration.

---

## Round 5 — Portability, Second Adapter & Sync Readiness

Status: **gated**

Prerequisites:

- core reread/retrieval loop is validated with real-use evidence;
- the Context/Passport direction is justified by use if Round 5 depends on it;
- schema ownership is stable enough to reason about conflicts;
- Round 2–4 runtime tests can be executed in an available development environment.

Goal: prove PAIA can become a personal data layer without prematurely building a distributed system.

Potential deliverables after the gate is deliberately opened:

- Add a second capture/import adapter to validate provider-neutral Source/Input boundaries.
- Specify an encrypted sync contract, conflict model and deletion/tombstone propagation semantics.
- Define device identity and merge rules before implementing general cloud sync.
- Evaluate a Web/Desktop surface only for tasks the extension cannot serve well.

Constraints:

- Do not implement multi-device sync by copying the local database wholesale.
- Do not silently resolve conflicting human edits by latest-write-wins.
- Sync must enrich facts and preserve user work/deletion fences.
- Do not treat early Passport implementation as permission for broad autonomous agent access.

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
