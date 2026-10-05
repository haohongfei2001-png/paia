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

### DFG-CPV1-008 — B-04-3B broader/model reply processing

- **State:** `B-04-3A RESOLVED / B-04-3B OWNER_DECISION_DEFERRED`.
- **Resolved scope:** on 2026-10-05 the owner approved Prompt Reuse Stage 3A only:
  default-off explicit enablement; newly completed latest assistant reply in the
  current supported conversation; local ephemeral analysis; no durable assistant
  reply body; no Archive/Thought/Context/Source/Backup/log retention; zero
  Provider/model request; revoke stops reading and invalidates transient
  candidates. See `PROMPT_REUSE_STAGE_3A.md`.
- **Blocks only:** Stage 3B broader conversation/reply scope, durable reply
  evidence/retention, external/model processing, model-generated new prompts and
  use of assistant-reply access outside the approved Stage 3A purpose.
- **Non-blocked work:** CPV1-12.3A-1 through 12.3A-3, typed AI write proposals,
  review/commit work and all earlier product work that stays within its own
  authorization.
- **Safe interim:** a Stage 3A DEFER is final for the local attempt; it must not
  trigger a hidden remote/model fallback.

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

### DFG-CPV1-011 — VS09 current ChatGPT composer insertion

- **Owner round:** CPV1-09.2 / 09.5 / 09.7; ChatGPT-first Prompt Reuse.
- **State:** REAL_CHATGPT_FINAL_CERTIFICATION = DEFERRED_EXTERNAL_EVIDENCE.
  Engineering integration is permitted by the 2026-10-04 owner amendment; this
  remains NOT_VERIFIED and is never compatibility PASS.
- **Observed:** one fresh anonymous headless attempt on 2026-10-04 at
  12:15:39 UTC returned HTTP 403 and no supported composer. No login/profile,
  assistant reply or Send action was used. Actions run `37201457221`, artifact
  `11302937092`, head `7672c8faf2ee0722cde671352bee2443039fd777` retains the receipt.
- **Required:** current supported ChatGPT page, source and release adapter,
  exact empty/existing drafts, caret/selection/Chinese IME, read-back,
  non-destructive failure/uncertainty and zero Send. Synthetic ProseMirror
  evidence cannot close this gate. No unchanged external retry is planned.
- **Boundary:** owner-authorized engineering merges and CPV1-09.3–09.5 may
  proceed after passing code/safety/synthetic/package gates. Final real-site
  certification remains deferred. Stage 3/B-04 and D7 remain separate.

### Prompt Reuse final external evidence — 09.6 / 09.7

- CPV1-09.6: SECOND_PROVIDER_DEFERRED. No currently accessible second composer
  can satisfy real-page evidence and minimal permission without account
  intervention. No host permission or generic editor injection was added.
- CPV1-09.7: final owner visual/product acceptance and DFG-CPV1-011 remain open.
  Source/release production-overlay screenshots and automatic engineering checks
  are implementation evidence, not a substitute for human/real-site acceptance.
  These external gates do not block the owner-authorized engineering merges.


### Prompt Reuse material v2 — final visual/current-live evidence

- **State:** OWNER_VISUAL_ACCEPTANCE_PENDING / CURRENT_LIVE_VISUAL_EVIDENCE_PENDING.
- **Scope:** the retained material candidate integrated by PR171 on 2026-10-05;
  this does not reopen the already closed Stage1/2 functional/manual acceptance.
- **Actual evidence:** real production source/release extension in synthetic
  ChatGPT-layout fixtures, eight primary states and fourteen supplemental pairs;
  private owner comparison pack and engineering/presentation review. Source/release
  parity is build consistency, never final design or live-site acceptance.
- **Known differences:** paler/lower-contrast light core, different highlight
  position/shape and darker/more restrained dark material than original B.
- **Still required for final material acceptance:** explicit owner visual
  acceptance and current logged-in host evidence for any current-live claim.
- **Non-blocked engineering:** the owner explicitly authorized this independent
  ordinary-round merge after eligibility review and passing affected/light gates.
  This does not resolve D7, PR164, broader provider, permission or data gates.
