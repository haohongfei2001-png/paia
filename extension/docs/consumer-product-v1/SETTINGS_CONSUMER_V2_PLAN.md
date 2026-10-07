# Settings Consumer v2 — implementation plan

Date: 2026-10-07. Workstream: **CPV1-SET2**, inside PAIA Consumer Product v1.
Design: **SETTINGS-CV2-1.0 / ADOPTED / FROZEN**. Runtime implementation: **NOT_STARTED_BY_THIS_TASK**.

Read [ADOPTION](SETTINGS_CONSUMER_V2_ADOPTION.md) for settled product/visual decisions and [REFERENCES](SETTINGS_CONSUMER_V2_REFERENCES.md) for exact private artifacts. Do not redesign from this plan. [STATUS](STATUS.md) is the only execution queue; [EXECUTION_PROTOCOL](EXECUTION_PROTOCOL.md), [TECHNICAL_PLAN](TECHNICAL_PLAN.md) and [VERIFICATION](VERIFICATION.md) retain their controls.

## 1. Baseline, evidence and scope

Final integration read: main `288e17fb7adaf05b63a4af72458c1d6787488e0d`; tree `550aab987b33196ea05ed5fec06e93771670b35e`; manifest/package 0.13.0. Initial design/source audit used `29940a921e4797c463a5e7e8436bafe6125f9f1d` (0.12.1); it is retained as a historical read, not the final integration base. This is a source read, not an installed-version claim. Re-read main and affected interfaces at implementation start. Reconcile any newer implementation rather than recreating it.

The baseline includes Consumer Cleanup (PR173), Archive navigation preservation (PR175), approved CTX4 and PT-1 plans, existing Prompt Stage 1/2, and the separately approved Stage 3A contract. During this task PR177 integrated Topic-01 and advanced the product identity to 0.13.0. The subsequent TOPIC-01 receipt records MAIN_INTEGRATED / INDEPENDENT_REVIEW_CLEARED / EXACT_MAIN_FULL_CERTIFICATION_PENDING, not stage completion. The canonical queue remains TOPIC-01, now for verification/closure rather than reimplementation. The complete initial-to-final comparison leaves Settings/UI/Context/Prompt files unchanged; preserve the new identity, intent and strict restore code. `core/topic-identity-backup.js:validateTopicIdentityGraph` validates existing Topic metadata, name-token references, keep-separate endpoints and organization intents. Data/recovery must consume it through the current BackupService, including foreign-key conflicts, restore-epoch revalidation and current producer-minor compatibility. Do not recreate these already integrated foundations. New Context runtime/live service is not established. The retained Stage 3A candidate/history is not proof of main integration; do not merge PR164 or revive a historical writer as a side effect of Settings planning.

Only production Settings presentation, its safe route/state integration, necessary owner adapters and corresponding tests belong to eventual implementation. No new content store, detector/model, cloud sync, provider, permission expansion, payment, export, backup generation, global purge or different Topic architecture is in this workstream. This planning task implements none of it.

## 2. Source-grounded gap and owner register

Paths in this section are relative to `extension/`. The final target inventory is the 20 rows plus one secondary action in ADOPTION, not a second IA here.

| Gap | Baseline evidence and real owner | Required change / boundary |
|---|---|---|
| S01 Shell assembly | `ui/settings-preferences.js:setupSettingsShell`, `ui/ux-r1-state.js:SETTINGS_GROUPS`, `ui/archive.html#settings-panel`; `ui/app-shell.js:AppShellController`; `ui/reader-navigation.js` RouteSession | Replace horizontal groups/mobile select and automatic Advanced fallback with explicit six-group composition. Extend existing route/view-state owner with bounded Settings group/index/return/focus state; do not create a second router or persisted content model. |
| S02 Reading presentation | `settings-preferences.js:FONT_PX/WIDTH_PX, loadPreferences/savePreference/applyPreferences`; `ux-r1-state.js:normalizeUXPreferences`; `archive.js` time listeners | Reuse durable preference commands and existing enum values. Rename values, retain four sizes, remove time-emphasis UI/listener. Reader uses fixed quiet time presentation with accurate time format. Preserve current system-theme/locale behavior and saved overrides. |
| S03 Saving/filter | `archive.js` CONSENT/SET_ENABLED binding; `ui/smart-filter.js:SmartFilterUI.changeMode/settings/protectUserEdit/recent`; worker FILTER_MODE/FILTER_STATUS/FILTER_PROTECT/FILTER_KEEP | Two distinct switches under Input Archive. Do not lose edit-protection listeners when replacing radio/recover nodes. Add acknowledged switch rollback/read-error handling, not a new filter engine. Move filtered-content discovery to Archive; historical-processing UI is absent normally. |
| S04 Privacy mounting | `ui/r6-settings.js:installPrivacy/syncPrivacy/setPreviewMask/applyMask` currently mounts under `#memory-settings` | Give the existing hide-preview owner an explicit Privacy host before deleting old memory markup. Preserve read epochs, fail-closed mask and write rollback. No duplicate hide preference. |
| S05 Context | `archive.js:new MemoryPanel({contextDisabled:true})`; `ui/memory.js`; `core/memory/service.js`; `core/passport.js`; worker PAIA_MEMORY_STATUS/SETTINGS and PAIA_PASSPORT_* | Settings consumes only minimal availability/access-summary/route from Context. No permission writes or card data in Settings. Until replacement exists, display unavailable truth; never map an error to off/connected. Legacy deny/local-only/revoked constraints and a usable revocation route must remain. |
| S06 Prompt visibility/status | `background/prompt-surface.js:PromptSurfaceCommands`, `content/prompt-surface.js`, `ui/prompt-surface.*`; diagnostic entry currently popup-only | Static supported-site facts may be derived from actual installed capability. Live status requires a scoped read through the same Prompt owner, not forging a popup sender. No global enable switch. Prompt management stays on the Surface. |
| S07 Position reset | `PromptSurfaceCommands` key `promptSurfaceV1`; `validSurface` accepts exactly version/open/position; current HOST requires a live supported tab and content-frame identity | **New minimal owner method required.** Settings cannot invoke HOST directly. Add a narrow trusted extension-page reset at the Prompt owner, patch position only, retain open and all Prompt Family state. Coordinate cached live-host position and stale saves; see section 5. |
| S08 Suggestions | `PROMPT_REUSE_STAGE_3A.md`; current main manifest/worker do not establish that runtime owner | Integrate the real CPV1-12.3A-1 enable/revoke owner when available. Settings supplies its sole normal preference surface, not independent storage/detector/current-reply reads. Until then no actionable pretend switch; this does not block unrelated local Settings. |
| S09 Storage | `r6-settings.js:refreshStorage/storageEstimateText`, browser `navigator.storage.estimate()` | One meaningful Data storage detail destination, local fact in Privacy prose. Present correct decimal MB or correctly labeled units; missing usage is unknown, never zero. Do not invent a storage-clear service. |
| S10 Import | `ui/history-completion.js:initHistoryCompletion`, `archive.js:historyPanel` with `beforeOpen:leave(true)`; `background/import-handler.js:ImportHandler` | Reuse one official-file import flow from Settings and Archive overflow. Remove duplicated onboarding/history blocks from Settings without deleting onboarding. Retain consent, preview, dedupe, pause/reselect/resume, cancellation and pending-destination results. |
| S11 Restore | `ui/backup.js:BackupPanel`, `core/backup-service.js:BackupService`; PAIA_BACKUP_BEGIN_RESTORE/STAGE/PREVIEW/RESTORE/CANCEL and worker `withRecoveryFence` | Re-present existing-file restore without creating backups. Keep empty/merge/replace eligibility, staging, conflicts and atomic activation. Delete old CSS that takes over/hides all Settings navigation on inspection failure; keep failure local to its flow. |
| S12 Removed discovery | `ui/review.js:InputReview`, `ui/topic-workspace.js:TopicController`; worker EXCLUDE_LIBRARY, GET_LIBRARY_REMOVED_TOPICS/RESTORE_LIBRARY_TOPIC, GET_LIBRARY_REMOVED/RESTORE_LIBRARY_ENTRY, placement/path APIs | A typed composite read/presenter may aggregate existing pages with independent cursors. Every restore dispatches to its actual object owner with current identity/revision/scope. Do not introduce a universal restore mutation, body copies or synthetic relationships. Pending branches remain in import/Archive. |
| S13 Source/history | `archive.js` source route, `ui/original-surface.js:OriginalSurface`, `core/archive-original-query.js`; `purgeSource`, PAIA_ARCHIVE_SOURCE_PURGE_PREFLIGHT/PURGE_SOURCE; GET_REVISIONS/RESTORE_REVISION | Retain Source route and content-specific history. Remove all Settings version-history/prune nodes and their hard-bound listeners. No generic purge entry; preserve actual scoped purge and B-02 refusal. |
| S14 Conditional recovery | `ui/maintenance-recovery.js:beginMaintenanceRead/presentSettingsRecovery`; `ui/integrity.js:IntegrityPanel`; `core/integrity-checker.js`; REBUILD_LIBRARY_SEARCH | Reuse actual-fault state; normal DOM contains no exposed diagnostics. Maintain cancellation, truthful failure/success and repair scope. A transport timeout or incomplete indexing is not proof of corruption. |
| S15 About/update | manifest version; worker `paia-consumer-update:v1`, onUpdateAvailable/onInstalled | Render real version/update metadata and only a supported safe update action. Existing event status is not a verified latest-release query. Legal/help/feedback destinations require confirmed content/channel; no fake links or auto-attached archive data. |
| S16 Old sort/control glue | `ui/archive-order-settings.js:ArchiveOrderSettings`; `core/source-ordering.js:ArchiveOrderPreferenceService`; `ui/archive.js` direct getElementById listeners | Move Archive window-order control to Archive's contextual sorting with same paia/source state and honest fallback. Remove obsolete bindings in the same batch as their DOM; prevent null dereferences or multiple listeners. |

Safety dispatch remains in the worker and existing domain stores (`OrganizerStore` extends `LibraryDocumentsStore`). `core/feature-availability.js` still rejects cancelled export/backup-generation, old Context creation, external enabling and retired direct-service commands. Removing Settings UI is not permission to delete or bypass these guards.

## 3. Ordered delivery stages

All stages are **PLANNED**, not implemented. A coherent batch can include several outcomes; no one-row/one-PR requirement. Shared runtime files have one writer. Apply ordinary targeted/affected/light-integration cadence, escalating changed authorization, deletion, migration or storage invariants under EXECUTION_PROTOCOL. Source/release verification at closure is required, not another mock.

### CPV1-SET2-01 — Real Settings shell and local preferences

**Goal:** open all six groups through the real shell and complete saving/filter/reading/privacy preference changes with persistence and safe return.

Scope: `archive.html`, `settings-preferences.js/css`, `ux-r1-state.js`, `r6-settings.js`, AppShell/RouteSession integration and affected `archive.js`/SmartFilter bindings. Keep shared shell CSS changes narrowly scoped; move Archive window sorting to its existing contextual owner. Use explicit hosts instead of relocating unclassified DOM to Advanced.

Owners: AppShell/RouteSession for navigation; store UPDATE_PREFERENCES; capture CONSENT/SET_ENABLED; SmartFilterUI and filter store methods; r6 preview-mask owner. Small group/scroll/focus state is view state, not a new domain entity.

Not included: Context cards/permissions, Stage 3A implementation, new filter strengths, schema/body migration, cloud or data-management engines. Unconnected rows show truthful availability, not fake controls.

Compatibility: section 4 mappings; preserve consent and all stored choices; keep content history functional after deleting Settings history listeners. Removing privacy's old memory host cannot expose previously masked text. Apply cross-tab events without disrupting focused controls or dirty readers.

Tests: persistence/reopen/refresh, old enum fixtures, failed writes and stale reads, capture first-use and pause/resume, filter versus capture independence and manual keep/edit protection, preview-mask fail-closed, language/system-theme, keyboard/Back/Forward/focus, Reader IME/leave protection, no leftover Advanced/search/duplicate owner.

Visual evidence: real extension six groups, default/paused/first-use, reading four sizes, light/dark, 320 and representative 200%, save failure. Match final private references, recording actual fonts and saved preferences.

Exit: real local switches/selections survive refresh and rollback correctly; final group inventory and routes are reachable; obsolete nodes/listeners retired; old relevant safety tests replaced by equivalent current assertions rather than disabled.

Blockers: missing exact private visual bytes blocks visual acceptance only. No complete Thought UI, paid AI, external connector or Stage 3A prerequisite blocks this local stage.

### CPV1-SET2-02 — Data and recovery convergence

**Goal:** one usable Data group with five destinations, complete existing import/restore and typed removed-content recovery.

Scope: Settings presenters and existing history/backup/review/source/recovery controllers; narrow composite read adapter only when existing paged queries need coordination. Reuse store operations and isolated staging. Reposition failure views rather than introducing another library/recovery system.

Owners: initHistoryCompletion/ImportHandler; BackupPanel/BackupService; InputReview and actual Topic/Entry/Placement methods; r6 browser estimate; OriginalSurface/ArchiveOriginalQuery; maintenance-recovery/IntegrityPanel.

Not included: export/backup generation, retention/pruning UI, sync, generic data purge, settlement of B-02, Topic redesign or full Topic UI dependency.

Compatibility: cancelled/partial import retains completed work and permits same-file resume; merge conflicts do not silently overwrite; replacement remains separately confirmed and atomically activated; deletion fences and recovery epochs survive. Typed recovery restores only the affected object/edge, preserves other placements/body hashes and does not reopen access. Existing-file restore must never import enabled Stage 3A or old grants. Unknown legal recovery stays blocked, not coerced through another command.

Tests: consent and no active write before confirmation; duplicate imports, missing times/branches, interrupted/reselected files; restore corrupt/incomplete/unsupported files, empty/merge/replace, conflict before activation, cancellation/interruption, late changes and rollback; removed object types and pagination; purge/recapture/import anti-resurrection; unchanged Source/body/permissions; storage unknown/decimal-unit correctness; confirmed-fault repair and cancellation without data loss.

Visual evidence: real import/preview/result, storage details, empty/merge/replace restore and failure, complete removed list with typed actions, Source return, conditional warning/repair, narrow and dark.

Exit: five destinations work through real owners; no duplicate onboarding managers or data stores; recovery failures preserve current usable archive; no Settings versions/general-purge/diagnostics dashboard.

Blockers: genuinely ambiguous B-02 effects stay refused. This cannot prevent lawful import/read/recovery or require completion of PT-1 visual work. Broad source data access is not authorized for testing; use synthetic/sanitized fixtures.

### CPV1-SET2-03 — Context and Prompt owner integration

**Goal:** the single Context status/route, real Prompt-owned position reset and the genuine suggestion preference integrate without any duplicated authority.

Scope: Settings adapters; minimal Context read-summary/route contract; narrow Prompt status/reset handling; binding to the existing Stage 3A owner once that separately scoped implementation exists. Names for new adapter methods must be chosen/documented during engineering; this plan does not claim they already exist.

Owners: Context/Passport for restrictive state and revocation; PromptSurfaceCommands for surface state; CPV1-12.3A-1 owner for reply eligibility/authorization. See section 5 for the exact reset race and state rules.

Not included: four-card implementation, Topic permissions, external clients, membership, model calls, the detector/capsule itself, changing Stage 1/2 material or auto-merging a retained candidate. Settings must not proxy archive/Topic bodies to compute its status.

Compatibility: preserve legacy deny/local-only/revoked and session revocation. Remove the last old revoke entry only when the real Context destination provides an equally reachable revoke path, including unavailable-connection mode. Do not bridge through a permission-widening setting. Maintain Stage 3A off after upgrade/restore and independent capture pause.

Tests: Context disabled/known-off/valid connected/unknown/read-error/stale read; exact route return and no permission writes; trusted sender rejection; reset while card open/editing/dragging/multiple tabs with stale host save/restart/failure; pin/order/text/hide/open invariance; Stage 3A opt-in/cancel/disable during analysis or insertion, late results, reload/restore off, no durable assistant body/network/send, capture independence.

Visual evidence: real unavailable then actual off/on/connected only where genuinely implemented; explicit suggestion consent, reset/failure/focus, narrow/dark. Synthetic connection counts remain visibly labeled in design evidence, never production fixtures masquerading as live success.

Exit: local bridges verified plus real Stage 3A owner bound; one state owner per field; no fake successful route, reset or toggle. If only a subset is ready, record it as partial integration; the full stage is not complete.

Blockers: CTX4 route/status and reachable revocation adapter, plus real CPV1-12.3A-1 enable/revoke interface. Real external AI connection is required for a live connected-state claim, not for safe unavailable/off rendering. Complete Thought UI and external model service are not prerequisites for position reset or local suggestions.

### CPV1-SET2-04 — About and truthful availability

**Goal:** version/update information and four useful destinations, without placeholders or invented release/legal claims.

Scope: About presentation and verified existing distribution/status/help/legal/feedback routing. Read manifest version; expose the existing worker-owned update-event state via a bounded trusted read if needed. No updater rewrite or external request merely on opening Settings.

Owners: manifest and current Chrome update lifecycle; canonical verified product documents/contact channel; existing global navigation/leave guard. No new telemetry owner.

Not included: release publication, store upload, force reload, signing/distribution provisioning, drafting legal terms, automatic diagnostic attachment or paid-service setup.

Compatibility: absence of update evidence is unknown, not latest; available update must protect dirty work, allow defer and reconcile genuine installed version. Display actual release version, never branch/schema/commit/test details in the product. Legal links cannot point to a guessed address.

Tests: actual/unknown/available/installed/error update states, unsaved editor blocks unsafe reload, no unexpected network or permissions; destination verification; correct locale and focus; feedback sends no private archive text by default.

Visual evidence: real About normal and available-update states only when supported, long localized names, dark/narrow/200%.

Exit: four destination rows resolve to approved real resources and update information is truthful; no no-op rows. Unconfirmed legal/feedback destinations block that part and final release acceptance, not other local stages.

Blockers: authoritative published legal/help/feedback destinations and any missing legitimate distribution update action. Source status events alone cannot certify the consumer update path.

### CPV1-SET2-05 — Migration and production convergence closure

**Goal:** certify the implemented final Settings against real owner boundaries, old preferences, complete visual references and affected source/release journeys.

Scope: final integrated migration fixtures, accessibility/responsive behavior, whole-screen comparisons, affected tests and canonical receipts/status. Reconcile fresh main and one current implementation, not a parallel prototype embedded as production.

Owners: existing verification/route/domain owners and a single integration writer; no substitute mock algorithms. Tests exercise production modules/commands and actual extension pages.

Not included: resolving unrelated B gates, installing into the owner's daily profile, live model spending or release unless separately authorized. Prototype PASS cannot close any production assertion.

Compatibility: read-old/write-narrow, all section 4 preservation invariants, restore/cross-tab/worker-restart combinations and rejected retired commands. Do not delete history evidence or relax the old suite for a clean report.

Tests/evidence: section 6 matrix plus required unit/adapter/privacy/package and affected browser checks; final production accessibility and exact source/release visual comparison at 320/390/768/1024/1280/1440, light/dark, Chinese/English and true 200% text. Physical IME, screen reader, live ChatGPT/release-update evidence are separate labels where applicable, not inferred from DOM success.

Exit: SET2-01..04 applicable outcomes complete; every shipped destination/control has a real owner; no widening/resurrection; evidence and remaining external limitations explicit. Whole workstream COMPLETE is forbidden with an unimplemented suggestion owner, inaccessible revoke path or unverified mandatory destination. Independent local milestones may remain engineering-complete with dependent closure pending.

Blockers: only missing evidence/interfaces for their affected claims. A docs-only task cannot start this stage automatically.

## 4. Concrete migration and compatibility contract

Default approach is **presentation mapping plus narrow writes**, not a schema migration. Do not bump UX_PREF_VERSION, reset the preference object or invent a migration marker merely to rename labels. Stored values are owned by existing validators; old valid fields not shown in Settings remain compatible until separately justified retirement.

| Existing state | Final presentation / treatment |
|---|---|
| fontSize small/standard/large/xlarge | 小/标准/大/特大; exact 16/17/19/21 mapping preserved, including explicitly saved standard. |
| readingWidth narrow/standard/wide | 紧凑/标准/宽; exact 640/680/720 preserved. Do not replace with the shared unsaved 800px reference. |
| appearance system/light/dark | Same values; system remains a preference, not rewritten to today's resolved theme. |
| language system/zh-CN/en | Same actual enums. The design prototype's `zh` alias is not a production migration value. |
| timeDisplay date_and_time | 标准, with real date and minutes. |
| timeDisplay date_and_seconds | 详细; retain seconds where genuinely known. No fabricated precision/time. |
| legacy date_only | Present 标准, matching the current Reader's existing minute-visible compatibility; preserve original value until a justified normalized write, not reset on page open. |
| timeEmphasis subtle/standard | Remove UI/listener; effective Reader time style is consistently quiet and legible. Retain old field for compatibility/rollback; never apply old emphasis accidentally during late rerender. Source timestamps are untouched. |
| filter mode light/off | UI on/off respectively; new default remains light, manual off survives. Existing protected edits/keep/restores/negative intent remain. Unsupported/corrupt values are not silently interpreted as permission to change user intent. |
| settings consentVersion/enabled | Read existing status, no new capture boolean. First enable requires actual consent acknowledgement. Failed enable or pause returns to confirmed state; do not silently consent on error. |
| hideContentPreviews | Reuse existing flag and masking class; unreadable state keeps the last privacy-protective view. Never default a previously hidden preview to visible on failed refresh. |
| Archive order paia/source | Same preference, moved UI only. Preserve source-unavailable fallback and pending-safe-application behavior; no re-sorting protected active views to match a mock. |
| legacy localOnly / denials / revoked grants / session state | Preserve all restrictive effects, including unknown legacy state; do not turn off restrictions because old controls disappear. New Context owner consumes them without unioning access. Credentials are neither read nor cleared. |
| promptSurfaceV1 | Current single-site version/open/position state remains owned by PromptSurfaceCommands. Reset changes position only; no restore of a stale cached offset after successful reset. |
| Stage 3A absent/new/upgrade/restored | Off, with only a fresh explicit enable acknowledged by the real Prompt owner granting current eligible reply access. Restored permissions never activate reply reads. |
| Topic/Entry/Placement, body, revisions, tombstones, human intent | No Settings body migration. Discovery aggregation does not alter semantics. Deletion protection, negative membership and explicit current authorization outrank convenience. |

Take synthetic before/after snapshots and compare complete protected fields/body hashes, not just visible labels. Repeat mappings idempotently, interrupt at write acknowledgement and reconcile, test old backups and mixed old/new windows. If engineering reveals a genuine schema need, satisfy TECHNICAL_PLAN preservation/receipt requirements first; this document does not authorize an actual user-data migration.

## 5. Cross-module interface and availability rules

**Context:** reuse the existing route owner, passing only a return target. A minimal read summary needs availability, known access state, valid connection count when known and a resolvable route; these are conceptual fields, not asserted existing method names. No bodies, per-Topic matrix or duplicated permission writes. Loading/error/unavailable differ from confirmed off. A connected count does not override global pause. Revoke remains reachable even if new connections are unavailable; migrate it as Context-owned limited compatibility, not a resurrected Settings permission console.

**Thought/recovery:** consume existing typed identity, lifecycle, revision and recovery eligibility. Track pagination/partial coverage per source; an incomplete discovery is not an empty removed list. Restore relationship and whole-content operations keep their respective scope and revision checks. Newly available PT-1 interfaces replace compatibility adapters without changing this Settings IA; full Thought visual implementation is not a dependency.

**Prompt reset:** the current HOST entry rejects Settings senders, correctly. Extend PromptSurfaceCommands with a tightly allowlisted extension-page-only reset command, validating the actual sender and consent. Read current `promptSurfaceV1`, patch position to null, preserve open, and acknowledge only after storage succeeds. Notify/reconcile each supported live host's in-memory position. Ensure a delayed drag/save begun before reset cannot overwrite the reset; serialize or add the minimum Prompt-owned revision/generation fence, with a documented compatibility path through `validSurface`. Never add an independent Settings copy. Editing/IME remains owned by the prompt card; reset must not close it or dispose its draft. Unsupported/inactive tabs need no fabricated live acknowledgement; persisted reset is applied on the next eligible host initialization.

**Stage 3A:** bind to the existing feature workstream's real authorization owner, not `normalizeUXPreferences`. Enable only after explicit local-scope consent and durable acknowledgement; disable revokes eligibility before late results can appear. Zero assistant body persistence/network requests and fill-only behavior must be tested in the owning feature as well as the Settings bridge. A missing detector/client or unsupported site results in honest unavailable/no suggestion, never a toggle that only changes its own visual state. No automatic enabling on capture resume, Context connect, backup restore or update.

**About/websites:** currently supported site is ChatGPT; a permission pattern does not prove functional integration or a connected AI. Existing Chrome update events are useful state, not proof a current update was checked. Legal/support URLs/content and any browser-permission-management route must be verified at implementation; none is invented here. Missing destinations remain an explicit dependency, not permanently shipped no-op controls.

## 6. Test and evidence matrix

| Risk | Required production evidence |
|---|---|
| Preference ownership/durability | Actual storage read/write, refresh/reopen/worker restart, two windows, failed acknowledgement/stale read and narrow writes preserving unrelated fields. |
| Capture/filter | Consent, pause/resume, current visible history boundary, no Temporary Chat capture, filter on/off, manual keep/edit/exclusion protection and unchanged Source bodies. |
| Navigation/edit safety | Group/index/deep route, Back/Forward, scroll/focus return, modal cancellation, IME composition and dirty Reader/Prompt drafts retained. |
| Context | Real unavailable/off/count states, route return, no writes to permission state, retained legacy revoke/deny, no Archive fallback. |
| Prompt | Trusted sender validation, position reset with stale multi-tab writes, exact pin/text/order/hide/open preservation; Stage 3A off/on/revoke/restart/restore/late result and no send/upload/retention. |
| Import/restore | Actual official-format synthetic adapters; consent, preview, duplicates, protected work, pause/reselect/resume/cancel, invalid/incomplete backup, modes, conflict/revalidation/atomic rollback, anti-resurrection and grants off. |
| Recovery/source/history | All lawful removed object types and full pagination, unchanged unaffected bodies/edges, B-02 refusal, content history still reachable, no Settings history/general purge. |
| Faults/availability | Confirmed fault only, no diagnostic dashboard, cancellation/retry, no false repaired/latest/connected; truthful storage estimates. |
| Visual/accessibility | Six groups, all private reference scenarios, English/Chinese, dark/light, 320px, 200% actual text, keyboard and screen-reader labels, 44px coarse targets, focus not obscured, reduced motion. |
| Retired commands | Old export/backup generation/direct AI/permission-widening commands remain rejected without side effects; no legacy credential reads or resets. |

Baseline scripts are `npm test`, `npm run test:unit`, `npm run test:browser`, `npm run test:ui-refresh`, `npm run check`, and `npm run build:release` in extension/. Re-read actual `package.json` and test registrations before selecting runs; this planning task runs none of these production commands. Use targeted production-function tests in the inner loop, affected browser journeys and current integration gates for the coherent batch; apply full certification when the changed risk demands it. Build is not publication permission.

Update obsolete D7 Settings assertions to the new scoped product target while preserving equivalent or stronger behavioral/privacy tests. Keep historical files and their original failures/results. Do not drop entire test files, extend timeouts or force-click hidden obsolete UI merely for green status. Prototype layout/interaction checks remain separate records and cannot substitute for production-function, source/release, live-provider, actual-device or usability evidence.

## 7. Integration, receipts and sole queue

Preserve pre-adoption STATUS and MASTER by their original blobs as PRE_SETTINGS_V2 snapshots. Record actual implementation base/head, writer, phase outcomes, changed owner boundaries, source/release visual evidence and precise deferred obligations in STATUS/receipts when implementation is requested. There is no automatic runtime continuation from this documentation commit.

**Sole current next development task: CPV1-TOPIC-01 — complete exact-main full verification and canonical closure of the already integrated identity/human-intent foundation.** This follows the fresh implementation receipt and retains STATUS’s phase, without rebuilding merged code or claiming verification already passed. SET2-01 is the first planned Settings outcome, not another current next pointer.

After that selected foundation’s verified closure, integrate local SET2-01/02/04 in the existing Consumer Product sequence without waiting for full Thought UI. SET2-03 consumes Context route/revocation and existing Prompt feature interfaces when ready; do not open parallel competing writers. SET2-05 closes the affected integrated outcome. No-taxonomy Topic architecture, CTX4 phases, Prompt 12.3A phases, their real-service dependencies and all retained cancelled/deferred scope remain unchanged.
