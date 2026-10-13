# PAIA Settings and auxiliary pages — final UI implementation plan

**Current final presentation: SET2-UI-1.1 / OWNER_APPROVED / 2026-10-13.** Workstream remains **CPV1-SET2**, inside the existing seven-plan Consumer Product v1 programme. This is an in-place update, not a new execution plan.

Final reference: `PAIA_设置与辅助页面_交互原型.html` and the **33 new screenshots** in `PAIA_设置与辅助页面_统一设计包.zip`. [ADOPTION](SETTINGS_CONSUMER_V2_ADOPTION.md) owns the finite presentation replacement and retained product scope; [REFERENCES](SETTINGS_CONSUMER_V2_REFERENCES.md) owns exact identity and state mapping. This request produces **PLAN_UPDATED / DOCUMENTATION_ONLY**, not implemented production UI or visual acceptance.

## 1. Reuse the existing plan and current work

Planning baseline: remote main `03aecaff42998945d181b3d458fd0c92d1b65680`, tree `69805fcce8812ed5e650e6e97abbdc4b47cac91f`. At this read STATUS selects AI-COST-03 local Maintenance integration; that is not reassigned. Preserve current runtime/website/CI work, shared owners, paused Sync checkpoint, and all current product goals.

The preceding plan is preserved exactly in [SETTINGS_CONSUMER_V2_PLAN_PRE_UI_2026-10-13.md](SETTINGS_CONSUMER_V2_PLAN_PRE_UI_2026-10-13.md), blob `aa02db6a4d9185698816244ac78a1aa3c754e15a`. It incorporates [the full source-grounded five-stage baseline](SETTINGS_CONSUMER_V2_PLAN_PRE_AI_USAGE_2026-10-07.md), blob `e856a1ead2a2442561801b3868db240b3abd6b66`. **All nonconflicting S01–S16 owner/gap requirements, five stages, compatibility/migration mappings, position-reset races, safety and evidence requirements remain incorporated in full.** Read the relevant retained detail when touching that boundary; archiving does not cancel it.

Old 20/21-row inventories, frozen geometry, initial NOT_STARTED/PLANNED, old version observations and sole next-task pointers are historical. Current behavior must come from latest main and owning evidence, not the old plan's status table. The approved target has six groups and 22 operations as listed in ADOPTION. Reuse already-correct services and close only demonstrated integration gaps. Do not restart SET2-01, finish the superseded UI first, or convert each row/state into a separate project or certification cycle.

Keep one writer for shared AppShell/navigation/editor/preferences/worker/storage boundaries. Each auxiliary domain retains its owner. No new application router, content catalogue, permission store, cloud engine or recovery database is justified by adopting this design. Existing protocol/risk gates continue without weakened tests or fabricated prerequisites.

## 2. Final presentation implementation anchors

Use the approved CSS composition through existing semantic roles and scoped production styles, including final cascade overrides. The following measured prototype values are anchors, not new content schemas, fixed-height constraints or compulsory overrides of user settings:

| Role | Approved starting point |
|---|---|
| Ink / accent / divider | `#20334d` / `#3769c9` / `#dfe9f6` |
| Canvas | Near-white `#fbfdff`, broad restrained pale-blue radial tints; content remains dominant |
| Primary rail / workspace | 184px reference rail; 1120px maximum workspace, 1192px on widest reference |
| Workspace inset | 43px top / 62px horizontal reference; responsive overrides at actual available width |
| Title / group heading / row text | 34px serif title role / 23px group heading / 15px UI row label; narrow roles adapt |
| Group directory / gap | 168px / 55px; widest reference 180px / 62px |
| Settings rows | Flat separators; approximately 85px with explanation, 74px for compact reading choices; grow with wrapping/text enlargement |
| Useful paper / reading preview | 18px / 16px radius, fine blue border and restrained depth; never one large card per switch |
| Short confirmation / extended consent / drawer | About 500px / 590px / 505px, capped by viewport with safe scrolling and reachable actions |
| Compact Settings | At about 1023px and below, directory and group become successive views; no duplicate large title |
| Coarse/narrow main controls | At least 44 CSS px effective target; preserve existing keyboard/focus/reduced-motion rules |
| Reading preferences | Existing 16/17/19/21px and 640/680/720px mappings; actual saved values and system behavior remain authoritative |

Preserve the separately approved brand. The demo wordmark is not Logo authorization. Do not distribute font binaries. Do not copy mock `zh`, `compact`, `font`, `width` or style keys over production enums/normalizers; adapt the view to the current owner. Dark translates the same hierarchy rather than providing another art direction. Resolve real contrast/target defects within the approved visual language, recording necessary deviations instead of copying an inaccessible incidental pixel.

## 3. SET2-01 — unified Settings shell, local preferences and first-use presentation

**Outcome:** all six groups in the actual application use the new light directory/flat rows; local preferences and capture consent remain durable and safe. The existing first-use path gains the approved welcome/example/permission presentation without changing normal Archive entry.

Reuse `ui/settings-preferences.js`, `settings-local-state.js`, `ux-r1-state.js`, current AppShell/RouteSession, acknowledged UPDATE_PREFERENCES, `settings-capture-consent.js`, the actual capture/filter owners and the existing preview-mask owner. These are baseline locations to recheck, not proof that every current interface remains unchanged. Preserve installed listener identities and safe DOM handoffs; do not leave orphan listeners/null bindings when relocating presenters.

Implement the exact six-group order and the 22-operation target with truthful dependency states. Desktop neutral Settings selects Input Archive; explicit return/history restores its actual group/subpage. Narrow first entry shows the directory; group/subpage contains one heading, contextual Back and usable controls, not squeezed desktop columns. Retain scroll/focus and unfinished work across browser navigation, resizing and cross-space transitions.

Appearance uses the approved simple visual chooser; supported language, size, width and time keep their actual values. The reading preview uses fixed clearly synthetic text and sample time, never private material. Show preference effects after actual acknowledgement; failure retains/reconciles the last confirmed value and offers explicit retry of the user's pending choice. Retry rereads current state and cannot overwrite a newer cross-window change without the existing policy. No provider call, full-library enumeration, output mutation or quota debit follows from selection.

Bind hide-preview through its single current owner before removing any old host. Initial read/unknown/error respects the existing fail-closed mask. The preference must also mask applicable excerpts on the three newly designed primary spaces and removed-content previews without changing their layout/identity or removing results from the corpus. Explicit lawful content opening remains possible. No second hidden-preview preference or duplicated private snippet cache.

Present first-use welcome only at the real existing onboarding/explicit entry. Previewing a sample writes no sample corpus. Capture consent remains an explicit acknowledged action with the full actual scope: eligible sent/displayed user inputs, no drafts/ordinary assistant archive/credentials/attachment bodies, Temporary Chat exclusion and accurate time evidence. Keep the actual pause/resume and page-visible-old-input disclosure. Neither welcome nor consent activates Sync, external AI, suggestions or a paid service. Completion returns through the real approved onboarding destination, not the mock's return-to-Settings shortcut. Normal 档案 still opens IAH-1.2's neutral blank Main; toolbar focus/reuse semantics remain unchanged.

Acceptance: current persistent owner exercised for save/reopen/worker lifecycle, old enums/unknown versions, read failure, write failure/retry, two-window late responses, system locale/theme, correct live preview and no private material, capture cancel/ack/pause/resume, filter versus capture independence, human Keep/edit protection, preview masking and guarded Reader IME/drafts. Matched actual Home, reading, consent, first-use, failure, narrow and dark views. Source code presence or an iframe cannot close the stage.

## 4. SET2-02 — Data, import/recovery, Source and Sync presentation integration

**Outcome:** six Data destinations adopt the new composition through their existing owners. The local five destinations do not wait for live cloud service. Sync remains the sixth entry and BNS retains all of its functional implementation and gates.

Reuse current Settings detail presenters, `history-completion.js`/ImportHandler, `backup.js`/BackupService, typed SettingsRemovedComposite and actual Input/Topic/Entry/Placement recovery, OriginalSurface/ArchiveOriginalQuery, storage estimates and confirmed-fault recovery. Prefer normal secondary pages for substantial workflows with clear Back; a source check is a temporary drawer, and a concise risk decision uses the shared modal. Presentation changes do not replace transactions, validation, listeners, continuation or cancellation semantics.

Import and existing-file restore retain select → validate/stage → preview actual scope/conflicts → explicit activation → acknowledged result. **The mock's built-in file, fixed counts and one merge route are not a parser, a validator, a migration strategy or the complete supported inventory.** Preserve existing supported file formats, duplicate/current-Working protection, unknown source times, unresolved branches/destinations, cancellation, same-file resume, interrupted writes and idempotence. Preserve lawful empty/merge/replace paths, with distinct replacement impact/confirmation, restart-safe staging, current producer compatibility, backup/restore epochs, human conflicts, final revalidation and atomic activation. No active library change before authorization; no restored active grants, suggestion permission, tokens or cloud account. Import does not become Sync; automatic BNS new-device recovery is not replaced by file import.

Removed content stays a typed composite with actual complete paginated coverage for Input, Topic, Entry and Placement, not the two sample rows. Dispatch only to the relevant object owner. Preserve bodies/other placements, negative intent, revisions and stronger deletion fences. Recovery cannot restore revoked access; unknown result is reconciled as the same attempt rather than issuing a duplicate mutation. Undo must revalidate current revisions/fences and never replace the whole collection with a stale snapshot.

Source records use real immutable evidence and known time precision, never current Working text masquerading as the original. Local source reading and verified original-site navigation remain distinct. Contextual content history remains available through its real owner but is not reintroduced as a Settings row. Copy revalidates current eligibility and copies the exact requested full text/newlines, not the prototype's shortened sample or UI labels. Retain lawful object-specific Source purge and current B-02 refusal/preflight/revalidation; the absence of a purge button in this sample does not cancel safety or supported original-object actions.

Storage displays only actual measured owner facts with correct units, coverage and unknown states; no seeded megabytes, fabricated components or generic clear-storage command. Do not scan private corpora simply to decorate the page. Actual confirmed index failure may reveal the approved local repair page. A transport error, unavailable service or incomplete build is not corruption. Repair uses the same existing action/cancel/failure owner and preserves canonical work, permissions and recoverable state; no normal diagnostics dashboard.

### BNS integration, not a new Sync implementation

[Browser-Native Sync UX](BROWSER_NATIVE_SYNC_UX.md) consumes this adopted presentation for the depicted Sync/auxiliary states. BNS CONTRACT/PLAN remain the sole functional authority and schedule. Reuse its live availability/provider/subject/publication/conflict projections; do not store them independently in Settings. No provider login is assumed from ordinary browser sign-in.

New visual coverage includes unavailable/not enabled, actual synced cut, offline, paused, account change, disconnect, cloud-object confirmation and entity-specific human conflict. **Retain the complete previous BNS state matrix and adapters**, including provider cancellation, safe bootstrap, automatic new-device restore, incomplete/corrupt content, reauthorization, quota/throttle, remote retirement, native capability gaps and partial deletion. The 33 new images do not replace these requirements.

Show local save separately from confirmed cloud publication and last-success evidence. Offline/paused work remains usable locally. Subject change stops retargeting and late writes; new-account copying requires informed scope and destination preflight. Pause/disconnect retain the stated copies. Cloud deletion names the real provider/account/dataset, preserves default local data, retirement fences and partial-failure retry, and does not promise physical erasure of other devices/provider retention. A deletion result never transitions a previously bound missing dataset into ordinary empty-cloud auto-create. Use actual runtime stage progress rather than invented percentages.

Conflict presentation shows both actual human revisions with readable text and provenance. Apply only lawful entity-specific actions: keep one/other, separate objects where legitimate, or existing safe manual merge. The sample is two reusable prompts; 'keep both' is not valid for every Source/Placement collision. Postponement preserves both; unrelated content proceeds where safe. Revalidate revisions/identity/intent on commit and reject corrupted alternatives. Respect saved prose and stack versions at narrow/large text sizes.

Acceptance: actual import/restore/typed recovery/Source/repair boundary tests from the full retained baseline, including corruption, partial/missing pages, cancellation/restart/CAS, tombstone anti-resurrection and zero unintended permission change. Match new relevant views; BNS tests its actual states/commands through its own gates. A missing provider blocks its live claim only. No real user file, cloud account, upload or destructive operation is performed by this documentation task.

## 5. SET2-03 — Context/Prompt route, connection auxiliary page and AI style

**Outcome:** Settings continues to contain one Context destination, the real Prompt-owned suggestion preference, one AI Organize style choice and secondary position reset. The newly approved connection page is reached from AI Context and belongs to **CTX4-06/07**, not a Settings permission group.

Use the current minimal Context status/route and actual connection owner, not card bodies or Archive scanning to compute status. Preserve reachable revocation before retiring an old entry. No connection/known off/paused/unknown/error and live effective access are distinct. The connection page uses the new header/back/rows and selects 用于 AI in primary navigation, with no Settings category rail. Its Back restores the recorded Context origin; do not rebuild the four cards or overwrite CTX4-UI-1.1 references.

CTX4 keeps one shared scope, default-off policy, trusted identity/caller enforcement, revision/authorization-generation checks, full eligible Topic traversal, no Archive fallback and real one-client read/revoke acceptance. Pause retains the intended binding; revoke targets only that connection, preserves Card/Topic selections and does not silently affect other clients. Unknown acknowledgement is not success; reject late revoked reads. Reconnect requires actual authorization and does not re-enable Global/Card/Topic gates. A connected-looking picture is not CTX4-06 completion; all its independent service/transport/security requirements remain.

Bind next-suggestion consent to the existing default-off local Stage 3A/NIB owner. The mock's two sequential consent/enable writes must not create a partially authorized live state: use the actual qualified owner/atomic acknowledgement. Closing/disabling clears eligible ephemeral state and rejects late results, without changing capture or Stage 1/2. Do not implement another reply collector or infer remote Assist consent. Preserve current NIB v4 width/lifecycle/entry and Free/Pro semantics.

Position reset touches position only through the qualified trusted Prompt owner. Preserve text, families, order, hide/pin, open state and suggestion consent, including live-host cache, dragging and stale-save races from retained plan §5. The mock's success toast is not a reset implementation.

Style choices save only the existing preference, with original/balanced/concise presentation mapped to current production values. AI-COST-05 and TOPIC-05.7 remain transformation/integration owners. Keep all three styles and qualified saved caches, no per-Topic Settings override, permanent style control added to Reader, provider key, new quota console, automatic refresh or financial authority.

Acceptance: route/status/return, trusted sender, no permission writes from Settings, Context source-revision/connection isolation and unknown states; actual position-only reset under live-host/cross-tab/restart/failure races; consent cancel/failure/late output; no durable assistant content/network/send; three style choices/ack/retry/reopen/current enums and zero generation. Actual live connection evidence remains in CTX4, not borrowed from the synthetic prototype.

## 6. SET2-04 — About, supported sites, help/legal and feedback

**Outcome:** the four existing About destinations and applicable Source-facing explanatory surfaces use the approved typography, readable secondary pages, help disclosure and feedback dialog.

Use real version/update/support facts and verified existing destinations. Do not label the installation current merely because no update notification exists. Opening Settings or choosing appearance/style does not query providers or send diagnostics; any existing deliberate update/help navigation keeps its exact supported action and leave guards. Old demonstration version and site names never become production capability claims.

Privacy and terms present the actual published/approved content, current version and real effective date where available. The new design's privacy summary is not a replacement for the full current policy and its terms page is explicitly non-effective placeholder material. Layout approval neither drafts nor enacts legal obligations. Missing verified legal/contact content is reported for that destination rather than fabricated or made a global local-UI blocker.

Help uses task-focused disclosures and normal long-form reading; content history stays with the content. Supported websites shows actual capture capabilities and exclusions, separately from external AI clients, with no raw host/permission matrix. Local-only/optional-cloud statements reflect actual state, not a blanket promise contradicted by authorized Sync.

Feedback preserves the user's draft via the existing lawful local mechanism and offers exact explicit copy with a truthful fallback. Do not auto-attach logs, private query/body/source data, credentials or send merely on opening/closing/copying. Keep existing verified explicit contact routing rather than replace a working channel with the mock's copy-only limitation. A send action requires its actual owner, recipient/channel and explicit user action; a draft/copy is never called sent. Failed persistence and browser Back retain/guard the text. Do not copy the demo popstate path that can bypass its feedback guard.

Acceptance: correct installed metadata and unavailable states, verified channel/content routing, no unsolicited network, complete legal/help reading, safe copy/newlines, feedback IME/draft/failure/navigation guards and contextual focus return. No release upload, account setup, policy publication or real feedback send is authorized here.

## 7. SET2-05 — actual application convergence and retained full coverage

The 33 pictures are masters for their depicted states, not the whole behavioral test suite. Preserve every nonconflicting earlier Settings state (including the prior 26-image coverage), current BNS complete state classes, Context connection/read/revoke obligations and shared safety/verification requirements. Add new reading-preview, first-use, secondary-page/drawer, conflict, no-connection and failure compositions without reducing corrupt/replace/interrupted restore, typed recovery or unknown-state coverage.

Compare actual source/release screens with the new reference under matched viewport, theme, language, zoom, data, current build and saved preferences. Full-page image height is not automatically the browser viewport; record both. Existing three-page approval stays TL-PT1-UI-1.1 / CTX4-UI-1.1 / IAH-1.2. Validate their shared navigation/preferences/preview-mask integration without redoing their layouts or resetting data. The package embeds those originals byte-for-byte for comparison only.

Exercise the actual navigation, shared preferences, transaction and service presenters—not iframe fixtures. Verify keyboard focus/labels/selected option, modal focus trap and dismissal return, arrow-key single-choice controls, IME and dirty Reader/feedback protection, native history, viewport resize, system-language/theme, 320 CSS px reflow, 200% text, coarse targets, reduced motion and contrast. UI role sizes remain separate from body preferences. Preserve all prior negative results with their original heads; replace only obsolete geometry expectations, not underlying safety assertions.

Strip all prototype controls, screenshots, base64 iframe apps, postMessage bridge, synthetic corpus/files/accounts/measurements/times, fake success or failure switches, dummy deletion/recovery actions and `__paiaSettingsDemo` hooks from production. The HTML's localStorage model, simple enums/history, whole-array undo and unqualified sync/connection assignment are demonstration-only. Do not weaken production CSP or embed unrestricted inline scripts to reuse the mock.

Use current VERIFICATION/EXECUTION_PROTOCOL: focused/affected checks for presentation, escalating actual permission/caller/identity/storage/migration/deletion changes through the existing full boundary. Reuse valid unchanged evidence and consolidate coherent batches; neither one full run per row nor acceptance-free CSS replacement is required. Local runtime, screenshot fidelity, accessibility/device, live cloud/client/AI, installed availability and release are separate claims.

Close only when applicable real owners and screens satisfy the approved target and required evidence. A documentation commit, old release PASS, 36/36 prototype report or navigation between mock pages is not completion. Missing external evidence blocks its dependent claim only; do not reset independently completed local foundations.

## 8. Execution order and scope lock

When STATUS schedules the work, inspect/reuse current owners; complete SET2-01 shared composition/preferences and first-use presentation; integrate SET2-02/03/04 through their independent existing owners; converge with SET2-05. Compatible outcomes may share a batch/PR. BNS and CTX4 own their live seams and current scheduling, not this suggested order. No extra queue, new global next task or instruction to interrupt current AI-COST/Prompt/website work is created.

The finite supersession is ADOPTION §4. History is preserved in the exact PRE_UI files and their incorporated earlier baselines. This task changes documentation only: no runtime, schema, tests, CI, package version, website, user data, permissions, service activation, paid call, cloud/AI connection, installation or deployment. Original design assets are not published by this adoption.
