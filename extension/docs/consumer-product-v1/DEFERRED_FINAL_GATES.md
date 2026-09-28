# Deferred Final Gates — PAIA Consumer Product v1

This ledger records evidence or owner/external actions that remain mandatory for final certification but must not stall independent authorized engineering.

A ledger entry is never PASS. It may be removed only after the required evidence is completed or the product contract is explicitly changed by the owner.

## Open gates

### DFG-CPV1-001 — Same-ID signed consumer update certification

- **Owner round:** CPV1-01.3 — Consumer update flow
- **State:** EXTERNAL_CERT_PENDING
- **Reason:** the owner confirmed no existing Chrome Web Store publisher identity or extension ID. A future distribution channel still needs a separate decision; no real same-ID signed update can currently be certified.
- **Still required:** real signed same-ID update preserving extension identity and local archive, post-update health, and rollback/update recovery evidence for the supported path.
- **Forbidden substitutions:** unsigned local install, a new unrelated extension identity, simulated store evidence, or a documentation-only claim.
- **Owner boundary:** do not create/purchase/register a distribution account, publish, or make a legal/public-release commitment without explicit owner authorization.
- **Non-blocked engineering:** CPV1-01.5 and all later canonical work whose implementation does not logically require this external result. CPV1-01.6 may finish all independent engineering/current-browser evidence while the same-ID distribution journey remains pending.
- **Final effect:** VS-01 and any package/release claim requiring consumer update certification cannot become COMPLETE/PASS until this gate closes.

## Deferred owner/private/device gates

### DFG-CPV1-002 — B-01 existing Thought edit semantics

- **State:** OWNER_DECISION_DEFERRED.
- **Blocks only:** behavior that must decide whether an existing/old Thought is directly mutable versus represented by appended correction/new Thought material; dependent write semantics in VS-05/VS-12.
- **Non-blocked work:** Thought root/Reader, independent new Thought creation, source/evidence relations that do not assume old-Thought mutation, AI Organize candidate/protection, Context, retrieval, prompt reuse, mobile/MyWrite, and all other independent engineering.
- **Safe interim:** do not add a new direct-old-Thought mutation path whose semantics would prejudge B-01.

### DFG-CPV1-003 — B-02 permanent Source deletion with human derivatives

- **State:** OWNER_DECISION_DEFERRED.
- **Blocks only:** permanent purge semantics when user-rewritten derivative material would be affected, plus AI write/delete behavior that depends on that meaning.
- **Non-blocked work:** reversible Topic/Archive removal, AI exclusion, unambiguous Source purge, tombstone/anti-resurrection engineering, and unrelated slices.
- **Safe interim:** fail closed for the ambiguous mixed-derivative permanent purge.

### DFG-CPV1-004 — Current-live ChatGPT/browser lifecycle evidence

- **State:** CURRENT_LIVE_DEFERRED_WHEN_ENVIRONMENT_UNAVAILABLE.
- **Owns:** CPV1-01.6, CPV1-02.7, CPV1-09.3 and any other provider-DOM acceptance that explicitly requires an authenticated current real site with the PAIA extension.
- **Non-blocked work:** all synthetic/headless engineering, lifecycle state machines, browser fixtures, UI, reliability and later independent slices.
- **Final effect:** affected slice certification remains pending until real current-live evidence is obtained.

### DFG-CPV1-005 — Real official private history export

- **State:** PRIVATE_EVIDENCE_DEFERRED_WHEN_ARTIFACT_UNAVAILABLE.
- **Owns:** the CURRENT_PRIVATE_EXPORT evidence in CPV1-03.1/03.6.
- **Non-blocked work:** importer contract, strict parser/admission, dedupe, resumability, streaming export, staged restore, failure injection and scale engineering using synthetic/redacted/publicly documented structures.
- **Safe interim:** do not claim official-export support until a current real private export passes.

### DFG-CPV1-006 — B-03/B-05 production connector and sync deployment policy

- **State:** OWNER_DECISION_DEFERRED.
- **Blocks only:** committing to production cloud residency/sync, regions/service burden/commercial commitments, and real connector/sync deployment choices that require those decisions.
- **Non-blocked work:** read-only connector contracts, trusted-boundary implementation behind local/synthetic harnesses, Passport enforcement, adversarial tests, transport-agnostic sync/merge logic, device trust/key interfaces, and other independent engineering.
- **Safe interim:** no new cloud authority, paid service, commercial commitment, or plaintext remote content policy is inferred.

### DFG-CPV1-007 — Mobile real-device and voice processor evidence

- **State:** DEVICE_OR_PROCESSOR_DEFERRED_WHEN_UNAVAILABLE.
- **Blocks only:** DEVICE certification and any third-party transcription choice that introduces new privacy/cost/processor commitments.
- **Non-blocked work:** mobile client architecture, MyWrite local-first path, mobile layouts, interruption state machine, explicit record/review/save flow, transcription interface and local/synthetic adapters.
- **Safe interim:** no background listening and no new remote transcription processor without owner approval.

### DFG-CPV1-008 — B-04 AI reply access/retention semantics

- **State:** OWNER_DECISION_DEFERRED.
- **Blocks only:** VS-12 reply-aware prompt assistant behavior that reads/retains/processes AI replies and the corresponding real acceptance.
- **Non-blocked work:** typed AI write proposals, review/commit path, permission enforcement, adversarial tests unrelated to reply retention, and all earlier product work.
- **Safe interim:** reply-aware reading remains disabled; prompt reuse phases 1–2 remain independent.

### DFG-CPV1-009 — Independent live generated-output meaning review

- **Owner round:** CPV1-05.5 — AI output fidelity.
- **State:** LIVE_GENERATED_SEMANTIC_EVIDENCE_DEFERRED.
- **Reason:** current GitHub Actions fixtures supply frozen reference responses; they do not execute a real authorized model and independently grade its generated meaning. Cloud engineering has no admitted real provider credential/paid live run evidence.
- **Still required:** collect actual generated outputs for the fixed quotation/attribution, negation/conditions, uncertainty, explicit correction, unresolved conflict, causality, emotion/intensity and unknown-time cases; independent review must preserve each distinction and flag material distortion as blocking, without averaging it away.
- **Forbidden substitutions:** reference-response transport PASS, a plausible synthetic reply, limits/schema checks, or privacy tests cannot be presented as generated-model semantic PASS.
- **Owner/external boundary:** do not obtain credentials, expand paid usage/privacy permissions or send private conversation content without applicable authorization. A synthetic corpus can be used for the eventual authorized live evidence; no private data is required.
- **Non-blocked engineering:** complete CPV1-05.6/05.7, product protections and local/candidate boundaries; certify the independent stable engineering slice with this evidence explicitly deferred and advance to dependency-safe later work.
- **Final effect:** CPV1-05.5 semantic and package-level fidelity claims remain NOT_RUN/NOT_CERTIFIED until actual evidence closes this gate.

## Continuous-execution rule

While any gate above is open, the manager must continue the engineering frontier through dependency-safe canonical work under `WHOLE_PACKAGE_PREAUTHORIZED`. Stop only after automatable engineering is exhausted or a true owner/safety/dependency gate makes further work impossible.

If later evidence falsifies an assumption made by downstream engineering, repair the earliest affected behavior and revalidate the downstream evidence that depended on it.

## VS-05 stable slice attempt — history oracle invalidation repair

Exact715a5a5ed3a8e44a42e759d82f23cfa74445e8ad affected Candidate36262315707 PASS: all3 source+built candidate/full05.7/all-six-human-list/summary-clear-retype journeys, plus unit/privacy/contracts/release. Promoted once to full PAIA Certification36262708915. Full required PASS is not established: current-browser3/4 job108461468147 has21PASS/1FAIL, historical UX-R3 invalidated Thought-home preemption waits for its delayed LIBRARY_INDEX_PAGE. The saved-topic resume case and all other shard3 cases passed. Mac secure store/discard,4 unit shards,contracts/privacy,current release passed at the observed checkpoint. No merge/exact-main/receipt or VS05 COMPLETE claim.

Bounded classification TEST: current ThoughtWorkspace.open restores a valid same-session home collection without re-reading it; the historical "invalidated" home-read fixture made no intervening library mutation. Its interceptor therefore may never see the request it requires. Production invalidateHomeSnapshot is called on a real ARCHIVE_CHANGED cause, preserves reading query/scroll/extent and discards saved rows. The oracle now creates an additional real synthetic Topic while the original Topic is open, observes the actual CREATE_LIBRARY_TOPIC invalidation broadcast, then holds the first home read and still requires browser Back to read/restore the original exact60-entry Topic anchor before releasing that stale home read. The existing90-entry saved-page/durable-position preemption test is unchanged. All zero provider/network/browser-error and exact history/anchor requirements remain; no production runtime/cache/navigation/timeout change, fixture shrink or removed assertion.

PR79 returns to draft and the same sole branch. Affected draft selection adds only this exact history file via PAIA_VS05_HISTORY_BROWSER; previous full proof is failed/pending, not rerun or reused as PASS. Full certification is reserved for the repaired stable slice candidate after targeted proof; superseded715head is not rerun. Semantic/private/device/distribution gates remain deferred on their dependency paths.


The completed full slice attempt also reports Browser1/4 job108461468110:23PASS/1FAIL, ANS07 first-visible-key equality on layout switch; Browser4/4 job108461468104:19PASS/1FAIL, old today-draft expectation grid-default -> list sees actual grid. Browser2/4 job108461468101 PASS. Full aggregate108463715718 FAILED; no merge.

These are reviewed against the already approved CPV1-05.1 implementation/status: new installations start in compact list, durable explicit grid remains supported, and list CSS is now a real stacked column (prior bbdf0bf affected source/built PASS). The old today-draft test assumed grid as default; it now proves list default, real list->grid persistence/rendering and grid->list persistence/rendering before its unchanged complete light/dark/size/reduced-motion/200%/English/IME/failure/privacy matrix. The old ANS07 assertion used the first visible DOM key before/after layout, which has different meaning when moving a single-column list into multi-column rows. It now locates the exact previously captured key and requires its same identity, actual visibility and same <90px position bound, plus real durable/rendered grid. Remaining245Topic/130entry/85independent/empty-first-page/six40-row-batches/search/revisit/performance/zero-network/error assertions are unchanged. No runtime fix is inferred from these historical expectations; targeted cloud results still determine whether any genuine anchor defect remains.

The coherent draft batch covers only these three affected files (4 selected cases) and retains the already-passed100k/1000doc/300Topic/5000Thought fixture without rerunning it. Full certification next occurs only after this repaired candidate is stable. No deadlines increased, historical test deleted or assertions replaced with unconditional success.


## VS-05 exact-main engineering receipt — 2026-09-26

verdict: ENGINEERING_COMPLETE / OWNER_GATE_DEFERRED / EXTERNAL_CERT_PENDING
slice_complete: NO
candidate_pr: #79
candidate_head: 790a4a830a229c23f8952e0f433f02f5c0f16aab
candidate_full: run36264069911 / SUCCESS / PR checkout d7ae4bc0e0a26ec602fd1ff5f35368aba1feb598
merged_runtime_main: 75dafc2a698560098c88ce06269230c475ff73b3
exact_main_full: run36265011793 / SUCCESS / FullSuite108470048391 / aggregate108470082058
receipt: receipts/CPV1-05.0-05.7-ENGINEERING.md

Head, PR synthetic merge and actual main share tree0e3d10b889a0476b3156d8d4b5da963cd179ddf6. The actual exact-main audit reports145unit/53browser/3contract/6privacy files, current207, inputDigeste25c6b6b6fcf6990f7655cf03c7afb7c61f3132158cadac50b3e53371bd37dc8. All applicable current browser/unit/macOS/package/contracts jobs PASS. Previous failed attempts in this append-only record are historical and superseded by this evidence, not rerun on unchanged heads.

DFG-CPV1-002 old-Thought semantics and DFG-CPV1-009 independent actual generated-output meaning remain deferred; dependent actions remain fail-closed. Signed distribution/current-live/private/device gates remain open. No production/slice/package COMPLETE claim.

VS05 writer RELEASED. Next dependency-safe frontier VS06BatchA06.0–06.4 is READY, not implemented/certified. Fresh GitHub has website-only PR85 already open from actual runtime75; do not create a second writer/PR or mutate its in-progress website work. VS06 reviewed implementation strings may be prepared without push; JAEPR20 continues independently. This writer observation is a checkpoint to be reconstructed from GitHub next turn, not an inherited wait state.

### DFG-CPV1-010 — Rejected converted E5 source license

- **Owner round:** CPV1-07.1 semantic/hybrid bake-off.
- **State:** EXTERNAL_SOURCE_PROVENANCE_UNVERIFIED / DEFERRED; not PASS.
- **Exact scope:** only Xenova/multilingual-e5-small revision761b726dd34fb83930e26aab4e9ac3899aa1fa78. No general semantic engineering/production-model decision is blocked.
- **Actual evidence:** source-onlyActions36292888233/job108546216429 on835df1ab45af291a3f850d0e28e6ee872a969efe: current/pinned public+ungated exact identity verified, license fields missing and no license tags; independently pinned README1077bytes/SHA256561a19594636657fe033f8b4427a7743b5f6f3a12f16cecc5f286feca0453245 has no literal license declaration, finite LICENSE/LICENSE.txt/LICENSE.md list empty. No weights/inference/private text used. All8source regressions passed actualunit108546216724.
- **Safe interim:** reject weights/inference/candidate admission for this revision; never inherit rights from a library/upstream name or title. Do not repeat unchanged model trial or mark diagnostic reads as quality certification.
- **Non-blocked engineering:** independently declared licensed candidate screening, fixed synthetic evaluation, rebuildable index/invalidations/interfaces, production-environment compatibility, longitudinal retrieval/Revisit and later dependency-safe work.
- **Final closure:** actual converted-source permissible license/conversion provenance at an exact independently verified revision, or select a separately evidenced compatible candidate through the unchanged fixed quality/resource/Chrome gates. A candidate rejection does not require owner input or a paid commitment.


### DFG-CPV1-011 — Minimal task Context engineering approval

- **Owner round:** CPV1-08.2.
- **State:** OWNER_APPROVED_LIMITED / IMPLEMENTATION_CI_PENDING / DEFAULT_OFF; not a production certification PASS.
- **Approval:** owner explicitly approved the minimal Context read path required by the current canonical task in this Chat on2026-09-28. This supersedes the prior automatic-review rejection for absent explicit permission.
- **Exact boundary:** detached composition with EXISTING temporary per-tab ManualContext; exact task/budget, consumer/grant/profile/revision, owner/selection/generation, reviewed fingerprints, current individual material admission and before/after expiry/revoke/snapshot fences. No durable task store, issuer, context_export reuse, product dispatcher, transport or network.
- **Engineering next step:** one coherent source/test/canonical batch from sole PR99 head6ae1484; exact-head owning Actions evidence required. If automatic review still rejects it, record that result and pause only this path; continue all independent PAIA/JAE engineering without waiting.
- **Remaining external gates:** supported platform identity, Passport issuer/consent, distributed quota, production transport/privacy activation, B-03/B-05 deployment and real external acceptance stay separately OPEN/deferred.
- **Historical evidence:** original head5b5d94e5 blob-write refusal2026-09-28; docs-only head14c9c765; subsequent Prompt candidate6ae1484 Candidate36434854575 SUCCESS. Proposed Context code was not published before this limited approval.

### Owner amendment to DFG-CPV1-010 — experimental archive only

The owner's 2026-09-28 scope correction supersedes DFG-CPV1-010's historical model-screening and quality-admission next actions for PAIA v1. Preserve its source/license evidence, experimental scripts, corpus and tests. Semantic retrieval is EXPERIMENTAL / DEFAULT_OFF / NON-BLOCKING and is no longer a Consumer Product v1 prerequisite. Do not continue embedding/model/cutoff/retrieval studies to close this historical entry. Any future optional semantic capability needs a separate approved scope. Default PAIA v1 search is VS-04 lexical/fuzzy/filter; Input → Topic classification belongs exclusively to Semantic Lab / Topic Router.


## VS-09 Batch A — exact human Prompt candidates and immutable template model, 2026-09-28

Engineering frontier advances to CPV1-09.0 / CPV1-09.1 within sole product Draft #99 / `feat/vs08-readonly-connector`; no second writer or PR. VS-08 remains IN_PROGRESS / DEFAULT_OFF / NOT_CERTIFIED, with task Context material release awaiting the already requested owner approval (DFG-CPV1-011). Its proposed reader remains unpublished; existing connector/platform/Passport/quota/deployment gates are not satisfied by Prompt work.

Remote main `4c43e7ea04a84bc491bf4f5d84080c0b22fbc5c8`, parent doc head `14c9c7657f8999bb61da4ce3d8c7ef92346d17bd`, tree `c031298480f75c0231cdaa871f854b71dfcce6ad`. Unchanged prior read runtime `5b5d94e5a5daf2c8014d814e2aea110bd1025888` Candidate Gate `36424719386` SUCCESS; full Draft Certification skipped. Owner design PR #91 unchanged. JAE current sole Draft20 head `16f0a4ec10cf925666afe9def5618dd20d4b23e2` is running Actions `36432737883` for the coherent question/row continuity batch; its prior head `0b17156681e2277cc6b92044f72c1f402d7165b5` Actions `36429044215` SUCCESS with actual 257 form/review/browser PASS.

The new pure local Prompt model consumes a complete already-authorized Input projection, admits eligible human prompts only, removes a finite exact set of control/acknowledgement utterances from automatic suggestions, and groups completely identical original text without case/whitespace/code/negation normalization. Repeated same identities do not inflate frequency; conflicting rows/incomplete projections refuse. Known source time and complete immutable revisioned Source refs remain trace, not invented facts. Search reuses existing VS-04 lexical normalization while preserving full text. Template create/edit/pin/remove are immutable version-checked local model transformations; edits never change Source, no-ops retain revision, stale edits refuse and removal yields a template-only tombstone.

Append a complete 13-case owning unit file: human/AI/excluded boundaries, control dominance, exact/deduplicated frequency, pagination/order/source-time, conflicting/incomplete/malformed/getter refusals, source-preserving edit/pin/remove/CAS/no-op, explicit short fixed prompt, canonical lexical search, full long Unicode/final negation, complete 100000 Inputs and all 100000 refs, and inert archived instructions/zero external requests. The unchanged full unit fallback automatically selects it; no workflow, test group, model, threshold, fixture/cap, existing test or deployment change.

Source and owning test syntax were statically parsed in orchestration; no local/runtime test PASS is claimed. New-head Candidate Gate PENDING. This is CPV1-09.0/09.1 MODEL_ONLY / IN_PROGRESS, not P1 UI/persistence or P2 provider-input certification. Next implement the bounded owning archive projection, durable template commands/UI and direct browser journeys, then protected append/replace/manual send. No storage read/write, clipboard/provider input access, AI reply read, external request, read grant or product-entrypoint import is introduced by this batch.

PAIA v1 remains VS-04 lexical/fuzzy/filter; semantic assets are archived EXPERIMENTAL / DEFAULT_OFF / NON-BLOCKING, and Semantic Lab exclusively owns Input → Topic. VS-07 scope closure and receipts remain intact.

## Owner-approved minimal task Context composition — 2026-09-28

The owner explicitly approved only the minimal Context read path needed by this current canonical task in Chat, with fallback to independent engineering if automatic approval still rejects it. DFG-CPV1-011's prior OWNER_APPROVAL_PENDING/NOT_PUBLISHED checkpoint is historical and superseded for this bounded engineering capability; no broader permission, transport or production activation is approved.

Exact main `4c43e7ea04a84bc491bf4f5d84080c0b22fbc5c8`, sole product Draft #99 parent `6ae148431b0bd4766d708bdce896d116871a207e`, tree `273a88b60356a978d876358b2ebfe21cb5d60b58`. Parent [Candidate Gate 36434854575](https://github.com/haohongfei2001-png/paia/actions/runs/36434854575) SUCCESS: release, contracts/privacy and actual complete unit suite passed, including all 13 VS-09 Prompt model tests and complete 100000-Input/ref coverage. Full Draft Certification and unaffected browser jobs skipped. Preserve VS-09's certified candidate model evidence; persistence/UI/provider-input journeys remain unimplemented and uncertified. Owner design Draft #91 unchanged.

Publish only the prepared detached CPV1-08.2 composition with existing temporary per-tab ManualContext. A trusted injected resolver must bind the exact task/budget, consumer, read grant/profile/scope revision, owner/selection/generation, both reviewed fingerprints, expiry and revoke. Caller task IDs never supply authority or select tabs. Hold the existing selection queue across two exact canonical share checks, current scoped admission for every selected ref and final binding/expiry/archive snapshot fences. Human-reviewed edits/notes/role labels/Source spans stay exact. Missing/unreviewed/stale/expired/revoked/partitioned/oversized/incomplete Context refuses without truncation. No durable task store, new permission issuer, context_export reuse, product dispatcher, network or external release.

Four appended actual IndexedDB owning tests preserve all old cases and cover full reviewed Unicode/edit/note/Source selection, 16 invalid bindings, kind denial and detached refusal, current policy/exclusion/source/selection edits, split budget/size/expiry refusal and five asynchronous revoke/expiry/archive mutation races. Static source/test syntax parsed in orchestration; runtime tests run only in GitHub Actions. This new batch requires exact-head Candidate CI; PENDING is not PASS.

VS-08 remains DEFAULT_OFF / NOT_CERTIFIED. Platform identity, Passport issuer/consent, distributed quota, B-03/B-05 deployment and real external acceptance retain their separate deferred gates. Resume dependency-safe VS-09 bounded archive projection/persistence/UI while verification is asynchronous. PAIA v1 search remains VS-04 lexical/fuzzy/filter; semantics remain EXPERIMENTAL / DEFAULT_OFF / NON-BLOCKING and Semantic Lab alone owns Input → Topic.

## CPV1-08.2 exact Source Unicode range oracle repair — 2026-09-28

Exact parent `2c540bd1c1bb66c2e6f5e4032619977d987a528f`, tree `eb38901b2368521376f4a273f0df90268a751e91`; [Candidate36436840896](https://github.com/haohongfei2001-png/paia/actions/runs/36436840896) FAILED: actual complete unit job108976852046 recorded1232PASS/1FAIL. Owning local reader file13PASS/1FAIL: only the new complete reviewed edit/note/Source positive failed with MEMORY_UNAVAILABLE; all binding/policy/size/expiry/race refusals and all13 Prompt model tests passed. Contracts/privacy and release passed; full Draft Certification and unaffected browser jobs skipped.

Root cause is the new synthetic Source ref's end14, copied from an earlier ASCII-prefix fixture. In this retained full3059 UTF16-unit task body, offsets13/14 are the high/low halves of the skin-tone emoji surrogate pair. Canonical materialRead/safeOffset correctly marks the ref stale, so ManualContext never confirms the selection and connector refuses. This is invalid positive-fixture input, not a production admission defect or a proven Context release PASS.

Keep the complete long Unicode body, reviewed edit/note, exact Source role, fingerprints, unselected canary and every old assertion. Expand the positive span to the complete prefix end19 by deriving its boundary from the unchanged original text; assert exact Source body/role and ready admission before preview. Do not normalize or clip material, weaken safeOffset or change runtime. Add a separate actual IndexedDB regression retaining original end14: prove the surrogate halves, standalone read refusal, stale selection/Source state, empty release text, unchanged full Input/Source and task refusal with zero external requests. All original tests/assertions remain.

One coherent owning-test/canonical/immutable-failure-receipt correction; static test syntax parsed, runtime verification only through new-head Actions. New-head Candidate CI PENDING. Minimal task Context approval remains valid, DEFAULT_OFF/NOT_CERTIFIED. Existing external/Passport/transport/deployment gates remain OPEN; VS09 model candidate evidence preserved, persistence/UI/insertion still pending. No unchanged-head rerun, workflow/fixture/body/cap/permission change or semantic research.
