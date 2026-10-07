# Master Development Plan — PAIA Consumer Product v1

## Browser-Native Sync integration — 2026-10-07

[BROWSER_NATIVE_SYNC_ADOPTION.md](BROWSER_NATIVE_SYNC_ADOPTION.md), BNS-1.0, records the fixed owner direction; [CONTRACT](BROWSER_NATIVE_SYNC_CONTRACT.md) owns the one Core/three adapters, canonical scope, provider trust, recovery and account/deletion safety; [UX](BROWSER_NATIVE_SYNC_UX.md) limits the Settings integration; [PLAN](BROWSER_NATIVE_SYNC_PLAN.md) contains the complete source-grounded delivery and acceptance detail; [REFERENCES](BROWSER_NATIVE_SYNC_REFERENCES.md) records current official capability/price limits and exact private design artifacts.

This is a scoped addition to Consumer Product v1, not a replacement of the existing Topic/Context/Settings/Prompt plans. STATUS alone chooses the actual writer. The Sync adoption did not interrupt or certify Topic01; its later scoped closure and current next task are recorded only in STATUS. The first new Sync implementation is CPV1-SYNC-01, queued for a separately authorized runtime task. The fresh main read is `948ea06a57cd932c187407faf7140d9fb6714eff` (0.14.0 metadata) and already includes local CTX4-01; older planned/candidate statements below describe their prior adoption scope, not the current code.

| Slice | Required outcome | Dependency |
|---|---|---|
| CPV1-SYNC-01 | Canonical codec/outbox, gap-aware replay, merge, bounded segments/checkpoints, tombstones, safe compaction/crash recovery and fresh local virtual-device exact restore | Fresh main and actual domain owners; no network |
| CPV1-SYNC-02 | Chrome/Drive appDataFolder A -> genuinely fresh B restore with A unavailable | 01; qualified minimal OAuth/app identity/subject/contained transport |
| CPV1-SYNC-03 | Chrome production lifecycle, account change, quota/failure, scale, migration and actual uninstall/reinstall hardening | 02 |
| CPV1-SYNC-04 | Edge/OneDrive App Folder using the same Core, with qualified delegated/PKCE/token lifecycle | 01/03; actual Edge/Graph qualification |
| CPV1-SYNC-05 | Safari containing-app/native CloudKit private transport, stable app identity and native lifecycle proof | 01/03; actual Apple entitlements/container/signing/device qualification |
| CPV1-SYNC-06 | Same canonical conformance, security/deletion/migration/performance and production UX/accessibility evidence across qualified providers | Applicable 02-05 evidence |

All are PLANNED, not six simultaneous queues. Detailed scope, negative tests, parameter experiment, gate and exit requirements are specified once in the Sync plan. The next Sync slice is not an OAuth page, PAIA account, backend deployment or three independent business sync engines.

Settings receives one Sync destination first in Data & recovery when genuinely usable: 21 primary rows/six Data rows plus the existing secondary reset. Its five original Data destinations remain independently implementable. SET2-02 consumes the Sync-owned status/route interface; SET2-05 includes the scoped integration/visual checks. No second permission store, provider console, account group, manual sync-parameter configuration, user backup generation or generic purge is added.

B-03 is resolved only for optional personal-cloud storage with explicit provider trust. Source/Working/human intent, ancestry, monotonic tombstones, secret separation and no silent conflict overwrite remain; old account pairing/recovery-secret/backend prerequisites are superseded only for BNS normal recovery. Context desired Card/Topic ranges travel without live external grants/local acknowledgements. Exact migration/restore and actual provider qualification are future acceptance, not claims supplied by this design integration. No runtime, schema, permissions, cloud registration, real authorization/upload, migration, paid service or release changes here.

## Settings Consumer v2 integration — 2026-10-07

[SETTINGS_CONSUMER_V2_ADOPTION.md](SETTINGS_CONSUMER_V2_ADOPTION.md), SETTINGS-CV2-1.0, freezes the owner-directed final Settings design. [SETTINGS_CONSUMER_V2_PLAN.md](SETTINGS_CONSUMER_V2_PLAN.md) owns the executable gap/owner/migration/test plan; [REFERENCES](SETTINGS_CONSUMER_V2_REFERENCES.md) identifies the corrected private visuals. This is a scoped replacement of old Settings presentation, not a new global roadmap or implementation authorization.

Final Settings integration read is main `288e17fb7adaf05b63a4af72458c1d6787488e0d`, manifest/package 0.13.0. Intervening PR177 already integrated Topic-01; its current implementation receipt remains EXACT_MAIN_FULL_CERTIFICATION_PENDING. STATUS therefore keeps that phase for verification/canonical closure, not a repeat foundation implementation. Earlier adoption-only PLANNED descriptions below retain their historical scope. Preserve the new identity/intent/strict restore validators and their recorded evidence; no runtime is reverted or certified by this Settings documentation task.

STATUS owns the current phase and records the scoped Personal Topic foundation closure. Integrate the local Settings outcomes below into this Consumer Product sequence, without waiting for the entire Thought UI or paid AI service. SET2-03 consumes actual Context/Prompt interfaces when ready; it must not reimplement their products or restart historical writers. One writer owns shared runtime files. STATUS selects each actual batch; the rows below are planned dependencies, not parallel next tasks.

| Slice | Outcome | Dependencies / acceptance boundary |
|---|---|---|
| CPV1-SET2-01 | Six-group shell/navigation and real Input Archive, reading and privacy preferences | Existing AppShell/RouteSession, capture/filter/preferences/r6 owners; exact final visuals. No full Thought/Context/service dependency. |
| CPV1-SET2-02 | Five existing Data destinations, existing import/restore and typed removed-content recovery; scoped sixth Sync destination when available | 01 composition plus existing import/backup/Source/Thought recovery owners; ambiguous B-02 effects remain gated. Sync row consumes the separately qualified BNS owner, not another cloud implementation. |
| CPV1-SET2-03 | Single Context status/route, Prompt-owned position reset and real suggestion preference | 01; genuine CTX4 state/route/revocation adapter and existing CPV1-12.3A-1 owner. Subsets may integrate independently but do not close the full stage. |
| CPV1-SET2-04 | Truthful About/version/update and four verified destinations | 01; actual update lifecycle and confirmed legal/help/feedback content. Unknown is not latest/available. |
| CPV1-SET2-05 | Migration, responsive/accessibility and source/release visual convergence | Applicable 01-04 outcomes, production tests and exact reference evidence, including available scoped BNS integration; prototype PASS is not production acceptance. |

All five are PLANNED. Detailed goal/scope/owner/exclusions/compatibility/tests/visual/exit/blocker requirements are specified once in the Settings plan, with the narrow BNS amendment in its adoption. Keep existing preference enums and saved 21px/width/time values; remove only conflicting Settings controls, not data/history/revocation guards. No schema migration is required merely for relabeling. Position reset extends PromptSurfaceCommands, not Settings storage; Stage 3A is not implemented in this workstream. No false control, duplicate permission owner, export/backup-generation revival or general purge is authorized.

SET2-01/02/04 can form a coherent local batch after the currently selected phase closes. Unavailable dependencies block only their affected interfaces and final closure; record honest unavailable states instead of manufacturing controls. CTX4, TOPIC and Prompt phase identities and their current source/service constraints below remain unchanged. Do not convert this plan into an additional parallel execution queue.

Pre-adoption MASTER is preserved byte-for-byte as [MASTER_PLAN_PRE_SETTINGS_V2_2026-10-07.md](MASTER_PLAN_PRE_SETTINGS_V2_2026-10-07.md), original blob `92dac19a1b60dcd83f02bff124387e18a8bc4ec2`, unchanged at the final integration read; the matching STATUS snapshot retains its original blob. No frozen D6/D7 artifact or historical acceptance result is rewritten.

## Current routing — 2026-10-07 Thought final visual adoption

[STATUS.md](STATUS.md) is the sole execution queue and next-task authority. [TOPIC_ARCHITECTURE.md](TOPIC_ARCHITECTURE.md) freezes the owner-approved Personal Topic product semantics. [THOUGHT_LIBRARY_PT1_VISUAL_AUTHORITY.md](THOUGHT_LIBRARY_PT1_VISUAL_AUTHORITY.md), TL-PT1-UI-1.0, adopts the reviewed final Thought presentation; [its reference manifest](THOUGHT_LIBRARY_PT1_VISUAL_REFERENCES.md) records private assets and evidence limitations. [TOPIC_ARCHITECTURE_PLAN.md](TOPIC_ARCHITECTURE_PLAN.md) owns the gap register, ordered implementation slices, migration work and acceptance; [architecture adoption](TOPIC_ARCHITECTURE_ADOPTION.md) and visual authority V8 list scoped supersession. This is documentation, not implementation or new service/paid/deployment authority.

The current order starts with the identity and human-intent foundation designated in STATUS. Do not start independent competing Topic, Original-organizer, AI-library, taxonomy-directory or graph workstreams. Reuse current Topic/Section/Placement/body/provenance/CAS assets. The final UI consumes those same identities: Root is Topic name plus stable named Section overview; reading is continuous Section/Entry prose; AI reading headings never automatically become durable Sections. Do not reopen product design during implementation.

## Personal Topic delivery outcomes

| Slice | Outcome | Dependency |
|---|---|---|
| CPV1-TOPIC-01 | Identity + durable human field/edge/keep-separate protection foundation and local contract tests; preserve Section/default identity and placement authority | Fresh main; existing domain services; conservative compatibility mapping |
| CPV1-TOPIC-02 | Identity retrieval across active/dormant/renamed/merged and removed fences; hidden candidates/unassigned | 01 |
| CPV1-TOPIC-03 | Evidence-based identity-first formation, bounded incremental Section/multi-placement and trusted commit | 01/02; live model/service activation remains separately gated |
| CPV1-TOPIC-04 | Confirmed Section promotion and protected structural reconciliation | 01/03 |
| CPV1-TOPIC-05 | Final Thought Root/reader/Section/search/writing/AI-reading implementation and Context Personal Topic interface | Relevant 01-04; adopted visual authority; section 7 of the Topic plan |
| CPV1-TOPIC-06 | Migration, reliability, resource and real downstream/production visual acceptance closure | Applicable earlier evidence and separately authorized real dependencies |

All six were PLANNED in the earlier documentation integration; current STATUS and the actual merged TOPIC-01 receipt control implementation facts. Stage details are specified once in TOPIC_ARCHITECTURE_PLAN.md. No historical PASS closes them, and no stage number requires a separate PR/receipt cycle. End each coherent authorized batch with exact source and truthful evidence, not a new architecture discussion.

TOPIC-05's internal deliverables are **05.1 unified read model; 05.2 stable Root; 05.3 in-place Root search; 05.4 continuous Topic reader; 05.5 contextual Section operations/promotion entry; 05.6 Section-aware Add Thought; 05.7 AI reading over durable Sections; 05.8 responsive/accessibility/visual convergence**. Dependencies and acceptance live only in the Topic plan, not a parallel UI queue. Missing live processing blocks its affected path, not unrelated local work after its prerequisites. Visual adoption cannot bypass TOPIC-01 or claim production completion.

## Retained AI Context Cards v2 plan

[AI_CONTEXT_CARDS_V2_PLAN.md](AI_CONTEXT_CARDS_V2_PLAN.md) and [visual references](AI_CONTEXT_CARDS_V2_REFERENCES.md) retain the approved four-card design. Personal Topic identity is supplied by PT-1.0; Context owns independent Items and access state, not a second directory or copied Topic corpus.

| Phase | Retained outcome | Dependency adjustment |
|---|---|---|
| CPV1-CTX4-01 | Independent data + real four-card home + persistent My Information editing | Local implementation is in current main 948ea06; exact-main closure remains evidence-controlled in STATUS, not a repeat implementation task |
| CPV1-CTX4-02 | Three-card direct editing and local state/navigation | CTX4-01 |
| CPV1-CTX4-03 | Stable Personal Topic capsules and default-off access | CTX4-01/02 plus compatible Personal identity/intent contract |
| CPV1-CTX4-04 | Trusted typed Context/Topic query and complete read-only retrieval | CTX4-01/03 plus Topic dedupe/lifecycle/scope integration |
| CPV1-CTX4-05 | Authorized incremental extraction with human protection | CTX4-01/02; real processing service and permission |
| CPV1-CTX4-06 | One real AI client and pause/revoke loop | CTX4-04; verified client and safe transport |
| CPV1-CTX4-07 | Migration/retirement, 22-state visual convergence, real-use acceptance | Applicable CTX4-02-06 evidence |

The architecture adoption changes only affected Topic semantics/dependencies and the current next-task routing; final visual adoption details the same Thought plan. Neither redesigns or cancels Context. CTX4-05 and 06 retain their independent external prerequisites; lack of one does not justify parking unrelated local work or weakening the other's gates. Coordinate one writer at shared data boundaries.

## Preserved history and nonconflicting detailed plans

Immediately preceding this visual integration, the master plan is retained byte-for-byte as [MASTER_PLAN_PRE_THOUGHT_VISUAL_2026-10-07.md](MASTER_PLAN_PRE_THOUGHT_VISUAL_2026-10-07.md), prior blob `bb8d48d42023c4c3f175b70389501bc7c013a9ed`. The earlier [MASTER_PLAN_PRE_TOPIC_2026-10-07.md](MASTER_PLAN_PRE_TOPIC_2026-10-07.md), prior blob `ff4a21631c61f43fc8ccc2157c2996691a3a1942`, and its full detail in [MASTER_PLAN_PRE_CTX4_2026-10-07.md](MASTER_PLAN_PRE_CTX4_2026-10-07.md), prior blob `bf4b786bb0047fb1c13f56fb3dbaac8c70d72b1b`, remain unchanged.

These are retained outcome/compatibility/evidence references subject to current AUTHORITY and STATUS, not independent queues. Conflicting old Topic/AI organization/recursive hierarchy and taxonomy assumptions are superseded by PT-1.0; conflicting compact-list/preview/B2/Years/candidate UI is superseded by TL-PT1-UI-1.0. Conflicting old Context VS-06/CPV1-06/D4/D6/D7 outcomes remain superseded by CTX4. All other source, Archive, capture, Prompt Reuse, recovery and security outcomes remain unless a later explicit decision changes them. The BNS adoption supplies that scoped optional-sync supersession, without rewriting history. No planning adoption reclassifies historical failures or certifies new behavior.

## Current consumer scope and real service gates

Dedicated Profile management, Thought response relations, Material Tray, candidate approval, activity-retention settings, Product Signals and ordinary diagnostic pages remain retired. Preserve existing saved AI/candidate content and human/version/deletion/revocation protections. Hidden Topic candidates are internal formation state, not a revival of approval management.

Content/statistics/Context exports, backup generation and dedicated sharing remain cancelled. CPV1-03.3 and CPV1-06.5 stay cancelled; CPV1-05.3 excludes response relations. Existing-file restore/import and integrity/deletion fences remain. An internal migration recovery checkpoint is not a user backup product. BYO AI configuration and retired direct AI transport do not return, and stored credentials are not read or cleared. The separately adopted user-cloud Sync transport is not a revival of direct AI processing.

### Paid AI service — not implemented

The current baseline has no real paid service. Real payment callbacks, server identity/entitlement, quota, authenticated gateway, protected credentials, bounded authorized processing and revision-checked output must exist before activation. Market/payment regions, price/currency, quotas, provider/data region and cost ceilings are unresolved. Neither automatic Topic formation direction, final Thought visual adoption nor CTX4 approval grants hidden recurring billing, model calls or paid retries. Do not simulate membership/purchase success. BNS adds no PAIA account/content backend and grants no paid AI service activation.

### Optional Semantic Lab admission

PAIA organization, retrieval and Context reuse must stand without 18/144 taxonomy. Lab R&D proceeds under its own unchanged constraints/status, not as a PAIA blocker or default integration task. A future optional proposal must pass comparable no-taxonomy/18/144 downstream evaluation and explicit integration authorization. Classifier accuracy alone is insufficient. No experiment, new data access or Lab production integration is started here.

## Verification and migration discipline

Use [VERIFICATION.md](VERIFICATION.md), existing deferred gates and TECHNICAL_PLAN's migration receipt, with the BNS-specific entity/permission/recovery contract for Sync. Preserve Source/Input/Entry bodies and identities, all human decisions, negative membership, redirects, revisions, tombstones and authorization through bounded resumable changes. Never silently rewrite historical library organization to fit the new contract.

Use production functions for mechanical tests, independent held-out tasks for semantic quality, and actual clients/devices/approved visuals for their respective claims. Synthetic and documentation checks cannot close real-service, user-value, production-visual or installation gates. Missing prerequisites are recorded exactly; related behavior stays disabled without a second workflow or weakened acceptance.
