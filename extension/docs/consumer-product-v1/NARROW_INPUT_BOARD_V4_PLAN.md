# Narrow Input Board v4 — Executable Incremental Plan

Plan: **CPV1-NIBV4 / S0–S4**. Design authority: [NIB-V4-1.0](NARROW_INPUT_BOARD_V4_SPEC.md). Baseline inspected: main `47aa4df45fb9010a7be364fe144560e3f22b9887`, extension **0.41.0**; not the prototype's older 0.38 baseline.

**This PR is design/planning only. Every NIB runtime stage is NOT_STARTED and RUNTIME_NOT_AUTHORIZED_BY_THIS_TURN.** A subsequent explicit implementation authorization and the existing Root's assignment in STATUS select work; adopting this plan does not start an agent, change an in-flight branch, dispatch tests or merge code.

## 0. Entry into the existing programme

Keep PAIA-CONSUMER-PRODUCT-v1 as the sole queue. Root owns shared-data/worker/Settings/navigation/CI integration; the existing Prompt owner implements its assigned surface boundary. NIB is a follow-up within Prompt with Archive and AI-COST dependencies, not an eighth autonomous lane. Preserve all currently assigned TOPIC, CTX4, SET2, SYNC, AI-COST and IAH work, including unresolved Human sibling/Repository work. A blocked unrelated provider/visual gate does not block safe local NIB implementation after authorization.

Implementation order once selected:

```text
S0 (surface + immediate compatibility guards)
  -> S1 (Archive search + exact reuse)
  -> S2 (complete Free / manual intent acceptance)
  -> S4-local (Popup replacement acceptance and optional approved cutover)
S3 (Pro) starts only after S1/S2 and real service/entitlement/processing gates
  -> S4-Pro supplement before exposing Pro
```

S4 may therefore finish the local entry replacement before S3 is live. This does not mark S3 or the whole plan COMPLETE. If S3's dependencies are already genuinely qualified, Root can include it before final S4. These are dependency outcomes, not five mandatory PRs or an instruction to interrupt an existing coherent integration batch. Follow EXECUTION_PROTOCOL §§4/7/8; reuse verified unchanged work and retain all failures.

## 1. Batch-start contract

Before any runtime edit, read fresh remote main, current STATUS/AUTHORITY, this SPEC/PLAN, exact active PR heads/changed paths, and the original module owners listed in INTEGRATION. Record actual base/head and which shared files are reserved. If another writer owns an overlapping file, coordinate a bounded patch through that writer or defer only that boundary; never apply an old complete tree or overwrite another branch. Do not cherry-pick preserved #99/#132 or old Context branches just because they contain similarly named code.

Read actual package/workflow scripts; the inspected baseline provides `npm run test:unit`, `npm run test:browser`, `npm run check`, `npm run build:release`. Use the repository's existing file/category runner and complete affected native files. New test names below are proposed, not already present. Documentation changes do not bump manifest/package. A future coherent runtime batch follows DEVELOPMENT_WORKFLOW version/build policy without reserving a guessed version now.

## S0 — Upgrade the existing floating surface

**Priority P0. Goal:** the actual existing cross-origin Prompt frame becomes fixed-width, single-line and vertically adaptive without replacing its data or writer.

### Ownership and code scope

Modify only as necessary: `core/prompt-surface-layout.js`, `content/prompt-surface.js`, `ui/prompt-surface.css`, `ui/prompt-surface.js`, `ui/prompt-surface.html`; bounded geometry metadata in `background/prompt-surface.js` only if the existing protocol needs a field. Reuse PromptListSession, authenticated nonce/frame/host probes, position generation/reset, existing material, manual editor/close guards and ComposerAdapter. Stage3A layout/strip can receive only necessary safe-band compatibility changes; its detector/authorization is not redesigned.

### Tasks

1. Establish before-state fixtures for real Family IDs, representative, pin/order/hide/split, edited and independent manual expressions, open editor/IME and saved orb position. These remain compatible from S0 onward.
2. Replace three-line/51px presentation with normal 44px single-line rows. Reserve action space; detect real text clipping before direct use. Reuse existing full editor/checking mechanisms temporarily where needed so hidden text cannot be blindly inserted during this stage.
3. Keep `min(width<=400?322:336,width-32)` in all modes. Use whole top-controls/composer geometry and measured intrinsic height, 12px gaps, bottom anchored/upward extension. Remove below/side oversized-placement behavior only for this new board contract; do not erase position preferences.
4. Separate logical mode from geometry. Coalesce observer events into a scheduled layout pass. Size-only changes may not read the archive, call a model, remount the frame, clear selection or reset the open list.
5. Same-document route changes invalidate targets but preserve view; true document replacement starts collapsed. Update only the old automatic open-restoration behavior that conflicts with v4; do not reset browser-session Next permission.
6. Preserve dirty editing, focused row/list anchor and keyboard/coarse actions. For insufficient safe height retain mode, report unavailable geometry and keep PAIA accessible; do not fabricate a usable 53px search view.

### Acceptance / stop condition

Pass G01–G08 and M01/M02/M04 from ACCEPTANCE in source and release extension fixtures: exact widths including 400/401 boundaries, all rows one line, fewer results compact, many results scroll, composer/top exclusion, no blur/idle/scroll collapse, no late reorder, real-document reset versus same-document route behavior. Compare six reference states against the inspected v4 material, including dark/text enlargement. All source capture and private body owners unchanged by opening/geometry.

Preserve the original Prompt native file(s), Stage3A native lifecycle and Settings position-reset regressions. Add a focused `nib-v4-layout.test.mjs` and whole source/release native surface file only when needed, integrated via current test routing without deleting prior assertions. Geometry tests alone are not visual or live-site acceptance.

**Done:** fixed-size real frame and safe lifecycle work; old manual/Family capabilities remain reachable; no source/privacy regression. **Forbidden:** Pro service, alternate index/writer, Side Panel, early Popup deletion, forwarding arbitrary host messages as trusted reads. S0 is not the full search release.

## S1 — One Archive query and exact reuse

**Priority P0 after S0. Goal:** search all lawful historical user Inputs through the current Archive query, then copy/fill exact whole body or selected range.

### Ownership and code scope

Reuse `ui/input-search.js`, `core/qualified-input-search.js`, `core/input-search-cache.js`, `core/search-service.js`, `core/search-ranking.js`, original `SEARCH_INPUTS` / store reader / inputProjection, and Archive navigation/selection helpers. Extend only a narrow authenticated query/read/reuse delegation in `background/prompt-surface.js` and the existing worker. Reuse `background/prompt-reuse-commands.js`, `content/prompt-reuse.js`, `adapter/chatgpt-composer.js`, `core/prompt-clipboard.js` for output. Source-type resolver logic may be factored into a small adapter; it must feed the same insertion coordinator and target adapter, not create another DOM writer.

Archive handoff may touch `ui/archive.js` and existing navigation/view-session/route helpers. Root owns those shared changes. The 0.41 library-search constructor/Sync proof work is not a new NIB index; preserve it and current transactional boundaries.

### Tasks

1. Introduce ephemeral typed refs for history_input versus prompt_family/manual_reuse. Validate sender origin/frame/nonce/document and command fields; expose only bounded query, current-text/check, exact-copy/insert and handoff intent. Do not whitelist the frame as a universal settings/archive editor.
2. SEARCH uses the identical Archive scope, deterministic order, pagination/qualified snapshot and current Working Input bodies. No Family usefulness filter, no content-type tabs, no new index, no array search borrowed from the prototype. Empty query remains SEARCH; composition postpones work; new query cancels old continuations.
3. Use the same single-line row. Clipped/multiline content enters compact full-text check; resolve complete body or a precisely bounded range. Full-body checking viewport normally <=150px. Keep copy/full/range labels, Unicode offsets and selection across focus.
4. Bind copy/fill to current revision and eligibility. Do not use raw retained Source as fallback. Deleted/changed content fails closed and clears stale preview; an invalid range never becomes the whole Input.
5. Preserve actual draft caret/selection, IME/undo and one-operation behavior. Reject drift during preparation and ambiguous targets. A same-tab conversation/branch swap, document replacement, background tab target, or another window cannot receive stale material. Rebind is explicit and does not insert.
6. Preserve query, page cursor, result-relative scroll/focus and preview return. Board-to-PAIA sends an explicit same-query/current-Input intent through existing editor guards; no private text in URL, arbitrary route fragment or new global last-query store.
7. Document result-unknown handling: no automatic retry/new operation ID or destructive undo. Clipboard refusal supplies exact manual-copy fallback without a clipboard read.

### Acceptance / stop condition

Pass Q01–Q07 and U01–U10. Populate original stores with >one query page, a removed source whose underlying records remain, smart-filtered but Archive-search-eligible input, a manual override, long Unicode/multiline text and changed revisions. The board and PAIA must return the same ordered IDs for the same qualified query (not merely matching visible snippets). Copy/fill the exact intended text. Exercise hold/release between query/check/click/DOM effect, tab/window changes, worker interruption, IME and lost acknowledgements. Validate real cross-origin frame isolation with host DOM canaries and actual worker commands.

Retain full original Archive Search/Find/Back, original Prompt insertion/copy, source removal/recovery and strict caller tests. New focused files may include `nib-v4-search-reuse.test.mjs` and its whole native journey. Escalate to the existing full certification at the new trusted-read/disclosure boundary; do not defer privacy errors to S4.

**Done:** real search -> precise check/use -> PAIA continuation, without changing unrelated Archive behavior or leaving two search/writer implementations. **Forbidden:** semantic search as a prerequisite, auto-reading draft/replies for query, Source fallback, guessed complete pagination, new permanent query/body storage.

## S2 — Complete Free frequency and manual-work continuity

**Priority P1; its preservation constraints already apply in S0/S1. Goal:** v4 fully inherits rather than replaces the existing useful Prompt workflow.

### Ownership and code scope

Reuse `core/prompt-family.js`, `core/prompt-reuse-service.js`, `core/prompt-reuse-preferences.js`, existing `PromptListSession`, current UI editing/ordering and optional `core/browser-native-sync/prompt-journal.js`. Prefer presentation-only adapters. Changes to preferences/journals/restore require the existing shared data writer and independent review; no new Family schema or migration is justified solely by the new board.

### Tasks

1. Preserve pin/unpin, representative, manual edit/create/delete, hide/show, split/do-not-merge, retained expressions and drag/keyboard up/down, including entries absent from the current automatic recommendation.
2. Show editing/more in the same width. Explicit edits use existing revision CAS and preserve text on conflict/failure; no callback-only save success. Editing a history hit saves a separate reuse expression through the original owner, not an Archive mutation.
3. Freeze background order while open. User reorder applies immediately through the same pin/order mechanism; no extra recent/frequent/similar tabs. Next explicit refresh/open can adopt the newly computed order.
4. Preserve existing verified-reuse accounting. Test that a repeated capture, canceled copy, failed/unknown fill or user view causes no count change; one actual verified reuse is not double-counted by both UI and worker. Do not fabricate per-Input history from Family aggregate counts.
5. Keep all manual work over browser/worker restart, compatible restore, source eligibility changes and future subscription changes according to original invariants. Independent manual work is not relabeled history; source-derived work cannot bypass removal policy through an override.

### Acceptance / stop condition

Pass M01–M06 with before/after canonical snapshots and known manual-order/Family membership expectations; retain original Prompt Family, preferences, copy/insertion and affected Sync/backup native tests. Search cannot hide all manual work by replacing Free's only access path. No source, sent Input, unrelated Topic or Context changes occur when editing a reusable expression.

**Done:** all prior legitimate manual actions remain executable in v4; the same records/semantics survive restart and relevant restore. **Forbidden:** wiping or recreating Families, serializing a new prompt library, reusing Source deletion as a template-delete action, new telemetry/duplicate frequency model.

## S3 — Pro AI candidate selection

**Priority P1 but EXTERNAL_ADMISSION_PENDING, never a blocker for local S4. Goal:** genuinely authorized AI selects existing candidates; a fixed sample or local tier flag is not completion.

### Ownership and code scope

Reuse the current AI_USAGE_ARCHITECTURE/PLAN and `core/ai-usage/` admission, entitlement/budget/attempt/receipt/caching owners. Inspect `assist-intent-binding.js` and the current private Assist modules only as reusable machinery, not as a permission grant: their reply/context scopes do not automatically match v4's history-only scope. Use a small bounded provider/result adapter under existing AI-COST-06 ownership; expose its current candidate-ID result to the same Prompt board renderer. Existing Source and Prompt owners still resolve text and manual constraints.

### Tasks and live gate

1. Map the historical-ID facet into the existing job/quota/receipt system; do not create an independent quota, paid account or content backend. Preserve unrelated Free allowances and numerical authority in AI_USAGE_ARCHITECTURE.
2. Require server/trusted entitlement, real service readiness, feature-specific processing consent with current allowed bodies, and admission budget before dispatch. Provider/region/retention/fees and real credential/spend activation need the existing explicit owner/service gates. Fake checkout/Pro toggles remain fixtures only.
3. Build a bounded shortlist from the allowed current historical Inputs and relevant already-sent/archived user intent. Do not widen Stage3A, read draft/assistant history/hidden chats, or send the whole archive. On open/search/geometry read cache/local data; initial live refresh is a separate explicit AI intent, not a per-token or per-open call.
4. Validate an ordered allowlist of existing IDs. Reject invented text/IDs, deleted or revision-changed candidates, sensitive conditional assertions and unsupported negation/object matching. Resolve final text and protected manual slots locally before display/use. Late results do not reorder an open board.
5. Handle no-consent/service/offline/downgrade/quota/error/unknown response by preserving local 常用输入/search, with accurate optional explanation. Do not put AI 推荐 on fallback frequency results. Cancel/revoke fences prohibit late delivery; unknown financial outcome is not automatically retried.
6. Run a fixed synthetic reference-selection/negative-case corpus against the actual qualified route after live authorization. Compare with the existing Free baseline using preregistered paired tasks and independent human judgments, not self-grading or fixture pass counts. Require no fabricated/deleted candidate, no protected-row overwrite and no observed unsafe-scope disclosure; document contextual usefulness, abstention and latency/spend. If usefulness is not demonstrated or operational budget fails, do not expose the Pro board as qualified.

### Acceptance / stop condition

Pass A01–A08 in deterministic adversarial tests, then separately obtain real membership/service/consent/revoke/usage and provider-quality evidence. Record model/version/input contract, exact allowed scope, cost/latency measurement and all abstentions/failures. Synthetic fixtures can close ENGINEERING_COMPLETE only; never mark S3 COMPLETE or service launched without the live gates.

**Forbidden:** public rollout from private dormant Assist code; invented financial authority; free-text generation as history; claiming 193 prototype assertions as model accuracy; reply-consent reuse, hidden automatic retries or unbounded refresh schedule.

## S4 — Entry integration and Popup replacement

**Priority P1 after local S0/S1/S2. Goal:** no essential control disappears when Popup is eventually removed.

### Ownership and code scope

Existing `extension/manifest.json`, `background/service-worker.js`, `ui/popup.*`, `ui/settings-next*.js`, `ui/settings-preferences.js`, `ui/settings-about.js`, current onboarding/navigation and recovery/update owners; board more UI and a narrowly authenticated delegation only when needed. Root owns worker/Settings/version changes. Preserve action/default_popup until the replacement candidate proves all paths. No sidePanel permission or alternate carrier.

### Tasks

1. Confirm the proposed toolbar meaning before cutover: always open/focus PAIA, reuse an appropriate existing current-window tab without reload/data loss, create only if absent. First-use creates/opens existing onboarding. Search/checking's 打开 PAIA additionally carries explicit qualified query/input intent; ordinary toolbar focus does not infer host content.
2. Ensure PAIA remains reachable on unsupported sites, missing composer/geometry, hidden orb, storage/query failure and offline. Do not require installing wide tab/history/host permissions for convenience; current permission-safe app registration/lookup or bounded existing mechanisms must be verified.
3. Map every old Popup capability to an actual working control: first capture consent; Next status/configure/revoke; global pause/resume with actual backfill note; Settings/privacy; installed version/source-aware update; actionable fault guidance. Reuse existing owners. Any new board permission delegation is exact-frame/nonce/command bounded, not universal UI trust.
4. Put low-frequency operations in board more and PAIA Settings. No cumulative counts, green current-page success claims or capture-choice UI. Support cancellation/unknown acknowledgement without lying about permission state. Stage3A remains local/session/default-off, separate from Pro.
5. Test real entry behavior in two isolated build variants: original Popup control versus replacement candidate with toolbar handling. The same action cannot be assumed to open default_popup and onClicked together. Preserve old tests until every retained capability has replacement coverage, then port equivalent assertions rather than deleting safety assertions.
6. Only after all local replacement/visual/safety gates and owner entry approval pass may a **later authorized code batch** remove default_popup and unused Popup runtime files. No installed release in this docs task. Pro may stay unavailable; before exposing it run the S4-Pro admission/fallback supplement.

### Acceptance / done

Pass E01–E08 and the applicable full production matrix. True current extension with synthetic stores/host pages must prove source/release entry, old-control reachability, cross-origin authorization, actual browser frame geometry, PAIA-tab reuse/dirty-edit protection, unknown update states, no capture-policy change and new negative sender cases. Record untested actual devices/sites separately; do not call a page-shaped aside a native surface. Real ChatGPT/OS-IME compatibility remains the owning final release gate, not a reason to touch personal installations now.

**Done:** replacement mapping complete, no orphaned permissions or controls, stage evidence and exact-main identity retained; Popup cutover explicitly approved. **Forbidden:** cutover at design adoption/S0, removal solely because prototype looked right, deactivating captures or Next to simplify migration, hidden reinstatement of a Side Panel.

## 2. Delivery records and regression discipline

For each selected coherent batch, report: exact base/head/tree and source/release identity; paths and current file owner; tasks completed versus remaining; original and new whole-test results with PASS/FAIL/NOT_RUN/NOT_VERIFIED; screenshots at true CSS sizes; safety/caller/input equality probes; dependency gates and installation status. Do not manufacture one PR/receipt per numbered bullet, rerun unchanged whole certification to hide a failure, increase time budgets, remove fixture rows or replace original assertions with fallback success.

The v4 prototype's 56 combinations/193 assertions are reference evidence only. Runtime evidence must use existing data/permission/composer implementations, not the prototype array filter, sample Pro list, textarea writer or simulated clipboard. Product code remains untouched by this planning PR.
