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
- Multi-device work must follow `SYNC_CONTRACT.md`; a cloud backend may implement the contract but may not redefine merge semantics.

---

## Round 1 — Product & Architecture Consolidation

Status: **completed 2026-09-12**

Delivered current product/architecture/roadmap truth sources, documentation authority, release guards and the default durable-schema freeze.

Engineering exit criterion: **met**.

---

## Round 2 — Reader & Unified Search Foundation

Status: **implementation completed 2026-09-12; executable engineering regression later certified by Round 4.8**

Delivered shared lexical Search Service primitives across Input, Thought and Context, ranking compatibility, CJK query terms, Unicode-safe excerpts and exact Input result → Reader positioning.

Engineering exit criterion: **met**.

Product exit criterion: **not met**. Reader/Search advantage still depends on real-use evidence.

---

## Round 3 — Local Product Validation

Status: **instrumentation implemented and executable regression certified 2026-09-12; real-use evidence accumulation still pending explicit local opt-in**

Delivered local-only aggregate Product Signals, fixed privacy-preserving event taxonomy, 90-day aggregate retention and loop metrics for Input/Thought/Universal Search/Revisit/Context behavior.

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

Delivered trusted `ContextPackageService` main-path authorization, Grant validation before protected Context reconstruction, Product Signals as observation-only metrics, and explicit Product/Passport/Context/Memory command ownership.

Engineering exit criterion: **met**.

---

## Round 4.6 — Reader & Search Productization

Status: **implementation completed 2026-09-12; current-browser engineering paths later certified by Round 4.8; product validation pending**

Delivered bounded Universal Search over existing Input/Thought/AI-organized projection reads, grouped results, deeper-result navigation, “以前的我” chronology and explicit Search → AI Context preparation without automatic build/share.

Engineering exit criterion: **met**.

Product exit criterion: **not met**.

---

## Round 4.7 — Revisit / Retention Surface

Status: **implementation completed 2026-09-12; current-browser engineering paths later certified by Round 4.8; product validation pending**

Delivered on-demand Revisit over existing local facts, explicit first-run baseline, newly collected Input resurfacing, Thought topics with new material, explainable older-material resurfacing, a lightweight device-local Reader cursor and privacy-safe follow-through metrics.

Engineering exit criterion: **met**.

Product exit criterion: **not met**. Revisit still needs real voluntary return-use evidence.

---

## Round 4.8 — Release Certification & Real-use Observation

Status: **engineering certification completed 2026-09-12; real-use observation remains open**

Completed:

- current Node regression suite executes in CI;
- current release packaging and release/package guards execute successfully;
- targeted Chrome journeys cover Universal Search, Revisit, Search → Reader, Search → Context, Context Package and Passport paths;
- regressions found by executable validation were repaired;
- current certification provides a repeatable merge gate for present daily-use paths.

Still required for product evidence:

- explicitly enable local Product Signals on a real daily-use profile;
- accumulate repeat-use evidence over time;
- determine whether Reader/Search/Revisit produce voluntary reopening, rereading, copying or Context reuse.

Engineering exit criterion: **met**.

Product exit criterion: **not met**.

---

# Round 5 — Portability & Sync Readiness

Status: **gated overall; Round 5A and Round 5B were opened by explicit product-owner override**

The override changes implementation order only. It does **not** mean the broader Round 5 product prerequisites have been satisfied, and it does not open live multi-provider capture, cloud sync, Web/Desktop/mobile expansion or broad autonomous-agent access.

Prerequisites for broader Round 5 product work remain:

- core reread/retrieval/return loop has real-use evidence;
- Context/Passport direction is justified by repeated use if later work depends on it;
- current runtime tests remain executable and green;
- schema ownership and conflict semantics are stable enough to preserve user work.

## Round 5A — Second Import Adapter Validation

Status: **engineering implementation and synthetic contract certification completed 2026-09-12; real Claude export verification still pending**

Delivered:

- local-only Claude official-export structural projection alongside ChatGPT export import;
- bounded multi-adapter detection that fails closed on unknown/ambiguous formats;
- legacy low-cost fixed-adapter path remains available;
- non-ChatGPT Source identity is platform-namespaced while historical ChatGPT identity semantics remain compatible;
- only Claude human-authored text may become imported user Input;
- alternate/non-current Claude branches remain review-only;
- Claude records reuse existing Source → Working Input → Reader/Thought semantics;
- History Completion UI is adapter-neutral;
- no Claude permalink is guessed before real-source verification;
- no new durable fact store or IndexedDB schema.

Explicit limitations:

- Claude `realExportVerified=false` until an actual user-exported Claude file is tested;
- no live `claude.ai` capture;
- no Claude capture/network permission added;
- no claim that a second provider is already a retention or market-value driver.

Engineering exit criterion: **met at synthetic-contract level**.

Real-source exit criterion: **not met**.

Product exit criterion: **not met**.

## Round 5B — Sync Contract & Readiness

Status: **protocol/merge-contract implementation completed 2026-09-12; transport and real multi-device sync not implemented**

Purpose: define how PAIA is allowed to synchronize before choosing a cloud/backend implementation.

Delivered:

- `SYNC_CONTRACT.md` as the active sync-specific contract;
- pure `core/sync-contract.js` merge planner with no network/storage/backend dependency;
- explicit sync scope separating canonical Source/user work from rebuildable/device-local state;
- metadata-only sync envelopes that reject raw text/title/note/query/Context fields;
- opaque per-device identity/sequence semantics for replay/idempotence only, not conflict resolution;
- Source merge semantics: immutable original payload, enrichment-only fact merge, immutable-body mismatch conflict;
- body-free permanent Source tombstones that dominate stale remote copies and cannot resurrect deleted Source;
- human-work merge semantics: only ancestry-proven fast-forward is automatic; concurrent or unproven divergence is an explicit user conflict;
- operationId collision protection: only identical envelopes may dedupe as the same operation;
- explicit rejection of latest-write-wins, server-arrival-wins, device-sequence-wins and silent AI conflict resolution;
- release packaging requires the active sync contract;
- dedicated contract regression tests.

Explicit exclusions:

- no cloud account/login;
- no remote storage/backend;
- no network or background sync;
- no encryption/key-management implementation yet;
- no device-registration UI;
- no conflict-resolution UI;
- no new IndexedDB object stores;
- no syncable Passport Grant/Context Package history;
- no live multi-device behavior.

Engineering exit criterion: **met at protocol-contract level once current Certification is green**.

Transport exit criterion: **not met**.

Product exit criterion: **not met**.

## Broader Round 5 work remains gated

The next legitimate steps are not automatically “build cloud sync”. They are, in order of evidence:

1. verify Round 5A against a real Claude export;
2. continue Round 4.8 real-use observation;
3. only if multi-device value is deliberately prioritized, design the encryption/key-management and remote-object layer that implements `SYNC_CONTRACT.md`;
4. before any public multi-device release, build explicit conflict-resolution UI and test offline divergence/tombstone/retry scenarios from the contract.

Constraints:

- Do not sync by copying the entire local database wholesale.
- Do not silently resolve conflicting human edits with latest-write-wins.
- Sync must enrich source facts while preserving user work and deletion fences.
- Device sequence and wall-clock time are not merge authority.
- Derived caches/projections should be rebuilt locally unless a later explicit design changes their scope.
- Provider credentials, Product Signals, Revisit cursor and Passport Grants remain device-local by default.
- Early Passport implementation is not permission for broad autonomous agent access.

---

## Later, only after the gates above

Potential later directions:

- encrypted multi-device sync implementing the approved contract;
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
- cloud sync before product value, encryption/key management and conflict UI justify it;
- native apps that only duplicate the extension UI;
- broad Passport/agent integration before repeated Context reuse is observed;
- embeddings/vector storage before measured lexical-search failures justify them;
- push notifications, streaks or opaque engagement recommendations merely to increase return frequency.
