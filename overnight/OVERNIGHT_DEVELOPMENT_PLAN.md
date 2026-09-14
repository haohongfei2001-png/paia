# PAIA Overnight Development Plan v1.0

Campaign: `paia-overnight-20260914-v1`  
Prepared: 2026-09-14  
Execution mode: independent ChatGPT runs, preferably Chat high reasoning; maximum eight scheduled execution opportunities.  
Product target: `ux-r2`. Control branch: `overnight/control-20260914`. Main is read-only.

## 1. Fixed objective and authority

Complete the inherited UX work before expanding the product. At the audited product HEAD `c8bcecd4c8a49a069e66225c199fc3d49c7b8b1b`, the official execution state names UX-R5 READY / NOT STARTED; R1–R4 have committed completion records. Actual CI #205 and the recovered product tree were inspected, but this planning session did not rerun the product or inspect every screenshot/receipt. Initial certification PR #28 is now a fresh way to verify the inherited product. `BASELINE_AUDIT.md` records precisely what was checked.

The long-term destination remains a complete Chrome product, App Store iPhone product, safe multi-device continuity and authorized ChatGPT Context integration. Eight execution opportunities do NOT promise a public 1.0, App Store approval, an operating backend or a published Plugin. Finishing trustworthy UX and leaving a tested partial foundation is a valid outcome.

Authority for product work remains, in order: `extension/AGENTS.md` UX overlay → Design Core v1.0 → UX/UI Development Specification v1.0 → current UX implementation status → PRODUCT / ARCHITECTURE / ROADMAP → applicable feature/security/migration contracts → actual source and executable evidence. The Design Core controls product constraints; the Spec controls accepted UX. This plan schedules work; it does not redesign them or lower their gates.

The user's 2026-09-14 instruction authorizes unattended continuation within THIS eight-opportunity campaign, on the specified non-main branches. It replaces the need to request permission separately between these already bounded slices, not the need to pass gates. ON-01/02 are sub-slices of the SAME official UX-R5; ON-03/04/05 are sub-slices of UX-R6. Do not mark an official UX round COMPLETE just because its first sub-slice passed.

After certified UX-R6 and the separate final UX regression, the user-authorized 1.0 direction permits only the bounded, non-deployed ON-07/08 foundation work below. This is an implementation-priority exception to broader roadmap freezes, NOT evidence that product-value gates passed, NOT authorization to expose Archive data, provision services, add secret storage fallbacks, or invent a remote authorization contract. A substantive unresolved contract conflict still stops affected work.

## 2. Non-negotiable exclusions

Never modify, push to, merge into, rebase onto, or deploy from `main` during this campaign. Never force push, amend published history, auto-merge any PR, retarget PR #28, or move its CI base. Never merge `main` or the control branch into `ux-r2`. The existing divergence is known, not permission to repair it automatically.

Never silently change product definition, the accepted UI design, Source/Input/Thought ownership, explicit-selection semantics, default-off external access, trusted-sender restrictions, human protections, tombstones, backup exclusions or encryption/merge protocols. No new canonical body store, destructive migration, database reset, password-derived encryption root, plaintext secret persistence, broader manifest permissions, new paid provider, hidden network request, automatic paid retry or secret committed to Git.

No real user database, normal browser profile, cookie, private export, production token or recovered account is a test fixture. Do not run `development/Update PAIA.command`, replace the user's loaded extension, or touch daily-use data. Use synthetic isolated environments. Do not deploy, purchase, register paid services, publish to stores, sign using somebody's credentials, or request permission bypasses while the user is absent.

No iOS cross-App listening assumption, keyboard keystroke archiving, ChatGPT global-message hook, automatically synchronized ChatGPT history API or App Store/Plugin approval claim. Current source does not establish any such capability.

## 3. Eight opportunities are a bounded worker loop

The scheduler should send the SAME prompt hourly, maximum eight deliveries. It does not select a functional round. State selects the first eligible incomplete slice. A failure, pending CI, repair or environmental block can consume a delivery without advancing a slice. No ninth delivery, catch-up task, automatic extension or counter reset.

At the first successfully admitted execution record UTC `campaign_started_at` and `stop_new_work_at = campaign_started_at + 8 hours`. The scheduler's eight-delivery cap is primary; the deadline and admitted counter are additional safety caps. At or beyond either cap, make only necessary control-state finalization and report a partial result. Do not start or publish new product work. An already-published, predeclared transition may be sealed as metadata recovery; do not introduce another product change.

Suggested operational budget, not a platform runtime guarantee: bootstrap and previous-check review first; choose one slice small enough to reserve validation and handoff time; around minute 40 stop starting new implementation; aim to checkpoint and release ownership by minute 55. Tool/runtime limits may stop a run earlier. Do not weaken gates, wait indefinitely or launch another feature to fill the hour. CI may remain running on GitHub after the ChatGPT invocation ends; record WAITING_CI and inspect it on a later delivery.

Every admitted execution does ONE of: preflight plus one bounded new slice; finish verification of existing work; repair previous work; or record a stop. Finishing pending verification can unlock at most one new slice if sufficient budget remains. A repair execution does NOT start a new functional slice after repairing it. It ends with recertification/checkpoint.

## 4. Recovery, ownership and exact HEAD protocol

### 4.1 Branch responsibilities

Product changes and official UX reports/status: `ux-r2` only. Control files and per-execution reports: `overnight/control-20260914`, `overnight/**` only. Read source from the actual pinned product commit, never from the inherited product copy on the control branch. The CI-only base stays at `ad386c07cff59b9b3472a5aa03626fe89514f8d1`.

State stores an explicit `product.expected_head`. This is the actual product commit SHA. Because state is on another branch, updating it does not change that product SHA; there is no self-referential end-HEAD problem. Report start/end HEAD always means the product branch unless explicitly labelled control metadata.

Each control commit must update the state and its monotonically increasing `control_checkpoint.sequence`, with `parent_head` equal to the previous control commit. The current control HEAD is obtained from Git, not embedded as its own SHA. Check its parent, campaign ID and commit trailers. Unexpected control changes are as serious as unexpected product changes.

### 4.2 Claim before mutation

Read control HEAD S and product HEAD H. Confirm H equals `product.expected_head`, except for the exact prepared publication recovery in 4.3. Confirm frozen CI base and PR base/head. Check budget/deadline/STOP status and whether an active execution already owns the campaign.

If another unexpired owner exists, do not write or alter its state; return SKIPPED_BUSY with observed HEADs. This is a scheduler opportunity, not a completed round. If a lease has expired, do NOT steal it just because time elapsed: record/report STOP_LOCK_EXPIRED and require a verified safe recovery; absence of a heartbeat is not proof another process cannot publish. Ownership should normally be released before waiting for CI.

To claim an idle campaign, create a control tree/commit with single parent S that increments `admitted_executions`, writes an active execution token and run stub, and sets lease expiry no more than 75 minutes from start and no later than the campaign deadline. Re-read control HEAD and advance the ref fast-forward only (`force=false`). Competing siblings cannot both become the accepted child. Verify the resulting ref and ownership before touching product files. A lost race consumes no admitted slot and permits no product write.

The token is a concurrency label, not an authentication secret. Every write must recheck current owner, current refs and deadline. Do not replace a concurrent writer's content. If only an unsafe non-atomic write mechanism is available, stop rather than imitating a lock with prose.

### 4.3 Prepare → publish → seal, including interruption

1. Build a bounded candidate tree and single-parent product commit C from expected H, without moving `ux-r2` yet. Review its exact diff and record allowed paths, candidate tree and validation status.
2. Atomically checkpoint on the CONTROL branch a `pending_publication` containing exact parent H, candidate C, tree, owner, run ID, intended paths and purpose. No branch update has yet happened.
3. Re-read ownership and `ux-r2`. Only if it is still H, use a non-forced fast-forward ref update to C. Do not call a merge action. Verify actual target now equals C.
4. Seal on the control branch: `product.expected_head=C`, add C to this execution's commits, set pending CI/validation details, clear `pending_publication` and record actual product end HEAD C. Release the lease at handoff.

If interrupted between these steps, the next admitted run can inspect ONLY this explicitly recorded transition: H means publication never happened; exact C with expected parent/tree/diff means the known publication happened and needs sealing/verification. Unknown third commit, changed candidate, other parent or mismatched scope is STOP_HEAD_DRIFT; never adopt it by updating expected_head. The two declared states are a recoverable prepared transaction, not permission to ignore HEAD mismatch.

Do not blindly repeat a failed write; read refs first. Unreferenced candidate objects are not branch progress. A GitHub API-only environment may publish a coherent small candidate for CI without local execution, but its status is IMPLEMENTED_PENDING_VALIDATION, never COMPLETE. If a coherent slice cannot be produced, preserve only a clearly identified non-deployed WIP artifact/owned WIP branch or minimal control handoff; do not expose dead buttons or claim a feature. Any WIP branch must be newly created under `overnight/wip/`, never merged automatically, and recorded with its exact SHA and failed/unrun checks.

### 4.4 Repair-before-progress decision order

First resolve ownership/HEAD/authority issues. Then inspect previous exact diff, required tests/build/static checks, current CI runs AND mandatory job results, receipts/artifacts and acceptance review. A report labelled COMPLETE cannot override contrary evidence.

- Failed implementation, regression, security assertion, incompatible migration, bad diff or failed CI: REPAIR_REQUIRED; fix only the affected preceding slice, add regression coverage and rerun all affected mandatory gates.
- CI queued/running: WAITING_CI; no new product commit merely to refresh state or trigger tests. Record/return through the separate control branch.
- CI has no matching run, inaccessible logs/required artifacts, missing runtime, permission approval or missing mandatory evidence: BLOCKED_VALIDATION/EXTERNAL; do not advance. An ordinary queued run is not yet an unverifiable gate, but failure to obtain evidence must never become PASS.
- Cancelled infrastructure job: identify cause; at most one justified same-source rerun per admitted execution using supported actions. No retry loops and no ignoring a reproducible failure.
- Existing reports contradict each other: preserve historical text, identify governing latest recovery evidence, and resolve with actual code/CI; stop if necessary intent remains ambiguous.

### 4.5 Mandatory stop reasons

STOP_AUTHORITY_CONFLICT; STOP_DESIGN_UNCLEAR; STOP_DESTRUCTIVE_CHANGE; STOP_DATA_MIGRATION_RISK; STOP_SECRET_OR_PERMISSION; STOP_HEAD_DRIFT; STOP_CONTROL_DRIFT; STOP_CI_BASE_DRIFT; STOP_LOCK_EXPIRED; BLOCKED_VALIDATION; BLOCKED_EXTERNAL; STOP_BUDGET.

Unapproved schema/crypto/trust decisions, potential loss of human work, real secrets in diff/logs, a required unsafe permission, unexpected third-party commits, or unavailable required acceptance evidence stop affected product writes. Do not automatically skip a blocked predecessor to reach a later optional round. A global stop remains stopped until explicit human resolution is recorded; remaining deliveries may report it but cannot invent a solution or restart the campaign. Never leak secret content in the stop report.

## 5. Validation and CI contract

### 5.1 Required command set V-UX

Recheck actual package/scripts at the pinned source. In `extension/`, every UX functional slice must obtain executable evidence for:

1. `npm run test:unit`
2. `npm run test:browser`
3. `node scripts/test.mjs "adapter contract"`
4. `node scripts/test.mjs "privacy/security"`
5. `npm run check`
6. `node scripts/check_development.mjs`
7. `npm test` — unsharded full current suite, valid fullSuite/auditPassed receipt and unchanged input digest.
8. `npm run build:release`

Plus the changed behavior's real extension journeys, G-01 through G-08, visual/a11y and applicable migration/Backup tests. Do not infer visual acceptance merely from the existence of screenshot files. Inspect required screenshots/matrices and retain review conclusions tied to source/artifacts. Synthetic mock-provider evidence is not live-provider certification.

There is no `npm run lint` in the audited package. Report `lint=NOT_CONFIGURED`, with required package/development static guards separately. Do not invent a lint PASS or install a lint stack solely for the report. If a later legitimate package adds a lint command, run it too.

Use existing Node 22 / Python 3.12 / pinned Playwright / real Chrome / Xvfb CI. Preserve 76 pre-migration browser files in their existing historical group. Its currently optional/skipped job is not one of the required current-release jobs; never move new required tests there or convert existing current failures to skipped.

### 5.2 Existing CI carrier

Draft PR #28: `ux-r2` → `overnight/ci-base-20260914`. Base is a frozen ancestor, so current main's divergent contents need not enter a synthetic merge tree. Verify exact checked-out merge tree or equivalent code/test/build inputs for each run. Never trust a green badge on another head, old attempt or different PR base.

The audited workflow's push trigger is main-only; pull_request is the route for this product branch. A control-branch state write has no PR and does not update the product PR. Do not change main's workflow or add a privileged write-capable workflow to solve scheduling. Preserve `contents: read` and existing mandatory jobs.

Mandatory current jobs: Unit 1/4–4/4, Adapter and privacy contracts, Current Browser Certification, Full Suite Certification, macOS Secure Store Certification, Current release build and guards, Certification gate. All must succeed. New R5/R6 browser tests enter both the actual current browser grouping and the explicit mandatory journey list, with artifact upload. New ON-07/08 modules require additive actual test jobs and aggregate-gate dependencies; no inert tests living outside CI.

Workflow additions may wire new journeys/artifacts/module tests only. No permission escalation, assertion weakening, fixture reduction, skip/continue-on-error, private profiles or secrets. A documented increase of job timeout up to 45 minutes is allowed only when measured additional test work requires it; it cannot hide a hang or relax UX performance acceptance. Record the reason and measured prior timings.

A successful workflow overall is insufficient if a required job was skipped or an expected receipt was absent. Read jobs/steps, relevant logs, full-suite receipt and artifacts. Persist bounded sanitized evidence in control run reports; source refs, artifact IDs, run attempt, checksums, counts and commands must be traceable. `work/` paths alone are not durable GitHub evidence. Artifact expiry requires rerun if essential evidence is no longer available.

The existing inputDigest excludes some inputs, including Markdown, package configuration outside its scanned folders, workflow and native-host files. Therefore use it AND exact diff/tree checks; digest equality alone cannot certify arbitrary metadata/build/native changes. Report-only official UX handoff commits must contain only reviewed report/status Markdown and preserve tested inputs; check their triggered CI before further progress. Do not create an endless sequence of target commits just to write each newer CI SHA: final certification observations belong on the control branch.

### 5.3 Completion levels

SUBSLICE_COMPLETE means that bounded slice's implementation and gates passed. UX-R5 becomes COMPLETE only after ON-02 also proves every R5 requirement; UX-R6 only after ON-05 proves every R6 requirement. ON-06 is the subsequent final full UX regression. The user-visible 1.0 remains NOT_RELEASED unless actual platform/service/distribution gates later prove otherwise.

## 6. Functional slices (maximum eight; not hour numbers)

### ON-01 — UX-R5 topic-local dual view and safe first generation

**Objective:** Deliver one topic's Original ↔ Organized reading cycle without global-view leakage, lost edits or unnecessary provider requests. Initial work includes mandatory inherited-R4 preflight, not a blind rebuild of R2–R4.

**Entry gate:** Exact product/checkpoint/CI base agreement; no active foreign owner; actual R4 source/CI/diff/acceptance evidence supports entry; official UX status is R5 or the same R5 sub-slice IN_PROGRESS. Missing inherited evidence is verified/repaired first and can consume this opportunity.

**Allowed scope:** Spec UI-13, R5 portion of UI-14, DELTA-06, MIG-09/10; topic display state, existing reading anchors, first-generation confirmation, existing runner/status binding, bounded transition. Principal paths: `extension/ui/ai-presentation.js`, `thoughts.js`, `memory-recomposition.js`, `library-updates.js`, existing topic-reading state and `core/organizer/ai-presentation.js`, `dual-view.js`, corresponding R5 tests/CI wiring. Other shared paths only for a named dependency of this behavior and exact reviewed diff.

**Forbidden scope:** Global AI-library toggle, another job engine/body store, new provider or permission, silent paid generation, unconfirmed candidate overwrite, unrelated Reader/Context redesign, later 1.0 runtime wiring.

**Implementation tasks:** Inspect reusable runner/cache/editor paths before changing. Make display, job and material-freshness states separate. New topic defaults to Original; tab-session topic preference and separate safe anchors follow MIG-09. Flush saved work before switching; retain failed/IME buffers. Existing valid cache remains readable without provider/key validation. First generation uses explicit current-topic authorization and controlled mock provider in tests; leaving a topic prevents late completion from navigating it back. Keep old readable output during processing. Implement §5.7 only over visible bounded blocks, release snapshots, preserve focus and reduced-motion fallback. Preserve existing manual drafts and backup exclusions.

**Required validation:** V-UX; R5 state tests and actual-worker browser journeys for cancel/first generation/cache/return/topic switch/failed save/Local-only/source purge. Assert cached switching and local-only paths issue zero provider requests. Applicable MIG-09/10 round-trip and viewport/light-dark/reduced-motion/IME review.

**Exit gate:** A complete working per-topic reading cycle is usable; no new dead control; existing update workflow is not broken. All slice gates pass. Record ON-01 COMPLETE but official UX-R5 remains IN_PROGRESS, not COMPLETE.

**Failure / recovery strategy:** On cache/state/authorization/late-response failure, keep the previous usable view and fix only this path. Do not discard manual drafts or reset preferences. Pending CI freezes product changes; next admitted run verifies or repairs ON-01, not ON-02.

### ON-02 — UX-R5 explicit updates, candidate acceptance and human-work protection

**Objective:** Complete the same topic's update → compare → explicitly accept → reread cycle and close official UX-R5.

**Entry gate:** ON-01 certified; all pending inherited/R5 fixes closed; UX-R5 remains the current official round. Never infer completion from a remembered candidate implementation.

**Allowed scope:** Remaining UI-14/13, DELTA-06, MIG-09/10, Spec §9.1; existing AI request/status, suggestion/revision/protection paths; `core/organizer/{ai-presentation,ai-draft,bounded-workflow,budget,original-simple}.js`, associated UI/editor and R5 tests. Update only R5 report/status and implementation-fact documentation after validation.

**Forbidden scope:** Background updates, append-only delta that ignores affected old relationships, AI-generated overwrites of protected fields, new durable candidate family, automatic retry after uncertain outcome, expansion to other topics, claiming a cancelled request retracts already-sent data.

**Implementation tasks:** Identify current source delta and no-change path; no-change sends nothing. Scope update to the confirmed topic/selection and show actual coverage. Retain previous output during processing. Reuse existing version/suggestion state for candidate comparison; stage selected portions without writing and save accepted portions in one CAS transaction, preserving unselected human text. Guard concurrent material/current-draft changes, partial acceptance, cancellation, outcomeUnknown, timeout and navigation. Preserve authored vs generated roles, provenance, revisions and immediate source-deletion invalidation. Complete versions/evidence side-reading and old/manual/candidate Backup compatibility in this slice. Audit the entire R5 requirement list, not only the new happy path.

**Required validation:** V-UX; `ux-r5-ai-states`, `ux-r5-ai-candidates` and mandatory actual-worker R5 journeys. Cover a human edit during generation, staged acceptance followed by stale CAS, zero-change update, duplicate action, stop/unknown outcome, source purge, independent human additions, old/manual/candidate restore. Controlled provider call count/scope assertions and full R5 visual/a11y/migration evidence.

**Exit gate:** All official UX-R5 requirements and G-01–G-08 pass. Commit `UX_R5_REPORT.md` and official status with exact certified source/evidence; official current round can become UX-R6 READY. Verify any new handoff-commit CI before ON-03.

**Failure / recovery strategy:** Preserve current human draft and uncommitted selection intent; reject stale acceptance atomically. Do not resolve by dropping revisions/candidates or loosening protection. Stay in R5 repair/verification until complete.

### ON-03 — UX-R6 settings that actually apply and fail safely

**Objective:** Complete the approved six-group settings lifecycle: change → persist → re-open → correct behavior, including failed-save rollback.

**Entry gate:** Official UX-R5 COMPLETE with actual evidence; ON-02 and its final CI/diff review closed. Official current UX-R6.

**Allowed scope:** UI-17, Spec §4 settings and related controls, existing preferences/onboarding/privacy/network/capture policy services; six-group UI and focused R6 settings tests. Only existing supported settings/diagnostic entry points.

**Forbidden scope:** Fake synced/connected state, new account/remote-sync features, changed permission defaults, broader capture, collecting private diagnostics, new settings database, redoing accepted navigation/theme design.

**Implementation tasks:** Inventory each approved setting and its real domain owner. Wire immediate effects, save failure rollback and reload persistence without replacing Reader/Topic location or drafts. Preserve denied/paused states and Local-only vs explicit local copy distinction. Complete existing language/theme/font/reading-width/privacy masking and accessible control labels. Keep unavailable sync/Connector capabilities honestly unavailable. Preserve essential old diagnostics while removing only proven duplicate entries.

**Required validation:** V-UX; actual worker preference write success/failure, cold reopen, system theme, language without changing user text, Local-only zero-network, exact conversation capture exclusion, keyboard/touch navigation, 320px and 200% text. T-07/19/28/30/31/32 and applicable metadata/Backup tests.

**Exit gate:** Every setting in this slice has a real behavioral effect or an accurate unavailable explanation, with recovery on failure. ON-03 COMPLETE; official UX-R6 stays IN_PROGRESS.

**Failure / recovery strategy:** Roll back only the failed setting transaction or repair its owner; never reset all preferences or enable a denied capability. Keep existing working entry paths until replacements pass.

### ON-04 — UX-R6 portable data exit and safe restore

**Objective:** Deliver backup → verified export → isolated empty-library restore, plus readable export that preserves user work and provenance roles.

**Entry gate:** ON-03 certified and no earlier pending validation/repair. Current official round UX-R6.

**Allowed scope:** UI-18 and relevant UI-20; `ui/backup.js`, `core/backup-service.js`, `backup-format.js`, `export.js`, existing import/restore validation and approved export controls; R6 backup/export tests; BACKUP/PRIVACY implementation facts.

**Forbidden scope:** Restoring over a non-empty real library, database clearing to make tests pass, silently raising size/object limits, unknown-version downgrade, new backup secrets, Passport reactivation, data-model rewrite, weakening R4 AI-evidence closure.

**Implementation tasks:** Reuse existing paged backup/export owners. Preserve immutable Source, Input working edits, Thought binding/protection, authored AI work, required provenance/version metadata and deletion fences according to existing supported format. Show format/coverage/limit/errors accurately, distinguish readable export from lossless backup and from encryption. Test actual exported content, not button existence. Reject corrupt/future/oversized/incomplete-evidence files before destructive writes. Resume/abort only by existing safe transaction semantics. Restore privacy/reverse-write/connection defaults safely; do not restore device-local anchors, transient Context or secrets. Include metadata introduced by every UX slice in round-trip checks.

**Required validation:** V-UX; true synthetic export and restore in another isolated empty profile, old/new/malformed/future/limit fixtures, interruption and repeated execution, Source hashes, manual Input/Thought/AI text equality, tombstones and denied rules, credential/Grant exclusion. R6 real-browser backup/export journey and required empty/error states.

**Exit gate:** User work has a tested way out and back within stated limits, and restore cannot resurrect deleted/restricted derived material or activate old permissions. ON-04 COMPLETE; official UX-R6 remains IN_PROGRESS.

**Failure / recovery strategy:** Keep original data and export intact; fail closed before restore commit. Never repair an inconsistent fixture by stripping protected content or clearing the destination automatically. Escalate any unapproved migration/data-loss risk instead of improvising.

### ON-05 — UX-R6 cross-size, accessibility and long-term-library closure

**Objective:** Make existing complete product journeys usable across the specified visual states and large-library conditions, then close official UX-R6.

**Entry gate:** ON-04 and all prior slices certified; official UX-R6 still current. No deferred safety/migration defects from R1–R5.

**Allowed scope:** UI-19, all modified pages' presentation/state edges, existing Tokens within the Spec's permitted tuning, focus/navigation/retained editing, bounded rendering, proven superseded CSS/event cleanup, R6 regression and final UX implementation-fact links.

**Forbidden scope:** Visual redesign, framework migration, broad folder moves, reducing fixture scale, disabling tests, unloading active editors for performance, replacing source bodies with summaries, false native-iPhone compatibility claims.

**Implementation tasks:** Execute the complete viewport/theme/keyboard/IME/reduced-motion matrix. Repair concrete overflow, focus, contrast, touch, selection, error-state and saved-position defects. Exercise F-LARGE with 100,000 Inputs, 1,000 documents, 300 topics, 5,000 topic entries and a 50,000-character input; retain bounded paging and truthful search coverage. Re-run F-MIGRATION. Remove a legacy UI/listener only after demonstrating its replacement journey and data owner remain intact. Account for all T-01–T-32 and G gates; do not treat a clean screenshot as data-safety evidence.

**Required validation:** V-UX; 1440x900, 1024x768, 390x844, 320x720 light/dark; 200% text, keyboard/focus, touch-sized controls, Chinese composition/Unicode and reduced motion; measured large-fixture behavior and migration round-trip; screenshot inspection with evidence paths/checksums. Preserve mandatory native-host CI.

**Exit gate:** Full official UX-R6 scope and G-01–G-08 pass, `UX_R6_REPORT.md` and official state committed. Record final UX regression as still required until ON-06. Do not label the entire PAIA 1.0 released.

**Failure / recovery strategy:** Repair the exact affected journey and preserve its strongest assertion; do not substitute time sleeps, relaxed thresholds or smaller data for the failing case. Pending visual/manual evidence is BLOCKED, not implicitly passed.

### ON-06 — Installable UX release candidate and end-to-end data continuity

**Objective:** Complete the separately authorized final UX-R1→R6 regression on the actual built extension, including new install and migration/restore continuity, leaving a verifiable release candidate.

**Entry gate:** Official R6 COMPLETE, all previous CI/diff/acceptance issues closed. No change to product direction or platform support matrix.

**Allowed scope:** Existing release packager/guards, emitted-package synthetic installation tests, final core-loop journeys and necessary localized regression repairs; bounded release-candidate receipt in control reports and official final-UX evidence. Use current packaging rather than historical local artifacts.

**Forbidden scope:** Main merge, real user deployment, Chrome Web Store upload, guessed production extension ID, transferring device private keys/Grants in backup, advertising a publicly available 1.0, cosmetic code changes merely to create a commit.

**Implementation tasks:** Build from pinned GitHub source and install the emitted artifact in isolated Chrome. Exercise consent→capture/import→read/edit/search→Thought→AI mock/cached view→explicit Context preview/export→backup→second empty profile restore. Include upgrade from supported old synthetic data, pause/deny/tombstones, wrong/unknown formats, concurrent edits and worker restart. Exercise prototype-to-new-install continuity through explicit backup transfer, not an assumption that a changed extension ID shares IndexedDB. Add an artifact-level regression only where coverage is missing; otherwise deliver executed evidence without manufacturing code changes. Record install/update/distribution gates still external.

**Required validation:** Full V-UX, T-01–T-32 traceability and all current mandatory CI jobs at the release-candidate inputs; built-artifact journeys, package manifest/content review, exact file checksums, no secret/private-data findings. Repaired runtime requires recertification of affected official round as well as final regression.

**Exit gate:** `final_ux_regression=PASS` with a GitHub-verifiable artifact and coherent migration/export behavior. This is UX_RELEASE_CANDIDATE, not Chrome Store/App Store/Plugin release. ON-07 can become eligible.

**Failure / recovery strategy:** Stay in final UX repair/validation and reopen affected official round when its claim is contradicted. Do not progress to iOS/MCP to avoid an inconvenient old bug. No real-data rollback.

### ON-07 — Shared Apple Remote Object v1 codec, with cross-language proof

**Objective:** Remove one concrete iPhone integration risk: Apple code can consume and produce the exact existing encrypted Remote Object protocol without changing it.

**Entry gate:** ON-06 PASS; time/opportunities remain; existing SYNC_CONTRACT, REMOTE_OBJECT_PROTOCOL, TRUSTED_DEVICE_PROTOCOL and SECURE_KEY_PERSISTENCE re-read. An actual Swift/CryptoKit test runtime must exist locally or in an additive permitted macOS CI job. No claim of physical-iPhone validation without hardware.

**Allowed scope:** A small independent `platforms/apple/PAIARemoteObject/` package (or reuse an equivalent path found in the latest target); deterministic PUBLIC synthetic test vectors; JS↔Swift interoperability tests invoking existing `extension/core/sync-crypto.js`; additive read-only CI test/artifact wiring. This is preproduction protocol implementation only.

**Forbidden scope:** New encryption scheme, modified AAD/HKDF/key sizes/canonicalization, real keys in fixtures, production root/private-key persistence, software fallback replacing hardware-backed identity, native UI rewrite, account/sync activation, App Store claims.

**Implementation tasks:** Implement strict Remote Object v1 parsing, canonical-header AAD, standard HKDF-SHA-256/AES-256-GCM and private-envelope/hash validation matching the existing JS wire bytes and size limits. Support successful two-way open/seal and reject tampering/wrong key/unknown version/malformed payload/tombstone body. Use actual JS outputs in Swift and actual Swift outputs in JS, not two independent mock implementations. Treat key bytes as supplied test/runtime capabilities, not a new storage policy. Document iOS-target compilation result separately from macOS test result. No package is connected to user data.

**Required validation:** Actual Swift tests, actual JS interoperability and rejection tests, compile on available declared Apple SDK targets; all previous extension/current-release CI remains green; additive Apple job is required by the aggregate gate. Fixed test-only vector key material must be labelled public synthetic data and never reused as product credentials.

**Exit gate:** A reusable protocol codec with executed cross-language proof and explicit platform limits. Mark only `apple_codec=VALIDATED`; iOS App, Keychain adapter, trusted-device UI, real sync and App Store remain NOT_IMPLEMENTED/EXTERNAL.

**Failure / recovery strategy:** Preserve protocol; investigate exact byte/encoding mismatch. Do not solve a mismatch by weakening signature/hash/AAD checks. If runtime or required SDK cannot be verified, BLOCKED rather than inventing compile results. Do not automatically jump to ON-08 to bypass the block.

### ON-08 — Read-only MCP Context boundary, isolated and non-deployed

**Objective:** Produce a working bounded MCP search/fetch adapter contract that can later attach to an approved production authorization/projection service, without exposing the current Archive or converting local grants into remote authority.

**Entry gate:** ON-07 certified; no UX/CI debt; explicit remaining budget; re-read AI_CONTEXT, ContextPackageService, manual/grant separation and Passport contracts. Current remote authorization/publication contract is NOT assumed to exist. A genuine MCP execution/test environment and supported SDK/protocol interface must be verifiable; otherwise stop.

**Allowed scope:** `integrations/mcp-context/` (or an existing equivalent found on the target), in-process/stdio MCP harness, bounded search/fetch tool schemas and policy-enforcing handlers over an injected authorized Context projection, public synthetic fixtures and additive mandatory CI. No network listener or production extension wiring.

**Forbidden scope:** Full Archive access; reading user's files or database; automatic user-message capture; write/delete tools; live OAuth credential improvisation; treating manual selection or existing local Passport as remote access permission; persistent Context body/index store; public endpoint/deployment/Plugin submission; claiming integration is production-ready.

**Implementation tasks:** Implement actual MCP tool registration and bounded search/fetch responses with IDs/version/scope/expiry/source role and explicit unavailable states. Require trusted injected authorization and projection capabilities; no-auth must fail closed, and the default non-test configuration must remain unavailable until a separately approved production authority exists. In synthetic tests, verify tenant separation, expired/revoked scope, unknown IDs, limits, stale projection and historical Prompt-as-data behavior through real handlers/protocol exchanges. Avoid logs of bodies/queries/secrets. Write the exact production integration prerequisites and unresolved remote-publication ADR; do not invent that ADR's approval.

**Required validation:** Real MCP protocol smoke (initialize/list-tools/call-tools as supported), end-to-end synthetic search/fetch and negative authorization tests, bounded response/logging tests; all inherited current-release jobs plus the new integration job in aggregate CI. Static schemas alone are not a functional slice.

**Exit gate:** `mcp_adapter=VALIDATED_ISOLATED` only. Clearly NOT_DEPLOYED / NO_PRODUCTION_AUTH / NO_DIRECTORY_RELEASE. After this slice or opportunity cap, stop; no ON-09 and no automatic next campaign.

**Failure / recovery strategy:** Reject access when identity/scope/provenance cannot be established. Do not connect real local Context merely to make a demo work. Resolve ordinary implementation failures within this slice; a necessary authority/permission change requires human resolution.

## 7. What remains outside this night even if all eight slices succeed

The 1.0 destination is not cancelled. Separate explicit gates remain: actual iPhone App and Share/Safari paths, platform feasibility/terms checks, platform secure storage and device trust UI, production account/device directory/pairing relay, opaque encrypted transport and offline/conflict/deletion/recovery behavior, approved remote Context publication/privacy contract, production OAuth/MCP and consumer authorization, physical Mac/iPhone verification, stable store identities, signed/notarized native-host distribution, support/privacy/account deletion/export materials, external beta and store/directory reviews.

Do not turn this backlog into permission to start unbounded infrastructure during a spare hour. In particular the previous conversation's proposed hosted Context projection is a design proposal, not an already approved or implemented repository contract. The local Context body's ephemeral rule and local-only Passport boundary remain effective until an explicit scoped replacement is approved.

## 8. Required per-execution report and state changes

Every admitted run, including repair, verification-only and blocked runs, commits `overnight/runs/NNN-<round>-<mode>.md` on the CONTROL branch and updates the JSON state atomically. Never overwrite or delete an earlier run report. A continuing run may append to its own report; a later run uses a new one and references the previous record.

Report exactly:

- campaign ID, admitted opportunity number, mode, round ID and official UX round;
- UTC start/end, observed runtime/tool capabilities and any approval limitation;
- actual **start product HEAD**, **end product HEAD**, product commit(s), candidate tree(s), and whether product files changed;
- exact changed files and additions/deletions, actual diff review and authority IDs;
- implementation summary and user-visible functional outcome; separate proposed/unimplemented work;
- each test/build/static/lint command, source SHA/input digest, runner, exit code, pass/fail/skipped counts, start/end or duration and evidence URL/artifact ID; unknown is null/NOT_RUN, not zero or PASS;
- CI run ID, attempt, PR head/base/merge SHA, each required job result and receipt/artifact checks;
- G-01–G-08 and official-round acceptance status, visual review and migration/Backup results;
- unresolved risks, stop/failure reason, exact reproduction and smallest next repair;
- next recommended action, pending CI, allowed next paths, remaining opportunities and whether progress is allowed.

State must retain latest expected product HEAD, official UX state reference, current slice, per-slice status, highest verified product checkpoint, pending prepared publication, pending CI, active owner, immutable run index, caps/deadline and blocking reasons. A controller summary must not rewrite official UX completion independently: the target's actual `UX_IMPLEMENTATION_STATUS.md` is still the only official UX execution-state source.

At cap, close the campaign as COMPLETE_WITH_LIMITS or PARTIAL_STOPPED/BLOCKED with exact remaining work and candidate/head references. Preserve unresolved WIP separately, release safe ownership, and do not create another scheduled task. A final delivery cannot label pending CI successful merely because there will be no later delivery.
