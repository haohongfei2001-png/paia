# PAIA Roadmap

Status: **current roadmap source of truth**

Baseline: **v0.12.0 — Thought Evolution & Shared Context + post-release consolidation rounds**

PAIA is no longer in a phase where the main goal is to add more feature categories. Current priorities are product validation, Reader/Search/Revisit quality, trust-boundary hardening and keeping future expansion cheap.

## Decision rules

Across all rounds:

- Preserve Source / Working Input / Thought trust boundaries.
- Durable content schema is frozen by default; prefer projections/read models over new fact stores.
- Do not silently overwrite user work.
- Do not introduce hidden background Provider calls or automatic paid retries.
- Do not turn every capability into a separate page/database.
- Security decisions must live on trusted main paths, never in analytics side channels.
- Search/Reader/Revisit projections must not become new content truth layers.
- Retention work must create return value, not push-notification or opaque engagement machinery.
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

Delivered:

- bounded `UniversalSearchService` over existing Input/Thought/AI-organized projection reads;
- header-level **全局搜索** without another primary navigation destination;
- grouped Input / Thought / AI整理 results with bounded snippets;
- deeper-result navigation through existing Reader pagination;
- **“以前的我”** chronology over matching Input expressions without inferred belief change;
- explicit Search → AI Context preparation without automatic build/share;
- fixed-field Universal Search follow-through metrics;
- Round 4.6 tests and truth-source documentation updates.

Runtime/data impact:

- no new object store/body truth layer;
- no vector/embedding/model;
- no new Manifest permission, capture adapter, Provider or network request.

Engineering exit criterion: **met at source level**.

Product exit criterion: **not met**. Reader/Search advantage still requires real-use evidence.

---

## Round 4.7 — Revisit / Retention Surface

Status: **source implementation completed 2026-09-12; browser/product validation pending**

Goal: give users a reason to return by resurfacing real local value, without becoming an engagement-notification system or generating more AI content.

Delivered:

- Added `core/revisit.js` as a bounded local Revisit read model over existing Input/Thought/AI-presentation facts.
- Revisit persists only one lightweight `meta` cursor (`revisit:v1`: last Input block sequence + last-seen time). It stores no body text and is excluded from PAIA Backup.
- First use establishes a baseline only after explicit user action; existing archive history is not falsely classified as unread/new.
- Opening Revisit never advances the cursor. Only explicit **“从现在开始记录 / 已读到这里”** marks the current anchor.
- Added **newly collected Input** resurfacing since the explicit baseline. Scan is bounded and excludes removed/branch-pending/Smart-Filtered Inputs from the return surface.
- Added **Thought topics with new material** using existing local AI-presentation pending-delta state. Revisit itself never calls the Organizer or Provider.
- Added **older material resurfacing** with an explainable policy: source-send-time at least 90 days old, with priority for Inputs the user edited or Inputs already used as Thought evidence.
- Old-material rotation is deterministic for the same local day; it is not random recommendation sampling.
- Revisit computes its heavier old-content scan only after explicit user action. Normal Reader startup does not precompute the feed merely to show a badge.
- Added a header-level **回访** dialog beside Universal Search rather than another first-level navigation page.
- Revisit opens existing Input/Thought Reader/search routes rather than creating another body/navigation state machine.
- Added fixed-field local Product Signals for Revisit open state, item type opened and explicit mark-seen action. No content text, title, topic ID or query is stored.
- The local validation page now shows Revisit follow-through alongside Search/Reader/Thought/Context metrics.
- Added `tests/revisit-round47.test.mjs` covering deterministic/meaningful resurfacing, first-use baseline semantics, cursor Backup exclusion/validation and privacy-safe signal fields.
- Updated `PRODUCT.md` / `ARCHITECTURE.md` so Revisit is current Reader behavior rather than a planned feed concept.

Runtime/data impact:

- No IndexedDB version or object-store change.
- No new body/search/recommendation truth store.
- No Manifest permission change.
- No capture-adapter change.
- No Provider/network request.
- No push notifications, alarms or background recommendation job.
- Revisit cursor writes do not wake Smart Filter/Library maintenance or emit ordinary archive-change broadcasts.

Validation status:

- Round 4.7 source tests are present and automatically discoverable by the existing Node test runner.
- The connected development device remains unavailable, so this session does **not** claim green `npm test`, package audit, Chrome E2E or live UI smoke results.
- Product value remains unproven until real Product Signals show that Revisit leads to voluntary reopening of old/new material rather than becoming an ignored control.

Engineering exit criterion: **met at source level**.

Product exit criterion: **not yet met**.

---

## Round 4.8 — Release Certification & Real-use Observation

Status: **recommended next operational round, not started**

Goal: stop adding product scope long enough to determine whether Rounds 2–4.7 actually form a stable daily-use product.

Work when an executable development environment is available:

- run the complete Node regression suite including Rounds 2–4.7;
- run current release packaging and package/release guards;
- run targeted Chrome journeys for Universal Search, Revisit, Search → Reader, Search → Context, Context Package and Passport revoke/expire/once semantics;
- fix only regressions, performance problems and confusing daily-use friction discovered by those runs;
- enable local Product Signals explicitly on a real daily-use profile and accumulate evidence over time;
- review whether Universal Search/Revisit produce result opening, old-content rereading, copying or Context preparation.

Constraint: Round 4.8 is a certification/observation round, not permission to add another major feature category.

Exit criterion:

- executable regression/package/browser checks are green or have explicit known limitations;
- at least one Reader/Search/Revisit loop has real repeat-use evidence strong enough to guide the next product decision.

---

## Round 5 — Portability, Second Adapter & Sync Readiness

Status: **gated**

Prerequisites:

- core reread/retrieval/return loop has real-use evidence;
- Context/Passport direction is justified by use if Round 5 depends on it;
- Round 2–4.7 runtime tests can execute successfully in a real development environment;
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
- embeddings/vector storage before measured lexical-search failures justify them;
- push notifications, streaks or opaque engagement recommendations merely to increase return frequency.
