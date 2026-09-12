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

Status: **implementation completed 2026-09-12; executable engineering regression later certified by Round 4.8**

Delivered shared lexical Search Service primitives across Input, Thought and Context, ranking compatibility, CJK query terms, Unicode-safe excerpts and exact Input result → Reader positioning.

Engineering exit criterion: **met**.

Product exit criterion: **still depends on real-use evidence**.

---

## Round 3 — Local Product Validation

Status: **instrumentation implemented and executable regression certified 2026-09-12; real-use evidence accumulation still pending explicit local opt-in**

Delivered local-only aggregate Product Signals, fixed privacy-preserving event taxonomy, 90-day aggregate retention, Input/Thought/Context loop metrics and the low-frequency local tools surface.

Interpretation remains conservative: counters describe observable behavior, not satisfaction or user intent.

Engineering exit criterion: **met**.

Product exit criterion: **not met**. Real repeat-use evidence has not yet accumulated.

---

## Round 4 — Context Package & Minimum Passport

Status: **implemented 2026-09-12 by explicit product-owner override; product validation still pending**

Delivered the ephemeral Context Package contract, minimum metadata-only Passport Grant/audit, explicit preview → Grant binding, Backup exclusion and low-frequency management/export UI.

The tactical Round 4 security path was superseded by Round 4.5.

Product exit criterion: **not met**. Broader agent/API work remains unjustified without repeated Context reuse.

---

## Round 4.5 — Runtime Hardening & Context/Passport Architecture Cleanup

Status: **implementation completed 2026-09-12; executable regression/package/Chrome validation later certified by Round 4.8**

Delivered:

- trusted `ContextPackageService` main-path authorization/release;
- Grant validation before protected `MemoryService.share()` reconstruction;
- Product Signals reduced to observation-only metrics;
- explicit Product / Passport / Context / Memory command ownership;
- low-frequency UI migrated to the explicit APIs;
- source-level architecture/security regression tests.

Engineering exit criterion: **met**.

---

## Round 4.6 — Reader & Search Productization

Status: **implementation completed 2026-09-12; current browser engineering paths later certified by Round 4.8; product validation pending**

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

Engineering exit criterion: **met**.

Product exit criterion: **not met**. Reader/Search advantage still requires real-use evidence.

---

## Round 4.7 — Revisit / Retention Surface

Status: **implementation completed 2026-09-12; current browser engineering paths later certified by Round 4.8; product validation pending**

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

- Round 4.7 source tests are automatically discovered by the current Node regression suite.
- Round 4.8 current-browser certification covers the integrated Revisit/Search/Reader/Context/Passport daily-use path at engineering level.
- Product value remains unproven until real Product Signals show that Revisit leads to voluntary reopening of old/new material rather than becoming an ignored control.

Engineering exit criterion: **met**.

Product exit criterion: **not yet met**.

---

## Round 4.8 — Release Certification & Real-use Observation

Status: **engineering certification completed 2026-09-12; real-use observation remains open**

Goal: stop adding product scope long enough to determine whether Rounds 2–4.7 actually form a stable daily-use product.

Engineering work completed:

- complete current Node regression suite executes in CI;
- current release packaging and package/release guards execute successfully;
- targeted current Chrome journeys cover Universal Search, Revisit, Search → Reader, Search → Context, Context Package and Passport revoke/expire/once semantics;
- regressions and certification-only friction found during executable validation were repaired without opening new product scope;
- the current certification workflow now provides an executable merge gate for these paths.

Observation work still required:

- explicitly enable local Product Signals on a real daily-use profile;
- accumulate repeat-use evidence over time;
- review whether Universal Search/Revisit produce result opening, old-content rereading, copying or Context preparation.

Constraint: Round 4.8 is a certification/observation round, not permission to add another major feature category.

Engineering exit criterion: **met**.

Product exit criterion: **not met**. At least one Reader/Search/Revisit loop still needs real repeat-use evidence strong enough to guide the next product decision.

---

## Round 5 — Portability, Second Adapter & Sync Readiness

Status: **gated overall; Round 5A was opened by explicit product-owner override**

The override changes implementation order only. It does **not** mean the Round 5 product prerequisites below have been satisfied, and it does not open cloud sync, Web/Desktop expansion or broad provider proliferation.

Prerequisites for broader Round 5 work:

- core reread/retrieval/return loop has real-use evidence;
- Context/Passport direction is justified by use if later work depends on it;
- current runtime tests remain executable and green;
- schema ownership is stable enough to reason about conflicts.

### Round 5A — Second Import Adapter Validation

Status: **engineering implementation and synthetic contract certification completed 2026-09-12; real Claude export verification still pending**

Purpose: test whether the existing Source/Input import boundary is genuinely provider-neutral without opening live multi-provider capture or adding another durable data model.

Delivered:

- added a local-only Claude official-export structural projection alongside the existing ChatGPT export adapter;
- import registry and user-selected-file detection can evaluate registered export adapters in one bounded structural pass and fail closed on ambiguous/unknown formats;
- explicitly fixed single-adapter callers retain the legacy low-cost path instead of paying multi-adapter detection cost;
- non-ChatGPT imported identity is platform-namespaced while historical ChatGPT `sourceKey` / `dedupeKey` behavior remains compatible;
- only Claude `sender: human` text may become imported user Input; assistant text is excluded;
- alternate/non-current Claude branches remain review-only rather than silently entering the main reading path;
- Claude records reuse the existing Source → Working Input → Reader/Thought pipeline; no new durable fact store or IndexedDB schema was introduced;
- History Completion UI resolves and labels the selected adapter instead of assuming ChatGPT;
- Claude `chatUrl` remains empty until a real export and permalink contract are verified rather than guessing a remote URL;
- fixed Round 5A regression coverage verifies human-only projection, cross-platform identity isolation, existing pipeline persistence, unknown-format refusal and adapter-neutral UI;
- current release, unit, adapter/privacy and browser certification gates execute successfully with the Round 5A code path.

Explicit limitations:

- `realExportVerified` remains `false` for the Claude adapter until an actual user-exported Claude file is tested against the contract;
- PAIA does not claim live `claude.ai` capture support;
- the Manifest still does not add Claude page/network permissions for capture;
- Round 5A does not implement sync, Web/Desktop/mobile distribution, MCP or broad Passport access;
- this architecture validation is not evidence that a second provider is already a retention or market-value driver.

Engineering exit criterion: **met at synthetic-contract level**.

Real-source exit criterion: **not met** until a real Claude export is verified without weakening Source identity, privacy or deletion semantics.

Product exit criterion: **not met**.

### Broader Round 5 work remains gated

Potential work only after the relevant product gate is deliberately opened:

- verify Round 5A against a real Claude export and decide whether live capture has enough value to justify a separate trust decision;
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
