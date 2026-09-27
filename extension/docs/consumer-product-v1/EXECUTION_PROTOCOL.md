# Execution Protocol — PAIA Consumer Product v1

## 1. Manager model

This package is designed for a high-reasoning ChatGPT manager operating against GitHub remote main.

The manager is responsible for product/technical integration. Codex or another coding agent may implement bounded tasks, but the manager owns:

- current-state reconstruction;
- task decomposition;
- review;
- integration;
- CI interpretation;
- real-browser evidence;
- UX convergence;
- status/receipt closure.

The product owner is not the manual project manager.

## 2. Authorization modes

Default after package activation:

- "继续 PAIA" when no slice is active authorizes the one slice marked READY as WHOLE_SLICE_PREAUTHORIZED.
- The manager may execute all ordinary rounds in that slice without asking the owner after each round.
- "继续" during an active slice resumes that same slice.
- A new slice is not automatically started after the current slice closes unless the owner has explicitly granted whole-package continuous authorization.

The owner can explicitly grant WHOLE_PACKAGE_PREAUTHORIZED later. Even then, owner gates below still stop execution.

## 3. True owner gates

The following are true owner gates for the **affected action or product meaning**, not automatic package-level stop conditions:

- a Product Intent conflict listed in AUTHORITY.md;
- a new privacy/data-collection permission;
- a new external account permission with meaningful user-data access;
- a paid plan, billing account, purchase or new recurring cost commitment;
- an irreversible/destructive migration not already covered by an approved migration contract;
- a legal/public-release commitment;
- a genuinely personal semantic judgment that independent evaluation cannot establish.

When one is reached:

1. do not guess, cross, or weaken the gate;
2. record the exact dependency in `DEFERRED_FINAL_GATES.md`;
3. leave the dependent feature/action disabled, unshipped, synthetic-only, or explicitly uncertified as appropriate;
4. continue every later canonical task that is independent of that unresolved decision;
5. ask the owner immediately only when the answer is required to keep any useful engineering path moving; otherwise batch the decision for final convergence.

The whole package stops for an owner gate only after all dependency-safe automatable work has been exhausted.

Do not ask the owner to choose:

- component libraries;
- CSS values;
- ordinary data structures;
- refactor boundaries;
- test repairs;
- accessibility fixes;
- performance tuning;
- ordinary dependencies;
- code organization;
- retry/backoff mechanics within an approved privacy/cost envelope.

## 4. Start-of-batch and subround protocol

For unfinished Consumer Product v1 work, the default execution unit is a **coherent integration batch**, not one PR per numbered subround.

At the start of a batch:

1. Resolve current remote main HEAD.
2. Read STATUS.md, AUTHORITY.md, the slice contract, and every numbered subround included in the batch.
3. Read only relevant current PRODUCT/ARCHITECTURE/history needed for compatibility.
4. Inspect current code and recent commits; do not assume the planning baseline is current.
5. Confirm there is no other writer touching the same runtime/data boundary.
6. Reuse correct work already on main or an active PR; do not redo it.
7. Record the exact batch start SHA in the PR/body or batch checkpoint.

Inside the same batch, advancing from one numbered subround to the next does **not** require a new branch, PR, formal receipt, STATUS rewrite, merge, exact-main certification, or full context reconstruction. Keep the same sole writer and record only a compact checkpoint in the active PR when useful.

Re-read remote main before integrating the batch, and immediately if evidence shows another writer changed the same dependency boundary.

## 5. Implementation rules

- Product behavior is fixed by higher intent; implementation may change.
- Prefer deleting obsolete UI coordination after the replacement path is certified; do not leave permanent dual behavior.
- Never weaken an old safety test merely to make a new design pass.
- Do not convert a failed normal capability into a PASS by demonstrating a fallback.
- No real private archive text enters Git, CI logs or public screenshots.
- No hidden paid AI retry, remote upload or new provider permission.
- Current Source, human edits, revisions, deletion fences and authorization must survive migrations.

## 6. UI implementation-first convergence

There is no mandatory standalone prototype phase.

For a UI round:

1. implement the real production path behind an isolated route/feature gate where needed;
2. exercise it with realistic synthetic long-form data and all relevant states;
3. capture representative desktop/narrow screenshots or browser recordings;
4. audit against UX_CONTRACT.md for hierarchy, density, actions, focus, errors and long-content behavior;
5. fix deviations in the same round;
6. only then close the round.

"Looks cleaner" is not an acceptance criterion.

## 7. Verification progression

Verification is progressive. Do the cheapest truthful evidence first and reserve expensive environment-level certification for the boundary that actually owns it.

### 7.1 Inner-loop / candidate

During implementation:

- run targeted tests and affected regressions;
- use bounded browser smoke or lifecycle checks for the behavior being changed;
- batch related fixes before starting another full candidate;
- do not deploy every candidate or repeat unchanged production evidence;
- do not widen the acceptance surface merely because more cases could be tested.

A candidate is not a release and does not require publication unless the current round explicitly owns a release/distribution outcome.

### 7.2 Round closure

For unfinished rounds after this cadence amendment, a normal round progresses:

DESIGN/RECONSTRUCT → IMPLEMENT → TARGETED TEST → AFFECTED REGRESSIONS → LIGHT INTEGRATION GATE → MERGE → MAIN READBACK → RECEIPT/STATUS.

Ordinary round closure does **not** require reacquiring the complete historical browser suite, macOS certification, performance matrix, accessibility matrix, CURRENT_LIVE evidence, or unrelated reliability scenarios. Those belong to the owning slice/certification boundary unless the round itself changes that risk boundary.

The light integration gate keeps unit, adapter/privacy contracts and release/package build guards. The executor must still run the directly affected browser journey locally or in a bounded CI job before merge when UI/browser behavior changed.

Escalate an ordinary round to full certification immediately when it changes schema/storage identity, deletion/anti-resurrection, capture admission, privacy/authorization, migration/rollback, release identity, or another invariant where delayed discovery would make later work unsafe.

Only evidence directly required by the round contract or needed to protect an affected invariant is a round-closing gate. Evidence already valid for unchanged runtime paths should be referenced rather than mechanically repeated.

For provider-facing behavior, synthetic/headless evidence may close the engineering behavior of an ordinary round when the round contract does not itself require CURRENT_LIVE proof. Current provider compatibility is then certified at the owning slice/certification boundary. Evidence labels must remain truthful.

### 7.3 Slice / certification boundary

The full evidence classes in VERIFICATION.md are slice-level acceptance. At the slice's explicit certification round or final closure, collect the applicable:

- current real-browser/device journeys;
- complete reliability/degraded matrix;
- user-level acceptance;
- performance evidence;
- migration/release-path evidence;
- final exact-main receipt.

No slice may be marked COMPLETE while an applicable final evidence class is missing.

### 7.4 Deferred external gates and continuous engineering

A release host, provider site, CI capacity limit, deployment quota, distribution identity, signing credential, or similar external dependency must never be converted into a PASS.

PAIA tracks two independent frontiers:

- **engineering frontier** — the furthest canonical round/slice whose automatable implementation and non-external engineering evidence have been completed;
- **certification frontier** — the furthest round/slice whose required external/current-live/distribution evidence has also passed.

When an unavailable external dependency is the only missing evidence, record the exact obligation in `DEFERRED_FINAL_GATES.md` and mark the owning round `ENGINEERING_COMPLETE / EXTERNAL_CERT_PENDING`. It remains not COMPLETE.

Under `WHOLE_PACKAGE_PREAUTHORIZED`, an external-only pending gate does **not** impose an arbitrary one-round or one-slice lead limit. The manager continues through later rounds/slices already present in the canonical plan whenever dependency analysis shows that the next engineering work:

- does not require the missing external result to be true;
- does not weaken or bypass the pending gate;
- does not cross a true owner gate from section 3;
- does not create conflicting writers on the same runtime/data boundary.

If only part of a later round depends on pending external evidence, defer that dependent evidence/action and continue the independent engineering portion or the next independent canonical work. Do not keep an execution alive merely to poll an external service.

A later engineering round/slice may be integrated while earlier certification remains pending, but its receipt/status must name the unresolved predecessor and may not claim end-to-end production certification. Slice/package COMPLETE remains impossible until every applicable deferred final gate is actually satisfied or the product contract is explicitly changed by the owner.

If delayed external evidence reveals an implementation/product defect, reopen and repair the earliest affected behavior, identify downstream evidence invalidated by that defect, and revalidate it. Unrelated independent engineering need not be discarded or globally stopped.

Publication remains separate unless explicitly authorized. Security, privacy, data-integrity, deletion, identity, irreversible migration, and permission gates are never deferred merely for throughput.

### 7.5 GitHub CI scheduling

For unfinished work after this amendment:

- draft runtime pushes use the lightweight `PAIA Candidate Gate`: unit suite, adapter/privacy contracts and release/package build guard. Full historical browser coverage is intentionally absent;
- the executor runs targeted browser tests for the behavior actually changed before each meaningful checkpoint; do not use a green lightweight gate as proof of untouched browser behavior;
- when an ordinary round is ready to integrate, mark the PR ready. `PAIA Certification` runs the light round-integration gate by default;
- add the exact marker `PAIA_FULL_CERTIFICATION` to the PR body when the current round is a slice certification boundary or the manager classifies it as high-risk under section 7.2. Full Current Browser, Full Suite and macOS certification then run on that exact head;
- when merging a full-certification boundary, include `PAIA_FULL_CERTIFICATION` in the merge commit message so the exact-main run also uses full depth;
- ordinary round merges receive the light exact-main integration gate; they do not mechanically rerun all browser history;
- workflow_dispatch remains an explicit way to run full certification when needed;
- documentation-only changes under `extension/docs/**` do not trigger runtime certification.

Already completed rounds keep their historical evidence unchanged. Do not reopen or recertify them merely because this cadence changed.

## 8. Branch, batch and merge discipline

- One integration writer per data/schema/runtime boundary.
- For unfinished slices, prefer one long-lived **slice-batch PR** covering 2–4 strongly related numbered subrounds instead of a PR per subround.
- Numbered subrounds remain scope/checklist boundaries; they are not mandatory Git integration boundaries.
- Within a batch, commit freely and run targeted checks without marking each subround COMPLETE on main.
- Produce one formal batch receipt and one STATUS/main integration update at the batch boundary. The receipt must state which numbered subround outcomes are satisfied and which remain.
- Merge early only when a high-risk boundary requires independent integration evidence, when the next work genuinely depends on main integration, or when the batch has grown too broad to review safely.
- Do not keep a batch open merely to absorb unrelated future slices.
- Candidate CI is not exact-main CI.
- After a batch merge, perform the selected exact-main integration gate once; do not repeat it for every numbered subround already covered by the same batch.
- Documentation-only status commits must describe the runtime SHA they certify and must not imply the docs SHA itself is the runtime.

## 8.1 Default batch map for the current desktop build

Unless a newly discovered dependency makes a boundary unsafe, use the following integration batches:

- **VS-02**
  - Batch A: CPV1-02.1 + 02.2 + 02.3 — AppShell, Archive root, Project/Conversation Navigator.
  - Batch B: CPV1-02.4 + 02.5 — Conversation Reader plus retirement of migrated legacy UI ownership.
  - Closure: CPV1-02.6 + automatable CPV1-02.7 — performance/accessibility and certification; CURRENT_LIVE may remain deferred.
- **VS-03**
  - Batch A: CPV1-03.0 + 03.1 + 03.2 — support scale, import contract, resumability/preflight.
  - Batch B: CPV1-03.3 + 03.4 + 03.5 — streaming Backup, staged restore, failure injection.
  - Closure: CPV1-03.6.
- **VS-04**
  - Batch A: CPV1-04.0 + 04.1 + 04.2 + 04.3 — editor/query foundation, direct editing, inspector, lexical search.
  - Batch B: CPV1-04.4 + 04.5 + 04.6 — Smart Filter, removal semantics, reliability matrix.
  - Closure: CPV1-04.7.
- **VS-05**
  - Batch A: CPV1-05.0 + 05.1 + 05.2 + 05.3 + 05.4, with unresolved B-01-dependent behavior fail-closed/deferred.
  - Batch B: CPV1-05.5 + 05.6.
  - Closure: CPV1-05.7.
- **VS-06**
  - Batch A: CPV1-06.0 + 06.1 + 06.2 + 06.3 + 06.4.
  - Batch B: CPV1-06.5 + 06.6.
  - Closure: CPV1-06.7.

Later VS-07..VS-12 may use the same 2–4-outcome batching rule after their dependency boundary is re-read; do not invent a giant cross-slice PR in advance.

## 9. Slice boundary and unattended continuation

When a slice reaches full COMPLETE:

- update STATUS.md;
- publish a compact receipt containing exact SHAs and evidence;
- state remaining known limitations honestly;
- release writer ownership.

When a slice is engineering-complete but remains open only on deferred external certification, record that split state and release the completed engineering writer. Under `WHOLE_PACKAGE_PREAUTHORIZED`, immediately advance the engineering frontier to the next dependency-safe canonical work rather than waiting for the external gate.

The package-level unattended execution stops only when:

1. all currently automatable engineering in the authorized canonical plan is exhausted; and
2. every remaining unresolved item is a true owner gate, external/private/device-only evidence gate, or safety/integrity dependency that makes further work genuinely unsafe or logically dependent.

When a current round contains both blocked and independent work, close the independent engineering as `ENGINEERING_PARTIAL / DEFERRED_GATE_PENDING` or the most precise equivalent, release that writer when safe, and route to the next dependency-safe canonical work. A blocked final evidence class must not monopolize the engineering frontier.

Do not stop merely because a round/slice is awaiting a provider, store, deployment quota, live account, private export, real device, signing identity, product-owner decision, or publication decision when independent engineering remains.

The owner should see a user-visible capability summary plus a concise deferred-gate ledger, not raw engineering logs.

## VS-07 finite explainable Revisit / CPV1-07.5 coherent batch

Fresh extension writerPR88 /40eeac0b2b4bb9d6ac5d74ec42437524dec54b46 and original main e43b8748701cd7c71eba4da1576478bdcfce2d47. Fresh prepublication main f5787a39b6a6f8e5b14800596d9c7711e4c0fa84 advanced only on independent website paths; compared the actual main diff, no extension/native-host/owning candidate or certification boundary changed. Actual Candidate36297120718 SUCCESS; all23historical+3cadence cases (26/26) PASS in unit108557930648; contracts/privacy108557930528 and release108557930682 PASS. Preserve actual fixed-corpus official-model report from43c70244: semantic quality remains below lexical; no model production admission or gold/threshold change.

Bounded real-product defect in selectResurface: when fewer than4eligible worked-on Inputs exist, the old mixed rotation can select4ordinary Inputs and omit all scarce edited/associated material. Rotate each group deterministically from an immutable time/id sort; fill worked-on eligible Inputs before ordinary eligible fallback. Cap every selection at4 even if an internal caller supplies a larger limit; reject invalid limits without an infinite feed. Retain the1200old/400new bounded scans and existing eligibility/policy/known-time/purge boundaries.

Project a fixed read-only revisitReason enum: saved_since_visit, previously_worked or earlier_material. Explain these in the current Revisit cards, with a maximum-four/favor-worked-on/Archive-more note. These are observed local capture/edit/dependency facts, not unread debt, topic belief, endorsement, automatic belief change or a relevance promise. Unknown time remains unknown; original Source expressions and all working versions stay untouched. An older background with no reason receives no invented explanation. Existing continue positions, optional old-content policy, source-derived input/document/topic exclusions and deletion remain authoritative.

One implementation+18direct unit+1real Chrome journey batch. Six priority counts0..5 across31days and shuffled inputs prove scarce priority, stability, uniqueness and no mutation; invalid limits and a40candidate cap prove finite output. Actual8record IndexedDB fixtures prove2real working edits get fixed reasons, opt-in/off, fresh old-dated capture stays fresh only, explicit exclusions/purge remove priority previews, all full source/block/input-state/dependency rows remain and zero provider calls. The hosted Chrome journey retains8actual captures/2working versions, four explained cards, real saved continue position, stable refresh, explicit exclusion preserving search/source, and old-content off. All previous browser tests retained byte-for-byte as prefix.

Add only the explicit PAIA_VS07_REVISIT_BROWSER marker and an affected browser step to the current candidate workflow: this new journey plus the existing full topic-exclusion/visual/keyboard and capture/remove/purge journeys. No full suite,100k recovery reproof, historical browser skip/weakening, semantic model rerun or website execution. All new proof PENDING until this stable candidate's actual Actions results. VS07 and07.4/07.5 stay IN_PROGRESS/NOT_CERTIFIED; semantic Chrome/quality/calibration/long-library/index work remains OPEN.

JAE real prior CI36297881939 failed after433Mac passes on incomplete journal fixture and Ubuntu358packaged passes on a trailing blank line; source/log root classification TEST/FIXTURE. SolePR20 coherent repair4dd273fc7322cd87957d7a5dd472b308344967d2 preserves every original private-byte/native/two-version/rollback assertion, completes the actual worker schema and adds2cold/repeated-initialization regressions; new cloud proof PENDING. JCR08 remains OPEN/final-submit user-only. Independent website work remains outside this extension boundary; preserve its writer/content and do not perform its merge or publication.

## VS07 Revisit actual visit-lifecycle oracle repair

Fresh main f5787a39b6a6f8e5b14800596d9c7711e4c0fa84 /sole extensionPR88 /45c85b341ce364a23d7dd1a7f6f52ff221c4fb81. Actual Candidate36299192272: unit108563555021 SUCCESS, all18new priority/finite/explanation/actual-store/exclusion/purge/fresh regressions PASS; contractsprivacy108563555041 and release108563555056 SUCCESS. Affected Chrome108563555072 passes both unchanged full UX-R2 capture/remove/purge and topic-exclusion/visual/keyboard journeys. New Chrome case failed before priority assertions: expected zero cards while five genuinely new Input previews were correctly visible.

Bounded source/log root classification TEST_LIFECYCLE: the app establishes its initial visit boundary before these8captures; source-date age does not override capture/visit provenance. The test assumed captures preceded that boundary. Establish the next visit through the real Close then Open UI, checking first window end8/optional-old resurface empty/no reading-position mutation, then next start8/end8/newcount0. Preserve the original zero-card assertion after this genuine lifecycle transition and every later8capture/two-working-version/four-priority/explanation/continue/exclusion/search/fullSource assertion. Product runtime, capture/visit rules, deadlines, gold, fixture size and old tests unchanged.

Add one direct real8capture lifecycle regression on production RevisitService: first window0..8 yields exactly8new/5finite previews, no duplicate old card and no reading anchors; actual close/open advances8..8 and permits exactly4opted-in old cards. Complete Source/block/input-state/dependency authority unchanged and zero provider calls before/after both visits. All19unit/newChrome proof on this repair head PENDING; retain owning3browser selection. No unchanged-head rerun/model probe/full certification.

JAE exact4dd273fc7322cd87957d7a5dd472b308344967d2 CI36298703170 actual hostedMac108562220923436packaged/native/journal+7retired-updater PASS; Ubuntu10856222103825privacy+175review+121operations+13browser+360packaged PASS/11Mac-only skips, compile/syntax/diff PASS. All19delivery/journal cases actual PASS including original full private bytes after Cocoa launch; JCR08 remains IN_PROGRESS with independent GUI/Finder/credentials/legacy/DFG work OPEN and final-submit user-only. VS07 remains IN_PROGRESS/NOT_CERTIFIED.

## VS07 historical expression comparison / CPV1-07.4 coherent batch

Fresh main f5787a39b6a6f8e5b14800596d9c7711e4c0fa84 /soleDraftPR88 head1a0618ae0bb3ef50f671e3956c7d22676e4a370e. Actual Candidate36299548556 SUCCESS: unit108564544368 all19new finite-priority/visit-lifecycle cases PASS; Chrome108564544379 all3owning Revisit/exclusion/purge journeys PASS/0skipped; contracts/privacy and release guards SUCCESS. Semantic36299548525 only reuses the retained fixed-corpus model report, never a new quality or production claim. Keep unchanged model/gold/thresholds and semantic production disabled.

Bounded CPV1-07.4/T5 gap: the existing two-original comparison has no source/time/current-edit distinction and retains selections across query/filter/mode resets. Historical paging also appends old/new generations together when the server truthfully reports changed=true. Implement one invocation-local historical comparison admission/projection and the real Universal Search comparison user path, using exact immutable Source bodies and two distinct complete source identities. Existing source search matching, inclusion/filter/purge rules and refs remain authoritative. Historical pages additionally project current eligible Input body/contentRevision and its existing canonical block.editedAt; no Source/capture/update timestamp substitution. Unavailable current content remains null, an intentionally empty current edit remains empty, and Source is never a current-work fallback.

Present both full original expressions with reliable/unknown expression dates and source labels; current Input is explicitly separate behind an optional detail, with its own confirmed edit time. No inferred belief, endorsement or automatic supersession claim. Keep exact Unicode/paragraph/quotation/negation text, literal HTML, finite two-source selection, narrow single-column layout and explicit close/focus. Query/IME/filter/mode resets immediately revoke the pair; real edit/removal/purge/restore notifications revoke stale comparison and re-read current scope. Changed paging generation clears accumulated historical rows and comparison, preserves explicit Material Tray references, and asks for a fresh query instead of silently mixing or replaying old pages. Unchanged maintenance notifications still do not remount results.

Implementation +19direct unit cases +2actual Chrome journeys as one reviewed batch. Unit cases cover complete detached copies, timezone/unknown chronology, long evidence/empty edits,13ambiguous author/ref/span/revision faults, exactly2distinct Sources, and real four-record IndexedDB original/current/empty/removal/purge authority preservation with zero provider calls. Actual Chrome uses4full captured source expressions including600long paragraphs, quotation/negation/unknown-time/current edits, exact Source/body/ref provenance, two real edits, language/focus/narrow layout, date-scope reset, real deletion while an actual older server response is held, and complete remaining Source equality. Second real Chrome uses42full sources plus one genuine later capture to prove stale-generation refusal without shrinking data, dropping explicit selections or caching stale comparison. Run also the UNCHANGED full historical Source/comparison/scope/tray/preview responsive matrix. All prior tests remain unchanged; retain synthetic narrow screenshot as artifact. Cloud proof PENDING, not invented PASS.

Only the PAIA_VS07_HISTORY_BROWSER owning candidate marker/step is added. No full Certification, historical100k recovery reproof, website publication, model download/rebakeoff, storage schema, new permission/provider/paid action or test/oracle weakening. VS07 and07.4 remain IN_PROGRESS/NOT_CERTIFIED until actual owning proof; semantic quality/calibration/Chrome-memory/index/long-library and remaining slice admission OPEN. Owner/live/device/channel evidence deferred at existing boundaries.

JAE soleDraft20 head1552a164ae664a7c4c1dc4c5387ccf2915f50991 /CI36299870626 actual hostedMac108565422440438packaged/native+7retired-updater PASS; Ubuntu10856542250225privacy+175review+121operations+13browser+362packaged PASS/11Mac-only skips, syntax/compile/whitespace PASS. Normal no-mode-flag actual operator/native archive relocation/Cocoa gate and ambiguous-mode refusals now have cloud proof. JCR08 remains IN_PROGRESS with GUI onboarding/credentials/update/genuine legacy authority/DFG002/008 OPEN, owner/live/signing deferred and final-submit user-only. No unchanged-head rerun.

## VS07 CPV1-07.2 derived index lifecycle — coherent engineering candidate

Fresh remote main f5787a39b6a6f8e5b14800596d9c7711e4c0fa84 /sole Draft88 at560d1471cc34df5b0e2d45433a401d8407bd7a3e. Actual Candidate36300861696 SUCCESS: unit108568113372 all19comparison cases PASS/0skip; actual hostedChrome108568113223 both new complete original/current/scope/purge/stale-page journeys and unchanged complete historical responsive matrix PASS/0skip. Synthetic screenshot artifact10925387312 zipSHA256004376d8fc4cf138ad10fec31a34bcff99c4b6e7617a6426dedbaade3cd2738b. Historical comparison targeted engineering is proven; no full slice/semantic quality admission. Existing official model's measured quality and frozen28/29corpus/gold/thresholds remain unchanged.

Advance independent CPV1-07.2 implementation: a rebuildable in-memory DerivedSemanticIndex with an explicit owner-provided complete current eligible read boundary and explicit local document/query encoder interface. No model loader/provider/network/storage writes or personal-truth body cache. Retain only Float32 vectors and SHA256 bindings of exact complete body/title/material ref/revision/source/time/Topic location plus immutable model identity and scope. Snapshot completeness is an owner interface obligation, not authorization conferred by the index. Results reconstruct complete current evidence/ref/time/location from the fresh read, never cached excerpts or inferred current beliefs.

Explicit synchronization reuses unchanged vectors and encodes only added/changed bindings; removals/exclusions purge vectors before lookup. Scope changes invalidate bindings. Build candidates publish only after a matching second live snapshot. Concurrent rebuild/invalidate supersedes older work; queries re-read eligibility after inference and return no stale evidence if generation/scope/material changes. Coverage distinguishes building/partial/ready/unavailable, reports missing count and exact vector bytes without source text. Invalid source/vector/encoder remains a fixed safe unavailable result with usedSemantic=false, never a successful no-answer or private exception echo. Lookup does not auto-build, retry or call paid services. Existing lexical callers remain unchanged.

One coherent implementation+22direct regression candidate: exact known-vector cosine order/full evidence/detached refs/unknown time; explicit rebuild vs unchanged reuse; six body/revision/title/source/time/Topic invalidations; deletion/empty scope without automatic encoding; scope changes; four build/query/supersession races; five vector faults; source/encoder private non-echo; strict shape/identity/full-ref/capacity/model pin; unchanged full28record/29task gold fixture with27eligible records; actual4populated IndexedDB capture/edit/exclusion/permanent-purge lifecycle retaining1000full long paragraphs and complete Source/block/input/dependency/tombstone equality/zero provider calls. No old tests or fixtures changed. Fresh cloud execution PENDING.

This module is not yet connected to A6/C3/R3 and does not admit the measured model into production. Actual admitted local encoder, production store-wide snapshot/paging/coverage integration, Chrome model/resource compatibility, hybrid UX, calibration and realistic long-library acceptance remain OPEN. Do not call this CPV1-07.2 or VS07 COMPLETE. No schema/Backup/permission/provider/model selection, full certification, model download or website/deployment changes. Completed history-browser owning selection is cleared in PR metadata for this unrelated no-UI candidate; all tests and actual receipt retained, no full certification replaced.

JAE soleDraft20 current9b94ed7e38bad34c926ba500b5395d37aed7726c /CI36301304320: actual Ubuntu10856931991225privacy+175review+121operations+13browser+371packaged PASS/11Mac-only skips, including9new app-destination alias admission cases. Mac108569319808 actual tests still running at this checkpoint, no wait/rerun. JCR08 remains IN_PROGRESS/NOT_CERTIFIED; GUI onboarding/credentials/update, genuine legacy authority transfer and DFG002/008 engineering OPEN. Signing/live/private/device gates deferred; final-submit user-only.


## 2026-09-27 r39 — bounded TEST_FIXTURE identity repair

Fresh sole writer PR88 head f818b6ffdfca6e1649091bdbac0b031b983050f0: Candidate run36301995992 / unit108571225576 executed all22 new derived-index cases:20PASS/2FAIL/0skip. Contracts/privacy108571225471 and release108571225552 PASS. The two failures are TEST_FIXTURE, diagnosed from actual logs and exact source: deletion setup retained a instead of removing a; actual populated IndexedDB setup treated hashed-key order as capture order and consequently selected a different Source for the1000paragraph FULL_END assertion. Bind all four actions by complete independently authored original Source body/reference, assert all four distinct identities and full body equality before mutations, and correct the deletion predicate. Keep every existing coverage/provider/source/authority/race/vector/full-content oracle unchanged; no runtime, gold corpus, long fixture, workflow or browser-harness changes. One coherent test+canonical checkpoint batch; fresh candidate cloud execution PENDING, no unchanged-head rerun or full/model/history-browser repeat. CPV1-07.2 production integration, actual encoder admission/calibration, Chrome model compatibility and realistic long-library acceptance remain OPEN; VS07 IN_PROGRESS, production semantic selection still NONE.

JAE soleDraft20 exact9b94ed7e38bad34c926ba500b5395d37aed7726c CI36301304320 is now allocated and PASS: Ubuntu108569319912 25privacy/175review/121operations/13browser/371packaged PASS with11Mac-only skips; hostedMac108569319808 447packaged/native and7retired-updater PASS. This supersedes the preceding still-running checkpoint only. JCR08 remains IN_PROGRESS/NOT_CERTIFIED with GUI onboarding/credentials/update and genuine legacy authority transfer/DFG002/008 engineering open. No rerun; final-submit user-only and external/live gates deferred.


## 2026-09-27 r40 — complete current-storage snapshot and derived-index bridge

Fresh remote main f5787a39b6a6f8e5b14800596d9c7711e4c0fa84, soleDraft88 exact e546774a4f00c157359645a3c3ef0a2c55ffd0fc: Candidate36302719418 PASS; actual unit108573292781 derived-index22PASS/0FAIL/0skip, all prior unit suites retained; contracts/privacy108573292678 and release108573292844 PASS. The two preceding fixture identity failures are closed by actual cloud evidence, not runtime changes. No full/model/history-browser repeat.

CPV1-07.2 next coherent engineering batch adds semanticMaterialSnapshot/createMaterialSemanticIndex over the existing production IndexedDB/Memory material-read boundary. Traverse every Input/Thought/saved-AI page inside one read transaction, read canonical policy once, apply current eligibility/deletion/exclusion/hidden Source/filter, exact source/date/Conversation/Topic constraints before encoding, and retain complete current or original bodies with revision/full typed refs/reliable-or-unknown time/active locations. Every nonempty saved AI field retains its own canonical field ref; it never becomes a human statement. Source and current work remain separate, including empty current work. No override to include removed/filtered material; oversize/ambiguous/error snapshots refuse whole with a fixed private-value-free reason instead of returning a healthy partial index. Hashing stays outside the IndexedDB read transaction. Policy changes prune changed eligibility without rebuilding unaffected vectors merely because one exclusion changed.

The existing22 lifecycle cases remain, and the actual4Source edit/exclusion/purge test now uses the production storage factory rather than an ad hoc fixture reader. Add9owning actual-store cases:213populated Inputs across all pages with full1000paragraph final Source and one policy read; original/current/empty-work separation; source/known-date/Conversation constraints; denied/removed/hidden/purged records never encoded; independent Thoughts/saved AI field/location/denied-evidence closure; Topic provenance and incremental edits/exclusion; capacity/invalid scope refusal; sanitized storage failure; actual exclusion during asynchronous encode refuses staged publication. Full table equality and zero provider calls retained; fixed28record/29task gold and all earlier bodies/assertions unchanged. Fresh cloud execution PENDING.

This completes a real store-to-derived-index bridge, not model admission, A6/C3/R3 activation or CPV1-07.2/VS07 certification. Production model selection, actual Chrome encoder compatibility, hybrid UX/calibration and realistic long-library acceptance remain OPEN. No new loader, model download, provider, schema, permission, Context release/Passport authority, full certification or website/deployment changes.

JAE soleDraft20 exact d702c16cfc39b17f47b2d07e10c1cac0154ddb8a CI36303165563 now PASS on allocated runners: Ubuntu10857456399325privacy/175review/121operations/13browser/392packaged PASS with11Mac-only skips; hostedMac108574564092468packaged/native and7retired-updater PASS. Actual+21pytest cases include3fresh installed Python processes (first/upgrade/rollback); prior checkpoint23 counted two extra process phases, not23pytest cases. Installed settings independence and pre-publication atomic write faults have targeted proof; JCR08 remains IN_PROGRESS/NOT_CERTIFIED with GUI onboarding/credentials/update, genuine legacy transfer and DFG002/008 engineering OPEN. Signing/live/private/device gates deferred, final-submit user-only.


## 2026-09-27 r41 — native Chrome storage/index lifecycle evidence candidate

Fresh remote main f5787a39b6a6f8e5b14800596d9c7711e4c0fa84 and development Draft88 e3897c028c91e0b38798dfaa1428759457588730. Owner website Draft-independent PR90 head13bb59e89164860b368c344540b04d938116b3f0 is preserved without website/deployment/merge mutations; do not start another development writer. Exact Candidate36303986812 SUCCESS: actual unit108576882552 all22derived-index and all9complete material-snapshot cases PASS/0FAIL/0skip; contracts/privacy108576882653,release108576882670,gate108577367752 PASS. Fixed-report classifier36303986710 reuses measured model evidence, no new download/inference/full certification.

The bridge's existing owning evidence uses fake-indexeddb. Advance the independent CPV1-07.2 native-transaction/runtime gate with two actual full Chrome extension journeys over the production OrganizerStore/MemoryService/semanticMaterialSnapshot/createMaterialSemanticIndex modules and native IndexedDB. Use actual213live-captured PUBLIC synthetic Sources, all pages and exact bodies including1000long Unicode paragraphs; same actual read authority/policy and full table equality, complete coverage/vector-byte arithmetic and zero provider/external calls. Real edit invalidates only its vector, requires explicit repair and preserves all original Source bodies; actual service-worker termination/page heap recreation has no silent durable vector/body resurrection and rebuilds from the current full authority.

Second journey holds a real async local test encoder outside the native transaction, then commits actual Memory exclusion and permanent Source purge. Staged generation must refuse, healthy current rebuild may encode only the survivor, and complete Source/table equality proves no projection writes to authority. Deterministic2D vectors are only an owning lifecycle oracle; these journeys do not prove pretrained model compatibility, semantic quality, threshold calibration, relevance or production model admission. No personal belief/current truth inference.

Add only one finite owning Chrome workflow selection to the existing Draft candidate job; other historical/Revisit/browser/model/100k-recovery suites are not repeated for this independent scope. All existing tests, fixed28/29gold, complete213/1000body fixtures, eligibility/capacity/race guards, thresholds and production runtime remain unchanged. No harness refactor, schema/body store, new permission, provider, model selection/download, full certification or website/deployment mutation. Two new actual Chrome cases PENDING cloud execution, not reported PASS.

VS07/CPV1-07.2 remain IN_PROGRESS/NOT_CERTIFIED. Real admitted encoder/Chrome resource compatibility, A6/C3/R3 hybrid user path, calibration and realistic long-library quality remain OPEN. External/current-live/private/device/distribution boundaries stay deferred in existing ledger. Continue these independent engineering paths; no slice closure claim.

JAE soleDraft20 new coherent GUI profile candidate d384eab978f98bb860b49a7a5cba409a714f2cf5 exact9path remote readback and unchanged186prior blobs verified. CI36305412527 actual Ubuntu10858095687725privacy/175review/123operations PASS; affected browser15PASS/1FAIL diagnoses the real queued dialog-close cleanup race after all complete-save/preservation assertions passed. A bounded synchronous close/Escape/reopen fix retains the failed immediate-clear oracle and adds Escape coverage; no unchanged rerun/full suite or inherited runner gate. HostedMac108580956766 still executing; no result inferred. Actual GUI file selection/save, separate private profile versions, settings compare-and-publish/update fence and complete old task/fact preservation plus23packaged/2API/3actual-browser cases form one batch. JCR08 remains IN_PROGRESS/NOT_CERTIFIED with credential/update/recovery onboarding/genuinelegacy/DFG work OPEN, final-submit user-only.
