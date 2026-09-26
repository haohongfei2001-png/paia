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
