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
- A product-owner override may change implementation order, but it is not evidence that a product gate was satisfied.

---

## Round 1 — Product & Architecture Consolidation

Status: **completed 2026-09-12**

Delivered:

- `PRODUCT.md`, `ARCHITECTURE.md`, and this `ROADMAP.md` became current truth sources.
- Agent/developer guidance now treats historical version specs as evidence, not current direction.
- Durable schema / Thought ontology expansion became frozen by default.
- Current truth-source docs were added to release packaging/guards.

Exit criterion: **met**.

---

## Round 2 — Reader & Unified Search Foundation

Status: **source implementation completed 2026-09-12; executable full regression still pending an available development runtime**

Delivered:

- Added shared lexical `core/search-service.js` for Input, Thought and Context retrieval primitives.
- Preserved current exact-title → partial-title → body ranking compatibility.
- Shared Chinese 2/3-character query terms, lexical relevance and Unicode-safe excerpts.
- Improved Input search result → Reader target positioning/highlighting.
- Kept Thought's existing focus/navigation path instead of duplicating it.
- Added Round 2 targeted tests.

Engineering exit criterion: **met at source level**.

Product exit criterion: **still depends on Round 3 real-use evidence**.

---

## Round 3 — Local Product Validation

Status: **instrumentation implemented 2026-09-12; real-use evidence accumulation still pending explicit local opt-in; full regression execution pending**

Delivered:

- Local-only aggregate Product Signals, off by default.
- Fixed event taxonomy / enum dimensions; no query text, archive text, titles, Topic names, Profile names or object IDs.
- 90-day aggregate date buckets, outside PAIA Backup.
- Signals for Input retrieval/reuse, Thought repeat reading/AI view maintenance and Context build/share behavior.
- Reused existing Topic reading activity instead of creating per-object browsing history.
- Added a low-frequency local tools surface and Round 3 tests.

Interpretation remains conservative: counters describe observable behavior, not satisfaction or user intent.

Engineering exit criterion: **met at source level**.

Product exit criterion: **not met**. Real repeat-use evidence has not yet accumulated.

---

## Round 4 — Context Package & Minimum Passport

Status: **implemented 2026-09-12 by explicit product-owner override; product validation still pending**

Delivered:

- Stable ephemeral Context Package metadata contract.
- Minimum metadata-only Passport Grant: consumer, purpose, `resourceScope=profile`, Profile, `context_export`, `once | 7d | 30d`, expiry/revocation/consumption/use metadata.
- Metadata-only access audit, bounded and clearable.
- Explicit preview → Grant binding.
- Passport/audit metadata deliberately excluded from PAIA Backup.
- Existing manual AI Context copy/export remained compatible.
- Low-frequency UI for Grant management and protected Package export.
- Round 4 model/security tests.

The initial Round 4 implementation temporarily enforced protected export through the Product Signals post-command observer. It was deliberately treated as tactical and is superseded by Round 4.5 below.

Product exit criterion: **not met**. Minimum Passport is sufficient for validation; broader agent/API work remains unjustified without real repeated Context reuse.

---

## Round 4.5 — Runtime Hardening & Context/Passport Architecture Cleanup

Status: **source implementation completed 2026-09-12; full executable regression/package/Chrome validation pending an available development runtime**

Goal: convert Round 4's tactical implementation into a durable trust boundary without adding new product scope.

Delivered:

- Added `core/context-package-service.js` as the trusted Context Package lifecycle/release service.
- `PAIA_MEMORY_BUILD` and `PAIA_MEMORY_SHARE` now run through `ContextPackageService` on the service-worker main path.
- `ContextPackageService` owns Package creation, binding and protected release; `PassportService` owns Grant resolution/authorization/consumption/audit.
- Protected export now validates an already-bound active Grant **before** calling `MemoryService.share()`. Invalid/unbound/mismatched/revoked/expired/consumed Grants therefore do not trigger protected Context reconstruction.
- A second authorization/consumption check still occurs after reconstruction through `PassportService.consume`; if state changed during the operation, the command fails and no result is returned to the UI.
- Product Signals has been reduced back to observation-only aggregate metrics. It no longer imports Passport/Context Package, stores Package state, binds Grants, mutates share payloads or decides release.
- Split runtime command responsibilities:
  - `PAIA_PRODUCT_*` — aggregate metrics only;
  - `PAIA_PASSPORT_*` — Grant status/create/revoke/audit maintenance;
  - `PAIA_CONTEXT_*` — Package binding/lifecycle commands;
  - `PAIA_MEMORY_*` — Context content/build/share operations.
- Passport/Context local-tool commands no longer wake Smart Filter/Library maintenance or emit ordinary archive-change broadcasts.
- Revocation/status/audit clearing remain available without capture consent so users can always reduce/inspect permission state; creating a Grant and binding a Package require consent.
- Updated the local tools UI to use explicit Passport/Context APIs instead of multiplexing Passport through `PAIA_PRODUCT_SETTINGS`.
- Replaced the old Product-Signals security test with `context-passport-round45.test.mjs` and added `architecture-round45.test.mjs` to lock the ownership boundary.
- Updated `ARCHITECTURE.md` so the trusted Context path is current architecture.

Runtime/data impact:

- No IndexedDB version or object-store change.
- No Manifest permission change.
- No capture-adapter change.
- No new Provider/network integration.
- No persistent Context body history.
- No autonomous background/agent access.

Validation status:

- Source-level tests are present and automatically discoverable by the existing Node test runner.
- The connected development device is unavailable, and this session still cannot claim green `npm test`, package audit, Chrome E2E or live smoke results.
- Round 4.5 is therefore **source-complete, not release-certified**.

Engineering exit criterion: **met at source level**. Authorization is now a trusted main-path concern and analytics is structurally incapable of authorizing or releasing Context.

---

## Round 4.6 — Reader & Search Productization

Status: **recommended next implementation round, not started**

Goal: turn the shared Search foundation into a visibly better reread/reuse product experience.

Candidate work:

- Universal Search presentation across Input / Thought / AI-organized projections without creating another search truth layer.
- Better Search → Read → Reuse path, including explicit selection into Context preparation rather than automatic external sharing.
- Stronger old-material/time-oriented reading surfaces such as “以前的我” / longitudinal expression views grounded in original material.
- Reduce ordinary Reader UI friction and measure retrieval/reuse with existing local Product Signals.

Constraint: do not introduce embeddings/vector infrastructure until real lexical retrieval failures justify it.

---

## Round 4.7 — Revisit / Retention Surface

Status: **planned concept, not started**

Goal: give users a reason to return without relying on push notifications or more AI generation.

Candidate work:

- surface meaningful newly accumulated Inputs;
- show Topics with materially new supporting expressions;
- resurface older relevant material based on local facts/history;
- keep generated interpretation clearly separate from original user wording.

This round should be informed by Round 3 signals rather than implemented mechanically.

---

## Round 5 — Portability, Second Adapter & Sync Readiness

Status: **gated**

Prerequisites:

- core reread/retrieval loop has real-use evidence;
- Context/Passport direction is justified by use if Round 5 depends on it;
- Round 2–4.5 runtime tests can execute in a real development environment;
- schema ownership is stable enough to reason about conflicts.

Potential work after the gate is deliberately opened:

- Add a second capture/import adapter to test provider-neutral Source/Input boundaries.
- Specify encrypted sync semantics, device identity, merge rules, conflict UI and tombstone/deletion propagation before implementing general sync.
- Evaluate Web/Desktop only for tasks the extension cannot serve well.

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

- More Thought Library ontology merely because the schema can support it.
- Knowledge graph as a product goal.
- Provider proliferation.
- Automatic background AI organization.
- Cloud sync before conflict semantics and product value are proven.
- Native apps that only duplicate the extension UI.
- Broad Passport/agent integration before repeated Context reuse is observed.
